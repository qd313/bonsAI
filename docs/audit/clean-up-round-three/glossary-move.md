# The glossary move: the exact plan for step 3

Written 2026-10-16 by the plan 86 step 2 knowledge-library, Search tab and notes reviewer (Sonnet 5.5 high), from the
records of batches b49 to b62 and the glossary files named in the brief, on `experimental` at `b5ce2768`. Every
line number below is a line at that commit; the block name next to it is what the helper searches for.

## In plain words

**What a player notices.** Nothing, if they have the knowledge library installed and updated. "Kiting" and
"overclock" stay underlined in Deep Rock Galactic: Survivor answers, with the same short peek, the same full
definition and the same "Explain further" button. The only change is where the two words come from: the
downloadable knowledge library instead of the plugin itself.

Two groups see a difference:

- **People without the library** get the two words as plain text. No underline, no error.
- **People who downloaded the library before this change** get the same, until they press "Update knowledge
  base" after the maintainer publishes the rebuilt library. The plugin never rewrites a library that is already
  installed (docs/lessons-learned.md, section 2), so their old copy has no glossary section and the plugin must
  read that as "no words".

In those two cases the AI is also no longer told that "kiting" and "overclock" are tap-to-define, so it may
explain them in the answer itself. That is a small wording change, not a fault.

**What the maintainer is approving.**

1. A new table in the library called `glossary_terms`, in the same place as the games and notes. It is its own
   table, not a new kind of note, so the words never turn up as search results, chips or "From the notes" cards.
2. The two words move out of the plugin's code into a new library source file, `data/kb/glossary_terms.json`.
3. One new back-end call, `get_rag_corpus_glossary`, that gives the screen the running game's words. The AI's
   instruction builder gets the same words through the existing ask path.
4. The built-in word list, the "is this Deep Rock Galactic: Survivor" checks and the hard-coded game name go. The
   chip, the matcher, the tooltip placement, the "Explain further" question and the D-pad stop list stay.
5. The `Drg` in the names (files, functions, one style name) goes in step 4, in its own commit after the files
   move, not in step 3. Reason in section 3.5.
6. The maintainer rebuilds the library and publishes it. Until then a Deck check uses the seed library the
   deploy script already builds.

Size: about 4 new small files, about 25 changed files (9 of them one-line import changes), 1 deleted data file,
1 deleted test file. Saves almost no code, as the maintainer expected (call 3).

## 1. What goes into the library

### 1.1 The kind of entry: a new table, not a new kind of note

