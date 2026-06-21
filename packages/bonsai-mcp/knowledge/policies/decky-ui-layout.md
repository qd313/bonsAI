---
id: decky-ui-layout
title: Decky UI layout
tags: [deck-ui, layout]
alwaysApply: false
description: Measure-before-CSS layout debugging rules
---

## Layout triage

- Measure `getBoundingClientRect()` / `clientWidth` / `scrollWidth` of the block AND its parent before changing CSS.
- Prefer `width: 100%`, `max-width: 100%`, `box-sizing: border-box` inside the panel before bleed hacks.
- For scroll/sticky/overflow combinations, measure before changing any property.
- Route durable dynamic geometry through CSS custom properties on `bonsaiScopeRef` consumed by `!important` rules (see `useUnifiedInputSurface.ts` + `bonsaiScopeStylesheet.ts`).

Reference implementations:

- `src/components/ConnectionTimeoutSlider.tsx` — horizontal navigation via move callbacks
- `src/features/unified-input/useUnifiedInputSurface.ts` — canonical durable geometry pattern
