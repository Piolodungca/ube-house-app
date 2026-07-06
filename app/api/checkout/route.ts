import { NextResponse } from 'next/server'

// PLACEHOLDER — once Stripe keys are available, this is where the real
// Stripe Checkout Session gets created. For now it just logs and returns
// a fake "success" so the frontend hook is proven to work end-to-end.
//
// When ready for real Stripe, this becomes roughly:
//
//   import Stripe from 'stripe'
//   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
//
//   const session = await stripe.checkout.sessions.create({
//     mode: 'payment',
//     line_items: cartItems.map(item => ({
//       price_data: {
//         currency: 'aed',
//         product_data: { name: item.name },
//         unit_amount: Math.round(item.price * 100), // Stripe wants cents/fils
//       },
//       quantity: 1,
//     })),
//     metadata: { orderId }, // lets the Stripe webhook know which order to mark 'paid'
//     success_url: `${origin}/?table=${tableNumber}&payment=success`,
//     cancel_url: `${origin}/?table=${tableNumber}&payment=cancelled`,
//   })
//
//   return NextResponse.json({ checkoutUrl: session.url })

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, tableNumber, amount } = body

    console.log('Initiating Stripe Payment', { orderId, tableNumber, amount })

    // No real Stripe session yet — just confirm the hook fired successfully.
    return NextResponse.json({
      success: true,
      checkoutUrl: null,
      message: 'Placeholder: Stripe not yet configured. Order proceeds as Cash on Delivery.',
    })
  } catch (error) {
    console.error('Checkout route error:', error)
    return NextResponse.json(
      { success: false, message: 'Checkout placeholder failed to process request.' },
      { status: 500 }
    )
  }
}
