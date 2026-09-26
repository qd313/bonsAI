// Tests for the overnight test run's first slice (plan 70, row 13 / helper N).
// Run with:  node --test scripts/deck_overnight_run.test.mjs
//
// Not wired into `npm test` (vitest only collects src/**/*.test.{ts,tsx}) or
// `npm run test:py` (Python only) -- there is no existing runner for a
// script under scripts/, so this uses Node's own built-in test runner
// instead of adding a new dependency or touching either config file (neither
// is in this helper's file list). See the report for the exact command.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import {
  readMcpServerConfig,
  listCheckFiles,
  classifyReplayOutcome,
  runPythonQuickCheck,
  formatTimestampLabel,
  buildReport,
  writeReport,
  runOvernightSlice,
} from "./lib/deckOvernightRun.mjs";
import { main as runCli } from "./deck_overnight_run.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FAKE_SERVER = path.join(__dirname, "testFixtures", "fakeMcpServer.mjs");

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---------------------------------------------------------------------------
// readMcpServerConfig
// ---------------------------------------------------------------------------

test("readMcpServerConfig reads the named server's command, args and env at run time", () => {
  const dir = makeTempDir("bonsai-mcpjson-");
  const mcpJsonPath = path.join(dir, ".mcp.json");
  fs.writeFileSync(
    mcpJsonPath,
    JSON.stringify({
      mcpServers: {
        "decky-plugin-studio": {
          command: "node",
          args: ["some/dist/index.js"],
          env: { DECKY_STUDIO_WORKSPACE: "c:/somewhere" },
        },
      },
    })
  );
  const config = readMcpServerConfig(mcpJsonPath, "decky-plugin-studio");
  assert.equal(config.command, "node");
  assert.deepEqual(config.args, ["some/dist/index.js"]);
  assert.deepEqual(config.env, { DECKY_STUDIO_WORKSPACE: "c:/somewhere" });
});

test("readMcpServerConfig refuses a missing server name rather than guessing", () => {
  const dir = makeTempDir("bonsai-mcpjson-");
  const mcpJsonPath = path.join(dir, ".mcp.json");
  fs.writeFileSync(mcpJsonPath, JSON.stringify({ mcpServers: { bonsai: { command: "node", args: [] } } }));
  assert.throws(() => readMcpServerConfig(mcpJsonPath, "decky-plugin-studio"), /no "decky-plugin-studio" entry/);
});

// ---------------------------------------------------------------------------
// listCheckFiles
// ---------------------------------------------------------------------------

test("listCheckFiles finds every *.json walk, sorted by name, and ignores other files", () => {
  const dir = makeTempDir("bonsai-checks-");
  fs.writeFileSync(path.join(dir, "walkB.json"), "{}");
  fs.writeFileSync(path.join(dir, "walkA.json"), "{}");
  fs.writeFileSync(path.join(dir, "notes.txt"), "not a walk");
  const files = listCheckFiles(dir);
  assert.deepEqual(
    files.map((f) => f.name),
    ["walkA", "walkB"]
  );
});

test("listCheckFiles returns an empty list rather than throwing when checks/ does not exist", () => {
  assert.deepEqual(listCheckFiles(path.join(os.tmpdir(), "bonsai-does-not-exist-xyz")), []);
});

// ---------------------------------------------------------------------------
// classifyReplayOutcome
// ---------------------------------------------------------------------------

test("classifyReplayOutcome reports a matched walk", () => {
  const callResult = {
    content: [
      {
        type: "text",
        text: JSON.stringify({ checked: [{ name: "walkA", ok: true, buildHashMatch: true, summary: "no diff" }], errors: [], ok: true }),
      },
    ],
  };
  assert.deepEqual(classifyReplayOutcome("walkA", callResult), { name: "walkA", status: "matched", detail: "no diff" });
});

test("classifyReplayOutcome reports differences, including across two builds", () => {
  const callResult = {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          checked: [{ name: "walkB", ok: false, buildHashMatch: false, summary: "1 difference(s)", messages: ["step 2 differs"] }],
          errors: [],
          ok: false,
        }),
      },
    ],
  };
  const outcome = classifyReplayOutcome("walkB", callResult);
  assert.equal(outcome.status, "differences");
  assert.equal(outcome.buildHashMatch, false);
  assert.deepEqual(outcome.messages, ["step 2 differs"]);
});

test("classifyReplayOutcome reports a tool failure (isError) as could_not_run", () => {
  const callResult = { content: [{ type: "text", text: "the bridge is not reachable" }], isError: true };
  const outcome = classifyReplayOutcome("walkC", callResult);
  assert.equal(outcome.status, "could_not_run");
  assert.match(outcome.reason, /bridge is not reachable/);
});

