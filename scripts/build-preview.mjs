#!/usr/bin/env node
import { spawnSync } from "child_process";

process.env.DECKY_PREVIEW = "true";
const result = spawnSync("pnpm", ["run", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DECKY_PREVIEW: "true" },
});
process.exit(result.status ?? 1);
