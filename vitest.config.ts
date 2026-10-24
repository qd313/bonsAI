import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["src/test-harness/setup.ts"],
    // .tsx included so component and root tests can use JSX. Until 2026-08-02
    // this was .ts only, which is part of why 44 component files had no tests:
    // a .tsx test file was silently never collected.
    include: ["src/**/*.test.{ts,tsx}"],
    // Mounting the full plugin tree (index.test.tsx) is inherently slow, and
    // slower still when files run in parallel; 5s is not enough under load.
    testTimeout: 20000,
    globals: false,
  },
});