test("classifyReplayOutcome reports a malformed check file (the tool's own errors list) as could_not_run", () => {
  const callResult = {
    content: [{ type: "text", text: JSON.stringify({ checked: [], errors: [{ file: "walkD.json", message: "not valid JSON" }], ok: false }) }],
  };
  const outcome = classifyReplayOutcome("walkD", callResult);
  assert.equal(outcome.status, "could_not_run");
  assert.match(outcome.reason, /not valid JSON/);
});

test("classifyReplayOutcome copes with an unreadable answer without throwing", () => {
  assert.equal(classifyReplayOutcome("walkE", { content: [{ type: "text", text: "not json" }] }).status, "could_not_run");
  assert.equal(classifyReplayOutcome("walkE", {}).status, "could_not_run");
});

// ---------------------------------------------------------------------------
// runPythonQuickCheck / formatTimestampLabel / buildReport / writeReport
// ---------------------------------------------------------------------------

test("runPythonQuickCheck reports ok on a zero exit code", () => {
  const result = runPythonQuickCheck({ repoRoot: __dirname, pythonCommand: process.execPath, args: ["-e", "console.log('quick check stand-in'); process.exit(0)"] });
  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0);
  assert.match(result.output, /quick check stand-in/);
});

test("runPythonQuickCheck reports not-ok on a non-zero exit code, without throwing", () => {
  const result = runPythonQuickCheck({ repoRoot: __dirname, pythonCommand: process.execPath, args: ["-e", "process.exit(3)"] });
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 3);
});

test("formatTimestampLabel is sortable and fixed-width", () => {
  const label = formatTimestampLabel(new Date(2026, 8, 26, 1, 2, 3)); // month is 0-based: 8 = September
  assert.equal(label, "2026-09-26-010203");
});

test("buildReport's markdown names each walk's outcome in plain words", () => {
  const { markdown } = buildReport({
    startedAt: new Date(2026, 0, 1, 0, 0, 0),
    finishedAt: new Date(2026, 0, 1, 0, 5, 0),
    mcpConfig: { command: "node", args: ["server.js"] },
    steps: {
      holdAwake: { ok: true },
      deploy: { ok: true },
      replays: [
        { name: "walkA", status: "matched", detail: "no diff" },
        { name: "walkB", status: "differences", detail: "1 difference(s)" },
        { name: "walkC", status: "could_not_run", reason: "the bridge is not reachable" },
      ],
    },
    quickCheck: { ok: true, command: "python scripts/verify.py --quick" },
  });
  assert.match(markdown, /walkA.*matched/s);
  assert.match(markdown, /walkB.*showed differences/s);
  assert.match(markdown, /walkC.*could not run.*bridge is not reachable/s);
  assert.match(markdown, /never verified|working as designed|not a failure by itself/);
});

test("writeReport writes a .json and a matching .md, named by the given timestamp label", () => {
  const dir = makeTempDir("bonsai-report-");
  const report = buildReport({
    startedAt: new Date(),
    finishedAt: new Date(),
    mcpConfig: { command: "node", args: [] },
    steps: { holdAwake: { ok: true }, deploy: { ok: true }, replays: [] },
    quickCheck: { ok: true, command: "python scripts/verify.py --quick" },
  });
  const { jsonPath, mdPath } = writeReport(dir, report, "2026-09-26-010203");
  assert.equal(jsonPath, path.join(dir, "overnight-2026-09-26-010203.json"));
  assert.equal(mdPath, path.join(dir, "overnight-2026-09-26-010203.md"));
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).deckTools.command, "node");
  assert.match(fs.readFileSync(mdPath, "utf8"), /Overnight test run/);
});

// ---------------------------------------------------------------------------
// runOvernightSlice, against the fake stand-in server (never the real Deck)
// ---------------------------------------------------------------------------

function writeFakeServerConfig(dir, rules) {
  const configPath = path.join(dir, "fake-config.json");
  fs.writeFileSync(configPath, JSON.stringify({ toolNames: ["deck_holdAwake", "deck_deploy", "deck_replayChecks"], rules }));
  return configPath;
}

