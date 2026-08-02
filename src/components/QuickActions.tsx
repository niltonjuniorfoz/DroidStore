import Link from "next/link";

function ActionCard({ href, title }: { href: string; title: string }) {
  return (
    <Link href={href} className="quick-action-card">
      <span>{title}</span>
    </Link>
  );
}

export default function QuickActions() {
  return (
    <div className="home-quick-actions">
      <ActionCard href="/celulares" title="Mais Vendidos" />
      <ActionCard href="/celulares?maxPrice=1500" title="Até R$ 1.500" />
      <ActionCard href="/celulares?condition=Outlet" title="Ofertas" />
      <ActionCard href="/celulares?condition=Excelente" title="Seminovos Premium" />
    </div>
  );
}
