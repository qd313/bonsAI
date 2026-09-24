# bonsAI testing — manual (Deck / maintainer)

> **Trimmed 2026-09-24 (plan 65).** Checks that passed on the Deck, or were retired or superseded,
> moved word for word to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md). The
> older dated history behind long-running open checks moved word for word to
> [testing-manual-history-2026.md](archive/testing-manual-history-2026.md), with a short link left on
> the live row.

On-device QA only. Automated gates: [testing-automated.md](testing-automated.md). Hub + slim coverage: [testing.md](testing.md). Roadmap: [roadmap.md](roadmap.md) (items fixed but not Deck-confirmed sit in its Verify section).

Record **build id / git SHA** and **SteamOS** when marking Pass / Partial / Fail.

**The short list of what only the maintainer can settle** — a finger on the glass, a secret only they
hold, or a matter of taste — lives as a tickable page:
[Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
Sessions add to it rather than leaving such a finding in a chat. The rows it names stay the authority;
the page is the maintainer's view of them.

Historical full checklist (pre–2026-07-30 split): [archive/testing-full-pre-2026-07-30.md](archive/testing-full-pre-2026-07-30.md).

---

## Tags

| Tag | Meaning |
|-----|---------|
| **P0–P3** | Importance — P0 = core; P3 = polish |
| **S0–S3** | Setup cost — S0 = BPM + Ollama; S3 = reboot / clean install |
| **Tier 0–4** | Run order — finish lower tiers first unless PR-scoped |

---

## Test title pool

The games QA rows reach for, and what each one is actually covering. Rows below name these by
AppID; keep new rows inside this pool unless a title is the thing under test, so a Deck session
does not need a different library every week.

| Title | AppID | Covers | Why this one |
|---|---|---|---|
| Deep Rock Galactic: Survivor | `2321470` | KB corpus hit, session RAG chips, `low_narrative` spoiler profile | The only title the seed corpus covers by entity (`Glyphid Dreadnought`, `Hollow Bough`) |
| Hades | `1145360` | `protect_progression`, named-entity consent | Shares the `roguelike` genre with DRG Survivor, so it is the genre over-relax guard |
| Left 4 Dead 2 | `550` | `low_narrative`, KB compat routing | Cheap to install, always in the library |
| **Black Mesa** | `362890` | **`unknown` spoiler profile**, Proton/Source compat, cold-model thinking phases | **The gap the pool had.** Every other title above is classified in `spoiler_title_profiles.py`; most of a real user's library is not, and `unknown` was untested on device. Also a Source-engine title with real Proton behaviour, so it exercises `proton_logs` without contriving a crash |

**Black Mesa is deliberately not added to `spoiler_title_profiles.py`.** Adding it would defeat the
reason it is in the pool — it is here to exercise the unclassified path a real library mostly hits.
It is a linear story campaign, so if a QA pass shows the `unknown` default is too loose for
story-shaped titles, that is a finding about the default, not a reason to special-case this AppID.

---

## Standing row: the free-play sweep

**QA-FREE-PLAY-01** — run after ANY change to the Main tab's layout, scrolling, focus graph, or
the dock, before the change is called verified. Standing rule from the maintainer 2026-08-31,
after two bugs in two days that every scripted check passed and free use found in seconds.

Emulate a user, not a test plan: with a LONG reply on screen —

1. Scroll around the reply (up into it, back down), then D-pad walk from the top of the pane to
   the very bottom, one press at a time — through the answer, its trailing chips (Show details /
   Copy / Helpful / branch buttons), the session context strip, into the dock, to ASK.
2. At **every** stop, two checks, and both must pass — they are different facts:
   - **Focused** — the ring is on the control (`deck_readFocus` / walk result).
   - **Visible** — a person could see it: the focused rect sits inside the pane AND above the
     dock's top edge, and an `elementFromPoint` probe at the rect's centre hits the control
     itself, not something covering it (`deck_readPage`).
3. Repeat the walk on at least one other carousel position (LB/RB), and once more after the
   reply finishes if it was streaming.

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

A stop that is focused but not visible is a **FAIL of this row**, whatever the scripted rows say.
This is the manual interim for the DPS visibility oracle + `deck_sweep`
(decky-plugin-studio `docs/planning/06-visibility-oracle-and-free-play-sweep.md`); when that
ships, this row becomes one tool call diffed against a committed baseline, and this row's wording
becomes its acceptance test.

---

## Focus graph (mandatory before shipping new controls)

Policy: `bonsai://policy/decky-ui-focus`. Patterns: `bonsai://architecture/focus-graph-patterns`.

- [ ] **FOCUS-GRAPH-01** Every focus stop listed in the section parent
- [ ] **FOCUS-GRAPH-02** D-pad Up/Down reaches each stop (no skips)
- [ ] **FOCUS-GRAPH-03** Sliders / horizontal groups: Left/Right on the **focus owner** (bridge if needed)
- [ ] **FOCUS-GRAPH-04** Cross-section links via parent refs
- [ ] **FOCUS-GRAPH-05** Coverage note in [testing.md](testing.md) (template: **UI-SCALE-05**)

References: `SettingsTabUiScaleSection.tsx`, `OllamaTab.tsx`, `PullModelsModal.tsx`. **The reasoning display's fold
row** (`show-reasoning`, a new stop between Retry and the answer, plan 57) adds: `MainTabChatTranscript.tsx`,
`replyStopRegistry.ts`, `liveTurnFocusGraph.ts`. **PASS (Deck) 2026-09-17, bundle `af52c0aa`:** the fold row
sits cleanly in the D-pad path — reachable from the question and the answer on both sides, always above the
dock, and backing out with Up three times lands safely on the chat-slot row with no dead end. Reaching it
going down from the Retry icon takes one extra press, since the question's own row is a stop in between —
see REASONING-02. Evidence `docs/test-evidence/plan57-FOCUS-GRAPH-01.json`.

---

## Cross-cutting smokes

| ID | Name | Tier | Setup | Covers |
|----|------|------|-------|--------|
| **SMOKE-A** | Golden path | 0 | S0, BPM | Shell, tabs, Ask, connection, D-pad chunks, presets |
| **SMOKE-C** | Permission gate | 0 | S0 | Capability blocked-action toast |
| **SMOKE-F** | Deterministic commands | 0 | S0, no model | Sanitizer, shortcut-setup, vac-check off |
| **SMOKE-B** | TDP apply 8W — retired 2026-09-03, D57 #6: TDP apply was removed 2026-07-30 | — | — | — |
| **SMOKE-E** | Strategy one-shot | 1 | S1 | Mode, spoilers, Spoilers OK Tap-to-reveal PASS (Deck) 2026-09-04. |
| **SMOKE-D** | Frozen carousel triple | 1 | S1 | Presets troubleshooting — **verified** |
| **SMOKE-G** | Vision attach once | 1 | S1, Media | Attach + multimodal — **verified** |
| **SMOKE-H** | Background Ask reopen | 1 | S1 | Close QAM while pending → restore |

**Tier 0 (~15 min):** A → C → F · **Tier 1 (~20 min):** E → confirm D/G → H

---

## Tier 0 — Quick wins (S0)

BPM (Desktop → Big Picture → QAM → bonsAI). Ollama reachable.

### SMOKE-A — Golden path (P0)

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).


### SMOKE-C — Permission gate (P0)

**Blocked 2026-09-03:** the deny surface's *Open Permissions* button is not reachable by D-pad (roadmap Bugs, filed 2026-09-03), so the jump and the *Back to …* return cannot be driven until that is fixed. The deny half itself passes: `bonsai:vac-check` with Steam ban lookup off answered with the capability message and made no Ollama call.

**Fixed at the desk 2026-09-04, Deck check owed:** the button is a genuine D-pad stop now and joins the reply row's Down/Up chain — see PERM-JUMP-01 below.

**FAIL (Deck) 2026-09-16, build 0fbecb6:** the button is a real D-pad stop now and A on it does reach the Permissions tab — but the highlight lands one row above the toggle it was asked for: **Save files to Desktop** instead of **Steam ban lookup**. Evidence `docs/test-evidence/plan56-PERM-JUMP-01-open-permissions.json`, with the setup and restore steps in `docs/test-evidence/plan56-SMOKE-C-01-toggle-off.json` and `docs/test-evidence/plan56-SMOKE-C-02-toggle-back-on.json`. The **Back to …** return half is recorded separately and stays owed. Filed as its own one-star focus bug on the roadmap.

- [ ] Turn a capability **off** → blocked action → **Open Permissions** (or troubleshooting hint button) → lands on matching toggle → **Back to …** returns → no crash
- [ ] Re-enable before Tier 1

### PERM-JUMP-01 — Permission jump D-pad (P0)

Capability off for each row; trigger the deny surface; D-pad to **Open Permissions** → Permissions tab → matching toggle focused → **Back to …** → prior tab.

**Blocked 2026-09-03:** the deny surface's *Open Permissions* button is not a D-pad stop (roadmap Bugs, filed 2026-09-03), so no row here can be driven until that is fixed.

**Fixed at the desk 2026-09-04, Deck check owed:** `PermissionDenyAction`'s button and the troubleshooting Ask hint's button are genuine D-pad stops now (`focusable`), and both join the reply row's Down/Up chain — Down from Retry/Show details/Copy reaches whichever is mounted, Down from it reaches the session context strip, and Up returns either way. Expect: Down from Copy lands on **Open Permissions**, visible; the jump and *Back to …* halves below still need a device pass.

**FAIL (Deck) 2026-09-16, build 0fbecb6, Steam ban lookup row:** A on **Open Permissions** does open the Permissions tab, but the highlight lands on **Save files to Desktop**, one row above the **Steam ban lookup** toggle it was asked for (`docs/test-evidence/plan56-PERM-JUMP-01-open-permissions.json`). Setup (toggle off) and restore (toggle back on) steps: `docs/test-evidence/plan56-SMOKE-C-01-toggle-off.json`, `docs/test-evidence/plan56-SMOKE-C-02-toggle-back-on.json`. The **Back to …** return half is recorded separately and stays owed.

**FAIL (Deck) 2026-09-17, worse than the 2026-09-16 run:** Open Permissions now opens the Permissions tab at the very top, on the **Back to Main** button itself, nowhere near the toggle it should land on. **Back to Main** still works. Evidence `docs/test-evidence/plan57-QA-PERM-JUMP-01.json`.