function readLog(logPath) {
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("runOvernightSlice calls hold-awake, then deploy, then one replay per saved walk, in order", async () => {
  const dir = makeTempDir("bonsai-slice-");
  const checksDir = path.join(dir, "checks");
  fs.mkdirSync(checksDir);
  for (const name of ["walkA", "walkB", "walkC"]) fs.writeFileSync(path.join(checksDir, `${name}.json`), "{}");

  const logPath = path.join(dir, "log.jsonl");
  const configPath = writeFakeServerConfig(dir, [
    { name: "deck_holdAwake", result: { ok: true, held: true } },
    { name: "deck_deploy", result: { ok: true } },
    {
      name: "deck_replayChecks",
      when: { only: ["walkA"] },
      result: { checked: [{ name: "walkA", ok: true, buildHashMatch: true, summary: "1/1 check(s) passed" }], errors: [], ok: true },
    },
    {
      name: "deck_replayChecks",
      when: { only: ["walkB"] },
      result: {
        checked: [{ name: "walkB", ok: false, buildHashMatch: true, messages: ["step 2: expected X, got Y"], summary: "1 difference(s)" }],
        errors: [],
        ok: false,
      },
    },
    { name: "deck_replayChecks", when: { only: ["walkC"] }, throw: "the bridge is not reachable" },
  ]);

  const report = await runOvernightSlice({
    mcpConfig: { command: process.execPath, args: [FAKE_SERVER], env: { FAKE_MCP_CONFIG: configPath, FAKE_MCP_LOG: logPath } },
    repoRoot: dir,
    checksDir,
    pythonCommand: process.execPath,
    verifyArgs: ["-e", "process.exit(0)"],
  });

  const log = readLog(logPath);
  assert.deepEqual(
    log.map((e) => e.name),
    ["deck_holdAwake", "deck_deploy", "deck_replayChecks", "deck_replayChecks", "deck_replayChecks"]
  );
  assert.deepEqual(
    log.slice(2).map((e) => e.args.only),
    [["walkA"], ["walkB"], ["walkC"]]
  );
  assert.equal(log[0].args.ttlMinutes, 120);

  assert.equal(report.json.holdAwake.ok, true);
  assert.equal(report.json.deploy.ok, true);
  assert.deepEqual(
    report.json.replays.map((r) => [r.name, r.status]),
    [
      ["walkA", "matched"],
      ["walkB", "differences"],
      ["walkC", "could_not_run"],
    ]
  );
  assert.match(report.json.replays[2].reason, /bridge is not reachable/);
  assert.equal(report.json.quickCheck.ok, true);
});

test("runOvernightSlice still runs the quick check and writes a full report when the Deck tools never start", async () => {
  const dir = makeTempDir("bonsai-slice-noserver-");
  const checksDir = path.join(dir, "checks");
  fs.mkdirSync(checksDir);
  fs.writeFileSync(path.join(checksDir, "walkA.json"), "{}");

  const report = await runOvernightSlice({
    mcpConfig: { command: "bonsai-command-that-does-not-exist-xyz", args: [], env: {} },
    repoRoot: dir,
    checksDir,
    pythonCommand: process.execPath,
    verifyArgs: ["-e", "process.exit(0)"],
    callTimeoutMs: 5000,
  });

  assert.equal(report.json.holdAwake.ok, false);
  assert.equal(report.json.deploy.ok, false);
  assert.equal(report.json.replays[0].status, "could_not_run");
  // The quick check does not depend on the Deck tools, so it still ran:
  assert.equal(report.json.quickCheck.ok, true);
  assert.ok(report.json.startedAt);
  assert.ok(report.json.finishedAt);
});

// ---------------------------------------------------------------------------
// The command line wrapper's --dry-run: prints the plan, starts nothing
// ---------------------------------------------------------------------------

test("--dry-run lists every planned call and starts nothing", async () => {
  const dir = makeTempDir("bonsai-dryrun-");
  const checksDir = path.join(dir, "checks");
  fs.mkdirSync(checksDir);
  fs.writeFileSync(path.join(checksDir, "walkA.json"), "{}");
  fs.writeFileSync(path.join(checksDir, "walkB.json"), "{}");

  const sentinelPath = path.join(dir, "sentinel.txt");
  fs.writeFileSync(
    path.join(dir, ".mcp.json"),
    JSON.stringify({
      mcpServers: {
        "decky-plugin-studio": {
          command: process.execPath,
          args: ["-e", `require('fs').writeFileSync(${JSON.stringify(sentinelPath)}, 'ran')`],
          env: {},
        },
      },
    })
  );

  const logged = [];
  const originalLog = console.log;
  console.log = (...args) => logged.push(args.join(" "));
  try {
    const code = await runCli(["--dry-run"], { repoRoot: dir });
    assert.equal(code, 0);
  } finally {
    console.log = originalLog;
  }

  const output = logged.join("\n");
  assert.match(output, /Dry run/);
  assert.match(output, /walkA/);
  assert.match(output, /walkB/);
  assert.match(output, /deck_holdAwake/);
  assert.match(output, /deck_deploy/);
  assert.match(output, /verify\.py --quick/);
  assert.equal(fs.existsSync(sentinelPath), false, "dry run must never start the configured command");
});

test("the CLI script itself runs standalone (smoke test via node --check)", () => {
  // Confirms the file is syntactically valid ESM the way `node scripts/deck_overnight_run.mjs`
  // would load it, without actually starting anything.
  execFileSync(process.execPath, ["--check", path.join(__dirname, "deck_overnight_run.mjs")]);
});
