// Tests for scripts/deck_ask_rows.mjs (plan 104, lane T1): the script that asks a whole list of questions on the
// Deck in one call. Nothing here touches the Deck. The Deck tools are a stand-in object (or, for the start-up and
// lease checks, the repo's own fake tool server over stdio), and the SSH calls are a stand-in function.
// Run with:  node --test scripts/deck_ask_rows.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  STATUS_CMD,
  CONTEXT_EXPR,
  PROGRESS_EXPR,
  RowsFileError,
  parseRowsFile,
  normalizeLine,
  compareExpect,
  parseStatusReport,
  buildSshArgs,
  evidenceTarget,
  writeEvidenceFile,
  formatRowLine,
  runRows,
  main,
} from "./deck_ask_rows.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FAKE_SERVER = path.join(HERE, "testFixtures", "fakeMcpServer.mjs");

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const ROW = { row: "P104-T1-A", question: "how do I beat the first boss", chat: "Test chat" };

// ---------------------------------------------------------------------------
// The rows file
// ---------------------------------------------------------------------------

test("a good rows file parses, keeping every field and filling the default wait", () => {
  const rows = parseRowsFile(
    JSON.stringify([
      { row: "A", question: "q one", chat: "T", mode: "Strategy", waitSeconds: 90, expect: { line: "none" } },
      { row: "B", question: "q two" },
    ]),
    { defaultChat: "Fallback chat" },
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].waitSeconds, 90);
  assert.equal(rows[0].mode, "Strategy");
  assert.equal(rows[1].waitSeconds, 240);
  assert.equal(rows[1].chat, "Fallback chat");
});

test("a rows file that is not a list, or not JSON, is refused in plain words", () => {
  assert.throws(() => parseRowsFile("{not json", {}), (e) => e instanceof RowsFileError && /not valid JSON/.test(e.message));
  assert.throws(() => parseRowsFile('{"row":"A"}', {}), (e) => e instanceof RowsFileError && /list/.test(e.message));
  assert.throws(() => parseRowsFile("[]", {}), (e) => e instanceof RowsFileError && /no rows/.test(e.message));
});

test("a row with no id, no question, a repeated id, or an id that is not a plain name is refused, naming the row", () => {
  const bad = (rows, re) =>
    assert.throws(() => parseRowsFile(JSON.stringify(rows), { defaultChat: "T" }), (e) => e instanceof RowsFileError && re.test(e.message));
  bad([{ question: "q" }], /row 1.*"row"/);
  bad([{ row: "A" }], /row "A".*"question"/);
  bad([{ row: "A", question: "q" }, { row: "A", question: "r" }], /"A" appears twice/);
  bad([{ row: "../evil", question: "q" }], /"\.\.\/evil".*letters, digits/);
  bad([{ row: "A", question: "two\nlines" }], /row "A".*one line/);
  bad([{ row: "A", question: "q", waitSeconds: 5 }], /row "A".*waitSeconds/);
  bad([{ row: "A", question: "q", mystery: 1 }], /row "A".*"mystery"/);
});

test("a row with no chat, when the command gave no default chat, stops the whole file before anything runs", () => {
  assert.throws(
    () => parseRowsFile(JSON.stringify([{ row: "A", question: "q" }]), {}),
    (e) => e instanceof RowsFileError && /row "A".*no chat/.test(e.message) && /test chat/.test(e.message),
  );
});

test("an expect object with a misspelt key or an unknown line is refused, not ignored", () => {
  const bad = (expect, re) =>
    assert.throws(
      () => parseRowsFile(JSON.stringify([{ row: "A", question: "q", chat: "T", expect }]), {}),
      (e) => e instanceof RowsFileError && re.test(e.message),
    );
  bad({ notesInclud: ["x"] }, /"notesInclud"/);
  bad({ line: "something else" }, /"something else"/);
  bad({ covers: { shutt: 1 } }, /"shutt"/);
  bad({ notesInclude: "not a list" }, /notesInclude.*list/);
});

// ---------------------------------------------------------------------------
// The expect comparison
// ---------------------------------------------------------------------------

const seenWith = (over = {}) => ({
  attached: [
    { name: "Exploder", numbers: [2001, 3001] },
    { name: "Soul Master", numbers: [2002] },
  ],
  line: "none",
  covers: { shut: 1, open: 0 },
  ...over,
});

test("no expect object: nothing is compared and the verdict is left to the driver", () => {
  const r = compareExpect(null, seenWith());
  assert.match(r.verdict, /^UNCLEAR/);
  assert.deepEqual(r.problems, []);
});

test("a full match passes; notes match by name (any case) and by number", () => {
  const r = compareExpect(
    { notesInclude: ["exploder", 2002], notesExclude: ["Owlbear", 9999], line: "none", covers: { shut: 1, open: 0 } },
    seenWith(),
  );
  assert.match(r.verdict, /^PASS/);
});

test("each field that differs is named in the FAIL, and an unmentioned field is not compared", () => {
  const r = compareExpect({ notesInclude: ["Owlbear"], notesExclude: ["Exploder"], line: "not in my notes", covers: { open: 2 } }, seenWith());
  assert.match(r.verdict, /^FAIL/);
  assert.equal(r.problems.length, 4);
  assert.ok(r.problems.some((p) => /notesInclude/.test(p) && /Owlbear/.test(p)));
  assert.ok(r.problems.some((p) => /notesExclude/.test(p) && /Exploder/.test(p)));
  assert.ok(r.problems.some((p) => /line/.test(p)));
  assert.ok(r.problems.some((p) => /covers/.test(p) && /open/.test(p)));
  assert.match(compareExpect({ covers: { shut: 1 } }, seenWith({ covers: { shut: 1, open: 7 } })).verdict, /^PASS/);
});

