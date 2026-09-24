# 68 — The chat sums itself up instead of being cleared

Written 2026-09-24 by the planning session, straight after a discovery session with the maintainer the
same day. This is the build plan for the roadmap entry **The chat sums itself up instead of being
cleared**, four stars, tagged ask. It takes the five calls of 2026-09-20 in that entry's
[detail](../roadmap-details.md#the-chat-sums-itself-up-instead-of-being-cleared) and the twenty calls of
2026-09-24 recorded as [D118](../audit/maintainer-decisions-locked.md), and turns them into the steps a
build session runs. **Nothing here is built. Nothing starts until the maintainer says "go".**

**The drawing:** https://claude.ai/artifact/CrP6C7jACWBuWdKfLu7Em2 — animated, at the Deck's true size
(300 pixels wide, 412 tall for the chat). Its current version shows only what was picked; its first
version holds every option side by side. A copy is kept in the repo at
[assets/68-chat-sums-itself-up.html](assets/68-chat-sums-itself-up.html) so it survives the link.
**The drawing is the design. Read it before writing a brief.**

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md), the focus-graph section and the
table under "Which model does which work"; [docs/lessons-learned.md](../lessons-learned.md), sections 1
to 4; the roadmap entry's detail; D118.

**One sentence:** when a chat grows too long to carry whole, the Deck's AI writes a short summary of the
older part just before answering, the AI carries that summary plus the newest turns from then on, a
note under the answer says it happened, and *Sum up this chat* at the top of the Session tab does the
same on demand, in place of Clear.

---

## 1. What is true right now (checked 2026-09-24 against the code)

- **A chat already carries its own history, since 2026-09-21.** Every question takes the newest turns
  of its chat along: each question whole, each answer cut to its first 400 characters, hidden spoiler
  blocks removed. How much goes is the plugin's decision. The main limit is the wait: the whole
  question is kept to about 8 seconds of reading, which leaves room for roughly 10 to 15 questions and
  answers in Strategy mode (worked out from the code, not measured). Older turns are simply left
  behind. The log says how many; nothing else does.
- **That half failed its Deck check twice on 2026-09-23**, for two different reasons, both still open:
  - *With no game running*, a follow-up got no knowledge-base search at all. The search only knows the
    running game, not the game the chat is about, so Show details said "No game is running, so there
    is nothing to look up".
  - *With a game running*, in a chat of 100 turns where only 34 fitted, the vague follow-up "and what
    about that" got "tell me which part" before the reply guessed the right subject. **That chat had
    already outgrown its room: exactly the case a summary is for.**
- **Each chat is one file on the Deck.** Delete, New chat and the automatic removal of the oldest of
  eight already remove that file. **The trap:** every load and save rebuilds a chat from a fixed list of
  known fields and throws away anything else. A new field not added to that list vanishes the next
  time a question is saved into the chat. The same fixed list decides what the screen is sent.
- **A chat keeps its newest 200 turns** and drops older ones silently.
- **The remembered strategy subject belongs to the whole plugin, not to a chat.** It lives in memory
  only, so switching chats, or starting a new one, still carries the subject from whatever was asked
  last, and a restart loses it.
- **Clear, at the end of the Session tab, forgets two things:** that subject and the running game's
  checklist ticks. Its box says "Start the next question fresh?", which stopped being true on
  2026-09-21: the chat's own history still goes with the next question.
- **The line under a waiting question comes from the back end.** The screen asks for it about every
  1.2 seconds. Nothing counts seconds live today, and a line left unchanged for 7 to 13 seconds is
  swapped for a "still on it" line.
- **Stop ends the whole request, but it only reaches a call to the AI that it knows about.** A summary
  call made before the answer needs the same wiring the answer call has. And after a Stop the stop
  flag stays raised until the next answer lowers it, so a summary that runs first would stop itself at
  once unless it lowers the flag first.
- **Two small errors in how the chat is sized**, both of which would make "the chat has outgrown its
  room" fire too early:
  - the first question after the plugin starts plans against the server's default room of 4,096
    tokens rather than the 16,384 the plugin asks for;
  - the chat's size is always estimated with the cautious 3.5 characters per token, because the
    model's name is not known yet at that point, so the plugin's learned figure (about 4.3) is never
    used.
- **Stopped answers are carried back to the AI as "Request cancelled."** A summary should skip them.
- **No existing piece makes a short, capped call to the AI with thinking off and a real overall time
  limit.** The answer's own single call is the closest. Its time limit means "nothing arrived for N
  seconds", not "finish within N seconds".
- **Four files this work has to touch are at their size limit:** the back end's front door, the Ask
  logic on the screen, the chat transcript and the screen's root. None may grow by a single line of
  code (comments do not count). Room has to be made by moving code out first.
- **Nothing new can be handed from the screen's root to the Main tab.** A check counts those values,
  and the count is at its best ever. The chat's summary has to ride inside something already handed
  over.
- **Show details cannot be opened on a chosen tab from outside today.** Which tab shows, and whether
  the panel is open, are private to the chat screen, and the panel closes itself whenever the open turn
  changes, including when an answer finishes and the chat reloads. The note needs a small opener of its
  own.
