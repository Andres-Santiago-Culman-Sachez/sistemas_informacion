import React, { useState } from 'react';
import { WorkOrder, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { 
  Wrench, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Plus 
} from 'lucide-react';

interface MechanicDashboardProps {
  orders: WorkOrder[];
  currentUser: User;
  onRefresh: () => void;
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

  // Forms
  const [postponeData, setPostponeData] = useState({
    newDate: '',
    reason: '',
  });

  const [suggestData, setSuggestData] = useState({
    repairs: '',
    laborCost: 0,
    partsCost: 0,
  });

  // Filter to show orders assigned to this mechanic or unassigned
  const myOrders = orders.filter(o => !o.mechanicId || o.mechanicId === currentUser.id);

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
    setActionError(null);

    try {
      await api.suggestRepairs(
        suggestModalOrder.id,
        suggestData.repairs,
        Number(suggestData.laborCost) || 0,
        Number(suggestData.partsCost) || 0
      );
      setSuggestModalOrder(null);
      setSuggestData({ repairs: '', laborCost: 0, partsCost: 0 });
      setActionMessage('Reparaciones enviadas a revisión del cliente (notificado por correo).');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al solicitar autorización');
    }
  };

  const handleFinishWork = async (orderId: number) => {
    setActionError(null);
    try {
      await api.updateOrderStatus(orderId, 'finalizado', currentUser.role, currentUser.name);
      setActionMessage('Trabajo marcado como FINALIZADO. Se notificó al cliente para retirar su moto.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al finalizar trabajo');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Alert Messages */}
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

      {/* Mechanic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Motos en Taller Asignadas a Mí
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Técnico: <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong> · Gestiona diagnósticos, aplaza tiempos con justificación y solicita repuestos
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Total asignadas activas: <span className="font-mono font-bold text-amber-600">{myOrders.length}</span>
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-4">
        {myOrders.length === 0 ? (
          <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-400 text-xs">
            No tienes motocicletas asignadas en este momento.
          </div>
        ) : (
          myOrders.map((order) => {
            const hasPostponements = order.postponements && order.postponements.length > 0;
            const isExpanded = expandedLogs === order.id;

            return (
              <div
                key={order.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4"
              >
                {/* Title */}
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
                        : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-slate-400 block font-semibold text-2xs uppercase">Diagnóstico Inicial:</span>
                    <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
                      {order.initialDiagnosis}
                    </p>
                    {order.suggestedRepairs && (
                      <div className="mt-2 text-2xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900">
                        <strong>Reparaciones adicionales cotizadas:</strong> {order.suggestedRepairs}
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

                {/* Mechanic Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {/* APLAZAR TIEMPO DE ENTREGA (CON JUSTIFICACIÓN) */}
                    <button
                      onClick={() => {
                        setPostponeModalOrder(order);
                        setPostponeData({ newDate: order.estimatedDelivery, reason: '' });
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Aplazar Entrega (Justificar)
                    </button>

                    {/* SUGERIR REPARACIONES ADICIONALES */}
                    <button
                      onClick={() => {
                        setSuggestModalOrder(order);
                        setSuggestData({ repairs: '', laborCost: 50000, partsCost: 0 });
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Sugerir Reparaciones / Cotizar
                    </button>

                    {/* FINALIZAR TRABAJO */}
                    {order.status !== 'finalizado' && order.status !== 'entregada' && (
                      <button
                        onClick={() => handleFinishWork(order.id)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Finalizar Trabajo
                      </button>
                    )}
                  </div>

                  {/* Toggle Bitácora */}
                  <button
                    onClick={() => setExpandedLogs(isExpanded ? null : order.id)}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    Bitácora ({order.postponements?.length || 0})
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Expanded Postponements History */}
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
                  placeholder="Detalla la razón exacta de la demora (ej: tiempo de secado de pintura de motor, demora de importador de retenes, hallazgo de fisura en basculante)..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <p className="text-2xs text-slate-400 mt-1">
                  Esta justificación y la fecha de la novedad quedarán registradas en la bitácora visible para el administrador y cliente.
                </p>
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
      {suggestModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full shadow-2xl p-6">
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
                  value={suggestData.repairs}
                  onChange={(e) => setSuggestData({ ...suggestData, repairs: e.target.value })}
                  placeholder="Ej: Se detectó fuga en retén de barras de suspensión y desgaste límite en pastillas traseras..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Mano de Obra Adicional ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={suggestData.laborCost}
                    onChange={(e) => setSuggestData({ ...suggestData, laborCost: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Repuestos Adicionales ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={suggestData.partsCost}
                    onChange={(e) => setSuggestData({ ...suggestData, partsCost: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
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