**PASS (Deck) 2026-09-23, fixed in `af53b7d`, timed to the millisecond (plan 64, flow E):** the ring reached the **Read game & screenshot context** switch 2,736 ms after pressing **Open Permissions** — then was still pulled away to **Back to Main** 22 ms later, the same wrong landing as before — but this time came back to the switch about 100 ms after that and stayed there for the rest of the 11.6-second recording. A person would at most see a brief flicker through **Back to Main**, not land on the wrong row. Evidence `docs/test-evidence/plan64-PERM-JUMP-01-try2.json`.

| Capability | Deny surface | Expected toggle |
|------------|--------------|-----------------|
| `media_library_access` | Attach recent screenshot (browser empty / error) | Read game & screenshot context |
| `steam_logs_read` | Troubleshooting Ask hint on Main | Read game & screenshot context |
| `filesystem_write` | Save note to Desktop / Developer app-log row | Save files to Desktop |
| `microphone_access` | Ask bar mic / Settings → Voice install | Voice input (microphone) |
| `steam_web_api` | `bonsai:vac-check` reply banner | Steam ban lookup |

- [ ] D-pad: deny **Open Permissions** → Permissions toggle → **Back** without losing modal tab-restore behavior elsewhere

### ONBUTTONDOWN-AUDIT-01 — onButtonDown whitelist + direction handlers (P1)

Wave 4 G — confirm D-pad directions do not trigger A-only actions; direction handlers fire on device.

**Deck result 2026-09-03:** Left on the Reply style, keep-alive and custom-timeout sliders steps the value once and then lets the ring leave the plugin to the Quick Access rail; Right steps and stays. See [testing.md](testing.md) and the roadmap Bugs entry.

- [ ] Collapsed **Context used · tap for details** hint: D-pad **Down** past it does **not** expand; **A** expands
- [ ] Session context strip open: D-pad **Down** through turn rows does **not** change active row; **A** selects row
- [ ] Expanded turn **Show details** link: D-pad past without **A** does not change session highlight
- [ ] Collapsed turn header: **Down** enters answer bubble (section walk)
- [ ] Settings → UI scale manual profile bridge: **Left/Right** steps profile when focused on slider thumb

**This row decides an open question, so record what happens rather than just pass/fail.** Wave 4 G
removed `onMoveLeft`/`onMoveRight` from `buildDeckThumbNavHandlers` and the UI-scale bridge, leaving
`onButtonDown` as the only horizontal path — while *keeping* `onMoveUp`/`onMoveDown` on the same
object. Both cannot be right: the old string predicates provably never matched a `GamepadEvent`
(`focusNavigation.test.ts` asserts it), so before Wave 4 the `onMove*` handlers were doing all of the
work, and "redundant twins" was the one thing they could not have been. Watch for two distinct
failures:

- [ ] **Nothing happens** on Left/Right → `onButtonDown` is not reaching the thumb; restore the
      `onMove*` handlers and drop the direction branch of `onButtonDown` (not both — they double-step)
- [ ] **Two steps per press**, or the profile steps *and* focus jumps off the slider → `onButtonDown`
      fires but does not consume the direction the way `onMoveLeft` did; the bridge needs to swallow it
- [ ] All four `DeckFocusSlider` users, not just UI scale — **Ollama keep-alive**, **Reply verbosity**,
      **Connection timeout** share `buildDeckThumbNavHandlers` and changed with it

**Fixed at the desk 2026-09-04** for all four sliders — the three `DeckFocusSlider` consumers
(**Ollama keep-alive**, **Reply verbosity**, **Connection timeout**) and the **Settings → UI scale
manual profile bridge** (the last bullet in the row above). It was the second outcome above: both
`buildDeckThumbNavHandlers` (`DeckFocusSlider.tsx`) and the UI-scale bridge's own `bridgeSliderNav`
(pulled out into an exported `buildUiScaleBridgeNav`, `SettingsTabUiScaleSection.tsx`) now step on
`onMoveLeft`/`onMoveRight` and return `true` to claim the move, with no direction branch left in
`onButtonDown` to double-step. Deck check owed: re-run the slider half of this row and confirm Left
stays on the slider on all four.

### DOC-SWEEP-01 — global document realm fixes (P1)

Wave 4 H — confirm each path works on-Deck (SharedJSContext vs QAM popup document).

Re-run 2026-09-03 after plan 30: Settings Up lands on the bar; full sweep every stop visible (`docs/test-evidence/DOC-SWEEP-01-settings-free-play.json`).

- [ ] Submit Ask: focused field blurs before send (keyboard focus does not stick mid-Ask)
- [ ] Attachment row: **Right** from preview → remove button; **Left** back
- [ ] Preset carousel: auto-advance pauses while a chip has D-pad focus
- [ ] About → GitHub link: **Up** focuses reply-language dropdown
- [ ] Settings/Ollama: **Up** at panel top returns to active tab strip
- [ ] **Do the blur and attachment-row checks on the very first Ask of a fresh plugin open**, before
      any answer has rendered. Until 2026-08-07 the document was learned only from the answer-bubble /
      answer-stop / spoiler-fence registries, so everything above worked from the second Ask onward
      and silently used the wrong document on the first. `BonsaiPluginShell` now seeds it at mount;
      this is the check that proves it.
- [ ] Expand collapsed history turn: header scrolls into view

### PRESET-STREAM-ANIM-01 — decode preset chip animation (P1)

Ghost in the Shell chip decode (2026-08-28) — replaces the old `stream` typewriter mode; row
kept its id since it is testing the same slot in the mode list. Developer tab → Preset
suggestions → **decode**.

- [ ] Each chip arrives as a full-width block of scrambled green glyphs (not a growing/reflowing
      string — the chip's width should look settled from the first frame, not still catching up)
- [ ] Glyphs lock into the real prompt left to right behind a blinking block caret, green (accent
      colour, not a different hardcoded green)
- [ ] Chips stay D-pad focusable while glyphs are still churning (A selects the full prompt, not
      whatever is on screen mid-churn)
- [ ] After hold, chip clears and samples a new prompt
- [ ] With OS **prefers-reduced-motion: reduce**, chips swap instantly (no scramble, no caret)

**Judged good by the maintainer 2026-09-14**, which is what this row was waiting on. The boxes above that
are still empty were never walked one by one; the measurement on 2026-08-28 covered the frame rate and the
ring during churn. See the row in [testing.md](testing.md).

### SMOKE-F — Deterministic commands (P2)


**Re-confirmed together (rig) 2026-09-17:** all four built-in commands answered at once with the same fixed
wording each carries above. Evidence `docs/test-evidence/plan57-QA-SMOKE-F.json`.

---

## Tier 1 — Core shipped (S1)

### SMOKE-B — TDP apply 8W (retired)

Retired 2026-09-03 under D57 #6: it tested TDP apply, which was removed 2026-07-30, so there is nothing left to run.
Tier 1 now starts at SMOKE-E; the ID stays so older links still resolve.

### SMOKE-E — Strategy one-shot (P1)

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).


### SMOKE-H — Background Ask reopen (P1)

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).


### Tier 1 extras

- [ ] "What game am I playing?" with game focused — still owed; needs a game running, scheduled for the games block.

---

## Tier 2 — Opt-in (run when touching related code or before RC)

| Block | Checklist |
|-------|-----------|
| **VAC matrix** | VAC-02…06 below (preview PASS; on-Deck still in QA backlog) |
| **Proton logs** | PROTON-LOG-01…03 — auto-attach when **Read game & screenshot context** is on (troubleshooting Ask + AppID) |
| **Permissions cleanup** | PERMS-CLEAN-01…06 — About/Steam links no gate; no Open web links / Adjust power limits toggles; no journal / intent-pack / Response verification UI; troubleshoot hint dismissible |
| **Token streaming** | STREAM-01…05 spot; Strategy spoiler stream if flag on. **After Phase A (2026-08-07):** re-run STREAM-01/02 (P2/P3 changed the flag-off path), and STOP-PARTIAL-01 with real streamed text — Stop must keep the drafted answer under a *"Stopped — partial answer kept."* line, and must return the question to the ask field when nothing readable had arrived |
| **Token streaming — D-pad chain** | **STREAM-09**, rewritten for Phase B (2026-08-07). **D-pad only, no touch.** Long Strategy answer with streaming on: Down from the turn header steps into the answer and then through it **one section at a time**, each landing visibly marked (blue left edge); Down at the last visible section scrolls, and the next press lands on what it revealed; Down past the end reaches the reply actions and Up from the first section reaches the header — **no dead ends**; a masked spoiler is offered before the walk passes it, and **A on a spoiler wait chip must not unmask**; a section arriving mid-stream does not steal focus; the same walk works on a collapsed-then-reopened history turn. **Check after a QAM close/reopen and while the answer is still growing** — nested-Focusable survival at this count is the one unproven thing in Phase B. Full row and the fallback if it fails: [testing.md](testing.md) **STREAM-09 PASS (Deck) 2026-09-04:** three `.bonsai-answer-stop` sections on one reply, each `tabindex="0"`, each taking the ring in turn going Down. Note Up skips them — filed under Bugs. |
| **Token streaming — scroll follow** | **STREAM-FOLLOW-01** (new, 2026-08-07). Sitting at the bottom, new text stays on screen with no input; scrolling up mid-answer holds position (check **touch and D-pad separately**); scrolling back down resumes the follow; the follow stops at the end of the transcript, so the session context strip and Save chat are not dragged into view **STREAM-FOLLOW-01, D-pad half PASS (Deck) 2026-09-04:** `scrollTop` held 0 while the answer fitted, then tracked the growing `scrollHeight` (84 → 174 → 270 → 516 as height went 789 → 1220), a constant ~55-85px above the true bottom, which is the sticky Ask bar. The touch-drag half stays with the maintainer. **STREAM-REVEAL-01 PASS:** sampled every ~300ms from the Ask press — first text at 5.4s, then 126 → 142 → 256 → 335 → 404 → 493 → 622 → 747 → 812 → 1025 → 1298 characters, steady, no freeze-then-dump. |
| **Strategy depth** | Spoiler policy, checklist persist, cheat gating |
| **KB** | KB-SMOKE-03, 05–10; KB-EVAL-01 before Phase 6 |
| **Character / Pyro** | One preset Ask; Pyro easter egg if touching character |
| **mDNS / Desktop notes / Model policy** | Spot when those paths change |
| **Voice STT** | VOICE-01…07 (mic required) |
| **UI scale** | UI-SCALE-01…05 on handheld / dock / TV |
| **Context ladder / micro-actions** | CONTEXT-LADDER-01…03; MICRO-01…05 (open bugs) |
| **D-pad scroll / tabs** | D-PAD-SCROLL-02 (choppy Strategy scroll bug); TAB-SWITCH-01 (LB/RB strip shuffle) |
| **Data clear** | DATA-CLEAR-01 (permissions/settings wipe survives reopen) |
| **Reply language** | LANG-01…03 (**LANG-01** Follow system on load — code fix Jul 2026; on-Deck confirm) |

