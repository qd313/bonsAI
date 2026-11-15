#!/usr/bin/env node
/**
 * Title: Ask a whole list of questions on the Deck in one call
 * Purpose: Takes a rows file (a JSON list; each row has a name, a question, and may say which chat, which
 *          Ask mode, how long to wait and what it expects) and, for each row in order: reads the Deck's free
 *          memory and whether a game runs, checks the open chat's name, puts the question box under the ring,
 *          types the question and sends it with an Enter key event, waits until the answer is finished on
 *          screen, reads the answer's state back (notes by number and name, which honesty line showed, the
 *          covers, the ring, the page's focus), writes one evidence file in the workshop's test-evidence
 *          folder, and prints one short line. A row with an `expect` object also gets a verdict from comparing
 *          what it expects (notesInclude, notesExclude, line, covers) with what was read; a row with none
 *          prints what was seen and leaves the verdict to the driver.
 * Used for: Deck check rows that ask questions (plan 104, block D0a on). A driver runs, from the shared checkout:
 *              node scripts/deck_ask_rows.mjs --rows <rows.json> --plan 104 --chat "<test chat name>"
 *          and `--dry-run` first to see what would happen. Only one driver may hold the Deck: release your own
 *          lease with deck_releaseMachine before you run it (it refuses to start while another lease is live).
 * Solves: One question checked by hand cost about six tool calls and forty seconds, and the replies were large
 *          enough that a driver's memory filled in ten to fifteen minutes. This is one call for the list and
 *          a few lines back.
 * Does not: Press A, B, START or SELECT (the only presses are Down presses of one walk to the Ask button, one Up
 *          from it to the question box, and the Enter key event that sends). Switch chats, change the Ask mode, deploy, reload, launch a game
 *          or change a setting. Ask in a chat other than the row's named one. Build a shell string from a
 *          question's words: the question goes only to the typing tool, and the SSH commands are a short fixed
 *          list. It never touches the Deck itself in a test: scripts/deck_ask_rows.test.mjs runs it against
 *          a stand-in for the tool server and for SSH.
 *
 * How it reaches the Deck: it starts the Deck tools server the way Claude Code does (the command comes from
 * .mcp.json at run time, as scripts/deck_overnight_run.mjs does) and calls its tools; and it runs
 * `ssh deck@192.168.86.52 '<fixed command>'` for the memory, game and log reads. The tools server holds the
 * Deck's per-machine lease for its own driving calls; this script looks first (deck_listMachines), refuses to
 * start while anyone else holds it, and releases its own at the end, also when it stops early.
 *
 * Exit code: 0 when every row ran (a FAIL or UNCLEAR is a result, not a problem); 1 when a row could not run
 * or the list stopped early; 2 when it refused to start (bad rows file, another lease, the stop switch).
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { McpStdioClient } from "./lib/mcpStdioClient.mjs";
import { readMcpServerConfig } from "./lib/deckOvernightRun.mjs";
import { evidenceDir as workshopEvidenceDir, WorkshopNotFoundError } from "./lib/workshop.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const MCP_SERVER_NAME = "decky-plugin-studio";
const DEFAULT_HOST = "deck@192.168.86.52";
const HOST_RE = /^deck@\d{1,3}(\.\d{1,3}){3}$/;
const MIN_FREE_MB_WITH_GAME = 3000;
const DEFAULT_WAIT_SECONDS = 240;
const POLL_MS = 3000;
const LOG_GRACE_READS = 2; // after the answer is finished, how many more times to look for the log line
const MAX_PAGE_READ_FAILURES = 3;
const REQUIRED_TOOLS = ["deck_listMachines", "deck_readPage", "deck_walkTo", "deck_pressButton", "deck_typeText", "deck_releaseMachine"];
const ASK_BUTTON_LABEL = "Ask"; // the aria-label of the Ask button (AskStripSendButtons.tsx); the box is one Up from it

// The three honesty lines under an answer, and "none" for an answer with no line.
const LINE_NAMES = ["none", "No close match", "Not in my notes", "No notes for this game"];
const LINE_KEYS = { none: "none", noclosematch: "noclosematch", notinmynotes: "notinmynotes", nonotesforgame: "nonotesforgame", nonotesforthisgame: "nonotesforgame" };
const ROW_KEYS = ["row", "question", "mode", "chat", "waitSeconds", "expect"];
const EXPECT_KEYS = ["notesInclude", "notesExclude", "line", "covers"];

// The only commands sent over SSH. The question's words are never part of one.
export const STATUS_CMD =
  "free -m; echo '@@GAME'; pgrep -f '[S]teamLaunch AppId'; echo '@@DATE'; date '+%Y-%m-%d %H:%M:%S %Z'; " +
  "echo '@@BUILD'; sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12";
const READBACK_CMD = "python3 - --json --turns 1";

// Page reads (read-only). Every class name is pinned against src/ by the test, as the read-back's are.
export const CONTEXT_EXPR =
  "(function () { var s = document.querySelector('.bonsai-scope'); " +
  "var t = document.querySelector('.bonsai-chat-title__words'); " +
  "var m = s ? s.querySelector('.bonsai-ask-mode-trigger') : null; " +
  "return {panel: Boolean(s), chat: t ? (t.textContent || '').trim() : null, " +
  "mode: m ? (m.textContent || '').trim() : null, width: window.innerWidth, height: window.innerHeight}; })()";
export const PROGRESS_EXPR =
  "(function () { var s = document.querySelector('.bonsai-scope'); " +
  "if (!s) return {slots: 0, bubble: false, streaming: false, textLen: 0, actions: false}; " +
  "var slots = s.querySelectorAll('.bonsai-chat-turn-slot'); " +
  "var last = slots.length ? slots[slots.length - 1] : null; " +
  "var bubble = last ? last.querySelector('.bonsai-chat-ai-bubble') : null; " +
  "var header = last ? last.querySelector('.bonsai-chat-turn-row-header') : null; " +
  "var streaming = Boolean((bubble && bubble.classList.contains('bonsai-chat-ai-bubble--stream-preview')) || " +
  "(header && header.classList.contains('bonsai-chat-turn-row-header--streaming'))); " +
  "return {slots: slots.length, bubble: Boolean(bubble), streaming: streaming, " +
  "textLen: bubble ? (bubble.textContent || '').length : 0, " +
  "actions: Boolean(last && last.querySelector('.bonsai-chat-reply-actions'))}; })()";

// ---------------------------------------------------------------------------
// The rows file
// ---------------------------------------------------------------------------

/** The rows file or the command line is wrong. The message is a plain sentence. */
export class RowsFileError extends Error {
  constructor(message) {
    super(message);
    this.name = "RowsFileError";
  }
}

