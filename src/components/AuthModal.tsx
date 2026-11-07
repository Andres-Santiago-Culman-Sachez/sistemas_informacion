import React, { useState } from 'react';
import { User, UserRole } from '../types/index.ts';
import { api } from '../services/api.ts';
import { Lock, Mail, Key, ShieldCheck, User as UserIcon, Wrench, Crown, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await api.login(email, password);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setError(null);
    try {
      const { user } = await api.login(demoEmail, demoPass);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Ingreso al Sistema Motilón Motors
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Autenticación por usuario y contraseña con roles diferenciados
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@motilonmotors.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? 'Validando credenciales...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Quick Demo Switcher Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400 text-center">
            Acceso Rápido para Pruebas del Prototipo
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@motilonmotors.com', 'admin123')}
              className="p-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-left transition-colors flex flex-col items-center justify-center text-center gap-1"
            >
              <Crown className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-2xs leading-tight">Administrador</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('mecanico@motilonmotors.com', 'mecanico123')}
              className="p-2 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-left transition-colors flex flex-col items-center justify-center text-center gap-1"
            >
              <Wrench className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-2xs leading-tight">Mecánico Senior</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('cliente@motilonmotors.com', 'cliente123')}
              className="p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-left transition-colors flex flex-col items-center justify-center text-center gap-1"
            >
              <UserIcon className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-2xs leading-tight">Cliente Propietario</span>
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-2xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Continuar explorando sin iniciar sesión
          </button>
        </div>

      </div>
    </div>
  );
};
