# Plan 108e: the briefs, one per helper

How a brief is assembled: the session hands each helper [108-helper-rules.md](108-helper-rules.md), the section below
with its letter, the tip hash, the absolute path of its own copy of the repo, and the plan id (108e). A section says:
what happens today, where it comes from (files and the reading behind it), what to build, the files owned, the tests,
and the check that proves it (the row). Evidence files are named `plan108e-<ROW>.json` by the driver, never by a
helper. The plan itself is [108e-finish-the-controller-test-rig.md](../108e-finish-the-controller-test-rig.md).

**Line numbers are as read at tip `28306e896` on 2026-11-19 by one reader, not yet spot-checked by a second; the
session re-checks every section against the tip at go.** The rig tools' own project was read at its commit `412be47`
(version 0.3.12, 2026-11-04) in `C:\Users\still\decky-plugin-studio`. bonsAI starts that project's server from the
built files in that checkout (`.mcp.json`, server `decky-plugin-studio`, `mcp-server/dist/index.js`), so a change
there loads only after a build and in a new chat. A lane that finds a line has moved re-greps and says so; a lane
that finds its brief wrong says so and stops.

Model and effort per lane are in the plan's § 5 and in each title below.

## Rules special to plan 108e

1. **Two projects.** Lanes N2, N1, N3, F1, S0, B1 and S1 own bonsAI files only. Lanes R2, R3 and R4 are work in the
   rig tools' project. They are written here so that project's session can lift them; they follow that project's own
   landing rules (`docs/ROADMAP.md` there, "How this lands", lines 197-216: one squashed commit per lane, no lane
   touches its roadmap, changelog, tool list or AGENTS file, no version bump before the Deck pass, and "what could
   this test pass while the real thing is broken?" answered in every report). No bonsAI helper edits that checkout.
2. **No helper touches a machine.** No `deck_*` tool, no SSH, no night command against the Deck or the stand-in.
   Tests use the fake server (`scripts/testFixtures/fakeMcpServer.mjs`) or an injected stand-in command. The driver
   blocks (D0, DN) are the only place anything is pressed.
3. **Script tests are in no gate.** `scripts/*.test.mjs` run by name with Node's own runner
   (`node --test scripts/<name>.test.mjs`; the reason is written at `scripts/deck_overnight_run.test.mjs:1-8`). Run
   yours and the ones you touch, and paste the totals in your report. Match the header comment of the neighbouring
   script.
4. **The word that grants elevated rights never appears in a runbook or a driver brief.** The session's safety check
   refuses such a brief (plan 82). Tools that need it carry it inside themselves.
5. **Nothing ever clears the safety stop.** No code path, no runbook step. Only the maintainer re-arms it.
6. **Never print a value from the plugin's `settings.json`** (it holds a key). Key names and hashes only.
7. **A tool reply can be 90 to 100 KB** (`deck_replayChecks`, measured 2026-11-16, `docs/mcp-setup.md` findings
   log). Scripts keep what the report needs and write the full reply to a side file; drivers ask for small reads.

## Facts every lane shares (read 2026-11-19)

**The night command.** `scripts/deck_overnight_run.mjs` (99 lines): the quick-check arguments at 34, the dry run at
36-52, `main` at 54-88. `scripts/lib/deckOvernightRun.mjs` (304 lines): `REQUIRED_TOOLS` at 11 (three names),
`readMcpServerConfig` 14-31, `listCheckFiles` 34-45 (every `.json` under the walks folder), `classifyReplayOutcome`
57-89, `runPythonQuickCheck` 92-122, `buildReport` 147-202, `writeReport` 205-213, `runOvernightSlice` 224-304. Inside
the last: the hold-awake call at 274 with `ttlMinutes` 120 (the default at 229) and **no release anywhere**; the
install at 281; the replay loop at 287-295, one call per file with `{ checksDir, only: [name] }`; the client closed at
298; the PC quick check at 300. Nothing opens the plugin, picks a tab, saves the settings or asks whether a game is
running. The client is `scripts/lib/mcpStdioClient.mjs`. Paths come from `scripts/lib/workshop.mjs` (`evidenceDir`
118, `walksDir` 123, `researchDir` 128; folder names at 25-26).

**The saved walks.** 106 JSON files in the workshop's `checks/` folder, counted by a script on 2026-11-19: 57 saved
from `deck_runSequence`, 49 from `deck_sweep`; `savedAt` from 2026-09-23 to 2026-11-16; 44 different `buildHash`
values; eleven sequence files press A or B (18 A and 10 B presses in all). Every file has exactly these keys:
`formatVersion` (2), `name`, `tool`, `savedAt`, `buildHash`, `buildHashInputs`, `runOptions`, `expected`. **No key
names a tab, a chat or a starting screen.** A sweep's `expected` holds `totals` (`stopsRecorded`, `stopsVisited`,
`unlabeledStops`, `cycles`, `stopsFocusedButNotVisible`, `presses`, `legs`), `notVisible` (each with `index`, `lane`,
`leg`, `label`, `verdict`, `coveredBy`, `clippedBy`), `legs` and `stops` (each with `label`, `selector`, `rect`,
`scrollTop`, `visibility`, `focusKey`). Example: `P86-SETTINGS-WALK.json` (saved 2026-10-16) has
`totals.stopsFocusedButNotVisible` 2; one is "Story spoilers (Strategy mode) section: Hide spoilers until I tap on",
verdict `partial`. Whether that stop is still half hidden today is unknown.

