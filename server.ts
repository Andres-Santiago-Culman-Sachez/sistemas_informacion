import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
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
  emailLogs 
} from './src/db/schema.ts';
import { eq, desc, sql, ilike, or } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Neon Services Health & Diagnostic Endpoint
app.get('/api/neon/status', async (_req: Request, res: Response) => {
  try {
    const dbTest = await db.execute(sql`SELECT current_database(), version(), count(*)::int as users_count FROM users;`);
    const functionUrl = `https://${process.env.NEON_BRANCH_ID || 'br-tiny-snow-bdlod3pk'}-hello${process.env.NEON_FUNCTION_HOST_SUFFIX || '.compute.c-8.us-east-2.aws.neon.tech'}/`;
    
    let functionStatus = 'unknown';
    try {
      const fnRes = await fetch(functionUrl, { signal: AbortSignal.timeout(4000) });
      const fnText = await fnRes.text();
      functionStatus = fnRes.ok ? `active: "${fnText.trim()}"` : `error: ${fnRes.status}`;
    } catch (e: any) {
      functionStatus = `unavailable: ${e.message}`;
    }

    return res.json({
      status: 'healthy',
      postgres: {
        connected: true,
        database: (dbTest as any)[0]?.current_database || 'neondb',
        branch: process.env.NEON_BRANCH || 'production',
        branchId: process.env.NEON_BRANCH_ID || 'br-tiny-snow-bdlod3pk',
        usersCount: (dbTest as any)[0]?.users_count || 0,
      },
      functions: {
        helloFunctionUrl: functionUrl,
        functionStatus,
      },
      aiGateway: {
        configured: Boolean(process.env.NEON_AI_GATEWAY_TOKEN),
        baseUrl: process.env.NEON_AI_GATEWAY_BASE_URL || 'https://br-tiny-snow-bdlod3pk-api.ai.c-8.us-east-2.aws.neon.tech',
      },
    });
  } catch (error: any) {
    console.error('Neon status error:', error);
    return res.status(500).json({ status: 'error', error: error.message });
  }
});

// Helper for sending automated emails
async function sendAutomatedEmail(params: {
  toEmail: string;
  toName: string;
  subject: string;
  triggerEvent: string;
  bodyHtml: string;
  relatedType?: 'work_order' | 'part_request';
  relatedId?: number;
}) {
  try {
    const inserted = await db.insert(emailLogs).values({
      toEmail: params.toEmail,
      toName: params.toName,
      subject: params.subject,
      triggerEvent: params.triggerEvent,
      bodyHtml: params.bodyHtml,
      status: 'sent',
      relatedType: params.relatedType,
      relatedId: params.relatedId,
    }).returning();
    console.log(`[EMAIL DISPATCHED] To: ${params.toEmail} | Subject: ${params.subject} | Trigger: ${params.triggerEvent}`);
    return inserted[0];
  } catch (err) {
    console.error('Error inserting automated email log:', err);
    return null;
  }
}

// ==========================================
// 1. AUTH & USERS
// ==========================================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const foundUsers = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
    if (!foundUsers.length) {
      return res.status(401).json({ error: 'Credenciales inválidas. Usuario no encontrado.' });
    }

    const user = foundUsers[0];
    if (user.password !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Do not return password in response
    const { password: _, ...userSafe } = user;
    return res.json({ user: userSafe });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Error durante la autenticación' });
  }
});

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    let query = db.select({
      id: users.id,
      uid: users.uid,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
    }).from(users);

    const allUsers = role 
      ? await query.where(eq(users.role, role))
      : await query;

    return res.json(allUsers);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

// ==========================================
// 2. MOTORCYCLES
// ==========================================

app.get('/api/motorcycles', async (_req: Request, res: Response) => {
  try {
    const motos = await db.select().from(motorcycles).orderBy(desc(motorcycles.id));
    return res.json(motos);
  } catch (error: any) {
    console.error('Error fetching motorcycles:', error);
    return res.status(500).json({ error: 'Error al consultar motocicletas' });
  }
});

