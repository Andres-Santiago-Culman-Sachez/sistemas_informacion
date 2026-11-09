import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { db } from './src/db/index.ts';
import {
  users,
  motorcycles,
  workOrders,
  postponementLogs,
  parts,
  suppliers,
  stockMovements,
  partRequests,
  emailLogs,
  sessions,
  repairSuggestions,
  repairSuggestionParts,
  emailReads,
} from './src/db/schema.ts';
import { eq, desc, sql, or, and, inArray, asc } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.use(express.json());

// ---------- helpers ----------
const SESSION_TTL_MS = 10 * 60 * 1000;
function todayStr() { return new Date().toISOString().split('T')[0]; }
function isDateStr(s: any) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function toInt(v: any) { const n = Number(v); return Number.isInteger(n) ? n : NaN; }
function yearRange() { const y = new Date().getFullYear(); return { min: 1950, max: y + 1 }; }
function emailOk(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); }
function stripUser(u: any) { const { password, ...rest } = u; return rest; }
function rowsOf(result: any): any[] { return result?.rows ?? result ?? []; }

async function sendAutomatedEmail(params: {
  toEmail: string; toName: string; subject: string; triggerEvent: string;
  bodyHtml: string; relatedType?: 'work_order' | 'part_request'; relatedId?: number;
}) {
  try {
    const inserted = await db.insert(emailLogs).values({
      toEmail: params.toEmail, toName: params.toName, subject: params.subject,
      triggerEvent: params.triggerEvent, bodyHtml: params.bodyHtml,
      status: 'sent', relatedType: params.relatedType ?? null, relatedId: params.relatedId ?? null,
    }).returning();
    console.log(`[EMAIL DISPATCHED] To: ${params.toEmail} | Subject: ${params.subject} | Trigger: ${params.triggerEvent}`);
    return inserted[0];
  } catch (err) { console.error('Error inserting automated email log:', err); return null; }
}

async function getClientOfOrder(order: any) {
  const moto = await db.select().from(motorcycles).where(eq(motorcycles.id, order.motorcycleId)).limit(1);
  if (!moto.length) return null;
  const client = await db.select().from(users).where(eq(users.id, moto[0].clientId)).limit(1);
  return { moto: moto[0], client: client[0] ?? null };
}

async function getPendings(orderId: number) {
  const s = await db.select().from(repairSuggestions).where(and(eq(repairSuggestions.workOrderId, orderId), eq(repairSuggestions.status, 'pendiente')));
  return s;
}
async function recalcOrderStatus(orderId: number) {
  const order = (await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1))[0];
  if (!order) return;
  if (['entregada', 'finalizado'].includes(order.status)) return;
  const all = await db.select().from(repairSuggestions).where(eq(repairSuggestions.workOrderId, orderId));
  const hasPending = all.some((s) => s.status === 'pendiente');
  const hasApproved = all.some((s) => s.status === 'aprobada');
  const next = hasPending ? 'esperando por autorización del cliente' : hasApproved ? 'autorizado por el cliente' : 'en curso';
  if (order.status !== next) await db.update(workOrders).set({ status: next, updatedAt: new Date() }).where(eq(workOrders.id, orderId));
}

// ---------- auth middleware ----------
async function requireAuth(req: Request & { user?: any }, res: Response, next: NextFunction) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const found = await db.select({ session: sessions, user: users }).from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id)).where(eq(sessions.token, token)).limit(1);
    if (!found.length) return res.status(401).json({ error: 'Sesión inválida o expirada' });
    const { session, user } = found[0];
    if (new Date(session.expiresAt) < new Date()) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return res.status(401).json({ error: 'Sesión expirada, inicia sesión nuevamente' });
    }
    req.user = stripUser(user);
    return next();
  } catch (e: any) { console.error('requireAuth', e); return res.status(500).json({ error: 'Error de autenticación' }); }
}
const requireRole = (...roles: string[]) => (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Permiso denegado para este rol' });
  return next();
};

// ---------- Neon status (item 1, 4) ----------
app.get('/api/neon/status', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const dbTest: any = await db.execute(sql`SELECT current_database(), count(*)::int as users_count FROM users;`);
    const row = rowsOf(dbTest)[0] || {};
    const fnUrl = process.env.NEON_FUNCTION_STATUS_URL?.trim() || '';
    let functionStatus = 'not configured';
    if (fnUrl) {
      try {
        const fnRes = await fetch(fnUrl, { signal: AbortSignal.timeout(4000) });
        const fnText = await fnRes.text();
        functionStatus = fnRes.ok ? `active: "${fnText.trim()}"` : `error: ${fnRes.status}`;
      } catch (e: any) { functionStatus = `unavailable: ${e.message}`; }
    }
    const aiToken = process.env.NEON_AI_GATEWAY_TOKEN || process.env.AI_GATEWAY_API_KEY || '';
    return res.json({
      status: 'healthy',
      postgres: {
        connected: true,
        database: row.current_database || 'neondb',
        branch: process.env.NEON_BRANCH || process.env.NEON_BRANCH_ID || '',
        branchId: process.env.NEON_BRANCH_ID || '',
        projectId: process.env.NEON_PROJECT_ID || '',
        usersCount: row.users_count ?? row.usersCount ?? 0,
      },
      functions: { helloFunctionUrl: fnUrl, functionStatus },
      aiGateway: { configured: Boolean(aiToken), baseUrl: process.env.NEON_AI_GATEWAY_BASE_URL || '' },
    });
  } catch (error: any) { console.error('Neon status error:', error); return res.status(500).json({ status: 'error', error: error.message }); }
});

// ---------- Auth ----------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    const found = await db.select().from(users).where(eq(users.email, String(email).trim().toLowerCase())).limit(1);
    if (!found.length) return res.status(401).json({ error: 'Credenciales inválidas. Usuario no encontrado.' });
    if (found[0].password !== password) return res.status(401).json({ error: 'Contraseña incorrecta' });
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.insert(sessions).values({ token, userId: found[0].id, expiresAt });
    return res.json({ user: stripUser(found[0]), token });
  } catch (error: any) { console.error('Login error:', error); return res.status(500).json({ error: 'Error durante la autenticación' }); }
});
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const h = req.headers.authorization || ''; const token = h.slice(7);
  await db.delete(sessions).where(eq(sessions.token, token));
  return res.json({ ok: true });
});
app.get('/api/auth/me', requireAuth, async (req, res) => { return res.json({ user: (req as any).user }); });

