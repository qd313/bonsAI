# 49 — Steam Frame and headset features: nine entries and what a PC can test today

Written 2026-09-08 from a chat with the maintainer. Nine features were picked for the roadmap. This
document keeps them in one place, says what a person would notice for each, and answers one question
the maintainer asked for every entry: **would this honestly benefit from testing with SteamVR on a
regular PC before the Frame is out?** The setup for that PC is in
[50-steamvr-pc-setup.md](50-steamvr-pc-setup.md).

Read first: [09-steam-frame-companion-feasibility.md](09-steam-frame-companion-feasibility.md), the
study everything here rests on; [38-toast-answer-lines.md](38-toast-answer-lines.md), the popup that
shows an answer's first lines; [42-read-aloud-feasibility.md](42-read-aloud-feasibility.md), reading
answers aloud; [10-wake-word-listening-feasibility.md](10-wake-word-listening-feasibility.md), the wake
word.

**One sentence:** the Frame is a screen and the PC does the work, so the answer surface that is blocked
on the Deck is open in a headset, and most of what a headset needs from bonsAI is voice in, voice out,
and a good first line.

---

## 1. What is true right now (checked 2026-09-08)

- **The Frame streams games from a PC.** SteamVR runs on that PC, and any floating panel a person sees
  inside the headset is a separate program on that PC too. That is where a headset version of bonsAI
  would run, and it would work on every SteamVR headset, not only the Frame.
- **Nothing of ours can run on the headset itself.** Decky Loader only ships for the Deck's kind of
  chip. Not ours to fix. The one sign to watch for is Decky publishing a build for ARM chips.
  **The maintainer's read (2026-09-13) is more hopeful:** Decky says "Deck only", but in practice it
  runs on anything that runs SteamOS or the Steam gaming session, so a Frame with Decky and the
  bonsAI plugin inside it may well be possible. If it is, the in-headset menu is the same kind of web
  page Decky already hooks into and the plugin would run there as it does on the Deck, with the
  model on the PC. Nobody can check this until the Frame is out. See § 8.
- **Voice in and voice out are one feature with a visor on.** You cannot read a screen. A wake word
  without spoken answers leaves a person in VR with an answer they cannot receive.
- **The study's cheap first step shipped 2026-09-12.** The four thin Frame tips in the knowledge base
  were rewritten (the one mentioning a phone app that does not exist, the one claiming a display bug
  nobody could source, and the one that was really a note to us rather than advice for a person) and
  one README line was added. Still owed: dropping the Frame entry's rating from six stars to two. No
  decision on that re-rate has been recorded.
- **The Deck's popup has never been recorded over a running game.** The popup slice of the in-game
  answer surface waits on that measurement, not on code.
- **The hard part of a headset panel is pointing, not drawing.** The whole plugin is built around
  D-pad focus; VR uses a laser pointer. An answer that is only read, with "next" and "close", sidesteps
  that almost entirely. So the order below starts with read-only surfaces.

## 2. The nine entries

Each has: what a person notices, size, what it waits on, the PC question, and a first step. The
roadmap line for each is the short form of the same text.

### 2.1 Headline first — ★★ `[reply]`

**What a person notices.** Every answer opens with one short sentence that carries the point and gives
nothing away. The reply-ready popup, a spoken answer and any headset card then always have a good
first line to show, instead of whatever the answer happens to begin with.

**Why it is here.** Every small surface on this list shows or speaks the first line. One deliberate
headline improves all of them at once and costs a prompt change and a test. Terse mode, already on the
roadmap, shortens the whole answer; this shapes only the opening and works in every mode.

**Waits on.** Nothing. The spoiler check planned for the thinking display can judge the headline.

**PC with SteamVR before the Frame: no.** The answer test already runs on a PC. No headset involved.

**First step.** Add the instruction, run the answer test, count how often the first sentence stands
alone and how often it leaks a spoiler.

### 2.2 Glance view — ★★ `[ui]`

**What a person notices.** Opening the menu from the popup shows only the answer, in big text, with
the chips, the question box and the tab bar out of the way. Open, read, close, in a couple of seconds.
B returns to the full panel. A Deck sitting on a desk beside a headset is the same case.

