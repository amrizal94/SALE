function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Environment variable ${key} is required`)
  return val
}

export const config = {
  port: parseInt(process.env.API_PORT ?? '4000'),
  host: process.env.API_HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',

  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://sale_user:changeme@localhost:5432/sale_db',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',

  // JWT expiry
  jwtExpiresIn: '8h',
}
