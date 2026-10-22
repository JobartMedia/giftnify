import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * The Giftnify app (src/). It has no database of its own: every page reads and
 * writes through the website's API — set VITE_API_URL (default http://localhost:8000).
 *
 *   npm run app:dev    →  http://localhost:3000
 */
export default defineConfig({
  publicDir: "public-app",
  server: { port: 3000, strictPort: true, host: "localhost" },
  preview: { port: 3000 },
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({ srcDirectory: "src", server: { entry: "server.ts" } }),
    react(),
  ],
});
