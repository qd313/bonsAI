# bonsAI prompt testing tracker

**Run order (what to do next):** [device-qa-runbook.md](device-qa-runbook.md) — Tier 0 quick wins first, heavy setup in Tier 3–4.  
**PR automated gates:** [regression-and-smoke.md](regression-and-smoke.md) §1.

This file holds the **shipped-feature coverage index**, **Test Results log**, and **detailed scenario checkboxes** linked from the runbook.

Related planning (not yet implemented): [roadmap.md](roadmap.md) **Planned** section. Research notes: [steam-input-research.md](steam-input-research.md), [voice-character-catalog.md](voice-character-catalog.md).

---

## Evidence rules (check-offs)

Mark `- [x]` when:

1. **On-device PASS** recorded in Test Results (with build / date when known), or  
2. **Documented verified sweep** — e.g. vision V1 manual run (2026-04), QAMP banner unit tests (2026-04-26), frozen-carousel troubleshooting pass.

Historical **FAIL** rows stay open for optional retest with a superseded note. Standardize on `- [x]` / `- [ ]` only.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **PASS** | Correct answer and action (if any) applied |
| **FAIL** | Wrong answer, hallucination, or action not applied |
| **PARTIAL** | Correct idea; formatting/parsing blocked full success |
| **PENDING** | Reserved for next on-device run |

Coverage table: **Verified** / **Partial** / **Open** / **N/A (unit-only)**.

---

## Shipped feature coverage

Maps [roadmap.md](roadmap.md) **Completed** items to test IDs. Update **Status** when runbook smokes or scenario rows pass.

### Release and first-run

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| BETA-MODAL | Beta disclaimer modal | SMOKE-A | Open | First paint |
| PRESETS-CAROUSEL | Suggested AI prompts + carousel | SMOKE-A, SMOKE-D | Partial | Troubleshooting triple verified; animation ms → Tier 3 |
| PROMPT-TEST-MVP | Prompt-testing MVP (this doc) | — | Partial | Matrices shipped; Tier 0–1 open |
| SANITIZER | Input sanitizer lane | SMOKE-F | Open | Unit + SMOKE-F |
| TRANSPARENCY | Input handling transparency panel | SMOKE-A | Open | Expand panel in golden path |

### Connection, routing, diagnostics

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CONN-TEST | Deck/PC connection + Test Ollama | SMOKE-A | Open | |
| CONN-TIMEOUT | Latency/timeout warnings + sliders | SMOKE-A | Open | Slow Ask optional |
| KEEP-ALIVE | Ollama keep_alive presets | — | Open | Settings persist |
| LOCAL-RUNTIME | Local Ollama on Deck default-off + onboarding | — | Open | Tier 2 |
| MDNS-FIND | LAN mDNS Find LAN | — | Open | Tier 2; needs Avahi |
| MAINT-HARNESS | Vitest Deck harness, watch-deploy | N/A (unit-only) | N/A | CI |
| OLLAMA-UPDATE | Update Ollama & Models on Deck | — | Open | Tier 2 |

### Tabs, icons, unified ask

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CORE-UI | Iconography, tabs, unified input | SMOKE-A | Open | |
| PERSIST-QA | Persist last Q&A on reopen | Tier 1 extra | Open | |
| UNIFIED-INPUT | Unified search + ask | SMOKE-A | Open | |
| PRESET-FADE-OPT | Preset chip fade opt-out | — | Open | Tier 3 cosmetic |
| CAROUSEL-SLIDE | Carousel slide + history (2026-05-20) | — | Open | Tier 3 cosmetic |
| GEMMA-PULL | Gemma pull models + routing | — | Partial | Unit tests |
| MODE-SELECTOR | Speed / Strategy / Deep | SMOKE-E, Tier 1 | Open | |
| STRATEGY-CORE | Strategy Guide prompt path | SMOKE-E | Open | |
| STRATEGY-SPOILER | Strategy spoiler policy + consent | SMOKE-E, STRAT-01…05 | Open | Unit green 2026-04-30 |
| DEBUG-TAB | Debug tab opt-in | SMOKE-A | Open | Tab strip when enabled |
| SETTINGS-TRIM | Settings tab trim | SMOKE-A | Open | |
| RESET-SESSION | Reset session cache | — | Open | Tier 2 |

