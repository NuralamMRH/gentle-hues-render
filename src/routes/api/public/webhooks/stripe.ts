import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Constant-time-ish HMAC verification of Stripe's signature header. */
async function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

const PLAN_BY_AMOUNT: Record<number, string> = { 2000: "pro", 10000: "max" };

/** Stripe webhook: keeps each user's subscription state in sync. */
export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return json({ error: "Webhook not configured" }, 500);

        const body = await request.text();
        if (!(await verifyStripeSignature(body, request.headers.get("stripe-signature"), secret))) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body) as StripeEvent;
        const object = event.data.object;
        const metadata = (object["metadata"] ?? {}) as Record<string, string | undefined>;
        const customerId = (object["customer"] as string | undefined) ?? undefined;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        async function resolveUserId(): Promise<string | null> {
          if (metadata["user_id"]) return metadata["user_id"];
          if (!customerId) return null;
          const { data } = await supabaseAdmin
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          return data?.user_id ?? null;
        }

        switch (event.type) {
          case "checkout.session.completed":
          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const userId = await resolveUserId();
            if (!userId) break;
            const amount = (object["plan"] as { amount?: number } | undefined)?.amount;
            const planCode =
              metadata["plan_code"] ?? (amount ? PLAN_BY_AMOUNT[amount] : undefined) ?? "pro";
            const periodEnd = object["current_period_end"] as number | undefined;
            const periodStart = object["current_period_start"] as number | undefined;
            const status = (object["status"] as string | undefined) ?? "active";

            await supabaseAdmin
              .from("subscriptions")
              .update({
                plan_code: planCode,
                status: ["active", "trialing", "past_due", "canceled", "incomplete"].includes(status)
                  ? (status as "active")
                  : "active",
                stripe_customer_id: customerId ?? null,
                stripe_subscription_id:
                  (object["subscription"] as string | undefined) ?? (object["id"] as string),
                cancel_at_period_end: Boolean(object["cancel_at_period_end"]),
                current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
                current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
              })
              .eq("user_id", userId);
            break;
          }
          case "customer.subscription.deleted": {
            const userId = await resolveUserId();
            if (!userId) break;
            await supabaseAdmin
              .from("subscriptions")
              .update({ plan_code: "free", status: "canceled", stripe_subscription_id: null })
              .eq("user_id", userId);
            break;
          }
          case "invoice.payment_failed": {
            const userId = await resolveUserId();
            if (userId) {
              await supabaseAdmin.from("subscriptions").update({ status: "past_due" }).eq("user_id", userId);
            }
            break;
          }
          default:
            break;
        }

        return json({ received: true });
      },
    },
  },
});
