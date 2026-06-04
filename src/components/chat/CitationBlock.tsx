import React from 'react';
import { Quote, FileText } from 'lucide-react';
import { RagCitation } from '@/data/ragDemo';

interface Props {
  citations: RagCitation[];
  onCitationClick?: (fileId: string) => void;
}

/**
 * Displays inline citations with a direct quoted excerpt from each source.
 * Visually distinct from generated text via a colored left border + quote icon.
 */
export const CitationBlock: React.FC<Props> = ({ citations, onCitationClick }) => {
  if (!citations.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {citations.map((c, i) => (
        <div
          key={i}
          className="border-l-2 border-primary/70 bg-primary/5 rounded-r-md pl-3 pr-3 py-2"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary mb-1">
            <Quote className="w-3 h-3" />
            <button
              type="button"
              onClick={() => onCitationClick?.(c.fileId)}
              className="hover:underline inline-flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              {c.fileName}
              {c.page && <span className="text-muted-foreground">· p.{c.page}</span>}
            </button>
          </div>
          <p className="text-xs italic text-foreground/85 leading-relaxed">"{c.excerpt}"</p>
        </div>
      ))}
    </div>
  );
};

/** Inline citation pill used within markdown-like text */
export const InlineCitation: React.FC<{ label: string; onClick?: () => void }> = ({
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors align-baseline"
  >
    [{label}]
  </button>
);
