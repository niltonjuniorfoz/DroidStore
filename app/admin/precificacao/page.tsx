"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type PricingRow = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  imageUrl?: string | null;
  slug: string;
  group: string;
  subgroup: string;
  category: string;
  condition: string;
  conditionCode: string;
  supplierPriceUsd: number;
  exchangeRate: number;
  costBrl: number;
  markupPercent: number;
  profitBrl: number;
  finalPrice: number;
  available: boolean;
};

type Facets = {
  brands: string[];
  groups: string[];
  subgroups: string[];
  categories: Array<{ label: string; value: string }>;
  conditions: Array<{ label: string; value: string }>;
};

type ResponseData = {
  rows: PricingRow[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
  facets: Facets;
  error?: string;
};

const emptyFacets: Facets = { brands: [], groups: [], subgroups: [], categories: [], conditions: [] };

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function usd(value: number) {
  return `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function ceil10(value: number) {
  return Math.ceil(value / 10) * 10;
}

export default function PricingAdminPage() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [facets, setFacets] = useState<Facets>(emptyFacets);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    q: "",
    brand: "",
    group: "",
    subgroup: "",
    category: "",
    condition: "",
    availability: "",
    pageSize: "50",
  });
  const [applied, setApplied] = useState(form);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      Object.entries(applied).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      params.set("page", String(page));
      const response = await fetch(`/api/admin/pricing?${params.toString()}`, { cache: "no-store" });
      const body = await response.json() as ResponseData;
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar a precificação.");
      setRows(body.rows);
      setFacets(body.facets);
      setPagination(body.pagination);
      setDrafts(Object.fromEntries(body.rows.map((row) => [row.id, String(row.markupPercent)])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => {
    if (!rows.length) return { avg: 0, cost: 0, sale: 0, profit: 0 };
    const cost = rows.reduce((sum, row) => sum + row.costBrl, 0);
    const sale = rows.reduce((sum, row) => sum + row.finalPrice, 0);
    return {
      avg: rows.reduce((sum, row) => sum + row.markupPercent, 0) / rows.length,
      cost,
      sale,
      profit: sale - cost,
    };
  }, [rows]);

  function projected(row: PricingRow) {
    const margin = Number(drafts[row.id] ?? row.markupPercent);
    if (!Number.isFinite(margin)) return { price: row.finalPrice, profit: row.profitBrl };
    const price = ceil10(row.costBrl * (1 + margin / 100));
    return { price, profit: price - row.costBrl };
  }

  function applyFilters(event?: FormEvent) {
    event?.preventDefault();
    setPage(1);
    setApplied({ ...form });
  }

  async function save(row: PricingRow) {
    const markupPercent = Number(drafts[row.id]);
    if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 1000) {
      setMessage(`Margem inválida para o SKU ${row.sku}.`);
      return;
    }
    setSaving(row.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, markupPercent }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar a margem.");
      setRows((current) => current.map((item) => item.id === row.id ? {
        ...item,
        markupPercent: body.markupPercent,
        costBrl: body.costBrl,
        profitBrl: body.profitBrl,
        finalPrice: body.finalPrice,
      } : item));
      setMessage(`SKU ${row.sku} atualizado para ${markupPercent}% de margem.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>FINANCEIRO</span>
          <h1>Precificação de importados</h1>
          <p>Edite somente a margem. O custo e o preço final são recalculados com os dados salvos na importação Aura.</p>
        </div>
        <span className={styles.ready}>✓ {pagination.total} SKUs importados</span>
      </header>

      <section className={styles.stats}>
        <div><span>Produtos filtrados</span><strong>{pagination.total}</strong></div>
        <div><span>Margem média da página</span><strong>{summary.avg.toFixed(1)}%</strong></div>
        <div><span>Custo da página</span><strong>{brl(summary.cost)}</strong></div>
        <div><span>Preço final da página</span><strong>{brl(summary.sale)}</strong></div>
        <div><span>Lucro projetado</span><strong className={styles.profit}>{brl(summary.profit)}</strong></div>
      </section>

      <form className={styles.filters} onSubmit={applyFilters}>
        <label className={styles.search}>
          <span>Buscar</span>
          <input value={form.q} onChange={(event) => setForm((current) => ({ ...current, q: event.target.value }))} placeholder="SKU, produto, modelo ou marca" />
        </label>
        <label><span>Marca</span><select value={form.brand} onChange={(event) => setForm((c) => ({ ...c, brand: event.target.value }))}>
          <option value="">Todas as marcas</option>{facets.brands.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label><span>Grupo</span><select value={form.group} onChange={(event) => setForm((c) => ({ ...c, group: event.target.value }))}>
          <option value="">Todos os grupos</option>{facets.groups.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label><span>Subgrupo</span><select value={form.subgroup} onChange={(event) => setForm((c) => ({ ...c, subgroup: event.target.value }))}>
          <option value="">Todos os subgrupos</option>{facets.subgroups.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label><span>Categoria DroidStore</span><select value={form.category} onChange={(event) => setForm((c) => ({ ...c, category: event.target.value }))}>
          <option value="">Todas as categorias</option>{facets.categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
        <label><span>Condição</span><select value={form.condition} onChange={(event) => setForm((c) => ({ ...c, condition: event.target.value }))}>
          <option value="">Todas as condições</option>{facets.conditions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>
        <label><span>Disponibilidade</span><select value={form.availability} onChange={(event) => setForm((c) => ({ ...c, availability: event.target.value }))}>
          <option value="">Toda disponibilidade</option><option value="available">Disponível</option><option value="unavailable">Indisponível</option>
        </select></label>
        <label><span>Por página</span><select value={form.pageSize} onChange={(event) => setForm((c) => ({ ...c, pageSize: event.target.value }))}>
          <option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="200">200</option>
        </select></label>
        <button type="submit">Aplicar filtros</button>
      </form>

      {message && <div className={styles.message}>{message}</div>}

      <section className={styles.tableShell}>
        <div className={styles.tableScroll}>
          <table>
            <thead><tr>
              <th>SKU / PRODUTO</th><th>MARCA</th><th>GRUPO / CATEGORIA</th><th>CONDIÇÃO</th>
              <th>USD</th><th>COTAÇÃO</th><th>CUSTO</th><th>MARGEM %</th><th>LUCRO</th><th>PREÇO FINAL</th><th>DISP.</th><th>AÇÃO</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className={styles.empty}>Carregando precificação...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={12} className={styles.empty}>Nenhum produto importado encontrado com esses filtros.</td></tr>
              ) : rows.map((row) => {
                const preview = projected(row);
                const changed = Number(drafts[row.id]) !== row.markupPercent;
                return <tr key={row.id}>
                  <td><div className={styles.productCell}>
                    <div className={styles.thumb}>{row.imageUrl ? <img src={row.imageUrl} alt="" /> : <span>—</span>}</div>
                    <div><strong>{row.name}</strong><small>{row.sku}</small></div>
                  </div></td>
                  <td><strong className={styles.brand}>{row.brand}</strong></td>
                  <td><strong>{row.group || "—"}</strong><small>{row.category || row.subgroup || "—"}</small></td>
                  <td>{row.condition}</td>
                  <td>{usd(row.supplierPriceUsd)}</td>
                  <td>R$ {row.exchangeRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                  <td>{brl(row.costBrl)}</td>
                  <td><div className={styles.marginInput}>
                    <input type="number" min="0" max="1000" step="0.1" value={drafts[row.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))} />
                    <span>%</span>
                  </div></td>
                  <td className={styles.profit}>{brl(preview.profit)}</td>
                  <td><strong className={styles.finalPrice}>{brl(preview.price)}</strong>{changed && <small>prévia</small>}</td>
                  <td><span className={row.available ? styles.available : styles.unavailable}>{row.available ? "Sim" : "Não"}</span></td>
                  <td><button type="button" className={changed ? styles.saveChanged : styles.save} disabled={saving === row.id || !changed} onClick={() => void save(row)}>
                    {saving === row.id ? "Salvando..." : changed ? "Salvar" : "Salvo"}
                  </button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        <footer className={styles.pagination}>
          <span>Exibindo {rows.length} de {pagination.total} SKU(s)</span>
          <div>
            <button disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
            <strong>Página {pagination.page} de {pagination.pages}</strong>
            <button disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => Math.min(pagination.pages, value + 1))}>Próxima</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
