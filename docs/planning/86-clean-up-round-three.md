# 86 — Clean-up round three: a smaller repo, simpler wiring, a folder per feature

Written 2026-10-10 by the planning session, after a survey of the whole repo and four rounds of questions with the
maintainer. **Nothing here is built yet.** The plan is written so it can wait: on the day it starts, step 0 checks it
against the code as it is then (§ 5).

**Written against:** `experimental` at `efecab1` (2026-10-10). Every number below was measured on that commit.

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md), the focus-graph section and "Which model does
which work"; [docs/lessons-learned.md](../lessons-learned.md); the last clean-up's
[postmortem](../audit/refactor-round-two/postmortem.md) and [ledger](../audit/refactor-round-two/ledger.md); and the
Haiku trial's results, [plan 83](83-haiku-5-5-trial.md) § 8 and § 10.

**One sentence:** cut the repo from 3,638 files and 289 MB to about 1,200 files and 25 MB, remove five features the
maintainer chose, move the glossary words into the knowledge library, give every feature its own folder, merge the
test files, and untangle the three knots that make the plugin hard to change, while every other part of the plugin
stays exactly as a player knows it.

---

## 1. Why (plain language)

The plugin works well. Working **on** it has become the problem:

- **The repo is mostly not the plugin.** Of 3,638 files, about 1,900 are test screenshots, logs and recordings. They
  grow every session: from about 220 MB to about 250 MB in the three days of plans 83 to 85.
- **Finding things is slow.** The screen code is sorted by kind, not by feature: one folder holds 217 files (helpers
  and their tests), another 205 (screen parts and their tests). Everything about one feature is spread across them.
- **Three knots make every change cost more than it should.** A new setting is still written out by hand in about eight
  places across two languages. Eight separate helpers each keep their own list of places the D-pad can stop. The main
  screen hands 214 separate things down to its tabs.
- **Some features cost upkeep and give little back** (§ 2).
- **The paperwork grows back.** The testing document was cut to 114 KB in the last clean-up; it is 163 KB now.

## 2. What a player notices

Only the removed features, and one change to the glossary:

- **Gone: the Steam ban lookup**, its Ask-box command and the Steam key field. It needed another player's 17-digit
  Steam number, which is hard to get in a game; Steam's own profile page already shows any ban; it needed a developer
  key, which the Developer tab showed in plain text.
- **Gone: read aloud**, the speaker under answers. It used the Deck's basic built-in voice. If the Steam Frame work
  needs a voice, it starts fresh with a better one.
- **Gone: UI scale**, the section on the Settings tab. Everyone gets the normal handheld size, which is what "Auto"
  already picked for everyone. This also closes the roadmap bug "the UI scale section says UI scale twice".
- **Gone, and nobody will see it: the weekly model-list refresh.** The online file it downloaded has been empty since
  2026-06-15. Model descriptions now change only with a plugin update.
- **Changed: the glossary chips come from the knowledge library** instead of being built in, so they show only for
  people who downloaded the library. The words stay the same two ("kiting" and "overclock", for Deep Rock Galactic:
  Survivor). More words and more games can come later as library work, with no plugin update.
- **Gone, for developers only: the in-panel preview test tool**, shelved because it never got past its loading
  screen. A copy goes to the workshop repo, and an issue in the Deck tool's repo describes it.

Every other screen, setting and D-pad route stays as it is.

## 3. What the maintainer and future sessions notice

| | Today | Expected after | Mainly by |
|---|---|---|---|
| Files in the repo | 3,638 | about 1,100 to 1,300 | the workshop repo |
| Size of the files | 289 MB | about 20 to 25 MB | screenshots and recordings to the workshop |
| Download size of the repo | 250 MB and more | about 15 to 25 MB | the fresh history, the last step |
| Plugin code | about 110,000 lines | about 101,000 to 104,000 | the removals and the untangling |
| Tests | about 107,000 lines | about 87,000 to 93,000 | one shared test setup, merged files, removed features' tests |
| Tools in this repo | about 29,000 lines | about 18,000 to 22,000 | old one-offs to the workshop, clean-up-only checkers retired |
| Documents in this repo | about 107,000 lines | about 15,000 to 20,000 | finished plans, audits and the archive to the workshop |
| Places a new setting is written | about 8, by hand | 2 or 3 | one list of settings |
| Helpers tracking D-pad stops | 8 | 1 | one shared helper |
| Things the main screen hands to its tabs | 214 | a small fraction (goal set in step 2) | shared state the tabs read directly |
| Screen folders | by kind, up to 217 files each | one per feature | scripted moves |

