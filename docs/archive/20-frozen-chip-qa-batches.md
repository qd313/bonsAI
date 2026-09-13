# 20 — Frozen-chip QA batches for the 2026-08-23 parallel bug session

Test plan for the ten bugs fixed on 2026-08-23 by five parallel worktrees. **Two batches of six
frozen test chips**, grouped by which game is running. Written 2026-08-23; the question wording in
§ 3 and § 4 is **agreed with the maintainer and must not be reworded** — several of these questions
are the exact strings a measurement was taken against, and changing a word changes what is under
test without saying so.

**One sentence:** pin six exact questions, run them on Deep Rock Galactic: Survivor, clear, pin six
more, run them on a story game, and record which of the seven code-only fixes actually hold on
hardware.

Sources: [roadmap.md](../roadmap.md) § Bugs, [testing.md](../testing.md) rows
**DESTRUCT-ADVICE-01**, **SPOILER-DPAD-01**, **REPLY-ARCHIVED-01**, **KB-COVERAGE-NOAPP-01**,
**CONTEXT-LADDER-01…03**; decisions **D25** and **D28** in
[maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md); frozen chip feature
shipped in `b278f7b`.

---

## 1. Why this needs a plan rather than a list

Ten bugs got a code fix on 2026-08-23. **Three are fully closed. Seven are proven only at a desk**
— by unit tests, by rendering a component and inspecting it, or by reading the code path. None of
the seven has been near a Steam Deck, and the failures they address are all failures of navigation,
layout, or what the search returns, which is the category that only shows up on hardware.

The standing rule (CLAUDE.md § Testing on the Deck) is that exact QA questions get pinned as frozen
chips rather than thumb-typed, because a single mistyped word changes what is under test. That
capability exists now. The constraint it comes with:

| Limit | Value | Where |
|---|---|---|
| Chips per batch | **12** max, **3** min | `MAX_FROZEN_TEST_CHIPS`, [settings_service.py:180](../../py_modules/backend/services/settings_service.py) |
| Characters per chip | **160**, silently truncated | `FROZEN_TEST_CHIP_MAX_LEN`, [settings_service.py:181](../../py_modules/backend/services/settings_service.py) |
| Mirror | `MAX_FROZEN_TEST_CHIPS` / `FROZEN_TEST_CHIP_MAX_LEN` | [bonsaiSettingsSchema.ts:246-248](../../src/data/bonsaiSettingsSchema.ts) |

Twelve would fit in one batch, but the maintainer's call 2026-08-23 was **two batches of six,
grouped by game**, so a run is one title at a time rather than a title swap mid-batch.

### 1.1 Two things a batch does to the app while it is active

Both are by design, both will invalidate a QA run if forgotten:

- **Session RAG chips are suppressed** while a batch is pinned
  ([DeveloperTab.tsx:474-478](../../src/components/DeveloperTab.tsx)). Any corpus-chip row
  **cannot pass** until the batch is cleared. Do not attempt those rows during either batch.
- **The carousel stops reseeding.** That is the point — the chips stay put in order — but it means
  the carousel is not in its normal state, so do not judge normal carousel behaviour from a run.

### 1.2 Before you pin anything — turn the trace on

**`Verbose Ask logging to Desktop notes` (Developer tab) must be ON before the run starts. It
defaults OFF** (`desktop_ask_verbose_logging`,
[settings_service.py:339](../../py_modules/backend/services/settings_service.py)). Switching it on
afterwards does not recover the run — the trace is written as each Ask happens, so a batch run
without it produces results that cannot be checked and has to be done again.

### 1.3 Read the trace, not the panel — this is the method for every card and fence row

**Corrected 2026-08-23 by the Batch A run, which made this mistake before catching it.** An earlier
version of this plan asked for *which cards attached* without saying where to read that. It is not
readable on the device:

- *Show details* gives the retrieval mode, a trust tier and a corpus section count. **It never
  names a card.**
- `Trust tier: fallback_no_source` is a **tier**, not a count. The generic genre fallback and a
  real game card look identical there. Batch A read one chip as "no cards attached" on that basis,
  which was wrong.

The answer is already on the Deck:

```
~/Desktop/bonsAI_logs/bonsai-ask-trace-<date>.md
```

