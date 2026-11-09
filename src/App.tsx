/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User, WorkOrder, Motorcycle, PartRequest, EmailLog } from './types/index.ts';
import { api, getToken, clearToken } from './services/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { MechanicDashboard } from './components/mechanic/MechanicDashboard.tsx';
import { ClientPortal } from './components/client/ClientPortal.tsx';
import { PartsModule } from './components/parts/PartsModule.tsx';
import { NeonCloudStatus } from './components/NeonCloudStatus.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import heroImage from './assets/images/motilon_workshop_hero_1794080587609.jpg';
import { 
  Wrench, 
  Package, 
  Database, 
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState<'orders' | 'parts' | 'neon' | 'client-view'>('orders');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Sync dark class on document root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordData, motoData, usersData, reqData, emailData] = await Promise.all([
        api.getWorkOrders(),
        api.getMotorcycles(),
        api.getUsers(),
        api.getPartRequests(),
        api.getEmailLogs(),
      ]);
      setOrders(ordData);
      setMotorcycles(motoData);
      setMechanics(usersData.filter(u => u.role === 'mechanic'));
      setPartRequests(reqData);
      setEmailLogs(emailData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore session (TTL 10min, no refresh) from stored token.
  useEffect(() => {
    const restore = async () => {
      if (getToken()) {
        try {
          const { user } = await api.me();
          setCurrentUser(user);
        } catch {
          clearToken();
          setCurrentUser(null);
        } finally {
          setSessionChecked(true);
        }
      } else {
        setSessionChecked(true);
      }
    };
    restore();
  }, []);

  // Mandatory login when there is no session.
  useEffect(() => {
    if (sessionChecked && !currentUser) {
      setIsAuthModalOpen(true);
    }
  }, [sessionChecked, currentUser]);

  // Load data only once a user is authenticated.
  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser, loadAllData]);

  // Role-based tab guards: Neon only for admin, Parts not for clients.
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'admin' && activeTab === 'neon') {
      setActiveTab('orders');
    }
    if (currentUser.role === 'client' && activeTab === 'parts') {
      setActiveTab('orders');
    }
  }, [currentUser, activeTab]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      clearToken();
    } finally {
      setCurrentUser(null);
      setEmailLogs([]);
      setOrders([]);
      setMotorcycles([]);
      setMechanics([]);
      setPartRequests([]);
      setActiveTab('orders');
      setIsNotificationsOpen(false);
    }
  };

  const unreadCount = emailLogs.filter((e) => !e.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      
      {/* 3-Zone Top Bar Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        emailCount={unreadCount}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Hero Workshop Banner (only when viewing main orders) */}
      {activeTab === 'orders' && (
        <div className="relative border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-25 dark:opacity-30">
            <img 
              src={heroImage} 
              alt="Taller Motilón Motors" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-amber-400">
                <span>Taller & Repuestos Especializados</span>
                <span>·</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Database className="w-3 h-3" /> Neon Postgres Online
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Motilón Motors · Gestión Integral
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Seguimiento en vivo del mantenimiento de motocicletas, control estricto de entregas, catálogo de repuestos con kardex y autorización interactiva transparente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {!sessionChecked ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Verificando sesión...</span>
          </div>
        ) : loading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Cargando datos desde Neon Cloud PostgreSQL...</span>
          </div>
        ) : (
          <>
            {/* TAB: MANTENIMIENTO (Vistas por rol) */}
            {activeTab === 'orders' && (
              <>
                {currentUser?.role === 'admin' && (
                  <AdminDashboard
                    orders={orders}
                    motorcycles={motorcycles}
                    mechanics={mechanics}
                    currentUser={currentUser}
                    onRefresh={loadAllData}
                  />
                )}

                {currentUser?.role === 'mechanic' && (
                  <MechanicDashboard
                    orders={orders}
                    currentUser={currentUser}
                    onRefresh={loadAllData}
                  />
                )}

                {currentUser?.role === 'client' && (
                  <ClientPortal
                    orders={orders}
                    motorcycles={motorcycles}
                    partRequests={partRequests}
                    currentUser={currentUser}
                    onRefresh={loadAllData}
                  />
                )}

                {!currentUser && (
                  <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs max-w-lg mx-auto space-y-4">
                    <Wrench className="w-10 h-10 text-amber-500 mx-auto" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Inicia Sesión en Motilón Motors
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Para acceder a tu panel de administración, tus motos asignadas como mecánico o tu registro de cliente, inicia sesión con tu usuario y contraseña.
                    </p>
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
                    >
                      Abrir Ventana de Ingreso
                    </button>
                  </div>
                )}
              </>
            )}

            {/* TAB: REPUESTOS (admin + mechanic only; blocked for clients) */}
            {activeTab === 'parts' && (
              currentUser && currentUser.role !== 'client' ? (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-amber-500" />
                      Módulo de Gestión de Repuestos e Inventario
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Catálogo de repuestos, control de existencias, directorio de proveedores y pedidos de clientes
                    </p>
                  </div>
                  <PartsModule
                    currentUser={currentUser}
                    onRefreshData={loadAllData}
                  />
                </div>
              ) : (
                <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs max-w-lg mx-auto space-y-4">
                  <Package className="w-10 h-10 text-amber-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Acceso restringido
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {currentUser
                      ? 'El módulo de repuestos está disponible solo para administradores y mecánicos.'
                      : 'Inicia sesión para acceder al módulo de repuestos.'}
                  </p>
                  {!currentUser && (
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
                    >
                      Abrir Ventana de Ingreso
                    </button>
                  )}
                </div>
              )
            )}

            {/* TAB: NEON CLOUD (admin only) */}
            {activeTab === 'neon' && (
              currentUser?.role === 'admin' ? (
                <NeonCloudStatus />
              ) : (
                <div className="p-12 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs max-w-lg mx-auto space-y-4">
                  <Database className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Acceso restringido
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Neon Cloud está disponible solo para administradores.
                  </p>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">Motilón Motors</span>
            <span>·</span>
            <span>Taller Especializado de Motos & Repuestos</span>
          </div>
          <div className="flex items-center gap-4 text-2xs text-slate-400">
            <span>PostgreSQL en Neon Cloud</span>
            <span>·</span>
            <span>Autenticación Multi-Rol</span>
            <span>·</span>
            <span>Bitácora Inmutable de Tiempos</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          loadAllData();
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        emails={emailLogs}
        onRefresh={loadAllData}
      />

    </div>
  );
}