**Said plainly: the plugin's own code shrinks only about 5 to 10%.** The explanations in the code stay (about 3 in
10 lines, the maintainer's call) and most features stay. The gain is everything around the code, and how much easier
the code is to change.

## 4. The maintainer's calls (2026-10-10)

1. The explanations in the code stay as they are.
2. Remove the Steam ban lookup, the weekly model-list refresh, read aloud, UI scale and the in-panel preview tool.
3. Move the glossary words into the knowledge library. It saves little code, but that is where they belong.
4. Keep AI characters.
5. A private workshop repo for everything that is history rather than the plugin (step 1). The roadmap and the
   testing documents stay with the plugin.
6. A fresh start for the repo's saved history at the very end, in this same repo, so its address, stars, issues
   and releases stay; the old history goes to a private archive repo first.
7. From the "outside the box" list: the workshop repo, the fresh history, no more tool-made maps saved in the repo,
   each setting written once, fewer rule-checking scripts. Not chosen: moving the roadmap to GitHub Issues; hiding a
   feature for one release before deleting it.
8. A folder per feature; merge the test files; untangle the middle.
9. While this plan runs: no new features and no other sessions on the branch.
10. Many more helpers at once than today's caps allow (§ 7).
11. The next release happens in its own session. The README's broken install link is on the roadmap for later.
12. Accepted defaults: the five-star "show who you're playing against" idea moves to the shelved list; the glossary
    move carries today's two words only.

**One change the planning session made after call 5:** the knowledge-library build tools stay in this repo, in their
own folder, instead of moving to the workshop. They share code with the plugin's back end (the library's layout, and
how text is prepared for search), so splitting them across two repos would make every library change a two-repo
change. Their research results and big output files still move.

## 5. Keeping the plan fresh while it waits

- **The plan holds decisions and rules, not file lists.** The exact lists are made in step 2, on the day, so they
  always match the code.
- **It records the commit it was written against:** `efecab1`.
- **Step 0 starts with a freshness check.** A short script lists the commits since `efecab1` and what each one touched
  in the areas this plan changes: the five removals, the glossary, the eight D-pad helpers, the settings plumbing, the
  main screen, and any new code that uses something being removed. It re-measures the numbers in § 3.
  - **Nothing important changed:** carry on.
  - **Small changes:** update this plan in the same commit, then carry on.
  - **A big change**, such as a new feature built on UI scale or read aloud, or a ninth D-pad helper: stop and ask
    the maintainer.
- **A rough guide:** after two weeks of normal work, expect the check to need about an hour of updating. After a
  month, expect to redo part of step 2.

## 6. The steps

Every step ends with all checks green, its commits, and the technical summary the maintainer asked for in AGENTS.md:
the changed files, how it works, what came up, and what the maintainer could have done differently. Every step that
changes what a player sees ends with a Deck block. Moving code and changing code never share a commit.

### Step 0 — Get ready (one session, together with step 1)

1. The freshness check (§ 5).
2. The freeze starts: no other sessions, no new features.
3. Save the starting point, to compare against later: every test's name and the count, coverage on both sides, the
   size of the built plugin, the list of back-end methods the screen can call, and the § 3 numbers.
4. **Stop saving tool-made maps in the repo.** The architecture maps and the code map are rewritten on every commit
   today, so helpers working side by side clash over them. Build them when needed instead: the tool server builds its
   maps when it starts, and a script makes the code map on request. The commit hook drops those steps. While here: the
   hook files are stored without the "runnable" mark, so on Linux and Mac they never run at all.
5. **Tools for moving files:** one command that moves a screen file and fixes every import and every explanation that
   names it, and the same for back-end files; plus a "nothing changed by accident" check for every move commit.
