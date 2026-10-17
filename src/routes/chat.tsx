import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { deleteThread, listThreads } from "@/lib/chat-threads.functions";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Menu, MessageSquarePlus, Trash2, X } from "lucide-react";
import logoAsset from "@/assets/rancod-logo.png.asset.json";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat with AI models — rancod.ai" },
      {
        name: "description",
        content:
          "Try built-in and community AI models on rancod.ai: chat, code, analyze images and generate images or video. Your first answer is free, no sign-up.",
      },
      { property: "og:title", content: "rancod.ai chat" },
      { property: "og:description", content: "Chat, code, and generate media with community-hosted AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const params = useParams({ strict: false }) as { threadId?: string };

  const listFn = useServerFn(listThreads);
  const threads = useQuery({ queryKey: ["chat-threads"], queryFn: () => listFn(), enabled: !!session });
  const deleteFn = useServerFn(deleteThread);

  const remove = useMutation({
    mutationFn: (threadId: string) => deleteFn({ data: { threadId } }),
    onSuccess: (_r, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      if (params.threadId === threadId) navigate({ to: "/chat" });
    },
  });

  const list = (
    <div className="flex h-full flex-col gap-3 p-4">
      <Link to="/" className="flex items-center gap-2 font-display text-sm font-semibold text-[color:var(--brand-navy)]">
        <img src={logoAsset.url} alt="" className="size-6" /> rancod.ai
      </Link>
      <Button asChild className="w-full">
        <Link to="/chat" onClick={() => setOpen(false)}>
          <MessageSquarePlus className="mr-2 size-4" /> New chat
        </Link>
      </Button>
      <div className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
        {session ? (
          <>
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
          </>
        ) : (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Sign in to save your conversations and keep chatting.
          </p>
        )}
      </div>
      {session ? (
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      ) : (
        <Link to="/auth" search={{ mode: "signin" }} className="text-xs font-medium text-primary">
          Sign in / Register
        </Link>
      )}
    </div>
  );

  return (
    <main className="flex h-screen bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-card md:block">{list}</aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-border bg-card shadow-xl">
            <button type="button" aria-label="Close menu" className="absolute right-3 top-3" onClick={() => setOpen(false)}>
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
