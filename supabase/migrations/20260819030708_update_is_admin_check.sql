/*
# Update is_admin() to check profiles table

Previously is_admin() only checked JWT app_metadata.role, but new users
signing up via the frontend don't get app_metadata set (only the trigger
sets it in profiles). Now checks profiles table as fallback.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
