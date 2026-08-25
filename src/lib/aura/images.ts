import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { put } from "@vercel/blob";
import prisma from "../prisma";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;
const ACCEPTED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
const REJECTED_SOURCE_MARKERS = [
  "/thumb/",
  "/thumbnail/",
  "/small/",
  "img.youtube.com",
  "youtube.com",
  "semfoto.png",
  "placeholder",
  "banner",
  "icone",
  "icon/",
];

export type IngestedSupplierImage = {
  sourceUrl: string;
  permanentUrl: string;
  contentType: string;
  size: number;
};

function hostnameAllowed(hostname: string, allowedDomains: string[]) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return allowedDomains.some((domain) => {
    const allowed = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
    return normalized === allowed || normalized.endsWith(`.${allowed}`);
  });
}

export function validateSupplierImageUrl(value: string, allowedDomains: string[]) {
  const lower = value.toLowerCase();
  if (REJECTED_SOURCE_MARKERS.some((marker) => lower.includes(marker))) {
    throw new Error("A URL aponta para thumbnail, placeholder, banner ou mídia não permitida.");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL de imagem inválida.");
  }
  if (url.protocol !== "https:") throw new Error("A imagem precisa usar HTTPS.");
  if (url.username || url.password) throw new Error("URL de imagem com credenciais não é permitida.");
  if (!hostnameAllowed(url.hostname, allowedDomains)) throw new Error(`Domínio de imagem não autorizado: ${url.hostname}.`);
  return url;
}

export function isPrivateIp(address: string) {
  if (isIP(address) === 4) {
    const octets = address.split(".").map(Number);
    return octets[0] === 10
      || octets[0] === 127
      || octets[0] === 0
      || (octets[0] === 169 && octets[1] === 254)
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      || (octets[0] === 192 && octets[1] === 168)
      || (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)
      || octets[0] >= 224;
  }
  const lower = address.toLowerCase().split("%")[0];
  return lower === "::1"
    || lower === "::"
    || lower.startsWith("fc")
    || lower.startsWith("fd")
    || lower.startsWith("fe8")
    || lower.startsWith("fe9")
    || lower.startsWith("fea")
    || lower.startsWith("feb")
    || lower.startsWith("::ffff:127.")
    || lower.startsWith("::ffff:10.")
    || lower.startsWith("::ffff:192.168.");
}

async function assertPublicDns(url: URL) {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("O domínio da imagem resolve para uma rede privada ou reservada.");
  }
}

function signatureMatches(contentType: string, bytes: Uint8Array) {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (contentType === "image/webp") return new TextDecoder("ascii").decode(bytes.subarray(0, 4)) === "RIFF"
    && new TextDecoder("ascii").decode(bytes.subarray(8, 12)) === "WEBP";
  if (contentType === "image/avif") {
    const box = new TextDecoder("ascii").decode(bytes.subarray(4, 32));
    return box.includes("ftypavif") || box.includes("ftypavis");
  }
  return false;
}

async function readLimitedBody(response: Response) {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_IMAGE_BYTES) throw new Error("A imagem ultrapassa o limite de 15 MB.");
  if (!response.body) throw new Error("O servidor não devolveu o conteúdo da imagem.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("A imagem ultrapassa o limite de 15 MB.");
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function downloadSupplierImage(sourceUrl: string, allowedDomains: string[]) {
  let current = validateSupplierImageUrl(sourceUrl, allowedDomains);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    await assertPublicDns(current);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "DroidStore-Aura-Importer/1.0", Accept: "image/avif,image/webp,image/png,image/jpeg" },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new Error("Redirecionamento de imagem inválido ou excessivo.");
      current = validateSupplierImageUrl(new URL(location, current).toString(), allowedDomains);
      continue;
    }
    if (!response.ok) throw new Error(`Falha ao baixar imagem (${response.status}).`);
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    const extension = ACCEPTED_TYPES.get(contentType);
    if (!extension) throw new Error(`Tipo de imagem não permitido: ${contentType || "desconhecido"}.`);
    const bytes = await readLimitedBody(response);
    if (!signatureMatches(contentType, bytes)) throw new Error("A assinatura do arquivo não corresponde ao tipo de imagem.");
    return { bytes, contentType, extension };
  }
  throw new Error("Não foi possível concluir o download da imagem.");
}

async function mapLimit<T, R>(values: T[], limit: number, mapper: (value: T, index: number) => Promise<R>) {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return results;
}

export async function ingestSupplierImages(input: {
  supplierId: string;
  sku: string;
  sourceUrls: string[];
  allowedDomains: string[];
  uploader?: (pathname: string, bytes: Uint8Array, contentType: string) => Promise<string>;
}) {
  const uniqueUrls = [...new Set(input.sourceUrls)];
  return mapLimit(uniqueUrls, 4, async (sourceUrl, position): Promise<IngestedSupplierImage> => {
    validateSupplierImageUrl(sourceUrl, input.allowedDomains);
    const cached = await prisma.supplierImageAsset.findUnique({
      where: { supplierId_sourceUrl: { supplierId: input.supplierId, sourceUrl } },
    });
    if (cached) {
      await prisma.supplierImageAsset.update({ where: { id: cached.id }, data: { lastUsedAt: new Date() } });
      return { sourceUrl, permanentUrl: cached.permanentUrl, contentType: cached.contentType, size: cached.size };
    }
    const downloaded = await downloadSupplierImage(sourceUrl, input.allowedDomains);
    const pathname = `supplier/${input.supplierId}/${input.sku}/${position}.${downloaded.extension}`;
    const permanentUrl = input.uploader
      ? await input.uploader(pathname, downloaded.bytes, downloaded.contentType)
      : (await put(pathname, Buffer.from(downloaded.bytes), {
          access: "public",
          addRandomSuffix: true,
          contentType: downloaded.contentType,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })).url;
    const asset = await prisma.supplierImageAsset.upsert({
      where: { supplierId_sourceUrl: { supplierId: input.supplierId, sourceUrl } },
      update: { permanentUrl, contentType: downloaded.contentType, size: downloaded.bytes.byteLength, lastUsedAt: new Date() },
      create: { supplierId: input.supplierId, sourceUrl, permanentUrl, contentType: downloaded.contentType, size: downloaded.bytes.byteLength },
    });
    return { sourceUrl, permanentUrl: asset.permanentUrl, contentType: asset.contentType, size: asset.size };
  });
}
