-- Add missing INSERT policy on profiles so users can create their own profile
-- (also needed for the trigger to work correctly with RLS)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add missing DELETE policy on profiles
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure authenticated users can insert their own settings
-- (user_settings policies already exist but verify the table setup is complete)
ALTER TABLE public.user_settings
  ALTER COLUMN enhance_prompt_template SET DEFAULT 'Rewrite the following user question to be clearer, more specific, and well-structured for an AI medical assistant. Preserve the original intent and language. Return only the improved question with no preamble.';