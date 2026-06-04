import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserDropdown } from '@/components/layout/UserDropdown';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';
import { ChatHistorySidebar } from '@/components/chat/ChatHistorySidebar';
import { Send, Loader2, History, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  preview: string;
  messages: Message[];
}

const initialMessage: Message = {
  id: '1',
  role: 'assistant',
  content:
    "Hi! Ask me anything. I'll answer in formatted markdown (with tables when useful). If you've uploaded files to your knowledge base in **Account → Profile**, I'll use them to ground my answers.",
};

const makeSession = (): ChatSession => ({
  id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: 'New chat',
  date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  preview: 'No messages yet',
  messages: [initialMessage],
});

const ChatView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [inputValue, setInputValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const initialSession = makeSession();
  const [sessions, setSessions] = useState<ChatSession[]>([initialSession]);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSession.id);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const messages = activeSession?.messages ?? [initialMessage];

  useEffect(() => {
    const initialPrompt = location.state?.initialPrompt;
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const updateActiveSession = (updater: (s: ChatSession) => ChatSession) => {
    setSessions((prev) => prev.map((s) => (s.id === activeSessionId ? updater(s) : s)));
  };

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    updateActiveSession((s) => ({
      ...s,
      messages: nextMessages,
      title: s.title === 'New chat' ? trimmed.slice(0, 40) : s.title,
      preview: trimmed.slice(0, 60),
    }));
    setInputValue('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const reply: string = data?.reply ?? '';
      updateActiveSession((s) => ({
        ...s,
        messages: [
          ...s.messages,
          { id: (Date.now() + 1).toString(), role: 'assistant', content: reply },
        ],
      }));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to get a response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const s = makeSession();
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(s.id);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-subtle">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const sidebarSessions = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    date: s.date,
    preview: s.preview,
    isActive: s.id === activeSessionId,
  }));

  return (
    <AppShell
      title="AI Assistant"
      showBack
      onBack={() => navigate('/')}
      sidebar={
        <ChatHistorySidebar
          isOpen={historyOpen}
          onToggle={() => setHistoryOpen(!historyOpen)}
          sessions={sidebarSessions}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          footer={<UserDropdown variant="sidebar" />}
        />
      }
      sidebarOpen={historyOpen}
      onToggleSidebar={() => setHistoryOpen(!historyOpen)}
    >
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
        <div className="px-3 py-1.5 border-b border-border flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="h-7 w-7 flex-shrink-0"
            title={historyOpen ? 'Hide chat history' : 'Show chat history'}
          >
            <History className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} role={message.role}>
              {message.role === 'assistant' ? (
                <MarkdownMessage content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              )}
            </ChatBubble>
          ))}
          {isLoading && (
            <ChatBubble role="assistant">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Thinking…
              </div>
            </ChatBubble>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              rows={1}
              className="resize-none min-h-[44px] max-h-40"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              size="icon"
              className="h-11 w-11 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            AI may be inaccurate. Verify important information independently.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default ChatView;
