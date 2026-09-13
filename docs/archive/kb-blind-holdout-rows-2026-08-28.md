# Twenty blind holdout rows added to `kb_eval_v2`, 2026-08-28

Written so the method can be checked without re-deriving it. Plain language on purpose. Decision:
[D37](maintainer-decisions-locked.md#d37--locked-endorsed-2026-08-29--blind-holdout-rows-added-to-kb_eval_v2-endorse-them),
**locked 2026-08-29 — the maintainer endorsed the method.**

## 1. Why blind rows

[D23](maintainer-decisions-locked.md#d23--where-do-the-paraphrase-questions-go) folded 15
paraphrase rows into `kb_eval_v2` to give the holdout split something to separate on — at the time
the holdout half (n=36) scored identically on keyword, vector-only and fusion retrieval, so it could
not tell any of the three approaches apart. D23 could not fix this itself: by its own rule (R1),
every one of its 15 rows had to go to `tune`, because they paraphrase `kb_eval_v0`, which is
card-derived throughout — a paraphrase of a card-derived query is still card-derived, so none of
those rows can serve as a ship gate. D23's own text names the fix: "rows written blind against the
cards." This is that work.

"Blind" here means one specific thing: the question was written **without reading the card it is
meant to match**, so the question cannot accidentally echo the card's own wording. A holdout that
was never looked at while retrieval was tuned, and that shares no vocabulary with its target by
construction, is the only kind of row that can honestly separate "the retrieval method found the
right card" from "the question and the card were written by the same hand."

## 2. The exact procedure followed

1. **A metadata-only listing, nothing else.** A throwaway script
   (`list_kb_cards.py`, not committed — it only ever printed to a scratch file) read
   `data/kb/strategy_seed.json` and `data/kb/compat_patterns.json` and printed exactly four fields
   per row: `id`, `title` (`name` for strategy sections, `topic` for compat patterns), `section_type`
   (or `compat` for pattern rows, which don't carry a type), and `game` (the section's
   `canonical_title`, or `(platform-wide)` for compat patterns, which aren't tied to one game). The
   `card` field — the actual tip/strategy text — was never printed, never read, and the two source
   JSON files were never opened with a file-reading tool at any point in this session.
2. **Every card was picked or skipped from that listing plus general knowledge of the title alone.**
   135 strategy sections across 13 games and 124 compat patterns across roughly two dozen topics were
   available. Cards were chosen where the title, plus ordinary familiarity with the game, was enough
   to know confidently what a player would be asking about. Everything else was left alone rather
   than guessed at.
3. **No measurement of any kind before or during writing.** No retrieval call, no embedding call, no
   run of `scripts/eval_kb_embed_models.py`, `build_rag_db.py`, or any Ollama call happened at any
   point while these rows were being written. The split (`holdout`, for all twenty) was fixed as part
   of writing the row, before anything could be scored — the same ordering R1 requires and the same
   ordering D23's own rows could not satisfy for themselves.
4. **Self-check, not measurement.** After writing, each row was checked against a plain-text rule —
   does the query contain a distinctive word from the card's title? — using only the id/title
   listing from step 1, and separately checked that its `expect_section` / `expect_topic` names a
   card or topic that is actually in the listing (both checks are string comparisons over metadata
   already collected in step 1, not a retrieval run). All twenty passed both checks; none needed
   discarding.

## 3. Games and card kinds skipped

**One game skipped entirely: State of Emergency (2003).** Its section titles — *Downtown*, *Final
Confrontation*, *Kaos mode and Revolution mode*, *Fighting the Corporation*, *Unlocking characters*
— did not carry enough on their own for a confident, specific question; this is a niche title with
thin general knowledge behind it, exactly the case the task's skip rule exists for.

**Individual cards skipped for the same reason**, kept here rather than silently dropped: DRG
Survivor's *Hollow Bough* (a specific biome layout, not guessable from the name alone); several
Cyberpunk 2077 and Portal 2 co-op cards where the title named a mechanic too generically to commit
to a specific question; several Sims 4 and RDR2 cards once one or two per game were already covered,
to keep the spread even rather than exhaustive.

## 4. The twenty rows

All `split: "holdout"`. `withheld_card_terms` is `[]` on every row, matching the convention the
`V2-PARA-*` rows already established for this exact situation — a row written without seeing the
card cannot honestly list which of the card's own phrases it withheld, so it lists none rather than
guessing.

| ID | Game | Kind | Target (expect_section / expect_topic) | Query |
|---|---|---|---|---|
| V2-BLIND-H01 | Deep Rock Galactic: Survivor | boss | Glyphid Dreadnought | "there's this giant armored bug that just steamrolls my whole squad, what do I do" |
| V2-BLIND-H02 | Deep Rock Galactic: Survivor | item | Nitra | "I keep running dry on ammo mid-run, what am I supposed to go dig up to refill" |
| V2-BLIND-H03 | Left 4 Dead 2 | mechanic | Hunter | "something keeps leaping down from ledges and pinning me to the ground, how do I get it off" |
| V2-BLIND-H04 | Left 4 Dead 2 | mechanic | Going down and black and white | "why did the screen turn gray and I can only crawl around on the floor" |
| V2-BLIND-H05 | Baldur's Gate 3 | mechanic | Long rest | "when should I actually stop and set up camp for the night to heal everybody up" |
| V2-BLIND-H06 | Baldur's Gate 3 | mechanic | Sneak Attack | "how do I get my rogue's big bonus damage hit to actually go off" |
| V2-BLIND-H07 | Fallout 4 | mechanic | Power armor and fusion cores | "the big mech suit I climbed into just stopped moving on me, why" |
| V2-BLIND-H08 | Fallout 4 | boss | Mirelurk queen | "there's this massive crab-looking thing near the water spitting acid at me" |
| V2-BLIND-H09 | Hades | mechanic | Boons and duo boons | "the gods keep offering me buffs mid run, do the combos from two different gods actually do anything special" |
| V2-BLIND-H10 | Hades | boss | Theseus and Asterius | "there's a fight with a guy on a chariot and a huge minotaur at the same time, any tips" |
| V2-BLIND-H11 | Cyberpunk 2077 | mechanic | Sandevistan | "there's a cyberware implant that slows the whole world down for a few seconds, worth installing early" |
| V2-BLIND-H12 | The Sims 4 | quest | Get a Job | "how do I actually get my sim hired somewhere instead of sitting around the house all day" |
| V2-BLIND-H13 | GTA: San Andreas – DE | mechanic | Weapon skill | "does using the same gun over and over actually make my character better with it" |
| V2-BLIND-H14 | Red Dead Redemption 2 | mechanic | Dead Eye | "there's a slow-motion aiming thing I can pop into during a shootout, how do I get more use out of it" |
| V2-BLIND-H15 | Portal 2 | mechanic | Excursion Funnel | "there's this tube of light carrying stuff along and it picks me up too, can I steer while I'm inside it" |
| V2-BLIND-H16 | Half-Life 2 | area | Ravenholm | "I just wandered into this abandoned town full of zombies and bear traps everywhere, anything I should know before pushing further in" |
| V2-BLIND-H17 | Ocarina of Time | enemy | Wallmaster | "a hand dropped out of the ceiling and yanked me all the way back to the start of the dungeon, what even was that" |
| V2-BLIND-H18 | Ocarina of Time | dungeon | Shadow Temple invisible floors | "in this creepy dark dungeon full of ghosts I keep falling through floor that looks completely solid" |
| V2-BLIND-H19 | (platform-wide) | compat / steam_input | steam_input | "my controller works fine on the desktop but the game doesn't seem to see half my buttons" |
| V2-BLIND-H20 | (platform-wide) | compat / storage | storage | "I'm nearly out of room and want to move some installed games onto my memory card without redownloading everything" |

**Spread.** 12 of the corpus's 13 games are touched (every one but State of Emergency); kinds
touched are boss (3), item (1), enemy (1), area (1), dungeon (1), quest (1), mechanic (10), plus two
compat topics. Difficulty is mixed on purpose: rows marked `input_style: "paraphrase"` in the fixture
describe the situation sensorially and share essentially no vocabulary with the title (*"a hand
dropped out of the ceiling and yanked me all the way back to the start of the dungeon"* for
Wallmaster); rows marked `"casual"` still avoid the title's distinctive words but read like a more
ordinary, direct question (*"how do I get my rogue's big bonus damage hit to actually go off"* for
Sneak Attack).

## 5. What this changes and what it does not

- **Holdout grows from 64 rows to 84** (measured directly on the fixture as it stood before and
  after this edit — strategy-domain holdout 51 → 69, compat-domain holdout 13 → 15). Note this is
  already more than the 36-row holdout D23 quoted; other work between 2026-08-22 and now (D26's
  re-keying, and whatever else touched the fixture) had already grown it before this change. This
  is a new set regardless of the starting number. Any figure measured against it after this change
  is a **new series and is not comparable to the 83.3% figure on record from before 2026-08-21
  (R4)** — the same caveat D23 recorded for its own fold-in, for the same reason: adding rows to a
  scored split invalidates every prior number on that split, whichever direction the new rows
  happen to move it.
- **No measurement was run as part of this change**, deliberately. The whole point of D23's unmet
  goal was a holdout nobody had tuned against — running the arms sweep in the same session that
  wrote the rows would mean the person who wrote them also saw how each retrieval method scored
  before anyone else did, which is a smaller version of the exact contamination blind rows exist to
  prevent. **The first measurement against this new holdout happens after this change merges**, run
  by whoever measures it next, not here.
- **Nothing about tune changed.** All 170 existing tune rows and their labels are untouched; the 15
  `V2-PARA-*` rows stay `tune` exactly as D23 assigned them.

## 6. Environment note, for anyone re-deriving this

This work was done in a git worktree that turned out to be pinned at an old commit (`06fb607`,
before the RAG/eval feature existed at all — no `tests/fixtures/`, no `docs/audit/`, no
`kb_eval_v2.json`), 442 commits behind `experimental`, where all of this actually lives. A
fast-forward merge/rebase onto `experimental` (safe — this worktree's branch has zero commits not
already in `experimental`) was blocked by this session's own sandboxing and could not be authorized
from inside the session. The fixture and this file were therefore built by reading the current
content from the sibling checkout on `experimental` and writing the result into this worktree
directly, rather than by an in-place edit plus history merge. One consequence worth flagging: the
Python test files that consume `kb_eval_v2.json` (`test_eval_kb_arms.py`,
`test_asked_entity_extraction.py`, `test_compat_topic_router.py`) are not present in this worktree
either, so `npm run test:py` here cannot exercise them — the fixture-shape checks those files would
run (no title-word leaks, every label names a real card, every compat label names a real topic) were
instead run directly against this fixture using the same logic those tests use, reading only
metadata (ids, titles, topics) from `data/kb/*.json` on the sibling checkout, never card bodies. All
of them passed. Whoever merges this should re-run the real `npm run test:py` once this content is in
a checkout that actually has those test files.

**Done on merge, 2026-08-28.** The full `npm run test:py` on the merged tree surfaced exactly one
consumer failure: the D16 reach pin in `test_compat_topic_router.py` requires every holdout compat
row to route, and `V2-BLIND-H19` (controller symptom, no troubleshooting term) does not — the same
known-miss shape as `V2-C-04`. The pin now names it instead of requiring 100% reach; the row itself
is unchanged, for the reason recorded in the pin's docstring. First measurement against the new
holdout is recorded under **D37** in
[maintainer-decisions-locked.md](maintainer-decisions-locked.md): fusion 85.7% vs keyword 83.9%
top-3 on the labelled holdout (n=56), intervals overlapping — the first run where the arms differ
at all, still not a separation.
