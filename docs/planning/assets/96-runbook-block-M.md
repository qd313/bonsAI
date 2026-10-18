# Plan 96, Deck block M: setup and the measurements the fixes are waiting for

For the deck-driver helper. Run on the build already on the Deck (no deploy in this block). Plan 96 is
`docs/planning/96-ship-ready-bug-session.md`; the evidence folder is the workshop's
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\`, files named `plan96-<ROW>.json`, never overwritten.
Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. The scratch folder is the session's:
`C:\Users\still\AppData\Local\Temp\claude\C--Users-still-Documents-BonsAI\7c506407-71f7-47d9-82c2-05daf9e183f4\scratchpad\`.
The handover note at the end goes to `docs/planning/assets/96-handover-M.md` in the repo
`C:\Users\still\Documents\BonsAI` (write the file; do not `git add` or commit it).

Stop at once and report if `deck_status` shows the lease `heldByOther: true`, the automation stopped, focus
moving without your press, or anything asking for a password. Another chat may still be using this Deck.

## Block 0: setup (row P96-M0-SETUP)

1. `deck_status`: armed, Deck reachable, lease not held by another. Record it.
2. `deck_holdAwake` with `ttlMinutes: 480`; record `expiresAt`.
3. Which screen is live: read the page's window size through `deck_readPage` (854 wide is the Deck's own
   screen; about 1920 is the monitor). Record it in every evidence file.
4. The build on the Deck: `ssh deck@192.168.86.52 'sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12; grep -m1 version ~/homebrew/plugins/bonsAI/plugin.json'`.
5. Settings backup, over SSH only (the rig's snapshot tool has a known damaged-copy bug):
   `ssh deck@192.168.86.52 'tar czf ~/p96-settings-backup.tgz -C ~/homebrew/settings bonsAI && ls -l ~/p96-settings-backup.tgz'`.
6. How the AI runs: read `ollama_local_on_deck`, `rag_corpus_version`, `use_local_rag` (or the knowledge-base switch's key,
   grep `rag` and `knowledge`), `preset_single_chip`, `ask_mode`, `ui_text_size` (or the text size key) and any key with
   `lock` in its name from `~/homebrew/settings/bonsAI/settings.json` with `grep`. Record the values; the parental lock
   must read off. `ssh deck@192.168.86.52 'curl -s 127.0.0.1:11434/api/tags | head -c 600; echo; curl -s 127.0.0.1:11434/api/ps | head -c 300'`.
7. Open the plugin (the first open after a reload may fail once). Read the chat name. If a chat named like
   "Which charm should a beginner get first in Hollow Knight" or "plan96 test chat" exists in the chats menu, use it;
   otherwise New chat (if New chat asks which to delete, stop and report: do not delete). Write the test chat's exact
   name in the handover.

## M1: Expert against Speed (row P96-F8-EXPERT)

Why: on 2026-10-17 one Expert answer was shorter than one Speed answer (454 against 751 characters) and answered half of
a two-part question. One sample proves nothing, and a repeated question comes back from the answer cache, so every
question below is worded differently. The AI is the one the Deck is set to (record which).

Ten questions, each in two parts about Hades. Send each with the question script (the flags INSIDE the quoted remote
command, no apostrophes), read back VERIFIED, walk to Ask, read focus, press A, wait for the answer to finish (the
chat file's answer entry appears; read it over SSH, do not judge from the screen).

Speed set (mode chip reads "Inference mode: Speed"):
1. In Hades, which weapon is best for a first clear and what should I spend my first keys on?
2. In Hades, how do boons from Athena help and which Mirror upgrades matter early?
3. In Hades, what does Darkness do and how should I use the Pact of Punishment?
4. In Hades, how do I beat Megaera and what should I buy from the Broker first?
5. In Hades, which duo boons are worth chasing and how do I get a Daedalus Hammer?

Then switch the mode chip to Expert (A on the chip, Down x2, read "expert", A; the chip reads "Inference mode: Expert").

Expert set:
1. In Hades, which weapon suits a new player and what are the first keys for?
2. In Hades, what do boons from Athena give you and which Mirror of Night talents come first?
3. In Hades, what is Darkness used for and how does the Pact of Punishment work?
4. In Hades, how is Megaera beaten and what is worth buying from the Broker early?
5. In Hades, which duo boons should I aim for and where do Daedalus Hammers come from?

For every answer record: mode, the question, answer length in characters (from the chat file), seconds from A to the
first word and to the finish (your reads), and `parts_answered` 0, 1 or 2 (does the text address the first part, the
second part; quote the sentence that answers each). Put the Speed and Expert medians in `seen`. Put the mode chip
back to Speed at the end.

Pass sentence (the plan's): Expert's median length is above Speed's, and two-part questions are answered in both
parts in both modes. Anything else is FAIL with the numbers.

## M3: the chip row and the Ask pill, measured (rows P96-F22-CHIP-MEASURE and P96-F25-ASK-PILL)

On Main, no game, the Deck's own screen if that is live (record which). Run this reading through the debugging port
the way `scripts/probe_deck_ui_look.py` does (copy its `ws_connect`/`evaluate` shape into a small script in the scratch
folder, or run the look-check script itself with a changed `LOOK_JS`). The expression:

```
JSON.stringify((() => {
  const scope = document.querySelector('.bonsai-scope'); const P = scope.getBoundingClientRect();
  const r = (el) => { const b = el.getBoundingClientRect(); return {x: Math.round(b.left - P.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height)}; };
  const cs = (el, ...k) => Object.fromEntries(k.map((p) => [p, getComputedStyle(el)[p]]));
  const chips = [...scope.querySelectorAll('.bonsai-preset-chip-label, [class*="preset-chip"] button, button[class*="preset"]')].slice(0, 6).map((b) => {
    const t = b.querySelector('span') || b;
    return {text: (b.textContent || '').trim().slice(0, 60), box: r(b), textBox: r(t), textScrollWidth: t.scrollWidth, textClientWidth: t.clientWidth,
            font: cs(t, 'fontSize', 'lineHeight', 'fontWeight'), pad: cs(b, 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'), minHeight: getComputedStyle(b).minHeight};
  });
  const ask = scope.querySelector('.bonsai-ask-pill');
  const askInfo = ask ? {box: r(ask), clientWidth: ask.clientWidth, scrollWidth: ask.scrollWidth,
    style: cs(ask, 'paddingLeft', 'paddingRight', 'fontSize', 'letterSpacing', 'fontVariant', 'minWidth', 'width', 'flexShrink', 'gap'),
    children: [...ask.children].map((c) => ({tag: c.tagName, cls: c.className + '', box: r(c), scrollWidth: c.scrollWidth}))} : null;
  const right = scope.querySelector('.bonsai-unified-input-actions-right'); const row = scope.querySelector('.bonsai-unified-input-bottom-actions');
  return {panel: Math.round(P.width), screen: innerWidth + 'x' + innerHeight, chips, ask: askInfo,
          actionsRight: right ? {box: r(right), kids: [...right.children].map((c) => ({cls: (c.className + '').slice(0, 60), box: r(c)}))} : null,
          actionsRow: row ? r(row) : null};
})())
```

Take the reading three times about 4 s apart (the chip words change), on the two-chip row as the Deck is set, then set
"Show one chip instead of two" ON (Settings → Suggestion chips), take it three times more, and put the setting back
(read the settings file before and after). Record every number; take one screenshot per state. Then run the look
check on every tab (Main, Ollama and Settings with every section open, Permissions, Search, About, and Developer if it
is on) with `ssh deck@192.168.86.52 'python3 - --json' < C:\Users\still\Documents\BonsAI\scripts\probe_deck_ui_look.py`,
one evidence file per tab named `plan96-QA-LOOK-<tab>.json`, and one screenshot per tab beside it.

These two rows are measurements: the verdict is "MEASURED" with the numbers; there is no pass or fail.

## M4: the stopped answer with no notes card (rows P96-R2-STOP-NOCARD-1 and -2)

Why: a three-star bug says Down after a stopped answer loops between the question, the answer and Retry; plan 94
could not reproduce it with a notes card under the answer. This tries it without one.

1. Ollama tab → Knowledge base: read the "Use local knowledge base" switch; if on, switch it OFF (A on it, read it).
2. Main, the test chat, mode Speed. Send a long question: "Explain every weapon in Hades one by one and what each aspect
   changes" (try 1); "Walk me through each of the six Hades weapons and the aspects you unlock for them" (try 2).
   A on Ask. As soon as the first words show (your read), walk to "Stop generation" (read focus) and press A.
3. Read the screen: the stopped answer's text, whether a notes card, a Show details line, Helpful or Not really are under
   it (list exactly which controls are drawn under the answer). Then Up until the ring is on the answer text, and press
   Down up to eight times, reading focus after each press and recording the stop's name and box. A LOOP is any stop
   visited twice before the question box is reached.
4. Put the knowledge base switch back to what it was (read it).

Pass sentence: Down from the stopped answer reaches the question box within a handful of presses with no stop twice.
A loop is a FAIL with the exact chain. Twice, with the two questions above.

## Handover (write `docs/planning/assets/96-handover-M.md`)

The build on the Deck, the live screen, when the keep-awake runs out, the settings backup path, the test chat's exact
name, every setting you changed and whether it is back, which AI answered (Deck or PC), every evidence file written,
and anything odd about the Deck tonight.