**The tabs.** `src/features/plugin-shell/tabTitles.tsx:44-52` gives the order: search, main, ollama, settings,
permissions, developer, about. Developer is mounted only while its switch is on (55-57). The names on the bar are at
83-92: "Search", "bonsAI", "Ollama", "Settings", "Permissions", "Developer", "About". LB and RB switch tabs and wrap
(`docs/focus-graph.md:520`).

**The rig tools** (`mcp-server/src/toolRegistry.ts` in the tools project): `deck_stopAutomation` 167,
`deck_automationStatus` 192, `deck_captureScreenshot` 234 (`mode`, `allowNonPluginUi`, `outDir`), `deck_record`
244-262 (`seconds` default 10, `mode`, `quality` compressed or full, `outDir`; a file only), `deck_openPlugin` 352,
`deck_readPage` 381, `deck_sweep` 569, `deck_saveCheck` 618, `deck_replayChecks` 689 (`names`, with `only` as the
older spelling; more than `maxChecks` = 10 files with no names is refused unless `all: true`), `deck_checkReady`
900-975 (`awake`, `buildMatches`, `runningAppId` with null for "nothing running", `pluginOpen`,
`noForeignCdpTunnel`, `modalOnScreen`, `focusRingOwned`, `machineKind`; a check it could not make reads `unknown`;
it has no field for a tab), `deck_holdAwake` 992 (`ttlMinutes` default 30, clamped 1 to 480; `note`),
`deck_restorePowerSettings` 1029 (lets the lock go), `deck_sleepAndWake` 1042 (`seconds` 45 to 600 only; refuses
with a game running, a lock held or the stop set), `deck_snapshotSettings` 1087 (`includeData`, `ttlMinutes` default
30, `note`, `replace`), `deck_restoreSettings` 1124, `deck_runReport` 1135. Every tool also takes `deadlineMs`. A
live `deck_status` reply on 2026-11-19 carried: `deckReachable`, `ollamaReachable`, `automationArmed`,
`automationStoppedSince`, `automationStoppedBy`, `machineStopped`, `bridgePortOpen`, `bridgeFirmware`,
`bridgeReason`, `lease`, `machine`. That day `bridgePortOpen` was false from the planning chat (the port would not
open) while the Deck answered.

**Recording today.** `scripts/record-deck.sh` (options at 17-28: `--mode`, `--seconds` default 15, `--quality`,
`--full-quality`; the Deck-side file is `/tmp/deck_record.mkv`, line 64; the download lands in `recordings/`). Its
Deck-side half is `scripts/deck/bonsai-record.sh` (471 lines), bonsAI's copy of the tools project's
`templates/scripts/deck/studio-record.sh`. The hand recipe for filming while the rig presses is in
`docs/planning/assets/99-runbook-filming.md:22-34`: start the script in the background, wait until
`pgrep -x gst-launch-1.0` answers on the Deck, then press; the rig's reading tools do not block while it runs; keep
something moving on still tabs. `deck_record` in the same message as another tool ran out of order and failed once
outright (`docs/mcp-setup.md`, the 2026-11-17 row).

**Other driver scripts.** The look check `scripts/probe_deck_ui_look.py` (header 1-20: run as
`ssh deck@<ip> 'python3 - --json' < scripts/probe_deck_ui_look.py`, exit code 1 when it finds anything, presses
nothing). `scripts/deck_place_chat.py` (recipes, `--remove <id>`, a placed chat shows after a reload or a switch).

