# 96 — Ship-ready bug session: the fixes, the first-run popup and the hand checks before 0.6.0

Written 2026-10-17 by the plan 94 chat, at the maintainer's request after the fresh-install walk: "throw these into a
separate plan, along with other bugs that should be sorted out in order for us to be ship-ready. I'll execute that plan in
another chat." Everything here comes from [plan 94](94-fresh-install-walk-and-ship-readiness.md) (its § 7a, § 8 and § 9) and
the roadmap as filed that night.

**Status:** RAN 2026-10-18 02:30 to 06:30 UTC, then the maintainer's afternoon to about 20:00 UTC (the hand checks, four more changes, three scopes). Everything landed; the night's commits were pushed by the README chat, the afternoon's are NOT PUSHED yet. **Updated 2026-10-22:** F8, F9, F10 and F13 passed on the Deck on 2026-10-22 (rows P96-F8-EXPERT, P96-F9-VOICE-REFRESH, P96-F10-CANCEL, P96-F13-INSTALL-WORDS; the roadmap's Done section, "Closed 2026-10-22 (plan 97 fourth sweep)", the entries on Expert mode, the Ollama-tab buttons, the Cancel box, the install box and the voice engine), so they are no longer owed. Still owed: the push, the parental lock and the first-run wording from the hand checks, the three scoped bugs (fix later), R3's presses. The maintainer's calls are in § 2. The first-run popup waits for the maintainer's tweaks
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

**Results (the maintainer's answers on the page, 2026-10-18, about 17:20 to 17:40 UTC, the Deck's own screen; the bookkeeper wrote them into the roadmap and the test documents):**

1. Reply-language pick by hand: **FAIL**, "just flips back to Follow system". The ★★ language entry stays in Bugs, now confirmed by hand.
2. Rename a chat: **PASS on the Deck itself** (the keyboard pops up, the rename works). With an external controller the keyboard never shows, even with Steam + X: a new ★ `[platform]` Bugs entry, a candidate for the README's known-problems list.
3. Screenshot by touch: the attach by touch **works** (so the touch half of F5 passes); the answer **FAILED** with "incomplete stream" (`workshop:test-evidence/plan96-HAND-screenshot-by-touch.png`); the ★★ `[ask]` entry is confirmed by hand.
4. Real microphone, three questions: **PASS**, "looks good" (`workshop:test-evidence/plan96-HAND-real-mic.png`). Closed to Done: the ★★★ mic entry, the Stop-then-mic entry and the doubled-words entry, with their rows and the real-voice halves of plans 88 and 94.
5. Parental lock: **SKIP**, a child-account profile has to be made first. The Kids lock rows stay owed.
6. First-run wording: **no verdict yet**, the maintainer could not find the pictures (sent since). Stays owed, with the picture paths in the row.
7. Ghost tab bar after a touch: **FAIL** (`workshop:test-evidence/plan96-HAND-ghost-tab-bar.png`). A second strip over the chat, read as Steam's own bumper hint stuck; unproven. Rows TAB-BAR-GHOST-01 and P84-TABS-02 failed.
8. Show details slot by right stick: **FAIL as a premise**, "the right stick does not scroll". The owed half of the slot entry closes as cannot be done; the chips-near-end entry keeps waiting for the exact presses, a touch scroll now the remaining suspect.

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
- **04:30 UTC, everything landed and deployed.** The focus fixes, F8 and the chip size landed; three landings tripped guards on
  the way (the Ask service's size guard, a button without the ring class, copy-pasted test lines, then a text-size test pinning
  the chip at 12 px), each fixed in its own small commit (`75db8faf`, `4a22a85e`, `e67c6196`, `ee45d6ad`). Two landings ran at the
  same time once by a scripting slip (the focus branch and F8); both sets of gates ran on the combined tree and only the copy-paste
  guard failed, so nothing was lost. Build `a29f9eb0` deployed to the Deck; block D (one check per fix, runbook
  [assets/96-runbook-block-D.md](assets/96-runbook-block-D.md)) started with a fresh driver; the bookkeeper's sweep runs beside it;
  the first-run popup lane (N1) is building.
