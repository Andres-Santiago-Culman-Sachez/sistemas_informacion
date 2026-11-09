import { db } from '../src/db/index.ts';
import { 
  users, 
  suppliers, 
  parts, 
  stockMovements, 
  motorcycles, 
  workOrders, 
  postponementLogs, 
  partRequests, 
  emailLogs 
} from '../src/db/schema.ts';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('--- SEEDING NEON POSTGRES DATABASE ---');

  // 1. Users
  await db.execute(sql`
    INSERT INTO users (uid, name, email, password, role, phone) VALUES
    ('usr_admin_1', 'Carlos Motilón (Administrador)', 'admin@motilonmotors.com', 'admin123', 'admin', '+57 300 123 4567'),
    ('usr_mech_1', 'Javier Méndez (Mecánico Senior)', 'mecanico@motilonmotors.com', 'mecanico123', 'mechanic', '+57 311 234 5678'),
    ('usr_mech_2', 'Mateo Rojas (Técnico Especialista)', 'mecanico2@motilonmotors.com', 'mecanico123', 'mechanic', '+57 315 345 6789'),
    ('usr_cli_1', 'Andrés Santiago Culman', 'cliente@motilonmotors.com', 'cliente123', 'client', '+57 310 456 7890'),
    ('usr_cli_2', 'Valentina Gómez', 'cliente2@motilonmotors.com', 'cliente123', 'client', '+57 312 987 6543')
    ON CONFLICT (email) DO NOTHING;
  `);
  console.log('Users seeded.');

  // 2. Suppliers
  await db.execute(sql`
    INSERT INTO suppliers (name, contact_name, phone, email, address, notes) VALUES
    ('Distribuidora Motos del Norte', 'Roberto Cárdenas', '+57 300 888 1122', 'ventas@motosdelnorte.com', 'Calle 10 # 15-40, Cúcuta', 'Proveedor oficial repuestos Yamaha y Suzuki'),
    ('Repuestos y Cadenas Santandereanas', 'Marcela Díaz', '+57 314 555 3344', 'contacto@cadenasantander.co', 'Av. 5ta # 20-18, Bucaramanga', 'Especialista en kits de arrastre, frenos y suspensiones'),
    ('Lubricantes & Filtros Colombia', 'Felipe Santos', '+57 320 777 9900', 'pedidos@lubrifiltros.com', 'Zona Industrial El Salado', 'Distribuidor Motul, Castrol y filtros de alto flujo')
    ON CONFLICT (name) DO NOTHING;
  `);
  console.log('Suppliers seeded.');

  // 3. Parts
  await db.execute(sql`
    INSERT INTO parts (code, name, description, category, stock, cost_price, sale_price, min_stock, supplier_id) VALUES
    ('REP-FRE-01', 'Pastillas de Freno Delanteras Brembo Carbon', 'Juego de pastillas de compuesto cerámico para alto frenado', 'Frenos', 12, 65000, 110000, 4, 1),
    ('REP-LUB-02', 'Aceite Sintético Motul 7100 10W40 (1L)', 'Lubricante 100% sintético éster para motores 4T', 'Lubricantes', 24, 48000, 78000, 8, 3),
    ('REP-KIT-03', 'Kit de Arrastre DID O-Ring 520 (Cadena + Piñón)', 'Kit reforzado con sellos para motos de 250cc a 400cc', 'Transmisión', 6, 210000, 320000, 3, 2),
    ('REP-FIL-04', 'Filtro de Aire Alto Flujo K&N', 'Elemento filtrante lavable de alto rendimiento', 'Admisión', 5, 110000, 175000, 2, 3),
    ('REP-BUJ-05', 'Bujía de Iridio NGK CR9EIX', 'Bujía láser de iridio para encendido eficiente', 'Motor', 18, 32000, 55000, 5, 1),
    ('REP-BOM-06', 'Bomba de Combustible Sumergible 3.5 Bar', 'Repuesto original para inyección electrónica', 'Combustible', 2, 185000, 290000, 2, 1)
    ON CONFLICT (code) DO NOTHING;
  `);
  console.log('Parts seeded.');

  // 4. Stock Movements
  await db.execute(sql`
    INSERT INTO stock_movements (part_id, type, quantity, previous_stock, new_stock, reason, user_name) VALUES
    (1, 'entrada', 12, 0, 12, 'Ingreso inicial por compra a proveedor #1', 'Carlos Motilón (Administrador)'),
    (2, 'entrada', 24, 0, 24, 'Inventario inicial de lote 2026', 'Carlos Motilón (Administrador)'),
    (3, 'entrada', 6, 0, 6, 'Adquisición lote DID', 'Carlos Motilón (Administrador)');
  `);
  console.log('Stock movements seeded.');

  // 5. Motorcycles & Orders
  await db.execute(sql`
    DO $$
    DECLARE
      v_cli1 INT;
      v_cli2 INT;
      v_mech1 INT;
      v_mech2 INT;
      v_moto1 INT;
      v_moto2 INT;
      v_moto3 INT;
      v_order1 INT;
      v_order2 INT;
    BEGIN
      SELECT id INTO v_cli1 FROM users WHERE email = 'cliente@motilonmotors.com';
      SELECT id INTO v_cli2 FROM users WHERE email = 'cliente2@motilonmotors.com';
      SELECT id INTO v_mech1 FROM users WHERE email = 'mecanico@motilonmotors.com';
      SELECT id INTO v_mech2 FROM users WHERE email = 'mecanico2@motilonmotors.com';

      INSERT INTO motorcycles (plate, brand, model, year, color, mileage, client_id, client_name) VALUES
      ('XYZ-89F', 'Yamaha', 'MT-09 SP', 2024, 'Icon Performance Azul/Negro', 14200, v_cli1, 'Andrés Santiago Culman')
      ON CONFLICT (plate) DO UPDATE SET mileage = 14200 RETURNING id INTO v_moto1;

      INSERT INTO motorcycles (plate, brand, model, year, color, mileage, client_id, client_name) VALUES
      ('KTM-43D', 'KTM', 'Duke 390', 2023, 'Naranja Racing', 18500, v_cli1, 'Andrés Santiago Culman')
      ON CONFLICT (plate) DO UPDATE SET mileage = 18500 RETURNING id INTO v_moto2;

      INSERT INTO motorcycles (plate, brand, model, year, color, mileage, client_id, client_name) VALUES
      ('SUZ-12A', 'Suzuki', 'V-Strom 650 XT', 2022, 'Amarillo Champion', 32000, v_cli2, 'Valentina Gómez')
      ON CONFLICT (plate) DO UPDATE SET mileage = 32000 RETURNING id INTO v_moto3;

      -- Order 1: esperando por autorización del cliente
      INSERT INTO work_orders (motorcycle_id, mechanic_id, mechanic_name, status, entry_date, estimated_delivery, initial_diagnosis, suggested_repairs, labor_cost, parts_cost, total_estimate)
      VALUES (
        v_moto1,
        v_mech1,
        'Javier Méndez (Mecánico Senior)',
        'esperando por autorización del cliente',
        '2026-11-04',
        '2026-11-10',
        'Revisión general de 15,000 km y ruido metálico en zona de transmisión secundaria.',
        'Se detectó desgaste severo en corona y piñón de ataque con riesgo de salto de cadena. Se recomienda reemplazo urgente del kit de arrastre DID 520 y cambio de pastillas traseras.',
        120000,
        320000,
        440000
      ) RETURNING id INTO v_order1;

      -- Postponement log for Order 1
      INSERT INTO postponement_logs (work_order_id, mechanic_id, mechanic_name, previous_date, new_date, reason, created_at)
      VALUES (
        v_order1,
        v_mech1,
        'Javier Méndez (Mecánico Senior)',
        '2026-11-08',
        '2026-11-10',
        'Se requiere calibración milimétrica con torquímetro digital y se detectó juego axial en bujes de tijera durante el desmonte.',
        NOW() - INTERVAL '1 day'
      );

      -- Order 2: en curso
      INSERT INTO work_orders (motorcycle_id, mechanic_id, mechanic_name, status, entry_date, estimated_delivery, initial_diagnosis, suggested_repairs, labor_cost, parts_cost, total_estimate)
      VALUES (
        v_moto2,
        v_mech1,
        'Javier Méndez (Mecánico Senior)',
        'en curso',
        '2026-11-06',
        '2026-11-09',
        'Mantenimiento preventivo de frenos y cambio de aceite de motor y filtro.',
        'Alineación y purga con líquido DOT 5.1.',
        60000,
        188000,
        248000
      ) RETURNING id INTO v_order2;

      -- Order 3: finalizado
      INSERT INTO work_orders (motorcycle_id, mechanic_id, mechanic_name, status, entry_date, estimated_delivery, initial_diagnosis, suggested_repairs, labor_cost, parts_cost, total_estimate)
      VALUES (
        v_moto3,
        v_mech2,
        'Mateo Rojas (Técnico Especialista)',
        'finalizado',
        '2026-11-02',
        '2026-11-07',
        'Sincronización de cuerpos de aceleración y cambio de bujías de iridio.',
        'Trabajo concluido satisfactoriamente, pruebas de ruta aprobadas con 0 fallas.',
        140000,
        110000,
        250000
      );

      -- Part requests
      INSERT INTO part_requests (part_id, client_id, client_name, work_order_id, quantity, unit_price, status, notes)
      VALUES
      (3, v_cli1, 'Andrés Santiago Culman', v_order1, 1, 320000, 'en espera por stock', 'Kit de arrastre solicitado para orden de MT-09 SP'),
      (1, v_cli1, 'Andrés Santiago Culman', NULL, 1, 110000, 'listo para entrega', 'Pastillas Brembo pedidas en mostrador por cliente'),
      (2, v_cli2, 'Valentina Gómez', NULL, 2, 78000, 'en camino', '2 envases de Motul 7100 en tránsito desde bodega');

      -- Repair suggestion example for Order 1 (linked parts with stock > 0)
      INSERT INTO repair_suggestions (work_order_id, mechanic_id, mechanic_name, description,
        previous_labor_cost, previous_parts_cost, previous_total_estimate,
        additional_labor_cost, additional_parts_cost,
        new_labor_cost, new_parts_cost, new_total_estimate,
        previous_estimated_delivery, new_estimated_delivery, status)
      VALUES (
        v_order1, v_mech1, 'Javier Méndez (Mecánico Senior)',
        'Registro histórico migrado: reemplazo urgente kit de arrastre DID 520 y pastillas traseras.',
        120000, 320000, 440000,
        40000, 320000,
        160000, 640000, 800000,
        '2026-11-10', '2026-11-14', 'pendiente'
      );

      -- Email logs
      INSERT INTO email_logs (to_email, to_name, subject, trigger_event, body_html, status, related_type, related_id)
      VALUES
      ('cliente@motilonmotors.com', 'Andrés Santiago Culman', '[Motilón Motors] Reparación sugerida en espera de tu autorización - MT-09 SP (XYZ-89F)', 'esperando por autorización del cliente', '<p>Estimado Andrés, el mecánico Javier Méndez ha emitido un diagnóstico con reparaciones sugeridas para tu moto <strong>Yamaha MT-09 SP</strong>. Por favor ingresa a tu portal para revisar la cotización y autorizar los trabajos.</p>', 'sent', 'work_order', v_order1),
      ('cliente@motilonmotors.com', 'Andrés Santiago Culman', '[Motilón Motors] Tu repuesto está listo para entrega en taller', 'listo para entrega', '<p>Estimado Andrés, tu repuesto <strong>Pastillas de Freno Delanteras Brembo Carbon</strong> se encuentra listo para entrega en nuestras instalaciones.</p>', 'sent', 'part_request', 2);

    END $$;
  `);

  console.log('✅ NEON DATABASE SEEDING COMPLETED SUCCESSFULLY');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
