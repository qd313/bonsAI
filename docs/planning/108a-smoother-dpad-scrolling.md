# 108a — Smoother D-pad scrolling: the plan

**Status: READY for the maintainer's read, 2026-11-19. Planning only; nothing is built.** One drawing you can press
and one measurement on the Deck come before any code. The build after them is small: one helper, one landing.

**Where to pick up.** Read §§ 1, 4 and 5. Answer the four calls in § 4 (or say "yes to all"), then say "Run plan
108a" in a new chat on the PC. The drawing and the measurement both start at go; the build waits for your pick on the
drawing and for the measurement's numbers.

**Files for this plan:** the briefs, [assets/108a-lane-briefs.md](assets/108a-lane-briefs.md) (the drawing, the
measurement with its test script, the build, the checks, the paperwork), and the shared helper rules,
[assets/108-helper-rules.md](assets/108-helper-rules.md). Evidence files: `plan108a-<ROW>.json` in the workshop's
test-evidence folder. Its sister plans are 108a to 108g; the calls below are filed together under decision D145 and
the checks are named `P108A-…`.

**The roadmap entry:** ★★★ `[focus]` **Smoother D-pad scrolling: the page snaps to an option** — "OPEN, reported
2026-10-13 by the maintainer. Moving the ring makes the page snap, which is jarring. Ideas: a smooth glide, or a
short blur during the move. Is a blur over-engineering? Decide after measuring. Related: the Verify item about the
page moving at every press."

Written by a planning chat (Fable 5.2) on `experimental` at tip `28306e896`. No older plan existed for this entry.
It was written from the history of two closed entries about the same pages, the notes inside the code, three
evidence files from October, and a read of the code as it is today.

---

## 1. What you would notice when this is done

- You walk down a long tab with the D-pad: Settings, Developer, the Ollama tab, Search, Permissions or About. When
  the ring nears the edge and the page has to move, **the page slides to its new place in about a sixth of a
  second.** Today it is simply somewhere else on the next frame.
- Nothing else changes. The page still stays put for the presses in between. It moves no further than today and
  stops in exactly the same places. A press is never held back by the motion: press again mid-slide and the ring
  moves at once.
- With Steam's own **Reduce Motion** switched on, the page moves in one go, as today.
- The Main tab (walking through an answer) is not changed in this first step. See call a1.

## 2. What was already written down, and what has gone stale (checked against the code on 2026-11-19)

**The history, in order**

- **10 October.** The long jumps on these tabs were fixed (the largest press on Settings went from 326 points to
  116). You tried it on the Deck's own screen: better, not right yet. The notes of that day record that you wanted "a
  smooth glide instead of the current judder". ([the older notes](../archive/roadmap-details-closed.md#walking-settings-and-developer-with-the-d-pad-the-page-moves-at-every-press-then-jumps-at-the-end))
- **11 October.** A second fix: the page stays still while the ringed row is comfortably in view, and turns by one
  step when it is not. The glide was left out on purpose, and the entry said so: "The maintainer's wish for a smooth
  glide is not measured."
