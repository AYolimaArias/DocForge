import { getToken } from "next-auth/jwt";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req });
  if (!token || !token.accessToken) {
    return res.status(401).json({ error: "No autenticado" });
  }
  try {
    const ghRes = await fetch("https://api.github.com/user/repos?per_page=100", {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: "Error al obtener repositorios" });
    }
    const repos = await ghRes.json();
    res.status(200).json(repos);
  } catch (e) {
    res.status(500).json({ error: "Error interno" });
  }
} 