/** The canonical key for an `expect.line` value ("No notes for this game", "noNotesForGameLine", ...), or null. */
export function normalizeLine(value) {
  const squashed = String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/line$/, "");
  return Object.hasOwn(LINE_KEYS, squashed) ? LINE_KEYS[squashed] : null;
}

function checkExpect(id, expect) {
  if (expect === undefined) return null;
  if (expect === null || typeof expect !== "object" || Array.isArray(expect)) {
    throw new RowsFileError(`row "${id}": expect must be an object`);
  }
  for (const key of Object.keys(expect)) {
    if (!EXPECT_KEYS.includes(key)) {
      throw new RowsFileError(`row "${id}": expect has "${key}", which is not one of ${EXPECT_KEYS.join(", ")}`);
    }
  }
  for (const key of ["notesInclude", "notesExclude"]) {
    const list = expect[key];
    if (list !== undefined && (!Array.isArray(list) || !list.every((x) => typeof x === "string" || Number.isInteger(x)))) {
      throw new RowsFileError(`row "${id}": expect.${key} must be a list of note names or numbers`);
    }
  }
  if (expect.line !== undefined && normalizeLine(expect.line) === null) {
    throw new RowsFileError(`row "${id}": expect.line "${expect.line}" is not one of: ${LINE_NAMES.join(", ")}`);
  }
  if (expect.covers !== undefined) {
    const covers = expect.covers;
    if (covers === null || typeof covers !== "object" || Array.isArray(covers)) {
      throw new RowsFileError(`row "${id}": expect.covers must be an object with shut and/or open`);
    }
    for (const [key, n] of Object.entries(covers)) {
      if (!["shut", "open"].includes(key)) throw new RowsFileError(`row "${id}": expect.covers has "${key}", which is not shut or open`);
      if (!Number.isInteger(n) || n < 0) throw new RowsFileError(`row "${id}": expect.covers.${key} must be a whole number`);
    }
  }
  return expect;
}

