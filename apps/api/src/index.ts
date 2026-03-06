import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { config } from './config.js'
import { authRoutes } from './routes/auth.js'
import { ticketRoutes } from './routes/tickets.js'
import { locationRoutes } from './routes/locations.js'
import { serviceRoutes } from './routes/services.js'
import { counterRoutes } from './routes/counters.js'
import { userRoutes } from './routes/users.js'
import { sseRoutes } from './routes/sse.js'

const app = Fastify({
  logger: {
    level: config.isDev ? 'debug' : 'info',
    transport: config.isDev ? { target: 'pino-pretty' } : undefined,
  },
})

// Plugins
await app.register(cors, {
  origin: config.corsOrigin,
  credentials: true,
})

await app.register(jwt, {
  secret: config.jwtSecret,
  sign: { expiresIn: config.jwtExpiresIn },
})

// Routes
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(ticketRoutes, { prefix: '/api/tickets' })
await app.register(locationRoutes, { prefix: '/api/locations' })
await app.register(serviceRoutes, { prefix: '/api/services' })
await app.register(counterRoutes, { prefix: '/api/counters' })
await app.register(userRoutes, { prefix: '/api/users' })
await app.register(sseRoutes, { prefix: '/api/sse' })

// Health check
app.get('/health', () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}))

// Error handler
app.setErrorHandler((error, req, reply) => {
  const statusCode = (error as any).statusCode ?? error.statusCode ?? 500
  app.log.error(error)

  if (statusCode === 429 || error.message === 'DAILY_LIMIT_REACHED') {
    return reply.status(429).send({ error: 'Batas antrian harian telah tercapai' })
  }

  return reply.status(statusCode).send({
    error: config.isDev ? error.message : 'Internal Server Error',
  })
})

try {
  await app.listen({ port: config.port, host: config.host })
  app.log.info(`SALE API running at http://${config.host}:${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
