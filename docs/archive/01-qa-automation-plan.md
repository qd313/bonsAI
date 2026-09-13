# 01 — QA automation — what agents can realistically own

Planning answer to [roadmap-planning-questions.md](roadmap-planning-questions.md) § 1.
Recon only — **no implementation**. Effort uses the roadmap GTA scale (`★` … `★★★★★★`).

Sources: [testing.md](../testing.md) coverage rows, [testing-manual.md](../testing-manual.md)
tier definitions, [tier-manifest.json](../../tests/preview-suite/tier-manifest.json),
[run-preview-suite.mjs](../../scripts/run-preview-suite.mjs),
[AGENTS.md](../../AGENTS.md) § Preview limitations.

> **Corrections, 2026-08-08.** This document was written against a stale working
> tree — `docs/testing.md` at 102 lines and `main.py` at 2771, where the committed
> values were 197 and 2829. **Every `main.py:NNN` citation below is offset and has
> been corrected in place** (`dbg_fe_log` was cited at `:2565`, it is `main.py:2460`).
> Two claims were also wrong and are struck where they appear:
> **DEPLOY-VERIFY-02 is Verified, not Partial** — proved on 2026-08-03 by a real
> deploy against a sleeping Deck, not a staged one; and
> `scripts/probe_deck_rpc_surface.py` **is documented**, as a Verified row at
> `docs/testing.md` § Deployed RPC surface probe. Its problem is not obscurity —
> it is that running it depends on someone remembering, which is what the
> implementation plan fixes by wiring it into the deploy scripts.
>
> Separately, recon after this document found **five defects in the preview
> harness** that mean parts of §§ 2–3 rest on assertions that never ran. Read
> [testing.md § Preview-suite evidence invalidated](../testing.md#preview-suite-evidence-invalidated-2026-08-08)
> alongside this file.

---

## 0. Findings that bound everything below

Seven facts established during recon. Each one changes what is buildable, so they
come before the plan.

| # | Finding | Evidence |
|---|---------|----------|
| **F1** | **There is no input injection on the Deck.** No `xdotool` / `ydotool` / `uinput` / `evdev` anywhere in `scripts/`. On-device tooling is capture-only (`grim`, `gamescope-atom`, `pipewiresrc`, `wf-recorder`). "Scripted input + capture oracle" on-device is **two** missing pieces, not one. | [bonsai-capture.sh](../../scripts/deck/bonsai-capture.sh), [bonsai-capture-common.sh](../../scripts/deck/bonsai-capture-common.sh) |
| **F2** | **`assertStep` silently passes unknown assert types.** It is a flat run of `if (type === …)` blocks with **no default branch**. A typo (`domContain`, `rpcResults`) throws nothing → the scenario reports PASS. Contrast `runStep`, which does throw on an unknown action. | [run-preview-suite.mjs:231-271](../../scripts/run-preview-suite.mjs) vs [:348](../../scripts/run-preview-suite.mjs) |
| **F3** | **Every assertion is a substring match on stringified output.** `rpcResult` does `JSON.stringify(rpc).includes(expect)` — it cannot target a field, cannot negate, cannot regex. `"Steam Web API is off"` passing proves the phrase appears *somewhere* in the envelope, not that it is the reply. | [run-preview-suite.mjs:245-252](../../scripts/run-preview-suite.mjs) |
| **F4** | **An on-device oracle channel already exists and is underused.** `dbg_fe_log` bridges frontend → plugin log; the log lives at `~/homebrew/logs/bonsAI/` and is SSH-readable **with no tunnel**. Today it is used only for ad-hoc debug sessions. | [main.py:2460-2470](../../main.py), [troubleshooting.md:254](../troubleshooting.md) |
| **F5** | **A second on-device oracle exists for prompt testing.** `desktop_ask_verbose_logging` appends full system prompt, user prompt, model name and reply to `~/Desktop/bonsAI_logs/bonsai-ask-trace-YYYY-MM-DD.md` per Ask. Machine-readable, already shipped, SSH-pullable. | [troubleshooting.md:305-307](../troubleshooting.md) |
| **F6** | **The `deckOnly` E-bucket is bookkeeping, not tests.** All three scenarios have `"steps": []` and emit stub evidence. Nothing executes. | [deck-only-e-bucket.json](../../tests/preview-suite/deck-only-e-bucket.json) |
| **F7** | **Preview hooks cannot be reused on-device.** `registerPreviewTestHooks` returns early unless `isDeckyPreviewRuntime()`, so the 8 hooks (`getState`, `setGame`, `triggerAsk`, `attachScreenshot`, `getTransparencyJson`, `getSysfsWrites`, `setTab`, `resetDisclaimer`) do not exist in a Deck build. Anything on-Deck must go through **RPC or the log**. | [previewTestHooks.ts:8-37](../../src/preview/previewTestHooks.ts) |

**Ownership split.** Per [AGENTS.md:39](../../AGENTS.md), DPS is upstream — bonsAI must not
fork it. That partitions the work hard:

- **Ours:** `run-preview-suite.mjs`, scenario JSON, `src/preview/previewTestHooks.ts`, `scripts/`, RPC surface.
- **Upstream (qd313/decky-plugin-studio):** `focusPath` derivation, `runSequence` semantics, `captureScreenshot` IPC, sidecar RPC transport. File in [mcp-setup.md](../mcp-setup.md) findings log **and** upstream.

This matters immediately: `runSequence` returns **one** terminal `focusPath` plus one DOM
snapshot for the whole input list ([run-preview-suite.mjs:285-296](../../scripts/run-preview-suite.mjs)).
Asserting FOCUS-GRAPH-02 ("no skips") needs a **per-input focus trace**, which is a DPS
change. Until then, one `runSequence` per input is the workaround — verbose, and the
`80ms` default delay makes long chains slow.

---

## 1. Backlog item → closest automation

### 1a. The load-bearing distinction

Focus-graph work splits cleanly, and this split drives most of the plan:

| | Automatable in preview today | Not automatable at any tier below on-Deck |
|---|---|---|
| **Focus reachability** — is the stop in the graph, does Down reach it, does the order match | `runSequence` + `focusPathIncludes` (FOCUS-GRAPH-01/02/04) | — |
| **Focus geometry** — ring position, row height, scroll step size, pixel drift | — | Ring 1px offset (**OLLAMA-KEEPALIVE-FOCUS-01**), equal row height (**KB-FOCUS-01**), scroll step (**D-PAD-SCROLL-02**), caret shift (**STRATEGY-PLACEHOLDER-01**), overlay drift |

Preview mocks `@decky/ui` approximately and is explicitly **not pixel-perfect Steam CEF**
([AGENTS.md:71](../../AGENTS.md)). Every geometry row above is therefore permanently
manual or permanently vision-gated — no amount of DOM assertion reaches it.

### 1b. Mapping

| Backlog item | Rows | Closest automation | Verdict |
|---|---|---|---|
| **Device QA Tier 0 — SMOKE-A** | Plugin shell / tabs / Ask / connection | `tier0` + `tier3UI` already cover tab tour, conn test, presets via `setTab` hook + DOM | **Automated (preview)**; on-Deck confirm = CEF paint + real Ollama only |
| **SMOKE-C** | Permissions gate | Currently *one* `load_settings` RPC + substring `"hardware_control"` — does **not** test the gate | **Weakly automated** — the toast/blocked-action path is untested. Real preview scenario is buildable |
| **SMOKE-F** | Deterministic commands / VAC | 3 `callRpc` scenarios; no model needed | **Fully automatable, RPC-only** — best-in-class pattern |
| **Tier 1 — SMOKE-B** | TDP suggestions | `tier1Boundaries` clamp matrix + `getSysfsWrites` (now returns `[]` by design) | **Automated for suggestion text**; QAMP banner rendering = on-Deck |
| **SMOKE-E** | Strategy + spoilers | `SMOKE-E-strategy-mode`, `STREAM-03-strategy-spoiler` | **Partly automated**; spoiler *mask correctness* is qualitative (see §4) |
| **SMOKE-H** | Background Ask reopen | `BG-ASK-reopen-status`, `BG-ASK-lifecycle` — RPC status polling | **Automated**; "close QAM" is simulated, not real |
| **VAC-02…06** | VAC matrix | `tier2Deep` — already preview PASS per [testing-manual.md:189, 208-212](../testing-manual.md) | **Already automated.** Remaining gap is *on-Deck network egress*, not logic |
| **QAMP matrix** | QAMP-DECK-01…05 | `E-QAMP-DECK-01` is an empty stub (**F6**) | **Manual, permanently.** Steam restart, full reboot, QAM Performance reopen — no preview surface, no RPC surface |
| **Prompt-testing pass** | — | `ask_game_ai` envelope asserts (SMOKE-F pattern) | **Split** — see §4 |
| **PERMS-CLEAN-01…06** | Permissions cleanup | *None yet.* Mostly **negative** assertions ("no Adjust power limits toggle", "no Response verification section") | **Cheapest unclaimed win** — `domNotContains` is already implemented |
| **PRESET-GAME-01** | Preset chip inject | `setGame` hook + chip click + assert Ask text lacks `— {Game}` | **Automatable, unbuilt** |
| **SESSION-RAG-CHIPS-01** | Session RAG chips | `get_session_rag_chip_candidates` RPC; KB-on / KB-off / `corpus_missing` are all deterministic reason codes | **RPC contract fully automatable**; "chips appear in carousel" = preview DOM |
| **ROUTING-MERGE-01** | Pulled tags → try order | `merge_pulled_tags_into_routing_orders` + `load_settings` round-trip; the no-saved-order no-op is a precise assert | **Fully automatable, RPC-only** |
| **RPC-TIMEOUT-01** | Timeout wrapper | Vitest fake timers on `callDeckyWithTimeout`; the 4 unbounded call sites are a **static** check (grep-as-test) | **Automatable**, no device needed |
| **MICRO-01…05, CONTEXT-LADDER-01/03** | Micro-actions, chip ladder | `runSequence` reachability only | **Half** — order automatable, geometry not (§1a) |
| **VOICE-01…07** | Voice STT | — | **Manual.** Mic hardware |
| **UI-SCALE-01…05** | UI scale | Reachability automatable | **Half.** "handheld / dock / TV" is three physical displays |
| **Tier 4 clean install** | Release gate | `verify-decky-plugin-zip.sh` proves zip shape | **Manual.** "Ollama not yet installed → README path" is a one-shot machine state |
| **DEPLOY-VERIFY-01…03** | Deploy prune | `build.ps1` SHA-256 compares every shipped code file (**computed**, 57 today — this doc originally said 52, a fixed count that was already stale); **01, 02 and 03 all Verified** | **Already automated.** ~~02 needs a staged sleep-mid-deploy~~ — **corrected 2026-08-08:** 02 was Verified on 2026-08-03 by a real failure, a deploy attempted while the Deck was asleep, which is stronger than the staged version this row asked for |

**Permanently manual after any plan ships:** Gaming Mode / BPM rendering, CEF focus and
paint, QAMP OS-level persistence (Steam restart, reboot), voice mic, physical display
matrix, clean install, and all pixel geometry in §1a.

---

## 2. Tiered automation plan

### A0 — Make the harness truthful ★

**No coverage lift. Everything below is worth exactly as much as this.** Per **F2** a
typo'd assert type reports PASS; per **F3** a passing `rpcResult` may be matching a
substring in an unrelated field. Every existing PASS in `docs/test-evidence/` inherits
both risks.

- `assertStep`: `default: throw new Error("Unknown assert type: " + type)`.
- Add `rpcField` (dotted path + exact/regex), `rpcFieldAbsent`, `notMatches`.
- Re-run `preGate` + `tier0` + `tier2Deep` and record which rows change. **Assume some will.**

*Do this first or the rest is theatre.*

### A1 — Harvest the cheap preview scenarios ★★

Scenarios that need no new infrastructure, only JSON:

| New scenario | Rows | Mechanism |
|---|---|---|
| `PERMS-CLEAN-01…06` | Permissions cleanup | `setTab` + `domNotContains` × 6 |
| `SMOKE-C-blocked-action` | Permissions gate | Toggle capability off via RPC → attempt → assert toast in DOM |
| `PRESET-GAME-01` | Preset chip inject | `setGame` → chip → assert no `— {Game}` |
| `SESSION-RAG-CHIPS-01` | Session RAG chips | 3 `callRpc` for KB-on / KB-off / `corpus_missing` reason codes |
| `ROUTING-MERGE-01` | Pulled tags | merge RPC → `load_settings` order assert + no-op case |
| `RPC-TIMEOUT-01` | Timeout wrapper | Vitest + static call-site check |

### A2 — Focus reachability as a first-class scenario type ★★★

Encode FOCUS-GRAPH-01/02/04 as data, not prose. Target shape:

```json
{ "action": "focusWalk", "from": "test-connection", "inputs": ["Up","Up","Down"],
  "expectPath": ["install-options", "browse-models", "install-options"] }
```

Implemented **ours-side** as one `runSequence` per input (**F1** workaround), replaced by a
single call if DPS adds a per-input trace. Unblocks the reachability half of
OLLAMA-FOCUS-02/03, CONTEXT-LADDER-03, MICRO-04, UI-SCALE, KB-FOCUS-01.

**Also file upstream:** per-input focus trace from `runSequence`; a documented `focusPath`
node identity contract (today it is an opaque array `focusPathIncludes` substring-matches).

### A3 — Post-deploy on-device gate, log-based ★★★

The highest-value **unclaimed** tier, and it needs no new device capability — **F4**.

After `build.ps1` / `build.sh` (`build.ps1` already hash-verifies every shipped code
file; **`build.sh` has no deploy verification at all** — D8 landed in PowerShell only):

1. SSH, truncate `~/homebrew/logs/bonsAI/`.
2. Assert `bonsAI plugin loaded!` within N seconds — a real on-Deck load gate.
3. Assert **no** traceback / `ERROR` during load.
4. Pull the log; assert the RPC surface registered.

Turns `E-*` from empty stubs (**F6**) into a genuine tier. It cannot drive input, so it
proves *the plugin loads and its backend works on real hardware* — which is precisely the
part preview cannot prove and a human currently burns 15 minutes on.

### A4 — Spike: CEF remote debugging as the missing input path ★★★★ (spike ★★)

**Status: UNKNOWN — nothing in this repo references it.** No hits for `8081`,
`remote-debugging`, or `devtools` across `scripts/` and `docs/`.

The hypothesis: SteamOS CEF exposes a debugging port; Decky already injects into that
context. If reachable from the PC over SSH port-forward, an agent could evaluate JS in the
real Steam client — reading real DOM, real focus, and calling real RPC **on-device**. That
single capability would collapse most of the "must be manual" column into automatable.

Timebox to a spike. Do **not** plan dependent work until it returns. If it works, it likely
belongs upstream in DPS, not in bonsAI (AGENTS.md:39). If it fails, **F1** stands and
on-device input stays manual forever.

### A5 — Nightly agent loop ★★

`preGate → tier0 → tier1Core → tier2 → hookSmoke → tier3UI → tier2Deep` with `--write`,
then A3 if a Deck is reachable. The runner already writes evidence and patches docs.

**Guard:** `--write` upserts PASS rows into shipped docs. A nightly run gated on a
too-permissive harness (**A0**) would mass-produce false Verified rows. Ship A0 first;
consider a `--write-scope=nightly` that touches only the archive, never `testing.md`.

### A6 — Preview screenshot diffing ★★★★ — **recommend deferring**

`captureScreenshotArtifact` has an `htmlFallback` branch, and
[tier-manifest.json](../../tests/preview-suite/tier-manifest.json) `_nextPhase` still reads
*"Rebuild decky-plugin-studio VSIX ≥0.1.2 after html2canvas capture"* — so whether preview
capture currently yields PNG or HTML is **UNKNOWN**.

Even working, this diffs **preview** pixels. Preview is not pixel-accurate CEF
(AGENTS.md:71), so it cannot adjudicate a single geometry row from §1a — those are all
about *real Steam chrome*. It would catch preview-side regressions only, at the cost of a
golden-image corpus and its churn. Low value per unit of maintenance here.

---

## 3. Video / screenshot as test oracle

### What it could unblock

Only geometry — which is exactly the set nothing else reaches:

| Scenario | Oracle | Feasible? |
|---|---|---|
| Focus ring position (**OLLAMA-KEEPALIVE-FOCUS-01**, 1px) | Vision reads ring vs dot centre | Marginal — 1px on a downscaled PNG is at or past the discrimination limit |
| Equal row height (**KB-FOCUS-01**) | Vision compares two buttons | Plausible — a coarse, checkable relation |
| Spoiler masks (**SMOKE-E**, **STRAT-SPOIL-DRG-01**) | Vision confirms text is *visually* hidden | **Genuinely strong** — DOM cannot prove a CSS mask actually occludes |
| Tab flicker (LB/RB) | Video, frame-diff across a switch | **The best fit** — flicker is definitionally temporal; no static oracle exists |
| D-pad scroll step (**D-PAD-SCROLL-02**) | Video, lines advanced per press | Plausible with per-frame OCR; brittle |

### Missing infrastructure

1. **Input.** **F1** — the blocker. Every scenario above is "*after scripted input*". Today a
   human presses the buttons, so capture-as-oracle saves the *judging*, not the *driving* —
   maybe a third of the cost. This inverts the usual intuition and is the main reason to
   rank A4 above A6.
2. **Capture IPC stability.** Recording requires QAM + bonsAI **already open** and exits
   non-zero on `plugin_ui=no` ([deck-screen-recording.md:21](../archive/spikes/deck-screen-recording.md)).
   Sequencing is manual.
3. **Frame timing.** No timestamp correlation between an input event and a frame. Flicker
   detection needs "the 3 frames after the LB press" — unavailable.
4. **Mode parity.** Game mode is `pipewire-gamescope`, desktop is `wf-recorder`; the spike's
   own acceptance table demands a parity screenshot. Two capture paths = two rendering
   baselines = two golden corpora.
5. **On-device QA never run.** The spike's log table
   ([deck-screen-recording.md:65-75](../archive/spikes/deck-screen-recording.md)) is
   **entirely blank** — build, SteamOS version, method, plugin-visible, parity. v1 is
   unvalidated on hardware.

### False-pass / false-fail vs DOM

- **False pass (worst).** A vision model asked "is the focus ring centred?" is agreeable by
  default. Unlike `focusPathIncludes`, there is no mechanical failure — it returns prose.
  Compression artifacts (VP8 @ ~2.5 Mbps default) destroy exactly the 1px signal, and the
  judge will not say so.
- **False fail.** Non-determinism the DOM does not have: HDR, scaling, animation phase,
  cursor, notification toasts, clock digits. Every one produces a diff.
- **Non-reproducible.** A DOM assert fails identically forever; a vision verdict may differ
  run to run on the same frame.

**Recommendation.** Do **not** make vision a pass/fail gate. Use it as a **triage
attachment**: capture on failure, let the agent describe it in the evidence bundle, keep
the verdict mechanical. The one defensible exception is **spoiler mask occlusion**, where
no mechanical oracle exists at all and the signal is coarse (text visible / not visible) —
and even there, treat a FAIL as a maintainer callout, never an auto-filed regression.

---

## 4. Prompt testing

### The clean split

**Deterministic (automatable now).** The SMOKE-F pattern is the model: local commands
`bonsai:disable-sanitize`, `bonsai:shortcut-setup-deck`, `bonsai:vac-check` short-circuit
**before** any Ollama call — `_try_handle_sanitizer_keyword_command`
([main.py:672](../../main.py)), called from both Ask entry points at
[main.py:2131](../../main.py) and [:2334](../../main.py) — byte-identical output every
run. Also deterministic:

- **Envelope shape.** `_reject_ask_request` ([main.py:661-670](../../main.py)) fixes
  `success` / `response` / `app_id` / `app_context` / `applied` / `elapsed_seconds`.
- **Rejection paths.** Empty question, empty `pc_ip` — exact strings.
- **Routing.** Which model was selected for a mode, given installed tags.
- **Gating.** Capability off → no network. Spoiler consent respected. Game context attached
  only when permitted.
- **Structural properties of a live reply.** Non-empty, under `num_predict`,
  `done_reason != "length"` with empty content (the live bug in roadmap § Bugs), no leaked
  system prompt, no PII from the sanitizer.

That last group is the real prize: **assert on properties, not on content.** They are
model-independent, need no judge, and catch the failures that actually ship.

**Qualitative (needs human or LLM-as-judge).** Answer correctness, spoiler-mask
*appropriateness* (STRAT-SPOIL-DRG-01: are DRG Survivor boss names spoilers?), tone,
hallucination, whether Speed vs Expert disclosure differs *meaningfully*. Genuinely
unautomatable — a judge model has no ground truth for a game it does not know.

**LLM-as-judge is worth it for exactly one thing:** regression detection against a frozen
baseline. "Is this reply materially worse than the recorded one for the same prompt?" is a
comparison, not a knowledge question, and a judge is decent at it. Absolute quality scoring
is not worth building.

### Minimal nightly matrix (no human, no Deck)

Runs against preview's real Python backend + local Ollama. ~15 prompts:

| Class | Prompts | Assert | Judge? |
|---|---|---|---|
| Deterministic commands | 3 (existing SMOKE-F) | exact string | no |
| Rejection paths | 2 (empty question, empty IP) | exact envelope | no |
| Envelope structure | 3 (Speed, Expert, Strategy) | keys present, types, `elapsed_seconds > 0` | no |
| Length/thinking guard | 2 (long-answer prompts) | content non-empty when `done_reason == "length"` | no |
| Leak guard | 2 (prompt-injection-shaped, PII-shaped) | system prompt absent, sanitizer applied | no |
| Game context | 2 (`setGame` on/off) | context chips present/absent per permission | no |
| Baseline drift | 3 (frozen prompts + recorded replies) | — | **yes**, pairwise vs baseline |

12 of 15 need **no judge at all**. Cost is one Ollama round-trip each; the whole matrix is a
few minutes. Store the frozen baseline under `docs/test-evidence/prompt-baseline/` and
require a human to re-bless it on intentional prompt changes.

**Free extension:** **F5** — `desktop_ask_verbose_logging` already writes full system prompt,
user prompt, model and reply per Ask to `~/Desktop/bonsAI_logs/bonsai-ask-trace-*.md`. During
*any* on-Deck session, that file is a machine-readable transcript for the same asserts,
pullable over SSH. The prompt-testing corpus can be harvested from ordinary manual QA at
zero extra maintainer cost — a maintainer doing Tier 0 by hand generates the dataset for
free.

---

## 5. Prioritized backlog

| # | Item | ★ | Rows moved | Notes |
|---|------|---|-----------|-------|
| **1** | **A0** — assert-type default throw + field-targeted asserts | ★ | *none* (may move some **backwards**) | Prerequisite for every row below. Existing PASS evidence is unverified until this lands |
| **2** | **A1** — six cheap preview scenarios | ★★ | PERMS-CLEAN Open→Partial · PRESET-GAME-01 Open→Partial · SESSION-RAG-CHIPS-01 Open→Partial · ROUTING-MERGE-01 Open→Partial · RPC-TIMEOUT-01 Open→Partial · Permissions gate Partial→Verified(preview) | Best lift per unit effort. All mechanisms already exist |
| **3** | **A3** — post-deploy log gate | ★★★ | ~~DEPLOY-VERIFY-02 Partial→Verified~~ (already Verified) · `E-*` stubs → real | First genuine *on-hardware* automation. No new device capability needed (**F4**) |
| **4** | **A5** — nightly loop | ★★ | keeps rows fresh; no new rows | Gate on A0. Restrict `--write` scope |
| **5** | **§4 matrix** — nightly prompt tests | ★★★ | Prompt-testing backlog item → Partial · SMOKE-F Partial→Verified | 12/15 need no judge |
| **6** | **A2** — `focusWalk` scenario type | ★★★ | CONTEXT-LADDER-03 · MICRO-04 · OLLAMA-FOCUS-02/03 · UI-SCALE-02/03 → Open→Partial (reachability half only) | Verbose until DPS adds a per-input trace. File upstream |
| **7** | **A4** — CEF debugging spike | ★★ spike / ★★★★ if it lands | potentially most of the manual column | **UNKNOWN.** Timebox. Nothing depends on it until it returns |
| **8** | **A6** — screenshot diffing | ★★★★ | ~none | **Defer.** Diffs preview pixels, not CEF pixels — cannot adjudicate any geometry row |
| **—** | Vision-as-gate | — | — | **Do not build.** Triage attachment only; see §3 |

### Expected net effect

Roughly **6 rows Open→Partial**, **2 Partial→Verified**, and the `deckOnly` bucket becomes
real, for about **★★★★ of total work** concentrated in items 1–3. Items 1–3 alone are the
majority of the return.

### Still requires a human on hardware after all of this

1. **Gaming Mode / BPM rendering** — CEF paint, real Steam chrome. Preview is approximate by design.
2. **All pixel geometry** (§1a) — ring offset, row height, scroll step, caret shift, overlay drift.
3. **QAMP OS persistence** — Steam restart, full reboot, QAM Performance reopen.
4. **Voice STT** — mic hardware.
5. **UI scale across displays** — handheld / dock / TV.
6. **Tier 4 clean install** — one-shot machine state.
7. **Qualitative reply judgment** — correctness, spoiler appropriateness, hallucination.
8. **Anything needing controller input on-device** — until **A4** says otherwise (**F1**).

The honest summary: automation can take Tier 0's *backend and contract* surface almost
entirely, and about half of the focus-graph surface. It cannot take Gaming Mode, and the
video-oracle idea is blocked less by the oracle than by the absence of a way to press the
buttons.

---

## Follow-ups to file

- **[mcp-setup.md](../mcp-setup.md) DPS findings log** (currently empty): per-input focus
  trace from `runSequence`; documented `focusPath` node identity; `captureScreenshot`
  PNG-vs-HTML status (**F7** / manifest `_nextPhase`). Mirror upstream.
- **[deck-screen-recording.md](../archive/spikes/deck-screen-recording.md)**: the on-device QA
  log table is blank — v1 is unvalidated on hardware. Either run it or mark the spike stalled.
- **Stale `.pyc` without source:** `py_modules/backend/services/__pycache__/agent_debug_ingest.cpython-312.pyc`
  and `deck_hw_debug.cpython-312.pyc` have no `.py`. Related to the DEPLOY-VERIFY prune work.