**The Deck itself** (five reading-only commands over SSH, 2026-11-19). Product name `Galileo` (the OLED model),
SteamOS 3.9.5, build 20261023.100. In `/usr/bin`: `gst-launch-1.0`, `gst-inspect-1.0`, `pw-record`, `pw-cli`,
`ffmpeg`, `bluetoothctl`, `rtcwake`; no `wf-recorder`. `~/.local/bin` holds `grim` and no record helper. Video
plug-ins seen in `/usr/lib/gstreamer-1.0`: coreelements, pipewire, vpx, jpeg, matroska, mpegtsmux, rtp, rtpmanager,
rtsp, udp, tcp; nothing named va, vaapi, x264 or openh264 in that listing. `/home` has 718 GB free; `/tmp` is a
7.3 GB memory disk, so a recording sits in memory until it is copied off. The Deck's folder of elevated-rights
rule files holds five, read by name only: `decky_restart`, `no-fqdn`, `wheel`, `wheel-prepare-oobe-test` and one
named after the command itself; none names a capture helper (plan 19's L8). Bluetooth: powered, pairable, roles central and peripheral; paired devices PXC 550, Pixel 9 Pro,
StadiaKZLX-5fe9, Wireless Controller, i4, AirPods Q; the board is not paired. USB: the board shows as `ESP32S3_DEV`
at `1-1.2` with no wake file listed; "Wireless Receiver" (`1-1.4`) and "USB 10/100/1000 LAN" (`2-1.1.3`) read
`enabled` for wake. `/sys/class/rtc/rtc0/wakealarm` was empty. Screens: `DP-1` disconnected, `eDP-1` connected.

**The board.** `bridge/firmware/deck_bridge/deck_bridge.ino` in the tools project (350 lines): includes
`ArduinoJson.h`, `USB.h`, `USBHIDGamepad.h` (35-37) and nothing for Bluetooth; program name `07_version` (48); the
quiet-link limit 750 ms (50). Its README says "Not yet done: ... BLE transport" (`bridge/README.md:242`). The chip is
an ESP32-S3 with Bluetooth 5 LE (`bridge/README.md:46`). Flashing is the maintainer's, with the Deck-side cable out.

---

## D0 — Step 0: three tests to find out (a Deck block; the driver, Sonnet medium; runbook by the session)

The lines are the plan's § 5 and are not moved after a reading. One evidence file per test.

**T1, what a recording costs (`plan108e-P108E-REC-COST.json`).**
1. No game: unload the Deck's AI, launch Deep Rock Galactic: Survivor with the launch tool (the game earlier
   frame-rate rows used: `workshop:test-evidence/plan79-SCR-10-MISSION.json`), turn Steam's performance overlay to
   the level that shows frames a second.
2. Three screenshots ten seconds apart: read the game's frames a second from each. This is "before".
3. Start `bash scripts/record-deck.sh --mode game --seconds 60` in a background shell; wait for the recorder as the
   filming recipe says. While it runs, read the Deck's processor table once over SSH and keep the recorder's line.
4. "During" is read from the film itself: grab frames at 15, 30 and 45 seconds on the PC and read the overlay's
   number in each. (Whether a screenshot can be taken while a recording runs is unknown; do not depend on it.)
5. Three screenshots after the recorder ends: "after".
6. The panel half: with the game still up, open bonsAI, start a second 60-second recording, send one question, and
   measure the panel's frames a second while the answer arrives with the page-side frame counter from
   `workshop:planning/69-streamed-answers-scramble.md` (about lines 335-345). Repeat without a recording.
7. Record: nine game readings, the recorder's processor line, the two panel medians, the encoder the recorder's own
   log names, the file size, which screen was live. Exit the game; put the overlay back.
**Line:** during is at least 90 percent of the mean of before and after, and the panel median while recording is
30 or more.

**T2, the ring from a picture (`plan108e-P108E-RING-READ.json`).** Needs lane S0's script first.
1. On Settings and on Ollama, with no game: walk Down one press at a time. At each stop wait 1.8 seconds (a glide
   read early is caught half way; lessons § 4), then save a screenshot and one small page read: the focused stop's
   label, its box, the window's inner width and height, and the pixel ratio.
2. At least 40 stops over the two tabs. Do the whole walk twice.
3. Run the script on the PC over both runs. For every stop it also judges the same box in the previous stop's
   picture, where the ring was elsewhere: that is the control.
**Line:** ring found at 95 percent or more of stops the page calls visible; "no ring" on 95 percent or more of the
controls; the two runs agree on 95 percent or more of stops.

