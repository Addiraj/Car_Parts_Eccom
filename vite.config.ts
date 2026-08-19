import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      routeFileIgnorePrefix: "-",
      routeFileIgnorePattern: ".*\\/api\\/.*|.*\\/lovable\\/.*",
      quoteStyle: "single",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tanstack/react-start/server": path.resolve(__dirname, "./src/lib/compat/react-start.ts"),
      "@tanstack/react-start": path.resolve(__dirname, "./src/lib/compat/react-start.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
  server: {
    port: 8080,
  },
});
