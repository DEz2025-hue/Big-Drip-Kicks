import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  User,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  Shield,
  Activity
} from 'lucide-react'

interface AuditLog {
  id: string
  user_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string | null
  old_values: any
  new_values: any
  created_at: string
  profiles?: {
    full_name: string
    email: string
  }
}

const TABLE_DISPLAY_NAMES = {
  products: 'Products',
  profiles: 'Users',
  customers: 'Customers',
  expenses: 'Expenses',
  sales: 'Sales',
  categories: 'Categories',
  brands: 'Brands',
  sale_items: 'Sale Items'
}

const ACTION_COLORS = {
  INSERT: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800'
}

const TABLE_ICONS = {
  products: Package,
  profiles: User,
  customers: Users,
  expenses: DollarSign,
  sales: ShoppingCart,
  categories: Filter,
  brands: Shield,
  sale_items: Activity
}

export function AuditLogs() {
  const { profile } = useAuth()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTable, setSelectedTable] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [viewingLog, setViewingLog] = useState<AuditLog | null>(null)

  // Only allow admin access
  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">Only administrators can view audit logs.</p>
      </div>
    )
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500)

      if (dateRange.start) {
        query = query.gte('created_at', `${dateRange.start}T00:00:00`)
      }
      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59`)
      }

      const { data, error } = await query

      if (error) throw error
      setAuditLogs(data || [])
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTable = !selectedTable || log.table_name === selectedTable
    const matchesAction = !selectedAction || log.action === selectedAction

    return matchesSearch && matchesTable && matchesAction
  })

  const exportToCSV = () => {
    const csvData = filteredLogs.map(log => ({
      timestamp: new Date(log.created_at).toLocaleString(),
      user: log.profiles?.full_name || 'System',
      email: log.profiles?.email || 'N/A',
      action: log.action,
      table: TABLE_DISPLAY_NAMES[log.table_name as keyof typeof TABLE_DISPLAY_NAMES] || log.table_name,
      record_id: log.record_id || 'N/A'
    }))

    const headers = Object.keys(csvData[0]).join(',')
    const rows = csvData.map(row => Object.values(row).join(','))
    const csvContent = `${headers}\n${rows.join('\n')}`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getChangesSummary = (log: AuditLog) => {
    if (log.action === 'INSERT') {
      return 'Record created'
    } else if (log.action === 'DELETE') {
      return 'Record deleted'
    } else if (log.action === 'UPDATE' && log.old_values && log.new_values) {
      const changes = []
      for (const key in log.new_values) {
        if (log.old_values[key] !== log.new_values[key] && key !== 'updated_at') {
          changes.push(key)
        }
      }
      return changes.length > 0 ? `Updated: ${changes.join(', ')}` : 'No significant changes'
    }
    return 'Unknown change'
  }

  const uniqueTables = [...new Set(auditLogs.map(log => log.table_name))]
  const uniqueActions = [...new Set(auditLogs.map(log => log.action))]

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
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">Track all system activities and changes</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Tables</option>
            {uniqueTables.map((table) => (
              <option key={table} value={table}>
                {TABLE_DISPLAY_NAMES[table as keyof typeof TABLE_DISPLAY_NAMES] || table}
              </option>
            ))}
          </select>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => {
              setDateRange({ ...dateRange, start: e.target.value })
              setTimeout(fetchAuditLogs, 100)
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Start date"
          />

          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => {
              setDateRange({ ...dateRange, end: e.target.value })
              setTimeout(fetchAuditLogs, 100)
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="End date"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => {
                const TableIcon = TABLE_ICONS[log.table_name as keyof typeof TABLE_ICONS] || Activity
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(log.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.profiles?.full_name || 'System'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.profiles?.email || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ACTION_COLORS[log.action]
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TableIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {TABLE_DISPLAY_NAMES[log.table_name as keyof typeof TABLE_DISPLAY_NAMES] || log.table_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {getChangesSummary(log)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setViewingLog(log)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedTable || selectedAction || dateRange.start || dateRange.end
              ? 'Try adjusting your filters.'
              : 'System activities will appear here.'}
          </p>
        </div>
      )}

      {/* View Log Details Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Audit Log Details</h2>
              <button onClick={() => setViewingLog(null)}>
                <Eye className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(viewingLog.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {viewingLog.profiles?.full_name || 'System'} ({viewingLog.profiles?.email || 'N/A'})
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    ACTION_COLORS[viewingLog.action]
                  }`}>
                    {viewingLog.action}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Table</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {TABLE_DISPLAY_NAMES[viewingLog.table_name as keyof typeof TABLE_DISPLAY_NAMES] || viewingLog.table_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Record ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">
                    {viewingLog.record_id || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Data Changes */}
              <div className="space-y-4">
                {viewingLog.old_values && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Old Values</label>
                    <pre className="bg-red-50 border border-red-200 rounded-md p-3 text-xs overflow-auto max-h-40">
                      {JSON.stringify(viewingLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {viewingLog.new_values && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Values</label>
                    <pre className="bg-green-50 border border-green-200 rounded-md p-3 text-xs overflow-auto max-h-40">
                      {JSON.stringify(viewingLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingLog(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}