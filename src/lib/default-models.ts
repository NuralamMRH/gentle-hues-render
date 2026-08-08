/** Built-in OpenRouter-backed models available to everyone for chat + testing. */
export const OPENROUTER_PREFIX = "openrouter/";

export type DefaultModel = {
  slug: string;
  name: string;
  model: string;
  tagline: string;
  price_per_million_tokens_cents: number;
};

export const DEFAULT_MODELS: DefaultModel[] = [
  {
    slug: `${OPENROUTER_PREFIX}gpt-4o-mini`,
    name: "GPT-4o mini (built-in)",
    model: "openai/gpt-4o-mini",
    tagline: "Fast, cheap general chat",
    price_per_million_tokens_cents: 30,
  },
  {
    slug: `${OPENROUTER_PREFIX}gemini-flash`,
    name: "Gemini 2.0 Flash (built-in)",
    model: "google/gemini-2.0-flash-001",
    tagline: "Low-latency multimodal-ready chat",
    price_per_million_tokens_cents: 20,
  },
  {
    slug: `${OPENROUTER_PREFIX}llama-3.3-70b`,
    name: "Llama 3.3 70B (built-in)",
    model: "meta-llama/llama-3.3-70b-instruct",
    tagline: "Open-weights workhorse",
    price_per_million_tokens_cents: 15,
  },
];

export const findDefaultModel = (slug: string) => DEFAULT_MODELS.find((m) => m.slug === slug);
