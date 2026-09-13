# 40 — New titles from your library (the first tranche)

Written 2026-09-05, after the maintainer said yes to a one-off tranche of new titles for the knowledge
base and asked for the list to come from their own Steam library. Plain language on purpose. Decision
D69 in the decisions file; roadmap entry under Knowledge base and RAG § Next.

**Status 2026-09-06: the cards are written — 105 of them across eleven games (§ 7). The library read, the wiki
checks, the pick and the screen walk are all done. Ten of the eleven games are on the Deck; Fallout: New Vegas
needs installing. Owed: blind test questions from a different session, one corpus release, then the device check.**

---

## 1. What this is

Five to ten games, picked by you from what you actually play, each getting a first pass of six to ten
cards with credit lines. It is a one-off exception to the "no new titles until the catalog" rule, not a
change to it. It buys notes for games you play, more variety in the search test, and the extra data the
blend-weights call may still want.

Already covered, so excluded: Baldur's Gate 3, Cyberpunk 2077, Deep Rock Galactic: Survivor, Fallout 4,
Grand Theft Auto: San Andreas – DE, Hades, Half-Life 2, Left 4 Dead 2, Ocarina of Time, Portal 2, Red
Dead Redemption 2, State of Emergency, The Sims 4.

## 2. Step one — read the library

Two ways to get the list.

**A. A file read over SSH — done 2026-09-05.** The Steam client keeps the answer in three files: one per
installed game with its name, a settings file listing every game the account has opened with playtime
in minutes and the last-played date, and the non-Steam shortcuts file (name, what it launches, the
collection it sits in). The reader is `scripts/probe_deck_steam_library.py`; it prints one line per game
sorted by hours, marks what is installed, and can look up names for games that are owned but not
installed. It reads files only, so it never competes with a session driving the screen. The full list
is in `build/deck-library.json` (not committed; re-run the script to refresh it).

**B. The screen walk — done 2026-09-05, evening, once you said the Deck was free.** The Library was open
with nothing running; the rig walked the Recent Games shelf with the D-pad tile by tile, and the collections
and the hidden list were read off the same page. What it added over A: what is actually on the shelf right
now, the collections you made, and what is hidden. Findings at the end of § 3. Nothing in them changes the
pick in § 6; one title (Fallout: New Vegas) needs installing before its cards can be judged on the Deck.

## 3. What the read found

**Steam games: 90 with any playtime, 37 installed on the internal drive, 27 on the SD card.** By hours:

