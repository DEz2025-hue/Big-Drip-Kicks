import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface LowStockAlert {
  id: string
  product_id: string
  current_stock: number
  threshold: number
  is_acknowledged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
  products: {
    name: string
    sku: string
  }
}

export function useLowStockAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('low_stock_alerts')
        .select(`
          *,
          products (
            name,
            sku
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAlerts(data || [])
    } catch (error) {
      console.error('Error fetching low stock alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('low_stock_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId)

      if (error) throw error
      await fetchAlerts()
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  useEffect(() => {
    fetchAlerts()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('low_stock_alerts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'low_stock_alerts' },
        () => {
          fetchAlerts()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const unacknowledgedCount = alerts.filter(alert => !alert.is_acknowledged).length

  return {
    alerts,
    loading,
    unacknowledgedCount,
    acknowledgeAlert,
    refetch: fetchAlerts
  }
}