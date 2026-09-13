# SPOILER-DPAD-01: the D-pad intercept is dead code on device — measured 2026-08-27

One session, one finding that changes where the fix goes, and a list of everything that got in
the way of running it — with what to do about each — so the next device session starts at the
walk instead of at the plumbing.

## Verdict

The spoiler fence is still unreachable by D-pad on device, with both prior fixes provably
loaded and provably intact. The cause is not any of the code inside the navigation intercept —
it is that **the intercept never runs on device at all**.

## Fixed the same day — and confirmed on device

The fix direction below was implemented and confirmed on 2026-08-27, same session: the
header, the bubble, and every section stop now carry `Focusable` `onMoveDown`/`onMoveUp`
(with `onButtonDown` demoted to string-only presses per focusNavigation.ts's pairing rule),
and the dead keydown intercept in MainTabChatTranscript.tsx is deleted. Deployed via
`build.ps1`, loader restarted, same rig and same ocarina question: DOWN from ask → header →
**the fence takes the ring** (`runs/SPOILER-REVEAL-AFTER-onmove-fix.json`, `neverReached: []`,
reproduced on a second pass), and **A reveals it** — masked fences 1→0, revealed 0→1, read
from the page after the press. Two residues observed, both cosmetic: one DOWN press is
absorbed on the fence before the next moves on (the offered-once diversion plus a scroll step
that moves nothing), and after an A-reveal the ring is momentarily unowned while the chunk
re-renders (the next press re-places it). B-over-fence and the revealed *tap to hide* control
were not exercised by script — that residue is in the testing.md row.

## What was proven before the walk (the 08-26 run could prove none of these)

| Claim | How it was proven |
|---|---|
| The fixed build is what the QAM is running | `md5sum` identical local vs `~/homebrew/plugins/bonsAI/dist/index.js`, then `plugin_loader` restarted via `deck_reloadPlugin`, then the panel reopened |
| A masked fence was on screen during the walk | Read live: `.bonsai-spoiler-reveal-target`, 238×57px, in viewport, inside the scroller, `tabindex="0"` |
| The 08-23 `<pre>` fix holds | `fence.closest("pre")` null on device; `pre.bonsai-md-fenced-pre` count 0 |
| The presses were real | ESP32 bridge acks (`usb-hid:bridge`), not synthetic events |

Turn under test: the ocarina story-twists frozen chip question, injected with
`deck_send_ask.py`, submitted by a real A press on the ask button. Strategy mode,
`gemma4:e2b-it-qat`, no game running.

## The two measurements

**1. The walk (`runs/SPOILER-REVEAL-AFTER-fix-v2.json`).** DOWN ×10 from the ask button:
ask → question echo (turn header) → Helpful → Retry → Show diagnostics → Session context →
Save chat. `never reached: Spoiler`. Identical, stop for stop, to the pre-fix walk.

**2. The event log — the decisive one.** With the ring parked on the turn header, a passive
capture-phase `keydown`/`keyup` listener was installed on `document`, one real DOWN was
pressed through the bridge, and the log was read back: **zero events**, while the ring moved
header → Helpful.

So Steam routes gamepad D-pad through its own internal focus tree and never dispatches DOM
keyboard events into the plugin. Everything gated on those events is dead on hardware:

- the whole intercept at `MainTabChatTranscript.tsx:269-309` (`col.addEventListener("keydown", …)`),
- the header→bubble entry edge (`focusAnswerBubbleAfterHeader`) inside it,
- the masked-fence diversion (`invokeAnswerBubbleMoveDown` → `handleAnswerBubbleMoveDown`) inside it,
- and transitively, on this path, the `68caa4d` ring-not-activeElement fix — correct code
  that this listener is the only caller of here.

Under vitest the listener fires, because tests dispatch real `KeyboardEvent`s. **That is the
recurrence engine:** every fix in this subsystem tested green where keyboard events exist and
shipped to a device where they do not.

## Supporting observations

- Every element involved is focus-capable: turn header, bubble, all three answer chunks
  (`.bonsai-answer-stop`), and the fence itself all carry `tabindex="0"` and the `Focusable`
  class. Not a missing-Focusable bug.
- Steam's **default** navigation is asymmetric here: UP from Helpful enters the bubble (one
  stop, chunk 0) before the header; DOWN from the header skips the entire bubble. The fence
  chunk (chunk 1) takes the ring in neither direction.