**Waits on.** Nothing. Measure on the Deck first, as every Main-tab change does, and it owes the
free-play sweep. Adjustable text size, already on the roadmap, shares the same text-size plumbing.

**PC with SteamVR before the Frame: no.** Deck only.

**First step.** A mockup at true size from the real panel, then the Deck measurement.

### 2.3 Voice follow-ups — ★★ `[voice]`

**What a person notices.** For a few seconds after a spoken answer ends, the mic listens for a handful
of words: again, go on, stop, next tip. Say one and it happens. Say nothing and the mic closes.

**Why no wake word.** The mic opens only in that window, so this does not need the always-on wake
word and none of its battery cost. It is the set of words a person needs when they cannot reach the
Deck or scroll.

**Waits on.** Read answers aloud.

**PC with SteamVR before the Frame: no.** Deck only.

**First step.** Pick the word list and how long the window stays open; test the recognition rate on
the Deck with a game's sound playing.

### 2.4 Spoilers by voice — ★★ `[voice]`

**What a person notices.** When a spoken answer reaches a hidden spoiler it says "there is a spoiler
here, say go on to hear it" and waits. "Go on" unhides and reads it. Anything else skips it. The block
on screen unhides with the spoken one, so the two never disagree.

**Waits on.** Read answers aloud, which already skips a hidden block with a short phrase, and Voice
follow-ups, which supplies the listening window.

**PC with SteamVR before the Frame: no.** Deck only.

### 2.5 Headset mode — ★★★ `[voice]`

**What a person notices.** One switch. On, it turns on the wake word, reads every new answer aloud on
its own, and asks the model to answer for the ear: two or three sentences, no lists, no headings. Made
for a visor on your face and a Deck across the room.

**Waits on.** Read answers aloud and Wake-word listening. Its own work is small; it sits behind the
five-star wake word.

**PC with SteamVR before the Frame: partly.** The switch is Deck-side. A PC with SteamVR and any
headset answers one question the study left open: whether the headset's mic reaches the PC as an
ordinary microphone during a streamed game. If it does, the voice half of the headset story works in
the PC configuration. Without a headset the PC tells us nothing here.

### 2.6 A note pinned in space — ★★★★ `[reply]`

**What a person notices.** In a headset, park the answer on a wall or table beside you. It stays there
while you play, so a checklist becomes a sticky note you glance at between fights.

**Waits on.** The floating panel (2.8): this is the same panel with a different anchor.

**PC with SteamVR before the Frame: yes.** The built-in pretend headset shows a panel fixed in the
room in the desktop VR view, enough to build and place it. A real headset is needed to judge whether
it reads at a glance and whether it gets in the way.

### 2.7 A wrist panel — ★★★★ `[reply]`

**What a person notices.** In a headset, a small panel rides on one controller. Turn your wrist, read
the answer, drop your hand and it is gone. No pointer needed.

**Waits on.** The floating panel (2.8).

**PC with SteamVR before the Frame: yes, with a real headset only.** The pretend headset has no
hands, so a wrist panel cannot be placed or tested on it. Any SteamVR headset with tracked controllers
will do.

### 2.8 The floating panel inside SteamVR — ★★★★★ `[platform]`, first step ★★

**What a person notices.** bonsAI's panel floating over any VR game, opened from the SteamVR menu or
left in view. Drawn by a small program on the PC that runs SteamVR, so it serves every SteamVR headset,
and the Frame comes along for free. The in-game answer surface that is blocked on the Deck is open
here, because SteamVR is built for programs to draw over games.

**What it costs.** It is not a Decky plugin. It is a second way to deliver bonsAI: its own program, its
own way to show the page and to reach the Python side. That is why it is tied to 2.9.

**The cheapest useful shape first.** SteamVR has its own small notification cards, the headset twin
of the Deck's popup. A program that posts one when an answer finishes puts bonsAI's words inside a
headset with almost no interface. Build that first, then the panel.

