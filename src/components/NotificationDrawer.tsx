import React, { useEffect, useState } from 'react';
import { EmailLog } from '../types/index.ts';
import { api } from '../services/api.ts';
import { Mail, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { EmailPreviewModal } from './EmailPreviewModal.tsx';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailLog[];
  onRefresh: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  emails,
  onRefresh,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [localEmails, setLocalEmails] = useState<EmailLog[]>(emails);

  useEffect(() => {
    setLocalEmails(emails);
  }, [emails]);

  const handleSelect = async (email: EmailLog) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      try {
        await api.markEmailRead(email.id);
        setLocalEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)),
        );
        setSelectedEmail((prev) => (prev && prev.id === email.id ? { ...prev, isRead: true } : prev));
        onRefresh();
      } catch {
        // Keep the preview open even if marking fails.
      }
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.markAllEmailsRead();
      setLocalEmails((prev) => prev.map((e) => ({ ...e, isRead: true })));
      onRefresh();
    } catch {
      // Error is surfaced by App-level refresh on next load.
    }
  };

  if (!isOpen) return null;

  const unreadCount = localEmails.filter((e) => !e.isRead).length;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Bandeja de Notificaciones
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Correos automáticos despachados ({localEmails.length})
                {unreadCount > 0 ? ` · ${unreadCount} sin leer` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMarkAll}
              className="px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 rounded-md hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors"
            >
              Marcar todas como leídas
            </button>
            <button
              onClick={onRefresh}
              className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              Actualizar
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email list */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {localEmails.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No hay correos enviados todavía. Al cambiar estados de motos o repuestos se generarán automáticamente.
            </div>
          ) : (
            localEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => handleSelect(email)}
                className={`group p-3.5 rounded-lg border cursor-pointer transition-all shadow-2xs ${
                  email.isRead
                    ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 hover:border-amber-400 dark:hover:border-amber-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    : 'border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400 dark:hover:border-amber-500/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={`text-xs line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-2 ${email.isRead ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-white'}`}>
                    {!email.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-label="Sin leer" />
                    )}
                    <span className="line-clamp-1">{email.subject}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 shrink-0 mt-0.5" />
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Destinatario: <span className="font-medium text-slate-700 dark:text-slate-300">{email.toName}</span> ({email.toEmail})
                </div>

                <div className="flex items-center justify-between text-2xs text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {email.triggerEvent}
                  </span>
                  <span className="font-mono tabular-nums">
                    {new Date(email.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500 flex items-center justify-between">
          <span>Automatización activa</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sistema listo
          </span>
        </div>

      </div>

      <EmailPreviewModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />
    </>
  );
};
