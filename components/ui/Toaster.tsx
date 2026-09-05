
import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToastStore, ToastType } from '../../store/toast-store';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

export const Toaster = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    // Below the bag drawer (z-150) on purpose: a notice must never sit on top
    // of a control someone is trying to press. Width is capped so a long
    // product name wraps instead of stretching the toast across the screen.
    <div className="fixed bottom-4 right-4 z-[140] flex flex-col gap-2 pointer-events-none w-[min(420px,calc(100vw-2rem))]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white border border-gray-100 shadow-lg rounded-lg p-4 flex items-center gap-3 w-full animate-slide-in-right"
        >
          {icons[toast.type]}
          <p className="text-sm font-medium text-gray-800 flex-1 break-words">{toast.message}</p>
          <button 
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