- The completed turn renders as a *history* turn (`bonsai-chat-turn-row-header--history`);
  the fence lives in chunk index 1 of 3 inside `.bonsai-chat-ai-bubble-inner`
  (`data-bonsai-answer-key` present and correct — the registry side looks healthy).

## Fix direction (not implemented this session)

Wire the same edges through Decky `Focusable` navigation props (`onMoveDown`/`onMoveUp`),
which Steam does honor — it is the mechanism behind every fix in this subsystem that has
survived an on-device check (ContextChipLadder stepping, the ask bar graph,
`liveTurnFocusGraph`). Candidate sites: the turn header element (`buildTurnHeaderElement`)
gets `onMoveDown` → the bubble entry; the chunk/bubble Focusables get `onMoveDown`/`onMoveUp`
→ the stop chain with the fence diversion. The keydown intercept can then be deleted rather
than kept as a desktop-only twin — two code paths for one graph is how the next regression
hides.

Add to `scripts/check-focus-patterns.mjs`: a rule flagging D-pad routing implemented via DOM
keyboard listeners (`addEventListener("keydown"` reachable from `src/` outside tests, feeding
`isDownNavigationEvent`/`isUpNavigationEvent`). Same lesson as the `ring-question` rule: match
the question, not the syntax.

## Rig blockers hit this session, with solutions

1. **Controller bridge unplugged → every press tool refuses.** Symptom: `pad.py` cannot open
   the COM port. Solution: replug (worked immediately). For next time: `deck_status` does
   *not* report bridge health — send one harmless direction press as the first act of any
   device session; the refusal message is loud and the fix is physical. (Upstream nicety:
   bridge state in `deck_status`.)
2. **`deck_captureScreenshot` broken** — the DPS *source build* that `.mcp.json` now points
   at (since `d98a97a`) is missing `dist/scripts/deck/studio-capture-common.sh` /
   `studio-capture.sh`. The DPS build step does not copy capture scripts into `dist`.
   Solutions: rebuild/copy the scripts in the DPS tree (upstream fix belongs in DPS's build);
   fallback that works today: `scripts/screenshot-deck.ps1` in this repo.
3. **`deck_send_ask.py`'s documented invocation silently truncates multi-word questions.**
   `ssh deck@ip 'python3 -' < script --text "multi word"` puts `--text "multi word"` outside
   the quoted remote command; ssh rejoins and the remote shell re-splits, so argparse keeps
   only the first word — and the script's VERIFIED line then honestly confirms the *truncated*
   write. Fixed in the docstring this session: quote the whole remote command,
   `ssh deck@ip 'python3 - --text "multi word question"' < scripts/deck_send_ask.py`.
4. **Pressing A on the chip carousel did nothing** when the ring sat on a 60×57 sub-element
   with no text of its own (matched via the container's text). The chips proper each take
   focus and carry their question text. Rule: before pressing A on a chip, confirm the focused
   element's *own* text is the question. Worth a look someday: what that empty focusable
   sub-element in the carousel is.
5. **`deck_waitFor` reported `satisfied: false` with a truthy final `value`, twice** — once
   with an object, once with a plain boolean `true`, so "return plain booleans" is not the
   workaround it first looked like. Either both replies genuinely finished right at the
   deadline (~3 min generations make that possible) or the tool mis-detects satisfaction;
   not separable from here. Treat `value` as the finding — the tool's own advice — and
   follow a timed-out wait with a direct `deck_readPage` before concluding anything.
6. **`deck_openPlugin` fails when the panel is already open** ("walked 1 control(s) without
   finding bonsAI" — it is *inside* bonsAI). Read the failure's own focus payload before
   retrying; ring inside plugin content means proceed.
7. **Sequencing after `deck_reloadPlugin`:** the QAM content div does not exist until the QAM
   is reopened — do not wait on plugin DOM before opening it (one full `deck_waitFor` timeout
   burned learning this).

## Session facts

Deck at 192.168.86.52, SteamOS, Chrome/126 CEF. Corpus and settings untouched. Two turns were
added to the chat transcript on device (one from last night's rig work, one from this run) —
they live in chat slots like any QA turns. The keydown logger was removed from the page after
the measurement.
