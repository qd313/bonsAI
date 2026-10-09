# 85 — Reading mode: a test to find out

Written 2026-10-09 by the session that built [plan 84](84-more-room-for-the-answer.md), as that plan's step 9. Plan 84
said reading mode gets **its own short plan once the build is in**. The build is in. Nothing here is built, and nothing
is decided yet: this plan says what a test would have to find out, and what the maintainer has to choose first.

**The drawing:** option "G, Reading mode" in [assets/84-vertical-room.html](assets/84-vertical-room.html) (the
"Outside the box" section). Read it first.

---

## 1. What reading mode is

While an answer is on screen, everything else folds away: no tab bar, no chat name, and the ask area shrinks to one
"Ask a follow-up" line. The current tab floats as a small tag. Pressing on the follow-up line unfolds the ask area
again; an arrow beside the mic folds it back.

## 2. Why it is worth a test now, and not before

Plan 84 already moved the tab bar into Steam's empty strip, put the chat's name in Decky's bar, and taught bonsAI to
reshape Decky's bar per tab and put it back exactly when bonsAI closes (checked on the Deck 2026-10-09:
[evidence](../test-evidence/plan84-STEP6-DECK.json)). Hiding Decky's bar and bonsAI's own rows is now a small step
from what exists, where in September it was the hardest part. On the Deck's own screen the answer has 295 of the
panel's 454 points today. Reading mode would give it most of the rest.

## 3. What the maintainer chooses before any test build

1. **When it folds.** Three candidates: (a) as soon as the ring enters the answer; (b) only after a press (a button,
   or a hold of a button not already used); (c) automatically once an answer finishes arriving.
2. **How a person gets everything back.** Candidates: Up past the top of the answer; B; any press on the folded
   line; leaving the answer with the ring. B already leaves bonsAI from the tab bar, so it needs care.
3. **What stays visible while folded.** The drawing keeps a small tab tag and one follow-up line. LT/RT (switch
   chats) and LB/RB (switch tabs) could keep working while folded, or unfold first.
4. **Touch.** A tap on the folded line unfolds; does a tap on the answer do anything?

The mockup habit holds: these calls are best made from drawings at true size, one per candidate.

## 4. The test (after the calls)

A throwaway build, never committed, the way plan 84's step 1 tested its three questions:

- Fold and unfold on the Deck's own screen with the chosen triggers; **measure** the answer area folded and unfolded
  with the probe (no estimates).
- Walk the ring through fold, read, unfold, ask, with the controller rig: the ring must never land on something
  hidden, and every fold must be undoable with one press.
- Check that Steam's own pages and Decky's bar are untouched after leaving bonsAI in each state (plan 84's row
  P84-QAM-01 again).
- The maintainer uses it by hand for a few minutes with a long answer and says whether people would lose track of
  where the controls went (the drawing's own worry).

**Passes when:** the measured gain is worth it to the maintainer, no press is ever lost or trapped, and the
maintainer's own use says it does not confuse.

## 5. Size and who does it

★★★ if built: a new state for the whole panel, with focus routes into and out of it. Routing per AGENTS.md: the
drawings and the test build by Opus extra-high with the Deck in hand; a build plan only after the test.

## 6. Progress log

- **2026-10-09:** plan written; waiting on the maintainer's calls in § 3.
