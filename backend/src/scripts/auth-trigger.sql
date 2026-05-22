-- 1. Create the function that handles the new user insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert the verified user into the public."User" table
  INSERT INTO public."User" (id, email, "updatedAt")
  VALUES (
    new.id, 
    new.email,
    now()
  );
  
  RETURN NEW;
END;
$$;

-- 2. Create the trigger on the auth.users table
-- This triggers automatically when Supabase successfully creates the verified user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
