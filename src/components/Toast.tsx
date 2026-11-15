import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, type, message, duration }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-[#1C1E24]/95 backdrop-blur-xl border shadow-[0_14px_34px_rgba(0,0,0,0.65)] transition-all duration-200 ${
                isSuccess
                  ? 'border-emerald-400/35 text-slate-100'
                  : isError
                  ? 'border-rose-400/35 text-slate-100'
                  : 'border-blue-400/35 text-slate-100'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/25'
                    : isError
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-400/25'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-400/25'
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                {isError && <AlertCircle className="w-4 h-4" />}
                {!isSuccess && !isError && <Info className="w-4 h-4" />}
              </div>

              <div className="flex-1 text-xs font-medium leading-relaxed text-slate-100">
                {toast.message}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