### AI-assisted power and UX

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| TDP-APPLY | TDP automation via AI JSON | SMOKE-B, Test #3–4, 6 | Verified | PASS rows + sysfs |
| QAMP-BANNER | QAMP Phase 1 banner (safe default) | SMOKE-B, QAMP-CODE | Verified | Vitest 2026-04-26; on-Deck → Tier 3 |
| QAMP-ONDECK | QAMP manual (profile/reboot) | QAMP-DECK-01…05 | Open | Tier 3 |
| D-PAD-CHUNKS | D-pad response scrolling | SMOKE-A | Open | |
| BG-ASK-V1 | Background prompt completion V1 | SMOKE-H, BG-* | Partial | SMOKE-H Tier 1; full matrix Tier 4 |
| SYS-PROMPT-LAYERS | System prompt layer order | SMOKE-A transparency | Partial | `tests/test_ollama_service.py` only |

### Steam Input

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| STEAM-JUMP | Debug Steam Input jump Phase 1 | — | Open | Tier 2 optional |
| QUICK-LAUNCH-DOC | Guide-chord macro documentation | — | Open | Tier 3; [troubleshooting.md](troubleshooting.md) §5 |
| SHORTCUT-KW | Shortcut setup keywords | SMOKE-F | Open | |
| VAC-01…06 | VAC / ban lookup Phase 1 | SMOKE-F, VAC-* | Partial | SMOKE-F = capability-off; full → Tier 2 |

### About and polish

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| ABOUT-OLLAMA | Built on Ollama link | — | Open | Tier 3 |
| GLASS-UI | Search surface glass pass | SMOKE-A | Open | |

### Desktop notes

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| APP-LOG | App activity logging to Desktop | — | Open | Tier 2 |
| DESKTOP-NOTES | Save to Desktop note V1 | — | Open | Tier 2 |
| DESKTOP-AUTOSAVE | Daily chat auto-save V2 | — | Open | Tier 2 |

### Permissions and capabilities

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| PERMS-GATE | Capability Permission Center | SMOKE-C | Open | |
| PROTON-LOG | Proton log attachment | PROTON-LOG-01…03 | Open | Tier 2; needs PROTON_LOG |
| MODEL-POLICY | Model policy tiers + disclosure | — | Open | Tier 2 |

### Character voice

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CHAR-VOICE | Character roleplay mode | — | Open | Tier 2 |
| CHAR-ACCENT | Accent intensity levels | — | Open | Tier 2–3 |
| CHAR-SUGGEST | Running-game character suggestions | — | Open | Tier 2 |
| CHAR-RANDOM | Random “?” avatar | — | Open | Tier 3 |
| CHAR-ACCENT-UI | Character-derived UI accent theme | — | Open | Tier 3 |
| PYRO-EGG | Pyro talent-manager easter egg | — | Open | Tier 2–3 |

### Vision (baseline index)

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| VISION-V1 | Global screenshots and vision V1 | SMOKE-G | Verified | Vision sweep 2026-04; rows below |

### Other shipped baseline

| Feature ID | Shipped feature | Test ID(s) | Status | Evidence |
|------------|-----------------|------------|--------|----------|
| CORE-ASK | Ask pipeline / Ollama routing | SMOKE-A | Open | |
| GAME-CTX | Running game context | SMOKE-B, game-name Ask | Partial | Test #6 |
| TROUBLESHOOT-3 | Frozen carousel troubleshooting triple | SMOKE-D | Verified | ✓ prompts below |
| LINUX-OLLAMA | Linux Ollama compatibility | CONN-TEST | Open | |
| ZIP-CI | Plugin release zip CI | N/A | N/A | CI + Tier 4 clean install |

---

## Test Results

