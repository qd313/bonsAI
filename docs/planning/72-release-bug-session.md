# 72 — The release bug session: settle the bugs before 0.6.0

Written 2026-09-26 as part of [plan 71](71-merge-experimental-into-main.md), the 0.6.0 re-launch. The
maintainer asked for "a list, a plan for a massive bug fix session, and new bugs get checked against the
line". This is that plan. It starts once plan 70 has landed.

**Status: running since 2026-09-27, 11:38 (the maintainer's "go"). Section 2 was re-sorted the same
morning (flow 0) against the roadmap after plan 70 closed; what changed is marked "re-sort 09-27". The
running record is section 7.**

**This plan may sit for a while before it runs.** Whoever picks it up first checks it against the roadmap
and the code, and updates anything stale before starting — the bugs, who has already fixed what, and the
questions in section 6.

Read first: [CLAUDE.md](../../CLAUDE.md); the model table in [AGENTS.md](../../AGENTS.md);
[lessons-learned.md](../lessons-learned.md) § 3 (the Deck) and § 4 (briefing helpers); plan 71 § 5 (the
line); [plan 64](../archive/64-big-verification-session.md), the last session shaped like this one.

---

## 1. The line (agreed 2026-09-26)

A bug blocks the release if a new player, using bonsAI normally, would hit it and it:

1. **traps them** — the controller gets stuck, a screen freezes, the plugin crashes;
2. **loses their chats or settings**;
3. **shows a spoiler they asked to hide**, turns on the microphone by surprise, or leaks something private;
4. **breaks the first ten minutes** — install, setup, the first download, the first answer;
5. **looks plainly broken on the main screen** — the rough edges a player notices straight away.

Everything is sorted into one of four groups:

- **Must fix** — crosses the line. The release waits for it.
- **If there is room** — does not cross the line, but a player could notice it. Fixed before the last call
  if time allows; otherwise listed under "Known issues".
- **Known issue** — ships as it is, named in the release notes when a player might notice it.
- **Behind the scenes** — only affects the people building bonsAI (tests, hooks, docs). Not judged by the
  line; handled in plan 71's clean-up.

**New bugs** found during the session are checked against the same line by the session, written into
section 2 with the date, and go into their group. Nothing jumps the queue because it is new.

---

## 2. The first sort (2026-09-26)

### Must fix

| Bug | Why it crosses the line | Notes |
|---|---|---|
| Down stops half way and the Ask button is out of reach; only a loader restart clears it | Traps the player | Comes and goes. Known trigger: opening and closing Steam's on-screen keyboard on the question box. The one-star "Down does not leave a hidden spoiler block" is probably the same fault. **Re-sort 09-27: joined by "Over Fallout 4, the question box goes dead with no chip pressed" (★★★, plan 70)** — the ring stays in the box while the page's own focus moves on; reopening doesn't clear it while the game runs. |
| **Added 09-27:** a chat opened with RB while a game runs is drawn as history, and Down dies on its question line | Traps the player until the panel is reopened | Plan 70, flow L7. Probably the same family as the row above. |
| **Added 09-27:** walking Down while an answer is still arriving loses the ring | Traps: nothing has focus | Plan 70, flow L10. Fine on a finished answer. |
| The chat summary card sits behind the dock until Down is pressed | Plainly broken, in any long chat | |
| After Stop mid-answer, the ring lands on Voice input — one press from turning the microphone on | Surprise microphone | |
| Left on the chat row leaves the plugin for Steam's side rail | Traps the player out of the plugin | |
| Up under an answer skips whole rows of controls; plus three more slips with older turns open | Traps: parts of the panel become unreachable | Likely one family. Measure first. **Re-sort 09-27: plus two from plan 70** — Up from "Save chat to Desktop" jumps to the top of the turn, skipping the answer; reaching a spoiler cover by Up lands the ring beside it and A does nothing. The first changes shape once Save chat becomes an icon. |
| After "Apply UI scale", nothing holds the ring | First ten minutes (settings) | |
| ~~After thumbs up, nothing holds the ring~~ | | **Done by plan 70** (Helpful keeps the ring on the row). Free play re-checks it. |
| ~~Show details opens behind the dock~~ | | **Done by plan 70** (it scrolls into view above the dock). Free play re-checks it. |
| The live thinking line shows the model's own rule checklist, stray backticks, and a raw "Thinking Process" heading | Plainly broken, on every answer | |
| The voice button's ring is cut off at the panel's right edge | Plainly broken | Small. |
| A thin strip of the answer shows through under the game line at the bottom | Plainly broken | Small. Measure first. |
| The dots under the chat name don't line up — the active dot looks a hair above or below the rest | Plainly broken; the maintainer wants it exact, not "close enough" | Keep the dots (the maintainer's call 2026-09-26). How to measure is in section 4, flow D. |
| A Strategy answer can open by quoting one of bonsAI's own instructions back | Plainly broken — reads like machine text | The maintainer's call 2026-09-26: soften it. A known-cause fix in the question wording. |
| Show details' credit line prints a protected boss's name in plain view | Spoiler shown | **Done by plan 70** (`6d31bc1d`, `8bba1f00`) and checked on the Deck that night, with the maintainer's 09-27 wording ("Sources hidden — open the notes to see them"). Nothing left for this session. |
| Stop unloads the model, so the next question starts slow | Plainly broken feel: every question after a Stop is slow | **Landed 2026-09-26 (`59123c1b`), before this session**, from the model trial. Deck check only: row STOP-KEEPS-MODEL-01. |
| A model downloaded from the first-run picker never joins the list that picks who answers | Possibly the first ten minutes | Check first whether a new player's first answer actually suffers. If not, it drops to "if there is room". |
| Clearing a session while an answer is being written may lose that answer | Loses a chat | Found by reading the code. Check it can still happen now the Session tab changed; if it can, fix. |
| The spoiler family: a withheld boss name leaking in the answer, the thinking line, and the suggestion menu | Spoiler shown | **Done:** passed on the Deck 2026-09-26 in plan 70 (229 reads, the name never showed outside a cover). Nothing left for this session. |
| The troubleshooting hint's Dismiss can't be reached by D-pad | Traps the player | **Done:** passed on the Deck in plan 70. |

