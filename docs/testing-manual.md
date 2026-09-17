# bonsAI testing — manual (Deck / maintainer)

> **Clean-up task — trim this file.** ★★ · about 30 minutes with one worker · Sonnet 5 at high effort.
>
> Reading this costs roughly **20,000 tokens**. Getting it to 35 KB would save roughly **11,000** per
> read. Same shape of work as the other testing file: the checks that are done and will not run again
> move to the archive, and the ones that stay get shortened to what a person has to do and see.
>
> Same care applies — a check's wording is what is being tested. Do not tidy the words of a check
> that is still live.
>
> Not started. Filed 2026-09-13 during the clean-up.

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

**Owed for plan 59 (the open tab strip redesign, landed 2026-09-17):** every tab's strip layout
changed, so this sweep must run again once the strip is on the Deck. Not run yet — the device is
held by another session.

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

- [x] Open plugin; no crash on first paint — PASS 2026-09-03 on build 3b0e9d7: the panel opened on Main with no crash
- [x] LB/RB cycles Main → Ollama → Settings → Permissions → (Developer) → About — PASS 2026-09-03: RB on the bar cycles Main → Ollama → Settings → Permissions → Developer → About → Main (`docs/test-evidence/SMOKE-A-02-tab-cycle-from-the-bar.json`)
- [x] **TAB-MARKER-01** — active tab icon is accent-coloured while focus is deep in the tab body (D-pad down into the panel, then look at the strip without moving focus back up); other icons stay grey. Close and reopen the plugin — the restored tab is still marked. With an AI character selected the marker takes that character's colour, not green. — PASS 2026-09-03: the collapsed bar's name reads gold (Ali G) while the ring is deep in the Ollama body and the other cells stay grey; the old icon strip is hidden by plan 30, so the marker is the bar's name colour now
- [x] Ollama → Test connection — success or stable unreachable (no traceback) — PASS 2026-09-03: reads *Connected · Ollama v0.32.15 · 4 models*, no traceback
- [x] Short Ask; reply in focusable chunks; D-pad through chunks — PASS 2026-09-03: *reply with only the word echo* answered *echo* in 11.9 s, one bubble, D-pad through the one chunk
- [x] **Show details** / context chips when available (see bug CONTEXT-LADDER) — PASS 2026-09-03: the ladder read *Chip 1 of 5 · KB: no game running · Reply style: balanced · Spoiler risk: med · Routed gemma4:e2b-it-qat · Developer details* (`docs/test-evidence/SMOKE-A-05-show-details.json`)
- [x] Two preset chips visible, side by side on a single row (the block was three stacked rows until 2026-08-31 and one chip for
  a day after that — one chip, or three, is a regression; D43 2026-09-01). The help chip, when showing, owns the whole row alone — PASS 2026-09-03: two chips side by side at x 48 and x 200, 148 × 30 px each

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
- [x] **Frame-rate feel:** while the chip churns, the QAM column does not stutter — watch for
      dropped frames/jank on real Deck hardware specifically, since the desk can only confirm the
      loop is throttled, not how it actually performs (one chip since 2026-08-31; this used to
      be three churning at once, so a regression here would be a surprise)

**Judged good by the maintainer 2026-09-14**, which is what this row was waiting on. The boxes above that
are still empty were never walked one by one; the measurement on 2026-08-28 covered the frame rate and the
ring during churn. See the row in [testing.md](testing.md).

### SMOKE-F — Deterministic commands (P2)

- [x] `bonsai:disable-sanitize` / `bonsai:enable-sanitize` — confirmation; no Ollama call — **PASS (Deck) 2026-09-05, re-confirmed 2026-09-15.** *disable* answered *Input sanitization is disabled for future asks. Send bonsai:enable-sanitize (exact line, Ask field) to turn it back on.*; *enable* answered *Input sanitization is enabled again for future asks.* Both instant, no model call. Evidence `docs/test-evidence/plan55-SMOKE-F.json`.
- [x] `bonsai:shortcut-setup-deck` — fixed help; points to [troubleshooting.md](troubleshooting.md) §5 — **PASS (Deck) 2026-09-05, re-confirmed 2026-09-15.** Answered with the fixed recipe: *bonsAI cannot create Steam Input macros automatically (no supported API; your controller stays under your control)*, pointing at troubleshooting §5, followed by the numbered steps. Skips the model. **Note:** the first Ask press after a reply lands did nothing — the ring is briefly unowned, so that press places it instead of acting; the second press submitted. Same family as the known unowned-ring entry. Evidence `docs/test-evidence/plan55-SMOKE-F.json`.
- [x] `bonsai:vac-check` with Steam Web API **off** → capability message only (**VAC-01**) — PASS 2026-09-03: answered with the capability message naming Permissions → Steam Web API and Developer → Integrations, no Ollama call in the plugin log (`docs/test-evidence/SMOKE-C-b-press-ask-vac-check-off.json`). **Not re-run 2026-09-15** — the ban-lookup permission was on tonight, so this line answered per VAC-02 instead (below); the permission-off case is still owed for a future pass.

**Re-confirmed together (rig) 2026-09-17:** all four built-in commands answered at once with the same fixed
wording each carries above. Evidence `docs/test-evidence/plan57-QA-SMOKE-F.json`.

---

## Tier 1 — Core shipped (S1)

### SMOKE-B — TDP apply 8W (retired)

Retired 2026-09-03 under D57 #6: it tested TDP apply, which was removed 2026-07-30, so there is nothing left to run.
Tier 1 now starts at SMOKE-E; the ID stays so older links still resolve.

### SMOKE-E — Strategy one-shot (P1)

- [ ] Strategy mode Ask; spoiler tap-to-reveal / Spoilers OK path works

### SMOKE-H — Background Ask reopen (P1)

- [x] Start Ask; close QAM; reopen → Thinking… or final reply restored — **PASS (Deck) 2026-09-16:** both shapes seen in one run — the reopened panel first showed the pending turn's "Still thinking…" line, and polling on then found the finished reply in place. Evidence `docs/test-evidence/plan56-SMOKE-H-background-ask-reopen.json`.

### Tier 1 extras

- [ ] Persist last Q&A across plugin reopen
- [ ] One Ask each in Speed and Expert (routing/disclosure differs)
- [ ] “What game am I playing?” with game focused

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

- [x] **VAC-01** Capability off — SMOKE-F — PASS 2026-09-03: answered with the capability message naming Permissions → Steam Web API and Developer → Integrations, no Ollama call in the plugin log (`docs/test-evidence/SMOKE-C-b-press-ask-vac-check-off.json`)
- [x] **VAC-02** On, empty key — **PASS (Deck) 2026-09-16:** the empty-key message named where to paste the key and showed the command shape with a SteamID, instant, no model call. Evidence `docs/test-evidence/plan56-VAC-02-empty-key.json`.
- [ ] **VAC-03** Valid key + SteamID
- [ ] **VAC-04** Profile URL
- [ ] **VAC-05** Vanity `/id/…` unsupported note
- [ ] **VAC-06** Permission off after key saved — no network

