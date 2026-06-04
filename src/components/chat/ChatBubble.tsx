import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  className?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  role, 
  children,
  className 
}) => {
  const isUser = role === 'user';
  
  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up items-start",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-accent text-accent-foreground"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          "min-w-0 rounded-2xl px-4 py-2.5",
          isUser
            ? "max-w-[85%] bg-chat-user rounded-tr-md"
            : "flex-1 bg-chat-assistant rounded-tl-md shadow-soft"
        )}
      >
        <div className="text-sm leading-relaxed text-foreground">
          {children}
        </div>
      </div>
    </div>
  );
};
