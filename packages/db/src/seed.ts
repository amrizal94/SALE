import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { locations, services, counters, users, kioskDevices } from './schema.js'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

const sql = postgres(process.env.DATABASE_URL ?? 'postgresql://sale_user:changeme@localhost:5432/sale_db')
const db = drizzle(sql)

async function seed() {
  // Idempotent: skip jika superadmin sudah ada
  const existing = await db.select().from(users).where(eq(users.username, 'superadmin')).limit(1)
  if (existing.length > 0) {
    console.log('Database already seeded, skipping.')
    await sql.end()
    return
  }

  console.log('Seeding database...')

  // Location
  const [location] = await db
    .insert(locations)
    .values({
      name: 'Satlantas Polres Jakarta Selatan',
      code: 'JKTS-01',
      address: 'Jl. Buncit Raya No. 209, Jakarta Selatan',
      voiceEnabled: true,
    })
    .returning()

  console.log('Created location:', location.name)

  // Services
  const [svcVerifikasi, svcPembayaran, svcPengambilan] = await db
    .insert(services)
    .values([
      {
        locationId: location.id,
        name: 'Verifikasi Dokumen',
        code: 'VERIF',
        prefix: 'A',
        dailyLimit: 150,
        estimatedMinutes: 5,
      },
      {
        locationId: location.id,
        name: 'Pembayaran Denda',
        code: 'BAYAR',
        prefix: 'B',
        dailyLimit: 200,
        estimatedMinutes: 3,
      },
      {
        locationId: location.id,
        name: 'Pengambilan Dokumen',
        code: 'AMBIL',
        prefix: 'C',
        dailyLimit: 100,
        estimatedMinutes: 2,
      },
    ])
    .returning()

  console.log('Created services:', svcVerifikasi.name, svcPembayaran.name, svcPengambilan.name)

  // Counters
  const [counter1, counter2] = await db
    .insert(counters)
    .values([
      {
        locationId: location.id,
        name: 'Loket Verifikasi 1',
        code: 'L01',
        serviceIds: [svcVerifikasi.id],
        voiceEnabled: true,
      },
      {
        locationId: location.id,
        name: 'Loket Verifikasi 2',
        code: 'L02',
        serviceIds: [svcVerifikasi.id, svcPembayaran.id],
        voiceEnabled: true,
      },
      {
        locationId: location.id,
        name: 'Loket Pembayaran',
        code: 'L03',
        serviceIds: [svcPembayaran.id],
        voiceEnabled: true,
      },
      {
        locationId: location.id,
        name: 'Loket Pengambilan',
        code: 'L04',
        serviceIds: [svcPengambilan.id],
        voiceEnabled: true,
      },
    ])
    .returning()

  console.log('Created counters')

  // Users
  const hashedPassword = await bcrypt.hash('password123', 12)

  await db.insert(users).values([
    {
      username: 'superadmin',
      passwordHash: hashedPassword,
      role: 'super_admin',
      name: 'Super Administrator',
    },
    {
      username: 'admin.jkts01',
      passwordHash: hashedPassword,
      role: 'admin_location',
      name: 'Admin JKTS-01',
      locationId: location.id,
    },
    {
      username: 'petugas.l01',
      passwordHash: hashedPassword,
      role: 'officer',
      name: 'Petugas Loket 1',
      locationId: location.id,
      counterId: counter1.id,
    },
    {
      username: 'petugas.l02',
      passwordHash: hashedPassword,
      role: 'officer',
      name: 'Petugas Loket 2',
      locationId: location.id,
      counterId: counter2.id,
    },
  ])

  console.log('Created users (password: password123)')

  // Kiosk device
  await db.insert(kioskDevices).values({
    locationId: location.id,
    deviceToken: 'kiosk-dev-token-change-in-prod',
    name: 'Kiosk 1',
  })

  console.log('Created kiosk device')
  console.log('\nSeed complete!')
  console.log('Login: superadmin / password123')

  await sql.end()
}

seed().catch((err) => { console.error(err); process.exit(1) })
