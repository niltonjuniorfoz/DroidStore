import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesSignature } from "../src/lib/fileSignature";

const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = new Uint8Array([...Buffer.from("RIFF"), 0x24, 0x00, 0x00, 0x00, ...Buffer.from("WEBP")]);
const mp4 = new Uint8Array([0x00, 0x00, 0x00, 0x18, ...Buffer.from("ftyp"), ...Buffer.from("isom")]);
const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00]);
const glb = new Uint8Array([...Buffer.from("glTF"), 0x02, 0x00, 0x00, 0x00]);
const gltfJson = new Uint8Array(Buffer.from('  {"asset":{"version":"2.0"}}'));

describe("matchesSignature", () => {
  it("aceita formatos com a assinatura correta", () => {
    assert.equal(matchesSignature("jpg", jpg), true);
    assert.equal(matchesSignature("jpeg", jpg), true);
    assert.equal(matchesSignature("png", png), true);
    assert.equal(matchesSignature("webp", webp), true);
    assert.equal(matchesSignature("mp4", mp4), true);
    assert.equal(matchesSignature("mov", mp4), true);
    assert.equal(matchesSignature("webm", webm), true);
    assert.equal(matchesSignature("glb", glb), true);
    assert.equal(matchesSignature("gltf", gltfJson), true);
  });

  it("rejeita conteúdo que não bate com a extensão declarada", () => {
    assert.equal(matchesSignature("jpg", png), false);
    assert.equal(matchesSignature("png", jpg), false);
    assert.equal(matchesSignature("mp4", webm), false);
    assert.equal(matchesSignature("glb", gltfJson), false);
    assert.equal(matchesSignature("webp", new Uint8Array(Buffer.from("RIFFxxxxWAVE"))), false);
  });

  it("rejeita executáveis e HTML disfarçados de imagem", () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // MZ
    const html = new Uint8Array(Buffer.from("<script>alert(1)</script>"));
    assert.equal(matchesSignature("jpg", exe), false);
    assert.equal(matchesSignature("png", html), false);
    assert.equal(matchesSignature("webp", exe), false);
  });

  it("rejeita extensão desconhecida e buffer vazio", () => {
    assert.equal(matchesSignature("exe", jpg), false);
    assert.equal(matchesSignature("jpg", new Uint8Array()), false);
  });
});
