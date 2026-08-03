"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Boxes, FileSpreadsheet, FileText, LayoutDashboard, LogOut, PanelsTopLeft, Settings, ShieldCheck, SlidersHorizontal, Smartphone, Tags, Users, X } from "lucide-react";

const items = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: FileText },
  { href: "/admin/produtos", label: "Produtos", icon: Smartphone, exact: true },
  { href: "/admin/produtos/planilha", label: "Planilha de produtos", icon: FileSpreadsheet, exact: true },
  { href: "/admin/filtros", label: "Filtros e categorias", icon: SlidersHorizontal },
  { href: "/admin/conteudo", label: "Vitrine e menu", icon: PanelsTopLeft },
  { href: "/admin/estoque", label: "Estoque", icon: Tags },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/usuarios", label: "Equipe", icon: ShieldCheck, adminOnly: true },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminSidebar({ open = false, onClose, role }: { open?: boolean; onClose?: () => void; role?: string }) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => !item.adminOnly || role === "ADMIN");
  return <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
    <div className="admin-brand"><Link href="/admin"><span>A</span><div><strong>Aura Tech</strong><small>Central de gestão</small></div></Link>{onClose && <button onClick={onClose} aria-label="Fechar menu"><X /></button>}</div>
    <div className="admin-section-label">OPERAÇÃO</div>
    <nav aria-label="Navegação administrativa">{visibleItems.map((item) => {
      const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
      const Icon = item.icon;
      return <Link key={item.href} href={item.href} onClick={onClose} className={active ? "active" : ""}><Icon /><span>{item.label}</span></Link>;
    })}</nav>
    <div className="admin-sidebar-bottom"><Link href="/" target="_blank"><Boxes /><span>Ver loja</span></Link><button onClick={() => signOut({ callbackUrl: "/login" })}><LogOut /><span>Sair</span></button></div>
  </aside>;
}
