# 62 — The fifth feature session: four screen changes, built and checked at the same time

**Written 2026-09-20.**

**Status, corrected 2026-09-24: FINISHED; three of the four features are proven on the Deck.** The last
line of the progress log (§ 10) says nothing was proved because deploying was blocked. That was true on
2026-09-20 only. Plan 63 fixed the deploy and proved it end to end on 2026-09-21 (its § 8, block 0).
After that, these passed on the Deck:
- The game name shown only while focused: CHAT-SLOTS-V3-14c, 2026-09-21.
- The session box as a tab in Show details: SESSION-TAB-01, 2026-09-23.
- Every filter behind one Filters button: MODELS-FILTERS-01, 2026-09-23.
- The list using its full room: MODELS-LIST-CAP-01, on the third try, 2026-09-23.

Still owed: Read aloud as a speaker on the Helpful row. READ-ALOUD-02, 05 and 06 have not run since the
button changed shape ([testing.md](../testing.md)). The licence-filter call was closed on the
maintainer's word on 2026-09-21 (commit `5a10ad17`).

Four features the maintainer picked from a drawing board on 2026-09-20. Each one was drawn at the
Deck's own sizes before anything was chosen, so the shape is settled and this plan is about building
and proving it, not about deciding it.

**The drawing board:** https://claude.ai/artifact/31aLBi17SH7AydhYfGYjBq — every option drawn at true
size, what was picked, and the corrections. A copy is kept in the repo at
[assets/62-feature-board.html](assets/62-feature-board.html) so it survives the link.
**Read it before writing a brief.**

---

## 1. What the maintainer asked for, in their words

Three things shaped this plan and they are recorded here so nobody re-derives them:

1. **"I liked how the third bug-fixing session went with the many different lanes."** Specifically:
   **the one running the session went straight to the Deck and started checking while the lanes were
   still writing code in their own copies of the repo.** Nobody waited. That is the shape this plan
   is built around, and it is why block 0 is short and the device work starts at the same moment the
   first lane does.
2. **Once the finished features start coming back, run the automatic checks with the Deck rig** — not
   only by hand at the end.
3. **Anything new that turns up** — a bug, or something that needs proving — **goes into the roadmap,
   goes into the report, and gets a real try at a fix in this session.** Make a good effort; if it
   turns out to be hard or long, write down what was learned and move on. The planned list still
   comes first.

---

## 2. What is true right now

Checked 2026-09-20, nothing pressed.

- Branch **experimental**, clean tree, tip `9c0d35e`.
- **The Deck is free this session.** The maintainer confirmed it. Other chats have driven it before
  and the rig cannot tell, so if something presses a button that this session did not, stop and ask.
- Nothing else is part-built. Plan 61 finished its run on 2026-09-18 and its leftovers are in the
  roadmap, not in a working copy.
- **The check everyone runs before a commit does not pass on a clean tree, and has not since at least
  18 September.** Found while writing this plan. Seven measured things sit worse than their best and
  three are past a hard limit: the roadmap at 121 KB against a 100 KB limit, the testing rows at 177
  against 165, the neutral guide at 27 against 24. The other four are in the code and none of them
  moved today. It is now its own two-star entry in the roadmap. **What this means for the session is
  in § 7, rule 1** — the starting numbers get written down in block 0 so a lane can tell its own
  failure from one that was already there.

---

## 3. The four features, and one bug

Every one of these was drawn at true size and picked on 2026-09-20. The drawing board holds the
options that were not picked, so the reasoning does not have to be repeated later.

### 3a. The game a chat belongs to — show it only while the ring is on the row

Two stars. Chat list.

Today the game's name always sits in a small line above the chat's name, and an empty line is held
open for older chats so the row never changes height. **Wanted:** that line stays empty until the
D-pad ring lands on the row. The empty line is still held open, so the row is the same height either
way and nothing jumps.

**Plus a real bug the maintainer found in the drawing.** The chat's name sits **14 pixels** to the
left of the game's name. The game's name is centred on the whole row; the chat's name is centred on a
group that also holds the small **×** that deletes a chat, and that × drags it left. The dots under
the row are centred on the row too, so the name is out of line with those as well. **Chosen
2026-09-20: take the × out of the centring**, so all three sit on the row's true middle. The cost is
accepted — about 28 pixels, roughly three characters, comes off the chat name so a long name cannot run
under the ×.

