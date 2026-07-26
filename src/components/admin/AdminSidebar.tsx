"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Boxes, FileText, LayoutDashboard, LogOut, PanelsTopLeft, Settings, SlidersHorizontal, Smartphone, Tags, Users, X } from "lucide-react";

const items = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: FileText },
  { href: "/admin/produtos", label: "Produtos", icon: Smartphone },
  { href: "/admin/filtros", label: "Filtros e categorias", icon: SlidersHorizontal },
  { href: "/admin/conteudo", label: "Vitrine e menu", icon: PanelsTopLeft },
  { href: "/admin/estoque", label: "Estoque", icon: Tags },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminSidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  return <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
    <div className="admin-brand"><Link href="/admin"><span>D</span><div><strong>DroidStore</strong><small>Central de gestão</small></div></Link>{onClose && <button onClick={onClose} aria-label="Fechar menu"><X /></button>}</div>
    <div className="admin-section-label">OPERAÇÃO</div>
    <nav aria-label="Navegação administrativa">{items.map((item) => {
      const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
      const Icon = item.icon;
      return <Link key={item.href} href={item.href} onClick={onClose} className={active ? "active" : ""}><Icon /><span>{item.label}</span></Link>;
    })}</nav>
    <div className="admin-sidebar-bottom"><Link href="/" target="_blank"><Boxes /><span>Ver loja</span></Link><button onClick={() => signOut({ callbackUrl: "/login" })}><LogOut /><span>Sair</span></button></div>
  </aside>;
}
