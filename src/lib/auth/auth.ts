import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import ConnectDB from "@/config/db";
import User from "@/db/models/User.model";
import env from "@/config/env";

export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    // --- Google OAuth (Strict Whitelist Check) ---
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),

    // --- Credentials (Pre-Verified User ID Only) ---
    // Passwords are never sent into authorize(). They are pre-verified via /api/auth/verify-credentials
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        verifiedUserId: { label: "Verified User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.verifiedUserId) {
          return null;
        }

        try {
          await ConnectDB();
          const user = await User.findOne({
            _id: credentials.verifiedUserId,
            isActive: true,
          }).lean();

          if (!user) {
            return null;
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          };
        } catch (error) {
          console.error("Authorize error in credentials provider:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // 1. Strict Whitelist Check for OAuth Logins
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await ConnectDB();
          const existingUser = await User.findOne({
            email: user.email?.toLowerCase(),
            isActive: true,
          }).lean();

          if (!existingUser) {
            // Reject unauthorized accounts and redirect to /signin with AccountNotFound message
            return "/signin?error=AccountNotFound";
          }
        } catch (error) {
          console.error("Error in signIn whitelist callback:", error);
          return "/signin?error=VerificationFailed";
        }
      }
      return true;
    },

    // 2. Persist database user ID into JWT token
    async jwt({ token, user, account }) {
      if (account && user) {
        if (account.provider === "google" && user.email) {
          try {
            await ConnectDB();
            const dbUser = await User.findOne({
              email: user.email.toLowerCase(),
              isActive: true,
            }).lean();

            if (dbUser) {
              token.id = dbUser._id.toString();
            }
          } catch (error) {
            console.error("Error in jwt callback fetching user:", error);
          }
        } else if (user.id) {
          token.id = user.id;
        }
      }
      return token;
    },

    // 3. Expose user ID in client-accessible session object
    async session({ session, token }) {
      if (session?.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

// Re-export server auth helpers from dedicated helper module
export { getAuthSession, getUserId } from "./auth.helper";

export default authOptions;
