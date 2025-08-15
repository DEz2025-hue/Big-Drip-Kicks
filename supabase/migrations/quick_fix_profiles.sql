-- Quick fix for infinite recursion in profiles table RLS policies
-- This only removes the problematic admin policy that causes circular references

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Drop ONLY the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Show final policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';
