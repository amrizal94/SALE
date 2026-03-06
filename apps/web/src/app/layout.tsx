import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SALE — Sistem Antrian Layanan ETLE',
  description: 'Sistem antrian digital untuk layanan Electronic Traffic Law Enforcement',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  )
}
