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
 *   npm run app:mobile →  static build in dist/client for the Android app (see ANDROID.md);
 *                         reads .env.mobile for the website address
 */
export default defineConfig(({ mode }) => {
  const mobile = mode === "mobile";
  return {
    publicDir: "public-app",
    server: { port: 3000, strictPort: true, host: "localhost" },
    preview: { port: 3000 },
    plugins: [
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        srcDirectory: "src",
        server: { entry: "server.ts" },
        // Phone app: one static page that boots the app, no Node server needed.
        ...(mobile ? { spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } } } : {}),
      }),
      react(),
    ],
  };
});
