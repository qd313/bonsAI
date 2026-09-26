#!/usr/bin/env node
// Plan 70, row 13 (helper N): "A first slice of the overnight test run."
// Run by hand:
//   node scripts/deck_overnight_run.mjs
// Print the plan without starting anything:
//   node scripts/deck_overnight_run.mjs --dry-run
//
// Starts the Deck tools server (decky-plugin-studio) the same way Claude
// Code does -- reading its command, args and env from this repo's .mcp.json
// at run time, never a hard-coded copy -- then calls, in order:
// deck_holdAwake, deck_deploy, and deck_replayChecks once per saved walk
// under checks/. Then runs `python scripts/verify.py --quick` on this PC.
// Writes one report (a .json and a matching .md) under docs/test-evidence/.
//
// Never touches the real Deck itself in a test: see
// scripts/deck_overnight_run.test.mjs, which runs this against a fake stand-in
// server instead.
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readMcpServerConfig,
  listCheckFiles,
  runOvernightSlice,
  writeReport,
  formatTimestampLabel,
} from "./lib/deckOvernightRun.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const MCP_SERVER_NAME = "decky-plugin-studio";
const VERIFY_ARGS = ["scripts/verify.py", "--quick"];

function printDryRun({ mcpConfig, checksDir, reportDir }) {
  const files = listCheckFiles(checksDir);
  console.log("Dry run -- nothing is started. In order, a real run would:");
  console.log(`  1. start the Deck tools: ${mcpConfig.command} ${mcpConfig.args.join(" ")}`);
  console.log("  2. call deck_holdAwake with { ttlMinutes: 120 }");
  console.log("  3. call deck_deploy");
  if (files.length === 0) {
    console.log(`  4. (no saved walks found under ${checksDir})`);
  } else {
    files.forEach(({ name }, i) => {
      console.log(`  4.${i + 1}. call deck_replayChecks with { only: ["${name}"] }`);
    });
  }
  console.log(`  5. run: python ${VERIFY_ARGS.join(" ")}`);
  console.log(`  6. write one report under ${reportDir}`);
}

export async function main(argv, { repoRoot = REPO_ROOT } = {}) {
  const dryRun = argv.includes("--dry-run");
  const mcpJsonPath = path.join(repoRoot, ".mcp.json");
  const mcpConfig = readMcpServerConfig(mcpJsonPath, MCP_SERVER_NAME);
  const checksDir = path.join(repoRoot, "checks");
  const reportDir = path.join(repoRoot, "docs", "test-evidence");

  if (dryRun) {
    printDryRun({ mcpConfig, checksDir, reportDir });
    return 0;
  }

  const startedAt = new Date();
  console.log(`Starting the overnight slice at ${startedAt.toISOString()}...`);

  const report = await runOvernightSlice({
    mcpConfig,
    repoRoot,
    checksDir,
    verifyArgs: VERIFY_ARGS,
  });

  const { jsonPath, mdPath } = writeReport(reportDir, report, formatTimestampLabel(new Date()));
  console.log(`Report written: ${jsonPath}`);
  console.log(`Report written: ${mdPath}`);
  return 0;
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code ?? 0),
    (err) => {
      console.error(err);
      process.exit(1);
    }
  );
}
