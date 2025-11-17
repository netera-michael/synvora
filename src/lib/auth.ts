import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/admin/login"
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
        token.venueIds = (user as any).venueIds;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | undefined;
        session.user.role = (token.role as "ADMIN" | "USER") ?? "USER";
        session.user.venueIds = (token.venueIds as number[]) ?? [];
      }
      return session;
    }
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@synvora.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            venues: {
              select: { id: true }
            }
          }
        });

        if (!user) {
          return null;
        }

        const passwordValid = await bcrypt.compare(credentials.password, user.password);

        if (!passwordValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? "Synvora Admin",
          role: user.role,
          venueIds: user.venues.map((venue) => venue.id)
        };
      }
    })
  ]
};
