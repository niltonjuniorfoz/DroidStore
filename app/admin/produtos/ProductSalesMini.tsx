"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp } from "lucide-react";

type Mini = {
  sales: { units: number; orders: number; revenue: number; avgPrice: number; minPrice: number; maxPrice: number; unitsPerMonth: number; realizedProfit?: number; monthly: Array<{ month: string; units: number; revenue: number }> };
  demand: { views: number; views30d: number; conversionPct: number | null; daysSinceLastSale: number | null };
  stockHealth: { stock: number; daysOfStock: number | null };
  product: { daysInCatalog: number };
};

const money = (value = 0) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Resumo de venda e giro exibido dentro da aba Preço & margem. */
export default function ProductSalesMini({ productId }: { productId: string }) {
  const [data, setData] = useState<Mini | null>(null);

  useEffect(() => {
    fetch(`/api/admin/products/${productId}/insights`, { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body) => setData(body))
      .catch(() => undefined);
  }, [productId]);

  if (!data) return null;
  const { sales, demand, stockHealth, product } = data;
  const maxRevenue = Math.max(...sales.monthly.map((row) => row.revenue), 1);

  return (
    <section className="product-finance-section" style={{ marginTop: "0.9rem" }}>
      <header>
        <div>
          <h3>Desempenho deste aparelho</h3>
          <p>O que já aconteceu com ele: vendas, preço praticado e giro.</p>
        </div>
        <BarChart3 />
      </header>

      <div className="finance-panel">
        <div>
          <span>Unidades vendidas</span>
          <strong>{sales.units}</strong>
          <small>{sales.orders} pedido(s) · ritmo {sales.unitsPerMonth}/mês</small>
        </div>
        <div>
          <span>Faturamento gerado</span>
          <strong>{money(sales.revenue)}</strong>
          <small>{sales.realizedProfit !== undefined ? `lucro realizado ${money(sales.realizedProfit)}` : "—"}</small>
        </div>
        <div>
          <span>Preço praticado</span>
          <strong>{sales.units > 0 ? money(sales.avgPrice) : "—"}</strong>
          <small>{sales.units > 0 ? `mín ${money(sales.minPrice)} · máx ${money(sales.maxPrice)}` : "ainda sem vendas"}</small>
        </div>
        <div>
          <span>Giro do estoque</span>
          <strong>{stockHealth.daysOfStock !== null ? `~${stockHealth.daysOfStock}d` : "—"}</strong>
          <small>{stockHealth.stock} un. · {product.daysInCatalog}d no catálogo · {demand.views30d} visita(s) em 30d</small>
        </div>
      </div>

      {sales.monthly.length > 0 ? (
        <>
          <div className="insight-spark" style={{ marginTop: "0.9rem" }}>
            {sales.monthly.map((row) => (
              <div key={row.month} title={`${row.month}: ${row.units} un. · ${money(row.revenue)}`}>
                <div className="insight-spark-bar" style={{ height: `${Math.max(8, (row.revenue / maxRevenue) * 100)}%` }} />
                <small>{row.month.slice(5)}/{row.month.slice(2, 4)}</small>
              </div>
            ))}
          </div>
          <p className="finance-hint"><TrendingUp size={12} style={{ verticalAlign: "-2px" }} /> Faturamento mês a mês (últimos 6 meses). Detalhe completo na aba <b>Inteligência</b>.</p>
        </>
      ) : (
        <p className="finance-hint">
          Sem vendas registradas ainda. {demand.views > 0
            ? `Já recebeu ${demand.views} visita(s) — há procura, avalie preço e fotos.`
            : "Nenhuma visita ainda — verifique se o produto está ativo e com foto."}
        </p>
      )}
    </section>
  );
}
