import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Upload, 
  Download, 
  AlertTriangle,
  Barcode,
  X,
  Check,
  ShoppingCart,
  Minus,
  CreditCard,
  Receipt,
  UserPlus,
  Printer
} from 'lucide-react'
import { useLowStockAlerts } from '../hooks/useLowStockAlerts'

interface Product {
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
  created_at: string
  categories?: { name: string }
  brands?: { name: string }
  total_sales?: number
  total_revenue?: number
  remaining_value?: number
}

interface Category {
  id: string
  name: string
  description: string | null
}

interface Brand {
  id: string
  name: string
  description: string | null
}

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  total_price: number
}

interface SaleItem {
  quantity: number
  unit_price: number
  total_price: number
  products: {
    name: string
    sku: string
  }
}

interface Sale {
  sale_number: string
  created_at: string
  profiles?: {
    full_name: string
  }
  customers?: {
    name: string
  }
  sale_items: SaleItem[]
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  payment_method: string
  amount_paid?: number
  change_due?: number
}

export function Inventory() {
  const { profile } = useAuth()
  const { alerts, acknowledgeAlert } = useLowStockAlerts()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showLowStockAlerts, setShowLowStockAlerts] = useState(false)
  const [uploadingCSV, setUploadingCSV] = useState(false)
  const [csvResults, setCsvResults] = useState<{
    success: number
    errors: string[]
  } | null>(null)

  // Quick Sale state
  const [showQuickSale, setShowQuickSale] = useState(false)
  const [quickSaleCart, setQuickSaleCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [taxRate, setTaxRate] = useState<number>(0.075)
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [lastSale, setLastSale] = useState<Sale | null>(null)

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  })

  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    brand_id: '',
    cost_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    low_stock_threshold: 10,
    variants: {},
    description: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchBrands()
    fetchCustomers()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (name),
          brands (name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Fetch sales data for each product
      const productsWithSales = await Promise.all(
        (data || []).map(async (product) => {
          // Get total sales quantity and revenue for this product
          const { data: salesData, error: salesError } = await supabase
            .from('sale_items')
            .select('quantity, unit_price, total_price')
            .eq('product_id', product.id)

          if (salesError) {
            console.error('Error fetching sales data for product:', product.id, salesError)
            return {
              ...product,
              total_sales: 0,
              total_revenue: 0,
              remaining_value: product.stock_quantity * product.selling_price
            }
          }

          const totalSales = salesData?.reduce((sum, item) => sum + item.quantity, 0) || 0
          const totalRevenue = salesData?.reduce((sum, item) => sum + item.total_price, 0) || 0
          const remainingValue = product.stock_quantity * product.selling_price

          return {
            ...product,
            total_sales: totalSales,
            total_revenue: totalRevenue,
            remaining_value: remainingValue
          }
        })
      )

      setProducts(productsWithSales)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name')

      if (error) throw error
      setBrands(data || [])
    } catch (error) {
      console.error('Error fetching brands:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  // Quick Sale Functions
  const addToQuickSaleCart = (product: Product) => {
    const existingItem = quickSaleCart.find(item => item.product.id === product.id)
    
    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        setQuickSaleCart(quickSaleCart.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price
              }
            : item
        ))
      } else {
        alert('Not enough stock available')
      }
    } else {
      setQuickSaleCart([...quickSaleCart, {
        product,
        quantity: 1,
        unit_price: product.selling_price,
        total_price: product.selling_price
      }])
    }
  }

  const updateQuickSaleCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromQuickSaleCart(productId)
      return
    }

    const product = products.find(p => p.id === productId)
    if (product && quantity > product.stock_quantity) {
      alert('Not enough stock available')
      return
    }

    setQuickSaleCart(quickSaleCart.map(item =>
      item.product.id === productId
        ? {
            ...item,
            quantity,
            total_price: quantity * item.unit_price
          }
        : item
    ))
  }

  const removeFromQuickSaleCart = (productId: string) => {
    setQuickSaleCart(quickSaleCart.filter(item => item.product.id !== productId))
  }

  const clearQuickSaleCart = () => {
    setQuickSaleCart([])
    setSelectedCustomer('')
    setDiscountValue(0)
    setAmountPaid(0)
  }

  const calculateQuickSaleSubtotal = () => {
    return quickSaleCart.reduce((sum, item) => sum + item.total_price, 0)
  }

  const calculateQuickSaleDiscountAmount = () => {
    const subtotal = calculateQuickSaleSubtotal()
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100
    }
    return discountValue
  }

  const calculateQuickSaleTaxAmount = () => {
    const subtotalAfterDiscount = calculateQuickSaleSubtotal() - calculateQuickSaleDiscountAmount()
    return subtotalAfterDiscount * taxRate
  }

  const calculateQuickSaleTotal = () => {
    return calculateQuickSaleSubtotal() - calculateQuickSaleDiscountAmount() + calculateQuickSaleTaxAmount()
  }

  const calculateQuickSaleChangeDue = () => {
    const total = calculateQuickSaleTotal()
    return amountPaid > total ? amountPaid - total : 0
  }

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single()

      if (error) throw error

      setCustomers([...customers, data])
      setSelectedCustomer(data.id)
      setNewCustomer({ name: '', phone: '', email: '', address: '' })
      setShowCustomerModal(false)
    } catch (error) {
      console.error('Error adding customer:', error)
      alert('Error adding customer. Please try again.')
    }
  }

  const processQuickSale = async () => {
    if (quickSaleCart.length === 0) {
      alert('Cart is empty')
      return
    }

    const total = calculateQuickSaleTotal()
    
    if (total < 0) {
      alert('Total cannot be negative')
      return
    }

    // For cash payments, if no amount is entered, assume exact payment
    if (paymentMethod === 'cash' && amountPaid === 0) {
      setAmountPaid(total)
    } else if (paymentMethod === 'cash' && amountPaid < total) {
      alert('Insufficient payment amount')
      return
    }

    try {
      const subtotal = calculateQuickSaleSubtotal()
      const discountAmount = calculateQuickSaleDiscountAmount()
      const taxAmount = calculateQuickSaleTaxAmount()

      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_id: selectedCustomer || null,
          cashier_id: profile?.id,
          subtotal,
          discount_type: discountValue > 0 ? discountType : null,
          discount_value: discountValue > 0 ? discountValue : null,
          discount_amount: discountAmount,
          total_amount: total,
          payment_method: paymentMethod
        }])
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = quickSaleCart.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Get complete sale data for receipt
      const { data: completeSale, error: fetchError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name, phone),
          profiles (full_name),
          sale_items (
            *,
            products (name, sku)
          )
        `)
        .eq('id', saleData.id)
        .single()

      if (fetchError) throw fetchError

      // Add calculated values for receipt
      completeSale.tax_amount = taxAmount
      completeSale.change_due = calculateQuickSaleChangeDue()
      completeSale.amount_paid = amountPaid

      setLastSale(completeSale)
      setShowReceiptModal(true)

      // Reset form
      clearQuickSaleCart()
      
      // Refresh data
      fetchProducts()

    } catch (error) {
      console.error('Error processing sale:', error)
      alert('Error processing sale. Please try again.')
    }
  }

  const generateQuickSaleReceipt = () => {
    if (!lastSale) return

    // Convert logo to base64 for embedding in HTML
    const logoPath = '/logo.png'
    
    const receiptContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt ${lastSale.sale_number}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            line-height: 1.2;
            background: white;
            color: black;
            width: 80mm;
            margin: 0 auto;
        }
        
        .receipt {
            width: 100%;
            padding: 5mm;
            border: none;
        }
        
        .header {
            text-align: center;
            margin-bottom: 3mm;
        }
        
        .logo {
            max-width: 60mm;
            max-height: 20mm;
            margin-bottom: 2mm;
        }
        
        .contact-info {
            text-align: center;
            font-size: 8px;
            margin-bottom: 3mm;
            line-height: 1.1;
        }
        
        .divider {
            border-top: 1px dashed #000;
            margin: 2mm 0;
        }
        
        .item {
            margin: 1mm 0;
            font-size: 9px;
        }
        
        .item-name {
            font-weight: bold;
            word-wrap: break-word;
        }
        
        .item-details {
            margin-left: 2mm;
            color: #333;
        }
        
        .totals {
            margin-top: 2mm;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 1mm 0;
            font-size: 9px;
        }
        
        .final-total {
            font-weight: bold;
            font-size: 11px;
            border-top: 1px solid #000;
            padding-top: 1mm;
        }
        
        .footer {
            text-align: center;
            margin-top: 3mm;
            font-size: 8px;
            font-style: italic;
        }
        
        @media print {
            body {
                width: 80mm !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .receipt {
                border: none !important;
                padding: 2mm !important;
            }
            @page {
                size: 80mm auto;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <img src="${logoPath}" alt="Logo" class="logo" onerror="this.style.display='none'">
            <div class="contact-info">
                📍 2nd Street Sinkor<br>
                (Behind City Hall)<br>
                📞 +231 770 754 464<br>
                📞 888 445 066
            </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="item">
            <strong>Receipt #:</strong> ${lastSale.sale_number}
        </div>
        <div class="item">
            <strong>Date:</strong> ${new Date(lastSale.created_at).toLocaleString()}
        </div>
        <div class="item">
            <strong>Cashier:</strong> ${lastSale.profiles?.full_name || 'N/A'}
        </div>
        ${lastSale.customers ? `<div class="item"><strong>Customer:</strong> ${lastSale.customers.name}</div>` : ''}
        
        <div class="divider"></div>
        
        ${lastSale.sale_items.map((item: any) => `
        <div class="item">
            <div class="item-name">${item.products.name}</div>
            <div class="item-details">
                ${item.quantity} x $${item.unit_price.toFixed(2)} = $${item.total_price.toFixed(2)}
            </div>
        </div>
        `).join('')}
        
        <div class="divider"></div>
        
        <div class="totals">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>$${lastSale.subtotal.toFixed(2)}</span>
            </div>
            ${lastSale.discount_amount > 0 ? `
            <div class="total-row">
                <span>Discount:</span>
                <span>-$${lastSale.discount_amount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row">
                <span>Tax (${(taxRate * 100).toFixed(1)}%):</span>
                <span>$${(lastSale.tax_amount || 0).toFixed(2)}</span>
            </div>
            <div class="total-row final-total">
                <span>TOTAL:</span>
                <span>$${lastSale.total_amount.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="item">
            <strong>Payment:</strong> ${lastSale.payment_method.replace('_', ' ').toUpperCase()}
        </div>
        ${lastSale.amount_paid ? `
        <div class="item">
            <strong>Paid:</strong> $${lastSale.amount_paid.toFixed(2)}
        </div>
        ` : ''}
        ${lastSale.change_due !== undefined ? `
        <div class="item">
            <strong>Change:</strong> $${(lastSale.change_due || 0).toFixed(2)}
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="footer">
            Thank you for shopping with Big Drip Kicks!
        </div>
    </div>
</body>
</html>
    `.trim()

    const blob = new Blob([receiptContent], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${lastSale.sale_number}.html`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const printQuickSaleReceipt = () => {
    if (!lastSale) return

    // Convert logo to base64 for embedding in HTML
    const logoPath = '/logo.png'
    
    const receiptContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt ${lastSale.sale_number}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            line-height: 1.2;
            background: white;
            color: #000000;
            width: 80mm;
            margin: 0 auto;
            font-weight: normal;
        }
        
        .receipt {
            width: 100%;
            padding: 5mm;
            border: none;
        }
        
        .header {
            text-align: center;
            margin-bottom: 3mm;
        }
        
        .logo {
            max-width: 60mm;
            max-height: 20mm;
            margin-bottom: 2mm;
        }
        
        .contact-info {
            text-align: center;
            font-size: 8px;
            margin-bottom: 3mm;
            line-height: 1.1;
            color: #000000;
        }
        
        .divider {
            border-top: 2px solid #000000;
            margin: 2mm 0;
        }
        
        .item {
            margin: 1mm 0;
            font-size: 9px;
            color: #000000;
        }
        
        .item-name {
            font-weight: bold;
            word-wrap: break-word;
            color: #000000;
        }
        
        .item-details {
            margin-left: 2mm;
            color: #000000;
        }
        
        .totals {
            margin-top: 2mm;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 1mm 0;
            font-size: 9px;
            color: #000000;
        }
        
        .final-total {
            font-weight: bold;
            font-size: 11px;
            border-top: 2px solid #000000;
            padding-top: 1mm;
            color: #000000;
        }
        
        .footer {
            text-align: center;
            margin-top: 3mm;
            font-size: 8px;
            font-style: italic;
            color: #000000;
        }
        
        @media print {
            body {
                width: 80mm !important;
                margin: 0 !important;
                padding: 0 !important;
                color: #000000 !important;
            }
            .receipt {
                border: none !important;
                padding: 2mm !important;
            }
            @page {
                size: 80mm auto;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <img src="${logoPath}" alt="Logo" class="logo" onerror="this.style.display='none'">
            <div class="contact-info">
                📍 2nd Street Sinkor<br>
                (Behind City Hall)<br>
                📞 +231 770 754 464<br>
                📞 888 445 066
            </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="item">
            <strong>Receipt #:</strong> ${lastSale.sale_number}
        </div>
        <div class="item">
            <strong>Date:</strong> ${new Date(lastSale.created_at).toLocaleString()}
        </div>
        <div class="item">
            <strong>Cashier:</strong> ${lastSale.profiles?.full_name || 'N/A'}
        </div>
        ${lastSale.customers ? `<div class="item"><strong>Customer:</strong> ${lastSale.customers.name}</div>` : ''}
        
        <div class="divider"></div>
        
        ${lastSale.sale_items.map((item: any) => `
        <div class="item">
            <div class="item-name">${item.products.name}</div>
            <div class="item-details">
                ${item.quantity} x $${item.unit_price.toFixed(2)} = $${item.total_price.toFixed(2)}
            </div>
        </div>
        `).join('')}
        
        <div class="divider"></div>
        
        <div class="totals">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>$${lastSale.subtotal.toFixed(2)}</span>
            </div>
            ${lastSale.discount_amount > 0 ? `
            <div class="total-row">
                <span>Discount:</span>
                <span>-$${lastSale.discount_amount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row">
                <span>Tax (${(taxRate * 100).toFixed(1)}%):</span>
                <span>$${(lastSale.tax_amount || 0).toFixed(2)}</span>
            </div>
            <div class="total-row final-total">
                <span>TOTAL:</span>
                <span>$${lastSale.total_amount.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="item">
            <strong>Payment:</strong> ${lastSale.payment_method.replace('_', ' ').toUpperCase()}
        </div>
        ${lastSale.amount_paid ? `
        <div class="item">
            <strong>Paid:</strong> $${lastSale.amount_paid.toFixed(2)}
        </div>
        ` : ''}
        ${lastSale.change_due !== undefined ? `
        <div class="item">
            <strong>Change:</strong> $${(lastSale.change_due || 0).toFixed(2)}
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="footer">
            Thank you for shopping with Big Drip Kicks!
        </div>
    </div>
</body>
</html>
    `.trim()

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (printWindow) {
      printWindow.document.write(receiptContent)
      printWindow.document.close()
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
        }, 1000)
      }, 500)
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('products')
        .insert([{
          ...newProduct,
          created_by: profile?.id,
          category_id: newProduct.category_id || null,
          brand_id: newProduct.brand_id || null,
          barcode: newProduct.barcode || null
        }])

      if (error) throw error

      setNewProduct({
        name: '',
        sku: '',
        barcode: '',
        category_id: '',
        brand_id: '',
        cost_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        low_stock_threshold: 10,
        variants: {},
        description: ''
      })
      setShowAddProduct(false)
      fetchProducts()
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Error adding product. Please try again.')
    }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          sku: editingProduct.sku,
          barcode: editingProduct.barcode || null,
          category_id: editingProduct.category_id || null,
          brand_id: editingProduct.brand_id || null,
          cost_price: editingProduct.cost_price,
          selling_price: editingProduct.selling_price,
          stock_quantity: editingProduct.stock_quantity,
          low_stock_threshold: editingProduct.low_stock_threshold,
          variants: editingProduct.variants,
          description: editingProduct.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProduct.id)

      if (error) throw error

      setEditingProduct(null)
      fetchProducts()
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Error updating product. Please try again.')
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId)

      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product. Please try again.')
    }
  }

  const generateBarcode = () => {
    const timestamp = Date.now().toString()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `BD${timestamp.slice(-6)}${random}`
  }

  const handleGenerateBarcode = () => {
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, barcode: generateBarcode() })
    } else {
      setNewProduct({ ...newProduct, barcode: generateBarcode() })
    }
  }

  const downloadCSVTemplate = () => {
    const csvContent = `name,sku,barcode,category,brand,cost_price,selling_price,stock_quantity,low_stock_threshold,description
Air Jordan 1,AJ1-001,123456789012,Sneakers,Jordan,120.00,180.00,50,10,Classic basketball shoe
Nike Air Max,NAM-002,123456789013,Sneakers,Nike,100.00,150.00,30,5,Comfortable running shoe`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setUploadingCSV(true)
    setCsvResults(null)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('CSV file must contain at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const requiredHeaders = ['name', 'sku', 'cost_price', 'selling_price', 'stock_quantity']
      
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      if (missingHeaders.length > 0) {
        alert(`Missing required columns: ${missingHeaders.join(', ')}`)
        return
      }

      const results = { success: 0, errors: [] as string[] }
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        
        if (values.length !== headers.length) {
          results.errors.push(`Row ${i + 1}: Column count mismatch`)
          continue
        }

        const rowData: any = {}
        headers.forEach((header, index) => {
          rowData[header] = values[index]
        })

        // Validate required fields
        if (!rowData.name || !rowData.sku) {
          results.errors.push(`Row ${i + 1}: Missing name or SKU`)
          continue
        }

        // Find category and brand IDs if provided
        let categoryId = null
        let brandId = null

        if (rowData.category) {
          const category = categories.find(c => 
            c.name.toLowerCase() === rowData.category.toLowerCase()
          )
          categoryId = category?.id || null
        }

        if (rowData.brand) {
          const brand = brands.find(b => 
            b.name.toLowerCase() === rowData.brand.toLowerCase()
          )
          brandId = brand?.id || null
        }

        try {
          const { error } = await supabase
            .from('products')
            .insert([{
              name: rowData.name,
              sku: rowData.sku,
              barcode: rowData.barcode || null,
              category_id: categoryId,
              brand_id: brandId,
              cost_price: parseFloat(rowData.cost_price) || 0,
              selling_price: parseFloat(rowData.selling_price) || 0,
              stock_quantity: parseInt(rowData.stock_quantity) || 0,
              low_stock_threshold: parseInt(rowData.low_stock_threshold) || 10,
              description: rowData.description || null,
              created_by: profile?.id
            }])

          if (error) {
            if (error.code === '23505') { // Unique constraint violation
              results.errors.push(`Row ${i + 1}: SKU '${rowData.sku}' already exists`)
            } else {
              results.errors.push(`Row ${i + 1}: ${error.message}`)
            }
          } else {
            results.success++
          }
        } catch (error) {
          results.errors.push(`Row ${i + 1}: Unexpected error`)
        }
      }

      setCsvResults(results)
      if (results.success > 0) {
        fetchProducts()
      }

    } catch (error) {
      console.error('Error processing CSV:', error)
      alert('Error processing CSV file. Please check the format and try again.')
    } finally {
      setUploadingCSV(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Manage your kicks inventory</p>
        </div>
        <div className="flex space-x-3">
          {alerts.filter(alert => !alert.is_acknowledged).length > 0 && (
            <button
              onClick={() => setShowLowStockAlerts(true)}
              className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Low Stock ({alerts.filter(alert => !alert.is_acknowledged).length})
            </button>
          )}
          <button
            onClick={() => setShowQuickSale(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Quick Sale
          </button>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </button>
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search products by name, SKU, or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-blue-600">Total Products</div>
          <div className="text-2xl font-bold text-blue-900">{products.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-green-600">Total Sales</div>
          <div className="text-2xl font-bold text-green-900">
            {products.reduce((sum, product) => sum + (product.total_sales || 0), 0)} units
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-purple-600">Total Revenue</div>
          <div className="text-2xl font-bold text-purple-900">
            {formatCurrency(products.reduce((sum, product) => sum + (product.total_revenue || 0), 0))}
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-orange-600">Inventory Value</div>
          <div className="text-2xl font-bold text-orange-900">
            {formatCurrency(products.reduce((sum, product) => sum + (product.remaining_value || 0), 0))}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU/Barcode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category/Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-gray-500">{product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.sku}</div>
                    {product.barcode && (
                      <div className="text-sm text-gray-500">{product.barcode}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.categories?.name || 'No Category'}</div>
                    <div className="text-sm text-gray-500">{product.brands?.name || 'No Brand'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Cost: {formatCurrency(product.cost_price)}</div>
                    <div className="text-sm text-gray-500">Sell: {formatCurrency(product.selling_price)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      product.stock_quantity <= product.low_stock_threshold 
                        ? 'text-red-600' 
                        : 'text-gray-900'
                    }`}>
                      {product.stock_quantity} units
                    </div>
                    <div className="text-sm text-gray-500">
                      Threshold: {product.low_stock_threshold}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.total_sales || 0} units
                    </div>
                    <div className="text-sm text-gray-500">
                      Sold
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-green-600">
                      {formatCurrency(product.total_revenue || 0)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Total Revenue
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600">
                      {formatCurrency(product.remaining_value || 0)}
                    </div>
                    <div className="text-sm text-gray-500">
                      In Stock Value
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
              <button onClick={() => setShowAddProduct(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <input
                    type="text"
                    required
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Barcode</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-l-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="mt-1 px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
                    >
                      <Barcode className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand</label>
                  <select
                    value={newProduct.brand_id}
                    onChange={(e) => setNewProduct({ ...newProduct, brand_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({ ...newProduct, selling_price: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProduct.low_stock_threshold}
                    onChange={(e) => setNewProduct({ ...newProduct, low_stock_threshold: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Product</h2>
              <button onClick={() => setEditingProduct(null)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Barcode</label>
                  <div className="flex">
                    <input
                      type="text"
                      value={editingProduct.barcode || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-l-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="mt-1 px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
                    >
                      <Barcode className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={editingProduct.category_id || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand</label>
                  <select
                    value={editingProduct.brand_id || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingProduct.cost_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingProduct.selling_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, selling_price: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stock_quantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.low_stock_threshold}
                    onChange={(e) => setEditingProduct({ ...editingProduct, low_stock_threshold: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Bulk Upload</h2>
              <button onClick={() => setShowBulkUpload(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">Upload products in bulk using a CSV file.</p>
              <button
                onClick={downloadCSVTemplate}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </button>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop your CSV file here, or click to select
                </p>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={handleCSVUpload}
                  disabled={uploadingCSV}
                />
                {uploadingCSV && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Processing CSV...</span>
                  </div>
                )}
                {csvResults && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                    <h4 className="font-medium text-gray-900 mb-2">Upload Results:</h4>
                    <p className="text-sm text-green-600 mb-2">
                      ✅ Successfully imported: {csvResults.success} products
                    </p>
                    {csvResults.errors.length > 0 && (
                      <div>
                        <p className="text-sm text-red-600 mb-1">
                          ❌ Errors: {csvResults.errors.length}
                        </p>
                        <div className="max-h-32 overflow-y-auto">
                          {csvResults.errors.slice(0, 5).map((error, index) => (
                            <p key={index} className="text-xs text-red-500">• {error}</p>
                          ))}
                          {csvResults.errors.length > 5 && (
                            <p className="text-xs text-red-500">... and {csvResults.errors.length - 5} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkUpload(false)
                    setCsvResults(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alerts Modal */}
      {showLowStockAlerts && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Low Stock Alerts</h2>
              <button onClick={() => setShowLowStockAlerts(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              {alerts.filter(alert => !alert.is_acknowledged).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{alert.products?.name}</p>
                      <p className="text-sm text-gray-600">
                        Current stock: {alert.current_stock} (Threshold: {alert.threshold})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Acknowledge
                  </button>
                </div>
              ))}
              {alerts.filter(alert => !alert.is_acknowledged).length === 0 && (
                <p className="text-center text-gray-500 py-8">No unacknowledged low stock alerts</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Sale Modal */}
      {showQuickSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Quick Sale</h2>
              <button onClick={() => setShowQuickSale(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side - Product Selection */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addToQuickSaleCart(product)}
                      className="bg-gray-50 p-3 rounded-lg border hover:border-blue-500 cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className="text-center">
                        <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{product.name}</h3>
                        <p className="text-xs text-gray-600 mb-1">SKU: {product.sku}</p>
                        <p className="text-sm font-bold text-blue-600 mb-1">
                          {formatCurrency(product.selling_price)}
                        </p>
                        <p className="text-xs text-gray-500">Stock: {product.stock_quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side - Cart & Checkout */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Cart ({quickSaleCart.length})
                  </h3>

                  {/* Cart Items */}
                  <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                    {quickSaleCart.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Cart is empty</p>
                    ) : (
                      quickSaleCart.map((item) => (
                        <div key={item.product.id} className="bg-white p-3 rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900 text-sm flex-1">{item.product.name}</h4>
                            <button
                              onClick={() => removeFromQuickSaleCart(item.product.id)}
                              className="text-red-400 hover:text-red-600 ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuickSaleCartQuantity(item.product.id, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-sm"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                              <button
                                onClick={() => updateQuickSaleCartQuantity(item.product.id, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-sm"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-600">{formatCurrency(item.unit_price)} each</p>
                              <p className="font-semibold text-gray-900 text-sm">{formatCurrency(item.total_price)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Customer Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                    <div className="flex space-x-2">
                      <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Walk-in Customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} {customer.phone && `(${customer.phone})`}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowCustomerModal(true)}
                        className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                    <div className="flex space-x-2">
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'flat' | 'percentage')}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="flat">$ Flat</option>
                        <option value="percentage">% Percent</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step={discountType === 'percentage' ? '1' : '0.01'}
                        max={discountType === 'percentage' ? '100' : undefined}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="orange_money">Orange Money</option>
                      <option value="mtn_money">MTN Money</option>
                      <option value="bank">Bank Transfer</option>
                    </select>
                    
                    {paymentMethod === 'cash' && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        placeholder="Amount paid"
                        className="w-full border border-gray-300 rounded px-3 py-2 mt-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>

                  {/* Order Summary */}
                  <div className="bg-white p-3 rounded-lg border mb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(calculateQuickSaleSubtotal())}</span>
                      </div>
                      {discountValue > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Discount:</span>
                          <span>-{formatCurrency(calculateQuickSaleDiscountAmount())}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
                        <span>{formatCurrency(calculateQuickSaleTaxAmount())}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span className="text-blue-600">{formatCurrency(calculateQuickSaleTotal())}</span>
                      </div>
                      {paymentMethod === 'cash' && amountPaid > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Change Due:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(calculateQuickSaleChangeDue())}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={clearQuickSaleCart}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Clear Cart
                    </button>
                    <button
                      onClick={processQuickSale}
                      disabled={quickSaleCart.length === 0}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      <CreditCard className="h-4 w-4 inline mr-2" />
                      Process Sale
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
              <button onClick={() => setShowCustomerModal(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Sale Complete</h2>
              <button onClick={() => setShowReceiptModal(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="text-center space-y-4">
              <div className="text-green-600">
                <Receipt className="h-16 w-16 mx-auto mb-2" />
                <p className="text-lg font-semibold">Sale Processed Successfully!</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">Receipt #{lastSale.sale_number}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(lastSale.total_amount)}
                </p>
                <p className="text-sm text-gray-600">
                  Payment: {lastSale.payment_method.replace('_', ' ').toUpperCase()}
                </p>
                {lastSale.change_due && lastSale.change_due > 0 && (
                  <p className="text-sm text-gray-600">
                    Change Due: {formatCurrency(lastSale.change_due)}
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={printQuickSaleReceipt}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </button>
                <button
                  onClick={generateQuickSaleReceipt}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}