### Open regression IDs (bugs / recent ships)

- [ ] **PRESET-GAME-01** With a game running, tap a preset chip — Ask field shows chip text only (no `— {Game}` append; “this game” unchanged)
- [ ] **STRATEGY-PLACEHOLDER-01** Strategy mode, empty Ask — focus field; italic placeholder does not shift when fake caret appears
- [ ] **ASK-CARET-CHAR-01** AI character on — focus empty Ask field; native caret aligns with placeholder/text (not left of `?` badge); D-pad Up from paperclip → avatar, Right → field; character-off path unchanged
- [x] **ASK-WIDTH-01** — **partial fix landed 2026-08-15, confirmed on-Deck 2026-09-15.** Main tab, AI character **off**: the preset chips, the input box and the Ask bar all reach the QAM panel edges, with no visible gutter between them and the panel interior; the three share identical left and right edges. Repeat with the character **on**; repeat after LB/RB away and back. If a gutter survives, run `scripts/probe_deck_ask_row_width.py` and read **V0** — it walks `.bonsai-scope` → `<body>`, prints each ancestor's padding/margin and the room it eats, and marks which are bonsAI's to target vs Steam/Decky's needing a named selector. V1–V5 cover the per-row measurement loop if the ancestors come back clean — Measured (Deck) 2026-09-04: panel 300px (48 → 348); slot row, transcript and chip row each span it exactly; Ask button 298.4px, inner actions row 294.5px (the input's own padding). **By-eye confirm, PASS (Deck) 2026-09-15:** every Main row measured by rect still spans the full column, nothing overflows, and the rows sit flush by eye. Evidence `docs/test-evidence/plan55-ASK-WIDTH-01.json`, screenshot `screenshots/DeckCapture_20260915_200505_game.png`.
- [x] **CONTEXT-LADDER-01** Live turn Show details reveals inline chip ladder — PASS 2026-09-03 on the echo turn, `docs/test-evidence/SMOKE-A-05-show-details.json`
- [x] **KB-COVERAGE-01** After Ask, Show details includes `kb_coverage` chip: KB off → `KB: off`; KB on + DRG Survivor + seed corpus → `KB: N sections`; KB on + uncovered title → `KB: none for this game` (the 2026-08-16 device run cleared the CONTEXT-LADDER-01 blocker; the two negative cases are in plan 31) — The `KB: off` half PASSES (Deck) 2026-09-04: with *Use local knowledge base* off, Show details read `KB: off` with the bullet *Local knowledge base is disabled in Settings.* and no retrieval lines. — **PASS (Deck) 2026-09-05, all four readings.** Covered game `KB: 13 sections` (Deep Rock Survivor); toggle off `KB: off` (2026-09-04); nothing running `KB: no game running`; **uncovered title `KB: none for this game`** with Sifu running, alongside `Retrieval: Keyword search`, `unresolved` and no embed time. Black Mesa is not on the Recent Games shelf so the launcher refuses it; Sifu was checked against the eleven app ids in the corpus manifest.
- [x] **RETRY-RESTART-01** — **PASS (Deck) 2026-09-06.** Ask something and let it finish. Restart the plugin (`plugin_loader restart`, or reboot the Deck) and reopen bonsAI: the last conversation is drawn again with its question expanded. Press **Retry** on that question — the same question must be asked again (watch the plugin log for a new `run_game_ai_request`). No *Nothing to retry* toast. Fixed 2026-09-06; before the fix the press sent nothing at all. Then check the one case that must still show **no** Retry badge: stop an Ask before any text arrives, so the kept answer is the *Request cancelled.* placeholder.
- [ ] **CONTEXT-LADDER-03** D-pad: Show details / Retry **Down** → ladder focus (not session strip skip); **Left/Right** cycles chips; all chips visible when ≤6; **Up** from first chip → utility row; **Down** from last chip → session strip; **Developer details** chip reachable
- [ ] **MICRO-04** Strategy live-turn D-pad: branches → feedback → utilities
- [x] **D-PAD-SCROLL-02** Strategy reply: ~one readable step per D-pad Down. **Passed 2026-08-28** — one stop per paragraph
- [ ] **STRAT-SPOIL-DRG-01** DRG Survivor boss names not false-positive spoilers — ship gate is the three **required** rows below; acceptance is *no spoiler fence rendered for the entity named in the question* (display-level, not a claim about model behavior). Plan 54 landed 2026-09-15; the three new sub-rows below cover it. All rows in this block run in plan 55's Deck pass.
  - [x] **DRG-01** `2321470`, *"How do I beat Glyphid Dreadnought?"*, no consent phrase, masking on → boss tactics in plain text, no tap-to-reveal — **PASS (Deck) 2026-09-15.** Plain text, no fence, no tap-to-reveal. Evidence `docs/test-evidence/plan55-DRG-01.json`, recording `recordings/DeckRecord_20260915_210556_game.mkv`.
  - [x] **DRG-01d** As DRG-01, **then ask a second question** → the first answer stays unfenced after it leaves the live turn *(the D1 regression: history turns used to re-fence)* — **PASS (Deck) 2026-09-15.** After a second question, the Dreadnought answer stayed plain text once it was history (464 characters, no spoiler fence, no tap-to-reveal). Evidence `docs/test-evidence/plan55-DRG-01d.json`.
  - [ ] **DRG-01b/c** As DRG-01 with KB **off**, or corpus **absent** → still plain text *(D2: the low-risk signal used to be reachable only through the corpus)* — not run tonight (2026-09-15); still owed, not failed.
  - [x] **DRG-01-STREAM-01** — **fixed 2026-08-15 (R4), confirm on-Deck.** As DRG-01 with streaming **on**: no `Spoiler hidden until complete…` chip appears at any point while the answer streams in — the fence renders as plain text from the moment it opens, not only after it closes — **PASS (Deck) 2026-09-15.** No mask chip seen in 74 polls over 62 seconds. Evidence `docs/test-evidence/plan55-DRG-01.json`, recording `recordings/DeckRecord_20260915_210556_game.mkv`.
  - [ ] **HADES-UNNAMED-STREAM-01** — companion check for the fix above, so nothing was over-relaxed. Hades `1145360`, a question that does **not** name a boss, streaming on → the mid-stream mask chip **still appears** for story-adjacent detail (Hades shares the `roguelike` genre with DRG Survivor, so this is the case the R4 fix must not touch) — **Not claimed 2026-09-15**: the fast poll never saw the mid-stream chip. A recording exists (`recordings/DeckRecord_20260915_205114_game.mkv`, untracked) for the maintainer to play back.
  - [x] *(recommended)* **HADES-NAMED-01** Hades `1145360`, *"How do I beat Megaera?"* → plain text. Naming the boss is consent for that boss on any title (spoiler-constitution rule 7) — **PASS (Deck) 2026-09-15**, plain text; the misspelling bug (Megara vs Megaera) also reproduced on the same run. Evidence `docs/test-evidence/plan55-HADES-NAMED-01.json`.
  - [ ] *(recommended)* **HADES-UNNAMED-01** Hades, a question that does **not** name a boss → story-adjacent detail **still fenced**. This is the genre over-relax guard: Hades shares the `roguelike` genre with DRG Survivor — **Mixed on the Deck 2026-09-15, three runs, all recorded honestly.** *"what happens when i finally reach the surface in hades"* got **no fence** and a mild story spoiler in plain text — **FAIL as written** (`docs/test-evidence/plan55-HADES-UNNAMED-01.json`). *"how does the story of hades end"* and *"who is waiting at the end of the game in hades"* both got a masked fence — **PASS** (`docs/test-evidence/plan55-HADES-UNNAMED-01-run2.json`, `docs/test-evidence/plan55-HADES-UNNAMED-STREAM-01.json`). **Re-run FAIL (Deck) 2026-09-17:** *"what happens when you reach the surface"* in Hades came back as plain, unmasked text again, no spoiler block. Still mixed, not closed. Evidence `docs/test-evidence/plan57-QA-HADES-UNNAMED-01.json`.
  - [ ] **STRAT-SPOIL-NAME-01** game known only by name. Setup: Doom 64 (or another emulated no-story title from
    the list: Super Mario 64, Mario Kart 64, Pikmin 2) running as a non-Steam shortcut, Strategy mode, masking on,
    streaming on. Do: ask a boss question ("how do I beat the mother demon"). Pass when: any spoiler box the model
    draws renders as plain text, from the first streamed word, with no "Spoiler hidden until complete…" chip and
    no tap-to-show block; then ask a second question and confirm the first answer stays plain once it is history;
    then reopen the chat from the chat slot list and confirm it is still plain. Note in the row: if no emulated
    shortcut is installed on the Deck, the row is blocked, not failed — say so. **BLOCKED 2026-09-15:** no
    emulated shortcut on this Deck is installed. Doom 64 and Doom 64: Retribution both exist as shortcuts, but
    both read as not installed, so the setup step cannot run. Blocked, not failed; still owed.
  - [ ] **STRAT-SPOIL-FIRST-01** name-first boss question. Setup: Portal 2 `620` running, Strategy, masking on,
    streaming on. Do: ask *"wheatley fight"*. Pass when: Wheatley's tactics are plain text from the first streamed
    word with no mid-stream chip, and any other story detail the reply touches is still boxed (that half proves
    nothing else was opened; it depends on the model drawing a box for something else, so it may take a few
    asks). Compare with *"how do I beat wheatley"*, which should behave the same. Then reopen the chat from the
    slot list: still plain. **BLOCKED 2026-09-15:** Portal 2 is not in this Deck's Steam library at all, read
    from Steam's own app list. Blocked, not failed; still owed.
  - [x] **STRAT-SPOIL-TEXT-01** game named only in the question. Setup: nothing running, Strategy, masking on.
    Do: ask *"drg survivor what class"*. Pass when: the answer is plain text with no spoiler box, the risk chip
    under Show details reads low, and the reply does not claim the game is running. Then the guard: *"new vegas
    best build"* with nothing running → still fenced or careful, as a story game. — **PASS (Deck) 2026-09-15,
    both halves.** The Deep Rock half: plain text, spoiler risk chip low, the game resolved from the question
    text, no claim of the game running (`docs/test-evidence/plan55-STRAT-SPOIL-TEXT-01-drg.json`). The New
    Vegas guard: a gameplay-only reply about stats and early armour, no story detail, and the follow-up menu
    named New Vegas places (`docs/test-evidence/plan55-STRAT-SPOIL-TEXT-01-newvegas.json`).
  - [ ] *(extra credit, does not block)* **DRG-01e** Streaming off → plain text; **DRG-01f** `[Strategy follow-up]` turn → plain text
