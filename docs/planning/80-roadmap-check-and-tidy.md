# Plan 80 — check the roadmap, then make it shorter and easier to use

**Status: IN PROGRESS since 2026-10-03 (Go given; calls locked as D123). Steps 1 to 3 done: findings sheets, the review (assets/plan-80/11-review.md), and the split into the knowledge base and parked-work files. Step 4, the rewrite, next.**

Asked for by the maintainer: check that everything in the roadmap and its long-notes file is true, cut what is not
needed, split the knowledge base and the parked work into their own files, and make sure every item waiting on a
decision or a test links straight to it. Several bookkeeper helpers do the typing so the session stays cheap.

Runs **before** the 0.6.0 release. No other chat edits the roadmap files during it. Nothing is pushed.

## What "done" looks like

1. Every entry is true today, or is marked with what is not known.
2. The roadmap reads easily in plain language. An entry carries only what is needed to understand the bug or the
   feature. The long-notes file carries only what a helper needs to understand the goal.
3. The knowledge base work has its own roadmap file and its own long-notes file. Parked work has one file. The main
   roadmap links to each.
4. Every item waiting on a decision links straight to that decision. Every item needing a test links to its
   evidence, or says plainly that none exists.
5. Both main files are much shorter. First targets: roadmap under 400 lines (738 today), long notes under 1,500
   (2,988 today). Adjust if they prove too tight; do not cut meaning to hit a number.

## The maintainer's calls (2026-10-03)

To be written into the locked decisions file as the next free number at Go.

1. **How deep the check goes.** Each entry is checked against the decisions list, the test documents, the evidence
   files, the changelog and the code. No Deck runs. Anything only the Deck can settle is marked as needing a Deck
   check, with a link to the missing evidence.
2. **Timing.** Before the 0.6.0 release.
3. **Parked work.** One file holds the full entries. It replaces both the roadmap's Shelved section and
   `docs/archive/roadmap-shelved.md`.
4. **Long notes split too.** Knowledge base long notes move with the knowledge base roadmap.
5. **Trimmed text is archived, never deleted.** It goes to the archive folder.
6. **Links.** Fix links in live files only. Archived documents get a one-line warning that links may be stale.
7. **The done section** is renamed for 0.6.0.
8. **An entry that looks already fixed.** Look for proof in the repo that it was checked on the Deck. Proof found:
   it moves to Done with the proof linked. No proof: it moves to Verify, with the fix named and the check owed.
9. **Helpers** are the bookkeeper on Sonnet 5.5 medium. No low-effort helper for now.
10. **One commit per step**, so any step can be undone alone.

## New files

| File | Holds |
|---|---|
| `docs/roadmap-kb.md` | The knowledge base section, moved out of the roadmap |
| `docs/roadmap-kb-details.md` | The knowledge base long notes, moved out of the long-notes file |
| `docs/roadmap-shelved.md` | Every parked item in full |

## The five steps

Reading happens side by side. Writing is one helper per file, so no two helpers ever write the same file.

### Step 1 — check, read-only (ten helpers at once)

Each helper takes one slice, reads the long notes its entries link to, checks each entry, and writes one findings
sheet. **No helper edits a roadmap file in this step.**

| Helper | Slice |
|---|---|
| 1 | Bugs |
| 2 | Features, first half |
| 3 | Features, second half |
| 4 | Verify: bugs |
| 5 | Verify: features |
| 6 | Knowledge base: calls waiting, bugs, Deck checks owed |
| 7 | Knowledge base: Next |
| 8 | Shelved, plus `docs/archive/roadmap-shelved.md` |
| 9 | Long-notes headings that no roadmap entry links to, and the file's own header |
| 10 | Link and tooling list: every link into the two files from live documents, and every script, hook, helper file and code comment that names them |

Findings sheets go in `docs/planning/assets/plan-80/`, one file per helper. For each entry a sheet records:

- the entry's title and where it sits now;
- a verdict: **true**, **stale** (say what changed), **done with proof**, **fixed with no proof**, or **unclear**;
- the proof: an evidence file, a test row, a commit, or the code line it rests on;
- whether a decision is owed, and the direct link to it, or "no decision recorded";
- whether a test is owed, and the link to the evidence, or "no evidence exists";
- a proposed shorter entry, five lines at most, in plain language;
- for its long notes: what must stay for a helper to understand the goal, and what can go to the archive.

