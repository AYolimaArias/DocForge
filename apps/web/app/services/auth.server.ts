import { Authenticator } from "remix-auth";
import {
  GitHubStrategy,
  type GitHubExtraParams,
  type GitHubProfile,
} from "remix-auth-github";
import type { OAuth2StrategyVerifyParams } from "remix-auth-oauth2";
import { sessionStorage } from "./session.server";
import { FormStrategy } from "remix-auth-form";
import { GoogleStrategy } from "remix-auth-google";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma.server";

// Define el tipo de usuario que se guardará en la sesión.
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  accessToken: string;
}

export const authenticator = new Authenticator<User>(sessionStorage);

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  throw new Error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set");
}

async function verifyCallback({
  profile,
  tokens,
}: OAuth2StrategyVerifyParams<
  GitHubProfile,
  GitHubExtraParams
>): Promise<User> {
  const email = profile.emails?.[0]?.value;
  if (!email) {
    throw new Error("Email is not available from the GitHub profile.");
  }

  const user: User = {
    id: profile.id,
    name: profile.displayName,
    email: email,
    avatar_url: profile.photos?.[0]?.value ?? "",
    accessToken: tokens.access_token,
  };

  return user;
}

const gitHubStrategy = new GitHubStrategy(
  {
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    redirectURI: "http://localhost:3000/auth/github/callback",
    scopes: ["read:user", "user:email", "repo"],
  },
  verifyCallback
);

authenticator.use(gitHubStrategy);

// Estrategia de email/contraseña
authenticator.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get("email")?.toString().toLowerCase();
    const password = form.get("password")?.toString();
    if (!email || !password) throw new Error("Email y contraseña requeridos");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw new Error("Usuario o contraseña incorrectos");
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Usuario o contraseña incorrectos");
    return user.id;
  }),
  "user-pass"
);

// Estrategia de Google OAuth
authenticator.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "http://localhost:3000/auth/google/callback",
      scope: ["profile", "email", "https://www.googleapis.com/auth/documents"],
      accessType: "offline",
      prompt: "consent",
    },
    async ({ profile, accessToken }) => {
      let user = await prisma.user.findUnique({ where: { googleId: profile.id } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: profile.emails[0].value,
            name: profile.displayName,
            googleId: profile.id,
            googleToken: accessToken,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleToken: accessToken },
        });
      }
      return user.id;
    }
  ),
  "google"
);

// Registro de usuario
export async function registerUser(email: string, password: string, name?: string) {
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hash,
      name,
    },
  });
}