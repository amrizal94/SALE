# Kritik & Risiko Operasional SALE

## Risiko Teknis

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Nomor tiket dobel | Kritis | Pakai PostgreSQL `sequences` per (lokasi, layanan, hari), bukan `MAX(seq)+1` |
| Print keluar tapi DB gagal | Tinggi | Write DB dulu, baru kirim perintah print via SSE ke print agent |
| Dua loket panggil tiket sama | Kritis | `UPDATE tickets SET status='calling' WHERE id=? AND status='waiting'` — atomic, cek rows affected |
| Kiosk offline / JS error | Sedang | Kiosk harus pure client — zero local state, semua logic di server |
| Server putus saat transaksi | Tinggi | Semua perubahan tiket pakai DB transaction + audit log di `queue_events` |

## Risiko Infrastruktur

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| AAPanel update NGINX overwrite config | Sedang | Simpan config NGINX secara manual, bukan via AAPanel UI |
| SSH deploy key bocor di CI/CD | Tinggi | Gunakan deploy key terpisah (bukan personal key), restricted ke satu repo + server |
| PostgreSQL tidak di-backup | Kritis | Setup pg_dump otomatis harian + upload ke remote storage |
| Docker container restart loop | Sedang | Set `restart: unless-stopped`, monitoring via healthcheck |

## Risiko Operasional

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Printer kiosk offline/macet | Sedang | Heartbeat monitoring printer + alert ke admin, tiket dibatalkan otomatis jika print gagal |
| Petugas lupa panggil / skip tiket | Sedang | Audit trail di `queue_events`, bisa di-review lewat admin dashboard |
| Volume lonjakan antrian mendadak | Sedang | Batasi tiket per sesi (misal maks 200/hari/layanan), tampilkan estimasi tunggu |
| Tidak ada audit trail | Tinggi | Semua action (ambil tiket, panggil, selesai, lewati) masuk tabel `queue_events` dengan timestamp + user_id |

## Catatan Desain

- **Print flow**: Server generate tiket → simpan DB → kirim SSE ke print agent → agent print → agent kirim konfirmasi ke server
- **Call flow**: Petugas klik "Panggil" → API update atomic → broadcast SSE ke display + announcer
- **Sequence number**: Generate via PostgreSQL function, bukan di aplikasi layer
