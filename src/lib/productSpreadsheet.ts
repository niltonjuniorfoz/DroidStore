import ExcelJS from "exceljs";
import prisma from "./prisma";

export type ProductSpreadsheetState = {
  price: string;
  costPrice: string;
  stock: number;
  active: boolean;
};

export type ProductSpreadsheetChange = {
  variantId: string;
  productId: string;
  productName: string;
  brand: string;
  sheet: string;
  row: number;
  before: ProductSpreadsheetState;
  after: ProductSpreadsheetState;
  fields: Array<"price" | "costPrice" | "stock" | "active">;
};

export type ProductSpreadsheetError = {
  sheet: string;
  row: number;
  id?: string;
  message: string;
};

export type ProductSpreadsheetPreview = {
  totalRows: number;
  changedRows: number;
  unchangedRows: number;
  priceChanges: number;
  costChanges: number;
  stockChanges: number;
  statusChanges: number;
  increases: number;
  decreases: number;
  stockIncreases: number;
  stockDecreases: number;
  stockZeroed: number;
  errors: ProductSpreadsheetError[];
  changes: ProductSpreadsheetChange[];
  canApply: boolean;
};

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_ROWS = 20_000;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (value && typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  return cell.text.trim();
}

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (comma >= 0) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function parseStock(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isInteger(parsed) ? parsed : null;
}

function parseStatus(value: string): boolean | null {
  const status = normalize(value);
  if (["ATIVO", "ATIVA", "SIM", "TRUE", "1"].includes(status)) return true;
  if (["INATIVO", "INATIVA", "NAO", "FALSE", "0"].includes(status)) return false;
  return null;
}

function decimal(value: unknown) {
  return Number(value).toFixed(2);
}