| # | Build / date | Game | Prompt | Expected | Model | Status | Notes |
|---|--------------|------|--------|----------|-------|--------|-------|
| 1 | — | None | "What is the capital of Michigan?" | Lansing (concise) | gemma3:latest | PASS | |
| 2 | — | Elden Ring | "What TDP should I use?" | 8–12W + JSON | llama3:latest | FAIL | Pre–system-prompt fix; **optional retest** |
| 3 | — | L4D2 | "Set my TDP to 8 watts" | JSON 8W, sysfs write | llama3:latest | PASS | → SMOKE-B |
| 4 | — | L4D2 | "Set my TDP to 6 watts" | JSON 6W, sysfs write | llama3:latest | PASS | journalctl confirmed |
| 5 | — | L4D2 | "Optimize for battery life" | Low TDP JSON | llama3:latest | FAIL | Pre–game context; **superseded** — with-game path verified below |
| 6 | — | *(session title)* | "Recommended TDP for this game?" | JSON 3–15W clamp | *record* | PASS | → TDP-REC |

---

## Tier 0 scenarios (S0)

Linked from [device-qa-runbook.md](device-qa-runbook.md) **Tier 0**. Prefer smokes over individual rows.

### Deterministic commands (SMOKE-F)

- [ ] `bonsai:disable-sanitize` / `bonsai:enable-sanitize` — whole message; confirmation; no Ollama text in transparency
- [ ] `bonsai:shortcut-setup-deck` — Guide chord, QAM, Decky; points to [troubleshooting.md](troubleshooting.md) §5
- [ ] `bonsai:shortcut-setup-stadia` — spare button / Stadia layout (not R4-only)
- [ ] Shortcut: **Open Controller settings** with External/Steam on → `steam://open/settings/controller`
- [ ] Shortcut: permissions off → toast to enable navigation
- [ ] `bonsai:vac-check` with **Steam Web API** off → capability message only (**VAC-01**)

### Token streaming (Tier 2 — Developer tab)

Requires **Settings → Data → Show Developer tab** → **Token streaming (experimental)**.

- [ ] **STREAM-01** Flag off: **Thinking…** until full reply; normal chunks after
- [ ] **STREAM-02** Flag on, Speed/Deep: single preview bubble; terminal split + banners
- [ ] **STREAM-03** Flag on, Strategy + spoiler masking, no Spoilers OK: no unmasked mid-stream flash
- [ ] **STREAM-04** Stop mid-stream: cancelled copy; no stale overwrite
- [ ] **STREAM-05** Transparency populates only after terminal

---

## Tier 1 scenarios (S1)

### TDP / performance

- [x] **TDP-REC** "Recommended TDP for this game?" (game running, JSON) — Test Results #6
- [x] "What's the efficiency sweet spot for this game?" — verified prior pass
- [x] "What are the best settings for 60fps?" — verified prior pass
- [x] **GPU-ADV** "What GPU clock should I use?" (advisory only; no sysfs GPU write) — verified
- [ ] **GPU-800** "Set GPU clock to 800 MHz" — JSON `gpu_clock_mhz`; backend logs, no write
- [ ] **TDP-15W** "Set TDP to 15 watts" — clamp at 15W
- [ ] **TDP-3W** "Set TDP to 3 watts" — clamp at 3W
- [ ] **TDP-1W** "Set TDP to 1 watt" — clamp to 3W
- [ ] **TDP-20W** "Set TDP to 20 watts" — clamp to 15W
- [ ] "Lower my TDP by 2 watts" — relative adjustment (may not parse)

### Battery / thermal / compatibility

