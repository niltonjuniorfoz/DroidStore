"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type SiteContentData = {
  storeName?: string | null;
  contactEmail?: string | null;
  whatsapp?: string | null;
  instagramUrl?: string | null;
  pixDiscount?: number | null;
  maxInstallments?: number | null;
  customerLoginEnabled?: boolean | null;
  loginTitle?: string | null;
  loginSubtitle?: string | null;
  catalogBanner?: unknown;
  catalogSlides?: unknown;
};

type SiteContentResponse = {
  content: SiteContentData | null;
  navigation: Array<{ label: string; href: string }>;
};

type SiteContentContextValue = SiteContentResponse & {
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const fallbackResponse: SiteContentResponse = {
  content: null,
  navigation: [],
};

const SiteContentContext = createContext<SiteContentContextValue | null>(null);
let cachedSiteContent: SiteContentResponse | null = null;
let siteContentRequest: Promise<SiteContentResponse> | null = null;

async function loadSiteContent() {
  if (cachedSiteContent) return cachedSiteContent;
  if (!siteContentRequest) {
    siteContentRequest = fetch("/api/site-content")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Nao foi possivel carregar o conteudo da loja.");
        cachedSiteContent = {
          content: body.content ?? null,
          navigation: Array.isArray(body.navigation) ? body.navigation : [],
        };
        return cachedSiteContent;
      })
      .finally(() => {
        siteContentRequest = null;
      });
  }
  return siteContentRequest;
}

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SiteContentResponse>(cachedSiteContent ?? fallbackResponse);
  const [loading, setLoading] = useState(!cachedSiteContent);
  const [error, setError] = useState("");

  async function refresh() {
    if (!cachedSiteContent) setLoading(true);
    setError("");
    try {
      setData(await loadSiteContent());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nao foi possivel carregar o conteudo da loja.");
      setData(fallbackResponse);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<SiteContentContextValue>(() => ({
    ...data,
    loading,
    error,
    refresh,
  }), [data, error, loading]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) throw new Error("useSiteContent must be used inside SiteContentProvider");
  return context;
}
