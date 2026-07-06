'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '../../utils/supabase/browser'

type MenuItem = {
  id: string
  name: string
  description: string
  price: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [items, setItems] = useState<MenuItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '' })
  const [saving, setSaving] = useState(false)

  const fetchItems = async () => {
    const { data, error } = await supabase.from('menu_items').select('*').order('name')
    if (error) console.error(error)
    else setItems(data || [])
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({ name: '', description: '', price: '' })
  }

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id)
    setForm({ name: item.name, description: item.description, price: String(item.price) })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
    }

    const { error } = editingId
      ? await supabase.from('menu_items').update(payload).eq('id', editingId)
      : await supabase.from('menu_items').insert([payload])

    setSaving(false)

    if (error) {
      alert('Save failed: ' + error.message)
      return
    }

    resetForm()
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) alert('Delete failed: ' + error.message)
    else fetchItems()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#F7F2FA] p-6 font-sans text-black">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#5A189A]">Menu Management</h1>
          <button
            onClick={handleSignOut}
            className="text-sm font-semibold text-gray-500 hover:text-[#5A189A] transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Add / Edit form */}
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 space-y-4"
        >
          <h2 className="font-bold text-lg text-gray-900">
            {editingId ? 'Edit Item' : 'Add New Item'}
          </h2>

          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5A189A]/30"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5A189A]/30 resize-none"
            rows={2}
          />
          <input
            required
            type="number"
            step="0.01"
            placeholder="Price (AED)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5A189A]/30"
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#5A189A] text-white font-bold px-6 py-2.5 rounded-full hover:bg-purple-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editingId ? 'Update Item' : 'Add Item'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-500 font-semibold px-4 py-2.5 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Existing items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center"
            >
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{item.name}</h3>
                <p className="text-gray-500 text-sm">{item.description}</p>
                <p className="text-[#5A189A] font-bold mt-1">AED {item.price}</p>
              </div>
              <button
                onClick={() => startEdit(item)}
                className="text-sm font-semibold text-[#5A189A] hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-sm font-semibold text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
