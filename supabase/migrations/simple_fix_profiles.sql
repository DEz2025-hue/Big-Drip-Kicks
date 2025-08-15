-- Simple fix for infinite recursion in profiles table RLS policies
-- This removes the problematic admin policy that causes circular references

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Drop existing policies and recreate them to ensure they're correct
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create simple policies without circular references
-- Users can read their own profile
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

-- Note: We're temporarily removing the admin policy to fix the infinite recursion
-- Admin functionality can be handled at the application level instead

-- Verify the final policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';
