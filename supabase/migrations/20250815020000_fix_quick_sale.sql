/*
  # Fix Quick Sale Functionality and RLS Policies
  
  This migration fixes the infinite recursion issue in RLS policies
  and ensures all Quick Sale functionality works properly.
*/

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Drop and recreate all policies to ensure they're correct
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

-- Ensure all other tables have proper policies
-- Categories policies
DROP POLICY IF EXISTS "Everyone can read categories" ON categories;
DROP POLICY IF EXISTS "Admin and staff can manage categories" ON categories;

CREATE POLICY "Everyone can read categories" ON categories 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Admin and staff can manage categories" ON categories 
FOR ALL TO authenticated 
USING (is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'
));

-- Brands policies
DROP POLICY IF EXISTS "Everyone can read brands" ON brands;
DROP POLICY IF EXISTS "Admin and staff can manage brands" ON brands;

CREATE POLICY "Everyone can read brands" ON brands 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Admin and staff can manage brands" ON brands 
FOR ALL TO authenticated 
USING (is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'
));

-- Products policies
DROP POLICY IF EXISTS "Everyone can read products" ON products;
DROP POLICY IF EXISTS "Admin and staff can manage products" ON products;

CREATE POLICY "Everyone can read products" ON products 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Admin and staff can manage products" ON products 
FOR ALL TO authenticated 
USING (is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'
));

-- Customers policies
DROP POLICY IF EXISTS "Everyone can read customers" ON customers;
DROP POLICY IF EXISTS "Everyone can create customers" ON customers;
DROP POLICY IF EXISTS "Admin and staff can manage customers" ON customers;

CREATE POLICY "Everyone can read customers" ON customers 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Everyone can create customers" ON customers 
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admin and staff can manage customers" ON customers 
FOR ALL TO authenticated 
USING (is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'
));

-- Sales policies
DROP POLICY IF EXISTS "Everyone can read sales" ON sales;
DROP POLICY IF EXISTS "Everyone can create sales" ON sales;
DROP POLICY IF EXISTS "Admin and staff can manage sales" ON sales;

CREATE POLICY "Everyone can read sales" ON sales 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Everyone can create sales" ON sales 
FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admin and staff can manage sales" ON sales 
FOR ALL TO authenticated 
USING (is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'
));

-- Sale items policies
DROP POLICY IF EXISTS "Everyone can read sale items" ON sale_items;
DROP POLICY IF EXISTS "Everyone can create sale items" ON sale_items;

CREATE POLICY "Everyone can read sale items" ON sale_items 
FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Everyone can create sale items" ON sale_items 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Expenses policies
DROP POLICY IF EXISTS "Admin and staff can read expenses" ON expenses;
DROP POLICY IF EXISTS "Admin and staff can create expenses" ON expenses;

CREATE POLICY "Admin and staff can read expenses" ON expenses 
FOR SELECT TO authenticated 
USING (is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'
));

CREATE POLICY "Admin and staff can create expenses" ON expenses 
FOR INSERT TO authenticated 
WITH CHECK (is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'
));

-- Low stock alerts policies
DROP POLICY IF EXISTS "Admin and staff can read alerts" ON low_stock_alerts;
DROP POLICY IF EXISTS "System can manage alerts" ON low_stock_alerts;

CREATE POLICY "Admin and staff can read alerts" ON low_stock_alerts 
FOR SELECT TO authenticated 
USING (is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'
));

CREATE POLICY "System can manage alerts" ON low_stock_alerts 
FOR ALL TO authenticated 
USING (true);

-- Audit logs policies
DROP POLICY IF EXISTS "Admin can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;

CREATE POLICY "Admin can read audit logs" ON audit_logs 
FOR SELECT TO authenticated 
USING (is_admin(auth.uid()));

CREATE POLICY "System can create audit logs" ON audit_logs 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Verify the final policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Test the is_admin function
SELECT is_admin(auth.uid()) as current_user_is_admin;
