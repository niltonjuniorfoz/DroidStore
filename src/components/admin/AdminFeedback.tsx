"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

// Toast e diálogo de confirmação próprios do painel — substituem alert()/confirm()
// nativos (bloqueantes e sem identidade visual).

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };
type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};
type ConfirmState = ConfirmOptions & { resolve: (accepted: boolean) => void };

type FeedbackContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
  confirmDialog: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toastIcons: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function AdminFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-3), { id, message, kind }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);

  const confirmDialog = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  function settle(accepted: boolean) {
    confirmState?.resolve(accepted);
    setConfirmState(null);
  }

  // Esc cancela o diálogo (mesmo atalho do confirm nativo).
  useEffect(() => {
    if (!confirmState) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") settle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmState]);

  return (
    <FeedbackContext.Provider value={{ toast, confirmDialog }}>
      {children}

      <div className="admin-toast-stack" role="status" aria-live="polite">
        {toasts.map((item) => {
          const Icon = toastIcons[item.kind];
          return (
            <div key={item.id} className={`admin-toast ${item.kind}`}>
              <Icon size={16} />
              <span>{item.message}</span>
            </div>
          );
        })}
      </div>

      {confirmState && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true" aria-label={confirmState.title ?? "Confirmação"} onMouseDown={(event) => { if (event.target === event.currentTarget) settle(false); }}>
          <div className="admin-confirm-box">
            <AlertTriangle className={confirmState.danger ? "danger" : ""} />
            {confirmState.title && <h2>{confirmState.title}</h2>}
            <p>{confirmState.message}</p>
            <div className="admin-confirm-actions">
              <button type="button" className="button ghost" onClick={() => settle(false)}>
                {confirmState.cancelLabel ?? "Cancelar"}
              </button>
              <button type="button" autoFocus className={`button ${confirmState.danger ? "danger" : "primary"}`} onClick={() => settle(true)}>
                {confirmState.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useAdminFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useAdminFeedback precisa estar dentro de AdminFeedbackProvider");
  return context;
}
