# 96 — Ship-ready bug session: the fixes, the first-run popup and the hand checks before 0.6.0

Written 2026-10-17 by the plan 94 chat, at the maintainer's request after the fresh-install walk: "throw these into a
separate plan, along with other bugs that should be sorted out in order for us to be ship-ready. I'll execute that plan in
another chat." Everything here comes from [plan 94](94-fresh-install-walk-and-ship-readiness.md) (its § 7a, § 8 and § 9) and
the roadmap as filed that night.

**Status:** RUNNING since 2026-10-18 02:30 UTC (see § 8). The maintainer's calls are in § 2. The first-run popup waits for the maintainer's tweaks
on the mock-up page (§ 4, N1). The hand checks (§ 5) can run any time the Deck is free, before or during this session.

**Who runs it:** an Opus xhigh chat orchestrates and lands (AGENTS.md, "Which model does which work"); Sonnet 5.5 high
lanes build the fixes that need a judgment, Sonnet 5.5 medium the mechanical ones; focus and layout fixes are Opus xhigh
after the Deck measurement named in each row; the deck-driver helper runs the rows; the bookkeeper files the paperwork.
Never alongside another Deck session: ask the README chats for a window first (two of them use the Deck for filming).

**Read first:** [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) § 3; plan 94 § 9 (the
findings, each with its evidence file); the roadmap's Bugs section as of the start day.

---

## 1. One sentence

Fix the eighteen things a new player on the stable channel would hit first, build the three small features the maintainer
chose on 2026-10-17 (the first-run popup, the Search tab finding bonsAI's own settings, a Decky wipe counting as a fresh
start), reproduce or close the three three-star focus bugs, and get the maintainer's eight hand checks answered, so that
0.6.0 can be cut from a build that has been proved on a true first install.

## 2. The maintainer's calls (2026-10-17 evening)

1. **"Run AI on this Deck" starts ON**, and a new first-run popup asks where the AI should run, right after the beta
   notice, drawn like the Ollama tab's "Where the AI runs" section. **Mock-up for the maintainer's tweaks before any
   build:** https://claude.ai/artifact/MeKFsSuicspFFSP1y98Yxi (open it in a web browser signed in to claude.ai so the
   picks and comments save; two options drawn at the Deck's real size, option A is the spec).
   **Chosen 2026-10-17 evening, in chat: option A.** Tweaks, if any, still come from the page's comments.
2. **"Update AI & models" re-downloading Ollama on every press is by design**, as long as the Internet downloads
   permission is on. Close that roadmap entry as not a bug (one check: the button must do nothing with downloads off).
3. **The Search tab finds bonsAI's own settings** as well as Steam's ("mic" finds Voice input).
4. **The guide's "type brightness into the question box" line gets fixed here** if the README chat has not fixed it first.
5. **The version becomes 0.6.0 on release day** (plan 71); the clean-install row is re-run from the CI zip then.
6. **The old aside folder on the Deck was deleted** 2026-10-17 (the plugin had reinstalled everything newer).

## 3. What a player notices after this session

- Asking before the AI is set up gets a plain "the AI is not set up yet" with a button to the Ollama tab.
- The first answer after an install says it is loading the AI instead of sitting on "Still going..." for two minutes, and
  the model is warmed once right after the install so the wait is shorter.
- A new player is asked where the AI should run as soon as they close the beta notice.
- Picking a Thinking level the first time sticks; a ticked Strategy step stays ticked after the panel is reopened.
- The screenshot picker and "Explain further" can be used with the controller.
- Wiping Decky's settings, or clearing bonsAI's data, really starts fresh (the first-run screens come back).
- The Search tab finds bonsAI's settings; the Ollama tab's Cancel reads cancelled; small wording and focus slips are gone.

## 4. The work, in batches

