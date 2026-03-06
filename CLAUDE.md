# SALE — Sistem Antrian Layanan ETLE

## Stack
- **Backend**: Fastify 5 + TypeScript (ESM), runs on port 4000
- **Frontend**: Next.js 15 App Router + Tailwind CSS, runs on port 3000
- **Database**: PostgreSQL 16 via Drizzle ORM (drizzle-orm + postgres.js)
- **Monorepo**: pnpm workspaces — packages: @sale/db, @sale/api, @sale/web
- **Realtime**: Server-Sent Events (SSE) di /api/sse
- **Deploy**: Docker Compose + AAPanel NGINX reverse proxy
- **CI/CD**: GitHub Actions → SSH deploy ke /opt/sale

## Struktur
```
apps/api/src/
  config.ts          # env config
  index.ts           # Fastify entry
  lib/db.ts          # Drizzle instance
  lib/sse.ts         # SSE manager (in-memory)
  lib/auth.ts        # JWT helpers + role guards
  routes/            # auth, tickets, locations, services, counters, users, sse

apps/web/src/
  app/kiosk/         # UI ambil nomor (tablet fullscreen)
  app/display/       # Layar TV antrian + voice
  app/counter/       # Dashboard petugas loket
  app/admin/         # Manajemen sistem
  lib/api.ts         # API client (fetch wrapper)
  hooks/useSSE.ts    # SSE hook + auto-reconnect

packages/db/src/
  schema.ts          # Drizzle schema (semua tabel + enums + relations)
  seed.ts            # Data awal untuk development
```

## Konvensi penting
- **Atomic ticket**: pakai ticketSequences table + ON CONFLICT DO UPDATE, bukan MAX(seq)+1
- **Atomic call-next**: pakai raw SQL dengan FOR UPDATE SKIP LOCKED
- **Write DB dulu, baru print** — jangan sebaliknya
- **Semua perubahan status tiket** harus insert ke queue_events (audit trail)
- **SSE manager** adalah in-memory singleton — kalau scale ke multi-instance, ganti ke Redis pub/sub
- **Role hierarchy**: super_admin > admin_location > officer > kiosk/display

## Database URL
- Dev: postgresql://sale_user:changeme@localhost:5432/sale_db
- Prod: via env DATABASE_URL di .env

## Commands
```bash
pnpm install          # install semua
pnpm dev              # jalankan semua (api + web) paralel
pnpm db:generate      # generate drizzle migrations
pnpm db:migrate       # run migrations
pnpm db:seed          # seed data awal
```

## Deploy
- Server: 45.66.153.156
- Path: /opt/sale
- SSH: ssh -i ~/.ssh/id_ed25519 root@45.66.153.156
- CI/CD: push ke branch main → GitHub Actions auto-deploy
- GitHub Secrets yang dibutuhkan: SSH_HOST, SSH_PRIVATE_KEY
