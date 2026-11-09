import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull(),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
  },
);

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  contactName: text('contact_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  address: text('address').notNull(),
  notes: text('notes'),
  visible: boolean('visible').notNull().default(true),
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
  supplierId: integer('supplier_id').references(() => suppliers.id, {
    onDelete: 'set null',
  }),
  visible: boolean('visible').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  partId: integer('part_id').references(() => parts.id).notNull(),
  type: text('type').notNull(),
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
  status: text('status').notNull().default('en curso'),
  entryDate: text('entry_date').notNull(),
  estimatedDelivery: text('estimated_delivery').notNull(),
  initialDiagnosis: text('initial_diagnosis').notNull(),
  suggestedRepairs: text('suggested_repairs'),
  laborCost: integer('labor_cost').default(0),
  partsCost: integer('parts_cost').default(0),
  totalEstimate: integer('total_estimate').default(0),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const repairSuggestions = pgTable('repair_suggestions', {
  id: serial('id').primaryKey(),
  workOrderId: integer('work_order_id')
    .notNull()
    .references(() => workOrders.id, { onDelete: 'cascade' }),
  mechanicId: integer('mechanic_id').references(() => users.id),
  mechanicName: text('mechanic_name').notNull(),
  description: text('description').notNull(),
  previousLaborCost: integer('previous_labor_cost').notNull().default(0),
  previousPartsCost: integer('previous_parts_cost').notNull().default(0),
  previousTotalEstimate: integer('previous_total_estimate').notNull().default(0),
  additionalLaborCost: integer('additional_labor_cost').notNull().default(0),
  additionalPartsCost: integer('additional_parts_cost').notNull().default(0),
  newLaborCost: integer('new_labor_cost').notNull().default(0),
  newPartsCost: integer('new_parts_cost').notNull().default(0),
  newTotalEstimate: integer('new_total_estimate').notNull().default(0),
  previousEstimatedDelivery: text('previous_estimated_delivery').notNull(),
  newEstimatedDelivery: text('new_estimated_delivery').notNull(),
  status: text('status').notNull().default('pendiente'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const repairSuggestionParts = pgTable('repair_suggestion_parts', {
  id: serial('id').primaryKey(),
  suggestionId: integer('suggestion_id')
    .notNull()
    .references(() => repairSuggestions.id, { onDelete: 'cascade' }),
  partId: integer('part_id')
    .notNull()
    .references(() => parts.id),
  partName: text('part_name').notNull(),
  partCode: text('part_code').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  subtotal: integer('subtotal').notNull(),
});

export const postponementLogs = pgTable('postponement_logs', {
  id: serial('id').primaryKey(),
  workOrderId: integer('work_order_id').references(() => workOrders.id).notNull(),
  mechanicId: integer('mechanic_id').references(() => users.id),
  mechanicName: text('mechanic_name').notNull(),
  previousDate: text('previous_date').notNull(),
  newDate: text('new_date').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const partRequests = pgTable('part_requests', {
  id: serial('id').primaryKey(),
  partId: integer('part_id').references(() => parts.id).notNull(),
  clientId: integer('client_id').references(() => users.id).notNull(),
  clientName: text('client_name').notNull(),
  workOrderId: integer('work_order_id').references(() => workOrders.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
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
  relatedType: text('related_type'),
  relatedId: integer('related_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const emailReads = pgTable(
  'email_reads',
  {
    id: serial('id').primaryKey(),
    emailId: integer('email_id')
      .notNull()
      .references(() => emailLogs.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at').defaultNow(),
  },
  (t) => [unique('email_reads_email_user_unique').on(t.emailId, t.userId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  motorcycles: many(motorcycles),
  assignedWorkOrders: many(workOrders),
  postponementLogs: many(postponementLogs),
  partRequests: many(partRequests),
  sessions: many(sessions),
  emailReads: many(emailReads),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [parts.supplierId],
    references: [suppliers.id],
  }),
  stockMovements: many(stockMovements),
  partRequests: many(partRequests),
  suggestionParts: many(repairSuggestionParts),
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
  repairSuggestions: many(repairSuggestions),
}));

export const repairSuggestionsRelations = relations(repairSuggestions, ({ one, many }) => ({
  workOrder: one(workOrders, {
    fields: [repairSuggestions.workOrderId],
    references: [workOrders.id],
  }),
  mechanic: one(users, {
    fields: [repairSuggestions.mechanicId],
    references: [users.id],
  }),
  parts: many(repairSuggestionParts),
}));

export const repairSuggestionPartsRelations = relations(repairSuggestionParts, ({ one }) => ({
  suggestion: one(repairSuggestions, {
    fields: [repairSuggestionParts.suggestionId],
    references: [repairSuggestions.id],
  }),
  part: one(parts, {
    fields: [repairSuggestionParts.partId],
    references: [parts.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ many }) => ({
  reads: many(emailReads),
}));

export const emailReadsRelations = relations(emailReads, ({ one }) => ({
  email: one(emailLogs, {
    fields: [emailReads.emailId],
    references: [emailLogs.id],
  }),
  user: one(users, {
    fields: [emailReads.userId],
    references: [users.id],
  }),
}));
