-- Drop the insecure public policy that exposes all user data
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create a secure policy that only allows users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);