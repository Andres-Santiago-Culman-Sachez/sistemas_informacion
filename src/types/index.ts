export type UserRole = 'admin' | 'mechanic' | 'client';

export interface User {
  id: number;
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt?: string;
}

export type MotorcycleStatus = 
  | 'en curso'
  | 'esperando por autorización del cliente'
  | 'autorizado por el cliente'
  | 'finalizado'
  | 'entregada';

export type PartRequestStatus = 
  | 'en camino'
  | 'en espera por stock'
  | 'listo para entrega'
  | 'entregado';

export interface Motorcycle {
  id: number;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  mileage?: number;
  clientId: number;
  clientName: string;
  createdAt?: string;
}

export interface PostponementLog {
  id: number;
  workOrderId: number;
  mechanicId?: number;
  mechanicName: string;
  previousDate: string;
  newDate: string;
  reason: string;
  createdAt: string; // Fecha de la novedad
}

export interface WorkOrder {
  id: number;
  motorcycleId: number;
  mechanicId?: number;
  mechanicName?: string;
  status: MotorcycleStatus;
  entryDate: string;
  estimatedDelivery: string;
  initialDiagnosis: string;
  suggestedRepairs?: string;
  laborCost: number;
  partsCost: number;
  totalEstimate: number;
  createdAt?: string;
  updatedAt?: string;
  // Populated fields
  motorcycle?: Motorcycle;
  postponements?: PostponementLog[];
}

export interface Supplier {
  id: number;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export interface Part {
  id: number;
  code: string;
  name: string;
  description?: string;
  category: string;
  stock: number;
  costPrice: number;
  salePrice: number;
  minStock: number;
  supplierId?: number;
  supplierName?: string;
  createdAt?: string;
}

export interface StockMovement {
  id: number;
  partId: number;
  partName?: string;
  partCode?: string;
  type: 'entrada' | 'salida';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId?: number;
  userName: string;
  createdAt: string;
}

export interface PartRequest {
  id: number;
  partId: number;
  partName?: string;
  partCode?: string;
  clientId: number;
  clientName: string;
  workOrderId?: number;
  quantity: number;
  unitPrice: number;
  status: PartRequestStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailLog {
  id: number;
  toEmail: string;
  toName: string;
  subject: string;
  triggerEvent: string;
  bodyHtml: string;
  status: string;
  relatedType?: 'work_order' | 'part_request';
  relatedId?: number;
  createdAt: string;
}
