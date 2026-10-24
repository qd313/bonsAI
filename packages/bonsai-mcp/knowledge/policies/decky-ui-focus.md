---
id: decky-ui-focus
title: Decky UI focus contract
tags: [deck-ui, focus, alwaysApply]
alwaysApply: true
description: Focus-graph-first D-pad navigation and durable CSS rules
---

## Frontend UI (src/)

- ALWAYS use Decky-Frontend-lib components for UI elements to maintain a native SteamOS look and feel.
- NEVER write CSS overrides targeting third-party component internals based on assumed DOM structure; ALWAYS instrument the runtime DOM first (computed styles, class names, and nesting) to identify the exact element and property causing the layout issue before writing any selector.
- ALWAYS treat Decky UI bugs as runtime contract problems: instrument and verify live on-device DOM/focus metrics first, then apply the smallest evidence-backed change that aligns overlays/caret/width to the native TextField geometry.
- NEVER replace native input primitives or stack speculative CSS nudges in the same loop without log proof, because this causes focus/keyboard regressions and masking feedback loops (like width drift/jitter) instead of fixing root cause.
- NEVER iterate on styling or prompt wording as a primary fix until the underlying focus path and context payload are proven correct end-to-end.

## Steam / Decky UI (focus & layout)

- ALWAYS treat Steam/Decky controller navigation as a focus-graph contract: verify and implement D-pad behavior through Decky move/button callbacks and runtime focus traces before using DOM `keydown` handlers.
- NEVER ship Steam UI layout fixes from assumed DOM structure or speculative width/margin tweaks; first capture live geometry and clipping evidence, then apply the smallest container-constrained fix.
- NEVER apply durable layout corrections (margin, width, transform, position) by writing to a React-rendered element's inline style via refs (e.g. `el.style.marginLeft = ...`), because React re-renders and Decky's Steam UI component lifecycle silently wipe ref-set inline styles between renders; ALWAYS route dynamic layout values through a CSS custom property set on a stable scope root (`bonsaiScopeRef`) and consumed by a CSS rule with `!important`, or through the JSX `style` prop — this is the same class of regression as prior width-jitter and overlay-drift bugs.

## Architecture Constraints

- ALWAYS debug controller-navigation and AI-context issues at the architecture level first: verify focus-graph/event ownership and metadata pipeline integrity before making UX or prompt tweaks.
- ALWAYS treat Decky/QAM UI as a platform with strict focus and keyboard contracts: keep native primitives (TextField, Focusable, ButtonItem) intact and make the smallest possible style-only changes first.
- NEVER mix architectural swaps (e.g., TextField ↔ textarea, overlay hacks, broad container CSS overrides) with visual tweaks in the same iteration, because that repeatedly caused regressions in focus, wrapping, and visibility.

## New controls & settings rows (focus graph — mandatory)

Decky D-pad is **not** DOM sibling order. It is an **explicit graph of focus owners**. Nested or absolutely positioned `Focusable` nodes (e.g. `DeckFocusSlider` thumbs) are often **excluded** from the vertical graph unless a section parent wires them.

- ALWAYS design every new Settings/QAM row as an **explicit Decky focus graph at the section (parent) level** before shipping: enumerate each focus stop in order (e.g. toggle → slider bridge → action buttons → next section), wire `onMoveUp` / `onMoveDown` / `onMoveLeft` / `onMoveRight` / `onButtonDown` on the **element that actually holds focus on Deck** (verify with on-device QA — not merely which child looks highlighted), and connect rows across components via parent refs and `focusInHost` / button refs. Canonical references: `src/features/ai-connection/OllamaTab.tsx`, `src/features/models/pull-box/PullModelsModal.tsx`, `src/features/settings/SettingsTab.tsx`.

- NEVER assume DOM order, `tabindex`, or a child `Focusable` will participate in vertical navigation automatically. If a control is not a document-flow Decky focus peer (sliders, custom tracks, portaled modals), ALWAYS add a **document-flow `Focusable` bridge** in the parent that owns **vertical entry and horizontal actions** (`onMoveLeft` / `onMoveRight` / `onButtonDown` stepping state on the bridge). See `bonsai://architecture/focus-graph-patterns` Pattern B.

- NEVER ship D-pad support by only adding move callbacks on leaf components (`DeckFocusSlider` props, nested thumb) or by spreading `onMoveDown` on `ToggleField`/`Button` without on-Deck proof the callback fires and the intended node owns input. When vertical nav **skips** a control, fix the **graph owner** (bridge or sibling wiring), not another layer of programmatic `.focus()` redirects to a child thumb.

- NEVER implement Decky D-pad sibling or column hops (e.g. 2×2 Helpful/Retry ↔ Not really/Show details) by discovering targets with `document.querySelector` / aria-label / `data-*` / class probes, or by treating `document.activeElement` as proof that focus moved: on Deck those lookups repeatedly return null / false even when the controls are on-screen, and returning `false` from `onMove*` then lets Steam **spatial** nav steal the hop (wrong diagonal). ALWAYS register the mounted Deck focus-owner nodes at render time (callback refs / a small registry such as `replyStopRegistry.ts`) and hop between those registered owners; return `true` from `onMove*` once the target is registered. Canonical: `src/shared/dpad/replyStopRegistry.ts`, `src/features/answer/reply-actions/buildReplyActionsElement.tsx`, `src/features/answer/reply-actions/BonsaiChatSecondaryButton.tsx` (`replyStop` prop).

- ALWAYS add or extend a D-pad scenario row in `docs/testing.md` (shipped coverage + checkbox) for each new focusable control before marking Deck-facing UI work done. Copy the nearest existing row of the same kind as the template.
