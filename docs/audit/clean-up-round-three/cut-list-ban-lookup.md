# Cut list: the Steam ban lookup

Written 2026-10-16 by the plan 86 step 2 removal reviewer (Sonnet 5.5 high), from the readers' records for this
removal (batches b01 to b92, pulled into the ban-lookup digest) and from `git grep` across every tracked file, on
`experimental` at `b5ce2768`. Every line number is a line at `b5ce2768`. Hits in documents are marked as documents.

## In plain words

**What a player notices.** Four things disappear, and nothing else changes.

- The Permissions tab has four switches instead of five. "Steam ban lookup" is gone.
- The Developer tab has five sections instead of six. "Integrations" held only the Steam key field, so the whole
  section goes.
- Typing `bonsai:vac-check` (or the chip sentence "Check Steam players for bans") in the Ask box no longer runs a
  ban report. It is an ordinary question now, so it goes to the AI like any other (and, as for any question, it
  needs the PC address). The chip "Check Steam players for bans" is no longer offered in the suggestion chips.
- The grey "Open Permissions" row that sat under a refused ban-lookup reply is gone, and with it one stop in the
  D-pad walk under the transcript. Down from the troubleshooting hint and Dismiss on it go straight to the chips
  (or the Show details line standing in for them); Up from the chips goes straight to the troubleshooting hint.

The stored Steam Web API key goes with it. The saved value in an older settings file is ignored on load (both
sides drop it). One addition needs the session's yes: a one-time scrub so the key is also wiped from the file on
disk (section "Settings that go", last paragraph), because the roadmap's security entry says it closes only when
the stored key is gone.

**What the maintainer is approving.** Four whole files deleted (two back-end files, one back-end test file, one
screen test file), a few dozen small cuts inside files that stay, 40 tests deleted, 13 renamed, and about 35 more whose
fixtures or counts change. No back-end method (RPC) goes: the ban lookup rode on the Ask calls. **What stays:** the permission
jump and the "Open Permissions" button (five other places use them), the troubleshooting hint row, the
download-safety helper `tls_ca_fallback.py` (four other downloads use it), and every other permission switch.

## Files that go whole

| File | Why it is wholly this feature |
|---|---|
| `py_modules/backend/services/steam_vac_service.py` (271 lines) | Asks Steam's `GetPlayerBans`, turns pasted IDs and profile links into 64-bit IDs, caches ten minutes, builds the ban report. Only importers: `vac_check_commands.py` and `tests/test_steam_vac_service.py`. |
| `py_modules/backend/services/vac_check_commands.py` (110 lines) | Recognises `bonsai:vac-check` and the chip sentence, builds the reply or the "turn it on" steps. Importers: `ask_local_command_handlers.py` L38, `ask_local_commands.py` L18 (both cut below), `steam_vac_service`'s own test. |
| `tests/test_steam_vac_service.py` (163 lines, 13 tests) | Only tests the two files above. Patches `backend.services.steam_vac_service.urllib.request.urlopen` by string. |
| `src/components/MainTabChatTranscript.vacRowAfterSwitch.test.tsx` (79 lines, 4 tests) | Only tests that the deny row comes back after a chat switch. |

No data file, script or picture is wholly this feature. No whole screen source file either: the deny row is a
block inside `ChatTranscriptHintRows.tsx`, so that file stays.

## Changes inside files that stay

Where an edit leaves an import or a name unused, the type check fails (`tsconfig.json` has `noUnusedLocals` and
`noUnusedParameters`), so the helper must remove those too; they are listed where known.

### Back end

**`main.py`**
- L236, comment: drop "; VAC sets state only".
- L67, docstring: "checking an anti-cheat" goes from the list of local commands.
- L743-751, `_settings_change_keys_for_log`: delete L744 (`sensitive = frozenset({"steam_web_api_key"})`) and the
  branch L750-751 (`if key in sensitive: changed.append(f"{key}=<redacted>")`, turn the following `elif` into
  `if`). No other setting is secret, and a settings file never holds the key once it is gone. No test calls this
  function by name.
- L823-824, method `_try_handle_vac_check_command`: delete.
- L1266 and L1299, docstring words "VAC": reword ("sanitizer / shortcut / note").
- L1464-1467, in `ask_game_ai`: delete the `if local_kinds.vac:` block (four lines).
- L1762-1780, in `start_background_game_ai`: delete the `if local_kinds.vac:` block (including
  `transparency_route="vac_check"` and `meta="vac_check"`).

**`py_modules/backend/services/ask_local_command_handlers.py`**: delete function `try_handle_vac_check_command`
(L84-101); delete the imports at L24 (`capability_enabled`, its only use was L90) and L38
(`vac_check_commands`); docstring L4-5 and L10 (drop the anti-cheat lookup and the method name).

**`py_modules/backend/services/ask_local_commands.py`**: delete the import (L18), the field `vac: bool` (L25),
`or self.vac` in `any` (L30), the line `vac=parse_vac_check_command(text) is not None,` (L38); docstring L4, L5
("four" becomes "three"), L34.

