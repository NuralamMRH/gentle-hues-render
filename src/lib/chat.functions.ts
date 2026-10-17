import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TASK_IDS } from "@/lib/model-tasks";

const AttachmentInput = z.object({
  path: z.string().min(1).max(400),
  mime: z.string().max(120),
  name: z.string().max(200),
});

const SendInput = z.object({
  threadId: z.string().uuid(),
  model: z.string().min(1).max(120),
  text: z.string().max(20_000),
  attachments: z.array(AttachmentInput).max(6).default([]),
  task: z.enum(TASK_IDS).optional(),
});

/** Sends a turn in a stored conversation and returns the assistant reply. */
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!data.text.trim() && data.attachments.length === 0) {
      throw new Error("Write a message or attach a file.");
    }
    const { sendThreadMessage } = await import("./chat.server");
    return sendThreadMessage({
      userId: context.userId,
      threadId: data.threadId,
      model: data.model,
      text: data.text,
      attachments: data.attachments,
      task: data.task,
    });
  });

/** Public: one unsaved trial answer for signed-out visitors (built-in models only). */
export const guestChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        model: z.string().min(1).max(120),
        task: z.enum(TASK_IDS).optional(),
        text: z.string().min(1).max(4000),
        images: z.array(z.string().startsWith("data:image/").max(4_500_000)).max(2).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { runGuestChat } = await import("./chat.server");
    return runGuestChat(data);
  });

/** Saves a guest's trial turn into a new conversation after they sign in. */
export const importGuestTurns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        model: z.string().max(120),
        turns: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(40_000) }))
          .max(4),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const title = (data.turns.find((t) => t.role === "user")?.content || "New chat").slice(0, 60);
    const { data: row, error } = await supabaseAdmin
      .from("chat_threads")
      .insert({ user_id: context.userId, title, model_slug: data.model })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    for (const t of data.turns) {
      await supabaseAdmin.from("chat_messages").insert({
        thread_id: row.id,
        user_id: context.userId,
        role: t.role,
        content: t.content,
        attachments: [],
        model_slug: data.model,
      });
    }
    return row;
  });
