import { Authenticator } from "remix-auth";
import {
  GitHubStrategy,
  type GitHubExtraParams,
  type GitHubProfile,
} from "remix-auth-github";
import type { OAuth2StrategyVerifyParams } from "remix-auth-oauth2";
import { sessionStorage } from "./session.server";

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