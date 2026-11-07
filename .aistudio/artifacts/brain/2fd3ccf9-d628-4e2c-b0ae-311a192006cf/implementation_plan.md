# Motilón Motors - Sistema de Gestión de Mantenimiento, Repuestos y Notificaciones

Sistema web integral, interactivo y responsivo para el taller de motocicletas **Motilón Motors**, diseñado para gestionar en tiempo real las órdenes de trabajo, el catálogo e inventario avanzado de repuestos con proveedores y movimientos, la reprogramación justificada y acumulativa de tiempos de entrega por parte de los mecánicos, la consulta y autorización interactiva por parte de los clientes, y la automatización del envío de correos ante cambios de estado clave.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones confirmadas e incorporadas tras la última revisión:
> - **Bitácora Multi-Prórroga con Fecha de Novedad**: Los mecánicos pueden registrar múltiples aplazamientos de entrega con justificación obligatoria. Tanto el administrador como el cliente visualizan el historial cronológico completo con la fecha y hora exacta en que se registró cada novedad, la fecha previa y la nueva fecha propuesta.
> - **Permiso Exclusivo para 'Entregada' / 'Entregado'**: Solo el usuario con rol de **Administrador** tiene autorización para cambiar el estado de una moto a `'entregada'` al momento de la recogida (manteniendo el estado previo de `'finalizado'`), así como marcar pedidos de repuestos como `'entregado'`.
> - **Módulo Avanzado de Gestión de Repuestos**: Accesible para administradores y mecánicos para:
>   1. Registrar repuestos (nombre, código, descripción, stock, precio de costo y venta).
>   2. Búsqueda en vivo por nombre o código.
>   3. Actualización de inventario con control de existencias.
>   4. Registro y vinculación de proveedores.
>   5. Historial de movimientos de entradas y salidas (kardex/auditoría).
>   6. Flujo de estados para pedidos de clientes: `'en camino'`, `'en espera por stock'`, `'listo para entrega'`, `'entregado'`.
> - **Automatización de Notificaciones por Correo Electrónico**: Disparo automático de correos con plantillas personalizadas de Motilón Motors cuando las motos pasan a `'esperando por autorización del cliente'`, `'autorizado por el cliente'` o `'finalizado'`, y cuando los repuestos solicitados pasan a `'listo para entrega'`. Incluye un Centro de Notificaciones y visor de correos enviados en tiempo real.

---

### 1. Overview & Core Concept

**Motilón Motors** es un ecosistema web que conecta operativamente al taller, sus técnicos y sus clientes:
1. **Administrador**: Supervisión integral de la flota de motos en servicio, control maestro de estados (con la facultad exclusiva de marcar motos y repuestos como entregados), gestión de proveedores y stock global, y registro central de trazabilidad.
2. **Mecánicos**: Gestión de sus motos asignadas, registro de diagnósticos y cotizaciones de repuestos, ingreso de prórrogas justificadas de tiempo, y control operativo de repuestos e insumos.
3. **Clientes**: Portal privado para ver sus motos en reparación y pedidos de repuestos, autorizar o rechazar presupuestos en tiempo real con un clic, examinar la bitácora de novedades y recibir confirmaciones y alertas por correo electrónico.

---

### 2. User Experience & Visual Design

#### A. Key User Flows

1. **Flujo de Mantenimiento y Prórrogas Múltiples**:
   - Estados de orden de moto: `'en curso'` $\rightarrow$ `'esperando por autorización del cliente'` $\rightarrow$ `'autorizado por el cliente'` $\rightarrow$ `'finalizado'` $\rightarrow$ `'entregada'` (exclusivo Administrador).
   - El mecánico puede abrir el modal **"Aplazar entrega"**, seleccionar la nueva fecha estimada y redactar la justificación requerida.
   - Se crea una nueva entrada en la **Bitácora de Novedades**: muestra fecha y hora de la novedad, técnico responsable, fecha anterior vs. nueva fecha y motivo. Tanto el cliente como el administrador ven el historial completo de prórrogas.
   - Cuando el cliente retira la moto, solo el Administrador cuenta con el botón de acción **"Marcar como Entregada"**.