6. **Helper files for this plan** (§ 7), and this plan's helper caps written into AGENTS.md for its duration.
7. **Fix the usage guard first.** It counts every token the same, whatever the model, so a big Haiku read-through
   would stop new helpers early. Weigh tokens by model.

### Step 1 — The workshop repo (same session as step 0)

1. The maintainer creates a private workshop repo, or tells the session to create it.
2. **Moves there:** the test screenshots, logs and recordings; the saved Deck walks; the archive of finished
   documents; finished plans and their pictures; finished audits; finished design hand-offs; research results; old
   one-off scripts and Deck probes; the SteamVR bench scripts; the model bake-off data.
3. **Stays:** the plugin and its tests; the build, release and Deck tools; the knowledge-library tools in their own
   folder; the README's pictures; and the living documents. Those are the user guide, troubleshooting, the development
   guide, the design rules, the focus graph, lessons learned, the roadmap and testing documents, AGENTS.md, CLAUDE.md,
   the changelog and any open plan.
4. A script rewrites every reference to a moved file so it points into the workshop. The roadmap and testing documents
   cite evidence by name with a "workshop:" label.
5. Everything that writes evidence (the Deck helper's runbook, the capture and recording scripts, the bookkeeper's
   rules) writes into the workshop from now on. One setting says where the workshop sits on disk.
6. Check: every link in the remaining documents resolves, and every check is green.

### Step 2 — Read every file (one session; reading only, nothing changes)

1. **A script goes first, with no AI:** for every code file, its size, how much of it is explanation, who imports it,
   what it imports, its tests, which features it mentions, and when it last changed.
