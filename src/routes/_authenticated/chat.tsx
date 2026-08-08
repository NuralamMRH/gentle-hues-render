import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createThread, deleteThread, listThreads } from "@/lib/chat-threads.functions";
import { Button } from "@/components/ui/button";
import { Menu, MessageSquarePlus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat with community AI — rancod.ai" },
      {
        name: "description",
        content:
          "Chat with any approved community-hosted model on rancod.ai. History is saved, files can be attached, and every message is metered against your token plan.",
      },
      { property: "og:title", content: "rancod.ai chat" },
      { property: "og:description", content: "Talk to community-hosted AI models and keep every conversation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const params = useParams({ strict: false }) as { threadId?: string };

  const threads = useQuery({ queryKey: ["chat-threads"], queryFn: useServerFn(listThreads) });
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);

  const newChat = useMutation({
    mutationFn: () => createFn({ data: {} }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      setOpen(false);
      navigate({ to: "/chat/$threadId", params: { threadId: row.id } });
    },
  });

  const remove = useMutation({
    mutationFn: (threadId: string) => deleteFn({ data: { threadId } }),
    onSuccess: (_r, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      if (params.threadId === threadId) navigate({ to: "/chat" });
    },
  });

  const list = (
    <div className="flex h-full flex-col gap-3 p-4">
      <Link to="/dashboard" className="font-display text-sm font-semibold text-[color:var(--brand-navy)]">
        ← Dashboard
      </Link>
      <Button className="w-full" onClick={() => newChat.mutate()} disabled={newChat.isPending}>
        <MessageSquarePlus className="mr-2 size-4" /> New chat
      </Button>
      <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
        {(threads.data ?? []).map((t) => (
          <div
            key={t.id}
            className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm ${
              params.threadId === t.id ? "bg-muted font-medium" : "hover:bg-muted/60"
            }`}
          >
            <Link
              to="/chat/$threadId"
              params={{ threadId: t.id }}
              onClick={() => setOpen(false)}
              className="min-w-0 flex-1 truncate text-left"
            >
              {t.title}
            </Link>
            <button
              type="button"
              aria-label="Delete conversation"
              onClick={() => remove.mutate(t.id)}
              className="opacity-0 transition group-hover:opacity-100"
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
        {threads.data?.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted-foreground">No conversations yet.</p>
        )}
      </div>
    </div>
  );

  return (
    <main className="flex h-screen bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-card md:block">{list}</aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-border bg-card shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute right-3 top-3"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
            {list}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 md:hidden">
          <button type="button" aria-label="Open conversations" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <span className="font-display text-sm font-semibold">rancod.ai chat</span>
        </div>
        <Outlet />
      </div>
    </main>
  );
}
