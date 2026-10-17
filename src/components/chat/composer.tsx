import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Clapperboard,
  Code2,
  ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  ScanEye,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TASKS, type TaskId } from "@/lib/model-tasks";
import type { ModelOption } from "@/hooks/use-model-options";

export const TASK_ICONS: Record<TaskId, typeof MessageSquare> = {
  chat: MessageSquare,
  code: Code2,
  vision: ScanEye,
  image: ImageIcon,
  video: Clapperboard,
  audio: AudioLines,
};

type Props = {
  options: ModelOption[];
  model: string;
  onModel: (slug: string) => void;
  task: TaskId;
  onTask: (t: TaskId) => void;
  busy?: boolean;
  /** Return true to clear the composer. */
  onSubmit: (text: string, files: File[]) => boolean | Promise<boolean>;
  initialText?: string;
  autoFocus?: boolean;
};

type Suggestion = { key: string; label: string; sub: string; apply: () => void };

/** Prompt box: task chips, drag-and-drop images, `/task` and `#model` shortcuts. */
export function Composer({ options, model, onModel, task, onTask, busy, onSubmit, initialText = "", autoFocus }: Props) {
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [hi, setHi] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = options.find((o) => o.slug === model);
  const tasks = active?.tasks ?? ["chat"];
  const acceptsFiles = (active?.inputs ?? []).some((m) => m !== "text") || ["vision", "video", "image"].includes(task);

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const trigger = /(?:^|\s)([/#])([\w.-]*)$/.exec(text);
  const replaceTrigger = () => {
    if (!trigger) return text;
    return text.slice(0, text.length - trigger[1].length - trigger[2].length);
  };

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!trigger) return [];
    const q = trigger[2].toLowerCase();
    if (trigger[1] === "/") {
      return tasks
        .filter((t) => t.startsWith(q) || TASKS[t].label.toLowerCase().includes(q))
        .map((t) => ({
          key: t,
          label: `/${t}`,
          sub: TASKS[t].label,
          apply: () => {
            onTask(t);
            setText(replaceTrigger());
          },
        }));
    }
    return options
      .filter((o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q))
      .slice(0, 8)
      .map((o) => ({
        key: o.slug,
        label: `#${o.name.replace(/ \(built-in\)$/, "")}`,
        sub: o.tasks.map((t) => TASKS[t].label).join(" · "),
        apply: () => {
          onModel(o.slug);
          setText(replaceTrigger());
        },
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger?.[0], tasks, options]);

  useEffect(() => setHi(0), [suggestions.length]);

  const addFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).slice(0, 6 - files.length);
    if (!arr.length) return;
    if (!acceptsFiles) {
      setHint("This model only takes text. Pick a model or task that accepts images.");
      return;
    }
    setHint(null);
    const start = files.length;
    setFiles((p) => [...p, ...arr.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    // Reference dropped images inside the prompt so the user can write around them.
    const refs = arr
      .map((f, i) => (f.type.startsWith("image/") ? `[image ${start + i + 1}]` : `[${f.name}]`))
      .join(" ");
    const el = textRef.current;
    const pos = el?.selectionStart ?? text.length;
    setText((t) => `${t.slice(0, pos)}${pos && !/\s$/.test(t.slice(0, pos)) ? " " : ""}${refs} ${t.slice(pos)}`);
    if (task === "chat" && arr.some((f) => f.type.startsWith("image/")) && tasks.includes("vision")) onTask("vision");
  };

  const submit = async () => {
    if (busy || (!text.trim() && files.length === 0)) return;
    const ok = await onSubmit(text.trim(), files.map((f) => f.file));
    if (ok) {
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
      setText("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">This model can:</span>
        {tasks.map((t) => {
          const Icon = TASK_ICONS[t];
          const on = t === task;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onTask(t)}
              title={TASKS[t].hint}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                on
                  ? "border-transparent bg-gradient-brand text-primary-foreground shadow-brand"
                  : "border-border bg-card text-foreground hover:border-primary/50"
              }`}
            >
              <Icon className="size-3.5" /> {TASKS[t].label}
            </button>
          );
        })}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-2xl border bg-card shadow-card transition-colors ${
          dragging ? "border-primary ring-2 ring-primary/30" : "border-border"
        }`}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-primary/5 text-sm font-medium text-primary">
            Drop to add to your prompt
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-3 z-20 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
            <p className="border-b border-border px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {trigger?.[1] === "/" ? "Tasks for this model" : "Switch model"}
            </p>
            {suggestions.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  s.apply();
                  textRef.current?.focus();
                }}
                className={`block w-full px-3 py-2 text-left ${i === hi ? "bg-muted" : "hover:bg-muted/60"}`}
              >
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.sub}</span>
              </button>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {files.map((f, i) => (
              <div key={f.url} className="relative">
                {f.file.type.startsWith("image/") ? (
                  <img src={f.url} alt={`image ${i + 1}`} className="size-16 rounded-lg border border-border object-cover" />
                ) : (
                  <span className="flex h-16 max-w-40 items-center truncate rounded-lg border border-border px-3 text-xs">
                    {f.file.name}
                  </span>
                )}
                <span className="absolute bottom-1 left-1 rounded bg-foreground/70 px-1 text-[10px] text-background">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${f.file.name}`}
                  onClick={() => {
                    URL.revokeObjectURL(f.url);
                    setFiles((p) => p.filter((x) => x.url !== f.url));
                  }}
                  className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-card p-0.5"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textRef}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const pasted = Array.from(e.clipboardData.files);
            if (pasted.length) {
              e.preventDefault();
              addFiles(pasted);
            }
          }}
          onKeyDown={(e) => {
            if (suggestions.length) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHi((h) => (h + 1) % suggestions.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHi((h) => (h - 1 + suggestions.length) % suggestions.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                suggestions[hi]?.apply();
                return;
              }
              if (e.key === "Escape") {
                setText((t) => `${t} `);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={`${TASKS[task].placeholder}  ( / for tasks, # for models )`}
          className="block max-h-60 min-h-[60px] w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />

        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,audio/*,video/*,application/pdf,text/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Attach files"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            <select
              value={model}
              onChange={(e) => onModel(e.target.value)}
              aria-label="Model"
              className="min-w-0 max-w-[14rem] truncate rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
            >
              {options.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" size="icon" aria-label="Send" disabled={busy} onClick={() => void submit()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
      {hint && <p className="text-xs text-destructive">{hint}</p>}
    </div>
  );
}

/** Keeps the selected task valid for the active model. */
export function coerceTask(option: ModelOption | undefined, task: TaskId): TaskId {
  const tasks = option?.tasks ?? ["chat"];
  return tasks.includes(task) ? task : tasks[0];
}
