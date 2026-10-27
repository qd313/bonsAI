# 101 — Deep mod AI hints: the refreshed plan

**Status: DRAFT, 2026-10-27. Planning only; nothing is built. Round 1 questions are open (§ 3).**

Written by a cloud planning chat (Fable 5.1) on `experimental`, from the August study
([workshop plan 12](../../../bonsAI-workshop/planning/12-deep-mod-ai-hints-feasibility.md), 2026-08-04), the
roadmap at tip `efc221b`, and a read of the code as it is today. The study stays where it is; this file is the
plan that replaces its recommendations where they went stale. Plain language on purpose: this file is for the
maintainer first.

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
- The reasons not to scan a game folder are about how mod managers work, not about bonsAI, so they still hold.

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

## 3. Round 1: the direction (answers to be written in here, then into the decisions file as D138)

1. **Look at the disk, or only talk well?** (The study said talk only; your note "the examination of the
   system's mods should work for Windows and SteamOS" reads as wanting the look.)
   - (a) Talk only: a prompt rule plus about 12 knowledge cards. No permission, cannot be wrong.
   - (b) Talk plus a light look: the Workshop count, "is a mod loader present" markers in the game folder, and,
     new since the study, a check of the **mod managers' own homes** (r2modman, Mod Organizer 2, Vortex), which is
     the fix for the study's biggest objection. Everything reported as "seen" or "suspected", never as a list.
   - (c) A full look: read each manager's own lists to name the mods and the load order. Each manager is its own
     format and its own project.
   *Recommendation: (b).*
2. **What "works for Windows" means.**
   - (a) The look-up is written as one layout per platform from day one, with the Windows layout tested on fake
     folders in the Python tests, and the Windows run itself waits for the second-way-to-run decision.
   - (b) This plan also builds the second way to run bonsAI, on Windows.
   - (c) Something else.
   *Recommendation: (a).*
3. **A new permission switch** ("Read game install folders"), off for everyone including existing installs,
   forced off by the Kids lock, with a confirm box in plain words; versus widening "Read game & screenshot
   context". *Recommendation: a new switch; people agreed to log tails and screenshots, not their game folders.*
4. **Real modded machines to check against.** Which games are modded, with which tool, on the Deck and on the
   PC today? (The compat cards say Fallout 4 runs through Mod Organizer 2 and F4SE on the Deck, confirmed
   2026-08-21.) The study's manager paths come from general knowledge; real folders decide the markers.
   *Recommendation: a first lane that only collects folder listings from both machines, before any code.*
5. **Non-Steam games** (Heroic, Lutris, GOG): out of scope for v1? *Recommendation: out; the knowledge base
   already carries the caveat card.*
6. **Strategy mode** stays mod-blind (the study's call: two unknowns compound and the spoiler fences get in the
   way)? *Recommendation: yes, Troubleshooting, Speed and Expert only.*

Rounds 2 (what a player sees) and 3 (lanes and parallel work) follow once round 1 is answered.

## 4. What comes next

The plan body: what a player notices, what bonsAI will and will not do, the lanes (files, not features), the
Deck and PC checks, the roadmap re-shape, and the maintainer's calls as decision D138.