test("expect.line takes all four values, including the third honesty line 'No notes for this game'", () => {
  for (const [spoken, shown] of [
    ["none", "none"],
    ["No close match", "No close match"],
    ["Not in my notes", "Not in my notes"],
    ["No notes for this game", "No notes for this game"],
    ["noNotesForGameLine", "No notes for this game"],
    ["no notes for this game", "No notes for this game"],
  ]) {
    assert.match(compareExpect({ line: spoken }, seenWith({ line: shown })).verdict, /^PASS/, `${spoken} vs ${shown}`);
  }
  assert.match(compareExpect({ line: "No notes for this game" }, seenWith({ line: "Not in my notes" })).verdict, /^FAIL/);
  assert.equal(normalizeLine("No notes for this game"), "nonotesforgame");
  assert.equal(normalizeLine("noNotesForGameLine"), "nonotesforgame");
  assert.equal(normalizeLine("nonsense"), null);
});

// ---------------------------------------------------------------------------
// The Deck's own report, the SSH shape, the evidence file
// ---------------------------------------------------------------------------

const FREE_OUT = [
  "               total        used        free      shared  buff/cache   available",
  "Mem:           14879        9120        1300         420        4458        5200",
  "Swap:           1023         500         523",
].join("\n");

test("the status report is read: free memory, whether a game runs, the time and the build", () => {
  const idle = parseStatusReport(`${FREE_OUT}\n@@GAME\n@@DATE\n2026-11-15 10:11:12 EST\n@@BUILD\n9bc29b3c0500\n`);
  assert.deepEqual(idle, { availableMb: 5200, gameRunning: false, time: "2026-11-15 10:11:12 EST", build: "9bc29b3c0500" });
  const busy = parseStatusReport(`${FREE_OUT}\n@@GAME\n48213\n@@DATE\nt\n@@BUILD\nb\n`);
  assert.equal(busy.gameRunning, true);
  assert.equal(parseStatusReport("nothing useful").availableMb, null);
});

test("every Deck command has exactly the shape: ssh, the address, one quoted command, nothing between", () => {
  assert.deepEqual(buildSshArgs("deck@192.168.86.52", "free -m"), ["deck@192.168.86.52", "free -m"]);
  assert.throws(() => buildSshArgs("-oProxyCommand=evil", "free -m"), /deck@/);
  assert.throws(() => buildSshArgs("deck@host name", "free -m"), /deck@/);
  assert.throws(() => buildSshArgs("deck@192.168.86.52", ""), /command/);
  assert.ok(STATUS_CMD.includes("pgrep -f '[S]teamLaunch AppId'"));
  assert.ok(STATUS_CMD.startsWith("free -m"));
});

test("the evidence file is named plan<NN>-<row>.json, then -try2, -try3: it never overwrites", () => {
  const dir = tempDir("bonsai-evidence-");
  const first = writeEvidenceFile(dir, 104, "ROW-1", { n: 1 });
  assert.equal(path.basename(first), "plan104-ROW-1.json");
  const second = writeEvidenceFile(dir, 104, "ROW-1", { n: 2 });
  assert.equal(path.basename(second), "plan104-ROW-1-try2.json");
  const third = writeEvidenceFile(dir, 104, "ROW-1", { n: 3 });
  assert.equal(path.basename(third), "plan104-ROW-1-try3.json");
  assert.deepEqual(JSON.parse(fs.readFileSync(first, "utf8")), { n: 1 });
  assert.deepEqual(JSON.parse(fs.readFileSync(second, "utf8")), { n: 2 });
  assert.equal(path.basename(evidenceTarget(dir, 104, "ROW-1")), "plan104-ROW-1-try4.json");
  assert.equal(path.basename(evidenceTarget(dir, 104, "OTHER")), "plan104-OTHER.json");
});

test("a file that appears between the check and the write is not overwritten either", () => {
  const dir = tempDir("bonsai-evidence-race-");
  const taken = path.join(dir, "plan104-R.json");
  fs.writeFileSync(taken, "someone else's");
  // Pretend the name looked free: the write itself must still refuse to replace the file.
  const written = writeEvidenceFile(dir, 104, "R", { n: 1 }, { firstChoice: taken });
  assert.equal(path.basename(written), "plan104-R-try2.json");
  assert.equal(fs.readFileSync(taken, "utf8"), "someone else's");
});

// ---------------------------------------------------------------------------
// A stand-in for the Deck tools and for SSH
// ---------------------------------------------------------------------------

const asToolResult = (data, isError = false) => ({ content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data) }], ...(isError ? { isError: true } : {}) });

const READBACK_BASE = { turns: 3, finished: true, streaming: false, attachLine: { file: "a.log", line: "t1 notes for this answer: old" } };

function readbackAfter({ line = "none", attached = [{ name: "Exploder", numbers: [2001] }], shut = 1, open = 0, ring = "Was this helpful?", focus = true, newLine = "t2 notes for this answer: new" } = {}) {
  return {
    turns: 4,
    finished: true,
    streaming: false,
    notes: { present: true, count: attached.length, open: false, names: [] },
    spoilers: { shut, open },
    noCloseMatchLine: line === "No close match",
    notInMyNotesLine: line === "Not in my notes",
    noNotesForGameLine: line === "No notes for this game",
    game: "Hollow Knight",
    focus: { label: ring, cls: "x", via: "ring" },
    windowFocus: focus,
    attachLine: { file: "a.log", line: newLine },
    turnList: [{ question: "q", attached, attachLine: newLine }],
  };
}

// What the page says about the newest answer while it is being written: how many answer slots there are, whether
// the newest has a bubble, whether it is still streaming, how long its text is, and whether the reply's action row
// ("Was this helpful?" and the rest) is drawn.
const PROGRESS_DONE = { slots: 4, bubble: true, streaming: false, textLen: 100, actions: true };
const PROGRESS_STUCK = { slots: 4, bubble: true, streaming: true, textLen: 5, actions: false };
const STALE_ATTACHED = [{ name: "StaleNote", numbers: [1] }];

