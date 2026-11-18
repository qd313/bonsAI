# 106 — Plan 105's wrap-up: the review fixes, two Deck-found bugs, the second download card, and the owed Deck checks

Written 2026-11-17 by the chat that ran plan 105 (Opus, extra-high), from plan 105's report (§ 13), its review report
([assets/105-review-report.md](assets/105-review-report.md)), the last Deck block's evidence and the maintainer's answers
in the chat the same afternoon. Plain language on purpose: this file is for the maintainer first. The pictures that go
with it: <https://claude.ai/artifact/WHoMiyk8Fe9PZwXh84LjHU> (open it in a web browser signed in to claude.ai).

**Status: RAN 2026-11-17, report § 13.** (Started about 20:30 EST.) The maintainer said "run plan 106" before the reset, knowing
the week (81 percent at go) would likely pass 90. The rules every helper reads: [assets/106-helper-rules.md](assets/106-helper-rules.md).

**As written (READY):** small on purpose: about a dozen helper runs and one or two Deck blocks, so about
one five-hour window. **Start it after the week resets** (Wednesday 18 November, 08:00 EST): the week stood at about 81 percent
when this was written, and the line is 90.

**Who runs it:** a fresh Opus 5.5 chat at extra-high, told "Run plan 106". It reads every change and lands it. Helpers:
Sonnet 5.5 high for fixes that need a judgment, Sonnet 5.5 medium for mechanical ones and for the bookkeeper and the
Deck driver, Opus 5.5 extra-high for the two D-pad and layout bugs (each has its Deck measurement already). Fable at
medium is the second opinion, asked before every D-pad or layout landing (plan 105's trial verdict). Up to eight helpers
at once.

**Read first:** plan 105 § 13 (what it left and why), the review report, [docs/lessons-learned.md](../lessons-learned.md)
§ 3 (the newest entry: a first-run test wipes what bonsAI keeps in Steam's browser).

---

## 1. One sentence

Fix what the security and licence review found in the download code, fix the two small things the last Deck test
found, give the knowledge library and the voice install the same download card the Ollama tab now has, and run the Deck
checks plan 105 could not finish.

## 2. The maintainer's answers (2026-11-17, in the chat)

1. **Review items 4, 9, 12 and 13 are shelved for now:** the licence file's two missing paragraphs (the characters'
   owners and what is downloaded later), search packs imported in version 0.4 that can no longer be removed, the
   changelog line for the old animation settings, and the characters document not covering the small emblems. The
   bookkeeper writes each into the shelved list, marked as the maintainer's call.
2. **Headline first is on, as the house style, with no setting.** Done the same afternoon (commit `2c8145fd9`); it
   reaches the Deck with this plan's first build. **Later the same day: "your notes" win over it** (lane H1). A player
   who writes an every-game note asking for a different opening (say, "give me the full answer, no summary line
   first") gets that, not the house style. The bigger idea, ready-made "style notes" listed with your own notes on the
   Search tab, waits until more house-style rules pile up.
3. **Yes to a real Ollama update on the Deck,** to test the download card's Cancel (it updates the Deck's Ollama to the
   newest version; today it is 0.40.16).
4. **Steam on the PC:** the maintainer restarts it (or updates Decky to 3.3.1), which unblocks the stand-in blocks.

**Still open, each with the default "go" takes:**
5. **Asking with ten chats saved, Cancel or B:** keep the question in the box, unsent *[as built; the pictures page shows
   both boxes]*. The other choice is "send it into the newest chat anyway" (the old way).
6. **The five settings backups in the Deck's home folder** (`p105-settings-backup*.json`): delete them *[yes, at the
   end of block W1, after the settings compare]*. They are copies of the settings file, which holds the Steam Web API
   key. The live settings file already holds the same key, so this is tidiness, not a leak: five fewer copies of a key
   sitting in plain files.
7. **The knowledge library download on the Deck** (needed to see the new card on it): turn Internet downloads on for
   that one test and back off after *[no: the card on the library is checked by tests and on the stand-in only]*.
8. **The ten October notes on the checks page:** paste them in the chat to have each answered *[not part of this plan
   unless pasted]*.

## 3. What a player notices after this plan

- **Cancel works the whole way through an Ollama install or update,** including while Ollama itself downloads, and a
  cut-off download can no longer leave Ollama half-replaced.
- **The voice engine is built from checked parts** and the first-time screen names every site it uses.
- **A Cancel that does not get through puts the button back** instead of leaving "Stopping" for good; turning Internet
  downloads off stops a running download.
