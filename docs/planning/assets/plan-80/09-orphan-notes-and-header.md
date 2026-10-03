# Plan 80, step 1 — helper 9: the long-notes file's orphans and header

Slice: every heading in `docs/roadmap-details.md`, not a roadmap entry. Date 2026-10-03. Branch: `experimental`.
Read-only check; nothing else was edited.

## Headline numbers

- The file has 2,988 lines and **101 headings** (all level 2).
- **57 headings** are linked from `docs/roadmap.md` (1,152 lines). **44 are orphans**: no roadmap entry links to them (1,696 lines, more than half the file).
- **No broken links.** Every `roadmap-details.md#...` link in the roadmap points at a heading that exists.
- Most orphans are notes for entries that were finished and moved to the archive, while the long note stayed behind. Their archived entries often still link here (for example `archive/roadmap-done-v0.5.0.md`, `archive/roadmap-bugs-fixed.md`, `archive/roadmap-completed.md`). So moving a heading needs those archive links fixed or given the stale-links warning (call 6).
- Only a few orphans are about work still open: see "Orphans that must stay" below.
- How I judged: I matched each orphan's entry titles (the bold lines inside it) against the roadmap, the three archive files, the shelved archive, the changelog and the test documents. A title found only in an archive file means the entry was closed there. I did not re-read every paragraph; where an orphan also holds an open finding, I say so.

## Orphans that must stay (still open or watched), with the roadmap entry that should link

| Heading (lines) | What is open | Roadmap entry that should link to it |
|---|---|---|
| The panel stops half way down and the Ask button is out of reach (15-181, 167 lines) | Watched, not reproduced since 2026-09-18. Roadmap line 705, in Shelved, has no link. The note is very long; keep the mechanism, the trigger found 2026-09-18 and the fix attempts, and send the day-by-day clean tries to the archive. | Roadmap line 705 |
| A tap outside the AI models screen started the queued downloads... (943-959) | Watched. Roadmap line 698. | Line 698 |
| A chat that is still writing does not look busy from another chat (1539-1575) | Watched; the Ask-half is "the maintainer's call". Roadmap line 695. | Line 695 |
| Summing up offers a fresher title (1754-1779) | Built 2026-10-02, in Verify (roadmap line 432). The note holds the design asked for by the maintainer. | Line 432 |
| Flow 2b bugs (2129-2263) | Mixed. The carousel-style chip item is still watched (roadmap line 680). The rest closed. Split: keep that one paragraph, archive the rest. | Line 680 |
| Flow L6 findings (2441-2511) | Mixed. "With details open, Down from N earlier jumps straight to the notes block" is watched (line 682). The rest closed or only measurements. | Line 682 |
| Flow L10 findings (2679-2780) | Mixed, and the most important to check. It lists "New, open" items: walking Down while an answer is still arriving loses the ring; the decode effect slows long answers with nothing running; reaching a spoiler cover by Up; small chip and spinner leftovers; the Remove-model hint; "Not in my notes" on a covered game. The one about walking Down while an answer arrives is the only one I could confirm on the roadmap. The others are not found by title in the roadmap, so the maintainer's reviewer should say if they are tracked. Keep until checked. | Needs a decision on where each open item lives |
| Spoiler leak family (962-1194, 233 lines) | The entries inside are closed (the lead entry is in `archive/roadmap-done-v0.5.0.md`). But it ends with "Deck re-check owed, row SPOILER-COVER-01" and a "New open question for the maintainer, not fixed this wave". The row id appears in no live test document. Needs one reader to confirm those two paragraphs were answered before the heading is archived. | None found |
| L3 and 2d findings (2265-2370) and Flow 4 findings (2372-2422) | Entries closed. They still contain the words "being fixed (helper F2)", which is stale wording. Also "Two confidently wrong answers, 2026-09-26" appears only in `archive/roadmap-shelved.md`. | Archive; check that one item first |
| Library format bump and per-game Deck tips (1884-1969) | Closed (R.1 to R.5 passed). One line inside says: "New bug, found by E2, not fixed: contractions split into a stray letter in keyword search". I found it nowhere else (roadmap, archive, changelog). It may be an untracked open bug. | Maintainer or reviewer to decide |
| Plan 79 measurements of the maintainer's 2026-10-02 bugs (2863-2872) | The entries it backs are mostly closed in the archive. One (After picking a setting...) is open in Verify (line 383), and that entry already links to its own heading further down (2956). No roadmap entry links to this heading. | Line 383, or merge into heading 2956 |

