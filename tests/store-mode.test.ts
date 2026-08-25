import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ProductUnavailableError,
  recordOrderSaleMovements,
  reserveVariantForOrder,
  restoreOrderInventory,
} from "../src/lib/orderInventory";
import {
  DEFAULT_STORE_MODE,
  isCatalogProductAvailable,
  isVariantAvailable,
  normalizeStoreMode,
  reservesInventory,
} from "../src/lib/storeMode";

type Transaction = Parameters<typeof reserveVariantForOrder>[0];

function fakeTransaction(initialStock: number) {
  let stock = initialStock;
  const movements: Array<{ type: string; quantity: number }> = [];
  const tx = {
    variant: {
      async updateMany(args: { where: { stock: { gte: number } }; data: { stock: { decrement: number } } }) {
        if (stock < args.where.stock.gte) return { count: 0 };
        stock -= args.data.stock.decrement;
        return { count: 1 };
      },
      async update(args: { data: { stock: { increment: number } } }) {
        stock += args.data.stock.increment;
        return {};
      },
    },
    stockMovement: {
      async create(args: { data: { type: string; quantity: number } }) {
        movements.push({ type: args.data.type, quantity: args.data.quantity });
        return {};
      },
      async createMany(args: { data: Array<{ type: string; quantity: number }> }) {
        movements.push(...args.data.map((item) => ({ type: item.type, quantity: item.quantity })));
        return { count: args.data.length };
      },
    },
  } as unknown as Transaction;
  return { tx, stock: () => stock, movements };
}

describe("disponibilidade por modo de operação", () => {
  it("mantém INVENTORY como padrão retrocompatível", () => {
    assert.equal(DEFAULT_STORE_MODE, "INVENTORY");
    assert.equal(normalizeStoreMode(undefined), "INVENTORY");
    assert.equal(reservesInventory("INVENTORY"), true);
    assert.equal(reservesInventory("DROPSHIPPING"), false);
  });

  it("INVENTORY usa somente a quantidade física", () => {
    assert.equal(isVariantAvailable({ storeMode: "INVENTORY", stock: 1, dropshipAvailable: false }), true);
    assert.equal(isVariantAvailable({ storeMode: "INVENTORY", stock: 0, dropshipAvailable: true }), false);
    assert.equal(isCatalogProductAvailable({ stock: 2, available: true }), true);
  });

  it("DROPSHIPPING usa somente a disponibilidade do fornecedor", () => {
    assert.equal(isVariantAvailable({ storeMode: "DROPSHIPPING", stock: 0, dropshipAvailable: true }), true);
    assert.equal(isVariantAvailable({ storeMode: "DROPSHIPPING", stock: 500, dropshipAvailable: false }), false);
  });
});

describe("reserva no checkout", () => {
  it("INVENTORY decrementa stock 5 para 4", async () => {
    const fake = fakeTransaction(5);
    await reserveVariantForOrder(fake.tx, {
      variant: { id: "v1", stock: 5, dropshipAvailable: false, productName: "Produto" },
      quantity: 1,
      storeMode: "INVENTORY",
    });
    assert.equal(fake.stock(), 4);
  });

  it("INVENTORY rejeita stock zero", async () => {
    const fake = fakeTransaction(0);
    await assert.rejects(
      reserveVariantForOrder(fake.tx, {
        variant: { id: "v1", stock: 0, dropshipAvailable: true, productName: "Produto" },
        quantity: 1,
        storeMode: "INVENTORY",
      }),
      (error: unknown) => error instanceof ProductUnavailableError && error.reason === "OUT_OF_STOCK",
    );
  });

  it("DROPSHIPPING aceita disponível sem alterar stock ou criar SALE", async () => {
    const fake = fakeTransaction(0);
    await reserveVariantForOrder(fake.tx, {
      variant: { id: "v1", stock: 0, dropshipAvailable: true, productName: "Produto" },
      quantity: 1,
      storeMode: "DROPSHIPPING",
    });
    await recordOrderSaleMovements(fake.tx, {
      orderId: "12345678-order",
      inventoryReserved: false,
      items: [{ variantId: "v1", quantity: 1 }],
    });
    assert.equal(fake.stock(), 0);
    assert.deepEqual(fake.movements, []);
  });

  it("DROPSHIPPING rejeita indisponível mesmo com stock alto", async () => {
    const fake = fakeTransaction(500);
    await assert.rejects(
      reserveVariantForOrder(fake.tx, {
        variant: { id: "v1", stock: 500, dropshipAvailable: false, productName: "Produto" },
        quantity: 1,
        storeMode: "DROPSHIPPING",
      }),
      (error: unknown) => error instanceof ProductUnavailableError && error.reason === "DROPSHIP_UNAVAILABLE",
    );
    assert.equal(fake.stock(), 500);
  });

  it("INVENTORY registra SALE e usa inventoryReserved true", async () => {
    const fake = fakeTransaction(5);
    await recordOrderSaleMovements(fake.tx, {
      orderId: "12345678-order",
      inventoryReserved: reservesInventory("INVENTORY"),
      items: [{ variantId: "v1", quantity: 1 }],
    });
    assert.deepEqual(fake.movements, [{ type: "SALE", quantity: -1 }]);
  });
});

describe("devolução baseada no pedido", () => {
  it("devolve estoque e cria RETURN quando inventoryReserved=true", async () => {
    const fake = fakeTransaction(4);
    await restoreOrderInventory(fake.tx, {
      inventoryReserved: true,
      items: [{ variantId: "v1", quantity: 1 }],
      note: "Reembolso",
    });
    assert.equal(fake.stock(), 5);
    assert.deepEqual(fake.movements, [{ type: "RETURN", quantity: 1 }]);
  });

  it("não devolve estoque de dropship mesmo que o modo atual mude", async () => {
    const fake = fakeTransaction(500);
    await restoreOrderInventory(fake.tx, {
      inventoryReserved: false,
      items: [{ variantId: "v1", quantity: 1 }],
      note: "Refund Mercado Pago",
    });
    assert.equal(fake.stock(), 500);
    assert.deepEqual(fake.movements, []);
  });

  it("devolve pedido INVENTORY mesmo que a loja esteja em DROPSHIPPING depois", async () => {
    const fake = fakeTransaction(4);
    const currentStoreMode = "DROPSHIPPING";
    assert.equal(currentStoreMode, "DROPSHIPPING");
    await restoreOrderInventory(fake.tx, {
      inventoryReserved: true,
      items: [{ variantId: "v1", quantity: 1 }],
      note: "Cancelamento",
    });
    assert.equal(fake.stock(), 5);
  });
});
