import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const sql = postgres(databaseUrl, { max: 1 })
const db = drizzle(sql)

console.log('Running migrations...')
await migrate(db, { migrationsFolder: '/app/packages/db/migrations' })
console.log('Migrations complete!')

await sql.end()