/** Parses the rows file's text into rows with every default filled, or throws a RowsFileError. */
export function parseRowsFile(text, { defaultChat = null } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new RowsFileError(`the rows file is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(parsed)) throw new RowsFileError("the rows file must hold a list of rows");
  if (parsed.length === 0) throw new RowsFileError("the rows file has no rows");
  const seen = new Set();
  return parsed.map((raw, i) => {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new RowsFileError(`row ${i + 1} is not an object`);
    if (typeof raw.row !== "string" || !raw.row.trim()) throw new RowsFileError(`row ${i + 1} has no "row" name`);
    const id = raw.row;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(id)) {
      throw new RowsFileError(`row "${id}" is not a plain name: use letters, digits, dot, dash and underscore only`);
    }
    if (seen.has(id)) throw new RowsFileError(`the row name "${id}" appears twice`);
    seen.add(id);
    for (const key of Object.keys(raw)) {
      if (!ROW_KEYS.includes(key)) throw new RowsFileError(`row "${id}" has a field this script does not know: "${key}"`);
    }
    if (typeof raw.question !== "string" || !raw.question.trim()) throw new RowsFileError(`row "${id}" has no "question"`);
    if (/[\r\n]/.test(raw.question)) throw new RowsFileError(`row "${id}": the question must be one line`);
    if (raw.question.length > 500) throw new RowsFileError(`row "${id}": the question is longer than 500 characters`);
    const wait = raw.waitSeconds ?? DEFAULT_WAIT_SECONDS;
    if (!Number.isInteger(wait) || wait < 10 || wait > 900) {
      throw new RowsFileError(`row "${id}": waitSeconds must be a whole number from 10 to 900`);
    }
    const chat = raw.chat ?? defaultChat;
    if (typeof chat !== "string" || !chat.trim()) {
      throw new RowsFileError(
        `row "${id}" names no chat, and the command gave no --chat: a question is only ever asked in a test chat, so name it`,
      );
    }
    if (raw.mode !== undefined && (typeof raw.mode !== "string" || !raw.mode.trim())) {
      throw new RowsFileError(`row "${id}": mode must be a word such as Strategy`);
    }
    return { row: id, question: raw.question, chat: chat.trim(), mode: raw.mode ?? null, waitSeconds: wait, expect: checkExpect(id, raw.expect) };
  });
}

// ---------------------------------------------------------------------------
// Comparing, and reading what the Deck says
// ---------------------------------------------------------------------------

const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const hasNote = (attached, want) =>
  (attached ?? []).some((n) => (typeof want === "number" ? (n.numbers ?? []).includes(want) : sameName(n.name, want)));

/** Compares an `expect` object with what was seen. Returns { verdict, problems }; no expect means UNCLEAR. */
export function compareExpect(expect, seen) {
  if (!expect) return { verdict: "UNCLEAR: nothing to compare; the driver judges what was seen", problems: [] };
  const problems = [];
  let compared = 0;
  for (const want of expect.notesInclude ?? []) {
    compared += 1;
    if (!hasNote(seen.attached, want)) problems.push(`notesInclude: ${JSON.stringify(want)} was not among the attached notes`);
  }
  for (const want of expect.notesExclude ?? []) {
    compared += 1;
    if (hasNote(seen.attached, want)) problems.push(`notesExclude: ${JSON.stringify(want)} was attached`);
  }
  if (expect.line !== undefined) {
    compared += 1;
    if (normalizeLine(expect.line) !== normalizeLine(seen.line)) problems.push(`line: expected "${expect.line}", saw "${seen.line}"`);
  }
  for (const key of ["shut", "open"]) {
    if (expect.covers?.[key] === undefined) continue;
    compared += 1;
    if (seen.covers?.[key] !== expect.covers[key]) problems.push(`covers: expected ${expect.covers[key]} ${key}, saw ${seen.covers?.[key]}`);
  }
  if (problems.length) return { verdict: `FAIL: ${problems.join("; ")}`, problems };
  return { verdict: `PASS: all ${compared} expected fields matched`, problems };
}

/** Reads the status command's output: free memory, whether a game runs, the Deck's time and the build. */
export function parseStatusReport(text) {
  const mem = /^Mem:\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/m.exec(text);
  const section = (name, next) => {
    const a = text.indexOf(`@@${name}`);
    if (a < 0) return "";
    const b = next ? text.indexOf(`@@${next}`, a) : -1;
    return text.slice(a + name.length + 2, b < 0 ? undefined : b).trim();
  };
  return {
    availableMb: mem ? Number(mem[1]) : null,
    gameRunning: /\d/.test(section("GAME", "DATE")),
    time: section("DATE", "BUILD") || null,
    build: section("BUILD") || null,
  };
}

/** The note names an attach line lists (the read-back's own pattern), for a read-back that lacks the numbered list. */
function namesInAttachLine(line) {
  const m = /notes? attached \((.*?)\); they are the/.exec(line ?? "");
  return m ? m[1].split("; ").map((n) => n.trim()).filter(Boolean) : [];
}

function lineShown(rb) {
  if (rb.noCloseMatchLine) return "No close match";
  if (rb.notInMyNotesLine) return "Not in my notes";
  if (rb.noNotesForGameLine) return "No notes for this game";
  return "none";
}

/** The one short line printed for a row. */
export function formatRowLine(result) {
  const { row, verdict, seen } = result;
  if (!seen) return `${row}  ${verdict}`;
  const secs = `${Math.round(seen.seconds)}s`;
  let notes;
  if (seen.logLine === null) {
    notes = "notes ? (no log line)";
  } else {
    const parts = (seen.attached ?? []).map((n) => `${n.name}#${n.numbers && n.numbers.length ? n.numbers.join("|") : "?"}`);
    const count = parts.length;
    notes = `${count} note${count === 1 ? "" : "s"}${count ? `: ${parts.join(", ")}` : ""}`;
  }
  const word = verdict.startsWith("COULD NOT RUN") ? verdict : verdict.split(":")[0];
  return [
    row,
    secs,
    notes,
    `line: ${seen.line}`,
    `covers: ${seen.covers?.shut ?? 0} shut, ${seen.covers?.open ?? 0} open`,
    `ring: ${seen.ring ? `"${seen.ring}"` : "none"}`,
    `page focus ${seen.pageFocus ? "yes" : "no"}`,
    word,
  ].join("  ");
}

