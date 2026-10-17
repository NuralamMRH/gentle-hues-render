import { Markdown } from "@/components/markdown";
import { modalityForMime } from "@/lib/chat-types";

export type ViewAttachment = { key: string; mime: string; name: string; url?: string };

/** One chat bubble: user prompts right-aligned, AI replies as markdown with media previews. */
export function MessageView({
  role,
  content,
  attachments = [],
}: {
  role: string;
  content: string;
  attachments?: ViewAttachment[];
}) {
  const mine = role === "user";
  return (
    <div className={mine ? "flex justify-end" : ""}>
      <div className={mine ? "max-w-[85%] space-y-2" : "w-full space-y-2"}>
        {attachments.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${mine ? "justify-end" : ""}`}>
            {attachments.map((a) => (
              <MediaPreview key={a.key} att={a} large={!mine} />
            ))}
          </div>
        )}
        {mine ? (
          content && (
            <p className="whitespace-pre-wrap rounded-2xl bg-gradient-brand px-4 py-3 text-sm text-primary-foreground">
              {content}
            </p>
          )
        ) : (
          <Markdown>{content}</Markdown>
        )}
      </div>
    </div>
  );
}

function MediaPreview({ att, large }: { att: ViewAttachment; large?: boolean }) {
  const kind = modalityForMime(att.mime);
  if (!att.url) return <span className="rounded-lg border border-border px-3 py-1 text-xs">{att.name}</span>;
  if (kind === "image")
    return (
      <a href={att.url} target="_blank" rel="noreferrer" download={att.name}>
        <img
          src={att.url}
          alt={att.name}
          className={`${large ? "max-h-[28rem]" : "max-h-48"} rounded-xl border border-border`}
        />
      </a>
    );
  if (kind === "audio") return <audio src={att.url} controls className="max-w-full" />;
  if (kind === "video") return <video src={att.url} controls className="max-h-80 rounded-xl border border-border" />;
  return (
    <a href={att.url} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-1 text-xs underline">
      {att.name}
    </a>
  );
}
