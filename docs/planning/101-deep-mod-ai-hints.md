# 101 — Deep mod AI hints: the refreshed plan

**Status: DRAFT, 2026-10-27. Planning only; nothing is built. Round 1 answered (§ 3); round 2 open (§ 5).**

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

## 5. Round 2: what a player sees (open)

1. **Where the mod information shows.** (a) Only to the AI, plus one line under Show details naming what was
   read. (b) Also a small chip on the answer ("133 mods seen"). (c) Also a **Mods screen**: opened from a button
   beside the running game's name, listing manager, frameworks and versions, counts by kind, the load order, and
   the mod names in groups, with a Refresh button; the list is too long for a 300-pixel column, so it is its own
   screen like the AI models screen. *Recommendation: (a) and (c) for v1; the chip later.*
2. **When the look runs.** (a) On the first question about the running game, in any mode, then cached for the
   session. (b) Every time the panel opens with a game running. (c) Only on the Mods screen's button.
   *Recommendation: (a), with the screen's Refresh button as the manual way; never on game start by itself.*
3. **How much the AI gets.** The Deck's model reads only the first part of a long prompt (the Proton log
   excerpt is capped at 4 KB for that reason), so 133 names will not fit. (a) A summary only: manager, frameworks
   and versions, counts, the load order, loader-log errors. (b) The summary plus **the mods whose names appear in
   the question** (and their settings when a settings file is known). (c) The full list, cut at the budget.
   *Recommendation: (b).*
4. **Loader logs.** On a troubleshooting question, also read the tails of the mod loaders' own logs (where a mod
   that failed to load is named), inside the same budget as the Proton logs. *Recommendation: yes.*
5. **The game's own settings file** (graphics, crowd density, upscaling), read-only, for games with a recipe.
   It is what made the CyberFixed audit work. *Recommendation: yes, under the same permission switch.*
6. **The words bonsAI uses**, locked: "seen" for what it read; "no mod files found in the places bonsAI checks",
   never "you have no mods"; bonsAI never changes a mod, a setting or a load order; no anti-cheat workarounds, no
   ban predictions; when the manager is unknown, ask which one before giving path steps. *Recommendation: lock.*
7. **Strategy mode shape** (your call 6): the AI is told which gameplay-changing mods are present and asked to
   give the unmodded answer first, then say where a present mod changes it. *Recommendation: yes.*
8. **One preset chip** when mods were found: "What mods do I have, and could any be causing trouble?"
   *Recommendation: yes, one.*
9. **Checking the Windows layout without a Windows bonsAI:** a small command on the PC that runs the same look
   on a game folder and prints the summary, used by the lanes and by you. *Recommendation: yes.*
10. **The Deck port of the Cyberpunk setup.** Vortex's hard links make the game folder self-contained, so copying
    the whole game folder to the Deck (or its SD card) carries every mod; the game settings file goes into the
    prefix by hand. Is there room (the game is large), and is copying the folder acceptable, rather than running
    Vortex under Proton on the Deck? *Recommendation: copy the folder.*

Round 3 (the lanes and what runs in parallel) follows once round 2 is answered.

## 6. What comes next

The plan body: what a player notices, what bonsAI will and will not do, the recipes, the lanes (files, not
features), the Deck and PC checks, the roadmap re-shape, and the maintainer's calls as decision D138.
