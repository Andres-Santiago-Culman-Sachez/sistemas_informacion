import React from 'react';
import { EmailLog } from '../types/index.ts';
import { Mail, X, CheckCircle2, Clock, Calendar } from 'lucide-react';

interface EmailPreviewModalProps {
  email: EmailLog | null;
  onClose: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Notificación por Correo Electrónico
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Disparada automáticamente por Motilón Motors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Envelope Metadata */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-2 text-xs bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">De:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              notificaciones@motilonmotors.com (Taller Motilón Motors)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Para:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {email.toName} &lt;{email.toEmail}&gt;
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Asunto:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {email.subject}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Evento activador:</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {email.triggerEvent}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Fecha y hora de envío:</span>
            <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(email.createdAt).toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        {/* Rendered HTML Email Preview */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-6 bg-white dark:bg-slate-900 shadow-xs">
            <div 
              className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }} 
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Despachado exitosamente</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cerrar vista previa
          </button>
        </div>

      </div>
    </div>
  );
};