function standIn({
  status = {},
  context = {},
  walk = {},
  type = {},
  progress = PROGRESS_DONE,
  baseline = READBACK_BASE,
  after = {},
  logLine = true,
  logAfterReads = 0,
  toolOverrides = {},
} = {}) {
  const calls = [];
  const sshCalls = [];
  const statusText = (s = {}) =>
    `${FREE_OUT.replace("5200", String(s.available ?? 5200))}\n@@GAME\n${s.game ? "48213" : ""}\n@@DATE\n2026-11-15 10:00:00 EST\n@@BUILD\n9bc29b3c0500\n`;
  const progressOf = typeof progress === "function" ? progress : (state) => (Array.isArray(progress) ? progress[Math.min(state.poll, progress.length - 1)] : progress);
  const clock = { t: 0 };
  const polls = { n: 0 };
  let readsSinceTyping = 0;
  let sentThisRow = false;
  const typedCount = () => calls.filter((c) => c.name === "deck_typeText").length;
  const client = {
    async callTool(name, args) {
      calls.push({ name, args });
      if (toolOverrides[name]) return toolOverrides[name](args);
      switch (name) {
        case "deck_readPage":
          if (String(args.expression).includes("bonsai-chat-turn-slot")) {
            const value = progressOf({ poll: polls.n, typedCount: typedCount() });
            polls.n += 1;
            return asToolResult({ ok: true, value });
          }
          return asToolResult({ ok: true, value: { panel: true, chat: "Test chat", mode: "Strategy", width: 1280, height: 800, ...context } });
        case "deck_pressButton":
          return asToolResult({ ok: true, fidelity: "steam-routed", summary: "moved" });
        case "deck_walkTo":
          return asToolResult({ ok: true, found: true, matched: "Ask", presses: 1, summary: "reached", ...walk });
        case "deck_typeText":
          polls.n = 0;
          sentThisRow = true;
          return asToolResult({ ok: true, matched: true, typed: true, summary: "typed and sent", ...type });
        case "deck_releaseMachine":
          return asToolResult({ released: true, note: "released" });
        default:
          return asToolResult({}, true);
      }
    },
  };
  const ssh = async (cmd, { input } = {}) => {
    sshCalls.push({ cmd, input });
    if (cmd.startsWith("free -m")) {
      sentThisRow = false;
      readsSinceTyping = 0;
      return { code: 0, stdout: statusText(status), stderr: "" };
    }
    if (cmd.includes("--turns")) {
      if (!sentThisRow) {
        return { code: 0, stdout: JSON.stringify(baseline), stderr: "" };
      }
      // After the question was sent. The log line arrives after `logAfterReads` reads, or never.
      readsSinceTyping += 1;
      const arrived = logLine && readsSinceTyping > logAfterReads;
      const body = arrived
        ? readbackAfter(after)
        : readbackAfter({ ...after, attached: STALE_ATTACHED, newLine: baseline.attachLine.line });
      return { code: 0, stdout: JSON.stringify(body), stderr: "" };
    }
    return { code: 1, stdout: "", stderr: "unexpected command" };
  };
  return {
    calls,
    sshCalls,
    clock,
    deps: {
      client,
      ssh,
      now: () => clock.t,
      sleep: async (ms) => {
        clock.t += ms;
      },
      readbackSource: "# the read-back script text",
      say: () => {},
    },
  };
}

function runWith(rows, opts = {}) {
  const dir = tempDir("bonsai-rows-evidence-");
  const s = standIn(opts);
  const lines = [];
  s.deps.say = (l) => lines.push(l);
  s.deps.evidenceDir = dir;
  const done = runRows({ rows, plan: 104, deps: s.deps });
  return done.then((out) => ({ ...out, ...s, dir, lines }));
}

const rowWith = (over = {}) => ({ ...ROW, waitSeconds: 240, ...over });

// ---------------------------------------------------------------------------
// One row, start to finish
// ---------------------------------------------------------------------------

test("one row: places the ring, types and sends, waits, reads back, writes one evidence file and prints one line", async () => {
  const r = await runWith([rowWith({ expect: { notesInclude: ["Exploder"], line: "none" } })]);
  assert.equal(r.results.length, 1);
  assert.match(r.results[0].verdict, /^PASS/);
  const names = r.calls.map((c) => c.name);
  assert.deepEqual(names.slice(0, 5), ["deck_readPage", "deck_walkTo", "deck_pressButton", "deck_typeText", "deck_readPage"]);
  const type = r.calls.find((c) => c.name === "deck_typeText").args;
  assert.equal(type.text, ROW.question);
  assert.equal(type.clear, true);
  assert.equal(type.submit, true);
  for (const c of r.calls) assert.equal(c.args.rowId, ROW.row, `${c.name} carries the row's name`);
  const walk = r.calls.find((c) => c.name === "deck_walkTo").args;
  assert.equal(walk.direction, "DOWN");
  assert.equal(walk.text, "Ask");
  assert.equal(walk.exact, true);
  assert.deepEqual(r.calls.find((c) => c.name === "deck_pressButton").args.buttons, ["UP"]);
  // One evidence file, with the field names the driver's rule 3 lists.
  const files = fs.readdirSync(r.dir);
  assert.deepEqual(files, ["plan104-P104-T1-A.json"]);
  const ev = JSON.parse(fs.readFileSync(path.join(r.dir, files[0]), "utf8"));
  for (const key of ["row", "build_commit", "deck_time_local", "screen", "setup", "pressed", "seen", "expected", "verdict"]) {
    assert.ok(key in ev, `evidence has ${key}`);
  }
  assert.equal(ev.build_commit, "9bc29b3c0500");
  assert.equal(ev.screen, "1280x800");
  assert.match(ev.verdict, /^PASS/);
  assert.ok(ev.side_effect.includes("Test chat"));
  // One short line for the row.
  assert.equal(r.lines.filter((l) => l.startsWith("P104-T1-A")).length, 1);
  const line = r.lines.find((l) => l.startsWith("P104-T1-A"));
  assert.ok(line.length < 200, line);
  assert.ok(line.includes("Exploder#2001"), line);
  assert.ok(line.includes("PASS"), line);
});

