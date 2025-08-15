import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, X, TrendingDown } from 'lucide-react'

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  recorded_by: string
  expense_date: string
  created_at: string
  profiles?: { full_name: string }
}

const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Inventory Purchase',
  'Marketing',
  'Transportation',
  'Office Supplies',
  'Equipment',
  'Insurance',
  'Professional Services',
  'Maintenance',
  'Other'
]

export function Expenses() {
  const { profile } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    category: '',
    expense_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          profiles (full_name)
        `)
        .order('expense_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          ...newExpense,
          recorded_by: profile?.id
        }])

      if (error) throw error

      setNewExpense({
        description: '',
        amount: 0,
        category: '',
        expense_date: new Date().toISOString().split('T')[0]
      })
      setShowAddExpense(false)
      fetchExpenses()
    } catch (error) {
      console.error('Error adding expense:', error)
      alert('Error adding expense. Please try again.')
    }
  }

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          description: editingExpense.description,
          amount: editingExpense.amount,
          category: editingExpense.category,
          expense_date: editingExpense.expense_date
        })
        .eq('id', editingExpense.id)

      if (error) throw error

      setEditingExpense(null)
      fetchExpenses()
    } catch (error) {
      console.error('Error updating expense:', error)
      alert('Error updating expense. Please try again.')
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Error deleting expense. Please try again.')
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || expense.category === selectedCategory
    const matchesMonth = !selectedMonth || expense.expense_date.startsWith(selectedMonth)
    
    return matchesSearch && matchesCategory && matchesMonth
  })

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  const expensesByCategory = EXPENSE_CATEGORIES.map(category => {
    const categoryExpenses = filteredExpenses.filter(expense => expense.category === category)
    const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    return { category, total, count: categoryExpenses.length }
  }).filter(item => item.total > 0)

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
          <h1 className="text-2xl font-bold text-gray-900">Expense Tracking</h1>
          <p className="text-gray-600">Track and manage business expenses</p>
        </div>
        <button
          onClick={() => setShowAddExpense(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Expense</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredExpenses.length > 0 ? formatCurrency(totalExpenses / filteredExpenses.length) : '$0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Expense Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recorded By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(expense.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{expense.profiles?.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
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
            {filteredExpenses.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedCategory || selectedMonth 
                    ? 'Try adjusting your filters.' 
                    : 'Get started by adding your first expense.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          <div className="space-y-4">
            {expensesByCategory.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.category}</p>
                  <p className="text-sm text-gray-600">{item.count} expense{item.count !== 1 ? 's' : ''}</p>
                </div>
                <p className="font-semibold text-gray-900">{formatCurrency(item.total)}</p>
              </div>
            ))}
            {expensesByCategory.length === 0 && (
              <p className="text-gray-500 text-center py-4">No expenses to categorize</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Expense</h2>
              <button onClick={() => setShowAddExpense(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description *</label>
                <input
                  type="text"
                  required
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter expense description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <select
                  required
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Category</option>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  required
                  value={newExpense.expense_date}
                  onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Expense</h2>
              <button onClick={() => setEditingExpense(null)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description *</label>
                <input
                  type="text"
                  required
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <select
                  required
                  value={editingExpense.category}
                  onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Category</option>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  required
                  value={editingExpense.expense_date}
                  onChange={(e) => setEditingExpense({ ...editingExpense, expense_date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}