### VAC / `bonsai:vac-check`

- [ ] **VAC-03** Valid key + SteamID
- [ ] **VAC-04** Profile URL
- [ ] **VAC-05** Vanity `/id/…` unsupported note
- [ ] **VAC-06** Permission off after key saved — no network

### Open regression IDs (bugs / recent ships)

- [ ] **PRESET-GAME-01** With a game running, tap a preset chip — Ask field shows chip text only (no `— {Game}` append; “this game” unchanged)
- [ ] **STRATEGY-PLACEHOLDER-01** Strategy mode, empty Ask — focus field; italic placeholder does not shift when fake caret appears
- [ ] **ASK-CARET-CHAR-01** AI character on — focus empty Ask field; native caret aligns with placeholder/text (not left of `?` badge); D-pad Up from paperclip → avatar, Right → field; character-off path unchanged
- [ ] **CONTEXT-LADDER-03** D-pad: Show details / Retry **Down** → ladder focus (not session strip skip); **Left/Right** cycles chips; all chips visible when ≤6; **Up** from first chip → utility row; **Down** from last chip → session strip; **Developer details** chip reachable
- [ ] **MICRO-04** Strategy live-turn D-pad: branches → feedback → utilities
- [ ] **STRAT-SPOIL-DRG-01** DRG Survivor boss names not false-positive spoilers — ship gate is the three **required** rows below; acceptance is *no spoiler fence rendered for the entity named in the question* (display-level, not a claim about model behavior). Plan 54 landed 2026-09-15; the three new sub-rows below cover it. All rows in this block run in plan 55's Deck pass.
  - [x] **DRG-01** `2321470`, *"How do I beat Glyphid Dreadnought?"*, no consent phrase, masking on → boss tactics in plain text, no tap-to-reveal — **PASS (Deck) 2026-09-15.** Plain text, no fence, no tap-to-reveal. Evidence `docs/test-evidence/plan55-DRG-01.json`, recording `recordings/DeckRecord_20260915_210556_game.mkv`.
  - [x] **DRG-01d** As DRG-01, **then ask a second question** → the first answer stays unfenced after it leaves the live turn *(the D1 regression: history turns used to re-fence)* — **PASS (Deck) 2026-09-15.** After a second question, the Dreadnought answer stayed plain text once it was history (464 characters, no spoiler fence, no tap-to-reveal). Evidence `docs/test-evidence/plan55-DRG-01d.json`.
  - [x] **DRG-01b/c** As DRG-01 with KB **off**, or corpus **absent** → still plain text *(D2: the low-risk signal used to be reachable only through the corpus)* — **DRG-01b tried 2026-09-18 with Deep Rock Galactic: Survivor running, blocked:** the same Ask-box freeze as the roadmap's three-star focus entry stopped the question from being sent five times out of six tries, so the reply was never seen. Evidence `docs/test-evidence/plan61-DRG-01b.json`. **DRG-01c not tried on purpose** 2026-09-18 — it would mean removing the library from the Deck, which was out of scope tonight. Still owed, not failed. **DRG-01b tried again 2026-09-19, still blocked:** Deep Rock Galactic: Survivor had fallen off the Recent Games row again, so it could not be launched. Evidence `docs/test-evidence/plan61-DRG-01b-retry.json`. **DRG-01b PASS (Deck) 2026-09-23:** with the game running, the knowledge base off, masking on and no consent phrase, the boss tactics came back plain, no cover, no notes block, and no knowledge-base search logged. Moved to Done. DRG-01c (corpus absent) is still not tried. Evidence `docs/test-evidence/plan64-DRG-01b.json`.
  - [x] **DRG-01-STREAM-01** — **fixed 2026-08-15 (R4), confirm on-Deck.** As DRG-01 with streaming **on**: no `Spoiler hidden until complete…` chip appears at any point while the answer streams in — the fence renders as plain text from the moment it opens, not only after it closes — **PASS (Deck) 2026-09-15.** No mask chip seen in 74 polls over 62 seconds. Evidence `docs/test-evidence/plan55-DRG-01.json`, recording `recordings/DeckRecord_20260915_210556_game.mkv`.
  - [x] **HADES-UNNAMED-STREAM-01** — companion check for the fix above, so nothing was over-relaxed. Hades `1145360`, a question that does **not** name a boss, streaming on → the mid-stream mask chip **still appears** for story-adjacent detail (Hades shares the `roguelike` genre with DRG Survivor, so this is the case the R4 fix must not touch) — **Not claimed 2026-09-15**: the fast poll never saw the mid-stream chip. A recording exists (`recordings/DeckRecord_20260915_205114_game.mkv`, untracked) for the maintainer to play back. **Tried again 2026-09-18 with Hades running, blocked:** the same Ask-box freeze as the roadmap's three-star focus entry stopped the question from being sent. Evidence `docs/test-evidence/plan61-HADES-UNNAMED-STREAM-01.json`. **FAIL (Deck) 2026-09-18, later the same night:** sent cleanly with no focus trap this time. The reply streamed all the way through as plain, readable text — no mid-stream mask chip, no "Spoiler hidden until complete…" chip, no tap-to-reveal block, at any point. Evidence `docs/test-evidence/plan61-HADES-UNNAMED-STREAM-01-retry2.json`, screenshot `screenshots/DeckCapture_20260918_115623_auto.png`.
  - [x] *(recommended)* **HADES-NAMED-01** Hades `1145360`, *"How do I beat Megaera?"* → plain text. Naming the boss is consent for that boss on any title (spoiler-constitution rule 7) — **PASS (Deck) 2026-09-15**, plain text; the misspelling bug (Megara vs Megaera) also reproduced on the same run. Evidence `docs/test-evidence/plan55-HADES-NAMED-01.json`.
  - [ ] *(recommended)* **HADES-UNNAMED-01** Hades, a question that does **not** name a boss → story-adjacent detail **still fenced**. This is the genre over-relax guard: Hades shares the `roguelike` genre with DRG Survivor — **Mixed on the Deck 2026-09-15, three runs, all recorded honestly.** *"what happens when i finally reach the surface in hades"* got **no fence** and a mild story spoiler in plain text — **FAIL as written** (`docs/test-evidence/plan55-HADES-UNNAMED-01.json`). *"how does the story of hades end"* and *"who is waiting at the end of the game in hades"* both got a masked fence — **PASS** (`docs/test-evidence/plan55-HADES-UNNAMED-01-run2.json`, `docs/test-evidence/plan55-HADES-UNNAMED-STREAM-01.json`). **Re-run FAIL (Deck) 2026-09-17:** *"what happens when you reach the surface"* in Hades came back as plain, unmasked text again, no spoiler block. Still mixed, not closed. Evidence `docs/test-evidence/plan57-QA-HADES-UNNAMED-01.json`. **A fourth try, planned 2026-09-18 with Hades running on a new phrasing, was blocked** before it could be asked — the same Ask-box freeze as the roadmap's three-star focus entry. Evidence `docs/test-evidence/plan61-HADES-UNNAMED-01-try4.json`. **The fourth try ran later the same night, sent cleanly with no focus trap — FAIL (Deck) 2026-09-18:** *"how do i beat the boss at the end of the first area"*, no boss named, in Hades. The reply gave general fight advice in plain text with no spoiler box anywhere and no boss named either. Three of the four phrasings tried since 15 September have now come back open; only the two "how does the story end" / "who is waiting at the end" phrasings passed. Evidence `docs/test-evidence/plan61-HADES-UNNAMED-01-retry2.json`.
  - [ ] **STRAT-SPOIL-NAME-01** game known only by name. Setup: Doom 64 (or another emulated no-story title from
    the list: Super Mario 64, Mario Kart 64, Pikmin 2) running as a non-Steam shortcut, Strategy mode, masking on,
    streaming on. Do: ask a boss question ("how do I beat the mother demon"). Pass when: any spoiler box the model
    draws renders as plain text, from the first streamed word, with no "Spoiler hidden until complete…" chip and
    no tap-to-show block; then ask a second question and confirm the first answer stays plain once it is history;
    then reopen the chat from the chat slot list and confirm it is still plain. Note in the row: if no emulated
    shortcut is installed on the Deck, the row is blocked, not failed — say so. **BLOCKED 2026-09-15:** no
    emulated shortcut on this Deck is installed. Doom 64 and Doom 64: Retribution both exist as shortcuts, but
    both read as not installed, so the setup step cannot run. Blocked, not failed; still owed.
    **2026-09-18 evidence points the other way:** a name-withheld boss question on a story-protected game, nothing
    running, came back with no spoiler box at all on both Hollow Knight and Hades, so this row needs a re-run
    before it can be called a pass. Evidence `docs/test-evidence/plan58p1-M-hk-boss-before.json`,
    `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json`. **Tried again 2026-09-18: still blocked, for a new
    reason.** Doom 64: Retribution is genuinely installed on the Deck now (this settles the disagreement
    between the two library reads above), but it is not on the Deck's Recent Games row, the only list the
    launch tool can search, so it could not be started. Someone needs to play it once by hand first, or the
    launch tool needs to reach the full Library grid. Evidence `docs/test-evidence/plan61-STRAT-SPOIL-NAME-01.json`.
  - [x] **STRAT-SPOIL-FIRST-01** name-first boss question. Setup: Portal 2 `620` running, Strategy, masking on,
    streaming on. Do: ask *"wheatley fight"*. Pass when: Wheatley's tactics are plain text from the first streamed
    word with no mid-stream chip, and any other story detail the reply touches is still boxed (that half proves
    nothing else was opened; it depends on the model drawing a box for something else, so it may take a few
    asks). Compare with *"how do I beat wheatley"*, which should behave the same. Then reopen the chat from the
    slot list: still plain. **BLOCKED 2026-09-15 as "Portal 2 not in this Deck's library" — settled 2026-09-18:
    Portal 2 was installed all along.** **PASS (Deck) 2026-09-18:** asked "wheatley fight" with Portal 2 running;
    the whole reply, including Wheatley's tactics, came back as plain text from the first streamed word with no
    hidden box, and stayed plain after the chat was closed and reopened from the slot list. The comparison
    phrasing ("how do I beat wheatley") could not be reached in time because of a separate, already-filed D-pad
    problem, so only the first phrasing is confirmed; the row's main pass condition is fully met. Evidence
    `docs/test-evidence/plan61-STRAT-SPOIL-FIRST-01.json`.
  - [x] **STRAT-SPOIL-TEXT-01** game named only in the question. Setup: nothing running, Strategy, masking on.
    Do: ask *"drg survivor what class"*. Pass when: the answer is plain text with no spoiler box, the risk chip
    under Show details reads low, and the reply does not claim the game is running. Then the guard: *"new vegas
    best build"* with nothing running → still fenced or careful, as a story game. — **PASS (Deck) 2026-09-15,
    both halves.** The Deep Rock half: plain text, spoiler risk chip low, the game resolved from the question
    text, no claim of the game running (`docs/test-evidence/plan55-STRAT-SPOIL-TEXT-01-drg.json`). The New
    Vegas guard: a gameplay-only reply about stats and early armour, no story detail, and the follow-up menu
    named New Vegas places (`docs/test-evidence/plan55-STRAT-SPOIL-TEXT-01-newvegas.json`).
  - [ ] *(extra credit, does not block)* **DRG-01e** Streaming off → plain text; **DRG-01f** `[Strategy follow-up]` turn → plain text