- **The Session tab's label already shows on every newest answer, even at "Session · 0".** Only its
  body disappears when no turn attached anything extra. But **a stopped answer has no Show details at
  all**, so after a Stop the tab, and the button, are out of reach until the next answer.
- **With Clear gone, the back-end call it made has no caller on the screen**, which a check counts and
  would refuse. Settings' own *Clear session* still uses it from inside the back end, so it becomes an
  internal step rather than a call the screen can make.
- **Nothing about the summary's cost has been measured,** because nothing writes one. The estimate
  from measured speeds is 20 to 30 seconds with a game running, once per summary.

## 2. What gets built now, and what does not

**Built now (D118):**

1. **It sums itself up on its own.** Just before answering, if the chat has outgrown its room, the
   model that is about to answer writes a summary of the older part, thinking off, about 200 words,
   in the person's reply language. Even with a game running. No setting, no warning beforehand.
2. **What the AI carries afterwards:** the summary, then the newest turns word for word, never fewer
   than the newest two questions and answers.
3. **The wait:** today's waiting line, spinner and all, reading *Summing up the chat so far · 12 s*,
   with the seconds counting up. Then today's lines as usual.
4. **The note:** under the answer that came right after summing up, *The chat summed itself up before
   this answer. Press to read what it kept.* On the newest answer it is a D-pad stop and opens Show
   details on the Session tab. On older answers it is plain text, *The chat summed itself up here.*
5. **Sum up this chat** at the top of the Session tab, the summary card right under it, the turn list
   below. It writes the summary right away with the same timer, no confirm box, and afterwards reads
   *Sum up again*. Greyed out, with one line saying why, when the whole chat still fits or while an
   answer is being written. **Clear and its box go.**
6. **The Session tab shows whenever the chat has a question in it.**
7. **Stop** during a summary stops everything; the chat is left exactly as it was; the next question
   tries again. **If the summary fails or runs out of time,** the question is answered the way it is
   today, one warning line says the summary did not happen, and the next question tries again.
8. **Each chat keeps its own summary and its own strategy subject**, in its own file. A new chat starts
   with neither. Checklist ticks stay with the game. Closing the plugin mid-summary does not stop it.
9. **An old chat far too long for one pass** gets a summary of the newest part it can read in one go,
   and the card says how many of the oldest turns were left out.
10. **A hidden spoiler never comes back through a summary.** Hidden blocks are removed before the AI
    reads the chat, and a device check proves it.
11. **The two sizing errors in § 1 are fixed**, and stopped answers are no longer carried back.

**Not built now, on purpose:**

- The look-back **spoiler chance** rating. Its own plan, later (D118 call 14).
- Editing the summary, a warning before it happens, a setting, or a chip on the answer (calls 6, 11,
  20).
