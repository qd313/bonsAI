#!/usr/bin/env node
/**
 * Drive Decky Plugin Studio preview IPC to run tests/preview-suite/*.json scenarios.
 * Requires: Decky: Open Preview in Cursor (preview panel + sidecar running).
 *
 * Usage:
 *   node scripts/run-preview-suite.mjs [--write] [--evidence] [--tier=preGate|tier0|tier1Core|...] [--filter=SMOKE-A]
 *
 * Evidence: workshop:test-evidence/<batch>/<date>-<sha>/<scenario-id>/
 * Tier batches: tests/preview-suite/tier-manifest.json
 */
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const suiteDir = path.join(repoRoot, "tests", "preview-suite");
const tierManifestPath = path.join(suiteDir, "tier-manifest.json");
const resultsDir = path.join(repoRoot, "tests", "preview-results");
const evidenceRoot = path.join(repoRoot, "docs", "test-evidence");
const ipcDir = path.join(os.homedir(), ".decky-plugin-studio", "preview-ipc");
const previewStatePath = path.join(os.homedir(), ".decky-plugin-studio", "preview-state.json");
const testingDocPath = path.join(repoRoot, "docs", "testing.md");
const promptTestingPath = path.join(repoRoot, "docs", "archive", "testing-results-2026.md");
const promptTestingFailuresPath = path.join(repoRoot, "docs", "archive", "testing-failures-2026.md");
const runbookPath = path.join(repoRoot, "docs", "testing-manual.md");

const args = process.argv.slice(2);
const writeBack = args.includes("--write");
const evidenceFlag = args.includes("--evidence") || writeBack;
const filterArg = args.find((a) => a.startsWith("--filter="))?.split("=")[1] ?? "";
const tierArg = args.find((a) => a.startsWith("--tier="))?.split("=")[1] ?? "";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getGitShaShort() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "unknown";
}

function getRunDate() {
  return new Date().toISOString().slice(0, 10);
}

function relRepoPath(absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}

function relFromDocs(absPath) {
  const rel = path.relative(path.join(repoRoot, "docs"), absPath).split(path.sep).join("/");
  return rel.startsWith("..") ? relRepoPath(absPath) : rel;
}

function readPreviewState() {
  if (!fs.existsSync(previewStatePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(previewStatePath, "utf8"));
  } catch {
    return null;
  }
}

function loadTierManifest() {
  if (!fs.existsSync(tierManifestPath)) {
    throw new Error("Missing tests/preview-suite/tier-manifest.json");
  }
  return JSON.parse(fs.readFileSync(tierManifestPath, "utf8"));
}

function getSandboxLogPath() {
  const workspaceName = path.basename(repoRoot);
  return path.join(os.homedir(), ".decky-plugin-studio", "sandbox", workspaceName, "plugin.log");
}

function readPluginLogTail(maxLines = 80) {
  const logPath = getSandboxLogPath();
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-maxLines);
}

function redactSecrets(value) {
  const json = JSON.stringify(value);
  const redacted = json
    .replace(/"(api[_-]?key|token|secret|password)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"')
    .replace(/sk-[a-zA-Z0-9]{16,}/g, "[REDACTED]")
    .replace(/[a-f0-9]{32,}/gi, (m) => (m.length > 40 ? "[REDACTED]" : m));
  try {
    return JSON.parse(redacted);
  } catch {
    return redacted;
  }
}

async function sendIpc(command, timeoutMs = 120_000) {
  fs.mkdirSync(ipcDir, { recursive: true });
  const id = randomUUID();
  const payload = { ...command, id };
  fs.writeFileSync(path.join(ipcDir, `cmd-${id}.json`), JSON.stringify(payload), "utf8");
  if (command.cmd === "injectFocus") {
    await sleep(300);
    return { ok: true };
  }
  const resultPath = path.join(ipcDir, `result-${id}.json`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(resultPath)) {
      const raw = fs.readFileSync(resultPath, "utf8");
      fs.unlinkSync(resultPath);
      return JSON.parse(raw);
    }
    await sleep(50);
  }
  throw new Error(`IPC timeout for ${command.cmd}`);
}