- **The knowledge library download and the voice install show the same card** as the Ollama tab, with Cancel, and the
  bar at the bottom of the panel while the card is out of sight. The voice install gets its first Cancel.
- **"Open sections as you walk" no longer jumps** (Developer switch, off by default), and Up from "Open all" stops on
  the last section's own controls instead of skipping them.
- **Left from the "Show details" line** behaves like the rest of bonsAI (two stay, the third goes to Steam's menu).
- **Every answer opens with one short sentence that carries the point** (Headline first, now on), **unless one of your
  notes asks for a different opening**, in which case the note wins.

## 4. The work

| Lane | What | Model | Files (area) | Waits for |
|---|---|---|---|---|
| K0 | Bookkeeper first: decision D143 (§ 2 word for word); the shelved four into the shelved list; one roadmap entry per lane below that has none; the testing rows in § 6 | Sonnet medium | the roadmap files, testing files, decisions file | nothing |
| R1 | **An Ollama install you can stop and that cannot half-break** (review items 1, 3 and 6) | Sonnet high; the security reviewer reads it before landing | the back end's Ollama install code | nothing |
| R2 | **A Cancel that cannot stick, and the downloads switch stops a run** (review items 5 and 7) | Sonnet high | the download card's store, the Ollama job, the first-time card, the setup start | nothing |
| R3 | **The voice engine built from checked parts, and every site named** (review items 2 and 10) | Sonnet high; the security reviewer reads it | the voice engine build, the checklist, the card's site line | nothing |
| R4 | Three small fixes (review items 8, 11, 14) | Sonnet medium | the model licence rules, the models list, the chat-placing script | nothing |
| F1 | **No jump when a section opens above the ring; Up from "Open all" stops on the last section's controls** | Opus extra-high; second opinion before landing | the sections' walk and open-state code | nothing (measured in plan 105) |
| F2 | **Left on the "Show details" line in the chips' place counts like everywhere else** | Opus extra-high; second opinion before landing | the dock's slot, the Left count | nothing (measured in plan 105) |
| F3 | **The same download card on the knowledge library and the voice install** (plan 105's lane D4b), plus the three card notes from plan 105's second opinion | Sonnet high; second opinion before landing (the ring moves) | the library download, the voice install, the card and bar | R2 landed (same store) |
| F4 | The tidy-up plan 105 left: an unused Show details helper and its five calls, unused styles, carousel-only focus options | Sonnet medium | the chat transcript, one stylesheet, the chip row's focus files | F2 landed (same area) |
| H1 | **Your notes win over Headline first** | Sonnet high | the Headline instruction, its tests, one answer test on the PC's AI | nothing |
| F5 | Two one-star bugs: the Diagnostics log fills with ResizeObserver warnings; Tiny text's "Show details" line is 8.0 px, not 7.2 (check whether the base is 10 px first) | Sonnet medium | as found | nothing |
| R | The security reviewer reads R1, R2, R3 and F3 before they land (Sonnet high, model passed by hand) | Sonnet high | read-only | each lane built |
| W1 | **Deck block** after all landings (§ 6) | Sonnet medium driver | the Deck | every lane landed |
| W2 | **Stand-in blocks** S1 and S2 from plan 105 (the starter set with the voice engine from a wipe; the first-time setup pressed through, with its press count) | Sonnet medium driver | this PC | the maintainer's Steam restart |

**Not in this plan:** the README video refilm (it needs the AI on the PC and the maintainer's eye; a session of its own),
the checks page round for plan 105's hand checks (a short session of its own once this one lands, so the pictures show
the final build), and the shelved four.

## 5. The briefs (short; each helper also reads the review report's entry)

- **R1.** The Ollama download is one long step that never checks for Cancel (review item 1). Make it a step that can be
  stopped the way the voice engine's build already is; check Cancel again before the step that restarts the Deck's AI.
  Fetch the download to a spare file, check it against the checksum Ollama publishes for that release, unpack it to a
  spare folder, and swap it in only when the unpack worked; the shell line gets `pipefail` (review item 3). On the
  "missing keys" step after Clear all data, a Stop must leave the AI running (review item 6). Tests for each: Cancel
  during the download ends the run as Stopped with no restart; a bad checksum fails safely with the old Ollama in place;
  a half download leaves the old Ollama in place. Say in the report which checksum source was used and what happens
  when it cannot be fetched (the safe choice: refuse to install, say why).
- **R2.** A failed or timed-out Cancel request must put the Cancel button back (and say "Could not stop; try again")
  rather than leave "Stopping" for good (review item 5); the same for the first-time card's Stop. Turning Internet
  downloads off during a run cancels the run (review item 7). Tests for both.
- **R3.** The voice engine's build fetches its compiler at whatever version the image's package servers have that day
  (review item 2). Either build from an image that already holds the compiler, pinned by its exact digest like today's
  image, or record a checksum of the two built programs and check it before first use; say which and why. Name the
  image's package servers on the first-time checklist and in the card's site line (review item 10). The security
  reviewer reads it before landing.
- **R4.** A model name with a part before the slash must not count as open source (only Ollama's own library names
  do) (review item 8). The `gemma4:26b` row says in the list that its month is borrowed, and the `gemma3:270m` month is
  checked against its maker's page (review item 11). The chat-placing script re-reads the chat list just before each
  write and checks the saved copy's checksum before writing it back (review item 14).
- **F1.** Plan 105's Deck numbers: pressing Up onto "Use local knowledge base" with the switch on, the ringed row drops
  20.8 px at about 38 ms and is back by about 150 ms; Up onto Reply style settles 4 px lower (evidence
  `plan105-P105-SECTIONS-AUTO-01-d3b.json`). Pass: within 2 px every frame. Also: Up from "Open all" lands on the last
  section's line and skips that section's own controls (Ollama, Settings, Developer). Measure first, then fix.
- **F2.** On the Deck the dock's "Show details" line (in the chips' place) lets Left go to Steam's menu on the first
  press, though the code holds it for two (evidence `plan105-P105-LEFT-TO-MENU-01-d3b.json`). Find whether Steam's own
  button answers Left before bonsAI's handler; make it count like the other places.
- **F3.** Plan 105's lane D4b brief stands (plan 105 `assets/105-lane-briefs.md`, D4b). Add: on Main the bar shows
  "Cancel X" though X does nothing there and the pad cannot reach the bar (make X work there or drop the hint); the
  "2 jobs" chip needs a hand-over when it vanishes under the ring (this lane makes two kinds of job possible); turning
  "Run AI on this Deck" off mid-run must not drop the job from the card and bar while it carries on.
- **F4.** Plan 105 § 13.6 names the leftovers; nothing a player sees changes.
- **H1.** Today the notes sit early in the AI's instructions and the Headline sentence sits near the end, and small
  models tend to follow what they read last, so a note asking for a different opening may lose. Make the note win: add
  to the Headline sentence that it steps aside when the person's notes ask for a different way to open or shape the
  answer (or move the sentence so the notes come after it; say which and why). Keep the prompt tests' rule that the
  sentence is the only difference when it is on, and that every spoiler fingerprint still matches with it taken out.
  **The answer test** (on the PC's AI, the answer model the Deck uses): ten questions of plan 105's Headline set, each
  asked twice, once with no notes and once with an every-game note "Give me the full answer, no summary line first".
  Pass: with the note, at most one of the ten answers opens with a stand-alone summary line; without it, about as many do
  as plan 105 measured (about a third or more; ten questions is a small sample, so write both counts in the report and
  judge the no-note count only against a clear drop). If the note does not win,
  stop and report rather than make the sentence weaker for everyone.
- **F5.** As in the roadmap entries filed by plan 105's last sweep.

## 6. The Deck block (W1) and its rows

One block after every lane has landed. The runbook is written by the session at the time. Rules carried over from plan
105: one test chat, deleted at the end; your usual chat open again at the end; settings backed up and compared key by
key; **the `bonsai:` keys in Steam's browser saved first and checked at the end** (no first-run test in this block, so
nothing should wipe them); the AI unloaded before any game; the keep-awake hold released at the end.

Rows, in order:
1. **Headline first on three real answers** (each opens with one short sentence that carries the point; no ending
   given away on a story question). Then **with a note:** keep the every-game note "Give me the full answer, no summary
   line first" through the plugin's own notes card, ask one more question (it should not open with a summary line),
   and delete that note on the Search tab afterwards. Pictures for the maintainer.
2. **The chips after a long answer** (plan 105's owed half) and **the decode flowing into its slide** (about 0.2 s, by
   recording).
3. **Left** on the first suggestion chip and on "Suggest as a tip"; the "Show details" line after F2.
4. **The jump** after F1 (four landings, every frame) and Up from "Open all".
5. **The download card, for real (the maintainer's yes):** Update on the Ollama tab with the ring on it: the ring is on
   Cancel at once and after half a second; Cancel during the Ollama download stops it (after R1) and the Deck's AI still
   answers; then Update again and let it finish: the ring goes back to Update; once with Internet downloads off first, so
   the box opens and the tab rebuilds; the bar appearing while walking down past the card, with the ring fully visible.
   Then turn Internet downloads back off. Write the Deck's Ollama version before and after.
6. **The voice install's card** (F3), on a Deck that already has the voice engine: the card shows and Cancel is offered;
   nothing is downloaded unless the run truly needs it (if it would download, stop and report).
7. **The agent chip's blue fill** (an October row; needs an answer from the Pyro character).
8. **Put back,** then delete the five settings backups if the maintainer said yes.

## 7. The report

Plan 106 § 13, in plan 105's shape, short. The checks page round is its own short session afterwards.

---

## 12. Run log (2026-11-17, evening)

- **About 20:15 EST, go.** The maintainer said "run plan 106" before the week reset, knowing it would likely pass 90
  percent (81 at go). Rules page and status commit `2da63867e`; eight helpers started at once (K0, R1, R2, R3, R4, F1,
  F2, H1). The Deck had been switched off; the maintainer woke it at 20:24 and it was held awake.
- **20:26 to 21:04.** K0 landed (D143, the shelved four, entries and rows). F5 found the warnings' cause (the panel
  height guard wrote inside its own size watcher); Tiny's 8.0 px is right by the scale. R2, R4 and F2 landed. The
  security reviewer read R2 and found six gaps; R2 and R1 fixed them in place.
- **21:04 to 22:11.** R1 (with the reviewer's two follow-ups), R2's six follow-ups, R3 (one conflict in the site
  lists, resolved by hand), H1 (second try: a note about how answers open drops the house opening), F4, F1 (with the
  second opinion's shrink test), F3 (second-opinion fixes, the speech-download file kept from R2) and R5 (nine security
  follow-ups, plus the session's sweep-age fix) all landed. Every landing ran the full screen and Python sets, the
  build, the focus check and the quick check.
- **22:15.** The session's commit naming the voice build's servers on the cards (`4dfa35f7e`). The stand-in could not
  run: Steam had been restarted at 09:00, but Big Picture would not come forward without a hand.
- **22:20 to 23:10, block W1 in four drivers.** Part a stopped after row 1: the Deck was docked to an outside screen on
  a slow charger, and Steam's "Slow Charger" dialog froze every screenshot until the maintainer closed it (22:40).
  Part b ran Left and the sections without pictures. At 22:50 the maintainer ruled on the ending question ("allow it,
  but make sure the whole response is spoilered"): lane H2 built it and landed at 23:02 (`2eef601e2`). Parts c and d
  ran the real Ollama update, the chips, the agent chip, the ending cover, and the put-back.
- **About 23:15 to 23:45.** The maintainer: "install the voice engine if you need to test it", "get the most
  descriptive part of the URL showing", and "investigate" the repeated agent chip text. Lane L1 (the card's site names,
  `a8ddc36d6`) and the bookkeeper's sweep K9 (`127fadad9`) landed; part e installed the voice engine for real on the
  Deck and put everything else back. The agent chip text is the Pyro character's joke working as built (13.1).

## 13. Report

### 13.1 What needs you

1. **Community copies of models now count as "unknown"** under "Open source only" (a name with a slash, such as
   `hf.co/…`). Anyone using one needs the unlock. Chosen on purpose (the old rule called them open source without
   checking); say if you want it softer.
2. **The Pyro character's "Agent suggestion" chip repeats the last line of the answer on purpose.** About 3 Pyro
   answers in 10 get a hidden "manager tip" (five fixed lines, such as "Smoke-test the Ask flow after updating Ollama
   tags"): the AI is told to end by offering that exact line in character, and the same line becomes the chip. Tonight
   the AI wrote it bare, so it read like a copy. Say if you want the chip only.
3. **The stand-in blocks still wait for you:** Steam was restarted, but Big Picture needs a hand to come forward while
   the PC is locked. Next time you are at the PC, bring Big Picture to the front and say "run the stand-in blocks".
4. **The card's "Keep the Deck awake and online until this finishes." line is still cut off** on the Deck (the site
   names below it now fit). Filed ★.
5. **Nothing is pushed.** 58 commits sit on `experimental` since go, this report included.

### 13.2 What a player notices

- **Cancel works the whole way through an Ollama install or update,** including the download itself, and a cut-off
  or bad download leaves the old Ollama working (checked against Ollama's own published checksum). A Cancel no longer
  switches off the AI you are using.
- **A Cancel that does not get through says "Could not stop. Try again."** and puts the button back. Turning Internet
  downloads off, or Steam's parental lock coming on, stops a running download.
- **The voice engine is checked before it runs,** built in a spare folder and swapped in only when the build worked,
  and the screens name every site it uses.
- **The knowledge library download and the voice install use the same card and bar as the Ollama tab;** the voice
  install has its first Cancel.
- **The card names each site by its telling part,** never cut in the middle: "From ollama.com, github.com and
  ollama.ai".
- **"Open sections as you walk" no longer jumps** (0 to 0.4 px on five landings, was 20.8 px), and Up from "Open all"
  goes back to the last control.
- **Left on the "Show details" line under an answer, and on "Suggest as a tip",** stays twice and goes to Steam's menu
  on the third press, like everywhere else.
- **Your notes beat Headline first:** a note like "Give me the full answer, no summary line first" now gets exactly
  that (1 answer in 30 opened with a summary line, against about 1 in 5 before).
- **Asking how a game ends hides the whole answer behind one spoiler cover,** opening sentence included, from the
  first word.
- **The Diagnostics log no longer fills with warnings,** and a made-up model name no longer passes "Open source only".

### 13.3 The Deck (block W1, builds `4dfa35f7e`, `2eef601e2` and `127fadad9`)

| Check | Result |
|---|---|
| Headline first, three answers | 2 pass; the ending question gave the ending away, which led to the cover |
| Your note beats Headline first | Pass (the note is removed in the notes sheet, not on the Search tab) |
| The ending cover | Pass: only the "hidden" chip while writing, one closed cover, the whole answer inside; normal and "spoilers are okay" questions not covered |
| Chips after a long answer | Pass |
| Decode into its slide | Pass: no still pause (the slide starts while the letters settle) |
| Left: answer's own line, the tip, the first chip, Hide details | Pass; the dock's own copy only in its "Hide details" wording |
| Sections as you walk, five landings | Pass (within 0.4 px for 1.5 s) |
| Up from "Open all" | Pass on three tabs with the switch on; two switch-off cases not run |
| Diagnostics log warnings | Pass (none) |
| The real Ollama update: Cancel, the AI still answers | Pass (0.40.16 before and after) |
| "Run AI on this Deck" off mid-update; downloads off mid-update | Pass; pass (stopped in under 3 s) |
| The card: ring on Cancel, the bar, the site names | Pass; the site names whole after lane L1 |
| Agent chip's blue fill | Pass |
| The voice engine, installed for real | Pass: the card, its Cancel (nothing left behind), the bar, then a full install with its checked record (g++ 11.4.0, GNU Make 4.3, Ubuntu 22.04.5, only Ubuntu's own servers) |
| Put back (twice) | Pass: settings as they were, downloads on as you had it, test chat deleted, your chat open, AI unloaded, all seven settings backups deleted, hold released. The voice engine stays installed |

### 13.4 Reviews and second opinions

- **The security reviewer** read every download lane (five reads). Nothing serious in any of them; it found 27 smaller
  gaps, 18 fixed tonight (two of them worth fixing soon: a stop the speech download ignored, and a Cancel that could
  switch off your AI), 9 filed as one roadmap entry.
- **Fable at medium, before each D-pad or layout landing** (four consults): two changed the work before it landed
  (the sections' late-shrink case, the voice install's way back across a question box); two said land as is (the
  warnings fix; the Left fix, with extra Deck checks). It confirmed plan 105's "dock" Left row was really the answer's
  own line. "Suggest as a tip" joining the Left rule was the session's call, from your rule in plan 105.

### 13.5 The numbers

- **Helpers:** 15 lanes (6 of them resumed once or twice for review fixes), 5 security reads, 4 second opinions, 5
  Deck drivers. Up to 8 at once.
- **Code:** 58 commits, about 156 files, about 8,600 lines added and 900 removed (tests are most of it).
- **Usage:** the week went from 81 to about 90 percent; the five-hour window peaked near 76.
- **Time:** go about 20:15; last landing about 23:30; the Deck put back about 23:45.