- Anything for a chat that changes game (call 13).
- Settings' own *Clear session*. Unchanged.
- Old chats piling up after a clear (the roadmap's separate follow-up).
- Summing up in several passes, or on a second model.
- The four-star **Session context and user stash** entry. The summary is stored so that entry can
  share the same place later, and nothing more.

**How often it will happen, as an estimate to be measured:** a summary covers everything except the
newest few turns, so the chat has room to grow again before the next one. With the room the code
allows today that is roughly one summary every ten questions in a long chat. Every question in
between costs about a second more than today, for reading the summary.

## 3. Before any code

### 3a. The gate: how long a summary takes on the Deck — the one running the session, about an hour

The maintainer's call: **measure first; if a summary takes over a minute with a game running, stop and
bring back the number before anything is built** (D118, "the one gate").

A short script, run on the PC but talking to the **Deck's own AI server** over the network, so the
numbers are the Deck's own:

1. Copy two real chats off the Deck, read-only: the 100-turn Half-Life 2 chat that failed the memory
   check ("wheatley fight"), and the longest other chat there.
2. For each, build the summary request the way the plugin will: the turns the summary would cover,
   hidden blocks removed, stopped answers skipped, a short instruction (draft wording in Appendix A),
   the same model, the same room of 16,384, thinking off, capped at about 400 tokens.
3. Time it three ways: **the Deck idle; a game running (Half-Life 2, the game the chat is about); and
   a first call after the model has been unloaded**, which is the worst a person can meet. Record time
   to the first word, time to the end, words written, and whether the server reloaded the model.
4. Vary the wording of each run, since a repeated identical request is served back without work and
   measures nothing (lessons-learned, section 3).

**Pass:** the worst run with a game running is under a minute. **Anything over a minute:** stop, write
the numbers into this plan's log, and bring the maintainer the options (a shorter summary; reading
fewer turns; the Speed mode's model).

Evidence under `docs/test-evidence/` with a `plan68-` prefix.

### 3b. The desk test: is the summary any good, and does it keep secrets — same hour, on the PC

With the same two chats, plus a Hollow Knight chat that has a hidden spoiler block in an answer (make
one on the PC if none exists):

| # | Question | Decides |
|---|---|---|
| Q1 | Does the summary name the game, where the player is, what is done, what they are stuck on, and what they asked for? | The instruction's wording, before a lane builds it. |
| Q2 | Does any word of a hidden block appear in the summary? | Must be none. If a word leaks through the placeholder, the placeholder goes too. |
| Q3 | On the Half-Life 2 chat, with the summary in place of the trimmed turns, does "and what about that" still get "tell me which part"? | Whether the summary also fixes the second failure in § 1. If not, that failure stays its own bug. |
| Q4 | In a non-English reply language, does the summary come back in that language? | Whether the reply-language instruction the answers use is enough. |

The capture files become the test fixtures for the back-end steps: the lanes' faked answers should be
real summaries from this run, not invented ones (lessons-learned, section 2: test the shape the system
really produces).

### 3c. Making room in the four full files — one helper, before the other helpers start

Moves only, no rewriting, one move per commit, behaviour unchanged, every check green in between. The
aim is room for what this plan adds, not a smaller file for its own sake.

- The back end's front door: move the chat-turn saving helpers out into the chat-slot service it
  already hands off to.
- The screen's root, the Ask logic and the transcript: each gets one block lifted out into a file of
  its own, called from the same place, with the hook-order check run after every step
  (lessons-learned, section 4).

Raising a limit instead is allowed only with a written reason (D117). This plan does not expect to.

### 3d. The device measurement, before the screen step

The routing rule: screen and focus work starts only after a measurement on the device. With a chat
open on the Deck's own screen and Show details open on the Session tab of the newest answer: where the
first row sits against the top of the dock, how many rows fit, and whether a button of Clear's height
placed above the first row would be visible, not just focused, when the D-pad lands on it. Also: the
gap between the answer bubble and *Was this helpful?*, where the note goes.

## 4. How it decides, in plain words

- **When:** the plugin plans what goes with each question, as it does today. The chat has
  "outgrown its room" when turns the summary does not already cover would be left behind. Then, and
  only then, it sums up first.
- **What the summary covers:** everything up to the newest turns that are kept word for word. Those
  are as many as fit in about half the chat's share, never fewer than the newest two questions and
  answers. So the next summary is several questions away, not one.
- **Rewriting:** the next summary is written from the previous one plus the turns since, so it stays
  about 200 words however many times it is rewritten.
- **Where it sits:** at the very end of what the AI is told, as the chat's memory does today, with the
  summary first and the word-for-word turns after it. The summary does not change between rewrites,
  so the AI server can keep skipping the work of re-reading it.
- **What the AI is told about it:** the same instruction the chat's memory already carries (use this to
  make sense of a follow-up that names nothing), with the summary under its own heading.
- **Pressing the button** runs exactly the same summary, at once, as a job of its own. It takes the same
  one-question-at-a-time slot as an Ask, which is why it is greyed out while an answer is being
  written, and why Stop stops it.
- **The subject** each chat remembers is saved in that chat's file, next to its summary, so it survives a
  restart and a switch.

## 5. The build, step by step

One thing per commit, every check green between commits. The session runs on Opus at extra-high effort.
Helpers are Sonnet 5 at high effort, each in its own copy of the repo; they hand back code, tests and a
short report only, and never touch the roadmap, the testing documents, the changelog or the Deck.

| Step | What lands | Who | Waits for |
|---|---|---|---|
| 0 | The gate (3a) and the desk test (3b). **Stop here if the gate fails.** | the session | "go" |
| 1 | **Room** (3c): the moves out of the four full files. | Sonnet 5 high, helper R | step 0 passed |
| 2 | **Back end, the chat file and the subject.** The chat file learns two optional parts, the summary and the chat's own subject, kept by every load and save and sent to the screen; an old file without them loads as "none yet". The remembered subject moves from the whole plugin into each chat. If the maintainer says yes to § 8 question 1, a follow-up with nothing running searches the chat's own game. Tests: an old file loads; a turn saved after a summary keeps the summary; delete removes both; two chats keep two subjects; a new chat has none. | Sonnet 5 high, helper A | step 1 |
| 3 | **Back end, the summary itself.** The instruction from 3b; the capped call with thinking off, the same model and room, a real overall time limit, and the same Stop wiring as the answer; the decision in § 4; the summary saved into the chat only after the call returns, so a Stop saves nothing; on failure, today's memory plus a warning; the answer turn records whether a summary was written or failed; the two sizing fixes; stopped answers skipped. Tests with the real summaries captured in 3b: outgrown and not; a second summary folds the first; a hidden block never reaches the call; Stop mid-summary leaves no summary and the next question tries again; a time-out answers as today with the warning; the first question after start plans against 16,384. | Sonnet 5 high, helper B | step 1; field names agreed with helper A before either starts (Appendix A) |
| 4 | **Back end, the wait line and the button's job.** A new step name for the waiting line, *Summing up the chat so far · N s*, counted from when the step began and kept on screen for as long as it lasts, never swapped for a "still on it" line. A new call the screen makes for *Sum up this chat*, running as a job of its own through the same one-at-a-time slot, the same waiting state and the same Stop, and finishing without saving an answer turn or painting one on screen. Tests for both. | Sonnet 5 high, helper C | steps 2 and 3 landed |
| 5 | **The screen.** The Session tab as drawn (§ 6): shown whenever the chat has a question; *Sum up this chat* at the top; the summary card; the reason line; Clear and its box removed. The note under the answer, a D-pad stop only on the newest answer, opening Show details on the Session tab. The warning line. The chat's summary carried from the chat file to the tab. Focus-graph entry in the section's parent first. Tests for each state, and for every D-pad move in § 6. | Opus extra-high, with the measurement from 3d | step 4 landed, 3d |
| 6 | **Documents.** The roadmap entry moves to Verify, naming the rows in § 7; the rows go into the testing documents; a changelog line; the stale comments found in discovery corrected; this plan's log. | bookkeeper | step 5 landed |
| 7 | **The Deck rows** in § 7, then the free-play sweep, since this changes the Main tab. | whoever holds the Deck; Opus reads any failure | step 6 |

