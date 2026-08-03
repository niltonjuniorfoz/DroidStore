import type { OrderStatus } from "@prisma/client";

// Máquina de estados do pedido.
// REFUNDED: pagamento devolvido ao cliente (arrependimento, defeito, chargeback).
export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from === to || orderTransitions[from].includes(to);
}

// Estoque volta sozinho quando o aparelho nunca saiu da loja (PENDING/PAID).
// Depois de SHIPPED/DELIVERED o aparelho está com o cliente: a devolução física
// deve ser lançada manualmente no estoque após conferência.
export function shouldRestock(from: OrderStatus, to: OrderStatus): boolean {
  if (to !== "CANCELLED" && to !== "REFUNDED") return false;
  if (from === to) return false;
  return from === "PENDING" || from === "PAID";
}
