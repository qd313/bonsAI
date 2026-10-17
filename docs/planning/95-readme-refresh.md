# Plan 95: README refresh, with new real-time recordings

**Status: IN PROGRESS. The maintainer said go on 2026-10-17. The Deck's own screen set is filmed, cut
and in the README (§ 12). Left: the monitor set, the hand uploads of six video files, the push.**

Written 2026-10-17. The maintainer asked for the README to be redone: new words, new clips of every
feature, filmed in real time on both of the Deck's screens, and a layout they choose from drawings
first.

Mock-up board (private): https://claude.ai/artifact/ET68KNvGugiz6ELumhsFtV · notes in
[docs/demos/readme-board/README.md](../demos/readme-board/README.md).

## 1. What the maintainer asked for

1. **No sped-up clips.** Every clip plays in real time, waits included. Clips can be chosen so the
   waits are short, but nothing is cut or sped up.
2. **Clean up the wording.** Their edits of 2026-10-06 left strike-throughs and three notes in the
   text ("(Stored locally?)", "(???)", "(beta)"). Those get resolved and the strike-throughs removed.
3. **New recordings of everything.** The plugin has changed since the clips were made on 2026-10-02:
   a Search tab, your own notes, ten chats, the thinking fold, the decode effect, the new tab bar.
   The picture at the top of the page still shows version 0.5.
4. **Two of every recording:** one on the Deck's own screen, one on the external monitor. Each as the
   whole screen, and also cropped to the plugin alone. The crop is done afterwards on the PC, so one
   master recording per screen gives both shapes.
5. **Black out the Steam avatar** in the recordings, unless that is hard (see § 5.4: it is easy, and
   mostly avoidable).
