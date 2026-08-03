import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "./src/lib/prisma";
import { rateLimit } from "./src/lib/rateLimit";
import { authConfig } from "./auth.config";

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase();
        // Freia força bruta de senha por conta.
        const limited = await rateLimit(`login:${email}`, 10, 15 * 60);
        if (!limited.ok) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active || !await bcrypt.compare(String(credentials.password), user.password)) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    ...(googleEnabled ? [GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    })] : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") return true;
      const googleProfile = profile as { email_verified?: boolean } | undefined;
      if (!user.email || googleProfile?.email_verified === false) return false;
      const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
      return existing?.active !== false;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const customer = await prisma.user.upsert({
          where: { email: token.email.toLowerCase() },
          update: { name: token.name || undefined },
          create: {
            email: token.email.toLowerCase(),
            name: token.name,
            password: await bcrypt.hash(crypto.randomUUID(), 12),
            role: "CUSTOMER",
          },
        });
        token.role = customer.role;
        token.id = customer.id;
      } else if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { role?: string }).role = String(token.role ?? "");
        (session.user as typeof session.user & { id?: string }).id = String(token.id ?? "");
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
});