Helpers A and B start together from the same tip once helper R has landed. Helper C is cut from the tip
only after both have landed, because it touches the same waiting state. The screen step can be written
against the agreed field names while helper C works, but lands after it.

## 6. The screen, exactly as drawn

Taken from the drawing so nobody builds from a description. Everything sits inside the 300-pixel
column; the content row is 267 pixels wide.

- **The wait line:** today's waiting line, unchanged in look: the 14-pixel spinner, 12-pixel italic
  text in the muted blue, 8 pixels above and 4 below. The words and the seconds come from the back end:
  *Summing up the chat so far · 12 s*. The number is whole seconds.
- **The note:** one line between the answer bubble and *Was this helpful?*, 267 wide, 11-pixel text at
  1.35 line height in the waiting line's muted blue, a 13-pixel squeeze icon in the session blue at
  80% strength, 6 pixels between icon and text. Newest answer: *The chat summed itself up before this
  answer. Press to read what it kept.*, a D-pad stop with the plain white outline the Show details line
  uses. Older answers: *The chat summed itself up here.*, not a stop.
- **The warning line:** between the question and the answer bubble, where the waiting line stood, in
  the warning yellow the slow-answer line uses, 12 pixels: *Couldn't sum up the chat this time, so this
  answer only knows the newest turns. It will try again on your next question.* Not a D-pad stop. It
  is drawn from the saved answer, so it stays with that answer after a reload.
- **The Session tab, top to bottom:** the tabs row as today; 8 pixels; the button; the summary card or
  the reason line; the turn rows and their chips as today. **No Clear.**
- **The button:** Clear's own look, moved: full width, 8 pixels top and bottom, 6-pixel corners, a
  faint 1-pixel border, no fill, 11-pixel bold text in the muted blue. *Sum up this chat*; *Sum up
  again* once a summary exists; while working, the spinner and *Summing up · 12 s*; greyed out at 45%
  strength when it cannot be pressed.
- **The reason line** under a greyed button, 11 pixels, muted blue: *The whole chat still fits, so
  there's nothing to sum up yet.* or *Wait for the answer to finish, then sum up.*
- **The summary card:** the chip ladder's own panel look (8 and 10 pixels of padding, 8-pixel corners,
  the dark panel fill, 11-pixel text at 1.45) with its border in the session blue at 30%. A header row
  in 10-pixel bold muted blue: *What the AI remembers* on the left, *16 turns · just now* on the
  right. The summary as short lines. A footer under a faint rule, 10 pixels: *Plus the newest 2 turns,
  word for word · 1 hidden note left out*; for a very old chat, *Too long to read in one go: this covers
  the newest 60 turns. The oldest 140 are not in it.*
- **D-pad, in the Session tab:** Down from the tabs row lands on the button; Down from the button goes
  to the first turn row (the card is text, not a stop, unless 3d shows it can be taller than the
  space left, in which case it becomes one stop so it can be scrolled into view); Up from the button
  returns to the tabs row; A on the button starts the summary and the ring stays on it; B anywhere
  closes the whole panel, as today. **The ring must be visible above the dock, not just focused, at
  every stop.**
- **A greyed-out button is still a stop**, and A on it does nothing. Measured on the Deck 2026-09-16: a
  greyed control takes the ring anyway, so skipping it would make the walk jump unpredictably, and the
  reason line next to it is what the person needs to read.
- **Down from the last thing in the tab stays put.** Today Clear was the last stop and Steam's own guess
  past it once threw the ring into the dock. With no turn rows at all, the button is the last thing.
- **Up from the dock** into a newest answer whose Session tab is open lands on the last stop in the
  tab, not the button at the top.
- **D-pad, the note:** on the newest answer it sits directly under the answer bubble, before the
  branch picker and the checklist when those show, and before the Helpful row. Down from the answer's
  last paragraph (or its Copy icon) reaches it, Down again goes on down the reply, Up goes back to the
  answer. A opens Show details on the Session tab and moves the ring to the button.