The roadmap entry moves to Verify naming check **CHAT-SLOTS-V3-14c**.

### 3b. Read aloud becomes a quiet speaker, pinned to the right of the Helpful row

Two stars. Reading aloud, screen layout, D-pad.

Today Read aloud is a full-width line across the answer, the same shape as Show details right beneath
it — two lines that look like the same control. **Wanted:** the line goes, and a small speaker sits at
the right-hand end of the Helpful / Not really row. Drawn not as a button but as a bare glyph on
nothing, the same treatment as the microphone in the Ask box: no border, no fill, low strength at
rest, full strength the moment the ring lands on it. **Chosen 2026-09-20: 45 per cent at rest**, not
the microphone's 15 — quiet but findable. Worth one look by eye on the Deck once built, because screens
lie about faint things.

Five things it must keep, all named in the roadmap entry and all of them checkable:

- a real D-pad stop under the same name it has today, so the by-name jumps still land on it;
- Left and Right along the row: Helpful, then Not really, then the speaker;
- the glyph and the spoken label both flip to stop while the Deck is talking, and it goes red the way
  the microphone does;
- **it stays reachable when the thumbs are greyed out.** On an answer that was stopped part-way, the
  D-pad steps over the greyed Helpful and Not really entirely. The speaker on that row must still be
  a stop or it becomes unreachable;
- the touch target stays 32 pixels tall even though the glyph is 16, so a thumb can still hit it.

Two testing rows need rewording when this lands: the one that lists today's stops under an answer,
and the read-aloud row itself. The drawing board drew Read aloud as a line and needs the same edit.

Up from Show details lands on this row once it exists.

### 3c. Session context folds into Show details, with Clear at the end of the tab

Three stars. Screen layout.

The shape was settled on 2026-09-16 and nothing about it reopens. The opened Show details panel gets
two tabs at the top, **This answer** and **Session · N**. Left and Right switch between them. The chip
row and its body stay where they are. Only the newest answer carries the Session tab, so it never
repeats down the chat. The closed line still reads **Show details**. Up from the tabs goes to Hide
details and then to Read aloud; Down goes into the chips; B anywhere inside closes the panel.

**The one thing nobody had drawn is now decided: Clear sits at the end of the Session tab's body, as a
full-width quiet button**, with the same confirm box it has today.

What a person gets: a settled answer costs one closed control instead of two. The separate session
bar, which is a whole second box with its own border, disappears.

The risk worth naming up front: this panel has been a D-pad trap before, and this change puts one
panel inside another. **The way out has to be checked on the Deck in all four directions, not argued
about in a review.**

### 3d. The AI models screen: every filter behind one Filters button

Three stars. Models, and everything else on screen.

Today the screen has three sections, and the first — Policy — is three buttons choosing which kinds of
model bonsAI will fall back to. **Wanted:** that choice stops being its own section and becomes one
filter among the filters, and the filters are reworked.

**The shape picked:** the two rows of filter chips become a single line reading **Filters · N on**,
with the filters that are on written out in words beside it. Pressing it opens a panel over the list
with every filter as a tickable row, grouped under headings.

**The filters to offer, exactly these six:**

| Filter | Note |
|---|---|
| Licence: open source only / also open weight / anything installed | The three Policy buttons, moved here. This is the point of the change. |
| Speed, Strategy, Expert | Matches the three Ask modes, so it already means something. |
| Vision | Models that can read a screenshot. |
| Installed only | What is already on this Deck. |
| Essentials only | The short list of one-model presets. |
| Recently added | New. The "New" badge already exists; this turns it into a filter. |

**Dropped on purpose:** Coding, and "FOSS only" as a separate switch. FOSS only overlaps the licence
filter, and keeping both would mean two controls that can disagree.

### 3e. The bug: you see about two models before you have to scroll

Two stars. Models, screen layout. **Added to the session 2026-09-20 at the maintainer's word** — it was
going to ride along behind the filter rework, and now it is its own item with its own device row.

Every change that could buy the list room was drawn on the board at true width, and **the board
measured each one from its own drawing** rather than trusting arithmetic. **The maintainer took all six
on 2026-09-20.** In the order they are worth doing:

