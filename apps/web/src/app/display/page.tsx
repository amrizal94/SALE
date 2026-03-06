'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSSE } from '@/hooks/useSSE'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
const TOKEN_KEY = 'display_token'

type DisplayUser  = { id: number; name: string; role: string; locationId: number }
type CalledTicket = { ticketNumber: string; counterName: string; calledAt: string }
type WaitingGroup = { serviceId: number; serviceName: string; count: number }

async function displayFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
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

// ── Setup screen ────────────────────────────────────────────────────────────
function DisplaySetup({ onSuccess }: { onSuccess: (user: DisplayUser) => void }) {
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await displayFetch<{ token: string; user: DisplayUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (user.role !== 'display') {
        setError('Akun ini bukan akun display. Gunakan akun dengan role Display.')
        return
      }
      if (!user.locationId) {
        setError('Akun display belum di-assign ke lokasi. Hubungi admin.')
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
    <div className="page-display bg-gray-950 flex flex-col items-center justify-center">
      <form onSubmit={submit} className="bg-gray-900 rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-blue-400 font-black text-3xl mb-1">SALE</div>
          <div className="text-white font-semibold text-xl">Setup Perangkat Display</div>
          <div className="text-gray-500 text-sm mt-1">Masukkan akun display yang dibuat admin</div>
        </div>

        {error && (
          <div className="bg-red-900/60 text-red-300 rounded-xl px-4 py-3 text-sm mb-5 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username display"
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
            {loading ? 'Menghubungkan...' : 'Aktifkan Display'}
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center mt-6">
          Setup hanya dilakukan sekali per perangkat
        </p>
      </form>
    </div>
  )
}

// ── Main display ─────────────────────────────────────────────────────────────
function DisplayMain({ onReset }: { onReset: () => void }) {
  const [currentTicket, setCurrentTicket]   = useState<CalledTicket | null>(null)
  const [recentTickets, setRecentTickets]   = useState<CalledTicket[]>([])
  const [waitingGroups, setWaitingGroups]   = useState<WaitingGroup[]>([])
  const [isFlashing, setIsFlashing]         = useState(false)
  const [audioUnlocked, setAudioUnlocked]   = useState(false)
  const audioQueue  = useRef<string[]>([])
  const isSpeaking  = useRef(false)

  function unlockAudio() {
    // Trigger dummy utterance untuk unlock audio context Chrome
    const u = new SpeechSynthesisUtterance('')
    window.speechSynthesis.speak(u)
    window.speechSynthesis.cancel()
    setAudioUnlocked(true)
  }

  const loadWaiting = useCallback(async () => {
    try {
      const tickets = await displayFetch<any[]>('/api/tickets?status=waiting')
      // Group by service
      const map = new Map<number, WaitingGroup>()
      for (const t of tickets) {
        const svc = t.service
        if (!svc) continue
        if (!map.has(svc.id)) map.set(svc.id, { serviceId: svc.id, serviceName: svc.name, count: 0 })
        map.get(svc.id)!.count++
      }
      setWaitingGroups([...map.values()])
    } catch {}
  }, [])

  useEffect(() => { loadWaiting() }, [loadWaiting])

  // Workaround bug Chrome: speechSynthesis berhenti sendiri di background tab
  useEffect(() => {
    const id = setInterval(() => {
      if (window.speechSynthesis.speaking) return
      window.speechSynthesis.resume()
    }, 5000)
    return () => clearInterval(id)
  }, [])

  function flash() {
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 1500)
  }

  function speakNext() {
    if (isSpeaking.current || audioQueue.current.length === 0) return
    const text = audioQueue.current.shift()!
    isSpeaking.current = true
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'id-ID'
    utterance.rate = 0.85
    utterance.onend = () => {
      isSpeaking.current = false
      setTimeout(speakNext, 500)
    }
    window.speechSynthesis.speak(utterance)
  }

  function announceTicket(ticket: CalledTicket) {
    const number = ticket.ticketNumber.split('').join('-')
    const text   = `Nomor ${number}, silakan menuju ${ticket.counterName}`
    audioQueue.current.push(text)
    audioQueue.current.push(text)
    speakNext()
  }

  useSSE({
    ticket_issued: () => loadWaiting(),
    ticket_called: (data: { ticket: any; counter: any }) => {
      const called: CalledTicket = {
        ticketNumber: data.ticket.ticketNumber,
        counterName:  data.counter.name,
        calledAt:     new Date().toLocaleTimeString('id-ID'),
      }
      setCurrentTicket(called)
      setRecentTickets((prev) => [called, ...prev].slice(0, 5))
      flash()
      announceTicket(called)
      loadWaiting()
    },
    ticket_done:    () => loadWaiting(),
    ticket_skipped: () => loadWaiting(),
  }, TOKEN_KEY)

  return (
    <div
      className={`page-display text-white flex flex-col transition-colors duration-300 ${
        isFlashing ? 'bg-blue-950' : 'bg-gray-950'
      }`}
    >
      {/* Overlay unlock audio — muncul sampai user klik layar */}
      {!audioUnlocked && (
        <div
          onClick={unlockAudio}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 cursor-pointer"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">🔊</div>
            <div className="text-white text-2xl font-bold">Tap untuk mengaktifkan suara</div>
            <div className="text-gray-400 text-sm mt-2">Klik di mana saja untuk melanjutkan</div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-blue-900 px-10 py-4 flex items-center justify-between">
        <div className="font-bold text-xl tracking-wide">SALE — Layanan ETLE</div>
        <div className="text-blue-200 tabular-nums text-lg">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          <ClockDisplay />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex gap-0">
        {/* Kiri: nomor dipanggil */}
        <section className="flex-1 flex flex-col items-center justify-center border-r border-gray-800 px-12">
          <div className="text-gray-400 text-2xl mb-4 tracking-widest uppercase font-semibold">
            Nomor Dipanggil
          </div>

          {currentTicket ? (
            <div className={`text-center ${isFlashing ? 'animate-pulse' : ''}`}>
              <div
                className="text-[14rem] font-black leading-none tracking-tight text-yellow-400 drop-shadow-2xl"
                style={{ textShadow: '0 0 60px rgba(250, 204, 21, 0.4)' }}
              >
                {currentTicket.ticketNumber}
              </div>
              <div className="mt-6 text-3xl font-semibold text-blue-300">{currentTicket.counterName}</div>
              <div className="mt-2 text-gray-500 text-lg">{currentTicket.calledAt}</div>
            </div>
          ) : (
            <div className="text-gray-700 text-5xl font-bold">—</div>
          )}
        </section>

        {/* Kanan: antrian menunggu + riwayat */}
        <section className="w-80 flex flex-col px-6 py-8 gap-6 overflow-y-auto">
          {/* Waiting counts per service */}
          <div>
            <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-widest mb-3">
              Antrian Menunggu
            </h3>
            {waitingGroups.length === 0 ? (
              <div className="text-gray-700 text-sm text-center py-4">Tidak ada antrian</div>
            ) : (
              <div className="space-y-2">
                {waitingGroups.map((g) => (
                  <div key={g.serviceId} className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-gray-300 text-sm truncate">{g.serviceName}</span>
                    <span className="text-white font-black text-2xl ml-2">{g.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent calls */}
          <div>
            <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-widest mb-3">
              Baru Dipanggil
            </h3>
            {recentTickets.length === 0 ? (
              <div className="text-gray-700 text-sm text-center py-4">Belum ada panggilan</div>
            ) : (
              <div className="space-y-2">
                {recentTickets.map((t, i) => (
                  <div
                    key={`${t.ticketNumber}-${i}`}
                    className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
                      i === 0 ? 'bg-blue-900' : 'bg-gray-900'
                    }`}
                  >
                    <span className={`text-2xl font-black ${i === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {t.ticketNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${i === 0 ? 'text-blue-200' : 'text-gray-400'}`}>
                        {t.counterName}
                      </div>
                      <div className="text-xs text-gray-600">{t.calledAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 px-10 py-3 flex items-center justify-between text-sm text-gray-500">
        <span>Mohon perhatikan layar dan tunggu nomor Anda dipanggil</span>
        <button onClick={onReset} className="hover:text-gray-400 transition-colors">
          Reset Perangkat
        </button>
      </footer>
    </div>
  )
}

// ── Page orchestrator ────────────────────────────────────────────────────────
export default function DisplayPage() {
  const [user, setUser]   = useState<DisplayUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setReady(true); return }

    displayFetch<DisplayUser>('/api/auth/me')
      .then((u) => {
        if (u.role === 'display' && u.locationId) setUser(u)
        else localStorage.removeItem(TOKEN_KEY)
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true))
  }, [])

  function handleReset() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  if (!ready) return null
  if (!user) return <DisplaySetup onSuccess={setUser} />
  return <DisplayMain onReset={handleReset} />
}

function ClockDisplay() {
  const [time, setTime] = useState(new Date().toLocaleTimeString('id-ID'))
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('id-ID')), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="tabular-nums">{time}</span>
}
