# bonsAI Roadmap

> **Clean-up task — trim this file. Done 2026-09-15.** The other four big documents each carry their own trim
> task at the top; the roadmap entry that tracks all five is under Features.
>
> Reading this now costs roughly **19,000 tokens**, and the house rules say it is read before any work is marked
> done, so that cost lands on every piece of work. Together with the testing rows, trimming both saves about
> **31,000 tokens per landing**.
>
> **100 KB down to 83 KB.** 2026-09-13: the finished list moved to the archive. 2026-09-14: the parked entries moved
> to their own file, the old decisions under *Calls waiting on you* dropped to a pointer, the longest entries reworded,
> and six finished items moved to Done and archived. 2026-09-15: a seventh finished item split so the part that still
> fails stays visible, the knowledge-base opening stopped quoting numbers it then retracts, and the three longest
> entries sent their reference detail to the details file.
>
> **What is left is not worth taking.** Thirty-four entries still run past five lines, but most by only a line or
> two, and the ones that run long are long because the work is. Grinding those down would cost more in understanding
> than it saves in tokens. The bigger wins are now in the other four files, each with its own trim task at the top.

Open bugs, work fixed but not yet confirmed on the Deck, planned features, parked work, and what shipped for v0.5.0. Five
lists plus one section for the knowledge base, each sorted from one star to six.

