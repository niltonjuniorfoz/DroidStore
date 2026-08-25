"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Boxes,
  FileSpreadsheet,
  FileJson,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  PanelsTopLeft,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Tags,
  Users,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  adminOnly?: boolean;
};
type NavGroup = { label: string | null; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Vendas",
    items: [
      { href: "/admin/pedidos", label: "Pedidos", icon: FileText },
      { href: "/admin/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/produtos", label: "Produtos", icon: Smartphone, exact: true },
      { href: "/admin/produtos/importar", label: "Importar catálogo", icon: FileJson, exact: true, adminOnly: true },
      { href: "/admin/produtos/planilha", label: "Planilha", icon: FileSpreadsheet, exact: true },
      { href: "/admin/estoque", label: "Estoque", icon: Tags },
      { href: "/admin/filtros", label: "Filtros e categorias", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/admin/compras", label: "Compras (lotes)", icon: PackagePlus, adminOnly: true },
      { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3, adminOnly: true },
    ],
  },
  {
    label: "Loja",
    items: [
      { href: "/admin/conteudo", label: "Vitrine e menu", icon: PanelsTopLeft },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/usuarios", label: "Equipe", icon: ShieldCheck, adminOnly: true },
      { href: "/admin/auditoria", label: "Auditoria", icon: History, adminOnly: true },
    ],
  },
];

export default function AdminSidebar({ open = false, onClose, role }: { open?: boolean; onClose?: () => void; role?: string }) {
  const pathname = usePathname();
  const isOwner = role === "ADMIN";

  return <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
    <div className="admin-brand">
      <Link href="/admin" className="admin-brand-link" aria-label="Aura Tech — Central de gestão">
        <img src="/aura-tech-logo-admin.png" alt="Aura Tech" className="admin-brand-logo" />
      </Link>
      {onClose && <button onClick={onClose} aria-label="Fechar menu"><X /></button>}
    </div>
    <div className="admin-sidebar-menu">
      {groups.map((group) => {
        const visible = group.items.filter((item) => !item.adminOnly || isOwner);
        if (!visible.length) return null;
        return (
          <div key={group.label ?? "root"}>
            {group.label
              ? <div className="admin-section-label">{group.label}</div>
              : <div className="admin-sidebar-spacer" />}
            <nav aria-label={group.label ?? "Principal"}>
              {visible.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={onClose} className={active ? "active" : ""}>
                    <Icon /><span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        );
      })}
    </div>
    <div className="admin-sidebar-bottom">
      <Link href="/" target="_blank"><Boxes /><span>Ver loja</span></Link>
      <button onClick={() => signOut({ callbackUrl: "/login" })}><LogOut /><span>Sair</span></button>
    </div>
  </aside>;
}
