import { defineConfig } from "vitest/config";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rls/**/*.{test,spec}.ts"],
    testTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
