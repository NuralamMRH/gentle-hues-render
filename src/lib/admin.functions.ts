import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "moderator", "provider", "user"] as const;

async function assertAdmin(supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

/** Platform-wide counters for the admin panel. */
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [users, listings, pending, usage] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("ai_listings").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("ai_listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("usage_periods").select("tokens_used, requests, cost_cents"),
    ]);

    const rows = usage.data ?? [];
    return {
      users: users.count ?? 0,
      listings: listings.count ?? 0,
      pending: pending.count ?? 0,
      tokens: rows.reduce((s, r) => s + Number(r.tokens_used ?? 0), 0),
      requests: rows.reduce((s, r) => s + Number(r.requests ?? 0), 0),
      revenueCents: rows.reduce((s, r) => s + Number(r.cost_cents ?? 0), 0),
    };
  });

/** Every account with roles, plan and lifetime usage. */
export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, roles, subs, usage] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, display_name, company, created_at").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("subscriptions").select("user_id, plan_code, status"),
      supabaseAdmin.from("usage_periods").select("user_id, tokens_used"),
    ]);

    return (profiles.data ?? []).map((p) => ({
      ...p,
      roles: (roles.data ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as string),
      plan: (subs.data ?? []).find((s) => s.user_id === p.id)?.plan_code ?? "free",
      status: (subs.data ?? []).find((s) => s.user_id === p.id)?.status ?? "inactive",
      tokens: (usage.data ?? []).filter((u) => u.user_id === p.id).reduce((s, u) => s + Number(u.tokens_used ?? 0), 0),
    }));
  });

const CreateUserInput = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(72),
  display_name: z.string().max(80).optional(),
  role: z.enum(ROLES).default("user"),
  plan_code: z.enum(["free", "pro", "max"]).default("free"),
});

/** Create an account (or a demo account) straight from the admin panel. */
export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateUserInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name ?? data.email.split("@")[0] },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account");

    if (data.role !== "user") {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    }
    if (data.plan_code !== "free") {
      await supabaseAdmin
        .from("subscriptions")
        .update({ plan_code: data.plan_code, status: "active" })
        .eq("user_id", created.user.id);
    }
    return { id: created.user.id, email: data.email };
  });

/** Grant or revoke a role for an account. */
export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(ROLES), grant: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.grant) {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    }
    return { ok: true };
  });

/** Move an account onto a different plan without going through Stripe. */
export const adminSetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ user_id: z.string().uuid(), plan_code: z.enum(["free", "pro", "max"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ plan_code: data.plan_code, status: "active" })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Permanently remove an account. */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    if (data.user_id === context.userId) throw new Error("You cannot delete your own admin account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
