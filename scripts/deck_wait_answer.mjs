#!/usr/bin/env node
/**
 * Title: Wait for the next answer on the Deck, sending nothing
 * Purpose: Takes a rows file (a JSON list; each row has a name and may say how long to wait and what it expects),
 *          reads the state of the Deck's panel once, prints READY, then waits until an answer that the driver sends
 *          itself has finished: the plugin log's "notes for this answer" line is new and the answer is no longer
 *          being written (or, for an answer that logs no such line, a new turn is on screen and has stopped
 *          changing). It then reads the answer's state back (notes by number and name, which honesty line showed,
 *          the covers, the ring, the page's focus), writes one evidence file in the workshop's test-evidence folder
 *          and prints one short line, exactly as scripts/deck_ask_rows.mjs does for a row.
 * Used for: D-pad Deck check rows where the driver walks to the question box and sends the question with the real
 *          presses (plan 105, lane T2). The driver starts it in the background first and waits for READY:
 *              node scripts/deck_wait_answer.mjs --rows <rows.json> --plan 105
 *          then presses, and reads the one line it prints. `--dry-run` shows the commands without sending any.
 * Solves: Waiting for an answer by its text once came back 15 seconds early; the log line is written when the answer
 *          is done. scripts/deck_ask_rows.mjs can only wait for a question it typed and sent itself, and it refuses
 *          a row without a question.
 * Does not: Press anything, type anything, start the Deck tools, take or release the Deck's lease (the driver holds
 *          it and a second holder would be refused), switch chats, or change a setting. It cannot check which chat is
 *          open or the Ask mode (a row naming a chat or a mode is refused). It reads over SSH only, with the same two
 *          fixed commands scripts/deck_ask_rows.mjs sends for a status and a read-back. The seconds it prints count
 *          from READY, not from the send. It stops the list at two timeouts in a row.
 *
 * How it reaches the Deck: `ssh deck@192.168.86.52 '<fixed command>'`, the address then one command, nothing between
 * (the shared sshRun in scripts/deck_ask_rows.mjs). The read-back script's text goes on standard input.
 *
 * Exit code: 0 when every row ran (a FAIL or UNCLEAR is a result, not a problem); 1 when a row could not run or the
 * list stopped early; 2 when it refused to start (bad rows file or arguments).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_HOST,
  LOG_GRACE_READS,
  MAX_PAGE_READ_FAILURES,
  POLL_MS,
  READBACK_CMD,
  STATUS_CMD,
  RowsFileError,
  buildSshArgs,
  compareExpect,
  evidenceTarget,
  formatRowLine,
  lineShown,
  namesInAttachLine,
  parseRowsFile,
  parseStatusReport,
  readbackOnce,
  runRows,
  sshRun,
  stopText,
} from "./deck_ask_rows.mjs";
import { evidenceDir as workshopEvidenceDir, WorkshopNotFoundError } from "./lib/workshop.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const STABLE_READS = 2; // reads in a row that must agree before a screen-only finish counts

const NO_SIDE_EFFECT = "none (this script sent nothing; it waited for an answer the driver sent)";

/** What the panel shows now, from one read-back: how many turns, the newest question's header, the log line. */
export function panelState(rb) {
  return { turns: rb.turns ?? 0, question: (rb.turnList ?? [])[0]?.question ?? "", logLine: rb.attachLine?.line ?? null };
}

/** Is this read the end of a new answer? "log": the log line is new and no answer is being written. "screen": a new finished turn. */
export function finishedBy(rb, baseline) {
  const now = panelState(rb);
  if (rb.error || !rb.answerShown || rb.streaming) return null;
  if (now.logLine !== baseline.logLine) return "log";
  const newTurn = now.turns !== baseline.turns || now.question !== baseline.question;
  return newTurn && rb.finished ? "screen" : null;
}