2. **Flujo Integral de Repuestos y Proveedores**:
   - **Catálogo & Búsqueda**: Barra de búsqueda instantánea por nombre o código de repuesto, con filtros por categoría y stock crítico.
   - **Registro de Repuesto**: Formulario modal con nombre, código único, descripción, cantidad en stock, precio de costo y precio de venta.
   - **Actualización de Stock**: Modal rápido para registrar entradas (compras a proveedores) o salidas (ajustes o consumo directo), actualizando el saldo al instante.
   - **Gestión de Proveedores**: Pestaña dedicada para registrar proveedores (nombre, contacto, teléfono, dirección, catálogo de suministros).
   - **Historial de Movimientos (Kardex)**: Tabla de trazabilidad que registra tipo de movimiento (`Entrada` / `Salida`), fecha, cantidad, motivo/referencia y usuario responsable.
   - **Pedidos de Repuestos de Clientes**: Vinculación de pedidos con clientes con flujo de etiquetas: `'en camino'` $\rightarrow$ `'en espera por stock'` $\rightarrow$ `'listo para entrega'` $\rightarrow$ `'entregado'` (únicamente el Administrador puede marcarlo como entregado al entregar el repuesto al cliente).

3. **Flujo de Automatización de Correos Electrónicos**:
   - Al cambiar el estado de una moto a `'esperando por autorización del cliente'`, se despacha automáticamente un correo con el desglose de la cotización y un enlace directo interactivo para autorizar/rechazar.
   - Al pasar a `'autorizado por el cliente'` o `'finalizado'`, se envía confirmación de aprobación o aviso de moto lista para retiro.
   - Al cambiar el estado de un pedido de repuesto a `'listo para entrega'`, se despacha una notificación de retiro en taller.
   - **Bandeja de Correo del Sistema**: Panel interactivo con contador de correos despachados, vista previa de plantilla HTML estilizada, fecha/hora exacta y destinatario.

4. **Flujo del Cliente (Autorización Interactiva)**:
   - Acceso con usuario y contraseña.
   - Dashboard con sus motocicletas registradas y pedidos de repuestos.
   - Panel de decisión interactivo: botones destacados de **"Autorizar Reparación"** y **"Rechazar"** con confirmación inmediata y recálculo de costos.

#### B. Visual Identity & Theme

- **Estilo**: Taller de alto rendimiento, sobrio, técnico y minimalista.
- **Paleta de Colores**:
  - *Fondo y Superficies*: Gris grafito neutro (`#0F172A` / `#1E293B`) y variante clara (`#F8FAFC` con tarjetas `#FFFFFF`).
  - *Acentos*: Ámbar mecánico (`#D97706` / `#F59E0B`) para alertas y llamadas a la acción primarias.
  - *Etiquetas de Estado (Motos)*:
    - `'en curso'`: Azul técnico (`#2563EB`)
    - `'esperando por autorización del cliente'`: Ámbar cálido (`#D97706`)
    - `'autorizado por el cliente'`: Esmeralda (`#059669`)
    - `'finalizado'`: Pizarra ejecutiva (`#475569`)
    - `'entregada'`: Púrpura índigo (`#6366F1`)
  - *Etiquetas de Estado (Repuestos)*:
    - `'en camino'`: Cian / Azul cielo (`#0284C7`)
    - `'en espera por stock'`: Naranja advertencia (`#EA580C`)
    - `'listo para entrega'`: Esmeralda vibrante (`#10B981`)
    - `'entregado'`: Gris neutro (`#64748B`)
- **Tipografía**:
  - `Plus Jakarta Sans` para navegación y encabezados estructurados.
  - `tabular-nums` con monoespacio técnico para códigos de repuestos, placas de motos, precios en pesos colombianos/divisa y marcas temporales de novedades.
- **Disciplina Anti-Slop**:
  - Cero píldoras decorativas en metadatos; uso de divisores tipográficos sutiles (`·` y `/`).
  - Sin botones genéricos ni texto redundante.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Registro Cronológico Inmutable de Prórrogas (Bitácora)**:
  - *Enfoque*: Cada prórroga es una entidad individual vinculada a la orden de trabajo con su propia marca temporal (`fecha de la novedad`), fecha de entrega previa, fecha de entrega nueva, técnico responsable y justificación obligatoria.
  - *Por qué*: Responde al requisito expreso de admitir múltiples prórrogas y exhibirlas con total claridad tanto al Administrador como al Cliente.

