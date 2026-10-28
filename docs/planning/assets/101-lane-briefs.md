# Plan 101: the briefs, one per helper

How a brief is assembled: the session hands each helper `101-helper-rules.md`, the section below with its letter, the
tip hash, the absolute path of its copy, and the plan number (101). Nothing else is needed. A section says: what a
player sees today, where it comes from (files and the reading behind it), what to build, the files owned, the tests,
and the check that proves it (the row, plan 101 § 14). File facts were read at tip `efc221b` on 2026-10-27 by the
planning chat; the session re-checks each brief against the code at go and corrects the task text where they drifted.
The contract (plan 101 § 10) and the recipes (§ 11) are law for every lane.

Model and effort per lane are in plan 101 § 12. A lane that finds its brief wrong says so and stops rather than
building the brief's mistake.

---

## K0 — The bookkeeper's pre-go audit (★ docs, Sonnet medium; the same brief again as K9 at the end)

**Fix, each named in your report:** (1) Append decision D138 from `docs/planning/assets/101-decision-d138.md` to the
end of `docs/audit/maintainer-decisions-locked.md`, word for word, in the house shape of D137; check 138 is free
first. (2) In `docs/roadmap.md`, the "Deep mod AI hints" entry: status "OPEN; plan 101 running since <date>"; the three
launcher entries and the knowledge-base entry (`docs/roadmap-kb.md`) say the same. (3) In `docs/testing.md`, one row per
check in plan 101 § 14 (P101-PERM-01, P101-ICON-01, P101-TAG-STOP-01, P101-SHEET-01, P101-ROW-01, P101-ANSWER-01 to 03,
P101-STRATEGY-01, P101-ANTICHEAT-01, P101-CHIP-01, P101-DETAILS-01, P101-NOGAME-01, P101-WIN-01 to 03, and the M0
before-state rows), status open, evidence file named `plan101-<ROW>.json`. (4) Every link resolves. **Files owned:** the
four documents above. Report the file list; the session commits.

## R — Mod knowledge sources (★★ `[KB]`, Sonnet high, read-only; nothing in the repo)

**What this is.** The maintainer wants the knowledge base to answer "what's wrong with my load order" and "do these two
mods clash" offline (the ★★★ entry in `docs/roadmap-kb.md`). This lane finds out what may be taken, from where, under
which licence, in what shape. **Known so far (plan 101 § 7d):** LOOT's masterlists (github.com/loot/<game>) are CC0; the
Fallout 4 one holds several hundred plugin entries with load-after, requires, incompatible-with, warning messages and
dirty-version notes in YAML. The Cyberpunk community wiki (wiki.redmodding.org) is the likely Cyberpunk source; its
licence is unchecked. Nexus Mods pages are never copied. **Do:** for Cyberpunk 2077, Fallout 4, Skyrim SE and
Stardew Valley, list every candidate source with its licence line quoted, what it holds, and whether the knowledge
base's rule allows it (`docs/knowledge-base.md`; no GFDL, no NonCommercial, every sentence from a page the fetcher read
or marked "Researched, unconfirmed"). Propose the shape of a LOOT-based load-order check on the device (a few hundred KB
per game, matched against the plugin names the look found) and of per-game mod cards. **Report:** a markdown file in
the workshop's `planning/assets/101-mod-knowledge-sources.md`, plus the numbers in your report. **Never** write a card
or touch the repo.

## S — The snapshot script (★ `[platform]`, Sonnet medium)