app.post('/api/motorcycles', async (req: Request, res: Response) => {
  try {
    const { plate, brand, model, year, color, mileage, clientId } = req.body;
    if (!plate || !brand || !model || !clientId) {
      return res.status(400).json({ error: 'Placa, marca, modelo y cliente son obligatorios' });
    }

    // Get client name
    const clientUser = await db.select().from(users).where(eq(users.id, Number(clientId))).limit(1);
    const clientName = clientUser.length ? clientUser[0].name : 'Cliente Registrado';

    const inserted = await db.insert(motorcycles).values({
      plate: plate.toUpperCase().trim(),
      brand: brand.trim(),
      model: model.trim(),
      year: year ? Number(year) : undefined,
      color: color?.trim(),
      mileage: mileage ? Number(mileage) : 0,
      clientId: Number(clientId),
      clientName,
    }).returning();

    return res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error('Error creating motorcycle:', error);
    return res.status(500).json({ error: error.message || 'Error al registrar motocicleta' });
  }
});

// ==========================================
// 3. WORK ORDERS (MANTENIMIENTO)
// ==========================================

app.get('/api/work-orders', async (req: Request, res: Response) => {
  try {
    const orders = await db.select().from(workOrders).orderBy(desc(workOrders.id));
    const allMotos = await db.select().from(motorcycles);
    const allLogs = await db.select().from(postponementLogs).orderBy(desc(postponementLogs.createdAt));

    // Combine
    const motoMap = new Map(allMotos.map(m => [m.id, m]));
    const logsMap = new Map<number, typeof allLogs>();
    for (const log of allLogs) {
      const existing = logsMap.get(log.workOrderId) || [];
      existing.push(log);
      logsMap.set(log.workOrderId, existing);
    }

    const populated = orders.map(ord => ({
      ...ord,
      motorcycle: motoMap.get(ord.motorcycleId),
      postponements: logsMap.get(ord.id) || [],
    }));

    return res.json(populated);
  } catch (error: any) {
    console.error('Error fetching work orders:', error);
    return res.status(500).json({ error: 'Error al consultar órdenes de trabajo' });
  }
});

app.post('/api/work-orders', async (req: Request, res: Response) => {
  try {
    const { 
      motorcycleId, 
      mechanicId, 
      initialDiagnosis, 
      estimatedDelivery, 
      laborCost, 
      partsCost, 
      suggestedRepairs 
    } = req.body;

    if (!motorcycleId || !initialDiagnosis || !estimatedDelivery) {
      return res.status(400).json({ error: 'Motocicleta, diagnóstico inicial y fecha estimada son obligatorios' });
    }

    let mechanicName = 'Por asignar';
    if (mechanicId) {
      const mech = await db.select().from(users).where(eq(users.id, Number(mechanicId))).limit(1);
      if (mech.length) mechanicName = mech[0].name;
    }

    const lCost = Number(laborCost) || 0;
    const pCost = Number(partsCost) || 0;
    const total = lCost + pCost;

    const today = new Date().toISOString().split('T')[0];

    const inserted = await db.insert(workOrders).values({
      motorcycleId: Number(motorcycleId),
      mechanicId: mechanicId ? Number(mechanicId) : undefined,
      mechanicName,
      status: 'en curso',
      entryDate: today,
      estimatedDelivery,
      initialDiagnosis,
      suggestedRepairs,
      laborCost: lCost,
      partsCost: pCost,
      totalEstimate: total,
    }).returning();

    return res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error('Error creating work order:', error);
    return res.status(500).json({ error: 'Error al crear la orden de trabajo' });
  }
});

