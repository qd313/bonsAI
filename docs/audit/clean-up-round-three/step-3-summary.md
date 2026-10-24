# Plan 86 step 3: five features removed, the glossary words moved

Done 2026-10-16, one evening (about 22:10 to 01:00 UTC), on `experimental` from `8553cc99`. Run by one Opus 5.5
chat at extra-high effort, with six Sonnet 5.5 high helpers (one per change), two bookkeepers and three Deck
helpers. Nothing pushed. The plan's log is [plan 86 § 12](../../planning/86-clean-up-round-three.md#12-progress-log).

## In plain words

Five things are gone from bonsAI, as the maintainer decided on 2026-10-10:

- **The Steam ban lookup.** Its switch on the Permissions tab, its section on the Developer tab (with the Steam Web
  API key box), its Ask-box command and its suggestion chip. The saved Steam key is wiped from the settings file the
  first time the new version opens.
- **Read aloud.** The speaker in the corner of every answer and "Voice replies" in Settings. Voice input (the
  microphone) works exactly as before. Answers are a little shorter now (17 pixels), because the strip that held the
  speaker went with it.
- **UI scale.** The Settings section that only the Developer tab showed. Every size in the panel is now a fixed
  number; nothing looks different, because the panel was always at the normal size. Text size still works everywhere.
- **The weekly model-list download.** The AI models box no longer fetches a list from GitHub. It still shows which
  models are installed and how big they are; its header says "Live sizes" and no longer says "Live catalog".
- **The in-panel preview test tool.** A developer tool that never worked. A copy is kept in the workshop.

And **the glossary words moved**: "kiting" and "overclock" in Deep Rock Galactic: Survivor answers now come from the
downloadable knowledge library instead of being built into the plugin. With the updated library nothing changes;
without it, or with an older one, the two words are plain text, with no error.

The code got smaller: about 13,000 lines deleted and 2,600 added (most of the additions are the glossary's new tests
and its library table). The built plugin is 3,277,158 bytes, down from 3,378,277. The back end's methods went from 68
to 65.

## What the maintainer needs to do

1. **Publish the rebuilt knowledge library** (a point release), so players keep the underlined words. The library's
   version is its build date, so a second publish on the same day looks like "no update"; publish once.