- [ ] **THINKING-OPENER-01** — **settled 2026-08-08, keep as a regression check.** Submit an Ask: the first line you can actually read should be one quoting your question. The constant *Thinking…* placeholder exists but the maintainer could not perceive it on device, which is the intended outcome — the round trip is imperceptible and the backend-authoritative design stands. If *Thinking…* ever becomes **readable** as its own line, the round trip has regressed
- [ ] **REASONING-01** through **REASONING-07** — the reasoning display (plan 57 § 6), run on the Deck's
  built-in screen 2026-09-17, bundle `af52c0aa`. Frozen chips before pinning: **how do i kill the big
  armoured bug boss** (Deep Rock Survivor; rows 01, 02, 05), **how does the story end** (Red Dead Redemption
  2; row 06), **what does the pickaxe do** (row 04). **Deviation found while running:** the Deck's chip row
  is in single-chip mode, one rotating slot cycling among the three pinned questions, not three chips shown
  side by side, and landing the exact frozen wording at the moment of a press proved costly. Rows 01 and 04
  swapped their questions for this reason — 01 ran with "what does the pickaxe do", 04 with "how do i kill
  the big armoured bug boss" — both sent through the same pinned-chip mechanism, testing the same code path.
  Six of seven rows closed, and the seventh (07) passed on its re-run once its fix landed (commit
  `d2096ee`); only 05 stays owed, for its body-text half. Evidence
  `docs/test-evidence/plan57-REASONING-01.json` … `-07.json`,
  `docs/test-evidence/plan57-REASONING-07-rerun.json`, `docs/test-evidence/plan57-REASONING-06a-rerun.json`.
  - [x] **REASONING-01** Thinking Balanced, the default model, the frozen Deep Rock Survivor question — the
    space under the question changes to the model's own sentences within a few seconds, three lines at the
    answer's own size, never more. **PASS (Deck) 2026-09-17:** the live block appeared about 9 seconds after
    send, three lines, the newest one marked, sitting above the dock. Ran with "what does the pickaxe do"
    (see the deviation note above).
  - [x] **REASONING-02** When the answer starts, the space folds to one line with the seconds — Down from
    the question reaches it and the ring is visible above the dock; A opens the block, A closes it; Down
    from the fold enters the answer. **PASS (Deck) 2026-09-17:** the fold read "Show reasoning · 16 s"; A
    opened the block and flipped the label, A closed it, and A then B also closed it with the ring still on
    the row; Down entered the answer, Up returned. **One wrinkle:** from the Retry icon it takes two Down
    presses to reach the fold, not one, because the question's own row is an extra stop in between; from the
    question header it is one press.
  - [x] **REASONING-03** Reopen the chat after switching tabs, and again after a plugin restart — the fold
    is there, closed, and opens to the same text with the same seconds. **PASS (Deck) 2026-09-17:** after a
    tab switch and a full plugin restart the fold was still there, closed, reading the same 16 seconds, and
    opened to the exact same 1,861 characters.
  - [x] **REASONING-04** Thinking Off, the frozen pickaxe question — today's phrases show, no fold, no chip.
    **PASS (Deck) 2026-09-17:** Thinking Off showed only the ordinary waiting phrase, no live block, no
    fold, and the details chips skipped the Thinking chip entirely. Ran with "how do i kill the big armoured
    bug boss" (see the deviation note above).
  - [ ] **REASONING-05** Show details on a thinking turn — the chip reads the level, the seconds and the
    token estimate, and its body says the count is an estimate. **PARTIAL (Deck) 2026-09-17:** the chip read
    "Thinking: Balanced · 16 s · ~465 tokens", the same seconds as the fold — but the whole details chip row
    cannot be reached by the D-pad at all (Right from Hide details stalls, Down skips to Session context, Up
    from Session context lands back on Hide details), so nobody using a controller can select this chip to
    read its body; only a page read reached the text. Filed as its own Bugs entry, below. Stays owed for the
    body-text half.
  - [x] **REASONING-06** Red Dead Redemption 2, Strategy, the frozen ending question, the first time with
    thinking on — the one-time notice appears and asks to confirm; the live lines may name the ending; once
    the answer starts, nothing of the reasoning shows outside the closed fold. **PASS (Deck) 2026-09-17:**
    after an earlier decline the notice returned; switching Balanced to Deep and back prompted nothing; a
    bare ending question with no game running (a deviation from the row, which names Red Dead) showed the
    model's own unmasked reasoning live while it thought, and nothing of it showed once the answer started
    outside the closed fold.
  - [x] **REASONING-07** Decline the notice — Thinking stays Off and nothing shows; accept it on a later try
    and the level changes, with the notice never coming back. **FAIL on the first build, Deck 2026-09-17:**
    declining kept Thinking off, but the ring landed on the tab strip at the top of the panel instead of the
    Thinking row; accepting the notice closed the box and remembered it was answered, but did not actually
    turn Thinking on — a second pick of Balanced then worked silently, with no further prompt. **Fixed the
    same day, commit `d2096ee`:** the notice now returns focus through the shared modal return-focus
    registry, and patches the chosen level into the pending settings snapshot instead of losing it to a
    stale snapshot restored after the confirm box closes. **PASS on the re-run, Deck 2026-09-17, bundle
    `b8d903d9`:** declining now closes the box, lands the ring back on the Off button inside the Thinking
    row instead of the tab strip, and the row stays roughly where it was on screen rather than the list
    snapping to the top; Thinking is still correctly off. Accepting on the next try turns Thinking on in the
    same press — read Balanced right away, again about 3.6 seconds later, and again after leaving to the
    Main tab and back; Balanced and Deep afterwards never showed the notice again. Evidence
    `docs/test-evidence/plan57-REASONING-07-rerun.json`, `docs/test-evidence/plan57-REASONING-06a-rerun.json`.
