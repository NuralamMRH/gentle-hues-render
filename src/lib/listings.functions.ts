import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const PUBLIC_COLUMNS =
  "id, slug, name, tagline, description, category, tags, model_name, context_length, price_per_million_tokens_cents, is_online, last_heartbeat_at, created_at";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Public marketplace listing feed (approved + public only). */
export const listPublicListings = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("ai_listings")
    .select(PUBLIC_COLUMNS)
    .eq("status", "approved")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return data ?? [];
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

const SubmissionInput = z.object({
  name: z.string().min(2).max(80),
  tagline: z.string().max(140).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(60).optional(),
  tags: z.array(z.string().max(24)).max(8).optional(),
  model_name: z.string().max(80).optional(),
  context_length: z.number().int().min(0).max(10_000_000).optional(),
  endpoint_url: z.string().url().max(500),
  auth_header: z.string().max(500).optional(),
  price_per_million_tokens_cents: z.number().int().min(0).max(1_000_000).default(0),
  is_public: z.boolean().default(true),
});

/** Submit a self-hosted AI for review. */
export const submitListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmissionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ count }, subRes] = await Promise.all([
      supabase.from("ai_listings").select("id", { count: "exact", head: true }).eq("owner_id", userId),
      supabase.from("subscriptions").select("plan:plans(max_submissions)").eq("user_id", userId).maybeSingle(),
    ]);
    const limit = subRes.data?.plan?.max_submissions ?? 1;
    if ((count ?? 0) >= limit) {
      throw new Error(`Your plan allows ${limit} AI submission(s). Upgrade to submit more.`);
    }

    const { auth_header, ...rest } = data;
    let ciphertext: string | null = null;
    if (auth_header) {
      const { encryptSecret } = await import("./secure.server");
      ciphertext = encryptSecret(auth_header);
    }

    const slug = `${slugify(data.name)}-${Math.random().toString(36).slice(2, 7)}`;
    const { data: row, error } = await supabase
      .from("ai_listings")
      .insert({ ...rest, slug, owner_id: userId, status: "pending", auth_header_ciphertext: ciphertext })
      .select("id, slug, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMyListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_listings")
      .select(
        "id, slug, name, tagline, category, tags, model_name, endpoint_url, status, is_public, is_online, price_per_million_tokens_cents, review_notes, created_at",
      )
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const UpdateInput = SubmissionInput.partial().extend({ id: z.string().uuid() });

export const updateMyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { id, auth_header, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest, status: "pending" };
    if (auth_header) {
      const { encryptSecret } = await import("./secure.server");
      patch["auth_header_ciphertext"] = encryptSecret(auth_header);
    }
    const { error } = await context.supabase
      .from("ai_listings")
      .update(patch)
      .eq("id", id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_listings")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- admin review ---------- */

async function assertAdmin(context: { supabase: ReturnType<typeof publicClient>; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const listSubmissionsForReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("ai_listings")
      .select("id, slug, name, tagline, owner_id, status, endpoint_url, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const reviewListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected", "suspended"]),
        review_notes: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("ai_listings")
      .update({
        status: data.status,
        review_notes: data.review_notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