**PC with SteamVR before the Frame: yes, this is the one.** The whole first step runs today on a PC
with SteamVR and no headset at all. Three things to find out, all from the study:

1. Does a panel show over a running game, and does pointing at it behave like a mouse or like a D-pad?
2. Is the in-VR menu a web page of the same kind the Deck's menu is? Look for the helper process
   SteamVR starts for its dashboard.
3. Can the answer be read at arm's length at the size the panel gets?

The pretend headset answers the first two. The third needs a real one.

**Bench run 2026-09-12.** The pretend headset answers the first question and the second, not pointing
— it has no controllers, so pointing needs a real headset. Full findings:
[plan 53](53-steamvr-bench-findings.md).

### 2.9 One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp — ★★★★★★ `[platform]`

**What it is.** Three roadmap entries are one question. The floating panel (2.8) needs bonsAI to run
outside Decky, which is what the Native QAM shortcut tile research keeps circling. Any model running on
the Frame itself goes through llama.cpp, not Ollama, which is the parked provider test. Does bonsAI
grow a second way to run? Decide it once, not three times.

**Waits on.** The maintainer. The study says: do not reopen llama.cpp because of the Frame; reopen it
for Deck reasons if at all, and the Frame follows.

**PC with SteamVR before the Frame: half.** The panel and leave-Decky half is exactly what the PC test
in 2.8 informs. The llama.cpp half is a Deck question and gains nothing from VR.

## 3. Which entries benefit from a SteamVR PC now

| Entry | Worth testing on a PC with SteamVR now | What it needs | What the PC tells us |
|---|---|---|---|
| Headline first | No | Deck, answer test | Nothing extra |
| Glance view | No | Deck | Nothing extra |
| Voice follow-ups | No | Deck | Nothing extra |
| Spoilers by voice | No | Deck | Nothing extra |
| Headset mode | Partly | PC plus any headset | Whether the headset mic reaches the PC while streaming |
| A note pinned in space | Yes | PC; pretend headset to build, real one to judge | Placement and whether it reads |
| A wrist panel | Yes, real headset only | PC plus tracked controllers | Whether a wrist panel is readable and comfortable |
| The floating panel | **Yes, the main one** | PC, no headset needed for the first step | Panel over a game, pointing model, web-page question |
| One decision for three items | Half | Same PC as the panel | Informs the leave-Decky half only |

Short version: **four entries are Deck-only; the floating panel is the reason to set the PC up; the
two headset panels and headset mode need a real headset on top.** A Quest with Valve's Steam Link app
is the cheapest real headset that behaves like a Frame will, since both stream from the PC.

## 4. Suggested order

1. Headline first and Glance view. Small, Deck-only, and they improve the popup slice already planned.
2. Read answers aloud lands (already planned), then Voice follow-ups, then Spoilers by voice.
3. The PC setup ([50](50-steamvr-pc-setup.md)) and the floating panel's first step, the test to find
   out. Needs no headset. Its findings go to the decision in 2.9.
4. Headset mode, once the wake word ships.
5. The pinned note and the wrist panel, once a panel exists and a headset is in the house.

## 5. Calls the maintainer still owns

See [52-frame-features-second-look.md](52-frame-features-second-look.md) for the deeper look behind
three of these, and the decisions file entry D97 for where they are filed.

1. **The Frame entry's rating.** The study asked for six stars to become two. **Decided 2026-09-12: closed
   as done instead, since the nine entries below now carry all of the remaining work.** See D97 call 1.
2. **The study's first step.** Rewrite the four Frame tips and add the README line, or leave them.
   **Done 2026-09-12.**
3. **The one decision in 2.9.** Whether bonsAI grows a second way to run. Everything above four stars
   on this list waits on it. **Decided 2026-09-12: the PC bench checks how far running the same Python
   side on the PC too really is, before the decision is made; llama.cpp stays closed.** See D97 call 2.
   **Parked 2026-09-13 until the Frame is in the house**, and widened: it is the same question as
   Desktop Mode and phone access, so all three are decided together. See § 8.
