'use client'

import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Location = { id: number; name: string; code: string }
type Service  = { id: number; name: string; prefix: string; estimatedMinutes: number }
type TicketResult = { ticket: { ticketNumber: string; id: number }; service: { name: string } }

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error')
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Error')
  return res.json()
}

export default function KioskPage() {
  const [locationId, setLocationId] = useState<number | null>(null)
  const [locationName, setLocationName] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [result, setResult] = useState<TicketResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickingLocation, setPickingLocation] = useState(false)

  // Load saved location on mount
  useEffect(() => {
    const saved = localStorage.getItem('kiosk_location_id')
    const savedName = localStorage.getItem('kiosk_location_name')
    if (saved) {
      setLocationId(parseInt(saved))
      setLocationName(savedName ?? '')
    } else {
      setPickingLocation(true)
      get<Location[]>('/api/locations').then(setLocations).catch(() => {})
    }
  }, [])

  // Load services when locationId is set
  useEffect(() => {
    if (!locationId) return
    get<Service[]>(`/api/services?locationId=${locationId}`)
      .then(setServices)
      .catch(() => setError('Gagal memuat layanan'))
  }, [locationId])

  function selectLocation(loc: Location) {
    localStorage.setItem('kiosk_location_id', String(loc.id))
    localStorage.setItem('kiosk_location_name', loc.name)
    setLocationId(loc.id)
    setLocationName(loc.name)
    setPickingLocation(false)
  }

  function changeLocation() {
    get<Location[]>('/api/locations').then(setLocations).catch(() => {})
    setPickingLocation(true)
  }

  async function takeNumber(serviceId: number) {
    if (!locationId) return
    setLoading(true)
    setError(null)
    try {
      const data = await post<TicketResult>('/api/tickets/kiosk', { locationId, serviceId })
      setResult(data)
      setTimeout(() => setResult(null), 8000)
    } catch (e: any) {
      setError(e.message ?? 'Gagal mengambil nomor antrian')
    } finally {
      setLoading(false)
    }
  }

  // Location picker screen
  if (pickingLocation) {
    return (
      <div className="page-kiosk bg-gray-950 flex flex-col items-center justify-center gap-8">
        <div className="text-center">
          <div className="text-white font-bold text-3xl mb-2">SALE</div>
          <div className="text-gray-400 text-lg">Pilih Lokasi Kiosk</div>
        </div>
        <div className="w-full max-w-md space-y-3 px-4">
          {locations.length === 0 && (
            <div className="text-gray-500 text-center py-8">Memuat lokasi...</div>
          )}
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => selectLocation(loc)}
              className="w-full bg-blue-700 hover:bg-blue-600 active:scale-95 text-white rounded-2xl px-6 py-5 text-left transition-all"
            >
              <div className="font-semibold text-lg">{loc.name}</div>
              <div className="text-blue-300 text-sm mt-0.5 font-mono">{loc.code}</div>
            </button>
          ))}
        </div>
        <p className="text-gray-600 text-xs">Pilihan ini disimpan di perangkat ini</p>
      </div>
    )
  }

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
          <button onClick={changeLocation} className="text-blue-400 hover:text-blue-200 text-xs mt-1 transition-colors">
            {locationName} · Ganti Lokasi
          </button>
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

      <footer className="py-4 text-center text-gray-600 text-xs">
        Sentuh tombol layanan untuk mengambil nomor antrian
      </footer>
    </div>
  )
}