- **Knowledge base and RAG, all in one place:** [its own section](#knowledge-base-and-rag) — bugs, owed checks, next steps
  and the calls waiting on the maintainer, with [a status report](planning/37-rag-status-report.md) kept in step with it.
- **Long notes for open items:** [roadmap-details.md](roadmap-details.md)
- **Shipped features, full detail:** [archive/roadmap-completed.md](archive/roadmap-completed.md) · **Fixed bugs, full detail:** [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md)
- **Parked work, full detail:** [archive/roadmap-shelved.md](archive/roadmap-shelved.md) — one line each in [Shelved](#shelved).
- **What shipped for v0.5.0, one line each:** moved out to its own file to keep this one small — [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).
- **Maintainer decisions (D1 onward):** [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md)
- **QA rows and device evidence:** [testing.md](testing.md), [testing-manual.md](testing-manual.md) · **Release notes:** [CHANGELOG.md](../CHANGELOG.md)
- **Checks only the maintainer can do** — the standing list, kept as a tickable page:
  [Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
  Anything a session finds that needs their eyes or their fingers is added there, not left in a chat.

## House rules for this file

1. **An entry is at most five lines**, in plain language, and says what a user would notice. Anything longer goes to
   [roadmap-details.md](roadmap-details.md) (open) or [archive/](archive/) (finished) and is linked, never deleted.
2. **Three lists for live work: [Bugs](#bugs), [Features](#features), [Verify](#verify)** — except knowledge-base work,
   which keeps its bugs, owed checks and plans together in [Knowledge base and RAG](#knowledge-base-and-rag). A new entry goes
   straight into the right list at its star position (ascending; within a star band by tag, then by title) with a tag. Do not
   add sub-headings beyond Verify's own **Bugs** / **Features** split and the knowledge-base section's own lists.
3. **Status words in Bugs and Features:** **OPEN** (nothing built) · **PARTIAL** (some of it built) · **ACCEPTED** (the
   maintainer chose to live with it). Nothing else — as soon as something is fixed and unit-tested, it moves to **Verify**
   rather than taking a fourth status word.
4. **When code lands that fixes a Bugs entry or ships a Features entry, but a Deck check is still owed:** move the entry, in
   the same commit, out of Bugs or Features and into Verify's matching sub-list (name the QA row). **When the Deck check
   passes:** move it again, same-commit, into [Done](#done-for-v050) as one line, with the full entry going to the matching
   archive file. Never leave a finished item sitting in Bugs or Features, and never mark one with a strike-through.
5. **Stars** are effort and risk on the GTA scale: `★` easiest … `★★★★★` very high; `★★★★★★` extreme scope.
6. **Tags:** `[ask]` Ask bar and input · `[chat]` chat slots · `[chips]` preset chips · `[focus]` D-pad and focus ring ·
   `[KB]` knowledge base · `[layout]` Main tab layout and vertical space · `[ollama]` models and routing · `[perms]` permissions ·
   `[platform]` build, deploy, tooling, upstream · `[QA]` testing · `[reply]` the answer itself · `[tabs]` the tab bar ·
   `[ui]` everything else on screen · `[voice]` voice.
7. **Parked work lives in [Shelved](#shelved)**, not in Bugs or Features: one line saying what unshelves it, with the
   full entry in [archive/roadmap-shelved.md](archive/roadmap-shelved.md). Move the whole block back when it restarts.

**Every Main-tab UI change also owes the free-play sweep** (standing row **QA-FREE-PLAY-01** in
[testing-manual.md](testing-manual.md)): walk the pane like a user and require every focused stop to also be visible.

**Maintainer note (2026-09-05): pick the model before you pick up an item.** ★–★★ Sonnet 5 high · ★★★–★★★★
Opus xhigh plans, Sonnet lanes implement when the cause is known · ★★★★★+ Fable max plans only, Sonnet lanes build,
Opus xhigh lands · `[focus]` `[layout]` `[ui]` measure on the Deck first, then Opus xhigh, never a lane without the
measurement · docs and bookkeeping Sonnet or Opus medium. The full policy — the bookkeeper guard, the escalation rule,
the Haiku trial — is in [AGENTS.md § 3](../AGENTS.md), the evidence in
[planning/33-model-routing.md](planning/33-model-routing.md). A prompt-time hook gives a gentle heads-up when a session
starts work outside this.

---

## Bugs


- ★ `[ask]` **The blinking cursor in the question box does not line up with the placeholder text** — **OPEN,
  reported by the maintainer 2026-09-15 evening, a recurring sight.** The cursor sits a few pixels up and a
  little to the left of the greyed "Describe the level, boss, or puzzle you're stuck on." **Measured on the
  Deck the same evening:** the placeholder is drawn in its own layer at a 10-pixel font with a 12-pixel line;
  the real text field underneath, whose caret is the cursor a person sees, uses a 12-pixel font with a
  14.4-pixel line — about 2 pixels taller — so the two can never line up while they are two different font
  sizes. Evidence `docs/test-evidence/plan55-BUG-cursor-placeholder-offset.json`.
- ★ `[focus]` **Up from the Retry icon does not return to the answer** — **OPEN, read again 2026-09-16.**
  With the thumbs-up/thumbs-down row greyed on a stopped reply, Down from the answer now lands on Retry — but
  Up from Retry does not go back to the answer's last section the way it should. **Read again 2026-09-16:**
  the lane building the D-pad fixes nearby read this code and judged it stale rather than change anything, so
  no fix landed. It stays open and awaits a device re-check to say whether it still happens.
- ★ `[focus]` **Down does not move the ring off an unrevealed spoiler block** — **OPEN, found 2026-09-04, did not reproduce
  2026-09-05.** With the ring on the hidden block, Down reported the press arriving and nothing moving. Retried today on a fresh
  Red Dead ending reply with a real hidden block on screen: **Down left it normally**, straight onto the branch picker's first
  button, and every stop on the walk was fully visible. So the hidden state does not trap on its own. Most likely the same
  underlying fault as the stuck panel below — both are a hop that dies only sometimes — and best closed with it rather than
  chased separately. Evidence `docs/test-evidence/round35-spoiler-block-down-and-up.json`.
- ★ `[focus]` **The Open Permissions jump lands one toggle above the one it was asked for** — **OPEN,
  measured 2026-09-16 on build 0fbecb6.** The Open Permissions button under a blocked reply is a real
  D-pad stop now and A on it does reach the Permissions tab, but the highlight lands on "Save files to
  Desktop", one row above the "Steam ban lookup" toggle it was supposed to land on. Evidence
  `docs/test-evidence/plan56-PERM-JUMP-01-open-permissions.json` (the jump itself),
  `docs/test-evidence/plan56-SMOKE-C-01-toggle-off.json`, `docs/test-evidence/plan56-SMOKE-C-02-toggle-back-on.json`
  (the setup and restore steps around it). **The *Back to …* return half passed 2026-09-16:** pressing it on
  the Permissions tab returns to the Main tab with the highlight back on the Open Permissions button that
  started the jump. Evidence `docs/test-evidence/plan56-PERM-JUMP-01-back-to-main.json`,
  `docs/test-evidence/plan56-PERM-JUMP-01.summary.json`. **Seen again 2026-09-16** on the Steam-settings card:
  pressing A on a row there also opens the right Steam page with the highlight one toggle above the row that
  was pressed, the same shape. Evidence `docs/test-evidence/plan56-SETTINGS-CARD-DPAD-01.summary.json`.
- ★ `[focus]` **With Show details open, the chip row cannot be reached by the D-pad** — **OPEN, measured
  2026-09-16 on build 0fbecb6 and again on build `ca12429`, so it is not something this session's own commits
  caused.** Open Show details on a reply and press Down to step into its chips and read one — the ring skips
  the whole chip row and lands on the Session context bar instead. Seen on an instant built-in reply and on a
  real model reply with seven chips ("Chip 1 of 7" on screen); either way only the first chip can ever be
  read, and only by starting there before opening anything else. It worked before: the closed
  CONTEXT-LADDER-01…03 row (verified on the Deck 2026-09-05) had Down entering the chip row and Up walking
  back out. Evidence `docs/test-evidence/plan56-BUG-chip-ladder-unreachable.json`,
  `docs/test-evidence/plan56-CONTEXT-LADDER-03-caseB-details-open.json`,
  `docs/test-evidence/plan56-SPY-REVEAL-01-ladder-walk.json`.
- ★ `[focus]` **Reaching the Stop generation button by D-pad while a reply is streaming is hard to find** —
  **OPEN, found 2026-09-16.** With a reply still being written, Down from the question box stalls (Ask is
  disabled) and Down from the live streaming answer never reaches Stop generation either; the only route found
  is the question box, then Right onto the Ask-mode button, then Right again onto Stop generation. Two long
  replies finished on their own before the ring reached the button by other routes. Not a trap, since Stop can
  still be reached — just not where a person would first look. Evidence
  `docs/test-evidence/plan56-GREYED-STEP-OVER-02.summary.json`.
- ★ `[layout]` **An open question's row is only partly visible behind the Retry corner icon** — **OPEN,
  seen at every visit 2026-09-15 evening.** With the newest turn open, the ring on the question's inner row
  reads 67% visible, covered by the Retry same-prompt icon in the corner. Evidence
  `docs/test-evidence/plan55-QUESTION-COLLAPSE-RING-01.json` (step 1),
  `docs/test-evidence/plan55-DRG-01d-second-question-send.json` (step 1). **Seen again in the free-play sweep
  2026-09-15**, at 78% visible behind the same icon, in both directions of the walk — the plugin's own rule
  counts a focused-but-not-fully-visible stop as a failure regardless of the percentage. Evidence
  `docs/test-evidence/plan55-QA-FREE-PLAY-01-main-long-reply.json`.
- ★ `[layout]` **On the Deck's built-in screen, the ring's own stop for a whole reply sits mostly under the
  question box** — **OPEN, found 2026-09-16.** A long reply is one D-pad stop for its whole body on this
  build; reaching it with Up from Read aloud shows only about a third of it, the rest hidden under the sticky
  question box. The screen shows about 143 pixels of chat, far less than a typical reply, so most of any long
  answer sits out of view however it is reached; not something this session built. Evidence
  `docs/test-evidence/plan56-LEFT-HOLDS-01.summary.json`. **Related, seen 2026-09-16:** on this same screen, a
  tall answer chunk swallows the first Up or Down press or two — Steam scrolls the chunk's own view before it
  lets the ring leave — so those presses read as dead rather than moving the highlight. Not a trap, since the
  next press does leave. Evidence `docs/test-evidence/plan56-QA-FREE-PLAY-02.summary.json`. **Not a bug,
  settled 2026-09-16 (D106):** the Ask bar the maintainer saw cut off on 2026-09-15 was Steam keeping the
  external monitor's size after the monitor was unplugged; a restart of Steam put it right; the session's own
  measurement on a fresh open found nothing clipped.
- ★ `[ollama]` **The vision try-order picker writes settings even when nothing changed** — **OPEN, found
  2026-09-16 during block 0 of session 56.** Opening the vision model try-order picker and pressing Done
  writes the picker's current order into the settings file, even when nobody moved anything. Restored by hand
  at the end of the block; no evidence file yet.
- ★ `[reply]` **The slow-reply footnote reads as a broken sentence** — **OPEN, found 2026-09-16.** Under a
  reply that took longer than a minute, the footnote reads "61.5s (>60s): prefer for , not ." on screen — the
  model name and the mode name it should name are both missing. A wording bug, not a functional one: the
  timing and the suggestion to switch models are otherwise correct. Evidence
  `docs/test-evidence/plan56-GREYED-STEP-OVER-02.summary.json`.
- ★ `[ui]` **A new setting can quietly stop working in one place, because the list of settings is written out by hand
  several times over** — **OPEN, found while explaining the code 2026-09-14.** The settings code repeats its fifty-odd
  setting names in several separate places in the same file. Miss one and nothing breaks visibly; that setting just stops
  being saved or loaded in one situation while working fine everywhere else. It has already happened once, to four
  settings. Tracked as "places the settings field list is repeated", at 7 against a target of 1.
- ★★ `[chat]` **A new chat shows the previous chat's last reply until the panel is reopened** — **OPEN, seen
  2026-09-15 evening.** With a reply still on screen in one chat, moving the chat row to the new-chat position
  and pressing A made the new chat, but the new chat then showed that earlier reply underneath it, with "…"
  standing in for the question, its Helpful, Not really and Copy buttons all reachable, and a Session context
  row showing one turn. Closing the panel and reopening it left the new chat empty, the way a new chat should
  always start. Evidence `docs/test-evidence/plan55-trap-run3-new-chat-with-live-turn.json` (the walk from the
  chat row visits Retry, the "…" question, Copy reply text and Read aloud under the New chat slot).
- ★★ `[focus]` **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a
  blanket rule was tried and reverted in favour of Steam's native outline.
- ★★ `[reply]` **Token streaming reveals text in bursts while a game is running** — **ACCEPTED 2026-09-04 (D58 #4).** Measured 2026-08-28 with
  a game running: tokens arrive in bursts, and during a burst the overlay drops to 47 fps; between bursts it is a flat 60. Delivery
  is bursty, painting is not slow. The game's own frame rate is unmeasured. Accepted as a nice-to-have; reopen only if the game's own frame rate is measured
  and suffers. Making streaming the default stays a separate feature call. Row **STREAM-11**. [Detail](roadmap-details.md#token-streaming-reveals-text-in-chunks-while-a-game-is-running).
- ★★ `[voice]` **Two things wanting the voice server at once would cut the first one off mid-sentence** — **OPEN,
  found while explaining the code 2026-09-14.** The speech-to-text server is shared, and it is started for one particular
  speech model. If a second caller asks for it with a different model, it restarts to suit the second, and the first is
  never told — it simply finds the server gone. Only one thing uses it today, so nothing is broken now. It becomes real
  the moment a second listener is added, a wake word for example.
- ★★★ `[focus]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** —
  **OPEN, found 2026-09-05.** Down walked as far as the answer and stopped dead: ten presses, no movement, Left and Right
  dead too, only Up escaping. The Ask button, the preset chips and the question box were all on screen below and none
  could be reached. It happened on a chat with history and on a brand new empty one, in both Ask modes, so the mode is
  not the cause. **Only a Decky loader restart clears it**, not a panel reopen — so this is stale navigation state, not a
  permanently trapping control. **A fix landed 2026-09-05, but the entry stays here rather than in Verify**, because the
  fault never reproduced on demand, so nothing proved the fix against it. It closes only when the panel is driven hard
  over time and the state does not come back. The unrevealed-spoiler entry above is most likely the same fault and closes
  with it. The mechanism, the signature to chase and every run:
  [detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  **Reproduced on demand 2026-09-15, which this entry has been waiting for.** It happened twice in one
  sitting, both times within seconds of starting a **brand new, empty chat while the panel was showing a
  Session context row** — that is, while the session still carried turns from another chat. Down, Left and
  Right all did nothing from the question box and only Up escaped; the character button, the mode chip and
  the Ask button were all on screen and none could be reached. Emptying the box first made no difference, so
  it is not the text. Restarting the plugin cleared it both times. Three walks in the same sitting where
  that row was absent, or the chat already had a reply in it, all reached the Ask button normally. That is
  five observations, not proof of a cause, but it is a recipe to try. Evidence
  `docs/test-evidence/plan48-BUG-ask-input-ring-trap-2026-09-15.json`.
  **Five more runs on 2026-09-15 evening, on build 1ac4d7a, and it did not come back once.** Run 1: a new chat
  started from a chat with eight turns while the Session context row showed. Run 2: the box filled from a chip
  press, then every direction. Run 3: a question asked first so the row carried a live turn, then a new chat.
  Run 4: the same, plus the box filled from a chip. Run 5: an empty new chat with the row still showing one
  turn, after the plugin was reopened with Hades running. Every Down, Left and Right from the box moved where
  it should, every time. The entry stays **OPEN**. Evidence
  `docs/test-evidence/plan55-trap-run1-walk-after-new-chat.json`,
  `docs/test-evidence/plan55-trap-run2-chip-fill-then-dpad.json`,
  `docs/test-evidence/plan55-trap-run3-new-chat-with-live-turn.json`,
  `docs/test-evidence/plan55-trap-run4-chip-fill-with-live-turn-row.json`,
  `docs/test-evidence/plan55-trap-run5-empty-chat-session-row-hades-running.json`.

---


## Features

**Standing goal from the maintainer (2026-08-30):** buy back as much vertical room for the chat bubbles as possible; every
`[layout]` entry serves it. Items rated ★★★★★ or above carry a placeholder link to [bonsAI Issues](https://github.com/qd313/bonsAI/issues) in the archive;
replace it with a specific issue when one exists.

- ★ `[ask]` **Intent packs later review** — **OPEN.** Decide whether the quiet intent-pack search aliases are deleted, left quiet, or
  revived under Developer. Not in scope: re-shipping Proton journal inject without a redesign. **New evidence 2026-09-06 (D79):**
  the bundled Deck basics list ships switched on and is the *only* reason a whole sentence ever matches a setting — its 88 words
  match when your sentence contains one of them, so *can you help me with performance* returns three results. The maintainer folded
  that finding into this entry. [Detail](planning/45-settings-shortcut-card.md#5-two-things-about-the-search-that-are-not-obvious).
- ★ `[ui]` **A leftover piece of state from the deleted settings-card keyboard marker** — **OPEN, found
  2026-09-16 while landing the settings card's real D-pad wiring.** The plugin's main file still keeps a
  `selectedIndex` value that only the old fake on-screen marker ever read, and two other files still pass it
  through even though nothing acts on it any more. Nothing a person notices; removing it touches three files
  (`src/index.tsx`, `src/components/MainTab.tsx`, `src/features/plugin-shell/tabs/useMainTabPayload.tsx`).
- ★★ `[chat]` **A quiet cue that a cut question can be opened** — **OPEN, filed 2026-09-05 by the maintainer.** When the ring lands on
  a question bubble that has been cut short, nothing on screen says the rest is there. Chosen 2026-09-05 from four drawn options: the
  text fades out at the right-hand edge instead of ending in three dots, only while the ring is on it, nothing for a finger. Nothing
  is added and nothing shifts. The same fade already sits in the stylesheet with no user, written for cut-off answer bubbles.
  One check owed first: the question bubble turns its own outline off and gets no ring rule, so look on the Deck at what focus shows.
- ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.** The create position is the
  literal `[+]`, re-confirmed on board 8f and again in the v3 rows. Reopen that decision before building it.
- ★★ `[chips]` **Make the preset chips look more like chips** — **OPEN, asked for by the maintainer 2026-09-13.** Four
  small changes, and all of them subtle — nothing that reads as a redesign: about half a pixel of space between the chip and
  the text box beside it, so the two stop touching; the chip's surface shaded more like a raised button; the accent colour
  toned down, because today it is too loud; and the label in italics, worth trying. The point is that a chip should read as a
  pressable thing rather than part of the input. Drawn in a separate Claude Design session; the maintainer judges it by eye.
- ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed 2026-09-08. Not yet
  (D99, 2026-09-12): it waits for its own go.** The model would be asked to start every answer with one short sentence that
  carries the point and gives nothing away, so the reply-ready popup, a spoken answer and any headset card always have a good
  first line to show. Sits beside Terse mode without replacing it. No headset or PC test needed.
  **The count that decided it ran 2026-09-12:** 2 of 10 answers already opened with a sentence that stands alone, and 0 of 10
  gave anything away. By the rule the maintainer locked (D97 call 4), that poor score means build it — then they read the
  count and said not yet. **When the go comes, the first step is still to count the 2026-09-07 answer-first run the same
  way**, because that run may already be the change. Stars stay at two. [Plan](planning/49-steam-frame-features.md) ·
  [Second look § 2](planning/52-frame-features-second-look.md#2-headline-first-the-weakest-one-and-what-to-do-instead) ·
  [Bench findings § 4](planning/53-steamvr-bench-findings.md#4-the-headline-first-count-run-the-same-morning) ·
  [The count, sentence by sentence](planning/assets/53-headline-count-2026-09-12.md).
- ★★ `[reply]` **The answer's first lines in the reply-ready toast** — **OPEN, planned 2026-09-05, calls locked (D63).** When an
  answer finishes while the menu is closed, the toast says only *Reply ready*. It would read *bonsAI* over the first lines of
  the answer, in every mode, for eight seconds, so a short answer is read without leaving the game; tap still opens the panel.
  Hidden blocks are skipped; if nothing safe is left the toast stays as it is. **Measure first, on two screens with screenshots:**
  the Deck's own screen and a 24-inch 1080p monitor; the popup is expected to be small. [Plan and mockup](planning/38-toast-answer-lines.md).
- ★★ `[reply]` **Which bundled characters copy a real person** — **OPEN, filed 2026-09-08 (D74); the gate for the shelved character
  voices.** All 31 characters in the picker are named characters from games or TV, each voiced by a real actor, and one is a living
  comedian's own persona. A written sweep, one line per character: who owns the character, whose voice it is, and whether a voice for
  it could be made as a type rather than a copy. Text roleplay sits on the first layer today; any voice would sit on all of them. No
  code; a document the legal check reads. [Memo](planning/42-read-aloud-feasibility.md).
- ★★ `[ui]` **Replace the bonsAI tab icon with the redesign's** — **OPEN, and no longer waiting on a drawing.** Flatter,
  more silhouette, because it renders at 14px. **Checked 2026-09-05: the redesign document never actually draws one**, and the
  maintainer has said they do not want to supply one. So whoever builds it proposes a shape and the maintainer approves it by
  eye — a shape is not something to settle from a description or by reaching for a stronger model. It has to be an inline SVG
  path rather than the PNG so it takes the colour around it. Update the icon geometry test in the same change.
- ★★ `[layout]` `[voice]` `[focus]` **Read aloud is a small speaker button on the Helpful row, not a second dividing
  line** — **OPEN, filed 2026-09-16 by the maintainer (D106).** Today: Read aloud is a full-width dividing line above Show
  details, the same shape as Show details, one row up, drawn by the reply-actions row builder
  (`src/utils/buildReplyActionsElement.tsx`); its text flips to Stop while the Deck is talking
  (`src/hooks/useReadAloud.ts`). Wanted: a small button with a speaker icon on the same row as Helpful and Not really (the
  Feather icon set the plugin already uses, `react-icons/fi`, has a speaker, `FiVolume2`); the dividing line goes. What it
  must keep: a real D-pad stop registered under the same name (`read-aloud` in `replyStopRegistry`) so the by-name jumps
  still work; Left and Right along the row; the flip to Stop in the icon and the spoken label; and it must stay reachable
  when the thumbs are greyed, because the greyed-thumbs step-over from lane I (commit `e41808d`) skips a greyed Helpful /
  Not really row, and Read aloud on that row must still be a stop. What changes when it lands: Up from Show details lands
  on that row; the MICRO-04 testing row's "today's stops" text and READ-ALOUD-02 need rewording; the mockup page drew Read
  aloud as a line and would change too.
- ★★ `[voice]` **Spoilers by voice** — **OPEN, filed 2026-09-08; Read answers aloud shipped 2026-09-12, still waits on Voice
  follow-ups.** When a spoken answer reaches a hidden spoiler it says "there is a spoiler here, say go on to hear it" and waits;
  "go on" unhides and reads it, anything else skips it. The block on screen unhides with the spoken one, so the two never
  disagree. The Deck alone is enough to test. [Plan](planning/49-steam-frame-features.md).
- ★★ `[voice]` **Voice follow-ups** — **OPEN, filed 2026-09-08; Read answers aloud shipped 2026-09-12.** For a few seconds after a spoken
  answer ends, the mic listens for a handful of words: again, go on, stop, next tip. No wake word needed, since the mic opens only
  in that window and closes on silence. The words a person needs when they cannot reach the Deck or scroll. The Deck alone is
  enough to test. **The maintainer set the exact shape 2026-09-11:** a short rising tone when the mic opens right after a spoken
  answer, the mic keeps listening as long as it hears something, and a short falling tone when it closes. Four words: again, go
  on, stop, next. One setting, off by default. The middle position of the Voice replies setting (D99) is the signal this
  hangs off: an answer to a spoken question is read out, then the mic reopens. [Plan](planning/49-steam-frame-features.md) ·
  [Second look § 3](planning/52-frame-features-second-look.md#3-voice-follow-ups-a-sound-a-short-listen-a-few-words).
- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16 on the Deck's built-in
  screen, no single cause, not built in plan 56.** On the Deck's own 1280 by 800 screen the panel is 454 pixels tall, not
  the 696 every earlier number assumed. There is no gap above the dock at all, because even a two-turn chat overflows the
  panel by 321 pixels and scrolls under the dock: a person sees about 143 pixels of chat, roughly three lines. The fixed
  rows take 311 of the 454 pixels before any chat: Steam's header (64), the tab bar plus its reserve (24), the chat slot
  row (54), a 12-pixel gap, and the dock (157). Getting more chat on this screen means shrinking or hiding one of those
  rows, which is a design call for the maintainer, not a fix. External-monitor record:
  [planning/30-collapsing-tab-bar.md](planning/30-collapsing-tab-bar.md) § 8 ·
  [plan 56 block 0](planning/56-feature-session-four.md#block-0--hygiene-and-three-measurements-the-session-alone-about-forty-minutes).
- ★★★ `[layout]` **Session context folds into Show details** — **OPEN, shape decided 2026-09-16 (D106): a tab within the
  Show details panel, option B on the mockup page.** The **Session context (N turns)** bar stops being its own row, so a
  settled answer costs one collapsed control instead of two. As drawn: the opened Show details panel gets two tabs at its
  top, *This answer* and *Session · N*; Left and Right switch between them; the chip row and its body stay where they are;
  only the newest turn shows the Session tab, so it never repeats; the collapsed row still says *Show details*; Up from the
  tabs goes to Hide details and then Read aloud, Down goes into the chips, and B anywhere inside closes the panel. One
  thing the page did not draw: where Clear sits inside the Session tab. The builder puts it at the end of that tab's body,
  the same button and the same confirm box, unless the maintainer says otherwise.
  [Open questions](roadmap-details.md#session-context-folds-into-show-details).
- ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — **OPEN, research spike.** Hold models loaded, or unload when a game takes
  focus on the Deck APU? The spike decides go or no-go; no production unload before it.
- ★★★ `[ollama]` **Per-mode latency timeouts** — **OPEN, weighed and deliberately not built 2026-09-05.** Separate warning and
  give-up values per Ask mode. It was the sixth candidate in round 36 and was dropped on purpose, said in advance rather than
  discovered late: it is the largest of that set — the two existing values already run through sixteen files each and going per mode
  triples them — and the least of them for a person, since it changes when a warning appears rather than what the plugin can do.
- ★★★ `[platform]` **Trim the five documents that are still big** — **PARTIAL: one of five done 2026-09-15.**
  Nothing a person using the plugin would notice; this is about what every piece of work costs before it starts. Five files
  carry a trim task at the top of each, with its own star rating, time and model. **This file is done (2026-09-14 and 15) — 100 KB to 83 KB,
  about 3,700 tokens off every landing.** Four left. The next one that matters is the testing rows, because the house rules
  say those are read before anything is marked done too. The biggest single win is the locked decisions file at 89,000
  tokens a read. Do them one at a time; each is its own small job.

- ★★★ `[platform]` **The eleven long files, left long on purpose** — **OPEN, filed 2026-09-15 at the end of the clean-up's
  reshape phase.** Nothing a person using the plugin would notice. The clean-up decided up front not to split the plugin's main
  screen file or the big screen pieces this round: each is a day's careful work on code that draws things, and a mistake there
  is visible. This entry is the promise that they were left on purpose rather than missed, with today's sizes so nobody has to
  measure again. **Screen side:** the plugin's main file (1,709 lines), the model download window (1,385), one style sheet
  (1,344), the where-the-AI-runs settings section (1,310), the animated chips row (1,232), the chat transcript (1,221), the Ask
  bar (1,079), and a list of emoticons that is just a list (1,023 — splitting it would gain nothing). **Back-end side**, which
  the clean-up's plan did not name and which is worth its own decision before anyone starts: the knowledge base service (2,092),
  the prompt builder (1,571), voice transcription (1,294) and the AI service (1,270). **Two worked examples already exist** from
  this phase — the question chips and the reply rating both came out of the Ask file as their own pieces, each with a test
  written at the same time, and the order-of-hooks record is what made both safe. Do them one at a time, each with its own Deck
  check. [Plan](archive/51-refactor-round-two.md).

- ★★★ `[reply]` **The Spy opens as somebody else** — **OPEN, split off 2026-09-15 (D105).** On a random chance his first message
  introduces him as a different character from the list and he keeps it up. A character has no first message today, so this
  needs a greeting feature first and is its own job, not a line of prompt text. Decide before building: how often, whether the
  picker still shows Spy while he claims otherwise, and how the reveal reads when the person thought they had picked someone
  honest.
- ★★★ `[reply]` **Terse mode: Speed answers in three lines** — **OPEN, planned 2026-08-29, nothing built.** A toggle beside the
  reply-style slider, off by default, capping a Speed answer at three lines. It overrides the slider and the character; destructive
  warnings and the depth phrases escape it. The real work is widening the branch picker (D40). **TERSE-01** passes at 8 of 10.
  [Detail](roadmap-details.md#terse-mode-speed-answers-in-three-lines).
- ★★★ `[ui]` **Adjustable text size in Settings** — **OPEN.** `uiScalePx()` already runs through the stylesheet; the work is exposing it,
  deciding what must not scale (icons, the 300px column), and paying the settings plumbing. [Detail](roadmap-details.md#adjustable-text-size-in-settings).
- ★★★ `[ui]` **Search density** — **OPEN.** Tighter, more scannable results with highlighted match tokens.
- ★★★ `[voice]` **Full-quality reading from a LAN PC** — **OPEN, deliberately not built 2026-09-08 (D74); reopened only if the
  local port fails its Deck test.** For a person whose Ollama already runs on a PC in the house, that PC could also run OmniVoice as
  a speech server and read every answer in the full character voice, five to forty times faster than real time on its graphics card.
  Not offline, so never the default. Dropped on purpose, said in advance: a speech server is a second program on the person's PC with
  its own heavy install and an address to paste into Settings, the most setup the plugin has ever asked of anyone, and the one-time
  voice step it would speed up is a wait of minutes on a Deck and seconds on anything stronger. The entry stays so the reason is on
  record. [Memo](planning/42-read-aloud-feasibility.md).
- ★★★ `[voice]` **Headset mode** — **OPEN, filed 2026-09-08; waits on Read answers aloud and Wake-word listening.** One switch
  that turns on the wake word, reads every new answer aloud on its own, and asks the model to answer for the ear: two or three
  sentences, no lists. Made for a visor on your face and a Deck across the room. A PC with SteamVR and any headset helps with one
  question only: whether the headset's mic reaches the PC during a streamed game. **No headset is being bought for now (D97 call
  3); this waits for the Frame.** [Plan](planning/49-steam-frame-features.md).
- ★★★ `[ollama]` **How fast is this model on this Deck** — **OPEN, planned 2026-09-06, calls open (D75).** Next to each installed
  model, how fast it answered on this Deck the last time it was used, and a button to time it now with one fixed question. The
  numbers already exist on every answer; the plugin keeps a last-ten record per model with the game that was running, shows a
  badge in the picker and a plain line under Show details, and never reorders anything. The bake-off's Deck half becomes one
  press per model. [Plan](planning/43-model-speed-readout.md).
- ★★★★ `[ask]` **Connection doctor** — **OPEN, planned 2026-09-05, calls locked (D64).** When an Ask fails, a **Fix this** button
  under the failed reply runs the checks the plugin already has, shows the one that failed, and offers the one thing to do
  next with a button that lands you on that control on the Ollama tab. It only offers; nothing changes without a press.
  **Save a report** inside it, and a typed command, write a read-only report of the setup to the Desktop: the former
  **Deck health snapshot**, folded in here. [Plan](planning/39-connection-doctor.md).
- ★★★★ `[ask]` **Session context and user stash** — **OPEN.** Live session facts plus user-editable notes for Ask. No embeddings, no cloud.
- ★★★★ `[ollama]` **LAN custom model pull** — **OPEN.** Blocked until a mechanism is chosen (R1 to R4). Depends on **Custom model in
  the Pull Models picker**.
- ★★★★ `[perms]` **Web permission** — **OPEN, discovery locked.** Opt-in live web answers; offline Ask and local KB when off. Kids
  lock forces it off. [Discovery](planning/web-permission-discovery.md).
- ★★★★ `[platform]` **Llama.cpp provider spike** — **OPEN, research only.** Go or no-go against Deck-local Ollama. Prior:
  [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md).
- ★★★★ `[platform]` **Steam Input layout parse** — **OPEN.** Parse controller VDF configs for control context. Not in scope: writing
  configs.
- ★★★★ `[reply]` **A note pinned in space** — **OPEN, filed 2026-09-08; needs the SteamVR panel first.** In a headset, park the
  answer on a wall or table beside you. It stays there while you play, so a checklist becomes a sticky note you glance at between
  fights. Worth testing on a PC with SteamVR now: the built-in pretend headset can show a panel fixed in the room, and a real
  headset judges whether it reads. **No headset is being bought for now (D97 call 3); this waits for the Frame.**
  [Plan](planning/49-steam-frame-features.md).
- ★★★★ `[reply]` **A wrist panel** — **OPEN, filed 2026-09-08; needs the SteamVR panel first.** In a headset, a small panel rides
  on one controller. Turn your wrist, read the answer, drop your hand and it is gone. No pointer needed. Worth testing on a PC
  with SteamVR now, but only with a real headset and tracked controllers; the pretend headset has no hands. **No headset is
  being bought for now (D97 call 3); this waits for the Frame.** [Plan](planning/49-steam-frame-features.md).
- ★★★★ `[ui]` **SteamOS Share path** — **OPEN.** Faster path from Share and capture flows into screenshot attach where APIs allow.
- ★★★★ `[ui]` **SteamOS spin hint card** — **OPEN.** Detect immutable spins and deep-link to troubleshooting.
- ★★★★★ `[ollama]` **On-Deck model benchmark** — **OPEN, descoped on 2026-09-06, one call open (D75).** Rank installed models by measured
  speed and completion; offer as try order with confirmation. Its own gate said: if timings do not hold still, descope to a
  one-shot readout. That readout is now its own three-star entry, [plan 43](planning/43-model-speed-readout.md), and its record
  of timings answers the gate over time. Whether this line retires is D75. **First input, 2026-09-05:** the desk survey of this
  quarter's models in [41-deck-model-survey.md](planning/41-deck-model-survey.md); the calls are D72.
- ★★★★★ `[perms]` **VAC Phase 2: opponent IDs** — **OPEN, research.** Surface live opponent identities for ban checks when metadata allows.
- ★★★★★ `[platform]` **Controller macro test rig and live view** — **OPEN, discovery locked 2026-08-23, board ordered.** A bridge board
  the Deck sees as a real controller, a macro runner gated on real UI state, and one recording pipeline. Primitives land upstream in
  decky-plugin-studio. Next: spikes S1 to S3. [Plan](planning/19-controller-macro-test-rig.md), [program](planning/21-ai-owned-testing-program.md).
- ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN.** AI copy tuned to gen-2 hardware.
- ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; the first step is a ★★ test to find
  out.** bonsAI's panel floating over any VR game, drawn by a small program on the PC that runs SteamVR, so it serves every
  SteamVR headset and the Frame comes along. Not a Decky plugin. The in-game answer surface that is blocked on the Deck is open
  here. **Locked rule (D97):** the panel goes only through SteamVR's own panel door and never touches the game itself — in file,
  in memory or in input — because anything else risks an anti-cheat ban for someone playing online with bonsAI open. Best
  effort: each game's anti-cheat sets its own policy, and the README will say so once the panel ships.
  **Bench result, 2026-09-12: the panel works.** A panel showing a sample bonsAI answer appeared inside the headset view over a
  running SteamVR scene, with no plugin code at all, drawn entirely through SteamVR's own door. The in-headset menu is confirmed
  to be a web page, the same way the Deck's menu is. **Two things still unknown:** pointing at the panel, because the pretend
  headset has no controllers and a real one is needed; and whether the small notification card SteamVR accepted actually drew on
  screen. [Plan](planning/49-steam-frame-features.md) · [PC setup](planning/50-steamvr-pc-setup.md) ·
  [The anti-cheat rule in full](planning/52-frame-features-second-look.md#4-the-floating-panel-and-anti-cheat) ·
  [Bench findings](planning/53-steamvr-bench-findings.md) · [The picture](planning/assets/53-panel-in-headset-2026-09-12.jpg).
- ★★★★★ `[reply]` **Reasoning display** — **OPEN, ready to build, calls locked (D70, D71, D106).** The plugin asks a
  thinking model to think and throws the thinking away; the line under your question shows a stock phrase for the whole wait.
  Planned: three lines at the answer's size show the model's own newest sentences, fold to one line with the seconds when the
  answer starts, open to the full text; Show details gets a thinking chip; and the thinking is also spent deciding what counts
  as a spoiler for you. The Deck's default model can think. A test runs on the PC first, then the Deck. **Dropped from session
  56 by the maintainer 2026-09-15 (D105): drawn first.** The three live lines, the plain folded line and the folded line in a
  character's voice are drawn at true size on a mockup page at the end of [plan 56](planning/56-feature-session-four.md); every
  build call stands, and nothing is built until the maintainer has looked. **Drawn at true size on the mockup
  page** https://claude.ai/artifact/2De58qirE34754PEZVPmdb **(2026-09-16). The maintainer's call, 2026-09-16 (D106):** the
  first version builds with the plain folded line, exactly the shape the 5 September calls describe — three live lines at
  the answer's size while the model thinks, one folded line with the seconds once the answer starts, and a press on the
  folded line opens the whole reasoning. The folded line in a character's own voice is split off into its own optional
  entry, below, and is not built until this first version is in and looked at. The spoiler-verdict second job waits with
  it, as before.
  [Plan](planning/40-reasoning-display.md).
- ★★ `[reply]` **The folded reasoning line in the character's own voice** — **OPEN, optional, filed 2026-09-16 (D106).**
  Builds only after the reasoning display's first version has landed and been looked at. The mockup page showed the same
  folded line written by the model itself in three characters' voices: Ali G, "See the booyakasha · 41 s"; GLaDOS, "Expose
  the inefficient calculations · 41 s"; the Spy, "Révéler le raisonnement · 41 s" — the longest of the three still fits the
  row at the small size. Not decided yet: how the voiced line gets written, a fixed phrase per character or the model asked
  once each time, and it must fall back to the plain line whenever the character is off or the phrase is missing.
  [Mockup page](https://claude.ai/artifact/2De58qirE34754PEZVPmdb).
- ★★★★★ `[voice]` **Wake-word listening** — **OPEN, beta.** Opt-in always-on local wake **bonsAI**, then STT, then a quiet Ask.
  [Feasibility](planning/10-wake-word-listening-feasibility.md).
- ★★★★★★ `[platform]` **Deep mod AI hints** — **OPEN.** Detect mod frameworks and files; mod-aware guidance.
  [Feasibility](planning/12-deep-mod-ai-hints-feasibility.md).
- ★★★★★★ `[platform]` **Native QAM shortcut tile** — **OPEN, upstream research.** A separate left-rail entry beneath the Decky icon.
  [Feasibility](planning/11-native-qam-tile-feasibility.md).
- ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp** —
  **OPEN, filed 2026-09-08. Not yet (D99, 2026-09-12): nothing is built until the maintainer says.** The floating panel needs
  bonsAI to run outside Decky, which is what the Native QAM shortcut tile research keeps circling, and any model on the Frame
  itself runs through llama.cpp, not Ollama. Three entries, one question: **does bonsAI grow a second way to run.** Decide it
  once. **The gap underneath it: there is no network door into bonsAI's Python side today**, so a panel on the PC would have a
  screen and no brain.
  **The price is now known, which is what D97 call 2 asked for.** The check ran 2026-09-12: the plugin's Python side started
  outside Decky on the maintainer's Windows PC behind a fifty-line stand-in for Decky, nine calls the frontend normally makes
  all came back with a working answer, and it reached Ollama on that PC. So "run the same Python side on the PC too" is a
  priced decision rather than a guess. What is missing: a small starter program, a way for a panel to reach it on the same
  machine, and PC-shaped answers for which game is running, the speaker, and the screenshot folder. llama.cpp stays closed.
  [Plan](planning/49-steam-frame-features.md) ·
  [Second look § 5](planning/52-frame-features-second-look.md#5-the-second-way-to-run-the-gap-plan-49-underplayed) ·
  [Bench findings § 3](planning/53-steamvr-bench-findings.md#3-the-plugins-python-side-on-this-pc-it-runs).
- ★★★★★★ `[platform]` **Remote Play diagnostics layer** — **OPEN.** Streamed-gameplay answers weight encode latency and host-vs-client
  fixes. Noted in [09-steam-frame-companion-feasibility.md](archive/09-steam-frame-companion-feasibility.md) § B8.
- ★★★★★★ `[reply]` **In-game answer surface** — **OPEN, split 2026-09-05.** Read an answer without leaving the game. The full
  overlay is upstream-gated and stays here as research. The unblocked slice, the toast carrying the answer's first lines, is its
  own ★★ entry above, planned in [38](planning/38-toast-answer-lines.md). Reframed 2026-09-08: the same surface is open in a
  headset through SteamVR on the PC; see **The floating panel inside SteamVR** and [49](planning/49-steam-frame-features.md).

---



## Verify

Fixed, unit-tested and shipped, but not yet confirmed on the Deck. Owed QA row named in each entry; full evidence in
[testing.md](testing.md) / [testing-manual.md](testing-manual.md). Once a Deck run confirms one, move it in the same commit: a line into
[Done](#done-for-v050), the full entry into the matching archive file, drop it from here.

### Checks whose evidence never existed
- ★★ `[QA]` **Twelve checks read as proven with nothing behind them** — **VERIFY, found 2026-09-13 during the
  clean-up.** Twelve checks name a saved Deck recording as their proof. None of those recordings exists, and the project's whole
  history shows none ever did — they were never written, not lost. So twelve results were written down as passing on the
  strength of a file nobody can open, and whether they really passed is unknown. Nothing here says the plugin is broken; it says
  we do not know. Re-run all twelve together in the next automated testing session. Batch **QA-EVIDENCE-GAP-01**, listed with
  each row in [testing.md](testing.md). Until a run produces real evidence, treat all twelve as unknown rather than as a pass.

### Bugs that need verification
- ★ `[platform]` **Clear all plugin data left three things behind** — **VERIFY.** Found 2026-09-05 when the maintainer
  asked for the wipe to be best-effort. Three flags remembering that the plugin had already warned about a knowledge base problem
  are spelled with an underscore where everything else uses a colon, and the wipe only looked for the colon. After wiping
  everything the plugin still believed it had warned you, so it stayed quiet when it should have spoken up. Fixed to match the
  bare word, which catches both spellings and clears the old ones off devices that already carry them. The New labels in the pull
  picker go with it. Three tests. Row **CLEAR-ALL-PREFIX-01**. **Run on the Deck 2026-09-16, once the
  maintainer's pre-authorised wipe (D105) went ahead:** every one of the eight plugin keys in the browser's own
  storage was gone afterwards, the New labels among them — a clean pass for everything the wipe had to remove.
  **The one thing this row was filed for stays unmeasured:** none of the three underscore-spelled flags this
  fix targets happened to exist on the Deck at wipe time, so the run could not show whether they, specifically,
  now go with the rest. Evidence `docs/test-evidence/plan56-WIPE-01.summary.json`. The same wipe also removed
  the Deck's own local AI program and every model it had downloaded; a backup of settings and chats cannot
  bring those back, and Ask on this Deck is down until "Run AI on this Deck" is switched back on.
- ★ `[focus]` **Walking down a reply and walking back up visit different stops** — **VERIFY, fixed
  2026-09-15.** Down and Up through a reply now stop at the same places in both directions. Row
  **REPLY-STOPS-MIRROR-01**: on a reply with two paragraphs, a spoiler block and a two-button menu, check the
  Down stops and the Up stops are exact mirrors of each other.
- ★ `[ollama]` **Mistyping one model name in a several-model download loses it without saying so** — **VERIFY,
  fixed 2026-09-15.** Downloading several models at once now says which name it could not find and still
  starts the good ones, instead of quietly dropping the bad one. Row **PULL-MISSING-NAME-01**: on the Ollama
  tab's pull picker, choose two real models plus a name the registry lacks, press Pull selected, and check for
  a toast that says the download started and names the one it could not find.
- ★ `[reply]` **Attaching a screenshot puts a line of technical text at the bottom of the answer** — **VERIFY,
  fixed 2026-09-15.** The line is gone from the reply; the counts it carried now go to the verbose log only.
  Row **ATTACH-DEBUG-01**: ask with a screenshot attached and check the answer ends with no bracketed debug
  line.
- ★★ `[focus]` **A checklist the model got wrong was left in the reply as raw JSON**, its own D-pad stop that did nothing — **VERIFY.**
  Fixed 2026-08-28: a rejected checklist block is dropped, as a rejected branch block already was. Owed: one sighting on device of a
  reply where it happens. Row **STRAT-CHECKLIST-JSON-01**.
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** —
  **VERIFY, landed 2026-09-15.** The tab bar's pop-up strip now always ends fully hidden a fraction of a second
  after it closes, even when its fade is stalled by a game running full screen, so no see-through copy of it
  can be left sitting over the suggestion chips. The exact reason the fade stalls could not be proven on the
  rig, which has no touch, so the fix force-finishes the close with a plain timer either way. Row
  **TAB-BAR-GHOST-01**, needs a finger, and it is on the maintainer's checklist.
- ★★★ `[chat]` **Clear cache cleared the screen but not the session** — **VERIFY.** Fixed and confirmed 2026-08-27, and again on the
  Deck 2026-09-03. The orphan half is measured: the chat stays behind after a clear, so each clear-and-reask cycle leaves one more
  chat in the rotation — a follow-up, not a regression. Only the mid-generation half is still owed: clearing while a reply is still
  being written (unit-tested, not reproducible by hand yet). Row **CLEAR-CACHE-01**. [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).
### Features that need verification

- ★★ `[ollama]` **Expert offers the stronger Deck-run models first, and the licence list learns the Sept 2026
  models** — **VERIFY, landed 2026-09-16 (commits `0dbf25c`, `f812a9e`, `19e3396`).** In the download picker's
  Expert (large) group the five stronger Deck models now come first in bake-off order: Gemma 4 12B, Qwen 3.5
  9B, Granite 4.2 8B, Gemma 4 E4B, LFM 2.5. Gemma 4 and Granite now count as open source under the default
  open-source-only setting, and LFM as open-weight. **The order half passed on the Deck 2026-09-16:** with
  Essentials only off, the Expert (large) group read in the locked order, the five bake-off models first,
  then the three older ones. Evidence `docs/test-evidence/plan56-EXPERT-ORDER-01.json`,
  `docs/test-evidence/plan56-EXPERT-ORDER-01-essentials-off.json`. **Still owed:** the licence half — in the
  AI models hub, checking a Gemma 4 tag reads as allowed at the open-source-only tier — was not read this
  pass. Row **EXPERT-ORDER-01**. [Bake-off](planning/41-deck-model-survey.md).
- ★★ `[chips]` **A glow when the chip row runs out of chips** — **VERIFY.** Built at the desk 2026-09-05 under D62 #3: press Left or Right past the first or last suggestion chip and that chip glows briefly, the way a phone lights up the end of a list. Nothing about the row’s existing edge behaviour changes. Reduced motion keeps the cue and drops the movement. **No measurement closes this one** — whether it reads as *end of list* rather than *error* is the maintainer’s call from a recording, and it is on their checklist.

- ★ `[ollama]` **Pulled models join the model try order** — **MOSTLY VERIFIED on the Deck 2026-09-06, one case left.**
  A model pulled from the picker landed at the **bottom** of the text list, and showed up in the vision list because it can
  read pictures — while a text-only model and the embedding one stayed out of that list. What is still owed is the opposite
  placement: with *Allow high-VRAM model fallbacks* on, a **large** pulled model is supposed to go to the **top** instead.
  That needs a large model on the device and the switch turned on. Row **ROUTING-MERGE-01**.

- ★ `[platform]` **Shell state and tab payload extraction (refactor step 8)** — **VERIFY.** Smoke: six tabs, one Ask, Ollama tab
  after Clear all plugin data. Row **SHELL-PAYLOAD-01**.
- ★ `[platform]` **VAC check (`bonsai:vac-check`) on-device QA** — **VERIFY.** Implementation complete; run **VAC-02…06** after Tier 0
  **SMOKE-F** passes.
- ★★ `[chat]` **The game a chat belongs to, above its title** — **VERIFY.** Shipped 2026-08-30 in quiet text above the slot title;
  only chats created after that date carry the name. Row **CHAT-SLOTS-V3-14c**. It costs a line of height, which cuts against the
  vertical-space goal; decide whether it shows always or only when the row has focus.
- ★★ `[QA]` **Deferred manual QA** — **VERIFY.** Tier 0 smokes (SMOKE-A, C, F) then Tier 1 (SMOKE-E, H), and a broader prompt-testing
  pass. SMOKE-B was retired 2026-09-03 (D57 #6). Round in progress: [plan 31](planning/31-deck-verification-round.md).
- ★★ `[reply]` **Thinking line fixes from 2026-08-07/08** — **VERIFY.** Emoji upright, lazy status tag survives, no bare-emoji phase
  changes, one writer. Rows **THINKING-EMOJI-01**, **THINKING-SANITIZE-01**, **THINKING-EMOJI-CLUSTER-01**, **THINKING-COPY-01**,
  **THINKING-SLOW-01**, **THINKING-LIVE-01**, **THINKING-SPOILER-01**. [Log](planning/06-thinking-blurbs-review.md#10-implementation-log).
- ★★ `[reply]` **Token streaming Phase A/B** — **VERIFY.** Start stutter fixed, sections as D-pad stops, scroll follow. Rows
  **STREAM-REVEAL-01**, **STREAM-09**, **STREAM-FOLLOW-01**. [Review](planning/05-token-streaming-review.md).
- ★★★ `[ask]` `[focus]` **Steam settings shortcuts: the card floats, the D-pad walks in and out, tap outside to
  close** — **VERIFY, all six steps of plan 45 now landed 2026-09-16 (commits `2d92240`, `cdc3759`,
  `bc6c668`, `7b08acf`, `55dbcca`).** Typing into the question box no longer grows a list of Steam settings
  under the box that shoves the box, the chips and the chat up the screen; the list floats in a small card
  above the box instead, holds up to eight rows but never more than fit under the tab bar (about six on the
  Deck's own screen), names the rest as "N more" in its heading, and hides itself once you are typing a real
  question. Up from the question box now walks the real highlight onto the nearest row, Up and Down step
  between rows, Down from the bottom row returns to the box, A opens that Steam setting, and B — or a tap
  anywhere outside the card, for a mouse or a finger — closes the card for that search while keeping the
  typed words; the suggestion chips above the box stay out of reach while the card is open. The old fake
  on-screen marker and its keyboard-only handling are gone. **Measured before the fix, 2026-09-16, on the
  Deck's built-in screen:** two letters brought back 71 rows and the box jumped 209 pixels to the top of the
  panel while the chat disappeared under the list (`docs/test-evidence/plan56-M-settings-jump-before.json`).
  **Confirmed on the Deck 2026-09-16, build `ca12429`:** the box holds still, the card caps at six rows and
  reads "Steam settings · 65 more" — but the card's surface let chat text underneath show through it; fixed
  the same session in commit `55dbcca` and re-checked the same day on a later deploy, confirmed solid. **The
  D-pad wiring confirmed on the Deck 2026-09-16 too:** Up from the box reaches the nearest row, Up and Down
  step between rows, Down from the bottom row returns to the box, a chip is out of reach while the card is
  open, and B (or a tap outside, for a mouse or a finger) closes the card and keeps the typed words. **A on a
  row does open the Steam setting**, though the highlight lands one toggle above the row that was pressed —
  the same known shape as the Open Permissions bug — and **the typed words are not kept when you come back
  from the jump**, which the row's own text expected; whether they should survive is a question for the
  maintainer, not decided here. The six-row cap on the Deck's own screen is the maintainer's call, looked at
  and kept (D106); whether the typed words should survive the jump is now logged as an open call in D106,
  left open on purpose, and this entry does not wait on it. Evidence `docs/test-evidence/plan56-SETTINGS-CARD-01.json`,
  `docs/test-evidence/plan56-SETTINGS-CARD-DPAD-01.summary.json`.
  [Plan](planning/45-settings-shortcut-card.md) ·
  [Mockups](https://claude.ai/code/artifact/1ab2a570-2ae5-45cd-b12b-332694f96fd5). Rows **SETTINGS-CARD-01**
  through **04** have passed; **05** (A opens, the return matches) passed for the jump but not for keeping the
  words, so it stays open; **06** and **07** are landed and owed on the Deck.
- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09. Rows **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01**
  (and **KIDS-LOCK-02** with a child account). Live CEF Stage 0 confirmation still owed.
- ★★★ `[reply]` **Soft reply-length cap and thinking budget** — **VERIFY.** Shipped 2026-08-10. Sub-check 02 verified; 01, 03 and 04
  automated with a Deck confirm owed; 05 needs a real thinking model. [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).
- ★★★★ `[ollama]` **Speed-mode VRAM preload** — **VERIFY, the mechanism proved on the Deck 2026-09-05, the timing not.**
  A Developer switch, off by default, loads the model Ask will use into memory at start-up. **A bug was found and fixed on the
  device:** it warmed the first small model installed rather than the one Ask reaches for, which on this Deck were different, so it
  spent memory on a model no question would touch. It now uses Ask's own resolver, and warms nothing when Ask's model is over the
  three-billion cap — which is what happens on this Deck, confirmed. **Still owed:** the timing comparison (**PRELOAD-01**), which
  needs a Deck whose Ask model is under the cap, and the memory-pressure case (**PRELOAD-02**). Open and untouched: whether the
  model survives the Deck sleeping.
- ★★★★ `[chips]` **Preset row: two chips across, with scrolling labels** — **VERIFY.** Rebuilt 2026-09-01 under D43. Two 30px chips
  side by side, a long label scrolls through Steam's `Marquee`, the help chip owns the row until dismissed. The dock went 245 to
  161px. Rows 02 and 03 passed on device; owed **04** only (scroll feel by eye, decode churn, reduced motion); 01b passed 2026-09-03.
  Closes the label-overflow bug. [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
- ★★★★ `[tabs]` **The tab bar collapses when not in use, and names the tab** — **VERIFY.** Shipped 2026-09-02 (plan 30 W0 to W6): a
  20px bar with the active tab's name at rest, opening to a strip that labels all six. Steam's header 81px to 20px. Rows 01 to 06,
  09 and 10 pass; owed **TAB-BAR-07** (legibility by eye) and **08** (touch). Closes the "tab names never appear" bug and D44.
  [Plan](planning/30-collapsing-tab-bar.md).
- ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30; the layout inverts to slot row, transcript, presets,
  Ask bar. Most rows pass on device. Owed: **CHAT-SLOTS-V2-01, 03, 04**, **V3-05a/b**, **06a/b/c**, **07**, **15d**.
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
- ★★★★★ `[platform]` **Global quick-launch macro** — **VERIFY.** Guide-chord docs in [troubleshooting.md](troubleshooting.md) § 5; the
  checklist was never run on hardware.

---

## Knowledge base and RAG

Everything about the game notes and the search that feeds them, in one place, so you can open this file and pick up
where you left off. **Read first:** [the status report](planning/37-rag-status-report.md) — the zoomed-out picture, what
each next step buys a person, and rough costs. It is kept in step with this section. Architecture:
[knowledge-base.md](knowledge-base.md). The agreed answer-quality work: [plan 30](planning/30-kb-answer-quality-plan.md).

Same rules as the lists above: five lines an entry, stars ascending in each list, a fix moves to **Deck check owed** and
then to [Done](#done-for-v050) in the same commit. The one difference is that the knowledge base keeps its bugs, its owed
checks and its plans together here instead of spread over three lists.

**Where things stand (2026-09-07, after wave three).** **293 notes over 25 games, plus 156 Deck tips.** Wave two
added 27 notes and 32 tips. **Of the 72 questions a player might plainly ask about the twelve games added this
month, 64 now have a note** — the other eight were written on purpose to have none, so every question that was
meant to have an answer has one.

**Finding the right note.** On questions nobody tuned against, the search puts the right note in the top three
**84 times in a hundred, up from 80**. Every one of the 21 notes written in wave two is found in the top three for
its own question, and 12 come first. Across all 72 questions about the new games, **58 find their note in the top
three where 38 did**. Two rows out of 413 got worse against 24 better.

**The answer the Deck's own model writes**, over 61 questions with the corrected checks: it keeps the note's facts
**76.6 times in a hundred**, never contradicts its note **94.4**, attaches a note whenever one is due **100**,
shows the branch menu when due **98.6**, and comes out clean on all three runs **60.7**.

**Do not compare those against any older figure in this project.** Two faults were found and fixed in wave three:
the check could mark a right answer wrong for using different words than it expected, and it could miss a reply
that flatly said the opposite of its own note. The search test had also been reading a copy of the library from
31 August for weeks. Every answer and search number quoted before wave three carries one of those faults. The full
before and after is in [wave three's report](planning/48-kb-wave-three-session.md).

**Getting to the troubleshooting tips is where the wave fell short.** The tips themselves are much better — crash went
from 2 to 9, sound 1 to 8, picture 1 to 8, performance 2 to 10, controller 6 to 10, and the top crash tip no longer
tells someone to check a desktop that game mode does not have. But of 24 fresh sentences written by someone who had not
seen the rules, **6 reached the tips before and 8 after**. The rules are still phrase-shaped: they catch the exact
wording someone imagined and miss the neighbour.

**Pick up here, in order.**

**Wave three ran on 2026-09-07** ([48](planning/48-kb-wave-three-session.md)), after wave two's own Deck
evening ran the same evening, once the Deck was free.

1. ~~**Finish the device evening.**~~ **Done 2026-09-15.** The two checks that had never run — the honesty
   line, and tips still attaching when one fits — both pass on the device. The speed check passes three
   times with its fix. The one row still blocked is the *No tip for this* line, because no question yet
   found reaches the tip sheet and comes back empty, so there is nothing for it to fire on.
2. ~~**Fix the speed check.**~~ **Done.** It now refuses to pass a reading taken without a reply first, and
   read 547, 23 and 28 thousandths of a second against a one-second budget on 2026-09-15. Read that with
   the range in mind — the number swings with what is loaded in memory.
3. **Decide how to finish follow-ups.** The search half works on the device — it looks up the right thing
   you were just asking about — but the answer can still be about something else, and one run in three still
   names the wrong boss (its own bug below). The options for finishing it still need writing up.
4. **Work out why the note search has been getting slower since August.** About thirty per cent slower and
   still climbing, with no explanation yet.
5. **Then wave four** — writing more notes.

**Wave two's own evening ran 2026-09-07** and wave three ran the same day; the results and the bug write-ups are
in [wave two's report](planning/47-kb-wave-two-session.md) § 8 and [wave three's](planning/48-kb-wave-three-session.md).
The five optional August rows were not run, and New Vegas still is not installed.

**A library point release went out 2026-09-07** carrying the corrected Black Mesa water note and nothing else — 293
notes, 156 tips, 25 games, unchanged. Installed on the Deck and checked: asked about the flooded rooms, the reply now
says the current is constant, says not to try to time it, and points at the wall switch that cuts the power. The old
advice to wait for a gap is gone. Evidence `docs/test-evidence/plan48-R5-blackmesa-corrected-note.json`.

### Calls waiting on you

**Nothing waiting.** A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md); the knowledge-base
ones from this month are D81 to D88.

### Bugs

- ★★ `[KB]` **Unrelated questions still get game cards stapled on** — **ACCEPTED 2026-08-27.** With a game running, *"thank
  you very much"* still attaches a card. Raising the keyword floor costs real matches, and the model mostly ignores an
  irrelevant card. [Detail](roadmap-details.md#ordinary-phrases-attach-game-cards).
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back
  2026-09-06, re-measured 2026-09-07 and still held (D52, D81).** The fix does reach further: with nothing running, all 24
  fresh plainly-worded problem sentences get into the search, against 8 without it, and *"thank you very much"* still
  attaches nothing. **But what comes back is wrong** — six measured examples, each attaching a tip about something else
  entirely, such as the on-screen keyboard for *"game wont even open"*. A wrong tip is worse than none, which is the same
  objection that held it the first time. **The cause is now clear, and it is the useful part.** The meaning search only
  runs when nothing else finds anything, and that almost never happens: a plain word search across 156 tips nearly always
  finds something by shared words, so it wins first with a poor match and the meaning search never gets a turn. **What is
  missing is not a wider gate — it is a way to say "none of these tips fit."** Until there is one, opening the gate makes
  things worse. The real fix is rewriting the tips, filed as its own entry below. All six wrong tips:
  [detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).
- ★★★ `[KB]` **Searching the notes by meaning costs about a second, every time, on the Deck** — **ACCEPTED
  2026-09-06.** Repeated on the Deck: 1.10, 1.23 and 1.19 seconds across three questions in a row, the same band as
  the first time this was measured. The maintainer looked at the number and said that is fine — about a second before
  an answer that then takes tens of seconds to write out is not something a person would notice. **The one-second
  target this was measured against is retired.** The related finding still stands: the idea that only the first
  question after a quiet spell is slow holds on a PC, where a repeat came back in 0.05 seconds, but not on the Deck,
  where the third question here was no faster than the first. (D84) Evidence `docs/test-evidence/round34-drg-q*.json`,
  `docs/test-evidence/plan46-R2-strategy-half.json`.
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** The weight sweep ran: leaning the search toward meaning gets the right note first about four to six
  points more often, but it also buries a brand-new note whose meaning index has not been built yet, which the current
  weights deliberately protect against. **Not lifted until every note is guaranteed to have its index before it can be
  searched.** Two other objections — a strong exact word match losing to a weaker meaning match, and a locked routing
  rule no longer holding — are not covered by that rule and still need answering if this is ever revisited. Weights
  stay even for now. (D68, D82) [Detail](roadmap-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against).

- ★★★ `[KB]` **A follow-up still names the wrong boss one run in three** — **OPEN, left behind when the follow-up
  fix closed 2026-09-12.** Ask about a boss, then *"what about its second phase"*, and you now get the right boss two
  times in three, where it used to be wrong every time. The remaining third still names the rival boss. DOOM Eternal
  is wrong every time, and no amount of work on the search can close that one. This is the half the shipped fix did
  not cover, kept visible on purpose rather than archived with it. [Numbers](planning/48-kb-wave-three-session.md).
  (D98)
- ★★ `[KB]` **The "No tip for this" line has no question that can make it appear** — **OPEN, measured off the
  device 2026-09-12.** Against the library that ships, on every sentence anyone has tried: the five hardest problem
  sentences still get a tip in every mode, meaning search on or off; the twelve junk phrases attach nothing, which
  routes nowhere, so no line. The floor this wave added changed nothing on the tip side — 14 right, 1 wrong, 2
  nothing, before and after. Either the floor bites on tips or the line is decoration.
- ★★ `[KB]` **Four questions still get notes about the wrong subject** — **OPEN, three of the four now say so,
  found 2026-09-07.** Asking Black Mesa how to tame a horse, asking Portal 2 where to buy a house, and asking about
  a Hades boss that does not exist all still attach a note. The floor added this wave cannot catch these without
  also throwing away twenty or more correct answers elsewhere in the library, so it was left as it is. **Three of
  the four now carry the new "no close match" line** (D88 above), so the answer no longer reads as grounded — but
  the wrong note is still attached and still shapes the reply. *"Where do i buy a house"* gets no line at all,
  because a word in it really does point at a card. Fixing the attachment itself, rather than labelling it, is
  wave-four note-writing work.

### Deck check owed

- ★ `[KB]` **Five checks from the August retrieval rework were never run on the Deck** — **VERIFY, or retire.** The corpus
  format gate, the relevance floor, follow-ups searching the user's words, transparency matching what the model got, and
  the Developer kill-switch. Either one evening with pinned test chips, or close them as superseded by the rows that
  passed this week. **Run 2026-09-15: the relevance-floor row is really two checks bundled as one, and they point
  opposite ways.** Its on-topic half is a real regression guard worth keeping. Its off-topic half — an unrelated
  question should attach nothing — fails as written, but that failure is the behaviour the maintainer already accepted
  on 2026-08-27 in the "Unrelated questions still get game cards stapled on" entry above; the row and that entry now
  contradict each other, which is for the maintainer to settle by retiring or rewording one of them. Rows
  **KB-VARIANT-01**, **KB-FLOOR-01**, **KB-FOLLOWUP-01**, **KB-TRANSPARENCY-01**, **KB-KILLSWITCH-01**.
- ★ `[KB]` **A Hades boss's note is spelled wrong, so spelling it right gets you told the plugin is guessing** —
  **VERIFY, fixed 2026-09-15, waiting on the maintainer to publish.** The note is titled Megaera now and the library
  was rebuilt and passed its own publish check, but pushing it to the two public download hosts was refused for the
  session by the tool's own permission, so the point release waits for the maintainer to run the publish step. Row
  **MEGAERA-01**: once the point release is installed from the Ollama tab's Update knowledge base, with Hades
  running, ask "How do I beat Megaera?" and check the note attaches with no "no close match" line. On the library
  still installed today, that line still appears. Evidence `docs/test-evidence/plan55-HADES-NAMED-01.json`.
- ★★ `[KB]` **Neither honesty line can appear when the game is only named in the question** — **VERIFY, fixed
  in code now for both halves, device check owed.** The check that decides whether to show
  an honesty line is now told about a game that is only named in the question, not just one that is running
  or picked from a menu, and the coverage chip proves that plumbing landed. Row **HONESTY-TEXT-GAME-01**: with
  nothing running, ask "black mesa how do i tame a horse" and check the "no close match" line appears; ask a
  real Black Mesa boss question and check no line appears. **Run 2026-09-15: FAIL.** Three Black Mesa cards
  attached to the horse question anyway, and the model's own reply admitted it had no answer for taming a
  horse — but the "no close match" line still did not appear, because the notice's own closeness rule judged
  those three keyword-matched cards close enough to count as covering the question, since every card of a game
  repeats the game's own name in its title. Evidence `docs/test-evidence/plan55-HONESTY-TEXT-GAME-01.json`.
  **Fixed again 2026-09-16 (commit `f2e358a`):** the check now also asks whether the actual words in the
  question — everything but the game's name and ordinary filler words — show up anywhere in what attached.
  **Run again 2026-09-16: FAIL, same row, same question.** The new keyword check works on its own, but the
  line's last gate — a meaning-search score under 0.65 — is measured on the whole question including the
  game's name, and every Black Mesa card scores about 0.69 once the words "black mesa" are in the text,
  whether the rest of the question is a real one or not: the horse question scores 0.687 and a real Gonarch
  question scores 0.685, too close to tell apart, while a bake-a-cake stretch question would score 0.603 and
  wrongly show the line. Measured with the game's name stripped out of the same questions, stretches score
  0.50–0.64 and real questions 0.70–0.74, cleanly either side of the existing line — so the fix that is still
  needed is to score the question's own words alone, without the game's name in them, only for this one case
  where the game came from the question and nothing is running. Evidence
  `docs/test-evidence/plan56-HONESTY-LINE-01.json`. Only questions that named a game with nothing running are
  affected; a game that is actually running is unchanged. **Fixed again 2026-09-16 (commits `a6561d7`,
  `14a6392`):** the check can now take a second meaning score, measured with the game's own name taken out of
  the question first, and uses that one instead of the raw score whenever it was measured — only on turns
  where the game came from the question's own words, never a running game. With "black mesa" removed from the
  text, the horse question's score drops from 0.687 to 0.635 (now under the line) and the real Gonarch
  question's score rises from 0.685 to 0.737 (safely over it), so the two can finally be told apart. **Not yet
  checked on the Deck: this session's own pre-authorised wipe (D105) ran before this fix landed and removed
  the Deck's own local AI program and every downloaded model, so no question can be asked on the Deck at all
  until "Run AI on this Deck" is switched back on.** Six new tests cover the fix.
- ★★ `[KB]` **The follow-up menu offered places from a different game than the one you asked about** — **VERIFY,
  fixed 2026-09-15, one sighting confirmed clean on the Deck.** Two bug entries, one cause: the two choices under a
  follow-up menu were word for word the worked example in the model's own instructions — Half-Life 2's train
  station and Ravenholm — which then told the model never to copy them. It copied them anyway, on Portal 2 and
  Hades questions among others. The example is now written so the model cannot copy it into a real answer, and a
  menu that still carries the example's words is dropped. Row **BRANCH-EXAMPLE-01**: ask a Strategy question about
  Portal 2 or Hades and check the menu under the answer names that game's own places. Last sighting before the
  fix: a Half-Life 2 menu under a Hades answer with Hades running
  (`docs/test-evidence/plan55-BUG-hl2-menu-hades-running.json`, screenshot
  `screenshots/DeckCapture_20260915_204018_game.png`). **One clean sighting on the new build 2026-09-15**, a Deep
  Rock Galactic: Survivor question whose menu named its own classes with no Half-Life 2 words, evidence
  `docs/test-evidence/plan55-BRANCH-EXAMPLE-01.json` — the copying was intermittent before the fix, so more
  sightings over the coming days are the real proof.
- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY,
  landed 2026-09-15, four commits, unit-tested, Deck rows owed.** A game known only by name now opens its box;
  naming the boss first opens it on screen, in copied text and in read-aloud; a no-story game named in the question
  gets the same relaxed prompt its risk chip already assumed; all three are plain text from the first streamed word.
  Rows **STRAT-SPOIL-NAME-01**, **STRAT-SPOIL-FIRST-01**, **STRAT-SPOIL-TEXT-01**, plus the older **STRAT-SPOIL-DRG-01**
  block. [Plan 54](planning/54-spoiler-rules-gaps.md).
- ★★ `[KB]` **The new answer shape needs a read on the device** — **VERIFY, all three read; your own read of
  the three is what is owed now.** The Portal 2 sentence came back clean 2026-09-12: the note's advice starts
  straight after the character's opening line, 111 words, no warning line. The Hades sentence came back the
  same shape 2026-09-15, with Hades running: the advice starts straight after the character's opening line,
  about 100 words, no warning line, no spoiler box, with a Hades follow-up menu. The Black Mesa sentence came
  back the same shape 2026-09-16: 176 words, the advice starts right after the character's opening line, the
  Gonarch note attached, no warning line. Whether any of the three reads as advice-first is still your
  judgement, which is what this row is for. All three replies are now written out in full in
  `docs/test-evidence/plan56-KB-ANSWER-03-three-replies.md`, copied word for word from the saved chats in the
  pre-wipe backup, which also fills the Portal 2 reply's missing evidence (that reply: 2026-09-12, 18:54 Deck
  time, 113 words). You asked where the copy was on 2026-09-16; it is there now. Your read of the three is
  still what is owed. Row **KB-ANSWER-03**; evidence
  `docs/test-evidence/plan56-KB-ANSWER-03-three-replies.md`,
  `docs/test-evidence/plan55-KB-ANSWER-03-hades.json`, `docs/test-evidence/plan56-KB-ANSWER-03-blackmesa.json`.
- ★★★ `[KB]` **DRG Survivor glossary terms** — **VERIFY, one touch tap owed.** Shipped 2026-08-28 and walked on device:
  underline, popup, D-pad reachability, B, one-press Up. Rows **DRG-GLOSSARY-01…04**.
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
- ★★★ `[KB]` **KB download Cancel** — **VERIFY, blocked.** Shipped 2026-08-05. The download finishes in about a second on
  device, so there is no window to press Cancel in. Needs a slower fixture or a throttle. Row **KB-CANCEL-01**.

### Next

- ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch already built.** The answer test's voice
  switch landed 6 September. What's still owed is one run with it turned on, which wave three's main measurement
  run includes — planned as wave three ([48](planning/48-kb-wave-three-session.md)).
- ★★ `[KB]` **Prompt diet** — **OPEN, agreed 2026-09-01.** The model reads about nine tokens of rules for every token of
  knowledge. Drop the citation instruction (obeyed once in 89 asks, and the UI cannot show it), send screenshot rules only
  when an image is attached, put the cards next to the question. About a day, measured before and after on the answer test.
- ★★ `[KB]` **"Not in my notes" line** — **OPEN, agreed 2026-09-01.** When a game question matches no card, one muted line
  built by code says the answer is general knowledge, so a person can tell notes from memory. Only on Strategy and Expert
  asks for a covered game; never when the library is off or the game is uncovered. **Wording settled 2026-09-07:**
  *"Not in my notes — this answer is from the model's own knowledge."* (D48, D85)
- ★★ `[KB]` **Eval tooling: the weight sweep, per-question results for what ships, a second right answer** — **OPEN,
  agreed 2026-09-01, sweep go-ahead 2026-09-05.** Nothing a user sees. The sweep runs on the tuning questions and decides
  the blend-weights bug above; the rest stops every card batch reading as a regression when two cards are both fair
  answers. No row uses the second-answer option yet. One to two days. (D51, D68)
- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, one measurement owed.** The
  slice of questions the word search cannot answer at all was 3 rows when last counted, before 36 more blind rows landed.
  Re-count it on the next search run before calling this closed. [Detail](roadmap-details.md#eval-fixture-cannot-see-a-recall-failure).
- ★★ `[KB]` **Pull the embedding model as part of installing the library** — **OPEN, added 2026-09-05.** A person who
  installs the library but never presses the pull button silently gets word search only, the weaker half by every
  measurement. A button and a one-time hint exist today; make the pull part of the download flow, with consent, never
  silent. Promoted out of Phase 7. One to two days.
- ★★ `[KB]` **A latency budget for a game question** — **OPEN, added 2026-09-05.** The slowdown above was only caught because
  one QA row happened to record a band. Write down the budget (embed time plus first token with a game running) so the next
  regression fails a check instead of relying on luck. Planned as wave three ([48](planning/48-kb-wave-three-session.md)).
- ★★ `[KB]` **A measured context-window experiment** — **OPEN, research, added 2026-09-05, re-measured 2026-09-06.** The
  Deck's model runs with a 4,096-token window and a Strategy question with cards already goes over it (now trimmed
  instead of dropped, see Done). Try 8,192 as a Developer experiment with a game running, recording memory and time to
  first token, before it becomes a setting. Agreed as "later, its own call". (D46)
- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.** Filed as
  "the tips don't use the words people type", which is true and is the smaller half. Measured 2026-09-07: **nine of ten
  ordinary problem sentences reach nothing at all** — *"my game keeps crashing"*, *"my game won't launch"*, *"black
  screen when I start the game"*. The word "crash" is deliberately classed as too weak to route a question on its own;
  that holds with a game running and not with nothing running. Next step: a floor under the tip search so it can say
  none fit, plus a "no tip for this" line. (D81, D85) Planned as wave three ([48](planning/48-kb-wave-three-session.md)).
- ★★★ `[KB]` **Spoiler coverage as a tiered setting** — **OPEN, tiers confirmed 2026-09-01.** Strict fences bosses, endings
  and chapters; default fences only named story beats and endings; open fences nothing you asked about. Naming a boss still
  unlocks it in every tier. Needs the settings plumbing, a prompt per tier measured on the answer test, a control with a
  focus entry, and Deck QA. About three days. (D50) [Detail](roadmap-details.md#spoiler-coverage-should-be-a-setting-with-tiers).
- ★★★ `[KB]` **"Starting out" cards get their own kind** — **OPEN, decided 2026-09-05, nothing built.** A new player gets
  a *"How do I get started in Fallout 4?"* chip and *"where do I start"* finds the card. One new kind in the validator and
  the two kind lists, one chip wording, a rescue phrase list, a rebuild; then re-type the three cards filed as mechanics and
  write the Cyberpunk, Fallout 4 and Red Dead ones you asked for. Rides the bundled release. (D65)
  [Detail](roadmap-details.md#the-corpus-has-no-starting-out-card).
- ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the 139 prose cards as labelled short
  lines, the shape the 16 structured cards use. Facts kept is already 92%, so the ceiling is low; do it only if the answer
  test shows the labelled shape scores better. Two to three days of content plus a rebuild.
- ★★★ `[KB]` **Deeper answer checks** — **OPEN, added 2026-09-05.** The answer test checks facts, contradictions, fences and
  the menu, and cannot see whether a reply was helpful or whether the model admitted not knowing. Add a small set of
  questions no card can answer, scored for an honest "I don't know", and a read by a person of ten replies a month.
- ★★★ `[KB]` **The next corpus release carries everything that needs a rebuild** — **OPEN, added 2026-09-05.** Any format
  change makes every installed library stale until re-downloaded, so per-game tips, the starting-out kind and the style pass
  ride one release rather than three. Same format as today for anything that can wait.
- ★★★ `[KB]` **KB visual maps** — **OPEN.** Two shapes you named 2026-08-29: a dungeon map, and a boss outline with weak
  points marked. Nothing draws anything in a reply today. A dungeon map has to be authored, which sits behind the source
  policy and a corpus rebuild. Research first. [Detail](roadmap-details.md#kb-visual-maps).
- `[KB]` **Idea for wave four: dungeon maps** — raised by the maintainer 2026-09-07, no stars and no plan yet. Picks up
  the dungeon-map half of the visual-maps idea above when the time comes.
- ★★★★ `[KB]` **RAG Phase 4: extended retrieval** — **PARTIAL.** The chip guarantee and 16 structured cards shipped
  2026-08-19; the split was accepted 2026-08-21 and prose replies were accepted 2026-09-05 (D67). Left: per-game Deck tips (content for seven titles collected, two quirks from
  your own Deck), which need a format bump and a release — see the release entry above. Two to three days. The chip
  clipping check waits on the preset-row work. [Detail](roadmap-details.md#rag-phase-4-extended-retrieval).
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** 133 → 161 cards since 2026-08-29. Eleven of the
  thirteen titles still have no enemy or item cards, so "how do I deal with X" works for two games. Next: 40–60 entity cards
  in tranches with a quality read from you after the first; then chip ranking by meaning. Card authors cannot write blind
  test questions, so content and eval rows go in separate sessions. [Plan](planning/28-phase5-corpus-depth.md).
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get cards; today they get nothing specific. New card kinds and a spoiler table update, Left 4
  Dead 2 first, then Counter-Strike 2, from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md).
- ★★★★ `[KB]` **RAG Phase 7: retrieval infrastructure** — **OPEN.** Mostly nothing at 161 cards. What still matters: a
  thumbs-down that stops a wrong card coming back (three days), add-on packs before any large catalog (five days or more),
  a screenshot feeding the search (a short test to find out first). A nearest-neighbour index buys nothing until the corpus
  is thousands of cards. The embedding-model pull is its own entry above. [knowledge-base.md](knowledge-base.md) § Phase 7.
- ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed card with
  one press: **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days.
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that makes most people's games get
  notes instead of the model's memory: about the top 1000 Steam titles, the top 100 on Deck, and an emulated slice. Months:
  it cannot be hand-written (161 cards took six weeks), so it needs an ingestion pipeline from wiki dumps, per-source
  licensing, a size budget, packs and the index. [knowledge-base.md](knowledge-base.md) § Phase 8.

---

## Shelved

Parked on purpose, not dropped. One line each, with what unshelves it; the full entries are in
[archive/roadmap-shelved.md](archive/roadmap-shelved.md).

- ★ `[platform]` **In-IDE preview never gets past its loading screen** — shelved 2026-09-11 (D93), not a gate
  for anything. Unshelves when the preview loads the plugin on the maintainer's machine.
- ★★ `[ui]` **Glance view: the answer alone, in big text** — shelved 2026-09-12: too much UI change, and not
  ready for it yet. Unshelves on the maintainer's word; the mockup is kept.
- ★★★ `[voice]` **Voices for the bundled characters** — shelved 2026-09-08 (D74). Unshelves after the
  character sweep, a legal check and the open licence call.
- ★★★ `[voice]` **Trained voices for the bundled characters** — shelved with the clip route 2026-09-08 (D74).
  Same legal gate, plus the plugin hosting voice files for the first time.
- ★★★★ `[voice]` **A voice for a custom character** — shelved with the bundled voices 2026-09-08 (D74). Same
  legal gate.

---

<a id="done-for-v050"></a>

## Done for v0.5.0

Everything shipped since v0.4.9 (2026-07-08), one line each — moved out to its own file to keep this one small,
copied line for line, nothing reworded: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).