Every row: stars, tag, who builds it, what done looks like, and the Deck row that proves it. Lanes never edit the roadmap,
testing or changelog; the bookkeeper does, with the evidence file named. Evidence files for this plan: `plan96-<ROW>.json`
in the workshop's `test-evidence` folder.

### Batch 1 — first impression, must fix before release

| # | Stars, tag | What a player sees today | Fix, and who | Done when | Deck row |
|---|---|---|---|---|---|
| F1 | ★★ ask | With no AI installed, a question answers "No models in the fallback list match your Model policy tier..." with no way to the Ollama tab | Say "The AI is not set up on this Deck yet" and offer "Open the Ollama tab" (the same jump the permission hint uses). Sonnet high | The message names the real cause and the button lands on the Ollama tab's first control | P96-F1-NO-AI |
| F2 | ★★ first-run | The first answer after an install waits about two minutes with only "Still going..." | Two halves: after the install and starter set finish, load the model once in the background (back end); while a first word is more than about 10 s away, the status line reads "Loading the AI. The first time takes a minute or two." Sonnet high | A first answer after a fresh install shows the loading line, and a second cold start is under 60 s to the first word (measure both) | P96-F2-COLD-START |
| F3 | ★★ ollama | The first Thinking pick is lost behind its notice (the screen reads Brief, the file says off, the pick is gone after reopen) | Same shape as the local-runtime notice fix of 2026-09-30: save the setting before the notice opens. Sonnet medium | First pick saved and held after close and reopen | P96-F3-THINKING |
| F4 | ★★ strategy | A ticked checklist step is lost when the panel is reopened; the saved list is emptied at reopen (no game) | Find why the list is cleared on mount with no game; keep the list keyed by chat when no game is running. Sonnet high | Tick, close, reopen: still ticked, with and without a game | P96-F4-TICK |
| F5 | ★★ screenshot, focus | "Attach recent screenshot" opens a grid the controller cannot enter; B closes the whole plugin | Give the grid a focus owner (first thumbnail gets the ring), B closes the grid only. Opus xhigh; measurement `plan94-P94-SCREENSHOT-try2.json` | The ring lands on the newest thumbnail, A attaches it, B closes the grid and the ring returns to the paperclip; one picture question answered | P96-F5-PICKER |
| F6 | ★★ glossary, focus | "Explain further" under a glossary word cannot be reached with the D-pad, and sends "Explain: overclock" without the game's name | Make it a stop below the word's box (Down from the open word), and put the game's name in the question it sends. Opus xhigh; measurement `plan94-P94-GLOSSARY.json` | Down from an open word reaches Explain further; A sends "Explain: overclock (Deep Rock Galactic: Survivor)" or the equivalent | P96-F6-EXPLAIN |
| F7 | ★★ voice | Ask pressed about 2 s into a recording sent only the first half of the sentence (one try; plan 86 had it passing) | First the driver repeats it three times (the recorded sentence, Ask at 2 s, 5 s and 8 s). If it fails twice: Sonnet high finds why the final read is skipped when Ask comes early | Ask while listening sends the whole sentence three times out of three | P96-F7-ASK-WHILE |
| F8 | ★★ reply | Expert gave a shorter answer than Speed (454 vs 751 characters) and answered half a two-part question (one sample) | First measure: five differently worded questions in each mode, lengths recorded. If Expert is not clearly longer, Sonnet high looks at the Expert prompt and length settings | Expert's median length above Speed's on five questions, and two-part questions answered in both parts | P96-F8-EXPERT |
| F9 | ★★ voice | After the voice engine installs, the section says "not installed" until the tab is left and re-entered (about 105 s after the files land) | Refresh the section when the install finishes (the install's done event). Sonnet high | The section reads ready within 5 s of the install finishing, without leaving the tab | P96-F9-VOICE-REFRESH |
| F10 | ★ ollama | Cancel on "Turn on internet downloads?" leaves "Failed (check the Internet downloads permission?)" | A cancelled box leaves the line as it was. Sonnet medium | Cancel: the line unchanged; Confirm with downloads off: the permission line | P96-F10-CANCEL |
| F11 | ★ focus | Down from "Open Permissions" on the mic hint lands on Dismiss; after Dismiss the ring sits on nothing | Opus xhigh; measurement `plan94-P94-VOICE-PERM.json` | Down leaves the row; Dismiss hands the ring to the chips or the box | P96-F11-HINT-RING |
| F12 | ★ focus | Under "Not really", Down skips "Too long" and "Too short"; the rating row under a stopped answer is skipped both ways | Opus xhigh; measurements `plan94-P94-RATING.json`, `plan94-P94-STOP-RETRY.json` | Every reason is a stop; the stopped answer's Helpful / Not really are stops | P96-F12-RATING-STOPS |
| F13 | ★ wording | "The local AI isn't installed on this Deck yet" stays after the install; the install box does not say where Ollama itself comes from (ollama.com) and says "Cancel or B installs Ollama only" when Cancel installs nothing | Sonnet medium | The line goes when the install finishes; the box names ollama.com; the Cancel wording is true | P96-F13-INSTALL-WORDS |
| F14 | ★ ui | "Sum up this chat" is greyed with no reason | A help line: "Available once the chat is longer than the AI's memory". Sonnet medium | The line shows while greyed | P96-F14-SUM-UP |
| F15 | ★ kb | The library line reads "Installed - version 2026.10.17" with no game count | Add "38 games" from the file. Sonnet medium | The count shows and matches the file | P96-F15-KB-COUNT |
| F16 | ★ ui, focus | About: "Bugs & Feature Requests" is 67 % visible (clipped in the links box) and "Support my Steam Sale habit" is never a Down stop | Opus xhigh; measurement `plan94-P94-TABS-WALK.json` | Every link fully visible and a stop | P96-F16-ABOUT-LINKS |
| F17 | ★ docs | The guide says typing "brightness" into the question box offers the Steam setting; it does not on this build | **DONE 2026-10-17 by the README chat** (commit `a86801b0`): the guide points at the Search tab, and its saved-chats passage now says LT/RT switch chats on Main | The guide matches the build | none |
| F18 | ★ models | Under the open-weight choice the two Qwen 2.5 rows showed no research-only licence pill the rig could read; an uninstalled qwen3.5:4b row shows under Open source only | Check the catalog data and the pill drawing. Sonnet high | The pills read on the Deck; the extra row is right or removed | P96-F18-PILLS |
| F19 | ★★ reply, ui | The Strategy checklist's steps are on/off switches | **Maintainer's call 2026-10-17:** checkboxes, since the steps are a list you tick off, not settings. A still ticks and unticks; a ticked step looks done; the ring path is unchanged. Sonnet high, then one Deck walk (focus inside an answer: Opus xhigh reviews) | The list shows checkboxes on the Deck; A ticks and unticks; Up/Down walk the steps as before | P96-F19-CHECKBOXES (then the README chat re-shoots the "Where are you at?" clip and the end of the long Main-tab video) |
| F20 | ★ wording | The checklist note says progress lasts "until you reset session cache"; no control has that name | Say what clears it: a new Strategy question, leaving Strategy, or Clear all data. Sonnet medium | The note names only real actions | P96-F20-CHECKLIST-NOTE |
| F21 | ★ wording | The AI models window heading reads "LICENCE" while the README is now in US spelling | Maintainer's call: follow the README ("LICENSE", and "license" in the guide) or leave it. Sonnet medium | The heading matches the call | none (wording) |
| F22 | ★★ chips, layout | The suggestion chips change too fast and look busy, and their text (12 points) makes long questions scroll | **Maintainer's ask 2026-10-17:** slower changes (today a chip stays 4 to 9 s, or 6 to 14 s at the slower pace, with about 1 s fades); a long chip's text scroll plays through at least once before the row moves on; smaller chip text, and shorter chips if the smaller text leaves empty space. Opus xhigh after a Deck measurement of the row (layout); the pace numbers are a Sonnet medium change | The maintainer likes the pace and size on the Deck; a long chip is read to its end before it changes; no chip text clipped; free-play sweep clean | P96-F22-CHIP-PACE-SIZE |
| F23 | ★ ui | With the AI on a PC, the "PC" saved-address button and "Save current PC address as quick host" in Where AI runs have a white background, unlike the plugin's other buttons | **Maintainer's report 2026-10-17.** Draw them like the other buttons. Sonnet medium | Both look like the tab's other buttons on the Deck, focused and not | P96-F23-HOST-BUTTONS |
| F24 | ★ ui | The thinking line's spinner sits still as a three-quarter circle | **Maintainer's report 2026-10-17.** Find why the turn animation no longer runs (missing animation, or reduced motion). Sonnet high | The spinner turns on the Deck while an answer is thought about | P96-F24-SPINNER |
| F25 | ★ ui | Buttons lopsided, pressed against an edge or too small for their words ("Test connection" and the PC address box flush right; About's links hug the left and "Bugs & Feature Requests" needs 172 px in 158) | **Maintainer's ask 2026-10-17:** run the look check (QA-LOOK-01, new script) on every tab and both screens; fix every finding; a person looks at one screenshot per tab. **Note 2026-10-17 (plan 86 step 4 Deck block, build `a1b00906`, the monitor):** the look check found About's "Bugs & Feature Requests" text 172 px in a 158 px button, both suggestion chips on Main touching the panel edge, the Ask button's word needing 59 px in 54, and the Developer tab's rows flush against both panel edges with no side gutter while Settings keeps one (`workshop:test-evidence/plan86-S4-LOOK*.json`, `plan86-S4-TABS-developer.png`). Opus xhigh (layout, after the measurement), Sonnet high for the fixes | The look check reports nothing on any tab, both screens | QA-LOOK-01 |
| F26 | ★ ollama | The PC address box asks for the port too | **Maintainer's call 2026-10-17:** only the IP address; the back end already adds 11434 when no port is given. Change the hint and the line under the setting to say the port is assumed; README example updated by the README chat. Sonnet medium | A bare address connects; the hint shows one | P96-F26-BARE-ADDRESS |

### Batch 2 — the three features from the maintainer's calls

| # | Stars, tag | What it is | Who | Done when | Deck row |
|---|---|---|---|---|---|
| N1 | ★★★ first-run, focus | **The first-run popup "Where should the AI run?"**, after the beta notice: the Ollama tab's "Where the AI runs" section as a popup (switch on by default, Install Ollama / Test connection, Not now first, the ring starting on Not now). Build only after the maintainer's picks and comments on the mock-up are read (ArtifactData on the mock-up page: collections `picks` and `comments`) and the design is settled in one line here. Opus xhigh plans the focus graph (a new popup with a switch, a field and buttons is focus work); Sonnet high builds; the local-runtime notice goes away or merges into it (the maintainer's call on the mock-up) | Opus xhigh + Sonnet high | A fresh install (Clear all data) shows: beta notice, this popup, Main with the help chip; every button in it is a stop; Install opens today's download box; Test connection works with a PC address; Not now leaves everything as it was and the Ollama tab still offers the same section | P96-N1-FIRST-RUN-POPUP, run as a true first run after Clear all data |
| N2 | ★★ search | **The Search tab finds bonsAI's own settings** as well as Steam's: "mic" lists Voice input, A lands on it | Sonnet high | "mic", "spoiler", "text size" each find the bonsAI row, A lands on the setting; Steam's results stay | P96-N2-SEARCH-OWN |
| N3 | ★★ first-run | **A Decky wipe counts as a fresh start.** Today Steam's own browser storage keeps the plugin's "already seen" flags through a Decky reinstall, so a wiped Deck shows no first-run screens. When the back end starts and finds no settings file, it reports a first run; the screen then clears its own stale flags before deciding what to show. Clear all data stays the explicit wipe. (Decky's own uninstall dialog cannot be changed by a plugin; newer Decky versions call a plugin method on uninstall, not verified on 3.2.10, and deleting a player's models on uninstall without asking would be worse than keeping them, so no uninstall popup is planned) | Sonnet high | Wipe Decky's settings folder for bonsAI over SSH, reload: the beta notice and the popup show again; a plain reload with a settings file shows nothing | P96-N3-FRESH-START |

### Batch 3 — the three-star focus bugs, measured first

| # | Stars, tag | Today | Next step | Who |
|---|---|---|---|---|
| R1 | ★★★ focus, tabs | After a Steam pop-up (the About language list) or Steam's browser, Down from an open Settings section's line stops moving the ring while the page's own focus moves; a Quick Access close and reopen does not clear it; a plugin reload does (plan 94 blocks 6 and 7). **Seen nine more times the same evening by the README filming chat (five on the Deck's own screen, four on the monitor)** (2026-10-17): Down stops after a Steam box or a menu close, the page reports it has no focus each time, only a plugin reload clears it. The maintainer wants a root-cause dig; it may get its own chat before this session. **The readings are in the workshop's plan 95 § 13** (commit `a86801b0`): the page's `document.hasFocus()` is false in every stuck reading and true in every working one; `window.focus()` leaves it false, so the plan 76 refocus guard cannot work there; Down (the plugin's own focus hops) is dead while Up (Steam's own moves) works; Steam's boxes always take focus away and sometimes it never comes back. Start the dig from those readings. **Fifth sighting, 2026-10-17 21:55 UTC on the monitor:** the plugin's own "Close menu & take screenshot", then reopening Quick Access: `hasFocus()` false, Steam's ring on the question box while the page's focus was on Ask, Down and Left dead. The same steps on the Deck screen an hour earlier did not trigger it, but this is the cheapest trigger seen; on the monitor it left the page without focus 3 of 4 tries, and one more menu close and reopen cleared it each time. | The driver reproduces it three times with that exact trigger (About → language list → pick nothing → Settings → open Data → Down) and three times without the trigger. With the trigger in hand, Opus xhigh reads where Steam's ring and the page's focus part ways | Opus xhigh after the measurement |
| R2 | ★★★ focus | After a stopped answer, Down loops between the question, the answer and Retry (plan 86); plan 94 could not reproduce it with a stopped answer that had a notes card under it | The driver stops an answer with the knowledge library OFF (no notes card) and with Show details absent, twice. If it loops: Opus xhigh fixes the Down chain (the entry names the helper). If not: close the entry as not reproduced on two builds | Opus xhigh |
| R3 | ★★★ chips, focus | "Preset chips cannot always be reached near the end of an answer" and "the ring goes wrong after sections are opened (b)" both need the maintainer's exact presses; six rounds each found nothing | Ask once more, on the hand-check page's comment box. Without steps by the session's end, they go into the README's known-problems list with "reload the plugin" as the cure | the maintainer |

## 5. The hand checks (stop points)

The eight checks the rig cannot do are on one page, each with short steps and a Pass / Fail / Skip answer with a comment:
**https://claude.ai/artifact/FTe9Lr1sS2Kfrj8nBTVrhi** (open it in a web browser signed in to claude.ai, not the app's own
panel, or the answers are lost). About 40 minutes in all. The Deck must be free: after the README chat's filming block.

| # | Check | Settles |
|---|---|---|
| 1 | The About reply-language pick by hand | the ★★ language entry (rig or plugin) |
| 2 | Rename a chat on Steam's keyboard | the chat-rename half of plan 94 block 4 |
| 3 | Attach a screenshot by touch and ask about it | whether F5 is controller-only |
| 4 | Three questions into the real microphone | the ★★★ mic entry, the ★★ Stop-then-mic entry, the doubled-words entry, F7 |
| 5 | The parental lock, seen locked | the Kids lock Verify rows |
| 6 | The first-run wording, from the pictures | plan 73 check 4's eye half |
| 7 | The ghost tab bar after a touch | the ★★ tabs entry |
| 8 | The Show details slot by right-stick scroll | the ★★★ slot entry's owed half |

**How the session uses them:** at each stop point below, the session reads the page's answers with ArtifactData
(collection `results`, one document per check: `verdict`, `comment`, `at`) and, if a check is not answered yet, asks the
maintainer in one short line and continues with the next batch. The stop points: before batch 1 lands (checks 1, 3, 4);
before N1 is built (check 6, and the mock-up picks); before the README's known-problems list is written (checks 5, 7, 8).
A Fail becomes a roadmap entry with the maintainer's words as the description; a Pass closes the rows it settles,
by the bookkeeper, naming the page as the evidence.

## 6. Release day, after this session (plan 71)

1. The version to 0.6.0 (plugin.json; the sync script carries it), the changelog's Unreleased block dated.
2. Merge to `main`; CI builds the zip and publishes the release.
3. The zip check script on CI's artifact (plan 74 once found NOTICE and the data folder missing).
4. The clean-install row once more from that zip: uninstall in Decky, Settings → Clear all data first, install from the
   zip, one answer. The Tier 4 table in testing-manual.md gets its second row.
5. The README's known-problems list from whatever stays open: today's candidates are the 39 frames a second with a game
   and the AI both on the Deck, the ring stall's cure (reload the plugin), and R3 if no steps come.
6. Plan 86 step 4 and onward (the folder moves, the test merge, the untangling) start only after the release is out.

## 7. Who does what

| Work | Model, effort | How many at once |
|---|---|---|
| Orchestrate, land, read failures, write Deck rows | Opus xhigh (the chat) | one |
| F1, F2, F4, F7, F8, F9, F18, N2, N3 | Sonnet 5.5 high lanes (bugfix-lane, feature-lane) | up to six |
| F3, F10, F13, F14, F15 | Sonnet 5.5 medium (bugfix-lane-sonnet-medium) | up to four |
| F5, F6, F11, F12, F16, N1's focus graph, R1, R2 | Opus xhigh, one at a time, each after its measurement | one |
| The Deck rows | deck-driver (Sonnet 5.5 medium), one block per driver, fresh driver per block | one |
| The paperwork | bookkeeper (Sonnet 5.5 medium); in a chat where the agent type is missing, general-purpose on Sonnet with the bookkeeper's file read first | one, never during a landing |

Gates as always: every lane runs its own tests at two workers and the cheap checks; the quick check and the full sets only
at landing; `verify.py --full` gated on its exit code before the final push.

## 8. Progress log

- **2026-10-17:** written. The mock-up and the hand-check page published (§ 2 and § 5). Nothing started.
- **2026-10-18 02:30 UTC (the maintainer's evening of the 17th):** started, on Fable at high by the maintainer's choice (the plan says Opus
  xhigh). The baseline full check passed on tip `613cc60c`. Thirteen lane copies cut; ten Sonnet lanes started at 02:56, two more
  as slots freed (F3 upgraded to Sonnet high: the save-before-notice shape needed a choice; the models lane). Held: F24 (the
  spinner is held still on purpose while a game runs, plan 70; the maintainer's call), F7 and F8 (the Deck measures first).
  The session does F5, F6, F11, F16 and F25 itself in its own copy from the plan 94 and plan 86 measurements. The Deck did not
  answer at the start and answered again by 03:05 UTC; no other chat held it. The hand-check page had no answers yet; the
  mock-up page shows option A liked, no comments.
- **03:00 to 03:30 UTC:** every lane reported. Four things turned out to be by design and went to the maintainer as calls: the
  still spinner (plan 70's frame-rate measure with a game), the stopped answer's greyed rating buttons being stepped over (plan 56)
  and the reasons' second column reached by Right, the Steam Sale link beside the column reached by Right (plan 92), and the
  Update button's Failed line after Cancel (the 2026-10-10 call; only Install's path was wrong). Landings run one by one with the
  gates: F9 (`4fb2f8ec`), the install words and Cancel (`091b1b6f`), the chip pace (`345c8cc7`), then the rest in order.
- **03:30 UTC:** landed so far: F9, F10+F13, F22 pace, F14+F15, F23+F26, F3, F1, F2 (nine lane commits). F2's landing tripped the
  size guard (the Ask service went to 401 lines of code); the loading-line timer moved to its own small file (`75db8faf`), and
  the quick check runs again before the strategy, N3, models and N2 lanes and the session's five focus fixes land. The maintainer
  freed the Deck at 03:24; another chat's rig lease ran until 03:31, then block M (setup, Expert against Speed, the chip row and
  the Ask pill measured, the stopped answer with no notes card) started with a fresh driver (runbook
  [assets/96-runbook-block-M.md](assets/96-runbook-block-M.md); block V, the mic and the ring stall, is written and waits).
- **03:50 UTC, the PC ran out of memory** (a browser process at 16 GB, memory 96 percent committed): a commit and the quick check
  failed; the maintainer freed it by 03:48 and everything resumed.
- **04:00 UTC, Deck block M done** (build `a1b00906`, the Deck's own screen, the Deck's AI; evidence `plan96-P96-*`). **F8 FAIL:**
  ten differently worded two-part Hades questions, Expert's median 511 characters against Speed's 551, first word 31 s against 26 s,
  both parts answered 3 of 5 (Speed) and 4 of 5 (Expert): a Sonnet high lane now gives Expert its own depth block and every mode a
  rule to answer each part. **Chips measured:** two-chip row 147 px wide with 129 px for words needing 140 to 232 px (every long
  chip scrolls); one-chip row 300 wide fits. **Ask pill:** content 56 in 51 by the check, nothing cut by eye (letter-spacing after
  the last letter): the pill now takes its content's width. **Look check:** Settings, Permissions, Search, Developer and Ollama
  clean; About's Steam-drawn language dropdown reads as a light button; Main's findings are the transcript's own rows and the
  chips (to be exempted). **R2:** the stopped answer's Down reached the question box in 3 and 4 presses with no stop twice, with
  the library off; one try still drew a notes card with the switch off ("From bonsAI's own note": the built-in notes?), a question
  for the bookkeeper's roadmap note. Block V (the mic, the ring stall's trigger) started with a fresh driver.
- **04:10 UTC, Deck block V done** (evidence `plan96-P96-F7-ASK-WHILE-1..3`, `plan96-P96-R1-*`). **F7:** Ask pressed 2 s into a
  5 s sentence sent only the 36 characters spoken by then; at 5 s and at 8 s the whole 82-character sentence went. Ask stops the
  recording and sends what has been said so far, so this is how it is meant to work, not a bug; the maintainer's real-mic hand
  check stays owed. **R1:** the ring stall did not reproduce in nine tries (the About language pop-up route three times, the
  plugin's own screenshot-and-reopen three times, three controls): the page had focus and Down moved every time. Root cause still
  unknown; the README's known-problems line keeps "reload the plugin". Also seen: after each plugin reload the Decky tab was
  missing from the rail and opening failed twice (the known rig entry); seven screenshots appeared in Steam's folder around the
  menu chords (unexplained). Landed meanwhile: strategy (with a ring-class fix, `4a22a85e`), N3, models, N2; the session's five
  focus fixes and F8 land next, then the chip size and Ask pill. The first-run popup lane (N1) starts now.
