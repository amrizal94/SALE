import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const sql = postgres(databaseUrl, { max: 1 })
const db = drizzle(sql)

const MIGRATIONS_FOLDER = '/app/packages/db/migrations'

console.log('Running migrations...')

try {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  console.log('Migrations complete!')
} catch (err: any) {
  // Jika error "already exists" — schema sudah ada, skip aman
  const alreadyExists =
    err?.code === '42710' || // type already exists
    err?.code === '42P07' || // relation already exists
    err?.message?.includes('already exists')

  if (alreadyExists) {
    console.log('Schema already exists, skipping migration. (OK)')
  } else {
    console.error('Migration failed:', err)
    process.exit(1)
  }
} finally {
  await sql.end()
}
