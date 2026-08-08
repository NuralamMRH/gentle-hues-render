import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    });
  });
