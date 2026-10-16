# Cut list: the in-panel preview test tool

Written 2026-10-16 by the plan 86 step 2 removal reviewer (Sonnet 5.5 high), from the readers' records for this
removal (the preview-tool digest, batches b83 to b89, b91, b92, plus the three source files no record named
before b89 landed) and from `git grep` across every tracked file, on `experimental` at `b5ce2768`. I also read the Deck
tool's source on this PC (`C:\Users\still\decky-plugin-studio`, read only) to check what it reads from this repo. Every line
number is a line at `b5ce2768`. Hits in documents are marked as documents.

## In plain words

**What a player notices: nothing.** The preview tool is for developers. It let a test runner in the Deck tool's editor
preview drive the panel through a hook on the page. The maintainer's calls say it never got past its loading screen, and
`AGENTS.md` already says to use the device instead.

**What goes.** The panel's preview hook (4 small source files and one line in the main screen), the test-scenario folder
and its runner, the build script, three commands in `package.json`, one tool in bonsAI's tool server and the map behind it,
and the server's "tier QA" workflow. A copy of all of it goes to the workshop first.

**One correction to the brief.** `.decky/preview.json` **stays.** It is not preview-tool code. The Deck tool reads it from
this repo (`panelRootSelector`, `.bonsai-scope`) so that `deck_openPlugin` can tell "the bonsAI panel is open" from "the
name bonsAI is in Decky's list". The in-repo readers found no reader because the reader is outside the repo. Details below.

**What the maintainer is approving.** About 19 files deleted whole, 4 tests deleted, and small cuts in 9 files that stay.
No setting, no back-end method, no permission changes.

## Files that go whole

| File | Why it is wholly this feature |
|---|---|
| `src/preview/previewTestHooks.ts` (73 lines) | Defines `window.__bonsaiTestHooks` and the `isDeckyPreviewRuntime()` check. Importers: `replyLayoutReport.ts` L9 (type only) and `useDeckyPreviewTestHookRegistration.ts` L20. Nothing else reads `__bonsaiTestHooks` (checked across every tracked file; one workshop planning document names it). |
| `src/preview/useDeckyPreviewTestHookRegistration.ts` (157 lines) | Registers the hooks from the panel's live values. One caller: `src/index.tsx` L167, L733-749. |
| `src/preview/replyLayoutReport.ts` (61 lines) | Rectangles of the newest reply's controls, for `getReplyLayoutJson`. One importer, the registration file (L21). |
| `src/preview/replyLayoutReport.test.ts` (4 tests) | Tests only the file above. |
| `tests/preview-suite/README.md` | Explains the runner. |
| `tests/preview-suite/tier-manifest.json` (168 lines) | The tier map; read only by `run-preview-suite.mjs` and by `generate-architecture.mjs` L309 (cut below). |
| `tests/preview-suite/deck-only-e-bucket.json` (41), `hook-smoke.json` (56), `tier0-smokes.json` (75), `tier1-tdp.json` (78), `tier2-char-vac.json` (69), `tier2-deep.json` (743), `tier2-strategy-streaming.json` (68), `tier3-ui-navigation.json` (816), `unit-gates.json` (30) | The scenario files. Only the runner reads them. They mention the ban lookup (about 45 times), the UI scale and read aloud; those mentions go with the files. |
| `scripts/run-preview-suite.mjs` (1,082 lines) | The runner. `package.json` L16-17 are its only callers. It writes into `tests/preview-results/` and into the testing documents. |
| `scripts/build-preview.mjs` (10 lines) | Runs the normal build with `DECKY_PREVIEW=true`. Nothing else reads that flag (checked: only `previewTestHooks.ts` L63-65 and this file). |
| `packages/bonsai-mcp/knowledge/workflows/tier-qa.md` | The tool server's "tier QA" workflow: wholly about `test:preview:tier`, `tier-manifest.json` and preview evidence. Served by directory (`knowledge.ts` L69), so deleting the file removes it from the list; no code names it. |
| `packages/bonsai-mcp/knowledge/workflows/decky-preview.md` (recommended; a judgment call) | The tool server's other preview workflow. It documents the Deck tool's `preview.*` tools, which are a separate project and stay there. But it tells a session to use the preview to verify D-pad focus, which `AGENTS.md` L395-396 says the preview cannot do, and bonsAI's panel cannot even mount in it (`docs/mcp-setup.md` P0-1). Recommend it goes (the Deck tool's own documents describe its tools). If it stays, change only the "Companion workflows" link that `tier-qa.md` L14 makes to it (that file is deleted, so nothing). |