**T3, ways to wake (`plan108e-P108E-WAKE-ROUTES.json`).** The maintainer is near the Deck. No game, no lock held.
1. Reads first, no presses: is the Deck on the dock's wired network (`cat /sys/class/net/*/operstate`, and which
   address SSH uses); the wake files as in the facts above; the hardware address of the wired socket.
2. Baseline: `deck_sleepAndWake { seconds: 120 }` once. It must come back by its own timer. If it does not, stop the
   test: the power button, and nothing else is tried.
3. Network wake: `deck_sleepAndWake { seconds: 300 }`; 30 seconds after SSH stops answering, send a wake packet from
   the PC to the wired socket's address. Counts when SSH answers within 60 seconds of the packet and well before the
   300-second timer. Three times.
4. If step 3 fails all three: note for lane R4 that the next ways need work first (a wake signal from the board's own
   USB lead needs a new board program and a flash; a Bluetooth controller allowed to wake needs Bluetooth on the
   board). Do not try them in this block.
5. Record, per try: the trigger time, SSH back after how many seconds, where the ring was before and after.
**Line:** a way counts at 3 of 3 inside 60 seconds with the ring where it was.

---

## N2 — The night list and its rules (★★ `[QA]`, Sonnet high)

**What happens today.** The night command replays every file in the walks folder (106 of them). A walk has no start
of its own, many were saved on old builds over chats that have changed, and eleven press A or B. Nothing says which
walks are meant for a night, and nothing judges a tab by rules.

**Where it comes from.** `listCheckFiles` and the replay loop (facts above). The rule facts a sweep already returns
are in the saved-walk shape above.

**What to build.** New files only.
1. `scripts/deck_nightly_set.json`, the night list:
   `{ "formatVersion": 1, "maxMinutes": 45, "tabs": [ { "tab": "settings", "barName": "Settings", "sweep":
   { "direction": "DOWN", "returnTrip": true, "budget": 80, "stallLimit": 2 }, "knownHidden": [], "lookCheck": true,
   "picture": true, "walks": [] } ] }`. Ship six tab entries: search, main, ollama, settings, permissions, about.
   Not developer: it needs a switch turned on, and the night changes no switch. `knownHidden` entries are
   `{ "label", "verdict", "why", "row" }`; ship it empty (block DN fills it from the first real night). `walks`
   entries are `{ "name", "presses": "directions-only" | "a-and-b" }`; ship it empty (block DN saves fresh ones).