app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    const role = req.query.role as string | undefined;
    let list = await db.select({ id: users.id, uid: users.uid, name: users.name, email: users.email, role: users.role, phone: users.phone }).from(users);
    if (role) list = list.filter((u) => u.role === role);
    if (me.role === 'client') list = list.filter((u) => u.id === me.id);
    return res.json(list);
  } catch (error: any) { console.error(error); return res.status(500).json({ error: 'Error al consultar usuarios' }); }
});

// ---------- Motorcycles ----------
app.get('/api/motorcycles', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    const all = await db.select().from(motorcycles).orderBy(desc(motorcycles.id));
    if (me.role === 'admin') return res.json(all);
    if (me.role === 'client') return res.json(all.filter((m) => m.clientId === me.id));
    const mine = await db.select().from(workOrders).where(eq(workOrders.mechanicId, me.id));
    const ids = new Set(mine.map((o) => o.motorcycleId));
    return res.json(all.filter((m) => ids.has(m.id)));
  } catch (error: any) { console.error(error); return res.status(500).json({ error: 'Error al consultar motocicletas' }); }
});

async function validateNewMotorcycleBody(b: any) {
  const { plate, brand, model, year, color, mileage, clientId } = b || {};
  if (!plate?.toString().trim() || !brand?.toString().trim() || !model?.toString().trim()
    || year === undefined || year === null || year === '' || !color?.toString().trim()
    || mileage === undefined || mileage === null || mileage === '' || clientId === undefined || clientId === null || clientId === '') {
    return { error: 'Todos los campos de la motocicleta son obligatorios (placa, marca, modelo, año, color, kilometraje, cliente)' };
  }
  const yr = toInt(year), mi = toInt(mileage), cid = toInt(clientId);
  const { min, max } = yearRange();
  if (Number.isNaN(yr) || yr < min || yr > max) return { error: `Año inválido (1950-${max})` };
  if (Number.isNaN(mi) || mi < 0) return { error: 'Kilometraje debe ser >= 0' };
  if (Number.isNaN(cid)) return { error: 'Cliente inválido' };
  const client = await db.select().from(users).where(eq(users.id, cid)).limit(1);
  if (!client.length || client[0].role !== 'client') return { error: 'Cliente no existe o no tiene rol client' };
  return { data: { plate: String(plate).toUpperCase().trim(), brand: String(brand).trim(), model: String(model).trim(), year: yr, color: String(color).trim(), mileage: mi, clientId: cid, clientName: client[0].name } };
}

app.post('/api/motorcycles', requireAuth, requireRole('admin', 'mechanic'), async (req, res) => {
  try {
    const v = await validateNewMotorcycleBody(req.body);
    if ((v as any).error) return res.status(400).json({ error: (v as any).error });
    const inserted = await db.insert(motorcycles).values((v as any).data).returning();
    return res.status(201).json(inserted[0]);
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'Placa ya registrada' });
    console.error(error); return res.status(500).json({ error: error.message || 'Error al registrar motocicleta' });
  }
});

// ---------- Work Orders ----------
app.get('/api/work-orders', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    let orders = await db.select().from(workOrders).orderBy(desc(workOrders.id));
    const allMotos = await db.select().from(motorcycles);
    const motoMap = new Map(allMotos.map((m) => [m.id, m]));
    if (me.role === 'mechanic') orders = orders.filter((o) => o.mechanicId === me.id);
    if (me.role === 'client') orders = orders.filter((o) => { const m = motoMap.get(o.motorcycleId); return m?.clientId === me.id; });
    const allLogs = await db.select().from(postponementLogs).orderBy(desc(postponementLogs.createdAt));
    const logsMap = new Map<number, typeof allLogs>();
    for (const log of allLogs) { const ex = logsMap.get(log.workOrderId) || []; ex.push(log); logsMap.set(log.workOrderId, ex); }
    const allSugg = await db.select().from(repairSuggestions).orderBy(asc(repairSuggestions.createdAt));
    const allSParts = await db.select().from(repairSuggestionParts);
    const spMap = new Map<number, typeof allSParts>();
    for (const p of allSParts) { const ex = spMap.get(p.suggestionId) || []; ex.push(p); spMap.set(p.suggestionId, ex); }
    const suggMap = new Map<number, any[]>();
    for (const s of allSugg) { const ex = suggMap.get(s.workOrderId) || []; ex.push({ ...s, parts: spMap.get(s.id) || [] }); suggMap.set(s.workOrderId, ex); }
    const populated = orders.map((ord) => ({ ...ord, motorcycle: motoMap.get(ord.motorcycleId), postponements: logsMap.get(ord.id) || [], repairSuggestions: suggMap.get(ord.id) || [] }));
    return res.json(populated);
  } catch (error: any) { console.error(error); return res.status(500).json({ error: 'Error al consultar órdenes de trabajo' }); }
});

