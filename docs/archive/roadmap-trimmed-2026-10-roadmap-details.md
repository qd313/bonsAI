# Roadmap details, trimmed text (2026-10)

This file holds text trimmed from `docs/roadmap-details.md` on 2026-10-03 by plan 80 step 4. The old text is word for word, grouped under the heading it came from; links inside it may be stale.

Finished notes are here whole, with their own headings. For notes that stayed in the file, the paragraphs that were cut or rewritten are under "Trimmed from ..." headings.

### Trimmed from the file's own header (lines 1 to 14)

# Roadmap details

> Trimmed 2026-09-24 by plan 65: the long notes for finished entries moved to [archive/roadmap-details-closed.md](archive/roadmap-details-closed.md), word for word. What is left here is the long notes for entries still open.

Long-form notes for **open** roadmap entries. The roadmap itself keeps each item to a few plain
sentences; everything that would otherwise have to be re-measured lives here — what was tried,
what it cost, which leads were ruled out, and the exact steps to reproduce.

Split out 2026-08-27, when roadmap entries had grown to twenty-plus lines each and the list had
stopped being readable as a list. **Fixed** items are not here; they go to
[archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).

Each heading below matches a roadmap item's title, and the roadmap item links here.

### Trimmed from "The panel stops half way down and the Ask button is out of reach"

**Five more runs on 2026-09-15 evening, on build 1ac4d7a, and it did not come back once.** Run 1: a new chat
started from a chat with eight turns while the Session context row showed. Run 2: the box filled from a chip
press, then every direction. Run 3: a question asked first so the row carried a live turn, then a new chat.
Run 4: the same, plus the box filled from a chip. Run 5: an empty new chat with the row still showing one
turn, after the plugin was reopened with Hades running. Every Down, Left and Right from the box moved where
it should, every time. Evidence
`docs/test-evidence/plan55-trap-run1-walk-after-new-chat.json`,
`docs/test-evidence/plan55-trap-run2-chip-fill-then-dpad.json`,
`docs/test-evidence/plan55-trap-run3-new-chat-with-live-turn.json`,
`docs/test-evidence/plan55-trap-run4-chip-fill-with-live-turn-row.json`,
`docs/test-evidence/plan55-trap-run5-empty-chat-session-row-hades-running.json`.

**One more clean run 2026-09-18, build `0589565`, on the same 2026-09-15 recipe:** Down reached Ask and Up
climbed back out, no trap. Evidence `docs/test-evidence/plan61-focustrap-try1.json`.

**One more clean try 2026-09-18, after exiting Sifu, on the 15 September new-chat recipe:** Down and Right
both moved cleanly out of the question box; Left simply had nothing next to it. No trap this time. Evidence
`docs/test-evidence/plan61-focustrap-try5.json`.

**More history, moved from the roadmap 2026-09-21:**

