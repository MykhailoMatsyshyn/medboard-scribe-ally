-- Create user_settings table for personalized AI search settings
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- AI Search Settings
  response_length TEXT NOT NULL DEFAULT 'balanced' CHECK (response_length IN ('concise', 'balanced', 'detailed')),
  search_depth TEXT NOT NULL DEFAULT 'standard' CHECK (search_depth IN ('quick', 'standard', 'thorough')),
  creativity_level INTEGER NOT NULL DEFAULT 50 CHECK (creativity_level >= 0 AND creativity_level <= 100),
  auto_suggestions BOOLEAN NOT NULL DEFAULT true,
  preferred_persona TEXT DEFAULT NULL,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();