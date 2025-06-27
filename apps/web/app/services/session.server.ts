import { createCookieSessionStorage, redirect } from "@remix-run/node";

// Asegúrate de que esta variable de entorno esté definida en tu entorno de producción.
// Puedes usar un generador de secretos para crear un valor seguro.
const sessionSecret = process.env.SESSION_SECRET || "supersecret";

if (!sessionSecret) {
  throw new Error("SESSION_SECRET debe estar definido en .env");
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
  },
});

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function requireUserId(request: Request) {
  const session = await getSession(request);
  const userId = session.get("userId");
  if (!userId) throw redirect("/login");
  return userId;
}

export async function createUserSession(userId: string, redirectTo: string, googleToken?: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  if (googleToken) session.set("googleToken", googleToken);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
} 