## Every other orphan: finished or dead

Verdict for each: **finished, archive whole** unless stated. Proof is where the entry's title sits now (an archive file or the changelog). "KB" marks a knowledge-base heading, which moves to the new knowledge-base long-notes file in step 3 only if it stays open; closed ones go to the archive instead.

| Heading (lines) | About | Proof it is finished | Move |
|---|---|---|---|
| Shipped, QA owed — why each was built this way (365-392) | Design reasons for entries moved out of Verify on 2026-08-27 | Titles sit in `archive/roadmap-bugs-fixed.md` and `archive/roadmap-completed.md`; KB-TYPE-01 and KB-CANCEL-01 are in `archive/roadmap-completed.md` and CHANGELOG.md | Archive whole (partly KB) |
| Token streaming reveals text in chunks while a game is running (493-514) | Frame-rate measurement, 2026-08-28 | Linked from `archive/roadmap-done-v0.5.0.md` | Archive whole |
| The corpus has no starting out card (643-661) | Starting-out cards | `archive/roadmap-done-v0.5.0.md` line 567 ("Starting out cards get their own kind", DONE 2026-09-26) | Archive whole (KB) |
| The eleven long files, left long on purpose (811-846) | A code-size clean-up note | Title in `archive/roadmap-completed.md` and `archive/roadmap-done-v0.5.0.md` | Archive whole |
| Every question waits about a second while the note search loads (907-940) | Timing readings, 2026-09-07 to 09-12 | Linked from `archive/roadmap-bugs-fixed.md`. Roadmap line 677 is the newer watch entry on the same subject and does not link here. | Archive (KB). Keep "What the build machine says the two states cost" only if line 677 wants a link |
| Clear cache cleared the screen but not the session (1267-1286) | Verify note, now closed | Title in `archive/roadmap-completed.md` and `archive/roadmap-done-v0.5.0.md` | Archive whole |
| Soft reply-length cap and thinking budget (1289-1303) | Verify note, now closed | Title in `archive/roadmap-bugs-fixed.md`, `archive/roadmap-completed.md`, `archive/roadmap-done-v0.5.0.md` | Archive whole |
| Searching the notes by meaning costs about a second... (1345-1357) | Accepted 2026-09-06 | Title in `archive/roadmap-bugs-fixed.md` | Archive whole (KB) |
| The "no close match" line reads wrong... (1394-1414) | Closed | Title in `archive/roadmap-bugs-fixed.md` and `archive/roadmap-done-v0.5.0.md` | Archive whole (KB) |
| Five checks from the August retrieval rework... (1417-1467) | Retrieval re-checks | Title in `archive/roadmap-completed.md` and `archive/roadmap-done-v0.5.0.md`; the note itself says four of five have answers and the follow-up passed 2026-09-23 | Archive whole (KB) |
| A suggestion chip pulled from the game's notes shows no Tip mark (1524-1536) | Closed | `archive/roadmap-done-v0.5.0.md` | Archive whole (KB) |
| A follow-up still names the wrong boss one run in three (1592-1620) | Passed on the Deck 2026-09-26 (flow L2) per the note | `archive/roadmap-done-v0.5.0.md` | Archive whole (KB) |
| Attaching a screenshot crashed the model once (1622-1676) | Decided as D112, passed 2026-09-26 | `archive/roadmap-done-v0.5.0.md` | Archive whole. A reader may want the three options paragraph kept as the decision's background |
| Opening "N earlier" floods a long chat with rows (1727-1752) | Done 2026-10-02 | `archive/roadmap-done-v0.5.0.md` line 85 (row P79-EARLIER-BY-DAY) | Archive whole |
| Saved Deck-walk replay across builds (1781-1795) | Proven 2026-09-26 | `archive/roadmap-done-v0.5.0.md`; evidence `docs/test-evidence/plan70-FLOW0-REPLAY.json` | Archive whole |
| No tip line numbers (1814-1826) | Retired by the maintainer (D112 item 14) | `archive/roadmap-done-v0.5.0.md` | Archive whole (KB) |
| Tip cut-off fix (1828-1835) | Fixed `27fd9aee` | `archive/roadmap-done-v0.5.0.md` | Archive whole (KB) |
| Lan word-boundary fix (1857-1862) | Fixed `ab0a6e40` | `archive/roadmap-done-v0.5.0.md` | Archive whole (KB) |
| KB transparency matches what the model got (1993-2007) | Passed 2026-09-22 and 09-23 | `archive/roadmap-bugs-fixed.md`, `archive/roadmap-done-v0.5.0.md`; evidence `docs/test-evidence/plan64-KB-TRANSPARENCY-names.json` | Archive whole (KB) |
| Spoiler-risk band fixes (2009-2041) | Both gaps closed, re-checked on the Deck 2026-09-26 | Linked from `archive/roadmap-bugs-fixed.md` | Archive whole |
| Model size fix and re-check (2043-2064) | Passed on the Deck 2026-09-26 | `archive/roadmap-done-v0.5.0.md` | Archive whole |
| Filters panel focus bugs (2066-2127) | Passed on the Deck 2026-09-26 | `archive/roadmap-done-v0.5.0.md` | Archive whole |
| L3 and 2d findings (2265-2370) | See above | `archive/roadmap-done-v0.5.0.md`, `archive/roadmap-bugs-fixed.md`, CHANGELOG.md | Archive whole after the one check above |
| Flow 4 findings (2372-2422) | Closed, passed flow L6 | `archive/roadmap-done-v0.5.0.md` | Archive whole |
| Branch menu template leak (2424-2439) | Passed 2026-09-26 | `archive/roadmap-done-v0.5.0.md` | Archive whole |
| A read-aloud timing test fails now and then... (2532-2538) | Fixed 2026-09-26 | `archive/roadmap-done-v0.5.0.md` | Archive whole |
| Pull the embedding model as part of installing the library (2540-2544) | Built 2026-09-26 | `archive/roadmap-done-v0.5.0.md` | Archive whole (KB) |
| Remove greys out once a model has answered... (2546-2550) | Fixed; evidence `plan64-PRELOAD-01-try3-timing.json` | `archive/roadmap-bugs-fixed.md`, `archive/roadmap-done-v0.5.0.md` | Archive whole |
| The plugin log writes one false "non-loopback" failure... (2552-2556) | Fixed; evidence `plan64-OLLAMA-TAB-AFTER-RELOAD.json` | same two archive files | Archive whole |
| The Steam ban lookup's report shows as raw text... (2558-2574) | Passed 2026-09-27 (flow L8) | `archive/roadmap-done-v0.5.0.md`; evidence `plan64-VAC-03-06.json` | Archive whole |
| A story game named while a no-story game runs lost its spoiler covers (2782-2794) | Older dated notes, already moved once (D121 item 1) | `archive/roadmap-bugs-fixed.md`, `archive/roadmap-done-v0.5.0.md` | Archive whole |
| Down takes an extra press that only scrolls... (2796-2808) | Older dated notes, entry moved to Done | `archive/roadmap-bugs-fixed.md`, `archive/roadmap-done-v0.5.0.md` | Archive whole |
| Answer quality, known issue: answers borrow each other's wording (2810-2820) | Older notes | `archive/roadmap-bugs-fixed.md`, `archive/roadmap-done-v0.5.0.md` | Archive whole |
| Around underlined words, Up is not always the reverse of Down (2982-2988) | The entry's first wording | Roadmap line 726 says DONE 2026-10-02, passed on the Deck (row P79-UP-MIRRORS-DOWN-WORDS); entry also in `archive/roadmap-bugs-fixed.md` | Archive whole |

