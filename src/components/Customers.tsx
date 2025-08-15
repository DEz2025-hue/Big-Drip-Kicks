import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Edit, Trash2, User, Phone, Mail, MapPin, X, ShoppingBag } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

interface CustomerSale {
  id: string
  sale_number: string
  total_amount: number
  payment_method: string
  created_at: string
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSales, setCustomerSales] = useState<CustomerSale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerSales = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('id, sale_number, total_amount, payment_method, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomerSales(data || [])
    } catch (error) {
      console.error('Error fetching customer sales:', error)
    }
  }

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('customers')
        .insert([{
          ...newCustomer,
          phone: newCustomer.phone || null,
          email: newCustomer.email || null,
          address: newCustomer.address || null
        }])

      if (error) throw error

      setNewCustomer({ name: '', phone: '', email: '', address: '' })
      setShowAddCustomer(false)
      fetchCustomers()
    } catch (error) {
      console.error('Error adding customer:', error)
      alert('Error adding customer. Please try again.')
    }
  }

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCustomer) return

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editingCustomer.name,
          phone: editingCustomer.phone || null,
          email: editingCustomer.email || null,
          address: editingCustomer.address || null
        })
        .eq('id', editingCustomer.id)

      if (error) throw error

      setEditingCustomer(null)
      fetchCustomers()
    } catch (error) {
      console.error('Error updating customer:', error)
      alert('Error updating customer. Please try again.')
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (error) throw error
      fetchCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('Error deleting customer. Please try again.')
    }
  }

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer)
    fetchCustomerSales(customer.id)
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm)) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage customer profiles and purchase history</p>
        </div>
        <button
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search customers by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                  <p className="text-sm text-gray-500">
                    Added {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleViewCustomer(customer)}
                  className="p-2 text-gray-400 hover:text-blue-600"
                >
                  <ShoppingBag className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingCustomer(customer)}
                  className="p-2 text-gray-400 hover:text-blue-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteCustomer(customer.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {customer.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {customer.email}
                </div>
              )}
              {customer.address && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  {customer.address}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first customer.'}
          </p>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
              <button onClick={() => setShowAddCustomer(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
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
                  onClick={() => setShowAddCustomer(false)}
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

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Customer</h2>
              <button onClick={() => setEditingCustomer(null)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Customer Details</h2>
              <button onClick={() => setViewingCustomer(null)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-gray-900">{viewingCustomer.name}</h3>
                  <p className="text-gray-600">
                    Customer since {new Date(viewingCustomer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewingCustomer.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-700">{viewingCustomer.phone}</span>
                  </div>
                )}
                {viewingCustomer.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-700">{viewingCustomer.email}</span>
                  </div>
                )}
                {viewingCustomer.address && (
                  <div className="flex items-center col-span-2">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-700">{viewingCustomer.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Purchase History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase History</h3>
              {customerSales.length > 0 ? (
                <div className="space-y-3">
                  {customerSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{sale.sale_number}</p>
                        <p className="text-sm text-gray-600">
                          {formatPaymentMethod(sale.payment_method)} • {new Date(sale.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">{formatCurrency(sale.total_amount)}</p>
                    </div>
                  ))}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Total Purchases:</span>
                      <span className="text-xl font-bold text-blue-600">
                        {formatCurrency(customerSales.reduce((sum, sale) => sum + sale.total_amount, 0))}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {customerSales.length} transaction{customerSales.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No purchase history available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}