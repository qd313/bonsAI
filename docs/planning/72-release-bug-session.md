# 72 — The release bug session: settle the bugs before 0.6.0

Written 2026-09-26 as part of [plan 71](71-merge-experimental-into-main.md), the 0.6.0 re-launch. The
maintainer asked for "a list, a plan for a massive bug fix session, and new bugs get checked against the
line". This is that plan. It starts once plan 70 has landed.

**Status: draft. The sort in section 2 is a first pass from the roadmap as it read on 2026-09-26 in the
afternoon. Plan 70 was fixing some of these the same day, so the session re-sorts on its first morning
(flow 0) before any work starts.**

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
| Down stops half way and the Ask button is out of reach; only a loader restart clears it | Traps the player | Comes and goes. Known trigger: opening and closing Steam's on-screen keyboard on the question box. The one-star "Down does not leave a hidden spoiler block" is probably the same fault. |
| The chat summary card sits behind the dock until Down is pressed | Plainly broken, in any long chat | |
| After Stop mid-answer, the ring lands on Voice input — one press from turning the microphone on | Surprise microphone | |
| Left on the chat row leaves the plugin for Steam's side rail | Traps the player out of the plugin | |
| Up under an answer skips whole rows of controls; plus three more slips with older turns open | Traps: parts of the panel become unreachable | Likely one family. Measure first. |
| After "Apply UI scale", nothing holds the ring | First ten minutes (settings) | |
| After thumbs up, nothing holds the ring | Controller lost after a common press | Plan 70 is fixing it; re-check only if it lands. |
| Show details opens behind the dock, so it looks like nothing happened | Plainly broken | Plan 70 is fixing it; re-check only if it lands. |
| The live thinking line shows the model's own rule checklist, stray backticks, and a raw "Thinking Process" heading | Plainly broken, on every answer | |
| The voice button's ring is cut off at the panel's right edge | Plainly broken | Small. |
| A thin strip of the answer shows through under the game line at the bottom | Plainly broken | Small. Measure first. |
| The dots under the chat name don't line up — the active dot looks a hair above or below the rest | Plainly broken; the maintainer wants it exact, not "close enough" | Keep the dots (the maintainer's call 2026-09-26). How to measure is in section 4, flow D. |
| A Strategy answer can open by quoting one of bonsAI's own instructions back | Plainly broken — reads like machine text | The maintainer's call 2026-09-26: soften it. A known-cause fix in the question wording. |
| Show details' credit line prints a protected boss's name in plain view | Spoiler shown | The maintainer's call 2026-09-26: hide it like the notes block. The tag reads "Boss note (spoiler)" until the player opens the answer's spoiler or the notes block, then shows the real name. No new button, so the D-pad path is unchanged. [The drawing](https://claude.ai/artifact/K4u5dy7hNZ7cLKsh4fhWTW). |
| Stop unloads the model, so the next question starts slow | Plainly broken feel: every question after a Stop is slow | The maintainer's call 2026-09-26: Stop must not unload the model. Close the connection instead. Check on the Deck that a stopped answer really stops, and that the next question starts warm. |
| A model downloaded from the first-run picker never joins the list that picks who answers | Possibly the first ten minutes | Check first whether a new player's first answer actually suffers. If not, it drops to "if there is room". |
| Clearing a session while an answer is being written may lose that answer | Loses a chat | Found by reading the code. Check it can still happen now the Session tab changed; if it can, fix. |
| The spoiler family: a withheld boss name leaking in the answer, the thinking line, and the suggestion menu | Spoiler shown | **Done:** passed on the Deck 2026-09-26 in plan 70 (229 reads, the name never showed outside a cover). Nothing left for this session. |
| The troubleshooting hint's Dismiss can't be reached by D-pad | Traps the player | Already fixed. Deck check only. |

### Must fix — the maintainer's own polish list (2026-09-26)

The maintainer asked for these before the release. They count as line 5 (plainly broken on the main
screen), and every one is a layout change, so each is measured on the Deck before and after.

| Item | What "done" looks like |
|---|---|
| The preset chip sits too far above the question box | The chip-to-box gap equals the box-to-Ask-button gap, measured on the Deck at every UI size. |
| The question bubble: empty space on the left, ragged line edges, text too far from the Retry arrow | **Option D from [the drawing](https://claude.ai/artifact/6TGmioi2KdtWM8yKC4cYkF), the maintainer's pick 2026-09-26:** right-aligned text split into lines of about equal length, the bubble shrunk to its longest line, text 3 pixels from the Retry arrow. Two things to check on the Deck first: whether Steam's browser can even out the lines by itself (if not, the plugin measures and does it), and a screenshot with Steam's own font, which can break lines a word differently from the drawing. |
| The "Not helpful" reason chips sit almost one to a row | The five chips under "What went wrong?" share rows instead of taking one each. Measure first what makes each chip so wide (its padding, a minimum width, the 8-pixel gaps), then tighten. **Option, added at the maintainer's yes 2026-09-26: shorter labels.** "Misidentified game/problem" is by far the longest. "Wrong game" is shortest, but the chip also covers a misread problem, not just a wrong game, so "Wrong game or topic" keeps that. "Unfenced spoiler" could become "Showed a spoiler", which is plainer. Only the words on the chip change; what the chip asks the AI to do stays the same. Draw spacing-only and spacing-plus-shorter-labels side by side at true size; the maintainer picks. Before-and-after screenshots on the maintainer's checks page. |
| The chat name's scroll doesn't match the chip scroll | Same speed and same pauses as a long chip label, then both slowed slightly. The chip scroll today: 25 pixels a second, 1.5 seconds before it starts, 1.5 seconds at the end. Where the chat name's scroll lives in the code is not yet found — a first job in flow 0. |
| Save chat to Desktop becomes a save icon in the chat tab; the "+" gets a clearer icon | A true-size drawing of the options first (it also settles exactly where the icon sits), then built. The D-pad path changes, so the free-play walk covers it. |

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
- Knowledge base: the "no tip" line never appears; four questions still get notes about the wrong subject;
  a follow-up names the wrong boss one run in three (plan 70 is on this one).

### Known issue (as things stand)

- A plugin reload stops a model download in progress (it resumes from where it stopped).
- Focus ring styling differs a little between bonsAI's controls and Steam's own.
- In carousel style, Down once landed on a chip that was mostly off screen (never reproduced).
- Unrelated questions can get game notes attached (already accepted).

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
| **Prep helper** | Sonnet 5, high | Writes the next Deck flow's step-by-step runbook while the current one runs, so the Deck never waits for paperwork. |
| **Bookkeeper** | Sonnet 5, high | Roadmap, testing rows and changelog after every flow; keeps section 2 current. Never commits while a landing runs. |

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

- **Lane 2's Stop fix is already written:** the winning version sits on its own branch from the trial. Before
  landing, fix the stale Stop diagram in the other Ollama service file (the losing Sonnet version's rewrite
  can be carried over), and optionally add the other version's request-number check so a new question is seen
  from the moment it is asked. Then it needs only its Deck check.

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
- **The last call** is a date the maintainer sets. After it, only "must fix" work lands.
- **The session's final output** is the "Known issues" list for the release notes, in plain words.

---

## 6. Questions for the maintainer

1. The calls in section 2 — all answered 2026-09-26. The question bubble is option D (2026-09-26). Still owed:
   a true-size drawing for the save icon and the new "+".
2. Is the "must fix" list right? Anything missing that you have hit yourself?
3. The last-call date — not decided yet (2026-09-26).
4. One long session or two shorter ones? **Updated 2026-09-26 for the time crunch:** one continuous
   session, run as the waves in section 4, with the Deck busy the whole time and lanes 1 and 2 started
   early. The first Deck block's measurements still come first, but nothing else waits for a second
   session.
5. Starting lanes 1 and 2 before plan 70 finishes — **yes, the maintainer, 2026-09-26.** Before cutting
   either lane, check with plan 70's session that none of the lane's files are in its flight, and land
   between plan 70's landings, never during one.
