import type { ActionFunctionArgs } from "@remix-run/node";
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Configuración de límites de tokens
const MAX_TOKENS_PER_REQUEST = 4096; // Límite de contexto para gpt-3.5-turbo
const MAX_TOKENS_FOR_COMPLETION = 1024; // Tokens reservados para la respuesta
const MAX_TOKENS_FOR_CONTEXT = MAX_TOKENS_PER_REQUEST - MAX_TOKENS_FOR_COMPLETION;

// Ampliar soporte de lenguajes
const SUPPORTED_EXTS = [
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.cs', '.rb', '.go', '.c', '.cpp', '.h', '.swift', '.kt'
];

// Función para dividir el texto en chunks basados en caracteres
// Esta es una aproximación simple - en promedio, 1 token ≈ 4 caracteres en inglés
function splitIntoChunks(text: string, maxTokens: number): string[] {
  const avgCharsPerToken = 4;
  const maxCharsPerChunk = maxTokens * avgCharsPerToken;
  const chunks: string[] = [];
  
  let currentChunk = '';
  const lines = text.split('\n');
  
  for (const line of lines) {
    if ((currentChunk.length + line.length + 1) > maxCharsPerChunk) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      // Si una sola línea es más grande que el límite, la dividimos
      if (line.length > maxCharsPerChunk) {
        const parts = Math.ceil(line.length / maxCharsPerChunk);
        for (let i = 0; i < parts; i++) {
          chunks.push(line.slice(i * maxCharsPerChunk, (i + 1) * maxCharsPerChunk));
        }
      } else {
        currentChunk = line;
      }
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

function getAllFiles(dir: string, exts: string[] = SUPPORTED_EXTS): string[] {
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

// Función para procesar un chunk de código con la IA
async function processChunkWithAI(chunk: string, prompt: string, openai: OpenAI, model: string = 'gpt-3.5-turbo'): Promise<string> {
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'Eres un experto en documentación de software y análisis de código. Analiza el código proporcionado y genera documentación clara y concisa.' },
      { role: 'user', content: `${prompt}\n\nCódigo a analizar:\n${chunk}` }
    ],
    max_tokens: MAX_TOKENS_FOR_COMPLETION
  });

  return completion.choices[0]?.message?.content || '';
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Método no permitido', { status: 405 });
  }

  try {
    const { prompt, extractPath, selectedFiles = [], model = 'gpt-3.5-turbo' } = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No se encontró la API Key de OpenAI' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const openai = new OpenAI({
      apiKey: apiKey
    });

    // Obtener archivos a procesar
    let filesToRead: string[] = [];
    if (selectedFiles.length > 0) {
      filesToRead = selectedFiles.map((f: string) => path.join(extractPath, f));
    } else {
      filesToRead = getAllFiles(extractPath);
    }

    // Leer y procesar archivos
    let allCode = '';
    for (const file of filesToRead) {
      try {
        const relativePath = file.replace(extractPath + '/', '');
        const content = fs.readFileSync(file, 'utf-8');
        allCode += `\n\n// Archivo: ${relativePath}\n${content}`;
      } catch (error) {
        console.error(`Error leyendo archivo ${file}:`, error);
      }
    }

    // Dividir en chunks si es necesario
    const chunks = splitIntoChunks(allCode, MAX_TOKENS_FOR_CONTEXT);
    let finalResult = '';

    // Procesar cada chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkPrompt = chunks.length > 1 
        ? `${prompt} (Parte ${i + 1} de ${chunks.length} del código)`
        : prompt;
      
      const chunkResult = await processChunkWithAI(chunks[i], chunkPrompt, openai, model);
      finalResult += (i > 0 ? '\n\n' : '') + chunkResult;
    }

    // Si hubo múltiples chunks, hacer un resumen final
    if (chunks.length > 1) {
      const summaryPrompt = `Por favor, resume y consolida la siguiente documentación generada en partes:\n\n${finalResult}`;
      finalResult = await processChunkWithAI('', summaryPrompt, openai, model);
    }

    return new Response(JSON.stringify({ result: finalResult }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Error al consultar la IA' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 