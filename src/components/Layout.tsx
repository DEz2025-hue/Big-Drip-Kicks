import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  AlertTriangle,
  Activity,
  Tag,
  Award
} from 'lucide-react'
import { useLowStockAlerts } from '../hooks/useLowStockAlerts'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
}

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const { profile, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { alerts, unacknowledgedCount } = useLowStockAlerts()

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'dashboard', roles: ['admin', 'staff', 'cashier'] },
    { name: 'Inventory', icon: Package, page: 'inventory', roles: ['admin', 'staff'] },
    { name: 'Sales', icon: ShoppingCart, page: 'sales', roles: ['admin', 'staff', 'cashier'] },
    { name: 'Customers', icon: Users, page: 'customers', roles: ['admin', 'staff'] },
    { name: 'Categories', icon: Tag, page: 'categories', roles: ['admin', 'staff'] },
    { name: 'Brands', icon: Award, page: 'brands', roles: ['admin', 'staff'] },
    { name: 'Expenses', icon: DollarSign, page: 'expenses', roles: ['admin', 'staff'] },
    { name: 'Reports', icon: BarChart3, page: 'reports', roles: ['admin', 'staff'] },
    { name: 'Audit Logs', icon: Activity, page: 'audit', roles: ['admin'] },
    { name: 'Users', icon: Settings, page: 'users', roles: ['admin'] },
  ]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(profile?.role || '')
  )

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Big Drip Logo" 
                className="h-8 w-auto mr-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <h1 className="text-xl font-bold text-gray-900">Big Drip Kicks</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {filteredNavigation.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  onPageChange(item.page)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === item.page
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
                {item.page === 'inventory' && unacknowledgedCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {unacknowledgedCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Big Drip Logo" 
                className="h-8 w-auto mr-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <h1 className="text-xl font-bold text-gray-900">Big Drip Kicks</h1>
            </div>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {filteredNavigation.map((item) => (
              <button
                key={item.name}
                onClick={() => onPageChange(item.page)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  currentPage === item.page
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
                {item.page === 'inventory' && unacknowledgedCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {unacknowledgedCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-3 p-2 text-gray-400 hover:text-gray-600"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Low stock alerts */}
              {(profile?.role === 'admin' || profile?.role === 'staff') && unacknowledgedCount > 0 && (
                <button
                  onClick={() => onPageChange('inventory')}
                  className="relative p-2 text-gray-400 hover:text-gray-500"
                >
                  <Bell className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {unacknowledgedCount}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}