async function runWaitRow(row, ctx) {
  const { deps, host } = ctx;
  const base = {
    row: row.row, seen: null, timedOut: false, pressed: [], side_effect: NO_SIDE_EFFECT, screen: null, expected: row.expect ?? null,
    setup: { question: null, waitOnly: true, waitSeconds: row.waitSeconds },
  };
  const stop = (verdict, fatal = null, extra = {}) => ({ ...base, ...extra, verdict: stopText(verdict), fatal });
  const noAnswer = (out) => `the Deck did not answer over SSH (${(out.stderr || "").slice(0, 100)})`;

  const st = await deps.ssh(STATUS_CMD);
  if (st.code === null || st.code === 255) return stop(noAnswer(st), noAnswer(st));
  const status = parseStatusReport(st.stdout);
  ctx.build = status.build ?? ctx.build;
  const carry = { time: status.time, build: ctx.build ?? null, setup: { ...base.setup, availableMb: status.availableMb, gameRunning: status.gameRunning } };

  const before = await readbackOnce(deps, host);
  if (before.fatal) return stop(before.fatal, before.fatal, carry);
  if (before.problem) return stop(`readback: ${before.problem}`, null, carry);
  if (before.rb.error) return stop(`panel: ${before.rb.error}`, null, carry);
  if (before.rb.streaming) return stop("an answer is still being written; wait until it ends, then run this again", null, carry);
  const baseline = panelState(before.rb);
  carry.setup = { ...carry.setup, baseline };

  deps.say(`${row.row}  READY  waiting up to ${row.waitSeconds} s for the next answer; send the question now`);
  const startedAt = deps.now();
  const deadline = startedAt + row.waitSeconds * 1000;
  let rb = null;
  let how = null;
  let agreeing = 0;
  let failures = 0;
  while (deps.now() < deadline && !how) {
    await deps.sleep(POLL_MS);
    const read = await readbackOnce(deps, host);
    if (read.fatal) return stop(read.fatal, read.fatal, carry);
    if (read.problem || read.rb.error) {
      failures += 1;
      if (failures >= MAX_PAGE_READ_FAILURES) return stop(`readback: could not read the panel ${failures} times in a row`, null, carry);
      continue;
    }
    failures = 0;
    rb = read.rb;
    const kind = finishedBy(rb, baseline);
    agreeing = kind === "screen" ? agreeing + 1 : 0;
    how = kind === "log" || agreeing >= STABLE_READS ? kind : null;
  }
  const seconds = (deps.now() - startedAt) / 1000;
  if (!how) {
    const last = rb ? panelState(rb) : null;
    const seen = {
      seconds, logLine: null, attachLine: null, attached: [], line: rb ? lineShown(rb) : "none", covers: rb?.spoilers ?? { shut: 0, open: 0 },
      ring: rb?.focus?.label ?? null, pageFocus: Boolean(rb?.windowFocus), progress: { baseline, last }, waitOnly: true, readback: rb,
    };
    return { ...base, ...carry, seen, timedOut: true, verdict: stopText(`timeout after ${row.waitSeconds} s waiting for the next answer to finish`) };
  }

  // A screen-only finish: look a few seconds for the log line, then report it absent. Then read once more, so the
  // notes line and covers are as drawn after the answer settled.
  let final = rb;
  for (let tries = 0; how === "screen" && panelState(final).logLine === baseline.logLine && tries < LOG_GRACE_READS; tries++) {
    await deps.sleep(POLL_MS);
    const again = await readbackOnce(deps, host);
    if (again.rb && !again.rb.error) final = again.rb;
  }
  const last = await readbackOnce(deps, host);
  if (last.rb && !last.rb.error) final = last.rb;
  const logLine = panelState(final).logLine !== baseline.logLine ? panelState(final).logLine : null;
  const turn = (final.turnList ?? [])[0];
  const attached = logLine === null ? [] : turn?.attached ?? namesInAttachLine(logLine).map((name) => ({ name, numbers: null }));
  const seen = {
    seconds, availableMb: status.availableMb, finishedBy: how, logLine, attachLine: logLine, attached, notesBlock: final.notes ?? null,
    line: lineShown(final), covers: final.spoilers ?? { shut: 0, open: 0 }, ring: final.focus?.label ?? null,
    pageFocus: Boolean(final.windowFocus), game: final.game ?? null, progress: { baseline, last: panelState(final) }, waitOnly: true, readback: final,
  };
  return { ...base, ...carry, seen, verdict: compareExpect(row.expect, seen).verdict };
}

