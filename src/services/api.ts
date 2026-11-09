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
  PartRequestStatus,
  RepairSuggestion,
  SupplierDeletePreview,
} from '../types/index.ts';

const API_BASE = '/api';

const TOKEN_KEY = 'mm_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable
  }
}

export const tokenManager = {
  getToken,
  setToken,
  clearToken,
  key: TOKEN_KEY,
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      `Error ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export interface CreateWorkOrderInput {
  motorcycleId?: number;
  newMotorcycle?: Partial<Motorcycle> & {
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    mileage: number;
    clientId: number;
  };
  mechanicId?: number;
  initialDiagnosis: string;
  estimatedDelivery: string;
  laborCost: number;
  partsCost: number;
  suggestedRepairs?: string;
  clientId?: number;
}

export interface CreateRepairSuggestionInput {
  description: string;
  additionalLaborCost: number;
  newEstimatedDelivery: string;
  linkedParts?: Array<{ partId: number; quantity: number }>;
  additionalPartsCost?: number;
}

export const api = {
  getToken,
  setToken,
  clearToken,

  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data?.token) setToken(data.token);
    return data;
  },

  async me(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      clearToken();
    }
  },

  async getUsers(role?: string): Promise<User[]> {
    const url = role ? `/users?role=${encodeURIComponent(role)}` : '/users';
    return request<User[]>(url);
  },

  // Motorcycles
  async getMotorcycles(): Promise<Motorcycle[]> {
    return request<Motorcycle[]>('/motorcycles');
  },

  async createMotorcycle(data: Partial<Motorcycle>): Promise<Motorcycle> {
    return request<Motorcycle>('/motorcycles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Work Orders
  async getWorkOrders(): Promise<WorkOrder[]> {
    return request<WorkOrder[]>('/work-orders');
  },

  async createWorkOrder(data: CreateWorkOrderInput): Promise<WorkOrder> {
    return request<WorkOrder>('/work-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Legacy extra params kept for dashboards compatibility; they are NOT sent in body.
  async updateOrderStatus(
    orderId: number,
    status: MotorcycleStatus,
    _userRole?: string,
    _userName?: string,
  ): Promise<WorkOrder> {
    void _userRole;
    void _userName;
    return request<WorkOrder>(`/work-orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async postponeOrder(
    orderId: number,
    newDate: string,
    reason: string,
    _mechanicId?: number,
    _mechanicName?: string,
  ): Promise<any> {
    void _mechanicId;
    void _mechanicName;
    return request<any>(`/work-orders/${orderId}/postpone`, {
      method: 'POST',
      body: JSON.stringify({ newDate, reason }),
    });
  },

  async getRepairSuggestions(orderId: number): Promise<RepairSuggestion[]> {
    return request<RepairSuggestion[]>(`/work-orders/${orderId}/repair-suggestions`);
  },

  async createRepairSuggestion(
    orderId: number,
    data: CreateRepairSuggestionInput,
  ): Promise<RepairSuggestion> {
    return request<RepairSuggestion>(`/work-orders/${orderId}/repair-suggestions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async authorizeRepairSuggestion(suggestionId: number): Promise<RepairSuggestion> {
    return request<RepairSuggestion>(`/repair-suggestions/${suggestionId}/authorize`, {
      method: 'PATCH',
    });
  },

  async rejectRepairSuggestion(suggestionId: number): Promise<RepairSuggestion> {
    return request<RepairSuggestion>(`/repair-suggestions/${suggestionId}/reject`, {
      method: 'PATCH',
    });
  },

  async deliverOrder(orderId: number, _userRole?: string): Promise<WorkOrder> {
    void _userRole;
    return request<WorkOrder>(`/work-orders/${orderId}/deliver`, {
      method: 'POST',
    });
  },

  // Endpoints legacy /work-orders/:id/suggest-repairs|authorize|reject
  // eliminados; se usan authorizeRepairSuggestion/rejectRepairSuggestion por id.

  // Parts
  async getParts(search?: string, category?: string, inStock?: boolean): Promise<Part[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (inStock) params.append('inStock', 'true');
    const qs = params.toString();
    return request<Part[]>(qs ? `/parts?${qs}` : '/parts');
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
    const { userName: _userName, ...body } = data;
    void _userName;
    return request<Part>('/parts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updatePart(data: Partial<Part> & { id: number }): Promise<Part> {
    return request<Part>('/parts', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateStock(
    partId: number,
    type: 'entrada' | 'salida',
    quantity: number,
    reason: string,
    _userId?: number,
    _userName?: string,
  ): Promise<any> {
    void _userId;
    void _userName;
    return request<any>(`/parts/${partId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ type, quantity, reason }),
    });
  },

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return request<Supplier[]>('/suppliers');
  },

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    return request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSupplier(id: number, data: Partial<Supplier>): Promise<Supplier> {
    return request<Supplier>(`/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getSupplierDeletePreview(id: number): Promise<SupplierDeletePreview> {
    return request<SupplierDeletePreview>(`/suppliers/${id}/delete-preview`);
  },

  async deleteSupplier(id: number): Promise<void> {
    await request<void>(`/suppliers/${id}`, { method: 'DELETE' });
  },

  // Stock movements
  async getStockMovements(partId?: number): Promise<StockMovement[]> {
    const url = partId ? `/stock-movements?partId=${partId}` : '/stock-movements';
    return request<StockMovement[]>(url);
  },

  // Part requests
  async getPartRequests(clientId?: number): Promise<PartRequest[]> {
    const url = clientId ? `/part-requests?clientId=${clientId}` : '/part-requests';
    return request<PartRequest[]>(url);
  },

  async createPartRequest(data: {
    partId: number;
    clientId: number;
    quantity: number;
    notes?: string;
    workOrderId?: number;
  }): Promise<PartRequest> {
    return request<PartRequest>('/part-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePartRequestStatus(
    requestId: number,
    status: PartRequestStatus,
    _userRole?: string,
  ): Promise<PartRequest> {
    void _userRole;
    return request<PartRequest>(`/part-requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Emails
  async getEmailLogs(): Promise<EmailLog[]> {
    return request<EmailLog[]>('/emails');
  },

  async getUnreadEmailCount(): Promise<{ unread: number }> {
    return request<{ unread: number }>('/emails/unread-count');
  },

  async markEmailRead(id: number): Promise<{ ok: boolean; isRead: boolean }> {
    return request<{ ok: boolean; isRead: boolean }>(`/emails/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllEmailsRead(): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/emails/read-all', {
      method: 'PATCH',
    });
  },
};
