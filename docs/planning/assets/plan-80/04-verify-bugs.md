# Plan 80, step 1 — findings, helper 4: Verify, bugs half

- Slice: `docs/roadmap.md`, `## Verify` (line 332) through `### Bugs that need verification` (line 338), up to `### Features that need verification` (line 387). The few lines under `## Verify` are covered in the last section.
- Date: 2026-10-03. Branch: `experimental`. Read-only except this sheet.
- Entries: 13.
- Verdicts: **done with proof** 1, **fixed with no proof** 6, **true** 6, **stale** 0, **unclear** 0.
  - In this sheet "true" means the entry says what the files say, including a partial Deck pass or an "unclear" run. "Fixed with no proof" means no Deck pass is recorded anywhere; the entry correctly stays in Verify.
- Commit hashes, checked against the full history (2,369 commits) on 2026-10-03: 16 of 18 resolve, each with a subject that matches its entry. Two do not resolve: `11033561` (parental-lock entry) and `4d750ae1` (cut-menu entry). Both are named in `docs/testing.md` and the roadmap, but no commit with that id exists. For the cut-menu entry, the commit `42092e2f` ("A choice fence cut off by the length wall no longer swallows the continuation", 2026-09-30, changes `ollama_service.py`, `strategy_guide_parse.py` and their tests) looks like the real fix. I am not certain, so the entry should be corrected by the owner. No verdict changed.
- Proposed lines below keep the stars, tag and status word. Where an entry says a Deck check is "owed", the word is kept.

