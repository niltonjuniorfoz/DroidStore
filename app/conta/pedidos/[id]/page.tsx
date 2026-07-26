import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, MapPin, Package, Truck, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { auth } from "../../../../auth";
import prisma from "../../../../src/lib/prisma";

const labels: Record<string, string> = { PENDING: "Aguardando pagamento", PAID: "Pagamento aprovado", SHIPPED: "Pedido enviado", DELIVERED: "Pedido entregue", CANCELLED: "Pedido cancelado" };
const icons = { PENDING: Clock, PAID: CheckCircle2, SHIPPED: Truck, DELIVERED: CheckCircle2, CANCELLED: XCircle };

export default async function ContaPedidoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const { id } = await params;
  if (!userId) notFound();
  const order = await prisma.order.findFirst({
    where: { id, userId },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();
  const StatusIcon = icons[order.status];
  return <div className="order-detail-page">
    <div className="order-detail-head"><div><Link href="/conta/pedidos">← Meus pedidos</Link><h2>Pedido #{order.id.slice(0, 8).toUpperCase()}</h2><p>Realizado em {new Date(order.createdAt).toLocaleString("pt-BR")}</p></div><em className={`status-chip ${order.status.toLowerCase()}`}><StatusIcon /> {labels[order.status]}</em></div>
    {order.trackingCode && <div className="tracking-banner"><Truck /><div><small>Código de rastreio</small><strong>{order.trackingCode}</strong></div></div>}
    <section className="profile-card order-history"><header><div><h2>Andamento</h2><p>Histórico real das atualizações do pedido.</p></div></header><div className="timeline">{order.statusHistory.map((history) => <div key={history.id}><span><CheckCircle2 /></span><p><strong>{labels[history.toStatus] ?? history.toStatus}</strong><small>{history.note ?? "Status atualizado"} • {new Date(history.createdAt).toLocaleString("pt-BR")}</small></p></div>)}</div></section>
    <div className="order-info-grid">
      <section className="profile-card mini-card"><h3><MapPin /> Entrega</h3><p>{order.shippingStreet}, {order.shippingNumber}{order.shippingComplement ? `, ${order.shippingComplement}` : ""}<br />{order.shippingNeighborhood}<br />{order.shippingCity}/{order.shippingState} • CEP {order.shippingZipCode}</p></section>
      <section className="profile-card mini-card"><h3><CreditCard /> Pagamento</h3><p>{order.paymentMethod}<br /><strong>Total: {Number(order.totalAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></p></section>
    </div>
    <section className="profile-card order-products"><header><div><h2>Produtos</h2><p>{order.items.length} item(ns) neste pedido.</p></div></header>{order.items.map((item) => <article key={item.id}><span><Package /></span><div><strong>{item.variant.product.name}</strong><small>{item.variant.storage} • {item.variant.color} • {item.variant.condition.replaceAll("_", " ")}</small></div><p>{item.quantity} × {Number(item.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></article>)}</section>
  </div>;
}
