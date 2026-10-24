# Cut list: the weekly model-list refresh

Written 2026-10-16 by the plan 86 step 2 removal reviewer (Sonnet 5.5 high), from the readers' records for this
removal (the catalog-refresh digest, batches b33, b41, b42, b46, b47, b68 to b70, b77 to b80, b90) and from `git grep`
across every tracked file, on `experimental` at `b5ce2768`. Every line number is a line at `b5ce2768`.

## In plain words

**The code says something the plan did not expect, so read this first.** The plan treats the weekly download and the
models box's "on-open catalog call" as two things, and keeps the second. They are one call. When the box opens, the
screen asks the back end for `fetch_pull_model_catalog`; that back end file downloads the online overlay file
(`data/pull-model-catalog-overlay.json` on GitHub, empty since 2026-06-15), keeps a saved copy for seven days, and the
screen lays whatever came back over the built-in model list. The "weekly" part is only the seven-day saved copy. Nothing
else in that file does anything.

So the cut is: **the whole overlay path goes, including the on-open call to `fetch_pull_model_catalog`.** What stays,
untouched, is the part that matters to the player: when the box opens it still asks the Deck's own Ollama which models are
installed (`test_ollama_connection`) and looks up each model's size (`fetch_ollama_catalog_metadata`), through
`usePullModelCatalogRefresh.ts`. The built-in list of models (`pullModelCatalog.ts`) stays and is now the only list.

**What a player notices.** Almost nothing, in three small ways.
- The models box header no longer starts with "Live catalog" or "Offline catalog". It keeps "Installed N, Queue N" and
  "Live sizes" or "Offline sizes" (the part that learns sizes is untouched).
- After "Update AI & models" finishes, the pop-up says "Running connection test." The words "and refreshing model catalog" go.
- The box may open its list of installed models a little quicker on a poor connection: today it waits for the overlay
  download (up to about 12 seconds when offline and the saved copy is old) before it asks about installed models.

**What the maintainer is approving.** Three whole source files and one data file and two test files deleted, one screen
file cut down to the three small helpers other files use, one back-end method (RPC) removed, 11 tests deleted. **What stays:**
the built-in model list, the installed-models and sizes lookup, the registry check before a pull
(`ollama_catalog_service.py`), the download-safety helper `tls_ca_fallback.py`.

## Files that go whole

