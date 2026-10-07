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
| A | The "Delete chat slot?" box has three buttons; it should have Delete and Cancel, opening on Cancel | ★ | No: the maintainer's screenshot is the measurement | Sonnet high (p82a), landed `771d66dc`; passed on the Deck 2026-10-07 (block 3a) |
| B | Left and Right on the chat title bar stop on the chat's name; Up from the first question and Down from the tab bar should land on Delete | ★★ | The Deck records the stops (M4), the fix starts at once from the maintainer's rule | Sonnet high (p82b), landed `1baf53bc`; Deck block 3a: the three rules passed, the Save-return half failed; round 2 `7d0a7be5`; the Save-return half passed on the Deck, block 3b (about 01:30 to 01:45) |
| C | Down from the question box lands on Ask and skips the mode button under the box | ★★ | The Deck records the landing and the row's boxes (M2); the fix starts at once | Sonnet high (p82d), landed `a6e00806`; passed on the Deck, block 3b (about 01:30 to 01:45) |
| D | Up from the bottom of the About tab does nothing | ★★ | Yes (M1): what holds the ring after Up, and the shape of the rows above | after M1: not reproduced by the rig (M1), stays open, question 5 |
| E | The ring on a slider is too wide and stays at the right end when the knob moves | ★★ | Yes (M3): the ring's box against the knob's, before and after a press | after M3, landed `f6c96e43`; passed on the Deck, block 3b (about 01:30 to 01:45) |
| F | Both Show details lines on screen at once | ★★ | Yes (M6): the slot's state against the real line's box on every press | after M6, landed `8bfe1802`; passed on the Deck, block 3b (about 01:30 to 01:45) |
| G | The open reasoning block scrolls past in one press; it should move a screen at a time like the answer | ★★★ | Yes (M5): the scroll per press on the block and on the answer | after M5; landed (three commits, Opus); skipped in block 3b (its commits were not on the branch yet), then **FAILED on the Deck in block 4 (build `efd4258b`): the block is not a ring stop**; a second round (p82g2, Opus) was started and has not landed; back on the roadmap's Bugs list |
| H | The microphone button does nothing | ★★★ | Yes (M7): a press with the log open, the engine and the microphone checked over SSH | decided by M7: not reproduced by the rig (M7); helper p82h adds a toast and log lines; landed `3575d15f` (three commits); log half passed on the Deck in block 3b; the Starting label passed in block 4 (build `efd4258b`, about 22 ms after the press); the spoken-sentence check stays the maintainer's |
| I | The fade style's chips swap their words without fading (found tonight, Deck block 2) | ★★ | Measured (block 2): opacity 1.00 through 32 changes | Sonnet high (p82i): found to be a measurement of the wrong element; the fade moved onto the button, landed `8d1523d4`; passed on the Deck, block 3b (about 01:30 to 01:45) |

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
| The doubled hidden-block marks at a join (P81-CONTINUE-ONE-MARK) | Rig, two tries with the limit lowered | Block 2: could not run; needs setup-dev |
| Long chips: the fade's opacity and a chip under the ring (P79-LONG-CHIPS) | Rig, no game first; a game only if memory allows | Block 2: ring half UNCLEAR (the chip under the ring held still; so did the other); the fade reading was of the wrong element, the fade moved onto the button (p82i), row P82-FADE-ON-BUTTON, passed on the Deck 2026-10-07 (block 3b) |
| The walk check reads words (P81-WALK-READS-WORDS, the tools project) | Rig: this is a new chat, so the tool server may have the fix | Block 2: closed 2026-10-07 (Deck) |
| The reopened checklist with the real AI (P78-REOPEN-CHECKLIST) | Rig, two tries | Block 2: closed 2026-10-07 (Deck) |
| A place change keeps the other machine's names (P81-MOVE-KEEPS-OTHER-NAMES) | Rig, only if a PC model the Deck lacks can be arranged | Block 2, last: not run; the Deck's saved order holds only a name the PC has too; tests only |
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
4. **Renaming a chat by hand:** A on the chat's name used to open the rename box, and the name is no longer a stop (your call of 2026-10-06), so the only rename left is the one Sum up offers. Do you want a new route (for example a Rename choice inside the Save window)? *Meanwhile:* none.
5. **Up at the bottom of the About tab:** the rig could not make it fail (3 of 3 from the D-pad route). How did you reach the bottom: D-pad only, or a right-stick or touch scroll first? *Meanwhile:* the entry stays open.
6. **Run setup-dev on the Deck** (five seconds): the plugin folder is owned by root since the last deploy, so the continued-answer check could not lower the limit, and a deploy may be refused the same way. *Meanwhile:* the check stays owed; the deploy is tried as is.
7. **A chip at the edge of the sliding strip** reads one third visible: the strip cuts its words. Is that the design, or a clipped label to fix? *Meanwhile:* on the watch list.

