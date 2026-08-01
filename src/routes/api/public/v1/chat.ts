import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ChatInput = z.object({
  model: z.string().min(1).max(120),
  messages: z
    .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().max(50_000) }))
    .min(1)
    .max(100),
  max_tokens: z.number().int().min(1).max(32_000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.literal(false).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

/**
 * Public inference API. Callers authenticate with a rancod.ai API key and are
 * routed to an approved, community-hosted AI. Usage is metered against the
 * caller's monthly plan allowance.
 */
export const Route = createFileRoute("/api/public/v1/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        const auth = request.headers.get("authorization") ?? "";
        const presented = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!presented.startsWith("rcd_")) return json({ error: "Missing or invalid API key" }, 401);

        let payload: z.infer<typeof ChatInput>;
        try {
          payload = ChatInput.parse(await request.json());
        } catch {
          return json({ error: "Invalid request body" }, 400);
        }

        const { hashApiKey, decryptSecret } = await import("@/lib/secure.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: keyRow } = await supabaseAdmin
          .from("api_keys")
          .select("id, user_id, revoked_at")
          .eq("key_hash", hashApiKey(presented))
          .maybeSingle();
        if (!keyRow || keyRow.revoked_at) return json({ error: "Invalid or revoked API key" }, 401);

        // Quota check against the caller's plan allowance for the current month.
        const periodStart = new Date();
        periodStart.setUTCDate(1);
        periodStart.setUTCHours(0, 0, 0, 0);
        const [{ data: sub }, { data: period }] = await Promise.all([
          supabaseAdmin
            .from("subscriptions")
            .select("status, plan:plans(monthly_token_allowance)")
            .eq("user_id", keyRow.user_id)
            .maybeSingle(),
          supabaseAdmin
            .from("usage_periods")
            .select("tokens_used")
            .eq("user_id", keyRow.user_id)
            .eq("period_start", periodStart.toISOString().slice(0, 10))
            .maybeSingle(),
        ]);
        const allowance = sub?.plan?.monthly_token_allowance ?? 0;
        if ((period?.tokens_used ?? 0) >= allowance) {
          return json({ error: "Monthly token allowance exhausted. Upgrade your plan." }, 402);
        }

        const { data: listing } = await supabaseAdmin
          .from("ai_listings")
          .select("id, slug, endpoint_url, auth_header_ciphertext, model_name, price_per_million_tokens_cents, status, is_public")
          .eq("slug", payload.model)
          .maybeSingle();
        if (!listing || listing.status !== "approved" || !listing.is_public) {
          return json({ error: `Unknown or unavailable model '${payload.model}'` }, 404);
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
              model: listing.model_name ?? payload.model,
              messages: payload.messages,
              max_tokens: payload.max_tokens,
              temperature: payload.temperature,
              stream: false,
            }),
            signal: AbortSignal.timeout(120_000),
          });
        } catch (error) {
          console.error("Provider unreachable", error);
          await supabaseAdmin
            .from("ai_listings")
            .update({ is_online: false })
            .eq("id", listing.id);
          return json({ error: "The hosting provider for this AI is offline" }, 503);
        }

        const bodyText = await upstream.text();
        if (!upstream.ok) {
          console.error(`Provider error [${upstream.status}]: ${bodyText}`);
          return json({ error: "Provider request failed", status: upstream.status }, 502);
        }

        let result: Record<string, unknown>;
        try {
          result = JSON.parse(bodyText) as Record<string, unknown>;
        } catch {
          return json({ error: "Provider returned an invalid response" }, 502);
        }

        const usage = (result["usage"] ?? {}) as Record<string, number | undefined>;
        const inputTokens =
          usage["prompt_tokens"] ?? payload.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
        const outputTokens = usage["completion_tokens"] ?? estimateTokens(bodyText);
        const totalTokens = usage["total_tokens"] ?? inputTokens + outputTokens;
        const costCents = (totalTokens / 1_000_000) * listing.price_per_million_tokens_cents;

        await Promise.all([
          supabaseAdmin.from("token_usage").insert({
            user_id: keyRow.user_id,
            listing_id: listing.id,
            api_key_id: keyRow.id,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: totalTokens,
            cost_cents: costCents,
            latency_ms: Date.now() - started,
            status_code: upstream.status,
          }),
          supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", keyRow.id),
          supabaseAdmin
            .from("ai_listings")
            .update({ is_online: true, last_heartbeat_at: new Date().toISOString() })
            .eq("id", listing.id),
        ]);

        return json({ ...result, rancod: { model: listing.slug, total_tokens: totalTokens } });
      },
    },
  },
});
