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

**Current state, as of the 2026-09-23 runs:** the vanishing-ring/streaming case this row used to owe is now
fixed and closed — the fourth try (H4 in flow H) passed, holding the ring and the scroll position steady
through an answer finishing. The plain finished-reply walk also passed the same night, but turned up a new
problem (two tall answer sections only 33% visible, wherever the walk reaches them), so the row stays open
on that new bug. **Still owed:** the touch-screen half, which needs a person, not the rig. Evidence
`docs/test-evidence/plan64-STREAM-WALK-REC-01-try4-run2.json` (the vanishing-ring pass),
`docs/test-evidence/plan64-QA-FREE-PLAY-01-finished.json` (the new bug). History (every dated run since
2026-09-05, the LB/RB carousel note, and the earlier streaming failures this fix replaced):
[testing-manual-history-2026.md § QA-FREE-PLAY-01](archive/testing-manual-history-2026.md#qa-free-play-01).

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

**Current state:** the deny half passes (a blocked capability answers with the capability message, no
model call). The **Open Permissions** jump is a real D-pad stop and, as of 2026-09-23, lands on the
right toggle — see PERM-JUMP-01 below for the timing. History (the 2026-09-03 block and the intermediate
2026-09-16 wrong-row failure):
[testing-manual-history-2026.md § SMOKE-C](archive/testing-manual-history-2026.md#smoke-c).

- [ ] Turn a capability **off** → blocked action → **Open Permissions** (or troubleshooting hint button) → lands on matching toggle → **Back to …** returns → no crash
- [ ] Re-enable before Tier 1

### PERM-JUMP-01 — Permission jump D-pad (P0)

Capability off for each row; trigger the deny surface; D-pad to **Open Permissions** → Permissions tab → matching toggle focused → **Back to …** → prior tab.

**PASS (Deck) 2026-09-23, fixed in `af53b7d`, timed to the millisecond (plan 64, flow E):** the ring reached the **Read game & screenshot context** switch 2,736 ms after pressing **Open Permissions** — then was still pulled away to **Back to Main** 22 ms later, the same wrong landing as before — but this time came back to the switch about 100 ms after that and stayed there for the rest of the 11.6-second recording. A person would at most see a brief flicker through **Back to Main**, not land on the wrong row. Evidence `docs/test-evidence/plan64-PERM-JUMP-01-try2.json`.

History (the 2026-09-03 block and the two earlier FAIL runs this fix replaced):
[testing-manual-history-2026.md § PERM-JUMP-01](archive/testing-manual-history-2026.md#perm-jump-01).

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

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).
VAC-03 to 06 passed 2026-09-23 but were left unticked here until 2026-09-24.

### Open regression IDs (bugs / recent ships)

- [ ] **PRESET-GAME-01** With a game running, tap a preset chip — Ask field shows chip text only (no `— {Game}` append; “this game” unchanged)
- [ ] **STRATEGY-PLACEHOLDER-01** Strategy mode, empty Ask — focus field; italic placeholder does not shift when fake caret appears
- [ ] **ASK-CARET-CHAR-01** AI character on — focus empty Ask field; native caret aligns with placeholder/text (not left of `?` badge); D-pad Up from paperclip → avatar, Right → field; character-off path unchanged
- [ ] **STRAT-SPOIL-DRG-01** DRG Survivor boss names not false-positive spoilers — ship gate is the three **required** rows below; acceptance is *no spoiler fence rendered for the entity named in the question* (display-level, not a claim about model behavior). Plan 54 landed 2026-09-15; the three new sub-rows below cover it. All rows in this block run in plan 55's Deck pass.
  (DRG-01, DRG-01d, DRG-01-STREAM-01, HADES-NAMED-01, STRAT-SPOIL-FIRST-01 and STRAT-SPOIL-TEXT-01 passed and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).)
  - [x] **DRG-01b/c** As DRG-01 with KB **off**, or corpus **absent** → still plain text *(D2: the low-risk signal used to be reachable only through the corpus)* — **DRG-01b tried 2026-09-18 with Deep Rock Galactic: Survivor running, blocked:** the same Ask-box freeze as the roadmap's three-star focus entry stopped the question from being sent five times out of six tries, so the reply was never seen. Evidence `docs/test-evidence/plan61-DRG-01b.json`. **DRG-01c not tried on purpose** 2026-09-18 — it would mean removing the library from the Deck, which was out of scope tonight. Still owed, not failed. **DRG-01b tried again 2026-09-19, still blocked:** Deep Rock Galactic: Survivor had fallen off the Recent Games row again, so it could not be launched. Evidence `docs/test-evidence/plan61-DRG-01b-retry.json`. **DRG-01b PASS (Deck) 2026-09-23:** with the game running, the knowledge base off, masking on and no consent phrase, the boss tactics came back plain, no cover, no notes block, and no knowledge-base search logged. Moved to Done. DRG-01c (corpus absent) is still not tried. Evidence `docs/test-evidence/plan64-DRG-01b.json`.
  - [x] **HADES-UNNAMED-STREAM-01** — companion check for the fix above, so nothing was over-relaxed. Hades `1145360`, a question that does **not** name a boss, streaming on → the mid-stream mask chip **still appears** for story-adjacent detail (Hades shares the `roguelike` genre with DRG Survivor, so this is the case the R4 fix must not touch) — **Not claimed 2026-09-15**: the fast poll never saw the mid-stream chip. A recording exists (`recordings/DeckRecord_20260915_205114_game.mkv`, untracked) for the maintainer to play back. **Tried again 2026-09-18 with Hades running, blocked:** the same Ask-box freeze as the roadmap's three-star focus entry stopped the question from being sent. Evidence `docs/test-evidence/plan61-HADES-UNNAMED-STREAM-01.json`. **FAIL (Deck) 2026-09-18, later the same night:** sent cleanly with no focus trap this time. The reply streamed all the way through as plain, readable text — no mid-stream mask chip, no "Spoiler hidden until complete…" chip, no tap-to-reveal block, at any point. Evidence `docs/test-evidence/plan61-HADES-UNNAMED-STREAM-01-retry2.json`, screenshot `screenshots/DeckCapture_20260918_115623_auto.png`.
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
  Rows 01, 02, 03, 04, 06 and 07 passed and moved to
  [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).
  - [ ] **REASONING-05** Show details on a thinking turn — the chip reads the level, the seconds and the
    token estimate, and its body says the count is an estimate. **PARTIAL (Deck) 2026-09-17:** the chip read
    "Thinking: Balanced · 16 s · ~465 tokens", the same seconds as the fold — but the whole details chip row
    cannot be reached by the D-pad at all (Right from Hide details stalls, Down skips to Session context, Up
    from Session context lands back on Hide details), so nobody using a controller can select this chip to
    read its body; only a page read reached the text. Filed as its own Bugs entry, below. Stays owed for the
    body-text half.
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
- [ ] **QAM-BODY-RO-01** Switch tabs repeatedly (10+, through the taller Settings/Ollama panels), then D-pad to the **bottom** of a long panel: the pane must still reach its end and not be pinned to a stale height. Steam replaces the scroll node on every switch, so this is specifically about the 2nd switch onward — one switch proves nothing. Fixed 2026-08-08; if it regresses, `--bonsai-tab-body-height` will stop matching the live pane's `clientHeight` after a switch. **Re-run QAM-BAZZITE-01 and D-PAD-SCROLL-01 with this** — same measurement chain
- [ ] **SOFT-PREDICT-04** Strategy mode, an answer long enough to continue mid-branch (opens a `bonsai-strategy-branches` fence before hitting the length wall): confirm no half-rendered fence or stray JSON appears at any point in the stream, including right at the continue boundary — **BLOCKED 2026-09-18:** the long Hades walkthrough question came back as a short spoiler-careful refusal, so no reply reached the length wall. Evidence `docs/test-evidence/plan61-SOFT-PREDICT-04.json`. **Tried again 2026-09-23, still unclear:** the finished text read clean — no half-rendered fence, no stray JSON, at any point — but the reply stopped on its own at 1,117 tokens against a 2,112-token limit in the log, so it never had to continue and the join point this row actually checks never happened. Evidence `docs/test-evidence/plan64-SOFT-PREDICT-04.json`. **Tried a second time 2026-09-23, still unclear, same shape:** a Half-Life 2 walkthrough question asked for a very long answer on purpose; the model still stopped itself at 1,050 tokens, well under the 2,112 limit. Asking for more length does not reach the wall — the row needs another way to bring the limit down rather than the question up. Evidence `docs/test-evidence/plan64-SOFT-PREDICT-04-try2.json`.
- [ ] **EXPERT-CAP-01** Expert-mode Ask with a long answer: it now runs to ~1200 tokens before a soft continue rather than ~800. Expert was silently capped at the Speed budget until 2026-08-15, so a long Expert reply should visibly need fewer `Continuing…` cues than before the fix

### CHAT-SLOTS-V2 — Named chat slots (P0)

All checks in this block passed on the Deck and moved to [testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).


### CHAT-SLOTS-V3 — Named chat slots redesign (P0)

Run **CHAT-SLOTS-V2-05** (P-0 bumper suppression) first — it has never run on device, and
everything below assumes it passes. Plan:
[28-named-chat-slots-v3-implementation-plan.md](archive/28-named-chat-slots-v3-implementation-plan.md).



- [ ] **PRESET-ONE-LINE-02** (the row matches the decision) One row, **two chips side by side**, each half the width less a 4px gap,
  **30px** tall, radius 4; a label longer than its chip scrolls sideways inside it with a soft fade at the edges, and short labels do
  not move. **Read the geometry from the live page** (`getBoundingClientRect` on the two `.bonsai-preset-glass` buttons and their
  `.bonsai-preset-chip-text` children), not from a screenshot, and **record the button's computed side padding** — it is the one
  number the width research in [archive/29-preset-row-three-thirds-plan.md § 3b](archive/29-preset-row-three-thirds-plan.md) could
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

Plan [60](archive/60-chip-button-restyle.md), decision D110. Landed 2026-09-17 as merge `b3c0d52`
(seven commits on `refactor/lane60-chips`) and checked on the Deck the same day. Each chip now has a
raised look (a top hairline and a soft shadow), the two chips sit 6px apart instead of 4, the row
leaves room below the chips so the shadow is not cut off, the Tip word became a small dot, the tag and
decode-label colour is quieter, and the chip the D-pad is on shows a light bar along its bottom edge
instead of the old blue outline. Evidence `docs/test-evidence/plan60-QA-chip-button.json` and
`docs/test-evidence/plan60-measure-before.json` (the before-the-build measurement).

Rows 02, 03, 04 and 08 passed on the Deck and moved to
[testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **CHIP-BUTTON-01** | Open the main screen with chips showing, default character, then the gold character. Screenshot the dock. | By eye: the chips read as raised buttons, the two are visibly apart, the Tip dot and the tag colour are quieter than before; nothing else in the dock moved | ⏳ **owed — screenshots taken, the maintainer's own eye still needed** (`screenshots/DeckCapture_20260917_150755_auto.png`, `…_150413_auto.png`, `…_150921_auto.png`) |
| **CHIP-BUTTON-05** | Read the rectangles of the chip, its container and the question box; screenshot | The shadow's bottom is not cut off; the gap from chip to question box is 8px in decode/static/carousel (12 total in fade); by eye the row no longer touches the box | ⏳ **owed — measurement PASS, the maintainer's own eye on the screenshots still needed.** Gap measured 8px (was 0) in decode/static/carousel, 12 total (unchanged) in fade; question box did not move |
| **CHIP-BUTTON-06** | Turn on the one-chip setting; show the help chip; get an agent suggestion chip | The full-width chip has the same raised look; the help and agent chips keep their colours and carry the hairline and shadow | ⏳ **PARTIAL — one-chip setting PASS on the Deck 2026-09-17** (same raised look, 300×30); the help chip and the agent chip were not on screen during the run, so they are covered only by the stylesheet tests, not seen by eye |
| **CHIP-BUTTON-07** | Reduced motion on; repeat 03 | The cue appears and clears with no ramp; nothing looks broken | ⏳ **owed — needs the Deck's reduced-motion setting turned on** |
| **CHIP-BUTTON-09** | A game the notes cover (Half-Life 2), knowledge base on | The Tip chip shows a small square dot in the character's colour before its label, not the word; the dot stays put while a long label scrolls | ❌ **FAIL (Deck) 2026-09-18** — with Half-Life 2 running and the knowledge base on, the suggestion chip showed real Half-Life 2 tips from the notes ("How do I beat Strider?", "Tips for Ravenholm in this game?") but with no dot before the label at all; reading the dot's own element on the page confirmed it was never drawn for either chip. Filed as its own bug (roadmap Bugs, `[chips]` `[KB]`) — the check that decides whether a chip's words come from the notes and the check that decides whether to draw the dot are not agreeing with each other. Evidence `docs/test-evidence/plan61-CHIP-BUTTON-09.json` and its two screenshots. ⏳ **Fixed 2026-09-21 (plan 63, commit `895cf0a`), Deck recheck owed.** Two copies of the same badge markup had drifted apart; one piece of code now draws both. **Tried 2026-09-23, COULD NOT RUN:** three pinned test chips are switched on in the Developer tab, and while they are on no note chip is ever mixed in — the chip row stayed on the same pinned "how do i beat the gonarch in black mesa" chip for the whole run, even though the question itself did attach three real Half-Life 2 notes. Owed: someone clears the pinned chips ("Clear frozen test chips" in Developer — the maintainer may want them kept on purpose, so ask first) and re-run. Evidence `docs/test-evidence/plan64-CHIP-BUTTON-09.json`. |

Rows 01 and 05 are judged by eye from a screenshot and a rectangle read; the rest are read from the
page by the bridge. **Seen along the way, not part of this plan:** in fade mode the D-pad skipped the
chip row in both directions on three tries — worth a look next to the open "chip row cannot be
reached" entry.

---

### TAB-BAR — Collapsing tab bar (P0)

Plan [30](archive/30-collapsing-tab-bar.md), decisions D44/D55/D56. Steam's tab header is hidden by one
structural rule; a 20px bar above the tabs root shows the tab and is the strip's one focus stop; the
full strip floats over the panel while the bar holds the ring. All rows are on-Deck. Evidence files
under `docs/test-evidence/`; numbers in the plan's § 8.

Rows 01–07 and 10–11 passed on the Deck (07 is retired, replaced by TAB-STRIP-2A-03) and moved to
[testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **TAB-BAR-08** | Touch | Tap on the thin bar opens the strip; a tab tap switches and closes it; a tap outside closes it | ⏳ needs a finger on the screen — the rig cannot tap |
| **TAB-BAR-09** | Modal return | After the character picker closes on a non-Main tab, the ring lands on the opener or on the bar, never nowhere (re-runs PICKER-FOCUS-01's three openers) | ✅ 2026-09-02 for the character picker, the models hub and the chat-slot rename — all return to the opener (`docs/test-evidence/TAB-BAR-09-*.json`); ⏳ the desktop-note opener needs the *Save files to Desktop* permission on · ⏳ 2026-09-03: the Clear cache confirmation is a fourth opener and its return lands on the hidden Settings tab button (roadmap Bugs, filed 2026-09-03) |
| **TAB-BAR-GHOST-01** | Touch, ghost strip | With a game running full screen, open the panel, put the ring on the tab bar so the strip opens, then touch a suggestion chip with a finger; the strip must disappear completely — no faint icons, no dotted row — however long you wait | ⏳ **needs a finger on the screen — the rig cannot touch.** Fixed at the desk 2026-09-15: a plain timer now force-hides the strip a fraction of a second after it closes, whatever its fade animation is doing, so a stalled fade can no longer leave a see-through copy over the chips. The exact reason the fade stalls was not pinned down. On the maintainer's own checklist ([Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4)).

Also re-run because their landing spot changed: **DOC-SWEEP-01** (Settings Up → the bar now),
**CHAT-SLOTS-V3-01** (the walk starts at the bar), **TAB-SWITCH-01** (the flicker fix must hold with
the header hidden — `docs/test-evidence/TAB-BAR-W1a-*.json` show ten clean switches).

### TAB-STRIP-2A — The open tab strip redesign (plan 59)

Plan [59](archive/59-tab-strip-redesign-build.md), decision D109. Landed 2026-09-17 in commits
`6821f20`, `ef4a851`, `18be399`, `0378024`, `044acab`, `a957165`. Six equal cells, one 22px icon
family, only the current tab's name shown, a solid 66px bar with a shadow. **Run on the Deck
2026-09-18:** rows 01, 02, 04, 05 and 06 pass, 03 is captured for the maintainer's own look, and 07
fails and is filed as its own Bugs entry. Replaces **TAB-BAR-07** (see that row above).

Rows 01, 02, 04, 05 and 06 passed on the Deck and moved to
[testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **TAB-STRIP-2A-03** | By eye, the maintainer | The lit name readable at arm's length; the lit cell reads as a selection, not a warning; nothing clipped; in green (no character), gold (Ali G), purple (Shadowheart), grey (Astarion), pink (Fuu) | ⏳ captured 2026-09-18, the maintainer's look owed — five screenshots, one per colour: no character/green `screenshots/DeckCapture_20260918_081157_auto.png`, Ali G/gold `screenshots/DeckCapture_20260918_081003_auto.png`, Shadowheart/purple `screenshots/DeckCapture_20260918_081242_auto.png`, Astarion/grey `screenshots/DeckCapture_20260918_081324_auto.png`, Fuu/pink `screenshots/DeckCapture_20260918_081408_auto.png`. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-03.json` |
| **TAB-STRIP-2A-07** | The dots covered (D109 item 3) | Every dot in the chat row's row of dots has its bottom edge above the strip's bottom edge, and the chat row's own bottom line is still below the strip — the maintainer chose a 66px strip on 2026-09-17 to cover the dots without covering the whole chat row | ❌ FAIL (Deck) 2026-09-18 — the strip's bottom edge sits at 130px; the row of dots runs from about 133 to 137px with the ring on the tab bar (135 to 139px with the ring on the chat row), so every dot sits fully below the strip, none of them covered; the chat row's own bottom line (142 to 146px) is below the strip as intended. Filed as its own Bugs entry. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-07.json` ⏳ **Fixed 2026-09-21 (plan 63, commit `ec70866`), Deck recheck owed.** The dots moved up 10 pixels rather than the strip growing, since the strip's own height is vertical room the maintainer asked to keep. Not yet re-run: confirm every dot now sits covered, and specifically whether the dots now crowd the tails of letters in the chat name above — the lane flagged 10 pixels as a little more than the 7 to 9 needed, with only about 4 pixels of clear space there. **Re-run 2026-09-23, ❌ FAIL by measurement:** the gap between the chat name's letters and the dots measured 0.2 pixels, so they touch — the 10-pixel move hid the dots under the strip but left no room above them. Screenshot `docs/test-evidence/plan64-BYEYE-01-chat-row.png`. Moved back to Bugs, OPEN, with a maintainer's pick needed among three ways out (leave as is; move the dots back 1 pixel; or hide them while the tab strip is open and restore their old spacing) — see the roadmap entry. |

### NOTES-BLOCK — The "From the notes" block (plan 58 phase 1)

Plan [58 phase 1](archive/58-phase-1-notes-shown-and-wiki-extracts.md), decision D111. Landed
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

Rows 01, 03, 05, 06 and TEN-GAMES-01 passed on the Deck and moved to
[testing-manual-closed-2026.md](archive/testing-manual-closed-2026.md).

| Row | Scenario | Pass | Status |
|---|---|---|---|
| **NOTES-BLOCK-02** | A story-protected game running, no spoiler opt-in given. Ask about a boss by role, not name. Once the reply completes and is fenced, look for the block inside the spoiler box, closed then opened. | No block appears anywhere while the spoiler cover is closed. Once the cover is opened, the block appears, itself closed. The evidence for this row says whether the block sits inside the spoiler's own box or below it, next to Show details, since that placement is the one thing still short of the drawing. | **NOT RUNNABLE (Deck) 2026-09-18:** the Hades boss question came back with no spoiler box at all, so there was no fenced reply to check the block's placement against. The reply also named the wrong boss, steered by the top attached note. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json` |
| **NOTES-BLOCK-04** | A covered game running. Ask something the notes cannot answer. | No block appears anywhere under the reply; the honesty line about the model's own knowledge shows instead. The two never appear together on one reply. | **NOT RUNNABLE (Deck) 2026-09-18:** no question could be found that attaches nothing for a covered game, so the "never together" case could not be shown — every attempt still attached three notes. What did happen: the block and the "no close match" honesty line appeared together, and the line read wrong, since the reply's facts came from one of the attached notes. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-04.json` |
| **NOTES-BLOCK-07** | Voice replies turned on. Ask a question that attaches a note or a tip and let it read itself aloud in full. Separately, walk Down onto the block's header (ring visible on the header, checked against the dock) and press A. | Whatever the answer says, the block's own words are never spoken by read aloud; the header still opens normally on its own press. | ⏳ still owed — **not run 2026-09-18.** This one needs a person listening to confirm the block is never read aloud, which the automated run could not check. |
| **NOTES-BLOCK-LADDER** | A covered game running or named. Ask a question, open the block, and check whether its own chip ladder (if it has one) can be reached with the D-pad. | The ladder inside the open block takes Left/Right the same way the details panel's own ladder does. | ⏳ **UNCLEAR (Deck) 2026-09-23** — this reply's block held three shared Deck tips and no chip ladder at all, so the question could not be asked of it; Down from the open block instead went to "Save chat to Desktop". Side finding, filed as its own bug: opening the block does not scroll it into view, so most of its words sit behind the chip and the question box. Evidence `docs/test-evidence/plan64-NOTES-BLOCK-LADDER.json` (+ `.png`). |

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
