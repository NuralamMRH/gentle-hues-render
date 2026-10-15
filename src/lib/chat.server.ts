import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptSecret } from "@/lib/secure.server";
import { findDefaultModel } from "@/lib/default-models";
import { runOpenRouterChat } from "@/lib/openrouter.server";
import { modalityForMime, textOf, type ChatMessage, type ContentPart } from "@/lib/chat-types";
import { TASK_SYSTEM, type TaskId } from "@/lib/model-tasks";
import { decodeDataUrl, generateImage } from "@/lib/image-gen.server";

const withTask = (messages: ChatMessage[], task?: TaskId): ChatMessage[] => {
  const sys = task ? TASK_SYSTEM[task] : undefined;
  return sys ? [{ role: "system", content: sys }, ...messages] : messages;
};

export type { ChatMessage };

export type StoredMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: { path: string; mime: string; name: string }[];
};

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

/** Turns stored messages (with private attachment paths) into provider-ready messages. */
export async function buildProviderMessages(messages: StoredMessage[]): Promise<ChatMessage[]> {
  const paths = messages.flatMap((m) => (m.attachments ?? []).map((a) => a.path));
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabaseAdmin.storage.from("chat-uploads").createSignedUrls(paths, 3600);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signed[item.path] = item.signedUrl;
    }
  }

  return messages.map((m) => {
    if (!m.attachments?.length) return { role: m.role, content: m.content };
    const parts: ContentPart[] = [{ type: "text", text: m.content || "" }];
    for (const a of m.attachments) {
      const url = signed[a.path];
      if (!url) continue;
      const kind = modalityForMime(a.mime);
      if (kind === "image") parts.push({ type: "image_url", image_url: { url } });
      else if (kind === "audio")
        parts.push({ type: "input_audio", input_audio: { url, format: a.mime.split("/")[1] ?? "mp3" } });
      else if (kind === "video") parts.push({ type: "video_url", video_url: { url } });
      else parts.push({ type: "file", file: { filename: a.name, file_url: url } });
    }
    return { role: m.role, content: parts };
  });
}