A helper that is not sure writes **unclear** and says why. It does not guess.

### Step 2 — review (the one running the session)

Reads the ten findings sheets, not the documents. Spot-checks at least one entry in five against the repo, and every
entry whose status would change. Collects everything marked unclear, and anything else that needs the maintainer,
into one short list and sends it. Work that does not depend on those answers carries on.

### Step 3 — split (two helpers, different files)

- One helper moves the knowledge base section and its long notes into the two new files, word for word.
- One helper builds the parked-work file from the Shelved section and the archived shelved file.
- Then one of them replaces the two moved sections in the roadmap with a link each.

This step changes no wording. It is a move only, so it is easy to check: nothing lost, nothing added.

### Step 4 — rewrite (five helpers, one per file)

Each helper owns one file: the roadmap, the long notes, the knowledge base roadmap, the knowledge base long notes,
the parked-work file. Each applies the reviewed findings for its file: the shorter entries, the status moves, the
decision links, the evidence links. Trimmed text goes to an archive file of its own
(`docs/archive/roadmap-trimmed-2026-10-<file>.md`), so no two helpers share one.

The roadmap's header and house rules are rewritten last by the roadmap's helper: shorter, with the new files named,
and the done section renamed for 0.6.0.

### Step 5 — links and tooling (two helpers, different files)

- Fix every link from helper 10's list that points at a heading that moved or was renamed. Live files only.
- Add one line to each archived document that links to the roadmap: links in this file may be stale.
- Teach the tooling about the new files: the bookkeeper guard, the size check, the docs-split check, the closed-rows
  check, the helper files, the agents guide, the documentation index and the knowledge policies.
- Run the full checks. Remove nothing from history; the findings sheets stay in the assets folder.

## Rules for every helper brief

- State the checkout path. Check the branch first. Never switch branch, stash, or push.
- Stage files by name. Commit only when the brief says so.
- Every status change names its proof. No proof, no change.
- Copy facts from the evidence file's own words.
- Plain language, short sentences, what a person using the plugin would notice.
- A decision link goes to the decision's own heading in the locked decisions file, not to the file's top.
- Every commit follows a clean `python scripts/verify.py --quick`.

## What could go wrong

- **A helper "confirms" what it was told.** Briefs ask for the proof, not for agreement, and step 2 re-checks every
  status change.
- **Links break quietly.** There are 246 links to headings in these two files. Helper 10's list is made before
  anything moves, and step 5 is checked against it.
- **The tooling does not know the new files.** Until step 5 lands, the guard and the size check do not see them.
  Steps 3 to 5 run in one sitting for that reason.
- **A usage limit mid-step.** Each step ends in a commit, and helpers can be resumed by message.

## Who runs the session

The maintainer's choice, made before Go. The helpers are most of the bill under any choice.

These are estimates, not measurements. They use the per-turn costs measured in
[plan 33](33-model-routing.md) (taken on the previous Opus and Fable versions), today's list prices, about 120 turns
for the one running the session, and 19 helper runs of about 60 turns each. Dollars are list-price equivalents; the
account is on a subscription, so they show how fast the usage window fills, not a bill.

| Who runs the session | Its own cost | Words it writes (tokens) | Whole session with helpers | Against Opus medium |
|---|---|---|---|---|
| Opus 5.5 medium | about $10 | about 80,000 | about $75 | — |
| Opus 5.5 high | about $15 | about 90,000 | about $80 | about 7% more |
| Fable 5.1 medium | about $36 (not measured here) | about 110,000 | about $100 | about 35% more |
| Fable 5.1 high | about $48 | about 135,000 | about $115 | about 50% more |

The helpers cost about $65 in every row (range $45 to $90). Recommended: **Opus 5.5 high**. Step 2, the review, is
the one place a wrong finding gets caught, and the extra care costs about $5. Fable adds $25 to $40 for judgment this
work does not need: plan 33 found the one running a session spends its effort reviewing and landing, which Opus does.
