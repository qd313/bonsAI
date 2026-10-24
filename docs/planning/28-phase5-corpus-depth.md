# 28 — Phase 5 corpus depth: deepening the thirteen titles we have

Written 2026-08-29, after the maintainer chose **"deepen the 13 titles we have"** over adding
net-new titles. Plain language on purpose.

## 1. What this is and is not

**Is:** more depth on the existing thirteen titles — the Phase 5 *structured entity volume* and
*strategy sections* locks from 2026-07-30 ([knowledge-base.md](../knowledge-base.md) § Phase 5).

**Is not:** new titles. That stays locked out of Phase 5 and belongs to Phase 8, and the maintainer
did not ask to revisit it.

**Why now:** [D38](../audit/maintainer-decisions-locked.md) is deferred pending more data. More cards
mean more questions can be asked of the corpus, and corpus growth has repeatedly been the thing that
exposes retrieval faults here — the 2026-08-21 handoff records four separate faults that were
invisible until sixteen cards were added, and none of them were found by reading code.

## 2. One gate to note honestly

Phase 5's lock reads: *"**Strict** — no Phase 5 content or ranking work until Phase 4 is implemented
**and** sample-path smoke has passed."*

Phase 4 track 3 is still unimplemented (blocked on the schema v4 bump), so a strict reading says the
gate is shut. Against that: **D27** already accepted Phase 4 shipping in two parts, and tracks 1–2's
on-Deck QA is now effectively complete — `PHASE4-CHIPS-01`'s badge direction passed 2026-08-29 and
its clipping direction was measured the same day, and `PHASE4-CARDS-01`'s run finished 2026-08-22
with only a maintainer call outstanding. **Proceeding on the maintainer's direct instruction to
deepen the corpus**, which is the same authority that set the gate. Recorded rather than assumed.

## 3. Where the depth actually is missing

Measured from `data/kb/strategy_seed.json`, 2026-08-29 — 133 sections across 13 titles:

| Title | total | enemy | item | boss | mechanic | area |
|---|---|---|---|---|---|---|
| Left 4 Dead 2 | 20 | 0 | 0 | 2 | **17** | 1 |
| The Legend of Zelda: Ocarina of Time | 16 | 2 | 3 | 6 | 4 | 0 |
| Deep Rock Galactic: Survivor | 13 | 4 | 3 | 2 | 3 | 1 |
| Grand Theft Auto: San Andreas – DE | 11 | 0 | 0 | 1 | 8 | 2 |
| Fallout 4 | 10 | 0 | 0 | 2 | 7 | 1 |
| Portal 2 | 9 | 0 | 0 | 1 | 7 | 1 |
| Red Dead Redemption 2 | 9 | 0 | 0 | 1 | 7 | 1 |
| The Sims 4 | 9 | 0 | 0 | 0 | 7 | 1 |
| Baldur's Gate 3 | 8 | 0 | 0 | 1 | 6 | 1 |
| Hades | 8 | 0 | 0 | 2 | 5 | 1 |
| Half-Life 2 | 8 | 0 | 0 | 2 | 4 | 2 |
| Cyberpunk 2077 | 7 | 0 | 0 | 1 | 5 | 1 |
| State of Emergency | 5 | 0 | 0 | 1 | 3 | 1 |

**Eleven of thirteen titles have no structured entity cards at all.** Only the two Phase 4 track 2
sample titles do. Section *counts* are already past the Phase 5 bar of "~4–6 per title" — PR2
deepened those — so the gap Phase 5 named is squarely the entity one.

## 4. Two workstreams, and they are very different in cost and risk

### (a) Re-type cards that are already there — no new content

Some cards are filed under the wrong `section_type`. This is the cheapest depth available: no
writing, no sourcing, no trust-tier question, and it fixes a chip problem the roadmap already
records — the pool draws one kind at a time, so Left 4 Dead 2 filing almost everything as `mechanic`
gives it one flavour of chip wording.

Proposed, and deliberately limited to the clear-cut cases:

| Title | Card | now | → | why |
|---|---|---|---|---|
| Left 4 Dead 2 | Hunter, Boomer, Charger, Jockey, Smoker, Spitter | mechanic | **enemy** | Six special infected the survivor fights |
| Left 4 Dead 2 | Bile bomb | mechanic | **item** | A throwable you carry and use |
| Half-Life 2 | Combine soldiers | mechanic | **enemy** | An enemy type |
| Half-Life 2 | Gravity Gun, Rocket-Propelled Grenade Launcher | mechanic | **item** | Weapons you carry |

**Ten cards, no content written.** Left 4 Dead 2 goes from one kind to three.

**Deliberately not re-typed**, because the call is arguable and a wrong one is worse than none:
Cyberpunk's *Sandevistan* / *Kerenzikov* / *Berserk* (installed cyberware — ability or item?);
Portal 2's gels, funnels and plates (level furniture, not carried); Hades' *Starting weapons*
(choosing among them is the mechanic); Half-Life 2's *Antlions and the sand* (the card is about the
sand rule, and the enemy is in the name only); everything in The Sims 4 and State of Emergency,
which Phase 5's own depth profile routes to systems/career and perf/compat rather than entities.

**This is a behaviour change, not a refactor.** It moves chip wording ("How do I deal with X?"
instead of "What should I know about X?"), it feeds the D25 type-recall rescue, and it changes what
the one-kind-at-a-time chip pool interleaves. So it must be measured before and after, and
`PHASE4-CHIPS-01`'s "Left 4 Dead 2 must still return six chips" direction must be re-checked — that
row exists precisely because this title is the lopsided one.

### (b) Author new entity cards — real content work

~3–8 enemy and/or item cards for each eligible title, per the Phase 5 depth profile. Roughly 40–60
cards across nine titles.

Two things to settle before starting, both recorded here rather than assumed:

- **Provenance.** The existing entity cards for DRG Survivor and Ocarina of Time are
  maintainer-authored: `source_url: ""`, `source_license: "bonsAI-maintainer"`, which earns the
  weaker `fallback_no_source` trust tier. Authoring from general knowledge is therefore precedented
  and honest — it just credits nobody and is labelled as such. The alternative is wiki/fandom
  ingest, which Phase 5 explicitly allows "for speed" but which obliges a complete `source_url` /
  `source_license` / ATTRIBUTIONS entry **as each card is added**, no fixing later. Mixing the two
  within a title is fine; leaving a card without either is not, and `publish_corpus.py` refuses it.
- **Whoever writes a card can never write a blind question for it.** That is not a rule someone
  imposed, it is arithmetic: the blind-row method rests on the author never having read the card.
  Every card authored here permanently removes its author from the pool of people who can write its
  eval row. With D37's method now the corpus's main quality instrument, that cost is real and should
  be spent deliberately — ideally by having different sessions author cards and author questions.

## 5. Recommended order

1. **(a) the ten re-types**, measured before and after, with the Left 4 Dead 2 chip-count check.
   Cheap, reversible, and it improves chip variety on the most lopsided title in the corpus.
2. **A first tranche of (b)** — one or two titles authored in full, put in front of the maintainer
   for a quality read before another forty cards are written to the same pattern.
3. The rest of (b), title by title.
4. A corpus point release once the content settles, which is also what Phase 4 track 3 has been
   waiting on.

Not in this plan: chip vector ranking, the second half of Phase 5's internal order. Content first,
per the Phase 5 ship-shape lock.