Each entry carries the verbatim `--- Local knowledge base ---` block from the built prompt, one
`[Title / kind: Card] (trust: tier)` header per attached card, the resolved asked-entity line, and
**the raw model output before any UI processing**.

That last part matters beyond counting cards: it separates *what the model wrote* from *what the
display rendered*, which is the only way to tell a prompt bug from a rendering bug. Three separate
findings in the Batch A run were settled by that distinction alone. Use the trace for **every card
row, every fence row, and anything where the screen looks wrong** — not just the four search
phrases.

### 1.2 How a batch gets pinned — and the gap

The Developer tab **shows** the pinned list and offers **Clear frozen test chips**, but has no
control to add one; its own help text says *"Set the list from the host while preparing a run."*
So pinning is a host-side write of `dev_frozen_test_chips` into
`~/homebrew/settings/bonsAI/settings.json`, or a `save_settings` call.

**There is no script for this.** `scripts/` has nothing that writes a chip batch — grep for
`frozen` finds only the corpus guard and the publisher. Writing one is a natural companion to this
plan and is not blocked by anything, but it is not a precondition: a host-side edit works today.
Clearing is easier than pinning — the Developer tab button does it on device.

Filed 2026-08-23 as **Pin a frozen chip batch from the host**, Platform / upstream lane in
[roadmap.md](../roadmap.md), with the two candidate routes and the limits it has to enforce.

---

## 2. What each batch is for

| Batch | Game | Covers |
|---|---|---|
| **A** | Deep Rock Galactic: Survivor | The search cutoff re-measure obliged by **D28**, and the spoiler fence's *when* half. Plus, free of charge, four navigation checks that need nothing but a finished reply. |
| **B** | A story game (Ocarina of Time or Fallout), plus two questions asked with nothing running | The spoiler block's D-pad reachability, the destructive-advice guard, the no-game-running label, and the session turn count. |

---

## 3. Batch A — Deep Rock Galactic: Survivor

```json
"dev_frozen_test_chips": [
  "one sentence",
  "please repeat that",
  "thank you very much",
  "what time is it",
  "how do i deal with the exploders",
  "how do i beat the twins"
]
```

**All six are verbatim.** The first four are the exact phrases the 2026-08-22 on-Deck pass measured
and the ones **D28** obliges re-measuring; the last two are the exact phrases the spoiler trace
resolved against.

| # | Question | Expected | If it differs |
|---|---|---|---|
| 1 | `one sentence` | **No cards.** Scored 0.5034, below the new 0.515 floor. | Cards still attaching means the floor is not doing what the desk measurement said. Read the card names from the trace (§ 1.3) — the panel cannot tell a real card from the genre fallback. |
| 2 | `please repeat that` | **One card** (Glyphid Dreadnought, 0.5308). Was three. | Three cards means no change took effect — check the build actually deployed. |
| 3 | `thank you very much` | **Still attaches** (Nitra). | **This is a pass, not a failure.** It comes from the keyword half, which **D25** and **D28** both put off limits. |
| 4 | `what time is it` | **Still attaches** (three cards). | Same — expected, keyword half. |
| 5 | `how do i deal with the exploders` | Answers **in plain text**, no spoiler block. | A fence here means the fix missed. Record the reply verbatim and whether *Show details* names the Exploder card. |
| 6 | `how do i beat the twins` | Answers in plain text. Never fenced before. | A fence here is a **regression** caused by the fix, which is more serious than #5 failing. |

**Swap available:** `what is red sugar for` in place of #6 if an item card is a more useful control
than a boss card. Both were clean before the fix. Do not run both — that costs a chip slot the
cutoff re-measure needs more.

### 3.1 Four checks that ride along, no extra chips

Ask any of the six, then:

- **Thumbs and Retry row** (**REPLY-ARCHIVED-01**) — the *Was this helpful?* row, **Retry** and the
  refinement chips must appear under a **normal completed** Ask. Before the fix they appeared only
  via a reopen path that was itself a bug.
- **Focus on plain text** — walk the D-pad down through a finished reply. It must not park on
  prose (*"Here's the lowdown:"*) or on the raw block under *Full transparency snapshot*.