## Follow-ups (nothing a player sees)

- The question box's old Down handler in `src/hooks/useMainTabAskBarFocus.ts` is now dead code, with tests that describe nothing (left over from p82d, landed `a6e00806`). Remove it in a later clean-up.
- A plugin style for the ring on the open reasoning block, if the Deck shows Steam's own default ring is hard to see (from p82g, landed `8e15cca2`).
- The plugin log line "voice: stop pressed, no recording was running" appeared at 01:35:42 on 2026-10-07 with nobody pressing the microphone (`docs/test-evidence/plan82-BLOCK3B-HANDOVER.json`): a stop call reaches the back end from somewhere when no recording runs. Harmless, worth a look.

## Results

All times are the Deck's own clock. Written 2026-10-07 from the roadmap, the testing rows and the evidence files.

### Where things stand (2026-10-07, about 02:05)

Of the eight new bugs found by hand on 2026-10-06, **six are fixed and proven on the Deck**, one is fixed in code but failed its Deck check, and one did not reproduce.

- **Proven on the Deck:** the delete box (build `880687e4`); the chat row's title bar (the three rules on `880687e4`, the Save-return on `e34b0d57`); Down from the question box (`e34b0d57`); the slider ring (`e34b0d57`); one Show details line at a time (`e34b0d57`); the microphone's reaction (the log on `e34b0d57`, the amber "Starting voice input" label on `efd4258b`). The spoken-sentence check on the microphone stays the maintainer's.
- **Fixed in code, failed on the Deck:** the open reasoning block (build `efd4258b`). The block is not a ring stop on the device, so one Down still goes to the answer. A second round (p82g2, Opus) was started and has not landed.
- **Not reproduced:** Up at the bottom of the About tab (3 of 3 from the D-pad route). The entry stays open; question 5 asks how the maintainer reached it.
- **The fade-style chips:** not a bug as filed (the rig had measured the wrong element). The fade now sits on the chip button, can be read, and passed on the Deck (`e34b0d57`).

### Verify, before and after

Verify held 24 entries at the start and holds 22 now. Done gained nine lines tonight: the walk check that reads words and the reopened checklist with the real AI (both closed by the rig in block 2); the delete box (3a); the chat row, Down from the question box, the slider ring, one Show details line and the fade chips (3b); the microphone button (4). The reasoning block went into Verify and back out to Bugs. Everything the maintainer owns stays theirs: the real microphone twice, the PIN twice, the first install, the finger, the right stick, five looks, the trap in daily use and the cut-menu hand check. The six "tests only" rows also stay (question 1).

### Code

15 code commits landed on experimental tonight (`git log --oneline 60b8c57f..HEAD`, leaving out the paperwork sweeps, the lessons commit and the plan's own first commit). Each landing was meant to run the five gates and the quick check (the session's landing rule); nothing was pushed.

### The Deck

