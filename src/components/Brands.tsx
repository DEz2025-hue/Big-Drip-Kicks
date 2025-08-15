import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, Edit, Trash2, Award, X } from 'lucide-react'

interface Brand {
  id: string
  name: string
  description: string | null
  created_at: string
}

export function Brands() {
  const { profile } = useAuth()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddBrand, setShowAddBrand] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)

  const [newBrand, setNewBrand] = useState({
    name: '',
    description: ''
  })

  // Only allow admin and staff access
  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return (
      <div className="text-center py-12">
        <Award className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">Only administrators and staff can manage brands.</p>
      </div>
    )
  }

  useEffect(() => {
    fetchBrands()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('brands')
        .insert([{
          name: newBrand.name,
          description: newBrand.description || null
        }])

      if (error) throw error

      setNewBrand({ name: '', description: '' })
      setShowAddBrand(false)
      fetchBrands()
    } catch (error) {
      console.error('Error adding brand:', error)
      alert('Error adding brand. Please try again.')
    }
  }

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBrand) return

    try {
      const { error } = await supabase
        .from('brands')
        .update({
          name: editingBrand.name,
          description: editingBrand.description || null
        })
        .eq('id', editingBrand.id)

      if (error) throw error

      setEditingBrand(null)
      fetchBrands()
    } catch (error) {
      console.error('Error updating brand:', error)
      alert('Error updating brand. Please try again.')
    }
  }

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId)

      if (error) throw error
      fetchBrands()
    } catch (error) {
      console.error('Error deleting brand:', error)
      alert('Error deleting brand. Please try again.')
    }
  }

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.description && brand.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-gray-600">Manage product brands</p>
        </div>
        <button
          onClick={() => setShowAddBrand(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Brand
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBrands.map((brand) => (
          <div key={brand.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">{brand.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(brand.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setEditingBrand(brand)}
                  className="p-2 text-gray-400 hover:text-blue-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteBrand(brand.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {brand.description && (
              <p className="text-sm text-gray-600">{brand.description}</p>
            )}
          </div>
        ))}
      </div>

      {filteredBrands.length === 0 && (
        <div className="text-center py-12">
          <Award className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No brands found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first brand.'}
          </p>
        </div>
      )}

      {/* Add Brand Modal */}
      {showAddBrand && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Brand</h2>
              <button onClick={() => setShowAddBrand(false)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddBrand} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newBrand.description}
                  onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddBrand(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {editingBrand && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Brand</h2>
              <button onClick={() => setEditingBrand(null)}>
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdateBrand} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  required
                  value={editingBrand.name}
                  onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={editingBrand.description || ''}
                  onChange={(e) => setEditingBrand({ ...editingBrand, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingBrand(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}