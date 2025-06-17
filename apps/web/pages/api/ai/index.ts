import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

function getAllFiles(dir: string, exts: string[] = ['.js', '.ts', '.jsx', '.tsx', '.py']): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, exts));
    } else if (exts.includes(path.extname(file))) {
      results.push(filePath);
    }
  });
  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    const { prompt, extractPath, selectedFiles = [], model = 'gpt-3.5-turbo' } = req.body;
    let filesToRead: string[] = [];
    if (selectedFiles.length > 0) {
      filesToRead = selectedFiles.map((f: string) => path.join(extractPath, f));
    } else {
      filesToRead = getAllFiles(extractPath);
    }
    let code = '';
    for (const file of filesToRead) {
      try {
        code += `\n\n// Archivo: ${file.replace(extractPath + '/', '')}\n`;
        code += fs.readFileSync(file, 'utf-8');
      } catch {}
    }
    const fullPrompt = `${prompt}\n\n${code}`;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'No se encontró la API Key de OpenAI' });
    }
    const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Eres un experto en documentación de software y análisis de código.' },
          { role: 'user', content: fullPrompt }
        ],
        max_tokens: 1024
      })
    });
    if (!completionRes.ok) {
      const error = await completionRes.json();
      return res.status(500).json({ error: error.error?.message || 'Error al consultar la IA' });
    }
    const completion = await completionRes.json();
    return res.status(200).json({ result: completion.choices[0].message?.content });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Error al consultar la IA' });
  }
} 