test("with no expect object the line says what was seen and the verdict is UNCLEAR for the driver", async () => {
  const r = await runWith([rowWith()]);
  assert.match(r.results[0].verdict, /^UNCLEAR/);
  const ev = JSON.parse(fs.readFileSync(path.join(r.dir, fs.readdirSync(r.dir)[0]), "utf8"));
  assert.equal(ev.expected, null);
});

test("it never presses A, B, START or SELECT: no press tool is called, and no walk is anything but a direction", async () => {
  const r = await runWith([rowWith(), rowWith({ row: "B" })]);
  const used = new Set(r.calls.map((c) => c.name));
  for (const forbidden of ["deck_pressChord", "deck_runSequence", "deck_launchGame", "deck_exitGame", "deck_deploy", "deck_reloadPlugin", "deck_sweep"]) {
    assert.equal(used.has(forbidden), false, forbidden);
  }
  // The only press tool is deck_pressButton, and only ever with one Up.
  for (const c of r.calls.filter((c) => c.name === "deck_pressButton")) assert.deepEqual(c.args.buttons, ["UP"]);
  for (const c of r.calls.filter((c) => c.name === "deck_walkTo")) assert.equal(c.args.direction, "DOWN");
});

test("the question's words go only to the typing tool, never into an SSH command", async () => {
  const r = await runWith([rowWith({ question: "tell me about 'quotes' and $(rm -rf) and `ticks`" })]);
  for (const s of r.sshCalls) assert.equal(s.cmd.includes("quotes"), false);
  const sent = r.calls.find((c) => c.name === "deck_typeText").args.text;
  assert.equal(sent, "tell me about 'quotes' and $(rm -rf) and `ticks`");
});

test("every SSH command is one of a short fixed list", async () => {
  const r = await runWith([rowWith()]);
  for (const s of r.sshCalls) {
    assert.ok(s.cmd === STATUS_CMD || s.cmd === "python3 - --json --turns 1", s.cmd);
  }
  const readbacks = r.sshCalls.filter((s) => s.cmd.includes("--turns"));
  assert.ok(readbacks.length >= 2);
  assert.equal(readbacks[0].input, "# the read-back script text");
});

test("the wait ends when the reply's action row is drawn, however long that takes, and the row is not a timeout", async () => {
  const r = await runWith([rowWith({ waitSeconds: 60 })], {
    progress: [{ ...PROGRESS_STUCK, textLen: 10 }, { ...PROGRESS_STUCK, textLen: 50 }, PROGRESS_DONE],
  });
  assert.equal(r.results[0].timedOut, false);
  assert.ok(r.clock.t >= 6000, "it polled between reads");
  assert.match(r.results[0].verdict, /^UNCLEAR/);
});

test("a reply that has no action row ends the wait once it is finished and its text has stopped growing", async () => {
  const quiet = { slots: 4, bubble: true, streaming: false, actions: false };
  const r = await runWith([rowWith({ waitSeconds: 60 })], {
    progress: [{ ...quiet, textLen: 10 }, { ...quiet, textLen: 20 }, { ...quiet, textLen: 20 }, { ...quiet, textLen: 20 }],
  });
  assert.equal(r.results[0].timedOut, false);
  const progressReads = r.calls.filter((c) => c.name === "deck_readPage" && String(c.args.expression).includes("bonsai-chat-turn-slot"));
  assert.equal(progressReads.length, 3, "it stopped at the first read that matched the one before it");
});

test("text that is still growing, or still streaming, is not finished; neither is a turn the page has not drawn yet", async () => {
  const growing = (poll) => ({ slots: 4, bubble: true, streaming: false, actions: false, textLen: 10 + poll });
  const a = await runWith([rowWith({ waitSeconds: 10 })], { progress: ({ poll }) => growing(poll) });
  assert.equal(a.results[0].timedOut, true);
  const b = await runWith([rowWith({ waitSeconds: 10 })], { progress: { ...PROGRESS_DONE, slots: 3 } });
  assert.equal(b.results[0].timedOut, true, "the slot count never went above the one before the question");
});

test("a reply that never finishes is a timeout after the row's own limit", async () => {
  const r = await runWith([rowWith({ waitSeconds: 10 })], { progress: PROGRESS_STUCK });
  assert.equal(r.results[0].timedOut, true);
  assert.match(r.results[0].verdict, /^COULD NOT RUN: timeout/);
  assert.ok(r.clock.t >= 10000);
  assert.ok(r.clock.t < 20000);
});

test("the reply finishes and no 'notes for this answer' line ever comes (a refusal reply writes none): not a timeout, the log is reported as absent", async () => {
  const rows = ["A", "B", "C"].map((id) => rowWith({ row: id, waitSeconds: 240 }));
  const r = await runWith(rows, { logLine: false, after: { line: "No notes for this game" } });
  assert.equal(r.stopped, null, "three rows in a row with no log line do not stop the list");
  for (const res of r.results) {
    assert.equal(res.timedOut, false);
    assert.match(res.verdict, /^UNCLEAR/);
    assert.equal(res.seen.logLine, null);
    assert.deepEqual(res.seen.attached, [], "the old line's notes are not claimed for this answer");
    assert.equal(res.seen.line, "No notes for this game");
  }
  assert.ok(r.clock.t < 3 * 60000, "each row gave up on the log after seconds, not after its whole limit");
  const ev = JSON.parse(fs.readFileSync(path.join(r.dir, "plan104-A.json"), "utf8"));
  assert.equal(ev.seen.attachLine, null);
  assert.equal(ev.seen.logLine, null);
  const printed = r.lines.find((l) => l.startsWith("A"));
  assert.ok(printed.includes("no log line"), printed);
});

test("a log line that arrives a few seconds after the reply is still picked up", async () => {
  const r = await runWith([rowWith()], { logAfterReads: 1 });
  assert.equal(r.results[0].seen.logLine !== null, true);
  assert.deepEqual(r.results[0].seen.attached.map((n) => n.name), ["Exploder"]);
});