2. `scripts/lib/deckNightlySet.mjs`, pure functions:
   - `readNightlySet(path)`: reads and checks the list. A wrong shape is an error that names the field; a tab listed
     twice is an error.
   - `judgeSweep(tabEntry, sweepReply)` returns `{ verdict, findings, knownHiddenSeen, knownHiddenGone }`. Rules: a
     stop that is focused and not fully visible, whose label is not in `knownHidden`, is a finding (`hidden`);
     `cycles` over 0 is a finding; `unlabeledStops` over 0 is a finding; a reply that is not `ok`, was `stopped`, or
     visited no stop is `could_not_judge` with the reason. A `knownHidden` stop that was not seen is reported as
     gone. That is good news and never a failure.
   - `selectWalks(tabEntry, { allowAB })`: the walk names to replay; with `allowAB` false every `a-and-b` walk is
     left out and listed as "skipped by rule" (the maintainer's call e5).
   - `judgeNight(parts)`: the one verdict line and the exit code (0 clean, 1 findings, 2 did not start, 3 broke
     part way).
3. A sweep's live reply may carry more fields than the saved `expected` does. Read the reply's shape from the tools
   project's sweep source before you write the reader, and tolerate extra fields.

**Files owned.** The two files above and `scripts/deck_nightly_set.test.mjs`. Do not touch
`scripts/lib/deckOvernightRun.mjs` or `scripts/deck_overnight_run.mjs` (lane N1's).

**Tests.** Shape errors by field. `judgeSweep` both ways: a hidden stop off the list fails and on the list passes; a
known stop gone is reported and passes; a stopped sweep cannot be judged. `selectWalks` with and without A and B.
One test reads `src/features/plugin-shell/tabTitles.tsx` as text and fails if a `barName` in the shipped list is not
one of the names there, so a renamed tab breaks a test and not a night. Fixtures are written inline; no test needs
the workshop.

**The check that proves it.** Its tests; then **P108E-NIGHT-CATCHES** on the Deck in block DN.

## N1 — The night command starts safely and ends cleanly (★★★ `[QA]` `[platform]`, Sonnet high; after N2)

**What happens today.** Started on a Deck with a game running, the command would install over it (a reload under a
game froze Steam, plan 78). It takes a two-hour awake lock and never lets it go; a lock over an idle Deck left
Steam's sleep message stuck over Home on 2026-11-03 (row P102-R0-RESAVE-WALKS in `docs/testing.md`). It saves no
settings, though a mass replay once changed one (2026-10-24). It does not look at the safety stop, at who holds the
Deck, or at the board's port.

**Where it comes from.** `runOvernightSlice` and its tool list (facts above).

**What to build.**
1. **"May I start?"** before anything is held, installed or pressed: `deck_status`, then `deck_checkReady` with
   `{ awake: true, runningAppId: null, noForeignCdpTunnel: true, machineKind: "deck" }`. Refuse, calling nothing
   else, when: the Deck does not answer; the stop is set; `lease` names anyone; a game is running; any of those
   checks reads `unknown`; the board's port is shut; a needed tool is missing. A refusal writes the report with
   `started: false`, exits with code 2, and says one of these, word for word:
   - "The Deck did not answer. It may be asleep. Nothing was pressed."
   - "The safety stop is set. Only the maintainer re-arms it. Nothing was pressed."
   - "Another session is driving the Deck. Nothing was pressed."
   - "A game is running. The night run never starts over a game. Nothing was pressed."
   - "Could not tell whether a game is running, so it was treated as running. Nothing was pressed."
   - "The controller board's port would not open on this PC. Nothing was pressed."
2. **The bracket.** In order: hold awake (`ttlMinutes` = the list's `maxMinutes` plus 10, never 120), save the
   settings (`deck_snapshotSettings`, `ttlMinutes` = `maxMinutes` plus 15, note "bonsai night run"), install (skipped
   with `--no-install`, which tests what is on the Deck), open bonsAI (`deck_openPlugin`; one more try after ten
   seconds; then "could not open bonsAI after the install" and no body). Then the body (lane N3; until it lands,
   today's replay loop limited to the walks the list names). Then the end, every step tried even when one before it
   failed: put the settings back, let the lock go (`deck_restorePowerSettings`), close the client. The PC quick check
   runs after the lock is gone.
3. **A time limit for the whole run** (`maxMinutes`): once passed, no new step starts, the end still runs, and the
   report lists what was not reached. Every tool call passes a `deadlineMs`.
4. **A fence on what it may call.** One constant lists the tools the night may ever call; the call wrapper throws on
   any other name. The list has no game tool, no reload, no settings writer other than the snapshot pair, and nothing
   that touches the stop.
5. The dry run prints the new order. Exit codes as lane N2's `judgeNight` gives them.

**Files owned.** `scripts/lib/deckOvernightRun.mjs`, `scripts/deck_overnight_run.mjs`,
`scripts/deck_overnight_run.test.mjs`. The fake server needs no change: its config names the tools.

**Tests.** With the fake server and its call log: in each of the six refusals the log holds the two reading calls and
nothing else; the bracket's order; the settings put back and the lock released when the body throws; the time limit;
the fence (a call outside the list throws); exit codes. Break the game-running guard on purpose, see that test fail,
put it back, and name the failure in the commit message. The existing test file (387 lines) pins today's behaviour:
change those tests on purpose and say which. Search for other users first:
`git grep -n "deckOvernightRun\|deck_overnight_run"`.

**The check that proves it.** **P108E-NIGHT-REFUSES** and **P108E-NIGHT-PUTBACK**, block DN.

## N3 — Every tab walked, pictured and judged; the morning report (★★★ `[QA]`, Sonnet high; after N1)

**What happens today.** The report lists 106 replays that mean nothing, with tool names in it, and no picture.

**What to build.**
1. **The body, per tab in the list.** Reach the tab: read the bar's name (`deck_readPage`; read its inputs at the
   tool list first), press RB once (`deck_pressButton`), read again, until the name equals the entry's `barName` or
   seven presses have gone; then "could not reach the <name> tab" and on to the next tab. No tab order is written
   into the script. On the tab: a picture (`deck_captureScreenshot`, `outDir` a folder `overnight-<stamp>/` under the
   evidence folder); the look check when the entry says so (the command in the facts above, the address taken the
   way `scripts/deck/deck-remote-common.sh` takes it, no other text put into the command); the sweep with the
   entry's options; `judgeSweep`; then each walk from `selectWalks`, one call each, `{ checksDir, names: [name] }`.
   **A walk that differs is a thing to look at, whichever build it was saved on** (the night exists to hear about
   what moved; exit code 1). The report says whether the walk was saved on tonight's build or an older one, because
   a planned change shows up the same way as a fault; today's wording for that is at lines 137-144. A walk that
   could not run is "could not run", not a difference.
2. **Keep replies small.** Write each full sweep reply to `overnight-<stamp>-<tab>-sweep.json`; keep totals and
   findings in memory.
3. **The report**, in a new file `scripts/lib/deckNightReport.mjs` (leave the old builder until nothing calls it,
   then remove it in a commit of its own). Same names and folder as today (`overnight-<stamp>.md` and `.json`), plus
   a copy named `overnight-latest.md`. The first line is the verdict: "Clean night: 6 tabs walked, nothing hidden,
   nothing moved." or "2 things to look at: <the two>." or "Did not start: <the reason>." Then the build's short
   commit and whether it was installed, the times, one block per tab (stops visited; each finding by the stop's
   label and what was wrong; known half-hidden stops still there, and any that have gone; what the look check said;
   walks matched, changed, skipped by rule; the picture's file name), then what could not run and why, then the PC
   quick check. Plain words throughout the `.md`: no tool names, no field names. The `.json` keeps everything.

**Files owned.** The three files lane N1 owned (now landed) and the new report file with its test
`scripts/deck_night_report.test.mjs`.

**Tests.** A fake night of two tabs, one clean and one with a hidden stop: the verdict line, the exit code 1, the
finding named by label. A walk that differs, saved on tonight's build and saved on an older one: both are things to
look at, each with its build note. A tab never reached: its "could not run" line, and the next tab still runs. A
sweep that throws: the same. The `.md` holds none of the strings `deck_`, `undefined`, `null`. The latest copy matches the
stamped one.

**The check that proves it.** **P108E-NIGHT-RUN** and **P108E-NIGHT-REPORT** (the maintainer's read), block DN.

## DN — Two real nights and a planted fault (a Deck block; the driver, Sonnet medium; runbook by the session)

1. Reads first: the status; which screen is live; no game; no test chips pinned; hashes of the settings folder and of
   the chat list (values never printed).
2. `node scripts/deck_overnight_run.mjs --dry-run`, then the real command in a background shell. Nobody presses
   until it ends.
3. The session reads the report. Each finding is either real (to the bookkeeper as a roadmap bug) or already known
   (added to `knownHidden` with its row). Then one fresh directions-only walk is saved per tab with `deck_saveCheck`
   and named in the list.
4. **P108E-NIGHT-PUTBACK:** the hashes from step 1 again; the awake lock gone from the Deck's own list of locks; no
   chips pinned.
5. A second evening: the command again. **P108E-NIGHT-RUN** passes when both evenings end by themselves inside the
   limit with every listed tab walked.
6. **P108E-NIGHT-CATCHES:** take one `knownHidden` entry off the list; the night must go red and name that stop; put
   it back; green. If the list is empty, name on Settings a walk that was saved on Ollama instead: red, then put
   right, green.
7. **P108E-NIGHT-REFUSES**, three staged cases, each proven by the report's reason and by the rig's own run log
   showing no pressing call from the night's process: a game running (launch it with the launch tool, the Deck's AI
   unloaded first; exit it after); another session holding the Deck (start the command from a shell while the
   driver's own lease is live); the board's port shut (hold the port open from a second small program for two
   minutes). The "Deck did not answer" case rests on lane N1's tests, and on the first night the Deck is found
   asleep.
8. **P108E-FILM-WALK and P108E-FILM-STILL** (lane F1) fit in this block: a ten-press walk on Main filmed with one
   command; then the About tab, standing still.

## F1 — One command that films a check while the rig presses (★★ `[QA]`, Sonnet high)

**What happens today.** The hand recipe in the facts above, rebuilt in every runbook. A recording that fails on a
still screen reads as a plain failure. A fixed delay once started a take 30 seconds late.

**What to build.** New files only.
1. `node scripts/deck_film_check.mjs --plan 108e --row <ROW> --seconds <N> [--quality compressed|full]`. It starts
   `scripts/record-deck.sh --mode game` as a child, asks the Deck once a second (for at most 30 seconds) whether the
   recorder is running, and prints exactly one line `READY <time>` on standard output when it is. The driver starts
   pressing on that line. If the recorder never shows: exit code 3 and "The recorder never started on the Deck."
2. When the child ends, move the film from `recordings/` to the evidence folder as `plan<plan>-<ROW>.mkv`, and write
   `plan<plan>-<ROW>-film.json` beside it: the READY time, the end time, seconds, quality, bytes, and the result
   line's fields (the line `scripts/deck/bonsai-record.sh` writes; the same shape the tools project parses at
   `mcp-server/src/tools/captureOrchestrator.ts:9-10`). With `--ledger <file>` it also copies in the time and name of
   every rig call inside the window, read from that run-log file, so frames can be lined up with presses.
3. **A still screen is its own answer.** When the result says no frames came (the plugin-screen field reads `no`, or
   the method reads `failed` with a file of a few bytes), exit code 4 and "Nothing on the screen moved, so the Deck
   sent no frames. No film was made." The script itself never presses.
4. Limits: `--seconds` at most 180 at compressed and 30 at full, because the Deck keeps the film in memory until it
   is copied off (`/tmp` is a memory disk, facts above). `--plan` and `--row` must match `[A-Za-z0-9-]+`; nothing
   else from the command line reaches a shell.

**Files owned.** `scripts/deck_film_check.mjs`, `scripts/lib/deckFilm.mjs`, `scripts/deck_film_check.test.mjs`. Do
not change `scripts/record-deck.sh` or the Deck-side scripts: they are copies of the tools project's.

**Tests.** With an injected stand-in for the record command and for the "is it running" probe: READY is printed only
after the probe answers; never answering gives exit 3; the still-screen result gives exit 4 and its sentence; the
film is moved and named; a bad row name is refused before anything starts; the ledger window keeps only calls
between READY and the end.

**The check that proves it.** **P108E-FILM-WALK**, **P108E-FILM-STILL**, block DN step 8.

## S0 — The ring reader for step 0 (★★ `[QA]`, Sonnet high; a measuring script, not a repo file)

**What to build.** One Python script the session keeps in the workshop's research folder (hand it back as a file in
your copy's scratch folder, and name the path in your report; do not add it to the repo). Input: a folder of
pictures `stop-<n>.png` and a `stops.json` with, per stop, the label, the box in page units, the window's inner
width and height, and the pixel ratio. Per stop it maps the box to picture pixels (scale = picture width over the
window's inner width, checked against the height), samples a thin band just outside and just inside the box's edge,
and compares it with the same band in the control picture. Output per stop: a score, `ring` or `no ring`, and a
cropped picture; then the three totals test T2's line needs. Pillow and numpy are already on this PC for the tools
project's frame tools (`bridge/README.md:28-29` there); use them, and nothing new.

**Say plainly what it cannot judge:** a box partly off the picture, a stop the page calls covered, a picture taken
mid-glide. Those count as "not judged", outside both percentages, and the report gives their number.

**The check that proves it.** Test T2 in block D0.

## B1 — The driver's rules and the runbook learn the new commands (★ `[docs]`, Sonnet medium; after N3 and F1)

`.claude/agents/deck-driver.md`: to film a moving check, use the film command and press only after READY; never start
the night command while a block is running. `docs/agents/bug-wave-runbook.md`, "While nobody is watching": the night
command as the last act of an evening, and reading `overnight-latest.md` as a first act the next day. A changed
helper file loads only in a new session. Not `AGENTS.md`, not `CLAUDE.md`, not the filming runbook of plan 99.

## S1 — The PC starts the night run by itself (★ `[platform]`, Sonnet medium; only on call e4 (b), after R4 and ten good nights)

A small script `scripts/register_night_run.ps1` that prints the scheduled task it would add (daily, the hour the
maintainer names, running the night command in the shared checkout, waking the PC for it) and adds it only when the
maintainer runs it with its confirm flag. The session never runs it: a scheduled task is a system setting on the
maintainer's PC. The security reviewer reads it. Check: **P108E-NIGHT-SCHEDULED**, three nights.

---

## For the rig tools' project (lifted by that project's session; calls e6 and e7)

**R4 — Wake (only on call e3 (a)).** (1) `deck_status` says "asleep or off" apart from "the link failed", where it
can tell (the drafted ask 6, `workshop:planning/assets/104-deck-tools-issues-draft.md` lines 44-53). (2) A way to set
the wake timer for a chosen time without sleeping, read back as `deck_sleepAndWake` already does at its arm step, and
a way to clear it; today's tool only takes 45 to 600 seconds and always sleeps. With it an evening session can set
tomorrow's wake. (3) The wake that passed test T3. If that is the network wake: a call that sends the packet to the
address kept for the machine. If only the board can do it: a new board program and a flash by the maintainer.
Bluetooth last. Row **P108E-WAKE**: three wakes with nobody there.

**R3 — The ring as a number (only on call e8 (a) and a pass of T2).** That project's own planned entry "Measure
colours inside a control" (`docs/ROADMAP.md` there, lines 384-390), started from lane S0's script and T2's measured
numbers. An advisory field on a focus read (`ringSeen`, a score, a crop). It fails no row by itself until two weeks
of nights agree with the page's reading. Row **P108E-RING-NUMBER**.

**R2 — A live picture (only on call e2 (b) and a pass of T1).** A second branch on the recorder's pipeline
(`templates/scripts/deck/studio-record.sh` there, the pipelines at about 139-214) that sends the same encoded
picture to the PC while the file is written; the parts for it are on the Deck (facts above); the tool hands back the
one command that opens the viewer. bonsAI's copies of the record scripts are refreshed afterwards with that
project's own sync script, in a bonsAI commit of their own. Row **P108E-LIVE-VIEW**: under two seconds behind, and
T1's line still holds with it on.

**Asks only, no lane here:** a recording that can be started and stopped around other calls (lane F1 is bonsAI's
stopgap); a saved walk that carries its starting point (drafted ask 9). Posted only on call e7.

## The bookkeeper's paperwork

- **At go:** decision D145 gains calls e1 to e8 with the maintainer's answers, beside the other 108 letters. Open
  rows in `docs/testing.md` for P108E-REC-COST, P108E-RING-READ, P108E-WAKE-ROUTES, P108E-NIGHT-RUN,
  P108E-NIGHT-REFUSES, P108E-NIGHT-PUTBACK, P108E-NIGHT-CATCHES, P108E-FILM-WALK, P108E-FILM-STILL, each naming its
  machine; in `docs/testing-manual.md` the hand rows P108E-NIGHT-STOP and P108E-NIGHT-REPORT. The conditional rows
  (P108E-WAKE, P108E-RING-NUMBER, P108E-LIVE-VIEW, P108E-NIGHT-SCHEDULED) are added only when their lane is started.
- **The roadmap entry** stays in Features as PARTIAL. It drops "handheld runs over Bluetooth" only on call e1 (a),
  with a line in `docs/roadmap-shelved.md`. When the NIGHT rows pass, row OVERNIGHT-RUN-01 closes with their
  evidence files named, and the entry keeps only what is left.
- **The stand-in Decks entry** lost "nothing built" on 2026-11-19, so nothing is owed here: the tools project built
  the machine list and the pretend controller in October and bonsAI was walked on this PC on 2026-10-08 (that
  project's roadmap, lines 466-490).
- **`docs/mcp-setup.md`, the findings log:** one row per ask sent to the tools project, saying whether it was posted.
- **No changelog line:** nothing a player sees changes.

## The reviewers' questions

**Security (N1, N3, F1, S1; R4 in the tools project).** Can anything typed on a command line, read from the night
list or read from a tool's reply reach a shell? In which exact states can the night command press, and is "nothing
pressed" proven for each refusal? What can it leave changed on the Deck after a crash at each step (the lock, the
settings copy, a picture folder)? It starts whatever command `.mcp.json` names for the tools server: who can change
that file, and should the path be checked? For S1: what runs, as whom, and does it widen anything.

**Open source.** Nothing is added to the repo's dependencies. If R3 or S0 would bring an image library into either
project's shipped files, it is asked first.

## Outside facts and where they came from

- The OLED Deck can be woken over Bluetooth since launch, and SteamOS 3.6 added a switch per paired device; results
  differ by controller. Not yet confirmed here.
  <https://www.gamingonlinux.com/2025/07/steamos-3-7-14-beta-brings-wake-on-bluetooth-back-to-the-steam-deck-lcd>,
  <https://www.gamingonlinux.com/2025/10/steamos-3-7-17-beta-disables-wake-on-bluetooth-for-steam-deck-lcd-again/page=1/>,
  <https://steamcommunity.com/app/1675200/discussions/0/4038101970211260327>
- A Bluetooth LE gamepad library exists for this board's chip. Whether the Deck would take it as the same kind of
  controller as the wired one is not known. Not yet confirmed here.
  <https://github.com/lemmingDev/ESP32-BLE-Gamepad>, <https://github.com/Mystfit/ESP32-BLE-CompositeHID>
- That a USB device can ask a sleeping computer to wake, if the computer allows that device, is general knowledge and
  was not looked up; on this Deck the board has no wake file today (facts above). Not yet confirmed here.