| # | Change | Buys | What a person loses |
|---|---|---|---|
| 1 | **Let the list's own box be taller** | unknown — measured first | Nothing at all. It caps itself at 48 per cent of screen height, or 400 pixels, whichever is smaller: about 384 on the Deck. The popup has roughly 490 to give. |
| 2 | Suggested models off the top, into the Filters panel | about 49 px | The three suggestions stop being what you see first. |
| 3 | Advanced becomes a link beside the screen's name, section row goes | about 44 px | Nothing. |
| 4 | "Type a model name" becomes one chip on the filter row | about 32 px | One extra press to type a name by hand. |
| 5 | Two rows of filter chips down to one line | about 30 px | Filters sit behind a press. Already picked as § 3d's shape. |
| 6 | Counts line shortened and its big refresh button shrunk | about 9 px | Nothing. The smallest item here. |

On the drawing, all six together take the screen from **five model rows to eleven**.

**The drawing turned up something nobody had noticed, and it changes how this starts.** Drawn at the
sizes in the code, today's screen should already show about **five** rows. The maintainer counted **two**
on the Deck on 17 September. Those disagree, so **something else is squeezing the list and none of the
six is certainly the fix.**

**So the first change is the session's own job, not a lane's.** Number 1 is a single value, it costs a
person nothing, and it is the one the measurement points straight at. Block 0 measures which limit is
biting; if it is that one, the session changes the value itself, rebuilds, deploys and re-counts the rows
on the Deck. **This bug may close inside the first hour, before a lane has finished reading its brief.**
If the measurement says the cause is something else entirely, that goes in the report and the roadmap and
the remaining five are re-judged against the real number — never quietly dropped.

Lane M owns numbers 2 to 6, and its brief carries the measured figures.

**The maintainer's rule for this screen, given 2026-09-20: only change it if it buys room.** Ordering
and tidiness are not worth a commit here.

**Two things the rule threw off the list, and what replaced them:**

- Moving the "type a model name" box *below* the list frees nothing — it moves inside the same box the
  list lives in, so the list's share does not change. Replaced by number 4 above, which removes its row
  altogether. A small button on its own row would save only about two pixels, because the row is what
  costs, not the box.
- Advanced as a button at the *bottom* frees nothing — the button costs back about what the row cost at
  the top. Replaced by number 3 above, which takes it out of the scrolling part of the screen entirely.

**Two more figures I got wrong by hand** — four in all, counting the two just above. All corrected before
anything was built, and kept on the record because the habit matters more than the numbers:

- Dropping the Policy section frees no height. The three section buttons stretch to fill their row, so
  taking one away leaves two wider buttons and a row of exactly the same height. That was a claimed 86.
- The counts line's height comes from the 28-by-24 refresh button sitting in it, not from its text, and
  the text does not wrap at this width. So it is worth about 9, not the 14 to 23 claimed from shortening
  words.

Every figure in the table at the top of this section was **measured by the board from its own drawing**,
which is how the last two were caught. **Block 0 measures all of them again on the Deck, and no brief
carries a pixel promise that has not been measured there.**

---

## 4. Who does what

**The one running the session: Opus at extra-high effort. Lanes: Sonnet 5 at medium effort, four at
once where the work allows.**

One gentle note, recorded once and then dropped: the repo's own routing table asks for **Sonnet 5 at
high effort** for lanes that implement, not medium. The maintainer asked for medium. That is their
call and this plan follows it. What follows from it:

- **Every lane's brief has to be more exact than usual.** Medium effort follows a clear instruction
  well and improvises badly. Each brief names the files it owns, the exact behaviour wanted, the
  things that must not break, and the checks to run — no "work out the best approach".
- **The session reads every lane's changes before landing them**, as always, and more carefully on the
  two lanes that touch the D-pad.
- **If a lane comes back with the shape wrong twice, the session takes that piece over** rather than
  sending a third brief. One step up in model only after two real failures with evidence in hand.

Other standing rules from the routing table that apply here:

- **Screen-layout and D-pad work needs a device measurement before a lane touches it.** Features 3a
  and 3b are both in that class. Block 0 takes those measurements, and the briefs carry the numbers.
- **The bookkeeper** (Sonnet at high effort) does every roadmap, testing-row, changelog and plan-file
  edit, from a list handed to it after each landing and after each block of device checks. It never
  invents a device result, and **it does not commit while a landing is in progress** — that collision
  has cost a session before.
