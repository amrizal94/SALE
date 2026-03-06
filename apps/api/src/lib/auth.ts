import type { FastifyRequest, FastifyReply } from 'fastify'

export type JWTPayload = {
  id: number
  username: string
  name: string
  role: 'super_admin' | 'admin_location' | 'officer' | 'kiosk' | 'display'
  locationId: number | null
  counterId: number | null
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}

export function requireRole(...roles: JWTPayload['role'][]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await authenticate(req, reply)
    const user = req.user as JWTPayload
    if (!roles.includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' })
    }
  }
}

export function requireLocationAccess(req: FastifyRequest, reply: FastifyReply, locationId: number) {
  const user = req.user as JWTPayload
  if (user.role === 'super_admin') return true
  if (user.locationId !== locationId) {
    reply.status(403).send({ error: 'Access denied for this location' })
    return false
  }
  return true
}