- ★★★ `[focus]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** —
  **OPEN, found 2026-09-05.** Down walked as far as the answer and stopped dead: ten presses, no movement, Left and Right
  dead too, only Up escaping. The Ask button, the preset chips and the question box were all on screen below and none
  could be reached. It happened on a chat with history and on a brand new empty one, in both Ask modes, so the mode is
  not the cause. **Only a Decky loader restart clears it**, not a panel reopen — so this is stale navigation state, not a
  permanently trapping control. **A fix landed 2026-09-05, but the entry stays here rather than in Verify**, because the
  fault never reproduced on demand, so nothing proved the fix against it. It closes only when the panel is driven hard
  over time and the state does not come back. The unrevealed-spoiler entry above is most likely the same fault and closes
  with it. The mechanism, the signature to chase and every run, including how it was finally reproduced on
  demand:
  [detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  **The trigger is now known, found 2026-09-18.** Pressing Ask can leave the highlight stuck on the question
  box, unable to move down or right, even when the box itself was never pressed. **By the second half of
  tonight's run, with a game still open, this was happening on almost every question sent, not just once in
  a while** — raising how urgent this entry is. The only thing that reliably clears it: back out with the
  Steam button, close the whole Quick Access Menu, and reopen it — going up and back down, or switching the
  panel's tabs, does not. Full run history and the exact steps:
  [detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  **One more try 2026-09-18, later in the same night:** with Hades still running, one question sent with the
  usual workaround went through cleanly and did not trap — a sample of one, so the "nearly every send" reading
  from earlier tonight still stands. Evidence `docs/test-evidence/plan61-ASKBAR-FOCUS-TRAP-03-tally.json`.
  **Not seen at all on 2026-09-19:** about ten questions were sent with Hollow Knight, Half-Life 2, Hades and
  Black Mesa running in turn, and the trap never happened once. The one thing done differently from the
  night before is that the plugin was reloaded after every settings edit tonight (see the pinned-chip entry
  above), which is worth trying again before calling this closed.
  **A separate, smaller fault was found and fixed 2026-09-20** while chasing this very entry: pressing Ask
  left Down doing nothing for as long as an answer was arriving, though Right kept working throughout — and
  it reproduces every time, unlike this one. Now fixed and moved to Verify as **ASKBAR-DOWN-TO-STOP-01**; it
  may well be part of what has been feeding these reports. But it is not this bug — today's runs saw no dead
  Left or Right, and nothing needed a full Quick Access Menu close to clear, so this entry stays open.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

**One deliberate try on the Deck 2026-09-23, under a recorder, DID NOT REPRODUCE:** pressed A once on the
empty question box (its last known trigger), the on-screen keyboard opened, B closed it, and Down, Right,
Up and Down all moved the ring normally afterward. **Stays open** — one clean build does not close a fault
that has come and gone before; the maintainer's call. Evidence
`docs/test-evidence/plan64-STUCK-PANEL-01.json` (+ screenshots).
**Not reproduced 2026-09-26 (plan 70, flow 4.3), 3 tries.** A on the empty question box on purpose (the
runbook's one allowed exception), then a run of D-pad presses. In try 1, a B pressed about 1.4 seconds
after the A did not close the on-screen keyboard — all four D-pad presses that followed moved the
keyboard's own key highlight instead, nothing typed, and the plugin's own focus stayed on the box through
all six presses; a second B did close it, and every press afterward moved normally. In tries 2 and 3, with
B pressed about 20 seconds after the A, one B closed the keyboard and the D-pad was alive throughout,
including a full 13-press walk up to the tab bar and 14 back down with nothing stopping partway. No
recovery step (no Quick Access Menu close, no reload) was needed in any of the three. Evidence
`docs/test-evidence/plan70-F4-STUCK-PANEL.json` (+ screenshots).

not be reached. Closing and reopening Quick Access cleared it and emptied the box. Being fixed (helper
F2). A related shape seen the same session: walking Up from the question box with a game running landed

### Trimmed from "The chat summary card appears behind the dock until Down is pressed"

Found 2026-09-25 during plan 68's Deck pass, rows SUMUP-02 and SUMUP-03. After the *Sum up this chat* button
finishes, the card that shows what the AI kept sits just behind the dock at the bottom of the screen: its
top measured 597 pixels down against the dock's own top at 600, only 3 pixels of daylight. Opened straight
from the note under a summarised answer (SUMUP-02), only the top 81 pixels of the card showed above the
dock. Either way, a person does not see the card appear on its own — they have to press Down to bring it
into view. **Still true on the second Deck pass, 2026-09-26:** opened from the note again, only 44 of the
card's 418 pixels showed above the dock. The greyed Sum up button's two-line reason line dips 4 px under
the dock too (573-604, dock 600). Deck check owed once a fix lands.

### Trimmed from "Some saved answers have a hidden block's markers written twice, cause unknown"

Older dated note moved here from the roadmap entry on 2026-10-01 (docs sweep 13, plan 78), to bring the roadmap under its size limit. Nothing was removed.

  **2026-09-27 (plan 72, `8753cb7f`, `74e8fc7b`, `d2e5e98e`):** three related paths fixed and unit-tested: a one-line hidden block no longer gets wrapped twice while streaming, no longer opens onto "undefined" or shows openly, and Copy and Read aloud no longer give it away. The original cause is still unproven, most likely the model; no Deck check yet.

**Why an answer ends up saved with doubled markers in the first place is not known.** Deck check owed: find
or make an answer with doubled markers and confirm the next question's memory does not carry the hidden
text — the log's memory line or the chat file itself shows it either way.

## Shipped, QA owed — why each was built this way

Moved out of the roadmap's **Verify** section 2026-08-27. Each of these ships and works; what is
recorded here is the design reasoning, the options rejected and the measurements behind them, so
the choice does not have to be re-litigated when the QA row is finally run.

- ★★★ **Clear cache leaves the thread on disk — it clears the screen, not the session** — **fixed and device-confirmed 2026-08-27** across three separate causes ([D32](audit/maintainer-decisions-archive.md#d32--clear-cache-says-it-clears-the-thread-but-the-saved-chat-stays-on-disk-which-half-is-wrong) chat slot, [D34](audit/maintainer-decisions-archive.md#d34--locked-option-1-2026-08-27--clear-cache-is-undone-by-its-own-confirmation-box-what-should-come-back-afterwards) modal snapshot, [D35](audit/maintainer-decisions-archive.md#d35--locked-option-1-2026-08-27--clear-cache-clears-the-screen-but-the-ais-last-answer-is-still-stored-on-the-plugins-own-back-end-should-clearing-forget-it) backend forget). **CLEAR-CACHE-01** Partial — the "clears a generation still in flight" half is unit-tested only, because the model finishes faster than the D-pad walk to the button. Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md). **Still owed as its own follow-up (not settled by D32): orphan chat slots accumulate**, one per clear-and-reask cycle.

- ★ **You cannot ask for "the boss" — a card's type is not searchable** — fixed 2026-08-19; **KB-TYPE-01** Open. `sections_fts` indexes `(name, card)` only, so *"how do i beat the boss"* returned 0 candidates on a title whose boss card was right there, and the vector half did not rescue it. Fixed by **query-time type recall** (option b of the three in the original report): a generic type word pulls that game's cards of that type into the pool and marks them preferred, reusing the same flat `RRF_W_TOPIC` signal D22 introduced for compat. Chosen over indexing `section_type` in FTS because it needs no schema change and no corpus rebuild, so it reaches an already-installed corpus — and it is easy to reverse. Verified across three titles: DRG → Dreadnought, Hades → Theseus and Asterius, OoT → Volvagia/Gohma/Twinrova, and *"what dungeon should i do first"* → the dungeon card. Explicit route only, and a named card still outranks its own kind. **Narrowed 2026-08-19** once the Phase 4 cards took Ocarina of Time from three boss cards to six: the preference now applies only to kinds the keyword half missed entirely. `_sections_of_type` returns the game's first three cards of the kind **by section_id** — authoring order, no relevance in it — so preferring them unconditionally promoted an arbitrary slice over a real match. *"how do i beat the water temple boss"* returned Queen Gohma, Volvagia and Twinrova and dropped **Morpha**, whose card opens *"The Water Temple boss"*. Per kind rather than all-or-nothing, so a question naming two types can still rescue the half that found nothing. The rescue direction is unchanged and pinned by its own test. **Maintainer note:** this was one of the three options in the bug and you were mid-flight, so I took the reversible one; say the word if you want the FTS-index version instead.

- ★★ **You cannot ask about a game unless it is running** — fixed 2026-08-19 (**D19**); **KB-NEWTITLE-01** Open on-Deck. `resolve_title_from_question` scans the question against the alias table as a last resort, only when Steam supplies neither an AppID nor a name, so a running game always wins. Longest alias wins, word boundaries, 3-character minimum. Verified locally: *hl2 ravenholm* → Ravenholm, *drg survivor what class* → Classes, *how do gels work in portal 2* → Gels, *what is the best way to beat volvagia in oot* → Volvagia. **Two things the fix turned up:** a canonical title carrying punctuation (*The Legend of Zelda: Ocarina of Time*) never matched its own normalised form, so OoT resolved to nothing and fell through to the genre card; and the spoiler profile was unreachable by name, which D19 explicitly rules out — the name tables now carry the same two profiles in **both languages**, moved together with `tests/contracts/spoiler-title-profiles.json` (that contract caught the change, as designed). **On-Deck still owes** the negative direction: with a game running, a question naming a different title must still answer about the running game.

- ★★ **Expert mode attaches fewer knowledge cards than Strategy** — fixed 2026-08-18; **KB-EXPERT-01** Open, and it re-opens **KB-ASKMODE-01** for a re-run. The route flag asked for Strategy *by name* (`!= "strategy"`), so Expert carried the largest card budget (5) and the strictest relevance floor (4.0 against 1.0) at once. Now keyed off `_DECLARED_GAME_ASK_MODES`, the one definition of "the user declared this Ask to be about the game" — which the vector recall pass reads too, so Expert gained both together. Reproduced on the seed corpus before the fix and measured after: DRG Survivor *"what class should i pick"* Strategy 2 / Expert **1 → 2**; *"what should i upgrade"* Strategy 3 / Expert **1 → 3**. **On-Deck still owes** the count check against a real corpus — note it cannot be read off the screen, the Show details ladder prints no card count; use `scripts/probe_deck_kb_retrieval.py`. Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).

- ★★ **Compat retrieval returns a tip from the wrong topic** — fixed 2026-08-18 (**D22**); **KB-ROUTER-02** Open on-Deck. The D16 router worked out the topic and retrieval discarded it. **The bug report's premise was half wrong and the fix changed because of it:** the on-topic tips were not out-ranked, they were **absent** — 0 of 8 storage tips and 0 of 10 steam_input tips ever reached the candidate list, because the questions share no vocabulary with them. So the topic now opens a recall path first and acts as a preference second. All four KB-ROUTER-01 sentences return an on-topic tip first (was 1 of 4); compat tune top-3 81% → 100%, and 96% on a Deck with no embed model, since the fix does not depend on one. Weight is the weakest that works, and a test pins that a clearly better off-topic tip can still win — raise it and D22 stops holding. Measurement: [audit/rag-compat-topic-preference-2026-08-18.md](archive/rag-compat-topic-preference-2026-08-18.md).

- ★★★ **KB download Cancel** — shipped 2026-08-05; **KB-CANCEL-01 — not testable as written, and that is the blocker.** Attempted on-Deck 2026-08-16 and abandoned: at 758502 bytes the whole download-decompress-install cycle takes **~0.9 s** (Deck log `Downloading…` 23:32:37.711 → `Knowledge base installed` 23:32:38.610), so there is no cancel window to press. What looked like a Cancel pass was the **storage picker** (`onPrimaryClick = installed ? runUpdate : openStoragePicker`, [KnowledgeBaseSection.tsx:527](../src/components/KnowledgeBaseSection.tsx)) — press one opens the internal/SD modal, press two starts the download. **To run this row at all the download has to be slowed** — throttle the link (`tc qdisc`), point the fetch at a stalled host, or add a dev-only delay. Until then the six frontend tests are the only coverage and the D-pad-reach half (the part unit tests cannot judge) is unproven.

- ★★★ **Soft** `num_predict` **+ thinking budget** — shipped 2026-08-10; **02 Verified, 01/03/04 Partial (automated, on-Deck confirm owed), 05 Open** (needs a real thinking model). Caps Speed 800 / Expert 1200 / Strategy 1600; soft continue on `done_reason=length` (max 2) with ephemeral **`Continuing…`**; C1 budgets in `ollama_ask_budgets.py` (`think: false` default). **Fixed 2026-08-15:** the cap table was keyed `deep` — the mode's pre-2026-06-26 name — so Expert silently ran on the Speed cap (800, not 1200) since the caps shipped; **EXPERT-CAP-01**. **Fixed 2026-08-15:** Stop landing within 120ms of the cue could persist `Continuing…` into the saved reply — `_update_partial_response`'s throttle dropped the cue-clear write; now a shrinking partial always bypasses the throttle, plus a client-side `stripSoftContinueCue` backstop. Unblocks **Thinking effort control**. Detail: [16-soft-num-predict-thinking-budget.md](archive/16-soft-num-predict-thinking-budget.md).

- ★★★ **Source attribution on knowledge chips** — shipped 2026-08-09; **KB-ATTRIB-01 Partial after on-Deck 2026-08-16 — one sub-check looks like a fail.** The positive case passes: a Portal 2 (`620`) Strategy Ask surfaced `theportalwiki.com · CC-BY-4.0 · as of 2026-08-09` under Show details with the card beneath it, credit accent on the block and a capture date that is not today's. **What did not pass:** the row requires the credit accent be *visibly distinct* from the amber an `open_weight` model chip uses, with both on screen — they were (`Routed gemma4:e2b-it-qat` four rows above), and in `DeckCapture_20260816_233808_game` **the two ambers read as the same colour**. Needs a maintainer eye on the panel and then most likely a token change in [design-tokens.md](design-tokens.md). Also still owed: the negative case (a maintainer-authored-only reply must show no accent and no credit block). **KB-ATTRIB-02** (published corpus ships `ATTRIBUTIONS.md`) is Verified on Deck.

- ★★★ **The eval harness scored every troubleshooting tip against the wrong vector** — fixed 2026-08-21. It kept **one** vector map keyed by `CorpusDoc.doc_id`, and `compat_patterns.pattern_id` and `sections.section_id` are independent sequences that both land in that field — so a section card's vector overwrote the tip's for every id in both tables, **122 of 124 tips** at the current corpus size. Production has never had this problem: it stores `section_vectors` and `compat_pattern_vectors` in separate tables. **Nothing that ships changed; what we could truthfully say about it did.** Corrected on the same corpus, tips only: vector-only top-3 **12.5% → 67.5%**, fusion **57.5% → 72.5%** against keyword's unchanged 65.0%. Across all labelled tuning rows, fusion top-3 **89.2% → 94.1%** against keyword's unchanged 88.2% — so the harness had been reporting that fusion barely beat keyword when it beats it by about six points. The `keyword` arm uses no vectors and is identical in both runs, which is what confirms the diagnosis. **The holdout ship gate is unchanged and still cannot separate the arms** (n=36, 83.3% both) — the correction did not buy a verdict. Prior reports carry a correction banner; [archive/research/kb-embed-bakeoff-2026-08-21-arms.md](archive/research/kb-embed-bakeoff-2026-08-21-arms.md) is the current one. **Does not disturb the compat recall decision taken 2026-08-18** — that was measured through the production service, not this harness.

- ★★★ **Vector half of hybrid retrieval has its own recall pass** — fixed 2026-08-18; **KB-RECALL-01** Open (on-Deck), **KB-RECALL-02** Verified (PC). The vector half no longer re-orders a keyword shortlist — it searches the resolved game's sections itself and RRF fuses two real lists, so a card that shares no keyword with the question is reachable. On `kb_eval_v2` (98 labeled strategy rows) top-3 went **95.9% → 100.0%** with **zero** regressions; the four queries measured on Deck 2026-08-17 now attach. **What a Deck still has to answer:** the pass costs an embed round trip (793–900 ms on device, ~28 ms against a PC Ollama), and it is gated to the **explicit** route so an Ask that merely happened while a game was open pays nothing — confirm both halves of that on hardware. Floor is measured, not guessed, and the two distributions **overlap**: [audit/rag-vector-recall-floor-2026-08-18.md](archive/rag-vector-recall-floor-2026-08-18.md). Writeup: [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).

---

## Token streaming reveals text in chunks while a game is running

- ★★ **Token streaming reveals text in chunks while a game is running** — **measured properly on device 2026-08-28 with DRG Survivor
  actually running** (the condition earlier passes could not meet). Both halves of the old contradiction are real, at different moments:
  tokens arrive in bursts, and *during a paint burst* the QAM overlay dropped to **47 fps** with a worst frame of **50 ms** (39 frames over
  20 ms in a 3-second sample); *between bursts* it sat at a flat 60 fps, worst frame 17 ms. So the reveal is chunky because delivery is
  bursty, not because painting is slow — the repaint of a burst costs about a quarter of the frame budget for as long as the burst lasts.
  Overlay frames only: the rig reads the QAM's own page and cannot measure the game's frame rate — the maintainer's performance overlay is
  the judge of whether the game itself stutters during a burst. Full numbers in [testing.md](testing.md) **STREAM-11**.

**Fixed 2026-09-24 (`341841d3`).** The plugin waited for a full 4 KB before passing on any of the model's
words; with a game running that meant lumps of about 115 letters every 1.5 to 2 seconds. It now passes on
whatever has arrived at once. Rows **STREAM-11**, **FIX-01**/**FIX-02** in [testing.md](testing.md).

**Passed on the Deck 2026-09-26 (plan 70, flow L5.4), with Deep Rock Galactic: Survivor actually running,
closed.** Two questions measured, answer length read from the page every half second. With the scramble
animation on: writing for 19 seconds, growing from 0 to 1,480 characters, every read grew, the largest
gap between growths 0.66 seconds, the largest single jump 103 characters. With it off: writing for 34
seconds, 0 to 2,380 characters, every read grew, the only pause over 1.5 seconds (5.1 s) came after the
text had already finished, during the final tidy-up. Neither answer ran the full 60 seconds the runbook
asked for, but the numbers measured — no gap over 1.5 seconds while writing, no jump over 115 characters
— are clean. Evidence `docs/test-evidence/plan70-L5-FLOW3-DRG.json`.

### Trimmed from "Ask / reply items with short entries, as filed"

  - **Goal:** LAN Ask host: add/pull models not in catalog — blocked until mechanism chosen (R1–R4).

### Trimmed from "Adjustable text size in Settings"

  - **The scaling hook already exists.** `uiScalePx()` is applied throughout the stylesheet, so the
    mechanism is present; the work is exposing it as a setting, deciding what it does and does not
    scale (icons and the 300px column width must not move — design-language Rules 1 and 6), and
    paying the ~18-file plumbing cost one setting costs ([audit/03-friction.md](audit/03-friction.md)).

### Trimmed from "Permissions / safety items, as filed"

  - **Status:** Phase 1 complete; on-device QA in [Verify](#verify).

## The eleven long files, left long on purpose

Long version of the roadmap entry. Filed 2026-09-15 at the end of the clean-up's reshape phase; moved here for
the full file list. Nothing a person using the plugin would notice — this is about what the code costs to work
in, not what it does.

The clean-up decided up front not to split the plugin's main screen file or the other big screen files this
round: each is a day's careful work on code that draws things, and a mistake there is visible. This entry is
the promise that they were left on purpose rather than missed, with today's sizes recorded so nobody has to
measure again.

**Screen side, seven files:**

- The plugin's main file — 1,709 lines
- The model download window — 1,385 lines
- One style sheet — 1,344 lines
- The where-the-AI-runs settings section — 1,310 lines
- The animated chips row — 1,232 lines
- The chat transcript — 1,221 lines
- The Ask bar — 1,079 lines

One more file, the emoticon list, is 1,023 lines but is just a list — splitting it would gain nothing, so it
is not part of this plan.

**Back-end side, four files** the clean-up's plan did not name, and which are worth their own decision before
anyone starts:

- The knowledge base service — 2,092 lines
- The prompt builder — 1,571 lines
- Voice transcription — 1,294 lines
- The AI service — 1,270 lines

**Two worked examples already exist** from this phase: the question chips and the reply rating both came out
of the Ask file as their own pieces, each with a test written at the same time. The record of the order the
hooks ran in is what made both moves safe. Do the rest one file at a time, the same way, each with its own
Deck check. [Plan](archive/51-refactor-round-two.md).

### Trimmed from "Controller macro test rig and live view"

    [plan 19](planning/19-controller-macro-test-rig.md). The status as first written follows.
  - **Status as first written:** **Discovery locked 2026-08-23** — decisions L1–L10, architecture, serial protocol, spikes and phasing in [19-controller-macro-test-rig.md](planning/19-controller-macro-test-rig.md). Board ordered 2026-08-24. Next concrete step: spikes S1–S3 (board bring-up, QAM Guide-chord from the bridge pad, tee-pipeline latency + scoped sudoers). **The V1 acceptance flow already ran in practice on 2026-08-28:** the Batch A re-run drove QAM chord → bonsAI panel → six frozen chips (real A-press each on chip and on **ask**) → reply-finished waits → ask-trace readback, unattended, with the existing bridge + CDP tooling — evidence in `runs/` and the KB-SPELLING-01 row. What V1 adds beyond that is the recording tee and the formalized safety interlocks.

### Trimmed from "The five-star and six-star platform items, as filed"

  - **Split 2026-09-05:** the toast slice is its own ★★ roadmap entry, **The answer's first lines in the reply-ready toast**, planned in
    [38-toast-answer-lines.md](planning/38-toast-answer-lines.md) with the maintainer's calls in **D63**. What stays under this entry is the
    overlay research. First step of the plan is a measurement: the reply-ready toast has never been recorded showing over a running game.

### Trimmed from "A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab"

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Spoiler leak family

- ★★★ `[reply]` **A name-withheld boss question on a story-protected game comes back with no spoiler box** —
  **OPEN, found 2026-09-18.** Nothing running, no consent phrase anywhere in the chat: asked about "the boss
  past the crystal spike area … the one that looks just like me" in Hollow Knight, the reply named Broken
  Vessel and gave its tactics in plain text with no cover; asked about "the boss at the end of the first area"
  in Hades, the reply named Theseus and Asterius the same way. Two games, both builds, the same shape. The
  plan 54 rows still marked owed (STRAT-SPOIL-NAME-01) would fail on this evidence. Evidence
  `docs/test-evidence/plan58p1-M-hk-boss-before.json`, `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json`.
  **Seen again 2026-09-18 with Hades actually running and streaming on:** the same question, asked without
  naming a boss, still came back in plain text with no cover at any point. So the game being detected and
  running does not close the box either — this is not only a nothing-running gap. Evidence
  `docs/test-evidence/plan61-HADES-UNNAMED-STREAM-01-retry2.json`, `docs/test-evidence/plan61-HADES-UNNAMED-01-retry2.json`.
  **Sighting, 2026-09-19, Hollow Knight:** the same kind of question ("what is waiting at the end of the
  game") came back this time WITH its cover in place. Not closing this entry on one clean sighting, but
  worth recording. Evidence `docs/test-evidence/plan61-REPLY-STOPS-MIRROR-01-retry2.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

**The rest of the bug's history, moved here 2026-09-26 to keep the roadmap under its size limit.**
Five possible causes were ruled out 2026-09-21, each by its own measurement, including the most
promising one: a device log from 2026-09-18 showed the model's own instructions fitted its memory
window with room to spare, and its own thinking even mentioned wrapping the answer, yet the answer
still came back with no cover. Still reproduced 2026-09-22, uncovered in the first sentence. A
measurement warning, not a fix: repeating the identical question came back cached, 1 second against
the first run's 27, word for word the same — a warning about the counts already taken, not proof
they were wrong, since counting by repeating a question counts nothing. Evidence
`docs/test-evidence/plan63-SPOILER-UNNAMED-BOSS.json`. Reproduced again 2026-09-23 with fresh
wording, Hollow Knight, game running: asking about the boss behind the crystal spike area attached
the Soul Master's own note and Show details read "Spoiler risk: med," yet no spoiler cover appeared
at any of 83 reads taken while the reply streamed in. The reply named "the Soul Master" outright and
gave away its fake death and second round in plain text. The SPOILER-REVEAL reachability check
stayed owed for a different reason: with no cover ever appearing, there was no hidden block to walk
to and reach. Evidence `docs/test-evidence/plan64-SPOILER-REVEAL-reachability.json`.

**Fixed 2026-09-26 (plan 70, helper A), commits `d4b3062e`, `d41b47c7`, `301abc56`, `147cf5fa`.**
`d4b3062e` works out, once per turn, whether a cover is owed and which names it protects
(`spoiler_cover_required`, `protected_spoiler_names`, `boss_like_card_names`) as one shared answer
instead of every caller working it out fresh. `d41b47c7` adds the checker itself
(`cover_named_spoilers`): it finds the sentence or sentences naming a protected thing and wraps just
those in a spoiler box, leaving anything already covered alone (including an accidental doubled
cover from an earlier bug) and never producing a doubled cover itself — proved by breaking the
name-matching check on purpose (4 tests failed as expected) and restoring it. `301abc56` wires it
into the real Ask: once the honesty footers are appended, every attached boss or enemy name the
player did not type is covered wherever it shows up, before the saved/"Show details" copy is built,
so the two never disagree about what got covered. `147cf5fa` covers a name while it is still
streaming in too: a name already fully typed is covered immediately; a name only half-typed is held
back from the screen until the next flush either completes it (covered) or shows the words were
something else (never hidden). Answer-test rows added for a boss described but never named:
A-HK-03 (Hollow Knight, Soul Master) and A-HADES-04 (Hades, Megaera), each confirmed to have a real
note before being written. The Hollow Knight described-boss row that used to expect no cover
(`b2f1933a`) now expects "not scored" instead, since covering that name is the fix working, not a
regression — 1 run in 5 named the boss and was covered.