app.post('/api/work-orders', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const b = req.body || {};
    const { motorcycleId, newMotorcycle, mechanicId, initialDiagnosis, estimatedDelivery, laborCost, partsCost, suggestedRepairs, clientId } = b;
    if (!mechanicId) return res.status(400).json({ error: 'Mecánico obligatorio' });
    if (!initialDiagnosis?.toString().trim()) return res.status(400).json({ error: 'Diagnóstico inicial obligatorio' });
    if (!isDateStr(estimatedDelivery)) return res.status(400).json({ error: 'Fecha estimada obligatoria (YYYY-MM-DD)' });
    if (estimatedDelivery < todayStr()) return res.status(400).json({ error: 'Fecha estimada no puede ser anterior a hoy' });
    const mech = await db.select().from(users).where(eq(users.id, toInt(mechanicId))).limit(1);
    if (!mech.length || mech[0].role !== 'mechanic') return res.status(400).json({ error: 'Mecánico no existe o no tiene rol mechanic' });
    const lCost = toInt(laborCost), pCost = toInt(partsCost);
    if (laborCost === undefined || laborCost === null || laborCost === '' || partsCost === undefined || partsCost === null || partsCost === '') return res.status(400).json({ error: 'Mano de obra y repuestos obligatorios' });
    if (Number.isNaN(lCost) || lCost < 0 || Number.isNaN(pCost) || pCost < 0) return res.status(400).json({ error: 'Costos deben ser enteros >= 0' });
    const total = lCost + pCost;

    if (newMotorcycle) {
      const v = await validateNewMotorcycleBody(newMotorcycle);
      if ((v as any).error) return res.status(400).json({ error: (v as any).error });
      if (clientId !== undefined && toInt(clientId) !== (v as any).data.clientId) return res.status(400).json({ error: 'Cliente inconsistente' });
      const created = await db.transaction(async (tx) => {
        const m = await tx.insert(motorcycles).values((v as any).data).returning();
        const o = await tx.insert(workOrders).values({
          motorcycleId: m[0].id, mechanicId: mech[0].id, mechanicName: mech[0].name,
          status: 'en curso', entryDate: todayStr(), estimatedDelivery, initialDiagnosis: String(initialDiagnosis).trim(),
          suggestedRepairs: suggestedRepairs?.toString().trim() || null, laborCost: lCost, partsCost: pCost, totalEstimate: total,
        }).returning();
        return { moto: m[0], order: o[0] };
      });
      const moto = await db.select().from(motorcycles).where(eq(motorcycles.id, created.order.motorcycleId)).limit(1);
      return res.status(201).json({ ...created.order, motorcycle: moto[0] });
    }
    if (!motorcycleId) return res.status(400).json({ error: 'Motocicleta obligatoria' });
    if (clientId === undefined || clientId === null || clientId === '') return res.status(400).json({ error: 'Cliente obligatorio' });
    const cid = toInt(clientId);
    const client = await db.select().from(users).where(eq(users.id, cid)).limit(1);
    if (!client.length || client[0].role !== 'client') return res.status(400).json({ error: 'Cliente no existe o no tiene rol client' });
    const moto = await db.select().from(motorcycles).where(eq(motorcycles.id, toInt(motorcycleId))).limit(1);
    if (!moto.length) return res.status(400).json({ error: 'Motocicleta no existe' });
    if (moto[0].clientId !== cid) return res.status(400).json({ error: 'La motocicleta no pertenece al cliente' });
    const inserted = await db.insert(workOrders).values({
      motorcycleId: moto[0].id, mechanicId: mech[0].id, mechanicName: mech[0].name,
      status: 'en curso', entryDate: todayStr(), estimatedDelivery, initialDiagnosis: String(initialDiagnosis).trim(),
      suggestedRepairs: suggestedRepairs?.toString().trim() || null, laborCost: lCost, partsCost: pCost, totalEstimate: total,
    }).returning();
    return res.status(201).json({ ...inserted[0], motorcycle: moto[0] });
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ error: 'Placa ya registrada' });
    console.error(error); return res.status(500).json({ error: error.message || 'Error al crear la orden de trabajo' });
  }
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'en curso': ['esperando por autorización del cliente', 'finalizado'],
  'esperando por autorización del cliente': ['en curso', 'autorizado por el cliente'],
  'autorizado por el cliente': ['en curso', 'finalizado'],
  'finalizado': ['entregada'],
  'entregada': [],
};

async function handleStatusChange(orderId: number, target: string, user: any) {
  if (!target) throw Object.assign(new Error('Estado destino obligatorio'), { code: 400 });
  const cur = (await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1))[0];
  if (!cur) throw Object.assign(new Error('Orden no encontrada'), { code: 404 });
  const allowed = ALLOWED_TRANSITIONS[cur.status] || [];
  if (!allowed.includes(target)) throw Object.assign(new Error(`Transición no permitida: ${cur.status} -> ${target}`), { code: 400 });
  if (target === 'entregada') {
    if (user.role !== 'admin') throw Object.assign(new Error('Solo admin puede entregar'), { code: 403 });
    const pend = await getPendings(orderId);
    if (pend.length) throw Object.assign(new Error('No se puede entregar: existen sugerencias pendientes'), { code: 409 });
  }
  if (target === 'finalizado') {
    if (user.role === 'mechanic' && cur.mechanicId !== user.id) throw Object.assign(new Error('Solo el mecánico asignado o admin'), { code: 403 });
    if (user.role === 'client') throw Object.assign(new Error('Permiso denegado'), { code: 403 });
    const pend = await getPendings(orderId);
    if (pend.length) throw Object.assign(new Error('No se puede finalizar: existen sugerencias pendientes'), { code: 409 });
  }
  if (!['admin', 'mechanic'].includes(user.role)) throw Object.assign(new Error('Permiso denegado'), { code: 403 });
  const updated = await db.update(workOrders).set({ status: target, updatedAt: new Date(), deliveredAt: target === 'entregada' ? new Date() : cur.deliveredAt }).where(eq(workOrders.id, orderId)).returning();
  // emails for status (keep prior behaviour where applicable, but not for esperando via direct PATCH duplicating suggestion flow)
  const ctx = await getClientOfOrder(cur);
  if (ctx?.client) {
    const cUser = ctx.client, motoDesc = `${ctx.moto.brand} ${ctx.moto.model} (${ctx.moto.plate})`;
    if (target === 'autorizado por el cliente') {
      await sendAutomatedEmail({ toEmail: cUser.email, toName: cUser.name, subject: `[Motilón Motors] Confirmación: Reparación autorizada para ${motoDesc}`, triggerEvent: 'autorizado por el cliente', bodyHtml: `<p>Hola <strong>${cUser.name}</strong>, hemos registrado tu autorización para la reparación de tu moto <strong>${motoDesc}</strong>. <strong>Fecha estimada:</strong> ${updated[0].estimatedDelivery}</p>`, relatedType: 'work_order', relatedId: orderId });
    } else if (target === 'finalizado') {
      await sendAutomatedEmail({ toEmail: cUser.email, toName: cUser.name, subject: `[Motilón Motors] ¡Tu moto ${motoDesc} está lista para recoger!`, triggerEvent: 'finalizado', bodyHtml: `<p>Hola <strong>${cUser.name}</strong>, los trabajos en tu motocicleta <strong>${motoDesc}</strong> han finalizado.</p>`, relatedType: 'work_order', relatedId: orderId });
    }
  }
  return updated[0];
}

