# Testing manual: row history (archive)

Made 2026-09-24 during plan 65's trim of [testing-manual.md](../testing-manual.md). The checks in that
file that are still open, but carry a long dated history of earlier tries, keep only their current state
there and a short "History: …" link back here. Each section below is one such check's older history,
moved out word for word — nothing reworded, nothing dropped — so the live row stays short without losing
the record of what was tried, how it was measured, and which leads were ruled out.

## QA-FREE-PLAY-01

**Run 2026-09-05 on the fourth build of plan 32 (code `517804a`), after five focus fixes landed in one night:** a full Down/Up
sweep of the Main tab on a chat holding a blocked command reply walked 19 controls in 25 presses over two legs — the bar, the
chat slot row, the turn header, all four answer sections, Helpful, Retry, Open Permissions, the session context strip, Save chat
to Desktop, a chip, the Ask field and ask. **Every stop visible, no cycles, nothing focused behind the dock**
(`docs/test-evidence/QA-FREE-PLAY-01-build4-main-sweep.json`). Three of the stops carry no name of their own; all three are answer sections.
Not a substitute for the by-hand pass, which still owes the touchscreen and a streaming reply.
**A third sweep the same night**, on a Strategy reply about the Half-Life 2 antlions with an archived turn above it,
walked 13 controls in 17 presses — the *2 earlier* archive header, the question, the answer section, Helpful, Retry, the
session strip, a chip, the character button, the attach button and ask — again every stop visible and no cycles
(`docs/test-evidence/QA-FREE-PLAY-01-build4-strategy-reply-sweep.json`). That reply came back as one section, so the long-reply case the row
really wants is still owed.

**Run 2026-09-15 evening (plan 55), nothing running, a 1355-character reply on screen with a glossary word
in it:** 19 stops visited both ways, no dead end, no loop — the walk itself is clean. **But two stops FAIL this
row's own rule**, focused with part of the control hidden: the open question's row read only 78% visible,
covered by the Retry same-prompt icon in the turn's corner, on both legs of the walk; and the reply's last
answer section read 89% visible, covered by the copy icon in the bubble's corner, going down. Both are filed
as their own roadmap entries (the question row under the new ★ `[layout]` bug about the Retry corner icon; the
answer section as a further sighting on the existing copy-icon entry). The touch-screen half of this row still
needs a person. Evidence `docs/test-evidence/plan55-QA-FREE-PLAY-01-main-long-reply.json`.

**Run 2026-09-16 on build 0fbecb6, the built-in screen, a five-turn Portal 2 chat with its newest turn (the
`bonsai:vac-check` reply) expanded, no game running:** 17 distinct stops walked both ways (28 stops recorded
over 31 presses), no cycle, and Down and Up visit the same stops in reverse. Down leg: tab bar, chat slot row,
*5 earlier*, the Retry corner, the question row, the answer, Helpful, Read aloud, Show details, Session
context, Save chat to Desktop, the pinned chip, the question box, Ask. The only partly hidden stops are the
known corner-icon pair: the question row at 67%, behind the Retry corner icon, and the answer paragraph at
89%, behind the copy icon — both on both legs. Passed for this build with that known bug still open. Evidence
`docs/test-evidence/plan56-QA-FREE-PLAY-01.summary.json`, `docs/test-evidence/plan56-QA-FREE-PLAY-01-main-built-in-screen.json`.

