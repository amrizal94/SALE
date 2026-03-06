# SALE — Sistem Antrian Layanan ETLE

Aplikasi manajemen antrian digital untuk kantor ETLE (Electronic Traffic Law Enforcement / Tilang Elektronik). Mendukung multi-loket, realtime display, kiosk pengambilan nomor, dan panel admin lengkap.

---

## Fitur Utama

| Halaman | URL | Keterangan |
|---------|-----|------------|
| Kiosk | `/kiosk` | Pengambilan nomor antrian oleh pengunjung |
| Display | `/display` | Layar antrian publik (TV/monitor) dengan suara otomatis |
| Counter / Loket | `/counter` | Dashboard petugas untuk memanggil & melayani antrian |
| Admin | `/admin` | Manajemen lokasi, layanan, loket, dan pengguna |

### Kiosk
- Pengunjung pilih jenis layanan dan ambil nomor antrian
- Nomor tiket format prefix + urutan (contoh: `A001`, `B012`)
- One-time setup per perangkat menggunakan akun role `kiosk`
- Tombol reset perangkat untuk konfigurasi ulang

### Display
- Menampilkan nomor yang sedang dipanggil (sangat besar, warna kuning)
- Pengumuman suara otomatis via Web Speech API (Bahasa Indonesia)
- Panel kanan: jumlah antrian menunggu per layanan + riwayat panggilan
- Realtime via SSE (Server-Sent Events)
- One-time setup per perangkat menggunakan akun role `display`
- Overlay "Tap untuk aktifkan suara" untuk mengatasi autoplay policy browser

### Counter / Loket
- Login petugas dengan akun role `officer`
- Tampilkan nama loket yang di-assign ke akun
- Panggil tiket berikutnya (atomic, tidak bisa dipanggil dua loket sekaligus)
- Status tiket: `calling` → `serving` → `done` / `skipped`
- Tombol Layani, Lewati, Selesai dengan logika disable yang tepat
- Realtime via SSE — counter lain tidak ikut terdampak saat satu loket memanggil

### Admin
- Login dengan akun role `super_admin` atau `admin_location`
- Dashboard statistik (lokasi, layanan, loket, pengguna)
- CRUD Lokasi, Layanan, Loket (dengan multi-service per loket), Pengguna
- Guide setup awal di halaman dashboard

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Fastify 5 + TypeScript ESM |
| Frontend | Next.js 15 App Router + Tailwind CSS 3 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Realtime | Server-Sent Events (SSE) — in-memory per lokasi |
| Auth | JWT (stateless) via `@fastify/jwt` |
| Password | bcryptjs |
| Monorepo | pnpm workspaces |
| Deploy | Docker Compose + GitHub Actions |
| Reverse Proxy | NGINX (via AAPanel) |

---

## Struktur Proyek

```
sale/
├── apps/
│   ├── api/                  # Backend Fastify
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point, register routes
│   │   │   ├── migrate.ts    # Script migrasi DB (production)
│   │   │   ├── seed.ts       # Seed data awal (idempotent)
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts   # JWT helper & middleware
│   │   │   │   ├── db.ts     # Drizzle instance
│   │   │   │   └── sse.ts    # SSEManager (in-memory broadcast)
│   │   │   └── routes/
│   │   │       ├── auth.ts
│   │   │       ├── tickets.ts
│   │   │       ├── services.ts
│   │   │       ├── counters.ts
│   │   │       ├── locations.ts
│   │   │       ├── users.ts
│   │   │       └── sse.ts
│   │   └── Dockerfile
│   └── web/                  # Frontend Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── kiosk/page.tsx
│       │   │   ├── display/page.tsx
│       │   │   ├── counter/page.tsx
│       │   │   └── admin/page.tsx
│       │   ├── hooks/
│       │   │   └── useSSE.ts # Hook SSE dengan auto-reconnect
│       │   └── lib/
│       │       └── api.ts    # API client (fetch wrapper)
│       └── Dockerfile
├── packages/
│   └── db/                   # Shared database schema & migrations
│       ├── src/
│       │   ├── schema.ts     # Drizzle schema (semua tabel)
│       │   ├── index.ts      # Export schema + relations
│       │   └── seed.ts       # Seed script
│       └── drizzle/          # Generated migration files
├── .github/
│   └── workflows/
│       └── deploy.yml        # CI/CD via GitHub Actions + SSH
├── docker-compose.yml        # Development
├── docker-compose.prod.yml   # Production
├── .env.example
└── package.json              # Root workspace
```

---

## Skema Database

| Tabel | Keterangan |
|-------|------------|
| `locations` | Lokasi kantor ETLE |
| `services` | Jenis layanan per lokasi (dengan prefix tiket & daily limit) |
| `counters` | Loket per lokasi, bisa menangani beberapa service sekaligus |
| `users` | Semua akun (super_admin, admin_location, officer, kiosk, display) |
| `tickets` | Nomor antrian per hari per lokasi |
| `ticket_sequences` | Atomic counter per (lokasi, layanan, tanggal) |
| `queue_events` | Audit trail semua perubahan status tiket |
| `kiosk_devices` | Registrasi perangkat kiosk |