- **04:55 UTC, the bookkeeper's sweep landed (`2d3826ec`):** 21 fixes moved to the Deck-check list with their rows, N2 and N3
  recorded, F7 and F12 closed as by design, R2 closed as not reproduced on two builds, the two maintainer calls closed, F24 and R1
  left open with the night's notes; the roadmap trimmed back under its ceiling (97 KB; the testing file is at 163 of 165 KB).
- **05:05 UTC, the first-run popup landed (`5da13f81`, lane N1, two commits plus the advisor's one note: the ring's return after
  the download box goes through the popup's own transfer).** The popup replaces the old Local runtime notice; Find LAN inside it
  shows with the Developer tab only, as on the tab; switches save the moment they are touched; a player upgrading with the old
  notice already seen will see the popup once. Block E (runbook [assets/96-runbook-block-E.md](assets/96-runbook-block-E.md))
  runs it as the screen's first run with the settings file removed, so the Deck's Ollama is not wiped; the true Clear-all-data run
  is release day's clean-install row.
- **05:20 UTC, Deck block D done** (build `a29f9eb0`, evidence `plan96-P96-*`, handover [assets/96-handover-D.md](assets/96-handover-D.md)).
  **PASS:** the loading line (about 9.5 s after Ask, first word at 11 to 13 s), the picker's steps (ring on the newest picture, B
  closes it only), F19 checkboxes, F20's note, F3 (once the notice opens the pick sticks), F15 (38 games), F16, F18 (the one Qwen row
  listed), F21, F23, F26, N2, N3 (the Beta Notice came back), the look check clean on six tabs, the Main sweep. **FAIL, fixed in a
  second round the same hour:** F11 (Down from Open Permissions still reached Dismiss: a move between two stops inside one container
  is Steam's own, so each button now sits in its own Focusable), F6 (a stop inside the box's portal took the ring but no A or B
  reached it and the ring was stuck until a reload: the stop is gone, A on the word asks and the box says so), F1 (the row never
  drew because the failed turn is reloaded as the newest archived turn: the row now follows that turn too), F4 (the steps could not
  be reached: the chain's plain focus moved only the page's focus; the steps carry nav nodes now), F25 (the Ask pill's 56-in-51 is
  the letter-spacing after the last letter with the words whole: the check now asks whether the words really spill). **Not run:**
  F9, F10, F13 need a Deck without the engine or Ollama (release day's clean install). **New finding:** asking about an attached
  picture answered "incomplete stream" twice with the Deck's AI (`plan96-P96-F5-PICKER.json`), for the roadmap. The two-chip row
  changes every 4 to 9 s (each chip holds 9 s or more, the two spots alternate): the maintainer's eye decides.
- **05:40 UTC:** the second round landed clean (`68f9c1a9` to `331d4b56`), build `f7413dbc` deployed (the popup and the second
  round together); block E started with a fresh driver: the popup's first run (the settings file removed, not Clear all data) and
  the re-checks of F1, F4, F6, F11 and the Main look check.
- **06:20 UTC, Deck block E done** (build `f7413dbc`, handover [assets/96-handover-E.md](assets/96-handover-E.md)). **PASS:** the
  first-run popup (the Beta Notice, the popup with the ring on Not now, the walks, a switch saved at once, the download box over
  the popup with the ring back on the action button, Not now, nothing returns), F1 (the row and the jump), F4 (both halves: steps
  reachable, ticked, kept across a reopen), F11 (Down holds, Dismiss hands the ring on), F14 (greyed in a new chat, the toast), F6's
  new shape (the hint line, A again sends "Explain: kiting (Deep Rock Galactic: Survivor)", B closes with the ring on the word), the
  Ask pill. **Two findings:** the "Open the Ollama tab" button drew light (fixed, `bba825e5`, deployed 06:25; one Main look check
  owed), and the ring stall hit again before the glossary test: a game up about five minutes, the help chip showing, Down from the
  question box dead with the page out of focus, cleared only by a plugin reload (the tenth sighting; a running game right after
  launch is now the strongest suspect, for the R1 entry). After A sends the Explain further question the ring is on nothing (a new
  ★ entry). The full check passed on the tip (exit code 0). **Not pushed.**

- **2026-10-18 17:20 to 19:10 UTC, the maintainer's afternoon.** The hand checks came in (§ 5: the real mic passes, the language
  pick and the picture answer are real bugs, the ghost strip has a picture, the right stick does not scroll, rename passes on the
  Deck but Steam's keyboard never appears with an external controller). Their calls (§ 9e, each answered): the spinner turns again
  with a game (`8a06456e`), a long chip shows its words twice (`57829f6c`), Find LAN shows for everyone beside the address
  (`46e24b39`), and every confirm box now has the action on the left in the Got it look and Cancel on the right with the ring on it
  (`5d3a846b` to `24f5c300`; one header-note clash with Find LAN merged by hand, four Find LAN tests followed, `7e070e42`). Scoped,
  not fixed, as asked: the picture answer (pictures under 500 KB go out at full size and the Deck's graphics memory gives out;
  docs/audit/plan96-scope-screenshot-answer.md), the language pick (Steam's list is the one box opened without noting the screen
  first; plan96-scope-reply-language.md), and the ghost strip (Steam's own tab row, hidden by a rule from 2 September that fails
  when Steam rebuilds its row after a pop-up or a touch; every sighting had a game running; plan96-scope-ghost-tab-bar.md). Build
  `24f5c300` deployed 19:05; block F (runbook [assets/96-runbook-block-F.md](assets/96-runbook-block-F.md)) checks the four changes.

## 9. Report (2026-10-18, written by the session that ran it)

### 9a. What you must do next

1. **Say "push".** Nothing has left this PC. The branch `experimental` holds 67 commits since `613cc60c`; the full check passes on
   the tip (exit code 0, about four minutes). The hook refuses a push until you say so.
2. **The eight hand checks** on https://claude.ai/artifact/FTe9Lr1sS2Kfrj8nBTVrhi are all still unanswered. Check 4 (the real
   microphone) now also settles F7, which the rig calls "works as designed": Ask sends what has been said so far.