// Update order status with permissions and automated email triggers
app.patch('/api/work-orders/:id/status', async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { status, userRole, userName } = req.body;

    // VALIDATION: Only Administrator can set status to 'entregada'
    if (status === 'entregada' && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Permiso denegado: Solo el Administrador tiene autorización para cambiar el estado a "entregada" al momento de la entrega al cliente.' 
      });
    }

    const currentOrder = await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1);
    if (!currentOrder.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const updated = await db.update(workOrders)
      .set({ 
        status, 
        updatedAt: new Date() 
      })
      .where(eq(workOrders.id, orderId))
      .returning();

    // Fetch moto & client for email notification
    const moto = await db.select().from(motorcycles).where(eq(motorcycles.id, currentOrder[0].motorcycleId)).limit(1);
    if (moto.length) {
      const client = await db.select().from(users).where(eq(users.id, moto[0].clientId)).limit(1);
      if (client.length) {
        const cUser = client[0];
        const motoDesc = `${moto[0].brand} ${moto[0].model} (${moto[0].plate})`;

        if (status === 'esperando por autorización del cliente') {
          await sendAutomatedEmail({
            toEmail: cUser.email,
            toName: cUser.name,
            subject: `[Motilón Motors] Diagnóstico y Reparaciones Sugeridas para tu ${motoDesc}`,
            triggerEvent: 'esperando por autorización del cliente',
            bodyHtml: `
              <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #d97706;">Motilón Motors - Acción Requerida</h2>
                <p>Hola <strong>${cUser.name}</strong>,</p>
                <p>Tu motocicleta <strong>${motoDesc}</strong> ha sido evaluada por nuestro equipo técnico y se han detectado reparaciones sugeridas que requieren tu autorización para proceder:</p>
                <div style="background: #f8fafc; border-left: 4px solid #d97706; padding: 12px; margin: 16px 0;">
                  <p><strong>Detalle:</strong> ${updated[0].suggestedRepairs || 'Revisión y reemplazo preventivo'}</p>
                  <p><strong>Presupuesto Estimado:</strong> $${(updated[0].totalEstimate || 0).toLocaleString('es-CO')} COP</p>
                </div>
                <p>Por favor ingresa a tu portal de cliente para autorizar o rechazar este trabajo con un solo clic.</p>
                <p style="font-size: 12px; color: #64748b;">Motilón Motors · Taller de Mantenimiento Especializado</p>
              </div>
            `,
            relatedType: 'work_order',
            relatedId: orderId,
          });
        } else if (status === 'autorizado por el cliente') {
          await sendAutomatedEmail({
            toEmail: cUser.email,
            toName: cUser.name,
            subject: `[Motilón Motors] Confirmación: Reparación autorizada para ${motoDesc}`,
            triggerEvent: 'autorizado por el cliente',
            bodyHtml: `
              <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #059669;">Motilón Motors - Reparación Autorizada</h2>
                <p>Hola <strong>${cUser.name}</strong>,</p>
                <p>Hemos registrado tu autorización exitosa para la reparación de tu moto <strong>${motoDesc}</strong>.</p>
                <p>Nuestros mecánicos ya se encuentran ejecutando los trabajos con los mejores estándares.</p>
                <p><strong>Fecha estimada de entrega:</strong> ${updated[0].estimatedDelivery}</p>
              </div>
            `,
            relatedType: 'work_order',
            relatedId: orderId,
          });
        } else if (status === 'finalizado') {
          await sendAutomatedEmail({
            toEmail: cUser.email,
            toName: cUser.name,
            subject: `[Motilón Motors] ¡Tu moto ${motoDesc} está lista para recoger!`,
            triggerEvent: 'finalizado',
            bodyHtml: `
              <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #2563eb;">Motilón Motors - Mantenimiento Finalizado</h2>
                <p>Hola <strong>${cUser.name}</strong>,</p>
                <p>Nos complace informarte que los trabajos en tu motocicleta <strong>${motoDesc}</strong> han finalizado y las pruebas de calidad fueron satisfactorias.</p>
                <p>Puedes acercarte a nuestras instalaciones para realizar la entrega formal y retirar tu vehículo.</p>
                <p style="font-size: 12px; color: #64748b;">Horario de atención: Lunes a Sábado de 8:00 AM a 6:00 PM</p>
              </div>
            `,
            relatedType: 'work_order',
            relatedId: orderId,
          });
        }
      }
    }

    return res.json(updated[0]);
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: error.message || 'Error al actualizar estado' });
  }
});

