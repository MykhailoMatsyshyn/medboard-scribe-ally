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

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! Ask me anything. I'll answer in formatted markdown (with tables when useful). If you've uploaded files to your knowledge base, I'll use them to ground my answers.",
};

const ChatView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [inputValue, setInputValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);

  // Load conversation list on mount
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([WELCOME_MESSAGE]);
      return;
    }
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle initial prompt passed via navigation state
  useEffect(() => {
    const initialPrompt = location.state?.initialPrompt;
    if (initialPrompt && !isLoadingConversations) {
      handleSendMessage(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingConversations]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('loadConversations error', error);
    } else if (data) {
      setConversations(data as Conversation[]);
      if (data.length > 0) setActiveConversationId(data[0].id);
    }
    setIsLoadingConversations(false);
  };

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('loadMessages error', error);
      setMessages([WELCOME_MESSAGE]);
    } else {
      setMessages(data && data.length > 0 ? (data as Message[]) : [WELCOME_MESSAGE]);
    }
    setIsLoadingMessages(false);
  };

  const createConversation = async (title: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user!.id, title })
      .select('id, title, created_at, updated_at')
      .single();

    if (error || !data) {
      console.error('createConversation error', error);
      return null;
    }
    setConversations((prev) => [data as Conversation, ...prev]);
    return data.id;
  };

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInputValue('');
    setIsLoading(true);

    try {
      // Create a conversation if none is active yet
      let convId = activeConversationId;
      if (!convId) {
        convId = await createConversation(trimmed.slice(0, 50));
        if (!convId) throw new Error('Failed to create conversation');
        setActiveConversationId(convId);
      }

      // Persist user message
      const { data: userMsgData, error: userMsgError } = await supabase
        .from('messages')
        .insert({ conversation_id: convId, user_id: user!.id, role: 'user', content: trimmed })
        .select('id, role, content')
        .single();
      if (userMsgError) throw userMsgError;

      const userMessage = userMsgData as Message;
      const nextMessages = [...messages.filter((m) => m.id !== 'welcome'), userMessage];
      setMessages(nextMessages);

      // Update conversation title on first real message
      const conv = conversations.find((c) => c.id === convId);
      if (conv && conv.title === 'New chat') {
        const newTitle = trimmed.slice(0, 50);
        await supabase.from('conversations').update({ title: newTitle }).eq('id', convId);
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
        );
      }

      // Call chat edge function
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

      // Persist assistant reply
      const { data: asstMsgData, error: asstMsgError } = await supabase
        .from('messages')
        .insert({ conversation_id: convId, user_id: user!.id, role: 'assistant', content: reply })
        .select('id, role, content')
        .single();
      if (asstMsgError) throw asstMsgError;

      setMessages((prev) => [...prev, asstMsgData as Message]);

      // Bump conversation to top of sidebar
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c
          )
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      );
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to get a response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    const convId = await createConversation('New chat');
    if (convId) setActiveConversationId(convId);
  };

  const handleSelectSession = (id: string) => {
    if (id !== activeConversationId) setActiveConversationId(id);
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;

    // Messages cascade-delete via the conversation_id foreign key.
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    if (error) {
      console.error('deleteConversation error', error);
      toast.error('Failed to delete conversation');
      return;
    }

    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (id === activeConversationId) {
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
    toast.success('Conversation deleted');
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

  const sidebarSessions = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    date: new Date(c.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    preview: '',
    isActive: c.id === activeConversationId,
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
          onDeleteSession={handleDeleteSession}
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
          {isLoadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            messages.map((message) => (
              <ChatBubble key={message.id} role={message.role}>
                {message.role === 'assistant' ? (
                  <MarkdownMessage content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                )}
              </ChatBubble>
            ))
          )}
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
