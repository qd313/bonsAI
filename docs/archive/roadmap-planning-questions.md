# Roadmap planning questions (expanded)

Prepared prompts for a future AI planning session. Each section has a short summary of intent, then a detailed prompt to pass to another model.

---

## Deliverables

| Q# | Topic | Answer |
|----|-------|--------|
| 1 | Automating Device QA and prompt testing | [01-qa-automation-plan.md](01-qa-automation-plan.md) |
| 2 | ~~README.md redo~~ *(partial — only the install-URL fix landed)* | [02-readme-redesign-plan.md](02-readme-redesign-plan.md) · commit `44da1ff` |
| 3 | LB/RB tab switch flicker when scrolled | [03-lbrb-tab-flicker.md](03-lbrb-tab-flicker.md) |
| 4 | ~~Strategy spoiler false-positive~~ *(partial — fixes 1+2+4 landed 2026-08-07; on-Deck verification of STRAT-SPOIL-DRG-01 still open)* | [04-strategy-spoiler-false-positive.md](04-strategy-spoiler-false-positive.md) §7 · [spoiler-constitution.md](spoiler-constitution.md) · commits `4bb9ce0`, `f84c6e3`, `a68113d`, `25ff648`, `fe65175`, `87fde2b`, `c74e07e` |
| 5 | ~~Token streaming evaluation~~ *(partial — Phase A/B UX fixes landed 2026-08-07; Developer-tab flag not graduated)* | [05-token-streaming-review.md](05-token-streaming-review.md) §3.1–3.2 · commits `b0b1bbe`–`db4858a` (Phase A), `8237534`–`30ca6f9` (Phase B) |
| 6 | Thinking blurbs evaluation | [06-thinking-blurbs-review.md](06-thinking-blurbs-review.md) |
| 7 | Named chat slots | [07-named-chat-slots-postmortem.md](07-named-chat-slots-postmortem.md) |
| 8 | Kids master lock feasibility | [08-kids-master-lock-feasibility.md](08-kids-master-lock-feasibility.md) → ship plan [14-kids-master-lock-implementation-plan.md](14-kids-master-lock-implementation-plan.md) |
| 9 | Steam Frame companion UX feasibility | [09-steam-frame-companion-feasibility.md](09-steam-frame-companion-feasibility.md) |
| 10 | Wake-word listening feasibility and cost | [10-wake-word-listening-feasibility.md](10-wake-word-listening-feasibility.md) |
| 11 | Native QAM shortcut tile / decouple from Decky | [11-native-qam-tile-feasibility.md](11-native-qam-tile-feasibility.md) |
| 12 | Deep mod AI hints feasibility | [12-deep-mod-ai-hints-feasibility.md](12-deep-mod-ai-hints-feasibility.md) |
| 13 | ~~Feature ideas for roadmap.md (star-rated)~~ *(partial — 4 of 9 stubs added to roadmap; 2 shipped in code)* | [13-roadmap-feature-ideas.md](13-roadmap-feature-ideas.md) · results [roadmap-completed.md](../archive/roadmap-completed.md) · commits `ab90b30`, `b5093d2`, `3ecd9d0`, `60b6d14` |

---

## 1. Automating Device QA and prompt testing

### Summary

You want to cut down manual maintainer work on the **QA backlog** — especially **Device QA Tier 0–1** and the **broader prompt-testing pass** — by using tooling you already have: deploy to Deck, scripted D-pad in preview, screenshots/video, and agent-driven test runs.

**What already exists:**

- **Fast automated checks:** Vitest, pytest, and the preview-suite tiers (`pnpm run test:preview:tier`) — some scenarios already drive D-pad via `runSequence` and check DOM/focus paths.
- **Deck deploy + capture:** `deck.deploy`, `screenshot-deck` scripts, and a v1 screen-recording spike — useful for debugging and agent review, but **not** wired up as pass/fail tests.
- **Preview limits:** In-IDE preview mocks Decky UI; real Steam Deck focus bugs still need on-device QA. The **deck-only** bucket (QAMP, CEF/CORS, clean install) cannot run in preview at all.

**Two things to keep separate:**

1. **Device QA** = controller navigation, focus graphs, smokes in BPM/Gaming Mode (`testing-manual.md`).
2. **Prompt testing** = whether AI replies are *good* (quality/hallucination), not just whether the UI responded — only partly automatable via deterministic RPC checks.

**Your video-capture idea** is really two ideas: (a) scripted input + code asserts (partially done), vs (b) an AI/vision model reading video frames to judge UI (not built yet).

### Prompt for planning agent

> **Topic:** Automating Device QA and prompt testing — what can agents realistically own?
>
> **Context:** bonsAI splits testing into automated gates (`docs/testing-automated.md`: Vitest, pytest, preview-suite tiers) and manual Deck QA (`docs/testing-manual.md`, `roadmap.md` § Verify). The Verify list prioritizes **Device QA Tier 0–1** (SMOKE-A/C/F then B/E/H with Pass/Partial/Fail + build id) and a **broader prompt-testing pass** beyond shipped MVP matrices. We already deploy via `deck.deploy` / `scripts/build.sh`, run preview with `preview.injectFocusEvent` / `preview.runSequence` / `callRpc`, and capture Deck UI via `screenshot-deck` scripts and `deck.captureScreenshot`. Maintainer video recording exists (`record-deck.sh` spike) but is not wired into any test oracle.
>
> **Ask:**
> 1. Map the **QA backlog items** (Tier 0–1 smokes, VAC-02…06, QAMP matrix, prompt-testing pass) to the **closest existing automation** (preview scenario, RPC-only check, unit test) vs **must remain manual** (Gaming Mode, CEF focus, qualitative reply judgment). Use `testing.md` coverage rows and `testing-manual.md` tier definitions as the source list.
> 2. Propose a **tiered automation plan** (e.g. expand preview `runSequence` scenarios; agent-run tier loop with `--write`; post-deploy RPC+DOM checks via DPS; optional screenshot diffing) — with explicit limits of preview mocks vs on-Deck requirements per `AGENTS.md` and `decky-preview` workflow.
> 3. Evaluate **video/screenshot capture as test oracle** (agent or vision model reads `DeckCapture_*.png` / `DeckRecord_*.mkv` after scripted input): what scenarios could that unblock (focus position, spoiler masks, tab flicker), what infrastructure is missing (stable capture IPC, frame timing, BPM vs game-mode parity per `deck-screen-recording` spike), and what false-pass/false-fail risk remains vs DOM/`focusPath` assertions.
> 4. For **prompt testing**, separate what can be automated via deterministic RPC prompts + envelope asserts (pattern: SMOKE-F / `ask_game_ai`) from what needs human or LLM-as-judge review; recommend a minimal matrix the agent could run nightly without a human on the Deck.
>
> **Deliverable:** A prioritized backlog of automation work (★ effort), expected coverage lift (which `testing.md` rows move from Open → Partial/Verified), and what still requires a human on hardware after the plan ships.
>
> **Out of scope for this question:** Implementing the plan; fixing individual open bugs (D-PAD-SCROLL-02, MICRO-04, etc.) unless they block automation infrastructure.

---

## 2. README.md redo

### Summary

You want the repo-root **README.md** rewritten so a **Steam Deck owner with no Ollama background** can install bonsAI from the README alone — with **clear screenshots or short GIFs** showing each step, and **links out** to deeper docs for power users.

**How docs are meant to work today:**

- **README.md** = primary install + “what is this?” (`docs/DOCUMENTATION_INDEX.md` calls it the install entry). Should stay short and visual; not a manual.
- **docs/troubleshooting.md** = power-user depth (network, LAN Ollama, vision, permissions, Guide-chord shortcut, deploy edge cases).
- **docs/knowledge-base.md**, **docs/roadmap.md** = optional depth for KB/RAG and what’s coming.
- **docs/development.md** = contributors only (build, deploy, architecture).
- **In-plugin copy** = `src/data/pluginQuickStartInstructions.tsx` — shorter QAM-friendly version; should stay aligned after a README rewrite.

**Visual assets today:**

- One static hero: `assets/readme-hero.png` (v0.5.0 Main tab).
- Maintainer capture tooling exists (`screenshot-deck.sh` / `.ps1`, `record-deck.sh` spike) but **no install-walkthrough GIFs** are checked in yet.
- GitHub README GIFs are usually short, few, and under ~5–10 MB each — plan capture workflow accordingly.

