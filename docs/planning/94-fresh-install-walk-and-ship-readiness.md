# 94 — A fresh install on the Deck, a walk of every tab, and what is left before shipping

Written 2026-10-17 by the deploy-and-verify chat, at the maintainer's request: "push the latest version to the Deck,
run the full test suite, do a first install from scratch, walk every tab and hit most features, and say what else is
needed for the shippable phase."

**Status:** THE WALK RAN 2026-10-17 (seven Deck blocks, 54 rows, build `e9b50cc8`, the stable-channel Deck, a true first
install). Results in § 8, the findings in § 9, what is left before shipping in § 7a. The maintainer's calls are marked
"maintainer's call" in § 9.

Read first: [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) § 3 (the Deck); the
maintainer's own checks before 0.6.0, [plan 73](73-maintainer-checks-before-0.6.0.md) (check 4 is a first install,
never done); the Tier 4 release gate in [testing-manual.md](../testing-manual.md).

---

## 1. What is true on the Deck right now (read over SSH, 2026-10-17 13:11 Deck time)

The maintainer wiped Decky, reinstalled it, and moved Steam, SteamOS and Decky from the test channels to stable.
Nothing of bonsAI is installed. Some of what bonsAI uses survived outside Decky's folder.

| What | State | What it means for the walk |
|---|---|---|
| SteamOS | 3.8.28 stable (build 20260922.1), kernel 6.18 | A combination no earlier Deck evidence records. This walk is its first record. |
| Decky Loader | 3.2.10, stable channel, fresh | The plugins folder is empty and owned by root. |
| Password-free sudo | **Gone** | The stable switch re-imaged the root drive, which wipes the file setup-dev installs. No deploy can land until setup-dev runs again. |
| bonsAI's settings folder | Gone with Decky | First-run notices, permissions, chats and the voice engine start from nothing, as for a new player. |
| Ollama | Program present (0.40.4, in the home folder's bin); service not running | "Run AI on this Deck" should find it and not install it again (a fix from plan 93 that still owes a Deck check). |
| AI models | gemma4 and nomic-embed-text on hand, 4.3 GB | A fresh install would not have these. Keeping them saves a 4.5 GB download; moving them aside is the real first-install path. |
| Speech models (tiny.en, base.en) | Gone (they lived in the settings folder) | The voice engine install runs for real. |
| Knowledge library | The published 2026-09-26 library sits on the Deck's own drive, not the SD card | With this library the new plugin underlines no glossary words (plan 86 step 3). A fresh install would have no library at all. |
| Test rig | Reachable; the Deck is leased by the README chat for screenshots | Only one chat drives the Deck at a time. This chat has asked that chat for a window. |

---

## 2. The one step that blocks everything: run setup-dev

The deploy script checks for password-free sudo before it builds and stops at once without it. **Run
`scripts/setup-dev.ps1`** from the repo root; it asks for the Deck password twice and takes a few seconds. After that
the deploy lands, and every later deploy in this walk needs nothing more.

Why it was lost: the file that grants it lives outside the part of SteamOS that survives an update, so every SteamOS
update (and the channel switch was one) removes it. This is written in the deploy script's own header.

---

## 3. Three choices for the maintainer (the safest one is taken if there is no answer)

1. **A true first install, or a quick one?** A true first install moves Ollama's models and the knowledge library
   aside (not deleted; put back at the end), so the plugin installs the AI, downloads the starter set (about 4.5 GB)
   and downloads the library, exactly as a new player sees it. A quick one keeps the models and the library and skips
   those downloads, which saves twenty to forty minutes but leaves the "Install Ollama" and "starter set" rows only
   half tested. **Suggested: the true one.** It is the maintainer's never-run check 4 from plan 73 and the Tier 4
   release gate, and the stable-channel Deck is the right machine for it. Taken if no answer: the true one.
2. **The build from this PC, or the release zip?** The deploy script from this PC puts the same files on the Deck as
   the zip, plus a seed library in the settings folder that a player never gets. The zip is what a player installs,
   and it is built by the repo's own CI when the version lands on `main`; this PC cannot build it (no Decky command
   line tool here). **Suggested: the deploy from this PC for the walk, and the CI zip for the final install proof on
   release day.** Taken if no answer: the deploy from this PC.
3. **Do you want to watch any of it?** Check 4 asks for a person's eyes on the first-run messages. The driver records
   screenshots of every first-run screen, so the maintainer can judge them afterwards from the evidence folder instead
   of sitting with the Deck. Taken if no answer: screenshots, judged later.

---

## 4. Before go (block 0, about 20 minutes)

- Confirm with the README chat that the Deck is free, and that it will not take screenshots until this walk says it is
  done. Only one driver at a time.
- The test suite on this PC is green (`python scripts/verify.py --full`, gated on its exit code, not its last lines).
- setup-dev has run; `sudo -n true` on the Deck answers without a password.
- Choice 1 applied: if true first install, move `~/.ollama` to `~/p94-aside/.ollama` and `~/.bonsai` to
  `~/p94-aside/.bonsai` (both put back in the last block). Nothing is deleted.
