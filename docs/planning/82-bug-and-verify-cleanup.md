# Plan 82 — the bug list and the Verify list, cleaned up overnight

**Status: RUNNING, started 2026-10-07 about 00:10. The log at the end says where things stand.**

Asked for by the maintainer on 2026-10-06, late evening: "Tackle the bug list and the verify list, use subagents in
parallel. The ones that are mine will stay mine, I'll chip away at it when I have time. Deck is yours." They are
asleep while this runs and will look in from a phone now and then.

How a bug session runs is in [the runbook](../agents/bug-wave-runbook.md). This plan says only what is particular
to tonight. The maintainer's calls are in the decisions file as D125.

## The short version

- **Bugs: 15 on the list tonight.** Eight are new, found by the maintainer by hand on the Deck on 2026-10-06, and
  they are the night's work: seven D-pad and ring problems and the microphone button that does nothing. The
  microphone decides the release, so it is looked at first.
- **Verify: 24 entries.** About ten can only be closed by the maintainer (a real voice, a PIN, a finger, a right
  stick, their own eye): those stay theirs. Six are "tests only" and can never get a Deck check; by the maintainer's
  earlier call (D124, call 2) nothing moves to Done on its tests alone, so they stay, and the question of moving
  them is asked below. Three or four the rig can still close tonight, and it tries.
- **Helpers** fix the bugs side by side, each in its own copy of the repo; the Deck measures first for every
  focus and layout bug, because fixes written before a measurement have failed on the device every time.
- **What the maintainer should expect in the morning:** a report leading with anything only they can do, every
  new bug either fixed and proven on the Deck or back on the roadmap with what was learned, and the Deck put
  back as it was found.

## The maintainer's calls (2026-10-06, D125)

1. **Scope:** the Bugs list and the Verify list, both. Everything a session or the rig can do is in; what only the
   maintainer can do stays theirs and is not touched.
2. **The Deck is the session's for the night.** Nobody else drives it.
3. **Helpers in parallel**, as many as the work has lanes for (the cap of ten stands).
4. **Model:** the session runs on Fable 5.1 at high effort, which is above the house rule for a three-star bug
   session (Opus extra-high). Said once, at the start; the maintainer did not switch it.
5. **The rig's safety stop** was re-armed by the maintainer at 00:20 so the session could press buttons.

## The bugs, and what happens to each

**The eight new ones (found 2026-10-06 by hand)**

| | Bug, as a player sees it | Stars | Measured first? | Helper |
|---|---|---|---|---|
| A | The "Delete chat slot?" box has three buttons; it should have Delete and Cancel, opening on Cancel | ★ | No: the maintainer's screenshot is the measurement | Sonnet high (p82a) |
| B | Left and Right on the chat title bar stop on the chat's name; Up from the first question and Down from the tab bar should land on Delete | ★★ | The Deck records the stops (M4), the fix starts at once from the maintainer's rule | Sonnet high (p82b) |
| C | Down from the question box lands on Ask and skips the mode button under the box | ★★ | The Deck records the landing and the row's boxes (M2); the fix starts at once | Sonnet high (p82d) |
| D | Up from the bottom of the About tab does nothing | ★★ | Yes (M1): what holds the ring after Up, and the shape of the rows above | after M1 |
| E | The ring on a slider is too wide and stays at the right end when the knob moves | ★★ | Yes (M3): the ring's box against the knob's, before and after a press | after M3 |
| F | Both Show details lines on screen at once | ★★ | Yes (M6): the slot's state against the real line's box on every press | after M6 |
| G | The open reasoning block scrolls past in one press; it should move a screen at a time like the answer | ★★★ | Yes (M5): the scroll per press on the block and on the answer | after M5; Opus extra-high if the first round fails on the Deck |
| H | The microphone button does nothing | ★★★ | Yes (M7): a press with the log open, the engine and the microphone checked over SSH | decided by M7 |

**The other seven: not tonight's to fix**

| Bug | Why it stays |
|---|---|
| The sentence readable for a second before its cover | Waits for the maintainer's call (accept or keep); plan 81 question 1 |
| The two reload-under-a-game entries | Developer-only; wait for the maintainer's call on marking them accepted; plan 81 question 3 |
| Steam froze once after an answer with a game running | Seen once, not reproduced in two runs; no new lever tonight |
| The tab-bar ghost after a touch | The maintainer's finger |
| Up from the answer bubble scrolls the whole answer | The maintainer's hand check (D123) |
| The after-answer clean-up, finding 6 | Developer builds only; no fix needed for the Deck |

## Verify: who can close each entry tonight

| Entry | Who | How |
|---|---|---|
| The doubled hidden-block marks at a join (P81-CONTINUE-ONE-MARK) | Rig, two tries with the limit lowered | Block 2 |
| Long chips: the fade's opacity and a chip under the ring (P79-LONG-CHIPS) | Rig, no game first; a game only if memory allows | Block 2 |
| The walk check reads words (P81-WALK-READS-WORDS, the tools project) | Rig: this is a new chat, so the tool server may have the fix | Block 2 |
| The reopened checklist with the real AI (P78-REOPEN-CHECKLIST) | Rig, two tries | Block 2 |
| A place change keeps the other machine's names (P81-MOVE-KEEPS-OTHER-NAMES) | Rig, only if a PC model the Deck lacks can be arranged | Block 2, last |
| The focus ring on controls the Deck never shows | Tests only (stays) | |
| Everything the maintainer owns: the microphone twice, the PIN twice, the first install, the finger, the right stick, five looks, the trap in daily use, the cut-menu hand check | Maintainer | Their checks page |
| The six "tests only" rows | Nobody can; question 1 below | |

## The Deck plan

Standing rules as in plan 81. One driver at a time, a fresh one per block, evidence files `plan82-<ROW>.json`.

- **Blocks 0 and 1 (running from 00:30):** setup and backups (`~/p82-backup`), then the measurements M7, M2,
  M4, M6, M5, M1, M3 in that order. The runbook is in the session's scratch folder.
- **Block 2:** the owed Verify checks above, while the helpers build.
- **Block 3:** one build, then one check per landed fix.
- **Block 4:** second rounds, then the Main tab walk with and without a game.
- **Block 5:** smoke test, everything put back, test chips cleared, no game, the keep-awake released.

## Questions for the maintainer (the safest choice taken meanwhile)

1. **The six "tests only" Verify rows** (the sliver, the silent PC, a Deck with no AI, the typed follow-up's topic,
   a stopped answer inside a hidden block, the half mark at the end): may they move to Done on their tests, since
   the Deck can never make their case? *Meanwhile:* they stay in Verify, as D124 call 2 says.
2. **The "Remove knowledge base" box** has the same three-button shape as the delete-chat box. Should it get the
   same two-button change? *Meanwhile:* unchanged.
3. The three older calls still open from plan 81: the sentence before its cover (question 1), and the two
   reload-under-a-game entries (question 3). *Meanwhile:* open.

## Log

- **2026-10-07, 00:10 to 00:40:** read the lists, the runbook and the lessons. The rig's safety stop was found set
  (by the maintainer, the evening before); asked, re-armed at 00:20. Baseline quick check green at tip `60b8c57f`.
  Four copies cut (p82a to p82d). Helpers p82a (delete box), p82b (title bar) and p82d (box Down) started at 00:33.
  Deck driver on blocks 0 and 1 started at 00:38. The timed 20-minute check is on. Keep-awake held until 08:24.
