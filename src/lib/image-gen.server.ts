import type { ChatMessage } from "./chat-types";

/** Generates (or edits) images through the Lovable AI gateway. Returns data URLs. */
export async function generateImage(model: string, messages: ChatMessage[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Image generation is not configured.");
  const userTurns = messages.filter((m) => m.role !== "system");
  const last = userTurns[userTurns.length - 1];
  if (!last) throw new Error("Describe the image to create.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [last], modalities: ["image", "text"] }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`Image gen error [${res.status}]: ${body}`);
    if (res.status === 429) throw new Error("Image generation is rate limited. Try again shortly.");
    if (res.status === 402) throw new Error("Image generation credits are exhausted.");
    throw new Error("Image generation failed.");
  }
  const json = JSON.parse(body) as {
    choices?: Array<{ message?: { content?: string; images?: Array<{ image_url?: { url?: string } }> } }>;
    usage?: { total_tokens?: number };
  };
  const msg = json.choices?.[0]?.message;
  const images = (msg?.images ?? []).map((i) => i.image_url?.url).filter((u): u is string => !!u);
  if (images.length === 0) throw new Error("The model did not return an image. Try rephrasing your prompt.");
  return {
    reply: msg?.content?.trim() || "Here's your image.",
    images,
    totalTokens: json.usage?.total_tokens ?? 1290,
  };
}

/** Decodes a base64 data URL into bytes + mime. */
export function decodeDataUrl(url: string) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(url);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime: m[1], bytes };
}
