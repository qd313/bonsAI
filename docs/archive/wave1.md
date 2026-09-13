# Wave 1 integration report (2026-08-07)

Four parallel implementation workers landed in the shared workspace. This report records integration inspection, automated verification, and outstanding on-Deck QA.

## Scope

| ID | Item | Type | Commit |
|----|------|------|--------|
| A | Thinking blurb emoji styling | Bug fix | `e05637c` |
| B | Voice ready / reinstall affordance | Bug fix | `e4fb6fa` |
| D | Bonsai icon trunk/pot geometry | Bug fix | `8469f14` |
| L | Preset chip expansion (four prompts) | Incremental content ship | `c1fe1e7` |
| — | Docs (this report + roadmap/testing) | Docs | `68f2ae7` |

No shared files between items — clean composition, no integration defects found.

## Per-item implementation

### A — Thinking blurb emoji styling (`e05637c`)

**Problem:** Parent-row `fontStyle: italic` on the live Ask thinking line slanted emoji-only and inline-emoji blurbs.

**Files:**
- `src/components/MainTabChatTranscript.tsx` — removes row-level italic; adds `role="status"`; renders via `buildThinkingBlurbTextElement`
- `src/utils/splitThinkingBlurbItalicSegments.ts` — splits prose vs emoji grapheme clusters
- `src/utils/buildThinkingBlurbTextElement.tsx` — per-segment italic spans

**Tests:** `src/utils/splitThinkingBlurbItalicSegments.test.ts` (5 tests)

**On-Deck QA:** **THINKING-EMOJI-01** — emoji-only and mixed emoji/prose blurbs during a live Ask.

### B — Voice ready / reinstall (`e4fb6fa`)

**Problem (as reported):** the Voice input install action still reads as something to press once the engine is installed.

**The stated cause was wrong — corrected 2026-08-07 during review.** This report originally said the
UI showed **Install voice engine** "even when `binary_ready` and `model_ready` were both true",
implying the aggregate `ready` flag disagreed with the two component flags. It cannot: `ready` is
*defined* as `whisper_bin is not None and model_ready`
([voice_transcription_service.py:1170](../py_modules/backend/services/voice_transcription_service.py)),
and `get_voice_engine_status` returns it unchanged ([main.py:2611](../main.py)). The three values are
the same by construction, so no divergence between them can have produced the report. The old code
disabled the button and labelled it *Voice engine ready* when installed — the opposite of an enabled
Install action.

**What actually shipped, and it is worth keeping:** the installed state is now an explicit
**Reinstall voice engine** affordance rather than a disabled dead control — enabled button, ready
copy above it. That is a real improvement to a state that previously offered no way to repair a
broken install. But the underlying report was never root-caused, so if the symptom recurs on device,
**do not look at the readiness flags again** — look at whether `engineStatus` is populated at all
(`refreshStatus` swallows RPC failures into `setEngineStatus(null)`, which renders exactly the
"not installed, press to install" state regardless of what is on disk).

**Consequence to watch:** the button is now enabled unconditionally, so one **A** press on a focused
control starts a podman pull plus model download with no confirm step.

**Files:**
- `src/components/VoiceInputSettingsSection.tsx` — `engineReady = binaryReady && modelReady`; ready message; **Reinstall voice engine** label; button stays enabled when ready

**Tests:** `src/components/VoiceInputSettingsSection.test.tsx` (6 tests)

**On-Deck QA:** **VOICE-REINSTALL-01** — label, ready copy, D-pad to the button, reinstall still invokes install RPC.

**Focus graph:** One existing button in an existing `PanelSection` — no new focus owner.

### D — Bonsai icon geometry (`8469f14`)

**Problem:** Trunk/pot path centered at x=12.0 while canopy bbox center is 11.5 (both `BonsaiTreeTabIcon` and `BonsaiSvgIcon`).

**Files:**
- `src/components/icons.tsx` — trunk/pot path shifted 0.5 user units left in both icons

**Tests:** `src/components/icons.bonsaiGeometry.test.tsx` (2 tests) — geometry guard on shared path constant