The library has no "kind of entry" list. Its layout is `CREATE_SCHEMA_SQL` in
`py_modules/backend/services/knowledge_base_schema.py` (L103-187): `games`, `aliases`, `sections` (the notes; a
note's kind is its `section_type` text), `genre_patterns`, `compat_patterns` (tips), and two vector tables. The
choice is between a new `section_type` value and a new table. A new table is right, for three reasons I checked:

- **Every row in `sections` is embedded and counted.** `build_corpus` (`scripts/build_rag_db.py` L713-756) makes a
  meaning-search vector for every section and refuses to finish if one is missing (L741-756); the manifest records
  the totals (L796-797) and `scripts/publish_corpus.py` `validate_build` (L90-135) refuses a short count. A
  glossary word as a section would need a vector it has no use for.
- **A section is a note the person can find.** The Search tab's notes lookup
  (`knowledge_base_notes_search.py`), the "From the notes" block, the suggested chips (round-robin over note
  kinds, `knowledge_base_chips.py`) and the "Not in my notes" footers all read `sections`. A definition would
  appear in all of them.
- **An older plugin would show it.** A plugin that knows no `glossary` kind would draw the word as a note.

The new table has no full-text index, no vectors and no triggers. Nothing searches it; it is read by game.

### 1.2 The table

Add after `compat_pattern_vectors` (L183-187), inside `CREATE_SCHEMA_SQL`:

```sql
CREATE TABLE IF NOT EXISTS glossary_terms (
    term_id INTEGER PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    term_key TEXT NOT NULL,
    term TEXT NOT NULL,
    alt_forms TEXT NOT NULL DEFAULT '[]',
    peek TEXT NOT NULL,
    full_text TEXT NOT NULL,
    UNIQUE (game_id, term_key)
);

CREATE INDEX IF NOT EXISTS idx_glossary_terms_game_id ON glossary_terms(game_id);
```

- `term_key` is today's `id` ("kiting"): the stable key the screen uses for React keys and the chip registry.
- `term` is the display form, matched whole-word and case-blind. `alt_forms` is a JSON list of text, the same way
  `genre_patterns` and `games.genres` already store lists.
- `peek` is the short line shown on focus; `full_text` is the definition shown once the word is activated. (`full_text`,
  not `full`: FULL is an SQL keyword.)
- No `apply_schema` migration is needed: it is a new table, and `apply_schema` (L436-441) runs
  `CREATE TABLE IF NOT EXISTS` for a new database. The plugin never runs `apply_schema` on an installed library;
  only `scripts/build_rag_db.py` L728 does. That is the whole reason section 4 exists.
- **Also update:** the header comment of the schema file, "How it works" item 1 (L27-33), to name the new table.
- **Do not bump `CORPUS_SCHEMA_VERSION` (L71, stays 4).** A plugin refuses a library whose `schema_version` is
  newer than its own (`rag_corpus_download_service.py` `_refuse_future_schema`, L188-205; its own comment says a future change may add "a table this reader does not know to open"). The library is replaced under the same web
  address (`build_rag_db.py` L813-817, the comment on `urls`), so a bump would make every plugin already on a player's Deck refuse the
  rebuilt library and tell them to update the plugin first. An old plugin simply never opens the new table, so
  nothing breaks without the bump. `tests/test_knowledge_base_schema_compat_app_id.py::test_schema_version_is_four`
  pins the number and stays as it is. (Open question 2.)

### 1.3 Where the library's source data lives, and the file the two words go into

The library is built from `data/kb/` (`KB_DATA_DIR`, `scripts/build_rag_db.py` L31): `strategy_seed.json` (games,
aliases, notes) and `compat_patterns.json` (tips). `data/kb/` is never put in the plugin download
(`scripts/stage_zip_extras.py` L40 `NEVER_STAGE_PREFIX = "data/kb"`). A new file goes beside them:

**`data/kb/glossary_terms.json`**, a list like `compat_patterns.json`, one row per word, with explicit ids so the
build is byte-for-byte repeatable (`tests/test_build_rag_reproducible.py` pins that for the notes). The game is
named by its Steam app id, the same key per-game tips use (`compat_patterns.json` rows, D29).

The two rows, written from the current text (section 1.6 gives file and line for every piece):

```json
[
  {
    "term_id": 1,
    "app_id": "2321470",
    "term_key": "kiting",
    "term": "kiting",
    "alt_forms": ["kite", "kited", "kites"],
    "peek": "Backing away while you keep shooting.",
    "full_text": "Kiting means backing away from an enemy while you keep shooting it, using your movement speed to stay just out of melee range instead of tanking hits. It buys survival time, but a run spent only kiting mines nothing — kite between waves, not instead of mining."
  },
  {
    "term_id": 2,
    "app_id": "2321470",
    "term_key": "overclock",
    "term": "overclock",
    "alt_forms": ["overclocks", "overclocked"],
    "peek": "A weapon mod that changes what it does, not just its numbers.",
    "full_text": "An overclock is a weapon mod that changes what a weapon is for rather than simply making it bigger — read what it removes as well as what it adds before slotting one. Save your best overclock, or a nuke, for an armor-break window on a boss like the Dreadnought."
  }
]
```

The long dash in both definitions is a real em dash, as in the source; keep it (UTF-8, `ensure_ascii` off). The
Deep Rock Galactic: Survivor game row these point at is `data/kb/strategy_seed.json` L13-25 (`game_id` 2,
`app_id` "2321470", title "Deep Rock Galactic: Survivor").

Also update `data/kb/NOTICE.md`: add a short section for this file, "written for bonsAI by the maintainer, no
wiki source". The notice lists every file in the folder and its licence.

### 1.4 What `scripts/build_rag_db.py` must learn

- **New function `_seed_glossary_terms(conn) -> int`**, next to `_seed_compat_patterns` (L365-386), reading
  `KB_DATA_DIR / "glossary_terms.json"` (a missing file gives 0 rows, the way the tips file does). For each row:
  resolve `app_id` to `games.game_id` (`SELECT game_id FROM games WHERE app_id = ?`); insert into
  `glossary_terms`. It refuses the build with `SystemExit` (the way `mistyped_starting_out_rows` and the
  undated-source check do, L418-446) when:
  - a row's `app_id` matches no game;
  - `term`, `peek` or `full_text` is empty;
  - `alt_forms` is not a list of text;
  - two words of one game share a spelling (the matcher keeps the first and silently skips the second:
    `drgGlossaryTermMatch.ts` L41-46);
  - `term_key` or `term_id` repeats.
- **Call it from `seed_sample_corpus`** (L563-584), after `_seed_strategy_corpus(conn)` (the games must exist
  first) and before `conn.commit()`.
- **Manifest:** add `"glossary_term_count"` beside `embedding_missing_count` (L796-797), read with
  `SELECT COUNT(*) FROM glossary_terms` after the seed. It is information only (no check reads it); it lets the
  maintainer see at publish time that the rebuilt library carries the words.
- `seed_sample_corpus_legacy` (L501-560, used only when `strategy_seed.json` is missing) gets no glossary. Keep.
- Nothing else in the builder changes: no vectors, no attribution (the words are the maintainer's own, so
  `collect_third_party_attribution_sources` has nothing to list).

### 1.5 Everything else that builds or checks the library

| Place | Change |
|---|---|
| `scripts/plugin_zip_corpus_guard.py` L21-26 `FORBIDDEN_CORPUS_BASENAMES` | add `"glossary_terms.json"`. It is source data of the library and must never reach the plugin zip, like its two siblings. The staging step already skips `data/kb`; this keeps the guard honest if someone stages by hand |
| `tests/test_plugin_zip_corpus_guard.py` | one new test, `test_planted_glossary_terms_file_fails`, modelled on `test_game_note_sources_fail` (L84) |
| `scripts/publish_corpus.py` | **no change.** `validate_build` (L90-135) checks the manifest and embeddings, not tables. A table-count check is not worth a second place that has to know about every table. Kept on purpose |
| `scripts/eval_kb_embed_models.py` L268-272 (the list of files a saved library copy depends on) | **no change.** The words add no vectors and no search text, so a copy built before the glossary is still a faithful copy for search measurement. Kept on purpose |
| `scripts/stage_zip_extras.py` | no change (`data/kb` already refused) |
| `scripts/build.ps1` L75 | no change. It builds the seed library on every Deck deploy, so a deploy after step 3 puts a library with the words on the Deck's seed folder (section 6) |
| `.claude/agents/kb-lane.md` L36 | no change in step 3 (the library helper's brief); its path changes in step 4 with the script move |
| Rebuild and publish | the maintainer's, after step 3 lands: `python scripts/build_rag_db.py --seed --out build/knowledge-base` (needs the PC's Ollama with `nomic-embed-text` or the build refuses), then `scripts/publish_corpus.py`. The build date is the library's version (L781 `%Y.%m.%d`): if the last publish was the same day, the plugin's Update button says "up to date". Publish on a different day, or say so (open question 4) |
| Other library data already waiting | step 0 said the new notes (five games, Skyrim, fact-check fixes) ride along with this rebuild. Their `data/kb` edits land before step 3; step 3 does not touch them |

### 1.6 The two words' exact current text, file and line

| Piece | Where | Text |
|---|---|---|
| Word list | `src/data/drgGlossaryTerms.ts` L37-57 `DRG_SURVIVOR_GLOSSARY_TERMS` | the two entries above, field for field (`id` is `term_key`, `altForms` is `alt_forms`, `full` is `full_text`) |
| App id (screen) | `src/data/drgGlossaryTerms.ts` L28 `DRG_SURVIVOR_APP_ID` | `"2321470"` |
| App id (back end) | `py_modules/backend/services/ollama_prompts.py` L311 `DRG_SURVIVOR_APP_ID` | `"2321470"`; the file itself says "keep the two in sync by hand" (L306-308) |
| Name test (back end) | `ollama_prompts.py` L312 `_DRG_SURVIVOR_NAME_NEEDLE` | `"deep rock galactic: survivor"` (matches the game's name when no app id is known) |
| Labels in the AI's instructions | `ollama_prompts.py` L313 `_DRG_GLOSSARY_TERM_LABELS` | `("kiting", "overclock")` |
| The AI's clause | `ollama_prompts.py` L323-340 `_drg_survivor_glossary_clause` | `\nGLOSSARY (Deep Rock Galactic: Survivor): kiting / overclock are tap-to-define in this UI -- the player can select one of these words to see its definition. Use them naturally where they fit rather than stopping to define them inline; only spell one out in prose if the player directly asks what it means.\n` |
| "Explain further" question | `src/utils/drgGlossaryAsk.ts` L11-16 | `Explain "<term>" further for Deep Rock Galactic: Survivor — what does it mean and how should I use it?` |
| Thread label | `src/utils/drgGlossaryAsk.ts` L18-20 | `Explain: <term>` |

Stale comments to drop with the code: the header of `drgGlossaryTerms.ts` cites `data/kb/strategy_seed.json:164, :50,
:168`; those line numbers no longer hold (the words appear at L914, L2339 and L2359).

## 2. How the screen and the AI get the words

### 2.1 The screen: a new call, named in the library's own word

AGENTS.md "How the two sides talk", point 6: the generated map files a method by the words in its name, and every
library method uses `rag_corpus` (`get_rag_corpus_status`, `search_rag_corpus_notes`, ...;
`packages/bonsai-mcp/scripts/generate-architecture.mjs` L25 `rag: ["rag_corpus"]`). **The new call is
`get_rag_corpus_glossary`** (not `get_knowledge_base_glossary`, which would land under "other").

- Signature: `async def get_rag_corpus_glossary(self, app_id: str = "")`.
- Answer, the same shape as `search_rag_corpus_notes` (`knowledge_base_notes_search.py` `_answer`, L56-62):
  `{"ok": True, "installed": bool, "game_title": str, "terms": [{"id","term","alt_forms","peek","full"}], "reason": str}`.
  Failure: `{"ok": False, "installed": True, "terms": [], "reason": ..., "error": ..., "code": "glossary_failed"}`.
- An existing method cannot carry this: `get_session_rag_chip_candidates` is about suggested questions and
  `search_rag_corpus_notes` is about a word the person typed.

### 2.2 The new back-end module

New file `py_modules/backend/services/knowledge_base_glossary.py` (lands in `backend/knowledge/` in step 4):

- `glossary_for_game(settings, app_id, app_name="") -> dict` is the one reader, used by both the call and the AI's
  instructions. Steps: return "not installed" when `resolve_corpus_db_path(settings)` is empty or the
  `use_local_knowledge_base` switch is off (open question 1); open the library with `_get_connection` (read-only,
  `knowledge_base_cards.py` L46-60); find the game with `_resolve_game_id(conn, app_id=..., app_name=..., shortcut_name="")`
  (`knowledge_base_game_match.py` L92-146: app id first, then the alias table, which keeps today's "match by name
  when there is no app id" behaviour of the AI's clause); check the table exists
  (`SELECT 1 FROM sqlite_master WHERE type='table' AND name='glossary_terms'`); read
  `SELECT term_key, term, alt_forms, peek, full_text FROM glossary_terms WHERE game_id = ? ORDER BY term_id`;
  read `canonical_title` for the game. Unknown game, missing table, empty table: no words, no error.
- `async def get_rag_corpus_glossary(self, app_id="")`: loads settings, runs the reader in `asyncio.to_thread`,
  and on any exception returns the failure answer and logs once per distinct fault (copy the
  `_last_fault` pattern of `search_rag_corpus_notes`, L53 and L147-161).
- Register it the way the notes lookup is: import in `rag_corpus_rpc.py` L34-36 (with the `# noqa: F401` note),
  update its header (L1-23, "seven calls" becomes eight), and add the one-line method in `main.py` after
  `search_rag_corpus_notes` (L1190-1192). The generated `src/types/rpcMethods.ts` is rebuilt by the generator
  (`npm run mcp:generate`); do not edit it by hand.

### 2.3 The AI's instructions

Today `build_system_prompt` decides by itself whether the game is Deep Rock Galactic: Survivor. It cannot read the
library (it is a plain function with no settings). The notes use the same shape: the caller picks them and hands
over a finished piece (`user_notes_block`). The glossary does the same:

- `ollama_prompts.py` L306-340: delete `DRG_SURVIVOR_APP_ID`, `_DRG_SURVIVOR_NAME_NEEDLE`,
  `_DRG_GLOSSARY_TERM_LABELS`, `_is_drg_survivor_title`, `_drg_survivor_glossary_clause` and the comment above
  them. Add `_glossary_clause(game_title: str, terms: Sequence[str]) -> str`, returning "" when there are no terms
  and otherwise the clause above with `Deep Rock Galactic: Survivor` replaced by `game_title` and
  `kiting / overclock` by the terms joined with ` / `. **The text for Deep Rock Galactic: Survivor must come out
  byte-for-byte the same as today**, so the AI's behaviour does not change.
- `build_system_prompt` (L342-): two new keyword parameters after `user_notes_block` (L363),
  `glossary_game_title: str = ""` and `glossary_terms: Sequence[str] = ()`, plus a docstring paragraph next to the
  `user_notes_block` one (L377). L497 `drg_glossary_block = _drg_survivor_glossary_clause(app_id=..., app_name=...)`
  becomes `glossary_block = _glossary_clause(glossary_game_title, glossary_terms)`; L612 and L774
  (`dynamic_block + general_block + drg_glossary_block`) use the new name.
- Plumbing, the shortest path (there is only one caller): `ollama_ask_service.py` `run_ask_ollama` already has
  `settings` (L143) and calls `plugin_inst._build_system_prompt(...)` (L179-201). Read the words there with
  `await asyncio.to_thread(glossary_for_game, settings, app_id, app_name)` and pass the two new keywords.
  `main.py` `_build_system_prompt` (L2116-2166) takes the two keywords (signature L2139, pass-through L2163).
  `game_ai_request.py` and `ask_ollama` are **not** touched.
- `scripts/eval_kb_answers.py` wraps `build_system_prompt` with `*a, **kw` (L350-366), so a new keyword with a
  default does not disturb it.

## 3. What changes in the plugin

### 3.1 Back end, by file

| File | Lines at `b5ce2768` | What |
|---|---|---|
| `py_modules/backend/services/knowledge_base_schema.py` | L103-187, L27-33 | new table in `CREATE_SCHEMA_SQL`; header comment |
| `py_modules/backend/services/knowledge_base_glossary.py` | new | the reader and the call (2.2) |
| `py_modules/backend/services/rag_corpus_rpc.py` | L34-36, L1-23 | import the call; header says eight calls |
| `main.py` | after L1192; L2139, L2163; header comment L29 | the one-line method; the two keywords |
| `py_modules/backend/services/ollama_ask_service.py` | L143-201 | read the words, pass them on |
| `py_modules/backend/services/ollama_prompts.py` | L306-340, L363, L377, L497, L612, L774 | section 2.3 |
| `scripts/build_rag_db.py` | L365-386 (new function beside), L563-584, L796-797 | section 1.4 |
| `scripts/plugin_zip_corpus_guard.py` | L21-26 | one name |
| `data/kb/glossary_terms.json`, `data/kb/NOTICE.md` | new; add a section | section 1.3 |

Not touched: `spoiler_title_profiles.py` L50 and `src/data/spoilerTitleProfiles.ts` L43 also list "2321470" with a
comment "Deep Rock Galactic: Survivor". That is the spoiler profile list, a different feature; it stays.
`tests/test_chat_slot_ownership.py` L172 and `tests/test_chat_slot_service.py` L62 mention the glossary only in a
docstring (the turn's app id is saved so chips survive); the saved app id is still needed, so those tests stay.

### 3.2 Screen, by file

The word list goes; the matcher, chip, tooltip placement, "Explain further" hand-off and D-pad registry stay.

| File | Lines | What |
|---|---|---|
| `src/data/drgGlossaryTerms.ts` | whole file (57 lines) | **deleted.** The type `DrgGlossaryTerm` (L11-24) moves to the new store file below, plus a `gameTitle` field (the library's game name, used by the Ask question) |
| `src/utils/glossaryStore.ts` | new | the type; `ensureGlossaryLoaded(appId)`; `useGlossaryTerms(appId): readonly DrgGlossaryTerm[]` (a hook over `useSyncExternalStore`, returns the same array object until it changes); `resetGlossaryStore()` for tests. Calls `get_rag_corpus_glossary` through `callDeckyWithTimeout` (AGENTS.md point 2), maps `alt_forms` to `altForms`, `full` to `full`, fills `gameTitle`. Caches a good answer per app id, **including an empty one** (one call per game, not one per drawn paragraph); caches no failure (asks again on the next ensure, at most one call in flight per game); empties itself when the library changes (listen to `kbLibrarySignal.ts` the way `KnowledgeBaseSection.tsx` does, L87-92) |
| `src/utils/drgGlossaryTermMatch.ts` | L20 import; L22-25; L38-52; L55-56; L78 | delete `isDrgSurvivorAppId` and the app id import; `buildPattern` takes the terms (cache the built pattern per list in a `WeakMap`: today it is rebuilt on every text node); `findDrgGlossaryTermMatches(text)` and `splitTextForDrgGlossaryTerms(text)` take the terms as a second argument |
| `src/components/MainTabBonsaiAiMarkdownChunk.tsx` | L61, L63; L124-125; L139-140; L183-224 `linkifyDrgGlossaryNode`; L259-264; L271-276; L339-340, L358-359; L637; L648-667 | replace `drgGlossaryEnabled: boolean` with the terms list: `const glossaryTerms = useGlossaryTerms(props.appId)` at L637 instead of `isDrgSurvivorAppId(props.appId)`; `drgGlossaryEnabled` becomes `glossaryTerms.length > 0` (it still turns a paragraph into a `div` only when there are words, L276); pass the list through `buildMdComponents` and `linkifyDrgGlossaryNode`; add it to the `useMemo` dependencies (L667). The doc comments at L28-36 and L124 lose "DRG Survivor" |
| `src/components/DrgGlossaryTermChip.tsx` | L40 (import path); header comment L2-34 | import the type from the store file; comment drops "Deep Rock Galactic". No behaviour change: the chip reads only `term.term`, `term.peek` and `term.full` |
| `src/utils/drgGlossaryAsk.ts` | L9; L11-16 | the question uses `term.gameTitle` instead of the typed-in game name; same words for Deep Rock Galactic: Survivor. If `gameTitle` is empty, leave the game out of the sentence |
| `src/components/StreamMarkdownPieces.tsx` L15, `src/utils/buildAnswerBubbleElement.tsx` L68, `src/utils/buildAnswerSections.tsx` L24, `src/components/MainTabChatTranscript.tsx` L215 | one line each | the type import path only. `MainTabChatTranscript.tsx` L855-872 (the callback) and L895 stay as they are |
| `src/test-harness/fakeDeckyRpc.ts` | L15-76 `FRONTEND_RPC_METHODS`; handlers near L123 | add `get_rag_corpus_glossary` and a handler returning `{ ok: true, installed: false, terms: [] }`. A check in this file (L328) fails when a listed method has no handler |
| `src/types/rpcMethods.ts` | generated | rebuilt by the generator |
| `src/test-harness/glossaryTestTerms.ts` | new | the two words as test terms (same text as today, `gameTitle` "Deep Rock Galactic: Survivor") and `primeGlossary(appId, terms)` that fills the store; every test below that used the built-in list uses this |

**When the words are asked for.** The chunk must not be what starts the call. The first time a game's words
arrive, a paragraph changes from `<p>` to `<div>` and the whole set of drawn pieces is rebuilt, and a rebuild
closes an opened spoiler cover (the lesson in the note at `MainTabBonsaiAiMarkdownChunk.tsx` L640-647,
`workshop:test-evidence/plan76-P76-M-COVER-RECLOSE.json`). So the call is started by something that runs when
the question appears: an effect in `MainTabChatTranscript.tsx` over the app ids of the turns it draws (the
turn's `appId` is at L524 and L546). By the time the answer text streams in, the words are known. The chunk only
reads the store.

### 3.3 What stays untouched in step 3

The D-pad walk over an underlined word is not touched: `src/utils/drgGlossaryTermRegistry.ts` (the stop list),
`answerBubbleNavigation.ts` L157-158 and L713-720, `answerBubbleWordsUp.ts` L45-160,
`buildReplyActionsElement.tsx` L112-113 and L587-594, and the walk helper `src/test-harness/deckAnswerWalk.ts`
L28, L245. None of them looks at a word list; they register and find the chip elements that are drawn. The comments
that cite `DrgGlossaryTermChip.tsx` as device evidence about button B (`ContextChipLadder.tsx` L320,
`MainTabBonsaiAiMarkdownChunk.tsx` L588, `MainTabChatTranscript.tsx` L119, `SessionContextStrip.tsx` L237,
`ContextChipLadder.test.tsx` L165, `buildReasoningFoldElement.tsx` L34, `buildDetailsPanelElement.tsx` L300,
`src/index.tsx` L1259) stay as they are; the chip stays.

### 3.4 What the glossary's own D-pad registry becomes

`drgGlossaryTermRegistry.ts` is one of the eight D-pad helpers (a map of drawn chips; `findNextDrgGlossaryTermChipInView`,
`focusDrgGlossaryTermChip`, `isDrgGlossaryTermChip`, `registerDrgGlossaryTermChip`, `resetDrgGlossaryTermRegistry`).
In step 3 it does not change. In step 4 it moves to `src/shared/focus/glossaryTermRegistry.ts` with its siblings.
In step 6b it stops being a file of its own: "a glossary word" becomes one kind of stop in the one shared helper
(the chip registers itself as that kind; the three callers above ask the helper for "the next stop of any kind").
`scripts/focus-baseline.json` L66 names this file by path; the move tool and the step 6b checks must update that key.

### 3.5 The one-game names: which go in step 3, which later

**Go in step 3 (behaviour, the plan's "loses its one-game names"):** `DRG_SURVIVOR_APP_ID` (screen L28 and back end
`ollama_prompts.py` L311), `DRG_SURVIVOR_GLOSSARY_TERMS`, `isDrgSurvivorAppId`, `_DRG_SURVIVOR_NAME_NEEDLE`,
`_DRG_GLOSSARY_TERM_LABELS`, `_is_drg_survivor_title`, `_drg_survivor_glossary_clause`, the hard-typed game name in
`drgGlossaryAsk.ts` L14, and the hard-typed game name in the AI's clause.

**Stay in step 3, rename in step 4 as one commit of its own after the glossary files have moved** (a rename is a
change, and a move must not share a commit with a change; the move tool can rename a file but not a symbol):

| Today | After |
|---|---|
| files `drgGlossaryTermMatch.ts`, `drgGlossaryAsk.ts`, `drgGlossaryTooltipPlacement.ts`, `drgGlossaryTermRegistry.ts`, `DrgGlossaryTermChip.tsx` and their tests | `glossaryTermMatch.ts`, `glossaryAsk.ts`, `glossaryTooltipPlacement.ts`, `glossaryTermRegistry.ts`, `GlossaryTermChip.tsx` (the folder map already gives the new names, so the move tool does these) |
| `DrgGlossaryTerm`, `DrgGlossaryTermChip`, `DrgGlossaryTermChipProps`, `DrgGlossaryTermMatch`, `DrgGlossaryTextSegment` | `GlossaryTerm`, `GlossaryTermChip`, `GlossaryTermChipProps`, `GlossaryTermMatch`, `GlossaryTextSegment` |
| `findDrgGlossaryTermMatches`, `splitTextForDrgGlossaryTerms`, `composeDrgGlossaryExplainFurtherQuestion`, `drgGlossaryExplainFurtherThreadDisplay`, `linkifyDrgGlossaryNode` | the same without `Drg` |
| `registerDrgGlossaryTermChip`, `findNextDrgGlossaryTermChipInView`, `focusDrgGlossaryTermChip`, `isDrgGlossaryTermChip`, `resetDrgGlossaryTermRegistry` | the same without `Drg` |
| prop `onDrgGlossaryExplainFurther` (chunk L125, L140, L260, L340, L359, L648-662; `StreamMarkdownPieces.tsx` L24-54; `buildAnswerBubbleElement.tsx` L123, L252, L470; `buildAnswerSections.tsx` L75, L110, L123, L160, L181; `MainTabChatTranscript.tsx` L864, L895) and `drgGlossaryEnabled` | `onGlossaryExplainFurther`, `glossaryEnabled` |
| style names `bonsai-drg-glossary-term`, `-term-text`, `-tooltip`, `-explain-further` (`DrgGlossaryTermChip.tsx` L255, L311, L343, L373; `deckAnswerWalk.ts` L241; `useDockClearanceOnFocus.test.ts` L350; the chunk and stream tests) | `bonsai-glossary-*` |
| chip id prefix `drg-glossary-` (`DrgGlossaryTermChip.tsx` L126) | `glossary-` |

If the one running the session would rather finish everything in step 3, the same table works as a last commit of
step 3; the only cost is that step 4's move map then uses the new names (the map in the folder-map file already
does).

## 4. Older libraries: no table, no words, no error

The rule (docs/lessons-learned.md, section 2): the plugin never adds a table or column to an installed library, so
every reader of something new must survive its absence, and a test against a copy with the table dropped is the
proof.

Behaviour, all of it in `glossary_for_game`:

- No library installed, or the library switch off: `{"ok": True, "installed": False, "terms": []}`.
- Installed, but built before this change (no `glossary_terms` table): found by the `sqlite_master` check,
  answered `{"ok": True, "installed": True, "terms": []}`. No exception reaches the screen, nothing is logged as a
  fault.
- Table present but no rows for the game, or the game unknown: the same empty answer.
- Any real failure (damaged file, locked disk): `ok: False`, logged once, and the screen reads it as "no words".
- Screen: an empty or failed answer means `useGlossaryTerms` returns an empty list, so `glossaryTerms.length > 0`
  is false and every paragraph is drawn exactly as it is for any other game.
- The AI's instructions: no words means no clause.

Tests that prove it (section 5): `tests/test_knowledge_base_glossary.py::test_a_library_built_before_the_glossary_gives_no_words_and_no_error`
(builds a library from the current `CREATE_SCHEMA_SQL`, then `DROP TABLE glossary_terms`, the way
`tests/test_kb_per_game_compat_pull.py` drops a column), and on the screen `glossaryStore.test.ts` and
`MainTabBonsaiAiMarkdownChunk.test.tsx` "leaves the same text plain ...".

## 5. Tests

### 5.1 Goes

| File | Tests |
|---|---|
| `tests/test_ollama_prompts_drg_glossary.py` (whole file, 5 tests) | `test_glossary_clause_present_for_drg_survivor_app_id`, `test_glossary_clause_present_by_name_without_matching_app_id`, `test_glossary_clause_absent_for_other_titles`, `test_glossary_clause_absent_with_no_game_context`, `test_glossary_clause_present_in_strategy_mode_too` |
| `src/utils/drgGlossaryTermMatch.test.ts` | the whole `describe("isDrgSurvivorAppId")`: `matches the DRG Survivor AppID`, `does not match another game's AppID`, `does not match null/undefined/empty` |

### 5.2 Changes (same tests, the built-in list replaced by `src/test-harness/glossaryTestTerms.ts`)

| File | Tests |
|---|---|
| `src/utils/drgGlossaryTermMatch.test.ts` | every test in `findDrgGlossaryTermMatches` and `splitTextForDrgGlossaryTerms` (L26-110) passes the test terms as the second argument. The comment at L28 cites `strategy_seed.json:164`; drop the line number |
| `src/utils/drgGlossaryAsk.test.ts` | both tests; the first (`names the term and the game ...`) still expects "Deep Rock Galactic: Survivor", now through `gameTitle`. Add one: `leaves the game out when the library gave no title` |
| `src/components/DrgGlossaryTermChip.test.tsx` and `.placement.test.tsx` | all 6 + 6 + 7 tests: the import of `DRG_SURVIVOR_GLOSSARY_TERMS` becomes the test terms |
| `src/components/MainTabBonsaiAiMarkdownChunk.test.tsx` describe at L76 | `marks up a curated term as a tappable chip when the turn's game is DRG Survivor` (prime the store for "2321470"), `leaves the same text plain for a non-DRG-Survivor turn` (store has words only for "2321470", the turn is "570"), `leaves the same text plain when no AppID is supplied at all`, `tapping the chip twice opens the full definition ...`, `does not mark up terms that only appear inside an unrevealed spoiler fence`. Rename the describe and the first two so they speak of "a game the library has words for". The import of `DRG_SURVIVOR_APP_ID` (L11) goes |
| `src/components/StreamMarkdownPieces.test.tsx` | the two tests that draw a chip (L190-206: `a tap on a settled piece reaches the newest callback ...` and the one at L202); import at L15 goes; they prime the store |
| `src/utils/chatSlotTurns.test.ts` L70 | comment only (names `isDrgSurvivorAppId`) |

### 5.3 Added

| File | Tests |
|---|---|
| `tests/test_knowledge_base_glossary.py` (new) | `test_the_games_words_come_back_by_app_id`; `test_a_game_is_found_by_name_when_no_app_id_is_given` (replaces the old prompt test of the same idea); `test_another_game_gets_no_words`; `test_no_game_gets_no_words`; `test_a_library_that_is_not_installed_gives_no_words_and_no_error`; `test_a_library_built_before_the_glossary_gives_no_words_and_no_error` (table dropped); `test_an_empty_table_gives_no_words`; `test_the_library_switch_off_gives_no_words` (if open question 1 is yes); `test_a_broken_library_is_logged_once_and_answered_plainly` (copy `test_a_broken_library_is_logged_once_and_answered_plainly` from `test_knowledge_base_notes_search.py`, L147) |
| `tests/test_ollama_prompts_glossary.py` (new, replaces the deleted file) | `test_glossary_clause_names_the_game_and_its_words` (asserts `GLOSSARY (Deep Rock Galactic: Survivor)`, `kiting`, `overclock`, and the whole clause text unchanged); `test_glossary_clause_present_in_strategy_mode_too`; `test_no_glossary_clause_without_words` |
| `tests/test_ollama_ask_service.py` (existing, not in this area's list) | `test_the_glossary_words_for_the_running_game_reach_the_prompt` and `test_no_glossary_words_when_the_library_has_none` (its fake `_build_system_prompt(*args, **kwargs)` at L68 and L105 already takes any keyword) |
| `tests/test_build_rag_glossary.py` (new) | `test_the_words_are_written_with_their_game`; `test_a_word_for_an_unknown_game_stops_the_build`; `test_an_empty_peek_or_definition_stops_the_build`; `test_two_words_with_one_spelling_stop_the_build`; `test_the_shipped_file_holds_the_two_deep_rock_galactic_words` (reads the real `data/kb/glossary_terms.json`; pins ids, spellings and exact text, so the words cannot drift unseen); `test_the_manifest_counts_the_words`; `test_the_build_is_repeatable_with_words` (same bytes twice) |
| `tests/test_knowledge_base_schema.py` (existing) | `test_apply_schema_creates_the_glossary_table_with_no_search_index_or_vectors`; `test_apply_schema_is_harmless_on_a_library_that_has_the_glossary_table` |
| `tests/test_plugin_zip_corpus_guard.py` (existing) | `test_planted_glossary_terms_file_fails` |
| `src/features/glossary/glossaryStore.test.ts` (new; before step 4 it sits in `src/utils/`) | `asks the back end once per game however many answers draw`; `keeps an empty answer so a game with no words costs one call`; `a library that is not installed gives no words and no error`; `a failed call gives no words and is asked again next time`; `forgets everything when the library is removed or put in place`; `gives the same list object until it changes` |

### 5.4 Stay (the chips stay)

The D-pad tests over an underlined word keep their names and bodies in step 3:
`src/utils/answerBubbleNavigation.test.ts` (the `registerDrgGlossaryTermChip("kiting-1", chip)` group, L250-365),
`src/utils/buildReplyActionsElement.test.tsx` (L384), `src/utils/answerBubbleNavigation.ringFollowsScroll.test.ts`,
`src/utils/answerBubbleNavigation.tallSectionLift.test.ts`, `src/hooks/useDockClearanceOnFocus.test.ts` (L350),
the Deck-measurement walks that use `deckAnswerWalk.ts`, and `tests/test_chat_slot_ownership.py`,
`tests/test_chat_slot_service.py`. They register fake chips; none reads the word list. Step 4's rename commit
changes their function names and one style name.

## 6. What a player notices, and the Deck check step 3 needs

**A player notices:** nothing with the updated library; plain words without it (see "In plain words").

**The Deck check** (plan 86 § 6 step 3 item 6; the deck-driver runs it on a build with the step 3 changes):

1. **Rebuild the seed library.** The deploy script already runs `python scripts/build_rag_db.py --seed --out
   build/knowledge-base-seed` (`scripts/build.ps1` L75; the PC's Ollama must hold `nomic-embed-text`). Install it
   on the Deck from the Developer tab's local install (the folder in `src/data/knowledgeBaseDev.ts`). No
   publishing is needed to test.
2. **Without a library.** Remove the library on the Ollama tab. Ask a Deep Rock Galactic: Survivor question that
   makes the AI say "kiting" (or open an older saved chat of that game). Expect: the word is plain, nothing
   underlined, no toast, no error.
3. **With the rebuilt library.** Install it, ask again. Expect: "kiting" and "overclock" underlined; focus shows
   the short peek; A opens the full text; "Explain further" asks the question with the game's name and shows the
   thread label "Explain: kiting"; B closes. The same chips show in the older saved chat.
4. **The D-pad walk over a word.** Down and Up through a long answer stop on the word once each way and move on
   (the existing documented walk; nothing about it should change). Run it once with the rig.
5. **An older library.** Install the library that is published today (or one built before step 3) and ask the same
   question. Expect: plain words, no error, notes still attached as before.
6. **The switch.** With the rebuilt library, turn "Use local knowledge base" off and ask again: plain words (if open
   question 1 is yes).
7. **Another game.** A Hades (or any other) answer that happens to say "kiting": plain.
8. Then the plan's other step 3 rows (answer's D-pad walk, free-play sweep). Unload the Deck's AI before any check
   with a game running.

## 7. How to split the work and in what order

The shared files are `ollama_prompts.py`, `main.py` and `MainTabChatTranscript.tsx`; other lanes in step 3 touch
the AI's instructions and the main screen too. Suggested order, each its own commit, in one lane after the
others have landed:

1. Back end library side: schema table, builder, `glossary_terms.json`, `NOTICE.md`, the guard name, the builder
   and schema tests. Rebuild the seed library once and check the two rows are in it.
2. Back end reader: `knowledge_base_glossary.py`, the call, the registration, the reader tests.
3. The AI's instructions: `ollama_prompts.py`, `main.py` `_build_system_prompt`, `ollama_ask_service.py`, the prompt
   tests.
4. Screen: the store, the matcher and chunk change, the ask question, the fake RPC list, the test terms, the test
   changes. Delete `drgGlossaryTerms.ts` and `tests/test_ollama_prompts_drg_glossary.py` in the commits that make
   them unused.
5. The maintainer rebuilds and publishes the library after the Deck check passes.

## Open questions for the one running the session

1. **Should the library switch turn the glossary off too?** I wrote it that way (both the call and the AI's
   instructions read `use_local_knowledge_base`), because the chips are library content and the switch means "use
   the library". The other reading is "installed is enough". It is one line in `glossary_for_game`. What settles
   it: the maintainer's wish; the cost is one test either way.
2. **No schema version bump** (section 1.2). Confirm; the reason is that a bump locks plugins already on Decks out
   of the rebuilt library.
3. **Rename timing** (section 3.5): step 4 as its own commit (my pick) or the last commit of step 3.
4. **The library's version is the build date.** A second publish on the same day looks like "no update". Say so to
   the maintainer when it is time to publish.
5. **Where the `Drg` files go.** The folder map puts the chip, matcher, ask and tooltip files in a new folder
   `src/features/glossary/` (the kit's list has no such folder) and the stop registry in `src/shared/focus/`.
   If the answer reviewer wants the chip with the answer parts instead, only the map lines change.
6. **The library words for more games** (the roadmap entry step 3 asks the bookkeeper to add) need only new rows in
   `data/kb/glossary_terms.json` and a rebuild; no code. The builder refuses a row for a game it does not hold.
7. **Matching by name on the screen.** Today the screen matches by app id only while the AI's clause also matched by
   name. I kept both behaviours (the screen asks by app id; the AI's side resolves id, then name). A turn with no
   app id but a name therefore tells the AI the words are tappable while the screen shows none. That is today's
   behaviour too; flag only if the maintainer wants it closed.

## Records found wrong (glossary part)

- **b55, `src/components/DrgGlossaryTermChip.tsx`, removal and new folder:** said "`glossary: whole file`" and
  "`goes away`"; true: the chip stays (only the type import and comments change). Same for the three other
  `glossary: whole file` records: **b59** `drgGlossaryAsk.ts` ("goes away"), `drgGlossaryTermMatch.ts` ("whole
  file"; the reader was unsure), `drgGlossaryTermRegistry.ts`, `drgGlossaryTooltipPlacement.ts`, and the three
  test files `drgGlossaryAsk.test.ts`, `drgGlossaryTermMatch.test.ts`. Only `src/data/drgGlossaryTerms.ts` and
  `tests/test_ollama_prompts_drg_glossary.py` really go. The reviewer kit already warned about this reading.
- **b56, `src/data/drgGlossaryTerms.ts`, unused or twice:** correct that the app id and terms are written twice
  (also at `ollama_prompts.py` L311-313); but the "stale comment" part is understated: the header cites
  `strategy_seed.json:164/:50/:168`, none of which holds the words any more.
- **b55, `DrgGlossaryTermChip.tsx`, surprises:** the comments about button B at L270-280 and L292-296 do disagree,
  as the record says; the chip stays, so the disagreement is now a comment to settle in step 6b, not a thing that
  goes away.
