import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  date,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'admin_location',
  'officer',
  'kiosk',
  'display',
])

export const ticketStatusEnum = pgEnum('ticket_status', [
  'waiting',
  'calling',
  'serving',
  'done',
  'skipped',
  'expired',
])

export const queueEventTypeEnum = pgEnum('queue_event_type', [
  'issued',
  'called',
  'serving',
  'done',
  'skipped',
  'expired',
  'print_confirmed',
  'print_failed',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  address: text('address'),
  isActive: boolean('is_active').notNull().default(true),
  voiceEnabled: boolean('voice_enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const services = pgTable(
  'services',
  {
    id: serial('id').primaryKey(),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    // Prefix tiket: 'A', 'B', 'C' — tampil di nomor tiket (A001, B002, dst)
    prefix: varchar('prefix', { length: 5 }).notNull(),
    dailyLimit: integer('daily_limit').notNull().default(200),
    // Estimasi durasi per tiket (menit), untuk hitung estimasi waktu tunggu
    estimatedMinutes: integer('estimated_minutes').notNull().default(5),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqueLocationCode: unique('uq_service_location_code').on(t.locationId, t.code),
  }),
)

export const counters = pgTable('counters', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // 'Counter ETLE 1'
  code: varchar('code', { length: 50 }).notNull(),
  // Array service ID yang ditangani loket ini
  serviceIds: integer('service_ids').array().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  voiceEnabled: boolean('voice_enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  locationId: integer('location_id').references(() => locations.id),
  counterId: integer('counter_id').references(() => counters.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const kioskDevices = pgTable('kiosk_devices', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id')
    .notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),
  deviceToken: text('device_token').notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  lastHeartbeat: timestamp('last_heartbeat'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Tabel sequence per (lokasi, layanan, hari) — atomic increment via ON CONFLICT DO UPDATE
export const ticketSequences = pgTable(
  'ticket_sequences',
  {
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    lastSequence: integer('last_sequence').notNull().default(0),
  },
  (t) => ({
    pk: unique('pk_ticket_sequences').on(t.locationId, t.serviceId, t.date),
  }),
)

export const tickets = pgTable(
  'tickets',
  {
    id: serial('id').primaryKey(),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id),
    date: date('date').notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    // Format tampil: prefix + nomor urut 3 digit, contoh: A001
    ticketNumber: varchar('ticket_number', { length: 20 }).notNull(),
    status: ticketStatusEnum('status').notNull().default('waiting'),
    counterId: integer('counter_id').references(() => counters.id),
    officerId: integer('officer_id').references(() => users.id),
    kioskId: integer('kiosk_id').references(() => kioskDevices.id),
    issuedAt: timestamp('issued_at').notNull().defaultNow(),
    calledAt: timestamp('called_at'),
    servedAt: timestamp('served_at'),
    doneAt: timestamp('done_at'),
    printConfirmed: boolean('print_confirmed').notNull().default(false),
  },
  (t) => ({
    uniqueTicket: unique('uq_ticket').on(t.locationId, t.serviceId, t.date, t.sequenceNumber),
    idxLocationServiceDate: index('idx_tickets_lsd').on(t.locationId, t.serviceId, t.date),
    idxStatus: index('idx_tickets_status').on(t.status),
    idxDate: index('idx_tickets_date').on(t.date),
  }),
)

// Audit trail semua perubahan status tiket
export const queueEvents = pgTable('queue_events', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id),
  eventType: queueEventTypeEnum('event_type').notNull(),
  actorId: integer('actor_id').references(() => users.id),
  counterId: integer('counter_id').references(() => counters.id),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Relations ───────────────────────────────────────────────────────────────

export const locationsRelations = relations(locations, ({ many }) => ({
  services: many(services),
  counters: many(counters),
  users: many(users),
  kioskDevices: many(kioskDevices),
}))

export const servicesRelations = relations(services, ({ one, many }) => ({
  location: one(locations, { fields: [services.locationId], references: [locations.id] }),
  tickets: many(tickets),
}))

export const countersRelations = relations(counters, ({ one, many }) => ({
  location: one(locations, { fields: [counters.locationId], references: [locations.id] }),
  tickets: many(tickets),
}))

export const usersRelations = relations(users, ({ one }) => ({
  location: one(locations, { fields: [users.locationId], references: [locations.id] }),
  counter: one(counters, { fields: [users.counterId], references: [counters.id] }),
}))

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  location: one(locations, { fields: [tickets.locationId], references: [locations.id] }),
  service: one(services, { fields: [tickets.serviceId], references: [services.id] }),
  counter: one(counters, { fields: [tickets.counterId], references: [counters.id] }),
  officer: one(users, { fields: [tickets.officerId], references: [users.id] }),
  kiosk: one(kioskDevices, { fields: [tickets.kioskId], references: [kioskDevices.id] }),
  events: many(queueEvents),
}))

export const queueEventsRelations = relations(queueEvents, ({ one }) => ({
  ticket: one(tickets, { fields: [queueEvents.ticketId], references: [tickets.id] }),
  actor: one(users, { fields: [queueEvents.actorId], references: [users.id] }),
  counter: one(counters, { fields: [queueEvents.counterId], references: [counters.id] }),
}))
