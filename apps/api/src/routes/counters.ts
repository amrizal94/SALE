import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '../lib/db.js'
import { counters, tickets } from '@sale/db'
import { authenticate, requireRole, type JWTPayload } from '../lib/auth.js'

const counterSchema = z.object({
  locationId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  serviceIds: z.array(z.number().int().positive()).min(1),
  isActive: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
})

export async function counterRoutes(app: FastifyInstance) {
  // GET /api/counters?locationId=x
  app.get('/', { preHandler: authenticate }, async (req) => {
    const user = req.user as JWTPayload
    const query = req.query as { locationId?: string }

    if (query.locationId) {
      const locationId = parseInt(query.locationId)
      return db.select().from(counters)
        .where(and(eq(counters.locationId, locationId), eq(counters.isActive, true)))
        .orderBy(counters.code)
    }

    // super_admin bisa lihat semua loket
    if (user.role === 'super_admin') {
      return db.select().from(counters).where(eq(counters.isActive, true)).orderBy(counters.code)
    }

    const locationId = user.locationId ?? 0
    return db
      .select()
      .from(counters)
      .where(and(eq(counters.locationId, locationId), eq(counters.isActive, true)))
      .orderBy(counters.code)
  })

  // GET /api/counters/:id/queue — Antrian aktif untuk loket ini
  app.get('/:id/queue', { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as JWTPayload
    const counterId = parseInt((req.params as any).id)
    const today = new Date().toISOString().split('T')[0]

    const [counter] = await db
      .select()
      .from(counters)
      .where(eq(counters.id, counterId))
      .limit(1)

    if (!counter) return reply.status(404).send({ error: 'Counter not found' })

    const queue = await db.query.tickets.findMany({
      where: and(
        eq(tickets.locationId, counter.locationId),
        eq(tickets.date, today),
        // status waiting yang bisa dipanggil loket ini
      ),
      with: {
        service: { columns: { id: true, name: true, prefix: true } },
      },
      orderBy: tickets.sequenceNumber,
    })

    return queue
  })

  // POST /api/counters
  app.post('/', { preHandler: requireRole('super_admin', 'admin_location') }, async (req, reply) => {
    const body = counterSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const [counter] = await db.insert(counters).values(body.data).returning()
    return reply.status(201).send(counter)
  })

  // PUT /api/counters/:id
  app.put('/:id', { preHandler: requireRole('super_admin', 'admin_location') }, async (req, reply) => {
    const id = parseInt((req.params as any).id)
    const body = counterSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const [counter] = await db
      .update(counters)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(counters.id, id))
      .returning()

    if (!counter) return reply.status(404).send({ error: 'Counter not found' })
    return counter
  })
}
