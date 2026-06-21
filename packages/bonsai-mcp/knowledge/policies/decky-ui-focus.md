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
