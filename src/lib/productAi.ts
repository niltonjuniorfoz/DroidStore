import { z } from "zod";

export const generatedProductSchema = z.object({
  description: z.string().trim().min(20).max(5000),
  specifications: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(500),
  })).min(1).max(60),
});

export const PRODUCT_SPECIFICATION_GUIDE = [
  "Modelo",
  "Referência",
  "Sistema operacional",
  "Capacidade",
  "Memória RAM",
  "Processador",
  "Placa gráfica",
  "Chipset",
  "Rede 2G",
  "Rede 3G",
  "Rede 4G",
  "Rede 5G",
  "Cartão SIM",
  "Conectividade wireless",
  "Navegação",
  "Tipo de tela",
  "Tamanho da tela",
  "Resolução da tela",
  "Câmera traseira",
  "Câmera frontal",
  "Áudio",
  "Bateria",
  "Carregamento rápido",
  "Sensores",
  "Cor",
  "Recursos",
] as const;

export function parseGeneratedProduct(content: string) {
  const withoutFence = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON_NOT_FOUND");

  const raw = JSON.parse(withoutFence.slice(start, end + 1)) as Record<string, unknown>;
  const description = raw.description ?? raw.descricao ?? raw["descrição"];
  const source = raw.specifications ?? raw.especificacoes ?? raw["especificações"] ?? raw.specs;
  const specifications = Array.isArray(source)
    ? source.map((item) => {
      const entry = item as Record<string, unknown>;
      return {
        label: entry.label ?? entry.nome ?? entry.chave ?? entry.atributo,
        value: entry.value ?? entry.valor ?? entry.conteudo ?? entry["conteúdo"],
      };
    })
    : source && typeof source === "object"
      ? Object.entries(source).map(([label, value]) => ({ label, value }))
      : [];

  return generatedProductSchema.parse({ description, specifications });
}
