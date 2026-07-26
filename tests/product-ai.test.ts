import assert from "node:assert/strict";
import test from "node:test";
import { parseGeneratedProduct } from "../src/lib/productAi";

const description = "Um smartphone Android rápido e equilibrado, com armazenamento amplo para aplicativos, fotos e arquivos do dia a dia.";

test("aceita o formato padrão do Ollama", () => {
  const result = parseGeneratedProduct(JSON.stringify({
    description,
    specifications: [{ label: "Armazenamento", value: "256 GB" }],
  }));
  assert.equal(result.specifications[0].label, "Armazenamento");
});

test("aceita chaves em português e bloco markdown", () => {
  const result = parseGeneratedProduct(`\`\`\`json
  ${JSON.stringify({
    descricao: description,
    especificacoes: [{ nome: "Memória RAM", valor: "8 GB" }],
  })}
  \`\`\``);
  assert.equal(result.specifications[0].value, "8 GB");
});

test("aceita especificações no formato de objeto", () => {
  const result = parseGeneratedProduct(JSON.stringify({
    description,
    specs: { Cor: "Preto", Modelo: "Galaxy S24" },
  }));
  assert.equal(result.specifications.length, 2);
});
