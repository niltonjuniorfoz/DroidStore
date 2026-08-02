import Link from "next/link";
import { BadgeCheck, BadgeDollarSign, ChevronRight, Percent, TrendingUp, type LucideIcon } from "lucide-react";

type ActionCardProps = {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

function ActionCard({ href, title, subtitle, icon: Icon }: ActionCardProps) {
  return (
    <Link href={href} className="quick-action-card">
      <span className="quick-action-icon"><Icon aria-hidden="true" /></span>
      <span className="quick-action-copy"><strong>{title}</strong><small>{subtitle}</small></span>
      <ChevronRight className="quick-action-arrow" aria-hidden="true" />
    </Link>
  );
}

export default function QuickActions() {
  return (
    <div className="home-quick-actions">
      <ActionCard href="/celulares" title="Mais Vendidos" subtitle="Escolhas do momento" icon={TrendingUp} />
      <ActionCard href="/celulares?maxPrice=1500" title="Até R$ 1.500" subtitle="Seleção econômica" icon={BadgeDollarSign} />
      <ActionCard href="/celulares?condition=Outlet" title="Ofertas" subtitle="Preços especiais" icon={Percent} />
      <ActionCard href="/celulares?condition=Excelente" title="Seminovos Premium" subtitle="Qualidade selecionada" icon={BadgeCheck} />
    </div>
  );
}
