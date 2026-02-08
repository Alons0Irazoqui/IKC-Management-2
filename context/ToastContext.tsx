
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Ref to track the last toast for spam prevention
  const lastToastRef = useRef<{ time: number; type: ToastType }>({ time: 0, type: 'info' });

  // Function to remove a specific toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const now = Date.now();
    const timeDiff = now - lastToastRef.current.time;

    // SPAM PREVENTION (ENFRIAMIENTO):
    // Si intentamos mostrar otra alerta del MISMO TIPO en menos de 2 segundos, la ignoramos.
    // Esto previene dobles mensajes (ej. "Guardado" + "Datos actualizados") para la misma acción.
    if (type === lastToastRef.current.type && timeDiff < 2000) {
        return;
    }

    // Update the ref
    lastToastRef.current = { time: now, type };

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    setToasts((prev) => {
        // Prevent exact message duplicates currently on screen
        if (prev.some(t => t.message === message)) return prev;
        
        // Limit to 3 toasts max
        const newList = [...prev, { id, message, type }];
        if (newList.length > 3) newList.shift();
        return newList;
    });

    // Auto dismiss after 4 seconds
    setTimeout(() => {
        setToasts((currentToasts) => currentToasts.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Container - High Z-Index to stay on top */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[320px] max-w-sm p-4 rounded-2xl shadow-xl border flex items-center gap-3 transform transition-all duration-300 animate-in slide-in-from-top-5 fade-in ${
              toast.type === 'success' ? 'bg-white border-green-100 text-green-800' :
              toast.type === 'error' ? 'bg-white border-red-100 text-red-800' :
              'bg-white border-gray-100 text-gray-800'
            }`}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
               toast.type === 'success' ? 'bg-green-100 text-green-600' :
               toast.type === 'error' ? 'bg-red-100 text-red-600' :
               'bg-blue-100 text-blue-600'
            }`}>
              <span className="material-symbols-outlined text-[20px]">
                {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{toast.type === 'success' ? 'Éxito' : toast.type === 'error' ? 'Error' : 'Información'}</p>
              <p className="text-sm opacity-90">{toast.message}</p>
            </div>
            <button 
                onClick={() => removeToast(toast.id)} 
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