- Deploy with `scripts/build.ps1`. Note the build hash it verifies. Opening the plugin fails once after a deploy: expected.
- Hold the Deck awake for the run; read which screen is live (the Deck's own, 1280 by 800) and write it in every
  evidence file; no game running; the Deck's AI not loaded.
- The free-play sweep, the tab walks and the glossary rows come from plan 86 step 3's runbook and keep their shape.

Standing rules, as in every runbook: one driver per block; every Deck command exactly `ssh deck@192.168.86.52 '<command>'`;
evidence files `plan94-<ROW>.json` in the workshop's `test-evidence` folder, one per check, never overwritten, each
stamped with the build and the screen; never A on the question box (use the send-question script); read focus before
every A; a repeated question measures nothing; test questions only in the test chat; clear the pinned test chips at
the end.

---

## 5. The walk, in blocks

Each row names what to do and what a pass looks like. A result that does not match is FAIL or UNCLEAR with what was
seen; the one running the session decides what it means. Rows marked **(owed)** close an entry already on the roadmap.

### Block 1 — The first run (no permissions, no AI yet; about 30 minutes)

| Row | Do | Pass when |
|---|---|---|
| P94-FIRST-RUN | Open bonsAI for the first time. Screenshot every notice. | The first-run notice is short, true, has one button; the ring starts on **Not now** wherever a download is offered; nothing downloads by itself. |
| P94-NO-DEV-TAB | Count the tabs. | Six tabs: Search, Main, Ollama, Settings, Permissions, About. No Developer tab, no test chips, nothing half-built. |
| P94-HELP-CHIP **(owed, row P78-HELP-CHIP-DISMISS)** | The chip row is one wide help chip. A on it opens the quick start; close it with B (and once with Got it). Close and reopen the panel. | The help chip is gone, two ordinary chips take the row, and they stay after close and reopen. |
| P94-PERMS-OFF | Open Permissions. | All four switches off and reachable with the D-pad; no parental-lock banner. |
| P94-ASK-NO-AI | On Main, send a question with no AI set up. | A plain message says where the AI runs is not set, with a button that jumps to the Ollama tab; no crash, no spinner that never ends. |
| P94-TABS-WALK | On every tab, Down to the end and back (every section opened). | No dead press, no lost ring, nothing behind the dock. The known 83 to 92 % readings under the header strip are not a fail (open bug). |

### Block 2 — Setting up the AI on the Deck (the README path; 20 to 50 minutes, mostly downloads)

| Row | Do | Pass when |
|---|---|---|
| P94-DOWNLOADS-PERM | Permissions: switch on **Internet downloads** only. | The switch holds after close and reopen; the settings file says so. |
| P94-INSTALL-OLLAMA **(owed, the installer re-run half of P93-B3-STARTER-DECK)** | Ollama tab: switch on **Run AI on this Deck**, press **Install Ollama**. | The box names where the download comes from; Cancel is first. With Ollama already in the home folder's bin, the installer is **not** run again (log line), and the button leaves the open screen when done. With it moved aside, it installs. |
| P94-STARTER-SET | Say yes to the starter set. | The box names gemma4:e2b-it-qat, nomic-embed-text, tiny.en and base.en and about 4.5 GB; what is already there is skipped; progress shows; the models list afterwards shows them. |
| P94-START-WITH-DECK | Switch on **Start the AI with the Deck**, close and reopen. | The switch holds. (A reboot check is the maintainer's, optional.) |
| P94-TEST-CONNECTION | Press **Test connection**. | A clear "connected" line with the version, within a few seconds. |
| P94-BROWSE-MODELS | Open **Browse models…**, try each filter once, walk one press at a time. Never A on a model row. | Licence labels show; "Open source only" lists gemma4 and not the two Qwen 2.5 models; sizes read "Live sizes"; Remove from Deck is never reached by accident. |
| P94-MODEL-ORDER | Open **AI models…**. | The installed models show with gemma4 first; the order can be moved and holds. |
| P94-REPLY-STYLE | Set Reply style to Caveman, then back to Balanced; switch Thinking on and off. | Each holds after close and reopen. |

### Block 3 — The knowledge library (about 15 minutes)

| Row | Do | Pass when |
|---|---|---|
| P94-KB-CANCEL-BOX **(owed, the "Cancelled reads as failed" bug)** | With Internet downloads **off**, press **Download knowledge base**, then Cancel on the "Turn on internet downloads?" box. | The line does not read "Failed"; it reads cancelled or stays as it was. (Expected to FAIL today: open bug. Record it.) |
| P94-KB-DOWNLOAD | Downloads on: press **Download knowledge base**; switch on **Use local knowledge base**. | The box names where it comes from; the library arrives; the switch reads on and the settings file agrees (the open bug about the switch reading off is a FAIL if seen). |
| P94-KB-VERSION | Read the version line. | It shows the library's build date and the game count. |

### Block 4 — Main: asking (about 45 minutes, no game)

Prepared questions, pinned as test chips (the maintainer confirms the list before pinning) or sent with the
send-question script; each differently worded.

| Row | Do | Pass when |
|---|---|---|
| P94-SPEED | Speed mode: "What is a good first weapon in Hollow Knight" | Words appear as written; a short answer; Helpful / Not really, Copy and Show details under it. |
| P94-STRATEGY | Strategy mode: "How do I beat the first boss in Hades" | The answer may ask where you are; a checklist with tickable steps; spoilers hidden behind a cover that opens on A; an optional cheat section at the end. |
| P94-EXPERT | Expert mode: "Explain how status effects work in Hades" | A longer answer; no cut-off; Show details names the model. |
| P94-STOP-RETRY **(owed, the ★★★ stopped-answer loop)** | Stop an answer partway; then Down from the stopped answer, three times. | The part that arrived stays. Down reaches the Ask box. (Expected to FAIL today: the loop is an open ★★★ bug. Record the stops it visits.) Then Retry asks again. |
| P94-RATING | Press Helpful, then Not really and a reason. | The pick shows softly; nothing is sent anywhere (no network line in the log). |
| P94-SHOW-DETAILS | Open Show details, read, close with B. | Model, notes used, source; B returns the ring to the line. |
| P94-SUM-UP | After three answers, press **Sum up**. | A summary card; the chat keeps its answers. |
| P94-CHATS | New chat; rename it; switch with R1; delete it from the chat menu. | Each works; the test chat is the open one before every question. |
| P94-REPLY-READY | Send a question, close the menu, wait. | A **Reply ready** popup with the first lines; reopening shows the full answer. |
| P94-FIND-SETTING | Type "brightness" in the box. | A matching Steam setting is offered above the box; A jumps there; no AI call. |
| P94-PERF-QUESTION | "How do I get better battery life in this game" (name a game). | Numbers to set yourself (watts, frame cap); nothing is changed by the plugin. |
| P94-CLEAR-CACHE | Settings → Clear cache… | The box asks first; the screen clears; settings and chats stay. |

### Block 5 — Settings, voice and characters (about 40 minutes)

| Row | Do | Pass when |
|---|---|---|
| P94-SETTINGS-DEFAULTS | Read every setting's starting value, screenshot each section. | Each looks right for someone new (the maintainer judges from the pictures). |
| P94-SPOILERS | Open Story spoilers; change the level; ask a spoiler-prone question. | The cover behaves as the level says. |
| P94-CHIPS-ONE | Suggestion chips: one chip. | One wide chip; the pace stays steady; the ring never loses a chip mid-change. |
| P94-VOICE-PERM | Press the mic with the microphone permission off. | A hint names the permission with an **Open Permissions** button; A lands on the right switch. **Down from Open Permissions** should leave the row (open ★ bug: lands on Dismiss; record). |
| P94-VOICE-INSTALL **(owed, the section-not-refreshing bug)** | Mic permission on; Settings → Voice input → install the engine. | The download box names its source; the section reads installed as soon as it is done, without leaving the tab (expected to FAIL today: open ★★ bug). |
| P94-VOICE-ASK | Play a recorded sentence into the pretend microphone; Stop; Ask. | Words appear while it plays; Stop reads the whole recording; Ask sends the full sentence. The real voice stays the maintainer's. |
| P94-CHARACTERS | Pick a character; ask one question; pick none. | The tone changes; the pick holds; none restores it. |
| P94-TEXT-SIZE | Text size Small, Large, back to the default; walk Ollama and Settings at each. | Words change size; nothing cut; the known Large-size clipping is an open ★ bug, record what is seen. |
| P94-CLEAR-ALL-BOX | Settings → Clear all data…, then Cancel. | The box says it also removes Ollama and the models when the AI runs on the Deck; Cancel first; nothing removed. |

### Block 6 — Permissions, Search, About (about 20 minutes)

| Row | Do | Pass when |
|---|---|---|
| P94-PERMS-EACH | Switch each permission on and off; close and reopen between. | Each holds; the settings file agrees; the "where this download comes from" lines are present for downloads. |
| P94-SEARCH-TAB | Search tab: search a setting ("mic"), search a note from the library, open one. | "mic" finds the Voice settings; a note opens and B comes back with the ring where it was. |
| P94-ABOUT | About: read the version, change the reply language and back, try a link. | The version matches the build; the language holds; the link opens or says it cannot. |
| P94-DEV-TAB-ON | Settings: show the Developer tab; walk it; hide it again. | Seven tabs, then six; the walk is clean. |

### Block 7 — With a game (Deep Rock Galactic: Survivor; about 40 minutes)

Unload the Deck's AI first (the lesson from plans 81 and 87); start the game through the rig's launcher; never reload
the plugin under a running game.

| Row | Do | Pass when |
|---|---|---|
| P94-GAME-CHIPS | Open the panel in the game. | The game's own chips show; the chat knows the game. |
| P94-GAME-ASK | "What should I upgrade first" (no game name). | The answer is about this game; Show details names the notes. |
| P94-GLOSSARY | A question that draws "kiting" or "overclock". | With the rebuilt library: the words underlined, the ring stops on each, the peek shows, Explain further asks with the game's name. With the 2026-09-26 library: plain, no error (the maintainer must publish the rebuilt library for players to see the words). |
| P94-SCREENSHOT | Permission "Read game & screenshot context" on; paperclip → take screenshot; ask about it. | The picture attaches; the answer mentions what is on it (the starter model can see). |
| P94-FREE-PLAY-GAME | The free-play sweep with the game running. | No dead press, no lost ring, nothing behind the dock. From Copy, Down should not land on a chip at 33 % (open ★★ bug; record). |
| P94-FRAME-RATE | One streamed answer; read the panel's frames a second. | At or above 45 while the answer writes (the maintainer's floor). |
| P94-GAME-CLOSE | Close the game over SSH. | Steam is back on the library; the panel still opens. |

### Block 8 — Close (about 15 minutes)

| Row | Do | Pass when |
|---|---|---|
| P94-TIER4 | Fill the Tier 4 release-gate row in testing-manual.md: build, SteamOS 3.8.28, Decky 3.2.10, Ollama 0.40.4 on the Deck, the result of block 2. | The row exists. (The bookkeeper writes it; drivers never edit documents.) |
| P94-RESTORE | Put back `~/p94-aside` if choice 1 moved things; clear the pinned test chips; release the keep-awake; close any game; leave the plugin on the deployed build. | The Deck is in the state the maintainer wants to keep. |

---

## 6. Open bugs the walk will meet (so nobody files them twice)

From the roadmap on 2026-10-17. Each has a row above that records what is seen; a FAIL there is the same bug, not a
new one.

- ★★★ After a stopped answer, Down loops between the question, the answer and Retry (P94-STOP-RETRY).
- ★★★ Preset chips cannot always be reached near the end of an answer (needs the maintainer's exact steps).
- ★★ The Voice input section keeps saying "not installed" after the engine installs until the tab is left (P94-VOICE-INSTALL).
- ★★ From Copy, Down with a game running landed on the Tip chip at 33 % (P94-FREE-PLAY-GAME).
- ★★ A faded ghost of the tab bar after touching the screen (a finger; the maintainer's).
- ★ Cancel on "Turn on internet downloads?" leaves the Ollama tab saying it failed (P94-KB-CANCEL-BOX).
- ★ Down from "Open Permissions" on the hint lands on Dismiss (P94-VOICE-PERM).
- ★ Some section lines read 83 to 92 % visible under the header strip (every walk; not a fail).
- ★ At Large text, the Remove button splits and some rows touch the edge (P94-TEXT-SIZE).
- ★ The "Use local knowledge base" switch can read off after a download while the file says on (P94-KB-DOWNLOAD).
- ★ A spoiler line inside a bold heading shows raw bold marks (may show in P94-STRATEGY).
- ★ While an answer writes it briefly shrinks by a line (P94-FRAME-RATE may see it).

---

## 7. What else is needed before this is shippable (the list the maintainer asked for)

In the order it pays to do them.

1. **Run setup-dev** (§ 2). Five seconds; nothing lands without it.
2. **Decide the three choices in § 3**, above all the true-first-install one.
3. **Publish the rebuilt knowledge library** (version 2026.10.17; the publish check already passed on 2026-10-17, see
   the step 3 summary). Until then players see no underlined glossary words, and the roadmap's open library-update bug
   (any different version offered as newer) means the Deck will offer the old one back.
4. **Fix the ★★★ stopped-answer D-pad loop** before release. It is a trap with a way out, found 2026-10-16, cause
   read from the code (the answer's Down path tries Retry first on a stopped turn). One Opus lane, then P94-STOP-RETRY.
5. **The two ★★★ bugs that need your steps** (chips near the end of an answer; the tab-section ring after sections
   open): neither reproduced with the D-pad in six rounds each. If you can reproduce one, say the exact presses and
   whether the right stick or the touch screen was used; otherwise they ship as known problems in the README.
6. **Your own hand checks still owed** (plan 73 and the checks page): the parental lock seen locked; a real voice on
   the mic; the touch-screen ghost tab bar; the right-stick scroll to the Show details slot. The first install (check 4)
   is covered by this walk's screenshots, but your eyes on the first-run wording are still the pass.
7. **The version number.** The plugin still says 0.5.0; the release is 0.6.0. The bump belongs to release day (plan 71):
   when the new version lands on `main`, CI builds the zip and publishes the release. Nothing to do before then.
8. **The release zip is CI's, and it owes one check.** This PC cannot build it (no Decky command line tool). On release
   day, run the zip check script on CI's artifact before publishing; plan 74 found NOTICE and the data folder missing
   from a zip once. The Tier 4 row (P94-TIER4) is then re-run once from that zip: uninstall in Decky, install from the
   zip, one answer.
9. **Hold the clean-up (plan 86 steps 4 to 8) until after the release**, or run its Deck block before shipping. Step 4
   moves every screen file into feature folders; step 6 rewires settings and the D-pad. Neither should sit between a
   verified build and the zip a player downloads. The build to ship is the one this walk verifies.
10. **Update the README's known-problems list** from this walk's FAILs that are not fixed by release day (the README
    chat owns the README; send it the list, do not edit the README from here).
11. **Record the new ground**: SteamOS 3.8.28 stable and Decky 3.2.10 stable have never been in the evidence. If the
    walk is clean, that is the first proof the plugin works on the channel players actually run.

---

## 7a. After the walk: what is left before shipping (2026-10-17 evening)

Items 1 to 3 of § 7 are done (setup-dev, the choices, the library published: 2026.10.17 arrived on the Deck). The rest,
re-sorted by what a new player on the stable channel would hit first:

1. **Fix before release, first-impression (one lane each, then a Deck re-check):**
   - the no-AI message (blames the model policy tier, no button to the Ollama tab; § 9, block 1);
   - the first answer's two-minute cold start with nothing on screen saying so (warm the model after install, or say
     "loading the AI, about two minutes the first time"; § 9, block 4);
   - the first Thinking pick lost behind its notice (block 2);
   - a ticked Strategy step lost on reopen (block 5);
   - the screenshot picker that the controller cannot enter (block 8);
   - "Explain further" unreachable by D-pad (block 7).
2. **Hand checks for the maintainer** (five minutes each, the rig cannot do them): the About reply-language pick
   (does a pick apply by hand?); renaming a chat; "Attach recent screenshot" by touch; the real microphone.
3. **The ★★★ ring stall** now has a candidate trigger (a Steam pop-up or Steam's browser before the walk) and a known
   cure (a plugin reload; a Quick Access close and reopen is not enough). Worth one Opus look before release; if not
   fixed, the README's known-problems line should say "reload the plugin" rather than "close and reopen the menu".
4. **Calls for the maintainer:** should "Run AI on this Deck" start off on a fresh install; is the Update button
   re-downloading Ollama on every press by design; should the glossary underline when the game is named but not
   running; should the Search tab find bonsAI's own settings as well as Steam's; is "Sum up" greyed with no reason
   acceptable.
5. **Docs:** the guide's "type brightness into the question box" line is wrong on this build (the finder is on the
   Search tab); the README chat owns the guide. Also: a Decky uninstall is not a fresh start (the screen-side flags
   live in Steam's browser storage) — the guide's "Starting fresh" section already says to use Clear all data first,
   and the maintainer's check 4 should say it too.
6. **Unchanged from § 7:** the version bump on release day; the CI zip and its check; hold the clean-up until after the
   release; the known-problems list from this walk's open FAILs.

## 8. Results

All on build `e9b50cc8` (dist hash `c0a716650179`), 2026-10-17, the Deck's own screen, SteamOS 3.8.28 stable, Decky
3.2.10 stable, Ollama 0.40.6 installed by the plugin on the Deck. Evidence `workshop:test-evidence/plan94-*.json`.

| Block | Rows | PASS | FAIL (known) | FAIL / UNCLEAR (new) | Notes |
|---|---|---|---|---|---|
| 1 + 1b | 10 | 8 | 0 | 2 | The no-AI message blames the policy tier; About link clipped. First run only real after the plugin's own Clear all data. |
| 2 + 3 | 11 | 9 | 1 | 1 | Cancel reads "Failed" (known); the first Thinking pick lost behind its notice (new). |
| 4 | 11 | 6 | 0 | 5 | Expert shorter than Speed; Sum up greyed with no reason; the finder is on the Search tab; rename needs the keyboard; Strategy retried. |
| 5 | 9 | 5 | 2 | 2 | Voice section not refreshing and Down-to-Dismiss (known); a ticked Strategy step lost on reopen; Ask while listening cut the sentence. |
| 6 | 4 | 1 | 0 | 3 | Search finds Steam's settings; the language pick does not apply; the ring stalled (the ★★★ entry). |
| 7 + 8 | 9 | 5 | 0 | 4 | Explain further unreachable; 39 frames a second with the game and the AI on the Deck; the screenshot picker takes no focus; glossary only with the game running. |

**The Tier 4 release-gate row** (clean install, Ollama not installed, the README path, one text Ask): **PASS** — a new
player on the stable channel reaches a first answer through the plugin's own screens (two notices, Permissions,
Install Ollama with the starter set, one question), with the two caveats that the first answer waits about two
minutes while the model loads and that nothing on screen says so.

**Verify entries this walk settles:** the help chip after the quick start (P78-HELP-CHIP-DISMISS: a real Deck pass);
the starter-set button leaving the open screen (P93-B3-STARTER-DECK, the button half: PASS; the installer half: the
Update button re-ran the installer, maintainer's call whether that is by design).

**Open entries seen again:** Cancel on the downloads box reads "Failed"; the Voice input section not refreshing; Down
from Open Permissions landing on Dismiss; the section lines at 83 to 92 %; the ★★★ ring stall after sections open
(with a possible trigger: a Steam pop-up or Steam's browser before the walk). **Not reproduced:** the ★★★ stopped-answer
Down loop (the stopped answer had a notes card under it); Down from Copy onto a 33 % Tip chip (no Tip chip present);
the "Remov"+"e" split at Large text.

## 9. Progress log

- **2026-10-17 17:10 UTC:** the Deck read over SSH (§ 1); the full test run started on this PC; the README chat asked
  for a Deck window (it holds the Deck for screenshots); the maintainer asked to run setup-dev. This plan written.
- **17:15 UTC:** the full test run PASSED (275 s, exit code 0).
- **17:20 UTC:** the maintainer ran setup-dev and chose the true first install. Ollama (the program, its models, 4.4 GB,
  and the autostart unit the plugin had made) and the knowledge library moved to `~/p94-aside`. Build `e9b50cc8`
  deployed and verified (133 files). Keep-awake held until 01:21 UTC. The README chat confirmed the Deck is ours until
  handed back.
- **17:35 UTC, block 1 done (driver 1, the Deck's own screen).** Setup, Permissions (four switches, all off, every one a
  stop), six tabs with no Developer tab, and the tab walks on Search, Ollama, Settings and Permissions all PASSED.
  **The first run was not real:** Steam's own browser storage kept the plugin's "already seen" flags (disclaimer accepted,
  beta notice dismissed, help chip dismissed, download sites seen) through the Decky wipe, so no first-run notice and no
  help chip showed. Lesson for the maintainer's check 4 and the guide: **uninstalling in Decky is not a fresh start even
  for the screens; use Settings → Clear all data first.** Block 1b runs that button once and redoes the two rows.
  **Findings for the bookkeeper** (new, not on the roadmap):
  - ★★ `[ask]` With no AI installed, a question answers in under a second with "No models in the fallback list match
    your Model policy tier. Install a permitted Ollama model, or open Settings and choose a higher tier", with no button to
    the Ollama tab. The real cause (Ollama not installed, which the Ollama tab says correctly) is never named. A new
    player's first impression. Evidence `plan94-P94-ASK-NO-AI.json`.
  - ★ `[ui]` About tab: the "Bugs & Feature Requests" link is 67 % visible, clipped at the bottom of the links box, and
    "Support my Steam Sale habit" never becomes a Down stop. Evidence `plan94-P94-TABS-WALK.json`.
  - ★ `[defaults]` **Maintainer's call:** on a fresh install "Run AI on this Deck" is ON with nothing installed, so the
    Ollama tab opens on a red "Unreachable" line. The README tells a new player to switch it on. Should it start off?
    Evidence `plan94-P94-SETTINGS-DEFAULTS.json` (16 section pictures of every default).
  - ★ `[log]` The first B on Main logs "voice: stop pressed, no recording was running" in the back end. Harmless.
  - Note: About reads version 0.5.0 (the bump is release day's).
- **17:50 UTC, block 1b done (driver 1b).** Settings → Clear all data: the box warns about the models and Ollama, Cancel
  first, "Plugin data cleared", the plugin refilled its defaults at once and `~/p94-aside` was untouched (PASS). **The
  real first run (PASS):** two notices came by themselves about 5 s after the wipe: "Beta Notice" (36 words: beta, the AI
  can be wrong, heavy AI can crash a game, the bug link) and "Local runtime (beta)" (39 words: AI runs on this Deck, a
  PC is faster, where to turn it off), each with one "Got it" button; nothing offered to download; neither returned
  after close and reopen. **The help chip (PASS; closes the owed row P78-HELP-CHIP-DISMISS on the Deck):** one wide
  "How to use bonsAI" chip, fully visible; A opened "Using bonsAI" (163 words, Got it and Cancel); B closed it; two
  ordinary chips took the row and stayed after close and reopen. The ring went to the tab bar, not a chip (same as the
  stand-in saw). Not run: closing with Got it (there is no way to reopen the quick start once the chip is gone; the
  maintainer's call whether that is intended). Evidence `plan94-P94-CLEAR-ALL-RUN.json`, `plan94-P94-FIRST-RUN-try2.json`,
  `plan94-P94-HELP-CHIP-try2.json` and their pictures.
- **18:10 UTC, blocks 2 and 3 done (driver 2, 17 minutes; the downloads were fast).** PASSED: Internet downloads on
  (holds, the file agrees); Install Ollama (one box covers Ollama and the starter set, Cancel first; Ollama 0.40.6
  installed, the button became "Update AI & models"); the starter set (gemma4 4.3 GB, nomic-embed-text, tiny.en and
  base.en, all four in about 3 minutes, "Speech models ready"); Start the AI with the Deck (the autostart unit made and
  enabled); Test connection ("Connected, Ollama v0.40.6, 2 models"); Browse models (Open source only by default, Live
  sizes, no Qwen 2.5 under it, the open-weight choice adds them, filters put back); model order (gemma4 first for text
  and pictures; the move arrows are greyed with one answer model, so the move half could not run); Reply style
  (Caveman holds, back to Balanced); the knowledge library (a location box first: Not now / Internal storage / SD card,
  then a source box naming huggingface.co and github.com, Cancel first; **version 2026.10.17 arrived**, so the rebuilt
  library is published; the switch turned on by itself and the file agrees). FAILED, known: Cancel on "Turn on internet
  downloads?" leaves "Failed (check the Internet downloads permission?)" (the open ★ bug, seen again).
  **Findings for the bookkeeper** (new):
  - ★★ `[ollama]` The first Thinking pick is lost behind its notice: picking a level the first time shows "Thinking
    shows on screen as it happens and is not checked for spoilers. Show it?"; after "Show thinking" the screen read
    Brief but the file stayed off and the pick was gone after close and reopen. The second pick (no notice) saved.
    Evidence `plan94-P94-REPLY-STYLE.json`.
  - ★ `[ollama]` "Update AI & models" downloads the Ollama program again on every press (the installer tarball ran a
    second time, then "Ollama 0.40.6 is up to date. 2 models refreshed."). Maintainer's call: by design for an update
    button, or check the version first? The plan 93 re-check wanted no second installer run. Evidence `plan94-P94-INSTALL-OLLAMA.json`.
  - ★ `[ollama]` After the install, "The local AI isn't installed on this Deck yet." stayed on screen for a while, under
    a button that already read "Update AI & models". Evidence `plan94-P94-INSTALL-OLLAMA.json`.
  - ★ `[wording]` The install box names registry.ollama.ai and huggingface.co but not where the Ollama program itself
    comes from (ollama.com). The downloads-off box says "Cancel or B installs Ollama only", yet Cancel installs nothing.
  - ★ `[models]` Under the open-weight choice the two Qwen 2.5 rows showed no research-only licence pill that the driver
    could read (UNCLEAR: the guide says the labels show). An extra uninstalled row, qwen3.5:4b, is listed under Open
    source only. Evidence `plan94-P94-BROWSE-MODELS.json`.
  - ★ `[kb]` The library line reads "Installed - version 2026.10.17" with no game count (38 games, 414 sections in the
    file). Evidence `plan94-P94-KB-DOWNLOAD.json`.
  - Note for the library-update bug on the roadmap: the first download now asks where to put it (Internal / SD card).
- **18:55 UTC, block 4 done (driver 3, the Deck's own AI).** PASSED: Speed (words arrive as written, 751 characters,
  every control under the answer reachable); Stop then Down then Retry (2,266 characters kept, "Stopped - partial answer
  kept"; **the ★★★ stopped-answer loop did not reproduce**: Down went Show details, the notes card, the dock's Show
  details, the question box, Ask; Retry kept the stopped turn and wrote a new one below); Rating (Helpful becomes "Saved
  on this Deck"; Not really offers five reasons; saved in a local feedback file, only local addresses in the log);
  Reply ready (a toast with the answer's first line about 15 s after Ask on Steam's home; the full answer on reopen);
  the performance question (7 W and 60 FPS suggested, nothing applied, the cap still 15 W); Clear cache (under Settings →
  Data; asks first; settings and the saved chat stay). Chats: new, switch and delete PASS (Delete asks first, Cancel
  first); rename COULD NOT RUN (Steam's own keyboard dialog; the maintainer's hand). UNCLEAR: Strategy (the AI asked
  "Where are you at in Hades?" with two choice buttons three times; the driver answered by typing instead of pressing a
  choice, so no checklist was reached: retried in block 5); Expert (finished cleanly, names the model and the Hades
  notes, but 454 characters, shorter than Speed, and answered only half the question); Sum up (greyed after 8 answers
  with no reason shown; by the code it turns on only once the chat is longer than the AI's memory window); Find a
  setting (nothing offered above the Main box; by the code the finder lives in the Search tab now; tested there in
  block 6).
  **Findings for the bookkeeper** (new):
  - ★★ `[first-run]` **The first answer after install waits about 2 minutes** (100 to 120 s to the first word, 124 s in
    all) with only "Still going..." lines, because the model loads cold. Later answers took 10 to 25 s. A new player's
    first question. Maintainer's call: warm the model after the install, or say so on screen. Evidence `plan94-P94-SPEED.json`.
  - ★★ `[reply]` Expert mode gave a shorter answer than Speed (454 vs 751 characters) and ignored half of a two-part
    question. One sample. Evidence `plan94-P94-EXPERT.json`.
  - ★ `[docs]` The guide says typing "brightness" into the question box offers the Steam setting; on this build nothing
    is offered there (the finder is on the Search tab). The README chat should fix the guide, or the Main box should offer it.
  - ★ `[focus]` Under "Not really", Down skips the "Too long" and "Too short" reasons; and the rating row under a stopped
    answer is skipped by the D-pad in both directions. Evidence `plan94-P94-RATING.json`, `plan94-P94-STOP-RETRY.json`.
  - ★ `[ui]` "Sum up this chat" is drawn greyed with no reason shown. Evidence `plan94-P94-SUM-UP.json`.
  - ★ `[ui]` The chat name row is 83 % visible when focused (clipped at the panel edge). Seen before in sweeps.
  - Note: R1/L1 switch tabs on this build; chat switching is through the chat menu.
- **19:50 UTC, block 5 done (driver 4).** PASSED: Strategy with the choice button (one press on "A. Dealing with the
  first boss's mechanics" gave a 5-step checklist, a cheat section, no raw bold marks; A ticks a step and the saved file
  updates); one chip (300 px wide, changes every 5.4 to 7.8 s, never under the ring); the mic hint with the permission
  off (names the permission, Open Permissions lands on the mic switch); the voice engine install (from ghcr.io, about
  77 s, whisper-cli and the two speech models on disk); a recorded sentence (words while it plays with about 2 s lag,
  Stop gives the whole 82-character sentence, Ask sends it); characters (the pick holds, off restores plain); text size
  (header font 10.8 / 12 / 13.8 px at Small / Normal / Large, nothing past the right edge, the "Remov"+"e" split NOT seen);
  the Clear all data box (warns about Ollama and the models, Cancel first, nothing removed). FAILED, known: the Voice
  input section kept saying "not installed" until the plugin was closed and reopened (about 105 s after the files
  landed); Down from Open Permissions lands on Dismiss. UNCLEAR: spoilers is one switch ("Hide spoilers until I tap",
  on by default), the cover works ("Spoiler, tap to show", A opens, A hides), but the AI wrote no spoiler in two tries
  at Speed; the GLaDOS tone was faint at the default intensity ("Listen up." and little else) and Show details did not
  name the character.
  **Findings for the bookkeeper** (new):
  - ★★ `[strategy]` **A ticked checklist step is lost when the panel is closed and reopened**; the saved list file is
    emptied at reopen (twice, no game running). Maintainer's call whether a list with no game is meant to be kept.
    Evidence `plan94-P94-STRATEGY-try2.json`.
  - ★★ `[voice]` **Ask pressed about 2 s into a recording sent only the first half of the sentence** (42 of 82
    characters); plan 86's block had this passing on the previous build. One try. Evidence `plan94-P94-VOICE-ASK.json`.
  - ★ `[focus]` After Dismiss on the mic hint, the ring sits on nothing. Evidence `plan94-P94-VOICE-PERM.json`.
  - ★ `[ui]` Section summaries on Settings are cut at every text size, already at Normal ("Hide spoilers until I tap on"
    shows 25 of 134 px); at Large the Story spoilers summary is 0 px wide with its arrow 3 px from the edge (the known
    Large-size entry, now measured at Normal too). Evidence `plan94-P94-TEXT-SIZE.json`.
  - ★ `[ui]` The "Story spoilers" and "Suggestion chips" section lines read 83 to 92 % visible under the top bar when
    focused (the known entry, seen again).
  - Note: the first answer after an idle spell took about 75 s again (the model goes cold).
- **20:20 UTC, block 6 done (driver 5).** PASSED: each permission on and off holds across close and reopen and the
  file agrees (the game-context switch sets two keys at once); the Search tab's note (a Mario Party 6 note opened with
  title, text and Close; B put the ring back on the same row) and its walk (10 stops, all visible); the About GitHub
  link opens Steam's browser on the repo page, and the plugin comes back after. FAILED or UNCLEAR: "mic" on the Search
  tab finds Steam's own settings (Microphone Volume, MicroSD) and a game note, not bonsAI's Voice input setting
  (maintainer's call: the finder is built for Steam's settings; the plan 73 bullet expected bonsAI's); the About
  reply-language list (a Steam pop-up) applied none of three picks, the file stayed follow_system; the version line
  reads "Version 0.5.0" with no build id; the Developer tab could not be switched on because of the stall below.
  **Findings for the bookkeeper** (new):
  - ★★★ `[focus]` `[tabs]` **A sighting of the open "ring goes wrong after sections are opened" bug, with a possible
    trigger.** After the driver had used the About language pop-up and Steam's browser, Down from an OPEN section's line
    on Settings (Data, and any other open section) no longer moved Steam's ring: the page's own active element moved to
    the switch below, the ring stayed on the section line, and A on it folded the section (so the ring was really
    there). Up and Right still moved. A close and reopen of Quick Access did not clear it; Open all did not either.
    Earlier drivers walked the same route cleanly. Evidence `plan94-P94-DEV-TAB-ON.json`.
  - ★★ `[about]` The reply-language pick does not apply: three picks in the Steam pop-up (Czech twice, Always English),
    focus read first each time, closed the list with no change and the file stayed follow_system. One driver, one
    build; may be the rig and Steam's pop-up, so a hand check is the maintainer's. Evidence `plan94-P94-ABOUT.json`.
  - ★ `[about]` No build id on the About page, only "Version 0.5.0". Evidence `plan94-P94-ABOUT.json`.
  - Note: the sweep tool writes an untracked file into the repo (`runs/sweep_*.json`); the screenshot tool writes into
    `screenshots/`. Neither is staged.
- **21:05 UTC, block 7 done (driver 6, Deep Rock Galactic: Survivor).** PASSED: the stalled ring cleared after one
  plugin reload (it had survived three tries and a full close and reopen of Quick Access); the game launched (about
  2 minutes to the title) and the dock named it; the game's own chips ("Tips for Hollow Bough in this game?", "How do I
  use Red Sugar?", "What should I know about Mining and the run timer?") drew after the first fresh answer; "What should
  I upgrade first" answered about this game (first word 12 s, done 29 s) with the note "Upgrades and overclocks" named;
  **the glossary words with the library 2026.10.17: "kiting" and "overclock" underlined, the ring stops on each once
  each way, the peek shows ("Backing away while you keep shooting."), A shows the full text**; the paperclip menu has
  both entries and "Close menu & take screenshot" took a real screenshot; the free-play sweep with the game (two walks,
  no dead press, nothing behind the dock, every stop 100 % except the chat name row at 83 %; Down from Copy landed on
  Helpful, not a 33 % chip, though no Tip chip was under those answers); the game closed cleanly and the plugin
  reopened with "No game". FAILED or UNCLEAR: the panel drew a median of 39 frames a second while an answer wrote with
  the game AND the AI both on the Deck (lowest second 11; 5 of 15 seconds at 45 or more; idle about 91) — below the
  45 floor, but this is the AI-on-Deck case, where the guide already warns of slowdown; the picture question was asked
  without "Attach recent screenshot", so no picture was attached (retried in block 8); with no game running, naming the
  game in the question did not underline the words (by design or not: maintainer's call).
  **Findings for the bookkeeper** (new):
  - ★★ `[glossary]` **"Explain further" cannot be reached with the D-pad**: Down from an open word goes to the next word
    and closes the box; Right goes to Copy and closes it; it fires only on A on the word while its box is open. And the
    question it sends reads "Explain: overclock" with no game name (the answer still named the game). Evidence
    `plan94-P94-GLOSSARY.json`.
  - ★ `[glossary]` With no game running, a question that names Deep Rock Galactic: Survivor gets no underlined words
    (the glossary follows the running game only). Maintainer's call. Evidence `plan94-P94-GLOSSARY-NOGAME.json`.
  - ★ `[perf]` 39 frames a second median while answering with the game and the AI on the Deck (the number for the
    README's known-problems line). Evidence `plan94-P94-FRAME-RATE.json`.
  - ★ `[rig]` After a plugin reload the Decky tab was missing from the Quick Access rail for over 100 s and opening the
    plugin failed twice. Evidence `plan94-P94-RING-STALL.json`.
  - Note for the ★★★ ring entry: the stall survives a Quick Access close and reopen and clears on a plugin reload (the
    reload also folds the sections, so the two causes could not be told apart).
- **21:20 UTC, block 8 done (driver 7); the walk is finished.** The picture question could not be asked: **"Attach
  recent screenshot" opens a grid of recent screenshots that the controller cannot enter** (after A on the menu item
  nothing has focus; every press moves the ring across chat controls hidden behind the grid; B once leaves the grid
  open, B twice closes the whole plugin). ★★ `[screenshot]` `[focus]`, new. Evidence `plan94-P94-SCREENSHOT-try2.json`
  and three pictures. The keep-awake lock released; the Deck handed to the README refresh chat for its filming block;
  `~/p94-aside` (4.4 GB) left in place for the maintainer's call (everything in it is now installed again, newer, by
  the plugin itself).
