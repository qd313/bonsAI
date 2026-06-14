import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["src/test-harness/setup.ts"],
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
