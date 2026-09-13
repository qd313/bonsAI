# Do cards shadow each other? Checked all 146 — mostly no, and the real problem is different

Written for whoever picks this up next. It reverses a guess made earlier the same day.

**The claim being tested:** that adding cards made search worse because new cards *shadow*
old ones — in particular that Hades' `Weapon aspects` was stealing the question
*"which weapon is easiest"* from the `Stygian Blade` card, because it has the word
*weapon* in its name and the six weapons do not.

**Result: that claim is wrong.** The evidence is below, and so is what is actually going on.

## The check

For each of the 146 cards, ask the **shipped search** for that card using its own name as the
question, with that card's game running. Then see whether the card comes back first.

Run it with `python scripts/probe_card_name_collisions.py`. Raw output:
`build/card-name-collisions.json`.

This is deliberately not a name-against-name text comparison. A text comparison misses the
interesting cases — State of Emergency's `Causing chaos` outranks `Kaos mode and Revolution
mode` for a question about chaos mode, and those two names have **no letters in common on that
word** (*chaos* vs *Kaos*). The collision lives in the card's body, which only the real search
sees.

## Result

| Outcome | Cards |
|---|---|
| Found itself in **first** place | **140** |
| Found itself in second place | 6 |
| Not found at all | **0** |

**`Stygian Blade` is one of the 140.** Ask for it by name and it comes first, with
`Weapon aspects` nowhere near it. So the shadowing theory does not survive contact with the
data.

### The six that came second

| Game | Card | Beaten by | Does it matter? |
|---|---|---|---|
| State of Emergency | `Rocket launcher` (the weapon) | `Rocket launcher enemies` | **Yes — fix this one.** Two cards, nearly the same name, added four days ago. Someone asking about the weapon gets the enemies card |
| Portal 2 | `Gels` | `Repulsion Gel` | **Yes, mildly.** A card about the whole category, beaten by one member of it. Pre-existing, nobody added it recently |
| Left 4 Dead 2 | `Hunter` | `Playing as the Hunter` | No. Both cards are about the Hunter; either answer is useful |
| Left 4 Dead 2 | `Boomer` | `Playing as the Boomer` | No. Same |
| Left 4 Dead 2 | `The Director` | `Tank` | No. Still second, and nobody types "The Director" |
| Ocarina of Time | `Adult dungeon order` | `Shadow Temple invisible floors` | No. Noise |

So the honest count of real name collisions across the whole corpus is **two**, and only one of
them was introduced by recent work.

## What is actually wrong, then

Go back to the failing question. Hades, *"which weapon is easiest"*.

Before the split, one card was called **Starting weapons** and it compared all of them in one
paragraph — *"the Stygian Blade is the safest thing to learn on… the Shield of Chaos is the most
survivable… the Rail and the Bow reward staying at range"*. That card answered the question,
and the search found it.

The split replaced it with six cards, each describing **one** weapon well. Nothing was left that
**compares** them.

**So the split did not create a collision. It deleted the only card that answered a comparison
question.** The six new cards answer *"tell me about the Spear"*. Nothing now answers
*"which one should I pick"*.

This is worth stating carefully because it is the opposite of the earlier guess: the corpus did
not get noisier, it got a **hole**.

### The same hole was reported independently, before any of this

On the corpus gap sheet the maintainer asked, unprompted and twice, for:

> "Pros and cons of different builds, make cards designed around early game (or even character
> design)" — for **Cyberpunk 2077** and again for **Fallout 4**

and for Red Dead Redemption 2:

> "Give very basic advice for total noobs. Explain this game to someone familiar to GTA but
> not RDR"

Those are the same shape: **compare the options and tell me where to start.** Every card in the
corpus today is about one thing — an enemy, an item, an area. None compares things, and none is
about starting out. The failing Hades question is the first hard evidence that this gap costs
real answers, rather than just being a nice-to-have.

## What to do about it

**Recommended, and cheap:**

1. **Rename State of Emergency's `Rocket launcher enemies`.** Two cards four words apart is a
   genuine mistake made four days ago. Something like `Enemies with rocket launchers` removes
   the clash. This is not fitting the corpus to a test — no eval question is involved.
2. **Write one comparison card per game that needs one**, starting with Hades. Not a
   restoration of the old card — a card that does the job the six cannot: which weapon to
   start with, and why. The maintainer has already asked for this shape twice for other games.

**Deliberately not recommended:**

- **Renaming `Weapon aspects`.** The data says it is not stealing anything. Renaming it would
  have been a fix for a problem that does not exist, aimed at making one test question pass.
- **Rewording `Stygian Blade` to contain the word "easiest".** Same objection, more blatant.

**Still undecided, and the bigger question:** the eval fixture allows exactly one correct card
per question. Several questions now have two or three fair answers, so a better corpus scores
worse. That is written up separately as D40 and is **not** resolved by anything here.

## One eval question should be retired, and the maintainer said so, not the score

`V2-S-SOE-07` asks *"i dont understand what the objectives actually want me to do"* for State of
Emergency. It has no answer in any card and never could — as the maintainer put it, the player
"would need to press start and read the objective."

**Recorded carefully because the order matters:** this row was seen to fail *before* the
maintainer judged it. The judgement stands on its own merits — no card answers it, so it
measures nothing — but it is a **holdout** row, and retiring a holdout row after watching it
fail is exactly the move that turns a ship gate into a mirror. It is therefore left in place
here and flagged for a deliberate decision, not quietly deleted.

---

## Follow-up the same day: both fixes made, and the trial proved something sharper

**1. State of Emergency rename.** `Rocket launcher enemies` → **`Late-round rocket enemies`**,
matching the maintainer's own words (*"any late-round enemy with a rocket launcher"*). The clash
with the `Rocket launcher` weapon card beside it is gone.

**2. The comparison card exists, and it works.** Hades gained **`Weapon choice`** — not the old
card restored, but a card doing the job the six per-weapon cards cannot: which one to start with
and why. Asked *"which weapon is easiest"*, retrieval now returns:

| Position | Card |
|---|---|
| 1 | **Weapon choice** |
| 2 | Weapon aspects |
| 3 | Shield of Chaos |

**The right card is now first. The test still marks it wrong**, because the expected answer is
recorded as `Stygian Blade`.

**That single row is the clearest evidence yet for D40.** Retrieval returns the ideal answer to
the question and scores zero, purely because the fixture allows one right answer and names a
different one. No argument makes the case better than this does.

**It has deliberately not been repointed.** The row sits on `tune`, so repointing would be
allowed — but it was seen to fail first, and it is worth more as evidence than as a passing
test. Whoever settles D40 should look at this row before anything else.

### A second thing worth keeping

`V2-S-RDR2-02` (*"horse keeps dying"*, Red Dead Redemption 2) **fixed itself.** It regressed when
the corpus grew to 146 cards, and returned to first place at 147 — with no Red Dead card touched
at any point. It was collateral from corpus-wide word weighting all along, exactly as suspected.

**The lesson is about method, not Red Dead:** a single case moving at this corpus size is noise,
and chasing one would have meant "fixing" something that was going to correct itself. Judge on
the aggregate and on cases that fail *for a reason you can name*.

### Aggregate effect of the two new cards

Nothing moved. Tune keyword first-place 63.1% → 63.7%; the shipped `rrf` arm unchanged at 66.1%
first / 89.9% top-three; holdout identical across all four arms. The cards fill a hole without
costing anything measurable.

Second run of the day: `kb-embed-bakeoff-2026-08-31b-arms.md`.

---

## The rest of the batch: 14 more cards, and what they cost

Corpus 147 → **161 sections**. Five sourced from wikis already used here, nine written by hand.
Report: `kb-embed-bakeoff-2026-08-31c-arms.md`.

| Game | Card | Where it came from |
|---|---|---|
| Cyberpunk 2077 | Cyberpsychos | `cyberpunk.fandom.com/wiki/Cyberpsychosis`, CC-BY-SA-3.0 |
| Cyberpunk 2077 | Ripperdocs | `cyberpunk.fandom.com/wiki/Ripperdoc`, CC-BY-SA-3.0 |
| Cyberpunk 2077 | Quickhacks | `cyberpunk.fandom.com/wiki/Cyberpunk_2077_Quickhacks`, CC-BY-SA-3.0 |
| Cyberpunk 2077 | Iconic weapons | written by hand — no wiki page exists |
| Cyberpunk 2077 | **Choosing a build** | written by hand — the comparison card |
| Fallout 4 | Feral ghouls | `fallout.fandom.com/wiki/Feral_ghoul_(Fallout_4)`, CC-BY-SA-3.0 |
| Fallout 4 | Stimpaks and chems | `fallout.fandom.com/wiki/Stimpak_(Fallout_4)`, CC-BY-SA-3.0 |
| Fallout 4 | Legendary enemies | written by hand — the wiki page is only a redirect |
| Fallout 4 | **Choosing a build** | written by hand — the comparison card |
| Red Dead Redemption 2 | Legendary animals, Tonics and provisions, Horse breeds, Satchel upgrades | all written by hand |
| Red Dead Redemption 2 | **Coming from GTA** | written by hand — the comparison card, in the maintainer's own framing |

**Red Dead is entirely hand-written on purpose.** Its only wiki snapshot is 2020-02-23 and the
pages for these subjects are stubs — `Legendary_Animals` is 206 bytes, `Horse_Breeds` is 423. That
matches what commit `ac03617` found in August; nothing has changed.

Worth recording for next time: the Fallout page for legendary drops exists, but under
`Fallout 4 legendary weapon effects` — the obvious title is a redirect. Extracting it means
another pass over a 471 MB dump, which is why that card is hand-written today rather than never.

### No new name collisions

The whole-corpus probe re-run at 161 cards: **156 come first, 5 come second, none is missing.**
State of Emergency's clash is gone. The five that remain are the same harmless ones from before —
Portal 2's `Gels`, two Left 4 Dead 2 pairs, `The Director`, and an Ocarina of Time pair.

Notably `Horse breeds` does **not** collide with the existing `Horse bonding`, which was the one
new pair worth worrying about.

### Cost, and one regression that is mine

Four cases regressed against the 147-card run, none improved, and all four still land in the top
three. Two are noise and two are worth naming:

- **`V2-BLINDT-50`, Cyberpunk 2077** — *"which implant suits a melee build"*. Expected `Berserk`,
  which is genuinely the melee operating system and says so. It now returns `Choosing a build`,
  `Sandevistan`, `Adam Smasher`, and **Berserk drops out of the top three entirely**. My new card
  absorbed the word *build*, and the query's three words — implant, melee, build — now sit in
  three different cards. **This is a real loss caused by a card I added.**
- **`V2-S-RDR2-06`** — *"how to get a better horse early"*. Expected `Horse bonding`, now returns
  the new `Horse breeds` first. That is arguably the better answer, so it is D40 again rather than
  a defect.

**Nothing was changed in response.** There is a tempting content argument for editing the
Cyberpunk build card — it covers attributes and never mentions the two operating systems, which
are the biggest build decision in the game, so it is arguably incomplete on its own merits. That
may well be true. **It is deliberately not being done today**, because the observation arrived
attached to a failing test row and the whole point of the last several commits is that a card
edit prompted by a failing row is indistinguishable from rigging. It is recorded here to be
decided cold, by someone who has not just watched that row fail.

### Aggregate

| | 147 cards | 161 cards |
|---|---|---|
| shipped arm, practice set, first place | 66.1% | 65.5% |
| shipped arm, practice set, top three | 89.9% | 88.7% |
| shipped arm, sealed set, first place | 54.3% | 54.3% |
| shipped arm, sealed set, top three | 78.3% | 76.1% |

Two more cases out of 92 on the sealed set, same direction as every card addition so far: a denser
corpus costs first place slowly and top-three slowly. Whether that trade is worth 14 cards
covering four subjects the corpus could not answer at all is a judgement call, not a number, and
it is the maintainer's.