2. **About 75 Haiku readers, 20 to 30 at a time,** each given 10 to 20 named files. For each file: what it is for,
   which feature it belongs to, who uses it (checked against the script's list), anything unused or written twice, and
   which new folder it belongs in.
3. **Spot checks:** the one running the session checks about one answer in ten against the code, and logs every miss.
4. **Five to eight Sonnet reviewers, one per area,** turn the answers into:
   - the exact list of what each removal deletes, in every file it touches;
   - the glossary move: what goes into the library and what changes in the plugin;
   - the new folder map, file by file;
   - the groups of test files to merge, and the tests that check the code's text instead of what it does;
   - the untangling targets: every place a setting is written, every D-pad helper and who uses it, every hand-down
     from the main screen;
   - which scripts stay, move or retire.
5. **Stop and ask the maintainer:** approve the cut list and the folder map before anything is deleted or moved.

### Step 3 — Remove five features, move the glossary words (one session and a Deck block)

1. **One Sonnet helper per removal,** each with its exact list from step 2:
   - the ban lookup and its Steam key setting;
   - the weekly refresh, keeping the part that learns which models are installed and how big they are;
   - read aloud, with voice input still working (they share code, which is split with care);
   - UI scale, where every scaled size becomes a plain number;
   - the preview tool.
2. **The glossary:** the library learns a "glossary" kind of entry; the two words move into the library's source data;
   the plugin reads the running game's words from the library; the code loses its one-game names. The library is
   rebuilt, and the maintainer publishes it as a point release.
3. **Shared files** (the settings lists, the main screen, the back end's front door, the Developer and Permissions
   tabs, the AI's instructions) are touched by several helpers. Their work lands one at a time, and each later helper
   puts its change on top of what already landed.
4. The preview tool's copy goes to the workshop. An issue in the Deck tool's repo describes it, opened with the
   maintainer's OK at the time.
5. **Paperwork, by the bookkeeper:** the roadmap, including the five-star idea moving to the shelved list and a new
   library entry for glossary words for every game; the changelog; the testing rows; the README's feature list.
6. **Deck block:**
   - the Settings, Permissions and Developer tabs;
   - voice input from start to finish;
   - the models box;
   - a Deep Rock Galactic: Survivor answer with a glossary word, with and without the library downloaded;
   - the answer's D-pad walk;
   - the free-play sweep.

### Step 4 — A folder per feature (one session and a short Deck check)

- The folder map from step 2, applied one area per commit with the move tool. Tests move with their code. The back
  end's services folder, 108 files in one place today, splits into a few packages. The entry files Decky needs stay
  where they are.
- After each commit: types, every test, the built plugin, the list of back-end methods, and no explanation naming a
  file that has moved.
- **Short Deck check:** every tab opens, one question is answered, the free-play sweep.

### Step 5 — Merge the tests (one session; no Deck block)

- **One shared test setup for the screen side.** The same stand-ins for Decky's screen parts are written out in 124
  test files today.
- **Merge the many small test files** for each screen part into a few, by topic. The chat transcript alone has 34, and
  the answer's D-pad helper 24.
- **Shared stand-ins for the back-end tests,** where the same setup is written out again and again.
- **Tests that check the code's text instead of what it does** become behaviour tests where they can.
- **Proof:** the list of test names before and after matches, except removals listed by name; coverage does not drop.

### Step 6 — Untangle the middle (three sessions, each with a Deck block)

The riskiest step, so it comes last. The safe wins land first.

- **6a — each setting written once.** One list describes every setting: its name, kind, default, rule and tab. A
  script makes the Python table, the screen table, the two shared check files and the plumbing from it. A new setting
  then means one line in the list plus its control on screen. The test that saves every setting and loads it again
  guards it. Deck block: every setting on every tab survives a close and reopen, and a fresh install shows the defaults.
- **6b — one D-pad helper instead of eight.** One shared helper knows every kind of stop; each of the eight becomes a
  thin use of it, then disappears. Opus does this itself, with Deck measurements in hand, as AGENTS.md requires for
  focus work. Deck block: every documented D-pad walk, and the free-play sweep.
- **6c — the main screen hands down less.** The tabs read shared state directly instead of receiving 214 separate
  things. Deck block: every tab, and the free-play sweep.
- **Stop and ask the maintainer before 6b:** stopping after 6a is a fair choice if the earlier Deck blocks say so.

### Step 7 — Documents and handover (one session)

- AGENTS.md, CLAUDE.md, the development guide and the documents index updated for the new folders and rules. The
  helper caps go back to normal or stay; the maintainer's call.
- **Rule-checking scripts.** Keep the ones that catch real mistakes: the D-pad pattern check, the header check, the
  closed-rows check, the contents-list check, and the gate itself. Retire the ones that only served clean-ups: the
  size ratchet and growth limit, the old map and seam counters, the comment strippers. **Stop and ask the maintainer**
  before retiring any.
- The plain-words guide to how the plan went into the code, which the maintainer asked for in AGENTS.md.

### Step 8 — The fresh history (after the next release; stop and ask the maintainer first)

1. Scan the whole old history for secrets. Anything real gets changed at its source first.
2. Copy the whole old history, every branch and tag, to a private archive repo.
3. Restart this repo from one commit holding the current files, on both main and experimental.
4. **Releases.** The old release tags point at the old history, and their source downloads still contain the file
   removed on 2026-10-10. Remove the old plugin releases, keeping their zips and notes in the archive. Re-make the
   knowledge library's release under the same name, so the plugin's download addresses keep working. Check the README's
   install link.
5. **Honest limits:** GitHub can keep old commits reachable for a while (its support can purge them), and anyone who
   copied the repo before keeps the old history. Every copy on the maintainer's PC, old helper copies included, has to
   be cloned fresh.

## 7. Who does what: models, effort, and how many at once

Based on the maintainer's own trials: Sonnet 5.5 in [plan 75](75-sonnet-5-5-trial.md), and Haiku 5.5 in
[plan 83](83-haiku-5-5-trial.md), which ran 20 helpers at once.

| Work | Model and effort | At once | Why |
|---|---|---|---|
| Running the session: briefs, reviews, landing, the D-pad merge, the settings design | Opus 5.5, extra-high | 1 | Plans and lands. Max effort bought nothing measurable over extra-high |
| Reports to the maintainer | Opus 5.5, medium | — | Explanations |
| Reading files and reporting facts (step 2) | Haiku 5.5, high | 20 to 30, about 75 in all | Cheap, and the answers can be checked. Plan 83 named this as Haiku's next job |
| First look at a helper's finished work: what changed, did the checks pass | Haiku 5.5, high, on trial | 1 per landing | Plan 83 § 10. Opus still decides |
| Mechanical moves and deletions that a script checks afterwards | Haiku 5.5 high on trial, or Sonnet 5.5 medium | up to 15 | Haiku high won the mechanical job in plan 83 |
| Removing a feature, merging tests, anything with a choice in it | Sonnet 5.5, high | up to 10 | Best all-round in both trials |
| Area reviewers in step 2 | Sonnet 5.5, high | 5 to 8 | Judgment |
| Bookkeeping: roadmap, testing documents, changelog | the bookkeeper, Sonnet 5.5 medium | 1 | Won the paperwork job; Haiku lost sentences there |
| Deck checks | the Deck helper, Sonnet 5.5 medium | 1 | Never Haiku |

Rules that go with it:

- **For this plan only, the helper caps rise** (the maintainer's call): up to 30 at once when they only read, up to 15
  when they edit, as long as every editing helper owns its own files.
- **Haiku jobs stay small:** under about 100,000 tokens each. Past that its price goes up five times, and in plan 83
  it took about twice as many steps as Sonnet.
- **Haiku never edits documents or bookkeeping.** Every Haiku use is logged in the routing evidence, misses included.
- **Helpers run only the tests for what they touched.** The full suites run when the one running the session lands
  work. With 15 to 20 helpers running full suites, the PC slowed until tests timed out (plans 79 and 83).
- **Steps that don't need the Deck** (0, 1, 2, 4 and 5) can run in cloud sessions, each on its own machine, so the PC
  is not the limit.
- **Workflows:** Claude Code's multi-helper runs aim for fewer than 10 helpers unless "Dynamic workflow size" is
  raised in its settings. Raise it for step 2.
- **No max effort anywhere.**

## 8. Cost and time

Estimates at list prices, built from the measured costs in plans 80 and 83 (the Haiku trial cost about $88 with 24
helper runs). The account is on a subscription, so these show how fast the usage window fills, not a bill.

| Step | Sessions | Rough cost | Deck time |
|---|---|---|---|
| 0 and 1 | 1 | $70 to $120 | none |
| 2 | 1 | $50 to $90 | none |
| 3 | 1 | $70 to $120 | one block, 1 to 2 hours |
| 4 | 1 | $50 to $90 | a short check |
| 5 | 1 | $60 to $110 | none |
| 6 | 3 | $150 to $260 | three blocks |
| 7 | 1 | $30 to $50 | none |
| 8 | part of one | $10 to $20 | none |
| **All** | **about 9** | **about $500 to $850** | **about five blocks** |

The least predictable part is 6b: D-pad work often needs a second round after a Deck check. The cheapest part for its
size is step 2: reading every file on Haiku costs less than one Sonnet helper on a large feature.

## 9. Risks, and what guards against each

| Risk | Guard |
|---|---|
| The plan goes stale while it waits | The freshness check in step 0; file lists made on the day |
| A removed feature turns out to be used somewhere | Step 2 lists every use; the type check and tests catch the rest; the Deck block after step 3 |
| A move quietly changes something | Moves and changes never share a commit; the "nothing changed" check; test names and coverage compared |
| Merged tests lose a case | The test-name lists before and after must match |
| D-pad behaviour breaks in 6b | Opus does it with Deck measurements; every documented walk; the pattern check |
| Settings stop saving in 6a | The read-back test; a Deck check of every setting |
| Haiku gets a fact wrong | One answer in ten spot-checked; no document edits; Sonnet steps in |
| Helpers clash over shared files | No more saved tool-made maps; one owner per shared file per round; landing one at a time |
| The PC slows to a crawl | Helpers run only their own tests; steps without the Deck run in the cloud |
| The usage limit stops a step midway | Every step ends in commits; helpers resume by message |
| The fresh history breaks downloads or links | Done last, after a release, with the archive made first and a checklist |
| Two repos make Deck sessions clumsier | One setting for where the workshop sits; the Deck helper and the bookkeeper updated in step 1 |
| The library's glossary release is late | Without it the chips simply don't show; nothing breaks |

## 10. Lessons from the last clean-up, applied

From its [postmortem](../audit/refactor-round-two/postmortem.md):

- **Scripts do the mechanical work; models only judge.** Its two cheapest phases did the most deleting.
- **Every helper gets exact files, never categories.**
- **Every helper is told what is allowed to stay.** A tool's list of findings is not a target to drive to zero.
- **When a measure fights the work, check the measure first.**
- **Write down the shape of every seam before moving anything.**
- **Check every claim against the code before writing it down.**

## 11. For the builders: where things are on `efecab1`

- **The removals' own files** (step 2 makes the full lists):
  - Steam ban lookup: `py_modules/backend/services/steam_vac_service.py`, `vac_check_commands.py`,
    `tests/test_steam_vac_service.py`, the transcript's vac-row test. The Steam key setting appears in about 16 files.
  - Weekly refresh: `py_modules/backend/services/pull_model_catalog_service.py`, `src/utils/pullModelCatalogRefresh.ts`,
    `data/pull-model-catalog-overlay.json`, `tests/test_pull_model_catalog_*.py`. Careful:
    `src/hooks/usePullModelCatalogRefresh.ts` also learns which models are installed and their sizes; that part stays.
  - Read aloud: `voice_read_aloud_service.py`, `useReadAloud.ts`, `useReadAloudAutoStop.ts`,
    `useVoiceAskWithReadAloud.ts` (shared with voice input), the speaker button, `scripts/probe_deck_read_aloud.py`.
    About 13 own files and 3,000 lines with tests; mentioned in about 23 more.
  - UI scale: `src/context/UiScaleContext.tsx`, `src/data/uiScaleProfile.ts`, `useUiScaleProfile.ts`, `uiScalePx.ts`,
    `uiScaleScopeBridge.ts`, the two Settings sections. About 209 call sites in 31 files.
  - Preview tool: `src/preview/`, `tests/preview-suite/`, `scripts/run-preview-suite.mjs`, `scripts/build-preview.mjs`,
    `.decky/preview.json`, the `test:preview` scripts in `package.json`, the preview-tiers map, the tool server's
    preview workflow.
  - Glossary: `src/data/drgGlossaryTerms.ts` (the two words), `drgGlossaryTermMatch.ts`, `DrgGlossaryTermChip.tsx`,
    `drgGlossaryTermRegistry.ts`, `drgGlossaryTooltipPlacement.ts`, `drgGlossaryAsk.ts`, and the glossary clause in
    `ollama_prompts.py`. The library's layout is in `knowledge_base_schema.py`; its builder is `scripts/build_rag_db.py`.
- **The eight D-pad helpers** (1,424 lines together): `navFocusRegistry.ts`, `answerBubbleElRegistry.ts`,
  `answerStopRegistry.ts`, `replyStopRegistry.ts`, `spoilerFenceRegistry.ts`, `permissionJumpRegistry.ts`,
  `drgGlossaryTermRegistry.ts`, `src/features/plugin-shell/modalReturnFocusRegistry.ts`.
- **Tool-made maps saved today:** `packages/bonsai-mcp/knowledge/architecture/*.json` and `docs/code-map.md`. Written by
  `.githooks/pre-commit`; checked by `npm run mcp:validate` and the `validate-mcp` workflow; read by the tool server and
  `scripts/ratchet.py`.
- **The knowledge-library tools import the back end:** `knowledge_base_schema`, `ollama_embed_service`,
  `ollama_prompts`, `ollama_service`, `transparency_service`, `ai_character_service`.
- **Shared test stand-ins today:** `src/test-harness/`. `vi.mock("@decky/ui")` is written out in 124 test files.
- **Checks and timings:** `python scripts/verify.py --quick` takes about 40 to 60 seconds; `npm test` about 155
  seconds; `npm run test:py` about 21 seconds. All green on `efecab1`.
- **The size snapshot** behind § 3 came from `git ls-files` on `efecab1`: plugin 519 files (screen side 71,673 lines,
  back end 38,334); tests 568 files (63,744 and 43,593 lines); scripts 100 files (27,172 lines); 380 pictures and
  recordings (252.5 MB); 1,890 files under `docs/test-evidence/` (248 MB).

## 12. Progress log

Empty until step 0 runs.
