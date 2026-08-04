import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listPublicListings } from "@/lib/listings.functions";
import { chatWithModel } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat with community AI — rancod.ai" },
      {
        name: "description",
        content: "Chat with any approved community-hosted model on rancod.ai. Every message is metered against your token plan.",
      },
      { property: "og:title", content: "rancod.ai chat" },
      { property: "og:description", content: "Talk to community-hosted AI models and track your token spend live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function ChatPage() {
  const models = useQuery({ queryKey: ["public-listings"], queryFn: useServerFn(listPublicListings) });
  const send = useServerFn(chatWithModel);

  const [model, setModel] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeModel = model || models.data?.[0]?.slug || "";

  const ask = useMutation({
    mutationFn: async (text: string) => {
      const history = [...messages, { role: "user" as const, content: text }];
      setMessages(history);
      return send({ data: { model: activeModel, messages: history } });
    },
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", content: res.reply }]),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Chat failed"),
  });

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="font-display text-sm font-semibold text-[color:var(--brand-navy)]">
            ← Dashboard
          </Link>
          <select
            value={activeModel}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {(models.data ?? []).map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {(models.data ?? []).length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">No models online yet</CardTitle>
              <CardDescription>
                Community providers are still coming online. Check back shortly, or host your own model.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/provider" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                Become a provider →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="min-h-[45vh] space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">Ask anything — tokens are billed to your plan.</p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-gradient-brand text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {ask.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <form
              className="flex items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim()) return;
                setError(null);
                const text = input.trim();
                setInput("");
                ask.mutate(text);
              }}
            >
              <Textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write a message…"
              />
              <Button type="submit" disabled={ask.isPending}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