**SPOILER-REVEAL reachability itself passed on the Deck 2026-09-26** (plan 70, flow L1), closed: once
a finished answer had a cover on screen, the cover took the ring one D-pad press at a time and A
opened it. Evidence `docs/test-evidence/plan70-SPOILER-REVEAL-reach.json`.

**FAILED live on the Deck 2026-09-26 (plan 70, flow L1), being fixed (helper A).** The fix above covers
every *finished* answer correctly: in the same session, Hollow Knight and Hades both named the right
things and were covered, and Deep Rock never covered (nothing to cover). But not everything live: one
Hollow Knight answer showed "The Soul Master fight is all about timing his movements" plus raw
`` ```bonsai-spoiler `` marker text in plain sight for about 4.7 seconds, when the model opened its own
fence mid-line, before the finished cover formed correctly. Row **SPOILER-COVER-01** in
[testing.md](testing.md), evidence `docs/test-evidence/plan70-SPOILER-COVER-01.json` (+ screenshots).
**Known gap, still open:** a spoiler that never uses a note's own name (a paraphrase) is not caught.

**Fixed 2026-09-26 (plan 70, helper A, commit `59bb4dd6`).** Cause: the model sometimes writes its own
spoiler cover with no line break before it ("The```bonsai-spoiler"), which neither the checker nor the
screen's own parser will ever recognise as a real cover — both require one to start its own line. Three
fixes, all in the safety net itself: give a fence marker glued to running prose its own line; hold back
a spoiler fence's whole body while it is still being written, not just the sentence that names
something; and never show a half-typed opener ("```bon") raw while it forms. Proved by breaking the
line-start fix on purpose: 4 named tests failed as expected, restored afterward. **Deck re-check owed:**
the same live-answer setup — the teleporting-boss question again, watching the reply while it is still
arriving for a plain name or raw fence text before the cover forms.

**FAILED again on the Deck 2026-09-26 (plan 70, flow L3), the fix did not hold, escalated to the
stronger model (helper A2).** Six fresh questions, watched live every 250 ms. Finished answers are still
correct: 4 of 6 never named a boss at all, and 2 of 6 did — both fully covered once finished. But of
those two, both leaked while streaming. HK-A ("the teleporting boss that throws orbs in the sanctum"):
"When fighting the Soul Master, the key is timing your attacks around his movement" was readable in
plain text from 26.3 s to about 32.0 s (about 6 s), with "Code block incoming…" showing below it the
whole time. HK-MENU ("the spell casting boss at the top of the sanctum"): the opening spoiler fence
showed a garbled repeat of its own first sentence in plain text for about 9 s, and a second fence near
the end of the answer showed raw "```bonsai-spoiler" for about 3.3 s before its own content ("Hitting him
from below while he conjures orbs…") streamed in plain for a few more seconds. Pattern: a spoiler fence
placed at the very start of the answer (or a second one near the end) streams its own content uncovered
until the whole answer finishes, even with the line-start fix in place. Evidence
`docs/test-evidence/plan70-SPOILER-COVER-01-try2.json` (+ screenshot).

**Cause found and fixed 2026-09-26 (plan 70, helper A2, four commits, 15:37-15:50).** The leak was on the
screen, not the back end. Proof first: the two answers the Deck saved were rebuilt and replayed through
the real back-end path — status-tag stripping, the branch-menu hold-back, the live spoiler cover, exactly
as each streamed update runs them. The back end never sent the name uncovered, in 0 of 5,333 replayed
updates (the same check fails 1,131 times with its own hold-back switched off, so the check itself works).
Correction to the earlier write-up: the first cover in both leaks was the back end's own doing, not the
model's — the model's answer was already correctly wrapped; the screen just showed it wrong.

**The real cause (commit `2d7406a7`):** the screen's letter-by-letter reveal assumed each new snapshot of
the answer only ever grows at the end. The back end's live cover rewrites text it already sent — it wraps
a sentence in a spoiler fence once the name arrives, moving the fence's closer as the sentence grows, and
can take back a word that could still become a name. The reveal kept what it had already shown and
appended the new snapshot from the old length, so the fence's own opening marker was eaten
("When fight" + "-spoiler\nWhen fighting the Soul Master..." — character for character what the Deck
read), the named sentence showed as plain text, and the orphaned closer opened a code-block chip. Fix:
when the shown text is no longer the start of the new snapshot, the reveal falls back to the point both
agree on and reveals the rest from there; a word the back end takes back now disappears instead of
staying on screen. Tests: the two exact snapshot pairs read on the Deck (HK-A, HK-MENU) and a taken-back
word all fail on the old reveal, checked.

**A second bug the same fix exposed (commit `acf69c5f`):** with the fall-back point landing inside an
unfinished fence, a cover would flicker from "Spoiler — tap to show" to "Spoiler hidden until complete…"
on every update, and a half-typed fence marker could flash a "Code block incoming…" chip. Fix: a
`settleRevealCut()` step decides where the reveal may stop — never inside a fence marker line, never
inside a spoiler fence the snapshot has already closed. Tests: a case-by-case check of `settleRevealCut()`
itself, and the real HK-A cover walked update by update, which fails without the change.

**"The boss boss" wording bug, same investigation (commit `cb708b37`):** the branch menu's stand-in for a
hidden name only swapped the name itself, so "facing the Soul Master boss?" became "facing the boss
boss?". The stand-in now also swallows a "boss" that follows the name. Tests: the Deck's own question
line and two option labels (failed before the fix), plus a "bossfight" boundary case that must stay
untouched.

**Standing regression guard added (commit `af29d6fc`):** the back-end replay used to find the proof above
is now a permanent test — five answer shapes, five update sizes, every update checked for a protected name
outside a closed cover, an open cover's body, or half a fence marker. Breaking the back end's hold-back on
purpose fails it 921 times.

**Two further risks the same investigation found, fixed 2026-09-26 (plan 70, helper A2, round two,
16:06-16:16):** (1) the "From the notes" block under an answer could print a protected note's title in
plain text when the answer used the note without ever naming the boss — the block only ever hid behind
the answer's own cover, and an answer with no cover (because it never named anyone) had nothing to hide
behind. Fix (commit `b673bcab`): the back end now decides, once per turn before the model is even called,
which attached notes are protected (a boss or enemy note the question did not name, on a turn whose
spoilers are covered), and marks them; the block shows "Boss note (spoiler)" for a marked note until
opened on purpose, live, finished, or in a saved chat, reusing the same names the answer, thinking and
branch menu already use. (2) the screen's own "you already asked about it, so don't hide it" rule could
open a cover by matching shared words between the question and the cover's own restatement, even when the
question never contained the actual name — so a description-only question could still see the name in
the answer, Copy, and Read aloud. Fix (commit `9a557a9c`): the screen now reads the same per-turn
protected names the back end marks, and never opens a cover naming one of them through the word-overlap
rule; the back end's own "asked about" value now counts only when the question actually contains it. Both
fixes proven by breaking them: marking off fails the marked-note tests, the protected check off fails 4 of
the un-hide tests. **Deck re-check owed, row SPOILER-COVER-01, A2's own re-check text:** the same
described-boss questions, watched live and in the finished answer, the notes block, Copy and Read aloud.

**New open question for the maintainer, not fixed this wave:** Show details' own sources credit line
still lists a protected note's real name, so a boss's name is readable there after a deliberate press on
Show details, with no warning that it is a spoiler. Filed as an open question, not a bug, since pressing
Show details is itself already a deliberate choice to see more — see the Features list.

**Seen again 2026-09-26 (plan 70, flow L6):** on the same Hollow Knight described-boss answer, covered
correctly on screen, Show details' own sources list read "Hollow Knight — Soul Master" in plain text
underneath. Same open question, not a new one; the maintainer's call above already covers it.

**Re-confirmed again 2026-09-26 (plan 70, flow L6):** the same Hollow Knight described-boss question,
watched every 250 ms across 184 reads over about 45 seconds while the cover was still arriving: no notes
block appeared at any point, though the saved turn does list the attached note once it finishes; the
protected name never showed anywhere on screen. Evidence `docs/test-evidence/plan70-L6-NOTES-ARRIVING.json`.

**The model's own thinking can leak the same way, fixed 2026-09-26 (plan 70, helper A, commit
`4b975316`).** Measured live on the Deck (THINKING-SPOILER-01): the live thinking line, and the saved
reasoning shown in the fold afterwards, both named a protected boss in plain words in 4 of 6 tries, plus
raw fence marker text twice (the model's own thinking quoting its instructions' fence syntax back at
itself). Thinking is drawn as plain text, never markdown, so a fence would not have hidden anything
there anyway — this blanks the sentence that names a protected thing instead, replacing it with
"[hidden]", and strips any raw fence marker on sight. Wired into both the live thinking line and the
saved reasoning shown in the fold and the "Show details" panel. Proved by breaking the redaction on
purpose: 3 named tests failed as expected, restored afterward. **Deck re-check owed:** the same 6-try
described-boss setup — no protected name in plain words in the live thinking line or the saved reasoning
fold, and no raw fence marker text.

**Passed on the Deck 2026-09-26 (plan 70, flow L3), name rule, closed.** Across six fresh described-boss
tries, no protected name showed in plain words anywhere in the live thinking line or the saved reasoning,
live or opened; "[hidden]" appeared in all six. **Not part of this row, folded into the "live thinking
line shows the model's own rule checklist" idea instead:** single inline backtick marks around a quoted
tag (like `` `<bonsai-status>` ``) or a note title showed in the live thinking and the opened reasoning in
3 of 6 tries. These are not a spoiler fence and name nothing protected — the model is quoting its own
instructions back at itself, the same family of "thinking shows its own rule checklist" already on the
roadmap, not a new spoiler leak. Evidence `docs/test-evidence/plan70-THINKING-SPOILER-01-try2.json`.

**A third leak found 2026-09-26 (plan 70, flow L2): the suggestion menu itself can name a protected
boss.** Beside the live-text and thinking leaks above, the branch menu's own question line under a
Hollow Knight answer read "Are you currently struggling with the Soul Master's movement or damage
output?" in plain view, fully visible, not inside any spoiler element — even though the player's own
question never named the boss. The menu's question and its buttons are drawn straight from the model's
own words and never ran through the spoiler cover, because fencing a button would just print backticks
on it instead of hiding anything. Screenshot `plan70-NO-CLOSE-MATCH-HK-02-menu-names-boss.png`. Evidence
`docs/test-evidence/plan70-NO-CLOSE-MATCH-HK-02.json`.

**Fixed 2026-09-26 (plan 70, helper A, commit `7c93d5e8`).** When a cover is owed this turn, a protected
name inside the menu's question or any button's own label is swapped for a neutral phrase ("this boss",
or "the boss" when the sentence already carried "the"/"a"/"an" — a naive substitution first tried made
"the Soul Master's" into the double-article "the this boss's"). This is the only place the menu is ever
built, from the finished reply only, never a partial one, so the same fix covers both the live poll and
the saved turn. Proved by breaking the substitution on purpose: 4 named tests failed as expected,
restored afterward. **Deck re-check owed:** the same Hollow Knight spell-casting-boss question as row
NO-CLOSE-MATCH-HK-02, watching the suggestion menu's own question and button text as well as the answer
itself.

**Passed on the Deck 2026-09-26 (plan 70, flow L5.1), closed — the whole family, four rounds.** Two
watched Hollow Knight questions each named Soul Master, one three times over. Across 229 changed reads
(spanning the two answers, roughly 45 and 44 seconds of streaming each), the name never once showed
outside a closed cover — not in the answer, not in the live thinking line, not in the notes block, not in
the suggestion menu. The cover itself read "Spoiler — tap to show" from the very first read that had any
answer text at all, not a flicker through an unfinished state first. None of the earlier leak's own
signatures came back: no raw backticks or "-spoiler" in the answer (a few backtick reads did show, but
only in the model's own live thinking text, quoting its instructions back at itself — not a leak, the
same family as the rule-checklist idea), no "Code block incoming…" chip, no doubled "boss boss" wording,
no garbled repeated sentence. The notes block: while the cover stayed closed, no block appeared on screen
at all, at any read, in either try — so the name never showed there either, though this also means the
neutral "Boss note (spoiler)" title was never actually put on screen to read, since nothing was showing
to have a title. Pressing A on the cover opened it, and the block then read "Boss note (spoiler)" until a
further A opened the block itself to the real note; closing the cover put the neutral title back.
Switching to a different chat and back kept the cover closed with no block, as it should. Copy gave
"[Spoiler hidden — reveal it on screen to copy]" while closed, the plain text once the cover had been
opened, never the name while it was still hidden. Read aloud said "A spoiler is hidden here," then the
plain sentences that followed, never the name. **Control, to confirm nothing over-hides:** the same
question with the boss named outright ("how do I beat soul master") answered in plain text throughout,
no cover, notes block titled with the real name from the moment it appeared. Evidence
`docs/test-evidence/plan70-L5-SPOILER-COVER-01.json` (+ screenshots).