3. **Four calls** are waiting on you (§ 9e): the still spinner with a game running, the two-chip row's pace, Expert mode's
   second try, and whether the built-in notes should attach with the knowledge library switched off.
4. **Release day** (§ 6) is unchanged: the version to 0.6.0, the merge, the CI zip, and the clean-install row, which is also
   where F9, F10 and F13 get their Deck checks (they need a Deck without the voice engine or Ollama).

### 9b. What a player notices now (the plain list)

- Asking before the AI is set up gets "The AI is not set up on this Deck yet" and a button to the Ollama tab.
- A slow first answer says "Loading the AI. The first time takes a minute or two." after about 10 s, and the model is
  warmed in the background once an install finishes.
- A new player is asked where the AI should run, right after the Beta Notice; the old "Local runtime" notice is gone.
- A wiped Deck (settings file gone) shows the first-run screens again, even though Steam's browser kept the old flags.
- The first Thinking pick sticks. A ticked Strategy step survives closing the panel, the steps are checkboxes, and the note
  under them names only real actions.
- The screenshot picker takes the ring (newest picture first) and B closes only the picker.
- The mic hint's two buttons sit side by side and hand the ring on; the glossary box tells you "A again" explains further
  and its question row names the game.
- The Search tab finds bonsAI's own settings ("mic", "spoiler", "text size") above Steam's.
- Cancel on the Install box with downloads off installs nothing and leaves the line alone; the box names ollama.com; the
  "isn't installed" line goes when the install finishes.
