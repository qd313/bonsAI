#!/usr/bin/env node
/**
 * Static focus checks -- Track B of docs/planning/21-ai-owned-testing-program.md.
 *
 * Three rules, each one a bug class this repo has already shipped and fixed:
 *
 *   page-search           Rules 15-16. document.activeElement or a page query used
 *                         to move or verify focus. Steam's gamepad focus and the
 *                         browser's activeElement disagree, and a query finds
 *                         elements before they exist, or stale copies, or ones
 *                         Steam will not focus.
 *
 *   move-props-on-button  Rule 17. onMoveUp/onMoveDown on a Decky Button. These
 *                         are SteamUI Focusable props; Decky's Button does not
 *                         forward them, so the handler never runs. This is
 *                         ABOUT-LINKS-01 -- all four About links unreachable --
 *                         and half of REPLY-DOWN-01.
 *
 *   tabindex-removal      Rule 18. tabindex="-1" on an element that should stay
 *                         navigable removes it from Steam's nav graph. This is
 *                         the other half of REPLY-DOWN-01: focusRegisteredReplyStop
 *                         stamped -1 on the button and its row, so navigating onto
 *                         them deleted them from the graph.
 *
 *   ring-question         `uiActiveElement()` used to work out which control the
 *                         gamepad ring owns. This is MICRO-04's defect, and adding
 *                         the rule is what plan 21 § 3 Track B calls "catching the
 *                         class rather than the instance".
 *
 *                         WHY THE EXISTING page-search RULE MISSES IT. That rule
 *                         fires on the `.activeElement` property access. Once
 *                         uiDocument.ts wrapped that access, exactly one such
 *                         access was left in src/ -- inside uiDocument.ts itself,
 *                         where it is correct, and duly recorded in the baseline.
 *                         Every call site of the wrapper therefore scored zero.
 *                         answerStopRegistry.ts carried the bug and showed only a
 *                         tabindex finding. A check whose one true positive is
 *                         grandfathered reports green over a live bug.
 *
 *                         THE DISTINCTION THE RULE ENCODES. Reading focus right
 *                         after you called `.focus()` yourself is a landing check
 *                         and stays legal -- that is what `elementHasFocus` is for,
 *                         and focusSpoilerFence / focusDeckOwner / focusAnswerStop
 *                         all use it correctly. Reading focus to decide where the
 *                         ring already is, with no `.focus()` of your own in front
 *                         of it, is the trap: Steam moves `.gpfocus` without moving
 *                         `activeElement`, so the answer is confidently wrong
 *                         rather than null -- which is why the `??` fallback in
 *                         captureBubble did not save it.
 *
 * Parsing uses the TypeScript compiler API, not regex. Focus checks need JSX
 * boundaries and prop identity; a regex version produces false positives that get
 * blamed on the rule rather than the parser, and a rule nobody trusts gets removed.
 *
 * BASELINE. This repo has existing violations. Per plan 21, Track B "catches new
 * mistakes; it does not find existing ones" -- so the check compares against
 * scripts/focus-baseline.json and fails only on counts that went UP. Removing a
 * violation is reported as a win, with the one command needed to tighten the
 * ratchet.
 *
 *   node scripts/check-focus-patterns.mjs             check (exit 1 on new violations)
 *   node scripts/check-focus-patterns.mjs --update    rewrite the baseline
 *
 * Known limit, stated rather than hidden: the baseline counts violations per file
 * per rule. Deleting one violation and adding another in the same file nets to
 * zero and slips through. Line-level keys were the alternative and they break on
 * every unrelated edit above them, which is worse.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// FOCUS_PATTERNS_ROOT lets the checker's own test point it at a small fixture tree.
const ROOT = process.env.FOCUS_PATTERNS_ROOT
  ? path.resolve(process.env.FOCUS_PATTERNS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const BASELINE = path.join(ROOT, "scripts", "focus-baseline.json");

// ---------------------------------------------------------------- rules

const PAGE_SEARCH_CALLS = new Set([
  "querySelector",
  "querySelectorAll",
  "getElementById",
  "getElementsByClassName",
  "getElementsByTagName",
  "closest",
  "matches",
]);

/** Decky components that do NOT forward SteamUI move props. */
const NON_FORWARDING = new Set(["Button", "ButtonItem", "DialogButton"]);

const MOVE_PROP = /^onMove(Up|Down|Left|Right)$/;

/**
 * Accessors that answer "what does the DOM think has focus" and get mistaken for
 * "what does Steam's gamepad ring own". See the ring-question rule below.
 */
const RING_QUESTION_CALLS = new Set(["uiActiveElement"]);

