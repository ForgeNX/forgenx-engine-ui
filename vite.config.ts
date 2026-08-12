import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    host: "0.0.0.0",
    proxy: {
      // Engine lifecycle actions (start/stop/restart) are performed by forgenxd
      // (8000), not the engine (8080). More-specific key wins in Vite, so these
      // route to forgenxd while everything else stays on the engine. In
      // production the serving layer (nginx/forgenxd) handles this routing.
      "/api/apps/forgenx-engine": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // forgenxd platform-identity probe. /api/version returns {product:"ForgeNX"}
      // only on forgenxd (the engine 404s it), so the kebab uses it to positively
      // detect ForgeNX and show engine-lifecycle controls only where they work.
      "/api/version": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../static",
    emptyOutDir: true,
  },
});
