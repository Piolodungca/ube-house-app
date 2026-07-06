'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '../../../utils/browser'

type CompletedOrder = {
  id: string
  table_number: string
  total_amount: number
  created_at: string
  order_items: any[]
}

export default function SalesReport() {
  const supabase = createBrowserSupabaseClient()
  const [orders, setOrders] = useState<CompletedOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompletedOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          table_number,
          total_amount,
          created_at,
          order_items (
            quantity,
            menu_items ( name )
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sales report:', error)
      } else {
        setOrders((data || []) as CompletedOrder[])
      }
      setLoading(false)
    }

    fetchCompletedOrders()
  }, [])

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0)

  return (
    <main className="min-h-screen bg-[#F7F2FA] p-6 font-sans text-black">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#5A189A]">Sales Report</h1>
            <p className="text-gray-500 text-sm mt-1">All completed orders, most recent first.</p>
          </div>
          <Link
            href="/admin"
            className="text-sm font-semibold text-gray-500 hover:text-[#5A189A] transition-colors"
          >
            ← Back to Menu
          </Link>
        </div>

        {/* Revenue summary */}
        <div className="bg-[#5A189A] text-white rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm uppercase tracking-widest font-semibold">Total Revenue</p>
            <p className="text-4xl font-black mt-1">AED {totalRevenue.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm uppercase tracking-widest font-semibold">Completed Orders</p>
            <p className="text-4xl font-black mt-1">{orders.length}</p>
          </div>
        </div>

        {/* Orders list */}
        {loading ? (
          <p className="text-gray-500 text-center mt-10">Loading report...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">No completed orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{order.table_number}</h3>
                    <p className="text-gray-400 text-xs">
                      {new Date(order.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="text-[#5A189A] font-bold">AED {Number(order.total_amount).toFixed(2)}</p>
                </div>
                <ul className="text-sm text-gray-500 space-y-0.5 mt-2">
                  {order.order_items.map((item: any, i: number) => (
                    <li key={i}>
                      {item.quantity}x {item.menu_items?.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
