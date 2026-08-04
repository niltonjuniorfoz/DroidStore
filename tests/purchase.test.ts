import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { unitCostBrl, weightedAverageCost } from "../src/lib/purchase";

describe("unitCostBrl", () => {
  it("converte moeda e rateia o frete", () => {
    // 10 aparelhos a US$ 500, dólar 5,20, frete total R$ 260 → 500*5,20 + 26 = 2.626
    assert.equal(unitCostBrl(500, 5.2, 260, 10), 2626);
  });

  it("BRL usa cotação 1", () => {
    assert.equal(unitCostBrl(1800, 1, 0, 5), 1800);
  });

  it("arredonda para centavos", () => {
    assert.equal(unitCostBrl(333.33, 5.1234, 100, 3), round(333.33 * 5.1234 + 100 / 3));
  });

  it("rejeita quantidade zero ou negativa", () => {
    assert.throws(() => unitCostBrl(100, 5, 0, 0));
    assert.throws(() => unitCostBrl(100, 5, 0, -2));
  });
});

function round(value: number) {
  return Math.round(value * 100) / 100;
}

describe("weightedAverageCost", () => {
  it("faz média ponderada entre estoque atual e lote novo", () => {
    // 4 unidades a R$ 2.000 + 6 unidades a R$ 2.500 → (8000+15000)/10 = 2.300
    assert.equal(weightedAverageCost(4, 2000, 6, 2500), 2300);
  });

  it("estoque zerado assume o custo do lote", () => {
    assert.equal(weightedAverageCost(0, 2000, 5, 2600), 2600);
  });

  it("custo atual zerado (nunca informado) assume o custo do lote", () => {
    assert.equal(weightedAverageCost(10, 0, 5, 2600), 2600);
  });

  it("estoque negativo é tratado como zero", () => {
    assert.equal(weightedAverageCost(-3, 2000, 5, 2600), 2600);
  });
});
