---
id: runtime-ownership
title: Runtime value ownership
tags: [debugging, ai, alwaysApply]
alwaysApply: true
description: Lessons from multi-prompt bugs — identify the owning subsystem before patching
---

## Runtime Value Ownership (lesson from 2026-06-11 debug marathon)

- ALWAYS identify which competing subsystem currently OWNS a failing runtime value before changing any code: log the winning computed value at the exact point of failure (computed style + which CSS rule won, the full AI response envelope, the element actually holding DOM focus, the effect that actually re-ran) — every multi-prompt bug in this project traced to a second writer the patched layer never considered (a sibling feature's `!important` rule clipping the menu, a model's hidden `thinking` channel consuming the whole `num_predict` budget, a "mount" effect re-armed every render by changing callback identities, a logical focus index drifting from DOM focus).
- NEVER maintain a parallel copy of state the platform already owns (logical focusIndex alongside DOM focus, restore/status logic re-applied per render); bind to the platform's single source of truth, pin mount-once effects with refs, and make state writes idempotent keyed by stable ids such as `request_id`.
- NEVER treat an empty, truncated, or silent AI reply as a transport, prompt, or model-routing problem before logging the response envelope (`done_reason`, `eval_count`, `prompt_eval_count`, thinking-vs-content channels) — `done_reason=length` with zero visible text is a budget/channel bug, not a connectivity bug.
- NEVER stack a second speculative fix in the layer where a symptom is visible while the first remains unproven; one runtime probe that names the actual owner is cheaper than five guessed patches in the wrong subsystem.
