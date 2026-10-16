# Clean-up round three: the starting point

Saved 2026-10-16 by plan 86 step 0 item 4, on `experimental` at `dd481869`, before anything was moved or removed.
Later steps compare against these files: step 5 must keep every test name here (except tests of removed features,
listed by name) and must not lower coverage; every move commit must keep the list of back-end methods.

| What | Then | File |
|---|---|---|
| Screen tests | 4,836 in 462 files, all passing (84 s with coverage on) | [baseline-test-names-screen.txt](baseline-test-names-screen.txt) |
| Back-end tests | 2,885, all passing (187 s with coverage on) | [baseline-test-names-python.txt](baseline-test-names-python.txt) |
| Screen coverage | 90.85 % of lines (38,220 of 42,069); functions 88.63 %, branches 89.08 % | [baseline.json](baseline.json) |
| Back-end coverage | 80.91 % of statements (12,493 of 15,441), `py_modules` and `main.py` | [baseline.json](baseline.json) |
| The built plugin | 3,378,277 bytes (`dist/index.js`) | [baseline.json](baseline.json) |
| Back-end methods the screen can call | 68 | [baseline-rpc-methods.txt](baseline-rpc-methods.txt) |

The repo's own size numbers (files, MB, lines) are in plan 86 § 5, "Freshness check, 2026-10-16".

**How it was measured,** so the "after" can be measured the same way:

- Screen: `npx vitest run --reporter=json --coverage.enabled --coverage.provider=v8 --coverage.include='src/**'
  --coverage.exclude='src/**/*.test.*' --coverage.exclude='src/test-harness/**' --coverage.reporter=json-summary`.
  A test's name is its file, then its full name, joined by " > ".
- Back end: `python -m coverage run --source=py_modules,main.py scripts/run_python_tests.py`, then `coverage json`.
  A test's name is `module.Class.test_name`, read from the runner's own list.
- Methods: the names in `src/types/rpcMethods.ts`, which is built from `main.py`.

---

# Step 2: every file read, and the lists the next steps work from

Made 2026-10-16 by plan 86 step 2, on `experimental` at `b5ce2768`. Nothing in the plugin changed in this step.

## In plain words

Every one of the repo's 1,498 code files (the plugin, its tests, the scripts and tools) was read and written down:
what it is for, which feature it belongs to, who uses it, anything unused or written twice, and where it should
live. From that, eight reviewers wrote the lists below. **Two of them need the maintainer's yes before step 3: the
cut lists (what the five removals and the glossary move delete or change) and the folder map (where every file
goes).** The other lists are for steps 5 and 6 and can wait.

What the lists mean for a player: nothing changes except what the plan already says goes (the Steam ban lookup,
read aloud, the UI scale section, the weekly model-list refresh, the in-panel preview tool), plus two tiny wording
changes in the AI models box (below). The glossary chips stay; only where their two words come from changes.

