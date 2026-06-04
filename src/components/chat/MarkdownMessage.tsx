import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export const MarkdownMessage: React.FC<Props> = ({ content }) => {
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none
      prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-2
      prose-p:my-2 prose-p:leading-relaxed
      prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
      prose-pre:bg-muted prose-pre:text-foreground prose-pre:rounded-lg prose-pre:p-3
      prose-code:before:content-none prose-code:after:content-none
      prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-a:text-primary
      prose-hr:my-4"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-muted/60" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="border-b border-border last:border-0" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-3 py-2 text-left font-semibold text-foreground border-r border-border last:border-r-0 whitespace-nowrap"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="px-3 py-2 align-top text-foreground border-r border-border last:border-r-0"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
