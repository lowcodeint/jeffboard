// Toast notification container

import { useToastStore } from '../../stores/toastStore';

/**
 * ToastContainer component
 * Displays stacked toast notifications at the bottom of the screen
 * Automatically manages toast lifecycle (3s auto-dismiss)
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe-bottom p-4 pointer-events-none">
      <div className="space-y-2">
        {toasts.map((toast) => {
          const bgColor = {
            info: 'bg-blue-600 dark:bg-blue-500',
            success: 'bg-green-600 dark:bg-green-500',
            warning: 'bg-orange-500 dark:bg-orange-400'
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`
                ${bgColor}
                text-white
                px-4 py-3
                rounded-lg
                shadow-xl
                pointer-events-auto
                animate-slide-up
                flex items-center justify-between gap-3
                backdrop-blur-sm
              `}
            >
              <span className="text-sm font-semibold">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-white/30 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
