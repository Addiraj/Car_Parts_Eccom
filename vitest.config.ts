import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/vin.server.ts",
        "src/lib/anon-vin-quota.ts",
        "src/lib/catalog.functions.ts",
        "src/lib/admin.functions.ts",
        "src/lib/admin.customers.functions.ts",
        "src/lib/admin.orders.functions.ts",
        "src/lib/admin.quotations.functions.ts",
        "src/lib/admin.notifications.functions.ts",
      ],
      exclude: ["**/*.d.ts", "**/node_modules/**"],
      thresholds: {
        lines: 30,
        functions: 25,
        statements: 30,
        branches: 15,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
