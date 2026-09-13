# 21 — Getting to AI-owned testing — the program plan

What it takes to get from "every bug costs the maintainer a manual Deck session" to
"an agent reproduces, fixes, verifies and locks a bug without you." Written 2026-08-24
after a gap analysis; the rig in [19-controller-macro-test-rig.md](19-controller-macro-test-rig.md)
is **one of five tracks** here, not the whole thing.

Plan only — **no implementation**. Effort is in *sessions* (a working block with you
available for questions), because hours are meaningless when the constraint is round trips.

**The goal, plainly:** for bugs that have a mechanical right answer, the loop
`reproduce → fix → verify → lock it so it cannot come back` should run without a human in
it. Everything that needs judgment still comes to you — § 6 draws that line explicitly.

---

## 1. The problem being solved

The maintainer's framing, 2026-08-23: *"Every test session for fixing some bug will uncover
3 more. This is unsustainable."*

Finding three bugs per session is not by itself a failure — it is a product meeting real
hardware. What makes it unsustainable is that **each one costs a human fifteen minutes of
thumb-typing and watching**, and **nothing that gets fixed is prevented from coming back**.
The count compounds because there is no ratchet.

Two symptoms named the same day, both confirmed in code below:

- An agent cannot fix a D-pad bug you report, because it has no way to observe one.
- Focus wiring is not considered when new UI is built, despite a rule saying it must be.

---

## 2. Where we actually are — measured, not assumed

### 2.1 The tests assert the half that works

Five focus modules carry **59 unit tests**: `answerBubbleNavigation` (12),
`answerStopRegistry` (16), `spoilerFenceRegistry` (14), `liveTurnFocusGraph` (9),
`navFocusRegistry` (8). Every one builds fake elements and **registers them by hand**, then
checks the lookup works — e.g. [spoilerFenceRegistry.test.ts:32-36](../../src/utils/spoilerFenceRegistry.test.ts):

```js
const fence = document.createElement("div");
registerSpoilerFence("a", fence);
expect(findUnvisitedSpoilerFenceInView(bubble, alwaysInView)).toBe(fence);
```

That proves *if a fence is registered, the finder finds it.* The live bug — per the roadmap's
own entry — is that "something upstream is not routing to the registry, or is de-registering
early," plus whether Steam routes the press at all.

**No test in the repo can fail when that happens.** The four rendering tests in
[MainTabBonsaiAiMarkdownChunk.test.tsx](../../src/components/MainTabBonsaiAiMarkdownChunk.test.tsx)
check markup shape only (not nested in `<pre>`, stays masked, unwraps when masking is off) —
none check that the fence registers itself, and none can check Steam's gamepad routing,
which does not exist outside the device. This is the structural reason the fence has been
"fixed" and has returned more than once.

### 2.2 There is no ratchet at all

| Gate | Runs the tests? | Evidence |
|---|---|---|
| `.githooks/pre-commit` | **No** — architecture snapshot sync only | one line: `node packages/bonsai-mcp/scripts/sync-architecture-for-commit.mjs` |
| `.github/workflows/build-plugin-zip.yml` | **No** — `pnpm run build`, Decky CLI, zip verify | reviewed 2026-08-24 |
| `.github/workflows/validate-mcp.yml` | **No** — MCP knowledge freshness + build | reviewed 2026-08-24 |

**1,306 tests exist and nothing enforces them** (556 vitest + 750 Python, per
[CLAUDE.md](../../CLAUDE.md) § Commands), plus `npx tsc --noEmit`, which the build does not
perform. They run when a person or agent remembers. That is the same failure class
[testing.md](../testing.md) already named when it moved evidence retention into the script:
*"a retention rule that depends on someone remembering is not a mechanism."* The insight was
applied to file cleanup and not to the test suite.

### 2.3 There is no linter

No `eslint` / `biome` / `prettier` config and no `lint` script exist
(`package.json` reviewed 2026-08-24). So the 26 rules in
[.cursor/rules/decky-focus-graph.mdc](../../.cursor/rules/decky-focus-graph.mdc) — each one
earned by a real bug, several stating precisely checkable facts — are enforced only by an
agent reading and remembering them at the right moment.

### 2.4 Nothing can press a button on the Deck