async function sidecarRpc(method, rpcArgs = []) {
  const state = readPreviewState();
  const port = state?.httpPort ?? 8766;
  const res = await fetch(`http://127.0.0.1:${port}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, args: rpcArgs }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function captureScreenshotArtifact(outPath) {
  const res = await sendIpc({ cmd: "captureScreenshot" });
  if (!res.ok) throw new Error(res.error ?? "captureScreenshot failed");
  const result = res.result ?? {};
  if (result.pngBase64) {
    fs.writeFileSync(outPath, Buffer.from(result.pngBase64, "base64"));
    return { type: "png", path: outPath };
  }
  if (result.htmlFallback) {
    const htmlPath = outPath.replace(/\.png$/, ".html");
    fs.writeFileSync(htmlPath, result.htmlFallback, "utf8");
    return { type: "html", path: htmlPath };
  }
  return null;
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function writeStepArtifacts(evidenceDir, stepIndex, step, context) {
  const stepsDir = path.join(evidenceDir, "steps");
  fs.mkdirSync(stepsDir, { recursive: true });
  const prefix = path.join(stepsDir, `step-${String(stepIndex).padStart(2, "0")}-${step.action}`);
  const snapshot = {
    stepIndex,
    action: step.action,
    activeElement: context.lastActive ?? null,
    focusPath: context.lastFocusPath ?? null,
  };
  writeJson(`${prefix}.json`, snapshot);
  if (context.lastDom) {
    fs.writeFileSync(`${prefix}.html`, context.lastDom, "utf8");
  }
  if (context.lastRpc !== undefined) {
    writeJson(`${prefix}-rpc.json`, redactSecrets(context.lastRpc));
  }
}

async function writeFinalEvidence(evidenceDir, context, scenario) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  if (context.lastDom) {
    fs.writeFileSync(path.join(evidenceDir, "dom-final.html"), context.lastDom, "utf8");
  }
  if (context.lastFocusPath?.length) {
    writeJson(path.join(evidenceDir, "focus-path.json"), context.lastFocusPath);
  }
  if (context.lastActive) {
    fs.writeFileSync(path.join(evidenceDir, "active-element.txt"), context.lastActive, "utf8");
  }
  if (context.lastRpc !== undefined) {
    writeJson(path.join(evidenceDir, "rpc-last.json"), redactSecrets(context.lastRpc));
  }
  const logLines = readPluginLogTail(100);
  if (logLines.length) {
    fs.writeFileSync(path.join(evidenceDir, "plugin-log-tail.txt"), `${logLines.join("\n")}\n`, "utf8");
  }
  if (scenario.evidenceProfile === "preview") {
    try {
      const shot = await captureScreenshotArtifact(path.join(evidenceDir, "final.png"));
      if (shot) context.captureArtifact = shot;
    } catch (err) {
      context.captureError = String(err);
    }
  }
}

async function writeScenarioManifest(evidenceDir, scenario, outcome) {
  const manifest = {
    scenarioId: scenario.id,
    tier: scenario.tier ?? null,
    batch: outcome.batchKey,
    status: outcome.status,
    error: outcome.error ?? null,
    durationMs: outcome.durationMs ?? null,
    gitSha: outcome.gitSha,
    runDate: outcome.runDate,
    previewUrl: readPreviewState()?.url ?? null,
    evidenceProfile: scenario.evidenceProfile ?? "preview",
    tags: scenario.tags ?? [],
    captureArtifact: outcome.context?.captureArtifact ?? null,
    captureError: outcome.context?.captureError ?? null,
    evidenceFiles: fs.existsSync(evidenceDir)
      ? fs.readdirSync(evidenceDir, { recursive: true }).map((f) => String(f))
      : [],
  };
  writeJson(path.join(evidenceDir, "manifest.json"), manifest);
  return manifest;
}

// Every assert must fail closed. A scenario that cannot be evaluated is a scenario that
// did not run, and reporting that as PASS is worse than reporting nothing: it is the
// shape of every defect recorded in docs/testing.md § Preview-suite evidence invalidated.
// Two ways that happened here, both fixed below:
//   - the type dispatch was a flat run of `if` blocks with no default, so a typo
//     (`domContain`, `rpcResults`) matched nothing and the step passed;
//   - `rpcResult` and `hookResult` guarded their comparison on `expect &&`, so an assert
//     with a missing or empty `expect` passed unconditionally.
// All 42 asserts in tests/preview-suite carry a non-empty `expect` and a known type, so
// this is behaviour-preserving for the suite as it stands. It is the next mistake it stops.
function assertStep(step, context) {
  const { type, expect } = step;

  const requireExpect = () => {
    const empty =
      expect === undefined ||
      expect === null ||
      expect === "" ||
      (Array.isArray(expect) && (expect.length === 0 || expect.some((x) => !String(x ?? ""))));
    if (empty) {
      throw new Error(
        `${type} assert is missing a usable "expect" (got ${JSON.stringify(expect)}) — ` +
          `an assert with nothing to compare against cannot pass or fail honestly`
      );
    }
  };

  switch (type) {
    case "domContains": {
      requireExpect();
      const html = context.lastDom ?? "";
      if (!html.includes(expect)) {
        throw new Error(`domContains failed: expected "${expect}" in DOM`);
      }
      return;
    }
    case "domNotContains": {
      requireExpect();
      const html = context.lastDom ?? "";
      if (html.includes(expect)) {
        throw new Error(`domNotContains failed: "${expect}" found in DOM`);
      }
      return;
    }
    case "rpcResult": {
      requireExpect();
      const rpc = context.lastRpc ?? "";
      const texts = [JSON.stringify(rpc)];
      if (rpc && typeof rpc.response === "string") texts.push(rpc.response);
      if (!texts.some((t) => t.includes(expect))) {
        throw new Error(`rpcResult failed: expected "${expect}" in ${texts[0].slice(0, 200)}`);
      }
      return;
    }
    case "hookResult": {
      requireExpect();
      const val = JSON.stringify(context.lastHook ?? "");
      if (!val.includes(expect)) {
        throw new Error(`hookResult failed: expected "${expect}" in ${val.slice(0, 200)}`);
      }
      return;
    }
    /*
     * Numeric and presence checks on the last previewHook result, by field name.
     *
     * `hookResult` above is a substring match on the whole JSON, which cannot express
     * "four stops or fewer" — the check the reply-section work actually needs. Fields are
     * top-level names from getReplyLayoutJson; `op` is one of eq / lte / gte / present / absent.
     */
    case "hookField": {
      const report = context.lastHook ?? {};
      const field = step.field;
      if (!field) throw new Error("hookField needs a `field`");
      const actual = report?.[field];
      const op = step.op ?? "eq";
      const ok =
        op === "present"
          ? actual !== null && actual !== undefined
          : op === "absent"
            ? actual === null || actual === undefined
            : op === "lte"
              ? Number(actual) <= Number(expect)
              : op === "gte"
                ? Number(actual) >= Number(expect)
                : actual === expect;
      if (!ok) {
        throw new Error(
          `hookField failed: ${field} ${op} ${JSON.stringify(expect)} — actual ${JSON.stringify(actual)}`
        );
      }
      return;
    }
    /*
     * One rectangle sits inside another, within `slack` pixels. This is what catches a corner
     * icon drifting outside the bubble it is meant to sit in, which no DOM substring can see.
     */
    case "hookRectInside": {
      const report = context.lastHook ?? {};
      const inner = report?.[step.inner];
      const outer = report?.[step.outer];
      if (!inner || !outer) {
        throw new Error(
          `hookRectInside failed: need both rects — ${step.inner}=${JSON.stringify(inner)}, ${step.outer}=${JSON.stringify(outer)}`
        );
      }
      const slack = step.slack ?? 2;
      const fits =
        inner.x >= outer.x - slack &&
        inner.y >= outer.y - slack &&
        inner.x + inner.w <= outer.x + outer.w + slack &&
        inner.y + inner.h <= outer.y + outer.h + slack;
      if (!fits) {
        throw new Error(
          `hookRectInside failed: ${step.inner} ${JSON.stringify(inner)} is not inside ${step.outer} ${JSON.stringify(outer)}`
        );
      }
      return;
    }
    case "domContainsAny": {
      requireExpect();
      const html = context.lastDom ?? "";
      const needles = Array.isArray(expect) ? expect : [expect];
      if (!needles.some((n) => html.includes(String(n)))) {
        throw new Error(`domContainsAny failed: expected one of ${JSON.stringify(needles)} in DOM`);
      }
      return;
    }
    // No `focusPathIncludes`. It was removed 2026-08-08 because `focusPath` is an echo of
    // the inputs runSequence was given, not a record of where focus went — every stored
    // focus-path.json reads ["onMove(Down)","onMove(Down)"] while active-element.txt reads
    // document.body. Asserting over it passed for any non-empty input sequence. The array
    // is still captured as evidence and still written to focus-path.json; it is simply not
    // something a scenario may assert on. See docs/testing.md (D3), filed upstream.
    default:
      throw new Error(`Unknown assert type: ${JSON.stringify(type)}`);
  }
}

async function runStep(step, context) {
  switch (step.action) {
    case "setHardware":
      if (readPreviewState()?.url) {
        await fetch(`${readPreviewState().url}/api/hw-state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(step.state ?? {}),
        }).catch(() => {});
      }
      break;
    case "runSequence": {
      const res = await sendIpc({
        cmd: "runSequence",
        inputs: step.inputs ?? [],
        delayMs: step.delayMs ?? 80,
      });
      if (!res.ok) throw new Error(res.error ?? "runSequence failed");
      context.lastFocusPath = res.result?.focusPath ?? [];
      context.lastDom = res.result?.domSnapshot ?? "";
      context.lastActive = res.result?.activeElement ?? "";
      break;
    }
    case "injectFocus":
      await sendIpc({ cmd: "injectFocus", direction: step.direction });
      break;
    case "snapshotDom": {
      const res = await sendIpc({ cmd: "snapshotDom", selector: step.selector });
      if (!res.ok) throw new Error(res.error ?? "snapshotDom failed");
      context.lastDom = res.result?.html ?? "";
      context.lastActive = res.result?.activeElement ?? "";
      break;
    }
    case "sleep":
      await sleep(step.ms ?? 300);
      break;
    case "previewHook": {
      const res = await sendIpc({
        cmd: "callTestHook",
        method: step.method,
        args: step.args ?? [],
      });
      if (!res.ok) throw new Error(res.error ?? `previewHook ${step.method} failed`);
      const inner = res.result;
      if (inner && typeof inner === "object" && inner.ok === false) {
        throw new Error(inner.error ?? `previewHook ${step.method} failed`);
      }
      context.lastHook = inner ?? res.result;
      break;
    }
    case "callRpc":
      context.lastRpc = await sidecarRpc(step.method, step.args ?? []);
      break;
    case "assert":
      assertStep(step, context);
      break;
    case "shellVitest": {
      const r = spawnSync("pnpm", ["test", step.file ?? ""], { cwd: repoRoot, stdio: "inherit", shell: true });
      if (r.status !== 0) throw new Error(`vitest step failed: ${step.file}`);
      break;
    }
    case "shellPytest": {
      const mod = (step.file ?? "").replace(/\.py$/, "").replace(/\\/g, "/").replace(/\//g, ".");
      const pyPath = [path.join(repoRoot, "py_modules"), repoRoot].join(path.delimiter);
      const r = spawnSync("python", ["-m", "unittest", mod], {
        cwd: repoRoot,
        stdio: "inherit",
        shell: false,
        env: { ...process.env, PYTHONPATH: pyPath },
      });
      if (r.status !== 0) throw new Error(`pytest step failed: ${mod}`);
      break;
    }
    default:
      throw new Error(`Unknown step action: ${step.action}`);
  }
}

