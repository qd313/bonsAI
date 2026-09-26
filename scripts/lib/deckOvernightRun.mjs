// The first slice of the overnight test run (plan 70, row 13 / helper N):
// keep the Deck awake, deploy the newest build, replay every saved walk
// under checks/, run the quick check on this PC, and write one plain-words
// report. See scripts/deck_overnight_run.mjs for the command line wrapper.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { McpStdioClient } from "./mcpStdioClient.mjs";

const REQUIRED_TOOLS = ["deck_holdAwake", "deck_deploy", "deck_replayChecks"];

/** Reads the named server out of a .mcp.json (or mcp.json) file, at run time -- never hard-coded. */
export function readMcpServerConfig(mcpJsonPath, serverName) {
  const raw = fs.readFileSync(mcpJsonPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${mcpJsonPath} is not valid JSON: ${err.message}`);
  }
  const server = parsed?.mcpServers?.[serverName];
  if (!server || typeof server.command !== "string") {
    throw new Error(`${mcpJsonPath} has no "${serverName}" entry with a command under mcpServers`);
  }
  return {
    command: server.command,
    args: Array.isArray(server.args) ? server.args.map(String) : [],
    env: server.env && typeof server.env === "object" ? server.env : {},
  };
}

/** Every saved walk under checksDir, sorted by name, name = filename without ".json". */
export function listCheckFiles(checksDir) {
  let entries;
  try {
    entries = fs.readdirSync(checksDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
    .map((e) => ({ file: path.join(checksDir, e.name), name: e.name.slice(0, -".json".length) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reads a deck_replayChecks tools/call answer for one walk (`only: [name]`)
 * and says whether it matched, showed differences, or could not be run.
 *
 * A replay against a build that differs from the one the walk was saved
 * against is reported here as "differences", same as a genuine landing
 * difference would be -- the tool's own design always compares and reports
 * rather than refusing, and a difference is not a failure by itself. See
 * checkRunner.ts's diffCheck() (read, not copied) for why.
 */
export function classifyReplayOutcome(name, callResult) {
  if (!callResult || !Array.isArray(callResult.content)) {
    return { name, status: "could_not_run", reason: "the tool answered with nothing readable" };
  }
  const text = callResult.content.find((b) => b?.type === "text")?.text;
  if (callResult.isError) {
    return { name, status: "could_not_run", reason: text || "the tool call failed with no message" };
  }
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (err) {
    return { name, status: "could_not_run", reason: `could not read the tool's answer: ${err.message}` };
  }
  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    return { name, status: "could_not_run", reason: parsed.errors.map((e) => e.message).join("; ") };
  }
  const checked = Array.isArray(parsed.checked) ? parsed.checked : [];
  const outcome = checked.find((c) => c?.name === name) ?? checked[0];
  if (!outcome) {
    return { name, status: "could_not_run", reason: "no saved walk by that name came back from the replay" };
  }
  if (outcome.ok) {
    return { name, status: "matched", detail: outcome.summary ?? "every landing matched" };
  }
  return {
    name,
    status: "differences",
    detail: outcome.summary ?? "landings differed from the saved walk",
    buildHashMatch: outcome.buildHashMatch,
    messages: Array.isArray(outcome.messages) ? outcome.messages : undefined,
  };
}

/** Runs `python scripts/verify.py --quick` (or an injected stand-in) and captures the result. */
export function runPythonQuickCheck({
  repoRoot,
  pythonCommand = "python",
  args = ["scripts/verify.py", "--quick"],
  timeoutMs = 20 * 60 * 1000,
}) {
  const startedAt = new Date();
  const result = spawnSync(pythonCommand, args, { cwd: repoRoot, encoding: "utf8", timeout: timeoutMs });
  const finishedAt = new Date();
  const command = `${pythonCommand} ${args.join(" ")}`;
  if (result.error) {
    return {
      ok: false,
      command,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      error: result.error.message,
      output: [result.stdout, result.stderr].filter(Boolean).join("\n").slice(-8000),
    };
  }
  return {
    ok: result.status === 0,
    command,
    exitCode: result.status,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    // Kept short: the report is a summary, not a log; the full output stays
    // in whatever terminal ran this command.
    output: [result.stdout, result.stderr].filter(Boolean).join("\n").slice(-8000),
  };
}

/** Two decimal digits, for the report filename's time part. */
function pad2(n) {
  return String(n).padStart(2, "0");
}

/** `overnight-YYYY-MM-DD-HHMMSS`, local time -- sortable and collision-safe to the second. */
export function formatTimestampLabel(date) {
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
  );
}

function describeReplayLine(r) {
  if (r.status === "matched") return `- **${r.name}**: matched the saved walk (${r.detail}).`;
  if (r.status === "differences") {
    const extra = r.buildHashMatch === false ? " -- against a different build than it was saved on" : "";
    return `- **${r.name}**: showed differences from the saved walk${extra} -- ${r.detail}.`;
  }
  return `- **${r.name}**: could not run -- ${r.reason}.`;
}

