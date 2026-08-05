import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  breakEvenPrice,
  cardFeeRate,
  GATEWAY_FEES,
  installmentLadder,
  marginOf,
  maxPurchasePrice,
  netAfterFee,
  pixPrice,
  reorderSuggestion,
} from "../src/lib/pricing";

describe("pixPrice", () => {
  it("aplica o desconto da loja", () => {
    assert.equal(pixPrice(1399, 5), 1329.05);
    assert.equal(pixPrice(1000, 10), 900);
    assert.equal(pixPrice(1000, 0), 1000);
  });
});

describe("netAfterFee", () => {
  it("desconta a taxa do gateway", () => {
    assert.equal(netAfterFee(1000, GATEWAY_FEES.pix), 990.1);
    assert.equal(netAfterFee(1000, GATEWAY_FEES.cardOnSight), 950.2);
  });
});

describe("cardFeeRate", () => {
  it("cresce com o número de parcelas", () => {
    assert.equal(cardFeeRate(1), GATEWAY_FEES.cardInstallmentBase);
    assert.ok(cardFeeRate(6) > cardFeeRate(1));
    assert.ok(cardFeeRate(12) > cardFeeRate(6));
  });
});

describe("installmentLadder", () => {
  it("gera uma linha por parcela com valor e lucro", () => {
    const rows = installmentLadder(1200, 800, 12);
    assert.equal(rows.length, 12);
    assert.equal(rows[0].installments, 1);
    assert.equal(rows[0].installmentValue, 1200);
    assert.equal(rows[11].installmentValue, 100);
    assert.equal(rows[11].total, 1200);
  });

  it("lucro cai conforme a loja absorve mais parcelas", () => {
    const rows = installmentLadder(1200, 800, 12);
    assert.ok(rows[0].profit > rows[11].profit);
  });

  it("respeita o limite de 1 a 24 parcelas", () => {
    assert.equal(installmentLadder(1000, 500, 0).length, 1);
    assert.equal(installmentLadder(1000, 500, 99).length, 24);
  });
});

describe("maxPurchasePrice", () => {
  it("responde quanto posso pagar mantendo a margem alvo", () => {
    // Venda 1000 no PIX, quero 30% de margem líquida
    const max = maxPurchasePrice(1000, 30, GATEWAY_FEES.pix);
    assert.equal(max, 693.07);
    // Comprando nesse preço, a margem real bate o alvo
    const net = netAfterFee(1000, GATEWAY_FEES.pix);
    assert.ok(Math.abs(((net - max) / net) * 100 - 30) < 0.1);
  });

  it("nunca devolve valor negativo", () => {
    assert.equal(maxPurchasePrice(100, 200, GATEWAY_FEES.pix), 0);
  });
});

describe("breakEvenPrice", () => {
  it("preço mínimo cobre custo e taxa", () => {
    const floor = breakEvenPrice(950, GATEWAY_FEES.pix);
    assert.ok(floor > 950);
    assert.ok(Math.abs(netAfterFee(floor, GATEWAY_FEES.pix) - 950) < 0.5);
  });
});

describe("marginOf", () => {
  it("calcula lucro, margem e markup", () => {
    const result = marginOf(1399, 890);
    assert.equal(result.profit, 509);
    assert.equal(result.marginPct, 36.38);
    assert.equal(result.markupPct, 57.19);
  });

  it("markup é nulo quando não há custo informado", () => {
    assert.equal(marginOf(1000, 0).markupPct, null);
  });
});

describe("reorderSuggestion", () => {
  it("sugere compra pelo ritmo de venda e cobertura", () => {
    // Vende 5/mês, quer 2 meses de cobertura, tem 3 em estoque → comprar 7
    assert.deepEqual(reorderSuggestion(5, 3, 2), { targetUnits: 10, unitsToBuy: 7 });
  });

  it("não sugere compra com estoque suficiente", () => {
    assert.deepEqual(reorderSuggestion(2, 10, 2), { targetUnits: 4, unitsToBuy: 0 });
  });
});
