# Plan 67 — Stand-in Decks: testing on several virtual Decks at once

**Status:** written 2026-09-23 from a planning chat with the maintainer. Nothing built, nothing installed,
nothing run. Phase 0 is next, and it starts only when the maintainer says so.
**Roadmap entry:** **Stand-in Decks on the maintainer's PC** — ★★★★★ `[QA]` `[platform]`, under Features.
**Related:** [plan 21](21-ai-owned-testing-program.md), the wider AI-owned testing program, and
[plan 19](19-controller-macro-test-rig.md), the controller test rig. This plan adds more machines to
test on. It does not replace either.
**Order, set 2026-09-24:** the maintainer made finishing the controller test rig priority 1 (see the top of
[plan 19](19-controller-macro-test-rig.md)). The rig is already built. What is left there makes each
machine's testing trustworthy without a person watching; this plan then multiplies machines. So this plan
comes after it.
**Stars and models:** ★★★★★ because it spans hardware, a second operating system, a change to the Deck
test tools in their own project, and a new way of running sessions. Phase 0 is mostly the maintainer's
hands plus one Opus xhigh session. Which model fills each role later is an open question (section 11).

---

## 1. What this gets you

Today every test that needs a Deck waits for the one Deck. One session tests while every other session
queues. Bug and feature work stalls behind it too, because nothing counts as finished until it is tried
on the device.

With this plan, the maintainer's PC also runs up to **four stand-in Decks**. These are virtual machines
running Bazzite, set up to look like a Deck as far as bonsAI can tell. Tests that don't need the real
hardware run on the stand-ins, several at once. The real Deck is kept for what only it can prove.

## 2. Who does what

Names agreed 2026-09-23:

| Name | What it is | Does |
|---|---|---|
| **Test lead** | One AI session at the top | Splits the work across machines, keeps versions matched, merges everything at the end of a session |
| **Rig lead** | One AI session per machine, the real Deck included | Runs its machine's share of the work and hands failures up |
| **Tester** | Helpers under a rig lead | Run the test rows they are handed |
| **Stand-in** | A virtual Deck on the maintainer's PC | What a rig lead drives when it isn't driving the real Deck |
| **The Deck** | The real Steam Deck | The final word on anything about focus, layout or hardware |

**One rig lead per machine.** The test lead can run a session in either of two ways, picked per
session:

- **Split one build:** every machine tests the same build, each takes a share of the rows, and the
  session finishes sooner.
- **Separate work:** each rig lead has its own bug or feature work, tests it on its own stand-in, and
  the test lead merges at the end.

## 3. What is decided

| Question | Answer (2026-09-23) |
|---|---|
| Steam accounts | One account. Every stand-in runs in Steam's **offline mode**. Only one machine is ever signed in online. |
| Signing a stand-in in the first time | Allowed. It takes Steam from the Deck for about five minutes. **The maintainer gets a warning before it starts.** |
| Which system on the stand-ins | Bazzite. Heavier is fine: it gives a worst-case speed picture. |
| How close to a Deck | As close as possible, at least as far as bonsAI can tell. |
| Where Ollama runs | One shared Ollama on the maintainer's PC answers for every stand-in, using the setup already built for "Ollama on a LAN PC". Tests of **installing** Ollama or pulling a model run inside a stand-in with a small model, slowly, on the processor. That is enough to prove the install flow works. |
| Route | Route A first (section 6). If it fails, Route B, and **a dual boot is acceptable**. |
| How many stand-ins | Aim for **four, tight**. Drop to three if four don't fit. The maintainer brings Windows itself down to about 5 GB of memory. |
| Games on stand-ins | Not in version one. Tests that need a game running stay on the Deck at first. |
| Session style | Both styles above are supported. |
| Clean or used stand-ins | Both. Some tests start from a saved clean copy, others run on one deliberately left messy, for long-use testing. How to split them is still open (section 11). |
| Usage cost | Not treated as a blocker. The maintainer's sense is that a whole day of single-Deck testing uses about a third of the allowance. Look at past test sessions later (section 12). |
| Changes to the Deck test tools | Belong in the Deck test tools' own project, as a roadmap item there (section 13). |

## 4. The maintainer's PC, as measured 2026-09-23