- [ ] **KB-FOCUS-01** Ollama KB Update/Remove: Left/Right between pair; both Up → KB toggle; both Down → Reply style; **equal row height** (Update not taller than Remove)
- [ ] **KB-CANCEL-01** Ollama KB **while a download runs**: **Cancel** replaces Remove and is the row's only enabled stop (the primary reads *Downloading…* and is disabled). Down from **Use local knowledge base** → Cancel; Up from **Reply verbosity** → Cancel; **A** → *Cancelling…*, second press does nothing; row returns to Update/Download + Remove within a few seconds; status line reads *Download cancelled* in grey, **not** the raw backend error in red; a fresh download still starts afterwards **Shelved 2026-09-19 (D113):** the download finishes in about a second, so there is no window to press Cancel in; the check moves to the roadmap's Shelved list until a throttle or a slower test copy exists.
- [ ] **OLLAMA-FOCUS-01** Ollama tab open (no prior Test): with Ollama reachable, primary button shows **Update AI & models** (quiet auto-probe)
- [ ] **OLLAMA-FOCUS-02** Run AI on this Deck: D-pad vertical — toggle → Install/Update → Browse models → Install options… → Test connection → KB toggle
- [ ] **OLLAMA-FOCUS-03** Up from Test connection lands on **Install options…** (or last Install-options submenu row when open)
- [ ] **REPLY-VERB-01** Reply style: set **Caveman** → Ask → Input handling shows `Reply style: caveman` and reply is terse; **Balanced** → no `REPLY VERBOSITY` block vs baseline; **Detailed** → paragraphs; with **AI characters** on + Caveman, character voice (not caveman grammar); Strategy + Detailed still ends with `bonsai-strategy-branches`
- [ ] **OLLAMA-KEEPALIVE-FOCUS-01** **Keep models loaded** slider thumb: white gpfocus ring vertically centered on the dot (no ~1px high offset)
- [ ] **ROUTING-01** Set text/vision try order opens picker listing installed tags without requiring a prior Test connection tap
- [ ] **ROUTING-02** Reorder + Done persists; reopen modal shows saved order
- [ ] **ROUTING-FOCUS-01** Try-order modal chrome matches Pull Models / Character picker (deferred bug). **The D-pad half is no longer a question** — it failed on 2026-08-28, see PICKER-REORDER-01
- [ ] **CHAR-PICKER-RING-01** Character picker grid, D-pad to a tile on the edge of a column (top, bottom, left-most and right-most column) — the focus ring must render in full, not cut off by the column's own edge. **Fixed at the desk 2026-09-04:** each grid column now carries 6px of inner padding (`PICKER_GRID_RING_PAD_PX` in `CharacterPickerModal.tsx`) so a tile's ring has room before the column's `overflow: hidden` clips it. Owed: a screenshot with the ring visible on an edge tile, for each of the four edges **Deck 2026-09-04, build 49241e7 (plan 32): measured, PNG for the maintainer's eyes.** Settings, Ali G, A opened the picker; Down landed the ring on the top-left tile (Jackie Welles). The tile sits 6.0 px from its column's left edge and 6.1 px from the right, the column is the first overflow-hidden ancestor and carries the 6 px padding, and Steam's ring here is a sub-pixel `outline auto` in orange, so the ring has room on every side. Picture: `screenshots/DeckCapture_20260904_214941_game.png`. The maintainer's glance closes it. **Maintainer 2026-09-05: FAIL — "why is the AI character screen have rings that are yellow? they should be white".** The measurement was about spacing and missed the colour. Cause: the tiles are Decky buttons with no class of their own, so no plugin rule matched them and the browser drew its own hairline ring; on that build it took the gold tint from the active character (Ali G). A fresh capture 2026-09-05 04:04 shows it white but still hairline-thin (`screenshots/DeckCapture_20260905_040431_game.png`), and the computed styles on the focused tile carry no colour of ours at all. **Fixed the same day:** the tiles join the plugin's own white-ring rule, which the column's 6px padding was already sized for. Second look owed. **Measured after the rebuild, same day:** the focused tile computes `outline: rgba(255,255,255,0.9) solid 1.56px`, offset 1.99px, with the soft outer glow — the plugin's own ring, not the browser's. Picture `screenshots/DeckCapture_20260905_041028_game.png`. **Maintainer, second look 2026-09-05: PASS.** Row closed.
- [ ] **QAM-BODY-RO-01** Switch tabs repeatedly (10+, through the taller Settings/Ollama panels), then D-pad to the **bottom** of a long panel: the pane must still reach its end and not be pinned to a stale height. Steam replaces the scroll node on every switch, so this is specifically about the 2nd switch onward — one switch proves nothing. Fixed 2026-08-08; if it regresses, `--bonsai-tab-body-height` will stop matching the live pane's `clientHeight` after a switch. **Re-run QAM-BAZZITE-01 and D-PAD-SCROLL-01 with this** — same measurement chain
- [ ] **SOFT-PREDICT-04** Strategy mode, an answer long enough to continue mid-branch (opens a `bonsai-strategy-branches` fence before hitting the length wall): confirm no half-rendered fence or stray JSON appears at any point in the stream, including right at the continue boundary — **BLOCKED 2026-09-18:** the long Hades walkthrough question came back as a short spoiler-careful refusal, so no reply reached the length wall. Evidence `docs/test-evidence/plan61-SOFT-PREDICT-04.json`. **Tried again 2026-09-23, still unclear:** the finished text read clean — no half-rendered fence, no stray JSON, at any point — but the reply stopped on its own at 1,117 tokens against a 2,112-token limit in the log, so it never had to continue and the join point this row actually checks never happened. Evidence `docs/test-evidence/plan64-SOFT-PREDICT-04.json`. **Tried a second time 2026-09-23, still unclear, same shape:** a Half-Life 2 walkthrough question asked for a very long answer on purpose; the model still stopped itself at 1,050 tokens, well under the 2,112 limit. Asking for more length does not reach the wall — the row needs another way to bring the limit down rather than the question up. Evidence `docs/test-evidence/plan64-SOFT-PREDICT-04-try2.json`.
- [ ] **EXPERT-CAP-01** Expert-mode Ask with a long answer: it now runs to ~1200 tokens before a soft continue rather than ~800. Expert was silently capped at the Speed budget until 2026-08-15, so a long Expert reply should visibly need fewer `Continuing…` cues than before the fix

### CHAT-SLOTS-V2 — Named chat slots (P0)

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).


### CHAT-SLOTS-V3 — Named chat slots redesign (P0)

Run **CHAT-SLOTS-V2-05** (P-0 bumper suppression) first — it has never run on device, and
everything below assumes it passes. Plan:
[28-named-chat-slots-v3-implementation-plan.md](planning/28-named-chat-slots-v3-implementation-plan.md).



