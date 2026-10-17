import type { TaskId } from "./model-tasks";

export type PendingPrompt = {
  text: string;
  model: string;
  task: TaskId;
  attachments: { path: string; mime: string; name: string }[];
};

const key = (threadId: string) => `rancod:pending:${threadId}`;

/** Hands a prompt to a freshly created conversation page, which sends it on mount. */
export const setPendingPrompt = (threadId: string, p: PendingPrompt) =>
  sessionStorage.setItem(key(threadId), JSON.stringify(p));

export const takePendingPrompt = (threadId: string): PendingPrompt | null => {
  const raw = sessionStorage.getItem(key(threadId));
  if (!raw) return null;
  sessionStorage.removeItem(key(threadId));
  try {
    return JSON.parse(raw) as PendingPrompt;
  } catch {
    return null;
  }
};

export const GUEST_KEY = "rancod:guest-turn";
export type GuestTurn = { role: "user" | "assistant"; content: string; images?: string[] };
