import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { builtInOptions } from "@/hooks/use-model-options";
import { TASKS, type TaskId } from "@/lib/model-tasks";
import { TASK_ICONS, coerceTask } from "./composer";

/** Home page prompt box: pick model + task, then continue in the chat page. */
export function HeroPrompt() {
  const navigate = useNavigate();
  const [model, setModel] = useState(builtInOptions[0].slug);
  const [task, setTask] = useState<TaskId>("chat");
  const [text, setText] = useState("");
  const active = builtInOptions.find((o) => o.slug === model);
  const t = coerceTask(active, task);

  const go = () => {
    if (!text.trim()) return;
    navigate({ to: "/chat", search: { q: text.trim(), model, task: t } });
  };

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-card p-3 text-left shadow-brand">
      <div className="flex flex-wrap gap-1.5 px-1 pb-2">
        {(active?.tasks ?? ["chat"]).map((id) => {
          const Icon = TASK_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTask(id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                id === t ? "border-transparent bg-gradient-brand text-primary-foreground" : "border-border text-foreground"
              }`}
            >
              <Icon className="size-3.5" /> {TASKS[id].label}
            </button>
          );
        })}
      </div>
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            go();
          }
        }}
        placeholder={TASKS[t].placeholder}
        className="block w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between gap-2 pt-1">
        <select
          aria-label="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="max-w-[16rem] rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        >
          {builtInOptions.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={go}
          aria-label="Send prompt"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand"
        >
          Ask <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
