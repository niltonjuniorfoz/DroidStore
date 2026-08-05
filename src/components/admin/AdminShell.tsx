"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (open) return;

    let tracking = false;
    let startX = 0;
    let startY = 0;

    const ignoredTargets = [
      "a",
      "button",
      "input",
      "textarea",
      "select",
      "[contenteditable='true']",
      ".admin-search",
      ".pro-table-container",
      ".editor-tabs",
      ".spreadsheet-changes",
      ".spreadsheet-errors",
      ".admin-modal",
      ".product-editor-modal",
      "[data-no-admin-swipe]",
    ].join(",");

    const stopTracking = () => {
      tracking = false;
      startX = 0;
      startY = 0;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(ignoredTargets)) return;

      const touch = event.touches[0];
      const viewportWidth = window.innerWidth;

      // A zona começa longe da borda para não acionar o gesto de voltar do navegador.
      // Ela alcança um pouco além do centro, deixando o menu fácil de abrir com o polegar.
      const minimumStartX = Math.max(54, viewportWidth * 0.13);
      const maximumStartX = Math.min(380, viewportWidth * 0.58);

      if (touch.clientX < minimumStartX || touch.clientX > maximumStartX) return;

      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (deltaX < -18 || Math.abs(deltaY) > 92) {
        stopTracking();
        return;
      }

      const horizontalGesture = deltaX > 82 && deltaX > Math.abs(deltaY) * 1.35;
      if (!horizontalGesture) return;

      stopTracking();
      setOpen(true);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", stopTracking, { passive: true });
    document.addEventListener("touchcancel", stopTracking, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", stopTracking);
      document.removeEventListener("touchcancel", stopTracking);
    };
  }, [open]);

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
