"use client";

import { useEffect, useState } from "react";
import { History, ScrollText } from "lucide-react";

type AuditLog = {
  id: string;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  createdAt: string;
};

const entityLabels: Record<string, string> = {
  ALL: "Tudo",
  Product: "Produtos",
  Order: "Pedidos",
  User: "Equipe",
  SiteContent: "Loja/vitrine",
  ProductImport: "Planilha",
  Upload: "Uploads",
};

export default function AdminAuditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entity, setEntity] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const query = entity === "ALL" ? "" : `?entity=${entity}`;
    fetch(`/api/admin/audit${query}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) setError(body.error ?? "Não foi possível carregar a auditoria.");
        else {
          setLogs(body);
          setError("");
        }
      })
      .catch(() => setError("Falha de conexão. Recarregue a página."))
      .finally(() => setLoading(false));
  }, [entity]);

  return <div className="admin-easy">
    <div className="admin-title">
      <div>
        <span className="eyebrow">Rastreabilidade</span>
        <h1>Auditoria</h1>
        <p>Quem fez o quê no painel: preços, pedidos, equipe, configurações, planilhas e uploads.</p>
      </div>
    </div>

    {error && <div className="form-error">{error}</div>}

    <section className="admin-data-card">
      <div className="admin-toolbar">
        <div className="pro-tabs">
          {Object.entries(entityLabels).map(([value, label]) => (
            <button key={value} className={`pro-tab ${entity === value ? "active" : ""}`} onClick={() => setEntity(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {loading ? <div className="admin-loading">Carregando auditoria...</div> : <div className="compact-list audit-list">
        {logs.map((log) => (
          <div key={log.id} className="audit-row" style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start", padding: "0.75rem 1.25rem", borderBottom: "1px solid #edf0ee" }}>
            <ScrollText style={{ width: 16, flexShrink: 0, marginTop: 2, color: "#60716c" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <strong style={{ fontSize: "0.78rem" }}>{log.summary ?? log.action}</strong>
              <span style={{ fontSize: "0.66rem", color: "var(--muted)" }}>
                {log.actorEmail ?? "sistema"} · {entityLabels[log.entity] ?? log.entity} · {new Date(log.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        ))}
        {!logs.length && <p className="empty-inline" style={{ padding: "1rem 1.25rem" }}><History style={{ width: 15, verticalAlign: "-2px" }} /> Nenhum registro ainda. As ações aparecem aqui conforme acontecem.</p>}
      </div>}
    </section>
  </div>;
}
