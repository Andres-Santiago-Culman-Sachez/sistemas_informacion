import React, { useEffect, useState } from 'react';
import { WorkOrder, Motorcycle, User, MotorcycleStatus, RepairSuggestion } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { NumericInput } from '../NumericInput.tsx';
import {
  Plus,
  History,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

const fmtMoney = (n: number) => `$${(n ?? 0).toLocaleString('es-CO')} COP`;

const getSuggestions = (o: WorkOrder): RepairSuggestion[] => o.repairSuggestions ?? [];
const hasPending = (o: WorkOrder) => getSuggestions(o).some((s) => s.status === 'pendiente');
const pendingCount = (o: WorkOrder) => getSuggestions(o).filter((s) => s.status === 'pendiente').length;

interface AdminDashboardProps {
  orders: WorkOrder[];
  motorcycles: Motorcycle[];
  mechanics: User[];
  currentUser: User;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
  motorcycles,
  mechanics,
  currentUser,
  onRefresh,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [expandedOrderLogs, setExpandedOrderLogs] = useState<number | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [clients, setClients] = useState<User[]>([]);

  // Toggle moto existente / moto nueva
  const [motoMode, setMotoMode] = useState<'existente' | 'nueva'>('existente');

  // Form for new order (B1: todos los campos obligatorios, B9: suggestedRepairs opcional)
  const [newOrder, setNewOrder] = useState({
    motorcycleId: '',
    clientId: '',
    mechanicId: '',
    initialDiagnosis: '',
    estimatedDelivery: '',
    laborCost: '',
    partsCost: '',
    suggestedRepairs: '',
  });
  const [newMotorcycle, setNewMotorcycle] = useState({
    plate: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    mileage: '',
    clientId: '',
  });

  useEffect(() => {
    const loadClients = async () => {
      try {
        const list = await api.getUsers('client');
        setClients(list);
      } catch {
        // si falla, el select quedará vacío y el form mostrará required
      }
    };
    loadClients();
  }, []);

  const resetOrderForm = () => {
    setNewOrder({
      motorcycleId: '',
      clientId: '',
      mechanicId: '',
      initialDiagnosis: '',
      estimatedDelivery: '',
      laborCost: '',
      partsCost: '',
      suggestedRepairs: '',
    });
    setNewMotorcycle({ plate: '', brand: '', model: '', year: '', color: '', mileage: '', clientId: '' });
    setMotoMode('existente');
  };

  const handleDeliverOrder = async (orderId: number) => {
    setActionError(null);
    try {
      // B14 opción A: entregar solo sin pendientes (backend 409 si hay)
      await api.deliverOrder(orderId);
      setActionMessage('¡Motocicleta entregada formalmente al cliente!');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al entregar motocicleta');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const base = {
        mechanicId: Number(newOrder.mechanicId),
        initialDiagnosis: newOrder.initialDiagnosis,
        estimatedDelivery: newOrder.estimatedDelivery,
        laborCost: Number(newOrder.laborCost || 0),
        partsCost: Number(newOrder.partsCost || 0),
        // B9: suggestedRepairs NO obligatorio
        suggestedRepairs: newOrder.suggestedRepairs?.trim() || undefined,
      };
      let payload: any;
      if (motoMode === 'nueva') {
        payload = {
          ...base,
          clientId: Number(newMotorcycle.clientId),
          newMotorcycle: {
            plate: newMotorcycle.plate.trim(),
            brand: newMotorcycle.brand.trim(),
            model: newMotorcycle.model.trim(),
            year: Number(newMotorcycle.year || 0),
            color: newMotorcycle.color.trim(),
            mileage: Number(newMotorcycle.mileage || 0),
            clientId: Number(newMotorcycle.clientId),
          },
        };
      } else {
        payload = {
          ...base,
          motorcycleId: Number(newOrder.motorcycleId),
          clientId: Number(newOrder.clientId),
        };
      }
      await api.createWorkOrder(payload);
      setShowNewOrderModal(false);
      resetOrderForm();
      setActionMessage('Orden de mantenimiento creada exitosamente');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al crear orden');
    }
  };

  const statuses = [
    { id: 'todos', label: 'Todas las Órdenes', count: orders.length },
    { id: 'en curso', label: 'En Curso', count: orders.filter(o => o.status === 'en curso').length },
    { id: 'esperando por autorización del cliente', label: 'Esperando Autorización', count: orders.filter(o => o.status === 'esperando por autorización del cliente').length },
    { id: 'autorizado por el cliente', label: 'Autorizado', count: orders.filter(o => o.status === 'autorizado por el cliente').length },
    { id: 'finalizado', label: 'Finalizado', count: orders.filter(o => o.status === 'finalizado').length },
    { id: 'entregada', label: 'Entregada', count: orders.filter(o => o.status === 'entregada').length },
  ];

  const filteredOrders = filterStatus === 'todos'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const getStatusBadge = (status: MotorcycleStatus) => {
    switch (status) {
      case 'en curso':
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-0.5 rounded-sm font-semibold text-2xs uppercase">En Curso</span>;
      case 'esperando por autorización del cliente':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-0.5 rounded-sm font-semibold text-2xs uppercase">Esperando Autorización</span>;
      case 'autorizado por el cliente':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-sm font-semibold text-2xs uppercase">Autorizado Cliente</span>;
      case 'finalizado':
        return <span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2.5 py-0.5 rounded-sm font-semibold text-2xs uppercase">Finalizado</span>;
      case 'entregada':
        return <span className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-0.5 rounded-sm font-semibold text-2xs uppercase">Entregada</span>;
    }
  };

  const suggestionStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      aprobada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      rechazada: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
      cancelada: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded-sm font-semibold text-2xs uppercase ${map[status] ?? 'bg-slate-200 text-slate-700'}`}>
        {status}
      </span>
    );
  };

  const renderSuggestion = (s: RepairSuggestion) => (
    <div key={s.id} className="p-3 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 text-xs space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-800 dark:text-slate-200">Sugerencia #{s.id} {s.mechanicName ? `· ${s.mechanicName}` : ''}</span>
        {suggestionStatusBadge(s.status)}
      </div>
      <p className="text-slate-700 dark:text-slate-300 italic">"{s.description}"</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
        <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
          <div className="font-bold uppercase text-slate-400 mb-1">Anterior</div>
          <div>Mano de obra: <strong className="font-mono">{fmtMoney(s.previousLaborCost)}</strong></div>
          <div>Repuestos: <strong className="font-mono">{fmtMoney(s.previousPartsCost)}</strong></div>
          <div>Total: <strong className="font-mono">{fmtMoney(s.previousTotalEstimate)}</strong></div>
          <div>Fecha: <strong className="font-mono">{s.previousEstimatedDelivery}</strong></div>
        </div>
        <div className="p-2 rounded bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/60">
          <div className="font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">Nuevo (si se aprueba)</div>
          <div>Mano de obra: <strong className="font-mono">{fmtMoney(s.newLaborCost)}</strong> <span className="text-slate-400">(+{fmtMoney(s.additionalLaborCost)})</span></div>
          <div>Repuestos: <strong className="font-mono">{fmtMoney(s.newPartsCost)}</strong> <span className="text-slate-400">(+{fmtMoney(s.additionalPartsCost)})</span></div>
          <div>Total: <strong className="font-mono">{fmtMoney(s.newTotalEstimate)}</strong></div>
          <div>Fecha: <strong className="font-mono">{s.newEstimatedDelivery}</strong></div>
        </div>
      </div>
      {s.parts && s.parts.length > 0 && (
        <ul className="text-2xs text-slate-600 dark:text-slate-400 list-disc list-inside">
          {s.parts.map((p, i) => (
            <li key={`${p.partId}-${i}`}>
              {p.partCode ? `${p.partCode} - ` : ''}{p.partName ?? ''} × {p.quantity}
              {p.unitPrice !== undefined ? ` · ${fmtMoney(p.unitPrice)} c/u` : ''}
              {p.subtotal !== undefined ? ` = ${fmtMoney(p.subtotal)}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Tablero de Mantenimiento - Panel Administrador
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supervisión integral de motos, bitácoras de prórrogas y autorización exclusiva de entrega final
          </p>
        </div>
        {/* Bloquea acciones en entregada: el botón de nueva orden sigue disponible,
            pero las acciones por orden se bloquean abajo */}
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nueva Orden de Trabajo
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {statuses.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterStatus(s.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filterStatus === s.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{s.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-2xs ${
              filterStatus === s.id
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {s.count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-400 text-xs">
            No hay órdenes de mantenimiento en el estado seleccionado.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const hasPostponements = order.postponements && order.postponements.length > 0;
            const isExpanded = expandedOrderLogs === order.id;
            const suggestions = getSuggestions(order);
            const isDelivered = order.status === 'entregada';
            const pendings = pendingCount(order);
            const canDeliver = order.status === 'finalizado' && currentUser.role === 'admin' && !isDelivered && pendings === 0;

            return (
              <div
                key={order.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                      #{order.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {order.motorcycle?.plate || 'SIN PLACA'}
                        </span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {order.motorcycle?.brand} {order.motorcycle?.model}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Propietario: <strong className="text-slate-700 dark:text-slate-300">{order.motorcycle?.clientName || 'Cliente'}</strong> · Ingreso: {order.entryDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}

                    {/* Botón Entregar solo si finalizado y admin, deshabilitado si entregada */}
                    {order.status === 'finalizado' && currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleDeliverOrder(order.id)}
                        disabled={!canDeliver}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={pendings > 0 ? 'No se puede entregar: existen sugerencias pendientes' : 'Solo el Administrador tiene permiso para marcar como entregada'}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Entregar Moto al Cliente (Admin)
                      </button>
                    )}
                  </div>
                </div>

                {isDelivered && (
                  <div className="text-2xs text-slate-500 bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                    Orden entregada: acciones bloqueadas.
                  </div>
                )}
                {!isDelivered && pendings > 0 && (
                  <div className="text-2xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Existen {pendings} sugerencia(s) pendiente(s). No se puede entregar hasta que el cliente las responda (B14 opción A).
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Diagnóstico Inicial:</span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {order.initialDiagnosis}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Mecánico Asignado:</span>
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                      <UserCheck className="w-4 h-4 text-amber-500" />
                      {order.mechanicName || 'No asignado'}
                    </div>
                    {order.suggestedRepairs && (
                      <div className="mt-2 text-2xs text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900">
                        <strong>Reparaciones sugeridas (orden):</strong> {order.suggestedRepairs}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 md:text-right">
                    <div className="text-slate-500">
                      Fecha Estimada de Entrega:
                      <span className="font-mono font-bold text-slate-900 dark:text-white ml-1.5 text-sm">
                        {order.estimatedDelivery}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Total Estimado:
                      <span className="font-mono font-bold text-slate-900 dark:text-white ml-1.5 text-sm">
                        ${order.totalEstimate.toLocaleString('es-CO')} COP
                      </span>
                    </div>
                    <div className="text-2xs text-slate-400">
                      Mano de obra: ${order.laborCost.toLocaleString('es-CO')} · Repuestos: ${order.partsCost.toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>

                {/* Sugerencias de reparación */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Sugerencias de reparación ({suggestions.length})
                  </h4>
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin sugerencias registradas para esta orden.</p>
                  ) : (
                    <div className="space-y-2">
                      {suggestions.map(renderSuggestion)}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bitácora de Aplazamientos de Tiempo ({order.postponements?.length || 0})
                    </span>
                    {hasPostponements && (
                      <span className="text-2xs text-amber-600 dark:text-amber-400 font-mono">
                        · Última novedad registrada
                      </span>
                    )}
                  </div>

                  {hasPostponements ? (
                    <button
                      onClick={() => setExpandedOrderLogs(isExpanded ? null : order.id)}
                      className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline flex items-center gap-1"
                    >
                      {isExpanded ? 'Ocultar bitácora' : 'Ver historial de prórrogas'}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <span className="text-2xs text-slate-400 italic">
                      Sin aplazamientos registrados
                    </span>
                  )}
                </div>

                {isExpanded && order.postponements && (
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-2xs">
                      Historial Cronológico de Novedades y Justificaciones
                    </h4>
                    <div className="space-y-3">
                      {order.postponements.map((log, idx) => (
                        <div
                          key={log.id}
                          className="p-3 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-2xs text-slate-500 gap-1">
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              Prórroga #{order.postponements!.length - idx} por {log.mechanicName}
                            </span>
                            <span className="font-mono tabular-nums text-slate-400">
                              Fecha de la novedad: {new Date(log.createdAt).toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-2xs font-mono">
                            <span className="text-slate-400">Fecha anterior: {log.previousDate}</span>
                            <span className="text-slate-300">➔</span>
                            <span className="font-bold text-slate-900 dark:text-white">Nueva fecha: {log.newDate}</span>
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800">
                            <strong>Justificación técnica:</strong> {log.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Modal: New Work Order */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Registrar Orden de Mantenimiento
            </h3>
            {/* Toggle Moto existente / Registrar moto nueva */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMotoMode('existente')}
                className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${motoMode === 'existente' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
              >
                Moto existente
              </button>
              <button
                type="button"
                onClick={() => setMotoMode('nueva')}
                className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${motoMode === 'nueva' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
              >
                Registrar moto nueva
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              {motoMode === 'existente' ? (
                <>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Motocicleta en Taller *
                    </label>
                    <select
                      required
                      value={newOrder.motorcycleId}
                      onChange={(e) => {
                        const moto = motorcycles.find(m => String(m.id) === e.target.value);
                        setNewOrder({ ...newOrder, motorcycleId: e.target.value, clientId: moto ? String(moto.clientId) : '' });
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="">Seleccione motocicleta...</option>
                      {motorcycles.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.plate} - {m.brand} {m.model} ({m.clientName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Cliente (dueño de la moto) *
                    </label>
                    <select
                      required
                      value={newOrder.clientId}
                      onChange={(e) => setNewOrder({ ...newOrder, clientId: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="">Seleccione cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                      {clients.length === 0 && motorcycles.map(m => (
                        <option key={m.clientId} value={m.clientId}>{m.clientName}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="space-y-3.5 p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
                  <p className="text-2xs font-bold uppercase text-amber-700 dark:text-amber-300">Datos de la motocicleta nueva (todos obligatorios)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Placa *</label>
                      <input type="text" required value={newMotorcycle.plate} onChange={(e) => setNewMotorcycle({ ...newMotorcycle, plate: e.target.value })} placeholder="ABC-123" className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono uppercase" />
                    </div>
                    <div>
                      <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Marca *</label>
                      <input type="text" required value={newMotorcycle.brand} onChange={(e) => setNewMotorcycle({ ...newMotorcycle, brand: e.target.value })} placeholder="Yamaha" className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Modelo *</label>
                      <input type="text" required value={newMotorcycle.model} onChange={(e) => setNewMotorcycle({ ...newMotorcycle, model: e.target.value })} placeholder="FZ-S" className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Año *</label>
                      <NumericInput required value={newMotorcycle.year} onChange={(v) => setNewMotorcycle({ ...newMotorcycle, year: v })} placeholder="2024" />
                    </div>
                    <div>
                      <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Color *</label>
                      <input type="text" required value={newMotorcycle.color} onChange={(e) => setNewMotorcycle({ ...newMotorcycle, color: e.target.value })} placeholder="Rojo" className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Kilometraje *</label>
                      <NumericInput required value={newMotorcycle.mileage} onChange={(v) => setNewMotorcycle({ ...newMotorcycle, mileage: v })} placeholder="15000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Cliente propietario *</label>
                    <select required value={newMotorcycle.clientId} onChange={(e) => setNewMotorcycle({ ...newMotorcycle, clientId: e.target.value })} className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                      <option value="">Seleccione cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Mecánico Asignado *
                </label>
                <select
                  required
                  value={newOrder.mechanicId}
                  onChange={(e) => setNewOrder({ ...newOrder, mechanicId: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="">Seleccione mecánico...</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Diagnóstico Inicial del Taller *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newOrder.initialDiagnosis}
                  onChange={(e) => setNewOrder({ ...newOrder, initialDiagnosis: e.target.value })}
                  placeholder="Motivo de ingreso, ruidos, kilometraje, inspección visual..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Fecha Estimada Entrega *
                  </label>
                  <input
                    type="date"
                    required
                    value={newOrder.estimatedDelivery}
                    onChange={(e) => setNewOrder({ ...newOrder, estimatedDelivery: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Costo Mano de Obra ($) *
                  </label>
                  <NumericInput
                    required
                    value={newOrder.laborCost}
                    onChange={(v) => setNewOrder({ ...newOrder, laborCost: v })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Costo Repuestos ($) *
                </label>
                <NumericInput
                  required
                  value={newOrder.partsCost}
                  onChange={(v) => setNewOrder({ ...newOrder, partsCost: v })}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Reparaciones Sugeridas (opcional)
                </label>
                <textarea
                  rows={2}
                  value={newOrder.suggestedRepairs}
                  onChange={(e) => setNewOrder({ ...newOrder, suggestedRepairs: e.target.value })}
                  placeholder="Opcional (B9): texto libre de reparaciones sugeridas al crear la orden..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowNewOrderModal(false); resetOrderForm(); }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors"
                >
                  Crear Orden de Mantenimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