- [x] **THINKING-COPY-01** Same Ask, no phase boundary crossed → the italic line does **not** change. Specifically: the opener that appears on submit must be the *only* opener — watch the first ~2s for a rewrite from one generic line to another. That rewrite was the bug; if you see it, the client is composing again — **PASS (Deck) 2026-09-17:** the first status line held for about 5.5 seconds before changing, no early rewrite. Evidence `docs/test-evidence/plan57-QA-THINKING-COPY-01.json`.
- [ ] **THINKING-OPENER-01** — **settled 2026-08-08, keep as a regression check.** Submit an Ask: the first line you can actually read should be one quoting your question. The constant *Thinking…* placeholder exists but the maintainer could not perceive it on device, which is the intended outcome — the round trip is imperceptible and the backend-authoritative design stands. If *Thinking…* ever becomes **readable** as its own line, the round trip has regressed
- [x] **THINKING-SLOW-01** Black Mesa `362890`, cold model (first Ask after a reboot, or after `ollama stop`): the line must report **building context** and then **connecting/waking the model** before any answer text. The point is that the longest silence now says something — and says it encouragingly, not with a sigh — PASS (Deck) 2026-09-04: the slow-path blurbs appeared in order and cycled across 32 sampled phases.
- [x] **THINKING-LIVE-01** During a long answer (Expert mode, or a 30s+ reply): the line **keeps moving** on an irregular beat (4–12s between changes, first change 7–13s in) and never sits on one string for the whole run. Three things should be visible over a long generation: the `connecting` line giving way to a *writing your answer* line once tokens start, then rotating duration lines that escalate in tone, and — if the model cooperates — its own `<bonsai-status>` text cutting in and resetting the cycle. **Fail conditions:** any line held for more than ~15s; a *regular* beat you can count along to (the whole point of the randomised window); a line predicting completion (*almost done*, *nearly there*); a line repeating itself back to back; half-written text — PASS (Deck) 2026-09-04: the line updated throughout a 212s reply, one writer, no interleaving. **Re-confirmed (Deck) 2026-09-17:** the line changed three times over about 7 seconds, no freeze, no repeat; the run was short enough that the 30-second slow-path wording was not produced. Evidence `docs/test-evidence/plan57-QA-THINKING-LIVE-01.json`.
- [x] **THINKING-SPOILER-01** Strategy mode, masking on, a title with real spoilers: if the model names something spoilery in the thinking line it must render as blocks (`beat ████ ██████ dance`), never as plain words and never as literal `[[spoiler]]` markup. Watch for the failure direction too — a line that is *entirely* blocks means the model opened the marker and never closed it, which masks to end of line by design — PASS (Deck) 2026-09-04: the Red Dead ending question fenced — *Spoiler — tap to show / Hidden until you reveal (Strategy Guide).*
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
- [ ] **KB-CANCEL-01** Ollama KB **while a download runs**: **Cancel** replaces Remove and is the row's only enabled stop (the primary reads *Downloading…* and is disabled). Down from **Use local knowledge base** → Cancel; Up from **Reply verbosity** → Cancel; **A** → *Cancelling…*, second press does nothing; row returns to Update/Download + Remove within a few seconds; status line reads *Download cancelled* in grey, **not** the raw backend error in red; a fresh download still starts afterwards
- [ ] **OLLAMA-FOCUS-01** Ollama tab open (no prior Test): with Ollama reachable, primary button shows **Update AI & models** (quiet auto-probe)
- [ ] **OLLAMA-FOCUS-02** Run AI on this Deck: D-pad vertical — toggle → Install/Update → Browse models → Install options… → Test connection → KB toggle
- [ ] **OLLAMA-FOCUS-03** Up from Test connection lands on **Install options…** (or last Install-options submenu row when open)
- [ ] **REPLY-VERB-01** Reply style: set **Caveman** → Ask → Input handling shows `Reply style: caveman` and reply is terse; **Balanced** → no `REPLY VERBOSITY` block vs baseline; **Detailed** → paragraphs; with **AI characters** on + Caveman, character voice (not caveman grammar); Strategy + Detailed still ends with `bonsai-strategy-branches`
- [ ] **OLLAMA-KEEPALIVE-FOCUS-01** **Keep models loaded** slider thumb: white gpfocus ring vertically centered on the dot (no ~1px high offset)
- [ ] **ROUTING-01** Set text/vision try order opens picker listing installed tags without requiring a prior Test connection tap
- [ ] **ROUTING-02** Reorder + Done persists; reopen modal shows saved order
- [ ] **ROUTING-FOCUS-01** Try-order modal chrome matches Pull Models / Character picker (deferred bug). **The D-pad half is no longer a question** — it failed on 2026-08-28, see PICKER-REORDER-01
- [x] **PICKER-EDGE-01** Fullscreen pickers: from the first control press Up, from the last press Down, ring must still reach the confirm buttons. **Character picker and AI models hub pass (2026-08-28)**; try order fails
- [ ] **CHAR-PICKER-RING-01** Character picker grid, D-pad to a tile on the edge of a column (top, bottom, left-most and right-most column) — the focus ring must render in full, not cut off by the column's own edge. **Fixed at the desk 2026-09-04:** each grid column now carries 6px of inner padding (`PICKER_GRID_RING_PAD_PX` in `CharacterPickerModal.tsx`) so a tile's ring has room before the column's `overflow: hidden` clips it. Owed: a screenshot with the ring visible on an edge tile, for each of the four edges **Deck 2026-09-04, build 49241e7 (plan 32): measured, PNG for the maintainer's eyes.** Settings, Ali G, A opened the picker; Down landed the ring on the top-left tile (Jackie Welles). The tile sits 6.0 px from its column's left edge and 6.1 px from the right, the column is the first overflow-hidden ancestor and carries the 6 px padding, and Steam's ring here is a sub-pixel `outline auto` in orange, so the ring has room on every side. Picture: `screenshots/DeckCapture_20260904_214941_game.png`. The maintainer's glance closes it. **Maintainer 2026-09-05: FAIL — "why is the AI character screen have rings that are yellow? they should be white".** The measurement was about spacing and missed the colour. Cause: the tiles are Decky buttons with no class of their own, so no plugin rule matched them and the browser drew its own hairline ring; on that build it took the gold tint from the active character (Ali G). A fresh capture 2026-09-05 04:04 shows it white but still hairline-thin (`screenshots/DeckCapture_20260905_040431_game.png`), and the computed styles on the focused tile carry no colour of ours at all. **Fixed the same day:** the tiles join the plugin's own white-ring rule, which the column's 6px padding was already sized for. Second look owed. **Measured after the rebuild, same day:** the focused tile computes `outline: rgba(255,255,255,0.9) solid 1.56px`, offset 1.99px, with the soft outer glow — the plugin's own ring, not the browser's. Picture `screenshots/DeckCapture_20260905_041028_game.png`. **Maintainer, second look 2026-09-05: PASS.** Row closed.
- [x] **PICKER-REORDER-01** Try order: one press of Down moves the *highlight*, not the model. **Passed 2026-08-28** after D36 option 1. Vision list not driven separately
- [x] **PICKER-B-CLOSE-01** Try order closes on B, from a row and from the footer. **Passed 2026-08-28** once it moved onto the shared modal frame
- [x] **TAB-RESUME-MODE-01** Developer → **Navigation → Tab to open on (D15)**: each stop changes where the *next* open lands — **A · Main** always Main, **B · Resume** the tab you left, **C · 5 min** the tab you left only within five minutes. Re-check the control after a reopen to confirm the choice persisted — PASS 2026-09-03: A · Main → reopened on Main after leaving from About (`docs/test-evidence/TAB-RESUME-MODE-01-a-select-main-and-close.json`); C · 5 min → reopened on About within a minute (`docs/test-evidence/TAB-RESUME-MODE-01-c-select-5min-and-close.json`) and on Main after 5 m 29 s away (closed 01:15:21, reopened 01:20:50); B · Resume → reopened on About (`docs/test-evidence/TAB-RESUME-MODE-01-f-select-resume-and-close.json`); each choice was still highlighted on Developer after its reopen; on disk A = `always_main`, B = `resume`, C = `resume_recent`; the maintainer's setting (C) was restored.
- [x] **TAB-RESUME-FOCUS-01** D-pad the same row: Down from **On-screen debug HUD** reaches the three buttons, **Left/Right** moves between A/B/C, **Down** leaves the row for **App activity logging** below, **Up** returns to Diagnostics — no stop skipped and no button acting on a direction press — **PASS 2026-09-03** (`docs/test-evidence/TAB-RESUME-FOCUS-01.json`): Right A → B → C and stops, Left back, Up to Jump to Steam Input in Diagnostics, Down re-enters on A · Main, second Down to App activity logging; `tab_resume_mode` on disk unchanged through eight presses. Note: Jump to Steam Input (running game) sits between the HUD and the row even with no game running, so Down from the HUD takes two presses
- [x] **TAB-SWITCH-01** Press **RB** repeatedly through the whole strip, with focus **deep in a scrolled** Settings or Ollama panel: the icon strip must not lurch sideways and drift back, and the content pane must not flash or jump. **RB is the case that mattered** — the fault was asymmetric and LB never showed it, so an LB-only pass proves nothing. Include the wraparound (**RB on About**, rightmost, which wraps to Main rather than doing nothing) since that is the longest strip travel. Repeat with focus parked **on the tab icons**. Fixed 2026-08-07 by `overflow: clip` in section-1.ts; if this regresses, re-run `scripts/archive/probe_deck_tab_switch.py` and check whether `scrollLeft` on the tabs-root child stays 0 while `scrollWidth` collapses. Mechanism: [planning/03-lbrb-tab-flicker.md](archive/03-lbrb-tab-flicker.md) § 10 — PASS (Deck) 2026-09-04, measured: RB through the whole strip including the About wrap, focus deep in a scrolled Ollama panel, 1,453 samples at 16ms — `scrollLeft` never left 0 and `scrollWidth` never moved.
- [ ] **ABOUT-LINKS-01** About tab: D-pad **down** from the reply-language dropdown must reach **all four** links in order — GitHub, Built on Ollama!, Bugs & Feature Requests, PayPal — with no stop skipped and no press swallowed, and **Up** must walk back the same way. Press **A** on one and confirm Steam's browser opens (it is bright). Fixed 2026-08-07: hand-rolled `Focusable` + `onMoveUp`/`onMoveDown` wrappers returned `true` (so Steam skipped default navigation) while moving focus with a plain DOM `.focus()`, which does not transfer gamepad focus across nav containers — presses were consumed and focus never moved, making every link unreachable. The same chain also skipped the two middle links outright
- [ ] **QAM-BODY-RO-01** Switch tabs repeatedly (10+, through the taller Settings/Ollama panels), then D-pad to the **bottom** of a long panel: the pane must still reach its end and not be pinned to a stale height. Steam replaces the scroll node on every switch, so this is specifically about the 2nd switch onward — one switch proves nothing. Fixed 2026-08-08; if it regresses, `--bonsai-tab-body-height` will stop matching the live pane's `clientHeight` after a switch. **Re-run QAM-BAZZITE-01 and D-PAD-SCROLL-01 with this** — same measurement chain
- [x] **SOFT-PREDICT-01** Speed mode, a prompt long enough to hit the 800-token wall once: confirm the `Continuing…` cue is visible and brief at the stream tail, the final reply reads as one seamless answer (no visible seam at the stitch point), and reopening the tab afterward shows no `Continuing…` in the saved history text — PASS (Deck) 2026-09-04: a 60-tip prompt ran to 10,707 characters, the `Continuing` cue was caught mid-stream by a 400ms sampler, and neither the finished reply nor the saved history after a tab round-trip contains it. **Re-confirmed (Deck) 2026-09-17:** a long five-part reply read with no seam and `Continuing…` never appeared, live or saved. Evidence `docs/test-evidence/plan57-QA-SOFT-PREDICT-01.json`.
- [x] **SOFT-PREDICT-03** Same setup as SOFT-PREDICT-01 — press **Stop** during the `Continuing…` cue window: kept partial body plus the small **Stopped** notice, and `Continuing…` must **not** appear in the kept text. Re-run after the 2026-08-15 throttle fix (`main.py` `_update_partial_response` shrink bypass + `stripSoftContinueCue` backstop) — this is the exact race the fix targets, so it is the highest-value manual re-check on this row — PARTIAL (Deck) 2026-09-04: Stop inside the cue window kept 3,628 characters of partial body and `Continuing` appears nowhere in the kept text — the 2026-08-15 fix holds. **But no "Stopped" notice appears anywhere**, and the stopped turn loses Helpful / Not really / Retry. Filed under Bugs. **PASS (Deck) 2026-09-17:** stopping partway now keeps the partial text along with a `Stopped — partial answer kept.` notice. Evidence `docs/test-evidence/plan57-QA-SOFT-PREDICT-03.json`. Whether the Helpful / Not really / Retry loss from the 2026-09-04 run is still true was not re-checked this pass.
- [ ] **SOFT-PREDICT-04** Strategy mode, an answer long enough to continue mid-branch (opens a `bonsai-strategy-branches` fence before hitting the length wall): confirm no half-rendered fence or stray JSON appears at any point in the stream, including right at the continue boundary
- [ ] **SOFT-PREDICT-05** A real thinking model (e.g. a qwen3 variant) at the default `think: false`: confirm a visible reply still comes back — no empty-reply regression from the model spending the whole budget on hidden thinking
- [x] **THINK-EFFORT-04** Ollama → **Thinking**, with a real thinking model (qwen3 variant) installed: set each of Brief / Balanced / Deep and Ask → answers still arrive, latency grows with the level, and **no raw reasoning leaks into the reply body**. Then Ask on a non-thinking model (gemma / llama) → the answer still arrives, a *Thinking not supported* toast appears **once** (not on the second Ask), and a second model that also cannot think warns separately. **While here, read the Ollama log for the 400 body** and tighten `_is_thinking_unsupported_error` in `ollama_service.py` if the wording is stable — the matcher is loose on purpose because the string is not a stable API — PASS (Deck) 2026-09-04: qwen3.5:4b forced first in the try order, Thinking Deep; 212s reply, Show details read `Routed qwen3.5:4b`.
- [x] **THINK-EFFORT-05** D-pad the **Thinking** row: **Down** from the Reply style slider reaches the four buttons, **Left/Right** moves between Off/Brief/Balanced/Deep, **Down** exits to **Custom timeouts** below, **Up** returns to the Reply style slider — no stop skipped, and no button acting on a direction press. Inserting this row rewired both neighbours, so check the Reply style slider's Down and the latency row's Up specifically — PASS 2026-09-03 (`docs/test-evidence/ONBUTTONDOWN-AUDIT-01-and-THINK-EFFORT-05-b.json`): Down from the Reply style slider reaches Off, Right walks Off → Brief → Balanced → Deep and stops, Left back, Down leaves to Custom timeouts, Up returns to the Thinking row then to the Reply style slider, no button acted on a direction press
- [ ] **EXPERT-CAP-01** Expert-mode Ask with a long answer: it now runs to ~1200 tokens before a soft continue rather than ~800. Expert was silently capped at the Speed budget until 2026-08-15, so a long Expert reply should visibly need fewer `Continuing…` cues than before the fix