Finding **F1** in [01-qa-automation-plan.md](../archive/01-qa-automation-plan.md) § 0, unchanged. And
per findings-log **P1-5**, the one check that *was* available (`activeElement`) is a false
oracle — bonsAI shipped three "fixes" that passed it while gamepad focus never moved. An
agent debugging focus today is not merely slow; it is working from a lying instrument.

### 2.5 Scale of the manual queue

[testing.md](../testing.md) holds **92 rows: 13 Verified, 55 Open, 15 Partial** (counted
2026-08-17). Most Open rows are "press some buttons, type a question, read the screen."

---

## 3. The five tracks

Ordered by *return per unit of effort*, not by excitement. **A and B need no hardware and
can start today.**

### Track A — The ratchet ★ (1 session)

Put the gates that already exist into CI: `npx tsc --noEmit`, `npm test`, `npm run test:py`
on pull requests and pushes.

- Protects 1,306 existing tests that are currently advisory.
- Is the prerequisite for every later "lock it so it can't come back" claim — a regression
  check nothing runs is decoration.
- **Expect it to fail first** on a clean runner (Python deps, Node version, an
  environment-dependent test). Budget the session for fixing what it exposes; that discovery
  is the point.

**Status 2026-08-25 — implemented, advisory.** [`.github/workflows/tests.yml`](../../.github/workflows/tests.yml).
The clean-runner failure predicted above did **not** happen: 1,427 tests pass from a bare
clone. The baseline, the three tests that will execute for the first time on Linux, and what
is still unverified are recorded in [24-track-a-ci-baseline.md](24-track-a-ci-baseline.md).

**Status 2026-08-27 — the predicted clean-runner failure did happen, just one flip later, and
is now fixed.** Every `Tests` run went red from the moment `ADVISORY` was set to `false` —
**16 consecutive failures**, all of them the same four Python tests, none of them caused by the
commit they were reported against. The gate summary was doing its job (`TSC: success`,
`VITEST: success`, `FOCUS: success`, `PYTESTS: failure`); nobody had read past the red cross.
So the section above stands corrected: the failure was environment-dependent exactly as
predicted, and being advisory for the first two sessions is what let it hide.

Two causes, both "green on the maintainer's Windows PC, red on a Linux runner", and neither in
product code:

- **Three knowledge-base tests read vectors the CI corpus does not have.** `build_rag_db.py
  --seed` needs a local Ollama with `nomic-embed-text` to fill `section_vectors` /
  `compat_pattern_vectors`; without one it logs *"Skipping section_vectors embeddings"* and
  writes a keyword-only corpus. That is correct behaviour — a Deck with no embed model still
  gets a working corpus, and there is a test directly below one of these asserting it. But the
  vector tests then read rows that were never written and died on a bare `KeyError: 3`. They
  now **skip** with a message naming the dependency.
- **`test_reset_wipes_rag_corpus_dir` only ever passed by accident of the temp root.** The
  corpus wipe refuses any path outside `Path.home()` or `/run/media/<user>` — a deliberate
  guard. `tempfile.TemporaryDirectory()` lands under home on Windows and in `/tmp` on Linux,
  so the fixture was inside the allowed area on one platform and outside it on the other. The
  fixture now sits under home on both, and a new test covers the refusal half, which nothing
  had asserted at this level.

**Worth keeping:** a blocking gate that is red on every run is the same as no gate — it stops
being information after the second red cross. Whatever turns it red must be fixed or skipped
the day it appears.

### Track B — Static focus checks ★★ (1–2 sessions)

A standalone checker script in `scripts/` — matching the repo's existing habit
(`plugin_zip_corpus_guard.py`, `verify-decky-plugin-zip.sh`) rather than adopting a whole
linter toolchain — wired into Track A's CI job. Candidate checks, each already stated as a
hard rule and each mechanically detectable:

1. `document.querySelector` / `document.activeElement` used to move or verify focus (rule 15-16).
2. `onMoveUp` / `onMoveDown` passed to a Decky `Button`, which does not forward them (rule 17).
3. `tabindex` overwritten, or `-1` added to a natively focusable element (rule 18).
4. **A registration call with no consumer** — the spoiler-fence class: a `register*(id, el)`
   ref callback whose registry is never read on the path that matters. Feasibility of the
   full version is UNKNOWN; the cheap version (registry written but never imported by a
   navigation module) is straightforward.
5. A new focus-owning control shipped with no D-pad row in `testing.md` (rule 19).
   Feasibility UNKNOWN — needs a way to identify "new focus owner" mechanically.

