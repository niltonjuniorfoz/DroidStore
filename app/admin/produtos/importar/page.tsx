"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CirclePause,
  CirclePlay,
  Download,
  FileJson,
  FileSpreadsheet,
  History,
  LoaderCircle,
  PackageCheck,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useAdminFeedback } from "../../../../src/components/admin/AdminFeedback";
import { findCatalogFilter, findCatalogOption, normalizeCatalogValue } from "../../../../src/lib/aura/catalogMapping";
import { uploadAdminFile } from "../../../../src/lib/uploadClient";
import styles from "./page.module.css";

type Mode = "AURA_JSON" | "SUPPLIER_XLSX";
type Action = "CREATE" | "UPDATE" | "UNCHANGED" | "REVIEW" | "ERROR";
type CategoryOrigin = { sourceGroup: string; sourceSubgroups?: string[]; count: number };
type Summary = {
  totalJson?: number;
  ready?: number;
  review?: number;
  errors?: number;
  newSkus?: number;
  existingSkus?: number;
  available?: number;
  unavailable?: number;
  photoCount?: number;
  categoryCount?: number;
  brandCount?: number;
  brands?: string[];
  newBrands?: string[];
  categories?: CategoryOrigin[];
  conditions?: string[];
  originalRows?: number;
  knownSkus?: number;
  unknownSkus?: number;
  inferredBrands?: string[];
  scopeBrands?: string[];
  missingInScope?: number;
  headers?: string[];
  columnMapping?: Record<string, string>;
  actions?: Partial<Record<Action, number>>;
};
type Job = {
  id: string;
  kind: Mode;
  status: string;
  fileName: string;
  totalItems: number;
  preparedItems: number;
  processedItems: number;
  createdItems: number;
  updatedItems: number;
  unchangedItems: number;
  reviewItems: number;
  errorItems: number;
  exchangeRate?: string | number | null;
  roundingRule: string;
  summary: Summary;
  configuration?: Record<string, unknown>;
  generator?: string | null;
  schemaVersion?: number | null;
  createdByName?: string | null;
  startedAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
  supplier?: { name: string };
};
type AuraItem = {
  id: string;
  sku: string;
  name: string;
  brand?: string | null;
  sourceGroup?: string | null;
  sourceSubgroup?: string | null;
  action: Action;
  status: string;
  messages: Array<{ code: string; message: string; severity: string }>;
  sourceData: Record<string, unknown>;
  computedData: Record<string, unknown>;
};
type Filter = { id: string; name: string; slug: string; active: boolean; options: Array<{ id: string; label: string; active: boolean }> };
type Supplier = {
  id: string;
  slug: string;
  pricingRules: Array<{ brand: string; markupPercent: string | number }>;
  categoryMappings: Array<{ sourceGroup: string; sourceSubgroup: string; optionIds: string[] }>;
  conditionMappings: Array<{ sourceCondition: string; condition: string }>;
};
type CategoryMapping = CategoryOrigin & { optionIds: string[]; createIfMissing: boolean; persist: boolean };
type BrandMapping = { sourceBrand: string; optionId?: string; createIfMissing: boolean };
type ConditionMapping = { sourceCondition: string; condition: string; persist: boolean };
type Markup = { brand: string; markupPercent: number; persist: boolean };
type Preview = { job: Job; items: AuraItem[]; total: number; page: number; pages: number };
type PreviewFilters = {
  action: Action | "";
  status: string;
  brand: string;
  group: string;
  subgroup: string;
  optionId: string;
  condition: string;
  availability: string;
  identity: string;
  query: string;
};

const STEPS = ["Arquivo", "Validação", "Mapeamentos", "Preço", "Prévia", "Importar", "Resultado"];
const CONDITIONS = [
  ["NOVO", "Novo"],
  ["NOVO_REEMBALADO", "Novo reembalado"],
  ["EXCELENTE", "Excelente"],
  ["MUITO_BOM", "Muito bom"],
  ["BOM", "Bom"],
  ["OUTLET", "Outlet"],
];
const ACTION_LABELS: Record<Action, string> = { CREATE: "Criar", UPDATE: "Atualizar", UNCHANGED: "Sem alteração", REVIEW: "Revisar", ERROR: "Erro" };

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = init?.body instanceof FormData
    ? init.headers
    : { "Content-Type": "application/json", ...(init?.headers ?? {}) };
  const response = await fetch(url, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error ?? "Não foi possível concluir a operação."), { body });
  return body as T;
}

function money(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
}

function usd(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("pt-BR", { style: "currency", currency: "USD" }) : "—";
}

function previewRoundedPrice(value: number, rule: string) {
  const divisor = rule === "CEIL_100" ? 100 : rule === "CEIL_50" ? 50 : 10;
  const rounded = rule === "NEAREST_10" ? Math.round(value / divisor) : Math.ceil(value / divisor);
  return rounded * divisor;
}

