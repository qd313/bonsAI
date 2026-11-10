// Tests for scripts/deck_kb_readback.py (plan 103, lane T4). The read-back's page script (READBACK_JS) runs
// inside the Deck's panel; these tests run that same script text against a small pretend panel in jsdom,
// built the way the real answer, notes block and spoiler covers are built.
// Run with:  node --test scripts/deck_kb_readback.test.mjs
// The script is read out of the Python file, so the test runs the real text the Deck runs. A second group of
// tests pins every class name the script looks for against the file in src/ that draws it, so a rename on
// either side breaks a test here and not a Deck night.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const pySource = fs.readFileSync(path.join(HERE, "deck_kb_readback.py"), "utf8");
const READBACK_JS = /READBACK_JS = r"""([\s\S]*?)"""/.exec(pySource)[1];

// Runs the read-back's page script over the given markup and returns what it reports.
function readBack(markup, { windowFocus = true, focusSelector = null } = {}) {
  const { window } = new JSDOM(`<!doctype html><body>${markup}</body>`);
  const { document } = window;
  document.hasFocus = () => windowFocus;
  if (focusSelector) document.querySelector(focusSelector).focus();
  globalThis.document = document;
  return JSON.parse(eval(READBACK_JS));
}

const cover = `<div class="bonsai-spoiler-reveal-target">Spoiler — tap to show</div>`;
const openCover = `<div class="bonsai-spoiler-expanded"><div class="bonsai-spoiler-collapse-target">Hide</div>The reveal</div>`;

// The notes block as buildKbNotesBlockElement draws it: a header (name row, source row), then, when open, a body
// holding one div per note (with a bold "Name · source" line first when there is more than one note).
function notesBlock({ open, label, headName, extra = 0, titles = [], tagOn = "" }) {
  const tag = `<span class="bonsai-kb-note-demoted-tag">↓ ranked lower by you</span>`;
  const header =
    `<div><div><span><b>${headName}</b>${extra ? `<span>(+${extra} more)</span>` : ""}</span><span>▸</span></div>` +
    `<div>From bonsAI's own note</div></div>`;
  const body = open
    ? `<div>${titles
        .map(
          (t) =>
            `<div>${titles.length > 1 ? `<div>${t} · From bonsAI's own note${t === tagOn ? tag : ""}</div>` : ""}` +
            `<div>Summary: a line</div></div>`,
        )
        .join("")}</div>`
    : "";
  return (
    `<div class="bonsai-kb-notes-block-wrap"><div class="bonsai-kb-notes-block" aria-expanded="${open}" ` +
    `aria-label="${label}">${header}${body}</div></div>`
  );
}

function panel({ slots, extra = "" }) {
  return (
    `<div class="bonsai-scope"><div class="bonsai-tab-bar">Main Chats Settings</div>` +
    `<span class="bonsai-ask-strip-game"><span class="bonsai-ask-strip-game__name">Deep Rock Galactic: Survivor</span></span>` +
    `${slots.join("")}${extra}</div>`
  );
}

function slot({ bubbleClass = "", text = "An answer.", covers = "", notes = "", headerClass = "" }) {
  return (
    `<div class="bonsai-chat-turn-slot"><div class="bonsai-chat-turn-row-header ${headerClass}">The question</div>` +
    `<div class="bonsai-chat-ai-bubble bonsai-glass-panel ${bubbleClass}"><div>${text}${covers}</div></div>${notes}</div>`
  );
}

test("a finished answer with a shut notes block, two shut covers and one open cover", () => {
  const r = readBack(
    panel({
      slots: [
        slot({ covers: cover }),
        slot({
          text: "Do this.",
          covers: cover + cover + openCover,
          notes: notesBlock({
            open: false,
            label: "Dreadnought Twins (+1 more) · From bonsAI's own note, show",
            headName: "Dreadnought Twins",
            extra: 1,
          }),
        }),
      ],
    }),
  );
  assert.equal(r.turns, 2);
  assert.equal(r.finished, true);
  assert.equal(r.streaming, false);
  assert.deepEqual(r.spoilers, { shut: 2, open: 1 });
  assert.equal(r.notes.present, true);
  assert.equal(r.notes.open, false);
  assert.equal(r.notes.count, 2);
  assert.equal(r.notes.label, "Dreadnought Twins (+1 more) · From bonsAI's own note, show");
  assert.deepEqual(r.notes.names, []);
  assert.equal(r.game, "Deep Rock Galactic: Survivor");
  assert.equal(r.tab, "Main Chats Settings");
});

test("only the newest turn is read: the older turn's covers and notes do not count", () => {
  const r = readBack(
    panel({
      slots: [
        slot({ covers: cover + cover, notes: notesBlock({ open: false, label: "Old, show", headName: "Old" }) }),
        slot({ text: "Newest, plain." }),
      ],
    }),
  );
  assert.deepEqual(r.spoilers, { shut: 0, open: 0 });
  assert.equal(r.notes.present, false);
  assert.equal(r.notes.label, null);
});

test("an answer still being written is not finished", () => {
  const r = readBack(panel({ slots: [slot({ bubbleClass: "bonsai-chat-ai-bubble--stream-preview" })] }));
  assert.equal(r.streaming, true);
  assert.equal(r.finished, false);
  const h = readBack(panel({ slots: [slot({ headerClass: "bonsai-chat-turn-row-header--streaming" })] }));
  assert.equal(h.finished, false);
});