- **The timer's number can skip one now and then**, because the screen asks the back end for news
  about once every 1.2 seconds. Accepted for the first build; if it reads as a fault on the Deck, a
  small ticker on the screen side smooths it.

## 7. Proving it on the Deck

Setup for every row: back up the eight chats first and put them back exactly at the end (a new chat
pushes out the oldest). Questions go in through the script that types an exact sentence, never by
thumb; any row that repeats a question varies its wording.

- **SUMUP-01** The Half-Life 2 chat, Half-Life 2 running, Strategy: ask *"and what about that"*. The
  waiting line reads *Summing up the chat so far* with seconds counting up, then today's lines; the
  answer stays on the chat's subject; the note shows under it; the log shows a summary written and how
  long it took.
- **SUMUP-02** On that answer, Down reaches the note, visible above the dock; A opens Show details on
  the Session tab with the summary card on screen and the ring on the button.
- **SUMUP-03** A different long chat: Show details, Session tab, Down to *Sum up this chat*, A. The
  button shows the timer; the card appears under it; the button reads *Sum up again*.
- **SUMUP-04** A short chat: the button is greyed out with *The whole chat still fits*. During an
  answer in a long chat: greyed out with *Wait for the answer to finish*.
- **SUMUP-05** Stop while *Summing up the chat so far* shows: no answer, no summary in the chat file,
  the chat looks exactly as before; the next question sums up and answers.
- **SUMUP-06** The spoiler check, the one that matters most: a Hollow Knight chat where an answer hid a
  spoiler block; make it sum up; no word of the hidden text in the summary card, the chat file's
  summary, or the next answer.
- **SUMUP-07** Two chats: sum up one; switch; the other has its own card or none; switch back, the first
  card is there. New chat: *"what about her second phase"* gets asked which game, because nothing is
  carried.
- **SUMUP-08** Close the plugin during a summary and reopen: it finished, and the answer is there.
  Restart the plugin: the card is still there, and the note on an older answer is plain text.
- **SUMUP-09** The warning line: with the summary's time limit set very short for the test, the
  question is answered as today with the warning line, and the next question tries again. If that
  cannot be set on the device without editing the settings file by hand, this row stays unit-tested
  only and says so.
- **SUMUP-10** A chat of about 200 turns: one wait; the footer says how many of the oldest turns were
  left out.
- **CHAT-MEMORY-01** run again on the same two chats that failed on 2026-09-23.
- **The focus-graph checklist** in the manual testing document, for the button and the note.
- **The free-play sweep.**

## 8. Questions still open

The shape is settled by D118. These are the few things the plan had to pick or could not, with the
default the build uses unless the maintainer says otherwise.

1. **The first failure of the memory check** (with no game running, a follow-up gets no search because
   the search only knows the running game). The fix is small and sits in the code helper A already
   changes: when nothing is running and the question names no game, search the chat's own game.
   **Default: fix it in this plan, as part of step 2.** The alternative is leaving it as its own bug.
2. **The summary's overall time limit.** **Default: three times the worst time measured in 3a with a
   game running, and never under 60 seconds.** Past it, the answer goes ahead as today with the
   warning line.
3. **Which chats the Deck rows use.** **Default: the Half-Life 2 chat that failed the memory check, plus
   the longest other chat already on the Deck, with all eight backed up first and restored at the
   end.**
4. **What the number on the Session tab counts.** In discovery I said it would count every turn. Reading
   the code since: the label already shows on every newest answer, and the number is how many rows are
   listed under it. Counting every turn would make the number disagree with the list. **Default: keep
   today's meaning**, so the number matches the rows.
5. **After a Stop, the button is out of reach until the next answer**, because a stopped answer has no
   Show details (§ 1). **Default: accept it.** A stopped question leaves nothing new to sum up, and the
   next answer brings the tab back. The alternative, giving stopped answers a Show details panel, is a
   change to every stopped reply and belongs in its own entry.

## 9. Risks, and what to know

- **The wait is the price.** 20 to 30 seconds is an estimate. The gate exists so nobody builds on a
  number nobody has seen.
- **Summing up while a game runs costs frame rate for as long as it lasts**, the same third of the
  frame rate an answer already costs, measured 2026-09-20. The maintainer chose this knowingly (call 4).
- **A summary that leaks a spoiler is the worst failure this feature can have.** The hidden blocks are
  removed before the AI reads anything, a unit test proves it, and SUMUP-06 proves it on the device.
  The person's own questions are carried as they typed them; a spoiler they typed themselves is theirs.
- **The field-list trap** (§ 1): a summary that is written, then quietly erased by the next saved
  question. Helper A's tests include exactly that sequence.
- **The stop flag trap** (§ 1): a summary that stops itself because the previous question was stopped.
  Helper B's tests include it.
- **Two new D-pad stops on the Deck's hardest surface.** The measurement comes first, the focus-graph
  entry before the code, and every row checks the ring is visible, not just focused.
