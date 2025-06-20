import { json, type ActionFunctionArgs } from "@remix-run/node";
import fs from "fs/promises";
import path from "path";
import os from "os";
import simpleGit from "simple-git";
import { authenticator } from "../services/auth.server";

async function getRepoFiles(dir: string, prefix = ""): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let allFiles: string[] = [];

    for (const entry of entries) {
        // Ignorar la carpeta .git
        if (entry.name === '.git') continue;

        const res = path.resolve(dir, entry.name);
        const relativePath = path.join(prefix, entry.name);

        if (entry.isDirectory()) {
            allFiles = allFiles.concat(await getRepoFiles(res, relativePath));
        } else {
            allFiles.push(relativePath);
        }
    }
    return allFiles;
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  if (!user) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  const { repo: repoFullName } = await request.json();

  if (!repoFullName) {
    return json({ error: "No repository provided." }, { status: 400 });
  }
  
  const extractPath = await fs.mkdtemp(path.join(os.tmpdir(), "docforge-gh-"));

  try {
    const git = simpleGit();
    const repoUrl = `https://x-access-token:${user.accessToken}@github.com/${repoFullName}.git`;
    
    await git.clone(repoUrl, extractPath, ['--depth', '1']); // Clonación superficial

    const files = await getRepoFiles(extractPath);

    return json({ files, extractPath });
  } catch (error: any) {
    console.error(`Failed to clone or analyze repo ${repoFullName}:`, error);
    // Limpiar la carpeta temporal en caso de error
    await fs.rm(extractPath, { recursive: true, force: true });
    return json({ error: `Failed to analyze repo: ${error.message}` }, { status: 500 });
  }
} 