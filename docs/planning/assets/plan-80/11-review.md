# Plan 80, step 2 — the review

Written 2026-10-03 by the one running the session, after reading the ten findings sheets (01 to 10 in this folder).
This file is what steps 3 to 5 work from. Where it disagrees with a sheet, this file wins.

## 1. How the check was checked

- **Spot checks:** 36 of about 170 entries were checked against the repo directly (about one in five), plus every entry
  whose status would change. Every finding tested held, except the corrections in section 3.
- **Entries checked, by sheet:** bugs 20 · features first half 24 · second half 23 · Verify bugs 13 · Verify features 12 ·
  knowledge base part one 11 · knowledge base Next 15 · parked and watched 28 · long-note headings 101 · links 113.
- **The plan's "246 links to headings" is wrong.** The real count is 113 anchored links (sheet 10, A1). Step 5 checks
  against sheet 10's grouped list.
- **History:** the checkout started with only 50 commits; the full history (2,369) was fetched during step 1 and every
  helper re-checked its hashes.

Spot-check log (entry → what was checked → result):

| Entry | Checked | Result |
|---|---|---|
| Chip comes back / chip pace (Verify bugs) | rows P78-TIP-CHIP, P78-CHIP-PACE; both evidence files exist | holds: Done |
| Parental-lock stale note | hash `11033561` | not a commit; the landed fix is `7c8ac206` |
| Cut choice menu | hash `4d750ae1` | not a commit; the landed fix is `42092e2f` (subject and files match) |
| Hidden-block label shape | `strategy_spoiler_policy.py` lines | holds: 139, 150, 161, 165 plus `ollama_prompts.py:483`; five places |
| Steam gone after a reload | evidence wording | holds: the file says "Steam frozen and rebooted it by hand" |
| Adjustable text size | commit `12227980`, CHANGELOG line 207 | holds: a UI scale section exists, hidden for 0.6.0 |
| Leftover settings-card state | `selectedIndex` use | holds: still read and set |
| LAN custom model pull, "R1 to R4" | history (`67b2b3f7`) | settled, see 3 |
| Tab strip row 07 | roadmap and archive history | corrected, see 3 |
| Chip button row 09 | `plan79-CHIP-BUTTON-09.json` | holds: PASS, 0.00 px |
| Wrong-subject questions | `plan70-NO-CLOSE-MATCH-HK-02.json` | holds: no line on the horse question |
| D41 | heading in the locked file | holds: still open, not on the roadmap |
| Shipping blend's reason | `build_rag_db.py` guarantee | holds |
| Install seed knowledge base button | `DeveloperTab.tsx:282` | holds: says "not live yet" |
| Library size | `data/kb/strategy_seed.json` | holds: 38 games, 414 notes |
| Contractions bug in an old note | details file line 2629 | settled, see 3 |
| Flow L10 "New, open" items | archive files | settled, see 3 |
| Row SPOILER-COVER-01 | closed testing file | settled, see 3 |
| Credit line names a boss | archive | settled, see 3 |
| Model removal drops a PC model's order | `ollama_local_setup_rpc.py:409-423` | holds |
| Live-line trimming code | `liveReasoningText` callers | holds: one source file, tests only |
| B on Clear all box | evidence verdict | holds |
| Per-mode timeouts | `latency_warning_seconds` | holds: one value |
| Knowledge base button icons | `KnowledgeBaseSection.tsx:90` | holds |
| Calmer rating choices | evidence verdict | holds |
| Speed-mode tip gap | `knowledge_base_service.py:1121` | holds |
| Quick-launch macro | `main.py:823` | holds |
| Glance view decision | locked file line 678 (D97) | holds |
| Done section rows | `testing.md` 310 to 315 | holds: all six Done |
| Power numbers | evidence folder | holds: no evidence file |
| Help chip tests | `index.helpChip.test.tsx` | holds: 4 tests |
| Session context strip | component and archived Clear entry | holds: half built |
| Build tidy-ups | roadmap status | holds: already PARTIAL |
| Focus ring styling | roadmap status | holds: already PARTIAL |
| Fresher title | evidence | holds |
| Models try order | evidence | holds |

## 2. Status changes, reviewed

Only one entry changes list:

- **"The game's own chip never came back, and the chips turned over too slowly"** — Verify → **Done** (call 8, proof
  found). Done line as in sheet 04, naming the two leftovers (the maintainer's look at the pace, the preview pick). Full
  entry to `docs/archive/roadmap-bugs-fixed.md`; long note to the trimmed archive.

Status words that change without a move (proof checked):

- Adjustable text size: OPEN → PARTIAL (a UI scale section exists, hidden for 0.6.0).
- Session context and user stash: OPEN → PARTIAL (the strip and its Clear button shipped).

Two Verify entries may also close, **if the maintainer accepts unit tests** (questions 1 and 2 below): the cut choice
menu, and the quit-or-switch checklist. Until answered they stay in Verify.

## 3. Corrections to the sheets (settled by the review)

- **Tab strip row 07 (sheet 05, note 4).** Not a lost bug. On 2026-09-26 the maintainer chose "keep the dots, make
  them line up exactly"; that replaced the three-ways-out pick. It was fixed in `e3e849bd` and closed 2026-09-27, Deck's
  own screen included (`docs/archive/roadmap-bugs-fixed.md`, around line 2071; evidence
  `plan72-F5-DOTS-rowlit-deckscreen.json`). The tab strip entry drops "07 failed and is filed as its own bug above" and
  says row 07 was settled by that call. No pick is owed.
- **The two missing hashes (sheet 04).** Write `7c8ac206` (parental-lock entry) and `42092e2f` (cut choice menu). The
  others were lane hashes that never landed under that name.
- **"R1 to R4" (sheet 03).** First written in `67b2b3f7`: R1 instructions only (the Deck shows how to pull on the PC);
  R2 pull on the Deck even when Ask uses the PC (likely wrong); R3 the plugin runs the pull on the PC (needs a security
  review); R4 only pin and route a model already on the PC. Write these four in plain words in the LAN pull entry's long
  note; the entry says a choice among them is owed.
- **Contractions split into a stray letter (sheet 09).** Fixed in `55719a6e` (details file line 2629). Not an
  untracked bug.
- **Flow L10's "New, open" items (sheet 09).** Every one was filed and closed later (the decode slowdown, Up from
  Save chat, Up onto a spoiler cover, the meaning-search hint, the Pull-button ring, the spinner; all in the archive
  files). Only "walking Down while an answer is still arriving" is open, on the watch list. The heading goes to the
  archive except that one paragraph.
- **Row SPOILER-COVER-01 and the credit-line question (sheet 09).** The row is ticked in
  `docs/archive/testing-manual-closed-2026.md`; the credit line naming a boss is Done in
  `docs/archive/roadmap-done-v0.5.0.md`. The "Spoiler leak family" heading goes to the archive whole.
- **Parked file layout (sheet 08, note 1).** D120 call 3 put the watched sightings in Shelved, and D123 call 3 says
  the one file replaces Shelved, so both go in `docs/roadmap-shelved.md`, under two headings: **Parked on purpose**
  and **Watched sightings**. (Told to the maintainer; they can change it.)
- **"The panel stops half way" (sheet 08, entry 24).** Stays a watched sighting under D120 call 3; no new call needed.

## 4. Rules for steps 3 to 5

**Where long notes go.** A long note follows the roadmap entry that links it.
- Linked from a knowledge-base entry → `docs/roadmap-kb-details.md` (step 3 moves it word for word). This includes the
  spoiler-tier notes, "Measure how well the AI reads a screenshot", and "Flow L7 findings".
- "Cost to a running game, second sighting" is linked only from the knowledge-base intro but is about a game's frame
  rate: it stays in `docs/roadmap-details.md`; the knowledge-base file links across.
- Unlinked headings marked knowledge base in sheet 09's table also move in step 3; step 4 then archives the finished
  ones from the new file.
- Finished orphans (sheet 09, second table) go to the trimmed archive whole in step 4. The five watched or Verify
  orphans (panel stops half way, tap outside AI models, chat still writing, fresher title, plan 79 measurements → merge
  into heading 2956) stay and get a link from their entry. Mixed headings (Flow 2b, Flow L6, Flow L10) keep only the
  open paragraph.

**Trimmed text** goes to `docs/archive/roadmap-trimmed-2026-10-<file>.md`, one per helper, never deleted.

**The Done section** is renamed **"Done for v0.6.0"** with a one-sentence header (everything closed since v0.5.0,
2026-07-15, the full record in the archive file, whose name stays). The two long paragraphs at its top go to the
trimmed archive. Every `#done-for-v050` link is fixed to the new anchor (roadmap lines 33, 336, 459, and the anchor tag
at 713). Line 730's "filed under Bugs" is corrected (the fault is done, line 727).

**Out of order:** the two-star "folded reasoning line in the character's own voice" moves to its star place, and its
text says the plain fold shipped.

**Decision links** go to the decision's own heading. Calls that live only in a plan's question list (plan 78 questions
12 and 13; plan 79 questions 2, 7, 12, 14) link the plan file and say "no decision recorded".

**Tooling (step 5):**
- The bookkeeper guard adds `docs/roadmap-kb.md` and `docs/roadmap-shelved.md`. The long-notes files stay unguarded, as
  `docs/roadmap-details.md` is today.
