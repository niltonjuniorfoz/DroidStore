"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { AdminFeedbackProvider } from "./AdminFeedback";

const pageTitles: Array<{ prefix: string; title: string; hint: string }> = [
  { prefix: "/admin/pedidos", title: "Pedidos", hint: "Vendas" },
  { prefix: "/admin/produtos/planilha", title: "Planilha de produtos", hint: "Catálogo" },
  { prefix: "/admin/produtos", title: "Produtos", hint: "Catálogo" },
  { prefix: "/admin/estoque", title: "Estoque", hint: "Catálogo" },
  { prefix: "/admin/filtros", title: "Filtros e categorias", hint: "Catálogo" },
  { prefix: "/admin/clientes", title: "Clientes", hint: "Vendas" },
  { prefix: "/admin/compras", title: "Compras (lotes)", hint: "Financeiro" },
  { prefix: "/admin/relatorios", title: "Relatórios", hint: "Financeiro" },
  { prefix: "/admin/conteudo", title: "Vitrine e menu", hint: "Loja" },
  { prefix: "/admin/configuracoes", title: "Configurações", hint: "Loja" },
  { prefix: "/admin/usuarios", title: "Equipe", hint: "Sistema" },
  { prefix: "/admin/auditoria", title: "Auditoria", hint: "Sistema" },
];

export default function AdminShell({ children, user, role }: { children: React.ReactNode; user: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const page = pageTitles.find((entry) => pathname.startsWith(entry.prefix)) ?? { title: "Visão geral", hint: "Aura Tech" };

  return <AdminFeedbackProvider><div className="admin-shell">
    <AdminSidebar open={open} onClose={() => setOpen(false)} role={role} />
    {open && <button className="admin-overlay" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
    <div className="admin-workspace">
      <header className="admin-topbar">
        <button className="admin-menu-trigger" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button>
        <div className="admin-topbar-title"><strong>{page.title}</strong><small>{page.hint}</small></div>
        <form className="admin-search" onSubmit={(event) => { event.preventDefault(); router.push(`/admin/produtos?q=${encodeURIComponent(search)}`); }}>
          <Search />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto, modelo, IMEI..." />
          <kbd>Enter</kbd>
        </form>
        <Link href="/conta" className="admin-user">
          <span>{user.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user}</strong><small>{role === "ADMIN" ? "Administrador proprietário" : "Gerente"}</small></div>
        </Link>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  </div></AdminFeedbackProvider>;
}
