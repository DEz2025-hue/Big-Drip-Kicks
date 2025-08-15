-- Fix for infinite recursion in profiles table RLS policies
-- The issue is that the "Admins can manage all profiles" policy creates a circular reference

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Recreate the policies without circular references
-- Users can read their own profile (simple check)
CREATE POLICY "Users can read own profile" ON profiles 
FOR SELECT TO authenticated 
USING (auth.uid() = id);

-- Users can create their own profile
CREATE POLICY "Users can create own profile" ON profiles 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- For admin access, we'll use a different approach
-- Create a function to check if user is admin without circular reference
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Use a direct query without RLS to avoid circular reference
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create admin policy using the function
CREATE POLICY "Admins can manage all profiles" ON profiles 
FOR ALL TO authenticated 
USING (is_admin(auth.uid()));

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';
