import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

export default NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      authorization: { params: { scope: "repo user read:org", prompt: "login" } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account && typeof account.access_token === 'string') {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
}); 