### CHAT-SLOTS-V2 — Named chat slots (P0)

- [x] **CHAT-SLOTS-V2-01** D-pad **Down** from tab strip (or Ask) reaches the slot row; **Down** from row reaches the transcript (the preset row when the slot is empty — the layout inverted in the v3 redesign, W2); **Up** returns toward tabs; row is quiet at rest; with one slot, ghost neighbours hidden  — **PASS 2026-08-30 (automated),** but only after the row was made a focus stop; before that fix it was unreachable by D-pad in both directions. **PASS (Deck) 2026-09-17:** Down twice from the tab strip reaches the chat text, and Up retraces the same path. Evidence `docs/test-evidence/plan57-QA-CHAT-SLOTS-V2-01.json`.
- [x] **CHAT-SLOTS-V2-02** `[+]` creates a slot; **A** on title opens rename; **Right** → **×** → ConfirmModal deletes; focus returns to row after each modal  — **PARTIAL 2026-08-30 (automated).** `[+]` created a slot; **A** on the title opened the rename modal; **Right** moved the inner stop to **×** and turned it red without shifting the row. Return focus after the modal closes **failed at first** (the ring landed on the tab strip) and is **now fixed and re-verified on device**: `gpfocus` is back on the row after Cancel. Actually deleting a slot was not exercised.
- [x] **CHAT-SLOTS-V2-03** Ask in slot A → **LB/RB** to slot B mid-Ask → reply lands in **A**; reopen A — both Q and A present — PASS (Deck) 2026-09-04: RB to another slot mid-stream and LB back; the reply landed in A with both question and its 5,749-character answer.
- [x] **CHAT-SLOTS-V2-04** Close QAM mid-Ask → reopen → pending question visible (not empty transcript) — **PASS (Deck) 2026-09-16:** the reopened panel showed the pending turn's line rather than an empty transcript. Same run as SMOKE-H above. Evidence `docs/test-evidence/plan56-SMOKE-H-background-ask-reopen.json`.
- [x] **CHAT-SLOTS-V2-05** With row focused: **LB/RB** cycle slots; blur row → **LB/RB** switch tabs — repeat with a game running and without; record P-0 result in [major-redesign.md](archive/major-redesign.md) § 7 R1  — **PASS 2026-08-30 (automated).** Row focused: LB cycled slot without changing tab (`selectedTabIndex` stayed 0). Row blurred: LB switched tab 0 → 5. **This is the P-0 spike; it passes, so the redesign plan stands and the sixth-*Chats*-tab fallback is not needed.** Evidence `docs/test-evidence/CHAT-SLOTS-V2-05-*.json`. Not yet repeated with a game running.
- [x] **CHAT-SLOTS-V2-06** Carousel stops at `[+]` and at last slot (no wrap); dots track active slot at cap of 8  — **PASS 2026-08-30 (automated).** LB at `[+]` is a no-op (no wrap); dots tracked the active slot (index 5 → 4) and rendered **6** for 6 slots, so the cap-8 change is live. End boundary observed as a dimmed RB pill on the last slot but not press-tested.

