import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { createThread } from "@/lib/chat-threads.functions";
import { guestChat, importGuestTurns } from "@/lib/chat.functions";
import { GUEST_KEY, setPendingPrompt, type GuestTurn } from "@/lib/pending-prompt";
import { TASKS, isTask, type TaskId } from "@/lib/model-tasks";
import { useSession } from "@/hooks/use-session";
import { useModelOptions } from "@/hooks/use-model-options";
import { Composer, coerceTask } from "@/components/chat/composer";
import { MessageView } from "@/components/chat/message-view";
import { AuthModal } from "@/components/chat/auth-modal";
import { uploadChatFiles } from "@/lib/chat-upload";
import { Loader2 } from "lucide-react";
import logoAsset from "@/assets/rancod-logo.png.asset.json";

const Search = z.object({
  q: z.string().max(4000).optional(),
  model: z.string().max(120).optional(),
  task: z.string().max(20).optional(),
});

export const Route = createFileRoute("/chat/")({
  validateSearch: (s) => Search.parse(s),
  component: ChatIndex,
});

const toDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

function ChatIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, loading } = useSession();
  const options = useModelOptions();
  const createFn = useServerFn(createThread);
  const guestFn = useServerFn(guestChat);
  const importFn = useServerFn(importGuestTurns);

  const [model, setModel] = useState(search.model ?? "openrouter/gpt-4o-mini");
  const [task, setTask] = useState<TaskId>(isTask(search.task) ? search.task : "chat");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<GuestTurn[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const heldText = useRef<string>("");

  const active = options.find((o) => o.slug === model);
  const activeTask = coerceTask(active, task);

  useEffect(() => {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as { model: string; turns: GuestTurn[] };
        setTurns(saved.turns);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // After sign-in, move the free trial turn into a saved conversation and continue there.
  useEffect(() => {
    if (!session) return;
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return;
    localStorage.removeItem(GUEST_KEY);
    const saved = JSON.parse(raw) as { model: string; turns: GuestTurn[] };
    setAuthOpen(false);
    importFn({ data: { model: saved.model, turns: saved.turns.map(({ role, content }) => ({ role, content })) } })
      .then((row) => {
        if (heldText.current) {
          setPendingPrompt(row.id, { text: heldText.current, model, task: activeTask, attachments: [] });
        }
        queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
        navigate({ to: "/chat/$threadId", params: { threadId: row.id } });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not save chat"));
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(text: string, files: File[]): Promise<boolean> {
    setError(null);
    const prompt = text || TASKS[activeTask].label;
    if (session) {
      setBusy(true);
      try {
        const attachments = await uploadChatFiles(files);
        const row = await createFn({ data: { model_slug: model } });
        setPendingPrompt(row.id, { text: prompt, model, task: activeTask, attachments });
        queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
        navigate({ to: "/chat/$threadId", params: { threadId: row.id } });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start chat");
        return false;
      } finally {
        setBusy(false);
      }
    }
    // Guest: one free answer, then ask them to sign in.
    if (turns.length > 0 || !active?.builtIn) {
      heldText.current = prompt;
      setAuthOpen(true);
      return false;
    }
    setBusy(true);
    try {
      const images = await Promise.all(
        files.filter((f) => f.type.startsWith("image/") && f.size < 3_000_000).slice(0, 2).map(toDataUrl),
      );
      const res = await guestFn({ data: { model, task: activeTask, text: prompt, images } });
      const next: GuestTurn[] = [
        { role: "user", content: prompt, images },
        { role: "assistant", content: res.reply, images: res.images },
      ];
      setTurns(next);
      localStorage.setItem(
        GUEST_KEY,
        JSON.stringify({ model, turns: next.map(({ role, content }) => ({ role, content })) }),
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Auto-send a prompt arriving from the home page chat box.
  const autoSent = useRef(false);
  useEffect(() => {
    if (loading || autoSent.current || !search.q) return;
    autoSent.current = true;
    navigate({ to: "/chat", search: {}, replace: true });
    void send(search.q, []);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-5 py-6">
          {turns.length === 0 && !busy && (
            <div className="flex flex-col items-center gap-4 pt-16 text-center">
              <img src={logoAsset.url} alt="rancod.ai" className="size-14" />
              <h1 className="font-display text-2xl font-semibold text-[color:var(--brand-navy)]">
                What do you want to make?
              </h1>
              <p className="max-w-md text-sm text-muted-foreground">
                Pick a model and a task. Type <b>/</b> for tasks or <b>#</b> to switch models, and drag images into
                the prompt.
                {!session && " Your first answer is free — no account needed."}
              </p>
            </div>
          )}
          {turns.map((t, i) => (
            <MessageView
              key={i}
              role={t.role}
              content={t.content}
              attachments={(t.images ?? []).map((url, j) => ({ key: `${i}-${j}`, mime: "image/png", name: "image.png", url }))}
            />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {activeTask === "image" ? "Generating image…" : "Thinking…"}
            </div>
          )}
          {!session && turns.length > 0 && !busy && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              Want to keep going? <button className="font-semibold text-primary" onClick={() => setAuthOpen(true)}>Create a free account</button> to continue this conversation and save it.
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-border bg-background px-5 py-4">
        <div className="mx-auto max-w-3xl space-y-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Composer
            options={options}
            model={model}
            onModel={setModel}
            task={activeTask}
            onTask={setTask}
            busy={busy}
            autoFocus
            onSubmit={send}
          />
        </div>
      </div>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