**The four-round story, in order:** (1) the safety net itself, built to cover any protected name a
finished answer used that the question did not type — right on finished answers from the start, but not
on live, streaming ones. (2) Two live-leak fixes the first time this was checked on the Deck: a fence
marker glued to running prose was not recognised as a real cover (fixed, but did not hold on a second
Deck check), and, once that second failure was investigated, the real cause turned out to be the
screen's own reveal assuming an answer's text only ever grows at the end, when the safety net can rewrite
text it already sent to wrap a late-arriving name — fixed together with two further risks the same
investigation found (the notes block naming a boss too early, and a cover that could be opened just by
echoing the question's own wording). (3) This flow L5 Deck pass, which found none of the old symptoms
left across two fresh, real questions, in every place a name could have leaked. Closed.

### Trimmed from "Headline first: every answer opens with one line that stands alone"

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Clear cache cleared the screen but not the session

- ★★★ `[chat]` **Clear cache cleared the screen but not the session** — **VERIFY.** Fixed and confirmed 2026-08-27, and again on the
  Deck 2026-09-03. The orphan half is measured: the chat stays behind after a clear, so each clear-and-reask cycle leaves one more
  chat in the rotation — a follow-up, not a regression. Only the mid-generation half is still owed: clearing while a reply is still
  being written (unit-tested, not reproducible by hand yet). Row **CLEAR-CACHE-01**. **Tried on the Deck
  2026-09-18:** the D-pad walk from Ask to Clear cache took about 48 seconds and the reply finished in 43, so
  Clear landed on an already-finished answer, not a mid-answer one. Next try: switch tabs with the shoulder
  button and use a slower Deep-thinking question. Evidence
  `docs/test-evidence/plan61-CLEAR-CACHE-01-midanswer.json`. **Tried again on the Deck 2026-09-18, still
  BLOCKED:** using the shoulder button to switch tabs got to Clear cache in 63 seconds, but the reply (a
  slower, high-thinking question) had already finished at about 50 seconds, so Clear again landed on a
  finished answer, not one still being written. Clear itself worked cleanly: an empty transcript, and a fresh
  question started a clean session. Two tries tonight, both too slow to catch a reply mid-write. What is
  needed next is a reply that takes longer than about 70 seconds — a running game, or the sixty-tip question
  from SOFT-PREDICT-01 — or the maintainer's word to close this half as covered by its unit test instead.
  Evidence `docs/test-evidence/plan61-CLEAR-CACHE-01-midanswer-retry.json`.
  [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Soft reply-length cap and thinking budget

- ★★★ `[reply]` **Soft reply-length cap and thinking budget** — **VERIFY.** Shipped 2026-08-10. **01, 02 and 03 all pass:**
  02's empty continue stops quietly (automated); **01 and 03 confirmed on the Deck 2026-09-17** — a long five-part reply
  read with no seam and the `Continuing…` cue never showed live or saved (01); stopping partway kept the partial text
  with a `Stopped — partial answer kept.` notice (03). Evidence `docs/test-evidence/plan57-QA-SOFT-PREDICT-01.json`,
  `docs/test-evidence/plan57-QA-SOFT-PREDICT-03.json`. **SOFT-PREDICT-05 passed on the Deck 2026-09-18:** run on
  gemma4:e2b-it-qat (the Deck's real thinking-capable model; no other thinking model is installed) with Thinking
  Off, a full visible reply came back, no empty reply. Evidence `docs/test-evidence/plan61-SOFT-PREDICT-05.json`.
  Left: **SOFT-PREDICT-04** (a continue mid-menu in Strategy) — **tried 2026-09-18, blocked:** the long Hades
  walkthrough question came back as a short spoiler-careful refusal, so no reply reached the length wall.
  Evidence `docs/test-evidence/plan61-SOFT-PREDICT-04.json`.
  [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

### Trimmed from "A chat that is still writing does not look busy from another chat"

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

**One clean try on the Deck 2026-09-23, MEASUREMENT — did not appear:** with a log captured for the whole
switch, the first chat's dot read "pending" the moment the switch happened and turned green right when
the log showed the answer finishing; the whole answer was there on switching back. Two caveats: the
switch happened only about 5 seconds after the first words appeared, a shorter window than earlier
sightings, and the app log itself wrote nothing new in the seconds around the switch. **Stays open** —
seen three times before, so one clean try is not enough to close it; the maintainer's call. Evidence
`docs/test-evidence/plan64-BUSY-DOT-01.json` (+ screenshots).

### Trimmed from "The open tab strip redrawn: six equal cells, one icon family, only the current tab named"

- ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab named** —
  **VERIFY, landed 2026-09-17.** Six equal cells with one 22px icon each, only the current tab named, in the
  accent colour; the strip is taller (66px) so the chat row's row of dots no longer shows under it. Built in
  commits `6821f20`, `ef4a851`, `18be399`, `0378024`, `044acab`, `a957165`. **Deck run 2026-09-18: rows 01, 02,
  04, 05 and 06 all pass; 03 is captured and waits on the maintainer's own look; 07 failed and is filed as its
  own Bugs entry, above.** The free-play sweep has run once (the after-finished half); the streaming half is
  still owed. [Plan](archive/59-tab-strip-redesign-build.md) ·
  [Design](design/handoffs/tab-bar-open-strip/return-2026-09-16/).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Attaching a screenshot crashed the model once

Long version of the roadmap entry. Moved here 2026-09-25 by the plan 70 bookkeeping pass; the roadmap keeps
the short summary and the decision.

**First sighting, 2026-09-23.** A 2.6 MB screenshot attached to a question; after 14 seconds the reply said
"Ollama returned an incomplete stream". The Deck's own system log shows the model's process crashed with a
graphics-chip error ("ErrorDeviceLost") and wrote a crash dump. Ollama recovered on its own and later
questions worked. **Crashed again 2026-09-23, 2 of 2 with the same 2.6 MB PNG:** the same graphics-chip
error, the same "incomplete stream" message after about 14 seconds, and Ollama answering again about 10
seconds later. Evidence `docs/test-evidence/plan64-THINKING-05.json`,
`docs/test-evidence/plan64-SCREENSHOT-CRASH-try2.json`.

**Cause found 2026-09-23.** A smaller picture (a 1280×800 JPG, 177 KB) answered normally in 49.7 seconds
with a correct description of the screen; the crashing file is a 1920×1080 PNG at 2.6 MB. bonsAI only
shrinks a picture before sending it when the Pillow image library is present, and Pillow is not installed
on the Deck, so the full-size file goes to the model untouched. Evidence
`docs/test-evidence/plan64-SCREENSHOT-CRASH-small.json` (+ `.png`).

**Three ways to fix it were put to the maintainer:** ship the image library with the plugin, shrink
pictures some other way, or refuse pictures over a size limit with a message. A measured comparison backed
the second option: the unshrunk crash picture was a 2.6 MB file, 3.6 MB once packaged for sending; shrinking
it with `ffmpeg`, already on the Deck, brought it to 86 KB, 114 KB sent, in 0.2 seconds, still fully
readable. The Deck's own picture library was tried too, but it cannot be loaded inside Decky's own, older
Python, so using it would mean shipping a separate program instead. [The measured comparison and size
table](test-evidence/plan64-SCREENSHOT-SHRINK-COMPARISON.md).

**Why this only showed up that night:** the fallback that sends a picture untouched has worked this way,
unchanged, since 2026-04-13; that picture was the first large, barely-compressed one ever attached — a
screenshot taken while the Deck was plugged into an external monitor, about six times bigger than anything
sent before.

**The maintainer's decision, 2026-09-25 (D112):** shrink with `ffmpeg`, and refuse a picture with a message
if the shrink itself ever fails. Planned in plan 70.

**Fixed 2026-09-26 (plan 70, helper J, commit `c625a03b`).** `ffmpeg` now does the shrinking whenever
Pillow is missing: it scales the picture down to the same Low/Mid/Max longest-side limit Pillow already
used and re-encodes it as a compact JPEG. A picture already small enough is sent as it is. If `ffmpeg` is
missing, the shrink fails, or it times out, the picture is refused with a plain message instead of
sending the full-size file that caused the crash. Tests built against a fake `ffmpeg` (the exact command
line the code runs) cover a successful shrink, a shrink failure, a timeout, `ffmpeg` missing, and an
already-small picture passing through untouched; the fix was broken on purpose first (reverted to the
old raw-bytes fallback) and confirmed exactly two tests catch it, then restored.

**Could not run on the Deck 2026-09-26 (plan 70, flow L1).** The rig's own screenshot chord (Steam+R1)
took no picture, tried twice, so the fix has not yet been checked with a real attachment. Retried in
flow L2 with a workaround file. Row **SCREENSHOT-SHRINK-01** stays Deck check owed.

**Passed on the Deck 2026-09-26 (plan 70, flow L2), closed.** The workaround file (the same 2.6 MB
picture that crashed the model twice on 2026-09-23) was attached again: the answer came back normally
in 38.9 seconds, nothing in the Deck's own log about a graphics-chip error, and the request actually
sent measured 107,526 bytes against 3,667,775 bytes for the same file before the fix — 34 times
smaller. The row's own wording asked for a log line as well, but the shrink writes nothing when it
succeeds, so the row was reworded to judge by the size of the request sent instead. Evidence
`docs/test-evidence/plan70-SCREENSHOT-BIG-L2-1b.json`.

## Opening "N earlier" floods a long chat with rows

Reported by the maintainer 2026-09-25, from a Deck capture taken at 23:03 that night during plan 68's
Deck pass (the file is in the untracked screenshots folder, DeckCapture_20260925_230318_game.png).

**What a person sees.** A long chat keeps its older turns folded behind one line, "42 earlier". Open it and
every one of those questions comes back as its own row, one after another: in the parrying chat that is 42
near-identical one-line rows ("What are good early weapon upgrades for th…" four times running), filling the
whole chat area and pushing the newest answer far below. Walking past them with the D-pad is one press per
row. There is nothing between "all folded" and "all open".

**Why it matters now.** Plan 68 lets a chat grow without losing its memory, so chats will get longer, and
this list grows with them (a chat keeps up to 200 turns).

**Options to draw before anything is built** (the house rule: a drawn comparison at true size, not a list):

- Open the earlier turns a few at a time — the newest five, with "N more" above them.
- Group them: by game, or by day, each group one line that opens on its own.
- Now that a chat sums itself up, fold everything the summary already covers behind one "Summed up" line
  that shows what the AI remembers, and list only the turns after it. (D118 call 15 turned down a summary
  card at the top of the chat as the way to *tell* a person the chat had summed itself up; this would be a
  way to *find your way around* a long chat, a different job.)
- A short filter line at the top of the opened list, to jump to a question by a word in it.

**Connected:** plan 68 (the chat sums itself up); "Give the reclaimed height to the transcript", since the
chat area is small to begin with on the Deck's own screen.

### Trimmed from "Summing up offers a fresher title"

**Before building.** A desk test of the instruction wording on the real chats, the way plan 68 tested its
summary wording: does the AI say "keep" for a title that still fits, and suggest something short and plain
when it does not? And the maintainer's calls on three things: whether an *automatic* summary (the one that
happens on its own before an answer) may also offer a title, or only the button; where the offer sits (on the
summary card, or as its own line under the button); and whether a title the person has renamed by hand is
ever second-guessed.

## Spoiler-risk band fixes

Long version of the roadmap entry. Moved here 2026-09-26 to keep the roadmap under its size limit.

**Cause 1:** every question got a flat score bump from its Ask mode, so a troubleshooting question with
nothing else to weigh still landed on "med" — troubleshooting questions now skip that bump. **Cause 2:**
a "Starting out" note could be picked as the named entity, since its title ends in the game's own name —
such notes are now skipped when matching. Both halves fixed 2026-09-26 (plan 70, helper M, `804bd004` +
`f14de761`). **Not fixed:** a game's own name can still count as naming a note in general. Evidence
`docs/test-evidence/plan70-SPOILER-RISK-CHIP-01.json`.

**Partly re-checked on the Deck 2026-09-26 (plan 70, flow L2, helper M).** A "my game is crashing"
troubleshooting question now reads "low", as the fix intends. But "my deck fan gets very loud while
idle" still reads "med" — the word list this fix skips the bump for does not cover a hardware-wear
question with no crash-shaped word in it. The named-entity half: a final Hollow Knight boss fight with
no note of its own no longer names "Starting out in Hollow Knight" (the fix working), but now names
"False Knight" instead — a different wrong boss, since there is still no note for this fight. Evidence
`docs/test-evidence/plan70-L1-8-HELPER-M.json`.

**Both gaps closed 2026-09-26 (plan 70, helper M).** **Named entity, commit `679452e5`:** excluding the
one onboarding note was not the whole fix — Hollow Knight is both the game's own name and its final
boss's name, and the word "knight" in the game's name alone was enough to satisfy a different note's own
shortened-name check ("False Knight" shortens to "Knight"). The resolved game's name is now cut out of
the question before either matching pass runs, so a question that merely names the game is never read
as naming a note just because that note's title contains the game's own name. The exact worked question
now names nothing at all — the safe direction, since a missed name over-protects rather than a wrong one
under-protecting something nobody asked about. **Spoiler band, commit `7b2bc753`:** "my deck fan gets
very loud while sitting idle" got a troubleshooting tip attached (the knowledge-base search itself routed
it to the shared tip sheet), but still read "med" because the troubleshooting check was a fixed word
list that question does not match. This turn's own routing decision is now read alongside the word list,
not instead of it — either one being true counts as troubleshooting. Both evidence questions from the
same Deck pass now read "low". **Re-checked on the Deck 2026-09-26 on build `8c4e0e4f`: both PASS** —
`docs/test-evidence/plan70-L3-3-NAMED-ENTITY.json`, `docs/test-evidence/plan70-L3-3-SPOILER-BAND.json`. Closed 2026-09-28.

## Model size fix and re-check

Long version of the roadmap entry. Moved here 2026-09-26 to keep the roadmap under its size limit.

A 17 GB model said it would free "< 0.1 GB" — the screen only asked sizes for its own bundled catalog.
**Fixed 2026-09-26 (plan 70, helper I, commit `86a148a7`).** An already-installed model's size now comes
from the Deck's own Ollama first (`GET /api/tags`, which already reports every installed model's real
size); the online library is only asked about a model not yet installed, which is still the right
question for "how big would this be to pull." **Deck re-check owed:** with the note-search model (or
any model outside the built-in list) installed, its size must show a real number, not "?", and must stay
after live sizes load; the header must count it. Row **ROUTING-MERGE-SIZE-02**, replacing
**ROUTING-MERGE-SIZE-01** (the Deck result that found this, evidence
`docs/test-evidence/plan70-ROUTING-MERGE-SIZE-01.json`).

**Passed on the Deck 2026-09-26 (plan 70, flow L3), closed.** Across four opens of the AI models screen,
the header always started at "Installed 2 · 4.3 GB" (offline sizes), then settled on "Live catalog ·
Live sizes" after 2.1 to 2.4 seconds — the note-search model reading "0.3 GB", the answer model "4.0 GB",
the header total "4.3 GB", matching Ollama's own reported sizes (4.04 + 0.26 GiB) — and stayed that way.
Small note, kept open as its own tiny item rather than reopening this bug: for the first ~2 seconds of
every open, before live sizes arrive, the note-search model still shows "?" under "Offline sizes"; the
owner judged that short a gap does not count against the row. Evidence
`docs/test-evidence/plan70-ROUTING-MERGE-SIZE-02.json` (+ screenshot).

## Filters panel focus bugs

Long version of two roadmap entries. Moved here 2026-09-26 to keep the roadmap under its size limit.

**The ring-on-a-filter bug.** Found on the Deck 2026-09-23 (flow H) and again by the plan 65 Deck check
2026-09-24: once, Manage AI models… opened with its Filters panel already open and the ring already on
"Open source only (recommended)"; separately, the ring landed one press away from changing a licence
filter — both times with nothing pressed to put it there. Evidence
`docs/test-evidence/plan64-PRELOAD-01-try3.json` (+ screenshot `plan64-PRELOAD-01-try3-filters-open.png`).
Planned in plan 70.

**Measured 2026-09-26 (plan 70, flow L2 + 2c), a reliable trigger found.** Opening through "Manage AI
models…" reproduces it every time (3 of 3) — the screen opens with the Filters panel already open and
the ring on "Open source only (recommended)". Opening through "Browse models…" never does (0 of 13),
whatever way the screen was last closed. Both buttons open the same screen; the difference is which
button opened it. Evidence `docs/test-evidence/plan70-RING-ON-FILTER-2c1.json`
(+ screenshot `plan70-RING-ON-FILTER-manage-open1.png`).

**Fixed 2026-09-26 (plan 70, helper I, commit `3ac00226`).** The two buttons open the same screen
through the same `initialSection` prop ("policy" vs "browse"); "policy" carried a leftover shortcut from
before the licence pick moved into the Filters panel, forcing that panel open and handing it the ring.
Removed: both routes now open plain Browse, panel closed, the ring on "Advanced ›". Added a focus-graph
anti-pattern entry for the shape (a route-specific flag pre-opening a sub-panel and moving the ring into
it before anything was pressed). **Deck re-check owed:** row **RING-ON-FILTER-2c2** — open through both
"Manage AI models…" and "Browse models…" and confirm both land on "Advanced ›" with the panel closed.

**Passed on the Deck 2026-09-26 (plan 70, flow L3), closed.** Three opens through "Manage AI models…"
and one through "Browse models…" all landed on "Advanced ›" with the Filters panel closed and nothing on
screen changed underneath (the same "2 on" filters read the same before and after). Evidence
`docs/test-evidence/plan70-RING-ON-FILTER-2c2.json`.

**Note on B, 2026-09-26:** with the Filters panel open, B does two different things depending on where
the ring is — on the Filters button, B closes the whole screen; inside the panel, B only folds the panel
and puts the ring back on the Filters button. Worth knowing when reading any walk through this screen,
not itself a fix to make.

**A second, related bug in the same screen: the D-pad cannot reach Done or the model list with the
Filters panel open.** Found on the Deck 2026-09-26 (plan 70, flow L2), being fixed (helper I). Row
**HUB-EDGE-01** (filters-open half). Walking Down through the filter choices stops at "Close filters"
and goes no further, even though Done is visible on screen the whole time; the third licence choice
("Any installed model") is never reached either direction. Walking Up out of the open panel folds it
shut by itself, as a side effect. With the panel closed, the same walk reaches Done and back with
nothing skipped. Evidence `docs/test-evidence/plan70-HUB-EDGE-01.json` (+ screenshot
`plan70-HUB-EDGE-01-panel-folded-after-up.png`).

**Fixed 2026-09-26 (plan 70, helper I, commit `6355eb9a`).** "Close filters" is the panel's own last
stop, not the whole screen's — its `onMoveDown` was unconditionally returning `true`, which claims every
further Down press forever instead of handing the move back to Steam. The model list's own last row a
few lines above it in the same file already does this correctly (returns `false`, so Steam carries the
ring on to the dialog's footer); "Close filters" now does the same. **"Any installed model" never being
a stop is by design, not a bug:** that row is deliberately disabled until the Tier 3 unlock switch in
Advanced is turned on, which existing tests already pin — a re-check with the switch on would confirm it
becomes a real stop then. Added a matching focus-graph anti-pattern entry. **Deck re-check owed:** row
**HUB-EDGE-02** — with the Filters panel open, walking Down must reach Done (or the model list) instead
of stalling at "Close filters".

**Passed on the Deck 2026-09-26 (plan 70, flow L3), closed.** With the Filters panel open, walking Down
28 presses reached Done cleanly (no longer stuck on "Close filters"), every stop visible, and walking
back Up returned to the top with no cycling; the model rows themselves are still not on the path while
the panel stays open, which the row does not require. Walking Up out of the panel still folds it shut by
itself, unchanged. Saved walk `checks/plan70-HUB-EDGE-02.json`, evidence
`docs/test-evidence/plan70-HUB-EDGE-02.json`.

### Trimmed from "Flow 2b bugs"

Long version of seven roadmap entries found or sighted during plan 70's flow 2b + 2e D-pad walks
(2026-09-26). Moved here to keep the roadmap under its size limit.
**Walking down a reply and walking back up visit different stops.** Re-measured on the Deck 2026-09-23:
with the details panel both closed and open, going down visits the question row and the question box,
but going up skips both and stops instead on Attach screenshot and Choose AI character; everything else
matches. A 22-line answer section shows only a third of itself on landing because the question box
covers it — expected for a section taller than the screen, not a new fault. Row
**REPLY-STOPS-MIRROR-01**. Evidence `docs/test-evidence/plan64-REPLY-STOPS-MIRROR-01.json`.

**Sighting 2026-09-26 (plan 70):** a branch menu's two buttons were reachable walking Down from above,
but walking Up from below skipped both. Evidence `docs/test-evidence/plan70-CHAT-HEADER-CAPTION-01.json`.

**Sighting again, 2026-09-26 (flow L1):** walking Up, the question row was skipped, same as before.

**Confirmed 2026-09-26 (plan 70, flow 2b), same shape as the branch menu above:** Up from Helpful skips
the branch picker between the answer and the Helpful row, straight to the last answer section (seen 4
times); Down from the Copy icon also skips the same picker, straight to Helpful (seen 3 times). The
picker is reached only walking Down from above it. Evidence `docs/test-evidence/plan70-REPLY-DOWN-01.json`,
`docs/test-evidence/plan70-MICRO-reply-actions.json`.

**Seen again 2026-09-26 (plan 70, flow L5.4), same shape:** Up from Helpful skipped both the answer body
and the branch menu on the way back up.

**The ring is dropped again when an answer finishes, and the view jumps to its end.** FAILED on the Deck
2026-09-26 (plan 70, flow 2b.1), being fixed (helper F2). The 2026-09-23 fix no longer holds: in 3 of 4
tries, nobody held the ring once the answer finished, and within about 3 seconds the view slid to the end
of the reply, leaving the control 196 to 356 px above what was visible. A Down pressed within about half
a second of the finish still kept the ring in place. Row **QA-FREE-PLAY-01** in
[testing-manual.md](testing-manual.md), evidence `docs/test-evidence/plan70-QA-FREE-PLAY-01.json`
(+ screenshots).

**Fixed 2026-09-26 (helper F2, commit `f87a962c`), not a regression.** The 2026-09-23 fixes (keeping the
ring's control in view, handing the ring to the same answer section) only ever covered a ring inside the
answer. A ring on the question row above it had nothing to bring it back: when the answer finishes, the
whole "live" turn — Retry icon and question text included — is replaced by a new one under the turn's
own id, a case those fixes never touched. A small hook beside the answer-section restore now notices
whether the ring sits on the live question's Retry or its text, and once that element is gone, hands the
ring to the same stop on the header that now shows the finished turn. Proved by breaking the hand-over on
purpose: two tests that check the ring reaches the archived question's Retry, and its text, both failed
as expected, restored after. **Deck re-check owed:** the same setup as before — an answer finishing while
the ring sits on the question's Retry or text — confirming the ring now stays in view.

**Passed on the Deck 2026-09-26 (plan 70, flow L4.1), closed.** Six fresh questions, three with the ring
on Retry and three on the question text. In all six the ring never left its control from the moment it
was placed until 5 seconds after the answer finished — 0 focus changes, 0 empty-focus reads — and the
view stayed at the top with 155 to 704 px of answer still below. Saved walk
`checks/plan70-L4-QA-FREE-PLAY-01.json`. Evidence `docs/test-evidence/plan70-L4-QA-FREE-PLAY-01.json`
(+ screenshots).

**A preset chip loses the ring when its question changes underneath it.** Found on the Deck 2026-09-26
(plan 70, flow 2b.9), being fixed (helper F2). In the fade and static chip styles, when the single chip
swaps to a new question while it holds the ring, the ring is lost outright — nothing on the panel is
focused afterward. The decode style and the two-chip layout do not have this problem; the chip keeps the
ring through the swap there. Evidence `docs/test-evidence/plan70-PRESET-ONE-LINE-03.json` (+ screenshots).

**Fixed 2026-09-26 (helper F2, commit `42d6eb48`).** Decode style keeps one button per slot and only
changes its words; fade and static instead keyed the button by its own question text, so every swap
destroyed the button under the ring and put a new, unfocused one in its place. Fade had a second trap: a
chip fading out stops being a focus stop at all, so even a kept button would have lost the ring at the
start of each fade. Both styles now keep one button per slot like decode; in fade, a chip holding the
ring holds off starting its own fade until the ring has moved on. Proved by breaking each fix in turn:
static keyed-by-text again fails its own test; the fade hold switched off fails its test; a third test
confirms the hold does let go once the ring actually leaves. **Sighting, same Deck pass:** in fade style,
walking Up from the question box can skip a chip that is mid-fade. **Deck re-check owed:** row
**PRESET-ONE-LINE-03** re-check — hold the ring on a fade or static chip through a question swap and
confirm it stays.

**Passed on the Deck 2026-09-26 (plan 70, flow L4.1), closed.** Fade: the ring stayed on the chip for a
full 22 seconds with its question unchanged; moving on to the box, the chip changed its question within
about a second and then held that question for 44 more seconds with no further change — reported as seen,
not a fail. Static: the ring stayed on the chip through the full 22 seconds, including the moment its
words changed at 9.1 seconds, and was still on it 25 seconds later after a second change. Evidence
`docs/test-evidence/plan70-L4-PRESET-ONE-LINE-03.json` (+ screenshots).

**The decode chip's typing caret is pale, not the accent green.** FAILED on the Deck 2026-09-26 (plan 70,
flow 2b.10), not fixed this wave. The caret is there and moves left to right correctly; its colour
measures about RGB 214,228,236, a pale white-blue the same as the settled letters, not the "green" the
answer-scramble colour setting names. A design check for the maintainer's own eye too, not only the
measurement. Row **PRESET-STREAM-ANIM-01** in [testing-manual.md](testing-manual.md), evidence
`docs/test-evidence/plan70-PRESET-STREAM-ANIM-01.json`.

**From the third question on, the waiting line quotes the follow-up reminder instead of the person's
question.** Found on the Deck 2026-09-26 (plan 70, flow 2b.1), being fixed (helper K), a regression from
today's follow-up fix. The line is meant to read "Model's warming up for '<the question you asked>'";
from the third question in a chat onward it instead read "Model's warming up for 'FOLLOW-UP CONTEXT (a
system reminder, not something the…'" — the hidden reminder text the follow-up fix now sends the model,
not what the player typed. The second question in the same chat still showed the question correctly.
Evidence `docs/test-evidence/plan70-QA-FREE-PLAY-01.json`.

**Fixed 2026-09-26 (helper K, commit `5fe0800a`).** The model still gets the reminder it needs — only
what gets shown back to a person changed. The saved `text_after_sanitizer` field (feeding Show details
and the desktop trace log) now uses the same clean text the search already worked from; every live
progress line and the live spoiler-cover check now read a new, clean `question_for_display` value instead
of the reminder-laden one. The saved turn header and the "first line quotes your question" opener were
checked too and never saw the reminder, so nothing there needed changing. Tests prove the exact reported
shape reaches the waiting line clean while the model still receives the reminder. **Deck check owed:**
row **KB-FOLLOWUP-QUOTE-01** — the same third-question setup, watching the waiting line and Show details.

**Passed on the Deck 2026-09-26 (plan 70, flow L4.1), closed.** Four follow-up questions in one chat, each
watched every 200 ms from before the press to after the answer finished — 0 of 407 reads showed "FOLLOW-UP
CONTEXT" or "system reminder" anywhere on the panel; every waiting line quoted the person's own words.
Side note: from the second question on, the model's raw "Thinking Process" notes show in the live
thinking area — not part of this check, folded into the thinking-checklist idea instead. Evidence
`docs/test-evidence/plan70-L4-WAITING-LINE-01.json`.

**D-pad Left on the chat row leaves the plugin for Steam's side rail.** Found and measured on the Deck
2026-09-26 (plan 70, flow 2b.12). From the first chat, a middle one, or the [+] button, Left moves the
ring off the chat row entirely, onto Steam's own Quick Access side rail (the Decky icon) — from a middle
chat, B there closes the whole Quick Access menu instead of the plugin. Right always brings the ring back
to the chat row. Expected: Left/Right move along the row itself, the same as LB/RB already do (which
slide the row's own chats and keep the ring). Evidence `docs/test-evidence/plan70-CHAT-ROW-LEFT-01.json`.

## L3 and 2d findings

Long version of four roadmap entries found during plan 70's flow L3 + 2d Deck pass (2026-09-26). Moved
here to keep the roadmap under its size limit.

**The troubleshooting hint's Dismiss button cannot be reached by D-pad.** FAILED on the Deck 2026-09-26
(plan 70, flow 2d.3), being fixed (helper F2). With all four permission switches off, a troubleshooting
question showed the hint with its "Open Permissions" and "Dismiss" buttons, but Dismiss could not be
reached: Right from "Open Permissions" did nothing, tried twice, and Up/Down from elsewhere skip the hint
row entirely — only Down from Show details reaches "Open Permissions" itself. Walking Up from the
suggestion chip also skips "Open Permissions"; the same fix should cover both. Row **PERMS-CLEAN-06**.
Evidence `docs/test-evidence/plan70-PERMS-CLEAN-05-06.json` (+ screenshot
`-hint-dismiss-unreachable.png`).

**Fixed 2026-09-26 (helper F2, commit `59d3d1c0`).** The hint row relied on `flow-children="horizontal"`
alone for Left/Right, which Steam does not honour (the chip row found the same thing on 2026-09-01); Up
from the ban-lookup row and from the chips went straight to the reply, past the rows in between; the
hint's own Down still aimed at the session context strip, which plan 62 removed. Now: the hint row claims
Left and Right itself and moves between its two buttons, holding still at either end instead of leaving
for the Quick Access rail; Down from the hint goes to the ban-lookup row when it shows; Up from the
ban-lookup row goes to the hint first when it shows; Up from a suggestion chip goes to the lowest
permission row first, then up through them, then the reply as before. Proved by breaking the fix: 5 of 8
new tests fail without it. **Noticed, then fixed the same day (helper F2, commit `74c28d5a`):** "Save
chat to Desktop" sat in a plain div row, so the chips' Up (which only ever hands the ring on through
Steam's own registered-row transfer) could never reach it. The button now lives in its own small,
registered row; the chips' Up tries it first, then the ban-lookup row, the hint, then the reply, in that
order; Down from the button goes back to the chips. Deck re-check owed alongside the rest of this fix.
**Passed on the Deck 2026-09-26 (plan 70, flow L6), closed:** walking Up from the question box reached a
suggestion chip, then "Save chat to Desktop" fully visible above the dock, then "Show details" of the
newest answer; Down walked back the same way. A on "Save chat to Desktop" opened its save dialog with the
ring on the name box; B closed it and returned the ring to the button. Evidence
`docs/test-evidence/plan70-L6-SAVE-CHAT-CHIPS.json`.
**Passed on the Deck 2026-09-26 (plan 70, flow L5.2), closed:** walking Up from the question box reached
the suggestion chip, then the ban-lookup row's "Open Permissions", then the hint's own "Open Permissions",
then Right to "Dismiss" and back; every stop fully visible. A on Dismiss removed the hint. **New, small:**
after Dismiss, nothing holds the ring until the next press. Evidence
`docs/test-evidence/plan70-L5-PERMS-CLEAN-06.json` (+ screenshot).

**Fixed 2026-09-26 (helper F2, commit `6116f33c`).** Dismiss removes the whole hint, the button the ring
was on included, and nothing handed the ring on — the same shape as the Helpful fix above. The ring now
moves to the row below (the ban-lookup row, else "Save chat to Desktop", else the chips). Deck re-check
owed.

**Passed on the Deck 2026-09-26 (plan 70, flow L6), closed:** two walks, both with permissions and the
ban-lookup row on screen. With the ban-lookup row present, A on Dismiss left the ring on that row's own
"Open Permissions". With only the hint on screen (a fresh chat, no ban-lookup row), A on Dismiss left the
ring on "Save chat to Desktop". Both fully visible. **New, small, seen along the way:** a dismissed hint
stays hidden only until Quick Access is closed and reopened — it then comes back, and the ban-lookup row
can reappear in a different chat too. Evidence `docs/test-evidence/plan70-L6-AFTER-DISMISS.json`.

**A screen test that opens the Filters panel failed once under load, passed alone.** Found 2026-09-26,
`PullModelsModal.filtersPanel.test.tsx`, timing-sensitive like read-aloud's. **Kept failing 2026-09-26,**
seen 5 more times in full test runs, always passing when run alone — being fixed (helper F2). **Cause
found and fixed the same day (commit `647dca4c`):** a real race, not a flaky test. Pressing Filters opens
the panel and moves the ring onto its first row; that move waited for the next animation frame and
assumed the panel had already been drawn. When the frame arrived first — a busy machine, or a press Steam
delivers outside React's own batching — the row did not exist yet, the move found nothing, and nothing
tried again. Never seen on the Deck itself. The four ring moves that follow a state change on this screen
(opening and closing the Filters panel, opening and closing "Type a name") now run in a layout effect
right after the redraw their own state change causes, instead of waiting for an unrelated later frame. A
new test forces the bad order on purpose and fails on the old code; the existing test is unchanged. A
focus-graph anti-pattern entry records the shape. **Deck re-check owed**, though the fault was never seen
there in the first place.

**Passed on the Deck 2026-09-26 (plan 70, flow L6), closed:** opening the Filters panel put the ring on
its first row 6 of 6 times, closing it with Up or with B both returned the ring to the Filters button 3 of
3 times each, and opening/closing "Type a name" worked 5 of 5 times — every stop visible. Evidence
`docs/test-evidence/plan70-L6-FILTERS-PANEL.json`.

**Older answers lose their "Was this helpful?" row after switching chats, leaving just the speaker icon.**
First sighted on the Deck 2026-09-26 (plan 70, flow 2d.7) while checking Read aloud on an answer from
before a plugin reload. Evidence `docs/test-evidence/plan70-READ-ALOUD-02-06.json`. **Seen again 2026-09-26
(plan 70, flow 4), this time after switching between two test chats rather than a reload** — an older
answer's Helpful row and its "Save chat to Desktop" button were both gone, the same shape twice now.
Filed as an open bug rather than a one-off sighting. Not yet measured closely enough to fix.

**Seen a third time 2026-09-26 (plan 70, flow L6):** "Save chat to Desktop" only draws when this
session has a last answer, so after switching chats it was gone (0 buttons) until a fresh question was
asked in that chat. Same shape again, still not measured closely enough to fix. Evidence
`docs/test-evidence/plan70-L6-SAVE-CHAT-CHIPS.json`.

**In Show details, the chip ladder only lets Up leave one chip at a time.** Sighted on the Deck
2026-09-26 (plan 70, flow L3/2d). Not yet reproduced on purpose; worth checking against the chip-ladder
bugs already on the roadmap (the ones about the chip row and its counter sitting above the visible area).
**Sighting 2026-09-26 (plan 70, flow L7):** walking Down from an opened notes block, the ring stopped on
this row of small labels and two more Down presses did nothing; closing and reopening the panel cleared
it. Evidence `docs/test-evidence/plan70-R4-try4.json`.

**Two confidently wrong answers, 2026-09-26.** Not yet reproduced on purpose. A Hades question answered
about "heat management", a mechanic Hades does not have. Separately, asked in Hollow Knight which boss
"waits past the crystal spike area", the model said it had no information on a boss with that name —
reading the description as if it were meant to be a literal title, when the very same area is correctly
answered (naming Soul Master) when asked a different way in the same session. Evidence
`docs/test-evidence/plan70-SPOILER-COVER-01-try2.json`.

**Picking a branch menu choice shows the model's own internal tag instead of plain words.** Found
2026-09-26 (plan 70, flow L5.4), being fixed (helper K). While the model warmed up after picking "Just
starting the campaign" under a Deep Rock Galactic: Survivor answer, the waiting line read: Waking the
model up for "[Strategy follow-up] I'm at: Just starting the campaign" in Deep Rock Galactic: Survivor… —
the internal "[Strategy follow-up]" tag shows to the person instead of the friendly "I'm at: …" wording
used elsewhere. Evidence `docs/test-evidence/plan70-L5-FLOW3-DRG.json`.

**Fixed 2026-09-26 (helper K, commit `2e13421d`).** The plugin's accept step already works out the
friendly "I'm at: …" caption once, to save on the chat turn; it now hands that same value down to the
waiting line and Show details too, instead of each one separately reading the raw internal text. The
model itself still gets the full text either way. Row **KB-FOLLOWUP-QUOTE-02**. Deck re-check owed.

## Flow 4 findings

Long version of two roadmap entries, re-investigated during plan 70's flow 4 (2026-09-26). Moved here to
keep the roadmap under its size limit.

**Once, the Show details line did nothing when pressed.** OPEN, found by the maintainer by hand on the
Deck 2026-09-23 (build `a224fb6`), after the Deck work ended. No details yet on which chat or when; the
maintainer does not remember whether they pressed A or tapped, or whether it was right after the Clear
confirm box or after switching chats. **Reproduction plan, to try all four combinations:** press Show
details with A, and separately by tap; try each once right after cancelling the Clear confirm box, and
again right after switching chats. Needs a Deck walk with the focus recorder before any fix — the session
thinks this is the same family as the tab-bar ghost entry. **The "after cancelling Clear" half is retired
2026-09-25 (plan 68):** that confirm box is gone, replaced by "Sum up this chat." The "after switching
chats" half still stands and can still be tried.

**Likely cause found 2026-09-26 (plan 70, flow 4.2), being fixed (helper F2).** Walked to Show details and
pressed A at once, right after switching between two test chats, 3 times: the press itself never failed —
the divider changed to "Hide details" and the ring stayed on it every time, settled within about 1.4
seconds. But on the one try measured for screen position, the opened details panel's own tab row ("This
answer | Session · 6") landed at y 617, below the dock's own top at y 600 — covered by a suggestion chip —
and the view did not scroll to bring it up (scrollTop unchanged). So on screen, the only visible change was
the divider's words switching from "Show details" to "Hide details"; the details themselves stayed out of
sight. Walking Down from "Hide details" reached the notes block and scrolled the view up 90 px, bringing
the tab row back into view. This is very likely the original sighting: a press that worked but looked like
it did nothing. Evidence `docs/test-evidence/plan70-F4-SHOW-DETAILS.json` (+ screenshot
`plan70-F4-SHOW-DETAILS-opened-behind-dock.png`).

**Fixed 2026-09-26 (helper F2, commit `bb36e334`).** Opening the details now scrolls them clear of the
dock, once per opening, instead of leaving them out of sight behind it. **Passed on the Deck 2026-09-26
(plan 70, flow L6), closed:** three fresh tries, including one right after switching between two chats,
each time the tab row and "Hide details" landed fully above the dock with no jump when walking Right onto
the tab row. Evidence `docs/test-evidence/plan70-L6-SHOW-DETAILS.json`.

**After pressing thumbs up on a reply, nothing holds the D-pad ring.** OPEN, found by the plan 65 Deck
check 2026-09-24.

**Reproduced 3 of 3 on the Deck 2026-09-26 (plan 70, flow 4.1), being fixed (helper F2).** Three finished
answers in one test chat, each with a fresh press of "Mark reply helpful": every time, nothing held the
ring afterward (no `gpfocus` anywhere, the page's own active element back on `BODY`) — the Helpful and Not
really buttons are gone, replaced by the words "Saved on this Deck", so the control the ring had been on no
longer exists. The next press does not recover from where it left off: Down or Left lands the ring on the
small "Read aloud" speaker icon at the right of the same row; B lands the ring on the tab bar at the top
(the panel itself stays open). The plugin's own log shows nothing about this — no error, no feedback line.
Evidence `docs/test-evidence/plan70-F4-THUMBS-UP.json`.

**Fixed 2026-09-26 (helper F2, commit `34bd9315`).** The ring now moves to the "Read aloud" speaker icon
in the same row once the thumbs are replaced, using Steam's own transfer rather than being left behind.
**Passed on the Deck 2026-09-26 (plan 70, flow L6), closed:** three fresh finished answers, each time the
ring landed on the speaker icon after Helpful; pressing "Not really" instead correctly kept the ring on
its own greyed button and Down reached the "What went wrong?" chips underneath. Evidence
`docs/test-evidence/plan70-L6-THUMBS-UP.json`.

## Branch menu template leak

**The branch menu still copies its own template, now with the game's name filled in.** Seen on the Deck
2026-09-25 under a Deep Rock Galactic Survivor answer: the choices read "A. <a place early in Deep Rock
Galactic Survivor>", a return of the no-game bug closed 2026-09-23, now with the title swapped into the
placeholder wording. Fixed 2026-09-25: a menu still carrying the brackets or that "a place early/later in"
wording is now dropped, whatever the title. Row **BRANCH-TEMPLATE-02**. Screenshot
`screenshots/DeckCapture_20260925_002145_game.png`.

**Passed on the Deck 2026-09-26 (plan 70, flow L5.4), closed:** with Deep Rock Galactic: Survivor running,
five branch menus in a row (boss, hazard plan, weapons, class, biome) read as real choices, no angle
brackets and no leftover template wording anywhere, including the follow-up turn after picking one. This is
one clean run, not proof by itself — the unit tests already landed are the proof — but it is the Deck check
this row was waiting on. Note for the maintainer, not a bug: the biome menu's option B, "Another specific
biome (e.g., Caves, etc.)", reads like filler, though it is not the old template text. Evidence
`docs/test-evidence/plan70-L5-FLOW3-DRG.json`.

### Trimmed from "Flow L6 findings"

Long version of five roadmap entries and two Half-Life 2 test results, found during plan 70's flow L6
Deck pass (2026-09-26, build `532b76f8`). Moved here to keep the roadmap under its size limit.
**In Show details' Session tab, Down from the last chip of the chip ladder does not move the ring.**
Sighted while re-checking the Show-details scroll fix: three presses of Down on "Chip 7 of 7" left the
ring exactly where it was. Up still works normally, stepping the ladder back from 7 to 1 before leaving
it. Not yet reproduced on purpose or measured further. Evidence
`docs/test-evidence/plan70-L6-SHOW-DETAILS.json`.

**B on the notes block sends the ring to the tab bar and leaves Show details open.** Sighted during free
play: pressing B while the ring was on the notes block moved it to the tab bar at the top of the panel,
rather than closing the details the way B closes other things on this screen. Not yet reproduced on
purpose or measured further.

**A typed command shows up later as a suggestion chip.** Sighted during the Half-Life 2 chip watch: the
text `bonsai:vac-check`, typed as a command earlier in the same session, later rotated through as one of
the suggestion chips, indistinguishable from an ordinary question. Evidence
`docs/test-evidence/plan70-L6-CHIP-ROTATION-01.json`.

**The Context line briefly read "no active game" right after reopening the panel over Half-Life 2.**
Sighted once during the chip watch, while closing and reopening Quick Access with the game still running;
the line then read the game's name correctly again. Not reproduced on purpose.

**Seen twice more 2026-09-26 (plan 70, flow R):** reopening the panel over Brotato read "no active game
detected" for under a second before correcting to "active game Brotato"; separately, launching Deep Rock
Galactic: Survivor right after Brotato read "active game Brotato" (the previous game) for about a second
before correcting itself. Still not reproduced on purpose. Evidence
`docs/test-evidence/plan70-R-R3-try2.json`, `plan70-R-R4-try2.json`.

**PHASE4-CHIPS-01 and CHIP-ROTATION-01, with Half-Life 2 running: FAIL.** Watched about 420 seconds
across three panel-open sessions plus a 150-second wait, 15 different chip labels in all. Only one of
them was a Half-Life 2 chip, "How do I beat Strider?" with its Tip mark, and it only showed for about 17
of those 420 seconds — right after each time the panel opened, then rotated away and did not come back.
So the corpus guarantee ("at least one of the running game's own chips always shows") did not hold, and
the chips never rotated to a second Half-Life 2 suggestion. Labels themselves fit their chip correctly, no
overflow. The maintainer's one-chip setting was on for this run, which leaves only one slot for the
guarantee to use — may explain both results; not re-tried with more chips on screen. Evidence
`docs/test-evidence/plan70-L6-PHASE4-CHIPS-01.json`, `docs/test-evidence/plan70-L6-CHIP-ROTATION-01.json`.

**KB-FOLLOWUP-QUOTE-02, re-checked: UNCLEAR.** The waiting line and the turn header both read the
friendly "I'm at: …" wording, and Show details' own "This answer" tab does too — all as fixed. But Show
details' separate "Session" tab still lists the raw "[Strategy follow-up] I'm at: …" line for the same
turn, alongside a second, clean copy of it. The model's own live reasoning also showed the raw
"[Strategy follow-up]" text for about five seconds, while quoting its own instructions back to itself
("Must *not* repeat the branch fence if the user starts with `[Strategy follow-up]`") — not as a leak of
the person's own words, but the same tag, readable. Whether the Session tab and the reasoning quote count
as "Show details on that turn" for this row is the maintainer's call. Evidence
`docs/test-evidence/plan70-L6-BRANCH-WAIT.json` (+ two screenshots).

**PRESET-ONE-LINE-04, decode half, with Half-Life 2 running: PASS.** Four eight-second windows of frame
timing while a chip both churned its decode animation and scrolled a long label: 60.0, 59.8, 59.8 and 60.0
frames a second, worst single gap 50 ms, no gap over that. Evidence
`docs/test-evidence/plan70-L6-PRESET-ONE-LINE-04.json`.

**CHIP-BUTTON-09, with Half-Life 2 running: PASS for the dot itself.** The Tip chip's small square dot
showed on every one of 9 reads it was on screen, 7×7 px, the character's own colour, before the label,
with no "Tip" word drawn — matching the design. Its "stays put while a long label scrolls" half could not
be seen: the only Tip label offered ("How do I beat Strider?") was short and never scrolled. Evidence
`docs/test-evidence/plan70-L6-CHIP-BUTTON-09.json` (+ screenshot).

**Reduced-motion box (b), re-tried with Half-Life 2 running: still UNCLEAR.** With reduced motion on,
about 210 seconds of watching (188 reads) found no crawling label and no scrambled letters — the pass
half holds — but every label seen fit its chip exactly, so the "cut off with an ellipsis" half still has
nothing to prove it on. Evidence `docs/test-evidence/plan70-L6-REDUCED-MOTION-B.json`.

## A read-aloud timing test fails now and then when the PC is busy

**Fixed 2026-09-26.** Failed 1 run in 11 under load, 0 in 12 idle; read-aloud itself was never broken,
only the test's own way of proving the read-ahead overlap (comparing two threads' timestamps against a
fixed slack, which could flip under load). Rewritten to hold both threads open on real events the test
controls and wait on those instead of guessing a delay — proven by running it 20 times with heavy CPU
load alongside it: 20 passes, 0 failures.

## Remove greys out once a model has answered a question, until the plugin reloads

**Fixed 2026-09-26 (plan 70, helper I).** Remove now only greys out while a request is actually in
flight, instead of staying disabled forever after a model's first answer. Evidence
`docs/test-evidence/plan64-PRELOAD-01-try3-timing.json`.

## The plugin log writes one false "non-loopback" connection failure right at start-up

**Fixed 2026-09-26 (plan 70, helper I).** The Ollama tab's first connection check ran before settings
finished loading, using the still-default, often-wrong host. It now waits for settings to finish loading
first. Evidence `docs/test-evidence/plan64-OLLAMA-TAB-AFTER-RELOAD.json`.

## The Steam ban lookup's report shows as raw text, not a table

**Fixed 2026-09-26 (plan 70, helper I).** The ban report was built as a markdown table, which the Deck's
own renderer cannot draw, so it showed up as one run-on line of pipe and dash characters. Each account's
facts are now written as a plain bullet line instead. Evidence `docs/test-evidence/plan64-VAC-03-06.json`.

**Could not run on the Deck 2026-09-26 (plan 70, flow L1):** no Steam Web API key is saved on the Deck,
and the runbook forbids setting one by hand — the one try got the plain "no key saved" message, not a
report to read. Needs the maintainer's own key; on their own checklist. Evidence
`docs/test-evidence/plan70-VAC-03-07.json`.

**Passed on the Deck 2026-09-27 (plan 70, flow L8), with the maintainer's own key.** The key was saved
into the plugin's settings on the Deck from the maintainer's private file, which git ignores; it appears in
no log and no chat file (checked without printing it). A real Steam report came back in under 2 seconds,
the account as one plain bullet line: no pipes, no runs of dashes, no table. The one long dash between the
account number and "VAC:" is ordinary punctuation, not a table row — the session's reading of the row's
"no dash characters". Evidence `docs/test-evidence/plan70-VAC-03-07-try2.json` (+ `.png`).

### Trimmed from "Flow L10 findings"

Long version of what plan 70's last three Deck blocks (flows L8, L9 and L10, 2026-09-27, just after
midnight to about 06:45) closed and found, and the helpers' landings between them. Moved here to keep
the roadmap under its size limit.
**Show details' credit line hides a hidden spoiler's source (helper R, `6d31bc1d`, `8bba1f00`) — passed on
the Deck.** On an answer that hid a spoiler, Show details' credit area reads "Sources hidden — open the
notes to see them" until that answer's notes block is opened; the Session tab's row follows the same rule.
If the answer attached a protected note but used no notes block, the credit line shows the note's neutral
title ("Hollow Knight — Boss note (spoiler)") instead. On the Deck, the Hollow Knight sanctum-boss question
came back with two covers, and "Soul Master" appeared nowhere on the page, Session tab included; once the
cover was revealed and the notes block opened, the credit line listed "Hollow Knight — Soul Master ·
hollowknight.wiki · CC-BY-SA-3.0", updating live. The Hornet question, meant as a control, also hid its
sources: a second boss it never named (the Watcher Knights) came attached behind "Boss note (spoiler) (+1
more)" — the rule working as the maintainer set it, not a fail. Left as is: the Developer tab's raw data
still names the note, only with desktop verbose logging on. Evidence
`docs/test-evidence/plan70-SPOILER-CREDITS-01.json` (+ 3 screenshots).

**The meaning-search hint clears by itself, and "Update knowledge base" says what it did (helper U,
`6885d5d7`, `03c8e25d`, `2644d5df`, `7c924310`) — passed on the Deck.** The flow-L9 run of R.5 found both
problems: the "Pull nomic-embed-text" hint stayed on the open Ollama tab after the model landed, and
Update showed and logged nothing (`docs/test-evidence/plan70-R5.json`). After the fixes: Update reads
"Checking for a newer version…" then "Already up to date (version 2026.09.26)." in 0.4 seconds, writes one
log line per press, and the ring stays on Update; the hint was gone 0.7 seconds after the download's
"success" line, and the next question read "Keyword + meaning". Update now waits as long as the back
end's check can take and never says "failed" early. Evidence `docs/test-evidence/plan70-KB-UPDATE-HINT.json`
(+ 4 screenshots); saved walk `checks/plan70-KB-UPDATE-row-walk.json`.

**The frame rate with a game running — partial.** The maintainer's target is at least 30 frames a second
in the panel while an answer arrives with a game running. Every number below is from Deep Rock Galactic:
Survivor on the Deck.
- **Before (flow L8):** thinking about 34–36, answer arriving about 11, whatever the decode effect was set
  to; the processor 96–98% busy; the game itself fell from 60 to 14–17 while answers arrived. With nothing
  running: 60 with the decode effect off, 48.6 with it on. Evidence `docs/test-evidence/plan70-FPS-baseline.json`.
- **Round one (helper S, `75c32ace`, `a0584bd2`, `f52e6822`, `49622e21`, flow L9):** with a game running,
  the answer's text updates about 4 times a second in small groups of words, and the small animations hold
  still during a question. Three long answers: answer-arriving medians 30.5, 31.4 and 26.0, pooled 30.2;
  thinking about 57. Each answer started near 37–40 and sank to 21–28 past about 1,200 letters. With
  nothing running: 58.5 decode off, 50.1 decode on — row **GAME-LIGHT-02** passes. Evidence
  `docs/test-evidence/plan70-FPS-after.json`, `plan70-FPS-after-partial.json`.
- **Round two (helper S, `521a090a`, `7ead9b06`, `453635d9`, flow L10):** an arriving answer is drawn piece
  by piece, so finished paragraphs are never redrawn. On the PC one update got cheaper at every length; on
  the Deck, drawing whole against drawing in pieces past 1,200 letters showed no clear gain (42.8|36.1,
  37.1|35.5, 39.1|36.8, 32.2|37.8, 28.9|29.5, 31.8|30.5), because the game and the AI take most of the
  processor there (the game 136–236% of a core, the AI 118–202%). Long answers of 2,077–2,933 letters, the
  decode effect off: medians 28.2, 37.4 and 40.6, pooled 36.0; 12 of 40 slices under 30, 11 of them in the
  first answer, started about 2.5 minutes after the game launched. The game's own frame rate during answers
  rose to 23–31. So rows **GAME-LIGHT-01** and **STREAM-PIECES-01** are partial: the pooled median passes,
  but not "at least 30 from start to end".
- **The decode effect kept with a game running (the maintainer's call, `4c7edeb6`, D112 item 19):** medians
  28.4 and 30.8, and 32.8 on the default build, dipping to 20–25 late in long answers; keeping it costs
  about 5–9 frames a second (side by side 38.9|47.7, 40.3|45.1, 33.8|41.2). Only the last few words decode;
  at about 4 updates a second the end of the line flickers then settles, and the text sometimes shrinks by
  1–5 letters for a moment. Row **GAME-LIGHT-03** passes, reworded to "the decode effect plays".
- **Formatting while arriving** matches the finished answer, within 2 pixels at the finish.
- **Next step:** a processor profile on the Deck taken mid-answer (`scripts/probe_deck_cpu_profile.py`), to
  see where the time goes before a third round. Evidence for L10: `docs/test-evidence/plan70-FPS-pieces.json`
  (+ 4 screenshots).

**New, open: with nothing running, the decode effect slows long answers (★★).** On a 2,945-letter answer,
about 37 frames a second with the decode effect on, falling from 45 at the start to about 30 near the end,
against about 50 measured on 1,100–1,500-letter answers. With it off, 58.2, easing to about 54 past 2,100
letters. Not yet known whether this is new or always so on long answers. Evidence
`docs/test-evidence/plan70-FPS-pieces.json`.

**New, open: Up from "Save chat to Desktop" jumps to the top of the turn (★★).** It lands on "Retry same
prompt", skipping the answer, Show details and the notes block, on both answers tried; Down from the top
reaches everything. Seen again in flow L10 from the question box, skipping Show details and the branch
choices. Evidence `docs/test-evidence/plan70-SPOILER-CREDITS-01.json`.

**New, open: reaching a spoiler cover by Up lands the ring on the section around it, and A does nothing
(★★).** Coming Down from "Show reasoning" lands on the cover itself, and A opens it. Evidence
`docs/test-evidence/plan70-SPOILER-CREDITS-01.json`.

**New, open, small (★), found by helper S while working, not fixed:** the suggestion chips keep rotating
and animating every 5.8 seconds while a question is answered; with thinking off, the waiting spinner can
spin through the whole answer, because nothing clears the waiting line when the answer starts (it now holds
still while a game runs); and the panel-height check rewrites a style value that has not changed
(`tabBodyViewport.ts` line ~27, via `useQamPanelHeightGuard.ts`), which may be behind the "ResizeObserver
loop completed with undelivered notifications" errors that piled up in the Developer tab during the game
runs — unproven. Also noted by S: the back end re-sends the whole answer on every check and may run its
live spoiler cover over all of it each time, a share of the AI's processor time not yet measured.

**New, open, small (★):** after removing the meaning-search model with the Ollama tab open, its hint does
not appear until the tab is reopened (it checks only when the tab opens); and when the Pull button
disappears, nothing holds the ring until the next press. Evidence `docs/test-evidence/plan70-KB-UPDATE-HINT.json`.

**New, open, optional (★ [KB], helper Q):** when a tip was found but cut for lack of room, "Not in my
notes" can still show on a covered game in Strategy or Expert, although the notes were never searched.
Old behaviour, visible now that the "No tip for this" line is gone.

**Sightings, not filed separately:** with a game running the plugin showed "answer took 64.6 s (>60 s)"
with an Ollama processor tip whose wording is garbled on screen; the Remove confirm box closed the Quick
Access panel; the model sometimes refuses long questions, especially ones with the word "manual". The
"Enable local knowledge base" chip and the follow-up-choices sighting (flow L7) are still open.

## A story game named while a no-story game runs lost its spoiler covers

Older dated notes moved here from the roadmap entry on 2026-09-30 (docs sweep 1, plan 78). Nothing was removed; the one change is that the call the second note says was awaited is now marked as answered.

**2026-09-30 (plan 77 block 3, build `ec557922`, row P77-SPOILER-OTHER-GAME):** FAILED on the Deck: three Hollow Knight questions with Deep Rock Galactic: Survivor running each came back with 0 covers; the control question stayed plain. No spoiler-profile log line appeared, so the other game's profile does not seem to be picked up. Back to fixing (helper J round 2). Evidence `docs/test-evidence/plan77-P77-SPOILER-OTHER-GAME.json`.

**2026-09-30 (plan 77 helper J round 2):** the landed change judges the turn as the story game, but that is not enough: the covers come from the notes, and the locked rule D19 makes the running game pick the notes, so a Hollow Knight question with Deep Rock running gets Deep Rock notes and no boss names to hide. Row P77-SPOILER-OTHER-GAME stays FAILED. **The maintainer answered on 2026-09-30 (D121 item 1, option (a)):** an exception to D19 for a no-story game running and a protected story game named. A proposed known-issue line is in plan 72 § 8.

**Entry text as it stood before the fix landed (moved here 2026-09-30, docs sweep 3, plan 78; nothing removed):**

  "How do I beat the boss in the Soul Sanctum in Hollow Knight, quick tips please" with Deep Rock Galactic: Survivor running came back with 0 covers, where with no game running it gets covers. Evidence `docs/test-evidence/plan77-BLOCK2-GAME.json`.
  Cause: the running game's spoiler rules decided the whole turn; Deep Rock Galactic: Survivor is a no-story game, so a Hollow Knight boss answer was told to use no covers and the screen opened any it drew. Now, when a no-story game runs and the question names a story game from the protected list, the turn is judged as that story game (it only adds caution; "spoilers are okay" still opens everything). Limit: the game's name must appear whole in the question.
  **2026-09-30 (the maintainer's call, D121 item 1):** option (a) chosen. When a no-story game runs and the question names a game on the protected story list, the named game picks the notes for that one question; a bare follow-up that names no game goes back to the running game's notes. The fix is owed (plan 78 helper A); row **P77-SPOILER-OTHER-GAME** (FAILED on the Deck 2026-09-30) is the check. Evidence `docs/test-evidence/plan77-P77-SPOILER-OTHER-GAME.json`. Older notes: [roadmap-details.md](roadmap-details.md#a-story-game-named-while-a-no-story-game-runs-lost-its-spoiler-covers).

## Down takes an extra press that only scrolls before reaching a section below the dock

Older dated notes moved here from the roadmap entry on 2026-09-30 (docs sweep 3, plan 78). Nothing was removed.

Entry heading as it stood: ★ `[focus]` **Down takes an extra press that only scrolls before reaching a section below the dock** — **PARTIAL, two of three extra presses fixed 2026-09-30 (plan 77 helper E round 2, `fb3cfb2d`, `05b59434`). Was OPEN, found 2026-09-29 (plan 77, Deck block 2).**

  On a Soul Sanctum answer with no game running, 3 extra Down presses (one per section) only scrolled the panel by 80 px and left the ring on the same box, whose top then sat 8 to 20 px under the header. Evidence `docs/test-evidence/plan77-P77-WALK-COVERS-MIRROR-FREEPLAY.json`.
  Down (and Up, mirrored) now lands on the next section in one press when the one it leaves is fully read.
  **2026-09-30 (plan 77 block 3, build `ec557922`):** two of the three extra presses are gone; one remains, on a short last section (60 px) before the non-answer rows. Down landed on it twice, the second press only scrolling by 80 px. Evidence `docs/test-evidence/plan77-P77-WALK-COVERS-MIRROR-R2.json`.
  **2026-09-30 (final smoke, build `2f72d658`):** seen again on a 90 px second section; every landing was inside the band and Up
  mirrored Down otherwise. After the release. Evidence `docs/test-evidence/plan77-P77-FINAL-SMOKE.json`.

**2026-09-30 (plan 78 helper D, `84cc0029`, `60592390`):** cause found. The walk asked whether the whole answer box was read, and the box has a 9 px frame (8 px of padding and a 1 px border) under its last section, so a last section sitting on the dock still had frame hidden and the next press only scrolled. The test setup had no frame, which is why last night's tests passed. The second commit fixes the same wasted press on a spoiler cover that has only its own 8 px margin after it. Row P78-DOWN-SHORT-SECTION is the Deck check.

## Answer quality, known issue: answers borrow each other's wording

Cause and measurement notes moved here from the roadmap entry on 2026-09-30 (docs sweep 5, plan 78), to keep the entry short. Nothing was removed.

  **Fixed, sighting 3 (`386a8706`):** a boss answer no longer produces a power suggestion. Cause: the Speed and Expert instructions show the AI the shape of a power suggestion on every question, the small AI sometimes copied it onto the end of a boss answer, and the plugin trusted any such block. It now also needs the words around the block to be about power. **Fixed, sighting 1 (`966180d2`, then `05855c05` which replaced its rule):** a question about a different game no longer reuses the previous answer's wording. Cause: the plugin shows the AI the first 400 letters of each earlier answer, and the small AI copies what it is shown (in one test run, 49 words of a Doom answer came back in a Black Mesa answer). Now the earlier answers are left out only when the new question names a game different from the one the previous turn was about; every follow-up still sees them. Measured on this PC's copy of the Deck's model: a boss question about a different game sharing a run of 8 or more words with the previous answer went from 4 of 54 to 0 of 54 in Speed mode and from 4 of 24 to 0 of 24 in Strategy mode; of 90 follow-up cases, 89 are shown exactly what they were shown before (the one that differs names a different game).

**Older notes moved here from the roadmap entry on 2026-10-01 (docs sweep 7, plan 78), to make room for the block 2 result. Nothing was removed.**

Deck check owed: row **P78-BORROWED-WORDING**. Unit tests: `tests/test_chat_memory_borrowed_wording.py` (12), `tests/test_tdp_suggestion_needs_power_talk.py` (6). No Deck run of the fix yet. Evidence for the sightings `docs/test-evidence/plan72-Z-FREEPLAY.json`.

**New sighting, 2026-10-01 (plan 78, Deck block 1, in the spoiler check, question 4):** a Deep Rock answer carried Hollow Knight wording ("soul orbs") from the earlier answers in the same chat. The fix only looked at a game named in the question, and that question named none. A further commit is owed (plan 78 helper I): the running game also counts as the new question's game. Evidence `docs/test-evidence/plan78-P77-SPOILER-OTHER-GAME-try2.json`.

## Plan 79 measurements of the maintainer's 2026-10-02 bugs

Full wording of the measurements whose short form sits on the roadmap Bugs entries (2026-10-02, plan 79). Nothing was removed.

- **Up and Down between the rating choices and the speaker button go to the wrong place:** Down from the speaker landed on "Bad info" the first time and on "Wrong game or topic" the second. "Helpful" and "Not really" can be reached only by Left; Up from any choice goes to the speaker or the summary note, never to them.
- **Down from "N earlier" stops on the question's Retry button before the question itself:** Down from the "84 earlier" button lands on Retry first, then on the question bubble. Up from the bubble lands on Retry on the way back to the button. Left from the bubble lands on Retry and Right returns to the bubble.
- **In the AI models box, going all the way down and back up leaves the top model half hidden:** After Down to the bottom and Up to the top, the first model row is still scrolled 41 px inside its list. The ring is left on Advanced, outside the list, and the list does not scroll back to the top when the ring leaves it going Up.
- **After picking a setting from the search list above the question box:** The routes: a pick from the Quick Access list and from the Steam Settings list; the on-screen keyboard opened and closed (the word itself was put in by the test script, so the typing route is only half done); B on a list row, and a pick then back and B. Down and Up moved normally with one ring each time. One side finding became its own entry (the ring vanishes when the list closes under it).
- **Moving through the Show details chips puts the ring on the whole block:** The box reaches down behind the question box to Ask; its place changes on every press, in both directions. The tabs row and the note card get a sensible box.
- **The highlight goes invisible on some tabs:** Ollama tab, no ring: Browse models, Install options, Test connection, Thinking Off, Manage AI models and the two try-order buttons. Settings tab, nothing drawn: Apply UI scale, Remember what I typed, the character picker, Clear cache; Save memory and Voice replies cannot be told from the chosen-value look. Developer tab, nothing drawn: Tab to open on, App activity logging, Preset animation, scramble time, letter colour; two more undecidable. Permissions and About looked fine. Every stop was fully visible in position.

### Trimmed from "When the length limit cuts a choice menu, the next part of the answer is lost"

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-09-30 (plan 77 block 4, build `7d84ee3b`, row P77-CUT-MENU-TEXT), UNCLEAR:** at a 300-token limit both long questions were cut twice and continued; no fence text or JSON in 248 reads; the screen and the saved chat agree letter for letter. But the model never reached its choice menu before the wall, so the exact case was not produced. Unit tests are the proof so far. Evidence `docs/test-evidence/plan77-P77-CUT-MENU-TEXT.json`.

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-10-01 (plan 78, Deck block 3c, build `24cbbd6b`), UNCLEAR, second session running:** four questions (two at a limit of 300, two at 340) never produced the case: no "dropped a choice fence" log line. The screen checks held on all 897 reads but prove nothing without the case. The edit to the installed copy was put back. Unit tests are the proof so far. Evidence `docs/test-evidence/plan78-P77-CUT-MENU-TEXT.json`.

## The game's own chip never came back, and the chips turned over too slowly

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  **2026-10-01 (plan 78, Deck block 1, build `57586da0`): both Deck rows passed.** One chip: 9.53 chips a minute (asked 8 to 10.5); two chips: 11.16 a minute with the closest two changes 2.49 s apart (asked: none within 2.3 s); a chip under the highlight ring did not change in 42.5 s. The game's own chips were 0.53 to 0.55 of all shown in all four styles, and two general chips never came back to back. With two chips (fade), in 46 of 430 one-second reads only the general chip was fully visible, because the game's chip was part-way through its fade; the session's ruling is that this passes, since the spot always holds one of the game's chips, and it is noted for the maintainer's own look. Evidence `docs/test-evidence/plan78-P78-TIP-CHIP-try2.json`, `docs/test-evidence/plan78-P78-CHIP-PACE-try2.json`.

Moved here from the roadmap entry on 2026-10-02 (docs sweep 3, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  Cause: three of the four chip styles dealt the game's chips only once, when the panel opened, and with one chip showing the promised game chip was put in a spot that is off screen. Now one rule decides which chip comes next in all four styles (one chip: after a general chip the next is the game's own, after a game chip the game's again one time in five; two chips: one of the two is always the game's own), and one rule decides how long a chip stays, with the chip count in it (one chip: about 7 seconds a turn where it was about 15; two chips: about 10 seconds in each spot; the two spots never change within 2.5 seconds of each other).
  The maintainer's calls: D121 items 9 and 10. Unit tests: the next-chip rule, the pace and the spacing, plus a seven-minute run of the real chip row in each style at one chip and at two. Deck rows **P78-TIP-CHIP** and **P78-CHIP-PACE**: both passed on the Deck 2026-10-01 (below). Still owed: the maintainer's own look at the pace (it is on their Thursday list) and their pick from the preview page.

### Trimmed from "After the quick start is opened and closed, the help chip stayed and the suggestion chips never took the row"

  **2026-10-01, 12:52 to 13:00 (build `f0a4f2c4`), UNCLEAR:** not run. On a Deck that has seen the quick start, removing the flag left an ordinary suggestion chip, and after a plugin reload the flag read "1" again; the only reset, "Clear all plugin data", is not allowed. The fix rests on its unit tests and on the maintainer's first-install check (after opening the quick start and closing it, the help chip is gone and the suggestion chips are back). Evidence `docs/test-evidence/plan78-P78-HELP-CHIP-DISMISS.json`.

### Trimmed from "Roadmap clean-up task: trim this file (done 2026-09-15)"

Moved here from the top of the roadmap on 2026-10-02 (docs sweep 3, plan 79), to keep the roadmap under its size limit. Nothing was removed.

**Clean-up task — trim this file. Done 2026-09-15.** The other four big documents each carry their own trim
task at the top; the roadmap entry that tracks all five is under Features.

Reading this now costs roughly **19,000 tokens**, and the house rules say it is read before any work is marked
done, so that cost lands on every piece of work. Together with the testing rows, trimming both saves about
**31,000 tokens per landing**.

**100 KB down to 83 KB.** 2026-09-13: the finished list moved to the archive. 2026-09-14: the parked entries moved
to their own file, the old decisions under *Calls waiting on you* dropped to a pointer, the longest entries reworded,
and six finished items moved to Done and archived. 2026-09-15: a seventh finished item split so the part that still
fails stays visible, the knowledge-base opening stopped quoting numbers it then retracts, and the three longest
entries sent their reference detail to the details file.

**What is left is not worth taking.** Thirty-four entries still run past five lines, but most by only a line or
two, and the ones that run long are long because the work is. Grinding those down would cost more in understanding
than it saves in tokens. The bigger wins are now in the other four files, each with its own trim task at the top.

## Around underlined words, Up is not always the reverse of Down

_The entry's first wording and cause, from before the 2026-10-02 fix. It was titled "Underlined game words are stops walking Down but are skipped walking Up"._

`[focus]` **Underlined game words are stops walking Down but are skipped walking Up** — **OPEN, seen 2026-10-01 on the Deck with Deep Rock Galactic: Survivor running (plan 78, Deck block 3b).**
  A section with three underlined words took one landing and two scrolls going Up, so Up is not the mirror of Down there; the maintainer's rule (D120 item 6) is that both directions visit the same stops. Evidence `docs/test-evidence/plan78-QA-FREE-PLAY-01-GAME-try3.json`.
  Cause (the helper's read, 2026-10-01): with the ring on a section the word finder never counts words inside that section as before the ring going Up. A fix needs a change in the word finder, an Up-side memory of the last word passed (the mirror of Down's), and room in the navigation file, which is at 397 of its 400 lines. After the release.

