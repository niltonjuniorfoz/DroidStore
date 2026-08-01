import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("URL não informada", { status: 400 });
  }

  try {
    let urlToFetch = targetUrl;
    if (!urlToFetch.startsWith("http://") && !urlToFetch.startsWith("https://")) {
      urlToFetch = `https://${urlToFetch}`;
    }

    // Se for URL do GSMArena (página de foto ou produto), extrair o ID do aparelho para buscar o 3D limpo (binkies3d.php3)
    if (urlToFetch.includes("gsmarena.com") && !urlToFetch.includes("binkies3d.php3")) {
      const idMatch = urlToFetch.match(/-(?:pictures-)?(\d+)\.php/) || urlToFetch.match(/idPhone=(\d+)/);
      if (idMatch && idMatch[1]) {
        urlToFetch = `https://www.gsmarena.com/binkies3d.php3?idPhone=${idMatch[1]}`;
      }
    }

    const response = await fetch(urlToFetch, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8faf9;color:#64748b;">
          <div style="text-align:center;padding:1rem;">
            <p style="font-weight:600;font-size:0.9rem;">Não foi possível carregar o modelo 3D de origem (${response.status})</p>
          </div>
        </body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    let html = await response.text();

    // 1. Desativar script de travamento de iFrame do GSMArena
    html = html.replace(/document\.body\.innerHTML\s*=\s*["']["']/g, "/* embedding permitido */");
    html = html.replace(/referrerURL\.host\.match/g, "(true || referrerURL.host.match");
    html = html.replace(/try\s*\{\s*window\.parent\.location\.href;/g, "try { /* bypass iframe check */");

    // 2. Injetar base tag para carregar estilos e scripts do GSMArena
    if (!html.includes("<base ")) {
      html = html.replace("<head>", `<head><base href="${urlToFetch}">`);
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("3D Proxy Error:", error);
    return new NextResponse(
      `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8faf9;color:#64748b;">
        <div style="text-align:center;padding:1rem;">
          <p style="font-weight:600;font-size:0.9rem;">Erro ao conectar ao servidor do modelo 3D.</p>
        </div>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
