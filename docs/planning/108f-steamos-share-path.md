# 108f — SteamOS Share path: the plan

**Status: READY for the maintainer's read, 2026-11-19. Planning only; nothing is built.** The short version: Steam's
own Share screen gives a plugin nothing to hold on to, so the faster way starts one step earlier, at the screenshot
itself. When you have just taken one, bonsAI offers it by the question box and one press attaches it.

**Where to pick up.** Read §§ 1, 4 and 5. Call f1 needs a drawing before it can be answered (mock-up board 7, this
plan's tab); the other calls can be answered in words. Then say "Run plan 108f" in a new chat on the PC. The first
step is a short test on the Deck (§ 5, step 0). Nothing is built before its numbers are in.

**Files for this plan:** the briefs [assets/108f-lane-briefs.md](assets/108f-lane-briefs.md), the shared helper rules
[assets/108-helper-rules.md](assets/108-helper-rules.md). Evidence files: `plan108f-<ROW>.json` in the workshop's
test-evidence folder. Its sister plans are 108a to 108g. All seven share decision number D145; this plan's calls are
f1 to f4, and its rows start `P108F-`.

**The roadmap entry:** ★★★★ `[ui]` **SteamOS Share path** — "OPEN, not started. A faster way from Steam's Share and
capture screens into attaching a screenshot, where Steam's own tools allow it."

Written by a planning chat (Fable 5.2) on `experimental` at tip `28306e896`, from the roadmap's one-line entry, the
older notes named in § 2, a read of the code as it is today, a look at the Deck's own screenshot folders (reading
only, nothing changed), and public guides to Steam's Share screen.

---

## 1. What you would notice when this is done

- You take a screenshot in a game (Steam + R1) and open bonsAI within about two minutes. The picture is already
  offered by the question box: "Attach the screenshot you just took", with a small copy of it. One press of A
  attaches it. Today that takes five presses and a wait.
- After bonsAI's own "Close menu & take screenshot", the picture is waiting for you when you come back (or already
  attached, call f3). Today a notice tells you to go and find it.
- The screenshot picker shows its pictures sooner, if the test finds it slow today.
- Nothing is attached unless you press. Nothing shows at all with "Read game & screenshot context" off, or with the
  Kids lock on. There is no new permission and no new setting.

Presses, counted from the open panel with the ring on the question box:

| | Today | After, with what I recommend in § 4 |
|---|---|---|
| Attach a screenshot you just took with Steam + R1 | 5 and a wait: Left, A, Down, A, wait for the list, A | 2: Up, A |
| Ask about what is on screen now, through bonsAI's own capture | 3 to capture, reopen the menu, then the same 5 | 3 to capture, reopen the menu, then none |

## 2. What was already written down, and what has gone stale (checked against the code on 2026-11-19)

**Still true**

- Nothing was ever planned or built for this. The roadmap entry and its long note are one line each. The October
  roadmap check found no code for it
  ([its note](../../../bonsAI-workshop/planning/assets/plan-80/03-features-second-half.md)), and that still holds:
  bonsAI does not notice a screenshot being taken, anywhere.
- The first mock-up board left this entry "for a later session on purpose"
  ([board notes](../demos/mockup-board/README.md)). It has no drawing yet.

**Stale**

- **"From Steam's Share screen" cannot be done as written.** On the Deck, Share offers four things: send to another
  device, send to your phone, make a QR link, send in a Steam chat. There is no place in that list a plugin can add
  itself to. (This is from public guides; step 0 looks at the real menu once.) So the faster way has to start at
  the screenshot, not at Share.
- **The May note that parked this** said "user-owned, no design here"
  ([old backlog plan](../../../bonsAI-workshop/archive/plans/backlog-implementation-plan.md), 2026-05-19). The entry
  was filed again as open after that, and you asked for this plan on 2026-11-19, so the note no longer applies.
- **Four stars looked like one too many** for what can honestly be built. The maintainer moved the entry to three on
  2026-11-19. See § 9.

**Never written down; found in this read**

- **bonsAI already has half of a fast path.** The paperclip's menu can take a screenshot itself, and since plan 96
  the picker opens with the ring on the newest picture. But the new picture is not offered or attached afterwards.