## A press that never opens its box (parental lock on) can leave a stale "return the ring here" note behind
- Where: Verify, bugs, line 339.
- Verdict: **true.** Half done on the Deck, half still owed.
- Proof: `docs/testing.md:265`, row P77-OLLAMA-NOBOX-NOTE, status "Open — box half passed (Deck) 2026-09-29; the parental-lock half still owed". Evidence `docs/test-evidence/plan77-BLOCK2-CHATS-BACKEND.json` (key `P77-OLLAMA-NOBOX-NOTE_boxHalf`). Commits found: `7c8ac206` (2026-09-29, "Update AI & models and the install buttons no longer leave a stale return note") and `6ef8cedf` (2026-09-28, "The ring comes back after the library's Update and Pull notices close"). `11033561` does not exist in the history.
- Decision owed? No. No decision recorded (a search of the locked decisions for the row, "parental" and "kids lock" found nothing).
- Test owed? Yes, the parental-lock half. It needs Steam Family View with a PIN. Row: `docs/testing.md:265`. No evidence exists for that half. The row is in `docs/testing.md` only; the testing-manual has no box for it.
- Proposed entry:
  - ★ `[focus]` **A refused button (parental lock on) can leave a stale "return the ring here" note** — **VERIFY, fixed 2026-09-29.**
  - A press that opens no box no longer leaves a note that throws the ring back later. All the install and update buttons are covered.
  - Passed on the Deck 2026-09-29: the box half (the boxes open and B returns the ring).
  - Still owed: the parental-lock half, which needs Steam Family View with a PIN. Row **P77-OLLAMA-NOBOX-NOTE**. [Full note](roadmap-details.md#a-press-that-never-opens-its-box-parental-lock-on-can-leave-a-stale-return-the-ring-here-note-behind).
- Long notes (`roadmap-details.md:2911`): the whole section is one dated note repeating the entry. It must keep: the box-half pass, and that the lock half needs a PIN. The rest can go to the archive.

## Dismissing the troubleshooting hint hands the ring to the chip's slot, not to chips that are hidden
- Where: Verify, bugs, line 343.
- Verdict: **fixed with no proof.** Fix commit `312a193` exists ("Chat: dismissing the troubleshooting hint hands the ring to the chip's slot, not the hidden chips", 2026-10-02). The Deck check could not run.
- Proof: `docs/testing.md:317` row P79-HINT-DISMISS-SLOT, "Owed (Deck) — could not run 2026-10-02: no hint on screen". Evidence `docs/test-evidence/plan79-P79-HINT-DISMISS-SLOT.json`: verdict "COULD NOT RUN - no troubleshooting hint was on screen either time"; `dismiss_buttons: 0`.
- Decision owed? No. No decision recorded.
- Test owed? Yes. Row `docs/testing.md:317`. The evidence file records only the failed attempt, not a pass. Owed: a Deck check with a hint on screen.
- Proposed entry:
  - ★ `[focus]` **Dismissing the troubleshooting hint sends the ring to the right place** — **VERIFY, fixed 2026-10-02 (`312a1933`).**
  - Before, the ring could land on chips that were hidden. Now it lands on the slot above the question box.
  - Deck check owed, row **P79-HINT-DISMISS-SLOT**. It could not run on 2026-10-02: no hint was on screen. Evidence `docs/test-evidence/plan79-P79-HINT-DISMISS-SLOT.json`.
- Long notes: none linked.

## The chat summary reads oddly in places
- Where: Verify, bugs, line 346.
- Verdict: **true.** Partly passed on the Deck; the in-a-game half is unclear.
- Proof: `docs/testing.md:277` row P78-SUMUP-WORDING, "Partial (Deck) 2026-10-01; the in-a-game half tried again 2026-10-02, UNCLEAR". Evidence `docs/test-evidence/plan78-P78-SUMUP-WORDING.json` (no "Games:" line names a non-game, passed) and `plan79-P78-SUMUP-WORDING.json` (verdict UNCLEAR: the Sum up button stayed greyed, "third night in a row"). Unit tests: `tests/test_chat_summary_tidy.py` has 23 tests, which matches the entry.
- Decision owed? No. No decision recorded.
- Test owed? Yes, the in-a-game half. It needs a test chat opened in a game whose Sum up button is not greyed. Row `docs/testing.md:277`.
- Proposed entry:
  - ★★ `[ask]` **The chat summary reads oddly in places** — **VERIFY, fixed 2026-09-30 (`569abd5f`, `318c0da3`).**
  - The "What the AI remembers" card no longer names a non-game on its Game line, and drops lines that say nothing. English summaries only. On the PC, a non-game on that line went from 24 of 45 to 0.
  - Deck: the no-non-game half passed 2026-10-01. The in-a-game half is unclear (the Sum up button stayed greyed); it rests on its 23 unit tests. Row **P78-SUMUP-WORDING**.
  - [Older note](roadmap-details.md#the-chat-summary-reads-oddly-in-places).
- Long notes (`roadmap-details.md:2853`): not read in full. Keep the cause and the PC measurement; the dated per-night notes can go to the archive. Check by the section's own paragraphs when the writing step starts.

## The game's own chip never came back, and the chips turned over too slowly
- Where: Verify, bugs, line 349.
- Verdict: **done with proof.** Both Deck rows passed.
- Proof:
  - `docs/testing.md:275`, row P78-TIP-CHIP, "Done — passed (Deck) 2026-10-01 (the two-chip half by the session's ruling)". Evidence `docs/test-evidence/plan78-P78-TIP-CHIP-try2.json` (build `57586da0`: one chip, 69 chips shown, no two general chips back to back, the game's own chip 55 percent).
  - `docs/testing.md:276`, row P78-CHIP-PACE, "Done — passed (Deck) 2026-10-01". Evidence `docs/test-evidence/plan78-P78-CHIP-PACE-try2.json` (9.53 chips a minute, asked 8 to 10.5; 11.16 across two chips; closest two changes 2.49 s apart).
  - The old failed rows are already closed in `docs/archive/testing-closed-2026.md:441` (CHIP-ROTATION-01, "failing half passed (Deck) 2026-10-01 through rows P78-TIP-CHIP and P78-CHIP-PACE"). Code: `src/features/preset-carousel/carouselNextChip.ts`.
  - Two caveats in the rows' own words: the two-chip half of P78-TIP-CHIP passed "by the session's ruling"; and in P78-CHIP-PACE the closest two changes were 2.49 s apart against the 2.5 s the row states ("met to within the 0.1 s the watcher could read").
- Decision owed? Yes, already made, and one part is still open. The calls are items 9 and 10 of [D121](../../../audit/maintainer-decisions-locked.md#d121--locked-2026-09-30-raised-2026-09-30--plan-78-a-wider-bug-session-and-an-unattended-deck-pass-the-eleven-calls) (link written for use from `docs/roadmap.md` as `audit/maintainer-decisions-locked.md#d121--locked-2026-09-30-raised-2026-09-30--plan-78-a-wider-bug-session-and-an-unattended-deck-pass-the-eleven-calls`). Still open: the maintainer's own look at the pace and their pick from the preview page.
- Test owed? No Deck run is owed for the bug itself. Owed to the maintainer: their own look at the pace and the preview pick. These are named in `docs/testing.md:276`; there is no evidence file because it is not a Deck run. The neighbouring row PHASE4-CHIPS-01 (`docs/testing.md:208`) still owes "the fresh look at the widest labels". That is a different check.
- Proposed move: to Done (call 8). Proposed Done line, with the maintainer's two leftovers kept in the line so they do not get lost:
  - ★★ `[chips]` **The game's own chip comes back, and the chips turn at an even pace** — **DONE 2026-10-01, passed on the Deck (plan 78, rows P78-TIP-CHIP and P78-CHIP-PACE).**
  - One rule picks the next chip in all four styles, and one rule sets how long a chip stays. Measured on the Deck: one chip about 9.5 a minute, the game's own chip 55 percent of those shown.
  - Still owed to the maintainer: their own look at the pace and their pick from the preview page. [Cause and rules](roadmap-details.md#the-games-own-chip-never-came-back-and-the-chips-turned-over-too-slowly).
- Long notes (`roadmap-details.md:2890`): keep the cause and the two rules (that is the goal). The numbers per watch can go to the archive; they are already in the two evidence files.

## When the length limit cuts a choice menu, the next part of the answer is lost
- Where: Verify, bugs, line 352.
- Verdict: **true.** Unclear on the Deck twice; unit tests are the proof so far.
- Proof: the hash `4d750ae1` named in the entry and the row does not exist in the history; `42092e2f` (2026-09-30) is the likely real fix (unconfirmed). `docs/testing.md:267` row P77-CUT-MENU-TEXT, "Open — unclear (Deck) 2026-09-30 and 2026-10-01; unit tests are the proof so far". Evidence `docs/test-evidence/plan77-P77-CUT-MENU-TEXT.json` and `plan78-P77-CUT-MENU-TEXT.json`: no "dropped a choice fence" log line in either session, so the exact case never happened. The failing case itself (SOFT-PREDICT-04) is closed: `docs/testing.md:229`, `docs/archive/roadmap-done-v0.5.0.md:149`.
- Decision owed? Yes, one waiting: `docs/testing.md:267` says it "waits for the maintainer's 'accept, or check by hand'". I found no locked decision for it: no decision recorded. Flag for the review.
- Test owed? Yes. Row `docs/testing.md:267`. A run where the model reaches its choice menu before the length wall. No evidence of that exists.
- Proposed entry:
  - ★★ `[reply]` **When the length limit cuts a choice menu, the rest of the answer is lost** — **VERIFY, fixed 2026-09-30 (`4d750ae1`).**
  - A cut menu that the continuation cannot finish is now dropped cleanly, and the rest of the answer is kept, shown and saved. Rare at the normal limit.
  - Deck: tried twice (2026-09-30, 2026-10-01), unclear both times, because the model never reached a menu before the wall. Unit tests are the proof so far. Row **P77-CUT-MENU-TEXT**. The maintainer decides: accept on tests, or check by hand.
  - [Full note](roadmap-details.md#when-the-length-limit-cuts-a-choice-menu-the-next-part-of-the-answer-is-lost).
- Long notes (`roadmap-details.md:2874`): keep the goal and the case needed (a menu cut by the wall). The per-try numbers (248 and 897 reads) can go to the archive.

## With Voice replies on "When I asked by voice", a spoken question's answer may not read itself aloud
- Where: Verify, bugs, line 356.
- Verdict: **fixed with no proof.** Fix `c3a1f16a` and `27a450ed` (found in the full history, subject matches); no Deck run.
- Proof: `docs/testing.md:250` row READ-ALOUD-05, "Open — owed to the maintainer (needs a real voice ...)" and "No Deck run of the fix yet". Evidence for the finding only: `docs/test-evidence/plan78-G-after-answer-readthrough.md:117`. Tests exist: `src/features/voice/useVoiceAskWithReadAloud.test.tsx` has 6 tests.
- Odd: `docs/testing.md:250` says that test file has "(4)" tests; the file has 6 (and the roadmap says 6). The testing row is out of date on the count.
- Decision owed? No. The row mentions "plan 78 questions item 8" (a retry counts as typed); that is a plan question, not a locked decision, so: no decision recorded.
- Test owed? Yes, the maintainer's own, with a real voice. Row `docs/testing.md:250`. No evidence exists. The testing-manual has no box for it.
- Proposed entry:
  - ★★ `[voice]` **With Voice replies on "When I asked by voice", a spoken question's answer may not read itself** — **VERIFY, fixed 2026-09-30 (`c3a1f16a`, `27a450ed`).**
  - The note "this came from the mic" is now written the moment Ask is pressed. Six tests that failed before the fix cover it. "Always" and "Off" were never affected.
  - Limit: a retry of a spoken question counts as typed and is not read.
  - Deck check owed, and it is the maintainer's, with a real voice: row **READ-ALOUD-05**. [Full text](roadmap-details.md#with-voice-replies-on-when-i-asked-by-voice-a-spoken-questions-answer-may-not-read-itself-aloud).
- Long notes (`roadmap-details.md:2929`): not read in full. Keep the four cases and the limit. Per-finding evidence notes can go to the archive.

## A Strategy checklist that arrives while the panel is closed never shows, and after any reopen a refine chip sends its follow-up in Speed mode
- Where: Verify, bugs, line 360.
- Verdict: **true.** Partly passed on the Deck.
- Proof: `docs/testing.md:278` row P78-REOPEN-CHECKLIST, "Partial (Deck) 2026-10-01: the follow-up's mode passed; the checklist half could not be produced in four tries over two blocks and rests on its unit tests". Evidence `docs/test-evidence/plan78-P78-REOPEN-CHECKLIST-try3.json` (log line "ask_strategy: branch fence requested in prompt=True (mode=strategy ...)"); also `-try2.json` and the base file. Tests: `src/hooks/useBonsaiAskOrchestration.afterAnswer.test.ts`, `tests/test_background_status_ask_mode.py` (both found). Commit `553f46ec` found in the full history, subject matches.
- Decision owed? The row says the checklist half "is on the maintainer's list (plan 78 question 9)". I found no locked decision: no decision recorded.
- Test owed? Yes, the checklist half. Row `docs/testing.md:278`. The AI wrote no checklist in four tries, so no evidence exists for it.
- Proposed entry:
  - ★★ `[reply]` **A Strategy checklist that arrives while the panel is closed never shows, and a refine chip after a reopen sends in Speed mode** — **VERIFY, fixed 2026-09-30 (`553f46ec`).**
  - The status now says which mode the question was asked in, so a reopened panel uses it. Limit: after a reopen a refine chip does not re-send the screenshot.
  - Deck 2026-10-01: the follow-up's mode passed. The checklist half could not be produced in four tries and rests on unit tests. Row **P78-REOPEN-CHECKLIST**.
  - [Full note](roadmap-details.md#a-strategy-checklist-that-arrives-while-the-panel-is-closed-never-shows-and-after-any-reopen-a-refine-chip-sends-its-follow-up-in-speed-mode).
- Long notes (`roadmap-details.md:2833`): keep the cause and the corrected route (press a choice button, close at once, reopen). The failed old routes can go to the archive.

## Quit or switch games while a Strategy answer writes, and the old game's checklist is drawn under it
- Where: Verify, bugs, line 364.
- Verdict: **fixed with no proof.** Fix `a92cabe4` (found in the full history, subject matches). The entry itself says there is no Deck row.
- Proof: no testing row exists (`git grep` for the entry's words in `docs/testing.md` and `docs/testing-manual.md` finds nothing). The finding is in `docs/test-evidence/plan78-G-after-answer-readthrough.md` (finding 3). Tests: `src/hooks/useBonsaiAskOrchestration.afterAnswer.test.ts` (found).
- Decision owed? Yes, probably: with no Deck row, someone has to say "accept on unit tests" for it to ever leave Verify. No decision recorded. Flag for the review.
- Test owed? No Deck test can be made ("it cannot be made to happen reliably"). No test row and no evidence exist.
- Proposed entry:
  - ★ `[reply]` **Quit or switch games while a Strategy answer writes, and the old game's checklist is drawn under it** — **VERIFY, fixed 2026-09-30 (`a92cabe4`).**
  - The checklist is now drawn only if the answer's game is still the running game. It is still saved under its own game.
  - Unit tests only; no Deck row, because it cannot be made to happen reliably. The maintainer decides whether that is enough to close it.
- Long notes: none linked.

## After the quick start is opened and closed, the help chip stayed and the suggestion chips never took the row
- Where: Verify, bugs, line 367.
- Verdict: **true.** Unclear on the Deck; needs a fresh install.
- Proof: `docs/testing.md:280` row P78-HELP-CHIP-DISMISS, "UNCLEAR (Deck) 2026-10-01 — the check could not be run; owed on a fresh install". Evidence `docs/test-evidence/plan78-P78-HELP-CHIP-DISMISS.json` (key removed, plugin put it back by itself after a reload) and `plan78-PRESET-ONE-LINE-02.json` (the bug). `docs/testing-manual.md:484` holds the half-done manual check. `CHANGELOG.md:39` says "Owes its Deck check." Tests: `src/index.helpChip.test.tsx` has 4 tests, which matches.
- Decision owed? No. No decision recorded. (The row says the check needs "Clear all plugin data", which the Deck driver is not allowed to run; the maintainer's first-install check is the way.)
- Test owed? Yes. Row `docs/testing.md:280`; manual line `docs/testing-manual.md:484`. A fresh install or "Clear all plugin data". The one try is in the evidence file and shows no pass.
- Proposed entry:
  - ★★ `[chips]` **After the quick start is opened and closed, the help chip stayed and the suggestion chips never took the row** — **VERIFY, fixed 2026-10-01 (`f0a4f2c4`).**
  - A stale note of the session beat the saved "seen" flag. The popup now marks the note as seen. Four tests, two fail without the fix.
  - Deck check unclear 2026-10-01: the rig could not make the help chip show again. Owed on a fresh install. Row **P78-HELP-CHIP-DISMISS**.
  - [Full cause](roadmap-details.md#after-the-quick-start-is-opened-and-closed-the-help-chip-stayed-and-the-suggestion-chips-never-took-the-row).
- Long notes (`roadmap-details.md:2901`): keep the cause. The rig's own reload story can go to the archive.

## When the Steam settings list above the question box closes while the ring is on one of its rows, the ring vanishes until the next press
- Where: Verify, bugs, line 371.
- Verdict: **fixed with no proof.** Fix `8c8fffb0` (found in the full history, subject matches). A nearby case was seen on the Deck, but the row as written was not run.
- Proof: `docs/testing.md:299` row P79-SETTINGS-LIST-RING, "Owed (Deck)", "Not run as written". The near case (route F, build `678aaa3d`) is in `docs/test-evidence/plan79-P79-TRAP-ROUTES-AFTER.json`. The "before" file `plan79-P79-M1-TRAP-try3.json` exists. Test `src/components/MainTabUnifiedAskBar.settingsCardRingOnHide.test.tsx` found.
- Decision owed? No. No decision recorded.
- Test owed? Yes. Row `docs/testing.md:299`. The close case is not a pass of the row.
- Proposed entry:
  - ★ `[focus]` **When the settings list above the question box closes with the ring on a row, the ring vanished until the next press** — **VERIFY, fixed 2026-10-02 (`8c8fffb0`).**
  - Now the question box takes the ring through Steam's own hand-over. One test covers it.
  - Deck check owed, row **P79-SETTINGS-LIST-RING**. Not run as written; in a close case on 2026-10-02 the list closed by itself and the ring moved to the question box (`docs/test-evidence/plan79-P79-TRAP-ROUTES-AFTER.json`).
- Long notes: none linked.

## A power question's answer often has no number in it
- Where: Verify, bugs, line 374.
- Verdict: **fixed with no proof** (no Deck run; PC measurement only). Fix `7ef1d70f` (found in the full history, subject matches). Code present: `py_modules/backend/services/ask_topic_instructions.py` handles tdp, watts, fps terms; tests `tests/test_power_question_instructions.py`, `tests/test_ollama_service.py` found.
- Proof: `docs/testing.md:300` row P79-POWER-NUMBERS, "Owed (Deck)", "Not run on the Deck yet". The "3 of 30 to 27 of 30" figure is in the commit message only. No evidence file exists, so I cannot copy it from one.
- Decision owed? No. No decision recorded.
- Test owed? Yes. Row `docs/testing.md:300`. No evidence exists, for the Deck or the PC.
- Proposed entry:
  - ★ `[reply]` **A power question's answer often has no number in it** — **VERIFY, fixed 2026-10-02 (`7ef1d70f`).**
  - Power, battery, TDP and frame-cap questions now get the Quick Access tuning instructions, so the answer holds a TDP in watts, a frame cap and a refresh rate.
  - Measured on the PC only (commit message, no evidence file): 3 of 30 answers had a number you can set before, 27 of 30 after.
  - Deck check owed, row **P79-POWER-NUMBERS**.
- Long notes: none linked.

## A spoken question sometimes comes out with its words doubled
- Where: Verify, bugs, line 377.
- Verdict: **fixed with no proof.** Fix `7b6e1de5` (found in the full history, subject matches). Test `tests/test_voice_overlap_merge.py` found; the merge code is near `py_modules/backend/services/voice_transcript_decode_service.py:178`.
- Proof: `docs/testing.md:301` row P79-DOUBLED-WORDS, "Owed (Deck)", "Not run yet". No evidence file.
- Decision owed? No. No decision recorded.
- Test owed? Yes, and the real microphone is the maintainer's final check. Row `docs/testing.md:301`. No evidence exists.
- Proposed entry:
  - ★★ `[voice]` **A spoken question sometimes comes out with its words doubled** — **VERIFY, fixed 2026-10-02 (`7b6e1de5`).**
  - Stretches of text that overlap are now merged, so none appears twice. One test file covers it.
  - Not run on the Deck. The real microphone is the maintainer's final check. Row **P79-DOUBLED-WORDS**.
- Long notes: none linked.

## After picking a setting from the search list above the question box, Down cannot get past the answer
- Where: Verify, bugs, line 381.
- Verdict: **true.** Partly checked on the Deck. The maintainer's own route has never reproduced.
- Proof: `docs/testing.md:303` row P79-TRAP-DOWN-BUBBLE, "Partial (Deck) 2026-10-02 — three routes did not trap; the fix's own state could not be made; owed: the maintainer watching for it in daily use". Evidence `docs/test-evidence/plan79-P79-TRAP-ROUTES-AFTER.json`, `plan79-P79-TRAP-ROUTE-H.json`; earlier tries `plan79-P79-M1-TRAP*.json`. Fix `affa7fa` exists ("Down with Steam's ring on the whole answer no longer does nothing for ever"); `8c8fffb0` is found in the full history, subject matches.
- Decision owed? Yes, a small one: the row says "The session owner decides whether scrolling first counts as moving." No locked decision found: no decision recorded. Flag for the review.
- Test owed? Yes: the maintainer watching for it in daily use. Row `docs/testing.md:303`. The evidence shows no trap and no pass of the fix's own state.
- Proposed entry:
  - ★★★ `[focus]` **After picking a setting from the search list above the question box, Down cannot get past the answer** — **VERIFY, fixes for nearby cases landed 2026-10-02 (`affa7fa0`, `8c8fffb0`). The maintainer found it; it has never reproduced since.**
  - On the Deck (build `678aaa3d`) three nearby routes did not trap, and the fix's own state could not be made. Nothing has reproduced it in ten tries.
  - Owed: the maintainer watching for it in daily use. Row **P79-TRAP-DOWN-BUBBLE**. Open question: whether scrolling the panel first counts as moving.
  - [Older notes](roadmap-details.md#after-picking-a-setting-from-the-search-list-above-the-question-box-down-cannot-get-past-the-answer).
- Long notes (`roadmap-details.md:2956`): keep the first wording of the bug (what the maintainer saw). The per-route detail can go to the archive.

## Notes for the review

- **One entry can move to Done:** the chips entry (P78-TIP-CHIP and P78-CHIP-PACE). Its two leftovers (the maintainer's look at the pace, their preview pick) are not Deck checks and stay named in the Done line. The review should confirm that is acceptable.
- **No other entry has a Deck pass.** Six are fixed with no proof (hint dismiss, read aloud, quit-or-switch checklist, settings-list ring, power numbers, doubled words). Six are true with a partial or unclear Deck run.
- **Needs the maintainer:** (1) the cut-menu row waits on "accept, or check by hand" with no locked decision behind it; (2) the quit-or-switch entry has no row at all, so it needs a call on whether unit tests are enough; (3) the Down-trap row asks whether scrolling first counts as moving.
- **Odd:** `docs/testing.md:250` says 4 tests for the read-aloud file; the file has 6 and the roadmap says 6. The testing row is out of date.
- **Odd:** the roadmap's "Deck row P78-SUMUP-WORDING: partly passed, below" and similar "below" words point at text lower in the same entry. They are fine today but will break if the entry is cut.
- **Odd:** the chips entry's long note lives at `roadmap-details.md:2890`; the `## Verify` header says to move a confirmed entry's "full entry into the matching archive file". The matching archive for bugs is `docs/archive/roadmap-bugs-fixed.md`.
- **Hashes:** two entries name commits that do not exist: `11033561` (parental-lock entry, tip `7c8ac206` is real) and `4d750ae1` (cut-menu entry; `42092e2f` looks like the real fix). Fix the entries when the sheet is applied.
- **Header lines under `## Verify` (line 332):** "Fixed, unit-tested and shipped, but not yet confirmed on the Deck. Owed QA row named in each entry..." is true. The instruction to move a line "into [Done](#done-for-v050)" needs the new Done name after call 7 (renamed for 0.6.0); the anchor `#done-for-v050` will break.