export default function AuraCatalogImportPage() {
  const { confirmDialog } = useAdminFeedback();
  const [mode, setMode] = useState<Mode>("AURA_JSON");
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [temporaryUrl, setTemporaryUrl] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [summary, setSummary] = useState<Summary>({});
  const [filters, setFilters] = useState<Filter[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [history, setHistory] = useState<Job[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);
  const [brandMappings, setBrandMappings] = useState<BrandMapping[]>([]);
  const [conditionMappings, setConditionMappings] = useState<ConditionMapping[]>([]);
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [scopeBrands, setScopeBrands] = useState<string[]>([]);
  const [exchangeRate, setExchangeRate] = useState(5.32);
  const [roundingRule, setRoundingRule] = useState("CEIL_10");
  const [existing, setExisting] = useState({ updateName: false, updateDescription: false, updateImages: false, replaceSpecifications: false, updateCategories: false });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<Action | "">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [subgroupFilter, setSubgroupFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [identityFilter, setIdentityFilter] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [xlsxHeaders, setXlsxHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({ sku: "", price: "", brand: "", name: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  const loadHistory = useCallback(async () => {
    try { setHistory(await requestJson<Job[]>("/api/admin/aura-import/history")); } catch { /* histórico não bloqueia a tela */ }
  }, []);

  useEffect(() => {
    void Promise.all([
      requestJson<Filter[]>("/api/admin/filters").then((rows) => setFilters(rows.filter((filter) => filter.active))),
      requestJson<Supplier[]>("/api/admin/suppliers").then((rows) => setSupplier(rows.find((item) => item.slug === "atacado-connect") ?? rows[0] ?? null)),
      loadHistory(),
    ]).catch(() => setError("Não foi possível carregar as configurações do importador."));
  }, [loadHistory]);

  async function refreshMappingSources() {
    const [filterRows, supplierRows] = await Promise.all([
      requestJson<Filter[]>("/api/admin/filters"),
      requestJson<Supplier[]>("/api/admin/suppliers"),
    ]);
    const activeFilters = filterRows.filter((filter) => filter.active);
    const currentSupplier = supplierRows.find((item) => item.slug === "atacado-connect") ?? supplierRows[0] ?? null;
    setFilters(activeFilters);
    setSupplier(currentSupplier);
    return { activeFilters, currentSupplier };
  }

  function hydrateConfiguration(nextSummary: Summary, currentSupplier = supplier, currentFilters = filters) {
    const savedMarkup = new Map((currentSupplier?.pricingRules ?? []).map((rule) => [rule.brand.toUpperCase(), Number(rule.markupPercent)]));
    const brands = nextSummary.brands ?? nextSummary.inferredBrands ?? [];
    setMarkups(brands.map((brand) => ({ brand, markupPercent: savedMarkup.get(brand.toUpperCase()) ?? 25, persist: true })));
    setScopeBrands([...(nextSummary.inferredBrands ?? brands)]);
    const brandFilter = findCatalogFilter(currentFilters, "Marca");
    setBrandMappings(brands.map((sourceBrand) => {
      const option = findCatalogOption(brandFilter, sourceBrand);
      return { sourceBrand, optionId: option?.id, createIfMissing: !option };
    }));
    const categoryFilter = findCatalogFilter(currentFilters, "Categoria");
    const currentCategoryOptionIds = new Set((categoryFilter?.options ?? []).map((option) => option.id));
    setCategoryMappings((nextSummary.categories ?? []).map((origin) => {
      const saved = currentSupplier?.categoryMappings.find((mapping) => (
        normalizeCatalogValue(mapping.sourceGroup) === normalizeCatalogValue(origin.sourceGroup)
        && !mapping.sourceSubgroup
      ));
      const existingOption = findCatalogOption(categoryFilter, origin.sourceGroup);
      const savedOptionId = saved?.optionIds.find((optionId) => currentCategoryOptionIds.has(optionId));
      const optionIds = savedOptionId ? [savedOptionId] : existingOption ? [existingOption.id] : [];
      return { ...origin, optionIds, createIfMissing: optionIds.length === 0, persist: true };
    }));
    setConditionMappings((nextSummary.conditions ?? []).map((sourceCondition) => ({
      sourceCondition,
      condition: currentSupplier?.conditionMappings.find((mapping) => mapping.sourceCondition === sourceCondition)?.condition ?? "",
      persist: true,
    })));
  }

  async function analyzeFile() {
    if (!file && !temporaryUrl) return;
    setBusy("upload"); setError(""); setNotice("");
    try {
      if (mode === "AURA_JSON" && file && !temporaryUrl && file.size <= 4 * 1024 * 1024) {
        const form = new FormData();
        form.set("file", file);
        const result = await requestJson<{ jobId: string; summary: Summary }>("/api/admin/aura-import/upload", {
          method: "POST",
          body: form,
        });
        const nextJob = await requestJson<Job>(`/api/admin/aura-import/${result.jobId}/status`);
        const mappingSources = await refreshMappingSources();
        setJob(nextJob); setSummary(result.summary); hydrateConfiguration(result.summary, mappingSources.currentSupplier, mappingSources.activeFilters); setStep(2);
        setNotice("Arquivo validado. Nenhum produto do catálogo foi alterado.");
        await loadHistory();
        return;
      }

      let url = temporaryUrl;
      if (!url) {
        const uploaded = await uploadAdminFile(file!);
        if (!uploaded.url) throw new Error(uploaded.error ?? "Não foi possível enviar o arquivo.");
        url = uploaded.url;
        setTemporaryUrl(url);
      }
      const endpoint = mode === "AURA_JSON" ? "/api/admin/aura-import/upload" : "/api/admin/supplier-sync/preview";
      const result = await requestJson<{ jobId: string; summary: Summary }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ url, fileName: file?.name ?? "fornecedor.xlsx", ...(mode === "SUPPLIER_XLSX" && columnMapping.sku ? { mapping: columnMapping } : {}) }),
      });
      const nextJob = await requestJson<Job>(`/api/admin/aura-import/${result.jobId}/status`);
      const mappingSources = await refreshMappingSources();
      setJob(nextJob); setSummary(result.summary); hydrateConfiguration(result.summary, mappingSources.currentSupplier, mappingSources.activeFilters); setTemporaryUrl(""); setStep(2);
      setNotice("Arquivo validado. Nenhum produto do catálogo foi alterado.");
      await loadHistory();
    } catch (caught) {
      const details = caught as Error & { body?: { headers?: string[] } };
      setError(details.message);
      if (details.body?.headers?.length) {
        setXlsxHeaders(details.body.headers);
        setColumnMapping((current) => ({ ...current, sku: current.sku || details.body!.headers![0] || "", price: current.price || details.body!.headers![1] || "" }));
      }
    } finally { setBusy(""); }
  }

  const loadPreview = useCallback(async (page = previewPage, overrides: Partial<PreviewFilters> = {}) => {
    if (!job) return;
    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    const values: PreviewFilters = {
      action: overrides.action ?? actionFilter,
      status: overrides.status ?? statusFilter,
      brand: overrides.brand ?? brandFilter,
      group: overrides.group ?? groupFilter,
      subgroup: overrides.subgroup ?? subgroupFilter,
      optionId: overrides.optionId ?? categoryFilter,
      condition: overrides.condition ?? conditionFilter,
      availability: overrides.availability ?? availabilityFilter,
      identity: overrides.identity ?? identityFilter,
      query: overrides.query ?? query,
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value.trim()) params.set(key === "query" ? "q" : key, value.trim());
    });
    const result = await requestJson<Preview>(`/api/admin/aura-import/${job.id}/preview?${params}`);
    setPreview(result); setJob(result.job); setPreviewPage(result.page);
  }, [actionFilter, availabilityFilter, brandFilter, categoryFilter, conditionFilter, groupFilter, identityFilter, job, previewPage, query, statusFilter, subgroupFilter]);

  async function configureImport() {
    if (!job) return;
    setBusy("configure"); setError("");
    try {
      if (mode === "AURA_JSON") {
        if (categoryMappings.some((mapping) => !mapping.optionIds.length && !mapping.createIfMissing)) throw new Error("Selecione ou crie todas as categorias de origem antes de continuar.");
        if (conditionMappings.some((mapping) => !mapping.condition)) throw new Error("Mapeie todas as condições Aura antes de continuar.");
        await requestJson(`/api/admin/aura-import/${job.id}/configure`, {
          method: "POST",
          body: JSON.stringify({ exchangeRate, roundingRule, brandMappings, categories: categoryMappings, conditions: conditionMappings, markups, existing }),
        });
        const refreshedFilters = await requestJson<Filter[]>("/api/admin/filters");
        setFilters(refreshedFilters.filter((filter) => filter.active));
        let complete = false;
        while (!complete) {
          const prepared = await requestJson<{ job: Job; complete: boolean }>(`/api/admin/aura-import/${job.id}/prepare-next`, { method: "POST", body: JSON.stringify({ batchSize: 200 }) });
          setJob(prepared.job); complete = prepared.complete;
        }
      } else {
        const nextJob = await requestJson<Job>("/api/admin/supplier-sync/configure", {
          method: "POST",
          body: JSON.stringify({ jobId: job.id, exchangeRate, roundingRule, scopeBrands, markups }),
        });
        setJob(nextJob);
      }
      setStep(5); setPreviewPage(1);
      await loadPreview(1, { action: "", status: "", brand: "", group: "", subgroup: "", optionId: "", condition: "", availability: "", identity: "", query: "" });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível preparar a importação."); }
    finally { setBusy(""); }
  }

  async function processingLoop(id: string) {
    while (processingRef.current) {
      const result = await requestJson<{ job: Job; complete: boolean }>(`/api/admin/aura-import/${id}/process-next`, { method: "POST", body: JSON.stringify({ batchSize: mode === "AURA_JSON" ? 10 : 20 }) });
      setJob(result.job);
      if (result.complete) {
        processingRef.current = false;
        setIsProcessing(false);
        setStep(7); setNotice("Processamento concluído.");
        await loadHistory();
      }
    }
  }

  async function startImport() {
    if (!job) return;
    setBusy("process"); setError(""); setStep(6);
    try {
      const nextJob = await requestJson<Job>(`/api/admin/aura-import/${job.id}/apply`, { method: "POST", body: "{}" });
      setJob(nextJob); processingRef.current = true; setIsProcessing(true);
      await processingLoop(job.id);
    } catch (caught) { processingRef.current = false; setError(caught instanceof Error ? caught.message : "Falha ao processar."); }
    finally { setIsProcessing(false); setBusy(""); }
  }

  async function control(action: "pause" | "resume" | "cancel") {
    if (!job) return;
    if (action !== "resume") { processingRef.current = false; setIsProcessing(false); }
    setError("");
    try {
      const nextJob = await requestJson<Job>(`/api/admin/aura-import/${job.id}/${action}`, { method: "POST", body: "{}" });
      setJob(nextJob);
      if (action === "resume") {
        processingRef.current = true; setIsProcessing(true);
        await processingLoop(job.id);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível controlar o processamento."); }
    finally { if (action === "resume") setIsProcessing(false); }
  }

  async function continueProcessing() {
    if (!job || job.status !== "PROCESSING") return;
    processingRef.current = true; setIsProcessing(true); setBusy("process"); setError("");
    try { await processingLoop(job.id); }
    catch (caught) { processingRef.current = false; setError(caught instanceof Error ? caught.message : "Falha ao retomar o processamento."); }
    finally { setIsProcessing(false); setBusy(""); }
  }

  async function decide(item: AuraItem, decision: "approve" | "ignore") {
    if (!job) return;
    try {
      await requestJson(`/api/admin/aura-import/${job.id}/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ decision }) });
      await loadPreview();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível revisar o item."); }
  }

  async function updateItemMarkup(item: AuraItem, markupPercent: number) {
    if (!job || !Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 1000) {
      setError("Informe uma margem entre 0% e 1000%.");
      return;
    }
    const currentMarkup = Number(asObject(item.computedData).markupPercent);
    if (currentMarkup === markupPercent) return;
    setBusy(`markup:${item.id}`); setError("");
    try {
      const updated = await requestJson<AuraItem>(`/api/admin/aura-import/${job.id}/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ markupPercent }),
      });
      setPreview((current) => current ? { ...current, items: current.items.map((row) => row.id === item.id ? updated : row) } : current);
      const refreshedJob = await requestJson<Job>(`/api/admin/aura-import/${job.id}/status`);
      setJob(refreshedJob);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível alterar a margem deste produto."); }
    finally { setBusy(""); }
  }

  async function deleteHistoryItem(historyJob: Job) {
    if (!await confirmDialog({
      title: "Excluir importação",
      message: `Excluir “${historyJob.fileName}” do histórico? Importações com produtos ainda aplicados precisam ser desfeitas primeiro.`,
      confirmLabel: "Excluir",
      danger: true,
    })) return;
    setBusy(`delete:${historyJob.id}`); setError("");
    try {
      await requestJson(`/api/admin/aura-import/${historyJob.id}`, { method: "DELETE" });
      if (job?.id === historyJob.id) reset();
      await loadHistory();
      setNotice("Importação excluída do histórico.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível excluir a importação."); }
    finally { setBusy(""); }
  }

  async function openJob(historyJob: Job) {
    processingRef.current = false; setIsProcessing(false); setMode(historyJob.kind); setJob(historyJob); setSummary(historyJob.summary ?? {}); hydrateConfiguration(historyJob.summary ?? {});
    setStep(historyJob.status === "COMPLETED" || historyJob.status.includes("ROLLBACK") || historyJob.status === "CANCELLED" ? 7 : historyJob.status === "PROCESSING" || historyJob.status === "PAUSED" ? 6 : historyJob.status === "READY" ? 5 : 2);
    if (["READY", "COMPLETED", "CANCELLED", "PARTIAL_ROLLBACK", "ROLLED_BACK"].includes(historyJob.status)) {
      const result = await requestJson<Preview>(`/api/admin/aura-import/${historyJob.id}/preview?page=1&pageSize=50`);
      setPreview(result);
    }
  }

  async function rollback() {
    if (!job || !await confirmDialog({
      title: "Desfazer importação",
      message: "Desfazer com segurança tudo que ainda pode ser revertido nesta importação? Itens vinculados a pedidos serão preservados.",
      confirmLabel: "Desfazer importação",
      danger: true,
    })) return;
    setBusy("rollback");
    try {
      const result = await requestJson<{ restored: number; partial: Array<{ sku: string; reason: string }> }>(`/api/admin/aura-import/${job.id}/rollback`, { method: "POST", body: "{}" });
      setNotice(result.partial.length ? `${result.restored} item(ns) restaurados; ${result.partial.length} exigem rollback manual.` : `${result.restored} item(ns) restaurados.`);
      setJob(await requestJson<Job>(`/api/admin/aura-import/${job.id}/status`)); await loadHistory();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível desfazer."); }
    finally { setBusy(""); }
  }

  function reset() {
    processingRef.current = false; setIsProcessing(false); setStep(1); setFile(null); setTemporaryUrl(""); setJob(null); setSummary({}); setPreview(null); setError(""); setNotice(""); setXlsxHeaders([]); setBrandMappings([]); setCategoryMappings([]);
    setPreviewPage(1); setActionFilter(""); setStatusFilter(""); setBrandFilter(""); setGroupFilter(""); setSubgroupFilter(""); setCategoryFilter(""); setConditionFilter(""); setAvailabilityFilter(""); setIdentityFilter(""); setQuery("");
  }

  const total = job?.totalItems ?? summary.totalJson ?? summary.originalRows ?? 0;
  const progress = total ? Math.round(((job?.processedItems ?? 0) / total) * 100) : 0;
  const sampleMarkup = markups[0]?.markupPercent ?? 0;
  const sampleUsd = 1010;
  const converted = sampleUsd * exchangeRate;
  const sampleFinal = previewRoundedPrice(converted * (1 + sampleMarkup / 100), roundingRule);
  const brandCatalogFilter = useMemo(() => findCatalogFilter(filters, "Marca"), [filters]);
  const categoryCatalogFilter = useMemo(() => findCatalogFilter(filters, "Categoria"), [filters]);
  const brandOptions = useMemo(() => (brandCatalogFilter?.options ?? []).filter((option) => option.active), [brandCatalogFilter]);
  const categoryOptions = useMemo(() => (categoryCatalogFilter?.options ?? []).filter((option) => option.active), [categoryCatalogFilter]);
  const sourceGroups = useMemo(() => [...new Set((summary.categories ?? []).map((item) => item.sourceGroup).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [summary.categories]);
  const sourceSubgroups = useMemo(() => [...new Set((summary.categories ?? []).filter((item) => !groupFilter || item.sourceGroup === groupFilter).flatMap((item) => item.sourceSubgroups ?? []).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [groupFilter, summary.categories]);

  return <div className={styles.page}>
    <header className={styles.titlebar}>
      <div><span className={styles.eyebrow}>CATÁLOGO DROPSHIPPING</span><h1>Importação Aura</h1><p>Sincronize por SKU com prévia, lotes retomáveis e rollback seguro.</p></div>
      <div className={styles.modeSwitch} aria-label="Tipo de importação">
        <button className={mode === "AURA_JSON" ? styles.active : ""} onClick={() => { reset(); setMode("AURA_JSON"); }}><FileJson /> Catálogo Aura</button>
        <button className={mode === "SUPPLIER_XLSX" ? styles.active : ""} onClick={() => { reset(); setMode("SUPPLIER_XLSX"); }}><FileSpreadsheet /> Atualizar fornecedor</button>
      </div>
    </header>

    <nav className={styles.steps} aria-label="Etapas da importação">
      {STEPS.map((label, index) => <button key={label} className={step === index + 1 ? styles.current : step > index + 1 ? styles.done : ""} disabled={index + 1 > step} onClick={() => index + 1 < step && setStep(index + 1)}><span>{step > index + 1 ? <Check /> : index + 1}</span>{label}</button>)}
    </nav>

    {error && <div className={styles.feedbackError}><XCircle /> {error}</div>}
    {notice && <div className={styles.feedbackOk}><Check /> {notice}</div>}

    {step === 1 && <section className={styles.uploadBand}>
      <div className={styles.uploadCopy}><span><Upload /></span><div><h2>{mode === "AURA_JSON" ? "Enviar catálogo do Aura Extrator" : "Enviar lista operacional do fornecedor"}</h2><p>{mode === "AURA_JSON" ? "JSON schemaVersion 4 ou superior, até 75 MB." : "XLSX com SKU e preço USD; fotos e conteúdo não são alterados."}</p></div></div>
      <label className={styles.filePicker}><input type="file" accept={mode === "AURA_JSON" ? ".json,application/json" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setTemporaryUrl(""); setError(""); }} />{mode === "AURA_JSON" ? <FileJson /> : <FileSpreadsheet />}<span>{file?.name ?? "Selecionar arquivo"}</span>{file && <small>{(file.size / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MB</small>}</label>
      {xlsxHeaders.length > 0 && <div className={styles.columnMapping}><strong>Mapeamento manual das colunas</strong>{(["sku", "price", "brand", "name"] as const).map((field) => <label key={field}><span>{{ sku: "SKU", price: "Preço USD", brand: "Marca", name: "Produto" }[field]}</span><select value={columnMapping[field]} onChange={(event) => setColumnMapping((current) => ({ ...current, [field]: event.target.value }))}><option value="">Não mapear</option>{xlsxHeaders.map((header) => <option key={header}>{header}</option>)}</select></label>)}</div>}
      <button className="button primary" disabled={!file || Boolean(busy)} onClick={() => void analyzeFile()}>{busy === "upload" ? <LoaderCircle className="spin" /> : <ShieldCheck />} Validar arquivo</button>
    </section>}

    {step === 2 && <section className={styles.section}>
      <header><div><span className={styles.eyebrow}>VALIDAÇÃO CONCLUÍDA</span><h2>Nenhum dado do catálogo foi alterado</h2>{mode === "AURA_JSON" && <p>{job?.generator ?? "Aura Extrator"} · schema v{job?.schemaVersion ?? 4} · {(summary.totalJson ?? 0).toLocaleString("pt-BR")} registro(s)</p>}</div><ShieldCheck /></header>
      <div className={styles.metrics}>{mode === "AURA_JSON" ? <>
        <div><small>Total JSON</small><strong>{summary.totalJson ?? 0}</strong></div><div><small>Prontos</small><strong>{summary.ready ?? 0}</strong></div><div><small>Revisar</small><strong>{summary.review ?? 0}</strong></div><div><small>Erros</small><strong>{summary.errors ?? 0}</strong></div><div><small>Novos SKUs</small><strong>{summary.newSkus ?? 0}</strong></div><div><small>Existentes</small><strong>{summary.existingSkus ?? 0}</strong></div><div><small>Fotos a copiar</small><strong>{summary.photoCount ?? 0}</strong></div>
      </> : <><div><small>Linhas</small><strong>{summary.originalRows ?? 0}</strong></div><div><small>SKUs conhecidos</small><strong>{summary.knownSkus ?? 0}</strong></div><div><small>Desconhecidos</small><strong>{summary.unknownSkus ?? 0}</strong></div><div><small>Erros</small><strong>{summary.errors ?? 0}</strong></div></>}</div>
      <footer><button className="button ghost" onClick={reset}>Trocar arquivo</button><button className="button primary" onClick={() => setStep(3)}>Continuar <ArrowRight /></button></footer>
    </section>}

    {step === 3 && <section className={styles.section}>
      <header><div><span className={styles.eyebrow}>{mode === "AURA_JSON" ? "MAPEAMENTO OBRIGATÓRIO" : "PROTEÇÃO DE ESCOPO"}</span><h2>{mode === "AURA_JSON" ? "Categorias e condições" : "Quais marcas esta lista representa?"}</h2></div></header>
      {mode === "AURA_JSON" ? <>
        <div className={styles.brandMappings}><div className={styles.mappingIntro}><strong>Marcas do arquivo</strong><small>Associadas exclusivamente ao filtro Marca.</small></div>{brandMappings.map((mapping, index) => { const option = brandOptions.find((candidate) => candidate.id === mapping.optionId); const missing = !option; return <div className={`${styles.brandMapping} ${missing ? styles.brandMissing : ""}`} key={mapping.sourceBrand}><div><strong>{normalizeCatalogValue(mapping.sourceBrand)}</strong><small>{missing ? `Nova marca encontrada: ${normalizeCatalogValue(mapping.sourceBrand)}` : `Marca DroidStore: ${option.label}`}</small></div>{missing ? <label className={styles.createBrand}><input type="checkbox" checked={mapping.createIfMissing} onChange={(event) => setBrandMappings((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, createIfMissing: event.target.checked } : row))} /><span>Criar opção em Marca</span></label> : <span className={styles.mappedBadge}><Check /> Vinculada</span>}</div>; })}</div>
        <div className={styles.mappingTable}><div className={styles.mappingIntro}><strong>Grupos de origem</strong><small>Categorias novas são criadas automaticamente; você também pode vinculá-las a uma categoria existente.</small></div>{categoryMappings.map((mapping, index) => { const automatic = mapping.createIfMissing && !mapping.optionIds.length; return <div className={styles.mappingRow} key={mapping.sourceGroup}><div><strong>{mapping.sourceGroup || "Sem grupo"}</strong><small>{mapping.count} produto(s){mapping.sourceSubgroups?.length ? ` · Origem: ${mapping.sourceSubgroups.join(", ")}` : ""}</small></div><select value={automatic ? "__create__" : mapping.optionIds[0] ?? ""} onChange={(event) => { const createIfMissing = event.target.value === "__create__"; const optionIds = !createIfMissing && event.target.value ? [event.target.value] : []; setCategoryMappings((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, optionIds, createIfMissing } : row)); }}><option value="__create__">Criar automaticamente: {mapping.sourceGroup}</option><option value="">Selecionar categoria existente</option>{categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><span className={automatic ? styles.createCategoryBadge : styles.mappedBadge}>{automatic ? <><PackageCheck /> Será criada</> : <><Check /> Vinculada</>}</span></div>; })}</div>
        <div className={styles.conditionGrid}>{conditionMappings.map((mapping, index) => <label key={mapping.sourceCondition}><span>{mapping.sourceCondition}</span><select value={mapping.condition} onChange={(event) => setConditionMappings((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, condition: event.target.value } : row))}><option value="">Selecionar condição</option>{CONDITIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div>
      </> : <div className={styles.scopeGrid}>{(summary.inferredBrands ?? []).map((brand) => <label key={brand} className={scopeBrands.includes(brand) ? styles.scopeActive : ""}><input type="checkbox" checked={scopeBrands.includes(brand)} onChange={(event) => setScopeBrands((current) => event.target.checked ? [...current, brand] : current.filter((item) => item !== brand))} /><strong>{brand}</strong><small>{scopeBrands.includes(brand) ? "Dentro do escopo" : "Não será alterada"}</small></label>)}</div>}
      <div className={styles.scopeWarning}><AlertTriangle /> Somente SKUs do mesmo fornecedor e das marcas confirmadas podem ser marcados como ausentes.</div>
      <footer><button className="button ghost" onClick={() => setStep(2)}>Voltar</button><button className="button primary" onClick={() => setStep(4)}>Continuar <ArrowRight /></button></footer>
    </section>}

    {step === 4 && <section className={styles.section}>
      <header><div><span className={styles.eyebrow}>PRECIFICAÇÃO</span><h2>Cotação e margem por marca</h2><p>A cotação usada fica registrada no histórico desta importação.</p></div></header>
      <div className={styles.priceLayout}><div className={styles.priceForm}><label><span>Cotação USD</span><div className={styles.moneyInput}><b>R$</b><input type="number" min="0.01" step="0.0001" value={exchangeRate} onChange={(event) => setExchangeRate(Number(event.target.value))} /></div></label><label><span>Arredondamento</span><select value={roundingRule} onChange={(event) => setRoundingRule(event.target.value)}><option value="CEIL_10">Para cima / R$ 10</option><option value="NEAREST_10">Mais próximo / R$ 10</option><option value="CEIL_50">Para cima / R$ 50</option><option value="CEIL_100">Para cima / R$ 100</option></select></label><div className={styles.markups}>{markups.map((markup, index) => <label key={markup.brand}><span>{markup.brand}</span><div><input type="number" min="0" max="1000" value={markup.markupPercent} onChange={(event) => setMarkups((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, markupPercent: Number(event.target.value) } : row))} /><b>%</b></div></label>)}</div></div><aside className={styles.priceSample}><span>AMOSTRA</span><strong>{usd(sampleUsd)}</strong><small>{money(converted)} convertido</small><small>+ {sampleMarkup}% de margem</small><hr /><b>FINAL {money(sampleFinal)}</b></aside></div>
      {mode === "AURA_JSON" && <div className={styles.policies}><strong>Produtos existentes</strong>{Object.entries({ updateName: "Atualizar nome", updateDescription: "Sobrescrever descrição", updateImages: "Substituir fotos", replaceSpecifications: "Substituir ficha técnica", updateCategories: "Atualizar categorias" }).map(([key, label]) => <label key={key}><input type="checkbox" checked={existing[key as keyof typeof existing]} onChange={(event) => setExisting((current) => ({ ...current, [key]: event.target.checked }))} /> {label}</label>)}</div>}
      <footer><button className="button ghost" onClick={() => setStep(3)}>Voltar</button><button className="button primary" disabled={Boolean(busy)} onClick={() => void configureImport()}>{busy === "configure" ? <LoaderCircle className="spin" /> : <PackageCheck />} Calcular prévia</button></footer>
    </section>}

    {step === 5 && job && <section className={styles.section}>
      <header><div><span className={styles.eyebrow}>PRÉ-VISUALIZAÇÃO</span><h2>Exatamente o que será aplicado</h2><p>Itens em revisão ou erro não entram no processamento automático.</p></div><span className={styles.readyBadge}><Check /> Pronta</span></header>
      <div className={styles.metrics}><div><small>Criar</small><strong>{job.summary.actions?.CREATE ?? 0}</strong></div><div><small>Atualizar</small><strong>{job.summary.actions?.UPDATE ?? 0}</strong></div><div><small>Sem alteração</small><strong>{job.summary.actions?.UNCHANGED ?? 0}</strong></div><div><small>Revisar</small><strong>{job.reviewItems}</strong></div><div><small>Erros</small><strong>{job.errorItems}</strong></div></div>
      <div className={styles.previewTools}><label className={styles.previewSearch}><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar SKU, produto, modelo ou marca" onKeyDown={(event) => event.key === "Enter" && void loadPreview(1)} /></label><select value={actionFilter} onChange={(event) => setActionFilter(event.target.value as Action | "")}><option value="">Todas as ações</option>{Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Toda qualidade</option><option value="PENDING">Pronto</option><option value="REVIEW">Revisar</option><option value="ERROR">Erro</option><option value="IGNORED">Ignorado</option></select><select value={identityFilter} onChange={(event) => setIdentityFilter(event.target.value)}><option value="">Novo e existente</option><option value="new">Novo SKU</option><option value="existing">SKU existente</option></select><select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}><option value="">Toda disponibilidade</option><option value="available">Disponível</option><option value="unavailable">Indisponível</option></select><select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}><option value="">Todas as marcas</option>{(summary.brands ?? summary.inferredBrands ?? []).map((brand) => <option key={brand}>{brand}</option>)}</select><select value={groupFilter} onChange={(event) => { setGroupFilter(event.target.value); setSubgroupFilter(""); }}><option value="">Todos os grupos</option>{sourceGroups.map((group) => <option key={group}>{group}</option>)}</select><select value={subgroupFilter} onChange={(event) => setSubgroupFilter(event.target.value)}><option value="">Todos os subgrupos</option>{sourceSubgroups.map((subgroup) => <option key={subgroup}>{subgroup}</option>)}</select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">Toda categoria DroidStore</option>{categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><select value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}><option value="">Todas as condições</option>{CONDITIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="button ghost" onClick={() => void loadPreview(1)}>Aplicar filtros</button></div>
      <div className={styles.previewTable}><table><thead><tr><th>SKU / Produto</th><th>Marca</th><th>Grupo</th><th>Categoria</th><th>Condição</th><th>USD</th><th>Cotação</th><th>Custo</th><th title="Margem individual">Margem %</th><th>Lucro</th><th>Preço final</th><th>Disp.</th><th>Ação</th><th>Qualidade</th></tr></thead><tbody>{preview?.items.map((item) => {
        const source = asObject(item.sourceData);
        const computed = asObject(item.computedData);
        const image = asStrings(source.images)[0];
        const optionIds = asStrings(computed.optionIds);
        const mappedBrand = optionIds.map((id) => brandOptions.find((option) => option.id === id)).find(Boolean);
        const mappedCategory = optionIds.map((id) => categoryOptions.find((option) => option.id === id)).find(Boolean);
        const supplierPath = asStrings(source.categoryPath).join(" > ") || String(source.sourceCategory || source.sourceSubgroup || "");
        const condition = CONDITIONS.find(([value]) => value === computed.condition)?.[1] ?? String(source.sourceCondition ?? "—");
        const convertedCost = Number(computed.convertedCostBrl);
        const salePrice = Number(computed.salePriceBrl);
        const profit = Number.isFinite(convertedCost) && Number.isFinite(salePrice) ? salePrice - convertedCost : Number.NaN;
        const editableMarkup = Number(computed.priceBasisUsd) > 0;
        return <tr key={item.id}><td><div className={styles.productCell}>{image ? <img src={image} alt="" /> : <span /> }<div><strong>{item.name}</strong><small>{item.sku} · {String(source.model ?? "")}</small></div></div></td><td><strong>{item.brand || "—"}</strong><small>{mappedBrand ? `Marca: ${mappedBrand.label}` : "Marca não vinculada"}</small></td><td>{item.sourceGroup || "—"}<small>{supplierPath}</small></td><td>{mappedCategory?.label || "—"}</td><td>{condition}</td><td>{usd(source.supplierPriceUsd ?? source.lastKnownPriceUsd)}</td><td>{computed.exchangeRate ? money(computed.exchangeRate) : "—"}</td><td>{money(computed.convertedCostBrl)}</td><td>{editableMarkup ? <label className={styles.marginEditor}><input key={`${item.id}:${computed.markupPercent}`} type="number" min="0" max="1000" step="0.1" defaultValue={Number(computed.markupPercent ?? 0)} disabled={busy === `markup:${item.id}`} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} onBlur={(event) => void updateItemMarkup(item, Number(event.currentTarget.value))} /><span>%</span></label> : "—"}</td><td><strong className={styles.profit}>{Number.isFinite(profit) ? money(profit) : "—"}</strong></td><td><strong>{money(computed.salePriceBrl)}</strong></td><td>{source.available === true ? "Sim" : "Não"}</td><td><span className={`${styles.action} ${styles[item.action.toLowerCase()]}`}>{ACTION_LABELS[item.action]}</span></td><td>{item.messages?.length ? <div className={styles.quality}><AlertTriangle /><span>{item.messages[0]?.message}</span>{item.action === "REVIEW" && <div><button onClick={() => void decide(item, "approve")}>Aprovar</button><button onClick={() => void decide(item, "ignore")}>Ignorar</button></div>}</div> : <span className={styles.qualityOk}><Check /> OK</span>}</td></tr>;
      })}</tbody></table></div>
      <div className={styles.pagination}><button disabled={(preview?.page ?? 1) <= 1} onClick={() => void loadPreview((preview?.page ?? 1) - 1)}>Anterior</button><span>Página {preview?.page ?? 1} de {preview?.pages ?? 1} · {preview?.total ?? 0} itens</span><button disabled={(preview?.page ?? 1) >= (preview?.pages ?? 1)} onClick={() => void loadPreview((preview?.page ?? 1) + 1)}>Próxima</button></div>
      <footer><a className="button ghost" href={`/api/admin/aura-import/${job.id}/errors`}><Download /> Exportar pendências</a><button className="button primary" disabled={Boolean(busy)} onClick={() => void startImport()}><PackageCheck /> Confirmar e processar</button></footer>
    </section>}

    {step === 6 && job && <section className={styles.section}>
      <header><div><span className={styles.eyebrow}>PROCESSAMENTO EM LOTES</span><h2>{job.status === "PAUSED" ? "Importação pausada" : job.status === "CANCELLED" ? "Importação cancelada" : "Aplicando catálogo"}</h2><p>Você pode fechar a página; o progresso fica salvo e poderá ser retomado.</p></div><LoaderCircle className={job.status === "PROCESSING" ? "spin" : ""} /></header>
      <div className={styles.progress}><div><span style={{ width: `${progress}%` }} /></div><strong>{job.processedItems.toLocaleString("pt-BR")} / {job.totalItems.toLocaleString("pt-BR")}</strong><small>{progress}%</small></div>
      <div className={styles.metrics}><div><small>Criados</small><strong>{job.createdItems}</strong></div><div><small>Atualizados</small><strong>{job.updatedItems}</strong></div><div><small>Sem alteração</small><strong>{job.unchangedItems}</strong></div><div><small>Revisar</small><strong>{job.reviewItems}</strong></div><div><small>Erros</small><strong>{job.errorItems}</strong></div></div>
      <footer>{job.status === "PROCESSING" && isProcessing && <button className="button ghost" onClick={() => void control("pause")}><CirclePause /> Pausar</button>}{job.status === "PROCESSING" && !isProcessing && <button className="button primary" disabled={busy === "process"} onClick={() => void continueProcessing()}><CirclePlay /> Continuar processamento</button>}{job.status === "PAUSED" && <button className="button primary" onClick={() => void control("resume")}><CirclePlay /> Retomar</button>}<button className="button danger" disabled={job.status === "CANCELLED"} onClick={() => void control("cancel")}><XCircle /> Cancelar</button></footer>
    </section>}

    {step === 7 && job && <section className={styles.section}>
      <header><div><span className={styles.eyebrow}>RESULTADO</span><h2>{job.status === "COMPLETED" ? "Importação concluída" : job.status === "ROLLED_BACK" ? "Importação desfeita" : job.status === "PARTIAL_ROLLBACK" ? "Rollback parcial necessário" : "Processamento encerrado"}</h2><p>{job.fileName}</p></div><PackageCheck /></header>
      <div className={styles.metrics}><div><small>Total</small><strong>{job.totalItems}</strong></div><div><small>Criados</small><strong>{job.createdItems}</strong></div><div><small>Atualizados</small><strong>{job.updatedItems}</strong></div><div><small>Sem alteração</small><strong>{job.unchangedItems}</strong></div><div><small>Revisar</small><strong>{job.reviewItems}</strong></div><div><small>Erros</small><strong>{job.errorItems}</strong></div></div>
      <footer><a className="button ghost" href={`/api/admin/aura-import/${job.id}/errors`}><Download /> Exportar erros</a>{job.status === "COMPLETED" && <button className="button danger" disabled={busy === "rollback"} onClick={() => void rollback()}><RefreshCcw /> Desfazer importação</button>}<button className="button primary" onClick={reset}>Nova importação</button></footer>
    </section>}

    <section className={styles.history}>
      <header><div><History /><div><h2>Histórico de importações</h2><p>Jobs Aura e atualizações operacionais do fornecedor.</p></div></div></header>
      {history.length === 0 ? <p className={styles.empty}>Nenhuma importação registrada.</p> : <div>{history.map((item) => <div className={styles.historyRow} key={item.id}><button className={styles.historyOpen} onClick={() => void openJob(item)}><span className={item.kind === "AURA_JSON" ? styles.jsonIcon : styles.sheetIcon}>{item.kind === "AURA_JSON" ? <FileJson /> : <FileSpreadsheet />}</span><div><strong>{item.fileName}</strong><small>{new Date(item.createdAt).toLocaleString("pt-BR")} · {item.supplier?.name ?? "Atacado Connect"} · {item.createdByName ?? "Administrador"}{item.exchangeRate ? ` · USD ${Number(item.exchangeRate).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : ""}{item.startedAt && item.completedAt ? ` · ${Math.max(1, Math.round((new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()) / 1000))}s` : ""}</small></div><span>{item.totalItems} itens</span><em data-status={item.status}>{item.status.replaceAll("_", " ")}</em><ArrowRight /></button><button className={styles.historyDelete} disabled={busy === `delete:${item.id}`} onClick={() => void deleteHistoryItem(item)} aria-label={`Excluir ${item.fileName}`} title="Excluir do histórico"><Trash2 /></button></div>)}</div>}
    </section>
  </div>;
}