// Mecánico aplazar entrega con justificación obligatoria (registra en bitácora)
app.post('/api/work-orders/:id/postpone', async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { newDate, reason, mechanicId, mechanicName } = req.body;

    if (!newDate || !reason || !reason.trim()) {
      return res.status(400).json({ error: 'La nueva fecha y la justificación obligatoria son requeridas' });
    }

    const currentOrder = await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1);
    if (!currentOrder.length) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    const previousDate = currentOrder[0].estimatedDelivery;

    // 1. Insert into postponementLogs (Bitácora de novedades con fecha y hora inmutable)
    const logEntry = await db.insert(postponementLogs).values({
      workOrderId: orderId,
      mechanicId: mechanicId ? Number(mechanicId) : currentOrder[0].mechanicId,
      mechanicName: mechanicName || currentOrder[0].mechanicName || 'Mecánico de turno',
      previousDate,
      newDate,
      reason: reason.trim(),
      createdAt: new Date(), // Fecha y hora de la novedad visible para admin y cliente
    }).returning();

    // 2. Update order's estimated delivery
    const updatedOrder = await db.update(workOrders)
      .set({
        estimatedDelivery: newDate,
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, orderId))
      .returning();

    return res.json({
      order: updatedOrder[0],
      log: logEntry[0],
      message: 'Prórroga de tiempo registrada exitosamente en la bitácora',
    });
  } catch (error: any) {
    console.error('Error postponing work order:', error);
    return res.status(500).json({ error: 'Error al registrar aplazamiento de entrega' });
  }
});

// Sugerir reparaciones adicionales por el mecánico (cambia a esperando autorización)
app.post('/api/work-orders/:id/suggest-repairs', async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { suggestedRepairs, additionalLabor, additionalParts } = req.body;

    const current = await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1);
    if (!current.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const newLabor = (current[0].laborCost || 0) + (Number(additionalLabor) || 0);
    const newParts = (current[0].partsCost || 0) + (Number(additionalParts) || 0);
    const newTotal = newLabor + newParts;

    const updated = await db.update(workOrders)
      .set({
        suggestedRepairs,
        laborCost: newLabor,
        partsCost: newParts,
        totalEstimate: newTotal,
        status: 'esperando por autorización del cliente',
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, orderId))
      .returning();

    // Trigger automated email
    const moto = await db.select().from(motorcycles).where(eq(motorcycles.id, current[0].motorcycleId)).limit(1);
    if (moto.length) {
      const client = await db.select().from(users).where(eq(users.id, moto[0].clientId)).limit(1);
      if (client.length) {
        await sendAutomatedEmail({
          toEmail: client[0].email,
          toName: client[0].name,
          subject: `[Motilón Motors] Nueva reparación sugerida para tu ${moto[0].brand} ${moto[0].model}`,
          triggerEvent: 'esperando por autorización del cliente',
          bodyHtml: `
            <p>Hola <strong>${client[0].name}</strong>,</p>
            <p>El mecánico asignado a tu motocicleta ${moto[0].plate} ha sugerido reparaciones adicionales:</p>
            <p><em>${suggestedRepairs}</em></p>
            <p><strong>Total presupuestado:</strong> $${newTotal.toLocaleString('es-CO')} COP</p>
            <p>Ingresa a la aplicación para autorizar o rechazar esta solicitud.</p>
          `,
          relatedType: 'work_order',
          relatedId: orderId,
        });
      }
    }

    return res.json(updated[0]);
  } catch (error: any) {
    console.error('Error suggesting repairs:', error);
    return res.status(500).json({ error: 'Error al solicitar autorización de reparaciones' });
  }
});

// Cliente autoriza reparaciones sugeridas
app.post('/api/work-orders/:id/authorize', async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const current = await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1);
    if (!current.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const updated = await db.update(workOrders)
      .set({
        status: 'autorizado por el cliente',
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, orderId))
      .returning();

    // Automated confirmation email
    const moto = await db.select().from(motorcycles).where(eq(motorcycles.id, current[0].motorcycleId)).limit(1);
    if (moto.length) {
      const client = await db.select().from(users).where(eq(users.id, moto[0].clientId)).limit(1);
      if (client.length) {
        await sendAutomatedEmail({
          toEmail: client[0].email,
          toName: client[0].name,
          subject: `[Motilón Motors] Reparación Autorizada - ${moto[0].plate}`,
          triggerEvent: 'autorizado por el cliente',
          bodyHtml: `<p>Hola ${client[0].name}, has autorizado las reparaciones de tu moto con éxito. El equipo técnico continuará con el mantenimiento.</p>`,
          relatedType: 'work_order',
          relatedId: orderId,
        });
      }
    }

    return res.json(updated[0]);
  } catch (error: any) {
    console.error('Error authorizing repairs:', error);
    return res.status(500).json({ error: 'Error al autorizar reparación' });
  }
});

