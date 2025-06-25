import { json, type ActionFunctionArgs } from "@remix-run/node";
import fs from "fs/promises";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import * as remixNode from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Usamos el upload handler de Remix para manejar el archivo
    const uploadHandler = remixNode.unstable_createMemoryUploadHandler({
      maxPartSize: 20_000_000, // 20MB
    });
    const formData = await remixNode.unstable_parseMultipartFormData(request, uploadHandler);
    const file = formData.get("file");
    if (!file || typeof file === "string" || !("name" in file)) {
      return json({ error: "No se envió archivo" }, { status: 400 });
    }
    // Validar que sea ZIP
    if (!file.name.endsWith('.zip')) {
      return json({ error: "El archivo debe ser un ZIP (.zip)" }, { status: 400 });
    }
    // Guardar el archivo ZIP temporalmente
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 20_000_000) {
      return json({ error: "El archivo ZIP es demasiado grande (máx 20MB)" }, { status: 400 });
    }
    const tmpZipPath = path.join(os.tmpdir(), `upload_${Date.now()}.zip`);
    await fs.writeFile(tmpZipPath, buffer);
    // Extraer el ZIP
    const extractPath = path.join(os.tmpdir(), `extract_${Date.now()}`);
    let zip;
    try {
      zip = new AdmZip(tmpZipPath);
      zip.extractAllTo(extractPath, true);
    } catch (e) {
      await fs.unlink(tmpZipPath);
      console.error("Error extrayendo el ZIP:", e);
      return json({ error: "El archivo ZIP está corrupto o no es válido." }, { status: 400 });
    }
    // Obtener lista de archivos extraídos (recursivo)
    async function walk(dir: string, prefix = ""): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let files: string[] = [];
      for (const entry of entries) {
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(await walk(fullPath, relPath));
        } else {
          files.push(relPath);
        }
      }
      return files;
    }
    const files = await walk(extractPath);
    // Eliminar el ZIP temporal
    await fs.unlink(tmpZipPath);
    return json({ files, extractPath });
  } catch (e) {
    console.error("Error al procesar el archivo:", e);
    return json({ error: e instanceof Error ? e.message : "Error al procesar el archivo" }, { status: 500 });
  }
}; 