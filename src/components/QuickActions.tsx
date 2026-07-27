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
      <ActionCard href="/celulares?condition=Novo" title="Ofertas" />
      <ActionCard href="/celulares?condition=Seminovo" title="Outlet" />
      <ActionCard href="/celulares?brand=Apple" title="Mais Procurados" />
    </div>
  );
}