/** The accessor's own home, where reading activeElement is the point. */
const RING_QUESTION_EXEMPT = new Set(["src/utils/uiDocument.ts"]);

/**
 * KeyboardEvent-shaped Up/Down predicates. These exist to interpret DOM keyboard
 * events — and a controller D-pad press dispatches none into the plugin (measured
 * on device 2026-08-27: capture-phase logger on `document`, real bridge press,
 * empty log). Any call is therefore D-pad routing on a channel Steam never uses:
 * the code runs under vitest, which dispatches real KeyboardEvents, and is dead
 * on hardware. That split is SPOILER-DPAD-01's recurrence engine — the
 * header→bubble edge and the fence diversion lived behind one such listener
 * through three shipped fixes. Route directions through Focusable
 * `onMoveUp`/`onMoveDown` instead.
 *
 * Left/Right are deliberately NOT flagged: a focused text input does receive real
 * key events, and the ask bar legitimately reads Left/Right there for the caret.
 */
const KEYDOWN_DPAD_CALLS = new Set(["isDownNavigationEvent", "isUpNavigationEvent"]);

/** The predicates' own home. */
const KEYDOWN_DPAD_EXEMPT = new Set(["src/utils/focusNavigation.ts"]);

const RULES = {
  "page-search": {
    title: "page search or activeElement used for focus",
    fix: "register the element when it is created and use that handle",
  },
  "move-props-on-button": {
    title: "move prop on a component that does not forward it",
    fix: "wrap it in a Focusable and put the move prop there",
  },
  "tabindex-removal": {
    title: "tabindex -1 removes the element from Steam's nav graph",
    fix: "leave tabindex alone, or restore it once focus has moved on",
  },
  "ring-question": {
    title: "uiActiveElement() asked which control the gamepad ring owns",
    fix: "use elementHasGamepadFocus / uiGamepadFocusElement, which read .gpfocus",
  },
  "keydown-dpad": {
    title: "D-pad routing via a KeyboardEvent predicate — the Deck dispatches no key events for the D-pad",
    fix: "wire the direction through Focusable onMoveUp/onMoveDown; keydown code is dead on device",
  },
};

// ---------------------------------------------------------------- walking

/**
 * Test files are excluded from all three rules, deliberately.
 *
 * These rules describe how the plugin behaves on the device. A test file never
 * runs on the Deck, and the focus tests legitimately call querySelector and read
 * activeElement because they build the fake DOM they are asserting against --
 * that is exactly what plan 21 § 2.1 describes them doing. Including them added
 * 27 findings that no one could ever act on, which is how a check gets ignored.
 */
const IS_TEST = /\.(test|spec)\.[jt]sx?$/;

function sourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !IS_TEST.test(entry.name)) out.push(full);
  }
  return out;
}

/** Forward slashes always: the baseline is written on Windows and read on Linux. */
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/");

const lineOf = (node, sf) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

function nameOf(node) {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name?.getText() ?? "";
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  return "";
}

// ---------------------------------------------------------------- checks

