'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

type Tab = 'dashboard' | 'locations' | 'services' | 'counters' | 'users'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('sale_token')
    if (token) {
      api.auth.me().then(setUser).catch(() => {})
    }
  }, [])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { token, user } = await api.auth.login(loginForm.username, loginForm.password)
      localStorage.setItem('sale_token', token)
      setUser(user)
    } catch (err: any) {
      setLoginError(err.message ?? 'Login gagal')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <form onSubmit={login} className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <h1 className="text-white text-2xl font-bold mb-1">Admin SALE</h1>
          <p className="text-gray-400 text-sm mb-6">Masuk sebagai administrator</p>
          {loginError && (
            <div className="bg-red-900/50 text-red-300 rounded-lg px-4 py-3 text-sm mb-4">{loginError}</div>
          )}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-3 font-semibold transition-colors"
            >
              Masuk
            </button>
          </div>
        </form>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'locations', label: 'Lokasi' },
    { id: 'services', label: 'Layanan' },
    { id: 'counters', label: 'Loket' },
    { id: 'users', label: 'Pengguna' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col py-6 px-3 gap-1">
        <div className="px-3 mb-6">
          <div className="font-bold text-purple-400 text-lg">SALE Admin</div>
          <div className="text-gray-500 text-sm truncate">{user.name}</div>
        </div>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-purple-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => { localStorage.removeItem('sale_token'); setUser(null) }}
          className="text-left px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-red-400 transition-colors"
        >
          Keluar
        </button>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-auto">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'locations' && <DataTab title="Lokasi" endpoint="locations" />}
        {tab === 'services' && <DataTab title="Layanan" endpoint="services" />}
        {tab === 'counters' && <DataTab title="Loket" endpoint="counters" />}
        {tab === 'users' && <DataTab title="Pengguna" endpoint="users" />}
      </main>
    </div>
  )
}

function DashboardTab() {
  const [stats, setStats] = useState({ locations: 0, services: 0, counters: 0, users: 0 })

  useEffect(() => {
    Promise.all([
      api.locations.list(),
      api.services.list(),
      api.counters.list(),
    ]).then(([locs, svcs, ctrs]) => {
      setStats((s) => ({
        ...s,
        locations: locs.length,
        services: svcs.length,
        counters: ctrs.length,
      }))
    }).catch(() => {})
  }, [])

  const cards = [
    { label: 'Lokasi', value: stats.locations, color: 'bg-blue-900' },
    { label: 'Layanan', value: stats.services, color: 'bg-green-900' },
    { label: 'Loket', value: stats.counters, color: 'bg-orange-900' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className={`${c.color} rounded-xl p-6`}>
            <div className="text-gray-300 text-sm">{c.label}</div>
            <div className="text-4xl font-black mt-2">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-gray-900 rounded-xl p-6 text-gray-400 text-sm">
        <p className="font-semibold text-white mb-2">Navigasi cepat:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Gunakan menu sidebar untuk mengelola data master</li>
          <li>Tambah lokasi terlebih dahulu sebelum menambah layanan/loket</li>
          <li>Setiap petugas perlu diassign ke loket sebelum bisa login</li>
        </ul>
      </div>
    </div>
  )
}

function DataTab({ title, endpoint }: { title: string; endpoint: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loaders: Record<string, () => Promise<any[]>> = {
      locations: api.locations.list,
      services: api.services.list,
      counters: api.counters.list,
    }
    const loader = loaders[endpoint]
    if (loader) {
      loader().then(setData).catch(() => {}).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [endpoint])

  if (loading) return <div className="text-gray-500">Memuat...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <span className="text-gray-500 text-sm">{data.length} data</span>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        {data.length === 0 ? (
          <div className="p-8 text-center text-gray-600">Belum ada data</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                {Object.keys(data[0] ?? {}).slice(0, 5).map((k) => (
                  <th key={k} className="text-left px-4 py-3 text-gray-400 font-medium">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/50">
                  {Object.values(row).slice(0, 5).map((v: any, j) => (
                    <td key={j} className="px-4 py-3 text-gray-300 truncate max-w-xs">
                      {typeof v === 'boolean' ? (v ? 'Ya' : 'Tidak') : String(v ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
