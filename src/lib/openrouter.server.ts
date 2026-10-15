import { findDefaultModel } from "./default-models";
import { textOf, type ChatMessage } from "./chat-types";

export type { ChatMessage };

export type OpenRouterResult = {
  raw: Record<string, unknown>;
  reply: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  statusCode: number;
  pricePerMillionCents: number;
};

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

/** Calls OpenRouter for one of the built-in default models. */
export async function runOpenRouterChat(
  slug: string,
  messages: ChatMessage[],
  options?: { max_tokens?: number; temperature?: number },
): Promise<OpenRouterResult> {
  const preset = findDefaultModel(slug);
  if (!preset) throw new Error(`Unknown built-in model '${slug}'`);

  const isIntern = preset.provider === "intern";
  const apiKey = isIntern ? process.env["OPENAI_API_KEY"] : process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new Error("The built-in AI provider is not configured.");
  const endpoint = isIntern
    ? "https://discovery-api.intern-ai.org.cn/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        ...(isIntern ? {} : { "HTTP-Referer": "https://rancod.ai", "X-Title": "rancod.ai" }),
      },
      body: JSON.stringify({
        model: preset.model,
        messages,
        stream: false,
        ...(options?.max_tokens ? { max_tokens: options.max_tokens } : {}),
        ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    console.error("OpenRouter unreachable", error);
    throw new Error("The built-in AI provider is unreachable right now.");
  }

  const bodyText = await upstream.text();
  if (!upstream.ok) {
    console.error(`OpenRouter error [${upstream.status}]: ${bodyText}`);
    if (upstream.status === 429) throw new Error("Built-in AI is rate limited. Try again shortly.");
    if (upstream.status === 402) throw new Error("Built-in AI credits are exhausted.");
    throw new Error("The built-in AI provider rejected this request.");
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    throw new Error("The built-in AI provider returned an invalid response.");
  }

  const choices = (raw["choices"] ?? []) as Array<{ message?: { content?: string } }>;
  const reply = choices[0]?.message?.content ?? "";
  const usage = (raw["usage"] ?? {}) as Record<string, number | undefined>;
  const inputTokens = usage["prompt_tokens"] ?? messages.reduce((sum, m) => sum + estimateTokens(textOf(m.content)), 0);
  const outputTokens = usage["completion_tokens"] ?? estimateTokens(reply);
  const totalTokens = usage["total_tokens"] ?? inputTokens + outputTokens;

  return {
    raw,
    reply,
    inputTokens,
    outputTokens,
    totalTokens,
    statusCode: upstream.status,
    pricePerMillionCents: preset.price_per_million_tokens_cents,
  };
}