**What this is.** The lanes build on general knowledge until a real machine's listing confirms a path. This script
makes that listing without reading any file's contents. **Build:** `scripts/mods/snapshot_mod_folders.py <folder>...
[--out <file.json>]`: for each folder given, walk it to depth 4, record relative path, size and modified time for every
entry (directories and files), never contents, never anything under a folder named `saves`, `Saves`, `SaveGames` or
`Documents/My Games/*/Saves`; refuse to follow symbolic links; stop at 20,000 entries with a note. Also `--steam`:
record Steam's library list file and every `appmanifest_*.acf` (name, number, install folder only). Works on Windows
and SteamOS (`pathlib`, no shell). **Tests:** a fake tree with a symbolic link and a saves folder; the output is
stable JSON. **Files owned:** `scripts/mods/snapshot_mod_folders.py`, `scripts/mods/__init__.py` if needed, its test
under `tests/`. **The run** is the maintainer's: the PC's Cyberpunk folder, Vortex's home under `%APPDATA%`, the
Steam libraries; the Deck's Cyberpunk folder, its prefix's `drive_c/users/steamuser/AppData/Local/CD Projekt Red`, and
Fallout 4 with its Mod Organizer 2 if present. Outputs go to the workshop's `test-evidence/plan101-snapshot-<machine>-
<what>.json`; never into this repo. **Row:** none; lane M consumes the listings.

## A — Finding the game (★★★ `[platform]`, Sonnet high)

**What a player sees today.** bonsAI knows two fixed Steam folders under the home folder
(`py_modules/backend/ask/proton_troubleshooting_logs.py`, `steam_roots_for_home`, line 77) and reads one manifest for a
game's name (`py_modules/backend/media/screenshot_media.py`, lines 523 to 530). A game on the SD card or a second
library is invisible; the maintainer's Cyberpunk is on `E:\SteamLibrary`. **Build:** `py_modules/backend/mods/
steam_library.py` with `find_game_folder(app_id, *, home, platform)`, `list_installed_games(*, home, platform)` and
`path_allowed_for_mod_read(candidate, roots)` as § 10b names them. Roots: on SteamOS the two folders above plus every
path in `steamapps/libraryfolders.vdf` (a small key-value text file; parse it with a strict, tiny reader, no library);
on Windows `C:\Program Files (x86)\Steam` plus the same file; a root is used only if it exists. The manifest gives
`installdir` and `name`. The allowlist mirrors `path_allowed_for_proton_log` (line 85): real path, must sit under an
allowed root plus the separator, never through `pfx/dosdevices`. Write `py_modules/backend/mods/__init__.py` with the
house header in your first commit and never touch it again. **Tests:** `tests/test_mods_steam_library.py` on fake trees
for both layouts: a second library, an SD-card path, a missing manifest, a symbolic link out of the root, a Windows
drive letter path. **Row:** P101-ROW-01 (the installed games), P101-WIN-02 (the game on E:).

## A2 — The launcher adapters (★★ `[platform]`, Sonnet high)

**What this is.** Three roadmap entries (Heroic, Lutris, Windows launchers; `docs/roadmap.md`, ★★ each) built beside
the Steam look. On the Deck a launcher's game runs as a Steam shortcut with a made-up number, so the name is the key.
**Build:** `py_modules/backend/mods/launchers.py` with `find_launcher_game(name, *, home, platform)` returning the same
folder object A returns, `found_by` set to the launcher; readers for Heroic's installed lists (its settings folder on
SteamOS, the Flatpak folder, `%APPDATA%\heroic` on Windows; GOG and Epic lists are separate JSON files), Lutris's
`pga.db` (SQLite, read-only, the games table's name and directory), GOG Galaxy's `galaxy-2.0.db` and Epic's `.item`
manifests on Windows. Every path is in plan 101 § 11 and is **suspected** until lane M confirms it: say so in the
result's `warnings`. Name matching: case-insensitive, punctuation-insensitive, the shortcut's name against the
launcher's title. **Tests:** fake files for each launcher, both platforms, a name that matches two games (prefer the
exact one, else warn). **Files owned:** `launchers.py`, `tests/test_mods_launchers.py`, fixtures under
`tests/fixtures/mods/launchers/`. **Row:** P101-NOGAME-01 (a shortcut no launcher knows says where it looked); a
launcher row on the Deck only if the maintainer has a Heroic or Lutris game there.

## B — The permission switch (★★ `[perms]`, Sonnet high)

**What a player sees today.** Five switches; "Read game & screenshot context" is two keys shown as one row
(`src/features/permissions/PermissionsTab.tsx`, `gameContextReadEnabled`, line 90; `permissionDeepLink.ts` maps both
keys to one target). The keys live in `py_modules/backend/core/capabilities.py` (`CAPABILITY_KEYS`, line 70; existing
installs get all-on except two, `legacy_grandfather_capabilities`, line 115). **Build:** the key `game_install_read`,
default off, **off for existing installs too** (listed with the microphone and downloads in the legacy function); the
Permissions row "Read game install folders" with the description "Reads the list of mod files, their settings and the
game's own settings in your game folders and your mod manager's profile. Never changes them."; the confirm box on
turning it on, in the two-button shape (`src/styles/confirmBoxButtons.ts`): the words from mock-up D; the Kids lock
forces it off (`useKidsLock.ts`, line 37); the deep-link target `game_install_read` and the deny message "Enable Read
game install folders in Permissions to let bonsAI see your mods."; the search index row (`bonsaiSettingsIndex.ts`,
line 72 is the model); the schema and normalizers; the two contract files `tests/contracts/settings-defaults.json`
and `settings-hostile-inputs.json`; the geometry table `src/test-harness/tabBodyDeckGeometry.ts` (line 73 lists the
Permissions rows). **The full file list is what the last switch touched:** `git grep -l internet_downloads` (45 files);
own exactly those, no file another lane owns. **Tests:** the existing ones for the last switch, copied by name, plus
the legacy-off case. **Row:** P101-PERM-01, P101-WIN-01.

## C — The recipes and the reader (★★★★ `[platform]`, Sonnet high)

**Build:** `py_modules/backend/mods/mod_recipes.py`: `RECIPES` as data, one per game from plan 101 § 11 (Cyberpunk
from § 4 first, status "seen"; Bethesda, BepInEx, SMAPI, Workshop, status "suspected"), each naming its mod folders by
kind, its framework files and how the version is read (a log's header line, a file name), its load-order file, its
loader logs, its settings file per platform (Windows local app-data; the fixed prefix path on SteamOS); `recipe_for(
app_id, name)`. `py_modules/backend/mods/mod_look.py`: `look_at_game_mods(app_id, *, want_logs=False)` that takes the
folder from A's finder (a fake until A lands), applies the recipe and D's manager readers, keeps the budgets of § 11
inside the reader, checks the allowlist before every open, never follows `pfx/dosdevices`, fills § 10a exactly, and
runs off the event loop the way the Proton collector does (`game_ai_request.py`, `run_in_executor`, line 435);
`cached_game_mods_look`, `remember_game_seen`, `last_game_seen` (per session, in memory). The loader-log tails (40
lines each) are read only with `want_logs`. **Tests:** `tests/test_mods_look.py` on a fake Cyberpunk tree shaped like
§ 4 (made-up names), a Bethesda tree, a BepInEx tree, an empty game, a tree past the budgets, a link escape, a Windows
tree. **Row:** P101-SHEET-01 (the sheet's rows), P101-WIN-02.

## D — The manager list readers (★★★ `[platform]`, Sonnet high)

**Build:** `py_modules/backend/mods/manager_lists.py`, four pure functions on text: `read_vortex_manifest(text)` (the
deployment manifest: `files[]` with `relPath` and `source`, the source's name carrying the Nexus number and version
after its last dashes; group by source; count the mods), `read_mo2_modlist(text)` (`+name` enabled, `-name` disabled,
`*` separators, newest first), `read_r2modman_mods(text)` (a YAML list; parse the few keys needed with a small strict
reader, no library), `read_workshop_acf(text)` (a count and the item numbers; the file's exact keys are unchecked, so
read defensively and warn). Each returns the manager part of § 10a. **Fixtures:** `tests/fixtures/mods/` with a
cut-down Vortex manifest in the maintainer's shape (made-up names), a modlist, a mods.yml, a Workshop file.
**Tests:** `tests/test_mods_manager_lists.py`. **Row:** P101-SHEET-01 (manager and count), P101-WIN-02.

## E — The block for the AI and the Show details chip (★★★ `[KB]`, Sonnet high)

**What a player sees today.** Show details lists chips per thing the AI was given (`py_modules/backend/answer/
transparency_service.py`, `build_context_chips_manifest`; the Proton chip's id "proton_logs" at line 570;
`build_proton_log_transparency` at 328 is the model). **Build:** `py_modules/backend/mods/mod_context_block.py`,
`build_mod_context_block(look, question, *, budget_bytes)`: the summary first (manager, frameworks with versions,
counts, the load order), then loader-log errors, then **the mods whose names appear in the question** with their
settings when the recipe read a settings file, cut at the budget, never past it; the words "seen"/"suspected" from
the look's confidence; one line saying what was not read. Speed mode gets the summary only. In `transparency_service.py`
(this lane alone): `build_mods_transparency(look, attached)` and a chip "Mods" in the manifest listing what was read
and how many mods. **Tests:** budget cuts, name matching ("react_to_horn" in the question), empty look, suspected
wording. **Row:** P101-DETAILS-01, P101-ANSWER-02.

## F1 — The words (★★ `[ask]`, Sonnet high)

**What a player sees today.** A question with "mods" in it gets no troubleshooting treatment: the phrase gate
(`py_modules/backend/prompts/ask_topic_instructions.py`, `_user_asks_deck_troubleshooting_or_compat_line`, line 280)
has no mod words, so no Proton log is attached and no troubleshooting line is added to the prompt
(`ollama_prompts.py`, the `middle` assembly at lines 596 to 602). **Build:** mod vocabulary in the gate with word
boundaries (`mod`, `mods`, `modded`, `load order`, `bepinex`, `smapi`, `skse`, `f4se`, `mod organizer`, `mo2`,
`vortex`, `r2modman`, `thunderstore`, `workshop item`, `.esp`, `.esl`, `redmod`, `cet`), never matching "model",
"modem" or "moderate"; the model-policy gate (`ollama_prompts.py`, lines 361 to 383) keeps winning on "model policy".
A `MOD_CONTEXT_LINE` beside `DECK_TROUBLESHOOT_GAME_SETTINGS_LINE`: bonsAI reads only what the look returned; never
name a version or a load-order position it did not see; never say two mods are compatible; never advise deleting the
prefix or a save without a backup step first in the same answer; ask which manager before path steps when the look
did not say; never an anti-cheat workaround or a ban prediction, and the community's rule of thumb when mods and
online play meet. The Strategy rule: the unmodded answer first, then where a present gameplay mod changes it.
**Tests:** the gate's word-boundary cases, the line's presence per mode. **Row:** P101-ANSWER-03, P101-STRATEGY-01,
P101-ANTICHEAT-01.

## G — Knowledge cards (★★ `[KB]`, Sonnet high)

**What a player sees today.** 166 cards in 27 topics, none about mods (`data/kb/compat_patterns.json`; the router
`py_modules/backend/knowledge/compat_topic_router.py` has no mods words; `tests/test_compat_topic_router.py::
test_every_corpus_topic_can_be_reached` fails on a topic the router cannot reach). **Build:** a `mods` topic of about
fifteen cards in your own words, each marked "Researched, unconfirmed" like the four tips that carry that mark: what
Vortex, Mod Organizer 2, r2modman, the Workshop, BepInEx, SMAPI, the script extenders, CET and REDmod are and where each
puts things; a manager keeps mods outside the game folder (Mod Organizer 2, r2modman) or inside it (Vortex); the
prefix on SteamOS versus app-data on Windows; back up saves and the prefix before changing a load order; the Heroic and
Lutris caveat; anti-cheat and online play (the rule of thumb from plan 101 § 7d point 8); "bonsAI cannot see mods a
manager has not deployed". The router's words for the topic (`_TOPIC_RULES`, with the "lan " lesson in mind: no bare
"mod" that matches "model"). **Tests:** the drift test passes; four plain questions route to `mods`. **Files owned:**
the cards file, the router, their tests. **Row:** P101-ANSWER-03 (a card attached), P101-ANTICHEAT-01.

## F3 — The screen's trigger, the store and the plugin methods (★★ `[platform]`, Sonnet high)

**What a player sees today.** The question box's game tag follows the running game on a two-second poll
(`src/features/ask/flow/useOllamaGameContextSync.ts`, `Router.MainRunningApp`); the back end learns the game only per
question and remembers nothing. **Build:** `py_modules/backend/mods/mods_rpc.py` with `get_game_mods_look(app_id,
refresh=False)`, `list_game_mods_targets()`, `note_game_mods_seen(app_id)` (starts the look in the background through
C's functions, remembers the game); the three methods on `main.py` as one-line hand-offs, in one commit; the switch
checked first (off: `{"ok": false, "error": "permission_off"}`). Screen side: `src/features/mods/modsLookStore.ts` (the
last result per game, `useModsLook(appId)`), `useModsLookSync.ts` called from the game sync hook on a game change (note,
then fetch, through `callDeckyWithTimeout`); the store holds a fake result behind a flag until the back end lands, so H
and H2 build against it. **Tests:** the sync fires once per game change; the store; the Python methods with a fake look.
**Row:** P101-ICON-01 (the look ran when the game was seen), P101-ROW-01.

## H — The Mods row and sheet on the Search tab (★★★★ `[ui]`, Opus medium; the advisor before landing)

**What a player sees today.** The Search tab: the game row from the chats' game titles, the find box, eight word
buttons, then your notes (`src/features/search-tab/SearchTab.tsx`; the moves are written by hand in `searchNav.ts` and
`useSearchNav.ts`; a game note opens as a sheet inside the tab, `GameNoteSheet.tsx`, because a Steam popup would rebuild
the tab). **Build (mock-up B, `docs/demos/mockup-board-3`):** a group line "<game>'s mods" and one row "Mods seen · 133 ·
Vortex · 5 frameworks" under the find box for the running game (or the picked installed game), from the store; A opens
`ModsSheet.tsx` inside the tab: the title and "Checked N min ago"; "What bonsAI saw" rows (manager, frameworks, game,
loader logs, game settings) with the longer text in the strip at the bottom (`TabHelpStrip` from the folded tabs); "The
mods, in groups" as folded lines with counts (the `FoldedSection` shape), the items as one-line rows; the line "bonsAI
reads these files and never changes them."; Refresh (calls `get_game_mods_look(app_id, refresh=True)`) and Ask about my
mods (puts "What mods do I have, and could any be causing trouble?" in the question box and switches to Main); B
closes to the row. The game row gains the installed games (`list_game_mods_targets`) after the chats' games. Every
stop's Up, Down, Left, Right written in `searchNav.ts` as the tab's others are; the sheet state in `searchTabStore.ts`
so a rebuild keeps it. **Write the focus-graph section before the control exists** (`docs/focus-graph.md`, the Search
tab section). **Tests:** the row's and the sheet's stops, a bounded walk with no stop visited twice, the store fake.
**Row:** P101-SHEET-01, P101-ROW-01.

## H2 — The game-tag door (★★★ `[ui]` `[focus]`, Opus medium; the advisor before landing; up a tier after two Deck failures)

**What a player sees today.** The game tag in the question box's strip is a label, not a stop (`src/features/ask/bar/
AskStripGameTag.tsx`, plan 84); the strip's stops are the paperclip, the microphone and Ask (`MainTabUnifiedAskBar.tsx`,
`useMainTabAskBarFocus.ts`). **Build (the maintainer's ask, plan 101 § 7d point 1):** a small mods icon drawn beside the
game's name when the store holds a look with mods for that game; the tag becomes a stop in the strip's row between the
paperclip and the mode chip (Left and Right reach it; Up and Down as the strip's others); A, or a tap, switches to the
Search tab with the Mods sheet open for that game (through the search tab store); B there returns to the Main tab with
the ring on the tag. Without mods seen the tag stays a label and no icon shows, so nothing changes for a game with no
mods. Use `takeNavFocus` for the tab switch, never a DOM focus (AGENTS.md). **Write the focus-graph section first**
(`docs/focus-graph.md`, "The ask box's strip"). **Tests:** the strip's row with and without the icon, a bounded walk.
**Row:** P101-ICON-01, P101-TAG-STOP-01, P101-WIN-01.

## F2 — The wiring in the Ask (★★★ `[ask]`, Sonnet high; waits for A, C, D, E)

**What a player sees today.** On a troubleshooting question with the logs switch on, the Proton log tail is read off
the event loop and stacked with the knowledge cards under one byte ceiling (`py_modules/backend/ask/game_ai_request.py`,
lines 405 to 460 and 652; `py_modules/backend/knowledge/knowledge_base_chips.py`, `stack_context_blocks`, line 388, 100
KiB); the Proton excerpt is cut at 4 KB (`proton_troubleshooting_logs.py`, line 65); the progress phases are listed in
`py_modules/backend/answer/bonsai_stream_tags.py` (lines 97 to 101). **Build:** the game's number for the look from the
running game, else the question's title (`py_modules/backend/knowledge/knowledge_base_game_match.py`,
`resolve_title_from_question`, line 47, then A's installed list for the number), else `last_game_seen()`; the cached
look (with the log tails when the question matches the troubleshooting gate), E's block stacked **first**, then the
logs, then the cards, under the ceiling; a "reading_mods" phase with its words; the Show details chip through E's
builder; the answer's wording about which game it used in the transparency notes. **The caps:** build the numbers as
constants in one place and **do not change the Proton cap or the ceiling until the maintainer confirms the measured
numbers (plan 101 § 15)**; measure three real prompts on the Deck's model first and report them. **Tests:** the three
ways the number is found, the stacking order, the phase. **Row:** P101-ANSWER-01, P101-ANSWER-03, P101-WIN-03.

## J — The preset chip (★ `[chips]`, Sonnet medium; waits for F3)

**Today:** chips about mods exist but are hidden with every beta chip (`src/features/preset-carousel/presets.ts`,
`SHOW_BETA_PRESET_CHIPS`, line 245 "Suggest mods or tweaks for this game"). **Build:** one chip "What mods do I have, and
could any be causing trouble?" offered only when the store holds a look with mods for the running game; the hidden mod
chips reviewed (keep, reword or drop, each said in the report). **Row:** P101-CHIP-01.

## P — The PC command (★ `[platform]`, Sonnet medium; waits for C, D)

**Build:** `scripts/mods/look_game_folder.py <folder> [--recipe <id>] [--platform windows|steamos]`: runs C's reader
and D's list readers on a folder given on the command line, prints the § 10a result as plain lines (never a file's
contents beyond what the look returns), for a quick check on any machine. **Tests:** on the fake trees. **Row:** none;
a tool.

## M — Fixtures from the real listings (★★ `[platform]`, Sonnet medium; waits for S's run, C, D)

**Build:** from the maintainer's listings in the workshop (`test-evidence/plan101-snapshot-*.json`): replace the
made-up trees in `tests/fixtures/mods/` with trees that have the real folder shapes and counts but **made-up or tame
names** (the listing itself never enters the repo); flip a recipe's status in `mod_recipes.py` from "suspected" to
"seen" only where the listing confirms every path the recipe names, and say which in the report; note every path that
differed for the session. **Row:** none; the tests.

## L — Docs (★ docs, the bookkeeper; waits for everything)

The README's "bonsAI will not claim" list (plan 101 § 9), the Permissions section of `docs/troubleshooting.md` (the
new switch, its words), `docs/guide.md` (the Search tab's Mods row and sheet, the icon on the game tag, the Windows
line). Files owned: the three documents.
