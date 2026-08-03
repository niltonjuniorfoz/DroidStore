import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Portão de borda: bloqueia /admin e /conta antes de qualquer código de página
// rodar, usando o callback `authorized` de auth.config.ts (só lê o JWT — sem
// banco, roda no edge). O papel no token pode estar defasado; a checagem
// fresca no banco continua em requireAdmin() dentro de cada rota (defesa em
// profundidade). Também redireciona quem já está logado para fora de /login.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/conta/:path*", "/login"],
};