- **A per-chat fact that only arrives when an answer finishes** reaches the screen only then (the lesson
  from plan 54). The note needs nothing sooner. The waiting line's words come from the back end's
  own status, so they are live.
- **The button's busy state must come from the back end.** The Session tab is rebuilt whenever the
  panel or the Quick Access menu closes, so a timer kept in the tab would vanish mid-summary.
- **Removing Clear touches two repo checks** (values handed to the Main tab; back-end calls with no
  caller). Both are handled in Appendix A, not by raising a number.
- **The four full files.** Step 1 exists so nothing in steps 2 to 5 has to argue with the growth check.

## 10. Out of scope

The spoiler chance rating; editing the summary; a setting; a warning before summing up; a chip on the
answer; per-game summaries; several passes over an old chat; a second model; reading the summary aloud;
the old chats that pile up after a clear; Settings' own *Clear session*; the Session context and user
stash entry.

## 11. Things to bring to your attention

Found while reading the code for this plan. None is fixed by it unless a step above says so.

- **Clear's box has been untrue since 2026-09-21** (§ 1). This plan removes Clear, which ends it.
- **A clear pressed while an answer is still being written may lose that answer from the chat.** The
  clear resets the waiting state first, and the stop step then skips saving because the state no
  longer says a question is waiting. A reading of the code only; no test covers it and nobody has seen
  it on the device. Worth its own roadmap bug with a device check.
- **Deleting a chat whose file is already missing leaves its row in the list.** A reading of the code
  only.
- **Three out-of-date comments**, corrected in step 6: one says a question is saved after its answer
  (it is saved first); the Session tab's file still describes a stand-alone box that no longer exists;
  the waiting-line builder names a screen file that no longer exists.
- **The "still preparing" branch of the waiting-line builder can never fire**, because nothing passes it
  the elapsed seconds. Step 4 is the natural place to either use it or remove it.
- **The old stand-alone Session box's D-pad target is still called from five places and always finds
  nothing**, since the box itself was removed on 2026-09-20. Harmless today; step 5 tidies it where it
  touches the same code.
- **Three test files name a Clear-button test file that does not exist.** Corrected with the tests in
  step 5.

## 12. Progress log

- **2026-09-24** — Discovery with the maintainer; twenty calls recorded as D118; the drawing published
  and redrawn to the picks; this plan written. Waiting for "go".

---

## Appendix A — for the helpers, not for reading

Exact names the helpers build against. Plain words above; this part is for the briefs. Every file:line
below was read on 2026-09-24 at tip `35343f42`; recheck before relying on a line number.

**Chat file (helper A)** — `py_modules/backend/services/chat_slot_service.py`:

- Two new optional top-level fields in `sanitize_slot` (the known-field list, 279-301) and in the
  screen payload list (595-604). Not in the index rows.
  - `summary`: `{text: str (cap 2,000 chars), covers_through_turn_id: str, turns_covered: int,
    oldest_turns_unread: int, hidden_notes_left_out: int, written_at: iso str, seconds: float,
    model: str}`. Absent or `null` means none. Record coverage by **turn id**, not a count: counts
    shift once the 200-turn cap drops old turns.
  - `subject`: `{game_key: str, subject: str}`, the same pair `kb_followup_memory` keeps today.
- A save of either happens under the existing chat lock (`main.py:301`), on a worker thread, the same
  way `_chat_slots_record_assistant_turn` saves an answer turn. Never save just because a file was
  opened.
- Answer turns gain `chat_summary: "written" | "failed"`, absent otherwise, in `_normalize_turn`
  (225-276). The screen reads the note and the warning line from it.
- Screen types: `src/utils/chatSlotsApi.ts` (the chat, 65-74; the turn, 20-52), `chatSlotTurns.ts`.
- Tests to copy: `tests/test_chat_slot_service.py` old-file cases (80-97, 166-179, 383-404); the
  turn snapshot is compared whole at 206 and 211, so never put the summary inside it.

**Subject per chat (helper A)** — `py_modules/backend/services/kb_followup_memory.py` (the single
record, 42-51; recall 91-106; remember 109-125; forget 128-132). Key by chat id, loaded from and saved
to the chat file's `subject`; a fallback entry for an Ask with no chat. Callers:
`game_ai_request.py` 459-471 and 626-635; `main.py` `forget_game_ai_carried_context` (2031), which
stays for Settings' *Clear session* and forgets only the active chat's entry. The chat id comes from
the request-to-chat map (`main.py:302`, set at 1847). Tests: `test_kb_followup_memory.py`,
`test_game_ai_request_followup_memory.py`, `test_forget_game_ai_carried_context.py`, and the eval
script's two-call reliance (`scripts/eval_kb_answers.py` 418, 790, 1120-1131). **If § 8 question 1 is a
yes:** in the game resolution for the knowledge search, after the running game and a title named in
the question (D19), fall back to the chat's own game (the chat's `game_id`/`game_name`, else its newest
turn's).

**The summary (helper B)** — a new service, `py_modules/backend/services/chat_summary_service.py`:

