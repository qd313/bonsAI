# Plan 101: decision D138, ready to append

**For the bookkeeper (plan 101 lane K0), at go:** append the entry below, word for word, to the end of
`docs/audit/maintainer-decisions-locked.md`, in the house shape of D137. Check first that 138 is still free (another
chat may have taken it); if not, renumber here and in plan 101. Written by the cloud planning chat on 2026-10-27; it
could not push the decisions file itself (the push tool re-sends a whole file, and that file is 200 KB), so the entry
waits here. Everything in it is already in plan 101 §§ 3 and 5; this is the record in the decisions file's own shape.

---

### D138 — PARTLY LOCKED 2026-10-27 (raised 2026-10-27) — Plan 101, Deep mod AI hints: the direction and what a player sees locked; the lanes open

Made by the maintainer on 2026-10-27 in chat, answering [plan 101](../planning/101-deep-mod-ai-hints.md) §§ 3 and 5
as drafted by a cloud planning chat (Fable 5.1) after the August feasibility study (workshop plan 12) was checked
against the code at `efc221b`. The maintainer also shared their own Cyberpunk 2077 mod setup (the CyberFixed
folder); what it showed is plan 101 § 4. Round 3 (the lanes, plan 101 § 7) is still open: the maintainer stepped
away and picks up there. Nothing is built; nothing starts before the full plan is written.

**Round 1, the direction (locked):**

1. **The full look.** bonsAI reads the mod manager's own lists to name the mods and the load order, not only the
   "talk about mods well" floor the study recommended. The study's reason against looking (managers keep mods
   outside the game folder) was found half right: Vortex puts its mods inside the game folder and leaves one
   manifest naming every file's mod; Mod Organizer 2 and r2modman each keep one plain list file per profile. So the
   look is a set of recipes, one per game and one per manager.
2. **Windows and SteamOS.** The look is written as one layout per platform from day one, the Windows layout tested
   on fake folders in the Python tests. Running bonsAI itself on Windows (the second way to run, D99 "not yet") is
   not part of this plan.
3. **A new permission switch** ("Read game install folders"), off for everyone including existing installs,
   forced off by the Kids lock; not a widening of "Read game & screenshot context".
4. **The real modded machine** is the maintainer's Windows PC: Cyberpunk 2077 under Vortex, 133 mods, in a second
   Steam library on another drive. The maintainer will port the setup to the Steam Deck (by copying the game
   folder; "whatever makes the most sense") for the Deck check.
5. **Non-Steam games** (Heroic, Lutris, GOG) are out.
6. **Strategy mode is compatible with mods:** vanilla guidance first, with some flexibility; the maintainer may
   change this once the feature's final shape is known.

**Round 2, what a player sees (locked, "go with your leans" on 1 and 2):**

1. Mod information goes to the AI, shows as one line under Show details, and has its own **Mods screen** (manager,
   frameworks and versions, counts by kind, the load order, the mod names in groups, Refresh), like the AI models
   screen; a chip on the answer comes later.
2. The look runs on the **first question about the running game**, in any mode, then is cached for the session;
   Refresh on the Mods screen is the manual way; never on game start by itself.
3. The AI gets the **summary plus the mods whose names appear in the question**, with their settings when known.
   The maintainer asked for the options to give the feature more room, and whether to keep it to Strategy and
   Expert or add a Troubleshooting mode: answered in plan 101 § 6, called in round 3 (open, below).
4. The **mod loaders' own logs** are read on a troubleshooting question, inside the same budget as the Proton logs.
5. The **game's own settings file** (graphics, crowd density, upscaling) is read, read-only, under the same switch.
6. **The words bonsAI uses, locked:** "seen" for what it read; "no mod files found in the places bonsAI checks",
   never "you have no mods"; bonsAI never changes a mod, a setting or a load order; no anti-cheat workarounds, no
   ban predictions; when the manager is unknown, ask which one before giving path steps.
7. In Strategy mode the AI is told which gameplay-changing mods are present, gives the unmodded answer first, then
   says where a present mod changes it.
8. **One preset chip** when mods were found ("What mods do I have, and could any be causing trouble?").
9. **A PC command** that runs the same look on a game folder and prints the summary, for the lanes and the
   maintainer, since bonsAI does not run on Windows yet.
10. The Deck port: copy the game folder.

**Round 3, the lanes (answered 2026-10-27; two things open):** contract first, yes; the Mods screen opens from
**a Mods row on the Search tab, as a sheet inside the tab** (option B of the mock-up board, liked with D on
2026-10-27; A and C unmarked), with the permission switch "Read game install folders" and its confirm box as drawn
(D); a new back-end area for mods, yes; the work runs as plan 100 did (a new chat on the PC, Fable 5.1 high
orchestrates and lands, Sonnet high lanes, Opus medium for the Mods screen, the advisor at max for at most five
consults); the folder-listing snapshot first, yes (names, sizes and dates only, to the private workshop); one
evening; one roadmap entry. **Still open:** the reading-room numbers (plan 101 § 6: a 6 KB mod block, the Proton
excerpt raised to 8 KB, a 24 KB shared ceiling, no new Ask mode), which the maintainer is not sure of yet, and the
four small calls of plan 101 § 7c.

**Round 4 (the maintainer's notes, 2026-10-27, late; plan 101 § 7d):** the door is **a mods icon on the game tag in
the question box's strip, pressable, jumping to the Mods section of the Search tab** (so the tag becomes a focus stop,
and the look runs when bonsAI sees the game running, not on the first question); the game's number comes from the
running game, else the game the question names, else the last game that ran, with installed games on the Search tab's
game row; mod knowledge in the knowledge base is new scope (LOOT's masterlists are CC0; Nexus never copied), with a
research lane before go; non-Steam launchers are a follow-on; the reading-room numbers are a verify-with-the-maintainer
gate before any cap changes; never an anti-cheat workaround or a ban prediction. **Still open:** round 4's five
questions (plan 101 § 7d, the end), among them how bonsAI runs on the maintainer's Windows machine.

**Round 4 answered 2026-10-28:** the icon sits in the question box's bottom strip on the Main tab beside the game's
name and nowhere else; the game's number comes from the running game, else the game the question names, else the last
game that ran, with installed games on the Search tab's game row; the mod knowledge is its own roadmap entry (★★★,
added 2026-10-28) with plan 101's research lane first; the launchers are their own roadmap entries (★★ each, added
2026-10-28) **and plan 101 builds and tests them**; bonsAI runs on the maintainer's Windows 11 PC inside Steam's Big
Picture Mode, so the Windows side is tested with the real plugin. **Still open at go:** the reading-room numbers (plan
101 § 15, a verify gate: measured first, confirmed by the maintainer before any cap changes).