4. **Which headset for the tests.** None, a Quest with Steam Link, or wait for the Frame. **Decided
   2026-09-12: none for now; the Frame later.** See D97 call 3.

## 6. The Frame tips — shipped 2026-09-12

The knowledge base has four short Frame tips today, written before the study. The study judged each
one, and proposed seven to replace them. The wording below is ready to go into the tip generator; the
generated tips file is output and is never edited by hand. Topic `steam_frame`, platform `frame`.

**The four tips today, and the study's call on each.**

| Tip today | Call | Why |
|---|---|---|
| "Steam Frame: companion Deck/phone on LAN for bonsAI while HMD in-game." | Keep, fix | There is no phone app. "Phone" comes out. |
| "Frame comfort: reduce locomotion intensity; seated playspace reduces nausea." | Keep | General advice, no claim about the person's body or the headset's readings. |
| "Frame theater mode: wrong display target can mirror desktop instead of HMD." | Replace | Nobody could find a source for this exact failure. A true general line replaces it. |
| "Frame companion UX is research-phase; verify Valve docs before assuming APIs." | Drop | A note to us that leaked into what users read. |

**The seven tips to ship.**

1. Steam Frame with bonsAI: run bonsAI on a Steam Deck on the same home network. There is no bonsAI
   inside the headset.
2. Point bonsAI at the PC that streams your Frame games: the PC address followed by `:11434`. On that
   PC, Ollama must accept connections from other devices and port 11434 must pass the firewall.
3. The PC streaming your game is the best place to run the model. Same machine, no extra hop.
4. Frame comfort: reduce locomotion intensity; a seated playspace reduces nausea.
5. VR framerate misses feel worse than flat-screen ones. Prefer a lower refresh rate that holds over a
   higher one that stutters.
6. Screenshots taken while streaming save on the host PC, not on the Deck running bonsAI.
7. If a flat game opens on the wrong display, check the display or output target before changing
   graphics settings.

**Rules the wording follows, from the study.** Every line reads as general guidance, never as
something bonsAI observed, because bonsAI has no readings from a headset and will not get any. No
health claims: comfort settings, not medical advice. The tips reach an answer only through the normal
knowledge-base search; nothing in the prompt mentions the Frame, so a person with no headset never
sees them.

**What shipping them cost.** ★★. Shipped 2026-09-12: the generator was edited, the tips file
regenerated, the Python tests updated and passing, and the README's one line added saying bonsAI does
not run on the Frame and how to use a Deck beside it. The re-rate in § 5 was not part of this change
and is still owed.

## 7. Not on this list, on purpose

Ideas from the same chat that were not picked: knowing which game the headset is playing from the
Steam profile, VR comfort notes per game in the knowledge base, streaming health questions (folds into
Remote Play diagnostics), a spoken break timer, the large-display layout, screenshot attach by voice
from the PC, small models on the headset's idle chip, and "keep reading in popups". They stay here so
the reason they are absent is on record.

## 8. Calls from 2026-09-13: park it, and decide the door once

From a chat with the maintainer on 2026-09-13, after reading plans 49, 52 and 53 and the D97 entry.
Nothing here is built. The roadmap was being reworked in another session that day, so these calls
are recorded here first and reach the roadmap and the decisions file afterwards.

### 8.1 The "second way to run" decision is parked

The maintainer's words: "Park it." Nothing needs the answer now. There is no headset in the house,
the four things a headset needs first (reading aloud, the wake word, voice follow-ups, headset mode)
are all Deck-side, and the bench already answered the test questions with no decision needed. The
call comes back when the Frame arrives and shows what it can run. Two things to check on day one:

1. Does Decky install and run on it? If it does, bonsAI runs inside the headset as a normal plugin
   with the model on the PC, and most of this section is moot for the Frame.
2. If it does not, the SteamVR panel path in § 2.8 is the way in, and the door question below decides
   where its brain lives.

### 8.2 One door, three customers: Desktop Mode, a phone, and the VR panel