/** Runs an inference request against an approved community model and meters it. */
export async function runChat(
  userId: string,
  slug: string,
  inputMessages: ChatMessage[],
  task?: TaskId,
): Promise<{ reply: string; total_tokens: number; model: string; images?: string[] }> {
  const messages = withTask(inputMessages, task);
  const started = Date.now();

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const [{ data: sub }, { data: period }] = await Promise.all([
    supabaseAdmin
      .from("subscriptions")
      .select("status, plan:plans(monthly_token_allowance)")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("usage_periods")
      .select("tokens_used")
      .eq("user_id", userId)
      .eq("period_start", periodStart.toISOString().slice(0, 10))
      .maybeSingle(),
  ]);

  const allowance = Number(sub?.plan?.monthly_token_allowance ?? 0);
  if (Number(period?.tokens_used ?? 0) >= allowance) {
    throw new Error("Monthly token allowance exhausted. Upgrade your plan to keep chatting.");
  }

  // Built-in OpenRouter-backed models (default chat + testing).
  const preset = findDefaultModel(slug);
  if (preset?.provider === "lovable") {
    const img = await generateImage(preset.model, inputMessages);
    await supabaseAdmin.from("token_usage").insert({
      user_id: userId,
      listing_id: null,
      input_tokens: 0,
      output_tokens: img.totalTokens,
      total_tokens: img.totalTokens,
      cost_cents: (img.totalTokens / 1_000_000) * preset.price_per_million_tokens_cents,
      latency_ms: Date.now() - started,
      status_code: 200,
    });
    return { reply: img.reply, total_tokens: img.totalTokens, model: slug, images: img.images };
  }
  if (preset) {
    const res = await runOpenRouterChat(slug, messages);
    await supabaseAdmin.from("token_usage").insert({
      user_id: userId,
      listing_id: null,
      input_tokens: res.inputTokens,
      output_tokens: res.outputTokens,
      total_tokens: res.totalTokens,
      cost_cents: (res.totalTokens / 1_000_000) * res.pricePerMillionCents,
      latency_ms: Date.now() - started,
      status_code: res.statusCode,
    });
    return { reply: res.reply, total_tokens: res.totalTokens, model: slug };
  }

  const { data: listing } = await supabaseAdmin
    .from("ai_listings")
    .select(
      "id, slug, endpoint_url, auth_header_ciphertext, model_name, price_per_million_tokens_cents, status, is_public, input_modalities",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!listing || listing.status !== "approved" || !listing.is_public) {
    throw new Error("That model is not available right now.");
  }

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (listing.auth_header_ciphertext) {
    try {
      headers["authorization"] = decryptSecret(listing.auth_header_ciphertext);
    } catch (error) {
      console.error("Failed to decrypt provider credential", error);
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(listing.endpoint_url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: listing.model_name ?? slug,
        messages,
        stream: false,
        ...(task ? { rancod_task: task } : {}),
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    console.error("Provider unreachable", error);
    await supabaseAdmin.from("ai_listings").update({ is_online: false }).eq("id", listing.id);
    throw new Error("The hosting provider for this AI is offline.");
  }

  const bodyText = await upstream.text();
  if (!upstream.ok) {
    console.error(`Provider error [${upstream.status}]: ${bodyText}`);
    throw new Error("The provider rejected this request.");
  }

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    throw new Error("The provider returned an invalid response.");
  }

  const choices = (result["choices"] ?? []) as Array<{ message?: { content?: string } }>;
  const reply = choices[0]?.message?.content ?? "";

  const usage = (result["usage"] ?? {}) as Record<string, number | undefined>;
  const inputTokens =
    usage["prompt_tokens"] ?? messages.reduce((sum, m) => sum + estimateTokens(textOf(m.content)), 0);
  const outputTokens = usage["completion_tokens"] ?? estimateTokens(reply);
  const totalTokens = usage["total_tokens"] ?? inputTokens + outputTokens;

  await Promise.all([
    supabaseAdmin.from("token_usage").insert({
      user_id: userId,
      listing_id: listing.id,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_cents: (totalTokens / 1_000_000) * listing.price_per_million_tokens_cents,
      latency_ms: Date.now() - started,
      status_code: upstream.status,
    }),
    supabaseAdmin
      .from("ai_listings")
      .update({ is_online: true, last_heartbeat_at: new Date().toISOString() })
      .eq("id", listing.id),
  ]);

  return { reply, total_tokens: totalTokens, model: listing.slug };
}

/** Persists a user turn, runs inference with full thread history, stores the reply. */
export async function sendThreadMessage(params: {
  userId: string;
  threadId: string;
  model: string;
  text: string;
  attachments: { path: string; mime: string; name: string }[];
  task?: TaskId;
}) {
  const { userId, threadId, model, text, attachments, task } = params;

  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .select("id, title")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!thread) throw new Error("Conversation not found");

  const { error: insertError } = await supabaseAdmin.from("chat_messages").insert({
    thread_id: threadId,
    user_id: userId,
    role: "user",
    content: text,
    attachments,
    model_slug: model,
  });
  if (insertError) throw new Error(insertError.message);

  const { data: history, error: histError } = await supabaseAdmin
    .from("chat_messages")
    .select("role, content, attachments")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(60);
  if (histError) throw new Error(histError.message);

  const stored: StoredMessage[] = (history ?? []).map((m) => ({
    role: m.role as StoredMessage["role"],
    content: m.content,
    attachments: (m.attachments ?? []) as StoredMessage["attachments"],
  }));

  const providerMessages = await buildProviderMessages(stored);
  const result = await runChat(userId, model, providerMessages, task);

  const generated: { path: string; mime: string; name: string }[] = [];
  for (const url of result.images ?? []) {
    const decoded = decodeDataUrl(url);
    if (!decoded) continue;
    const ext = decoded.mime.split("/")[1] ?? "png";
    const path = `${userId}/gen-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("chat-uploads")
      .upload(path, decoded.bytes, { contentType: decoded.mime });
    if (!error) generated.push({ path, mime: decoded.mime, name: `generated.${ext}` });
  }

  const { error: replyError } = await supabaseAdmin.from("chat_messages").insert({
    thread_id: threadId,
    user_id: userId,
    role: "assistant",
    content: result.reply,
    attachments: generated,
    model_slug: model,
    total_tokens: result.total_tokens,
  });
  if (replyError) throw new Error(replyError.message);

  const patch: { model_slug: string; updated_at: string; title?: string } = {
    model_slug: model,
    updated_at: new Date().toISOString(),
  };
  if (thread.title === "New chat" && text.trim()) {
    patch.title = text.trim().slice(0, 60);
  }
  await supabaseAdmin.from("chat_threads").update(patch).eq("id", threadId);

  return result;
}

/** One free, unsaved turn for signed-out visitors (built-in models only). */
export async function runGuestChat(params: { model: string; task?: TaskId; text: string; images: string[] }) {
  const preset = findDefaultModel(params.model);
  if (!preset) throw new Error("Sign in to use community models.");
  const content: ContentPart[] = [{ type: "text", text: params.text }];
  for (const url of params.images) content.push({ type: "image_url", image_url: { url } });
  const msgs: ChatMessage[] = [{ role: "user", content: params.images.length ? content : params.text }];
  if (preset.provider === "lovable") {
    const img = await generateImage(preset.model, msgs);
    return { reply: img.reply, images: img.images };
  }
  const res = await runOpenRouterChat(params.model, withTask(msgs, params.task), { max_tokens: 1200 });
  return { reply: res.reply, images: [] as string[] };
}
