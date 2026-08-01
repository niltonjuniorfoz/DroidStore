"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Laptop,
  Monitor,
  Phone,
  Smartphone,
  Watch,
  Headphones,
  Gamepad2,
  Tv,
  Camera,
  Plug,
} from "lucide-react";

type DepartmentId =
  | "smartphones"
  | "notebook"
  | "tablets"
  | "smartwatches"
  | "tv-audio"
  | "informatica"
  | "acessorios"
  | "games";

interface MegaMenuProps {
  customNavigation?: { label: string; href: string }[];
}

export default function MegaMenu({ customNavigation }: MegaMenuProps) {
  const [openMega, setOpenMega] = useState(false);
  const [activeTab, setActiveTab] = useState<DepartmentId>("smartphones");
  const [openBrand, setOpenBrand] = useState<string | null>(null);

  const departments: { id: DepartmentId; label: string; icon: any }[] = [
    { id: "smartphones", label: "Smartphones", icon: Smartphone },
    { id: "notebook", label: "Notebook", icon: Laptop },
    { id: "tablets", label: "Tablets", icon: TabletIcon },
    { id: "smartwatches", label: "Smartwatches", icon: Watch },
    { id: "tv-audio", label: "TV & Áudio", icon: Tv },
    { id: "informatica", label: "Informática", icon: Monitor },
    { id: "acessorios", label: "Acessórios", icon: Plug },
    { id: "games", label: "Games", icon: Gamepad2 },
  ];

  return (
    <div className="mega-menu-wrapper">
      <div className="category-subbar-container">
        <nav className="category-subbar-nav" aria-label="Categorias da loja">
          {/* Item 1: Categorias Mega Menu Dropdown */}
          <div
            className="mega-trigger-item"
            onMouseEnter={() => {
              setOpenMega(true);
              setOpenBrand(null);
            }}
            onMouseLeave={() => setOpenMega(false)}
          >
            <button
              type="button"
              className={`mega-trigger-btn ${openMega ? "active" : ""}`}
              aria-expanded={openMega}
            >
              <span>Categorias</span>
              {openMega ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {/* Main Mega Menu Overlay */}
            {openMega && (
              <div className="mega-menu-dropdown">
                <div className="mega-pointer-arrow" />
                <div className="mega-menu-content">
                  {/* Left Sidebar - Departments */}
                  <aside className="mega-sidebar">
                    {departments.map((dept) => {
                      const Icon = dept.icon;
                      const isActive = activeTab === dept.id;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          className={`mega-sidebar-item ${isActive ? "active" : ""}`}
                          onMouseEnter={() => setActiveTab(dept.id)}
                        >
                          <span className="sidebar-item-label">
                            <Icon size={16} className="sidebar-icon" />
                            {dept.label}
                          </span>
                          <ChevronRight size={14} className="sidebar-arrow" />
                        </button>
                      );
                    })}
                  </aside>

                  {/* Right Content Panel */}
                  <main className="mega-panel-body">
                    {/* Panel 1: Smartphones */}
                    {activeTab === "smartphones" && (
                      <div className="mega-panel-content animate-fade">
                        <div className="panel-header-banner">
                          <div className="banner-icon-shell">
                            <Smartphone size={24} color="#0055D4" />
                          </div>
                          <div>
                            <h3 className="banner-title">Celulares</h3>
                            <Link href="/celulares" className="banner-link">
                              Ver todos os celulares
                            </Link>
                          </div>
                        </div>

                        <div className="brands-grid">
                          <div className="brand-column">
                            <h4 className="column-title">iPhone</h4>
                            <ul>
                              <li><Link href="/celulares?q=iPhone+17">iPhone 17</Link></li>
                              <li><Link href="/celulares?q=iPhone+16">iPhone 16</Link></li>
                              <li><Link href="/celulares?q=iPhone+15">iPhone 15</Link></li>
                              <li><Link href="/celulares?q=iPhone+14">iPhone 14</Link></li>
                              <li><Link href="/celulares?q=iPhone+13">iPhone 13</Link></li>
                              <li><Link href="/celulares?q=iPhone+12">iPhone 12</Link></li>
                              <li><Link href="/celulares?q=iPhone+11">iPhone 11</Link></li>
                              <li><Link href="/celulares?brand=Apple" className="more-link">Ver mais</Link></li>
                            </ul>
                          </div>

                          <div className="brand-column">
                            <h4 className="column-title">Samsung</h4>
                            <ul>
                              <li><Link href="/celulares?q=Galaxy+S25">Galaxy S25</Link></li>
                              <li><Link href="/celulares?q=Galaxy+S24">Galaxy S24</Link></li>
                              <li><Link href="/celulares?q=Galaxy+S23">Galaxy S23</Link></li>
                              <li><Link href="/celulares?q=Galaxy+S21">Galaxy S21</Link></li>
                              <li><Link href="/celulares?q=Galaxy+S20+FE">Galaxy S20 FE</Link></li>
                              <li><Link href="/celulares?brand=Samsung" className="more-link">Ver mais</Link></li>
                            </ul>
                          </div>

                          <div className="brand-column">
                            <h4 className="column-title">Motorola</h4>
                            <ul>
                              <li><Link href="/celulares?q=Moto+g60">Moto g60</Link></li>
                              <li><Link href="/celulares?q=Moto+g100">Moto g100</Link></li>
                              <li><Link href="/celulares?q=One+Hyper">One Hyper</Link></li>
                              <li><Link href="/celulares?q=Moto+One+Action">Moto One Action</Link></li>
                              <li><Link href="/celulares?brand=Motorola" className="more-link">Ver mais</Link></li>
                            </ul>
                          </div>

                          <div className="brand-column">
                            <h4 className="column-title">Xiaomi</h4>
                            <ul>
                              <li><Link href="/celulares?q=Redmi">Redmi</Link></li>
                              <li><Link href="/celulares?q=POCO">Poco</Link></li>
                              <li><Link href="/celulares?brand=Xiaomi">Xiaomi</Link></li>
                              <li><Link href="/celulares?brand=Xiaomi" className="more-link">Ver mais</Link></li>
                            </ul>
                          </div>

                          <div className="brand-column">
                            <h4 className="column-title">Outras marcas</h4>
                            <ul>
                              <li><Link href="/celulares?brand=Asus">Asus Zenfone</Link></li>
                              <li><Link href="/celulares?brand=LG">LG K Series</Link></li>
                              <li><Link href="/celulares?brand=Huawei">Huawei P Series</Link></li>
                              <li><Link href="/celulares" className="more-link">Explorar marcas</Link></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Panel 2: Notebook */}
                    {activeTab === "notebook" && (
                      <div className="mega-panel-content animate-fade">
                        <div className="panel-header-banner">
                          <div className="banner-icon-shell">
                            <Laptop size={24} color="#FF7900" />
                          </div>
                          <div>
                            <h3 className="banner-title">Notebook</h3>
                            <Link href="/celulares?cat=notebook" className="banner-link">
                              Ver todos os notebooks
                            </Link>
                          </div>
                        </div>
                        <div className="panel-section">
                          <h4 className="section-subtitle">Desktop, Notebooks e Periféricos</h4>
                          <ul className="simple-link-list">
                            <li><Link href="/celulares?cat=notebook">Notebooks e Computadores</Link></li>
                            <li><Link href="/celulares?q=MacBook">Apple MacBook Air & Pro</Link></li>
                            <li><Link href="/celulares?q=Dell">Dell Inspiron & Vostro</Link></li>
                            <li><Link href="/celulares?q=Lenovo">Lenovo IdeaPad</Link></li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Panel 3: Smartwatches */}
                    {activeTab === "smartwatches" && (
                      <div className="mega-panel-content animate-fade">
                        <div className="panel-header-banner">
                          <div className="banner-icon-shell">
                            <Watch size={24} color="#00B040" />
                          </div>
                          <div>
                            <h3 className="banner-title">Smartwatches</h3>
                            <Link href="/celulares?cat=smartwatch" className="banner-link">
                              Ver todos os smartwatches
                            </Link>
                          </div>
                        </div>
                        <div className="panel-section">
                          <h4 className="section-subtitle">Marcas</h4>
                          <ul className="simple-link-list">
                            <li><Link href="/celulares?q=Apple+Watch">Apple Watch</Link></li>
                            <li><Link href="/celulares?q=Galaxy+Watch">Samsung Galaxy Watch</Link></li>
                            <li><Link href="/celulares?q=Xiaomi+Band">Xiaomi Smart Band</Link></li>
                            <li><Link href="/celulares?q=Amazfit">Amazfit</Link></li>
                            <li><Link href="/celulares?cat=acessorios">Acessórios para Smartwatches</Link></li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Default Fallback for Other Departments */}
                    {["tablets", "tv-audio", "informatica", "acessorios", "games"].includes(activeTab) && (
                      <div className="mega-panel-content animate-fade">
                        <div className="panel-header-banner">
                          <div className="banner-icon-shell">
                            <Plug size={24} color="#FF7900" />
                          </div>
                          <div>
                            <h3 className="banner-title">
                              {departments.find((d) => d.id === activeTab)?.label}
                            </h3>
                            <Link href="/celulares" className="banner-link">
                              Explorar categoria
                            </Link>
                          </div>
                        </div>
                        <div className="panel-section">
                          <h4 className="section-subtitle">Destaques da loja</h4>
                          <ul className="simple-link-list">
                            <li><Link href="/celulares">Ver todos os produtos com garantia</Link></li>
                            <li><Link href="/celulares?condition=Novo">Aparelhos 100% Novos</Link></li>
                            <li><Link href="/celulares?condition=Excelente">Seminovos Revisados</Link></li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </main>
                </div>
              </div>
            )}
          </div>

          {/* Quick Dropdown 2: iPhone */}
          <div
            className="quick-brand-dropdown-wrapper"
            onMouseEnter={() => setOpenBrand("iphone")}
            onMouseLeave={() => setOpenBrand(null)}
          >
            <Link href="/celulares?brand=Apple" className="quick-brand-btn">
              <span>iPhone</span>
              <ChevronDown size={14} />
            </Link>
            {openBrand === "iphone" && (
              <div className="quick-dropdown-menu">
                <Link href="/celulares?q=iPhone+17">iPhone 17</Link>
                <Link href="/celulares?q=iPhone+16">iPhone 16</Link>
                <Link href="/celulares?q=iPhone+15">iPhone 15</Link>
                <Link href="/celulares?q=iPhone+14">iPhone 14</Link>
                <Link href="/celulares?q=iPhone+13">iPhone 13</Link>
                <Link href="/celulares?q=iPhone+12">iPhone 12</Link>
                <Link href="/celulares?q=iPhone+11">iPhone 11</Link>
              </div>
            )}
          </div>

          {/* Quick Dropdown 3: Samsung */}
          <div
            className="quick-brand-dropdown-wrapper"
            onMouseEnter={() => setOpenBrand("samsung")}
            onMouseLeave={() => setOpenBrand(null)}
          >
            <Link href="/celulares?brand=Samsung" className="quick-brand-btn">
              <span>Samsung</span>
              <ChevronDown size={14} />
            </Link>
            {openBrand === "samsung" && (
              <div className="quick-dropdown-menu">
                <Link href="/celulares?q=Galaxy+S25">Galaxy S25 Ultra</Link>
                <Link href="/celulares?q=Galaxy+S24">Galaxy S24 Plus</Link>
                <Link href="/celulares?q=Galaxy+S23">Galaxy S23</Link>
                <Link href="/celulares?q=Galaxy+S21">Galaxy S21 FE</Link>
                <Link href="/celulares?q=Galaxy+A">Linha Galaxy A</Link>
              </div>
            )}
          </div>

          {/* Quick Dropdown 4: Motorola */}
          <div
            className="quick-brand-dropdown-wrapper"
            onMouseEnter={() => setOpenBrand("motorola")}
            onMouseLeave={() => setOpenBrand(null)}
          >
            <Link href="/celulares?brand=Motorola" className="quick-brand-btn">
              <span>Motorola</span>
              <ChevronDown size={14} />
            </Link>
            {openBrand === "motorola" && (
              <div className="quick-dropdown-menu">
                <Link href="/celulares?q=Moto+Edge">Linha Edge</Link>
                <Link href="/celulares?q=Moto+g60">Moto g60</Link>
                <Link href="/celulares?q=Moto+g100">Moto g100</Link>
                <Link href="/celulares?q=Moto+G">Linha Moto G</Link>
              </div>
            )}
          </div>

          {/* Quick Dropdown 5: Xiaomi */}
          <div
            className="quick-brand-dropdown-wrapper"
            onMouseEnter={() => setOpenBrand("xiaomi")}
            onMouseLeave={() => setOpenBrand(null)}
          >
            <Link href="/celulares?brand=Xiaomi" className="quick-brand-btn">
              <span>Xiaomi</span>
              <ChevronDown size={14} />
            </Link>
            {openBrand === "xiaomi" && (
              <div className="quick-dropdown-menu">
                <Link href="/celulares?q=Redmi">Redmi</Link>
                <Link href="/celulares?q=POCO">Poco</Link>
                <Link href="/celulares?brand=Xiaomi">Xiaomi</Link>
              </div>
            )}
          </div>

          {/* Quick Dropdown 6: Notebook */}
          <div
            className="quick-brand-dropdown-wrapper"
            onMouseEnter={() => setOpenBrand("notebook")}
            onMouseLeave={() => setOpenBrand(null)}
          >
            <Link href="/celulares?cat=notebook" className="quick-brand-btn">
              <span>Notebook</span>
              <ChevronDown size={14} />
            </Link>
            {openBrand === "notebook" && (
              <div className="quick-dropdown-menu">
                <Link href="/celulares?q=MacBook">Apple MacBook</Link>
                <Link href="/celulares?q=Dell">Dell Inspiron & Vostro</Link>
                <Link href="/celulares?q=Lenovo">Lenovo IdeaPad</Link>
                <Link href="/celulares?q=ASUS">ASUS ZenBook</Link>
              </div>
            )}
          </div>

          {/* Quick Dropdown 7: Smartwatches */}
          <div
            className="quick-brand-dropdown-wrapper"
            onMouseEnter={() => setOpenBrand("smartwatches")}
            onMouseLeave={() => setOpenBrand(null)}
          >
            <Link href="/celulares?cat=smartwatch" className="quick-brand-btn">
              <span>Smartwatches</span>
              <ChevronDown size={14} />
            </Link>
            {openBrand === "smartwatches" && (
              <div className="quick-dropdown-menu">
                <Link href="/celulares?q=Apple+Watch">Apple Watch</Link>
                <Link href="/celulares?q=Galaxy+Watch">Galaxy Watch</Link>
                <Link href="/celulares?q=Xiaomi+Band">Xiaomi Smart Band</Link>
                <Link href="/celulares?q=Amazfit">Amazfit</Link>
              </div>
            )}
          </div>

          {/* Quick Dropdown 8: Tablets */}
          <div
            className="quick-brand-dropdown-wrapper"
            onMouseEnter={() => setOpenBrand("tablets")}
            onMouseLeave={() => setOpenBrand(null)}
          >
            <Link href="/celulares?cat=tablet" className="quick-brand-btn">
              <span>Tablets</span>
              <ChevronDown size={14} />
            </Link>
            {openBrand === "tablets" && (
              <div className="quick-dropdown-menu">
                <Link href="/celulares?q=iPad">Apple iPad</Link>
                <Link href="/celulares?q=Galaxy+Tab">Samsung Galaxy Tab</Link>
                <Link href="/celulares?q=Lenovo+Tab">Lenovo Tab</Link>
              </div>
            )}
          </div>

          {/* Quick Dropdown 9: Acessórios */}
          <div
            className="quick-brand-dropdown-wrapper"
            onMouseEnter={() => setOpenBrand("acessorios")}
            onMouseLeave={() => setOpenBrand(null)}
          >
            <Link href="/celulares?cat=acessorios" className="quick-brand-btn">
              <span>Acessórios</span>
              <ChevronDown size={14} />
            </Link>
            {openBrand === "acessorios" && (
              <div className="quick-dropdown-menu">
                <Link href="/celulares?q=Carregador">Carregadores & Cabos</Link>
                <Link href="/celulares?q=Fone">Fones Bluetooth</Link>
                <Link href="/celulares?q=Capa">Capas & Películas</Link>
                <Link href="/celulares?q=Magsafe">Suportes MagSafe</Link>
              </div>
            )}
          </div>

          {/* Quick Dropdown 10: Seminovos */}
          <div
            className="quick-brand-dropdown-wrapper"
            onMouseEnter={() => setOpenBrand("seminovos")}
            onMouseLeave={() => setOpenBrand(null)}
          >
            <Link href="/celulares?condition=Excelente" className="quick-brand-btn highlight-tag-link">
              <span>Seminovos</span>
              <ChevronDown size={14} />
            </Link>
            {openBrand === "seminovos" && (
              <div className="quick-dropdown-menu">
                <Link href="/celulares?condition=Excelente&brand=Apple">iPhones Seminovos</Link>
                <Link href="/celulares?condition=Excelente&brand=Samsung">Samsung Seminovos</Link>
                <Link href="/celulares?condition=Excelente&brand=Motorola">Motorola Seminovos</Link>
                <Link href="/celulares?condition=Excelente">Todos com Garantia</Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}

function TabletIcon({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
