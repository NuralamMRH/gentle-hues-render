import type { TaskId } from "./model-tasks";

/** Built-in models available to everyone for chat + testing. */
export const OPENROUTER_PREFIX = "openrouter/";

export type DefaultModel = {
  slug: string;
  name: string;
  model: string;
  tagline: string;
  price_per_million_tokens_cents: number;
  /** Upstream gateway: OpenRouter, Intern Discovery, or Lovable AI (image generation). */
  provider?: "openrouter" | "intern" | "lovable";
  tasks: TaskId[];
  vision?: boolean;
};

export const INTERN_PREFIX = "intern/";
const intern = (id: string, name: string, tagline: string, vision = false): DefaultModel => ({
  slug: `${INTERN_PREFIX}${id}`,
  name: `${name} (built-in)`,
  model: id,
  tagline,
  price_per_million_tokens_cents: 10,
  provider: "intern",
  vision,
  tasks: vision ? ["chat", "code", "vision"] : ["chat", "code"],
});

export const DEFAULT_MODELS: DefaultModel[] = [
  {
    slug: `${OPENROUTER_PREFIX}gpt-4o-mini`,
    name: "GPT-4o mini (built-in)",
    model: "openai/gpt-4o-mini",
    tagline: "Fast, cheap general chat",
    price_per_million_tokens_cents: 30,
    vision: true,
    tasks: ["chat", "code", "vision"],
  },
  {
    slug: `${OPENROUTER_PREFIX}gemini-flash`,
    name: "Gemini 2.0 Flash (built-in)",
    model: "google/gemini-2.0-flash-001",
    tagline: "Low-latency multimodal chat",
    price_per_million_tokens_cents: 20,
    vision: true,
    tasks: ["chat", "code", "vision"],
  },
  {
    slug: "lovable/image",
    name: "Nano Banana Image (built-in)",
    model: "google/gemini-2.5-flash-image",
    tagline: "Generate and edit images from a prompt",
    price_per_million_tokens_cents: 30,
    provider: "lovable",
    vision: true,
    tasks: ["image", "vision"],
  },
  {
    slug: `${OPENROUTER_PREFIX}llama-3.3-70b`,
    name: "Llama 3.3 70B (built-in)",
    model: "meta-llama/llama-3.3-70b-instruct",
    tagline: "Open-weights workhorse",
    price_per_million_tokens_cents: 15,
    tasks: ["chat", "code"],
  },
  intern("deepseek-v4-flash-0731", "DeepSeek V4 Flash", "1M context reasoning"),
  intern("deepseek-v4-flash-vision", "DeepSeek V4 Flash Vision", "Text + image understanding", true),
  intern("deepseek-v4-pro-0813", "DeepSeek V4 Pro", "Stronger reasoning & tools"),
  intern("glm-5.3", "GLM 5.3", "1M context, tool calling"),
  intern("kimi-k2.6", "Kimi K2.6", "Multimodal reasoning", true),
  intern("minimax-m3", "MiniMax M3", "Long-context reasoning"),
  intern("qwen3.8-27b", "Qwen 3.8 27B", "Multimodal, efficient", true),
  intern("intern-s2", "Intern S2", "Scientific reasoning, images", true),
  intern("Agents-A1", "Agents A1", "Agentic, tool calling"),
  intern("Atria-Dawn", "Atria Dawn", "512K scientific reasoning"),
];

export const findDefaultModel = (slug: string) => DEFAULT_MODELS.find((m) => m.slug === slug);
