import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: use getUser(), not getSession() — getUser() re-validates
  // the token against Supabase Auth on every request. getSession() only
  // reads the (spoofable) cookie payload.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginRoute = pathname === '/admin/login'

  if (pathname.startsWith('/admin') && !isLoginRoute && !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (isLoginRoute && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