app.patch('/api/work-orders/:id/status', requireAuth, async (req, res) => {
  try { const updated = await handleStatusChange(Number(req.params.id), req.body?.status, (req as any).user); return res.json(updated); }
  catch (e: any) { return res.status(e.code || 500).json({ error: e.message || 'Error al actualizar estado' }); }
});
app.post('/api/work-orders/:id/deliver', requireAuth, requireRole('admin'), async (req, res) => {
  try { const updated = await handleStatusChange(Number(req.params.id), 'entregada', (req as any).user); return res.json(updated); }
  catch (e: any) { return res.status(e.code || 500).json({ error: e.message }); }
});
app.post('/api/work-orders/:id/postpone', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user; const orderId = Number(req.params.id);
    const { newDate, reason } = req.body || {};
    if (!isDateStr(newDate)) return res.status(400).json({ error: 'Nueva fecha obligatoria (YYYY-MM-DD)' });
    if (!reason?.toString().trim()) return res.status(400).json({ error: 'Justificación obligatoria' });
    const cur = (await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1))[0];
    if (!cur) return res.status(404).json({ error: 'Orden no encontrada' });
    if (me.role === 'mechanic' && cur.mechanicId !== me.id) return res.status(403).json({ error: 'Solo mecánico asignado o admin' });
    if (!['admin', 'mechanic'].includes(me.role)) return res.status(403).json({ error: 'Permiso denegado' });
    if (newDate < cur.estimatedDelivery) return res.status(400).json({ error: 'Nueva fecha debe ser >= fecha estimada actual' });
    if (newDate < todayStr()) return res.status(400).json({ error: 'Nueva fecha no puede ser anterior a hoy' });
    const logEntry = await db.insert(postponementLogs).values({ workOrderId: orderId, mechanicId: me.id, mechanicName: me.name, previousDate: cur.estimatedDelivery, newDate, reason: String(reason).trim(), createdAt: new Date() }).returning();
    const updatedOrder = await db.update(workOrders).set({ estimatedDelivery: newDate, updatedAt: new Date() }).where(eq(workOrders.id, orderId)).returning();
    return res.json({ order: updatedOrder[0], log: logEntry[0] });
  } catch (error: any) { console.error(error); return res.status(500).json({ error: 'Error al registrar aplazamiento' }); }
});

// ---------- Repair Suggestions ----------
app.get('/api/work-orders/:id/repair-suggestions', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user; const orderId = Number(req.params.id);
    const ord = (await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1))[0];
    if (!ord) return res.status(404).json({ error: 'Orden no encontrada' });
    const ctx = await getClientOfOrder(ord);
    if (me.role === 'client' && ctx?.moto?.clientId !== me.id) return res.status(403).json({ error: 'Sin acceso' });
    if (me.role === 'mechanic' && ord.mechanicId !== me.id) return res.status(403).json({ error: 'Sin acceso' });
    const sugg = await db.select().from(repairSuggestions).where(eq(repairSuggestions.workOrderId, orderId)).orderBy(asc(repairSuggestions.createdAt));
    const withParts = await Promise.all(sugg.map(async (s) => { const ps = await db.select().from(repairSuggestionParts).where(eq(repairSuggestionParts.suggestionId, s.id)); return { ...s, parts: ps }; }));
    return res.json(withParts);
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.post('/api/work-orders/:id/repair-suggestions', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user; const orderId = Number(req.params.id);
    const b = req.body || {};
    if (!['admin', 'mechanic'].includes(me.role)) return res.status(403).json({ error: 'Permiso denegado' });
    const ord = (await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1))[0];
    if (!ord) return res.status(404).json({ error: 'Orden no encontrada' });
    if (me.role === 'mechanic' && ord.mechanicId !== me.id) return res.status(403).json({ error: 'Solo el mecánico asignado o admin' });
    if (ord.status === 'entregada') return res.status(409).json({ error: 'No se puede sugerir en moto entregada' });
    if (ord.status === 'finalizado') return res.status(409).json({ error: 'No se puede sugerir en orden finalizada' });
    const { description, additionalLaborCost, newEstimatedDelivery, linkedParts, additionalPartsCost: manualParts } = b;
    if (!description?.toString().trim()) return res.status(400).json({ error: 'Descripción obligatoria' });
    const addLabor = toInt(additionalLaborCost);
    if (additionalLaborCost === undefined || Number.isNaN(addLabor) || addLabor < 0) return res.status(400).json({ error: 'Mano de obra adicional entera >= 0 obligatoria' });
    if (!isDateStr(newEstimatedDelivery)) return res.status(400).json({ error: 'Nueva fecha obligatoria (YYYY-MM-DD)' });
    if (newEstimatedDelivery < ord.estimatedDelivery) return res.status(400).json({ error: 'Nueva fecha debe ser >= fecha estimada actual' });
    if (newEstimatedDelivery < todayStr()) return res.status(400).json({ error: 'Nueva fecha no puede ser anterior a hoy' });
    const lp = Array.isArray(linkedParts) ? linkedParts : [];
    let addParts = 0; const snapshots: any[] = [];
    for (const item of lp) {
      const pid = toInt(item.partId), q = toInt(item.quantity);
      if (Number.isNaN(pid) || Number.isNaN(q) || q <= 0) return res.status(400).json({ error: 'Repuestos vinculados inválidos' });
      const p = (await db.select().from(parts).where(eq(parts.id, pid)).limit(1))[0];
      if (!p || p.visible === false) return res.status(400).json({ error: `Repuesto ${pid} no disponible` });
      if (!(p.stock > 0)) return res.status(400).json({ error: `Repuesto ${p.code} sin stock` });
      if (q > p.stock) return res.status(400).json({ error: `Cantidad supera stock de ${p.code} (${p.stock})` });
      const unitPrice = p.salePrice; const subtotal = unitPrice * q; addParts += subtotal;
      snapshots.push({ partId: p.id, partName: p.name, partCode: p.code, quantity: q, unitPrice, subtotal });
    }
    if (!snapshots.length) {
      const mp = manualParts === undefined || manualParts === '' ? 0 : toInt(manualParts);
      if (Number.isNaN(mp) || mp < 0) return res.status(400).json({ error: 'Costo manual de repuestos debe ser entero >= 0' });
      addParts = mp;
    }
    const prevLabor = ord.laborCost ?? 0, prevParts = ord.partsCost ?? 0, prevTotal = ord.totalEstimate ?? (prevLabor + prevParts);
    const newLabor = prevLabor + addLabor, newParts = prevParts + addParts, newTotal = newLabor + newParts;
    const suggestion = await db.transaction(async (tx) => {
      const inserted = await tx.insert(repairSuggestions).values({
        workOrderId: orderId, mechanicId: me.id, mechanicName: me.name, description: String(description).trim(),
        previousLaborCost: prevLabor, previousPartsCost: prevParts, previousTotalEstimate: prevTotal,
        additionalLaborCost: addLabor, additionalPartsCost: addParts,
        newLaborCost: newLabor, newPartsCost: newParts, newTotalEstimate: newTotal,
        previousEstimatedDelivery: ord.estimatedDelivery, newEstimatedDelivery, status: 'pendiente',
      }).returning();
      for (const s of snapshots) await tx.insert(repairSuggestionParts).values({ suggestionId: inserted[0].id, ...s });
      await tx.update(workOrders).set({ status: 'esperando por autorización del cliente', updatedAt: new Date() }).where(eq(workOrders.id, orderId));
      return inserted[0];
    });
    const ctx = await getClientOfOrder(ord);
    if (ctx?.client) {
      const c = ctx.client, m = ctx.moto;
      await sendAutomatedEmail({ toEmail: c.email, toName: c.name, subject: `[Motilón Motors] Nueva reparación sugerida para tu ${m.brand} ${m.model} (${m.plate})`, triggerEvent: 'esperando por autorización del cliente', bodyHtml: `<p>Hola <strong>${c.name}</strong>, el mecánico sugirió: ${String(description)}</p><p>Anterior: mano de obra $${prevLabor.toLocaleString('es-CO')} / repuestos $${prevParts.toLocaleString('es-CO')} / total $${prevTotal.toLocaleString('es-CO')} / fecha ${ord.estimatedDelivery}</p><p>Nuevo: mano de obra $${newLabor.toLocaleString('es-CO')} / repuestos $${newParts.toLocaleString('es-CO')} / total $${newTotal.toLocaleString('es-CO')} / fecha ${newEstimatedDelivery}</p>`, relatedType: 'work_order', relatedId: orderId });
    }
    const sp = await db.select().from(repairSuggestionParts).where(eq(repairSuggestionParts.suggestionId, suggestion.id));
    return res.status(201).json({ ...suggestion, parts: sp });
  } catch (e: any) { console.error(e); return res.status(500).json({ error: e.message || 'Error al crear sugerencia' }); }
});

