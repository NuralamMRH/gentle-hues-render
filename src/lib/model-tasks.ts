import type { Modality } from "./chat-types";

/** Work types a model can perform; picked via chips, `/command`, or the hero box. */
export const TASK_IDS = ["chat", "code", "vision", "image", "video", "audio"] as const;
export type TaskId = (typeof TASK_IDS)[number];

export const TASKS: Record<TaskId, { label: string; hint: string; placeholder: string }> = {
  chat: { label: "Chat", hint: "Ask anything", placeholder: "Ask anything…" },
  code: { label: "Write code", hint: "Generate or explain code", placeholder: "Describe the code you need…" },
  vision: { label: "Analyze image", hint: "Drop an image and ask about it", placeholder: "Drop an image, then ask about it…" },
  image: { label: "Generate image", hint: "Create an image from a prompt", placeholder: "Describe the image to create…" },
  video: { label: "Generate video", hint: "Create a video from prompt + image", placeholder: "Drop a reference image and describe the video…" },
  audio: { label: "Generate audio", hint: "Create speech or sound", placeholder: "Describe the audio to create…" },
};

export const isTask = (v: unknown): v is TaskId => typeof v === "string" && (TASK_IDS as readonly string[]).includes(v);

/** Derives tasks for community listings from their declared modalities and purpose. */
export function tasksFromModalities(inputs: Modality[], outputs: Modality[], useCases = ""): TaskId[] {
  const t: TaskId[] = [];
  if (outputs.includes("text") || outputs.length === 0) t.push("chat");
  if (/code|program|develop/i.test(useCases)) t.push("code");
  if (inputs.includes("image")) t.push("vision");
  if (outputs.includes("image")) t.push("image");
  if (outputs.includes("video")) t.push("video");
  if (outputs.includes("audio")) t.push("audio");
  return t.length ? t : ["chat"];
}

/** System instruction prepended per task so the model answers in the right shape. */
export const TASK_SYSTEM: Partial<Record<TaskId, string>> = {
  code: "You are an expert software engineer. Answer with clear, working code in fenced blocks and brief explanations.",
  vision: "Carefully analyze any attached images and answer the user's question about them.",
  image: "The user wants an image generated. Produce the image. If you return a URL, use markdown image syntax.",
  video:
    "The user wants a video generated from their prompt and any reference image. Return the video as a direct URL on its own line.",
  audio: "The user wants audio generated. Return the audio as a direct URL on its own line.",
};
