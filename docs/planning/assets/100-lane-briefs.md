# Plan 100: the briefs, one per helper

How a brief is assembled: the session hands each helper `100-helper-rules.md`, the section below with its letter, the
tip hash, the absolute path of its copy, and the plan number (100). Nothing else is needed. A section says: what a
player sees today, where it comes from (files and the reading behind it), what to build, the files owned, the test at
the Deck's level, and the Deck check that proves it (the row). Evidence files are named `plan100-<ROW>.json` by the
driver, never by a helper. Line numbers are as read at tip `a03dd48` on 2026-10-25 by read-only lookups; the session
re-checks each brief against the code at go, as plan 98 did, and corrects the task text where they drifted.

Model and effort per lane are in the plan's § 5. A lane that finds its brief wrong says so and stops rather than
building the brief's mistake.

---

## K0 — The bookkeeper's pre-go audit (★ docs, Sonnet medium; the same brief again as K9 at the end)

**What this is.** The knowledge-base roadmap must be right before the first lane starts. Six read-only lookups on
2026-10-25 found entries that describe the code wrongly, and the top paragraph is three weeks stale. Fix the words in
one commit; move nothing between sections; invent no result.

**Fix, each named in your report:**
1. The "Where things stand" paragraph of `docs/roadmap-kb.md`: the library on both download sites is 2026.10.25 (38
   games, 414 notes, 164 Deck tips, 351 tap-to-define words across all 38 games), published by the maintainer on
   2026-10-25 and read back from both channels byte for byte (`docs/knowledge-base.md`, the releases table); the Deck's
   own copy is whatever block L0 reads (the session gives you the version). Keep the search and answer figures and their
   dates as they are.
1b. Two rows that passed on the Deck on 2026-10-25 and say "to move to Done in the next docs sweep": the glossary
   first-mention entry in `docs/roadmap-kb.md` (row P98-GLOSSARY-FIRST-01, evidence
   `workshop:test-evidence/plan98-P98-GLOSSARY-FIRST-01.json`) and the spoiler row's ring entry in `docs/roadmap.md`
   (row P98-SPOILER-FOCUS-01, evidence `workshop:test-evidence/plan98-P98-SPOILER-FOCUS-01-try2.json`). Move each to
   its Done list as one line, the full entry to the matching archive file, and close the row everywhere it reads open
   (`git grep -n` the row id across `docs/`); confirm both evidence files exist in the workshop first.
2. The Bugs entry "Route look: the shown steps are forgotten when the cache is cleared": the code reading says Clear
   cache and leaving Strategy clear the ticks and leave the revealed steps in the panel's browser storage, so a route
   can come back with later steps open and nothing ticked; only Clear all data removes them. Reword the symptom to that;
   keep the proposed fix (saved beside the ticks).
3. The Bugs entry "A thank-you or a junk phrase is treated as a follow-up": "thank you very much" has no "it" and never
   reaches the "it" rule; on Strategy and Expert turns the previous question and answer are handed to the AI whenever the
   new question names no boss or enemy, with no check. "what time is it" does pass the "it" rule. Reword the cause.
4. The Bugs entry "Thumbs-down: Undo shows only on the newest answer": the place to see and clear lowered notes is a
   row in the Knowledge base section, which sits in the Ollama tab beside Remove (not a Settings row).