- The size check resets the roadmap's best and adds limits for the two new roadmap files.
- The closed-rows check learns `docs/roadmap-kb.md` and the trimmed archives.
- The docs-split check runs with every new file and trimmed archive as `--after`.
- Helper files, the agents guide, CLAUDE.md, the documentation index, lessons learned and the two knowledge policies
  name the new files.
- Code comments that name roadmap entries by title are left as they are (they were already drifting; fixing them
  touches source files).

## 5. Questions for the maintainer (sent 2026-10-03)

Answers change what step 4 writes. Until answered, the entries keep today's status and say the call is owed.

1. Cut choice menu fix: accept on its unit tests and close, or keep waiting for a check by hand?
2. Quit-or-switch-game checklist fix: it cannot be made to happen on purpose. Accept on unit tests and close?
3. Up from the answer bubble scrolls the whole answer instead of moving the ring. A test calls it by design. Keep as a
   bug, or drop it?
4. The open call about a general card ranking above the specific cards inside it: list it under "calls waiting on
   you", or close it?
5. The freeze after a plugin reload on 2026-10-01: was Steam restarted, or the whole Deck?
6. Some test notes and the knowledge base status report are also out of date. Fix them in step 5, or leave them for a
   later session?

**Calls kept visible in their entries, no answer needed now:** the spoiler-cover second while an answer arrives (plan 78
question 12); rewording the hidden-block label after the release (plan 78 question 13); which pause a long chip should
have (plan 79 question 12); the chip ladder stepping one chip per press; the other chat's greyed Ask button while one
chat writes; retiring the chip-ladder half of a notes test; re-measuring the search weights on the bigger library;
whether scrolling first counts as moving (the Down trap row); plan 79 questions 2, 7 and 14.

## 6. Answers (the maintainer, 2026-10-03)

1. Cut choice menu: **wait** for a check by hand. Stays in Verify.
2. Quit-or-switch checklist: **close it** on its unit tests. Verify → Done (the maintainer's call, no Deck row).
3. Up from the answer bubble: **keep it for now**; the maintainer will check it by hand later. Stays in Bugs, saying so.
4. The open call on a general card outranking its members: **list it under "Calls waiting on you"**.
5. The freeze after a reload on 2026-10-01: **the whole Deck** was restarted. The entry keeps "until the Deck is restarted".
6. Out-of-date test notes and the knowledge base status report: **fix them** in step 5.

Also: the maintainer asked the session to carry on through every step without stopping, and to stop only for
something major.

## 7. Step 5 record (2026-10-03)

- **Links:** 9 broken links in live files fixed (the old `#planned` and `#knowledge-base` anchors); every link into a
  roadmap file from a live document resolves (checked by script across 136 files). 65 archived documents and the two
  finished plans got the one-line "links may be stale" note; `archive/roadmap-shelved.md` is marked replaced.
- **Tooling:** the bookkeeper guard now covers `docs/roadmap-kb.md` and `docs/roadmap-shelved.md` (the long-notes files
  stay unguarded, as before). The size check gained limits for `docs/roadmap-kb.md` (25 KB), `docs/roadmap-shelved.md`
  (20 KB) and `docs/roadmap-details.md` (100 KB), and the roadmap's best was reset to 62.6 KB. The closed-rows check is
  unchanged on purpose: closed entries still go to the roadmap's Done section and the archive files it already reads,
  and the trimmed archives hold old wording of open entries too, so reading them would raise false alarms. Helper
  files, the agents guide, CLAUDE.md, the documentation index, lessons learned and the two knowledge policies name the
  new files. Code comments that name entries by title are left as they are.
- **Test notes and the status report (answer 6):** CHIP-BUTTON-09 closed (`plan79-CHIP-BUTTON-09.json`);
  GAME-LIGHT-01 passed with a real fight still owed, SCR-10 passed, SCR-03 and STREAM-PIECES-01 unclear
  (`plan79-SCR-10-MISSION.json`); READ-ALOUD-05's test count corrected; KB-CANCEL-01 points at the parked-work file. The
  knowledge base status report is brought in step with `docs/roadmap-kb.md`. The knowledge base roadmap's answer figure
  now quotes the shape that shipped (79.5, `kb-answer-eval-2026-09-07-ANSWERFIRST.md`), not the one it replaced (76.6).
- **Full checks:** typecheck, the JavaScript tests, headers, size check, growth limit, closed rows and the tool-server
  check pass. Four Python tests and the build's licence step fail, and **all of them failed before plan 80 started**
  (checked on the commit before plan 80): three README tests broke with the README rewrite just before this plan (the
  app links to a README heading, "model policy tiers", that the rewrite removed), one download-list test fails in this
  cloud copy before and after, and the licence step cannot read package folders on Linux. The first two were fixed in
  their own commit (the app's licence link now goes to the user guide's "AI models and licences" section; the
  download-list test no longer reaches the real network); the Python suite then passed in full. The licence step is
  reported to the maintainer, not fixed here.