- The greyed "Sum up" entry says why on A; the library line shows "38 games"; the Qwen 2.5 rows wear a "Research only" pill;
  the models window says LICENSE.
- The chips change more slowly (one chip 6 to 12 s, two chips 9 to 18 s), with smaller words and shorter chips. The two
  white host buttons match the others; the PC address box says a bare address is enough; the Developer tab's rows keep a side
  gap; the long About link wraps; the look check no longer cries wolf on the chat's own rows or the Ask pill.
- Expert mode has its own depth rule and every mode answers each part of a two-part question (Deck second try owed).

### 9c. The code work, by area (the summary you asked for)

**Ask and the answer (back end).** `py_modules/backend/ask/ollama_ask_service.py` now answers "The AI is not set up on this Deck
yet" whenever no model is installed or reachable (`py_modules/backend/ollama/ollama_routing.py`, `ai_not_set_up_message`), and
arms a 10 s timer that publishes the `loading_model` phase (`py_modules/backend/ask/ollama_loading_line.py`, new; the line's words
and its exemption from the "still going" rotation in `py_modules/backend/answer/bonsai_stream_tags.py`). After a finished install
or starter set, `py_modules/backend/ollama/ollama_local_setup_rpc.py` calls `warm_after_setup` in
`py_modules/backend/ollama/ollama_preload_service.py`, which loads the model Ask will pick with the same context size Ask uses
and no 3B size cap. Expert mode and two-part questions: `py_modules/backend/prompts/answer_depth_blocks.py` (new) and
`ollama_prompts.py`; the dead Speed-only accuracy block was removed. The knowledge library's status carries `game_count`
(`py_modules/backend/knowledge/rag_corpus_status.py`, counted from the installed database, cached by file size and time).

**The screen, Main tab.** `src/features/answer/transcript/ChatTranscriptHintRows.tsx` draws the "Open the Ollama tab" row (reusing
the troubleshooting hint's nav node and moves; `noAiSetUpNotice.ts` recognises the answer by its first sentence, and a Python test
pins the two sides to the same words); `MainTabChatTranscript.tsx` shows it for the live answer or the newest saved turn. The mic
hint is its own component, `src/features/main-tab/MainTabMicPermissionHintRow.tsx` (each button in a Focusable with all four moves;
Dismiss hands the ring on through `handRingOnWhenGone.ts`). The screenshot picker
(`src/features/media/MainTabScreenshotBrowser.tsx`) registers two nav nodes (`screenshot-browser`, `screenshot-grid`), takes the
grid when pictures are listed, consumes B with `onCancelButton`, and hands the ring to the question box on close or pick. The
glossary chip (`src/features/glossary/GlossaryTermChip.tsx`) keeps A-on-word as the way to Explain further, with a hint line and a
one-shot guard; the label gains the game (`glossaryAsk.ts`). The Strategy checklist (`src/features/strategy/StrategyChecklistPanel.tsx`)
draws checkbox buttons, each in a Focusable with its own nav node (`src/shared/dpad/strategyChecklistNav.ts`, new) that the
answer's chains in `src/shared/dpad/liveTurnFocusGraph.ts` take through Steam's transfer; the ticks survive a reopen because the
mount restore merges into the saved list first (`src/features/strategy/strategyChecklistAnswer.ts`, new) and a blank game id no
longer wipes every game's list (`py_modules/backend/strategy/strategy_checklist_rpc.py`). Chips: `src/features/preset-carousel/presetPace.ts`
(the holds), `presetRowLayout.ts` (26 px), the three chip files (11 px words). The Ask pill: `src/styles/sections/section-8.ts`.

