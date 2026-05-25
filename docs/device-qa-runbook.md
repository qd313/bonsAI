# bonsAI device QA runbook

**Purpose:** What to run on Steam Deck **next**, in priority order. Quick wins first; heavy setup last.

**Detail and history:** scenario checkboxes, Test Results log, and shipped-feature index → [prompt-testing.md](prompt-testing.md).  
**PR automated gates:** → [regression-and-smoke.md](regression-and-smoke.md) §1.

Record **build id / git SHA** and **SteamOS** in [prompt-testing.md](prompt-testing.md) when marking Pass / Partial / Fail.

---

## Tags

| Tag | Meaning |
|-----|---------|
| **P0–P3** | Importance — P0 = core product; P3 = polish / easter eggs |
| **S0–S3** | Setup cost — S0 = BPM + Ollama up; S3 = reboot / clean install / multi-game |
| **Tier 0–4** | Run order — complete lower tiers before higher unless PR-scoped |

---

## Cross-cutting smokes

One smoke run can check off many coverage rows. After each smoke, update [prompt-testing.md](prompt-testing.md) **Shipped feature coverage** and linked scenario checkboxes.

| ID | Name | Tier | Setup | Importance | Covers (feature IDs) |
|----|------|------|-------|------------|----------------------|
| **SMOKE-A** | Golden path | 0 | S0, BPM | P0 | Plugin shell, tabs, Connection Ask, D-pad chunks, transparency opens, presets visible |
| **SMOKE-C** | Permission gate | 0 | S0 | P0 | Capability center — blocked-action toast pattern |
| **SMOKE-F** | Deterministic commands | 0 | S0, no model | P2 | Input sanitizer commands, shortcut-setup-deck, vac-check capability-off |
| **SMOKE-B** | TDP apply 8W | 1 | S1, game + Hardware on | P0 | TDP JSON, sysfs, game context, QAMP banner, permissions hardware |
| **SMOKE-E** | Strategy one-shot | 1 | S1 | P1 | Mode selector, strategy placeholder, spoiler tap-to-reveal, Spoilers OK |
| **SMOKE-D** | Frozen carousel triple | 1 | S1, optional flag | P0 | Presets, game-name append, troubleshooting prompts — **verified** (see coverage) |
| **SMOKE-G** | Vision attach once | 1 | S1, Media on | P1 | Attach browser, multimodal Ask — **verified** (vision sweep 2026-04) |
| **SMOKE-H** | Background Ask reopen | 1 | S1 | P1 | Close QAM while pending → reopen restores Thinking… or final reply |

**Tier 0 order (~15 min):** SMOKE-A → SMOKE-C → SMOKE-F  
**Tier 1 order (~20 min):** SMOKE-B → SMOKE-E → confirm SMOKE-D / SMOKE-G if not already marked → SMOKE-H

---

## Tier 0 — Quick wins (S0)

Run in BPM (Desktop → Big Picture → QAM → bonsAI). Ollama reachable; default permissions OK unless smoke says otherwise.

### SMOKE-A — Golden path (P0)

- [ ] Open plugin from QAM; no crash on first paint.
- [ ] LB/RB cycles **Main → Settings → Permissions → (Debug if enabled) → About**.
- [ ] **Settings → Connection → Test** — success or stable unreachable message (no traceback).
- [ ] Main tab: type a short question; **Ask**; reply appears in focusable chunks.
- [ ] D-pad down through chunks; last chunk readable.
- [ ] Expand **Input handling (last Ask)** — raw input, model name, system/user snapshot present.
- [ ] Three preset chips visible on Main.

**Links:** [prompt-testing.md](prompt-testing.md) → Tier 0 scenarios; coverage rows `CORE-ASK`, `CORE-UI`, `CONN-TEST`, `TRANSPARENCY`.

### SMOKE-C — Permission gate (P0)

- [ ] **Permissions:** turn **Hardware control** (or another) **off**.
- [ ] Trigger blocked action (e.g. Ask that would apply TDP, or attach screenshot if Media off).
- [ ] Toast directs to Permissions; no crash.
- [ ] Turn capability back **on** before Tier 1.

**Links:** coverage `PERMS-GATE`.

### SMOKE-F — Deterministic commands (P2)

No Ollama call for these paths.

- [ ] Ask exactly `bonsai:disable-sanitize` → confirmation; **Input handling** shows no Ollama text.
- [ ] Ask exactly `bonsai:enable-sanitize` → confirmation.
- [ ] Ask exactly `bonsai:shortcut-setup-deck` → Guide/QAM/Decky copy; no model call.
- [ ] Ask `bonsai:vac-check 76561198000000000` with **Steam Web API** off → capability message only; no network.

**Links:** [prompt-testing.md](prompt-testing.md) → Tier 0 deterministic; coverage `SANITIZER`, `SHORTCUT-KW`, `VAC-01`.

---

## Tier 1 — Core shipped (S1)

Requires a **game running** for some steps (Track B — Gaming Mode or BPM with game focused). Enable **Permissions → Hardware control** for TDP apply.

### SMOKE-B — TDP apply 8W (P0)

- [ ] With game running: Ask `Set my TDP to 8 watts`.
- [ ] Response includes `[Applied: TDP: 8W]` (or equivalent banner).
- [ ] QAM re-open guidance in transcript (**Note** about Performance tab).
- [ ] **Input handling** shows TDP route / JSON parse path.

