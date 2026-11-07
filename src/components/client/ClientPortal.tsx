import React, { useState } from 'react';
import { WorkOrder, Motorcycle, PartRequest, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Calendar, 
  History, 
  Package, 
  Wrench, 
  ShieldCheck, 
  Info, 
  Check 
} from 'lucide-react';

interface ClientPortalProps {
  orders: WorkOrder[];
  motorcycles: Motorcycle[];
  partRequests: PartRequest[];
  currentUser: User;
  onRefresh: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  orders,
  motorcycles,
  partRequests,
  currentUser,
  onRefresh,
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter orders and motos belonging to this client
  const myMotos = motorcycles.filter(m => m.clientId === currentUser.id);
  const myOrders = orders.filter(o => 
    o.motorcycle?.clientId === currentUser.id || 
    myMotos.some(m => m.id === o.motorcycleId)
  );
  const myRequests = partRequests.filter(r => r.clientId === currentUser.id);

  const handleAuthorize = async (orderId: number) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.authorizeRepairs(orderId);
      setActionMessage('¡Has autorizado las reparaciones sugeridas! El equipo de Motilón Motors ha sido notificado.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al autorizar reparación');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (orderId: number) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.rejectRepairs(orderId);
      setActionMessage('Has rechazado las reparaciones sugeridas. La orden continuará con los trabajos iniciales pactados.');
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error al rechazar reparación');
    } finally {
      setActionLoading(false);
    }
  };

  // Step indicator helper
  const getStepIndex = (status: string) => {
    switch (status) {
      case 'en curso': return 1;
      case 'esperando por autorización del cliente': return 2;
      case 'autorizado por el cliente': return 2;
      case 'finalizado': return 3;
      case 'entregada': return 4;
      default: return 1;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Messages */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            {actionMessage}
          </span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold ml-2">×</button>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            {actionError}
          </span>
          <button onClick={() => setActionError(null)} className="text-rose-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Portal del Propietario · Motilón Motors
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Bienvenido, <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong>. Consulta el estado de tu vehículo en tiempo real y gestiona tus autorizaciones de servicio.
        </p>
      </div>

      {/* Section 1: Active Work Orders */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-2xs">
          Mantenimiento de tu Vehículo en Tiempo Real
        </h3>

        {myOrders.length === 0 ? (
          <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-400 text-xs">
            No tienes órdenes de mantenimiento activas en el taller.
          </div>
        ) : (
          myOrders.map((order) => {
            const step = getStepIndex(order.status);
            const isWaitingAuth = order.status === 'esperando por autorización del cliente';
            const isAuthorized = order.status === 'autorizado por el cliente';
            const isFinalized = order.status === 'finalizado';
            const isDelivered = order.status === 'entregada';

            return (
              <div 
                key={order.id}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6"
              >
                {/* Moto Hero Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 px-2.5 py-0.5 rounded-md">
                          {order.motorcycle?.plate}
                        </span>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">
                          {order.motorcycle?.brand} {order.motorcycle?.model}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mecánico a cargo: <strong className="text-slate-700 dark:text-slate-300">{order.mechanicName || 'Asignado en taller'}</strong> · Fecha de ingreso: {order.entryDate}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      isWaitingAuth
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                        : isAuthorized
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                        : isFinalized
                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300'
                        : isDelivered
                        ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {order.status}
                    </span>
                    <div className="text-2xs text-slate-400 mt-1 font-mono">
                      Entrega estimada: <strong>{order.estimatedDelivery}</strong>
                    </div>
                  </div>
                </div>

                {/* Real-time Progress Bar */}
                <div className="py-2">
                  <div className="flex items-center justify-between text-2xs font-semibold text-slate-500 mb-2">
                    <span className={step >= 1 ? 'text-amber-600 dark:text-amber-400' : ''}>1. En Taller / Curso</span>
                    <span className={step >= 2 ? 'text-amber-600 dark:text-amber-400' : ''}>2. Diagnóstico & Aprobación</span>
                    <span className={step >= 3 ? 'text-amber-600 dark:text-amber-400' : ''}>3. Reparado / Finalizado</span>
                    <span className={step >= 4 ? 'text-amber-600 dark:text-amber-400' : ''}>4. Entregada al Propietario</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${(step / 4) * 100}%` }}
                    />
                  </div>
                </div>

                {/* INTERACTIVE BANNER: REPARACIONES SUGERIDAS (REQUERIDO) */}
                {isWaitingAuth && (
                  <div className="p-5 rounded-xl border-2 border-amber-400 dark:border-amber-500/80 bg-amber-50/60 dark:bg-amber-950/30 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Atención Requerida: Reparaciones Sugeridas por el Mecánico
                        </h4>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                          Durante el diagnóstico de tu moto, el mecánico <strong className="text-slate-900 dark:text-white">{order.mechanicName}</strong> identificó componentes adicionales que requieren intervención:
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-900/60 text-xs space-y-2">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        Detalle del Trabajo Sugerido:
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 italic">
                        "{order.suggestedRepairs || 'Revisión técnica de componentes con desgaste'}"
                      </p>
                      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-slate-500">Mano de Obra: ${order.laborCost.toLocaleString('es-CO')} · Repuestos: ${order.partsCost.toLocaleString('es-CO')}</span>
                        <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                          Total Presupuestado: ${order.totalEstimate.toLocaleString('es-CO')} COP
                        </span>
                      </div>
                    </div>

                    {/* INTERACTIVE BUTTONS: AUTORIZAR O RECHAZAR */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => handleReject(order.id)}
                        disabled={actionLoading}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Rechazar Reparación Sugerida
                      </button>

                      <button
                        onClick={() => handleAuthorize(order.id)}
                        disabled={actionLoading}
                        className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Autorizar Reparación Sugerida
                      </button>
                    </div>
                  </div>
                )}

                {/* State notification if already authorized */}
                {isAuthorized && (
                  <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
                    <span>
                      Has <strong>autorizado</strong> los trabajos sugeridos. El mecánico está ejecutando el mantenimiento según lo acordado.
                    </span>
                  </div>
                )}

                {/* State notification if finalized */}
                {isFinalized && (
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600" />
                      <span>
                        <strong>¡Mantenimiento Finalizado!</strong> Tu motocicleta se encuentra lista para recoger en las instalaciones de Motilón Motors.
                      </span>
                    </div>
                  </div>
                )}

                {/* BITÁCORA DE APLAZAMIENTOS TRANSPARENTE */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-amber-500" />
                      Bitácora de Novedades y Prórrogas de Tiempo ({order.postponements?.length || 0})
                    </h5>
                    <span className="text-2xs text-slate-400">
                      Trazabilidad total garantizada
                    </span>
                  </div>

                  {(!order.postponements || order.postponements.length === 0) ? (
                    <div className="text-xs text-slate-400 italic bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-lg">
                      No se han registrado prórrogas. El servicio marcha de acuerdo con el cronograma inicial.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {order.postponements.map((log, idx) => (
                        <div 
                          key={log.id}
                          className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-2xs text-slate-500 gap-1">
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              Novedad #{order.postponements!.length - idx} · Técnico: {log.mechanicName}
                            </span>
                            <span className="font-mono tabular-nums text-slate-400">
                              Fecha y hora de la novedad: {new Date(log.createdAt).toLocaleString('es-CO')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-2xs font-mono">
                            <span className="text-slate-500">Fecha anterior pactada: {log.previousDate}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="font-bold text-slate-900 dark:text-white">Nueva fecha estimada: {log.newDate}</span>
                          </div>

                          <div className="text-slate-700 dark:text-slate-300 text-xs bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200/80 dark:border-slate-800 leading-relaxed">
                            <strong>Justificación del taller:</strong> {log.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Section 2: Mis Pedidos de Repuestos */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-2xs flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-500" />
          Mis Repuestos Solicitados y Estado de Entrega
        </h3>

        {myRequests.length === 0 ? (
          <div className="p-8 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-400 text-xs">
            No tienes pedidos de repuestos individuales registrados actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myRequests.map((req) => (
              <div 
                key={req.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-2xs text-slate-400 block">{req.partCode}</span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">{req.partName}</h5>
                  </div>
                  <span className={`inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-sm ${
                    req.status === 'en camino' 
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                      : req.status === 'en espera por stock'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : req.status === 'listo para entrega'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {req.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Cantidad: <strong className="text-slate-800 dark:text-slate-200 font-mono">{req.quantity}</strong></span>
                  <span>Total: <strong className="text-slate-900 dark:text-white font-mono">${(req.quantity * req.unitPrice).toLocaleString('es-CO')} COP</strong></span>
                </div>

                {req.status === 'listo para entrega' && (
                  <div className="text-2xs bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ¡Tu repuesto está listo en el taller para retiro y entrega!
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
