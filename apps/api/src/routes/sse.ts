import type { FastifyInstance } from 'fastify'
import { randomUUID, sseManager } from '../lib/sse.js'
import type { JWTPayload } from '../lib/auth.js'

export async function sseRoutes(app: FastifyInstance) {
  // GET /api/sse — Realtime event stream per lokasi
  app.get('/', async (req, reply) => {
    // EventSource tidak bisa set header → token dikirim via ?token= query param
    const token = (req.query as any).token as string | undefined
    if (!token) return reply.status(401).send({ error: 'Unauthorized' })

    let user: JWTPayload
    try {
      user = app.jwt.verify(token) as JWTPayload
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    if (!user.locationId) {
      return reply.status(403).send({ error: 'No location assigned' })
    }

    const clientId = randomUUID()

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Penting untuk NGINX reverse proxy
      'Access-Control-Allow-Origin': '*',
    })

    sseManager.add({
      id: clientId,
      locationId: user.locationId,
      role: user.role,
      response: reply.raw,
    })

    // Kirim initial connected event
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ clientId, locationId: user.locationId })}\n\n`)

    // Heartbeat setiap 25 detik (mencegah timeout proxy)
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(': heartbeat\n\n')
      } catch {
        clearInterval(heartbeat)
        sseManager.remove(clientId)
      }
    }, 25000)

    req.raw.on('close', () => {
      clearInterval(heartbeat)
      sseManager.remove(clientId)
      app.log.info(`SSE client disconnected: ${clientId}`)
    })

    // Jangan return agar koneksi tetap terbuka
    await new Promise(() => {})
  })
}
