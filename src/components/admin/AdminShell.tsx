"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { AdminFeedbackProvider } from "./AdminFeedback";

export default function AdminShell({ children, user, role }: { children: React.ReactNode; user: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  return <AdminFeedbackProvider><div className="admin-shell">
    <AdminSidebar open={open} onClose={() => setOpen(false)} role={role} />
    {open && <button className="admin-overlay" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
    <div className="admin-workspace">
      <header className="admin-topbar"><button className="admin-menu-trigger" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button><form className="admin-search" onSubmit={(event) => { event.preventDefault(); router.push(`/admin/produtos?q=${encodeURIComponent(search)}`); }}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produtos no painel" /><kbd>Enter</kbd></form><Link href="/conta" className="admin-user"><span>{user.slice(0, 1).toUpperCase()}</span><div><strong>{user}</strong><small>{role === "ADMIN" ? "Administrador proprietário" : "Gerente"}</small></div></Link></header>
      <main className="admin-main">{children}</main>
    </div>
  </div></AdminFeedbackProvider>;
}