async function runScenario(scenario, options) {
  const { evidenceDir, captureEvidence } = options;
  const context = {};
  const captureSteps = new Set(scenario.captureSteps ?? []);
  const steps = scenario.steps ?? [];
  const start = Date.now();

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex];
    try {
      await runStep(step, context);
    } catch (err) {
      err.runnerContext = context;
      throw err;
    }
    if (captureEvidence && evidenceDir && captureSteps.has(stepIndex)) {
      writeStepArtifacts(evidenceDir, stepIndex, step, context);
    }
  }

  if (captureEvidence && evidenceDir) {
    await writeFinalEvidence(evidenceDir, context, scenario);
  }

  return {
    id: scenario.id,
    status: "pass",
    context,
    durationMs: Date.now() - start,
    tags: scenario.tags ?? [],
    checkboxIds: scenario.checkboxIds ?? [],
    tier: scenario.tier ?? null,
  };
}

function loadAllScenarios() {
  if (!fs.existsSync(suiteDir)) return { byId: new Map(), all: [] };
  const files = fs
    .readdirSync(suiteDir)
    .filter((f) => f.endsWith(".json") && f !== "tier-manifest.json");
  const all = [];
  const byId = new Map();
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(suiteDir, file), "utf8"));
    const scenarios = Array.isArray(raw) ? raw : raw.scenarios ? raw.scenarios : [raw];
    for (const s of scenarios) {
      all.push(s);
      byId.set(s.id, s);
    }
  }
  return { byId, all };
}