- **Deck checks:** this session writes the rows and reads the failures. A Sonnet runner may run rows
  that are already written, one runner at a time.

---

## 5. Order of work, and what runs side by side

The shape the maintainer asked for: **the lanes start and the device work starts in the same minute.**

### Block 0 — hygiene and three measurements, the session alone, about forty minutes

1. Start the tunnel. Confirm the Deck is running this exact checkout by hash. **Run the check and
   write down every number it reports before anything changes** — it is red already, so this is the
   line every lane is measured against.
2. **Measure three things on the Deck, because four briefs depend on them:**
   - **the models screen, and this one decides whether § 3e is a rework or a one-line fix.** How tall
     the popup really is, how much the screen uses, how much the list's own box allows, how much is left
     for rows, and how tall one row is. **The drawn screen says five rows and the maintainer counted
     two — find out which limit is actually biting before anything is built.** If it is the list's own
     box, change that value straight away, rebuild, deploy and re-count on the Deck: § 3e number 1 is a
     single value, costs a person nothing, and may close the bug here in block 0. Write the new row count
     down either way.
   - the chat slot row — the 14-pixel offset between the game's name and the chat's name, so the fix
     is aimed at a measured number and not at arithmetic.
   - the row under an answer — how tall it is today with the Read aloud line on it, so the saving is
     a real figure afterwards.
3. Write the four briefs from this plan. Every brief carries: the tip hash and a base check the lane
   runs first, the files it owns, the block of the stylesheet it owns, one change per commit, the five
   checks, the D-pad law, and **one override — the copy helper links the shared packages folder into
   the copy, so the lane skips its own package install step.**

### Wave 1 — four lanes start on "go", and the session goes to the Deck

| Lane | Builds | Owns, in words |
|---|---|---|
| **M — Models screen** | § 3d: the Filters button and its panel, the six filters, the licence filter replacing the Policy section. Then § 3e numbers 2 to 6, with the measured figures in the brief. **Number 1 is not this lane's — the session does it in block 0** | the models catalogue screen, the models hub screen, the policy tier panel, the filter data, and the models stylesheet |
| **R — Read aloud** | § 3b: the speaker on the Helpful row, the line removed, the D-pad wiring and the greyed-thumbs path | the reply actions builder, the read-aloud hook, the icon set, and the reply-actions block of the stylesheet |
| **S — Session tab** | § 3c: the two tabs inside Show details, Clear at the end of the Session tab, the way out in all four directions | the session context strip, the chat transcript, the chip ladder, and the details-panel block of the stylesheet |
| **G — Game name** | § 3a: the name showing only while the ring is on the row, and the × taken out of the centring | the chat slot row and the chat-slot block of the stylesheet |

**Three lanes touch the same stylesheet file** — R, S and G. Each brief names the block it owns and
they sit far apart in the file, so they should merge cleanly. Land them oldest first and re-apply by
hand if one clashes. Never resolve a clash by taking one whole side of the file.

**The session, at the same time, on the Deck:**

- run the free-play sweep as it stands today, so there is a "before" for the three Main-tab features;
- run the rows that these four features will disturb, so a failure afterwards can be told apart from
  one that was already there;
- chase the two things plan 61 left open that sit in this work's path: the focus trap where the
  question box empties and Down and Right go dead, and the ghost reply.

### Wave 2 — as lanes report back, the checks start immediately

This is the part the maintainer asked for. **A lane reporting back does not wait for the other three.**
The moment a lane's work is read and landed, its device rows run.

For each landed feature, in order:

1. Read the lane's changes as a diff. Land onto experimental, one commit at a time, five checks after
   each.
2. Hand the bookkeeper its list: the roadmap entry moves out of Features into Verify with its row
   named, the testing row is added or reworded, the changelog gets its line. **Same commit as the
   landing.**
3. Build and deploy to the Deck.
4. **Run the automatic checks with the rig** — the written rows for that feature, then a free-use pass
   where the pane is walked like a person would walk it.
5. Write the result into the testing row with its evidence file named. Pass means the bookkeeper moves
   the entry to Done in the same sweep.

### Block 3 — the free-play sweep, once all three Main-tab features are in

