# 14 — Kids master lock — executable plan

**Status:** `IMPLEMENTED` — Stage 0 live CEF deferred; see `08` ## Spike results (2026-08-09). On-Deck QA Open.
**Research source (do not edit as ship plan):** [08-kids-master-lock-feasibility.md](08-kids-master-lock-feasibility.md)
**Roadmap:** [Backlog § Knowledge base — Kids master lock](../roadmap.md#permissions--safety) (★★★)

## How to use this file

Every task has an id (`KML-n.n`), an exact file, an acceptance criterion, and a
verify command. Work top to bottom. Tick the box and update the **State** column
in [Progress](#progress) as you go, and commit that update with the work.

**Line numbers were derived 2026-08-07 against `de0d504`. This repo churns —
re-run each task's `grep` before editing rather than trusting the number.**

**Do not start Stage 1 until Stage 0 returns.** The gate is real: one of its four
outcomes closes the feature entirely.

## Progress

| Task | Title | State |
|---|---|---|
| KML-0.1…0.4 | On-Deck spike | ✅ Done (typed/deferred — see `08` spike results) |
| KML-1.1…1.2 | Probe utility + tests | ✅ Done |
| KML-2.1…2.2 | Lock hook + latch | ✅ Done |
| KML-3.1…3.4 | Backend guard + RPC | ✅ Done |
| KML-4.1…4.4 | UI (effective caps, banner, disabled toggles) | ✅ Done |
| KML-5.1…5.5 | Docs | ✅ Done |

States: `☐ Not started` · `▶ In progress` · `✅ Done` · `⛔ Blocked` · `✖ Dropped`

---

## Definition of done

**Ships:** when Steam reports parental controls **locked** on the signed-in
account, bonsAI forces every key in `CAPABILITY_KEYS` to deny — file writes,
screenshots and game logs, Steam ban lookups, microphone — and greys the
Permissions toggles so they cannot be re-enabled from inside the plugin. Ask,
local/LAN Ollama and the offline knowledge base keep working.

Scope option **A** from `08` § 2. Options **B** (kill Ask) and **C** (force model
policy Tier 1) were rejected there and are not revisited here.

**Does not ship — reject any PR that adds these:**

- Content filtering, moderation, or age-rating of model output, or copy implying it.
- A bonsAI-side PIN or unlock. Unlocking happens in Steam.
- Persisted lock state in `settings.json`.
- Protobuf decode / `enabled_features` bitmask / `EParentalFeature` mapping (v1).
- Changes at the 12 existing `capability_enabled()` call sites.
- Any claim that this is a security boundary. The backend cannot verify the
  frontend's assertion; it is a guardrail against casual use.

---

## Stage 0 — On-Deck spike (BLOCKING, maintainer only)

Run in the CEF console against SharedJSContext. Full step text: [08 § 6](08-kids-master-lock-feasibility.md).

> **Never log `strPlaintextPassword`.** It is a real credential sitting in the
> payload. Log only `{ever_enabled, locked, byteLength, hasPlaintext: !!strPlaintextPassword}`.

- [ ] **KML-0.1 — API exists and fires.** `08` steps 1–2 on a normal account.
  **Accept:** `typeof SteamClient?.Parental?.RegisterForParentalSettingsChanges === "function"`,
  and the callback fires. **Record:** whether it fires synchronously inside
  `register()` and the ms-to-first-fire — that number sets the Stage 1 timeout.
- [ ] **KML-0.2 — Family View, adult account.** `08` step 3. Enable and lock
  Family View on a spare adult account. **Accept:** `locked: true` while locked,
  and an unprompted change callback with `locked: false` after unlocking without
  re-registering.
- [ ] **KML-0.3 — Decky reachable under lock.** `08` step 4. **Accept:** the Decky
  QAM tab and bonsAI panel open while Family View is locked.
- [ ] **KML-0.4 — Child account.** `08` step 5. **Accept:** record `locked`,
  `ever_enabled`, and whether the decoded blob is non-empty.

**Write the results into `08` as a `## Spike results` section** — not into chat,
not into this file (`CLAUDE.md` refactor rule 4).

### Decision gate — read before Stage 1

| Result | Action |
|---|---|
| KML-0.2 → `locked: true` | Proceed to Stage 1 |
| KML-0.4 → child account also `locked: true` | Ship exactly as scoped below |
| KML-0.4 → child account **not** locked | Add **Stage 6**: decode `is_enabled` from the `settings` `ArrayBuffer`. Re-star the roadmap item ★★★ → ★★★★ before starting |
| KML-0.3 → Decky unreachable under lock | **STOP.** The feature guards a surface the user cannot reach. Record in `08`, set this file's Status to `DROPPED`, close the roadmap item |

---

## Stage 1 — Probe utility

- [ ] **KML-1.1 — `src/utils/steamParental.ts`** (new)
  - **Do:** subscription-based reader over `SteamClient.Parental`. Export a
    subscribe function yielding `{ everEnabled, locked } | undefined`. Open with
    the repo's `Title: / Purpose: / Used for: / Solves: / Does not:` block
    ([docs/code-clarity.md](../code-clarity.md)).
  - **`undefined` means UNKNOWN, never "unlocked".** Say so in the header block.
  - **Must survive all four** (`08` § 1):
    1. `SteamClient.Parental` absent.
    2. **Callback fires synchronously inside `register()`, before it returns** —
       the naive `const reg = register(cb)` + `reg.unregister()` inside `cb`
       dereferences an unassigned variable. Defer behind a pending flag.
    3. `register()` throws *after* firing — `reg` stays unset, subscription leaks.
    4. Never fires → bounded timeout (use the KML-0.1 number), resolve UNKNOWN.
  - **Accept:** no path leaves a live subscription; nothing throws out of the module.

- [ ] **KML-1.2 — `src/utils/steamParental.test.ts`** (new) + extend the stub
  - **File:** [src/test-harness/setup.ts](../../src/test-harness/setup.ts) — the
    `SteamClient` stub currently fakes only `URL.ExecuteSteamURL`; add a
    configurable `Parental`.
    ```bash
    grep -n "SteamClient" src/test-harness/setup.ts
    ```
  - **Cases:** sync fire · async fire · never fires · `register()` throws · API
    absent · `locked` true→false→true · no leaked subscription in any of them.
  - **Verify:** `npm test`

## Stage 2 — Lock hook and latch

- [ ] **KML-2.1 — `src/hooks/useKidsLock.ts`** (new)
  - **Do:** a **long-lived subscription**, not a one-shot read. A parent unlocking
    mid-session must lift the lock without a plugin reload — which is why the Steam
    API is a subscription rather than a getter.
  - **Two latch rules. These are the load-bearing decision in this plan:**
    - **UNKNOWN → unlocked.** Failing closed on a timeout would strip
      filesystem/mic/screenshots from every user with no parental controls at all —
      a mass regression triggered by a slow callback. (Deliberately inverts the
      `booster-framework` prior art, whose threat model is not ours; `08` § 1.)
    - **Latch on observation.** Once `locked: true` is seen this session, only an
      explicit `locked: false` callback clears it — never a timeout, error, or
      unregister.
  - **Do:** push with `callDeckyWithTimeout("set_kids_lock_state", [active])`.
    The wrapper takes args as an **array**, unlike bare `call()`
    ([src/utils/deckyCall.ts](../../src/utils/deckyCall.ts)). Retry once on
    failure, then log and leave frontend gating in place.
  - **Accept:** unlock lifts the lock with no reload; a failed push does not
    un-gate the UI.

- [ ] **KML-2.2 — hook tests.** Cover both latch rules explicitly, including
  "timeout after a `true` does not clear the latch". **Verify:** `npm test`

## Stage 3 — Backend guard

- [ ] **KML-3.1 — `py_modules/backend/services/capabilities.py`**
  ```bash
  grep -n "def capability_enabled" py_modules/backend/services/capabilities.py
  ```
  - **Do:** module-level `_kids_lock_active` plus `set_kids_lock_active()` /
    `kids_lock_active()`. Check it as the **first** line of `capability_enabled()`.
  - **Do NOT touch `sanitize_capabilities()`** — sanitizing to `False` rewrites the
    user's stored preferences to disk, so unlocking would not restore them.
  - **Do NOT add a third parameter to `capability_enabled()`** — it touches all 12
    call sites and every future call site can forget it, a failure mode that fails
    **open**.
  - **Accept:** all five keys deny while active; stored `capabilities` on disk
    unchanged by locking.

- [ ] **KML-3.2 — RPC `set_kids_lock_state` in `main.py`**
  ```bash
  grep -n "async def set_intent_pack_enabled" main.py
  ```
  - **Do:** model it on `set_intent_pack_enabled`. A public `async def` at indent 4
    on `class Plugin` **is** the RPC contract — there is no decorator or registry.
  - **Name check:** `DOMAIN_KEYWORDS` in `generate-architecture.mjs` classifies by
    substring, so confirm where this name files in `rpc-map.json` after generating.
    `rpc-map.json` is generated and staged by the pre-commit hook — **never hand-edit.**

- [ ] **KML-3.3 — reset on load.** Set the flag `False` in `_main`
  (`grep -n "async def _main" main.py`) so a backend restart never leaves a stale lock.

- [ ] **KML-3.4 — `tests/test_capabilities.py`.** Each of the five keys denied when
  active · restored when cleared · flag defaults `False` · `sanitize_capabilities`
  output unchanged by locking. **Verify:** `npm run test:py`

> **Free consequence — state it in the code comment.** The guard is key-set based,
> so the future **Web** capability is forced off the moment it joins
> `CAPABILITY_KEYS`. That is the contract the Web roadmap entry already commits to,
> delivered with no extra code.

## Stage 4 — UI

- [ ] **KML-4.1 — derive `effectiveCapabilities` in `src/index.tsx`**
  ```bash
  grep -n "capabilities\." src/index.tsx
  ```
  - **Why this is not optional:** `capabilities` is read in ~10 places to gate
    frontend affordances. Backend-only enforcement leaves a locked Deck showing
    live screenshot/note/mic controls that then fail at the RPC.
  - **Do:** derive once from `capabilities` + `kidsLockActive`; pass to those consumers.

- [ ] **KML-4.2 — `src/components/PermissionsTab.tsx`**
  - **Do:** new `kidsLockActive` prop; banner row above the existing intro block;
    every `ToggleField` rendered **off and disabled**.
  - **Never mutate `capabilities` state** — stored values must survive the lock so
    unlocking restores exactly what the user had.
  - **Draft banner copy** (maintainer copy pass required before ship). Constraints
    from `08` § 4: attribute the signal to Steam, never claim child-safety, never
    promise output filtering, give no PIN instructions — Steam Families child
    accounts have no local PIN unlock.

    > **Parental controls active.** Steam reports that parental controls are locked
    > on this account, so bonsAI keeps every high-impact permission off — no file
    > writes, no screenshots or game logs, no microphone, no Steam ban lookups. Ask
    > still works with your local AI. These switches turn back on by themselves when
    > Steam's parental controls are unlocked. bonsAI does not filter what the AI says.

    The last sentence is the important one and must not be cut for length.

- [ ] **KML-4.3 — thread the prop** through
  [usePermissionsTabPayload.tsx](../../src/features/plugin-shell/tabs/usePermissionsTabPayload.tsx).

- [ ] **KML-4.4 — PermissionsTab render tests.** Banner renders when locked · all
  toggles disabled · stored capability values survive a lock/unlock cycle.
  **Verify:** `npm test`

> **Focus.** Per `.cursor/rules/decky-focus-graph.mdc`, a plain `ToggleField` in an
> existing `PanelSection` needs no focus wiring — nothing new joins the graph. The
> risk is the opposite: **disabling all four toggles may leave the Permissions tab
> with no focusable stop at all**, the same class of D-pad dead end the KB-download
> Cancel fix addressed. That is **KIDS-FOCUS-01** on-Deck, not a code conclusion.

## Stage 5 — Docs

- [ ] **KML-5.1 — README.** Beta caveat line + the seven-item *cannot promise* list
  from `08`. The load-bearing one: *we do not filter what the AI says.*
- [ ] **KML-5.2 — [docs/troubleshooting.md](../troubleshooting.md).** "bonsAI's
  permissions are all greyed out and I can't turn them on."
- [ ] **KML-5.3 — [docs/testing.md](../testing.md).** Four rows:
  - **KIDS-LOCK-01** — Family View locked, spare adult account: toggles grey,
    banner shows, privileged actions deny; unlock restores prior values.
  - **KIDS-LOCK-02** — Steam Families child account (may stay `Open` if no account).
  - **KIDS-FOCUS-01** — D-pad through Permissions while locked; no dead end.
  - **KIDS-REGRESS-01** — Deck with no parental controls: behaviour identical to today.
- [ ] **KML-5.4 — [docs/roadmap.md](../roadmap.md).** Move the item to In Progress,
  then Completed. Required before marking feature work done (`CLAUDE.md` § Conventions).
- [ ] **KML-5.5 — [CHANGELOG.md](../../CHANGELOG.md).** `[Unreleased] → Added`.

---

## Commit boundaries

One coherent change per commit; all four gates green between each. Never mix a
move with a rewrite (`CLAUDE.md` § Refactor rules 1).

| # | Contents | User-visible? |
|---|---|---|
| 1 | KML-1.x + KML-2.x | No — inert, nothing consumes the hook |
| 2 | KML-3.x | No — flag is never set true yet |
| 3 | KML-4.x | **Yes — the feature goes live here** |
| 4 | KML-5.x | Docs |

## Verification

```bash
npm test && npm run test:py && npx tsc --noEmit && npm run build
```

Then deploy (`scripts/build.ps1`, or `./scripts/build.sh dev`) and run
**KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01** on-Deck.

**KIDS-REGRESS-01 must not be skipped.** The failure this design is most exposed
to is breaking Decks that have no parental controls at all.

## Abort conditions

Stop and reopen the plan rather than working around any of these:

- KML-0.3 fails → feature is dead; set Status `DROPPED`, close the roadmap item.
- KML-0.4 shows child accounts are not `locked` → Stage 6 is now in scope; re-star
  ★★★★ before continuing.
- The latch cannot be made to survive a mid-session unlock without a reload →
  the design is wrong, not the code; return to `08` § 3.
- Any task needs a new persisted settings field → out of scope by definition;
  raise it as a maintainer decision instead
  ([audit/maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md)).
