// Rate limit de janela fixa.
// Com UPSTASH_REDIS_REST_URL/TOKEN configurados, o contador é compartilhado
// entre todas as instâncias. Sem eles, cai em memória local — cada instância
// serverless conta por si, o que ainda barra rajadas (a maioria dos abusos),
// mas não é um teto global exato.

type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryHit(key: string, limit: number, windowSeconds: number, now: number): RateLimitResult {
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    // Poda ocasional para a memória não crescer sem limite.
    if (memory.size > 5000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

async function upstashHit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSeconds), "NX"],
        ["TTL", key],
      ]),
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;
    const [incr, , ttl] = (await response.json()) as Array<{ result: number }>;
    const count = Number(incr?.result ?? 0);
    const retryAfterSeconds = Math.max(1, Number(ttl?.result ?? windowSeconds));
    return count > limit ? { ok: false, retryAfterSeconds } : { ok: true, retryAfterSeconds: 0 };
  } catch {
    // Redis fora do ar não pode derrubar a loja: deixa passar.
    return { ok: true, retryAfterSeconds: 0 };
  }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const shared = await upstashHit(`rl:${key}`, limit, windowSeconds);
  if (shared) return shared;
  return memoryHit(key, limit, windowSeconds, now);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export const RATE_LIMITED_MESSAGE = "Muitas tentativas. Aguarde um pouco e tente novamente.";