function parseArgs(argv) {
  const opts = { rows: null, plan: null, host: DEFAULT_HOST, dryRun: false };
  const valued = { "--rows": "rows", "--plan": "plan", "--host": "host" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") opts.dryRun = true;
    else if (Object.hasOwn(valued, argv[i])) {
      if (i + 1 >= argv.length) throw new RowsFileError(`${argv[i]} needs a value`);
      opts[valued[argv[i]]] = argv[++i];
    } else throw new RowsFileError(`unknown option ${argv[i]}; use --rows FILE --plan NUMBER [--dry-run]`);
  }
  if (!opts.rows) throw new RowsFileError("--rows FILE is needed: a JSON list of rows");
  if (!/^\d{1,4}$/.test(opts.plan ?? "")) throw new RowsFileError("--plan NUMBER is needed, such as --plan 105");
  buildSshArgs(opts.host, "true");
  return opts;
}

/** The rows file's text as rows with no question; a row that names a chat or a mode is refused (this script cannot check them). */
export function parseWaitRows(text) {
  const rows = parseRowsFile(text, { questionOptional: true });
  for (const row of rows) {
    if (row.question !== null) throw new RowsFileError(`row "${row.row}" has a question: this script sends nothing, so leave it out`);
    if (row.chat !== null || row.mode !== null) throw new RowsFileError(`row "${row.row}" names a chat or a mode, which this script cannot check: leave them out`);
  }
  return rows;
}

function printDryRun(io, { rows, opts, evidenceDirPath }) {
  io.out("Dry run: nothing is asked over SSH and no file is written. A real run would, for each row in order:");
  io.out(`  ask over SSH (${opts.host}), only these fixed commands:`);
  io.out(`    ${STATUS_CMD}`);
  io.out(`    ${READBACK_CMD}   (the read-back script's text is sent on standard input)`);
  io.out("  read once, print READY, then read every few seconds until a new answer has finished, write the evidence file and print one line.");
  io.out("  It sends no question, presses nothing, starts no Deck tools and takes no lease. It stops the list at two timeouts in a row.");
  io.out(`Rows (${rows.length}):`);
  for (const row of rows) {
    io.out(`  ${row.row}: wait up to ${row.waitSeconds} s  expect: ${row.expect ? JSON.stringify(row.expect) : "nothing (the driver judges)"}`);
    io.out(`    evidence: ${path.join(evidenceDirPath, path.basename(evidenceTarget(evidenceDirPath, opts.plan, row.row)))}`);
  }
}

const defaultIo = { out: (l) => console.log(l), err: (l) => console.error(l) };

/** The whole command. Returns the exit code. */
export async function main(argv, { repoRoot = REPO_ROOT, env = process.env, deps = {}, io = defaultIo } = {}) {
  let opts;
  let rows;
  let evidenceDirPath;
  try {
    opts = parseArgs(argv);
    let text;
    try {
      text = fs.readFileSync(opts.rows, "utf8");
    } catch (err) {
      throw new RowsFileError(`cannot read the rows file ${opts.rows}: ${err.message}`);
    }
    rows = parseWaitRows(text);
    evidenceDirPath = workshopEvidenceDir({ repoRoot, env });
  } catch (err) {
    if (err instanceof RowsFileError || err instanceof WorkshopNotFoundError) {
      io.err(err.message);
      return 2;
    }
    throw err;
  }
  if (opts.dryRun) {
    printDryRun(io, { rows, opts, evidenceDirPath });
    return 0;
  }
  const run = {
    ssh: deps.ssh ?? ((cmd, o) => sshRun(opts.host, cmd, o)),
    evidenceDir: evidenceDirPath,
    now: deps.now ?? Date.now,
    sleep: deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
    readbackSource: deps.readbackSource ?? fs.readFileSync(path.join(__dirname, "deck_kb_readback.py"), "utf8"),
    say: io.out,
  };
  const out = await runRows({ rows, plan: opts.plan, deps: run, host: opts.host, runRow: runWaitRow });
  if (out.stopped) io.out(`The list stopped early: ${out.stopped}.`);
  io.out(`${out.results.length} row${out.results.length === 1 ? "" : "s"} written under ${evidenceDirPath}`);
  return out.exitCode;
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code ?? 0),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