/** Builds both the JSON report and its plain-words markdown twin from the run's steps. */
export function buildReport({ startedAt, finishedAt, mcpConfig, steps, quickCheck }) {
  const json = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    deckTools: { command: mcpConfig.command, args: mcpConfig.args },
    holdAwake: steps.holdAwake,
    deploy: steps.deploy,
    replays: steps.replays,
    quickCheck,
  };

  const matched = steps.replays.filter((r) => r.status === "matched").length;
  const differed = steps.replays.filter((r) => r.status === "differences").length;
  const couldNotRun = steps.replays.filter((r) => r.status === "could_not_run").length;

  const lines = [];
  lines.push("# Overnight test run -- first slice (plan 70)");
  lines.push("");
  lines.push(`Started: ${json.startedAt}`);
  lines.push(`Finished: ${json.finishedAt}`);
  lines.push("");
  lines.push("## Keeping the Deck awake");
  lines.push(
    steps.holdAwake?.ok ? "Held awake for the run." : `Not held awake -- ${steps.holdAwake?.error ?? "the tool reported a problem"}.`
  );
  lines.push("");
  lines.push("## The build");
  lines.push(
    steps.deploy?.ok
      ? "The newest build was deployed to the Deck."
      : `The build was not deployed -- ${steps.deploy?.error ?? "the tool reported a problem"}.`
  );
  lines.push("");
  lines.push(`## The saved walks (${matched} matched, ${differed} showed differences, ${couldNotRun} could not run)`);
  if (steps.replays.length === 0) {
    lines.push("No saved walks were found under `checks/`.");
  } else {
    for (const r of steps.replays) lines.push(describeReplayLine(r));
  }
  lines.push("");
  lines.push("## The quick check on this PC");
  lines.push(`Command: \`${quickCheck.command}\``);
  lines.push(
    quickCheck.ok
      ? "Passed."
      : `Did not pass${quickCheck.exitCode !== undefined ? ` (exit code ${quickCheck.exitCode})` : ""}${quickCheck.error ? ` -- ${quickCheck.error}` : ""}.`
  );
  lines.push("");
  lines.push(
    "A replay against a build different from the one a walk was saved on will always show " +
      "differences -- that is the tool working as designed, not a failure by itself. Read what " +
      "each difference actually says before treating it as something broken."
  );

  return { json, markdown: lines.join("\n") + "\n" };
}

/** Writes the JSON report and its markdown twin under reportDir; returns both paths. */
export function writeReport(reportDir, report, timestampLabel) {
  fs.mkdirSync(reportDir, { recursive: true });
  const base = `overnight-${timestampLabel}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const mdPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report.json, null, 2) + "\n", "utf8");
  fs.writeFileSync(mdPath, report.markdown, "utf8");
  return { jsonPath, mdPath };
}

/**
 * Runs the whole slice end to end: start the tools server, hold the Deck
 * awake, deploy, replay every saved walk one file at a time, run the quick
 * check on this PC, and return the finished report (not yet written to
 * disk -- see writeReport). Never throws for a Deck-side failure: every step
 * that can fail is caught and recorded, so one bad step never stops the
 * ones after it (the quick check in particular still runs even if the Deck
 * tools never started at all).
 */
export async function runOvernightSlice(options) {
  const {
    mcpConfig,
    repoRoot,
    checksDir = path.join(repoRoot, "checks"),
    holdAwakeMinutes = 120,
    holdAwakeNote = "bonsai overnight test run (plan 70)",
    pythonCommand = "python",
    verifyArgs = ["scripts/verify.py", "--quick"],
    createClient = (cfg) => new McpStdioClient(cfg),
    now = () => new Date(),
    callTimeoutMs,
  } = options;

  const startedAt = now();
  const files = listCheckFiles(checksDir);
  const steps = { holdAwake: null, deploy: null, replays: [] };

  const client = createClient({
    command: mcpConfig.command,
    args: mcpConfig.args,
    env: mcpConfig.env,
    cwd: repoRoot,
    name: "decky-plugin-studio",
  });

  let blocked = null;
  try {
    client.start();
    await client.initialize({ timeoutMs: callTimeoutMs });
    const tools = await client.listTools(callTimeoutMs);
    const names = new Set(tools.map((t) => t?.name));
    for (const required of REQUIRED_TOOLS) {
      if (!names.has(required)) {
        blocked = `the Deck tools server has no "${required}" tool`;
        break;
      }
    }
  } catch (err) {
    blocked = `could not start or talk to the Deck tools: ${err.message}`;
  }

  if (blocked) {
    steps.holdAwake = { ok: false, error: blocked };
    steps.deploy = { ok: false, error: `skipped -- ${blocked}` };
    for (const { name } of files) {
      steps.replays.push({ name, status: "could_not_run", reason: `skipped -- ${blocked}` });
    }
  } else {
    try {
      const result = await client.callTool("deck_holdAwake", { ttlMinutes: holdAwakeMinutes, note: holdAwakeNote }, callTimeoutMs);
      steps.holdAwake = { ok: !result?.isError, result };
    } catch (err) {
      steps.holdAwake = { ok: false, error: err.message };
    }

    try {
      const result = await client.callTool("deck_deploy", {}, callTimeoutMs);
      steps.deploy = { ok: !result?.isError, result };
    } catch (err) {
      steps.deploy = { ok: false, error: err.message };
    }

    for (const { name } of files) {
      try {
        const result = await client.callTool("deck_replayChecks", { checksDir, only: [name] }, callTimeoutMs);
        steps.replays.push(classifyReplayOutcome(name, result));
      } catch (err) {
        // "a replay that errors is recorded as could not run, and the run continues"
        steps.replays.push({ name, status: "could_not_run", reason: err.message });
      }
    }
  }

  await client.close().catch(() => {});

  const quickCheck = runPythonQuickCheck({ repoRoot, pythonCommand, args: verifyArgs });
  const finishedAt = now();

  return buildReport({ startedAt, finishedAt, mcpConfig, steps, quickCheck });
}
