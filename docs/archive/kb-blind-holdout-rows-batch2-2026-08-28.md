# Thirty-six more blind holdout rows, 2026-08-28 (batch 2)

Second batch, same method as
[kb-blind-holdout-rows-2026-08-28.md](kb-blind-holdout-rows-2026-08-28.md) — read that file
first; this one records only what is different. Plain language on purpose. Falls under the same
decision, [D37](maintainer-decisions-locked.md#d37--locked-endorsed-2026-08-29--blind-holdout-rows-added-to-kb_eval_v2-endorse-them),
**locked 2026-08-29** — the endorsement covers both batches.

## 1. Why a second batch

The first batch of twenty did what it was for and stopped short of the goal. Its measurement, on
the record under D37: on the labelled holdout (n=56) **fusion 85.7% [75.0, 94.6] vs keyword 83.9%
[73.2, 92.9]** top-3. That was the first run where the arms produced different numbers at all —
the old 36-row holdout scored every arm identically — but the intervals overlap, so it still
cannot say fusion beats keyword.

Overlapping intervals that wide are mostly a sample-size problem. Fifty-six labelled rows put the
half-width of a top-3 interval at around ten points, and the gap the fixture is being asked to
resolve is under two. More rows is the cheapest thing that narrows it, and rows written blind are
the only kind that can honestly go into holdout at all.

**This batch takes the labelled holdout from 56 to 92.** It does not guarantee a separation —
if the two arms really are this close, a wider interval will simply close on a smaller gap and
the honest answer stays "cannot tell". It does mean the next run is measuring the retrieval
rather than the noise.

## 2. What is different from batch 1

The procedure is unchanged and was followed the same way: a throwaway metadata-only script over
`data/kb/strategy_seed.json` and `data/kb/compat_patterns.json` printing exactly `section_id`,
`name`/`topic`, `section_type` and the game's `canonical_title`; the `card` field never read, the
two source files never opened with a file-reading tool; questions written from that listing plus
ordinary knowledge of each title; the split fixed at `holdout` before anything could be scored; no
retrieval, embedding or eval run at any point while writing.

Three differences worth recording:

1. **The listing was extended to mark which cards already carry an eval row of any kind**, by
   reading `expect_section` / `expect_topic` off `kb_eval_v2.json` — metadata fields, not queries
   and not `withheld_card_terms`, which quote card wording. This is what lets batch 2 target only
   uncovered cards rather than re-covering what batch 1 or the older rows already reach. Every one
   of the 36 targets had **no** eval row before this change.
2. **The self-check was automated** rather than done by eye: a script asserts, per row, that no
   non-stopword token of the card's title appears as a whole word in the query, that
   `expect_section` / `expect_topic` names a card or topic actually present in `data/kb/*.json`,
   that the split is `holdout` and `withheld_card_terms` is `[]`, and that no card ends up with
   two blind rows. All 36 passed with no rewriting needed.
3. **Two cards were deliberately paired to prove the check is real.** Fallout 4's *Corvega
   Factory* is asked about as "a big rusted car **plant**", and Cyberpunk 2077's *All Foods
   Plant* as "the disused **factory**" — each question borrows the other card's title word and
   avoids its own.

## 3. What was skipped, and why

- **State of Emergency, again, entirely.** Same reason batch 1 gave: too little general knowledge
  of a niche 2003 title to write a confident question from a section title alone.
- **`Hollow Bough`** (DRG Survivor, area) — skipped in batch 1 as "a specific biome layout, not
  guessable from the name alone", and skipped here for the same reason rather than being
  second-guessed.
- **`Kerenzikov`** (Cyberpunk 2077, mechanic) — the honest paraphrase of it ("cyberware that gives
  a bit of slow motion") is nearly the same sentence as batch 1's `V2-BLIND-H11` for *Sandevistan*.
  A row whose correct answer cannot be decided from its own wording tests labelling, not
  retrieval.
- **`Los Santos`** (GTA SA-DE, area) and **`Starter Lot`** (The Sims 4, area) — no specific
  question follows from the title; anything written would have been "any tips for the first
  city / house".
- **`Sandtraps`** (Half-Life 2, area) — would collide with the already-covered *Antlions and the
  sand*.

## 4. The thirty-six rows

All `split: "holdout"`, all `withheld_card_terms: []`, ids `V2-BLIND-H21` … `V2-BLIND-H56`.
18 `paraphrase`, 18 `casual`.

| ID | Game | Kind | Target | Query |
|---|---|---|---|---|
| H21 | DRG: Survivor | enemy | Exploder | "these little ones sprint right at me and burst, and it takes most of my health with it" |
| H22 | DRG: Survivor | enemy | Praetorian | "there's a fat armoured one that sprays a cloud right in my face when I shoot it head on" |
| H23 | DRG: Survivor | enemy | Mactera | "the ones in the air keep hovering out of my reach while I'm busy with the swarm on the ground" |
| H24 | DRG: Survivor | enemy | Acid Spitter | "something keeps lobbing green goo at me from right across the cave" |
| H25 | DRG: Survivor | item | Red Sugar | "what's the stuff I break out of the walls when I'm low on health" |
| H26 | DRG: Survivor | item | Gold | "is it worth stopping to dig out the shiny yellow stuff or should I keep moving" |
| H27 | DRG: Survivor | boss | Dreadnought Twins | "I brought one of the two big ones down and it just got back up while the other was still alive" |
| H28 | Ocarina of Time | boss | Morpha | "the thing at the end of the flooded dungeon is just a blob in the water and I can't get at the middle of it" |
| H29 | Ocarina of Time | boss | Dark Link | "there's a fight with a shadow version of me that counters everything I try" |
| H30 | Ocarina of Time | boss | Phantom Ganon | "a rider keeps leaping in and out of the paintings on the wall and I can't tell which one is the real one" |
| H31 | Ocarina of Time | enemy | ReDead and Gibdo | "these mummy things let out a scream that freezes me solid and then grab on, how do I avoid it" |
| H32 | Ocarina of Time | item | Bottles | "what's actually worth keeping in the empty glass containers I've collected" |
| H33 | Ocarina of Time | item | Iron Boots | "how do I stay down at the bottom of the water instead of floating straight back up" |
| H34 | Ocarina of Time | item | Hookshot and Longshot | "is there something that pulls me over to a ledge I can't jump across to" |
| H35 | Left 4 Dead 2 | mechanic | Spitter | "one of them leaves a pool of burning goo right where the team is standing" |
| H36 | Left 4 Dead 2 | mechanic | The Director | "does the game actually change how much it throws at you depending on how well you're playing" |
| H37 | Left 4 Dead 2 | mechanic | Bile bomb | "there's a jar you throw that makes the horde go after whatever it splashes instead of you" |
| H38 | Cyberpunk 2077 | mechanic | Berserk | "which implant should I go for if I mostly want to punch things and shrug off hits" |
| H39 | Cyberpunk 2077 | area | All Foods Plant | "the disused factory where I have to deal with the gang about the stolen robot, anything I should know first" |
| H40 | Fallout 4 | mechanic | SPECIAL points | "right at the start I get to spread out my seven core stats, is there a safe way to do that" |
| H41 | Fallout 4 | mechanic | Upgrading power armor | "how do I make the suit I climb into tougher, and where do I actually do that" |
| H42 | Fallout 4 | area | Corvega Factory | "there's a big rusted car plant full of raiders early on, how should I go at it" |
| H43 | GTA: San Andreas – DE | boss | Big Smoke | "the final showdown with my old friend in the burning crack house, how do I get through it" |
| H44 | GTA: San Andreas – DE | mechanic | Respect | "how do I get more of my guys willing to follow me around" |
| H45 | GTA: San Andreas – DE | mechanic | Fat | "my character has got chubby from all the eating, how do I slim him down" |
| H46 | GTA: San Andreas – DE | mechanic | Stamina | "I run out of puff after a short sprint, can I fix that" |
| H47 | GTA: San Andreas – DE | mechanic | Gang territory | "how do I take more of the map off the rival crews" |
| H48 | GTA: San Andreas – DE | mechanic | Lung capacity and oysters | "I keep drowning when I dive down to grab things, can I hold my breath longer" |
| H49 | Red Dead Redemption 2 | boss | Bear | "a huge animal mauled me twice while I was out hunting up north, how do I bring it down" |
| H50 | Red Dead Redemption 2 | mechanic | Cores and rings | "the little meters at the bottom of the screen keep draining and I don't understand what they want" |
| H51 | Hades | area | Temple of Styx | "in the last region before the final fight there's a row of doors and only one is right, how do I pick" |
| H52 | The Sims 4 | mechanic | Emotions | "my sim's mood keeps flipping about and it seems to change what they're good at" |
| H53 | Half-Life 2 | mechanic | Rocket-Propelled Grenade Launcher | "I've got the weapon that fires a guided missile with a laser dot, what's the trick to hitting the flying things" |
| H54 | Baldur's Gate 3 | area | Goblin Camp | "should I throw in with the raiders at the ruined temple in act one or wipe them out" |
| H55 | (platform-wide) | compat / crash | crash | "the game drops me back to the library a few minutes in, every single time" |
| H56 | (platform-wide) | compat / audio | audio | "sound comes out of the built-in speakers fine but nothing plays through my bluetooth headphones" |

**Spread.** 11 games, plus 2 compat topics. Kinds: mechanic 14, boss 6, enemy 5, item 5, area 4.
The kind mix is deliberately different from batch 1 (which was mechanic-heavy at 10 of 18) —
`enemy`, `item` and `area` were barely represented in holdout before this batch and are the card
kinds the Phase 4 track 2 content added.

## 5. What the batch found before it was ever scored

**Two of the four blind compat rows do not reach compat retrieval at all.** `V2-BLIND-H55` joins
`V2-BLIND-H19` as a known miss in the D16 reach pin
(`tests/test_compat_topic_router.py`, `test_measured_reach_on_the_drafted_intents`). Both are the
same shape: a symptom described in full without naming any troubleshooting term — H19 says
"controller … doesn't see half my buttons" without saying *input*, H55 says "drops me back to the
library" without saying *crash*.

This is the D16 gate behaving exactly as specified — it routes on a named topic, by design, after
the literal `deck`/`proton` phrase gate was replaced. It is still a real reach limit, and it is
one the card-derived rows could never surface, because a question derived from a card about
crashes says "crash". **The rows were not reworded to make them route**, per the standard D37 set
for H19: rewording until it passes tunes the row against the router and destroys the blindness
that is the row's whole purpose. Filed on the roadmap instead.

## 6. What this changes and what it does not

- **Holdout grows 84 → 120 rows; labelled holdout 56 → 92.** Strategy-domain holdout 69 → 103,
  compat-domain 15 → 17.
- **Any number measured against this holdout is a new series again (R4).** The D37 figures
  (fusion 85.7% / keyword 83.9%, n=56) are now the *previous* series and are not comparable to
  anything measured after this change — the same caveat D23 and batch 1 each recorded, for the
  same reason.
- **No measurement was run as part of this change**, deliberately, for the reason batch 1 gives:
  measuring in the same session that wrote the rows lets the author see the arms' scores before
  anyone else, which is a smaller version of the contamination blind rows exist to prevent. **The
  first measurement against the 92-row labelled holdout happens after this merges.**
  **Done 2026-08-29**, after the merge (`ebd2361`) and after D37 was endorsed, in that order.
  Headline: keyword 70.7% / vector_only **83.7%** / rrf 79.3% top-3 on the 92-row labelled holdout.
  Both arms scored lower than on the 56-row set, and **keyword fell twice as far as fusion**
  (13.2 points against 6.4) — which is what rows sharing no vocabulary with their card should do to
  a keyword arm, and the first evidence these rows are testing what they were written to test. The
  two findings worth carrying — the holdout starting to separate, and the shipping `rrf` arm losing
  to `vector_only` by 7.6 points of top-1 on holdout while tying it on tune — are recorded under
  [D37](maintainer-decisions-locked.md#d37--locked-endorsed-2026-08-29--blind-holdout-rows-added-to-kb_eval_v2-endorse-them).
- **Nothing about tune changed.** No existing row of any split was edited.

## 7. Tests

`npm run test:py` — **887 tests, OK (3 skipped)** after the reach pin was updated to name
`V2-BLIND-H55`. The pin was the only consumer that moved; the fixture-shape checks in
`test_eval_kb_arms.py` and `test_asked_entity_extraction.py` passed unchanged.

**One thing found in passing, worth its own fix:** `scripts/run_python_tests.py` **exited 0 on the
failing run**. The unittest failure was printed in full, but a caller checking only the exit code
would have read that run as green. Filed on the roadmap.

## 8. Reproducing

The two scratch scripts (metadata listing, row writer, self-check) were not committed — they only
ever printed to a scratch file and wrote the fixture, exactly as batch 1's `list_kb_cards.py` was
handled. The listing is reproducible from `data/kb/*.json` by printing `section_id`, `name`,
`section_type` and the game title and nothing else; the self-check is described in §2.2 above and
is a string comparison over the same metadata.
