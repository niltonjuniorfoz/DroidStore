"use client";

import { createContext, useContext, useRef, useState } from "react";
import AuthPanel from "./AuthPanel";

type AuthGateContextValue = {
  requireAuth: (action: () => void) => Promise<void>;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  async function requireAuth(action: () => void) {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const session = response.ok ? await response.json() : null;
      if (session?.user) {
        action();
        return;
      }
    } catch {
      // A janela de autenticação é o fallback seguro.
    }
    pendingAction.current = action;
    setOpen(true);
  }

  function authenticated() {
    setOpen(false);
    pendingAction.current?.();
    pendingAction.current = null;
  }

  function close() {
    setOpen(false);
    pendingAction.current = null;
  }

  return <AuthGateContext.Provider value={{ requireAuth }}>
    {children}
    {open && <div className="auth-modal-backdrop" role="dialog" aria-modal="true" aria-label="Entre ou crie sua conta" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <AuthPanel onClose={close} onAuthenticated={authenticated} />
    </div>}
  </AuthGateContext.Provider>;
}

export function useAuthGate() {
  const context = useContext(AuthGateContext);
  if (!context) throw new Error("useAuthGate precisa estar dentro de AuthGateProvider");
  return context;
}
