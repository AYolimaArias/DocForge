import { getToken } from "next-auth/jwt";
import type { NextApiRequest, NextApiResponse } from "next";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }
  const token = await getToken({ req });
  if (!token || !token.accessToken) {
    return res.status(401).json({ error: "No autenticado" });
  }
  const { repo } = req.body;
  if (!repo) {
    return res.status(400).json({ error: "Repo no especificado" });
  }
  try {
    // Descargar el ZIP del repo
    const zipUrl = `https://api.github.com/repos/${repo}/zipball`;
    const zipRes = await fetch(zipUrl, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!zipRes.ok) {
      return res.status(zipRes.status).json({ error: "Error al descargar el repo" });
    }
    const arrayBuffer = await zipRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Guardar ZIP temporalmente
    const tmpZipPath = path.join("/tmp", `repo_${Date.now()}.zip`);
    fs.writeFileSync(tmpZipPath, buffer);
    // Descomprimir
    const zip = new AdmZip(tmpZipPath);
    const extractPath = path.join("/tmp", `extract_repo_${Date.now()}`);
    zip.extractAllTo(extractPath, true);
    const files = [];
    function walk(dir: string, prefix = "") {
      fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        const relPath = prefix ? `${prefix}/${file}` : file;
        if (fs.statSync(filePath).isDirectory()) {
          walk(filePath, relPath);
        } else {
          files.push(relPath);
        }
      });
    }
    // El ZIP de GitHub suele tener una carpeta raíz con nombre aleatorio
    const rootDir = fs.readdirSync(extractPath)[0];
    walk(path.join(extractPath, rootDir));
    // Limpieza: eliminar el ZIP temporal
    fs.unlinkSync(tmpZipPath);
    return res.status(200).json({ files, extractPath: path.join(extractPath, rootDir) });
  } catch (e) {
    return res.status(500).json({ error: "Error al procesar el repo" });
  }
} 