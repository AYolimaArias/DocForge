import type { ActionFunctionArgs } from "@remix-run/node";
import fs from 'fs';
import path from 'path';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Método no permitido', { status: 405 });
  }

  try {
    const { repo } = await request.json();
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'GitHub token no configurado' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clonar el repositorio
    const uploadDir = path.join(process.cwd(), 'uploads');
    const extractPath = path.join(uploadDir, 'github', repo.replace('/', '_'), Date.now().toString());
    
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    // Usar git clone
    const { execSync } = require('child_process');
    execSync(`git clone https://github.com/${repo}.git "${extractPath}"`, { stdio: 'inherit' });

    // Obtener lista de archivos
    const getAllFiles = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        if (file === '.git') return; // Ignorar .git
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getAllFiles(filePath));
        } else {
          results.push(filePath.replace(extractPath + '/', ''));
        }
      });
      return results;
    };

    const files = getAllFiles(extractPath);

    return new Response(JSON.stringify({
      files,
      extractPath
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error analyzing GitHub repo:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 