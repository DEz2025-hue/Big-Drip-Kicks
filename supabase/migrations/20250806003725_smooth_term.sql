/*
  # Add Audit Logging Triggers

  1. Audit Functions
    - Generic audit function for tracking changes
    - Specific functions for different table operations

  2. Triggers
    - Product changes (insert, update, delete)
    - User management changes
    - Sales operations
    - Customer changes
    - Expense changes

  3. Security
    - Audit logs are insert-only
    - Only admins can view audit logs
*/

-- Generic audit function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      created_at
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      now()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      new_values,
      created_at
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      now()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for products
DROP TRIGGER IF EXISTS products_audit_trigger ON products;
CREATE TRIGGER products_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create audit triggers for profiles (user management)
DROP TRIGGER IF EXISTS profiles_audit_trigger ON profiles;
CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create audit triggers for customers
DROP TRIGGER IF EXISTS customers_audit_trigger ON customers;
CREATE TRIGGER customers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create audit triggers for expenses
DROP TRIGGER IF EXISTS expenses_audit_trigger ON expenses;
CREATE TRIGGER expenses_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create audit triggers for categories
DROP TRIGGER IF EXISTS categories_audit_trigger ON categories;
CREATE TRIGGER categories_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create audit triggers for brands
DROP TRIGGER IF EXISTS brands_audit_trigger ON brands;
CREATE TRIGGER brands_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON brands
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Sales are already audited through the sales table itself, but we can add triggers if needed
DROP TRIGGER IF EXISTS sales_audit_trigger ON sales;
CREATE TRIGGER sales_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();