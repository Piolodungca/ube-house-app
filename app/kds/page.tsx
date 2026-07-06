'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<any[]>([])

  // 1. Fetch pending orders and all their specific drinks/food
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, 
        table_number, 
        total_amount, 
        status,
        created_at,
        order_items (
          quantity,
          menu_items (
            name
          )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) console.error('Error fetching orders:', error)
    else setOrders(data || [])
  }

  useEffect(() => {
    // Load existing orders right away
    fetchOrders()

    // 2. THE MAGIC: Listen to the database for live updates
    const subscription = supabase
      .channel('kitchen_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        fetchOrders() // Instantly refresh the tickets when database changes
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  // 3. Mark the order as complete
  const completeOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId)
    
    if (error) alert('Error completing order!')
    // We don't even need to call fetchOrders() here, because the real-time listener will instantly detect the update and remove the ticket!
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6 font-sans text-white">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-[#FFEA85]">Ube House | KDS</h1>
        <div className="flex items-center gap-3">
           <span className="relative flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
           </span>
           <span className="text-green-400 font-bold tracking-widest text-sm uppercase">Live</span>
        </div>
      </header>

      {/* Ticket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {orders.length === 0 ? (
          <p className="text-gray-500 col-span-full text-center mt-20 text-xl font-medium">No pending orders. Kitchen is clear!</p>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white text-black rounded-xl p-5 shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                <h2 className="text-3xl font-black text-[#5A189A]">{order.table_number}</h2>
                <span className="text-sm font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                   {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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

              <button 
                onClick={() => completeOrder(order.id)}
                className="w-full bg-[#5A189A] text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-800 transition-colors active:scale-95"
              >
                Complete Ticket ✓
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}