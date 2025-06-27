import { Authenticator } from "remix-auth";
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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
}

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
    
    // Devolver un objeto User consistente
    return {
      id: user.id,
      name: user.name || "",
      email: user.email,
      avatar_url: "",
      accessToken: "",
    };
  }),
  "user-pass"
);

// Estrategia de Google OAuth
authenticator.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      scope: ["profile", "email", "https://www.googleapis.com/auth/documents"],
      accessType: "offline",
      prompt: "consent",
    },
    async ({ profile, accessToken }) => {
      try {
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
        // Devolver un objeto User consistente
        return {
          id: user.id,
          name: user.name || profile.displayName,
          email: user.email,
          avatar_url: profile.photos?.[0]?.value ?? "",
          accessToken: accessToken,
        };
      } catch (error) {
        console.error("Error en GoogleStrategy:", error);
        throw error;
      }
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