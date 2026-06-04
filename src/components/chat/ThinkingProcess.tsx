import React, { useEffect, useState } from 'react';
import { Database, Search, FileSearch, FileText, Sparkles, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThinkingStep, ThinkingStepKey, defaultThinkingSteps } from '@/data/ragDemo';

const iconFor: Record<ThinkingStepKey, React.ElementType> = {
  pulling_rag: Database,
  searching_records: Search,
  analyzing_documents: FileSearch,
  reviewing_file: FileText,
  compiling: Sparkles,
};

interface Props {
  steps?: ThinkingStep[];
  /** ms between step transitions */
  interval?: number;
  /** Called once all steps have completed */
  onComplete?: () => void;
}

/**
 * Animated, sequential "thinking" indicator shown while RAG is querying.
 * Streams steps one-by-one with a soft fade/slide.
 */
export const ThinkingProcess: React.FC<Props> = ({
  steps = defaultThinkingSteps,
  interval = 700,
  onComplete,
}) => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= steps.length) {
      onComplete?.();
      return;
    }
    const t = setTimeout(() => setActive((i) => i + 1), interval);
    return () => clearTimeout(t);
  }, [active, interval, steps.length, onComplete]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Thinking with your records…</span>
      </div>
      {steps.map((step, idx) => {
        const Icon = iconFor[step.key];
        const isDone = idx < active;
        const isActive = idx === active;
        const isPending = idx > active;
        return (
          <div
            key={step.key}
            className={cn(
              'flex items-center gap-2.5 py-0.5 transition-all duration-300',
              isPending && 'opacity-40',
              isActive && 'animate-fade-in',
            )}
          >
            {isDone ? (
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            ) : isActive ? (
              <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0 animate-pulse" />
            ) : (
              <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
            <span
              className={cn(
                'text-sm leading-tight',
                isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
            {step.detail && isActive && (
              <span className="text-[11px] text-muted-foreground/70 truncate">— {step.detail}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