**`py_modules/backend/services/ask_command_text.py`**: delete function `strip_optional_leading_slash` (L30-35),
whose only caller was `vac_check_commands.py:43`; docstring L4, L10-11 (it names the anti-cheat check and "three
places"; becomes two).

**`py_modules/backend/constants.py`**: delete L36 `DEVELOPER_TAB_INTEGRATIONS` (only user was
`vac_check_commands.py`). L35 `OLLAMA_TAB_WHERE_AI_RUNS` stays.

**`py_modules/backend/services/capabilities.py`**: delete `"steam_web_api"` from `CAPABILITY_KEYS` (L76) and the
two lines in `legacy_grandfather_capabilities` (L121-122, the key and its comment). The docstring changes from
"six" to "five" permissions (L1, L3, L8, L13, L32, L59) and drops the "talking to Steam's servers" item (L5-6)
and its reason in the old-file paragraph (L63-67; two of the old-file defaults stay off, not three).

**`py_modules/backend/services/settings_service.py`**: delete `STEAM_WEB_API_KEY_MAX_LEN` (L270) and the table
row `"steam_web_api_key"` with its comment `# Credentials.` (L511-512, in `_SIMPLE_FIELDS`). Then
`_bounded_str` (L162-172) has no user left (`_coerced_str` is a different helper and stays): delete it, and fix
the header sentence at L31 and the docstring of `_coerced_str` at L174 that name it. Docstring L51 ("Steam Web API
and the microphone" becomes "the microphone").

**`py_modules/backend/services/desktop_note_service.py`**: L75, remove `"steam_web_api"` from
`_SENSITIVE_FIELD_SUBSTRINGS`. `"api_key"` on the same line stays and still redacts any key with that text.

**Comment-only mentions (reword, no code):** `background_request_state.py` L138, L143;
`transparency_service.py` L91; `tls_ca_fallback.py` L14 ("and checking Steam's anti-cheat status" leaves the list of
callers: four callers remain, which are `ollama_catalog_service`, `pull_model_catalog_service` (which the weekly-refresh
cut removes), `rag_corpus_download_service`, `voice_model_download_service`).
`chat_summary_tidy.py` L50 and its test text use "bonsai:vac-check" only as sample text: may stay.

### Screen: the transcript, its D-pad routes and the Ask flow

**`src/components/ChatTranscriptHintRows.tsx`** (170 lines): delete the whole third row, L140-167 (the
`isVacCheckCapabilityDenyResponse(...)` block and its `Focusable class="bonsai-chat-vac-deny-row"`); delete prop
`vacDenyReplyText` and its comment (L43-44); imports: `PermissionDenyAction` (L20; the component stays, five other
files use it), `isVacCheckCapabilityDenyResponse` (L21; keep `type BonsaiCapabilityKey`), `vacDenyRowMoveDown` and
`vacDenyRowMoveUp` (L26-27); in the destructure L56 remove `vacDenyRowNavRef`; header comment L6, L16 and the
doc-comment at L49 ("three rows" becomes "two").

**`src/components/MainTabChatTranscript.tsx`**: delete `const vacDenyReplyText = ...` with its comment (L1112-1122)
and the prop `vacDenyReplyText={vacDenyReplyText}` (L1664) handed to `ChatTranscriptHintRows`; header comment L61
(the "VAC-check permission denial" in the list of hint rows). Nothing else in the file uses `ollamaResponse`,
`askThreadDisplayQuestion` or `askThreadCollapsed` less after this; do not touch their other uses.

**`src/hooks/usePermHintNavTargets.ts`**: delete `vacDenyRowNavRef` from the type (L21), the ref (L33), its register
and unregister effect (L38-41) and the returned object (L50); header L3. Keep the troubleshooting hint's effect and
its two button refs. (The hook's order inside `MainTabChatTranscript` is unchanged: it is not part of
`tests/contracts/ask-hook-order.json`, which covers only the Ask hook.)

**`src/utils/chatTranscriptNavHelpers.ts`** (cut halves, not whole functions):
- delete `vacDenyRowMoveDown` and `vacDenyRowMoveUp` with their comments (L283-298);
- `focusChatPermissionHintRow` (L43-46): drop the fall-through, it becomes
  `return takeNavFocus("chat-perm-hint-troubleshoot");` (L45 goes); comment L28;
- `troubleshootHintRowNavHandlers` (L261-280): `onMoveDown` (L279) becomes `() => takeChipSlotFocus()`; comment
  L256 ("Down goes to the ban-lookup row when it sits below, else" is dropped);
- `dismissHintKeepingRing` (L306-316): the hand-off (L311-314) becomes `void takeChipSlotFocus();` (the
  deny half `takeNavFocus("chat-perm-hint-deny") ||` goes); comment L303-305.
- `focusSessionContextStrip` and `focusUpPastLiveKbNotesBlock` stay (other functions in the file use them).

**`src/features/preset-carousel/presetRowFocusNav.tsx`** L216, in `chipRowExitUp`: delete the first step
`takeNavFocus("chat-perm-hint-deny") ||`. The next step (`chat-perm-hint-troubleshoot`) becomes the first.

**`src/utils/navFocusRegistry.ts`** (`NavFocusId` union): delete `"chat-perm-hint-deny"` (L67) and
`"permissions-row-steam-web-api"` (L74); comments L30 and L63-66 reworded to name only the troubleshooting hint.

**`src/hooks/useBonsaiAskOrchestration.ts`**: delete the toast block `if (data.meta === "vac_check") {...}`
(L1382-1388); reword the comment at L1345 (it lists `.vac` among the guards) to "sanitizer / shortcut / note"
(`main.py` line numbers inside that comment are already stale; leave them or drop them).

**`src/utils/localOnlyAskCommands.ts`**: delete `VAC_PREFIX` and `VAC_PLAIN_PHRASE` with the comment (L39-41), function
`isVacCheckCommand` with its doc comment (L48-59), the term `isVacCheckCommand(question) ||` (L77); header L5 and the
comment L23 (names `vac_check_commands`). The note check (L61-67, L78) stays.

**`src/data/presets.ts`**: delete the chip `{ text: "Check Steam players for bans", category: "troubleshooting" }`
(L207); reword the comment above `samplerPool` (L175-177: "A command in plain words ... is a chip like any other"
goes; the rule that a raw `bonsai:` command is never a chip stays, because the shortcut-setup and note commands
still match it).

### Screen: the settings lists (both sides' twin lists, the payload, the main screen)

**`src/data/bonsaiSettingsSchema.ts`**: delete `steam_web_api: boolean;` with its comment (L97-98, in
`BonsaiCapabilities`); `steam_web_api_key: string;` with its comment (L188-189, saved name); `steamWebApiKey: string;`
(L272, screen name in the input shape); `STEAM_WEB_API_KEY_MAX_LEN` with its comment (L338-339);
`steam_web_api: false,` in `DEFAULT_CAPABILITIES` (L345).

**`src/data/bonsaiSettingsNormalizers.ts`**: delete the import of `STEAM_WEB_API_KEY_MAX_LEN` (L96);
`steam_web_api: raw.steam_web_api === true,` in `normalizeCapabilities` (L426); the table row
`steam_web_api_key: boundedString(STEAM_WEB_API_KEY_MAX_LEN),` (L529). Then `boundedString` (L269-272, with its
doc comment) has no user left and `noUnusedLocals` would fail the build: delete it, and its name in the header at L33.

**`src/hooks/usePluginSettings.ts`**: delete the row `steamWebApiKey: "steam_web_api_key",` (L160). The setter
`setSteamWebApiKey` is derived from the table, so it disappears with the row.

**`src/utils/settingsPayload.ts`**: delete the import of `STEAM_WEB_API_KEY_MAX_LEN` (L41), the line
`steam_web_api_key: input.steamWebApiKey.trim().slice(0, STEAM_WEB_API_KEY_MAX_LEN),` (L87), and the sentence about
the Steam web key in the header (L23-26).

**`src/index.tsx`**: delete `steamWebApiKey,` and `setSteamWebApiKey,` from the settings destructure (L349-350) and
from the props handed to the Developer tab (L1110-1111).

**`src/features/plugin-shell/tabs/useDeveloperTabPayload.tsx`**: delete the two names from the parameter list
(L57-58), the two props passed to the tab (L96-97) and `steamWebApiKey,` in the rebuild list (L124).

**`src/hooks/useKidsLock.ts`**: delete `steam_web_api: false,` (L38) in `DENIED_CAPABILITIES`; header L5-8 ("five"
permissions: four now, and the "talking to Steam's own servers" item goes).

### Screen: the Permissions tab and the permission jump

**`src/components/PermissionsTab.tsx`**: delete the `ROWS` entry for `steam_web_api` (L71-76); header L6 ("looking
up your Steam ban status").

**`src/utils/permissionDeepLink.ts`**: delete the member `"steam_web_api"` of `PermissionFocusTargetId` (L38), its
entries in `CAPABILITY_TO_FOCUS` (L46), `PERMISSION_DENY_MESSAGES` (L57) and `PERMISSION_TOGGLE_LABELS` (L66), the
function `isVacCheckCapabilityDenyResponse` with its doc comment (L89-92), and the comments L5 (the example) and
L23-24 (the Gotcha about that function).

**`src/utils/permissionJumpRegistry.ts`**: delete `case "steam_web_api": return "permissions-row-steam-web-api";`
(L60-61). The `switch` must stay exhaustive, so this has to land in the same commit as the type member above.

### Screen: the Developer tab

**`src/components/DeveloperTab.tsx`**: delete the props `steamWebApiKey` and `setSteamWebApiKey` (L102-103), the
`case "integrations":` (L218-219), `integrationsRows` from the import (L78); header comment L8 and the diagram line
L38.

**`src/components/developerRowsAnimations.tsx`**: delete `integrationsRows` (L137-169). Then these imports are
unused and must go: `React` (L16, its only use was the key row's `React.ChangeEvent`), `Focusable`,
`PanelSectionRow`, `TextField` (L17), `helpAttributes` (L19), `textPx` (L37), `STEAM_WEB_API_KEY_MAX_LEN` (L30).
Header L2 and L6 ("and Integrations rows", "and the Steam Web API key field"), L11 (the sentence about the key
field's ref). (`DEVELOPER_ROW_HELP` and `DEVELOPER_ROW_LABELS` stay imported: the Animations rows use them.)

**`src/features/folded-tabs/developerTabFolds.ts`**: delete `{ id: "integrations", title: "Integrations" }` (L38),
`steamWebApiKey: "Steam Web API key",` in `DEVELOPER_ROW_LABELS` (L120), the `steamWebApiKey:` entry of
`DEVELOPER_ROW_HELP` (L146-147), `integrations: summarizeSection(title("integrations"), []),` (L211); header L3-7
("six sections" becomes five, drop "Integrations").

**`src/styles/sections/scopeBase.ts`**: the class `bonsai-settings-text-field-host` was used only by the key row.
Delete the selector line `.bonsai-scope .bonsai-settings-text-field-host .gpfocus:not(:has(.gpfocus)),` (L230,
keep the `.bonsai-settings-item-ring-host` selector on L231 and its rule), and the key-field words in the comments
(L205-206 and L226-227). (The record for this file said "no rule goes": wrong, see the last section.)
`src/styles/buttonFocusRing.test.ts` L181 reads only the `bonsai-settings-item-ring-host` rule, so it is not affected.

**`docs/demos/mockup-board-2/src/42-tabs-data.js`** (a drawing, but four tests read it as data, so it is part of
the cut): delete `sec("Integrations"),` and the `{ t: "field", label: "Steam Web API key", ... }` row (L112-113).
Also delete the Permissions row `tog("Steam ban lookup", ...)` (L81) so the drawing matches the tab (no test reads the
Permissions rows, so this one is for tidiness). The same file's L83 words about "refresh the recommended-models
list" belong to the weekly-refresh cut.

### Contracts and test helpers

**`tests/contracts/settings-defaults.json`**: delete `"steam_web_api": false` in `capabilities` (L15) and **the
comma at the end of L14** (`"steam_logs_read": false,`), because it is the last member and the file stops parsing
otherwise; delete `"steam_web_api_key": "",` (L46).

**`tests/contracts/settings-hostile-inputs.json`**: delete the line `"steam_web_api": false,` (L218, mid-list, no
comma issue); delete the whole case `"api key rejects a non-string"` (L271-279, an object between two others:
take its trailing comma with it).

**`tests/contracts/ask-hook-order.json`**: no change (the ban lookup is not a hook).

### Tests that change but stay (details in "Tests that go or change")

Fixtures that name the removed settings or switch: `src/components/ringTestProps.ts` L65-66,
`src/components/DeveloperTab.test.tsx` L34-35, `src/components/DeveloperTab.folded.test.tsx` L39-40,
`src/components/DeveloperTab.foldedWalk.test.tsx` L30-32 (stub) and L70-71,
`src/components/SettingsDeveloperLeftoverRing.test.tsx` L171, `src/components/steamWordsScaled.test.tsx` L70,
`src/hooks/useBonsaiAskOrchestration.test.ts` L77, `src/hooks/useKidsLock.test.ts` L33 and L42,
`src/hooks/usePluginSettings.readBack.test.ts` L54 and L84, `src/utils/bonsaiSessionSurvival.test.ts` L64.

## Settings that go

| Key | Python side | Screen side | Written or read in |
|---|---|---|---|
| `steam_web_api_key` (text, at most 128) | `settings_service.py` L270 constant, L512 row, `_bounded_str` helper; read in `ask_local_command_handlers.py` L91; redacted in `main.py` L744-751 and `desktop_note_service.py` L75 | `bonsaiSettingsSchema.ts` L188-189 (saved), L272 (`steamWebApiKey`), L338-339 (max length); `bonsaiSettingsNormalizers.ts` L96, L529, helper `boundedString`; `usePluginSettings.ts` L160; `settingsPayload.ts` L41, L87 | `index.tsx` L349-350, L1110-1111; `useDeveloperTabPayload.tsx` L57-58, L96-97, L124; `DeveloperTab.tsx` L102-103, L219; `developerRowsAnimations.tsx` L137-169; `developerTabFolds.ts` L120, L146-147; contracts `settings-defaults.json` L46 and `settings-hostile-inputs.json` L271-279 |
| `capabilities.steam_web_api` (switch) | `capabilities.py` L76, L121-122 | `bonsaiSettingsSchema.ts` L97-98, L345; `bonsaiSettingsNormalizers.ts` L426; `useKidsLock.ts` L38; `permissionDeepLink.ts` L38, L46, L57, L66; `permissionJumpRegistry.ts` L60-61; `navFocusRegistry.ts` L74; `PermissionsTab.tsx` L71-76; `ChatTranscriptHintRows.tsx` L160 | contracts `settings-defaults.json` L15, `settings-hostile-inputs.json` L218 |

**How an older saved file loads, with no error.** Checked in the code, both sides build their result only from the
keys they know:
- Python: `sanitize_settings` takes `_SIMPLE_FIELDS` plus its explicit keys, and `sanitize_capabilities` walks
  `CAPABILITY_KEYS`. A saved `steam_web_api_key` and a saved `capabilities.steam_web_api` are never copied, so both
  are dropped on load. The next ordinary save writes a file without them.
- Screen: `normalizeSettings` and `normalizeCapabilities` do the same.
- **Test that proves it: none exists today.** Add one on each side, named after the existing pattern ("a settings
  file saved with the retired 'desktop' UI scale still loads", `src/utils/settingsContracts.test.ts` L75-78):
  `src/utils/settingsContracts.test.ts > normalizeSettings: a settings file saved with the retired Steam ban lookup key and permission still loads, and both are dropped` (screen) and
  `test_settings_service.SettingsServiceTests.test_a_file_saved_with_the_retired_steam_key_and_permission_still_loads` (back end:
  write a settings file holding `steam_web_api_key` and `capabilities.steam_web_api: true` plus one ordinary value,
  call `load_settings`, expect no key, no `steam_web_api` in `capabilities`, the ordinary value intact).
  These are two added tests; step 5 should expect them as additions.

**The one-time scrub (the session decides).** Dropping the value on load does not remove it from the file on disk
until the next save of any setting. The roadmap's security entry ("The Steam Web API key is stored in plain text")
says it closes when the stored key is removed. If the session wants the file cleaned at once, add to
`settings_service.load_settings`: when the raw file has `steam_web_api_key` or `capabilities.steam_web_api`, write the
raw file back without those two (a copy of the raw dict with the two keys removed, written to a temp file and
swapped in, the same way `save_settings` writes). It must edit the raw dict, not write the sanitized one: for a file
with no `capabilities` block the sanitized form would turn the old-file grandfathering off. Test to add:
`test_settings_service.SettingsServiceTests.test_loading_a_file_with_the_retired_steam_key_removes_it_from_the_file`.

## Back-end methods that go

None. `baseline-rpc-methods.txt` has no ban-lookup method (68 methods; none is named vac, steam web or ban). Private
methods that go: `Plugin._try_handle_vac_check_command` (`main.py` L823-824) and the function
`try_handle_vac_check_command` in `ask_local_command_handlers.py`. The Ask calls (`ask_game_ai`,
`start_background_game_ai`) stay.

## Tests that go or change

Names are as written in `baseline-test-names-screen.txt` (`file > name`) and `baseline-test-names-python.txt`.

### Deleted: Python (14)

All 13 in `tests/test_steam_vac_service.py`:
- `test_steam_vac_service.SteamVacServiceTests.test_extract_bare_id`
- `test_steam_vac_service.SteamVacServiceTests.test_extract_profile_url`
- `test_steam_vac_service.SteamVacServiceTests.test_format_report_empty_rows_skipped_only`
- `test_steam_vac_service.SteamVacServiceTests.test_format_report_missing_row_still_readable`
- `test_steam_vac_service.SteamVacServiceTests.test_format_report_rows_render_without_gfm_table_syntax`
- `test_steam_vac_service.SteamVacServiceTests.test_get_player_bans_batches_and_cache`
- `test_steam_vac_service.SteamVacServiceTests.test_split_body`
- `test_steam_vac_service.SteamVacServiceTests.test_vanity_id_skipped`
- `test_steam_vac_service.VacCheckCommandsTests.test_constant_prefix`
- `test_steam_vac_service.VacCheckCommandsTests.test_parse_prefix_optional_slash`
- `test_steam_vac_service.VacCheckCommandsTests.test_response_no_key`
- `test_steam_vac_service.VacCheckCommandsTests.test_response_permission_off`
- `test_steam_vac_service.VacCheckCommandsTests.test_the_suggestion_chips_plain_sentence_runs_the_same_lookup`

Plus one in `tests/test_chat_slot_ownership.py`:
- `test_chat_slot_ownership.ChatSlotOwnershipTests.test_vac_check_deny_reply_persists_turn_and_renames_slot`
  (its job is covered by `test_shortcut_setup_reply_also_persists_to_chat_slot`, which asserts the same two turns,
  the label and the slot).

### Deleted: screen (26)

- `src/components/MainTabChatTranscript.vacRowAfterSwitch.test.tsx > the ban-lookup row after a chat switch is drawn again when the chat's newest saved turn is the denied reply and the live text is blank`
- `... > the ban-lookup row after a chat switch is not drawn when the chat's newest saved turn is some other answer`
- `... > the ban-lookup row after a chat switch is not drawn when the denied reply is older than a question still waiting for its answer`
- `... > the ban-lookup row after a chat switch is still not drawn on the [+] new-chat spot`
- `src/components/MainTabChatTranscript.permHintNavRegistration.test.tsx > vac-check deny row nav registration does not register a nav holder for the deny row when the reply is not a capability deny`
- `... > vac-check deny row nav registration registers a nav holder under chat-perm-hint-deny on mount and clears it on unmount`
- `src/components/MainTabChatTranscript.permissionHintFocus.test.ts > focusChatPermissionHintRow hands focus to the vac-check deny row's registered nav node via TakeFocus, never a plain focus()`
- `... > focusChatPermissionHintRow prefers the troubleshooting hint over the deny action when both are registered`
- `... > focusChatPermissionHintRow falls through to the deny row when the troubleshooting hint's own transfer declines`
- `... > focusChatPermissionHintRow falls through to the deny row once the troubleshooting hint unregisters (unmounts)`
- `... > focusDownFromReplyUtilityRowOrPermHint hands off to the deny row's registered nav node when no ladder or hint is mounted in this turn`
- `src/components/PermissionsTab.permissionRowNavRegistration.test.tsx > permissions-row-steam-web-api row nav registration registers a nav holder on mount and clears it on unmount`
- `src/components/PermissionsTab.test.tsx > PermissionsTab wording stays short the Steam ban lookup switch keeps its old words (the maintainer, 2026-10-14)`
- `src/components/DeveloperTab.folded.test.tsx > the folded Developer tab, every section open: one line per setting, the longer words on the row the Steam Web API key field is there, with its words for the strip`
- `src/components/SettingsDeveloperWrappedRing.test.tsx > wrapped controls and the key field show one white ring the Steam Web API key field draws one solid ring whichever of its parts Steam marks, and the key text is untouched`
- `src/features/preset-carousel/presetRowFocusNav.upFromChips.test.tsx > Up from a suggestion chip goes first to the ban-lookup row when it shows`
- `src/utils/localOnlyAskCommands.test.ts > questionBypassesOllamaPcIpRequirement allows vac-check without PC IP`
- `src/utils/localOnlyAskCommands.test.ts > questionBypassesOllamaPcIpRequirement treats the ban lookup chip's plain sentence as the same command`
- `src/utils/permissionDeepLink.test.ts > permissionDeepLink detects VAC-check capability-off replies`
- `src/utils/permHintRowNav.test.ts > the troubleshooting hint row's Left and Right Down goes to the ban-lookup row under it when that row is showing`
- `src/utils/permHintRowNav.test.ts > Down from the ban-lookup row takes the slot above the question box (the line while it holds the line, else the chips)`
- `src/utils/permHintRowNav.test.ts > Down from the ban-lookup row with nothing registered below leaves the move to Steam`
- `src/utils/permHintRowNav.test.ts > Up from the ban-lookup row reaches the troubleshooting hint above it when that hint is showing`
- `src/utils/permHintRowNav.test.ts > Up from a suggestion chip reaches the lowest permission row before the reply above it`
- `src/utils/handRingOnWhenGone.test.ts > Dismiss on the troubleshooting hint hands the ring to the ban-lookup row below when the hint goes away`
- `src/data/presets.test.ts > suggestion chip pool offers the ban lookup in plain words, and pressing it runs the lookup (maintainer, plan 72)`

Total deleted: **14 Python + 26 screen = 40 tests.**

### Renamed (the old name is deleted, the new one is added)

| Old name | New name |
|---|---|
| `src/components/DeveloperTab.folded.test.tsx > the folded Developer tab, every section closed is six one-line sections, each with its summary, and no row drawn` | `... is five one-line sections, each with its summary, and no row drawn` |
| `src/components/DeveloperTab.foldedWalk.test.tsx > the folded Developer tab, every section closed Down from the tab bar walks the six section lines, once each, then the Open all button, and holds; Up walks every line back` | `... walks the five section lines, once each, ...` (rest unchanged) |
| `src/components/DeveloperTab.foldedWalk.test.tsx > the folded Developer tab, every section closed without a seed install the walk is the five other lines` | `... the walk is the four other lines` |
| `src/features/folded-tabs/developerTabFolds.test.ts > the Developer tab's section list names the six sections in the drawing's order` | `... names the five sections in the drawing's order` |
| `src/components/steamWordsScaled.test.tsx > Text size reaches the words inside Steam's own controls Permissions: the title, the five switch names and the five descriptions follow Text size (16 and 12 at Normal)` | `... the title, the four switch names and the four descriptions follow Text size (16 and 12 at Normal)` |
| `src/components/MainTabChatTranscript.emptySlotPreview.test.tsx > the [+] create-position screen hides the last reply's ban-lookup permission row and slow-answer lines` | `... hides the last reply's slow-answer lines` (keep the `prefer GPU` check and the elapsed-time prop; drop the deny text, the "Open Permissions" check and the second render) |
| `src/utils/permHintRowNav.test.ts > the troubleshooting hint row's Left and Right Down with no ban-lookup row goes to the slot above the question box, the line while it holds the line` | `... Down goes to the slot above the question box, the line while it holds the line` |
| `src/utils/handRingOnWhenGone.test.ts > Dismiss on the troubleshooting hint falls through to the chips when the ban-lookup row is not showing` | `... Dismiss on the troubleshooting hint hands the ring to the chips when the hint goes away` |
| `test_capabilities.CapabilitiesTests.test_legacy_grandfather_all_true_except_steam_web_api` | `test_capabilities.CapabilitiesTests.test_legacy_grandfather_all_true_except_microphone_and_downloads` |
| The four other tests in `src/components/SettingsDeveloperWrappedRing.test.tsx` whose describe is `wrapped controls and the key field show one white ring` | the describe becomes `wrapped controls show one white ring`: `... Steam's focus mark on the button inside draws one solid ring, on the button`, `... Steam's focus mark on the wrapper draws one solid ring, on the wrapper`, `... a knowledge-base style host > Focusable > Button keeps no outline on its wrapper`, `... no ring while none of them is focused` (4 renames) |

### Changed, name unchanged (the body changes; listed so step 5 knows)

Screen:
- `src/components/PermissionsTab.test.tsx`: three tests (`PermissionsTab kids lock shows banner and disables toggles
  visually off without mutating stored caps`, `... hides banner and enables toggles when unlocked`,
  `PermissionsTab wording stays short every switch description is at most 12 words`): the switch count 5 becomes 4
  (L39, L69, L102); `ALL_ON` loses `steam_web_api` (L12).
- `src/components/steamWordsScaled.test.tsx`: the Permissions test counts 4 and 4 (L91-92); `ALL_OFF` L70.
- `src/components/PermissionsTab.permissionRowNavRegistration.test.tsx`: `ALL_ON` L30; `describe.each` row L47.
- `src/components/DeveloperTab.folded.test.tsx`: `every row's words are the board's, word for word`: 12 checked rows
  become 11 (needs the board edit above); `leaves the knowledge-base section out without a seed-install callback`
  loses "Integrations" from its list (L91); `is five one-line sections` loses `["Integrations", ""]` (L83);
  props L39-40, comment L128.
- `src/components/DeveloperTab.foldedWalk.test.tsx`: the open walk (the three `pane 430|741, Steam's rule ...: Down
  stops once per control ...` tests per rule) loses `/^Integrations/` and `"Steam Web API key"` from `expectedOrder`
  (L268-270), the last two stops become `["Same as text", "Close all sections"]` (L277) and Up from the button lands on
  `/^Animations section/` (L282); `the captured errors' rows are reachable inside Diagnostics ...` loses
  "Integrations" (L269); `the strip shows each row's own words ...` loses its Steam key assertion (L283-285); delete
  the `TextField` stub (L30-32, only the key field used it); props L70-71; header words L8, L135.
- `src/features/folded-tabs/developerTabFolds.test.ts`: `leaves the knowledge-base section out when no seed-install
  callback was passed` (list L70 and `toHaveLength(6)` becomes 5, L71); `a Developer section's summary line ... every
  section, in the drawn state` loses `integrations: ""` (L83); `each board row that has words matches what the tab hands
  the strip` loses its `steamWebApiKey` mapping (L128).
- `src/components/MainTabChatTranscript.permissionHintFocus.test.ts`: `focusDownFromReplyUtilityRowOrPermHint still
  prefers this turn's own chip ladder over the permission-hint rows` registers `chat-perm-hint-troubleshoot` instead of
  `chat-perm-hint-deny` (L117).
- `src/components/MainTabChatTranscript.sessionLadderExit.test.tsx > the Session tab with no rows and no chips: Down
  off its last stop lands on a permission hint row first, and falls back to the question box`: use
  `navNode("chat-perm-hint-troubleshoot")` instead of `...-deny` (L270). **No reader record names this file.**
- `src/components/MainTabChatTranscript.permHintNavRegistration.test.tsx`: the remaining troubleshooting test; delete the
  `VAC_DENY_RESPONSE` constant (L26-27).
- `src/utils/permHintRowNav.test.ts > Up from a suggestion chip reaches the troubleshooting hint when it is the only
  permission row`: add the reply and notes block from the deleted "lowest permission row" test so the "before the reply
  above it" check is kept (`not.toBe(notes)`); delete the `vacDenyRowMove*` import (L14) and the header words L4-7.
- `src/utils/handRingOnWhenGone.test.ts > Dismiss on the troubleshooting hint moves nothing when the ring was not on
  Dismiss (a touch press)`: register a chips holder instead of the deny holder (L96-103).
- `src/utils/permissionDeepLink.test.ts`: `permissionDeepLink maps each capability to a Permissions focus target` (L16)
  and `permissionDeepLink labels every focus target` (L29) drop the `steam_web_api` line; import L4.
- `src/utils/permissionJumpRegistry.test.ts` (L58, L74-75, L95-96): `steam_web_api` was only an example row; use
  `microphone_access` (focus id `permissions-row-microphone-access`). Tests: `arms return tab and focus target together`,
  `reports false when the registered row's own nav node declines the move`, `succeeds on a later retry once the row's nav
  node starts claiming the move` (and `keeps re-taking the ring ...` if it shares the row).
- `src/utils/settingsContracts.test.ts`: `normalizes full settings payload with defaults` (L131, L134), the payload test
  (L369, L402), the patch test (L441) and the round-trip test (L591): drop the key and the permission.
- `src/hooks/usePluginSettings.readBack.test.ts` (L54, L84): the table must match `settings-defaults.json` exactly.
- `src/hooks/useKidsLock.test.ts` (L33, L42), `src/utils/bonsaiSessionSurvival.test.ts` (L64),
  `src/components/SettingsDeveloperLeftoverRing.test.tsx` (L171), `src/components/DeveloperTab.test.tsx` (L34-35),
  `src/components/ringTestProps.ts` (L65-66), `src/hooks/useBonsaiAskOrchestration.test.ts` L77 and the test at
  L214-224 (`allows local-only commands through with no host configured`: use `bonsai:shortcut-setup-deck` instead of
  `bonsai:vac-check ...`, L220).
- Comment-only: `src/utils/liveTurnFocusGraph.test.ts` L53, `src/utils/liveTurnFocusGraph.ts` L48 (name the class
  `.bonsai-chat-vac-deny-row`, which no longer exists), `src/data/presets.test.ts` L170-171.

Back end:
- `tests/test_chat_slot_ownership.py > test_local_command_status_names_its_chat`: run it with
  `bonsai:shortcut-setup-deck` and `{"show_developer_tab": True}` settings (as the test below it does); keep the name. It
  guards that a local command's status names its chat, which is generic. Docstring words at L296-298 and L280-285.
- `tests/test_capabilities.py` (the renamed test above, L36-45, drop the key from the tuple).
- `tests/test_settings_service.py` L66-67 and L583 (the key and permission asserts): `test_sanitize_settings...` tests whose
  names stay.
- `tests/test_user_note_command.py`: `PrefixRuleTests.test_the_local_command_kinds_know_about_it` L56-57 (use a shortcut
  line such as `bonsai:shortcut-setup-deck` for the `.any` check and drop the `.note` line); `ShowDetailsSaysLocalNoteCommand.
  test_other_routes_are_unchanged` L163-164 (use route `shortcut_setup` and that command as the example).
- `tests/test_desktop_note_service.py > DesktopNoteServiceTests.test_append_app_log_sync_redacts_sensitive_fields`: swap the
  sample field name `steam_web_api_key` for `example_api_key` (L212, L220); it is still redacted by the `api_key` rule.
- `tests/test_seam_contracts.py` (no test name changes): delete the `"strip_optional_leading_slash"` entry (L110) and the
  `"backend.services.vac_check_commands"` line in `test_the_two_back_end_import_loops_stay_broken` (L159).
- `tests/contracts/*` change as in the earlier section; their tests (`test_settings_contract.*`,
  `test_settings_hostile_contract.*`, `src/data/bonsaiSettingsContract.test.ts`,
  `src/data/bonsaiSettingsHostileContract.test.ts`) keep their names.

### Added (2, or 3 with the scrub)

The two "old file still loads" tests named under "Settings that go", plus
`test_settings_service.SettingsServiceTests.test_loading_a_file_with_the_retired_steam_key_removes_it_from_the_file` if the scrub is wanted.

## What stays on purpose

- **`PermissionDenyAction`** (`src/components/PermissionDenyAction.tsx` and its test) and the permission jump
  (`permissionJumpRegistry.ts`, `usePermissionJump.ts`): five other files use them (Ask bar, screenshot browser, desktop
  note modal, voice section, Main tab).
- **The troubleshooting hint row** and its two buttons, `focusChatPermissionHintRow`, `focusDownFromReplyUtilityRowOrPermHint`,
  `troubleshootHintRowNavHandlers`, `dismissHintKeepingRing` (cut halves only), and the `chat-perm-hint-troubleshoot` id.
- **`py_modules/backend/tls_ca_fallback.py`**: four downloads still use it.
- **The AI's instructions**: checked; `ollama_prompts.py`, `ask_topic_instructions.py` and `data/kb` have no ban-lookup text.
- **`tests/test_closed_rows_check.py`, `scripts/closed_rows_check.py` L13 and L29**: they use "VAC-03 to 06" and "Ban lookup" as
  sample text for a parser; nothing there depends on the feature.
- **`tests/test_chat_summary_tidy.py` L113, `tests/test_background_request_state.py` L205, `src/components/ContextChipLadder.ringWalk.test.tsx`
  L106**: the words "vac-check", "VAC" or the chip sentence are only sample text.
- **The preset-chip rule that a raw `bonsai:` command is never a chip** (`presets.ts` `samplerPool`, and the first test in
  `presets.test.ts > suggestion chip pool`): other local commands still match it.
- **`src/test-harness/tabBodyDeckGeometry.ts`**, including the stop `[384, 22, "Steam ban lookup"]` (L75) in its Permissions table. It is a table of Deck positions of an older layout that the tab-walk tests lay stand-in buttons over; its labels are not wired to the real tab (the same reading the UI-scale and read-aloud lists reach for its Settings rows). Editing a measured number by arithmetic would invent data; re-measuring is a Deck job, not part of this removal. Neither `TabBodyFocusRoot.walk.test.tsx` nor `.heading.test.tsx` changes name or result.
- **The `data-bonsai-tab-panel` snapshot anchors** are not part of this removal (see the preview-tool list).

## Documents that mention it

List only, for the bookkeeper. `AGENTS.md` L283 (history example, may stay); `README.md` L53 (already struck through);
`CHANGELOG.md` (18 hits, history); `docs/roadmap.md` L76-78 (the security entry closes with this removal), L138-139
(the "Retire the Steam ban lookup" entry), L240 (VAC Phase 2 opponent IDs, moves to shelved per plan 86 call 12);
`docs/roadmap-details.md` L399; `docs/testing.md` L130, L204-208, L336-346; `docs/testing-manual.md` L45, L323, L351, L368, L509,
L526-529 (the VAC section and its rows); `docs/testing-automated.md` L63, L65; `docs/guide.md` L270, L275 (the Steam ban lookup
row and the permissions sentence); `docs/troubleshooting.md` L133, L141, L147 (switch lists); `docs/development.md` L270 (file
table); `docs/focus-graph.md` L36 (the permission-hint rows), L1211, L1230, L1260 (the Integrations section, the key field, the
`integrations` fold-line name); `docs/glossary.md` L23 (the VAC entry); `docs/lessons-learned.md` L582, L748 (history);
`docs/audit/maintainer-decisions-locked.md` L1959-1960, L2364-2373 (D131 and D132, history); `docs/audit/maintainer-decisions-archive.md`
(9 hits, history); `docs/demos/mockup-board-2/src/44-tabs.js` L389 ("five switches"); `docs/mcp-setup.md` (2 hits);
`packages/bonsai-mcp/knowledge/architecture/focus-graph-patterns.md` L110 (the example row); `docs/planning/73-...`, `docs/planning/86-...`.
`docs/archive/*` mentions are history. Not documents: the board data file `42-tabs-data.js` is in the cut list.

## Order and clashes

Shared files this removal touches that another removal or the glossary move also touches:

| File | Also touched by | Note |
|---|---|---|
| `main.py` | read aloud (L30, L218, L307-309, L420, L2106-2107, L2309-2319), glossary (after L1192, L2139, L2163), weekly refresh (L1214-1216) | different lines; each is a block delete, so a rebase is easy |
| `src/index.tsx` | read aloud, UI scale, preview tool (L54, L167, L733-749) | the key pair at L349-350 and L1110-1111 sit between UI-scale and read-aloud lines |
| `usePluginSettings.ts`, `bonsaiSettingsSchema.ts`, `bonsaiSettingsNormalizers.ts`, `settingsPayload.ts`, `settings_service.py`, `tests/contracts/settings-defaults.json` | UI scale, read aloud | all settings lists; each removal deletes its own rows. In `settings-defaults.json` `steam_web_api` is the last member of `capabilities` (the comma at L14) and nobody else edits that object |
| `src/utils/settingsContracts.test.ts`, `src/hooks/usePluginSettings.readBack.test.ts`, `src/utils/bonsaiSessionSurvival.test.ts`, `src/components/ringTestProps.ts`, `src/components/SettingsDeveloperLeftoverRing.test.tsx`, `src/hooks/useBonsaiAskOrchestration.test.ts`, `tests/test_settings_service.py` | UI scale, read aloud | fixture lines, different lines per removal |
| `src/components/MainTabChatTranscript.tsx` | read aloud, glossary | the transcript is also where the glossary move starts its fetch |
| `src/components/PermissionsTab.tsx`, `useKidsLock.ts` | none | |
| `src/components/DeveloperTab.tsx`, `useDeveloperTabPayload.tsx` | none today | UI scale touches the Settings tab payload, not this one |
| `src/styles/sections/scopeBase.ts` | UI scale (L30, L147-150, L60) | different lines |

Suggested order for step 3: land the preview tool first (smallest), then the weekly refresh, then this one (it has the most
settings-list edits), then the two removals that share settings lists with it. Inside this removal
the commits that cannot be split are: (1) the `steam_web_api` capability across `permissionDeepLink.ts`,
`permissionJumpRegistry.ts`, `PermissionsTab.tsx`, `bonsaiSettingsSchema.ts`, `bonsaiSettingsNormalizers.ts`, `useKidsLock.ts`
and the chip ladder row (the type member and its `switch` must go together); (2) the Developer section
(`developerTabFolds.ts`, `DeveloperTab.tsx`, `developerRowsAnimations.tsx`, `usePluginSettings.ts` row, the payload files,
the board data file and the four test files that read it); (3) the Python side
(`steam_vac_service.py`, `vac_check_commands.py`, handlers, `main.py`, `capabilities.py`, `settings_service.py`).

## The Deck check this removal needs

(Plan 86 step 3 item 6: the Settings, Permissions and Developer tabs, the answer's D-pad walk, the free-play sweep.)

1. **Permissions tab:** four switches (Read game and screenshot context, Save files to Desktop, Voice input, Internet
   downloads), each turns on and off and survives a close and reopen; with the parental lock on, all four are greyed.
2. **Developer tab:** five section lines (Knowledge base, Diagnostics, Navigation, Logging and exports, Animations), no
   Integrations. Open all, walk Down to the last stop (Scramble animation, or its rows when it is on) and Down once more
   onto the floating Open all button, then Up back. No row moves the ring off screen.
3. **Ask box:** type `bonsai:vac-check` (and the old chip sentence): it is sent as a question to the AI, no ban report and
   no "Steam ban lookup" toast. A normal question still answers. The suggestion chips never show "Check Steam players for bans".
4. **The transcript's D-pad:** a troubleshooting-shaped question with the game-reading permission off shows the hint row;
   Down from Open Permissions and from Dismiss lands on the chips or the Show details line; A on Dismiss hands the ring on to
   the same place; Up from the chips lands on the hint. After a reply, Down from the reply's row still reaches the strip or the chips.
5. **Old settings file:** put a settings file holding a made-up `steam_web_api_key` and `capabilities.steam_web_api: true` on
   the Deck (or use the maintainer's real file), open the plugin: it loads, every other setting is as before; change one
   setting, then read the file's **key names only** (never values, see `docs/lessons-learned.md` L582) and confirm neither
   name is present. With the scrub on, they are gone straight after the first load.
6. The free-play sweep (a few questions across the tabs) runs as before.

## Open questions for the one running the session

1. **The one-time scrub of the saved key** (section "Settings that go"). Without it the key stays in `settings.json` until
   the next save of any setting. The roadmap's security entry closes only when the stored key is gone, so the
   recommendation is yes (about 15 lines in `load_settings` and one test). What would settle it: the maintainer's yes.
2. **`_settings_change_keys_for_log` in `main.py`** loses its only secret key. The cut list deletes the redaction branch
   (no other setting is secret). Keep an empty hook instead if a future secret setting is planned. What would settle it:
   whether any new credential setting is on the roadmap (none was found).
3. **`tabBodyDeckGeometry.ts`** keeps its "Steam ban lookup" stop (see "What stays on purpose"). If the session would rather have the label gone from the fixture, deleting the single row is safe (no test reads the count), but the numbers around it were measured with it present.
4. **Old installs after the next release.** An older bonsAI version still on someone's Deck keeps its own ban lookup;
   nothing here reaches it. Nothing to decide, noted so the release notes say the lookup is gone from the new version.

## Records found wrong

Checked about 70 records for this removal against the code (every back-end file, the transcript, hint rows, the Developer
and Permissions tabs and their tests, the settings lists, the contracts, the test harness). Found wrong or incomplete:

- b45 `src/styles/sections/scopeBase.ts` (removal): said "no rule goes". True: the selector
  `.bonsai-scope .bonsai-settings-text-field-host .gpfocus:not(:has(.gpfocus))` (L230) serves only the key field's wrapper
  class, which only `developerRowsAnimations.tsx` L154 uses, so it goes dead.
- b30 `src/components/developerRowsAnimations.tsx` (removal): listed imports `Focusable`, `PanelSectionRow`, `TextField`,
  `helpAttributes`, `STEAM_WEB_API_KEY_MAX_LEN` but missed `import React` (L16) and `textPx` (L37), which also become unused
  and fail the type check.
- b35 `src/data/bonsaiSettingsNormalizers.ts` (removal) and b71 `py_modules/backend/services/settings_service.py` (removal):
  missed that `boundedString` (L269) and `_bounded_str` (L162) lose their only user. In the screen file that fails the build.
- b03 `MainTabChatTranscript.permissionHintFocus.test.ts` (removal): said the test at L74-83 loses only its deny half and
  the troubleshooting half stays. True: the test compares the hint with the deny row, so it goes whole.
- b24 `src/utils/permHintRowNav.test.ts` (removal): left "L134-150 needs a second look". True: the test needs the deny row to
  work; it is deleted, and the test beside it takes over its "before the reply above it" check.
- b75 `tests/test_chat_slot_ownership.py` (removal): said both vac-command tests go. True: only
  `test_vac_check_deny_reply_persists_turn_and_renames_slot` goes; `test_local_command_status_names_its_chat` checks a generic
  rule and should be re-driven with the shortcut command.
- Missed by every record: `src/components/MainTabChatTranscript.sessionLadderExit.test.tsx` L270 (uses
  `chat-perm-hint-deny`), and `docs/demos/mockup-board-2/src/42-tabs-data.js` L112-113 as a file four tests read (b29 and b37
  noted the board only as a count).
- b83/b73 do not belong to this removal; see the preview-tool list.
