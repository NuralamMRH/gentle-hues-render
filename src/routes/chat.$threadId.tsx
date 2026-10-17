import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getThread, signAttachments } from "@/lib/chat-threads.functions";
import { sendMessage } from "@/lib/chat.functions";
import { takePendingPrompt } from "@/lib/pending-prompt";
import { TASKS, type TaskId } from "@/lib/model-tasks";
import { useSession } from "@/hooks/use-session";
import { useModelOptions } from "@/hooks/use-model-options";
import { Composer, coerceTask } from "@/components/chat/composer";
import { MessageView } from "@/components/chat/message-view";
import { AuthModal } from "@/components/chat/auth-modal";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/chat/$threadId")({
  component: ThreadPage,
});

type Attachment = { path: string; mime: string; name: string };

export async function uploadChatFiles(files: File[]): Promise<Attachment[]> {
  if (!files.length) return [];
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Sign in to attach files.");
  const out: Attachment[] = [];
  for (const file of files.slice(0, 6)) {
    const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase.storage.from("chat-uploads").upload(path, file);
    if (error) throw new Error(error.message);
    out.push({ path, mime: file.type || "application/octet-stream", name: file.name });
  }
  return out;
}

function ThreadPage() {
  const { session, loading } = useSession();
  if (loading)
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (!session)
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        <AuthModal open onOpenChange={() => undefined} reason="Sign in to open this conversation." />
      </div>
    );
  return <Thread />;
}

function Thread() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();
  const getThreadFn = useServerFn(getThread);
  const signFn = useServerFn(signAttachments);
  const sendFn = useServerFn(sendMessage);
  const options = useModelOptions();

  const thread = useQuery({
    queryKey: ["chat-thread", threadId],
    queryFn: () => getThreadFn({ data: { threadId } }),
  });

  const [model, setModel] = useState("");
  const [task, setTask] = useState<TaskId>("chat");
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<{ text: string; atts: Attachment[] } | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeModel = model || thread.data?.thread.model_slug || options[0]?.slug || "";
  const active = options.find((o) => o.slug === activeModel);
  const activeTask = coerceTask(active, task);
  const messages = thread.data?.messages ?? [];

  const ask = useMutation({
    mutationFn: (p: { text: string; attachments: Attachment[]; model: string; task: TaskId }) => {
      setOptimistic({ text: p.text, atts: p.attachments });
      return sendFn({ data: { threadId, ...p } });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Chat failed"),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chat-thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      setOptimistic(null);
    },
  });

  // Prompt handed over from the hero box / new-chat screen.
  const tookPending = useRef(false);
  useEffect(() => {
    if (tookPending.current) return;
    tookPending.current = true;
    const p = takePendingPrompt(threadId);
    if (p) {
      setModel(p.model);
      setTask(p.task);
      ask.mutate({ text: p.text, attachments: p.attachments, model: p.model, task: p.task });
    }
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, ask.isPending]);

  useEffect(() => {
    const paths = [
      ...messages.flatMap((m) => ((m.attachments ?? []) as Attachment[]).map((a) => a.path)),
      ...(optimistic?.atts.map((a) => a.path) ?? []),
    ];
    const missing = paths.filter((p) => !previews[p]);
    if (missing.length === 0) return;
    signFn({ data: { paths: missing } })
      .then((map) => setPreviews((prev) => ({ ...prev, ...map })))
      .catch(() => undefined);
  }, [messages, optimistic, previews, signFn]);

  const view = (atts: Attachment[]) =>
    atts.map((a) => ({ key: a.path, mime: a.mime, name: a.name, url: previews[a.path] }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border px-5 py-3">
        <p className="truncate font-display text-sm font-semibold text-[color:var(--brand-navy)]">
          {thread.data?.thread.title ?? "Chat"}
        </p>
        {active && <p className="truncate text-xs text-muted-foreground">{active.name} — {active.tagline}</p>}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-5 py-6">
          {messages.map((m) => (
            <MessageView
              key={m.id}
              role={m.role}
              content={m.content}
              attachments={view((m.attachments ?? []) as Attachment[])}
            />
          ))}
          {optimistic && <MessageView role="user" content={optimistic.text} attachments={view(optimistic.atts)} />}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {activeTask === "image" ? "Generating image…" : activeTask === "video" ? "Generating video…" : "Thinking…"}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background px-5 py-4">
        <div className="mx-auto max-w-3xl space-y-2">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Composer
            key={threadId}
            options={options}
            model={activeModel}
            onModel={setModel}
            task={activeTask}
            onTask={setTask}
            busy={ask.isPending}
            autoFocus
            onSubmit={async (text, files) => {
              setError(null);
              try {
                const attachments = await uploadChatFiles(files);
                ask.mutate({ text: text || TASKS[activeTask].label, attachments, model: activeModel, task: activeTask });
                return true;
              } catch (e) {
                setError(e instanceof Error ? e.message : "Upload failed");
                return false;
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
