-- Simple fix for profiles table - Run this first
-- Step 1: Check if profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
);

-- Step 2: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'staff', 'cashier')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create basic RLS policy (temporarily allow all access for debugging)
DROP POLICY IF EXISTS "Allow all authenticated users" ON profiles;
CREATE POLICY "Allow all authenticated users" ON profiles
  FOR ALL TO authenticated
  USING (true);

-- Step 5: Check what users exist
SELECT id, email FROM auth.users WHERE email IN ('jack@bigdrip.com', 'staff@bigdrip.com', 'cashier@bigdrip.com');

-- Step 6: Insert demo accounts one by one
INSERT INTO profiles (id, email, full_name, role) 
SELECT id, email, 'Jack Samukai', 'admin'
FROM auth.users 
WHERE email = 'jack@bigdrip.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, role) 
SELECT id, email, 'Staff Member', 'staff'
FROM auth.users 
WHERE email = 'staff@bigdrip.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, role) 
SELECT id, email, 'Cashier', 'cashier'
FROM auth.users 
WHERE email = 'cashier@bigdrip.com'
ON CONFLICT (id) DO NOTHING;

-- Step 7: Verify the results
SELECT * FROM profiles;