function resolveScenarios() {
  const { byId, all } = loadAllScenarios();
  let batchKey = tierArg || "all";
  let list = all;

  if (tierArg) {
    const manifest = loadTierManifest();
    const batch = manifest.batches?.[tierArg];
    if (!batch) {
      throw new Error(`Unknown tier batch "${tierArg}". Keys: ${Object.keys(manifest.batches ?? {}).join(", ")}`);
    }
    list = batch.scenarioIds.map((id) => {
      const s = byId.get(id);
      if (!s) throw new Error(`Scenario "${id}" listed in tier-manifest but missing from preview-suite JSON`);
      return s;
    });
  }

  if (filterArg) {
    list = list.filter(
      (s) =>
        s.id?.includes(filterArg) ||
        s.tags?.some((t) => t.includes(filterArg) || filterArg.includes(t))
    );
  }

  return { scenarios: list, batchKey };
}

function writeResultsReport(results, meta) {
  fs.mkdirSync(resultsDir, { recursive: true });
  const stamp = getRunDate();
  const outPath = path.join(resultsDir, `${stamp}-${meta.batchKey}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify({ date: stamp, batch: meta.batchKey, gitSha: meta.gitSha, results }, null, 2),
    "utf8"
  );
  console.log(`\nWrote ${relRepoPath(outPath)}`);
  return outPath;
}

/**
 * The run folder is keyed by date + sha only, so a `--filter` re-run on the same
 * day and commit lands in the folder an earlier full run already wrote. Replacing
 * the summary wholesale made it claim the batch was one scenario while the other
 * scenarios' case directories sat beside it untouched — two runs in the tree said
 * exactly that (`tier2/2026-05-26-9e20a82`, 8 case dirs and 1 recorded result;
 * `tier2Deep/2026-06-09-a9237e4`, 11 and 1). Merge per scenario id instead: this
 * run's results win for the ids it actually ran, and earlier ids survive.
 */
function writeBatchSummary(batchRunDir, results, meta) {
  const summaryPath = path.join(batchRunDir, "batch-summary.json");
  const rows = new Map();

  let carried = 0;
  try {
    const prior = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    for (const r of prior.results ?? []) {
      if (r?.id) {
        rows.set(r.id, r);
        carried++;
      }
    }
  } catch {
    // No prior summary, or it is unreadable — either way this run is the record.
  }

  for (const r of results) {
    if (rows.has(r.id)) carried--;
    rows.set(r.id, {
      id: r.id,
      status: r.status,
      error: r.error ?? null,
      evidenceDir: r.evidenceDir ? relRepoPath(r.evidenceDir) : null,
    });
  }

  const merged = [...rows.values()];
  const count = (status) => merged.filter((r) => r.status === status).length;
  writeJson(summaryPath, {
    batch: meta.batchKey,
    runDate: meta.runDate,
    gitSha: meta.gitSha,
    passed: count("pass"),
    failed: count("fail"),
    skipped: count("skipped"),
    total: merged.length,
    // How many rows this run did not produce, so a reader can tell a full run
    // from a filtered one that inherited the rest.
    carriedFromEarlierRun: carried,
    ranThisInvocation: results.length,
    evidenceRoot: relRepoPath(batchRunDir),
    results: merged,
  });
}

/** Run folders kept per batch. Older ones are deleted after a successful write. */
const EVIDENCE_RUNS_KEPT_PER_BATCH = 3;

/**
 * D4's retention rule, in the script that writes evidence rather than in a doc —
 * a rule that depends on someone remembering is not a mechanism.
 *
 * Keeps the newest N run folders per batch and deletes the rest, except any run
 * a document still points at: evidence is cited by path from `docs/testing.md`
 * and the archived QA docs, and deleting a cited run turns a link into a lie.
 * That check is why this can prune automatically without a review step.
 */
function pruneOldEvidenceRuns(batchKey, currentRunFolder) {
  const batchDir = path.join(evidenceRoot, batchKey);
  let runs;
  try {
    runs = fs
      .readdirSync(batchDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort(); // `YYYY-MM-DD-<sha>` sorts oldest first by date
  } catch {
    return;
  }
  if (runs.length <= EVIDENCE_RUNS_KEPT_PER_BATCH) return;

  const cited = collectCitedEvidencePaths();
  const stale = runs.slice(0, runs.length - EVIDENCE_RUNS_KEPT_PER_BATCH);
  for (const run of stale) {
    // Sorting is by folder name, so a folder dated in the future — clock skew, or
    // one made by hand — would sort above the run this invocation just wrote and
    // push it into the stale window. Never delete our own output.
    if (run === currentRunFolder) continue;
    if (cited.has(`${batchKey}/${run}`)) {
      console.log(`Evidence retention: keeping ${batchKey}/${run} — cited by a doc`);
      continue;
    }
    fs.rmSync(path.join(batchDir, run), { recursive: true, force: true });
    console.log(`Evidence retention: removed ${batchKey}/${run}`);
  }
}

/** Every `test-evidence/<batch>/<run>` path named anywhere under `docs/`. */
function collectCitedEvidencePaths() {
  const cited = new Set();
  const docsDir = path.join(repoRoot, "docs");
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (full === evidenceRoot) continue; // a run citing itself proves nothing
        walk(full);
      } else if (e.name.endsWith(".md")) {
        const text = fs.readFileSync(full, "utf8");
        for (const m of text.matchAll(/test-evidence\/([A-Za-z0-9]+)\/(\d{4}-\d{2}-\d{2}-[0-9a-f]+)/g)) {
          cited.add(`${m[1]}/${m[2]}`);
        }
      }
    }
  };
  walk(docsDir);
  return cited;
}

function nextTestResultsRowNumber(md) {
  const matches = [...md.matchAll(/^\| (\d+) \|/gm)];
  if (!matches.length) return 1;
  return Math.max(...matches.map((m) => Number(m[1]))) + 1;
}

const PREVIEW_FAIL_MARKER_START = "<!-- preview-fail-results:start -->";
const PREVIEW_FAIL_MARKER_END = "<!-- preview-fail-results:end -->";

function parseMarkdownTableRow(line) {
  if (!line.startsWith("|") || line.includes("---")) return null;
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  if (!cells.length || cells[0] === "#" || cells[0] === "Build / date") return null;
  return cells;
}

function isPreviewResultRow(cells) {
  return cells.length >= 4 && cells[2] === "preview";
}

function previewScenarioIdFromRow(cells) {
  return isPreviewResultRow(cells) ? cells[3] : null;
}

function removePreviewRowsByScenarioIds(md, scenarioIds, sectionHeader = "## Test Results") {
  const idSet = new Set(scenarioIds);
  const headerIdx = md.indexOf(sectionHeader);
  if (headerIdx < 0) return md;

  const afterHeader = md.slice(headerIdx);
  const lines = afterHeader.split("\n");
  const out = [];
  let inTable = false;

  for (const line of lines) {
    if (line.startsWith("| # |") || line.startsWith("| Build / date |")) {
      inTable = true;
      out.push(line);
      continue;
    }
    if (inTable && line.startsWith("|---")) {
      out.push(line);
      continue;
    }
    if (inTable && line.startsWith("|")) {
      const cells = parseMarkdownTableRow(line);
      const scenarioId = cells ? previewScenarioIdFromRow(cells) : null;
      if (scenarioId && idSet.has(scenarioId)) continue;
      out.push(line);
      continue;
    }
    if (inTable && !line.startsWith("|")) {
      inTable = false;
    }
    out.push(line);
  }

  return md.slice(0, headerIdx) + out.join("\n");
}

function removePreviewFailRowsByScenarioIds(md, scenarioIds) {
  const idSet = new Set(scenarioIds);
  if (!md.includes(PREVIEW_FAIL_MARKER_START)) return md;

  const before = md.slice(0, md.indexOf(PREVIEW_FAIL_MARKER_START) + PREVIEW_FAIL_MARKER_START.length);
  const rest = md.slice(md.indexOf(PREVIEW_FAIL_MARKER_START) + PREVIEW_FAIL_MARKER_START.length);
  const endIdx = rest.indexOf(PREVIEW_FAIL_MARKER_END);
  const tableBody = rest.slice(0, endIdx);
  const after = rest.slice(endIdx);

  const kept = tableBody
    .split("\n")
    .filter((line) => {
      if (!line.startsWith("|") || line.includes("---") || line.startsWith("| Build")) return true;
      const cells = parseMarkdownTableRow(line);
      if (!cells || cells.length < 3) return true;
      const scenarioId = cells[2];
      return !idSet.has(scenarioId);
    })
    .join("\n");

  return `${before}${kept}${after}`;
}

function formatShortNotes(r) {
  const rel = r.evidenceDir ? relFromDocs(r.evidenceDir) : "";
  if (!rel) {
    return r.error ? String(r.error).replace(/\s+/g, " ").slice(0, 100) : "—";
  }
  const manifest = `[manifest](${rel}/manifest.json)`;
  if (r.status === "fail" && r.error) {
    const err = String(r.error).replace(/\s+/g, " ").slice(0, 80);
    return `${manifest} — ${err}`;
  }
  return manifest;
}

function formatExpected(r) {
  const tags = r.tags ?? [];
  if (!tags.length) return "—";
  const joined = tags.join(", ");
  return joined.length > 48 ? `${joined.slice(0, 45)}…` : joined;
}

function insertRowsIntoTestResults(md, rows) {
  if (!rows.length) return md;
  const header = "## Test Results";
  const headerIdx = md.indexOf(header);
  if (headerIdx < 0) return `${md}\n${rows.join("\n")}\n`;

  const afterHeader = md.slice(headerIdx);
  const lines = afterHeader.split("\n");
  const out = [];
  let inTable = false;
  let inserted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";

    if (line.startsWith("| # |")) {
      inTable = true;
      out.push(line);
      continue;
    }
    if (inTable && line.startsWith("|---")) {
      out.push(line);
      continue;
    }
    if (inTable && line.startsWith("|")) {
      out.push(line);
      if (!next.startsWith("|")) {
        out.push(...rows);
        inserted = true;
        inTable = false;
      }
      continue;
    }
    if (inTable && !inserted && line.trim() !== "") {
      out.push(...rows);
      inserted = true;
      inTable = false;
    }
    out.push(line);
  }

  if (inTable && !inserted) out.push(...rows);
  return md.slice(0, headerIdx) + out.join("\n");
}

function insertPreviewFailRows(md, rows) {
  if (!rows.length || !md.includes(PREVIEW_FAIL_MARKER_START)) return md;
  const start = md.indexOf(PREVIEW_FAIL_MARKER_START) + PREVIEW_FAIL_MARKER_START.length;
  const end = md.indexOf(PREVIEW_FAIL_MARKER_END);
  const head = md.slice(0, start);
  const tail = md.slice(end);
  const mid = md.slice(start, end).replace(/\s+$/, "");
  return `${head}\n${rows.join("\n")}\n${tail}`;
}

function ensureFailuresDoc() {
  if (fs.existsSync(promptTestingFailuresPath)) return;
  fs.mkdirSync(path.dirname(promptTestingFailuresPath), { recursive: true });
  fs.writeFileSync(
    promptTestingFailuresPath,
    `# Historical failures & retries

Preview suite \`--write\` FAIL upserts into the marker table below.

## Preview FAIL table (auto-updated)

${PREVIEW_FAIL_MARKER_START}
| Build / date | Batch | Scenario | Status | Notes |
|--------------|-------|----------|--------|-------|
${PREVIEW_FAIL_MARKER_END}
`,
    "utf8"
  );
}