### Must fix — the maintainer's own polish list (2026-09-26)

The maintainer asked for these before the release. They count as line 5 (plainly broken on the main
screen), and every one is a layout change, so each is measured on the Deck before and after.

| Item | What "done" looks like |
|---|---|
| The preset chip sits too far above the question box | The chip-to-box gap equals the box-to-Ask-button gap, measured on the Deck at every UI size. |
| The question bubble: empty space on the left, ragged line edges, text too far from the Retry arrow | **Option D from [the drawing](https://claude.ai/artifact/6TGmioi2KdtWM8yKC4cYkF), the maintainer's pick 2026-09-26:** right-aligned text split into lines of about equal length, the bubble shrunk to its longest line, text 3 pixels from the Retry arrow. Two things to check on the Deck first: whether Steam's browser can even out the lines by itself (if not, the plugin measures and does it), and a screenshot with Steam's own font, which can break lines a word differently from the drawing. |
| The "Not helpful" reason chips sit almost one to a row | The five chips under "What went wrong?" share rows instead of taking one each. Measure first what makes each chip so wide (its padding, a minimum width, the 8-pixel gaps), then tighten. **Option, added at the maintainer's yes 2026-09-26: shorter labels.** "Misidentified game/problem" is by far the longest. "Wrong game" is shortest, but the chip also covers a misread problem, not just a wrong game, so "Wrong game or topic" keeps that. "Unfenced spoiler" could become "Showed a spoiler", which is plainer. Only the words on the chip change; what the chip asks the AI to do stays the same. Draw spacing-only and spacing-plus-shorter-labels side by side at true size; the maintainer picks. Before-and-after screenshots on the maintainer's checks page. **Picked 2026-09-27: option E from [the drawing](https://claude.ai/artifact/WhECSTogth2QeMNiXekg2s)** — two rows: "Bad info · Wrong game or topic" over "Spoiled it · Too long · Too short". |
| The chat name's scroll doesn't match the chip scroll | Same speed and same pauses as a long chip label, then both slowed slightly. The chip scroll today: 25 pixels a second, 1.5 seconds before it starts, 1.5 seconds at the end. **Found in flow 0 (09-27):** the chat name does not use Steam's scrolling label at all — it is its own six-second back-and-forth in the chat row's stylesheet, so its speed changes with the name's length. Flow P measures both. |
| Save chat to Desktop becomes a save icon in the chat tab; the "+" gets a clearer icon | **Picked 2026-09-27 from [the drawing](https://claude.ai/artifact/HKZZbRU9wN7Fuw2gUpcJfY): save option B** — a floppy-disk save icon at the row's left end, the mirror of the × at the right; Left from the name lands on it, which also gives Left somewhere to go instead of Steam's side menu. **New chat option 4** — a pencil with the words "New chat"; beside your newest chat, just the pencil. The D-pad path changes, so the free-play walk covers it. |

### Must try once, then sort

These were seen but never reproduced. Each gets a set number of tries on the Deck (flow G). If it
reproduces, it goes to **Must fix**. If not, **Known issue**.

- A faded ghost of the tab bar left over the chip row after touching the screen.
- A tap outside the AI models screen started queued downloads and left the D-pad stuck.
- A chat that is still writing does not look busy from another chat.

### If there is room

- Show details' chip ladder: entering at the first chip leaves the row out of view, and the ladder hides
  under the question box. The maintainer's cure — the Show details line taking the suggestion chip's place
  — is a feature, so it counts as "room" work.
- Older answers lose their "Was this helpful?" row after switching chats.
- Walking down an answer and back up visits different stops.
- The decode chip's typing caret is pale instead of the accent green.
- The chat summary reads oddly in places.
- Deleting a chat whose file is already missing leaves its row in the list.
- Saved answers sometimes have a hidden block's markers written twice. The leak is fixed; the cause is not.
- Knowledge base: four questions still get notes about the wrong subject. (Re-sort 09-27: the "no tip"
  line was retired by the maintainer, `db4b3b4a`; the follow-up naming the wrong boss was fixed by plan 70,
  4 of 4 on the Deck.)
- **Added 09-27, found by plan 70:** a game's own tip is labelled "Shared troubleshooting" in Show details;
  the "Enable local knowledge base" chip showed once while the knowledge base was on; with thinking off the
  waiting spinner can spin through the whole answer; the suggestion chips keep rotating while an answer is
  written; a rotating chip can take a press meant for another; a dismissed troubleshooting hint comes back
  after reopening; three smaller Show details ring slips (the Session tab's last chip, "N earlier" jumping
  to the notes, B on the notes block); nothing holds the ring when the Pull button disappears (the next
  press recovers); the meaning-search hint needs the Ollama tab reopened; a typed command reappears as a
  suggestion chip; a Strategy answer's follow-up choices are sometimes not understood.

### Known issue (as things stand)

- A plugin reload stops a model download in progress (it resumes from where it stopped).
- Focus ring styling differs a little between bonsAI's controls and Steam's own.
- In carousel style, Down once landed on a chip that was mostly off screen (never reproduced).
- Unrelated questions can get game notes attached (already accepted).
- **Added 09-27:** the frame rate while an answer arrives with a game running — 30 to 36 a second, dipping
  into the 20s late in long answers (plan 70 raised it from about 12); with nothing running the decode
  effect slows very long answers to about 37 a second. The Context line can read the wrong thing for a
  moment after reopening.

### Behind the scenes (to plan 71's clean-up)

The walk check calling a stop hidden when an icon only overlaps its box; two timing-sensitive tests that
fail under load; the commit hook rebuilding the wrong copy; docs and test rows that don't match; the saved
Deck walks needing re-saving; twelve checks marked proven with nothing behind them; the voice server that
would cut off a second caller (nothing uses it twice today); the try-order "Reset to defaults" writing a list
where there was none.

### Already fixed, only a Deck check left

Remove greying out after a model answers; the false connection failure at start-up; the ban lookup report
(needs the maintainer's own Steam key).

### Calls only the maintainer can make

All answered 2026-09-26: the dots stay and must line up exactly; soften the Strategy answer's opening;
Stop must not unload the model; hide the protected name in Show details' credit line like the notes
block does. All four are now in **Must fix** above.

### Big features never fully checked on the Deck

The Verify list holds features that shipped weeks ago and still owe their Deck pass, among them named chat
slots, the kids lock, the reply-length cap, and the redrawn tab strip. For a re-launch, anything a new
player meets in the first ten minutes gets its pass in this session; the rest stays on Verify.

---

## 3. Who does what

| Who | Model | Does |
|---|---|---|
| **The session** | Opus 5.5, extra-high | Re-sorts the list. Writes every brief and Deck runbook. Sorts new bugs against the line. Does the D-pad fixes itself, with a Deck measurement in hand. Keeps five lanes busy. Lands every fix, one at a time. Reports to the maintainer. |
| **Deck driver**, one at a time | Opus 5.5, medium | Runs one flow from a runbook. Measures, records, reports in plain words. Never fixes, never edits docs. |
| **Fix lanes**, up to five at once | Opus 5.5 medium (trial result, below) | Fix bugs whose cause is known, each in its own copy of the repo, each owning its own files (table below). |
| **Prep helper** | Opus 5.5, medium (re-sort 09-27: helpers moved to Opus on 2026-09-26) | Writes the next Deck flow's step-by-step runbook while the current one runs, so the Deck never waits for paperwork. |
| **Bookkeeper** | Opus 5.5, low (the `bookkeeper` helper) | Roadmap, testing rows and changelog after every flow; keeps section 2 current. Never commits while a landing runs. |

The D-pad and layout bugs are most of "must fix". By the house rules they are never handed to a helper
without a Deck measurement first. So the session measures first, then fixes the D-pad ones itself and
hands the layout ones to a lane with the measurement in the brief.

### The lanes (added 2026-09-26 for speed)

Five lanes, split so **no two lanes touch the same files**. Each brief carries the exact file list, the
tip it was cut from, and the base check. The session confirms the file lists in flow 0, against the code
as it is then.

| Lane | What it fixes | Needs the Deck first? | Can start |
|---|---|---|---|
| **1 · Downloads and the download permission** | The notice before every download; the new download permission (downloads only, the maintainer's call 2026-09-26; live web search is not part of it), off by default; the recommended-models refresh gated behind it; a downloaded model joining the list that picks who answers | No — built from the code; checked on the Deck after | **Now**, if plan 70 has none of the download files in flight |
| **2 · Chat and Stop, behind the scenes** | Stop keeps the model loaded; clearing a chat mid-answer no longer loses it; deleting a chat whose file is gone removes its row | No | **Now**, same check with plan 70 |
| **3 · The answer's words** | The thinking line's rule checklist, stray marks and raw heading; the softer Strategy opening; the credit line hiding a protected name | No | **After plan 70 lands** — these files are where plan 70's spoiler work lives |
| **4 · The chat area's look** | Question bubble (option D); the "Not helpful" reason chips; the summary card behind the dock; the thin strip under the game line | **Yes** — flow P measurements in the brief | After the first Deck block |
| **5 · The top and bottom rows' look** | Chat dots lined up; the chat name scroll matching the chips; the preset chip's gap; the mic ring cut off; then Save chat as an icon and the new "+" (once the maintainer picks from the drawing) | **Yes** — flows D and P | After the first Deck block |

When a lane finishes, the session reads its changes, lands them one at a time with every check, and
starts the next job in the freed slot, so five stay busy. The D-pad family stays with the session itself,
since those need a measurement read by the one who fixes them.

### Models and effort (the maintainer asked, 2026-09-26)

- **The one running the session: Opus 5.5 at extra-high.** The routing plan's record: extra-high did the
  refactor, the plans and every landing; max bought nothing over it; and on 09-04 a Fable orchestrator
  cost more than all six lanes put together while doing work Opus extra-high does.
- **Lanes: Opus 5.5 medium by default — settled by a trial run on 2026-09-26, before this session.** The
  maintainer asked for Sonnet high, Opus low and Opus medium to be compared on a real fix first, so this
  session does not have to. Same task (Stop keeps the model loaded), same brief, same starting point, each in
  its own copy, reviewed blind. Full table in plan 33 § 4b:

  | | Sonnet 5 high | Opus 5.5 low | Opus 5.5 medium |
  |---|---|---|---|
  | Blind review score | 18 of 25 | 15 of 25 — its fix still unloads on a Stop while the model is "thinking" | **21 of 25, the pick** |
  | Cost at list price | $2.13 | **$0.77** | $1.89 |
  | Minutes / turns | 14.9 / 67 | **7.6 / 16** | 16.4 / 34 |

  So lanes run on **Opus 5.5 medium** (the `bugfix-lane` helper, which now runs Opus medium), and on
  **Opus 5.5 low** (`bugfix-lane-opus-low`) for the mechanical fixes listed below. Screen lanes keep the house rule:
  the measurement goes in the brief, and pixel work stays with the session at extra-high. Every lane adds a
  row to plan 33's table, so the one-task verdict firms up as the session goes. No paired runs are needed
  here any more.

- **Low or medium for each item** (decided by whether the fix needs a judgment, not by stars):

  | Opus low (known cause, one obvious way) | Opus medium (a real decision in it) | The session itself, extra-high |
  |---|---|---|
  | Shorter "Not helpful" chip labels, and their spacing once measured | The download notices and download permission | The chat dots (pixel-exact, needs a measurement) |
  | The preset chip's gap, once measured | The question bubble, option D | The D-pad bugs: Down stopping half way, Left leaving the plugin, Up skipping rows, "Apply UI scale", the ring beside the mic after Stop |
  | The chat name's scroll speed | The thinking-line clean-up (must not hide real content) | |
  | The mic button's ring cut off, once measured | Hiding the boss name in the credit line (spoilers) | |
  | Softer wording for the Strategy opening | Clearing a chat mid-answer (saved chats) | |
  | Deleting a chat whose file is already gone | A downloaded model joining the answer list (settings) | |
  | The Stop fix's one doc correction | The summary card behind the dock; the thin strip under the game line | |
  | | Save chat as an icon and the new "+" (they change the D-pad path) | |
  | | Hiding half-built features for 0.6.0 | |

  Bookkeeping in this session: the `bookkeeper` helper (Opus low). Every test status it changes names its
  evidence file, and the session spot-checks those before they land.

- **Lane 2's Stop fix landed 2026-09-26 (`59123c1b`).** Lane 2 only checks no comment still says a normal
  Stop unloads the model. Then it needs only its Deck check (STOP-KEEPS-MODEL-01).
- **Lane 3's credit line was done by plan 70**, so lane 3 is the thinking line and the Strategy wording.

### Option: code-only lanes in the cloud (the maintainer asked, 2026-09-26)

A cloud session runs on Anthropic's computers, not the maintainer's PC. It cannot reach the home
network, so it can never touch the Deck, the controller rig, the Deck tools or the PC's Ollama. Code-only
lanes can run there; everything Deck-bound stays home.

| Stays on the PC | Can go to the cloud |
|---|---|
| The session itself: sorting, briefs, landing each lane, deploying each batch | Lanes 1, 2 and 3 — no Deck at any point |
| Every Deck flow: measurements, re-checks, free play | Lanes 4 and 5, but only after flow P's measurements are written into their briefs |
| The D-pad fixes (they need the measurement read by the one who fixes them) | |
| Bookkeeping, since it follows each landing | |

**What it takes:**

1. **The maintainer pushes experimental first.** A cloud lane starts from GitHub, not the PC, and
   sessions are not allowed to push. Push again before each new cloud lane, so it starts from the tip.
2. **Each cloud lane pushes its work as its own branch.** The repo is public, so half-finished fixes
   are visible until landed. Branch names say plainly they are release-bug lanes; each branch is deleted
   once it lands.
3. **The session on the PC fetches each branch and lands it** exactly like a local lane: read the
   changes, one landing at a time, every check after each.
4. **Cloud sessions cannot message back yet.** The session checks the lane's branch on a schedule instead
   of waiting to be told. The brief tells the lane to finish with a report file on its branch.
5. **Same briefs as local lanes**, minus the local-only parts (the linked packages folder, the Windows
   hook path). The automatic tests already pass on a clean Linux machine, which is what the cloud uses.

**What it buys and what it does not:** local lanes already run side by side, so the cloud adds no speed.
It takes load off the PC, and a cloud lane can be started from a phone. To only *follow and steer* the
session from a phone, Remote Control on the PC session is enough, and keeps the Deck in reach.
**Recommended:** run on the PC with Remote Control; send lanes 1 to 3 to the cloud only if the PC is
struggling or the maintainer is away from it.

---

## 4. The flows, in outline

**The Deck's order, so it never sits idle.** Measurements first, because every layout lane waits on them.
Then the checks that don't depend on any fix in flight, while the lanes build. Then re-checks as batches
land.

| Deck block | Next to it, off the Deck |
|---|---|
| **Flow 0** — no Deck | Lanes 1 and 2 already building (they may have started before plan 70 finished) |
| **1st block: flows A, D and P** — every measurement in one sitting | Lanes 1 and 2 keep building; lane 3 starts once plan 70 has landed; the prep helper writes the next runbook |
| **2nd block: flows S and G** — spoiler and first-ten-minutes passes, the "try once" bugs. None of these waits on a fix. | Lanes 4 and 5 start with the measurements; the session works on the D-pad family; finished lanes land one at a time |
| **Then flow F, once per batch of landings** — one deploy per batch, never mid-flow | The next jobs fill freed lane slots; the bookkeeper writes up the last flow |
| **Last: flow Z**, free play over the whole panel | Anything found goes through the line; "must fix" goes straight to a free lane |

- **Flow 0 — re-sort (no Deck).** Re-read the roadmap after plan 70; move what plan 70 fixed; close retired
  entries; write steps for any row that has none; confirm the "must fix" list with the maintainer.
- **Flow A — measure the D-pad and layout family.** One walk per bug with the focus recorder, so every fix
  starts from a measurement. This is the first Deck block.
- **Flow D — the chat dots, measured to a tenth of a pixel.** Every dot has the same box in the code, so
  measuring the boxes will say they line up. What the eye sees is the lit pixels: the Deck draws about 1.28
  screen pixels per page pixel, so each dot is smoothed a little differently, and the brighter active dot
  shows it most. So the driver takes **full-size screenshots** (no scaling), and the session works out each
  dot's lit-pixel centre, up and down, to 0.1 pixel. Every state: plain, active, active with the row lit,
  the "+" marker, writing, unread. Both screens, since the maintainer switches between the Deck and a monitor,
  and every UI size. Also the gap between the dots and the chat name. **Pass: every dot's centre on the same
  line within 0.1 pixel, on every screen, before and after.** The before and after crops go on the
  maintainer's checks page for a look by eye, because the maintainer is the final judge of "sloppy".
- **Flow P — the polish list, measured.** One pass of screenshots and gap measurements for the
  maintainer's polish list before any change, and again after. Same rule as the dots: measure what is
  painted, not just the boxes.
- **Fixing, in parallel** — see the lanes in section 3. The session takes the D-pad fixes; lanes take the rest
  (the thinking line, Clear during an answer, the try-order join, the small layout items once measured).
- **Flow F — re-checks after each batch**, with every saved walk replayed so a new fix cannot quietly break
  an old one.
- **Flow G — the "must try once" bugs**, one set of tries between other flows.
- **Flow S — the spoiler re-checks and the first-ten-minutes feature passes.**
- **Flow Z — free play.** A person-like walk of the whole panel at the end, as every Main-tab change owes.
  Anything found goes through the line.

---

## 5. Rules for this session

- **The line decides.** A new bug is sorted, written down with the date, and put in its group. A "must fix"
  never quietly becomes a known issue — only the maintainer can move it.
- **A fix that fails on the Deck twice** moves up one model tier with the measurement in hand, as the house
  rule says. If it fails again, it comes to the maintainer.
- **No reshaping of code** in this session, only fixes. Reshaping is what turns up bugs late.
- **The last call is Friday 2 October 2026** (the maintainer's "pencils down", set 2026-09-27). After it, only
  "must fix" work lands. The maintainer reviews the final list of bugs after this session.
- **The session's final output** is the "Known issues" list for the release notes, in plain words.

---

## 6. Questions for the maintainer

1. The calls in section 2 — all answered 2026-09-26. The question bubble is option D (2026-09-26). The save
   icon, the new "+" and the reason chips were drawn and picked 2026-09-27 (save B, pencil with "New chat",
   chips E).
2. Is the "must fix" list right? Anything missing that you have hit yourself? — **Confirmed 2026-09-27.**
3. The last-call date — **Friday 2 October 2026**, set 2026-09-27 ("pencils down"). The must-fix list in
   section 2 was confirmed the same day ("looks good").
4. One long session or two shorter ones? **Updated 2026-09-26 for the time crunch:** one continuous
   session, run as the waves in section 4, with the Deck busy the whole time and lanes 1 and 2 started
   early. The first Deck block's measurements still come first, but nothing else waits for a second
   session.
5. Starting lanes 1 and 2 before plan 70 finishes — **yes, the maintainer, 2026-09-26.** Before cutting
   either lane, check with plan 70's session that none of the lane's files are in its flight, and land
   between plan 70's landings, never during one.

---

## 7. Progress log

**2026-09-27**

- **11:38 — "go".** Plan 70 had closed at about 07:00 (`71225356`); its Deck lock was gone by 06:52. The
  session took the Deck lock. The maintainer's picks came with the go: save option B, the pencil with "New
  chat", reason chips option E.
- **11:40 — flow 0, the re-sort.** Section 2 updated against the roadmap: four items plan 70 finished are
  marked done (thumbs-up ring, Show details behind the dock, the credit line, the troubleshooting hint's
  Dismiss); four ring bugs plan 70 found join "must fix" (Fallout 4's dead question box, the RB-opened chat
  over a game, Down while an answer arrives, and two Up slips folded into the Up family); plan 70's smaller
  finds go to "if there is room" or "known issue". The chat name's scroll was found (its own six-second
  back-and-forth, not Steam's scrolling label). Stale text fixed: helper models, lane 2's Stop fix, lane 3's
  credit line.
- **11:44 — lanes 1, 2 and 3 started**, each in its own copy cut from `71225356`, all Opus medium
  (`bugfix-lane`). Lane 1 (downloads and the download permission) agent `a85b36afbb6dc517e`, copy
  `p72-lane1-downloads`; lane 2 (clearing mid-answer, deleting a missing chat, the Stop comments) agent
  `a6821586b0155153c`, copy `p72-lane2-chat`; lane 3 (the thinking line, the Strategy wording) agent
  `aeb60f94abc1851c6`, copy `p72-lane3-words`. Lane 1 owns the shared files (`main.py`, the RPC type list,
  the plugin's entry file); the other two keep any change there to a few lines and name it.
- **11:46 — the Deck is asleep** (no answer over the network). Block 1's runbook for flows D and P is
  written and waits for it.
- **11:52 — lanes 4 and 5 started early** on the parts that need no new Deck measurement, both Opus medium.
  Lane 4 (reason chips option E; the summary card behind the dock, already measured by plan 68) agent
  `a02f954d3fc964ee1`, copy `p72-lane4-chatlook`; lane 5 (the chat name's scroll matching the chips then 20%
  slower; save icon B and the pencil "New chat", removing the "Save chat to Desktop" row) agent
  `afe87837b4480a04b`, copy `p72-lane5-rowlook`. Their measured jobs (question bubble, bottom strip, chip gap,
  mic ring) follow by message after flow P. Block 1's second runbook (flow A) is written too.
- **12:00 — the Deck woke** (on the monitor; its own screen off; build matches the checkout). Block 1 part 1
  (flows D and P) started with the deck-driver, agent `a13ca274642063dcc`. The maintainer confirmed the
  must-fix list and set the last call: **Friday 2 October**.
- **12:08 — lane 2 finished and landed** (`b7339ea4`, `1069c8f1`), every check green after each: Settings'
  Clear session mid-answer now keeps what a Stop would have kept in that chat (it could still happen: the
  clear reset the waiting state before stopping the answer, so neither save ran); deleting a chat whose file
  is gone removes its row. No Stop comment still said it unloads; one testing row (STOP-PARTIAL-01) does —
  for the bookkeeper. Lane 2's slot is free.
- **12:17 — lane 3 landed** (`d44b6e78` thinking line, `9dd6db16` Strategy opening). One landing check failed
  on the start-up test's 20-second limit while five copies ran tests at once; it passed alone in 10 s, and
  the landing script now retries that test once. Lane 6 started in lane 2's slot (agent `a15aaa90d77e73bfc`,
  copy `p72-lane6-room`, Opus medium): a game's own tip labelled "Shared troubleshooting", a typed command
  turning up as a suggestion chip, and the cause of doubled hidden-block markers. A read-only helper
  (agent `a1a57e718acb89c9d`) drafted the working / half-built / broken list plan 71 needs.
- **12:20 — first readings from flow D (monitor, handheld):** in every state measured — plain, row lit,
  writing, unread, the new-chat position — every round dot, the active one included, is painted on the
  same five rows of screen pixels with the same shape; only its brightness differs.
- **12:22 — lane 4 landed** (reason chips E, the summary card). Lane 4 got the question bubble (option D) by
  message: Steam's browser supports balanced lines, so only the shrink-to-longest-line needs measuring in
  code. Lane 5 got the chip gap (8.0 px above the box against 2.8 px below it) and the mic ring (clipped
  2.8 px past the panel's edge, and at the bottom).
- **12:30 — block 1 part 1 (flows D, P) finished**, monitor only, both UI sizes; settings and chats restored
  byte for byte. Measured: dots (every state), chip gaps (same at both sizes), question bubble, scroll speeds
  (chat name about 40 px/s out with a 300 px/s rewind on a 6 s loop; chip 27.4 px/s after 1.75 s, a ticker),
  mic ring, bottom strip (not caught). The reason chips and the save row's "before" picture could only be
  taken under an answer asked on the chat still in view (folded into part 2). The screenshot script asks
  for a password; the rig's own capture was used.
- **12:30 — the dots, worked out from the painted pixels.** Every round dot is on the same rows in every state
  at both sizes. What makes the active dot look a hair low: with the D-pad on the row, the chat name's glow is
  clipped to the name's box, and that box overlapped the dots by 0.2 px, so a faint lighter band sat on
  (couch) or right against (handheld) the dots' top row. The dim dots' top rows brighten and their visual
  centre rises about 0.1 screen px; the bright active dot barely moves. Also the "+" (a text glyph) sat one
  screen pixel low with the row lit at handheld. Fixed by the session (`e3e849bd`): the name's line lifts
  1 px by paint only, and the "+" is two bars in its own dot box. Re-measure both screens in flow F.
- **12:30 — new sightings sorted:** the dots re-sort newest-first when an answer lands (by design — the
  maintainer's call pending); at couch size the dock ran 2.5 px past the page bottom (closed by the UI size
  hide below); chips stopping rotation after a minute is most likely the dimmed screen; the hollow circle in
  the title is the "writing" spark, as designed.
- **12:35 — the maintainer's calls on the half-built list:** hide the six "[beta]" chips and any other chip
  for a skipped feature ("Open Steam Input config", the quick-launch chip, Find LAN's two); drop the
  quick-launch shortcut chip and its setup commands (hidden unless the Developer tab is on); **keep** the
  Steam ban lookup, its chip reworded in plain words; hide the UI scale section (**hiding counts as the fix**
  for "after Apply UI scale, nothing holds the ring"); hide Find LAN. Lane 8 (agent `a24196b3bf9627722`) and
  lane 7 (agent `a0ec531205a9fcd13`, Opus low: the three untrue first-run messages) started. Lane 5 calls:
  one shared 2 px chip gap (a stylesheet at 401 lines, recorded, not squeezed); mic ring: icons 5 px in
  from both sides and the icon row 5 px taller so all three rings show whole. Still open with the
  maintainer: whether the ban lookup's key box moves onto the Permissions tab.
- **12:44 — landed:** lane 4's question bubble (`59574cfe`), lane 7's three first-run messages (`5ebac341`),
  lane 6's tip label (`67216a4d`: a game's own Deck tip is credited under that game).
- **13:00 to 13:30 — landed:** lane 6's streaming fix (`8753cb7f`); lane 5's four (`bdd19507` name scroll like a
  chip, 20% slower; `dfd133c9` save icon B and the pencil "New chat", the Save row gone, Left claimed on the
  whole row; `0dde6860` chip gap = box-to-Ask gap; `810cb160` corner icons' rings whole, dock still shorter);
  lane 1's three (`409cd3aa` downloaded model joins the try order; `e4715d5a` "Internet downloads"
  permission, off by default and on old settings files, the kids lock forces it off — one hand-merged clash
  with lane 5 in the D-pad name list; `ed022b89` a notice before every download); lane 6's four (`7ea4f378`
  typed commands never rotate as chips; `74e8fc7b` a one-line hidden block is covered and opens onto its
  text — before, it opened onto "undefined" or showed openly; `7b8b5139` the ban chip reads "Check Steam
  players for bans"; `d2e5e98e` Copy and Read aloud no longer give a one-line hidden block away); the
  session's dots fix (`e3e849bd`).
- **13:15 — block 1 part 2 (flow A) finished**, monitor, old build; settings and chats restored. **The stuck
  panel** did not happen, 0 of 3 with the keyboard trigger and none over Fallout 4; **the RB-opened
  chat over a game** walked cleanly; **Down while an answer arrives** never lost the ring. These stay on
  "must fix" as comes-and-goes, watched in every later block. **After Stop** the ring was ON the mic (Stop
  and Voice input are one corner button; 3 of 3). **Left on the chat row** left bonsAI from the name and the
  new-chat spot (fixed by lane 5's row). **The Up family:** Up from Show details skipped the reason chips, Up
  from Read aloud skipped the choice buttons, Up from the answer skipped the question row. **New:** after
  Not helpful the reason chips appeared behind the dock. **Apply UI scale** lost the ring completely (closed
  by the hide). **The thin strip** under the game line did not show with answer text behind the dock — not
  reproduced; watched in free play. Sightings: opening the plugin after a reload took 3 to 4 tries (rig); a
  stopped answer wandered off topic once; Up from Ask alternates between the mic and the paperclip.
- **13:48 — landed:** the session's Stop fix (`66d60b40`: Stop hands the ring to the question box, like a
  send; the ask bar's size limit raised by that one line, with its reason); lane 8's five (`169edb07`
  unfinished chips hidden — hand-merged with lane 6's command filter, both kept; `12227980` UI scale section
  only with the Developer tab on, a player always loads Handheld; `4dc2fbdc` Find LAN only with the
  Developer tab on; `8b27e38e` the shortcut-setup commands answer one plain line without it; `642634dc`
  contracts note); lane 4's `8a832ccb` (the "What went wrong?" block scrolls above the dock by itself).
  Lane 9 (agent `adeec41da0273ec2e`) finished the Up family in three commits; landing next, with one
  hand merge against lane 4's reveal in the chip rows.
- **13:50 — a slip, recorded:** a reset used while testing which lane 9 commits clash also discarded this
  log's unsaved entries since `20837fbf`; they were rewritten from the session's own notes the same minute.
  No landed code was touched. Lesson: never reset the shared checkout with uncommitted work in it; commit the
  plan log right after each entry.
- **13:59 — everything so far is on the Deck.** Lane 9's three landed (`8294e75b` question row, `29c0b075`
  choice buttons, `9feef4e1` reason chips — the last hand-merged with lane 4's reveal in the chip rows; 50
  tests across both pass). The combined tree put one more file over 400 lines (the answers' D-pad map, +21
  lines of routing): recorded 28 with the reason, not squeezed; the focus check tightened 24 -> 22
  (`0065fccb`). Deployed `0065fccb` (md5 `167064d0…` both sides). Block 2 part 1 (flow F1) started with a
  new driver, agent `ab54c0138d5d2c91b`; part 2 (F2) follows.
