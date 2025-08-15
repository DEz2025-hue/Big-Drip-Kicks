import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase config:', { 
  url: supabaseUrl ? 'Set' : 'Missing', 
  key: supabaseAnonKey ? 'Set' : 'Missing' 
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Supabase client created successfully')

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'staff' | 'cashier'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'staff' | 'cashier'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'staff' | 'cashier'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          sku: string
          barcode: string | null
          category_id: string | null
          brand_id: string | null
          cost_price: number
          selling_price: number
          stock_quantity: number
          low_stock_threshold: number
          variants: any
          description: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sku: string
          barcode?: string | null
          category_id?: string | null
          brand_id?: string | null
          cost_price?: number
          selling_price?: number
          stock_quantity?: number
          low_stock_threshold?: number
          variants?: any
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          sku?: string
          barcode?: string | null
          category_id?: string | null
          brand_id?: string | null
          cost_price?: number
          selling_price?: number
          stock_quantity?: number
          low_stock_threshold?: number
          variants?: any
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          sale_number: string
          customer_id: string | null
          cashier_id: string
          subtotal: number
          discount_type: 'flat' | 'percentage' | null
          discount_value: number | null
          discount_amount: number | null
          total_amount: number
          payment_method: 'cash' | 'card' | 'orange_money' | 'mtn_money' | 'bank'
          payment_status: 'completed' | 'pending' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sale_number?: string
          customer_id?: string | null
          cashier_id: string
          subtotal?: number
          discount_type?: 'flat' | 'percentage' | null
          discount_value?: number | null
          discount_amount?: number | null
          total_amount?: number
          payment_method: 'cash' | 'card' | 'orange_money' | 'mtn_money' | 'bank'
          payment_status?: 'completed' | 'pending' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sale_number?: string
          customer_id?: string | null
          cashier_id?: string
          subtotal?: number
          discount_type?: 'flat' | 'percentage' | null
          discount_value?: number | null
          discount_amount?: number | null
          total_amount?: number
          payment_method?: 'cash' | 'card' | 'orange_money' | 'mtn_money' | 'bank'
          payment_status?: 'completed' | 'pending' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          quantity?: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          description: string
          amount: number
          category: string
          recorded_by: string
          expense_date: string
          created_at: string
        }
        Insert: {
          id?: string
          description: string
          amount: number
          category: string
          recorded_by: string
          expense_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          category?: string
          recorded_by?: string
          expense_date?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_values: any
          new_values: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_values?: any
          new_values?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          old_values?: any
          new_values?: any
          created_at?: string
        }
      }
      low_stock_alerts: {
        Row: {
          id: string
          product_id: string
          current_stock: number
          threshold: number
          is_acknowledged: boolean
          acknowledged_by: string | null
          acknowledged_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          current_stock: number
          threshold: number
          is_acknowledged?: boolean
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          current_stock?: number
          threshold?: number
          is_acknowledged?: boolean
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          created_at?: string
        }
      }
    }
  }
}