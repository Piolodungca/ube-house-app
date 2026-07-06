'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '../../../utils/supabase/browser'

export default function AdminLogin() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh() // ensures Proxy re-checks the now-valid session
  }

  return (
    <main className="min-h-screen bg-[#F7F2FA] flex items-center justify-center p-6">
      <form
        onSubmit={handleLogin}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-[#5A189A] mb-1">Ube House Admin</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to manage the menu.</p>

        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-[#5A189A]/30"
        />

        <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 mb-6 focus:outline-none focus:ring-2 focus:ring-[#5A189A]/30"
        />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#5A189A] text-white font-bold py-3 rounded-full hover:bg-purple-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}