- [ ] **PRESET-ONE-LINE-02** (the row matches the decision) One row, **two chips side by side**, each half the width less a 4px gap,
  **30px** tall, radius 4; a label longer than its chip scrolls sideways inside it with a soft fade at the edges, and short labels do
  not move. **Read the geometry from the live page** (`getBoundingClientRect` on the two `.bonsai-preset-glass` buttons and their
  `.bonsai-preset-chip-text` children), not from a screenshot, and **record the button's computed side padding** — it is the one
  number the width research in [planning/29-preset-row-three-thirds-plan.md § 3b](planning/29-preset-row-three-thirds-plan.md) could
  not know, and it decides whether "~20 characters at a glance" is really 18 or 23. Write the numbers back into that plan.
  **PASS on device 2026-09-01, read from the live page:** two chips **148 × 30 px** with a **4 px** gap on the 300 px column
  (x=48, w=300), radius 4, side padding **8 px** (now set by the plugin, so the label room is known by construction), label room
  **130.4 px** ≈ 20 characters; Steam's Marquee mounted on every label, **animating only the visible overflowing one** (`--duration`
  = text width ÷ 25 px/s, 12.4 s for a 56-character prompt) and idle on short labels; the **Test** badge pinned at the left (23 px);
  dock 157 px and reading area 458 px (one-chip row: 161 / 455). The help-chip half was not exercised (the help chip was already
  dismissed on this device). History: **FAIL 2026-08-31** (one chip, filed by the maintainer on sight); rebuilt at the desk
  2026-09-01 as two across (D43, the drawing's three chips would have left ~12 characters each). Also check: the help chip, when
  showing, is the entire row and no suggestion chip is beside it; once dismissed, the two chips take the row.
- [ ] **PRESET-ONE-LINE-03** (the D-pad reaches every chip and leaves cleanly, in every mode) From the Ask field press **Up**: the
  ring must land on a chip (`gpfocus`, not just `activeElement`, per FOCUS-CHIP-RING-01) and **A must fill the Ask field** with that
  chip's text. **Right/Left** step between the two chips; **Down** returns to the Ask field; **Up** leaves toward the transcript.
  Repeat for fade / static / decode — before 2026-09-01 only carousel mode registered a nav handover and the other modes fell back
  to a plain `focus()`, which is the mechanism behind the 2026-08-28 fake-ring bug. In **carousel** mode additionally: after a few
  auto-advances press **Left** at the left chip — an earlier chip slides back into view and the blue current-chip marker and the
  white ring sit on the same chip; **Right** walks forward again; Left at the very first chip in history holds still, no trap.
  **Carousel mode PASS on device 2026-09-01, driven by the bridge:** `docs/test-evidence/PRESET-ONE-LINE-03-carousel-dpad-fixed-2.json` (11/11:
  Up from the text field lands on a chip, Left at the oldest chip holds for three presses, Right walks all five history chips with
  the window sliding, Down reaches the text field, Up returns to the last chip, Up again lands on **Session context**) and
  `docs/test-evidence/PRESET-ONE-LINE-03-carousel-fresh-mount.json` (13/14 on a freshly opened panel: Down from the strip enters the row,
  everything above repeats). **The first run failed 6/9** (`docs/test-evidence/PRESET-ONE-LINE-03-carousel-dpad.json`): Steam treated the row as a
  column — Left left the plugin for the Quick Access rail and Down/Up stepped between chips — because the `flow-children`
  container hint alone does nothing; every chip now carries explicit handlers (`presetRowNav.ts`). **Two misses fixed at the desk
  afterwards and re-run 2026-09-02, 14/14** (`docs/test-evidence/PRESET-ONE-LINE-03-carousel-fresh-mount-2.json`): on a fresh panel, entering the
  row had put the ring on the older visible chip rather than the marked one (the redirect ran inside Steam's own focus event; now
  deferred a tick), and Down from a chip had put the caret in the text field while Steam bounced the ring to the next chip (a plain
  `focus()` across containers; the field now registers a Steam nav node, `unified-input`). Both now land where they should, Right at
  the newest chip holds, and Up from the text field returns to the marked chip. One Left press in that run (second-oldest to oldest
  chip) did not move; the same transition passed in two probes at the rig's cadence (`…-oldest-chip-probe-a/b.json`), so it is a
  one-off — if it recurs, a press in the tail of the 550 ms slide is the first suspect. Fade / static / decode share the same handler code and were not driven on device. The rig also reports the
  ring "partially visible" for one settle after a slide — the 550 ms transition is still running when it measures; the next step
  always reads 100 %.
- [ ] **PRESET-ONE-LINE-04** (the scrolling is calm and cheap) With the knowledge base on and a covered game running (Half-Life 2 has
  the longest label, 59 characters): both labels crawl slowly with a fade at the edges, the **Tip** badge stays pinned at the left
  while the text scrolls, and a chip does not rotate away before its label has scrolled through once. Judge the speed by eye — "slow
  and calm" was the maintainer's brief, and Steam's `Marquee` `speed` unit is undocumented, so the value in
  `presetRowLayout.ts` (`PRESET_MARQUEE_SPEED`) is a first guess to be calibrated here and written back. Sample the frame rate the
  way PRESET-STREAM-ANIM-01 did (8s of `requestAnimationFrame` timestamps) with **decode** mode on so both chips churn and then
  scroll: expect a flat 60fps with no gap over ~50ms. Then with OS reduced motion on: no crawl, the label is cut off with an ellipsis,
  decode swaps text instantly with no caret. **Partial 2026-09-02:** frame rate sampled in carousel mode with the labels scrolling
  (no decode churn): 480 frames in 8017 ms (59.9 fps), 95th-percentile frame gap 16.8 ms, one gap of 50 ms, two labels scrolling at once — the same shape as the 2026-08-28 decode measurement (479 frames / 8002 ms, worst gap 50 ms). The speed-by-eye, decode and reduced-motion halves are still owed.

  **Speed-by-eye PASS (Deck) 2026-09-17:** the long chip label scrolls at about 27 pixels a second, a slow
  calm crawl (the target was about 25). Decode and reduced-motion still owed. Evidence
  `docs/test-evidence/plan57-QA-PRESET-ONE-LINE-04.json`.

---

### CHIP-BUTTON — Suggestion chips as real buttons (plan 60)

Plan [60](planning/60-chip-button-restyle.md), decision D110. Landed 2026-09-17 as merge `b3c0d52`
(seven commits on `refactor/lane60-chips`) and checked on the Deck the same day. Each chip now has a
raised look (a top hairline and a soft shadow), the two chips sit 6px apart instead of 4, the row
leaves room below the chips so the shadow is not cut off, the Tip word became a small dot, the tag and
decode-label colour is quieter, and the chip the D-pad is on shows a light bar along its bottom edge
instead of the old blue outline. Evidence `docs/test-evidence/plan60-QA-chip-button.json` and
`docs/test-evidence/plan60-measure-before.json` (the before-the-build measurement).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **CHIP-BUTTON-01** | Open the main screen with chips showing, default character, then the gold character. Screenshot the dock. | By eye: the chips read as raised buttons, the two are visibly apart, the Tip dot and the tag colour are quieter than before; nothing else in the dock moved | ⏳ **owed — screenshots taken, the maintainer's own eye still needed** (`screenshots/DeckCapture_20260917_150755_auto.png`, `…_150413_auto.png`, `…_150921_auto.png`) |
| **CHIP-BUTTON-02** | Put the D-pad on a chip in each animation mode; read the chip's computed box-shadow | Steam's white ring, the top hairline and the bottom bar all show at once; label is the brighter shade; no blue outline anywhere | ✅ **PASS (Deck) 2026-09-17**, decode mode and the one-chip setting: ring, hairline and bar all present, no blue outline, label `#e4c94e` (toned gold). Fade mode could not be reached — the chips fade in and out too fast to land the D-pad on one while faded; a pre-existing gap, not caused by this build |
| **CHIP-BUTTON-03** | Press Left at the first chip and Right at the last | The bottom bar flashes brighter with a small glow for about a third of a second, then returns; nothing moves | ✅ **PASS (Deck) 2026-09-17** — the flash held 260ms of a 320ms window, then settled back to the focused-chip look; chip size unchanged |
| **CHIP-BUTTON-04** | Press A on a chip; then touch one | The words land in the question box; nothing sinks or flips; no pressed look was built | ✅ **PASS (Deck) 2026-09-17** — A on a chip put its words in the question box, no pressed look (`screenshots/DeckCapture_20260917_150702_auto.png`) |
| **CHIP-BUTTON-05** | Read the rectangles of the chip, its container and the question box; screenshot | The shadow's bottom is not cut off; the gap from chip to question box is 8px in decode/static/carousel (12 total in fade); by eye the row no longer touches the box | ⏳ **owed — measurement PASS, the maintainer's own eye on the screenshots still needed.** Gap measured 8px (was 0) in decode/static/carousel, 12 total (unchanged) in fade; question box did not move |
| **CHIP-BUTTON-06** | Turn on the one-chip setting; show the help chip; get an agent suggestion chip | The full-width chip has the same raised look; the help and agent chips keep their colours and carry the hairline and shadow | ⏳ **PARTIAL — one-chip setting PASS on the Deck 2026-09-17** (same raised look, 300×30); the help chip and the agent chip were not on screen during the run, so they are covered only by the stylesheet tests, not seen by eye |
| **CHIP-BUTTON-07** | Reduced motion on; repeat 03 | The cue appears and clears with no ramp; nothing looks broken | ⏳ **owed — needs the Deck's reduced-motion setting turned on** |
| **CHIP-BUTTON-08** | Decode animation mode, gold character | The resolving label is the toned gold, not the loud one | ✅ **PASS (Deck) 2026-09-17** — label read `#e4c94e`, the toned gold |
| **CHIP-BUTTON-09** | A game the notes cover (Half-Life 2), knowledge base on | The Tip chip shows a small square dot in the character's colour before its label, not the word; the dot stays put while a long label scrolls | ❌ **FAIL (Deck) 2026-09-18** — with Half-Life 2 running and the knowledge base on, the suggestion chip showed real Half-Life 2 tips from the notes ("How do I beat Strider?", "Tips for Ravenholm in this game?") but with no dot before the label at all; reading the dot's own element on the page confirmed it was never drawn for either chip. Filed as its own bug (roadmap Bugs, `[chips]` `[KB]`) — the check that decides whether a chip's words come from the notes and the check that decides whether to draw the dot are not agreeing with each other. Evidence `docs/test-evidence/plan61-CHIP-BUTTON-09.json` and its two screenshots. ⏳ **Fixed 2026-09-21 (plan 63, commit `895cf0a`), Deck recheck owed.** Two copies of the same badge markup had drifted apart; one piece of code now draws both. **Tried 2026-09-23, COULD NOT RUN:** three pinned test chips are switched on in the Developer tab, and while they are on no note chip is ever mixed in — the chip row stayed on the same pinned "how do i beat the gonarch in black mesa" chip for the whole run, even though the question itself did attach three real Half-Life 2 notes. Owed: someone clears the pinned chips ("Clear frozen test chips" in Developer — the maintainer may want them kept on purpose, so ask first) and re-run. Evidence `docs/test-evidence/plan64-CHIP-BUTTON-09.json`. |

Rows 01 and 05 are judged by eye from a screenshot and a rectangle read; the rest are read from the
page by the bridge. **Seen along the way, not part of this plan:** in fade mode the D-pad skipped the
chip row in both directions on three tries — worth a look next to the open "chip row cannot be
reached" entry.

---

### TAB-BAR — Collapsing tab bar (P0)

Plan [30](planning/30-collapsing-tab-bar.md), decisions D44/D55/D56. Steam's tab header is hidden by one
structural rule; a 20px bar above the tabs root shows the tab and is the strip's one focus stop; the
full strip floats over the panel while the bar holds the ring. All rows are on-Deck. Evidence files
under `docs/test-evidence/`; numbers in the plan's § 8.

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **TAB-BAR-01** | Height | Thin bar ≤ 24px including the gap; `TabContentsScroll` top at least 55px higher than the W0 baseline | ✅ 2026-09-02 — bar 20px, body top 23.99px vs 84.66 (`deck_readPage`) |
| **TAB-BAR-02** | Reach | Fresh open: Down lands on Back, second Down on the bar (open, ring on the active cell); from the slot row Up lands on the bar | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-02-fresh-open-downs.json`, `docs/test-evidence/TAB-BAR-03-switch-on-the-bar.json` steps 1–2 |
| **TAB-BAR-03** | Switch | On the bar Left/Right and LB/RB switch at once, wrapping at both ends (D56); LB/RB from inside the body switch, the dash and name follow, the bar stays thin | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-03-switch-on-the-bar.json` (11/11); body half `docs/test-evidence/TAB-BAR-W1a-*.json` |
| **TAB-BAR-04** | Collapse | Down from the bar lands on the first control of each of the six tabs; Up from it returns to the bar; B inside a body lands on the bar | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-04-collapse-into-each-tab.json` (17/17), `docs/test-evidence/TAB-BAR-04b-b-from-body.json` |
| **TAB-BAR-05** | No ghost stops | Free-play sweep top to bottom: `gpfocus` never names a hidden Steam tab element, every stop visible | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-05-sweep-main.json` — 23 stops, 0 focused-but-not-visible |
| **TAB-BAR-06** | Slot-row takeover | While the slot row holds the ring the bar's LB/RB marks are hidden and the bar does not shift; they return when the ring leaves | ✅ 2026-09-02 `deck_readPage` around `docs/test-evidence/TAB-BAR-W3-slot-row-to-transcript.json` |
| **TAB-BAR-07** | Legibility, by eye | Names on the open strip readable on the handheld at 8px caps; lit dash and name gold with Ali G / the TF2 Announcer, purple with Shadowheart, otherwise green; after a QAM close and reopen the bar shows the restored tab | ⏳ **Retired 2026-09-17, replaced by TAB-STRIP-2A-03** — plan 59 rebuilt the open strip's cells and type size, so this row's own geometry no longer describes what is on screen; the by-eye legibility check continues under the new row instead. Kept here for history only. Earlier record: strip geometry measured (plan § 8); the by-eye half is the maintainer's: open bonsAI, press Down twice, look **Rig half PASS 2026-09-04:** all six names render in full (MAIN, OLLAMA, SETTINGS, PERMS, DEV, ABOUT), active gold, rest grey, nothing truncated — `screenshots/round31-tabstrip-names.png`. The arm's-length judgement is still the maintainer's. |
| **TAB-BAR-08** | Touch | Tap on the thin bar opens the strip; a tab tap switches and closes it; a tap outside closes it | ⏳ needs a finger on the screen — the rig cannot tap |
| **TAB-BAR-09** | Modal return | After the character picker closes on a non-Main tab, the ring lands on the opener or on the bar, never nowhere (re-runs PICKER-FOCUS-01's three openers) | ✅ 2026-09-02 for the character picker, the models hub and the chat-slot rename — all return to the opener (`docs/test-evidence/TAB-BAR-09-*.json`); ⏳ the desktop-note opener needs the *Save files to Desktop* permission on · ⏳ 2026-09-03: the Clear cache confirmation is a fourth opener and its return lands on the hidden Settings tab button (roadmap Bugs, filed 2026-09-03) |
| **TAB-BAR-10** | UI scale Apply | Settings → UI scale → Apply remounts the tabs subtree; the bar comes back thin, on the right tab, at the new scale | ✅ 2026-09-02 `docs/test-evidence/TAB-BAR-10-*.json` — thin, on Settings, scale 1, body root re-registered (Up from the top of Settings reaches the bar). The 4px gap under the bar was lost on remount, is now a stylesheet value, and survives an Apply (`docs/test-evidence/TAB-BAR-10-ui-scale-apply-2.json`, body top 24px after) |
| **TAB-BAR-11** | Modal return, the two openers TAB-BAR-09 missed | After the Clear cache confirmation closes, the ring is on the **Clear cache…** button, not a hidden tab button; after a QAM chord close/reopen with the panel still mounted, the ring is on the bar or another visible control, never a 0×0 hidden tab button; `stopsFocusedButNotVisible` is 0 for both | ⏳ **Fixed at the desk 2026-09-04, Deck check owed.** `useHiddenTabHeaderTrap` now bounces a hidden tab button that already holds the ring the instant it attaches, not only a later class change, and also watches for one being inserted already focused; **Clear cache…** and **Clear all data…** in `SettingsTab.tsx` now register with the modal return-focus registry the way the character picker's opener does. Evidence this fixes: `docs/test-evidence/CLEAR-CACHE-01-b-after-modal-back-to-main.json` and `docs/test-evidence/CLEAR-CACHE-01-c-close-panel-for-remount.json` step 0. Unit: `useHiddenTabHeaderTrap.test.tsx`, `modalReturnFocusRegistry.test.ts`, `SettingsTab.modalReturnFocus.test.tsx` · **2026-09-04 21:33 finding, build 49241e7 on-Deck (this lane's earlier fix deployed):** at 21:23 the Deck suspended and resumed; the panel remounted on Main with the ring on the hidden Main tab button, then a RIGHT press moved it to the already-existing hidden Ollama tab button and nothing bounced it — a DOM read at that moment showed the matcher's conditions were all true (`docs/test-evidence/TAB-BAR-11-a-after-suspend-resume-hidden-button.json`). **Cause:** the observer callback's `record.target instanceof Element` / `node instanceof Element` (and `TabIndicatorBar.tsx`'s own `evt.target instanceof Node` for its tap-outside listener) are brand checks made from this module's own realm (SharedJSContext) against nodes that live in the QuickAccess popup document — false for every node either listener is ever handed, not just this one, so the original trap most likely never bounced anything on device; the TAB-BAR-05/09 passes came from the explicit hops. **Fixed at the desk 2026-09-04, Deck re-check owed:** both call sites now duck-type (`nodeType`, `classList`, `querySelector`) instead of brand-checking. Unit: realm-crossing tests added to `useHiddenTabHeaderTrap.test.tsx` and `TabIndicatorBar.test.tsx`, each building its DOM in a second, genuinely separate `JSDOM` instance so `instanceof` is provably false the way it is on device **Second build f9a4c17 (realm-safe trap), 22:16:** QAM closed with the real chord and reopened with the panel still mounted: the ring sat on Decky's own back button (40x28 at y 20, visible), not on a hidden tab button, where the 2026-09-03 run and tonight's suspend/resume landing both put it. Whether the trap fired or Steam chose the button itself is not observable without the debug HUD; the outcome is the one the row asks for. The suspend/resume path cannot be forced from the rig and stays owed. A second chord close and reopen at 22:20 left the ring on the tab bar itself, visible, which is the trap's bounce target. | **Deck 2026-09-05, fourth build of plan 32 (code `517804a`), third remount path: PASS.** A full Decky loader restart (`plugin_loader restart`, a harder remount than the QAM chord) then reopening the panel: the first D-pad press placed the ring on the tab bar (*Main tab*, 300x20, visible), the second on the chat slot row, and Right did not park it on a zero-size tab button (`docs/test-evidence/TAB-BAR-11-build4-after-loader-restart.json`, 3/3, every stop visible). With the Clear cache modal return (2026-09-04) and the chord reopen (twice, 2026-09-04), all three remount paths the rig can drive now pass. **The one path still unmeasured is a real suspend and resume**, which is how the bug was first seen: the bridge is a gamepad, and waking a sleeping Deck needs its physical power button, so driving it would end the session's access to the device. It needs a by-hand check — and, since 2026-09-05, a request is on the studio's own roadmap for a sleep-and-wake tool, so that this row can eventually be run unattended.
| **TAB-BAR-GHOST-01** | Touch, ghost strip | With a game running full screen, open the panel, put the ring on the tab bar so the strip opens, then touch a suggestion chip with a finger; the strip must disappear completely — no faint icons, no dotted row — however long you wait | ⏳ **needs a finger on the screen — the rig cannot touch.** Fixed at the desk 2026-09-15: a plain timer now force-hides the strip a fraction of a second after it closes, whatever its fade animation is doing, so a stalled fade can no longer leave a see-through copy over the chips. The exact reason the fade stalls was not pinned down. On the maintainer's own checklist ([Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4)).

Also re-run because their landing spot changed: **DOC-SWEEP-01** (Settings Up → the bar now),
**CHAT-SLOTS-V3-01** (the walk starts at the bar), **TAB-SWITCH-01** (the flicker fix must hold with
the header hidden — `docs/test-evidence/TAB-BAR-W1a-*.json` show ten clean switches).

### TAB-STRIP-2A — The open tab strip redesign (plan 59)

Plan [59](planning/59-tab-strip-redesign-build.md), decision D109. Landed 2026-09-17 in commits
`6821f20`, `ef4a851`, `18be399`, `0378024`, `044acab`, `a957165`. Six equal cells, one 22px icon
family, only the current tab's name shown, a solid 66px bar with a shadow. **Run on the Deck
2026-09-18:** rows 01, 02, 04, 05 and 06 pass, 03 is captured for the maintainer's own look, and 07
fails and is filed as its own Bugs entry. Replaces **TAB-BAR-07** (see that row above).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **TAB-STRIP-2A-01** | Geometry, six tabs | Strip 300 × 66 floating at the scope's top; six cell boxes within 1px of equal width (about 39); every icon box 22 tall with its top 6px below the cell top, same in all six; bar at rest still 300 × 20; body top unchanged from 2 September (87.95px) | ✅ PASS (Deck) 2026-09-18 — strip 300 × 66 floating at the top; six cells each 39px wide; every icon box 22px tall with its top 6px below the cell top, the same on all six; resting bar 300 × 20; body top within a twentieth of a pixel of the 2 September value. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-01.json` |
| **TAB-STRIP-2A-02** | Geometry, five tabs | Same with Developer off; strip 300 × 66; cells about 47 wide | ✅ PASS (Deck) 2026-09-18 — Developer tab switched off, strip still 300 × 66, five cells about 47px wide. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-02.json` |
| **TAB-STRIP-2A-03** | By eye, the maintainer | The lit name readable at arm's length; the lit cell reads as a selection, not a warning; nothing clipped; in green (no character), gold (Ali G), purple (Shadowheart), grey (Astarion), pink (Fuu) | ⏳ captured 2026-09-18, the maintainer's look owed — five screenshots, one per colour: no character/green `screenshots/DeckCapture_20260918_081157_auto.png`, Ali G/gold `screenshots/DeckCapture_20260918_081003_auto.png`, Shadowheart/purple `screenshots/DeckCapture_20260918_081242_auto.png`, Astarion/grey `screenshots/DeckCapture_20260918_081324_auto.png`, Fuu/pink `screenshots/DeckCapture_20260918_081408_auto.png`. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-03.json` |
| **TAB-STRIP-2A-04** | Switch fade | Right ×3 from Main: the icon boxes' positions before and after each press are identical; only the fill and the name changed | ✅ PASS (Deck) 2026-09-18 — the icon boxes read pixel-identical before and after each of the three presses; only the fill and the name changed. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-04.json` |
| **TAB-STRIP-2A-05** | Pills hide, cells stay | Ring on the chat row: the pills are hidden, the six cell boxes have not moved | ✅ PASS (Deck) 2026-09-18 — with the ring on the chat row, both shoulder-hint pills hid and the six cell boxes did not move. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-05.json` |
| **TAB-STRIP-2A-06** | UI scale 1.18 | Settings → UI scale → Apply: the strip comes back at the new scale, still floating, still six equal cells | ✅ PASS (Deck) 2026-09-18 — UI scale set to the 1.18 "TV distance" profile and applied, the strip came back scaled, still floating, six equal cells; scale set back to automatic/handheld and read back to confirm. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-06.json` |
| **TAB-STRIP-2A-07** | The dots covered (D109 item 3) | Every dot in the chat row's row of dots has its bottom edge above the strip's bottom edge, and the chat row's own bottom line is still below the strip — the maintainer chose a 66px strip on 2026-09-17 to cover the dots without covering the whole chat row | ❌ FAIL (Deck) 2026-09-18 — the strip's bottom edge sits at 130px; the row of dots runs from about 133 to 137px with the ring on the tab bar (135 to 139px with the ring on the chat row), so every dot sits fully below the strip, none of them covered; the chat row's own bottom line (142 to 146px) is below the strip as intended. Filed as its own Bugs entry. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-07.json` ⏳ **Fixed 2026-09-21 (plan 63, commit `ec70866`), Deck recheck owed.** The dots moved up 10 pixels rather than the strip growing, since the strip's own height is vertical room the maintainer asked to keep. Not yet re-run: confirm every dot now sits covered, and specifically whether the dots now crowd the tails of letters in the chat name above — the lane flagged 10 pixels as a little more than the 7 to 9 needed, with only about 4 pixels of clear space there. **Re-run 2026-09-23, ❌ FAIL by measurement:** the gap between the chat name's letters and the dots measured 0.2 pixels, so they touch — the 10-pixel move hid the dots under the strip but left no room above them. Screenshot `docs/test-evidence/plan64-BYEYE-01-chat-row.png`. Moved back to Bugs, OPEN, with a maintainer's pick needed among three ways out (leave as is; move the dots back 1 pixel; or hide them while the tab strip is open and restore their old spacing) — see the roadmap entry. |

### NOTES-BLOCK — The "From the notes" block (plan 58 phase 1)

Plan [58 phase 1](planning/58-phase-1-notes-shown-and-wiki-extracts.md), decision D111. Landed
2026-09-17 as two commits (`6dbf9c9` backend, `4c036f5` frontend; tip `8395841` on experimental). A
line under a finished Strategy or troubleshooting reply that used a note or a shared tip names it and
where it came from, and opens to show the note's own words. Starts closed behind one switch. **Two
pieces are short of the plan, a follow-up in progress in the same lane:** the block should appear
before the model's first word rather than only once the reply finishes (row 06), and should sit inside
the spoiler box on a fenced reply rather than being hidden entirely (row 02). **None of the seven rows
below have run on the Deck yet.** Every row that walks the D-pad onto the block's own header must check
that the ring is actually visible on the header, its rectangle read against where the dock starts, not
merely that the header has focus — the repo's own lesson from a control that passed a focus walk while
sitting hidden behind the dock. Save each row's evidence to `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-0N.json`
before writing the row.

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **NOTES-BLOCK-01** | Pikmin 2 running, Strategy mode. Ask whether there is a day limit. Once the reply finishes, walk Down onto the block's header (ring visible on the header, checked against the dock) and press A. | The header names the note and says where it came from; opened, it shows the note's own words, which say there is no day limit — whatever the reply itself said. | ✅ **PASS (Deck) 2026-09-18** — the block showed the three attached Pikmin 2 notes word for word, day-limit sentence first, with the ring landing visibly on the header. Two follow-ups: it can only be reached walking down onto it, not up from the question box, and opening a three-note block scrolls the view to its bottom instead of its top. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-01.json`. **Re-run 2026-09-18, after the fixes:** with the block's screen fixes deployed, the header now reads as two lines and holds up (the count never gets cut, only the name is shortened), and opening the block puts its header at the top of the view instead of scrolling past it — both now pass. Walking up from the question box still skips over the block and lands on Show details instead; the fix wired the wrong neighbouring control, not the one that actually sits under the block. **Third run 2026-09-18, on the fix build:** pressing Up from the session context strip now lands cleanly on the block's own header, ring fully visible and well clear of the dock — the walk asked for now passes. The ladder walk was also run: from Hide details, Down steps through the block's header, the session context strip, Save chat to Desktop, a test chip, the question box and Ask — seven stops, every one visible, with no loop back on itself. The chip ladder inside the open block still cannot be reached by the D-pad, the same gap as before; that is already its own open item on the roadmap's bug list, not a new one filed here. This row now passes in full. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-01.json`, `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-01-ladder-walk-21b53b9.json`. |
| **NOTES-BLOCK-02** | A story-protected game running, no spoiler opt-in given. Ask about a boss by role, not name. Once the reply completes and is fenced, look for the block inside the spoiler box, closed then opened. | No block appears anywhere while the spoiler cover is closed. Once the cover is opened, the block appears, itself closed. The evidence for this row says whether the block sits inside the spoiler's own box or below it, next to Show details, since that placement is the one thing still short of the drawing. | **NOT RUNNABLE (Deck) 2026-09-18:** the Hades boss question came back with no spoiler box at all, so there was no fenced reply to check the block's placement against. The reply also named the wrong boss, steered by the top attached note. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json` |
| **NOTES-BLOCK-03** | Nothing running. Ask a plain troubleshooting sentence that reaches a shared tip. Walk Down onto the block's header (ring visible on the header, checked against the dock) and press A. | The header names the tip and says it is from the shared Deck tips; opened, it shows the tip's own words, and any launch option or setting name in it matches the tip exactly. | **PASS on the words, FAIL on timing (Deck) 2026-09-18:** the block showed the three shared tips with the right header and the launch option matched exactly, but it only appeared about a minute after the reply finished, not while the reply was still being written. The same turn's follow-up menu also leaked its own template wording. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-03.json`. **Re-run 2026-09-18, after the fixes:** the tip's own words still matched what the model said, but the block still did not show live — it was missing at the moment a reply finished and only appeared a little after, the same late arrival as before the fixes. This is not happening every time: the same evening, a game-note question showed the block on screen from the first second. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06.json`. **Update 2026-09-18:** reading the screen code found why — the block loses the value it was showing the instant a reply finishes, and does not get it back until a second, separate load lands a moment later, which is what the late arrival always was. The fix has landed on the branch. **Confirmed on the Deck 2026-09-19 (build 07f1299):** a shared-tip question ("My game will not launch on Proton, what should I check?"), watched every quarter second, showed the block about a second and a quarter after the press, present through the thinking and the whole reply, present the instant the action row appeared, and present in all 121 checks over the next 30 seconds with no gap. This row now passes in full. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06-fixbuild-07f1299.json` |
| **NOTES-BLOCK-04** | A covered game running. Ask something the notes cannot answer. | No block appears anywhere under the reply; the honesty line about the model's own knowledge shows instead. The two never appear together on one reply. | **NOT RUNNABLE (Deck) 2026-09-18:** no question could be found that attaches nothing for a covered game, so the "never together" case could not be shown — every attempt still attached three notes. What did happen: the block and the "no close match" honesty line appeared together, and the line read wrong, since the reply's facts came from one of the attached notes. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-04.json` |
| **NOTES-BLOCK-05** | Hades running. Ask about a boss. Walk Down onto the block's header (ring visible on the header, checked against the dock) and press A. | The header reads that this is bonsAI's own note, with no source. | ✅ **PASS (Deck) 2026-09-18** — the header read "From bonsAI's own notes, no source" as designed, next to the honest "no close match" line. One follow-up: the closed header clips mid-word at this width and loses its "(+2 more)" count. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-05.json` |
| **NOTES-BLOCK-06** | Strategy question about a covered game. Press Ask and watch the screen from that press through the reply completing. | The block is on screen before the reply starts streaming its first word, not only after it completes. | ✅ **PASS (Deck) 2026-09-18** — the block was already on screen with the reply text still empty, well before the model's first word, and did not change or flicker once the reply finished. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06.json`. **Re-run 2026-09-18, after the fixes:** a second-by-second watch on a new question showed the block on screen from the very first second, all the way through the model's thinking and its full reply, with never a gap. Across ten questions asked the same evening, one for each new game, this held for nine of them; one question, about Super Smash Bros., showed the block only a few seconds after the reply had already finished. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06.json`, `docs/test-evidence/plan58p1-QA-TEN-GAMES-01.json`. **Update 2026-09-18:** the same cause explains the Super Smash Bros. miss — the block loses the value it was showing the instant a reply finishes and does not get it back until a second, separate load lands a moment later. The fix has landed on the branch, with two new screen tests, one of them proved by turning the fix off and watching it fail. A repeated watch on the build before this fix, asking about Pikmin 2 a quarter-second at a time, found no gap that time, which fits the miss depending on timing rather than always happening. **Confirmed on the Deck 2026-09-19 (build 07f1299):** a shared-tip question, watched every quarter second, showed the block about a second and a quarter after the press, staying through the thinking and the whole reply with no gap across 121 checks over the next 30 seconds. This row now passes in full. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-06-fixbuild-07f1299.json` |
| **NOTES-BLOCK-07** | Voice replies turned on. Ask a question that attaches a note or a tip and let it read itself aloud in full. Separately, walk Down onto the block's header (ring visible on the header, checked against the dock) and press A. | Whatever the answer says, the block's own words are never spoken by read aloud; the header still opens normally on its own press. | ⏳ still owed — **not run 2026-09-18.** This one needs a person listening to confirm the block is never read aloud, which the automated run could not check. |
| **NOTES-BLOCK-LADDER** | A covered game running or named. Ask a question, open the block, and check whether its own chip ladder (if it has one) can be reached with the D-pad. | The ladder inside the open block takes Left/Right the same way the details panel's own ladder does. | ⏳ **UNCLEAR (Deck) 2026-09-23** — this reply's block held three shared Deck tips and no chip ladder at all, so the question could not be asked of it; Down from the open block instead went to "Save chat to Desktop". Side finding, filed as its own bug: opening the block does not scroll it into view, so most of its words sit behind the chip and the question box. Evidence `docs/test-evidence/plan64-NOTES-BLOCK-LADDER.json` (+ `.png`). |
| **TEN-GAMES-01** | Library 2026.09.18 installed on the Deck from the plugin's own folder (not from the public download hosts). Nothing running. Ask one question naming each of the ten new games in turn. | Every question attaches that game's own notes, with the block naming the note and the wiki it came from. | ✅ **PASS (Deck) 2026-09-18** — ten of ten questions attached the right game's own notes, with the correct wiki named in every header, and no false "I don't know" line on any of them. The library (version 2026.09.18) was installed straight from the plugin's own folder on the device; publishing it to the public download hosts is a separate step, still owed and waiting on the maintainer. Evidence `docs/test-evidence/plan58p1-QA-TEN-GAMES-01.json`. **Publishing done 2026-09-23:** the library now serves from Hugging Face and the GitHub release. Pressing Update knowledge base on the Deck reached that public manifest and read version 2026.09.18; a fresh remove-and-download pulled the file from huggingface.co and landed on the SD card, also reading 2026.09.18. Both pieces this row was still owing are done. Evidence `docs/test-evidence/plan64-W1-R1.json`, `docs/test-evidence/plan64-TWO-TAPS-DOWNLOAD.json` |

## Tier 3 — Heavy manual

| Block | Notes |
|-------|-------|
| **QAMP on-Deck** | See § QAMP below — **withdrawn from the roadmap 2026-09-02**: TDP apply was removed 2026-07-30, so the matrix has nothing to test until the feature returns |
| **TDP boundary clamps** | 1W/3W/15W/20W + GPU-800 advisory (many preview PASS) |
| **Background Ask full lifecycle** | Timeout, error, busy guard |
| **Multi-game matrix** | Title-specific behavior |
| **Guide-chord macro** | Power-user only — [troubleshooting.md](troubleshooting.md) §5; not casual priority. **Shelved 2026-09-19 (D113):** the maintainer said drop it; moved to the roadmap's Shelved list. |

---

## Tier 4 — Release gate

1. Clean install: Ollama not yet installed → README path → one text Ask succeeds
2. Record Decky / SteamOS / Ollama host in a short note under [testing.md](testing.md) or release PR
3. Tier 0–2 Pass or explicit Waive with reason

| Date | Git SHA / tag | Result | SteamOS / Decky | Ollama host | Notes |
|------|---------------|--------|----------------|-------------|-------|
| | | | | | |

---

## QAMP verification (Phase 1)

**Code / unit (verified 2026-04-26):** banner wattage, reopen Performance guidance, stale-slider note, GPU MHz advisory-only.

**On-Deck (Tier 3 — QA backlog):**

- [ ] **QAMP-DECK-01** Per-game profile ON: TDP apply + guidance
- [ ] **QAMP-DECK-02** Per-game profile OFF: same
- [ ] **QAMP-DECK-03** Close/reopen QAM Performance: cap reflects write
- [ ] **QAMP-DECK-04** After Steam restart: OS default (not plugin regression)
- [ ] **QAMP-DECK-05** After full reboot: same

---

## Progress tracker

| Tier | Status | Last run | Notes |
|------|--------|----------|-------|
| 0 | Preview Pass — **DOM/focus asserts invalidated 2026-08-08** | 2026-05-26 / 9e20a82 | Re-baseline pending. The RPC and shell steps stand; the DOM, focus-path and screenshot evidence does not — see [testing.md § Preview-suite evidence invalidated](testing.md#preview-suite-evidence-invalidated-2026-08-08). **SMOKE-A's PASS was purely vacuous.** Formal on-Deck Pass → QA backlog |
| 1 | Preview Pass — **DOM/focus asserts invalidated 2026-08-08** | 2026-05-26 / 9e20a82 | Re-baseline pending; same scope as Tier 0 above |
| 2 | Partial | 2026-06-09 / a9237e4 | |
| 3 | Open | | QAMP matrix deferred |
| 4 | Deferred | | Clean install before tag |

---

## Prompt-testing (qualitative)

Broader matrices beyond Tier 0–1 smokes are **deferred** ([roadmap.md](roadmap.md), the `[QA]` **Deferred manual QA** entry). Prefer: one smoke per area over long prompt lists. Old Tier 1 prompt checkboxes: [archive/testing-full-pre-2026-07-30.md](archive/testing-full-pre-2026-07-30.md).