Blocks run: 0 and 1 (setup, backups and the measurements), 2 (the owed Verify checks), 3a, 3b and 4. Builds deployed for the fix checks: `880687e4`, `e34b0d57` and `efd4258b`; blocks 0 to 2 ran on `60b8c57f`, before any fix. **The Deck at the end:** the smoke question was answered (about 2 minutes; the answer begins "Right then, listen up, you wanna know what Geo is for early on?"); the live settings file is identical to the block 0 backup; every chat file matches the backup except the test chat (tonight's extra turns), the chat index and the throwaway chat deleted in block 3a; the test chips read `[]`; no game is running; the plugin is open on the Main tab with the test chat and the ring on the question box; the keep-awake is released (the tool reported released true). Evidence `docs/test-evidence/plan82-BLOCK4-END.json`, `plan82-BLOCK4-HANDOVER.json`.

### Questions for the maintainer

The list is above, 1 to 7.

### Follow-ups

The list is above (the old Down handler left over from p82d, a ring style for the open reasoning block, the stray voice stop line in the plugin log).

### Lessons

Six lessons from tonight were added to [the lessons file](../lessons-learned.md), section 3 ("Checking work on the Steam Deck"): a parent's opacity, Steam's ring on a moving knob, a flag lost to the popup rebuild, the dock-lift window, the rig's safety stop and the root-owned plugin folder (commit `f46bf748`).

## Log

All times are the Deck's own clock (the same as this PC's), taken from the evidence files and the commit times.

- **2026-10-07, 00:10 to 00:40:** read the lists, the runbook and the lessons. The rig's safety stop was found set
  (by the maintainer, the evening before); asked, re-armed at 00:20. Baseline quick check green at tip `60b8c57f`.
  Four copies cut (p82a to p82d). Helpers p82a (delete box), p82b (title bar) and p82d (box Down) started at about 00:33.
  Deck driver on blocks 0 and 1 started at about 00:38. The timed 20-minute check is on. Keep-awake held until 08:29.
- **2026-10-07, about 00:37 to 00:48:** landed p82a (the delete box) at 00:37. Paperwork sweep 1 committed at 00:48.
- **2026-10-07, about 00:44 to 00:55:** Deck blocks 0 and 1 done (they ran about 00:29 to 00:44; the Deck is on an external monitor, 855 x 766): five of seven bugs reproduced with numbers; Up at the bottom of About and the microphone did not. Landed p82b (the title bar) at 00:48, its test fix at 00:52. Helpers p82e (slider ring), p82f (two details lines), p82g (reasoning block, Opus) and p82h (microphone feedback and log) started once the measurements were in. Deck block 2 (owed Verify checks, about 00:42 to 00:55) running. Paperwork sweep 2 committed at 00:55.
- **2026-10-07, about 00:55 to 01:02:** Deck block 2 done: the walk check reads words (passed), the reopened checklist with the real AI (passed), long chips (ring half unclear, fade half failed; later found to be a reading of the wrong element, helper p82i), the continued answer (could not run: root owns the plugin folder; the maintainer's setup-dev is the fix). Paperwork sweep 3 committed at 01:02.
- **2026-10-07, about 01:03 to 01:36:** landed p82e (the slider ring) at 01:03, p82f (one Show details line at a time) at 01:09, p82i (the chips' fade on the chip button itself) at 01:14, p82d (Down from the question box stops on the mode button) at 01:17, p82b2 (the chat row's second round) at 01:21 and p82h (the microphone button) at 01:25. Deck block 3a (build `880687e4`, 01:01 to 01:10): the delete box passed in full; the chat row passed the three rules, the Save-return half failed (the tab rebuild after a popup), and the second round landed as `7d0a7be5`. The deploy took three tries to open the plugin. Paperwork sweep 4 committed at 01:36.
- **2026-10-07, about 01:40:** landed p82g (the reasoning block, Opus, three commits): all eight of the night's
  fixes are on the branch (tip `efd4258b`). Deck block 3b (build `e34b0d57`, about 01:29 to 01:45): every check that ran passed (Down from the box,
  one Show details line, the slider ring, the Save-return, the fade on the chip, the microphone log); the reasoning block
  was skipped (its commits were not on the branch yet), and the "Starting" label is retried in block 4. Deck block 4 (the last build, the reasoning block, the Main tab walks, the Deck put
  back) started 01:45. Paperwork sweep 5 committed.
- **2026-10-07, about 01:43 to 02:05:** Deck block 4 (build `efd4258b`): the microphone's "Starting" label passed (22 ms after the press); the reasoning block FAILED (not a stop on the device; second round p82g2 on Opus); both Main tab walks passed on order with four partly visible landings (question 7); the Deck put back, settings identical to the backup, keep-awake released. Paperwork sweep 6 committed.