function safeSheetName(brand: string, used: Set<string>) {
  const base = (brand || "Sem marca").replace(/[\\/*?:\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Sem marca";
  let name = base;
  let suffix = 2;
  while (used.has(normalize(name))) {
    const ending = ` (${suffix++})`;
    name = `${base.slice(0, 31 - ending.length)}${ending}`;
  }
  used.add(normalize(name));
  return name;
}

export async function createProductsWorkbook(includeCost: boolean) {
  const products = await prisma.product.findMany({
    include: { variants: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
  });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DroidStore";
  workbook.created = new Date();
  workbook.modified = new Date();

  const guide = workbook.addWorksheet("INSTRUÇÕES", { views: [{ state: "frozen", ySplit: 1 }] });
  guide.columns = [{ width: 100 }];
  guide.addRow(["PLANILHA DE PRODUTOS — DROIDSTORE"]);
  guide.addRow(["Edite somente as colunas verdes: preço de venda, estoque, status e, para o administrador principal, preço de custo."]);
  guide.addRow(["Não altere o ID. Ele identifica exatamente qual item será atualizado."]);
  guide.addRow(["Status aceitos: ATIVO ou INATIVO. Preços não podem ser negativos e o estoque deve ser um número inteiro a partir de zero."]);
  guide.addRow(["Depois de editar, salve o arquivo .xlsx e envie na tela Planilha de produtos. Nada será salvo antes da sua confirmação."]);
  guide.getRow(1).height = 30;
  guide.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  guide.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF11241F" } };
  for (let row = 2; row <= 5; row++) {
    guide.getCell(row, 1).alignment = { wrapText: true, vertical: "middle" };
    guide.getRow(row).height = 34;
  }
  await guide.protect("DroidStore", { selectLockedCells: true, selectUnlockedCells: true });

  const byBrand = new Map<string, typeof products>();
  for (const product of products) {
    const list = byBrand.get(product.brand) ?? [];
    list.push(product);
    byBrand.set(product.brand, list);
  }

  const usedNames = new Set<string>([normalize("INSTRUÇÕES")]);
  for (const [brand, brandProducts] of byBrand) {
    const sheet = workbook.addWorksheet(safeSheetName(brand, usedNames), {
      views: [{ state: "frozen", ySplit: 1 }],
      properties: { defaultRowHeight: 21 },
    });
    const columns: Partial<ExcelJS.Column>[] = [
      { header: "ID", key: "id", width: 12 },
      { header: "Produto", key: "product", width: 46 },
      { header: "Marca", key: "brand", width: 18 },
      { header: "Cor", key: "color", width: 20 },
      { header: "Capacidade", key: "storage", width: 15 },
      { header: "Condição", key: "condition", width: 19 },
      ...(includeCost ? [{ header: "Custo", key: "cost", width: 15 }] : []),
      { header: "Venda", key: "price", width: 15 },
      { header: "Estoque", key: "stock", width: 12 },
      { header: "Status", key: "status", width: 13 },
    ];
    sheet.columns = columns;
    const editableKeys = new Set([...(includeCost ? ["cost"] : []), "price", "stock", "status"]);
    const header = sheet.getRow(1);
    header.height = 28;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF11241F" } };
      cell.alignment = { vertical: "middle" };
    });

    for (const product of brandProducts) {
      for (const variant of product.variants) {
        const row = sheet.addRow({
          id: variant.id,
          product: product.name,
          brand: product.brand,
          color: variant.color ?? "",
          storage: variant.storage ?? "",
          condition: variant.condition.replaceAll("_", " "),
          ...(includeCost ? { cost: Number(variant.costPrice) } : {}),
          price: Number(variant.price),
          stock: variant.stock,
          status: product.active ? "ATIVO" : "INATIVO",
        });
        row.eachCell((cell, columnNumber) => {
          const key = String(columns[columnNumber - 1]?.key ?? "");
          const editable = editableKeys.has(key);
          cell.protection = { locked: !editable };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: editable ? "FFE9FBEF" : "FFF5F7F6" } };
          cell.border = { bottom: { style: "hair", color: { argb: "FFDDE5E1" } } };
          if (key === "cost" || key === "price") cell.numFmt = 'R$ #,##0.00';
          if (key === "status") {
            cell.dataValidation = { type: "list", allowBlank: false, formulae: ['"ATIVO,INATIVO"'], showErrorMessage: true, errorTitle: "Status inválido", error: "Escolha ATIVO ou INATIVO." };
          }
          if (key === "stock") {
            cell.dataValidation = { type: "whole", operator: "greaterThanOrEqual", formulae: [0], allowBlank: false, showErrorMessage: true, errorTitle: "Estoque inválido", error: "Use um número inteiro a partir de zero." };
          }
        });
      }
    }
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: columns.length } };
    await sheet.protect("DroidStore", {
      selectLockedCells: true,
      selectUnlockedCells: true,
      autoFilter: true,
      sort: true,
      formatColumns: false,
      formatRows: false,
      insertRows: false,
      deleteRows: false,
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

type ParsedRow = {
  sheet: string;
  row: number;
  id: string;
  priceText: string;
  costText?: string;
  stockText: string;
  statusText: string;
};

export async function previewProductsWorkbook(buffer: Buffer, canEditCost: boolean): Promise<ProductSpreadsheetPreview> {
  if (buffer.byteLength > MAX_FILE_SIZE) throw new Error("A planilha deve ter no máximo 12 MB.");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new Error("Não foi possível ler o arquivo. Envie uma planilha .xlsx válida.");
  }

  const rows: ParsedRow[] = [];
  const errors: ProductSpreadsheetError[] = [];
  for (const sheet of workbook.worksheets) {
    if (normalize(sheet.name) === "INSTRUCOES") continue;
    const headerRow = sheet.getRow(1);
    const headers = new Map<string, number>();
    headerRow.eachCell((cell, column) => headers.set(normalize(cellText(cell)), column));
    const idColumn = headers.get("ID");
    const priceColumn = headers.get("VENDA") ?? headers.get("PRECO DE VENDA");
    const costColumn = headers.get("CUSTO") ?? headers.get("PRECO DE CUSTO");
    const stockColumn = headers.get("ESTOQUE") ?? headers.get("QUANTIDADE");
    const statusColumn = headers.get("STATUS");
    if (!idColumn && sheet.actualRowCount <= 1) continue;
    if (!idColumn || !priceColumn || !stockColumn || !statusColumn) {
      errors.push({ sheet: sheet.name, row: 1, message: "A aba não possui as colunas obrigatórias ID, Venda, Estoque e Status." });
      continue;
    }
    for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const id = cellText(row.getCell(idColumn));
      const rowValues = Array.isArray(row.values) ? row.values : [];
      if (!id && rowValues.every((value) => !value)) continue;
      if (!id) {
        errors.push({ sheet: sheet.name, row: rowNumber, message: "ID ausente." });
        continue;
      }
      rows.push({
        sheet: sheet.name,
        row: rowNumber,
        id,
        priceText: cellText(row.getCell(priceColumn)),
        costText: costColumn ? cellText(row.getCell(costColumn)) : undefined,
        stockText: cellText(row.getCell(stockColumn)),
        statusText: cellText(row.getCell(statusColumn)),
      });
    }
  }

  if (rows.length > MAX_ROWS) throw new Error(`A planilha ultrapassa o limite de ${MAX_ROWS.toLocaleString("pt-BR")} linhas.`);
  if (!rows.length && !errors.length) throw new Error("Nenhuma linha de produto foi encontrada na planilha.");

  const seenIds = new Set<string>();
  for (const row of rows) {
    if (seenIds.has(row.id)) errors.push({ sheet: row.sheet, row: row.row, id: row.id, message: "ID repetido na planilha." });
    seenIds.add(row.id);
  }
  const variants = await prisma.variant.findMany({
    where: { id: { in: [...seenIds] } },
    include: { product: { select: { id: true, name: true, brand: true, active: true } } },
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const requestedProductStatuses = new Map<string, boolean>();
  const changes: ProductSpreadsheetChange[] = [];
  let unchangedRows = 0;

  for (const row of rows) {
    const variant = byId.get(row.id);
    if (!variant) {
      errors.push({ sheet: row.sheet, row: row.row, id: row.id, message: "ID não encontrado no catálogo." });
      continue;
    }
    const price = parseMoney(row.priceText);
    const cost = row.costText === undefined || row.costText === "" ? Number(variant.costPrice) : parseMoney(row.costText);
    const stock = parseStock(row.stockText);
    const active = parseStatus(row.statusText);
    if (price === null || price <= 0 || price > 1_000_000) errors.push({ sheet: row.sheet, row: row.row, id: row.id, message: "Preço de venda inválido." });
    if (cost === null || cost < 0 || cost > 1_000_000) errors.push({ sheet: row.sheet, row: row.row, id: row.id, message: "Preço de custo inválido." });
    if (!canEditCost && cost !== Number(variant.costPrice)) errors.push({ sheet: row.sheet, row: row.row, id: row.id, message: "Seu usuário não tem permissão para alterar o custo." });
    if (stock === null || stock < 0 || stock > 100_000) errors.push({ sheet: row.sheet, row: row.row, id: row.id, message: "Estoque deve ser um número inteiro entre 0 e 100.000." });
    if (active === null) errors.push({ sheet: row.sheet, row: row.row, id: row.id, message: "Status deve ser ATIVO ou INATIVO." });
    if (price === null || cost === null || stock === null || active === null || price <= 0 || price > 1_000_000 || cost < 0 || cost > 1_000_000 || stock < 0 || stock > 100_000 || (!canEditCost && cost !== Number(variant.costPrice))) continue;

    const previousStatus = requestedProductStatuses.get(variant.productId);
    if (previousStatus !== undefined && previousStatus !== active) {
      errors.push({ sheet: row.sheet, row: row.row, id: row.id, message: "As variações do mesmo produto possuem status diferentes." });
      continue;
    }
    requestedProductStatuses.set(variant.productId, active);
    const before = { price: decimal(variant.price), costPrice: decimal(variant.costPrice), stock: variant.stock, active: variant.product.active };
    const after = { price: price.toFixed(2), costPrice: cost.toFixed(2), stock, active };
    const fields: ProductSpreadsheetChange["fields"] = [];
    if (before.price !== after.price) fields.push("price");
    if (before.costPrice !== after.costPrice) fields.push("costPrice");
    if (before.stock !== after.stock) fields.push("stock");
    if (before.active !== after.active) fields.push("active");
    if (!fields.length) unchangedRows++;
    else changes.push({ variantId: variant.id, productId: variant.productId, productName: variant.product.name, brand: variant.product.brand, sheet: row.sheet, row: row.row, before, after, fields });
  }

  const preview: ProductSpreadsheetPreview = {
    totalRows: rows.length,
    changedRows: changes.length,
    unchangedRows,
    priceChanges: changes.filter((change) => change.fields.includes("price")).length,
    costChanges: changes.filter((change) => change.fields.includes("costPrice")).length,
    stockChanges: changes.filter((change) => change.fields.includes("stock")).length,
    statusChanges: changes.filter((change) => change.fields.includes("active")).length,
    increases: changes.filter((change) => change.fields.includes("price") && Number(change.after.price) > Number(change.before.price)).length,
    decreases: changes.filter((change) => change.fields.includes("price") && Number(change.after.price) < Number(change.before.price)).length,
    stockIncreases: changes.filter((change) => change.fields.includes("stock") && change.after.stock > change.before.stock).length,
    stockDecreases: changes.filter((change) => change.fields.includes("stock") && change.after.stock < change.before.stock).length,
    stockZeroed: changes.filter((change) => change.fields.includes("stock") && change.after.stock === 0).length,
    errors: errors.slice(0, 250),
    changes,
    canApply: errors.length === 0 && changes.length > 0,
  };
  return preview;
}
