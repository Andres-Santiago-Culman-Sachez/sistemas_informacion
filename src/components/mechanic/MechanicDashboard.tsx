import React, { useEffect, useMemo, useState } from 'react';
import { WorkOrder, User, Part, RepairSuggestion } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { NumericInput } from '../NumericInput.tsx';
import {
  Wrench,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronUp,
  Plus,
  Lock,
} from 'lucide-react';

const fmtMoney = (n: number) => `$${(n ?? 0).toLocaleString('es-CO')} COP`;

const getSuggestions = (o: WorkOrder): RepairSuggestion[] => o.repairSuggestions ?? [];
const pendingCount = (o: WorkOrder) => getSuggestions(o).filter((s) => s.status === 'pendiente').length;

interface MechanicDashboardProps {
  orders: WorkOrder[];
  currentUser: User;
  onRefresh: () => void;
}

interface LinkedPartSelection {
  partId: number;
  quantity: number; // string digits while editing, converted on submit
  quantityStr: string;
}

export const MechanicDashboard: React.FC<MechanicDashboardProps> = ({
  orders,
  currentUser,
  onRefresh,
}) => {
  const [postponeModalOrder, setPostponeModalOrder] = useState<WorkOrder | null>(null);
  const [suggestModalOrder, setSuggestModalOrder] = useState<WorkOrder | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [postponeData, setPostponeData] = useState({ newDate: '', reason: '' });

  // Form sugerencia (nuevo flujo repair-suggestions)
  const [suggestData, setSuggestData] = useState({
    description: '',
    additionalLaborCost: '',
    newEstimatedDelivery: '',
    additionalPartsCost: '', // manual, solo si no vincula repuestos
  });
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [partsSearch, setPartsSearch] = useState('');
  const [linkedParts, setLinkedParts] = useState<LinkedPartSelection[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  // B18: mecánico SOLO órdenes asignadas (mechanicId === currentUser.id)
  const myOrders = orders.filter(o => o.mechanicId === currentUser.id);

  // Carga repuestos con stock>0 cuando se abre el modal de sugerencia
  useEffect(() => {
    if (!suggestModalOrder) return;
    const load = async () => {
      setLoadingParts(true);
      try {
        const data = await api.getParts('', 'Todos', true);
        setAvailableParts(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setActionError(err.message || 'Error al cargar repuestos con stock');
      } finally {
        setLoadingParts(false);
      }
    };
    load();
  }, [suggestModalOrder]);

  const filteredAvailableParts = useMemo(() => {
    const q = partsSearch.toLowerCase().trim();
    if (!q) return availableParts;
    return availableParts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  }, [availableParts, partsSearch]);

  const linkedSubtotal = useMemo(() => {
    return linkedParts.reduce((sum, lp) => {
      const part = availableParts.find(p => p.id === lp.partId);
      const price = part?.salePrice ?? 0;
      const qty = Number(lp.quantityStr || 0);
      return sum + price * qty;
    }, 0);
  }, [linkedParts, availableParts]);

  const preview = useMemo(() => {
    if (!suggestModalOrder) return null;
    const prevLabor = suggestModalOrder.laborCost ?? 0;
    const prevParts = suggestModalOrder.partsCost ?? 0;
    const prevTotal = suggestModalOrder.totalEstimate ?? (prevLabor + prevParts);
    const addLabor = Number(suggestData.additionalLaborCost || 0);
    const addParts = linkedParts.length > 0 ? linkedSubtotal : Number(suggestData.additionalPartsCost || 0);
    return {
      prevLabor, prevParts, prevTotal,
      addLabor, addParts,
      newLabor: prevLabor + addLabor,
      newParts: prevParts + addParts,
      newTotal: prevLabor + addLabor + prevParts + addParts,
    };
  }, [suggestModalOrder, suggestData, linkedParts, linkedSubtotal]);

  const openSuggestModal = (order: WorkOrder) => {
    // B11: no crear sugerencia si finalizado/entregada
    if (order.status === 'finalizado' || order.status === 'entregada') return;
    setSuggestModalOrder(order);
    setSuggestData({
      description: '',
      additionalLaborCost: '',
      newEstimatedDelivery: order.estimatedDelivery,
      additionalPartsCost: '',
    });
    setLinkedParts([]);
    setPartsSearch('');
  };

  const addLinkedPart = (partId: number) => {
    if (linkedParts.some(lp => lp.partId === partId)) return;
    setLinkedParts([...linkedParts, { partId, quantity: 1, quantityStr: '1' }]);
  };

  const updateLinkedQty = (partId: number, qtyStr: string) => {
    const part = availableParts.find(p => p.id === partId);
    const stock = part?.stock ?? 0;
    let qty = Number(qtyStr || 0);
    if (qty > stock) qty = stock;
    setLinkedParts(linkedParts.map(lp => lp.partId === partId ? { ...lp, quantity: qty, quantityStr: String(qty) } : lp));
  };

  const removeLinkedPart = (partId: number) => {
    setLinkedParts(linkedParts.filter(lp => lp.partId !== partId));
  };

  const handlePostponeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postponeModalOrder) return;
    setActionError(null);
    if (!postponeData.reason.trim()) {
      setActionError('Debes ingresar una justificación técnica obligatoria para aplazar la entrega.');
      return;
    }
    try {
      await api.postponeOrder(
        postponeModalOrder.id,
        postponeData.newDate,
        postponeData.reason,
        currentUser.id,
        currentUser.name
      );
      setPostponeModalOrder(null);
      setPostponeData({ newDate: '', reason: '' });
      setActionMessage('Prórroga de tiempo registrada con éxito en la bitácora visible.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al aplazar la entrega');
    }
  };

  const handleSuggestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestModalOrder) return;
    // B11 guard extra
    if (suggestModalOrder.status === 'finalizado' || suggestModalOrder.status === 'entregada') {
      setActionError('No se puede sugerir en una orden finalizada/entregada.');
      return;
    }
    setActionError(null);
    try {
      const payload = {
        description: suggestData.description.trim(),
        additionalLaborCost: Number(suggestData.additionalLaborCost || 0),
        newEstimatedDelivery: suggestData.newEstimatedDelivery,
        linkedParts: linkedParts.map(lp => ({ partId: lp.partId, quantity: Number(lp.quantityStr || 0) })),
        // solo si no vincula repuestos
        ...(linkedParts.length === 0 ? { additionalPartsCost: Number(suggestData.additionalPartsCost || 0) } : {}),
      };
      await api.createRepairSuggestion(suggestModalOrder.id, payload);
      setSuggestModalOrder(null);
      setSuggestData({ description: '', additionalLaborCost: '', newEstimatedDelivery: '', additionalPartsCost: '' });
      setLinkedParts([]);
      setActionMessage('Reparación sugerida enviada al cliente para autorización.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al solicitar autorización');
    }
  };

  const handleFinishWork = async (orderId: number) => {
    setActionError(null);
    try {
      await api.updateOrderStatus(orderId, 'finalizado');
      setActionMessage('Trabajo marcado como FINALIZADO. Se notificó al cliente para retirar su moto.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al finalizar trabajo');
    }
  };

  const suggestionStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      aprobada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      rechazada: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
      cancelada: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };
    return <span className={`px-2 py-0.5 rounded-sm font-semibold text-2xs uppercase ${map[status] ?? 'bg-slate-200 text-slate-700'}`}>{status}</span>;
  };

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Motos en Taller Asignadas a Mí
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Técnico: <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong> · Solo órdenes con mechanicId === tu id (B18)
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Total asignadas: <span className="font-mono font-bold text-amber-600">{myOrders.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {myOrders.length === 0 ? (
          <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-400 text-xs">
            No tienes motocicletas asignadas en este momento.
          </div>
        ) : (
          myOrders.map((order) => {
            const hasPostponements = order.postponements && order.postponements.length > 0;
            const isExpanded = expandedLogs === order.id;
            const suggestions = getSuggestions(order);
            const pendings = pendingCount(order);
            const isClosed = order.status === 'finalizado' || order.status === 'entregada';
            const canFinish = !isClosed && pendings === 0;

            return (
              <div
                key={order.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-base bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-md">
                      {order.motorcycle?.plate}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {order.motorcycle?.brand} {order.motorcycle?.model} ({order.motorcycle?.year || 2024})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Cliente: {order.motorcycle?.clientName} · Kilometraje: {order.motorcycle?.mileage?.toLocaleString('es-CO')} km
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-2xs font-semibold px-2.5 py-1 rounded-md uppercase ${
                      order.status === 'en curso'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : order.status === 'esperando por autorización del cliente'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : order.status === 'autorizado por el cliente'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : order.status === 'finalizado'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-slate-400 block font-semibold text-2xs uppercase">Diagnóstico Inicial:</span>
                    <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
                      {order.initialDiagnosis}
                    </p>
                    {order.suggestedRepairs && (
                      <div className="mt-2 text-2xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900">
                        <strong>Reparaciones adicionales cotizadas (orden):</strong> {order.suggestedRepairs}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Fecha Estimada Entrega:</span>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        {order.estimatedDelivery}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Presupuesto Acumulado:</span>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        ${order.totalEstimate.toLocaleString('es-CO')} COP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Historial completo de sugerencias */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Historial de sugerencias ({suggestions.length})
                  </h4>
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin sugerencias registradas.</p>
                  ) : (
                    <div className="space-y-2">
                      {suggestions.map((s) => (
                        <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-md border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">#{s.id} {s.mechanicName ? `· ${s.mechanicName}` : ''}</span>
                            {suggestionStatusBadge(s.status)}
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 italic">"{s.description}"</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
                            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <div className="font-bold uppercase text-slate-400 mb-1">Anterior</div>
                              <div>Mano de obra: <strong className="font-mono">{fmtMoney(s.previousLaborCost)}</strong></div>
                              <div>Repuestos: <strong className="font-mono">{fmtMoney(s.previousPartsCost)}</strong></div>
                              <div>Total: <strong className="font-mono">{fmtMoney(s.previousTotalEstimate)}</strong></div>
                              <div>Fecha: <strong className="font-mono">{s.previousEstimatedDelivery}</strong></div>
                            </div>
                            <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              <div className="font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">Nuevo</div>
                              <div>Mano de obra: <strong className="font-mono">{fmtMoney(s.newLaborCost)}</strong></div>
                              <div>Repuestos: <strong className="font-mono">{fmtMoney(s.newPartsCost)}</strong></div>
                              <div>Total: <strong className="font-mono">{fmtMoney(s.newTotalEstimate)}</strong></div>
                              <div>Fecha: <strong className="font-mono">{s.newEstimatedDelivery}</strong></div>
                            </div>
                          </div>
                          {s.parts && s.parts.length > 0 && (
                            <ul className="text-2xs text-slate-600 dark:text-slate-400 list-disc list-inside">
                              {s.parts.map((p, i) => (
                                <li key={`${p.partId}-${i}`}>{p.partCode ? `${p.partCode} - ` : ''}{p.partName ?? ''} × {p.quantity}{p.subtotal !== undefined ? ` = ${fmtMoney(p.subtotal)}` : ''}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aviso finalizar bloqueado */}
                {!isClosed && pendings > 0 && (
                  <div className="text-2xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    No puedes finalizar: existen {pendings} sugerencia(s) pendiente(s) de autorización del cliente.
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setPostponeModalOrder(order);
                        setPostponeData({ newDate: order.estimatedDelivery, reason: '' });
                      }}
                      disabled={isClosed}
                      className="px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Aplazar Entrega (Justificar)
                    </button>

                    {/* B11: Oculta Sugerir si entregada/finalizado */}
                    {!isClosed && (
                      <button
                        onClick={() => openSuggestModal(order)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Sugerir Reparaciones / Cotizar
                      </button>
                    )}
                    {isClosed && (
                      <span className="text-2xs text-slate-400 italic flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Sugerir bloqueado ({order.status})
                      </span>
                    )}

                    {/* FINALIZAR TRABAJO bloqueado si hay pendientes */}
                    {!isClosed && (
                      <button
                        onClick={() => canFinish && handleFinishWork(order.id)}
                        disabled={!canFinish}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!canFinish ? 'No se puede finalizar: existen sugerencias pendientes' : 'Finalizar trabajo'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Finalizar Trabajo
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedLogs(isExpanded ? null : order.id)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    Bitácora ({order.postponements?.length || 0})
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {isExpanded && order.postponements && (
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                      Historial de Prórrogas Registradas
                    </h4>
                    {order.postponements.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No hay aplazamientos en esta moto.</p>
                    ) : (
                      order.postponements.map((log) => (
                        <div key={log.id} className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between text-2xs text-slate-500">
                            <span className="font-semibold text-amber-600">Por: {log.mechanicName}</span>
                            <span className="font-mono">Novedad: {new Date(log.createdAt).toLocaleString('es-CO')}</span>
                          </div>
                          <div className="text-2xs font-mono text-slate-600 dark:text-slate-400">
                            De: {log.previousDate} ➔ A: <strong className="text-slate-900 dark:text-white">{log.newDate}</strong>
                          </div>
                          <div className="text-xs text-slate-800 dark:text-slate-200 italic">
                            "{log.reason}"
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* MODAL: APLAZAR ENTREGA */}
      {postponeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Aplazar Fecha Estimada de Entrega
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Moto: <strong className="text-slate-800 dark:text-slate-200">{postponeModalOrder.motorcycle?.brand} {postponeModalOrder.motorcycle?.model} ({postponeModalOrder.motorcycle?.plate})</strong>
              <br />
              Fecha actual: <span className="font-mono text-slate-700 dark:text-slate-300">{postponeModalOrder.estimatedDelivery}</span>
            </p>

            <form onSubmit={handlePostponeSubmit} className="space-y-4">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Nueva Fecha Estimada de Entrega *
                </label>
                <input
                  type="date"
                  required
                  value={postponeData.newDate}
                  onChange={(e) => setPostponeData({ ...postponeData, newDate: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Justificación Técnica Obligatoria *
                </label>
                <textarea
                  required
                  rows={3}
                  value={postponeData.reason}
                  onChange={(e) => setPostponeData({ ...postponeData, reason: e.target.value })}
                  placeholder="Detalla la razón exacta de la demora..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPostponeModalOrder(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors"
                >
                  Registrar Prórroga en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUGERIR REPARACIONES */}
      {suggestModalOrder && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Sugerir Reparaciones Adicionales
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Moto: <strong>{suggestModalOrder.motorcycle?.plate}</strong>. Al enviar, la orden pasará a estado <em>"esperando por autorización del cliente"</em> y se enviará un correo automático.
            </p>

            <form onSubmit={handleSuggestSubmit} className="space-y-3.5">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Descripción del Hallazgo / Reparación Sugerida *
                </label>
                <textarea
                  required
                  rows={3}
                  value={suggestData.description}
                  onChange={(e) => setSuggestData({ ...suggestData, description: e.target.value })}
                  placeholder="Ej: Se detectó fuga en retén de barras de suspensión..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Mano de Obra Adicional ($) *
                  </label>
                  <NumericInput
                    required
                    value={suggestData.additionalLaborCost}
                    onChange={(v) => setSuggestData({ ...suggestData, additionalLaborCost: v })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Nueva Fecha de Entrega *
                  </label>
                  <input
                    type="date"
                    required
                    min={suggestModalOrder.estimatedDelivery}
                    value={suggestData.newEstimatedDelivery}
                    onChange={(e) => setSuggestData({ ...suggestData, newEstimatedDelivery: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Buscador de repuestos con stock > 0 */}
              <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Repuestos vinculados (con stock &gt; 0, opcional)
                </label>
                <input
                  type="text"
                  value={partsSearch}
                  onChange={(e) => setPartsSearch(e.target.value)}
                  placeholder="Buscar por nombre o código (ej: Brembo, REP-01)..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                {loadingParts ? (
                  <p className="text-2xs text-slate-400">Cargando repuestos con stock...</p>
                ) : filteredAvailableParts.length === 0 ? (
                  <p className="text-2xs text-slate-400 italic">Sin repuestos con stock para los filtros.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredAvailableParts.slice(0, 20).map((part) => {
                      const already = linkedParts.some(lp => lp.partId === part.id);
                      return (
                        <div key={part.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="font-mono text-2xs text-slate-400 block">{part.code}</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{part.name}</span>
                            <span className="text-2xs text-slate-500 block">Stock: {part.stock} · {fmtMoney(part.salePrice)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => addLinkedPart(part.id)}
                            disabled={already}
                            className="px-2 py-1 text-2xs font-semibold rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                          >
                            {already ? 'Vinculado' : '+ Vincular'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {linkedParts.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-2xs font-bold uppercase text-slate-500">Vinculados ({linkedParts.length})</p>
                    {linkedParts.map((lp) => {
                      const part = availableParts.find(p => p.id === lp.partId);
                      if (!part) return null;
                      const subtotal = part.salePrice * Number(lp.quantityStr || 0);
                      return (
                        <div key={lp.partId} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/60">
                          <div className="min-w-0">
                            <span className="font-mono text-2xs text-slate-400 block">{part.code}</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">{part.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <label className="text-2xs text-slate-500">Cant. (máx {part.stock})</label>
                            <NumericInput
                              required
                              value={lp.quantityStr}
                              onChange={(v) => updateLinkedQty(lp.partId, v)}
                              className="w-20 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                            />
                            <span className="text-2xs font-mono text-slate-600 dark:text-slate-300 w-24 text-right">{fmtMoney(subtotal)}</span>
                            <button type="button" onClick={() => removeLinkedPart(lp.partId)} className="text-rose-600 font-bold px-1">×</button>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-2xs text-right font-bold text-slate-700 dark:text-slate-200">
                      Subtotal repuestos vinculados: {fmtMoney(linkedSubtotal)}
                    </p>
                  </div>
                )}

                {/* Si no vincula, permite additionalPartsCost manual */}
                {linkedParts.length === 0 && (
                  <div>
                    <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Repuestos Adicionales ($) — manual, si no vinculas repuestos *
                    </label>
                    <NumericInput
                      required
                      value={suggestData.additionalPartsCost}
                      onChange={(v) => setSuggestData({ ...suggestData, additionalPartsCost: v })}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {/* Preview anterior vs nuevo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold uppercase text-slate-400 mb-1">Anterior</div>
                  <div>Mano de obra: <strong className="font-mono">{fmtMoney(preview.prevLabor)}</strong></div>
                  <div>Repuestos: <strong className="font-mono">{fmtMoney(preview.prevParts)}</strong></div>
                  <div>Total: <strong className="font-mono">{fmtMoney(preview.prevTotal)}</strong></div>
                  <div>Fecha: <strong className="font-mono">{suggestModalOrder.estimatedDelivery}</strong></div>
                </div>
                <div className="p-2.5 rounded bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                  <div className="font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">Nuevo</div>
                  <div>Mano de obra: <strong className="font-mono">{fmtMoney(preview.newLabor)}</strong> <span className="text-slate-400">(+{fmtMoney(preview.addLabor)})</span></div>
                  <div>Repuestos: <strong className="font-mono">{fmtMoney(preview.newParts)}</strong> <span className="text-slate-400">(+{fmtMoney(preview.addParts)})</span></div>
                  <div>Total: <strong className="font-mono">{fmtMoney(preview.newTotal)}</strong></div>
                  <div>Fecha: <strong className="font-mono">{suggestData.newEstimatedDelivery || '—'}</strong></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSuggestModalOrder(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors"
                >
                  Enviar para Autorización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
