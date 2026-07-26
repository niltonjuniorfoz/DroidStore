"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Heart, LogOut, MapPin, Package, UserRound } from "lucide-react";

const links = [
  { href: "/conta", label: "Dados pessoais", icon: UserRound, exact: true },
  { href: "/conta/enderecos", label: "Endereços", icon: MapPin },
  { href: "/conta/pedidos", label: "Meus pedidos", icon: Package },
  { href: "/conta/favoritos", label: "Favoritos", icon: Heart },
];

export default function AccountSidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  return <aside className="account-sidebar">
    <div className="account-person"><span>{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>{email}</small></div></div>
    <nav aria-label="Minha conta">{links.map((item) => {
      const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
      const Icon = item.icon;
      return <Link key={item.href} href={item.href} className={active ? "active" : ""}><Icon /><span>{item.label}</span></Link>;
    })}</nav>
    <button className="account-signout" onClick={() => signOut({ callbackUrl: "/" })}><LogOut /><span>Sair da conta</span></button>
  </aside>;
}
