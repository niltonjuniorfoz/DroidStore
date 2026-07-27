import { brazilPhoneForWhatsApp } from "./brazil";

export function normalizeInstagramUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;

  const username = raw
    .replace(/^@/, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^www\.instagram\.com\//i, "")
    .replace(/^\/+|\/+$/g, "");

  return username ? `https://www.instagram.com/${username}` : null;
}

export function createWhatsAppUrl(value?: string | null, message = "Olá! Preciso de ajuda com a minha compra.") {
  const digits = brazilPhoneForWhatsApp(value);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function createMailtoUrl(value?: string | null, subject = "Atendimento Brasil Store", body = "") {
  const email = value?.trim();
  if (!email) return null;
  const params = new URLSearchParams({ subject });
  if (body.trim()) params.set("body", body.trim());
  return `mailto:${email}?${params.toString()}`;
}

export function readInstagramFromCatalogBanner(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const instagramUrl = (value as Record<string, unknown>).instagramUrl;
  return typeof instagramUrl === "string" ? instagramUrl : "";
}
