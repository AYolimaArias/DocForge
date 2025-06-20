import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

installGlobals();

export default ({ mode }: { mode: string }) => {
  // Carga las variables de entorno del .env para el modo actual
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  return defineConfig({
    plugins: [remix(), tsconfigPaths()],
    server: {
      port: 3000,
    },
  });
}; 