| What | Found | What it means |
|---|---|---|
| Processor | Intel i7-12700K: 8 fast cores + 4 efficiency cores, 20 threads | Enough for about four stand-ins next to normal work. With no graphics card drawing their screens, the processor runs out before memory does. |
| Memory | 32 GB in two of four slots, a Corsair 3600 kit | A second matching pair would make 64 GB. Not needed for four tight. |
| Memory speed | **Windows reports 2133, not 3600** | The maintainer believes XMP is on. A separate session checks this (appendix A). If it really is 2133, turning the profile on is free speed for everything. |
| Virtualization | **Reported off in the BIOS** | Hard blocker. No virtual machine starts until it is on. Two-minute fix in the BIOS. |
| Windows | 11 Home. No Hyper-V, no WSL | Use VMware Workstation or VirtualBox. Both are free and work on Home. |
| Disks | 418 GB free on E:, 161 on C:, 7 on D: | E: fits four stand-ins at about 50–60 GB each. |
| Ollama | Installed on Windows | Fits the shared-Ollama plan. |
| Graphics card | RX 9070 XT with 16 GB of its own memory | Holds Ollama's models, so they don't count against system memory. |
| Also running | NordVPN | Could stop the stand-ins reaching Ollama on the PC. Checked in appendix A. |

**Memory budget for four tight:** about 5 GB for Windows, the editor, Claude Code and a few browser tabs,
leaving about 27 GB. Four stand-ins at about 6 GB each fit with a little room. At 4 GB each there is room
to spare. The real number comes from Phase 0.

## 5. The Steam account plan

Steam limits an account to one **online** session. A machine in offline mode never talks to Steam's
servers, so it doesn't count against that. The catches, and how this plan handles them:

- **Each stand-in has to sign in online once**, save the password, then switch to offline. It cannot start
  offline from nothing. The maintainer gets a warning first, and the Deck is idle during the few minutes
  it takes.
- **Offline stand-ins can't install or update games.** Version one runs no games on stand-ins, so this
  only matters later.
- **Copying a finished stand-in may break its offline sign-in**, because Steam may see the copy as new
  hardware. Phase 0 tests this. If copies break, each stand-in signs in once on its own.
- **Some bonsAI tests need Steam online**, for example anything using the Recent Games row or store pages.
  Those stay on the Deck.
- **No known ban risk.** Offline copies never contact Steam, and anti-cheat only matters in online play.

## 6. The graphics card, and the two routes

The graphics card can't be shared between virtual machines on this PC. Consumer AMD cards can't be split
between machines, and handing the whole card to one virtual machine needs Linux running the PC and only
serves one machine at a time.

**bonsAI doesn't need the graphics card.** It is a menu inside Steam's controller screen, and that screen
is essentially a web page, which the processor can draw on its own. Games are what need the card. So:

- **Route A: keep Windows.** Stand-ins draw their screens with the processor, and the PC runs Ollama for
  all of them. Least disruption. **The risk:** Bazzite's game-mode screen expects a graphics card, and
  may crawl or refuse to start without one. Phase 0 finds out.
- **Route B: Linux on the PC, as a dual boot.** Linux goes on its own disk, and Windows stays untouched.
  Under Linux the stand-ins can share the 9070 XT, so screens and even small games draw properly. That
  would also lift the "no games on stand-ins" limit later. Bazzite is a fine choice for the PC itself.
  Official SteamOS on a desktop is still hit-and-miss. The cost is booting into Linux on test days, with
  the editor and Claude Code set up there too.

## 7. Phase 0: can one stand-in work at all?

Setup and measuring only. No bonsAI code changes.

1. **Hardware check.** A separate session runs the prompt in appendix A and hands back a BIOS checklist
   and a Windows checklist.
2. **BIOS changes, by the maintainer.** Virtualization on. The memory profile on, if it turned out to be
   off. Anything else the checklist marks "needed".
3. **Install a virtual machine program** (VMware Workstation or VirtualBox) and set up **one** Bazzite
   stand-in: the Deck edition, which boots into game mode, at the Deck's 1280 × 800 screen size.
4. **Steam sign-in, with a warning to the maintainer first.** Sign in once, save the password, switch to
   offline. Hand Steam back to the Deck.
5. **Install Decky and bonsAI** on the stand-in the same way as on the Deck.
6. **Measure:**
   - how game mode runs: whether it starts at all, how fast the menus open, how fast the D-pad responds
   - how much memory the stand-in needs, idle and with bonsAI open
   - whether it reaches Ollama on the PC
   - whether a saved copy of it keeps its offline sign-in
