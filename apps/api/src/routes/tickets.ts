import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { eq, and, inArray, desc, sql } from 'drizzle-orm'
import { db } from '../lib/db.js'
import { tickets, services, counters, ticketSequences, queueEvents } from '@sale/db'
import { authenticate, requireRole, type JWTPayload } from '../lib/auth.js'
import { sseManager } from '../lib/sse.js'

const createTicketSchema = z.object({
  serviceId: z.number().int().positive(),
  kioskId: z.number().int().positive().optional(),
})

export async function ticketRoutes(app: FastifyInstance) {
  // POST /api/tickets — Ambil nomor antrian (kiosk/officer)
  app.post('/', { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as JWTPayload
    if (!user.locationId) return reply.status(403).send({ error: 'No location assigned' })

    const body = createTicketSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input' })

    const { serviceId, kioskId } = body.data
    const today = new Date().toISOString().split('T')[0]

    // Cek service valid dan milik lokasi user
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.locationId, user.locationId!)))
      .limit(1)

    if (!service || !service.isActive) {
      return reply.status(404).send({ error: 'Service not found or inactive' })
    }

    // Atomic create dalam transaction
    const ticket = await db.transaction(async (tx) => {
      // Atomic increment sequence — ON CONFLICT DO UPDATE memastikan tidak ada race condition
      const [seq] = await tx
        .insert(ticketSequences)
        .values({
          locationId: user.locationId!,
          serviceId,
          date: today,
          lastSequence: 1,
        })
        .onConflictDoUpdate({
          target: [ticketSequences.locationId, ticketSequences.serviceId, ticketSequences.date],
          set: {
            lastSequence: sql`ticket_sequences.last_sequence + 1`,
          },
        })
        .returning()

      // Cek batas harian
      if (seq.lastSequence > service.dailyLimit) {
        throw Object.assign(new Error('DAILY_LIMIT_REACHED'), { statusCode: 429 })
      }

      const ticketNumber = `${service.prefix}${String(seq.lastSequence).padStart(3, '0')}`

      const [ticket] = await tx
        .insert(tickets)
        .values({
          locationId: user.locationId!,
          serviceId,
          date: today,
          sequenceNumber: seq.lastSequence,
          ticketNumber,
          kioskId: kioskId ?? null,
        })
        .returning()

      await tx.insert(queueEvents).values({
        ticketId: ticket.id,
        eventType: 'issued',
        actorId: user.id,
      })

      return ticket
    })

    // Broadcast ke display & loket
    sseManager.broadcast(user.locationId!, 'ticket_issued', {
      ticket,
      service: { id: service.id, name: service.name, prefix: service.prefix },
    })

    return reply.status(201).send({ ticket, service })
  })

  // GET /api/tickets — List antrian hari ini per lokasi
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    const user = req.user as JWTPayload
    if (!user.locationId) return reply.status(403).send({ error: 'No location assigned' })

    const query = req.query as { serviceId?: string; status?: string; date?: string }
    const today = query.date ?? new Date().toISOString().split('T')[0]

    const conditions = [
      eq(tickets.locationId, user.locationId!),
      eq(tickets.date, today),
    ]

    if (query.serviceId) conditions.push(eq(tickets.serviceId, parseInt(query.serviceId)))
    if (query.status) conditions.push(eq(tickets.status, query.status as any))

    const result = await db.query.tickets.findMany({
      where: and(...conditions),
      with: {
        service: { columns: { id: true, name: true, prefix: true } },
        counter: { columns: { id: true, name: true, code: true } },
        officer: { columns: { id: true, name: true } },
      },
      orderBy: [desc(tickets.sequenceNumber)],
      limit: 200,
    })

    return result
  })

  // POST /api/tickets/call-next — Petugas panggil tiket berikutnya (atomic)
  app.post('/call-next', { preHandler: requireRole('officer', 'admin_location', 'super_admin') }, async (req, reply) => {
    const user = req.user as JWTPayload
    if (!user.locationId) return reply.status(403).send({ error: 'No location assigned' })

    const body = z.object({ counterId: z.number().int().positive() }).safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: 'counterId required' })

    const { counterId } = body.data
    const today = new Date().toISOString().split('T')[0]

    // Ambil info counter untuk tahu service mana yang ditangani
    const [counter] = await db
      .select()
      .from(counters)
      .where(and(eq(counters.id, counterId), eq(counters.locationId, user.locationId!)))
      .limit(1)

    if (!counter) return reply.status(404).send({ error: 'Counter not found' })

    // FOR UPDATE SKIP LOCKED — atomic, tidak bisa dipanggil dua loket sekaligus
    const result = await db.execute(sql`
      WITH next_ticket AS (
        SELECT id FROM tickets
        WHERE date = ${today}
          AND location_id = ${user.locationId!}
          AND status = 'waiting'
          AND service_id = ANY(${counter.serviceIds}::int[])
        ORDER BY sequence_number ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE tickets
        SET status = 'calling',
            counter_id = ${counterId},
            officer_id = ${user.id},
            called_at = NOW()
      FROM next_ticket
      WHERE tickets.id = next_ticket.id
      RETURNING tickets.*
    `)

    if (!result[0]) {
      return reply.status(404).send({ error: 'No waiting tickets' })
    }

    const ticket = result[0] as typeof tickets.$inferSelect

    await db.insert(queueEvents).values({
      ticketId: ticket.id,
      eventType: 'called',
      actorId: user.id,
      counterId,
    })

    // Broadcast ke display + loket
    sseManager.broadcast(user.locationId!, 'ticket_called', {
      ticket,
      counter: { id: counter.id, name: counter.name, code: counter.code },
    })

    return ticket
  })

  // PATCH /api/tickets/:id/serve — Tandai mulai dilayani
  app.patch('/:id/serve', { preHandler: requireRole('officer', 'admin_location', 'super_admin') }, async (req, reply) => {
    const user = req.user as JWTPayload
    const id = parseInt((req.params as any).id)

    const [ticket] = await db
      .update(tickets)
      .set({ status: 'serving', servedAt: new Date() })
      .where(and(eq(tickets.id, id), eq(tickets.status, 'calling'), eq(tickets.officerId, user.id)))
      .returning()

    if (!ticket) return reply.status(409).send({ error: 'Ticket not in calling state or not yours' })

    await db.insert(queueEvents).values({ ticketId: ticket.id, eventType: 'serving', actorId: user.id, counterId: ticket.counterId })
    sseManager.broadcast(ticket.locationId, 'ticket_serving', { ticket })

    return ticket
  })

  // PATCH /api/tickets/:id/done — Selesai dilayani
  app.patch('/:id/done', { preHandler: requireRole('officer', 'admin_location', 'super_admin') }, async (req, reply) => {
    const user = req.user as JWTPayload
    const id = parseInt((req.params as any).id)

    const [ticket] = await db
      .update(tickets)
      .set({ status: 'done', doneAt: new Date() })
      .where(and(eq(tickets.id, id), inArray(tickets.status, ['calling', 'serving']), eq(tickets.officerId, user.id)))
      .returning()

    if (!ticket) return reply.status(409).send({ error: 'Ticket not found or invalid state' })

    await db.insert(queueEvents).values({ ticketId: ticket.id, eventType: 'done', actorId: user.id, counterId: ticket.counterId })
    sseManager.broadcast(ticket.locationId, 'ticket_done', { ticket })

    return ticket
  })

  // PATCH /api/tickets/:id/skip — Lewati / tidak hadir
  app.patch('/:id/skip', { preHandler: requireRole('officer', 'admin_location', 'super_admin') }, async (req, reply) => {
    const user = req.user as JWTPayload
    const id = parseInt((req.params as any).id)

    const [ticket] = await db
      .update(tickets)
      .set({ status: 'skipped' })
      .where(and(eq(tickets.id, id), inArray(tickets.status, ['waiting', 'calling'])))
      .returning()

    if (!ticket) return reply.status(409).send({ error: 'Ticket not found or invalid state' })

    await db.insert(queueEvents).values({ ticketId: ticket.id, eventType: 'skipped', actorId: user.id, counterId: ticket.counterId })
    sseManager.broadcast(ticket.locationId, 'ticket_skipped', { ticket })

    return ticket
  })

  // PATCH /api/tickets/:id/print-confirm — Print agent konfirmasi cetak berhasil
  app.patch('/:id/print-confirm', { preHandler: authenticate }, async (req, reply) => {
    const id = parseInt((req.params as any).id)

    const [ticket] = await db
      .update(tickets)
      .set({ printConfirmed: true })
      .where(eq(tickets.id, id))
      .returning()

    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' })

    await db.insert(queueEvents).values({ ticketId: ticket.id, eventType: 'print_confirmed' })

    return { ok: true }
  })
}
