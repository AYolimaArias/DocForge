import { json, type ActionFunctionArgs } from "@remix-run/node";
import path from "path";
import { readdir, stat, readFile } from "fs/promises";
import { ChatOpenAI } from "@langchain/openai";
import { loadQARefineChain } from "langchain/chains";
import { Document } from "@langchain/core/documents";

// La constante 'openai' ya no es necesaria aquí.

// Función para obtener todos los archivos de un directorio (versión final y robusta)
async function getAllFiles(dirPath: string): Promise<string[]> {
  let allFiles: string[] = [];
  try {
    const items = await readdir(dirPath);
    const ignoreExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.mp4', '.mov', '.mp3', '.lock'];
    const ignoreFiles = ['.gitignore', 'package-lock.json', 'yarn.lock'];


    for (const item of items) {
      if (ignoreFiles.includes(item)) continue;
      
      const itemPath = path.join(dirPath, item);
      const ext = path.extname(itemPath);
      if (ignoreExtensions.includes(ext)) continue;

      try {
        const stats = await stat(itemPath);
        if (stats.isDirectory()) {
          if (!['node_modules', '.git', '.vscode', 'dist', 'build'].includes(item)) {
            const nestedFiles = await getAllFiles(itemPath);
            allFiles = allFiles.concat(nestedFiles);
          }
        } else {
          allFiles.push(itemPath);
        }
      } catch (err) {
        continue;
      }
    }
  } catch (err) {
    console.error(`[DocForge] NATIVE: Failed to read directory: ${dirPath}`, err);
    return [];
  }
  return allFiles;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { prompt, extractPath, selectedFiles } = await request.json();

    if (!prompt) {
      return json({ error: "Prompt is required." }, { status: 400 });
    }

    let filesToProcess = selectedFiles || [];
    if (extractPath && filesToProcess.length === 0) {
      const allProjectFiles = await getAllFiles(extractPath);
      filesToProcess = allProjectFiles.map(filePath => path.relative(extractPath, filePath));
    }

    if (!filesToProcess || filesToProcess.length === 0) {
        return json({ error: "No files found to analyze." }, { status: 400 });
    }

    const docs: Document[] = [];
    for (const file of filesToProcess) {
        const filePath = path.join(extractPath, file);
        try {
            await stat(filePath);
            const content = await readFile(filePath, "utf-8");
            // Usar solo una parte del archivo para no sobrecargar cada paso
            const truncatedContent = content.substring(0, 4000);
            docs.push(new Document({ pageContent: truncatedContent, metadata: { source: file } }));
        } catch (err) {
            continue;
        }
    }

    if (docs.length === 0) {
        return json({ error: "Could not read any of the selected files." }, { status: 400 });
    }

    // Usar la estrategia de "Refine" de LangChain
    const llm = new ChatOpenAI({ modelName: "gpt-3.5-turbo-0125", temperature: 0.2 });
    const chain = loadQARefineChain(llm);
    
    const result = await chain.invoke({
        input_documents: docs, // La cadena de Refine maneja los documentos uno por uno
        question: prompt,
    });

    return json({ message: result.output_text });

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