This converts the answer to *"why isn't focus considered when new UI is built"* from "try
harder to remember" into "the build says no." **It catches new mistakes; it does not find
existing ones** — that is Track C.

**Status 2026-08-26 — built and blocking.** `scripts/check-focus-patterns.mjs`, wired into
`tests.yml` as a fourth gate (`pnpm test:focus`). Three of the five candidate checks are
implemented, plus a fourth rule found by using it (`ring-question`, below); plan checks 4 and 5
stay deferred, still marked UNKNOWN.

It uses the TypeScript compiler API rather than regex, because two of these rules are about
JSX prop identity and a regex version produces false positives that get the rule deleted.

**Ratcheted, not retroactive.** The repo has **80 existing violations** across 21 files,
recorded in `scripts/focus-baseline.json`. The check fails only when a count goes *up* — which
is exactly the "catches new mistakes, does not find existing ones" line above, made mechanical.
Verified both ways: a probe file with all three violations failed the gate, and removing it
returned to green.

**A fourth check, added 2026-08-26 — `ring-question`, and the reason it is worth reading.**
The three checks above went green over a live bug, and the way they did it is the interesting
part.

`page-search` fires on the `.activeElement` property access. Once `uiDocument.ts` wrapped that
access behind `uiActiveElement()`, exactly **one** such access was left in `src/` — inside
`uiDocument.ts` itself, where it is correct, and duly recorded in the baseline. Every call site
of the wrapper therefore scored **zero**. `answerStopRegistry.ts` — which the roadmap names as
the lead for the still-open spoiler-reveal bug — showed only a `tabindex` finding.

So the check reported green over the exact defect class it was written for, because the
codebase had been tidied in a way that moved the pattern out of its sight. **A rule that
matches a syntax rather than a question stops matching the moment someone extracts a helper.**
That is the general lesson, and it is worth more than the specific rule.

`ring-question` matches the question instead: any call to `uiActiveElement()` outside its own
module. It found **7 sites**, which is the full set a hand audit found independently. Four are
fixed (three on the answer-bubble focus path, plus an escape hatch on the one legitimate use —
blurring the on-screen keyboard before an Ask, which really is an `activeElement` operation).
Three remain in the baseline, named rather than invisible: `MainTabChatTranscript.tsx`,
`MainTabUnifiedAskBar.tsx`, `chatPanelScroll.ts`. They are the same defect class on surfaces
this change set did not verify on device, and each will want its own row.

The distinction the rule encodes: reading focus **right after you called `.focus()` yourself**
is a landing check and stays legal — `focusSpoilerFence`, `focusDeckOwner` and `focusAnswerStop`
all do this correctly with `elementHasFocus`. Reading focus to decide **where the ring already
is**, with no `.focus()` of your own in front of it, is the trap.

**What the first run found, and what it means.** `move-props-on-button` scored **zero** — that
bug class was eliminated when ABOUT-LINKS-01 and REPLY-DOWN-01 were fixed, and the check now
stops it returning. The other two are concentrated exactly where § 2.1 predicts:
`liveTurnFocusGraph.ts` (25), `answerBubbleNavigation.ts` (10), `useMainTabAskBarFocus.ts` (9)
— whose own header reads *"Solves: Reliable focus targets without document.querySelector"*.

**Test files are excluded on purpose.** Including them added 27 findings nobody could act on:
the focus tests call `querySelector` because they build the fake DOM they assert against, which
is the § 2.1 observation itself. A test file cannot ship a focus bug to the Deck.

**Known limit, stated rather than hidden.** The baseline counts per file per rule, so deleting
one violation and adding another in the same file nets to zero and slips through. Line-level
keys were the alternative and they break on every unrelated edit above them.

### Track C — The rig ★★★★★ (5–9 sessions)

[19-controller-macro-test-rig.md](19-controller-macro-test-rig.md), phases P0–P2: bridge
board bring-up, DPS primitives (`deck_pad*`, `deck_macroRun`, `deck_stream*`, kill switch),
then bonsAI's golden-path smoke. Board ordered 2026-08-24.

Gives an agent the two things it has never had: a way to press a real button, and a way to
watch what really happened.

### Track D — Oracles ★★★ (2–3 sessions, overlaps C)

A press is useless without a truthful answer to "what happened?" Three signals:

| Signal | For | Status |
|---|---|---|
| Real focus state (`gpfocus`, never `activeElement`) read over CDP | every focus row | design known, unbuilt — the direct answer to P1-5 |
| Reply-finished | every Ask macro | spike S5 in plan 19 — three candidate sources |
| Token-arrival vs paint timestamps | the chunky-streaming bug | already specified in roadmap § Bugs; independent of the rig, and the rig makes its runs repeatable |

### Track E — The unattended loop ★★★ (2 sessions)

Nightly: gates → preview suite → device smokes → evidence written, findings summarized.
Per [01-qa-automation-plan.md](../archive/01-qa-automation-plan.md) § A5 this is **gated on A0** (the
preview harness passes unknown assert types silently) — *"do this first or the rest is
theatre."* A0 is not yet done and belongs at the front of this track, not the end.

---

## 4. Sequence and effort

| Order | Track | ★ | Sessions | Needs hardware? | Blocks |
|---|---|---|---|---|---|
| 1 | **A** — CI runs the existing gates | ★ | 1 | no | everything that claims to "lock" a fix |
| 2 | **B** — static focus checks | ★★ | 1–2 | no | stops the *inflow* of new focus bugs |
| 3 | **C** — rig P0–P2 | ★★★★★ | 5–9 | yes (ordered) | every on-device row |
| 4 | **D** — oracles | ★★★ | 2–3 | partly | trustworthy verdicts |
| 5 | **E** — A0 + nightly loop | ★★★ | 2 | no | unattended operation |

**Total ≈ 11–17 sessions** to a working loop, with the first two delivering protection in the
first two. Tracks A, B and E's A0 do not wait on the board.

What could move these: Track A's real cost is whatever CI exposes; Track C carries five
timeboxed spikes whose answers can add work (spike S1 if Steam rejects a generic pad
identity; S3 if the sudoers rule does not survive SteamOS updates); Track B checks 4 and 5
are marked UNKNOWN on purpose.

---

## 5. Milestones — how you know it is working

Each is a yes/no event, not a feeling.

| # | Milestone | Proves |
|---|---|---|
| **M1** ✅ | CI rejects a pull request because a test failed | the ratchet exists at all — *reached 2026-08-26* |
| **M2** ✅ | A focus anti-pattern is caught before deploy, not on the Deck | the inflow is closing — *reached 2026-08-26, Track B gate* |
| **M3** ◐ | Golden-path smoke passes unattended (plan 19 § 4) | an agent can drive the device — *the navigation half is done: 2026-08-26 a 9-step asserted D-pad run drove the QAM with nobody at the Deck. Still missing from § 4: the stream start/stop bracket and the live-Ask reply signal (steps 1, 4-6).* |
| **M4** ✅ | **A D-pad bug is reproduced by script, fixed, and locked by a check that fails without the fix** | the recurrence loop is broken — *the milestone that matters*. **Reached 2026-08-26 on MICRO-04.** The reply grid's right column was unreachable vertically: Down from *Not really* went to *Retry*, Up from *Show details* went to *Helpful*. Found by driving the Deck, not by reading code. Root cause was the `activeElement` trap in `focusedStop()`, which made both column-aware branches dead code. Fixed with `elementHasGamepadFocus`, locked by five tests (three go red without it, the key one with *expected 'helpful' to be 'not-really'*), and re-verified on device after deploy. An earlier attempt on CONTEXT-LADDER-03 got two of the three parts — reproduce and lock — but that claim did not reproduce, so there was nothing to fix. |
| **M5** | A nightly run produces evidence with nobody present | the loop is real |
| **M4b** ✅ | **A proposed fix is falsified by the rig before it can be believed** | the loop protects against its own optimism — *2026-08-27*. A cause for SPOILER-DPAD-01 was derived by reading, argued in detail, committed with passing tests and a new lint rule, and written into two docs as "the recurrence cause". A before/after pair on the device (`runs/SPOILER-REVEAL-BEFORE-fix.json`, `-AFTER-fix.json`) then showed the two walks press-for-press identical. **Total cost of being wrong: about twenty minutes and two doc corrections.** Before the rig, this is the class of fix that shipped, sat in the roadmap as PARTIAL for weeks, and came back — which is exactly what the entry's three previous "fixes" did. M4 proved the rig can confirm a fix; this is the other half, and for a codebase whose recurring bugs all came from confident wrong readings it is arguably the more valuable direction. |
| **M6** ◐ | A `testing.md` row moves Open → Verified on rig evidence alone | the manual queue is actually draining — *first two rows moved 2026-08-26: **FOCUS-GRAPH-DEV-KB-01** and **FOCUS-GRAPH-DEV-RAG-01**, both PASS, nobody at the device. Held at ◐ rather than ✅ because both were mechanical toggle-chain checks; the harder rows still need a human to judge what they saw.* |