// Cliente rechaza reparaciones sugeridas
app.post('/api/work-orders/:id/reject', async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const current = await db.select().from(workOrders).where(eq(workOrders.id, orderId)).limit(1);
    if (!current.length) return res.status(404).json({ error: 'Orden no encontrada' });

    const updated = await db.update(workOrders)
      .set({
        status: 'en curso', // Regresa a en curso sin los adicionales
        suggestedRepairs: `[RECHAZADO POR EL CLIENTE] ${current[0].suggestedRepairs || ''}`,
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, orderId))
      .returning();

    return res.json(updated[0]);
  } catch (error: any) {
    console.error('Error rejecting repairs:', error);
    return res.status(500).json({ error: 'Error al rechazar reparación' });
  }
});

// Administrador entrega la motocicleta físicamente
app.post('/api/work-orders/:id/deliver', async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const { userRole } = req.body;

    if (userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Permiso denegado: Solo el Administrador puede marcar una moto como entregada.' 
      });
    }

    const updated = await db.update(workOrders)
      .set({
        status: 'entregada',
        updatedAt: new Date(),
      })
      .where(eq(workOrders.id, orderId))
      .returning();

    return res.json(updated[0]);
  } catch (error: any) {
    console.error('Error delivering motorcycle:', error);
    return res.status(500).json({ error: 'Error al marcar como entregada' });
  }
});

// ==========================================
// 4. REPUESTOS (PARTS), PROVEEDORES & KARDEX
// ==========================================

app.get('/api/parts', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;

    let query = db.select({
      id: parts.id,
      code: parts.code,
      name: parts.name,
      description: parts.description,
      category: parts.category,
      stock: parts.stock,
      costPrice: parts.costPrice,
      salePrice: parts.salePrice,
      minStock: parts.minStock,
      supplierId: parts.supplierId,
      createdAt: parts.createdAt,
    }).from(parts);

    const allParts = await query.orderBy(desc(parts.id));
    const allSuppliers = await db.select().from(suppliers);
    const supMap = new Map(allSuppliers.map(s => [s.id, s.name]));

    let filtered = allParts.map(p => ({
      ...p,
      supplierName: p.supplierId ? supMap.get(p.supplierId) : 'Sin proveedor',
    }));

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (category && category !== 'Todos') {
      filtered = filtered.filter(p => p.category === category);
    }

    return res.json(filtered);
  } catch (error: any) {
    console.error('Error fetching parts:', error);
    return res.status(500).json({ error: 'Error al consultar repuestos' });
  }
});

app.post('/api/parts', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      code, 
      description, 
      category, 
      stock, 
      costPrice, 
      salePrice, 
      minStock, 
      supplierId,
      userName 
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Nombre y código de repuesto son obligatorios' });
    }

    const initStock = Number(stock) || 0;
    const cPrice = Number(costPrice) || 0;
    const sPrice = Number(salePrice) || 0;

    const inserted = await db.insert(parts).values({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim(),
      category: category?.trim() || 'General',
      stock: initStock,
      costPrice: cPrice,
      salePrice: sPrice,
      minStock: minStock ? Number(minStock) : 3,
      supplierId: supplierId ? Number(supplierId) : undefined,
    }).returning();

    // Register initial stock movement if > 0
    if (initStock > 0) {
      await db.insert(stockMovements).values({
        partId: inserted[0].id,
        type: 'entrada',
        quantity: initStock,
        previousStock: 0,
        newStock: initStock,
        reason: 'Inventario inicial de registro',
        userName: userName || 'Sistema',
      });
    }

    return res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error('Error creating part:', error);
    return res.status(500).json({ error: error.message || 'Error al registrar repuesto' });
  }
});

