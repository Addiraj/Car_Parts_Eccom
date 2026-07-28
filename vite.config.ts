// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    serverFns: { disableCsrfMiddlewareWarning: true },
  },
  vite: {
    plugins: [
      {
        name: 'mock-sequelize-client',
        enforce: 'pre',
        resolveId(source, importer, options) {
          if (source === 'sequelize' && !options?.ssr) {
            return '\0mock-sequelize';
          }
        },
        load(id) {
          if (id === '\0mock-sequelize') {
            return `
              export class Sequelize {
                authenticate() { return Promise.resolve(); }
              }
              export const Op = new Proxy({}, { get: () => Symbol('Op') });
              export const DataTypes = new Proxy({}, { get: () => 'VARCHAR(255)' });
              export class Model {}
              export default { Sequelize, Op, DataTypes, Model };
            `;
          }
        }
      }
    ]
  }
});
