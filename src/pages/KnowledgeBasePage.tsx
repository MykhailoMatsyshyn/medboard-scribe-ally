import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { KnowledgeBaseManager } from '@/components/settings/KnowledgeBaseManager';

const KnowledgeBasePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  const handleBack = () => navigate(-1);

  if (loading) {
    return (
      <AppShell title="Knowledge Base" showBack onBack={handleBack} backTooltip="Go back to chat">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Knowledge Base" showBack onBack={handleBack} backTooltip="Go back to chat">
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Upload and manage the documents the AI uses to answer your questions.
          </p>
        </div>

        <KnowledgeBaseManager />

        <div className="pt-4">
          <Button variant="outline" onClick={handleBack} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default KnowledgeBasePage;
