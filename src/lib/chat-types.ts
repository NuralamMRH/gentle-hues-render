/** Shared chat message shapes (text + multimodal parts). */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { url: string; format: string } }
  | { type: "video_url"; video_url: { url: string } }
  | { type: "file"; file: { filename: string; file_url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

export const MODALITIES = ["text", "image", "audio", "video", "file"] as const;
export type Modality = (typeof MODALITIES)[number];

export const modalityForMime = (mime: string): Modality => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "file";
};

export const textOf = (content: string | ContentPart[]): string =>
  typeof content === "string"
    ? content
    : content.map((p) => (p.type === "text" ? p.text : "")).join(" ");
