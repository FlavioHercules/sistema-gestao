import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone?: "success" | "error" | "info";
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function getToneStyles(tone: ToastItem["tone"] = "info") {
  switch (tone) {
    case "success":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    case "error":
      return "border-rose-500/40 bg-rose-500/10 text-rose-200";
    default:
      return "border-sky-500/40 bg-sky-500/10 text-sky-200";
  }
}

function getIcon(tone: ToastItem["tone"] = "info") {
  switch (tone) {
    case "success":
      return <CheckCircle2 size={16} />;
    case "error":
      return <AlertTriangle size={16} />;
    default:
      return <Info size={16} />;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, ...toast }]);
      window.setTimeout(() => removeToast(id), 2800);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(92vw,24rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 shadow-lg shadow-slate-950/40 ${getToneStyles(toast.tone)}`}
          >
            <div className="mt-0.5">{getIcon(toast.tone)}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-sm opacity-90">{toast.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-md p-1 text-current/70 transition hover:bg-black/10 hover:text-current"
              aria-label="Fechar notificação"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de ToastProvider");
  }
  return context;
}
