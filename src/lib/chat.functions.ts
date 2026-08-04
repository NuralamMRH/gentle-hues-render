import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ChatInput = z.object({
  model: z.string().min(1).max(120),
  messages: z
    .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().min(1).max(20_000) }))
    .min(1)
    .max(40),
});

/** Send a conversation to an approved community-hosted model. */
export const chatWithModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const { runChat } = await import("./chat.server");
    return runChat(context.userId, data.model, data.messages);
  });