**Ollama tab and settings.** `src/features/ai-connection/useThinkingNoticeGate.tsx` saves the Thinking pick straight to the back end
before the notice closes (the box closing rebuilds the screen, so the delayed save never ran). `useLocalOllamaSetupFlow.tsx` stops
when the downloads-off box is cancelled on the Install path and refreshes the autostart line on done; `src/features/models/localOllamaStarterSet.tsx`
names ollama.com and tells the truth about Cancel. `OllamaSavedHostsRows.tsx` and `OllamaWhereAiRunsSection.tsx` use the shared glass
button style and the bare-address hint (`ollamaTabFolds.ts`). `src/features/voice/VoiceInputSettingsSection.tsx` keeps the install's
busy state in a module-level marker (`voiceInstallBusyStore.ts`) so the box closing cannot lose it, and polls to "ready" with one
toast. `src/features/models/pullModelLicencePill.ts` gives every non-open-source row a pill; `pull-box/pullModelFilters.ts` and the
tier boxes say "License".

**Search and first run.** `src/features/search-tab/bonsaiSettingsIndex.ts` (29 entries), the "bonsAI settings" group in `SearchTab.tsx`,
and the jump in `bonsaiSettingJump.ts` with per-row nav holders in `bonsaiSettingRowNav.ts` (Text size, Voice input, Clear cache
and Clear all data take the ring; the others land on their section line); B is listened for at the panel and returns to the
Search tab. `main.py` gains `get_settings_first_run` (true once per start when the settings file was missing;
`py_modules/backend/settings/settings_service.py`), and `src/features/plugin-shell/useDisclaimerAndLocalRuntimeGates.tsx` clears the
plugin's browser flags once before deciding what to show. The first-run popup lives in
`src/features/ai-connection/first-run/` (`FirstRunWhereAiRunsModal.tsx`, its parts, `useFirstRunPopupNav.ts` on the Search tab's nav
mechanism, `ollamaConnectionProbe.ts`), replaces the old Local runtime notice in the gates hook, and is written up in
`docs/focus-graph.md`. The look check (`scripts/probe_deck_ui_look.py`) skips full-bleed rows and the chat's own rows and asks whether
words really spill.

### 9d. What popped up, and how it was handled

- **Three landings tripped guards** that every lane's own gates had passed: the Ask service crossed 400 lines of code (one helper
  moved out), a new button painted a fill without the ring class (one class added), and a new test copied blocks from an older one
  (the helpers imported instead). Each cost one small commit; the guards did their job.
- **Two landings ran at once** for a few minutes because my chain script took the inner script's "all landed" line as its own. Both
  sets of gates ran on the combined tree and nothing was lost, but it is the kind of slip the runbook warns about; the chain scripts
  now wait on the outer result.
- **The PC ran out of memory** at 03:50 UTC (a browser process at 16 GB, memory 96 percent committed): a commit and the quick check
  failed with "not enough memory". You closed it within ten minutes.
- **Another chat held the Deck** until 03:31 even after you freed it; the rig's lease showed it, the driver stopped as told, and the
  block started once the lease ran out.
- **A D-pad stop inside a portal takes the ring but hears no buttons.** The glossary's Explain further stop (first round) sat in a
  portal to the page body; the ring moved there and then nothing worked until a reload. Lesson for `docs/lessons-learned.md`: never
  put a Focusable stop in a portal outside the plugin's tree.