5. Every entry: the status word agrees with its newest dated note; no in-progress wording; five lines at most (move
   older dated notes to `docs/roadmap-kb-details.md` under the entry's heading and link them); every link resolves.
6. Append decision **D137** to `docs/audit/maintainer-decisions-locked.md` in the house shape of D135: the heading
   "D137 — LOCKED 2026-10-25 (raised 2026-10-25) — Plan 100, the knowledge-base phases, bugs and 'Suggest as a tip':
   the fourteen calls", then plan 100 § 2 word for word with "the defaults on all fourteen" and the usage figures given
   (53 percent of the five-hour window and 53 percent of the week on 2026-10-25). Check 137 is free first.

**Files owned:** `docs/roadmap-kb.md`, `docs/roadmap-kb-details.md`, `docs/roadmap.md` and `docs/testing.md` (item 1b
only), the two archive files item 1b moves entries into, `docs/audit/maintainer-decisions-locked.md`. End with
`python scripts/docs_toc.py` if a heading changed, then `python scripts/verify.py --quick`. Commit when told.

---

## T — Troubleshooting tips: the words people type (★★★ `[KB]`, Sonnet high)

**What a player sees today.** "My game closes on its own" or "I can't find my PC" gets a generic answer with no tip,
or the wrong tip (the hotel Wi-Fi tip for "cant find my pc on the network"). Of 24 plain problem sentences written
blind on 2026-09-07, 8 reach a tip and 6 of those reach the right one (plan 98 lane F). The second opinion on 2026-10-24
said the fix is wording in two places, not a cut-off.

**Where it comes from.** The tip sheet `data/kb/compat_patterns.json`: each tip has `pattern_id`, `topic`, `platforms`,
`card`, `source_url` (empty) and `source_license` ("bonsAI-maintainer" for all 164; the tips are the maintainer's own
words). The word search indexes `topic`, `platforms` and `card` only (`py_modules/backend/knowledge/knowledge_base_schema.py`
lines 170 and 220). A question reaches the tip sheet only when the router finds a topic in it:
`py_modules/backend/knowledge/compat_topic_router.py`, the word lists `_TOPIC_RULES` at lines 75 to 306 (storage 155
to 165, network 176 to 195, audio 238 to 244, display 245 to 257, crash 277 to 283), the weak topics that never route
alone at 311, the "crash" and "linux" exception with no game running at 318, the gate `question_targets_compat_corpus`
at 368 to 382 (called from `knowledge_base_service.py` 562 to 566). The 24 sentences are rows `V2-W2-SYM-01` to `-24`
in `tests/fixtures/kb_eval_v2.json` (lines 6249 to 6594), split `holdout`, domain `compat`, `expect_section` empty and
no `expect_topic`. The measuring script `scripts/measure_kb_floor_holdout.py` picks them by id prefix (line 179) and
prints how many reach a tip (line 298); it records no right tip because none is written (lines 183 to 185).

**The tips to reword (by id):** 125 (crash, "a crash drops you back to the game library": add "home screen", "closes on
its own", "quits", "shuts off"); 76 (storage, "Internal storage full": add "not enough space", "no space left", "can't
install"); 126 (crash at launch: add "won't open", "won't start", "nothing happens when I launch"); 154 and 152
(display, blank screen: add "black screen", "goes black", and say the built-in screen too, not only an external one);
111 and 110 (the PC's address and the same home network: add "can't find my PC", "my computer is not in the list", "same
network"); if neither 110 nor 111 is really about finding the PC from the Ollama tab's Find LAN search, say so and
propose one tip in your report rather than writing it. Plain words go into the tip's own text, in the maintainer's
voice, one or two short sentences more at most.

**Build, four commits.**
1. The seven tips reworded; two new tips (plan 100 call 3), topic `audio` ("sound comes out of the TV instead of the
   headphones plugged into the Deck") and topic `display` ("menus sit off the edge or out of place on a TV"), each
   starting "Researched, unconfirmed:" as tips 1634 to 1656 do, `source_license` "bonsAI-maintainer", ids after the
   last. A test asserts each of the 24 sentences' key phrase appears in the tip it should reach.
2. The router: the same phrases in the matching word lists (storage, crash, display, network, audio), each rule
   written as the existing ones are (a set of words that must all appear). `tests/test_compat_topic_router.py`: one
   case per phrase, plus the existing cases unchanged, plus three questions that must still **not** route ("how do I
   beat the boss", "what should I build first", "thank you very much").
3. The fixture: each of the 24 rows gains `expect_topic` and a new optional `expect_pattern_id` (the right tip's id; empty
   where no tip fits even after this lane, and say which in the report). Two of the 24 (the TV sound one at line 6419
   and the TV menus one) point at the two new tips.
4. The measuring script reads `expect_pattern_id` and prints, beside "reach a tip", "reach the right tip" and a table
   of sentence, first tip, right or wrong, before and after (run it on the tip's library and on yours; Ollama is up on
   this PC).

**Files owned:** `data/kb/compat_patterns.json`, `compat_topic_router.py`, `tests/test_compat_topic_router.py`, the 24
rows of `tests/fixtures/kb_eval_v2.json` and nothing else in it, `scripts/measure_kb_floor_holdout.py`, a new
`tests/test_compat_patterns_plain_words.py`.

**The test at the Deck's level:** the router test says "game keeps closing on its own" reaches the crash topic with
nothing running; the measuring script's table shows more of the 24 reaching the right tip than before, and none that
reached the right tip before now reaches a wrong one. Report the compat rows of the search test
(`python scripts/kb/eval_kb_embed_models.py --arms-only`, the compat lines) before and after: same or better.

**The Deck check (P100-TIPS-01, block L1):** nothing running, three sentences typed with the send-question script
("my game keeps closing on its own", "it says there is no space left", "the screen goes black when I open it"): each
answer carries a tip chip or a Deck tip in its notes and the log's attach line names the tip; a boss question attaches
no tip.

---

## P — Two prompt lines (★ and ★★ `[KB]`, Sonnet high; the only lane in the prompt file)

**What a player sees today.** A route step never says what you need for it, and the AI sometimes names the wrong game
for a screenshot even when the game is running and named to it (4 of 9 God of War asks on 2026-10-24).

**Where it comes from.** `py_modules/backend/prompts/ollama_prompts.py`: the checklist instruction at lines 639 to 640
("After coaching prose, emit exactly one ```bonsai-strategy-checklist fenced block with valid JSON (2–8 short actionable
steps; each item needs "id" and "label")"); the picture rules at 443 to 470 (focus on the game scene, name a game only
with two clues, describe only what is visible); the running-game line at 394 to 399 ("The currently running game is:
<name> (AppID: <id>)."). The panel draws a "Needs" line only when a step's own label carries one, split by
`src/features/strategy/strategyChecklist.ts` line 163: "Step. Needs: x", "Step (needs: x)" or "Step — Needs: x".

**Build, two commits.**
1. The checklist instruction gains one clause: a step that needs an item, ability or unlock ends with "Needs: <the
   thing>", and a step that needs nothing has no such words. Example in the clause, in the exact shape the panel parses
   (a full stop, then "Needs:"). A test asserts the clause is in the strategy prompt and absent from Speed and Expert
   prompts, and that the example parses with `splitStrategyStepNeeds` (a Python copy of the pattern in the test is fine).
2. The picture rules gain one sentence after the running-game line applies: when a running game is named above, the
   picture is from that game; describe where in it the player is, and never name another game. A test asserts the
   sentence is present only when a picture is attached and a game is running.

**Files owned:** `ollama_prompts.py`, a new `tests/test_ollama_prompts_plan100.py`. The Default spoiler paragraph is
pinned by `tests/fixtures/spoiler_default_tier_golden.json`; it must not change. Report the system prompt's character
count before and after for a Strategy turn with a picture (rule 20).

**The test at the Deck's level:** the prompt tests above; the effect is measured by lane X (the answer test and the
screenshot scoring script) after you land.

**The Deck check (P100-NEEDS-01, block L1):** Strategy, Hollow Knight by name, "how do I get to the first boss": the
route draws at least one step with a "Needs" line. Two differently worded tries before UNCLEAR.

---

## F — A courtesy or junk phrase is not a follow-up (★ `[KB]`, Sonnet high)

**What a player sees today.** After a boss question, "thank you very much" gets the boss answer again (plan 98 block
K0, Deep Rock Galactic: Survivor running); "what time is it" pulled three notes and the AI said it has no clock.

**Where it comes from.** `py_modules/backend/knowledge/kb_followup_memory.py` lines 123 to 138: a question is a follow-up
when it starts with "what about", "how about", "and the" or "and its" (34 to 39), or has eight words or fewer and one of
it, its, it's, that, him, her, them (42, 46, 136). "thank you very much" fails that rule; "what time is it" passes it.
The rule's only caller is in the same file, 237 to 249: it adds the remembered subject to the search words when the
rule passes (247). The prompt side never checks it: `py_modules/backend/ask/game_ai_request.py` 559 to 585 passes the
remembered subject whenever the question names no entity (566, 570) and prepares the previous question and answer
(576 to 585), which go into the model's question at 841 to 850 (the switch is on by default, `kb_followup_memory.py`
74 to 78). Twelve junk phrases already exist in `scripts/measure_kb_floor_holdout.py` 43 to 56. Tests:
`tests/test_kb_followup_memory.py` 203 to 233 (the phrase rule), `tests/test_game_ai_request_followup_memory.py`,
`tests/test_knowledge_base_service.py` 2288 to 2308 ("thank you very much attaches nothing", Speed mode only).

**Build, two commits.**
1. `kb_followup_memory.py`: a function that says whether a question is a courtesy or junk phrase: a small list (thanks,
   thank you, ok, okay, hello, hi, bye, never mind, sounds good, that is great, what did you say, please repeat that)
   matched as whole phrases with everyday endings trimmed, plus everyday non-game questions about the time, the date and
   the weather. The phrase rule returns false for them. Tests: the twelve junk phrases are not follow-ups; "how do I beat
   it", "what about the second phase" and "and its weak points" still are; a question with a game word ("thanks, now how
   do I beat the dreadnought") is not junk.
2. `game_ai_request.py`: when the question is a courtesy or junk phrase, no subject is passed (570), no previous question
   and answer are prepared or sent (576 to 585, 841 to 850), and the remembered subject is not added to the search. A
   test at the request level: after a boss turn, "thank you very much" builds a prompt with no subject note and no
   previous answer, and the search words are the question alone.

**Files owned:** the two files above and their tests (`tests/test_kb_followup_memory.py`,
`tests/test_game_ai_request_followup_memory.py`, a new test file if cleaner).

**The test at the Deck's level:** the request-level test above, run against the built library with Deep Rock Galactic:
Survivor's id: the thank-you turn attaches nothing and carries nothing forward.

**The Deck check (P100-THANKS-01, block L1, the game running, a fresh chat):** a boss question, then "thank you very
much": a short reply, no notes block, no previous answer repeated, the attach line empty; "what time is it": the same;
"how do I beat it": the boss answer again.

---

## R — The route look's revealed steps travel with the ticks (★ `[KB]`, Sonnet high)

**What a player sees today.** On a route, the steps you opened by hand are kept in the panel's browser storage
(`src/features/strategy/strategyChecklistPersistence.ts` line 74, key "bonsai:strategy-route-revealed"; read 79 to 95;
save 98 to 106; 20 lists kept), keyed by the game, the title and the steps' words (`strategyChecklist.ts` 158 to 160),
read and written by the panel (`StrategyChecklistPanel.tsx` 99 to 117, save at 111). The ticks are saved per game in
the back end: the screen sends them (persistence 37 to 41, scheduled by `useStrategyBranchActions.ts` 138 to 148),
`main.py` 1014 to 1024 hands off to `py_modules/backend/strategy/strategy_checklist_rpc.py` (load 37 to 50, save 53 to
80, clear 83 to 96), the file `strategy_checklist_session.json` is written by `strategy_checklist_session_service.py`
(combine 160 to 193, write 134 to 148, 32 games kept). Clear cache clears the ticks for the last game asked about
(`main.py` 2026 to 2038) and leaves the revealed steps; leaving Strategy does the same
(`useStrategyChecklistSession.ts` 93 to 101); only Clear all data wipes the browser storage
(`clearBonsaiBrowserStorage.ts` 29 to 50). So a route can come back with later steps open and nothing ticked.

**Build, three commits.**
1. The per-game save gains a `revealed` list of step ids beside the ticks: the rpc save accepts it, the service keeps
   it (and drops it with the ticks on clear), the load returns it. Python tests: save, load, clear, an old file with no
   `revealed` key loads as empty.
2. The screen sends `revealed` with the ticks and reads it from the load; the panel takes its revealed set from the
   checklist state, not from browser storage. Tests: reveal a step, the save carries it; a loaded checklist with a
   revealed step draws it open; Clear cache's reset clears it with the ticks.
3. Remove the browser-storage copy and its key (and its test); the Clear all data wipe needs no change.

**Files owned:** `strategyChecklistPersistence.ts`, `StrategyChecklistPanel.tsx`, `strategyChecklist.ts`,
`useStrategyBranchActions.ts`, `useStrategyChecklistSession.ts`, `strategy_checklist_rpc.py`,
`strategy_checklist_session_service.py`, and their tests (`strategyChecklistPersistence.test.ts`,
`StrategyChecklistPanel.test.tsx`, `strategyChecklistReopen.test.ts`, `tests/test_strategy_checklist_session_service.py`).
`main.py` is not yours: the method already hands the payload through; if it does not, stop and say so.

**The test at the Deck's level:** a five-step route; reveal step 3 and tick step 1; a remount from the saved state
draws 1 ticked and 3 open; the Clear cache reset leaves 1 unticked and 3 covered.

**The Deck check (P100-ROUTE-SAVE-01, block L1):** a route question in Hollow Knight by name; A on step 1 (tick), A on
a covered step (reveal); close and reopen Quick Access: both kept; Settings → Clear cache: both gone together; the
file's content read over SSH before and after (key names and the lists).

---

## V — Hide more on the screen side (★★ `[KB]`, Sonnet high; lands before U and J are cut)

**What a player sees today.** With "How much to hide" on Hide more, a cover on a game with no story (Mario Kart 64, a
sandbox) still opens by itself on screen, because the screen never reads the setting.

**Where it comes from.** `src/features/spoilers/unwrapAskedEntitySpoilerFences.ts` 120 to 131: a cover naming a
protected note never opens (122); consent opens every cover (126); **a game in the no-story list opens every cover
(127)**; otherwise a cover opens only when it names what the question asked about (128 to 130). The options type (40
to 65) has no tier field. Used by `src/features/answer/bubble/buildAnswerBubbleElement.tsx` 244 to 265 and
`buildAnswerSections.tsx` 157; the transcript reads the protected flags at `MainTabChatTranscript.tsx` 493 and 521.
The setting reaches the screen as `spoilerTier` (`usePluginSettings.ts` 130; read in `src/index.tsx` 280; bundled for
the Settings tab at 943 to 946), but nothing under the answer or spoiler folders reads it. The back end under Hide more
already asks for covers on no-story games (`spoiler_title_profiles.py` 271 to 283 returns "strict_tier";
`strategy_spoiler_policy.py` 98 to 100 and 391 to 399).

**Build, two commits.**
1. The unwrap options gain `spoilerTier`; under "strict" the no-story rule at 127 is skipped (the protected-note rule and
   consent still apply; a cover naming the asked-about thing still opens, rule 7 of the constitution). Default and open
   behave exactly as today: the existing tests pass unchanged, and a new test runs the same no-story cover under all
   three values.
2. The setting travels from `index.tsx` through the Main tab's payload to the transcript and into the two call sites.
   One pass-through per file, nothing else changes in them.

**Files owned:** `unwrapAskedEntitySpoilerFences.ts` and its test, `buildAnswerBubbleElement.tsx`,
`buildAnswerSections.tsx`, `MainTabChatTranscript.tsx` (one pass-through), the Main tab payload hook (find it from
`index.tsx`; name it in the report), `index.tsx` (one line), tests `MainTabChatTranscript.spoilerStaysOpen.test.tsx`
and a new tier test.

**The test at the Deck's level:** a Mario Kart 64 answer with a cover that names no asked-about thing: under strict the
cover stays shut; under default it opens; a cover naming a protected note stays shut under all three.

**The Deck check (P100-HIDE-MORE-SCREEN-01, block L1):** Settings → Hide more; Strategy, "in Mario Kart 64 what is the
best shortcut on the last track" and a second wording; count covers at 250 ms reads: a cover drawn by the AI stays shut.
Then Default, two more wordings: the cover opens by itself. A spoiler change is not believed until the Deck shows a
cover; if the AI draws none in two tries, UNCLEAR with the answers' last lines.

---

## W — The Search tab lands on the "How much to hide" row (★ `[KB]`, Haiku high on trial; Sonnet medium if it stalls)

**What a player sees today.** Search tab, type "spoilers", A: the ring lands on the Story spoilers section line, not on
the row.

**Where it comes from.** The index `src/features/search-tab/bonsaiSettingsIndex.ts`: the Story spoilers entry at line 49
(row "story-spoilers"), Text size at 47 (row "text-size"); no entry for "How much to hide". Text size registers its row
as a jump target at `SettingsTabChatTextSizeRow.tsx` line 60 through `bonsaiSettingRowNav.ts` 24 to 31; the tier row
(`SettingsTabSpoilerTierRow.tsx` 54 to 58, 72) registers a different holder through the general focus registry and never
the row holder, so the jump (`bonsaiSettingJump.ts` 61 to 75; four tries at 46, 48, 71) falls back to the section
line. A test pins that fallback: `SearchTab.bonsaiJump.test.tsx` 151 to 157.

**Build, one commit.** An index entry "How much to hide" (row "spoiler-tier", section "spoilers", search words: hide
more, hide less, spoiler tier, how much to hide); the tier row registers its row holder the way Text size does at line
60, pointing at the Default button (read `SettingsTab.tsx` around the Story spoilers section first: on 2026-10-25 the
switch above the row had its Up and Down moved onto a wrapper, commit `6c80feba`, so the lines above have shifted and
the row's own entry stop is now reached by that wrapper's Down); the test at 151 to 157 now expects the ring on the Default button for both "Story
spoilers" and "How much to hide"; `bonsaiSettingsIndex.test.ts` gains the new entry.

**Files owned:** `bonsaiSettingsIndex.ts`, `SettingsTabSpoilerTierRow.tsx`, `SearchTab.bonsaiJump.test.tsx`,
`bonsaiSettingsIndex.test.ts`.

**The test at the Deck's level:** the jump test lands on the Default button.

**The Deck check (P100-SEARCH-TIER-01, block L1):** Search tab, "spoilers", A: the ring on Default, a screenshot.

---

## Y — The Yoshi's Story note (★ `[KB]`, Haiku high on trial)

**What a player sees today.** The "Picking story pages and levels in Yoshi's Story" note (section 376 of
`data/kb/strategy_seed.json`) says "24 levels split across four worlds of six pages" and also "only six levels are
played in any one run". The game has six worlds (pages) of four levels each.

**Build, one commit.** Re-read the cited page first:
`python scripts/kb/fetch_wiki_live_pages.py --api https://www.mariowiki.com/api.php --titles "Yoshi's Story" --out .scratch/yoshi`,
quote in your report the line that gives the number of pages and levels per page. Then change only the first sentence
of the card to: "Story Mode holds 24 levels split across six worlds (pages) of four levels each, but only six levels
are played in any one run: finishing a level jumps straight to the next world rather than offering the other three
levels from the world just left." Set `crawled_at` to today's date. Nothing else in the note or the file changes.
Build the library once in your copy to prove the file is accepted.

**Files owned:** section 376 of `data/kb/strategy_seed.json` only.

**The check (P100-YOSHI-01, block L1):** the built library's section 376 reads the new sentence; on the Deck with the
test library installed, "how do the worlds and pages work in Yoshi's Story" quotes six worlds.

---

## N1 to N4 — Enemy and item notes for the four thin games (★★★★ `[KB]`, Sonnet high, four lanes; call 2)

**What a player sees today.** "How do I deal with the Owlbear in Baldur's Gate 3" or "what does body armor do in GTA San
Andreas" gets the model's memory, not a note: Baldur's Gate 3 (8 notes), GTA San Andreas (11), The Sims 4 (9) and
Portal 2 (9) have no enemy or item notes at all (counted 2026-10-03 and again 2026-10-25). Their chips have one flavour.

**Where it comes from.** The library builder reads every `*.json` under `data/kb/notes/` after the seed (plan 98 lane A0;
`scripts/kb/build_rag_db.py` 581 to 607): an object with `games`, `aliases` and `sections` lists, merged after the seed;
the usual checks run (section ids unique, a cited source carries `crawled_at`, the "Starting out" naming rule). A
section has `section_id`, `game_id`, `section_type`, `name`, `card`, and `source_url`, `source_license`,
`source_version`, `crawled_at`. The labelled short-line shape the sixteen existing enemy and item cards use (sections
120 and 125 are the models): `Summary:` one line; `Weak points:` (enemy) or `Uses:` (item) one line; `Tips:` one or two
lines; each line a plain sentence.

**The games and their sources.**
- **N1, Baldur's Gate 3** (`game_id` 4, app 1086940). Its own wiki is NonCommercial and cannot be used. Source:
  Wikipedia pages (CC BY-SA 4.0; the fetcher's api is `https://en.wikipedia.org/w/api.php`) where they hold the fact,
  else nothing. Expect fewer notes; report the shortfall rather than fill it from memory.
- **N2, GTA San Andreas** (`game_id` 9, app 1547000). Source: the GTA wiki (`https://gta.fandom.com/api.php`, CC BY-SA
  3.0, as its nine cited notes do). Enemies: gang members, police response levels, vehicles that hunt you; items:
  weapons, body armor, health pickups, properties that save.
- **N3, The Sims 4** (`game_id` 10, app 1222670). No enemies exist; write items (objects and build pieces a player asks
  about) and, if the wiki supports it, hazards (fire, death types) as `enemy`-kind cards only where a player would ask
  "how do I deal with". Source: the Sims wiki (`https://sims.fandom.com/api.php`) if the fetcher prints CC BY-SA; else
  own words from the nine existing notes only.
- **N4, Portal 2** (`game_id` 12, app 620). Source: the Portal wiki (`https://theportalwiki.com/api.php`, CC BY 4.0, as
  its nine notes do). Enemies: turrets, the kinds of turret, Wheatley's traps; items: the gels, cubes, the portal gun's
  limits.

**Build (content only, one commit per three to five notes).** One new file `data/kb/notes/<game>.json` with an empty
`games` list, an empty `aliases` list and ten to fifteen `sections` (fewer for N1 if the source runs out). Section ids:
N1 1000 to 1099, N2 1100 to 1199, N3 1200 to 1299, N4 1300 to 1399. `source_url` the page read, `source_license` as the
fetcher printed it, `source_version` the revision id, `crawled_at` today. A sidecar `<game>.sources.json` lists, per
`section_id`, the page, the revision and the sentence or table row each line was drawn from. No character names from a
story-protected game in a note's name unless the character is a boss or enemy a player fights. Read every sentence
against its page before you report, line by line, and say so.

**Files owned:** your file and its sidecar only. A schema check script of your own in `.scratch/` (fields present, ids
in range, game id right, no repeats within your file) and one library build in your copy.

**The test at the Deck's level:** none in code; the builder's refusal rules and your line-by-line read are the test.
Your report lists every note's name, kind and page, and the list of entity names (names only) for lane Q.

**Nothing lands before the maintainer has read one game's notes in the chat.** The session reads the first finished
lane's notes aloud; the other three wait on that read.

**The Deck check (P100-FOUR-GAMES-01, block L2):** with the test library installed, nothing running, "in Portal 2 how do
I get past a turret" attaches a turret note; "in GTA San Andreas what does body armor do" attaches the armor note.

---

## X — The seven AI measurements, one after another on this PC (★★ `[KB]`, Sonnet medium, a long job)

Nothing in the repo changes. Every report file goes to the workshop research folder with today's date and `p100` in
its name; your report carries the numbers and the exact commands. Ollama is up on this PC; the library at
`build/knowledge-base` has every meaning vector. Run them in this order; if time runs out, report what finished.

**Before the landings (the first half):**
1. **The search fixture baseline:** `python scripts/kb/eval_kb_embed_models.py --arms-only --write-report`, keeping the
   per-question output (read `--help` for the flag); save it, it is the "before" for item 6.
2. **The tips reach:** `python scripts/measure_kb_floor_holdout.py --json .scratch/tips-before.json --label before`; the
   24 sentences: how many reach a tip, which tip first (8 reached, 6 right on 2026-10-24, read by hand). List the 24
   with the first tip's id.
3. **Hide more against Default, second run:** `python scripts/kb/eval_kb_answers.py --samples 3 --spoiler-tier strict
   --label p100-strict` and `--spoiler-tier default --label p100-default`: covers drawn per 100 answers, the two Hades
   story rows named in the roadmap entry read by hand (23 against 29 on 2026-10-24; Hide more missed a Hades story cover
   Default kept, twice).
4. **Hide less, second run:** `--spoiler-tier open --label p100-open`: the no-contradiction rate (90.7 percent against
   100 on 2026-10-24).
5. **The zero-score made-up question:** `python scripts/measure_kb_thin_match.py --json .scratch/thin-before.json`; then
   the same with the keyword floor raised so a question with no keyword support attaches nothing (read the script's
   `--help` and the service's floor comments; change nothing committed, a working-tree edit reversed afterwards): how
   many right-note questions lose a note, and whether the four made-up questions (Zorblax, Grimthak, the house, the
   Bone Hydra) attach nothing. Numbers only; the roadmap entry decides.

**After the landings of T, P and the note lanes (the second half; the session says when):**
6. Items 1 and 2 again on the landed tip with the new library (`--label after`): no right-note question lost; the new
   notes' blind questions (lane Q) found in the first three, how many of how many; the 24 sentences' reach and right
   counts after.
7. **The two prompt lines:** `eval_kb_answers.py --samples 3 --label p100-needs` against the 2026-10-24 Default run
   (facts kept, contradictions, menu rate, and how many strategy answers' checklists carry a "Needs:" step); and
   `python scripts/kb/eval_screenshot_reading.py --samples 3` on the 8 labelled pictures: named the game and the place,
   with the game handed over and not (75 and 42, 17 and 29 in 100 on 2026-10-24), and the God of War asks that named
   another game (4 of 9 before).

Table per item: before, after, the report file's name. Nothing is committed by this lane.

---

## U — Thumbs-down follow-ups: the tag clears on Undo, and a "Lowered notes" row (★★ `[KB]` ui, Opus medium; the advisor reads the diff before landing)

**What a player sees today.** Show details keeps saying "ranked lower by you" on an answer after Undo. Undo appears only
under the newest answer, so once another question is asked an earlier mark cannot be taken back; three marks leave a
note out for good with nothing on screen to see or clear it.

**Where it comes from.** The store `py_modules/backend/knowledge/kb_demote_store.py`: `downs_for` 147, `card_key` 156,
`apply_demotes` 162, `record_demote` 202 to 247 (undo takes one mark back, 226 to 229; the only write is
`_write_document` 193 to 199); the private `_downs_map` at 120 is the only full read; nothing lists or clears all. The
plugin method `demote_rag_corpus_note` is at `rag_corpus_rpc.py` 61 to 70 and `main.py` 1202 to 1206; no list or clear
method exists. The `demoted` flag is set when the answer's sources are built (`knowledge_base_service.py` 485 to 491),
copied into each attached note (`kb_attached_notes.py` 94, 175, 187) and kept in the saved chat
(`chats/chat_slot_service.py` 180); Undo never rewrites that copy. The tag is drawn by `kbNoteDemotedTag` in
`src/features/knowledge-library/buildKbNotesBlockElement.tsx` 146 to 169, reading `note.demoted` (147), at 425 and 459.
The rating row and Undo are gated in `src/features/answer/transcript/MainTabChatTranscript.tsx`: 1138
(`isNewestArchivedTurn`), 1282 to 1285, 1301, 1318 to 1320; one demote hook feeds the transcript (418), with per-answer
state in `useReplyDemote.ts` 84 to 96 and undo at 144 to 153. The Knowledge base section is in the Ollama tab
(`OllamaTab.tsx` 261 to 278, fold "kb"; `ollamaTabFolds.ts` 27 to 33), its rows in
`src/features/knowledge-library/KnowledgeBaseSection.tsx`: the switch 823, Update 965, Remove 1041 to 1042 with its
confirm box (title 748, action 761, the call 767).

**Build, four commits.**
1. The store: `list_demotes()` (every key with its downs, reasons and date) and `clear_demotes()` (an empty document
   written, the cache forgotten). Tests in `tests/test_kb_demote_store.py`.
2. Two plugin methods, `list_rag_corpus_demotes` and `clear_rag_corpus_demotes`, in `rag_corpus_rpc.py` and `main.py`,
   beside `demote_rag_corpus_note`; `clear` returns the count cleared. The method map regenerates on commit.
3. The tag reads the live state: the demote hook keeps, per answer, the note keys undone this session (and marked this
   session); the notes block draws "ranked lower by you" when the saved flag is true and the key is not undone, or the
   key was marked this session. Undo on the same answer clears the tag at once. Tests:
   `buildKbNotesBlockElement.demoted.test.tsx` (flag true, undone: no tag) and `MainTabChatTranscript.demote.test.tsx`
   (mark, Undo, the block redrawn without the tag).
4. The row: in `KnowledgeBaseSection.tsx` beside Remove, "Lowered notes: N" with a Clear button, drawn only when N is
   above 0; N read from the list method when the section opens and after Clear; Clear opens a confirm box built like
   Remove's (title "Clear lowered notes?", one line saying the N notes come back on later questions) and calls the
   clear method; the row is one more stop in the section's existing chain, built the way Remove is (a Focusable with all
   four moves, hearing A and B). Tests: a walk test with Steam's scroll modelled, Update → Remove → Lowered notes → out,
   no stop twice; the row absent at 0; Clear calls the method and hides the row.

**Files owned:** the files above and their tests; `src/features/knowledge-library/demoteNoteApi.ts` for the two new
screen-side calls. `MainTabChatTranscript.tsx` only in commit 3, and only after lane V has landed (your copy is cut
from that tip).

**The test at the Deck's level:** the walk test and the "mark, Undo, no tag" transcript test above.

**The Deck check (P100-LOWERED-01, block L2):** nothing running; a boss question; Not really → Wrong tip → the first note;
Show details: the tag shown; Undo: the tag gone (a screenshot each); two more marks on two notes from two questions;
Ollama tab → Knowledge base → the row reads "Lowered notes: 2", a screenshot; Clear → the confirm box → Yes: the row
gone, `rag_demote.json` empty over SSH; a reworded boss question lists the notes in the old order.

---

## J — "Suggest as a tip" (★★★★★ `[KB]`, Sonnet high; the security reviewer reads the diff; the advisor before landing; call 6)

**What a player sees today.** A good answer cannot be turned into a proposed note; the roadmap has carried this
five-star entry since August, unblocked since the public library publish. The Desktop note save exists only in the
chat's menu (`src/features/chats/title/chatsMenuModel.ts` 34) and the save window (`DesktopNoteSaveModal.tsx` 43).

**Where it comes from.** The reply row is built by `src/features/answer/reply-actions/buildReplyActionsElement.tsx`
(main builder 329; the chip rows 124 to 125 are the feedback reasons; the Copy button is `ReplyCopyButton.tsx`, a
`BonsaiChatSecondaryButton.tsx`). The Desktop writer is `py_modules/backend/notes/desktop_note_service.py`
(`append_markdown_note` 274; the folder `Desktop/bonsAI_logs` 126 to 131); the permission is `filesystem_write`
(`py_modules/backend/core/capabilities.py` 70 to 71; shown as "Save files to Desktop" in `PermissionsTab.tsx` 65 to
69); the refusal pattern is in `media/media_desktop_rpc.py` 86 to 95 ("Filesystem writes are disabled. Enable them in
the Permissions tab."). A valid section needs `section_id`, `game_id`, `section_type`, `name`, `card`
(`scripts/kb/build_rag_db.py` 685 to 689); a `source_url` needs `crawled_at` (663 to 672). The issues list link is
`GITHUB_ISSUES_URL` in `src/shared/storageKeys.ts` 67; the new-issue form is `https://github.com/qd313/bonsAI/issues/new`
(docs/how-to-help.md line 26).

**Build, four commits.**
1. A new `py_modules/backend/notes/kb_tip_suggestion_service.py`: from the question, the answer's text, the game (id and
   name when known) and a kind (default `mechanic`), build a section record with `section_id` 0 (the maintainer assigns
   one), the game id (or 0 with the game's name in the card's first line when unknown), a name taken from the question
   (under 60 characters), a card of at most 700 characters whose first line is "Suggested by a player on <date>:", no
   source fields; refuse an empty answer. Write it as JSON into `Desktop/bonsAI_logs/suggested-tips/<game>-<date>-<time>.json`
   through the same folder rule the Desktop writer uses, only when `filesystem_write` is on (the same refusal text
   otherwise). Return the file's name and a new-issue link: the form address with the title "Suggested tip: <name>"
   filled in (URL-encoded; the body is not sent, the person attaches the file). Tests: a valid record from a real saved
   answer; the refusal; the link's shape; no path outside the folder.
2. The plugin method `suggest_rag_corpus_tip(question, answer, app_id, app_name, kind)` in `rag_corpus_rpc.py` and
   `main.py`, returning `{ok, file, issue_url, error}`. **Its `main.py` commit is your last and is made only after lane U
   has landed** (the session says when); until then the screen side calls an injected function, as plan 98's lane D did.
3. The screen: a "Suggest as a tip" secondary button beside Copy, shown only under a finished answer that has text; A
   calls the method and shows one line under the row: "Saved <file>. To send it in: <link>" (the link as text; the Deck
   has no browser in the panel), or the permission refusal with "Permissions tab" named. A new hook
   `useReplySuggestTip.ts`; the screen-side call in `demoteNoteApi.ts`'s neighbour, a new `suggestTipApi.ts`. The
   button is a sibling of Copy in the same container, so a plain move is Steam's own; it hears A and B.
4. Tests: `buildReplyActionsElement.suggestTip.test.tsx` (the button present only when finished; A calls; the line
   drawn; the refusal drawn), the hook test, the api test. The security reviewer's read is recorded by the session.

**Files owned:** the new back-end file and its test, `rag_corpus_rpc.py`, `main.py` (last commit), the reply-actions
files above, `suggestTipApi.ts`, their tests. Not the transcript file unless a handler must be passed through it; if
so, say so and wait for the session (lane V and U share it).

**The test at the Deck's level:** the reply-row test: a finished answer draws the button; A writes the record (a fake
writer) and draws the saved line.

**The Deck check (P100-SUGGEST-01, block L2):** nothing running; a Hollow Knight question; walk to "Suggest as a tip"
(read focus) → A: the line shows the file name and the link; over SSH the file exists under
`~/Desktop/bonsAI_logs/suggested-tips/` and holds the five fields; Permissions tab → "Save files to Desktop" off → the
button again: the refusal line names the Permissions tab; switch it back on.

---

## Q — Blind search questions for the new notes (★★ `[KB]`, Sonnet medium; after T lands; from names only)

**What this is.** Whoever writes a note never writes its test question. You get, from lanes N1 to N4, the list of new
notes as names, kinds and section ids only, never their text. Write two questions per note the way a player types them
(one plain, one terse or misspelled), as rows in `tests/fixtures/kb_eval_v2.json` after the last row: id
`V2-P100-<GAME>-<NN>`, split `holdout`, domain `strategy`, the game's `app_id`, `query`, `intent`, `topic_hint` empty,
`withheld_card_terms` empty, `skill_level`, `input_style`, `note` "Written blind 2026-10-25 from the note's name only",
`expect_section` the note's id. Do not read the notes files or the sources sidecars.

**Files owned:** the new rows of `tests/fixtures/kb_eval_v2.json` only (lane T's 24 rows are not yours).

**The test at the Deck's level:** none; lane X runs the search test on your rows (item 6).

---

## M — A bug found tonight (template)

One section per bug, written by the session: what a player sees (from the evidence file), where it comes from (the
file and line the session read), the one change to build, the files owned, the test at the Deck's level, and the row
(`P100-M<n>-<NAME>`). Sonnet high when the fix needs a judgment, Sonnet medium when the cause is known and there is one
obvious way; about an hour each; a bug that resists is written up and left open.
