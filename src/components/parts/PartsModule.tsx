import React, { useState, useEffect } from 'react';
import { 
  Part, 
  Supplier, 
  StockMovement, 
  PartRequest, 
  User, 
  PartRequestStatus 
} from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Truck, 
  Users, 
  History, 
  Check, 
  Lock, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

interface PartsModuleProps {
  currentUser: User;
  onRefreshData?: () => void;
}

export const PartsModule: React.FC<PartsModuleProps> = ({ currentUser, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'suppliers' | 'movements' | 'requests'>('catalog');
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Modals state
  const [showNewPartModal, setShowNewPartModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState<Part | null>(null);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form states
  const [newPart, setNewPart] = useState({
    name: '',
    code: '',
    description: '',
    category: 'Frenos',
    stock: 0,
    costPrice: 0,
    salePrice: 0,
    minStock: 3,
    supplierId: '',
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    type: 'entrada' as 'entrada' | 'salida',
    quantity: 1,
    reason: '',
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [pData, sData, mData, rData] = await Promise.all([
        api.getParts(),
        api.getSuppliers(),
        api.getStockMovements(),
        api.getPartRequests(),
      ]);
      setParts(pData);
      setSuppliers(sData);
      setMovements(mData);
      setRequests(rData);
    } catch (err: any) {
      setActionError(err.message || 'Error al cargar datos de repuestos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.createPart({
        ...newPart,
        stock: Number(newPart.stock),
        costPrice: Number(newPart.costPrice),
        salePrice: Number(newPart.salePrice),
        minStock: Number(newPart.minStock),
        supplierId: newPart.supplierId ? Number(newPart.supplierId) : undefined,
        userName: currentUser.name,
      });
      setShowNewPartModal(false);
      setNewPart({
        name: '',
        code: '',
        description: '',
        category: 'Frenos',
        stock: 0,
        costPrice: 0,
        salePrice: 0,
        minStock: 3,
        supplierId: '',
      });
      setActionMessage('Repuesto registrado exitosamente');
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      setActionError(err.message || 'Error al registrar repuesto');
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStockModal) return;
    setActionError(null);
    try {
      await api.updateStock(
        showStockModal.id,
        stockAdjustment.type,
        Number(stockAdjustment.quantity),
        stockAdjustment.reason,
        currentUser.id,
        currentUser.name
      );
      setShowStockModal(null);
      setStockAdjustment({ type: 'entrada', quantity: 1, reason: '' });
      setActionMessage('Movimiento de inventario aplicado exitosamente');
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar stock');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.createSupplier(newSupplier);
      setShowNewSupplierModal(false);
      setNewSupplier({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' });
      setActionMessage('Proveedor registrado exitosamente');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error al registrar proveedor');
    }
  };

  const handleUpdatePartRequestStatus = async (requestId: number, newStatus: PartRequestStatus) => {
    setActionError(null);
    try {
      await api.updatePartRequestStatus(requestId, newStatus, currentUser.role);
      setActionMessage(`Estado del pedido actualizado a: ${newStatus}`);
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar pedido');
    }
  };

  // Filter parts
  const filteredParts = parts.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Todos', 'Frenos', 'Lubricantes', 'Transmisión', 'Admisión', 'Motor', 'Combustible', 'General'];

  return (
    <div className="space-y-6">
      
      {/* Messages */}
      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold ml-2">×</button>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'catalog' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Catálogo de Repuestos ({parts.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'requests' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Pedidos de Clientes ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'movements' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Kardex / Movimientos ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'suppliers' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Proveedores ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'catalog' && (
            <button
              onClick={() => setShowNewPartModal(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Repuesto
            </button>
          )}
          {activeTab === 'suppliers' && (
            <button
              onClick={() => setShowNewSupplierModal(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar repuesto por nombre o código (ej: Brembo, REP-01)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Parts Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-2xs">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Código</th>
                    <th className="py-3 px-4 font-semibold">Repuesto</th>
                    <th className="py-3 px-4 font-semibold">Categoría</th>
                    <th className="py-3 px-4 font-semibold">Stock</th>
                    <th className="py-3 px-4 font-semibold">Costo</th>
                    <th className="py-3 px-4 font-semibold">Venta</th>
                    <th className="py-3 px-4 font-semibold">Proveedor</th>
                    <th className="py-3 px-4 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        No se encontraron repuestos con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part) => {
                      const isLowStock = part.stock <= part.minStock;
                      return (
                        <tr key={part.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {part.code}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-white">{part.name}</div>
                            {part.description && (
                              <div className="text-2xs text-slate-400 line-clamp-1">{part.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {part.category}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono tabular-nums font-semibold ${
                                isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {part.stock} unid.
                              </span>
                              {isLowStock && (
                                <span className="text-2xs text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Bajo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                            ${part.costPrice.toLocaleString('es-CO')}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                            ${part.salePrice.toLocaleString('es-CO')}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                            {part.supplierName || 'Sin asignar'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setShowStockModal(part)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                            >
                              Ajustar Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PEDIDOS DE REPUESTOS POR CLIENTES */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Flujo de estados para pedidos: <span className="font-semibold text-sky-600">en camino</span> · <span className="font-semibold text-orange-600">en espera por stock</span> · <span className="font-semibold text-emerald-600">listo para entrega</span> (dispara correo automático) · <span className="font-semibold text-slate-700">entregado</span> (exclusivo Administrador).
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-2xs">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Repuesto</th>
                    <th className="py-3 px-4 font-semibold">Cliente</th>
                    <th className="py-3 px-4 font-semibold">Cant.</th>
                    <th className="py-3 px-4 font-semibold">Total</th>
                    <th className="py-3 px-4 font-semibold">Estado Actual</th>
                    <th className="py-3 px-4 font-semibold">Notas</th>
                    <th className="py-3 px-4 font-semibold text-right">Actualizar Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No hay solicitudes de repuestos registradas.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-2xs text-slate-400 block">{req.partCode}</span>
                          <span className="font-medium text-slate-900 dark:text-white">{req.partName}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {req.clientName}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          {req.quantity}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                          ${(req.quantity * req.unitPrice).toLocaleString('es-CO')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-sm ${
                            req.status === 'en camino' 
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                              : req.status === 'en espera por stock'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : req.status === 'listo para entrega'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-2xs text-slate-500 max-w-[180px] truncate">
                          {req.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {req.status === 'en camino' && (
                              <button
                                onClick={() => handleUpdatePartRequestStatus(req.id, 'en espera por stock')}
                                className="px-2 py-1 text-2xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 rounded border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                              >
                                En espera stock
                              </button>
                            )}
                            {(req.status === 'en camino' || req.status === 'en espera por stock') && (
                              <button
                                onClick={() => handleUpdatePartRequestStatus(req.id, 'listo para entrega')}
                                className="px-2 py-1 text-2xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                              >
                                Listo entrega ✉
                              </button>
                            )}
                            {req.status === 'listo para entrega' && (
                              currentUser.role === 'admin' ? (
                                <button
                                  onClick={() => handleUpdatePartRequestStatus(req.id, 'entregado')}
                                  className="px-2 py-1 text-2xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Entregar
                                </button>
                              ) : (
                                <span className="text-2xs text-slate-400 italic flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Solo Admin entrega
                                </span>
                              )
                            )}
                            {req.status === 'entregado' && (
                              <span className="text-2xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Entregado al cliente
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MOVEMENTS / KARDEX */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-2xs">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Fecha y Hora</th>
                    <th className="py-3 px-4 font-semibold">Repuesto</th>
                    <th className="py-3 px-4 font-semibold">Tipo</th>
                    <th className="py-3 px-4 font-semibold">Cantidad</th>
                    <th className="py-3 px-4 font-semibold">Stock Ant.</th>
                    <th className="py-3 px-4 font-semibold">Nuevo Stock</th>
                    <th className="py-3 px-4 font-semibold">Motivo / Justificación</th>
                    <th className="py-3 px-4 font-semibold">Registrado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        No hay movimientos de kardex registrados.
                      </td>
                    </tr>
                  ) : (
                    movements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-500 text-2xs">
                          {new Date(mov.createdAt).toLocaleString('es-CO')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-2xs text-slate-400 block">{mov.partCode}</span>
                          <span className="font-medium text-slate-900 dark:text-white">{mov.partName}</span>
                        </td>
                        <td className="py-3 px-4">
                          {mov.type === 'entrada' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-2xs">
                              <ArrowDownLeft className="w-3 h-3" /> Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-2xs">
                              <ArrowUpRight className="w-3 h-3" /> Salida
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums font-semibold">
                          {mov.type === 'entrada' ? `+${mov.quantity}` : `-${mov.quantity}`}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                          {mov.previousStock}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {mov.newStock}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {mov.reason}
                        </td>
                        <td className="py-3 px-4 text-2xs text-slate-500">
                          {mov.userName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs">
              No hay proveedores registrados.
            </div>
          ) : (
            suppliers.map((sup) => (
              <div 
                key={sup.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{sup.name}</h4>
                  <Truck className="w-4 h-4 text-amber-500" />
                </div>
                {sup.contactName && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Contacto: <strong className="text-slate-800 dark:text-slate-200">{sup.contactName}</strong>
                  </div>
                )}
                {sup.phone && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Tel: <span className="font-mono">{sup.phone}</span>
                  </div>
                )}
                {sup.email && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Email: <span className="font-mono">{sup.email}</span>
                  </div>
                )}
                {sup.address && (
                  <div className="text-xs text-slate-500">
                    Dirección: {sup.address}
                  </div>
                )}
                {sup.notes && (
                  <div className="text-2xs text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                    {sup.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: NEW PART */}
      {showNewPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Registrar Nuevo Repuesto
            </h3>
            <form onSubmit={handleCreatePart} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Código Único *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPart.code}
                    onChange={(e) => setNewPart({ ...newPart, code: e.target.value })}
                    placeholder="REP-FRE-09"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Categoría
                  </label>
                  <select
                    value={newPart.category}
                    onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    {categories.filter(c => c !== 'Todos').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Nombre del Repuesto *
                </label>
                <input
                  type="text"
                  required
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  placeholder="Ej: Disco de freno delantero flotante 300mm"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={newPart.description}
                  onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                  placeholder="Especificaciones técnicas, compatibilidad, etc."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPart.stock}
                    onChange={(e) => setNewPart({ ...newPart, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Precio Costo ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPart.costPrice}
                    onChange={(e) => setNewPart({ ...newPart, costPrice: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Precio Venta ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPart.salePrice}
                    onChange={(e) => setNewPart({ ...newPart, salePrice: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Proveedor
                </label>
                <select
                  value={newPart.supplierId}
                  onChange={(e) => setNewPart({ ...newPart, supplierId: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="">Sin proveedor asignado</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewPartModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors"
                >
                  Guardar Repuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR STOCK */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Ajustar Inventario / Stock
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Repuesto: <strong className="text-slate-800 dark:text-slate-200">{showStockModal.name}</strong> ({showStockModal.code})
              <br />
              Stock actual: <span className="font-mono font-bold text-amber-600">{showStockModal.stock} unidades</span>
            </p>

            <form onSubmit={handleUpdateStock} className="space-y-4">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Tipo de Movimiento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockAdjustment({ ...stockAdjustment, type: 'entrada' })}
                    className={`py-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                      stockAdjustment.type === 'entrada'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Entrada (Compra)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAdjustment({ ...stockAdjustment, type: 'salida' })}
                    className={`py-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                      stockAdjustment.type === 'salida'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Salida (Baja/Ajuste)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Justificación / Motivo del Movimiento *
                </label>
                <textarea
                  required
                  rows={2}
                  value={stockAdjustment.reason}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                  placeholder="Ej: Factura de compra proveedor #1094 / Ajuste por conteo físico"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStockModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg shadow-2xs transition-colors"
                >
                  Aplicar al Kardex
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW SUPPLIER */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Registrar Proveedor de Repuestos
            </h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Nombre Empresa / Distribuidora *
                </label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="Ej: Frenos y Cadenas de Colombia"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Nombre del Contacto
                </label>
                <input
                  type="text"
                  value={newSupplier.contactName}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
                  placeholder="Ej: Lic. Carlos Gómez"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="+57 300..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="ventas@proveedor.com"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  placeholder="Calle 10 #..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Notas / Especialidad
                </label>
                <textarea
                  rows={2}
                  value={newSupplier.notes}
                  onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                  placeholder="Especialista en cadenas, aceites, etc."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewSupplierModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg shadow-2xs transition-colors"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
