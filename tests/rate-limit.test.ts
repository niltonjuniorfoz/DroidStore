import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIp, rateLimit } from "../src/lib/rateLimit";

// Sem envs do Upstash nos testes, o caminho exercitado é o de memória.

describe("rateLimit (memória)", () => {
  it("permite até o limite e bloqueia o excedente", async () => {
    const key = `test-${Math.random()}`;
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(key, 3, 60, now);
      assert.equal(result.ok, true, `tentativa ${i + 1} deveria passar`);
    }
    const blocked = await rateLimit(key, 3, 60, now);
    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfterSeconds >= 1);
  });

  it("reseta depois da janela", async () => {
    const key = `test-${Math.random()}`;
    const now = Date.now();
    await rateLimit(key, 1, 60, now);
    assert.equal((await rateLimit(key, 1, 60, now)).ok, false);
    const afterWindow = now + 61_000;
    assert.equal((await rateLimit(key, 1, 60, afterWindow)).ok, true);
  });

  it("chaves diferentes não interferem", async () => {
    const now = Date.now();
    const a = `test-${Math.random()}`;
    const b = `test-${Math.random()}`;
    await rateLimit(a, 1, 60, now);
    assert.equal((await rateLimit(a, 1, 60, now)).ok, false);
    assert.equal((await rateLimit(b, 1, 60, now)).ok, true);
  });
});

describe("clientIp", () => {
  it("usa o primeiro IP do x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } });
    assert.equal(clientIp(req), "203.0.113.7");
  });

  it("cai para x-real-ip e depois unknown", () => {
    assert.equal(clientIp(new Request("http://x", { headers: { "x-real-ip": "203.0.113.9" } })), "203.0.113.9");
    assert.equal(clientIp(new Request("http://x")), "unknown");
  });
});