### CHAT-SLOTS-V3 — Named chat slots redesign (P0)

Run **CHAT-SLOTS-V2-05** (P-0 bumper suppression) first — it has never run on device, and
everything below assumes it passes. Plan:
[28-named-chat-slots-v3-implementation-plan.md](planning/28-named-chat-slots-v3-implementation-plan.md).

- [x] **CHAT-SLOTS-V3-01** (W2) **Down** from the slot row reaches the transcript's first stop; **Down** continues transcript → presets → ask bar; **Up** retraces; on an empty slot **Down** from the row reaches the presets. The context footnote renders below the ask bar  — **PASS 2026-08-30 (automated).** Empty slot: tab strip → row → presets. With a transcript: tab strip → row → turn header → answer → Show details → session context → presets. Up retraces. Evidence `docs/test-evidence/CHAT-SLOTS-V3-01-*.json`. Note the session-context strip is a stop between transcript and presets whenever it has content. — re-run PASS 2026-09-03 with the walk starting at the bar (`docs/test-evidence/CHAT-SLOTS-V3-01-rerun-fresh-open-walk.json`)
- [x] **CHAT-SLOTS-V3-02** (W10) A slot named longer than about 12 characters: the focused title sweeps end to end and snaps back on a ~6s cycle; quiet rows never move; with Steam's reduced-motion setting on (if it is exposed), no sweep  — **PASS 2026-08-30 (automated).** A 62-char slot name focused: `--overflowing` set, `bonsai-slot-title-scrub` 6s attached, `text-overflow: clip`, sweep distance 312px = measured overflow. Quiet row: no class, no animation. Reduced-motion not exercised.
- [x] **CHAT-SLOTS-V3-03** (W3+W11) A fresh slot and the `[+]` position both show the 52px silhouette and caption under the row; `[+]` shows no dots; the first Ask replaces the preview with the live turn  — **PASS 2026-08-30 (automated).** `[+]` shows no dots and no ×; logo 52px @ .16 opacity; caption 13px italic, line-height 20.15 (13 × 1.55), max-width 210px, centred. Create title 13px / rgba(200,214,230,0.45) / no glow **after the specificity fix** — it computed 14px / #f2f7fc before it.
- [x] **CHAT-SLOTS-V3-04** (W14) Rename: cyan field, **Save** disabled while the name is empty, caret in the field on open; delete confirm shows Steam's destructive styling; both modals still survive a QAM close/reopen and return focus to the row. If `focusOnMount` fights the modal-survival focus dance, remove it and note that here  — **PARTIAL 2026-08-30 (automated).** Styling exact: SLOT NAME 10px/700/1px tracking, field 36px / 8px radius / cyan `rgba(156,231,255,0.5)` border / `#9ce7ff` caret, zero inner glass panels, stock Save+Cancel footer, field pre-filled. `focusOnMount` lands the ring in the field and does **not** fight the survival dance. Save-disabled-while-empty needs the on-screen keyboard, so it is covered by `ChatSlotRenameModal.test.tsx` instead. Return focus **fixed and verified 2026-08-30**: the registry was handed the row's outer wrapper, whose `closest('.Panel.Focusable')` resolved UP to an ancestor container; it now gets the row's own Focusable, and after Cancel `gpfocus` is on `.bonsai-chat-slot-row-focus`.
- [x] **CHAT-SLOTS-V3-05a** (W15) Ask in slot A, **LB** to slot B mid-stream: B shows B's own content (or the empty-slot preview) and zero of A's tokens; the ask bar still reads busy — FAIL (Deck) 2026-09-04: slot B showed a Strategy branch block belonging to A ("Where are you at in … ? A. Just starting in the town area / B. Dealing with a tough encounter or trap"), still there after A finished; B's ask bar did not read busy. Filed under Bugs. **Deck 2026-09-06: the leak is fixed.** A Ravenholm Strategy answer's branch block was checked against both other chats — one with two turns of its own, one empty — and appeared in neither, in either shoulder direction; switching back brought it home unchanged. The ask-bar-reads-busy half was not re-run.
- [ ] **CHAT-SLOTS-V3-05b** (W15) Return to A mid-stream: the question, the partial text and the caret are all back within one poll
- [ ] **CHAT-SLOTS-V3-06a** (W16) While away from slot A: A's dot is a hollow cyan ring; if A is the visible ghost neighbour, a cyan spark sits at that row edge, outside the ghost's fade
- [ ] **CHAT-SLOTS-V3-06b** (W16) A finishes while you are away: the ring turns solid green; returning to A clears it
- [ ] **CHAT-SLOTS-V3-06c** (W16) QAM closed when the answer finishes: the reply-ready toast still appears (regression check on the completion watch)
- [x] **CHAT-SLOTS-V3-07** (W17) A slot with 3 archived turns: a **"3 earlier"** pill sits above the newest turn and is a D-pad stop; **A** expands it into header rows and focus lands on the first revealed row; with exactly 1 archived turn the header row shows with no pill — PASS (Deck) 2026-09-04: the "12 earlier" pill was a D-pad stop, A expanded it into 13 header rows, the pill went, and focus landed on the first revealed row.
- [x] **CHAT-SLOTS-V3-08** (bottom dock) With a short or empty slot: preset chips, the Ask bar and the context line sit at the bottom of the panel with the empty space above them (between transcript and presets); the empty-slot preview stays directly under the slot row; the pane does not scroll when its content is short; a long transcript still scrolls with the Ask bar in flow at its end. Recheck the Rule 1 edges: every Main row still spans the full column width (the fill column moved the PanelSection out of the old `:has()` gutter fix's range — section-4 carries a dedicated line for it)  — **PASS 2026-08-30 (automated).** Short slot: `scrollHeight == clientHeight` (667) so the pane does not scroll; dock bottom 749 = column bottom; context line last. Every row x=48 w=300, so the Rule 1 edges survived the new wrappers.
- [x] **CHAT-SLOTS-V3-09** (sticky dock) With a transcript long enough to overflow the pane, the Ask bar, the ASK button and the context line all stay on screen while the transcript scrolls behind them; the dock has an opaque surface so nothing shows through it  — **PASS 2026-08-30 (automated).** `scrollHeight` 963 against a 667 viewport and both `askOnScreen` and `footOnScreen` true. Before the fix the same state put both off screen. **Correction, same day:** that pass was
  measured against the scroll viewport's bottom edge, and the viewport itself was hanging 50px below the screen (see **CHAT-SLOTS-V3-11**),
  so "on screen" was measured against the wrong edge. The sticky behaviour was right; the reference was not. Re-check against
  `window.innerHeight` when V3-11 is run.
- [x] **CHAT-SLOTS-V3-10** (new-chat affordances) On the **first** slot with the row at rest, a blurred **+ New chat** ghost sits left of the title and is not truncated; the dot strip leads with a **+** marking the create position, and that + is the active marker while the carousel is at `[+]`  — **PASS 2026-08-30 (automated).** Ghost renders "+ New chat" at 55px untruncated; strip shows 7 markers for 6 slots (1 create + 6). Slot titles created from now on lead with the question, not the game name — **existing slots keep their stored labels**, so this only shows on newly created chats.
- [x] **CHAT-SLOTS-V3-11** (panel height) Nothing the plugin draws sits below the visible screen: with a transcript long enough to
  overflow, read `.bonsai-scope`, the `TabContentsScroll` viewport, the Ask bar and the context line, and confirm every `bottom` is
  `<= window.innerHeight` — **measured against the window, not against the scroll viewport, which was the reference that hid this the
  first time**. Then confirm the context line is fully readable (its `height` unclipped, not a sliver) and that the pane still recovers
  its height after a pointer enters the panel (the sag guard this change touches)  — **PASS 2026-08-30 (automated).**
  `window.innerHeight` 766; scope, scroll viewport, dock and context line all bottom at **765**, so nothing hangs below the screen — the
  same read before the fix put the scope and the viewport at **816**. Context line 13px tall and whole, not a sliver. The 40px strip left
  under the dock turned out to be a **second, separate cause**: Steam's scroll container carries `padding-bottom: 40px` and sticky pins to
  a scrollport's *content* box, so `bottom: 0` stopped 40px short. Zeroed for the Main tab only; `gapUnderDock` is now **0** with the pane
  genuinely overflowing (scrollHeight 652 > clientHeight 616). Pointer-sag recheck still owed.
- [x] **CHAT-SLOTS-V3-12** (create affordances, revised) On a slot at rest, the ghost to the left of the title reads exactly `[+]` — the
  same token the create position uses as its centre label — is not truncated, has no directional fade eating its opening bracket, and has
  clear space between it and the title rather than reading as a prefix on it. In the dot strip, the leading `+` sits on the **same
  horizontal centre line** as the dots beside it (compare `getBoundingClientRect()` centres, not eyeballed)  — **PASS 2026-08-30
  (automated).** Ghost text exactly `[+]`, 14px wide, `truncated: false`, `mask-image: none`, and 14px of clear space to the title. In the
  strip the `+` centre and every dot centre read **191.45** — off-line by **0**. The cause of the old misalignment was `align-items` on the
  dot row defaulting to `stretch` against fixed-height dots, so the glyph box hung below their line.

- [x] **CHAT-SLOTS-V3-13** (strip rhythm + create position) Every marker in the dot strip — the leading `+` included — has the **same box
  size**, sits on **one centre line**, and has **equal spacing**; compare `getBoundingClientRect()` widths, heights, centres and inter-box
  gaps rather than eyeballing. At the `[+]` position **only the `+` is lit**: no slot dot carries `--active`. And on a slot whose content
  does **not** overflow (the `[+]` slot is the reliable one), the dock is still flush — `gapUnderDock` 0, context line on screen  —
  **PASS 2026-08-30 (automated).** Seven markers, all 5.99 x 5.99, all centred on one line, all six gaps exactly 6.0. At `[+]`:
  `activeMarkers: ["create"]`, centre label `[+]`, `gapUnderDock` **0** with `overflows: false`. Two separate causes were behind the
  original report: state was sized (3px quiet / 4px active / 6px ring), which reads as uneven spacing because a flex gap sits between
  boxes; and the strip keyed off `activeSlotId`, which cycling to `[+]` deliberately leaves alone, so a slot dot stayed lit on top of the +.
  The bottom gap was a **third**: Decky's PanelSection reserves 24px under itself, invisible whenever the dock is sticky but plain to see on
  the short `[+]` transcript.

- [x] **CHAT-SLOTS-V3-14a** (strip rhythm, smaller markers) Every marker in the dot strip is the same size, on one centre line, with equal
  gaps, and the markers are small rather than heavy  — **PASS 2026-08-30 (automated).** Seven markers at **3.99 x 3.99**, one centre line,
  all six gaps exactly **6.0**. The residual oval look was the transparent 1.5px border reserved on the base rule: it gave each dot two edge
  sets to snap independently at this device pixel ratio (1.28 measured), so the ring is an inset box-shadow now and the base rule has no
  border at all.
- [x] **CHAT-SLOTS-V3-14b** (one row height) The slot bar is the same height at `[+]` as on a populated slot  — **PASS 2026-08-30
  (automated).** Title row **22** and delete box **22** on both. The bar used to shrink ~9px at `[+]`, because the 22px x set the line on a
  slot and nothing did at the create position; the row now reserves the delete box's height whatever is in it.
- [ ] **CHAT-SLOTS-V3-14c** (the game above the title) A chat created from now on shows its game's name in quiet text above the
  conversation title; a chat created before this shows the line reserved but empty; `[+]` shows it empty. **Needs a slot created after
  2026-08-30** — the name is only stored at creation, so every existing slot reads empty. **FAILED on this build 2026-09-15:** a
  chat created with Hades running got no game name at all — most likely the same cause as the game-line bug above (the line
  under the question box still read "no active game detected" at the moment the chat was created). Evidence
  `docs/test-evidence/plan55-CHAT-SLOTS-V3-14c.json`. Re-run after lane F's fix.
- [x] **CHAT-SLOTS-V3-14d** (the end of a long reply) After a long answer settles, its end is reachable and does not look cut off: text
  visibly fades under the chips rather than being sliced, and the pane brings the end into view. **Fade PASSES** (18px gradient above the
  dock, measured 2026-08-30). **Auto-scroll PASSES 2026-08-31** — the long proton Ask driven by bridge: tail in view every frame while
  streaming (overshoot −40px where it had been stuck at +165px), and after the post-Ask rebuild yanked the pane to 0 the delivery passes
  landed it at 574 of a 602 max, last line 80px above the dock. Root cause and fix (scrollIntoView instead of scrollTop writes, plus a
  1.2s delivery window) in the roadmap entry. Worth one human pass for feel: no visible jitter while streaming, and scrolling up
  mid-answer still holds.
- [x] **CHAT-SLOTS-V3-15a** (carousel order) The leftmost dot is the most recently saved chat and [+] sits one LB press to its left;
  the rightmost dot is the oldest — **PASS 2026-08-31 driven by bridge**: active slot read at dot 2, two LB presses landed on [+]
  (`docs/test-evidence/V3-20-lb-to-create` steps), dot order read structurally before and after.
- [x] **CHAT-SLOTS-V3-15b** (ask from [+]) Submitting an Ask at the [+] position creates a chat, pops the panel to it, and the whole
  answer plays out there — **PASS 2026-08-31**: one second after A on ASK the new slot existed at dot 1 with the blinking pending
  ring and the thinking blurb on screen; the answer streamed in place and settled with its end 80px above the chips (scroll 731 of
  759). After a plugin reopen the chat is titled by its first question with [+] as its left ghost. Evidence
  `docs/test-evidence/V3-20-ask-from-create.json`.
- [x] **CHAT-SLOTS-V3-15c** (the [+] screen shows nothing slot-specific) At [+]: title `[+]`, create marker lit, empty-state art, and
  NO session-context strip, NO Save chat, no transcript — **PASS 2026-08-31**, read structurally on device.
- [ ] **CHAT-SLOTS-V3-15d** (label updates live) Ask the first question in a fresh chat while staying on it: the row's title should
  change from "New chat" to the question as the answer archives, without closing the panel. The refresh is in code
  (`reloadActiveSlotTranscript`) and the rename was verified across a reopen; the live in-place update still wants one human glance.
- [x] **CHAT-SLOTS-V3-15e** (the dingleberry sweep, D42) A on [+] creates "New chat"; switch away without asking and it deletes itself —
  **PASS 2026-08-31 driven by bridge** (`docs/test-evidence/V3-21-sweep-empty-chat.json`): created at position 1, one RB later gone from the rotation.
  Protections covered by unit tests: a renamed empty chat stays, a generating chat stays, a chat with turns stays.
- [x] **CHAT-SLOTS-V3-15f** (focus never hides behind the chips) Walk D-pad down a LONG reply to Show details / Copy / Helpful: the
  focused control must sit above the dock, not behind it — **PASS 2026-08-31**: on the battery answer Show details took focus 56px above
  the dock's top (scroll-margin 252px applied by the lift); on a short reply the lift correctly does nothing (29px naturally clear, no
  margin written). Worth one human pass on feel: the lift lands one frame after Steam's own focus scroll, so watch for any visible
  double-hop when stepping through a long answer.
