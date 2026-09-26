---
id: focus-graph-patterns
title: Decky focus graph patterns (reference)
description: Section-level D-pad wiring, slider bridges, and canonical implementations
---

# Decky focus graph patterns

Decky D-pad navigation is **not** DOM tab order. It is an **explicit graph of focus owners** wired with Decky move/button callbacks on the control that **actually holds focus on Deck**.

## When to use this doc

- Adding a new Settings row, toggle, button row, slider, or modal footer control
- Debugging “D-pad skips my control” or “Left/Right does nothing”
- Reviewing PRs that touch `src/components/*Tab*.tsx` or `DeckFocusSlider`

Policy (always applied): `bonsai://policy/decky-ui-focus` — especially **New controls & settings rows**.

## Pattern A — Section-level vertical chain

**Parent component** owns the graph. List every stop in order, then wire `onMoveUp` / `onMoveDown` between stops (spread on `ToggleField`, `Button`, or `Focusable` as `Record<string, unknown>`).

| Reference | What it demonstrates |
|-----------|----------------------|
| `src/components/SettingsTabUiScaleSection.tsx` | Toggle → slider bridge → Reset → Apply; cross-section hooks to screenshot row |
| `src/components/SettingsTab.tsx` | `focusScreenshotQualityRow`, `focusUiScaleApplyButton`, `applyButtonRef` |
| `src/components/OllamaTab.tsx` | `focusOllamaKeepAliveThumb`, `focusLatencyWarningThumb`, `onMoveDownFromThumb` |
| `src/components/PullModelsModal.tsx` | Horizontal chip row + vertical exits via `Button` `onMove*` spreads |
| `src/components/CharacterPickerModal.tsx` | `ToggleField` `onMoveDown` / `onMoveRight` to list and footer |

**Helpers:** `focusInHost(host)` — query `[tabindex], button` inside a wrapper ref; `getFocusableWithin` in `src/utils/focusNavigation.ts`.

## Pattern B — Slider / composite widget (document-flow bridge)

`DeckFocusSlider` thumb is **absolutely positioned** inside the track. It is **not** a reliable Decky vertical focus peer. Do **not** assume `thumbHostRef` + `onMoveUp`/`onMoveDown` on the thumb alone will work.

**Required:** wrap the slider in a **document-flow `Focusable` bridge** in the **section parent** that:

1. Sits between adjacent controls in JSX order (toggle above, buttons below)
2. Handles **vertical** nav: `onMoveUp` / `onMoveDown` to siblings
3. Handles **horizontal** nav on the **bridge** (same focus owner): `onMoveLeft`, `onMoveRight`, `onButtonDown` → step state
4. Drives thumb **visuals** via `thumbFocusedExternal` / `thumbEditingExternal` on `DeckFocusSlider`

Canonical: `SettingsTabUiScaleSection.tsx` (`bonsai-ui-scale-slider-focus-bridge`).

**Alternative (no bridge):** parent-only refs + programmatic focus to thumb when the thumb is a proven focus peer (e.g. `OllamaTab` → `focusOllamaKeepAliveThumb` from connection timeout `onMoveDownFromThumb`). Still wire the **section** graph explicitly.

## Pattern C — Horizontal button groups

Wrap chips/buttons in `Focusable flow-children="horizontal"` and spread `onMoveLeft` / `onMoveRight` / `onMoveDown` on each `Button`. See screenshot quality row in `SettingsTab.tsx`.

## Pattern D — Explicit column hops (2×2 / non-DOM-order vertical)

When two horizontal rows must preserve **columns** under D-pad (Helpful↔Retry, Not really↔Show details), Decky default spatial nav and `document.querySelector`-based `.focus()` both fail on Deck.

**Required:**

1. Register each cell’s Deck focus owner at mount (`ref` → registry), e.g. `replyStopRegistry.ts` + `BonsaiChatSecondaryButton` `replyStop` prop
2. Wire `onMoveUp` / `onMoveDown` on each cell to focus the **registered** sibling owner
3. Return **`true`** when the target is registered (claim the move) — returning `false` re-enters Steam spatial nav and produces diagonals

Canonical: `src/utils/buildReplyActionsElement.tsx`, `src/utils/replyStopRegistry.ts`. On-Deck QA: **MICRO-05**.

## Anti-patterns (caused multi-prompt regressions)

