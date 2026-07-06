'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../utils/supabase'

function OrderingPage() {
  const searchParams = useSearchParams()
  const [tableNumber, setTableNumber] = useState<string>('')
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [isOrdering, setIsOrdering] = useState(false)

  // Resolve table number: URL param wins, falls back to sessionStorage,
  // falls back to "Walk-in" if someone opens the page with no ?table= at all.
  useEffect(() => {
    const fromUrl = searchParams.get('table')
    if (fromUrl) {
      sessionStorage.setItem('ube_table_number', fromUrl)
      setTableNumber(fromUrl)
    } else {
      const stored = sessionStorage.getItem('ube_table_number')
      setTableNumber(stored || 'Walk-in')
    }
  }, [searchParams])

  // Fetch the menu when the page loads
  useEffect(() => {
    const fetchMenu = async () => {
      const { data, error } = await supabase.from('menu_items').select('*')
      if (error) console.error('Error fetching menu:', error)
      else setMenuItems(data || [])
    }
    fetchMenu()
  }, [])

  const addToCart = (item: any) => {
    setCart([...cart, item])
  }

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price), 0)

  const submitOrder = async () => {
    if (cart.length === 0) return
    setIsOrdering(true)

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ table_number: `Table ${tableNumber}`, total_amount: cartTotal }])
        .select()

      if (orderError) throw orderError
      const newOrderId = orderData[0].id

      const itemsToInsert = cart.map(item => ({
        order_id: newOrderId,
        menu_item_id: item.id,
        quantity: 1
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // Hook point for Stripe: call the checkout API route so the payment
      // flow is wired end-to-end. Right now this is a placeholder — it does
      // not block the order, since there's no real Stripe integration yet
      // and the current flow is effectively Cash on Delivery.
      try {
        const checkoutResponse = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: newOrderId,
            tableNumber,
            amount: cartTotal,
          }),
        })
        const checkoutResult = await checkoutResponse.json()
        console.log('Checkout hook response:', checkoutResult)
      } catch (checkoutError) {
        // Don't block the order over the payment placeholder — just log it.
        console.warn('Checkout hook failed (non-blocking):', checkoutError)
      }

      alert('Order successfully sent to the kitchen! 🚀')
      setCart([])
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsOrdering(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F2FA] p-6 pb-32 font-sans text-black relative">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-4xl font-bold text-[#5A189A] mb-2 tracking-wide">
          Ube House
        </h1>
        <p className="text-gray-600 mb-8 font-medium tracking-widest uppercase text-sm">
          Table {tableNumber} • Live Order
        </p>

        <div className="space-y-4">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-gray-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-[#F7F2FA] flex items-center justify-center flex-shrink-0 text-2xl">
                  🍮
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
                <p className="text-gray-500 text-sm mt-1">{item.description}</p>
                <p className="text-[#5A189A] font-bold mt-2">AED {item.price}</p>
              </div>
              <button
                onClick={() => addToCart(item)}
                className="bg-[#FFEA85] text-[#5A189A] px-5 py-2.5 rounded-full text-sm font-bold shadow-sm hover:scale-105 transition-transform active:scale-95"
              >
                Add +
              </button>
            </div>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center">
          <div className="bg-[#5A189A] text-white w-full max-w-2xl rounded-full p-2 pl-6 pr-2 shadow-2xl flex items-center justify-between">
            <div className="font-medium">
              <span className="bg-white/20 px-2 py-1 rounded-full text-sm mr-2">{cart.length}</span>
              Total: AED {cartTotal}
            </div>
            <button
              onClick={submitOrder}
              disabled={isOrdering}
              className="bg-[#FFEA85] text-[#5A189A] px-6 py-3 rounded-full font-bold hover:brightness-95 disabled:opacity-50 transition-all"
            >
              {isOrdering ? 'Sending...' : 'Place Order →'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

// useSearchParams requires a Suspense boundary around the component that calls it
export default function Home() {
  return (
    <Suspense fallback={null}>
      <OrderingPage />
    </Suspense>
  )
}
