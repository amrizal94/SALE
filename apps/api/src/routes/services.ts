import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '../lib/db.js'
import { services } from '@sale/db'
import { authenticate, requireRole, type JWTPayload } from '../lib/auth.js'

const serviceSchema = z.object({
  locationId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  prefix: z.string().min(1).max(5),
  dailyLimit: z.number().int().min(1).max(9999).optional(),
  estimatedMinutes: z.number().int().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
})

export async function serviceRoutes(app: FastifyInstance) {
  // GET /api/services?locationId=x
  app.get('/', { preHandler: authenticate }, async (req) => {
    const user = req.user as JWTPayload
    const query = req.query as { locationId?: string }

    if (query.locationId) {
      const locationId = parseInt(query.locationId)
      return db.select().from(services)
        .where(and(eq(services.locationId, locationId), eq(services.isActive, true)))
        .orderBy(services.prefix)
    }

    // super_admin bisa lihat semua layanan
    if (user.role === 'super_admin') {
      return db.select().from(services).where(eq(services.isActive, true)).orderBy(services.prefix)
    }

    const locationId = user.locationId ?? 0
    return db
      .select()
      .from(services)
      .where(and(eq(services.locationId, locationId), eq(services.isActive, true)))
      .orderBy(services.prefix)
  })

  // POST /api/services
  app.post('/', { preHandler: requireRole('super_admin', 'admin_location') }, async (req, reply) => {
    const body = serviceSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const [svc] = await db.insert(services).values(body.data).returning()
    return reply.status(201).send(svc)
  })

  // PUT /api/services/:id
  app.put('/:id', { preHandler: requireRole('super_admin', 'admin_location') }, async (req, reply) => {
    const id = parseInt((req.params as any).id)
    const body = serviceSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const [svc] = await db
      .update(services)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning()

    if (!svc) return reply.status(404).send({ error: 'Service not found' })
    return svc
  })

  // DELETE /api/services/:id (soft delete)
  app.delete('/:id', { preHandler: requireRole('super_admin', 'admin_location') }, async (req, reply) => {
    const id = parseInt((req.params as any).id)

    const [svc] = await db
      .update(services)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning()

    if (!svc) return reply.status(404).send({ error: 'Service not found' })
    return { ok: true }
  })
}
