'use client'

import { useState, useEffect, useRef } from 'react'
import { useSSE } from '@/hooks/useSSE'

type CalledTicket = {
  ticketNumber: string
  counterName: string
  counterCode: string
  serviceName: string
  calledAt: string
}

export default function DisplayPage() {
  const [currentTicket, setCurrentTicket] = useState<CalledTicket | null>(null)
  const [recentTickets, setRecentTickets] = useState<CalledTicket[]>([])
  const [isFlashing, setIsFlashing] = useState(false)
  const audioQueue = useRef<string[]>([])
  const isSpeaking = useRef(false)

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
      // Jeda 500ms antar panggilan
      setTimeout(speakNext, 500)
    }
    window.speechSynthesis.speak(utterance)
  }

  function announceTicket(ticket: CalledTicket) {
    // Format: "Nomor A-0-0-1, silakan menuju [Loket 1]"
    const number = ticket.ticketNumber.split('').join('-')
    const text = `Nomor ${number}, silakan menuju ${ticket.counterName}`
    audioQueue.current.push(text)
    // Ulangi 2x
    audioQueue.current.push(text)
    speakNext()
  }

  useSSE({
    ticket_called: (data: { ticket: any; counter: any }) => {
      const called: CalledTicket = {
        ticketNumber: data.ticket.ticket_number ?? data.ticket.ticketNumber,
        counterName: data.counter.name,
        counterCode: data.counter.code,
        serviceName: '',
        calledAt: new Date().toLocaleTimeString('id-ID'),
      }
      setCurrentTicket(called)
      setRecentTickets((prev) => [called, ...prev].slice(0, 5))
      flash()
      announceTicket(called)
    },
    ticket_done: () => {
      // Biarkan nomor terakhir tetap tampil
    },
  })

  const now = new Date()

  return (
    <div
      className={`page-display bg-gray-950 text-white flex flex-col transition-colors duration-300 ${
        isFlashing ? 'bg-blue-950' : 'bg-gray-950'
      }`}
    >
      {/* Header bar */}
      <header className="bg-blue-900 px-10 py-4 flex items-center justify-between">
        <div className="font-bold text-xl tracking-wide">SALE — Layanan ETLE</div>
        <div className="text-blue-200 tabular-nums text-lg">
          {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          <ClockDisplay />
        </div>
      </header>

      {/* Main display */}
      <main className="flex-1 flex gap-0">
        {/* Nomor dipanggil (kiri, besar) */}
        <section className="flex-1 flex flex-col items-center justify-center border-r border-gray-800 px-12">
          <div className="text-gray-400 text-2xl mb-4 tracking-widest uppercase font-semibold">
            Nomor Dipanggil
          </div>

          {currentTicket ? (
            <div className={`text-center ${isFlashing ? 'animate-pulse-slow' : ''}`}>
              <div
                className="text-[14rem] font-black leading-none tracking-tight text-yellow-400 drop-shadow-2xl"
                style={{ textShadow: '0 0 60px rgba(250, 204, 21, 0.4)' }}
              >
                {currentTicket.ticketNumber}
              </div>
              <div className="mt-6 text-3xl font-semibold text-blue-300">
                {currentTicket.counterName}
              </div>
              <div className="mt-2 text-gray-500 text-lg">{currentTicket.calledAt}</div>
            </div>
          ) : (
            <div className="text-gray-700 text-5xl font-bold">—</div>
          )}
        </section>

        {/* Riwayat panggilan (kanan) */}
        <section className="w-80 flex flex-col px-6 py-8 gap-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-widest mb-2">
            Baru Dipanggil
          </h3>
          {recentTickets.length === 0 && (
            <div className="text-gray-700 text-sm text-center mt-8">Belum ada panggilan</div>
          )}
          {recentTickets.map((t, i) => (
            <div
              key={`${t.ticketNumber}-${i}`}
              className={`rounded-xl px-5 py-4 flex items-center gap-4 ${
                i === 0 ? 'bg-blue-900' : 'bg-gray-900'
              }`}
            >
              <span className={`text-3xl font-black ${i === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
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
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 px-10 py-3 flex items-center justify-between text-sm text-gray-500">
        <span>Mohon perhatikan layar dan tunggu nomor Anda dipanggil</span>
        <span>SALE v1.0</span>
      </footer>
    </div>
  )
}

function ClockDisplay() {
  const [time, setTime] = useState(new Date().toLocaleTimeString('id-ID'))
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('id-ID')), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="tabular-nums">{time}</span>
}