function checkFile(absPath) {
  const text = fs.readFileSync(absPath, "utf8");
  const relPath = rel(absPath);
  const sf = ts.createSourceFile(
    absPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    /\.(tsx|jsx)$/.test(absPath) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  /*
   * Inline escape hatch: `focus-patterns-allow: <reason>` on the line itself or
   * the line above.
   *
   * Added 2026-08-26 for a case the rules cannot express. Reading `.gpfocus` is
   * page search by the letter of rule R5, and it is also the ONLY way to observe
   * Steam's gamepad ring: the class is stamped on whichever element Steam
   * chooses, so "register the element when it is created" -- the rule's advice --
   * is impossible. The alternative was bumping the baseline, which buries the
   * justification in a JSON count where no reviewer will ever see it. A reason is
   * mandatory, so the hatch cannot be used as a silent mute.
   */
  const lines = text.split(/\r?\n/);
  const ALLOW = /focus-patterns-allow:\s*\S/;
  const allowedAt = (line) => {
    const self = lines[line - 1] ?? "";
    const above = lines[line - 2] ?? "";
    return ALLOW.test(self) || ALLOW.test(above);
  };

  const findings = [];
  const seen = new Set();
  const add = (rule, line, detail) => {
    const key = `${rule}:${line}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (allowedAt(line)) return;
    findings.push({ rule, file: relPath, line, detail });
  };

  // A whole file is focus logic when its path says so. Otherwise focus context is
  // entered by an onMove* handler or a function with "focus" in its name -- so an
  // unrelated querySelector elsewhere in the app is not this check's business.
  const fileIsFocusLogic = /focus|navigation/i.test(relPath);

  /** Move-handler keys written inside `expr`, following a bare name to its same-file object literal (one step). */
  const moveKeysIn = (expr, sourceFile) => {
    const found = [];
    const scan = (n, depth) => {
      if (
        (ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n) || ts.isMethodDeclaration(n)) &&
        n.name &&
        MOVE_PROP.test(n.name.getText(sourceFile))
      ) {
        found.push(n.name.getText(sourceFile));
      }
      if (ts.isIdentifier(n) && depth === 0) {
        const decl = namedObjects.get(n.text);
        if (decl) scan(decl, 1);
        return;
      }
      ts.forEachChild(n, (c) => scan(c, depth));
    };
    scan(expr, 0);
    return found;
  };
  /** Same-file `const name = { ... }` objects, for the spread check above. */
  const namedObjects = new Map();
  const collectNamed = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      let init = n.initializer;
      while (ts.isAsExpression(init) || ts.isParenthesizedExpression(init)) init = init.expression;
      if (ts.isObjectLiteralExpression(init)) namedObjects.set(n.name.text, init);
    }
    ts.forEachChild(n, collectNamed);
  };
  collectNamed(sf);

  const visit = (node, inFocus) => {
    let focus = inFocus;

    if (ts.isJsxAttribute(node) && MOVE_PROP.test(node.name.getText())) focus = true;
    if (/focus/i.test(nameOf(node))) focus = true;

    // --- move props on a non-forwarding component -------------------------
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      if (NON_FORWARDING.has(tag)) {
        for (const prop of node.attributes.properties) {
          if (ts.isJsxAttribute(prop) && MOVE_PROP.test(prop.name.getText())) {
            add(
              "move-props-on-button",
              lineOf(prop, sf),
              `${prop.name.getText()} on <${tag}>`,
            );
          }
          // A spread carries them too: {...({ onMoveDown: ... } as Record<string, unknown>)}, or a
          // same-file object the spread names. The named-attribute check above never saw these.
          if (ts.isJsxSpreadAttribute(prop)) {
            for (const name of moveKeysIn(prop.expression, sf)) {
              add("move-props-on-button", lineOf(prop, sf), `${name} spread on <${tag}>`);
            }
          }
        }
      }

      // --- tabIndex={-1} in JSX -------------------------------------------
      for (const prop of node.attributes.properties) {
        if (!ts.isJsxAttribute(prop)) continue;
        if (!/^tabIndex$/i.test(prop.name.getText())) continue;
        const init = prop.initializer;
        if (init && ts.isJsxExpression(init) && init.expression) {
          const v = init.expression.getText(sf).replace(/\s/g, "");
          if (v === "-1") add("tabindex-removal", lineOf(prop, sf), "tabIndex={-1}");
        }
      }
    }

    // --- setAttribute("tabindex", "-1") and el.tabIndex = -1 --------------
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      if (node.expression.name.text === "setAttribute" && node.arguments.length >= 2) {
        const [attr, value] = node.arguments;
        const attrName = ts.isStringLiteralLike(attr) ? attr.text.toLowerCase() : "";
        const attrValue = ts.isStringLiteralLike(value) ? value.text.trim() : "";
        if (attrName === "tabindex" && attrValue === "-1") {
          add("tabindex-removal", lineOf(node, sf), 'setAttribute("tabindex", "-1")');
        }
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      /^tabIndex$/i.test(node.left.name.text) &&
      node.right.getText(sf).replace(/\s/g, "") === "-1"
    ) {
      add("tabindex-removal", lineOf(node, sf), "tabIndex = -1");
    }

    // --- page search / activeElement, only inside focus logic -------------
    if (fileIsFocusLogic || focus) {
      if (ts.isPropertyAccessExpression(node) && node.name.text === "activeElement") {
        add("page-search", lineOf(node, sf), "document.activeElement");
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        PAGE_SEARCH_CALLS.has(node.expression.name.text)
      ) {
        add("page-search", lineOf(node, sf), `${node.expression.name.text}()`);
      }
    }

    /*
     * --- the ring question ------------------------------------------------
     *
     * NOT gated on focus context, unlike page-search above. `uiActiveElement()`
     * exists for exactly one purpose, so every call is a focus question by
     * construction and there is no "unrelated use elsewhere in the app" to spare.
     * Gating it would also miss the confirmed instances: none of
     * answerStopRegistry.ts, answerBubbleElRegistry.ts or chatPanelScroll.ts has
     * "focus" or "navigation" in its path.
     */
    if (
      !RING_QUESTION_EXEMPT.has(relPath) &&
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      RING_QUESTION_CALLS.has(node.expression.text)
    ) {
      add("ring-question", lineOf(node, sf), `${node.expression.text}()`);
    }

    /*
     * --- keydown D-pad routing --------------------------------------------
     *
     * Like ring-question, not gated on focus context: the Up/Down KeyboardEvent
     * predicates have exactly one purpose, so every call is direction routing by
     * construction. See KEYDOWN_DPAD_CALLS above for the measurement behind this.
     */
    if (
      !KEYDOWN_DPAD_EXEMPT.has(relPath) &&
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      KEYDOWN_DPAD_CALLS.has(node.expression.text)
    ) {
      add("keydown-dpad", lineOf(node, sf), `${node.expression.text}()`);
    }

    ts.forEachChild(node, (child) => visit(child, focus));
  };

  visit(sf, false);
  return findings;
}

// ---------------------------------------------------------------- baseline

function tally(findings) {
  const counts = {};
  for (const f of findings) {
    counts[f.file] ??= {};
    counts[f.file][f.rule] = (counts[f.file][f.rule] ?? 0) + 1;
  }
  return counts;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE)) return { counts: {} };
  try {
    return JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  } catch (err) {
    console.error(`focus-patterns: baseline is unreadable (${err.message}).`);
    console.error("Refusing to run: a broken baseline would silently pass everything.");
    process.exit(2);
  }
}

function writeBaseline(counts, reasons = {}) {
  const total = Object.values(counts)
    .flatMap((r) => Object.values(r))
    .reduce((a, b) => a + b, 0);
  const body = {
    note:
      "Known focus-pattern violations, per file per rule. The check fails only when a " +
      "count goes UP. Regenerate with: node scripts/check-focus-patterns.mjs --update",
    total,
    counts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : 1))),
  };
  // Why a case is kept: { file: { rule: "reason" } }, only for entries that still count.
  const kept = {};
  for (const [file, rules] of Object.entries(reasons)) {
    for (const [rule, why] of Object.entries(rules)) {
      if (counts[file]?.[rule]) (kept[file] ??= {})[rule] = why;
    }
  }
  if (Object.keys(kept).length > 0) body.reasons = Object.fromEntries(Object.entries(kept).sort(([a], [b]) => (a < b ? -1 : 1)));
  fs.writeFileSync(BASELINE, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  return total;
}

// ---------------------------------------------------------------- main

const files = sourceFiles(SRC);
const findings = files.flatMap(checkFile);
const counts = tally(findings);

if (process.argv.includes("--update")) {
  const total = writeBaseline(counts, readBaseline().reasons ?? {});
  console.log(`focus-patterns: baseline written -- ${total} known violations`);
  console.log(`  ${rel(BASELINE)}`);
  process.exit(0);
}

const baseline = readBaseline();
const known = baseline.counts ?? {};

const regressions = [];
const improvements = [];

for (const [file, rules] of Object.entries(counts)) {
  for (const [rule, n] of Object.entries(rules)) {
    const was = known[file]?.[rule] ?? 0;
    if (n > was) regressions.push({ file, rule, was, now: n });
  }
}
for (const [file, rules] of Object.entries(known)) {
  for (const [rule, was] of Object.entries(rules)) {
    const now = counts[file]?.[rule] ?? 0;
    if (now < was) improvements.push({ file, rule, was, now });
  }
}

const total = findings.length;
const baselineTotal = baseline.total ?? 0;

if (regressions.length === 0) {
  console.log(`focus-patterns: no new violations (${total} known, baseline ${baselineTotal})`);
  if (improvements.length > 0) {
    console.log("");
    console.log("Improved since the baseline was taken:");
    for (const i of improvements) {
      console.log(`  ${i.file}  ${i.rule}: ${i.was} -> ${i.now}`);
    }
    console.log("");
    console.log("Tighten the ratchet: node scripts/check-focus-patterns.mjs --update");
  }
  process.exit(0);
}

console.log(`focus-patterns: ${regressions.length} new violation(s)`);
console.log("");

for (const r of regressions) {
  const info = RULES[r.rule];
  const hits = findings
    .filter((f) => f.file === r.file && f.rule === r.rule)
    .slice(r.was)
    .map((f) => `${f.file}:${f.line}  ${f.detail}`);

  console.log(`  ${info.title}`);
  for (const h of hits) console.log(`    ${h}`);
  console.log(`    -> ${info.fix}`);
  console.log("");
}

console.log("If a violation is deliberate, say so in review and regenerate the baseline:");
console.log("  node scripts/check-focus-patterns.mjs --update");
process.exit(1);