- Where it runs: inside `ollama_ask_service.run_ask_ollama`, after the character voice (205-206) and
  before the memory step (210-219). Move the model choice (249-287) above it; it only reads settings,
  installed models, a pinned model and whether images are attached.
- Plan the memory with the real system prompt, the chosen model name and the room from the room
  chooser (`token_accounting_service` 259-317), not `smallest_known_window_tokens` (172-183). Read
  the left-out count from `plan_and_build_chat_memory` (196-244); `apply_chat_memory_to_prompt`
  (272-298) returns only text today.
- The call: reuse the answer's single streamed call in `ollama_chat_stream.py` (81-495), thinking off,
  `num_predict` about 400, the same model, `num_ctx` and keep-alive as the answer, **no live-text
  callback** (else it shows as the answer and triggers "Writing your answer"), wrapped in an overall
  deadline checked beside the stop check and reported as a time-out, not a stop.
- Stop wiring, in this order: lower the stop flag (as `ollama_ask_service` 342-344 does); pass the stop
  check; put the summary's connection in the same record and signal it open; record host and model
  for Stop while the call runs, clear them after (`main.py` 1945-1957; `ollama_ask_service` 333-340,
  370-372).
- Input: the turns the summary covers, fences stripped with `chat_memory_service.strip_fenced_blocks`,
  `Request cancelled.` turns skipped (and skipped by the memory builder too, 159-164), the previous
  summary folded in. Reply language from `reply_language_service` and the same instruction block
  (`reply_style_blocks` 47-60).
- Draft instruction for 3a and 3b (the session refines it there): *"You keep notes for a game helper.
  Write what this conversation has covered so far, for the helper's own memory: the game, where the
  player is, what is done, what they are stuck on, and anything they asked for about how to answer.
  At most 200 words, short lines. Where the text says a hidden note was here, do not guess what it
  was."*
- The memory block: header, then *Summary of earlier turns:* and the summary, then the word-for-word
  turns (`chat_memory_service.build_chat_memory`). Kept turns: as many as fit in half the memory
  allowance, never fewer than two exchanges.
- Failure: log it, pass a flag back, answer with today's memory, and record `chat_summary: "failed"` on
  the answer turn. The screen draws the warning line from that field. **Do not** append the warning to
  the answer's own text the way the knowledge-base footer lines are (`game_ai_request.py` 878-880):
  it would show twice, and Read aloud would speak it.

**The wait line and the button's job (helper C):**

- A new phase in `bonsai_stream_tags.py` (the list, 90-100; the line pools, 490-721). Store the phase
  name beside the line in the live snapshot; in the status step, for this phase only, append ` · N s`
  from the stored "line went up" time instead of swapping lines (`main.py` 477-483, 645-657). Tests in
  `tests/test_bonsai_stream_tags.py` walk the phases (435, 580). New logic goes in a service, not in
  `main.py`.