async function loadSuggestion(sid: number) {
  const s = (await db.select().from(repairSuggestions).where(eq(repairSuggestions.id, sid)).limit(1))[0];
  if (!s) return null;
  const ord = (await db.select().from(workOrders).where(eq(workOrders.id, s.workOrderId)).limit(1))[0];
  const ctx = ord ? await getClientOfOrder(ord) : null;
  return { s, ord, ctx };
}

app.patch('/api/repair-suggestions/:id/authorize', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user; const sid = Number(req.params.id);
    const loaded = await loadSuggestion(sid);
    if (!loaded?.s) return res.status(404).json({ error: 'Sugerencia no encontrada' });
    const { s, ord, ctx } = loaded as any;
    if (!ctx || ctx.moto.clientId !== me.id) return res.status(403).json({ error: 'Solo el cliente dueño puede autorizar' });
    if (s.status !== 'pendiente') return res.status(409).json({ error: 'Sugerencia no está pendiente' });
    if (ord.status === 'entregada') return res.status(409).json({ error: 'Orden entregada' });
    // stock check before txn
    const sp = await db.select().from(repairSuggestionParts).where(eq(repairSuggestionParts.suggestionId, sid));
    for (const row of sp) {
      const p = (await db.select().from(parts).where(eq(parts.id, row.partId)).limit(1))[0];
      if (!p || p.stock < row.quantity) return res.status(409).json({ error: `Stock insuficiente para ${row.partCode}` });
    }
    await db.transaction(async (tx) => {
      for (const row of sp) {
        const locked: any = await tx.execute(sql`SELECT * FROM parts WHERE id = ${row.partId} FOR UPDATE`);
        const part = rowsOf(locked)[0];
        if (!part || part.stock < row.quantity) throw Object.assign(new Error(`Stock insuficiente para ${row.partCode}`), { code: 409 });
        const newStock = part.stock - row.quantity;
        await tx.update(parts).set({ stock: newStock }).where(eq(parts.id, row.partId));
        await tx.insert(stockMovements).values({ partId: row.partId, type: 'salida', quantity: row.quantity, previousStock: part.stock, newStock, reason: `Consumo por reparación sugerida #${sid}`, userId: me.id, userName: me.name });
      }
      const cur = (await tx.select().from(workOrders).where(eq(workOrders.id, ord.id)).limit(1))[0];
      const nl = (cur.laborCost ?? 0) + s.additionalLaborCost, np = (cur.partsCost ?? 0) + s.additionalPartsCost, nt = nl + np;
      await tx.update(workOrders).set({
        laborCost: nl, partsCost: np, totalEstimate: nt,
        estimatedDelivery: s.newEstimatedDelivery,
        status: 'autorizado por el cliente', // recalculará abajo si quedan pendientes
        updatedAt: new Date(),
      }).where(eq(workOrders.id, ord.id));
      await tx.update(repairSuggestions).set({ status: 'aprobada', respondedAt: new Date(), updatedAt: new Date() }).where(eq(repairSuggestions.id, sid));
    });
    await recalcOrderStatus(ord.id);
    const m = ctx.moto, c = ctx.client;
    await sendAutomatedEmail({ toEmail: c.email, toName: c.name, subject: `[Motilón Motors] Reparación autorizada - ${m.plate}`, triggerEvent: 'autorizado por el cliente', bodyHtml: `<p>Hola ${c.name}, autorizaste la reparación de tu moto ${m.plate}.</p>`, relatedType: 'work_order', relatedId: ord.id });
    const updated = (await db.select().from(repairSuggestions).where(eq(repairSuggestions.id, sid)).limit(1))[0];
    return res.json({ ...updated, parts: sp });
  } catch (e: any) { return res.status(e.code || 500).json({ error: e.message }); }
});

