# 50 — Setting up a PC with SteamVR to test headset features before the Frame is out

Written 2026-09-08 for the maintainer. Plain steps, in order. The reason for each is in
[49-steam-frame-features.md](49-steam-frame-features.md). The short version: the Frame streams from a
PC and every floating panel a person sees in the headset is drawn by a program on that PC. So a PC with
SteamVR is the test bench, and for the first tests no headset is needed at all.

There are two routes. **Route A** uses SteamVR's built-in pretend headset and needs no hardware.
**Route B** uses a headset you own. Do A first. Add B when a headset is in the house.

---

## 1. What you need

- A PC with a graphics card SteamVR accepts. Any card from the last six or seven years that runs games
  is fine. Windows is the smooth road. SteamVR runs on Linux too, but it is rougher, and the notes
  below are written for Windows.
- Steam installed and signed in.
- About two gigabytes of disk for SteamVR.
- For Route B, a headset. A Quest with Valve's free Steam Link app is the cheapest one that behaves
  the way a Frame will, because both stream from the PC over Wi-Fi.
- For the model, Ollama on the same PC. You may already have this if the Deck already points at a PC.

## 2. Install SteamVR

1. Open Steam. In the Library search box type **SteamVR**. It is free. Install it.
2. Start it once from the Library. Without a headset it will say no headset is found and show a small
   status window. That is expected. Close it.

## 3. Route A: the pretend headset (no hardware)

**Correction, 2026-09-12.** The way that actually worked, on the first try, was one personal settings
file Steam keeps in its own config folder — it survives updates, unlike the two files below. On a
Windows PC that file is `Steam\config\steamvr.vrsettings`; SteamVR creates it on first run, or you can
create it empty by hand first. Its contents (from
[plan 52 § 7.1](52-frame-features-second-look.md#71-the-personal-settings-file)):

```
{
  "steamvr": {
    "requireHmd": false,
    "forcedDriver": "null",
    "activateMultipleDrivers": true
  },
  "driver_null": {
    "enable": true
  }
}
```

The two-file edit below still works and stays as the fallback. **One more thing worth knowing before
you start:** the pretend headset takes no mouse input on a panel at all, so with it alone you can only
test whether something shows and how it looks — not clicking, typing, or anything that needs pointing.

SteamVR ships a "null" driver: a fake headset that lets SteamVR start, run its menu, and draw panels
into a window on your desktop. Two small text files switch it on. Close SteamVR before editing them.

**File one.** Inside your Steam folder, open this file in Notepad:

```
Steam\steamapps\common\SteamVR\drivers\null\resources\settings\default.vrsettings
```

Find the line that says `"enable": false` under `"driver_null"` and change it to `true`.

**File two.** Open this file in Notepad:

```
Steam\steamapps\common\SteamVR\resources\settings\default.vrsettings
```

Under the `"steamvr"` section, change these three lines so they read:

```
"requireHmd": false,
"forcedDriver": "null",
"activateMultipleDrivers": true,
```

Save both. Start SteamVR from the Library. The status window now shows a headset icon in green.

**To see what the pretend headset sees:** click the three-line menu in the top left of the SteamVR
status window and choose **Display VR View**. A window opens showing the VR world. Everything a panel
draws shows up in it. This window is what you will look at for the first tests.

**Two things to know.**

- A Steam update can put the two files back the way they were. If SteamVR stops starting after an
  update, redo the edits.
- The pretend headset has no hands. Anything that needs a controller, like the wrist panel, cannot be
  tested on it.

## 4. Route B: a headset you own

**Quest.** On the headset, install **Steam Link** from the Meta store. It is Valve's own app and free.
Put the PC and the headset on the same Wi-Fi, ideally the 5 GHz band with the PC on a cable. Start
Steam on the PC. Open Steam Link in the headset; it finds the PC and asks you to confirm a code on the
PC. After that SteamVR starts by itself.

**Index or Vive.** Plug it in. SteamVR sees it.

**Steam Frame, later.** It comes with its own Wi-Fi adapter that plugs into the PC. SteamVR on the PC
connects through it. Same idea as the Quest, without the Meta store.

If you had Route A turned on, put the three lines in file two back to their original values first
(`true`, empty, `false`), or SteamVR will keep using the pretend headset.

## 5. Turn on the developer settings

In the SteamVR status window menu choose **Settings**. Turn on **Advanced Settings** at the bottom
left. A **Developer** section appears. Leave everything as it is for now; the section is where the
overlay and web-page settings live when the tests need them.

## 6. See what a floating panel looks like, before we build one

Install **Desktop+** from Steam. It is free and open source, and it shows your desktop as a floating
panel inside VR. It is the same shape bonsAI's panel would take: a separate program on the PC, drawn
by SteamVR over any game. Start it with SteamVR running and look at it in the VR View window or in the
headset.

Things to notice, because they decide how bonsAI's panel would have to be built:

- How you point at it and press things. In the pretend headset it is your mouse. In a real headset it
  is a laser from the controller. Neither is a D-pad.
- How big text has to be before it reads comfortably at arm's length.
- Whether the panel stays when a game is running, and what happens when you open the SteamVR menu.

## 7. The model on the same PC

The study's advice is that the PC streaming the game is the best place to run the model. If Ollama is
not on the PC yet:

1. Install Ollama from its website and pull a model, for example:

   ```
   ollama pull gemma3:4b
   ```

2. Let other devices reach it. In Windows, open **Edit the system environment variables**, add a
   system variable named `OLLAMA_HOST` with the value `0.0.0.0`, then quit Ollama from the tray and
   start it again.
3. Allow it through the firewall if Windows asks; the port is 11434.
4. Find the PC's address:

   ```
   ipconfig
   ```

   Use the IPv4 address of the adapter that is on your home network.
5. On the Deck, in bonsAI's Ollama tab, point it at the PC:

   ```
   http://<the PC address>:11434
   ```

This reproduces the "Deck on the desk beside a headset" case today, with nothing new built.

## 8. The three things to find out first

These are the questions from the study that a PC answers without a Frame. Note the answers in
[09-steam-frame-companion-feasibility.md](../archive/09-steam-frame-companion-feasibility.md) or in a short file
under the archive's spikes folder.

1. **Does a panel show over a running game, and how is it pointed at?** Run any VR title or a flat game
   in SteamVR's theatre mode with Desktop+ open. Watch the VR View.
2. **Is the in-VR menu a web page?** With SteamVR running, open Task Manager and look for a process
   whose name starts with **vrwebhelper**. If it is there, the SteamVR menu is drawn the same way the
   Deck's menu is, which is the best case for us.
3. **Does the headset's mic reach the PC?** Route B only. With the headset streaming, open Windows
   **Sound settings** and look under Input. If the headset appears as a microphone, the voice half of
   the headset story works in this configuration.

## 9. If something goes wrong

- **SteamVR says no headset and will not start** with Route A: reopen file two and check all three
  lines, then file one. A missing comma at the end of a line is the usual cause.
- **It worked last week and not today:** Steam updated SteamVR and reset the files. Redo section 3.
- **The VR View window is black:** start a game or open the SteamVR menu; an empty world is dark.
- **The Deck cannot reach the PC's model:** on the PC, open a browser to `http://localhost:11434` and
  confirm it says Ollama is running. Then try the same address with the PC's network address from
  another device. If the first works and the second does not, it is the firewall or the environment
  variable.
- **Quest finds no PC:** both on the same Wi-Fi, Steam open on the PC, and the PC not on a guest
  network. The 2.4 GHz band works but stutters.