7. **Pass or fail.** Phase 0 **passes** when bonsAI opens in the stand-in's Quick Access Menu, answers a
   question through Ollama on the PC, and a D-pad walk through the Main tab moves the ring the way it
   does on the Deck. If game mode won't run acceptably on Route A, **stop**, write down why, and plan
   Route B.

   **Who presses the buttons in Phase 0:** the Deck test tools can't press a stand-in's buttons yet.
   The bridge board belongs to the real Deck, and the virtual gamepad is Phase 1 work (section 13). So
   Phase 0's D-pad walk uses an ordinary USB or Bluetooth controller handed to the virtual machine, by
   the maintainer's hand. Reading where the ring lands can already work through Steam's page inspector,
   the same way it does on the Deck.

## 8. Phase 1: one stand-in, one rig lead

1. Point the Deck test tools at the stand-in. How depends on section 13. It may mean one copy of the tools
   per machine.
2. Re-run a handful of test rows the real Deck already **passed**, and a few it **failed**.
3. Compare. Where the stand-in and the Deck agree, that kind of test can move off the Deck. Where they
   disagree, write down why. This answers "which tests can trust a stand-in" with evidence, not a guess.

## 9. Phase 2: four stand-ins, one test lead

1. Bring up the other three stand-ins, from saved copies if Phase 0 showed copies keep their sign-in.
2. **Saved clean states:** each stand-in keeps a clean copy to jump back to in seconds, which the real Deck
   can't do. Some stand-ins are left deliberately messy for long-use testing.
3. **Versions matched:** the test lead checks Steam, Decky and bonsAI versions across all machines before
   a session starts.
4. **First real session:** the test lead runs one session in each style (section 2) and records how long
   it took compared with the Deck alone.

## 10. What stays on the real Deck

- Anything needing a game running (version one).
- Battery, power and performance settings.
- The built-in screen versus an external monitor.
- How the buttons physically feel, and the controller rig from plan 19.
- Speed of the Deck's **own** Ollama: timing, the time limit, "the model isn't loaded yet".
- Anything needing Steam online.
- The last check on a `[focus]` or `[layout]` change, until Phase 1 shows stand-ins agree with the Deck
  on that kind of test.

## 11. Open questions

| Question | When it gets answered |
|---|---|
| What should a stand-in pretend about being a Deck? Four things differ unless faked: it doesn't report itself as a Steam Deck (this affects the UI size "auto" setting), it has no battery or power controls, its user folder isn't named "deck", and its controller shows up as a different kind. For each: fake it, or mark those tests "Deck only"? | After Phase 0 shows which ones bonsAI actually notices |
| Does the real Deck only ever get the merged result, or can a rig lead borrow it mid-session? | Before the first Phase 2 session |
| Which tests start from a clean copy and which run on a messy one? | During Phase 1 |
| Which model and effort for the test lead, the rig leads and the testers? The maintainer's starting guess: Fable or Opus at extra-high or max for the test lead, Opus medium to high for rig leads, Sonnet medium to high for testers. **Note:** the current rule says the AI that writes test rows and reads failures should be Opus at extra-high, so that part may belong to the test lead. | Research with the latest model data, before Phase 2 |
| Would the maintainer buy a second pair of the same memory, for 64 GB? | Only if four stand-ins don't fit |

## 12. Research to do later

- **Which tests can move.** Sort the current test rows into "stand-in is fine", "Deck only" and "not sure",
  and check the "not sure" ones against Phase 1's results.
- **Ollama-speed tests in their own group.** Tests about the Deck's own Ollama timing get their own set,
  so they never run on a stand-in by mistake.
- **Games on stand-ins.** Whether a tiny 2D game, or a fake game shortcut, is enough for bonsAI to see a
  game running. Route B would change this answer.
- **Usage cost.** How much of the allowance past single-Deck test sessions used per hour, and what four at
  once would use.
- **The answer cache.** Two stand-ins asking the same question through one shared Ollama may affect each
  other's results. Find out whether a test lead needs to vary the questions.

## 13. The part that belongs in the Deck test tools' project

The Deck test tools are a separate project, and that project's code is the source of truth. Teaching them
to drive several machines is its work, not bonsAI's.

**This was planned there once already.** Its plan 08, *Parallel VM QA farm for bonsAI*, was written and
shelved on 2026-09-05. Back then the maintainer ruled out any Steam sign-in on a virtual machine, and also
required a virtual machine to pass everything a Deck passes. Those two rules together blocked it. Both were
relaxed on 2026-09-23 (section 3), so on 2026-09-23 it was brought back as **Drive several Decks at once:
stand-in Decks for bonsAI**, under that project's planned features. A new section 7 in its plan 08 records
what changed.

What that project has to build:
- a list of machines with their addresses, with every call naming which one it drives
- a way to tell a stand-in from the real Deck
- **a virtual gamepad inside each stand-in**, because the one bridge board that presses the Deck's buttons
  can only be plugged into one machine