- **A move between two stops inside one container is Steam's own**, so handlers on the row never run: the mic hint needed each
  button in its own Focusable (the About links' shape), as the Deck showed on the first try.
- **A plain focus onto a step inside an answer moves the page's focus, not the ring.** The checklist's chain needed nav nodes once
  the steps became buttons; the switches had been reachable only because Steam found them itself.
- **F7 is not a bug.** Ask pressed 2 s into a 5 s sentence sends the 2 s that were spoken; at 5 s and 8 s the whole sentence goes.
- **R2 did not reproduce on two builds; R1 did not reproduce in nine tries** with both suspected triggers. Both stay as the plan
  says: R2 closed, R1 open with "reload the plugin" in the README.
- **The still spinner is by design** with a game running (plan 70's frame-rate measure): your call.
- **Expert mode measured shorter than Speed** on the Deck (median 511 against 551 characters) with the same prompt in both modes;
  the depth rule landed and owes its second try.
- **Asking about an attached picture answered "incomplete stream" twice** with the Deck's AI: a new finding for the roadmap.
- **The ring stall showed itself once more, in block E,** with the clearest state yet: a game up about five minutes, the help chip
  showing, Down from the question box dead, the page out of focus; only a plugin reload cleared it. Nine tries without a game had
  not reproduced it an hour earlier, so a running game right after launch is now the strongest suspect for R1.

### 9e. Your calls

1. **The spinner with a game running:** keep it still (plan 70's frame-rate measure) or let it turn? Nothing changed tonight.
   **Answer 2026-10-18:** turn it. Let the spinner turn even with a game running ("I'm ok with less FPS; it looks broken and cheap").
2. **The two-chip row's pace:** each chip now holds 9 to 18 s, but the two spots alternate, so the row changes every 4 to 9 s. Say if
   the row should change at most every 6 s or so (one more number in `presetPace.ts`).
   **Answer 2026-10-18:** show the text twice. Each chip shows its whole text twice before it changes (scroll to the end, stop a second, jump back, scroll to the end again, stop, then change).
3. **The built-in notes with the library off:** a notes card ("From bonsAI's own note") was drawn under an answer with "Use local
   knowledge base" OFF. By design or not?
   **Answer 2026-10-18:** fine. By design; the card may show whatever the switch says.
4. **The popup's Find LAN** shows with the Developer tab only, as on the tab; and a player upgrading who had seen the old notice
   sees the popup once. Both are the lane's reading of your spec; say if either should change.
   **Answer 2026-10-18:** the Find LAN question goes back to the session: should it sit beside the PC address field for everyone, on the Ollama tab and in the popup? The popup's show rules are kept (new users, or after Clear all data).
5. **R3** still needs your exact presses, or it goes into the README's known problems with "reload the plugin".
   **Answer 2026-10-18:** the presses are asked for again. The maintainer confirms scrolling is by the D-pad (the right stick does not scroll), so the rig can reproduce it once the presses are known.

**Also answered 2026-10-18 (not one of the five calls):** the screenshot answer that fails with "incomplete stream", the reply-language pick that flips back, and the ghost tab bar: scope now, fix later (scoping notes in `docs/audit/plan96-scope-*.md`; the ghost tab bar is now three stars, a root-cause dive). The Steam keyboard with an external controller for Rename chat: a bug to fix, no longer a known-problems line. Every confirm box: the action on the left, Cancel on the right, the ring on Cancel (a new rule, in the roadmap Bugs).

### 9f. What you could have done differently (the trial note)

- **A free Deck at the start.** The Deck did not answer for the first 35 minutes and another chat held it for another 20; the
  measurement block that fixes depended on started at 03:32 instead of 02:30. Handing the Deck over at the start of a plan session,
  with the other chats told, would have put the Deck checks an hour earlier.
- **The hand checks before the session.** None of the eight were answered during the night; two rows (the mic, the touch picker)
  and the F7 call depended on them.
- **A guard switch for the session.** The test-file guard sent every test to a helper: five helper runs and about forty minutes
  for tests I could have typed in two. If a Fable session is going to do focus fixes itself, set `BONSAI_BOOKKEEPER_GUARD=off` for
  it, or route the focus fixes to an Opus session as the plan says.
- **Firefox.** The 16 GB tab stopped the PC for ten minutes mid-landing.

### 9g. How the session ran (numbers)

Fourteen Sonnet lanes (nine high, five medium), one advisor consult, four bookkeeper stand-ins, five Deck blocks (M, V, D, E
and the stopped first try), 67 commits, every one green on the five gates and the quick check at landing, the full check green at
the end. Sixteen lane copies are left under `.claude/worktrees/` (`python scripts/worktree.py prune` after 24 hours; never
`git worktree remove`).
