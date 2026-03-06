'use client'

import { useState, useEffect, useCallback } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TOKEN_KEY = 'kiosk_token'

type Service     = { id: number; name: string; prefix: string; estimatedMinutes: number }
type KioskUser   = { id: number; name: string; role: string; locationId: number }
type TicketResult = { ticket: { ticketNumber: string; id: number }; service: { name: string } }

async function kioskFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Error ${res.status}`)
  }
  return res.json()
}

// ── Setup screen ───────────────────────────────────────────────────────
function SetupScreen({ onSuccess }: { onSuccess: (user: KioskUser) => void }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await kioskFetch<{ token: string; user: KioskUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (user.role !== 'kiosk') {
        setError('Akun ini bukan akun kiosk. Gunakan akun dengan role Kiosk.')
        return
      }
      if (!user.locationId) {
        setError('Akun kiosk belum di-assign ke lokasi. Hubungi admin.')
        return
      }
      localStorage.setItem(TOKEN_KEY, token)
      onSuccess(user)
    } catch (e: any) {
      setError(e.message ?? 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-kiosk bg-gray-950 flex flex-col items-center justify-center">
      <form onSubmit={submit} className="bg-gray-900 rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-blue-400 font-black text-3xl mb-1">SALE</div>
          <div className="text-white font-semibold text-xl">Setup Perangkat Kiosk</div>
          <div className="text-gray-500 text-sm mt-1">Masukkan akun kiosk yang dibuat admin</div>
        </div>

        {error && (
          <div className="bg-red-900/60 text-red-300 rounded-xl px-4 py-3 text-sm mb-5 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username kiosk"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-base"
            autoComplete="off"
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-4 font-bold text-lg transition-colors"
          >
            {loading ? 'Menghubungkan...' : 'Aktifkan Kiosk'}
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center mt-6">
          Setup hanya dilakukan sekali per perangkat
        </p>
      </form>
    </div>
  )
}

// ── Main kiosk page ────────────────────────────────────────────────────
export default function KioskPage() {
  const [user, setUser] = useState<KioskUser | null>(null)
  const [ready, setReady] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [result, setResult] = useState<TicketResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadServices = useCallback(async () => {
    try {
      const data = await kioskFetch<Service[]>('/api/services')
      setServices(data)
    } catch {
      setError('Gagal memuat layanan. Periksa koneksi.')
    }
  }, [])

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setReady(true); return }

    kioskFetch<KioskUser>('/api/auth/me')
      .then((u) => {
        if (u.role === 'kiosk' && u.locationId) {
          setUser(u)
          loadServices()
        } else {
          // Token ada tapi bukan akun kiosk — reset
          localStorage.removeItem(TOKEN_KEY)
        }
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true))
  }, [loadServices])

  function handleSetupSuccess(u: KioskUser) {
    setUser(u)
    loadServices()
  }

  function resetDevice() {
    if (!confirm('Reset perangkat ini? Perlu setup ulang oleh admin.')) return
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setServices([])
    setResult(null)
    setError(null)
  }

  async function takeNumber(serviceId: number) {
    setLoading(true)
    setError(null)
    try {
      const data = await kioskFetch<TicketResult>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({ serviceId }),
      })
      setResult(data)
      setTimeout(() => setResult(null), 8000)
    } catch (e: any) {
      setError(e.message ?? 'Gagal mengambil nomor antrian')
    } finally {
      setLoading(false)
    }
  }

  // Jangan render apapun sampai token dicek (hindari flicker)
  if (!ready) return null

  // Setup screen
  if (!user) return <SetupScreen onSuccess={handleSetupSuccess} />

  // Ticket result screen
  if (result) {
    return (
      <div className="page-kiosk bg-blue-900 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <div className="text-2xl mb-4 text-blue-200">{result.service.name}</div>
          <div className="text-[12rem] font-black leading-none tracking-tight text-white drop-shadow-2xl">
            {result.ticket.ticketNumber}
          </div>
          <div className="mt-8 text-xl text-blue-200">Nomor Antrian Anda</div>
          <div className="mt-2 text-blue-300 text-sm">Silakan tunggu, nomor akan dipanggil</div>
          <div className="mt-8 w-2 h-2 bg-blue-400 rounded-full mx-auto animate-pulse" />
        </div>
      </div>
    )
  }

  // Main kiosk screen
  return (
    <div className="page-kiosk bg-gray-950 flex flex-col">
      <header className="bg-blue-900 px-8 py-6 flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-2xl">SALE</div>
          <div className="text-blue-300 text-sm">Sistem Antrian Layanan ETLE</div>
        </div>
        <div className="text-right">
          <div className="text-white text-sm">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="text-blue-400 text-xs mt-0.5">{user.name}</div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <h2 className="text-white text-3xl font-semibold">Pilih Jenis Layanan</h2>

        {error && (
          <div className="bg-red-900 text-red-200 rounded-xl px-6 py-4 text-center max-w-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 w-full max-w-lg">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => takeNumber(service.id)}
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white rounded-2xl px-8 py-7 text-left transition-all duration-150 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl font-black text-blue-300">{service.prefix}</span>
                <div>
                  <div className="text-xl font-semibold">{service.name}</div>
                  <div className="text-blue-300 text-sm mt-1">
                    Estimasi {service.estimatedMinutes} menit per antrian
                  </div>
                </div>
              </div>
            </button>
          ))}

          {services.length === 0 && !error && (
            <div className="text-gray-500 text-center py-12">Memuat layanan...</div>
          )}
        </div>
      </main>

      <footer className="py-4 px-8 flex items-center justify-between text-gray-700 text-xs">
        <span>Sentuh tombol layanan untuk mengambil nomor antrian</span>
        <button onClick={resetDevice} className="hover:text-gray-500 transition-colors">
          Reset Perangkat
        </button>
      </footer>
    </div>
  )
}