// ---------------------------------------------------------------------------
// SSH and the evidence file
// ---------------------------------------------------------------------------

/** The argument list for ssh: the address, then one command, nothing between. Refuses anything else. */
export function buildSshArgs(host, remoteCommand) {
  if (!HOST_RE.test(host)) throw new RowsFileError(`the Deck's address must look like deck@192.168.86.52, not ${JSON.stringify(host)}`);
  if (typeof remoteCommand !== "string" || !remoteCommand) throw new Error("ssh needs a command to run");
  return [host, remoteCommand];
}

/** Runs one fixed command on the Deck. Never uses a shell on this PC. Resolves { code, stdout, stderr }. */
export function sshRun(host, remoteCommand, { input = null, timeoutMs = 90000 } = {}) {
  const args = buildSshArgs(host, remoteCommand);
  return new Promise((resolve) => {
    const child = spawn("ssh", args, { stdio: [input === null ? "ignore" : "pipe", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    let done = false;
    const finish = (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    };
    const timer = setTimeout(() => {
      stderr += "timed out";
      child.kill();
      finish(null);
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      stderr += err.message;
      finish(null);
    });
    child.on("close", (code) => finish(code));
    if (input !== null) child.stdin.end(input);
  });
}

const evidenceName = (plan, rowId, attempt) => `plan${plan}-${rowId}${attempt === 1 ? "" : `-try${attempt}`}.json`;

/** The evidence file name a write would use now: the first of plan<NN>-<row>, -try2, -try3 ... that is free. */
export function evidenceTarget(dir, plan, rowId) {
  for (let attempt = 1; attempt < 100; attempt++) {
    const file = path.join(dir, evidenceName(plan, rowId, attempt));
    if (!fs.existsSync(file)) return file;
  }
  throw new Error(`more than 99 evidence files already exist for ${rowId}`);
}

/** Writes the evidence file under a name nothing uses yet; a taken name is skipped, never overwritten. */
export function writeEvidenceFile(dir, plan, rowId, object, { firstChoice = null } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const body = JSON.stringify(object, null, 2) + "\n";
  const choices = [];
  if (firstChoice) choices.push(firstChoice);
  for (let attempt = 1; attempt < 100; attempt++) choices.push(path.join(dir, evidenceName(plan, rowId, attempt)));
  for (const file of choices) {
    try {
      fs.writeFileSync(file, body, { flag: "wx" });
      return file;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
  }
  throw new Error(`more than 99 evidence files already exist for ${rowId}`);
}

// ---------------------------------------------------------------------------
// The tools
// ---------------------------------------------------------------------------

function fatalReason(text, data) {
  if (/\bSTOPPED\b/.test(text) || data?.stopped === true) return "the stop switch is on";
  if (/being driven by another session|no longer hold the lease/.test(text)) return "another session took the Deck";
  return null;
}

/** Calls one Deck tool; never throws. Returns { isError, text, data, fatal }. */
async function callTool(deps, machine, name, args, timeoutMs) {
  try {
    const raw = await deps.client.callTool(name, machine ? { ...args, machine } : args, timeoutMs);
    const text = raw?.content?.find((b) => b?.type === "text")?.text ?? "";
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { isError: Boolean(raw?.isError), text, data, fatal: fatalReason(text, data) };
  } catch (err) {
    return { isError: true, text: String(err.message ?? err), data: null, fatal: "the Deck tools stopped answering" };
  }
}

async function readbackOnce(deps, host) {
  const out = await deps.ssh(READBACK_CMD, { input: deps.readbackSource });
  if (out.code === null || out.code === 255) return { fatal: `the Deck did not answer over SSH (${(out.stderr || "").slice(0, 100)})` };
  try {
    return { rb: JSON.parse(out.stdout) };
  } catch {
    return { problem: `the read-back printed nothing readable (${(out.stderr || out.stdout || "").slice(0, 100)})` };
  }
}

// ---------------------------------------------------------------------------
// One row, and the list
// ---------------------------------------------------------------------------

const stopText = (reason) => `COULD NOT RUN: ${reason}`;

async function runOneRow(row, ctx) {
  const { deps, machine, host } = ctx;
  const base = { row: row.row, seen: null, timedOut: false, pressed: [], side_effect: "none", setup: { question: row.question, chat: row.chat, waitSeconds: row.waitSeconds }, screen: null, expected: row.expect ?? null };
  const stop = (verdict, fatal = null, extra = {}) => ({ ...base, ...extra, verdict: stopText(verdict), fatal });

  // 1. Memory, game, time, build.
  const st = await deps.ssh(STATUS_CMD);
  if (st.code === null || st.code === 255) {
    const why = `the Deck did not answer over SSH (${(st.stderr || "").slice(0, 100)})`;
    return stop(why, why);
  }
  const status = parseStatusReport(st.stdout);
  ctx.build = status.build ?? ctx.build;
  base.time = status.time;
  base.build = ctx.build ?? null;
  base.setup = { ...base.setup, availableMb: status.availableMb, gameRunning: status.gameRunning };
  if (status.gameRunning && (status.availableMb === null || status.availableMb < MIN_FREE_MB_WITH_GAME)) {
    const reading = status.availableMb === null ? "memory could not be read" : `${status.availableMb} MB available`;
    return stop(`memory (game running, ${reading}, needs ${MIN_FREE_MB_WITH_GAME})`, null, { setup: base.setup, time: status.time, build: base.build });
  }
  const carry = { setup: base.setup, time: base.time, build: base.build };

  // 2. The panel, the open chat, the Ask mode.
  const page = await callTool(deps, machine, "deck_readPage", { expression: CONTEXT_EXPR, rowId: row.row }, 60000);
  if (page.fatal) return stop(page.fatal, page.fatal, carry);
  const context = page.data?.ok ? page.data.value : null;
  if (!context) return stop(`page: the panel could not be read (${page.text.slice(0, 100)})`, null, carry);
  base.screen = `${context.width}x${context.height}`;
  carry.screen = base.screen;
  carry.setup = { ...carry.setup, openChat: context.chat, mode: context.mode };
  if (!context.panel) return stop("panel: the bonsAI panel is not open", null, carry);
  if (!context.chat || !sameName(context.chat, row.chat)) {
    return stop(`chat: "${context.chat ?? "no name readable"}" is open, the row names "${row.chat}"; nothing was asked`, null, carry);
  }
  if (row.mode && (!context.mode || !context.mode.toLowerCase().includes(row.mode.toLowerCase()))) {
    return stop(`mode: the Ask mode shows "${context.mode ?? "nothing readable"}", the row names "${row.mode}"; nothing was asked`, null, carry);
  }

  // 3. The state before the question.
  const before = await readbackOnce(deps, host);
  if (before.fatal) return stop(before.fatal, before.fatal, carry);
  if (before.problem) return stop(`readback: ${before.problem}`, null, carry);
  if (before.rb.error) return stop(`panel: ${before.rb.error}`, null, carry);
  if (before.rb.streaming) return stop("an answer is still being written; nothing was asked", null, carry);
  const baselineTurns = before.rb.turns ?? 0;
  const baselineLine = before.rb.attachLine?.line ?? null;

  // 4. The ring on the question box: walk Down to the Ask button (a press places an unowned ring first), then one
  //    Up. The box has no name of its own to walk to, and this is the route measured on the Deck with or without a
  //    game up. deck_typeText refuses when the ring is not on a text field, so a wrong stop types nothing.
  const walk = await callTool(deps, machine, "deck_walkTo", { direction: "DOWN", text: ASK_BUTTON_LABEL, exact: true, budget: 4, rowId: row.row }, 120000);
  if (walk.fatal) return stop(walk.fatal, walk.fatal, carry);
  if (walk.isError || !walk.data?.ok || !walk.data?.found) {
    return stop(`ring: the Ask button was not reached (${(walk.data?.summary ?? walk.text).slice(0, 120)})`, null, carry);
  }
  const up = await callTool(deps, machine, "deck_pressButton", { buttons: ["UP"], verify: true, rowId: row.row }, 60000);
  if (up.fatal) return stop(up.fatal, up.fatal, carry);
  if (up.isError || !up.data?.ok) {
    return stop(`ring: Up from Ask did not move the ring (${(up.data?.summary ?? up.text).slice(0, 120)})`, null, carry);
  }
  const pressed = [`deck_walkTo DOWN to "${ASK_BUTTON_LABEL}" (${walk.data.presses ?? "?"} presses)`, "deck_pressButton UP once (Ask to the question box)"];

  // 5. Type and send. This is the only thing that changes the Deck's chat.
  const typed = await callTool(deps, machine, "deck_typeText", { text: row.question, clear: true, submit: true, rowId: row.row }, 120000);
  if (typed.fatal) return stop(typed.fatal, typed.fatal, { ...carry, pressed });
  if (typed.isError || !typed.data?.ok) {
    return stop(`the question was not sent (${(typed.data?.summary ?? typed.text).slice(0, 120)})`, null, {
      ...carry,
      pressed,
      side_effect: "text may be left in the question box (the question was not sent)",
    });
  }
  pressed.push("deck_typeText with clear and submit (an Enter key event; A was never pressed)");
  const sentAt = deps.now();
  const asked = { ...carry, pressed, side_effect: `asked one question in the chat "${context.chat}"; it is now part of that chat` };

  // 6. Wait until the answer is finished on screen: the reply's action row is drawn, or the reply is no longer
  //    streaming and its text has stopped growing between two reads. The log line is not waited for.
  const deadline = sentAt + row.waitSeconds * 1000;
  let previous = null;
  let failures = 0;
  let finished = false;
  for (;;) {
    const read = await callTool(deps, machine, "deck_readPage", { expression: PROGRESS_EXPR, rowId: row.row }, 60000);
    if (read.fatal) return stop(read.fatal, read.fatal, asked);
    const p = read.data?.ok ? read.data.value : null;
    if (!p) {
      failures += 1;
      if (failures >= MAX_PAGE_READ_FAILURES) return stop(`page: the answer could not be read ${failures} times in a row`, null, asked);
    } else {
      failures = 0;
      const drawn = p.slots > baselineTurns && p.bubble;
      const settled = drawn && !p.streaming && previous && previous.bubble && !previous.streaming && previous.textLen === p.textLen && previous.slots === p.slots;
      if (drawn && ((p.actions && !p.streaming) || settled)) {
        finished = true;
        break;
      }
      previous = p;
    }
    if (deps.now() >= deadline) break;
    await deps.sleep(POLL_MS);
  }
  const seconds = (deps.now() - sentAt) / 1000;

  // 7. Read back. The log line is optional: look a few seconds for it, then report it absent.
  let rbResult = await readbackOnce(deps, host);
  for (let tries = 0; finished && !rbResult.fatal && !rbResult.problem && (rbResult.rb.attachLine?.line ?? null) === baselineLine && tries < LOG_GRACE_READS; tries++) {
    await deps.sleep(POLL_MS);
    rbResult = await readbackOnce(deps, host);
  }
  if (rbResult.fatal) return stop(rbResult.fatal, rbResult.fatal, asked);
  if (rbResult.problem) return stop(`readback: ${rbResult.problem}`, null, asked);
  const rb = rbResult.rb;
  const newLine = rb.attachLine?.line ?? null;
  const logLine = newLine !== baselineLine ? newLine : null;
  const turn = (rb.turnList ?? [])[0];
  const attached = logLine === null ? [] : turn?.attached ?? namesInAttachLine(logLine).map((name) => ({ name, numbers: null }));
  const seen = {
    seconds,
    availableMb: status.availableMb,
    context,
    walk: { matched: walk.data.matched ?? null, presses: walk.data.presses ?? null },
    typed: { matched: typed.data.matched ?? null, summary: typed.data.summary ?? null },
    logLine,
    attachLine: logLine,
    attached,
    notesBlock: rb.notes ?? null,
    line: lineShown(rb),
    covers: rb.spoilers ?? { shut: 0, open: 0 },
    ring: rb.focus?.label ?? null,
    pageFocus: Boolean(rb.windowFocus),
    game: rb.game ?? null,
    readback: rb,
  };
  if (!finished) {
    return { ...base, ...asked, seen, timedOut: true, verdict: stopText(`timeout after ${row.waitSeconds} s waiting for the answer to finish on screen`) };
  }
  const { verdict } = compareExpect(row.expect, seen);
  return { ...base, ...asked, seen, verdict };
}

/** Builds the evidence file's content for a finished row (the field names the driver's rule 3 lists). */
function evidenceFor(res) {
  return {
    row: res.row,
    build_commit: res.build ?? null,
    deck_time_local: res.time ?? null,
    screen: res.screen ?? null,
    setup: res.setup,
    pressed: res.pressed,
    seen: res.seen,
    expected: res.expected,
    verdict: res.verdict,
    side_effect: res.side_effect,
  };
}

/**
 * Runs the rows in order. deps: { client, ssh, evidenceDir, now, sleep, readbackSource, say }.
 * Returns { results, stopped, exitCode }; never throws for a Deck-side problem.
 */
export async function runRows({ rows, plan, deps, machine = null, host = DEFAULT_HOST }) {
  const ctx = { deps, machine, host, build: null };
  const results = [];
  let stopped = null;
  let timeoutsInARow = 0;
  for (const row of rows) {
    let res;
    if (stopped) {
      res = { row: row.row, seen: null, timedOut: false, pressed: [], side_effect: "none", setup: { question: row.question }, expected: row.expect ?? null, verdict: stopText(`the list stopped (${stopped}); nothing was asked`) };
    } else {
      res = await runOneRow(row, ctx);
      timeoutsInARow = res.timedOut ? timeoutsInARow + 1 : 0;
      if (res.fatal) stopped = res.fatal;
      else if (timeoutsInARow >= 2) stopped = "two timeouts in a row";
    }
    writeEvidenceFile(deps.evidenceDir, plan, row.row, evidenceFor(res));
    deps.say(formatRowLine(res));
    results.push(res);
  }
  const couldNot = results.some((r) => r.verdict.startsWith("COULD NOT RUN"));
  return { results, stopped, exitCode: stopped || couldNot ? 1 : 0 };
}

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

const defaultIo = { out: (l) => console.log(l), err: (l) => console.error(l) };
let activeCleanup = null;

/** Called on Ctrl-C: releases this script's lease and ends its tool server. */
export async function abortRun() {
  if (activeCleanup) await activeCleanup();
}

function parseArgs(argv) {
  const opts = { rows: null, plan: null, chat: null, host: DEFAULT_HOST, machine: null, dryRun: false };
  const valued = { "--rows": "rows", "--plan": "plan", "--chat": "chat", "--host": "host", "--machine": "machine" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (Object.hasOwn(valued, arg)) {
      if (i + 1 >= argv.length) throw new RowsFileError(`${arg} needs a value`);
      opts[valued[arg]] = argv[++i];
    } else throw new RowsFileError(`unknown option ${arg}; use --rows FILE --plan NUMBER [--chat NAME] [--dry-run]`);
  }
  if (!opts.rows) throw new RowsFileError("--rows FILE is needed: a JSON list of rows");
  if (!/^\d{1,4}$/.test(opts.plan ?? "")) throw new RowsFileError("--plan NUMBER is needed, such as --plan 104");
  buildSshArgs(opts.host, "true");
  return opts;
}

function printDryRun(io, { rows, opts, evidenceDirPath, mcpConfig }) {
  io.out("Dry run: nothing is started, nothing is asked over SSH, no file is written. A real run would:");
  io.out(`  start the Deck tools: ${mcpConfig.command} ${mcpConfig.args.join(" ")}`);
  io.out("  look at the Deck's lease and the stop switch with deck_listMachines, and refuse to start if another session holds it");
  io.out(`  ask over SSH (${opts.host}), only these fixed commands:`);
  io.out(`    ${STATUS_CMD}`);
  io.out(`    ${READBACK_CMD}   (the read-back script's text is sent on standard input)`);
  io.out("  and for each row below, in order:");
  io.out(`    skip with COULD NOT RUN: memory when a game runs and under ${MIN_FREE_MB_WITH_GAME} MB is available`);
  io.out("    check the open chat's name (and the Ask mode, when the row names one); a mismatch skips the row");
  io.out(`    deck_walkTo DOWN to "${ASK_BUTTON_LABEL}", one deck_pressButton UP (to the question box), then deck_typeText with clear and submit`);
  io.out("    wait for the answer to finish on screen, read back, write the evidence file, print one line");
  io.out("  It never presses A, B, START or SELECT. It stops the list at two timeouts in a row.");
  io.out(`Rows (${rows.length}):`);
  for (const row of rows) {
    io.out(`  ${row.row}: ${JSON.stringify(row.question)}  chat "${row.chat}"${row.mode ? `  mode ${row.mode}` : ""}  wait ${row.waitSeconds} s`);
    io.out(`    expect: ${row.expect ? JSON.stringify(row.expect) : "nothing (the driver judges)"}`);
    io.out(`    evidence: ${path.join(evidenceDirPath, path.basename(evidenceTarget(evidenceDirPath, opts.plan, row.row)))}`);
  }
}

/** The whole command. Returns the exit code. */
export async function main(argv, { repoRoot = REPO_ROOT, env = process.env, deps = {}, io = defaultIo } = {}) {
  let opts;
  let rows;
  let evidenceDirPath;
  let mcpConfig;
  try {
    opts = parseArgs(argv);
    let text;
    try {
      text = fs.readFileSync(opts.rows, "utf8");
    } catch (err) {
      throw new RowsFileError(`cannot read the rows file ${opts.rows}: ${err.message}`);
    }
    rows = parseRowsFile(text, { defaultChat: opts.chat });
    evidenceDirPath = workshopEvidenceDir({ repoRoot, env });
    mcpConfig = readMcpServerConfig(path.join(repoRoot, ".mcp.json"), MCP_SERVER_NAME);
  } catch (err) {
    if (err instanceof RowsFileError || err instanceof WorkshopNotFoundError || /\.mcp\.json/.test(err.message)) {
      io.err(err.message);
      return 2;
    }
    throw err;
  }
  if (opts.dryRun) {
    printDryRun(io, { rows, opts, evidenceDirPath, mcpConfig });
    return 0;
  }

  const client =
    deps.client ?? new McpStdioClient({ command: mcpConfig.command, args: mcpConfig.args, env: mcpConfig.env, cwd: repoRoot, name: MCP_SERVER_NAME });
  const run = {
    client,
    ssh: deps.ssh ?? ((cmd, o) => sshRun(opts.host, cmd, o)),
    evidenceDir: evidenceDirPath,
    now: deps.now ?? Date.now,
    sleep: deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
    readbackSource: deps.readbackSource ?? fs.readFileSync(path.join(__dirname, "deck_kb_readback.py"), "utf8"),
    say: io.out,
  };
  let machineName = opts.machine;
  let holdsLease = false;
  const cleanup = async () => {
    activeCleanup = null;
    if (holdsLease) {
      holdsLease = false;
      const out = await callTool(run, null, "deck_releaseMachine", { machine: machineName }, 30000);
      io.out(`Lease: ${out.data?.note ?? out.text.slice(0, 120)}`);
    }
    await client.close?.().catch(() => {});
  };
  activeCleanup = cleanup;
  try {
    client.start?.();
    await client.initialize?.();
    const tools = new Set((await client.listTools?.())?.map((t) => t?.name));
    const missing = REQUIRED_TOOLS.find((t) => client.listTools && !tools.has(t));
    if (missing) {
      io.err(`the Deck tools server has no "${missing}" tool; nothing was done`);
      return 2;
    }
    const listed = await callTool(run, null, "deck_listMachines", {}, 30000);
    const machines = listed.data?.machines;
    if (!Array.isArray(machines)) {
      io.err(`could not read the Deck's lease with deck_listMachines (${listed.text.slice(0, 120)}); nothing was done`);
      return 2;
    }
    machineName = machineName ?? listed.data.default;
    const m = machines.find((x) => x.name === machineName);
    if (!m) {
      io.err(`the Deck tools know no machine named "${machineName}"; nothing was done`);
      return 2;
    }
    if (m.lease) {
      io.err(
        `Another session holds the Deck: ${m.lease.owner} (${m.lease.purpose}, until ${m.lease.expiresAt}). ` +
          "Only one driver at a time. Release your own lease first with deck_releaseMachine, or wait for the other session; nothing was done.",
      );
      return 2;
    }
    if (m.stopped || listed.data.allStopped) {
      io.err(`The stop switch is on for "${machineName}": a person must re-arm it; nothing was done.`);
      return 2;
    }
    holdsLease = true;
    const out = await runRows({ rows, plan: opts.plan, deps: run, machine: opts.machine, host: opts.host });
    if (out.stopped) io.out(`The list stopped early: ${out.stopped}.`);
    io.out(`${out.results.length} row${out.results.length === 1 ? "" : "s"} written under ${evidenceDirPath}`);
    return out.exitCode;
  } finally {
    await cleanup();
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.once(sig, () => abortRun().finally(() => process.exit(130)));
  }
  main(process.argv.slice(2)).then(
    (code) => process.exit(code ?? 0),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