- **The test rig cannot take a Steam screenshot.** Its Steam + R1 press saved nothing in four tries over two
  sessions ([test-tool log](../mcp-setup.md)). The checks here place a picture on the Deck instead, which you
  allowed in
  [D140](../audit/maintainer-decisions-locked.md#d140--locked-2026-11-09-raised-2026-11-09--plan-103-the-knowledge-base-wave-six-the-twenty-one-calls)
  call 6, and one check needs your own hand.
- **Steam keeps a small copy of every screenshot** next to the full one. bonsAI does not use them. On the Deck the
  picker sends up to 24 full pictures to the screen every time it opens, about 3 to 6 MB going by the files'
  sizes, to draw thumbnails.
- **Steam's client can tell a plugin "a screenshot was just written"**, by the community's notes on it. That is not
  confirmed on this Deck, and this plan does not need it (§ 3), which keeps the feature safe when Steam updates.
- **Game recording clips** sit on the Deck as folders of video pieces, each with one still picture. bonsAI reads
  pictures only. Clips are out of this plan (§ 8).

## 3. How it works today

1. **The paperclip** beside the question box opens a small menu with two lines: "Close menu & take screenshot" and
   "Attach recent screenshot".
2. **"Attach recent screenshot"** opens the picker under the question box. It asks bonsAI's back end for up to
   24 recent pictures, newest first, and puts the ring on the newest. A attaches it; a row with the
   picture's name and a Remove button appears under the box.
3. **"Close menu & take screenshot"** closes the menu, waits a second, and saves a picture of the game into Steam's
   own screenshot folder. A notice says "Screenshot saved. Find it under Attach → Attach recent screenshot." It is
   not attached.
4. **The permission.** All of it sits behind "Read game & screenshot context", which starts off. The Kids lock
   forces it off on both sides of the plugin.
5. **Where pictures are found.** bonsAI reads Steam's own per-game screenshot folders and its own captures. It reads
   nothing else, and this plan adds no new place.

**How the new offer would know.** When the panel opens, bonsAI asks its own back end for the single newest
screenshot (the same call the picker uses) and compares that file's time with the clock. If it is fresh, it is
offered. It does not listen to Steam, does not read a new folder, and does not look at the picture.

## 4. Calls for you before anything is built

**f1. Where the offer sits. Needs a drawing first** (board 7, this plan's tab; every option pressable).

- **Today:** no offer.
- **A. In the paperclip's menu,** as a first line, with a small dot on the paperclip. Three presses. No height.
  Easy to miss unless you know the dot.
- **B. Its own chip between the suggestion chips and the question box,** where the AI's own suggestion chip sits.
  Two presses. About 30 points of height, only while it waits. The suggestion chips stay.
- **C. In the suggestion chip's place,** the way the help chip takes it. Two presses. No height. The suggestion
  chips are hidden while it waits.
- **D. A row under the question box,** where the attached picture's row goes, with Attach and No thanks. Three
  presses. About 50 points while it waits.
- **A switch on B, C and D: the ring starts on the offer** when the panel opens. One press. Typing a question then
  takes one press more to reach the box.

**I recommend B.** It is seen without knowing where to look, it is two presses, and it copies the one come-and-go
chip in that spot that is already built and passed on the Deck. Its cost is height, and only while an offer waits.
**If left unanswered:** nothing you can see is built. Only the faster picker can land.

**f2. How long a screenshot counts as "just taken".** (a) One minute. (b) Two minutes. (c) Five minutes. The time
runs from the screenshot to the moment the panel opens. Once shown, the offer stays until you attach it, send a
question, or close the menu. **I recommend (b):** long enough to open the menu at your own pace, short enough that
an old picture is not offered. **If left unanswered:** (b).

**f3. After bonsAI's own "Close menu & take screenshot". Drawn on the same tab.** (a) As today: saved, and you find
it yourself. (b) Offered, like any fresh screenshot. (c) Attached by itself when you come back, with its Remove
button. **I recommend (c):** that press already asked bonsAI for the picture, and it is the one case where attaching
without a second press matches what you did. **If left unanswered:** (b), the careful one.

**f4. A notice right after any Steam screenshot** ("Ask bonsAI about this screenshot"). **Drawn for the eye only.**
(a) Not built. (b) Built, with a Settings switch that starts off. (c) Built, on. **I recommend (a) for now:** Steam
already shows its own notice for every screenshot, so this would be a second one each time; it depends on the Steam
signal that step 0 only records; and a Settings switch costs about 18 files. **If left unanswered:** (a).

Not re-asked, because it is locked: the rig may "place test pictures in the Deck's screenshot folder and remove them
at the end" (D140 call 6).

## 5. The build, in order

| Step | What you get | Stars | Who builds it | Waits on | Check |
|---|---|---|---|---|---|
| 0 | Five readings from the Deck that decide the rest | — | The Deck driver (Sonnet medium), from a written runbook; one press of Steam + R1 by you | The rig being up | P108F-S0 rows |
| M | The drawing for f1, f3 and f4 | ★ | An Opus helper, medium or high | Nothing | Your pick |
| A | The unseen half: bonsAI knows when a screenshot is fresh | ★★ | A Sonnet high helper | Step 0; f2 and f3 | Lands with C |
| B | The picker's pictures come from Steam's small copies | ★ | A Sonnet medium helper | Step 0 says the picker is slow | P108F-PICKER-FAST-01 |
| C | The offer on screen, as you picked it | ★★★ | Opus extra-high (screen and D-pad work) | Your pick, lane A, step 0's sizes | P108F-OFFER rows, the walk and the look |
| K | The paperwork | ★ | The bookkeeper (Sonnet medium) | Each landing | — |

**The order.** Step 0 and the drawing start at once; neither needs the other. Lanes A and B follow step 0 and may
run together. Lane C waits for your pick and is cut from lane A's finished work, so the two land as one. If you have
not picked by then, lane B lands alone and the rest waits.

**Step 0's lines, written before anything is measured:**

- **Finding the newest screenshot takes 300 thousandths of a second or less** (the middle of five tries, with a game
  running). Then bonsAI may check every time the panel opens. If it takes longer, the session stops and asks before
  building lane A a different way.
- **The picker's first picture takes one second or more to appear** (the middle of three tries). Then lane B is
  built. Under one second, lane B is dropped.
- **Sizes of the row above the question box and of the paperclip's menu,** on the live screen. No line to pass;
  lane C builds from them.
- **Whether Steam sends its "screenshot written" signal, and what Steam's Share menu really lists.** Recorded only.
  Nothing in this plan waits on either.

## 6. The checks

**By the rig, on the Deck, with a placed picture** (the stand-in PC cannot run these: Steam's screenshot folders are
somewhere else on Windows):

- **P108F-S0-NEWEST, P108F-S0-PICKER, P108F-S0-ROOM, P108F-S0-NOTIFY, P108F-S0-SHARE:** step 0, as above.
- **P108F-OFFER-01:** place a picture, open the panel on Main. The offer shows. With the recommended look: Up, then
  A. The attached row shows that picture's name, the ring is on the question box, and the presses are counted.
- **P108F-OFFER-02:** with no picture newer than the time limit, there is no offer, and the paperclip's menu is as
  today.
- **P108F-OFFER-03:** with "Read game & screenshot context" off, there is no offer and bonsAI did not look for one.
- **P108F-OFFER-04:** after the picture is attached and the question sent, closing and opening the panel does not
  offer the same picture again.
- **P108F-OWN-01:** paperclip, "Close menu & take screenshot" with a game running, reopen the panel. The picture is
  attached, or offered, as you chose in f3.
- **P108F-PICKER-FAST-01** (only if lane B was built): the picker's first picture appears in under a second, or in
  half of step 0's time, and the pictures still look right on both screens.
- **QA-FREE-PLAY-01 and QA-LOOK-01 on Main,** with the offer showing: every stop the ring lands on is visible, no
  stop twice, and one picture of the tab is looked at on each screen.

**Only you can do** (for the "checks only you can do" page):

- **P108F-HAND-01:** in a game, press Steam + R1, open bonsAI within two minutes, and see your screenshot offered.
  Attach it, ask about it, and read an answer that is about that picture.
- **The Kids lock:** with Steam's own Kids lock on, no offer shows. (The unit tests cover it; the rig cannot switch
  Steam's lock.)
- **One press of Steam + R1 during step 0,** if you are at hand. It only records what Steam sends.

## 7. What could go wrong, and what stops the work

- **The rig cannot make a real Steam screenshot,** so the rig's rows use a placed picture. Only your own check
  proves the real thing end to end.
- **A picture that was not just taken could be offered once:** a file copied onto the Deck, or the clock changed. It
  is only an offer; nothing is attached or sent without your press.
- **The row above the question box is the most delicate part of the D-pad.** A chip must never appear or vanish
  under the ring. That is why lane C is Opus work, built from the Deck's sizes, with a second opinion before it lands.
- **Height.** Option B takes about 30 of the answer's 295 points while an offer waits; D takes about 50.
- **Steam's small copies may look soft on a TV.** The look check on both screens decides; if they do, lane B is
  taken out again and nothing else changes.
- **Another chat is fixing bugs in the same files today** (plan 107). The session reads its briefs first and lands
  after it.
- **What stops the work:** step 0's first line fails; or lane C fails on the Deck twice. Then, with your say, it
  falls back to option A (the menu line), the look with the least D-pad risk.

## 8. Not in this plan

- **Anything inside Steam's own Share or Media screens.** Adding a line to Steam's menus means patching Steam's
  screens, which breaks when Steam updates.
- **The notice after a screenshot** (f4), unless you pick it. Then it becomes a small plan of its own, once step 0
  has shown that Steam's signal arrives.
- **Game recording clips and videos.** A clip's still picture could be offered in the picker one day. The
  permission's name says "screenshot", so that would be a call of its own.
- **Steam's "uncompressed copy" folder.** bonsAI keeps reading Steam's own folders only.
- **Sharing anything out of bonsAI.**
- **A new permission, a new setting, or a new way for the screen to reach the back end.**
- **Tightening which picture files the back end will accept as an attachment.** Noticed in this read and handed to
  the security reviewer as a question; not changed here.

## 9. For the one running the session

- **First acts at go.** Check for other chats' work (new plan files, plan 107's briefs) and whether they touch the
  row above the question box, the ask bar or the screenshot code. Re-check every line in the briefs against the tip.
  Read the usage counters and say the three numbers. Ask the rig for its status: on 2026-11-19 the controller
  board's port did not open from this PC.
- **The session's own model:** Opus at extra-high. It plans the Deck blocks, lands, and writes no code itself.
- **Helpers:** about ten runs in all. Step 0's driver block, the drawing, lanes A and B, lane C with one likely fix
  round, the security reviewer, the bookkeeper twice, and one or two Deck blocks for the rows. At most three at once
  beside the driver; lane C runs alone on its files.
- **Reviewers.** The security reviewer reads lanes A, B and C before they land; its six questions are in the briefs.
  The open-source reviewer is not needed: nothing new is installed, downloaded or licensed. Before lane C lands, ask
  the second opinion, as for every D-pad landing.
- **The bookkeeper is handed:** this plan's share of D145, the rows of § 6, the roadmap entry's moves (Features,
  then Verify with lanes A and C, then Done), one line for the troubleshooting page, and the rig finding. Both the
  roadmap and the testing page are at their size limits today, so it makes room first.
- **Stars.** The roadmap said four when this was written. This build has no Steam integration, no new permission, no
  new setting and no new back-end call. It reads as **three stars**, set by the D-pad work in lane C, and the
  maintainer moved the entry to three on 2026-11-19. Four would fit only if the notice with its switch were built
  as well.
- **Sister plans.** 108a changes how the page moves when the ring moves. If both run in one session, run this
  plan's walk on Main after 108a has landed.
- **At the end,** the two write-ups the maintainer asked for: the code-work summary (files changed, what surprised,
  what would have made it easier), and the plain "how it was built" guide for this feature.
