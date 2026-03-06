import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db.js'
import { locations } from '@sale/db'
import { authenticate, requireRole } from '../lib/auth.js'

const locationSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
})

export async function locationRoutes(app: FastifyInstance) {
  // GET /api/locations — public
  app.get('/', async () => {
    return db.select().from(locations).where(eq(locations.isActive, true)).orderBy(locations.name)
  })

  // GET /api/locations/:id
  app.get('/:id', { preHandler: authenticate }, async (req, reply) => {
    const id = parseInt((req.params as any).id)
    const [loc] = await db.select().from(locations).where(eq(locations.id, id)).limit(1)
    if (!loc) return reply.status(404).send({ error: 'Location not found' })
    return loc
  })

  // POST /api/locations — Super admin only
  app.post('/', { preHandler: requireRole('super_admin') }, async (req, reply) => {
    const body = locationSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const [loc] = await db.insert(locations).values(body.data).returning()
    return reply.status(201).send(loc)
  })

  // PUT /api/locations/:id
  app.put('/:id', { preHandler: requireRole('super_admin', 'admin_location') }, async (req, reply) => {
    const id = parseInt((req.params as any).id)
    const body = locationSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const [loc] = await db
      .update(locations)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning()

    if (!loc) return reply.status(404).send({ error: 'Location not found' })
    return loc
  })
}
