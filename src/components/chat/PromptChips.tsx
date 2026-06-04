import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Sparkles, 
  TrendingUp, 
  Pill, 
  FlaskConical, 
  Calendar
} from 'lucide-react';

interface PromptChipsProps {
  onSelect: (prompt: string) => void;
  variant?: 'default' | 'compact';
}

const prompts = [
  {
    text: "Summarize my last 12 months of key medical events.",
    icon: Calendar,
  },
  {
    text: "Show my cholesterol trend in the last 3 years.",
    icon: TrendingUp,
  },
  {
    text: "What medications and supplements am I currently taking?",
    icon: Pill,
  },
  {
    text: "What changed in my bloodwork since starting my medication?",
    icon: FlaskConical,
  },
  {
    text: "List my diagnostic tests in the last 2 years.",
    icon: Sparkles,
  },
];

export const PromptChips: React.FC<PromptChipsProps> = ({ 
  onSelect, 
  variant = 'default' 
}) => {
  const displayPrompts = variant === 'compact' ? prompts.slice(0, 3) : prompts;
  
  return (
    <div className={`flex flex-wrap gap-2 ${variant === 'compact' ? 'justify-center' : ''}`}>
      {displayPrompts.map((prompt, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <Button
              variant="chip"
              size="chip"
              onClick={() => onSelect(prompt.text)}
              className="animate-fade-in group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <prompt.icon className="w-3.5 h-3.5 mr-1.5 text-accent-foreground/70 group-hover:text-accent-foreground transition-colors" />
              <span className="truncate max-w-[200px]">
                {variant === 'compact' 
                  ? prompt.text.split(' ').slice(0, 4).join(' ') + '...'
                  : prompt.text
                }
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p>{prompt.text}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};