Three of the four change the Main tab, so the standing free-play sweep is owed once at the end with
all three present, not three times. **Two things at once can cancel each other out** — that has
happened before — so the sweep after the last landing is the one that counts.

### Block 4 — the report

Everything found and not fixed goes into the roadmap with its evidence and into § 9 here. Anything
needing the maintainer's own eyes or fingers goes on their checklist page, not left in a chat. A short
written summary at the end, in plain language.

---

## 6. The device checking pass

Rules first, because a clean-up once found twelve rows that read as proven with nothing behind them.

- **Save the evidence file before writing the row.** A result goes into a testing row only after its
  file exists under the evidence folder and is named in the row.
- A failure is written down with its file, not argued with.
- **Focused is not the same as visible.** A walk can pass every stop while the control sits behind the
  dock at the bottom. Check each stop's position against the top of the dock, not just that the ring
  reached it.
- If the device contradicts the code, check the installed build's hashes before believing it.
- Settings go back the way they were found, read off disk to prove it, at the end of every block.
- Screenshots and recordings come from the repo's own two scripts. The rig's own screenshot tool is
  broken.
- **Every command sent to the Deck starts with exactly `ssh deck@192.168.86.52 ` and nothing between
  the command and the address.** A whole device block was lost to this on 2026-09-19.
- Known rig quirks, so none of them is diagnosed twice: opening the plugin fails once right after a
  deploy and works on the second try; the build-match check can never pass and is not evidence; making
  a ninth chat destroys the oldest of eight; the screensaver freezes panel animations; the activity log
  is switched off, so read the journal instead.

### What each feature owes

| Feature | Checks it owes |
|---|---|
| Game name | The existing chat-slots row. Plus: the name is absent at rest and present with the ring on it; the row height is identical in both; the game's name, the chat's name and the dots all line up. |
| Read aloud | The reworded stop-list row and the read-aloud row. Plus: Left and Right reach it; the by-name jump lands on it; it flips to stop and back; **it is still reachable on an answer that was stopped part-way**; Up from Show details lands on the row. |
| Session tab | A new row. Left and Right switch tabs; Up leaves to Hide details then Read aloud; Down enters the chips; B closes the panel from anywhere inside; the Session tab appears on the newest answer only; Clear opens its confirm box and comes back to the right place. |
| Models screen | The two-row bug, re-measured. Plus: the Filters button opens and closes; each of the six filters changes the list; the licence filter does what the three Policy buttons did; the D-pad gets into the panel and back out; Advanced still reachable from its new place at the bottom; **how many model rows are visible now**, as a number. |
| All three Main-tab features together | The free-play sweep, once, at the end. |

---

## 7. Rules for this session

1. One change per commit, behaviour preserved, the five checks run between commits. **The check is
   already red on a clean tree (§ 2), so "green" is not the test — the test is "no worse than the
   numbers block 0 wrote down."** Every brief carries those numbers. **No lane ever makes the check
   pass by deleting documentation**; the docs are over their limit and trimming them is its own job
   with its own plan, not something to do by accident inside a feature.
2. Lanes hand back code, tests and one paragraph. They never touch the roadmap, the testing docs or
   the changelog, never touch the Deck, and never push.
3. Every lane prints and checks its base before doing anything. A copy can start hundreds of commits
   behind. The lane skips its own package install, because the helper links the shared folder in.
4. **Never stage everything at once in the shared checkout.** Another session's unfinished work gets
   swept into the commit. Stage the named files.
5. **Never remove a copy of the repo with the git remove command, and never remove one somebody else
   made.** Each copy's packages folder is a link straight into the main checkout's, and the command
   follows the link out. Unlink first, then delete what is left.
6. A failure on the device is written down with its evidence file named, not argued with.
7. Settings go back the way they were found, read off disk, at the end of every device block.
8. **Do not sink time into something that turns out to be hard.** Make a good effort, write down what
   was learned, move on. The planned four come first.
9. Only one thing drives the Deck at a time.
10. Do not start lanes just before the usage window resets.
11. **The roadmap carries the latest status at all times.** The moment a feature's code lands it moves
    out of Features into Verify with its row named; the moment its device check passes it moves to
    Done. Never a strike-through, never left sitting in the wrong list.
12. Everything written to the maintainer, in chat or in this file, is in plain language.
13. Nothing starts until the maintainer says "go".

