# Phase 1 — Generated map verification (2026-08-02)

Answers the Phase 1 question: *are the architecture snapshots hand-maintained or
generated, and do they match current code?*

**Short answer:** generated, hooked, and now accurate. The generator had one real
false-positive bug, fixed in `7c04132`. Verification also surfaced two frontend
RPC calls with no backend implementation — a live defect, not map drift.

---

## Generation is already automated

Phase 1 proposed writing a generator and adding a pre-commit hook. Both exist:

| Piece | Location |
|---|---|
| Generator | `packages/bonsai-mcp/scripts/generate-architecture.mjs` (`npm run mcp:generate`) |
| Hook | `.githooks/pre-commit` → `scripts/sync-architecture-for-commit.mjs` — regenerates **and stages** on every commit |
| Hook install | `npm run mcp:install-hooks`, wired to npm `prepare` (`package.json:24-25`), so it self-installs on `pnpm install` |
| Drift gate | `npm run mcp:validate` (`--check-generated`), also runs when `CI=true` |

Six snapshots are produced: `rpc-map.json`, `hotspots.json`, `import-graph.json`,
`test-inventory.json`, `preview-tiers.json`, `env-vars.json`.

> **Superseded 2026-08-02.** The findings below were written against the
> pre-fix state. `module-map.json` has since been renamed `hotspots.json`,
> `import-graph.json` was added, and the domain taxonomy was completed — see
> [Follow-up fixes](#follow-up-fixes-2026-08-02) at the end.

The drift gate compares each file against **`HEAD`**, not the index
(`validate-knowledge.mjs:93-99`), so staged-but-uncommitted snapshots still fail —
matching what CI sees on a clean checkout. Regenerating without committing will
therefore report "Stale architecture JSON"; that is correct behavior, not a bug.

**No madge-style import graph exists.** Despite the name, `module-map.json` is not
a dependency map (see below). Nothing in the repo generates one.

---

## `rpc-map.json` — one real bug, now fixed

`generateRpcMap()` matched `/^\s+async def .../`, accepting **any** indentation.
That swept in the four nested `async def runner()` local coroutines declared
inside Plugin methods at `main.py:1420`, `:1548`, `:1748`, `:2880`, and emitted
each as an RPC method.

Result: the map advertised **59 entries for 55 real methods**, with `runner`
listed four times. An agent reading it would believe `runner` was part of the RPC
surface.

Fixed by requiring exactly four spaces — methods on `class Plugin`, which *is*
the Decky RPC contract (there is no decorator or registry; indentation is the
whole mechanism). Post-fix: 55 unique entries, zero duplicates, every
previously-correct method retained.

**Line numbers were accurate**: 56/56 pre-fix entries cited the correct
`main.py` line. That is expected — the pre-commit hook regenerates on every
commit, so freshness was never the risk. *Correctness of the extraction rule* was.

### Remaining imprecision (reported, not fixed)

`classifyRpc()` uses a hand-maintained `DOMAIN_KEYWORDS` table
(`generate-architecture.mjs:14-22`). **24 of 55 methods (44%) fall through to
`"other"`** — including every RAG, Proton-journal, intent-pack, and
strategy-checklist method. The domain field is roughly half-useful. Adding
keywords is a taxonomy judgment call, so it is left for whoever owns that
decision rather than guessed at here.

---

## `rpc-map.json` vs. actual TS call sites

Extracted every string literal passed to `call()` / `callDeckyWithTimeout()`
across `src/` (excluding tests and `test-harness/`): **46 distinct method names**.

### Called from TypeScript, implemented nowhere in Python — 2

> **Resolved 2026-08-02.** Both RPCs are now implemented on `class Plugin` per
> **D1** ([roadmap.md](maintainer-decisions-archive.md#maintainer-decisions-locked--2026-08-02)).
> The finding below is kept as the discovery record; the RPC surface is 56
> methods and this count is now **0**.

| Method | Called from | Behavior |
|---|---|---|
| `get_session_rag_chip_candidates` | `src/utils/sessionRagChipCandidates.ts:54` | `try/catch` returns `[]` on failure → the feature silently produces no chips |
| `merge_pulled_tags_into_routing_orders` | `src/components/OllamaWhereAiRunsSection.tsx:573` | `void ... .catch(() => {})` → fire-and-forget, silently dropped |

Both names appear **only** in TypeScript. `grep` across `main.py`, `py_modules/`,
and `src/` finds no Python definition. Neither is a map problem: the map is right
and the frontend is calling into a void. Because both call sites swallow the
error, there is no crash, no log, and no UI signal — the features are simply inert
on-device.

Not fixed here: deciding whether to implement the backend or delete the frontend
path is a product call, and Phase 0/1 are meant to be behavior-preserving.

### Timeout coverage is inverted from what the wrapper's docstring implies

Of 53 literal call sites, **29 use raw `call()` and 24 use
`callDeckyWithTimeout()`**. Raw calls have no deadline and can leave the UI
waiting forever — the exact failure `deckyCall.ts` was written to prevent.

The wrapper's own header (`src/utils/deckyCall.ts:4`) says it is for "Any
frontend RPC that must not hang forever (Ask submit, feedback, **settings**)",
but every `save_settings` / `load_settings` call site uses raw `call()` —
5 in `src/index.tsx` plus 4 in `src/hooks/usePluginSettings.ts`. The doc comment
describes an intent that the code does not follow.

**Resolved 2026-08-02.** The split is now 4 raw call sites, everything else
wrapped. The four exceptions are deliberate and commented in place —
`clear_plugin_data` and `install_rag_corpus_local` (`src/index.tsx`),
`start_voice_transcription` and `stop_voice_transcription`
(`src/hooks/useVoiceTranscription.ts`) — because multi-GB model teardown, a
corpus copy, and whisper finalization can each legitimately outrun any UI
deadline. Note this is a **deliberate behavior change**, not a pure refactor: a
hung backend now surfaces a timeout error where the UI previously waited forever.
Converting also means moving spread args into an array, since the wrapper takes
`(method, argsArray, timeoutMs)`.

### In `rpc-map.json` but never called from TypeScript — 11

`ask_game_ai`, `ask_ollama`, `cancel_rag_corpus_download`, `capture_screenshot`,
`clear_proton_experiment_journal`, `dbg_fe_log`,
`delete_proton_experiment_journal_entry`, `get_proton_experiment_journal`,
`log_navigation`, `save_proton_experiment_journal_entry`,
`suggest_proton_journal_version_from_log`.

Worth a look during Phase 3, with two caveats before deleting anything:

- `ask_game_ai` (`main.py:2279`) is documented as the **foreground Ask RPC**. The
  frontend only calls `start_background_game_ai`, so the foreground path appears
  dead from the UI — but confirm nothing else drives it before removing.
- `capture_screenshot` is stubbed in `src/test-harness/fakeDeckyRpc.ts:31,142`,
  i.e. the test harness mocks an RPC the app never calls.
- Some may be reachable from the preview suite or MCP tooling rather than `src/`.
  This scan covered `src/` only.

---

## Other snapshots

| File | What it actually is | Accurate? |
|---|---|---|
| `module-map.json` | **Not a module map.** A size ranking: top 40 files over 200 lines, sorted by line count | Yes, but misnamed |
| `test-inventory.json` | 44 vitest + 50 pytest files | Matches the filesystem exactly |
| `env-vars.json` | Parsed from `.env.example` | Matches |
| `preview-tiers.json` | Copied from `tests/preview-suite/tier-manifest.json` | Passthrough |

Two notes on `module-map.json`:

- **The name misleads.** It contains `{"hotspots": [...]}` and is served by the
  `bonsai.arch.hotspots` MCP tool. An agent asking for a "module map" gets a size
  ranking with no import or dependency information.
- **"Hotspot" here means size only** — no churn, no complexity. That is a weaker
  notion than the plan's Phase 2b `churn × complexity`. Do not treat this file as
  having already done Phase 2b.
- `MODULE_ROLES` (`generate-architecture.mjs:77-84`) is a hardcoded 6-entry
  description table inside the generator — the one genuinely hand-maintained
  piece. All 6 paths currently exist, but only **4 of 40** entries carry a role,
  and a file rename would silently blank its description rather than error.

Top of the size ranking, for reference:

```
3021  main.py
1961  src/index.tsx
1512  py_modules/backend/services/voice_transcription_service.py
1224  src/hooks/useBonsaiAskOrchestration.ts
1160  src/components/OllamaWhereAiRunsSection.tsx
1104  src/components/PullModelsModal.tsx
1052  py_modules/backend/services/ollama_prompts.py
1031  py_modules/backend/services/screenshot_media.py
```

---

## Follow-up fixes (2026-08-02)

Everything flagged above as "reported, not fixed" has since been addressed.

**`module-map.json` → `hotspots.json`.** The file is a size ranking and is served
by `bonsai.arch.hotspots`; it now says so. Updated in `generate-architecture.mjs`,
`validate-knowledge.mjs`, `sync-architecture-for-commit.mjs`, and
`packages/bonsai-mcp/src/server.ts`. The internal generator function was renamed
`generateModuleMap` → `generateHotspots` to match.

**`import-graph.json` added.** Full `imports` / `importedBy` sets for all 223
TS/TSX files under `src/`, plus cycle detection, orphan detection, and a list of
unresolved specifiers. Current state: **479 edges, 0 cycles, 0 orphans**, and 2
unresolved specifiers that are both legitimate asset imports (`qrcode.png`,
`bonsai-logo.svg`). This confirms the plan's one-off `madge --circular` result and
now re-checks it on every commit.

Built **without madge**, deliberately. madge was not installed, and this generator
runs from `.githooks/pre-commit` on every commit — adding a dependency plus a
multi-second graph build to that path is friction the refactor plan explicitly
warns against. `tsconfig.json` declares no path aliases, so resolution is just
relative specifiers plus `.ts`/`.tsx`/`index.*`, which is ~50 lines.

Worth knowing: the graph is **more accurate than ad-hoc grep**. Checking importers
of `src/utils/deckyCall.ts`, the graph found 15 and a hand-written grep found 14 —
it missed `src/index.tsx`, which imports `"./utils/deckyCall"` rather than the
`"../utils/deckyCall"` the pattern assumed. Prefer the graph when establishing an
importer set before a move.

**Domain taxonomy completed.** `DOMAIN_KEYWORDS` gained `rag`, `proton`,
`intent_packs`, `strategy`, and `language`. All 55 RPC methods now classify;
**0 fall through to `"other"`** (was 20 of 55 after the `runner` fix). Because
`classifyRpc` is first-match-wins and the new entries are appended, no
previously-classified method changed domain.

---

## Scope note for Phase 1

`CLAUDE.md` was written at repo root (144 lines). It does **not** duplicate
`AGENTS.md`, which covers MCP servers, personas, and Deck preview/deploy tooling;
`CLAUDE.md` covers codebase shape — layout, entry points, the RPC boundary,
commands, conventions, refactor rules — which neither `AGENTS.md` nor
`.cursorrules` documented. `.cursorrules` remains Cursor's bootstrap pointer and
explicitly forbids duplicating policy content, so all three stay distinct.
