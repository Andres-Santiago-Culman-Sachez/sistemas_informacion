import React, { useState, useEffect } from 'react';
import {
  Part,
  Supplier,
  StockMovement,
  PartRequest,
  User,
  PartRequestStatus,
  SupplierDeletePreview
} from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { NumericInput } from '../NumericInput.tsx';
import {
  Search,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  Check,
  Lock,
  CheckCircle2,
  Pencil,
  Trash2,
} from 'lucide-react';

interface PartsModuleProps {
  currentUser: User;
  onRefreshData?: () => void;
}


export const PartsModule: React.FC<PartsModuleProps> = ({ currentUser, onRefreshData }) => {
  const isAdmin = currentUser.role === 'admin';
  const isMechanic = currentUser.role === 'mechanic';
  const isClient = currentUser.role === 'client';
  // B8: mecánico SÍ modifica repuestos/stock; proveedores mecánico solo lectura; cliente sin acceso
  const canModifyParts = isAdmin || isMechanic;
  const canModifySuppliers = isAdmin;

  const [activeTab, setActiveTab] = useState<'catalog' | 'suppliers' | 'movements' | 'requests'>('catalog');
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const [showNewPartModal, setShowNewPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [showStockModal, setShowStockModal] = useState<Part | null>(null);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletePreviewSupplier, setDeletePreviewSupplier] = useState<Supplier | null>(null);
  const [deletePreview, setDeletePreview] = useState<SupplierDeletePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newPart, setNewPart] = useState({
    name: '',
    code: '',
    description: '',
    category: 'Frenos',
    stock: '',
    costPrice: '',
    salePrice: '',
    minStock: '3',
    supplierId: '',
  });

  const [editPart, setEditPart] = useState({
    name: '',
    code: '',
    description: '',
    category: 'General',
    costPrice: '',
    salePrice: '',
    minStock: '',
    supplierId: '',
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    type: 'entrada' as 'entrada' | 'salida',
    quantity: '',
    reason: '',
  });

  // Proveedores: nombre, contacto, teléfono, email, dirección obligatorios; notas opcional
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  // compat: newSupplier alias usado en handlers antiguos
  const newSupplier = supplierForm;
  const setNewSupplier = setSupplierForm;

  const loadData = async () => {
    if (isClient) {
      setLoading(false);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyParts) return;
    setActionError(null);
    try {
      await api.createPart({
        name: newPart.name,
        code: newPart.code,
        description: newPart.description || undefined,
        category: newPart.category,
        stock: Number(newPart.stock || 0),
        costPrice: Number(newPart.costPrice || 0),
        salePrice: Number(newPart.salePrice || 0),
        minStock: Number(newPart.minStock || 0),
        supplierId: newPart.supplierId ? Number(newPart.supplierId) : undefined,
        userName: currentUser.name,
      });
      setShowNewPartModal(false);
      setNewPart({ name: '', code: '', description: '', category: 'Frenos', stock: '', costPrice: '', salePrice: '', minStock: '3', supplierId: '' });
      setActionMessage('Repuesto registrado exitosamente');
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      setActionError(err.message || 'Error al registrar repuesto');
    }
  };

  const openEditPart = (part: Part) => {
    setEditingPart(part);
    setEditPart({
      name: part.name,
      code: part.code,
      description: part.description ?? '',
      category: part.category || 'General',
      costPrice: String(part.costPrice ?? ''),
      salePrice: String(part.salePrice ?? ''),
      minStock: String(part.minStock ?? ''),
      supplierId: part.supplierId ? String(part.supplierId) : '',
    });
  };

  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart || !canModifyParts) return;
    setActionError(null);
    try {
      await api.updatePart({
        id: editingPart.id,
        name: editPart.name,
        code: editPart.code,
        description: editPart.description || undefined,
        category: editPart.category,
        costPrice: Number(editPart.costPrice || 0),
        salePrice: Number(editPart.salePrice || 0),
        minStock: Number(editPart.minStock || 0),
        supplierId: editPart.supplierId ? Number(editPart.supplierId) : undefined,
      });
      setEditingPart(null);
      setActionMessage('Repuesto actualizado exitosamente');
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar repuesto');
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStockModal || !canModifyParts) return;
    setActionError(null);
    try {
      await api.updateStock(
        showStockModal.id,
        stockAdjustment.type,
        Number(stockAdjustment.quantity || 0),
        stockAdjustment.reason,
        currentUser.id,
        currentUser.name
      );
      setShowStockModal(null);
      setStockAdjustment({ type: 'entrada', quantity: '', reason: '' });
      setActionMessage('Movimiento de inventario aplicado exitosamente');
      loadData();
      onRefreshData?.();
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar stock');
    }
  };

  const openCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' });
    setShowNewSupplierModal(true);
  };

  const openEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name ?? '',
      contactName: sup.contactName ?? '',
      phone: sup.phone ?? '',
      email: sup.email ?? '',
      address: sup.address ?? '',
      notes: sup.notes ?? '',
    });
    setShowNewSupplierModal(true);
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifySuppliers) return;
    setActionError(null);
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, supplierForm);
        setActionMessage('Proveedor actualizado exitosamente');
      } else {
        await api.createSupplier(supplierForm);
        setActionMessage('Proveedor registrado exitosamente');
      }
      setShowNewSupplierModal(false);
      setEditingSupplier(null);
      setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' });
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error al registrar proveedor');
    }
  };

  // B13: eliminar proveedor -> warning modal con preview
  const handleOpenDeletePreview = async (sup: Supplier) => {
    if (!canModifySuppliers) return;
    setDeletePreviewSupplier(sup);
    setDeletePreview(null);
    setLoadingPreview(true);
    setActionError(null);
    try {
      const preview = await api.getSupplierDeletePreview(sup.id);
      setDeletePreview(preview);
    } catch (err: any) {
      setActionError(err.message || 'Error al consultar vista previa de eliminación');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmDeleteSupplier = async () => {
    if (!deletePreviewSupplier || !canModifySuppliers) return;
    setActionError(null);
    try {
      await api.deleteSupplier(deletePreviewSupplier.id);
      setDeletePreviewSupplier(null);
      setDeletePreview(null);
      setActionMessage('Proveedor ocultado exitosamente (soft-hide)');
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error al eliminar proveedor');
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

  const filteredParts = parts.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['Todos', 'Frenos', 'Lubricantes', 'Transmisión', 'Admisión', 'Motor', 'Combustible', 'General'];

  // B8: cliente sin acceso al módulo (App lo oculta, pero también protege)
  if (isClient) {
    return (
      <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-500 text-xs space-y-2">
        <Lock className="w-8 h-8 mx-auto text-slate-400" />
        <p className="font-bold text-slate-700 dark:text-slate-300">Sin acceso al módulo de repuestos</p>
        <p>El módulo de repuestos e inventario es solo para administradores y mecánicos.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-xs">Cargando repuestos...</div>;
  }

  return (
    <div className="space-y-6">

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
          {activeTab === 'catalog' && canModifyParts && (
            <button
              onClick={() => setShowNewPartModal(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Repuesto
            </button>
          )}
          {activeTab === 'suppliers' && canModifySuppliers && (
            <button
              onClick={openCreateSupplier}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Proveedor
            </button>
          )}
          {activeTab === 'suppliers' && !canModifySuppliers && (
            <span className="text-2xs text-slate-400 italic flex items-center gap-1">
              <Lock className="w-3 h-3" /> Proveedores: solo lectura (solo admin crea/edita/elimina)
            </span>
          )}
        </div>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-4">
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
                            <div className="flex items-center justify-end gap-1">
                              {canModifyParts && (
                                <button
                                  onClick={() => openEditPart(part)}
                                  className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3" /> Editar
                                </button>
                              )}
                              {canModifyParts && (
                                <button
                                  onClick={() => setShowStockModal(part)}
                                  className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                                >
                                  Ajustar Stock
                                </button>
                              )}
                            </div>
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
                              isAdmin ? (
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
                {/* Botones solo admin; mecánico solo lectura */}
                {canModifySuppliers ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openEditSupplier(sup)}
                      className="px-2.5 py-1 text-2xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button
                      onClick={() => handleOpenDeletePreview(sup)}
                      className="px-2.5 py-1 text-2xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  </div>
                ) : (
                  <div className="text-2xs text-slate-400 italic flex items-center gap-1 pt-1">
                    <Lock className="w-3 h-3" /> Solo lectura (mecánico)
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: NEW PART */}
      {showNewPartModal && canModifyParts && (
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
                    Categoría *
                  </label>
                  <select
                    required
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Stock Inicial *
                  </label>
                  <NumericInput required value={newPart.stock} onChange={(v) => setNewPart({ ...newPart, stock: v })} placeholder="0" />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Stock Mínimo *
                  </label>
                  <NumericInput required value={newPart.minStock} onChange={(v) => setNewPart({ ...newPart, minStock: v })} placeholder="3" />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Precio Costo ($) *
                  </label>
                  <NumericInput required value={newPart.costPrice} onChange={(v) => setNewPart({ ...newPart, costPrice: v })} placeholder="0" />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Precio Venta ($) *
                  </label>
                  <NumericInput required value={newPart.salePrice} onChange={(v) => setNewPart({ ...newPart, salePrice: v })} placeholder="0" />
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

      {/* MODAL: EDIT PART */}
      {editingPart && canModifyParts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Editar Repuesto ({editingPart.code})
            </h3>
            <form onSubmit={handleUpdatePart} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Código Único *</label>
                  <input type="text" required value={editPart.code} onChange={(e) => setEditPart({ ...editPart, code: e.target.value })} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Categoría *</label>
                  <select required value={editPart.category} onChange={(e) => setEditPart({ ...editPart, category: e.target.value })} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                    {categories.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Nombre del Repuesto *</label>
                <input type="text" required value={editPart.name} onChange={(e) => setEditPart({ ...editPart, name: e.target.value })} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Descripción</label>
                <textarea rows={2} value={editPart.description} onChange={(e) => setEditPart({ ...editPart, description: e.target.value })} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Precio Costo ($) *</label>
                  <NumericInput required value={editPart.costPrice} onChange={(v) => setEditPart({ ...editPart, costPrice: v })} />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Precio Venta ($) *</label>
                  <NumericInput required value={editPart.salePrice} onChange={(v) => setEditPart({ ...editPart, salePrice: v })} />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Stock Mín. *</label>
                  <NumericInput required value={editPart.minStock} onChange={(v) => setEditPart({ ...editPart, minStock: v })} />
                </div>
              </div>
              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Proveedor</label>
                <select value={editPart.supplierId} onChange={(e) => setEditPart({ ...editPart, supplierId: e.target.value })} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                  <option value="">Sin proveedor asignado</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setEditingPart(null)} className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR STOCK */}
      {showStockModal && canModifyParts && (
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
                <NumericInput
                  required
                  value={stockAdjustment.quantity}
                  onChange={(v) => setStockAdjustment({ ...stockAdjustment, quantity: v })}
                  placeholder="1"
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

      {/* MODAL: CREATE / EDIT SUPPLIER (solo admin) */}
      {showNewSupplierModal && canModifySuppliers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingSupplier ? 'Editar Proveedor de Repuestos' : 'Registrar Proveedor de Repuestos'}
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
                  Nombre del Contacto *
                </label>
                <input
                  type="text"
                  required
                  value={newSupplier.contactName}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
                  placeholder="Ej: Lic. Carlos Gómez"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="+57 300..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="ventas@proveedor.com"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Dirección *
                </label>
                <input
                  type="text"
                  required
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  placeholder="Calle 10 #..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Notas / Especialidad (opcional)
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
                  onClick={() => { setShowNewSupplierModal(false); setEditingSupplier(null); }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg shadow-2xs transition-colors"
                >
                  {editingSupplier ? 'Guardar Cambios' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WARNING DELETE SUPPLIER (B13) */}
      {deletePreviewSupplier && canModifySuppliers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Eliminar proveedor: {deletePreviewSupplier.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Esta acción oculta el proveedor y sus repuestos asociados (soft-hide). Se puede continuar igualmente.
                </p>
              </div>
            </div>

            {loadingPreview ? (
              <p className="text-xs text-slate-400">Consultando repuestos con stock...</p>
            ) : deletePreview ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Total de repuestos asociados: <strong className="font-mono">{deletePreview.totalParts}</strong>
                </p>
                {deletePreview.partsWithStock.length > 0 ? (
                  <>
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                      Atención: estos repuestos aún tienen stock:
                    </p>
                    <ul className="text-xs font-mono text-slate-700 dark:text-slate-300 list-disc list-inside bg-amber-50 dark:bg-amber-950/30 p-3 rounded border border-amber-200 dark:border-amber-900/60">
                      {deletePreview.partsWithStock.slice(0, 5).map((p) => (
                        <li key={p.code}>{p.code} — stock: {p.stock}</li>
                      ))}
                    </ul>
                    <p className="text-2xs text-slate-500 italic">
                      Sugerencia: desabastecer/devolver stock antes de ocultar el proveedor.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Ningún repuesto asociado tiene stock mayor a 0.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No se pudo cargar la vista previa.</p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { setDeletePreviewSupplier(null); setDeletePreview(null); }}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSupplier}
                disabled={loadingPreview}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              >
                Confirmar ocultar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