- **Chip strip backwards** (**CONTEXT-LADDER-01**) — reach the last chip, then walk back. Also
  press **Up** from *Show diagnostics* and from the session context strip; both had no rule before
  and skipped the carousel entirely.
- **The blank question** — ask any of the six, then **close and reopen the panel while it is still
  thinking**. The question must come back above the reply, not `…`.

  **No chip can trigger this one.** It is a timing action, not a question. It is also the check
  most likely to be skipped by accident, so do it first while you remember.

  Watch for the **duplicate-question** follow-on at the same time. That symptom is *not* resolved —
  the archiving path was ruled out as its cause, but whether it shares a root cause with the blank
  caption is unknown and needs exactly this run to answer.

---

## 4. Batch B — a story game, plus two with nothing running

Clear batch A first (Developer tab → **Clear frozen test chips**), then pin:

```json
"dev_frozen_test_chips": [
  "what happens at the end of the main story",
  "my saves wont load after a mod update what should i delete",
  "my proton prefix is broken how do i start fresh",
  "how do i install a mod safely",
  "what should i do next",
  "is there anything nearby worth checking"
]
```

| # | Question | Expected | Notes |
|---|---|---|---|
| 1 | `what happens at the end of the main story` | **Should fence.** That is the point. | It exists to *produce* a spoiler block, so there is something to try reaching. |
| 2 | `my saves wont load after a mod update what should i delete` | Safety notice appended under the reply. | |
| 3 | `my proton prefix is broken how do i start fresh` | Safety notice appended. | Second attempt at the same thing, different wording. |
| 4 | `how do i install a mod safely` | **No notice.** | The answer will likely mention backing up, which is the case the guard must not fire on. |
| 5 | `what should i do next` | Ask **twice** — once on the story game, once with **nothing running**. | With nothing running, *Show details* must say **no game is running**, not that a game could not be matched. |
| 6 | `is there anything nearby worth checking` | Ordinary reply. | Exists to make a third turn. |

### 4.1 The spoiler block, by D-pad (**SPOILER-DPAD-01**)

Ask #1, wait for the fence, then try to reach it with the D-pad alone. **Do not touch the
screen** — touching it is what made this look fixed before.

**Confirm from the trace (§ 1.3) that the model actually emitted a fence before judging the
D-pad.** Batch A found a case where the model wrote a valid fence and the display dropped it
entirely — if that happens here, there is nothing on screen to reach and the navigation is not what
failed.

This regressed once already after being marked verified on 2026-08-04, which is why the roadmap
entry says the *recurrence* is the bug. The 2026-08-23 fix removed a real structural defect — the
markdown renderer was nesting the clickable control inside a `<pre>`, a scroll and formatting
context it was never designed to sit in — and a test now asserts that nesting cannot return. But
**that was proven by rendering, not by a controller**, and the fix is explicitly *not* claimed to
be the sole cause.

### 4.2 The destructive-advice guard (**DESTRUCT-ADVICE-01**)

