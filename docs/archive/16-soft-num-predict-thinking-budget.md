# 16 — Soft `num_predict` + thinking budget (discovery lock)

**Bug v1 landed 2026-08-10** — caps, soft continue, C1 budgets (`ollama_ask_budgets.py` + `post_ollama_chat`). On-Deck QA in [Verify](../roadmap.md#verify) / **SOFT-PREDICT-01…05**. This doc remains the lock; Thinking effort Settings stay Backlog. Streaming context: [05-token-streaming-review.md](05-token-streaming-review.md). Blurbs context: [06-thinking-blurbs-review.md](06-thinking-blurbs-review.md).

---

## Problem

Ask calls hit a **hard** Ollama `num_predict` wall with no overshoot or continue. Thinking models can burn the entire budget on hidden `message.thinking`, leaving **zero visible reply** (`done_reason=length`, `raw_len=0`). Today the workaround is unconditional **`think: False`** in `ask_ollama_stream_once` — empty replies stop, but reasoning quality is capped.

**Shipped code** ([ollama_ask_budgets.py](../../py_modules/backend/services/ollama_ask_budgets.py), [ollama_service.py](../../py_modules/backend/services/ollama_service.py)):

- `num_predict`: **800** (speed) / **1200** (deep) / **1600** (strategy) via C1 resolver
- `think: false` default (`think_effort="off"`); thinking budgets reserved for Phase 1
- Soft continue on `done_reason=length` (max 2) with ephemeral `Continuing…` cue

**Product goal:** Longer, better answers in general. Short thinking one-liners ship later under **Thinking effort control** (Backlog), not in this bug.

---

## Ship order

1. **Bug v1** (this row) — caps, soft continue, C1 budget plumbing
2. **Backlog feature** — Thinking effort Settings (Phase 1), blurb one-liners (Phase 2)

---

## Locked decisions

| Decision | Lock |
|---|---|
| Bug v1 scope | Raise per-mode caps + soft auto-continue on `done_reason=length` + **C1** internal thinking-budget plumbing |
| `think` in bug v1 | Stay **`think: false` by default**; reserve separate thinking budget so effort control can enable think later without empty replies |
| Continue UX | Auto-continue; ephemeral inline cue **`Continuing…`** at stream tail; strip cue → **one seamless reply** |
| Empty continue | **Stop quietly** (no error toast) |
| Stop mid-continue | Same as STREAM-04: **partial body + small “Stopped”** |
| Strategy | **Continue anyway** (rely on existing incomplete-fence hiding) |
| Mode ceilings | Per-mode; Speed may run longer while gaming (APU OK). **Max 2** continues per mode; timeout / cancel / empty-delta always win |
| Reply verbosity | **Prompt-only** — does **not** map to `num_predict` or continue count |
| Dev visibility | Structured **logs** on each continue; **no** new Developer UI in bug v1 |
| Later one-liners | Extend **thinking blurbs**, not raw model `thinking` (raw channel optional much later under High effort — out of this lock) |

### Base cap targets (tune on-Deck)

| Ask mode | Today | Bug v1 target |
|---|---|---|
| Speed | 500 | **800** |
| Expert | 500 | **1200** |
| Strategy | 900 | **1600** |

> The mode is **`expert`** (`Plugin.VALID_ASK_MODES`); `deep` was its name before
> 2026-06-26 and is now a legacy alias migrated on settings load. The cap table
> shipped keyed `deep`, so Expert ran on the Speed cap until **2026-08-15** — the
> keys must match `VALID_ASK_MODES` or the mismatch fails silently.

---

## Bug v1 — in scope

- Raise per-mode `num_predict` (table above)
- On `done_reason=length`, auto-continue up to mode max (2), stitching visible text
- Ephemeral inline **`Continuing…`** at live stream tail; **never** persist in saved reply / copy / history
- **C1:** Separate thinking-budget constants/plumbing in backend; default request still sends `think: false`
- Quiet stop when a continue adds no new visible tokens
- Stop / cancel: partial body + small “Stopped” (STREAM-04)
- Strategy: continue even mid-structure; incomplete-fence hide unchanged
- Log each continue: `done_reason=length`, continue index, mode, visible chars before/after

## Bug v1 — not in scope

- Thinking effort Settings UI (Off / Low / Medium / High)
- Blurb one-liner rewrite
- Reply verbosity → `num_predict` or continue allowance
- User-facing raw Ollama `thinking` channel
- New Developer toggle or status field for continues

---

## Backlog follow-on (after bug closes)

### Phase 1 — Thinking effort control *(shipped 2026-08-15; wire mapping superseded)*

~~Settings Off / Low / Medium / High → `think: false | "low" | "medium" | "high"`~~, wired to C1 budgets from the bug.

> **Superseded by [D21](../audit/maintainer-decisions-locked.md).** The named levels are a
> gpt-oss-family feature; qwen3 and deepseek-r1 accept `think` only as a boolean and reject a
> string, so the mapping above would have broken the thinking models most likely to be on a
> Deck. Shipped as **`think: true` for all three on levels**, with effort carried by the
> reserved thinking budget (256 / 512 / 1024) added to `num_predict`. The control lives on
> the **Ollama tab** beside Reply style, not in Settings.

### Phase 2 — Short thinking one-liners

Extend existing blurbs (`<bonsai-status>`, compose paths) — **not** raw model `thinking` by default.

---

## Suggested implement order

When someone picks up the bug (not this docs change):

1. **Raise caps** — per-mode constants in `ollama_service.py` (or shared budget module)
2. **Soft continue** — detect `done_reason=length`, re-issue with stitched context; enforce max continues + timeout / cancel / empty-delta guards
3. **Inline cue** — frontend ephemeral tail chrome; strip before persist; verify copy/history/spoiler parse
4. **C1 plumbing** — thinking vs visible budget split in code; keep `think: false` on wire until Phase 1
5. **Logs** — structured continue events for on-Deck QA
6. **On-Deck QA matrix** — Speed / Deep / Strategy; length wall; Stop mid-continue; empty continue; Strategy mid-fence

---

## QA matrix (when implementing)

| Case | Expected |
|---|---|
| Speed hits length wall once | Auto-continue; `Continuing…` at tail; seamless final reply |
| Continue adds nothing | Quiet stop; partial kept |
| Stop during continue | Partial + “Stopped” |
| Strategy mid-branch / open fence | Continue; incomplete hide still applies |
| Thinking model with `think: false` | Visible reply; no empty-reply regression |
| Reply verbosity slider | Prompt-only; caps unchanged |

---

## Related docs

- [05-token-streaming-review.md](05-token-streaming-review.md) — streaming made truncation visible; STREAM-04 Stop behavior
- [06-thinking-blurbs-review.md](06-thinking-blurbs-review.md) — blurb writers; Phase 2 one-liners stay on this path
- [13-roadmap-feature-ideas.md](13-roadmap-feature-ideas.md) — Reply verbosity remains prompt-only per this lock
