import React from 'react';
import { User } from '../types/index.ts';
import { Mail, LogOut, Sun, Moon, Database } from 'lucide-react';

interface NavbarProps {
  activeTab: 'orders' | 'parts' | 'neon' | 'client-view';
  setActiveTab: (tab: 'orders' | 'parts' | 'neon' | 'client-view') => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenNotifications: () => void;
  emailCount: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenNotifications,
  emailCount,
  darkMode,
  setDarkMode,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const canSeeParts = currentUser != null && currentUser.role !== 'client';
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between gap-8">
      
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a 
          href="#home" 
          onClick={(e) => { e.preventDefault(); setActiveTab('orders'); }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
            M
          </span>
          Motilón Motors
        </a>
      </div>

      {/* Zone 2: Navigation Links (single line, concise) */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <button
          onClick={() => setActiveTab('orders')}
          className={`hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
            activeTab === 'orders' 
              ? 'border-amber-500 text-amber-600 dark:text-amber-400' 
              : 'border-transparent'
          }`}
        >
          Mantenimiento
        </button>

        {canSeeParts && (
          <button
            onClick={() => setActiveTab('parts')}
            className={`hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
              activeTab === 'parts' 
                ? 'border-amber-500 text-amber-600 dark:text-amber-400' 
                : 'border-transparent'
            }`}
          >
            Repuestos & Stock
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('neon')}
            className={`hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 flex items-center gap-1 ${
              activeTab === 'neon' 
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                : 'border-transparent'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            Neon Cloud
          </button>
        )}
      </nav>

      {/* Zone 3: Primary Actions & Notifications */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Dark/Light mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Cambiar tema claro/oscuro"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Automated Emails Notification Button */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Ver correos automáticos enviados"
        >
          <Mail className="w-4 h-4" />
          {emailCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full font-mono text-2xs font-bold bg-amber-500 text-slate-950">
              {emailCount}
            </span>
          )}
        </button>

        {/* Role Selector & User Profile */}
        {currentUser ? (
          <div className="flex items-center gap-2">
            {/* User display */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-900 dark:text-white block line-clamp-1 max-w-[120px]">
                  {currentUser.name}
                </span>
                <span className="text-2xs text-amber-600 dark:text-amber-400 font-semibold uppercase">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-amber-500 dark:text-slate-950 rounded-lg hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            Iniciar Sesión
          </button>
        )}

      </div>

    </header>
  );
};