Not a decision for me: none of these needed a decision link. Where an orphan's entry was decided (screenshot crash, D112), the decision is already in the archive entry.

## The file's own header (lines 1-14)

Is it true? No, in four places:
1. "Trimmed 2026-09-24 by plan 65 ... What is left here is the long notes for entries still open." Since then 44 headings of closed work were added (the plan 70 and plan 78 notes), so this is false today.
2. "Long-form notes for **open** roadmap entries." Only 57 of 101 headings are linked from open entries.
3. "**Fixed** items are not here." Many headings are about fixed items.
4. "Each heading below matches a roadmap item's title, and the roadmap item links here." False for the 44 orphans, and for headings like "Flow L10 findings" that group many entries.

Also: the roadmap's own line 3 links to the heading "Roadmap clean-up task: trim this file" at line 2935 (still exists, linked). That heading is about trimming this very file and can go to the archive once plan 80 is done; roadmap line 3 would then need changing.

Proposed shorter header (plain language):

```
# Roadmap details

The long notes for roadmap entries that are still open or on the watch list. The roadmap keeps each entry short
and links to its note here. A note says what was tried, what it cost, what was ruled out and how to reproduce it.

The knowledge base long notes live in [roadmap-kb-details.md](roadmap-kb-details.md). Parked work lives in
[its own file](roadmap-parked.md). Notes for finished work go to
[archive/roadmap-details-closed.md](archive/roadmap-details-closed.md), word for word.
```