6. **One long video of the Main tab:** switching from an existing chat to a new chat, the mode going
   Speed → Expert → Strategy, a question about the level, the thinking steps, the answer streaming in
   with the decode effect, opening Show reasoning, using the notes, the chips, and a branch pick.
   Under two minutes if possible (see § 6: on the Deck's own AI it will not be; the options are there).
7. **A feature part where the reader picks a feature,** then sees its title, how it works, and the
   video beside it, instead of today's heading-then-GIF run. GitHub pages can't run a real dropdown,
   so the board draws the nearest things GitHub can show (§ 3).
8. **Mock-ups first, of the whole README.** Done: the board above, five tabs.

## 2. What is decided already

Maintainer's answers, 2026-10-17:

- **The AI runs on the PC for most clips.** The waits drop from a minute to seconds, so almost every
  clip stays short in real time. **One clip is Deck-only**, with the AI on the Deck itself, so the
  page shows that too (§ 5.1 says which, pending their pick).
- **Real time by default.** A few clips may be sped up if it makes sense; the session names them
  and the maintainer decides each one (§ 6.1).
- **GIFs for plugin-only crops, video files for whole-screen clips and the long Main-tab video**
  (question 1, "go with your lean").
- **The long video runs with the AI on the PC** (question 2). The caption says so.
- **Avatar:** film everything with a game running; a black box where the home screen can't be
  avoided (question 3).
- **Which screen is the default on the page:** the maintainer chooses once both sets exist
  (question 4). Both sets are cut in full.
- **Filming order:** everything on the Deck's own screen first, then one ask for the monitor, no
  flipping back and forth (question 5).
- **The game:** Deep Rock Galactic: Survivor (question 6). **The stills** are re-shot too (7).
- **Today's build** (9). **Thinking and the decode effect switched on** for the clips (10).
- **Board picks:** tab 1, folds (B) and the jump list (C) both liked, lean B for the space it saves;
  tab 2, text left / clip right (B) and clip left / text right (C) both liked, so the sides alternate
  down the page; tab 3, badges with the promise in a box (C), and the top picture is the plugin alone,
  no game around it; tab 4, warning box and a heading per step (B); tab 5, W3, W4, W5, W7 and W8
  liked, with their words for W1, W2, W6 (drop the performance tips) and W7 ("and even Steam's own
  settings"). No comma before "and" in lists.
- The README's facts stay true to the plugin as it is on `experimental` today. Features that are
  gone (the recommended-models refresh, the Steam ban lookup, reading answers aloud) are not mentioned.
- The old clips in `assets/readme/` are replaced, not kept beside the new ones. Git history keeps
  them.
- Nothing is pushed by a session. The maintainer pushes, and uploads any video files by hand (§ 4).

## 3. The page's shape: what GitHub can draw

GitHub shows a README with no scripts and no styles of ours. So:

| Works on GitHub | Does not work |
|---|---|
| Headings, lists, tables (used for side-by-side), pictures with a set width | A dropdown or any control that picks a section |
| Folds: a line the reader presses to open (`<details>`) | Styles: colours, columns, fonts of our own |
| Boxed notes and warnings (`> [!NOTE]`, `> [!WARNING]`) | Video files kept in the repo (they show as a link, not a player) |
| Video files uploaded by hand on github.com: they render as a player with a play button | Anything that needs a click to run |

So the "pick a feature" part can be: a fold per feature (closest to the ask), a jump list of links
at the top, or a table of features. Tab 1 of the board draws each as the whole page; tab 2 draws one
feature section five ways at full size.

## 4. GIFs or video files

Each clip can be a **GIF** (lives in the repo, plays by itself, no sound, loops, no click needed)
or a **video file** (sharper, plays on a click, can be long; but the file is not in the repo: the
maintainer drags it into the README editor on github.com, which stores it and gives a link to paste
in; 10 MB each on a free account).

What the sizes look like, from today's GIFs (12 frames a second, dithered):

| Clip | Shape | Length | Size today |
|---|---|---|---|
| Ask about your game | plugin only, 360 wide | 18 s | 1.0 MB |
| Sum up this chat | plugin only | 75 s | 1.2 MB (mostly still frames) |
| Reply ready | whole screen, 560 wide | 34 s | 2.0 MB |
| Ask about a screenshot | whole screen | 27 s | 2.0 MB |

A plugin-only clip stays small even when long, because most frames barely change. A whole-screen
clip with a moving game behind the panel changes every frame, so a real-time minute of it is
roughly 5 to 10 MB as a GIF, and the two-minute Main-tab video as a whole-screen GIF would be 20 MB
or more: too big for a README. As a video file the same two minutes is about 6 to 10 MB.

**Recommendation:** GIFs for the plugin-only crops (any length), video files for the whole-screen
clips that show the game and for the long Main-tab video. Every clip is still recorded as one master
video, so the choice can change later without re-filming.

## 5. Recording

### 5.1 The clip list

Every feature section gets one clip. Each clip is filmed twice (Deck screen, monitor) and cut into
two shapes (whole screen, plugin only), so four files per clip plus the masters.

| # | Section | What happens in the clip | Where it starts | About |
|---|---|---|---|---|
| 1 | Ask about the game you're playing | The long Main-tab video (§ 6) | Main, an existing chat | 2 to 3 min |
| 2 | Notes from the game's wiki | A Speed question whose answer uses a wiki note; the note line opens | Main, game running | 40 s |
| 3 | Your own notes | A question that says "I'm on …"; the Keep card; a later answer says "Read 1 of your notes"; the sheet opens | Main | 60 s |
| 4 | Spoilers stay hidden | A Strategy answer with a cover; A opens it | Main | 20 s, after a wait |
| 5 | "Where are you at?" | Strategy asks where you are; the checklist; a tick | Main | 50 s |
| 6 | Ask about a screenshot | Paperclip → Close menu & take screenshot → the question → the answer | Main, game running | 60 s |
| 7 | Search | The Search tab; "brightness"; the Steam setting opens; a chat match | Search | 30 s |
| 8 | Close the menu, keep playing | Ask, close the menu, play, the Reply ready popup | Main, game running | 45 s |
| 9 | Saved chats | The chat row; shoulder buttons; New chat at ten asks which to delete; Sum up this chat | Main | 45 s |
| 10 | Talk instead of typing | The mic button; words appear; Stop; the tidied text | Main | 25 s |
| 11 | See how it answered | Show details under an answer; the model, the notes, the Session tab | Main | 15 s |

Plus new still pictures: the top-of-page picture (the plugin alone, no game around it), Where AI
runs, the paperclip menu, the knowledge library section, the Permissions tab, the AI models list.
All from the same two screens.

**The Deck-only clip (decided 2026-10-17):** clip 2, Notes from the game's wiki, as a Speed question
with the AI on the Deck itself (one note, a 10 to 20 s wait, and the answer credits the note). Its
caption says "with the AI running on the Deck itself". Every other clip runs with the AI on the PC.
The wait in this clip stays real time (§ 6.1).

**The PC's AI** already holds the Deck's starter model (it can see pictures, so the screenshot clip
works) and the note-search model, checked 2026-10-17. The Deck points at the PC through the Ollama
tab's PC address, the same way the install steps describe.

### 5.2 One master per clip per screen

The rig records the whole screen as a video (`deck_record`, the "full" quality so the crop stays
sharp). Masters live in the repo's `recordings/` folder (not stored in git), named
`<clip>-<deck|monitor>.mkv`. They are never edited; every GIF and video file is cut from them.

### 5.3 Cutting on the PC

From each master, four files with ffmpeg on the PC:

- **Whole screen, video file:** H.264, 1280 wide (the monitor master is 1920 wide, scaled to 1280 so
  both screens look the same on the page), about 600 kbit/s, no sound.
- **Whole screen, GIF:** 560 wide, 12 frames a second, two-pass palette, for sections that keep a GIF.
- **Plugin only, GIF:** the plugin column cropped out of the master, 360 wide, 12 frames a second.
- **Plugin only, video file:** the same crop as a video, for sections that go that way.

The crop box is measured once per screen from a screenshot (the panel sits at a fixed place on each
screen) and written into the cut script, so every clip on a screen uses the same box.

### 5.4 The Steam avatar

The avatar shows only on Steam's home screen (top right) and in the Steam side menu. It never shows
inside the Quick Access Menu over a running game. So:

- **Every clip is filmed with a game running.** Then the avatar is never on screen, and there is
  nothing to black out. Most clips need a game anyway.
- **Where the home screen must show** (if a clip is filmed with no game, the home screen is behind
  the panel), a black box goes over the avatar's spot in the cut: one line in the cut script, with the
  box measured once per screen. Not laborious.

### 5.5 Both screens

Only the Deck's own screen is live today (the monitor is unplugged). The monitor set needs the
monitor plugged in and Steam drawing on it, for one filming block. The maintainer says when; the
session reads which screen is live off the Deck before every block and names it in every file.

### 5.6 The Deck is shared

Another chat may be driving the Deck through the rig. Before every filming block the session asks
that chat (by message) for a clear window and waits for it, and says when the block is done. One
driver at a time.

### 5.7 Before the first block

- The screenshot tool failed on 2026-10-17 because `sudo` asked for a password. Fix or work around
  before filming (the record tool uses the same path).
- Deep Rock Galactic: Survivor installed and on the Recent Games row (it has wiki notes and was the
  game in the old clips). Or another game the maintainer names that has notes.
- The Deck's AI loaded with the starter model; **Thinking** on (Ollama tab) for the thinking steps;
  the decode effect on for the streaming answer; spoiler hiding on; the knowledge library installed.
- The everyday suggestion chips in place (no pinned test batch); a chat with history to switch away
  from; nine saved chats so New chat asks which to delete.
- The Deck's AI unloaded again before any whole-screen clip that needs the game to run smoothly? No:
  the clips are meant to show the AI on the Deck. Accept the game's frame rate as it is.

## 6. The long Main-tab video

What it shows, in order, with real-time estimates on the Deck's own AI:

| Time | What happens |
|---|---|
| 0:00 | The menu opens on Main, on an existing chat with history. The pencil starts a new chat. |
| 0:08 | The mode chip: Speed → Expert → Strategy. |
| 0:14 | A suggestion chip is picked, or a question typed: one that names where the player is ("I'm on hazard 3, how do I beat the Dreadnought?"), so the notes card appears later. |
| 0:25 | Ask. The thinking fold shows the steps as they come. On the Deck, Strategy with thinking takes 40 to 70 s. |
| 1:20 | The answer streams in with the decode effect, 20 to 30 s. |
| 1:50 | Show reasoning opens. The Keep card for the note: Keep. The branch choices under the Strategy answer: one is picked. |
| 2:05 | The branch's answer starts streaming. (Cut here, or let it finish: another 40 to 60 s.) |

Those are the Deck's own times. **Decided: the AI runs on the PC for this clip** (answer 2), so
each wait is a few seconds and the whole thing, branch answer included, should land around 1:20 to
1:40. The caption says "with the AI on a PC on the home network".

### 6.1 Clips that might deserve a speed-up

With the PC's AI, the only long waits left are in the Deck-only clip. The session's view, for the
maintainer to decide:

| Clip | The wait | Lean |
|---|---|---|
| The Deck-only clip, if it is a Speed question | 10 to 20 s of thinking dots | Real time; it is the point of the clip |
| The Deck-only clip, if it is Strategy with thinking | 40 to 70 s before the answer starts | Speed the wait up, say so in the caption, or pick Speed instead |
| Sum up this chat | a few seconds on the PC | Real time |
| Close the menu, keep playing | the answer finishes in seconds on the PC, so the popup comes quickly | Real time |
| Talk instead of typing | 2 s of tidying after Stop | Real time |

The two chips and the chat row animate on their own, so the recording never stalls on a still screen
(the record tool drops frames when nothing moves).

## 7. The wording

Board tab 5 shows each passage now and proposed. In short:

- The two struck list lines go, and so does the sentence saying those features are gone (open
  question W2).
- "sped up" goes from every caption. One caption for all clips.
- The Ask paragraph: typo fixed, chips sentence out (open question W4).
- "(Stored locally?)" → "Your progress is saved on the Deck, for each game."
- "(???)" on the performance tips: keep or drop (open question W6).
- "Find a Steam setting by typing" becomes the Search tab section.
- Two new sections: Your own notes, Talk instead of typing (open question W8).
- "read aloud (beta)" is already gone, since the feature was removed in plan 86.

## 8. Steps, in order

| Step | Who | What |
|---|---|---|
| 0 | maintainer | Picks on the board (tabs 1 to 5) and the answers in § 10. Says "go". |
| 1 | session | The cut script (ffmpeg recipes for the four shapes, the crop boxes, the avatar box) and a dry run on one old master. |
| 2 | session + maintainer | Deck block one, the Deck's own screen: the eleven clips and six stills, with a clear window from the other chat. Retakes the same evening. |
| 3 | maintainer | Plugs in the monitor. |
| 4 | session | Deck block two, the monitor: the same list. |
| 5 | session | Cuts: four files per clip per screen; a size table; a look at every file. |
| 6 | session | The README itself in the picked shape, with the new words; the contents list rebuilt; the user guide's pictures updated where they share a file. |
| 7 | maintainer | Uploads the video files on github.com (if any), pastes the links, pushes. |
| 8 | session | Checks the page on github.com in a browser, light and dark, and on a phone width. |

Done looks like: the README on GitHub shows the picked layout, every clip is real time and from the
new build, each section has both screens and both shapes on disk so a clip can be swapped, no
strike-throughs or notes remain, and the old clips are gone from the repo.

## 9. Risks

- **Whole-screen GIFs with a moving game get big.** Hence § 4.
- **A video file is a hand upload** on github.com, and swapping one later is another hand upload.
- **Real time means the waits are in the clip.** A 60 s thinking wait is 60 s of the reader's time.
  Picking Speed questions for the short clips keeps most of them under a minute.
- **Two filming blocks on a shared Deck.** Each needs a clear window from the other chat and the
  right screen plugged in.
- **The Deck's AI slows the game**, so whole-screen clips show a low frame rate in the game. That is
  honest, and the README says so.

## 10. The questions and the answers (2026-10-17)

1. **GIF or video file:** "go with your lean": GIFs for plugin-only crops, video files for
   whole-screen clips and the long clip.
2. **The long video:** AI on the PC.
3. **Avatar:** yes, film with a game running; black box where unavoidable.
4. **Default screen:** the maintainer chooses once both sets exist.
5. **The monitor:** any time, but no flipping: record everything on the Deck's screen, then ask once.
6. **The game:** Deep Rock Galactic: Survivor.
7. **Stills:** re-shoot them.
8. **Wording:** picks on the board (§ 2).
9. **Build:** today's.
10. **Thinking and the decode effect:** switched on.

Also: the AI on the PC for most clips, one Deck-only clip; real time, with a few speed-ups allowed
if the session brings them up (§ 6.1).

### 10.1 Round two, answered 2026-10-17

1. **The Deck-only clip:** the wiki-notes clip as a Speed question (§ 5.1).
2. **Tab 1:** F, folds with the first one open and the sides alternating. Without the line "Pick a
   feature to open it."
3. **Tab 3:** F, two plugin-only pictures side by side under the badges, the promise in a box. The
   game-name question was not answered; the session assumes a game's name as text in the chat row is
   fine (it is not branding) and will show the maintainer the two stills before they go in.
4. **Tab 5:** W1b with the maintainer's exact words ("bonsAI is free and open source. It runs on
   your own hardware, your privacy stays yours. No paid API, no data centers."), W2b with the places
   in bold, W6b, W7b.
5. **Spelling:** US. "Licence" becomes "License", and every other British spelling in the README
   is switched (checked: the README's only ones are "licence" and "centre").

## 11. What the README becomes

In one list, so the build is a copy of this and the board:

- **Top:** `# bonsAI`, a badge row (release, license, where it runs), the one-liner in bold, the
  Quick Access Menu line, two plugin-only stills side by side, no game around them.
- **Contents list** (made by the usual script).
- **Free, open and yours:** the maintainer's opening in a boxed note with the three promises, then
  "What does reach the internet" as three lines with the places in bold, then the Internet-downloads
  paragraph.
- **What it does:** eleven folds, one per feature (§ 5.1), the first open. Inside each: how it
  works on one side, the clip on the other, sides alternating down the page, the caption under the
  words. The clip is the plugin-only GIF unless the section is one that shows the game (screenshot,
  Search, Close the menu), which get the whole-screen video file. The long Main-tab video is the
  first fold's clip. Then the "There's more" line without the performance tips.
- **Before you start** as a warning box. **What you need** as today. **Install** with a heading per
  step and the Where AI runs picture under step 3.
- **Getting help, Help build it, License, Buy me a beer** as today, US spelling.
- US spelling throughout, no comma before "and" in lists, no "sped up" anywhere.

## 12. Progress, 2026-10-17 evening (Deck's own screen)

**Filmed** on the Deck's own screen, with Deep Rock Galactic: Survivor running and today's build,
between 19:33 and 21:00 UTC with the Deck handed over by the stability chat. AI on the PC for every
clip except the wiki-notes clip (AI on the Deck, 25 s answer, real time). Masters are in
`recordings/` as `<clip>-deck.mkv`; every cut is in `recordings/readme-cuts/` (four shapes each).

| Section | In the README as | Video file to upload | Notes |
|---|---|---|---|
| Ask about the game | video (still until uploaded) | ask-about-your-game-deck-full.mp4, 7.1 MB, 1:40 | new chat, Speed → Expert → Strategy, live thinking, decode effect, Keep, Show reasoning, branch pick, a ticked step |
| Notes from the wiki | plugin GIF | — | AI on the Deck itself |
| Your own notes | video | your-notes-deck-full.mp4, 3.7 MB | the notes box opens over the whole screen |
| Spoilers | plugin GIF | — | a Hollow Knight ending question: this game is low spoiler risk, so no covers come for it |
| "Where are you at?" | plugin GIF | — | cut from the long video, 1:02 to 1:39 |
| Ask about a screenshot | video | ask-about-a-screenshot-deck-full.mp4, 4.7 MB | take, reopen, Attach recent screenshot, pick, ask |
| Search | video | search-deck-full.mp4, 1.7 MB | ends on Steam's Display settings |
| Close the menu | video | reply-ready-deck-full.mp4, 2.0 MB | |
| Saved chats | video | saved-chats-deck-full.mp4, 5.3 MB | triggers flip chats; Sum up; the which-to-delete box |
| Talk instead of typing | plugin GIF | — | a Windows computer voice played into a pretend microphone; the real voice is still owed |
| See how it answered | plugin GIF | — | |

**Found while filming:**
- The Steam avatar is not avoided by a running game: it sits in the Quick Access Menu's top bar, and
  this game's title screen draws a large avatar card with the profile name whenever the menu is shut
  (also behind Steam's boxes). The cut script blacks out the top-bar avatar always and the card in the
  menu-closed stretches (`--card`), found by a check on the menu's side rail.
- Saved chats flip with the triggers (LT/RT), not the shoulder buttons; the README now says so.
- "Close menu & take screenshot" saves the picture and closes the menu; the picture is then attached
  from Attach recent screenshot. The README now says so.
- The AI models window heading says "LICENCE" (British spelling) while the README is now US.
- Friends' "now playing" pop-ups can land in a clip; none did in the kept takes.
- **The D-pad freeze** (Down stops moving, Up keeps working, until a plugin reload) hit four times.
  Every stuck reading had the panel page without focus (`document.hasFocus()` false), every working
  reading had it true, and `window.focus()` could not restore it. Steam's boxes always take that
  focus away; sometimes it never comes back. The plugin's own Down moves are plain `focus()` hops,
  which Steam's ring does not follow without page focus (plan 76's finding). Evidence and the next
  steps are in `recordings/dpad-freeze-notes.md` (not stored in git; copy it into the bug entry).

**Deck put back** at 21:05 UTC: settings folder restored from the hand-over backup, performance
overlay back to 3, pretend microphone removed, game closed, keep-awake released. Left on the Deck for
the maintainer: `~/p95-settings-backup-1525` and `~/p95-settings-used-1702` (about 220 MB each) and
a few test screenshots in Steam's screenshot folder.
