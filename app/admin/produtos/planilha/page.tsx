"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  LoaderCircle,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";

type ChangeItem = {
  variantId: string;
  productName: string;
  brand: string;
  sheet: string;
  row: number;
  fields: Array<"price" | "costPrice" | "stock" | "active" | "condition">;
  before: { price: string; costPrice?: string; stock: number; active: boolean; condition: string };
  after: { price: string; costPrice?: string; stock: number; active: boolean; condition: string };
};

type Preview = {
  totalRows: number;
  changedRows: number;
  unchangedRows: number;
  priceChanges: number;
  costChanges: number;
  stockChanges: number;
  statusChanges: number;
  conditionChanges: number;
  increases: number;
  decreases: number;
  stockIncreases: number;
  stockDecreases: number;
  stockZeroed: number;
  errors: Array<{ sheet: string; row: number; id?: string; message: string }>;
  changes: ChangeItem[];
  canApply: boolean;
};

type ImportHistory = {
  id: string;
  fileName: string;
  status: "APPLIED" | "ROLLED_BACK";
  totalRows: number;
  changedRows: number;
  unchangedRows: number;
  priceChanges: number;
  costChanges: number;
  stockChanges: number;
  statusChanges: number;
  createdByName?: string;
  createdAt: string;
  rolledBackAt?: string;
};

const fieldLabels = { price: "Venda", costPrice: "Custo", stock: "Estoque", active: "Status", condition: "Condição" };

