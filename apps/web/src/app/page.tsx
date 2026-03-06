import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-400 mb-2">SALE</h1>
        <p className="text-gray-400 text-lg">Sistem Antrian Layanan ETLE</p>
      </div>

      <nav className="grid grid-cols-2 gap-4 w-full max-w-md px-4">
        <Link
          href="/kiosk"
          className="bg-blue-600 hover:bg-blue-500 rounded-2xl p-6 text-center transition-colors"
        >
          <div className="text-3xl mb-2">🎫</div>
          <div className="font-semibold">Kiosk</div>
          <div className="text-sm text-blue-200 mt-1">Ambil Nomor Antrian</div>
        </Link>

        <Link
          href="/display"
          className="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 text-center transition-colors"
        >
          <div className="text-3xl mb-2">📺</div>
          <div className="font-semibold">Display</div>
          <div className="text-sm text-gray-400 mt-1">Layar Antrian</div>
        </Link>

        <Link
          href="/counter"
          className="bg-green-700 hover:bg-green-600 rounded-2xl p-6 text-center transition-colors"
        >
          <div className="text-3xl mb-2">🪟</div>
          <div className="font-semibold">Loket</div>
          <div className="text-sm text-green-200 mt-1">Dashboard Petugas</div>
        </Link>

        <Link
          href="/admin"
          className="bg-purple-700 hover:bg-purple-600 rounded-2xl p-6 text-center transition-colors"
        >
          <div className="text-3xl mb-2">⚙️</div>
          <div className="font-semibold">Admin</div>
          <div className="text-sm text-purple-200 mt-1">Manajemen Sistem</div>
        </Link>
      </nav>
    </main>
  )
}
