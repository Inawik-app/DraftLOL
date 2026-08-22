import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["docs/**", "node_modules/**", ".next/**"],
  },
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
});
