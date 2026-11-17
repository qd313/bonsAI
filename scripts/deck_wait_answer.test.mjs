// Tests for scripts/deck_wait_answer.mjs (plan 105, lane T2): the script that waits for an answer the driver sends
// itself. Nothing here touches the Deck: SSH is a stand-in function that answers the two fixed commands from a script
// of read-backs, and time is a counter the sleep function advances.
// Run with:  node --test scripts/deck_wait_answer.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { READBACK_CMD, STATUS_CMD, RowsFileError } from "./deck_ask_rows.mjs";
import { finishedBy, main, panelState, parseWaitRows } from "./deck_wait_answer.mjs";

const tempDir = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

const STATUS_TEXT = [
  "               total        used        free      shared  buff/cache   available",
  "Mem:           14879        9120        1300         420        4458        5200",
  "@@GAME",
  "",
  "@@DATE",
  "2026-11-17 10:00:00 EST",
  "@@BUILD",
  "9bc29b3c0500",
].join("\n");

// One read-back as the Deck's script prints it (--json --turns 1). A test names only what it changes.
const OLD_LINE = "t1 notes for this answer: old";
const NEW_LINE = "t2 notes for this answer: 1 note attached (Exploder); they are the";
function readback(over = {}) {
  return {
    answerShown: true, finished: true, streaming: false, turns: 3, notes: { present: false, count: 0, open: false, names: [] },
    spoilers: { shut: 1, open: 0 }, noCloseMatchLine: false, notInMyNotesLine: false, noNotesForGameLine: false, game: "Hollow Knight",
    focus: { label: "Was this helpful?", cls: "x", via: "ring" }, windowFocus: true, attachLine: { file: "a.log", line: OLD_LINE },
    turnList: [{ question: "an earlier question", attached: [] }], ...over,
  };
}
const BEFORE = readback();
// The same panel after a new answer ended: the log line is new and the newest turn is another one.
const AFTER = readback({
  turns: 4, attachLine: { file: "a.log", line: NEW_LINE },
  turnList: [{ question: "how do I beat the boss", attached: [{ name: "Exploder", numbers: [2001] }] }],
});
const WRITING = readback({ turns: 4, streaming: true, finished: false, turnList: [{ question: "how do I beat the boss", attached: [] }] });
const NEW_TURN_NO_LOG = readback({ turns: 4, turnList: [{ question: "how do I beat the boss", attached: [] }] });

function world({ baseline = BEFORE, polls = [AFTER], statusCode = 0 } = {}) {
  const sshCalls = [];
  const clock = { t: 0 };
  let reads = 0;
  const lines = [];
  const ssh = async (cmd, { input } = {}) => {
    sshCalls.push({ cmd, input, at: lines.length });
    if (cmd === STATUS_CMD) return { code: statusCode, stdout: STATUS_TEXT, stderr: statusCode === 255 ? "no route" : "" };
    if (cmd === READBACK_CMD) {
      const i = reads++;
      const body = i === 0 ? baseline : polls[Math.min(i - 1, polls.length - 1)];
      return { code: 0, stdout: JSON.stringify(body), stderr: "" };
    }
    return { code: 1, stdout: "", stderr: "unexpected command" };
  };
  const deps = {
    ssh, now: () => clock.t, sleep: async (ms) => { clock.t += ms; }, readbackSource: "# the read-back script text",
  };
  return { sshCalls, clock, lines, deps };
}

// The script's own row runner is not exported; main() is the way in. This helper runs it through main with a rows file.
async function viaMain(w, rows, extraArgv = []) {
  const root = tempDir("bonsai-wait-cli-");
  const workshop = path.join(root, "workshop");
  fs.mkdirSync(workshop, { recursive: true });
  const rowsFile = path.join(root, "rows.json");
  fs.writeFileSync(rowsFile, JSON.stringify(rows));
  const out = [];
  const err = [];
  const code = await main(["--rows", rowsFile, "--plan", "105", ...extraArgv], {
    repoRoot: root, env: { BONSAI_WORKSHOP: workshop },
    deps: { ssh: w.deps.ssh, now: w.deps.now, sleep: w.deps.sleep, readbackSource: w.deps.readbackSource },
    io: { out: (l) => { out.push(l); w.lines.push(l); }, err: (l) => err.push(l) },
  });
  const evidence = path.join(workshop, "test-evidence");
  return { code, out, err, evidence, read: (name) => JSON.parse(fs.readFileSync(path.join(evidence, name), "utf8")), files: () => (fs.existsSync(evidence) ? fs.readdirSync(evidence) : []) };
}

// ---------------------------------------------------------------------------
// The rows file
// ---------------------------------------------------------------------------

test("rows with no question and no chat parse; the wait and the expectations are kept", () => {
  const rows = parseWaitRows(JSON.stringify([{ row: "A" }, { row: "B", waitSeconds: 90, expect: { line: "none" } }]));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].question, null);
  assert.equal(rows[0].chat, null);
  assert.equal(rows[0].waitSeconds, 240);
  assert.equal(rows[1].waitSeconds, 90);
  assert.deepEqual(rows[1].expect, { line: "none" });
});

