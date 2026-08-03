// Validação de assinatura (magic bytes) dos formatos aceitos no upload.
// file.type vem do navegador e pode ser forjado; os primeiros bytes, não.

const textDecoder = new TextDecoder("ascii");

function ascii(bytes: Uint8Array, start: number, end: number) {
  return textDecoder.decode(bytes.subarray(start, end));
}

export function matchesSignature(extension: string, bytes: Uint8Array): boolean {
  switch (extension) {
    case "jpg":
    case "jpeg":
      return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "png":
      return bytes.length > 3 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    case "webp":
      return bytes.length > 11 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
    case "mp4":
    case "mov":
      // Container ISO BMFF: box "ftyp" nos bytes 4-7.
      return bytes.length > 7 && ascii(bytes, 4, 8) === "ftyp";
    case "webm":
      // Cabeçalho EBML (também cobre Matroska).
      return bytes.length > 3 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    case "glb":
      return bytes.length > 3 && ascii(bytes, 0, 4) === "glTF";
    case "gltf": {
      // glTF em JSON: primeiro caractere não-espaço deve abrir objeto.
      for (const byte of bytes.subarray(0, 64)) {
        if (byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0xef || byte === 0xbb || byte === 0xbf) continue;
        return byte === 0x7b;
      }
      return false;
    }
    default:
      return false;
  }
}