| File | Why it is wholly this feature |
|---|---|
| `py_modules/backend/services/pull_model_catalog_service.py` (255 lines) | Downloads the overlay from `raw.githubusercontent.com`, validates it, saves it under `~/.bonsai/cache`. Its one importer is `ollama_local_setup_rpc.py` L66-68; no function in it is used for anything else (checked: the on-open call is `fetch_pull_model_catalog`, which is this file's one entry point). `OLLAMA_TAG_RE`, imported at L37, is unused here. |
| `data/pull-model-catalog-overlay.json` (128 bytes) | The online file itself. Read only by the URL constant in the file above. See the open question about older installs. |
| `src/hooks/usePullModelCatalog.ts` (60 lines) | Fetches the overlay, merges it with the built-in list, listens to the refresh notice board. One importer: `PullModelsModal.tsx` L132. |
| `src/utils/pullModelCatalogRefresh.ts` (21 lines) | The notice board. One sender (`useLocalOllamaSetupFlow.tsx` L209, after an update finishes) and one listener (`usePullModelCatalog.ts` L48). Settled from the code: the sender's only purpose was to force the overlay download (the listener only calls the overlay fetch, never the installed-and-sizes lookup), so it goes with the overlay. |
| `tests/test_pull_model_catalog_merge.py` (83 lines, 4 tests) | Tests only the overlay's validation, saved-copy and forced fetch. |

No script, picture or document is wholly this feature.

## Changes inside files that stay

### Back end

**`main.py`**: delete method `fetch_pull_model_catalog` with its docstring (L1214-1216, the hand-off to
`ollama_local_setup_rpc`). This is an RPC (see "Back-end methods that go").

**`py_modules/backend/services/ollama_local_setup_rpc.py`**: delete function `fetch_pull_model_catalog` (L533-569) and the
import `from backend.services.pull_model_catalog_service import (fetch_pull_model_catalog as fetch_pull_model_catalog_service,)`
(L66-68). Docstring: L12 (drop `fetch_pull_model_catalog` from the "Used for" list) and L34 (drop
`pull_model_catalog_service.py`). The helpers it used, `_require_local_ollama_on_deck` and `_internet_downloads_allowed`, stay:
other functions call them (L243, L247, L406, L488, L498). The helper should check that `time` and `Any` are still used.

**`py_modules/backend/services/ollama_catalog_service.py`** L17, docstring: "see pull_model_catalog_service for the list the Pull
Models screen shows by default" now points at nothing; reword to name `src/data/pullModelCatalog.ts`.

**`py_modules/backend/services/capabilities.py`** L79, a comment on `internet_downloads`: "and the recommended-models list and
size lookups" becomes "and size lookups".

### Screen

**`src/components/PullModelsModal.tsx`**:
- import `usePullModelCatalog` (L132): delete; add `PULL_MODEL_CATALOG` to the import from `../data/pullModelCatalog` (L119);
- L201 `const { mergedCatalog, catalogSource, refreshCatalog } = usePullModelCatalog();` becomes
  `const mergedCatalog = PULL_MODEL_CATALOG;` (the name can stay: seven places use it, L244, L257, L402-403, L474);
- L229-235, the call to `usePullModelCatalogRefresh`: drop the `refreshCatalog` argument (L230);
- L726-728, the header `<span className="bonsai-pullmodels-size-source">`: delete the `{catalogSource === "live" || ... "Live catalog" : "Offline catalog"}`
  expression and the `{" · "}` after it; keep the sizes expression (`sizeSource === "live" ? "Live sizes" : "Offline sizes"`);
- header comment L47-51 ("refreshes the merged catalog, tests the connection ... all three in parallel") now says two things, one after the other.
  The file is under its size cap and only shrinks.

**`src/hooks/usePullModelCatalogRefresh.ts`** (stays; this is the installed-and-sizes part):
- `UsePullModelCatalogRefreshArgs` (L37-43): delete `refreshCatalog` (L38); the destructure (L53) drops it;
- `PullModelCatalogRefresh.refreshInstalledAndMeta` (L46): becomes `() => Promise<void>`; the function (L81) loses its
  `forceCatalog = false` parameter;
- L84-85: delete `const overlayRes = await refreshCatalog(forceCatalog);` and replace the merge with
  `const catalog = PULL_MODEL_CATALOG;` (already imported at L26); delete `mergePullModelCatalog` from the import at L30 (keep
  `getCatalogTags` and `isCatalogModelTagInList`);
- the `useCallback` dependency list (L135) becomes `[]`; the mount effect (L138-140) calls `refreshInstalledAndMeta()`;
- header comment L6-30 (L12 "run in parallel"): "the manual Refresh button is gone", "the two RPCs, run in parallel" (they are run one after the other,
  as the code comment at L86-93 says; fix the header while here).
- **Does not change:** the `test_ollama_connection` call (L95-98), the `fetch_ollama_catalog_metadata` call (L111-114), the
  size mapping, the toast "Could not refresh models", `focusAfterRedraw`.

**`src/hooks/usePullModelDeleteConfirm.tsx`**: the prop type `refreshInstalledAndMeta: (forceCatalog?: boolean) => Promise<void>`
(L41) becomes `() => Promise<void>` and the call `refreshInstalledAndMeta(false)` (L121) becomes `refreshInstalledAndMeta()`.
(Tidy; compiles either way as long as it is done together with the hook's own signature.) Its test stub
`usePullModelDeleteConfirm.safeFirst.test.tsx` L52 (`async () => {}`) needs no change.

**`src/utils/mergePullModelCatalog.ts`: split, not deleted.** Importers of the three helpers that stay:
`PullModelsCustomTagEntry.tsx` L25 and `usePullModelCustomTagPull.tsx` L26 (`isPlausibleOllamaPullTag`),
`usePullModelTableData.ts` L34 and `usePullModelCatalogRefresh.ts` L30 (`isCatalogModelTagInList`, `getCatalogTags`).
- **Stay (exact):** `TAG_RE` (L61, used by `isPlausibleOllamaPullTag`), `getCatalogTags` (L154-156), `isCatalogModelTagInList`
  (L158-160), `isPlausibleOllamaPullTag` (L169-173, with its doc comment L162-168), and the type import of `PullModelEntry`.
- **Go:** the types `PullModelCatalogSource` (L38), `PullModelCatalogOverlay` (L40-46), `FetchPullModelCatalogResponse` (L48-56);
  the sets and pattern `VALID_GROUPS`, `VALID_LICENSE`, `VALID_USE_TAGS`, `RELEASED_YM_RE` (L58-60, L62);
  `normalizeOverlayPayload` (L64-78), `isValidEntry` (L80-95), `sanitizeEntry` (L97-109), `mergePullModelCatalog` with its
  comment (L111-152); and the imports of `PullModelGroup`, `PullModelLicenseClass`, `PullModelUseTag` (L31-36).
- The header (L1-30) is rewritten: it describes the merge, which is gone. **The file name stays** (a rename is a move, and
  step 4's folder map does the moving); the name is then a little misleading.
- Check: `grep` shows no other file imports `PullModelCatalogSource`, `PullModelCatalogOverlay` or
  `FetchPullModelCatalogResponse` (only `usePullModelCatalog.ts`, deleted).

**`src/data/pullModelCatalog.ts`** L24, header: "A newer list can be downloaded ... by `mergePullModelCatalog.ts`" goes; this
file is now the list itself.

**`src/hooks/useLocalOllamaSetupFlow.tsx`**:
- delete the import (L38) of `notifyPullModelCatalogRefresh`;
- L205-215: delete `const wasUpdateInstalled = ...` and the whole `if (wasUpdateInstalled) {...}` block (it called
  `notifyPullModelCatalogRefresh(true)` and `fetch_pull_model_catalog` with `force: true`);
- L220: the toast body becomes `"Running connection test."` (the conditional goes).
- Tidy that follows, recommended: `lastCompletedSetupProfileRef` was read only to compute `wasUpdateInstalled`, so it becomes
  write-only. Remove it in the four places that carry it: the parameter (L73) and its type (L81) and the write (L160) here,
  `OllamaWhereAiRunsSection.tsx` (creation L194, passed in at L440), and the test stub
  `src/hooks/useLocalOllamaSetupFlow.inPlace.test.tsx` L44. `LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED` stays imported (still
  used at L130). If the helper prefers the smaller change, leave the ref; the type check will not complain.

**`src/test-harness/fakeDeckyRpc.ts`**: delete `"fetch_pull_model_catalog"` from `FRONTEND_RPC_METHODS` (L26) and its default
handler (L153-173, the canned `qwen3:2b` entry; nothing else in `src` uses `qwen3:2b` from it). `fetch_ollama_catalog_metadata`
(L19, L152) stays. (The glossary move also edits this file's lists; see "Order and clashes".)

**`src/types/rpcMethods.ts`**: generated by the commit hook; L57 `| "fetch_pull_model_catalog"` disappears when `main.py`
loses the method. Do not hand-edit.

**`src/data/bonsaiSettingsSchema.ts`** L101, comment on `internet_downloads`: drop "model list" from the list in brackets.

**`docs/demos/mockup-board-2/src/42-tabs-data.js`** L83 (the board's Internet downloads words: "and refresh the
recommended-models list"): a drawing; no test compares that row, so this is for tidiness (list only).

### Tests that change

- `tests/test_internet_downloads_permission.py`: delete the two tests below; delete the import
  `from backend.services import pull_model_catalog_service as catalog` (L31); module docstring L8-9 (names "the
  recommended-models list from GitHub"; only the size lookups remain). `mock` is still used by the other tests.
- `src/utils/mergePullModelCatalog.test.ts`: delete the `describe("mergePullModelCatalog", ...)` block (L5-67); delete the
  `PULL_MODEL_CATALOG` import (L2, unused after) and `mergePullModelCatalog` from the import (L3). The seven
  `isPlausibleOllamaPullTag` tests stay, and so does the file name.
- `src/components/PullModelsModal.removeKeepsPcName.test.tsx` L13 and `PullModelsModal.test.tsx` L8: comments only; the
  names `usePullModelCatalogRefresh` and `isPlausibleOllamaPullTag` still exist.

## Settings that go

None. The overlay had no setting. The only saved thing is a cache file on the Deck, `~/.bonsai/cache/pull_model_catalog_overlay.json`
(a few hundred bytes). It is left where it is: **Clear all data** removes that folder (`plugin_data_reset.py` L63-70) and
removing the local Ollama removes it too (`local_ollama_teardown_service.py` L117), exactly as today. No older settings file can
carry a setting for this, so no "old file still loads" test is needed.

## Back-end methods that go

Checked against `baseline-rpc-methods.txt` (line 20):
- `fetch_pull_model_catalog` goes (68 methods become 67 for this removal alone; read aloud removes three more).
- `fetch_ollama_catalog_metadata` (line 19) **stays**: the installed-and-sizes part uses it
  (`usePullModelCatalogRefresh.ts` L111-114 and `usePullModelSubmitSelected.tsx` L98).

## Tests that go or change

Names as in `baseline-test-names-python.txt` and `baseline-test-names-screen.txt`.

### Deleted (11)

Python (6):
- `test_pull_model_catalog_merge.TestPullModelCatalogMerge.test_fetch_remote_when_force`
- `test_pull_model_catalog_merge.TestPullModelCatalogMerge.test_fetch_uses_cache_when_fresh`
- `test_pull_model_catalog_merge.TestPullModelCatalogMerge.test_sanitize_overlay_accepts_valid_entry`
- `test_pull_model_catalog_merge.TestPullModelCatalogMerge.test_sanitize_overlay_rejects_invalid_entry`
- `test_internet_downloads_permission.DownloadsAllowedWhileOn.test_recommended_list_may_refresh`
- `test_internet_downloads_permission.DownloadsRefusedWhileOff.test_recommended_list_stays_offline`

Screen (5), all in `src/utils/mergePullModelCatalog.test.ts`:
- `src/utils/mergePullModelCatalog.test.ts > mergePullModelCatalog adds overlay-only entries`
- `src/utils/mergePullModelCatalog.test.ts > mergePullModelCatalog applies partial overrides on bundled entries`
- `src/utils/mergePullModelCatalog.test.ts > mergePullModelCatalog rejects invalid overlay entries`
- `src/utils/mergePullModelCatalog.test.ts > mergePullModelCatalog removes tags listed in removed_tags`
- `src/utils/mergePullModelCatalog.test.ts > mergePullModelCatalog returns bundled catalog when overlay is empty`

### Renamed

None.

### Changed, name unchanged

- `src/hooks/useLocalOllamaSetupFlow.inPlace.test.tsx`: its four tests (names unchanged) pass the stub for
  `lastCompletedSetupProfileRef` only if the tidy above is not done; if it is done, delete L44.
- `tests/test_internet_downloads_permission.py` keeps `DownloadsRefusedWhileOff.test_size_lookups_stay_offline` and
  `DownloadsAllowedWhileOn.test_model_pull_starts`; the rest of the file is unchanged.
- Every `PullModelsModal.*.test.tsx` mounts the box through `fakeDeckyRpc`: they need no edit, but run the whole family
  (`src/components/PullModelsModal*.test.tsx`, `PullModelsFiltersColumn*.test.*`, `PullModelsStarterSetChip.test.tsx`,
  `src/hooks/usePullModel*.test.*`) after the screen commit, because the open path lost an `await`.

### Added

None needed. `usePullModelCatalogRefresh.ts` has no test of its own today (the box's tests exercise it through
`fakeDeckyRpc`'s `fetch_ollama_catalog_metadata` and `test_ollama_connection`); the Deck check below covers the open path.

## What stays on purpose

- **The installed-models-and-sizes part**: `src/hooks/usePullModelCatalogRefresh.ts` (cut to what is above),
  `fetch_ollama_catalog_metadata`, `test_ollama_connection`, `fetch_catalog_metadata` and `ollama_catalog_service.py` (checks a
  typed name against Ollama's registry before a pull; `tests/test_download_sites_match_backend.py` reads it).
- **The built-in model list** `src/data/pullModelCatalog.ts` and its parity test `tests/test_pull_model_catalog_parity.py`.
- **`src/utils/mergePullModelCatalog.ts`**'s three helpers (see the split above).
- **`py_modules/backend/tls_ca_fallback.py`**: three other downloads use it after this removal (`ollama_catalog_service`,
  `rag_corpus_download_service`, `voice_model_download_service`), plus `steam_vac_service` until the ban lookup goes.
- **`generate-architecture.mjs` L19**: the word "catalog" sorts RPC names into the Ollama domain; it stays.
- **The cache directory** `~/.bonsai/cache`: other code removes it as one folder; no code is needed for the leftover file.

## Documents that mention it

List only, for the bookkeeper. `README.md` L49 (already struck through); `docs/development.md` L119 (the "living overlay"
sentence, **and L121 the maintainers' instructions to edit `data/pull-model-catalog-overlay.json`**, which become wrong), L266
(file table row); `docs/guide.md` L269 ("and refreshing the recommended-models list"); `docs/troubleshooting.md` L361, L371 (the
cache folder is still cleared; the words "catalog overlay" go), L546 (the network note names `raw.githubusercontent.com`
overlay JSON; only `registry.ollama.ai` remains); `docs/focus-graph.md` L821 (the header drawing "Live catalog · Live sizes [ ↻ ]");
`docs/roadmap-details.md` L299 ("Depends on: ... living overlay merge"); `CHANGELOG.md` L1348 (history);
`docs/planning/86-clean-up-round-three.md` L53, L440-442 (the plan's description; it should say the on-open call goes too);
`docs/demos/mockup-board-2/src/42-tabs-data.js` L83. `docs/archive/*` mentions are history.

## Order and clashes

| File | Also touched by | Note |
|---|---|---|
| `main.py` | ban lookup, read aloud, glossary | one three-line method at L1214-1216, apart from the others |
| `src/test-harness/fakeDeckyRpc.ts` | glossary (adds `get_rag_corpus_glossary` to the same list and handlers), read aloud (its three RPC names) | edits are at different entries of the same arrays; land one at a time |
| `src/types/rpcMethods.ts` | read aloud, glossary | generated by the hook; do not hand-edit |
| `src/components/PullModelsModal.tsx` | UI scale (if its sizes are touched there; the records list none) | |
| `src/hooks/useLocalOllamaSetupFlow.tsx`, `OllamaWhereAiRunsSection.tsx` | none found | |
| `src/data/bonsaiSettingsSchema.ts`, `capabilities.py` | ban lookup, UI scale, read aloud | comment lines only here |

This removal is independent of the ban lookup, read aloud, UI scale and the preview tool. Suggested place: second, after the
preview tool. Commits that cannot be split: the Python commit (service, RPC method, `main.py`, import, two tests, merge test file);
the screen commit (the hook, the notice board, the modal, the refresh hook's signature, the flow's toast, the merge-file split and
its test) because each deleted export has a user in the others.

## The Deck check this removal needs

(Plan 86 step 3 item 6: the models box.)
1. Open Ollama, then Browse models (the AI models box): it opens, the list shows the built-in models, the header reads
   "Installed N, Queue N" and "Live sizes" (or "Offline sizes" with no network), with no catalog word. Installed models and
   their sizes appear. A model typed by hand still validates and pulls.
2. Delete `~/.bonsai/cache/pull_model_catalog_overlay.json` on the Deck, open the box, then look: **the file is not created
   again** (the plain proof that nothing downloads the overlay).
3. With Internet downloads off, the box still opens and still shows installed models; with them on, nothing changes.
4. Remove an installed model: the list refreshes and the PC name in the try order is kept (this is the path through
   `refreshInstalledAndMeta`).
5. Run Update AI & models once to its end: the pop-up reads "Running connection test." and the connection test then runs.
6. The free-play sweep, and the Ollama tab's other buttons, as before.

## Open questions for the one running the session

1. **The plan's "keep the on-open call" cannot be kept as worded.** The on-open call and the weekly download are the same
   call. This list removes both, and keeps what the plan meant to protect (installed models and sizes). If the maintainer
   wants the on-open call kept in some form, the only thing left to keep it for is the overlay itself, which has been empty
   since 2026-06-15. What would settle it: the maintainer reading the plain words above.
2. **The header words.** This list drops "Live catalog" and "Offline catalog" and keeps "Live sizes" and "Offline sizes".
   The alternative is a fixed word such as "Built-in catalog". It is a player-visible word either way.
3. **Older installs after the next release.** `OVERLAY_REMOTE_URL` points at the file on `main`. Once the file is deleted
   from `main` (and after step 8's fresh history), an older bonsAI version that is still installed gets a failed download
   and shows "Offline catalog" instead of "Live catalog". Harmless, and the same before and after. If the maintainer wants
   it quiet for older versions, keep the 128-byte file on `main` until they fade: but that is a file in a repo this plan is
   shrinking. What would settle it: the maintainer's call; the default here is delete.
4. **The tidy of `lastCompletedSetupProfileRef`** (four places) is optional; say if the helper should skip it.
5. **File name `mergePullModelCatalog.ts`** will no longer describe what is left. Step 4's folder map should give it a name
   like the tags helper; not done here because a move never shares a commit with a change.

## Records found wrong

Checked about 20 records for this removal against the code. Found wrong or incomplete:

- b70 `pull_model_catalog_service.py` (removal): said "the models box's on-open call stays ... that call has to be rewired
  before this file can go". True: the on-open call is this file's own function; nothing needs rewiring, the call itself goes.
- b69 `ollama_local_setup_rpc.py` (removal): said `fetch_pull_model_catalog` (L533-569) is "the on-open catalog call, which
  stays". True: it is the overlay call and goes.
- b42 `usePullModelCatalog.ts` (removal): said "the on-open load itself ... is not part of this removal". True: the
  on-open load is the overlay fetch, so the whole hook goes.
- b42 `usePullModelCatalogRefresh.ts` (removal): listed only the `forceCatalog` flag (L46, L81, L84). True: the
  `refreshCatalog` argument (L38, L53), the merge call (L85) and the `useCallback` dependency (L135) also change.
- b47 `mergePullModelCatalog.ts` (removal): said none. True: the file is split; most of it goes (see the list).
- b33 `PullModelsModal.tsx` (removal): said none ("the four hits are imports and calls of the catalog hooks, which stay").
  True: the import (L132), the hook call (L201), one argument (L230) and the header words (L726-728) change.
- b77 `tests/test_internet_downloads_permission.py` (removal): said none and "the overlay fetch ... stays". True: two tests
  go (they drive `fetch_pull_model_catalog`).
- b79 `tests/test_pull_model_catalog_merge.py`: said L15-45 goes only if the on-open call stops using the service function.
  True: the whole file goes.
- b90 `fakeDeckyRpc.ts` and b46 `rpcMethods.ts` and b41 `useLocalOllamaSetupFlow.tsx`: left the question open ("not traced",
  "unsure"). Settled above: `fetch_pull_model_catalog` goes everywhere; the update-finish call and toast words go.
- b68 `ollama_catalog_service.py`: correct (a false hit from the script). b49 `strategy_seed.json`: correct (the word
  "weekly" is prose).
