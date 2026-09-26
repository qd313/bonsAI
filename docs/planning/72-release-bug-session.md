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
| The spoiler family: a withheld boss name leaking in the answer, the thinking line, and the suggestion menu | Spoiler shown | Already fixed. Must pass its Deck re-check before release. |
| The troubleshooting hint's Dismiss can't be reached by D-pad | Traps the player | Already fixed. Deck check only. |

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
| **The session** | Opus 5.5, extra-high | Re-sorts the list. Writes every brief and Deck runbook. Sorts new bugs against the line. Does the D-pad and layout fixes itself, with a Deck measurement in hand. Lands every fix. Reports to the maintainer. |
| **Deck driver**, one at a time | Opus 5.5, medium | Runs one flow from a runbook. Measures, records, reports in plain words. Never fixes, never edits docs. |
| **Fix helpers**, up to three | Sonnet 5, high | Fix bugs whose cause is already known, each in its own copy of the repo. |
| **Bookkeeper** | Sonnet 5, high | Roadmap, testing rows and changelog after every flow; keeps section 2 current. |

The D-pad and layout bugs are most of "must fix". By the house rules they are never handed to a helper
without a Deck measurement first, so the session measures first and fixes those itself or with the
measurement in the brief.

---

## 4. The flows, in outline

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
- **Fixing, in parallel.** The session takes the D-pad and layout fixes; helpers take the known-cause ones
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

1. The calls in section 2 — all answered 2026-09-26.
2. Is the "must fix" list right? Anything missing that you have hit yourself?
3. The last-call date — not decided yet (2026-09-26).
4. One long session like plan 64, or two shorter ones (D-pad and layout first, everything else second)?
   Recommended: two. The D-pad family needs Deck measurements before fixing, which makes a natural break.
