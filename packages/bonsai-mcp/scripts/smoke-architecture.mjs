#!/usr/bin/env node
/**
 * Title: Tool server start-up smoke test
 *
 * Purpose: Start the built tool server (dist/index.js) the way an editor does, and check that
 * it builds its architecture maps by itself before it answers. Two runs: one with every map
 * deleted first, where the three architecture tools must answer with real content; one
 * against a stand-in repo whose map builder always fails, where the server must still start
 * and each tool must say the map could not be built.
 * Used for: `npm run smoke` in packages/bonsai-mcp, after `npm run build`. Not part of CI
 * (it needs the built dist/ and Python).
 * Solves: The maps used to be saved in the repo, so nothing ever proved the server could make
 * them. A server that crashed at start-up because a builder failed would have been invisible.
 * Does not: leave a server running (each run closes its client, which ends the child process),
 * touch any tracked file, or test the other tools.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(PKG, "..", "..");
const SERVER = path.join(PKG, "dist", "index.js");
const ARCH = path.join(PKG, "knowledge", "architecture");
const MAPS = [
  "rpc-map.json",
  "hotspots.json",
  "import-graph.json",
  "test-inventory.json",
  "env-vars.json",
  "py-import-graph.json",
];

let failures = 0;
function check(ok, what) {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures++;
}

async function askServer(repoRoot) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
    env: { ...process.env, BONSAI_REPO_ROOT: repoRoot },
    stderr: "pipe",
  });
  const client = new Client({ name: "smoke", version: "0.0.0" });
  await client.connect(transport);
  try {
    const out = {};
    for (const tool of ["bonsai.arch.rpcMap", "bonsai.arch.hotspots"]) {
      const res = await client.callTool({ name: tool, arguments: {} });
      out[tool] = { text: res.content.map((c) => c.text ?? "").join("\n"), isError: Boolean(res.isError) };
    }
    return out;
  } finally {
    await client.close();
  }
}

// Run 1: the real repo, every map deleted first.
for (const name of MAPS) fs.rmSync(path.join(ARCH, name), { force: true });
const real = await askServer(REPO_ROOT);
function parseOrNull(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
const rpc = parseOrNull(real["bonsai.arch.rpcMap"].text);
check(Boolean(rpc) && rpc.methods.length > 10, `rpc map has content (${rpc ? rpc.methods.length : 0} methods)`);
check(real["bonsai.arch.hotspots"].text.includes("## hotspots.json") && real["bonsai.arch.hotspots"].text.includes("## test-inventory.json"), "hotspots answer carries hotspots and the test inventory");
for (const name of MAPS) check(fs.existsSync(path.join(ARCH, name)), `${name} was written at start-up`);

// Run 2: a stand-in repo whose map builder always fails.
const fake = fs.mkdtempSync(path.join(os.tmpdir(), "bonsai-smoke-"));
try {
  fs.writeFileSync(path.join(fake, "plugin.json"), "{}");
  fs.writeFileSync(path.join(fake, "main.py"), "");
  fs.mkdirSync(path.join(fake, "packages", "bonsai-mcp", "scripts"), { recursive: true });
  fs.mkdirSync(path.join(fake, "packages", "bonsai-mcp", "knowledge", "architecture"), { recursive: true });
  fs.writeFileSync(path.join(fake, "packages", "bonsai-mcp", "scripts", "generate-architecture.mjs"), "console.error('stand-in builder fails'); process.exit(1);\n");
  const broken = await askServer(fake);
  check(true, "server still started with a failing map builder");
  for (const tool of Object.keys(broken)) {
    check(broken[tool].text.includes("could not be built"), `${tool} says the map could not be built`);
  }
} finally {
  fs.rmSync(fake, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("smoke-architecture: OK");
