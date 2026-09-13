# Wave 4 integration report (2026-08-07)

Serialized focus/preset work landed in one worktree (`wave4-b9f60dca`) as three commits (G → H → J) plus this report. Items share `MainTabChatTranscript`, `MainTabPresetAnimatedChips`, and `MainTabUnifiedAskBar`, so they were **not** parallelized.

## Scope

| ID | Item | Type | Worktree path | Worktree commit | `experimental` commit |
|----|------|------|---------------|-----------------|------------------------|
| G | `onButtonDown` audit | Bug fix | `C:\Users\still\.cursor\worktrees\wave4-b9f60dca` | `9b270ab` | `16e49db` |
| H | Global `document` sweep (8 sites) | Bug fix | same | `88f000f` | `a619320` |
| J | Stream preset chip animation | Feature | same | `b1ad573` | `a03b5f6` |
| - | This report | Docs | - | - | `ef83cb5` |

**Base:** `60b6d14` (`experimental` after Wave 3 results doc).

**Worktree setup:** No `.cursor/worktrees.json` — setup skipped. `node_modules` junctioned from main repo for Windows `npm test`.

## Item G — `onButtonDown` audit

**Problem:** Three controls acted on every gamepad button (not just A); four direction handlers used string predicates that never match `GamepadEvent`, leaving `onButtonDown` inert on device.

**Approach:**
- Whitelist state changes with `isOkDeckButtonEvent` (`ContextChipLadder`, `SessionContextStrip`, `MainTabChatTranscript` Show-details link).
- Switch load-bearing direction handlers to `isDeckDirection*Event`; drop redundant `onMove*` twins on turn header, answer bubble, UI-scale bridge, slider thumb.
- Add `isDeckDirectionLeftEvent` / `isDeckDirectionRightEvent`.

**Correction 2026-08-07 — "redundant" was wrong, and the item is not settled.** The dropped `onMove*`
handlers could not have been duplicates: the predicates they sat next to stringified their argument
and never matched a `GamepadEvent`, which `focusNavigation.test.ts` asserts outright. So `onMove*`
was doing all of the direction work and this commit removed it in favour of a path that has never
run on a device. The internal contradiction makes the uncertainty visible —
`buildDeckThumbNavHandlers` **kept** `onMoveUp`/`onMoveDown` on the same object it stripped
`onMoveLeft`/`onMoveRight` from; whichever handler Steam delivers, one of those is wrong. It also
runs against `.cursor/rules/decky-focus-graph.mdc`, which requires slider bridges to carry vertical
*and* horizontal handlers and cites `SettingsTabUiScaleSection.tsx` as the pattern.

Left in place rather than reverted, because restoring both paths double-steps if `onButtonDown` does
fire. **ONBUTTONDOWN-AUDIT-01** now records *which* failure appears (nothing happens vs two steps /
focus escape) and covers all four `DeckFocusSlider` users, not UI scale alone.

**Tests:** `focusNavigation.test.ts` (14), `buildAnswerBubbleElement.test.tsx` (8).

**On-Deck QA:** **ONBUTTONDOWN-AUDIT-01** (`docs/testing-manual.md`).

## Item H — Global `document` sweep

**Problem:** Eight sites queried SharedJSContext `document` while UI lives in the QAM popup document; `instanceof HTMLElement` in `useBonsaiAskOrchestration` never blurred the Ask field on submit.

**Approach:** `getUiDocument()` / `uiActiveElement()` / `elementHasFocus()` or registered refs (`AboutReplyLanguageSection.dropdownHostRef`).

**Sites fixed (all 8):** `chatPanelScroll.ts`, `focusNavigation.ts` (`getFocusableWithin`), `settingsPanelScroll.ts`, `MainTabChatTranscript.tsx` (×3), `MainTabUnifiedAskBar.tsx`, `MainTabPresetAnimatedChips.tsx`, `AboutTab.tsx`, `useBonsaiAskOrchestration.ts`.

**Deferred:** None — full batch shipped.

**Gap found and closed 2026-08-07 (review follow-up):** all eight conversions were correct, but
`rememberUiDocument` was only ever called from the answer-bubble, answer-stop and spoiler-fence
registries — each of which mounts only once a reply renders. Before the first answer of a session
`getUiDocument()` therefore still returned the SharedJSContext shell, so `useBonsaiAskOrchestration`'s
blur-on-submit (a **first**-Ask path by definition), the Ask-bar keydown capture,
`tryScrollPanelFromFocus` and `getFocusableWithin` all kept the behaviour this batch was written to
fix until an answer existed. `BonsaiPluginShell` now seeds the document from its root ref — the
earliest node the plugin owns. `elementHasFocus` was never affected, since it asks
`el.ownerDocument` rather than the module cache, which is why the preset-carousel site worked
throughout.

**Tests:** `focusNavigation.test.ts` (`getFocusableWithin`), `uiDocument.test.ts` (9),
`BonsaiPluginShell.test.tsx` (3 — rendered into a non-global document, so the seeding is observable
rather than trivially true).

**On-Deck QA:** **DOC-SWEEP-01** (`docs/testing-manual.md`).

## Item J — Stream preset chip animation

**Problem:** Preset chips only offered fade / carousel / static; maintainer wanted a typewriter “stream” mode reusing existing caret motion without opacity/transform focus desync.

**Approach:** `stream` in `PRESET_CHIP_ANIMATION_OPTIONS` + Python `sanitize_preset_chip_animation`; `MainTabPresetStreamSlots` with per-char reveal, hold, swap; `prefers-reduced-motion` instant swap; chips `focusable` throughout; Developer tab reads `PRESET_CHIP_ANIMATION_OPTIONS`; CSS caret in `section-4.ts`.

**Tests:** `MainTabPresetAnimatedChips.test.tsx`, `test_settings_service.py` (`test_sanitize_preset_chip_animation_accepts_stream`).

**On-Deck QA:** **PRESET-STREAM-ANIM-01** (`docs/testing-manual.md`).

## Combined verification

| Check | Result |
|-------|--------|
| `npm test` — `focusNavigation.test.ts`, `buildAnswerBubbleElement.test.tsx`, `uiDocument.test.ts`, `MainTabPresetAnimatedChips.test.tsx` | **Pass** (2026-08-07) |
| `npx tsc --noEmit` | **Pass** |
| `python scripts/run_python_tests.py` (full suite, includes new stream sanitize test) | **Pass** — 581 ran, OK (skipped=3) |
| Full `npm test` | Not run in this session — run before release if desired |

## Integration notes

- **Order:** G → H → J (shared transcript / ask bar / preset chips).
- **Conflicts expected:** Low — touch sets are mostly disjoint except `MainTabChatTranscript.tsx` / `MainTabPresetAnimatedChips.tsx` (serialized in worktree).
- **Merge-back:** Cherry-picked onto `experimental` as `16e49db` (G), `a619320` (H), `a03b5f6` (J), `ef83cb5` (this doc). Clean — no conflicts.

## Maintainer attention

- Confirm **ONBUTTONDOWN-AUDIT-01**, **DOC-SWEEP-01**, and **PRESET-STREAM-ANIM-01** on-Deck (preview does not validate realm or gamepad predicates).
- Stream mode is Developer-tab selectable only; default remains `fade`.
- Character-picker `querySelector` focus graph remains open (roadmap) — not part of Wave 4 H batch.
