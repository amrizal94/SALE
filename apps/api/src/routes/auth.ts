import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db.js'
import { users } from '@sale/db'
import { authenticate, type JWTPayload } from '../lib/auth.js'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post('/login', async (req, reply) => {
    const body = loginSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input' })

    const { username, password } = body.data

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)

    if (!user || !user.isActive) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const payload: JWTPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      locationId: user.locationId,
      counterId: user.counterId,
    }

    const token = app.jwt.sign(payload)

    return reply.send({
      token,
      user: payload,
    })
  })

  // GET /api/auth/me
  app.get('/me', { preHandler: authenticate }, async (req) => {
    return req.user
  })
}
