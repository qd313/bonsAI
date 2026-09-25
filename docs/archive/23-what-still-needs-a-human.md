# 23 — What still needs a human

Reference for the question *"if the rig works, what is left for me to do?"*
Written 2026-08-25 after the controller bridge opened the QAM unattended.

Consolidates and makes concrete what
[21-ai-owned-testing-program.md](../planning/21-ai-owned-testing-program.md) § 6–7 and
[01-qa-automation-plan.md](01-qa-automation-plan.md) § 4–5 already establish.
Nothing here is new policy; it is the same policy in one place, with the reason
attached to each line, because the reasons differ and they age differently.

---

## 1. The short answer

A working rig plus working oracles gets to **Tier 2–3** on plan 21's ladder:
reproduce and verify on real hardware, unattended, on a schedule.

It does **not** get to "propose a feature and the AI does all the QA." What it
gets to is: an agent implements the feature, runs the mechanical rows itself,
and brings you **a short list of what needs a human** instead of the whole thing
needing one.

Per plan 21 § 7, fix rate per attempt barely moves. **Attempts per hour move
enormously, and each one gets checked.**

## 2. What an agent can own end to end

Only where every one of these holds:

- the pass condition is **mechanical** — a state read, a log line, a pixel
  region, an exit code
- it needs **no game** to be owned, installed or running
- it needs **no physical change** to the device
- being wrong is **cheap and reversible**

Examples: focus and D-pad routing rows, tab navigation, whether an Ask starts
and finishes, whether a control is reachable, whether a regression check that
should fail without a fix actually does.

## 3. What needs a human — grouped by why

The grouping matters. Some of these could move later; others never will.

### 3.1 Physical world — will not move

| | Why |
|---|---|
| Games owned, installed, launched | The rig presses buttons. It does not buy, install or start a title (plan 21 § 6.4) |
| Deck awake, docked/undocked, charged, networked | Someone has to put the hardware in the state the test assumes |
| BLE pairing, cables, external displays | Physical acts |
| Voice / mic hardware rows | QA plan § 5 |
| The physical display matrix | QA plan § 5 |
| Clean install rows | QA plan § 5 |

### 3.2 Ground truth — will not move

| | Why |
|---|---|
| Is this answer about the game **correct**? | QA plan § 4: a judge model has no ground truth for a game it does not know |
| Does this text deserve a spoiler fence? | Needs someone who knows the game *and* the player ([04-strategy-spoiler-false-positive.md](04-strategy-spoiler-false-positive.md)) |

### 3.3 Judgment and taste — will not move

Does streaming *feel* smooth. Is this reply good. Is this wording right. Is this
UI pleasant. Plan 21 § 6.1.

Note the sharp edge: **smoothness is decided by timestamp instrumentation, not
by watching** (plan 21 § 7). "Does it feel smooth" is taste; "did tokens arrive
late" is a measurement. Do not let the second masquerade as the first.

### 3.4 Value decisions — will not move

Retrieval floors, kids lock, corpus licensing, the whole D-series. What the
product owes its users is the maintainer's (plan 21 § 6.2).

### 3.5 Anything users receive — will not move

Publishing a corpus, cutting a release, pushing to GitHub. Not reversible, so
not delegated. Matches the existing no-push rule.

### 3.6 Priority — will not move

An agent can say what is broken. What is *worth* fixing next encodes what the
maintainer cares about (plan 21 § 6.6).

### 3.7 Recovery from the unexpected — **may move, partly**

A Steam update dialog, an OS prompt, a hung shell, a Deck that did not wake. The
rig has no idea it is stuck; it presses into whatever is on screen.

This is the one bucket worth investing in: a **"is the Deck in the state I think
it is"** precondition check, plus an abort when a macro's step budget is
exceeded, converts most of these from silent corruption into a clean failure the
agent can report. It does not make them self-healing.

### 3.8 Reboot-persistence rows — **may move, partly**

Listed as permanently manual in QA plan § 5. A reboot itself is scriptable over
SSH; what is not yet scriptable is the Deck coming back to a known, unlocked,
logged-in state reliably enough to trust unattended. Revisit once the
precondition check in 3.7 exists.

## 4. The rule for classifying a new row

Static lists rot. Ask instead, in order:

1. **Is the pass condition mechanical?** If it needs someone to say "that looks
   right", it is a human row. Full stop.
2. **Does it need a game, a cable, or a physical state change?** Human, at least
   to set up.
3. **Is being wrong cheap?** If a wrong verdict ships something to users or
   corrupts state, a human confirms before the irreversible step.
4. **Does anything in the loop have ground truth?** If the only judge is a model
   guessing about a game it has not played, that is not an oracle.

Any "no" at 1, or "yes" at 2 or 3, means the row keeps a human in it — possibly
only for setup, with the agent doing the rest.

## 5. What it is fair to expect

**Fair:** the agent runs the mechanical rows nightly, brings findings instead of
questions, reproduces a D-pad bug on demand, and proves a fix holds by making a
check fail without it (plan 21's M4).

**Not fair:** that the queue empties itself. 55 Open rows in testing.md do not
all become mechanical. The number to watch is not "Open rows" alone but **bugs
fixed more than once** — if Open falls while re-fixes do not, the rig is being
used to find bugs faster rather than to stop them coming back (plan 21 § 5).