test("a turn with no answer yet (still thinking) is not finished", () => {
  const r = readBack(panel({ slots: [`<div class="bonsai-chat-turn-slot"><div class="bonsai-chat-turn-row-header">Q</div></div>`] }));
  assert.equal(r.answerShown, false);
  assert.equal(r.finished, false);
});

test("an open block with two notes lists their names, and the 'ranked lower' tag is not part of a name", () => {
  const r = readBack(
    panel({
      slots: [
        slot({
          notes: notesBlock({
            open: true,
            label: "Dreadnought Twins (+1 more) · From bonsAI's own note, hide",
            headName: "Dreadnought Twins",
            extra: 1,
            titles: ["Dreadnought Twins", "Exploder"],
            tagOn: "Exploder",
          }),
        }),
      ],
    }),
  );
  assert.equal(r.notes.open, true);
  assert.deepEqual(r.notes.names, ["Dreadnought Twins", "Exploder"]);
});

test("an open block with one note takes its name from the header, tag left out", () => {
  const r = readBack(
    panel({
      slots: [slot({ notes: notesBlock({ open: true, label: "Proton · From bonsAI's own note, hide", headName: "Proton", titles: ["Proton"] }) })],
    }),
  );
  assert.equal(r.notes.count, 1);
  assert.deepEqual(r.notes.names, ["Proton"]);
});

test("the two footer lines are told apart", () => {
  const close = readBack(panel({ slots: [slot({ text: "x —<em>No close match in my notes, this answer leans on the model's own knowledge.</em>" })] }));
  assert.equal(close.noCloseMatchLine, true);
  assert.equal(close.notInMyNotesLine, false);
  const none = readBack(panel({ slots: [slot({ text: "Not in my notes — this answer is from the model's own knowledge." })] }));
  assert.equal(none.noCloseMatchLine, false);
  assert.equal(none.notInMyNotesLine, true);
  const plain = readBack(panel({ slots: [slot({})] }));
  assert.equal(plain.noCloseMatchLine || plain.notInMyNotesLine, false);
});

test("the focused control is named, the ring wins over the page's own focus, and window focus is reported", () => {
  const markup = panel({
    slots: [slot({ notes: notesBlock({ open: false, label: "Name, show", headName: "Name" }) })],
    extra: `<button id="ask" aria-label="Ask">Ask</button>`,
  });
  const ringed = readBack(markup.replace('class="bonsai-kb-notes-block"', 'class="bonsai-kb-notes-block gpfocus"'), { windowFocus: false });
  assert.deepEqual(ringed.focus, { label: "Name, show", cls: "bonsai-kb-notes-block", via: "ring" });
  assert.equal(ringed.windowFocus, false);
  const active = readBack(markup, { focusSelector: "#ask" });
  assert.equal(active.focus.label, "Ask");
  assert.equal(active.focus.via, "activeElement");
  assert.equal(active.windowFocus, true);
  assert.equal(readBack(markup).focus, null);
});

test("no game tag and no panel are told plainly", () => {
  const noTag = readBack(`<div class="bonsai-scope"></div>`);
  assert.equal(noTag.game, null);
  assert.equal(noTag.turns, 0);
  assert.equal(noTag.finished, false);
  assert.equal(readBack(`<div></div>`).error, "bonsAI panel is not open");
});

// The class names the page script looks for, and the file in src/ that draws each. Both sides must still hold
// the word: a rename in src/ breaks the first check, a rename in the script breaks the second.
const PINS = [
  ["src/features/answer/transcript/MainTabChatTranscript.tsx", "bonsai-chat-turn-slot"],
  ["src/features/answer/transcript/buildTurnHeaderElement.tsx", "bonsai-chat-turn-row-header"],
  ["src/features/answer/transcript/buildTurnHeaderElement.tsx", "bonsai-chat-turn-row-header--streaming"],
  ["src/features/answer/bubble/buildAnswerBubbleElement.tsx", "bonsai-chat-ai-bubble"],
  ["src/features/answer/bubble/buildAnswerBubbleElement.tsx", "bonsai-chat-ai-bubble--stream-preview"],
  ["src/features/knowledge-library/buildKbNotesBlockElement.tsx", "bonsai-kb-notes-block"],
  ["src/features/knowledge-library/buildKbNotesBlockElement.tsx", "bonsai-kb-note-demoted-tag"],
  ["src/features/knowledge-library/buildKbNotesBlockElement.tsx", "aria-expanded"],
  ["src/features/knowledge-library/buildKbNotesBlockElement.tsx", "aria-label"],
  ["src/features/answer/markdown/MainTabBonsaiAiMarkdownChunk.tsx", "bonsai-spoiler-reveal-target"],
  ["src/features/answer/markdown/MainTabBonsaiAiMarkdownChunk.tsx", "bonsai-spoiler-collapse-target"],
  ["src/features/ask/bar/AskStripGameTag.tsx", "bonsai-ask-strip-game__name"],
  ["src/features/plugin-shell/BonsaiPluginShell.tsx", "bonsai-scope"],
  ["src/features/plugin-shell/TabIndicatorBar.tsx", "bonsai-tab-bar"],
  ["src/shared/dpad/uiDocument.ts", ".gpfocus"],
];

for (const [file, token] of PINS) {
  test(`pin: ${token} is drawn by ${path.basename(file)} and read by the script`, () => {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.ok(source.includes(token), `${file} no longer holds "${token}"`);
    assert.ok(READBACK_JS.includes(token), `the read-back script no longer looks for "${token}"`);
  });
}