test("with a game running the box is reached the same way: Down to Ask, one Up", async () => {
  const r = await runWith([rowWith()], { status: { game: true, available: 4000 } });
  assert.equal(r.calls.find((c) => c.name === "deck_walkTo").args.text, "Ask");
  assert.equal(r.calls.filter((c) => c.name === "deck_pressButton").length, 1);
  assert.match(r.results[0].verdict, /^UNCLEAR/);
});

// ---------------------------------------------------------------------------
// Rows that cannot run
// ---------------------------------------------------------------------------

test("a game running with under 3,000 MB available skips the row: nothing is typed, the evidence says COULD NOT RUN: memory", async () => {
  const r = await runWith([rowWith(), rowWith({ row: "B" })], { status: { game: true, available: 2500 } });
  assert.match(r.results[0].verdict, /^COULD NOT RUN: memory/);
  assert.equal(r.calls.filter((c) => c.name === "deck_typeText").length, 0);
  assert.equal(r.results.length, 2, "the next row is still tried (and skipped the same way)");
  const files = fs.readdirSync(r.dir).sort();
  assert.deepEqual(files, ["plan104-B.json", "plan104-P104-T1-A.json"]);
  const ev = JSON.parse(fs.readFileSync(path.join(r.dir, "plan104-P104-T1-A.json"), "utf8"));
  assert.match(ev.verdict, /^COULD NOT RUN: memory/);
  assert.ok(ev.verdict.includes("2500"));
});

test("exactly 3,000 MB with a game is enough; no game and low memory is not skipped", async () => {
  const enough = await runWith([rowWith()], { status: { game: true, available: 3000 } });
  assert.equal(enough.calls.filter((c) => c.name === "deck_typeText").length, 1);
  const noGame = await runWith([rowWith()], { status: { game: false, available: 1200 } });
  assert.equal(noGame.calls.filter((c) => c.name === "deck_typeText").length, 1);
});

test("a memory reading that cannot be read is treated as unsafe when a game runs", async () => {
  const r = await runWith([rowWith()], { toolOverrides: {} , status: { game: true } });
  assert.equal(r.calls.filter((c) => c.name === "deck_typeText").length, 1);
  const dir = tempDir("bonsai-rows-garbled-");
  const s = standIn({ status: { game: true } });
  s.deps.ssh = async (cmd) => (cmd.startsWith("free -m") ? { code: 0, stdout: "\n@@GAME\n48213\n@@DATE\nx\n@@BUILD\ny\n", stderr: "" } : { code: 1, stdout: "", stderr: "" });
  s.deps.evidenceDir = dir;
  s.deps.say = () => {};
  const out = await runRows({ rows: [rowWith()], plan: 104, deps: s.deps });
  assert.match(out.results[0].verdict, /^COULD NOT RUN: memory/);
  assert.equal(s.calls.filter((c) => c.name === "deck_typeText").length, 0);
});

test("a different chat open than the row names: COULD NOT RUN: chat, nothing typed, the chat is never switched", async () => {
  const r = await runWith([rowWith()], { context: { chat: "One of the maintainer's own chats" } });
  assert.match(r.results[0].verdict, /^COULD NOT RUN: chat/);
  assert.ok(r.results[0].verdict.includes("One of the maintainer's own chats"));
  assert.equal(r.calls.filter((c) => c.name === "deck_typeText").length, 0);
  assert.equal(r.calls.filter((c) => c.name === "deck_walkTo").length, 0);
});

test("a chat name that cannot be read counts as not matching", async () => {
  const r = await runWith([rowWith()], { context: { chat: null } });
  assert.match(r.results[0].verdict, /^COULD NOT RUN: chat/);
});

test("the chat name is compared whole, ignoring case and outer spaces", async () => {
  const ok = await runWith([rowWith({ chat: "test CHAT" })], { context: { chat: "  Test chat " } });
  assert.equal(ok.calls.filter((c) => c.name === "deck_typeText").length, 1);
  const longer = await runWith([rowWith({ chat: "Test" })], { context: { chat: "Test chat" } });
  assert.match(longer.results[0].verdict, /^COULD NOT RUN: chat/);
});

test("a row naming a mode that is not the mode chip's: COULD NOT RUN: mode", async () => {
  const r = await runWith([rowWith({ mode: "Speed" })], { context: { mode: "Strategy" } });
  assert.match(r.results[0].verdict, /^COULD NOT RUN: mode/);
  assert.equal(r.calls.filter((c) => c.name === "deck_typeText").length, 0);
});

test("the panel not being open is COULD NOT RUN, with nothing pressed", async () => {
  const r = await runWith([rowWith()], { context: { panel: false } });
  assert.match(r.results[0].verdict, /^COULD NOT RUN: panel/);
  assert.equal(r.calls.filter((c) => c.name === "deck_walkTo").length, 0);
});

test("an answer still being written when the row starts is not asked over", async () => {
  const busy = { ...READBACK_BASE, streaming: true, finished: false };
  const r = await runWith([rowWith()], { baseline: busy });
  assert.match(r.results[0].verdict, /^COULD NOT RUN: an answer is still/);
  assert.equal(r.calls.filter((c) => c.name === "deck_typeText").length, 0);
});

test("the ring not reaching the Ask button, or Up from it not moving the ring: COULD NOT RUN, nothing typed", async () => {
  const r = await runWith([rowWith()], { walk: { ok: false, found: false, summary: "stalled after 2 presses" } });
  assert.match(r.results[0].verdict, /^COULD NOT RUN: ring/);
  assert.ok(r.results[0].verdict.includes("stalled"));
  assert.equal(r.calls.filter((c) => c.name === "deck_typeText").length, 0);
  assert.equal(r.calls.filter((c) => c.name === "deck_pressButton").length, 0, "no Up was pressed after a walk that failed");
  const up = await runWith([rowWith()], { toolOverrides: { deck_pressButton: () => asToolResult({ ok: false, summary: "focus did not change" }) } });
  assert.match(up.results[0].verdict, /^COULD NOT RUN: ring/);
  assert.equal(up.calls.filter((c) => c.name === "deck_typeText").length, 0);
});

