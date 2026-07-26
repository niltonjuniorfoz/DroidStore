import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  providers: [], // Add providers in auth.ts
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = nextUrl.pathname.startsWith('/admin');
      const isAccountRoute = nextUrl.pathname.startsWith('/conta');
      const role = (auth?.user as { role?: string } | undefined)?.role;
      if (isAdminRoute) {
        return isLoggedIn && ['ADMIN', 'MANAGER'].includes(role ?? '');
      }
      if (isAccountRoute) {
        return isLoggedIn;
      } else if (isLoggedIn && nextUrl.pathname.startsWith('/login')) {
        return Response.redirect(new URL('/conta', nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { role?: string }).role = String(token.role ?? '');
        (session.user as typeof session.user & { id?: string }).id = String(token.id ?? '');
      }
      return session;
    }
  },
} satisfies NextAuthConfig;
