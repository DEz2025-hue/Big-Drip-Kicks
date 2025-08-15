/*
  # Quick Sale Triggers and Functions
  
  This migration adds all necessary triggers and functions
  to support the Quick Sale functionality.
*/

-- Create sequence for sale numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START 1;

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

-- Create trigger for automatic sale number generation
DROP TRIGGER IF EXISTS set_sale_number_trigger ON sales;
CREATE TRIGGER set_sale_number_trigger
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION set_sale_number();

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

-- Create trigger for automatic stock updates
DROP TRIGGER IF EXISTS update_product_stock_trigger ON sale_items;
CREATE TRIGGER update_product_stock_trigger
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- Function to check low stock and create alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity <= NEW.low_stock_threshold THEN
    INSERT INTO low_stock_alerts (product_id, current_stock, threshold)
    VALUES (NEW.id, NEW.stock_quantity, NEW.low_stock_threshold)
    ON CONFLICT (product_id) DO UPDATE SET
      current_stock = NEW.stock_quantity,
      is_acknowledged = false,
      acknowledged_by = null,
      acknowledged_at = null;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for low stock alerts
DROP TRIGGER IF EXISTS check_low_stock_trigger ON products;
CREATE TRIGGER check_low_stock_trigger
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for all tables
DROP TRIGGER IF EXISTS audit_profiles_trigger ON profiles;
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_products_trigger ON products;
CREATE TRIGGER audit_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_sales_trigger ON sales;
CREATE TRIGGER audit_sales_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_sale_items_trigger ON sale_items;
CREATE TRIGGER audit_sale_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_customers_trigger ON customers;
CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Function to validate stock before sale
CREATE OR REPLACE FUNCTION validate_stock_before_sale()
RETURNS TRIGGER AS $$
DECLARE
  current_stock integer;
BEGIN
  SELECT stock_quantity INTO current_stock
  FROM products
  WHERE id = NEW.product_id;
  
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %: requested %, available %', 
      NEW.product_id, NEW.quantity, current_stock;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate stock before sale
DROP TRIGGER IF EXISTS validate_stock_before_sale_trigger ON sale_items;
CREATE TRIGGER validate_stock_before_sale_trigger
  BEFORE INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_stock_before_sale();

-- Function to calculate sale totals
CREATE OR REPLACE FUNCTION calculate_sale_totals()
RETURNS TRIGGER AS $$
DECLARE
  sale_total numeric(10,2);
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO sale_total
  FROM sale_items
  WHERE sale_id = NEW.id;
  
  UPDATE sales
  SET subtotal = sale_total,
      total_amount = sale_total - COALESCE(discount_amount, 0)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to recalculate sale totals
DROP TRIGGER IF EXISTS calculate_sale_totals_trigger ON sale_items;
CREATE TRIGGER calculate_sale_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sale_totals();

-- Insert demo data if tables are empty
INSERT INTO categories (name, description) 
SELECT 'Sneakers', 'Athletic footwear'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Sneakers');

INSERT INTO categories (name, description) 
SELECT 'Apparel', 'Clothing and accessories'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Apparel');

INSERT INTO brands (name, description) 
SELECT 'Nike', 'Just Do It'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Nike');

INSERT INTO brands (name, description) 
SELECT 'Jordan', 'Air Jordan'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Jordan');

INSERT INTO brands (name, description) 
SELECT 'Adidas', 'Impossible is Nothing'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Adidas');

-- Verify all functions and triggers are created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