test("text that did not read back as typed: COULD NOT RUN: question not sent, and the evidence says text may be left in the box", async () => {
  const r = await runWith([rowWith()], { type: { ok: false, matched: false, summary: "the field held a different text" } });
  assert.match(r.results[0].verdict, /^COULD NOT RUN: the question was not sent/);
  const ev = JSON.parse(fs.readFileSync(path.join(r.dir, fs.readdirSync(r.dir)[0]), "utf8"));
  assert.ok(/left in the (question )?box/.test(ev.side_effect));
  assert.equal(r.calls.filter((c) => c.name === "deck_readPage").length, 1, "only the first read of the page was made");
});

// ---------------------------------------------------------------------------
// Timeouts, the stop switch, the lease
// ---------------------------------------------------------------------------

const noAnswer = { progress: PROGRESS_STUCK };

test("one timeout is recorded and the list goes on; a success after it starts the count again", async () => {
  const rows = ["A", "B", "C", "D"].map((id) => rowWith({ row: id, waitSeconds: 10 }));
  const r = await runWith(rows, { progress: ({ typedCount }) => ([1, 3].includes(typedCount) ? PROGRESS_STUCK : PROGRESS_DONE) });
  assert.equal(r.results.length, 4);
  assert.equal(r.stopped, null);
  assert.equal(r.results.filter((x) => x.timedOut).length, 2);
});

test("two timeouts in a row stop the whole list; the rows after it are written as COULD NOT RUN and nothing more is typed", async () => {
  const rows = ["A", "B", "C", "D"].map((id) => rowWith({ row: id, waitSeconds: 10 }));
  const r = await runWith(rows, noAnswer);
  assert.equal(r.calls.filter((c) => c.name === "deck_typeText").length, 2);
  assert.match(r.stopped, /two timeouts in a row/);
  assert.equal(r.results.length, 4);
  assert.match(r.results[0].verdict, /^COULD NOT RUN: timeout/);
  assert.match(r.results[1].verdict, /^COULD NOT RUN: timeout/);
  assert.match(r.results[2].verdict, /^COULD NOT RUN: the list stopped/);
  assert.match(r.results[3].verdict, /^COULD NOT RUN: the list stopped/);
  assert.equal(fs.readdirSync(r.dir).length, 4, "one evidence file per row, stopped rows included");
  assert.equal(r.exitCode, 1);
});

test("a tool refusing because the stop switch is on stops the whole list at once", async () => {
  const stopped = (args) => asToolResult(`Deck automation is STOPPED. The killswitch was set at 2026-11-15 (tool). No press will be delivered until a human re-arms it.`, true);
  const r = await runWith([rowWith({ row: "A" }), rowWith({ row: "B" })], { toolOverrides: { deck_walkTo: stopped } });
  assert.match(r.stopped, /stop switch/);
  assert.match(r.results[0].verdict, /^COULD NOT RUN: the stop switch/);
  assert.match(r.results[1].verdict, /^COULD NOT RUN: the list stopped/);
  assert.equal(r.calls.filter((c) => c.name === "deck_typeText").length, 0);
});

test("a result that says stopped:true counts the same as the refusal text", async () => {
  const r = await runWith([rowWith()], { walk: { ok: false, found: false, stopped: true, summary: "stopped" } });
  assert.match(r.stopped, /stop switch/);
});

test("losing the lease half way (another session took the Deck) stops the whole list", async () => {
  const lost = () => asToolResult(`Machine "deck" is being driven by another session: someone else, since now.`, true);
  const r = await runWith([rowWith({ row: "A" }), rowWith({ row: "B" })], { toolOverrides: { deck_typeText: lost } });
  assert.match(r.stopped, /another session/);
  assert.match(r.results[1].verdict, /^COULD NOT RUN: the list stopped/);
});

test("the Deck not answering over SSH stops the list and says so", async () => {
  const dir = tempDir("bonsai-rows-ssh-");
  const s = standIn();
  s.deps.ssh = async () => ({ code: 255, stdout: "", stderr: "ssh: connect to host 192.168.86.52 port 22: Connection timed out" });
  s.deps.evidenceDir = dir;
  s.deps.say = () => {};
  const out = await runRows({ rows: [rowWith({ row: "A" }), rowWith({ row: "B" })], plan: 104, deps: s.deps });
  assert.match(out.stopped, /did not answer over SSH/);
  assert.match(out.results[0].verdict, /^COULD NOT RUN: the Deck did not answer over SSH/);
  assert.equal(s.calls.length, 0);
});

// ---------------------------------------------------------------------------
// The command line: start-up, lease, release, dry run (the repo's own fake tool server, over stdio)
// ---------------------------------------------------------------------------

