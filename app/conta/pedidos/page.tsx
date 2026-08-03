import Link from "next/link";
import { ChevronRight, Package, Truck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { auth } from "../../../auth";
import prisma from "../../../src/lib/prisma";

const labels: Record<string, string> = { PENDING: "Aguardando pagamento", PAID: "Pagamento aprovado", SHIPPED: "Em transporte", DELIVERED: "Entregue", CANCELLED: "Cancelado" };
const icons = { PENDING: Clock, PAID: CheckCircle2, SHIPPED: Truck, DELIVERED: CheckCircle2, CANCELLED: XCircle };

export default async function ContaPedidos() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const orders = userId ? await prisma.order.findMany({
    where: { userId }, orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } }, items: { take: 1, include: { variant: { include: { product: true } } } } },
  }) : [];
  return <section className="profile-card">
    <header><div><span className="eyebrow">Compras</span><h2>Meus pedidos</h2><p>Acompanhe pagamento, envio e entrega.</p></div><span className="verified"><Package /> {orders.length} pedido(s)</span></header>
    <div className="account-orders">{orders.map((order) => {
      const Icon = icons[order.status];
      return <article key={order.id}><div className={`order-state ${order.status.toLowerCase()}`}><Icon /></div><div className="account-order-main"><small>Pedido #{order.id.slice(0, 8).toUpperCase()} • {new Date(order.createdAt).toLocaleDateString("pt-BR")}</small><strong>{order.items[0]?.variant.product.name ?? "Pedido Aura Tech"}</strong><span>{labels[order.status]} • {order._count.items} item(ns)</span></div><div className="account-order-total"><strong>{Number(order.totalAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><Link href={`/conta/pedidos/${order.id}`}>Ver detalhes <ChevronRight /></Link></div></article>;
    })}{!orders.length && <div className="empty-inline"><Package /><p>Você ainda não fez nenhum pedido.</p><Link href="/celulares" className="button primary">Ver celulares</Link></div>}</div>
  </section>;
}
