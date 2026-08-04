"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Calculator, PackagePlus } from "lucide-react";
import { unitCostBrl, PURCHASE_CURRENCIES, type PurchaseCurrency } from "../../../src/lib/purchase";

type VariantOption = {
  id: string;
  storage: string | null;
  color: string | null;
  stock: number;
};
type ProductSummary = { id: string; name: string; variants: VariantOption[] };

type Lot = {
  id: string;
  supplier: string;
  currency: string;
  unitCostFx: string;
  exchangeRate: string;
  quantity: number;
  freightBrl: string;
  unitCostBrl: string;
  purchasedAt: string;
  variant: {
    storage: string | null;
    color: string | null;
    stock: number;
    costPrice: string;
    product: { name: string };
  };
};

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminCompras() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [variantId, setVariantId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [currency, setCurrency] = useState<PurchaseCurrency>("USD");
  const [unitCostFx, setUnitCostFx] = useState<number | "">("");
  const [exchangeRate, setExchangeRate] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [freightBrl, setFreightBrl] = useState<number | "">(0);
  const [purchasedAt, setPurchasedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  async function load() {
    try {
      const [productsResponse, lotsResponse] = await Promise.all([
        fetch("/api/admin/products?view=summary", { cache: "no-store" }),
        fetch("/api/admin/purchase-lots", { cache: "no-store" }),
      ]);
      if (productsResponse.ok) setProducts(await productsResponse.json());
      const lotsBody = await lotsResponse.json();
      if (!lotsResponse.ok) setError(lotsBody.error ?? "Não foi possível carregar as compras.");
      else { setLots(lotsBody); setError(""); }
    } catch {
      setError("Falha de conexão. Recarregue a página.");
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const effectiveRate = currency === "BRL" ? 1 : Number(exchangeRate) || 0;
  const previewCost = useMemo(() => {
    if (!unitCostFx || !effectiveRate || !quantity) return null;
    try {
      return unitCostBrl(Number(unitCostFx), effectiveRate, Number(freightBrl) || 0, Number(quantity));
    } catch {
      return null;
    }
  }, [unitCostFx, effectiveRate, freightBrl, quantity]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/purchase-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          supplier,
          currency,
          unitCostFx,
          exchangeRate: effectiveRate,
          quantity,
          freightBrl: freightBrl || 0,
          purchasedAt,
          notes: notes || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Não foi possível registrar o lote.");
      else {
        setMessage("Lote registrado: estoque somado e custo médio atualizado.");
        setSupplier("");
        setUnitCostFx("");
        setQuantity(1);
        setFreightBrl(0);
        setNotes("");
        await load();
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    }
    setSaving(false);
  }

  if (loading) return <div className="admin-loading">Carregando compras...</div>;

  return <div className="admin-easy">
    <div className="admin-title">
      <div>
        <span className="eyebrow">Financeiro</span>
        <h1>Compras (lotes)</h1>
        <p>Entrada de mercadoria com custo na moeda da compra. A cotação do dia congela o custo real em reais — a margem não mente quando o dólar muda.</p>
      </div>
    </div>

    {message && <div className="admin-message">{message}</div>}
    {error && <div className="form-error">{error}</div>}

    <section className="admin-panel">
      <header>
        <PackagePlus />
        <div><h2>Novo lote</h2><p>Registrar a compra soma o estoque e recalcula o custo médio ponderado da variação.</p></div>
      </header>
      <form onSubmit={submit} className="admin-form-grid">
        <label className="wide">Produto / variação
          <select required value={variantId} onChange={(event) => setVariantId(event.target.value)}>
            <option value="">Selecione...</option>
            {products.map((product) => product.variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {product.name} — {[variant.storage, variant.color].filter(Boolean).join(" / ") || "única"} (estoque: {variant.stock})
              </option>
            )))}
          </select>
        </label>
        <label>Fornecedor<input required minLength={2} maxLength={120} value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Ex.: Atlantico PY" /></label>
        <label>Moeda
          <select value={currency} onChange={(event) => setCurrency(event.target.value as PurchaseCurrency)}>
            {PURCHASE_CURRENCIES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>Custo unitário ({currency})<input required type="number" min="0.01" step="0.01" value={unitCostFx} onChange={(event) => setUnitCostFx(event.target.value === "" ? "" : Number(event.target.value))} placeholder="Ex.: 520.00" /></label>
        {currency !== "BRL" && (
          <label>Cotação do dia (R$ por {currency})<input required type="number" min="0.0001" step="0.0001" value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value === "" ? "" : Number(event.target.value))} placeholder="Ex.: 5.2000" /></label>
        )}
        <label>Quantidade<input required type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value === "" ? "" : Number(event.target.value))} /></label>
        <label>Frete/despesas do lote (R$)<input type="number" min="0" step="0.01" value={freightBrl} onChange={(event) => setFreightBrl(event.target.value === "" ? "" : Number(event.target.value))} /></label>
        <label>Data da compra<input required type="date" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} /></label>
        <label className="wide">Observações<input maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Nota, pedido do fornecedor, lote..." /></label>

        {previewCost !== null && (
          <div className="admin-message" style={{ gridColumn: "1 / -1" }}>
            <Calculator style={{ width: 15, verticalAlign: "-2px" }} /> Custo unitário em reais: <strong>{money(previewCost)}</strong>
            {quantity ? <> · custo total do lote: <strong>{money(previewCost * Number(quantity))}</strong></> : null}
          </div>
        )}

        <button disabled={saving} className="button primary"><PackagePlus /> {saving ? "Registrando..." : "Registrar lote"}</button>
      </form>
    </section>

    {lots.length > 0 && (() => {
      const totalBrl = lots.reduce((total, lot) => total + Number(lot.unitCostBrl) * lot.quantity, 0);
      const units = lots.reduce((total, lot) => total + lot.quantity, 0);
      const byCurrency = new Map<string, number>();
      for (const lot of lots) {
        byCurrency.set(lot.currency, (byCurrency.get(lot.currency) ?? 0) + Number(lot.unitCostFx) * lot.quantity);
      }
      const bySupplier = new Map<string, number>();
      for (const lot of lots) {
        bySupplier.set(lot.supplier, (bySupplier.get(lot.supplier) ?? 0) + Number(lot.unitCostBrl) * lot.quantity);
      }
      const topSupplier = [...bySupplier.entries()].sort((a, b) => b[1] - a[1])[0];
      return (
        <section className="list-stats" aria-label="Resumo das compras">
          <div><span>Investido (últimos lotes)</span><strong>{money(totalBrl)}</strong></div>
          <div><span>Unidades compradas</span><strong>{units}</strong></div>
          {[...byCurrency.entries()].map(([currency, amount]) => (
            <div key={currency}><span>Total {currency}</span><strong>{currency === "BRL" ? money(amount) : `${currency} ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}</strong></div>
          ))}
          {topSupplier && <div><span>Maior fornecedor</span><strong>{topSupplier[0]} ({money(topSupplier[1])})</strong></div>}
        </section>
      );
    })()}

    <section className="admin-data-card">
      <div className="admin-toolbar"><strong style={{ fontSize: "0.8rem" }}>Últimos lotes</strong></div>
      <div className="compact-list">
        {lots.map((lot) => (
          <div key={lot.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.75rem 1.25rem", borderBottom: "1px solid #edf0ee", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <strong style={{ fontSize: "0.78rem" }}>{lot.variant.product.name} — {[lot.variant.storage, lot.variant.color].filter(Boolean).join(" / ")}</strong>
              <span style={{ fontSize: "0.66rem", color: "var(--muted)" }}>
                {lot.quantity}x de {lot.supplier} · {lot.currency} {Number(lot.unitCostFx).toFixed(2)} (cotação {Number(lot.exchangeRate).toFixed(4)}) · {new Date(lot.purchasedAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div style={{ textAlign: "right", fontSize: "0.72rem" }}>
              <strong>{money(Number(lot.unitCostBrl))}/un</strong>
              <span style={{ display: "block", color: "var(--muted)", fontSize: "0.64rem" }}>custo médio atual: {money(Number(lot.variant.costPrice))}</span>
            </div>
          </div>
        ))}
        {!lots.length && <p className="empty-inline" style={{ padding: "1rem 1.25rem" }}>Nenhum lote registrado ainda. O primeiro lote define o custo real da variação.</p>}
      </div>
    </section>
  </div>;
}
