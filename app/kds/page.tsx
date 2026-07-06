'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'

type Order = {
  id: string
  table_number: string
  total_amount: number
  status: 'pending' | 'in-progress' | 'completed' | 'voided'
  payment_status: 'pending' | 'paid' | 'failed'
  created_at: string
  order_items: any[]
}

const VOID_REASONS = [
  'Customer changed mind',
  'Kitchen out of stock',
  'Duplicate order',
  'Payment issue',
  'Other',
]

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<'board' | 'completed'>('board')

  // Void modal state
  const [voidingOrder, setVoidingOrder] = useState<Order | null>(null)
  const [voidPin, setVoidPin] = useState('')
  const [voidReason, setVoidReason] = useState(VOID_REASONS[0])
  const [voidError, setVoidError] = useState('')
  const [voidSubmitting, setVoidSubmitting] = useState(false)

  const ORDER_SELECT = `
    id,
    table_number,
    total_amount,
    status,
    payment_status,
    created_at,
    order_items (
      quantity,
      menu_items (
        name
      )
    )
  `

  const fetchOrders = async () => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    // Active orders (pending + in-progress) — no time limit, these must never disappear.
    // payment_status filter: only show orders that are paid, or still pending payment
    // (i.e. Cash on Delivery / not yet charged). Excludes 'failed' payments so the
    // kitchen never preps something nobody actually paid for.
    const activeQuery = supabase
      .from('orders')
      .select(ORDER_SELECT)
      .in('status', ['pending', 'in-progress'])
      .in('payment_status', ['pending', 'paid'])
      .order('created_at', { ascending: true })

    // Completed orders — only today's, to keep the KDS screen relevant.
    // Full history for reporting lives in /admin/reports instead.
    const completedQuery = supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('status', 'completed')
      .in('payment_status', ['pending', 'paid'])
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false })

    const [{ data: active, error: activeError }, { data: completed, error: completedError }] =
      await Promise.all([activeQuery, completedQuery])

    if (activeError) console.error('Error fetching active orders:', activeError)
    if (completedError) console.error('Error fetching completed orders:', completedError)

    setOrders([...(active || []), ...(completed || [])] as Order[])
  }

  useEffect(() => {
    fetchOrders()

    const subscription = supabase
      .channel('kitchen_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const updateStatus = async (orderId: string, status: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (error) alert('Error updating order: ' + error.message)
    // No manual state update needed — the real-time subscription refetches automatically.
  }

  const openVoidModal = (order: Order) => {
    setVoidingOrder(order)
    setVoidPin('')
    setVoidReason(VOID_REASONS[0])
    setVoidError('')
  }

  const closeVoidModal = () => {
    setVoidingOrder(null)
    setVoidPin('')
    setVoidReason(VOID_REASONS[0])
    setVoidError('')
  }

  const confirmVoid = async () => {
    if (!voidingOrder) return

    const correctPin = process.env.NEXT_PUBLIC_KDS_VOID_PIN
    if (!correctPin) {
      setVoidError('Void PIN is not configured. Contact your manager.')
      return
    }
    if (voidPin !== correctPin) {
      setVoidError('Incorrect PIN.')
      return
    }

    setVoidSubmitting(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'voided', void_reason: voidReason })
      .eq('id', voidingOrder.id)
    setVoidSubmitting(false)

    if (error) {
      setVoidError('Failed to void order: ' + error.message)
      return
    }

    closeVoidModal()
    // Real-time subscription will refetch and remove this order from the board automatically.
  }

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const inProgressOrders = orders.filter(o => o.status === 'in-progress')
  const completedTodayOrders = orders
    .filter(o => o.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const renderTicket = (order: Order) => (
    <div key={order.id} className="bg-white text-black rounded-xl p-5 shadow-2xl flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-3xl font-black text-[#5A189A]">{order.table_number}</h2>
        <span className="text-sm font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
          {formatTime(order.created_at)}
        </span>
      </div>

      <ul className="flex-1 space-y-4 mb-6">
        {order.order_items.map((item: any, i: number) => (
          <li key={i} className="flex font-bold text-lg items-center">
            <span className="mr-3 text-[#5A189A] bg-[#FFEA85] px-2 py-1 rounded-md text-sm">{item.quantity}x</span>
            <span className="leading-tight">{item.menu_items.name}</span>
          </li>
        ))}
      </ul>

      {order.status === 'pending' && (
        <div className="space-y-2">
          <button
            onClick={() => updateStatus(order.id, 'in-progress')}
            className="w-full bg-[#FFEA85] text-[#5A189A] py-4 rounded-xl font-bold text-lg hover:brightness-95 transition-colors active:scale-95"
          >
            Start Preparing →
          </button>
          <button
            onClick={() => openVoidModal(order)}
            className="w-full bg-white text-red-500 border border-red-200 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-50 transition-colors active:scale-95"
          >
            Void Order
          </button>
        </div>
      )}

      {order.status === 'in-progress' && (
        <button
          onClick={() => updateStatus(order.id, 'completed')}
          className="w-full bg-[#5A189A] text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-800 transition-colors active:scale-95"
        >
          Complete Ticket ✓
        </button>
      )}

      {order.status === 'completed' && (
        <button
          onClick={() => updateStatus(order.id, 'in-progress')}
          className="w-full bg-gray-100 text-gray-500 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors active:scale-95"
        >
          Undo (move back to In Progress)
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 p-6 font-sans text-white">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-[#FFEA85]">Ube House | KDS</h1>
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-green-400 font-bold tracking-widest text-sm uppercase">Live</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('board')}
          className={`px-5 py-2.5 rounded-full font-bold text-sm transition-colors ${
            activeTab === 'board'
              ? 'bg-[#FFEA85] text-[#5A189A]'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Active Board ({pendingOrders.length + inProgressOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-5 py-2.5 rounded-full font-bold text-sm transition-colors ${
            activeTab === 'completed'
              ? 'bg-[#FFEA85] text-[#5A189A]'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Completed Today ({completedTodayOrders.length})
        </button>
      </div>

      {/* Active Board: two columns, Pending | In Progress */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4">
              Pending — {pendingOrders.length}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingOrders.length === 0 ? (
                <p className="text-gray-600 col-span-full text-center mt-10 font-medium">Nothing waiting.</p>
              ) : (
                pendingOrders.map(renderTicket)
              )}
            </div>
          </div>

          <div>
            <h2 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-4">
              In Progress — {inProgressOrders.length}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {inProgressOrders.length === 0 ? (
                <p className="text-gray-600 col-span-full text-center mt-10 font-medium">Nothing cooking.</p>
              ) : (
                inProgressOrders.map(renderTicket)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completed Today: reference list, includes Undo */}
      {activeTab === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {completedTodayOrders.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center mt-20 text-xl font-medium">
              No completed orders yet today.
            </p>
          ) : (
            completedTodayOrders.map(renderTicket)
          )}
        </div>
      )}

      {/* Void confirmation modal */}
      {voidingOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white text-black rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-red-500 mb-1">Void {voidingOrder.table_number}?</h3>
            <p className="text-gray-500 text-sm mb-5">
              This cancels the order permanently. It stays on record for reporting — it will not be deleted.
            </p>

            <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
            <select
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
            >
              {VOID_REASONS.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700 mb-1">Manager PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={voidPin}
              onChange={(e) => setVoidPin(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 mb-2 focus:outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Enter PIN to confirm"
              autoFocus
            />

            {voidError && <p className="text-red-500 text-sm mb-3">{voidError}</p>}

            <div className="flex gap-3 mt-4">
              <button
                onClick={closeVoidModal}
                className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmVoid}
                disabled={voidSubmitting || !voidPin}
                className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-full hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {voidSubmitting ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