**The number to watch:** 59 Open rows in testing.md (2026-08-26; was 55 when this was written), and the count of bugs that have been
fixed more than once. Both should fall. If Open rows fall while re-fix count does not, the
rig is being used as a faster way to find bugs rather than to prevent them.

---

## 6. The autonomy ladder — and where it stops

| Tier | Unlocked by | What an agent can do |
|---|---|---|
| **0** *(today)* | — | Read code, form a theory, hand it to you to test and report back |
| **1** | A + B | Prove a whole class of mistakes is absent before anything is deployed |
| **2** | C + D | Reproduce and verify on the real device, in minutes, unattended |
| **3** | E | Run the loop on a schedule and bring findings instead of questions |
| **4** | all | Own the mechanical bug loop end to end: reproduce → fix → verify → lock |

**Tier 4 is the ceiling, and it is not "no human."** These stops are structural, not
politeness — an agent should refuse to pass them even when it could:

1. **Taste.** Whether a game's boss names deserve a spoiler fence needs someone who knows
   the game and the player. [04-strategy-spoiler-false-positive.md](04-strategy-spoiler-false-positive.md)
   is full of calls no oracle produces.
2. **Value decisions.** The whole D-series exists because those are tradeoffs, not facts —
   retrieval floors, kids lock, corpus licensing. What the product owes its users is yours.
3. **Anything users receive.** Publishing a corpus, cutting a release, pushing to GitHub.
   Not reversible, so not delegated (matches the existing no-push rule in CLAUDE.md).
4. **Physical world.** A game must be owned, installed and running; the Deck awake, docked,
   networked. The rig presses buttons; it does not buy games or plug in cables.
5. **Ground truth about games.** Whether an answer about Deep Rock is *correct*.
   [01-qa-automation-plan.md](../archive/01-qa-automation-plan.md) § 4 already settles this: a judge
   model has no ground truth for a game it does not know.
6. **Priority.** An agent can say what is broken. What is *worth* fixing next encodes what
   you care about.

**On proposing features:** an agent can, and there is precedent
([13-roadmap-feature-ideas.md](../archive/13-roadmap-feature-ideas.md)). But the backlog already runs to
roughly sixty items across nine themes. Proposals are cheap; deciding what *not* to build is
the scarce thing. Autonomy is better spent closing items than opening them — treat a new
proposal as needing to justify itself against that.

---

## 7. Honest limits

- **The rig does not make an agent better at fixing bugs.** It replaces a lying instrument
  with a truthful one and cuts the loop from a day to a minute. Fix rate per attempt may not
  change much; attempts per hour change enormously, and each one gets checked.
- **Track B catches new mistakes only.** Existing focus bugs still need C+D to observe.
- **Video corroborates, it does not adjudicate.** Per
  [01-qa-automation-plan.md](../archive/01-qa-automation-plan.md) § 3, a vision judge is agreeable by
  default and non-reproducible; keep verdicts mechanical. Streaming smoothness is *decided*
  by the timestamp instrumentation in Track D, not by watching the stream.
- **Permanently manual regardless** (QA plan § 5): voice/mic hardware, the physical display
  matrix, clean install, OS-persistence rows needing reboots, and every qualitative judgment.
- **The rig can press buttons anywhere, including into a running game.** It stays dev-only
  and never ships inside the plugin, with the guardrails locked in plan 19 § 2 (L6).

---

## 8. First three actions

1. **Track A** — wire `tsc --noEmit`, `npm test`, `npm run test:py` into CI; fix what it
   exposes. No hardware, protects 1,306 tests, unblocks every later lock.
2. **Track B** — the focus checker script with checks 1–3 (the mechanically certain ones),
   in the same CI job.
3. **Track C P0** — bring up the board when it arrives (spikes S1–S3).

Per [CLAUDE.md](../../CLAUDE.md), each implementing change set updates
[roadmap.md](../roadmap.md) and [testing.md](../testing.md) alongside the code.
