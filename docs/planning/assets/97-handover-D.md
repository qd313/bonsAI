# Plan 97, Deck block D (deploy, rig fixes, one check per landed fix): handover

Written by the block D driver, 2026-10-22 about 09:41 Deck time (13:41 UTC). Evidence folder: `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` (files `plan97-<ROW>.json`, pictures beside them). Read `97-handover-B.md` and `97-handover-C.md` too; everything they say still holds unless changed below.

## State the Deck is in

- Build on the Deck: commit 15565346, bundle sha256 starts f28c5fc4676d (was 8bdfff8b7f5e). Deployed in D0.
- Screen: panel page 855 x 766; screenshots are the monitor (1920 x 1080).
- Keep-awake: taken 09:13 EDT, 480 minutes, `expiresAt` 2026-10-22T21:13:15Z. Still held.
- Plugin open on the bonsAI tab (Main), Quick Access open. No game running.
- Mode chip: Strategy (settings file `ask_mode` strategy), as found.
- Settings file md5 is 4786b12b8f6f7a215f0e9f8c316d3da8, the same as the start of the block and of block C's end.
- Test chat "test": still the only chat, name "test" (it was "testg" for about a minute during D8). Block D added 4 questions and answers (first upgrade in Czech, kiting, Explain further, plus none else).
- Ollama: running (version 0.40.8), "Run AI on this Deck" back ON.
- Rig snapshot: no snapshot is armed. See the snapshot note below.

## Settings changed and whether they are back

- Reply language: follow_system, then czech, then follow_system (file read). Back.
- Text size: small, then large, then normal, then small (file read: chat_text_size small). Back.
- Run AI on this Deck: ON, OFF for D6, back ON (file true, service active). Back.
- Nothing else changed.

## Rows, one line each

- P97-D-DEPLOY: PASS. 8bdfff8b7f5e to f28c5fc4676d, equals the PC build; plugin opened first try.
- P89-RIG-OPEN-AFTER-RELOAD (try2 and try3): FAIL on the stricter second set. First set of three looked 3 of 3, but a later read found the menu shut, so I ran a second set with a read after each: the first call opened the plugin in 1 of 3 (two failed in 1 s with a debugger connection reset). The reopen-qam and wait-decky-tab stages did run and worked once (about 25 s).
- P89-RIG-SNAPSHOT-try2: PASS for three identical copies and the old 12 October snapshot being set aside. UNCLEAR: calls 2 and 3 are refused (StaleSnapshotError) until the first is restored; I moved the rig's hold file aside by hand instead of restoring.
- P97-X2-SAMPLER: PASS. 19 stops on Settings and Developer, all 100 percent, text, none clipped.
- P97-L6-ABOUT-BUILD: PASS. "Version 0.5.0 · build f28c5fc4676d".
- QA-LOOK-01-About: PASS, findings empty (dropdown not reported).
- P97-L2-LANGUAGE-PICK: PASS, every step. File read czech 0.6 s after A; Czech answer; Follow system put back; log lines found.
- P97-L9-KB-UPDATE: PASS for nothing downloads, status unchanged, log names both versions. UNCLEAR for the wording: the published library is now the same version as the installed one, so the line read "Already up to date (version 2026.10.17)." and the "newer than published" line could not appear.
- P97-L13-LARGE-TEXT: Large PASS (chevrons 12 px, spoilers on two lines with no summary). Normal FAIL: Story spoilers keeps a summary only 25 px wide.
- P97-L16-FINDLAN-UP: PASS, 5 of 5 on the address box; Save row, box, Test connection steps as written; sweep clean.
- P97-L12-EXPLAIN-RING: PASS. Ring on the question box after the second A; Down moved to Ask, Up back.
- P97-L10-RENAME-KEYBOARD: PASS. Keyboard showed after the A on the field; name testg and back to test.

## Odd things for the next driver

- `deck_openPlugin` is unreliable straight after `deck_reloadPlugin`: it can say "already open" (confirmed twice) while the Quick Access page reads width 1; the next call does the full open. Always read `.bonsai-scope` and the page width after it.
- A burst of several presses in one `deck_pressButton` call lost most of them in Steam's list (5 DOWNs moved once). Send single presses with a second between them.
- Tab changes fold every section again (the Text size section had to be reopened each time).
- Chats menu on this build: Rename chat is to the right of New chat; Delete chat is the bottom left entry and DOWN from Sum up again lands on it. The ring on the chat name row reads "test, chat 1 of 1. Opens your chats".
- The word box (glossary) opens its short line when the ring lands on the word; the first A grows it and shows Explain further; the second A asks the question.
- `deck_readPluginLog` with a filter found no lines for `about.replyLanguage`; `journalctl -u plugin_loader` over ssh has them.
- Snapshot: each `deck_snapshotSettings` streams the whole settings folder (236 MB, voice models inside) and takes a while. Three hold files sit renamed on the PC: `C:\Users\still\.config\decky-plugin-studio\snapshots\settings-hold.p97D-1.json` to `-3.json`. Three saved copies are in the `settings-archives` folder beside them (all the same sha256 79ae9a9bf039...). Nothing will auto-restore.
- Checking rows run so far at Small text; the Normal summary width for Story spoilers (25 px) is the number to give the owner.

## Rows left undone

- None of D0 to D8 skipped. Block E (E1 to E11) is for the next driver. The rig fault in open-after-reload is the thing most worth the owner's eye before E, since E needs many reloads.