2. **Post the issue for the Deck tool's repo**: the text is in `workshop:held-back/preview-tool/deck-tool-issue.md`.
3. **Push both repos** when happy: bonsAI's `experimental`, and the workshop's `main` (its preview-tool copy).
4. **On the Deck**: the voice engine is installed again (tonight, through the plugin's own button), and the
   knowledge library now sits on the Deck's own drive rather than the SD card (your call). Three leftovers are yours
   to delete when you like: `~/bonsai-settings-backup-p86s3.json` (the
   settings backup from tonight; it still holds the old Steam key, which is gone from the live settings),
   `~/p86-backup/` (a copy of the published library taken before the glossary checks) and
   `~/.bonsai/cache/pull_model_catalog_overlay.json.p86-old` (the old downloaded model list, moved aside).
5. **Calls the bookkeeper left for you** (on the roadmap): whether "Spoilers by voice", "Voice follow-ups" and
   "Headset mode" still make sense without read aloud; the bookkeeper retired the parked voice ideas that only read
   aloud could carry (trained voices, voices for the characters, full-quality reading from a PC). Say if any of those
   should stay parked instead.

## Technical summary

### The changes, in landing order

Each helper worked in its own copy of the repo from `8553cc99` with its approved cut list
([cut lists](README.md#step-2-every-file-read-and-the-lists-the-next-steps-work-from)), ran only light checks, and
named every test it deleted. The session read each change, landed it with `scripts/land_lane.sh` (the full test sets,
the build, the D-pad pattern check and `verify.py --quick` after every landing), and replayed the later helpers on top
of what had landed.

| Change | Commits | Main files |
|---|---|---|
| Preview tool | `ebd791d0`, `044bedc3`, `ca436256` | deleted `src/preview/` (3 files + test), `tests/preview-suite/` (11), `scripts/run-preview-suite.mjs`, `scripts/build-preview.mjs`, two tool-server workflow notes; edited `src/index.tsx` (the hook call), `package.json` (3 commands), `packages/bonsai-mcp/src/server.ts` and `architectureMaps.ts`, `packages/bonsai-mcp/scripts/generate-architecture.mjs` and `smoke-architecture.mjs`, `scripts/architecture_maps.py` (the preview-tiers map). `.decky/preview.json` stays (the Deck tool reads it) |
| Weekly refresh | `5283c0b3`, `8bfeb0b9`, `3970a4b0` | deleted `py_modules/backend/services/pull_model_catalog_service.py`, `data/pull-model-catalog-overlay.json`, `src/hooks/usePullModelCatalog.ts`, `src/utils/pullModelCatalogRefresh.ts`; `fetch_pull_model_catalog` gone from `main.py` and `ollama_local_setup_rpc.py`; `src/components/PullModelsModal.tsx` uses the built-in list; `src/utils/mergePullModelCatalog.ts` keeps only the tag helpers; `src/hooks/useLocalOllamaSetupFlow.tsx` toast |
| Ban lookup | `357e5b55` | deleted `steam_vac_service.py`, `vac_check_commands.py`; edited `main.py`, `capabilities.py`, `settings_service.py` (the key setting goes; `_scrub_retired_steam_settings` in `load_settings` rewrites the raw file once, through a temp file and a swap, never logging a value), `ask_local_command_handlers.py`; screen: `PermissionsTab.tsx`, `permissionDeepLink.ts`, `permissionJumpRegistry.ts`, `useKidsLock.ts`, `DeveloperTab.tsx`, `developerTabFolds.ts`, `developerRowsAnimations.tsx`, `ChatTranscriptHintRows.tsx`, `chatTranscriptNavHelpers.ts`, the settings lists (`bonsaiSettingsSchema.ts`, `bonsaiSettingsNormalizers.ts`, `usePluginSettings.ts`, `settingsPayload.ts`) and both contract files |
| Read aloud | `8bcf0160`, `181c30ef` | deleted `voice_read_aloud_service.py`, `src/hooks/useReadAloud.ts`, `useReadAloudAutoStop.ts`, `src/styles/sections/answerBubbleCorners.ts`; three methods gone from `main.py` / `voice_rpc.py`; `src/features/voice/useVoiceAskWithReadAloud.ts` keeps only "Ask while listening waits for the final text"; `buildAnswerBubbleElement.tsx`, `replyStopRegistry.ts`, `answerBubble.ts` lose the speaker; `voice_reply_mode` gone from both sides and the Settings tab |
| UI scale | `4c8e726c`, `aa021567`, `435dfac3` | 220 `uiScalePx(N)` calls in 15 style files became `Npx`; 43 `uiTextPx` became `textPx` (letters still follow Text size); deleted `uiScalePx.ts`, `SettingsTabUiScaleSection.tsx`, `SettingsTabUiScaleSlider.tsx`, `UiScaleContext.tsx`, `uiScaleProfile.ts`, `useUiScaleProfile.ts`; edited `src/index.tsx`, `BonsaiModalScope.tsx`, `useBonsaiScopeStyle.ts`, the Ask bar surface hook, the tab bar, the Settings tab and its folds, and the settings lists on both sides |
| Glossary move | `447fc2af`, `cf724c9f` | new `data/kb/glossary_terms.json`, `py_modules/backend/services/knowledge_base_glossary.py` (`glossary_for_game`, `glossary_for_prompt`), `src/utils/glossaryStore.ts`, `src/test-harness/glossaryTestTerms.ts`; the call `get_rag_corpus_glossary` in `rag_corpus_rpc.py`; `scripts/build_rag_db.py` and `knowledge_base_schema.py` write and check the `glossary_terms` table; `ollama_prompts.py` / `ollama_ask_service.py` take the words from the library; deleted `src/data/drgGlossaryTerms.ts`; the matcher, chunk and transcript read the store |
| Documents | `a9d17637`..`fd56e160`, then `697d1e82` and the three before it | the guides, focus graph, design notes, tool-server notes and AGENTS.md (which only shrank); then the roadmap, testing documents, changelog, README and the shelved list's size ceiling (back to 20 KB) |

### How the new glossary reading works

The library gets a table, not a new kind of note, so the words never turn up as search results or chips. The back
end's `glossary_for_game` finds the running game by app id, then by name, and answers "no words" when there is no
library, the "Use local knowledge base" switch is off, the game is unknown, or the library has no `glossary_terms`
table (checked in `sqlite_master`, so an older library is never an error). The screen's store asks once per game,
as soon as the chat knows the game and before the answer streams, so the first words never redraw an answer
mid-reveal; it listens for library changes only while a reply is on screen, so it never takes the library section's
own notice. No library format bump: a bump would lock plugins already on Decks out of the rebuilt library.

### What came up, and how it was handled

- **A helper's middle commit could fail a check on its own.** Three helpers (weekly refresh, ban lookup, glossary)
  split back end and screen into separate commits, which left a commit that calls a method that is gone, keeps one
  nobody calls, or reads a contract file the other side has not caught up with. The session folded those commits into
  one before landing, so every commit on `experimental` passes by itself. The cut lists' "commits that cannot be
  split" groups were the cause: next time, ask for groups that are each green.
- **Landing order with shared files.** All six started together from the same commit. The session replayed read aloud
  and the glossary onto what had landed (only the generated method list and one `main.py` header clashed); the UI scale
  helper rebased itself onto read aloud, keeping read aloud's two "removed settings still load" tests and adding its
  keys to them.
- **One test failed once under load** (the Ollama tab's "Install Ollama" box test) at the UI scale landing and passed
  on the retry; 20 more runs, alone and twelve at once, all passed. On the roadmap's watch list.
- **Old preview run reports** sat in `tests/preview-results/`, hidden by an ignore line the removal took out. They went
  to the workshop with the tool's copy.
- **The step 4 folder map lacked the nine files the glossary move added.** Rows added beside their neighbours
  (`74dd3067`); every deleted file already had a "goes" row.
- **The bookkeeper helper type was not available** in this chat, as in plan 87; a general helper on Sonnet medium with
  the bookkeeper file as its instructions did the job.
- **Test names:** against `8553cc99`, 289 names went and 80 came; each is named by a helper's own list, except one
  contract case that the ban lookup's cut list names. The record is
  [step-3-test-name-changes.txt](step-3-test-name-changes.txt), for step 5.

### What the maintainer could have done differently

Very little; the approved lists made this a mechanical evening. Two small things: the session started at 91 % of the
five-hour window, which only worked because the window reset ten minutes later (the maintainer's call, and a fair
one); and the bookkeeper helper type not loading in chats started from another chat has now cost two sessions a
workaround, which is worth a look at `.claude/agents/bookkeeper.md`.

## The Deck block

Build `cf724c9f` on the Deck's own screen. Evidence in `workshop:test-evidence/plan86-*.json`.

**Before the changes** (build `ca436256`, block A, 20 of 20 passed): the size and spacing of every part of the panel
on every tab, at Small and Large text.

**After, first half** (B0 to B4):

- The saved Steam key and the ban-lookup permission were gone from the settings file right after the first open.
- Settings shows 8 sections, Permissions 4 switches, Developer 5 sections; their walks are clean.
- The AI models box reads "Live sizes" with no "catalog", and opening it no longer creates the downloaded list.
- `bonsai:vac-check` is an ordinary question.
- The answer's corner holds only Copy, which covers no text; the answer walks and a stopped answer are clean; nothing
  speaks.
- **The size comparison:** every letter size, line height, padding, margin, gap and corner is the same as before
  tonight, except the answer box's bottom padding (the read-aloud speaker's band, removed with the speaker on purpose).

**After, second half** (B5 to B7):

- **The glossary words:** with the library published on 2026-09-26 (no word table) the two words are plain, with no
  error; with no library, plain; with the rebuilt seed library, "kiting" and "overclock" are underlined, the ring stops
  on each once each way, the peek and full text show, and "Explain further" asks with the game's name ("Explain:
  kiting"); with "Use local knowledge base" off, plain; in a Hades answer, plain.
- **The published library put back:** the plugin's own update downloaded the same files (byte for byte), but onto
  the Deck's own drive rather than the SD card it came from; the maintainer said to leave it there.
- **The free-play sweep:** every tab walked down and back with no game, and Main with Deep Rock Galactic: Survivor
  running; no dead press, no lost ring, nothing behind the dock.
- **The removed settings:** after a saved change, none of the four old keys is in the settings file.
- **Voice input:** the Deck had no speech program installed (it was missing before tonight's build), so the
  first try could not run; with the maintainer's yes it was installed through the plugin's own button. Then, with a
  recorded sentence played into a pretend microphone: words appeared while it played, Stop read the whole recording
  and the box ended with the full sentence, Ask pressed while still listening sent the full sentence, X emptied the
  box, and nothing was ever spoken aloud.

**Found, not caused by tonight** (on the roadmap):

- **After a stopped answer, Down goes round a three-stop loop** (the question, the answer, Retry) and never reaches the
  Ask box; Right onto Copy and Down twice gets out. The answer's Down falls back to a helper that tries the turn's
  Retry first; neither changed tonight, and the speaker had not been on the way down since plan 84.
  `workshop:test-evidence/plan86-FINDING-STOPPED-ANSWER-DOWN-LOOP.json`.
- Down from "Open Permissions" on the troubleshooting hint lands on "Dismiss" (the row's handlers did not change
  tonight).
- Some stops on Settings, Developer and Main read 83 to 92 % visible during a walk, clipped by the header strip
  under the chat name.
- After the voice engine installed, the open Voice input section kept saying "not installed" until the tab was
  left and re-entered.
- The library update offered the published 2026.09.26 as "newer" than the seed's 2026.10.16 (it treats any different
  version as an update), and it did not ask where to install.
