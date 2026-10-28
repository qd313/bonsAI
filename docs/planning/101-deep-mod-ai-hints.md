# 101 — Deep mod AI hints: the refreshed plan

**Status: READY for the maintainer's read, 2026-10-28. Planning only; nothing is built.** Rounds 1 to 4 are
answered (§§ 3, 5, 7a, 7d); the plan body is §§ 8 to 17; the helper rules, the lane briefs and the first check block
are the asset files named below; decision D138 is written up for the bookkeeper to append at go
([assets/101-decision-d138.md](assets/101-decision-d138.md)). Three roadmap entries were added on 2026-10-28 at the
maintainer's ask (mod knowledge in the knowledge base, ★★★; the Heroic, Lutris and Windows launchers, ★★ each).

**Where to pick up.** Read §§ 8 to 15 and say "Run plan 101" in a new chat on the PC (§ 13), or send corrections
here first. One number is still a gate: the reading room (§ 15), measured before any cap changes and confirmed by
you.

**Files for this plan (written 2026-10-28):** the helper rules [assets/101-helper-rules.md](assets/101-helper-rules.md),
the briefs [assets/101-lane-briefs.md](assets/101-lane-briefs.md) (one per lane), the first check block
[assets/101-runbook-block-M0.md](assets/101-runbook-block-M0.md) (the Deck and the PC); the session writes one runbook
per later block. Evidence files: `plan101-<ROW>.json` in the workshop's `test-evidence` folder.

Written by a cloud planning chat (Fable 5.1) on `experimental`, from the August study
([workshop plan 12](../../../bonsAI-workshop/planning/12-deep-mod-ai-hints-feasibility.md), 2026-08-04), the
roadmap at tip `efc221b`, a read of the code as it is today, and the maintainer's own Cyberpunk 2077 mod setup
(the CyberFixed folder, shared 2026-10-27). The study stays where it is; this file is the plan that replaces its
recommendations where they went stale. Plain language on purpose: this file is for the maintainer first.

**The roadmap entry:** ★★★★★★ `[platform]` **Deep mod AI hints** — "Spot which mod tools a game uses, so answers
can be mod-aware." Filed with "install paths + compatdata"; not in scope from the first brief: downloading or
installing mods.

---

## 1. What the August study said, in short

- bonsAI should **talk about mods well** (a prompt rule and a set of knowledge cards). Cheap, safe, no permission.
- bonsAI should **not look at the disk for mods**, because the popular mod managers (Mod Organizer 2, r2modman,
  Vortex) keep mods *outside* the game folder. A game-folder scan says "no mods" to exactly the people with the
  most mods, and the AI would then reason from a wrong fact.
- One disk read was worth it on its own: the Steam Workshop file for a game (one small file per game, a count of
  subscribed items). Conditional on a new permission switch.
- A safety guard against "just delete your prefix" advice had to be written first. **Done:** built 2026-08-23,
  proven on the Deck 2026-08-28.

## 2. What has changed since, checked against the code on 2026-10-27

**Still true**

- A question with the word "mods" in it still gets no troubleshooting treatment: the phrase gate that decides
  this has no mod words, so no Proton log is attached and no troubleshooting framing is given. The newer topic
  router that fetches knowledge cards has no "mods" topic either, so no cards come back.
- The knowledge cards have no "mods" topic (166 cards in 27 topics today; 124 in August).
- bonsAI still cannot find where a game is installed: it knows two fixed Steam folders under the home folder and
  nothing on an SD card or a second library. The only Steam file it reads for a game is the name manifest.

**Stale**

- Every file path in the study moved in October's clean-up (the back end is now one folder per area).
- The Steam Web API permission the study hoped to use for Workshop item names was **retired**. The switches
  today are five: save files to Desktop, read screenshots, read Steam's logs, microphone, internet downloads.
  Workshop item *names* would now need the unbuilt Web permission; v1 can only give a count.
- The cost of one new permission switch is measured now: about 18 files and 30 edits (the guide), and the last
  one added touched 45 files end to end. The study guessed "six files".
- Preset chips that ask about mods already exist but are hidden with every other beta chip.
- The "stand-in Deck" on the maintainer's PC is a SteamOS virtual machine, not bonsAI on Windows.
- **Windows:** bonsAI runs only inside Decky on SteamOS today. Its Python side was started on the maintainer's
  Windows PC on 2026-09-12 and answered nine calls, but the second way to run is held at "not yet" (D99). The
  back end already has a few Windows branches (Ollama setup, data reset); the Proton log reader skips itself on
  anything but Linux. The study never considered Windows at all.
- The knowledge base grew (38 games, 414 notes, "Suggest as a tip" shipped); the per-game catalog phase is
  still intent only, so per-game mod cards remain out of reach for v1.
- **The study's main objection is only half right** (§ 4): Vortex puts its mods *inside* the game folder, and
  every manager keeps one plain list file that names its mods. The full look is feasible after all.

## 3. Round 1, the direction: answered 2026-10-27