- **13 October.** You filed this entry.
- **16 October.** The entry about the page moving at every press was closed, on the rig's run on the Deck's own
  screen and on your word. ([the closed entry](../archive/roadmap-bugs-fixed.md#walking-settings-and-developer-with-the-d-pad-the-page-moves-at-every-press-then-jumps-at-the-end-closed-2026-10-16))
- **22 October.** A different motion, the slide when you change tabs with LB and RB, was drawn as
  [mock-ups](../demos/tab-switch-mockups.html) first, you picked one, it was built, and you closed it "as they are".
  It is the pattern this plan copies.

**Still true**

- **The page moves in one frame.** On the Deck's own screen, walking Settings with every section open, 7 of 26
  presses moved the page, each by 137 or 138 points at once
  ([14 October run](../../../bonsAI-workshop/test-evidence/plan93-P89-TAB-WALK-OWN-SCREEN-SETTINGS.json)). An earlier
  frame-by-frame reading said the same: "most presses move the pane in one frame"
  ([11 October](../../../bonsAI-workshop/test-evidence/plan89-M1-TAB-WALK.json)). The one place in the code that
  moves these pages has not changed in kind since.
- **Why it is instant, as the code's own notes tell it.** Just after a control takes the ring, Steam looks at it. If
  it sits outside Steam's comfortable band (116 points clear at the top of the pane, 80 at the bottom), Steam slides
  it into view itself, sometimes by half a screen. bonsAI moves the page first, at once, so Steam finds nothing to
  do. A slow move by bonsAI would still be under way when Steam looks, and Steam would add its own on top.
- **Steam's own move is a glide.** It starts about a thirtieth of a second after the ring lands and lasts about a
  sixth of a second. That is the feel bonsAI's instant move replaced.
- **bonsAI already has one glide of its own** that does not fight Steam: the boxes under the Show details chips on
  Main. It works because it ends exactly where Steam's own glide would end.

**Stale**

- **"Related: the Verify item about the page moving at every press."** That item is closed (16 October). Nothing
  waits in Verify for this entry. The other planning chat's bug and Verify sweep (plan 107) has nothing of this to
  take. The two can still meet in one file; § 7 says how that is handled.
- **The tabs changed shape around the time you filed the entry.** Since mid-October they are folded: rows one line
  high, a help strip at the bottom, and a page step of a third of the pane instead of a half. The numbers from 11 October
  (moves up to 363 points, on the monitor) are no longer what a person sees. The 14 October numbers are.
- **bonsAI has no motion setting of its own any more.** The last one, for the suggestion chips, went in plan 105.
  Every motion in bonsAI now follows Steam's own Reduce Motion switch.

**Never written down**

- Whether Steam leaves the page alone when bonsAI only **draws** a slide (the page is already in its new place and
  the picture catches up). Nobody has tried it. It is the question the measurement answers.
- What a slide, a fade or a blur costs the panel in frames, with and without a game running.
- Whether your complaint also covers the Main tab and the small boxes of text that scroll a step at a press.

## 3. How it works today

The page moves at a D-pad press in three different ways. Only the first is in this plan's build.

1. **The six plain tabs** (Search, Ollama, Settings, Permissions, Developer, About). One piece of code decides, at
   the moment the ring lands. If the ringed row is inside the comfortable band, nothing moves. If not, the page
   turns by one step, about a third of the pane (138 points on the Deck's own screen), in a single frame. That is
   the snap. It happens on about one press in three or four.
2. **The Main tab.** Walking through an answer, and lifting a control out from behind the question box, also write
   the page's place at once. They do it from several places, re-check three times in the second after the press,
   and share the page with Steam's own glide.
3. **Small boxes of text** (the reasoning block, the summary card, the words of a confirmation box). Each press
   moves the words by a fixed step at once.

Leaving the plain tabs to Steam alone is not an option: that was October's bug. Steam put a control in the middle of
the pane, up to half a screen at one press.

## 4. Calls for you before anything is built

**Already locked, so not asked again**

- **How far and how often the page moves on these tabs stays as it is.** You closed that on 16 October, and said on
  11 October that the page moving on every second press is fine
  ([call 20](../audit/maintainer-decisions-locked.md#d128--locked-2026-10-11-raised-2026-10-11--plan-89-the-bug-list-and-the-verify-list-as-close-to-empty-as-they-can-get-the-fifteen-calls),
  [call 5](../audit/maintainer-decisions-locked.md#d131--partly-locked-2026-10-16-raised-2026-10-14--plan-93-report-the-nine-questions-on-the-report-page)).
  This plan changes only how the move looks.
- **A new motion is drawn first, you pick, then it is built.** Your rule for the tab slide
  ([call 1](../audit/maintainer-decisions-locked.md#d134--locked-2026-10-22-raised-2026-10-22--plan-97-the-bug-list-and-the-verify-list-toward-zero-the-second-sweep-the-ten-calls)),
  applied here too.

**The four calls**

- **a1. Where it goes first.**
  (a) The six plain tabs only. (b) The Main tab and the small text boxes in the same go.
  **Recommended: (a).** On the plain tabs one place moves the page, so it is one small, safe change you can feel on
  the Deck before deciding about the rest. Main moves the page from many places and would need its own measurement.
  Left unanswered: (a).
- **a2. How the move should feel. Needs a drawing first.** Not asked in words. A tab on mock-up board 7 lets you walk
  the same list with the arrow keys under each choice: today's jump; a glide (at three speeds); a short hop, then a
  glide; a jump with a quick fade; a jump with a quick blur. Mark Like on every one you could live with and say which
  comes first. The build takes the first one on your list that the Deck measurement allows (§ 5).
  Left unanswered: the measurement still runs, and nothing is built.
- **a3. While a game is running.**
  (a) The same motion, unless it costs the panel more than 5 frames a second; then it is held while a game runs, the
  way the tab's page slide is held today. (b) Always held while a game runs. (c) Always on.
  **Recommended: (a).** You open the panel mid-game more than anywhere else, so it should move there if it can
  afford to. Left unanswered: (a).
- **a4. The Reduce Motion check.** Steam's Reduce Motion switch lives in Steam's own settings. In plan 70 you let the
  Deck driver switch it on for three checks and off again; in plan 61 it stayed on your own page.
  (a) The driver switches it on for one check and back off, reading the switch before and after. (b) It stays on
  your page. **Recommended: (a).** It is one check and it is put back. Left unanswered: (b).

## 5. The build, in order

| Step | What a person gets | Stars | Who does it | Waits on | Proved by |
|---|---|---|---|---|---|
| **M** | The drawing: one tab on mock-up board 7 | ★ | An Opus helper, medium or high | go | your pick (a2) |
| **0** | The measurement on the Deck | none | The session writes the steps; the Deck driver (Sonnet at medium) runs them | go, and the Deck being free | P108A-M-TODAY, P108A-M-PROBE, P108A-M-GAME |
| **G** | The picked motion on the six plain tabs | ★★★ `[focus]` | One Opus helper at extra-high | your pick, step 0's numbers, and plan 107's work on these tabs landed | its tests; P108A-GLIDE-01 to 05 |
| **D1** | The checks on the Deck | none | The Deck driver | G landed | § 6 |
| **K** | The paperwork | ★ `[docs]` | The bookkeeper (Sonnet at medium) | each step | none |

M and step 0 run at the same time; neither needs the other. G is one helper and one landing. Main and the small
text boxes are not a step here (call a1).

**Step 0, the measurement.** On the Deck's own screen, the screen you made the complaint on. The steps and the test
script are in the briefs. It has three parts, and its pass lines are written here before anything is measured.

1. **Today, as it is.** Walk Settings, Developer and the Ollama tab down and back up, and a long answer on Main. For
   every press a recorder in the page notes: did the page move, how far, over how many frames, and how long after
   the ring moved. **The line:** there is a snap to fix if any press moves the page 20 points or more in a single
   frame. (October's reading: 7 presses of 26, each 137 or 138 points.) If there is none, nothing is built and the
   entry comes back to you with the numbers.
2. **Each choice, drawn by a test script.** Nothing is built for this. A short script in the page draws each choice
   on top of today's jump: the full glide, the hop then glide, the fade, the blur. The same walk is pressed under
   each. **The line that matters most: does Steam leave it alone?** After every press that turns the page, the
   page's place must not change again in the next second and a half (less than 1 point), and the ringed row must end
   within 1 point of where the same press ended with nothing drawn. A choice passes with no failure in at least 12
   page-turning presses each way. One failure and that choice is out.
3. **What it costs.** With nothing running, a choice must keep the panel at 45 frames a second or more during the
   move, with no gap between two frames longer than a twentieth of a second. With a game running, it may cost no
   more than 5 frames a second against the same presses with nothing drawn; if it costs more, it is held while a
   game runs (call a3).

| What step 0 finds | What is built |
|---|---|
| The full glide passes | Your first pick as drawn. If that is the glide, at the speed you picked |
| Steam adds a move of its own to the full glide; the hop then glide passes | The hop then glide, if you marked it Like. Otherwise the fade or the blur |
| Steam upsets both glides | The fade or the blur, whichever you liked and passes the frame line. If you liked neither, nothing is built and the entry stays open with the numbers |
| A choice passes with nothing running but costs too much with a game | It is built, and held while a game runs |
| A choice fails the frame line with nothing running | It is not built |

## 6. The checks

**By the rig** (the Deck's own screen unless said; the session writes the block's steps from the briefs)

| Row | What is pressed | What must be seen |
|---|---|---|
| **P108A-M-TODAY** | Step 0, part 1 | A measurement: a table per tab. No pass or fail |
| **P108A-M-PROBE** | Step 0, part 2 | A measurement: for each choice, "Steam left it alone" yes or no, and the frames |
| **P108A-M-GAME** | Step 0, part 3, a game running | A measurement: frames with and without each choice |
| **P108A-GLIDE-01** | Settings and Developer, every section open, 26 presses down and 26 up, a second apart | Every page-turning press is drawn over the picked length, give or take 40 ms. The page's place changes once per press and not again. Every press ends where it ended in P108A-M-TODAY, within 1 point. No move larger than the largest in P108A-M-TODAY |
| **P108A-GLIDE-02** | Ten Down presses as fast as the rig sends them, on Settings | Two seconds later the ring and the page are where ten slow presses leave them, within 1 point. No press lost |
| **P108A-GLIDE-03** | Twelve presses each way on Settings with a game running | What call a3 and step 0 settled: the same motion within 5 frames a second of no motion, or one-frame moves |
| **P108A-GLIDE-04** | The Developer switch "Open sections as you walk" on, the four landings of row P105-SECTIONS-AUTO-01 | The ringed row stays within 2 points on every frame, as that row asks. Nothing is drawn sliding |
| **P108A-GLIDE-05** | Search, the Ollama tab, Permissions and About, down and back up | Every ringed control fully in view a second after its press; the page's place changes once per press |
| **P108A-REDUCED-01** | Call a4 (a): Steam's Reduce Motion on, twelve presses on Settings, then off again | Every page move takes one frame. The switch reads as it did before |
| **QA-LOOK-01** | The look check on each of the six tabs, both screens | No finding |

The free-play sweep of the Main tab (QA-FREE-PLAY-01) is not owed: this plan does not touch Main.

**Only you can do these** (for the "checks only you can do" page)

- **P108A-EYE-01.** On the Deck's own screen, walk Settings and Developer down and up, with no game and with one.
  Does the page move the way you picked on the drawing? Your word closes the entry.
- **P108A-REDUCED-01**, if call a4 is (b): switch Reduce Motion on in Steam's settings, walk Settings, and see the
  page move in one go.

## 7. What could go wrong, and what stops the work

- **Steam adds its own move to a drawn glide.** Then the full glide is out. The hop then glide is made so the ringed
  row is never drawn outside Steam's band; if Steam upsets that too, the fade and the blur move nothing and cannot be
  upset. The table in § 5 covers each case.
- **The test script draws on Steam's page.** The rig's own rule is "read, do not press things by script". This is
  the one exception, and only to measure Steam: no check is ever passed on it. If the second opinion says no, part 2
  is replaced by building step G behind a test switch that is off for everyone, and measuring that. It costs one
  helper run before the numbers exist.
- **The rig reads boxes straight after a press.** A sweep would catch the page mid-slide and report a control cut
  off. Rows that read a box wait a second after the press. This is written into each row.
- **The other planning chat's sweep (plan 107) works on the same tabs.** Step G is cut from the tip only after any
  plan 107 work on these tabs has landed, and its brief is re-read against the tip first.
- **Fast presses.** A press during a slide ends the slide at once. If that looks rough in P108A-GLIDE-02's video,
  it comes back to you as a finding, not a silent fix.
- **What stops the work:** a choice failing the frame line with nothing running; Steam upsetting every moving
  choice while you liked no still one; or two failures of step G on the Deck, after which the second opinion is
  asked before a third try.

## 8. Not in this plan

- Changing how far or how often the page moves. That is locked (§ 4).
- The Main tab's answer walk, the lift above the question box, and the small text boxes. The briefs list where each
  lives, for a later plan, if you ask for it after feeling the tabs.
- A long answer following into view in small jumps while it writes. That has its own entry in Verify.
- Having Steam do the gliding and only steering where it lands. It would be the truest glide, but it needs Steam's
  exact rule, and nobody knows it: the tests model it three ways for that reason. Step 0's recordings are kept so a
  later plan can start from them.
- The page following the ring at every press. You asked for the opposite in October.
- A setting for any of this. It follows Steam's Reduce Motion, and no new setting is added.

## 9. For the one running the session

- **Model.** Opus at extra-high plans the blocks and lands (three stars, focus work). Not Fable. Step G is an Opus
  helper at extra-high, started only with step 0's numbers and your pick written into its task.
- **First acts at go.** Fetch, and read `git status` for the other chats' files. Re-check every line number in the
  briefs against the tip. Read the usage counters and say the three numbers. Ask whether another chat is driving the
  Deck, and read the Deck's status. Then start helper M, and write step 0's block for the driver.
- **How many helpers.** Never more than two at once: M alongside the Deck driver, then G alone. In all about four
  helper runs (M, one fix round for M, G, one fix round for G), two Deck blocks, the bookkeeper twice, and one second
  opinion.
- **Reviewers.** No security read and no open-source read are needed: nothing new is read from disk, no permission,
  no download, no new dependency. **A second opinion (Fable at medium) is asked before step G lands**, as for every
  D-pad landing since plan 106; its questions are in the briefs. It is also asked once before step 0's part 2, about
  the test script.
- **The bookkeeper is handed:** the open rows of § 6 at go; decision D145's calls a1 to a4 as you answered them; the
  move of the roadmap entry to Verify when G lands, and to Done on your word; a line in the focus guide saying page
  turns on these tabs are drawn, and that a box is read a second after a press.
- **At the end, the two write-ups you asked for:** the summary of the code work (files changed, what surprised us,
  what would have made it easier), and the plain "how it was built" guide.
- **Stars.** Three is right for the first step: small in code, but the same pages failed on the Deck twice in
  October before a measurement fixed them. If call a1 is (b), it is four.
