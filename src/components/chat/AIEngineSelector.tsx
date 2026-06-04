import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot } from 'lucide-react';

export type AIEngine = 'openai' | 'vertexai' | 'gemini' | 'claude';

interface AIEngineSelectorProps {
  value: AIEngine;
  onChange: (value: AIEngine) => void;
  disabled?: boolean;
}

const engines: { value: AIEngine; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'vertexai', label: 'Vertex AI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude AI' },
];

export const AIEngineSelector: React.FC<AIEngineSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <Select value={value} onValueChange={(val) => onChange(val as AIEngine)} disabled={disabled}>
      <SelectTrigger className="w-auto h-8 px-2 text-xs gap-1 border-muted">
        <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        <SelectValue placeholder="AI" />
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        {engines.map((engine) => (
          <SelectItem key={engine.value} value={engine.value} className="text-xs">
            {engine.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
