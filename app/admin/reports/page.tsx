'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '../../../utils/browser'

type ReportOrder = {
  id: string
  table_number: string
  total_amount: number
  created_at: string
  void_reason?: string | null
  order_items: any[]
}

const ORDER_SELECT = `
  id,
  table_number,
  total_amount,
  created_at,
  void_reason,
  order_items (
    quantity,
    menu_items ( name )
  )
`

export default function SalesReport() {
  const supabase = createBrowserSupabaseClient()
  const [completedOrders, setCompletedOrders] = useState<ReportOrder[]>([])
  const [voidedOrders, setVoidedOrders] = useState<ReportOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      const [{ data: completed, error: completedError }, { data: voided, error: voidedError }] =
        await Promise.all([
          supabase
            .from('orders')
            .select(ORDER_SELECT)
            .eq('status', 'completed')
            .order('created_at', { ascending: false }),
          supabase
            .from('orders')
            .select(ORDER_SELECT)
            .eq('status', 'voided')
            .order('created_at', { ascending: false }),
        ])

      if (completedError) console.error('Error fetching completed orders:', completedError)
      if (voidedError) console.error('Error fetching voided orders:', voidedError)

      setCompletedOrders((completed || []) as ReportOrder[])
      setVoidedOrders((voided || []) as ReportOrder[])
      setLoading(false)
    }

    fetchReport()
  }, [])

  const totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.total_amount), 0)

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <main className="min-h-screen bg-[#F7F2FA] p-6 font-sans text-black">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#5A189A]">Sales Report</h1>
            <p className="text-gray-500 text-sm mt-1">Completed orders and cancellations, most recent first.</p>
          </div>
          <Link
            href="/admin"
            className="text-sm font-semibold text-gray-500 hover:text-[#5A189A] transition-colors"
          >
            ← Back to Menu
          </Link>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-[#5A189A] text-white rounded-2xl p-6">
            <p className="text-white/70 text-sm uppercase tracking-widest font-semibold">Total Revenue</p>
            <p className="text-3xl font-black mt-1">AED {totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-gray-400 text-sm uppercase tracking-widest font-semibold">Completed Orders</p>
            <p className="text-3xl font-black mt-1 text-gray-900">{completedOrders.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-red-400 text-sm uppercase tracking-widest font-semibold">Voided Orders</p>
            <p className="text-3xl font-black mt-1 text-red-500">{voidedOrders.length}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center mt-10">Loading report...</p>
        ) : (
          <>
            {/* Completed orders */}
            <h2 className="font-bold text-lg text-gray-900 mb-3">Completed Orders</h2>
            {completedOrders.length === 0 ? (
              <p className="text-gray-500 mb-10">No completed orders yet.</p>
            ) : (
              <div className="space-y-3 mb-10">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{order.table_number}</h3>
                        <p className="text-gray-400 text-xs">{formatDateTime(order.created_at)}</p>
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

            {/* Voided orders */}
            <h2 className="font-bold text-lg text-gray-900 mb-3">Voided Orders</h2>
            {voidedOrders.length === 0 ? (
              <p className="text-gray-500">No voided orders on record.</p>
            ) : (
              <div className="space-y-3">
                {voidedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-red-100"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{order.table_number}</h3>
                        <p className="text-gray-400 text-xs">{formatDateTime(order.created_at)}</p>
                      </div>
                      <p className="text-red-400 font-bold line-through">
                        AED {Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                    {order.void_reason && (
                      <p className="text-sm font-semibold text-red-500 bg-red-50 inline-block px-2 py-0.5 rounded-full mb-2">
                        Reason: {order.void_reason}
                      </p>
                    )}
                    <ul className="text-sm text-gray-500 space-y-0.5 mt-1">
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
          </>
        )}
      </div>
    </main>
  )
}