## Changes inside files that stay

**`src/index.tsx`**: delete the import (L167) `import { useDeckyPreviewTestHookRegistration } from "./preview/useDeckyPreviewTestHookRegistration";`
and the call with its 15 arguments (L733-749). Reword the header note at L54 ("the preview test hook registration moved to
preview/useDeckyPreviewTestHookRegistration.ts" goes from the "Split note"). Nothing else in the file loses its last user:
`setSelectedAttachment`, `restoreSessionSnapshot`, `sessionSnapshotRef`, `showDisclaimerModalAgain`, `lastTransparency`,
`capabilities` and `setUnifiedInput` are all used elsewhere in it (the helper confirms with the type check).

**`package.json`**: delete the three scripts `"test:preview"` (L16), `"test:preview:tier"` (L17), `"build:preview"` (L18). Keep L15
`test:focus` and L19 `version:sync`; mind the commas (L18 is not the last script, so each deleted line takes its own comma).

**`.gitignore`**: delete the comment and the line L91-92 (`# Preview suite run artifacts (JUnit-style JSON reports)` and
`tests/preview-results/`) and one of the two blank lines around them.

**`packages/bonsai-mcp/scripts/generate-architecture.mjs`**: delete function `generatePreviewTiers` (L308-312, it reads
`tests/preview-suite/tier-manifest.json` with no guard, so it throws once the file is gone) and the line
`writeJson("preview-tiers.json", generatePreviewTiers());` (L416).

**`packages/bonsai-mcp/scripts/smoke-architecture.mjs`**: delete `"preview-tiers.json",` from `MAPS` (L34); delete
`"bonsai.arch.previewTiers"` from the tool list in `askServer` (L56); delete the `const tiers = ...` line and its `check(...)`
(L79-80).

**`packages/bonsai-mcp/src/server.ts`**: delete the tool `server.tool("bonsai.arch.previewTiers", ...)` (L266-280). **Leave L29-38** (the list of the Deck
tool's `preview.*` tool names) and L51 and L177 alone: they describe the separate project.

**`packages/bonsai-mcp/src/architectureMaps.ts`** L6, header: "which preview tiers there are" goes.

**`scripts/architecture_maps.py`**: delete `"preview-tiers.json",` from `MAP_FILES` (L44), so the tuple has six names; the docstring (L4-7:
"Six small JSON files ... which preview tiers there are") and the comment at L38 ("The six maps the JavaScript generator writes, plus the one the
Python script writes") each lose one. `tests/test_architecture_maps.py` loops over `MAP_FILES` (L35, L47) and needs no edit.

**Comment-only mentions (reword):** `scripts/ratchet.py` L390 ("the saved preview-suite runs"; the code under it ignores all JSON under
`tests/` and still has contract JSON to ignore, so no code change); `src/index.test.tsx` L134-139 and
`src/components/MainTabChatTranscript.replyBlock.test.tsx` L9 (they name the preview suite as the reason for something that still
holds for the Deck tool's snapshots, so reword rather than cut); `scripts/phase2_map.py` L67 ("or a preview session") and L245 ("the preview
code and the tooling").

`packages/bonsai-mcp/README.md` L23 and L33 and `docs/mcp-setup.md` L194, L198, L216 are documents (list below).

## Settings that go

None. The preview tool had no plugin setting. Its inputs were an environment variable (`DECKY_PREVIEW`, set by the build script and read by
`previewTestHooks.ts`) and a page flag (`__DECKY_PREVIEW__`, set by the Deck tool's own preview host). Both go away with the reader; the
Deck tool's side is its own project. No older settings file can be affected, so no "old file still loads" test is needed.

## Back-end methods that go

None. `baseline-rpc-methods.txt` has no preview method. The hooks reached the back end only through the panel's ordinary calls.

## Tests that go or change

### Deleted (4)

All in `src/preview/replyLayoutReport.test.ts`, names as in `baseline-test-names-screen.txt`:
- `src/preview/replyLayoutReport.test.ts > buildReplyLayoutReport counts the newest turn's stops, not an older turn's`
- `src/preview/replyLayoutReport.test.ts > buildReplyLayoutReport reports nothing when no turn is on screen`
- `src/preview/replyLayoutReport.test.ts > buildReplyLayoutReport reports the details chips as open when the chip ladder is showing`
- `src/preview/replyLayoutReport.test.ts > buildReplyLayoutReport says which of the reply controls are present`

The scenario files hold dozens of scenarios, but they are data run by the deleted runner, not tests in either baseline list.

### Renamed or changed

None by name. Comment-only edits are listed above. `tests/test_architecture_maps.py` keeps its three tests
(`test_every_map_comes_back_after_all_are_deleted`, `test_the_rpc_map_has_methods_and_the_graphs_have_a_cycles_list`,
`test_a_generator_that_cannot_run_is_reported_not_raised`); the first one is what proves `MAP_FILES` and the generator agree after the cut.

## What stays on purpose

- **`.decky/preview.json`** (the brief lists it as going). Source for the correction, from the Deck tool's repo on this PC:
  `mcp-server/src/index.ts` L350 and L536 call `loadPreviewConfig().panelRootSelector`; `mcp-server/src/deck/openPlugin.ts` L105-111 says the
  `rootSelector` of `deck_openPlugin` "defaults to `panelRootSelector` in the workspace's `.decky/preview.json`"; `docs/MCP_TOOLS.md`
  L9-18 documents it; the comment at `mcp-server/src/preview/previewConfig.ts` L14-19 names `.bonsai-scope` and the bug it prevents
  (the Deck tool reporting an unmounted panel as open, its finding P1-9, in `docs/mcp-setup.md` L100). Delete the file and every
  Deck block that opens the plugin loses the "is my panel really open" check, silently. Two ways to keep the check if the maintainer still
  wants the file gone: pass `rootSelector: ".bonsai-scope"` on every `deck_openPlugin` call, or keep this one 3-line file. Recommended:
  keep the file, and say so in the Deck tool issue. (It is also copied to the workshop with the rest, for completeness.)
- **The `data-bonsai-tab-panel` anchors** (`src/index.tsx` L1159, L1175, L1200, L1222; `DeveloperTab.tsx` L226; `OllamaTab.tsx` L233;
  `SettingsTab.tsx` L224) and the test that pins them (`src/index.test.tsx > ... gives the rendered tab panel a snapshot anchor
  matching its tab id`, `keeps the Main panel anchor layout-neutral`). The test comment says the anchors exist for the preview suite's
  DOM snapshots; they serve the Deck tool's real-Deck DOM snapshots as well, and the workshop's `scripts/probe_deck_ask_row_width.py`
  selects on them, and `docs/focus-graph.md` L1260 names them. Reword the comment; do not cut.
- **`py_modules/backend/services/tdp_service.py` sandbox branch** (a reader marked it as going: `sandbox_sysfs_root` L21-24,
  `_PREVIEW_AMGPU_HWMON` L27, the branch L32-33, docstring L4 and L6-7; tests `test_tdp_service.TdpSandboxTests.test_find_amdgpu_hwmon_in_sandbox_preview`
  and `...test_sandbox_root_reads_from_env` with their `setUp`/`tearDown`). It is the back-end half of the Deck tool's own preview:
  the Deck tool's extension sets `DECKY_SANDBOX_ROOT` for its preview sidecar (`extension/src/preview/manager.ts` L194). It is not the
  in-panel hook and not on the brief's list. Recommended: **stays** (6 lines, no player effect). If the maintainer retires the Deck tool's
  preview too, it is a ready second cut of exactly those lines and two tests. A reader's record said only one of the two sandbox tests goes;
  both do if it is cut.
- **`packages/bonsai-mcp` references to the Deck tool's `preview.*` tools:** `server.ts` L29-38, L51, L177; `knowledge.ts` L205, L234;
  `knowledge/policies/decky-plugin-studio.md`; `knowledge/architecture/platform-contract.md` L23-29; `personas/master-debugger.md` L38.
  They describe a separate project.
- **`.mcp.json` / `mcp.json`**, and everything under `.claude/` that uses `deck_*` tools.

## Documents that mention it

List only, for the bookkeeper. `AGENTS.md` L395-396 (the paragraph "The in-panel preview is shelved, and plan 86 removes it":
shorten to a line that it was removed and the device is the check; the maintainer's brief names this mention);
`docs/testing-automated.md` L3, L19-29 (commands and "Workflow: ... tier-qa"), L59-65 (the tier table); `docs/testing.md` L17, L58,
L81, L90-105 (the "Preview-suite evidence invalidated" section; history, may stay), L127-130, L145, L185, L204-208, L243;
`docs/testing-manual.md` L809-810 (the "Preview Pass" tier rows); `docs/mcp-setup.md` L194, **L198 (the `bonsai.arch.previewTiers` row)**,
**L216 (the map list with `preview-tiers.json`)**, L112-120 (Deck tool findings log: history, keep); `docs/design-language.md` L214;
`packages/bonsai-mcp/README.md` L23 ("tier QA, preview" in the workflows list), **L33** (the tool list names `previewTiers`);
`CHANGELOG.md` L1139, L1168 (history); `docs/audit/maintainer-decisions-archive.md` (about 12 hits, including **L2186: the August call
"keep the preview hook empty", replaced by plan 86's call 2**; `getSysfsWrites` was the hook kept for that); `docs/archive/*`
(history); `docs/planning/86-clean-up-round-three.md` L58-59, L86, L448-450 (the plan's own wording: `.decky/preview.json` should be
dropped from L449).

## The workshop copy and the Deck tool issue

**Copy first, then delete.** Put it at `../bonsAI-workshop/held-back/preview-tool/` (the workshop's README calls `held-back/` "work kept
on purpose but not landed"; the Hollow Knight patches already live beside it). Contents:
- the files as they were, at their original paths under that folder: `src/preview/` (4 files), `tests/preview-suite/` (11 files),
  `scripts/run-preview-suite.mjs`, `scripts/build-preview.mjs`, `.decky/preview.json`,
  `packages/bonsai-mcp/knowledge/workflows/tier-qa.md` and `decky-preview.md`;
- `bonsai-side-changes.patch`: the diff of the small cuts (the `index.tsx` hook call, the three `package.json` scripts, the
  tool-server tool and map, `architecture_maps.py`), made with `git diff` on the removal commits, so the tool can be put back by applying
  it;
- a short `README.md` there: what it was, why it was shelved (never got past its loading screen; the five defects recorded in
  `docs/testing.md` "Preview-suite evidence invalidated 2026-08-08" and the Deck tool findings D1, D2, P0-1), what to restore
  first, and that `.decky/preview.json` stayed in bonsAI;
- one row per moved file added to the workshop's `MOVED-FROM-BONSAI.tsv` (old path, new path), and one row in the workshop README's folder table.

**The issue in the Deck tool's repo (do not open it; the maintainer's OK comes at the time).** Suggested text, in plain words:
"bonsAI has removed its in-panel preview test hook (`window.__bonsaiTestHooks`), its preview scenario folder and its runner, and
its `DECKY_PREVIEW` build script, because the preview never mounted bonsAI's panel (findings D1, D2, P0-1 in bonsAI's log). A copy is
kept in bonsAI's private workshop. `preview.callTestHook` scenarios written against bonsAI now have nothing to call. bonsAI keeps
`.decky/preview.json` because `deck_openPlugin` reads `panelRootSelector` from it. The open findings stay open here; bonsAI no longer
depends on the preview tools." Nothing else.

## Order and clashes

| File | Also touched by | Note |
|---|---|---|
| `src/index.tsx` | ban lookup, read aloud, UI scale, glossary (comment only) | this removal's lines are L54, L167, L733-749, one block apart from the others |
| `package.json` | none | |
| `packages/bonsai-mcp/*`, `scripts/architecture_maps.py` | none | touched together with the deletion of `tests/preview-suite/tier-manifest.json` |
| `AGENTS.md`, docs | the bookkeeper | helpers never edit them |

Order inside this removal, because the map builder reads `tier-manifest.json` without a guard and runs on every tool-server start, every
commit hook, and `ratchet.py`:
1. **Commit A (tool server and maps):** `generate-architecture.mjs`, `smoke-architecture.mjs`, `server.ts`, `architectureMaps.ts`,
   `architecture_maps.py` together. Check `python -m unittest tests.test_architecture_maps` passes and `npm run smoke --prefix packages/bonsai-mcp`
   (needs `npm run mcp:build` first).
2. **Commit B (the scenario folder, runner, script, commands):** delete `tests/preview-suite/`, `scripts/run-preview-suite.mjs`,
   `scripts/build-preview.mjs`, `package.json` L16-18, `.gitignore` L91-92, `tier-qa.md` (and `decky-preview.md`).
3. **Commit C (the panel's hook):** delete `src/preview/`, the `index.tsx` lines, comment rewordings.
Land this removal first of the five: it touches almost nothing the others touch.

## The Deck check this removal needs

(Plan 86 step 3 item 6: a short one; the removal changes no screen.)
1. Build and install: the plugin loads and opens; each tab opens once (Search, Main, Ollama, Settings, Permissions, Developer, About); one question is
   answered. `deck_openPlugin` still reports the panel open with no `rootSelector` argument (this proves `.decky/preview.json` is still read).
2. PC side: `npm run build` succeeds and the built bundle no longer contains the text `__bonsaiTestHooks` (`grep` the built `dist/index.js`);
   `python scripts/ratchet.py check` and `npm run mcp:validate` pass (the map builder works without the preview map);
   `node scripts/check-focus-patterns.mjs` passes.
3. The free-play sweep needs no extra run for this removal alone; it rides on the block that follows the other removals.

## Open questions for the one running the session

1. **`.decky/preview.json`.** Brief says delete; the Deck tool reads it. Recommendation: keep (3 lines). Settles with: the maintainer's yes, or
   the plain alternative of a `rootSelector` argument on every call.
2. **`decky-preview.md`.** Goes (recommended) or stays; see the table row. Settles with the maintainer.
3. **The `tdp_service.py` sandbox branch.** Stays by default, ready as a second cut if the Deck tool's preview is retired too.
4. **Where the copy goes:** `held-back/preview-tool/` is a suggestion that fits the workshop's README; `scripts/archive/` is the other
   candidate. The patch file idea needs the removal commits to exist, so it is made at the end of step 3, not before.
5. **A line in `AGENTS.md`.** The brief names its mention (L395-396). The bookkeeper decides the new wording.

## Records found wrong

Checked about 30 records for this removal against the code and the Deck tool's source. Found wrong or incomplete:

- b83 `.decky/preview.json`: said "unused: nothing in the code reads the file". True: the Deck tool reads it (`deck_openPlugin`, see
  "What stays"). The repo alone cannot show this.
- b83 `package.json`: right on the three scripts. b87/b88 for the runner and `ratchet.py`: right.
- b73 `tdp_service.py` (removal: the sandbox lines): the lines are right but the tests are wrong: both sandbox tests go with the lines
  (`test_find_amdgpu_hwmon_in_sandbox_preview` and `test_sandbox_root_reads_from_env`, class `TdpSandboxTests`), not one. And the branch
  belongs to the Deck tool's preview, not to the in-panel hook (decision: stays, see above).
- b83 `scripts/build-preview.mjs`: "the Deck tool might read the flag, I could not check". Checked: bonsAI's own `rollup.config.js` never
  reads `DECKY_PREVIEW`, so the script's flag reaches nothing here; the Deck tool's preview host has its own page flag
  (`window.__DECKY_PREVIEW__`, `sandbox-host.tsx` L29) and reads the variable in its own Vite config (`vite.config.ts` L192), set
  by whoever starts that server, not by bonsAI's script. The script is safe to delete.
- b89 (`src/preview/*`): right. Its note that "the preview hooks probably ship in every build" is right: the registration is imported
  statically, which is why the built bundle is checked in the Deck check.
- b84 `generate-architecture.mjs`, `smoke-architecture.mjs`, `architectureMaps.ts`, `server.ts`, b84 `architecture_maps.py`: right. None of
  them noticed that `generatePreviewTiers` has no guard, which fixes the order of the commits above.
- b92 (scenario files): right. b04 `MainTabChatTranscript.replyBlock.test.tsx` L9: right (comment only).
