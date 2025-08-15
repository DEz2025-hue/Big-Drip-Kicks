import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  BarChart3, 
  Download, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Package,
  Users,
  ShoppingCart
} from 'lucide-react'

interface ReportData {
  salesSummary: {
    totalSales: number
    totalTransactions: number
    averageTransaction: number
    topPaymentMethod: string
  }
  topProducts: Array<{
    name: string
    sku: string
    quantity_sold: number
    revenue: number
  }>
  salesByDay: Array<{
    date: string
    total_sales: number
    transaction_count: number
  }>
  lowStockProducts: Array<{
    name: string
    sku: string
    current_stock: number
    threshold: number
  }>
  customerStats: {
    totalCustomers: number
    newCustomers: number
    topCustomers: Array<{
      name: string
      total_spent: number
      transaction_count: number
    }>
  }
  expenseSummary: {
    totalExpenses: number
    topCategory: string
    expensesByCategory: Array<{
      category: string
      total: number
    }>
  }
}

export function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // Sales Summary
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount, payment_method, created_at')
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)

      const totalSales = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const totalTransactions = salesData?.length || 0
      const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0

      // Payment method analysis
      const paymentMethods = salesData?.reduce((acc, sale) => {
        acc[sale.payment_method] = (acc[sale.payment_method] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
      
      const topPaymentMethod = Object.entries(paymentMethods)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

      // Top Products
      const { data: topProductsData } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          total_price,
          products (name, sku),
          sales!inner (created_at)
        `)
        .gte('sales.created_at', `${dateRange.start}T00:00:00`)
        .lte('sales.created_at', `${dateRange.end}T23:59:59`)

      const productMap = new Map()
      topProductsData?.forEach(item => {
        const productName = item.products?.name
        const productSku = item.products?.sku
        if (productName && productSku) {
          const key = `${productName}-${productSku}`
          if (productMap.has(key)) {
            const existing = productMap.get(key)
            productMap.set(key, {
              name: productName,
              sku: productSku,
              quantity_sold: existing.quantity_sold + item.quantity,
              revenue: existing.revenue + item.total_price
            })
          } else {
            productMap.set(key, {
              name: productName,
              sku: productSku,
              quantity_sold: item.quantity,
              revenue: item.total_price
            })
          }
        }
      })

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.quantity_sold - a.quantity_sold)
        .slice(0, 10)

      // Sales by Day
      const salesByDay = salesData?.reduce((acc, sale) => {
        const date = sale.created_at.split('T')[0]
        if (acc[date]) {
          acc[date].total_sales += sale.total_amount
          acc[date].transaction_count += 1
        } else {
          acc[date] = {
            date,
            total_sales: sale.total_amount,
            transaction_count: 1
          }
        }
        return acc
      }, {} as Record<string, any>) || {}

      const salesByDayArray = Object.values(salesByDay).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Low Stock Products
      const { data: lowStockData } = await supabase
        .from('products')
        .select('name, sku, stock_quantity, low_stock_threshold')
        .lte('stock_quantity', supabase.raw('low_stock_threshold'))
        .eq('is_active', true)

      const lowStockProducts = lowStockData?.map(product => ({
        name: product.name,
        sku: product.sku,
        current_stock: product.stock_quantity,
        threshold: product.low_stock_threshold
      })) || []

      // Customer Stats
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name, created_at')

      const { data: customerSalesData } = await supabase
        .from('sales')
        .select('customer_id, total_amount, created_at')
        .not('customer_id', 'is', null)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)

      const totalCustomers = customersData?.length || 0
      const newCustomers = customersData?.filter(customer => 
        customer.created_at >= `${dateRange.start}T00:00:00` &&
        customer.created_at <= `${dateRange.end}T23:59:59`
      ).length || 0

      const customerSpending = customerSalesData?.reduce((acc, sale) => {
        if (sale.customer_id) {
          if (acc[sale.customer_id]) {
            acc[sale.customer_id].total_spent += sale.total_amount
            acc[sale.customer_id].transaction_count += 1
          } else {
            acc[sale.customer_id] = {
              total_spent: sale.total_amount,
              transaction_count: 1
            }
          }
        }
        return acc
      }, {} as Record<string, any>) || {}

      const topCustomers = Object.entries(customerSpending)
        .map(([customerId, stats]: [string, any]) => {
          const customer = customersData?.find(c => c.id === customerId)
          return {
            name: customer?.name || 'Unknown',
            total_spent: stats.total_spent,
            transaction_count: stats.transaction_count
          }
        })
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5)

      // Expense Summary
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount, category')
        .gte('expense_date', dateRange.start)
        .lte('expense_date', dateRange.end)

      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0
      
      const expensesByCategory = expensesData?.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount
        return acc
      }, {} as Record<string, number>) || {}

      const topExpenseCategory = Object.entries(expensesByCategory)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

      const expensesByCategoryArray = Object.entries(expensesByCategory)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total)

      setReportData({
        salesSummary: {
          totalSales,
          totalTransactions,
          averageTransaction,
          topPaymentMethod
        },
        topProducts,
        salesByDay: salesByDayArray,
        lowStockProducts,
        customerStats: {
          totalCustomers,
          newCustomers,
          topCustomers
        },
        expenseSummary: {
          totalExpenses,
          topCategory: topExpenseCategory,
          expensesByCategory: expensesByCategoryArray
        }
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    ).join('\n')

    const csvContent = `${headers}\n${rows}`
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${dateRange.start}_to_${dateRange.end}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

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

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
        <p className="mt-1 text-sm text-gray-500">Try adjusting your date range.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(reportData.salesSummary.totalSales)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {reportData.salesSummary.totalTransactions}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(reportData.salesSummary.averageTransaction)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Package className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {reportData.lowStockProducts.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
            <button
              onClick={() => exportToCSV(reportData.topProducts, 'top_products')}
              className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>
          <div className="space-y-3">
            {reportData.topProducts.slice(0, 5).map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.sku} • {product.quantity_sold} sold</p>
                </div>
                <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
            <button
              onClick={() => exportToCSV(reportData.customerStats.topCustomers, 'top_customers')}
              className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>
          <div className="space-y-3">
            {reportData.customerStats.topCustomers.map((customer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-sm text-gray-600">{customer.transaction_count} transaction{customer.transaction_count !== 1 ? 's' : ''}</p>
                </div>
                <p className="font-semibold text-gray-900">{formatCurrency(customer.total_spent)}</p>
              </div>
            ))}
            {reportData.customerStats.topCustomers.length === 0 && (
              <p className="text-gray-500 text-center py-4">No customer data available</p>
            )}
          </div>
        </div>

        {/* Sales by Day */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Daily Sales</h3>
            <button
              onClick={() => exportToCSV(reportData.salesByDay, 'daily_sales')}
              className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {reportData.salesByDay.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(day.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">{day.transaction_count} transaction{day.transaction_count !== 1 ? 's' : ''}</p>
                </div>
                <p className="font-semibold text-gray-900">{formatCurrency(day.total_sales)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Expenses by Category</h3>
            <button
              onClick={() => exportToCSV(reportData.expenseSummary.expensesByCategory, 'expenses_by_category')}
              className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>
          <div className="space-y-3">
            <div className="mb-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(reportData.expenseSummary.totalExpenses)}
              </p>
            </div>
            {reportData.expenseSummary.expensesByCategory.slice(0, 5).map((expense, index) => (
              <div key={index} className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{expense.category}</p>
                <p className="font-semibold text-gray-900">{formatCurrency(expense.total)}</p>
              </div>
            ))}
            {reportData.expenseSummary.expensesByCategory.length === 0 && (
              <p className="text-gray-500 text-center py-4">No expense data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {reportData.lowStockProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 text-red-600">Low Stock Alert</h3>
            <button
              onClick={() => exportToCSV(reportData.lowStockProducts, 'low_stock_products')}
              className="flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportData.lowStockProducts.map((product, index) => (
              <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-600">{product.sku}</p>
                <p className="text-sm text-red-600">
                  Stock: {product.current_stock} (Threshold: {product.threshold})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(reportData.salesSummary.totalSales)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Expenses</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData.expenseSummary.totalExpenses)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Net Profit</p>
            <p className={`text-2xl font-bold ${
              reportData.salesSummary.totalSales - reportData.expenseSummary.totalExpenses >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency(reportData.salesSummary.totalSales - reportData.expenseSummary.totalExpenses)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Most popular payment method: <span className="font-medium">{formatPaymentMethod(reportData.salesSummary.topPaymentMethod)}</span>
          </p>
          <p className="text-sm text-gray-600">
            New customers: <span className="font-medium">{reportData.customerStats.newCustomers}</span>
          </p>
        </div>
      </div>
    </div>
  )
}