(The parked-work file name is not decided in my slice; replace the second link with whatever step 3 names it.)

## Table of every heading

Count = lines from the heading to the line before the next heading. KB = a knowledge-base heading (retrieval, notes, corpus, RAG). "partly" means it mixes. I called "Terse mode", "Spoiler leak family", "Hidden spoiler box..." and the Flow headings "no" (reply style, spoiler cover and D-pad items). Step 3 should read these before moving them.

| Lines | Count | Linked from roadmap | Knowledge base | Heading |
|---|---|---|---|---|
| 15-181 | 167 | no | no | The panel stops half way down and the Ask button is out of reach |
| 183-212 | 30 | yes | yes | Ordinary phrases attach game cards |
| 214-303 | 90 | yes | no | Terse mode (Speed answers in three lines) |
| 305-322 | 18 | yes | no | The chat summary card appears behind the dock until Down is pressed |
| 324-346 | 23 | yes | no | Some saved answers have a hidden block's markers written twice, cause unknown |
| 348-363 | 16 | yes | no | Make the preset chips look more like chips |
| 365-392 | 28 | no | partly (mostly KB) | Shipped, QA owed — why each was built this way |
| 394-419 | 26 | yes | yes | The shipping retrieval arm loses to the vector half alone on rows nobody tuned a |
| 421-480 | 60 | yes | yes | A troubleshooting question that only describes the symptom reaches no tips |
| 482-490 | 9 | yes | yes | Unrelated questions still get game cards stapled on (2026-09-02 wording) |
| 493-514 | 22 | no | no | Token streaming reveals text in chunks while a game is running |
| 516-527 | 12 | yes | no | Small and cosmetic, as filed |
| 529-534 | 6 | yes | no | User-adjustable spoiler fencing (absorbed into the tiered setting) |
| 536-558 | 23 | yes | no | Ask / reply items with short entries, as filed |
| 560-588 | 29 | yes | no | Deck health snapshot, Local reply TTS, On-Deck model benchmark |
| 590-596 | 7 | yes | no | First-run ghost New chat label |
| 599-608 | 10 | yes | no | Replace the bonsAI tab icon |
| 610-619 | 10 | yes | no | Adjustable text size in Settings |
| 622-629 | 8 | yes | no | Focus / Deck UI items with short entries, as filed |
| 632-641 | 10 | yes | no | Spoiler coverage should be a setting with tiers |
| 643-661 | 19 | no | yes | The corpus has no starting out card |
| 663-669 | 7 | yes | yes | Eval fixture cannot see a recall failure |
| 671-677 | 7 | yes | yes | KB visual maps |
| 679-687 | 9 | yes | yes | KB online / versus strategy content, and RAG Phase 5 |
| 689-752 | 64 | yes | yes | RAG Phase 4: extended retrieval |
| 754-772 | 19 | yes | yes | RAG Phase 7, Community tip contribution, RAG Phase 8 |
| 775-787 | 13 | yes | yes | A troubleshooting question mostly never reaches the tips |
| 790-800 | 11 | yes | no | Permissions / safety items, as filed |
| 803-809 | 7 | yes | no | Platform / upstream items, as filed |
| 811-846 | 36 | no | no | The eleven long files, left long on purpose |
| 848-863 | 16 | yes | no | Controller macro test rig and live view |
| 865-904 | 40 | yes | no | The five-star and six-star platform items, as filed |
| 907-940 | 34 | no | yes | Every question waits about a second while the note search loads |
| 943-959 | 17 | no | no | A tap outside the AI models screen started the queued downloads and left the D-p |
| 962-1194 | 233 | no | no | Spoiler leak family |
| 1196-1210 | 15 | yes | no | Headline first: every answer opens with one line that stands alone |
| 1213-1225 | 13 | yes | no | Give the reclaimed height to the transcript |
| 1228-1244 | 17 | yes | no | The floating panel inside SteamVR |
| 1247-1264 | 18 | yes | no | One decision for three items: the SteamVR panel, leaving Decky, and reopening ll |
| 1267-1286 | 20 | no | no | Clear cache cleared the screen but not the session |
| 1289-1303 | 15 | no | no | Soft reply-length cap and thinking budget |
| 1306-1342 | 37 | yes | no | Named chat slots |
| 1345-1357 | 13 | no | yes | Searching the notes by meaning costs about a second, every time, on the Deck |
| 1360-1391 | 32 | yes | yes | Wrong-subject notes |
| 1394-1414 | 21 | no | yes | The "no close match" line reads wrong next to a note the reply used |
| 1417-1467 | 51 | no | yes | Five checks from the August retrieval rework were never run on the Deck |
| 1470-1504 | 35 | yes | no | Hidden spoiler box stays shut on games with no Steam ID and on name-first questi |
| 1507-1521 | 15 | yes | yes | RAG Phase 8: catalog corpus |
| 1524-1536 | 13 | no | yes | A suggestion chip pulled from the game's notes shows no Tip mark |
| 1539-1575 | 37 | no | no | A chat that is still writing does not look busy from another chat |
| 1578-1589 | 12 | yes | no | The open tab strip redrawn: six equal cells, one icon family, only the current t |
| 1592-1620 | 29 | no | yes | A follow-up still names the wrong boss one run in three |
| 1622-1676 | 55 | no | no | Attaching a screenshot crashed the model once |
| 1678-1725 | 48 | yes | no | Measure how well the AI reads a screenshot |
| 1727-1752 | 26 | no | no | Opening "N earlier" floods a long chat with rows |
| 1754-1779 | 26 | no | no | Summing up offers a fresher title |
| 1781-1795 | 15 | no | no | Saved Deck-walk replay across builds |
| 1797-1812 | 16 | yes | no | Cost to a running game, second sighting |
| 1814-1826 | 13 | no | yes | No tip line numbers |
| 1828-1835 | 8 | no | yes | Tip cut-off fix |
| 1837-1847 | 11 | yes | no | Blind questions done |
| 1849-1855 | 7 | yes | yes | Speed mode tip gap |
| 1857-1862 | 6 | no | yes | Lan word-boundary fix |
| 1864-1882 | 19 | yes | yes | Three new games and their notes |
| 1884-1969 | 86 | no | yes | Library format bump and per-game Deck tips |
| 1971-1991 | 21 | yes | yes | Black Mesa's electrified-water question |
| 1993-2007 | 15 | no | yes | KB transparency matches what the model got |
| 2009-2041 | 33 | no | partly | Spoiler-risk band fixes |
| 2043-2064 | 22 | no | no | Model size fix and re-check |
| 2066-2127 | 62 | no | no | Filters panel focus bugs |
| 2129-2263 | 135 | no | no | Flow 2b bugs |
| 2265-2370 | 106 | no | no | L3 and 2d findings |
| 2372-2422 | 51 | no | no | Flow 4 findings |
| 2424-2439 | 16 | no | no | Branch menu template leak |
| 2441-2511 | 71 | no | partly | Flow L6 findings |
| 2513-2530 | 18 | yes | no | Overnight run's first real run |
| 2532-2538 | 7 | no | no | A read-aloud timing test fails now and then when the PC is busy |
| 2540-2544 | 5 | no | yes | Pull the embedding model as part of installing the library |
| 2546-2550 | 5 | no | no | Remove greys out once a model has answered a question, until the plugin reloads |
| 2552-2556 | 5 | no | no | The plugin log writes one false "non-loopback" connection failure right at start |
| 2558-2574 | 17 | no | no | The Steam ban lookup's report shows as raw text, not a table |
| 2576-2677 | 102 | yes | partly | Flow L7 findings |
| 2679-2780 | 102 | no | partly | Flow L10 findings |
| 2782-2794 | 13 | no | no | A story game named while a no-story game runs lost its spoiler covers |
| 2796-2808 | 13 | no | no | Down takes an extra press that only scrolls before reaching a section below the  |
| 2810-2820 | 11 | no | no | Answer quality, known issue: answers borrow each other's wording |
| 2822-2831 | 10 | yes | no | What bonsAI costs a running game |
| 2833-2845 | 13 | yes | no | A Strategy checklist that arrives while the panel is closed never shows, and aft |
| 2847-2851 | 5 | yes | no | A faded ghost of the tab bar is left drawn over the chip row after touching the  |
| 2853-2861 | 9 | yes | no | The chat summary reads oddly in places |
| 2863-2872 | 10 | no | no | Plan 79 measurements of the maintainer's 2026-10-02 bugs |
| 2874-2888 | 15 | yes | no | When the length limit cuts a choice menu, the next part of the answer is lost |
| 2890-2899 | 10 | yes | no | The game's own chip never came back, and the chips turned over too slowly |
| 2901-2909 | 9 | yes | no | After the quick start is opened and closed, the help chip stayed and the suggest |
| 2911-2915 | 5 | yes | no | A press that never opens its box (parental lock on) can leave a stale "return th |
| 2917-2921 | 5 | yes | no | After the release: two clean-ups behind the scenes |
| 2923-2927 | 5 | yes | no | The walk check calls a stop hidden when a corner icon merely overlaps its box |
| 2929-2933 | 5 | yes | no | With Voice replies on "When I asked by voice", a spoken question's answer may no |
| 2935-2954 | 20 | yes | no | Roadmap clean-up task: trim this file (done 2026-09-15) |
| 2956-2980 | 25 | yes | no | After picking a setting from the search list above the question box, Down cannot |
| 2982-2988 | 7 | no | no | Around underlined words, Up is not always the reverse of Down |

