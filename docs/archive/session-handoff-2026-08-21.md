# Handoff — RAG work, 2026-08-18 to 2026-08-21

Written so the next session starts from what was decided rather than re-deriving it. Plain
language on purpose: the maintainer reads this file.

**Where the authority lives.** Locked calls are in
[maintainer-decisions-locked.md](maintainer-decisions-locked.md) — **D23–D27 all locked
2026-08-21**; nothing on this page is waiting on a maintainer answer. Live status is [../roadmap.md](../roadmap.md). QA steps are
[../testing.md](../testing.md). Where this file disagrees with any of those, they are right —
this one goes stale first.

---

## 1. The one thing to do next

> **DONE 2026-08-22.** Corpus `2026.08.22` (133 cards) is published on both mirrors and installed
> on the maintainer's Deck; the plugin is deployed. The on-Deck QA in §6 has been run — results
> are in [../testing.md](../testing.md). One new bug came out of it:
> [D28](maintainer-decisions-locked.md#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be).

**Publish a new corpus** (D24 — locked, maintainer said yes on 2026-08-21; **done 2026-08-22**).
Kept below as the record of what was done and how.

Two pieces of finished work are sitting behind it, both **library data rather than plugin code**,
so a plugin deploy alone does not carry either:

| In this release | Why it needs one |
|---|---|
| 16 structured cards (Phase 4 track 2) | Card content is corpus data |
| Ocarina of Time AppID fix | The wrong AppID is a row in the corpus |

**Not in it:** Phase 4 track 3, which needs schema v4 — a new column on the tip table. It gets its
own release when its content is written (§5).

**~~The published corpus is currently stale *and* carries a known bug.~~ Fixed 2026-08-22.** Both
mirrors now serve `2026.08.22` (133 cards). Until then Hugging Face served `2026.08.16` — 117
cards, with Ocarina of Time holding Stardew Valley's AppID, so anyone downloading got a Stardew
session inheriting Zelda's cards and Zelda's spoiler fencing. Verified fixed on the Deck:
`KB-APPID-01` passes in full.

**One thing the runbook below does not say, learned in the doing:** publishing and deploying does
**not** update the corpus the Deck actually reads. `build.ps1` ships a fresh *seed* copy, but
retrieval reads the **installed** corpus at `rag_corpus_path` — on this Deck an SD-card directory
— which stayed on `2026.08.16` through both steps. Installing is a third action, and without it
every QA row below silently tests the old corpus.

### Runbook — every prerequisite verified 2026-08-21

`scripts/publish_corpus.py` already exists and does the whole thing. It is a **gate as well as a
push**: it validates the D20 licence rules and manifest self-consistency, and refuses to publish
an NC or GFDL card, an unbaked-embeddings build, or a manifest that disagrees with the files.

```bash
python scripts/build_rag_db.py --seed --out ./build/knowledge-base
python scripts/publish_corpus.py --build-dir build/knowledge-base --check
python scripts/publish_corpus.py --build-dir build/knowledge-base     --hf-clone-dir ../bonsai-knowledge-base --push-hf --push-github
```

`--check` pushes nothing. **It was run against the current build on 2026-08-21 and passed**, so
the gate is not the risk here.

Checked on 2026-08-21, all present:

- `gh` 2.87.3, authenticated as `cantcurecancer`.
- The Hugging Face dataset clone exists at `../bonsai-knowledge-base`, pointing at
  `huggingface.co/datasets/qd313/bonsai-knowledge-base`, working tree clean, last commit
  *Corpus point release 2026.08.16*.
- The build at `build/knowledge-base-p5` (133 sections, 124 tips, schema 3) passes the gate.

**One correction to make in passing:** the push to Hugging Face is a plain `git push` from that
clone — `publish_corpus.py` deliberately does not use `huggingface_hub`, because the corpus is
under 1 MB and nowhere near the LFS threshold. So `HUGGINGFACE_API_KEY` in `.env` is **not read by
the script**. If the push prompts for credentials, that token is the password; do not go looking
for a config that reads it.

Release surface: `CORPUS_HF_NAMESPACE = "qd313/bonsai-knowledge-base"`,
`CORPUS_GITHUB_RELEASE_TAG = "knowledge-base-v1"`
([knowledge_base_schema.py:35](../../py_modules/backend/services/knowledge_base_schema.py)).

**Build to `build/knowledge-base`, not to one of the dated scratch directories.** `build/` holds
several from this week (`-p4`, `-p5`, `-pre-p4`, `-test`, `-embed-bakeoff`) that exist only for
before-and-after comparison; `knowledge-base-test` is rebuilt by the test suite on every run.

**After the publish, deploy the plugin too** (`scripts/build.ps1`, or `./scripts/build.sh dev`) —
the corpus carries the cards and the AppID fix, and the plugin carries everything else. Then the
on-Deck QA rows in §6 become runnable for the first time.

**Sequencing is settled (D24, 2026-08-21): publish now, do not wait for schema v4.** Track 3 gets
its own release later.

**The fact that settled it, recorded with a date because it expires: as of 2026-08-21 there are no
users.** Nothing is installed in the field, so the no-migration cost of **Decision 6** is currently
zero and a second corpus release costs nothing either. Several cautions in this repo — the
no-migration rule, the stale-corpus warning, the reluctance to bump the schema — are priced for a
world where users exist. Keep the rules; stop paying the caution premium until there is somebody to
pay it for. The first real user makes all of it real again.

---

## 2. What shipped, 2026-08-18 to 2026-08-21

Sixteen commits. Every change measured before and after; two planned changes were **removed**
after measurement rather than shipped for symmetry.

| Commit | What |
|---|---|
| `bf16b35` | The vector half of search got its own recall pass — it had only been re-ordering keyword results |
| `93bf100` | Expert mode moved onto the explicit retrieval route (it had been the *strictest* mode) |
| `d1601d4` | Eval harness re-aligned with the shipped pipeline |
| `3dd4c2e` | A matched troubleshooting topic now opens a recall path and acts as a preference (**D22**) |
| `543c4ad` | The corpus is reachable when the question names the game (**D19**) |
| `8ab6144` | British spelling reaches US-spelled cards; a card is reachable by its kind |
| `237dc0d` | Phase 4 track 1 — a corpus chip is guaranteed, game chips preferred, **Tip** badge |
| `5d0af46` | Phase 4 track 2 reply shape; track 3 written up as blocked |
| `c1a217d` | Phase 4 track 2 content — 16 structured cards |
| `32685e5` | Type recall narrowed to a rescue, not a ranking |
| `a70c592` | Chip pool draws one kind at a time |
| `0d577d0` | Eval harness: the model sweep could not run at all |
| `2a217cd` | Eval harness: tips were scored against strategy cards' vectors |
| `4a479b1` | Ocarina of Time stops borrowing Stardew Valley's AppID |

Suites on the last run: **792 Python, 568 vitest, `tsc` clean, `npm run build` clean.**

### The pattern worth carrying forward

**Four separate faults were invisible until the library grew**, and all four were surfaced by
adding sixteen cards, not by reading code:

1. Search preferred an arbitrary slice of boss cards over a real keyword match — visible only
   once Ocarina of Time had more boss cards than the recall cap.
2. The chip pool flooded with one kind — visible only once one kind outnumbered the others.
3. The eval harness collided two ID namespaces — the collision rate rose with the corpus.
4. A borrowed AppID handed one game's cards to another — eight cards worse than it had been.

Treat corpus growth as a test of the machinery. Phase 8's thousand titles will find more.

---

## 3. Where the numbers stand

**Corrected 2026-08-21** (`2a217cd`). Every vector-using figure published before that date is
understated; prior reports carry a correction banner and must not be quoted.

> **SUPERSEDED 2026-08-22 by the D23 fold-in.** The table below is the last measurement on the
> **old** fixture set and is kept only as that record. The approved set now has 15 more rows, so
> these numbers and the current ones are not comparable (R4). **Current baseline, and what
> changed, are on [D23](maintainer-decisions-locked.md#d23--where-do-the-paraphrase-questions-go)**
> — headline: labelled tune fusion 94.1% → **91.5%** (the set got harder, as intended), holdout
> **unchanged** at 83.3% (so D23 did not achieve what it was for), troubleshooting 72.5% →
> **75.0%** (that slice got *easier*, which is not an improvement).

Last old-set measurement, on the 133-card corpus, `nomic-embed-text`, same corpus for every arm:

| Slice | keyword | vector only | fusion (ships) |
|---|---|---|---|
| Labelled tune, top-3 | 88.2% | 93.1% | **94.1%** |
| Labelled holdout, top-3 | 83.3% | 83.3% | **83.3%** |
| Troubleshooting tips, top-3 | 65.0% | 67.5% | **72.5%** |

Report: [../archive/research/kb-embed-bakeoff-2026-08-21-arms.md](../archive/research/kb-embed-bakeoff-2026-08-21-arms.md).

**The holdout half still cannot separate the arms** (n=36, identical either way). That is the
honest locked answer and the correction did not change it. **D23** is the work that should.

---

## 4. Locked this session — do not re-litigate

- **D23 — fold the paraphrase questions into the approved set.** Expect the totals to *drop*;
  that is the point. The 2026-08-21 report becomes the last one measured on the old set, and old
  and new numbers are not comparable afterwards (R4). The split has to be assigned for the new
  rows *before* anything is tuned on them (R1), or the ship gate is contaminated on arrival.
- **D24 — publish a new corpus, now, without waiting for schema v4.** See §1.
- **D25 — the type/"the boss" fix stays in its light form.** Query-time recall, no schema change,
  reaches an already-installed corpus. The heavier FTS-indexed version is not wanted.
- **D26 — the thirteen re-keyed eval rows are endorsed.** The standard it sets is the part worth
  keeping: an approved fixture may be edited when the edit is *shown* not to move any score, and
  the showing comes before the ask. An edit that does move a score goes back to the maintainer
  with the movement quantified.
- **D27 — Phase 4 ships in two parts.** Tracks 1–2 are in `CHANGELOG.md` under `[Unreleased]` as
  of 2026-08-21; track 3 gets its own entry when it lands.

Full reasoning for each in [maintainer-decisions-locked.md](maintainer-decisions-locked.md).

---

## 5. Track 3's content problem

Not a blocker for the release, but the next thing to solve on track 3, and it is a *content*
problem rather than a code one — the retrieval half is already built.

The maintainer knows two Deck launch options, both confirmed verbatim on 2026-08-21: Fallout 4
`moshortcut://"F4SE"` (F4SE through Mod Organizer 2) and GTA: San Andreas – DE `%command% -dx12`
(symptom unknown — write the card without one rather than inventing it).

**Neither title is a sample title**, and the question that produced them was too narrow. Both
points, with the recommended fix — move the sample titles to the two games there is real
knowledge about — are in
[../planning/18-phase4-track3-per-game-compat-tips.md](../planning/18-phase4-track3-per-game-compat-tips.md).
The short version for the next session: **ask what is annoying about playing each title on a
Deck, not what is configured.**

---

## 6. Open, not blocked

- **On-device QA.** Nothing from this week has been on a Deck. Every QA row written for it is
  Open: `PHASE4-CARDS-01`, `PHASE4-CHIPS-01`, `KB-APPID-01`, plus the amendments to `KB-TYPE-01`,
  `KB-ROUTER-02`, `KB-NEWTITLE-01`, `KB-SPELLING-01`. Several **cannot be run from the screen** —
  the details panel prints no card count — so they need `scripts/probe_deck_kb_retrieval.py`
  over SSH.
- **Phase 5 is gated on Phase 4 passing on the Deck.** Maintainer's own gate; a good one.
- ~~**A2 / D23 is not implemented yet**~~ — **done 2026-08-22.** The fifteen rows are folded into
  `kb_eval_v2.json` as `V2-PARA-*`, all `tune`, and the arms run reads them. See
  [D23](maintainer-decisions-locked.md#d23--where-do-the-paraphrase-questions-go) for the new
  baseline. **It did not fix the holdout** — that still needs rows written blind.
- Two small bugs: the details panel says *"Running game could not be matched"* when no game is
  running, and two different decisions are both filed as **D19** — **fixed 2026-08-28**: the
  corpus-licence decision is renumbered **D19b** (see
  [D31](maintainer-decisions-locked.md#d31--which-of-the-two-d19s-keeps-the-number)); the live
  *"Can you reach the strategy corpus without the game running?"* decision keeps **D19**.

---

## 7. Reproducing the measurements

```bash
python scripts/build_rag_db.py --seed --out ./build/knowledge-base-test   # 133 sections
python scripts/eval_kb_embed_models.py --arms-only --write-report          # arms only
python scripts/eval_kb_embed_models.py --write-report                      # + model sweep
npm test && npm run test:py && npx tsc --noEmit && npm run build
```

Needs a local Ollama with `nomic-embed-text` pulled. The test suite rebuilds
`build/knowledge-base-test` from the seed on every run, so a stale corpus cannot silently
survive a seed edit.