- [x] "Optimize for battery life" (game running, low TDP JSON) — verified (supersedes Test #5 fail)
- [x] "Balance FPS and battery" / `How do I balance FPS and battery?`
- [ ] "Set TDP to minimum for menu/idle" / `What TDP should I use for menus and idle?`
- [x] "Best settings for 30fps with max battery"
- [x] "Optimize for battery life" (no game — general advice, no JSON)
- [x] "Reduce fan noise" / thermal long-session prompts — verified
- [x] General compatibility prompts ("What settings…", "known issues", "how well on Deck") — verified

### Troubleshooting / Proton

- [x] **TROUBLESHOOT-3** Frozen carousel: crashing / stuttering / Proton — verified (SMOKE-D)
- [ ] "Game won't launch, what should I check?"

#### Proton log attachment (Tier 2)

- [ ] **PROTON-LOG-01** Toggle + permission on, `steam-<appid>.log` present → transparency excerpt
- [ ] **PROTON-LOG-02** Toggle on, log read off → Ask completes; skip noted
- [ ] **PROTON-LOG-03** Heuristic ask, no log files → warning; answer still returns

### Controls and edge cases

- [ ] "Recommended controller layout?" (game running)
- [ ] "How to reduce input lag?"
- [ ] "What game am I playing?" (game running)
- [x] "What is my current TDP?" — read path + sysfs grounding (unit + prior pass)
- [ ] Non-English input → English reply
- [ ] Very long prompt stress test
- [x] Empty-ish "hi" / "help"
- [ ] TDP optimization ask with **no** game — generic advice only

**System prompt layers:** spot-check via SMOKE-A transparency; unit tests in `tests/test_ollama_service.py`.

---

## QAMP verification (Phase 1)

### Code / automated (verified 2026-04-26)

- [x] TDP write banner includes applied wattage
- [x] Transcript includes re-open QAM Performance guidance
- [x] **Note** about stale sliders on successful apply
- [x] GPU MHz recommendation labeled not sysfs-applied

### On-Deck manual (Tier 3 — record build + SteamOS)

- [ ] **QAMP-DECK-01** Per-game profile ON: TDP apply + guidance
- [ ] **QAMP-DECK-02** Per-game profile OFF: same
- [ ] **QAMP-DECK-03** Close/reopen QAM Performance: cap reflects write
- [ ] **QAMP-DECK-04** After Steam restart: OS default (not plugin regression)
- [ ] **QAMP-DECK-05** After full reboot: same

---

## Tier 2 — Strategy depth

Run after **SMOKE-E**. Unit coverage green 2026-04-30.

### Core mode UX

- [ ] **STRAT-01** "How do I beat this level" beta preset visible
- [ ] Strategy preset switches mode to Strategy Guide
- [ ] Strategy placeholder copy
- [ ] Follow-ups stay strategy-relevant

### Spoiler policy

- [ ] **STRAT-SPOIL-01** First answer: no-spoilers-by-default disclosure
- [ ] **STRAT-SPOIL-02** Without permission: no direct puzzle/boss spoilers
- [ ] **STRAT-SPOIL-03** With permission: unrestricted guidance OK
- [ ] **STRAT-SPOIL-04** Tap-to-reveal blocks default
- [ ] **STRAT-SPOIL-05** Settings spoiler masking toggle behavior

### Vision + strategy

- [ ] Strategy without screenshot: notes limited context
- [ ] Strategy with screenshot: scene-aware guidance
- [ ] Inline visual aid renders or degrades gracefully

### Steam Input coaching / checklist / cheat

- [ ] Headshots / control-specific Deck advice
- [ ] Checklist check/uncheck + follow-up progress
- [ ] Cheat / Fast Pass gating only when user asks to rush

### Strategy regression subset

- [ ] Beat level (no screenshot, no spoiler OK)
- [ ] Beat level + screenshot
- [ ] "Spoilers are okay, give me exact steps"
- [ ] "I can't hit headshots in this game"
- [ ] Checklist iteration prompt
- [ ] "Fastest cheese" cheat gating

---

## VAC / Steam ban lookup (`bonsai:vac-check`) — Tier 2

- [ ] **VAC-01** Capability off — SMOKE-F; no outbound request
- [ ] **VAC-02** Capability on, empty key
- [ ] **VAC-03** Valid key + known SteamID; route `vac_check`
- [ ] **VAC-04** Profile URL token
- [ ] **VAC-05** Vanity `/id/…` unsupported note
- [ ] **VAC-06** Permission off after key saved — no network

---

## Vision V1 (verified 2026-04)

Spot-check only if attach/RPC changes. **SMOKE-G**.

- [x] Fullscreen screenshot browser + thumbnails
- [x] App-priority ordering + global fallback
- [x] Select attaches; Back/Escape; controller navigation
- [x] Attach / Ask / Mic|Stop control row
- [x] Remove attachment → text-only next Ask
- [x] Quality Low / Mid / Max settings persist
- [x] Quality sweep on device (Low → Mid → Max)
- [x] Manual Deck staged run completed

---

## Appendix — Tier 3 cosmetic (P3)

### Preset and follow-up UX

- [ ] Three random presets on load
- [ ] Fade mode: stagger, offsets (~750/1300/1700 ms), fade in/out timing, length hold
- [ ] Carousel mode: slide, D-pad history, post-Ask re-seed
- [ ] Preset tap appends " for [game]" when game running
- [ ] Follow-up category detection (battery / performance / troubleshooting / controls)

### Beta preset behavior

- [ ] `[beta]` tag visual only (not in submitted text)
- [ ] Beta preset prompts give reasonable generic advice
- [ ] Beta category detection + follow-ups

---

## Appendix — Tier 4 heavy (S3)

### Background prompt completion (V1)

**Tier 1 smoke:** SMOKE-H (reopen pending / complete). Full matrix below.

#### Lifecycle

- [ ] Close QAM while pending → reopen → Thinking…
- [ ] Close QAM after complete → reopen → final reply
- [ ] Foreground flow unchanged
- [ ] Multiple reopens → single result

#### Busy / timeout / cancel

- [ ] Second Ask blocked while pending
- [ ] Timeout + error restore on reopen
- [ ] Stop/Clear semantics

#### Apply parity

- [ ] TDP JSON applies after background complete
- [ ] Session crash/reboot does **not** restore (expected V1)

#### Regression subset

- [ ] Slow / elapsed warnings; follow-up presets; input persistence; PC IP unchanged

### Games to test with

- [ ] Left 4 Dead 2
- [ ] Elden Ring
- [ ] Lightweight indie
- [ ] Demanding AAA
- [ ] Native Linux title
- [ ] Non-Steam / emulator shortcut

---

## Environment matrix

Validate on **Stable** Decky + **Stable** SteamOS when possible. Re-test PASS after channel changes.

| Component | Channel | Notes |
|-----------|---------|-------|
| Decky Loader | Stable (Release) | |
| SteamOS | Stable | Beta/Preview may change sysfs / QAM |

### Current test environment

Record before Tier 1+ runs:

- [ ] Decky Loader version: ___
- [ ] Decky channel: Stable / Pre-release
- [ ] SteamOS version: ___
- [ ] SteamOS channel: Stable / Beta / Preview
- [ ] Ollama version: ___
- [ ] Model(s) installed: ___

---

## Optional deep dives (release notes)

Historical **suggested checks** from shipped features — run when touching that area; not required for Tier 0–1.

### Input sanitizer (2026-04-16)

Magic phrases `bonsai:disable-sanitize` / `bonsai:enable-sanitize`; re-enable before comparative model runs.

### Character accent intensity (2026-04-16)

Same preset at subtle vs unleashed; JSON/TDP unchanged.

### Strategy + TDP layout (2026-04-18)

Pure puzzle Strategy ask → no hardware JSON in system prompt; mixed performance ask → contract returns.

### Character voice + Pyro (2026-04-15)

Picker, Random, custom line; Pyro Balanced vs Nightmare — no TDP apply on Nightmare asshole tier.

### Global screenshots (2026-04-13)

See **Vision V1** verified section.

### Frozen preset carousel (maintainers)

Set `TEMP_PRESET_CAROUSEL_FROZEN` in [`src/data/presets.ts`](../src/data/presets.ts) for repeatable chips:

1. `Why is my game crashing?`
2. `How do I fix stuttering?`
3. `Help me troubleshoot a Proton issue`

Turn **off** before release builds. `vitest` asserts frozen triple when flag on.

---

## Revision log

| Date | Change |
|------|--------|
| 2026-05-24 | Refactor: coverage matrix, tier-linked scenarios, dedupe, runbook split; audit ✓/x → [x] |
| *(prior)* | MVP matrices, vision sweep, QAMP unit verification |