| Game | Hours | Last played | Installed | Note |
|---|---|---|---|---|
| Counter-Strike 2 | 1560 | 2026-05 | no | multiplayer-only: the versus plan (17), not this tranche |
| Left 4 Dead 2 | 1417 | 2026-09 | yes | in the corpus |
| Team Fortress 2 | 1154 | 2026-08 | no | multiplayer-only |
| PUBG | 1132 | 2023-11 | no | multiplayer-only |
| Counter-Strike: Source | 737 | 2024-05 | no | multiplayer-only |
| Baldur's Gate 3 | 336 | 2026-07 | yes | in the corpus |
| Red Dead Redemption 2 | 316 | 2026-03 | no | in the corpus |
| Fallout 4 | 303 | 2026-08 | yes | in the corpus |
| Cyberpunk 2077 | 279 | 2026-07 | yes | in the corpus |
| **Stardew Valley** | 232 | 2026-01 | yes | candidate; see § 5 for the licence problem |
| **Grand Theft Auto V** (Legacy 230 + Enhanced 38) | 268 | 2026-05 | yes | candidate |
| The Sims 4 | 191 | 2026-05 | yes | in the corpus |
| Deep Rock Galactic: Survivor | 157 | 2026-09 | yes | in the corpus |
| **Grand Theft Auto IV** | 103 | 2025-12 | yes | candidate |
| Hades | 90 | 2026-06 | yes | in the corpus |
| Civilization IV (Warlords 55, Beyond the Sword 15, base 4) | 74 | 2017–2025 | no | candidate, low priority |
| Civilization: Beyond Earth | 50 | 2026-01 | no | candidate, low priority |
| **Brotato** | 31 | 2025-12 | yes | candidate; see § 5 |
| GTA: San Andreas – DE | 29 | 2026-06 | yes | in the corpus |
| **Sifu** | 27 | 2026-09 | yes | candidate |
| Death Stranding Director's Cut | 27 | 2026-06 | no | story-heavy; skip |
| Detroit: Become Human | 24 | 2025-08 | no | story game; skip |
| **Hogwarts Legacy** | 24 | 2025-09 | yes | candidate, weak source |
| Golf With Your Friends | 23 | 2024-06 | no | multiplayer; skip |
| **God of War** | 19 | 2025-12 | yes | candidate |
| GTA III – DE | 17 | 2026-05 | yes | same source as GTA V; could ride along |
| It Takes Two | 15 | 2023-06 | no | co-op story; skip |
| Marvel's Spider-Man Remastered | 14.5 | 2026-06 | yes | maybe |
| Half-Life 2 | 14 | 2026-09 | yes | in the corpus |
| **Hollow Knight** | 13 | 2024-07 | yes | candidate |
| Mirror's Edge | 13 | 2023-09 | no | skip |
| **Fallout: New Vegas** | 13 | 2025-01 | no | candidate, source already cleared |
| Portal 2 | 12 | 2026-08 | yes | in the corpus |
| Call of Juarez Gunslinger | 10 | 2025-11 | yes | skip |
| Skyrim Special Edition | 7 | 2025-05 | no | candidate, source already usable |
| Control, Mass Effect LE, Witcher 3, Batman AA, Borderlands 2 | 4–7 each | 2025 | mixed | maybe later |
| **Black Mesa** | 1.8 | 2025-12 | yes | **candidate, confirmed by you 2026-09-05** |

Below two hours: F.E.A.R., MGS2, Teardown, Dead Space, Titanfall 2, ARC Raiders, Jedi: Fallen Order,
Grim Dawn, Wreckfest, Mortal Kombat X, and about twenty more.

**Non-Steam shortcuts: 121 entries, 108 of them emulated.** The client keeps no hours for these, only a
last-played date, so they are ranked by recency and by what you said: there is good stuff in there.

