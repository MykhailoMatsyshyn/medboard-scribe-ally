import React, { useState } from 'react';
import { ChevronDown, FileText, TestTube, Stethoscope, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Source {
  id: string;
  type: 'test' | 'visit' | 'document';
  title: string;
  date: string;
  snippet?: string;
}

interface SourcesAccordionProps {
  sources: Source[];
  onSourceClick?: (source: Source) => void;
}

const getIcon = (type: Source['type']) => {
  switch (type) {
    case 'test':
      return TestTube;
    case 'visit':
      return Stethoscope;
    default:
      return FileText;
  }
};

export const SourcesAccordion: React.FC<SourcesAccordionProps> = ({ 
  sources,
  onSourceClick 
}) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
      >
        <span className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          View Sources ({sources.length})
        </span>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>
      
      <div 
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[500px]" : "max-h-0"
        )}
      >
        <div className="border-t border-border divide-y divide-border">
          {sources.map((source, index) => {
            const Icon = getIcon(source.type);
            return (
              <button
                key={source.id}
                onClick={() => onSourceClick?.(source)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-accent/30 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {source.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {source.date}
                  </p>
                  {source.snippet && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {source.snippet}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
