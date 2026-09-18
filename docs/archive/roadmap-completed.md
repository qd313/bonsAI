> **Archived** — see [archive README](README.md). Active summary: [roadmap.md](../roadmap.md) · [Verify](../roadmap.md#verify) · [fixed bugs](roadmap-bugs-fixed.md)

# bonsAI roadmap — completed features (full detail)

## Completed

Headings group related work. Star counts match the historical list.

### Reasoning display (2026-09-17)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-18 once six of the seven Deck rows passed — copied line
for line from this session's Verify entry, nothing reworded, with the closing note added at the end._

- ★★★★★ `[reply]` **Reasoning display** — **VERIFY, built 2026-09-17 (commits `a4fbf81`, `0551307`, `ac8d7eb`, `1f879a5`,
  `ae26454`, `57138ae`, `4c014f0`, `81f5847`, `ba00dc0`, `c5b046d`, plus a follow-up commit `fefca07` passing the thinking
  through the request layer).** While a thinking model works, the space under your question shows its own newest sentences;
  when the answer starts that folds to one line with the seconds; a press opens the whole thing; Show details gets a thinking
  chip; a one-time notice explains it the first time Thinking is turned on. Three landings did it: the back end keeps the
  model's thinking and carries it through; a one-time notice and the Thinking row's help text explain the setting; the chat
  shows the thinking live, then as the fold row, with the new stop wired in. Without the follow-up commit, the finished
  answer and the saved chat carried no reasoning at all. **The desk test on the PC, 2026-09-17:** across nine streams at
  three thinking levels, the model's own thinking always finished arriving before the first word of the answer, and no
  answer came back empty. **The larger answer test (T5) on the PC, 2026-09-17:** zero empty replies out of 183 tries at
  each of two thinking levels, so the fold does not show on a blank turn in this build. **Measured on the built-in screen,
  2026-09-17:** with the new fold row and the live thinking block both showing, about 61 pixels are left for the answer,
  down from the normal 94. **A bug found during that measurement is in Bugs, above:** pressing B while Show details is
  open does not close it. **Six of the seven Deck rows passed 2026-09-17** (bundle `af52c0aa`), plus the
  focus-graph checklist and the free-play sweep: **REASONING-01** through **04** and **06** all passed;
  **REASONING-07** failed on that build (declining left the ring on the tab strip instead of the Thinking
  row, and accepting the notice did not actually turn Thinking on until picked a second time) and was fixed
  the same day, commit `d2096ee`. **REASONING-07 passed on the re-run, Deck 2026-09-17, bundle `b8d903d9`:**
  declining now lands the ring back on the Off button inside the Thinking row and Thinking stays off;
  accepting turns Thinking on in the same press, checked three ways, and Balanced/Deep never shows the
  notice again. **The only thing still owed here is REASONING-05's body-text half:** its reasoning chip reads
  correctly, but the whole Show details chip row cannot be reached by the D-pad, so the chip's own body can
  only be read by a page read, not a controller — filed as its own Bugs entry, above; blocked on that bug.
  Evidence `docs/test-evidence/plan57-REASONING-01.json` … `-07.json`,
  `docs/test-evidence/plan57-REASONING-07-rerun.json`, `docs/test-evidence/plan57-REASONING-06a-rerun.json`,
  `docs/test-evidence/plan57-FOCUS-GRAPH-01.json`, `docs/test-evidence/plan57-QA-FREE-PLAY-01.json`.
  [Plan](../planning/40-reasoning-display.md) · [Build plan](../planning/57-reasoning-display-build.md).

  **Closed 2026-09-18:** six of the seven Deck rows pass, plus the focus-graph checklist and the free-play
  sweep. The one piece left, REASONING-05's body-text half, is not a fresh owed check of its own — it rides
  on the chip-ladder Bugs entry above ("The Show details chip ladder is not a D-pad stop") and will clear
  when that bug does.

### Token streaming Phase A/B (2026-09-04)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-18 once the rig's own checks passed — copied line for
line from this session's Verify entry, with the Deck results added at the end._

- ★★ `[reply]` **Token streaming Phase A/B** — **VERIFY.** Start stutter fixed, sections as D-pad stops, scroll follow. Rows
  **STREAM-REVEAL-01**, **STREAM-09**, **STREAM-FOLLOW-01**. [Review](../planning/05-token-streaming-review.md).

  **Passed on the Deck 2026-09-04, everything the rig can drive:** **STREAM-09** — three answer sections on one
  reply each took the ring going Down in turn, no dead end (Up skipping them on the way back is a separate,
  already-filed bug). **STREAM-FOLLOW-01, the D-pad half** — the transcript's scroll position tracked the
  growing answer, holding a constant distance above the true bottom (the sticky Ask bar). **STREAM-REVEAL-01** —
  text arrived steadily from 5.4 seconds in, in a smooth run of growing character counts with no freeze-then-dump.
  The touch-drag half of STREAM-FOLLOW-01 needs a finger and stays on the maintainer's own checklist. Detail:
  [testing-manual.md](../testing-manual.md), "Token streaming — D-pad chain" and "— scroll follow" rows.

### The tab bar collapses when not in use, and names the tab (2026-09-02, closed 2026-09-18)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-18 once every rig-drivable row passed — copied line for
line from this session's Verify entry, with the closing note added at the end._

- ★★★★ `[tabs]` **The tab bar collapses when not in use, and names the tab** — **VERIFY.** Shipped 2026-09-02 (plan 30 W0 to W6): a
  20px bar with the active tab's name at rest, opening to a strip that labels all six. Steam's header 81px to 20px. Rows 01 to 06,
  09 and 10 pass; owed **TAB-BAR-08** (touch). **TAB-BAR-07** (legibility by eye) was retired
  2026-09-17, replaced by **TAB-STRIP-2A-03** (plan 59). Closes the "tab names never appear" bug and D44.
  [Plan](../planning/30-collapsing-tab-bar.md).

  **Closed 2026-09-18:** **TAB-BAR-11**'s three rig-drivable remount paths all pass — the Clear cache modal
  return and two QAM chord close/reopens (2026-09-04), then a full loader restart (2026-09-05). The one path
  left, a real suspend and resume, needs a hand on the Deck's own power button and cannot be driven by the rig.
  With that and **TAB-BAR-08** (touch) the only pieces left, and both needing a finger or a hand rather than a
  script, this closes here; both stay on the maintainer's own checklist.

### A glow when the chip row runs out of chips (2026-09-05, closed 2026-09-18)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-18 once the rig confirmed the cue fires correctly — copied
line for line from this session's Verify entry, with the closing note added at the end._

- ★★ `[chips]` **A glow when the chip row runs out of chips** — **VERIFY.** Built at the desk 2026-09-05 under D62 #3: press Left or Right past the first or last suggestion chip and that chip glows briefly, the way a phone lights up the end of a list. Nothing about the row's existing edge behaviour changes. Reduced motion keeps the cue and drops the movement. **No measurement closes this one** — whether it reads as *end of list* rather than *error* is the maintainer's call from a recording, and it is on their checklist. **Since 2026-09-17 (plan 60), the cue itself moved:** the chip's outline no longer changes, so the flash is now the light bar under the chip flaring brighter, measured on the Deck (row CHIP-BUTTON-03). The maintainer's own by-eye call on whether it reads as *end of list* still stands.

  **Closed 2026-09-18:** the rig proved the cue fires on exactly the right presses, four of four, on 2026-09-05,
  and the cue itself moved onto the light bar under the chip on 2026-09-17. Nothing measurable is left to check;
  the *end of list* taste call is the maintainer's, already on their own checklist.

### Deferred manual QA (closed 2026-09-18)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-18 once the last owed check passed — copied line for line
from this session's Verify entry, with the closing note added at the end._

- ★★ `[QA]` **Deferred manual QA** — **VERIFY.** SMOKE-A, SMOKE-F, SMOKE-E and SMOKE-H all pass on the Deck: SMOKE-A
  2026-09-03; SMOKE-F re-confirmed 2026-09-17 (all four built-in commands answered with the same fixed wording,
  evidence `docs/test-evidence/plan57-QA-SMOKE-F.json`); SMOKE-E's spoiler tap-to-reveal path 2026-09-04; SMOKE-H
  2026-09-16. SMOKE-B was retired 2026-09-03 (D57 #6). Left: **SMOKE-C** is blocked by the Open Permissions jump bug,
  above, not owed as a test of its own. **Two of the three Tier 1 extras passed on the Deck 2026-09-18:** the last
  question and answer were still on screen after closing and reopening the panel, seen twice; and one Ask in Speed
  and one in Expert both worked as expected. Evidence `docs/test-evidence/plan61-tier1-speed.json`,
  `docs/test-evidence/plan61-tier1-expert.json`. Left: **"What game am I playing?"** with a game focused — needs a
  game running, scheduled for the games block. Round in progress:
  [plan 31](planning/31-deck-verification-round.md).

  **Closed 2026-09-18:** the third Tier 1 extra passed too — asked with Half-Life 2 running and focused, the
  plugin named the game correctly and gave real Half-Life 2 advice with a note card attached. All three Tier 1
  extras and SMOKE-A/E/F/H now pass. What's left, SMOKE-C, rides on the still-open Open Permissions jump bug
  rather than being owed as a check of its own. Evidence `docs/test-evidence/plan61-tier1-what-game.json`.

### Expert offers the stronger Deck-run models first, and the licence list learns the Sept 2026 models (2026-09-17)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-17 once the Deck confirmed the licence half — copied line
for line from this session's Verify entry, nothing reworded, with the confirmation added at the end._

- ★★ `[ollama]` **Expert offers the stronger Deck-run models first, and the licence list learns the Sept 2026
  models** — **VERIFY, landed 2026-09-16 (commits `0dbf25c`, `f812a9e`, `19e3396`).** In the download picker's
  Expert (large) group the five stronger Deck models now come first in bake-off order: Gemma 4 12B, Qwen 3.5
  9B, Granite 4.2 8B, Gemma 4 E4B, LFM 2.5. Gemma 4 and Granite now count as open source under the default
  open-source-only setting, and LFM as open-weight. **The order half passed on the Deck 2026-09-16:** with
  Essentials only off, the Expert (large) group read in the locked order, the five bake-off models first,
  then the three older ones. Evidence `docs/test-evidence/plan56-EXPERT-ORDER-01.json`,
  `docs/test-evidence/plan56-EXPERT-ORDER-01-essentials-off.json`. Row **EXPERT-ORDER-01**.
  [Bake-off](../planning/41-deck-model-survey.md).

  **The licence half passed on the Deck 2026-09-17:** in the AI models hub, a Gemma 4 tag reads as an allowed
  open-source tag even at the strictest policy tier. With the order half already passed 2026-09-16, the whole
  row is done. Evidence `docs/test-evidence/plan57-QA-EXPERT-ORDER-01.json`.

### Three voice fixes and the custom-model picker, closed by the wipe run (2026-09-16)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-16 once the Deck's pre-authorised wipe (D105) confirmed
their last owed checks — copied line for line from this session's Verify entries, nothing reworded, with the
confirmation added at the end._

- ★ `[voice]` **Three voice fixes from early August** — **VERIFY.** A finished install survives *Clear all
  plugin data* (**VOICE-CLEAR-01**, backend half verified), the install button reads right when the engine is
  already ready (**VOICE-REINSTALL-01**, done 2026-09-05), and the `status()` fix — a live start/stop
  recording — **done on the Deck 2026-09-06**: the button went *Voice input* → *Stop voice input* → *Voice
  input* with no error. It recorded silence, so nothing was transcribed; whether speech comes back as the
  right words is still owed and needs a person to talk to it. Only the *Clear all plugin data* half
  (**VOICE-CLEAR-01**) was left, and that waited for the final phase.

  **VOICE-CLEAR-01's UI half passed on the Deck 2026-09-16, as part of the wipe run:** after *Clear all plugin
  data*, the voice panel read "Engine: whisper-cli not installed · Model: tiny.en not downloaded · Tap Install
  voice engine below" — it no longer claimed the engine was ready. Together with the backend half already
  confirmed 2026-08-04, this row is now closed both ways. Evidence
  `docs/test-evidence/plan56-WIPE-01.summary.json`. **Still open, not a row of this entry:** whether spoken
  words come back transcribed correctly is unmeasured and needs a person to talk to the plugin; the wipe also
  removed the Deck's own local AI program and every downloaded model, so voice input cannot be exercised on
  this Deck until "Run AI on this Deck" is switched back on and the voice engine is reinstalled.

- ★★★ `[ollama]` **Custom model in the Pull Models picker** — **VERIFY, one check owed and it needs your
  permission.** Shipped and walked on the Deck 2026-09-05. A typed library name that is not in the built-in
  list pulls and installs; a made-up one explains itself; the star pins a model for Ask and reaches the
  settings file; a freshly pulled model is the only one badged **New**. **Three bugs were found on the device
  and fixed:** every installed model wrongly labelled New, a typing field 50 pixels wide, and the embedding
  model offered as one Ask could use. Owed: whether *Clear all plugin data* takes the New labels with it
  (**PULL-NEW-BADGE-01**). Rows **PULL-CUSTOM-01**, **02**, **PULL-PIN-01** already pass.

  **PULL-NEW-BADGE-01 passed on the Deck 2026-09-16, as part of the wipe run:** the browser-storage key
  holding the New labels' record was one of the eight plugin keys the wipe removed; after the wipe nothing
  was left to badge stale models as New. That was the entry's one owed check, so it is now closed. Evidence
  `docs/test-evidence/plan56-WIPE-01.summary.json`.

### The Clear button, the quiet answer checker, and the Spy's lies, confirmed on the Deck (2026-09-16)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-16 once the Deck runs passed — copied line for line from
this session's Verify entries, nothing reworded, with the confirmation added at the end._

- ★★ `[ui]` `[ask]` **Clear button in the session context strip** — **VERIFY, landed 2026-09-16 (commits
  `2eb2142`, `d4b077b`, `427d6e8`).** A small Clear now sits at the right end of the Session context (N turns)
  bar, shown only when that bar shows. A opens a confirm box "Start the next question fresh?"; Clear there
  shows a toast "Next question starts fresh" and the plugin forgets the subject of the last strategy question
  and the strategy checklist position for the running game — the chat and the bar's rows stay. Clear cache in
  Settings now does the same forget. Row **SESSION-CLEAR-01**: with the bar showing, check Right from its
  header lands on Clear, A opens the confirm box, Cancel returns the highlight to Clear, and OK shows the
  toast and the next bare follow-up no longer inherits the subject.

  **Passed on the Deck 2026-09-16.** Right from the bar's header reached Clear; A opened the confirm box with
  the ring on its own Clear button; B closed it with the ring back on the bar's Clear; A then A on the box's
  Clear closed it the same way; Left from Clear reached the header. The plugin's own log recorded the forget
  (`forget_game_ai_carried_context: forgot=['followup_subject', 'strategy_checklist_whole_store']`), and the
  chat and the bar's six turns stayed on screen throughout. **Not read this pass:** the toast's own text, which
  Steam draws in a layer the rig cannot see, and whether the next bare follow-up genuinely drops the old
  subject, which needs two model questions rather than a log line. Evidence
  `docs/test-evidence/plan56-SESSION-CLEAR-01.json`, `docs/test-evidence/plan56-SESSION-CLEAR-01-left.json`,
  `docs/test-evidence/plan56-SESSION-CLEAR-01.summary.json`.

- ★ `[ask]` **Run the answer checker quietly and count what it catches** — **VERIFY, landed 2026-09-16
  (commit `cce6bf9`).** The plugin's answer checker now runs on every answer and only writes one line to the
  log — nothing on screen, no second AI model call: "run_game_ai_request: answer checker ran rules_fired=N
  warnings=[...]". Row **ANSWER-CHECKER-LOG-01**: the log line has to be seen once on the Deck, then the
  checker left running through normal use so what it catches can be counted later.

  **Passed on the Deck 2026-09-16, the first time the checker has ever run:** the log carried
  `run_game_ai_request: answer checker ran rules_fired=0 warnings=[]` beside the answer's own completion line,
  nothing shown on screen, no second model call. The checker is now left running through normal use so what it
  catches can be counted over time. Evidence `docs/test-evidence/plan56-SPY-REVEAL-01.json` (the same Deck
  pass also carries this row).

- ★★★ `[reply]` **Spy: a character who lies to you on purpose** — **VERIFY, landed 2026-09-16 (commits
  `3cb00fe`, `4c422a9`, `45e9d57`, `1039154`).** At the Heavy or Unleashed accent setting the Spy now
  sometimes gives advice that sounds right and is wrong — wasted time only, never harm — and Show details on
  that reply gets a "Spy" entry reading "The Spy was on" with what he lied about, or "The Spy was on and did
  not confess". Below Heavy he is unchanged and no chip appears. Row **SPY-REVEAL-01**: pick Spy at Heavy, ask
  a strategy question, and check for the chip with a confession; at Balanced, check no chip appears.
  [Detail](roadmap-details.md#spy-a-character-who-lies-to-you-on-purpose).

  **Passed on the Deck 2026-09-16, at Heavy.** With the Spy picked and set to the Heavy accent, a Gonarch
  strategy question came back with two wrong-sounding tips inside a normal-reading 141-word reply; the
  closing tag naming the lies was stripped from what a person reads, as designed, and the Show details chip
  for that turn — read from the saved chat on the Deck's own disk — carried "The Spy was lying" with both
  lies named, in the seventh of seven chips on that turn. **Two halves are still owed, not this session's
  doing:** reading the chip's own body on screen by D-pad is blocked by the separate chip-row bug filed on
  the roadmap (Down from Hide details skips the whole chip row); and the Balanced "no chip" half was not
  re-run, to keep the Deck's character setting changes to one for the pass. Evidence
  `docs/test-evidence/plan56-SPY-REVEAL-01.json`, `docs/test-evidence/plan56-SPY-REVEAL-01-ladder-walk.json`.

### Rows span the QAM panel width, confirmed by eye on the Deck (2026-09-15)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-15 once the visual check passed — copied line for
line, nothing reworded, with the closing measurement added at the end._

- ★ `[layout]` **Rows span the QAM panel width** — **VERIFY.** Fixed 2026-08-16 and measured by probe (268 to
  300 px); the visual walk was never run. Confirm the Main rows look flush and nothing overflows the column.
  Row **ASK-WIDTH-01**.

**Passed on the Deck 2026-09-15.** Every Main row measured by rect spans the full 300-pixel column (48 to
348), nothing overflows sideways, and the screenshot shows the rows sitting flush by eye. Evidence
`docs/test-evidence/plan55-ASK-WIDTH-01.json`, screenshot `screenshots/DeckCapture_20260915_200505_game.png`.

### The seven-phase clean-up, round two (2026-09-15)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-15 when the last phase finished. The entry below is
copied line for line, nothing reworded, with its closing state added at the end. The plan itself is
archived at [51-refactor-round-two.md](51-refactor-round-two.md) and the honest account of what it cost
and what it missed is [the postmortem](../audit/refactor-round-two/postmortem.md)._

- ★★★★★ `[platform]` **Refactor round two (plan 51)** — **OPEN, planned 2026-09-11, calls locked (D89 to D96).** A
  seven-phase clean-up touching the code, the tests, the build scripts, the docs and how agent sessions work here,
  with nothing about how the plugin behaves changing for a person using it. Work starts only when the maintainer
  says the exact words "start refactor implementation now." **Progress, 2026-09-14:** phases 0 to 4 are done and
  checked on the Deck. Phase 4 moved the most code — the entry point is under three thousand lines for the first
  time, both back-end import loops are gone, and the Ask screen code has started coming apart. Its Deck evening
  found nothing a person would notice: one real question answered in 40.4 seconds against 42.6 the night before,
  voice word perfect, 18 controls reachable with no dead ends, and a log with no errors in it.
  [Plan](archive/51-refactor-round-two.md), [notes](audit/refactor-round-two/session-notes.md).

**Closed 2026-09-15.** All seven phases ran between 13 and 15 September. Phase 5 explained 257 files with
no line of program code changed, proved by stripping the comments from before and after and comparing what
was left. Phase 6 rewrote the README, the one guide and the orientation file in plain words, moved the
lessons that lived only in one tool's private memory into [lessons-learned.md](../lessons-learned.md), and
wrote the postmortem. Three things it did not manage — the settings list still written out by hand in seven
places, both big documents still over target, and duplication slightly worse than when it started — are in
the postmortem and on the open lists.

### The decode animation on the preset chips, judged by eye (2026-09-14)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-14. The device measurement was done on
2026-08-28; the only thing left was whether the reveal reads well, and the maintainer judged it good
on 2026-09-14. The entry below is copied line for line, nothing reworded._

- ★★★ `[chips]` **Decode preset chip animation** — **VERIFY, feel only.** Shipped 2026-08-28. Measured on device: a flat 60 fps with
  all chips decoding. Whether it feels right is a person's call. Row **PRESET-STREAM-ANIM-01**.

### The reply block rework, checked on the Deck (2026-09-06)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-14 once the Deck check passed — copied line for
line, nothing reworded._

- ★★★ `[layout]` **Copy sits in the answer's corner, not in a button row** — **VERIFIED on the Deck 2026-09-06.** The row of
  buttons under a reply is gone. **Copy** is a small faded icon tucked to the answer's bottom right — press Right from the last
  part of the answer to reach it, Left to come back. **Retry** is a faded circular arrow on the newest question's bubble, on its
  left — press Left from the question, Right to come back. **What the runs show:** walking the whole reply down and back up
  again visits every control once, in order, with no loop and nothing hidden, and pressing Copy put all 1,834 characters of the
  answer on the clipboard. Pressing the question still opens and closes it and does not start a Retry. An older question shows
  no arrow. Two problems were found and fixed on the device before this closed — see the notes on the entry below and the
  planning file. Runs: `reply-block-final-walk`, `copy-right-from-answer`, `press-question-not-retry`,
  `question-bubble-two-stops`. Rows **COPY-REPLY-01**, **COPY-REPLY-02**, **RETRY-CORNER-01**, **CHAT-REPLY-ENTRY-01**.

- ★★ `[layout]` **Show details becomes a divider, not a chip** — **VERIFIED on the Deck 2026-09-06.** Under a finished answer
  there is a thin line across the reply with **Show details ↓** in the middle. **What the runs show:** the line is 267 pixels
  wide starting at the same left edge as the answer bubble above it, so the two share both edges exactly. One press opens the
  chips and turns the label into **Hide details ↑**; one more press closes it — the double-toggle worry did not happen. The
  ring reaches it walking down and walking up, and it is fully on screen, not behind the input bar. Nothing overflows sideways.
  Run: `reply-block-final-walk`. Row **SHOW-DETAILS-01**.

- ★★ `[focus]` **Fewer D-pad stops on a finished reply** — **VERIFIED on the Deck 2026-09-06.** **What a person notices:** an
  answer of about 1,800 characters used to be one stop per paragraph — six of them. It is three now, and each press either moves
  the ring to a part of the answer already on screen or scrolls the panel; nothing is skipped. A short answer of 400 characters
  is a single stop. Code blocks still stand alone. Runs: `reply-block-final-walk`. Rows **D-PAD-SCROLL-02**, **STREAM-09**.

### Round 34 continued (2026-09-06)

- ★★★ `[platform]` **Legacy-loader shim removal (D11)** — the old compatibility layer that every Ask used to pass through was
  taken out on 2026-08-03. The backend side was proved the next day by driving all the affected calls on the device (21 of 21
  clean). What was left was the part a probe cannot do: a real Ask typed into the Main tab against a working Ollama, and a
  voice recording started and stopped for real. **Both run on the Deck 2026-09-06.** Two Asks completed through the Main tab
  (one finished in 23.6 seconds, one stopped on purpose), and the voice button went *Voice input* → *Stop voice input* →
  *Voice input* with no error and no crash in the log. The recording was silence, so nothing came back as text — the right
  outcome for silence, and whether speech comes back as the right words belongs to the voice rows, which are still open.
  Row **D11-SHIM-01**.

### Round 36 (2026-09-05)

- ★★ **Replies always arrive word by word:** streaming used to be a Developer-screen switch called *Token streaming (experimental)*, off by default, so an ordinary person's replies landed in one lump at the end. It is now simply how replies work, and the switch is gone. The setting's two names appeared 27 times across 14 files, all removed in both languages; both shared agreement files lost the key too, so an incomplete two-language edit would fail a test rather than ship. **The upgrade was the risk, and it was proven before the removal:** a settings file already on a Deck still carries the deleted key, and loading it must drop that key quietly and leave every other setting untouched. A shared test case named for the real key was written and watched passing in both languages first. **On the Deck 2026-09-05:** a copy of the device's real settings file was made to look like one written by the previous build, the new build deployed, the panel opened — 47 settings before, 46 after, the only loss the dead key, nothing else changed. Then a long question with no streaming key anywhere in settings: the answer grew through 28, 127, 247, 403, 515, 627, 666 characters over eight seconds, eleven separate steps. The Developer screen carries no streaming control. Rows **STREAM-UPGRADE-01**, **STREAM-DEFAULT-01**.
- ★★ **Preset chip expansion (waves 1 and 2):** the suggestion row above the question box now offers six prompts for things that shipped after early August — thinking mode, the kids master lock, the Caveman reply style, where the game tips come from, starting a named chat, and asking about a game that is not running. None carries the **Tip** badge (that badge is a claim the knowledge base covers *this game*, and these are about the plugin) and none switches the Ask mode. **Verified on the Deck 2026-09-05**, and the measurement took three attempts because of something worth writing down: **the row only rotates for sixty seconds after the panel opens, then freezes on whatever it is showing until you reopen.** A first watch caught the tail of that minute and a second sat entirely inside the frozen period, showing the same five chips 113 times. Watched from a fresh start, about ten prompts came round in 76 seconds and *"Where do your game tips come from?"* appeared. Pressing A filled the question box with the exact wording and sent nothing. Wave 1's prompts (the quick-launch chord, streaming, finding Ollama on the network) were seen in the same sitting with their beta styling, closing that row too. Rows **PRESET-EXPAND-W1-01**, **PRESET-EXPAND-W2-01**.
- ★★★ **One suggestion chip instead of two:** a Settings switch, off by default. **Verified on the Deck 2026-09-05:** with it on, one chip fills the whole 300px column, measured, where two chips are 148px each. The row's height and the question box's position did not move, so nothing shifted. Left and Right still walk the suggestions, and a second Right correctly stopped at the end of the list, which is where the out-of-suggestions glow fires — with one chip the first and last chip are the same one. Turning it off restored two chips at 148px. The settings file on disk gained the key at its default and every other setting was untouched. Known and not fixed: the hold time is still worked out from the two-chip width, so a long single chip may sit on screen longer than it needs to — never shorter. Rows **PRESET-SLOTS-01**, **PRESET-SLOTS-02**.

### Maintainer tooling and docs

- ★★★ **Permissions cleanup + obsolete features batch (2026-07-30):** Removed **Open web links** (`external_navigation`) — user-initiated docs/GitHub/Steam settings/Steam Input always allowed. Folded Proton log attach into **Read game & screenshot context** (auto-attach on troubleshooting Asks). Obsoleted Proton experiment journal UI + inject, Search intent packs Settings UI, tiny-model thinking blurbs, Response verification UI/path, and **Adjust power limits** / `apply_tdp` (TDP/GPU suggestions read-only). Added dismissible troubleshooting permission hint on Main. Files: `PermissionsTab.tsx`, `game_ai_request.py`, `capabilities.py`, settings schema/normalizers/payload, `AboutTab.tsx`, `OllamaTab.tsx`, `MainTabChatTranscript.tsx`, `troubleshootingAskHeuristic.ts`. On-Deck QA: **PERMS-CLEAN-01…06** in [testing.md](../testing.md). Later review: Proton journal / intent packs keep/quiet/Dev.

- ★ **Reply language default display (2026-07-30):** About **Reply language** closed dropdown showed placeholder **Language** instead of **Follow system** on load — Decky `Dropdown` expects `selectedOption` as the option `.data` value, not the full option object. File: `AboutReplyLanguageSection.tsx`. Unit: `replyLanguage.test.ts`. On-Deck QA: **LANG-01** in [testing.md](../testing.md).
- ★ **Keep-alive slider focus outline (2026-07-30):** White gpfocus ring on **Keep models loaded** unload-delay thumb sat slightly high; nudge thumb **1px down** (`marginTop: 3`) so the ring looks vertically centered. File: `SettingsTabOllamaKeepAliveSlider.tsx`. On-Deck QA: **OLLAMA-KEEPALIVE-FOCUS-01** in [testing.md](../testing.md).
- ★ **Strategy placeholder focus (2026-07-30):** Empty Strategy Ask overlay — fake caret is absolutely positioned so “Describe the level, boss…” does not reflow when focused. Files: `MainTabUnifiedAskBar.tsx`, `section-5.ts`. Unit: existing preview; on-Deck QA: **STRATEGY-PLACEHOLDER-01** in [testing.md](../testing.md).
- ★ **Ask-bar caret with AI character avatar (2026-08-07):** With AI character on, the native caret rendered at the row origin while placeholder/overlay text started after the avatar badge (`padding-left` hack). Avatar is now a flex sibling outside `.bonsai-unified-input-text-box`; removed the extra left padding on textarea/measure/overlay. Files: `MainTabUnifiedAskBar.tsx`, `section-5.ts`. No Ask-bar render harness — on-Deck QA: **ASK-CARET-CHAR-01** in [testing.md](../testing.md).
- ★ **Stream preset chip animation (Wave 4 J — 2026-08-07):** Fourth `presetChipAnimation` mode `stream` — per-slot typewriter reveal with block caret, `holdMsForPresetText` hold, then swap; `prefers-reduced-motion` instant swap; chips stay focusable during reveal. `PRESET_CHIP_ANIMATION_OPTIONS` + Python `sanitize_preset_chip_animation`; Developer tab reads exported list. Files: `MainTabPresetAnimatedChips.tsx`, `section-4.ts`, `bonsaiSettingsSchema.ts`, `settings_service.py`, `DeveloperTab.tsx`. Unit: `MainTabPresetAnimatedChips.test.tsx`, `test_settings_service.py`. On-Deck QA: **PRESET-STREAM-ANIM-01** in [testing-manual.md](../testing-manual.md). **Superseded 2026-08-28** — see the Ghost in the Shell chip decode entry below; `stream` no longer exists as a mode.
- ★★★ **Ghost in the Shell preset chip decode (2026-08-28):** Replaced `stream`'s left-to-right typewriter with a scramble-to-resolve reveal — the same `presetChipAnimation` slot, renamed `decode` (a **rewrite, not a fifth mode**). Each chip now paints a full-width block of scrambled half-width glyphs (ASCII plus half-width katakana U+FF66–U+FF9D — never full-width CJK, which would be double-width and push a long prompt into the ellipsis mid-reveal) at the prompt's *final* character count from frame 0, so the chip never reflows the way the old per-character growth did. Characters then lock left to right at `PRESET_DECODE_CHAR_MS` (42ms, unchanged) behind a caret drawn inline at the lock boundary — never a separate character, so the string stays exactly `text.length` throughout — then hold and move to the next prompt. Colour is `var(--bonsai-ui-accent-main, #2e8753)`, never hardcoded. A single shared `requestAnimationFrame` loop drives all three slots and writes straight to each label's `textContent` through a ref, throttled to a lock advance / ~55ms churn refresh / ~450ms caret blink rather than every frame — React `slots` state still exists but now only changes once per prompt cycle, not per character, which is what kept the old mode to one `setState` per character per slot and would have made a naive churn effect three re-renders per 16ms frame in the 300px QAM column. Chips stay D-pad focusable while churning and **A always selects the real prompt** (`onClick` reads the preset object, never the on-screen text) — provably true from frame 0 now, since the real text was always known. `prefers-reduced-motion: reduce` skips the whole rAF path (plain `setTimeout`, instant text, no caret). **Migration:** a Deck whose `settings.json` still holds `stream` maps forward to `decode` in `sanitize_preset_chip_animation` (Python, D13-authoritative) and `normalizePresetChipAnimation` (mirrored in TS) — never falls through to the `fade` default, which would have read as an unexplained reset. Covered by a shared hostile-input contract case (`tests/contracts/settings-hostile-inputs.json`) asserted from both languages. Files: `MainTabPresetAnimatedChips.tsx`, `section-4.ts`, `bonsaiSettingsSchema.ts`, `bonsaiSettingsNormalizers.ts`, `settings_service.py`, `MainTab.tsx`, `MainTabPresetRow.tsx`. Unit: `MainTabPresetAnimatedChips.test.tsx` (`composeDecodeText` shape, full-prompt-on-select, reduced-motion instant swap — animation timing itself is not meaningfully unit-testable), `test_settings_service.py`, the shared hostile-input contract. On-Deck QA: **PRESET-STREAM-ANIM-01** (kept its id; same slot in the mode list) in [testing-manual.md](../testing-manual.md) — frame-rate feel with three chips churning and the focus-during-churn D-pad walk are device-only and still owed.
- ★ **Global document sweep (Wave 4 H — 2026-08-07):** Replaced eight SharedJSContext `document` lookups with `getUiDocument()` / `uiActiveElement()` / `elementHasFocus()` or a registered ref (`AboutTab` language dropdown). Files: `chatPanelScroll.ts`, `focusNavigation.ts`, `settingsPanelScroll.ts`, `MainTabChatTranscript.tsx`, `MainTabUnifiedAskBar.tsx`, `MainTabPresetAnimatedChips.tsx`, `AboutTab.tsx`, `AboutReplyLanguageSection.tsx`, `useBonsaiAskOrchestration.ts`. Unit: `focusNavigation.test.ts`, `uiDocument.test.ts`. On-Deck QA: **DOC-SWEEP-01** in [testing-manual.md](../testing-manual.md).
  - **Completed 2026-08-07 (review follow-up): the sweep only took effect after the first answer.** `rememberUiDocument` was called from three registries — answer bubble, answer stop, spoiler fence — all of which mount only once a reply renders, so until then `getUiDocument()` fell back to the SharedJSContext shell and every site converted above was still asking the wrong document. That covered the blur-on-submit in `useBonsaiAskOrchestration`, which is on the **first**-Ask path by definition, plus the Ask-bar keydown capture, `tryScrollPanelFromFocus` and `getFocusableWithin`. `BonsaiPluginShell` now seeds the document from its root ref, which is the earliest node the plugin owns. `elementHasFocus` was never affected (it asks `el.ownerDocument`). Files: `BonsaiPluginShell.tsx`, `uiDocument.ts`. Unit: `BonsaiPluginShell.test.tsx` (3, rendered into a non-global document so the seeding is actually observable).
- ★ **onButtonDown audit (Wave 4 G — 2026-08-07):** Whitelisted state-changing handlers with `isOkDeckButtonEvent` (context hint, session row, Show-details highlight); switched direction handlers to `isDeckDirection*Event` and dropped redundant `onMove*` twins on turn header, answer bubble, UI-scale bridge, and slider thumb. New `isDeckDirectionLeftEvent` / `isDeckDirectionRightEvent`. Files: `focusNavigation.ts`, `ContextChipLadder.tsx`, `SessionContextStrip.tsx`, `MainTabChatTranscript.tsx`, `buildTurnHeaderElement.tsx`, `buildAnswerBubbleElement.tsx`, `SettingsTabUiScaleSection.tsx`, `DeckFocusSlider.tsx`. Unit: `focusNavigation.test.ts`, `buildAnswerBubbleElement.test.tsx`. On-Deck QA: **ONBUTTONDOWN-AUDIT-01** in [testing-manual.md](../testing-manual.md).
  - **"Redundant `onMove*` twins" is the one thing they could not have been — flagged 2026-08-07, unresolved without a device.** The old `onButtonDown` direction predicates stringified their argument and so never matched a `GamepadEvent` (`focusNavigation.test.ts` asserts exactly this), which means the `onMove*` handlers were carrying **all** of the direction work, not duplicating it. Dropping them leaves a single untested path. The giveaway that nobody knew which handler fires: `buildDeckThumbNavHandlers` **kept** `onMoveUp`/`onMoveDown` on the same object it dropped `onMoveLeft`/`onMoveRight` from — both cannot be correct. It also runs against `.cursor/rules/decky-focus-graph.mdc`, which requires slider bridges to carry vertical **and** horizontal handlers and names `SettingsTabUiScaleSection.tsx` as the pattern to mirror. **Not reverted**, because restoring both paths double-steps if `onButtonDown` does fire — the choice needs the measurement, not a guess. **ONBUTTONDOWN-AUDIT-01** was rewritten to record which of the two failure modes appears (nothing happens vs two steps / focus escape) and to cover all four `DeckFocusSlider` users rather than UI scale alone.
- ★ **Preset chips no game append (2026-07-30):** Preset carousel/inject chips copy wording only; `joinPresetWithRunningGame` no longer substitutes “this game” or appends `— {Game}` (session game context is separate). Files: `joinPresetWithRunningGame.ts`, `MainTabPresetAnimatedChips.tsx`, `MainTabPresetRow.tsx`. Unit: `joinPresetWithRunningGame.test.ts`. On-Deck QA: **PRESET-GAME-01** in [testing.md](../testing.md).
- ★★ **Ollama tab focus + connection + models routing batch (2026-07-30):** Auto-probe on Ollama section mount so **Install Ollama** / **Update AI & models** reflects reachability without **Test connection**; local-setup D-pad chain (toggle → Install/Update → Browse → Install options → Test); KB Update/Remove as horizontal pair (Up → toggle, Down → Reply style); Models & routing glass buttons; try-order modal fetches installed tags on open + persists reorder. KB equal-height follow-up: fixed shared `minHeight` + nowrap (DeckCapture_20260730_144644). Try-order focus/chrome deferred → Bugs. Files: `OllamaWhereAiRunsSection.tsx`, `KnowledgeBaseSection.tsx`, `OllamaTab.tsx`, `index.tsx` `openRoutingOrderModal`, `settingsGlassButton.ts`. On-Deck QA: **OLLAMA-FOCUS-01…03**, **KB-FOCUS-01**, **ROUTING-01…02** in [testing.md](../testing.md).

- ★★ **Code clarity refactor Phase 0–2 (2026-07-30):** House-style file headers ([code-clarity.md](../code-clarity.md)), [glossary.md](../glossary.md), Ask-path map, section labels in `useBonsaiAskOrchestration.ts`, extracted `useStrategyChecklistSession.ts`, hotspot headers (Ask path, Ollama UI, `main.py` Ask/Settings RPC, key backend services). No behavior change.
- ★★ **Handoff refactor Phase 0–1 (2026-08-02):** Deleted `src/config.ts` (zero importers) together with the `do_generate_config` generator in `scripts/build.sh` and its dead `PC_IP` preflight, and removed the 56-file untracked `src/v0-drafts/` (archived outside the repo first). Wrote [CLAUDE.md](../../CLAUDE.md) — layout, entry points, the TS↔Python RPC boundary, commands, conventions, refactor rules — kept distinct from [AGENTS.md](../../AGENTS.md) (MCP tooling) and `.cursorrules` (Cursor bootstrap). Fixed two stale Python tests that had been failing silently in the suite (`test_local_ollama_teardown` patched a `subprocess` import the module never had; `test_ollama_prompts_stream_instruction` asserted copy removed by `ff6547f`), so all four suites are now green. Recon persisted in [docs/audit/](../audit/). No behavior change.
- ★★ **Agent architecture snapshot fixes (2026-08-02):** `generateRpcMap` matched `/^\s+async def/` at any indentation, so four nested `async def runner()` local coroutines were published as RPC methods (59 entries for 55 real ones); now anchored to indent 4. Renamed `module-map.json` → `hotspots.json` (size ranking, not a dependency graph) and added `import-graph.json` — imports/importedBy for all 223 `src/` TS files with cycle and orphan detection, built dependency-free so the pre-commit hook stays fast (479 edges, 0 cycles, 0 orphans). Completed the `DOMAIN_KEYWORDS` taxonomy: all 55 RPC methods classify, none fall through to `other`. Files: `generate-architecture.mjs`, `validate-knowledge.mjs`, `sync-architecture-for-commit.mjs`, `packages/bonsai-mcp/src/server.ts`. Detail: [phase1-map-verification.md](../audit/phase1-map-verification.md).
- ★★ **RPC timeout wrapper coverage (2026-08-02):** `deckyCall.ts` exists so no RPC can hang the UI, but raw `call()` outnumbered it 29 to 24 — including every `save_settings`/`load_settings` site, which the wrapper's own docstring claimed to cover. Bounded calls now route through `callDeckyWithTimeout` (args move from spread into an array); four long-running calls stay unbounded with an inline reason. **Behavior change, not a pure refactor** — a hung backend now surfaces a timeout instead of waiting forever. On-Deck QA: **RPC-TIMEOUT-01** in [testing.md](../testing.md).
- ★★ **Code clarity remainder sweep (2026-07-30):** Headers on remaining `src/` hooks/utils/components/data/features/i18n`, all `py_modules/` services, `main.py` domain section labels, `refactor_helpers.py`, preview/styles entry files. Skipped per policy: `v0-drafts/`, `styles/sections/*` token dumps, `characterPlaceholderEmoticonGrids.ts`, generated `pluginVersion.ts`, `types.d.ts`. No behavior change.

### Release and distribution

- ★★ **Spoiler confidence chip (2026-08-07):** Show details context chip **Spoiler risk: low\|med\|high** on every Ask mode — heuristic from genre, mode, KB `section_type`, entity match, blended ~60% with optional closed `<bonsai-spoiler-risk>` model tag; transparency-only (no fencing change). Files: `spoiler_risk_service.py`, `transparency_service.py`, `game_ai_request.py`. Unit: `tests/test_spoiler_risk_service.py`. On-Deck QA: **SPOILER-RISK-CHIP-01** in [testing.md](../testing.md).
- ★★★★ **Spoiler constitution runtime encoding (2026-08-07):** Built-in title profiles (`low_narrative` / `protect_progression` / `unknown`), subtractive strategy-domain prompt policy (Strategy + Speed/Expert with strategy KB), consent unwraps all fences including history, risk chip uses inherent profile not genre. Files: `spoiler_title_profiles.py`, `spoilerTitleProfiles.ts`, `ollama_prompts.py`, `game_ai_request.py`, `unwrapAskedEntitySpoilerFences.ts`. Rulebook: [spoiler-constitution.md](../planning/spoiler-constitution.md). Unit: `test_spoiler_title_profiles.py`, `test_ollama_service.py`, `test_spoiler_risk_service.py`, `unwrapAskedEntitySpoilerFences.test.ts`. On-Deck: **CONST-SPOIL-01**, **CONST-SPOIL-CONSENT-01**, **CONST-SPOIL-SPEED-01** in [testing.md](../testing.md). Soft-omit / adjustable fencing remain Planned.
- ★ **Show details gates context chips + pre-Ask game context (2026-07-27):** Inline ladder mounts only while **Show details** is open; `ollamaContext` syncs from `Router.MainRunningApp` when not mid-Ask so the footer/banner is correct before send. Files: `MainTabChatTranscript.tsx`, `useBonsaiAskOrchestration.ts`. On-Deck QA: **CONTEXT-LADDER-01**, **GAME-CONTEXT-01**.
- ★ **Reply 2×2 column D-pad (2026-07-27):** Helpful↔Retry and Not really↔Show details via mount-time ref registry (`replyStopRegistry.ts`); Decky `document.querySelector` is unreliable for these stops. Files: `buildReplyActionsElement.tsx`, `BonsaiChatSecondaryButton.tsx`, `liveTurnFocusGraph.ts`. On-Deck QA: **MICRO-05**.
- ★★★ **Multi-language replies (2026-07-18):** Steam client `config.vdf` language drives Ask replies via hard system-prompt inject; About tab **Reply language** dropdown (`follow_system` / **Always English** / all Steam languages). Partial UI i18n for Ask status + high-traffic toasts (`src/i18n/`); preset chips stay English. Files: `reply_language_service.py`, `ollama_prompts.py`, `AboutReplyLanguageSection.tsx`, `useReplyLanguage.ts`. On-Deck QA: **LANG-01…03** in [testing.md](../testing.md).
- ★★★ **QAM tab strip layout (Bazzite / gamescope — 2026-07-08):** On **Bazzite Game Mode**, `.bonsai-scope` could collapse to **~80px**, tab body painted over LB/RB icons, and mount showed a thin left strip until pointer entry. **Fix:** `useQamPanelHeightGuard` locks scope to Steam QAM tab host height (~936px); `useTabStripBodyOffset` sets `--bonsai-tab-strip-reserve` after carousel settles; `bonsai-qam-strip-stable` chip margin tweak. **Rejected:** ResizeObserver on scroll content (runaway height); inner-wrapper `flex-column` + 40px `DialogButton` widths (vertical carousel stack). Files: `useQamPanelHeightGuard.ts`, `useTabStripBodyOffset.ts`, `scopeBase.ts`, `section-1.ts`, `section-3.ts`. On-Deck regression: **QAM-BAZZITE-01** in [testing.md](../testing.md).
- ★★ **D-pad scroll viewport (2026-07-17):** Controller D-pad could not reach the bottom or top of tab content (including LB/RB icons) after token streaming — `TabContentsScroll` grew with content (`scrollHeight === clientHeight`, `tabMax: 0`). **Fix:** `syncTabBodyViewportHeight` sets `--bonsai-tab-body-height`; durable scope lock via `--bonsai-qam-lock-height` + `.bonsai-qam-height-locked`; flex/overflow CSS on tabs chain; panel scroll order (step before focus graph when `scrollTop > 0`); geometry fallback in `chatPanelScroll.ts`. Files: `tabBodyViewport.ts`, `useQamPanelHeightGuard.ts`, `chatPanelScroll.ts`, `answerBubbleNavigation.ts`, `settingsPanelScroll.ts`, `scopeBase.ts`, `section-1.ts`, `section-3.ts`. On-Deck QA: **D-PAD-SCROLL-01** in [testing.md](../testing.md).
- ★★ **Voice STT session daemon (2026-07-17):** Session-scoped CPU-safe `whisper-server` on `127.0.0.1:18765` reuses one loaded model per mic recording (no per-pass `whisper-cli` spawn). **Install voice engine** now builds `whisper-cli` + `whisper-server`; existing CPU-safe installs get incremental server-only build. CLI fallback when server missing or health fails. `voice_whisper_daemon.py`, `voice_transcription_service.py`, `main.py`; tests `test_voice_whisper_daemon.py`. On-Deck QA: **VOICE-06**, **VOICE-07** in [testing.md](../testing.md).
- ★★★ **Reply ready toast (2026-07-17):** When any Ask completes (typed, mic-button STT) and bonsAI Main is not already visible, show a Decky **Reply ready** toast; tap opens QAM to Decky/bonsAI Main. Ask failure → error toast; cancel → no toast. Module-level `bonsaiAskCompletionWatch` keeps polling after QAM close unmounts `Content`; phase toasts replace prior via `bonsaiPhaseToast`. Files: `bonsaiPhaseToast.ts`, `bonsaiReplySurface.ts`, `bonsaiReplyReadyToast.ts`, `bonsaiAskCompletionWatch.ts`, `useBonsaiAskOrchestration.ts`, `index.tsx`. Unit: `bonsaiPhaseToast.test.ts`, `bonsaiReplyReadyToast.test.ts`, `bonsaiAskCompletionWatch.test.ts`. On-Deck QA: **REPLY-READY-01…05** in [testing.md](../testing.md).
- ★★★★ **Proton experiment journal + context chip ladder (2026-07-17):** Per-AppID Proton attempt timeline in `~/.bonsai/proton_experiment_journal.json`; Settings **Proton troubleshooting** editor + inject toggle; troubleshooting Asks stack **Proton logs → journal → KB**; Main-tab **F11 Option C** context chip ladder + session strip (replaces bottom Input handling panel / standalone model disclosure). Files: `proton_experiment_journal_service.py`, `transparency_service.py`, `ContextChipLadder.tsx`, `SessionContextStrip.tsx`, `ProtonExperimentJournalSection.tsx`, `game_ai_request.py`, `MainTabChatTranscript.tsx`. On-Deck QA: **PROTON-JOURNAL-01…04**, **CONTEXT-LADDER-01…03** in [testing.md](../testing.md). Design ref: [context-transparency-mockup.html](../demos/context-transparency-mockup.html).
- ★★ **Voice STT SIGILL fix (2026-07-07):** Mic capture worked but whisper never transcribed on Steam Deck — prebuilt podman `whisper-cli` hit illegal instruction during decode. Install now **compiles** CPU-safe ggml (`GGML_NATIVE=OFF`, AVX512 off) and pins podman image **digest**; readiness runs inference smoke test. **Tier 1 latency** (decode interval/window, poll, threads). Follow-up: [voice-input-follow-up.md](voice-input-follow-up.md). `voice_transcription_service.py`, `useVoiceTranscription.ts`; tests `test_voice_transcription_service.py`.
- ★★ **Clear all data — settings/permissions wipe fix (2026-07-06):** In-app **Clear all data** no longer restores pre-clear settings via modal session survival or a redundant post-clear `save_settings`. Backend wipe now clears the full `settings/` dir (voice assets, feedback log), always removes `~/.bonsai/cache`, and stops voice install tasks. Uninstall still leaves Decky data dirs by platform design — documented in [troubleshooting.md](../troubleshooting.md) §1b. Files: `bonsaiSessionSurvival.ts`, `index.tsx`, `SettingsTab.tsx`, `usePluginSettings.ts`, `plugin_data_reset.py`, `main.py`; tests `bonsaiSessionSurvival.test.ts`, `clearBonsaiBrowserStorage.test.ts`, `test_plugin_data_reset.py`.
- ★★ **Decky plugin release `.zip` (CI) + clean install proof:** [`.github/workflows/build-plugin-zip.yml`](../.github/workflows/build-plugin-zip.yml) builds the shippable zip via Decky CLI on **`v*` tags** and **workflow_dispatch**; [`scripts/verify-decky-plugin-zip.sh`](../scripts/verify-decky-plugin-zip.sh) enforces the same file layout as deploy (`main.py`, `refactor_helpers.py`, `py_modules/backend/services/`, `dist/`). Maintainer flow and versioning: [development.md](../development.md) → **Release (plugin zip)**. **QA log template:** [testing.md](../testing.md#regression-gates) §5 — run README-only path from **no Ollama yet**, then record Pass/Partial/Fail (human gate).
- ★★ **README — end-user install and usage:** [README.md](../../README.md) gives **plain, step-by-step** guidance for **(1)** installing **Ollama** (Deck vs PC, official download or repo helper scripts; firewall/`OLLAMA_HOST` in [troubleshooting.md](../troubleshooting.md)), **(2)** obtaining and installing the bonsAI plugin (**`.zip`** from e.g. GitHub Release, load in Decky Loader), **(3)** **using the app** (Decky/QAM, Ollama host/base URL in Settings, pull a model, Ask, optional permissions). Troubleshooting deep-dives remain in `docs/`, not the main path.

### First-run and prompts

- ★ **Beta Disclaimer Modal:** Show one-time experimental-software warning with risk acknowledgment and bug-report link.
- ★ **Suggested AI Prompts:** Show curated prompt presets, randomize initial suggestions, and generate contextual follow-ups after responses.
- ★ **Preset chip refresh (advice-first, 2026-04-24):** [`src/data/presets.ts`](../../src/data/presets.ts) `PRESET_PROMPTS` rephrased to advice-first questions; action wording only for strong shipped surfaces; `beta: true` chips preview roadmap items honestly. Content tuning only — no schema, RPC, or carousel logic change. See [CHANGELOG.md](../../CHANGELOG.md) § Changed.
- ★ **Preset chip expansion (2026-06-26):** Incremental strings for LAN/Ollama, Expert/voice, Steam Input; graduated stale beta labels; see [CHANGELOG.md](../../CHANGELOG.md) § Unreleased.
- ★ **Preset chip expansion — Wave 1 batch (2026-08-07):** Four prompts in `presets.ts` — Find LAN on Ollama tab, BonsAI quick-launch chord, two token-streaming beta strings; category keywords for `chord` / `quick-launch` / `token streaming` / `stream in`. Unit: `presets.test.ts`. On-Deck QA: **PRESET-EXPAND-W1-01** in [testing.md](../testing.md). Detail: [wave1.md](wave1.md).
- ★★★ **Session RAG preset chips (2026-07-18):** Main-tab carousel seeds ~30% RAG / ~70% static per slot when `use_local_knowledge_base` is on and corpus is installed — curtailed strategy (boss/dungeon) + compat prompts from offline KB for the running AppID; category-biased static follow-ups after Ask; reseed on AppID change and cold mount. Setup tip **Enable local knowledge base for better game tips** in static pool (sampled, not forced). `suggest_chip_candidates` + RPC `get_session_rag_chip_candidates`; `sessionRagComposer.ts`, `composePresetSeedsWithSessionRag.ts`, `useBonsaiAskOrchestration.ts`. Unit: `sessionRagComposer.test.ts`, `test_knowledge_base_service.py`. On-Deck QA: **SESSION-RAG-CHIPS** in [testing.md](../testing.md).
- ★★ **Prompt-testing MVP:** [testing.md](../testing.md#device-qa-runbook) (tiered run order) + [testing.md](../testing.md) (shipped-feature coverage, scenarios, Test Results) + optional frozen preset carousel (`TEMP_PRESET_CAROUSEL_FROZEN` / `TEMP_CAROUSEL_FROZEN_TEXTS` in `src/data/presets.ts`). **Status:** Refactored 2026-05-24; Tier 0–1 execution tracked in **In Progress**.
- ★★ **Input sanitizer lane (hybrid):** Deterministic Ask cleanup and conservative block before Ollama; default on; no Settings UI. Magic phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize` (exact whole message, trim + casefold) persist `input_sanitizer_user_disabled` via `save_settings` and return confirmation without calling the model. Backend `backend/services/input_sanitizer_service.py`, `main.py` (`ask_game_ai` / `start_background_game_ai`); frontend types and completion path in `src/index.tsx`; phrase constants in `src/data/inputSanitizerCommands.ts`.
- ★★★ **Input Handling Transparency Panel:** Main tab **Input handling (last Ask)** shows raw input, sanitizer path, system/user text sent to Ollama, model name, and raw vs final reply; **Run original** / **Copy JSON**. Optional Settings **Verbose Ask logging to Desktop notes** (`desktop_ask_verbose_logging`) appends full trace markdown to `bonsai-ask-trace-YYYY-MM-DD.md` when filesystem writes are allowed. Backend `get_input_transparency`, `_persist_input_transparency`, `append_desktop_ask_transparency_sync` in `desktop_note_service.py`; `main.py`; UI `MainTab.tsx`, `src/utils/inputTransparency.ts`.
- ★★★ **Thinking blurb during reply (2026-06-14):** While pending, users see one italic `thinking_summary` line (deterministic prep phases via `format_thinking_phase` / `_publish_thinking_phase`, plus model `<bonsai-status>` once streaming). Submit shows `Starting…` immediately with no duplicate Thinking AI bubble; `useSmoothStreamReveal` smooths token preview. Files: `bonsai_stream_tags.py`, `game_ai_request.py`, `main.py`, `ollama_prompts.py`, `useBonsaiAskOrchestration.ts`, `askThinkingPhases.ts`, `useSmoothStreamReveal.ts`, `MainTab.tsx`, `BonsaiChatFeedbackRow.tsx`.
- ★★★ **Playful thinking status lines (2026-06-14, ships with Thinking blurb):** At Ask start, `compose_thinking_blurb()` publishes prompt-woven pending copy (question snippet, game, attachments; strategy/TDP/troubleshooting template pools). **Character voice** adds witty/deadpan variants via `thinking_status_tone_for_preset` in `ai_character_service.py`.
- ★★ **Thinking phase copy polish (2026-06-27):** Mid-Ask `_publish_thinking_phase_key` lines stay prompt-woven — `format_thinking_phase()` accepts `question` and weaves snippet + game for proton/TDP/screenshot/build/retry phases (character variants preserved); redundant background `starting` publish removed. Files: `bonsai_stream_tags.py`, `main.py`, `game_ai_request.py`; tests `tests/test_bonsai_stream_tags.py`, `tests/test_background_partial_state.py`.
- ★★ **Always-sarcastic thinking blurb (2026-07-05):** Thinking status lines always use witty/deadpan copy (no Character Voice gate, no ~30% roll); streaming fallbacks and model `<bonsai-status>` prompt aligned; italic line stays visible during token preview and updates from backend/model tags. Client instant opener via `composeThinkingBlurb.ts`. Files: `bonsai_stream_tags.py`, `ollama_prompts.py`, `thinking_tiny_model_service.py`, `composeThinkingBlurb.ts`, `useBonsaiAskOrchestration.ts`, `MainTabChatTranscript.tsx`.
- ★★ **Thinking blurb copy refresh (2026-07-17):** Phase/intent-native witty and deadpan pools in `compose_thinking_blurb` / `format_thinking_phase` (no `Yeah,` / `Fine.` / `Oh joy` prefix farm); game-title lines only when a running title is set; emoji-only blurbs allowed; selection by `request_id` only (no elapsed-time rotation); client mirror in `composeThinkingBlurb.ts`; `<bonsai-status>` tone hint aligned in `ollama_prompts.py`. Tests: `composeThinkingBlurb.test.ts`, `tests/test_bonsai_stream_tags.py`. On-Deck QA: **THINKING-01…03**, **THINKING-COPY-01** in [testing.md](../testing.md).
- ★★★ **System prompt reorder + general-purpose assistant clause:** Shipped — `build_system_prompt` in [`py_modules/backend/services/ollama_service.py`](../../py_modules/backend/services/ollama_service.py) assembles the Ollama **system** message in layers: dynamic game/attachment/vision → identity + general-purpose clause → optional early context (e.g. Proton via `early_context_suffix` from `main.py`) → topic/mode injects → **TDP + ```json``` contract tail** last; `append_deck_tdp_sysfs_grounding` after that; AI character roleplay remains a **prefix** when enabled. Unit ordering tests in [`tests/test_ollama_service.py`](../../tests/test_ollama_service.py); maintainer notes in [testing.md](../testing.md) (**System message layer order**). **Still needs on-device / matrix validation:** use Input transparency to confirm layer order and quality on real Asks (Speed, Strategy, Ollama-host, TDP/read paths) — track in [testing.md](../testing.md) and [testing.md](../testing.md#regression-gates) as appropriate. RAG injection in-prompt remains future (see [archive/research/rag-sources-research.md](../archive/research/rag-sources-research.md)); **not in scope:** changing TDP/GPU JSON schema.

**Also counted in shipped baseline (not separate checklist lines above):** background prompt completion (V1); Linux Ollama compatibility.

### Connection, routing, diagnostics, and timeouts

- ★★★ **Offline intent packs (2026-06):** Bundled `deck-basics.json`, Settings **Search intent packs** section (`SettingsTabIntentPacksSection.tsx`, `useIntentPacks.ts`), RPC import/export/remove/enable; search merge via `intent_pack_service.py`. QA: [testing.md](../testing.md) **INTENT-PACKS** row.
- ★★★★ **RAG Deck query — on-Deck offline knowledge base (v1, 2026-07-12):** Optional downloadable strategy/compat corpus (~5 GB MVP) grounds Strategy and troubleshooting Asks via FTS5 pre-retrieval **prompt-splice** into `early_context_suffix` (not model tools). Maintainer build: `scripts/build_rag_db.py`; HF primary + GitHub mirror manifest; Model A consent (Ollama tab download + **Use local knowledge base** toggle). SoH→OoT alias in DB replaces hardcoded prompt rule. Files: `knowledge_base_service.py`, `knowledge_base_schema.py`, `rag_corpus_download_service.py`, `game_ai_request.py`, `KnowledgeBaseSection.tsx`, `OllamaTab.tsx`, `main.py`. Architecture: [knowledge-base.md](../knowledge-base.md). On-Deck QA: **KB-RETRIEVE** / **KB-SMOKE-02** → **Verified** (2026-07-27 DRG Survivor seed KB + Show details); **KB-DOWNLOAD** → **Partial** (Dev-tab seed; HF not published yet) in [testing.md](../testing.md).
- ★★★★ **RAG Deck query — hybrid vectors (Phase 2, 2026-07-28):** Maintainer `build_rag_db.py` bakes `section_vectors` via local `nomic-embed-text`; Strategy Asks FTS shortlist (N=30) → Ollama `/api/embed` query → cosine re-rank to mode `top_k`. Fallbacks: **Keyword search** when vectors/nomic missing; **Keyword search (embed unavailable)** on embed failure. Transparency chips: **Keyword + meaning** / **Keyword search**; Ollama tab soft hint when corpus has vectors but embed model missing (no auto-pull). Files: `ollama_embed_service.py`, `knowledge_base_service.py`, `transparency_service.py`, `KnowledgeBaseSection.tsx`, `main.py`. Compat hybrid deferred Phase 3. QA: **KB-SMOKE-04**–**07** Open in [testing.md](../testing.md).
- ★★★★ **RAG Deck query — compat hybrid + corpus maturity (Phase 3, 2026-07-29):** Schema v2 (`compat_patterns` + `platforms`, FTS5, `compat_pattern_vectors`); **124** shared troubleshooting tips (`data/kb/compat_patterns.json`) with hybrid FTS→`nomic-embed-text` re-rank on troubleshooting Asks; interim **11-title** strategy seed (`data/kb/strategy_seed.json`, 22 section cards). Show details **Source: shared troubleshooting tips** when compat domain attaches. Eval fixture `tests/fixtures/kb_eval_v0.json` (~25 queries). Files: `knowledge_base_schema.py`, `knowledge_base_service.py`, `build_rag_db.py`, `transparency_service.py`, `game_ai_request.py`. **Not** public HF (→ Phase 6 as of 2026-07-30 phasing). QA: **KB-SMOKE-07**–**10**, **KB-EVAL-01** Open in [testing.md](../testing.md).
- ★★★★ **RAG Deck query — public publish (Phase 6, closed 2026-08-16):** First public versioned corpus, published on both channels and verified on a real Deck end to end. **Legal:** scrub DONE 2026-08-09 (plan 15, Stages 1–5); **D20** (2026-08-14) reopened D19b to include ShareAlike sources, so the corpus ships as one **CC BY-SA 4.0** work. **Tooling:** `scripts/publish_corpus.py` (licence gate + manifest self-consistency check), `tests/test_rag_corpus_download.py` (10 tests — the download path had zero coverage before), stable `qd313` HF/GitHub addresses in `knowledge_base_schema.py`, UI copy corrected (dev-only placeholder text removed, the "~5 GB" claim fixed — the real corpus is ~1 MB). Fixed along the way: a live repo-identity hole (stale `cantcurecancer` username used at runtime by the manifest fetch and the Pull Models overlay), a Windows `os.statvfs` crash in the download path, and a cancel-state bug where cancelling orphaned the running task's progress reference. **Published:** HF dataset `qd313/bonsai-knowledge-base` + GitHub release `knowledge-base-v1`, first push 2026-08-14 (`2026.08.14`, sha `081af237…`, 758507 bytes), point release **`2026.08.16`** (sha `34bff336…`, 758502 bytes) — schema v3, 13 games / 117 sections / 124 compat tips, all vectors populated. **Reproducibility fixed 2026-08-15:** `_seed_strategy_corpus` stamped `crawled = _utc_now()` into the 58 maintainer-authored rows, so every rebuild changed `db_sha256` (three 2026-08-14 builds gave 758505 / 758506 / 758507 bytes). Those rows were never crawled and the attribution generator already skips url-less rows, so the stamp had no consumer — it now writes empty, and a row citing a `source_url` without a `crawled_at` fails the build rather than being silently backdated. Two consecutive builds now produce an identical `db_sha256` (`019acc7c…`); guarded by `tests/test_build_rag_reproducible.py`. The `2026.08.14` artifact predated that fix and could not be rebuilt from source, which is why the maintainer took the version bump. **Verified on Deck:** 2026-08-15 backend (live HF download passes the sha gate, GitHub mirror failover returns the same version and sha, retrieval 7/7 with the hybrid path live at ~60 ms embed, cross-game leak guard holding, **KB-ATTRIB-02** Verified); 2026-08-16 UI half (build `6329577`, run against a Deck still holding `2026.08.14` so the version-compare Update was genuine — Update → progress row → `2026.08.16`, second Update correctly a no-op, Remove → storage picker → first install, Strategy Ask attaches cards; the SD-card storage option was exercised as a side effect and both installs *and* serves retrieval). **KB-SMOKE-01 / KB-DOWNLOAD Verified — Phase 6 exits.** One row does **not** come with it: **KB-CANCEL-01** is not testable as written (a 758 KB corpus installs in ~0.9 s and leaves no cancel window) and stays in [Verify](../roadmap.md#verify). [knowledge-base.md](../knowledge-base.md) § Phase 6 / Source attribution.
- ★★★★ **RAG retrieval quality remediation (PR1 + PR2, 2026-08-09):** PR1 replaced cosine-only re-rank with RRF, added BM25 floor / column weights / stopwords / schema v3 prefixes. PR2 deepened the seed to **13 titles / 119 sections**, shipped the hybrid kill-switch and D16 compat topic router, signed off `kb_eval_v2` (221 queries / 140 labeled), and ran the three-way bake-off. Holdout top-3: keyword 83.3% vs RRF 80.6% — **no separation**; equal RRF weights and loose floor locked. Report: [kb-retrieval-pr2-bakeoff-2026-08-09.md](research/kb-retrieval-pr2-bakeoff-2026-08-09.md). Plan: [rag-retrieval-quality-remediation-implementation-plan.md](rag-retrieval-quality-remediation-implementation-plan.md). QA: **KB-EVAL-02** Verified (PC); on-Deck hybrid engagement still **KB-RRF-01**.
** New **Ollama** LB/RB tab (outline llama icon) between Main and Settings consolidates **Where AI runs**, response verification, connection timeouts/keep-alive, and **Models & routing** → **Open AI models…** fullscreen hub with **Policy**, **Browse & pull**, and **Advanced** chips (tier selection, pull table, Tier 3 unlock / high-VRAM fallbacks). Removed scattered controls from Permissions (model policy), Settings (connection block), and Developer (verify + tuning + routing). Implemented in `src/components/OllamaTab.tsx`, `OllamaWhereAiRunsSection.tsx`, `OllamaModelsHubModal.tsx`, `ModelPolicyTierPanel.tsx`, `ModelRoutingAdvancedPanel.tsx`; tab wiring in `src/index.tsx`.
- ★★★★ **UI scale profiles (Handheld / Desktop / Couch):** Settings **UI scale** — **Adjust UI automatically** (default) classifies from QAM viewport width + internal/external display heuristics; manual snap slider (Handheld · Desktop · Couch) behind toggle; **Apply UI scale** soft-reloads panels. Scoped `--bonsai-ui-scale` on `.bonsai-scope` + modal bridge; merges former **10-foot readability slider** and **Couch 10-foot UI profile** roadmap items. `src/data/uiScaleProfile.ts`, `src/hooks/useUiScaleProfile.ts`, `SettingsTabUiScaleSection.tsx`, `bonsaiScopeStylesheet.ts`, `settings_service.py`.
- ★★ **Ollama Network Routing Fix:** Route frontend requests through Decky backend (`call("ask_game_ai", ...)`) to resolve cross-origin failures.
- ★★ **Deck and PC Connection Settings:** Add connection-focused settings including visible Deck IP and PC IP management.
- ★★ **Diagnostic, Latency, and Timeout Warnings:** Return `elapsed_seconds`, show slow-response warnings, and enforce backend timeout messaging.
- ★★ **Configurable Latency and Timeout Controls:** Persisted warning + timeout in `settings.json`; Settings Connection uses one Steam `SliderField` for hard timeout with a visible soft-warning readout (`ConnectionTimeoutSlider.tsx`), and ordering is reconciled on load/updates.
- ★★ **Ollama model VRAM retention (`keep_alive`):** Persisted `ollama_keep_alive` with fixed preset durations (default **5 minutes**); Settings → Connection `OllamaKeepAliveSlider.tsx`; value passed on each Ask through `main.py` into `backend/services/ollama_service.py`. `settings_service.py`, `settingsAndResponse.ts`.
- ★ **Caveman reply style** (2026-08-09): Ollama **Reply style** slider is now **Caveman / Balanced / Detailed** (replaces **Short**). Caveman injects caveman-skill **full** prose coaching (terse, accurate, no fluff); **Balanced** still injects nothing; **Detailed** unchanged. When AI character roleplay is on, Caveman coaching is skipped so character voice wins. Legacy `reply_verbosity: "short"` migrates to `"caveman"` on load (TS + Python). Files: `replyVerbosity.ts`, `OllamaReplyVerbositySlider.tsx`, `bonsaiSettingsNormalizers.ts`, `settings_service.py`, `ollama_prompts.py`. Unit: `settingsContracts.test.ts`, `test_settings_service.py`, `test_ollama_service.py`. On-Deck QA: **REPLY-VERB-01** in [testing.md](../testing.md).
- ★★★ **Reply verbosity inject (2026-07-17):** Global **Reply style** slider on the **Ollama** tab (Short / Balanced / Detailed); **Balanced** = no inject (legacy behavior). Short and Detailed append coaching blocks in `build_system_prompt` (`ollama_prompts.py`) after topic/mode injects, before TDP tail; structural fences and triple-resolution graphics injects unchanged. Input transparency shows `reply_verbosity` on each Ask. `reply_verbosity` in `settings.json`; `OllamaReplyVerbositySlider.tsx`, `replyVerbosity.ts`, `ollama_ask_service.py`, `transparency_service.py`. On-Deck QA: **REPLY-VERB-01** in [testing.md](../testing.md). **Wake-word (deferred):** Global verbosity applies to wake Asks; no forced-Short override in v1. Optional per-context brevity (e.g. hands-free → Short) tracked under **Wake-word listening** — not a dependency for this ship. **Superseded for Short label/coaching by Caveman reply style (2026-08-09).**
- ★★★ **[Local/runtime] Default off + onboarding:** When `ollama_local_on_deck` is absent from persisted settings, default **`false`** (LAN PC host field applies); explicit **`true`** / **`false`** in JSON unchanged. Global beta modal warns LAN-hosted Ollama is typically faster than on-device inference and that heavy VRAM use may crash games (**use at your own risk**). **`bonsai:local-runtime-beta-dismissed-v1`** **`ConfirmModal`** when the user enables **Ollama on Deck** (optional local routing); Starter/Connection Tier-1 essentials per `TIER1_ESSENTIALS_PULL_TAGS` (then in `refactor_helpers.py`, a re-export shim deleted in `666e3e3`). **Clear all plugin data** resets flags and storage keys. Connection **Test** to localhost may **`systemctl --user`** / **`ollama serve`** wake the listener (`recover_loopback_ollama_listening`, **`main.py`**). `settings_service.py`, `settingsAndResponse.ts`, `src/index.tsx`, `py_modules/backend/services/local_ollama_setup_service.py`.
- ★★★ **Deck essentials model simplification (2026-06-15):** One-model defaults — Tier 1 `qwen2.5vl:3b`, optional Tier 2 `gemma4:e2b-it-qat`; shortened routing chains; Pull Models **Essentials only** default; removed 11-model “full Tier-1” setup; **Clear all data** purges local Ollama when **Ollama on this Deck** was on. `refactor_helpers.py`, `pullModelCatalog.ts`, `OllamaWhereAiRunsSection.tsx`, `local_ollama_teardown_service.py`, `docs/troubleshooting.md`.
- ★★ **LAN Ollama discovery (mDNS, opt-in):** **Ollama** tab **Find LAN** browses `_ollama._tcp.local` only (user-confirmed; no subnet scan). `ollama_mdns_discovery_service.py`, `discover_mdns_ollama_hosts` RPC, `OllamaWhereAiRunsSection.tsx`. Requires Avahi/Bonjour publish on the Ollama host — [troubleshooting.md](../troubleshooting.md) § Find Ollama on LAN.
- ★★★ **Named Ollama hosts (quick switch, K):** Save up to **4** labeled LAN base URLs (`named_ollama_hosts`); one-tap switch chips on the **Ollama** tab when **Ollama on this Deck** is off. **Save current PC address as quick host** button. `OllamaWhereAiRunsSection.tsx`, `settings_service.py`, `settingsAndResponse.ts`.
- ★★ **Maintainer automation:** Vitest headless Decky harness (`src/test-harness/`), `watch-deploy` scripts, prepare-only `pnpm run version:bump`, Cursor skill `.cursor/skills/bonsai-deck-dev-loop/`. [development.md](../development.md).
- ★★ **Local Ollama update + saved LAN IP fix:** Settings → Connection adds **Update Ollama & Models** when **Ollama on this Deck** is on — re-runs the official installer, then re-pulls each tag from local `/api/tags` (no-op model step if none installed). Ask no longer overwrites `bonsai:pc-ip` with `127.0.0.1:11434` while local routing is active, so toggling local off restores the LAN host. `update_installed` profile in `refactor_helpers.py`, `local_ollama_setup_service.py` (`list_installed_ollama_tags`), `SettingsTab.tsx`, `src/utils/persistOllamaIp.ts`, `src/index.tsx`.

### Tabs, icons, and unified ask flow

- ★★ **Iconography Pass (Tabs + Plugin + Ask Button):** Add icons to all tabs (bonsAI bonsai-tree icon, Settings gear, Debug bug, About unchanged), switch plugin icon to bonsai SVG, and show the stock diamond beside `Ask` text.
- ★★ **Persist Last Question and Answer:** Restore prior session state when reopening QAM via Decky settings storage.
- ★★ **Unified Search + Ask Input:** Merge settings search and AI question entry into one shared input flow.
- ★ **Preset Chip Fade Opt-Out:** Settings `ToggleField` **Preset chip fade animation** (persisted `preset_chip_fade_animation_enabled`, default on). When off, main-tab suggestion chips stay opaque and rotate prompts without opacity transitions; post-Ask re-seed unchanged. `PresetAnimatedChips.tsx`, `MainTab.tsx`, `settingsAndResponse.ts`, `settings_service.py`.
- ★★★ **Preset carousel scroll + slide (2026-05-20):** Developer → **carousel** mode: slower auto-advance (~5.8s), `translateY` slide animation, D-pad scrollable history (~12 items), soft contextual re-seed after Ask, `React.memo` on chips, inject-row placeholder during Ask. `src/features/preset-carousel/carouselState.ts`, `MainTabPresetAnimatedChips.tsx`, `bonsaiScopeStylesheet.ts`, `MainTab.tsx`.
- ★★ **Gemma Pull Models + routing parity (2026-05-20):** Browse models adds `gemma4:4b` / `gemma4:2b`; Tier 2 fallbacks try `gemma3:4b` and catalog Gemma tags before `:latest`; HTTP 404 advances to next model. `pullModelCatalog.ts`, `refactor_helpers.py`, `main.py`, `docs/troubleshooting.md`.
- ★★★ **Living Pull Models catalog (2026-06-11):** Bundled `pullModelCatalog.ts` merged with remote `data/pull-model-catalog-overlay.json` on **Update AI & models** completion and Pull Models **↻** refresh; disk cache `~/.bonsai/cache`; picker-only (routing chains unchanged until plugin release). `pull_model_catalog_service.py`, `mergePullModelCatalog.ts`, `PullModelsModal.tsx`, `OllamaWhereAiRunsSection.tsx`.
- ★★★ **Mode selector (main screen):** Persisted `ask_mode` (`speed` / `strategy` / `expert`, UI labels Speed / Strategy / Expert). Compact outline control (green / bronze / gold) on the unified input strip, left of mic/stop, opens an anchored popover menu to change mode (no layout reflow); D-pad focus order is text field → mode → mic/stop. Backend orders Ollama model fallbacks per mode in `refactor_helpers.py`; `start_background_game_ai` includes `ask_mode`. `src/data/askMode.ts`, `src/components/AskModeMenuPopover.tsx`, `MainTab.tsx`, `index.tsx`, `settingsAndResponse.ts`, `settings_service.py`, `main.py`. Legacy `"deep"` migrates to `"expert"` on load (2026-06-26).
- ★★★★★ **Whisper voice Ask (Deck STT, 2026-06-11):** Local speech-to-text into the unified Ask input via the mic button. Backend PipeWire/Pulse/ALSA capture (`voice_transcription_service.py`), rolling-window **whisper.cpp** interim transcription, poll-based status RPCs (`start_voice_transcription`, `stop_voice_transcription`, `get_voice_transcription_status`). **Permission:** `microphone_access` toggle in **Permissions** tab (default off; not legacy-grandfathered). **Settings → Voice input:** `tiny.en` / `base.en` model selector + GGUF download (`install_voice_engine`). Bundle `bin/whisper-cli` on device (see `bin/README.md`). Audio in-memory only; transparency route `voice.transcribe`. Files: `main.py`, `src/hooks/useVoiceTranscription.ts`, `VoiceInputSettingsSection.tsx`, `PermissionsTab.tsx`, `MainTab.tsx`.
- ★★★★ **Strategy Guide prompt path (beta):** Shipped — **Strategy Guide** in prompts and tooling is the same path as **`ask_mode: strategy`** (main-tab label **Strategy**). Strategy presets can switch Ask mode; strategy-specific placeholder (“describe the level / boss / puzzle”); **`STRATEGY GUIDE MODE`** scaffolding and branch-picker contract in `backend/services/ollama_service.py` + `backend/services/strategy_guide_parse.py`; follow-up UX in `src/index.tsx`, `MainTab.tsx`, `src/data/presets.ts`, `src/data/strategyGuideFollowup.ts`; character framing in `ai_character_service.py` when roleplay is on. Optional cheat / shortcut guidance when the user asks; Steam Input-aware copy where relevant. Regression notes: [testing.md](../testing.md) § Strategy Guide. **Not in scope:** perfect walkthroughs for every title.
- ★★★ **Ask thread accordion (2026-06-14):** Main-tab transcript uses one **accordion row per turn** — collapsed title is a truncated question (`buildCollapsedTurnTitle`); OK expands **full AI answer only** inline; exactly one turn open (`expandedTurnKey` in `useBonsaiAskOrchestration.ts`). Removed detached question chips + shared AI bubble and **Next message** navigation. **Spoilers:** removed main-tab **Spoilers OK for this Ask** and Settings **Open spoilers after I opt in**; masking is controlled only by **Hide spoilers until I tap** (`strategy_spoiler_masking_enabled`); darker tap-to-reveal styling on `.bonsai-spoiler-reveal-target`. Files: `BonsaiChatTurnRow.tsx`, `MainTab.tsx`, `chatTurnTitle.ts`, `bonsaiScopeStylesheet.ts`.
- ★★ **Retry same prompt (regenerate, B):** **Retry same prompt** on a completed reply re-submits the last sanitized Ask without retyping. `onRetryLastResponse` in `useBonsaiAskOrchestration.ts`, `BonsaiChatReplyActions.tsx`, `buildReplyActionsElement.tsx`, `MainTab.tsx`.
- ★★★ **Per-turn local feedback (thumbs, S):** Compact **Was this helpful?** row with thumbs up/down under AI replies; `save_ask_feedback` RPC in `main.py`; shared `.bonsai-chat-secondary-btn` chrome with Retry and Show details. Shipped 2026-06-14. `BonsaiChatReplyActions.tsx`, `MainTab.tsx`.
- ★★★★ **User-owned model routing pickers (text + vision, 2026-07-17):** Fullscreen **Set text/vision model try order…** modals on the **Ollama** tab; `text_model_routing_order` / `vision_model_routing_order` in settings; runtime `resolve_routing_order` + host fallback tail; high-VRAM toggle grays/skips inactive tags; pull/delete hooks merge/remove tags. `ModelRoutingOrderModal.tsx`, `ollama_routing.py`, `OllamaTab.tsx`, `settings_service.py`.
- ★★★ **Reply micro-actions (follow-up chips, 2026-07-17):** Live-reply chip rows (**Bad information**, **Misidentified game/problem**, **Too long**, **Too short**) autofill the Ask field + arm follow-up on Send (parent Q+A context, preferred model pin). Thumbs + chips disable during in-flight Ask; one chip per reply. `buildReplyActionsElement.tsx`, `useBonsaiAskOrchestration.ts`, `replyMicroActions.ts`, `game_ai_request.py`, `ollama_prompts.py`.
- ★★★★ **Strategy Guide safety and spoilers:** Shipped — spoiler-minimized default and `bonsai-spoiler` fenced blocks in the strategy system prompt; phrase-match consent on sanitized user text; Settings → **Story spoilers (Strategy mode)** → **Hide spoilers until I tap**; tap-to-reveal in `MainTabBonsaiAiMarkdownChunk.tsx`. **`settings.json`:** `strategy_spoiler_masking_enabled` (legacy `strategy_spoiler_auto_reveal_after_consent` ignored on save). **Not in scope:** hard model guarantees. **Testing:** [testing.md](../testing.md) § **Spoiler Policy and Consent**.
- ★★★★★ **Strategy checklist (Strategy Guide chats):** Shipped — follow-up turns emit `bonsai-strategy-checklist` JSON fence; interactive `ToggleField` rows in `StrategyChecklistPanel.tsx`; progress synced into subsequent Strategy asks via `strategy_checklist_state`; per-game persistence in `strategy_checklist_session.json` (`get/save/clear_strategy_checklist_session` RPC). Cleared on Reset session cache, Clear all plugin data, leaving Strategy mode, or new first-turn Strategy ask. **Testing:** [testing.md](../testing.md) § Strategy depth (`STRATEGY-CHECKLIST`).
- ★★ **Debug tab opt-in (Settings):** Persisted `show_debug_tab` (default **false**); **Debug** omitted from the tab strip until **Show Debug tab** is enabled in Settings; safe tab switch when turning the toggle off while on **Debug**. `src/index.tsx`, `settings_service.py`, `settingsAndResponse.ts`.
- ★★ **Settings tab trim:** **Trim the fat** on Settings: fewer simultaneous controls per view, clearer `PanelSection` grouping, progressive disclosure, shorter helper copy on toggles and sliders; dedicated Settings composition (`SettingsTab.tsx` and related controls).
- ★★★ **Reset session cache (app state):** Settings → Advanced **Reset session cache…** with confirm modal; `resetPluginSession()` clears in-memory unified search, reply, thread, transparency, branch picker, attachments, and timers. Does **not** change persisted `settings.json`, host Ollama history, or screenshot files. `src/index.tsx`.
- ★★★★★★ **Token stream replies — live markdown (2026-07-15):** Developer tab **Token streaming (experimental)** now renders **progressive markdown** in one live bubble (R2: frozen closed blocks + live tail), not plain text. **S1:** incomplete `bonsai-spoiler` fences show a mask only — no body leak mid-stream. **F2:** open code fences show pulse + spinner (2s) until close, then ~3× smooth reveal burst. **T3** handoff: snap smooth reveal, then terminal chunk split + banners (policy may change). Stop keeps partial text. Files: `streamMarkdownPrepare.ts`, `buildAnswerBubbleElement.tsx`, `StreamFenceWaitChip.tsx`, `useSmoothStreamReveal.ts`, `useBonsaiAskOrchestration.ts`, `main.py` (abort partial), `section-6.ts`. **Testing:** [testing.md](../testing.md) § Token streaming (STREAM-01…10). Phase 1 transport unchanged ([CHANGELOG.md](../../CHANGELOG.md) **0.4.0**).

**Baseline index:** preset carousel and transition UX (Phase 1 — fade/hold; manual arrows deferred).

### AI-assisted power and long-response UX

- ★★★ **TDP Automation via AI Output:** Parse AI recommendations and apply constrained TDP values through safe sysfs write paths.
- ★★★ **QAMP Reflection (Phase 1 — Safe Default):** After a sysfs TDP apply, the main tab shows an explicit **TDP nW** confirmation plus re-open **QAM → Performance** guidance (`formatAppliedTuningBannerText` / `buildResponseText` in `src/utils/settingsAndResponse.ts` (a re-export barrel deleted in `2156441`), [src/components/MainTab.tsx](../../src/components/MainTab.tsx)). GPU MHz from the model is labeled **recommendation only** (not written in sysfs in this build). On-Deck QAMP / restart checks: [testing.md](../testing.md) § QAMP Verification. **Phase 2** (Steam profile / experimental opt-in) remains in [Planned](#long-term) — *blocked until explicitly scoped*.
- ★★★ **D-pad Response Scrolling:** Split long responses into focusable chunks for controller-first navigation.

### Steam Input

- ★★★★★ **Steam Input Jump (Phase 1):** Debug tab jump to per-game controller config via `steam://controllerconfig/{appId}` (`SteamClient.URL.ExecuteSteamURL`), versioned lexicon in `src/data/steam-input-lexicon.ts`, helper in `src/utils/steamInputJump.ts`. Documented in [archive/research/steam-input-research.md](../archive/research/steam-input-research.md). **Phase 2+** (indexed search, full catalog, ranked results) is **not** planned to continue.
- ★★ **Global quick-launch macro (documentation + verification checklist):** Guide-chord path QAM → Decky → bonsAI with **Fire Start Delay** and per-user rail depth documented in [troubleshooting.md](../troubleshooting.md) §5; [README.md](../../README.md) quick-launch blurb. **Archived from Planned (2026-07-30):** cool for power users, **not worth further product effort** for casual users — refresh only if Steam/Decky QAM layout changes or **Native QAM shortcut tile** lands.
- ★ **Shortcut setup keywords (Ask, no Ollama):** `bonsai:shortcut-setup-deck` and `bonsai:shortcut-setup-stadia` typed in Ask (optional leading `/`); `backend/services/shortcut_setup_commands.py`; response + optional **Open Controller settings**; documented in [troubleshooting.md](../troubleshooting.md) §5 and [testing.md](../testing.md). **Not in scope:** auto-writing Steam Input / VDF (see [archive/research/steam-input-research.md](../archive/research/steam-input-research.md)).
- ★★ **VAC / ban lookup (Phase 1 — Ask command) — complete:** `bonsai:vac-check` with user-supplied 64-bit SteamIDs or `/profiles/765…` URLs; Steam **GetPlayerBans** via `backend/services/steam_vac_service.py`, `vac_check_commands.py`; Permission **`steam_web_api`** (default off; legacy grandfather leaves it off); Settings **Steam Web API key**; TTL cache; disclaimer that results are account-level, not opponent attribution. README + optional preset chip. **Phase 2** (live opponent IDs) remains in [Planned](#long-term). **On-device QA:** Phase 1 is **not** fully covered in the matrices until someone runs [testing.md](../testing.md) § **VAC / Steam ban lookup (`bonsai:vac-check`)** and records Pass / Partial / Fail + build id; optional smoke row in [testing.md](../testing.md#regression-gates) § **Permissions**.

### About tab and main surface polish

- ★ **Built on Ollama Link (About Tab):** “Built on Ollama” button in About opens `https://github.com/ollama/ollama` via `Navigation.NavigateToExternalWeb` (toast fallback), wired from `OLLAMA_UPSTREAM_REPO_URL` in `src/index.tsx` and `src/components/AboutTab.tsx`.
- ★★ **Search Surface Glass Pass (Unified Input):** Glass-style unified search field and ask bar (~25% fill, blur, light edge), 50% opacity on corner action icons, dynamic height for the input shell from wrapped text, AI answer chunks use matching glass instead of near-black panels.

### Desktop notes (Game Mode → Desktop)

- ★★★ **Desktop app activity logging (opt-in):** Settings → Advanced **App activity logging to Desktop** (`desktop_app_log_level`: off / default / verbose; default off). With Filesystem writes, summary or detailed events append to `~/Desktop/bonsAI_logs/bonsai-app-YYYY-MM-DD.log`. Backend `_maybe_app_log`, RPC `append_app_log`, redaction in `desktop_note_service.py`; frontend `src/utils/appDesktopLog.ts`. Folder rename: all Desktop writes now use `bonsAI_logs` (was `BonsAI_notes`; manual rename for existing folders).
- ★★★ **Desktop Mode Debug Note Save (Steam Deck, V1):** After a successful ask, **Save to Desktop note…** on the main tab opens a consent + name dialog; append-only writes to `~/Desktop/bonsAI_logs/<name>.md` with UTC timestamps and Q+A (`append_desktop_debug_note` in `main.py`, `backend/services/desktop_note_service.py`, `DesktopNoteSaveModal` + `MainTab` in `src/`).
- ★★★ **Desktop Mode Debug Note Save — Daily chat auto-save (V2):** Settings tab toggle (`desktop_debug_note_auto_save`, default off). When enabled with Filesystem writes, each **Ask** and each **AI response** append to `~/Desktop/bonsAI_logs/bonsai-chat-YYYY-MM-DD.md` (UTC calendar day); Ask entries list attached screenshot paths. Backend `append_desktop_chat_event`; `src/index.tsx` Settings + ask/response hooks.

### Permissions and capability gating

- ★★★ **Kids master lock (2026-08-09):** When Steam reports parental controls locked, session-forces all `CAPABILITY_KEYS` deny via `capability_enabled` + greys Permissions toggles without mutating stored prefs. Ask / local Ollama / offline KB keep working. `steamParental.ts`, `useKidsLock.ts`, RPC `set_kids_lock_state`, `PermissionsTab` banner. On-Deck QA Open: **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01** in [testing.md](../testing.md). Research [08](08-kids-master-lock-feasibility.md); plan [14](14-kids-master-lock-implementation-plan.md).
- ★★★★ **Capability Permission Center (User-Controlled Access):** Permissions tab (lock icon, same title scale as other tabs) with toggles for filesystem writes, hardware control (TDP apply), media library access (screenshot attach), Steam/Proton log read (troubleshooting Ask excerpts), **Steam Web API** (outbound GetPlayerBans for `bonsai:vac-check`), and external/Steam navigation (About links, Debug Steam Input jump). Persisted `settings.json` `capabilities`; new installs default OFF; legacy installs without a `capabilities` block are grandfathered ON until saved (**Steam Web API** stays off in that path). Backend enforces gates on `append_desktop_debug_note`, `append_desktop_chat_event`, `list_recent_screenshots`, ask-with-attachments, TDP apply, `capture_screenshot`, bounded reads for Proton/log attachment when enabled, and Steam ban lookups when enabled. Files: `backend/services/capabilities.py`, `PermissionsTab`, `main.py`, `src/utils/settingsAndResponse.ts`.
- ★★★ **Debugging and Proton log analysis:** Settings → Advanced **Attach Proton logs when troubleshooting** (`attach_proton_logs_when_troubleshooting`) plus Permissions **Steam / Proton log read** (`steam_logs_read`). On Linux, when the sanitized question matches the troubleshooting heuristic and a running AppID is present, the backend attaches bounded tails from `~/steam-<appid>.log` (typical with `PROTON_LOG=1`) and shallow `steamapps/compatdata/<appid>/*.log` files into the **system** prompt before roleplay prefixing (`backend/services/proton_troubleshooting_logs.py`, `backend/services/game_ai_request.py`, `main.py`). Main **Input handling** shows excerpt/notes. Does **not** enable Proton logging automatically. **On-device QA:** not yet exercised in the prompt matrix — follow [testing.md](../testing.md) § **Proton / Steam log attachment (QA)**; optional Permissions smoke row in [testing.md](../testing.md#regression-gates) § Permissions.
- ★★★★ **Model policy tiers + disclosure UX:** Persisted `model_policy_tier` / `model_policy_non_foss_unlocked` and related allow-high-VRAM flag; Settings **Model policy** (tier chips, unlock flow, README link); backend `backend/services/model_policy.py` classifies model tags and enforces tier when selecting fallbacks; successful replies can include **Model source disclosure** on Main. `src/data/modelPolicy.ts`, `MainTab.tsx`, `src/utils/inputTransparency.ts`, `main.py`, [README.md](../../README.md) § Model policy tiers.

**Baseline index:** global screenshots and vision (V1) — multimodal attach; uses media-related capability paths.

### Character voice roleplay

- ★★★ **Character Voice Roleplay Mode (Opt-In):** Default-off **AI character** in Settings (small caps label); fullscreen `CharacterPickerModal` with per–work-title groups, **Random** toggle, custom line, OK/Cancel; unique pixel emoticons; main-tab glass avatar opens picker; backend `ai_character_service.build_roleplay_system_suffix` appends roleplay instructions to the Ollama system prompt. `src/data/characterCatalog.ts`, `src/components/CharacterPickerModal.tsx`, `main.py`, `settings.json` fields `ai_character_*`.
- ★★ **Character Accent Intensity Levels (Doom-Style Copy):** Settings **Accent intensity** horizontal chips (`subtle` / `balanced` / `heavy` / `unleashed`, default `balanced`) when AI characters are on; Doom-difficulty–flavored short labels and helper copy. Persisted `ai_character_accent_intensity`; `build_roleplay_system_suffix` varies dialect/accent strength for presets, random, and custom paths without changing TDP/JSON policy. `src/data/aiCharacterAccentIntensity.ts`, `src/index.tsx`, `backend/services/ai_character_service.py`, `settings_service.py`, `settingsAndResponse.ts`.
- ★★ **Running-game character suggestions (AI picker):** On `CharacterPickerModal` open, read `Router.MainRunningApp`, resolve 1–3 catalog presets via `src/utils/runningGameCharacterSuggestions.ts` (Steam AppID map + normalized title match + TF2 merge), show **Playing:** headline and suggestion row with `CharacterRoleplayEmoticon`; async after first paint with delayed spinner (~160 ms); D-pad links Random, suggestions, column 0, and custom field.
- ★★ **Random character “?” avatar (picker + main):** When **Random** is on, picker tile, main-tab glass avatar, and related summary chips use a single **“?”** affordance. `CharacterRoleplayEmoticon.tsx`, `CharacterPickerModal.tsx`, `MainTab.tsx`.
- ★★★ **Character-derived UI accent theme (preset-selected):** With AI character on and a fixed catalog preset (not Random / not custom), accent tokens follow `src/data/characterUiAccent.ts` and catalog-driven colors; **AI character off**, **Random**, and **Custom** stay bonsAI forest green. `src/index.tsx` scoped CSS / token wiring, `MainTab.tsx`, `CharacterPickerModal.tsx`.
- ★★★★ **Pyro talent-manager easter egg (hidden preset):** With AI character on and resolved voice **Pyro** (`tf2_pyro`, fixed picker or Random), replies use a Hollywood-style talent-manager parody (Ari Gold–style archetype only—not in-universe Pyro speech, no likeness claims). **Two tiers:** at **Subtle/Balanced** accent the manager stays smarmy but **helpful** (OSS-angled carousel tips); at **Heavy/Nightmare** accent the same unlock becomes a **worthless asshole AI**—mocking replies, deliberately bad Deck/game advice, never admits failure—while the backend **never applies TDP/hardware** from those replies (even if the model emits JSON). Some successful Asks attach structured **`preset_carousel_inject`** so Main shows an extra orange-outlined suggestion chip **beside** the three-slot carousel—the inject chip does not use `PRESET_CAROUSEL_ACTIVE_MS` and stays focusable after the trio may rest. Clears on the next Ask or **Reset session cache**. `backend/services/ai_character_service.py` (`build_roleplay_system_suffix_meta`, tips), `main.py` (`ask_ollama`), `game_ai_request.py`, `MainTab.tsx`, `bonsaiScopeStylesheet.ts`. [archive/research/voice-character-catalog.md](../archive/research/voice-character-catalog.md). **On-device QA:** not yet fully exercised in the standing matrices — follow [testing.md](../testing.md#regression-gates) §2 (character / carousel touches) and §3 Main tab (Pyro + inject chip; Nightmare asshole tier).

### Shipped detail (extensions and deferred phases)

> Items here mirror **Completed** above with roadmap-style detail, follow-on notes, and deferred phases.

#### Character accent intensity levels (Doom-style copy)

★★

**Shipped** — see **Completed** → Character voice roleplay; `ai_character_accent_intensity`; backend varies by `subtle` / `balanced` / `heavy` / `unleashed`.

#### Pyro talent-manager easter egg (hidden preset)

★★★★

**Shipped** — see **Completed** → Character voice roleplay. **Subtle/Balanced:** smarmy helpful manager + OSS carousel tips. **Heavy/Nightmare:** asshole AI tier (bad advice in text only; backend suppresses TDP apply). Tip appearance is probabilistic; verify on hardware per [testing.md](../testing.md#regression-gates) §2 / §3.

#### Higher-resolution character avatars (GTA-style art pass)

★★★

- **Status (V1):** Shipped — unified 16×16 SVG placeholder emoticon grids (`expand8To16`, hand-tuned bust overrides); `src/components/characterPlaceholderEmoticonGrids.ts`, `CharacterRoleplayEmoticon.tsx`.
- **Goal:** Improve recognizability with higher-resolution art that stays clear at small sizes; GTA-inspired cel-shaded, graphic-novel direction; TF2 Announcer keeps bonsai-tree treatment.
- **Files:** `src/data/characterCatalog.ts`, `src/components/CharacterPickerModal.tsx`, `src/components/MainTab.tsx`, `src/index.tsx`, `src/assets/`.
- **Depends on:** character voice roleplay + existing catalog mapping.
- **Not in scope:** changing roleplay prompt behavior, animation/VFX, or unapproved third-party likeness assets.

#### Input sanitizer lane (hybrid + user override) — extensions

★★★

**Baseline shipped** — see **Completed** → Input sanitizer lane.

- **Future goal:** Optional small-model rewrite path, harmful-input block path, explicit **Use original input** bypass beyond current hybrid behavior.
- **Files:** `main.py`, `src/index.tsx`, prompt-policy docs.
- **Depends on:** settings persistence and transparent input handling.
- **Not in scope:** hidden rewriting with no user visibility or override.

#### Input handling transparency panel

★★★

**Shipped** — see **Completed** → Input Handling Transparency Panel.

#### Desktop mode debug note save (Steam Deck)

★★★

**V1 and V2 shipped** — see **Completed** → Desktop notes.

- **Possible follow-ups:** natural-language save triggers, optional raw-response export.
- **Not in scope:** arbitrary paths outside `~/Desktop/bonsAI_logs/`, silent writes without permission, or replacing note content by default.

#### Preset carousel and transition UX

★★★★

- **Status (Phase 1):** Shipped — three chips, staggered fade, length-based hold; `PresetAnimatedChips.tsx`, `src/data/presets.ts`, scoped CSS in `src/index.tsx`; notes in `docs/testing.md`. **Carousel mode extension (2026-05-20):** slide animation, scrollable history, anti-flicker re-seed — see Completed changelog above.
- **Deferred:** lower-right arrow controls for manual next/previous (D-pad history browse shipped in carousel mode 2026-05-20).
- **Goal (full vision):** Carousel navigation controls as above.
- **Depends on:** existing preset randomization/category logic.
- **Not in scope:** changing core preset taxonomy/model routing.

#### Capability Permission Center (user-controlled access)

★★★★

**Shipped** — see **Completed** and baseline index. Ollama/LAN ask traffic is not gated as “web.”

#### Permission jump (denial → focused toggle)

★★

**Shipped 2026-08-07 (Wave 3 K).** `permissionDeepLink.ts` maps each capability key to a Permissions-tab focus target; `usePermissionJump` arms return-tab + focus; deny surfaces render `PermissionDenyAction` (**Open Permissions**). Permissions tab shows **Back to …** after a jump. Unit: `permissionDeepLink.test.ts`, `permissionJumpRegistry.test.ts`, `usePermissionJump.test.ts`, `PermissionDenyAction.test.tsx`. On-Deck: **PERM-JUMP-01** in [testing-manual.md](../testing-manual.md).

- **Not in scope (v1):** per-capability first-use consent modals; auto-enabling capabilities; new capability keys.
- **Related:** Connection doctor reuses the same deep-link registry.

- **Not in scope (future):** first-use modals per capability beyond blocked-action toasts; separate toggles for sudo vs direct sysfs (currently under Hardware control).
- **Planned extension (not shipped):** `**network_web_access`** — Permission Center toggle (default TBD) covering outbound HTTP/HTTPS from the Deck plugin; ties to **RAG knowledge base** in **Planned** → Backlog.

#### Steam Input settings search + jump (research-first)

★★★★★

- **Phase 1 shipped** — see **Completed** → Steam Input Jump. **Phase 2+ deferred** unless revived: indexed catalog, unified search, ranked results, Edit Layout enumeration.
- **Goal (if resumed):** Search setting names and navigate to relevant surfaces; deep-link feasibility gated.
- **Files:** `src/index.tsx`, `main.py`, [archive/research/steam-input-research.md](../archive/research/steam-input-research.md).
- **Depends on:** route-discovery research and fallback UX.
- **Not in scope:** private UI patching or brittle route injection.

#### Global screenshots and vision (implemented V1)

★★★★★

### Frontend structure (maintainer)

- ★★ **Phase 4d–4f frontend split (2026-07-05):** `MainTab.tsx` orchestrates `MainTabPresetRow`, `MainTabUnifiedAskBar`, `MainTabScreenshotBrowser`, and `MainTabChatTranscript`; `index.tsx` delegates to `useScreenshotBrowser`, `useSteamSettingsSearch`, and `useBonsaiPluginShell`; `bonsaiScopeStylesheet.ts` composes `src/styles/sections/*.ts`. Shared `DeckFocusSlider`, `deckSliderMath`, `createTabLocalSurvival`, settings schema split. No user-visible behavior change; `pnpm test` + `pnpm run build` pass.
- ★★★ **Phase 3 backend extraction (2026-07-05):** `ollama_ask_service.py`, `async_background_job.py`, `network_service.py`, `transparency_service.py`, `ask_local_commands.py`; `main.py` −509 LOC. Removed llama.cpp POC module; centralized Ollama constants in `py_modules/backend/constants.py` + `ollama_connectivity.py`. Report: [refactor-specialist-sweep-2026.md](refactor/refactor-specialist-sweep-2026.md).
- ★★★ **Critical regression fixes (2026-07-05):** Re-applied seven high-severity fixes still missing from experimental after refactor: settings save RMW lock, abort busy gate (Stop releases pending Ask), voice PCM buffer lock, intent pack corrupt-file preservation, Pillow decode containment, strategy checklist stale-ref + game-switch hydration, intent-pack and strategy-checklist store write locks. Regression tests: `test_background_abort_busy`, `test_settings_save_lock`, `test_intent_pack_store_lock`, `test_strategy_checklist_store_lock`, `test_load_preserves_corrupt_file`, `test_pcm_buffer_survives_concurrent_append_and_window`.

**Shipped** — see **Completed** / baseline index.

- **Strategy extension:** screenshot + game context for strategy guidance; inline visual aids when available.
- **Files:** `main.py`, `src/index.tsx`, install/troubleshooting docs.
- **Depends on:** vision-capable models on host PC.
- **Not in scope:** continuous video streaming.

---

---

## Moved from the roadmap's Verify list 2026-08-27

All of these are **Verified on device** in testing.md. They were still sitting in the roadmap's
"QA owed" list, which had drifted out of step with testing.md — the roadmap was claiming work
was outstanding that had in fact been signed off. Kept in full for the reasoning.

- ★ **You cannot ask for "the boss"** — a card's type was not searchable, so *"how do i beat the boss"* found nothing on a game whose boss card was right there. Fixed 2026-08-19 by pulling that game's cards of the named kind into the pool, only when the keyword half found none of that kind. **KB-TYPE-01** owed on device. The reversible option was taken over a schema change; [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way) has the trade-off and a standing maintainer question.
- ★★ **D-pad reaches the spoiler reveal, and A opens it** — fixed 2026-08-27, already confirmed on device **by script** (`docs/test-evidence/SPOILER-REVEAL-AFTER-onmove-fix.json`: ask → header → the fence takes the ring; A reveals it, masked 1→0). **SPOILER-DPAD-01** — by-hand residue only: B over a masked fence must not reveal; expect one absorbed Down press on the fence before the walk moves on (offered-once diversion, cosmetic). The *tap to hide* control is a separate open bug (it never takes the ring — see Bugs). Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).
- ★★ **You cannot ask about a game unless it is running** — fixed 2026-08-19 (**D19**); **KB-NEWTITLE-01** owed on device. The question is matched against the alias table as a last resort, only when Steam supplies no AppID. [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way)
- ★★ **Compat retrieval returned a tip from the wrong topic** — fixed 2026-08-18 (**D22**); **KB-ROUTER-02** owed on device. The router worked the topic out and retrieval threw it away. The report's premise was half wrong and the fix changed as a result — [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way)
- ★★ **Session context counts the newest turn twice** — fixed 2026-08-27, **confirmed on-Deck the same day by the rig with real controller presses**; **SESSION-CONTEXT-DEDUPE-01 Verified.** After a completed Ask, `liveTurn` and the newest `askThreadCollapsed` entry were the same turn shown twice; the strip now drops the live row when its question matches the newest archived one — see [testing.md](testing.md). Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).
- ★ **A revealed spoiler cannot be re-hidden with the controller** — fixed 2026-08-27, **confirmed on-Deck the same day by the rig with real controller presses**; **SPOILER-COLLAPSE-01 Verified.** The stop containing `.bonsai-spoiler-collapse-target` now delegates A to it via the gamepad ring, instead of the deliberate no-op that only needed to guard reveal targets and wait chips — see [testing.md](testing.md). Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).
- ★★ **Session context strip counts every archived turn** — fixed 2026-08-23; **SESSION-CONTEXT-COUNT-01** Open on-Deck. Chat slots now save a transparency snapshot per turn instead of only the newest one — see [testing.md](testing.md). Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).

---

## What each section's heading used to list (v0.5.0 shipped work)

Until 2026-08-27 every roadmap heading carried a long parenthetical listing what had already
shipped in that area. It was a changelog wedged into a title and made the headings unreadable.
Preserved verbatim here.

- ## Bugs (v0.5.0 fixes — LB/RB tab switch, thinking blurbs single-writer, streaming reveal tweaks, asked-entity extraction, KB phrase gate / D16, session RAG chip RPC, source attribution on chips, QAM row width, chat-slot persistence, soft num_predict → Verify, …)
- ## Verify (v0.5.0 QA owed — CHAT-SLOTS-V2, ASK-WIDTH-01, Wave 1 voice/icon/thinking rows, STREAM-09, SHELL-PAYLOAD-01, KB-ROUTER-01 / KB-ASKMODE-01, …)
- ### Ask / reply (v0.5.0 — token streaming live markdown, spoiler confidence chip, spoiler constitution runtime, thinking blurbs, reply-language / routing merge RPCs, Caveman reply style, …)
- ### Focus / Deck UI (v0.5.0 — LB/RB overflow clip, QAM ResizeObserver rebind, global document sweep, onButtonDown audit, ask-bar caret + avatar, permission jump, modal return-focus registry, …)
- ### Knowledge base (v0.5.0 — hybrid RRF + schema v3, D16 topic router, D17 mode-independent game tips, 13-title / 119-card seed, wiki attribution, KB download Cancel, session RAG chips, hybrid kill-switch, …)
- ### Permissions / safety (v0.5.0 — permission jump, spoiler constitution / named-entity consent, …)
- ### Platform / upstream (v0.5.0 — voice STT session daemon, …)

---

## Shipped, but left sitting in the roadmap's Backlog until 2026-08-27

Each of these says "shipped" in its own text and was still filed as future work. Moved here
whole, rationale included — the reasoning is why they were built the way they were.

- ★ **CI runs the gates that already exist** (the missing ratchet)
  - **Goal:** Run `npx tsc --noEmit`, `npm test` and `npm run test:py` in CI. **Measured 2026-08-24: nothing enforces them today** — `.githooks/pre-commit` only syncs architecture snapshots, `build-plugin-zip.yml` builds without testing, and `validate-mcp.yml` only checks MCP knowledge freshness. So **1,306 tests run when someone remembers**, which is the failure class [testing.md](testing.md) already named for evidence retention: *a rule that depends on someone remembering is not a mechanism*.
  - **Why it comes first:** every "fixed and locked so it cannot regress" claim depends on something actually running the lock. Prerequisite for the whole program in [21-ai-owned-testing-program.md](planning/21-ai-owned-testing-program.md).
  - **Expect a red first run** on a clean runner (Python deps, Node version, environment-dependent tests). Budget the session for fixing what it exposes — that discovery is the point, not a setback.
- ★★ **Static focus checks** (make the focus rules fail the build)
  - **Goal:** A checker script in `scripts/` — matching the existing `plugin_zip_corpus_guard.py` habit rather than adopting a linter toolchain (**there is no eslint/biome/prettier config in the repo at all**, measured 2026-08-24) — wired into the CI job above. Turns [.cursor/rules/decky-focus-graph.mdc](../.cursor/rules/decky-focus-graph.mdc) from prose an agent must remember into a gate.
  - **Certain checks:** `document.querySelector` / `activeElement` used to move or verify focus; `onMoveUp`/`onMoveDown` passed to a Decky `Button` (which does not forward them); an overwritten `tabindex` or a `-1` on a natively focusable element.
  - **Feasibility UNKNOWN:** a registration call whose registry is never consumed (the spoiler-fence class), and "new focus owner shipped with no D-pad row in testing.md".
  - **Scope honesty:** catches **new** mistakes only. Existing focus bugs still need the rig + oracles to observe. Detail: [21-ai-owned-testing-program.md](planning/21-ai-owned-testing-program.md) § 3 Track B.
  - **Why it is the answer to "focus isn't considered when new UI is built":** the rule is 26 lines of hard-won correctness that only works if read at the right moment. A check does not need to be remembered.
- ★★ **AI character avatars — prop emblems** (design handoff received 2026-08-26) — **BOTH HALVES SHIPPED. Main tab 2026-08-26 (on-Deck check owed, AVATAR-PROP-01); picker 2026-08-27 once [D33](audit/maintainer-decisions-locked.md) locked at 26px — measured on device, row **CHAR-AVATAR-26-01** in [testing.md](testing.md) is Partial pending the maintainer's own look at the size.**
  - **Goal:** Replace the 8×8/16×16 pixel-grid character placeholders with drawn prop emblems — one object per character (Scout's bat, Heavy's sandvich, Nick Valentine's fedora) on a tinted, vignetted disc. Covers all 33 keys plus `__random__` and `__custom__`. Vector, so it stays legible from 18px up without a per-character art pipeline, and it is props rather than likenesses, which keeps it clear of the copyright problem.
  - **What shipped 2026-08-26:** the Ask-bar avatar draws the prop emblem. [CharacterRoleplayEmoticon](../src/components/CharacterRoleplayEmoticon.tsx) gained an `art` prop that defaults to `"grid"`, so the picker is byte-for-byte unchanged and only the main tab opts in with `art="prop"`. The design's module-level gradient counter became `React.useId()` with the colons stripped, and the art array got its missing React keys. First tests for the component: `CharacterRoleplayEmoticon.test.tsx` (9). Design bundle and the approved prototype are in `docs/design/handoffs/ai-character-avatars/`.
  - **The main tab is settled (2026-08-26).** A true-size mock-up confirmed the Ask bar can take the new artwork with **no layout change at all** — same 18 × 18 slot, same 50.0 × 276.8px text row, same corner badge — as long as it renders the plain glyph rather than the design's `CharacterAvatar` wrapper, whose selection chip the slot's `overflow: hidden` would clip. The art also clearly beats what is there now: today seven of eight grids resolve to the same hooded silhouette at 18px.
  - **What blocked it, and how it was answered.** The picker only. The art was reviewed at 44px, the picker rendered at 24px, and the design's badge breakpoint (26px) fell in the middle of the picker's five actual sizes (22, 24, 24, 26, 26) — so one screen would have shown two badge styles. **[D33](audit/maintainer-decisions-locked.md) locked 2026-08-27 at 26px** (option C: part of the way, not the full 44). All five sizes collapsed into `PICKER_AVATAR_PX` and the picker opted into `art="prop"`. **Measured on device the same day:** 34 avatars, every one 26px on the emblem viewBox, rows still **38px so nothing gets shorter**, badges unclipped. The maintainer explicitly reserved the right to change the number after seeing it — it is one constant, so that is a one-line edit.
  - **Sequencing note:** this adds a *selection ring* to the character picker, which already carries the open **★★★ focus ring invisible / D-pad does not move** bug above. Fix the focus bug first or expect to debug both at once.
  - **Do not redraw the SVG paths** — every coordinate is the approved design. Full intake, the six mismatches, and the wiring plan: [25-ai-character-avatars-handoff.md](planning/25-ai-character-avatars-handoff.md).
- ★★★ **Frozen test chips** (pin an exact QA question into the carousel) — **SHIPPED 2026-08-22; this entry is kept for the rationale below, not as pending work.** Setting `dev_frozen_test_chips`, Developer tab UI, on-Deck row **QA-FROZEN-CHIPS-01** (Partial — two sub-checks owed, see [testing.md](testing.md)). **Left here because the request is a standing working agreement, not just a feature** — see [CLAUDE.md](../CLAUDE.md) § Testing on the Deck. **Read the shipped row, not this entry, for what it does:** a session reading only this bullet in 2026-08-26 concluded the feature did not exist and offered the maintainer a fallback it did not need.
  - **Goal:** Let a session pin a named set of exact questions as preset chips and **freeze them in
    the rotation**, so on-device QA is one press per case instead of thumb-typing a sentence into
    the on-screen keyboard. Cleared explicitly, not on the next reseed.
  - **Why it is worth building.** Every KB QA row quotes a verbatim sentence, and several are
    chosen precisely because of which words they do *not* contain — **KB-ROUTER-01**'s four
    sentences avoid "deck" and "proton" deliberately, so one stray word silently tests something
    else. `scripts/deck_send_ask.py` exists for this reason and only solves half of it: it types
    the question but will not press Ask, and it needs the QAM open on the right tab with an SSH
    session live. A frozen chip is reachable with the D-pad and survives a reseed.
  - **It also unblocks chip QA itself.** **PHASE4-CHIPS-01** has to watch a rotation to judge the
    guarantee and the **Tip** badge, and the carousel currently cannot be walked backwards (see
    Bugs) — a deterministic pinned set removes the timing problem entirely.
  - **What exists:** `dev_force_session_rag_chips` (boolean, Developer tab) forces corpus chips on,
    but there is **no way to pin specific chip text** — that is the gap. `sessionRagComposer.ts`
    already composes and reseeds the pool, so the freeze belongs there rather than in a new system.
  - **Shape:** a dev-only list of pinned questions in settings, consumed by the composer ahead of
    the normal pool, exempt from reseed, and visibly marked as test chips so a frozen set is never
    mistaken for real corpus output. Needs a focus-graph entry per CLAUDE.md.
  - **Confirmation is part of the design, not politeness:** the maintainer wants to approve the
    exact question set before it is pinned, because a wrong sentence invalidates the row it was
    meant to test.

---

## Moved from the roadmap 2026-09-02

Shipped features moved out of the roadmap in the 2026-09-02 cleanup, verbatim. Several still owe a Deck row; the roadmap keeps a five-line **VERIFY** entry for those and a one-line **Done** entry for the rest.

### Preset row: one line, then two chips across with scrolling labels (D43)

- ★★★★ **Preset chips on a single line** — **rebuilt 2026-09-01 as two chips side by side (D43); on-Deck confirmation owed** — see
  *The preset chips* under [Bugs](#bugs) and [planning/29-preset-row-three-thirds-plan.md](planning/29-preset-row-three-thirds-plan.md).
  The 2026-08-31 build showed one chip; the mockup ([major-redesign.md § 2.3](major-redesign.md)) has three side by side; the
  maintainer chose two after the width research. The height gain stays. The paragraph below records what `fc1b245` actually did, and
  stands only as the measurement baseline. The chip block went from 118px (three
  34px rows plus gaps — the single largest piece of the dock) to one 34px row; the dock went **245 → 161px** and the transcript's
  reading area **371 → 455px (+23%)**, measured live after deploy. What changed, per mode: **carousel** keeps its five-row history but
  the window is one row — the focused row is the visible row (`carouselTrackOffsetPx` is now `index × row`, viewport `max-height: 34px`),
  and a D-pad step onto a clipped neighbour slides it into view; **fade / static / decode** went from three independent slots to one, with
  fade re-timed 2000/1000 → 500/500ms because a single chip left the row blank for three seconds per cycle. Two behaviours the shrink would
  have silently broken were fixed in the same change: the three contextual seeds now **queue through** the one slot instead of two of them
  never appearing (`singleSlotRotation`), and a frozen QA batch walks in **round-robin** — the old "first entry not on screen" picker relied
  on three chips being excluded and ping-ponged between the first two (`nextFrozenPresetAfter`). Free-play sweep run after deploy: 16
  presses from the panel top through the transcript, both trailing rows, all four carousel history rows and the Ask bar, every stop
  visible. Rows **PRESET-ONE-LINE-01a/b**.
- ★★★★ **Preset row: two chips across, with scrolling labels — closed 2026-09-18.** Rebuilt 2026-09-01 under
  D43, two 30px chips side by side with a scrolling label through Steam's own marquee text. Rows 02 and 03
  passed on the Deck, row 01b passed 2026-09-03. Since 2026-09-17 (plan 60) the two chips sit 147 pixels wide
  with a 6-pixel gap, not 148 and 4. **Row 04's speed-by-eye half passed on the Deck 2026-09-17:** the long
  label crawls at about 27 pixels a second, close to the intended 25. Evidence
  `docs/test-evidence/plan57-QA-PRESET-ONE-LINE-04.json`. **Row 04's decode-mode half passed on the Deck
  2026-09-18:** the chip animation held a flat 60 frames a second for a full 8-second sample, with no frame
  slower than about 17 milliseconds. Evidence `docs/test-evidence/plan61-PRESET-ONE-LINE-04-decode.json`.
  Nothing measurable is left for the rig; reduced motion and the maintainer's own feel for the speed stay on
  the maintainer's own page.
- ★★★★ **The tab icon bar collapses when it is not in use**
  - **Goal:** The tab strip stops holding full height while nobody is using it, while still answering *which tab am I on?* at a glance —
    the sketch on the table is a thin bar of dashes showing your position in the carousel. Interacting with it opens the fuller strip.
  - **Workshopped and planned 2026-09-01:** [planning/30-collapsing-tab-bar.md](planning/30-collapsing-tab-bar.md). Twelve
    discovery decisions are recorded there (our own thin bar of dashes plus the active tab's name, opening to a floating strip only
    while the ring is on it; Steam's `Tabs` stays underneath for LB/RB). **Build is gated on the device spike in its § 5 W1**: if
    LB/RB stop working with Steam's bar hidden, work stops and comes back to the maintainer. Reopens R5 as **D44**. Folds in
    *Tab-strip micro labels + wide active cell* below. The open questions that used to sit in [roadmap-details.md](roadmap-details.md)
    are answered in the plan's § 3.
  - **Shipped 2026-09-02 (plan 30 W0–W6), on-Deck rows 07–10 owed.** The spike passed both halves — LB/RB kept switching with
    Steam's header hidden, with and without a game running (the rig launched and exited Half-Life 2 itself, plan 07 in
    decky-plugin-studio). Measured on the Deck: Steam's header row **80.66px → bonsAI's bar 20px**, the tab body's top **84.66 → 23.99px**,
    the body **616 → 677px**. The one surprise: Steam keeps its hidden tab buttons as D-pad stops, so the bar is the strip's single focus
    stop and every hop in and out of it is explicit (D55, option 1); a free-play sweep records zero focused-but-not-visible stops.
    Left/Right and LB/RB on the bar wrap because Steam's bumpers wrap (D56). **Owed:** TAB-BAR-07 (legibility by eye) and -08 (touch)
    need a person at the Deck; -09 (modal return) and -10 (UI scale Apply) are rig rows. **Not yet delivered against the goal:** the
    transcript is still 412px — the reclaimed 61px went into Main's overflow and the gap above the dock, not the bubbles; what caps
    the transcript is a Main-tab layout question (plan 30 § 8, *Why the transcript did not grow*) and the next step under this goal.


### Chip labels too long for the column autoscroll (the marquee brief)

- ★★★ **Chip labels too long for the column autoscroll** (Netflix-style marquee)
  - **Shipped at the desk 2026-09-01** inside the preset-row rebuild (D43): every chip label that overflows scrolls through Steam's
    own `Marquee` — the library's long-title crawl — slow and calm, badges pinned so **Tip** stays visible; reduced motion, or the
    component missing from Steam's bundle, falls back to a working ellipsis. Decode chips scroll only once the reveal has settled, and
    a chip never rotates out before its label has scrolled through once. **On-Deck confirm owed: PRESET-ONE-LINE-04** (feel, frame
    rate, speed calibration). Everything below is the original brief and stays as the record of why.
  - **Goal:** A preset or corpus chip whose label does not fit the 300px QAM column scrolls its text
    gently and continuously — the slow, smooth title crawl media apps use — instead of being cut off.
    A cleaner read than truncation, and it lets a long card name be read in full without the user
    doing anything.
  - **Truncation is acceptable in the meantime.** This is a polish item, not a bug fix; the chip
    being readable-but-clipped is a tolerable interim state and should not block anything.
  - **The fit check must be measured at runtime against the real element — never predicted.**
    Compare the rendered label's actual width against its actual container (`getBoundingClientRect`
    / `scrollWidth` on the live node, re-checked when the text, the font or the container changes),
    and only start scrolling when it genuinely overflows. Calculating expected width from character
    counts, a font metric or a canvas measurement is explicitly out — this repo already has the
    receipts for why: an earlier width prediction on this exact element was thrown off by the decode
    animation's substituted glyphs, and design-language rule *measure layout on device* exists for
    the same reason.
  - **Why it is worth doing, measured on device 2026-08-29:** the corpus's longest chip label,
    Half-Life 2's *"What should I know about Rocket-Propelled Grenade Launcher?"*, renders at
    **379.8px inside the 300px slot** — 29% wider than the column, 86.6px past its right edge, read
    off the live element rather than predicted. Truncation is not even the current behaviour: the
    label is `text-overflow: ellipsis` on a `display: inline` element, where the ellipsis cannot
    fire, so today a long label simply spills out. Making truncation work is the sensible first step
    and a prerequisite for this.
  - **What makes it more than a CSS animation**, and the reason for three stars rather than one:
    it has to co-exist with the **decode** reveal (which rewrites the text glyph by glyph, so any
    measurement or animation has to wait for the reveal to settle), with the fade and carousel
    modes, and with D-pad focus — a scrolling label must not disturb the focus ring or the row
    geometry the carousel's translateY math depends on. Deck frame budget is a real constraint here:
    a paint burst on this panel already costs about a quarter of a frame, so the animation wants to
    be compositor-driven (`transform`, not `left`) and to stop when the chip is off screen.
  - **Nice to have:** pause the scroll while the chip has focus so a player reading it with the D-pad
    is not chasing moving text, or scroll only the focused chip.

### Copy reply to clipboard

- ★★ **Copy reply to clipboard** (reply micro-action) — **Shipped 2026-08-28, on-Deck confirm Open**
  - **Goal:** One reply action copies visible answer text to host clipboard. Done: Copy button in
    the reply utility row, tries `navigator.clipboard.writeText` → `execCommand('copy')` → host RPC
    (`wl-copy`/`xclip`) in that order, shows Copied / Copy failed on the button itself.
  - **Spike:** [clipboard-spike-2026-08-28.md](audit/clipboard-spike-2026-08-28.md). **Settled on device 2026-08-28 —
    COPY-REPLY-01/02 both Verified.** The browser path wins outright: `navigator.clipboard.writeText` succeeded, the host RPC was never
    called, and the text survived closing and reopening the QAM. The Wayland worry turns out to be moot on stock SteamOS for a blunter
    reason — **`wl-copy`, `xclip`, `xsel` and `wl-paste` are all absent from the device**, so the host-script fallback could not run even
    if it were reached. Keep it for other setups, but it is not the path this Deck uses. Untestable here: whether another application can
    paste the text, since there is no clipboard tool on the device to check with.
  - **Source:** [13-roadmap-feature-ideas.md](planning/13-roadmap-feature-ideas.md) A2.

### Thinking effort control, Phase 1

- ★★ **Thinking effort control** — **Phase 1 shipped 2026-08-15; Phase 2 Backlog**
  - **Phase 1 (shipped):** Ollama tab → **Thinking** row, Off / Brief / Balanced / Deep, defaulting **Off**. Sends `think: true` for all three on levels — named levels are gpt-oss-only and qwen3 / deepseek-r1 reject a string (**D21**, superseding doc 16) — with effort carried by the reserved budget (256 / 512 / 1024) added to `num_predict`. A model that cannot think gets one silent retry with thinking off, is remembered for the session, and the user is told once. On-Deck **THINK-EFFORT-04**, **THINK-EFFORT-05** Open.
  - **Phase 2 (Backlog):** Replace the cosmetic `<bonsai-status>` blurb outright with hand-curated bonsAI tips — feature tips ("Ask-mode Speed trims replies for a quick answer") for generic asks, KB-strategy tips ("A run spent only kiting is a run that ends underpowered") for game-specific asks, selected contextually by current game/mode. Not a fallback for otherwise-empty moments — the generic filler copy goes away entirely. Data file shaped like `data/kb/strategy_seed.json`.
  - **Not in scope:** Reply verbosity → token budgets; caveman / lowering `num_predict`; native gpt-oss levels (needs per-model capability detection — see D21).
  - **Related:** **Reasoning display** (below) — once raw `thinking` streams live, it takes over the slot Phase 2 tips otherwise fill.

### Named chat slots (v2 and the v3 redesign)

- ★★★★★ **Named chat slots** (labeled threads — redesign only)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Up to 8 named, persistent chats with Main-tab LB/RB carousel (option C). Do not re-ship old mini-list picker.
  - **Status:** Code landed 2026-08-09 (storage, RPC, row UI). **The row never rendered in the composed plugin between `dba34e7` (2026-08-03, step-8 payload-hook extraction) and 2026-08-30** — `useMainTabPayload` dropped all six chat-slot props, both nested-modal callbacks and `askStopped`; W0 of [28-named-chat-slots-v3-implementation-plan.md](planning/28-named-chat-slots-v3-implementation-plan.md) threads them through, so the V2 QA rows are runnable on device for the first time. **Redesign v3 landed 2026-08-30** ([28-named-chat-slots-v3-implementation-plan.md](planning/28-named-chat-slots-v3-implementation-plan.md)) — the Main tab layout inverts to slot row → transcript → presets → Ask bar → context line, and the background status payload now carries `chat_slot_id` so a mid-stream slot switch can never paint one slot's tokens into another. All 19 commits W0–W18 are in; every gate green. **What is left is device QA:** run **CHAT-SLOTS-V2-05** (the P-0 bumper spike, never yet run) first, then the rest of V2 and all of **CHAT-SLOTS-V3-01…08**. Follow-up 2026-08-30 after the first on-device look: the Main tab column now stretches to the scroll viewport's bottom edge and pins presets + Ask bar there (`useMainTabColumnFill` + `.bonsai-main-tab-dock`), matching the mockups' bottom-anchored Ask bar. **On-Deck QA open** — all **CHAT-SLOTS-V2-01…06** and the **CHAT-SLOTS-V3** rows must pass before Completed. **P-0 bumper spike** result still pending on device ([major-redesign.md](major-redesign.md) § 7 R1).
  - **Unblocked 2026-08-16** (`d167f8e`). The data-loss bug that made all six rows unrunnable — every turn dropped before it reached `chat_slots/` — is fixed; run the one-Ask persistence check in [Verify](#verify) before starting 01…06.
  - **Design:** [major-redesign.md](major-redesign.md), [07-named-chat-slots-postmortem.md](planning/07-named-chat-slots-postmortem.md).

### Tab-strip micro labels + wide active cell (closed, folded into plan 30)

- ★★ **Tab-strip micro labels + wide active cell** (including a full SETTINGS label)
  - **Goal:** The active tab cell widens and carries a small text label under the icon, so the
    current tab is readable without decoding the glyph.
  - **Drawn as board 6b-A in the chat-slots design doc; deliberately NOT built.** Locked decision
    **R5** ([major-redesign.md](major-redesign.md) § 7) stands: filled active glyph only, no micro
    labels, no width change, no height cost. Shipping this later means reopening R5 in
    [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md) first — not just
    writing the CSS.
  - **Closed 2026-09-02, folded into plan 30:** the labels shipped on the open strip (8px caps under every icon) and the active
    tab's name sits on the thin bar at rest; the wide active cell was dropped by the maintainer in discovery. R5 is superseded by D44.
  - **Folded into [planning/30-collapsing-tab-bar.md](planning/30-collapsing-tab-bar.md) on 2026-09-01.** The labels ship on
    that plan's open strip; the wide active cell is dropped (maintainer call in discovery). R5 is reopened there as **D44**. Do not
    build this separately.

### The game a chat belongs to, above its title (shipped 2026-08-30, row CHAT-SLOTS-V3-14c owed)

- ★★ **The game a chat belongs to, above its title**
  - **Goal:** The slot row carries the game's name in quiet semi-transparent text above the
    conversation title, so a chat says what it is about without the title having to spend characters
    on it. Pairs with the 2026-08-30 change that stopped labels leading with the game name.
  - **The slot stores an app *id*, not a name** (`origin_app_id`), so this needs the same id-to-name
    resolution the context line under the Ask bar already does. Turns also carry a per-turn `app_id`,
    which can disagree with the slot's origin — decide which one the row reports.
  - **It costs a line of height**, which cuts against the vertical-space goal above. Worth deciding
    whether it shows always, only while the row has focus, or only when the game differs from the
    one running now.


### Answer-side eval (D45)

- ★★★ **Answer-side eval shipped, and its first finding is already fixed in code** (2026-09-02).
  `scripts/eval_kb_answers.py` (decision D45, row **KB-ANSWER-01**) runs the real Ask pipeline on the
  PC with the Deck's model — 37 questions, three answers each, under three minutes — and scores
  facts kept, contradictions, spoiler fences and the branch menu without a judge model. Baseline:
  facts from the cards survive **90.9%**, the branch menu arrives **97%**, the expected card attaches
  **100%**, but **28 of 96** samples where no fence was due carried one (nine cases fenced a harmless
  opening line on every sample). The fix — replace the fence-format sentences with one plain "do not
  fence" line on low-story and named-entity turns — measured **3 of 96** in two runs with the ending
  questions still fenced, and ships in `_strategy_spoiler_policy_block`; the two PARTIAL spoiler
  entries above carry the detail. Every prompt change from here ships with a before/after from this
  harness (plan 30 W4/W6), not on feel.
  [planning/30-kb-answer-quality-plan.md](planning/30-kb-answer-quality-plan.md) § 4.1,
  [archive/research/kb-answer-eval-2026-09-02-baseline.md](archive/research/kb-answer-eval-2026-09-02-baseline.md),
  [archive/research/kb-answer-eval-2026-09-02-fence-subtractive.md](archive/research/kb-answer-eval-2026-09-02-fence-subtractive.md).

### DRG Survivor glossary terms

- ★★★ **DRG Survivor glossary terms** (tap-to-define jargon) — shipped 2026-08-28 and **walked on device the same evening**. The morning
  failure (chips vanish when the reply settles) was the per-turn game-ID bug, fixed and confirmed separately. The evening added the three
  maintainer asks and proved them on hardware under **DRG-GLOSSARY-02**: full underline (skip-ink off, computed style read on device),
  tap → temporary plain-language popup (peek 4s / full 10s, unit-tested; the tap itself needs one manual finger check), and consistent
  D-pad reachability — the visited-once flag replaced with reading-order geometry, proven by a `deck_runSequence` that landed the ring on
  the chip three passes running (`docs/test-evidence/DRG-GLOSSARY-02-dpad-consistency.json`). Two small D-pad warts found and filed above (B backs out
  of the pane; from-below is Up-then-Down). Remaining: one touch tap, and the Explain-further auto-send on device.
  - Two curated terms, "kiting" and "overclock," both read undefined in the shipped DRG Survivor cards. A DRG Survivor reply that uses one renders it as a tappable inline chip; a floating tooltip (not inline-push) shows a short peek on focus alone, the full definition on A, and an **explain further** chip that auto-sends a new Ask turn. Frontend-only data (`src/data/drgGlossaryTerms.ts`) — no Python retrieval needed for a two-term DRG-only list; the model prompt separately gets a small clause telling it the terms are tap-to-define so it doesn't stop to explain them.
  - **Not in scope:** general jargon-detection across every game's KB content — DRG Survivor only, as planned.
  - The D-pad walk (peek → A → full → B/direction dismiss → explain-further sends) is owed on-device — see **DRG-GLOSSARY-01** in [testing.md](testing.md).

**Closed 2026-09-18 (reconciliation before plan 61):** underline, popup, D-pad reachability, B and one-press Up
all walked on device, closing the entry the roadmap carried as "one touch tap owed." The one touch tap left
stays on the maintainer's own checklist. Note for whoever picks this up next: rows **DRG-GLOSSARY-01** through
**04** have no steps written down in either testing document — the walk above happened, but nobody wrote the
row.

### Decode preset chip animation

- ★★★ **Ghost in the Shell preset chip decode** — shipped 2026-08-28, replacing the `stream` typewriter mode (`decode` now fills that slot in the picker). Chips arrive as a full-width scrambled green block and lock into the real prompt left to right behind a blinking caret; a Deck whose settings still say `stream` maps forward to `decode` rather than silently resetting to fade. **PRESET-STREAM-ANIM-01** Partial — **measured on device 2026-08-28: a flat 60 fps with all three chips decoding** (479 frames in 8 s, worst gap 50 ms), characters locking every 33–50 ms, and the focus-during-churn walk clean. The three chips never advance in the same frame — they are staggered, so it is three chips mid-decode rather than three in step. **Only the feel is still owed**, and that is a person's call, not a rig's. Writeup: [archive/roadmap-completed.md](archive/roadmap-completed.md).

### Withdrawn 2026-09-02: QAMP items

Both entries tested **TDP apply**, which the permissions cleanup of 2026-07-30 removed (`apply_tdp` and the QAMP banner no longer exist in `main.py`, `py_modules/` or `src/`). Withdrawn rather than left open; restore if the feature ever comes back.

- ★★★ **QAMP verification checklist** — per-game profile on/off, QAM Performance reopen, Steam restart/reboot, GPU-clock paths. [testing-manual.md](testing-manual.md) § QAMP.

- ★★★★★ **QAMP Phase 2 profiles** (experimental Steam opt-in)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Status:** Backlog-only. Phase 1 verification in [Verify](#verify).


---

## Moved from the roadmap 2026-09-03

Verify entries that passed on the Deck during [plan 31](../planning/31-deck-verification-round.md), moved out of the roadmap the same day, verbatim as they read there. The roadmap keeps a one-line **Done** entry for each.

- ★★ `[tabs]` **Your tab is remembered when you leave and reopen** — **VERIFY.** Shipped 2026-08-04 with a three-way Developer choice
  (D15). Rows **TAB-RESUME-01** (Partial), **TAB-RESUME-MODE-01**, **TAB-RESUME-FOCUS-01**.
  - **Evidence, 2026-09-03 on build `3b0e9d7`:** `docs/test-evidence/TAB-RESUME-FOCUS-01.json`,
    `docs/test-evidence/TAB-RESUME-MODE-01-a-select-main-and-close.json`, `docs/test-evidence/TAB-RESUME-MODE-01-c-select-5min-and-close.json`,
    `docs/test-evidence/TAB-RESUME-MODE-01-f-select-resume-and-close.json`. The first-press-snaps-to-top focus gap is unchanged and stays
    tracked with the picker focus-restore item.

- ★ `[chips]` **The static seed stops telling you to enable the knowledge base when it is already on** — **VERIFY.** Fixed 2026-08-07.
  Row **PRESET-KB-SEED-01**.
  - **Evidence, 2026-09-03:** KB on, no frozen batch, carousel mode, Main watched for 65 s straight after the chips mounted — nine
    distinct chips came round and the seed never appeared (plan 31 § 11 poll log).

---

## The Verify list as it read on 2026-09-02

The roadmap no longer has a Verify section: each item that still owes a Deck check is a **VERIFY** entry in Bugs or Features, and the QA queue is [testing.md](../testing.md). The list is preserved here verbatim because several lines carry QA-row pointers and evidence that the shorter entries do not repeat.

## Verify — shipped, QA owed

Code-fixed or shipped; on-Deck / qualitative QA still owed. Detail: [testing.md](testing.md), [testing-manual.md](testing-manual.md). Full writeups: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).

**Every Main-tab UI change also owes the free-play sweep** — standing row **QA-FREE-PLAY-01** in
[testing-manual.md](testing-manual.md): walk the whole pane like a user and require every focused stop to also be *visible*
(not behind the dock). Added 2026-08-31 after scripted checks twice passed bugs that free use found in seconds; the DPS
visibility-oracle plan (decky-plugin-studio planning/06) will turn it into one tool call.

**This list is a curated front page, not the QA queue.** [testing.md](testing.md) holds **92** rows, of which **13 are Verified** and 55 Open / 15 Partial (counted 2026-08-17). Work the rows below first because they carry the most recent fixes; when picking up anything else, read testing.md rather than assuming an absence here means coverage.

**The 2026-08-23 parallel bug session left seven fixes proven only at a desk.** Their on-Deck run is planned as two batches of six frozen test chips, grouped by game, in [20-frozen-chip-qa-batches.md](planning/20-frozen-chip-qa-batches.md) — question wording agreed and not to be reworded. Note that a pinned batch **suppresses session RAG chips**, so corpus-chip rows cannot pass until it is cleared.

- ★★★ **Clear cache cleared the screen but not the session** — **fixed and device-confirmed 2026-08-27**, after three separate causes. Two halves stay owed: what a clear does to the **orphan chat slots** it leaves behind (one per clear-and-reask), and clearing **while a reply is still being written** — unit-tested, but not reproducible by hand because this model answers faster than the walk to the button. [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way)
- ★ **A finished voice install survives "Clear all plugin data"** — **VOICE-CLEAR-01** Partial (backend verified; UI half open).
- ★ **Bonsai pot ~1px right of canopy (tab + plugin-list icon)** — fix landed 2026-08-07 (Wave 1 D); **BONSAI-ICON-GEOM-01**. [wave1.md](wave1.md).
- ★ **Developer toggle for "resume last tab" (D15 B)** — shipped 2026-08-04; **TAB-RESUME-MODE-01**, **TAB-RESUME-FOCUS-01** Open/Partial.
- ★ **Install voice engine button when already ready** — fix landed 2026-08-07 (Wave 1 B); **VOICE-REINSTALL-01**. [wave1.md](wave1.md).
- ★ **Rows span the QAM panel width** — bug **fixed 2026-08-16** (`0fcaf00`), measured on-Deck: unified host and Ask row `x=63.99 w=268.02` → `x=48 w=300`, 32px reclaimed. **ASK-WIDTH-01** still Open in testing.md — the *visual* walk was never run, only the probe. Confirm the three Main rows look flush and nothing overflows the 300px column. Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md); rule earned: [design-language.md](design-language.md) Rule 1.
- ★ **British spellings found nothing** — *armour* returned nothing while *armor* returned the card. Fixed 2026-08-19 by searching for **both** spellings rather than rewriting the question, so a British spelling can never lose a result an American one finds. **KB-SPELLING-01** owed on device.
- ★ **Static seed tells you to enable KB when it is already on** — fixed 2026-08-07 (Wave 2 F); **PRESET-KB-SEED-01**.
- ★ **Thinking blurb italicizes emojis** — fix landed 2026-08-07 (Wave 1 A); **THINKING-EMOJI-01**. [wave1.md](wave1.md).
- ★ **Thinking line vanishes mid-Ask (lazy status tag)** — fix landed 2026-08-08; **THINKING-SANITIZE-01**. [06-thinking-blurbs-review.md § 10.1](planning/06-thinking-blurbs-review.md#101-landed-2026-08-08--7-items-13).
- ★ **Token streaming stutters once at start** — fix landed 2026-08-07 (Phase A); **STREAM-REVEAL-01**. [05-token-streaming-review.md § 3.1](planning/05-token-streaming-review.md).
- ★ **VAC / `bonsai:vac-check` (Phase 1) — on-device QA** — implementation complete; finish **VAC-02…06** after Tier 0 **SMOKE-F** passes.
- ★ **~22% of Asks show bare emoji for every phase change** — fix landed 2026-08-08; **THINKING-EMOJI-CLUSTER-01**.
- ★★ **Asked-entity extraction (player typing patterns)** — fixed 2026-08-09; **STRAT-ENTITY-01**.
- ★★ **Unfenced spoiler feedback (thumbs-down category)** — shipped **and confirmed on device** 2026-08-28; **SPOILER-FEEDBACK-01** Verified. The chip is there, reachable, and the press reached the backend — `chip_id: "unfenced_spoiler"` landed in the feedback log, which is the `chip_id` bug proven fixed against the real RPC bridge. New refine chip **Unfenced spoiler** next to Bad information / Misidentified game/problem. Also fixed a pre-existing bug where `save_ask_feedback` was missing its `chip_id` parameter, so every refine chip failed silently on the real RPC bridge. Over-fenced sibling skipped — not free enough to bundle in. [spoiler-constitution.md](planning/spoiler-constitution.md).
- ★★ **Device QA — Tier 0–1** — execute Tier 0 smokes (SMOKE-A, C, F) then Tier 1 (SMOKE-B, E, H); update coverage with Pass / Partial / Fail + build id.
- ★★ **Expert mode attached fewer knowledge cards than Strategy** — fixed 2026-08-18; **KB-EXPERT-01** owed, and it re-opens **KB-ASKMODE-01** for a re-run. The route flag asked for Strategy by name, so Expert silently took the small budget. [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way)
- ★★ **KB compat retrieval phrase gate** — fixed 2026-08-06 (**D16**); **KB-ROUTER-01**. [audit/rag-pr2-signoff.md](audit/rag-pr2-signoff.md) § 2.
- ★★ **Named chat slots persist a turn** — bug **fixed 2026-08-16** (`d167f8e`); **CHAT-SLOTS-V2-01…06** all Open and **gated on one check first**: run a single Ask, then confirm (1) no `chat_slots: no slot for request_id=` line in the plugin log and (2) `/home/deck/homebrew/settings/bonsAI/chat_slots/` now exists holding `index.json` plus a slot file with **both** question and answer. Only then run 01…06 — before the fix a reopen test read as "empty thread" and pointed nowhere. Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).
- ★★ **KB coverage chip says "no game running" instead of "could not be matched"** — fixed 2026-08-23; **KB-COVERAGE-NOAPP-01** Open on-Deck. Split the coverage status that used to conflate desktop context with an unmatched running game — see [testing.md](testing.md). Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).
- ★★ **The destructive-advice guard** — built 2026-08-23, and **fixed and confirmed on device 2026-08-27** after it failed to fire on a real reply telling the user to delete a folder. It appends a visible safety notice to a finished reply that describes deleting saves, a Proton prefix or compatdata with no backup step. **Owed: the same check with token streaming off.**
- ★★ **Prompt testing pass** — broader systematic validation beyond shipped prompt-testing MVP matrices.
- ★★ **Session context header is not D-pad focusable** — fixed 2026-08-04; confirm on-Deck.
- ★★ **Show diagnostics folded into Show details** — shipped 2026-08-28. The standalone **Show
  diagnostics** button is gone; the raw `ask_diagnostics` JSON now lives behind the chip ladder's
  **Developer details** chip, same verbose-logging gate as before. Desk-verified only (unit tests,
  typecheck, build) when it shipped; **confirmed on device the same day — DIAG-FOLD-01 Verified.** No button matching "diagnostics"
  survives anywhere, and the raw JSON is where it should be, on chip 6 of 6. The verbose-logging-**off** half was not re-run.
  [testing.md](testing.md).
- ★★ **Thinking blurbs — three writers disagree** — fix landed 2026-08-08; re-verify **THINKING-COPY-01**, **THINKING-SLOW-01**, **THINKING-LIVE-01**, **THINKING-SPOILER-01**. [06-thinking-blurbs-review.md § 10](planning/06-thinking-blurbs-review.md#10-implementation-log).
- ★★ **Wave 4 G slider direction handlers** — Deck-check: **ONBUTTONDOWN-AUDIT-01** (distinguish nothing happens vs double-step; cover Ollama keep-alive, Reply verbosity, Connection timeout sliders).
- ★★ **Your tab is not remembered when you leave and reopen** — **TAB-RESUME-01** Partial (tab + scroll restore; focus-after-reopen separate).
- ★★★ **D11 legacy-loader shim removal** — **D11-SHIM-01** Partial (RPC probe ok; Main-tab Ask UI pass open).
- ★★★ **Ghost in the Shell preset chip decode** — shipped 2026-08-28, replacing the `stream` typewriter mode (`decode` now fills that slot in the picker). Chips arrive as a full-width scrambled green block and lock into the real prompt left to right behind a blinking caret; a Deck whose settings still say `stream` maps forward to `decode` rather than silently resetting to fade. **PRESET-STREAM-ANIM-01** Partial — **measured on device 2026-08-28: a flat 60 fps with all three chips decoding** (479 frames in 8 s, worst gap 50 ms), characters locking every 33–50 ms, and the focus-during-churn walk clean. The three chips never advance in the same frame — they are staggered, so it is three chips mid-decode rather than three in step. **Only the feel is still owed**, and that is a person's call, not a rig's. Writeup: [archive/roadmap-completed.md](archive/roadmap-completed.md).
- ★★★ **KB coverage chip (Show details)** — shipped 2026-08-07 (Wave 3 I); **KB-COVERAGE-01 Partial.** On-Deck 2026-08-16 the live-turn ladder rendered and the chip read `KB: 9 sections` on a Portal 2 Strategy Ask. **Still open: the two negative cases** — KB off must read `KB: off`, and an uncovered title must read `KB: none for this game`. Distinct from the per-turn `kb` retrieval chip; this one is corpus honesty.
- ★★★ **KB download Cancel** — shipped 2026-08-05; **KB-CANCEL-01 is not testable as written, and that is the blocker.** The whole download finishes in about a second on device, so there is no window to press Cancel in. Needs a slower fixture or a throttle before it can be QA'd at all. [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way)
- ★★★ **Kids master lock** — shipped 2026-08-09; on-Deck **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01** (and **KIDS-LOCK-02** if child account) Open. Live CEF Stage 0 confirmation still owed.
- ★★★ **QAMP verification checklist** — per-game profile on/off, QAM Performance reopen, Steam restart/reboot, GPU-clock paths. [testing-manual.md](testing-manual.md) § QAMP.
- ★★★ **Soft reply-length cap and thinking budget** — shipped 2026-08-10. Sub-checks: 02 verified, 01/03/04 automated with on-Deck confirmation owed, 05 needs a real thinking model. [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way)
- ★★★ **Source attribution on knowledge chips** — shipped 2026-08-09; **KB-ATTRIB-01 Partial after 2026-08-16 — one sub-check looks like a fail** and needs a second look before it is called a bug. [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way)
- ★★★ **The eval harness scored every troubleshooting tip against the wrong vector** — fixed 2026-08-21. Two independent id sequences were used as one key, so tips were compared against unrelated vectors. Any eval number from before that date is void. [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way)
- ★ **The eval harness's model sweep could not run at all** — fixed 2026-08-21. A required argument was added to the retrieval helper and two of its four callers were never updated, so the sweep crashed on entry. Any sweep result from before that date is void.
- ★★★ **The vector half of retrieval now has its own recall pass** — fixed 2026-08-18; **KB-RECALL-01** owed on device, **KB-RECALL-02** verified at the desk. It searches the game's cards directly instead of only re-ordering the keyword shortlist. [why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way)
- ★★★★ **Card relevance has its second signal (pool margin)** — shipped 2026-08-28, closing the backlog item that D28's thin 0.515 floor retune triggered. The vector recall pass now runs only when the game's best card either stands out from the rest of that game's cards by 0.0395 cosine or clears the floor by the same amount — a junk question is roughly equidistant from everything a game knows, so it fails both, while a genuine paraphrase singles a card out and a broad "how do i play this" question scores high outright. Measured before shipping: all six D28 ordinary phrases now get **zero** cards from the vector half (the two that attach through the keyword half stay, by design under D25/D28), the `kb_eval_v2` tune / tips slices are unchanged to the decimal, holdout gained one top-1 case without being tuned against, and D25's *"the boss"* / *"gels"* keep their cards. **On-Deck re-check done 2026-08-28 — the device matches the desk table card for card**, and **KB-SPELLING-01** is Verified (Deck); the run was driven end to end by the bridge board with the results read from the ask trace. Numbers and the two rejected candidate signals: [audit/kb-second-signal-2026-08-28.md](audit/kb-second-signal-2026-08-28.md).
- ★★★★★ **Global quick-launch macro** — Guide-chord docs in [troubleshooting.md](troubleshooting.md) §5; verification checklist not run on hardware.
- **D-pad reachability sweep blind spot (2026-08-04)** — cross-file nested `Focusable` (spoiler fence) not visible to per-file static analysis; answer on-device per [testing-manual.md](testing-manual.md) focus rows.
- **Reply-language snapshot RPC (2026-08-03 fix)** — verified via `probe_deck_rpc_surface.py`; UI translation spot-check optional.
- **Session RAG / routing merge RPCs (2026-08-02)** — **SESSION-RAG-CHIPS-01** Verified; **ROUTING-MERGE-01** Open.
- **Shell state + tab payload extractions (step 8)** — **SHELL-PAYLOAD-01** Open. Smoke: six tabs, one Ask, Ollama tab after Clear all plugin data.
- **Token streaming Phase B — multi-stop navigation + scroll follow (2026-08-07)** — **STREAM-09**, **STREAM-FOLLOW-01** Open. [05-token-streaming-review.md § 3.2](planning/05-token-streaming-review.md).
- **Voice input `status()` missing (2026-08-03 fix)** — on-Deck retry of live recording still needed. [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).



## Moved from the roadmap 2026-09-04

- ★★ `[KB]` **Compat routing widened to word-boundary topics (D16)** — **VERIFY.** Fixed 2026-08-06. Row **KB-ROUTER-01**.
  - Verified on the Deck 2026-09-04, Speed mode, no game running. All four KB-ROUTER-01 sentences routed to `compat_tips`
    with `Source: shared troubleshooting tips`: the memory-card one, the online-kick one, the touchpad one and the
    PlayStation 2 one (whose answer names EmuDeck). Evidence `docs/test-evidence/KB-ROUTER-01-q*.json`.

- ★★★ `[KB]` **Source attribution on knowledge chips** — **VERIFY.** Shipped 2026-08-09. Both sub-checks closed on device; the
  2026-08-14 capture-date check is still owed. Row **KB-ATTRIB-01**.
  - The owed capture-date check passed on the Deck 2026-09-04: an antlions Strategy Ask printed
    `combineoverwiki.net · CC-BY-SA-4.0 · as of 2026-08-09` over three named cards, trust tier `wiki_no_patch`.

- ★ `[ui]` **Bonsai pot sits 1px right of the canopy** in the tab and plugin-list icon — **VERIFY.** Fixed 2026-08-07. Row
  **BONSAI-ICON-GEOM-01**.
  - Measured from a Deck capture 2026-09-04 rather than judged by eye. Tab strip: canopy x 9-29 (mid 19.0), stem 19,
    pot rim 11-27 (mid 19.0), pot body 12-26 (mid 19.0). Decky plugin list: canopy widest 11-27 (mid 19.0), stem 19,
    pot rim 12-26 (mid 19.0), body 13-25 (mid 19.0). Crops at `screenshots/round31-tree-icon-zoom.png` and
    `screenshots/round31-decky-list.png`.

## Moved from the roadmap 2026-09-05

### Thinking effort control, Phase 1

★★ `[reply]` Shipped 2026-08-15: an Ollama tab **Thinking** row with Off / Brief / Balanced / Deep.

Both owed Deck checks had in fact passed before this entry was moved; nobody had moved it.

- **THINK-EFFORT-05 — PASS 2026-09-03.** Down from the Reply style slider reaches the row at *Off*; Right walks
  Off → Brief → Balanced → Deep and stops; Left walks back; Down leaves to *Custom timeouts*; Up returns. No button
  acted on a direction press. `docs/test-evidence/ONBUTTONDOWN-AUDIT-01-and-THINK-EFFORT-05-b.json`.
- **THINK-EFFORT-04 — PASS 2026-09-04.** `qwen3.5:4b` forced first in the try order with Thinking on **Deep**: a 212 s
  answer arrived, Show details read `Routed qwen3.5:4b`, and no reasoning leaked into the reply body. All four segments
  took the ring, which re-confirmed the D-pad row.

Found already-passed during plan 34's reconciliation pass, 2026-09-05, and moved the same day.

### Expert mode gets the same cards as Strategy

★★ `[KB]` Fixed 2026-08-18. The route flag tested for Strategy by name, so Expert got the biggest card
budget and the strictest relevance floor at once — the mode a stuck player picks for depth hid the most.

- **By probe, 2026-09-03:** cards attached in Speed / Strategy / Expert went 1 / 3 / 5 for two questions
  that were 2 / 1 and 3 / 1 before the fix; an off-topic sentence in Speed attached none.
- **On screen, 2026-09-04:** the antlions question in Expert returned five cards against Strategy's three
  on the same sentence, same source and trust tier.
- **The last owed check, 2026-09-05:** with Sifu running — a game the corpus does not cover — a Deep Rock
  boss question attached **no cards from any other game**. Show details read *Keyword search*, `unresolved`,
  no embed time. That closes the companion row's uncovered-title case, whose noise direction had already
  passed by probe.

### Show details says what the knowledge base had for your game

★★★ `[KB]` A coverage line in the Show details ladder. All four readings are now confirmed on the device:

| Situation | Reads | Confirmed |
|---|---|---|
| A covered game is running | `KB: 13 sections` | 2026-08-16, again 2026-09-05 |
| The knowledge base is switched off | `KB: off` | 2026-09-04 |
| Nothing is running | `KB: no game running` | 2026-08-27, again 2026-09-03 |
| A game the corpus does not cover | `KB: none for this game` | **2026-09-05** |

The last row was the one that kept slipping. Black Mesa, the title plan 31 named, is not on the Recent
Games shelf so the launcher refuses it; Sifu was used instead, checked against the eleven games the
corpus actually covers. The reading is distinct from *no game running*, which was the point of the
second half of the check.

### Asked-entity extraction reads how players actually type

★★ `[KB]` Fixed 2026-08-09. Asking about a boss **by name** is meant to keep that boss's tactics out of
spoiler fences. The detector only understood verb-first sentences, so controller phrasing never fired it.

**Verified on the Deck 2026-09-05, both halves.**

*The naming half*, run against the extractor in the build installed on the device:

| Sentence | Names | Wanted |
|---|---|---|
| `king dodongo fight` | `king dodongo` | the boss |
| `how do I beat king dodongo` | `king dodongo` | the same as name-first |
| `raphael fight strategy` | `raphael` | the boss |
| `fire boss that flies out of holes` | nothing | nothing — it used to invent *fire* |
| `how to raise a skill fast` | nothing | nothing — it used to invent *fast* |
| `best build` | nothing | nothing |
| `im stuck` | nothing | nothing |

*The wiring half*, on screen with Ocarina of Time running as the Ship of Harkinian shortcut, which the
plugin resolved to the corpus game by alias (`alias:ship of harkinian`, `KB: 16 sections`):

- **`king dodongo fight` → unfenced.** Zero spoiler blocks in the reply; the boss's tactics are in plain
  text, which is the whole point of the fix.
- **`fire boss that flies out of holes` → fenced.** One spoiler block, *Spoiler — tap to show / Hidden
  until you reveal (Strategy Guide)*.

That contrast is the row's real test: the extractor's answer reaches the fencing decision, in both
directions, on a real device with a real game running. The row existed because this wiring has no unit
test.

**Method note for a re-run:** the Show details ladder never prints the named entity, so this row cannot be
read off the screen — the same limitation the card-count row hit. The naming half was read by calling the
extractor on the deployed build over SSH; the screen shows only its consequence, the fence.

## Moved from the roadmap 2026-09-18

### Shell state and tab payload extraction (refactor step 8)

★ `[platform]` **Shell state and tab payload extraction (refactor step 8)** — **VERIFY.** Smoke: six tabs
render, one Ask end to end, the Ollama tab after Clear all plugin data. Main, Ollama, Settings, Permissions
and Developer were walked 2026-09-03. The Ollama tab after a wipe passed on the Deck 2026-09-16: the tab came
back reading as a fresh, unconfigured Deck, with nothing stale left over. Evidence
`docs/test-evidence/plan56-WIPE-01.summary.json`. Row **SHELL-PAYLOAD-01**.

- **Verified on the Deck 2026-09-18:** the About tab's own D-pad walk down its four links, row
  **ABOUT-LINKS-01**, was the only piece left. Down from the language dropdown reached all four links in
  order — GitHub, Built on Ollama!, Bugs & Feature Requests, PayPal — and Up walked back the same way;
  pressing the button on the GitHub link opened Steam's own browser at the project's page. One thing worth
  knowing: pressing the back button to leave that browser closed the whole plugin panel rather than only the
  browser page, but reopening the panel landed back on the About tab with nothing lost. Evidence
  `docs/test-evidence/plan61-ABOUT-LINKS-01.json`.
