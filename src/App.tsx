/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, WorkOrder, Motorcycle, PartRequest, EmailLog, UserRole } from './types/index.ts';
import { api } from './services/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { MechanicDashboard } from './components/mechanic/MechanicDashboard.tsx';
import { ClientPortal } from './components/client/ClientPortal.tsx';
import { PartsModule } from './components/parts/PartsModule.tsx';
import { NeonCloudStatus } from './components/NeonCloudStatus.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { 
  Wrench, 
  Package, 
  Database, 
  Crown, 
  User as UserIcon, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 1,
    uid: 'usr_admin_1',
    name: 'Carlos Motilón (Administrador)',
    email: 'admin@motilonmotors.com',
    role: 'admin',
    phone: '+57 300 123 4567',
  });

  const [activeTab, setActiveTab] = useState<'orders' | 'parts' | 'neon' | 'client-view'>('orders');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Sync dark class on document root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadAllData = async () => {
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
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleQuickSwitchRole = (role: UserRole) => {
    if (role === 'admin') {
      setCurrentUser({
        id: 1,
        uid: 'usr_admin_1',
        name: 'Carlos Motilón (Administrador)',
        email: 'admin@motilonmotors.com',
        role: 'admin',
      });
      setActiveTab('orders');
    } else if (role === 'mechanic') {
      setCurrentUser({
        id: 2,
        uid: 'usr_mech_1',
        name: 'Javier Méndez (Mecánico Senior)',
        email: 'mecanico@motilonmotors.com',
        role: 'mechanic',
      });
      setActiveTab('orders');
    } else {
      setCurrentUser({
        id: 4,
        uid: 'usr_cli_1',
        name: 'Andrés Santiago Culman',
        email: 'cliente@motilonmotors.com',
        role: 'client',
        phone: '+57 310 456 7890',
      });
      setActiveTab('orders');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      
      {/* 3-Zone Top Bar Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => setCurrentUser(null)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        emailCount={emailLogs.length}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onQuickSwitchRole={handleQuickSwitchRole}
      />

      {/* Role Indicator Banner */}
      <div className="bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800 px-4 py-2 text-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Rol activo:</span>
            <span className={`font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${
              currentUser?.role === 'admin' 
                ? 'bg-amber-500 text-slate-950' 
                : currentUser?.role === 'mechanic'
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              {currentUser?.role === 'admin' ? '👑 Administrador' : currentUser?.role === 'mechanic' ? '🔧 Mecánico Senior' : '👤 Cliente Propietario'}
            </span>
            <span className="hidden sm:inline text-slate-400">· {currentUser?.name}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 hidden md:inline">Simular otro perfil:</span>
            <button
              onClick={() => handleQuickSwitchRole('admin')}
              className={`px-2 py-0.5 rounded text-2xs transition-colors ${
                currentUser?.role === 'admin' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickSwitchRole('mechanic')}
              className={`px-2 py-0.5 rounded text-2xs transition-colors ${
                currentUser?.role === 'mechanic' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              Mecánico
            </button>
            <button
              onClick={() => handleQuickSwitchRole('client')}
              className={`px-2 py-0.5 rounded text-2xs transition-colors ${
                currentUser?.role === 'client' ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              Cliente
            </button>
          </div>
        </div>
      </div>

      {/* Hero Workshop Banner (only when viewing main orders) */}
      {activeTab === 'orders' && (
        <div className="relative border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-25 dark:opacity-30">
            <img 
              src="/src/assets/images/motilon_workshop_hero_1794080587609.jpg" 
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
        {loading ? (
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

            {/* TAB: REPUESTOS */}
            {activeTab === 'parts' && (
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
                  currentUser={currentUser || { id: 1, uid: 'guest', name: 'Invitado', email: '', role: 'client' }}
                  onRefreshData={loadAllData}
                />
              </div>
            )}

            {/* TAB: NEON CLOUD */}
            {activeTab === 'neon' && (
              <NeonCloudStatus />
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