| Group | What is there | Last played |
|---|---|---|
| Ports | **Ship of Harkinian** (Ocarina, in the corpus), **2 Ship 2 Harkinian** (Majora's Mask) | today; April 2026 |
| Plain shortcuts | **Palworld** (your one favourite tag), **DOOM Eternal** | March 2024; March 2024 |
| Nintendo 64 (44) | Super Mario 64, Mario Kart 64, Mario Party 1–3, Banjo-Kazooie, Banjo-Tooie, Donkey Kong 64, Star Fox 64, GoldenEye 007, Doom 64, Turok 2, Diddy Kong Racing, F-Zero X, Majora's Mask, Ocarina Master Quest, Smash 64, Yoshi's Story, Paperboy, Duke Nukem 64, plus sports and racing titles | mostly never through Steam |
| PlayStation 2 (17) | **Devil May Cry 3**, **Gran Turismo 4**, Burnout 3, Midnight Club 3 and II, NFS Underground 2, Onimusha 2, State of Emergency (in the corpus), Stuntman, The Getaway, Crazy Taxi, SpyHunter, Headhunter, Samurai Champloo, sports | DMC3 Oct 2024; GT4 Feb 2026; SoE Jul 2026 |
| GameCube / Wii (8) | **Super Smash Bros. Melee**, **Paper Mario: The Thousand-Year Door**, **Pikmin 2**, Mario Party 6 and 7, Wind Waker, Twilight Princess, Skyward Sword | not through Steam |
| Switch / Wii U (10) | Breath of the Wild (three ways), Tears of the Kingdom, DLC entries | BotW April 2026; TotK Dec 2023 |
| Others | Crash Bandicoot (PS1), Demolition Man, Road Rash, ToeJam & Earl (Genesis), Dynamite Cop (Dreamcast) | Demolition Man May 2026; Crash Oct 2024 |

### What the screen walk added (2026-09-05, evening, Deck free)

Done with the controller rig once you said the Deck was free. The Library home was open with nothing running.
The ring walked the Recent Games shelf tile by tile (twenty presses right, then twenty back so it ended where
it started), and the collections and the hidden list were read off the same page. Evidence:
`runs/plan40-library-shelf-walk.json`.

**The Recent Games shelf, in order, right now:** Deep Rock Galactic: Survivor, Ship of Harkinian, Sifu,
Half-Life 2, Left 4 Dead 2, Fallout 4, Portal 2, Baldur's Gate 3, State of Emergency, Cyberpunk 2077,
Spider-Man Remastered, Wreckfest, Dead Space, GTA San Andreas (Definitive), Hades, Team Fortress 2, The
Invincible, The Red Strings Club, 7 Days to Die, Demolition Man; then the "View more in your Library" button.
Twenty tiles. None of the nine picked titles is on it: the shelf is this summer, the pick is your back
catalogue. That is fine; the cards are for games you go back to.

**Collections you made:** Favorites (Battlefield 6 Open Beta, Cyberpunk 2077, Deep Rock Galactic: Survivor,
Left 4 Dead 2, Palworld, Stardew Valley, Team Fortress 2) and one empty one called "Switch". The rest are the
ROM manager's: Nintendo 64 (44 games), PlayStation 2 (17), GameCube (6), Switch through Ryujinx (5) and through
Yuzu (4), Genesis (3), Wii (2), PlayStation (1), Dreamcast (1), and an "Emulation" folder holding the 20
emulators themselves. 397 games sit in no collection. **Hidden:** three entries, none a game that matters here
(a friend's pass, a mod manager, Valve's test app).

**The nine, as they sit on the device:**

| Title | On the Deck | Hours | Note |
|---|---|---|---|
| Black Mesa | installed (Steam) | 2 | last opened Dec 2025 |
| Hollow Knight | installed (Steam) | 13 | last opened Jul 2024 |
| Grand Theft Auto V | Enhanced edition installed (Steam) | 38, plus 233 | the 233 are on the Legacy edition, owned but not installed; the cards cover both |
| Grand Theft Auto IV | installed (Steam) | 103 | Complete Edition, last opened Dec 2025 |
| DOOM Eternal | installed (Steam), plus a shortcut copy | under 1 | last opened Feb 2026 |
| Doom 64 | two shortcuts, one in the Nintendo 64 collection | — | rides along with Eternal's source |
| Super Mario 64, Mario Kart 64 | shortcuts, Nintendo 64 collection | — | each appears twice (two ROM-manager runs) |
| Paper Mario: TTYD, Super Smash Bros. Melee, Pikmin 2 | shortcuts, GameCube collection | — | each appears twice |
| **Fallout: New Vegas** | **owned, not installed** | 13 | last opened Jan 2025; **install it before judging its cards on the Deck** |

So ten of the eleven games are on the device today and one needs an install. Nothing in the walk changes the
pick. The doubled shortcuts are harmless for the cards, but the plugin will see two tiles with the same name
for each emulated title, which is worth remembering when a chip or a test row names one. Brotato, if you want
it as a tenth, is installed with 31 hours.

## 4. Which games make good candidates

What makes a title worth cards, before any wiki is checked: you play it; it has repeatable questions
(bosses, enemies, items, builds, areas); it is not multiplayer-only (that is plan 17); and it runs on
the Deck. Pure story games are out: their cards are spoilers by nature. The Red Strings Club, seen in
the run logs, is that shape and is a no; so are Detroit and Death Stranding.

## 5. The wiki check, one per candidate (done 2026-09-05)

Rules: the corpus is one CC BY-SA work, so a source must be CC BY-SA 3.0 or 4.0, or CC BY. NonCommercial,
NoDerivatives, all rights reserved, or GFDL: not usable. Fandom refuses reads from this network, so for
Fandom wikis the licence below is what the archive.org dump declares about itself, and the dump is the
working copy; confirm at the footer through the archive before the first card. Lessons already paid
for: the Hades Fandom wiki is NonCommercial, the Zelda wikis are GFDL, the Baldur's Gate wiki is mixed.

| Game | Wiki, licence | Dump on archive.org | Verdict |
|---|---|---|---|
| **Black Mesa** | Half-Life wiki (Combine OverWiki), CC BY-SA 4.0, already cleared for the corpus | Feb 2025, 6.6 GB | **Usable. Confirmed by you.** |
| **Hollow Knight** | hollowknight.wiki, CC BY-SA 3.0 | May 2026, 12.9 GB; Fandom copy Nov 2023 | **Usable — the best source in this list.** Fresh, huge, bosses / charms / areas, little story |
| **Grand Theft Auto V** and **IV** | GTA Fandom wiki, CC BY-SA 3.0, already cleared for San Andreas | Mar 2022, 7.4 GB | **Usable.** Both games predate the dump. Missions and heists are story, so fence named beats |
| **DOOM Eternal** (and Doom 64) | doomwiki.org, CC BY-SA 4.0 | Dec 2025, 7.3 GB | **Usable.** Demons, weapons, bosses; low story |
| **Palworld** | palworld.wiki.gg, CC BY-SA 4.0 (read live today) | Nov 2023, 100 MB — before the game's launch | **Usable licence, stale dump.** The live wiki answers from here, so pages can be read live with the date recorded, or a fresh dump requested |
| **Super Mario 64, Mario Kart 64, Paper Mario TTYD, Mario Party, Donkey Kong 64, Yoshi's Story** | Super Mario Wiki (mariowiki.com), CC BY-SA 4.0 (read live today) | Jan 2026, 119 GB | **Usable.** One source covers a dozen of your emulated titles |
| **Super Smash Bros. Melee** (and Smash 64) | SmashWiki (ssbwiki.com), CC BY-SA 4.0 (read live today) | Feb 2025 | **Usable.** Characters, matchups, techniques |
| **Devil May Cry 3** | Devil May Cry Fandom wiki, CC BY-SA 3.0 | Feb 2020, 31 MB | **Usable.** The game is from 2005, so the dump is fine |
| **Fallout: New Vegas** | Fallout Fandom wiki, already cleared | in hand | **Usable, cheap.** Low hours |
| **Skyrim SE** | UESP, CC BY-SA 4.0 | Nov 2022, 48 GB | **Usable.** Low hours |
| **Crash Bandicoot** | crashbandicootwiki.com, CC BY-SA 4.0 | Mar 2025 | **Usable.** Small game |
| **Pikmin 2** | Pikipedia, CC BY-SA 4.0 (read live today) | 2014, old but the game is from 2004 | **Usable.** |
| **Turok 2** | Turok Encyclopedia (Fandom), CC BY-SA 3.0 | 2022, 27 MB | Usable, niche |
| **God of War** (2018) | God of War Fandom wiki, CC BY-SA 3.0 | Sep 2024, 8.8 GB | **Maybe.** Good source; heavy story, so much of it fences |
| **Sifu** | Fandom dump CC BY-SA 3.0 from Feb 2022 (launch month, thin); wiki.gg English has no dump | thin | **Maybe.** Needs a fresh dump of the wiki.gg pages first |
| **Civilization IV** | Civilization Fandom wiki; the dump points at the wiki's own copyright page, so read it first | Feb 2020 / 2022 | **Maybe.** Not installed; check the licence page |
| **Gran Turismo 4**, **Banjo-Kazooie**, **NFS Underground 2** | Fandom wikis exist; no main dump found for GT or Banjo; NFS dump Jul 2022 declares no licence | none / unclear | **Maybe.** Request dumps; confirm licences |
| **Hogwarts Legacy** | Harry Potter Fandom dump is from 2020 (before the game); a speedrun wiki (CC BY-SA 4.0, Aug 2026) is narrow | none useful | **No usable source today** |
| **Stardew Valley** | The official wiki declares CC BY-NC-SA (NonCommercial) on its 2019, 2023 and 2025 dumps; the Fandom copy is 4 MB and stale | not usable | **No wiki source.** Your second most played single-player game. Option: cards you write yourself from play, as the Ocarina cards were, credited to nobody and labelled so |
| **Brotato** | brotato.wiki.spellsandguns.com: the machine-readable licence field is empty, but the page footer links **CC BY-SA 4.0** (read 2026-09-05). The archive item lists no licence, so record the footer as the evidence | May 2025, 47 MB | **Usable**, on the footer. Note the empty field in the credit line's provenance |
| **Majora's Mask, Breath of the Wild, Tears of the Kingdom, Wind Waker, Twilight Princess, Skyward Sword** | Both Zelda wikis are GFDL | not usable | **No wiki source.** Same option; the Ocarina cards already went this way |
| Detroit, Death Stranding, The Red Strings Club, It Takes Two | — | — | **No.** Story or co-op story |
| CS2, TF2, PUBG, CS:S, Left 4 Dead, Golf With Your Friends | — | — | **Versus plan (17).** Note the hours: these five are most of what you play |

## 6. The tranche, as picked by you on 2026-09-05

From a recommended eight you dropped Palworld and Devil May Cry 3 and added Super Smash Bros. Melee,
Fallout: New Vegas and Pikmin 2. Nine entries, eleven games:

1. **Black Mesa** — source cleared (the Half-Life wiki already in the corpus).
2. **Hollow Knight** — the best wiki in the list; bosses, charms, areas; little to fence.
3. **Grand Theft Auto V** — your most played single-player game outside the corpus; source cleared.
4. **Grand Theft Auto IV** — same source, a hundred hours.
5. **DOOM Eternal**, with **Doom 64** riding along — one excellent source, two of your titles.
6. **A Mario pack**: Super Mario 64, Mario Kart 64, Paper Mario: The Thousand-Year Door — one source
   covers all three, and it is the strongest of the emulated shelf.
7. **Super Smash Bros. Melee** — SmashWiki; characters, matchups, techniques.
8. **Fallout: New Vegas** — source already in hand from Fallout 4.
9. **Pikmin 2** — Pikipedia; the 2014 dump is fine for a 2004 game.

Dropped: Palworld, Devil May Cry 3. Still available if wanted: **Brotato** (usable after all, on its
footer licence), **Sifu** (after a fresh dump), **Crash Bandicoot**, **God of War**.

Two of your most played games still have no usable wiki: **Stardew Valley** and the **Zelda** titles. If
you want either in, the cards are written from your own play with no source line, the way the Ocarina
cards were. That is allowed and honest; it just earns the weaker trust label.

**On "no licence declared, assume the best":** that logic is flawed, and it is worth saying why once.
When a work states no licence, the law's default is all rights reserved to its authors; silence is not
permission. Our corpus is published as one CC BY-SA work, and we cannot re-licence someone else's text
into it. The publish tool also refuses a card with no licence, so it would have failed the gate anyway.
The right moves are: read the footer and the wiki's copyright page (which is what settled Brotato), ask
the wiki's admins for a statement, or write the cards from your own play and credit nobody. Facts about
a game are not copyrightable; the wiki's wording is.

And the hours say the versus plan matters: Counter-Strike 2, Team Fortress 2, PUBG and Counter-Strike:
Source are about five thousand hours between them. That plan already has Counter-Strike 2 as its stage
four.

## 7. The cards, written 2026-09-06

All eleven games have their notes: **105 cards**, which takes the corpus from 161 cards over 13 games to
266 over 25. Written in one sitting from pages read live off each wiki the day before.

| Title | Cards | Source, licence |
|---|---|---|
| Black Mesa | 11 | Combine OverWiki, CC BY-SA 4.0 |
| Hollow Knight | 13 | hollowknight.wiki, CC BY-SA 3.0 |
| DOOM Eternal | 13 | doomwiki.org, CC BY-SA 4.0 |
| Doom 64 | 5 | doomwiki.org, CC BY-SA 4.0 |
| Grand Theft Auto V | 9 | GTA wiki, CC BY-SA 3.0 |
| Grand Theft Auto IV | 8 | GTA wiki, CC BY-SA 3.0 |
| Fallout: New Vegas | 11 | Fallout wiki, CC BY-SA 3.0 |
| Super Mario 64 | 6 | Super Mario Wiki, CC BY-SA 4.0 |
| Mario Kart 64 | 4 | Super Mario Wiki, CC BY-SA 4.0 |
| Paper Mario: The Thousand-Year Door | 6 | Super Mario Wiki, CC BY-SA 4.0 |
| Super Smash Bros. Melee | 9 | SmashWiki, CC BY-SA 4.0 |
| Pikmin 2 | 10 | Pikipedia, CC BY-SA 4.0 |

Every card names the page it came from, the licence that page declares, and the day it was read, so the
credit line under a reply is right without anyone fixing it later. Roughly a third of the cards are how the
game works, a quarter are bosses, and the rest are enemies, items and places. Each title opens with a
"starting out" card. Card lengths run 400 to 880 characters, in the same band as the cards already shipping.

**Two things came out of the writing.** Fandom's wikis were readable after all: only the in-IDE fetcher gets
refused, so a new tool reads pages live and records the revision and date, which is fresher than an
archive.org dump and needs no download. And Fandom character pages hide their whole body inside a tab box
that the first version of the reader skipped, which is why the Fallout companions came back empty until it
was fixed.

**Rules kept:**

- **Cards in one session, blind test questions in another.** Whoever writes a card can never write its
  blind question; the test method depends on it. **This session wrote the cards, so it must not write the
  questions.**
- **Every card carries its source and licence** the day it is written, never fixed later; the publish
  tool refuses a card without them.
- Story is left out where it would spoil: Hollow Knight's two endgame bosses have no cards, GTA's mission
  plots are named only where they gate a mechanic, and the Fallout factions and endings are absent.
- **One corpus release for the tranche**, bundled with the other changes that need a rebuild.
- The lock on new titles stays for anything beyond this tranche.

**Still owed:** blind test questions from a session that has not read these cards, added to the retrieval and
answer fixtures; then one corpus release; then the device check, row **KB-TRANCHE-01**.

## 8. Checklist

- ✅ Step one A: library read over SSH, 2026-09-05 (90 Steam games with playtime, 121 shortcuts).
- ✅ Step three: wiki check per candidate (§ 5).
- ✅ Step one B: the screen walk, 2026-09-05 evening, once the Deck was free (end of § 3). Ten of eleven on the device;
  New Vegas needs installing.
- ✅ Maintainer picked the tranche, 2026-09-05 (§ 6); recorded in the decisions file under D69.
- ✅ Cards written, 2026-09-06: 105 across eleven games (§ 7).
- ⬜ Blind questions written in a different session; corpus release; device check (**KB-TRANCHE-01**).

## Sources

- [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md) — D69, D38, D68; the licence lessons under D19b and D20
- [15-corpus-licensing-attribution-plan.md](15-corpus-licensing-attribution-plan.md) — the licence gate and the wikis checked so far
- [17-kb-online-versus-strategy-content.md](17-kb-online-versus-strategy-content.md) — the source rule for multiplayer content
- [37-rag-status-report.md](37-rag-status-report.md) — the zoomed-out picture
- `scripts/probe_deck_steam_library.py` — the file-read path; `build/deck-library.json` — today's read
- `scripts/fetch_wiki_live_pages.py` — reading pages live off a wiki with the revision, date and licence (used for every card here)
- `scripts/fetch_wiki_dump_pages.py` — pulling pages and the declared licence out of an archive.org dump
- archive.org WikiTeam search results and the wikis' own licence declarations, read 2026-09-05
