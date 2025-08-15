/*
  # Complete Big Drip Inventory System Setup

  1. Database Schema
    - All tables with proper relationships
    - Row Level Security policies
    - Audit triggers for all operations
    - Low stock alert system
    - Automatic sale number generation

  2. Security
    - Role-based access control
    - Comprehensive RLS policies
    - Audit logging for all actions

  3. Business Logic
    - Stock management with automatic updates
    - Low stock threshold monitoring
    - Sales processing with inventory updates
    - Expense tracking for P&L
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'staff', 'cashier')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  barcode text,
  category_id uuid REFERENCES categories(id),
  brand_id uuid REFERENCES brands(id),
  cost_price numeric(10,2) NOT NULL DEFAULT 0,
  selling_price numeric(10,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 10,
  variants jsonb DEFAULT '{}',
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  cashier_id uuid NOT NULL REFERENCES profiles(id),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount_type text CHECK (discount_type IN ('flat', 'percentage')),
  discount_value numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'orange_money', 'mtn_money', 'bank')),
  payment_status text DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  category text NOT NULL,
  recorded_by uuid NOT NULL REFERENCES profiles(id),
  expense_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Create low_stock_alerts table
CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  current_stock integer NOT NULL,
  threshold integer NOT NULL,
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Everyone can read categories" ON categories;
DROP POLICY IF EXISTS "Admin and staff can manage categories" ON categories;
DROP POLICY IF EXISTS "Everyone can read brands" ON brands;
DROP POLICY IF EXISTS "Admin and staff can manage brands" ON brands;
DROP POLICY IF EXISTS "Everyone can read products" ON products;
DROP POLICY IF EXISTS "Admin and staff can manage products" ON products;
DROP POLICY IF EXISTS "Everyone can read customers" ON customers;
DROP POLICY IF EXISTS "Everyone can create customers" ON customers;
DROP POLICY IF EXISTS "Admin and staff can manage customers" ON customers;
DROP POLICY IF EXISTS "Everyone can read sales" ON sales;
DROP POLICY IF EXISTS "Everyone can create sales" ON sales;
DROP POLICY IF EXISTS "Admin and staff can manage sales" ON sales;
DROP POLICY IF EXISTS "Everyone can read sale items" ON sale_items;
DROP POLICY IF EXISTS "Everyone can create sale items" ON sale_items;
DROP POLICY IF EXISTS "Admin and staff can read expenses" ON expenses;
DROP POLICY IF EXISTS "Admin and staff can create expenses" ON expenses;
DROP POLICY IF EXISTS "Admin and staff can read alerts" ON low_stock_alerts;
DROP POLICY IF EXISTS "System can manage alerts" ON low_stock_alerts;
DROP POLICY IF EXISTS "Admin can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for categories
CREATE POLICY "Everyone can read categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and staff can manage categories" ON categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

-- RLS Policies for brands
CREATE POLICY "Everyone can read brands" ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and staff can manage brands" ON brands FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

-- RLS Policies for products
CREATE POLICY "Everyone can read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and staff can manage products" ON products FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

-- RLS Policies for customers
CREATE POLICY "Everyone can read customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Everyone can create customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin and staff can manage customers" ON customers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

-- RLS Policies for sales
CREATE POLICY "Everyone can read sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Everyone can create sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin and staff can manage sales" ON sales FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

-- RLS Policies for sale_items
CREATE POLICY "Everyone can read sale items" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Everyone can create sale items" ON sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for expenses
CREATE POLICY "Admin and staff can read expenses" ON expenses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);
CREATE POLICY "Admin and staff can create expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);

-- RLS Policies for low_stock_alerts
CREATE POLICY "Admin and staff can read alerts" ON low_stock_alerts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
);
CREATE POLICY "System can manage alerts" ON low_stock_alerts FOR ALL TO authenticated USING (true);

-- RLS Policies for audit_logs
CREATE POLICY "Admin can read audit logs" ON audit_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System can create audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Functions for business logic

-- Function to generate sale numbers
CREATE OR REPLACE FUNCTION set_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := 'BD-' || LPAD(nextval('sale_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for sale numbers
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START 1;

-- Function to update product stock after sale
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products 
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check low stock and create alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity <= NEW.low_stock_threshold THEN
    INSERT INTO low_stock_alerts (product_id, current_stock, threshold)
    VALUES (NEW.id, NEW.stock_quantity, NEW.low_stock_threshold)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers

-- Sale number generation trigger
DROP TRIGGER IF EXISTS trigger_set_sale_number ON sales;
CREATE TRIGGER trigger_set_sale_number
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION set_sale_number();

-- Stock update trigger
DROP TRIGGER IF EXISTS trigger_update_product_stock ON sale_items;
CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- Low stock check trigger
DROP TRIGGER IF EXISTS trigger_check_low_stock ON products;
CREATE TRIGGER trigger_check_low_stock
  AFTER UPDATE OF stock_quantity, low_stock_threshold ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();

-- Audit triggers for all tables
DROP TRIGGER IF EXISTS profiles_audit_trigger ON profiles;
CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS categories_audit_trigger ON categories;
CREATE TRIGGER categories_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS brands_audit_trigger ON brands;
CREATE TRIGGER brands_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS products_audit_trigger ON products;
CREATE TRIGGER products_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS customers_audit_trigger ON customers;
CREATE TRIGGER customers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS sales_audit_trigger ON sales;
CREATE TRIGGER sales_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS expenses_audit_trigger ON expenses;
CREATE TRIGGER expenses_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Insert sample data for testing (optional)
INSERT INTO categories (name, description) VALUES
  ('Sneakers', 'Athletic and casual sneakers'),
  ('Clothing', 'Fashion clothing and apparel'),
  ('Accessories', 'Fashion accessories and add-ons')
ON CONFLICT (name) DO NOTHING;

INSERT INTO brands (name, description) VALUES
  ('Nike', 'Global athletic brand'),
  ('Adidas', 'German multinational corporation'),
  ('Jordan', 'Basketball brand by Nike'),
  ('Puma', 'German multinational corporation')
ON CONFLICT (name) DO NOTHING;

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

-- Insert demo accounts manually (since they were created before the trigger)
-- First, get the user IDs from auth.users
DO $$
DECLARE
  admin_id uuid;
  staff_id uuid;
  cashier_id uuid;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_id FROM auth.users WHERE email = 'jack@bigdrip.com';
  IF admin_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role) 
    VALUES (admin_id, 'jack@bigdrip.com', 'Jack Samukai', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Get staff user ID
  SELECT id INTO staff_id FROM auth.users WHERE email = 'staff@bigdrip.com';
  IF staff_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role) 
    VALUES (staff_id, 'staff@bigdrip.com', 'Staff Member', 'staff')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Get cashier user ID
  SELECT id INTO cashier_id FROM auth.users WHERE email = 'cashier@bigdrip.com';
  IF cashier_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role) 
    VALUES (cashier_id, 'cashier@bigdrip.com', 'Cashier', 'cashier')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;