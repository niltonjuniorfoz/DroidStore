"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  ChevronDown,
  ChevronRight,
  Flame,
  Laptop,
  LayoutGrid,
  Radio,
  Smartphone,
  Tablet,
  Watch,
} from "lucide-react";
import { DEFAULT_STOREFRONT_NAVIGATION } from "../lib/storefrontNavigation";

type MenuItem = { label: string; href: string };
type MenuKind = "smartphones" | "informatica" | "eletronicos" | "smartwatch" | "tablets" | "seminovos" | "outlet" | "generic";
type MenuPresentation = {
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  imageUrl?: string;
  links: MenuItem[];
};

const MENU_PRESENTATIONS: Record<MenuKind, MenuPresentation> = {
  smartphones: {
    eyebrow: "Celulares e smartphones",
    description: "Compare marcas, modelos e condições em uma seleção organizada.",
    icon: Smartphone,
    imageUrl: "/home-banners/seminovos-premium.png",
    links: [
      { label: "iPhone", href: "/celulares?brand=Apple" },
      { label: "Samsung Galaxy", href: "/celulares?brand=Samsung" },
      { label: "Motorola", href: "/celulares?brand=Motorola" },
      { label: "Xiaomi, Redmi e Poco", href: "/celulares?brand=Xiaomi" },
    ],
  },
  informatica: {
    eyebrow: "Informática",
    description: "Notebooks, computadores e equipamentos para trabalho ou alto desempenho.",
    icon: Laptop,
    imageUrl: "/home-banners/informatica-notebooks.png",
    links: [
      { label: "Todos os notebooks", href: "/celulares?categoria=notebook" },
      { label: "Notebooks gamer", href: "/celulares?q=notebook+gamer" },
      { label: "Apple MacBook", href: "/celulares?q=macbook" },
      { label: "ASUS ROG Strix", href: "/celulares?q=rog+strix" },
    ],
  },
  eletronicos: {
    eyebrow: "Eletrônicos",
    description: "Tecnologia para mobilidade, lazer, localização e uso profissional.",
    icon: Radio,
    links: [
      { label: "GPS e rastreadores", href: "/celulares?q=gps" },
      { label: "Equipamentos para pesca", href: "/celulares?q=equipamentos+para+pesca" },
      { label: "Garmin", href: "/celulares?brand=Garmin" },
      { label: "Acessórios eletrônicos", href: "/celulares?categoria=acessorios" },
    ],
  },
  smartwatch: {
    eyebrow: "Smartwatch",
    description: "Relógios inteligentes para rotina, esporte e monitoramento.",
    icon: Watch,
    links: [
      { label: "Todos os smartwatches", href: "/celulares?categoria=smartwatch" },
      { label: "Apple Watch", href: "/celulares?q=apple+watch" },
      { label: "Galaxy Watch", href: "/celulares?q=galaxy+watch" },
      { label: "Garmin", href: "/celulares?brand=Garmin" },
    ],
  },
  tablets: {
    eyebrow: "Tablets",
    description: "Telas maiores para produtividade, estudo e entretenimento.",
    icon: Tablet,
    links: [
      { label: "Todos os tablets", href: "/celulares?categoria=tablets" },
      { label: "Apple iPad", href: "/celulares?q=ipad" },
      { label: "Samsung Galaxy Tab", href: "/celulares?q=galaxy+tab" },
      { label: "Leitores digitais", href: "/celulares?q=reader" },
    ],
  },
  seminovos: {
    eyebrow: "Seminovos revisados",
    description: "Aparelhos selecionados por condição, com procedência e garantia.",
    icon: BadgePercent,
    imageUrl: "/home-banners/seminovos-premium.png",
    links: [
      { label: "Excelente", href: "/celulares?condition=Excelente" },
      { label: "Muito bom", href: "/celulares?condition=Muito%20Bom" },
      { label: "Bom", href: "/celulares?condition=Bom" },
      { label: "iPhones seminovos", href: "/celulares?condition=Excelente&brand=Apple" },
    ],
  },
  outlet: {
    eyebrow: "Outlet",
    description: "Oportunidades com preço especial, enquanto durarem os estoques.",
    icon: Flame,
    links: [
      { label: "Ver todo o Outlet", href: "/celulares?condition=Outlet" },
      { label: "Ofertas em smartphones", href: "/celulares?condition=Outlet&categoria=smartphone" },
      { label: "Ofertas em informática", href: "/celulares?condition=Outlet&categoria=notebook" },
    ],
  },
  generic: {
    eyebrow: "Catálogo Aura Tech",
    description: "Encontre rapidamente a seção que você procura.",
    icon: LayoutGrid,
    links: [{ label: "Ver todos os produtos", href: "/celulares" }],
  },
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function menuKind(item: MenuItem): MenuKind {
  const value = normalize(`${item.label} ${item.href}`);
  if (value.includes("outlet")) return "outlet";
  if (value.includes("seminovo") || value.includes("excelente")) return "seminovos";
  if (value.includes("smartwatch") || value.includes("watch")) return "smartwatch";
  if (value.includes("tablet")) return "tablets";
  if (value.includes("informatica") || value.includes("notebook") || value.includes("computador")) return "informatica";
  if (value.includes("eletronico")) return "eletronicos";
  if (value.includes("smartphone") || value.includes("celular")) return "smartphones";
  return "generic";
}

export default function MegaMenu({ customNavigation = [] }: { customNavigation?: MenuItem[] }) {
  const navigation = customNavigation.length ? customNavigation.slice(0, 8) : DEFAULT_STOREFRONT_NAVIGATION;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = navigation[activeIndex] ?? navigation[0];
  const presentation = useMemo(() => MENU_PRESENTATIONS[activeItem ? menuKind(activeItem) : "generic"], [activeItem]);
  const ActiveIcon = presentation.icon;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div className="mega-menu-wrapper">
      <div className="category-subbar-container">
        <nav className="category-subbar-nav" aria-label="Categorias da loja">
          <div className="mega-trigger-item" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button type="button" className={`mega-trigger-btn ${open ? "active" : ""}`} aria-expanded={open} onClick={() => setOpen(true)}>
              <LayoutGrid size={15} /><span>Categorias</span><ChevronDown size={14} />
            </button>

            {open && activeItem && (
              <div className="mega-menu-dropdown">
                <div className="mega-menu-content">
                  <aside className="mega-sidebar" aria-label="Departamentos">
                    {navigation.map((item, index) => {
                      const Icon = MENU_PRESENTATIONS[menuKind(item)].icon;
                      return <button key={`${item.label}-${item.href}`} type="button" className={`mega-sidebar-item ${activeIndex === index ? "active" : ""}`} onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)}>
                        <span className="sidebar-item-label"><Icon size={16} />{item.label}</span><ChevronRight size={14} />
                      </button>;
                    })}
                  </aside>

                  <section className="mega-panel-body" aria-live="polite">
                    <div className="mega-panel-copy">
                      <span className="mega-panel-eyebrow"><ActiveIcon size={15} />{presentation.eyebrow}</span>
                      <h3>{activeItem.label}</h3>
                      <p>{presentation.description}</p>
                      <nav className="mega-panel-links" aria-label={`Atalhos de ${activeItem.label}`}>
                        {presentation.links.map((link) => <Link key={`${link.label}-${link.href}`} href={link.href} onClick={() => setOpen(false)}>{link.label}<ChevronRight size={13} /></Link>)}
                      </nav>
                      <Link className="mega-panel-cta" href={activeItem.href} onClick={() => setOpen(false)}>Ver toda a categoria <ChevronRight size={14} /></Link>
                    </div>

                    {presentation.imageUrl ? (
                      <Link className="mega-panel-media" href={activeItem.href} onClick={() => setOpen(false)}><Image src={presentation.imageUrl} alt="" fill sizes="560px" /></Link>
                    ) : (
                      <div className="mega-panel-mark" aria-hidden="true"><ActiveIcon /></div>
                    )}
                  </section>
                </div>
              </div>
            )}
          </div>

          <div className="mega-primary-links">
            {navigation.map((item) => {
              const kind = menuKind(item);
              return <Link key={`${item.label}-${item.href}`} href={item.href} className={kind === "outlet" ? "is-outlet" : kind === "seminovos" ? "is-seminovos" : ""}>{item.label}</Link>;
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
