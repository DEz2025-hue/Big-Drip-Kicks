-- Fix for profiles table and demo accounts
-- Run this in your Supabase SQL Editor

-- First, let's check if the profiles table exists and has the right structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'staff', 'cashier')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create RLS policies for profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert demo accounts manually
-- First, let's see what users exist in auth.users
SELECT id, email FROM auth.users WHERE email IN ('jack@bigdrip.com', 'staff@bigdrip.com', 'cashier@bigdrip.com');

-- Now insert the demo accounts into profiles
INSERT INTO profiles (id, email, full_name, role) 
SELECT 
  id,
  email,
  CASE 
    WHEN email = 'jack@bigdrip.com' THEN 'Jack Samukai'
    WHEN email = 'staff@bigdrip.com' THEN 'Staff Member'
    WHEN email = 'cashier@bigdrip.com' THEN 'Cashier'
    ELSE 'Unknown User'
  END as full_name,
  CASE 
    WHEN email = 'jack@bigdrip.com' THEN 'admin'
    WHEN email = 'staff@bigdrip.com' THEN 'staff'
    WHEN email = 'cashier@bigdrip.com' THEN 'cashier'
    ELSE 'cashier'
  END as role
FROM auth.users 
WHERE email IN ('jack@bigdrip.com', 'staff@bigdrip.com', 'cashier@bigdrip.com')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = now();

-- Verify the profiles were created
SELECT * FROM profiles WHERE email IN ('jack@bigdrip.com', 'staff@bigdrip.com', 'cashier@bigdrip.com');
