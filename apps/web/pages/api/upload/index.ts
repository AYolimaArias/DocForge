import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const upload = multer({ dest: '/tmp' });

export const config = {
  api: {
    bodyParser: false,
  },
};

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    await runMiddleware(req, res, upload.single('file'));
    // @ts-ignore
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No se envió archivo' });
    }
    const zip = new AdmZip(file.path);
    const extractPath = path.join('/tmp', `extract_${Date.now()}`);
    zip.extractAllTo(extractPath, true);
    const files = fs.readdirSync(extractPath);
    fs.unlinkSync(file.path);
    return res.status(200).json({ files, extractPath });
  } catch (e) {
    return res.status(500).json({ error: 'Error al procesar el archivo' });
  }
} 