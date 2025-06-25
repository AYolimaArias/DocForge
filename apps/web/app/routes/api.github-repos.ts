import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "../services/auth.server";
import { Octokit } from "@octokit/rest";


export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);

  if (!user) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const octokit = new Octokit({ auth: user.accessToken });

    const repos = await octokit.repos.listForAuthenticatedUser({
      type: "all",
      sort: "updated",
      per_page: 100, // Obtener hasta 100 repos
    });

    // Mapeamos para devolver solo los datos que necesitamos en el frontend
    const repoData = repos.data.map((repo) => ({
      id: repo.id,
      full_name: repo.full_name,
    }));

    return json(repoData);
  } catch (error) {
    console.error("Failed to fetch repos:", error);
    return json({ error: "Failed to fetch repositories" }, { status: 500 });
  }
} 