import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listPublicListings } from "@/lib/listings.functions";
import { getThread, signAttachments } from "@/lib/chat-threads.functions";
import { sendMessage } from "@/lib/chat.functions";
import { DEFAULT_MODELS } from "@/lib/default-models";
import { modalityForMime, type Modality } from "@/lib/chat-types";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip, Send, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ThreadPage,
});

type Attachment = { path: string; mime: string; name: string };

const acceptFor = (mods: Modality[]) => {
  const parts: string[] = [];
  if (mods.includes("image")) parts.push("image/*");
  if (mods.includes("audio")) parts.push("audio/*");
  if (mods.includes("video")) parts.push("video/*");
  if (mods.includes("file")) parts.push("*/*");
  return parts.join(",");
};

function ThreadPage() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();

  const getThreadFn = useServerFn(getThread);
  const signFn = useServerFn(signAttachments);
  const sendFn = useServerFn(sendMessage);

  const thread = useQuery({
    queryKey: ["chat-thread", threadId],
    queryFn: () => getThreadFn({ data: { threadId } }),
  });
  const listings = useQuery({ queryKey: ["public-listings"], queryFn: useServerFn(listPublicListings) });

  const [model, setModel] = useState("");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () => [
      ...DEFAULT_MODELS.map((m) => ({
        slug: m.slug,
        name: m.name,
        inputs: ["text", "image"] as Modality[],
        outputs: ["text"] as Modality[],
        use_cases: m.tagline,
      })),
      ...(listings.data ?? []).map((m) => ({
        slug: m.slug,
        name: m.name,
        inputs: ((m as { input_modalities?: string[] }).input_modalities ?? ["text"]) as Modality[],
        outputs: ((m as { output_modalities?: string[] }).output_modalities ?? ["text"]) as Modality[],
        use_cases: (m as { use_cases?: string | null }).use_cases ?? m.tagline ?? "",
      })),
    ],
    [listings.data],
  );

  const activeModel = model || thread.data?.thread.model_slug || options[0]?.slug || "";
  const active = options.find((o) => o.slug === activeModel);
  const acceptsFiles = (active?.inputs ?? []).some((m) => m !== "text");

  const messages = thread.data?.messages ?? [];

  useEffect(() => {
    textRef.current?.focus();
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Sign attachment paths so previews render from the private bucket.
  useEffect(() => {
    const paths = messages.flatMap((m) => ((m.attachments ?? []) as Attachment[]).map((a) => a.path));
    const missing = paths.filter((p) => !previews[p]);
    if (missing.length === 0) return;
    signFn({ data: { paths: missing } })
      .then((map) => setPreviews((prev) => ({ ...prev, ...map })))
      .catch(() => undefined);
  }, [messages, previews, signFn]);

  const ask = useMutation({
    mutationFn: async () => {
      const text = input.trim();
      setInput("");
      const attachments = pending;
      setPending([]);
      return sendFn({ data: { threadId, model: activeModel, text, attachments } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      textRef.current?.focus();
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Chat failed"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["chat-thread", threadId] }),
  });

  const upload = async (files: FileList) => {
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    for (const file of Array.from(files).slice(0, 6)) {
      const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("chat-uploads").upload(path, file);
      if (upErr) {
        setError(upErr.message);
        return;
      }
      setPending((p) => [...p, { path, mime: file.type || "application/octet-stream", name: file.name }]);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-[color:var(--brand-navy)]">
            {thread.data?.thread.title ?? "Chat"}
          </p>
          {active?.use_cases && <p className="truncate text-xs text-muted-foreground">{active.use_cases}</p>}
        </div>
        <select
          value={activeModel}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {options.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </select>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-5 py-6">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ask anything — tokens are billed to your plan and this conversation is saved.
            </p>
          )}
          {messages.map((m) => {
            const atts = (m.attachments ?? []) as Attachment[];
            return (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user" ? "max-w-[85%] space-y-2" : "w-full space-y-2"}>
                  {atts.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {atts.map((a) => (
                        <AttachmentPreview key={a.path} att={a} url={previews[a.path]} />
                      ))}
                    </div>
                  )}
                  {m.role === "user" ? (
                    m.content && (
                      <p className="whitespace-pre-wrap rounded-2xl bg-gradient-brand px-4 py-3 text-sm text-primary-foreground">
                        {m.content}
                      </p>
                    )
                  ) : (
                    <Markdown>{m.content}</Markdown>
                  )}
                </div>
              </div>
            );
          })}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border bg-card px-5 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pending.map((a) => (
                <span
                  key={a.path}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs"
                >
                  {a.name}
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    onClick={() => setPending((p) => p.filter((x) => x.path !== a.path))}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() && pending.length === 0) return;
              setError(null);
              ask.mutate();
            }}
          >
            {acceptsFiles && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept={acceptFor(active?.inputs ?? [])}
                  className="hidden"
                  onChange={(e) => e.target.files && upload(e.target.files)}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="size-4" />
                </Button>
              </>
            )}
            <Textarea
              ref={textRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() || pending.length) {
                    setError(null);
                    ask.mutate();
                  }
                }
              }}
              placeholder={acceptsFiles ? "Message or attach a file…" : "Write a message…"}
            />
            <Button type="submit" size="icon" disabled={ask.isPending}>
              <Send className="size-4" />
            </Button>
          </form>
          {active && (
            <p className="text-xs text-muted-foreground">
              Accepts: {(active.inputs ?? ["text"]).join(", ")} · Replies with:{" "}
              {(active.outputs ?? ["text"]).join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentPreview({ att, url }: { att: Attachment; url?: string }) {
  const kind = modalityForMime(att.mime);
  if (!url) return <span className="rounded-lg border border-border px-3 py-1 text-xs">{att.name}</span>;
  if (kind === "image")
    return <img src={url} alt={att.name} className="max-h-48 rounded-xl border border-border" />;
  if (kind === "audio") return <audio src={url} controls className="max-w-full" />;
  if (kind === "video") return <video src={url} controls className="max-h-56 rounded-xl border border-border" />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-1 text-xs underline">
      {att.name}
    </a>
  );
}
