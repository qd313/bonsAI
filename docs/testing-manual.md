# bonsAI testing — manual (Deck / maintainer)

> **Trimmed 2026-09-24 (plan 65).** Checks that passed on the Deck, or were retired or superseded,
> moved word for word to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md). The
> older dated history behind long-running open checks moved word for word to
> [testing-manual-history-2026.md](archive/testing-manual-history-2026.md), with a short link left on
> the live row.

On-device QA only. Automated gates: [testing-automated.md](testing-automated.md). Hub + slim coverage: [testing.md](testing.md). Roadmap: [roadmap.md](roadmap.md) (items fixed but not Deck-confirmed sit in its Verify section).

Record **build id / git SHA** and **SteamOS** when marking Pass / Partial / Fail.

**The short list of what only the maintainer can settle** — a finger on the glass, a secret only they
hold, or a matter of taste — lives as a tickable page:
[Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
Sessions add to it rather than leaving such a finding in a chat. The rows it names stay the authority;
the page is the maintainer's view of them.

Historical full checklist (pre–2026-07-30 split): [archive/testing-full-pre-2026-07-30.md](archive/testing-full-pre-2026-07-30.md).

---

<!-- toc: written by scripts/docs_toc.py; do not hand-edit -->
**Contents**

- [Tags](#tags)
- [Test title pool](#test-title-pool)
- [Standing row: the look check](#standing-row-the-look-check)
- [Standing row: the free-play sweep](#standing-row-the-free-play-sweep)
- [Focus graph (mandatory before shipping new controls)](#focus-graph-mandatory-before-shipping-new-controls)
- [Cross-cutting smokes](#cross-cutting-smokes)
- [Tier 0 — Quick wins (S0)](#tier-0--quick-wins-s0)
  - [SMOKE-A — Golden path (P0)](#smoke-a--golden-path-p0)
  - [SMOKE-C — Permission gate (P0)](#smoke-c--permission-gate-p0)
  - [PERM-JUMP-01 — Permission jump D-pad (P0)](#perm-jump-01--permission-jump-d-pad-p0)
  - [ONBUTTONDOWN-AUDIT-01 — onButtonDown whitelist + direction handlers (P1)](#onbuttondown-audit-01--onbuttondown-whitelist--direction-handlers-p1)
  - [DOC-SWEEP-01 — global document realm fixes (P1)](#doc-sweep-01--global-document-realm-fixes-p1)
  - [PRESET-STREAM-ANIM-01 — decode preset chip animation (P1)](#preset-stream-anim-01--decode-preset-chip-animation-p1)
  - [SMOKE-F — Deterministic commands (P2)](#smoke-f--deterministic-commands-p2)
- [Tier 1 — Core shipped (S1)](#tier-1--core-shipped-s1)
  - [SMOKE-B — TDP apply 8W (retired)](#smoke-b--tdp-apply-8w-retired)
  - [SMOKE-E — Strategy one-shot (P1)](#smoke-e--strategy-one-shot-p1)
  - [SMOKE-H — Background Ask reopen (P1)](#smoke-h--background-ask-reopen-p1)
  - [Tier 1 extras](#tier-1-extras)
- [Tier 2 — Opt-in (run when touching related code or before RC)](#tier-2--opt-in-run-when-touching-related-code-or-before-rc)
  - [Open regression IDs (bugs / recent ships)](#open-regression-ids-bugs--recent-ships)
  - [CHAT-SLOTS-V2 — Named chat slots (P0)](#chat-slots-v2--named-chat-slots-p0)
  - [CHAT-SLOTS-V3 — Named chat slots redesign (P0)](#chat-slots-v3--named-chat-slots-redesign-p0)
  - [CHIP-BUTTON — Suggestion chips as real buttons (plan 60)](#chip-button--suggestion-chips-as-real-buttons-plan-60)
  - [TAB-BAR — Collapsing tab bar (P0)](#tab-bar--collapsing-tab-bar-p0)
  - [TAB-STRIP-2A — The open tab strip redesign (plan 59)](#tab-strip-2a--the-open-tab-strip-redesign-plan-59)
  - [PLAN-84 — More room for the answer (plan 84)](#plan-84--more-room-for-the-answer-plan-84)
  - [NOTES-BLOCK — The "From the notes" block (plan 58 phase 1)](#notes-block--the-from-the-notes-block-plan-58-phase-1)
- [Tier 3 — Heavy manual](#tier-3--heavy-manual)
- [Tier 4 — Release gate](#tier-4--release-gate)
- [QAMP verification (Phase 1)](#qamp-verification-phase-1)
- [Progress tracker](#progress-tracker)
- [Prompt-testing (qualitative)](#prompt-testing-qualitative)
<!-- /toc -->

## Tags

| Tag | Meaning |
|-----|---------|
| **P0–P3** | Importance — P0 = core; P3 = polish |
| **S0–S3** | Setup cost — S0 = BPM + Ollama; S3 = reboot / clean install |
| **Tier 0–4** | Run order — finish lower tiers first unless PR-scoped |

---

## Test title pool

The games QA rows reach for, and what each one is actually covering. Rows below name these by
AppID; keep new rows inside this pool unless a title is the thing under test, so a Deck session
does not need a different library every week.

| Title | AppID | Covers | Why this one |
|---|---|---|---|
| Deep Rock Galactic: Survivor | `2321470` | KB corpus hit, session RAG chips, `low_narrative` spoiler profile | The only title the seed corpus covers by entity (`Glyphid Dreadnought`, `Hollow Bough`) |
| Hades | `1145360` | `protect_progression`, named-entity consent | Shares the `roguelike` genre with DRG Survivor, so it is the genre over-relax guard |
| Left 4 Dead 2 | `550` | `low_narrative`, KB compat routing | Cheap to install, always in the library |
| **Black Mesa** | `362890` | **`unknown` spoiler profile**, Proton/Source compat, cold-model thinking phases | **The gap the pool had.** Every other title above is classified in `spoiler_title_profiles.py`; most of a real user's library is not, and `unknown` was untested on device. Also a Source-engine title with real Proton behaviour, so it exercises `proton_logs` without contriving a crash |

**Black Mesa is deliberately not added to `spoiler_title_profiles.py`.** Adding it would defeat the
reason it is in the pool — it is here to exercise the unclassified path a real library mostly hits.
It is a linear story campaign, so if a QA pass shows the `unknown` default is too loose for
story-shaped titles, that is a finding about the default, not a reason to special-case this AppID.

---

## Standing row: the look check

**QA-LOOK-01** — run with every Deck block that changes anything on screen, on each tab the change
touches, on the Deck's own screen and the monitor. Standing rule from the maintainer 2026-10-17, after
they found by eye, in one evening, white buttons, buttons pressed against the panel edge, a link too
small for its words and a spinner that no longer turned, on screens sessions had walked and
screenshotted many times.

1. Open the tab, then run `ssh deck@<ip> 'python3 - --json' < scripts/probe_deck_ui_look.py`. It
   presses nothing. It lists words that do not fit their button, a light button among dark ones, a
   control pressed against the panel edge, a lone wide button with lopsided gaps, and a spinner that
   is drawn but not turning. Exit code 1 means something was found; save the output in the evidence.
2. Take one screenshot of the tab and look at it as a person would: alignment, spacing, colors, and
   anything that looks unlike the rest of the plugin. The script cannot judge taste.
3. A finding is fixed or filed as a bug before the change is called verified.

**2026-10-18 (plan 96, block M, the Deck's own screen, build `a1b00906`, before the fixes of that night):** Settings, Permissions, Search, Developer (every section closed) and Ollama found nothing. About found one thing: Steam's own language dropdown reads as a light button (Steam's control, not the plugin's). Main found 14 things, all the transcript's own rows, the chips and the Ask pill (the Ask pill is fixed; the chips and the transcript's own rows are now exempt). Evidence `workshop:test-evidence/plan96-QA-LOOK-Main.json`, `plan96-QA-LOOK-Settings.json`, `plan96-QA-LOOK-Permissions.json`, `plan96-QA-LOOK-Search.json`, `plan96-QA-LOOK-Developer.json`, `plan96-QA-LOOK-Ollama.json`, `plan96-QA-LOOK-About.json`. **Still owed:** the run on every tab on the new build (plan 96 block D), with the Developer tab's sections open.

**2026-10-18 (plan 96 blocks D and E, the Deck's own screen):** on build `a29f9eb0` Settings, Permissions, Search, Developer, Ollama and About found nothing, and Main found one thing, the Ask pill (56 in 51). Evidence `workshop:test-evidence/plan96-QA-LOOK2-Settings.json`, `plan96-QA-LOOK2-Permissions.json`, `plan96-QA-LOOK2-Search.json`, `plan96-QA-LOOK2-Developer.json`, `plan96-QA-LOOK2-Ollama.json`, `plan96-QA-LOOK2-About.json`, `plan96-QA-LOOK2-Main.json`. After the check learned that words count as not fitting only when they really spill (`331d4b56`), block E's Main run (build `f7413dbc`) had no Ask finding and one other: the new "Open the Ollama tab" button read as a light button, fixed in `bba825e5` (`workshop:test-evidence/plan96-QA-LOOK3-main.json`). The evidence files do not say whether the Developer tab's sections were open, so that part stays owed. That Main run was owed on the build with `bba825e5`; it passed in block F (next note).

**2026-10-18 (plan 96 block F, the Deck's own screen, build `24f5c300`): Main PASSED, no findings.** The look check returned an empty findings list on the plain test chat with the "Which upgrade helps most early?" answer on screen. The "AI is not set up" answer variant could not be made by the rig (it needs A on a text box). The other six tabs ran on `a29f9eb0` (above). Evidence `workshop:test-evidence/plan96-QA-LOOK4-main.json`, picture `plan96-QA-LOOK4-main.png`.

**2026-10-22 (plan 97 block A, the monitor, build `73738058`, before the plan 97 fixes):** all seven tabs found nothing, About included (the dropdown was not flagged). Evidence `workshop:test-evidence/plan97-QA-LOOK-monitor-main.json`, and the same name ending `-ollama`, `-settings`, `-permissions`, `-developer`, `-about`, `-search`. The dropdown skip landed in `f9ac3283`; the About run on the new build is owed (row in [testing.md](testing.md), block D2).

---

## Standing row: the free-play sweep

**QA-FREE-PLAY-01** — run after ANY change to the Main tab's layout, scrolling, focus graph, or
the dock, before the change is called verified. Standing rule from the maintainer 2026-08-31,
after two bugs in two days that every scripted check passed and free use found in seconds.

Emulate a user, not a test plan: with a LONG reply on screen —

1. Scroll around the reply (up into it, back down), then D-pad walk from the top of the pane to
   the very bottom, one press at a time — through the answer, its trailing chips (Show details /
   Copy / Helpful / branch buttons), the session context strip, into the dock, to ASK.
2. At **every** stop, two checks, and both must pass — they are different facts:
   - **Focused** — the ring is on the control (`deck_readFocus` / walk result).
   - **Visible** — a person could see it: the focused rect sits inside the pane AND above the
     dock's top edge, and an `elementFromPoint` probe at the rect's centre hits the control
     itself, not something covering it (`deck_readPage`).
3. Repeat the walk on at least one other carousel position (LB/RB), and once more after the
   reply finishes if it was streaming.

**Current state, as of the 2026-09-23 runs:** the vanishing-ring/streaming case this row used to owe is now
fixed and closed — the fourth try (H4 in flow H) passed, holding the ring and the scroll position steady
through an answer finishing. The plain finished-reply walk also passed the same night, but turned up a new
problem (two tall answer sections only 33% visible, wherever the walk reaches them), so the row stays open
on that new bug. **Still owed:** the touch-screen half, which needs a person, not the rig. Evidence
`workshop:test-evidence/plan64-STREAM-WALK-REC-01-try4-run2.json` (the vanishing-ring pass),
`workshop:test-evidence/plan64-QA-FREE-PLAY-01-finished.json` (the new bug). History (every dated run since
2026-09-05, the LB/RB carousel note, and the earlier streaming failures this fix replaced):
[testing-manual-history-2026.md § QA-FREE-PLAY-01](archive/testing-manual-history-2026.md#qa-free-play-01).

**FAILED again (Deck) 2026-09-26 (plan 70, flow 2b.1): the 2026-09-23 fix no longer holds.** In 3 of 4
fresh tries, nobody held the ring once the answer finished, and within about 3 seconds the view slid to
the end of the text, leaving the control the ring had been on 196 to 356 px above what was visible. Only
a Down pressed within about half a second of the finish kept the ring on its control, in view, as before.
Evidence `workshop:test-evidence/plan70-QA-FREE-PLAY-01.json` (+ screenshots).

**Fixed 2026-09-26 (helper F2, commit `f87a962c`), not a regression** — a case the 2026-09-23 fix never
covered (a ring on the question row itself, not inside the answer). The ring is now handed to the same
stop on the header once the live question is replaced by its finished copy. **PASS (Deck) 2026-09-26
(plan 70, flow L4.1), closed:** six fresh questions, three with the ring on Retry and three on the
question text — in all six the ring never left its control from the moment it was placed until 5 seconds
after the answer finished, and the view stayed at the top with 155 to 704 px of answer still below.
Saved walk `workshop:checks/plan70-L4-QA-FREE-PLAY-01.json`. Evidence
`workshop:test-evidence/plan70-L4-QA-FREE-PLAY-01.json` (+ screenshots).

**FAILED (Deck) 2026-09-29 (plan 76, block 3, build `4af8e7a1`), no game running:** on three replies (finished, arriving, and one with a notes line)
every stop was visible or one of the two known corner-icon alarms, except one: after a Down press that scrolls past a spoiler cover, the ring sits
on the section's box with 67% of it, cover included, under the tab header. Filed as a small bug on the roadmap. Not done: a second carousel
position, the whole-chat walk, the touch half (needs a person). The row stays open. Evidence `workshop:test-evidence/plan76-QA-FREE-PLAY-01-try2.json`.

**2026-10-18 (plan 96 block F, build `24f5c300`, the Deck's own screen, no game): the sweep on Main PASSED.** Two walks: 24 presses (11 down, 13 up) over 21 stops on 12 controls, and 13 presses down over 12 stops; no cycle, no dead press, no stop focused but not visible. The reply text is an unnamed stop in both walks, as in earlier blocks. The row stays open for its other halves, as written above. Evidence `workshop:test-evidence/plan96-P96-F-FREEPLAY.json`, saved walk `workshop:checks/P96-F-FREEPLAY-main.json`.

**2026-10-18 (plan 96 blocks D and E, builds `a29f9eb0` and `f7413dbc`, the Deck's own screen, no game): the sweep on Main PASSED for dead presses and the dock, twice.** Block D: 24 presses down and back, no dead press, nothing behind the dock. Block E: 29 presses in two legs, 26 stops (14 distinct), no cycle, no dead press, nothing behind the dock. In both the chat name row read 83 % visible (the known roadmap entry). Evidence `workshop:test-evidence/plan96-P96-D3-FREEPLAY.json`, `plan96-P96-E3-FREEPLAY-MAIN.json`.

**2026-10-17 (plan 94 block 7, build `e9b50cc8`, the Deck's own screen, Deep Rock Galactic: Survivor running): the sweep with the game PASSED.** Two walks, each after a fresh answer (23 and 25 presses, down to the end and back): no dead press, nothing behind the dock, every stop 100 % visible except the chat name row at 83 %. Down from Copy landed on Helpful (no Tip chip was under those answers). Evidence `workshop:test-evidence/plan94-P94-FREE-PLAY-GAME.json`.

**2026-10-14 (plan 93 Deck block D3, build `8ff99a0a`, the Deck's own screen, Deep Rock Galactic: Survivor running, Strategy mode): the half with a game running, no loop and no dead press, UNCLEAR on visibility, still open.** One sweep of 28 presses down and back (no A): 25 stops, 13 distinct controls, 0 loops, 0 press retries, each leg ended by a stall at its end, and it reached Ask. 23 of 25 stops read 100 percent visible; the chat title row read 83 percent both times (covered by a panel box and clipped by the tab strip), the same reading as the run without a game (the rig's known false alarm); the words of the row were not measured. Two stops had no name (the answer text section and the question box). The touch-screen half needs a person and was not run, so the row stays open. Evidence `workshop:test-evidence/plan93-QA-FREE-PLAY-01-game-D3.json`.

**2026-10-14 (plan 93, Deck blocks C and D1, the Deck's own screen, no game): the "before" and "after" for today's Main-tab fixes, UNCLEAR on visibility, still open.** Before (block C, `workshop:test-evidence/plan93-QA-FREE-PLAY-01-before.json`): going Up from "Mark reply helpful" the answer's last section sat with its last lines under the dock (box 240 to 349, dock top 330, 80 percent visible). After (build `0ef34f82`, a sweep of 54 presses: 51 stops, 27 distinct controls, `workshop:test-evidence/plan93-QA-FREE-PLAY-01-after.json`, stop list `-after-sweep.json`): 0 loops, no dead press in the middle of either leg, every stop from the tab bar down to Ask and back reached, and the last section reads 100 percent visible on the way up. Seven stops read 83 percent visible (one sample point each): the chat-name row twice and one-line history rows; no text hidden under the dock found, but the tool cannot say whether a person loses anything, and this run walked an older opened turn without rating buttons, so it is not the same picture as the before run. The touch-screen half needs a person and was not run, so the row stays open.

**2026-10-12 (plan 92 second night, Deck blocks B and C, build `f4215cf1`, the Deck's own screen, no game): stops and cycles PASSED, visibility UNCLEAR as before.** Two sweeps; 0 cycles and 0 unlabeled stops in both. Main walked 13 stops each way in the order the page now shows (the last turn in the chat was a "remember …" reply with its note card, so the stops differ from the baseline's long answer); the Ollama tab's five folded section lines were all reached. Not clean on visibility: the chat-name button 92 percent (clipped by the panel box, as before), two suggestion chips at 56 and 67 percent (covered by the Quick Access rail or another chip; the wording changes each run) and four Ollama section lines at 92 percent (the same clip). On Ollama, Down from the tab bar went straight to the last section line ("AI models") and then stalled (3 presses, 1 stop), while Up walked the other four. About, Settings and Developer were not part of this sweep. The touch-screen half needs a person and was not run, so the row stays open. Evidence `workshop:test-evidence/plan92-QA-FREE-PLAY-01-n2.json`.

**2026-10-12 (plan 92, Deck block 2, build `d553a5b4`, the monitor, no game): the "before" picture for tonight's Main-tab changes, UNCLEAR.** Two sweeps; 0 cycles; the Main tab and the Ollama tab each walked top to bottom and back. Two stops read as partly hidden: the chat-name button (92 percent visible) and the first suggestion chip (56 percent going down, 67 percent going up; its wording changes each time). The touch-screen half needs a person and was not run, so the row stays open. Evidence `workshop:test-evidence/plan92-QA-FREE-PLAY-01-baseline.json`.

**2026-10-11 (plan 89, Deck block 6, build `f5e4dc12`, the monitor, with Deep Rock Galactic: Survivor running): the half with a game running PASSED, tonight's build.** Two sweeps and a hand walk; every stop was focused and visible, 0 cycles, no dead vertical press, no repeated stop; the Context strip named the game. Evidence `workshop:test-evidence/plan89-I1-QA-FREE-PLAY-01-game.json`. **Earlier the same night (block 3c, no game, build `f5e4dc12`): the half with no game PASSED.** Every stop focused and visible above the dock on the Main tab (twice) and the Ollama tab, no cycles, no repeated stops, no dead vertical press. One UNCLEAR finding: going Down the ring stops on the answer's "In short" paragraph, going Up it skips it (it is still reachable); filed as a roadmap Bugs entry. Evidence `workshop:test-evidence/plan89-QA-FREE-PLAY-01.json`. Both halves have now passed for tonight's build; the touch-screen half stays the maintainer's, so the row stays open.

**2026-10-11 (plan 89 Deck block 2, build `f561c0e5`, the monitor, a prepared answer from the stand-in AI): the slot half's "same stops both ways" PASSED.** With the answer's own Show details line out of sight and the slot showing its line, two Up and two Down walks visited the same 8 stops, reversed, and exactly one Show details line was visible at every settled stop (row P87-B1-SLOT-SAME-STOPS). Not a full sweep: the row stays open for the rest. Evidence `workshop:test-evidence/plan89-P87-B1-SLOT-SAME-STOPS.json`.

**2026-10-10 (plan 87 Deck block 6a, build `95139093`, no game, the new layout): the half with no game running PASSED.** 62 presses over 4 legs (Main down 13 stops, up 14; Ollama 13 and 13), no loop, no stop twice, no dead press. The only partly visible readings (75 and 83 percent) were the chat name row, whose words and ring are fully on screen in the screenshot (the probe's known false alarm). The half with a game running stays as block 5b left it (Ollama tab passed, Main tab unclear), so the row stays open. Evidence `workshop:test-evidence/plan87-QA-FREE-PLAY-01-NOGAME-try2.json` (+ `plan87-QA-FREE-PLAY-01-NOGAME-try2-sweep-raw.json` and `plan87-QA-FREE-PLAY-01-NOGAME-try2-name-row.png`).

**2026-10-10 (plan 87 Deck blocks 5 and 5b, build `8608954d`): partly run, still owed.** Block 5 stopped early on the memory rule (with Deep Rock Galactic: Survivor running and the Deck's own AI loaded, available memory fell to 1,988 MB; block 5b unloaded the AI first and memory rose from 1,971 MB to 8,648 MB). **No game: UNCLEAR:** 28 controls in 51 stops on Main, no loop, no dead press, no stop twice; 4 stops only partly visible to the probe (the chat name row 83 to 87 percent at the top edge; a scrolling long chip's label cut while it scrolls, by design); Ollama tab 13 of 13 visible (`workshop:test-evidence/plan87-QA-FREE-PLAY-01-NOGAME.json`). It found one new bug: Left from a lone Show details card left the plugin (fixed since; row P87-NOTES-CARD-LEFT passed on the Deck in block 6a, `workshop:test-evidence/plan87-P87-NOTES-CARD-LEFT.json`). **With the game: the Ollama tab PASSED** (27 stops, all fully visible, no dead press, no stop twice); **the Main tab UNCLEAR** (17 stops, no dead press, no stop twice; one rotating suggestion chip read 67 percent visible and could not be revisited) (`workshop:test-evidence/plan87-QA-FREE-PLAY-01-GAME.json`). The row stays open.

**2026-10-08 (plan 83 overnight, Deck, build `0d3af3de`, no game, the slot's Show details line): the slot half PASSED; "same stops both ways" is UNCLEAR.** Up from the question box landed on the slot's Show details line, whole on screen (100 percent, the probe hit it); Down from it went to the question box and Up came back; A opened the details and B closed them with the ring kept. The Up walk (10 stops) and the Down walk (12 stops) matched by name in reverse order except under the answer: the slot swapped from the line to chips between the two walks, so Up stopped on the line and Down on a chip (filed in roadmap Bugs). No dead press, no stop twice. **Still owed:** that half, and the rest of this row as written above (a second carousel position, the whole-chat walk, the touch half). Evidence `workshop:test-evidence/plan83-QA-FREE-PLAY-01.json`.

**2026-10-03 (plan 81, Deck, builds `7e963807` and `88fd0c8f`): the half with a game running PASSED; the half with no game FAILED first, then passed what it checked on the fix's build.** With Deep Rock Galactic: Survivor running (build `7e963807`): 16 stops going Down and 15 going Up from the question box, no stop twice, no dead press except scroll-only presses in the one tall section, and Up was Down reversed by name and order; every stop fully visible except the two known cases (the question row 89 percent behind Retry, the tall section judged by its entering edge). Saved walk `workshop:checks/plan81-free-play-game.json`. With no game (build `7e963807`, the newest answer ending in choices) it FAILED two ways: Down landed once on the suggestion chip row while it was hidden (0 percent visible; the ring drawn on screen stayed on Show details, so the press looked dead), and Up stopped on the dock's own Show details line, which Down never landed on, so Up was not Down reversed. Saved walk `workshop:checks/plan81-free-play-nogame.json`. After the fix (`2a638774`, `88fd0c8f`, build `88fd0c8f`): 16 stops Down and the same 16 Up, 32 landings checked, none on a hidden element, no stop twice, no dead press except scroll-only presses in the tall section. **Still tests only:** the slot's Show details line as a stop did not come up, because that answer had a notes block and the slot showed chips; its tests are `src/features/answer/details/DetailsSlot.deck.test.tsx` and `src/shared/dpad/permHintRowNav.test.ts`, and the evidence file's own verdict line reads UNCLEAR for that reason. Saved walk `workshop:checks/plan81-free-play-nogame-try2.json`. Evidence `workshop:test-evidence/plan81-QA-FREE-PLAY-01-GAME.json`, `workshop:test-evidence/plan81-QA-FREE-PLAY-01-NOGAME.json` (+ two .png), `workshop:test-evidence/plan81-QA-FREE-PLAY-01-NOGAME-try2.json`. It stays a standing row.

**2026-10-02 (plan 79, Deck, build `6e297645`): both halves ran; no cycle, no dead press and Retry never a stop in either, but Up does not visit the same stops as Down, so the sweep's last line FAILED in both.** With no game and with Hades running, Down visited 16 stops and Up 16, but not the same ones: the last answer section under the second spoiler cover (behind the Copy icon) is a stop going Down and is skipped going Up (Up from the choice buttons goes straight to the second cover). Every other stop was fully visible except the known false alarms (the question row behind Retry, that last section behind Copy) and the tall section judged by the edge it is entered from; Down ended on Ask and Up on the tab bar. The first no-game sweep stopped early because presses that only scroll counted as stalls; a rerun with a stall limit of 5 gave the picture above. Filed under roadmap Bugs. Evidence `workshop:test-evidence/plan79-QA-FREE-PLAY-01-NOGAME-b3a.json`, `plan79-QA-FREE-PLAY-01-GAME-b3a.json`. It stays a standing row.

**2026-10-02 (plan 79, Deck, build `f0a4f2c4`): the half with no game running PASSED.** 50 stops in 58 presses over 4 legs, no cycle, no dead press, no stop twice in a leg. Down and Up visited the same 16 stops by name. Every stop was fully visible except 6 that read 89 percent: the question row behind Retry and the last section behind Copy, and no word of text overlaps either icon. Seen along the way: Retry is a stop between "87 earlier" and the question both ways (the open bug in Bugs); the Up leg ends one stop past the tab bar, on the BONSAI back arrow (do not press A there). The case check is UNCLEAR: the newest answer had 3 sections where the row asks for 4 or more, and 1 spoiler cover. The game half and the touch half were not run. Evidence `workshop:test-evidence/plan79-QA-FREE-PLAY-01-NOGAME.json`.

**2026-10-01 (plan 78, Deck block 3d, build `9feef02e`): both halves ran; the sweep passed in both, the jump check and the "Up skips underlined words" note could not run with a game.** No game running: PASS. 12 stops going Up and 12 coming back Down, every stop visible, nothing landed on three times (the tall section takes three scroll presses, expected), no dead press. Hades running: PASS. Six short sections, 19 stops up and 20 down, only the two known false alarms (the last section behind the Copy icon, the first section's turn behind the Retry icon) partly covered, no stop three times, no dead press. **COULD NOT RUN with a game:** the jump check (no section taller than the visible space in that answer) and the "Up skips underlined words" note (no underlined word drawn). The jump check's last pass stays the one from block 3b. Evidence `workshop:test-evidence/plan78-QA-FREE-PLAY-01-NOGAME-try3.json`, `workshop:test-evidence/plan78-QA-FREE-PLAY-01-GAME-try4.json`.

**2026-10-01 (plan 78, Deck block 3b, build `b417c271`): both halves ran with no loop, no stop three times and no dead press; by the session's ruling the sweep's own rule (no repeated stop, no dead press, every stop visible by its entry edge) is met for the stops it has.** Every press that left the ring where it was moved the panel 80 px. The driver marked both halves unclear for reasons now filed under roadmap Bugs: walking Down, a long section's text is skipped when its spoiler cover is deep inside it; a section only a few pixels taller than the screen takes a whole extra press; underlined game words are stops walking Down but are skipped walking Up. The driver's fourth point (a tall section "entered from below" with its bottom about 84 px behind the dock) is, by the session's ruling, the section being read upward by scrolling after the ring left its cover, which is the intended reading step, not a landing; nothing is filed for it. With a game running the dock's top measured y 290, the same as with none. Evidence `workshop:test-evidence/plan78-QA-FREE-PLAY-01-NOGAME-try2.json`, `workshop:test-evidence/plan78-QA-FREE-PLAY-01-GAME-try3.json`.

**2026-10-01 (plan 78, Deck block 2, build `1fe0787a`): the half with no game running PASSED.** On a fresh five-section Strategy answer with two spoiler covers and two choice buttons: no stop twice (18 stops going up, 19 coming back down), no dead press, and every stop fully visible except the two known false alarms (the question row behind the Retry icon, the last section behind the Copy icon). Compared by the text's own line boxes, the question's text is clear of the Retry icon, but the answer's last line overlapped the Copy icon by 7 by 3 px; that is noted on the roadmap's corner-icon entry. With the game half in block 1, the sweep has passed in both halves this morning. Saved walk `workshop:checks/plan78-QA-FREE-PLAY-01-NOGAME.json`. Evidence `workshop:test-evidence/plan78-QA-FREE-PLAY-01-NOGAME.json`. It stays a standing row.

**2026-10-01 (plan 78, Deck block 1, build `57586da0`): the half with a game running PASSED, by the session's ruling.** No stop was visited twice (15 stops going down, 14 going up) and no press was dead; the two known false alarms were cleared by the text lines. The tall answer section shows 67 percent in both directions and is judged by the edge it is entered from. The half with no game running was run in block 2 (the entry above). Saved walk `workshop:checks/plan78-QA-FREE-PLAY-01-GAME.json`. Evidence `workshop:test-evidence/plan78-QA-FREE-PLAY-01-GAME-try2.json`. It stays a standing row.

**2026-09-30 (plan 77, block 4, build `7d84ee3b`): PASS (Deck):** 35 stops, 0 cycles, only the two known false alarms (question row behind Retry, last section behind Copy). Saved walk `workshop:checks/plan77-b4-QA-FREE-PLAY-01.json`. Evidence `workshop:test-evidence/plan77-QA-FREE-PLAY-01.json`. Two one-off sightings from the same session are on the watch list.

**2026-09-30 (plan 77, block 3, build `ec557922`, session's ruling): PASSED, both halves.** No game: 52 stops, 0 cycles, only the known false alarms. Game: 32 stops, 0 cycles, the known false alarms plus one section taller than the screen (entered going Up with its bottom at the dock). Evidence `workshop:test-evidence/plan77-P77-WALK-COVERS-MIRROR-R2.json`, `workshop:test-evidence/plan77-QA-FREE-PLAY-01-game.json`. It stays a standing row.

**2026-09-29 (plan 77, block 2, build `bce7d0fd`):** with no game running: PASS on a finished reply, one still arriving and another chat (only the two known false alarms; workshop:checks/P77-FREE-PLAY.json). With a game running: FAILED on the runbook line, since a 348 px section in a 206 px band cannot sit above the dock (top under the header on the Up landing); no cover could be tested, the game half is not done. The row stays open. Evidence `workshop:test-evidence/plan77-P77-WALK-COVERS-MIRROR-FREEPLAY.json`, `workshop:test-evidence/plan77-BLOCK2-GAME.json`.

A stop that is focused but not visible is a **FAIL of this row**, whatever the scripted rows say.
This is the manual interim for the DPS visibility oracle + `deck_sweep`
(decky-plugin-studio `docs/planning/06-visibility-oracle-and-free-play-sweep.md`); when that
ships, this row becomes one tool call diffed against a committed baseline, and this row's wording
becomes its acceptance test.

---

## Focus graph (mandatory before shipping new controls)

Policy: `bonsai://policy/decky-ui-focus`. Patterns: `bonsai://architecture/focus-graph-patterns`.

- [ ] **FOCUS-GRAPH-01** Every focus stop listed in the section parent
- [ ] **FOCUS-GRAPH-02** D-pad Up/Down reaches each stop (no skips)
- [ ] **FOCUS-GRAPH-03** Sliders / horizontal groups: Left/Right on the **focus owner** (bridge if needed)
- [ ] **FOCUS-GRAPH-04** Cross-section links via parent refs
- [ ] **FOCUS-GRAPH-05** Coverage note in [testing.md](testing.md) (template: any earlier control's coverage note)

References: `OllamaTab.tsx`, `PullModelsModal.tsx`. **The reasoning display's fold
row** (`show-reasoning`, a new stop between Retry and the answer, plan 57) adds: `MainTabChatTranscript.tsx`,
`replyStopRegistry.ts`, `liveTurnFocusGraph.ts`. **PASS (Deck) 2026-09-17, bundle `af52c0aa`:** the fold row
sits cleanly in the D-pad path — reachable from the question and the answer on both sides, always above the
dock, and backing out with Up three times lands safely on the chat-slot row with no dead end. Reaching it
going down from the Retry icon takes one extra press, since the question's own row is a stop in between —
see REASONING-02. Evidence `workshop:test-evidence/plan57-FOCUS-GRAPH-01.json`.

**Sum up this chat, the summary card and the note (plan 68, step 5 — Deck passes 2026-09-25 and 2026-09-26):**

- [x] Down from the tabs row lands on the *Sum up this chat* button. **PASS (Deck) 2026-09-26**, in the
      second pass's focus sweep (`workshop:test-evidence/plan68-FOCUS-SWEEP-p2.json`) and again in the third
      pass's walk down to the last row (`workshop:test-evidence/plan68-SUMUP-13-p3.json`).
- [x] Down from the button reaches the summary card, since it is taller than the room below the button and
      needs its own stop to be scrolled into view; Down again from the card reaches the first turn row.
      **PASS (Deck) 2026-09-25**, row SUMUP-03: walking down to the card and the first turn row, everything
      was visible. Evidence `workshop:test-evidence/plan68-SUMUP-03.json`, walk `workshop:checks/plan68-SUMUP-03-walk.json`.
      **Extended (Deck) 2026-09-26:** walking on down through all 73 turn rows of a long chat, every row
      stayed visible above the dock. Evidence `workshop:test-evidence/plan68-FOCUS-SWEEP-p2.json`.
- [x] Up from the button returns to the tabs row; Up from the card returns to the button. **PASS (Deck)
      2026-09-25**, row SUMUP-03: walking back up from the card and the first turn row, everything stayed
      visible. Evidence `workshop:test-evidence/plan68-SUMUP-03.json`. **Extended (Deck) 2026-09-26:** walking
      all the way back up from the last of the 73 turn rows, everything stayed visible too.
- [x] A on the button starts the summary and the ring stays on it; a greyed-out button still takes the ring
      and A on it does nothing. **PASS (Deck):** A started the summary and the ring stayed on the
      button until it finished (2026-09-25, row SUMUP-03, `workshop:test-evidence/plan68-SUMUP-03.json`); a
      greyed-out button took the ring, visible, three times on 2026-09-26 (`plan68-SUMUP-02-p2.json`,
      `plan68-SUMUP-07-p3.json`, `plan68-SUMUP-13-p3.json`). **A on a greyed-out button: PASS (Deck)
      2026-09-26 13:16** — nothing happened: no card, no summary starting, nothing new in the plugin log
      or the chat file. Evidence `workshop:test-evidence/plan68-SUMUP-GREYED-A-p4.json` (+ `.png`).
- [x] B from anywhere in the tab closes the whole panel. **PASS (Deck) 2026-09-25**, row SUMUP-04a: B closed
      the panel. Evidence `workshop:test-evidence/plan68-SUMUP-04a.json`. **Extended (Deck) 2026-09-26:** B also
      closed the panel from the *Sum up this chat* button, from the summary card, and from a turn row, each
      time landing the ring back on Show details. Evidence `workshop:checks/plan68-session-tab-B-closes.json`.
- [x] With no turn rows at all, Down from the last stop in the tab stays put rather than falling into the dock.
      **Cannot happen in normal use (2026-09-26):** every answer on the Deck carries context chips (checked
      across all 8 chats), so a Session tab with no turn rows never comes up. Stays covered by the unit test
      `SessionContextStrip.test.tsx`. Evidence `workshop:test-evidence/plan68-SUMUP-GREYED-A-p4.json`.
- [x] Up from the dock into a newest answer whose Session tab is open lands on the last stop in the tab, not
      the button at the top. **PASS (Deck) 2026-09-26:** Up from the dock landed on the last turn row's
      chips, visible. Evidence `workshop:test-evidence/plan68-FOCUS-SWEEP-p2.json`.
- [x] Down from the Session tab's last turn row reaches that row's own chips, not something outside the tab
      (**SUMUP-13**). **FAILED (Deck) 2026-09-26:** it jumped over the chips to "Save chat to Desktop"
      outside the tab, with the chips on screen right there. **Fixed the same night (`23ec6949`).**
      **PASS (Deck) 2026-09-26, third pass:** on a 14-turn chat, Down from the last row landed on the chip
      row, fully visible (282-600, dock top 600, touching, not overlapping). A saved 14-step walk also
      passed. Evidence `workshop:test-evidence/plan68-FOCUS-SWEEP-p2.json`,
      `workshop:test-evidence/plan68-SUMUP-13-p3.json` (+ `.png`), saved check `workshop:checks/plan68-SUMUP-13.json`.
- [x] On a turn row's own chips, Down steps through every chip and then stays on the last one, rather than
      moving elsewhere. **PASS (Deck) 2026-09-26:** Down stepped through all 7 chips and then stayed put.
      Evidence `workshop:test-evidence/plan68-FOCUS-SWEEP-p2.json`.
- [x] Down from the answer's last paragraph (or its Copy icon) reaches the note under it; Down again
      continues down the reply; Up goes back to the answer. **PASS (Deck) 2026-09-25**, row SUMUP-02: Down
      from the answer reached the note first, visible (note bottom 523, dock 600); Up returned to the
      answer. Evidence `workshop:test-evidence/plan68-SUMUP-02.json`.
- [x] A on the note opens Show details on the Session tab and moves the ring to the button. **PASS (Deck)
      2026-09-25**, row SUMUP-02: A on the note opened Show details on the Session tab with the ring on the
      button. Evidence `workshop:test-evidence/plan68-SUMUP-02.json`.
- [ ] The ring is visible above the dock, not just focused, at every one of the stops above. **Not proven**:
      the summary card itself sat behind the dock in this pass (new bug, filed on the roadmap).

**New controls from plan 92 (2026-10-12; Search tab = plan 90 lane N3, models column = plan 91 lane M1, About = lane T3, folded Ollama tab = lane T0):**

*The Search tab (landed 2026-10-12; Deck rows P90-SEARCH-TAB-WALK, -WORDS, -GAMES, -SETTINGS, -KB; run on the Deck 2026-10-12, builds `649daecc` and `3115f3de`):*

- [x] The game row: Down from the tab bar lands on it, and picking a game narrows the matches. **PASS (Deck) 2026-10-12**, rows P90-SEARCH-TAB-WALK (second round, `workshop:test-evidence/plan92-P90-SEARCH-TAB-WALK-try2.json`) and P90-SEARCH-GAMES (`workshop:test-evidence/plan92-P90-SEARCH-GAMES.json`).
- [x] The find box: reached by Down after the game row, visible, no stop twice. **PASS (Deck) 2026-10-12 on the second round**, row P90-SEARCH-TAB-WALK, `workshop:test-evidence/plan92-P90-SEARCH-TAB-WALK-try2.json`.
- [x] The word buttons: each reached by the D-pad; A lists the matches with the word highlighted. **PASS (Deck) 2026-10-12**, row P90-SEARCH-WORDS, `workshop:test-evidence/plan92-P90-SEARCH-WORDS.json`.
- [x] The match rows (Steam settings page opening) and the game-note sheet (library installed, then removed and installed again) passed on the Deck 2026-10-12 and 2026-10-14, rows P90-SEARCH-SETTINGS and P90-SEARCH-KB; moved to [the closed archive](archive/testing-manual-closed-2026.md#plan-93-docs-sweep-2-2026-10-14).
- [ ] The notes list (before a word is picked): each note's on and off switch is reached. **Owed (Deck)**; the note card now exists (second night, below), but the Search tab's own list was not walked.

*The About tab (landed 2026-10-12, build `5d67f9d9`):*

- [x] The "What bonsAI is" row: reached by Down from the tab bar; its paragraph shows only while it has the ring. **PASS (Deck) 2026-10-12**, row P91-ABOUT-ROWS (height and paragraph half), evidence `workshop:test-evidence/plan92-P91-ABOUT-ROWS.json`.
- [x] The link buttons (GitHub, Built on Ollama!, Bugs & Feature Requests): Down walks all three. **PASS (Deck) 2026-10-12 on the second round** (`649daecc`), row P91-ABOUT-ROWS, `workshop:test-evidence/plan92-P91-ABOUT-ROWS-try2.json`; the first try failed (Down from GitHub was dead).
- [x] The QR button: Right from GitHub reaches it, Left returns to GitHub, A opens the support page in Steam's browser. **PASS (Deck) 2026-10-12**, row P91-ABOUT-LINKS, evidence `workshop:test-evidence/plan92-P91-ABOUT-LINKS.json`.

*The AI models box, filters column (landed 2026-10-12, build `b6d8e9a6` on the Deck):*

- [x] The column's rows (Clear, the licence rows, Good for, Show) and the list reached with Down and Up in the right order, the greyed licence row skipped. **PASS (Deck) 2026-10-12 on the second round** (build `3115f3de`), row P91-MODELS-COLUMN-WALK, `workshop:test-evidence/plan92-P91-MODELS-COLUMN-WALK-try2.json`; the first try failed.
- [x] Right from Vision or Installed only reaches the first row's star; Left returns to the same column row. **PASS (Deck) 2026-10-12**, same row and evidence file.

*The folded Ollama tab (landed 2026-10-12, `5377006b` to `5ea2a26b`; Deck rows P91-FOLD-OLLAMA, P91-STRIP, P91-FOLD-ALL-BUTTON):*

- [x] A section's line: reached by the D-pad; A opens or closes it. **PASS (Deck) 2026-10-12 on the monitor**, rows P91-FOLD-OLLAMA and P91-FOLD-NAMES (`workshop:test-evidence/plan92-P91-FOLD-OLLAMA.json`, `workshop:test-evidence/plan92-P91-FOLD-NAMES.json`). The "under 430 points" test on the Deck's own screen passed in plan 92's second night (closed 430 against 430 visible), row P92-FOLD-SWITCH, `workshop:test-evidence/plan92-P92-FOLD-SWITCH.json`.
- [x] The help strip: shows the ringed row's text on the same frame, and the row clears it. **PASS (Deck) 2026-10-12**, row P91-STRIP, `workshop:test-evidence/plan92-P91-STRIP.json`.
- [x] The floating open-all button: Right from a section line reaches it; A opens or closes every section; any other press returns. **PASS (Deck) 2026-10-12**, row P91-FOLD-ALL-BUTTON, `workshop:test-evidence/plan92-P91-FOLD-ALL-BUTTON.json`.

**New controls from plan 92's second night (2026-10-12; builds `74e6167c` and `f4215cf1`, run on the Deck's own screen):**

*The note card (plan 90 lane N2; Deck rows P90-NOTE-CARD, P90-NOTE-COMMAND):*

- [x] The card under the answer: Keep, Edit and Not now each reached by the D-pad (Up from the question box walks chip, source row, Show details, For line, Keep); the ring is on Keep when the answer finishes. **PASS (Deck) 2026-10-12, second try (build `b8d9575f`):** the ring was on Keep when the answer finished. The first try (build `74e6167c`) failed on that ring: it was on the question box (`workshop:test-evidence/plan92-P90-NOTE-CARD.json`). Row P90-NOTE-CARD, `workshop:test-evidence/plan92-P90-NOTE-CARD-try2.json`.
- [x] The For line: A flips between this game and every game, and back. **PASS (Deck) 2026-10-12**, row P90-NOTE-CARD, same evidence file.
- [x] Keep turns the card into "Kept." with the ring on Show details; Not now removes the card and the ring goes to Show details. **PASS (Deck) 2026-10-12**, rows P90-NOTE-CARD and P90-NOTE-COMMAND (`workshop:test-evidence/plan92-P90-NOTE-COMMAND.json`).

*The "Read N of your notes" line and the notes sheet (Deck rows P90-NOTE-LINE, P90-NOTE-READ, P90-NOTES-SHEET):*

- [x] The line sits between the question and the answer. **PASS (Deck) 2026-10-12**, row P90-NOTE-LINE, `workshop:test-evidence/plan92-P90-NOTE-READ.json`.
- [x] A on the line opens the sheet with the ring on Close; the note's switch and its bin are reached by the D-pad (a note's switch and its bin are one row you move along with Left and Right); A on the switch toggles it; B closes the sheet and the ring returns to the line. **PASS (Deck) 2026-10-12, third try (build `e6afe2bd`):** B returns the ring to the line (at once, 1 s, 2 s) and a Down 0.35 s after B is followed, three of three. Row P90-NOTES-SHEET, `workshop:test-evidence/plan92-P90-NOTES-SHEET-try3.json`; the second try (build `b8d9575f`) failed only the quick Down (`plan92-P90-NOTES-SHEET-try2.json`), the first try (build `74e6167c`) failed on B and on Left from the bin (`plan92-P90-NOTES-SHEET.json`).

*The search jump, the Back line, B and Y (plan 90 lane N3b; Deck rows P90-SEARCH-JUMP-BACK, P90-SEARCH-B, P90-SEARCH-Y):*

- [x] A on a chat match: the chat opens on the matched question and the ring is on that question. **PASS (Deck) 2026-10-12, second try (build `b8d9575f`):** the ring was on the matched question at the first look (0.4 s) and unchanged to 4.5 s; a quick Down was not pulled back. The first try (build `f4215cf1`) failed: the ring was on the day row two above it (`workshop:test-evidence/plan92-P90-SEARCH-JUMP-BACK.json`). Row P90-SEARCH-JUMP-BACK, `workshop:test-evidence/plan92-P90-SEARCH-JUMP-BACK-try2.json`.
- [x] The Back line ("‹ Back to where you were") is the first stop under the tab bar; A returns to Search with the same word and the ring on the same match; the line is gone after leaving Search. **PASS (Deck) 2026-10-12**, row P90-SEARCH-JUMP-BACK, same evidence file.
- [x] B on the Search tab returns to the tab you came from (Main, About), Quick Access still open. **PASS (Deck) 2026-10-12**, row P90-SEARCH-B, `workshop:test-evidence/plan92-P90-SEARCH-B.json`.
- [ ] Y from the question box on Main opens Search with the ring on the find box; Y on the Ollama tab does nothing. **PASS (Deck) 2026-10-12**, row P90-SEARCH-Y, `workshop:test-evidence/plan92-P90-SEARCH-Y.json`. **Still owed:** Y with Steam's on-screen keyboard open (the maintainer's hand check).

*The folded Settings and Developer tabs (plan 91 lanes T1 and T2; Deck rows P91-FOLD-SETTINGS, P91-FOLD-DEVELOPER):*

- [x] A section's line on Settings: reached by the D-pad, A opens or closes it, 22 Downs each move the ring, none twice; Left and Right on Text size move the page 0 points. **PASS (Deck) 2026-10-12**, row P91-FOLD-SETTINGS, `workshop:test-evidence/plan92-P91-FOLD-SETTINGS.json`.
- [x] A section's line on Developer: reached by the D-pad, A opens or closes it, a 24-stop Down walk with no dead press; the strip's words follow a pick. **PASS (Deck) 2026-10-12**, row P91-FOLD-DEVELOPER, `workshop:test-evidence/plan92-P91-FOLD-DEVELOPER.json`.
- [x] The floating open-all button on both tabs: Right from a section line reaches it, A opens or closes every section, Left returns to the first line. **PASS (Deck) 2026-10-12**, rows P91-FOLD-SETTINGS and P91-FOLD-DEVELOPER, same evidence files.

*Folded tabs on a tab switch and the AI models box (Deck rows P92-FOLD-SWITCH, P92-MODELS-BESIDE):*

- [x] After LB or RB onto a folded tab the sections are closed, the page is at its top and the ring is on the first section line. **PASS (Deck) 2026-10-12, second try (build `b8d9575f`):** ten of ten trips closed, at the top, the ring on "Where AI runs"; a Down right after arriving stays; LB and RB from the floating button switch tabs every time. Arriving on Main or Permissions the ring is in the tab's content, not on the bar: Steam's normal behaviour for any shoulder switch, not a fault. The first try (build `74e6167c`) put the ring on the last line after RB then LB, twice: `workshop:test-evidence/plan92-P92-FOLD-SWITCH.json`. Row P92-FOLD-SWITCH, `workshop:test-evidence/plan92-P92-FOLD-SWITCH-try2.json`.
- [x] The AI models box: Right from a filter and Left from a star reach what sits beside the ring; only one box open. **PASS (Deck) 2026-10-12, second try (build `b8d9575f`):** Refresh to Advanced and back both ways, twice; spot checks level (6.3 px and 29.9 px); one box. The first try (build `f4215cf1`) passed the 12 filters and 4 stars and failed the title row (`workshop:test-evidence/plan92-P92-MODELS-BESIDE.json`). Seen once, watched: the first Left on Advanced right after the box opened did nothing. Row P92-MODELS-BESIDE, `workshop:test-evidence/plan92-P92-MODELS-BESIDE-try2.json`.

---

## Cross-cutting smokes

| ID | Name | Tier | Setup | Covers |
|----|------|------|-------|--------|
| **SMOKE-A** | Golden path | 0 | S0, BPM | Shell, tabs, Ask, connection, D-pad chunks, presets |
| **SMOKE-C** | Permission gate | 0 | S0 | Capability blocked-action toast |
| **SMOKE-F** | Deterministic commands | 0 | S0, no model | Sanitizer, shortcut-setup |
| **SMOKE-B** | TDP apply 8W — retired 2026-09-03, D57 #6: TDP apply was removed 2026-07-30 | — | — | — |
| **SMOKE-E** | Strategy one-shot | 1 | S1 | Mode, spoilers, Spoilers OK Tap-to-reveal PASS (Deck) 2026-09-04. |
| **SMOKE-D** | Frozen carousel triple | 1 | S1 | Presets troubleshooting — **verified** |
| **SMOKE-G** | Vision attach once | 1 | S1, Media | Attach + multimodal — **verified** |
| **SMOKE-H** | Background Ask reopen | 1 | S1 | Close QAM while pending → restore |

**Tier 0 (~15 min):** A → C → F · **Tier 1 (~20 min):** E → confirm D/G → H

---

## Tier 0 — Quick wins (S0)

BPM (Desktop → Big Picture → QAM → bonsAI). Ollama reachable.

### SMOKE-A — Golden path (P0)

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).


### SMOKE-C — Permission gate (P0)

**Current state:** the deny half passes (a blocked capability answers with the capability message, no
model call). The **Open Permissions** jump is a real D-pad stop and, as of 2026-09-23, lands on the
right toggle — see PERM-JUMP-01 below for the timing. History (the 2026-09-03 block and the intermediate
2026-09-16 wrong-row failure):
[testing-manual-history-2026.md § SMOKE-C](archive/testing-manual-history-2026.md#smoke-c).

- [x] Turn a capability **off** → blocked action → **Open Permissions** (or troubleshooting hint button) → lands on matching toggle → **Back to …** returns → no crash. **PASS (Deck) 2026-09-26 (plan 70, flow 2d.2), reworded:** with Steam ban lookup off, `bonsai:vac-check` was denied at once with no model call (confirmed by Ollama's own last-use times, unchanged); "Open Permissions" landed on the right switch both times it was tried (from the deny row and from the troubleshooting hint); the page has no plain "Back to …" button that returns from the Permissions tab — the working return is walking up to "Back to Main" and pressing A, which comes back to Main cleanly with the ring on "Open Permissions" and the panel never closing. A bare B press only moves the ring to the tab bar; it does not return by itself. Evidence `workshop:test-evidence/plan70-SMOKE-C.json`.

### PERM-JUMP-01 — Permission jump D-pad (P0)

Capability off for each row; trigger the deny surface; D-pad to **Open Permissions** → Permissions tab → matching toggle focused → **Back to …** → prior tab.

**PASS (Deck) 2026-09-23, fixed in `af53b7d`, timed to the millisecond (plan 64, flow E):** the ring reached the **Read game & screenshot context** switch 2,736 ms after pressing **Open Permissions** — then was still pulled away to **Back to Main** 22 ms later, the same wrong landing as before — but this time came back to the switch about 100 ms after that and stayed there for the rest of the 11.6-second recording. A person would at most see a brief flicker through **Back to Main**, not land on the wrong row. Evidence `workshop:test-evidence/plan64-PERM-JUMP-01-try2.json`.

History (the 2026-09-03 block and the two earlier FAIL runs this fix replaced):
[testing-manual-history-2026.md § PERM-JUMP-01](archive/testing-manual-history-2026.md#perm-jump-01).

| Capability | Deny surface | Expected toggle |
|------------|--------------|-----------------|
| `media_library_access` | Attach recent screenshot (browser empty / error) | Read game & screenshot context |
| `steam_logs_read` | Troubleshooting Ask hint on Main | Read game & screenshot context |
| `filesystem_write` | Save note to Desktop / Developer app-log row | Save files to Desktop |
| `microphone_access` | Ask bar mic / Settings → Voice install | Voice input (microphone) |

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).

### ONBUTTONDOWN-AUDIT-01 — onButtonDown whitelist + direction handlers (P1)

Wave 4 G — confirm D-pad directions do not trigger A-only actions; direction handlers fire on device.

**Deck result 2026-09-03:** Left on the Reply style, keep-alive and custom-timeout sliders steps the value once and then lets the ring leave the plugin to the Quick Access rail; Right steps and stays. See [testing.md](testing.md) and the roadmap Bugs entry.

- [ ] Collapsed **Context used · tap for details** hint: D-pad **Down** past it does **not** expand; **A** expands

**This row decides an open question, so record what happens rather than just pass/fail.** Wave 4 G
removed `onMoveLeft`/`onMoveRight` from `buildDeckThumbNavHandlers` and the UI-scale bridge, leaving
`onButtonDown` as the only horizontal path — while *keeping* `onMoveUp`/`onMoveDown` on the same
object. Both cannot be right: the old string predicates provably never matched a `GamepadEvent`
(`focusNavigation.test.ts` asserts it), so before Wave 4 the `onMove*` handlers were doing all of the
work, and "redundant twins" was the one thing they could not have been. Watch for two distinct
failures:


**Fixed at the desk 2026-09-04** for all four sliders — the three `DeckFocusSlider` consumers
(**Ollama keep-alive**, **Reply verbosity**, **Connection timeout**) and the **Settings → UI scale
manual profile bridge** (the last bullet in the row above). It was the second outcome above: both
`buildDeckThumbNavHandlers` (`DeckFocusSlider.tsx`) and the UI-scale bridge's own `bridgeSliderNav`
(pulled out into an exported `buildUiScaleBridgeNav`, `SettingsTabUiScaleSection.tsx`) now step on
`onMoveLeft`/`onMoveRight` and return `true` to claim the move, with no direction branch left in
`onButtonDown` to double-step. The slider half was re-run and passed 2026-09-26 (below).

**PASS (Deck) 2026-09-26 (plan 70, flow 2b.6), slider half closed.** All four sliders (Reply style, Keep models
loaded, Connection timeout, UI size manual) — Left and Right each changed the value by one step and
the ring never left the slider for Steam's own Quick Access rail. Note: the two-handle Connection
timeout slider only steps a handle after A picks it first (by design, written at the top of its own
code); without A, Left holds still and Right just moves the ring to the other handle. Every setting
read back unchanged afterward. Evidence `workshop:test-evidence/plan70-ONBUTTONDOWN-AUDIT-01.json`.
**Boxes 2 to 4 PASSED (Deck) 2026-10-02 (plan 79, build `f0a4f2c4`, no game, a test chat with 87 earlier turns) and moved to [the closed archive](archive/testing-manual-closed-2026.md):** the session strip, the Show details link and the collapsed turn header. Box 4 reads as the Deck showed it: Down from a collapsed header goes to the next header and never onto an answer section (by design), and Down from an open header lands on its Show reasoning line, visible. Evidence `workshop:test-evidence/plan79-ONBUTTONDOWN-AUDIT-01.json`. **Still owed under ONBUTTONDOWN-AUDIT-01:** box 1 (the collapsed hint, not on screen anywhere, see the note below) and the "summed itself up" note half of the Show details box, which was not tested (opening an older turn closes the newest, so its note was 87 rows away).

**Note 2026-10-02 on the first box (the collapsed "Context used" hint):** no screen can show it any more. Every place that draws the context chips passes `collapsedHint={false}` (`src/features/answer/details/SessionContextStrip.tsx`, `src/features/answer/details/buildDetailsPanelElement.tsx`), so the collapsed hint is never drawn. The box is left open; whether to retire it is the maintainer's call.

### DOC-SWEEP-01 — global document realm fixes (P1)

Wave 4 H — confirm each path works on-Deck (SharedJSContext vs QAM popup document).

Re-run 2026-09-03 after plan 30: Settings Up lands on the bar; full sweep every stop visible (`workshop:test-evidence/DOC-SWEEP-01-settings-free-play.json`).

- [ ] Submit Ask: focused field blurs before send (keyboard focus does not stick mid-Ask). **PASS for
      the send itself, blur moment UNCLEAR (Deck) 2026-09-26 (plan 70, flow 2b.5):** right after a fresh
      plugin reload, the first question sent correctly on the first try, no wrong-page failure, the box
      emptied and the answer arrived normally. The exact blur-before-send moment itself could not be
      watched: the only way to send while the field still holds keyboard focus is the on-screen
      keyboard's Enter, which the rig's own rules forbid pressing on the question box; by the D-pad
      route the field had already lost focus to the Ask button before the press. Evidence
      `workshop:test-evidence/plan70-DOC-SWEEP-01.json`.
- [x] Attachment row: **Right** from preview → remove button; **Left** back. **PASS (Deck) 2026-10-01 (plan 78, block 3a,
      build `c8d6b094`):** Right from the preview reached "Remove attachment" and Left came back to the
      preview, both fully visible, 2 of 2 presses moved focus. The preview is reached with Left from the
      question box (the attach icon) and then Down, not by Up or Down from the box or the Ask button, which
      skip the bar. After the screenshot picker closes, no control holds the highlight until the next press.
      Evidence `workshop:test-evidence/plan78-DOC-SWEEP-01.json`.
- [ ] Preset carousel: auto-advance pauses while a chip has D-pad focus. **Checked in decode style
      (Deck) 2026-09-26:** the chip kept sampling new prompts while it held the ring — the pause only
      applies to the carousel style this box was written for, checked separately under
      **PRESET-ONE-LINE-03** (passed there). Not itself a fail. Evidence
      `workshop:test-evidence/plan70-DOC-SWEEP-01.json`.
- [x] About → GitHub link: **Up** focuses reply-language dropdown. **PASS (Deck) 2026-09-26:** Up from
      GitHub landed on the reply-language dropdown ("Follow system"), visible; Up again reached the
      About tab strip. Evidence `workshop:test-evidence/plan70-DOC-SWEEP-01.json`.
- [x] Settings/Ollama: **Up** at panel top returns to active tab strip. **PASS (Deck) 2026-09-26:** on
      both the Ollama tab ("Run AI on this Deck") and the Settings tab ("Adjust UI automatically"), Up
      returned to that tab's own strip. Saved walk `workshop:checks/plan70-DOC-SWEEP-01-settings-top-up.json`.
      Evidence `workshop:test-evidence/plan70-DOC-SWEEP-01.json`.
- [ ] **Do the blur and attachment-row checks on the very first Ask of a fresh plugin open**, before
      any answer has rendered. Until 2026-08-07 the document was learned only from the answer-bubble /
      answer-stop / spoiler-fence registries, so everything above worked from the second Ask onward
      and silently used the wrong document on the first. `BonsaiPluginShell` now seeds it at mount;
      this is the check that proves it.
- [x] Expand collapsed history turn: header scrolls into view. **PASS (Deck) 2026-09-26:** opened "4
      earlier", walked down three collapsed headers and expanded one — its header stayed fully in view,
      ring on it, with no scroll of the pane itself. Evidence `workshop:test-evidence/plan70-DOC-SWEEP-01.json`.

### PRESET-STREAM-ANIM-01 — decode preset chip animation (P1)

Ghost in the Shell chip decode (2026-08-28) — replaces the old `stream` typewriter mode; row
kept its id since it is testing the same slot in the mode list. Developer tab → Preset
suggestions → **decode**.

- [x] Each chip arrives as a full-width block of scrambled green glyphs (not a growing/reflowing
      string — the chip's width should look settled from the first frame, not still catching up).
      **PASS (Deck) 2026-09-26:** a screen recording cut to 10 frames a second shows the real words
      locking in from the left behind a solid block caret over about 1.5 seconds, full width from the
      first frame. Evidence `workshop:test-evidence/plan70-PRESET-STREAM-ANIM-01.json` (+ strip screenshot).
- [x] Chips stay D-pad focusable while glyphs are still churning (A selects the full prompt, not
      whatever is on screen mid-churn). **PASS (Deck) 2026-09-26:** with the ring on the chip, it
      churned to a new question and the ring stayed; A pressed mid-churn filled the Ask field with the
      whole finished prompt, no symbols.
- [x] With OS **prefers-reduced-motion: reduce**, chips swap instantly (no scramble, no caret). **PASS
      (Deck) 2026-09-26 (plan 70, flow L5):** 13 chip label changes watched across two answers and a
      wait, each swapping from one whole label to the next with no scrambled letters and no caret at any
      point (once through a brief empty label instead). For contrast, the same setting with reduced
      motion off showed 40-plus reads of scrambled letters and a caret while decoding. Evidence
      `workshop:test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`.

**Judged good by the maintainer 2026-09-14**, which is what this row was waiting on. The boxes above that
are still empty were never walked one by one; the measurement on 2026-08-28 covered the frame rate and the
ring during churn. See the row in [testing.md](testing.md).

### SMOKE-F — Deterministic commands (P2)


**Re-confirmed together (rig) 2026-09-17:** all four built-in commands answered at once with the same fixed
wording each carries above. Evidence `workshop:test-evidence/plan57-QA-SMOKE-F.json`.

---

## Tier 1 — Core shipped (S1)

### SMOKE-B — TDP apply 8W (retired)

Retired 2026-09-03 under D57 #6: it tested TDP apply, which was removed 2026-07-30, so there is nothing left to run.
Tier 1 now starts at SMOKE-E; the ID stays so older links still resolve.

### SMOKE-E — Strategy one-shot (P1)

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).


### SMOKE-H — Background Ask reopen (P1)

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).


### Tier 1 extras

- [x] "What game am I playing?" with game focused — **PASS (Deck) 2026-09-18:** asked with Half-Life 2 running and focused, the plugin named the game correctly and gave real Half-Life 2 advice with a note card attached. Evidence `workshop:test-evidence/plan61-tier1-what-game.json`.

---

## Tier 2 — Opt-in (run when touching related code or before RC)

| Block | Checklist |
|-------|-----------|
| **Proton logs** | PROTON-LOG-01…03 — auto-attach when **Read game & screenshot context** is on (troubleshooting Ask + AppID) |
| **Permissions cleanup** | PERMS-CLEAN-01…06 — About/Steam links no gate; no Open web links / Adjust power limits toggles; no journal / intent-pack / Response verification UI; troubleshoot hint dismissible |
| **Token streaming** | STREAM-01…05 spot; Strategy spoiler stream if flag on. **After Phase A (2026-08-07):** re-run STREAM-01/02 (P2/P3 changed the flag-off path), and STOP-PARTIAL-01 with real streamed text — Stop must keep the drafted answer under a *"Stopped — partial answer kept."* line, and must return the question to the ask field when nothing readable had arrived |
| **Token streaming — D-pad chain** | **STREAM-09**, rewritten for Phase B (2026-08-07). **D-pad only, no touch.** Long Strategy answer with streaming on: Down from the turn header steps into the answer and then through it **one section at a time**, each landing visibly marked (blue left edge); Down at the last visible section scrolls, and the next press lands on what it revealed; Down past the end reaches the reply actions and Up from the first section reaches the header — **no dead ends**; a masked spoiler is offered before the walk passes it, and **A on a spoiler wait chip must not unmask**; a section arriving mid-stream does not steal focus; the same walk works on a collapsed-then-reopened history turn. **Check after a QAM close/reopen and while the answer is still growing** — nested-Focusable survival at this count is the one unproven thing in Phase B. Full row and the fallback if it fails: [testing.md](testing.md) **STREAM-09 PASS (Deck) 2026-09-04:** three `.bonsai-answer-stop` sections on one reply, each `tabindex="0"`, each taking the ring in turn going Down. Note Up skips them — filed under Bugs. |
| **Token streaming — scroll follow** | **STREAM-FOLLOW-01** (new, 2026-08-07). Sitting at the bottom, new text stays on screen with no input; scrolling up mid-answer holds position (check **touch and D-pad separately**); scrolling back down resumes the follow; the follow stops at the end of the transcript, so the session context strip and Save chat are not dragged into view **STREAM-FOLLOW-01, D-pad half PASS (Deck) 2026-09-04:** `scrollTop` held 0 while the answer fitted, then tracked the growing `scrollHeight` (84 → 174 → 270 → 516 as height went 789 → 1220), a constant ~55-85px above the true bottom, which is the sticky Ask bar. The touch-drag half stays with the maintainer. **STREAM-REVEAL-01 PASS:** sampled every ~300ms from the Ask press — first text at 5.4s, then 126 → 142 → 256 → 335 → 404 → 493 → 622 → 747 → 812 → 1025 → 1298 characters, steady, no freeze-then-dump. |
| **Strategy depth** | Spoiler policy, checklist persist, cheat gating |
| **KB** | KB-SMOKE-03, 05–10; KB-EVAL-01 before Phase 6 |
| **Character / Pyro** | One preset Ask; Pyro easter egg if touching character |
| **mDNS / Desktop notes / Model policy** | Spot when those paths change |
| **Voice STT** | VOICE-01…07 (mic required) |
| **Context ladder / micro-actions** | CONTEXT-LADDER-01…03; MICRO-01…05 (open bugs) |
| **D-pad scroll / tabs** | D-PAD-SCROLL-02 (choppy Strategy scroll bug); TAB-SWITCH-01 (LB/RB strip shuffle) |
| **Data clear** | DATA-CLEAR-01 (permissions/settings wipe survives reopen) |
| **Reply language** | LANG-01…03 (**LANG-01** Follow system on load — passed (Deck) 2026-09-26; **LANG-02** About tab Down order — passed (Deck) 2026-10-01, `workshop:test-evidence/plan78-LANG-02.json`; **LANG-03** Japanese reply — partial (Deck) 2026-10-01: the Speed reply passed, the Strategy choice labels stayed English, still owed, `workshop:test-evidence/plan78-LANG-03.json`) |

### Open regression IDs (bugs / recent ships)

- [ ] **P97-L10-RENAME-KEYBOARD-HAND** The maintainer's own controller (which one and how it connects is not known yet). Rename chat on Main: open the chats menu, pick Rename chat, press A on the name field. **Pass when:** Steam's on-screen keyboard comes up, a typed letter lands in the name, and Save renames the chat. Owed since 2026-10-22 (plan 97 L10, `1a7491ce`): the test rig already passed before the fix, so only the maintainer's own controller can show whether the fix helps. The maintainer: "I'm just using a controller. Yes pressing A on a text input box should bring up the keyboard." Evidence of the rig run `workshop:test-evidence/plan97-A-RENAME-RIG.json`. Deck row P97-L10-RENAME-KEYBOARD in [testing.md](testing.md) passed with the rig on 2026-10-22 (build `15565346`, `workshop:test-evidence/plan97-P97-L10-RENAME-KEYBOARD.json`); this check is still owed.
- [ ] **P97-L11-PC-PACE-EYE** The maintainer's eye on a recording. Watch `workshop:test-evidence/plan97-P97-L11-PC-PACE-try2.mkv` (48 s, the Deck's screen while the AI on the PC writes an answer, the pace switching between the PC's and the Deck's every 2.5 s). **Pass when:** the PC's pace reads as a little quicker without looking choppy or rushed, and the scrambled tail looks right. Owed since 2026-10-22 (plan 97 L11, `03356a0e`); the frame rate already passed (57.1 against 56.1, row P97-L11-PC-PACE, archived in [archive/testing-closed-2026.md](archive/testing-closed-2026.md#moved-from-testingmd-2026-10-22-plan-97-fourth-sweep-closed-rows)).
- [ ] **P93-B6-NOTE-OFFER** Proven by its tests only. The Deck rig cannot reload only the screen side of the plugin (reloading only the Quick Access page leaves it blank; plan 97 block C, `workshop:test-evidence/plan97-P93-B6-NOTE-OFFER.json`), so the kept or dismissed note offer coming back after a screen-only reload has no Deck check. Listed here so the maintainer can accept it as tests-only or name a route. Row in [testing.md](testing.md).
- [ ] **STRAT-SPOIL-DRG-01** DRG Survivor boss names not false-positive spoilers — ship gate is the three **required** rows below; acceptance is *no spoiler fence rendered for the entity named in the question* (display-level, not a claim about model behavior). Plan 54 landed 2026-09-15; the three new sub-rows below cover it. All rows in this block run in plan 55's Deck pass.
  (DRG-01, DRG-01c, DRG-01d, DRG-01-STREAM-01, HADES-NAMED-01, STRAT-SPOIL-FIRST-01 and STRAT-SPOIL-TEXT-01 passed and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).)
  - [ ] **HADES-UNNAMED-STREAM-01** (**FAIL (Deck) 2026-09-18, open**) — companion check for the fix above, so nothing was over-relaxed. Hades `1145360`, a question that does **not** name a boss, streaming on → the mid-stream mask chip **still appears** for story-adjacent detail (Hades shares the `roguelike` genre with DRG Survivor, so this is the case the R4 fix must not touch) — **Not claimed 2026-09-15**: the fast poll never saw the mid-stream chip. A recording exists (`recordings/DeckRecord_20260915_205114_game.mkv`, untracked) for the maintainer to play back. **Tried again 2026-09-18 with Hades running, blocked:** the same Ask-box freeze as the roadmap's three-star focus entry stopped the question from being sent. Evidence `workshop:test-evidence/plan61-HADES-UNNAMED-STREAM-01.json`. **FAIL (Deck) 2026-09-18, later the same night:** sent cleanly with no focus trap this time. The reply streamed all the way through as plain, readable text — no mid-stream mask chip, no "Spoiler hidden until complete…" chip, no tap-to-reveal block, at any point. Evidence `workshop:test-evidence/plan61-HADES-UNNAMED-STREAM-01-retry2.json`, screenshot `screenshots/DeckCapture_20260918_115623_auto.png`.
  - [ ] *(recommended)* **HADES-UNNAMED-01** Hades, a question that does **not** name a boss → story-adjacent detail **still fenced**. This is the genre over-relax guard: Hades shares the `roguelike` genre with DRG Survivor — **Mixed on the Deck 2026-09-15, three runs, all recorded honestly.** *"what happens when i finally reach the surface in hades"* got **no fence** and a mild story spoiler in plain text — **FAIL as written** (`workshop:test-evidence/plan55-HADES-UNNAMED-01.json`). *"how does the story of hades end"* and *"who is waiting at the end of the game in hades"* both got a masked fence — **PASS** (`workshop:test-evidence/plan55-HADES-UNNAMED-01-run2.json`, `workshop:test-evidence/plan55-HADES-UNNAMED-STREAM-01.json`). **Re-run FAIL (Deck) 2026-09-17:** *"what happens when you reach the surface"* in Hades came back as plain, unmasked text again, no spoiler block. Still mixed, not closed. Evidence `workshop:test-evidence/plan57-QA-HADES-UNNAMED-01.json`. **A fourth try, planned 2026-09-18 with Hades running on a new phrasing, was blocked** before it could be asked — the same Ask-box freeze as the roadmap's three-star focus entry. Evidence `workshop:test-evidence/plan61-HADES-UNNAMED-01-try4.json`. **The fourth try ran later the same night, sent cleanly with no focus trap — FAIL (Deck) 2026-09-18:** *"how do i beat the boss at the end of the first area"*, no boss named, in Hades. The reply gave general fight advice in plain text with no spoiler box anywhere and no boss named either. Three of the four phrasings tried since 15 September have now come back open; only the two "how does the story end" / "who is waiting at the end" phrasings passed. Evidence `workshop:test-evidence/plan61-HADES-UNNAMED-01-retry2.json`. **Tried again 2026-09-26 (plan 70, flow L1), UNCLEAR:** three new phrasings, no game running, none showed a protected word (Persephone, mother, Demeter) at any of the 250 ms reads. One answer put its story part behind a cover; the other two gave no story detail at all, so there was nothing to cover — a dodge, not proof the fence works. The owner decides whether a dodge counts as covered. Evidence `workshop:test-evidence/plan70-HADES-UNNAMED-01.json`.
    **2026-09-30 (plan 77, mixed, still owed):** of three phrasings, 1 drew a cover; 2 of 3 were dodges with no story detail at all (the owner rules on those). Evidence `workshop:test-evidence/plan77-HADES-UNNAMED-01.json`.
  - [ ] **STRAT-SPOIL-NAME-01** game known only by name. Setup: Doom 64 (or another emulated no-story title from
    the list: Super Mario 64, Mario Kart 64, Pikmin 2) running as a non-Steam shortcut, Strategy mode, masking on,
    streaming on. Do: ask a boss question ("how do I beat the mother demon"). Pass when: any spoiler box the model
    draws renders as plain text, from the first streamed word, with no "Spoiler hidden until complete…" chip and
    no tap-to-show block; then ask a second question and confirm the first answer stays plain once it is history;
    then reopen the chat from the chat slot list and confirm it is still plain. Note in the row: if no emulated
    shortcut is installed on the Deck, the row is blocked, not failed — say so. **BLOCKED 2026-09-15:** no
    emulated shortcut on this Deck is installed. Doom 64 and Doom 64: Retribution both exist as shortcuts, but
    both read as not installed, so the setup step cannot run. Blocked, not failed; still owed.
    **2026-09-18 evidence points the other way:** a name-withheld boss question on a story-protected game, nothing
    running, came back with no spoiler box at all on both Hollow Knight and Hades, so this row needs a re-run
    before it can be called a pass. Evidence `workshop:test-evidence/plan58p1-M-hk-boss-before.json`,
    `workshop:test-evidence/plan58p1-QA-NOTES-BLOCK-02.json`. **Tried again 2026-09-18: still blocked, for a new
    reason.** Doom 64: Retribution is genuinely installed on the Deck now (this settles the disagreement
    between the two library reads above), but it is not on the Deck's Recent Games row, the only list the
    launch tool can search, so it could not be started. Someone needs to play it once by hand first, or the
    launch tool needs to reach the full Library grid. Evidence `workshop:test-evidence/plan61-STRAT-SPOIL-NAME-01.json`.
    **2026-09-30 (plan 77): could not run** — none of the listed games is on Recent Games. Evidence `workshop:test-evidence/plan77-STRAT-SPOIL-NAME-01.json`.
  - [ ] *(extra credit, does not block)* **DRG-01e** Streaming off → plain text; **DRG-01f** `[Strategy
    follow-up]` turn → plain text — **DRG-01f PASS (Deck) 2026-09-26 (plan 70, flow L5), with Deep Rock
    Galactic: Survivor running:** picking "A. Just starting the campaign" under a boss-tactics answer, the
    follow-up turn answered in plain text, no spoiler cover. Side finding, since fixed and passed on the Deck 2026-09-29 (row KB-FOLLOWUP-QUOTE-02, `workshop:test-evidence/plan76-KB-FOLLOWUP-QUOTE-02-try2.json`): while the
    model warmed up, the waiting line showed the raw "[Strategy follow-up]" tag instead of the friendly
    wording. DRG-01e (streaming off) still owed. Evidence `workshop:test-evidence/plan70-L5-FLOW3-DRG.json`.
- [ ] **THINKING-OPENER-01** — **settled 2026-08-08, keep as a regression check.** **2026-10-02 (plan 79):** UNCLEAR in the free-play walk (the first 1.75 s and all of the second question's early lines were not captured, evidence `workshop:test-evidence/plan79-QA-FREE-PLAY-01-NOGAME.json`); on the slow-start run one question's first readable line after "Thinking..." quoted the question and "Thinking..." stood alone for one 250 ms read (evidence `workshop:test-evidence/plan79-THINKING-SLOW-01.json`). Submit an Ask: the first line you can actually read should be one quoting your question. The constant *Thinking…* placeholder exists but the maintainer could not perceive it on device, which is the intended outcome — the round trip is imperceptible and the backend-authoritative design stands. If *Thinking…* ever becomes **readable** as its own line, the round trip has regressed. **Observed as a tripwire during plan 70 flow 2a, 2026-09-26 (not run as its own check):** on two different asks, the first readable line quoted the question both times, as expected; a bare "Thinking" line was caught readable on its own for one 150 ms sample out of many. Too brief to call a regression, but on record. Evidence `workshop:test-evidence/plan70-THINKING-OPENER-01.json`.
- [ ] **KB-CANCEL-01** Ollama KB **while a download runs**: **Cancel** replaces Remove and is the row's only enabled stop (the primary reads *Downloading…* and is disabled). Down from **Use local knowledge base** → Cancel; Up from **Reply verbosity** → Cancel; **A** → *Cancelling…*, second press does nothing; row returns to Update/Download + Remove within a few seconds; status line reads *Download cancelled* in grey, **not** the raw backend error in red; a fresh download still starts afterwards **Shelved 2026-09-19 (D113):** the download finishes in about a second, so there is no window to press Cancel in; the check moves to the shelved list ([roadmap-shelved.md](roadmap-shelved.md)) until a throttle or a slower test copy exists.
- [ ] **KB-NEWGAMES-01** Built 2026-09-26 (plan 70, helpers F and G), Deck check owed, flow R. Brotato, Palworld and Skyrim in the library. Launch Brotato, ask about the shop or the wave-20 bosses; launch Palworld, ask about catching a Pal or a Tower fight; ask about Skyrim by name (not installed on this Deck). Each game's own notes must attach, and Palworld's Tower-fight and Skyrim's story questions must open behind a spoiler box while Brotato's never do. **Notes half PASS (Deck) 2026-09-26 (plan 70, flow R):** nothing running, a question about each of Brotato, Palworld and Skyrim attached that game's own note, credited to its source page (`workshop:test-evidence/plan70-R-R2.json`). **Still owed:** the spoiler-box half.
  **2026-09-30 (plan 77): Brotato half PASSED** (3 notes attached, no cover). **Palworld and Skyrim still owed:** Palworld's tile has no app id the launcher can match; the Skyrim question was not run. Evidence `workshop:test-evidence/plan77-KB-NEWGAMES-01.json`.
  **2026-10-01 (plan 78, Deck block 3c): Palworld and Skyrim UNCLEAR, still owed.** The right game's notes attached on all four questions (two each), but the AI wrote no hidden block any time (0 covers, none in any saved turn). Skyrim ruling: naming Alduin and asking for his story makes a plain-text answer about who he is not a leak; no bug opened. Evidence `workshop:test-evidence/plan78-KB-NEWGAMES-01.json`.
- [ ] **KB-FORMAT-REFUSE-01** Built 2026-09-26 (plan 70, helper E), Deck check owed, flow R. An older build of the plugin trying to install the new (format 4) library must refuse before downloading, with a plain message asking to update the plugin, rather than downloading and half-working.
- [ ] **OLLAMA-KEEPALIVE-FOCUS-01** **Keep models loaded** slider thumb: white gpfocus ring vertically centered on the dot (no ~1px high offset). **FAILED (Deck) 2026-09-26 (plan 70, flow L2):** measured, not centred — the ring's own box sits 3.5 css px (4.5 screen px) above the dot's middle, where a pass needs under 1 px; the ring's own right side also reaches about 17 px past the slider card's right edge. ★ layout, not fixed this wave. Evidence `workshop:test-evidence/plan70-OLLAMA-KEEPALIVE-FOCUS-01.json` (+ `.png`, cropped `.png`).
- [ ] **ROUTING-FOCUS-01** Try-order modal chrome matches Pull Models / Character picker (deferred bug). **The D-pad half is no longer a question** — it failed on 2026-08-28, see PICKER-REORDER-01

### CHAT-SLOTS-V2 — Named chat slots (P0)

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).


### CHAT-SLOTS-V3 — Named chat slots redesign (P0)

Run **CHAT-SLOTS-V2-05** (P-0 bumper suppression) first — it has never run on device, and
everything below assumes it passes. Plan:
[28-named-chat-slots-v3-implementation-plan.md](../../bonsAI-workshop/archive/28-named-chat-slots-v3-implementation-plan.md).

**Replaced by plan 84 (2026-10-09).** The saved-chats row this section was written for is gone: the chat's name beside
Decky's back arrow and the "Your chats" menu took over (rows P84-NAME-02 and P84-MENU-01 in
[PLAN-84](#plan-84--more-room-for-the-answer-plan-84) below). Every CHAT-SLOTS-V3 row had already passed on the Deck while the row existed and
sits in [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md), so none is left open here to replace. The two
row below, PRESET-ONE-LINE-04, tests the suggestion chips, not the saved-chats row, and stands. PRESET-ONE-LINE-02 passed on the Deck 2026-10-17 and moved to [the closed archive](archive/testing-manual-closed-2026.md#plan-94-docs-sweep-2026-10-17).



- [ ] **PRESET-ONE-LINE-04** (the scrolling is calm and cheap) With the knowledge base on and a covered game running (Half-Life 2 has
  the longest label, 59 characters): both labels crawl slowly with a fade at the edges, the **Tip** badge stays pinned at the left
  while the text scrolls, and a chip does not rotate away before its label has scrolled through once. Judge the speed by eye — "slow
  and calm" was the maintainer's brief, and Steam's `Marquee` `speed` unit is undocumented, so the value in
  `presetRowLayout.ts` (`PRESET_MARQUEE_SPEED`) is a first guess to be calibrated here and written back. Sample the frame rate the
  way PRESET-STREAM-ANIM-01 did (8s of `requestAnimationFrame` timestamps) with **decode** mode on so both chips churn and then
  scroll: expect a flat 60fps with no gap over ~50ms. Then with OS reduced motion on: no crawl, the label is cut off with an ellipsis,
  decode swaps text instantly with no caret. **Partial 2026-09-02:** frame rate sampled in carousel mode with the labels scrolling
  (no decode churn): 480 frames in 8017 ms (59.9 fps), 95th-percentile frame gap 16.8 ms, one gap of 50 ms, two labels scrolling at once — the same shape as the 2026-08-28 decode measurement (479 frames / 8002 ms, worst gap 50 ms). The speed-by-eye, decode and reduced-motion halves are still owed.

  **Speed-by-eye PASS (Deck) 2026-09-17:** the long chip label scrolls at about 27 pixels a second, a slow
  calm crawl (the target was about 25). Evidence `workshop:test-evidence/plan57-QA-PRESET-ONE-LINE-04.json`.
  **Decode half PASS (Deck) 2026-09-26 (plan 70, flow L6), with Half-Life 2 running, closed:** four
  eight-second windows of frame timing while a chip both churned its decode animation and scrolled a long
  label read 60.0, 59.8, 59.8 and 60.0 frames a second, worst single gap 50 ms. Evidence
  `workshop:test-evidence/plan70-L6-PRESET-ONE-LINE-04.json`. **Reduced-motion half, tried 2026-09-26 (plan
  70, flow L5) with no game running:** the instant-swap half passed (see PRESET-STREAM-ANIM-01 above, same
  mechanism); the ellipsis-cut long-label half **could not run** — no chip label overflowed its chip in 90
  seconds of watching, because no game was running to offer a long enough one. Evidence
  `workshop:test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`. **Tried again 2026-09-26 (plan 70, flow L6)
  with Half-Life 2 running: still could not run.** About 210 more seconds of watching found no crawling
  label under reduced motion, but every label seen fit its chip exactly, so the ellipsis half still has
  nothing to prove it on. Evidence `workshop:test-evidence/plan70-L6-REDUCED-MOTION-B.json`.
  **Tried again 2026-10-01 (plan 78, Deck block 3e), COULD NOT RUN:** Half-Life 2's window never came to the front after the plugin was reloaded during its start; no chip was read and reduced motion was never turned on. Still owed (also on the maintainer's own list). Evidence `workshop:test-evidence/plan78-PRESET-ONE-LINE-04.json`.
  **Reduced-motion half PASS (Deck) 2026-10-02 (plan 79, build `f0a4f2c4`), no game, six pinned test chips longer than the chip box, Reduce Motion on in Steam:** in 385 of 385 reads over about 192 s a chip text was cut with an ellipsis, no scrolling element and no moving offset (0 px), no typing caret, and the chips swapped with no scrambled letters. The control with Reduce Motion off showed the label scrolling 59 to 279 px. The pins and the switch were put back. Evidence `workshop:test-evidence/plan79-PRESET-ONE-LINE-04.json`. Speed, decode and reduced motion have now all passed; **still owed under PRESET-ONE-LINE-04:** the Tip badge staying pinned while a label scrolls (its twin in CHIP-BUTTON-09 passed 2026-10-02, `workshop:test-evidence/plan79-CHIP-BUTTON-09.json`) and a chip not rotating away before its label has scrolled once, neither of which has a run of its own.

---

### CHIP-BUTTON — Suggestion chips as real buttons (plan 60)

Plan [60](../../bonsAI-workshop/archive/60-chip-button-restyle.md), decision D110. Landed 2026-09-17 as merge `b3c0d52`
(seven commits on `refactor/lane60-chips`) and checked on the Deck the same day. Each chip now has a
raised look (a top hairline and a soft shadow), the two chips sit 6px apart instead of 4, the row
leaves room below the chips so the shadow is not cut off, the Tip word became a small dot, the tag and
decode-label colour is quieter, and the chip the D-pad is on shows a light bar along its bottom edge
instead of the old blue outline. Evidence `workshop:test-evidence/plan60-QA-chip-button.json` and
`workshop:test-evidence/plan60-measure-before.json` (the before-the-build measurement).

Rows 01, 02, 03, 04, 07, 08 and 09 passed (01 on the maintainer's eye 2026-10-22) and moved to
[testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **CHIP-BUTTON-05** | Read the rectangles of the chip, its container and the question box; screenshot | The shadow's bottom is not cut off; the gap from chip to question box is 8px in decode/static/carousel (12 total in fade); by eye the row no longer touches the box | ⏳ **owed — measurement PASS, the maintainer's own eye on the screenshots still needed.** Gap measured 8px (was 0) in decode/static/carousel, 12 total (unchanged) in fade; question box did not move |
| **CHIP-BUTTON-06** | Turn on the one-chip setting; show the help chip; get an agent suggestion chip | The full-width chip has the same raised look; the help and agent chips keep their colours and carry the hairline and shadow | ⏳ **PARTIAL — one-chip setting PASS on the Deck 2026-09-17** (same raised look, 300×30); the help chip and the agent chip were not on screen during the run, so they are covered only by the stylesheet tests, not seen by eye. **The maintainer's eye 2026-10-22 (the checks page): the help and agent chips FAILED** ("make sure the focus ring works on the How to use bonsAI chip"); stays open, plan 97 block A measures it (P97-A-HELP-CHIP-RING) **2026-10-22 (plan 97 block A):** the help chip could not be shown (first run only); a normal chip with the ring shows only the soft blue fill and no white ring, and its left edge sits at the panel's left edge (`workshop:test-evidence/plan97-A-HELP-CHIP-RING.json`). Stays open. **2026-10-22 (plan 97 block B, build `73738058`):** on the Deck the help chip held focus but nothing on it changed (`workshop:test-evidence/plan97-P97-B-HELP-CHIP-RING.json`); fixed in `3a855179`, Deck row P97-HR-HELP-CHIP-RING in testing.md owes the run. Stays open until it passes. **2026-10-22 (plan 97 block E9, build `15565346`): the help chip half passed on the Deck.** The focused chip carries the blue 0.2 layer and keeps its green border; unfocused it is the plain green bar (`workshop:test-evidence/plan97-P97-HR-HELP-CHIP-RING.json`, row P97-HR-HELP-CHIP-RING, archived). Still open: the agent chip and the maintainer's own eye on the fixed build. |

Row 05 is judged by eye from a screenshot and a rectangle read; the rest are read from the
page by the bridge. **Seen along the way, not part of this plan:** in fade mode the D-pad skipped the
chip row in both directions on three tries — worth a look next to the open "chip row cannot be
reached" entry.

---

### TAB-BAR — Collapsing tab bar (P0)

Plan [30](../../bonsAI-workshop/archive/30-collapsing-tab-bar.md), decisions D44/D55/D56. Steam's tab header is hidden by one
structural rule; a 20px bar above the tabs root shows the tab and is the strip's one focus stop; the
full strip floats over the panel while the bar holds the ring. All rows are on-Deck. Evidence files
under `workshop:test-evidence/`; numbers in the plan's § 8.

**Changed by plan 84 (2026-10-09, step 4):** the full strip that floated over the panel is gone, and the bar now sits in
the empty strip at the very top of the menu (rows P84-TABS-01 and P84-TABS-02 in [PLAN-84](#plan-84--more-room-for-the-answer-plan-84)). The rows
below that tested the strip are marked.

Rows 01–07 and 10–11 passed on the Deck (07 is retired, replaced by TAB-STRIP-2A-03) and moved to
[testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **TAB-BAR-08** | Touch | Tap on the thin bar opens the strip; a tab tap switches and closes it; a tap outside closes it | **Replaced by plan 84 step 4 (2026-10-09):** there is no strip to open any more. The touch check that remains is a person tapping the new bar with a game running (row **P84-TABS-02**, owed). Was: ⏳ needs a finger on the screen — the rig cannot tap |
| **TAB-BAR-09** | Modal return | After the character picker closes on a non-Main tab, the ring lands on the opener or on the bar, never nowhere (re-runs PICKER-FOCUS-01's three openers) | ✅ 2026-09-02 for the character picker, the models hub and the chat-slot rename — all return to the opener (`workshop:test-evidence/TAB-BAR-09-*.json`); ⏳ the desktop-note opener needs the *Save files to Desktop* permission on · ✅ 2026-10-01 for the Clear cache confirmation, a fourth opener (it had landed on the hidden Settings tab button on 2026-09-03): after B the ring came back to the "Clear cache..." button, fully visible (`workshop:test-evidence/plan78-TAB-BAR-09.json`); the desktop-note opener is **still owed** (above) |
| **TAB-BAR-GHOST-01** | Touch, ghost strip | With a game running full screen, open the panel, put the ring on the tab bar so the strip opens, then touch a suggestion chip with a finger; the strip must disappear completely — no faint icons, no dotted row — however long you wait | ❌ **regressed — failed by hand 2026-09-23** (build `a224fb6`, found by the maintainer after the Deck work ended): after Show details → Session, both tab bars stayed drawn at once — the small "MAIN" bar and the big icon bar under it. Touch scrolling did not close the big one; only the first D-pad move did. Recording `recordings/DeckRecord_20260923_235526_game.mkv` (11 seconds, every frame shows both bars) — this recording lives only on the maintainer's own computer; the recordings folder is not saved with the project. Back in Bugs on the roadmap as **TAB-BAR-GHOST-01**. The desk fix from 2026-09-15 (a plain timer that force-hides the strip) did not hold against this case. ⏳ still needs a finger on the screen to confirm any new fix — the rig cannot touch. On the maintainer's own checklist ([Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4)). **2026-09-28 (plan 76, build `39c17312`):** not reproduced with the D-pad. 66 samples over 15 s after Show details → Session and one D-pad press, exactly one tab bar drawn each time. The touch half still needs a person, so this stays open. Evidence `workshop:test-evidence/plan76-P76-M-TABBAR-GHOST.json`. **2026-10-09 (plan 84 step 4, build `8c233343` on the Deck):** the drop-down strip is gone from the code, so there is no strip to leave behind; the helper's tests prove nothing of the new bar can be left drawn over the chip row after any mix of focus, blur and taps. The rig cannot touch the screen, so the touch check with a game running was left to the maintainer (row **P84-TABS-02**); this row stays open. Evidence `workshop:test-evidence/plan84-STEPS4-5-7-DECK.json`. **2026-10-18 (plan 96 hand check 7): FAILED by hand** — a second strip (the L1 and R1 badges, the Search and bonsAI icons, a greyed "61 earlier" pill) was drawn over the top of the chat right after tapping the "How to use bonsAI" chip with a game running; the session reads it as Steam's own bumper tab-switch hint left stuck, unproven. Picture `workshop:test-evidence/plan96-HAND-ghost-tab-bar.png`, [checks page](https://claude.ai/artifact/FTe9Lr1sS2Kfrj8nBTVrhi), check 7. **2026-10-22 (plan 97 block E10, build `15565346`, a game running):** the pop-up route (the "Delete chat?" box, then B, three rounds) never showed a second strip: Steam's row was hidden at every read and the new watcher logged nothing (`workshop:test-evidence/plan97-P97-L15-GHOST.json`). The touch half still needs a finger; this row stays open.

Also re-run because their landing spot changed: **DOC-SWEEP-01** (Settings Up → the bar now),
**CHAT-SLOTS-V3-01** (the walk starts at the bar; replaced by plan 84, the saved-chats row it walked is gone), **TAB-SWITCH-01** (the flicker fix must hold with
the header hidden — `workshop:test-evidence/TAB-BAR-W1a-*.json` show ten clean switches). **TAB-SWITCH-01 PASSED, measured (Deck) 2026-09-04:** 1,453 samples, the tab bar's `scrollLeft` never left 0 (recorded in [archive/31-deck-verification-round.md](../../bonsAI-workshop/archive/31-deck-verification-round.md), "Tab switch, About, and the archive pill — 2026-09-04"); nothing is owed on it.

### TAB-STRIP-2A — The open tab strip redesign (plan 59)

Plan [59](../../bonsAI-workshop/archive/59-tab-strip-redesign-build.md), decision D109. Landed 2026-09-17 in commits
`6821f20`, `ef4a851`, `18be399`, `0378024`, `044acab`, `a957165`. Six equal cells, one 22px icon
family, only the current tab's name shown, a solid 66px bar with a shadow. **Run on the Deck
2026-09-18:** rows 01, 02, 04, 05 and 06 pass, 03 is captured for the maintainer's own look, and 07
fails and is filed as its own Bugs entry. Replaces **TAB-BAR-07** (see that row above).

**Replaced by plan 84 (2026-10-09, step 4):** the open tab strip these rows tested no longer exists, so the two rows still
open here are replaced and nothing is owed on them. The new bar's rows are in [PLAN-84](#plan-84--more-room-for-the-answer-plan-84).

Rows 01, 02, 04, 05 and 06 passed on the Deck and moved to
[testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **TAB-STRIP-2A-03** | By eye, the maintainer | The lit name readable at arm's length; the lit cell reads as a selection, not a warning; nothing clipped; in green (no character), gold (Ali G), purple (Shadowheart), grey (Astarion), pink (Fuu) | **Replaced by plan 84 step 4 (2026-10-09): the open tab strip no longer exists, so there is nothing left to look at and no look is owed.** Evidence for the new bar: `workshop:test-evidence/plan84-STEPS4-5-7-DECK.json` (row P84-TABS-01). Was: ⏳ captured 2026-09-18, the maintainer's look owed — five screenshots, one per colour: no character/green `screenshots/DeckCapture_20260918_081157_auto.png`, Ali G/gold `screenshots/DeckCapture_20260918_081003_auto.png`, Shadowheart/purple `screenshots/DeckCapture_20260918_081242_auto.png`, Astarion/grey `screenshots/DeckCapture_20260918_081324_auto.png`, Fuu/pink `screenshots/DeckCapture_20260918_081408_auto.png`. Evidence `workshop:test-evidence/plan61-TAB-STRIP-2A-03.json` |
| **TAB-STRIP-2A-07** | The dots covered (D109 item 3) | Every dot in the chat row's row of dots has its bottom edge above the strip's bottom edge, and the chat row's own bottom line is still below the strip — the maintainer chose a 66px strip on 2026-09-17 to cover the dots without covering the whole chat row | **Replaced by plan 84 step 4 (2026-10-09): the strip and the chat row's row of dots are both gone, so nothing is owed.** The roadmap records the dots as settled by the maintainer's 2026-09-26 call and fixed in `e3e849bd`, closed 2026-09-27 on the Deck's own screen (`workshop:test-evidence/plan72-F5-DOTS-rowlit-deckscreen.json`); the older text below was not brought up to date then. Was: ❌ FAIL (Deck) 2026-09-18 — the strip's bottom edge sits at 130px; the row of dots runs from about 133 to 137px with the ring on the tab bar (135 to 139px with the ring on the chat row), so every dot sits fully below the strip, none of them covered; the chat row's own bottom line (142 to 146px) is below the strip as intended. Filed as its own Bugs entry. Evidence `workshop:test-evidence/plan61-TAB-STRIP-2A-07.json` ⏳ **Fixed 2026-09-21 (plan 63, commit `ec70866`), Deck recheck owed.** The dots moved up 10 pixels rather than the strip growing, since the strip's own height is vertical room the maintainer asked to keep. Not yet re-run: confirm every dot now sits covered, and specifically whether the dots now crowd the tails of letters in the chat name above — the lane flagged 10 pixels as a little more than the 7 to 9 needed, with only about 4 pixels of clear space there. **Re-run 2026-09-23, ❌ FAIL by measurement:** the gap between the chat name's letters and the dots measured 0.2 pixels, so they touch — the 10-pixel move hid the dots under the strip but left no room above them. Screenshot `workshop:test-evidence/plan64-BYEYE-01-chat-row.png`. Moved back to Bugs, OPEN, with a maintainer's pick needed among three ways out (leave as is; move the dots back 1 pixel; or hide them while the tab strip is open and restore their old spacing) — see the roadmap entry. |

### PLAN-84 — More room for the answer (plan 84)

Plan [84](../../bonsAI-workshop/planning/84-more-room-for-the-answer.md), decision D126. Steps 2 to 7 landed 2026-10-08 and 2026-10-09 and were
checked on the Deck's own screen (the page is 854 by 454, bonsAI's column 300 wide), after the three early Deck tests of step 1.
What a person using the plugin now sees: the tab bar sits in the empty strip at the very top of the menu; the chat's name sits
beside Decky's back arrow with "LT chat 2 of 7 RT" under it; the big Ask button and the "Context: ..." line are gone, and a small
Ask button and a game tag sit in the question box's bottom strip; Read aloud is a small speaker in the answer's lower-left corner,
opposite Copy; the other tabs show no back arrow and no name; the answer has 295 points of height instead of 204.

**The TV run is owed on every row.** The plan runs each step on the Deck's own screen first, then once on the TV; nothing has run
on the TV. Evidence: `workshop:test-evidence/plan84-STEP1-DECK-TESTS.json` (the three early tests), `plan84-STEPS2-3-DECK.json`,
`plan84-STEPS4-5-7-DECK.json` and `plan84-STEP6-DECK.json`; the run files and screenshots they name sit on the maintainer's
machine and are not tracked. P84-TABS-01, P84-HINTS-01, P84-NAME-01, P84-NAME-02, P84-NAME-03 and P84-MENU-01 were measured on
build `8c233343`, before step 6 moved the tab bar up into the strip; step 6's block (build `75d14ac3`) walked the ring through the
bar and the name again (P84-RING-01) but did not measure those six again.

Replaces the drop-down strip rows (TAB-STRIP-2A-03 and -07, TAB-BAR-08) and the saved-chats row (CHAT-SLOTS-V3), marked above.

| Row | Scenario | Passes when | Status |
|---|---|---|---|
| **P84-HEIGHT-01** | Step 6: how tall the answer is | The answer area measures 297 points on the Deck's own screen (283 if test B failed), with the probe, not by eye | ✅ **PASS (Deck's own screen) 2026-10-09**, evidence `workshop:test-evidence/plan84-STEP6-DECK.json`: the answer area is **295 points** (347 minus 52); it was 204 before plan 84 and 259 after steps 2 and 3. The plan's 297 assumed a 30-point chips row; it measures 32 on the Deck. The tab bar sits at 0 to 20, Decky's back arrow and the chat's name at 20 to 48, bonsAI's box from 52, the ask area's top at 347. Steam's shared container keeps its 14 points of padding with no inline style. Screenshot `screenshots/DeckCapture_20261009_021202_auto.png`. Step 2's share (the ask area 107 points, was 162; the answer 259) is in `workshop:test-evidence/plan84-STEPS2-3-DECK.json`. ⏳ TV run owed |
| **P84-ASK-01** | Step 2: the small Ask button | The small ASK button asks; it becomes resting during an answer and Stop (the mic's place) stops it | ✅ **PASS (Deck's own screen) 2026-10-08**, evidence `workshop:test-evidence/plan84-STEPS2-3-DECK.json`: a question typed into the box; Down from the box landed on Ask; A sent it and the ring went back to the box, which emptied. During the answer Ask was dimmed (its resting look, opacity 0.38) and the mic's place read "Stop generation". Down from the box landed on Stop; A stopped the answer ("Request cancelled."), the ring returned to the box, Ask woke up and the mic came back. ⏳ TV run owed |
| **P84-ASK-02** | Step 2: the strip's stops | Every stop in the box's strip is reachable and visible, and Down and Up from the strip land where the brief says | ✅ **PASS (Deck's own screen) 2026-10-08**, evidence `workshop:test-evidence/plan84-STEPS2-3-DECK.json`: empty box, idle: Down from the box landed on Ask; Left went to Voice input, then the mode button, then the paperclip; a fourth Left held on the paperclip; Right went back through the mode button and Voice input to Ask; a fourth Right held on Ask; Up from Ask went to the box. 10 of 10 steps, every stop 100% visible; all the strip's bottoms at or above 447, the panel's bottom 454. With words in the box the X appears just left of Ask and the strip still fits (screenshot `screenshots/DeckCapture_20261008_214702_auto.png`). The "Context: ..." line is gone. A question for the maintainer, from the helper: should Down from an **empty** box still land on Ask? ⏳ TV run owed |
| **P84-READ-01** | Step 3: Read aloud in the corner | Read aloud in the lower-left corner starts and stops reading; the ring on it is fully visible on a long answer | ✅ **PASS after one fix (Deck's own screen) 2026-10-08**, evidence `workshop:test-evidence/plan84-STEPS2-3-DECK.json`: from the answer's section, Right reached Read aloud (lower-left), Right again reached Copy, Left went back to Read aloud and again to the answer, Right to Read aloud, Down to Helpful; every stop 100% visible; the old Read aloud row under the answer is gone. A on the speaker turned its label to "Stop" and its colour to red; A again while it read put it back to "Read aloud". **The first build failed one detail:** the speaker's box reached 3 points into the answer's last line and the ring covered that line's first letter (screenshot `screenshots/DeckCapture_20261008_214513_auto.png`). Fixed (the bottom band is 25 points): the box now sits 4 points and the ring 2 points clear of the last line (screenshot `screenshots/DeckCapture_20261008_215710_auto.png`). Owed by the maintainer's eye: the speaker's size and weight against Copy. ⏳ TV run owed |
| **P84-TABS-01** | Step 4: the new tab bar | The tab bar shows T3 on every tab; LB and RB wrap at both ends; no strip ever drops down | ✅ **PASS (Deck's own screen) 2026-10-08/09, build `8c233343`**, evidence `workshop:test-evidence/plan84-STEPS4-5-7-DECK.json`: the bar was 300 by 20 at y 64 to 84 (before step 6 moved it up); five parts in order: LB, two side icons, the current icon and name, three side icons (six tabs with Developer on), RB. LB's letters start 16 points from the bar's left edge and RB's end 16 from its right. The name's centre is 0.54 to 0.55 points right of the bar's centre on every tab (Main, Ollama, Settings, Permissions, Developer, About). Narrowest gap between neighbouring glyphs 5.1 points on five tabs and 3.2 on Permissions (the longest name; RB still 10.9 clear). RB walked all six tabs and wrapped About to Main; LB from Main went to About; Right and Left wrap the same way; Down from the bar went into the tab. Nothing is drawn below the bar's bottom edge. Screenshot `screenshots/DeckCapture_20261008_235420_auto.png`. ⏳ TV run owed |
| **P84-TABS-02** | Step 4: the ghost strip | The ghost-strip case (TAB-BAR-GHOST-01) cannot happen: there is no strip to leave behind | ⏳ **OWED, needs a finger on the screen.** The rig cannot touch the screen. The drop-down strip no longer exists in the code, and the helper's tests prove nothing of the bar can be left drawn over the chip row after any sequence of focus, blur and taps. The maintainer's touch check with a game running was done 2026-10-18 and **FAILED**: ❌ with Deep Rock Galactic: Survivor running, right after tapping the "How to use bonsAI" chip, a second strip was drawn over the top of the chat (the L1 and R1 badges with the Search and bonsAI icons and a greyed "61 earlier" pill behind them); the session reads it as Steam's own bumper tab-switch hint left stuck, not the plugin's bar, unproven ([checks page](https://claude.ai/artifact/FTe9Lr1sS2Kfrj8nBTVrhi), check 7; picture `workshop:test-evidence/plan96-HAND-ghost-tab-bar.png`). TAB-BAR-GHOST-01 stays open. Evidence `workshop:test-evidence/plan84-STEPS4-5-7-DECK.json`. ⏳ TV run owed |
| **P84-NAME-01** | Step 5: the chat's name is centred | The chat's name and the tab's name are within 1 point of the panel's centre (measured, not by eye) | ✅ **PASS (Deck's own screen) 2026-10-09, build `8c233343`**, evidence `workshop:test-evidence/plan84-STEPS4-5-7-DECK.json`: the name's words box is 156.4 points wide (more than the 139 the plan asked for) and its centre is 0.19 points left of the panel's centre (197.81 against 198). The tab name above it is centred to 0.0 in this row's measurement (P84-TABS-01 measured the same name's text 0.54 to 0.55 points right of the bar's centre). Under the name: "LT chat 1 of 7 RT". Screenshot `screenshots/DeckCapture_20261009_003226_auto.png`. ⏳ TV run owed |
| **P84-NAME-02** | Step 5: LT, RT and the menu | LT and RT switch chats (or Left and Right on the name, if test A failed); A on the name opens the menu. The rig presses LT and RT itself | ✅ **PASS (Deck's own screen) 2026-10-09, build `8c233343`**, evidence `workshop:test-evidence/plan84-STEPS4-5-7-DECK.json`: with the ring on the question box, the rig's RT (one pull) switched "chat 1 of 7" to "chat 2 of 7" (the Hollow Knight chat) and the ring stayed on the box; LT twice reached the new-chat spot ("New chat", "not saved yet"); RT went back. Up from the tab bar went to Decky's back arrow (Steam's own move, as designed until step 6), Right went to the name; A on the name opened the menu with the ring on the open chat. ⏳ TV run owed |
| **P84-NAME-03** | Step 5: a long name | A long name shows about 20 characters, then scrolls once while the ring is on it and is still otherwise | ✅ **PASS by eye from one frame (Deck's own screen) 2026-10-09, build `8c233343`**, evidence `workshop:test-evidence/plan84-STEPS4-5-7-DECK.json`: a long name is cut with "..." at rest; with the ring on it, it slides (the screenshot caught it mid-slide, showing "...to practice parrying in a..."). Screenshot `screenshots/DeckCapture_20261009_003304_auto.png`. ⏳ **Still owed:** the reduced-motion half (the name stays still for anyone who asked their system for less motion) was not tried on the Deck; the TV run |
| **P84-MENU-01** | Step 5: the chats menu | Every action in the chats menu does what the saved-chats row did, unread and still-writing dots included | ✅ **PASS for opening, walking, picking and closing; ⏳ the actions' own effects are still owed (Deck's own screen) 2026-10-09, build `8c233343`**, evidence `workshop:test-evidence/plan84-STEPS4-5-7-DECK.json`: A on the name opens "Your chats" over the answer, top at 88.7 (under the tab bar), bottom at 347.7 against the dock's top at 347, the question box in view. All 7 chats with when-stamps, then New chat, Rename chat, Sum up again, Save to Desktop note, Delete chat (red). The D-pad reaches all 12 stops with nothing visited twice. B closes it with the ring on the name. A on the second chat switched to it, closed the menu and put the ring on the name ("chat 2 of 7"). **One defect found:** Rename chat, then the rename box, then B left the ring on Decky's back arrow (one A there would close bonsAI); fixed in step 6 and passed in P84-RING-01 (the ring is on the chat's name). **Still owed:** the effect of New chat, Delete (with its confirm), Save to Desktop, Sum up and Rename itself (the tests cover the calls; the Deck run only opened and backed out of Rename; **Rename itself passed by hand 2026-10-18 on the Deck's own screen**, the keyboard pops up and the rename works, [checks page](https://claude.ai/artifact/FTe9Lr1sS2Kfrj8nBTVrhi), check 2; with an external controller the keyboard does not show, a Bugs entry), and the unread and still-writing dots (the evidence does not mention them). ⏳ TV run owed |
| **P84-HINTS-01** | Steps 4 and 5: the dimmed hints | LB and RB light only with the ring on the tab bar; LT and RT only with the ring on the name | ✅ **PASS (Deck's own screen) 2026-10-09, build `8c233343`**, evidence `workshop:test-evidence/plan84-STEPS4-5-7-DECK.json`: ring elsewhere, LB, RB, LT and RT at opacity 0.32; ring on the tab bar, LB and RB at 1 in near-white, with the bar's white inset ring and faint fill; ring on the chat's name, LT and RT at 1, LB and RB back to 0.32, the name's white ring. ⏳ TV run owed |
| **P84-OTHER-01** | Step 6: the other tabs | On every other tab, the name row and back arrow are gone and the content starts under the tab bar | ✅ **PASS (Deck's own screen) 2026-10-09, build `75d14ac3`**, evidence `workshop:test-evidence/plan84-STEP6-DECK.json`: on the Ollama tab Decky's bar is 20 tall (just the strip), the back arrow is not shown (0 by 0), there is no name row, and bonsAI's box and the tab's scrolling area run from 24 to 454. Measured on the Ollama tab; the evidence names no other tab. ⏳ TV run owed |
| **P84-BACK-01** | Step 6: B and leaving | B goes back to Decky's list from every tab; leaving bonsAI puts Decky's bar and Steam's strip back exactly | ✅ **PASS (Deck's own screen) 2026-10-09, build `75d14ac3`**, evidence `workshop:test-evidence/plan84-STEP6-DECK.json`: from the Ollama tab's body, B put the ring on the tab bar and a second B left bonsAI for Decky's list. Afterwards Decky's page was back at y 14 with no inline top, height or position; Decky's bar padding 6 16 0 with only Decky's own inline style; Steam's container padding 14 with no inline style. Tried from the Ollama tab only. ⏳ TV run owed |
| **P84-QAM-01** | Step 6: Steam's own pages | Steam's own menu tabs keep their top margin while bonsAI is open and after it closes | ✅ **PASS (Deck's own screen) 2026-10-09, build `75d14ac3`**, evidence `workshop:test-evidence/plan84-STEP6-DECK.json`: with bonsAI open (and still loaded), the menu switched to Steam's Performance page: its pane at y 48 and its first line ("Full") at 84, the same as with bonsAI closed; Steam's container 14px with no inline style. ⏳ TV run owed |
| **P84-RING-01** | All steps: the ring | The ring never lands on a hidden control, and never on Decky's back arrow by itself after a tab switch | ✅ **PASS with one note (Deck's own screen) 2026-10-09, build `75d14ac3`**, evidence `workshop:test-evidence/plan84-STEP6-DECK.json`: on Main, Up from the box walks the chat to its first line, then the chat's name, then the tab bar; Up on the bar holds; Down from the bar goes to the name, Down from the name to the chat's first line; Left from the name goes to Decky's back arrow and Right from it back to the name; LB on the name switched to About and put the ring on the bar; Right on the bar switched back to Main with the ring staying on the bar. On the Ollama tab, reopened with the ring on the strip, it came back on the strip, not the hidden arrow; in and out of the menu's icon column three times, Right always landed in the tab, never on the hidden arrow. The step-5 bug is fixed (chats menu, Rename chat, the rename box, B: the ring is on the chat's name). **Note:** closing and reopening the menu with the ring on the chat's name put the ring on the question box, the long-standing open rule, not a regression; and the visibility check reads the name as 83% visible while the ring is on it (one sample point falls on the sliding words), while screenshots show it whole. ⏳ TV run owed |
| **QA-FREE-PLAY-01** | All steps: the free-play sweep, on the new layout | The free-play sweep: every focused stop is also visible (the standing row above) | ⏳ **OWED for the new layout.** None of the four plan 84 evidence files is a free-play sweep; the dated runs under the standing row all come before plan 84. **Update 2026-10-11 (plan 89):** both halves (no game, then a game running) passed on the new layout, build `f5e4dc12`; see the dated notes under the standing row. Still owed: the touch-screen half, the maintainer's. |

Step 7 (the version number moves to the About tab) has no row in the plan. Its check passed with the others: the About tab's first
line under its heading reads "Version 0.5.0" (`workshop:test-evidence/plan84-STEPS4-5-7-DECK.json`, entry `step7_about_version`).

### NOTES-BLOCK — The "From the notes" block (plan 58 phase 1)

Plan [58 phase 1](../../bonsAI-workshop/archive/58-phase-1-notes-shown-and-wiki-extracts.md), decision D111. Landed
2026-09-17 as two commits (`6dbf9c9` backend, `4c036f5` frontend; tip `8395841` on experimental). A
line under a finished Strategy or troubleshooting reply that used a note or a shared tip names it and
where it came from, and opens to show the note's own words. Starts closed behind one switch. **Two
pieces are short of the plan, a follow-up in progress in the same lane:** the block should appear
before the model's first word rather than only once the reply finishes (row 06), and should sit inside
the spoiler box on a fenced reply rather than being hidden entirely (row 02). **Five of the seven rows
have passed on the Deck (01, 02, 03, 05, 06; row 02 passed 2026-09-26, `workshop:test-evidence/plan70-NOTES-BLOCK-02.json`); the rest — 04, 07 — are still to run, below.** Every row that walks the D-pad onto the block's own header must check
that the ring is actually visible on the header, its rectangle read against where the dock starts, not
merely that the header has focus — the repo's own lesson from a control that passed a focus walk while
sitting hidden behind the dock. Save each row's evidence to `workshop:test-evidence/plan58p1-QA-NOTES-BLOCK-0N.json`
before writing the row.

Rows 01, 02, 03, 05, 06 and TEN-GAMES-01 passed on the Deck and moved to
[testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **NOTES-BLOCK-04** | A covered game running. Ask something the notes cannot answer. | No block appears anywhere under the reply; the honesty line about the model's own knowledge shows instead. The two never appear together on one reply. | **PARTIAL (Deck) 2026-10-03: the "no block" half passed; the honesty-line half is still owed (2026-10-08, game running: UNCLEAR, below).** **2026-10-14 (plan 93 Deck block D3, build `8ff99a0a`, Deep Rock Galactic: Survivor running, Strategy mode, the Deck's own AI): the line half is UNCLEAR, one question passed and one failed, so it stays owed.** "Who is the final boss called Zorblax" (a made-up boss) showed the "No close match in my notes, this answer leans on the model's own knowledge" line and no "From the notes" block: PASS. "How do I buy a house in this game" attached 3 notes (Gold, Nitra, Mining and the run timer), showed a "From the notes" block (Gold) and no "No close match" line: FAIL; the AI read "buy" as the in-game Gold shop. That miss is the known wrong-subject-notes entry in [roadmap-kb.md](roadmap-kb.md); whether the Gold match is fair is the owner's call. Evidence `workshop:test-evidence/plan93-NOTES-BLOCK-04-game-strategy-D3.json`. **2026-10-14 (plan 93 Deck block C part 2, Deep Rock Galactic: Survivor running, Speed mode, two questions, the Deck's own AI):** no notes block under either answer (the block half passes); the "Not in my notes" line did not show and the back end logged "no footer line added" both times. That line shows only in Strategy and Expert by design (`kb_not_in_notes_notice.py`), so the line half is **still owed in Strategy or Expert**; the evidence file marks it FAIL and only names Speed as a possible cause. Evidence `workshop:test-evidence/plan93-NOTES-BLOCK-04-game.json`. **2026-10-08 (plan 83 overnight, build `0d3af3de`, Deep Rock Galactic: Survivor running, Strategy mode), UNCLEAR, still owed:** neither of the two tries produced a reply with nothing attached (notes of 1042 and 1242 characters were attached), so the case under test never arose. Try 1 also showed the "No close match" line and no notes block while the log said 1042 characters were attached (filed in roadmap-kb Bugs). Evidence `workshop:test-evidence/plan83-NOTES-BLOCK-04-game.json`. **2026-10-03 (plan 81, build `afd2f444`, no game running, Strategy mode):** a question about a game the library does not know ("How do I tame a wolf in Valheim?", in a chat whose own game is Deep Rock Galactic: Survivor) attached nothing (0 chars of notes) and no notes block showed under the reply. Neither the "Not in my notes" line nor the "No close match" line showed, so the honesty line shown instead is not covered by this question. Evidence `workshop:test-evidence/plan81-NOTES-BLOCK-04.json`. **Earlier, NOT RUNNABLE (Deck) 2026-09-18:** no question could be found that attaches nothing for a covered game, so the "never together" case could not be shown — every attempt still attached three notes. What did happen: the block and the "no close match" honesty line appeared together, and the line read wrong, since the reply's facts came from one of the attached notes. Evidence `workshop:test-evidence/plan58p1-QA-NOTES-BLOCK-04.json` **2026-10-10 (plan 87 K1, `4deec915`, `0ce3bbd0`):** a fix landed so the "No close match" line is taken off an answer that used a note (tests only so far); the covered-game-running half is still owed on the Deck, together with row P87-K1-LINE-AND-BLOCK in testing.md. **2026-10-10 (plan 87 Deck blocks 5 and 5b, `8608954d`, game running):** row P87-K1-LINE-AND-BLOCK passed for 2 of its 3 asks (the notes block showed with no "No close match" line; `workshop:test-evidence/plan87-P87-K1-LINE-AND-BLOCK.json`, `plan87-P87-K1-LINE-AND-BLOCK-try2.json`). This row's own covered-game-running half is not marked closed by that result and stays owed. **2026-10-22 (plan 97 block B, build `73738058`, Deep Rock Galactic: Survivor running, Strategy mode, the Deck's own AI): the line half FAILED on the second of two questions.** "Who is the final boss called Zorblax in this game": the "No close match" line showed and no notes block was drawn (pass; the back end attached three weak notes and judged them weak). "How do I defeat the boss named Grimthak in this game": no line, and a "Glyphid Dreadnought" notes block was drawn (two weak notes attached and judged close enough). It depends on what retrieval attaches; filed in [roadmap-kb.md](roadmap-kb.md) Bugs. The row stays owed. Evidence `workshop:test-evidence/plan97-NOTES-BLOCK-04.json`. |
| **NOTES-BLOCK-LADDER** | A covered game running or named. Ask a question, open the block, and check whether its own chip ladder (if it has one) can be reached with the D-pad. | The ladder inside the open block takes Left/Right the same way the details panel's own ladder does. | ⏳ **UNCLEAR (Deck) 2026-09-23** — this reply's block held three shared Deck tips and no chip ladder at all, so the question could not be asked of it; Down from the open block instead went to "Save chat to Desktop". Side finding, filed as its own bug: opening the block does not scroll it into view, so most of its words sit behind the chip and the question box. Evidence `workshop:test-evidence/plan64-NOTES-BLOCK-LADDER.json` (+ `.png`). **Tried again 2026-09-26 (plan 70), still UNCLEAR:** two different multi-note blocks (Half-Life 2, "Antlions (+1 more)" and "Strider (+1 more)") both opened to plain text with no chip ladder at all, so the row's own question still cannot be asked. One block was fully on screen this time, so the earlier scroll finding did not repeat. The session suggests retiring this row's chip half, since blocks carry no chips by design now — maintainer's call. Evidence `workshop:test-evidence/plan70-NOTES-BLOCK-LADDER.json` (+ `.png`). **Tried again 2026-10-22 (plan 97 block B, build `73738058`, Strategy mode, game running), still UNCLEAR:** a "Soul Master" block ("From the Hollow Knight wiki") opened to one paragraph of text (about 1,100 characters) with no chip ladder, and Left and Right did nothing (the ring stayed on the block). Evidence `workshop:test-evidence/plan97-NOTES-BLOCK-LADDER.json` (+ `.png`). |

## Tier 3 — Heavy manual

| Block | Notes |
|-------|-------|
| **QAMP on-Deck** | See § QAMP below — **withdrawn from the roadmap 2026-09-02**: TDP apply was removed 2026-07-30, so the matrix has nothing to test until the feature returns |
| **TDP boundary clamps** | 1W/3W/15W/20W + GPU-800 advisory (many preview PASS) |
| **Background Ask full lifecycle** | Timeout, error, busy guard |
| **Multi-game matrix** | Title-specific behavior |
| **Guide-chord macro** | Power-user only — [troubleshooting.md](troubleshooting.md) §5; not casual priority. **Shelved 2026-09-19 (D113):** the maintainer said drop it; moved to the shelved list ([roadmap-shelved.md](roadmap-shelved.md)). |

---

## Tier 4 — Release gate

1. Clean install: Ollama not yet installed → README path → one text Ask succeeds
2. Record Decky / SteamOS / Ollama host in a short note under [testing.md](testing.md) or release PR
3. Tier 0–2 Pass or explicit Waive with reason
4. The first-run wording, from the pictures (the maintainer's check 6, plan 73 check 4's eye half): it now includes the wording of the first-run popup "Where should the AI run?" (plan 96 N1, row P96-N1-FIRST-RUN-POPUP in [testing.md](testing.md)), which replaced the old Local runtime notice. **Still owed, no verdict yet (2026-10-18):** the maintainer could not find the pictures, and they have been sent. Pictures: `workshop:test-evidence/plan94-P94-FIRST-RUN-try2-1.png` (the Beta Notice), `workshop:test-evidence/plan96-P96-N1-FIRST-RUN-POPUP.png` (the popup), `workshop:test-evidence/plan94-P94-HELP-CHIP-try2-open.png` (the Using bonsAI box), `workshop:test-evidence/plan94-P94-CLEAR-ALL-RUN-box.png`.

| Date | Git SHA / tag | Result | SteamOS / Decky | Ollama host | Notes |
|------|---------------|--------|----------------|-------------|-------|
| 2026-10-17 | `e9b50cc8` (deployed from this PC, not the release zip) | **PASS with two caveats:** the first answer starts only after about two minutes while the model loads cold, and nothing on screen says so | SteamOS 3.8.28 stable / Decky 3.2.10 stable | Ollama 0.40.6 on the Deck, installed by the plugin | Plan 94, a true first install (Clear all data, Ollama and its models moved aside): two notices, Permissions, Install Ollama with the starter set, one question. Evidence `workshop:test-evidence/plan94-P94-INSTALL-OLLAMA.json`, `workshop:test-evidence/plan94-P94-STARTER-SET.json`, `workshop:test-evidence/plan94-P94-SPEED.json`. The re-run from the release zip is owed on release day. |

---

## QAMP verification (Phase 1)

**Code / unit (verified 2026-04-26):** banner wattage, reopen Performance guidance, stale-slider note, GPU MHz advisory-only.

**On-Deck (Tier 3 — QA backlog):**

- [ ] **QAMP-DECK-01** Per-game profile ON: TDP apply + guidance — **withdrawn 2026-09-02**, TDP apply was removed 2026-07-30, nothing left to test
- [ ] **QAMP-DECK-02** Per-game profile OFF: same — **withdrawn 2026-09-02**, same reason
- [ ] **QAMP-DECK-03** Close/reopen QAM Performance: cap reflects write — **withdrawn 2026-09-02**, same reason
- [ ] **QAMP-DECK-04** After Steam restart: OS default (not plugin regression) — **withdrawn 2026-09-02**, same reason
- [ ] **QAMP-DECK-05** After full reboot: same — **withdrawn 2026-09-02**, same reason

---

## Progress tracker

| Tier | Status | Last run | Notes |
|------|--------|----------|-------|
| 0 | Preview Pass (the preview suite was removed 2026-10-16) — **DOM/focus asserts invalidated 2026-08-08** | 2026-05-26 / 9e20a82 | Re-baseline pending. The RPC and shell steps stand; the DOM, focus-path and screenshot evidence does not — see [testing.md § Preview-suite evidence invalidated](testing.md#preview-suite-evidence-invalidated-2026-08-08). **SMOKE-A's PASS was purely vacuous.** Formal on-Deck Pass → QA backlog |
| 1 | Preview Pass (the preview suite was removed 2026-10-16) — **DOM/focus asserts invalidated 2026-08-08** | 2026-05-26 / 9e20a82 | Re-baseline pending; same scope as Tier 0 above |
| 2 | Partial | 2026-06-09 / a9237e4 | |
| 3 | Open | | QAMP matrix deferred |
| 4 | Partial | 2026-10-17 / e9b50cc8 | First row PASSED on the Deck (plan 94); re-run from the release zip owed before the tag |

---

## Prompt-testing (qualitative)

Broader matrices beyond Tier 0–1 smokes are **deferred** ([roadmap.md](roadmap.md), the `[QA]` **Deferred manual QA** entry). Prefer: one smoke per area over long prompt lists. Old Tier 1 prompt checkboxes: [archive/testing-full-pre-2026-07-30.md](archive/testing-full-pre-2026-07-30.md).