**On-Deck QA:** **BONSAI-ICON-GEOM-01** — tab strip icon (36px) and plugin-list icon (26px); watch for whole glyph appearing half-unit left and canopy ink asymmetry (canopy lobes are internally asymmetric).

### L — Preset chip expansion (`c1fe1e7`)

**Shipped prompts** (`src/data/presets.ts`):
- `How do I use Find LAN on the Ollama tab?` (ollama)
- `How do I bind a BonsAI quick-launch chord?` (controls)
- `How do I enable token streaming?` (general, `beta: true`)
- `What should I expect while answers stream in?` (general, `beta: true`)

**Category keywords added:** `chord`, `quick-launch` (controls); `token streaming`, `stream in` (general).

**Tests:** `src/data/presets.test.ts` — four new `detectPromptCategory` cases (7 tests total in file)

**Trap avoided:** `detectPromptCategory` strips `` ` for …` `` before exact match (`presets.ts:224`). New copy avoids that suffix pattern.

**On-Deck QA:** **PRESET-EXPAND-W1-01** — chips appear in carousel; chip → Ask inject; streaming prompts marked beta.

## Combined verification (integration owner)

**Commits (implementation order):** `e05637c` → `e4fb6fa` → `8469f14` → `c1fe1e7` → `68f2ae7` (docs).

**Git working tree (Wave 1 only):**
- Modified: `MainTabChatTranscript.tsx`, `VoiceInputSettingsSection.tsx`, `icons.tsx`, `presets.ts`, `presets.test.ts`
- New: `splitThinkingBlurbItalicSegments.ts`, `splitThinkingBlurbItalicSegments.test.ts`, `buildThinkingBlurbTextElement.tsx`, `VoiceInputSettingsSection.test.tsx`, `icons.bonsaiGeometry.test.tsx`
- No accidental overlap between items; unrelated pre-existing changes preserved.

| Step | Command | Result |
|------|---------|--------|
| Focused tests | `npx vitest run src/utils/splitThinkingBlurbItalicSegments.test.ts src/components/VoiceInputSettingsSection.test.tsx src/components/icons.bonsaiGeometry.test.tsx src/data/presets.test.ts` | **4 files, 20/20 passed** |
| Typecheck | `npx tsc --noEmit` | **exit 0** |
| Build | `npm run build` | **exit 0** (`dist` in 4.3s) |
| Full frontend suite | `npm test` | **64 files, 436/436 passed** |

No regressions; no integration fixes applied.

## Outstanding on-Deck QA

| Row | Item |
|-----|------|
| THINKING-EMOJI-01 | A — upright emoji in thinking line |
| VOICE-REINSTALL-01 | B — ready copy, reinstall label, D-pad |
| BONSAI-ICON-GEOM-01 | D — tab + plugin-list visual alignment |
| PRESET-EXPAND-W1-01 | L — four new chips inject correctly |

## Decisions made

- **D (icon):** Pot/trunk shifted left 0.5u per maintainer preference documented in roadmap (not canopy shift). Accept possible half-unit shell centering shift; eyeballed on-Deck.
- **L (presets):** Streaming prompts ship as `beta: true`; category detection tests avoid the `` ` for …` `` strip trap.
- **B (voice):** `binary_ready && model_ready` is authoritative over the aggregate `ready` flag.

## Issues / risks

- **Icon D:** Sub-pixel scaling on Deck may mask or exaggerate the 0.5u shift; preview will not reproduce panel scaling.
- **Icon D:** Canopy ink centroid ≠ bbox center — visual QA is judgement, not math.
- **L:** Beta streaming prompts may surface before token streaming is widely enabled.
- **MCP:** Cursor discovered normalized aliases for `bonsai.policy.get` and `bonsai.workflow.get` (`bonsai_policy_get` / `bonsai_workflow_get`), but dispatching either the alias or dotted server name returned tool-not-found. The in-repo server source and compiled output both register the documented dotted names, so local repo policies/rules (`.cursorrules`, `AGENTS.md`, `docs-on-ship`) were followed directly instead.

## Maintainer decisions required

**None required** to land Wave 1 code/docs. On-Deck pass on the four QA rows above closes the bugs and confirms the preset batch.