// Update stock (Entrada o Salida con Kardex)
app.patch('/api/parts/:id/stock', async (req: Request, res: Response) => {
  try {
    const partId = Number(req.params.id);
    const { type, quantity, reason, userId, userName } = req.body;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a cero' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'La justificación del movimiento es obligatoria' });
    }

    const currentPart = await db.select().from(parts).where(eq(parts.id, partId)).limit(1);
    if (!currentPart.length) return res.status(404).json({ error: 'Repuesto no encontrado' });

    const prevStock = currentPart[0].stock;
    let newStock = prevStock;

    if (type === 'entrada') {
      newStock = prevStock + qty;
    } else if (type === 'salida') {
      if (prevStock < qty) {
        return res.status(400).json({ error: `Stock insuficiente. Stock actual: ${prevStock}` });
      }
      newStock = prevStock - qty;
    } else {
      return res.status(400).json({ error: 'Tipo de movimiento inválido (entrada o salida)' });
    }

    // Update part
    const updated = await db.update(parts)
      .set({ stock: newStock })
      .where(eq(parts.id, partId))
      .returning();

    // Insert movement into Kardex
    const movement = await db.insert(stockMovements).values({
      partId,
      type,
      quantity: qty,
      previousStock: prevStock,
      newStock,
      reason: reason.trim(),
      userId: userId ? Number(userId) : undefined,
      userName: userName || 'Usuario del taller',
    }).returning();

    return res.json({
      part: updated[0],
      movement: movement[0],
      message: `Stock actualizado a ${newStock} unidades`,
    });
  } catch (error: any) {
    console.error('Error updating part stock:', error);
    return res.status(500).json({ error: 'Error al actualizar el stock' });
  }
});

// Proveedores
app.get('/api/suppliers', async (_req: Request, res: Response) => {
  try {
    const list = await db.select().from(suppliers).orderBy(desc(suppliers.id));
    return res.json(list);
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({ error: 'Error al consultar proveedores' });
  }
});

app.post('/api/suppliers', async (req: Request, res: Response) => {
  try {
    const { name, contactName, phone, email, address, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
    }

    const inserted = await db.insert(suppliers).values({
      name: name.trim(),
      contactName: contactName?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      notes: notes?.trim(),
    }).returning();

    return res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return res.status(500).json({ error: 'Error al registrar proveedor' });
  }
});

// Movimientos de repuestos (Kardex)
app.get('/api/stock-movements', async (req: Request, res: Response) => {
  try {
    const partId = req.query.partId ? Number(req.query.partId) : undefined;
    let query = db.select().from(stockMovements);
    const movements = partId 
      ? await query.where(eq(stockMovements.partId, partId)).orderBy(desc(stockMovements.createdAt))
      : await query.orderBy(desc(stockMovements.createdAt));

    const allParts = await db.select().from(parts);
    const pMap = new Map(allParts.map(p => [p.id, p]));

    const populated = movements.map(m => {
      const p = pMap.get(m.partId);
      return {
        ...m,
        partName: p?.name || 'Repuesto',
        partCode: p?.code || 'N/A',
      };
    });

    return res.json(populated);
  } catch (error: any) {
    console.error('Error fetching stock movements:', error);
    return res.status(500).json({ error: 'Error al consultar historial de movimientos' });
  }
});

// ==========================================
// 5. PEDIDOS DE REPUESTOS POR CLIENTES
// ==========================================

app.get('/api/part-requests', async (req: Request, res: Response) => {
  try {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    let query = db.select().from(partRequests);
    const requests = clientId 
      ? await query.where(eq(partRequests.clientId, clientId)).orderBy(desc(partRequests.id))
      : await query.orderBy(desc(partRequests.id));

    const allParts = await db.select().from(parts);
    const pMap = new Map(allParts.map(p => [p.id, p]));

    const populated = requests.map(r => {
      const p = pMap.get(r.partId);
      return {
        ...r,
        partName: p?.name || 'Repuesto',
        partCode: p?.code || 'N/A',
      };
    });

    return res.json(populated);
  } catch (error: any) {
    console.error('Error fetching part requests:', error);
    return res.status(500).json({ error: 'Error al consultar pedidos de repuestos' });
  }
});