Two positives (#2, #3) and one negative (#4), because a guard that fires on innocent replies gets
switched off, which is the same as not having one.

**Read the reply before recording a failure — from the trace (§ 1.3), not the screen.** If no
notice appears on #2 or #3, check whether the model actually told you to delete anything. If it did
not, **the question missed, not the guard**. That is why there are two attempts at it. The trace
also shows the raw output before the display touched it, which separates "the guard never fired"
from "the guard fired and the notice did not render".

**Record which model you ran.** The check is tuned against plausible phrasing, not against phrasing
pulled from a live model, so a miss is a wording gap in the check rather than a wiring failure —
and the fix for those two things is different.

**Known and accepted limitation:** with token streaming on, the risky line is already on screen
before the notice is appended beneath it. Accepted by the maintainer 2026-08-23 — the app and repo
already tell the user to double-check AI answers, so a late flag beats no flag.

**Run both with streaming on and off, but expect this to shrink.** The maintainer's direction is
that streaming becomes the default and the setting is removed once the streaming bugs are fixed
(see *Make token streaming the default and drop the setting*, Ask / reply backlog). When that
lands, the streaming-off half of this row stops existing.

### 4.3 The session turn count

**Blocked — do not run this section yet.** Batch A found that the session context counts the newest
turn **twice**, so this section would read four turns for three questions and the result would mean
nothing either way. Fix that first; § 4a records it.

Ask #1, #5 and #6 back to back in **one** chat, waiting for each answer. The session panel must
say **three turns**, with a row per question — not one.

Then close and reopen, or switch chats and back, and check the count still holds. That second half
is the part that matters: the backend now saves a small snapshot with each answer, and the whole
point is that the older turns survive, which the frontend-only shortcut could never achieve.

### 4.4 The no-game-running label (**KB-COVERAGE-NOAPP-01**)

Ask #5 with every game closed. *Show details* must read **no game running**. Then launch a game
with no corpus coverage and ask the same question — it must read **none for this game**. The two
must look different; before the fix they were the same string, which is what made the panel claim
a match had failed when nothing was running.

---

## 4a. Run log — Batch A, 2026-08-23 (closed)

Pinned by writing `dev_frozen_test_chips` directly into
`~/homebrew/settings/bonsAI/settings.json` over SSH, replacing a stale seven-chip mix left from an
earlier session. All six chips from § 3 landed verbatim.

**The batch was unpinned at the end of the session** — `dev_frozen_test_chips` is back to `[]`, so
session RAG chips and normal carousel reseeding are live again and corpus-chip rows are unblocked
(§ 1.1). If the chips still appear on device, the plugin is holding its in-memory copy; the
Developer tab's **Clear frozen test chips** button settles it.

**All six chips ran and the card results are complete.** The navigation checks in § 3.1 are the
part that did not survive, and the spoiler result is a wash rather than a pass.

### Read the trace, not the panel

§ 6 asks for **which cards attached**, not just whether any did. **The device UI cannot answer
that** — *Show details* gives retrieval mode, a trust tier and a corpus section count, and never
names a card. Worse, `Trust tier: fallback_no_source` is a *tier*, not a count, so the genre
fallback and a real game card look identical there. Reading that chip as "no cards" is a mistake
this run actually made before the trace corrected it.

The answer is on the Deck already, provided `desktop_ask_verbose_logging` is on:

```
~/Desktop/bonsAI_logs/bonsai-ask-trace-<date>.md
```

Each entry carries the verbatim `--- Local knowledge base ---` block from the built prompt, one
`[Title / kind: Card] (trust: tier)` header per attached card, the resolved asked-entity line, and
the raw model output before any UI processing. **Use it for every card-attachment and fence row
from now on** — it is the only place the two can be told apart, and it also separates "the model
wrote this" from "the UI rendered this", which settled three separate findings in this run.

### § 3 — the six chips

| # | Question | Result |
|---|---|---|
| 1 | `one sentence` | **PASS.** `Genre/compat fallback` only — no game card. Reproduced on three runs. |
| 2 | `please repeat that` | **PASS.** `boss: Glyphid Dreadnought` only. Was three cards before the floor change. |
| 3 | `thank you very much` | **PASS** (expected to attach). `item: Nitra`. Keyword half, off limits per D25/D28. |
| 4 | `what time is it` | **PASS** (expected to attach). `boss: Glyphid Dreadnought`, `enemy: Praetorian`, `mechanic: Classes` — all three, as predicted. |
| 5 | `how do i deal with the exploders` | **PASS.** Plain text, **no fence**. The trace shows the fix working rather than a lucky generation: the entity resolved to `Exploder`, the low-risk arm carried its new no-fencing instruction, and the raw model output contains no fence. Cards: `Exploder`, `Acid Spitter`, `Mactera`. |
| 6 | `how do i beat the twins` | **FAIL — the regression § 3 named as *more serious than #5 failing*.** Fenced **mid-reply**, having been clean on 2026-08-22. Retrieval was fine (`Dreadnought Twins` ranked first). Ran four times total: **fenced every time**, same entity every time. |

**D28's re-measure obligation is discharged.** The device reproduced the desk table card for card,
including the two phrases that are supposed to keep attaching.

**The spoiler fix is a wash, not a pass.** #5 stopped fencing and #6 started, so the net fence rate
on this title is unchanged. The "when" half stays **open**.

**What #6 established, and what was done about it.** Four consecutive runs with the identical
entity `"twins"` ruled out the turn-to-turn variance this false positive was previously filed
under. The trace showed why the two questions differ: *exploders* resolved to the card title
`Exploder`, while *twins* resolved to the bare word — `_match_known_entity` needed the **whole**
card title, and *"twins"* is only a suffix of `Dreadnought Twins`. Fixed the same day with a
head-noun fallback that returns the card's full title, guarded so generic heads like `boss` reach
nothing. **Not yet shown to stop the fence** — re-run the same four after deploying. If it still
fences with the entity naming the card, the cause is prompt wording, which is the last hypothesis
standing.

### § 3.1 — the four ride-along checks

| Check | Result |
|---|---|
| The blank question | **FAIL, and the failure moved.** The caption survived the reopen and stayed correct for the whole thinking phase — the `pending`-branch backfill working on hardware for the first time — then reverted to `…` the moment thinking finished. The unguarded write at `useBonsaiAskOrchestration.ts:1312` is the prime suspect and is **not proven**. |
| Duplicate question | **Not observed.** One clean turn. Not a close — it was always intermittent. |
| Thumbs and Retry row | **PASS.** The full row renders under a normal completed Ask with no reopen trick. **REPLY-ARCHIVED-01**'s primary claim is closed on hardware; its rating, Retry and older-turn sub-checks are still owed. |
| Chip strip backwards | **BLOCKED — new bug.** D-pad focus trapped inside the expanded **Session context** panel, nothing above it reachable. Two independent causes, both fixed 2026-08-23, neither confirmed on device. |
| Focus on plain text | **Not run** — same block. |

### Filed from this run

Seven bugs, all in [roadmap.md](../roadmap.md) § Bugs:

| Bug | State |
|---|---|
| D-pad focus trapped in the expanded Session context panel | Fixed same day, **unconfirmed on device** |
| Shortened card names never resolved (`twins` → `Dreadnought Twins`) | Fixed same day, **unconfirmed on device** |
| Active chip in *Show details* is unidentifiable — no ring on the chip, only a 10px grey pager | OPEN |
| Clear cache leaves the saved chat on disk | OPEN — needs [D32](../audit/maintainer-decisions-locked.md) first |
| Session context counts the newest turn twice (n+1) | OPEN — **fix before Batch B** |
| Strategy branch picker never renders though the model emits a valid fence | OPEN |
| A rendered reply breaks a line mid-sentence (`BOOM` / `. The trick`) | OPEN, cosmetic |

The turn-count bug appeared in every recording: 1 question → "2 turns", 2 → "3 turns", 3 → "4 turns".

One UI removal, same day: the **"Context used · view in session context ↓"** link under archived
turns is gone at the maintainer's call. It was added in `98434b0` with the transparency work as a
shortcut that pre-selected a row in the Session context panel a few rows below — a panel that
already lists every turn by its own question text. It cost two lines of the 300px column
mid-transcript and no capability was lost.

### Where the next session picks up

1. **Deploy first.** Three fixes are built but have never run on device: the focus trap, the
   head-noun entity resolution, and the link removal. Everything below assumes they are on.
2. **Re-run `how do i beat the twins` four times.** Decides extractor vs prompt wording — the one
   open question on the spoiler work.
3. **Re-run the § 3.1 navigation checks**, which the focus trap blocked.
4. **Fix the turn-count duplicate before Batch B**, or § 4.3 tests the wrong thing — it will read
   four turns for three questions.
5. **Batch B needs its own pinning run.** Its six chips (§ 4) were never pinned; the batch is
   entirely untouched.

The **card** results above are settled and need no re-running. The **fence** and **navigation**
results do.

---

## 4b. Run log — Batch B, 2026-08-27

Pinned the six § 4 chips by writing `dev_frozen_test_chips` into
`~/homebrew/settings/bonsAI/settings.json` over SSH, as Batch A did. All six landed verbatim and
badged **TEST**. The batch was **cleared at the end of the session** — `dev_frozen_test_chips` is
back to `[]` and the loader restarted, so corpus-chip rows are unblocked again.

**§ 4.1 spoiler block by D-pad — PASSES.** Ran on a fresh Strategy reply that produced a masked
fence (confirmed on screen before judging navigation, as this section requires). Three presses from
**ask**: question echo → **the fence takes the ring**. Then the residue press this row still owed:
**B over the masked fence did not reveal it** — masked stayed 1, revealed stayed 0. `SPOILER-DPAD-01`
is now Verified. One Down press is absorbed on the fence before the walk continues; that is the
offered-once diversion and is cosmetic.

**§ 4.2 destructive-advice guard — FAILS on #3, and the other two are uninformative.** #3
*"my proton prefix is broken how do i start fresh"* produced real destructive advice — *"Try deleting
the existing prefix folder"* plus a branch button *"Delete and Rebuild the prefix"* — and **no notice**
in the trace's Final UI text. #2 ran twice and the model refused to name anything to delete, which is
the "question missed, not the guard" case this section has two positives for. #4 produced no notice as
expected, but the model deflected without advising anything, so it does not exercise the guard.
Model: `gemma4:e2b-it-qat`. Streaming **on**; the streaming-off half was not run. Filed on the roadmap.

**§ 4.3 session turn count — first half PASSES, second half FAILS.** Three questions back to back gave
**Session context (3 turns)** with one row each, which is what this section was blocked on. But after
closing and reopening the QAM the strip read **(1 turn)**. The saved chat on disk still holds all three
turns with their per-turn transparency, and the single rendered turn is tagged `live` with no archived
rows — so the backend half is sound and the frontend never reloads the slot on a QAM reopen. Filed.

**§ 4.4 no-game-running label — first half PASSES.** With nothing running, *Show details* read
**`KB: no game running`**. The second half needs a game with no corpus coverage launched, which the rig
must not do.

### The trap that nearly produced a phantom bug — read this before filing a logging failure

Mid-run the Desktop ask trace appeared to **stop being written**: four Asks completed, the settings
still read `desktop_ask_verbose_logging: true`, and `bonsai-ask-trace-2026-08-27.md` had not been
touched for ten minutes. It survived a clean `plugin_loader` restart, which made it look like a real
defect rather than a side effect of editing `settings.json` under a running plugin.

It was neither. **The Desktop log filenames use the UTC date while the Deck clock shows local time.**
At 20:00 EDT the date rolled over in UTC and every subsequent Ask went to
`bonsai-ask-trace-2026-08-**28**.md`. Any evening session on a US timezone will hit this. Check for
tomorrow's file before concluding that logging stopped.

---

## 5. What neither batch covers

| Not covered | Why | Where it goes instead |
|---|---|---|
| The mid-reply spoiler fence **placement** | **Where** it lands is untouched and is about how a reply is segmented. (The *when* half was expected to be fixed when this was written; § 4a found it is a wash — both halves are open.) | Still OPEN in the roadmap under the spoiler fence entry. Batch A #6 produced a mid-reply fence, so there is now a device repro to work from. |
| Corpus / session RAG chips | Suppressed while any batch is pinned (§ 1.1). | Needs its own run with chips cleared. |
| Chunky streaming under game load | A performance measurement, not a question. Needs the capture and timing tooling. | **STREAM-09** / **STREAM-11**. |
| The five device-only bugs already on the list | Never had a code fix — they need measurement first, not confirmation. | [roadmap.md](../roadmap.md) § Bugs. |
| Anything about the search's **keyword** half | Off limits by **D25** and **D28**. Two of the four phrases attaching cards do so through it, by design. | *Card relevance needs a second signal*, Knowledge base backlog. |

---

## 6. Recording the result

Per CLAUDE.md, findings go to files, not chat. For each batch:

1. Update the QA rows in [testing.md](../testing.md) with pass, fail, or *question missed*.
2. For the four search phrases, record **which cards attached**, not just whether any did — the
   expected result for two of them is that cards still attach, so a bare pass/fail loses the
   information. **Read the names from the ask trace, not from the panel (§ 1.3).** The panel cannot
   distinguish a real card from the generic fallback, and a run made without the trace switched on
   cannot be checked afterwards.
3. For the guard, record the **model name** alongside the result.
4. Move anything that fully passes out of [roadmap.md](../roadmap.md) § Bugs and into
   [archive/roadmap-bugs-fixed.md](../archive/roadmap-bugs-fixed.md), which the list's own rule
   requires.
5. Clear the batch when done. A pinned batch left behind will quietly fail the next person's
   corpus-chip run and give no reason why.