1. **Look at the disk, or only talk well?** **(c) The full look:** read the manager's own lists to name the
   mods and the load order. (The study's "talk only" is the floor, not the ceiling.)
2. **What "works for Windows" means.** **(a):** the look-up is written as one layout per platform from day one,
   the Windows layout tested on fake folders in the Python tests; the Windows run itself waits for the
   second-way-to-run decision.
3. **Permission.** **A new switch**, off for everyone including existing installs, forced off by the Kids lock.
4. **Real modded machines.** Cyberpunk 2077 on the maintainer's Windows PC, managed by Vortex (133 mods). The
   maintainer is willing to port the mod setup to the Steam Deck for verification. The CyberFixed folder (the
   maintainer's own performance-profile repo for that setup) was shared and read; findings in § 4.
5. **Non-Steam games** (Heroic, Lutris, GOG): **out.**
6. **Strategy mode: compatible with mods.** Vanilla guidance first, with some flexibility worked in; may change
   once the feature's final shape is known.

## 4. What the Cyberpunk setup shows (read 2026-10-27 from the CyberFixed folder)

What matters for the look, in order of weight:

- **The game lives in a second Steam library on another drive** (`E:\SteamLibrary`). bonsAI must read Steam's
  own list of library folders to find a game at all; the two fixed folders it knows today would miss this game.
- **Vortex deploys by hard link *into* the game folder,** so the game folder is fully modded, not "mixed" as the
  study assumed. Vortex leaves one manifest in the game folder listing every deployed file with the mod it came
  from, and the mod's Nexus id and version are baked into that name. Here: 1,163 files from 133 mods. **That one
  file is the full list.** (Where exactly Vortex writes it, and whether every Vortex game gets one, is to confirm
  on the PC.)
- **Cyberpunk's own layout** (everything under the game folder): script-engine mods under
  `bin\x64\plugins\cyber_engine_tweaks\mods\<mod>\` (19 here), compiled scripts under `r6\scripts`, tweaks under
  `r6\tweaks`, archives under `archive\pc\mod`, loader plugins under `red4ext\plugins`, and the game's own
  "REDmod" format under `mods\` (4 here) with its **load order** in one small JSON under `V2077\Load Order\`.
  Frameworks and versions (from the maintainer's audit): game 2.31, CET 1.37.1, RED4ext 1.29.1, ArchiveXL 1.26.1,
  TweakXL 1.11.3, Codeware 1.18.1. The loaders write their own logs in the game folder.
- **Mod settings** sit in one ini under `red4ext\plugins\mod_settings\` and in per-mod JSON files; **the game's
  own settings** (graphics, crowd density, upscaling) are one JSON under the Windows local app-data folder, and
  on the Deck the same file sits inside the game's Proton prefix at a fixed path.
- **The audit notes are the model answer this feature should reach:** the frame-rate problem was the NPC density
  and reactivity mods on the processor, not ray tracing or shadows; the fix was throttling those mods' settings
  and lowering crowd density. A mod-aware bonsAI that can see the mod list, the mod settings and the game settings
  could get there; a mod-blind one would talk about shadows.
- **The study's objection, refined.** "Managers keep mods outside the game folder" holds for Mod Organizer 2
  (virtual folder at launch) and r2modman (profile folders), not for Vortex and not for Cyberpunk's ecosystem at
  all. And each manager keeps **one plain list file**: Vortex's deployment manifest; Mod Organizer 2's
  `modlist.txt` per profile; r2modman's `mods.yml` per profile. So the full look is a set of **recipes**: one per
  game (where its mods live, its load-order file, its loader logs, its settings file, per platform) and one per
  manager (where its home is, which file lists the mods). Manager home paths come from general knowledge until
  read on a real machine; the Cyberpunk recipe can be written from the shared folder and checked on the PC today.

## 5. Round 2, what a player sees: answered 2026-10-27

1. **Where it shows:** to the AI, one line under Show details, **and a Mods screen** (manager, frameworks and
   versions, counts by kind, the load order, the mod names in groups, a Refresh button), its own screen like the AI
   models screen. The chip on the answer comes later.
2. **When the look runs:** on the first question about the running game, in any mode, then cached for the
   session; the Mods screen's Refresh is the manual way; never on game start by itself.
3. **How much the AI gets:** the summary plus the mods whose names appear in the question, with their settings
   when known. The maintainer asked two things more: what the options are to **give this feature more room**,
   and whether to keep it to **Strategy and Expert only, or add a Troubleshooting mode**. Answered in § 6.
4. **Loader logs:** yes, inside the same budget as the Proton logs.
5. **The game's own settings file:** yes, read-only, under the same switch.
6. **The words bonsAI uses:** locked as written in the question.
7. **Strategy mode:** the AI is told the gameplay-changing mods present, gives the unmodded answer first, then
   says where a present mod changes it.
8. **One preset chip** when mods were found: yes.
9. **A PC command** that runs the same look on a game folder and prints the summary: yes.
10. **The Deck port:** copy the game folder; whatever makes the most sense.

## 6. The AI's reading room, and whether a new mode is needed (checked in the code 2026-10-27)

**There is more room than the study knew.** Since September the plugin asks the Deck's AI for a reading window
of 16,384 tokens (about 65,000 characters), four times the server's default the study assumed. Measured on the
Deck: it cost 0.6 GB of memory and nothing in speed, with a game running. A typical question today carries about
2,000 to 2,600 tokens of prompt and up to 1,600 tokens of reply. So roughly 11,000 tokens (about 45,000
characters) sit free on every question. The caps that limit attached material were set under the old 4,096
assumption: the Proton log excerpt is still cut at 4 KB, and its own comment still says 4,096.

**What this plan proposes for the room:**
- A **mod block of up to 6 KB**: the summary (manager, frameworks and versions, counts, the load order), the
  loader-log errors, then the mods the question names with their settings, in that order, cut at the budget.
- The **Proton excerpt raised to 8 KB**, which the September decision already allowed (it said 6 to 8 KB).
- **One shared ceiling of 24 KB** for logs, mods and cards together, far under the room, with the block order
  mods, logs, cards so a mod question keeps its mods when something has to go.
- The window-fit check that already runs before every question stays the guard: one token too many loses about
  half of everything sent (measured), so the ceiling is kept well clear of the window.
- **A bigger window (32,768, about 1.2 GB) is possible** and would be its own measured Developer experiment, as
  the September decision asked; this feature does not need it.

**No new mode.** The room is not the reason to add one, and a mode is not cheap: two back-end tables, eight
screen files, the mode menu, the guide, the per-mode model chains and their tests, about three stars, and it
splits the three-mode story people know. **Recommendation:** the mod block goes on any mode once the look has run
and the question is about the running game. **Speed** gets the short summary only (its reply budget is 800
tokens and the guide promises a short answer); **Expert and Strategy** get the summary plus the named mods and
their settings. If, after the Deck check, Speed answers to troubleshooting questions feel too thin, a
Troubleshooting mode becomes its own roadmap entry with this plan's measurements behind it.

## 7. Round 3: the lanes, and what runs at the same time (open)

**The rule for parallel lanes is files, not features.** The one thing that lets eight lanes start on the same
minute is a **contract written into the plan before go**: the shape of the look's result (manager, frameworks,
counts, load order, mods by kind, settings, logs, warnings), the name of the function that finds a game's folder,
and the name of the plugin method the screen calls. Every lane builds against the contract with a fake until the
real piece lands.

| Lane | What | Model | Owns (area) | Waits for |
|---|---|---|---|---|
| K0 | The bookkeeper: the roadmap entry re-shaped, decision D138 written from §§ 3, 5, 7 | Sonnet medium | the roadmap, the decisions file | nothing; lands first |
| S | The snapshot script: lists a game folder and a manager's home (names, sizes, dates; never file contents, never saves) for the maintainer to run on the PC and the Deck; the listings go to the private workshop as evidence | Sonnet medium | a new script under `scripts/mods/` | nothing; the maintainer runs it before wave 1 ends |
| A | Finding the game: Steam's library list and the game's manifest on SteamOS and Windows; the allowlist (the real path must sit under a library root; never through the prefix's drive link) | Sonnet high | new `py_modules/backend/mods/steam_library.py`, tests with fake folders | nothing |
| B | The permission switch "Read game install folders": back end key, off for everyone, Kids lock, the Permissions row, deep link, search index, the two contract files, tests | Sonnet high | the permission files on both sides (the list in § 2 of the August study is stale; the real list is the 18 files the last switch touched) | nothing |
| C | The recipes and the reader: Cyberpunk first (from § 4), then BepInEx, SMAPI, Bethesda, Workshop; each says where mods live, the load-order file, the loader logs, the settings file, per platform; the reader applies one to a folder with depth, count, byte and time budgets | Sonnet high | new `py_modules/backend/mods/mod_recipes.py`, `mod_look.py`, tests | nothing (builds on A's contract with a fake) |
| D | The manager list readers: Vortex's deployment manifest, Mod Organizer 2's modlist, r2modman's mods list, the Workshop file | Sonnet high | new `py_modules/backend/mods/manager_lists.py`, fixtures, tests | nothing |
| E | The block for the AI and the Show details chip: the summary, the question-matched mods, the budget (§ 6); the chip in the back end's chips list | Sonnet high | new `py_modules/backend/mods/mod_context_block.py`; `transparency_service.py` (this lane alone) | nothing |
| F1 | The words: mod vocabulary in the phrase gate, the mod rules line, the Strategy-mode rule, the "which manager?" rule | Sonnet high | `ask_topic_instructions.py`, `ollama_prompts.py` (this lane alone), tests | nothing |
| G | Knowledge cards: a "mods" topic of 12 to 15 cards in own words marked "Researched, unconfirmed", the router's topic words, the drift test | Sonnet high | `data/kb/compat_patterns.json`, `compat_topic_router.py`, tests | nothing |
| H | The Mods screen and its door: the screen, the entry in the paperclip menu, the plugin method that returns the look, Refresh, the D-pad routes | Opus medium; the advisor before landing | new screen files, `MainTabAttachMenuPopover.tsx`, new `mods_rpc.py`, `main.py` (one method) | nothing (builds on the contract with a fake) |
| F2 | The wiring: the look runs once per game and is cached, stacked with logs and cards under the shared ceiling, the "reading mods" progress phase, the Proton cap raised | Sonnet high | `game_ai_request.py`, the stacking function, `bonsai_stream_tags.py`, `proton_troubleshooting_logs.py` | A, C, D, E landed |
| J | The preset chip when mods were found, and the hidden mod chips reviewed | Sonnet medium | `presets.ts`, tests | H landed |
| P | The PC command: runs the look on a folder and prints the summary | Sonnet medium | new `scripts/mods/look_game_folder.py` | C, D, E landed |
| M | Fixtures from the real listings (the PC's Cyberpunk folder, the Deck's after the port) replacing the fake ones | Sonnet medium | the test fixture folder | S run by the maintainer |
| L | Docs: the "bonsAI will not claim" list in the README, the Permissions section of troubleshooting, the guide | bookkeeper | the three docs | everything landed |

Wave 1: K0, S, A, B, C, D, E, F1, G, H at once (ten lanes). Wave 2: F2, J, P, M. Then the Deck.

**The questions:**

1. **Contract first:** the plan fixes the look's result shape, the finder's name and the plugin method's name
   before go, so ten lanes start on the same minute. *Recommendation: yes.*
2. **Where the Mods screen opens from.** (a) An entry in the paperclip menu beside "Attach recent screenshot":
   "Mods seen: 133 · open". (b) A row in the Settings or Ollama tab. (c) The game tag in the question box's
   strip, made pressable (plan 84 made it a label on purpose). *Recommendation: (a).*
3. **A new back-end area** `backend/mods/`, one folder per area as the clean-up laid out. *Recommendation: yes.*
4. **Who runs it:** a new chat on your PC, since the Deck and the PC's Cyberpunk folder are there. Fable 5.1 high
   orchestrates and lands (your plan 100 choice) or Opus 5.5 extra-high (the routing table). Sonnet high lanes,
   Opus medium for the Mods screen, the advisor at max for at most five consults. *Recommendation: as plan 100.*
5. **The snapshot first:** you run lane S's script on the PC's Cyberpunk folder and on Vortex's own home folder
   (names, sizes and dates only; no file contents; no saves); the listing goes to the private workshop, nowhere
   else (mod names can be adult). The lanes build their fixtures from it. *Recommendation: yes, before wave 1 ends.*
6. **One night or two:** wave 1 and wave 2 one evening, the Deck after you have copied Cyberpunk over, the second
   evening. *Recommendation: two evenings.*
7. **The roadmap shape:** one six-star entry with this plan's phases, or the study's split into four entries.
   *Recommendation: one entry; the split was for a "talk only" future that is not the one chosen.*
8. **The reading room (§ 6):** the 6 KB mod block, the 8 KB Proton excerpt, the 24 KB shared ceiling, and no new
   mode. *Recommendation: as written.*

## 7a. Round 3: answered 2026-10-27, two things open

1. **Contract first:** yes.
2. **Where the Mods screen opens from:** **B, a Mods row on the Search tab, opening a sheet inside the tab.** The
   maintainer asked what the screen will look like and what it will control, thought the Search and notes area might
   be the place, and asked for mock-ups (§ 7b); on the board, 2026-10-27, they liked B and D, left A and C unmarked,
   and wrote no comments. So: no new door on the Main tab's paperclip menu in v1, and the screen is drawn inside the
   Search tab, the way a game note opens there.
3. **A new back-end area** for mods: yes.
4. **Who runs it:** as plan 100 (a new chat on the PC, Fable 5.1 high orchestrates and lands; Sonnet high lanes; Opus
   medium for the Mods screen; the advisor at max for at most five consults).
5. **The snapshot first:** yes.
6. **One evening or two:** one evening.
7. **The roadmap shape:** one entry.
8. **The reading room (§ 6):** not sure yet. Stays open; the full plan carries § 6's numbers as the default and the Deck
   session measures the prompt with the mod block on, so the maintainer can call it on a number.

## 7b. The Mods screen: the mock-up board (round 1, drawn 2026-10-27)

**The board (private to the maintainer):** https://claude.ai/artifact/7XcZLtdYhEdvDpXS8bsYfG, its parts in
[docs/demos/mockup-board-3](../demos/mockup-board-3/README.md). Open it in a web browser signed in to claude.ai, not
in the Claude app's own panel, or the picks do not reach the chat. Four panels at the Deck's real size, in Steam's own
font, filled with the maintainer's Cyberpunk setup (the adult mod names left out):

- **A.** A third entry in the paperclip menu, "Mods seen: 133 · open", opening a full-screen Steam popup like the AI
  models screen: what bonsAI saw on the left, the groups on the right, Ask about my mods · Refresh · Done below.
- **B.** The maintainer's idea: a "Mods seen · 133" row on the Search tab, under the find box in the game's section,
  opening a sheet inside the tab the way a game note opens; B closes it.
- **C.** Both doors into B's sheet: the paperclip entry while playing, the Search tab row while browsing.
- **D.** The permission switch "Read game install folders" on the Permissions tab, with its confirm box, drawn to be
  read; it goes with every option.

**Picked 2026-10-27: B.** D was read and liked; A and C unmarked; no comments.

**What the screen shows, in every option:** what bonsAI saw (the manager and its profile, the frameworks with
versions, the game's version and where it is, whether the loaders' last start had errors, the game's own graphics
settings), then the mods in folded groups (the load order, script mods, loader plugins, archives, scripts and tweaks,
the whole list the manager wrote), each one line with its count; the ringed row's longer text in the strip at the
bottom. **What it controls:** Refresh, Ask about my mods, and opening or closing a group. Nothing else. **What it
never does:** install, remove, enable, disable or update a mod; edit a setting or a load order; say "you have no mods";
read a Nexus, Thunderstore or Workshop account; send anything online.

## 7c. Four small calls before the full plan (open)

1. **The Mods row before the look has run.** The look runs on the first question about the running game (round 2),
   so on the Search tab the row would be empty until then. *Recommendation: the row reads "Mods: not checked yet" and A
   on it runs the look, so the Search tab is a second way to start it; Refresh on the sheet is the third.*
2. **The row is for the running game only in v1.** The Search tab's game row lists games by name from your chats,
   and the look needs a game's Steam number and folder, which only a running game gives for certain.
   *Recommendation: running game only; a later version can look up a picked game by name.*
3. **Which recipes ship in v1, and how an unchecked one is marked.** Cyberpunk is checked on your PC and, after the
   port, on the Deck. The manager list readers (Vortex, Mod Organizer 2, r2modman) and the Workshop count work for any
   game. The other game recipes (BepInEx for Unity games, SMAPI for Stardew Valley, Bethesda games with SKSE or F4SE)
   come from general knowledge until someone has one on a real machine; the compat cards say Fallout 4 runs through
   Mod Organizer 2 and F4SE on your Deck, so that is a second real one if it is still there. *Recommendation: ship
   all of them, and the look says "suspected" for anything found by an unchecked recipe and "seen" only for a
   checked one; the plan lists which is which.*
4. **The reading-room numbers (§ 6, round 3 question 8), still not sure.** *Recommendation: the full plan carries the
   6 KB, 8 KB and 24 KB as the default, and lane F2 measures the prompt with the mod block on, on the Deck's model,
   so you call it on a number in the report rather than now.*

## 7d. Round 4: the maintainer's notes of 2026-10-27, late, and what they change

1. **The door: a mods icon on the game tag.** The maintainer: "a mods icon on the bottom of the text area where it
   shows the game. When mods are detected, the icon will show; users can tap that game title text or D-pad to it and
   press it to jump right to the mods section in the Search tab." **Recorded as the pick:** B's Search tab row and
   sheet, plus this door. Two consequences. (a) The game tag in the question box's strip becomes a focus stop (plan 84
   made it a label on purpose); it joins the strip's row with the paperclip, the microphone and Ask, so Left and Right
   reach it; it needs a focus-graph entry and a Deck row. (b) **The look has to run when bonsAI sees the game running,**
   in the background, once per game per session, or the icon cannot show. Round 2's "never on game start by itself"
   changes to that. The cost is a few small file reads per game per session.
2. **Call 1 of § 7c, in plain words, and now moot.** The worry was: the Search tab row only has something to show
   after bonsAI has looked at the game's folders, and the look used to wait for your first question. With the look
   running as soon as the game is seen (point 1), the row is filled by the time anyone opens the Search tab. It reads
   "Mods: not checked yet" only while the switch is off, and nothing at all for a game bonsAI cannot find.
3. **Call 2 of § 7c revised, from the maintainer's catch:** a game that crashes at launch is not running, so "running
   game only" fails exactly when it matters most. The look is keyed by the game's Steam number, which can come from
   three places: **the running game; the game the question names** (the title resolver already does this for the
   knowledge base, and the finder reads every installed game's name from Steam's own manifests, so a name becomes a
   number without the game running); **the last game that ran this session** (new: the back end remembers it; today
   it remembers nothing). The Search tab's game row gains the installed games, so a game's mods can be opened without
   running it. *Default: running game, else the game the question names, else the last game that ran; the answer says
   which it used.*
4. **Mod knowledge in the knowledge base** (the maintainer: load it with what is known about Cyberpunk's and Fallout
   4's mods, so "what's wrong with my load order" and compatibility questions can be answered offline). Checked
   2026-10-27: **LOOT's masterlists** (the load-order tool the Bethesda modding community uses) are published under
   CC0, free to use with no conditions. The Fallout 4 one holds several hundred plugin entries with which plugin must
   load after which, what each requires, what it is incompatible with, warnings ("X is incompatible with Y, but both
   are present"), and which versions are "dirty". Matched against the plugins the look found, that answers "what's
   wrong with my load order" for Fallout 4, Skyrim and the other Bethesda games, offline. For Cyberpunk the community
   modding wiki is the likely source; this session's network could not reach it, so its licence is unchecked. Nexus
   Mods pages are the authors' own text with no open licence: never copied; mod names and versions are read from the
   user's own folder only. Thunderstore has mod metadata with dependencies, per package licence, but reading it live
   needs the unbuilt Web permission. **This is new scope, about two to three stars:** a read-only research lane before
   go (the sources per game, their licences, what can be taken and in what shape), then content lanes for Cyberpunk
   and Fallout 4 mod cards, and a load-order check that matches the found plugins against LOOT's rules on the device
   (a few hundred KB per game in the knowledge library). *Recommendation: the research lane in v1 before go; the cards
   and the check as a second wave right after, unless the research says they are quick.*
5. **Non-Steam launchers (Heroic, Lutris, GOG, Epic): not impossible.** Each launcher keeps its own list of installed
   games and their folders (Heroic in its settings folder, Lutris in its own small database), so a launcher adapter
   would find the game folder the way the Steam finder does; on the Deck such a game runs as a Steam shortcut with a
   made-up number, so the name is the key. About two stars per launcher, after the Steam one works. *Recommendation:
   out of v1, on the roadmap as the follow-on, and the finder built so a launcher can be added without touching the
   recipes.*
6. **Windows.** The maintainer: "we have bonsAI running on Windows, it's on this Win11 machine." The repo's record
   holds the second way to run at "not yet" and knows only the September stand-in test, so the planning chat needs to
   know how it runs there (the September stand-in for Decky, a SteamOS virtual machine, something else). If the Python
   side runs on Windows, the look's Windows layout is tested with the real back end on the Cyberpunk folder, not only
   with the PC command, and the Windows recipe becomes "seen", not "suspected".
7. **The reading-room numbers (§ 6): a verify gate.** The maintainer: "make sure it's marked as something that needs
   to be verified with me before implementation." So: lane F2 measures real prompts with the mod block on before it
   changes any cap, reports the numbers in the chat, and **waits for the maintainer's word** before the caps change.
8. **Anti-cheat and online play.** Agreed: never a workaround, never a ban prediction. How the community handles it,
   for the knowledge card: games with anti-cheat (Easy Anti-Cheat, BattlEye, and some with VAC) usually refuse to start
   with altered files or ban the account, so people mod single-player games, use the game's own mod support (the
   Workshop, an official mod menu), or mod online only where the game allows it (server-side mods, allowed cosmetics).
   The safe rule of thumb: no mods in a game with anti-cheat unless the game's own mod system supports them. When a
   question mixes mods and online play, bonsAI says that, points at the game's own rules, and stops.

**Round 4 answered 2026-10-28:** 1, yes, with one correction of the chat's wording: the icon sits in the question
box's bottom strip on the Main tab, beside the game's name, and nowhere else ("on top of" in the chat meant "in
addition to" the Search tab row, not a place). 2, yes. 3, research now; the knowledge-base work is its own roadmap
entry (★★★, added 2026-10-28). 4, the launchers are their own roadmap entries (★★ each, added 2026-10-28) **and this
plan builds and tests them** beside the Steam look. 5, **bonsAI runs on the maintainer's Windows 11 PC inside Steam's
Big Picture Mode**, with Decky Loader; so the Windows side is tested with the real plugin on the real Cyberpunk folder,
and the Windows recipe is "seen", not "suspected". The repo's documents had not recorded this; § 11 and § 14 do now.

**The five questions of round 4, as they were put:**

1. **The game-tag door and the look on game detection** (points 1 and 2): as written? *Default: yes.*
2. **Where the game's number comes from** (point 3): running game, else the game the question names, else the last
   game that ran; installed games on the Search tab's game row. *Default: yes.*
3. **Mod knowledge** (point 4): the research lane before go in v1, the cards and the load-order check as a second wave
   right after? Or all of it in v1? *Default: research in v1, the rest right after.*
4. **Launchers** (point 5): out of v1, designed for? *Default: yes.*
5. **How does bonsAI run on your Windows machine** (point 6)? *No default: say in a line.*

## 8. One sentence

Give bonsAI a careful, read-only look at a game's mods on the Deck and on the PC (the manager's own list, the frameworks
and their versions, the load order, the loaders' logs, the game's own settings), show it on a Mods sheet on the Search
tab and as a small icon beside the game's name, hand the AI a short summary plus the mods a question names, teach the AI
the words and the rules for mods (vanilla first, back up first, never a mod change, never an anti-cheat workaround), and
give the knowledge base its first "mods" cards, with every lane cut by files so fourteen can start on the same minute.

## 9. What a player notices, and what bonsAI will and will not do

**What a player notices.**

1. A new switch on the Permissions tab, **Read game install folders**, off until they turn it on, with a plain confirm
   box (mock-up D). The Kids lock forces it off.
2. With the switch on and a game running, a small **mods icon** appears beside the game's name in the question box's
   bottom strip on the Main tab once bonsAI has seen mod files for that game. The name becomes pressable: a tap, or the
   D-pad to it and A, jumps to the Mods sheet on the Search tab.
3. On the **Search tab**, under the find box, a row for the running game: "Mods seen · 133 · Vortex · 5 frameworks".
   A opens the **Mods sheet** inside the tab (mock-up B): what bonsAI saw (manager, frameworks and versions, game version
   and where it is, the loaders' last start, the game's own graphics settings), then the mods in folded groups, one
   line each with its count; the ringed row's longer text in the strip at the bottom; **Refresh** and **Ask about my
   mods** at the end; B closes. The game row gains the installed games, so a game that is not running can be opened
   too.
4. **Answers know the mods.** "Why does my frame rate drop in Kabuki?" is answered from the crowd and reactivity mods
   and the crowd setting, not from shadows. "What mods do I have?" lists what was seen. "It crashes since I added a
   mod" reads the end of the loaders' logs for a mod that failed to load and gives mod-aware steps: which manager, the
   newest mod first, back up saves before anything. In Strategy mode the unmodded answer comes first, then where a
   present mod changes it. Under **Show details**, one chip says what was read.
5. **One preset chip** when mods were seen: "What mods do I have, and could any be causing trouble?"
6. General modding questions ("how do I set up Vortex on the Deck?", "where do Stardew mods go?") get answers from
   about fifteen new knowledge cards, offline, with the SteamOS and Windows differences.
7. On the **Windows PC**, the same, inside Big Picture Mode: the look reads Steam's library list, finds the game on
   its own drive, reads Vortex's list and the game's settings file under the Windows app-data folder.

**What bonsAI will not do, written into the words it uses, the README and the troubleshooting page.**

- Never install, remove, enable, disable or update a mod; never edit a setting, a load order or a launch option.
- Never say "you have no mods". When it finds nothing it says where it looked ("no mod files found in the places
  bonsAI checks"). "Seen" only for what a checked recipe read; "suspected" for anything an unchecked recipe found.
- Never read a Nexus, Thunderstore or Workshop account, and never fetch anything online for this. Workshop items are
  a count, not names, until the Web permission exists.
- Never say two mods are compatible, or a mod works with a game version; it says to check the mod's own page. The
  load-order rules for Bethesda games come later, from the knowledge base (the ★★★ entry), not from guessing.
- Never help bypass, spoof or disable anti-cheat, and never predict a ban. When a question mixes mods and online play
  it says what the community does (single-player, the game's own mod support, or only where the game allows it) and
  points at the game's rules.
- Never read a file it was not given a recipe or a list for, never follow the prefix's drive link, never read more
  than the budgets allow (§ 11), never read saves.
- Non-Steam games through Heroic and Lutris are looked up through those launchers' own lists; a game bonsAI cannot
  find through Steam or a launcher is simply not found, and it says so.

## 10. The contract: what every lane builds against

Written here so lanes start together with a fake and land against the real thing. A lane that needs to change the
contract stops and says so; the session changes it here first.

**10a. The look's result** (one object, JSON on the wire, the same on both sides):

```
{
  "ok": true,                      // false with "error" when the switch is off, no game, or the folder is not found
  "error": "",                     // "permission_off" | "no_game" | "not_found" | "not_a_steam_game" | "budget"
  "game": { "app_id": "1091500", "name": "Cyberpunk 2077", "folder": "<absolute path>",
            "platform": "steamos" | "windows", "library": "<library root>",
            "found_by": "steam" | "heroic" | "lutris" | "gog_galaxy" | "epic",
            "source": "running" | "named" | "last_ran" | "picked" },
  "checked_at": "<iso time>", "confidence": "seen" | "suspected", "recipe": "cyberpunk2077" | "generic",
  "manager": { "kind": "vortex" | "mo2" | "r2modman" | "workshop" | "none" | "unknown",
               "profile": "", "list_file": "<absolute path or empty>", "mod_count": 133 },
  "frameworks": [ { "name": "CET", "version": "1.37.1", "where": "<relative path>" } ],
  "load_order": [ { "position": 1, "name": "NCPD Prevention Police Enhancement", "version": "2.7" } ],
  "groups": [ { "kind": "script_mods", "label": "Script mods", "count": 19,
                "items": [ { "name": "AppearanceMenuMod", "version": "", "source": "<mod the file came from>" } ] } ],
  "settings": { "file": "<absolute path or empty>", "values": { "CrowdDensity": "Medium" } },
  "loader_logs": [ { "name": "CET", "file": "<absolute path>", "errors": 0, "tail": [ "<last lines>" ] } ],
  "warnings": [ "<budget stops, unreadable roots, unchecked recipe>" ]
}
```

Rules: `items` are cut at 400 per group and the whole result at 256 KB; `tail` holds at most 40 lines per log, read
only on a troubleshooting question or on Refresh; every path is absolute and under a root the finder allowed; nothing
in it is ever written back.

**10b. Names.** Back end, all in the new area `py_modules/backend/mods/`:

| Name | File | Does |
|---|---|---|
| `find_game_folder(app_id, *, home, platform)` | `steam_library.py` | Steam's library list and the game's manifest; returns the folder, the library root and the name, or None |
| `list_installed_games(*, home, platform)` | `steam_library.py` | every installed Steam game's number and name, from the manifests |
| `find_launcher_game(name, *, home, platform)` | `launchers.py` | the same for Heroic, Lutris, and on Windows GOG Galaxy and Epic, by name |
| `path_allowed_for_mod_read(candidate, roots)` | `steam_library.py` | the allowlist: the real path sits under an allowed root; never through `pfx/dosdevices` |
| `look_at_game_mods(app_id, *, want_logs=False)` | `mod_look.py` | applies the recipe and the manager readers with the budgets; returns 10a |
| `cached_game_mods_look(app_id)` / `remember_game_seen(app_id)` / `last_game_seen()` | `mod_look.py` | the per-session cache and the last game that ran |
| `read_vortex_manifest`, `read_mo2_modlist`, `read_r2modman_mods`, `read_workshop_acf` | `manager_lists.py` | the four list readers, pure functions on text |
| `RECIPES`, `recipe_for(app_id, name)` | `mod_recipes.py` | the recipes as data (§ 11) |
| `build_mod_context_block(look, question, *, budget_bytes)` | `mod_context_block.py` | the block for the AI (§ 15) |
| `build_mods_transparency(look, attached)` | `transparency_service.py` (lane E) | the Show details chip |

Plugin methods on `main.py`, each a one-line hand-off to `mods_rpc.py` (the name carries `game_mods` so the generated
map files them together): `get_game_mods_look(app_id: str, refresh: bool = False)`, `list_game_mods_targets()` (the
running game, the last game that ran, the installed games), `note_game_mods_seen(app_id: str)` (the screen's game
sync calls it when the running game changes; it starts the look in the background and remembers the game).

Screen side, a new folder `src/features/mods/`: `modsLookStore.ts` (the last result per game, `useModsLook(appId)`),
`useModsLookSync.ts` (called from the game sync hook: on a game change, `note_game_mods_seen` then `get_game_mods_look`),
`ModsSheet.tsx` and `ModsRow.tsx` (the Search tab pieces), `modsIcon.tsx` (the icon for the game tag). The capability
key is `game_install_read`; its Permissions row id is `game_install_read`; its toggle label is "Read game install
folders".

## 11. The recipes, and where things live

A **recipe** says, for one game, where mods live, which loader files prove a framework and carry its version, the
load-order file, the loader logs, and the game's own settings file, per platform. A **manager reader** says where a
manager keeps its list. A **launcher adapter** says where a launcher keeps its list of games. All three are data plus
small readers; the look composes them. Every path below not marked *seen* comes from general knowledge and is marked
**suspected** until lane S's listing from a real machine confirms it, at which point the plan's log says so and the
recipe flips to *seen*.

**Platforms.** SteamOS: Steam under `~/.local/share/Steam` or `~/.steam/steam`, more libraries from
`steamapps/libraryfolders.vdf` (an SD card is `/run/media/...`), a Windows game's app-data inside the prefix at
`steamapps/compatdata/<id>/pfx/drive_c/users/steamuser/AppData/...` (a fixed path; never a walk; never through
`pfx/dosdevices`). Windows: Steam under `C:\Program Files (x86)\Steam`, more libraries from the same file (the
maintainer's is `E:\SteamLibrary`), app-data under `%LOCALAPPDATA%` and `%APPDATA%`.

**Game recipes in v1.**

| Recipe | Status | What it reads |
|---|---|---|
| Cyberpunk 2077 (1091500) | **seen** on the maintainer's PC (§ 4); the Deck after the port | script mods under `bin/x64/plugins/cyber_engine_tweaks/mods/<mod>/`; loader plugins under `red4ext/plugins/`; compiled scripts `r6/scripts/`; tweaks `r6/tweaks/`; archives `archive/pc/mod/`; REDmods under `mods/`; the load order under `V2077/Load Order/*.json`; frameworks and versions from the loaders' own files and logs (CET's and RED4ext's logs in their folders); mod settings `red4ext/plugins/mod_settings/user.ini`; the game's settings `CD Projekt Red/Cyberpunk 2077/UserSettings.json` under local app-data (Windows) or the prefix (SteamOS) |
| Bethesda games (Skyrim SE 489830, Fallout 4 377160, Starfield, the others) | suspected; Fallout 4 on the maintainer's Deck through Mod Organizer 2 and F4SE is the check if it is still installed | `Data/*.esp`, `.esm` and `.esl` names; the script extender's loader and `Data/<SE>/Plugins/*.dll`; `plugins.txt` and `loadorder.txt` under the game's local app-data; the game's ini under Documents/My Games |
| Unity games with BepInEx (Lethal Company, Valheim, R.E.P.O., others) | suspected | `BepInEx/{core,plugins,config}`, `BepInEx/LogOutput.log` (proves the loader ran, carries its version), `winhttp.dll` or `run_bepinex.sh` |
| Stardew Valley (413150) with SMAPI | suspected | `Mods/<mod>/manifest.json` (name, version, unique id), the SMAPI binary, `ErrorLogs/SMAPI-latest.txt` |
| Any game with Workshop items | suspected (the file's exact keys unread) | `steamapps/workshop/appworkshop_<id>.acf`: a count and the item numbers, no names |
| Generic (no recipe) | always | the manager readers only, then "no mod files found in the places bonsAI checks" |

**Manager readers in v1.** Vortex: the deployment manifest in the game's mod target folder (seen: in the game root for
Cyberpunk; 1,163 files from 133 mods, each file's source mod with its Nexus number and version in the name); Vortex's
own home `%APPDATA%\Vortex` on Windows, and inside a prefix on SteamOS (suspected). Mod Organizer 2: `profiles/<p>/modlist.txt`
(plain text, `+name` enabled, `-name` disabled, newest first) next to `ModOrganizer.ini`; on SteamOS usually inside a
prefix (suspected). r2modman and Thunderstore Mod Manager: `<config>/r2modmanPlus-local/<Game>/profiles/<p>/mods.yml`
(`~/.config` on SteamOS, `%APPDATA%` on Windows; suspected). The Workshop file above.

**Launcher adapters in v1** (their own roadmap entries, ★★ each). Heroic: its own list of installed games and folders
under its settings folder (`~/.config/heroic/` or the Flatpak one `~/.var/app/com.heroicgameslauncher.hgl/config/heroic/`
on SteamOS; `%APPDATA%\heroic\` on Windows; the GOG and Epic lists are separate files; suspected). Lutris: its game
database `pga.db` under `~/.local/share/lutris/` (or the Flatpak one), one row per game with its folder (suspected). On
Windows, GOG Galaxy (`C:\ProgramData\GOG.com\Galaxy\storage\galaxy-2.0.db`) and the Epic Games Launcher (one `.item`
file per game under `C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests\`), attempted only if the maintainer's PC has
one. On the Deck a launcher's game runs as a Steam shortcut with a made-up number, so the name is the key: the look
matches the running shortcut's name against the launcher's list.

**Budgets, in the reader.** Depth 3 under the game folder, 2,000 directory entries, 512 KB of text read, 1.5 seconds
of wall clock, then stop with a warning; binaries are never opened, only listed; the dosdevices link is never followed;
every path is checked against the allowlist before it is opened; the look runs off the event loop as the Proton log
reader does.

## 12. The lanes: what runs at the same time

**The rule for parallel lanes is files, not features.** Two lanes never own the same file. Everything not named as a
wait runs at the same time, up to fourteen helpers at once (D128's cap is fifteen), started a few minutes apart; each
runs only its own tests at two workers; the full checks run once per landing, in the shared checkout.

| Lane | What | Stars, tag | Model | Owns (files) | Waits for |
|---|---|---|---|---|---|
| K0 | The bookkeeper's pre-go audit: D138 appended, the roadmap entry's status, the testing rows for every check in § 14 | ★ docs | Sonnet 5.5 medium | `docs/roadmap.md`, `docs/roadmap-kb.md`, `docs/testing.md`, `docs/audit/maintainer-decisions-locked.md` | nothing; lands first |
| R | Research, read-only: the mod-knowledge sources per game (LOOT's masterlists, the Cyberpunk wiki, Thunderstore, the SMAPI and BepInEx docs), each with its licence, what can be taken and in what shape; a report to the workshop; the roadmap-kb entry's next step | ★★ `[KB]` | Sonnet 5.5 high | nothing in the repo; a report file in the workshop's `planning/assets` | nothing; the maintainer reads the report |
| S | The snapshot script and its run: lists a game folder, a manager's home and a launcher's game list (names, sizes, dates; never contents, never saves) to a JSON for the workshop; the maintainer runs it on the PC (Cyberpunk, Vortex's home) and on the Deck (after the port; Fallout 4 and its Mod Organizer 2 if there) | ★ `[platform]` | Sonnet 5.5 medium | new `scripts/mods/snapshot_mod_folders.py`, its test | nothing; the maintainer runs it during wave 1 |
| A | Finding the game: `steam_library.py` for both platforms, the installed-games list, the allowlist; fake folders for both layouts in the tests | ★★★ `[platform]` | Sonnet 5.5 high | new `py_modules/backend/mods/steam_library.py`, `tests/test_mods_steam_library.py` | nothing |
| A2 | The launcher adapters: `launchers.py` for Heroic, Lutris, GOG Galaxy and Epic, on fake files; the running shortcut's name as the key | ★★ `[platform]` | Sonnet 5.5 high | new `py_modules/backend/mods/launchers.py`, `tests/test_mods_launchers.py` | nothing (A's contract, with a fake) |
| B | The permission switch, both sides: the key, off for everyone, the Kids lock, the Permissions row and its confirm box, the deep link, the search index, the two contract files, the geometry table, tests | ★★ `[perms]` | Sonnet 5.5 high | every file the last switch touched (`git grep -l internet_downloads`, 45 files), none of the files other lanes own | nothing |
| C | The recipes and the reader: `mod_recipes.py` (§ 11 as data), `mod_look.py` (the budgets, the dosdevices rule, the cache, the last game, the result of 10a); Cyberpunk from § 4 first, the others from § 11 | ★★★★ `[platform]` | Sonnet 5.5 high | new `py_modules/backend/mods/mod_recipes.py`, `mod_look.py`, `tests/test_mods_look.py` | nothing (A's contract, with a fake) |
| D | The four manager readers, pure functions on text, with fixtures (a cut-down Vortex manifest shaped like the maintainer's, a modlist, a mods.yml, a Workshop file) | ★★★ `[platform]` | Sonnet 5.5 high | new `py_modules/backend/mods/manager_lists.py`, `tests/fixtures/mods/`, `tests/test_mods_manager_lists.py` | nothing |
| E | The block for the AI and the chip: `mod_context_block.py` (the summary, the question-matched mods with their settings, the budget, "seen"/"suspected" wording), the chip in the back end's chips list | ★★★ `[KB]` | Sonnet 5.5 high | new `py_modules/backend/mods/mod_context_block.py`, `py_modules/backend/answer/transparency_service.py` (this lane alone), tests | nothing |
| F1 | The words: mod vocabulary in the phrase gate (word boundaries: "mod" must not match "model"; the model-policy gate keeps winning), the mod rules line, the Strategy rule, the anti-cheat rule, "which manager?" | ★★ `[ask]` | Sonnet 5.5 high | `py_modules/backend/prompts/ask_topic_instructions.py`, `ollama_prompts.py` (this lane alone), their tests | nothing |
| G | Knowledge cards: a "mods" topic of about fifteen cards in own words marked "Researched, unconfirmed" (what each loader and manager is and where it puts things, SteamOS versus Windows, the prefix, back up first, anti-cheat and online play), the router's words, the drift test | ★★ `[KB]` | Sonnet 5.5 high | `data/kb/compat_patterns.json`, `py_modules/backend/knowledge/compat_topic_router.py`, their tests | nothing |
| F3 | The screen's trigger and store: on a game change the sync hook notes the game and fetches the look; the store; the plugin methods and `mods_rpc.py`; `main.py`'s three methods | ★★ `[platform]` | Sonnet 5.5 high | new `src/features/mods/modsLookStore.ts`, `useModsLookSync.ts`, `src/features/ask/flow/useOllamaGameContextSync.ts`, new `py_modules/backend/mods/mods_rpc.py`, `main.py` (three methods), tests | nothing (the contract, with a fake back end) |
| H | The Mods row and sheet on the Search tab (mock-up B): the row under the find box, the sheet in the tab, the folded groups, the strip, Refresh and Ask about my mods, the installed games in the game row, the D-pad routes written by hand as the tab's others are | ★★★★ `[ui]` | Opus 5.5 medium; the advisor before landing | new `src/features/mods/ModsSheet.tsx`, `ModsRow.tsx`, `src/features/search-tab/SearchTab.tsx`, `SearchGameRow.tsx`, `searchNav.ts`, `useSearchNav.ts`, `searchTabStore.ts`, `searchTabStyles.ts`, tests; `docs/focus-graph.md` (the Search tab section) | nothing (the store, with a fake); lands before H2 |
| H2 | The game-tag door: the icon beside the name when mods were seen, the tag a stop in the strip's row (Left and Right with the paperclip, the microphone and Ask), A jumps to the Search tab with the sheet open | ★★★ `[ui]` `[focus]` | Opus 5.5 medium; the advisor before landing; up a tier after two Deck failures with the measurement | `src/features/ask/bar/AskStripGameTag.tsx`, `MainTabUnifiedAskBar.tsx`, `useMainTabAskBarFocus.ts`, new `src/features/mods/modsIcon.tsx`, tests; `docs/focus-graph.md` (the strip section) | H landed (the jump needs the sheet) |
| F2 | The wiring in the Ask: the look's block stacked with the logs and the cards under one ceiling, the "reading mods" progress phase, the loader-log tails on a troubleshooting question, the game's number from the running game, the question's title or the last game; **the caps only after the gate (§ 15)** | ★★★ `[ask]` | Sonnet 5.5 high | `py_modules/backend/ask/game_ai_request.py`, `py_modules/backend/knowledge/knowledge_base_chips.py` (the stacking function), `py_modules/backend/answer/bonsai_stream_tags.py`, `py_modules/backend/ask/proton_troubleshooting_logs.py`, tests | A, C, D, E landed |
| J | The preset chip when mods were seen; the hidden mod chips reviewed | ★ `[chips]` | Sonnet 5.5 medium | `src/features/preset-carousel/presets.ts`, tests | F3 landed |
| P | The PC command: runs the look on a named folder and prints the summary (for the lanes and for a quick check on any machine) | ★ `[platform]` | Sonnet 5.5 medium | new `scripts/mods/look_game_folder.py` | C, D landed |
| M | Fixtures from the real listings (the PC's Cyberpunk folder and Vortex home; the Deck's after the port; a launcher's list if any) replacing the made-up ones; the recipes flipped to "seen" where the listing confirms them | ★★ `[platform]` | Sonnet 5.5 medium | `tests/fixtures/mods/`, `mod_recipes.py` (the status field only), tests | S run by the maintainer; C, D landed |
| L | Docs: the "bonsAI will not claim" list in the README, the Permissions section of troubleshooting, the guide's Search tab and Main tab lines | ★ docs | the bookkeeper | the three docs | everything landed |
| N | Bugs found during the night with a known cause | ★ to ★★ | Sonnet 5.5 high or medium | as found | as found |

**Wave 1** (fourteen at once): K0, R, S, A, A2, B, C, D, E, F1, G, F3, H, then H2 as soon as H lands. **Wave 2:** F2, J,
P, M. Then the checks (§ 14), then L.

**Where lanes would collide, and how the order avoids it.** Only E touches the transparency file; only F1 the prompt
files; only F2 the Ask request, the stacking function, the stream tags and the Proton reader; only B the permission
files; only H the Search tab files and only H2 the strip files; F3 alone touches the game sync hook and `main.py`
(three methods in one commit; K0 and L never touch code). A, A2, C, D, E each own a new file in the new area, with
`__init__.py` written by A in its first commit and never edited again. The knowledge-card lane G owns the cards file
and the router, as plan 100's lane T did.

**Bugs bumped above Sonnet, and why.** H adds a sheet and a row with their own stops inside the hand-written Search
tab navigation; H2 turns a label into a stop in the strip's row. Both are the kind plan 98 and plan 100 gave to Opus
medium with the advisor's read before landing; the Deck row is the gate, and a lane that fails on the Deck twice
moves up one tier with the measurement in hand.

## 13. Before go

**The maintainer, about twenty minutes, on the PC:**

1. Read §§ 8 to 15; send corrections here, or say "Run plan 101" in a new chat on the PC.
2. **Cyberpunk on the Deck:** copy the game folder from the PC to the Deck or its SD card (Vortex's hard links make the
   folder self-contained), and the game's settings file into the prefix; start it once so the prefix exists. Note the
   library root it landed in.
3. **Which chat holds the Deck.** No other chat may be driving it.
4. **This PC:** bonsAI in Big Picture Mode as it runs today; Ollama running. Say how a new build reaches the PC's
   Decky (the session records it in the log, since the repo does not say).
5. **The usage screen:** read both counters and say them.
6. **Open a new Fable 5.1 high chat in the desktop app, in the repo folder, on `experimental`,** and say: "Run plan 101."

**The session's first acts (the first thirty minutes), in this order:**

0. `git pull origin experimental`; if this plan and its asset files are not at the tip, stop and say so.
1. `git status` (other chats' uncommitted files are theirs: never stage them), the tip hash, the tail of the decisions
   file (this plan's entry is D138; if taken, the next number, said here), `deck_status`. Start the keep-awake script
   unless in the desktop app.
2. The baseline: `python scripts/verify.py --full` on the tip, once, in the shared checkout.
3. Cut the wave 1 copies (`python scripts/worktree.py create p101-<lane> --base experimental`), confirm each sits at the
   tip, and start the wave 1 helpers two to three minutes apart (§ 12), each with the rules file plus its brief, the
   tip hash and its copy's path. Start K0 first and land it first. **A ready helper starts at once; holding one back is
   the maintainer's choice alone** (AGENTS.md).
4. Hand the maintainer lane S's script as soon as it lands, for the PC run; the Deck run waits for the port.
5. Ask the advisor consult 1 (the briefs read for contradictions) while wave 1 builds.

## 14. The checks: the Deck in blocks, the PC in Big Picture Mode

Every check is a row in `docs/testing.md` (K0 writes them, status open) with an evidence file `plan101-<ROW>.json`. The
Deck blocks run through the controller rig by the `deck-driver` helper; the PC block is the maintainer's hands in Big
Picture Mode with the session reading the plugin's log, since the rig does not reach the PC.

| Block | When | What | Needs |
|---|---|---|---|
| M0 | Minute zero, the build already on the Deck | The quick-start smoke pass; the Permissions tab as it is today (the row count before B lands); the Search tab's rows today; the question box's strip today (the game tag is not a stop: P101-STRIP-TODAY) | Cyberpunk copied over and started once |
| M1 | After the wave 1 landings and one deploy | P101-PERM-01 the switch and its confirm box, off by default, the Kids lock; P101-ICON-01 the icon appears beside the game's name once the look ran with Cyberpunk running, and never with the switch off; P101-TAG-STOP-01 the tag is a stop: Left and Right along the strip, A opens the sheet, B returns to the Main tab with the ring on the tag; P101-SHEET-01 the Mods sheet's rows and groups, the strip's text, Refresh, Ask about my mods fills the box; P101-ROW-01 the Search tab row for the running game and the installed games in the game row; the look check on each screen touched (QA-LOOK-01); the free-play sweep | the new build |
| M2 | After the wave 2 landings | P101-ANSWER-01 "Why does the frame rate drop in Kabuki market?" names the crowd mods and the crowd setting (Expert); P101-ANSWER-02 "What mods do I have?" lists the manager, the frameworks and the load order (Speed, short); P101-ANSWER-03 "the game crashes since I added a mod" with Cyberpunk not running reads the loaders' logs and names a manager step; P101-STRATEGY-01 a Strategy question with a gameplay mod present gives the vanilla answer first; P101-ANTICHEAT-01 a mods-and-online question gets the rule and no workaround; P101-CHIP-01 the preset chip; P101-DETAILS-01 the Show details chip; P101-NOGAME-01 a game with no recipe and no manager says where it looked; second rounds | the new build; the Deck's AI |
| W0 (the PC) | After M1, the maintainer's hands | P101-WIN-01 the switch and the icon in Big Picture Mode on the PC; P101-WIN-02 the sheet shows Vortex, 133 mods, the five frameworks, the load order of four, the game on E:; P101-WIN-03 the Kabuki question on the PC's model; the plugin's log for the look's timing and any warning | the build on the PC's Decky |
| MR | The retry round | every row that failed, after its fix | |

The first runbook, M0, is [assets/101-runbook-block-M0.md](assets/101-runbook-block-M0.md); the session writes M1,
M2, W0 and MR from the rows above once the builds exist, in plan 100's shape.

## 15. The reading room: a verify gate, not a number

The numbers in § 6 (a 6 KB mod block, the Proton excerpt raised to 8 KB, one 24 KB ceiling) are **the proposal, not the
call**. Lane F2 builds the block and the stacking against the numbers as constants in one place, then, before changing
any cap, measures three real prompts on the Deck's model (the Kabuki question, the crash question with the logs, a
Strategy question) with the mod block on, and writes the sizes in tokens and the room left to the plan's log and the
chat. **The maintainer confirms the numbers, or gives others, before the caps change.** Until then the Proton cap
stays 4 KB and the mod block 6 KB. The window itself is not touched (16,384 stays; a bigger one is its own experiment).

## 16. Standing rules, paperwork and the reports

- **Standing rules while nobody is watching** (plan 100's, kept): a fix that fails on the Deck twice moves up one model
  tier without asking; a new one- or two-star bug gets one helper round of about an hour; anything blocked gets the
  safest choice at once and is raised in the chat and in § 17 at that moment; never push, publish, merge to main,
  switch branches in the shared folder, type a PIN or password, reload the plugin with a game running. No new helper
  past 75 percent of the five-hour window or 90 percent of the week (D128); read both counters at go and say them.
- **Never a file's contents in the chat or in an evidence file beyond what the look returns;** the snapshot script
  writes names, sizes and dates only; mod names can be adult, so listings go to the private workshop and nowhere else.
- **Paperwork:** every landing's docs sweep by the bookkeeper (the roadmap entry, the three launcher entries, the
  knowledge-base entry, the testing rows with their evidence, the changelog); the session spot-checks every evidence
  file named.
- **The report** (plan 100's § 13 shape): what a player notices; the code work by area with file paths; what popped up
  and how it was handled; what failed and what is left; the numbers (the look's timing on the Deck and the PC, the
  prompt sizes from § 15, the budget reads); a plain developer guide to the new area; and the maintainer's calls
  owed (the reading-room numbers, the push, the release note).
- **The second opinion:** the `advisor` helper at max, at most five consults, each logged in § 17: before go (the briefs
  read for contradictions), before H and H2 land, after a Deck failure on a second try, before the morning report, and
  one spare.

## 17. Progress log and questions

- **2026-10-27, cloud planning chat:** the August study checked against the code; rounds 1 to 4 answered in chat; the
  Cyberpunk setup read from the CyberFixed folder; the mock-up board drawn, published and picked (B, with D, then the
  game-tag door); decision D138 written up as an asset for the bookkeeper.
- **2026-10-28, cloud planning chat:** the plan body (§§ 8 to 16), the helper rules, the briefs and check block M0
  written; three roadmap entries added by the bookkeeper (mod knowledge ★★★; Heroic, Lutris and Windows launchers ★★);
  the Windows fact recorded (bonsAI runs on the maintainer's PC in Big Picture Mode). Pushed to `experimental` through the
  GitHub tool, since the push hook stays shut for this chat.
- **Questions owed to the maintainer at go:** how a new build reaches the PC's Decky; whether Fallout 4 with Mod
  Organizer 2 is still on the Deck; whether the PC has GOG Galaxy or the Epic Games Launcher; the reading-room numbers
  when § 15's measurement is in.
