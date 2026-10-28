# Plan 101, check block M0: minute zero on the Deck, and the first PC look

For the `deck-driver` helper (the Deck rows) and the maintainer (the PC rows). Evidence files `plan101-<ROW>.json` in
the workshop's `test-evidence` folder, one per row, written by the driver, never by a code lane. A row passes only
when the result matches what is written under "Expect". The build on the Deck is the one already there (no deploy in
M0); the Deck's AI is its usual model; Cyberpunk 2077 has been copied over and started once by the maintainer (plan
101 § 13), and the Deck's test chat "test" is there.

## Setup

1. `deck_status`: the lease free, the stop switch off. Note the build stamp on the About tab.
2. Unload the Deck's AI first if a game is about to run (a game plus the loaded model leaves under 2 GB).
3. Start Cyberpunk 2077 from the Deck's library and leave it at its title screen. Open the Quick Access Menu, bonsAI.

## Rows

| Row | Steps | Expect | Evidence |
|---|---|---|---|
| P101-SMOKE-00 | Main tab, the question box, type "What settings should I use?" and send (Speed). Wait for the answer. | An answer arrives; the game tag in the question box's strip reads "Cyberpunk 2077"; no error toast. | `plan101-P101-SMOKE-00.json` with the screenshot and the time to first words |
| P101-STRIP-TODAY | With the ring on the paperclip in the strip, press Right three times, then Left three times, reading the ring each time. | The ring walks paperclip, microphone, Ask and back; **the game tag is never a stop** (the before-state H2 changes). | `plan101-P101-STRIP-TODAY.json` with the ring's owner after each press |
| P101-PERM-TODAY | Permissions tab. Count the switch rows and read their labels. | Five rows: Save files to Desktop, Read game & screenshot context, Voice input (microphone), Internet downloads, and the Kids lock banner only if parental controls are on (the fifth is the combined row's second key; read what the tab shows). No "Read game install folders" row yet. | `plan101-P101-PERM-TODAY.json` with the labels in order |
| P101-SEARCH-TODAY | Search tab (LB from Main). Read the rows from the top. | The game row, the find box, the word buttons, then your notes. **No Mods row** (the before-state H changes). | `plan101-P101-SEARCH-TODAY.json` with a screenshot |
| P101-MODS-FOLDER-00 | Over SSH, read-only: list the top level of the Cyberpunk folder the maintainer copied (names only), and whether `V2077/Load Order` and `bin/x64/plugins/cyber_engine_tweaks/mods` exist; list the prefix's `drive_c/users/steamuser/AppData/Local/CD Projekt Red/Cyberpunk 2077` (names only). Never print a file's contents. | The folders exist as plan 101 § 4 says, or the row records what differs, for lane M. | `plan101-P101-MODS-FOLDER-00.json` with the names and the library root |

## The PC (the maintainer's hands, read by the session from the plugin's log)

| Row | Steps | Expect | Evidence |
|---|---|---|---|
| P101-WIN-TODAY | On the Windows PC, in Big Picture Mode, open bonsAI with Cyberpunk running; the Permissions tab; the Search tab; the strip. | The same before-state as the Deck rows above, on Windows; the game tag reads "Cyberpunk 2077". The maintainer says how a new build reaches this Decky. | `plan101-P101-WIN-TODAY.json` written by the session from the maintainer's words and the plugin's log |

## Teardown

Leave Cyberpunk on Recent Games; return the ring to the Main tab; release the lease.
