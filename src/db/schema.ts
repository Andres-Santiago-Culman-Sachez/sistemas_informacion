import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull(), // 'admin' | 'mechanic' | 'client'
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const parts = pgTable('parts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').default('General'),
  stock: integer('stock').notNull().default(0),
  costPrice: integer('cost_price').notNull().default(0),
  salePrice: integer('sale_price').notNull().default(0),
  minStock: integer('min_stock').default(3),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  partId: integer('part_id').references(() => parts.id).notNull(),
  type: text('type').notNull(), // 'entrada' | 'salida'
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  reason: text('reason').notNull(),
  userId: integer('user_id').references(() => users.id),
  userName: text('user_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const motorcycles = pgTable('motorcycles', {
  id: serial('id').primaryKey(),
  plate: text('plate').notNull().unique(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  year: integer('year'),
  color: text('color'),
  mileage: integer('mileage').default(0),
  clientId: integer('client_id').references(() => users.id).notNull(),
  clientName: text('client_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const workOrders = pgTable('work_orders', {
  id: serial('id').primaryKey(),
  motorcycleId: integer('motorcycle_id').references(() => motorcycles.id).notNull(),
  mechanicId: integer('mechanic_id').references(() => users.id),
  mechanicName: text('mechanic_name'),
  // 'en curso' | 'esperando por autorización del cliente' | 'autorizado por el cliente' | 'finalizado' | 'entregada'
  status: text('status').notNull().default('en curso'),
  entryDate: text('entry_date').notNull(),
  estimatedDelivery: text('estimated_delivery').notNull(),
  initialDiagnosis: text('initial_diagnosis').notNull(),
  suggestedRepairs: text('suggested_repairs'),
  laborCost: integer('labor_cost').default(0),
  partsCost: integer('parts_cost').default(0),
  totalEstimate: integer('total_estimate').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const postponementLogs = pgTable('postponement_logs', {
  id: serial('id').primaryKey(),
  workOrderId: integer('work_order_id').references(() => workOrders.id).notNull(),
  mechanicId: integer('mechanic_id').references(() => users.id),
  mechanicName: text('mechanic_name').notNull(),
  previousDate: text('previous_date').notNull(),
  newDate: text('new_date').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow(), // Fecha de la novedad
});

export const partRequests = pgTable('part_requests', {
  id: serial('id').primaryKey(),
  partId: integer('part_id').references(() => parts.id).notNull(),
  clientId: integer('client_id').references(() => users.id).notNull(),
  clientName: text('client_name').notNull(),
  workOrderId: integer('work_order_id').references(() => workOrders.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
  // 'en camino' | 'en espera por stock' | 'listo para entrega' | 'entregado'
  status: text('status').notNull().default('en camino'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  toEmail: text('to_email').notNull(),
  toName: text('to_name').notNull(),
  subject: text('subject').notNull(),
  triggerEvent: text('trigger_event').notNull(),
  bodyHtml: text('body_html').notNull(),
  status: text('status').notNull().default('sent'),
  relatedType: text('related_type'), // 'work_order' | 'part_request'
  relatedId: integer('related_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  motorcycles: many(motorcycles),
  assignedWorkOrders: many(workOrders),
  postponementLogs: many(postponementLogs),
  partRequests: many(partRequests),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [parts.supplierId],
    references: [suppliers.id],
  }),
  stockMovements: many(stockMovements),
  partRequests: many(partRequests),
}));

export const motorcyclesRelations = relations(motorcycles, ({ one, many }) => ({
  client: one(users, {
    fields: [motorcycles.clientId],
    references: [users.id],
  }),
  workOrders: many(workOrders),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  motorcycle: one(motorcycles, {
    fields: [workOrders.motorcycleId],
    references: [motorcycles.id],
  }),
  mechanic: one(users, {
    fields: [workOrders.mechanicId],
    references: [users.id],
  }),
  postponements: many(postponementLogs),
  partRequests: many(partRequests),
}));
