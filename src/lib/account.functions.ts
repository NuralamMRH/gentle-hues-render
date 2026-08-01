import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Profile + subscription + current-month usage for the signed-in user. */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, subRes, usageRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("*, plan:plans(*)")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("usage_periods")
        .select("*")
        .eq("user_id", userId)
        .order("period_start", { ascending: false })
        .limit(12),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    return {
      profile: profileRes.data,
      subscription: subRes.data,
      usage: usageRes.data ?? [],
      roles: (rolesRes.data ?? []).map((r) => r.role),
    };
  });

const ProfileInput = z.object({
  display_name: z.string().min(1).max(80).optional(),
  company: z.string().max(120).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().max(500).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Recent per-request token usage for the signed-in user. */
export const getMyUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("token_usage")
      .select("*, listing:ai_listings(name, slug)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
