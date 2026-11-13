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
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border-2 border-slate-950 shadow-[4px_4px_0px_0px_#020617] transition-all duration-200 ${
                isSuccess
                  ? 'bg-[#DCFCE7] text-slate-950'
                  : isError
                  ? 'bg-[#FFE4E6] text-slate-950'
                  : 'bg-[#FEF9C3] text-slate-950'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg border-2 border-slate-950 flex items-center justify-center shrink-0 ${
                isSuccess ? 'bg-[#4ADE80]' : isError ? 'bg-[#FB7185]' : 'bg-[#38BDF8]'
              }`}>
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                {isError && <AlertCircle className="w-4 h-4 text-slate-950" />}
                {!isSuccess && !isError && <Info className="w-4 h-4 text-slate-950" />}
              </div>

              <div className="flex-1 text-xs font-bold leading-relaxed text-slate-950">
                {toast.message}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg border-2 border-transparent hover:border-slate-950 hover:bg-white text-slate-950 transition-colors cursor-pointer"
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
