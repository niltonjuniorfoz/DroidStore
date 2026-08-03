import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canTransition, orderTransitions, shouldRestock } from "../src/lib/orderStatus";

describe("canTransition", () => {
  it("permite o fluxo feliz", () => {
    assert.equal(canTransition("PENDING", "PAID"), true);
    assert.equal(canTransition("PAID", "SHIPPED"), true);
    assert.equal(canTransition("SHIPPED", "DELIVERED"), true);
  });

  it("permite cancelar/reembolsar pedido pago (arrependimento, defeito, chargeback)", () => {
    assert.equal(canTransition("PAID", "CANCELLED"), true);
    assert.equal(canTransition("PAID", "REFUNDED"), true);
    assert.equal(canTransition("SHIPPED", "REFUNDED"), true);
    assert.equal(canTransition("DELIVERED", "REFUNDED"), true);
  });

  it("permite no-op (salvar rastreio sem mudar status)", () => {
    assert.equal(canTransition("SHIPPED", "SHIPPED"), true);
    assert.equal(canTransition("CANCELLED", "CANCELLED"), true);
  });

  it("bloqueia transições inválidas", () => {
    assert.equal(canTransition("PENDING", "SHIPPED"), false);
    assert.equal(canTransition("PENDING", "DELIVERED"), false);
    assert.equal(canTransition("DELIVERED", "PAID"), false);
    assert.equal(canTransition("CANCELLED", "PAID"), false);
    assert.equal(canTransition("REFUNDED", "PAID"), false);
    assert.equal(canTransition("SHIPPED", "CANCELLED"), false);
  });

  it("estados terminais não têm saída", () => {
    assert.deepEqual(orderTransitions.CANCELLED, []);
    assert.deepEqual(orderTransitions.REFUNDED, []);
  });
});

describe("shouldRestock", () => {
  it("devolve estoque quando o aparelho nunca saiu da loja", () => {
    assert.equal(shouldRestock("PENDING", "CANCELLED"), true);
    assert.equal(shouldRestock("PAID", "CANCELLED"), true);
    assert.equal(shouldRestock("PAID", "REFUNDED"), true);
  });

  it("não devolve estoque após envio (devolução física é manual)", () => {
    assert.equal(shouldRestock("SHIPPED", "REFUNDED"), false);
    assert.equal(shouldRestock("DELIVERED", "REFUNDED"), false);
  });

  it("não devolve estoque em transições que não encerram o pedido", () => {
    assert.equal(shouldRestock("PENDING", "PAID"), false);
    assert.equal(shouldRestock("PAID", "SHIPPED"), false);
    assert.equal(shouldRestock("CANCELLED", "CANCELLED"), false);
    assert.equal(shouldRestock("REFUNDED", "REFUNDED"), false);
  });
});