**Known problems in the current README (verified against code/docs):**

- ~~**Conflicting install URLs**~~ — **Resolved 2026-08-14.** `cantcurecancer` was this account's former GitHub username, not a second repo; it's now unregistered and was a live risk (see [02-readme-redesign-plan.md § Canonical repo](02-readme-redesign-plan.md#canonical-repo--resolved-2026-08-14-f3)). `qd313/bonsAI` is canonical everywhere.
- **Stale permissions/power copy** — beta disclaimer and body text still describe **Adjust power limits** / TDP apply via Permissions; removed 2026-07-30 (TDP is suggestion-only per `docs/glossary.md`).
- **Text-heavy, low visual guidance** — install steps are numbered prose only; no per-step images for Decky install URL, Ollama tab, or first Ask.
- **Power-user content inline** — model-policy tables, sanitization deep dives, and contributor build notes mixed with first-run setup; should mostly link to `troubleshooting.md` instead.
- **Partial glossary overlap** — README glossary vs `docs/glossary.md` (maintainer scope); casual users need fewer terms in README, not more tables.

**What “better” means (your intent):** visual step-by-step install → first successful Ask; plain language; honest beta limits; a clear **“Need more?”** section linking power users to troubleshooting and other `docs/` — without turning README into `development.md`.

### Prompt for planning agent

> **Topic:** README.md redesign — visual install guide, casual Deck-owner audience, power-user doc funnel.
>
> **Context:** `README.md` is the public face of bonsAI (Decky Loader plugin, self-hosted Ollama, v0.5.0 in `plugin.json`). `docs/DOCUMENTATION_INDEX.md` positions it as the **primary install entry**; `docs/troubleshooting.md` explicitly defers first-time setup to README and owns edge cases. In-plugin help uses `src/data/pluginQuickStartInstructions.tsx` — separate shorter copy that should stay in sync. Current visuals: single `assets/readme-hero.png`; no install GIFs in repo. Maintainer can capture Deck UI via `screenshot-deck` scripts and `record-deck` (v1 spike in `docs/archive/spikes/deck-screen-recording.md`).
>
> **Primary reader:** Someone who **owns a Steam Deck**, has heard of Decky, and wants to **install bonsAI and send one Ask** — may not know Ollama, LAN, or QAM yet. README should teach the minimum inline; everything harder links out.
>
> **Power-user reader:** Same README should surface a short **“Go deeper”** block linking to `docs/troubleshooting.md` (network, vision, permissions, shortcuts), `docs/knowledge-base.md` (offline KB), `docs/roadmap.md` (planned work), and `docs/development.md` (contributors only).
>
> **Known accuracy gaps to fix in any proposal:**
> - ~~Install URL inconsistency~~ — resolved 2026-08-14; `qd313/bonsAI` is canonical.
> - TDP/power: README still documents **Permissions → Adjust power limits** and apply behavior; shipped product is **read-only suggestions** (permissions cleanup 2026-07-30).
> - Optional cleanup of copy for removed/planned-removed UI: Search intent packs, Response verification.
>
> **Ask:**
> 1. Propose a **target outline** optimized for the casual Deck owner: hero → 4–6 visual install steps → “send your first Ask” → brief “what you can do” bullets → **Go deeper** links. Cap main README body length (suggest a line/word budget). Move model-policy tables, sanitization detail, and build-from-source to linked docs or a collapsed “Contributors” footer.
> 2. Specify a **visual/media plan**: which steps need a screenshot vs a short GIF (e.g. QAM → Decky → paste install URL → Ollama tab → first Ask). Recommend filenames under `assets/`, dimensions, and whether to use GIF vs PNG for GitHub load time. Include a maintainer capture checklist (BPM vs Gaming Mode per `docs/development.md` Track A).
> 3. Recommend **tone and language** rules for non-technical readers (define QAM/Ollama once inline; avoid maintainer jargon; beta disclaimer shortened and accurate).
> 4. Define **doc funnel**: exact link targets and one-line descriptions for power users (`troubleshooting.md` sections, `knowledge-base.md`, `roadmap.md`). What must *not* be duplicated in README.
> 5. Define **single source of truth** for copy shared with `pluginQuickStartInstructions.tsx` (shared snippet vs manual sync).
> 6. List **specific stale lines/sections** in the current README to cut, rewrite, or relocate.
> 7. **Install/release hygiene**: canonical GitHub org/repo for releases; hero asset versioning tied to `plugin.json` version.
>
> **Deliverable:** Concrete README outline (headings + 1-line purpose + suggested image/GIF per section), a visual asset shot list, a “Go deeper” link map, do-not-duplicate matrix vs other docs, and prioritized edit checklist (★ effort). Separate ★ for copy vs asset capture work.
>
> **Out of scope:** Rewriting `troubleshooting.md` or `development.md` wholesale; producing final image files (plan only); implementing the new README text.

---

## 3. LB/RB tab switch flicker when scrolled

### Summary

When you press **LB/RB** (shoulder buttons) to change tabs while **scrolled down** in a tab panel — focus deep in content, not on the tab icons — the UI **flashes or jitters**. This has persisted through several layout fixes and is tracked as a ★★★ bug in `docs/roadmap.md` (discovery locked 2026-07-29).

**What was already fixed (related but different bugs):**

- **QAM panel collapse / strip overlap** (2026-07-08) — `useQamPanelHeightGuard`, `useTabStripBodyOffset`; tab body painting over LB/RB icons on Bazzite.
- **D-pad can't scroll back to tab strip** (2026-07-17) — `syncTabBodyViewportHeight`, `--bonsai-tab-body-height`; overflow scroll inside `TabContentsScroll`.
- **Partial anti-flicker CSS** — `section-3.ts` disables `transition`/`animation` on `TabContentsScroll` because Steam's native tab carousel can flash when content panes animate.

**What the flicker bug is:** Shoulder-button tab switch **while the panel is scrolled** — not the scroll-to-strip problem, not the crushed-layout problem.

**Likely architectural tension (your hypothesis):** bonsAI layers custom layout hooks and CSS on top of Decky's `<Tabs>` carousel. Tab switching goes through `onTabsShowTab` in `useBonsaiPluginShell.ts`; all tab bodies are built in a `useMemo` in `index.tsx`. There is **no per-tab scroll-position preservation** in code today — returning to a tab always shows the top of the panel. Multiple hooks (`useQamPanelHeightGuard`, `useTabStripBodyOffset`, `syncTabBodyViewportHeight`) re-measure on layout events; any of these firing during a carousel transition could cause thrash. Preview mocks may **not** reproduce real gamescope/CEF carousel behavior.

**Optional fix you want evaluated:** **Per-tab scroll-position preservation** — snapshot `scrollTop` (and optionally focus target) per tab id on LB/RB away, restore on return. May reduce flicker even if carousel animation is the root cause; also improves UX independent of the bug. Treat as one fix track alongside CSS/transition and layout-hook deferral — not assumed to be sufficient alone.

### Prompt for planning agent

> **Topic:** LB/RB tab-switch flicker when scrolled — root cause and architectural fix.
>
> **Context:** Open bug in `docs/roadmap.md` (In Progress → Bugs): *"Switching tabs with shoulder buttons while focus is deep in a scrolled panel (not on tab icons) flashes/jitters. Investigate carousel + remount/scroll/focus survival (partial anti-flicker CSS already on TabContentsScroll)."* Discovery locked 2026-07-29.
>
> **Repro (expected):**
> 1. Open bonsAI in QAM (BPM or Gaming Mode).
> 2. Go to **Settings** or **Ollama** (long scrollable tab).
> 3. D-pad **Down** until focus is deep in the panel (`scrollTop > 0`, not on LB/RB tab icons).
> 4. Press **LB** or **RB** to switch tabs.
> 5. Observe flash/jitter in tab strip, content pane, or both.
>
> **Key code paths to read first:**
> - `src/index.tsx` — `<Tabs activeTab={currentTab} onShowTab={onTabsShowTab}>`; `deckyTabs` `useMemo`; `key={bonsai-tabs-gen-${uiScale.generation}}` remount; `autoFocusContents: false`.
> - `src/hooks/useBonsaiPluginShell.ts` — `onTabsShowTab`, modal tab-restore locks.
> - `src/hooks/useQamPanelHeightGuard.ts`, `src/hooks/useTabStripBodyOffset.ts`, `src/utils/tabBodyViewport.ts` — QAM height lock, strip reserve, body viewport pin.
> - `src/styles/sections/section-1.ts`, `section-3.ts` — tab strip + `TabContentsScroll` layout; anti-flicker `transition: none` block (lines 72–80 in section-3).
> - Prior fixes documented in `docs/archive/roadmap-completed.md` (QAM-BAZZITE-01, D-PAD-SCROLL-01) — distinguish what those solved vs this bug.
>
> **Ask:**
> 1. **Root-cause analysis:** Is the flicker primarily (a) Decky/Steam carousel animation vs our CSS, (b) tab content remount/unmount on `activeTab` change, (c) scroll position reset + layout remeasure cascade, (d) focus handoff when `autoFocusContents: false`, or (e) interaction between the three layout hooks? Rank hypotheses with evidence from code.
> 2. **Architectural gap:** Does bonsAI need a pattern Decky plugins lack — e.g. per-tab scroll snapshot, decoupled tab strip from scroll body, or owning tab state outside `@decky/ui` `<Tabs>`? Compare to how other Decky plugins handle LB/RB if discoverable; otherwise state what bonsAI-specific complexity forces (long panels, UI scale remount, session survival).
> 3. **Fix options** with tradeoffs — evaluate at least these tracks separately:
>    - **(A) CSS / carousel:** extend anti-flicker rules; suppress Decky content-pane motion during LB/RB.
>    - **(B) Per-tab scroll preservation (optional fix — include full design):** on `onTabsShowTab`, save `TabContentsScroll.scrollTop` (keyed by tab id) before switch; restore after the new tab paints (e.g. `requestAnimationFrame` / `useLayoutEffect`). Address whether inactive tab DOM is unmounted by `<Tabs>` (snapshot in a ref map vs `display:none` keep-alive). Whether to also snapshot focus element or only scroll. Interaction with `uiScale.generation` remount (`key={bonsai-tabs-gen-…}`) and modal session survival (`useBonsaiPluginShell`). ★ effort, regression risk, UX benefit even if flicker persists.
>    - **(C) Layout hooks:** defer `useQamPanelHeightGuard` / `useTabStripBodyOffset` / `syncTabBodyViewportHeight` during tab transition.
>    - **(D) Structural:** custom tab strip instead of `<Tabs>`, or decouple strip from scroll body.
>    For each: ★ effort, regression risk to QAM-BAZZITE-01 / D-PAD-SCROLL-01, preview-testability vs on-Deck-only. Recommend **one primary flicker fix** plus whether **(B)** ships as a complementary UX improvement.
> 4. **Verification plan:** Minimal on-Deck repro matrix (which tabs, scroll depth, BPM vs Gaming Mode, Developer tab on/off, UI scale Apply). Suggest whether `record-deck` capture or screenshot diff can prove fix. Add/update a `testing-manual.md` row if missing.
>
> **Deliverable:** Ranked root-cause hypothesis, recommended fix approach (one primary + one fallback), and explicit list of **what prior fixes already ruled out** so we don't re-litigate solved problems.
>
> **Out of scope:** Implementing the fix; unrelated D-pad bugs (D-PAD-SCROLL-02 choppy answer scroll, MICRO-04 live-turn graph).

---

## 4. Strategy spoiler false-positive

### Summary

In **Strategy mode**, the model sometimes wraps **routine boss/enemy tactics** in `bonsai-spoiler` tap-to-reveal fences when the user **already asked about that boss by name** — e.g. DRG Survivor (*"How do I beat Glyphid Dreadnought?"*). That feels like a false positive: hiding gameplay tips the user explicitly requested. Open bug in `docs/roadmap.md`; on-Deck row **STRAT-SPOIL-DRG-01** in `testing-manual.md`.

**How spoiler control works today (three layers):**

1. **Prompt policy (backend)** — `ollama_prompts.py` injects Strategy spoiler rules; for low-risk genres (bullet-heaven/survivor markers) + extracted asked-entity + KB entity match, an addendum tells the model *not* to fence routine boss guidance (`game_ai_request.py` passes genre/entity/KB signals).
2. **Model output** — model may still emit ` ```bonsai-spoiler ` fences anyway (no hard guarantee; shipped feature docs say model compliance is best-effort).
3. **Display unwrap (frontend)** — `unwrapAskedEntitySpoilerFences.ts` strips fences at render time when the fence mentions the asked entity or AppID is in a low-risk set (DRG Survivor `2321470`). Wired in `buildAnswerBubbleElement.tsx`; unit tests exist.

**Your questions:** What is best practice here? Can bonsAI **confidently** eliminate false positives, or only reduce them?

**Related planned work (not shipped):** **Spoiler confidence chip** (transparency estimate only), **user-adjustable spoiler fencing**, **unfenced spoiler feedback** thumb, **Spoiler constitution** (★★★★) — see `docs/roadmap.md` Planned and [spoiler-constitution.md](spoiler-constitution.md). Phase 4 KB track (**S1**) also calls for unfenced replies when the user named the entity. **Recon + maintainer decisions:** [04-strategy-spoiler-false-positive.md](04-strategy-spoiler-false-positive.md) §7.

### Prompt for planning agent

> **Topic:** Strategy spoiler false-positives — best practice, confidence bounds, and fix strategy.
>
> **Context:** Open bug (`docs/roadmap.md` In Progress → Bugs): *"Genre-aware spoiler policy + KB entity match (DRG Survivor boss names); verify STRAT-SPOIL-DRG-01 on Deck."* Default Strategy policy is spoiler-minimized (`strategy_spoiler_masking_enabled` in Settings). User phrase-match can opt in (`user_consents_strategy_spoilers`). The failure mode: **over-fencing** routine boss tactics the user explicitly asked about — not under-fencing story spoilers.
>
> **Canonical repro (STRAT-SPOIL-DRG-01):**
> - Game: DRG Survivor (`2321470`), KB on + seeded corpus optional.
> - Ask: *"How do I beat Glyphid Dreadnought?"* (Strategy mode, no spoiler consent phrase).
> - Pass: boss tactics visible in plain text — **no** tap-to-reveal fence for that guidance.
> - Fail: spoiler mask on content the user named.
>
> **Key code paths:**
> - `py_modules/backend/services/ollama_prompts.py` — `_strategy_spoiler_policy_block`, `_strategy_spoiler_low_risk_addendum`, `extract_strategy_asked_entity`, `kb_text_covers_asked_entity`, `_game_genres_are_low_spoiler_risk`.
> - `py_modules/backend/services/game_ai_request.py` — wires genre/entity/KB into prompt build.
> - `src/utils/unwrapAskedEntitySpoilerFences.ts` + `buildAnswerBubbleElement.tsx` — display-time unwrap.
> - `tests/test_ollama_service.py` — `test_strategy_spoiler_policy_low_risk_genre_skips_fence_for_named_boss`.
> - Streaming path: `streamMarkdownPrepare.ts`, `StreamFenceWaitChip.tsx` — incomplete spoiler fences during stream (S1 mask).
>
> **Ask:**
> 1. **Diagnose the gap:** If frontend unwrap + prompt addendum already exist, why is the bug still open? Distinguish (a) model still fences but unwrap should fix display, (b) unwrap misses cases (entity extraction, fence wording, streaming), (c) prompt not receiving genre/KB signals on Deck, (d) false alarm in QA. Rank with code evidence.
> 2. **Best-practice architecture** for spoiler systems in local-LLM assistants: prompt-only vs post-processing vs user settings vs risk scoring. Where should bonsAI sit on the **false-positive vs false-negative** tradeoff for Strategy mode?
> 3. **Confidence statement:** Can we promise *elimination* of false positives, or only *bounded reduction*? What categories are inherently unsolvable without a stronger model or human review (e.g. "is this boss name a story twist?")?
> 4. **Fix options** with ★ effort: tighten prompt addendum; expand genre/AppID allowlist; improve entity extraction (shared TS/Python); strengthen unwrap (streaming + terminal); server-side strip before UI; ship **Spoiler confidence chip** as transparency-only first. Recommend primary + fallback.
> 5. **Verification:** Extend **STRAT-SPOIL-DRG-01** matrix (other survivor titles, KB on/off, with/without consent phrase, streaming on/off). Note preview-suite coverage (`STREAM-03-strategy-spoiler`) vs on-Deck-only.
>
> **Deliverable:** Root-cause ranking, recommended approach, explicit **confidence bounds** (what we can and cannot promise users), and whether closing the bug is a prompt tweak, unwrap fix, or acceptance of residual model variance.
>
> **Out of scope:** Implementing fixes; unrelated spoiler features (confidence chip UI, user-adjustable fencing) except as they affect the recommendation.

---

## 5. Token streaming evaluation

### Summary

You want a critical review of **token streaming** — how it's built today, whether it can be improved, and what risks it carries before promoting it beyond experimental.

**What it is:** An **opt-in** Developer-tab toggle (`bonsai_token_streaming_enabled`, default off). While an Ask is pending, the Main tab can show **progressive markdown** in one live bubble instead of waiting for the full reply.

**Architecture (high level):**

1. **Backend** — Ollama `stream: true`; `ollama_service.py` reads JSON deltas; partial text stored in a thread-safe snapshot (`main.py` `_partial_stream_snapshot`); frontend polls `get_background_game_ai_status` every **150 ms** when streaming is on (vs 1200 ms otherwise).
2. **Frontend** — `useBonsaiAskOrchestration.ts` drives preview state; `useSmoothStreamReveal.ts` rate-limits display; `streamMarkdownPrepare.ts` handles incomplete markdown (spoiler mask, code-fence wait chip); terminal handoff splits into normal D-pad chunks when done.
3. **Thinking models** — `think: False` in Ollama body so reasoning doesn't eat the `num_predict` budget (documented workaround after on-Deck empty-reply evidence).

**Status:** Shipped July 2026 (live markdown). Coverage **Partial** — several preview-suite PASSes (STREAM-01…05); many on-Deck rows still **Open** (STREAM-03…10). Known interaction: streaming contributed to the **D-pad scroll viewport** bug (fixed separately). Related open bug: **soft `num_predict` + thinking budget** in `roadmap.md` affects stream quality/length.

### Prompt for planning agent

> **Topic:** Token streaming — implementation review, improvement options, and risk assessment.
>
> **Context:** Feature shipped 2026-07-15 as **Token streaming (experimental)** on Developer tab. Docs: `docs/troubleshooting.md` § Token streaming; `docs/archive/roadmap-completed.md` (live markdown ship); `docs/testing.md` row STREAM-01…10 (**Partial**). Defaults **off**; not a general-user feature yet.
>
> **Pipeline to trace:**
> - Settings: `bonsai_token_streaming_enabled` → `game_ai_request.py` (`token_stream_request_id`) → `ollama_service.py` (`stream: true`, `on_delta`, `think: False`, `num_predict` 500/900).
> - Partial text: `main.py` `_update_partial_response` / `_partial_stream_snapshot` → RPC `get_background_game_ai_status` (`partial_response`, `streaming` flags in `src/types/backgroundAsk.ts`).
> - Poll loop: `useBackgroundGameAi.ts` (150 ms vs 1200 ms).
> - Render: `useBonsaiAskOrchestration.ts` → `useSmoothStreamReveal.ts` → `streamMarkdownPrepare.ts` → `buildAnswerBubbleElement.tsx` / `StreamFenceWaitChip.tsx` → T3 terminal chunk handoff via `splitResponseIntoChunks`.
> - Scroll: `useStreamScrollPin.ts` (preserve scroll during stream).
>
> **Ask:**
> 1. **Architecture assessment:** Strengths and weaknesses of **poll-based partial_response** vs pushing tokens to the frontend (Decky events, SSE, etc.). Is the current split (background Ask executor + status poll) the right long-term shape for Steam Deck?
> 2. **Quality / UX gaps:** Evaluate smooth reveal, markdown safety (S1 spoiler mask, F2 code fence), T3 stream→chunk handoff, and coexistence with **thinking blurbs** (`bonsai_stream_tags.py`, `composeThinkingBlurb.ts`). What feels blocky or fragile on Deck?
> 3. **Improvement options** with ★ effort: faster poll cadence; push transport; simplify to plain-text stream; keep stream bubble as final layout (skip chunk split); graduate flag from Developer to Settings; default-on for Speed mode only; integrate with **soft num_predict** fix (roadmap bug).
> 4. **Risk register:** Categorize risks — spoiler leak mid-stream (STREAM-03), Stop partial overwrite (STREAM-04), layout/focus regressions (STREAM-09, historical D-PAD-SCROLL-01), dual code paths (stream on/off), RPC load on Deck, `think: False` quality tradeoff, experimental support burden. Rate severity and likelihood.
> 5. **Ship readiness:** What must pass on-Deck before removing "experimental"? Map open STREAM rows to blockers vs nice-to-have.
>
> **Deliverable:** Structured review (architecture diagram in prose), prioritized improvement list, risk table, and recommendation: **keep experimental / promote to Settings / refactor transport first / defer**.
>
> **Out of scope:** Implementing changes; thinking-blurb copy (see Q6) except where it intersects streaming UI.

---

## 6. Thinking blurbs evaluation

### Summary

While an Ask is pending, bonsAI shows one **italic thinking line** above the reply (`thinking_summary` in the UI). You want an honest evaluation of how well this works, best practice for improving it, whether bonsAI can **confidently** match the polish of Claude/ChatGPT-style “thinking” UX, and what's missing.

**How bonsAI does it today (hybrid, not true chain-of-thought):**

1. **Instant opener (client)** — `composeThinkingBlurb.ts` mirrors Python template pools so the line appears before the first status poll (witty/deadpan copy woven with question snippet + game title).
2. **Prep phases (backend)** — `format_thinking_phase()` / `_publish_thinking_phase` during real work (Proton logs, KB search, screenshot prep, model retry, etc.).
3. **Model tag (streaming)** — prompt instructs the model to emit `<bonsai-status>…</bonsai-status>` as the first line of its reply; `bonsai_stream_tags.py` extracts and strips it; shown as the thinking line until the answer streams.
4. **Fallback copy** — if the model stays silent, elapsed-time lines like *"Warming up the brain cells…"* (`deterministic_thinking_phase_fallback`).
5. **Removed path** — **tiny-model thinking blurbs** (`thinking_tiny_model_service.py`) was deleted in the D2 cleanup (2026-08-02); git history is the archive. That was a parallel small-model approach, abandoned.

**Constraints bonsAI doesn't share with Claude/ChatGPT:**

- Local Ollama on Deck — small models, uneven instruction-following.
- `think: False` on the main Ask call so reasoning doesn't eat `num_predict` (empty-reply workaround) — **no native reasoning stream** exposed to the user today.
- Poll-based status updates (150–1200 ms), not a dedicated thought channel.
- Status line is **theater + real phase labels**, not verifiable model reasoning.

**QA status:** **THINKING-01…03**, **THINKING-COPY-01** still **Open** on-Deck (`testing-manual.md`). Unit tests cover tag extraction and copy pools (`test_bonsai_stream_tags.py`, `composeThinkingBlurb.test.ts`).

### Prompt for planning agent

> **Topic:** Thinking blurbs — implementation review, best practice, confidence bounds, and gap vs Claude/ChatGPT.
>
> **Context:** Shipped incrementally Jun–Jul 2026 (`docs/archive/roadmap-completed.md`). UI: `MainTabChatTranscript.tsx` italic line while `isAsking`; state from `useBonsaiAskOrchestration.ts` ← `status.thinking_summary` on `get_background_game_ai_status` poll. Three sources merge: client `composeThinkingBlurb`, backend `compose_thinking_blurb` / `format_thinking_phase` (`bonsai_stream_tags.py`), model `<bonsai-status>` (`extract_bonsai_status`, prompt in `ollama_prompts.py` `BONSAI_STATUS_STREAM_INSTRUCTION`). Lazy-opener sanitization on both sides (`_LAZY_THINKING_OPENER_RE`). Tiny-model parallel blurbs **removed** (`thinking_tiny_model_service.py`, D2). Related future work: **Thinking effort control** + **soft num_predict** bug (`roadmap.md`) would re-enable Ollama `think` with a separate budget — distinct from blurbs but affects perceived “depth.”
>
> **User-facing goal:** A thinking line that feels **responsive, specific to the Ask, and trustworthy** — not generic, repetitive, or obviously fake — comparable in *feel* to commercial assistants' thinking indicators (without claiming access to their proprietary stacks).
>
> **Ask:**
> 1. **Implementation review:** Map the lifecycle (submit → instant opener → phase updates → model tag → stream coexistence per THINKING-03 → clear on complete). What works well? What is fragile (poll latency, duplicate TS/Python pools, tag parse failures, strategy spoiler constraints on status lines)?
> 2. **Best practice** for local-LLM “thinking UX” without a dedicated reasoning API: template phases vs model-emitted status vs small sidecar model vs showing real tool steps (KB retrieve, log attach). Where should bonsAI invest?
> 3. **Claude / ChatGPT gap analysis** (architecture-level, no insider claims): What do commercial products likely do (separate reasoning channel, larger models, server-side orchestration, curated UI) that bonsAI **cannot** replicate on-Deck? What **can** be replicated (phase honesty, snippet weaving, faster updates)?
> 4. **Confidence bounds:** Can we promise thinking blurbs that are always witty, always specific, and never generic? Or only **bounded improvement** with residual model variance? When is “good enough” honest for a FOSS Deck plugin?
> 5. **Fix / roadmap options** with ★ effort: tighten `<bonsai-status>` compliance; unify TS/Python copy generation; show **real pipeline steps only** (drop faux wit); restore tiny-model path vs never; wire **Thinking effort control** to a separate visible channel; simplify to plain phase strings. Recommend primary direction.
> 6. **Verification:** Map to **THINKING-01…03**, **THINKING-COPY-01**; suggest prompt fixtures or preview scenarios if automatable.
>
> **Deliverable:** Honest assessment (strengths/weaknesses), recommended architecture direction, confidence statement for users/maintainers, and explicit note on whether reviving tiny-model blurbs is worth reconsidering post-D2.
>
> **Out of scope:** Implementing copy changes; full **Thinking effort control** design (touch only as it relates to blurbs); token streaming markdown (Q5).

---

## 7. Named chat slots

### Summary

You want **multiple labeled conversations** (e.g. “Elden Ring build”, “Network debug”) without the cluttered UI that sank the first attempt — and you want to understand **what went wrong** before designing a redo.

**What existed (Jul 2026, removed next day):**

- Full implementation in commit `247a9c9` (“Named chat slots”), removed in `58089df` / `8ace7c0`.
- **Backend:** `chat_threads_service.py` — up to 50 threads under `~/homebrew/settings/bonsAI/chat_threads/` (`index.json` + per-thread JSON); optional Desktop mirror `~/Desktop/bonsAI_chats/<id>/`.
- **UI:** `ChatThreadsMiniList` (5 recent threads + **All chats…** button) + `ChatThreadsModal` fullscreen picker; `ChatThreadAppIdBanner` for game mismatch.
- **Wiring:** Heavy changes to `index.tsx`, `useBonsaiAskOrchestration.ts`, `useChatThreads.ts`, Settings (idle timeout), desktop autosave per thread, strategy checklist per thread.

**Why it was pulled (documented + inferred):**

- Roadmap: **“seriously bugged”** — **persistence / picker / overwrite** behavior.
- **UI rejected:** mini-list + fullscreen picker called out as needing **redesign before re-ship**.
- **Complexity:** CHAT-SLOTS-01…08 in old `testing.md` shows edge cases — mid-Ask thread switch, idle TTL clearing Main but keeping threads, AppID mismatch, 51st-thread prune, D-pad graph in mini-list + picker, Reset session cache vs saved threads. Hard to get right in one pass.

**What exists today instead:**

- **One in-memory session** — accordion turns in `useBonsaiAskOrchestration` (`askThreadCollapsed`); **not persisted across plugin reload** (`bonsaiUi.ts`).
- **Modal survival only** — `bonsaiSessionSurvival.ts` restores Ask state across `showModal` remounts, not named slots.
- **Reset session cache** — clears RAM thread; does not touch `settings.json`.
- Leftover `chat_threads/` folders on disk are **ignored** (`docs/troubleshooting.md`).

**Your constraint:** clean UI — no repeat of a busy mini-list above the Ask bar.

**Roadmap:** ★★★★★ Planned — **redesign only**; depends on **unified Ask state machine** (D3 refactor still in progress per `roadmap.md`).

### Prompt for planning agent

> **Topic:** Named chat slots — post-mortem, clean redesign, minimal UI.
>
> **Context:** Prior ship removed Jul 2026. Recovery sources: `git show 247a9c9` (add) and `8ace7c0` (remove) for `chat_threads_service.py`, `ChatThreadsMiniList.tsx`, `ChatThreadsModal.tsx`, `useChatThreads.ts`; `docs/roadmap.md` Planned § **Named chat slots**; leftover paths in `docs/troubleshooting.md`. Current thread model: in-memory accordion only (`AskThreadCollapsedTurn`, `useBonsaiAskOrchestration.ts`). User explicitly **does not want a cluttered Main tab**.
>
> **Ask:**
> 1. **Post-mortem:** From the removed code and CHAT-SLOTS-01…08 scenarios (recoverable from `git show 247a9c9:docs/testing.md`), list the most likely **root causes** of persistence/picker/overwrite bugs and UI clutter. What architectural mistakes should a redesign avoid?
> 2. **UI options (minimal clutter):** Compare patterns — e.g. (A) threads only in Settings / Developer, (B) single **All chats…** entry with no mini-list, (C) LB/RB-style slot carousel, (D) auto-save silent slots with rename-on-demand, (E) game-scoped default slot. Rank for Deck D-pad + QAM width. Reference proven pickers: `PullModelsModal`, `CharacterPickerModal`, `ModelRoutingOrderModal` (and their focus-graph lessons).
> 3. **Data model:** Reuse vs replace `chat_threads_service` shape (`index.json`, per-thread turns, strategy checklist scoping, Desktop mirror). Where should persistence live relative to `settings.json`, `bonsaiSessionSurvival`, and optional Desktop daily log?
> 4. **State-machine dependency:** What must land in **D3** (`useBonsaiAskOrchestration` / `index.tsx` extraction) before slots are safe to build? Can slots be a thin layer over extracted session state?
> 5. **Scope cut for v2:** Minimum viable slots (e.g. 3–5 named threads, no Desktop mirror, no idle TTL) vs full prior feature set. ★ effort per slice.
> 6. **Verification:** Propose a slim test matrix (unit + on-Deck D-pad) learning from CHAT-SLOTS-01…08 — fewer rows, higher signal.
>
> **Deliverable:** Recommended redesign (UI sketch in prose + data flow), explicit **“do not repeat”** list from v1, dependency on D3, and phased ship plan. Address user goal: **multiple labeled threads without visual clutter on Main**.
>
> **Out of scope:** Implementing slots; cross-device sync; cloud backup.

---

## 8. Kids master lock feasibility

### Summary

You want a **research-only** assessment of **Kids master lock** — whether bonsAI can detect a Steam parental / restricted kids account and automatically lock down risky capabilities.

**What the roadmap says today:**

- ★★★★★ **Planned (long-term):** When Steam reports a **restricted kids account**, disable plugin capabilities (not a user toggle — a **global lock above** the Permission Center).
- **Depends on:** Shipped **Capability Permission Center** (`capabilities.py` + `PermissionsTab.tsx`) **and** a **detectable Steam signal** — neither the signal nor the lock exists in code yet.
- **Tied to Web permission:** Discovery locked 2026-07-30 — **Kids Master Lock forces Web off** (cannot enable live search when lock is active).
- **Legal/UX sensitivity:** Needs a reliable Steam signal; UI must **not overclaim** enforcement.

**What bonsAI gates today (for context):**

- Permissions toggle: filesystem writes, game/screenshot context, Steam Web API (VAC), microphone.
- **Not gated:** Basic Ask to Ollama, opening docs/GitHub/Steam links, TDP suggestions (read-only).
- Backend enforces via `capability_enabled()` in `main.py`; frontend shows toasts on deny.

**Open unknown:** Does Steam expose “family / parental restricted” to Decky plugins via `SteamClient` or another CEF API on Steam Deck? No spike doc or prototype exists in-repo.

### Prompt for planning agent

> **Topic:** Kids master lock — feasibility research (Steam signal + enforcement model).
>
> **Context:** Planned item in `docs/roadmap.md` (★★★★★): *"Disable plugin capabilities when Steam reports a restricted kids account."* Appendix dependency: `KidsMasterLock` → Capability Permission Center; forces off future **Web permission**. Policy: `bonsai://policy/permissions-safety` (capability-scoped consent, default deny for privileged actions). No implementation in `src/` or `main.py` today.
>
> **Research goals (feasibility only — no code):**
> 1. **Steam / SteamOS signal:** What APIs or account flags exist for Family View, parental controls, or “restricted” child accounts on Steam Deck (CEF `SteamClient`, Steamworks, OS-level, or none)? Document what Decky plugins can and cannot read. Cite public Steam/Decky docs or prior art in other plugins if found. If signal is **unavailable or unreliable**, state that clearly.
> 2. **Enforcement scope:** What should Kids Lock disable?
>    - (A) All privileged capabilities only (match current `CAPABILITY_KEYS`),
>    - (B) Ask entirely,
>    - (C) Ask allowed but model policy restricted (e.g. Tier 1 only),
>    - (D) Block Web/mic/filesystem but allow offline KB + local Ollama.
>    Recommend a v1 scope aligned with roadmap wording and FOSS/self-hosted stance.
> 3. **Architecture:** Where would lock state live (runtime probe vs cached in `settings.json`)? How does it interact with user toggles in Permissions (override impossible? greyed UI?)? How does backend `capability_enabled()` gain a `kids_lock_active` guard?
> 4. **UX / legal:** Copy constraints — “best effort”, “when Steam reports…”, no promise of content filtering on model output. What must Permissions tab say?
> 5. **Dependencies:** Blockers for **Web permission** ship; testing matrix (mock restricted account? family test account?).
> 6. **Alternatives if no API:** Manual “Kids mode” toggle in Settings (parent PIN), or defer feature entirely.
>
> **Deliverable:** Go/no-go recommendation with confidence level, recommended v1 scope if go, spike steps (on-Deck experiments), and explicit **“cannot promise X”** list for README/troubleshooting. ★ effort estimate for implementation phase (separate from this research).
>
> **Out of scope:** Implementing lock; content moderation of LLM replies; Steam account creation flows.

---

## 9. Steam Frame companion UX feasibility

### Summary

You want **research-only** feasibility for **Steam Frame companion UX** — how bonsAI could help when someone is in VR on Steam Frame, likely via a **second device** (Deck on LAN, phone, etc.) rather than inside the HMD overlay.

**What the roadmap says:**

- ★★★★★★ **Planned (long-term):** Research-first companion workflows; comfort / framerate / wrong-display **disclaimers**.
- **Not in scope for v1:** A full **VR overlay inside Frame**.
- Related but separate: **Remote Play diagnostics layer** (streaming host/client latency in answers).

**What exists in bonsAI today (partial building blocks):**

- **LAN Ollama** — Ask from Deck/PC on the same network (`Ollama` tab, mDNS); a companion device could use the same pattern.
- **UI scale “Immersive” profile** — dev-only placeholder for large close-range displays (`uiScaleProfile.ts`: `SHOW_IMMERSIVE_UI_SCALE = false`; comment: “Steam Frame proxy”).
- **KB compat stubs** — thin `steam_frame` tips in shared troubleshooting corpus (`scripts/gen_compat_patterns.py`: companion Deck/phone on LAN; comfort; wrong display target; “research-phase — verify Valve docs”).
- **Decky QAM plugin** — bonsAI runs in Steam’s **gamepadui** layer on Deck/BPM; **no Frame-specific runtime or APIs** in `src/` today.

**Core unknowns:** What is Steam Frame’s software stack, companion-app story, and whether Decky/plugins can run on Frame, on a paired Deck, or only via a separate browser/CEF surface.

### Prompt for planning agent

> **Topic:** Steam Frame companion UX — feasibility research and v1 workflow options.
>
> **Context:** Planned item `docs/roadmap.md` (★★★★★★): *"Research-first companion workflows for Steam Frame; comfort/framerate/wrong-display disclaimers."* Explicit **not in scope:** full VR overlay in Frame v1. In-repo hints only: Immersive UI-scale profile (disabled), KB compat tip stubs (`steam_frame`), LAN Ollama already documented for multi-device homes. bonsAI is a **Decky Loader QAM plugin** — validate whether that model even applies to Frame hardware.
>
> **Research goals (no implementation):**
> 1. **Platform reality check:** Summarize public Steam Frame / SteamVR / companion-device expectations (hardware role, OS, second-screen behavior). What can run bonsAI today (Deck with game running on Frame? Phone browser? Frame native UI?) — cite Valve or credible sources; mark **UNKNOWN** where docs are thin.
> 2. **Companion workflows:** Sketch 2–3 user stories, e.g. (A) HMD in-game + **Deck on LAN** open to bonsAI QAM for strategy Ask, (B) phone/tablet web UI (if any), (C) voice-only hands-free via wake-word on Deck. Which fit bonsAI’s **existing** architecture vs need new surfaces?
> 3. **Technical dependencies:** Decky on companion device, LAN `http://<PC>:11434`, screenshot attach from VR (likely hard), Remote Play / streaming context (tie to separate roadmap item), UI scale Immersive profile, compat KB tips. Blockers ranked.
> 4. **UX / safety disclaimers:** Comfort, motion sickness, framerate, wrong-display mirroring — what copy belongs in README, Ask replies, or KB tips (align with existing stub lines in `gen_compat_patterns.py`).
> 5. **Phased recommendation:** Research spike deliverable (`docs/archive/spikes/steam-frame-companion.md`?), minimum v1 (docs + compat tips only?) vs medium (Immersive UI scale QA) vs long (dedicated companion mode). ★ effort per phase.
> 6. **Go/no-go:** Is this a bonsAI product fit, or better left to generic LAN Ollama + Deck docs without Frame-specific work?
>
> **Deliverable:** Feasibility memo outline, recommended v1 scope (likely docs/KB + disclaimers per roadmap), dependency list, and explicit **out of scope** for Frame v1 (overlay, native Frame app).
>
> **Out of scope:** Building Frame overlay; Remote Play packet diagnostics (separate roadmap item); FEX-Emu paths except as KB context.

---

## 10. Wake-word listening feasibility and cost

### Summary

You want **research-only** feasibility and **Deck cost** (CPU, battery, thermal, UX) for **wake-word listening** — saying **“bonsAI”** to trigger voice input and a **quiet background Ask** without pressing the mic button.

**What the roadmap says:**

- ★★★★★ **Planned (long-term):** Opt-in **always-on local** wake on fixed keyword **“bonsAI”** → STT → quiet Ask.
- **New capability** + existing **microphone** permission; **ConfirmModal** on enable.
- **Depends on (shipped):** Whisper voice Ask, **Reply ready toast**, **Voice STT session daemon** (`whisper-server` on `127.0.0.1:18765`).
- **Not v1:** Custom wake phrases; **always-on full Whisper**; cloud STT; **auto-open QAM** on wake (user gets toast instead).

**What exists today:**

- **Push-to-talk mic** — user holds/taps mic; `voice_transcription_service.py` captures PCM, RMS gate, rolling window decode via `whisper-server` or CLI fallback. **4 whisper threads** while recording; known game CPU contention (`docs/archive/voice-input-follow-up.md`).
- **No wake-word detector** — `voice_transcription_service.py` and `voice_whisper_daemon.py` explicitly say wake-word is **not** implemented; daemon comment: “future wake-word STT.”
- **Background Ask + toast** — completed Ask can notify via **Reply ready** when QAM is closed (`bonsaiReplyReadyToast.ts`).

**Cost intuition:** Always-on listening is fundamentally different from **session-scoped** mic STT — continuous audio + detection even during gameplay. Full Whisper on every window is likely prohibitive on Deck (roadmap agrees).

### Prompt for planning agent

> **Topic:** Wake-word listening — feasibility, Deck resource cost, and v1 architecture.
>
> **Context:** Planned `docs/roadmap.md` (★★★★★): fixed keyword **“bonsAI”** → local STT → quiet Ask; opt-in capability + ConfirmModal; depends on shipped voice stack + reply-ready toast. **Not v1:** custom phrases, always-on full Whisper, cloud STT, auto-open QAM. Current voice pipeline: `voice_transcription_service.py`, `voice_whisper_daemon.py`, `useVoiceTranscription.ts`; background Ask: `useBackgroundGameAi.ts`, `bonsaiAskCompletionWatch.ts`. Distinct from **Local reply TTS** (output, not input).
>
> **Research goals:**
> 1. **Detection options (local/FOSS):** Compare approaches for Deck — e.g. lightweight **keyword spotting** (openWakeWord, vosk-kws, whisper.cpp on short low-duty cycles, silero, custom). Map each to CPU %, latency, false accept/reject, and install size. Explicitly rule out or justify **always-on full Whisper** (roadmap excludes it).
> 2. **Deck cost model:** Estimate impact while **gaming** — mic capture always on, whisper-server idle vs periodic wake passes, interaction with `WHISPER_THREADS=4`, battery drain, thermal throttling. Reference existing voice tuning tradeoffs (`TRANSCRIBE_INTERVAL_S`, session daemon). What duty cycle is acceptable?
> 3. **Lifecycle / platform:** Can a Decky plugin keep listening when QAM is closed? `plugin_loader` background behavior, suspend/resume, Gaming Mode vs BPM. Does wake require a persistent Python thread / PipeWire stream?
> 4. **Product flow:** Wire diagram: wake detected → start STT session → utterance end → submit **background Ask** → **Reply ready toast** (no QAM open). Gaps vs current mic-button path (`start_voice_transcription` uses raw unbounded `call()`). New RPCs or reuse?
> 5. **Safety / consent:** New `capabilities` key? Relationship to `microphone_access`. ConfirmModal copy. False wakes during multiplayer voice chat. Kids lock interaction (future).
> 6. **Go/no-go + v1 scope:** Minimum shippable slice (fixed “bonsAI”, push-to-enable session vs true always-on). ★ effort. Alternatives: Steam Input chord only (already documented), hold-to-talk only.
>
> **Deliverable:** Feasibility memo with **cost table** (idle vs active vs false-wake rate), recommended detection stack, explicit **battery/thermal risks**, and phased plan. State what bonsAI can **confidently** promise vs best-effort beta.
>
> **Out of scope:** Implementation; custom wake words; cloud STT; TTS read-aloud.

---

## 11. Native QAM shortcut tile / decouple from Decky

### Summary

You want **research-only** answers to two related questions: Can bonsAI get its **own QAM left-rail tile** (not buried under Decky → plugin list)? And how feasible is **decoupling bonsAI from Decky Loader** altogether?

**Current entry path:** QAM (`...`) → **Decky** row → plugin list → **bonsAI** (3+ steps; counts vary by rail order and plugin list position — `docs/troubleshooting.md` §5).

**What docs already say:**

- **Cannot self-register a QAM tile today** — `troubleshooting.md`: *"Decky Loader acts as a secure container for plugins, we cannot force a custom QAM tile for bonsAI."*
- **Roadmap (★★★★★★):** **Native QAM shortcut tile** — separate rail entry **beneath** Decky Loader icon; requires **upstream Steam/Decky support**; `plugin.json` alone is **not** enough.
- **Not in scope:** Forked Steam client or undocumented UI injection as default.
- **Workaround shipped:** Guide-chord Steam Input macro (`bonsai:shortcut-setup-deck`); archived as **power-user only**, not casual priority — refresh if native tile lands.

**How bonsAI is coupled to Decky today:**

- `definePlugin` export in `src/index.tsx` (`@decky/api`, `@decky/ui`).
- Python `main.py` loaded by **Decky plugin_loader** (RPC via `call()`).
- UI runs in Steam **gamepadui** CEF (QAM overlay) — not a standalone app.
- `plugin.json`: `api_version: 1`, empty `flags` — no QAM-registration hook visible.

### Prompt for planning agent

> **Topic:** Native QAM shortcut tile + Decky decoupling — feasibility research only.
>
> **Context:** Planned `docs/roadmap.md` (★★★★★★ **Native QAM shortcut tile**): sibling QAM entry under Decky; upstream-dependent. User also asks about **decoupling** bonsAI from Decky Plugin. Current install model: Decky Loader plugin zip. Architecture: `CLAUDE.md` / `AGENTS.md` — TS React UI + Python RPC in one plugin package. Power-user path: `troubleshooting.md` §5 (Steam Input macro). Magic Ask: `bonsai:shortcut-setup-deck`.
>
> **Research goals:**
> 1. **Dedicated QAM entry:** Survey **Decky Loader**, **SteamOS**, and **Steam client** extension points (public docs, Decky issues/PRs, other plugins). Can a third-party plugin register a **left-rail QAM shortcut** without Decky core changes? What would **Decky upstream** need to ship (API, manifest flag, loader change)? Likelihood and maintainer burden.
> 2. **Decouple meanings — clarify options:**
>    - (A) **Stay Decky plugin** but better discoverability (native tile, pinned order, Decky “favorite plugin”).
>    - (B) **Split package** — UI still in QAM via Decky, backend as system service (still depends on Decky for panel).
>    - (C) **Standalone app** — separate SteamOS/desktop binary, own window, no `plugin_loader`.
>    - (D) **Steam “shortcut” / non-Decky integration** (if any official path exists).
>    For each: feasibility, what breaks (`Router.MainRunningApp`, `call()` RPC, QAM focus, deploy zip), ★ effort.
> 3. **Why Decky today:** List concrete dependencies bonsAI has on Decky (`@decky/api` RPC, `Navigation`/`Tabs`, `toaster`, `useQuickAccessVisible`, gamepadui CSS). What would a decoupled v1 still need from Steam?
> 4. **Risks / policy:** Security model of QAM plugins; Valve ToS; why “undocumented injection” is roadmap out-of-scope. FOSS / transparency angle for upstream proposal vs fork.
> 5. **Recommendation:** Research memo outline for `docs/planning/11-native-qam-tile-feasibility.md` — **pursue upstream Decky feature** vs **accept Decky hub** vs **invest in macro docs only**. Realistic timeline (blocked on Valve/Decky vs bonsAI-only work).
>
> **Deliverable:** Feasibility matrix (QAM tile vs partial decouple vs full standalone), upstream ask template (what to request from Decky/Valve), and honest answer: **is full decoupling realistic** for a self-hosted AI QAM tool on Steam Deck?
>
> **Out of scope:** Implementing tile or fork; shipping undocumented Steam patches; replacing Decky Loader in bonsAI install docs without upstream path.

---

## 12. Deep mod AI hints feasibility

### Summary

You want **research-only** feasibility for **Deep mod AI hints** — bonsAI detecting mod frameworks / install layout and giving **mod-aware troubleshooting or setup guidance** on Steam Deck (install paths, Proton `compatdata`, game library folders).

**What the roadmap says:**

- ★★★★★★ **Planned:** Detect mod frameworks/files; **mod-aware AI guidance**.
- Subtitle in roadmap: **install paths + compatdata**.
- **Not in scope:** Downloading or installing mods automatically.
- **Risk:** Broad filesystem scans + false-positive mod guidance create support/safety load; detection must **not imply endorsement** or auto-install.

**What exists today (adjacent, not mod-specific):**

- **Proton log attachment (shipped):** troubleshooting Asks with AppID can attach bounded `~/steam-<appid>.log` and **shallow** `steamapps/compatdata/<appid>/*.log` only — **no `pfx/` walk**, no game-folder scan (`proton_troubleshooting_logs.py`; `docs/troubleshooting.md` § Proton logs).
- **Permissions:** `steam_logs_read` + `media_library_access` = **Read game & screenshot context** (`PermissionsTab.tsx`); no capability for reading `steamapps/common/<game>/` or mod manifests.
- **Game context in Ask:** running AppID/title, optional screenshots (`screenshot_media.py`), VDF layout hint from screenshot metadata, KB genre lookup for Strategy spoiler risk (`lookup_game_genres`).
- **Compat KB:** `data/kb/compat_patterns.json` has Proton/Deck tips (compatdata, shader cache, Heroic/Lutris path caveat) — **no mod-framework cards** today.
- **No mod code:** zero references to BepInEx, MelonLoader, SMAPI, Vortex, Workshop, Nexus, etc. in `src/` or `py_modules/`.

**Core unknowns:** Where mods live per title (native Linux vs Proton prefix vs Workshop vs external launcher), what can be detected safely with allowlisted paths, and how to keep AI hints honest when detection is uncertain.

### Prompt for planning agent

> **Topic:** Deep mod AI hints — feasibility research only (install paths + compatdata).
>
> **Context:** Planned `docs/roadmap.md` (★★★★★★): detect mod frameworks/files; mod-aware AI guidance; **not in scope:** auto download/install. High false-positive / wrong-mod-advice risk. Existing filesystem access is **narrow**: Proton/Steam log tails with path allowlisting (`proton_troubleshooting_logs.py`), screenshot discovery under Steam userdata, `appmanifest_*.acf` for metadata (`screenshot_media.py`). Capability model: `permissions-safety` policy — new reads need explicit opt-in. Related lower-tier items: **Steam Input layout parse** (VDF → context), **Web permission** (live patch/mod news), **RAG Phase 8** catalog corpus.
>
> **Research goals:**
> 1. **Mod landscape on Deck:** Map common patterns — Steam Workshop, manual `steamapps/common/<game>/`, Proton `compatdata/<appid>/pfx/drive_c/...`, SD-card libraries, Heroic/Lutris (outside Steam compatdata per compat KB). For 3–5 exemplar games (e.g. Skyrim SE, Stardew + SMAPI, Unity + BepInEx, non-Steam), document **detectable on-disk markers** (folder names, DLLs, config files, launch options) and **false-positive traps**.
> 2. **Detection tiers:** Propose phased approaches with ★ effort and permission needs:
>    - (A) **Prompt-only** — user says “mods” / “BepInEx”; no filesystem scan.
>    - (B) **Shallow scan** — extend current compatdata direct-child pattern or read `libraryfolders.vdf` + `appmanifest` only.
>    - (C) **Deep scan** — bounded walk of game install dir + Proton prefix (new capability? size/time limits?).
>    - (D) **KB/RAG** — offline mod-troubleshooting cards per AppID (Phase 8 corpus); no live scan.
>    For each: what Ask modes benefit (troubleshooting vs strategy), and what **cannot** be inferred reliably.
> 3. **Permissions & safety:** Does this need a new Capability Permission Center toggle (e.g. “Read game install folders”)? Reuse `steam_logs_read` or split? Path allowlist design mirroring `path_allowed_for_proton_log` — symlink escape, SD paths, max bytes/files. Copy requirements: “detected” vs “suspected”, no endorsement, no auto-install (roadmap sacred).
> 4. **AI guidance quality:** How to inject mod context into prompts (`game_ai_request.py` / `ollama_prompts.py`) without hallucinating load order, compatibility, or AC (EAC/VAC) interactions. Tie to **Input sanitizer** / bad-advice guardrails (`ai_character_service.py` already warns against reckless compatdata deletes). Confidence labeling in Show details?
> 5. **Risks:** Support load from wrong mod advice, scan performance on Deck during gameplay, legal (Nexus/Workshop ToS for automated reads). Minimum viable v1 that is **net trust-positive**.
> 6. **Dependencies & sequencing:** What must ship first (Web permission for live mod patch notes? RAG corpus? Steam Input parse?)? Realistic ★★★★★★ timeline vs descope to ★★ doc-only mod tips in compat KB.
>
> **Deliverable:** Feasibility memo outline (`docs/archive/spikes/deep-mod-ai-hints.md`), recommended v1 scope (likely tier A or D only), permission/capability spec sketch, exemplar detection table for 5 games, and **go/no-go** with explicit “bonsAI will not claim X” list for README/troubleshooting.
>
> **Out of scope:** Implementing scanner or UI; downloading/installing mods; editing game files or launch options; VAC ban automation; full “port configuration manager” unless research proves it belongs in the same epic.

---

## 13. Feature ideas for roadmap.md (star-rated)

### Summary

You want **new feature ideas** to add to `docs/roadmap.md` — not answers yet, but a curated backlog proposal for a future planning session.

**Deliverable shape:** **2–3 ideas per star band:**

| Band | GTA scale (per `roadmap.md`) |
|------|------------------------------|
| **Low** | ★ – ★★ |
| **Mid** | ★★★ – ★★★★ |
| **High** | ★★★★★ – ★★★★★★ |

**How the roadmap works today:**

- Stars = **effort/risk**, not user value. `★` easiest … `★★★★★` very high; `★★★★★★` extreme scope or upstream-gated.
- **Horizons:** Backlog grouped by theme (Ask/reply, Focus/Deck UI, Knowledge base, Permissions/safety, Platform/upstream); sorted ascending by ★ within each lane.
- **Planned bullet format:** Short **noun-first** title (3–6 words) + optional parenthetical; then **Goal**, **Depends on**, **Not in scope**, **Status** when relevant.
- **Bugs** = open defects; on-Deck confirmation under **Verify**; shipped work in `docs/archive/roadmap-completed.md`.
- **Do not duplicate** what is already Planned (spoiler chip chain, RAG Phases 4–8, Web permission, named chat slots, wake-word, deep mod hints, native QAM tile, etc.) — see full [Planned](../roadmap.md#planned) section.

**Ground ideas in real gaps:** D3 entry-point split **complete** — `index.tsx` closed step 8 at 1291 lines and is ~1308 today; the deferred follow-ups per **D9** are `useBonsaiAskOrchestration.ts` (~1260 lines) and `MainTab.tsx` (187, pure prop-threading tax); open bugs (soft `num_predict`, KB phrase gate, LB/RB flicker); permission model (`capabilities.py`); shipped building blocks (session RAG chips, Proton log attach, voice STT, reply-ready toast, transparency ladder).

### Prompt for planning agent

> **Topic:** Propose new **Planned** feature ideas for `docs/roadmap.md` — 2–3 per star band, grounded in the repo.
>
> **Context:** bonsAI is a Decky Loader QAM plugin: local/LAN Ollama Ask, Strategy mode, offline KB/RAG, Permissions Center, voice STT, character roleplay. Read `docs/roadmap.md` (Planned, Bugs, Appendix dependencies), `docs/archive/roadmap-completed.md` (what already shipped), and `CLAUDE.md` / `REFACTOR-PLAN.md` for architecture constraints. Star scale and horizon rules are in `roadmap.md` § Planned intro.
>
> **Ask:**
> 1. **Inventory first (brief):** List 5–8 **product gaps or user jobs** the current roadmap under-serves — cite evidence (missing RPC, UX friction, docs, competitor parity, maintainer pain). Do **not** repeat items already in Planned or In Progress Bugs.
> 2. **Propose 2–3 features at ★–★★** — small, shippable polish or content; likely **Near-term**. Examples of the *kind* of idea (not prescriptions): preset/copy refresh, single-setting UX win, small transparency chip, doc-adjacent Magic Ask — but **your** ideas must be novel vs existing Planned rows.
> 3. **Propose 2–3 at ★★★–★★★★** — medium features inside plugin + user-hosted stack; may include **research spikes** with clear go/no-go. Respect dependencies (e.g. Web permission, RAG Phase 4, D3 state machine).
> 4. **Propose 2–3 at ★★★★★–★★★★★★** — large or upstream-gated; honest about blockers. Reserve ★★★★★★ for extreme scope only.
> 5. For **each** idea (9 total max), output a **roadmap-ready stub:**
>    - Title line with stars + parenthetical
>    - **Goal** (one sentence user job)
>    - **Depends on** (shipped or Planned ids)
>    - **Not in scope** (v1 guardrails)
>    - **Horizon** (Near / Medium / Long)
>    - **Why now** (1 line — ties to codebase gap or user pain)
>    - **★ justification** (effort/risk factors: UI surface, permissions, on-Deck QA, refactor coupling)
> 6. **Prioritize:** Rank top 3 across all bands for the next quarter assuming maintainer is mid-D3 refactor + RAG remediation — what is worth a new Planned row vs “just fix the bug”?
>
> **Constraints:**
> - FOSS / local-first bias; new privileged reads need Permission Center story.
> - New Settings/QAM controls imply D-pad focus-graph work (`.cursor/rules/decky-focus-graph.mdc`).
> - Prefer ideas that **reuse** shipped subsystems (KB, Proton logs, session chips, voice, transparency) over greenfield platforms.
> - Flag any idea that duplicates or should merge into an **existing** Planned bullet instead of a new row.
>
> **Deliverable:** Nine (or fewer) roadmap stubs + top-3 priority list + short “do not add” list (ideas that are really bugfixes or already covered).
>
> **Out of scope:** Implementing features; re-rating existing Planned items; removing current roadmap rows; answering the other 12 planning questions in this file.