- [x] **PRESET-ONE-LINE-01a** (the row is one chip) The preset block is a single 34px row; the dock is ~161px and the transcript's
  reading area ~455px — **PASS 2026-08-31, measured after deploy:** dock 245 → 161, chip viewport 118 → 34, reading area 371 → 455,
  one slot visible with the carousel's other history rows clipped. Free-play sweep (QA-FREE-PLAY-01): 16 presses top to ASK, every
  stop visible; Show details took focus 113px above the dock.
- [x] **PRESET-ONE-LINE-01b** (every mode still moves) Cycle Developer → preset chip animation through **carousel / fade / static /
  decode** and watch one full swap in each: carousel slides the next chip into the two-wide window from the right on its own within
  ~6s of opening (the timer only runs for 60s after the chips mount, so watch straight away); fade takes one chip out over ~2s and
  brings its replacement in over ~1s while the other chip stays put, never an empty row; static swaps on hold; decode scrambles and
  locks both chips, staggered. Also confirm the three game-specific seeds all appear in turn (the third queues behind the two on
  screen) and that a pinned QA batch of four or more walks in order past its third entry without ever showing one entry twice at once.
  — PASS 2026-09-03 by D-pad from Developer (`docs/test-evidence/PRESET-ONE-LINE-01b-c/d/e/f-*.json`): carousel slides one chip in from the right
  every 6 s for the first minute; fade takes the outgoing chip 1→0 in about 1.4 s and the replacement 0→1 in about 0.9 s while the
  other chip stays, row never empty; static swaps instantly; decode scrambles in with a caret and resolves left to right in about 1.3 s
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
family, only the current tab's name shown, a solid 66px bar with a shadow. **Not yet run on the
Deck — the device is held by another session.** Replaces **TAB-BAR-07** (see that row above).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **TAB-STRIP-2A-01** | Geometry, six tabs | Strip 300 × 66 floating at the scope's top; six cell boxes within 1px of equal width (about 39); every icon box 22 tall with its top 6px below the cell top, same in all six; bar at rest still 300 × 20; body top unchanged from 2 September (87.95px) | ⏳ owed: built 2026-09-17, Deck run pending |
| **TAB-STRIP-2A-02** | Geometry, five tabs | Same with Developer off; strip 300 × 66; cells about 47 wide | ⏳ owed: built 2026-09-17, Deck run pending |
| **TAB-STRIP-2A-03** | By eye, the maintainer | The lit name readable at arm's length; the lit cell reads as a selection, not a warning; nothing clipped; in green (no character), gold (Ali G), purple (Shadowheart), grey (Astarion), pink (Fuu) | ⏳ owed: built 2026-09-17, Deck run pending |
| **TAB-STRIP-2A-04** | Switch fade | Right ×3 from Main: the icon boxes' positions before and after each press are identical; only the fill and the name changed | ⏳ owed: built 2026-09-17, Deck run pending |
| **TAB-STRIP-2A-05** | Pills hide, cells stay | Ring on the chat row: the pills are hidden, the six cell boxes have not moved | ⏳ owed: built 2026-09-17, Deck run pending |
| **TAB-STRIP-2A-06** | UI scale 1.18 | Settings → UI scale → Apply: the strip comes back at the new scale, still floating, still six equal cells | ⏳ owed: built 2026-09-17, Deck run pending |
| **TAB-STRIP-2A-07** | The dots covered (D109 item 3) | Every dot in the chat row's row of dots has its bottom edge above the strip's bottom edge, and the chat row's own bottom line is still below the strip — the maintainer chose a 66px strip on 2026-09-17 to cover the dots without covering the whole chat row | ⏳ owed: built 2026-09-17, Deck run pending |

## Tier 3 — Heavy manual

| Block | Notes |
|-------|-------|
| **QAMP on-Deck** | See § QAMP below — **withdrawn from the roadmap 2026-09-02**: TDP apply was removed 2026-07-30, so the matrix has nothing to test until the feature returns |
| **TDP boundary clamps** | 1W/3W/15W/20W + GPU-800 advisory (many preview PASS) |
| **Background Ask full lifecycle** | Timeout, error, busy guard |
| **Multi-game matrix** | Title-specific behavior |
| **Guide-chord macro** | Power-user only — [troubleshooting.md](troubleshooting.md) §5; not casual priority |

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