**Run 2026-09-16 about 10:20 local on build `42aafe1`, the built-in screen, after the wave-2 landings (the
settings card's D-pad wiring, the Left holds, the restored-turn and greyed-thumb fixes, the honesty line):**
an eleven-turn chat whose newest turn is a stopped Deep Rock Galactic Survivor guide reply with greyed
thumbs, no game running, empty box. Down leg: Read aloud, Show details, Session context (11 turns), the
suggestion chip, the question box, Ask, which holds. Up leg: Ask, Voice input (the box's corner), the
question box, the chip, Session context, Show details, Read aloud, the answer's last chunk, then the chunk
above it — two Up presses there moved the view rather than the ring, which is what ended that leg. No trap
and no loop anywhere on the walk; every named control is reachable both ways. The only stops not fully
visible are the tall answer chunks: the last one 67% visible under the suggestion chip, the one above it 33%
visible, part above the top of the window and part under the dock — the same shape the block-0 sweep on the
older build already showed, so nothing landed this session made the Main tab worse. Evidence
`docs/test-evidence/plan56-QA-FREE-PLAY-02.summary.json`.

**Run 2026-09-17 on the built-in screen, bundle `af52c0aa` (plan 57, the reasoning display):** a full walk from
the top of the chat down through the new reasoning fold row, the answer and the dock came back clean — no
dead ends, no loops, every control reachable both ways. It re-found two already-known spots where part of a
control is hidden behind a small icon (the question row behind the Retry icon, an answer section behind the
copy icon), neither one new. Two legs of this row's own instructions could not be run: another carousel
position (LB/RB), because this build ties LB/RB to switching the top-level tab strip, not a carousel; and the
repeat once the reply finishes, because the reply used had already finished streaming before the walk began,
so the streaming-to-finished transition itself was not walked. Evidence
`docs/test-evidence/plan57-QA-FREE-PLAY-01.json`.

**Run 2026-09-18 on build `6d5b83f`, the built-in screen, a finished long battery-life reply in a
fresh chat, nothing running:** 33 distinct stops walked both ways over 60 presses and four legs, no
cycle, no dead end. Six stops read only partly visible, all of them tall answer-text sections either
running above the top of the window or under the copy icon in the reply's corner — the same shape
the 2026-09-16 and 2026-09-17 runs already recorded, nothing new. The walk while the reply was still
streaming was not run tonight (the time went to the cache-clear attempt instead), so the streaming
half stays owed. The shoulder buttons switched the plugin's own tab during the sweep, the same as
2026-09-17. Evidence `docs/test-evidence/plan61-QA-FREE-PLAY-01.json`,
`runs/plan61-QA-FREE-PLAY-01-finished.json`.

**Owed for plan 59 (the open tab strip redesign, landed 2026-09-17):** every tab's strip layout
changed, so this sweep needed to run again once the strip was on the Deck. **Run once on the strip
build 2026-09-18** (the after-finished half, see the run above); the streaming half ran later the same
night and failed — see below.

**Run 2026-09-18 on build `0589565`, the streaming half:** walking a reply with the D-pad while it was
still being written lost the highlighted control — the view kept following the new text, and the
highlighted control scrolled off screen with it. Six of the eight stops the ring visited were not
visible, and the walk back down looped back on itself instead of reaching the bottom. This is no longer
owed; it is failed, and a new bug now carries it. Evidence
`docs/test-evidence/plan61-QA-FREE-PLAY-01-streaming.json`.

**Run 2026-09-23, the streaming half, a fix for the 2026-09-18 failure now on the build (`7b9447e`):** still
unclear, no loop seen. The first six stops walked were fully visible; the one answer section reached while
text was still arriving was 465 pixels tall and only 33% visible; the reply finished about 13 seconds into
the walk, so this one stop cannot judge whether the fix holds — a longer streaming reply is needed to
settle it. Evidence `docs/test-evidence/plan64-QA-FREE-PLAY-01-streaming.json`.

**Run 2026-09-23, the finished half, same build:** no loop; Down and Up visited the same 20 stops in
reverse, and the two known false alarms (the question row behind the Retry icon, an answer section behind
the copy icon) read 89% visible, as before. **A new problem found on this walk:** two tall answer sections,
308 and 375 pixels, were only 33% visible whichever way the walk reached them, and the view showed the
lower end of the first one rather than its start — filed as a new roadmap bug. This row stays open on that
new bug. Evidence `docs/test-evidence/plan64-QA-FREE-PLAY-01-finished.json`.

**Run 2026-09-23, the streaming half again (try 2), same fix on the build:** still unclear. The answer
finished only 15 seconds after its first words, so just one stop happened while text was still arriving;
at it (the chat row) the view stayed still — same position, same 100% visible — while the answer grew from
667 to 773 characters between two reads a second apart. Right as the reply finished, a second stop (the "40
earlier" pill) landed the ring correctly but found the view already jumped to the very end of the answer,
leaving the ring 656 pixels above the screen — filed as a new bug, since the same press with nothing being
written shows the pill normally. A longer, slower-finishing reply is still needed to walk three stops while
streaming, as the row asks. Evidence `docs/test-evidence/plan64-QA-FREE-PLAY-01-streaming-try2.json`.

**Run 2026-09-23, a recorded walk purpose-built for the streaming half (STREAM-WALK-REC-01):** with the
ring already inside the answer, the view held its scroll position still (431) while the scrollable height
grew from 750 to 1,060 pixels as the answer kept arriving — the first real Deck proof that the streaming fix
(`7b9447e`) holds. This row's streaming half is now passed on that hold. Two narrower problems came out of
the same recording, both filed separately: with the ring on the chat row instead of inside the answer, the
view followed the growing answer and carried the row off the top of the screen (already fixed the same
night); and at the exact moment an answer finishes while it is being walked, the ring can vanish completely
and the view jumps to the very end. Evidence
`docs/test-evidence/plan64-STREAM-WALK-REC-01.json` (+ `.png`).

**Run 2026-09-23 (try 3), the vanishing-ring half, with fix `97cde97` now on the build:** still FAILED —
the ring vanished the same way at the finish and the view jumped to the end again. The real cause was found
and fixed the same night, `64b34a8`: the answer bubble drew itself bare while streaming, then was wrapped
with its Copy button once it finished, so the bubble changed shape at the exact moment the ring needed it
to stay put and got rebuilt from scratch; its sections were also tracked by what kind of piece they were
rather than where they sat. Both are fixed now. Owed: the same walk on the Deck, scheduled in flow H
(**H4**). Evidence `docs/test-evidence/plan64-STREAM-WALK-REC-01-try3.json` (+ screenshots).

**Run 2026-09-23 (try 4), H4 in flow H, PASS.** With the ring walked onto the answer's first section while
it was still being written, at the finish the ring stayed on that same section (now numbered 1 of 3), the
view held the same scroll position (228 of 1647) for the next 20 seconds, and it did not jump to the end.
Two small things for later, not a fail: right at the finish the section's own top few pixels sat under the
tab bar (about two thirds of it visible), and the recorded scroll position read its old value for one
single frame before settling. This row's vanishing-ring case, the one this recorded walk exists to check,
is now closed. Evidence `docs/test-evidence/plan64-STREAM-WALK-REC-01-try4-run2.json` (the first attempt
this pass was refused by Claude Code's own permission check before any press reached the Deck,
`docs/test-evidence/plan64-STREAM-WALK-REC-01-try4.json`).

## SMOKE-C

**Blocked 2026-09-03:** the deny surface's *Open Permissions* button is not reachable by D-pad (roadmap Bugs, filed 2026-09-03), so the jump and the *Back to …* return cannot be driven until that is fixed. The deny half itself passes: `bonsai:vac-check` with Steam ban lookup off answered with the capability message and made no Ollama call.

**Fixed at the desk 2026-09-04, Deck check owed:** the button is a genuine D-pad stop now and joins the reply row's Down/Up chain — see PERM-JUMP-01 below.

**FAIL (Deck) 2026-09-16, build 0fbecb6:** the button is a real D-pad stop now and A on it does reach the Permissions tab — but the highlight lands one row above the toggle it was asked for: **Save files to Desktop** instead of **Steam ban lookup**. Evidence `docs/test-evidence/plan56-PERM-JUMP-01-open-permissions.json`, with the setup and restore steps in `docs/test-evidence/plan56-SMOKE-C-01-toggle-off.json` and `docs/test-evidence/plan56-SMOKE-C-02-toggle-back-on.json`. The **Back to …** return half is recorded separately and stays owed. Filed as its own one-star focus bug on the roadmap.

## PERM-JUMP-01

**Blocked 2026-09-03:** the deny surface's *Open Permissions* button is not a D-pad stop (roadmap Bugs, filed 2026-09-03), so no row here can be driven until that is fixed.

**Fixed at the desk 2026-09-04, Deck check owed:** `PermissionDenyAction`'s button and the troubleshooting Ask hint's button are genuine D-pad stops now (`focusable`), and both join the reply row's Down/Up chain — Down from Retry/Show details/Copy reaches whichever is mounted, Down from it reaches the session context strip, and Up returns either way. Expect: Down from Copy lands on **Open Permissions**, visible; the jump and *Back to …* halves below still need a device pass.

**FAIL (Deck) 2026-09-16, build 0fbecb6, Steam ban lookup row:** A on **Open Permissions** does open the Permissions tab, but the highlight lands on **Save files to Desktop**, one row above the **Steam ban lookup** toggle it was asked for (`docs/test-evidence/plan56-PERM-JUMP-01-open-permissions.json`). Setup (toggle off) and restore (toggle back on) steps: `docs/test-evidence/plan56-SMOKE-C-01-toggle-off.json`, `docs/test-evidence/plan56-SMOKE-C-02-toggle-back-on.json`. The **Back to …** return half is recorded separately and stays owed.

**FAIL (Deck) 2026-09-17, worse than the 2026-09-16 run:** Open Permissions now opens the Permissions tab at the very top, on the **Back to Main** button itself, nowhere near the toggle it should land on. **Back to Main** still works. Evidence `docs/test-evidence/plan57-QA-PERM-JUMP-01.json`.