test("a row with a question, a chat or a mode is refused: this script sends nothing and cannot check them", () => {
  for (const extra of [{ question: "q" }, { chat: "Test chat" }, { mode: "Strategy" }]) {
    assert.throws(() => parseWaitRows(JSON.stringify([{ row: "A", ...extra }])), (e) => e instanceof RowsFileError && /row "A"/.test(e.message));
  }
});

// ---------------------------------------------------------------------------
// Reading the panel
// ---------------------------------------------------------------------------

test("the panel's state is the turn count, the newest question's header and the log line", () => {
  assert.deepEqual(panelState(AFTER), { turns: 4, question: "how do I beat the boss", logLine: NEW_LINE });
  assert.deepEqual(panelState({}), { turns: 0, question: "", logLine: null });
});

test("a new log line with no answer being written is the end; one with the answer still writing is not", () => {
  const base = panelState(BEFORE);
  assert.equal(finishedBy(AFTER, base), "log");
  assert.equal(finishedBy({ ...AFTER, streaming: true, finished: false }, base), null);
  assert.equal(finishedBy(BEFORE, base), null);
  assert.equal(finishedBy({ ...AFTER, answerShown: false }, base), null);
  assert.equal(finishedBy({ error: "bonsAI panel is not open" }, base), null);
});

test("a new finished turn with no new log line is a screen finish; the same turn count and header is not", () => {
  const base = panelState(BEFORE);
  assert.equal(finishedBy(NEW_TURN_NO_LOG, base), "screen");
  assert.equal(finishedBy({ ...NEW_TURN_NO_LOG, finished: false }, base), null);
  assert.equal(finishedBy(readback(), base), null);
});

// ---------------------------------------------------------------------------
// One row, start to finish
// ---------------------------------------------------------------------------

test("it prints READY after the first read, waits through an answer being written, and ends on the new log line", async () => {
  const w = world({ polls: [BEFORE, WRITING, WRITING, AFTER] });
  const r = await viaMain(w, [{ row: "P105-W-A" }]);
  assert.equal(r.code, 0, r.err.join("\n"));
  const ready = w.lines.findIndex((l) => /READY/.test(l));
  assert.ok(ready >= 0, "READY was printed");
  const readsBeforeReady = w.sshCalls.filter((c) => c.cmd === READBACK_CMD && c.at <= ready).length;
  assert.equal(readsBeforeReady, 1, "exactly one read-back came before READY: the baseline");
  const ev = r.read("plan105-P105-W-A.json");
  assert.equal(ev.seen.finishedBy, "log");
  assert.equal(ev.seen.logLine, NEW_LINE);
  assert.deepEqual(ev.seen.attached, [{ name: "Exploder", numbers: [2001] }]);
  assert.equal(ev.seen.waitOnly, true);
  assert.deepEqual(ev.pressed, []);
  assert.equal(ev.setup.question, null);
  assert.match(ev.verdict, /^UNCLEAR/);
  assert.match(ev.side_effect, /^none/);
  assert.ok(ev.seen.seconds >= 9, "the seconds count from READY: three polls of three seconds before the log line");
});

test("every command is the status or the read-back, as ssh, the address and one command; the read-back's text goes on standard input", async () => {
  const w = world();
  await viaMain(w, [{ row: "P105-W-A" }]);
  assert.ok(w.sshCalls.length >= 3);
  for (const c of w.sshCalls) assert.ok([STATUS_CMD, READBACK_CMD].includes(c.cmd), `a command outside the fixed two: ${c.cmd}`);
  for (const c of w.sshCalls.filter((x) => x.cmd === READBACK_CMD)) assert.equal(c.input, "# the read-back script text");
});

test("a folded chat (the turn count and the header do not change) still ends on the new log line", async () => {
  const folded = readback({ turns: 3, attachLine: { file: "a.log", line: NEW_LINE }, turnList: [{ question: "an earlier question", attached: [{ name: "Exploder", numbers: [2001] }] }] });
  const w = world({ polls: [folded] });
  const r = await viaMain(w, [{ row: "P105-W-A" }]);
  assert.equal(r.code, 0);
  assert.equal(r.read("plan105-P105-W-A.json").seen.finishedBy, "log");
});

test("an answer that logs no line ends on two agreeing screen reads, looks a few more seconds for the line, and reports it absent", async () => {
  const w = world({ polls: [NEW_TURN_NO_LOG] });
  const r = await viaMain(w, [{ row: "P105-W-A" }]);
  assert.equal(r.code, 0);
  const ev = r.read("plan105-P105-W-A.json");
  assert.equal(ev.seen.finishedBy, "screen");
  assert.equal(ev.seen.logLine, null);
  assert.deepEqual(ev.seen.attached, []);
  assert.ok(r.out.some((l) => /notes \? \(no log line\)/.test(l)));
});

test("one read of a new finished turn is not enough: a turn that goes on writing afterwards is waited for", async () => {
  const w = world({ polls: [NEW_TURN_NO_LOG, WRITING, WRITING, AFTER] });
  const r = await viaMain(w, [{ row: "P105-W-A" }]);
  assert.equal(r.read("plan105-P105-W-A.json").seen.finishedBy, "log");
});

