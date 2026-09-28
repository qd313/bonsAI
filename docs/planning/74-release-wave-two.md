# Plan 74 — release wave two: knock the bug list down before 0.6.0

**Status: running, started 2026-09-28.** Asked for by the maintainer ("let's plan for another wave to knock
that list down", then "go"). Part of [plan 71](71-merge-experimental-into-main.md), Stage B: the second pass of
bug fixing before the last call on Friday 2 October.

## What this wave is for

After the roadmap check on 2026-09-28, the open bugs split into three kinds: ones nobody can fix until the Deck
shows them again, ones too big or risky for four days before a release, and small ones with a known cause. This
wave takes the small, known-cause ones, plus four licence and download fixes the licence check found. Every one
is chosen to be safe to ship this week.

## The maintainer's calls (2026-09-28)

1. **The default model's licence label:** fix the labels and the README wording after the release, not now.
   The licence check found that the "open source only" setting's default picture-reading model may carry a
   research licence at its size (from memory; check the model's page first). The default stays as it is for 0.6.0.
2. **The logo is the maintainer's own work.** Written into the notice file by lane 1.
3. **Lane 3 runs on Opus high, not the usual Opus xhigh for D-pad work, as a trial.** Measured below.

## The lanes

Each lane works in its own copy of the repo, one fix per commit, all checks green. Lanes never edit the
roadmap, the testing docs or the changelog; the session does that at landing.

| Lane | What | Helper | Fixes |
|---|---|---|---|
| 1 | The release download and its licences | Opus medium | 4 |
| 2 | Answers and chats | Opus medium | 6 |
| 3 | D-pad fixes whose cause the Deck already showed | **Opus high (trial)** | 6 |
| 4 | Looks already measured on the Deck | Opus xhigh | 3 |
| 5 | Back end and the knowledge library | Opus medium | 3, plus one test to find out |
| Deck | Check every fix; run three owed checks; try the one-off sightings once | Deck helper, Opus medium, from rows the session writes | — |

**Lane 1:** the download leaves out the notice file and the data folder (a fresh install loses the extra words
in "Find a setting by typing"); no licence texts for the ~50 code libraries built in; no licence note on the
314 wiki notes in the public code; the download check does not look for any of it.

**Lane 2:** the spinner that keeps spinning with thinking off; the dismissed troubleshooting hint that comes
back; the Session tab saying "nothing to sum up yet" after a sum-up; Copy joining two paragraphs; the
meaning-search hint appearing late; the panel rewriting its height for nothing.

**Lane 3:** B on the notes block or on "Hide details" throwing the ring to the tab bar; two older confirm boxes
opening on the action button; the ring landing on the tab bar after a download box closes; Up from Ask landing
on the mic or the paperclip; Down landing on Read aloud instead of Helpful, and Up from Helpful skipping choice
B; Up next to a spoiler cover, where A does nothing.

**Lane 4:** the decode chip's pale typing mark; Read aloud alone above an empty gap; "Clear cache…" 16 pixels
out of line and About's support button far too tall.

**Lane 5:** "Not in my notes" shown when the notes were never searched; the log not naming the notes and tips a
question used; "Reset to defaults" in the try-order picker saving a fixed list; and one test commit to find out
whether a copy's commit hook still rebuilds the shared checkout.

**Not in this wave** (see the roadmap for each): the nine known issues named in the release notes and watched;
the three security findings and two clean-ups planned for after the release; five bugs too big or risky for this
week; six library-quality bugs, better as their own library wave; about fourteen one-off sightings. The Deck walk
check's false alarm lives in the Deck tool, not in bonsAI, so it is fixed there, separately.

## The Opus-high trial (lane 3)

The routing table sends D-pad work to Opus xhigh. The maintainer asked to run it on Opus high and measure how it
does. No paired run: screen work stays out of paired runs (plan 33 § 4b). Recorded per fix, in the same columns as
plan 33 § 4b:

- **Deck first time** — the number that decides it: did the fix pass on the Deck on its first check?
- Checks green first time; problems the session finds reviewing the change before landing (a D-pad fix built on
  something the Deck never delivers counts as a must-fix); rounds to land; do the new tests fail without the fix?
- Tokens, turns, tool calls, minutes and dollars at list, from the helper's own log.

**Verdict rule** (plan 33's): Opus high replaces xhigh for measured D-pad fixes only if its Deck first-time rate
and review problems are no worse than the recent xhigh-reviewed focus fixes in plan 72. One lane is a small
sample; the verdict says how many fixes it rests on. The result goes into plan 33 § 4b.

## Landing

Order: lane 1 (no screen change), 5, 2, 4, then 3 last, because lanes 3 and 4 both touch the row of buttons
under an answer. Each landing: review the change, rebase onto the tip, all six checks green, then the
bookkeeper sweep for that lane's roadmap, testing and changelog rows. Then one deploy and the Deck pass.

## Log

- **2026-09-28:** plan written; five repo copies made from `c8fa25d9`; lanes started.