function cliWorld({ listMachines, extraRules = [], toolNames } = {}) {
  const root = tempDir("bonsai-rows-cli-");
  const workshop = path.join(root, "workshop");
  fs.mkdirSync(workshop, { recursive: true });
  const config = path.join(root, "fake.json");
  const log = path.join(root, "calls.ndjson");
  const names = toolNames ?? ["deck_listMachines", "deck_readPage", "deck_walkTo", "deck_pressButton", "deck_typeText", "deck_releaseMachine"];
  fs.writeFileSync(
    config,
    JSON.stringify({
      toolNames: names,
      rules: [
        { name: "deck_listMachines", result: listMachines ?? { default: "deck", allStopped: false, machines: [{ name: "deck", lease: null, stopped: null }] } },
        { name: "deck_readPage", result: { ok: true, value: { panel: true, chat: "Test chat", mode: "Strategy", width: 1280, height: 800, slots: 99, bubble: true, streaming: false, textLen: 100, actions: true } } },
        { name: "deck_walkTo", result: { ok: true, found: true, matched: "Ask", presses: 2, summary: "reached" } },
        { name: "deck_pressButton", result: { ok: true, summary: "moved" } },
        { name: "deck_typeText", result: { ok: true, matched: true, typed: true, summary: "sent" } },
        { name: "deck_releaseMachine", result: { released: true, note: "released this session's lease" } },
        ...extraRules,
      ],
    }),
  );
  fs.writeFileSync(
    path.join(root, ".mcp.json"),
    JSON.stringify({ mcpServers: { "decky-plugin-studio": { command: process.execPath, args: [FAKE_SERVER], env: { FAKE_MCP_CONFIG: config, FAKE_MCP_LOG: log } } } }),
  );
  const rowsFile = path.join(root, "rows.json");
  fs.writeFileSync(rowsFile, JSON.stringify([{ row: "CLI-1", question: "a question", chat: "Test chat" }]));
  const readLog = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  let readbacks = 0;
  const ssh = async (cmd) => {
    if (cmd.startsWith("free -m")) return { code: 0, stdout: `${FREE_OUT}\n@@GAME\n\n@@DATE\nnow\n@@BUILD\nabc\n`, stderr: "" };
    readbacks += 1;
    return { code: 0, stdout: JSON.stringify(readbacks === 1 ? READBACK_BASE : readbackAfter()), stderr: "" };
  };
  const out = [];
  const err = [];
  return { root, workshop, rowsFile, readLog, ssh, out, err, env: { BONSAI_WORKSHOP: workshop }, io: { out: (l) => out.push(l), err: (l) => err.push(l) } };
}

test("the command line refuses to start while another holder's lease is live, and says who", async () => {
  const w = cliWorld({
    listMachines: {
      default: "deck",
      allStopped: false,
      machines: [{ name: "deck", lease: { owner: "driver chat (pid 4412)", purpose: "deck_walkTo", since: "t0", expiresAt: "t1", mine: false }, stopped: null }],
    },
  });
  const code = await main(["--rows", w.rowsFile, "--plan", "104"], { repoRoot: w.root, env: w.env, deps: { ssh: w.ssh, readbackSource: "x", sleep: async () => {} }, io: w.io });
  assert.equal(code, 2);
  const said = w.err.join("\n");
  assert.ok(said.includes("driver chat (pid 4412)"), said);
  assert.ok(/deck_releaseMachine/.test(said), said);
  const names = w.readLog().map((c) => c.name);
  assert.deepEqual(names, ["deck_listMachines"], "nothing was driven, and it did not release a lease it never held");
  assert.equal(fs.existsSync(path.join(w.workshop, "test-evidence")), false, "no evidence file was written");
});

test("the command line refuses to start when the stop switch is on", async () => {
  const w = cliWorld({
    listMachines: { default: "deck", allStopped: true, machines: [{ name: "deck", lease: null, stopped: { at: "t", by: "tool" } }] },
  });
  const code = await main(["--rows", w.rowsFile, "--plan", "104"], { repoRoot: w.root, env: w.env, deps: { ssh: w.ssh, readbackSource: "x", sleep: async () => {} }, io: w.io });
  assert.equal(code, 2);
  assert.ok(/stop switch/.test(w.err.join("\n")));
  assert.deepEqual(w.readLog().map((c) => c.name), ["deck_listMachines"]);
});

test("a normal run takes no lease first, then releases its own at the end", async () => {
  const w = cliWorld();
  const code = await main(["--rows", w.rowsFile, "--plan", "104"], { repoRoot: w.root, env: w.env, deps: { ssh: w.ssh, readbackSource: "x", sleep: async () => {} }, io: w.io });
  assert.equal(code, 0, w.err.join("\n"));
  const names = w.readLog().map((c) => c.name);
  assert.equal(names[0], "deck_listMachines");
  assert.equal(names.at(-1), "deck_releaseMachine");
  assert.ok(names.includes("deck_typeText"));
  const evidence = fs.readdirSync(path.join(w.workshop, "test-evidence"));
  assert.deepEqual(evidence, ["plan104-CLI-1.json"]);
  assert.ok(w.out.some((l) => l.startsWith("CLI-1")));
});

test("the lease is released also when the list stops early", async () => {
  const w = cliWorld({ extraRules: [{ name: "deck_walkTo", throw: "Deck automation is STOPPED. The killswitch was set." }] });
  const rules = JSON.parse(fs.readFileSync(path.join(w.root, "fake.json"), "utf8"));
  // The throw rule has to win over the normal walk rule, so put it first.
  rules.rules.unshift(rules.rules.pop());
  fs.writeFileSync(path.join(w.root, "fake.json"), JSON.stringify(rules));
  const code = await main(["--rows", w.rowsFile, "--plan", "104"], { repoRoot: w.root, env: w.env, deps: { ssh: w.ssh, readbackSource: "x", sleep: async () => {} }, io: w.io });
  assert.equal(code, 1);
  assert.equal(w.readLog().at(-1).name, "deck_releaseMachine");
});

test("a server missing a tool the script needs is refused plainly, before any call that drives", async () => {
  const w = cliWorld({ toolNames: ["deck_listMachines", "deck_readPage"] });
  const code = await main(["--rows", w.rowsFile, "--plan", "104"], { repoRoot: w.root, env: w.env, deps: { ssh: w.ssh, readbackSource: "x", sleep: async () => {} }, io: w.io });
  assert.equal(code, 2);
  assert.ok(/deck_walkTo/.test(w.err.join("\n")));
  assert.equal(w.readLog().length, 0);
});

