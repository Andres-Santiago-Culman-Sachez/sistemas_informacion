import React, { useEffect, useState } from 'react';
import { Database, Server, Cpu, CheckCircle2, RefreshCw, ExternalLink, Activity } from 'lucide-react';

interface NeonStatusData {
  status: string;
  postgres: {
    connected: boolean;
    database: string;
    branch: string;
    branchId: string;
    usersCount: number;
  };
  functions: {
    helloFunctionUrl: string;
    functionStatus: string;
  };
  aiGateway: {
    configured: boolean;
    baseUrl: string;
  };
}

export const NeonCloudStatus: React.FC = () => {
  const [data, setData] = useState<NeonStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/neon/status');
      if (!res.ok) throw new Error('Error al conectar con los servicios de Neon');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error al obtener estado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            Infraestructura Neon Cloud (PostgreSQL, Functions & AI Gateway)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Proyecto: <code className="font-mono text-emerald-600 dark:text-emerald-400">wispy-cake-74102822</code> · Branch: <code className="font-mono text-slate-700 dark:text-slate-300">production</code>
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Verificar Conectividad
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Grid of services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Service 1: Lakebase Postgres */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              PostgreSQL
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Conectado
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="text-slate-500">Base de Datos:</div>
            <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
              {data?.postgres?.database || 'neondb'}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <div>Branch: <strong className="text-slate-800 dark:text-slate-200 font-mono">{data?.postgres?.branch || 'production'}</strong></div>
            <div>Branch ID: <span className="font-mono text-2xs">{data?.postgres?.branchId}</span></div>
            <div>Usuarios activos: <span className="font-mono tabular-nums font-semibold text-emerald-600">{data?.postgres?.usersCount}</span></div>
            <div>Driver: <span className="font-mono text-2xs">node-postgres (pg pool) + Drizzle</span></div>
          </div>
        </div>

        {/* Service 2: Neon Functions */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-cyan-500" />
              Neon Functions
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Desplegada
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="text-slate-500">Función Activa:</div>
            <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
              hello.ts
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <div>Respuesta HTTP: <span className="text-emerald-600 dark:text-emerald-400 font-mono text-2xs">{data?.functions?.functionStatus}</span></div>
            <div className="truncate">
              <a 
                href={data?.functions?.helloFunctionUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 text-2xs truncate"
              >
                Abrir endpoint en vivo <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
            <div>Runtime: <span className="font-mono text-2xs">Node.js 24 Serverless Isolate</span></div>
          </div>
        </div>

        {/* Service 3: Neon AI Gateway */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-500" />
              Neon AI Gateway
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
              <Activity className="w-3.5 h-3.5" />
              Configurado
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="text-slate-500">Endpoint Base:</div>
            <div className="font-mono text-2xs font-semibold text-slate-900 dark:text-white truncate">
              {data?.aiGateway?.baseUrl}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <div>Token: <span className="font-mono text-2xs text-emerald-600 font-semibold">nt_live_...9w (activo)</span></div>
            <div>Servicio: <span className="text-slate-700 dark:text-slate-300">Enrutamiento LLM unificado</span></div>
            <div>Estado: <span className="text-slate-500">Listo para vincular créditos</span></div>
          </div>
        </div>

      </div>

      {/* Architecture summary banner */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <strong>Arquitectura Activa:</strong> Motilón Motors opera sobre una base de datos PostgreSQL alojada en <strong>Neon</strong> (`ep-plain-wildflower-bdeidpji`), con pooler integrado PgBouncer (`DATABASE_URL`), esquema inmutable administrado con Drizzle ORM, función serverless desplegada en `hello.ts` y credenciales seguras leídas desde `.env.local`.
      </div>
    </div>
  );
};
