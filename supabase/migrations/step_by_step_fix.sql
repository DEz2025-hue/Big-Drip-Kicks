-- STEP 1: Check if profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
);

-- STEP 2: Create profiles table (run this if step 1 returns false)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'staff', 'cashier')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- STEP 3: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create a simple RLS policy (run this to allow access)
DROP POLICY IF EXISTS "Allow all authenticated users" ON profiles;
CREATE POLICY "Allow all authenticated users" ON profiles
  FOR ALL TO authenticated
  USING (true);

-- STEP 5: Check what users exist in auth.users
SELECT id, email FROM auth.users WHERE email IN ('jack@bigdrip.com', 'staff@bigdrip.com', 'cashier@bigdrip.com');

-- STEP 6: Insert Jack (admin) - run this separately
INSERT INTO profiles (id, email, full_name, role) 
SELECT id, email, 'Jack Samukai', 'admin'
FROM auth.users 
WHERE email = 'jack@bigdrip.com'
ON CONFLICT (id) DO NOTHING;

-- STEP 7: Insert Staff - run this separately
INSERT INTO profiles (id, email, full_name, role) 
SELECT id, email, 'Staff Member', 'staff'
FROM auth.users 
WHERE email = 'staff@bigdrip.com'
ON CONFLICT (id) DO NOTHING;

-- STEP 8: Insert Cashier - run this separately
INSERT INTO profiles (id, email, full_name, role) 
SELECT id, email, 'Cashier', 'cashier'
FROM auth.users 
WHERE email = 'cashier@bigdrip.com'
ON CONFLICT (id) DO NOTHING;

-- STEP 9: Verify all profiles were created
SELECT * FROM profiles;