test("--dry-run prints what it would do and starts nothing, asks nothing over SSH, and writes no file", async () => {
  const w = cliWorld();
  let sshCalled = false;
  const code = await main(["--rows", w.rowsFile, "--plan", "104", "--dry-run"], {
    repoRoot: w.root,
    env: w.env,
    deps: { ssh: async () => { sshCalled = true; return { code: 0, stdout: "", stderr: "" }; }, readbackSource: "x" },
    io: w.io,
  });
  assert.equal(code, 0, w.err.join("\n"));
  assert.equal(sshCalled, false);
  assert.equal(w.readLog().length, 0, "the tool server was never started");
  assert.equal(fs.existsSync(path.join(w.workshop, "test-evidence")), false, "no evidence folder was made");
  const said = w.out.join("\n");
  assert.ok(said.includes("CLI-1"));
  assert.ok(said.includes("a question"));
  assert.ok(said.includes("plan104-CLI-1.json"));
  assert.ok(said.includes("pgrep"));
  assert.ok(/never presses A/.test(said));
});

test("--dry-run names the next free evidence file when one exists already, without touching either", async () => {
  const w = cliWorld();
  const evidence = path.join(w.workshop, "test-evidence");
  fs.mkdirSync(evidence);
  fs.writeFileSync(path.join(evidence, "plan104-CLI-1.json"), "kept");
  await main(["--rows", w.rowsFile, "--plan", "104", "--dry-run"], { repoRoot: w.root, env: w.env, deps: { ssh: w.ssh, readbackSource: "x", sleep: async () => {} }, io: w.io });
  assert.ok(w.out.join("\n").includes("plan104-CLI-1-try2.json"));
  assert.equal(fs.readFileSync(path.join(evidence, "plan104-CLI-1.json"), "utf8"), "kept");
  assert.deepEqual(fs.readdirSync(evidence), ["plan104-CLI-1.json"]);
});

test("bad arguments are refused in plain words and start nothing", async () => {
  const w = cliWorld();
  const run = (argv) => main(argv, { repoRoot: w.root, env: w.env, deps: { ssh: w.ssh, readbackSource: "x", sleep: async () => {} }, io: w.io });
  assert.equal(await run([]), 2);
  assert.ok(/--rows/.test(w.err.join("\n")));
  assert.equal(await run(["--rows", w.rowsFile]), 2);
  assert.ok(/--plan/.test(w.err.join("\n")));
  assert.equal(await run(["--rows", w.rowsFile, "--plan", "abc"]), 2);
  assert.equal(await run(["--rows", path.join(w.root, "missing.json"), "--plan", "104"]), 2);
  assert.equal(await run(["--rows", w.rowsFile, "--plan", "104", "--host", "-oProxyCommand=x"]), 2);
  assert.equal(w.readLog().length, 0);
});

// ---------------------------------------------------------------------------
// The printed line
// ---------------------------------------------------------------------------

test("the printed line holds the row, seconds, notes by number and name, the line, the covers, the ring and the page's focus", () => {
  const line = formatRowLine({
    row: "R1",
    verdict: "PASS: matched",
    seen: {
      seconds: 61.4,
      logLine: "t2 notes for this answer: ...",
      attached: [{ name: "Exploder", numbers: [2001, 3001] }, { name: "Soul Master", numbers: [2002] }, { name: "Mystery", numbers: null }],
      line: "No notes for this game",
      covers: { shut: 2, open: 1 },
      ring: "Was this helpful?",
      pageFocus: true,
    },
  });
  assert.ok(line.startsWith("R1"));
  assert.ok(line.includes("61s"));
  assert.ok(line.includes("3 notes"));
  assert.ok(line.includes("Exploder#2001|3001"));
  assert.ok(line.includes("Soul Master#2002"));
  assert.ok(line.includes("Mystery#?"));
  assert.ok(line.includes("No notes for this game"));
  assert.ok(line.includes("2 shut, 1 open"));
  assert.ok(line.includes("Was this helpful?"));
  assert.ok(line.includes("page focus yes"));
  assert.ok(line.endsWith("PASS"));
  assert.equal(line.includes("\n"), false);
  const noLog = formatRowLine({
    row: "R3",
    verdict: "UNCLEAR: nothing to compare",
    seen: { seconds: 5, attached: [], logLine: null, line: "none", covers: { shut: 0, open: 0 }, ring: "x", pageFocus: false },
  });
  assert.ok(noLog.includes("notes ? (no log line)"), noLog);
  assert.ok(noLog.includes("page focus no"), noLog);
  const skipped = formatRowLine({ row: "R2", verdict: "COULD NOT RUN: memory (game running, 2500 MB available, needs 3000)", seen: null });
  assert.equal(skipped, "R2  COULD NOT RUN: memory (game running, 2500 MB available, needs 3000)");
});

// ---------------------------------------------------------------------------
// The class names the page reads look for, pinned against the files in src/ that draw them
// ---------------------------------------------------------------------------

const ROOT = path.join(HERE, "..");
const EXPR_PINS = [
  ["src/features/plugin-shell/BonsaiPluginShell.tsx", "bonsai-scope", CONTEXT_EXPR],
  ["src/features/chats/title/ChatNameWords.tsx", "bonsai-chat-title__words", CONTEXT_EXPR],
  ["src/features/ask/bar/MainTabUnifiedAskBar.tsx", "bonsai-ask-mode-trigger", CONTEXT_EXPR],
  ["src/features/answer/transcript/MainTabChatTranscript.tsx", "bonsai-chat-turn-slot", PROGRESS_EXPR],
  ["src/features/answer/bubble/buildAnswerBubbleElement.tsx", "bonsai-chat-ai-bubble--stream-preview", PROGRESS_EXPR],
  ["src/features/answer/transcript/buildTurnHeaderElement.tsx", "bonsai-chat-turn-row-header--streaming", PROGRESS_EXPR],
  ["src/features/answer/reply-actions/buildReplyActionsElement.tsx", "bonsai-chat-reply-actions", PROGRESS_EXPR],
  ["src/features/ask/bar/AskStripSendButtons.tsx", 'aria-label="Ask"', null],
];

for (const [file, token, expr] of EXPR_PINS) {
  test(`pin: ${token} is drawn by ${path.basename(file)}${expr ? " and read by the script" : ""}`, () => {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.ok(source.includes(token), `${file} no longer holds "${token}"`);
    if (expr) assert.ok(expr.includes(token), `the page read no longer looks for "${token}"`);
  });
}
