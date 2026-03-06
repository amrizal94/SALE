'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useSSE } from '@/hooks/useSSE'

type Ticket = {
  id: number
  ticketNumber: string
  status: 'waiting' | 'calling' | 'serving' | 'done' | 'skipped' | 'expired'
  service?: { name: string; prefix: string }
  issuedAt: string
}

type User = { id: number; name: string; role: string; counterId: number; locationId: number }

export default function CounterPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')

  const loadTickets = useCallback(async () => {
    try {
      const data = await api.tickets.list({ status: 'waiting' })
      setTickets(data)
    } catch {}
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('sale_token')
    if (token) {
      api.auth.me().then((u) => { setUser(u); loadTickets() }).catch(() => {})
    }
  }, [loadTickets])

  useSSE({
    ticket_issued: () => loadTickets(),
    ticket_called: () => {
      // Hanya reload list antrian — activeTicket sudah di-set langsung dari response callNext()
      // Tidak set activeTicket di sini agar counter lain tidak ikut terpengaruh
      loadTickets()
    },
    ticket_done: (data) => {
      setActiveTicket((cur) => (cur?.id === data.ticket?.id ? null : cur))
      loadTickets()
    },
    ticket_skipped: (data) => {
      setActiveTicket((cur) => (cur?.id === data.ticket?.id ? null : cur))
      loadTickets()
    },
  })

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    try {
      const { token, user } = await api.auth.login(loginForm.username, loginForm.password)
      localStorage.setItem('sale_token', token)
      setUser(user)
      loadTickets()
    } catch (err: any) {
      setLoginError(err.message ?? 'Login gagal')
    }
  }

  async function callNext() {
    if (!user?.counterId) return
    setLoading(true)
    try {
      const ticket = await api.tickets.callNext(user.counterId)
      setActiveTicket(ticket)
      await loadTickets()
    } catch (err: any) {
      alert(err.message ?? 'Tidak ada antrian')
    } finally {
      setLoading(false)
    }
  }

  async function action(type: 'serve' | 'done' | 'skip') {
    if (!activeTicket) return
    setLoading(true)
    try {
      if (type === 'serve') {
        await api.tickets.serve(activeTicket.id)
        setActiveTicket((cur) => cur ? { ...cur, status: 'serving' } : null)
      }
      if (type === 'done') { await api.tickets.done(activeTicket.id); setActiveTicket(null) }
      if (type === 'skip') { await api.tickets.skip(activeTicket.id); setActiveTicket(null) }
      await loadTickets()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('sale_token')
    setUser(null)
    setTickets([])
    setActiveTicket(null)
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <form onSubmit={login} className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <h1 className="text-white text-2xl font-bold mb-1">Login Petugas</h1>
          <p className="text-gray-400 text-sm mb-6">Dashboard Loket SALE</p>

          {loginError && (
            <div className="bg-red-900/50 text-red-300 rounded-lg px-4 py-3 text-sm mb-4">
              {loginError}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-semibold transition-colors"
            >
              Masuk
            </button>
          </div>
        </form>
      </div>
    )
  }

  const waitingCount = tickets.filter((t) => t.status === 'waiting').length

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-green-900 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg">Loket Petugas</div>
          <div className="text-green-300 text-sm">{user.name}</div>
        </div>
        <button onClick={logout} className="text-green-300 hover:text-white text-sm transition-colors">
          Keluar
        </button>
      </header>

      <div className="flex flex-1 gap-0">
        {/* Panel kiri: Aksi */}
        <section className="w-80 border-r border-gray-800 flex flex-col p-6 gap-4">
          {/* Status antrian */}
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="text-gray-400 text-sm">Menunggu</div>
            <div className="text-4xl font-black text-white mt-1">{waitingCount}</div>
          </div>

          {/* Tiket aktif */}
          {activeTicket && (
            <div className="bg-blue-900 rounded-xl p-4">
              <div className="text-blue-300 text-sm mb-1">Sedang Dilayani</div>
              <div className="text-5xl font-black text-yellow-400">{activeTicket.ticketNumber}</div>
              <div className="text-blue-200 text-sm mt-2">{activeTicket.service?.name}</div>
            </div>
          )}

          {/* Tombol aksi */}
          <button
            onClick={callNext}
            disabled={loading || !!activeTicket}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white rounded-xl py-4 font-bold text-lg transition-colors"
          >
            Panggil Berikutnya
          </button>

          {activeTicket && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => action('serve')}
                disabled={loading || activeTicket.status === 'serving'}
                className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl py-3 font-semibold transition-colors"
              >
                Layani
              </button>
              <button
                onClick={() => action('skip')}
                disabled={loading}
                className="bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl py-3 font-semibold transition-colors"
              >
                Lewati
              </button>
              <button
                onClick={() => action('done')}
                disabled={loading}
                className="col-span-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-xl py-3 font-semibold transition-colors"
              >
                Selesai
              </button>
            </div>
          )}
        </section>

        {/* Panel kanan: Daftar antrian */}
        <section className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-gray-400 font-semibold text-sm uppercase tracking-widest mb-4">
            Antrian Menunggu
          </h2>
          <div className="space-y-2">
            {tickets.filter((t) => t.status === 'waiting').map((ticket) => (
              <div
                key={ticket.id}
                className="bg-gray-900 rounded-xl px-5 py-4 flex items-center gap-4"
              >
                <span className="text-2xl font-black text-white w-16">{ticket.ticketNumber}</span>
                <div className="flex-1">
                  <div className="text-gray-300 text-sm">{ticket.service?.name}</div>
                  <div className="text-gray-600 text-xs mt-0.5">
                    {new Date(ticket.issuedAt).toLocaleTimeString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
            {waitingCount === 0 && (
              <div className="text-gray-700 text-center py-12">Tidak ada antrian menunggu</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