test("the same panel for the whole wait is a timeout after the row's own limit, written as COULD NOT RUN", async () => {
  const w = world({ polls: [BEFORE] });
  const r = await viaMain(w, [{ row: "P105-W-A", waitSeconds: 30 }]);
  assert.equal(r.code, 1);
  const ev = r.read("plan105-P105-W-A.json");
  assert.match(ev.verdict, /^COULD NOT RUN: timeout after 30 s/);
  assert.ok(ev.seen.seconds >= 30 && ev.seen.seconds < 40);
  assert.deepEqual(ev.seen.progress.baseline, panelState(BEFORE));
});

test("two timeouts in a row stop the list; the next row is written as COULD NOT RUN and waits for nothing", async () => {
  const w = world({ polls: [BEFORE] });
  const r = await viaMain(w, [{ row: "A", waitSeconds: 10 }, { row: "B", waitSeconds: 10 }, { row: "C", waitSeconds: 10 }]);
  assert.equal(r.code, 1);
  assert.match(r.read("plan105-C.json").verdict, /the list stopped \(two timeouts in a row\)/);
  assert.equal(w.lines.filter((l) => /READY/.test(l)).length, 2);
});

test("an answer still being written at the start is not waited over: no READY, COULD NOT RUN", async () => {
  const w = world({ baseline: WRITING });
  const r = await viaMain(w, [{ row: "P105-W-A" }]);
  assert.equal(r.code, 1);
  assert.match(r.read("plan105-P105-W-A.json").verdict, /^COULD NOT RUN: an answer is still being written/);
  assert.equal(w.lines.some((l) => /READY/.test(l)), false);
});

test("the panel not being open at the start is COULD NOT RUN: panel", async () => {
  const w = world({ baseline: { error: "bonsAI panel is not open" } });
  const r = await viaMain(w, [{ row: "P105-W-A" }]);
  assert.match(r.read("plan105-P105-W-A.json").verdict, /^COULD NOT RUN: panel: bonsAI panel is not open/);
});

test("the Deck not answering over SSH stops the list and says so", async () => {
  const w = world({ statusCode: 255 });
  const r = await viaMain(w, [{ row: "A" }, { row: "B" }]);
  assert.equal(r.code, 1);
  assert.match(r.read("plan105-A.json").verdict, /^COULD NOT RUN: the Deck did not answer over SSH/);
  assert.match(r.read("plan105-B.json").verdict, /the list stopped/);
});

test("a row's expectations are compared with what was read: a pass and a fail name their fields", async () => {
  const pass = await viaMain(world(), [{ row: "P", expect: { notesInclude: ["exploder", 2001], line: "none", covers: { shut: 1 } } }]);
  assert.match(pass.read("plan105-P.json").verdict, /^PASS: all 4/);
  const fail = await viaMain(world(), [{ row: "F", expect: { notesExclude: ["Exploder"] } }]);
  assert.match(fail.read("plan105-F.json").verdict, /^FAIL: notesExclude/);
});

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

test("--dry-run sends nothing and writes nothing; it lists the two fixed commands and the evidence file", async () => {
  const w = world();
  const r = await viaMain(w, [{ row: "P105-W-A" }], ["--dry-run"]);
  assert.equal(r.code, 0);
  assert.equal(w.sshCalls.length, 0);
  assert.deepEqual(r.files(), []);
  const said = r.out.join("\n");
  assert.ok(said.includes(STATUS_CMD) && said.includes(READBACK_CMD));
  assert.ok(said.includes("plan105-P105-W-A.json"));
  assert.ok(/sends no question/.test(said));
});

test("bad arguments and a rows file naming a question are refused in plain words, with nothing sent", async () => {
  const w = world();
  const root = tempDir("bonsai-wait-bad-");
  const rowsFile = path.join(root, "rows.json");
  fs.writeFileSync(rowsFile, JSON.stringify([{ row: "A", question: "q" }]));
  const go = (argv) => {
    const err = [];
    return main(argv, { repoRoot: root, env: { BONSAI_WORKSHOP: root }, deps: { ssh: w.deps.ssh, readbackSource: "x" }, io: { out: () => {}, err: (l) => err.push(l) } }).then((code) => ({ code, err }));
  };
  assert.equal((await go([])).code, 2);
  assert.equal((await go(["--rows", rowsFile])).code, 2);
  assert.equal((await go(["--rows", rowsFile, "--plan", "x1"])).code, 2);
  assert.equal((await go(["--rows", rowsFile, "--plan", "105", "--host", "-oProxyCommand=x"])).code, 2);
  assert.equal((await go(["--rows", rowsFile, "--plan", "105", "--machine", "x"])).code, 2);
  const named = await go(["--rows", rowsFile, "--plan", "105"]);
  assert.equal(named.code, 2);
  assert.ok(/sends nothing/.test(named.err.join("\n")));
  assert.equal(w.sshCalls.length, 0);
});
