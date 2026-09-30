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
6. **Tags:** `[ask]` Ask bar and input · `[chat]` chat slots · `[chips]` preset chips · `[docs]` the documents themselves ·
   `[focus]` D-pad and focus ring · `[KB]` knowledge base · `[layout]` Main tab layout and vertical space ·
   `[ollama]` models and routing · `[perms]` permissions · `[platform]` build, deploy, tooling, upstream · `[QA]` testing ·
   `[reply]` the answer itself · `[tabs]` the tab bar · `[ui]` everything else on screen · `[voice]` voice.
7. **Parked work lives in [Shelved](#shelved)**, not in Bugs or Features: one line saying what unshelves it, with the
   full entry in [archive/roadmap-shelved.md](archive/roadmap-shelved.md). Move the whole block back when it restarts.

**Every Main-tab UI change also owes the free-play sweep** (standing row **QA-FREE-PLAY-01** in
[testing-manual.md](testing-manual.md)): walk the pane like a user and require every focused stop to also be visible.

**Maintainer note (2026-09-05, helpers updated 2026-09-28): pick the model before you pick up an item.** Helpers run
on Sonnet 5.5: high by default, medium only when the fix is mechanical · ★★★–★★★★ Opus xhigh plans and lands · ★★★★★+
Fable max plans only, Sonnet high helpers build, Opus xhigh lands · `[focus]` `[layout]` `[ui]` measure on the Deck
first, then Opus xhigh, never a lane without the measurement · docs and bookkeeping the bookkeeper on Sonnet medium. The full policy — the bookkeeper guard, the escalation rule,
the Haiku trial — is in [AGENTS.md § 3](../AGENTS.md), the evidence in
[planning/33-model-routing.md](planning/33-model-routing.md). A prompt-time hook gives a gentle heads-up when a session
starts work outside this.

---

## Bugs


- ★ `[QA]` **The walk check calls a stop hidden when a corner icon merely overlaps its box** — **OPEN,
  measured on the Deck 2026-09-21.** It judges a stop by sampling its rectangle, so the question row and the
  last answer section always read part-hidden behind the Retry and Copy icons — though the words clear those
  icons by design. Measured: the question's text starts 6px past the Retry icon's edge; the answer's last
  line clears the Copy icon and only its line spacing touches it. Two entries were filed on this and withdrawn
  the same night, and the question-row entry has now been opened and closed twice on it. Until the check reads
  text rather than boxes, measure the text before filing. Evidence
  `docs/test-evidence/plan63-CORNER-ICON-COVERAGE-01.json`.
- ★ `[focus]` **After reopening Quick Access over a game, the highlight ring is sometimes not drawn for the first second** — **OPEN, found 2026-09-29 (plan 77, row P77-TRAP-LONG).**
  In 12 of 24 reopens the ring was absent 1 second after the reopen while the page's own focus was already on an element; the first D-pad press brought ring and focus back together every time. Last night's 6 reopens all had the ring on the Main tab. Small; a press of A in that first second may do nothing. Evidence `docs/test-evidence/plan77-P77-TRAP-LONG.json`.
  **2026-09-30 (plan 77 block 3, row P77-RING-REOPEN-DIAG):** with the game launched and NO plugin reload (the normal way a player gets there) the ring was absent on 6 of 6 reopens; after a plugin reload it was present 6 of 6; the page had the focus both times. So it is the normal path, not a test artefact. Not chased further before the release. Evidence `docs/test-evidence/plan77-P77-RING-REOPEN-DIAG.json`.
- ★ `[focus]` **Down takes an extra press that only scrolls before reaching a section below the dock** — **PARTIAL, two of three extra presses fixed 2026-09-30 (plan 77 helper E round 2, `fb3cfb2d`, `05b59434`). Was OPEN, found 2026-09-29 (plan 77, Deck block 2).**
  On a Soul Sanctum answer with no game running, 3 extra Down presses (one per section) only scrolled the panel by 80 px and left the ring on the same box, whose top then sat 8 to 20 px under the header. Being fixed (plan 77, helper E round 2). Evidence `docs/test-evidence/plan77-P77-WALK-COVERS-MIRROR-FREEPLAY.json`.
  Down (and Up, mirrored) now lands on the next section in one press when the one it leaves is fully read.
  **2026-09-30 (plan 77 block 3, build `ec557922`):** two of the three extra presses are gone; one remains, on a short last section (60 px) before the non-answer rows. Down landed on it twice, the second press only scrolling by 80 px. Evidence `docs/test-evidence/plan77-P77-WALK-COVERS-MIRROR-R2.json`.
- ★ `[ollama]` **A model removed outside the plugin stays in the saved try order** — **OPEN, small note, found 2026-09-28
  (plan 76).** The Deck helper removed the model over SSH with `ollama rm`, so the plugin never knew. The plugin's own "Remove from
  Deck" already cleans the saved orders (`tests/test_delete_model_cleans_routing_orders.py`); row **P76-NOMIC-REMOVE-HINT** (passed 2026-09-29) checked
  that path. Evidence `docs/test-evidence/plan76-PULL-TRY-ORDER-01.json`.
- ★ `[reply]` **A Spy block with a broken closing tag shows as raw text** — **OPEN, found 2026-09-30 (plan 77).**
  A closing tag missing its ">" left the whole block drawn as plain text in the reply, and the Spy chip appeared in Show details only about 30 seconds later. Being looked at (helper K). Evidence `docs/test-evidence/plan77-SPY-REVEAL-01.json`.
- ★ `[reply]` **Answer quality, known issue: answers borrow each other's wording** — **OPEN, seen 2026-09-27 (plan 72).**
  The Hades answer reused the Hollow Knight answer's wording; power answers came out near-identical with no number;
  the log pulled a power suggestion out of a boss answer. Evidence `docs/test-evidence/plan72-Z-FREEPLAY.json`.
- ★ `[platform]` **About 6.6 GB of half-downloaded model files from plan 76's cancelled test downloads remain on the Deck** —
  **OPEN, a note for the maintainer, 2026-09-29.** Ollama does not list them and the session did not delete them.
  **2026-09-30 (plan 77 block 3, row P77-OLLAMA-TIDY):** could not run. Ollama on the Deck is started by hand, not as a service, so restarting it means killing it; left for the maintainer. Evidence `docs/test-evidence/plan77-P77-OLLAMA-TIDY.json`.
- ★ `[platform]` **After the release: two clean-ups behind the scenes** — **OPEN, from plan 72.** The step that runs
  after an answer may hold other stale copies (it broke the chips, and once the Strategy checklist): read it through.
  The old live-line trimming code is now unused except by its tests and the Show reasoning tidy: remove it.
- ★ `[platform]` **A plugin reload while a game is running can put Steam's Home screen in front of the game** — **OPEN, found 2026-09-28
  (plan 75).** Seen twice: once the game came back through the Steam menu (`docs/test-evidence/plan38-M1-deck.json`); once it never
  showed a window and Steam's menu could not close it (`docs/test-evidence/t75-feature-F1-REAL-POPUP.json`).
  **Sighting 2026-09-29 (plan 77, block 1a):** after a reload the game was behind Steam's home page; one A on Resume brought it back.
- ★★ `[reply]` **A story game named while a no-story game runs lost its spoiler covers** — **PARTIAL, OPEN. The landed change (helper J, `332be619`) does its part. Was OPEN, seen once 2026-09-29 (plan 77, Deck block 2); needs a check.**
  "How do I beat the boss in the Soul Sanctum in Hollow Knight, quick tips please" with Deep Rock Galactic: Survivor running came back with 0 covers, where with no game running it gets covers. Being looked at (plan 77). Evidence `docs/test-evidence/plan77-BLOCK2-GAME.json`.
  Cause: the running game's spoiler rules decided the whole turn; Deep Rock Galactic: Survivor is a no-story game, so a Hollow Knight boss answer was told to use no covers and the screen opened any it drew. Now, when a no-story game runs and the question names a story game from the protected list, the turn is judged as that story game (it only adds caution; "spoilers are okay" still opens everything). Limit: the game's name must appear whole in the question.
  **2026-09-30 (plan 77 block 3, build `ec557922`, row P77-SPOILER-OTHER-GAME):** FAILED on the Deck: three Hollow Knight questions with Deep Rock Galactic: Survivor running each came back with 0 covers; the control question stayed plain. No spoiler-profile log line appeared, so the other game's profile does not seem to be picked up. Back to fixing (helper J round 2). Evidence `docs/test-evidence/plan77-P77-SPOILER-OTHER-GAME.json`.
  **2026-09-30 (plan 77 helper J round 2):** the landed change judges the turn as the story game, but that is not enough: the covers come from the notes, and the locked rule D19 makes the running game pick the notes, so a Hollow Knight question with Deep Rock running gets Deep Rock notes and no boss names to hide. Row P77-SPOILER-OTHER-GAME stays FAILED. **Needs the maintainer's call (plan 77 questions, item 3):** an exception to D19 for a no-story game running and a protected story game named. A proposed known-issue line is in plan 72 § 8.
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** —
  **OPEN, back from Verify 2026-09-23: failed by hand, found by the maintainer (build `a224fb6`), after the
  Deck work ended.** After Show details → Session, both tab bars stayed drawn at once — the small "MAIN" bar
  and the big icon bar under it. Touch scrolling did not close the big one; the first D-pad move did.
  Recording `recordings/DeckRecord_20260923_235526_game.mkv` (11 seconds, every frame shows both bars) —
  this recording lives only on the maintainer's own computer; the recordings folder is not saved with the
  project. Row **TAB-BAR-GHOST-01**. The session's guess: closing a Decky popup rebuilds the plugin, and
  the highlight lands on the top bar, which then opens. Needs a Deck walk with the focus recorder before any
  fix.
  **2026-09-28 (plan 76, build `39c17312`):** not reproduced with the D-pad. 66 samples over 15 s after Show details → Session and one D-pad press, exactly one tab bar drawn each time. The touch half still needs a person. Evidence `docs/test-evidence/plan76-P76-M-TABBAR-GHOST.json`.
  **2026-09-29 (plan 77):** the D-pad half did not reproduce. Only the touch half is left; it is on the maintainer's checks page (plan 77).
- ★★ `[reply]` **With nothing running, the decode effect slows long answers** — **OPEN, found 2026-09-27
  (plan 70, flow L10).** About 37 frames a second on a 2,900-letter answer, against about 50 on shorter
  ones; not yet known whether it was always so. [Detail](roadmap-details.md#flow-l10-findings).
- ★★ `[focus]` **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a
  blanket rule was tried and reverted in favour of Steam's native outline. [Detail](roadmap-details.md#small-and-cosmetic-as-filed).
- ★★ `[ask]` **The chat summary reads oddly in places** — **OPEN, found 2026-09-25 (plan 68).** Examples
  from the Deck pass: "Game: Parrying practice", "Player is stuck on: None apparent in this log". Needs
  another desk test on real chats.
- ★★★ `[layout]` **The chat summary card appears behind the dock until Down is pressed** — **PARTIAL, found
  2026-09-25 (plan 68). Accepted as is for 0.6.0 (the maintainer, 2026-09-27).**
  [Detail](roadmap-details.md#the-chat-summary-card-appears-behind-the-dock-until-down-is-pressed).
  **2026-09-27 (plan 72, `a9fe54bb`):** the card now scrolls into view by itself, but a tall card on a long chat still leaves its last 10 pixels behind the dock, `docs/test-evidence/plan72-F-SUMUP.json`. The maintainer's call is pending.
  **2026-09-27 (plan 72, `c603925d`):** moving the ring onto the card after Sum up FAILED on the Deck,
  `docs/test-evidence/plan72-F6-SUMUP.json`. A fix is being built.
  **2026-09-27 (plan 72, `01127c79`, `5dbb9bff`):** two more tries FAILED the same way, `docs/test-evidence/plan72-F7-SUMUP.json`,
  `plan72-F8-SUMUP.json`: Steam keeps the ring on the greyed "Sum up again". **The maintainer's call: leave it as is for 0.6.0** —
  the card shows itself and one Down reaches it; named in the release notes (plan 72 § 8). After the release: finish the
  hand-off or take the tries out of the code (they do no harm).
- ★★★ `[reply]` **Some saved answers have a hidden block's markers written twice, cause unknown** — **PARTIAL,
  found 2026-09-25 (plan 68).** The chat memory now copes with the doubling (`6843f8e1`), but why it happens
  has not been found. Deck check owed.
  [Detail](roadmap-details.md#some-saved-answers-have-a-hidden-blocks-markers-written-twice-cause-unknown).
  **2026-09-27 (plan 72, `8753cb7f`, `74e8fc7b`, `d2e5e98e`):** three related paths fixed and unit-tested: a one-line hidden block no longer gets wrapped twice while streaming, no longer opens onto "undefined" or shows openly, and Copy and Read aloud no longer give it away. The original cause is still unproven, most likely the model; no Deck check yet.
  **2026-09-30 (plan 77 block 3, row SUMUP-12):** the Deck check of the guards PASSED: a saved answer with its markers doubled loaded as one closed cover, and the hidden word appeared nowhere in the log's memory line, the new answer or the rest of the chat file (no summary existed to check). The original cause is still unproven, so this stays PARTIAL. Evidence `docs/test-evidence/plan77-SUMUP-12.json`.

---


## Features

**Standing goal from the maintainer (2026-08-30):** buy back as much vertical room for the chat bubbles as possible; every
`[layout]` entry serves it. Items rated ★★★★★ or above carry a placeholder link to [bonsAI Issues](https://github.com/qd313/bonsAI/issues) in the archive;
replace it with a specific issue when one exists.

- ★ `[ask]` **Intent packs later review** — **OPEN.** Decide whether the quiet intent-pack search aliases are deleted, left quiet, or
  revived under Developer. Not in scope: re-shipping Proton journal inject without a redesign. **New evidence 2026-09-06 (D79):**
  the bundled Deck basics list ships switched on and is the *only* reason a whole sentence ever matches a setting — its 88 words
  match when your sentence contains one of them, so *can you help me with performance* returns three results. The maintainer folded
  that finding into this entry. [Detail](archive/45-settings-shortcut-card.md#5-two-things-about-the-search-that-are-not-obvious).
- ★ `[platform]` **Four small build-setup tidy-ups, deferred on purpose in 2026-08** — **OPEN, carried over
  2026-09-24 from plan 24 when it was archived.** Nothing a person would notice: name the package manager's
  version in `package.json` (the workflow repeats it by hand today), move `packages/bonsai-mcp` off npm so the
  repo uses one package manager, drop the old `pnpm.peerDependencyRules` block that warns on every install, and
  stop `pretest` leaving the tree dirty. [Plan § 5](archive/24-track-a-ci-baseline.md).
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
- ★★ `[chat]` **Summing up offers a fresher title** — **OPEN, asked for by the maintainer 2026-09-25.** Each
  *Sum up this chat* also hands the AI the chat's current title; when the AI judges it stale, the person is
  offered its suggestion and chooses to rename or keep. [Detail](roadmap-details.md#summing-up-offers-a-fresher-title).
- ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.** The create position is the
  literal `[+]`, re-confirmed on board 8f and again in the v3 rows. Reopen that decision before building it.
  [Detail](roadmap-details.md#first-run-ghost-new-chat-label).
- ★★ `[platform]` **The settings list is written out seven times** — **OPEN, deferred on purpose 2026-09-15
  (plan 55, D104), carried over 2026-09-24 when that plan was archived.** About fifty settings, and the screen
  side names every one of them by hand in seven places in one file. Miss one when adding a setting and it looks
  fine but quietly resets after a restart; that already happened once, to four settings together. Fix: write
  the list once and have the other six read it. Nothing is broken today. [Why](archive/55-bugfix-session-three.md).
- ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed
  2026-09-08. Not yet (D99, 2026-09-12): it waits for its own go.** The model would open every answer with
  one short sentence that carries the point and gives nothing away. **The 2026-09-12 count:** only 2 of 10
  answers already opened that way and 0 of 10 gave anything away — by the maintainer's own rule that means
  build it, but they read the count and said not yet. [Detail](roadmap-details.md#headline-first-every-answer-opens-with-one-line-that-stands-alone).
- ★★ `[reply]` **Should a streamed answer keep its layout when it finishes?** — **OPEN, a decision, carried over
  2026-09-24 from plan 05 when it was archived.** Plan 05 called this "the one design question worth deciding
  soon" on 2026-08-07 (its P6): today an answer is laid out one way while it arrives and re-laid out when it
  finishes, and two ways of drawing it can drift apart. Written before September's reply changes: check today's
  code first, it may be moot. Touches [plan 69](planning/69-streamed-answers-scramble.md). [P6](archive/05-token-streaming-review.md).
- ★★ `[reply]` **Which bundled characters copy a real person** — **OPEN, filed 2026-09-08 (D74); the gate for the shelved character
  voices.** All 31 characters in the picker are named characters from games or TV, each voiced by a real actor, and one is a living
  comedian's own persona. A written sweep, one line per character: who owns the character, whose voice it is, and whether a voice for
  it could be made as a type rather than a copy. Text roleplay sits on the first layer today; any voice would sit on all of them. No
  code; a document the legal check reads. [Memo](planning/42-read-aloud-feasibility.md).
  **Not needed for 0.6.0 (2026-09-27, plan 72):** the characters are text only (a name and a letter, no pictures or voices), and
  the same list shipped in 0.4.9. Still the gate before any character gets a voice.
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
- ★★★ `[chat]` **Opening "N earlier" floods a long chat with rows** — **OPEN, reported by the maintainer
  2026-09-25; needs a drawing of the options first.** Every earlier question becomes its own row, 42 in one
  chat, filling the screen. [Detail](roadmap-details.md#opening-n-earlier-floods-a-long-chat-with-rows).
- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16 on the Deck's
  built-in screen, no single cause, not built in plan 56.** The panel is only 454 pixels tall on the Deck's
  own screen, not the 696 every earlier number assumed, so even a two-turn chat overflows it and a person
  sees about three lines of chat. Fixed rows take 311 of the 454 pixels before any chat starts. Getting more
  room means shrinking or hiding one of those rows — a design call for the maintainer. [Detail](roadmap-details.md#give-the-reclaimed-height-to-the-transcript).
- ★★★ `[layout]` `[focus]` `[chips]` **While reading an answer, the Show details line takes the suggestion
  chip's place above the question box** — **NEW, filed by the maintainer 2026-09-23. Not started.** Today
  the suggestion chip stays pinned above the question box no matter where in a reply the person has
  scrolled. The idea: while scrolling through an answer, that answer's own Show details line shows there
  instead of the chip; once the person scrolls past the answer and its Show details line, the chip comes
  back. The maintainer's own proposed cure for the bug **"Show details' chip ladder hides under the
  question box"**, below. **Needs a plan and animated mockups before anything is built**, since the swap
  between the chip and the line happens as the person scrolls — drawn at the Deck's real size, from the
  real screen, showing the swap in motion.
- ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — **OPEN, research spike.** Hold models loaded, or unload when a game takes
  focus on the Deck APU? The spike decides go or no-go; no production unload before it.
  [Detail](roadmap-details.md#ask--reply-items-with-short-entries-as-filed).
- ★★★ `[ollama]` **Per-mode latency timeouts** — **OPEN, weighed and deliberately not built 2026-09-05.** Separate warning and
  give-up values per Ask mode. It was the sixth candidate in round 36 and was dropped on purpose, said in advance rather than
  discovered late: it is the largest of that set — the two existing values already run through sixteen files each and going per mode
  triples them — and the least of them for a person, since it changes when a warning appears rather than what the plugin can do.
- ★★★ `[ollama]` **What bonsAI costs a running game** — **OPEN, asked for 2026-09-20 and measured the same day.** Writing an
  answer takes about a third of the frame rate: God of War ran 31 frames a second on its own, 20 while an answer was written,
  and 31 again afterwards. It goes both ways — the answer itself drops to about a third of its usual speed. Memory is the other
  half: with that game running the Deck had 206 MB spare before the model loaded. **Giving the model more room costs nothing in
  frames**, so the real questions are what to reserve and whether to say plainly what a question costs. Pairs with keep-alive.
  **A worse sighting 2026-09-26,** plus a screen freeze of up to 7.6 s during a later Deck check that same
  night. **Target set by the maintainer 2026-09-27:** at least 30 frames a second in the panel while an answer
  arrives with a game running. **PARTIAL, measured 2026-09-27:** from about 12 to 36 with the decode effect off
  and 30–33 with it kept (the maintainer's call), dipping into the 20s late in long answers; the game itself
  went from 14–17 to 23–31. Rows **GAME-LIGHT-01**, **STREAM-PIECES-01** partial. Next: a Deck processor
  profile mid-answer. [Detail](roadmap-details.md#flow-l10-findings).
  **2026-09-29 (plan 76, block 3):** with Deep Rock Galactic: Survivor on its title screen, the panel's median while an answer arrived was
  84.5 frames a second (thinking 90, idle 87.5). Title screen only; a mission running was not tried. Evidence `docs/test-evidence/plan76-SCR-10-try2.json`.
- ★★★ `[platform]` **bonsAI's own icon in the Quick Access Menu** — **OPEN, re-planned 2026-09-23, was ★★★★★★.** The
  free plugin Quick Tab already pins any Decky plugin as its own menu icon, so the wait on Decky's team is over. Left for
  bonsAI: a Deck test, then small fixes. Read from the code, not yet seen: in its own tab the reply-ready notice pops up
  while you are looking at the answer, and tapping it opens Decky instead. Questions answered; the Deck test is next.
  [Plan 66](planning/66-quick-tab-own-menu-icon.md).
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
  [Detail](roadmap-details.md#focus--deck-ui-items-with-short-entries-as-filed).
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
- ★★★★ `[ask]` **A spoiler-chance rating for the chat's own summary** — **OPEN, not started (D118 call 14).** The
  chat now sums itself up on its own (see Verify, plan 68); rating how likely that summary swept up a spoiler is
  a later plan of its own. [Detail](archive/roadmap-completed.md#the-chat-sums-itself-up-instead-of-being-cleared-closed-2026-09-26).
- ★★★★ `[ollama]` **LAN custom model pull** — **OPEN.** Blocked until a mechanism is chosen (R1 to R4). Depends on **Custom model in
  the Pull Models picker**.
- ★★★★ `[perms]` **Web permission** — **OPEN, discovery locked.** Opt-in live web answers; offline Ask and local KB when off. Kids
  lock forces it off. [Discovery](planning/web-permission-discovery.md) · [Detail](roadmap-details.md#permissions--safety-items-as-filed).
- ★★★★ `[platform]` **Llama.cpp provider spike** — **OPEN, research only.** Go or no-go against Deck-local Ollama. Prior:
  [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md) · [Detail](roadmap-details.md#platform--upstream-items-as-filed).
- ★★★★ `[platform]` **Steam Input layout parse** — **OPEN.** Parse controller VDF configs for control context. Not in scope: writing
  configs.
- ★★★★ `[QA]` `[platform]` **Finish the controller test rig** — **PRIORITY 1 (maintainer, 2026-09-24). PARTIAL: built and
  driving every Deck session since 2026-08-26.** Was ★★★★★ with "board ordered, next: S1 to S3", a month stale. Left from
  [plan 19](planning/19-controller-macro-test-rig.md): a recording that is also a live view (S3), the highlight checked from the
  video (S4), handheld runs over Bluetooth, and the nightly unattended run (P4), which needed the saved-walk replay bug
  fixed first — **now works** (see the bug entry above). Comes before stand-in Decks. Plan 70 built two of
  the four pieces: the replay, and a first slice of the nightly run. **Its first real run happened
  2026-09-26: the command itself works, the walks don't check anything yet.** Row **OVERNIGHT-RUN-01** in
  [testing.md](testing.md). [Detail](roadmap-details.md#overnight-runs-first-real-run). [Program](planning/21-ai-owned-testing-program.md) · [History](roadmap-details.md#controller-macro-test-rig-and-live-view).
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
  quarter's models in [41-deck-model-survey.md](planning/41-deck-model-survey.md); the calls are D72. [Detail](roadmap-details.md#deck-health-snapshot-local-reply-tts-on-deck-model-benchmark).
- ★★★★★ `[perms]` **VAC Phase 2: opponent IDs** — **OPEN, research.** Surface live opponent identities for ban checks when metadata allows.
- ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN.** AI copy tuned to gen-2 hardware.
  [Detail](roadmap-details.md#the-five-star-and-six-star-platform-items-as-filed).
- ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; first step is a ★★
  test to find out.** bonsAI's panel floating over any VR game, drawn by a small PC program, not a Decky
  plugin. **Locked rule (D97):** it goes only through SteamVR's own panel door and never touches the game
  itself, to avoid an anti-cheat ban. **Bench result, 2026-09-12: the panel works** — a sample answer
  appeared inside the headset view with no plugin code at all. **Still unknown:** pointing at the panel
  (needs a real headset) and whether the notification card SteamVR accepted actually drew on screen. [Detail](roadmap-details.md#the-floating-panel-inside-steamvr).
- ★★★★★ `[QA]` `[platform]` **Stand-in Decks on the maintainer's PC** — **OPEN, planned 2026-09-23, nothing built.** Up to
  four virtual Decks (Bazzite, one Steam account, all but one offline) so several AI sessions test at once instead of queuing
  for the one Deck. A test lead splits the work; one rig lead per machine. Phase 0 first: one stand-in on Windows, screens
  drawn without the graphics card; if that fails, a Linux dual boot. Adds machines, not abilities, so it comes after the
  controller test rig (priority 1, 2026-09-24). [Plan 67](planning/67-stand-in-decks.md).
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
- ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening
  llama.cpp** — **OPEN, filed 2026-09-08. Not yet (D99, 2026-09-12): nothing built until the maintainer
  says.** One question underneath all three: does bonsAI grow a second way to run — there is no network
  door into its Python side today, so a panel on the PC would have a screen and no brain. **The price is
  now known (2026-09-12):** the Python side ran outside Decky on a Windows PC and all nine calls it normally
  makes came back working. Still missing: a starter program and a way for a panel to reach it. [Detail](roadmap-details.md#one-decision-for-three-items-the-steamvr-panel-leaving-decky-and-reopening-llamacpp).
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

### Bugs that need verification
- ★ `[focus]` **A press that never opens its box (parental lock on) can leave a stale "return the ring here" note behind** —
  **VERIFY, fixed for all buttons 2026-09-29 (plan 77, `11033561`, tip `7c8ac206`).** Earlier fixed (`6ef8cedf`) for the library's Update and
  "Pull nomic-embed-text" buttons; now also "Update AI & models" and the Tier 1 and Tier 2 install buttons. Deck check owed: row **P77-OLLAMA-NOBOX-NOTE**.
  **2026-09-29 (plan 77 block 2, row P77-OLLAMA-NOBOX-NOTE):** the box half PASSED: the Update, Tier 1 and Tier 2 boxes open on "Not now" and B returns the ring. The parental-lock half **still owed**: it needs Steam Family View with a PIN, so it is on the maintainer's checks page; the no-box half rests on unit tests. Evidence `docs/test-evidence/plan77-BLOCK2-CHATS-BACKEND.json`.
- ★ `[ollama]` **An Ollama address typed as https is quietly sent as plain http** — **VERIFY, fixed 2026-09-29 (plan 77 helper C, `2f87bc98`, `29b085e6`, `2b32e1cd`). Was OPEN, found 2026-09-28
  (security review, finding 7).** The maintainer's call, 2026-09-29: refuse it and say so. [Review](audit/security-review-0.6.0.md).
  **2026-09-29:** Pulled into plan 77 by the maintainer, 2026-09-29; being fixed.
  An https address is refused with "bonsAI can only talk to Ollama over http for now. Use an http:// address." in the field, Test connection, Ask and the chat summary. Deck check owed: row **P77-HTTPS-REFUSED**.
  **2026-09-29 (plan 77 block 2, row P77-HTTPS-REFUSED):** could not run: the PC address is not in the settings file and typing it opens Steam's keyboard. Still owed; retried in block 3. Evidence `docs/test-evidence/plan77-BLOCK2-CHATS-BACKEND.json`.
  **2026-09-30 (plan 77 block 3, build `ec557922`, row P77-HTTPS-REFUSED):** the message and "address not saved" PASSED; Test connection still ran a probe (a name-lookup error in the log), so the row FAILED on "nothing is sent". Back to fixing (helper C round 2). Evidence `docs/test-evidence/plan77-P77-HTTPS-REFUSED.json`.
  **2026-09-30 (plan 77 helper C round 2, landed in `6614e889`):** the helper could not reproduce the probe from the press. The back end refuses https before any probe and the screen sends nothing; the traceback most likely came from the automatic check that runs when "Run AI on this Deck" is switched off, which probed the field's old text "192.168." (not a valid address). A regression test now proves the press sends nothing. Also fixed: with an https address the meaning-search hint no longer names it. **Re-check owed** with a cleaner sequence (turn the switch off, wait 15 s, note the last log line, then set https and press Test: pass is no new probe line).
- ★ `[reply]` **A hidden block's opening mark glued onto a sentence is drawn as visible inline code** — **VERIFY, fixed 2026-09-29 (plan 77 helper A, `0d805d37`). Was OPEN, found 2026-09-28
  by reading the code (plan 76 lane 1), not seen on the Deck.** For example "The```bonsai-spoiler …" on one line. Copy and Read
  aloud still hide it.
  It is now a real hidden block, while streaming too. It cannot be put on the Deck's screen without the model (no injection hook on the device). Deck check owed: row **P77-GLUED-SPOILER (unit-test proof only)**.
- ★ `[reply]` **Read aloud reads a `~~~` code block as words** — **VERIFY, fixed 2026-09-29 (plan 77 helper A, `0d805d37`). Was OPEN, found 2026-09-28 by reading the code (plan 76 lane 1),
  not seen on the Deck.** It should say there is code on screen, as it does for a backtick code block. Not a spoiler leak.
  Read aloud now says "There is code on screen." It cannot be put on the Deck's screen without the model. Deck check owed: row **P77-TILDE-READALOUD (unit-test proof only)**.
- ★ `[ui]` **"Run AI on this Deck" can show ON without being saved** — **VERIFY, fixed 2026-09-30 (plan 77 helper C round 2, `6614e889`). Was OPEN, found 2026-09-30 (plan 77).**
  After its beta notice, the switch showed ON but the settings file kept it off. Being looked at (helper C round 2). Evidence `docs/test-evidence/plan77-P77-HTTPS-REFUSED.json`.
  Cause: the switch waited 400 ms to save, and its beta notice closed Quick Access first, throwing the save away; the change is now saved at once, before the notice opens. The helper's finding: any setting changed less than 400 ms before a panel close is lost the same way; only this switch is covered, and a general fix is after the release. The check: turn the switch off and on with the notice showing, press "Got it"; the settings file reads true within seconds. Deck check owed: row **P77-RUN-AI-SAVES**.
- ★★ `[chat]` **Clearing a session while an answer is still being written may lose that answer** —
  **VERIFY, fixed 2026-09-27 (plan 72, `1069c8f1`).** Clear resets the waiting state
  first, so the step that runs when the answer stops then skips saving it, since that state no longer says a
  question is waiting.
  The plan 72 try could not run: the answer finished in 33 seconds, `docs/test-evidence/plan72-F-CLEAR.json`. Suggested for the maintainer's hand checklist.
- ★ `[chips]` **A preset chip's icon and its text are coloured the same way** — **VERIFY, fixed in `895cf0a`.**
  Measured on the Deck 2026-09-23: the label colour reads rgb(196,211,226) at rest and rgb(220,235,248) with
  the ring on the chip. Row **CHIP-COLOR-BYEYE-01**. Owed: **a by-eye check by the maintainer**, from
  `docs/test-evidence/plan64-BYEYE-01-preset-chip.png` — a model cannot judge pixels.
- ★ `[chips]` **A preset chip has a bright blue underline that is too distracting** — **VERIFY, fixed in
  `895cf0a`.** Measured on the Deck 2026-09-23: the line's strength reads 0.55, as intended, and is drawn
  only while the ring is on the chip. Row **CHIP-UNDERLINE-BYEYE-01**. Owed: **a by-eye check by the
  maintainer**, from `docs/test-evidence/plan64-BYEYE-01-preset-chip.png`. This line is the chip's only
  highlight cue left, since Steam's own white ring has been clipped off chips since 2026-09-01, so it must
  stay clearly visible, not just calmer.
- ★★ `[reply]` **When the length limit cuts a choice menu, the next part of the answer is lost** — **VERIFY, fixed 2026-09-30 (plan 77 helper L, `4d750ae1`). Was OPEN, found 2026-09-30 (plan 77).**
  On a test build with the limit at 300 tokens, the menu block opened right at the wall; the next piece's 1,018 letters never reached the screen or the saved chat, and no menu showed. Rare at the normal limit. Being looked at (helper L). Evidence `docs/test-evidence/plan77-SOFT-PREDICT-04.json`.
  A choice menu cut by the length wall that the continuation does not finish is now dropped cleanly; the rest of the answer is kept, shown and saved. Limit: the piece after a dropped fence shows when it ends, not live. The check is the same low-limit run as SOFT-PREDICT-04: the final letters roughly equal the sum of the pieces, the same in the saved chat, no fence text or JSON on screen, and a "dropped a choice fence" log line. Deck check owed: row **P77-CUT-MENU-TEXT**.
- ★★★ `[chat]` **Clear cache cleared the screen but not the session** — **VERIFY.** Fixed and confirmed
  2026-08-27 and 2026-09-03; the orphan-chat half is a measured follow-up, not a regression. Only the
  mid-generation half is still owed: clearing while a reply is still being written. Row **CLEAR-CACHE-01**.
  **Tried twice on the Deck 2026-09-18, both too slow:** Clear landed on an already-finished reply both
  times; Clear itself worked cleanly. Needs a reply over about 70 seconds to catch it mid-write, or the
  maintainer's word to call this covered by its unit test instead. **Per the maintainer's answer 2026-09-21
  (D115 #8): this mid-generation half now moves off this session's list and onto the maintainer's own
  checklist** — five device tries is enough, and every reply finished before the controller could walk
  there. The rest of this entry is unchanged. [Detail](roadmap-details.md#clear-cache-cleared-the-screen-but-not-the-session).
### Features that need verification

- ★★ `[chips]` **Make the preset chips look more like chips** — **VERIFY, shipped 2026-09-17 under plan 60
  (D110).** Chips now look raised, sit closer together, and the chip the controller is on shows a light bar
  instead of the old outline. Rows 02 to 06 and 08 passed by measurement; row 09 failed and is filed as its
  own bug, below. Owed: the maintainer's own look at rows 01, 05 and 07, and at the help and agent chips.
  [Plan](archive/60-chip-button-restyle.md) · [Detail](roadmap-details.md#make-the-preset-chips-look-more-like-chips).

- ★★ `[reply]` **Streamed answers arrive with the same scramble as the decode chips** — **VERIFY, built
  2026-09-24/25.** A Developer tab switch, *Scramble animation*, off by default, churns a live answer's
  newest letters through placeholder symbols before they settle, the way a suggestion chip does.
  [Plan 69](planning/69-streamed-answers-scramble.md), D119. Deck rows **SCR-04**, **SCR-06**, **SCR-08**
  and **DEV-01** pass, and **SCR-05** (reopening mid-answer, `docs/test-evidence/plan70-SCR-05.json`) and **SCR-07**
  (reduced motion, `docs/test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`) passed on the Deck 2026-09-26. Owed: the look
  (**SCR-01**, the maintainer's eye) and the game's own frame rate (**SCR-03**). Full rows in [testing.md](testing.md).
- ★★ `[reply]` **The streamed answer's own redraws were costing most of the panel's frame rate** —
  **VERIFY, fixed 2026-09-25 (`bb8d7e5b`, `aae5add6`).** With no game running the panel drew about 19–24
  frames a second while an answer streamed; moving its text on a steady beat instead of every frame, and
  holding its glow still while text arrives, raised that to 56–58 with the scramble off, 44–50 with it on
  — the maintainer's own floor was 45. Evidence `docs/test-evidence/plan69-answer-frame-rate-2026-09-25.json`.
  Owed: the maintainer's own eye on the look, and a run with a game in a mission (title screen passed 2026-09-29: 84.5). Rows **SCR-09**, **SCR-10** in
  [testing.md](testing.md).

- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09. Rows **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01**
  (and **KIDS-LOCK-02** with a child account). Live CEF Stage 0 confirmation still owed. **KIDS-REGRESS-01
  re-confirmed on the Deck 2026-09-17:** no lock banner, all four Permissions switches on and reachable.
  Evidence `docs/test-evidence/plan57-QA-KIDS-REGRESS-01.json`.
- ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab
  named** — **VERIFY, landed 2026-09-17.** Six equal cells with one icon each, only the current tab named;
  the strip is taller so the chat row's dots no longer show under it. **Deck run 2026-09-18:** rows 01, 02,
  04, 05 and 06 pass; 03 waits on the maintainer's own look; 07 failed and is filed as its own bug above.
  **The free-play sweep's streaming half closed 2026-09-23** (fourth try of the recorded walk); that same
  pass found a new, unrelated bug instead — two tall answer sections only 33% visible on landing — tracked
  on its own. [Detail](roadmap-details.md#the-open-tab-strip-redrawn-six-equal-cells-one-icon-family-only-the-current-tab-named) · [Tab icon](roadmap-details.md#replace-the-bonsai-tab-icon).
- ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30; the layout inverts to slot row,
  transcript, presets, Ask bar. Most rows pass on device. **As of 2026-09-18:** 05b passed (returning to a
  still-writing chat shows the question and partial text together); 05a's busy-indicator half, 06a and 06b
  failed (filed as its own bug above). **15d passed** and **06c passed on its fourth try** on the Deck
  2026-09-23 ("Reply ready" now shows within a second; fixed in `73be15f`); the runs are in the detail.
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02) · [More](roadmap-details.md#named-chat-slots).

---

## Knowledge base and RAG

Everything about the game notes and the search that feeds them, in one place, so you can open this file and pick up
where you left off. **Read first:** [the status report](planning/37-rag-status-report.md) — the zoomed-out picture, what
each next step buys a person, and rough costs. It is kept in step with this section. Architecture:
[knowledge-base.md](knowledge-base.md). The agreed answer-quality work: [plan 30](planning/30-kb-answer-quality-plan.md).

Same rules as the lists above: five lines an entry, stars ascending in each list, a fix moves to **Deck check owed** and
then to [Done](#done-for-v050) in the same commit. The one difference is that the knowledge base keeps its bugs, its owed
checks and its plans together here instead of spread over three lists.

**Where things stand (2026-09-18).** **372 notes over 35 games, plus 159 Deck tips.** Wave two
added 27 notes and 32 tips. **Of the 72 questions a player might plainly ask about the twelve games added this
month, 64 now have a note** — the other eight were written on purpose to have none, so every question that was
meant to have an answer has one. Ten more games' notes landed 2026-09-18 — the five Mario Party games, Donkey
Kong 64, Yoshi's Story, Diddy Kong Racing, Super Smash Bros. 1999 and Grand Theft Auto III: The Definitive
Edition — written by two helpers in their own words from wiki pages read that same day, with the page, licence
and day recorded on every note. The library was built as version 2026.09.18 with every note and tip indexed and
its publish check passing. **Published 2026-09-23:** both Hugging Face and the GitHub release now serve
2026.09.18, read back after publishing to confirm it. **Blind test-question coverage finished 2026-09-26,**
107 more added. [Detail](roadmap-details.md#blind-questions-done). **Three new games landed 2026-09-26** (plan
70, helpers F and G): Brotato, Palworld and Skyrim, plus starting-out notes for Cyberpunk, Fallout 4 and Red
Dead 2. [Detail](roadmap-details.md#three-new-games-and-their-notes). **The next release, 2026.09.26, is
built: 38 games, 414 notes, 164 Deck tips.** It passes the release check and its Deck check, and the
Deck's copy matches it byte for byte. **Published by the maintainer 2026-09-27**
([plan 70](archive/70-kb-wave-four-and-deck-test-wave.md)), replacing 2026.09.18 (372 notes, 35 games, 159 tips).

**Finding the right note.** On the held-back questions nobody tuned against (177 rows), the search puts the
right note in the top three **85.3 times in a hundred**. Every one of the 21 notes written in wave two is found
in the top three for its own question, and 12 come first. Across all 72 questions about the new games, **58
find their note in the top three where 38 did**. Two rows out of 413 got worse against 24 better. On the 21
newly labelled questions for the games added this session, the right note came first 16 times and landed in
the top three 20 times. This was measured 2026-09-18 on the floored search against the new, bigger library —
a new series, started because rows were added, so it does not compare with any older count.

**The answer the Deck's own model writes**, over 61 questions with the corrected checks: it keeps the note's facts
**76.6 times in a hundred**, never contradicts its note **94.4**, attaches a note whenever one is due **100**,
shows the branch menu when due **98.6**, and comes out clean on all three runs **60.7**.

**Do not compare those against any older figure in this project.** Two faults were found and fixed in wave three:
the check could mark a right answer wrong for using different words than it expected, and it could miss a reply
that flatly said the opposite of its own note. The search test had also been reading a copy of the library from
31 August for weeks. Every answer and search number quoted before wave three carries one of those faults. The full
before and after is in [wave three's report](archive/48-kb-wave-three-session.md).

**Getting to the troubleshooting tips is where the wave fell short.** The tips themselves are much better — crash went
from 2 to 9, sound 1 to 8, picture 1 to 8, performance 2 to 10, controller 6 to 10, and the top crash tip no longer
tells someone to check a desktop that game mode does not have. But of 24 fresh sentences written by someone who had not
seen the rules, **6 reached the tips before and 8 after**. The rules are still phrase-shaped: they catch the exact
wording someone imagined and miss the neighbour.

**Pick up here, in order.**

**Wave three ran on 2026-09-07** ([48](archive/48-kb-wave-three-session.md)), after wave two's own Deck
evening ran the same evening, once the Deck was free.

1. ~~**Finish the device evening.**~~ **Done 2026-09-15.** The two checks that had never run — the honesty
   line, and tips still attaching when one fits — both pass on the device. The speed check passes three
   times with its fix. The *No tip for this* line never had a question that made it appear, and was
   retired by the maintainer on 2026-09-27 (`db4b3b4a`).
2. ~~**Fix the speed check.**~~ **Done.** It now refuses to pass a reading taken without a reply first, and
   read 547, 23 and 28 thousandths of a second against a one-second budget on 2026-09-15. Read that with
   the range in mind — the number swings with what is loaded in memory.
3. **Decide how to finish follow-ups.** The search half works on the device — it looks up the right thing
   you were just asking about — but the answer can still be about something else. The wrong-boss bug that
   once hit one run in three is fixed and proven on the Deck (`e1bf3324`, see Done). The options for
   finishing it still need writing up.
4. **The one-second wait on every question is now explained.** The Deck can only hold one model in
   memory at a time, so the model that writes the answer and the model that searches the notes keep
   pushing each other out. A search right after an answer measured 732 thousandths of a second; with
   the limit raised to two, tried safely on a spare copy of the setting that never touched the
   maintainer's own, it dropped to 24. Measured 2026-09-12. Evidence
   `docs/test-evidence/plan48-R6-deck-model-eviction.json`.
5. **Which of those two settings the maintainer's Deck is actually running: answered 2026-09-23.** The two
   starting paths were made to agree (`fae4a53`). Read on the Deck from three places at once — the running
   Ollama process, the auto-start file, and the Ollama tab's own switch — all three now say "keep two
   models loaded," and `ollama ps` showed both the answering model and the note-search model loaded at
   every one of four reads across three questions, with no load or unload logged in between. Still open:
   the drift from August to September. **Whether two models cause trouble with a game running: measured
   2026-09-26**, safety check stays unbuilt. [Detail](roadmap-details.md#cost-to-a-running-game-second-sighting).
   Evidence `docs/test-evidence/plan64-FOLLOWUP-MEMORY-EVICTION.json`.
6. **58 phase 1: finished.** [The plan](archive/58-phase-1-notes-shown-and-wiki-extracts.md)
   shows the note's own words under a reply and reads a wiki's own sentences into notes with no AI
   rewrite; it is done and archived. What is still owed on the Deck is in "The note's own words under the
   reply" below.
7. **Then wave four, now plan 70** — writing more notes. 58 phase 2 was replaced 2026-09-25 by
   [plan 70](archive/70-kb-wave-four-and-deck-test-wave.md), which re-read § 1 against the code and took
   its answers as D112.

**Wave two's own evening ran 2026-09-07** and wave three ran the same day; the results and the bug write-ups are
in [wave two's report](archive/47-kb-wave-two-session.md) § 8 and [wave three's](archive/48-kb-wave-three-session.md).
The five optional August rows were not run, and New Vegas still is not installed.

**A library point release went out 2026-09-07** carrying the corrected Black Mesa water note and nothing else — 293
notes, 156 tips, 25 games, unchanged. Installed on the Deck and checked: asked about the flooded rooms, the reply now
says the current is constant, says not to try to time it, and points at the wall switch that cuts the power. The old
advice to wait for a gap is gone. Evidence `docs/test-evidence/plan48-R5-blackmesa-corrected-note.json`.

### Calls waiting on you

None right now.

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md); the knowledge-base
ones from this month are D81 to D88.

### Bugs

- ★ `[KB]` **A game's own tip is found only by its own words** — **OPEN, found 2026-09-26 (plan 70, flow
  L7).** "The words look blurry" misses the Render Scale tip that "the text looks blurry" finds.
  [Detail](roadmap-details.md#flow-l7-findings).
- ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **ACCEPTED, 2026-09-28.** Skipped on
  purpose by the maintainer's decision D62 #2 (2026-09-05) to save about a second per Speed question. D62 sketched a fallback
  (run the meaning search only when the word hits are thin); it would need a threshold picked and measured. Kept as an entry.
  `knowledge_base_service.py` line ~1121. [Detail](roadmap-details.md#speed-mode-tip-gap).
- ★★ `[KB]` **Black Mesa's electrified-water question attaches two unrelated early-game notes instead of its
  own** — **OPEN, found 2026-09-19.** The right, specific answer comes back, but two generic early-game
  notes are named underneath it instead of the real one, which does exist and now attaches too, but still
  ranks behind them. **Measured 2026-09-26:** ranking general notes lower is not the fix — it stays off.
  [Detail](roadmap-details.md#black-mesas-electrified-water-question).
- ★★ `[KB]` **Four questions still get notes about the wrong subject** — **OPEN, three of the four now say
  so, found 2026-09-07.** Asking Black Mesa how to tame a horse, Portal 2 where to buy a house, and a
  nonexistent Hades boss all still attach a note; the floor added this wave cannot catch these without
  losing correct answers elsewhere. **Sighted again 2026-09-26 (plan 70, flow L1):** a Hades boss question
  still attaches the wrong area's note, twice. [Detail](roadmap-details.md#wrong-subject-notes).
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held
  back 2026-09-06, re-measured 2026-09-07 and still held (D52, D81).** With nothing running, all 24 fresh
  plainly-worded problem sentences now reach the search, but six measured examples still attach a tip about
  something else. **Cause:** the meaning search only runs when the plain word search finds nothing, which is
  almost never. The real fix is rewriting the tips, its own entry below. [Detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).
- ★★ `[KB]` **Unrelated questions still get game cards stapled on** — **ACCEPTED 2026-08-27.** With a game running, *"thank
  you very much"* still attaches a card. Raising the keyword floor costs real matches, and the model mostly ignores an
  irrelevant card. [Detail](roadmap-details.md#ordinary-phrases-attach-game-cards) · [Earlier wording](roadmap-details.md#unrelated-questions-still-get-game-cards-stapled-on-2026-09-02-wording).
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** Leaning the search toward meaning finds the right note first more often, but it buries a brand-new
  note whose meaning index is not built yet. **Not lifted until every note is guaranteed to have its index before
  it can be searched.** Two smaller objections are unanswered if this is ever revisited. Weights stay even for
  now. (D68, D82) [Detail](roadmap-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against).

### Deck check owed

- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY,
  landed 2026-09-15, four commits, unit-tested.** A game known only by name now opens its box, and naming the
  boss up front keeps the answer in plain text. **DRG-01b passed on the Deck 2026-09-23:** the boss tactics
  came back in plain text with no cover, as expected. **Still owed:** STRAT-SPOIL-NAME-01, blocked since its
  game cannot be launched. [Detail](roadmap-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions).
  **2026-09-30 (plan 77 block 3, row STRAT-SPOIL-NAME-01):** could not run: none of Doom 64, Super Mario 64, Mario Kart 64 or Pikmin 2 is on Recent Games. Evidence `docs/test-evidence/plan77-STRAT-SPOIL-NAME-01.json`.
- ★★ `[KB]` **The note's own words under the reply** — **VERIFY, third run 2026-09-19.** Header, open-scroll
  and live timing all pass; the upward walk lands cleanly on the block's header and the ladder walk holds up
  — the only stop still missing is the chip ladder inside the open block. Why the tip and
  one question in ten arrived late is now explained and fixed; a repeat check on the Deck 2026-09-19 showed
  no gap at all. Rows **NOTES-BLOCK-01**–**07**, **TEN-GAMES-01**, in [testing-manual.md](testing-manual.md).
### Next

- ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch already built.** The answer test's voice
  switch landed 6 September. What's still owed is one run with it turned on. Wave three planned that run
  ([48](archive/48-kb-wave-three-session.md) § 7), but its report has no voice results, so it never ran.
- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, one measurement owed.** The
  slice of questions the word search cannot answer at all was 3 rows when last counted, before 36 more blind rows landed.
  Re-count it on the next search run before calling this closed. No code needed — the search test already reports that
  slice; it only needs a run (plan 70). [Detail](roadmap-details.md#eval-fixture-cannot-see-a-recall-failure).
- ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the 139 prose cards as labelled short
  lines, the shape the 16 structured cards use. Facts kept is already 92%, so the ceiling is low; do it only if the answer
  test shows the labelled shape scores better. Two to three days of content plus a rebuild.
- ★★★ `[KB]` **Deeper answer checks** — **OPEN, added 2026-09-05.** The answer test checks facts, contradictions, fences and
  the menu, and cannot see whether a reply was helpful or whether the model admitted not knowing. Add a small set of
  questions no card can answer, scored for an honest "I don't know", and a read by a person of ten replies a month.
  **Sighting 2026-09-26:** an answer turned a plain tip ("raise Render Scale") into advice that contradicts itself.
  [Detail](roadmap-details.md#flow-l7-findings).
- ★★★ `[KB]` **KB visual maps** — **OPEN.** Two shapes you named 2026-08-29: a dungeon map, and a boss outline with weak
  points marked. Nothing draws anything in a reply today. A dungeon map has to be authored, which sits behind the source
  policy and a corpus rebuild. Research first. The maintainer raised dungeon maps again 2026-09-07 as a wave-four idea.
  [Detail](roadmap-details.md#kb-visual-maps).
- ★★★ `[KB]` **Spoiler coverage as a tiered setting** — **OPEN, tiers confirmed 2026-09-01.** Strict fences bosses, endings
  and chapters; default fences only named story beats and endings; open fences nothing you asked about. Naming a boss still
  unlocks it in every tier. Needs the settings plumbing, a prompt per tier measured on the answer test, a control with a
  focus entry, and Deck QA. About three days. (D50) [Detail](roadmap-details.md#spoiler-coverage-should-be-a-setting-with-tiers) · [Fencing](roadmap-details.md#user-adjustable-spoiler-fencing-absorbed-into-the-tiered-setting).
- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.**
  Measured 2026-09-07: nine of ten ordinary problem sentences ("my game keeps crashing", "my game won't
  launch") reach nothing at all, since the word "crash" alone is deliberately too weak to route a question.
  **Related work landed 2026-09-26:** the tip cut-off and a false-positive word match are now fixed, and the
  "no tip for this" line was retired by the maintainer 2026-09-27 (`db4b3b4a`). (D81, D85) [Detail](roadmap-details.md#a-troubleshooting-question-mostly-never-reaches-the-tips).
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get cards; today they get nothing specific. New card kinds and a spoiler table update, Left 4
  Dead 2 first, then Counter-Strike 2, from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md)
  [Detail](roadmap-details.md#kb-online--versus-strategy-content-and-rag-phase-5).
- ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **OPEN, added
  2026-09-25.** Never measured: no test question attaches a picture, and the notes are searched by the typed words only.
  First a scored set of real Deck screenshots (game, area, boss), run on each picture model the Deck offers; then fixes
  where it fails — the picture's guess fed into the search, notes that say what a place or boss looks like, and a screen
  guide per game (health bar, weapon slots, boss bar). [Detail](roadmap-details.md#measure-how-well-the-ai-reads-a-screenshot).
- ★★★★ `[KB]` **RAG Phase 4: extended retrieval** — **PARTIAL.** Tracks 1 and 2 shipped 2026-08-19 to
  2026-09-05 (D67); track 3, a running game's own Deck tip, is done and passed on the Deck 2026-09-26 (see
  Done). The chip labels fit on 2026-09-26. Left: that day the promise that at least one of the game's own
  chips always shows with the one-chip setting on failed (`docs/test-evidence/plan70-L6-PHASE4-CHIPS-01.json`).
  [Detail](roadmap-details.md#rag-phase-4-extended-retrieval).
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** 133 → 161 cards since 2026-08-29. **Counted
  2026-09-25:** only four of the original titles still have no enemy or item cards — Baldur's Gate 3, GTA San Andreas,
  The Sims 4 and Portal 2 — not eleven of thirteen as this entry used to say. Next: 40–60 entity cards in tranches with
  a quality read from you after the first; then chip ranking by meaning. Card authors cannot write blind test questions,
  so content and eval rows go in separate sessions. [Plan](planning/28-phase5-corpus-depth.md).
- ★★★★ `[KB]` **RAG Phase 7: retrieval infrastructure** — **OPEN.** Mostly nothing at 161 cards. What still
  matters: a thumbs-down that stops a wrong card coming back (three days), add-on packs before any large
  catalog (five days or more), a screenshot feeding the search. **The thumbs-down drawn 2026-09-26** (plan
  70, helper T): [three options, drawn true size](https://claude.ai/artifact/K2MXtVYoEYV6cNxsAzUh43).
  **Design C chosen by the maintainer 2026-09-27 (D112):** "Not really" opens the reason chips, and a
  "which note?" row only when two or three notes were used. Not built; ready for a feature session. [knowledge-base.md](knowledge-base.md) § Phase 7. [Detail](roadmap-details.md#rag-phase-7-community-tip-contribution-rag-phase-8).
- ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed card with
  one press: **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days.
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's
  games real notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice.
  Months of work — needs a wiki-ingestion pipeline, licensing, a size budget, packs and an index. **As of
  2026-09-18:** the source study is done, the first ten games are written from cleared wiki sources, the
  library is at 38 games (since 2026-09-26), and landing them reopened the no-new-games lock (D111). [Detail](roadmap-details.md#rag-phase-8-catalog-corpus).

---

## Shelved

Parked on purpose, not dropped. One line each, with what unshelves it; the full entries are in
[archive/roadmap-shelved.md](archive/roadmap-shelved.md).

- ★ `[platform]` **In-IDE preview never gets past its loading screen** — shelved 2026-09-11 (D93), not a gate
  for anything. Unshelves when the preview loads the plugin on the maintainer's machine.
- ★ `[KB]` `[watching]` **With a game running, the meaning search once read about a second (1,070 ms, 2026-09-23)** — moved to the watch list 2026-09-29; one sighting (1,070 ms, 2026-09-23), not seen again. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **Down does not move the ring off an unrevealed spoiler block** — moved to the watch list 2026-09-29; one sighting 2026-09-04, never reproduced; the milder form is fixed. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **Down from the chat row once skipped the whole answer, after returning from Settings** — moved to the watch list 2026-09-29; seen once, not reproduced in six tries. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **In carousel style, Down can land on a chip slid mostly off screen** — moved to the watch list 2026-09-29; one sighting, four tries did not reproduce it. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **Three more one-off focus sightings from free play, 2026-09-26** — moved to the watch list 2026-09-29; the accent one is fixed; the other two were one-off and did not reproduce. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **With details open, Down from "N earlier" jumps straight to the notes block** — moved to the watch list 2026-09-29; seen once in plan 70, not reproduced in plan 76. Unshelves on a new sighting.
- ★ `[layout]` `[watching]` **A thin strip of the answer shows through below the game-context line at the bottom of the Main panel** — moved to the watch list 2026-09-29; seen twice in 2026-09, not reproduced since. Unshelves on a new sighting.
- ★ `[layout]` `[watching]` **The "What went wrong?" block once ended 14 pixels under the dock** — moved to the watch list 2026-09-29; seen once, not reproduced. Unshelves on a new sighting.
- ★ `[reply]` `[focus]` `[watching]` **Two more sightings, 2026-09-26 (the chip ladder and two wrong answers)** — moved to the watch list 2026-09-29; the chip ladder steps one chip per press both ways, and the two wrong answers were not reproduced. Unshelves on a new sighting.
- ★★ `[ui]` **Glance view: the answer alone, in big text** — shelved 2026-09-12: too much UI change, and not
  ready for it yet. Unshelves on the maintainer's word; the mockup is kept.
- ★★ `[chat]` `[watching]` **A chat that is still writing does not look busy from another chat** — moved to the watch list 2026-09-29; seen three times, then not reproduced in two clean sessions. Unshelves on a new sighting.
- ★★ `[chat]` `[focus]` `[watching]` **A chat opened with RB while a game runs is drawn as history, and Down dies on its question line** — moved to the watch list 2026-09-29; seen once, not seen again in plan 72; named in the release notes. Unshelves on a new sighting.
- ★★ `[focus]` `[watching]` **Walking Down while an answer is still arriving loses the ring** — moved to the watch list 2026-09-29; seen once in plan 70, not reproduced in three tries. Unshelves on a new sighting.
- ★★ `[ollama]` `[focus]` `[watching]` **A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab** — moved to the watch list 2026-09-29; a touch report that the rig cannot reproduce. Unshelves on a new sighting.
- ★★★ `[KB]` **KB download Cancel, the Deck check** — shelved 2026-09-19 (D113). The download finishes in
  about a second, too fast to press Cancel in. Unshelves when a throttle or a slower test copy exists.
- ★★★ `[voice]` **Voices for the bundled characters** — shelved 2026-09-08 (D74). Unshelves after the
  character sweep, a legal check and the open licence call.
- ★★★ `[voice]` **Trained voices for the bundled characters** — shelved with the clip route 2026-09-08 (D74).
  Same legal gate, plus the plugin hosting voice files for the first time.
- ★★★ `[focus]` `[watching]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** — moved to the watch list 2026-09-29; most likely the same family as the D-pad trap fix in Verify (row P76-TRAP-FIX); plan 77's long play test decides it. 2026-09-29: plan 77's long play test was clean (24 of 24); still watched. Unshelves on a new sighting.
- ★★★★ `[voice]` **A voice for a custom character** — shelved with the bundled voices 2026-09-08 (D74). Same
  legal gate.
- ★★★★★ `[platform]` **Global quick-launch macro** — shelved 2026-09-19 (D113), the maintainer said drop it.
  Never run on hardware. Unshelves on the maintainer's word.

---

<a id="done-for-v050"></a>

## Done for v0.5.0

Everything shipped since v0.4.9 (2026-07-08), one line each — moved out to its own file to keep this one small,
copied line for line, nothing reworded: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).

Newest first. Everything closed from 2026-09-16 onward was moved into that file on 2026-09-21, copied
line for line, nothing reworded, to keep this document under its size limit.

Plan 64's flow G block, and the first two entries of its flow H block, were moved out the same way on
2026-09-24 during plan 65's bookkeeping pass, oldest of the remaining Done entries first, again to keep
this document under its size limit.

The rest of plan 64's flow H block was moved out the same way on 2026-09-24, during the planning-folder
review, again to keep this document under its size limit.

The chat-summary feature (plan 68, all three Deck passes), the CHAT-MEMORY-01 re-check (plan 68 Deck
pass, 2026-09-25) and the plan 65 trim-and-split entries were moved out the same way on 2026-09-26,
during the twelfth bookkeeping pass, again to keep this document under its size limit.

**Closed 2026-09-30 (plan 77, Deck blocks 1b and 3, builds `bce7d0fd` and `ec557922`):**

- ★★★ `[reply]` **Soft reply-length cap and thinking budget** — **DONE 2026-09-30, passed on the Deck.** SOFT-PREDICT-04 passed on a test build with the limit at 300: the wall was hit, two soft continues, clean text at every read (no half-drawn fence, stray JSON or "Continuing" in the finished or saved text). EXPERT-CAP-01 passed both halves (Expert 1200 against Speed 800; the continue half: three requests, two soft continues). A text-loss bug found in the same run is filed in Bugs (rows SOFT-PREDICT-04, EXPERT-CAP-01). Evidence `docs/test-evidence/plan77-SOFT-PREDICT-04.json`, `docs/test-evidence/plan77-EXPERT-CAP-01.json`, `docs/test-evidence/plan77-EXPERT-CAP-01-continue.json`. [Full detail](archive/roadmap-bugs-fixed.md#soft-reply-length-cap-and-thinking-budget-closed-2026-09-30)
- ★★ `[KB]` **KB transparency matches what the model got** — **DONE 2026-09-30, passed on the Deck.** The dropped-for-space half passed: with the note room cut to 1,500 bytes the log said 2 more were dropped, one note attached, and Show details listed exactly that one (row KB-TRANSPARENCY-01). Evidence `docs/test-evidence/plan77-KB-TRANSPARENCY-01.json`. [Full detail](archive/roadmap-bugs-fixed.md#kb-transparency-matches-what-the-model-got-closed-2026-09-30)
- ★★ `[chat]` **Deleting a chat whose file is already missing leaves its row in the list** — **DONE 2026-09-30, passed on the Deck.** With a chat's file removed over SSH, Delete took its row out of the list and the index, the other seven chats were byte-identical, no error, and the ring landed on the chat row (row CHAT-DELETE-MISSING-01). Evidence `docs/test-evidence/plan77-CHAT-DELETE-MISSING-01.json`. [Full detail](archive/roadmap-bugs-fixed.md#deleting-a-chat-whose-file-is-already-missing-leaves-its-row-in-the-list-closed-2026-09-30)
- ★ `[ollama]` **Three screens still say "FOSS" or "FOSS-friendly" for the default model, and the Tier 2 button "one-model multimodal" installs Gemma 4, now Tier 1** — **DONE 2026-09-30, passed on the Deck.** The second button reads "Install Gemma 4 (all-in-one model)"; the Tier 1 box says "one small model"; no "FOSS" or "one-model multimodal"; the ring opens on "Not now". The Gemma 4 box is titled "Turn on internet downloads?" while downloads are off (row P77-INSTALL-WORDING). Evidence `docs/test-evidence/plan77-P77-INSTALL-WORDING.json`. [Full detail](archive/roadmap-bugs-fixed.md#three-screens-still-say-foss-or-foss-friendly-for-the-default-model-and-the-tier-2-button-one-model-multimodal-installs-gemma-4-now-tier-1-closed-2026-09-30)
- ★★ `[ollama]` **The model tiers' licence labels** — **DONE 2026-09-30, passed on the Deck.** The amber "Qwen Research" pill shows on qwen2.5vl:3b and qwen2.5:3b, both lines readable, no clipping, columns do not shift; the other 14 rows show the green "FOSS" pill (row P77-LICENCE-FILTER). Evidence `docs/test-evidence/plan77-P77-LICENCE-FILTER.json`. [Full detail](archive/roadmap-bugs-fixed.md#the-model-tiers-licence-labels-closed-2026-09-30)
- ★ `[voice]` **The speech model is downloaded from a changing address and not checked** — **DONE 2026-09-30, passed on the Deck.** P77-SPEECH-PINNED passed 2026-09-29 (engine and tiny.en ready, no checksum lines; the download-check half rests on unit tests). P77-LIBRARY-CHECKSUMS passed: the library reported already up to date, no checksum error, and a Hades question still attached 3 notes. Evidence `docs/test-evidence/plan77-BLOCK2-CHATS-BACKEND.json`, `docs/test-evidence/plan77-P77-LIBRARY-CHECKSUMS.json`. [Full detail](archive/roadmap-bugs-fixed.md#the-speech-model-is-downloaded-from-a-changing-address-and-not-checked-closed-2026-09-30)
- ★ `[focus]` **After a Down press that scrolls past a spoiler cover, the ring sits on the section's box with its top third under the tab header** — **DONE 2026-09-30, passed by the session's ruling.** Every landing inside the band; the only overhang is 1 px (rounding). The rig's own words for QA-FREE-PLAY-01 read PASS with the known false alarms (rows P76-WALK-COVERS, QA-FREE-PLAY-01). Evidence `docs/test-evidence/plan77-P77-WALK-COVERS-MIRROR-R2.json`, `docs/test-evidence/plan77-QA-FREE-PLAY-01-game.json`. [Full detail](archive/roadmap-bugs-fixed.md#after-a-down-press-that-scrolls-past-a-spoiler-cover-the-ring-sits-on-the-sections-box-with-its-top-third-under-the-tab-header-closed-2026-09-30)
- ★ `[focus]` **Walking down a reply and walking back up visit different stops** — **DONE 2026-09-30, passed by the session's ruling.** The Up list is the Down list reversed, except one scroll-only press, which is not a stop; the box comes before its cover going Up (row REPLY-STOPS-MIRROR-01). Evidence `docs/test-evidence/plan77-P77-WALK-COVERS-MIRROR-R2.json`. [Full detail](archive/roadmap-bugs-fixed.md#walking-down-a-reply-and-walking-back-up-visit-different-stops-closed-2026-09-30)
- ★ `[focus]` **Walking Up into a section taller than the screen shows neither its top nor its bottom** — **DONE 2026-09-30, passed by the session's ruling.** With a game running, 32 stops, 0 cycles; the tall section is entered going Up with its bottom at the dock (1 px past, rounding) (row QA-FREE-PLAY-01, game half). Evidence `docs/test-evidence/plan77-QA-FREE-PLAY-01-game.json`. [Full detail](archive/roadmap-bugs-fixed.md#walking-up-into-a-section-taller-than-the-screen-shows-neither-its-top-nor-its-bottom-closed-2026-09-30)

**Closed 2026-09-30 (plan 77, Deck block 2, build `bce7d0fd`):**

- ★ `[reply]` **A Strategy answer's follow-up choices are sometimes not understood, so no choice menu shows** — **DONE 2026-09-29, passed on the Deck.** 8 troubleshooting questions with Deep Rock Galactic: Survivor running: every choice fence understood, no "did NOT parse" warning in the log (row P76-CHOICES-DRIFT). Evidence `docs/test-evidence/plan77-P76-CHOICES-DRIFT.json`. [Full detail](archive/roadmap-bugs-fixed.md#a-strategy-answers-follow-up-choices-are-sometimes-not-understood-so-no-choice-menu-shows-closed-2026-09-29)
- ★ `[reply]` **The back end's name-covering safety net only knows three-backtick blocks** — **DONE 2026-09-29, passed on the Deck.** No boss name outside a cover in two Soul Sanctum answers (row P77-TILDE-SAFETY-NET). Evidence `docs/test-evidence/plan77-P77-WALK-COVERS-MIRROR-FREEPLAY.json`. [Full detail](archive/roadmap-bugs-fixed.md#the-back-ends-name-covering-safety-net-only-knows-three-backtick-blocks-closed-2026-09-29)
- ★ `[chat]` **Back in a chat after leaving it, its own ban-lookup reply row is gone** — **DONE 2026-09-29, passed on the Deck.** The row stayed through switches across 7 chats and a Quick Access reopen. The "New chat" spot was not reached (RB stops at the eighth chat); that half was proven in plan 76 (row P77-BANROW-SWITCH). Evidence `docs/test-evidence/plan77-BLOCK2-CHATS-BACKEND.json`. [Full detail](archive/roadmap-bugs-fixed.md#back-in-a-chat-after-leaving-it-its-own-ban-lookup-reply-row-is-gone-closed-2026-09-29)
- ★ `[reply]` **After a chat switch, a stopped partial answer or a saved error as the newest turn also gets live Helpful buttons** — **DONE 2026-09-29, passed on the Deck.** Passed by the session's ruling: after a switch away and back, the stopped half-answer had no Helpful or Not really; the corner Retry icon stays, as on every answer, by design. Right after Stop (before any switch) the Helpful buttons still show (row P77-HELPFUL-STOPPED). Evidence `docs/test-evidence/plan77-BLOCK2-CHATS-BACKEND.json`. [Full detail](archive/roadmap-bugs-fixed.md#after-a-chat-switch-a-stopped-partial-answer-or-a-saved-error-as-the-newest-turn-also-gets-live-helpful-buttons-closed-2026-09-29)
- ★ `[ollama]` **Replies from the Ollama address have no size limit** — **DONE 2026-09-29, passed on the Deck.** A long answer arrived whole (1,740 characters), Hades notes still attached, the models list matches `ollama list`, no "far larger" line in the log (row P77-OLLAMA-SIZE-LIMITS). Evidence `docs/test-evidence/plan77-BLOCK2-CHATS-BACKEND.json`. [Full detail](archive/roadmap-bugs-fixed.md#replies-from-the-ollama-address-have-no-size-limit-closed-2026-09-29)
- ★ `[reply]` **A Strategy answer about the Deck overlay ended with the previous question's Hollow Knight choices** — **DONE 2026-09-29, passed on the Deck.** After Hollow Knight questions, the overlay and Quick Access answers named no Hollow Knight place or boss; the overlay menu was about the Deck and the other had none (row P77-STRATEGY-DECK-ITSELF). Evidence `docs/test-evidence/plan77-BLOCK2-CHATS-BACKEND.json`. [Full detail](archive/roadmap-bugs-fixed.md#a-strategy-answer-about-the-deck-overlay-ended-with-the-previous-questions-hollow-knight-choices-closed-2026-09-29)
- ★ `[ui]` **The reply-ready popup stays up about 10 seconds, not the 8 planned** — **DONE 2026-09-30, passed on the Deck.** Closed, not a bug: measured 7.87 s drawn, frame by frame over a game; the earlier 10 s counted the text lingering in the page while it faded. The recording is kept only on the maintainer's PC (`recordings/DeckRecord_20260930_000015_game.mkv`) (row P77-POPUP-VIDEO). Evidence `docs/test-evidence/plan77-BLOCK2-GAME.json`. [Full detail](archive/roadmap-bugs-fixed.md#the-reply-ready-popup-stays-up-about-10-seconds-not-the-8-planned-closed-2026-09-30)

**Closed 2026-09-29 (plan 77, docs sweep):**

- ★★★ `[focus]` **Over Fallout 4, the question box goes dead with no chip pressed** — **DONE 2026-09-29, passed on the Deck (row P77-TRAP-LONG; fix `7a7d59fe`).** A 40-minute play session over Deep Rock Galactic: Survivor: 24 reopens of Quick Access, the panel's window had the focus 24 of 24, 0 splits in 72 presses, Down never stuck, 6 of 6 walks reached Ask fully visible. Evidence `docs/test-evidence/plan77-P77-TRAP-LONG.json` and `checks/P77-TRAP-LONG-ASKWALK.json`. [Full detail](archive/roadmap-bugs-fixed.md#over-fallout-4-the-question-box-goes-dead-with-no-chip-pressed-closed-2026-09-29)
- ★ `[ui]` **Show details closes itself after moving to another tab and back** — **DONE 2026-09-29: closed, working by design — the maintainer's call 2026-09-29.** No code, no Deck row. [Full detail](archive/roadmap-bugs-fixed.md#show-details-closes-itself-after-moving-to-another-tab-and-back-closed-2026-09-29)

**Closed 2026-09-29 (plan 76, docs sweep 8, Deck block 3, build `4af8e7a1`):**

- ★ `[focus]` **Walking Down past a closed spoiler cover looped forever; covers cost an extra Down or a stop on their outer box** — **DONE 2026-09-29, passed by the session's ruling (row P76-WALK-COVERS re-run).** Helpful reached in 9 stops, no stop twice, no dead press, A opened both covers from both directions; one clause not met (a section box 67% on screen), filed as a new bug. The lone-cover-section part now takes the ring on the cover and A opens it (row REPLY-STOPS-MIRROR-01). Evidence `docs/test-evidence/plan76-P76-WALK-COVERS-try2.json`, `docs/test-evidence/plan76-REPLY-STOPS-MIRROR-01-try2.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[focus]` **"Remove nomic-embed-text from the Deck?" opened on "Remove model"** — **DONE 2026-09-29, passed first time on the Deck (row P76-REMOVE-MODEL-SAFE-FIRST).** Opens on "Not now"; A removed nothing. Evidence `docs/test-evidence/plan76-P76-REMOVE-MODEL-SAFE-FIRST.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[ui]` **After reinstalling the library, its status read "Not installed" for about a minute** — **DONE 2026-09-29, passed by the session's ruling (row P76-KB-STATUS-REINSTALL).** "Downloading…" with Cancel showed at once; "Installed" with no Cancel row came 0.55 s after the end, both runs. The heading line read "Not installed" during the 1.6 s download, which is true until it lands. Evidence `docs/test-evidence/plan76-P76-KB-STATUS-REINSTALL.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★★ `[ollama]` **After Cancel on the AI models screen, the saved licence setting and the screen disagreed** — **DONE 2026-09-29, passed first time on the Deck (row P76-LICENCE-CANCEL).** The pick was written at once and Cancel put the old licence back; the reopened screen matched; nothing downloaded. Evidence `docs/test-evidence/plan76-P76-LICENCE-CANCEL.json`. [Full entry](archive/roadmap-bugs-fixed.md)

**Closed 2026-09-29 (plan 76, docs sweep 7, Deck block 2c, build `ab56e2a2`):**

- ★ `[focus]` **After choosing an accent level, nothing held the ring and the first LB did not switch tab** — **DONE 2026-09-29, passed first time on the Deck (row P76-ACCENT-RING).** Ring on the accent control after a pick and after B on the menu; the first LB switched tab. Evidence `docs/test-evidence/plan76-P76-ACCENT-RING.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[focus]` **The library's Update and "Pull nomic-embed-text" buttons lost the ring after their notice closed** — **DONE 2026-09-29, passed first time on the Deck (row P76-KB-NOTICE-RING).** Ring on "Pull" after B, on "Update knowledge base" after the download starts, and after B with downloads off. Evidence `docs/test-evidence/plan76-P76-KB-NOTICE-RING.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[ui]` **The Context line briefly read the wrong thing after reopening the panel** — **DONE 2026-09-29, passed on the Deck (row P76-CONTEXT-REOPEN).** Five reopens over Deep Rock Galactic: Survivor named the game every time; after the game exited the first read said "no active game detected". Evidence `docs/test-evidence/plan76-P76-CONTEXT-REOPEN.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★★ `[reply]` **Picking a branch menu choice showed the model's own internal tag** — **DONE 2026-09-29, passed on the re-run (row KB-FOLLOWUP-QUOTE-02).** 1,378 page samples every 200 ms, none held "Strategy follow-up"; the turn header and the Session tab read "I'm at: …" once each. Evidence `docs/test-evidence/plan76-KB-FOLLOWUP-QUOTE-02-try2.json`. [Full entry](archive/roadmap-bugs-fixed.md)

**Closed 2026-09-29 (plan 76, docs sweep 6, Deck block 2b, build `ab56e2a2`; lanes 2 and 3 are a model trial):**

- ★ `[focus]` **"Remove knowledge base?" opens with the ring on "Remove"** — **DONE 2026-09-29, passed first time on the Deck (row P76-REMOVE-KB-SAFE-FIRST).** Opens on "Not now"; ring back on "Remove" after A or B. Evidence `docs/test-evidence/plan76-P76-REMOVE-KB-SAFE-FIRST.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[focus]` **After B on the library's location box, or after Remove, the ring goes to the tab bar** — **DONE 2026-09-29, passed first time on the Deck (row P76-KB-BOX-RING-RETURN).** Ring on "Download knowledge base"; library reinstalled to the same place. Evidence `docs/test-evidence/plan76-P76-KB-BOX-RING-RETURN.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[focus]` **Cancel on the AI models screen, with a model queued, sends the ring to the tab rail** — **DONE 2026-09-29, passed first time on the Deck (row P76-AI-MODELS-CANCEL-RING).** Cancel and Done put the ring on the button that opened the screen. Evidence `docs/test-evidence/plan76-P76-AI-MODELS-CANCEL-RING.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[focus]` **Two more boxes may start on their action button** — **DONE 2026-09-29 (rows P76-INSTALL-OPTIONS-RING, P76-TIER2-MODEL-SAFE-FIRST).** Install boxes: the ring returns to "Install options…" both times (passed on the tip build; the first try was on an older build). The per-model "Enable Tier 2 for this model?" box is not reachable with the shipped model list (open-weight rows show only under the Tier 2 filter), so it stays as a guard for a future list; the owed part is closed as not reachable by design (lane 2's answer, 2026-09-29). Evidence `docs/test-evidence/plan76-P76-INSTALL-OPTIONS-RING.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[ui]` **The "Enable Tier 2 before pulling?" box talks about a reply** — **DONE 2026-09-29, passed first time on the Deck (row P76-TIER2-MODEL-SAFE-FIRST; the install box's wording via P76-INSTALL-OPTIONS-RING, P76-TIER2-INSTALL-WORDING).** Opens on "Not now", queues nothing, no mention of a reply; the install box's wording passed again on its own. Per-model box: not reachable by design, closed. Evidence `docs/test-evidence/plan76-P76-TIER2-MODEL-SAFE-FIRST.json`, `docs/test-evidence/plan76-P76-TIER2-INSTALL-WORDING.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[focus]` **Nothing holds the ring when the Pull button disappears** — **DONE 2026-09-29, passed first time on the Deck (row P76-NOMIC-REMOVE-HINT).** When the model landed the ring was on "Update knowledge base" and Down moved it. Evidence `docs/test-evidence/plan76-P76-NOMIC-REMOVE-HINT.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[ui]` **The note-search hint can take up to 40 seconds to appear after a model is removed** — **DONE 2026-09-29, by the session's ruling on the timing (row P76-NOMIC-REMOVE-HINT).** The hint was already showing when the tab was drawn again (about 9.6 s after removal; the 5 s could not be timed). Evidence `docs/test-evidence/plan76-P76-NOMIC-REMOVE-HINT.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[reply]` **An opened spoiler cover closed again by itself** — **DONE 2026-09-29, passed first time on the Deck (row P76-COVER-STAYS-OPEN).** Still open 13 s after typing; A closed it. Evidence `docs/test-evidence/plan76-P76-COVER-STAYS-OPEN.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[focus]` **Walking Down through a long answer, the ring sticks on a highlighted word** — **DONE 2026-09-29, passed first time on the Deck with a game up (row P76-WALK-GLOSSARY).** Ring and page focus matched on every press; the next Down moved on. The "80 px a press" half is **still owed**: that section was only 72 px tall. Evidence `docs/test-evidence/plan76-P76-WALK-GLOSSARY.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★ `[ollama]` **A plugin reload stops a model download in progress** — **DONE 2026-09-29, passed on the Deck (row P76-PULL-RESUME).** After a reload the download resumed from 345 MB within 8 s; the note file was gone after it landed; a cancelled download did not come back. Off the 0.6.0 known issues. Evidence `docs/test-evidence/plan76-P76-PULL-RESUME.json`. [Full entry](archive/roadmap-bugs-fixed.md)
- ★★ `[KB]` **A question about a different game uses the chat's own game's notes** — **DONE 2026-09-29, passed on the Deck (row P76-OTHER-GAME-NOTES).** The log named Valheim as unknown and attached no notes; the follow-up used Hollow Knight's and attached 3. Evidence `docs/test-evidence/plan76-P76-OTHER-GAME-NOTES.json`. [Full entry](archive/roadmap-bugs-fixed.md)


Plan 76 sweeps 1 to 4 and the plan 75 (Sonnet 5.5 trial) block were moved out the same way on 2026-09-29, during docs
sweeps 6 and 8, to keep this document under its size limit: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).

**Closed 2026-09-26 (docs clean-up):**

- ★★ `[docs]` **Some long-notes blocks and testing rows didn't match what was found** — **DONE
  2026-09-26, docs only.** [Full detail](archive/roadmap-bugs-fixed.md#some-long-notes-blocks-and-testing-rows-dont-match-what-was-found-closed-2026-09-26).

**Plan 70 (2026-09-26 to 2026-09-27): 41 items closed** — the knowledge-base wave four and the Deck test wave,
flows L1 to L7 and the helpers' landings. Each one, word for word, with its evidence: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md); the long notes in
[roadmap-details.md](roadmap-details.md); the plan's own record in
[archive/70-kb-wave-four-and-deck-test-wave.md](archive/70-kb-wave-four-and-deck-test-wave.md) § 11.