- **Decisión 2: Control de Permisos Estricto a Nivel de UI y API**:
  - *Enfoque*: El botón de transición al estado `'entregada'` (motos) o `'entregado'` (repuestos) solo se renderiza y se procesa en el backend para usuarios con `role === 'admin'`. Los mecánicos y clientes visualizan el estado pero no pueden ejecutar la entrega física final.
  - *Por qué*: Evita inconsistencias de inventario y asegura que la liquidación y entrega física esté validada por la administración del taller.

- **Decisión 3: Simulador y Motor de Despacho de Correos Integrado**:
  - *Enfoque*: Implementar un servicio de notificaciones por correo en el backend y un Centro de Notificaciones en el cliente que captura automáticamente cada evento (`esperando por autorización`, `autorizado`, `finalizado`, `listo para entrega`). Muestra una modal de vista previa de correo con diseño profesional de Motilón Motors, cabecera de taller, código de ticket y acción recomendada.
  - *Por qué*: Permite demostrar de forma verosímil y palpable la automatización solicitada en el prototipo funcional sin requerir claves SMTP externas complejas que podrían fallar en el sandbox.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MOTILÓN MOTORS WEB APP                          │
├────────────────────────────────────────────────────────────────────────┤
│                       Autenticación Multi-Rol                          │
│               [ Administrador ] [ Mecánico ] [ Cliente ]               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ Panel Admin   │           │ Vista Mecánico│           │ Portal Cliente│
├───────────────┤           ├───────────────┤           ├───────────────┤
│ • Órdenes (5) │           │ • Mis motos   │           │ • Mis motos   │
│ • Entrega (🔒)│           │ • Prórrogas   │           │ • Bitácora    │
│ • Repuestos & │           │ • Diagnóstico │           │ • Autorizar/  │
│   Proveedores │           │ • Solicitud de│           │   Rechazar    │
│ • Kardex Mov. │           │   Repuestos   │           │ • Mis pedidos │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         API REST (Express.js)                          │
│  /api/auth · /api/orders · /api/parts · /api/suppliers · /api/emails   │
│  • Middleware de autorización por rol                                 │
│  • Disparador de eventos de correo automático                          │
├────────────────────────────────────────────────────────────────────────┤
│                    Base de Datos Relacional / Drizzle                  │
│  users, motorcycles, work_orders, postponement_logs, parts, suppliers, │
│  stock_movements, part_requests, email_logs                            │
└────────────────────────────────────────────────────────────────────────┘
```

#### Entidades de Base de Datos Principales:

1. **`users`**: `id`, `name`, `email`, `password`, `role` (`'admin' | 'mechanic' | 'client'`), `phone`.
2. **`motorcycles`**: `id`, `plate`, `brand`, `model`, `year`, `clientId`, `mileage`, `color`.
3. **`work_orders`**: `id`, `motorcycleId`, `mechanicId`, `status` (`'en curso' | 'esperando por autorización del cliente' | 'autorizado por el cliente' | 'finalizado' | 'entregada'`), `entryDate`, `estimatedDelivery`, `initialDiagnosis`, `suggestedRepairs`, `laborCost`, `partsCost`, `totalEstimate`.
4. **`postponement_logs`**: `id`, `workOrderId`, `mechanicId`, `mechanicName`, `previousDate`, `newDate`, `reason`, `createdAt` (*fecha de la novedad*).
5. **`parts`**: `id`, `name`, `code`, `description`, `stock`, `costPrice`, `salePrice`, `minStock`, `supplierId`.
6. **`suppliers`**: `id`, `name`, `contactName`, `phone`, `email`, `address`, `notes`.
7. **`stock_movements`**: `id`, `partId`, `type` (`'entrada' | 'salida'`), `quantity`, `previousStock`, `newStock`, `reason`, `userId`, `userName`, `createdAt`.
8. **`part_requests`**: `id`, `partId`, `clientId`, `workOrderId` (opcional), `quantity`, `unitPrice`, `status` (`'en camino' | 'en espera por stock' | 'listo para entrega' | 'entregado'`), `createdAt`, `updatedAt`.
9. **`email_logs`**: `id`, `toEmail`, `toName`, `subject`, `triggerEvent`, `bodyHtml`, `status`, `sentAt`, `relatedEntityId`.