app.patch('/api/repair-suggestions/:id/reject', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user; const sid = Number(req.params.id);
    const loaded = await loadSuggestion(sid);
    if (!loaded?.s) return res.status(404).json({ error: 'Sugerencia no encontrada' });
    const { s, ord, ctx } = loaded as any;
    if (!ctx || ctx.moto.clientId !== me.id) return res.status(403).json({ error: 'Solo el cliente dueño puede rechazar' });
    if (s.status !== 'pendiente') return res.status(409).json({ error: 'Sugerencia no está pendiente' });
    await db.update(repairSuggestions).set({ status: 'rechazada', respondedAt: new Date(), updatedAt: new Date() }).where(eq(repairSuggestions.id, sid));
    // no toca costos ni fecha; recalcula status
    await recalcOrderStatus(ord.id);
    const c = ctx.client, m = ctx.moto;
    if (c) await sendAutomatedEmail({ toEmail: c.email, toName: c.name, subject: `[Motilón Motors] Reparación rechazada - ${m.plate}`, triggerEvent: 'autorizado por el cliente', bodyHtml: `<p>Hola ${c.name}, registramos tu rechazo de la reparación sugerida para ${m.plate}. El presupuesto no fue modificado.</p>`, relatedType: 'work_order', relatedId: ord.id });
    const updated = (await db.select().from(repairSuggestions).where(eq(repairSuggestions.id, sid)).limit(1))[0];
    return res.json(updated);
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// ---------- Suppliers (soft-hide B13) ----------
app.get('/api/suppliers', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    if (!['admin', 'mechanic'].includes(me.role)) return res.status(403).json({ error: 'Sin acceso a proveedores' });
    const list = await db.select().from(suppliers).where(eq(suppliers.visible, true)).orderBy(desc(suppliers.id));
    return res.json(list);
  } catch (e: any) { return res.status(500).json({ error: 'Error al consultar proveedores' }); }
});
function validateSupplier(b: any, partial = false) {
  const fields = ['name', 'contactName', 'phone', 'email', 'address'] as const;
  const out: any = {};
  for (const f of fields) {
    const v = b?.[f];
    if (v !== undefined) { if (!v?.toString().trim()) return { error: `${f} obligatorio` }; out[f] = v.toString().trim(); }
    else if (!partial) return { error: `${f} obligatorio` };
  }
  if (out.email && !emailOk(out.email)) return { error: 'Email inválido' };
  if (out.phone && out.phone.toString().trim().length < 6) return { error: 'Teléfono inválido' };
  if (b?.notes !== undefined) out.notes = b.notes?.toString().trim() || null;
  return { data: out };
}
app.post('/api/suppliers', requireAuth, requireRole('admin'), async (req, res) => {
  try { const v = validateSupplier(req.body); if ((v as any).error) return res.status(400).json({ error: (v as any).error });
    const inserted = await db.insert(suppliers).values((v as any).data).returning(); return res.status(201).json(inserted[0]);
  } catch (e: any) { if (e?.code === '23505') return res.status(409).json({ error: 'Proveedor ya existe' }); return res.status(500).json({ error: 'Error al registrar proveedor' }); }
});
app.patch('/api/suppliers/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try { const id = Number(req.params.id); const v = validateSupplier(req.body, true); if ((v as any).error) return res.status(400).json({ error: (v as any).error });
    const cur = (await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1))[0]; if (!cur) return res.status(404).json({ error: 'Proveedor no encontrado' });
    const merged = { name: cur.name, contactName: cur.contactName, phone: cur.phone, email: cur.email, address: cur.address, notes: cur.notes, ...(v as any).data };
    if (!emailOk(merged.email)) return res.status(400).json({ error: 'Email inválido' });
    const updated = await db.update(suppliers).set(merged).where(eq(suppliers.id, id)).returning(); return res.json(updated[0]);
  } catch (e: any) { if (e?.code === '23505') return res.status(409).json({ error: 'Proveedor ya existe' }); return res.status(500).json({ error: 'Error al actualizar proveedor' }); }
});
app.get('/api/suppliers/:id/delete-preview', requireAuth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const sup = (await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1))[0];
  if (!sup) return res.status(404).json({ error: 'Proveedor no encontrado' });
  const ps = await db.select().from(parts).where(and(eq(parts.supplierId, id), eq(parts.visible, true)));
  const withStock = ps.filter((p) => p.stock > 0).slice(0, 5).map((p) => ({ code: p.code, stock: p.stock }));
  return res.json({ supplier: sup, totalParts: ps.length, partsWithStock: withStock });
});
app.delete('/api/suppliers/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.transaction(async (tx) => {
      await tx.update(parts).set({ visible: false }).where(eq(parts.supplierId, id));
      await tx.update(suppliers).set({ visible: false }).where(eq(suppliers.id, id));
    });
    return res.status(204).send();
  } catch (e: any) { return res.status(500).json({ error: 'Error al eliminar proveedor' }); }
});

