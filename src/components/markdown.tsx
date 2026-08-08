import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders assistant markdown (headings, lists, tables, code) as real formatting. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="font-display text-xl font-semibold" {...p} />,
          h2: (p) => <h2 className="font-display text-lg font-semibold" {...p} />,
          h3: (p) => <h3 className="font-display text-base font-semibold" {...p} />,
          p: (p) => <p className="whitespace-pre-wrap" {...p} />,
          ul: (p) => <ul className="list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-1 pl-5" {...p} />,
          li: (p) => <li className="marker:text-muted-foreground" {...p} />,
          strong: (p) => <strong className="font-semibold text-[color:var(--brand-navy)]" {...p} />,
          a: (p) => <a className="text-primary underline underline-offset-4" target="_blank" rel="noreferrer" {...p} />,
          blockquote: (p) => (
            <blockquote className="border-l-2 border-border pl-4 text-muted-foreground" {...p} />
          ),
          hr: () => <hr className="border-border" />,
          code: ({ className, children, ...rest }) =>
            className?.includes("language-") ? (
              <code className="block overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs" {...rest}>
                {children}
              </code>
            ) : (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]" {...rest}>
                {children}
              </code>
            ),
          pre: (p) => <pre className="overflow-x-auto" {...p} />,
          table: (p) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs" {...p} />
            </div>
          ),
          th: (p) => <th className="border border-border bg-muted px-3 py-2 font-semibold" {...p} />,
          td: (p) => <td className="border border-border px-3 py-2" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