Plan 52 § 5 asked where a VR panel's brain would live, because today the only way anything talks to
bonsAI's Python side is through Decky on the Deck. That same gap was studied before under another
name: **bonsAI in Desktop Mode**, a brainstorm from 2026-08-06 written up in
[audit/desktop-mode-discovery.md](../audit/desktop-mode-discovery.md). Its shape: the plugin's
Python side runs a small web server; a browser on the Deck's desktop, or later a phone on the home
network, opens an Ask box and reads answers, with no game context. It was never filed on the roadmap
and never got a decision number.

The two are one question. The Desktop Mode write-up's "door on the Deck" is option (b) of plan 52
§ 5; its "pull the brain out into a standalone service later" is option (c), the one the bench priced
in plan 53 § 3. So there are three customers for one door:

| Customer | What they need | Where it is written up |
|---|---|---|
| Desktop Mode on the Deck | A browser page on the same machine | [audit/desktop-mode-discovery.md](../audit/desktop-mode-discovery.md) |
| A phone on the home network | The same page, reachable from another device, with pairing | same, "Exposure" row |
| The VR panel on the PC | A brain the PC program can reach | plan 52 § 5, plan 53 § 3 |

**The maintainer's call: park these together so they are decided once.** When the decision is
taken, the options are the three in plan 52 § 5, and the Desktop Mode write-up's open questions
(one shared answer slot that a second client could interrupt, an unchecked PC address field, what the
page holds beyond the Ask box) apply to every customer.

**Revisit decoupling bonsAI from Decky as part of this.** The maintainer asked for this to be on
record here. Two earlier studies touch it and should be read together when the decision comes back:
[11-native-qam-tile-feasibility.md](11-native-qam-tile-feasibility.md) § 2, which looked at a
non-Decky path and judged that leaving the quick menu means leaving the product, and the Desktop Mode
write-up's "Hosting" section, which prices pulling the Python side out into its own service and names
the one real cost: the plugin that works today would then depend on that service being up.

### 8.3 The native tile entry reopens: someone else built it

The six-star **Native QAM shortcut tile** entry was blocked on Decky's maintainers. On 2026-09-13
the maintainer pointed at [decky-quick-tab](https://github.com/moi952/decky-quick-tab), a Decky
plugin that gives every installed plugin its own icon in the quick menu, lets tabs be reordered, and
can hide Steam's own. BSD licence, young (14 stars, 3 commits when checked), not yet tried on a Deck
by us. Two ways to use it, cheapest first:

1. Point people at it in the README and troubleshooting as the way to get a bonsAI icon.
2. Read how it reaches the part of Decky that plan 11 called private, and copy the trick. Fragile in
   the same way Decky itself is: it patches Steam's own menu and breaks when Steam changes.

The entry reopens on the roadmap with step 1 as its first step, once the roadmap is free.

### 8.4 Headline first is paused

The count said build it (plan 53 § 4). The maintainer's call on 2026-09-13: "not yet, I'm skittish
about changing the prompt layout right now." Nothing is written, including the second count of the
answer-first run. The entry stays open at two stars with that note.

### 8.5 Voice follow-ups: three calls and a new feature

On plan 52 § 3.7's open questions:

1. **"Go on" with nothing left to go on to does nothing.** Just the closing tone.
2. **The closing tone stays, quieter than the opening one.** Agreed.
3. **The maintainer approves the two sounds before they ship.** A worker generates them and shows
   them; nothing ships on a worker's own ear.

**A new feature, filed separately and needing its own plan:** the answer ends with an offer, in the
model's own words, such as "want me to explain the mechanic I glossed over?", and saying "go on"
in the listening window sends that as a follow-up question. It is a better "go on" than the planned
one, but it changes the shape of every answer, so it waits on the same comfort with prompt changes
as § 8.4 and is not part of the first Voice follow-ups build.

### 8.6 A bug to file on its own: the clipboard read has no permission check

The Desktop Mode write-up flagged it on 2026-08-06 and it is still true on 2026-09-13: the plugin's
"read the clipboard" call has no capability check and no settings check, unlike the screenshot and
Desktop-note calls beside it. Not a Frame item. The maintainer asked for it to go on the roadmap as a
bug or feature once the roadmap is free.

