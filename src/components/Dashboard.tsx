import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  Users
} from 'lucide-react'

interface DashboardStats {
  todaySales: number
  totalProducts: number
  lowStockCount: number
  totalCustomers: number
  todayTransactions: number
  topProducts: Array<{
    name: string
    total_sold: number
    revenue: number
  }>
  recentSales: Array<{
    id: string
    sale_number: string
    total_amount: number
    payment_method: string
    created_at: string
    profiles: {
      full_name: string
    }
  }>
}

export function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalCustomers: 0,
    todayTransactions: 0,
    topProducts: [],
    recentSales: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Today's sales
      const { data: todaySalesData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      const todaySales = todaySalesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const todayTransactions = todaySalesData?.length || 0

      // Total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Low stock count
      const { count: lowStockCount } = await supabase
        .from('low_stock_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('is_acknowledged', false)

      // Total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      // Top products (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: topProductsData } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          total_price,
          products (name)
        `)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(5)

      // Process top products
      const productMap = new Map()
      topProductsData?.forEach(item => {
        const productName = item.products?.name
        if (productName) {
          if (productMap.has(productName)) {
            const existing = productMap.get(productName)
            productMap.set(productName, {
              name: productName,
              total_sold: existing.total_sold + item.quantity,
              revenue: existing.revenue + item.total_price
            })
          } else {
            productMap.set(productName, {
              name: productName,
              total_sold: item.quantity,
              revenue: item.total_price
            })
          }
        }
      })

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 5)

      // Recent sales
      const { data: recentSalesData } = await supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          total_amount,
          payment_method,
          created_at,
          profiles (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        todaySales,
        totalProducts: totalProducts || 0,
        lowStockCount: lowStockCount || 0,
        totalCustomers: totalCustomers || 0,
        todayTransactions,
        topProducts,
        recentSales: recentSalesData || []
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.full_name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todaySales)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayTransactions}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products (Last 30 Days)</h3>
          <div className="space-y-4">
            {stats.topProducts.length > 0 ? (
              stats.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.total_sold} sold</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No sales data available</p>
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h3>
          <div className="space-y-4">
            {stats.recentSales.length > 0 ? (
              stats.recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{sale.sale_number}</p>
                    <p className="text-sm text-gray-600">
                      {sale.profiles?.full_name} • {formatPaymentMethod(sale.payment_method)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(sale.total_amount)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent sales</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}