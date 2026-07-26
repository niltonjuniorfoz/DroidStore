"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, History, PackagePlus, Search, X } from "lucide-react";

type Variant = {
  id: string; storage: string | null; color: string | null; condition: string; price: string; costPrice?: string;
  stock: number; lowStockThreshold: number; updatedAt: string;
  product: { name: string; brand: string; active: boolean; imageUrl: string | null };
  stockMovements: Array<{ id: string; type: string; quantity: number; note: string | null; createdAt: string }>;
};

const movementLabels: Record<string, string> = { ENTRY: "Entrada", ADJUSTMENT: "Ajuste", SALE: "Venda", RETURN: "Devolução" };

export default function AdminEstoque() {
  const [items, setItems] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<Variant | null>(null);
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/inventory", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível carregar o estoque.");
    else { setItems(body); setError(""); }
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return items.filter((item) => !term || `${item.product.name} ${item.product.brand} ${item.storage} ${item.color}`.toLowerCase().includes(term));
  }, [items, search]);
  const totalUnits = items.reduce((total, item) => total + item.stock, 0);
  const lowItems = items.filter((item) => item.stock <= item.lowStockThreshold).length;

  function open(item: Variant) {
    setSelected(item);
    setQuantity(1);
    setNote("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: selected.id, quantity, type: quantity > 0 ? "ENTRY" : "ADJUSTMENT", note }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível ajustar o estoque.");
    else { setSelected(null); await load(); }
    setSaving(false);
  }

  return <div className="admin-easy">
    <div className="admin-title"><div><span className="eyebrow">Inventário</span><h1>Estoque</h1><p>Entradas, saídas e histórico por variação de produto.</p></div></div>
    <section className="inventory-summary">
      <div><PackagePlus /><span><strong>{totalUnits}</strong> unidades disponíveis</span></div>
      <div className={lowItems ? "danger-text" : ""}><AlertTriangle /><span><strong>{lowItems}</strong> itens no estoque mínimo</span></div>
    </section>
    {error && !selected && <div className="form-error">{error}</div>}
    <section className="admin-data-card">
      <div className="admin-toolbar"><label className="toolbar-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto, marca, capacidade ou cor" /></label></div>
      {loading ? <div className="admin-loading">Carregando estoque...</div> : <div className="responsive-table"><table>
        <thead><tr><th>Produto</th><th>Variação</th><th>Disponível</th><th>Mínimo</th><th>Última movimentação</th><th></th></tr></thead>
        <tbody>{filtered.map((item) => {
          const low = item.stock <= item.lowStockThreshold;
          return <tr key={item.id} className={!item.product.active ? "muted-row" : ""}>
            <td><strong>{item.product.name}</strong><small>{item.product.brand}{!item.product.active ? " • oculto" : ""}</small></td>
            <td>{item.storage ?? "—"} • {item.color ?? "—"}<small>{item.condition.replaceAll("_", " ")}</small></td>
            <td><strong className={low ? "danger-text" : ""}>{item.stock} un.</strong>{low && <small className="danger-text">Repor estoque</small>}</td>
            <td>{item.lowStockThreshold} un.</td>
            <td>{item.stockMovements[0] ? <><strong>{movementLabels[item.stockMovements[0].type]} {item.stockMovements[0].quantity > 0 ? "+" : ""}{item.stockMovements[0].quantity}</strong><small>{new Date(item.stockMovements[0].createdAt).toLocaleString("pt-BR")}</small></> : <span>Sem histórico</span>}</td>
            <td><button className="button ghost small-button" onClick={() => open(item)}><ArrowDownToLine /> Movimentar</button></td>
          </tr>;
        })}</tbody>
      </table>{!filtered.length && <div className="empty-inline">Nenhum item encontrado.</div>}</div>}
    </section>

    {selected && <div className="admin-modal"><form className="stock-modal" onSubmit={submit}>
      <button type="button" className="modal-close" onClick={() => setSelected(null)}><X /></button>
      <span className="eyebrow">Movimentação de estoque</span><h2>{selected.product.name}</h2>
      <p>{selected.storage} • {selected.color} • estoque atual: <strong>{selected.stock}</strong></p>
      <label><span>Quantidade</span><input type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required /><small>Use número positivo para entrada e negativo para saída/ajuste.</small></label>
      <label><span>Motivo da movimentação</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: recebimento do fornecedor, correção de contagem..." required minLength={3} /></label>
      {error && <div className="form-error">{error}</div>}
      <div className="movement-history"><h3><History /> Histórico recente</h3>{selected.stockMovements.length ? selected.stockMovements.map((movement) => <div key={movement.id}><span className={movement.quantity >= 0 ? "positive" : "negative"}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</span><p><strong>{movementLabels[movement.type]}</strong><small>{movement.note ?? "Sem observação"} • {new Date(movement.createdAt).toLocaleString("pt-BR")}</small></p></div>) : <p className="empty-inline">Nenhuma movimentação registrada.</p>}</div>
      <div className="modal-actions"><button type="button" className="button ghost" onClick={() => setSelected(null)}>Cancelar</button><button disabled={saving || quantity === 0} className="button primary">{saving ? "Salvando..." : "Confirmar movimentação"}</button></div>
    </form></div>}
  </div>;
}