app.post('/api/part-requests', async (req: Request, res: Response) => {
  try {
    const { partId, clientId, quantity, notes, workOrderId } = req.body;
    if (!partId || !clientId) {
      return res.status(400).json({ error: 'Repuesto y cliente requeridos' });
    }

    const part = await db.select().from(parts).where(eq(parts.id, Number(partId))).limit(1);
    if (!part.length) return res.status(404).json({ error: 'Repuesto no encontrado' });

    const client = await db.select().from(users).where(eq(users.id, Number(clientId))).limit(1);
    const clientName = client.length ? client[0].name : 'Cliente Registrado';

    const qty = Number(quantity) || 1;
    const unitPrice = part[0].salePrice;

    const inserted = await db.insert(partRequests).values({
      partId: Number(partId),
      clientId: Number(clientId),
      clientName,
      workOrderId: workOrderId ? Number(workOrderId) : undefined,
      quantity: qty,
      unitPrice,
      status: 'en camino',
      notes: notes?.trim(),
    }).returning();

    return res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error('Error creating part request:', error);
    return res.status(500).json({ error: 'Error al solicitar repuesto' });
  }
});

// Update part request status with permissions and automated email triggers
app.patch('/api/part-requests/:id/status', async (req: Request, res: Response) => {
  try {
    const requestId = Number(req.params.id);
    const { status, userRole } = req.body;

    // VALIDATION: Only Administrator can set status to 'entregado'
    if (status === 'entregado' && userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Permiso denegado: Solo el Administrador tiene autorización para cambiar el estado a "entregado" al entregar el repuesto al cliente.' 
      });
    }

    const currentReq = await db.select().from(partRequests).where(eq(partRequests.id, requestId)).limit(1);
    if (!currentReq.length) return res.status(404).json({ error: 'Pedido no encontrado' });

    const updated = await db.update(partRequests)
      .set({ 
        status, 
        updatedAt: new Date() 
      })
      .where(eq(partRequests.id, requestId))
      .returning();

    // Check automated email trigger: when status becomes 'listo para entrega'
    if (status === 'listo para entrega') {
      const client = await db.select().from(users).where(eq(users.id, currentReq[0].clientId)).limit(1);
      const part = await db.select().from(parts).where(eq(parts.id, currentReq[0].partId)).limit(1);
      if (client.length && part.length) {
        await sendAutomatedEmail({
          toEmail: client[0].email,
          toName: client[0].name,
          subject: `[Motilón Motors] ¡Tu repuesto "${part[0].name}" está listo para entrega!`,
          triggerEvent: 'listo para entrega',
          bodyHtml: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #059669;">Motilón Motors - Repuesto Listo para Retiro</h2>
              <p>Hola <strong>${client[0].name}</strong>,</p>
              <p>Tu pedido de repuesto ha llegado al taller y se encuentra listo para entrega en nuestras instalaciones:</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 6px 0;"><strong>Repuesto:</strong> ${part[0].name} (${part[0].code})</p>
                <p style="margin: 0 0 6px 0;"><strong>Cantidad:</strong> ${currentReq[0].quantity} unidad(es)</p>
                <p style="margin: 0;"><strong>Total a pagar/liquidar:</strong> $${(currentReq[0].quantity * currentReq[0].unitPrice).toLocaleString('es-CO')} COP</p>
              </div>
              <p>Puedes pasar por el taller en cualquier momento para su entrega formal.</p>
              <p style="font-size: 12px; color: #64748b;">Motilón Motors · Calle 10 # 15-40, Cúcuta</p>
            </div>
          `,
          relatedType: 'part_request',
          relatedId: requestId,
        });
      }
    }

    return res.json(updated[0]);
  } catch (error: any) {
    console.error('Error updating part request status:', error);
    return res.status(500).json({ error: error.message || 'Error al actualizar pedido' });
  }
});

// ==========================================
// 6. EMAIL LOGS (AUTOMATIZACIÓN & BANDEJA)
// ==========================================

app.get('/api/emails', async (_req: Request, res: Response) => {
  try {
    const logs = await db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(50);
    return res.json(logs);
  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    return res.status(500).json({ error: 'Error al consultar registro de correos' });
  }
});

// ==========================================
// VITE DEV SERVER / STATIC ASSETS
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Motilón Motors Server] Ready and running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Motilón Motors server:', err);
  process.exit(1);
});
