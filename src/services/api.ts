import { 
  User, 
  Motorcycle, 
  WorkOrder, 
  Part, 
  Supplier, 
  StockMovement, 
  PartRequest, 
  EmailLog, 
  MotorcycleStatus, 
  PartRequestStatus 
} from '../types/index.ts';

const API_BASE = '/api';

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    return data;
  },

  async getUsers(role?: string): Promise<User[]> {
    const url = role ? `${API_BASE}/users?role=${role}` : `${API_BASE}/users`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar usuarios');
    return res.json();
  },

  // Motorcycles
  async getMotorcycles(): Promise<Motorcycle[]> {
    const res = await fetch(`${API_BASE}/motorcycles`);
    if (!res.ok) throw new Error('Error al cargar motocicletas');
    return res.json();
  },

  async createMotorcycle(data: Partial<Motorcycle>): Promise<Motorcycle> {
    const res = await fetch(`${API_BASE}/motorcycles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al crear motocicleta');
    return json;
  },

  // Work Orders
  async getWorkOrders(): Promise<WorkOrder[]> {
    const res = await fetch(`${API_BASE}/work-orders`);
    if (!res.ok) throw new Error('Error al cargar órdenes de trabajo');
    return res.json();
  },

  async createWorkOrder(data: {
    motorcycleId: number;
    mechanicId?: number;
    initialDiagnosis: string;
    estimatedDelivery: string;
    laborCost: number;
    partsCost: number;
    suggestedRepairs?: string;
  }): Promise<WorkOrder> {
    const res = await fetch(`${API_BASE}/work-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al crear orden de trabajo');
    return json;
  },

  async updateOrderStatus(
    orderId: number, 
    status: MotorcycleStatus, 
    userRole: string,
    userName?: string
  ): Promise<WorkOrder> {
    const res = await fetch(`${API_BASE}/work-orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, userRole, userName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al actualizar estado');
    return json;
  },

  async postponeOrder(
    orderId: number, 
    newDate: string, 
    reason: string, 
    mechanicId?: number, 
    mechanicName?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/work-orders/${orderId}/postpone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDate, reason, mechanicId, mechanicName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al aplazar entrega');
    return json;
  },

  async suggestRepairs(
    orderId: number,
    suggestedRepairs: string,
    additionalLabor: number,
    additionalParts: number
  ): Promise<WorkOrder> {
    const res = await fetch(`${API_BASE}/work-orders/${orderId}/suggest-repairs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestedRepairs, additionalLabor, additionalParts }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al enviar diagnóstico');
    return json;
  },

  async authorizeRepairs(orderId: number): Promise<WorkOrder> {
    const res = await fetch(`${API_BASE}/work-orders/${orderId}/authorize`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al autorizar reparación');
    return json;
  },

  async rejectRepairs(orderId: number): Promise<WorkOrder> {
    const res = await fetch(`${API_BASE}/work-orders/${orderId}/reject`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al rechazar reparación');
    return json;
  },

  async deliverOrder(orderId: number, userRole: string): Promise<WorkOrder> {
    const res = await fetch(`${API_BASE}/work-orders/${orderId}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userRole }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al entregar motocicleta');
    return json;
  },

  // Parts
  async getParts(search?: string, category?: string): Promise<Part[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    const res = await fetch(`${API_BASE}/parts?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar repuestos');
    return res.json();
  },

  async createPart(data: {
    name: string;
    code: string;
    description?: string;
    category?: string;
    stock: number;
    costPrice: number;
    salePrice: number;
    minStock?: number;
    supplierId?: number;
    userName?: string;
  }): Promise<Part> {
    const res = await fetch(`${API_BASE}/parts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al registrar repuesto');
    return json;
  },

  async updateStock(
    partId: number,
    type: 'entrada' | 'salida',
    quantity: number,
    reason: string,
    userId?: number,
    userName?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/parts/${partId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, quantity, reason, userId, userName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al actualizar stock');
    return json;
  },

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    const res = await fetch(`${API_BASE}/suppliers`);
    if (!res.ok) throw new Error('Error al cargar proveedores');
    return res.json();
  },

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al registrar proveedor');
    return json;
  },

  // Stock movements
  async getStockMovements(partId?: number): Promise<StockMovement[]> {
    const url = partId ? `${API_BASE}/stock-movements?partId=${partId}` : `${API_BASE}/stock-movements`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar movimientos de stock');
    return res.json();
  },

  // Part requests
  async getPartRequests(clientId?: number): Promise<PartRequest[]> {
    const url = clientId ? `${API_BASE}/part-requests?clientId=${clientId}` : `${API_BASE}/part-requests`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al consultar pedidos de repuestos');
    return res.json();
  },

  async createPartRequest(data: {
    partId: number;
    clientId: number;
    quantity: number;
    notes?: string;
    workOrderId?: number;
  }): Promise<PartRequest> {
    const res = await fetch(`${API_BASE}/part-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al solicitar repuesto');
    return json;
  },

  async updatePartRequestStatus(
    requestId: number, 
    status: PartRequestStatus, 
    userRole: string
  ): Promise<PartRequest> {
    const res = await fetch(`${API_BASE}/part-requests/${requestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, userRole }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al actualizar estado del pedido');
    return json;
  },

  // Emails
  async getEmailLogs(): Promise<EmailLog[]> {
    const res = await fetch(`${API_BASE}/emails`);
    if (!res.ok) throw new Error('Error al cargar registros de correo');
    return res.json();
  },
};
