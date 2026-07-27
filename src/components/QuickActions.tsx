"use client";

import Link from "next/link";
import React, { useRef } from "react";

function FireCard({ href, title }: { href: string; title: string }) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);

    const mX = -(x - rect.width / 2) / 10;
    const mY = (y - rect.height / 2) / 6;
    card.style.transform = `rotateX(${mY}deg) rotateY(${mX}deg) scale(1.025)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const flash = document.createElement("span");
    flash.className = "explosao-clique";
    flash.style.left = `${x}px`;
    flash.style.top = `${y}px`;
    card.appendChild(flash);
    setTimeout(() => flash.remove(), 450);
  };

  return (
    <Link
      href={href}
      ref={cardRef}
      className="quick-action-card btn-fogo-vivo"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="brilho-termico" />
      
      {/* Sistema de Fogo Realista com Labaredas e Faíscas/Fagulhas */}
      <div className="fogo-container">
        <div className="chama-individual chama-1" />
        <div className="chama-individual chama-2" />
        <div className="chama-individual chama-3" />
        <div className="chama-individual chama-4" />
        <div className="chama-individual chama-5" />
        <div className="chama-individual chama-6" />
        <div className="chama-individual chama-7" />
        <div className="chama-individual chama-8" />
        <div className="chama-individual chama-9" />

        {/* Fagulhas/Faíscas flutuantes incandescentes */}
        <div className="fagulha fagulha-1" />
        <div className="fagulha fagulha-2" />
        <div className="fagulha fagulha-3" />
        <div className="fagulha fagulha-4" />
        <div className="fagulha fagulha-5" />
      </div>

      <span className="texto-incandescente">{title}</span>
    </Link>
  );
}

export default function QuickActions() {
  return (
    <div className="home-quick-actions">
      {/* 1. Mais Vendidos */}
      <FireCard href="/celulares" title="Mais Vendidos" />

      {/* 2. Ofertas */}
      <FireCard href="/celulares?condition=Novo" title="Ofertas" />

      {/* 3. Outlet */}
      <FireCard href="/celulares?condition=Seminovo" title="Outlet" />

      {/* 4. Mais Procurados */}
      <FireCard href="/celulares?brand=Apple" title="Mais Procurados" />
    </div>
  );
}