- The button's call: one new method on `Plugin` (a one-line hand-off, as `chat_slot_rpc.py` does), for
  example `sum_up_chat_slot(slot_id)`, running through the same one-at-a-time gate and waiting state
  (`main.py` 1734-1748, 1828-1836) with a request kind marker so the finish step saves no assistant
  turn and the screen paints no answer (`main.py` 1631-1649; `useBonsaiAskOrchestration.ts` 618-648).
  The name must sort with the chat-slot methods in the generated method map (AGENTS.md, "How the two
  sides talk", point 6).

**The screen (Opus):** `src/components/SessionContextStrip.tsx` (`computeSessionContextRows` 86-111;
`SessionContextTabBody` 211-367; Clear and `buildOpenClearConfirm` 126-168 and 328-364 go);
`src/utils/buildDetailsPanelElement.tsx` (the tabs, 197-285); `src/components/MainTabChatTranscript.tsx`
(the note between the answer bubble and the reply row, and the warning line between the question
header and the answer bubble, both read from the turn's `chat_summary`, both drawn by a new builder
file so the transcript only gains the calls); `src/utils/liveTurnFocusGraph.ts`;
`src/utils/replyStopRegistry.ts`; the chat's summary as state in `src/hooks/useChatSlots.ts`, set
everywhere the transcript is set and cleared everywhere it is blanked, passed down the chain
`index.tsx` → `useMainTabPayload.tsx` → `MainTab.tsx` → `MainTabChatTranscript.tsx` →
`buildDetailsPanelElement.tsx`; `src/styles/sections/section-6.ts`. Screen words are plain English in the component, as every other
string on the chat screen is (`src/i18n/keys.ts` lists only 12 keys, on purpose). The setter in
`useChatSlots` must be optional: its tests pass only the three transcript setters
(`useChatSlots.test.ts` 115-117).

- **The shell seam is full.** `node scripts/shell_seam.mjs` counts 215 values handed to tabs, equal to
  its best ever; no new prop. The summary rides inside a value `useMainTabPayload.tsx` already passes
  (the chat-slot bundle is the natural carrier; decide by reading 228 and 349).
- **Busy state comes from the back end, not the tab.** The Session body only exists while the tab
  shows, and closing the panel or the Quick Access menu remounts it. The button's *Summing up · N s*
  reads the background status (the request kind marker from helper C), so it survives both.
- **The note's opener:** a new transcript-level action that opens Show details, sets the tab to Session
  and sets the highlighted turn, then moves focus after the panel mounts, via
  `focusDetailsTabsRow(turnKey)` (`buildDetailsPanelElement.tsx:66-68`) and one Down. The reset effect
  at `MainTabChatTranscript.tsx:499-507` closes the panel when the open turn changes; the note is only
  pressable on a finished, saved answer, so that is not in the way, but test it.
- **The note as a stop:** a new `ReplyStopId` in `REPLY_STOP_ORDER` directly after `copy`
  (`replyStopRegistry.ts:44-51, 69-77`); first target in the bubble's Down
  (`buildAnswerBubbleElement.tsx:406-414`), in `focusDownFromLiveAnswerBubble`
  (`liveTurnFocusGraph.ts:283-290`) and in the Copy icon's Down; before the glossary-chip and
  last-section fallbacks in `moveUpFromReply` and `upFromRetry` (`buildReplyActionsElement.tsx`
  317-323, 450-463). Registry, never a page search: `scripts/focus-baseline.json` holds
  `SessionContextStrip.tsx` at 1, `buildDetailsPanelElement.tsx` at 1, `liveTurnFocusGraph.ts` at 24.
- **The tab body:** drop the `return null` at `SessionContextStrip.tsx:224`; `focusFirstTabContent`
  (`buildDetailsPanelElement.tsx:190-193`) lands on the button; the button's Up takes over the first
  row's Up (279-291); explicit Down at the end of the body; the dock's Up target
  (`liveTurnFocusGraph.ts:256`) moves to the last stop.
- **Removing Clear frees room in the transcript:** with the Session tab's confirm box gone,
  `wrapOnBeforeNestedDeckyModal`, the saved-state variable and its restore effect
  (`MainTabChatTranscript.tsx` 226, 428-431, 525-531) lose their only user in this path; the rename box
  keeps the props underneath. Check before deleting (lessons-learned, section 2, on dead-code tools).
- **`forget_game_ai_carried_context`** loses its only screen caller, and the ratchet's "back-end calls
  nobody makes" count (best 1; `scripts/ratchet.py` 590-597, allow list 107-110) would refuse it. Make
  it an internal helper called by `forget_background_game_ai`, and update
  `tests/test_forget_game_ai_carried_context.py`. The new button call needs the regenerated
  `rpc-map.json` (`npm run mcp:generate`) so "screen calls a method that does not exist" stays 0.
- **Do not add state to the Ask hook.** It is at its size limit, and `tests/test_ask_hook_order.py`
  with `tests/contracts/ask-hook-order.json` records its hook order.
- **Tests that change:** `SessionContextStrip.test.tsx` (the null case, 127; the Clear block, 133-225);
  `MainTabChatTranscript.detailsTabs.test.tsx` (Clear, 299; Down to the first row, 355-368; the
  Clear-driven modal test, 436-461); `liveTurnFocusGraph.test.ts` (`focusBottomOfNewestReply`,
  424-474); and, once the note is in the test data, the reply walks in `buildAnswerBubbleElement.test.tsx`,
  `buildReplyActionsElement.test.tsx`, `MainTabChatTranscript.replyBlock.test.tsx` and
  `replyStopRegistry.test.ts`. The saved Deck walk `checks/plan64-SESSION-TAB-01-B-close.json` expects
  Down to land on a turn row and must be re-recorded in step 7.

**Room (helper R):** `scripts/growth_limits.json` holds the limits (code lines only, comments and
docstrings excluded, counted by `scripts/code_line_count.py`). At 2026-09-24: `main.py` 1,710 of
1,710; `useBonsaiAskOrchestration.ts` 1,061 of 1,061; `MainTabChatTranscript.tsx` 1,104 of 1,104;
`index.tsx` 1,158 of 1,158. Candidate for `main.py`: the chat-turn saving helpers (972-1069) into
`chat_slot_rpc.py`. Screen files: lift a whole block of hooks into its own hook, called from the same
spot, hook-order script after every step. Files with room, for reference: `game_ai_request.py` 704 of
800; `ollama_ask_service.py` 385 (16 more lines takes it past the 400-line house number, so the summary
logic belongs in its own service); `chat_slot_service.py` 434; `section-6.ts` 570; `section-4.ts` 400,
at its house number, so no styles there.

**Every brief carries:** the tip hash and the base check (a copy can start hundreds of commits behind;
verify before the first edit); the copy's packages folder is a link, so no install step; commit with
`git -c core.hooksPath=.githooks commit` inside a copy; one change per commit; the gates from
AGENTS.md (`npm test`, `npm run test:py`, `npx tsc --noEmit`, `npm run build`,
`python scripts/verify.py --quick`, and the growth check); the rule that helpers never touch the
roadmap, the testing documents, the changelog or the Deck; and, for anything on the Main tab, the focus
law in AGENTS.md.