function money(value: string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fieldValue(change: ChangeItem, field: ChangeItem["fields"][number], side: "before" | "after") {
  const value = change[side][field];
  if (field === "price" || field === "costPrice") return money(String(value ?? 0));
  if (field === "active") return value ? "Ativo" : "Inativo";
  if (field === "condition") return String(value).replaceAll("_", " ").toLocaleLowerCase("pt-BR").replace(/^./, (letter) => letter.toUpperCase());
  return String(value);
}

export default function ProductSpreadsheetPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [busy, setBusy] = useState<"preview" | "apply" | "rollback" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadHistory() {
    const response = await fetch("/api/admin/product-spreadsheet/history", { cache: "no-store" });
    if (response.ok) setHistory(await response.json());
  }

  useEffect(() => { void loadHistory().catch(() => undefined); }, []);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(null);
    setError("");
    setSuccess("");
  }

  async function analyze() {
    if (!file) return;
    setBusy("preview");
    setError("");
    setSuccess("");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/admin/product-spreadsheet/preview", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível analisar a planilha.");
    else setPreview(body);
    setBusy(null);
  }

  async function applyChanges() {
    if (!file || !preview?.canApply) return;
    setBusy("apply");
    setError("");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/admin/product-spreadsheet/apply", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Não foi possível salvar as alterações.");
      if (body.preview) setPreview(body.preview);
    } else {
      setSuccess(`${body.changedRows} alteração(ões) salva(s) com sucesso.`);
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      await loadHistory();
    }
    setBusy(null);
  }

  async function rollback(item: ImportHistory) {
    if (!window.confirm(`Desfazer as ${item.changedRows} alterações da importação “${item.fileName}”?`)) return;
    setBusy("rollback");
    setError("");
    setSuccess("");
    const response = await fetch(`/api/admin/product-spreadsheet/history/${item.id}/rollback`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Não foi possível desfazer a importação.");
    else {
      setSuccess("Importação desfeita e valores anteriores restaurados.");
      await loadHistory();
    }
    setBusy(null);
  }

  return (
    <div className="spreadsheet-page">
      <header className="admin-title spreadsheet-title">
        <div>
          <span className="eyebrow">ATUALIZAÇÃO EM LOTE</span>
          <h1>Planilha de produtos</h1>
          <p>Atualize condição, preços, estoque e status com prévia antes de salvar.</p>
        </div>
        <a className="button primary" href="/api/admin/product-spreadsheet/export">
          <Download size={17} /> Exportar produtos
        </a>
      </header>

      {error && <div className="spreadsheet-alert error" role="alert"><XCircle /> <span>{error}</span></div>}
      {success && <div className="spreadsheet-alert success" role="status"><CheckCircle2 /> <span>{success}</span></div>}

      <section className="spreadsheet-flow">
        <article className="flow-step">
          <span>1</span>
          <div><strong>Exporte</strong><small>Baixe o catálogo separado em abas por marca.</small></div>
          <FileSpreadsheet />
        </article>
        <article className="flow-step">
          <span>2</span>
          <div><strong>Edite no Excel</strong><small>Altere somente as células verdes.</small></div>
          <ShieldCheck />
        </article>
        <article className="flow-step">
          <span>3</span>
          <div><strong>Revise e confirme</strong><small>Veja tudo que mudará antes de salvar.</small></div>
          <PackageCheck />
        </article>
      </section>

      <section className="spreadsheet-upload-card">
        <div className="upload-card-copy">
          <span><Upload /></span>
          <div>
            <h2>Importar planilha editada</h2>
            <p>Envie o mesmo arquivo .xlsx depois de fazer os ajustes.</p>
          </div>
        </div>
        <label className="spreadsheet-file-picker">
          <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={chooseFile} />
          <FileSpreadsheet />
          <span>{file ? file.name : "Escolher arquivo .xlsx"}</span>
        </label>
        <button className="button primary" disabled={!file || busy !== null} onClick={() => void analyze()}>
          {busy === "preview" ? <LoaderCircle className="spin" /> : <ShieldCheck />} Analisar alterações
        </button>
      </section>

      {preview && (
        <section className="spreadsheet-preview">
          <header>
            <div>
              <span className="eyebrow">PRÉ-VISUALIZAÇÃO</span>
              <h2>{preview.errors.length ? "A planilha precisa de correções" : `${preview.changedRows} linha(s) serão atualizadas`}</h2>
              <p>Nenhum dado foi salvo até este momento.</p>
            </div>
            <span className={`preview-state ${preview.errors.length ? "invalid" : "valid"}`}>
              {preview.errors.length ? <AlertTriangle /> : <CheckCircle2 />}
              {preview.errors.length ? `${preview.errors.length} erro(s)` : "Pronta para salvar"}
            </span>
          </header>

          <div className="preview-metrics">
            <div><small>Linhas lidas</small><strong>{preview.totalRows}</strong></div>
            <div><small>Com alteração</small><strong>{preview.changedRows}</strong></div>
            <div><small>Sem alteração</small><strong>{preview.unchangedRows}</strong></div>
            <div><small>Preços</small><strong>{preview.priceChanges}</strong></div>
            <div><small>Estoques</small><strong>{preview.stockChanges}</strong></div>
            <div><small>Status</small><strong>{preview.statusChanges}</strong></div>
            <div><small>Condições</small><strong>{preview.conditionChanges}</strong></div>
          </div>

          {!preview.errors.length && preview.changedRows > 0 && (
            <div className="change-summary">
              <span><ArrowUp /> {preview.increases} preço(s) aumentaram</span>
              <span><ArrowDown /> {preview.decreases} preço(s) diminuíram</span>
              <span><ArrowUp /> {preview.stockIncreases} estoque(s) aumentaram</span>
              <span><ArrowDown /> {preview.stockDecreases} estoque(s) diminuíram</span>
              {preview.stockZeroed > 0 && <span className="warning"><AlertTriangle /> {preview.stockZeroed} estoque(s) zerados</span>}
            </div>
          )}

          {preview.errors.length > 0 ? (
            <div className="spreadsheet-errors">
              {preview.errors.map((item, index) => <div key={`${item.sheet}-${item.row}-${index}`}>
                <XCircle /><span><strong>{item.sheet} · linha {item.row}</strong><small>{item.message}{item.id ? ` · ID ${item.id}` : ""}</small></span>
              </div>)}
            </div>
          ) : (
            <div className="spreadsheet-changes responsive-table">
              <table>
                <thead><tr><th>Produto</th><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
                <tbody>{preview.changes.flatMap((change) => change.fields.map((field) => (
                  <tr key={`${change.variantId}-${field}`}>
                    <td><strong>{change.productName}</strong><small>{change.brand} · {change.sheet}, linha {change.row}</small></td>
                    <td>{fieldLabels[field]}</td>
                    <td>{fieldValue(change, field, "before")}</td>
                    <td><strong className="new-value">{fieldValue(change, field, "after")}</strong></td>
                  </tr>
                )))}</tbody>
              </table>
            </div>
          )}

          <footer>
            <button className="button ghost" onClick={() => { setPreview(null); setError(""); }}>Cancelar</button>
            <button className="button primary" disabled={!preview.canApply || busy !== null} onClick={() => void applyChanges()}>
              {busy === "apply" ? <LoaderCircle className="spin" /> : <CheckCircle2 />} Confirmar e salvar {preview.changedRows} alteração(ões)
            </button>
          </footer>
        </section>
      )}

      <section className="spreadsheet-history admin-data-card">
        <header>
          <div><h2><History /> Histórico de importações</h2><p>As últimas atualizações feitas por planilha.</p></div>
        </header>
        {history.length === 0 ? <p className="empty-inline">Nenhuma importação realizada ainda.</p> : <div className="history-list">
          {history.map((item) => <article key={item.id}>
            <span className={`history-icon ${item.status === "ROLLED_BACK" ? "rolled-back" : ""}`}><FileSpreadsheet /></span>
            <div className="history-main">
              <strong>{item.fileName}</strong>
              <small>{new Date(item.createdAt).toLocaleString("pt-BR")} · {item.createdByName ?? "Administrador"}</small>
              <span>{item.changedRows} alterados · {item.priceChanges} preços · {item.stockChanges} estoques · {item.statusChanges} status</span>
            </div>
            <div className="history-actions">
              <em className={item.status === "ROLLED_BACK" ? "undone" : "applied"}>{item.status === "ROLLED_BACK" ? "Desfeita" : "Aplicada"}</em>
              {item.status === "APPLIED" && <button disabled={busy !== null} onClick={() => void rollback(item)}><RefreshCcw /> Desfazer</button>}
            </div>
          </article>)}
        </div>}
      </section>
    </div>
  );
}