// ---------- Parts ----------
app.get('/api/parts', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    if (!['admin', 'mechanic'].includes(me.role)) return res.status(403).json({ error: 'Sin acceso a repuestos' });
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const inStock = req.query.inStock === 'true';
    let all = await db.select().from(parts).where(eq(parts.visible, true)).orderBy(desc(parts.id));
    if (inStock) all = all.filter((p) => p.stock > 0);
    const allSuppliers = await db.select().from(suppliers);
    const supMap = new Map(allSuppliers.map((s) => [s.id, s.name]));
    let filtered = all.map((p) => ({ ...p, supplierName: p.supplierId ? supMap.get(p.supplierId) : 'Sin proveedor' }));
    if (search && search.trim()) { const q = search.toLowerCase().trim(); filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))); }
    if (category && category !== 'Todos') filtered = filtered.filter((p) => p.category === category);
    return res.json(filtered);
  } catch (e: any) { console.error(e); return res.status(500).json({ error: 'Error al consultar repuestos' }); }
});
app.post('/api/parts', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    if (!['admin', 'mechanic'].includes(me.role)) return res.status(403).json({ error: 'Permiso denegado' });
    const b = req.body || {};
    if (!b.name?.toString().trim() || !b.code?.toString().trim()) return res.status(400).json({ error: 'Nombre y código obligatorios' });
    const stock = toInt(b.stock ?? 0), costPrice = toInt(b.costPrice ?? 0), salePrice = toInt(b.salePrice ?? 0), minStock = toInt(b.minStock ?? 3);
    if ([stock, costPrice, salePrice, minStock].some((n) => Number.isNaN(n) || n < 0)) return res.status(400).json({ error: 'Stock/costos deben ser enteros >= 0' });
    const supplierId = b.supplierId ? toInt(b.supplierId) : null;
    if (supplierId !== null) {
      if (Number.isNaN(supplierId)) return res.status(400).json({ error: 'Proveedor inválido' });
      const sup = (await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1))[0];
      if (!sup || sup.visible === false) return res.status(400).json({ error: 'Proveedor no existe o no visible' });
    }
    const inserted = await db.insert(parts).values({ name: String(b.name).trim(), code: String(b.code).toUpperCase().trim(), description: b.description?.toString().trim() || null, category: b.category?.toString().trim() || 'General', stock, costPrice, salePrice, minStock, supplierId }).returning();
    if (stock > 0) await db.insert(stockMovements).values({ partId: inserted[0].id, type: 'entrada', quantity: stock, previousStock: 0, newStock: stock, reason: 'Inventario inicial', userName: me.name });
    return res.status(201).json(inserted[0]);
  } catch (e: any) { if (e?.code === '23505') return res.status(409).json({ error: 'Código ya existe' }); console.error(e); return res.status(500).json({ error: e.message || 'Error al registrar repuesto' }); }
});
app.patch('/api/parts', requireAuth, async (req, res) => {
  // update part fields (costs etc) – admin/mechanic
  try {
    const me = (req as any).user; const b = req.body || {};
    if (!['admin', 'mechanic'].includes(me.role)) return res.status(403).json({ error: 'Permiso denegado' });
    if (!b.id) return res.status(400).json({ error: 'id requerido' });
    const cur = (await db.select().from(parts).where(eq(parts.id, toInt(b.id))).limit(1))[0];
    if (!cur) return res.status(404).json({ error: 'Repuesto no encontrado' });
    const patch: any = {};
    if (b.name !== undefined) { if (!b.name.toString().trim()) return res.status(400).json({ error: 'Nombre obligatorio' }); patch.name = b.name.toString().trim(); }
    if (b.code !== undefined) { if (!b.code.toString().trim()) return res.status(400).json({ error: 'Código obligatorio' }); patch.code = b.code.toString().toUpperCase().trim(); }
    if (b.description !== undefined) patch.description = b.description?.toString().trim() || null;
    if (b.category !== undefined) patch.category = b.category.toString().trim() || 'General';
    for (const k of ['costPrice', 'salePrice', 'minStock'] as const) { if (b[k] !== undefined) { const n = toInt(b[k]); if (Number.isNaN(n) || n < 0) return res.status(400).json({ error: `${k} >= 0` }); patch[k] = n; } }
    if (b.supplierId !== undefined) {
      if (b.supplierId === null || b.supplierId === '') patch.supplierId = null;
      else { const sid = toInt(b.supplierId); const sup = (await db.select().from(suppliers).where(eq(suppliers.id, sid)).limit(1))[0]; if (!sup) return res.status(400).json({ error: 'Proveedor no existe' }); patch.supplierId = sid; }
    }
    const updated = await db.update(parts).set(patch).where(eq(parts.id, cur.id)).returning();
    return res.json(updated[0]);
  } catch (e: any) { if (e?.code === '23505') return res.status(409).json({ error: 'Código ya existe' }); return res.status(500).json({ error: e.message }); }
});
app.patch('/api/parts/:id/stock', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    if (!['admin', 'mechanic'].includes(me.role)) return res.status(403).json({ error: 'Permiso denegado' });
    const partId = Number(req.params.id); const { type, quantity, reason } = req.body || {};
    const qty = toInt(quantity);
    if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Cantidad entera > 0' });
    if (!reason?.toString().trim()) return res.status(400).json({ error: 'Justificación obligatoria' });
    if (!['entrada', 'salida'].includes(type)) return res.status(400).json({ error: 'Tipo inválido' });
    const result = await db.transaction(async (tx) => {
      const locked: any = await tx.execute(sql`SELECT * FROM parts WHERE id = ${partId} FOR UPDATE`);
      const part = rowsOf(locked)[0];
      if (!part) throw Object.assign(new Error('Repuesto no encontrado'), { code: 404 });
      const prev = part.stock; let next = prev;
      if (type === 'entrada') next = prev + qty; else { if (prev < qty) throw Object.assign(new Error(`Stock insuficiente (${prev})`), { code: 400 }); next = prev - qty; }
      const updated = await tx.update(parts).set({ stock: next }).where(eq(parts.id, partId)).returning();
      const movement = await tx.insert(stockMovements).values({ partId, type, quantity: qty, previousStock: prev, newStock: next, reason: String(reason).trim(), userId: me.id, userName: me.name }).returning();
      return { part: updated[0], movement: movement[0] };
    });
    return res.json(result);
  } catch (e: any) { return res.status(e.code || 500).json({ error: e.message }); }
});
app.get('/api/stock-movements', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    if (!['admin', 'mechanic'].includes(me.role)) return res.status(403).json({ error: 'Sin acceso' });
    const partId = req.query.partId ? Number(req.query.partId) : undefined;
    const movements = partId ? await db.select().from(stockMovements).where(eq(stockMovements.partId, partId)).orderBy(desc(stockMovements.createdAt)) : await db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt));
    const allParts = await db.select().from(parts);
    const pMap = new Map(allParts.map((p) => [p.id, p]));
    return res.json(movements.map((m) => { const p = pMap.get(m.partId); return { ...m, partName: p?.name || 'Repuesto', partCode: p?.code || 'N/A' }; }));
  } catch (e: any) { return res.status(500).json({ error: 'Error al consultar movimientos' }); }
});

