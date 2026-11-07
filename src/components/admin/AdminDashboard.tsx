import React, { useState } from 'react';
import { WorkOrder, Motorcycle, User, MotorcycleStatus } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Plus, 
  History, 
  Check, 
  Lock, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  UserCheck 
} from 'lucide-react';

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

  // Form for new order
  const [newOrder, setNewOrder] = useState({
    motorcycleId: '',
    mechanicId: '',
    initialDiagnosis: '',
    estimatedDelivery: '',
    laborCost: 0,
    partsCost: 0,
    suggestedRepairs: '',
  });

  const handleDeliverOrder = async (orderId: number) => {
    setActionError(null);
    try {
      await api.deliverOrder(orderId, currentUser.role);
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
      await api.createWorkOrder({
        motorcycleId: Number(newOrder.motorcycleId),
        mechanicId: newOrder.mechanicId ? Number(newOrder.mechanicId) : undefined,
        initialDiagnosis: newOrder.initialDiagnosis,
        estimatedDelivery: newOrder.estimatedDelivery,
        laborCost: Number(newOrder.laborCost) || 0,
        partsCost: Number(newOrder.partsCost) || 0,
        suggestedRepairs: newOrder.suggestedRepairs,
      });
      setShowNewOrderModal(false);
      setNewOrder({
        motorcycleId: '',
        mechanicId: '',
        initialDiagnosis: '',
        estimatedDelivery: '',
        laborCost: 0,
        partsCost: 0,
        suggestedRepairs: '',
      });
      setActionMessage('Orden de mantenimiento creada exitosamente');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al crear orden');
    }
  };

  // Status mapping
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

      {/* Header & New Order Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Tablero de Mantenimiento - Panel Administrador
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supervisión integral de motos, bitácoras de prórrogas y autorización exclusiva de entrega final
          </p>
        </div>
        <button
          onClick={() => setShowNewOrderModal(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden de Trabajo
        </button>
      </div>

      {/* Segmented Status Filters */}
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

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-400 text-xs">
            No hay órdenes de mantenimiento en el estado seleccionado.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const hasPostponements = order.postponements && order.postponements.length > 0;
            const isExpanded = expandedOrderLogs === order.id;

            return (
              <div
                key={order.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4"
              >
                {/* Header row */}
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

                    {/* ADMIN EXCLUSIVE ACTION BUTTON */}
                    {order.status === 'finalizado' && (
                      <button
                        onClick={() => handleDeliverOrder(order.id)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                        title="Solo el Administrador tiene permiso para marcar como entregada"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Entregar Moto al Cliente (Admin)
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
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
                        <strong>Reparaciones sugeridas:</strong> {order.suggestedRepairs}
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

                {/* Bitácora de prórrogas toggle */}
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

                {/* Expanded Bitácora timeline */}
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full shadow-2xl p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Registrar Orden de Mantenimiento
            </h3>
            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Motocicleta en Taller *
                </label>
                <select
                  required
                  value={newOrder.motorcycleId}
                  onChange={(e) => setNewOrder({ ...newOrder, motorcycleId: e.target.value })}
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
                  Mecánico Asignado
                </label>
                <select
                  value={newOrder.mechanicId}
                  onChange={(e) => setNewOrder({ ...newOrder, mechanicId: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="">Sin mecánico asignado aún</option>
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
                    Costo Mano de Obra ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newOrder.laborCost}
                    onChange={(e) => setNewOrder({ ...newOrder, laborCost: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
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
