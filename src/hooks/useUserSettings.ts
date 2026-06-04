import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserSettings {
  id: string;
  user_id: string;
  response_length: 'concise' | 'balanced' | 'detailed';
  search_depth: 'quick' | 'standard' | 'thorough';
  creativity_level: number;
  auto_suggestions: boolean;
  preferred_persona: string | null;
  enhance_prompt_template: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsUpdate {
  response_length?: 'concise' | 'balanced' | 'detailed';
  search_depth?: 'quick' | 'standard' | 'thorough';
  creativity_level?: number;
  auto_suggestions?: boolean;
  preferred_persona?: string | null;
  enhance_prompt_template?: string;
}

const DEFAULT_ENHANCE_TEMPLATE =
  'Rewrite the following user question to be clearer, more specific, and well-structured for an AI medical assistant. Preserve the original intent and language. Return only the improved question with no preamble.';

const defaultSettings: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  response_length: 'balanced',
  search_depth: 'standard',
  creativity_level: 50,
  auto_suggestions: true,
  preferred_persona: null,
  enhance_prompt_template: DEFAULT_ENHANCE_TEMPLATE,
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings(data as UserSettings);
      } else {
        // Create default settings for the user
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings as UserSettings);
      }
    } catch (err) {
      console.error('Error fetching user settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateSettings = useCallback(async (updates: UserSettingsUpdate) => {
    if (!user || !settings) return { success: false, error: 'No user or settings' };

    try {
      const { data, error: updateError } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSettings(data as UserSettings);
      return { success: true, error: null };
    } catch (err) {
      console.error('Error updating user settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      return { success: false, error: errorMessage };
    }
  }, [user, settings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings: settings ?? { ...defaultSettings, id: '', user_id: '', created_at: '', updated_at: '' } as UserSettings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
};
