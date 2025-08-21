import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Minus, 
  Trash2, 
  User, 
  CreditCard,
  Receipt,
  Scan,
  X,
  Calculator,
  DollarSign,
  Eye,
  UserPlus,
  RotateCcw,
  Printer
} from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  selling_price: number
  stock_quantity: number
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

interface Sale {
  id: string
  sale_number: string
  customer_id: string | null
  total_amount: number
  payment_method: string
  created_at: string
  customers?: { name: string }
  profiles?: { full_name: string }
}

export function Sales() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [taxRate, setTaxRate] = useState<number>(0.075) // 7.5% tax rate
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showReceiptPreviewModal, setShowReceiptPreviewModal] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [scanningBarcode, setScanningBarcode] = useState(false)

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
    fetchRecentSales()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, barcode, selling_price, stock_quantity')
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
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

  const fetchRecentSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name),
          profiles (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentSales(data || [])
    } catch (error) {
      console.error('Error fetching recent sales:', error)
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id)
    
    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        setCart(cart.map(item =>
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
      setCart([...cart, {
        product,
        quantity: 1,
        unit_price: product.selling_price,
        total_price: product.selling_price
      }])
    }
  }

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find(p => p.id === productId)
    if (product && quantity > product.stock_quantity) {
      alert('Not enough stock available')
      return
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? {
            ...item,
            quantity,
            total_price: quantity * item.unit_price
          }
        : item
    ))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer('')
    setDiscountValue(0)
    setAmountPaid(0)
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total_price, 0)
  }

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal()
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100
    }
    return discountValue
  }

  const calculateTaxAmount = () => {
    const subtotalAfterDiscount = calculateSubtotal() - calculateDiscountAmount()
    return subtotalAfterDiscount * taxRate
  }

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscountAmount() + calculateTaxAmount()
  }

  const calculateChangeDue = () => {
    const total = calculateTotal()
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

  const processSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty')
      return
    }

    const total = calculateTotal()
    
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
      const subtotal = calculateSubtotal()
      const discountAmount = calculateDiscountAmount()
      const taxAmount = calculateTaxAmount()

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
      const saleItems = cart.map(item => ({
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
      completeSale.change_due = calculateChangeDue()
      completeSale.amount_paid = amountPaid

      setLastSale(completeSale)
      setShowReceiptModal(true)

      // Reset form
      clearCart()
      
      // Refresh data
      fetchProducts()
      fetchRecentSales()

    } catch (error) {
      console.error('Error processing sale:', error)
      alert('Error processing sale. Please try again.')
    }
  }

  const showReceiptPreview = () => {
    if (cart.length === 0) {
      alert('Cart is empty')
      return
    }

    const previewSale = {
      sale_number: 'PREVIEW',
      created_at: new Date().toISOString(),
      subtotal: calculateSubtotal(),
      discount_amount: calculateDiscountAmount(),
      tax_amount: calculateTaxAmount(),
      total_amount: calculateTotal(),
      amount_paid: amountPaid,
      change_due: calculateChangeDue(),
      payment_method: paymentMethod,
      customers: selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null,
      profiles: { full_name: profile?.full_name },
      sale_items: cart.map(item => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        products: { name: item.product.name, sku: item.product.sku }
      }))
    }

    setLastSale(previewSale)
    setShowReceiptPreviewModal(true)
  }

  const generateReceipt = () => {
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
        ${lastSale.change_due ? `
        <div class="item">
            <strong>Change:</strong> $${lastSale.change_due.toFixed(2)}
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

      const printReceipt = () => {
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
            font-family: 'Arial', sans-serif;
            font-size: 20px;
            line-height: 1.5;
            background: white;
            color: #000000;
            width: 100mm;
            margin: 0 auto;
            font-weight: bold;
        }
        
        .receipt {
            width: 100%;
            padding: 5mm;
            border: none;
        }
        
                    .header {
                text-align: center;
                margin-bottom: 4mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
            }
            
            .logo {
                max-width: 60mm;
                max-height: 20mm;
                margin-bottom: 3mm;
                display: block;
                margin-left: auto;
                margin-right: auto;
                align-self: center;
            }
        
        .contact-info {
            text-align: center;
            font-size: 18px;
            margin-bottom: 4mm;
            line-height: 1.4;
            color: #000000;
            font-weight: normal;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
        }
        
        .divider {
            border-top: 3px solid #000000;
            margin: 3mm 0;
        }
        
        .item {
            margin: 3mm 0;
            font-size: 19px;
            color: #000000;
            font-weight: bold;
        }
        
        .item-name {
            font-weight: bold;
            word-wrap: break-word;
            color: #000000;
            font-size: 20px;
        }
        
        .item-details {
            margin-left: 4mm;
            color: #000000;
            font-size: 18px;
            font-weight: bold;
        }
        
        .totals {
            margin-top: 2mm;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3mm 0;
            font-size: 19px;
            color: #000000;
            font-weight: bold;
        }
        
        .final-total {
            font-weight: bold;
            font-size: 22px;
            border-top: 4px solid #000000;
            padding-top: 3mm;
            color: #000000;
        }
        
        .footer {
            text-align: center;
            margin-top: 5mm;
            font-size: 18px;
            font-style: italic;
            color: #000000;
            font-weight: bold;
        }
        
        @media print {
            body {
                width: 100mm !important;
                margin: 0 !important;
                padding: 0 !important;
                color: #000000 !important;
            }
            .receipt {
                border: none !important;
                padding: 3mm !important;
            }
            @page {
                size: 100mm auto;
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
        ${lastSale.change_due ? `
        <div class="item">
            <strong>Change:</strong> $${lastSale.change_due.toFixed(2)}
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

  const handleBarcodeSearch = async () => {
    setScanningBarcode(true)
    
    try {
      // Check if the browser supports the BarcodeDetector API
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
        })

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        })
        
        // Create video element for camera feed
        const video = document.createElement('video')
        video.srcObject = stream
        video.play()

        // Create a modal-like overlay for the camera
        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        `

        const container = document.createElement('div')
        container.style.cssText = `
          background: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          max-width: 400px;
          width: 90%;
        `

        video.style.cssText = `
          width: 100%;
          max-width: 300px;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 15px;
        `

        const instructions = document.createElement('p')
        instructions.textContent = 'Point camera at barcode to scan'
        instructions.style.cssText = 'margin-bottom: 15px; color: #374151;'

        const cancelButton = document.createElement('button')
        cancelButton.textContent = 'Cancel'
        cancelButton.style.cssText = `
          background: #6b7280;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
        `

        container.appendChild(video)
        container.appendChild(instructions)
        container.appendChild(cancelButton)
        overlay.appendChild(container)
        document.body.appendChild(overlay)

        let scanning = true

        const cleanup = () => {
          scanning = false
          stream.getTracks().forEach(track => track.stop())
          document.body.removeChild(overlay)
          setScanningBarcode(false)
        }

        cancelButton.onclick = cleanup
        overlay.onclick = (e) => {
          if (e.target === overlay) cleanup()
        }

        // Scan for barcodes
        const scanInterval = setInterval(async () => {
          if (!scanning) {
            clearInterval(scanInterval)
            return
          }

          try {
            const barcodes = await barcodeDetector.detect(video)
            if (barcodes.length > 0) {
              const barcode = barcodes[0].rawValue
              setSearchTerm(barcode)
              cleanup()
              clearInterval(scanInterval)
            }
          } catch (error) {
            // Continue scanning
          }
        }, 500)

        // Auto cleanup after 30 seconds
        setTimeout(() => {
          if (scanning) {
            cleanup()
            clearInterval(scanInterval)
          }
        }, 30000)

      } else {
        // Fallback: Manual barcode entry
        const barcode = prompt('Enter barcode manually:')
        if (barcode) {
          setSearchTerm(barcode)
        }
      }
    } catch (error) {
      console.error('Barcode scanning error:', error)
      
      // Fallback: Manual barcode entry
      const barcode = prompt('Camera access denied. Enter barcode manually:')
      if (barcode) {
        setSearchTerm(barcode)
      }
    } finally {
      setScanningBarcode(false)
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

  const formatPaymentMethod = (method: string) => {
    const methods = {
      cash: 'Cash',
      card: 'Card',
      orange_money: 'Orange Money',
      mtn_money: 'MTN Money',
      bank: 'Bank Transfer'
    }
    return methods[method as keyof typeof methods] || method
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-gray-600">Cashier: {profile?.full_name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main POS Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Product Search & Selection */}
        <div className="flex-1 flex flex-col bg-white border-r">
          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or scan barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
              <button 
                onClick={handleBarcodeSearch}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 ${scanningBarcode ? 'animate-pulse text-blue-600' : ''}`}
              >
                <Scan className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-gray-50 p-4 rounded-lg border hover:border-blue-500 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-gray-600 mb-2">SKU: {product.sku}</p>
                    <p className="text-lg font-bold text-blue-600 mb-1">
                      {formatCurrency(product.selling_price)}
                    </p>
                    <p className="text-xs text-gray-500">Stock: {product.stock_quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Cart & Checkout */}
        <div className="w-96 bg-white flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart ({cart.length})
              </h3>
              <button
                onClick={clearCart}
                className="flex items-center px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Cart is empty</p>
                <p className="text-sm">Scan or select products to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 text-sm flex-1">{item.product.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-400 hover:text-red-600 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{formatCurrency(item.unit_price)} each</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(item.total_price)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Selection */}
          <div className="p-4 border-t border-b">
            <div className="flex items-center space-x-2">
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

          {/* Discount Section */}
          <div className="p-4 border-b">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Discount</h4>
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

          {/* Order Summary */}
          <div className="p-4 border-b bg-gray-50">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(calculateDiscountAmount())}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
                <span>{formatCurrency(calculateTaxAmount())}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="p-4 border-b">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Payment</h4>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="orange_money">Orange Money</option>
              <option value="mtn_money">MTN Money</option>
              <option value="bank">Bank Transfer</option>
            </select>
            
            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  placeholder="Amount paid"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {amountPaid > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Change Due:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(calculateChangeDue())}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-2">
            <button
              onClick={showReceiptPreview}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Receipt
            </button>
            <button
              onClick={processSale}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Process Sale
            </button>
          </div>
        </div>
      </div>

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

      {/* Receipt Preview Modal */}
      {showReceiptPreviewModal && lastSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Receipt Preview</h2>
              <button onClick={() => setShowReceiptPreviewModal(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
              <div className="text-center mb-4">
                <img 
                  src="/logo.png" 
                  alt="Big Drip Logo" 
                  className="h-12 w-auto mx-auto mb-2"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="text-xs text-gray-600 mb-2">
                  📍 2nd Street Sinkor (Behind City Hall)<br />
                  📞 +231 770 754 464 | 888 445 066
                </div>
              </div>
              <div className="border-t border-b border-gray-300 py-2 mb-4">
                <p>Receipt #: {lastSale.sale_number}</p>
                <p>Date: {new Date(lastSale.created_at).toLocaleString()}</p>
                <p>Cashier: {lastSale.profiles?.full_name}</p>
                {lastSale.customers && <p>Customer: {lastSale.customers.name}</p>}
              </div>
              <div className="space-y-1 mb-4">
                {lastSale.sale_items.map((item: any, index: number) => (
                  <div key={index}>
                    <p>{item.products.name}</p>
                    <p className="text-right">
                      {item.quantity} x ${item.unit_price.toFixed(2)} = ${item.total_price.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-300 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${lastSale.subtotal.toFixed(2)}</span>
                </div>
                {lastSale.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-${lastSale.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
                  <span>${(lastSale.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>${lastSale.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span>{formatPaymentMethod(lastSale.payment_method)}</span>
                </div>
                {lastSale.amount_paid && (
                  <>
                    <div className="flex justify-between">
                      <span>Amount Paid:</span>
                      <span>${lastSale.amount_paid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change Due:</span>
                      <span>${(lastSale.change_due || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="text-center mt-4 pt-2 border-t border-gray-300">
                <p>Thank you for shopping with Big Drip Kicks!</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowReceiptPreviewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
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
                  Payment: {formatPaymentMethod(lastSale.payment_method)}
                </p>
                {lastSale.change_due > 0 && (
                  <p className="text-sm text-gray-600">
                    Change Due: {formatCurrency(lastSale.change_due)}
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={printReceipt}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </button>
                <button
                  onClick={generateReceipt}
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