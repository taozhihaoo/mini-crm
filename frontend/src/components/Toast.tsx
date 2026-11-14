import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{ push: (type: ToastType, message: string) => void } | null>(null);

const TOAST_STYLES: Record<ToastType, { box: string; icon: string; glyph: IconName }> = {
  success: {
    box: "border-emerald-200/80 bg-white text-emerald-800",
    icon: "bg-emerald-50 text-emerald-600",
    glyph: "check",
  },
  error: {
    box: "border-rose-200/80 bg-white text-rose-800",
    icon: "bg-rose-50 text-rose-600",
    glyph: "alert",
  },
  info: {
    box: "border-indigo-200/80 bg-white text-indigo-800",
    icon: "bg-indigo-50 text-indigo-600",
    glyph: "info",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          return (
            <div
              key={toast.id}
              role="status"
              className={`cf-rise pointer-events-auto flex items-center gap-3 rounded-xl border px-3.5 py-3 text-[13px] font-medium shadow-[0_18px_40px_-18px_rgba(16,22,43,0.5)] ${style.box}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.icon}`}>
                <Icon name={style.glyph} className="h-4 w-4" />
              </span>
              <span className="flex-1 leading-snug">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