**Links:** Test Results #3–4; coverage `TDP-APPLY`, `QAMP-BANNER`; [prompt-testing.md](prompt-testing.md) → QAMP on-Deck (first two rows).

### SMOKE-E — Strategy one-shot (P1)

- [ ] Main tab mode → **Strategy**; placeholder changes to strategy copy.
- [ ] Ask `How do I beat this level` (no spoilers permission).
- [ ] Reply uses tap-to-reveal spoiler blocks where applicable.
- [ ] Enable **Spoilers OK for this Ask**; follow-up allows fuller guidance.

**Links:** coverage `STRATEGY-CORE`, `STRATEGY-SPOILER`; [prompt-testing.md](prompt-testing.md) → Tier 2 Strategy depth (partial — expand in Tier 2).

### SMOKE-D — Frozen carousel triple (P0) — verified

Optional: set `TEMP_PRESET_CAROUSEL_FROZEN` in [`src/data/presets.ts`](../src/data/presets.ts). Three chips: crashing / stuttering / Proton. **Already verified** — spot-check only if presets change.

**Links:** coverage `PRESETS-CAROUSEL`, `TROUBLESHOOT-3`.

### SMOKE-G — Vision attach once (P1) — verified

Attach one screenshot + one Ask. **Already verified** (vision sweep 2026-04) — spot-check if attach/RPC changes.

**Links:** coverage `VISION-V1`.

### SMOKE-H — Background Ask reopen (P1)

- [ ] Start a slow Ask; close QAM before completion; reopen → **Thinking…** or restored pending state.
- [ ] Repeat: close QAM; reopen after completion → full reply restored.

**Links:** coverage `BG-ASK-V1`; [prompt-testing.md](prompt-testing.md) → Appendix Tier 4 background matrix for full lifecycle.

### Tier 1 extras (single Ask each)

- [ ] **Session restore:** close and reopen plugin — last Q&A still visible (`PERSIST-QA`, P0).
- [ ] **Mode Speed vs Deep:** one Ask each; model disclosure or routing differs (`MODE-SELECTOR`, P1).
- [ ] **What game am I playing?** with game focused — names title (`GAME-CTX`, P0).

---

## Tier 2 — Opt-in features (S2)

Run when touching related code or before a release candidate.

| Block | Setup | Importance | Detail in prompt-testing.md |
|-------|-------|------------|----------------------------|
| **VAC full matrix** | Steam Web API key + permission | P2 | VAC-01 … VAC-06 |
| **Proton log attach** | `PROTON_LOG=1`, game, log read permission | P2 | PROTON-LOG-01 … 03 |
| **Token streaming** | Developer tab + flag | P2 | STREAM-01 … 05 |
| **Strategy depth** | Strategy mode + screenshots optional | P1 | Strategy spoiler, checklist, cheat gating, regression subset |
| **Character voice** | AI character on, one preset Ask | P2 | CHAR-VOICE |
| **Pyro easter egg** | Pyro or Random → Pyro; Balanced + Nightmare spot | P3 | PYRO-EGG |
| **Beta presets** | Main tab chips with `[beta]` tag | P3 | BETA-PRESET |
| **mDNS Find LAN** | Avahi/Bonjour on Ollama host | P2 | MDNS-FIND |
| **Desktop notes** | Filesystem permission on | P2 | DESKTOP-NOTES |
| **Model policy** | Change tier; confirm disclosure on reply | P1 | MODEL-POLICY |

---

## Tier 3 — Heavy manual (S3)

Defer until Tier 0–2 pass or release window.

| Block | Why heavy | Detail |
|-------|-----------|--------|
| **QAMP on-Deck matrix** | Per-game profile, QAM reopen, Steam restart, reboot | [prompt-testing.md](prompt-testing.md) → QAMP on-Deck |
| **TDP boundary clamps** | Multiple watt asks with verification | TDP-15W, TDP-3W, TDP-1W, TDP-20W, GPU-800 |
| **Background Ask full lifecycle** | Timeout, error, busy guard, session boundary | Appendix Tier 4 |
| **Multi-game matrix** | Title-specific behavior | Games to test with |
| **Guide-chord macro** | User-specific QAM rail depth | [troubleshooting.md](troubleshooting.md) §5 |
| **Preset carousel timing (ms)** | Cosmetic animation | Appendix Tier 3 cosmetic |

---

## Tier 4 — Release gate (S3)

| Block | When |
|-------|------|
| **Clean install proof** | Before tagging a release — [regression-and-smoke.md](regression-and-smoke.md) §5 |
| **Environment matrix** | Record Decky / SteamOS / Ollama in [prompt-testing.md](prompt-testing.md) before Tier 1+ runs |

---

## Progress tracker

Update after each maintainer pass:

| Tier | Status | Last run (date / SHA) | Notes |
|------|--------|------------------------|-------|
| 0 | Open | | SMOKE-A, C, F |
| 1 | Open | | SMOKE-B, E, H + extras |
| 2 | Open | | Opt-in blocks |
| 3 | Deferred | | QAMP reboot, boundaries, full BG matrix |
| 4 | Deferred | | Clean install |

**Roadmap target:** Tier **0–1** complete for routine PRs; Tier **2+** ongoing before release.

---

## Revision log

| Date | Change |
|------|--------|
| 2026-05-24 | Initial tiered runbook; cross-cutting smokes; links to refactored prompt-testing.md |