// ---------- Part requests ----------
app.get('/api/part-requests', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    let requests = await db.select().from(partRequests).orderBy(desc(partRequests.id));
    if (me.role === 'client') requests = requests.filter((r) => r.clientId === me.id);
    const allParts = await db.select().from(parts); const pMap = new Map(allParts.map((p) => [p.id, p]));
    return res.json(requests.map((r) => { const p = pMap.get(r.partId); return { ...r, partName: p?.name || 'Repuesto', partCode: p?.code || 'N/A' }; }));
  } catch (e: any) { return res.status(500).json({ error: 'Error al consultar pedidos' }); }
});
app.post('/api/part-requests', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user; const b = req.body || {};
    if (!b.partId || !b.clientId) return res.status(400).json({ error: 'Repuesto y cliente requeridos' });
    const client = (await db.select().from(users).where(eq(users.id, toInt(b.clientId))).limit(1))[0];
    if (!client || client.role !== 'client') return res.status(400).json({ error: 'Cliente no existe' });
    if (me.role === 'client' && Number(b.clientId) !== me.id) return res.status(403).json({ error: 'Solo puedes solicitar para ti' });
    const part = (await db.select().from(parts).where(eq(parts.id, toInt(b.partId))).limit(1))[0];
    if (!part || part.visible === false) return res.status(404).json({ error: 'Repuesto no encontrado' });
    const qty = toInt(b.quantity);
    if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Cantidad entera > 0' });
    const inserted = await db.insert(partRequests).values({ partId: part.id, clientId: client.id, clientName: client.name, workOrderId: b.workOrderId ? toInt(b.workOrderId) : null, quantity: qty, unitPrice: part.salePrice, status: 'en camino', notes: b.notes?.toString().trim() || null }).returning();
    return res.status(201).json(inserted[0]);
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});
const PR_TRANSITIONS: Record<string, string[]> = {
  'en camino': ['en espera por stock', 'listo para entrega', 'entregado'],
  'en espera por stock': ['listo para entrega', 'en camino'],
  'listo para entrega': ['entregado'],
  'entregado': [],
};
app.patch('/api/part-requests/:id/status', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user; const requestId = Number(req.params.id);
    const { status } = req.body || {};
    if (!['admin', 'mechanic'].includes(me.role)) return res.status(403).json({ error: 'Permiso denegado' });
    if (!status) return res.status(400).json({ error: 'Estado obligatorio' });
    if (status === 'entregado' && me.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede entregar' });
    const cur = (await db.select().from(partRequests).where(eq(partRequests.id, requestId)).limit(1))[0];
    if (!cur) return res.status(404).json({ error: 'Pedido no encontrado' });
    const allowed = PR_TRANSITIONS[cur.status] || [];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Transición no permitida: ${cur.status} -> ${status}` });
    const updated = await db.update(partRequests).set({ status, updatedAt: new Date() }).where(eq(partRequests.id, requestId)).returning();
    if (status === 'listo para entrega') {
      const client = (await db.select().from(users).where(eq(users.id, cur.clientId)).limit(1))[0];
      const part = (await db.select().from(parts).where(eq(parts.id, cur.partId)).limit(1))[0];
      if (client && part) await sendAutomatedEmail({ toEmail: client.email, toName: client.name, subject: `[Motilón Motors] ¡Tu repuesto "${part.name}" está listo para entrega!`, triggerEvent: 'listo para entrega', bodyHtml: `<p>Hola <strong>${client.name}</strong>, tu repuesto <strong>${part.name}</strong> está listo.</p>`, relatedType: 'part_request', relatedId: requestId });
    }
    return res.json(updated[0]);
  } catch (e: any) { return res.status(e.code || 500).json({ error: e.message }); }
});

// ---------- Emails ----------
async function visibleEmailIds(user: any): Promise<number[] | null> {
  if (user.role === 'admin') return null; // all
  if (user.role === 'client') {
    const rows = await db.select({ id: emailLogs.id }).from(emailLogs).where(eq(emailLogs.toEmail, user.email));
    return rows.map((r) => r.id);
  }
  // mechanic: only work_order related where order.mechanicId = user.id
  const orders = await db.select().from(workOrders).where(eq(workOrders.mechanicId, user.id));
  const orderIds = orders.map((o) => o.id);
  if (!orderIds.length) return [];
  const rows = await db.select({ id: emailLogs.id }).from(emailLogs).where(and(eq(emailLogs.relatedType, 'work_order'), inArray(emailLogs.relatedId, orderIds)));
  return rows.map((r) => r.id);
}
async function enrichWithRead(logs: any[], userId: number) {
  const reads = await db.select().from(emailReads).where(eq(emailReads.userId, userId));
  const set = new Set(reads.map((r) => r.emailId));
  return logs.map((l) => ({ ...l, isRead: set.has(l.id) }));
}
app.get('/api/emails', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    let logs = await db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(100);
    if (me.role === 'client') logs = logs.filter((l) => l.toEmail === me.email);
    if (me.role === 'mechanic') {
      const ids = await visibleEmailIds(me); const set = new Set(ids || []);
      logs = logs.filter((l) => set.has(l.id));
    }
    return res.json(await enrichWithRead(logs, me.id));
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});
app.get('/api/emails/unread-count', requireAuth, async (req, res) => {
  const me = (req as any).user;
  let logs = await db.select({ id: emailLogs.id }).from(emailLogs);
  if (me.role === 'client') {
    const all = await db.select().from(emailLogs).where(eq(emailLogs.toEmail, me.email));
    logs = all.map((l) => ({ id: l.id }));
  } else if (me.role === 'mechanic') {
    const ids = await visibleEmailIds(me); const set = new Set(ids || []);
    logs = logs.filter((l) => set.has(l.id));
  }
  const reads = await db.select().from(emailReads).where(eq(emailReads.userId, me.id));
  const set = new Set(reads.map((r) => r.emailId));
  return res.json({ unread: logs.filter((l) => !set.has(l.id)).length });
});
app.patch('/api/emails/:id/read', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user; const id = Number(req.params.id);
    const ids = await visibleEmailIds(me);
    if (ids !== null && !ids.includes(id)) {
      // double-check client path (visibleEmailIds for client uses toEmail, admin bypass)
      const log = (await db.select().from(emailLogs).where(eq(emailLogs.id, id)).limit(1))[0];
      if (!log || (me.role === 'client' && log.toEmail !== me.email)) return res.status(404).json({ error: 'Correo no visible' });
      if (me.role === 'mechanic') return res.status(404).json({ error: 'Correo no visible' });
    }
    await db.insert(emailReads).values({ emailId: id, userId: me.id }).onConflictDoNothing({ target: [emailReads.emailId, emailReads.userId] });
    return res.json({ ok: true, isRead: true });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});
app.patch('/api/emails/read-all', requireAuth, async (req, res) => {
  try {
    const me = (req as any).user;
    let logs = await db.select({ id: emailLogs.id }).from(emailLogs);
    if (me.role === 'client') { const all = await db.select().from(emailLogs).where(eq(emailLogs.toEmail, me.email)); logs = all.map((l) => ({ id: l.id })); }
    else if (me.role === 'mechanic') { const ids = await visibleEmailIds(me); const set = new Set(ids || []); logs = logs.filter((l) => set.has(l.id)); }
    for (const l of logs) await db.insert(emailReads).values({ emailId: l.id, userId: me.id }).onConflictDoNothing({ target: [emailReads.emailId, emailReads.userId] });
    return res.json({ ok: true });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// ---------- Vite ----------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => { res.sendFile(path.resolve(__dirname, 'dist', 'index.html')); });
  }
  app.listen(PORT, '0.0.0.0', () => { console.log(`[Motilón Motors Server] Ready and running on http://0.0.0.0:${PORT}`); });
}
startServer().catch((err) => { console.error('Failed to start Motilón Motors server:', err); process.exit(1); });
