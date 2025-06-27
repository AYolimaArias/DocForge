import { json, type ActionFunctionArgs } from "@remix-run/node";
import path from "path";
import { readdir, stat, readFile } from "fs/promises";
import { ChatOpenAI } from "@langchain/openai";

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

// Función para obtener todos los archivos de un directorio
async function getAllFiles(dirPath: string, exts: string[] = SUPPORTED_EXTS): Promise<string[]> {
  let results: string[] = [];
  try {
    const items = await readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      try {
        const stats = await stat(itemPath);
        if (stats.isDirectory()) {
          if (!['node_modules', '.git', '.vscode', 'dist', 'build'].includes(item)) {
            const nestedFiles = await getAllFiles(itemPath, exts);
            results = results.concat(nestedFiles);
          }
        } else if (exts.includes(path.extname(itemPath))) {
          results.push(itemPath);
        }
      } catch (err) {
        continue;
      }
    }
  } catch (err) {
    console.error(`[DocForge] Failed to read directory: ${dirPath}`, err);
    return [];
  }
  return results;
}

// Función para procesar un chunk de código con la IA
async function processChunkWithAI(chunk: string, prompt: string, llm: ChatOpenAI): Promise<string> {
  const systemPrompt = `
Eres un experto en documentación de software y análisis de código.
IMPORTANTE:
- Si el prompt te pide generar múltiples archivos, DEBES usar el separador exacto ---ARCHIVO: nombre.ext--- antes de cada archivo.
- Cada bloque debe contener SOLO el contenido correspondiente a ese archivo, NO repitas el contenido de otros archivos en cada bloque.
- NO incluyas el código fuente del proyecto, SOLO la documentación solicitada.
- Si no puedes separar la documentación, responde solo con un archivo llamado error.md y el texto 'No se pudo separar'.
Ejemplo de formato correcto:
---ARCHIVO: readme.md---
# Título del README
Contenido del README...

---ARCHIVO: diagrama.mmd---
\`\`\`mermaid
diagram TD;
A-->B;
\`\`\`

---ARCHIVO: guia.docx---
# Guía de Usuario
Contenido de la guía...
`;

  const result = await llm.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${prompt}\n\nCódigo a analizar:\n${chunk}` }
  ]);

  return result.content as string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { prompt, extractPath, selectedFiles = [], model = 'gpt-4o' } = await request.json();

    if (!prompt) {
      return json({ error: "Prompt is required." }, { status: 400 });
    }

    // Obtener archivos a procesar
    let filesToRead: string[] = [];
    if (selectedFiles.length > 0) {
      filesToRead = selectedFiles.map((f: string) => path.join(extractPath, f));
    } else {
      filesToRead = await getAllFiles(extractPath);
    }

    if (filesToRead.length === 0) {
      return json({ error: "No files found to analyze." }, { status: 400 });
    }

    // Leer y procesar archivos
    let allCode = '';
    for (const file of filesToRead) {
      try {
        const relativePath = file.replace(extractPath + '/', '');
        const content = await readFile(file, 'utf-8');
        allCode += `\n\n// Archivo: ${relativePath}\n${content}`;
      } catch (error) {
        console.error(`Error leyendo archivo ${file}:`, error);
      }
    }

    // Dividir en chunks si es necesario
    const chunks = splitIntoChunks(allCode, MAX_TOKENS_FOR_CONTEXT);
    let finalResult = '';

    // Inicializar el modelo de IA
    const llm = new ChatOpenAI({ 
      modelName: model, 
      temperature: 0.2,
      maxTokens: MAX_TOKENS_FOR_COMPLETION
    });

    // Procesar cada chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkPrompt = chunks.length > 1 
        ? `${prompt} (Parte ${i + 1} de ${chunks.length} del código)`
        : prompt;
      
      const chunkResult = await processChunkWithAI(chunks[i], chunkPrompt, llm);
      finalResult += (i > 0 ? '\n\n' : '') + chunkResult;
    }

    // Si hubo múltiples chunks, hacer un resumen final
    if (chunks.length > 1) {
      const summaryPrompt = `Por favor, resume y consolida la siguiente documentación generada en partes. Mantén el formato de separadores ---ARCHIVO: nombre.ext--- si los hay:\n\n${finalResult}`;
      finalResult = await processChunkWithAI('', summaryPrompt, llm);
    }

    return json({ message: finalResult });

  } catch (error: any) {
    console.error("AI Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return json(
      { error: `Failed to communicate with AI model: ${errorMessage}` },
      { status: 500 }
    );
  }
};