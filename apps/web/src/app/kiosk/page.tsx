'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

type Service = { id: number; name: string; prefix: string; estimatedMinutes: number }
type TicketResult = { ticket: { ticketNumber: string; id: number }; service: { name: string } }

export default function KioskPage() {
  const [services, setServices] = useState<Service[]>([])
  const [result, setResult] = useState<TicketResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Kiosk auth: gunakan token kiosk yang disimpan di env/config lokal
    const token = localStorage.getItem('sale_token')
    if (!token) {
      setError('Token kiosk belum dikonfigurasi. Hubungi admin.')
      return
    }
    api.services.list().then(setServices).catch(() => setError('Gagal memuat layanan'))
  }, [])

  async function takeNumber(serviceId: number) {
    setLoading(true)
    setError(null)
    try {
      const data = await api.tickets.create(serviceId)
      setResult(data)
      // Auto-reset ke layar awal setelah 8 detik
      setTimeout(() => setResult(null), 8000)
    } catch (e: any) {
      setError(e.message ?? 'Gagal mengambil nomor antrian')
    } finally {
      setLoading(false)
    }
  }

  // Layar konfirmasi tiket
  if (result) {
    return (
      <div className="page-kiosk bg-blue-900 flex flex-col items-center justify-center text-white">
        <div className="animate-ticket-in text-center">
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

  return (
    <div className="page-kiosk bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 px-8 py-6 flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-2xl">SALE</div>
          <div className="text-blue-300 text-sm">Sistem Antrian Layanan ETLE</div>
        </div>
        <div className="text-white text-right">
          <div className="text-sm text-blue-300">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Main */}
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

      <footer className="py-4 text-center text-gray-600 text-xs">
        Sentuh tombol layanan untuk mengambil nomor antrian
      </footer>
    </div>
  )
}