function patchPromptTesting(results, meta) {
  if (!writeBack) return;

  const scenarioIds = results.filter((r) => r.status !== "skipped").map((r) => r.id);
  const passResults = results.filter((r) => r.status === "pass");
  const failResults = results.filter((r) => r.status === "fail");

  if (passResults.length && fs.existsSync(promptTestingPath)) {
    let md = fs.readFileSync(promptTestingPath, "utf8");
    md = removePreviewRowsByScenarioIds(md, scenarioIds);
    let rowNum = nextTestResultsRowNumber(md);
    const newRows = [];

    for (const r of passResults) {
      const notes = formatShortNotes(r);
      newRows.push(
        `| ${rowNum} | ${meta.runDate} / ${meta.gitSha} | preview | ${r.id} | ${formatExpected(r)} | preview-suite | PASS | ${notes} |`
      );
      rowNum++;

      if (r.evidenceDir && fs.existsSync(path.join(r.evidenceDir, "manifest.json"))) {
        for (const checkboxId of r.checkboxIds ?? []) {
          const re = new RegExp(`(- \\[ \\]) (${checkboxId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g");
          md = md.replace(re, "- [x] $2");
        }
        const relEvidence = relFromDocs(r.evidenceDir);
        for (const tag of r.tags ?? []) {
          const rowRe = new RegExp(
            `(\\| ${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|[^\\n]*\\|[^\\n]*\\|[^\\n]*\\| )([^|\\n]*?)( \\|)`,
            "g"
          );
          const evidenceNote = `[preview ${meta.runDate}](${relEvidence}/manifest.json)`;
          md = md.replace(rowRe, (full, prefix, evidence, suffix) => {
            if (evidence.includes("preview ")) return full;
            const merged = evidence.trim() ? `${evidence.trim()}; ${evidenceNote}` : evidenceNote;
            return `${prefix}${merged}${suffix}`;
          });
        }
      }
    }

    md = insertRowsIntoTestResults(md, newRows);
    fs.writeFileSync(promptTestingPath, md, "utf8");
    console.log("Updated docs/archive/testing-results-2026.md Test Results (--write, PASS only)");

    if (fs.existsSync(promptTestingFailuresPath)) {
      let failMd = fs.readFileSync(promptTestingFailuresPath, "utf8");
      failMd = removePreviewFailRowsByScenarioIds(
        failMd,
        passResults.map((r) => r.id)
      );
      fs.writeFileSync(promptTestingFailuresPath, failMd, "utf8");
    }
  }

  if (failResults.length) {
    ensureFailuresDoc();
    let failMd = fs.readFileSync(promptTestingFailuresPath, "utf8");
    failMd = removePreviewFailRowsByScenarioIds(failMd, scenarioIds);
    if (fs.existsSync(promptTestingPath)) {
      let passMd = fs.readFileSync(promptTestingPath, "utf8");
      passMd = removePreviewRowsByScenarioIds(passMd, failResults.map((r) => r.id));
      fs.writeFileSync(promptTestingPath, passMd, "utf8");
    }
    const failRows = failResults.map(
      (r) =>
        `| ${meta.runDate} / ${meta.gitSha} | ${meta.batchKey} | ${r.id} | FAIL | ${formatShortNotes(r)} |`
    );
    failMd = insertPreviewFailRows(failMd, failRows);
    fs.writeFileSync(promptTestingFailuresPath, failMd, "utf8");
    console.log("Updated docs/archive/testing-failures-2026.md failures (--write, FAIL)");
  }
}

function batchRunbookTier(batchKey) {
  const map = {
    tier0: "0",
    tier1Core: "1",
    tier1Boundaries: "3",
    tier2: "2",
    deckOnly: "3",
  };
  return map[batchKey] ?? null;
}

function patchRunbookProgress(results, meta) {
  if (!writeBack || !fs.existsSync(runbookPath)) return;
  const tier = batchRunbookTier(meta.batchKey);
  if (!tier) return;

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const total = results.filter((r) => r.status !== "skipped").length;
  let status = "Open";
  if (passed === total && total > 0) status = "Pass";
  else if (passed > 0) status = "Partial";
  else if (failed === total && total > 0) status = "Fail";

  const notes = `preview ${passed}/${total} PASS; [evidence](test-evidence/${meta.batchKey}/${meta.runFolder})`;
  let md = fs.readFileSync(runbookPath, "utf8");
  const trackerIdx = md.indexOf("## Progress tracker");
  if (trackerIdx < 0) return;
  const section = md.slice(trackerIdx);
  const rowRe = new RegExp(`^(\\| ${tier} \\| )([^|]*)( \\| )([^|]*)( \\| )([^|]*)( \\|)\\s*$`, "m");
  const updatedSection = section.replace(rowRe, `$1${status}$3${meta.runDate} / ${meta.gitSha}$5${notes}$7`);
  md = md.slice(0, trackerIdx) + updatedSection;
  fs.writeFileSync(runbookPath, md, "utf8");
  console.log(`Updated docs/testing-manual.md tier ${tier} progress (--write)`);
}

async function main() {
  const gitSha = getGitShaShort();
  const runDate = getRunDate();
  const runFolder = `${runDate}-${gitSha}`;
  const { scenarios, batchKey } = resolveScenarios();
  const batchRunDir = path.join(evidenceRoot, batchKey, runFolder);
  const meta = { batchKey, gitSha, runDate, runFolder };

  const state = readPreviewState();
  if (!state?.url) {
    console.warn(
      "WARN: preview-state.json missing — open Decky: Open Preview in Cursor first.\n" +
        "     Bucket A/B shell steps will still run; C/D preview steps may fail."
    );
  } else {
    console.log(`Preview URL: ${state.url}`);
  }

  if (!scenarios.length) {
    console.error("No scenarios matched filters.");
    process.exit(1);
  }

  console.log(`Batch: ${batchKey} (${scenarios.length} scenario(s))`);
  if (evidenceFlag) {
    console.log(`Evidence: ${relRepoPath(batchRunDir)}/`);
  }

  const results = [];
  for (const scenario of scenarios) {
    const evidenceDir = evidenceFlag
      ? path.join(batchRunDir, scenario.id)
      : null;

    if (scenario.deckOnly) {
      const skipped = {
        id: scenario.id,
        status: "skipped",
        note: "deck-only",
        checkboxIds: scenario.checkboxIds ?? [],
        tags: scenario.tags ?? [],
        evidenceDir,
        batchKey,
      };
      if (evidenceFlag && evidenceDir) {
        fs.mkdirSync(evidenceDir, { recursive: true });
        await writeScenarioManifest(evidenceDir, scenario, {
          ...skipped,
          status: "skipped",
          gitSha,
          runDate,
          batchKey,
          context: {},
        });
      }
      results.push(skipped);
      console.log(`\n▶ ${scenario.id} … SKIP (deck-only)`);
      continue;
    }

    process.stdout.write(`\n▶ ${scenario.id} … `);
    try {
      const out = await runScenario(scenario, {
        evidenceDir,
        captureEvidence: evidenceFlag,
      });
      const result = { ...out, evidenceDir, batchKey, gitSha, runDate };
      if (evidenceDir) {
        await writeScenarioManifest(evidenceDir, scenario, result);
      }
      results.push(result);
      console.log("PASS");
    } catch (err) {
      const failContext = err.runnerContext ?? {};
      if (evidenceFlag && evidenceDir) {
        try {
          await writeFinalEvidence(evidenceDir, failContext, scenario);
        } catch {
          /* partial evidence best-effort */
        }
      }
      const result = {
        id: scenario.id,
        status: "fail",
        error: String(err),
        checkboxIds: scenario.checkboxIds ?? [],
        tags: scenario.tags ?? [],
        evidenceDir,
        batchKey,
        gitSha,
        runDate,
        context: failContext,
      };
      if (evidenceDir) {
        await writeScenarioManifest(evidenceDir, scenario, result);
      }
      results.push(result);
      console.log(`FAIL — ${err}`);
    }
  }

  if (evidenceFlag) {
    writeBatchSummary(batchRunDir, results, meta);
    pruneOldEvidenceRuns(batchKey, runFolder);
  }

  writeResultsReport(results, meta);
  patchPromptTesting(results, meta);
  patchRunbookProgress(results, meta);

  const failed = results.filter((r) => r.status !== "pass" && r.status !== "skipped").length;
  const passed = results.filter((r) => r.status === "pass").length;
  console.log(`\n${passed}/${results.length} passed (${failed} failed, ${results.length - passed - failed} skipped)`);
  if (evidenceFlag) {
    console.log(`Evidence root: ${relRepoPath(batchRunDir)}/`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
