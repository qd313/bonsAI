# 101 — Deep mod AI hints: the refreshed plan

**Status: DRAFT, 2026-10-27: the Mods screen is picked (B, § 7a); the full plan body is next. Planning only; nothing
is built.** Rounds 1 and 2 are answered (§§ 3, 5) and written up as decision D138 for the bookkeeper to append at go
([assets/101-decision-d138.md](assets/101-decision-d138.md)); round 3 is answered (§ 7a) but for the reading-room
numbers (§ 6) and the four small calls in § 7c.

**Where to pick up.** Answer § 7c's calls (by number; "defaults" takes every recommendation) and § 6's numbers, or
leave them to a measurement. Then the planning chat writes the full plan: the contract, what bonsAI will and will not
do, the recipes, the lanes with their briefs, the helper rules, the Deck runbook. Nothing is started before that.

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

## 8. What comes next

Once § 7c is answered: the plan body in full (what a player notices, what bonsAI will and will not do, the
contract, the recipes, the lanes with their briefs, the Deck and PC checks, the roadmap re-shape), the helper rules,
the briefs and the Deck runbook as asset files, and the maintainer's calls as decision D138.