- its already-planned "one driver at a time" lock, per machine

Until that lands, Phase 1 may run one copy of the tools per stand-in as a stopgap. Its plan 08 also holds a
first sketch of which model does which job, which feeds the open question in section 11.

---

## Appendix A: the hardware check prompt

For the maintainer to hand to a separate Claude session on the PC. Written 2026-09-23.

```text
You are checking a Windows 11 Home desktop to see how well it can run 4 virtual machines at once.
Investigate and report. Do not change anything yourself.

## Background
- The owner wants to run 4 virtual machines on this PC. Each one runs Bazzite (a gaming Linux
  system) and acts as a stand-in for a Steam Deck in automated testing of a Steam Deck plugin.
- The virtual machines will use VMware Workstation or VirtualBox (Windows Home has no Hyper-V
  manager). Their screens will be drawn by the processor, not the graphics card.
- Ollama, already installed on this PC, will answer AI requests from all 4 virtual machines over
  the network. The graphics card is an RX 9070 XT with 16 GB of its own memory.
- Target: 4 virtual machines at about 4–6 GB of memory each. The owner will get Windows itself
  down to about 5 GB.
- Hardware: Intel i7-12700K (8 fast cores + 4 efficiency cores, 20 threads). ASUS TUF GAMING
  Z690-PLUS WIFI D4. 32 GB DDR4 in 2 of 4 slots (Corsair CMK32GX4M2D3600C18, a 3600 kit).
  Three Crucial NVMe drives. NordVPN is installed.

## Two things to confirm first
1. Memory speed. Windows reported the memory at 2133 (configured and rated both), even though
   the kit is rated 3600. The owner believes XMP is already on. Find the truth using more than
   one source: Task Manager's Performance → Memory "Speed" field, the Win32_PhysicalMemory
   fields, and CPU-Z or HWiNFO if already installed (ask before installing either). If it really
   is 2133, say so plainly. If Windows is misreporting, say that instead, and show the evidence.
2. Virtualization. systeminfo said "Virtualization Enabled In Firmware: No". Confirm this, and
   check whether any Windows feature that would conflict with or slow VMware/VirtualBox is on:
   Memory Integrity / Core Isolation, Virtual Machine Platform, Windows Hypervisor Platform,
   Windows Sandbox.

## Then look for anything else that would help 4 virtual machines run well
- BIOS version and date. Is there a newer one for this board that improves DDR4 memory
  stability or CPU scheduling? Report it only; don't flash anything.
- Windows power plan, and anything that parks cores or pushes background work onto the
  efficiency cores. Virtual machines landing on efficiency cores is a known slowdown on this
  chip.
- Memory: page file size and location, memory compression, and startup apps and background
  services that could go to reach a 5 GB Windows baseline. List the biggest ones with their
  sizes.
- Disks: which physical drive is E: (418 GB free, where the virtual machines will probably
  live)? Is it the fastest one? Does anything look off, such as health, TRIM, or a nearly full
  D: drive at 7 GB free?
- Network: can a virtual machine reach Ollama on this PC? Check what address Ollama listens on
  (OLLAMA_HOST), the Windows firewall rule for port 11434, and whether NordVPN (its LAN
  blocking, kill switch, or virtual adapters) would stop a virtual machine on bridged or NAT
  networking from reaching the PC.
- Ollama queuing: current values of OLLAMA_NUM_PARALLEL, OLLAMA_MAX_LOADED_MODELS and
  OLLAMA_KEEP_ALIVE, and what you'd suggest for 4 clients sharing one card with 16 GB.
- Graphics driver version, only as far as it affects Ollama on this card.

## Rules
- Read-only. Don't change settings, registry, services or drivers, and don't reboot. Ask before
  installing any tool.
- Don't touch the BonsAI repo or the Steam Deck. Another session is using the Deck right now.
- Write for someone who is not a hardware expert. Short, plain sentences. Explain every term the
  first time you use it.

## What to hand back
1. A short verdict: memory speed (real number, how you know), virtualization (on or off).
2. A BIOS checklist for this exact board: each setting, the menu path to find it, what to set it
   to, and why. At minimum: Intel Virtualization Technology, VT-d, the XMP/DOCP memory profile,
   plus anything else you found. Mark each as "needed" or "nice to have".
3. A Windows checklist: the same format, for settings the owner can change themselves.
4. A memory budget: what Windows uses now, what it could get down to, and how many 4 GB and
   6 GB virtual machines would fit.
5. Anything that would block a virtual machine from reaching Ollama on this PC.
```