### Role Pengguna

| Role | Akses |
|------|-------|
| `super_admin` | Full akses semua fitur dan semua lokasi |
| `admin_location` | Manajemen satu lokasi |
| `officer` | Halaman counter (harus di-assign ke loket) |
| `kiosk` | Halaman kiosk (harus di-assign ke lokasi) |
| `display` | Halaman display (harus di-assign ke lokasi) |

---

## Setup Development

### Prasyarat

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Cara menjalankan

```bash
# 1. Clone repo
git clone https://github.com/amrizal94/SALE.git
cd SALE

# 2. Install dependencies
pnpm install

# 3. Copy environment file
cp .env.example .env
# Edit .env sesuai kebutuhan

# 4. Jalankan semua service (DB + API + Web)
docker compose up -d

# 5. Jalankan migrasi database
docker compose exec api node apps/api/dist/migrate.js
# atau jika pakai tsx langsung:
pnpm --filter @sale/api db:migrate

# 6. Seed data awal
pnpm db:seed
```

Akses:
- **Web**: http://localhost:3000
- **API**: http://localhost:4000
- **API Health**: http://localhost:4000/health

### Development tanpa Docker

```bash
# Jalankan PostgreSQL terpisah, lalu:
pnpm dev   # menjalankan api + web secara paralel
```

---

## Environment Variables

Buat file `.env` di root project (lihat `.env.example`):

```env
# Database
DATABASE_URL=postgresql://sale_user:changeme@localhost:5432/sale_db

# JWT — minimal 32 karakter, random
JWT_SECRET=change-this-to-a-very-long-random-string-at-least-32-chars

# API
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000

# Web — kosongkan untuk pakai relative URL (via NGINX), atau isi domain lengkap
NEXT_PUBLIC_API_URL=

# Environment
NODE_ENV=development
```

### Environment Production (tambahan)

```env
POSTGRES_PASSWORD=password-kuat-acak
NEXT_PUBLIC_API_URL=https://domain-anda.com
CORS_ORIGIN=https://domain-anda.com
```

---

## Akun Default (Seed)

Seed data membuat akun berikut secara otomatis (idempotent — aman dijalankan ulang):

| Username | Password | Role | Keterangan |
|----------|----------|------|------------|
| `superadmin` | `Admin@SALE2025!` | super_admin | Akun super admin |
| `petugas.l01` | `password123` | officer | Petugas Loket Verifikasi 1 |
| `petugas.l02` | `password123` | officer | Petugas Loket Verifikasi 2 |
| `kiosk.antrian1` | `password123` | kiosk | Perangkat kiosk |
| `display.utama` | `password123` | display | Layar display utama |

> **Penting**: Ganti semua password default sebelum digunakan di production via Admin → Pengguna.

Seed juga membuat:
- 1 lokasi: "Kantor ETLE Kota"
- 3 layanan: Verifikasi Dokumen (A), Pembayaran Denda (B), Pengambilan STNK (C)
- 4 loket: Loket Verifikasi 1, Loket Verifikasi 2, Loket Pembayaran, Loket Pengambilan

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | `/api/auth/login` | - | Login, return JWT token |
| GET | `/api/auth/me` | Bearer | Info user dari token |

### Tickets
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | `/api/tickets` | Bearer | Ambil nomor antrian |
| GET | `/api/tickets` | Bearer | List tiket hari ini |
| POST | `/api/tickets/call-next` | officer+ | Panggil tiket berikutnya (atomic) |
| PATCH | `/api/tickets/:id/serve` | officer+ | Mulai melayani |
| PATCH | `/api/tickets/:id/done` | officer+ | Selesai |
| PATCH | `/api/tickets/:id/skip` | officer+ | Lewati / tidak hadir |
| PATCH | `/api/tickets/:id/print-confirm` | Bearer | Konfirmasi cetak berhasil |

### SSE (Realtime)
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET | `/api/sse?token=<jwt>` | Query param | Event stream per lokasi |

Events yang dikirim: `connected`, `ticket_issued`, `ticket_called`, `ticket_serving`, `ticket_done`, `ticket_skipped`

### Admin
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| GET/POST | `/api/locations` | Bearer | Lokasi |
| PUT | `/api/locations/:id` | Bearer | Update lokasi |
| GET/POST | `/api/services` | Bearer | Layanan |
| PUT/DELETE | `/api/services/:id` | Bearer | Update/hapus layanan |
| GET/POST | `/api/counters` | Bearer | Loket |
| PUT | `/api/counters/:id` | Bearer | Update loket |
| GET/POST | `/api/users` | Bearer | Pengguna |
| PUT | `/api/users/:id` | Bearer | Update pengguna |

---

## Deploy Production

### Prasyarat Server

- Ubuntu/Debian dengan Docker & Docker Compose
- NGINX (atau AAPanel)
- Akses SSH sebagai root

