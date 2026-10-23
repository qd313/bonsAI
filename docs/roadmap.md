# bonsAI Roadmap

Open bugs, fixes waiting for a check on the Deck, planned features, and everything closed since v0.5.0. Each list is
sorted from one star to six.

- **Knowledge base and RAG:** [roadmap-kb.md](roadmap-kb.md), long notes in [roadmap-kb-details.md](roadmap-kb-details.md).
- **Parked work and watched sightings:** [roadmap-shelved.md](roadmap-shelved.md).
- **Long notes for the items below:** [roadmap-details.md](roadmap-details.md).
- **Closed since v0.5.0:** [Done for v0.6.0](#done-for-v060), full record in [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).
- **Full detail of finished work:** [shipped features](archive/roadmap-completed.md) · [fixed bugs](archive/roadmap-bugs-fixed.md)
- **Maintainer decisions:** [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md) · **QA rows:**
  [testing.md](testing.md), [testing-manual.md](testing-manual.md) · **Release notes:** [CHANGELOG.md](../CHANGELOG.md)
- **Checks only the maintainer can do:** [Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
  Anything a session finds that needs their eyes or fingers is added there, not left in a chat.

<!-- toc: written by scripts/docs_toc.py; do not hand-edit -->
**Contents**

- [House rules for this file](#house-rules-for-this-file)
- [Bugs](#bugs)
- [Features](#features)
- [Verify](#verify)
  - [Bugs that need verification](#bugs-that-need-verification)
  - [Features that need verification](#features-that-need-verification)
- [Knowledge base and RAG](#knowledge-base-and-rag)
- [Shelved](#shelved)
- [Done for v0.6.0](#done-for-v060)
<!-- /toc -->

## House rules for this file

1. **An entry is at most five lines**, in plain language, saying what a user would notice. Longer notes go to
   [roadmap-details.md](roadmap-details.md) (open) or [archive/](archive/) (finished), linked, never deleted.
2. **Three lists: [Bugs](#bugs), [Features](#features), [Verify](#verify).** A new entry goes in the right list at its
   star position (ascending; within a star by tag, then title), with a tag. Knowledge base work lives in
   [roadmap-kb.md](roadmap-kb.md).
3. **Status words in Bugs and Features:** **OPEN** (nothing built) · **PARTIAL** (some built) · **ACCEPTED** (the
   maintainer chose to live with it). Once fixed and unit-tested, an entry moves to **Verify**.
4. **When a Deck check is owed,** the entry moves to Verify in the same commit as the code (name the QA row). **When the
   check passes,** it moves to [Done](#done-for-v060) as one line and the full entry goes to the matching archive file.
   Never leave a finished item in Bugs or Features; never use a strike-through.
5. **Stars** are effort and risk: `★` easiest … `★★★★★` very high; `★★★★★★` extreme scope.
6. **Tags:** `[ask]` Ask bar · `[chat]` chat slots · `[chips]` preset chips · `[docs]` the documents · `[focus]` D-pad and
   ring · `[KB]` knowledge base · `[layout]` Main tab space · `[ollama]` models and routing · `[perms]` permissions ·
   `[platform]` build, deploy, tooling · `[QA]` testing · `[repo]` the repository and its old helper copies · `[reply]` the answer · `[tabs]` tab bar · `[ui]` everything
   else on screen · `[voice]` voice.
7. **Parked and watched items live in [roadmap-shelved.md](roadmap-shelved.md)**, not here. Move the whole block back
   when it restarts.

**Every Main-tab UI change also owes the free-play sweep** (row **QA-FREE-PLAY-01** in [testing-manual.md](testing-manual.md)):
walk the pane like a user and require every focused stop to also be visible. **Every screen-side change also owes the look check** (row **QA-LOOK-01**): run it on each tab it touches, on both screens, and look at one screenshot per tab.

**Maintainer note: pick the model before you pick up an item.** The routing table (which model plans, builds and lands
each kind of work) is in [AGENTS.md § 3](../AGENTS.md); the evidence is in [planning/33-model-routing.md](planning/33-model-routing.md).

---

## Bugs

- ★ `[docs]` **A rule in AGENTS.md about Steam's focus transfer does not match the code (the starter set's size wording was settled: leave as it is)** — **PARTIAL, one half open; found 2026-10-16 (plan 86 step 2, D133 call 12 [D133](audit/maintainer-decisions-locked.md#d133--locked-2026-10-16-raised-2026-10-16--plan-86-step-2-approve-the-cut-lists-and-the-folder-map-and-twelve-smaller-calls)).**
  The size-wording half is closed: **"leave as it is" (the maintainer's call of 2026-10-22, plan 99 § 2 call 12)**, so "about 4.6 GB" and "about 4.5 GiB" both stay. **Still open:** AGENTS.md says Steam's focus transfer is called directly only inside the shared helper, but 17 screen files call it: fix the sentence or the code. No player change either way.
- ★ `[focus]` **Two documents disagree about whether a Decky button passes D-pad moves on** — **OPEN, found 2026-10-12 (plan 92); measured once 2026-10-22, not decided.**
  AGENTS.md (the focus section, "Know which handler actually fires") and the focus-pattern checker (`scripts/check-focus-patterns.mjs`, rule 17) say a Decky Button never runs its own move handlers. Plan 92 lanes found Deck walks where they seemed to fire. One Deck reading would settle it.
  **2026-10-22 (plan 97 block A and L17, the monitor, build `73738058`):** Left from the Ask strip's Clear button landed on Voice input 3 of 3 times (`workshop:test-evidence/plan97-A-DECKY-BUTTON.json`). That is both where the button's own handler sends the ring and the control just left of Clear on screen, so the read cannot tell the two apart. The library's source cannot decide it either (the button is Steam's own, found at run time). Stays open.
  **2026-10-22 (plan 97 block E, build `15565346`):** the decisive read was taken and is undecided again. While an answer streams, Left from Clear landed on Stop generation; idle, on Voice input; both are the 20 px box directly to its left, so the handler's target and Steam's own neighbour are the same control (`workshop:test-evidence/plan97-P97-E-DECKY-BUTTON.json`). Row **P97-E-DECKY-BUTTON** measured, not decided.
- ★ `[QA]` **After a plugin reload the Decky tab was missing from the Quick Access rail for over 100 s** — **OPEN, found 2026-10-17 (plan 94 block 7, build `e9b50cc8`).**
  Opening the plugin failed twice meanwhile. Related to the entry below. Evidence `workshop:test-evidence/plan94-P94-RING-STALL.json`.
- ★ `[QA]` **Opening the plugin with the test rig failed twice after a plugin reload** — **OPEN, failed again 2026-10-22 (plan 97 blocks A and D); fixed twice in the rig's repo (rig main `43afc0b`), still fails on a stricter check. Found 2026-10-11 (plan 88, build `68317980`); seen again 2026-10-12 (plan 92, build `d553a5b4`).**
  After a plugin reload with no game running, the first try to open the plugin failed in 3 of 3 rounds (round 1 on the connection to Steam's debugger, rounds 2 and 3 because the Quick Access pane did not appear); the next try always worked. Row **P89-RIG-OPEN-AFTER-RELOAD**.
  **Deck 2026-10-22 (plan 97 block D, build `15565346`, a new chat with the rig fix loaded):** a first set read 3 of 3 (when the plugin's tab was missing, the new steps that reopen the menu and wait for the tab worked by themselves in about 25 s), but a later read found the menu shut. A second set, with a read after each call, opened the plugin in 1 of 3: two failed 1 s after the reload with a debugger connection reset. Stays open, the rig's own. Evidence `workshop:test-evidence/plan97-P89-RIG-OPEN-AFTER-RELOAD-try2.json` (first set) and `-try3.json` (second set, FAIL).
  Every earlier note and evidence file, word for word: [roadmap-details.md](roadmap-details.md#plan-97-fourth-sweep-notes-moved-from-the-roadmap-2026-10-22).
- ★★ `[docs]` **Maintainer's ask: the README clips look choppy and blotchy; refilm them at 60 to 90 frames a second** — **OPEN, asked 2026-10-17.**
  Today's clips were filmed with the recorder's default setting, which saves an older video format (VP8): at most 45 frames a second, with flat colours smeared. The GIFs are cut further, to 10 frames a second and 128 colours.
  **Refilm with the recorder's full-quality setting and the AI on the PC.** Tested 2026-10-17 on the monitor: 60 frames a second while idle and about 33 while an answer writes (the PC writes one in about 4 s, so clips stay short). The 33 is likely the screen's own drawing limit, not the recorder's: the old setting got about 31 on the same monitor. With the AI on the Deck, it fell to about 12.
  Animated WebP looked best for the README: the spoiler clip at quality 90 and 30 frames a second was 5.6 MB, against 3.2 MB for today's GIF.
  **Plan 97 (call 1, [D134](audit/maintainer-decisions-locked.md#d134--locked-2026-10-22-raised-2026-10-22--plan-97-the-bug-list-and-the-verify-list-toward-zero-the-second-sweep-the-ten-calls)):** out of plan 97: a filming job for the maintainer's PC and camera settings, not a helper's. Stays open.
- ★★★ `[focus]` `[tabs]` **Tab sections: the D-pad ring goes wrong after sections are opened (Terse mode unreachable, details line fires on press)** — **PARTIAL: part (a) fixed 2026-10-14 (plan 93, `f60ce2b5`) and passed on the Deck 2026-10-14 (row P93-B15-HELP-LINE, in Done); parts (b) and (c) OPEN, root cause not known yet, reported 2026-10-13 by the maintainer.**
  (b) After opening some sections and walking with the D-pad, Terse mode could not take the ring.
  (c) The maintainer suspects the details text that lengthens a setting throws the ring off. An alternative: keep the sections but show all the details text when a section is opened. Find the root cause before changing the design again.
  **Older note (2026-10-13, plan 93):** moved to [roadmap-details.md](roadmap-details.md#plan-94-notes-moved-from-the-roadmap-2026-10-17).
  **2026-10-17 (plan 94 block 6) and 2026-10-22 (plan 97 L14, `6da3e2d7`):** the Settings case (Down from an open section line stopped moving after a Steam pop-up) is covered by the freeze fix, now Done; row **P97-L14-SECTIONS** passed on the Deck 2026-10-22: Down from an open section line moved the ring 3 of 3 with the page without focus, on the Ollama, Settings (Data) and Developer tabs (`workshop:test-evidence/plan97-P97-L14-SECTIONS-try3.json`, control `-try2.json`). That row never owed parts (b) and (c), so they stay open and untouched. The 2026-10-17 note, word for word: [roadmap-details.md](roadmap-details.md#plan-97-third-sweep-notes-moved-from-the-roadmap-2026-10-22).

- ★★ `[focus]` `[chat]` **Show details: on some chats the D-pad cannot reach the "This answer / Session" tab strip, so "Sum up this chat" cannot be pressed** — **OPEN, found 2026-10-22 (plan 99 filming, build `8c23813e`, the Deck's own screen, a game running).**
  On the clip-2 chat (a Strategy chat with a tick list) the strip was reachable, and the Session tab showed "Sum up this chat" greyed with "the whole chat still fits". On the 4-turn and 8-turn chats the driver tried, Down from "Hide details" jumped into the chip ladder, and three tries never reached the strip, which was visible on screen.
  Root cause not known. Whether it depends on the chat's shape is the first thing to measure. Against plan 71's line it is not a trap: 0.6.0 ships with it, and it is a known problem for 0.6.1.
  Evidence `workshop:test-evidence/plan99-FILMING-SIGHTINGS.md` (section 1). These are sightings by the deck-driver while filming, not a verification row.

---

## Features

**Standing goal from the maintainer (2026-08-30):** buy back as much vertical room for the chat bubbles as possible; every
`[layout]` entry serves it. Items rated ★★★★★ or above carry a placeholder link to [bonsAI Issues](https://github.com/qd313/bonsAI/issues) in the archive;
replace it with a specific issue when one exists.

- ★ `[ask]` **Intent packs later review** — **OPEN.** The quiet search aliases still ship. The maintainer decides whether to delete them, leave them quiet, or revive them under Developer ([D79](audit/maintainer-decisions-archive.md#d79--locked-2026-09-06-raised-the-same-day--the-steam-settings-shortcuts-move-above-the-question-box)).
  The bundled Deck basics list ships switched on and is the only reason a whole sentence matches a setting: *can you help me with performance* returns three results (2026-09-06).
  Not in scope: bringing back Proton journal inject without a redesign. [Detail](../../bonsAI-workshop/archive/45-settings-shortcut-card.md#5-two-things-about-the-search-that-are-not-obvious).
- ★ `[platform]` **Two small build-setup tidy-ups left, deferred on purpose in 2026-08** — **PARTIAL, carried over 2026-09-24 from plan 24 when it was archived.**
  Nothing a person would notice. **Done 2026-10-02 (plan 79):** the version file is written only when it really changes (`b4e838a2`, `49fc8894`), and the old `pnpm.peerDependencyRules` block is gone from `package.json` (`f3541fd`).
  **Still open, for the first session after 0.6.0:** name the package manager's version in `package.json`, and move `packages/bonsai-mcp` off npm. Both need a GitHub run to prove, which a session cannot make (plan 79, question 13). [Plan § 5](../../bonsAI-workshop/archive/24-track-a-ci-baseline.md).
- ★ `[reply]` **Terse answers are capped at about 40 words instead of three lines** — **OPEN, called 2026-10-16 (call 3 of [D131](audit/maintainer-decisions-locked.md#d131--partly-locked-2026-10-16-raised-2026-10-14--plan-93-report-the-nine-questions-on-the-report-page)).**
  Today Terse asks for three lines, and three model lines wrap to nine or more screen lines on the Deck's panel. The cap becomes about 40 words. Related: the Done entry on the Terse slider stop (row P93-B13-TERSE-SLIDER).
- ★ `[repo]` **Delete two pieces of code no screen uses: the AI characters' pixel-art avatars and the knowledge-pack manager** — **OPEN, found 2026-10-16 (plan 86 step 2), called for deletion in [D133](audit/maintainer-decisions-locked.md#d133--locked-2026-10-16-raised-2026-10-16--plan-86-step-2-approve-the-cut-lists-and-the-folder-map-and-twelve-smaller-calls) call 9.**
  The avatars are about 1,170 lines that no screen draws. The knowledge-pack manager has no screen: four hook actions and four back-end calls. No player change either way. Where they sit: [folder-map-tabs-settings-models.md](audit/clean-up-round-three/folder-map-tabs-settings-models.md) (the avatar art) and [folder-map-knowledge-search-notes.md](audit/clean-up-round-three/folder-map-knowledge-search-notes.md) (the pack manager).
- ★ `[tabs]` **Tab sections slightly shaded, with bold titles** — **OPEN, reported 2026-10-13 by the maintainer.**
  So a section stands apart from the settings inside it.
- ★ `[ui]` **A very small Text size choice** — **OPEN, reported 2026-10-13 by the maintainer.**
  Add a choice smaller than the current smallest.
- ★★ `[chat]` **A day in the "N earlier" list can show one game at a time, and the whole list can flip to group by game** — **OPEN, picked by the maintainer on the mock-up board 2026-10-10 (options C and Wild of round 2).**
  An open day starts with a row of game buttons (All, each game asked about that day, No game). A on one shows only that game's questions, six at a time, and each row carries its game's name.
  Left or Right on the "N earlier" line flips the whole list: by day, as now, or one line per game across every day, each question stamped with its day. The maintainer: some players remember the day, some remember the game; this serves both.
  Each saved question already stores its game, so no new data is needed. Not chosen: a busy day that splits by game on its own, or questions sorted by game with labels. [Mock-up board, tab 1](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md).
- ★★ `[chat]` **A quiet cue that a cut question can be opened** — **OPEN, filed 2026-09-05 by the maintainer.** When the ring lands on a question cut short, nothing says the rest is there.
  Chosen from four drawn options: the text fades at the right-hand edge only while the ring is on it, nothing for a finger.
  The same fade already exists for cut-off answers. One check owed first: the question bubble turns its own outline off, so look on the Deck at what focus shows.
- ★★ `[chat]` **At ten chats with no chat open, Ask shows the "pick a chat to delete" list first** — **OPEN, the maintainer's call 2026-10-10.**
  Today, with ten chats saved and none open (for example after Clear cache), a question goes into the newest chat with a short notice (plan 87, F2b). The maintainer chose this instead: Ask opens the same list the + button opens at ten chats. It replaces the newest-chat behaviour, and with it the owed notice check (row P87-F2B-NO-OPEN-CHAT).
  Wanted: after a chat is picked and deleted, the question goes into a fresh chat. On Cancel or B nothing is sent and the question stays in the box (to confirm: this last part is the session owner's safe reading, not the maintainer's words).
- ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.** The create position is the
  literal `[+]` (re-confirmed on board 8f; no decision heading of its own). Reopen that decision before building it.
  [Detail](roadmap-details.md#first-run-ghost-new-chat-label).
- ★★ `[chips]` **Chip decode in step with the scroll** — **OPEN, the maintainer, 2026-10-22 (the checks page, on the chip pace check).**
  When a chip's decode runs it pauses and settles slightly. The goal is for the decode across the whole chip to move in step with the text scroll.
- ★★ `[chips]` **The four chip styles still differ in small ways, and share no drawing code** — **OPEN, held until after the release ([D121](audit/maintainer-decisions-locked.md#d121--locked-2026-09-30-raised-2026-09-30--plan-78-a-wider-bug-session-and-an-unattended-deck-pass-the-eleven-calls) call 10).**
  Folding them into one shared engine is a reshaping of code, so it waits. The rules for which chip comes next and how long it stays were already made the same in plan 78.
  What else differs (restart after an answer, wait after the highlight leaves, recent chips avoided, how each first appears) has not been re-checked against the code since.
- ★★ `[layout]` **Make the Show details chips take less room** — **OPEN, asked for by the maintainer 2026-10-10 (checks page); design picked on the density board 2026-10-11 (option A of round 2).**
  The denser grid passed (Done, row P87-F3-CHIPS-GRID), but the usual eight chips still take five rows, about 210 px above the open box.
  Picked: short names in smaller pills ("Thought 16 s", "Spoilers: high", "gemma4:e2b"), so eight fit in two rows (about 74 px). The "This answer / Session" row and the "Chip 1 of 8" line go; Session becomes a dashed chip at the end that opens Sum up this chat. Each box keeps the chip's full wording under its title. The Show details line stays.
  Not chosen: one sliding row, a row of icons, the pills always under the answer with no Show details line. The full list of short names is on the board. [Density board, tab 1](https://claude.ai/artifact/MjXaLUjnoSLNseFaixcA6g) · [notes](demos/mockup-board-2/README.md).
- ★★ `[reply]` **Decode as the default animation for answers and chips; new items animate in** — **OPEN, reported 2026-10-13 by the maintainer.**
  Decode becomes the default for both answers and chips, and the animation settings are removed from the Developer tab. The maintainer will give the stock settings.
  The rating buttons and follow-up questions under an answer should animate in the same way instead of appearing at once.
- ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed 2026-09-08. Not yet ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip)): it waits for its own go.**
  The model would open every answer with one short sentence that carries the point and gives nothing away. The 2026-09-12 count: 2 of 10 answers already did, 0 of 10 gave anything away. By the maintainer's own rule that means build it, but they said not yet.
  [Detail](roadmap-details.md#headline-first-every-answer-opens-with-one-line-that-stands-alone).
- ★★ `[reply]` **A long answer is cut into sections while it writes, so nothing changes when it finishes** — **PARTIAL: the cutting while it writes is built (2026-10-14, plan 93) and passed on the Deck 2026-10-14 (row P93-M4-ANSWER-FINISH-after, in Done); the view following the end of the answer smoothly while it writes is NOT built. Decided on the mock-up board 2026-10-10 (option A of round 2); carried over 2026-09-24 from plan 05.**
  Picked: each section closes as soon as it is full, so the answer never changes at the finish. Built in `a5d7bc88`, `e336df01`, `e550ca42`, `abb3c329` and `32c6cc79`; see the Done entry "When an answer finishes streaming, the screen flickers and then jumps to the end". Not built: in the Deck run the page stayed at the top while the answer wrote, and following its end smoothly is a later piece.
  Not chosen: keeping today's rebuild and making it gentler. Touches [plan 69](../../bonsAI-workshop/planning/69-streamed-answers-scramble.md). [P6](../../bonsAI-workshop/archive/05-token-streaming-review.md) · [Mock-up board, tab 3](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md).
  The entry as it stood before: [roadmap-details.md](roadmap-details.md#plan-93-notes-moved-from-the-roadmap-2026-10-14-docs-sweep-3).
- ★★ `[reply]` **The folded reasoning line in the character's own voice** — **OPEN, optional, filed 2026-09-16 ([D106](audit/maintainer-decisions-locked.md#d106--locked-2026-09-16--after-the-fourth-feature-session-the-plain-reasoning-fold-first-the-session-as-a-tab-the-cards-six-rows-a-read-aloud-button-and-one-call-left-open)).**
  The plain folded line has shipped (Reasoning display, closed 2026-09-18), so this can be picked up. The mockup showed the line written in a character's voice, for example "See the booyakasha · 41 s" for Ali G.
  Not decided: a fixed phrase per character, or the model asked once each time. It must fall back to the plain line when the character is off or the phrase is missing. [Mockup page](https://claude.ai/artifact/2De58qirE34754PEZVPmdb).
- ★★ `[reply]` **Which bundled characters copy a real person** — **OPEN, filed 2026-09-08 ([D74](audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open)); the gate for the shelved character voices.**
  All 31 characters are named characters from games or TV, each voiced by a real actor. Owed: a one-line-per-character sweep of who owns it, whose voice it is, and whether a voice could be a type rather than a copy. No code; a document the legal check reads. [Memo](../../bonsAI-workshop/planning/42-read-aloud-feasibility.md).
  Not needed for 0.6.0 (plan 72): characters are text only. Still the gate before any character gets a voice.
- ★★ `[voice]` **"Install the starter set" also builds the voice engine program** — **OPEN, called 2026-10-16 (call 2 of [D131](audit/maintainer-decisions-locked.md#d131--partly-locked-2026-10-16-raised-2026-10-14--plan-93-report-the-nine-questions-on-the-report-page)).**
  Today the starter set brings the two speech models, but the microphone still needs a trip to Settings to build the voice engine program. The starter set does that step too, so the microphone works straight after it.
- ★★ `[voice]` **Spoilers by voice** — **OPEN, filed 2026-09-08; waits on Voice follow-ups.**
  When a spoken answer reaches a hidden spoiler it says so and waits; "go on" unhides and reads it, anything else skips it. The block on screen unhides with the spoken one, so the two never disagree. The Deck alone is enough to test. [Plan](../../bonsAI-workshop/planning/49-steam-frame-features.md).
  **2026-10-16:** it needed the spoken answers of Read aloud, which plan 86 step 3 removed (`8bcf0160`, `181c30ef`). It waits for a call on whether it stands.
- ★★ `[voice]` **Voice follow-ups** — **OPEN, filed 2026-09-08; Read answers aloud shipped 2026-09-12.**
  For a few seconds after a spoken answer ends, the mic listens for four words: again, go on, stop, next. A short rising tone when it opens, a short falling tone when it closes. One setting, off by default.
  Hangs off the middle position of the Voice replies setting ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip)). [Plan](../../bonsAI-workshop/planning/49-steam-frame-features.md) · [Second look § 3](../../bonsAI-workshop/planning/52-frame-features-second-look.md#3-voice-follow-ups-a-sound-a-short-listen-a-few-words).
  **2026-10-16:** Read aloud and the Voice replies setting this hung off were removed in plan 86 step 3 (`8bcf0160`, `181c30ef`). It waits for a call on a new home or a retirement.
- ★★★ `[focus]` **Smoother D-pad scrolling: the page snaps to an option** — **OPEN, reported 2026-10-13 by the maintainer.**
  Moving the ring makes the page snap, which is jarring. Ideas: a smooth glide, or a short blur during the move. Is a blur over-engineering? Decide after measuring. Related: the Verify item about the page moving at every press.
- ★★★ `[ollama]` `[ui]` **AI models screen: a much bigger catalog and far simpler filters** — **OPEN, reported 2026-10-13 by the maintainer.**
  Only a few models show up now. Grow the catalog a lot. The filters are confusing; cut them down to a few clear ones.
  **2026-10-13 (plan 93):** the maintainer wants the "Deck essentials only" filter rethought as part of this. Side reading from the Deck: with "Deck essentials only" ticked, the licence pick changes nothing (4 rows either way). Evidence `workshop:test-evidence/plan93-P93-M13-GEMMA-FILTER.json`.
  **2026-10-14 (plan 93):** the maintainer thinks the Gemma model was hidden by another filter, maybe "Deck essentials only", when the Bugs entry about it was closed as not reproduced (the model is offered under "Open source only" in the catalog and in the AI models screen). Evidence `workshop:test-evidence/plan93-M13b-GEMMA-PICKER.json`.
- ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — **OPEN, research spike.** Hold models loaded, or unload when a game takes
  focus on the Deck APU? The spike decides go or no-go; no production unload before it. Pairs with "What bonsAI costs a running game".
  [Detail](roadmap-details.md#ask--reply-items-with-short-entries-as-filed).
- ★★★ `[ollama]` **First-time setup: bring back the starter set and make it simpler** — **OPEN, reported 2026-10-13 by the maintainer.**
  First-time setup is painful. Put the starter set first and cut the steps. See the qwen2.5vl bug in Bugs.
  **2026-10-14 (plan 93):** the starter set is back: "Install the starter set" brings gemma4:e2b-it-qat, the note-search model and the two speech models (`bbd5de86`, `0f8f32aa`; see the Verify entry on the starter model). "Cut the steps" is not touched.
- ★★★ `[ollama]` **How fast is this model on this Deck** — **OPEN, planned 2026-09-06, six calls open ([D75](audit/maintainer-decisions-locked.md#d75--open-raised-2026-09-06--the-model-speed-readout-six-calls-before-anything-is-built)).**
  Next to each installed model: how fast it answered on this Deck last time, and a button to time it now with one fixed question. A last-ten record per model, a badge in the picker, a plain line under Show details; nothing is reordered. [Plan](../../bonsAI-workshop/planning/43-model-speed-readout.md).
- ★★★ `[ollama]` **Per-mode latency timeouts** — **OPEN, weighed and deliberately not built 2026-09-05.** Separate warning and
  give-up values per Ask mode. Dropped on purpose: the two values already run through sixteen files each and going per mode
  triples them, and it changes when a warning shows rather than what the plugin can do.
- ★★★ `[ollama]` **What bonsAI costs a running game** — **OPEN, asked for and measured 2026-09-20.**
  Writing an answer takes about a third of the frame rate in God of War (31 to 20 and back), and the answer itself slows to about a third of its speed. Memory is the other half: 206 MB spare before the model loaded. Giving the model more room costs nothing in frames.
  With Deep Rock Galactic: Survivor on a menu mid-mission (2026-10-02) the game held 43 to 44 frames a second against 45 idle. Not yet tried in a real fight. Evidence `workshop:test-evidence/plan79-SCR-10-MISSION.json`. **2026-10-10 (plan 87 Deck block 5b, build `8608954d`): UNCLEAR.** 59.4 frames a second over 60 s with an answer streaming from this PC's AI for 11 of the 60 s, but the game was most likely paused on its Level Up screen, so it was not a live fight. A live-fight number stays owed. Evidence `workshop:test-evidence/plan87-P87-FIGHT-FRAME-RATE.json`.
  The real questions: what to reserve, and whether to say plainly what a question costs. Pairs with keep-alive. Older notes: [roadmap-details.md](roadmap-details.md#what-bonsai-costs-a-running-game).
- ★★★ `[platform]` **bonsAI's own icon in the Quick Access Menu** — **OPEN, re-planned 2026-09-23, was ★★★★★★.**
  The free plugin Quick Tab already pins any Decky plugin as its own menu icon, so the wait on Decky's team is over. Left: a Deck test, then small fixes.
  Read from the code, not yet seen: in its own tab the reply-ready notice pops up while you look at the answer, and tapping it opens Decky instead. [Plan 66](planning/66-quick-tab-own-menu-icon.md).
- ★★★ `[reply]` **The Spy opens as somebody else** — **OPEN, split off 2026-09-15 ([D105](audit/maintainer-decisions-locked.md#d105--locked-2026-09-15--the-fourth-feature-session-two-features-drawn-instead-of-built-the-spys-reveal-the-lighter-clear-and-the-wipe)).**
  On a random chance his first message introduces him as a different character from the list and he keeps it up. A character has no first message today, so this needs a greeting feature first.
  Decide before building: how often, whether the picker still shows Spy, and how the reveal reads.
- ★★★ `[ui]` **Search density** — **OPEN.** Tighter, more scannable results with highlighted match tokens.
  [Detail](roadmap-details.md#focus--deck-ui-items-with-short-entries-as-filed).
- ★★★ `[voice]` **Headset mode** — **OPEN, filed 2026-09-08; waits on Wake-word listening and the Frame ([D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) call 3).**
  One switch turns on the wake word, reads every new answer aloud, and asks the model to answer for the ear: two or three sentences, no lists. Made for a visor on your face and a Deck across the room. No headset is being bought for now. [Plan](../../bonsAI-workshop/planning/49-steam-frame-features.md).
  **2026-10-16:** it read every new answer aloud, and Read aloud was removed in plan 86 step 3 (`8bcf0160`, `181c30ef`). It waits for a call on whether it stands.
- ★★★★ `[ask]` **A spoiler-chance rating for the chat's own summary** — **OPEN, not started ([D118](audit/maintainer-decisions-locked.md#d118--locked-2026-09-24-raised-2026-09-24--plan-68-the-chat-sums-itself-up-the-calls-from-discovery) call 14).**
  The chat now sums itself up on its own (done, see the archive entry below); rating how likely that summary swept up a spoiler is a later plan of its own.
  [Detail](archive/roadmap-completed.md#the-chat-sums-itself-up-instead-of-being-cleared-closed-2026-09-26).
- ★★★★ `[ask]` **Connection doctor** — **OPEN, planned 2026-09-05, calls locked ([D64](audit/maintainer-decisions-archive.md#d64--locked-2026-09-05-raised-2026-09-05--the-connection-doctor-and-the-health-report-seven-calls-before-go)); the look picked on the mock-up board 2026-10-11 (option C of round 2).**
  Planned in September: when an Ask fails, a **Fix this** button runs the checks the plugin already has, shows the one that failed and offers one next step, with a button that lands on that control in the Ollama tab. Nothing changes without a press.
  Picked: the failed answer says what went wrong in one plain line, with the exact error folded away under it, and offers **Fix it for me** first. It opens a sheet over the panel that shows the checks as they run, then lists every step it will take, ticks each one off and has a Stop button that works at any moment; then it asks the question again.
  **Allowed as an exception** to D64's "nothing changes without a press" (the maintainer, 2026-10-11), **as long as Stop works**: Stop must end the run at any step and change nothing after it. That is a pass condition for every Deck check of this feature.
  It also holds **Save a report** (a button and a typed command): a read-only report of the setup, written to the Desktop (the old **Deck health snapshot**). [Plan](../../bonsAI-workshop/planning/39-connection-doctor.md) · [Mock-up board, tab 6](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md).
- ★★★★ `[ask]` **Session context and user stash** — **PARTIAL; the notes half is BUILT 2026-10-12 (phase 1 complete): [plan 90](../../bonsAI-workshop/planning/90-search-tab-and-your-notes.md), built under [plan 92](../../bonsAI-workshop/planning/92-feature-night-search-notes-models-tabs.md) ([D129](audit/maintainer-decisions-locked.md#d129--locked-2026-10-12-raised-2026-10-12--plans-90-to-92-the-search-tab-your-notes-the-models-box-column-and-the-denser-tabs-the-calls)); picked on the mock-up board 2026-10-11 (option B of round 2). The live half (phase 2, the session bundle) stays on the backlog.** The live half exists: the Session context strip shows how many turns the chat carries, with a Clear button ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip)).
  Short notes in your own words that Ask reads, like "I'm on a Steel Soul run". No embeddings, no cloud. Notes are heard by a small word rule on the question, with no extra trip to the AI; typing "remember …" opens the same card (D129 call 5). Picked: no button on every answer. When a question says something worth keeping, a small card under the answer offers a short note: Keep, Edit or Not now, for this game or every game. The same card comes up when you ask for a note yourself.
  An answer that read your notes says so in one line, and pressing it opens them. Every note, for every game, lives on the Search tab (see **Search in bonsAI**). Not chosen: a notes list under Show details, a notes button by the question box. [Mock-up board, tab 7](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md). What plan 92 built and the Deck passes: [archive](archive/roadmap-trimmed-2026-10-roadmap.md#plan-96-note-what-plan-92-built-of-the-session-notes)
- ★★★★ `[layout]` `[tabs]` **Give the reclaimed height to the transcript** — **PARTIAL, steps 2 to 7 built and checked on the Deck's own screen 2026-10-09 ([plan 84](../../bonsAI-workshop/planning/84-more-room-for-the-answer.md), calls in [D126](audit/maintainer-decisions-locked.md#d126--locked-2026-10-08-raised-2026-10-08--plan-84-more-room-for-the-answer-the-calls-from-seven-mockup-rounds)).**
  On the Deck's own screen the answer now has 295 points of height instead of 204 (the plan said 297; the chips row is 32 points, not 30). The tab bar sits in the empty strip at the top, the chat's name sits beside Decky's back arrow, the ask area folds into the question box, and Read aloud moved into the answer's corner. Evidence: [step 1](../../bonsAI-workshop/test-evidence/plan84-STEP1-DECK-TESTS.json) · [steps 2 and 3](../../bonsAI-workshop/test-evidence/plan84-STEPS2-3-DECK.json) · [steps 4, 5 and 7](../../bonsAI-workshop/test-evidence/plan84-STEPS4-5-7-DECK.json) · [step 6](../../bonsAI-workshop/test-evidence/plan84-STEP6-DECK.json).
  Still owed: the touch check of the tab bar failed by hand 2026-10-18 (row **P84-TABS-02**, see the Bugs entry on the ghost of the tab bar), the chats menu's actions and a reduced-motion look at a long chat name on the Deck, the run of every row on the TV, and step 9 (reading mode, a test to find out, its own short plan). Rows: [testing-manual.md](testing-manual.md#plan-84--more-room-for-the-answer-plan-84).
  [Drawing](https://claude.ai/artifact/EoRoxs11bVjfyBZ28tkM5P) · [Detail](roadmap-details.md#give-the-reclaimed-height-to-the-transcript).
- ★★★★ `[ollama]` **LAN custom model pull** — **OPEN, blocked on a choice among four ways to pull a model onto another computer on your network. No decision recorded.**
  The picker for typing a custom model name on the Deck itself already shipped. This is the same for a remote Ollama host. The four ways are written out in [the long notes](roadmap-details.md#ask--reply-items-with-short-entries-as-filed).
- ★★★★ `[perms]` **Web permission** — **OPEN, discovery written, nothing built.**
  An opt-in so Ask can fetch live answers about current patches and news. With it off, Ask and the local knowledge base work offline as today. The Kids lock forces it off. No decision recorded.
  [Discovery](planning/web-permission-discovery.md) · [Detail](roadmap-details.md#permissions--safety-items-as-filed).
- ★★★★ `[platform]` **Llama.cpp provider spike** — **OPEN, research only; stays closed ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip) call 1).**
  A go or no-go on running models through llama.cpp instead of Ollama on the Deck. Prior study: [llama-cpp-provider.md](../../bonsAI-workshop/archive/spikes/llama-cpp-provider.md) · [Detail](roadmap-details.md#platform--upstream-items-as-filed).
- ★★★★ `[platform]` **Steam Input layout parse** — **OPEN, not started.** Read the controller layout files so Ask knows what each button does in the running game.
  Not in scope: writing or changing controller layouts.
- ★★★★ `[QA]` `[platform]` **Finish the controller test rig** — **PRIORITY 1 (maintainer, 2026-09-24). PARTIAL: built and driving every Deck session.**
  Left from [plan 19](planning/19-controller-macro-test-rig.md): a recording that is also a live view, checking the highlight from the video, handheld runs over Bluetooth, and the nightly unattended run. The walk replay now works across builds (Deck 2026-09-26, [plan 70](../../bonsAI-workshop/archive/70-kb-wave-four-and-deck-test-wave.md)).
  The first nightly run on 2026-09-26 ran by itself, but the 30 walks checked nothing yet (the panel was not reopened first). Row **OVERNIGHT-RUN-01** in [testing.md](testing.md); evidence `workshop:test-evidence/overnight-2026-09-26-200443.md`.
  [Detail](roadmap-details.md#overnight-runs-first-real-run) · [Program](../../bonsAI-workshop/planning/21-ai-owned-testing-program.md) · [History](roadmap-details.md#controller-macro-test-rig-and-live-view).
- ★★★★ `[reply]` **A note pinned in space** — **OPEN, filed 2026-09-08; needs the floating panel first.**
  In a headset, park the answer on a wall or table so it stays there while you play. The pretend headset can show it fixed in the room; a real headset judges whether it reads. No headset is being bought for now ([D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) call 3); this waits for the Frame. [Plan](../../bonsAI-workshop/planning/49-steam-frame-features.md).
- ★★★★ `[reply]` **A wrist panel** — **OPEN, filed 2026-09-08; needs the floating panel first.**
  In a headset, a small panel rides on one controller: turn your wrist, read, drop your hand and it is gone. Only testable with a real headset and tracked controllers. This waits for the Frame ([D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) call 3). [Plan](../../bonsAI-workshop/planning/49-steam-frame-features.md).
- ★★★★ `[ui]` **SteamOS Share path** — **OPEN, not started.** A faster way from Steam's Share and capture screens into attaching a screenshot, where Steam's own tools allow it.
- ★★★★ `[ui]` **SteamOS spin hint card** — **OPEN, not started.** Notice a locked-down SteamOS variant and show a card that links to the right troubleshooting.
- ★★★★★ `[ollama]` **On-Deck model benchmark** — **OPEN, cut down on 2026-09-06; the call to retire it is open ([D75](audit/maintainer-decisions-locked.md#d75--open-raised-2026-09-06--the-model-speed-readout-six-calls-before-anything-is-built)).**
  The idea: rank installed models by measured speed and offer that as the try order. Its own test said: if timings do not hold still, shrink it to a one-time readout. That readout is now its own three-star entry, [plan 43](../../bonsAI-workshop/planning/43-model-speed-readout.md).
  Desk study of this quarter's models: [plan 41](../../bonsAI-workshop/planning/41-deck-model-survey.md) (calls [D72](audit/maintainer-decisions-archive.md#d72--locked-2026-09-05-raised-2026-09-05--newer-models-for-the-deck-what-to-pull-and-measure)). [Detail](roadmap-details.md#deck-health-snapshot-local-reply-tts-on-deck-model-benchmark).
- ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN, not started.** Answers worded for the new controller and its Steam Input layouts.
  [Detail](roadmap-details.md#the-five-star-and-six-star-platform-items-as-filed).
- ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; the bench works, nothing is built.**
  bonsAI's panel floating over any VR game, drawn by a small PC program, not a Decky plugin. **Locked rule ([D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule)):** it goes only through SteamVR's own panel door and never touches the game, to avoid an anti-cheat ban.
  Bench 2026-09-12: a sample answer appeared in the headset view. Still unknown: pointing at it (needs a real headset) and whether the notification card drew. [Findings](../../bonsAI-workshop/planning/53-steamvr-bench-findings.md) · [Detail](roadmap-details.md#the-floating-panel-inside-steamvr).
- ★★★★★ `[QA]` `[platform]` **Stand-in Decks on the maintainer's PC** — **OPEN, planned 2026-09-23, nothing built.**
  Up to four virtual Decks so several AI sessions can test at once instead of queuing for the one Deck. Phase 0 first: one stand-in on Windows; if that fails, a Linux dual boot. Comes after the controller test rig. [Plan 67](planning/67-stand-in-decks.md).
- ★★★★★ `[voice]` **Wake-word listening** — **OPEN, beta; the study says conditional go, nothing built.**
  Opt-in, always listening on the Deck for the word "bonsAI", then it hears your question and asks quietly. [Feasibility](../../bonsAI-workshop/planning/10-wake-word-listening-feasibility.md).
- ★★★★★★ `[platform]` **Deep mod AI hints** — **OPEN; the study says go on a smaller first version, nothing built.** Spot which mod tools a game uses, so answers can be mod-aware.
  [Feasibility](../../bonsAI-workshop/planning/12-deep-mod-ai-hints-feasibility.md).
- ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening
  llama.cpp** — **OPEN, filed 2026-09-08. Not yet ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip), 2026-09-12): nothing is built until the maintainer says.**
  The question: does bonsAI grow a second way to run? Today the Python side has no network door, so a PC panel would have a screen and no brain.
  The price is known: the Python side ran on a Windows PC and all nine calls came back working. Still missing: a starter program and a way for a panel to reach it. [Detail](roadmap-details.md#one-decision-for-three-items-the-steamvr-panel-leaving-decky-and-reopening-llamacpp).
- ★★★★★★ `[platform]` **Remote Play diagnostics layer** — **OPEN, not started.** When you stream a game, answers weigh encoding delay and whether the fix belongs on the host or the client.
  Noted in [09-steam-frame-companion-feasibility.md](../../bonsAI-workshop/archive/09-steam-frame-companion-feasibility.md) § B8.
- ★★★★★★ `[reply]` **In-game answer surface** — **OPEN, research only.** Read an answer without leaving the game. The full overlay waits on Valve's side.
  The toast slice has shipped (the answer's first lines in the popup, passed on the Deck 2026-09-28, [archive](archive/roadmap-completed.md#the-answers-first-lines-in-the-reply-ready-toast-closed-2026-09-28)).
  The same surface in a headset is **The floating panel inside SteamVR**; see [plan 49](../../bonsAI-workshop/planning/49-steam-frame-features.md).

---

## Verify

Fixed, unit-tested and shipped, but not yet confirmed on the Deck. Owed QA row named in each entry; full evidence in
[testing.md](testing.md) / [testing-manual.md](testing-manual.md). Once a Deck run confirms one, move it in the same commit: a line into
[Done](#done-for-v060), the full entry into the matching archive file, drop it from here.

### Bugs that need verification
- ★ `[ask]` **If only the screen side reloads, the last answer's note offer can show again** — **VERIFY, fixed 2026-10-14 (plan 93, `0e619d7c`). Was OPEN, reported 2026-10-12 by plan 92 lane N2; not seen on the Deck.**
  The offer to keep your question as a note comes with the answer. If only the screen side of the plugin reloads (the back end keeps running), the last answer's card could be drawn again. Found by reading the code, no evidence file.
  **Fixed 2026-10-14 (plan 93, `0e619d7c`):** a kept or dismissed offer is remembered across a screen-only reload. Owes row **P93-B6-NOTE-OFFER** on the Deck; proven by its tests only so far (the rig cannot reload only the screen side; a possible route is reloading only Steam's Quick Access page, not run).
  **Deck 2026-10-22 (plan 97 block C, build `73738058`): COULD NOT RUN the screen-only reload.** Reloading only the Quick Access page left it blank and only a plugin reload brought the panel back. After a plugin reload (which restarts the back end too) the card did not come back and the handled mark stayed in the browser's storage: that fits the fix but is not the screen-only case. Stays here as **proven by its tests only**, and goes on the maintainer's list. Evidence `workshop:test-evidence/plan97-P93-B6-NOTE-OFFER.json`.
- ★ `[focus]` **A press that never opens its box (parental lock on) can leave a stale "return the ring here" note behind** —
  **VERIFY, fixed for all buttons 2026-09-29 (plan 77, tip `7c8ac206`).**
  A press that opens no box no longer leaves a note that throws the ring back later. Earlier fixed (`6ef8cedf`) for the library's Update and "Pull nomic-embed-text" buttons; now also "Update AI & models" and the Tier 1 and Tier 2 install buttons.
  Passed on the Deck 2026-09-29: the box half. Still owed: the parental-lock half, which needs Steam Family View with a PIN (maintainer's checks page; skipped 2026-10-18, a child account is needed first). Row **P77-OLLAMA-NOBOX-NOTE** in [testing.md](testing.md). Full note: [roadmap-details.md](roadmap-details.md#a-press-that-never-opens-its-box-parental-lock-on-can-leave-a-stale-return-the-ring-here-note-behind).
- ★ `[reply]` **A spoiler line inside a bold heading shows raw ** marks** — **VERIFY, fixed 2026-10-22 (plan 97 L3, `20737081`). Was OPEN, found 2026-10-14 (plan 93 Deck block D1); seen again in block D3.**
  A hidden block written on one line inside a bold line (a heading, a bullet or a plain line) no longer leaves two stray stars: the bold is closed just before the block and reopened after it if the line goes on. It works for a finished and a still-writing answer.
  **Deck 2026-10-22 (plan 97 block E2, build `15565346`): UNCLEAR.** Two answers (a Hollow Knight steps list, a Celeste steps list) had no stray stars and drew their bold headings, but neither had a hidden block inside a bold line: one cover stood on its own after the list, the other answer drew none. The AI never wrote the shape, so the fix rests on its tests (`workshop:test-evidence/plan97-P97-L3-SPOILER-BOLD.json`). Row **P97-L3-SPOILER-BOLD**. Evidence of the failure `workshop:test-evidence/plan93-P93-O3-SPOILER-CUT-D3.json`. Older notes: [roadmap-details.md](roadmap-details.md#plan-97-second-sweep-notes-moved-from-the-roadmap-2026-10-22).
- ★ `[ui]` **Maintainer's ask: sweep every tab for buttons that are lopsided, pressed against an edge or too small for their words** — **VERIFY, fixed 2026-10-18 (plan 96 F25, `098e8a08`, `a978d095`, `0fd1818b`, `a29f9eb0`). Was OPEN, asked 2026-10-17 (plan 95 filming).**
  Seen: "Test connection" and the PC address box sit flush right while the box's left gap is 16 px; on the About tab the three links hug the left with the QR code on the right, and "Bugs & Feature Requests" needs 172 px in a 158 px button. Run the new look check (row QA-LOOK-01) on every tab and both screens, fix each finding.
  **Fixed 2026-10-18 (plan 96 F25, commits `098e8a08`, `a978d095`, `0fd1818b`, `a29f9eb0`):** the Developer tab's rows got the Settings side gap, About's long link wraps, the Ask pill takes its content's width (measured: `workshop:test-evidence/plan96-P96-F25-ASK-PILL.json`, content 56 px in 51), and the look check skips full-bleed rows and the chat's own rows. Owes **QA-LOOK-01** on the new build, on every tab.
  **Deck 2026-10-18 (plan 96 blocks D and E):** on build `a29f9eb0` the look check found nothing on Settings, Permissions, Search, Developer, Ollama and About, and one thing on Main, the Ask pill (56 in 51) (`workshop:test-evidence/plan96-QA-LOOK2-Settings.json`, and the same name ending `-Permissions`, `-Search`, `-Developer`, `-Ollama`, `-About`, `-Main`). After the check learned that words must really spill (`331d4b56`), block E's Main run (build `f7413dbc`) had no Ask finding; one was left, the new "Open the Ollama tab" button reading light, fixed in `bba825e5` (`workshop:test-evidence/plan96-QA-LOOK3-main.json`). Row P96-F25-ASK-PILL passed.
  **Deck 2026-10-18 (plan 96 block F, build `24f5c300`):** the look check on Main found nothing; that was the Main run still owed after `bba825e5` (`workshop:test-evidence/plan96-QA-LOOK4-main.json`). The "AI is not set up" answer variant could not be made by the rig (it needs A on a text box). **Still owed:** the same run on the monitor (the ask names both screens). Older notes: [roadmap-details.md](roadmap-details.md#plan-96-notes-moved-from-the-roadmap-2026-10-18).
- ★★ `[platform]` **With an external controller, Steam's on-screen keyboard does not appear for Rename chat (nor with Steam + X); it works on the Deck itself** — **VERIFY, first step built 2026-10-22 (plan 97 L10, `1a7491ce`); the rig half passed on the Deck, the maintainer's own controller is the proof. Was OPEN, found 2026-10-18 by the maintainer's hand check (plan 96 check 2).**
  Block A: with the test rig the name field takes the ring when the box opens and Steam's keyboard shows after one A on the field (`workshop:test-evidence/plan97-A-RENAME-RIG.json`), so the rig already passed before the fix; the maintainer's own controller is the proof. The maintainer, 2026-10-22: "I'm just using a controller. Yes pressing A on a text input box should bring up the keyboard."
  Built: when the box opens, Steam is handed the name field through its own node. Not built: the suggested-name button waits for the maintainer.
  **Deck 2026-10-22 (plan 97 block D8, build `15565346`): row P97-L10-RENAME-KEYBOARD passed with the rig.** The ring was on the name field when the box opened, one A on the field showed Steam's keyboard, a typed letter landed, Save renamed the chat and renaming back worked (`workshop:test-evidence/plan97-P97-L10-RENAME-KEYBOARD.json`). It shows only that nothing broke. **Still owed:** the maintainer's own controller, **P97-L10-RENAME-KEYBOARD-HAND** in [testing-manual.md](testing-manual.md). Older notes: [roadmap-details.md](roadmap-details.md#plan-97-second-sweep-notes-moved-from-the-roadmap-2026-10-22).
- ★★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** — **VERIFY as a guard only, built 2026-10-22 (plan 97 L15, `f969378d`). Was OPEN, failed by hand 2026-09-23 and 2026-10-18; raised to three stars 2026-10-18.**
  Not a root fix. A watcher keeps Steam's own tab row hidden if it ever shows, and writes one log line (`tabBar.steamRowShown`) with the whole page state when it does, so the failing condition gets a name; the rule change waits for that log. The cause is not known; the maintainer's touch check settles it (row **TAB-BAR-GHOST-01** in [testing-manual.md](testing-manual.md)).
  **Deck 2026-10-22 (plan 97 block E10, build `15565346`, Deep Rock Galactic: Survivor running): row P97-L15-GHOST passed on the pop-up route.** Three "Delete chat?" rounds, Steam's row hidden at every read (0.65 s to 10.2 s after B), no second strip in any screenshot, LB and RB still switched tabs, and no `tabBar.steamRowShown` line in the plugin log or the journal (`workshop:test-evidence/plan97-P97-L15-GHOST.json`). The earlier runs that also never showed it: [roadmap-details.md](roadmap-details.md#plan-97-fourth-sweep-notes-moved-from-the-roadmap-2026-10-22).
  **Still owed: the maintainer's touch check** (**TAB-BAR-GHOST-01**); the rig cannot touch the screen, so the pop-up route is all the Deck run could show. The maintainer's call of 2026-10-18, the plan 96 hand check and the older notes: [roadmap-details.md](roadmap-details.md#plan-97-third-sweep-notes-moved-from-the-roadmap-2026-10-22); scoping note [plan96-scope-ghost-tab-bar.md](audit/plan96-scope-ghost-tab-bar.md).

### Features that need verification

- ★★ `[chips]` **Make the preset chips look more like chips** — **VERIFY, shipped 2026-09-17 under plan 60
  ([D110](audit/maintainer-decisions-locked.md#d110--locked-2026-09-16-raised-2026-09-16--the-suggestion-chips-as-real-buttons-claude-design-board-b-six-calls-before-the-build)).**
  Chips look raised, sit closer together, and the chip the controller is on shows a soft blue fill (the maintainer's pick, 2026-10-02). Rows 02 to 06 and 08 passed by measurement; row 07 passed in all three styles (`workshop:test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`, `plan79-CHIP-BUTTON-07.json`). Row 09 (the dot stays still while a long label scrolls) passed in full on the Deck 2026-10-02 (`workshop:test-evidence/plan79-CHIP-BUTTON-09.json`).
  **The maintainer's eye, 2026-10-22 (the checks page):** "raised like buttons" PASS (row **CHIP-BUTTON-01**, closed) and "the soft blue fill" PASS (the look of row P79-CHIP-SOFT-FILL). The help and agent chips FAILED: "make sure the focus ring works on the How to use bonsAI chip" (row **CHIP-BUTTON-06** stays open; see the Verify entry on the help chip). The short chip's centring: no verdict (a new Features entry asks for the decode to move in step with the scroll). **The chip pace: "as they are", closed (the maintainer's call of 2026-10-22, plan 99 § 2 call 12).**
  Still owed: **CHIP-BUTTON-05** by eye (not part of that answer), **CHIP-BUTTON-06**, a short chip's centring (no short chip without a tip dot showed in 417 s on 2026-10-11, so that rests on its tests only; row P79-LONG-CHIPS is closed). The chip pace is no longer owed (call 12; its Deck rows P78-TIP-CHIP and P78-CHIP-PACE passed, in Done). **CHIP-BUTTON-05 and CHIP-BUTTON-06 stay owed.**
  [Plan](../../bonsAI-workshop/archive/60-chip-button-restyle.md) · [Detail](roadmap-details.md#make-the-preset-chips-look-more-like-chips).
- ★★ `[reply]` **The streamed answer's own redraws were costing most of the panel's frame rate** — **VERIFY, fixed 2026-09-25 (`bb8d7e5b`, `aae5add6`).**
  With no game running the panel drew about 19–24 frames a second while an answer streamed; it now draws 56–58 with the scramble off and 44–50 with it on (the maintainer's floor was 45). Evidence `workshop:test-evidence/plan69-answer-frame-rate-2026-09-25.json`.
  With a game in a live mission (stopped on a menu, 2026-10-02) the panel drew about 69 a second while answers arrived (`workshop:test-evidence/plan79-SCR-10-MISSION.json`).
  Owed: the maintainer's eye on the look, and a run in a real fight. Rows **SCR-09**, **SCR-10** in [testing.md](testing.md).
  **2026-10-22 (plan 97 block B, build `73738058`, Deep Rock Galactic: Survivor):** the real fight COULD NOT RUN. One A at the game's title screen opened its save-slot screen (three saved games, each with a delete button), and the runbook stops there; no frame rate was sampled. Row SCR-10 stays owed for a real fight. Evidence `workshop:test-evidence/plan97-SCR-10.json`. The 2026-10-11 note, word for word: [roadmap-details.md](roadmap-details.md#plan-97-third-sweep-notes-moved-from-the-roadmap-2026-10-22).
- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09.
  When Steam says parental controls are locked, bonsAI turns the high-impact permissions off and greys their switches. Passed on the Deck 2026-09-17: with no lock set, no banner and all four switches on and reachable (**KIDS-REGRESS-01**, `workshop:test-evidence/plan57-QA-KIDS-REGRESS-01.json`).
  Still owed, needs a locked account: **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-LOCK-02** (child account), and the live Steam check. **2026-10-18:** the maintainer's hand check 5 was SKIPPED ("I'm going to have to create a new profile with a child account", [checks page](https://claude.ai/artifact/FTe9Lr1sS2Kfrj8nBTVrhi)); all of these stay owed.
- ★★★★ `[chat]` `[tabs]` **Search in bonsAI: a Search tab that also holds your notes** — **BUILT 2026-10-12, passed on the Deck except the checks listed as owed: [plan 90](../../bonsAI-workshop/planning/90-search-tab-and-your-notes.md), built under [plan 92](../../bonsAI-workshop/planning/92-feature-night-search-notes-models-tabs.md) ([D129](audit/maintainer-decisions-locked.md#d129--locked-2026-10-12-raised-2026-10-12--plans-90-to-92-the-search-tab-your-notes-the-models-box-column-and-the-denser-tabs-the-calls)). Asked for by the maintainer 2026-10-02; design picked on the mock-up board 2026-10-11 (option B of round 2); its own tab, left of Main, the maintainer's call 2026-10-11; brought forward from 0.7.0 to this session 2026-10-12 (D129 call 3).**
  A Search tab of its own, to the left of Main, and Y on the Main tab opens it (check first that Y is free there). One find box searches your chats, the settings bonsAI can open, your own notes and the game notes, and a row of games narrows it. Word buttons built from your questions let the D-pad pick a word with no typing. A on a match jumps to it, with "Back to where you were".
  Before a word is picked, the tab lists every note you have kept, for every game, with on and off switches: the one home for notes (see **Session context and user stash**). **Decided 2026-10-12 (D129 call 7):** the Steam settings search, the settings card above the question box, moves onto the Search tab.
  Not chosen: a find line inside "N earlier", saying "find" to the mic, and the small version alone (find in the chats menu plus "You asked this before"). Was two stars. [Mock-up board, tab 8](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md) · older drawing: option 4 at https://claude.ai/artifact/CjiVzMEe8UipPda2kS2q18. What plan 92 built and the Deck passes: [archive](archive/roadmap-trimmed-2026-10-roadmap.md#plan-96-note-what-plan-92-built-of-the-search-tab)

---

## Knowledge base and RAG

Moved to its own file: [roadmap-kb.md](roadmap-kb.md) — bugs, owed checks, next steps and the calls waiting on the
maintainer. Long notes: [roadmap-kb-details.md](roadmap-kb-details.md).

---

## Shelved

Parked work and watched sightings: [roadmap-shelved.md](roadmap-shelved.md).

---

<a id="done-for-v060"></a>

## Done for v0.6.0

Everything closed since v0.5.0 (2026-07-15), one line each. Full record: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).

The Closed blocks from 2026-10-02 to 2026-10-07 (plans 79 to 82) were moved to [the archive](archive/roadmap-done-v0.5.0.md#done-for-v060) on 2026-10-07, and those from 2026-10-08 to plan 87's Deck blocks 4 and 5 (2026-10-10) on 2026-10-11, to keep this file under its size limit, newest first, copied line for line. Every entry in them is closed, so none stays here. The plan 88 and plan 87 blocks (2026-10-10 and 2026-10-11) were moved to the same archive on 2026-10-12 (plan 92 docs sweep), copied line for line. The block of 2026-10-11 for the maintainer's calls 5, 6 and 7 of D128 and the install link was moved there on 2026-10-14 (plan 93 docs sweep), copied line for line. The three blocks of plan 89's Deck blocks (2026-10-11) were moved there on 2026-10-14 (plan 93 docs sweep 2), copied line for line. The five blocks of plan 92 (2026-10-12) were moved there on 2026-10-14 (plan 93 docs sweep 3), copied line for line. Every block from 2026-10-13 to 2026-10-16 (plan 93, plan 86 steps 0 and 3, the plan 93 report answers) was moved there on 2026-10-17 (plan 94 docs sweep), copied line for line. The plan 95 and plan 94 blocks (2026-10-17) were moved there on 2026-10-18 (plan 96 docs sweep), copied line for line. The plan 96 session block (2026-10-18) was moved there the same day (plan 96 docs sweep 2), copied line for line. The plan 96 Deck blocks D and E block (2026-10-18) was moved there on 2026-10-22 (plan 97 second sweep, size trim), copied line for line.

**Closed 2026-10-22 (plan 99, the maintainer's "as they are" on the small looks; evidence: their call of 2026-10-22, plan 99 § 2 call 12):**

- ★★ `[ui]` **The tab bar's icons are hard to see on the Deck's own screen** — **DONE 2026-10-22, closed by the maintainer's eye: "as they are" (row P92-ICONS-AFTER, and P97-A-TAB-ICONS, closed).** The Deck already runs the thicker lines (`workshop:test-evidence/plan97-A-TAB-ICONS.json`). Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-99-the-small-looks-closed-as-they-are-2026-10-22).

- ★ `[tabs]` **Switching tabs with LB/RB should glide, not jump** — **DONE 2026-10-22, closed by the maintainer's eye: "as they are" (row P97-G1-TAB-GLIDE): the flash, the page slide and reduced motion are accepted without a further look.** The Deck numbers stand (40 presses, none lost, `workshop:test-evidence/plan97-P97-G1-TAB-GLIDE.json`). Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-99-the-small-looks-closed-as-they-are-2026-10-22).

**Closed 2026-10-22 (plan 97 sixth sweep: Deck block I):**

- ★★★ `[focus]` **After a Steam box, or the menu closing, Down stops moving the ring until the plugin is reloaded** — **DONE 2026-10-22, passed on the Deck on the fifth try (row P97-L14-FREEZE-try5, block I, build `334dcb91`).** With a game up 11 minutes and the page without focus, all 27 Up and Down presses moved the ring, including Down from the last answer section onto a Strategy choice (dead 10 of 10 in the fourth try); the control with focus present moved 18 of 18 (`workshop:test-evidence/plan97-P97-L14-FREEZE-try5.json`, `plan97-P97-L14-FREEZE-try5-control.json`). Fix commits: `2b924080` (logging), `6da3e2d7`, `2263aa83`, `89ee807e`, `37665106`, `24453818`, `d3d7bdf4`, `334dcb91` (git log counts nine, in three groups, not four rounds). **Not tested in that state, a follow-up and not a blocker:** Left and Right on the game's chip row (row **P97-L14-FREEZE-CHIPS** in [testing.md](testing.md); it passed with focus present in `plan97-P97-L14-SECTIONS-try2.json`). The full entry: [roadmap-details.md](roadmap-details.md#plan-97-sixth-sweep-notes-moved-from-the-roadmap-2026-10-22).

**Closed 2026-10-22 (plan 97 fifth sweep: Deck blocks G and H):**

- ★ `[reply]` **While an answer writes, it briefly shrinks by a line now and then (6 to 27 px)** — **DONE 2026-10-22, passed on the Deck on the third try (row P97-L4-ANSWER-DIPS-try3, block H, build `acbaeb72`).** Four long Strategy answers, three ending with the choice menu: the answer never rose above its final height, the biggest fall was 1.6 px, the text never held "Code block incoming", frame rate 58 to 60. The real cause was a "Code block incoming..." box flashing under a Strategy answer while the hidden choice menu's opening line was being written (`0c6bd3cd`); the two earlier fixes were aimed at the wrong cause. `workshop:test-evidence/plan97-P97-L4-ANSWER-DIPS-try3b.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fifth-sweep-closed-by-blocks-g-and-h-2026-10-22).

**Closed 2026-10-22 (plan 97 fourth sweep: Deck blocks D, E and F):**

- ★ `[ui]` **The About tab shows "Version 0.5.0" and no build id** — **DONE 2026-10-22, passed on the Deck (row P97-L6-ABOUT-BUILD).** The title line read "Version 0.5.0 · build f28c5fc4676d", the first 12 characters of the new bundle's hash. `workshop:test-evidence/plan97-P97-L6-ABOUT-BUILD.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★ `[ui]` **On the About tab the Steam-drawn "Follow system" language dropdown reads as a light button to the look check** — **DONE 2026-10-22, passed on the Deck (look check QA-LOOK-01 on About).** The look check on About reported nothing at all, the language dropdown included. `workshop:test-evidence/plan97-QA-LOOK-01-About.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★★ `[ui]` **The About reply-language pick does not apply** — **DONE 2026-10-22, passed on the Deck (row P97-L2-LANGUAGE-PICK).** Czech picked in Steam's list showed on the button and the settings file read czech 0.6 s later; it held after a plugin reload, the next answer came in Czech, and Follow system put the file back. `workshop:test-evidence/plan97-P97-L2-LANGUAGE-PICK.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★ `[focus]` **On the Ollama tab, Up from Find LAN can skip the PC address box and the Save row and land on the second switch** — **DONE 2026-10-22, passed on the Deck (row P97-L16-FINDLAN-UP).** Up from Find LAN landed on the PC address box 5 of 5; Up from the box reached the Save row and Down from it went back to the box. `workshop:test-evidence/plan97-P97-L16-FINDLAN-UP.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★ `[focus]` **After A on an open glossary word sends the Explain further question, the ring is on nothing until the next press** — **DONE 2026-10-22, passed on the Deck (row P97-L12-EXPLAIN-RING).** After the second A the ring was on the question box within 1 s in all three reads; Down moved to Ask and Up moved back. `workshop:test-evidence/plan97-P97-L12-EXPLAIN-RING.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★ `[reply]` **Maintainer's call: the glossary words are not underlined when the game is named but not running** — **DONE 2026-10-22, passed on the Deck (row P97-L5-GLOSSARY-NAMED).** With no game running, a Deep Rock Galactic: Survivor question underlined Kiting and Overclocks and A opened their box; a Hades question underlined nothing. `workshop:test-evidence/plan97-P97-L5-GLOSSARY-NAMED.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★ `[focus]` **The ring does not show properly on the "How to use bonsAI" chip** — **DONE 2026-10-22, passed on the Deck (row P97-HR-HELP-CHIP-RING); CHIP-BUTTON-06 stays open.** With the D-pad on the help chip it has the soft blue layer and keeps its green border; without focus it is the plain green bar. `workshop:test-evidence/plan97-P97-HR-HELP-CHIP-RING.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★ `[reply]` **Maintainer's ask: with the AI on a PC on the home network, the answer should stream in a little bit quicker** — **DONE 2026-10-22, passed on the Deck (row P97-L11-PC-PACE, second try); the recording goes to the maintainer's eye.** The PC pace averaged 57.1 frames a second against 56.1 for the Deck's pace over 13 whole windows. `workshop:test-evidence/plan97-P97-L11-PC-PACE-try2.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★★ `[ask]` **Asking about an attached screenshot answered "incomplete stream" and no answer, twice, with the Deck's own AI (gemma4:e2b-it-qat)** — **DONE 2026-10-22, passed on the Deck on the second try (row P97-L1-PICTURE-ANSWER); the first try failed and its cause was fixed.** The picture reached the AI in all three tries and the answers named the screen; the 410 KB one took 63 s (19 s of it a chat-summary step with the model cold) and sent 84 KB, a little over the rough 60 s and 70 KB lines. `workshop:test-evidence/plan97-P97-L1-PICTURE-ANSWER-try2.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★ `[ui]` **At the Large text size, the Remove button splits its word and a few rows are cut or touch the panel's edge** — **DONE 2026-10-22, passed on the Deck (row P97-L13-LARGE-TEXT).** At Large every arrow sat 12 px from the edge and Story spoilers showed its name on two lines with no summary; at Normal the screenshot shows no sliver either. `workshop:test-evidence/plan97-P97-L13-LARGE-TEXT.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

- ★ `[QA]` **The test rig's settings snapshot tool can save a damaged copy** — **DONE 2026-10-22, passed on the Deck (row P89-RIG-SNAPSHOT, second try).** Three saved copies, each equal to a fresh copy of the live settings folder; the first call set the ten-day-old earlier copy aside. Calls 2 and 3 refuse until call 1 is restored (noted in the full entry). `workshop:test-evidence/plan97-P89-RIG-SNAPSHOT-try2.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-fourth-sweep-closed-by-blocks-d-e-and-f-2026-10-22).

**Closed 2026-10-22 (plan 97 third sweep: blocks B and C):**

- ★★ `[focus]` **From Copy, Down with a game running landed on the "Tip" chip at only 33 % visible** — **DONE 2026-10-22, closed.** With a Tip chip showing and the game running, Down from Copy landed on Helpful, whole on screen. `workshop:test-evidence/plan97-P97-B-TIP-CHIP.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-third-sweep-closed-by-blocks-b-and-c-2026-10-22).

- ★ `[ui]` **After "Download knowledge base" brings the library back, the "Use local knowledge base" switch reads off on screen while the saved setting is on** — **DONE 2026-10-22, closed as not reproduced on two builds.** Screen and file agreed at the end of the download, 30 s and 60 s later; reopen if seen again. `workshop:test-evidence/plan97-P97-L20-KB-SWITCH.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-third-sweep-closed-by-blocks-b-and-c-2026-10-22).

- ★★ `[reply]` **Expert mode gave a shorter answer than Speed and ignored half of a two-part question** — **DONE 2026-10-22, passed on the Deck (row P96-F8-EXPERT).** Expert's median 713 characters against Speed's 572, longer in all five pairs, both parts answered 5 of 5 in each mode. `workshop:test-evidence/plan97-P96-F8-EXPERT.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-third-sweep-closed-by-blocks-b-and-c-2026-10-22).

- ★ `[focus]` **Hand-written D-pad moves on some Ollama-tab buttons never run** — **DONE 2026-10-22, passed on the Deck (row P93-B10-CANCEL, owed half).** The Ollama tab's two saved walks were recorded again with no dead press and no stop twice; the AI models screen's saved walk was not recorded again. `workshop:test-evidence/plan97-P93-B10-CANCEL.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-third-sweep-closed-by-blocks-b-and-c-2026-10-22).

- ★★ `[ollama]` **The first answer after install takes about two minutes to start, and nothing on screen says so** — **DONE 2026-10-22, passed on the Deck (row P96-F2-COLD-START; the loading-line half passed 2026-10-18).** After the starter set the model was loaded 14 s after the done line; the developer preload setting was on, so that run does not separate the two. `workshop:test-evidence/plan97-P96-F2-COLD-START.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-third-sweep-closed-by-blocks-b-and-c-2026-10-22).

- ★ `[ui]` **Cancelling the 'Turn on internet downloads?' box leaves the Ollama tab saying it failed** — **DONE 2026-10-22, passed on the Deck (row P96-F10-CANCEL).** Cancel left the status line unchanged and installed nothing. `workshop:test-evidence/plan97-P96-F10-CANCEL.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-third-sweep-closed-by-blocks-b-and-c-2026-10-22).

- ★ `[ollama]` `[ui]` **The install box does not name where the Ollama program comes from and says "Cancel installs Ollama only" when Cancel installs nothing, and "The local AI isn't installed on this Deck yet." stays on screen after the install** — **DONE 2026-10-22, passed on the Deck by the row's own sentence (row P96-F13-INSTALL-WORDS).** The box names ollama.com, its Cancel words are true (Cancel installed Ollama only), and the line went when the install finished. `workshop:test-evidence/plan97-P96-F13-INSTALL-WORDS.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-third-sweep-closed-by-blocks-b-and-c-2026-10-22).

- ★★ `[voice]` **After installing the voice engine, the open Voice input section kept saying "not installed"** — **DONE 2026-10-22, passed on the Deck (row P96-F9-VOICE-REFRESH).** The section read ready about 2 s after the last engine file landed, on the same tab. `workshop:test-evidence/plan97-P96-F9-VOICE-REFRESH.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-third-sweep-closed-by-blocks-b-and-c-2026-10-22).

**Closed 2026-10-22 (plan 97 second sweep: block A and the calls):**

- ★ `[focus]` **Settings → Data: Down from Clear cache goes to Open all instead of Clear all data** — **DONE 2026-10-22, closed as by design.** Right reaches Clear all data and Down reaches Open all. `workshop:test-evidence/plan97-A-CLEAR-CACHE.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-second-sweep-closed-by-block-a-2026-10-22).

- ★ `[ollama]` **39 frames a second while an answer writes with the game and the AI both on the Deck** — **DONE 2026-10-22, closed as accepted.** The guide's known-problems line landed (`7132850e`, the landed copy of `5cecaf42`). `workshop:test-evidence/plan94-P94-FRAME-RATE.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-second-sweep-closed-by-block-a-2026-10-22).

- ★ `[QA]` **The rig reads every folded section line as 92 percent visible** — **DONE 2026-10-22, closed as the rig's own false reading.** Lines whole by eye; the sampler is fixed in the rig's repo and passed on the Deck 2026-10-22 (row **P97-X2-SAMPLER**, block D1): 19 stops on Settings and Developer with the sections folded, every one 100 percent, read as text, none clipped (`workshop:test-evidence/plan97-P97-X2-SAMPLER.json`). `workshop:test-evidence/plan97-A-CLIPPED-LINES.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-second-sweep-closed-by-block-a-2026-10-22).

- ★ `[ui]` **On the Settings and Developer tabs, some section lines read 92 % visible during a walk** — **DONE 2026-10-22, closed as the same false reading.** `workshop:test-evidence/plan97-A-CLIPPED-LINES.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-second-sweep-closed-by-block-a-2026-10-22).

- ★ `[ui]` **The chat name row reads 83 % visible when focused** — **DONE 2026-10-22, closed.** It read 100 percent and whole; 83 was not seen. Reopen if seen again. `workshop:test-evidence/plan97-A-CLIPPED-LINES.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-second-sweep-closed-by-block-a-2026-10-22).

**Closed 2026-10-22 (plan 97 go day: the calls and the maintainer's eye checks):**

- ★★★ `[chips]` **Preset chips cannot always be reached near the end of an answer** — **DONE 2026-10-22, closed on the maintainer's word (the checks page, 2026-10-22); reopen if seen again.** The rig never reproduced it in six rounds (plan 93). This replaces call 4 of [D134](audit/maintainer-decisions-locked.md#d134--locked-2026-10-22-raised-2026-10-22--plan-97-the-bug-list-and-the-verify-list-toward-zero-the-second-sweep-the-ten-calls). `workshop:test-evidence/plan93-M3-CHIPS-NEAR-END.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-go-day-the-calls-and-the-maintainers-eye-checks-closed-2026-10-22).

- ★ `[ollama]` **qwen2.5vl should not be the model downloaded first** — **DONE 2026-10-22, closed on the calls alone.** The installer half is by design since plan 96's call 2 (the Update button downloads Ollama again while internet downloads are on); the button half passed on the Deck 2026-10-17. `workshop:test-evidence/plan94-P94-STARTER-SET.json`, `plan94-P94-INSTALL-OLLAMA.json` (earlier box and run: `plan93-P93-B3-STARTER-DECK-D3.json`). Row **P93-B3-STARTER-DECK**. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-go-day-the-calls-and-the-maintainers-eye-checks-closed-2026-10-22).

- ★★★ `[layout]` `[focus]` `[chips]` **While reading an answer, the Show details line takes the suggestion chip's place above the question box** — **DONE 2026-10-22.** Every step had passed on the Deck or was closed as cannot be done on 2026-10-18 (the right stick does not scroll the panel). `workshop:test-evidence/plan79-P79-DETAILS-SLOT.json`, `plan83-P79-SHOW-DETAILS-SLOT-S6.json`. Row **P79-SHOW-DETAILS-SLOT**. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-go-day-the-calls-and-the-maintainers-eye-checks-closed-2026-10-22).

- ★★ `[ui]` **Calmer rating choices under an answer** — **DONE 2026-10-22, the look passed on the maintainer's eye (the checks page, 2026-10-22).** The D-pad and size part passed on the Deck 2026-10-02. `workshop:test-evidence/plan79-P79-M7-RATING-ROW-AFTER.json`. Row **P79-M7-RATING-ROW**. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-go-day-the-calls-and-the-maintainers-eye-checks-closed-2026-10-22).

- ★★ `[reply]` **Streamed answers arrive with the same scramble as the decode chips** — **DONE 2026-10-22, the look (SCR-01) and the frame-rate verdict (SCR-03) both passed on the maintainer's eye (the checks page, 2026-10-22).** SCR-03 is 43 to 44 frames a second with a game running, accepted with the scramble switch off by default. `workshop:test-evidence/plan79-SCR-10-MISSION.json`. Rows **SCR-01**, **SCR-03**; SCR-09 and SCR-10 stay with the frame-rate entry in Verify. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-97-go-day-the-calls-and-the-maintainers-eye-checks-closed-2026-10-22).

**Closed 2026-10-18 (plan 96 Deck block G, build `73738058`, the Deck's own screen):**

- ★ `[ui]` **Find LAN shows for everyone, beside the PC address, on the Ollama tab and in the first-run popup** — **DONE 2026-10-18, passed on the Deck on both screens (rows P96-FINDLAN, P96-FINDLAN-try2; `46e24b39`, then `b5c3c3cb`, `bf57b0f0`, `128cbe0b`).** After A on Search the button reads "..." at once and a "none found" line shows at 9 s (the maintainer's PC does not advertise itself, which the row allows); the line is in plain words now. `workshop:test-evidence/plan96-P96-FINDLAN-try2.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-96-deck-block-g-find-lan-on-the-ollama-tab-closed-2026-10-18).

- ★ `[focus]` **After B on the Find LAN "Search / Cancel" box the ring goes to the tab bar, not back to the Find LAN button** — **DONE 2026-10-18, passed on the Deck (row P96-FINDLAN-try2, `9938ef18`).** B on the Search box puts the ring back on the Find LAN button, as the five other boxes do. `workshop:test-evidence/plan96-P96-FINDLAN-try2.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-96-deck-block-g-find-lan-on-the-ollama-tab-closed-2026-10-18).

- ★ `[focus]` **On the Ollama tab, Down from the PC address field skips Test connection and Find LAN** — **DONE 2026-10-18, passed on the Deck (row P96-FINDLAN-try2, `bf57b0f0`).** Down from the address box lands on Test connection, Right on Find LAN, Left back; no dead press, no skipped stop. `workshop:test-evidence/plan96-P96-FINDLAN-try2.json`. Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-96-deck-block-g-find-lan-on-the-ollama-tab-closed-2026-10-18).

**Closed 2026-10-18 (plan 96 Deck block F, build `24f5c300`, the Deck's own screen):**

- ★ `[ui]` **The thinking line's spinner no longer turns: it sits as a still three-quarter circle** — **DONE 2026-10-18, passed on the Deck with a game running (row P96-F24-SPINNER, `8a06456e`).** The spinner turned at a new angle in all 68 half-second samples and no glow ran; the page's frame rate read a median of 60 against plan 94's 39 (slices not tagged as writing or not) (`workshop:test-evidence/plan96-P96-F24-SPINNER.json`). Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-96-deck-block-f-the-spinner-and-the-confirm-boxes-closed-2026-10-18).

- ★★ `[chips]` **Maintainer's ask: each chip shows its whole text twice before changing** — **DONE 2026-10-18, passed on the Deck (row P96-F22-CHIP-TWICE, `57829f6c`).** Seven overflowing chips each scrolled to the end, stood about a second, jumped back, scrolled again, stood, then changed; a chip that fits stayed 10.7 s without scrolling (`workshop:test-evidence/plan96-P96-F22-CHIP-TWICE.json`). Whether the row should change less often is still the maintainer's eye (see the size-and-pace line below). Full entry: [archive](archive/roadmap-completed.md#closed-2026-10-18-plan-96-moved-from-verify).

- ★★ `[ui]` **Every confirm box: the action button on the LEFT, Cancel on the RIGHT, the ring starting on Cancel; the buttons drawn like the Beta Notice's Got it button** — **DONE 2026-10-18, the rule stands; passed on the Deck on five boxes and the first-run popup (row P96-CANCEL-RIGHT; commits `5d3a846b`, `51b78a0c`, `d27cf477`, `24f5c300`).** Two notes: the AI models tick opens no box (it queues the model; nothing to change), and after B on the Find LAN box the ring left for the tab bar (fixed, passed 2026-10-18, row P96-FINDLAN-try2) (`workshop:test-evidence/plan96-P96-CANCEL-RIGHT.json`). Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-96-deck-block-f-the-spinner-and-the-confirm-boxes-closed-2026-10-18).

**Closed 2026-10-18 (plan 96 hand checks, the maintainer's own hand, the Deck's own screen, build `f7413dbc` or `bba825e5`):**

- ★★★ `[voice]` **The mic stops after about 3 or 4 seconds of speech** — **DONE 2026-10-18, passed by hand with the real microphone (row P89-MIC-TINY).** The maintainer spoke three questions into the real microphone and answered Pass, "looks good" ([checks page](https://claude.ai/artifact/FTe9Lr1sS2Kfrj8nBTVrhi), check 4); the picture shows the box reading "Testing 1, 2, 3, 4. What do you hear in my message?" while recording (`workshop:test-evidence/plan96-HAND-real-mic.png`). Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-96-hand-checks-the-real-microphone-closed-2026-10-18).
- ★★ `[voice]` **After pressing Stop on the mic, the next mic press does not work** — **DONE 2026-10-18, passed by hand with the real microphone (row P88-VOICE-STOP-THEN-MIC).** Same hand check 4, same Pass and picture (`workshop:test-evidence/plan96-HAND-real-mic.png`). Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-96-hand-checks-the-real-microphone-closed-2026-10-18).
- ★★ `[voice]` **A spoken question sometimes comes out with its words doubled** — **DONE 2026-10-18, passed by hand with the real microphone (row P79-DOUBLED-WORDS).** Same hand check 4, same Pass and picture (`workshop:test-evidence/plan96-HAND-real-mic.png`). Full entry: [archive](archive/roadmap-bugs-fixed.md#plan-96-hand-checks-the-real-microphone-closed-2026-10-18).

