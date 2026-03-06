import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '../lib/db.js'
import { users } from '@sale/db'
import { requireRole, type JWTPayload } from '../lib/auth.js'

const createUserSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
  role: z.enum(['super_admin', 'admin_location', 'officer', 'kiosk', 'display']),
  locationId: z.number().int().positive().optional(),
  counterId: z.number().int().positive().optional(),
})

const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
})

export async function userRoutes(app: FastifyInstance) {
  // GET /api/users
  app.get('/', { preHandler: requireRole('super_admin', 'admin_location') }, async (req) => {
    const user = req.user as JWTPayload

    const result = await db.query.users.findMany({
      columns: { passwordHash: false },
      with: {
        location: { columns: { id: true, name: true } },
        counter: { columns: { id: true, name: true } },
      },
      // admin_location hanya lihat user di lokasinya
      where: user.role === 'admin_location' && user.locationId
        ? eq(users.locationId, user.locationId)
        : undefined,
    })

    return result
  })

  // POST /api/users
  app.post('/', { preHandler: requireRole('super_admin', 'admin_location') }, async (req, reply) => {
    const body = createUserSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const passwordHash = await bcrypt.hash(body.data.password, 12)

    const [user] = await db
      .insert(users)
      .values({ ...body.data, passwordHash })
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        locationId: users.locationId,
        counterId: users.counterId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })

    return reply.status(201).send(user)
  })

  // PUT /api/users/:id
  app.put('/:id', { preHandler: requireRole('super_admin', 'admin_location') }, async (req, reply) => {
    const id = parseInt((req.params as any).id)
    const body = updateUserSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const { password, ...rest } = body.data
    const updateData: Record<string, any> = { ...rest, updatedAt: new Date() }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        locationId: users.locationId,
        counterId: users.counterId,
        isActive: users.isActive,
      })

    if (!user) return reply.status(404).send({ error: 'User not found' })
    return user
  })
}
