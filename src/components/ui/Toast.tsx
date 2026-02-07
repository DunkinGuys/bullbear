'use client';

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { ToastType } from '@/store/uiStore';

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colors: Record<ToastType, string> = {
  success: 'border-green-500/50 bg-green-950/80 text-green-300',
  error: 'border-red-500/50 bg-red-950/80 text-red-300',
  info: 'border-gray-600 bg-gray-900/80 text-gray-300',
};

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border backdrop-blur text-sm shadow-lg animate-in slide-in-from-right ${colors[toast.type]}`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 hover:opacity-70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
