import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '@sale/db'
import { config } from '../config.js'

const queryClient = postgres(config.databaseUrl)
export const db = drizzle(queryClient, { schema })