---

## 8. Questions for you — all answered 2026-09-20

Written up as decision 114 in the locked decisions list, together with the four shapes picked earlier the
same day. **Nothing about the four features is open now.**

| # | Question | Answer |
|---|---|---|
| 1 | How should the chat's name be straightened? | **Take the × out of the centring.** Everything sits on the row's true middle; about three characters come off the chat name, and that cost is accepted. |
| 2 | How faint is the speaker at rest? | **45 per cent**, not the microphone's 15. Full strength when the ring lands on it. |
| 3 | Keep two section buttons on the models screen, or move Advanced to the bottom? | **Move it out of the section row** — but as a small link in the title row, not a button at the bottom. A button at the bottom costs back what the row cost at the top. |
| 4 | Is ordering worth a change on this screen? | **No. "I need to buy room. Don't change it if it doesn't give more space."** That rule heads § 3d and threw two jobs off the list. |
| 5 | Which of the six room-buying changes go in? | **All six**, 2026-09-20, including the two that cost a person something. Listed in § 3e in the order they are worth doing. |

**Nothing is open.** Every shape and every call is settled. The session waits only on "go".

---

## 9. Things to bring to your attention

- **The offset you spotted is a real bug and it was never reported.** The chat's name has been 14
  pixels off-centre for as long as the × has been in that row. It is being fixed inside feature 1
  rather than filed separately, because the same lane is already in that file.
- **Every number on the models screen is read from code, not measured.** The 90 pixels the list gets,
  the 430 above it, the 640 popup — all read. Block 0 measures them before a brief is written, so what
  we promise about "more rows" is a real figure.
- **The session tab is the riskiest of the four.** Putting one panel inside another is exactly the
  shape that trapped the D-pad in that panel before. Its way out gets checked on the device in all
  four directions, and if it traps, the feature waits rather than shipping.
- **Two of the three Main-tab changes touch the same rows of the screen.** Two changes on the same
  edge can cancel each other out; the free-play sweep at the end, with all three present, is what
  catches that.
- **The models screen's real limit may not be the one the open bug points at.** The list is capped
  twice — once by the screen it sits in, and again, tighter, by its own box. If the inner one is what is
  biting, every saving in § 3d is small change next to raising it. That is the first measurement of the
  session, and it could turn a three-star rework into something much smaller.
- **Two of my own figures on the models screen were wrong, in the hopeful direction, and I found it
  while drawing the finished screen rather than while building.** Dropping the Policy section and moving
  the tag box below the list both free nothing in height; § 3d has all four corrections. The shapes the
  maintainer picked are unaffected — only the pixel promises were. The lesson is already a rule here:
  a number that was read rather than measured does not go into a brief.
- **The check you run before every commit has been red for days and nobody noticed.** It is red on a
  clean tree, before this session touched anything. Three living documents are past a hard size limit
  and four measures in the code are worse than their best. Two things follow: the guide tells anyone
  starting work something untrue, and a lane handed "keep the checks green" would either stall or try
  to fix it by deleting documentation. Both are handled in § 7, and the trim job it points at is
  already on the roadmap as part-done. **My own edits to the roadmap today added about 1 KB to it**,
  which is the wrong direction; the trim is worth doing soon.
- **The models screen work closes an open bug as a side effect** — the one where only two models are
  visible before scrolling. It gets re-measured on the device, not assumed.

---

## 10. Progress log

Filled in as the session runs.

| When | What happened |
|---|---|
| 2026-09-20 | Plan written. Four features drawn at true size and picked. Every follow-up call answered the same day: the two fixes, the models-screen rule, and all six room-buying changes. Written up as decision 114. **Nothing is open.** Nothing started — waiting on "go". |
| 2026-09-20 | Four lanes started together on "go"; the session went to the Deck in the same minute. All four features landed: the game name shown only while focused, Read aloud as a speaker on the Helpful row, the session box folded into Show details as a tab, and every filter behind one Filters button on the AI models screen. The models-screen bug's real cause was found and fixed. Two more bugs turned up on the Deck and were fixed the same day: Down doing nothing while an answer was arriving, and the AI models screen losing the D-pad ring to Steam's own side rail when opened from its second button. Nothing has been proved on the device yet — deploying to the Deck is blocked because the plugin folder there is owned by root. |
