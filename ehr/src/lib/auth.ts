import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { findDevUserByEmail } from '@/lib/devAuthStore';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        // If no DATABASE_URL is configured, skip Prisma and use dev in-memory store.
        if (!process.env.DATABASE_URL) {
          const normalized = (credentials.email as string || '').trim().toLowerCase();
          const devUser = findDevUserByEmail(normalized);
          // Debug logging for development credential checks
          // eslint-disable-next-line no-console
          console.log('[auth] credentials login attempt (dev store) for:', normalized, 'foundUser=', !!devUser);
          if (!devUser) return null;
          const isValid = await compare(credentials.password as string, devUser.passwordHash);
          // eslint-disable-next-line no-console
          console.log('[auth] password compare result:', isValid);
          if (!isValid) return null;
          return { id: devUser.id, email: devUser.email, name: devUser.name, role: devUser.role };
        }

        try {
          const user = await prisma.user.findUnique({ where: { email: credentials.email as string } });
          if (!user) return null;
          const isValid = await compare(credentials.password as string, user.passwordHash);
          if (!isValid) return null;
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        } catch (dbErr) {
          // In development, fall back to in-memory dev users if DB fails to connect
          if (process.env.NODE_ENV === 'production') throw dbErr;
          const normalized = (credentials.email as string || '').trim().toLowerCase();
          const devUser = findDevUserByEmail(normalized);
          // eslint-disable-next-line no-console
          console.log('[auth] DB fallback — dev store lookup for:', normalized, 'foundUser=', !!devUser, 'error=', (dbErr && (dbErr as Error).message) || dbErr);
          if (!devUser) return null;
          const isValid = await compare(credentials.password as string, devUser.passwordHash);
          // eslint-disable-next-line no-console
          console.log('[auth] DB fallback password compare result:', isValid);
          if (!isValid) return null;
          return { id: devUser.id, email: devUser.email, name: devUser.name, role: devUser.role };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