## Notes for the review

- **Counts:** 57 headings linked; 44 orphans. Of the 44, about 31 are finished and can go to the archive whole. About 13 need a look first (the first table): 5 are watched or in Verify and need a roadmap link, 3 are mixed, 5 are closed but hold one unconfirmed open item or owed row. Per-entry verdicts like "true" or "stale" do not apply to headings.
- **Two untracked possible bugs** found inside closed notes: contractions splitting into a stray letter in keyword search (line ~1950 area, heading "Library format bump..."), and several "New, open" items in "Flow L10 findings" that I could not find by title on the roadmap. Reviewer: please confirm they are tracked, or file them. I did not file anything.
- **Stale wording** to remove when these move: "being fixed (helper F2)" in the L3 and Flow 4 notes.
- **Archive links will go stale.** Archived entries link to these headings. Call 6 says archived documents get a one-line warning, not a rewrite, so that is fine, but the archive target (`archive/roadmap-details-closed.md`) needs the same headings kept so a search still finds them.
- **Roadmap watch entries (lines 680, 682, 695, 698, 705) have long notes and no link.** This is the gap the review should close first.
- **Row SPOILER-COVER-01** is named in the Spoiler leak family note, and I found it in no test document. The evidence is owed or the row was dropped; I cannot say which.
- The two files already modified in the checkout (`docs/audit/maintainer-decisions-locked.md`, `docs/planning/80-roadmap-check-and-tidy.md`) belong to someone else; I did not touch them.
