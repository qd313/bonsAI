# 53 — SteamVR bench findings: a panel over a VR scene, and the plugin's Python side on a PC

Run 2026-09-12 on the maintainer's Windows PC (Radeon RX 9070 XT, Steam signed in, no headset), after the
maintainer's "go on the steamvr". The setup is [50-steamvr-pc-setup.md](50-steamvr-pc-setup.md); the
questions are from [49-steam-frame-features.md](49-steam-frame-features.md) § 2.8 and
[52-frame-features-second-look.md](52-frame-features-second-look.md) § 5 and § 7. The calls this feeds
are D97 in the decisions file. Everything below was done by a program, not by hand, and the three
programs are kept in `scripts/steamvr_bench/` so the next session can run them again.

**One sentence:** a bonsAI-style panel shows inside the headset view over a running VR scene with no
plugin code at all, SteamVR's own menu is a web page, the plugin's Python side already starts and
answers on this PC outside Decky, and the one thing the pretend headset cannot answer is pointing.

---

## 1. What was set up, and how long it took

| Step | Result |
|---|---|
| SteamVR install | 2.2 GB, done in about 30 seconds on this connection |
| Desktop+ install | Done in seconds; not exercised, see § 2.3 |
| The pretend headset | The personal settings file in Steam's `config` folder worked on the first start. The log says SteamVR is "using existing HMD null". Plan 50's two-file edit was never needed; it stays as the fallback |
| Room setup | SteamVR's first-run room setup appeared and was clicked through on the PC |
| Python helper for VR | `pip install openvr` (2.12), used by all three bench programs |
| Ollama | Already on this PC, already open to other devices, reachable at the first try |

Also seen in the install: SteamVR ships drivers named for the Steam Frame and its controller. Valve's
own support for the headset is in this build already.

## 2. The five questions

### 2.1 Does a panel show over a running scene? Yes.

A 60 cm wide panel with a sample bonsAI answer on it, placed 1.2 m ahead, showed in the headset view
over SteamVR's welcome scene, in both eyes, and the text read clearly at that distance. Picture:
[53-panel-in-headset-2026-09-12.jpg](assets/53-panel-in-headset-2026-09-12.jpg). Its top is cut off in
the picture only because the pretend headset's eye height is low and the panel was placed high. This is
the whole of plan 49's five-star idea, drawn by an 80-line program through SteamVR's official panel door,
with nothing loaded into any game.

### 2.2 Is the in-VR menu a web page? Yes.

With SteamVR running, eight copies of its browser helper were running beside it. The SteamVR menu is
drawn the same way the Deck's menu is. This was expected and is now confirmed on this machine.

### 2.3 How is a panel pointed at? Not answerable on the pretend headset.

Plan 50 said "in the pretend headset it is your mouse". That is wrong. Sweeping and clicking the mouse
over the panel in the headset mirror window sent the panel no pointer events at all, across two runs.
The pretend headset has no controllers, and SteamVR only points at panels with a controller's laser or
a real hand. What SteamVR's panel door promises is mouse-shaped events: move, button down, button up,
scroll, delivered to the panel program. Seeing them needs a real headset with tracked controllers. So
the pointing question, which plan 49 called the hard part, stays open until a headset is in the house,
and Desktop+ could not be tried for the same reason.

### 2.4 Do SteamVR's small notification cards still work? Accepted, not seen.

The call to post a card came back with SteamVR's "OK" code, twice, in two styles. Whether the card
was drawn could not be confirmed: the mirror window had gone dark by the time it was grabbed. Treat
this as "SteamVR still takes the call" and no more. The Python helper raises the OK code as if it were
an error, which cost two runs; the kept program notes it.

### 2.5 Can a panel take typing? Untested.

Needs a pointer first (2.3). Nothing to report.

## 3. The plugin's Python side on this PC: it runs

This is the check plan 52 § 5 asked for, to price the "second way to run" decision.

The answer test already starts the plugin's Python side on this PC with a stand-in for Decky of about
fifty lines: a fake settings folder, a fake log folder, a logger. Using that same stand-in, a probe
started the plugin the way Decky does, called nine of its methods the way the frontend does, and shut
it down:

| Call | Result on the PC |
|---|---|
| Startup | Ran |
| Load settings | Returned the full settings |
| The Deck's network address | Returned this PC's address |
| Test the Ollama connection | Reachable, version 0.33.3, with the models on this PC listed |
| List chats | Empty list, as on a fresh install |
| Intent packs | The bundled packs, 22 entries in the first |
| Knowledge base status | Idle, as on a fresh install |
| Recent screenshots | A clean "media access is off" answer |
| Voice engine status | Not installed, as on a fresh install |
| Shutdown | Ran |

Nothing failed. The parts that would need a PC-shaped answer instead of a Deck-shaped one are the
ones that were quietly empty here: which game is running, the sound system for reading aloud, the
Steam screenshot folder. Those are edges, not the body.

**What this means for D97 call 2.** Option (c), the same Python code running on the PC as well, is
close to true today. The cost is: a small starter program that stands in for Decky on the PC, a way
for the panel to call the Python side on the same machine, and PC-shaped answers for the three edges
above. The whole plugin brain does not have to be written twice, and the Deck does not have to be
awake. This is now a priced decision, not a six-star guess.

## 4. The Headline first count, run the same morning

The maintainer's call was to count before building. The count used the newest saved run of the
answer test in the normal answer style (2026-09-07, the Deck's model), first ten answers:

| | Out of ten |
|---|---|
| First sentences that stand on their own | **2** |
| First sentences that give away something hidden | **0** |

Eight of ten open by repeating the question, defining a term, or explaining why something is hard,
and only then get to the tip. So the count is poor and, by the rule in plan 52 § 2, **Headline first
gets built** after all. Two things to do first: a run from the same evening already tried an
answer-first opening on purpose; count that run the same way before writing a new prompt, since it may
already be the change. And keep the rule that no first sentence may leak, which today's answers meet.
The table with every sentence is in
[53-headline-count-2026-09-12.md](assets/53-headline-count-2026-09-12.md). The maintainer read this
count on 2026-09-12 and said not yet (D99); the build waits for its own go.

## 5. Corrections to earlier plans

- Plan 50 § 3: the pretend headset does not take mouse input on panels. Only "does it show" and "how
  does it look" are testable without controllers.
- Plan 50 § 8 question 3: unchanged, still needs a real headset.
- Plan 49 § 2.8: "the pretend headset answers the first two" was half right. It answers the first and
  the web-page question; it does not answer pointing.

## 6. What is left, and what it needs

| Open | Needs |
|---|---|
| Pointing and typing at a panel | Any SteamVR headset with tracked controllers. No purchase now (D97 call 3); the Frame when it comes |
| Whether the notification card is drawn | The same, or a second pass with the mirror window kept awake |
| The panel program itself | The "second way to run" decision, now priced in § 3 |
| The second way to run | The maintainer said not yet on 2026-09-12 (D99); the price stands in § 3 |

## 7. Running it again

SteamVR and Desktop+ stay installed. The pretend headset stays switched on in Steam's personal
settings file; to use a real headset later, remove the `forcedDriver` line there. The three programs
are in `scripts/steamvr_bench/`; each has its run line at the top. SteamVR was shut down at the end
of the bench.