**Three places where the code said something the plan did not expect** (each settled from the code, each in the
maintainer's approval):

1. **The weekly refresh and the models box's "on-open catalog call" are one call.** The call the box makes when it
   opens is the overlay download itself; "weekly" is only a seven-day saved copy. So the call goes too. What the plan
   meant to keep stays: the box still asks which models are installed and how big they are. A player sees the box's
   header lose the words "Live catalog" / "Offline catalog" (it keeps "Live sizes" / "Offline sizes").
2. **UI scale: box sizes become plain numbers, and only letter sizes follow Text size.** The plan said every scaled
   size becomes "a plain number times the text scale". In the code, the box-size helper was only ever multiplied by
   the UI scale (1 for everyone today), and Text size has never grown boxes; the letter-size helper is the one that
   also follows Text size. Following the plan's words literally would make every row 15 % taller at Large text, a
   visible change. Done this way, nothing a player sees changes.
3. **`.decky/preview.json` stays.** The Deck tool reads it to tell whether the bonsAI panel is really open, so
   deleting it with the preview tool would quietly weaken every Deck check that opens the plugin.

## The lists

| List | For step | File |
|---|---|---|
| Cut list: the Steam ban lookup (and the stored Steam key) | 3 | [cut-list-ban-lookup.md](cut-list-ban-lookup.md) |
| Cut list: the weekly model-list refresh | 3 | [cut-list-weekly-refresh.md](cut-list-weekly-refresh.md) |
| Cut list: read aloud (voice input stays) | 3 | [cut-list-read-aloud.md](cut-list-read-aloud.md) |
| Cut list: UI scale (Text size stays) | 3 | [cut-list-ui-scale.md](cut-list-ui-scale.md) |
| Cut list: the in-panel preview tool | 3 | [cut-list-preview-tool.md](cut-list-preview-tool.md) |
| The glossary move into the knowledge library | 3 | [glossary-move.md](glossary-move.md) |
| Folder map: ask, answer, saved chats (474 files) | 4, 5 | [md](folder-map-ask-answer-chats.md), [tsv](folder-map-ask-answer-chats.tsv) |
| Folder map: the tabs, settings, AI models (391 files) | 4, 5 | [md](folder-map-tabs-settings-models.md), [tsv](folder-map-tabs-settings-models.tsv) |
| Folder map: knowledge library, Search tab, notes (189 files) | 4, 5 | [md](folder-map-knowledge-search-notes.md), [tsv](folder-map-knowledge-search-notes.tsv) |
| Folder map: the back end (273 files) | 4, 5 | [md](folder-map-back-end.md), [tsv](folder-map-back-end.tsv) |
| Scripts, tools, hooks, the shared test setup (171 files) | 4, 5, 7 | [md](scripts-and-tools.md), [tsv](folder-map-tools.tsv) |
| Untangling targets: settings, the D-pad helpers, the main screen's hand-downs | 6 | [untangling-targets.md](untangling-targets.md) |

Each file opens with "In plain words", ends with its open questions and the reader records it found wrong, and
cites every line at `b5ce2768` together with the block's name (line numbers move as earlier removals land).

## The cuts in numbers

| Removal | Whole files | Tests deleted | Back-end methods that go |
|---|---|---|---|
| Ban lookup | 4 (2 code, 2 test) | 40 (13 more renamed) | none (it is an Ask-box command) |
| Weekly refresh | 5 | 11 | `fetch_pull_model_catalog` |
| Read aloud | 4 code (about 1,090 lines), 7 test | about 161 (127 screen, 34 back end) | `get_voice_read_aloud_status`, `start_voice_read_aloud`, `stop_voice_read_aloud` |
| UI scale | 6 code, 5 test | 34 | none |
| Preview tool | about 19 | 4 | none |
| Glossary move | none (one data file added) | listed in its file | adds `get_rag_corpus_glossary` |

The back end's methods go from 68 to 65 after step 3 (4 go, 1 is added). Suggested landing order, from the
reviewers: preview tool, weekly refresh, ban lookup, read aloud, UI scale, then the glossary move; each list names the
shared files it touches.

## The folder map in numbers, and the session's reconciliation

The five `.tsv` files cover all 1,498 code files exactly once: **916 move, 503 stay, 74 go with a removal, 5 go to
the workshop.** No two files land on one path (checked case-blind, for Windows). The `.tsv` files are the final
word where they and a reviewer's `.md` differ; the session made these changes after the reviewers finished:

- **The shared D-pad folder is `src/shared/dpad/`, not `src/shared/focus/`** (38 rows): the D-pad pattern check
  (`scripts/check-focus-patterns.mjs:232`) treats every file whose path contains "focus" as D-pad code, so a folder of
  that name would flag files that pass today. The `.md` files still say `focus/`.
- **`src/utils/streamMarkdownPieces.ts` moves as `src/features/answer/stream/streamMarkdownSplit.ts`** (and its test):
  it would otherwise sit beside `StreamMarkdownPieces.tsx`, and on Windows `import "./streamMarkdownPieces"` could
  pick either.
- **One folder name per feature across the maps** (18 rows): the tabs map and the first map had used old names for
  folders the first map merged (`chat-slots`, `unified-input`, `details-slot`, the answer's style files); the Text size
  tests go to `src/shared/text-size/` with the Text size code.
- **Two rows matched to the cut lists:** `src/hooks/usePullModelCatalog.ts` goes (weekly refresh); `.decky/preview.json`
  stays.

The move tools refuse "stays" and "goes" lines: step 4 strips them first (`awk -F'\t' '$2 != "-" && $1 != $2'`).
Several tests and scripts find files by counting folders or by paths built from pieces, which the move tools cannot
see; the maps list them (the ask/answer map § 2b, the tabs map § 2.1, the back-end map, the knowledge map), and they
need a small "folder-proof" commit before the moves.

## How it was made, and how good it is

- **A script with no AI** listed, for every code file: its size, how much of it is explanation, who imports it, what
  it imports, its tests, which removals it mentions, and when it last changed. Two of its limits were found by the
  readers: it does not follow one test file importing another, nor files loaded by path.
- **93 readers on Haiku 5.5 high** (92 batches of 1 to 20 files, plus one for 3 files the first readers skipped) wrote
  one record per file: 1,498 records.
- **The one running the session checked 162 records by hand** (about one in ten) against the code, plus a mechanical
  check of every record (every cited line exists, every removal range really holds the feature, every "unused" name).
  Seven hand-checked records were wrong, three of them in a way that mattered: a glossary test marked for deletion
  although the chips stay, a storage-key file said to be imported where it is copied, and three files with no record.
  The rest were small (a shortened path, a line past the end of a file).
- **Eight reviewers on Sonnet 5.5 high** checked about 640 records against the code and found about 70 wrong or
  incomplete, mostly in two fields: what a removal must cut (a call site inside a function that stays, a test count
  that drops) and who uses a file (a test that reads it by path). The purpose, feature and folder fields held up.
  Every list above was written from the code, with the records as the starting point.
- **The working files** (the script and its facts, the reader kit, every record, the checks and the spot-check log)
  are kept in the workshop: `workshop:audit/clean-up-round-three/step-2/`.

## Step 3: the test names that went and came

Step 3 (the five removals and the glossary move, 2026-10-16) changed test names on purpose. Every one is in
[step-3-test-name-changes.txt](step-3-test-name-changes.txt): 289 names went and 80 came, between `8553cc99` and
`fd56e160`, each named by a step 3 helper's own list or, for one contract case, by the ban lookup's cut list. Step 5
compares the names after merging against the starting point above minus the "went" lines, plus the "came" lines.
