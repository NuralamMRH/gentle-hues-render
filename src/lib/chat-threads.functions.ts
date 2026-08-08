import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Attachment = { path: string; mime: string; name: string };

/** Conversations belonging to the signed-in user, newest activity first. */
export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_threads")
      .select("id, title, model_slug, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ model_slug: z.string().max(120).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("chat_threads")
      .insert({ user_id: context.userId, title: "New chat", model_slug: data.model_slug ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [threadRes, msgRes] = await Promise.all([
      context.supabase
        .from("chat_threads")
        .select("id, title, model_slug")
        .eq("id", data.threadId)
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("chat_messages")
        .select("id, role, content, attachments, created_at")
        .eq("thread_id", data.threadId)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true }),
    ]);
    if (threadRes.error) throw new Error(threadRes.error.message);
    if (!threadRes.data) throw new Error("Conversation not found");
    if (msgRes.error) throw new Error(msgRes.error.message);
    return { thread: threadRes.data, messages: msgRes.data ?? [] };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid(), title: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_threads")
      .update({ title: data.title })
      .eq("id", data.threadId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ threadId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_threads")
      .delete()
      .eq("id", data.threadId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Short-lived signed URLs so the browser can preview private attachments. */
export const signAttachments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ paths: z.array(z.string().max(400)).max(30) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const mine = data.paths.filter((p) => p.startsWith(`${context.userId}/`));
    if (mine.length === 0) return {} as Record<string, string>;
    const { data: signed } = await context.supabase.storage
      .from("chat-uploads")
      .createSignedUrls(mine, 3600);
    const map: Record<string, string> = {};
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
    }
    return map;
  });
