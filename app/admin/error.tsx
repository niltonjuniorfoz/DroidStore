"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erro no painel administrativo", error);
  }, [error]);

  return (
    <div className="admin-easy" style={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
      <div style={{ textAlign: "center", maxWidth: 420, display: "grid", gap: "0.8rem", justifyItems: "center" }}>
        <AlertTriangle size={34} style={{ color: "#b45309" }} />
        <h1 style={{ fontSize: "1.1rem" }}>Algo deu errado no painel</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--muted, #6b756f)" }}>
          O erro foi registrado. Tente novamente; se continuar, recarregue a página ou verifique sua conexão.
        </p>
        {error.digest && <small style={{ color: "var(--muted, #6b756f)" }}>Código: {error.digest}</small>}
        <button className="button primary" onClick={reset}><RotateCcw size={15} /> Tentar novamente</button>
      </div>
    </div>
  );
}
