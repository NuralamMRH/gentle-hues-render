import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/chat-threads.functions";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import logoAsset from "@/assets/rancod-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createThread);

  const start = useMutation({
    mutationFn: () => createFn({ data: {} }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: row.id } });
    },
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <img src={logo} alt="rancod.ai" className="size-14" />
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold text-[color:var(--brand-navy)]">
          Start a conversation
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Pick a built-in model or any approved community AI. Conversations are saved to your account, and
          models that support it can take images, audio, video and files.
        </p>
      </div>
      <Button onClick={() => start.mutate()} disabled={start.isPending}>
        <MessageSquarePlus className="mr-2 size-4" /> New chat
      </Button>
    </div>
  );
}
