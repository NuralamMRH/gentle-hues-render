import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STRIPE_API = "https://api.stripe.com/v1";

function form(params: Record<string, string | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.set(k, v);
  return body;
}

async function stripe(path: string, body?: URLSearchParams) {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Payments are not configured yet. Connect Stripe to enable checkout.");
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Stripe ${path} failed [${res.status}]: ${text}`);
    throw new Error(`Payment provider error [${res.status}]`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
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
  const { data, error } = await client.from("plans").select("*").eq("is_active", true).order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

/** Starts a Stripe Checkout subscription for the chosen plan. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ planCode: z.enum(["pro", "max"]), origin: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    const { data: plan } = await supabase
      .from("plans")
      .select("code, name, price_cents, currency, stripe_price_id")
      .eq("code", data.planCode)
      .maybeSingle();
    if (!plan) throw new Error("Unknown plan");

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe(
        "/customers",
        form({ email: (claims as { email?: string }).email, "metadata[user_id]": userId }),
      );
      customerId = customer["id"] as string;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", userId);
    }

    const params = form({
      mode: "subscription",
      customer: customerId,
      success_url: `${data.origin}/dashboard?checkout=success`,
      cancel_url: `${data.origin}/pricing?checkout=cancelled`,
      "metadata[user_id]": userId,
      "metadata[plan_code]": plan.code,
      "subscription_data[metadata][user_id]": userId,
      "subscription_data[metadata][plan_code]": plan.code,
    });

    if (plan.stripe_price_id) {
      params.set("line_items[0][price]", plan.stripe_price_id);
      params.set("line_items[0][quantity]", "1");
    } else {
      params.set("line_items[0][quantity]", "1");
      params.set("line_items[0][price_data][currency]", plan.currency);
      params.set("line_items[0][price_data][unit_amount]", String(plan.price_cents));
      params.set("line_items[0][price_data][recurring][interval]", "month");
      params.set("line_items[0][price_data][product_data][name]", `rancod.ai ${plan.name}`);
    }

    const session = await stripe("/checkout/sessions", params);
    return { url: session["url"] as string };
  });

/** Opens the Stripe customer billing portal to manage or cancel the subscription. */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!sub?.stripe_customer_id) throw new Error("No billing account yet — subscribe to a paid plan first.");
    const session = await stripe(
      "/billing_portal/sessions",
      form({ customer: sub.stripe_customer_id, return_url: `${data.origin}/dashboard` }),
    );
    return { url: session["url"] as string };
  });
