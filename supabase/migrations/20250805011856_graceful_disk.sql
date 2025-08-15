/*
  # Big Drip Inventory Dashboard - Complete Database Schema

  1. New Tables
    - `profiles` - User profiles with roles
    - `products` - Product inventory with variants
    - `categories` - Product categories
    - `brands` - Product brands
    - `sales` - Sales transactions
    - `sale_items` - Individual items in each sale
    - `customers` - Customer profiles
    - `expenses` - Business expenses tracking
    - `audit_logs` - System audit trail
    - `low_stock_alerts` - Low stock notifications

  2. Security
    - Enable RLS on all tables
    - Role-based policies for Admin, Staff, Cashier
    - Audit logging for all critical operations

  3. Features
    - Complete inventory management
    - Sales processing with discounts
    - Customer management
    - Expense tracking
    - Comprehensive reporting
    - Low stock monitoring
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles with roles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'staff', 'cashier')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Brands
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  barcode text,
  category_id uuid REFERENCES categories(id),
  brand_id uuid REFERENCES brands(id),
  cost_price decimal(10,2) NOT NULL DEFAULT 0,
  selling_price decimal(10,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 10,
  variants jsonb DEFAULT '{}',
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  cashier_id uuid REFERENCES profiles(id) NOT NULL,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  discount_type text CHECK (discount_type IN ('flat', 'percentage')),
  discount_value decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'orange_money', 'mtn_money', 'bank')),
  payment_status text DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Sale items
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  category text NOT NULL,
  recorded_by uuid REFERENCES profiles(id) NOT NULL,
  expense_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Audit logs
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

-- Low stock alerts
CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  current_stock integer NOT NULL,
  threshold integer NOT NULL,
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('Sneakers', 'Athletic and casual footwear'),
  ('Apparel', 'Clothing and fashion items'),
  ('Accessories', 'Fashion accessories and add-ons')
ON CONFLICT (name) DO NOTHING;

-- Insert default brands
INSERT INTO brands (name, description) VALUES
  ('Nike', 'Athletic footwear and apparel'),
  ('Adidas', 'Sports and lifestyle brand'),
  ('Jordan', 'Premium basketball footwear'),
  ('Puma', 'Sports and lifestyle products'),
  ('Vans', 'Skateboarding and street culture')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
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

-- Categories policies
CREATE POLICY "Everyone can read categories" ON categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can manage categories" ON categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Brands policies
CREATE POLICY "Everyone can read brands" ON brands
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can manage brands" ON brands
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Products policies
CREATE POLICY "Everyone can read products" ON products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can manage products" ON products
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Customers policies
CREATE POLICY "Everyone can read customers" ON customers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Everyone can create customers" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin and staff can manage customers" ON customers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Sales policies
CREATE POLICY "Everyone can read sales" ON sales
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Everyone can create sales" ON sales
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin and staff can manage sales" ON sales
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Sale items policies
CREATE POLICY "Everyone can read sale items" ON sale_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Everyone can create sale items" ON sale_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Expenses policies
CREATE POLICY "Admin and staff can read expenses" ON expenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Admin and staff can create expenses" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Audit logs policies
CREATE POLICY "Admin can read audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Low stock alerts policies
CREATE POLICY "Admin and staff can read alerts" ON low_stock_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "System can manage alerts" ON low_stock_alerts
  FOR ALL TO authenticated
  USING (true);

-- Functions for automatic sale number generation
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  sale_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 4) AS integer)), 0) + 1
  INTO next_number
  FROM sales
  WHERE sale_number LIKE 'BD-%';
  
  sale_number := 'BD-' || LPAD(next_number::text, 6, '0');
  RETURN sale_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate sale numbers
CREATE OR REPLACE FUNCTION set_sale_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := generate_sale_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_sale_number
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION set_sale_number();

-- Function to check and create low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS trigger AS $$
BEGIN
  -- Check if stock is below threshold
  IF NEW.stock_quantity <= NEW.low_stock_threshold THEN
    -- Insert or update alert
    INSERT INTO low_stock_alerts (product_id, current_stock, threshold)
    VALUES (NEW.id, NEW.stock_quantity, NEW.low_stock_threshold)
    ON CONFLICT (product_id) 
    DO UPDATE SET 
      current_stock = NEW.stock_quantity,
      threshold = NEW.low_stock_threshold,
      is_acknowledged = false,
      acknowledged_by = NULL,
      acknowledged_at = NULL,
      created_at = now();
  ELSE
    -- Remove alert if stock is above threshold
    DELETE FROM low_stock_alerts WHERE product_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_low_stock
  AFTER UPDATE OF stock_quantity, low_stock_threshold ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();

-- Function to update product stock after sale
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS trigger AS $$
BEGIN
  UPDATE products 
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();