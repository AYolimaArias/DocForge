import { createCookieSessionStorage } from "@remix-run/node";

// Asegúrate de que esta variable de entorno esté definida en tu entorno de producción.
// Puedes usar un generador de secretos para crear un valor seguro.
const sessionSecret = process.env.SESSION_SECRET || "super-secret-dev-key";

if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "docforge_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage; 