| Mistake | Symptom |
|---------|---------|
| Only pass `onMoveUp`/`onMoveDown` into `DeckFocusSlider` | Vertical nav skips slider entirely |
| Spread `onMoveDown` on `ToggleField` without bridge | Decky native graph jumps to next `Button` |
| Bridge `Focusable` without `onMoveLeft`/`onMoveRight`/`onButtonDown` | Vertical works; Left/Right dead |
| Programmatic `.focus()` to thumb while bridge owns focus | Highlight on thumb; D-pad still on bridge |
| `querySelector` / aria / `data-*` / class to find sibling for `onMove*` | `found: false` on Deck; Steam spatial nav steals hop (wrong diagonal) |
| Cross-column fallback when primary target “misses” | Helpful↓ lands on Show details “successfully” |
| Gate `onMove*` success on `document.activeElement` | Focus attempted but handler returns `false`; spatial nav overwrites |
| A route-specific flag pre-opens a sub-panel and moves the ring into it before anything was pressed | Ring lands one press from an unintended change (`OllamaModelsHubModal`'s old `initialFiltersOpen` shortcut for the "policy" route: 3 of 3 tries, plan70-RING-ON-FILTER-2c1.json) |
| `onMoveDown` on a container's own last stop unconditionally returns `true` | Down dead-ends there forever; Steam never carries the ring on to the next real container even though it is visible (`PullModelsModal`'s Filters-panel "Close filters" button, plan70-HUB-EDGE-01.json) — return `false` instead, same as the model list's own last row just above it in the same file |
| The element holding the ring is destroyed and replaced by a twin (a parent swapped for one under a new key) with nothing handing the ring over | No element holds the ring; the stream follow then finds no ring and slides the view away (the live question's Retry at the answer's finish, 3 of 4 tries, plan70-QA-FREE-PLAY-01.json). Record the stop the ring was on while the old one shows, and once it is gone hand the ring to the same stop of the twin: its nav node's `TakeFocus` first, then an in-container `focus()` (`useLiveTurnHeaderRingRestore.ts`, `focusAnswerChunkAtIndex`) |
| A stop that changes on a timer is keyed by its content (`key={text}`), or turned non-focusable (fading out) while it holds the ring | Each swap destroys or disowns the stop under the ring and nothing takes it: fade and static suggestion chips, about 7.6 s after the ring landed (plan70-PRESET-ONE-LINE-03.json). Key the stop by its position and change only its words (decode mode's shape); hold anything that would take it out of the graph until the ring has left it (`MainTabPresetAnimatedChips.tsx`, `usePresetRowNav().chipHasRing`) |
| A row of two buttons relies on `flow-children="horizontal"` alone for Left/Right, and the stops around it hop straight over it | The second button is visible but unreachable (the troubleshooting hint's Dismiss: Right from Open Permissions did nothing twice, plan70-PERMS-CLEAN-05-06.json); Up from the chips and from the ban-lookup row skipped the hint (plan70-SMOKE-C.json). Claim Left/Right on the row and move between its buttons with an in-container `focus()`; add each newly mounted row to every neighbour's Up/Down chain, lowest first (`troubleshootHintRowNavHandlers`, `vacDenyRowMoveUp`, the chips' `exitUp`) |
| A button's own press removes it (Helpful becomes the words "Saved on this Deck") and nothing takes the ring | The ring vanishes; the next press starts from nowhere (Down/Left found the speaker, B the tab bar; plan70-F4-THUMBS-UP.json, 3 of 3). In the press handler, note whether the ring was on the button; once it has been replaced and nothing holds the ring, hand it to a neighbour in the same row: the row's nav node `TakeFocus`, then the neighbour (`rateKeepingRing` in `buildReplyActionsElement.tsx`) |
| A press opens content below the ring's control and nothing scrolls it into view | The content opens behind the bottom dock and only the control's label changes, which reads as a dead press (Show details: tab row at y 617 under a dock at 600, plan70-F4-SHOW-DETAILS.json). Once, a frame after it opens, scroll just enough to clear the dock, never pushing the ring's control or the content's own top off the pane (`revealBelowKeeping` in `chatPanelScroll.ts`, called from `buildDetailsPanelElement.tsx`) |
| A lone button in a plain `div` row between two registered containers | Nothing can hand the ring to it by Steam's transfer, so neighbours' explicit Up/Down chains step over it ("Save chat to Desktop", skipped by Up from the chips, plan70-SMOKE-C.json). Wrap it in its own `Focusable` with a registered `navRef` and put it first in the chain of the stop below it (`SaveChatToDesktopRow.tsx`, id `save-chat-desktop`) |
| A state change that draws a control, then a ring move onto it scheduled for the next animation frame (`requestAnimationFrame`) | When the frame comes before the redraw (a busy machine, or a press Steam delivers outside React's batching), the target does not exist yet, the move finds nothing and nothing retries: the ring lands nowhere (the Filters panel, PullModelsModal.filtersPanel.test.tsx flaking about one run in three, plan 70). Keep the move until the commit that state change produces and run it in a layout effect right after (`focusAfterRedraw` in `usePullModelCatalogRefresh.ts`) |

## Ship checklist

Before marking UI work done:

1. On-Deck: trace full vertical chain for the new row
2. On-Deck: Left/Right (or `onButtonDown`) on any slider or horizontal group
3. Add a row to `docs/testing.md` (**Shipped feature coverage** + scenario checkbox)
4. Run Tier 0 **SMOKE-A** if the change touches Settings or tab shell

Workflow: `bonsai://workflow/deck-dev-loop` § **New focusable controls**.
