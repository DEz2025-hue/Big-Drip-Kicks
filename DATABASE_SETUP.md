# Database Setup Guide - Big Drip Kicks

This guide will help you set up your Supabase database for the Big Drip Kicks inventory management system.

## 🗄️ Database Schema Overview

The system uses the following main tables:
- `profiles` - User profiles and roles
- `products` - Product inventory
- `sales` - Sales transactions
- `sale_items` - Individual items in sales
- `audit_logs` - System activity tracking

## 🚀 Step-by-Step Setup

### Step 1: Create Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Choose your organization and region
4. Wait for the project to be created

### Step 2: Run Database Migrations

In your Supabase SQL Editor, run these migrations in order:

#### 2.1 Initial Schema (Run First)
```sql
-- This creates the basic table structure
-- Run the file: 20250807022119_autumn_wildflower.sql
```

#### 2.2 Profiles and Authentication
```sql
-- This sets up user profiles and authentication
-- Run the file: 20250805011856_graceful_disk.sql
```

#### 2.3 Sales System
```sql
-- This adds sales functionality
-- Run the file: 20250806003725_smooth_term.sql
```

#### 2.4 Quick Sale Features
```sql
-- This adds quick sale functionality
-- Run the file: 20250815020000_fix_quick_sale.sql
```

#### 2.5 Triggers and Functions
```sql
-- This adds database triggers and functions
-- Run the file: 20250815020001_quick_sale_triggers.sql
```

### Step 3: Set Up Row Level Security (RLS)

The system uses Row Level Security for data protection. These policies are included in the migration files, but here's what they do:

#### Profiles Table Policies
- Users can view their own profile
- Users can update their own profile
- Admins can view all profiles
- Admins can update all profiles

#### Products Table Policies
- All authenticated users can view products
- Staff and Admins can insert/update/delete products
- Cashiers can only view products

#### Sales Table Policies
- Users can view sales they created
- Admins can view all sales
- All authenticated users can create sales

#### Sale Items Table Policies
- Users can view items from sales they created
- Admins can view all sale items
- All authenticated users can create sale items

### Step 4: Create Initial Users

After setting up the database, create your first admin user:

1. Go to Authentication → Users in Supabase
2. Create a new user with your email
3. Set a password
4. Go to SQL Editor and run:

```sql
-- Create admin profile for your user
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  'your-user-id-here', 
  'your-email@example.com', 
  'admin', 
  'Your Name'
);
```

### Step 5: Test the Setup

1. Try logging in with your credentials
2. Test creating a product
3. Test making a sale
4. Verify all features work correctly

## 🔧 Database Functions

The system includes several custom functions:

### Stock Management
- `update_product_stock()` - Updates product stock after sales
- `check_low_stock()` - Checks for low stock products

### Sales Processing
- `set_sale_number()` - Generates unique sale numbers
- `validate_stock_before_sale()` - Validates stock before sale
- `calculate_sale_totals()` - Calculates sale totals

### Audit Logging
- `create_audit_log()` - Creates audit log entries

## 📊 Database Triggers

The system uses triggers for automation:

### Before Insert Triggers
- `set_sale_number_trigger` - Sets sale number automatically
- `validate_stock_trigger` - Validates stock before sale

### After Insert/Update Triggers
- `update_stock_trigger` - Updates product stock after sale
- `create_audit_log_trigger` - Creates audit logs for changes

## 🔐 Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies control access based on user roles
- Users can only access data they're authorized to see

### Role-Based Access
- **Admin**: Full access to all features
- **Staff**: Product and sales management
- **Cashier**: Sales and basic inventory access

## 🚨 Important Notes

### Environment Variables
Make sure to set these in your Vercel project:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Backup Strategy
- Enable automatic backups in Supabase
- Export your schema regularly
- Keep migration files in version control

### Performance
- The database is optimized for typical inventory operations
- Indexes are created on frequently queried columns
- Consider upgrading your Supabase plan for larger datasets

## 🆘 Troubleshooting

### Common Issues

**Authentication Errors:**
- Verify RLS policies are set up correctly
- Check that user profiles exist in the database
- Ensure environment variables are correct

**Sales Not Working:**
- Verify all triggers are created
- Check that functions exist
- Ensure proper permissions are set

**Stock Updates Not Working:**
- Check that `update_product_stock` function exists
- Verify triggers are active
- Check for any constraint violations

### Getting Help
- Check Supabase logs in the dashboard
- Review the migration files for errors
- Create an issue on GitHub if needed

---

**Database Setup Complete!** Your Big Drip Kicks system is ready to use.
