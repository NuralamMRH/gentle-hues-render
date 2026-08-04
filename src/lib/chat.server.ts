import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptSecret } from "@/lib/secure.server";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

/** Runs an inference request against an approved community model and meters it. */
export async function runChat(userId: string, slug: string, messages: ChatMessage[]) {
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

  const { data: listing } = await supabaseAdmin
    .from("ai_listings")
    .select("id, slug, endpoint_url, auth_header_ciphertext, model_name, price_per_million_tokens_cents, status, is_public")
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
  const inputTokens = usage["prompt_tokens"] ?? messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
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
