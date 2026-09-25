# 47 — Knowledge base, wave two: fill the thin games, make troubleshooting reachable, three bugs, one release

Written 2026-09-07, before any code, and approved the same day. **Nothing here runs until you say "go".**
The four calls in § 3 were answered before this was written and are recorded as **D85**. The one stop that
stays after "go" is the public push of the release (§ 5, wave 4).

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md) § 3; the roadmap's
[Knowledge base and RAG](../roadmap.md#knowledge-base-and-rag); the status report
[37](../planning/37-rag-status-report.md); wave one [46](46-kb-wave-one-session.md), whose § 11 is the record this
wave starts from.

---

## Context — why this wave, and why these five things

Wave one nearly doubled the library and shipped it. The most useful thing it produced was not a fix: it was
a list. Seventy-two questions a player might plainly ask about the twelve new games were written by someone
who had read no notes, then matched against the notes that exist. **Twenty-nine came back with nothing
behind them.** That is not a guess about coverage. It is a written specification for what to write next,
question by question, and it is the first time this project has had one.

Two other things came out of that evening. A troubleshooting search built on meaning was measured and held
back, because matching by meaning could not connect the words a person uses for a crash to the way the crash
tips are written. And leaning the whole search toward meaning won on the numbers and was reverted, because it
would bury a brand-new note whose meaning index had not been built yet.

This wave takes the gap list at face value, fixes the troubleshooting path properly rather than by adding
more search, removes one of the three blockers on the search change and measures the route around the other
two, clears three bugs found on the device, and adds the one line agreed on 1 September that nobody has
built. Then one release, then an evening on the Deck.

**Two things I checked before writing this, and both changed the plan.**

1. **Guaranteeing the meaning index does not on its own unlock the search gain.** The decision that holds it
   names three objections; the trigger you set covers one. The route that gets the points without breaking
   the other two is the follow-up that same decision recommends — leave the balance alone, change only the
   tie-break. So this wave ships the guarantee and *measures* the tie-break, and changes nothing about the
   live search without a further call.
2. **The troubleshooting problem is bigger and cheaper than "the tips are worded wrong".** I ran ten
   ordinary problem sentences through the part of the plugin that decides whether a question is about
   troubleshooting at all. **Nine of ten reach nothing** — including *"my game keeps crashing"*, *"my game
   won't launch"* and *"black screen when I start the game"*. The word "crash" is deliberately classed as
   too weak to send a question to the tip sheet on its own, in every circumstance
   ([compat_topic_router.py:241](../../py_modules/backend/services/compat_topic_router.py)). On top of that
   the whole sheet holds **two** crash tips, and they read *"Crash to desktop: check ~/.steam/steam/logs and
   compatdata"* and *"Kernel panic rare on Deck: note SteamOS version and last game"*. So the tips are not
   badly worded so much as barely there, and even a perfect rewrite would not be reached.

---

## 1. What is true right now (checked 2026-09-07)

- **Tip `92718d1` on `experimental`.** Tree clean apart from untracked `runs/` evidence and one research
  report. That hash goes in every lane brief; the orchestrator re-reads it at wave 0.
- **The library:** 266 notes over 25 games, 124 shared Deck tips. Corpus `2026.09.06` is live on both
  channels and installed on the Deck. Manifest records an index for all 266 notes and all 124 tips.
- **The gap list:** 43 of 72 blind questions have a note; **29 are blank**, and **eight of those are marked
  in the file as written on purpose to have no answer** (secret endings, post-game bosses). So the real
  content gap is **21 questions**. Wave one's log rounded this to "about twenty".
- **Thin games:** Mario Kart 64 has 4 notes, Doom 64 5, Super Mario 64 6, Paper Mario 6. The established
  thirteen sit between 8 and 20, mostly around 12. Those four games hold eight of the blanks.
- **The tip sheet:** 124 tips, every one maintainer-written with no source, median 70 characters. By
  subject: proton 12, deck 10, Steam Input 10, SteamVR 8, gamescope 8, anti-cheat 8, streaming 8, storage 8
  … and **crash 2, performance 2, audio 1, display 1**. The rules that route a question are written in
  enthusiast words — *deadzone*, *haptic*, *TDP*, *frame limit*, *vsync*, *translation layer*.
- **The held symptom search:** branch `lane/kb-symptom-search`, three commits, about 165 lines of code plus
  tests. It still merges onto the tip with no conflicts (checked read-only).
- **The index guarantee is not real yet.** The build has three paths that ship notes with no meaning index
  and only print a warning: the embedding model missing on the build machine, a run that stops part way, and
  a single note whose vector comes back the wrong size
  ([build_rag_db.py:559-633](../../scripts/build_rag_db.py)). The plugin's run-time check asks one yes-or-no
  question about the whole library rather than checking each note
  ([knowledge_base_schema.py:411-433](../../py_modules/backend/services/knowledge_base_schema.py)).
- **The three bugs.** Raw computer text in a reply is on the roadmap. The panel naming a closed game is
  written up in the status report only — **it has no roadmap entry**. The ring landing behind the corner
  icons exists **only in an untracked evidence file** from last night: three stops focused while partly
  hidden, one at 67% behind Retry and two at 89% behind Copy. The manual test record reads the 89% as
  expected and does not cover the 67% at all.
- **The "not in my notes" line:** agreed 1 September, nothing built anywhere in the plugin or the panel.
  Wording settled today.
- **Fallout: New Vegas is still not installed on the Deck.** It is the only thing blocking the last owed
  device row from wave one.

## 2. The seven pieces, and what a person notices

| # | Stars | Piece | What a person using the plugin notices | Lane |
|---|---|---|---|---|
| 1 | ★★★★ | **Notes for the 21 real gaps, plus topping up the four thinnest games** | The biggest change in this wave. Someone asking a plain question about Doom 64, Mario Kart 64, Super Mario 64 or Paper Mario mostly gets nothing today; after this they get a note | A, B |
| 2 | ★★★ | **A troubleshooting question actually reaches the tips** — the router stops refusing crash questions, the rules learn everyday words, and the symptom tips get written properly | *"My game keeps crashing"* gets crash advice. Today it gets nothing at all, and there is almost nothing useful to get | C, D |
| 3 | ★★ | **Raw computer text stops appearing in a reply** | An answer no longer ends with a line of code where words should be | E |
| 4 | ★★ | **The panel stops naming a game you have closed** | Exit a game and the line under the question box catches up. A question that does not name its own game stops picking up the wrong game's notes | E |
| 5 | ★★ | **Every note is guaranteed to have its meaning index** — and the tie-break idea gets measured | Nothing directly. It removes one of the three blockers on a four-to-six point search gain, and it stops a half-built library ever shipping quietly | F |
| 6 | ★★ | **The "not in my notes" line** | A person can tell an answer built from the notes from one out of the model's memory. It does not change the answer; it changes what you trust | G |
| 7 | ★ | **The ring stops landing behind the corner icons** | Walking down a long reply, no stop is half-covered by the Copy or Retry icon | orchestrator |

Plus **one corpus release** carrying the new notes and the rewritten tips, and **one evening on the Deck**.

Not in this wave, on purpose: spoiler tiers, follow-ups remembering, the answer-first test, the starting-out
kind, the card style pass, per-game tips, the embedding-model pull, and the context-window experiment. They
stay on the roadmap.

## 3. The calls, answered 2026-09-07 (written up as D85)

1. **Fill the 21 real gaps, and top up the four thinnest games.** The eight blanks written on purpose to have
   no answer **stay blank as a control**, so the test keeps something honest to measure against. Aim the four
   thin games at eight to ten notes each, and say so in the report if a game genuinely does not have that
   much to cover rather than padding it.
2. **The wording is:** *"Not in my notes — this answer is from the model's own knowledge."* One muted line,
   added by code, under the reply.
3. **The meaning-index lane ships the guarantee and measures the tie-break.** Nothing about the live search
   changes in this wave. The tie-break numbers come back as a decision for you.
4. **The ring bug is filed and fixed by the orchestrator, not a lane.** It is a focus and layout problem,
   which the rules keep away from helpers, and it sits in files another chat worked in yesterday.
5. **Carried over from D80 and unchanged:** run on once a milestone verifies; the public push of the release
   is the one stop.

## 4. Who does what

| Role | Model and effort | Does | Never does |
|---|---|---|---|
| Orchestrator | Opus, extra-high | Wave 0 prep; briefs and launches lanes; lands every commit; labels the new rows; runs the canonical measurements; re-measures the held branch; fixes the ring bug; builds and checks the release; writes every roadmap, testing, changelog and status-report row; writes the Deck rows | Writes lane code while a lane is open on the same files; pushes the release without the second "go" |
| Lane A | Sonnet 5, high | Notes for the six story-protected titles | Touches the eval fixtures, the router, the tips or any code |
| Lane B | Sonnet 5, high | Notes for the six open titles, including the three biggest top-ups | Same |
| Lane C | Sonnet 5, high | Fresh blind symptom questions | **Opens the tip sheet, the router, or any existing troubleshooting row**; runs any eval |
| Lane D | Sonnet 5, high | The router change, the everyday word rules, and the symptom tips | Reads lane C's rows or the existing blind troubleshooting rows; touches the notes file |
| Lane E | Sonnet 5, high | The raw-text bug and the stale-game-name bug | Touches anything focus- or layout-shaped |
| Lane F | Sonnet 5, high | The index guarantee (ships) and the tie-break (measured only) | Changes the blend weights or the live ranking |
| Lane G | Sonnet 5, high | The "not in my notes" line | Touches the knowledge-base service or the prompt text |
| QA session | Opus, medium | Runs the § 8 rows on the Deck, records evidence, stops on failure | Diagnoses or fixes; wipes plugin data; runs two rows at once |

**Five lanes at most at once** (AGENTS.md § 3), so this runs in two rounds. A and B must be different agents
from C: whoever writes content cannot write the blind questions that measure it.

## 5. Order of work

### Wave 0 — orchestrator alone, about an hour

1. `git status` clean; record the tip hash. Check `docs/planning/` and the decisions tail for numbers other
   chats took. Confirm no other chat is live in the reply block or the Ollama tab before lane E is launched.
2. Baseline green on the shared checkout: `npx tsc --noEmit`, `npm test`, `npm run test:py`, `npm run build`,
   `node scripts/check-focus-patterns.mjs`. Red baseline → stop and report.
3. `ollama list` shows `nomic-embed-text` and `gemma4:e2b-it-qat`.
4. Build the corpus once and copy `build/knowledge-base` into every worktree after step 6:
   `python scripts/build_rag_db.py --seed --out build/knowledge-base` then
   `python scripts/publish_corpus.py --build-dir build/knowledge-base --check`.
5. Take the pre-wave baselines **in the background while the lanes launch**:
   `python scripts/eval_kb_embed_models.py --arms-only` and
   `python scripts/eval_kb_answers.py --samples 3 --label before-wave2`. Commit both under
   `docs/archive/research/` as the 266-note baselines before wave two.
6. Copy `.claude/agents/kb-lane.md` to `.claude/agents/kb-lane-w2.md` pointing at this plan. Create one
   worktree per lane from the tip. Launch **round one** — A, B, C, D, F — in one message.
7. Record the tip hash, the baselines and the corpus version in § 11.

### Wave 1 — round one: five lanes, no Deck

A, B, C, D and F run together. Their file sets are disjoint (§ 6). While they work the orchestrator writes
the § 8 Deck rows, files the two missing roadmap entries (the stale game name and the ring bug), and fixes
the ring bug on its own branch.

### Wave 2 — round two: two lanes, launched as round one lands

**E** (the two bugs) and **G** (the "not in my notes" line) launch as soon as any round-one lane has landed,
keeping the five-at-once cap. Neither depends on round one.

### Wave 3 — landing, orchestrator alone

Land in the order lanes finish. Only four real dependencies:

1. **Land A and B** (notes only). Then **label**: for each of the 21 gap rows, set `expect_section` to the
   new note's exact name. Commit the labels separately from the notes. A label naming no real note fails a
   test. **Mark each labelled row's `note` field to say the note was written knowing the gap existed** — that
   row is no longer a blind measurement, and the report must not read it as one.
2. **Land C** (fresh symptom questions). No labels yet.
3. **Land D** (router, rules, tips). Then label C's rows against the new tips, and run the before/after over
   both the 17 existing troubleshooting rows and C's fresh ones.
4. **Then the held-branch question.** With the tips and the routing fixed, re-run the held branch's own
   measurement on the new tip sheet. If the crash sentence now reaches the crash tips **without** the meaning
   search, the branch is dead and gets written up as such. If the meaning search still adds reach on top,
   it revives and gets its own decision. Either way this closes the held decision properly rather than
   leaving a branch lying around.
5. **Land E, F, G** in arrival order. F's report carries the tie-break table; the weights do not move.
6. **Bookkeeping, one commit per landing** (lanes never touch these): the roadmap's knowledge-base section
   and Bugs list, `docs/testing.md` rows, `CHANGELOG.md`, and the status report § 3 numbers and § 4 lists.

### Wave 4 — the release, with your second "go"

1. Rebuild, note the version (UTC date), the note count and the byte size.
2. `publish_corpus.py --check`, then `npm run test:py`.
3. **Stop. Show you the manifest line.** Nothing leaves the machine until you say go.
4. Push to both channels, read both back over the wire, add the release row and a changelog line.
5. Do **not** install it on the Deck from here — that is the first QA row.

### Wave 5 — the Deck, a separate session, Opus medium

Section 8 is that session's brief. It starts after wave 4, with the plugin deployed from the landed branch
and **Fallout: New Vegas installed on the Deck by you**.

### Milestone gates — what "verifiably complete" means, so the orchestrator keeps going

| Milestone | Verified when |
|---|---|
| Wave 0 done | Five gates green on the tip; both models listed; corpus built and publish check passed; both baselines committed |
| A lane landed | Its commits fast-forward; five gates green after the merge; its report lists the files it read |
| Notes labelled | Every one of the 21 gap rows names a real note; the eight control rows still blank; `npm run test:py` green |
| Troubleshooting landed | The before/after table exists on both the 17 existing rows and C's fresh ones; no row that worked before got worse |
| Held branch decided | Its measurement re-run on the new tips, and the branch either revived with numbers or written up as dead |
| Index guarantee landed | A build with the embedding model stopped **fails** instead of warning; the publish check refuses a short corpus; tie-break table in the report |
| Release built | Manifest shows today's date and the new note count; publish check passed; Python tests green |
| Release pushed | Both channels read back the same version over the wire |
| Deck rows written | § 8 carries every exact sentence for every batch, in one message for you to confirm |

If a gate fails, the orchestrator fixes or reverts that landing and re-checks. It does not ask; it records.

## 6. Lane briefs

Every brief inherits the lane rules: check your worktree's ancestry against the tip hash first, five gates
green on an untouched tree, one change per commit, stay inside your file list, never touch the Deck, never
push, report at the end. **No lane commits an eval report** — the canonical runs are the orchestrator's.

### Lane A — notes for the six story-protected titles

**Files you may edit:** `data/kb/strategy_seed.json` only.

**Your games and your targets.** Fifteen new notes.

| Game | `game_id` | Gap questions to answer | Also |
|---|---|---|---|
| Black Mesa | 14 | `V2-T1-BMS-01`, `-02`, `-05` | — |
| Hollow Knight | 15 | `V2-T1-HK-01` | — |
| GTA V | 18 | `V2-T1-GTAV-04`, `-05` | — |
| GTA IV | 19 | `V2-T1-GTAIV-03`, `-05` | — |
| Fallout: New Vegas | 20 | `V2-T1-FNV-04`, `-05` | — |
| Paper Mario: TTYD | 24 | `V2-T1-TTYD-03` | **Top up from 6 notes to 8–10** |

Read the gap questions in `tests/fixtures/kb_eval_v2.json`. The repo rule is one-directional: whoever writes
a note may not write its test question, and these questions already exist, so you may read them. **Write the
note about the subject, not about the sentence** — do not lift the question's wording into the note.

**All six of your titles protect the story**
(`tests/contracts/spoiler-title-profiles.json`). Cover the mechanic and leave the plot out, the way the last
tranche did. `V2-T1-TTYD-03` asks about the final boss on a protected title: write it as tactics with no
story, and if you cannot, say so in your report and leave it blank rather than spoiling it.

**One withheld word.** `V2-T1-GTAV-05` declares *Fort Zancudo* withheld — the question may never contain it.
Your note may name it; a test only checks the question.

**Note shape** — nine fields, example at `data/kb/strategy_seed.json:2695`:

```json
{
  "section_id": 269,
  "game_id": 17,
  "section_type": "mechanic",
  "name": "Starting out in Doom 64",
  "card": "…400 to 880 characters…",
  "source_url": "https://doomwiki.org/wiki/Doom_64",
  "source_license": "CC-BY-SA-4.0",
  "source_version": null,
  "crawled_at": "2026-09-07"
}
```

`section_id` continues from the highest in the file. `section_type` is one of mechanic, boss, enemy, item,
area. **On a protected title the type word moves the spoiler risk** — boss, area, quest, ending, story,
puzzle and secret push it up; mechanic and tip pull it down
([spoiler_risk_service.py:28-40](../../py_modules/backend/services/spoiler_risk_service.py)). Pick the type
that is true, and know it has that effect.

**Credit rules, all enforced by tests** (`tests/test_source_attribution.py`): a note taken from a page must
name the page, the licence *with its version number*, and the day you read it as `YYYY-MM-DD`. A note you
wrote yourself carries `"source_license": "bonsAI-maintainer"`, no link and no date — never invent one.
Publishing accepts only CC-BY-4.0, CC-BY-SA-3.0, CC-BY-SA-4.0 and `bonsAI-maintainer`
(`scripts/publish_corpus.py:61-64`). **Check a wiki's licence before you write, not after.** The Zelda,
Hades, Baldur's Gate, Team Fortress and Valve developer wikis are already ruled out
(`docs/planning/15-corpus-licensing-attribution-plan.md:76-105`). `scripts/fetch_wiki_live_pages.py` records
the page, revision, day and licence in one go.

**Do not write a labelled note** (one starting `Summary:` / `Weak points:` / `Uses:` / `Phases:` / `Tips:`).
A test pins the labelled count at exactly 22 (`tests/test_knowledge_base_service.py:1999`) and changing it is
not your job. Prose, like the other 105.

**Before you finish:** `python scripts/probe_card_name_collisions.py` — a new name that is shadowed by an
existing one in search is worth renaming. Two names are already duplicated across games.

**Done when:** the notes are in, `python -c "import json;json.load(open('data/kb/strategy_seed.json',encoding='utf-8'))"`
parses, `npm run test:py` is green, one commit per game.

**Report:** hashes; a table of game → note name → which gap question it answers (or "top-up"); the wiki page
and licence for each sourced note; anything you left blank and why.

### Lane B — notes for the six open titles

Same rules as Lane A, same file, **different agent**. None of your titles protects the story, so you may
write freely about bosses, endings and secrets. Twenty-five new notes.

| Game | `game_id` | Gap questions | Also |
|---|---|---|---|
| DOOM Eternal | 16 | `V2-T1-DOOME-05` | — |
| Doom 64 | 17 | `V2-T1-DOOM64-01`, `-02`, `-05` | **Top up from 5 to 8–10** |
| Super Mario 64 | 21 | `V2-T1-SM64-01`, `-05` | **Top up from 6 to 8–10** |
| Mario Kart 64 | 22 | `V2-T1-MK64-04` | **Top up from 4 to 8–10** |
| Super Smash Bros. Melee | 23 | `V2-T1-MELEE-03` | — |
| Pikmin 2 | 25 | `V2-T1-PIK2-01`, `-02` | — |

**On the top-ups:** eight to ten is a target, not a quota. Mario Kart 64 is a small game. If it genuinely has
less than ten things worth a note, write what is real and say so in the report — a padded note is worse than
a missing one, because it competes in the search with the good ones.

**Co-ordinate `section_id` with Lane A.** You are both appending to the same file in separate copies of the
repo. Take **`section_id` 300 upward**; Lane A takes 269 upward. The orchestrator lands you one after the
other and the ids will not collide.

### Lane C — fresh blind symptom questions

**Files you may edit:** `tests/fixtures/kb_eval_v2.json` only, appending to the `queries` array.

**Why this lane exists.** The existing blind troubleshooting questions are nearly spent. Only four of the
seventeen are written the way a person actually talks, and one of those four has its exact sentence quoted
in four different documents in this repo, so anyone fixing the tips has already seen it. That row is burned
as an honest test. This lane writes a fresh set that nobody working on the tips will have read.

**Blindness rules, and they are the whole point.** Do not open, grep, or otherwise look at:
`data/kb/compat_patterns.json`; `py_modules/backend/services/compat_topic_router.py`;
`docs/audit/maintainer-decisions-locked.md`; `docs/planning/46-kb-wave-one-session.md`;
`docs/planning/37-rag-status-report.md`; any file under `docs/archive/research/`; and **any existing row in
the fixture** — append your rows without reading the ones already there. Do not run any eval. Your report
lists every file you read; if you read something you should not have, say so and the rows get discarded.

**What to write: 24 rows, two per subject.** For each subject one short typed phrase and one full sentence
the way someone would say it out loud. Write them from your own sense of how a person describes a problem on
a handheld — do not go looking for the right vocabulary anywhere in this repo.

The twelve subjects: the game closing on its own · the game not starting at all · a black or blank screen ·
the game running slowly or juddering · a controller not responding properly · no sound, or sound coming out
of the wrong thing · running out of room for games · the picture tearing or the screen looking wrong ·
the machine getting hot or the battery going fast · the machine not seeing another computer on the home
network · a system update that will not finish · playing on a television and the menus misbehaving.

**Row shape.** Copy exactly, one object per row:

```json
{
  "id": "V2-W2-SYM-01",
  "split": "holdout",
  "domain": "compat",
  "app_id": "",
  "shortcut": "",
  "query": "the game shuts itself down after about ten minutes",
  "intent": "Reach the tips about a game closing on its own",
  "topic_hint": "",
  "withheld_card_terms": [],
  "skill_level": "beginner",
  "input_style": "casual",
  "note": "Written blind 2026-09-XX; the writer had not read the tip sheet or the routing rules.",
  "expect_section": ""
}
```

`expect_section` stays `""` on every row — the orchestrator labels them after the tips land. Ids run
`V2-W2-SYM-01` upward.

**Done when:** 24 rows are in, the file parses, `npm run test:py` is green, one commit.

**Report:** the commit hash; the 24 sentences; the list of files you read.

### Lane D — the troubleshooting path: routing, words, and the tips themselves

**Files you may edit:** `py_modules/backend/services/compat_topic_router.py`, `data/kb/compat_patterns.json`,
`scripts/gen_compat_patterns.py`, `tests/test_compat_topic_router.py`,
`tests/test_knowledge_base_service.py`. **Forbidden:** the eval fixtures (you must not read Lane C's rows or
the existing `V2-C-*` / `V2-BLIND-*` rows), the notes file, the prompt text.

**The finding this lane is built on, measured 2026-09-07.** Nine of ten ordinary problem sentences reach no
tips at all. Three separate causes, and they need three separate fixes:

```
'my game keeps crashing'                      -> matched ['crash'] -> refused to route
'my game wont launch'                         -> matched ['crash'] -> refused to route
'black screen when i start the game'          -> matched ['crash'] -> refused to route
'game keeps crashing on my steam deck'        -> matched ['crash','deck'] -> refused to route
'why does my game stutter after a few minutes'-> matched nothing
'my controller isnt working'                  -> matched nothing
'no sound in my headphones'                   -> matched ['audio'] -> ROUTED
```

**Four commits, tests first.**

1. **A weak topic is enough when no game is running.** `crash`, `deck` and `linux` are in `_WEAK_TOPICS`
   ([compat_topic_router.py:241](../../py_modules/backend/services/compat_topic_router.py)) because they
   fire on ordinary strategy asks — *"how do I beat the boss on my deck"*. That reasoning holds while a game
   is running and does not hold with nothing running. Make `crash` and `linux` sufficient on their own
   **only when there is no running game and no game named in the question**; leave `deck` weak in every
   case, because it is the one that really does appear in strategy questions. The routing function takes
   only a question today, so this needs a game-state argument threaded from the existing caller in the
   retrieval gate; keep the old signature working for the other callers. Tests: the four sentences above
   route with no game; the boss-on-my-deck sentence still does not; a crash sentence **with** a game running
   is unchanged.
2. **The rules learn everyday words.** The rule lists are written in enthusiast vocabulary — `deadzone`,
   `haptic`, `tdp`, `frame limit`, `vsync`, `subnet`, `translation layer`. Add the plain phrasings for each
   symptom subject. Write them from your own everyday vocabulary. Keep the existing boundary-matching
   discipline (`_term_matches` and its comment about `lan` firing inside `plants` and `island` — that bug is
   why the matcher is written the way it is). Tests: a table of plain sentences, each reaching its subject;
   and the existing precision tests still passing unchanged.
3. **Write the symptom tips properly.** Crash has two tips and neither helps: *"Crash to desktop: check
   ~/.steam/steam/logs and compatdata"* and *"Kernel panic rare on Deck"*. On a Deck in game mode there is no
   desktop to crash to — the game drops you back to the library. Rewrite both and add enough that a crash
   question gets real advice: aim for eight to ten crash tips, and top up `performance` (2), `audio` (1),
   `display` (1) and `controller` (6) to a similar depth. Every tip stays one or two plain sentences, median
   about 70 characters today; say what to actually try, in the order to try it. All tips are
   `bonsAI-maintainer` with no source, so there is no licence work here. Also check whether an existing tip
   is filed under the wrong subject — there is a genuinely useful crash tip sitting under `proton`.
4. **Measure.** Run the production retrieval over the 17 existing troubleshooting rows, no game running,
   Speed mode, once at the tip and once at your head. Per row: subject reached, tip attached, and whether it
   changed. **The thing to prove is that nothing which already worked got worse.** Reaching more is expected;
   losing precision is the failure.

**Done when:** four commits, `npm run test:py` green, the 17-row before/after table in the report.

**Report:** hashes; test names; the table; the new tip count by subject; the plain sentences you used to
write the rules; anything you found filed under the wrong subject.

### Lane E — the raw-text bug and the stale game name

**Files you may edit:** `py_modules/backend/services/game_ai_request.py`,
`py_modules/backend/tdp_intent.py`, `tests/test_game_ai_request.py`,
`src/hooks/useBonsaiAskOrchestration.ts`, `src/components/MainTab.tsx`, and the matching frontend tests.
**Forbidden:** anything focus- or layout-shaped, the reply block's styling, the knowledge-base service.

**Bug one — an answer can end with raw computer text.** Roadmap, ★★, `[reply]`, seen on the Deck
2026-09-06: a reply ended with the literal line `{"tdp_watts": 5, "gpu_clock_mhz": 1200}` in the words a
person reads. **The cause is traced:** the pattern at [tdp_intent.py:74](../../py_modules/backend/tdp_intent.py)
finds the block and reads it; nothing ever removes it. It is parsed and logged at
[game_ai_request.py:488-508](../../py_modules/backend/services/game_ai_request.py), immediately before the
reply is handed on — which is where the strip belongs, next to the existing safety-notice append at `:535`.
Tests: a reply carrying the block has it removed and the surrounding words intact; the power suggestion still
reaches the caller; a reply with no block is byte-identical; a block inside a fenced code sample the person
asked for is left alone.

**Bug two — the panel keeps naming a game after it is closed.** ★★, written up in the status report but
**not on the roadmap**; the orchestrator files it. After exiting a game, the line under the question box
still named it. **The cause is visible in the code's own comment:**
[useBonsaiAskOrchestration.ts:102-125](../../src/hooks/useBonsaiAskOrchestration.ts) resolves the running
game once at mount and only corrects it when an ask's status poll runs. The line itself is
[MainTab.tsx:282](../../src/components/MainTab.tsx). Make it re-resolve when the running game changes, not
only when someone asks something. Tests in the frontend suite: closing a game clears the line without an ask;
launching one sets it; a question that names its own game is unaffected either way.

**Done when:** two commits, `npm test`, `npm run test:py`, `npx tsc --noEmit` and `npm run build` all green.

**Report:** hashes; test names; for each bug, one plain sentence saying what a person now sees.

### Lane F — every note has its meaning index, and the tie-break measured

**Files you may edit:** `scripts/build_rag_db.py`, `scripts/publish_corpus.py`,
`py_modules/backend/services/knowledge_base_schema.py`, `scripts/eval_kb_embed_models.py`, and their tests.
**Forbidden:** the blend-weight constants, the live ranking in `knowledge_base_service.py`, the fixtures.

**Part one — the guarantee (this ships).** There are three ways a note reaches a device with no meaning
index, and all three only print a warning
([build_rag_db.py:559-633](../../scripts/build_rag_db.py)): the embedding model is not installed on the
build machine (returns 0, every note unindexed); the run stops part way ("partially populated, re-run the
build"); or one note's vector comes back the wrong size and is skipped with `continue`.

1. **The build refuses to finish** in all three cases unless an explicit `--allow-missing-embeddings` flag is
   passed, and records the missing count in the manifest either way. Tests for each of the three paths.
2. **The publish check refuses** a corpus whose indexed count is short of its note count
   (`publish_corpus.py --check`). Test.
3. **The run-time check learns to tell "complete" from "some".**
   `corpus_has_usable_section_vectors` / `corpus_has_usable_compat_vectors`
   ([knowledge_base_schema.py:411-433](../../py_modules/backend/services/knowledge_base_schema.py)) ask
   whether the count is above zero. Add a separate "fully indexed" answer alongside them. **Do not make the
   existing check stricter** — an older library already installed on someone's Deck would lose the meaning
   search entirely. The strict answer exists so a future ranking change can depend on it. Tests for a
   complete corpus, a partial one and an empty one.

**Part two — the tie-break (measured only, ships nothing).** The decision that holds the search change
recommends this as the follow-up: keep the balance even, and let meaning rank higher **only where there is no
strong word match**, keeping today's protection for a note with no index. Build it inside
`scripts/eval_kb_embed_models.py` as a variant, the same way the weight sweep monkeypatches the service's
module constants — **never by editing the service**. Run it on the tuning questions and once on the held-back
questions, against today's even split. Then run the three tests that the weight change broke against the
prototype and report which, if any, still break. Those tests guard: a note with no index staying findable, a
strong exact word match not being unseated, and the topic-preference decision.

**Done when:** the guarantee commits are in with tests, `npm run test:py` green, and the tie-break table plus
the three test results are in your report. Do not commit any eval output.

**Report:** hashes; test names; the tie-break table (right note first and in the top three, tuning and
held-back, against today's split); which of the three protected behaviours survive; one plain sentence
saying whether this looks worth taking.

### Lane G — the "not in my notes" line

**Files you may edit:** `py_modules/backend/services/game_ai_request.py` and a new small service module
beside `destructive_advice_guard.py`, plus their tests. **Forbidden:** the knowledge-base service, the prompt
text, the fixtures.

**What it is** (decided 1 September, wording settled 2026-09-07): one muted plain line appended by **code,
not the model**, under the reply:

> Not in my notes — this answer is from the model's own knowledge.

**Copy the shape that already exists.** `append_destructive_advice_notice`
([destructive_advice_guard.py:147](../../py_modules/backend/services/destructive_advice_guard.py)) appends
`"\n\n—\n**…**"` to the finished reply and is called from `game_ai_request.py:535`. Build the same thing.

**When it shows:** only on an explicit Strategy or Expert ask, where the notes cover the game but nothing
matched — `kb_attached` false with coverage status `sections`. Both signals already exist
(`transparency_service.py:172`, read at `:279`). **Never** when the library is off, and never when the game
is not covered at all — the coverage chip already says that.

**One thing to check and report, not guess:** the line is text inside the reply, so it should ride along with
the answer's own D-pad stops and need no focus-graph entry. Confirm that from how the safety notice behaves
and say so in your report. If it turns out to need its own stop, stop and say so rather than adding one.

**Tests:** the four conditions (covered game with no match → shown; covered game with a match → not shown;
library off → not shown; uncovered game → not shown); a Speed-mode ask → not shown; the exact wording
asserted once; a reply that already ends with the safety notice gets both, in a sensible order.

**Done when:** one commit, `npm run test:py` green.

**Report:** hash; test names; the focus answer; what the line looks like at the end of a real reply.

## 7. The measurements the orchestrator makes

| Run | Command | Record |
|---|---|---|
| Pre-wave search baseline | `eval_kb_embed_models.py --arms-only` (wave 0) | Tune and held-back tables, four methods |
| Pre-wave answer baseline | `eval_kb_answers.py --samples 3 --label before-wave2` | The summary columns |
| After the notes land | Both, again | Coverage first: how many of 72 now have a note. Then the search numbers, **with the 21 gap rows marked as no longer blind** |
| Troubleshooting reach | Lane D's 17 rows re-run on the landed branch, plus Lane C's 24 fresh rows | Per row: subject reached, tip attached, before and after |
| The held branch | Its own measurement re-run on the new tip sheet | Does the meaning search still add anything once the tips and routing are fixed? |
| The tie-break | Lane F's table | Right note first, in the top three, and which protected behaviours survive |

Every number goes in three places: this file's § 11, the roadmap entry it closes or moves, and the status
report § 3.

## 8. The Deck evening (the QA session's brief)

**Who:** a fresh session on Opus at medium effort. **May:** deploy the landed build, open the plugin, pin
test chips, press buttons, launch and exit games, read the plugin log, save evidence under `runs/`.
**Must not:** wipe plugin data, change your settings without restoring them, fix anything, run two rows at
once, or guess a cause. A failed row is written down with its evidence and handed to an Opus extra-high
session.

**Before the first row.** Confirm the Deck is free — other chats press buttons on the same device, so ask for
an exclusive window. Back up `settings.json` off the Deck and restore it at the end. Deploy with
`scripts/build.ps1`; opening the plugin fails once after a deploy, so try again. **Pin the batches below as
frozen test chips, never type** — pressing A on a pinned chip fills the Ask field word for word and does not
submit, so the Ask press stays a separate step. The Deck sleeps during pauses, so ask a throwaway question
before timing anything.

**Every sentence below is under 160 characters and each batch is 3–12 entries, which is what the chip
pinning accepts.**

### The batches, word for word

**Batch R2 — the twelve new games** (12 chips). One question per game that already had a note before this
wave, so this row tests the tranche rather than tonight's work.

```
how do i get past the giant tentacle thing blocking the vent without it grabbing me
how do i heal in hollow knight without a potion
doom eternal early game tips
any tips for the huge final demon boss at the end of doom 64
gta 5 how to switch characters
gta 4 how to lose the cops
fallout new vegas where do i go after leaving goodsprings
how do i do a long jump in super mario 64
mario kart 64 how to drift
paper mario ttyd early game tips
what's the safe way to deal with the giant spider-like boss underground
melee how to unlock more characters
```

**Batch R3 — eight questions that had no answer until tonight** (8 chips), with the note each should find:

```
black mesa where do i go first                                    -> The opening tram ride and where it leads
hollow knight where do i go after the first area                  -> Leaving the Forgotten Crossroads
how do i get into the military base without getting a wanted level -> Getting into Fort Zancudo without a wanted level
fallout new vegas best early game armor                           -> Choosing early armor by Damage Threshold, not by looks
doom 64 where's the first key                                     -> The first keycard in Staging Area
mario 64 how to get the first star                                -> Getting your first star in Bob-omb Battlefield
mario kart 64 best kart for speed                                 -> Picking a kart for top speed
pikmin 2 how to get more pikmin                                   -> Growing your Pikmin squad
```

**Batch R4 — problems, with nothing running** (9 chips). The first eight are sentences written by someone who
had not seen the tips, and all eight reach the tips on this machine. The ninth is the control and must
attach nothing.

```
the game is really stuttering and skipping around the whole time I'm trying to play it
no sound at all coming out
storage full cant install anything else
screen looks torn and glitchy
it gets really hot and battery drains so fast
it gets uncomfortably warm in my hands after a little while and the battery seems to drain a lot quicker than it used to
update stuck wont finish installing
when I plug it into the television the menus show up in the wrong spot on the screen and are hard to read
thank you very much
```

**The other sixteen from that set are known not to reach the tips** and are recorded in the pinned reach
test rather than checked here. There is no point asking the device a question this machine already says
returns nothing.

**Batch R5 — the "not in my notes" line** (2 chips), with **Hades** running. Checked against the library
today: Hades has 15 notes, nothing anywhere mentions a hydra, and Megara has a note of its own.

```
how do i beat the bone hydra in hades
how do i beat megara in hades
```

**Batch R6 — the two bug fixes** (3 chips), with **Deep Rock Galactic: Survivor** running, Speed, voice on —
the setup that produced the stray computer text.

```
can you drop the tdp to save some battery
what power limit should i use for this game
how do i get more battery life out of this
```

### The rows

| Row | Setup | Do | Pass when | Evidence |
|---|---|---|---|---|
| **W2-R1 Install the release** | Old notes installed | Ollama tab → *Update knowledge base* | The tab shows the new version and **293 notes**; a game question's Show details names it | `runs/plan47-R1-*.json` |
| **W2-R2 The twelve new games** (closes **KB-TRANCHE-01**) | Fallout: New Vegas installed. Batch R2 | Steam titles: launch, ask in Strategy. Emulated titles: ask with the game named. Each emulated title appears **twice** in the library from two ROM-manager runs, and the shortcut names differ from the real titles (*Doom 64: Retribution*) | Each attaches at least one note; the credit line names the wiki and a date; spoiler behaviour matches the title's setting; the reply is about that game | `runs/plan47-R2-<tag>.json` |
| **W2-R3 The filled gaps** | Batch R3 | Ask each with the game running or named | The named note attaches, and the reply uses it rather than general memory | `runs/plan47-R3-*.json` |
| **W2-R4 Problems reach the tips** | **Nothing running.** Batch R4 | Ask each in Speed | The eight attach tips on the right subject; *thank you very much* attaches nothing | `runs/plan47-R4-*.json` |
| **W2-R5 The "not in my notes" line** | Voice on, thinking medium, **Hades running**. Batch R5 | Ask the hydra one in Strategy, then the Megara one in Strategy, then the hydra one again in Speed; then turn the library off and ask the hydra one once more | The line appears **only** on the first, reads exactly *"Not in my notes — this answer is from the model's own knowledge."*, and sits below the answer without breaking the D-pad walk | `runs/plan47-R5-*.json`, the saved chat |
| **W2-R6 The two bug fixes** | Speed, **Deep Rock Galactic: Survivor** running, voice on. Batch R6 | Ask all three; then exit the game and read the line under the question box | No code-like line in any reply; the line under the box stops naming the game within a few seconds of exiting | `runs/plan47-R6-*.json`, log tail |
| **W2-R7 The ring and the corner icons** | A long reply on screen | Walk down the whole reply with the D-pad | **This row measures, it does not check a fix** — the fix is not built. Record the visible percentage at every stop. What is wanted is the *size* of the stop that read 67%, which no evidence file holds. **A stop is only a failure if a word of text is hidden**; a corner point under an icon is where the icon is meant to be | `runs/plan47-R7-*.json` |
| **W2-R8 The five August rows** (optional) | One batch per row | As each row says in `docs/testing.md` | As each row says | as each row says |

**Wrap.** Exit any game, restore `settings.json`, list every file written under `runs/`, and append the log
to § 11: for each row, pass or fail, the reading, the file. Plain language first, numbers second.

## 9. Rules for this session

1. Everything you read is in plain language. Code detail goes in commit messages, lane reports and the briefs
   above, not in chat.
2. **One lane, one worktree, one concern.** A lane needing a file outside its list says so and stops.
3. **Lanes never edit the roadmap, the testing docs, the changelog or the status report.**
4. **Blindness is a hard rule.** Lane C's rows are discarded if its report shows it read the tips or the
   routing rules.
5. **No eval report is committed from a lane.**
6. **The release pushes only on your second "go".**
7. **The Deck is not touched until wave 5**, and then by the QA session alone.
8. Check the effort a lane actually ran at when it reports.
9. **Keep going once a milestone verifies.** The gate table in § 5 says what that means.
10. **New this wave:** any lane whose value rests on an unproven assumption gets that assumption tested
    cheaply before the lane is briefed. Wave one lost a day to a lane whose whole design rested on one. Two
    such checks were already run while writing this plan, and both changed what a lane will do.

## 10. Risks, and what to do about each

- **A note written for a blind question stops that question being a blind measurement.** The 21 gap rows are
  labelled and marked as such; the eight deliberate blanks stay blank as the control. The headline number is
  coverage — how many of 72 now have a note — not the search score on those rows.
- **One blind troubleshooting sentence is already burned.** Its exact wording is quoted in four documents in
  this repo. It is retired as a blind row; Lane C's fresh 24 are the honest test.
- **Opening the router with no game running could attach a Deck tip to a strategy question.** That is why
  `deck` stays weak in every case and only `crash` and `linux` change. Lane D's precision tests must still
  pass unchanged.
- **Making the index check strict would switch off the meaning search on an older installed library.** The
  strict answer is added alongside the existing one, never in place of it.
- **The tie-break may not reproduce the gain.** That is a finding, recorded, and the weights stay even
  either way.
- **Two content lanes write to the same file.** Separate id ranges, landed one after the other.
- **Lane E touches the reply path another chat worked in yesterday.** Confirm that chat is not live before
  launching it.
- **Padding a small game's notes makes the search worse, not better.** Lane B is told to report a short
  count rather than invent notes.
- **Shared Ollama on the PC.** Fine for correctness, slow for timing. Only the orchestrator's canonical runs
  are used for numbers.
- **The Deck evening is long** — twelve games to launch and eight rows. Two evenings is realistic.
- **Other chats commit to this checkout mid-session.** Plan and decision numbers are checked at the moment of
  writing, not the moment of planning.

## 11. Progress log

### Wave 0 — done 2026-09-07

**Tip hash `f0ea489`**, not the `92718d1` written in section 1. That hash was true when the plan was
drafted; the plan's own commit went on top of it. Every lane was briefed against `f0ea489`.

**All five gates green on the tip** before anything was touched: typecheck, 1,118 frontend tests, the
Python suite, the build, and the focus-pattern check (74 known, baseline 74).

**Both models present** on the build machine: `nomic-embed-text` and `gemma4:e2b-it-qat`.

**Corpus built and checked.** Version `2026.09.07`, 266 notes, 124 tips, every one with its meaning
index. `publish_corpus.py --check` passed. A copy went into all five round-one worktrees.

**Both baselines taken and committed** (`4ea364f`), on 266 notes, before any of this wave's changes:

| Baseline | Reading |
|---|---|
| Answers | Facts right 70.8% · never contradicts its note 100% · a note attached whenever one was due 100% · the safety line fired when due 77.8% and never misfired at 98.2% · 55.7% of questions clean on all three runs · about 1,850 words of prompt · no question overflowed the model's window |
| Search, on the questions nobody tuned against | Right note first: meaning-only 54.8%, words-only 48.1%, blended 51.9%, blended-then-reranked 48.9%. **The ranges overlap, so this set cannot tell the four apart.** That is a limit of the test, not a tie |

### Three facts in the plan that were wrong, and what was done

1. **Three game numbers pointed at the wrong games.** Section 6 gave Paper Mario as 24, Melee as 23
   and Pikmin 2 as 25. In `data/kb/strategy_seed.json` they are 23, 25 and 24. All three numbers are
   real, so notes written to the plan's numbers would have been filed under the wrong game and every
   test would still have passed. **Corrected in the lane briefs before launch.** Paper Mario's top-up
   from 6 notes is real; the note counts in section 1 were all correct.
2. **The two "missing" roadmap entries already exist.** Section 1 said the stale game name was written
   up in the status report only and the ring bug lived only in an untracked file. The plan's own commit
   `f0ea489` filed both, marked D85. No work was needed.
3. **Two lane briefs asked for something the blindness rule forbids.** Lane C was told to read the
   session plan, which quotes the exact tip wording and routing behaviour it must not see — the plan
   file was added to its forbidden list. Lane D was told to measure seventeen questions in a fixture it
   is forbidden to open; that measurement moved to the one running the session, which section 7 already
   says owns the canonical runs. Lane D's step 4 was removed from its brief.

### The ring bug — blocked on a measurement, not started

Reproduced from the evidence: three stops partly hidden, one at 67% behind Retry and two at 89% behind
Copy, exactly as filed. The 89% readings are accounted for in the test row already — one of nine sample
points sits in the corner where the icon is meant to be.

The 67% one needs a rectangle nobody has: the walk file records the percentage but not the size of the
stop it measured, and the reply layout report describes the controls but not the focus stops themselves.
The in-IDE preview can produce it — a short question seeded, then the layout read — but **the preview
panel has to be opened from the IDE and cannot be started from here.** Not attempted on the device: the
Deck belongs to the checking session in wave 5.

### Everything landed, 2026-09-07

All seven lanes in, all five gates green after each: 1,023 backend tests and 1,123 frontend.

| Lane | What landed | Effort it ran at |
|---|---|---|
| A | 13 notes for the six titles that protect their story, 11 gap questions answered | Sonnet 5, high |
| B | 14 notes for the six that do not, 10 gap questions answered | Sonnet 5, high |
| C | 24 problem sentences written blind | not overridden |
| D | The routing change, everyday words, and 32 rewritten tips | high |
| E | The stray computer text, and the panel naming a closed game | high |
| F | The index guarantee, and the tie-break measured | Sonnet 5, high |
| G | The "not in my notes" line | high |

### The numbers, all re-measured on the library that ships

**The search test had been reading a copy of the library from 31 August** — 161 notes, 13 games — because it
reuses whatever copy it finds unless a rebuild flag is passed by hand. Nobody had passed it. Every search
figure taken before this was found is void, including this evening's own starting one and wave one's.
Both ends were run again with the copy rebuilt. Filed as a four-star bug.

| | Before | After |
|---|---|---|
| Of 72 plain questions about the twelve new games, how many have a note | 43 | **64** (the other 8 are meant to have none) |
| Right note in the top three, on questions nobody tuned against | 80 in 100 | **84 in 100** |
| Those 72 questions finding their note in the top three | 38 | **58** |
| Answers clean on all three runs | 55.7 in 100 | **62.3 in 100** |
| Spoiler line appeared when it was due | 77.8 in 100 | **88.9 in 100** |
| Plainly-worded problem sentences that reach the tips (of 24, written blind) | 6 | **8** |

All 21 newly answered questions find their note in the top three; 12 find it first. Two rows of 413 got
worse against 24 better — the one worth naming is that asking about the big spiky turtle you throw by the
tail used to find the Bowser note third, and a new note about throwing King Bob-omb now sits above it.

### Three things found while measuring, all filed

1. **An answer told someone Pikmin 2 still has a day limit. Its note says the opposite.** The check that
   exists to catch that passed it, because it looks for two fixed sentences and the model wrote neither.
   **The "never contradicts its note — 100%" figure is not trustworthy.** Three stars.
2. **The facts score is lower than the truth.** The check matches a phrase inside the reply, so *"keep the
   crowd thin"* fails against *"thin the crowd"* and *"killing the mother"* against *"kill the mother"*.
   Four of the failures were right answers. **So the four thin-game failures were never the content gap
   they looked like** — the facts were already in the notes and in the answers. Two stars.
3. **The stale search corpus**, above. Four stars.

Neither check was fixed during the wave, on purpose, so its before and after are measured the same way.

### The held symptom search: reaches further, answers worse. Stays held.

Merged on top of everything that landed and measured. With nothing running it gets **all 24** of the blind
problem sentences into the search against **8** without it, and *"thank you very much"* still attaches
nothing. **But what comes back is wrong**: *"game wont even open"* and *"screen goes black when i open it"*
both attach a tip about the on-screen keyboard, *"cant find my pc on the network"* one about hotel Wi-Fi.
That is the same objection that held it before.

**The cause is now known, which is the useful part.** Its meaning search runs *only when nothing else finds
anything*, and that almost never happens — a word search over 156 tips nearly always finds something by
shared words and wins first with a poor match. All five of those came back by word search, not by meaning.
**What is missing is not a wider gate but a way to say "none of these tips fit."**

### The tie-break: measured, and it cannot change an answer

Right note first and in the top three came back **identical** to today's even split on both the tuning and
the held-back questions. The reason is arithmetic, not luck: the rule only leans toward meaning when the
word search finds nothing at all, and then every candidate has the same word score, so changing the weight
stretches the gaps without reordering anything. All three protected behaviours survive because the word
search finds something in all three. **Nothing here is worth taking.**

### The release, built and waiting

Corpus `2026.09.07`, schema 3. **293 notes, 156 tips, every one indexed** (`embedding_missing_count: 0`).
2,289,664 bytes uncompressed, **1.39 MB to download**. The publish check passes and the Python suite is
green. **Nothing has left this machine.**

### Still owed

- **The ring bug is not started.** The 67% reading needs the size of the stop it measured, which no evidence
  file holds. The in-IDE preview can produce it but **the preview panel has to be opened from the IDE**.
  Row W2-R7 is rewritten to measure rather than to check a fix.
- **One note needs the maintainer's eye.** Lane A wrote three notes with no source, from its own memory. Two
  are opinion. The third says Black Mesa's electrified water arcs on a cycle with a spark warning, so you
  should move while the water is dark. **That is not verified against any page** and it is the kind of thing
  a person would act on.
- **The Deck sentences are written out in § 8** and await confirmation before anything is pinned.
- **Fallout: New Vegas still is not installed on the Deck.**

### The Deck evening — run 2026-09-07, 17:45 to 18:50 EDT

Run from a wave-three session rather than a separate checking session, because the Deck was free
and the maintainer asked for it. Sentences were written out and **confirmed by the maintainer
before anything was pinned**, as the rule says. Settings were backed up on the device and off it,
and restored at the end.

**How the questions were asked.** The batch was pinned as frozen test chips and the chips did drive
the carousel. But the D-pad would not walk the batch to a chosen entry, so the sentences for R5 were
put into the Ask field with `scripts/deck_send_ask.py` instead — which types the sentence and does
**not** press Ask, the same split a chip uses. The Ask press was a separate bridge press every time.
Nothing was thumb-typed.

**Where the numbers come from.** R2, R3 and R4 were measured by running each question through the
real search on the device against the library installed in R1. That gives the search half of those
rows exactly. R5 and R6 were run through the screen, because what they check is the reply.

| Row | Verdict | What was found |
|---|---|---|
| **W2-R1** Install the release | **PASS** | 2026.09.06 → **2026.09.07**: 293 notes, 25 games, 156 tips, every one with its meaning index. Both download channels checked first and identical |
| **W2-R2** The twelve new games | **PASS** (search half) | All twelve attach three notes, every one about the right game. The two questions that never name their game both picked up the running game |
| **W2-R3** The filled gaps | **PASS** | All eight find the note written for them, every one in the top three, three of them first |
| **W2-R4** Problems reach the tips | **PARTIAL** | 8 of 8 reach a tip and *"thank you very much"* attaches nothing. But one of the eight gets a tip that does not answer it |
| **W2-R5** The "not in my notes" line | **FAIL** | The line cannot appear. See below |
| **W2-R6** The two bug fixes | **FAIL** on the half that ran | The line under the question box still names a game minutes after it is closed. The stray-text half is still owed |
| **W2-R7** The ring and the corner icons | closed | Measured 2026-09-07 03:03; the maintainer chose to do nothing (D86) |
| **W2-R8** The five August rows | not run | Optional |

#### R5 — the "not in my notes" line does not work

Measured before the device run, then confirmed on it.

The line shows only when the library covers the running game **and nothing in it matched**. Ten
Strategy questions were tried against covered games, including *"how do i tame a horse"* in Black
Mesa, *"where do i buy a house"* in Portal 2, and the nonsense string *"qqqq zzzz wwww"* in Hades.
**Every single one attached a note.** The line printed on none of them.

On the device, with Hades running and Strategy: *"how do i beat the bone hydra in hades"* attached
three Hades notes (Weapon choice, Theseus and Asterius, Heat and the Pact of Punishment) and the
reply confidently explained how to fight a boss that does not exist in the game — *"the Stygian
Blade is the easiest to swing with… the Shield of Chaos is pure genius"* — with **no line**.

That is the exact harm the line was built to prevent. The cause is the one wave three is already
fixing for the tips: **nothing in the search can say "none of these fit."** The notes have the same
hole. The maintainer has agreed to widen wave three's tip lane to cover notes as well.

The remaining three cases of the row were not run: the row passes only if the line appears on the
first question and nowhere else, and it did not appear on the first.

#### R6 — the panel still names a game after it is closed

Hades was exited through the Steam menu with the panel open. The line under the question box read
*"Context: active game AppID 1145360"* straight afterwards, still said it 31 seconds later, still
said it about four minutes later, and **still said it after the Quick Access Menu was closed with
the chord and reopened**.

That last one matters: reopening is the path commit `3158835` fixed, and its message says the
ordinary keep-in-sync check corrects itself in about a second and a half. Neither held here. The
line is `MainTab.tsx:279-294`, rendered live from `ollamaContext`, in the main tab dock — so this is
the live line, not a record of the finished turn. Three stars.

The other half of the row — the stray line of computer text — is still owed. It needs Deep Rock
Galactic: Survivor running, Speed and voice on.

#### R4 — one tip is stapled onto the wrong question

*"when I plug it into the television the menus show up in the wrong spot on the screen and are hard
to read"* comes back with *"Big Picture Mode is default on Deck; Desktop Mode for Konsole and file
fixes"*, which does not answer it. A ninth example for wave three's tip work.

#### Two things found about the pinned test chips

1. **A pinned batch is not badged.** The chips drove the carousel, but no chip showed the amber
   **Test** badge. There are two chip label renderers: the ordinary one draws the badge
   (`MainTabPresetAnimatedChips.tsx:231`), and the decode-animation one draws its own label without
   it (`MainTabPresetAnimatedChips.tsx:535`). This Deck has the decode animation on, so the badge
   never renders. The badge exists so it is obvious at a glance that the carousel is not showing
   what the plugin would have chosen; without it a pinned batch looks like real chips. Two stars.
2. **Right on a pinned chip did not bring in the next entry.** One press, one state, so this is
   recorded to reproduce rather than filed as a bug.

#### Still owed after this evening

- R6's stray-computer-text half.
- The two failures above need fixing: they are handed on rather than fixed here.
- Fallout: New Vegas is still not installed; R2 asked about it by name, which the row allows.