### GitHub Actions Secrets

Tambahkan secrets berikut di repository GitHub (`Settings → Secrets → Actions`):

| Secret | Keterangan |
|--------|------------|
| `SSH_HOST` | IP server production |
| `SSH_PRIVATE_KEY` | Private key SSH untuk akses ke server |

### Setup Awal di Server

```bash
# Di server
mkdir -p /opt/sale
cd /opt/sale
git clone https://github.com/amrizal94/SALE.git .

# Buat file .env production
cp .env.example .env
nano .env   # isi semua variable, terutama passwords dan JWT_SECRET

# Build dan jalankan
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Migrasi & seed
docker compose -f docker-compose.prod.yml exec api node apps/api/dist/migrate.js
docker compose -f docker-compose.prod.yml exec api node apps/api/dist/seed.js
```

### Alur CI/CD

Setiap push ke branch `main` otomatis men-trigger GitHub Actions yang:

1. SSH ke server production
2. `git fetch && git reset --hard origin/main`
3. Build Docker image (dengan cache)
4. Restart container dengan `docker compose up -d`
5. Jalankan migrasi DB
6. Jalankan seed (idempotent — skip jika sudah ada)
7. `docker system prune` untuk bersihkan image lama

### Konfigurasi NGINX

Contoh konfigurasi NGINX reverse proxy (AAPanel):

```nginx
server {
    listen 443 ssl;
    server_name antrian.konfirm.info;

    # SSL certificates (kelola via AAPanel / Certbot)

    # Web (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SSE — wajib disable buffering
    location /api/sse {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        chunked_transfer_encoding on;
    }
}
```

> **Penting**: Endpoint `/api/sse` **wajib** disable proxy buffering (`proxy_buffering off`) agar Server-Sent Events berfungsi dengan benar.

---

## Alur Penggunaan

### Setup Awal (sekali saja)

1. Buka `/admin` → login sebagai `superadmin`
2. Buat **Lokasi** (nama kantor, kode unik)
3. Buat **Layanan** (nama, prefix tiket, estimasi waktu, daily limit)
4. Buat **Loket** (nama, kode, pilih layanan yang ditangani)
5. Buat **Pengguna**:
   - Role `officer` → assign ke loket
   - Role `kiosk` → assign ke lokasi
   - Role `display` → assign ke lokasi

### Setup Perangkat (sekali per device)

- **Kiosk**: Buka `/kiosk` → klik "Setup" → login dengan akun kiosk
- **Display**: Buka `/display` → klik overlay → login dengan akun display → klik layar untuk aktifkan suara

### Alur Antrian Harian

```
Pengunjung (Kiosk)           Petugas (Counter)          Display
      │                             │                       │
      │── Pilih layanan ──────────> │                       │
      │<─ Dapat nomor (A001) ───── │                       │
      │                             │                       │── Tampil A001 menunggu
      │                             │── Panggil Berikutnya  │
      │                             │<─ Dapat A001 ──────── │
      │                             │                       │── Tampil A001 DIPANGGIL
      │                             │                       │── Suara: "Nomor A-0-0-1..."
      │                             │── Layani A001         │
      │                             │── Selesai             │
      │                             │                       │
```

---

## Pengembangan Lanjutan

Beberapa hal yang bisa dikembangkan ke depannya:

- **Multi-instance**: Ganti SSE in-memory dengan Redis pub/sub untuk horizontal scaling
- **Estimasi waktu tunggu**: Kalkulasi otomatis berdasarkan `estimatedMinutes` per layanan dan jumlah antrian
- **Notifikasi WhatsApp/SMS**: Kirim pesan saat nomor dipanggil
- **Statistik & laporan**: Rata-rata waktu tunggu, tiket per hari, performa per loket
- **Print tiket**: Integrasi printer termal via print agent lokal
- **PWA**: Jadikan kiosk dan display sebagai Progressive Web App untuk mode fullscreen

---

## Troubleshooting

### SSE tidak connect / realtime tidak jalan
- Pastikan NGINX punya konfigurasi `proxy_buffering off` di endpoint `/api/sse`
- Pastikan `NEXT_PUBLIC_API_URL` di-set dengan benar di `.env` production
- Cek browser console: harus ada log `[SSE] Connected`

### Suara tidak keluar di Display
- Klik pada halaman display (Chrome butuh interaksi user untuk audio)
- Overlay "Tap untuk aktifkan suara" akan muncul saat halaman dibuka
- Jika menggunakan OBS, gunakan **Window Capture** bukan Browser Source

### Tombol "Panggil Berikutnya" tidak berfungsi
- Pastikan akun officer sudah di-assign ke loket di Admin → Pengguna
- Pastikan loket sudah di-assign ke minimal satu layanan

### Display / Kiosk menampilkan setup screen terus
- Token expired atau role tidak sesuai
- Klik "Reset Perangkat" → login ulang dengan akun yang benar

---

## Lisensi

MIT License — bebas digunakan dan dimodifikasi.
