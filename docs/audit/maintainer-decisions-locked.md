# Maintainer decisions locked (refactor / handoff)

> **Clean-up task — trim this file.** ★★★ · about an hour with one worker, plus a second pass to
> check it · Sonnet 5 at high effort, reviewed by Opus at extra-high.
>
> This is now the biggest file in the project. Reading it costs roughly **89,000 tokens**. Splitting
> the settled decisions into an archive beside it and keeping only the recent and still-open ones
> would bring it to about 60 KB and save roughly **74,000 tokens** every time somebody reads it.
>
> Three stars, not two, because every decision here is referred to by its number from all over the
> project. Losing one, or renumbering one, is expensive and quiet. The split must be a move: nothing
> reworded, every number still resolving, proved by a checker before and after.
>
> Not started. Filed 2026-09-13 during the clean-up.

> **Moved from** [roadmap.md](../roadmap.md) **2026-08-04.** Full decision record for D1–D15, execution order, and cleanup candidates. Active index: [roadmap.md](../roadmap.md). Reorg commit: `ba2e5c5` (`git show ba2e5c5`).

Evidence lives in this audit folder — especially [05-plan.md](../archive/05-plan.md).

---

## Decisions needed

Open questions that need a maintainer call before the work can continue. Written
in plain language on purpose — each one says what the situation is, what your
choices are, and what happens either way. **Locked calls (2026-08-02 for D1–D6,
2026-08-03 for D7–D10)** are in
[Maintainer decisions locked](#maintainer-decisions-locked--2026-08-02); implement
from that section when it disagrees with an option above.

**One deferred (D38, now being acted on through D68).** D53 and D54 were answered 2026-09-05 as D65 and D66; D67 closed the structured-cards call; D68 and D69 were locked the same day (D69 waits on a library read for its title list). **D45–D52 were locked 2026-09-01** from the knowledge-base answer-quality plan ([planning/30-kb-answer-quality-plan.md](../planning/30-kb-answer-quality-plan.md)); **D53 and D54 are open** pending an explanation the maintainer asked for. The eval "D40" of 2026-08-31 is **D40b** from 2026-09-01 (resolved by D51). **D38** — the fusion weights, raised 2026-08-29 by D37's
first measurement — is **deferred at the maintainer's request** pending more data, more games and
more questions; it is not waiting on a decision today and nothing about the weights changes until it
is. **D37**, the blind holdout rows, was endorsed and locked
2026-08-29, and the measurement it was gating was run the same day (see D37 for the numbers and the
two findings that came out of them). **D39 and D40 are locked 2026-08-29 as well** — D39 by the
corpus gap sheet, and **D40** in discovery for **Terse mode**, before a line of code for it exists.
Before that, D18 — raised 2026-08-05 by the step 11 friction test — was locked as
option A on 2026-08-27 and implemented the same day.
**D32, D34 and D35 are all locked and implemented** (2026-08-27) — three separate causes of the one
*Clear cache* bug, which is now fixed and confirmed on device. **D33 is locked and implemented**
(2026-08-27, option C at 26px); it still owes a look on the Deck, which is what the maintainer asked
for. **D23–D27 were raised and locked during the RAG
work of 2026-08-18 to 2026-08-21; D28–D31 were raised and locked 2026-08-22.** Everything else
D1–D31 is locked; **D19 is superseded by D20** (below), and **D31 renumbers the superseded one to
D19b**. See the table below for D1–D15 and the sections below for D16, D17, D19–D31.

**Session handoff for the 2026-08-18 to 2026-08-21 RAG work:**
[session-handoff-2026-08-21.md](../archive/session-handoff-2026-08-21.md) — what shipped, what the numbers
are now, and what is still owed.

> **Numbering collision, flagged 2026-08-18 and resolved by [D31](#d31--which-of-the-two-d19s-keeps-the-number)
> on 2026-08-22.** The superseded corpus-licence question becomes **D19b**; the live
> *"Can you reach the strategy corpus without the game running?"* keeps **D19**.

---

### D33 — LOCKED (option C at 26px, 2026-08-27) — The new character avatars were drawn for 44px. The picker shows them at 24px. Which one moves?

**Locked in the maintainer's words: "let's go for 26 px and see how that is, I may change to another
after seeing how it looks."** So option C — grow the picker part of the way rather than to the
design's full 44px. Implemented the same day.

**What shipped.** Every avatar in the picker is now the drawn artwork at **26 pixels** — the
character rows, the Random row, the Custom row, and the little preview on the **OK** button. Before
this they were five different hardcoded numbers (22, 24, 24, 26, 26) and still the old pixel-grid
faces. They are now one number in one place, `PICKER_AVATAR_PX` in `CharacterPickerModal.tsx`, so
changing your mind is a one-line edit rather than a hunt through the file.

**26 is not an arbitrary middle.** It is exactly the line the design draws for where the letter
badge sits — inside the disc at 26 and above, beside it below. Putting every picker avatar at 26
puts them all on the same side of that line, which is what stops one screen showing two badge
styles at once. Anything you move to next is worth keeping at 26 or higher for that reason; below
it, the badges split.

**One visible change beyond the rows:** the avatar on the **OK** button grew from 22 to 26, so that
button is very slightly taller. It was included deliberately — it previews the character you are
about to pick, and leaving it at 22 would have been the one avatar on the wrong side of the badge
line.

**What did not change.** The main tab Ask bar stays at its own 18px and is deliberately not wired to
the picker's number, because the standing instruction is that the Ask row must not move.

**Locked by two tests** ([CharacterPickerModal.test.tsx](../../src/components/CharacterPickerModal.test.tsx)):
every avatar the modal draws is the same size, and every one is the drawn emblem rather than the old
pixel grid. Both were checked to fail without the change. That second test matters more than it
looks — the art style is an opt-in setting that falls back to the *old* pixel grids, so forgetting it
renders something that looks fine and is wrong.

**Not yet seen on the Deck.** The maintainer asked to look at 26 before settling, so the next step is
a device pass on the picker: row heights, how many characters fit on one screen, and whether the
props read clearly at 26.

**Original intake, raised 2026-08-26 from the AI character avatars design handoff.** Full detail:
[25-ai-character-avatars-handoff.md](../archive/25-ai-character-avatars-handoff.md).

> **The main tab half is settled (2026-08-26).** The maintainer's instruction was that the Ask bar
> textarea must not look any different except for better artwork in the corner. A true-size mock-up
> confirmed that is achievable exactly — same 18 × 18 slot, same 50.0 × 276.8px text row, same badge
> — provided the main tab renders the plain glyph and keeps its existing corner badge, rather than
> the design's `CharacterAvatar` wrapper, whose selection chip would be clipped by the slot's
> `overflow: hidden`. **What remains open below is the picker only.**

**What the situation is.** A design handoff arrived that replaces the little
pixel-grid character faces with drawn objects — Scout's bat, Heavy's sandvich,
Nick Valentine's fedora — each sitting on a coloured disc. The art is finished
and was reviewed at **44 pixels** across, and the handoff's own notes say the
character picker is a 44px grid.

It is not. In this codebase the picker draws those avatars at **24 pixels**, and
the largest avatar anywhere in the plugin is 26. Nothing is 44, and nothing is
bigger. So the art would land at a little over half the size it was approved at,
and nobody has seen it at that size.

**The second half of the same problem.** The design puts the letter badge in two
different places depending on size: inside the disc at 26 and above, and off to
the side as a small pill below 26. The picker's avatars are 22, 24, 24, 26 and
26 — which straddles that line. As written, **one picker screen would show both
styles at once**: side pills on the character rows, in-disc badges on the Random
and Custom rows. The side pill also adds roughly 19 pixels of width to a
selected row, in a list that currently reserves only the width of the circle.

**Your choices.**

**A. Grow the picker to 44px.** The art is shown at the size it was designed and
reviewed for, and every avatar lands on the same side of the badge line, so the
picker looks consistent. The cost is that the picker rows get noticeably taller,
which means fewer characters visible per screen on the Deck, and the row layout
has to be re-measured on device.

**B. Keep 24px and have the design re-checked at that size.** Nothing in the
picker layout moves. The risk is that the props were tuned at 44px — the bat
barrel taper, the fedora crown pinch, Navi's wings — and detail chosen at 44 may
turn to mush at 24. That is the exact failure the pixel grids were being
replaced for, so it would be worth someone looking at it small before we commit.

**C. Split the difference — grow the picker to 26 or 32, not the full 44.** Puts
every avatar on the same side of the badge line, which fixes the mixed-styles
problem cheaply, without the full row-height cost of A. The art is still below
its reviewed size, just less so.

**What happens either way.** Whichever you pick, the badge line needs to end up
with all the picker's avatars on one side of it, or the picker will look like two
different designs stitched together. If you would rather not decide from a
description, the approved prototype is in the repo at
`docs/design/handoffs/ai-character-avatars/AI character avatars.dc.html` — open it
in a browser and it shows the real thing at several sizes.

---

### D35 — LOCKED (option 1, 2026-08-27) — *Clear cache* clears the screen, but the AI's last answer is still stored on the plugin's own back end. Should clearing forget it?

**Locked in the maintainer's words: "tell Python to forget, if answer is still being generated,
stop it."** So both halves of option 1, including its open sub-question. Implemented the same day.

**What shipped.** A new command `forget_background_game_ai` ([main.py:2815](../../main.py#L2815)),
sent the moment you press **Clear** and not waited on. It drops the stored answer, and if a reply is
still being written it stops that too — properly, by closing the connection to the AI rather than
only cancelling the plugin's own job, because the AI keeps writing until the connection goes. After
a clear you see **nothing at all** — not a "Request cancelled." bubble.

**Why it is not waited on.** Waiting would hold the confirmation box open for up to a second and a
half while the AI is told to stop, on a button that should feel instant. The order is safe without
waiting: the forget clears the stored answer before it can be interrupted, so the screen's own
"what was the last answer?" question, sent a moment later when the panel rebuilds, either finds
nothing or waits its turn.

**Confirmed on your Deck the same day.** Asked a question, cleared, switched tabs — gone. Then
closed and reopened the Quick Access Menu, which is the strongest version of the same test — still
gone. The plugin log now records the drop, so a future session can tell "the command ran" apart
from "the screen just didn't redraw".

**One honest gap.** The *stop a reply mid-write* half is covered by four automated tests but was not
reproducible by hand on the Deck: the model answers in well under a minute even when asked for an
essay, and walking the D-pad from **Ask** to **Clear cache…** takes longer than that. Nothing
suggests it is broken; it simply has not been watched happening.

**Raised 2026-08-27, measured on your Deck. This is what actually makes *Clear cache* look like it
does nothing** — D32 and D34 were both real problems, both are now fixed, and **neither was the
one you were seeing.**

**How we know.** After clearing, the returning conversation was tagged `live` — the label the
plugin uses for *the answer that just came back from the AI*, not the label it uses for a saved
chat. So it was not reloaded from the saved chat file, and it was not restored from the
confirmation-box snapshot. Both of those routes are now closed and it still came back.

**What is actually happening, plainly.** When you ask something, the Python side of the plugin
keeps the finished answer so the screen can be rebuilt if you close and reopen the menu — that is a
feature, and it is why a reply survives you tabbing away mid-generation. *Clear cache* only empties
the screen. It never tells the Python side to forget. So the next time the panel rebuilds itself —
switching tabs is enough — the plugin asks "what was the last answer?", Python still has it, and it
gets painted straight back.

**Your two options.**

1. **Tell the back end to forget the last answer when you clear.** A small new command from the
   screen to Python saying "drop it".
   - *Good:* the cleanest meaning of the word "clear". Nothing lingers anywhere.
   - *Cost:* one new command between the two halves of the plugin, and we would need to decide what
     happens if you clear *while an answer is still being generated* — most likely it should stop
     it, which makes Clear cache slightly more powerful than it is today.

2. **Leave the back end alone; have the screen ignore anything older than the clear.** The screen
   remembers "I cleared at this point" and skips restoring anything from before it.
   - *Good:* no change to Python at all, and a generation still running is untouched.
   - *Cost:* the answer is still sitting in memory on the Python side, just not shown. If anything
     else ever reads it, the bug comes back wearing a different hat — and that is exactly the shape
     of this bug's last three "fixes".

**My read, if you want one:** option 1. This bug has now had three separate causes, and two of them
survived because something kept a copy the clear did not reach. Option 2 knowingly leaves a third
copy in place. The extra question option 1 raises — what a clear does to an in-flight answer — is
worth answering once, out loud, rather than inheriting by accident.

**Note on the two already-landed fixes.** They stay. D32's chat-slot detach stops the saved chat
being reloaded after your *next* question, and D34's snapshot discard stops the confirmation box
undoing the clear. Both were reproduced, fixed and re-tested on the Deck; they were simply not the
route you were hitting first.

---

### D34 — LOCKED (option 1, 2026-08-27) — *Clear cache* is undone by its own confirmation box. What should come back afterwards?

**Locked in the maintainer's words: option 1 — throw the whole photo away.** Implemented the same
day: `resetPluginSession` now calls `clearBonsaiSessionSurvival()`, which is the same discard
`clear_plugin_data` already used, so this is an established path rather than a new mechanism.

**On the accepted cost — it did not materialise in testing.** The worry was that discarding the
snapshot would also drop the remembered tab, bouncing you from **Settings** back to **Main** right
after pressing Clear. Measured on the Deck: the panel **stayed on the Settings tab**. Worth
re-checking if the modal machinery changes, but as it stands there is no visible cost.

**This fix is correct and was not sufficient on its own** — the cleared thread still came back, by a
third route that is nothing to do with the snapshot. That route is **D35**, now also locked and
fixed; the bug is closed.

**Raised 2026-08-27, measured on your Deck the same day. This is a follow-on from D32 — D32's
answer still stands, but the reason the button looked broken turned out to be something else, and
fixing it needs one small call from you.**

**What we found.** D32 assumed the old chat came back on your *next question*. It comes back
sooner than that. Press **Clear**, ask nothing at all, and the conversation is already back on the
screen. Measured twice with a real controller, on a build checked against the source.

**Why it happens, in plain terms.** *Clear cache* asks "are you sure?" in a pop-up box. Opening any
pop-up box makes the plugin restart itself behind the scenes — that is normal, and the plugin
handles it by taking a photo of your session first, then putting everything back afterwards. The
trouble is the order. The photo is taken **when the box opens**, which is *before* you press Clear.
So: photo taken (chat still there) → you press Clear (chat wiped) → box closes → plugin restarts →
plugin restores the photo → **your chat is back**. The button works; the box quietly puts
everything back a moment later.

**What needs deciding.** The fix is to stop that photo from restoring a session you just cleared.
The question is how much of the photo to throw away, because it holds more than the chat:

1. **Throw the whole photo away.** Simplest and safest to reason about.
   - *Good:* the clear definitely sticks, with the least fiddly code.
   - *Cost:* the photo also remembers which tab you were on. You press Clear while in **Settings**,
     and the plugin would likely drop you back on the **Main** tab instead of leaving you where you
     were. A small jolt, right after you pressed a button.

2. **Keep the photo, but blank out the conversation parts of it.** Keeps your tab position.
   - *Good:* nothing moves except what you asked to be cleared.
   - *Cost:* more fiddly — there is a list of things a clear resets, and blanking them in the photo
     means keeping that list correct in a second place. If the two ever drift apart, a future clear
     half-works and it will be hard to spot.

**My read, if you want one:** option 2, because option 1's tab jump is exactly the kind of "did that
do what I meant?" moment this whole bug was about — but it is your call, and option 1 is genuinely
more robust. If you pick 2, I would keep the two lists side by side in one file so drift is obvious.

**Not blocking anything else.** The pointer-detach half of D32 is already done and tested; this
decides only what the restart puts back.

---

### D32 — *Clear cache* says it clears the thread, but the saved chat stays on disk. Which half is wrong?

**Raised 2026-08-23 from Deck QA** (`recordings/DeckRecord_20260823_172915_game.mkv`).
**Locked 2026-08-27, in the maintainer's words: "yes it should clear the saved chat slot or at
least hide it so that the user comes back to a clean main tab."** That is option 1 with latitude
on the mechanism: clearing must leave the Main tab clean **and it must stay clean** — the old
turns must not come back when the next question triggers a transcript reload. Whether the slot
file is deleted or merely detached (the active-slot pointer cleared so nothing reloads it) is the
implementer's choice; detaching is acceptable. **The leftover-chats half is NOT settled by this
lock** — if the implementation detaches rather than deletes, the pile-up question below still
needs an answer, and it can be its own follow-up.

**What happens now.** You press **Clear cache…**. Its confirmation box says it clears *"this
session from RAM: input, reply, thread, transparency, branches, attachments, timers."* The screen
goes empty and a toast appears. But the chat itself is saved in a file under
`~/homebrew/settings/bonsAI/chat_slots/`, and that file is not touched. The plugin also keeps
pointing at it, so the next time anything reloads the chat — which happens automatically after your
next question — the old turns can come straight back.

**Checked on your Deck the same day.** Five saved chats were sitting there, none of them removed by
any clear. Three carried the same name, *Deep Rock Galactic: Survivor: one sentence*, made at 17:05,
17:08 and 17:29 — one for each time you cleared and asked again. So clearing does not reuse or empty
the old chat, it leaves it behind and starts another. They pile up.

**This is not the "Clear all plugin data" button.** That one is separate, and it does delete saved
chats properly. Only the smaller *Clear cache* is in question here.

**Your two options.**

1. **Make the button match its words.** Clearing also empties or deletes the saved chat you are
   looking at. Pressing it means the conversation is gone for good.
   - *Good:* the button does exactly what it says, and nothing accumulates.
   - *Cost:* if you were treating saved chats as things you can come back to, this throws one away,
     and there is no undo.

2. **Make the words match the button.** Clearing only tidies the screen; the saved chat is kept.
   Reword the box to say so — drop "thread" and say the saved chat is kept.
   - *Good:* nothing is ever destroyed by a button meant to tidy up.
   - *Cost:* the screen and the saved chat disagree until you switch chats, and the clear feels like
     it did less than you wanted — which is the complaint that started this.

**Either way, one thing still needs answering:** the leftover chats. Five built up from QA alone.
Should old ones be cleaned up automatically, or is a growing list of saved chats the intended
behavior and just needs somewhere to manage them from?

**My read, if you want one:** option 2 plus a cleanup answer. Option 1 makes a tidy-up button
destructive, and nothing else in the plugin deletes your content without saying "delete".

---

### D31 — Which of the two D19s keeps the number?

**Raised 2026-08-18, locked 2026-08-22: the live one keeps D19. The superseded corpus-licence
question becomes D19b.**

**The situation.** Two unrelated decisions both carried **D19** — the corpus licence question
(*mixed CC BY / BY-SA in one file*, superseded by D20 on 2026-08-14) and *Can you reach the
strategy corpus without the game running?* (locked 2026-08-17). A reference reading "see D19" was
ambiguous, and the risk was implementing against the wrong lock.

**Why the superseded one moves.** It is the cheaper side by reference count. The live D19 is cited
by roadmap.md (twice), by the *You cannot ask about a game unless it is running* entry, by the
`KB-NEWTITLE-01` row in testing.md, and by the fix commit itself. The superseded one is cited only
by D20, which sits directly beside it in this file — so the rename touches two adjacent paragraphs
instead of five files.

**Why `D19b` rather than the next free number.** Reusing D32 would scatter a 2026-08-14 decision
into the middle of the 2026-08-22 block and lose the ordering that makes this file readable. The
suffix keeps it where it belongs and makes the relationship to D19 obvious. Prior art in this file:
D21 carries its own numbering note because commit `e049ace` cited it as D18.

**Not chosen: leaving the collision note in place.** It had been there since 2026-08-18 and did not
stop the ambiguity — a reader following a "see D19" link still lands on whichever comes first.

---

### D30 — Which of the two `KB-NEWTITLE-01` rows keeps the ID?

**Raised 2026-08-22, locked 2026-08-22: the D19 row keeps `KB-NEWTITLE-01`. *Every corpus title has
cards* is renamed.**

**The situation.** Two rows in [testing.md](../testing.md) both carried `KB-NEWTITLE-01` —
*KB reaches a title named in the question (D19)* (line 177, **Verified on Deck 2026-08-22**) and
*Every corpus title has cards* (line 193, **Open**). They test different things: the first is
whether a question naming a game reaches that game's cards, the second is whether all thirteen
titles have any coverage at all.

**Why the newer one moves.** Same reasoning as D31 — reference count. The D19 row is cited from
roadmap.md, from this file, and from the 2026-08-21 session handoff. *Every corpus title has cards*
is cited nowhere outside its own table row, so renaming it breaks no live reference.

**New ID: `KB-COVERAGE-ALL-01`.** It names what the row actually checks (every title has cards),
and does not collide with `KB-COVERAGE-01`, which is the corpus-honesty chip row and a different
test.

**Watch for one thing when applying it.** The row also still says the corpus is 119 sections; it is
**133** as of corpus `2026.08.22`. Fix that in the same edit rather than leaving a second wrong fact
in a row being touched anyway.

---

### D29 — Which titles get Phase 4 track 3's per-game tips?

**Raised and locked 2026-08-22: keep Deep Rock Galactic: Survivor and Ocarina of Time, and write
their tips from research.**

**The situation.** Track 3's locked sample titles are DRG Survivor and Ocarina of Time, but the
only real per-game knowledge in the repo is for **Fallout 4** (`moshortcut://"F4SE"`) and **GTA:
San Andreas – DE** (`%command% -dx12`), both confirmed on the maintainer's own Deck on
2026-08-21. Three options were put: move the sample titles to the two proven ones, cover all
four, or keep the locked pair and research their tips.

**Chosen: the third.** [The planning page](../planning/18-phase4-track3-per-game-compat-tips.md)
rated it least preferred — it puts unverified claims in the part of the corpus users act on most
directly — and the maintainer chose it with that rating in front of them. Settled; not to be
re-argued.

**What it obliges, recorded so the risk is handled rather than just accepted.** A researched tip
has no provenance a user can weigh, so it must not render like a confirmed one: give researched
tips a distinct provenance line and the weaker trust tier the corpus already carries for this
case. Prefer quirks checkable on the maintainer's Deck in a minute (a shader stall, a menu that
ignores touch) over ones that cannot be checked at all (a claim about a specific Proton build) —
the second kind goes stale silently. The Fallout 4 and San Andreas quirks are still real and
still dated; author them somewhere rather than discarding the only verified per-game knowledge
in the repo. And keep 3–5 tips a target rather than a gate: with no natural supply the pull
towards padding is stronger here than under either other option.

**Still true regardless of this choice:** track 3 is blocked on the **schema v4** bump
(`app_id TEXT` on `compat_patterns`) and therefore on a second corpus release, and the eval
cannot currently tell a per-game tip from a shared tip on the same topic — so it ships unmeasured
unless a label is added. Both are on the planning page under *What to check before starting*.

---

### D28 — Ordinary phrases attach game cards. How hard should the floor be?

**Raised 2026-08-22 by the first on-Deck QA pass, locked the same day: option 2 — give the vector
half its own floor, separate from BM25's.**

**The precondition cleared before the lock.** The recommendation was "option 2, and not before
A2/D23 lands". D23 landed the same morning in `e606b82` — the fifteen paraphrase questions folded
into `kb_eval_v2`, taking it 219 → 234 rows and 138 → 153 labelled, with a **new baseline series
that is not comparable to anything measured before 2026-08-22**. So the floor is now tuned once
against one baseline, which is exactly what the recommendation was waiting for.

**What this obliges when it is implemented.**

- **Measure against the new series only.** Labelled tune top-3 is 86.3 keyword / 91.5 vector /
  91.5 fusion; labelled holdout 83.3 across all three; tips 68.8 / 72.9 / 75.0. Any before/after
  claim quoting a pre-2026-08-22 number is comparing two different fixtures.
- **Do not touch `BM25_RELEVANCE_FLOOR`.** Option 1 was explicitly not chosen because raising it
  pushes against D25, locked eleven days earlier to make short questions like *"the boss"* and
  *"gels"* reachable. The keyword half keeps its 1.0.
- **The keyword half is not innocent and this decision does not fix it.** Two of the four
  measured cases — *"thank you very much"* and *"what time is it"* — attach cards with the vector
  half switched **off**. Option 2 fixes the half that is clearly over-reaching; it will not make
  those two clean. Re-measure all six phrases from the table below after the change and record
  which ones still attach, rather than declaring the bug closed.
- **The eval cannot see this bug.** Every question in `kb_eval_v2` is a real question about a real
  game, so nothing in it scores worse when noise attaches. The six phrases below are the only
  evidence either way — keep them as a written check, and consider them a candidate for the frozen
  test chips shipped in `b278f7b`.

**Correction, 2026-08-23 — the vector half already had its own floor.** This decision is worded
as "give the vector half its own floor", but `VECTOR_RECALL_FLOOR` already existed at 0.50
(`py_modules/backend/services/knowledge_base_service.py`). So what was implemented is a retune of
an existing number, not the addition of a new gate. The decision text above is left as written,
because it records what was decided with the information available at the time; this note records
what turned out to be true. The intent — move the vector half, leave the keyword half alone — was
carried out exactly.

**And the retune is thin. 0.50 -> 0.515, measured 2026-08-23** against corpus `2026.08.22` seed
cards with the real embedding model. The measurement found what the 2026-08-18 run had already
found: **no single floor separates the noise from the genuine hits, because the two ranges
overlap.** 0.515 sits between *"one sentence"* at 0.5034 (noise, now excluded) and Mind Flayer /
`V2-PARA-S04` at 0.5169 (genuine, the lowest score the change must not break) — a margin of
0.0011. That margin is a property of today's card set, not a safety buffer; adding cards or
changing the embedding model moves it. Kept on the maintainer's call 2026-08-23, with the overlap
itself filed as its own backlog entry (*Card relevance needs a second signal*, Knowledge base lane)
rather than treated as a tuning job. **Do not retune this number again without re-running the
measurement — and if the answer is a third floor value, that is the signal to go do the backlog
entry instead.**

**The original write-up follows, kept because it is the measurement this decision rests on.**

**The situation.** With a game running and Strategy mode on, questions that have nothing to do
with the game still get game cards stapled to them. Measured on the Deck against corpus
`2026.08.22` with Deep Rock Galactic: Survivor running:

| What was asked | What attached |
|---|---|
| *"one sentence"* | Praetorian |
| *"thank you very much"* | Nitra |
| *"what time is it"* | Glyphid Dreadnought, Praetorian, Classes |
| *"please repeat that"* | Glyphid Dreadnought, Nitra, Dreadnought Twins |
| *"our team"* | nothing (clean) |
| *"four hours"* | nothing (clean) |

This is the regression direction `KB-SPELLING-01` in [testing.md](../testing.md) explicitly says
must not happen. **That row points at the British-spelling exemption set as the first place to
look, and the exemption set is innocent** — the query is not expanded at all, and Praetorian
scores `bm25=0.00` and never enters the keyword pool.

**Where it actually comes from — both halves, unequally.** Comparing hybrid on against hybrid off
on the same questions: the vector recall pass (`bf16b35`, this week) supplies the card on its own
for *"one sentence"* and *"please repeat that"*, where keyword-only attaches nothing. But
*"thank you very much"* and *"what time is it"* attach cards **with the vector half switched
off**, so the keyword floor is letting near-noise through by itself. The underlying cause is the
Strategy explicit route's relevance floor of **1.0**, which the new vector recall then widens.

**Why it did not show up before.** Every question in `kb_eval_v2` is a real question about a real
game. Nothing in the approved set asks *"what time is it"*, so no score moves when this
misbehaves. It is invisible to the eval and visible immediately on a device — the same shape as
the four faults in §2 of the [handoff](../archive/session-handoff-2026-08-21.md).

**Your options.**

1. **Raise the Strategy floor** (say 1.0 → 2.5) and re-measure. Cheapest change, one number.
   Costs recall on genuinely short questions — *"the boss"* and *"gels"* are short too, and the
   whole point of D25's light fix was to reach them. **Must be measured against the eval before
   and after, not eyeballed.**
2. **Give the vector half its own floor**, separate from BM25's. Fixes the half that is clearly
   over-reaching without touching keyword recall. More code, and picking the cosine cut-off is its
   own tuning job.
3. **Gate on the question rather than the score** — attach nothing when the question names no
   noun the corpus knows. Most precise, most work, and a new failure mode when a real question
   happens to use only common words.
4. **Accept it for now.** With no users (as of 2026-08-21) nobody sees it, and a stray card in the
   prompt degrades an answer rather than breaking it. Revisit before the first real user.

**Recommendation at the time, and the option chosen: option 2, and not before A2/D23 lands.** The
paraphrase rows were about to move every number anyway, and tuning a floor twice against two
different baselines wastes the measurement. Option 1 is tempting because it is one number, but it
pushes directly against D25, which was locked eleven days earlier to make exactly these short
questions reachable.

**Note this is not a reason to hold the corpus release** — it is plugin behaviour, not corpus
data, and the corpus published on 2026-08-22 is unaffected either way.

---

### D27 — Phase 4 shipped two tracks of three. Accept the split, or hold it?

**Raised 2026-08-19, locked 2026-08-21: accept the split — tracks 1 and 2 go in the release
notes now.** Written into `CHANGELOG.md` under `[Unreleased]` the same day. Track 3 gets its
own entry when it lands; Phase 4 is announced in two parts rather than held.

**Original framing.** Phase 4 was locked to ship all three tracks together. Tracks 1 and
2 shipped on 2026-08-19 and 2026-08-21; track 3 did not.

**Why it split.** Track 3 needs an `app_id` column on `compat_patterns` — a schema v4 bump and a
corpus rebuild, which by **Decision 6** (no migration) makes every installed corpus stale until
re-downloaded. That is a release action rather than an effort problem, and the two tracks that
shipped are the ones a user can see.

**Your choices.**

- **Accept the split.** Tracks 1–2 go in the release notes now; track 3 lands with the next
  corpus. Costs nothing but a lock you set yourself.
- **Hold.** Keep tracks 1–2 out of the release notes until track 3 lands, so Phase 4 is
  announced once and completely. Costs visible work sitting unannounced.

**Why the split was accepted.** **D24** settled that the corpus ships now rather than waiting
for track 3, so holding tracks 1–2 would have meant announcing nothing about work that is
already in users' hands the moment the corpus lands.

### D26 — Thirteen eval rows were re-keyed off a borrowed AppID. Endorse it?

**Raised and locked 2026-08-21: endorsed — "yes, still the same test."**

**Original framing.** `kb_eval_v2` is the approved scored set and the bake-off numbers
were measured against it, so editing it normally needs a call first.

**What happened.** Thirteen rows identified *"asked while Ocarina of Time is running"* by AppID
`413150` — which is Stardew Valley's real AppID, and was the bug being fixed (see the AppID
collision entry in [../roadmap.md](../roadmap.md)). Removing it from the corpus meant those rows
had to identify the game by name instead, using `shortcut`, exactly as State of Emergency
already does.

**Measured before asking, because the objection was measurable.** Every arm on every split
scored **identically to the decimal** before and after the re-key: keyword, vector-only,
rerank-only and RRF, across tune, holdout, compat-all and compat-gate-reachable. Sixteen
score pairs, zero movement. The rows test what they always tested.

**The standard this sets, which is the part worth keeping.** Editing an approved fixture is
allowed when the edit is shown not to move any score, and the showing comes *before* the ask.
An edit that does move a score is a different question and goes back to the maintainer with the
movement quantified, not with an argument about why it should be fine.

### D25 — "How do I beat the boss" — the light fix or the indexed one?

**Raised 2026-08-19, locked 2026-08-21: keep it light.**

**The situation.** A card knows its type — `boss`, `item`, `area` — but `sections_fts` indexes
only `(name, card)`, so the type was never searchable and *"how do i beat the boss"* returned
zero candidates on a title whose boss card was right there.

**Choice: query-time type recall.** A generic type word pulls that game's cards of that type
into the candidate pool. No schema change, no corpus rebuild, so it reaches a corpus already
installed on a Deck, and it is easy to reverse.

**Not chosen: indexing `section_type` in `sections_fts`.** A bare "boss" would then match every
boss card at BM25 rank — right for a one-boss title, noisy for a twelve-boss one — and it needs
a corpus rebuild to reach anyone.

**Why the light one held up.** It was narrowed on 2026-08-21 (`32685e5`) once the Phase 4 cards
took Ocarina of Time to six boss cards: the preference now applies only to kinds the keyword
half missed entirely, because `_sections_of_type` returns cards in authoring order and
preferring that slice outranked real matches. The narrowing made the light version behave
better, which strengthens rather than weakens this call.

### D24 — Publish a new corpus?

**Raised 2026-08-19, locked 2026-08-21: yes, publish.**

**Why it was a question.** Publishing makes every installed corpus stale until re-downloaded
(**Decision 6**, no migration), so it is a deliberate, announced action rather than a quiet
edit — and it pushes to Hugging Face and the GitHub mirror, which are outward-facing.

**One release, not three.** Three separate pieces of work were each individually blocked on it:

1. **Phase 4 track 2's 16 structured cards** — card content is corpus data, not plugin code.
2. **The Ocarina of Time AppID fix** — the wrong AppID is a row in the corpus.
3. **Phase 4 track 3** — needs schema v4, a new column on `compat_patterns`.

**The strongest argument, recorded because it will be the reason someone hurries this:** the
published corpus is currently stale *and* carries a known bug. Hugging Face serves `2026.08.16`,
which is 117 cards with Ocarina of Time still holding Stardew Valley's AppID — so anyone
downloading today gets a Stardew Valley session inheriting Zelda's cards and Zelda's spoiler
fencing.

**Sequencing, settled 2026-08-21: publish now — do not wait for schema v4.** The question was
whether to bundle track 3's schema bump so users take one stale-corpus event instead of two.
The maintainer's answer removed the premise: **there are no users yet.** Nothing is installed in
the field, so the no-migration cost of **Decision 6** is currently zero, and a second corpus
release when track 3 lands costs nothing either.

**Record that fact with a date, because it expires.** As of **2026-08-21** the plugin has no
users, and several cautions in this repo — the no-migration rule, the stale-corpus warning, the
reluctance to bump the schema — are priced for a world where it does. They are still the right
long-run rules and they cost nothing to keep, but do not treat a schema bump as expensive today
and do not assume it is still cheap in three months. The first real user makes all of it real.

### D23 — Where do the paraphrase questions go?

**Raised 2026-08-18, locked 2026-08-21: fold them into `kb_eval_v2`.**

**The situation.** `kb_eval_v2` has **one** labelled case out of 138 where keyword search returns
nothing, so the slice that proves the vector half adds recall is a sample of one. The fixture
questions share vocabulary with the cards they match, so it almost never exercises someone
phrasing a question in their own words — which is the exact failure the 2026-08-18 recall fix
was for.

**Choice: fold in.** The fifteen paraphrase questions in
[rag-vector-recall-floor-2026-08-18.md](../archive/rag-vector-recall-floor-2026-08-18.md) — already
written, measured and labelled with the card each should return, and sitting in
`tests/fixtures/kb_eval_paraphrase_v0.json` — join the approved set rather than forming a v3 or
staying a separately reported slice.

**Not chosen:** a v3 fixture (two sets to keep in step, and the older one keeps being quoted);
a separate reported slice (a number nobody gates on is a number nobody reads).

**Consequence, stated up front so nobody is surprised.** These questions are built to share no
words with their card, so scores will very likely **fall** — most on the keyword arm. That drop
is the measurement working, not a regression. Two things follow:

- The **2026-08-21 report is the last one measured on the old set.** Old and new numbers are not
  comparable and must not be quoted against each other (**R4**, same-corpus-and-fixture only).
- The tune/holdout split has to be assigned for the new rows before anything is tuned on them
  (**R1**), or the ship gate is contaminated on arrival.

**What it is for.** The holdout half currently cannot separate the arms at all — 83.3% whichever
approach is used, on 36 rows. This is the work that should give it something to separate.

**Done 2026-08-22.** The 15 rows are in `kb_eval_v2.json` as `V2-PARA-*` (219 → 234 rows,
138 → 153 labelled). **The split was assigned before the eval was re-run: all 15 are `tune`.**
That is forced, not chosen — they paraphrase `kb_eval_v0`, which is card-derived in full
("written alongside the cards they match", R1), and a paraphrase of a card-derived query is
still card-derived. A holdout row has to be written blind, and these were not.

**New baseline — a new series. Do not compare these against any report dated before
2026-08-22 (R4).** Last old-set report:
[kb-embed-bakeoff-2026-08-21-arms.md](../archive/research/kb-embed-bakeoff-2026-08-21-arms.md).
New: [kb-embed-bakeoff-2026-08-22-arms.md](../archive/research/kb-embed-bakeoff-2026-08-22-arms.md).

| Slice | keyword | vector only | fusion (ships) |
|---|---|---|---|
| Labelled tune, top-3 (n=117) | 86.3% | 91.5% | **91.5%** |
| Labelled holdout, top-3 (n=36) | 83.3% | 83.3% | **83.3%** |
| Troubleshooting tips, top-3 (n=48) | 68.8% | 72.9% | **75.0%** |

**Three results worth your attention, two of them unwelcome.**

1. **The scores fell where they were meant to.** Labelled tune fusion went from 94.1% to 91.5%
   on a set that is 15 rows harder. That is the measurement working, exactly as this decision
   said it would.
2. **This did not do what it was for.** D23's stated purpose was to give the holdout something
   to separate. **The holdout is untouched — still n=36, still 83.3% on every arm, still
   overlapping intervals.** It could not be otherwise: the split rule sends all 15 rows to
   `tune`, so a decision aimed at the holdout could never reach it. The holdout separation
   problem is exactly where it was on 2026-08-21, and **it needs rows written blind against
   the cards** — which is a different piece of work from this one.
3. **The troubleshooting slice went up, not down** — 72.5% → 75.0%. The 8 compat paraphrases are
   *easier* than the compat rows already in the set, so folding them in raised the average. Worth
   knowing before anyone reads that rise as an improvement in retrieval: nothing improved, the
   test got easier on that slice.

**Two smaller things that changed shape.** The recall slice — labelled cases where keyword
search returns nothing, the one D23 called "a sample of one" — is now **n=3**. Better, still
too small to carry a verdict. And on that slice fusion now scores **33.3%** top-3 against
vector-only's **66.7%**, where on the old single case both scored 100%. On the tune slice fusion
no longer beats vector-only either (both 91.5%). Neither is a regression in shipped behaviour —
the corpus and the code are unchanged — but if fusion is going to be defended over plain vector
search, these are now the numbers it has to be defended with. **Related: [D28](#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be)** — tune a floor once, against this baseline, not the old one.

---

### D22 — A matched troubleshooting topic is a strong preference, not a filter

**Raised and locked 2026-08-18**, while planning the fix for *"Compat retrieval returns a tip
from the wrong topic"*. Extends **D16**, which decided *whether* a question reaches the tip
sheet; this decides *what it is allowed to return once it gets there*.

**The question, plainly.** The router already works out what a troubleshooting question is
about — "the game only responds to the touchpad and ignores the sticks" is a Steam Input
question. Today that answer is thrown away and the search runs across all 124 tips, which is
how a question about controllers comes back with a tip about screen resolution that happens to
contain the word "ignores". Should the matched topic **restrict** what can be returned, or
merely **favour** it?

**Choice:** a **strong preference**. The matched topic feeds the ranking as a heavy signal;
tips on that topic rise, tips on other topics can still surface when their match is genuinely
better. Nothing is excluded outright.

**Why.** The router guesses, and a hard filter turns every wrong guess into an empty result or
a forced-wrong answer with no way back. A question that spans two topics — "my controller
stops working after sleep" is Steam Input *and* power management — has no single right topic
to filter on. Preference degrades gracefully in both cases; a filter fails hard in both.

**Cost, stated plainly:** an off-topic tip can still win if it outscores everything on the
right topic by a wide margin. That is the failure this fix is *for*, so the preference has to
be weighted heavily enough to actually change the outcome, and the fix is not done until the
four `KB-ROUTER-01` sentences return on-topic tips. If measurement later shows preference is
too weak on this corpus, tightening toward a filter is a weight change, not a rewrite — which
is the other reason to start here.

**Not chosen:** hard filter (predictable, but one bad guess and the user gets nothing);
leaving it as-is (measured 2026-08-17: half the router's own test sentences return an
off-topic tip).

**Amended the same day, by measurement.** The plan said the compat path would also get the
vector recall pass the strategy path got. It was built, measured and **removed**: on the tune
split it cost a case and gained none (27/27 without, 26/27 with), and structurally it cannot
help — reaching compat retrieval means the router matched a topic, so topic recall has already
filled the pool, and a vector pass could only add *off-topic* candidates, which is the opposite
of this decision. Zero of the 40 compat fixture rows reach retrieval with no routed topic.
Detail: [rag-compat-topic-preference-2026-08-18.md](../archive/rag-compat-topic-preference-2026-08-18.md).

**Implemented 2026-08-18.** Weight `RRF_W_TOPIC = 0.30` — the *weakest* setting that fixes all
four KB-ROUTER-01 sentences, chosen that way because the decision was preference, not score.
Router sentences 1/4 → **4/4**; compat tune top-3 81% → **100%**. Works without an embed model.

### D21 — Thinking effort sends "on", not the level name

**Raised and locked 2026-08-15**, while implementing Thinking effort control Phase 1.
Supersedes the wire mapping locked in
[16-soft-num-predict-thinking-budget.md](../planning/16-soft-num-predict-thinking-budget.md).

**The question, plainly.** When you pick Brief / Balanced / Deep, what should bonsAI ask the
model for? Some models understand "think a little" vs "think a lot" as named levels. Most
thinking models only understand "think" or "don't think".

**Choice:** send plain **`think: true`** for all three levels. The difference between them is
how many tokens are *reserved* for thinking (256 / 512 / 1024), which is added on top of the
mode's reply budget so reasoning cannot eat the answer's allowance.

**Why.** The named levels `"low"` / `"medium"` / `"high"` are a **gpt-oss-family** feature.
qwen3 and deepseek-r1 — the thinking models actually likely to be installed on a Deck, and
the ones in the pull catalog — accept `think` only as a boolean. Sending them `"low"` would
have broken models that genuinely think, which is worse than under-using one family's dial.
Portability beat depth-on-one-family.

**Cost, stated plainly:** on gpt-oss models the three levels differ less than they could,
because their built-in dial is ignored. Native levels remain available as a later change,
and would need per-model capability detection to be safe.

**Not chosen:** "try the level, fall back to boolean, then fall back to off" — best result per
model, but three possible round trips and the most code to get right for a benefit only one
model family sees today.

**Related, same session:** a model that cannot think *at all* is not a decision but a
mechanism — it gets one silent retry with thinking off, is remembered for the plugin session,
and the user is told once. Without it a plain HTTP 400 would have failed the Ask outright,
because `ollama_ask_service` does not fall through to the next model on a generic 400.

> **Numbering note:** the commit that landed this (`e049ace`) cites it as **D18** in its
> message, written before D18–D20 were known to be taken. The decision is **D21**; every
> code and doc reference says D21.

---

### D19b — Mixed CC BY / BY-SA cards in one corpus file? *(superseded by D20, 2026-08-14)*

> **Numbering note:** formerly filed as D19 by mistake; renumbered D19b 2026-08-28 per
> [D31](#d31--which-of-the-two-d19s-keeps-the-number). The other D19 — *Can you reach the
> strategy corpus without the game running?* — keeps the number.

**Raised and locked 2026-08-09** (ATTR-1.3 in
[15-corpus-licensing-attribution-plan.md](../archive/15-corpus-licensing-attribution-plan.md)).

**Choice: CC BY 4.0 only for the publishable corpus.** ShareAlike sources (CC BY-SA 3.0/4.0)
are deferred until attribution / ShareAlike redistribution work is ready. Do **not** treat
`source_license` coexistence as the locked policy — the seed may still hold BY-SA cards for
dev QA, but Phase 6 public publish is BY-only until that deferral lifts.

**Why.** ShareAlike binds adaptations; publishing a mixed corpus needs the full
`ATTRIBUTIONS.md` + ShareAlike path. Restricting to BY 4.0 (Portal Wiki today) keeps first
publish simpler.

**Follow-up 2026-08-09:** `zelda.fandom.com` is **GFDL**, not Fandom's usual CC-BY-SA
(page footer confirmed). Seed `source_license` corrected; still excluded from publish under
this decision (GFDL ≠ CC BY 4.0). See
[15-corpus-licensing-attribution-plan.md](../archive/15-corpus-licensing-attribution-plan.md)
ATTR-1.1.

**Superseded 2026-08-14 by D20** — reopened during Phase 6 publish planning once it was
established that the ShareAlike attribution machinery (`ATTRIBUTIONS.md` generation, corpus
license header, `NOTICE` separation) already fully discharges the obligations D19b was written
to avoid taking on. No new legal information; a re-weighing of cost against what BY-only
excluded (all six ShareAlike wikis).

---

### D20 — Publish the corpus as one CC BY-SA 4.0 work, including ShareAlike sources

**Raised and locked 2026-08-14**, during Phase 6 publish planning. Supersedes D19b.

**Choice:** the first public corpus ships as a single work licensed **CC BY-SA 4.0**, and
ShareAlike sources (the CC-BY-SA-3.0/4.0 wikis: L4D2, Fallout, GTA, Cyberpunk, Combine
OverWiki) are **included**, not deferred. Per-card `source_license` stays recorded and
queryable — declaring one license for the whole work is what Hugging Face's dataset metadata
requires, not a claim that every card shares one license underneath.

Still excluded, on grounds D20 does not touch: `zelda.fandom.com` (**GFDL** — a different
license family that does not mix with Creative Commons; the 2 affected cards are dropped
from the seed entirely rather than published under the wrong license — see
[15-corpus-licensing-attribution-plan.md](../archive/15-corpus-licensing-attribution-plan.md)),
`hades.fandom.com` and `developer.valvesoftware.com` (NonCommercial), `bg3.wiki`
(per-contributor licensing is ambiguous — some contributors' text is NC-only and no page says
which).

**Why.** No code anywhere filtered by license — D19b's restriction existed only as a paragraph
in the generated `ATTRIBUTIONS.md` header
([build_rag_db.py](../../scripts/build_rag_db.py) `_attributions_header_lines()`) and about
eight doc mentions; enforcing it as a real gate would have meant writing a filter to *shrink*
an already-small, already-licensed, already-tested corpus for no legal necessity — ShareAlike
obligations are fully satisfied by the attribution machinery Stages 1–5 already shipped.
Sweeping the exclusion under one BY-only rule was overcautious relative to what CC BY-SA
actually requires.

**Consequence:** first publish grows from ~67 sections (58 maintainer + 9 Portal) to 117 of
the 119 seed sections, across 6 wikis instead of 1.

### D17 — Game knowledge was gated on the Ask mode toggle

**Raised and locked 2026-08-06. Choice: ungate it.** Shipped the same day.

**What was going on.** Strategy cards only attached when the Ask mode toggle was set to
*Strategy*. The same question, about the same running game, got cards in one mode and nothing
in the other two:

| Ask mode | "how do I beat the tank", Left 4 Dead 2 running |
|---|---|
| Speed | nothing |
| Strategy | cards |
| Expert | nothing |

Expert is where somebody stuck on a hard fight is most likely to be, and it got no game
knowledge at all. This is D16's shape on the other side of the corpus: the content existed,
and reaching it depended on something unrelated to the question.

**The call.** Ask mode still decides **how many** cards attach (`_budget_for_mode`: Speed 1,
Strategy 3, Expert 5). It no longer decides **whether** the corpus is consulted. Explicit
Strategy mode still wins outright; a troubleshooting-shaped question still routes to compat
even with a game open.

**Two guards, because the new route is permissive by design.** An Ask that never declared
itself to be about the game is weaker evidence than one that did, so on that route: the
relevance bar is higher (`IMPLICIT_ROUTE_RELEVANCE_FLOOR`, provisional — see below), and the
generic genre fallback is suppressed, so an ordinary Ask made while a game happens to be open
does not grow a boilerplate strategy block that answers nothing.

**Two things found while shipping it.**

*Cross-game leak, fixed first in its own commit.* Strategy search fell back to an unscoped
corpus-wide query when the running game could not be resolved, so "how do I beat the tank"
while playing an uncovered game returned Left 4 Dead 2's card. Wrong-game advice, delivered
confidently. D17 would have routed far more traffic through it. Search is now scoped to a
resolved game or does not run.

*The relevance floor is looser than it looked.* FTS5 runs the porter stemmer, so "what time do
the shops close on a sunday" matched "crescendo **timing**" in an unrelated card and scored
2.72 — above the 1.0 floor. Named-boss questions score 10+, a plain "how do I beat the tank"
scores 5.28. `IMPLICIT_ROUTE_RELEVANCE_FLOOR = 4.0` sits between them. **That is two data
points on a two-card-per-game corpus and will move in stage 6d** — it is in the code because
shipping a known noise source is worse than shipping a constant that admits it is a guess.

On-Deck QA: **KB-ASKMODE-01**.

---

### D16 — The compat knowledge base was unreachable for most of its content

**Raised and locked 2026-08-06. Choice: widen the gate now.** Shipped the same day.

**What was going on.** Routing an Ask to the troubleshooting knowledge base required the
literal word `deck` or `proton` in the question, or one of about six preset phrases. Measured
against 40 freshly drafted troubleshooting questions: **3 reached it**. Of the 19 phrased the
way a player actually types, **zero** did — and 18 of the 21 written deliberately to match the
gate also missed. That left roughly 24 of the corpus's 27 topics — storage, Steam Input,
anti-cheat, streaming, VR, Wine, emulation — unreachable, each with 6–10 tips shipped behind
it. This was decision **Q8**, deferred as "natural-language asks skip KB"; the measurement
showed it was not a nicety but the feature being mostly off.

**The options were:** keep Q8 deferred and tune fusion on strategy evidence alone, accepting
that the compat arm of the bake-off would score cards production never fetches; or widen the
gate as a scoped product change. Maintainer chose to widen.

**How it was done, and the constraint that shaped it.** `question_matches_troubleshooting_log_context`
has **five** consumers — knowledge base routing, Proton log attachment, system-prompt framing,
stream tags, and the client-side permission hint. Widening it would have changed four
behaviours to fix one. So the fix is a **separate, additive** predicate,
[compat_topic_router.py](../../py_modules/backend/services/compat_topic_router.py), that only
the knowledge base reads; `should_retrieve_knowledge` runs the compat path when either matches.
The phrase gate and the frontend heuristic that mirrors it are untouched.

**Result:** reachability 3/40 → **39/40**, **13/13** on a blind holdout split whose queries were
not read while the rules were written, and **0/107** strategy false positives. Old fixtures
3/18 → 18/18.

**Two things found while building it, both now pinned by test.** Substring matching had `lan`
firing inside *plants*, *plane* and *island*, routing three strategy questions to
troubleshooting; terms now match at a word boundary. And normalizing apostrophes to spaces
turned `can't see` into `can t see`, silently killing two rules that read as though they
worked; apostrophes are dropped instead. A third test asserts every topic in
`data/kb/compat_patterns.json` has a routing rule, so shipping content nobody can reach fails
rather than repeats.

Full measurement and the options as presented: [rag-pr2-signoff.md](../archive/rag-pr2-signoff.md) § 2.
On-Deck QA: **KB-ROUTER-01**.

Evidence for all of these lives in [docs/audit/](.), especially
[05-plan.md](../archive/05-plan.md).

---

### D1 — Two features were built with a frontend but no backend. Build them, or remove them?

**What's going on.** Two buttons/flows in the UI call into Python functions that
were never written. The names exist only in TypeScript. Because both call sites
threw the error away, nothing ever surfaced — no crash, no log, no message. They
now log to the console, and both are listed as bugs above.

The two are very different sizes, so you may want a different answer for each.

**~~Option A — build the small one, delete the big one.~~** *(my recommendation)*

`merge_pulled_tags_into_routing_orders` is small: after you install models with a
custom setup profile, it should add those models to your try-order list. The
setting it needs (`model_routing_order`) and its validator already exist, so this
is a short piece of work with a clear right answer.

`get_session_rag_chip_candidates` is the bigger one: it should suggest preset
prompts drawn from your local knowledge base for whatever game is running. There
is no backend for it at all, and building one means deciding what counts as a
good suggestion and how to rank them — that is product design, not a refactor.
Deleting the frontend path means the preset carousel keeps using its fixed
built-in prompts, which is exactly what it does today, so users would notice no
change.

**Option B — build both.** You get the RAG preset chips feature you originally
planned. It costs real design time and it is new behavior, so it should not ride
along inside refactor work.

**~~Option C — delete both.~~** Smallest and safest. You lose the pulled-model
try-order convenience, which means setting try-order by hand after installing
models.

**~~Option D — leave them as they are.~~** They now log loudly, so they are no longer
invisible. Costs nothing, but two dead paths stay in the code and a future reader
has to work out why they are there.

**Either way:** the CHANGELOG entry that announced "Session RAG preset chips" as
a shipped feature has been corrected to say it is frontend-only and not working.

---

### D2 — A whole group of backend functions is unused. Safe to delete?

**What's going on.** When the Proton experiment journal UI was removed on
2026-07-30, the backend behind it was left in place. Five backend functions and
their service module are still there with nothing calling them. The same cleanup
removed the "tiny model thinking blurbs" feature and left
`thinking_tiny_model_service.py` behind — that file is now imported by literally
nothing. There are also six other backend functions with no caller, and a TDP
power-adjustment function whose only remaining caller is its own test.

Altogether that is roughly 12 unused entry points plus two modules.

**Option A — delete it all after one check.** *(my recommendation)*

The check: I looked at the app code only, not the preview test suite. Before
deleting anything I would grep `tests/preview-suite/` to confirm none of these
are driven from there. That is a couple of minutes' work. If it comes back clean,
deleting is safe and makes every future search through the codebase smaller and
less confusing.

**~~Option B — delete the certain ones, keep the ambiguous ones.~~** The Proton
journal group and `thinking_tiny_model_service.py` are unambiguous — the features
were removed on purpose. Two others are worth a second thought:

- `ask_game_ai` is described in the code as the *foreground* Ask path. The app
  only uses the background one now. If you ever want a synchronous Ask, this is
  the code for it; if not, it is dead weight.
- `cancel_rag_corpus_download` suggests knowledge-base downloads were meant to be
  cancellable and the button was never wired up. That might be a missing feature
  rather than dead code.

**~~Option C — keep everything.~~** No risk, but the confusion stays: a newcomer
reading `main.py` cannot tell which of the 55 functions are live.

---

### D3 — The riskiest refactor has no safety net. How do you want to handle it?

**What's going on.** This is the most important decision here.

The plan's Phase 3.4 wants to break up the two biggest frontend files —
`src/index.tsx` (1,965 lines, changed more often than any other file) and
`useBonsaiAskOrchestration.ts` (the whole Ask flow: submit, cancel, polling,
streaming, follow-ups).

Neither has a single automated test. More broadly, 44 UI component files share
one test file between them. The practical meaning: **`npm test` passing tells you
nothing about whether a UI change broke something.** It would still pass if every
component were deleted. So a refactor that is supposed to change structure
without changing behavior cannot actually be *shown* to have done that.

**Option A — write safety-net tests first, then refactor.** *(my recommendation
if this refactor matters to you)*

Write tests that capture what these files do today, then move code and confirm
the tests still pass. The groundwork exists — there is already a fake backend for
tests (`fakeDeckyRpc.ts`) and three working hook tests — so this is a known
quantity, not an experiment. It is real extra work up front, and it is the only
option where a mistake gets caught before it reaches your Deck.

**~~Option B — refactor anyway, verify by hand on the Deck.~~** Faster to start. Each
change needs you to install to the Deck and click through it, and a subtle
regression (focus behaviour, a race in Ask polling) can slip through a manual
pass. If you choose this, the work should be sequenced last and done in small
commits so anything broken is easy to undo.

**~~Option C — leave those two files alone.~~** Do the lower-risk items instead
(there are plenty) and accept that the two biggest files stay big. Honest and
zero-risk; the handoff goal is only partly met, since these are exactly the files
a newcomer finds hardest.

The smaller `MainTab.tsx` is a useful middle ground under any option: it is only
187 lines and changes constantly purely because every new feature has to thread
props through it. Fixing that is structural and easy to eyeball.

---

### D4 — Old QA evidence: keep or prune?

**What's going on.** `docs/test-evidence/` holds 263 files across nine folders of
past test-run output. Only three of those folders are linked from any document;
the other six are referenced by nothing. It is the largest directory in `docs/`
and about 96% of it is unreferenced. `testing.md` already anticipated this,
noting orphan evidence folders may be pruned once nothing links them.

**Option A — prune the six unreferenced folders.** Keeps the three that are cited
as evidence. Makes `docs/` much smaller and easier to look through.

**~~Option B — keep everything.~~** It is only disk space, and old run output can be
useful when chasing a regression that reappears.

**~~Option C — prune, but archive first.~~** Zip the removed folders somewhere
outside the repo, same approach used for the v0 drafts in Phase 0.

I have no strong view — this is about what QA history is worth to you, not about
code quality. I did not touch it.

---

### D5 — Import graph: keep the built-in one, or switch to madge?

**What's going on.** You approved adding a dependency graph so the refactor can
answer "who imports this file?" reliably. The plan suggested the `madge` tool.
madge was not installed, and this generator runs on **every commit** via the
pre-commit hook, so adding a tool plus a multi-second graph build to every commit
seemed like the wrong trade. I wrote a small built-in version instead — about 50
lines, no new dependency, instant.

It currently reports 479 imports, no circular dependencies, no orphans. It has
already proved more accurate than searching by hand: checking what imports
`deckyCall.ts`, it found 15 files where my own grep found 14.

**Option A — keep the built-in one.** *(my recommendation)* Fast, no dependency,
and it does what the refactor needs.

**~~Option B — switch to madge.~~** More battle-tested and handles exotic import
styles this codebase does not currently use. Costs a dependency and slows every
commit slightly. Worth doing if you ever add TypeScript path aliases, which would
make the simple version unreliable.

---

### D6 — Sequencing: what should I do next?

Not a hard decision, just a checkpoint. The audit produced a ranked plan in
[05-plan.md](../archive/05-plan.md). The first four items are all low-risk, mechanical,
and verifiable by the compiler and existing tests:

1. Delete the unused backend code (needs **D2**)
2. Fix four one-line inaccuracies in the docs, and move a plan document that
   declares itself archived into the archive folder
3. Delete `refactor_helpers.py` — a leftover forwarding file that adds nothing
   (careful: the deploy scripts copy it, so that has to be updated too)
4. Delete `settingsAndResponse.ts` — another forwarding file, this one with 22
   files pointing at it

Together these measurably shrink the codebase without requiring any design
decision. **D3** is the one that changes the shape of everything after it.

Also worth knowing: the friction test (having a fresh pair of eyes try a real
task and log everywhere they got stuck) is deferred until after the refactor, per
your earlier call, so it will measure the improved codebase rather than the
starting point.

---

### D7–D10 — raised during the 2026-08-02 session, locked 2026-08-03

**D1–D6 are locked and largely executed.** These four came out of doing the work;
options below stay as the decision record. **Locked calls** are in the table under
[Maintainer decisions locked](#maintainer-decisions-locked--2026-08-02) and in
**execution order** steps **5c–5d**.

---

#### D7 — Two more dead functions turned up. Delete them too?

`_reencode_oversized_capture` and `_mirror_capture_to_plugin_dir` in
`screenshot_media.py` have **no production callers** (`_mirror_capture_to_plugin_dir`
is an explicit deprecated no-op; capture uses `_finalize_steam_capture_file`).
Unlike the kmsgrab set deleted in `4a26cfa`, these were **already dead before**
any of this session's work — they are not a cascade from a deletion, so they were
left alone rather than folded into someone else's commit. One unit test still calls
`_reencode_oversized_capture`.

- **Delete them.** Consistent with everything else this session removed; ~2
  functions, no production callers, and the module has real behavioral coverage.
- **Keep them.** If either is a deliberate parking spot for capture work you
  intend to resume, say so and they get a comment saying why they are unused —
  which is the thing that stops a future session proposing this again.

**Locked 2026-08-03:** **Delete both**; remove the `_reencode_oversized_capture`
unit test (or fold any useful assertion into `_finalize_steam_capture_file` tests).

---

#### D8 — The deploy path has two blind spots. Fix them, or keep checking by hand?

Both were found by accident this session, and both mean a deploy can look
successful while the Deck is running something else:

1. **It reports success without landing.** A deploy ran while the Deck drifted to
   sleep. `build.ps1` printed *Deployment complete!*; the bundle on the Deck
   still carried the previous deploy's timestamp and no new plugin log appeared.
   The script never verifies what it copied.
2. **It copies but never prunes.** Files no longer shipped stay on the device
   from earlier deploys. When `refactor_helpers.py` was deleted, the stale copy
   sat on the Deck and would have satisfied any import that had been missed —
   the plugin loading proved nothing until it was removed by hand.

   **Code check (2026-08-03):** this is primarily a **Windows / `build.ps1`**
   problem — `build.sh deploy` already `rm -rf`s the plugin dir before copy.
   `watch-deploy.ps1` delegates to `build.ps1`; `watch-deploy.sh` delegates to
   `build.sh deploy`.

**Options.** Harden the scripts (compare a build hash after upload; remove
plugin files that are no longer in the manifest) — a contained change to
`build.ps1` (and `watch-deploy.ps1` by inheritance) that removes a whole class
of false-pass. Or leave them and rely on the manual check now written into
[05-plan.md](../archive/05-plan.md) §1.3, accepting that it depends on someone
remembering.

The second option is the one Phase 5's prevention pass would reject on
principle: discipline is not a mechanism.

**Locked 2026-08-03:** **Harden `build.ps1`** — prune stale plugin files before
copy and verify the deploy landed (e.g. compare `dist/index.js` hash or mtime on
the Deck vs local build; fail the script on mismatch). **Blocker before step 8**
(entry-point split resumes only after deploy trust is fixed).

---

#### D9 — How far does the entry-point split actually go?

Three slices are out of `index.tsx` (1955 → 1709). The remaining list in
execution-order step 8 would land it near **700–800 lines** (estimate, not yet
measured). Two bigger files were never in scope for step 8:

- **`useBonsaiAskOrchestration.ts`** — 1222 lines, the whole Ask state machine.
  It now has 13 characterization tests, so it is the best-protected large file
  in the repo; it is also where a subtle polling or cancel regression would hurt
  most on-device.
- **`MainTab.tsx`** — 187 lines, churn 42, and [05-plan.md](../archive/05-plan.md)
  calls it the cheapest entry point because its churn is pure prop-threading
  tax. It gets cheaper still after the state extractions above.

Decide whether "done" means `index.tsx` alone, or those two as well.

**Locked 2026-08-03:** **Done = finish step 8 (`index.tsx` only).**
`useBonsaiAskOrchestration.ts` and `MainTab.tsx` are **follow-ups** — revisit
after step 8 lands and `index.tsx` is near the 700–800 line target.

---

#### D10 — Focus and D-pad behavior has no automated coverage. What gates the remaining split?

The safety net built in step 5 covers the **Ask lifecycle** and the plugin
**mounting** — not focus order, not modal open/close lifecycle. The remaining
extractions (character picker, models hub, desktop note, plugin help) are
exactly that kind of behavior. Preview tier 3 covers tabs/settings/permissions —
**not** those four modals.

- **On-Deck D-pad pass per commit.** Slowest, and the only option that actually
  catches a focus regression before it ships.
- **Preview suite per commit, on-Deck at the end.** Faster; a focus regression
  would be found late, against a batch of commits rather than one.
- **Write focus-graph tests first.** Highest up-front cost. Worth pricing only if
  focus regressions have bitten before — `.cursor/rules/decky-focus-graph.mdc`
  and the **UI-SCALE-01…05** rows suggest they have.

**Locked 2026-08-03:** **`tsc` + `npm test` + preview smoke every step 8
commit.** **On-Deck D-pad pass required only for the four modal extractions**
(character picker, models hub, desktop note, plugin help) — not for mechanical
state-only commits (connection/IP, session-reset, UI-scale, error-capture). Do
not write focus-graph tests upfront.

---

### D11 — `main.py` carries a compatibility shim for a loader you may never use. Remove it?

**What's going on.** Found during the step 6 inventory
([07-mainpy-inventory.md](../archive/07-mainpy-inventory.md) §3). Every RPC in `main.py` starts
by calling `_coerce_instance(self)` — **55 call sites**. Its whole job is to cope with an
older Decky loader that passes the *class* instead of an instance. `plugin.json:6` declares
`"api_version": 1`, and that loader passes an instance, so on your Deck this call does
nothing at all.

It has a partner: `_ensure_background_state` (35 lines) re-creates runtime state for the
same "loader skipped `__init__`" case.

Two things make this more than tidying:

- The fallback **does not work anyway.** It backfills 11 of the 29 pieces of runtime state.
  Voice, knowledge-base download, intent packs and Ollama setup are not covered, so if the
  case it defends against ever happened, those would still crash.
- If the class-passed branch ever *did* fire, `_coerce_instance` would build a brand new
  plugin object and quietly throw away any Ask in progress. It is not a safety net; it is a
  bug that never fires.

**Option A — remove both.** *(my recommendation)* About 90-120 lines gone and 55 call sites
simplified — the single largest mechanical shrink left in `main.py`. Safe as long as bonsAI
stays on `api_version: 1`. If Decky ever ships a loader that behaves differently, the plugin
would fail loudly at load rather than silently losing state, which is the better failure.

**~~Option B — keep them, and write down why.~~** Costs nothing today. The comment has to explain
why a half-covering fallback is worth 55 call sites, because otherwise a future session
proposes this again.

**~~Option C — finish the fallback instead.~~** Extend `_ensure_background_state` to cover all 29
attributes. Most work, and it makes a path nothing exercises more elaborate.

**Not urgent.** Nothing depends on this; it is sequenced after step 8. Flagged now because
step 7 (settings single source of truth) touches instance lifetime and would be affected by
the answer.

**Locked 2026-08-03: Option A — remove both.** Executed the same day and pulled ahead of
step 7 rather than left until after step 8, since step 7 touches the same instance-lifetime
assumption. See execution-order step **6b**.

---

### D12 — Settings live in two languages. How far do you want to go to fix that?

**What's going on.** Step 7's goal is making "add a setting" cheap. Recon first
established the baseline (execution-order step **7a**): TS and Python each declare all
**40** settings independently, and — checked by running both — they currently agree
**exactly**, 40 keys, zero differences.

So nothing is broken. The cost is that adding one setting means editing six files across
two languages and getting them to match by hand, with nothing checking that you did.

**Already shipped (step 7a), and it needs no decision:** a shared defaults fixture both
languages assert against, so an incomplete two-language edit now fails a test. That closes
the *drift* risk. It does not reduce the *cost*, which is what the options below are about.

**Option A — declarative field table per language.** *(my recommendation)*

Most of the 40 settings are one of five boring kinds: boolean defaulting false, boolean
defaulting true, enum with a default, integer clamped to a range, string with a max length.
Those become rows in a table on each side rather than a hand-written function. The genuinely
custom ones — the latency/timeout reconciliation, the two legacy migrations, model policy,
capabilities, named hosts, routing order — stay as functions.

Adding a simple setting becomes one row in each language plus the UI control. Roughly
two-thirds of the 28 Python sanitizers collapse. Both languages stay readable on their own
terms, and the fixture proves the rewrite changed nothing.

**~~Option B — generate both sides from one spec.~~** A single machine-readable file describing
every field, from which the TypeScript types and the Python sanitizers are generated. This is
the only option where the two languages *cannot* disagree, because only one thing is written
by hand. It fits how the repo already works — six architecture snapshots are generated and
validated on every commit.

It is also the biggest commitment: a generator to maintain, generated files people must not
edit, and the awkward cases (migrations, cross-field reconciliation) either stay hand-written
anyway or push complexity into the spec format.

**~~Option C — stop here.~~** Keep the fixture, keep the hand-written code. Drift is now caught,
which was the real risk; adding a setting stays a six-file chore. Zero further work, and
honest if settings are not being added often.

**What I'd weigh.** B's advantage over A is only realized if settings keep being added — the
generator has to be paid for by future edits. A gets most of the cost reduction for a fraction
of the machinery, and does not foreclose B later, since the field table is most of the spec B
would need anyway.

---

### D13 — TS and Python disagree about five settings. Which side is right?

**What's going on.** The step 7a check compared the two languages on a **fresh install** and
found them identical. That was true and is still true — but it only tested one input. Writing
the TypeScript field table meant reading every rule side by side, which surfaced six settings
where the two disagree once the value is *not* the default.

Confirmed by running both sanitizers over 31 hostile inputs:

| Setting | Input | TypeScript | Python |
|---|---|---|---|
| `rag_corpus_path` | `"../../etc/passwd"` | passes it through | `""` (traversal rejected) |
| `preset_chip_fade_animation_enabled` | `{preset_chip_animation: "carousel"}` | `false` (derived from the new field) | `true` (independent, defaults on) |
| `desktop_app_log_level` | `" verbose "` | `"off"` (exact match only) | `"verbose"` (trims first) |
| `rag_corpus_version` | `123` | `""` (non-strings rejected) | `"123"` (stringified) |
| ~~`ui_scale_manual_profile`~~ | `"IMMERSIVE"` | `"handheld"` | `"immersive"` |

**Correction (2026-08-03):** the `ui_scale_manual_profile` row is **not drift** and was
mis-diagnosed here as case-sensitivity. `normalizeUiScaleProfileId`
([uiScaleProfile.ts:117](../../src/data/uiScaleProfile.ts)) already trims *and* lowercases; the
downgrade comes from `SHOW_IMMERSIVE_UI_SCALE = false` two lines later — a deliberate feature
gate on a profile the UI never offers. Aligning it to Python would have re-enabled a hidden
profile. So the count is **five settings** (six diverging cases — `preset_chip_animation`
diverged for both `"carousel"` and `"static"`), of which four were fixed.

**How much does this matter?** Less than the table suggests, and it is worth being precise.
The UI sends exact values from its own controls, so none of these fire in normal use, and
**Python is the gatekeeper for what reaches disk** — `save_settings` sanitizes on the way in,
so the persisted file is always the Python answer. The exposure is a hand-edited
`settings.json`, a value from an older build, or the frontend acting on its own reading before
a save round-trips.

`rag_corpus_path` is the one I would not leave alone: the frontend would show and act on a
traversal path that the backend refuses to store, so the two layers genuinely disagree about
what the knowledge-base location is.

One detail worth knowing: `ui_scale_manual_profile: " Handheld "` **agrees** across both
sides — but only because both happen to land on `handheld`, one by trimming and one by
falling back to the default. Agreement by coincidence, not by shared rule.

**Option A — make Python authoritative and align TS to it.** *(my recommendation)* Python is
what persists, so aligning TS to it removes the possibility of the UI showing something the
backend will not store. Five of the six are one-line changes to the TS normalizers; the sixth
(`preset_chip_fade_animation_enabled`) needs a call on whether the legacy field is derived or
independent — see below.

**~~Option B — align case by case.~~** For at least one setting TS is arguably the better
behavior: deriving `preset_chip_fade_animation_enabled` from `preset_chip_animation` keeps the
deprecated field consistent with the live one, where Python can report `fade_enabled: true`
alongside `animation: "carousel"`. Pick per row rather than by language.

**~~Option C — leave them and document.~~** Nothing is broken in normal use. Costs nothing now,
and the next person to read both files finds the same six discrepancies.

**Either way, the guard should get stronger.** The 7a fixture only pins the fresh-install
payload. Once the six are settled, the same hostile-input set that found them should become a
second shared contract, so this class of drift fails a test instead of waiting to be noticed.

**Blocks step 7d** (the TypeScript field table). Writing that table now means encoding rules
this decision may change, then rewriting it.

**Locked 2026-08-03: Option A — Python authoritative, TS aligned.** Executed as step **7c**;
`save_settings` decides what reaches disk, so a frontend reading a value the backend will not
store is the broken combination.

**One row went the other way, deliberately.** `preset_chip_fade_animation_enabled` was aligned
**Python → TypeScript** (derived from `preset_chip_animation`) rather than the reverse. Reading
the deprecated key independently produces a self-contradictory payload —
`preset_chip_animation: "carousel"` with `fade_animation_enabled: True` claims fades are on
while a non-fade animation is selected — and TypeScript already derived it on **both** its
normalize and save paths ([settingsPayload.ts:29](../../src/utils/settingsPayload.ts)), so Python
was the outlier. Safe where it is read: `MainTabPresetRow` gates on
`presetChipAnimation === "fade" && presetChipFadeAnimationEnabled`, so the flag is only
consulted when the animation is already `fade`. This is the row flagged up front as a genuine
judgement call; applying Option A literally would have made the payload contradict itself.

**And the guard got stronger, as this decision required.**
`tests/contracts/settings-hostile-inputs.json` now holds 19 cases — the inputs that found the
divergences plus the migrations and clamps most likely to drift next — asserted by both
languages. Re-running the 31-input cross-language probe afterwards: **1 divergence remaining**,
and it is the intentional immersive gate.

---

### D14 — `index.tsx` is at 1291 lines, not the 700–800 step 8 predicted. Stop, or keep going?

**What's going on.** Everything step 8 listed is done: three slices, four modals, one state
hook, six tab payloads. `index.tsx` went 1955 → 1291. The 700–800 figure in **D9** was an
estimate made before anyone measured what was left, and it assumed the remaining lines were
JSX. They are not. What is left is four blocks of prop threading:

| Block | Lines | What it is |
|---|---|---|
| `usePluginSettings` destructure | ~85 | 40 settings and their setters, unpacked into locals |
| `settingsSnapshotForSave` | ~90 | the same 40 keys listed twice — object body and memo deps |
| session-survival snapshot | ~65 | a default shape plus a live snapshot getter, ~30 fields each |
| preview test-hook registration | ~55 | a preview-only `getState`/`setTab`/`triggerAsk` bridge |

Moving any of these to another file does not make them smaller; it moves the same lines and
adds an argument list. They shrink only by **collapsing** — passing grouped objects instead of
40 named locals — and that is a rewrite of every consumer, which refactor rule 1 keeps out of a
behavior-preserving step.

**Option A — call step 8 done at 1291 and correct the estimate.** *(my recommendation)* The
stated goal was a composition root that composes; that is now literally what the file is. The
700–800 number was never measured and chasing it buys nothing a reader would notice.

**~~Option B — do the one cheap collapse first, then stop.~~** Have `usePluginSettings` return
`settingsSnapshotForSave` itself. It already owns all 40 states, so this is a move into the hook
that owns the data, not a redesign — about 90 lines out of `index.tsx`, and it deletes a 40-key
list that is currently maintained by hand in two places. It is genuinely step 7 work (settings
SSOT) that happens to land in `index.tsx`. Low risk, one commit, gates unchanged.

**~~Option C — collapse the prop threading properly.~~** Group the Ask slice and the settings slice
into objects and thread those. Would get near the original estimate. It is also exactly the
rewrite **D9** deferred, it touches `MainTab.tsx` (already a follow-up), and it is unreviewable
as a single diff.

**Not urgent.** Nothing is blocked on this. It only decides whether step 8 closes now or takes
one more commit first.

**Locked 2026-08-03: Option A — step 8 is done at 1291 lines; the 700–800 estimate in D9 is
withdrawn as unmeasured.** Option B stays available but belongs to step 7's settings SSOT
thread, not here; it is not a prerequisite for anything and is not scheduled.

**Record the cost honestly, because step 5b predicted it.** Across the five commits `src/`
grew **+1012 / −447, net +565 lines** while `index.tsx` fell 1522 → 1291. Step 5b already
measured this: *"extracting the tab JSX is a lateral change… `index.tsx` would shrink while the
codebase got worse."* Doing the state and modal extractions first removed some of that tax, and
deriving each payload's args from `React.ComponentProps<typeof Tab>` removed the rest of the
*type* duplication 5b warned about — but the prop **names** are still written twice per tab,
once at the call site and once in the hook. The payload step bought a composition root that
reads as composition, and it cost 565 lines to get it. **The state and modal extractions were
worth more per line than the payloads were**, which is the useful lesson for the next entry
point: do the state, and treat the JSX as optional.

---

### D15 — When you reopen the plugin, should it put you back where you were?

**What's going on.** Today it always opens on **Main**. Not by decision — by omission: the only
tab-restoring machinery is for modal round-trips, and nothing saves your tab when the plugin
closes. Reported on-Deck 2026-08-04 as *"getting back to the tab you were at seems cumbersome"*.

The code change is a few lines either way (persist `currentTab`, read it in `resolveInitialTab`).
The question is what the plugin should *do*, and that is not a code question.

**~~Option A — always open on Main.~~** *(today's behavior, by accident)* Main is where you Ask, and
Asking is the point. Every open starts from the same place, which is predictable and needs no
memory of what you were doing. The cost is exactly what was reported: if you were mid-way through
Ollama or Settings, you walk back every time.

**Option B — resume the tab you left.** *(my recommendation)* Matches how the plugin already
behaves around modals, so it is consistent rather than novel, and it removes the reported
friction. The risk is the opposite complaint: you set something in Settings, come back later
wanting to Ask, and land in Settings. On a D-pad that is one shoulder press, so the downside is
smaller than the upside.

**~~Option C — resume, but expire it.~~** *(shipped as Developer toggle only, not default)* Resume the tab if you reopen within N minutes, else Main.
Fixes both complaints and is the most code and the most explaining. Hard to justify before A or
B has actually annoyed someone.

**Worth deciding together with the focus-restore item above** — if pickers are going to restore
focus within a tab, resuming the tab itself is the same idea one level up. Doing B without focus
restore is still a clear improvement; doing focus restore without B is a bit odd.

**Locked 2026-08-04: Option B — resume the tab you left.** Shipped the same day, together with
the focus-restore item as the discussion above suggested. See both entries under **Bugs**.
On-Deck confirmation still owed: **TAB-RESUME-01** and **PICKER-FOCUS-01**.

**Amended 2026-08-04: all three options now ship behind one Developer control**, `tab_resume_mode`
— `always_main` (A) / `resume` (B) / `resume_recent` (C, five minutes). **B stays the default and
the locked decision**; the other two exist so this entry stops being settled on paper alone. C was
argued above as *"hard to justify before A or B has actually annoyed someone"* — that argument was
against **shipping** C as the default, and it is unchanged. What changed is the cost of finding
out: with a stop for each, the answer comes from a week of use rather than another discussion.
**Close this out when there is a verdict** — if nobody moves off B, delete the control and the
setting rather than leaving three modes to maintain forever. See the **Bugs** entry for the
mechanism and **TAB-RESUME-MODE-01** for how to test it.

---

### D18 — LOCKED (option A, 2026-08-27) — When loading settings fails, four values keep whatever was on screen. Bug or intent?

**Locked in the maintainer's word: A.** So a failed read shows defaults — all of them, no
exceptions. Implemented the same day: the four missing resets (reply language, both model
routing orders, spoiler auto-reveal after consent) were added to the failure branch in
`usePluginSettings.ts`. The two routing orders reset to **empty**, matching where they start,
because an order is worked out from the models the machine actually has and there is no static
default to fall back to.

**On the test, and an honest limit.** The reset only runs from the mount effect, and by the time it
can fire the values are already sitting at their defaults — so no test that drives the hook can tell
a complete list from an incomplete one. What broke here was not a wrong value, it was **a list that
drifted**: six hand-written copies of the same field list in one file, and four fields fell out of
one copy. So the test checks that invariant directly, by comparing the two lists in the source:
anything the successful-load path sets, the failure path must reset. It fails with exactly those
four names on the old code. When D14 collapses the duplication, that test goes with it.

**Which also means the fix is currently invisible.** It is correct, and today nothing can reach the
state where it matters. It becomes reachable the moment anything restores settings before the load
resolves — which the session-survival path already does a few lines away.

**Original question, rewritten in plain language 2026-08-27 at the maintainer's request; nothing
about it changed.**

**The short version.** When the plugin cannot read your saved settings, it deliberately blanks the
Settings screen back to factory values, so you are never shown a setting it could not actually
confirm. It blanks 40 of them. Four are missed, and no note anywhere says whether that was on
purpose. Those four are: **reply language**, the **two model try-orders** (text and vision), and
**auto-reveal spoilers after you have consented**.

**What you would actually see.** Almost certainly nothing, almost all of the time. This only runs
when reading the settings file fails, which on a healthy Deck does not happen. And on a fresh open
those four are sitting at their factory values anyway, so blanking them would change nothing
visible.

The one case where it bites: the read fails *after* a successful one — say the plugin's back end
restarts while you have the menu open. Then the screen keeps showing your reply language and your
model try-order, looking saved and settled, when the plugin has just admitted it cannot read them.
Everything around them has snapped back to factory. So the screen is telling you two different
stories at once, and the four that stayed are the ones you would be least likely to doubt.

**Nothing tests this either way**, so today there is no record of which behaviour was intended.

**Your choices.**

**A. Blank those four too, and add a test.** *(my recommendation)* Then a failed read means one
simple thing — the screen shows factory values, all of them, no exceptions — and it is the same
answer every time. The test is what stops the list quietly drifting apart again, which is how this
happened in the first place.

**B. Leave them out on purpose, and write down why.** Reasonable if there is a real reason — for
instance, a model try-order is worked out from what your machine actually has, and showing a stale
one may genuinely beat showing an empty one. It just needs a sentence saying so, or the next person
to read this file files the same question again.

**C. Stop blanking anything on a failed read.** Honest if you think a failed read should simply
leave the screen alone. It is the biggest change of the three, and it means a failure looks
identical to everything being fine — which is the thing the current behaviour is trying to avoid.

**Worth knowing:** this is a symptom, not its own problem. The same list of settings is written out
by hand **six times** in one file, and these four fell out of one copy. Fixing that duplication is
already the top item from the friction test (D14) and would remove the whole class of mistake. But
that work is not scheduled, and this is live behaviour, so it is worth answering on its own.

---

### D19 — Can you reach the strategy corpus without the game running?

**LOCKED 2026-08-17**, raised during the KB QA sweep. **Implemented 2026-08-19**; on-Deck QA
owed as KB-NEWTITLE-01.

> **Two things the implementation turned up, both fixed with it.** A canonical title carrying
> punctuation never matched its own normalised form — `normalize_alias` strips the colon in
> *The Legend of Zelda: Ocarina of Time* while `lower(canonical_title)` keeps it — so OoT
> resolved to nothing and fell through to the genre card. And the spoiler profile this decision
> requires was unreachable by name: `resolve_title_spoiler_profile` only knew AppIDs plus a
> single hard-coded title, so a text-resolved OoT fenced as `unknown`. Both languages now carry
> the name tables, moved together with the shared contract that caught it.

**What's going on.** `should_retrieve_knowledge`
([knowledge_base_service.py:136](../../py_modules/backend/services/knowledge_base_service.py))
has three ways through, and **every strategy path requires `app_id` or `app_name`**:

```python
if mode == "strategy" and (aid or aname):  return True, "strategy"
if <compat topic router matches>:          return True, "compat"
if aid or aname:                           return True, "strategy"
return False, ""
```

With no running game the only door is the troubleshooting router, so all strategy content is
unreachable however explicitly the user names the title. Measured on device 2026-08-17 against
the published `2026.08.16` corpus: `hl2 ravenholm` and `drg survivor what class` both return
`gate=False` in **Speed and Strategy alike**, while `ravenholm` with Half-Life 2 running
retrieves the Ravenholm card normally. The corpus is fine; nothing asks it.

**This is a bug, not a design choice.** `KB-NEWTITLE-01` in [testing.md](../testing.md) already
specifies the opposite as expected — *"with no game running, ask something naming a title
(`hl2 ravenholm`, `drg survivor what class`) and confirm the right game's cards attach and no
other game's do."* The behavior was documented and never implemented.

**The machinery already exists.** `_resolve_game_id` (`:222`) resolves app_id → alias table →
canonical title, and the alias table already holds `hl2`, `oot`, `drg survivor`, `portal 2`.
It is only ever handed `app_id` / `app_name` / `shortcut_name` — never the question text.

**Locked shape.** Scan the question against the alias table as a **last resort** in the gate,
only when `aid` and `aname` are both empty, so it can never override a running game. Word-boundary
match, longest alias wins (`portal 2` beats `portal`). `BM25_RELEVANCE_FLOOR` still applies, so a
title mention alone does not force a card.

| Question | Locked answer |
|---|---|
| Does a text-resolved title apply that game's spoiler profile? | **Yes** — and fence spoilers as best we can. Asking about OoT by name gets OoT's progression fencing, same as if it were running |
| Minimum alias length on this path? | **3 characters.** Excluding 3-char aliases would fail `hl2 ravenholm`, which is the documented test case this fixes |

**Known risk, accepted.** Short aliases appear in ordinary sentences — *"this game is hades on my
battery"* would wrongly resolve Hades. The relevance floor catches most, not all. Revisit if QA
shows real-world false positives; do not pre-emptively widen the denylist without evidence.

---

### Maintainer decisions locked — 2026-08-02

The options above stay as the decision record. **Locked below** is what we are
doing and why. Where a locked call disagrees with an earlier recommendation in
**D1–D6**, the locked call wins — some premises were corrected after reading the
current tree (especially **D1b** and parts of **D2** / **D4**).

| Id | Locked decision | Why |
|----|-----------------|-----|
| **D1** | **Finish both missing RPCs** — `merge_pulled_tags_into_routing_orders` and `get_session_rag_chip_candidates` | Both are wiring gaps, not greenfield features. Routing merge reuses `merge_pulled_tag` / `sanitize_model_routing_order` for `text_model_routing_order` and `vision_model_routing_order`. Session RAG already has `suggest_chip_candidates` + tests in `knowledge_base_service.py`; only the public RPC adapter on `class Plugin` is missing. Restores intended UX without reopening Phase 4 visibility / Phase 5 vector ranking. |
| **D2** | **Targeted dead-code cleanup** — delete confirmed orphans; **archive** tiny-model thinking code; keep active Ask, debug, and KB-cancel paths | Proton journal RPCs + service, `apply_tdp` (+ its test-only caller), `log_navigation`, and legacy `capture_screenshot` are safe to remove after preview-suite grep. **`ask_game_ai`** stays — preview suite drives it. **`ask_ollama`** stays — every Ask calls it internally. **`dbg_fe_log`** stays — intentional on-Deck debug bridge. **`cancel_rag_corpus_download`** stays — backend cancel path exists; UI Cancel is planned (**D2 follow-up**). ***Follow-up shipped 2026-08-05 as execution-order step 9** — keeping it was the right call; the button was missing, not the code.* **`thinking_tiny_model_service.py`** is **deleted outright** in `c8ed045`; git history is the archive. To restore the tiny-model thinking blurbs: `git show c8ed045^:py_modules/backend/services/thinking_tiny_model_service.py`. An in-tree archive folder was rejected — the file would still surface in greps and still need explaining, which defeats the point of the cleanup. |
| **D3** | **Option A — characterization tests first, then refactor** | `index.tsx` and `useBonsaiAskOrchestration.ts` have zero automated coverage; `npm test` would pass if every component were deleted. `fakeDeckyRpc.ts` + existing hook tests prove the pattern. Preview and on-Deck QA still required for D-pad and layout. |
| **D4** | **Prune by policy, not by folder count** | Keep evidence linked from current or archived QA docs; keep the latest useful pass per tier and meaningful failure runs. Audit links before deleting anything. Remove only duplicate, incomplete, or truly unreferenced generated runs. Add a retention rule so future `--write` runs do not grow `docs/test-evidence/` without bound. **Executed as step 10, 2026-08-05 — and "prune by policy, not by folder count" is exactly what saved it.** The link audit the decision demanded found the audit's own premise wrong: 10 of 13 **runs** were referenced, not 3 of 9 folders, so a folder-count prune would have deleted cited evidence and a 4-failure run. 3 runs / 9 files removed; retention now lives in `run-preview-suite.mjs`. |
| **D5** | **Option A — keep the built-in import graph** | Fast, no dependency, runs on every commit, and matches today's relative-import-only `tsconfig`. Revisit only if path aliases land, unresolved internal imports appear, or a parser-based tool finds real discrepancies. |
| **D6** | **Sequencing below** | Fix real user-visible gaps before shrinking/refactoring; build the safety net before the risky split; measure handoff friction on the improved tree. |
| **D7** | **Delete both screenshot helpers** | `_reencode_oversized_capture` and `_mirror_capture_to_plugin_dir` have no production callers; `_mirror_capture_to_plugin_dir` is an explicit deprecated no-op. One unit test still calls `_reencode` — remove it with the function. Consistent with D2 cleanup; module has behavioral coverage via `_finalize_steam_capture_file`. |
| **D8** | **Harden `build.ps1` (prune + verify)** | Windows deploy path merges without pruning and prints success without checking the artifact landed. `build.sh deploy` already wipes the plugin dir — fix `build.ps1` (and `watch-deploy.ps1` by inheritance): remove stale files, compare `dist/index.js` hash or mtime after upload, fail on mismatch. Blocker before step 8. |
| **D9** | **Done = step 8 (`index.tsx`) only** | Finish the state-before-JSX plan. `useBonsaiAskOrchestration.ts` (1222 lines, 13 characterization tests) and `MainTab.tsx` (187 lines, prop-threading tax) are follow-ups after step 8 — splitting them now fights the locked order. **Amended 2026-08-03 (D14):** the "~700–800 lines" figure here was an unmeasured estimate and is **withdrawn**. Step 8 closed at **1291**; what remains is prop threading that only a rewrite would shrink. |
| **D13** | **Option A — Python authoritative, TypeScript aligned (one row inverted)** | `save_settings` decides what reaches disk, so a frontend reading a value the backend will not store is the broken combination. Four settings aligned TS → Python. `preset_chip_fade_animation_enabled` went the other way — reading the deprecated key independently yields a self-contradictory payload and TS already derived it on both its normalize and save paths, so Python was the outlier. `ui_scale_manual_profile` turned out not to be drift at all but the `SHOW_IMMERSIVE_UI_SCALE` gate; left alone. Guard extended to a 19-case hostile-input contract asserted by both languages. Executed as step **7c**. |
| **D12** | **Option A — declarative field table per language** | The two languages agreed exactly on fresh-install defaults, so this is cost reduction, not a bug fix. Most settings are one of five plain shapes; those become one-line rows, and the genuinely custom ones stay functions with a stated reason. Python side shipped as step **7b** (19 rows, 32 → 20 defs, 6,659-input differential test, zero mismatches). Full codegen (Option B) was not taken: its only extra guarantee is that the languages cannot disagree, and it has to be paid for by future settings churn — the field table is most of the spec it would need anyway, so it stays available later. |
| **D11** | **Option A — remove `_coerce_instance` and `_ensure_background_state`** | Both exist for a loader that passes the class instead of an instance; `plugin.json:6` pins `api_version: 1`, where the call is an identity function across 55 sites. The fallback covered 11 of 29 runtime attributes, and if it had ever fired it would have built a fresh `Plugin` and discarded the in-flight Ask — a latent bug, not a safety net. Removed 103 lines with the RPC surface unchanged at 50. Executed as step **6b**, ahead of step 7, because step 7 depends on the same instance-lifetime assumption. |
| **D10** | **Preview/tests every commit; on-Deck D-pad for modal extractions only** | `tsc` + `npm test` + preview smoke on every step 8 commit. On-Deck D-pad required for character picker, models hub, desktop note, and plugin help extractions only — not state-only commits. Tier 3 preview does not cover those modals; focus-graph tests upfront rejected. |

**Step labels.** The numbers in this list are the **only** authoritative step labels; cite them
verbatim in commit subjects, and keep one label to one commit series.

> **Collision resolved 2026-08-03.** Commit `b5b8e95` carries the subject *"Step 7b: evaluate
> the cost of shared-schema mechanism for settings"*, which clashes with **7b** below (the
> Python field table). Its subject also does not describe its diff — the commit adds five
> unrelated audit and planning documents, while the settings evaluation it describes is step
> **7a** (`6651e45`). History was left alone rather than rewritten; read this list, not that
> subject line. The settings work is `6651e45` → `3f44368` → `65fc2bf` → step 7c.
>
> Same pass renamed `docs/audit/09-token-streaming-review.md` to `10-…` — it had been committed
> alongside `09-strategy-spoiler-false-positive.md`, giving two different documents the same
> ordinal. Nothing linked either file, so the rename was safe. **2026-08-03:** planning answers
> (Q1–Q8) now live under `docs/planning/` with question-number prefixes; refactor recon stays in
> `docs/audit/`.

#### Execution order (locked, amended 2026-08-03)

1. **Record decisions** — this section; turn accepted work into implementation rows as work ships. *(done — `dcbcccf`, `e2111f9`, plus this amendment)*
2. **D1 — wire both RPCs** — **done 2026-08-02**, see Bugs § *Fixed*. D1a routing merge (`510139d`) and D1b session RAG adapter, 13 new unit tests between them. On-Deck QA still open: **ROUTING-MERGE-01** and **SESSION-RAG-CHIPS-01** in [testing.md](../testing.md). **This is feature work, not refactor** — separate commits, not labeled behavior-preserving, and it changes what `useBonsaiAskOrchestration.ts` does at runtime. Sequenced before step 5 on purpose so the characterization tests capture intended behavior rather than the silent-fallback bug.
3. **D2 — targeted cleanup** — **done 2026-08-02** (`309c386`, `ebdc0f2`, `c8ed045`, `45cb0ff`, `d93027b`, `36f34cd`). Removed: 5 Proton-journal RPCs + their service, `thinking_tiny_model_service.py`, `log_navigation`, `capture_screenshot`, and the TDP sysfs write path. Kept per D2: `ask_game_ai`, `ask_ollama`, `dbg_fe_log`, `cancel_rag_corpus_download`. RPC surface 57 → 50. Two things the audit got wrong are recorded in [05-plan.md](../archive/05-plan.md) §1.1: the journal service was not dead (`clear_plugin_data` needed its file wipe) and `find_amdgpu_hwmon` was not apply-only (`read_current_tdp_watts` calls it). The kmsgrab orphans this pass left behind were cleared later the same day under **Cleanup candidates** (`4a26cfa`).

   **Preview-suite gate — first pass was incomplete.** Grepping `tests/preview-suite/` and `scripts/` for *symbol* names returns zero hits for `proton_experiment`, `apply_tdp`, `log_navigation`, `capture_screenshot`, `dbg_fe_log`, `cancel_rag_corpus_download`, `thinking_tiny`, and 22 hits for `ask_game_ai` across five tiers (keep, per D2). **That grep missed file-level references.** `tests/preview-suite/unit-gates.json:25` runs `tests/test_tdp_sandbox_sysfs.py` by filename under a gate tagged `TDP-APPLY`, and `tier-manifest.json:96` advertises "sysfs TDP apply + clamp asserts" in the Tier 2 description. Only two test files are referenced this way — the other is `test_capabilities.py` — so no other deletion in this pass was affected. **When checking whether a deletion is preview-safe, grep the preview suite for the test filename as well as the symbol.**
4. **Mechanical refactors** — **done 2026-08-02** (`3813764`, `666e3e3`, `2156441`, `ef65f8e`), one behavior-preserving commit each, all gates green between. Four stale doc claims fixed and the self-declared-archived RAG analysis moved to `archive/`; `refactor_helpers.py` shim deleted and its 9 importers repointed; `settingsAndResponse.ts` barrel deleted and its 22 importers repointed (`tsc --noEmit` is the safety net here); `settingsPayload.ts` split, with reply-text formatting moved to `appliedTuningText.ts`.

   **Deploy gate — passed, and it mattered.** The shim was referenced by `build.sh`, `build.ps1` and `verify-decky-plugin-zip.sh`, none of which any test covers. Deployed to the Deck and confirmed `bonsAI plugin loaded!`. **The first load proved nothing**: the deploy scripts copy without pruning, so the deleted shim was still sitting on the Deck from an earlier deploy and would have satisfied any import that had been missed. Deleting it plus `__pycache__` on-device and restarting `plugin_loader` is what made the check real. See [05-plan.md](../archive/05-plan.md) §1.3 — **any future deletion of a Deck-facing Python file needs the same step.**
5. **D3 — safety net** — **done 2026-08-02.** 22 new tests (suite 217 → 239): `useBonsaiAskOrchestration.test.ts` covers submit guards, request payload, the invalid / blocked / completed / thrown-error branches, polling, cancel, and thread archiving; `index.test.tsx` covers the Decky contract, a real mount, settings wiring, the tab set, and error containment. Both **mutation-checked** — three deliberate breaks in each turn the suite red — because a characterization test that cannot fail is worse than none. Three harness defects had to be fixed first and are recorded in [04-coverage.md](../archive/04-coverage.md): vitest collected only `*.test.ts` so **a `.tsx` test could never run**, jsdom lacks `ResizeObserver` so the tree silently rendered the ErrorBoundary fallback, and `globals: false` left renders leaking between tests.
5b. **D3 — entry-point split, in progress 2026-08-02.** `index.tsx` 1955 → 1709 across three commits: `984498e` moved the stateless shell pieces (error boundary, localStorage helpers, tab titles) to `src/features/plugin-shell/`; `26c67e6` moved voice Ask input to `src/features/voice/`; `fda8051` moved the try-order modal to `src/features/model-routing/`. Destination follows REFACTOR-PLAN §3.4 (vertical slices), not the type-buckets.

   **Measured finding that redirected the work:** extracting the tab JSX — the obvious first move — is a *lateral* change. The six tab payloads thread 94 (`mainTab`), ~30 (`ollamaTab`), 27 (`settingsTab`) and 21 (`developerTab`) props out of `Content`'s scope, so moving one to its own module means declaring those props a second time as an args type. `index.tsx` would shrink while the codebase got worse. The threading is a *symptom* of state living in `Content`; each state extraction deletes props instead of copying them, and the tab JSX becomes cheap to move only afterwards. **Do the state first.**

   **Remaining in `Content`:** character-picker modal (~76 lines, ~11 deps), Ollama models hub (~84, ~10), desktop-note modal (~49), plugin-help modal (~11), plus connection/IP, session-reset, UI-scale and error-capture state. Then the tab payloads.

5c. **D8 — harden `build.ps1`** — **done 2026-08-03.** Three changes: the plugin dir is
   `rm -rf`'d before copy (matching `build.sh deploy`, and the remote temp dir is wiped
   first so a failed run cannot ship stale files); every `ssh`/`scp` is exit-code checked
   via `Assert-LastExit` — **unchecked native exit codes were the actual false-pass
   mechanism**, since PowerShell does not stop on a non-zero `scp`; and the deploy is
   verified by SHA-256 after upload. `watch-deploy.ps1` inherits all of it.

   **Verification hashes all 52 shipped code files, not just `dist/index.js`.** The locked
   text suggested `dist/index.js` alone, which does not hold: a Python-only change leaves
   the bundle byte-identical to the previous deploy, so an index.js-only check would pass
   while nothing new landed — the same false pass, one layer down. The list is
   `package.json`, `plugin.json`, `main.py`, `dist/index.js`, and every non-`__pycache__`
   `py_modules/**/*.py`; the remote side is one `sha256sum` call (~2.5 KB command line).
   `plugin_loader` is restarted **even when verification fails** — leaving it stopped would
   break every other Decky plugin on the device, not just this one — and the script then
   exits non-zero with a per-file `MISSING` / `STALE` list.

   **Found while doing it — `watch-deploy.ps1` could not parse under Windows PowerShell
   5.1.** No `.ps1` in `scripts/` has a BOM, so 5.1 decodes them as CP1252; a UTF-8 em-dash
   inside a **double-quoted string** becomes `U+201D`, which PowerShell accepts as a string
   delimiter, and parsing dies at the *next* line. Reproduced with a two-line script, then
   confirmed by parsing every `scripts/*.ps1`: `watch-deploy.ps1:44` was the only live
   casualty (em-dashes in *comments* are harmless, which is why `setup-dev.ps1` and
   `revert-dev.ps1` are fine). Both deploy scripts are ASCII-only now with a comment saying
   why. **New file rule: no non-ASCII in `.ps1` strings.**

   **Verified on-device the same day**, two deploys. Both printed `Verified 52 files on the
   Deck.` and exited 0, with `bonsAI plugin loaded!` at 00:47:29 and 00:51:24 and no
   `Traceback`/`ERROR` in the log.

   **The prune was proven with planted sentinels, not by inference.** The obvious witness —
   the stale `refactor_helpers.py` from 2026-08-02 — proves nothing, because it was
   *hand-deleted* on-device that day; it was already absent before any of this. So a
   `STALE_SENTINEL.py` and a whole `py_modules/backend/stale_dir/ghost.py` were planted on
   the Deck first: after the deploy, both files **and the directory** are gone. `__pycache__`
   likewise cannot outlive a deletion — the two dirs on the device are regenerated by the
   loader after the copy.

   **Regression found and fixed during that testing.** The first version of this script
   opened with `$ErrorActionPreference = "Stop"`. Under 5.1 that promotes a *native command's
   stderr* to a terminating `NativeCommandError` whenever the script's output is redirected,
   so `.\scripts\build.ps1 2>&1 | ...` died on a `pnpm`/node **deprecation warning** before
   reaching the Deck. It is removed: every failure path already calls `exit 1` explicitly, so
   the preference bought nothing, and the two cmdlets whose silent failure would corrupt the
   run (`Set-Location`, `Get-FileHash`) carry their own `-ErrorAction Stop`. Failure messages
   are `Write-Host` red rather than `Write-Error` so the exit code is the single signal.
   `watch-deploy.ps1` now checks `$LASTEXITCODE` after invoking the deploy — it previously
   caught only exceptions, so an `exit 1` would have been swallowed and the watch loop would
   have carried on as if the Deck were current: the same false pass, one level up.

   **The false-pass fix then proved itself for real, later the same day.** A step 7 deploy was
   attempted while the Deck had drifted to sleep. The script failed at the first `ssh`
   (exit 255) and reported *"Deploy aborted - the Deck may be asleep or unreachable"* with a
   non-zero exit. Before D8 that exact run would have attempted every `scp`, ignored all of
   their failures, and printed **Deployment complete!** — the original bug, reproduced by
   accident and now caught. **DEPLOY-VERIFY-02 upgraded to Verified.**

   **Remaining gap:** the `STALE` branch of the hash compare is still simulation-tested only —
   it needs a deploy where files land but with stale content, which has not happened naturally.
   **DEPLOY-VERIFY-01…03** in [testing.md](../testing.md).

5d. **D7 — delete screenshot helpers** — **done 2026-08-03.** `_reencode_oversized_capture`
   and `_mirror_capture_to_plugin_dir` removed from `screenshot_media.py`. Preview gate run
   on **symbols and the test filename** per the step-3 lesson: clean. The `_reencode` unit
   test asserted "a file that needs no work is returned untouched"; that assertion is folded
   into `test_finalize_steam_capture_file_passes_through_missing_file`, which covers the
   equivalent guard on the live function ([screenshot_media.py:245](../../py_modules/backend/services/screenshot_media.py))
   and was previously untested. Python suite stays at 413.

   **Left alone deliberately:** `take_steam_game_screenshot` still declares a
   `plugin_runtime_dir` parameter that nothing in its body reads — it was the mirror
   helper's argument. Dropping it changes a public signature, which is not what D7 authorized;
   it belongs with the step-6 `main.py` inventory pass.

6. **2.3 — `main.py` extraction investigation** — **done 2026-08-03**, read-only, no code
   changed. Inventory: [07-mainpy-inventory.md](../archive/07-mainpy-inventory.md).

   **Answer to §2.3's question ("thin facade or logic in both layers?"): both, and not where
   the file claims.** By count it reads as a facade — 27 of 96 methods are ≤8 lines. By
   volume it is not: the six largest public RPCs are **706 lines, 24% of the file**, and ten
   methods hold 869 lines (29% of the file in 10% of its methods). Split: 1767 lines across
   the 50 public RPCs, 895 across 46 private helpers, ~210 in imports and class constants.

   **One outright contract violation.** `main.py:6` says the file *"Does not: Own Ollama
   HTTP"*. `test_ollama_connection` ([main.py:1038](../../main.py), 178 lines) is the only
   `urllib` consumer in the file — it opens `/api/version`, `/api/tags` and `/api/ps`
   directly and derives a VRAM-share ratio from the response. About 70 lines of transport
   belong in `ollama_service.py`; the loopback-recovery policy and logging stay.

   **Four other findings**, each with the destination named in the doc: the background-state
   dict shape is declared **four times** (one copy omits three keys — latent, not live, since
   `_merge_partial_into_background_status` backfills them); three near-identical local-command
   dispatch blocks in `start_background_game_ai`; four repetitions of cancel-task-and-reset in
   `clear_plugin_data`; and `abort_background_game_ai` closing a raw `urllib` handle
   cross-thread. Ranked extraction order with risk is §8 — **none of it was executed**, per
   "investigation, not yet a refactor".

   **Raised as [D11](#d11--mainpy-carries-a-compatibility-shim-for-a-loader-you-may-never-use-remove-it):** `_coerce_instance` is a no-op under `api_version: 1` and is called
   at **55 sites**, with a 35-line `_ensure_background_state` partner. Biggest mechanical
   shrink available (~90-120 lines) but it needs a maintainer call, not a refactor decision.

   **Two §2.3 premises were stale** and are corrected in the doc: `main.py` is 2971 lines not
   3021, imports 29 of 40 services not "35 of 42", and the coverage claim ("5 tests, all
   locking, none RPC behavior") is now 8 test files, two of which do test RPC behavior — those
   two are the pattern to copy for the extractions above. Still true: **none of the ten
   largest methods has a behavioral test.**
6b. **D11 — remove the legacy-loader compatibility layer** — **done 2026-08-03.**
   `_coerce_instance` (55 call sites) and `_ensure_background_state` (35 lines) deleted;
   `main.py` **2971 → 2865** (−103 lines, −2 methods), **RPC surface unchanged at 50**. The
   53 `plugin = Plugin._coerce_instance(self)` aliases became direct `self` use, not
   `plugin = self`, so no vestigial indirection is left behind.

   **The shim had a service-side half** that [07-mainpy-inventory.md](../archive/07-mainpy-inventory.md)
   had not found: [ollama_ask_service.py:81](../../py_modules/backend/services/ollama_ask_service.py)
   called `plugin_inst._ensure_background_state()` before touching `_active_request_id()`,
   and `tests/test_ollama_ask_service.py` carried a matching no-op on its `_FakePlugin`.
   Deleting only the `main.py` side would have raised `AttributeError` on **every Ask** with
   the unit suite still green — the fake satisfied the call. Both removed together.

   **Verified as mechanical, not merely untested.** A token-level differ compared the files
   before and after: with the intentionally deleted regions removed, both sides yield
   **15,446 identical tokens**, 236 `plugin`/`plugin_bg` NAME tokens become `self`, and
   there are **zero** other differences. This mattered — 8 test files touch only a fraction
   of the 53 methods changed, and a plain find-and-replace would have corrupted the
   `"plugin.lifecycle"` / `"plugin.data_clear"` log event names and docstring prose. Then
   413 Python tests, then a deploy: `bonsAI plugin loaded!`, zero `Traceback`/`ERROR`,
   deployed `main.py` at 2865 lines. **On-Deck functional QA of the Ask, voice and
   knowledge-base paths is still open** — **D11-SHIM-01** in [testing.md](../testing.md).

7. **Settings single source of truth — COMPLETE 2026-08-03** — REFACTOR-PLAN §3.1, the highest-value item in the audit and the best-covered by existing tests (`tests/test_settings_service.py` asserts per-setting round-trips). Expect that suite to break on shape, not behavior — rewrite the assertions, do not contort the design. Shipped as **7a–7d** below. *(This header was reconstructed 2026-08-04: the reorg dropped the numbered `7.` entry and left its tail glued to the end of 7d.)*

7a. **2.2 — settings recon + drift guard** — **done 2026-08-03.** The audit deferred this
   design deliberately ([05-plan.md](../archive/05-plan.md) §2.2: *"Do not design the shared-schema
   mechanism from this document"*), so the first move was measuring rather than building.

   **Baseline: there is no drift.** Both sides were executed and their outputs diffed —
   Python `sanitize_settings({})` against TypeScript `normalizeSettings({})` — and they agree
   **exactly**: 40 keys each, no key on one side only, **zero value differences**. That
   reframes the work: step 7 is not fixing a bug, it is removing a per-setting cost and the
   standing risk that the two hand-maintained shapes stop matching. It also makes the
   remaining refactor verifiable — any mechanism must reproduce exactly this payload.

   *(An early probe appeared to show `capabilities` differing. That was the probe's own bug —
   a replacer array passed to `JSON.stringify` filters keys at every nesting level, not just
   the top. Re-measured before reporting.)*

   **Shipped: a drift guard, not a redesign.** `tests/contracts/settings-defaults.json` is the
   fresh-install payload, and each language asserts against it in its own runner — no
   cross-runtime plumbing. Python: `tests/test_settings_contract.py`. TypeScript:
   `src/data/bonsaiSettingsContract.test.ts`. Three assertions each: exact equality, key-set
   equality reported separately so a missing key reads as a key rather than a diff, and
   **idempotency** — feeding the defaults back in must not change them, which specifically
   guards the two legacy migrations (`preset_chip_animation` reading
   `preset_chip_fade_animation_enabled`, `screenshot_attachment_preset` reading
   `screenshot_max_dimension`), where a re-firing migration would rewrite a saved value on
   every load.

   **Mutation-checked**: mutating one fixture value fails both halves. Suites 413 → 416
   Python, 239 → 242 frontend. `tsc` clean.

   **Next decision: [D12](#d12--settings-live-in-two-languages-how-far-do-you-want-to-go-to-fix-that)** — how far to go on reducing the six-file cost. Step 7b is blocked on it.

7b. **D12 — Python field table** — **done 2026-08-03.** [D12](#d12--settings-live-in-two-languages-how-far-do-you-want-to-go-to-fix-that) locked Option A. 19 settings whose rule is a plain
   shape (boolean defaulting false, boolean defaulting true, enum with a default, trimmed
   length-capped string, and a variant that stringifies non-strings) are now one-line rows in
   `_SIMPLE_FIELDS` instead of a hand-written function each. Adding such a setting was two
   edits in this file — write a `sanitize_*`, then wire it into the returned dict — and is now
   one row. Top-level defs **32 → 20**.

   **Line count barely moved (477 → 458)** and that is the honest number: the shape builders
   and the comments explaining why each remaining function is exempt cost most of what the
   collapsed functions saved. The value is the per-setting edit cost and having the five
   shapes named once, not the size of the file.

   Two collapsed sanitizers keep a named function because `ollama_ask_service` imports them
   directly; they delegate to their table row so the rule still has one definition. The exempt
   settings are now annotated with *why* — reconciled in pairs, options supplied by `Plugin`
   class constants, reads a legacy key, structured/list-valued, traversal rejection, or owned
   by another service.

   **Verified by differential test, not by the suite alone.** The pre-refactor module was
   loaded from git alongside the new one and both run over **6,659 inputs** — every key set
   individually to each of ~60 hostile values, non-dict payloads, 4,000 random combinations,
   both migration pairs exhaustively, and the latency/timeout pair across its clamp
   boundaries. **Zero mismatches.** Mutation-checked: flipping one row's default diverges
   6,643 of them. This mattered — the predicates are not interchangeable (`is True` vs
   `is not False` differ for every non-boolean, and the two string kinds differ for
   non-strings), and the 7a fixture only pins the empty-input case.

   A dead `sanitize_screenshot_max_dimension` was deleted first, in its own commit, so this
   diff stayed purely structural.

7c. **D13 — align the five diverging settings** — **done 2026-08-03.** [D13](#d13--ts-and-python-disagree-about-five-settings-which-side-is-right) locked Option A
   (Python authoritative). Four settings changed on the TypeScript side: `desktop_app_log_level`
   now trims before matching, `rag_corpus_path` rejects `..` traversal as Python always did,
   `rag_corpus_version` accepts an unquoted number, and both string coercions share one helper
   documenting exactly where parity stops (scalars are exact; booleans, objects and arrays are
   garbage-in cases both sides now discard rather than pretending to match Python's `repr`).

   **One row was aligned the other way on purpose** — `preset_chip_fade_animation_enabled` is
   now derived in Python too. See D13 for why applying Option A literally there would have made
   the payload contradict itself.

   **One row was not drift at all.** `ui_scale_manual_profile` was mis-diagnosed in the original
   D13 write-up as case-sensitivity; the TS normalizer already trims and lowercases, and the
   downgrade is the `SHOW_IMMERSIVE_UI_SCALE = false` feature gate. Changing it would have
   re-enabled a hidden profile. Corrected in D13 rather than quietly dropped.

   **Guard strengthened, per D13's own condition:**
   `tests/contracts/settings-hostile-inputs.json`, 19 cases, asserted by
   `tests/test_settings_hostile_contract.py` and
   `src/data/bonsaiSettingsHostileContract.test.ts`. Each case pins only the keys it is about,
   so a failure names the broken rule instead of dumping a 40-key diff. Python 416 → 418,
   frontend 242 → 263. Re-running the 31-input probe after the fixes: **1 divergence left**, the
   intentional immersive gate, documented in [tests/contracts/README.md](../../tests/contracts/README.md).

7d. **D12 — TypeScript field table** — **done 2026-08-03.** The mirror of step 7b.
   `SIMPLE_FIELDS` in [bonsaiSettingsNormalizers.ts](../../src/data/bonsaiSettingsNormalizers.ts)
   now declares **26 settings** in one row each; 15 hand-written normalizers collapsed into
   them. Exported functions **36 → 16**, file 457 → 441 lines. Same honest caveat as 7b: the
   value is the per-setting edit cost, not the line count.

   **The TS table has a shape the Python one does not.** Some rows delegate to a named function
   because that field's option list or feature gate lives in its own module — `reply_verbosity`,
   `reply_language`, `ollama_keep_alive`, and importantly `ui_scale_manual_profile`, whose
   `normalizeUiScaleProfileId` also applies the `SHOW_IMMERSIVE_UI_SCALE` gate. Inlining that as
   a plain enum row would have silently dropped the gate — the same mistake the original D13
   write-up nearly made. The row is annotated to say so.

   **Four `DEFAULT_*` imports became unused** and were removed: the boolean defaults had been
   stated twice, once as a constant and once inside the predicate. The kinds encode them once.

   **`as const satisfies { [K in keyof BonsaiSettings]?: (value: unknown) => BonsaiSettings[K] }`**
   makes the table self-checking: a row whose coercer returns the wrong type for its key, or
   names a key that is not in `BonsaiSettings`, fails `tsc` rather than a test.

   **Verified by differential test**, matching 7b's rigor. The pre-refactor module was copied in
   beside the new one and both run over **~6,000 comparisons** — every key set individually to
   each of ~75 hostile values, non-object payloads, 3,000 seeded random combinations, all three
   migration pairs exhaustively, and the latency/timeout pair across its clamp boundaries. Zero
   mismatches; mutation-checked (flipping one row's default fails all five groups). Temporary
   copy and test removed afterwards. All four gates green: `tsc`, 263 frontend, 418 Python,
   `npm run build`.

   A dead `normalizeScreenshotMaxDimension` — the exact twin of the Python function deleted in
   step 7b — went first in its own commit.

**Step 7 is complete.** Both languages now declare their simple settings as tables, the shape
is pinned by two shared contracts, and the five D13 divergences are resolved.

~~**Not yet deployed.**~~ **Smoked on-device 2026-08-04.** Steps 7a–7d were verified by `tsc`,
263 frontend tests, 418 Python tests, `npm run build`, and two differential tests, and the Deck
was asleep when the deploy was first attempted. The step 12 deploys on 2026-08-04 carried this
code and logged `bonsAI plugin loaded!` with zero `Traceback`/`ERROR` — and settings load on
every plugin start (`_main` → `_maybe_app_log` → `load_settings` → `sanitize_settings`), which is
exactly the smoke this note asked for. **Not covered by that:** no on-device pass has exercised
*changing* a setting and reading it back through the new tables. **D11-SHIM-01** remains Partial
for the same reason — its RPC probe passed, its UI pass did not run.
8. **D3 — entry-point split — COMPLETE 2026-08-03** (`index.tsx` **1955 → 1291**, closed at
   Option A of **D14**). Everything below shipped behavior-preserving with gates green between
   commits. **Remaining work is on-Deck QA, not code**: the four-modal D-pad batch
   (**MODAL-EXTRACT-01…04**) and the **SHELL-PAYLOAD-01** smoke.

   **QA status update 2026-08-04.** The modal batch is **Verified** — all four reached by D-pad,
   **B** closes cleanly, each returns to the tab it was opened from, and LB/RB kept focus in the
   same pass ([testing.md](../testing.md) **MODAL-EXTRACT-01…04**). It also surfaced the two gaps
   now filed under Bugs: focus is not restored *within* a tab after a picker closes, and the tab
   itself was not remembered across a reopen (**D15**). **SHELL-PAYLOAD-01 is still Open** and is
   the only refactor QA left; the paragraphs below still read as if neither had been run.

   **Modals done 2026-08-03**, `index.tsx` **1718 → 1522** across four gated commits (`e7728fa`, `6cd0b93`, `fdc669a`, `5cb7707`). All four now live in `src/features/plugin-shell/` as hooks: plugin-help, desktop-note save, character picker, Ollama models hub. **`index.tsx` no longer references `showModal` at all** — the shell opens no Decky modal directly. **On-Deck D-pad pass for the four modals is due in one batch** per **D10**; deployed and loading clean, so it can be run against real code.

   **Two roadmap estimates were wrong, in opposite directions.** The state items are much smaller than listed — `error-capture` and `UI-scale` were **already extracted** into `useCapturedFrontendErrors` and `useUiScaleProfile` before this session, so what remains of "connection/IP, session-reset, UI-scale, error-capture" is roughly **15 lines**: three `useState`s (`ollamaIp`, `ollamaTabResetKey`, `lastConnectionStatus`), one memo, and a one-line `uiScaleApplyToken`. Those three cohere as one Ollama-connection concern and are worth one small hook, not four commits. The modals were the real win and were listed last.

   **Found while extracting — three inconsistencies and a redundant dependency array.** The four openers each combined the same two lifecycle steps differently: plugin-help captured the session *and* set the return-tab ref, desktop-note set the ref *without* capturing, character picker captured *without* setting the ref. All preserved exactly and now commented where a reader would ask. Having them in one directory is what made it visible. Separately, `openCharacterPickerModal` carried a **32-entry dependency array of which 22 were never read in the body** — redundant, because `buildSettingsPayload` is memoized on the settings snapshot and its identity already changes when any setting does; the hook lists the 10 real deps, matching what `onCommitOllamaModelsHub` and the step-5b `useRoutingOrderModal` already did. `openOllamaModelsHub` was also missing two deps it used.

   **Gate note:** `npm run test:preview` **cannot run headlessly** — buckets C/D need Decky's preview open in Cursor (`preview-state.json` missing → `IPC timeout for callTestHook`). `npm run test:preview -- --tier=preGate` does run and was green (2/2) on every commit; that is the runnable portion of the D10 preview gate here.

   **State slice and all six payloads done 2026-08-03**, `index.tsx` **1522 → 1291** across
   four more gated commits. `useOllamaConnectionState` took the host/connection slice; the six
   tab payloads moved to `src/features/plugin-shell/tabs/`. Each payload hook derives its
   argument type from the tab component's own props (`React.ComponentProps<typeof Tab>`), so a
   prop added to a tab cannot drift from its payload. Derivations that served exactly one tab
   moved with it: the two layout constants, `isQamSetting` and the whole AI-character avatar
   block went to the Main tab, the `saveIp` binding and the remount key to the Ollama tab, and
   the three project links to About. `index.tsx` no longer imports `MainTab`, `SettingsTab`,
   `OllamaTab`, `PermissionsTab`, `DeveloperTab`, `AboutTab` or `characterCatalog`.

   **The 700–800 line target is not reachable this way, and the estimate should be corrected
   rather than chased.** At 1291 lines the remaining bulk is not JSX; it is prop threading —
   the ~85-line `usePluginSettings` destructure, the ~90-line `settingsSnapshotForSave` memo
   that lists all 40 settings twice, the ~65-line session-survival snapshot, and the ~55-line
   preview-hook registration. Moving those into files does not shrink them; **collapsing** them
   does, and that means passing grouped objects instead of 40 named locals — a rewrite, not a
   move, which rule 1 keeps out of this step. The cheapest real win left is having
   `usePluginSettings` return `settingsSnapshotForSave` itself, since it already owns all 40
   states: about 90 lines, and it removes a list that is currently duplicated by hand. That is
   step 7 territory (settings SSOT), not step 8. **Locked as D14 Option A** — the estimate is
   withdrawn, step 8 closes at 1291, and that 90-line collapse is unscheduled. D14 also records
   the cost: **net +565 lines across `src/`**, exactly the lateral trade step 5b predicted.

   **Gates on every commit:** `tsc`, 268 frontend tests, preview `preGate` 2/2, `npm run build`.
   The Main tab move was additionally checked prop-for-prop against the previous commit: 95
   props, identical set and order. **On-Deck:** the four modal extractions still owe their D-pad
   batch per **D10**; the state and payload commits add no new control, so they need the
   **SHELL-PAYLOAD-01** smoke rather than a full pass. **Found while extracting:** a pre-existing
   token-streaming defect, filed under Bugs — the Main tab memo never sees the smooth-reveal
   frames, and its premise contradicts audit item W4.
9. **KB download Cancel button — done 2026-08-05.** `cancel_rag_corpus_download` is wired in
   `KnowledgeBaseSection.tsx`; **KB-CANCEL-01** rows added to [testing.md](../testing.md) and
   [testing-manual.md](../testing-manual.md). This is the **D2 follow-up** the cleanup pass
   deliberately kept the RPC for — D2 called it *"a missing feature rather than dead code"*, and
   that reading was right.

   **It closed a focus dead end, not just a missing button.** While a download runs the primary
   button is `disabled` and Remove is not rendered, so the action row held **no focusable control
   at all** — the D-pad could not enter it, and the only escape from a ~5 GB download was closing
   the plugin. Cancel takes the row's second slot for the duration, which gives it exactly one
   stop. The parent's up-path (`focusKbUpFromReplyVerbosity` in `OllamaTab.tsx`) now tries Cancel
   **first**, because during a download a ref to either of the other two buttons focuses nothing.

   **A wart the wiring exposed, fixed here.** The backend writes the unwinding exception into
   `error` even when the user asked for the stop
   ([rag_corpus_download_service.py:344](../../py_modules/backend/services/rag_corpus_download_service.py)),
   and `get_rag_corpus_status` spreads that state, so a cancel would have rendered raw exception
   text in failure red. The section now shows a neutral cancelled line and keeps red for real
   failures. Frontend-only — the backend was not touched.

   **6 tests** in `KnowledgeBaseSection.test.tsx`, the first automated coverage this component has
   had, plus the five KB methods added to `fakeDeckyRpc`'s registry (they were invoked from `src/`
   but missing from a list that claims to track exactly that). **Mutation-checked**: never
   rendering Cancel, dropping the double-press guard, and treating a cancel as an error each turn
   the suite red. Gates: `tsc`, **366** frontend tests (57 files), 497 Python, `npm run build`,
   preview `preGate` 2/2. **On-Deck QA is what remains** — **KB-CANCEL-01**.
10. **D4 — evidence hygiene — done 2026-08-05.** Link audit first, as D4 required, and it
    **overturned the premise the decision was written on.**

    **The audit ([06-doc-triage.md](../archive/06-doc-triage.md) § Prune stale evidence) searched
    `testing.md` only.** The archived QA docs cite evidence heavily, at individual
    case-manifest level. Counting whole **runs** (`tier/date-sha`) rather than tier folders:
    **10 of 13 runs referenced, 0 broken links** — not "96% unreferenced". The unit that is
    cited is the run, and the folder count was never the right denominator.

    **Pruned: 3 runs, 9 files.** All unreferenced *and* carrying no signal — the two tests D4
    asked for, applied together. `hookSmoke/2026-05-26-9e20a82` and
    `hookSmoke/2026-06-09-a9237e4` both failed with `Error: IPC timeout for callTestHook`,
    which is the preview harness being unavailable headlessly — the same limitation step 8
    recorded — so they are not the "meaningful failure runs" D4 protects.
    `deckOnly/2026-06-09-9e20a82` skipped all three cases. **What that deletion would have
    destroyed is now written down** in [testing.md](../testing.md#evidence-retention):
    `HOOK-smoke-setTab` has never produced a real result in this tree. Kept, explicitly:
    `tier2Deep/2026-06-09-9e20a82`, 7 pass / **4 fail** — a meaningful failure run whose cases
    no doc names, which a naive orphan sweep would have taken.

    **Retention is now a mechanism, in `scripts/run-preview-suite.mjs`.** Keeps the 3 newest
    runs per batch; never deletes a run cited by any `docs/**/*.md`, since evidence is linked
    by path and deleting a cited run turns a link into a lie; never deletes the run the current
    invocation just wrote. All three branches were exercised against planted folders — delete,
    keep-because-cited, keep-because-current — not just the happy path.

    **Found while doing it — the batch summaries lie, and two in the tree prove it.** The run
    folder is keyed by date + sha only, so a `--filter` re-run on the same day and commit lands
    in an earlier full run's folder and `writeBatchSummary` replaced the roll-up wholesale.
    `tier2/2026-05-26-9e20a82` records **1** result beside **8** case directories — and
    [archive/testing-failures-2026.md](../archive/testing-failures-2026.md) independently calls
    that batch *tier2 (8/8)*, which is the corroboration; `tier2Deep/2026-06-09-a9237e4` records
    1 beside 11. Summaries now merge per scenario id and report `ranThisInvocation` /
    `carriedFromEarlierRun` so a filtered run is legible as one. Mutation-checked by restoring
    the replace-wholesale line: the bug reproduces exactly (`total=1`), and the fix restores
    `total=2`. **The historical summaries were left as they are** — rewriting recorded QA output
    to match a later theory is not evidence hygiene; the caveat is documented instead.
11. **Deferred friction test — done 2026-08-05. [03-friction.md](03-friction.md).**
    Three cold readers, one task each, chosen to probe step 7 (settings), step 8 (feature
    slices) and step 12 (the RPC boundary). Two completed their plan; **one was blocked** —
    `docs/glossary.md` never defines "card", which turns out to be a column name on three
    different tables that the docs and UI use inconsistently.

    **The overlap is the work list, and the top item confirms D14 from the outside.** Two of
    three runs put hand-maintained field and prop lists first, at HIGH cost, in different
    subsystems: one boolean setting is **~18 files and ~30 edit points** — the normalization
    tables really are one row per language, but `usePluginSettings.ts` restates the field list
    **7** times, `index.tsx` **5**, each payload hook **3** — and threading one flag to a
    component passes two silent gates (`presetChipsPropsEqual`, a `useMemo` dep array) where a
    miss compiles, passes tests, and does nothing on device. D14 called this *"prop threading
    that only a rewrite would shrink"* and closed step 8 on it; readers who had never seen D14
    independently ranked it the single largest cost. **The D14 Option B/C collapse now has
    evidence behind it rather than taste.**

    **It also found live defects.** `docs/roadmap.md:23`'s fix lean for the preset/KB bug was
    incomplete in a way that would have shipped a *worse* bug — it names two samplers and misses
    `getRandomPresetExcluding`, which re-draws chips on a 60-second timer, so the fix would have
    regressed within seconds of mount. Verified in code and corrected. `CLAUDE.md` was still
    routing maintainer questions to `docs/roadmap.md` § *Decisions needed*, moved out of that
    file by the reorg — **the link audit two steps earlier reported zero broken links because it
    checked markdown links and heading anchors, not prose references to section names.**

    **And it caught the same-day work.** CLAUDE.md's settings counts — 19 / 26 / 19 — were
    written hours earlier during a pass whose purpose was fixing stale numbers. They were copied
    from this file, accurate on 2026-08-03, and never counted against the tree; the real values
    are **20 / 28 / 21**. The staleness-fixing pass reproduced the failure it was fixing. That is
    the strongest argument the exercise made for itself.

    **Kept, explicitly:** all three runs praised the module header convention unprompted and used
    it to skip reading bodies; run A called the shared two-language settings contracts *"the best
    thing in this repo"*, which is step 7a's payoff confirmed by someone who did not know it
    existed. Recommended next actions are ranked at the end of
    [03-friction.md](03-friction.md); items 3–5 are one-line doc edits that clear the blocking
    failure and two MEDIUM findings.
12. **`main.py` extractions — COMPLETE.** Items 1, 2, 4 and 5 executed 2026-08-03; item 3
    **dropped** 2026-08-04 by maintainer call (reasoning below). `main.py` **2865 → 2750**, with
    **66 new Python tests** where these paths had almost none. One commit each, suite green
    between. Remaining work is on-Deck QA, not code.

    | Item | What moved | Where | Tests |
    |---|---|---|---|
    | 1 | Background-request state shape | `background_request_state.py` | 20 |
    | 2 | Ollama health probe (`/api/version`, `/api/tags`, `/api/ps`) | `ollama_service.py` | 22 |
    | 4 | Cancel-and-await, from 5 teardown sites | `async_task_lifecycle.py` | 8 |
    | 5 | Stop-button transport (close handle, spawn unload) | `ollama_service.py` | 9 |

    **`main.py` no longer imports `urllib`** — item 2 resolved the header contradiction the
    inventory called its one clear contract violation. Every new test file is mutation-checked.

    **Item 3 — dropped 2026-08-04 by maintainer call. The list is now 4 of 4; step 12 is
    complete as scoped.** The reasoning, kept as the record: the
    three blocks (sanitizer / shortcut / VAC) look identical but differ in a column that is not a
    value: `shortcut_setup` is *omitted* for sanitizer, *taken from the handler's return* for
    shortcut, and *explicitly None* for VAC. A table would need a three-way mode enum with one
    mode per row, which relocates the difference rather than collapsing it — and it would put a
    `getattr`-by-name indirection on the Ask admission path, the highest-traffic code in the
    plugin, to save about 17 lines. Refactor rule 2 wants 3+ call sites that *collapse*; these
    three do not. If it is ever reopened, the honest version is a small helper for the
    `handled is not None` / `resp = str(...)` preamble — ~12 lines, and the dispatch stays
    readable. **Do not re-propose the table** without new evidence; this is the second time the
    three blocks have been read as duplication that turned out not to be.

    **One defect found while extracting and fixed separately 2026-08-04** — a finished voice
    install surviving *Clear all plugin data*, now `_reset_voice_install_after_clear` with 6
    tests, two of which fail against the old code. It was filed under Bugs first and fixed in its
    own commit rather than inside a behavior-preserving move. Separately, a first draft of item 2
    hardened `/api/ps` parsing per-row; that was reverted for the same reason and the original
    all-or-nothing behavior is now pinned by a test.

    ~~**Not yet deployed.**~~ **Deployed and verified 2026-08-04**, superseding the note below.
    **MAINPY-EXTRACT-01 is Verified**: 54 files hash-verified on the Deck, `bonsAI plugin loaded!`
    with zero `Traceback`/`ERROR`, `probe_deck_rpc_surface.py` 21/21 and a new
    `probe_deck_step12_extractions.py` 14/14 — including the moved Ollama probe against the real
    on-Deck runtime and a **real streaming Ask aborted mid-flight**, which is the path item 12.4
    moved. **VOICE-CLEAR-01 stays Partial**: the backend reset is verified on-device, the UI half
    (Settings → Voice input after a real *Clear all plugin data*) is not. See
    [testing.md](../testing.md). Original note, kept for the record: *All four extractions plus the
    voice fix are verified by 492 Python tests only; none has run on-device. Item 5 changes the
    Stop path, item 4 changes plugin unload, and the voice fix changes* Clear all plugin data *— all
    three want a real on-Deck check.*

    Original entry: the ranked list in [07-mainpy-inventory.md](../archive/07-mainpy-inventory.md) §8, **identified 2026-08-03**. Item 6 (the D11 shim) was pulled ahead and is done; 1–5 are not: background-request state shape (~60 lines, LOW), `test_ollama_connection` transport → `ollama_service.py` (~70, LOW-MED — the only outright contradiction of `main.py`'s own header), local-command dispatch table (~40, MED), `cancel_and_reset` for `clear_plugin_data` (~45, MED), `abort_background_game_ai` transport (~25, MED). ~240 lines against a 2865-line file that is still the #1 hotspot by nearly 3×.

    **Sequencing needs a call.** §8 said items 1–2 were *"worth doing before step 7"* — step 7 shipped without them, so that guidance already lapsed once; items 3–5 were gated on *"after step 8"*, which is now. Nothing here is blocked, and nothing above is blocked on it. **Note the coverage cost before starting:** none of the ten largest `main.py` methods has a behavioral test (§9), so unlike step 8 there is no safety net — `test_merge_pulled_tags_rpc.py` and `test_session_rag_chip_candidates_rpc.py` are the only worked examples of testing a `class Plugin` RPC directly and are the pattern to copy. Expect *write the test first* to be most of the work for items 2–5.

**Phase 5 — done 2026-08-07.** [08-postmortem.md](../archive/08-postmortem.md) and
[09-prevention.md](../archive/09-prevention.md), written as two passes because folding them together
makes the mechanisms go vague. **Numbered 08/09, not the 07/08 REFACTOR-PLAN specifies** —
`07-mainpy-inventory.md` already held that ordinal.

The postmortem dates each structural problem from git rather than asserting it: the two
backend-less RPCs were live for **15 and 16 days** (`8b4be92` / `ac2c738` → `510139d` /
`a6213b8`), and `vitest.config.ts` shipped `include: ["src/**/*.test.ts"]` **at creation**
(`da028a6`, 2026-05-23), so a `.tsx` test could never run for **71 days**. The workflow
section names multi-concern commits as upstream of both — `da028a6` bundled that config
with jarring-redraw fixes, a recording prototype and an easter egg.

**Prevention adopts 7 checks and rejects 4**, ranked by problems-prevented ÷
friction-added. Top three: RPC-name cross-check (the only one that would have stopped a
user-visible defect, and `rpc-map.json` already supplies the data), test-collection
completeness (a dozen lines), and doc link/anchor validation. **Rejected on principle:**
enforcing one concern per commit — the strongest signal in the postmortem and the one
with no honest mechanism; enforcing vocabulary; and turning on the React dep-array lint,
which would make the duplication permanent by making it safe when the real fix is
derivation. Also rejected: doc "last reviewed" stamps, which are discipline wearing a
mechanism's clothes.

**Two findings landed on this refactor's own work.** Correcting CLAUDE.md's stale counts
introduced three fresh wrong ones (19/26/19 for 20/28/21) by copying a doc accurate four
days earlier — which is why prevention item 6 is *generate the numbers*, not *check them*.
And the first run of the link checker produced **38 false positives** from one file by not
stripping `:NNN` line citations; that calibration requirement is now written into the
proposal, because a gate that fires 38 times on day one is switched off on day one.

**Amendment rationale (2026-08-02):** steps 6 and 7 were missing from the original
order. As first written it ran the riskiest, least-covered work (entry-point
split) while skipping the highest-value, best-covered work (settings SSOT), and
left step 8 without the `main.py` inventory it needs. Both are restored ahead of
the split.

**Amendment rationale (2026-08-03):** **D7–D10** locked after code verification.
**D8** inserted as **5c** before step 8 — Windows `build.ps1` merge-without-prune
was the real false-pass class; **D7** as **5d** is a quick cleanup. **D9** narrows
"done" to step 8 only. **D10** replaces "on-Deck every commit" with modal-only
D-pad gating so state extractions are not blocked on full device QA.

**Session results — 2026-08-02.** Steps 1–5 complete, step 6 partly done, all
Cleanup candidates executed. Gates green at every commit.

| Measure | Before | After |
|---|---|---|
| RPC surface (`class Plugin`) | 55 | 50 |
| `main.py` | 3021 | 2971 |
| `index.tsx` | 1955 | 1709 |
| Python tests | 399 | 413 |
| Frontend tests | 217 (44 files) | 239 (46 files) |

Shipped: both missing RPCs wired (session RAG chips and pulled-tag routing merge
had **never worked** on-device); dead backend from three removed features
deleted; two re-export shims removed and their 31 importers repointed; the two
files that blocked the split given mutation-checked characterization tests.

**Four things the audit or the tooling got wrong**, all recorded with evidence
so they are not rediscovered:

1. `proton_experiment_journal_service.py` was **not** dead — `clear_plugin_data`
   needed its file wipe. Deleting it as written would have broken *Clear all
   data* on-device with every test still green.
2. `find_amdgpu_hwmon` was **not** apply-only — `read_current_tdp_watts` calls
   it, so removing it would have killed the current-TDP read Ask uses.
3. The preview-suite gate grep searched **symbols only**; the suite also names
   test *files*. Grep both. ([05-plan.md](../archive/05-plan.md) §1.1)
4. `vitest.config.ts` collected only `*.test.ts`, so a `.tsx` test **could never
   run**. The 44 untested component files were a tooling gap, not a discipline
   gap. ([04-coverage.md](../archive/04-coverage.md))

**Outstanding on-Deck QA from this session:** **ROUTING-MERGE-01** in
[testing.md](../testing.md) — implemented and unit-tested but never exercised on a
Deck. **SESSION-RAG-CHIPS-01** closed 2026-08-03: verified end-to-end in the UI
once the `settingsLoaded` race was fixed (see [Bugs](../roadmap.md#bugs)).

**Corrections to audit premises (for implementers):**

- **D1b:** `suggest_chip_candidates` ([knowledge_base_service.py:685](../../py_modules/backend/services/knowledge_base_service.py)) and `session_rag_chip_candidates_to_rpc` (`:744`) already exist with four tests in `tests/test_knowledge_base_service.py`. **`main.py:163-164` already imports both and never calls them** — the work was interrupted between the import and the method. The frontend sends `[appId, appName, shortcutName]` ([sessionRagChipCandidates.ts:55](../../src/utils/sessionRagChipCandidates.ts)), which matches the service signature exactly. This is an adapter of roughly ten lines. Do not redesign ranking before wiring it.
- **D2:** `ask_game_ai` is not dead — `tests/preview-suite/` calls it extensively. `ask_ollama` is the internal Ask engine, not an orphan RPC.
- **D4:** Six of nine evidence folders are not all unreferenced — several are cited from [archive/testing-results-2026.md](../archive/testing-results-2026.md) and [archive/testing-failures-2026.md](../archive/testing-failures-2026.md). Prune only after a link audit.

---

## Cleanup candidates — locked and executed 2026-08-02

Dead or hazardous code found during the 2026-08-02 refactor. All five rows were
locked by the maintainer and, except the deferred one, executed the same day.
Nothing here changed product behavior.

| # | Locked decision | Outcome |
|---|---|---|
| 1 | **Delete the one-shot migration scripts** | `071221e` — `scripts/extract_ollama_section.py` and `scripts/trim_settings_tab.py` gone. They rewrote `SettingsTab.tsx` / `OllamaWhereAiRunsSection.tsx` from source text hardcoded inside the scripts; running either would have reverted real components and reintroduced the deleted `settingsAndResponse` barrel import. Keeping them was the hazard |
| 2 | **Delete the orphaned kmsgrab capture sub-tree** | `4a26cfa` — six functions, not the four enumerated. `_build_kmsgrab_argv` was called only by `try_kmsgrab_screenshot`, and `gamescope_session_active` only by `_desktop_session_active`, so stopping at four would have left the same problem one node deeper. Preview gate run on **symbols and filenames** both, per the TDP lesson: clean. Live capture paths untouched |
| 3 | **Remove the `journal_text` plumbing** | `a029c2d` — parameter dropped from `stack_context_blocks`, caller stopped passing `""`. Its ordering test asserted a three-block arrangement that can no longer occur and was replaced with one covering what the stacker still guarantees. The duplicate roadmap note under Planned is collapsed |
| 4 | **Remove the `sysfs_writes` reader and field; keep the preview hook empty** | `a9353cc` — `read_sandbox_sysfs_writes` and the `get_input_transparency` field gone; `sandbox_sysfs_root` stays because `find_amdgpu_hwmon` needs it. `getSysfsWrites` kept returning `[]`: the in-repo runner never calls it, but `__bonsaiTestHooks` is consumed by DPS scenarios outside this repo, so the contract stands |
| 5 | **Defer the `docs/archive/` broken links to D4** | Not actionable here by decision. 272 relative links in historical files point at a `docs/` layout that no longer exists; fixing them is evidence hygiene, not code legibility. Folded into **D4** — see [06-doc-triage.md](../archive/06-doc-triage.md) § Link audit. Live docs are already link-clean |

**Found while executing, deferred to D7 (locked 2026-08-03, executed same day):**
`_reencode_oversized_capture` and `_mirror_capture_to_plugin_dir` in
`screenshot_media.py` — no production callers; deleted in execution-order step **5d**.


---

### D36 — LOCKED (option 1, 2026-08-28) — Pressing down in the try-order picker reorders your models. How should reordering work on a controller?

**Raised 2026-08-28 from the fullscreen picker edge-escape audit.** Real controller presses; the
full measurement is in [roadmap-details.md](../roadmap-details.md) under *Fullscreen picker
edge-escape audit*.

**What happens now.** Open **Set text model try order…**. Press down. The highlighted model moves
one place down the list — the highlight does not move to the next model, the *model* moves. Press
again and it moves again. After each move the highlight vanishes entirely: nothing on screen looks
selected, and **B no longer closes the picker** until another press brings the highlight back. The
only way to get out downward is to keep pressing until the model has been pushed to the bottom of
the list, at which point the highlight finally escapes to *Reset to defaults*. Measured: three
presses turned `gemma4, qwen2.5:1.5b, qwen3.5:4b, nomic` into
`qwen2.5:1.5b, qwen3.5:4b, nomic, gemma4`. The vision list works the same way — it is the same
screen.

**Why it matters.** Reading the list and rearranging the list are the same gesture, so a user who
just wants to see what is in there rewrites their own model order without being told. Nothing is
saved unless they press **Done**, so the damage stops at the picker — but they have no highlight to
tell them what is going on, and B appearing to be broken is the worst part of it.

**What is not in question.** Whichever option is chosen, the `.focus()` calls have to go: they are
plain DOM focus, which is not how Steam's ring moves, and they are the reason the highlight
disappears. `.cursor/rules/decky-focus-graph.mdc` already says so.

**Options.**

| # | Option | What it costs you |
|---|---|---|
| 1 | **Up/down move the highlight; reorder only with the Up/Down buttons on each row** | Simplest, and the buttons already work — you press A on one. Reordering becomes a two-step gesture: move to the row, move right to its buttons, press A. Matches every other picker in the plugin |
| 2 | **A "grab" mode** — press A on a row to pick it up, then up/down move it, then A again to drop it | Closest to how people expect to drag a list with a controller, and keeps reordering fast. Needs a visible "held" state, or it is the current bug with extra steps |
| 3 | **Leave up/down as reorder, but fix the highlight** so it follows the moved row and never disappears | Smallest change to what exists. Does not fix the real complaint — you still cannot read the list without editing it |

**Recommendation: option 1.** It is the least code, it removes a whole class of focus bug rather
than papering over it, and the reorder buttons it relies on are already there and already labelled
(*"Move gemma4:e2b-it-qat up"*). Option 2 is the nicer gesture if reordering turns out to be
something people do often, and it can be added later on top of option 1 without undoing it.

**Locked 2026-08-28, in the maintainer's words: "option 1. Fix it now."** Implemented and
confirmed on device the same day: the row handlers and their `.focus()` calls are gone, Down moves
the highlight, and reordering lives on each row's Up/Down buttons. Measurements and the two
side-findings the confirmation run turned up are in
[roadmap-details.md](../roadmap-details.md) under *D36 option 1, implemented and confirmed*.

---

### D37 — LOCKED (endorsed 2026-08-29) — Blind holdout rows added to `kb_eval_v2`. Endorse them?

**Locked in the maintainer's words: "D37: i endorse it" (2026-08-29).** The method stands, and both
batches — 56 rows in total, `V2-BLIND-H01` … `V2-BLIND-H56` — are the holdout baseline from here on.
Not to be re-argued; what remains is measurement, not permission.

**What the endorsement settles, so it is not re-litigated later:** writing a question from a bare
metadata listing (id, title, `section_type`, game) plus the author's own knowledge of the title
counts as blind, even though the author is the one certifying they did not read the card. The
evidence for that claim is the written procedure and the automated title-word-leak check, not a
guarantee — and that was visible when the call was made.

**What it does not settle:** the wording of any individual row was explicitly not part of the ask.
Any row can still be challenged on its merits; what cannot be re-opened is whether rows written
this way belong in holdout at all.

#### First measurement against the 92-row holdout, 2026-08-29 — the rows earned their keep

Run after the rows merged (`ebd2361`) and after the endorsement, in that order, as promised.
`nomic-embed-text` prompted, seed corpus `build/knowledge-base-test` manifest `2026.08.29` (same
card content as `2026.08.28` — `data/kb/` is unchanged since `4a479b1`), same corpus for every arm.
Run of record:
[../archive/research/kb-embed-bakeoff-2026-08-29-arms.md](../archive/research/kb-embed-bakeoff-2026-08-29-arms.md).

| Arm | holdout top-3 | CI | holdout top-1 | CI |
|---|---|---|---|---|
| keyword | 70.7% | [60.9, 80.4] | 51.1% | [41.3, 62.0] |
| vector_only | **83.7%** | [76.1, 91.3] | **64.1%** | [54.3, 73.9] |
| rrf_rerank_only | 71.7% | [62.0, 81.5] | 52.2% | [42.4, 63.0] |
| rrf (ships) | 79.3% | [70.7, 87.0] | 56.5% | [46.7, 67.4] |

**Every number is lower than the n=56 series and that is the rows working, not a regression.**
Fusion fell 85.7% → 79.3%; keyword fell 83.9% → 70.7%. Keyword lost **twice as much**, which is
exactly the direction rows written to share no vocabulary with their card should push it. The
gap between the two grew from **1.8 points to 8.6**. Not comparable as levels (R4) — comparable
as a direction.

**Two findings that matter more than the headline:**

1. **The holdout has started to separate.** keyword 70.7% [60.9, 80.4] against vector_only 83.7%
   [76.1, 91.3] overlap by 4.3 points, where the old 36-row holdout scored every arm *identically*.
   The harness's printed verdict still reads "no separation" because it only ever compares `rrf`
   against `keyword` — the pair that separates is `vector_only` against `keyword`, and the verdict
   line does not look at it. Worth fixing in the harness so the sentence matches the table.
2. **The shipping arm is beaten by the vector half alone, on holdout only.** `rrf` 79.3% / 56.5%
   against `vector_only` 83.7% / **64.1%** — 7.6 points of top-1. On `tune` the two are level
   (91.5% top-3 each, `rrf` ahead on top-1). An arm that ties on the rows the weights were tuned on
   and loses by 7.6 points on rows nobody tuned against is the textbook shape of **fusion weights
   that do not generalise** — and catching that is the entire reason a blind holdout exists. Filed
   on the roadmap; **not** to be acted on by re-tuning against holdout, which would burn it.

> **Numbering note, resolved 2026-08-28.** The parallel duplicate-D19 fix renamed that decision to
> **D19b** (per D31) rather than taking a new number, so D37 stands and no renumbering is needed.

**The situation.** [D23](#d23--where-do-the-paraphrase-questions-go) folded 15 paraphrase rows into
`kb_eval_v2` but, by its own rule (R1), had to assign every one of them to `tune` — they paraphrase
`kb_eval_v0`, which is card-derived throughout, so a paraphrase of a card-derived query is still
card-derived. The holdout split (n=36 at the time) was left exactly as it was: unable to separate
keyword, vector-only and fusion retrieval at all, all three scoring identically. D23 said outright
that fixing this needs "rows written blind against the cards" — a different piece of work. This is
that piece of work.

**What was added.** Twenty new rows, `V2-BLIND-H01` through `V2-BLIND-H20`, all `split: holdout`,
none `tune`. Eighteen are strategy-domain (spread across 12 of the 13 corpus titles — every title
except State of Emergency, skipped for lack of confident general knowledge of that game) and two
are compat-domain (topics `steam_input` and `storage`). Full row list and per-row provenance:
[kb-blind-holdout-rows-2026-08-28.md](../archive/kb-blind-holdout-rows-2026-08-28.md).

**The method, in one paragraph.** Each row was written from the author's own general knowledge of
the title plus a metadata-only listing (id, title, section_type, game — generated by a throwaway
script over `data/kb/*.json`) — never from the card text itself. Any card whose title alone wasn't
enough to write a confident question was skipped rather than peeked at. No retrieval, embedding, or
eval-harness run touched these rows at any point before this write-up — the split was fixed
(all holdout) before anything could be measured, which is the same R1 discipline D23 named and
could not itself satisfy for its own rows.

**What this is not.** Not a re-measurement. The holdout baseline numbers on record (83.3% across
every arm, as of the last measurement cited in
[session-handoff-2026-08-21.md](../archive/session-handoff-2026-08-21.md)) are from the old 36-row holdout.
Adding 20 rows changes what "holdout" means as a set, so **any number measured against the new
84-row holdout is a new series and is not comparable to the old 83.3% figures (R4)** — the same
caveat D23 recorded for its own fold-in. **The first measurement against this new holdout happens
after this change merges, not as part of writing it** — writing blind and then immediately
measuring in the same session would let the split leak into the numbers before anyone outside this
session has seen them, which is exactly what R1 exists to prevent.

**What the maintainer is being asked to endorse.** Whether twenty rows written this way — general
knowledge plus an id/title/type/game listing only, zero measurement before the ask — count as
genuinely blind for the purpose D23 described, and whether they should stand as the new holdout
baseline once next measured. Not being asked: the specific wording of any individual row, which is
reviewable from the row list in the linked write-up.

**First measurement, 2026-08-28 (after merge, as promised above).** One arms run on the merged
tree — new rows plus the pool-margin gate from
[kb-second-signal-2026-08-28.md](../archive/kb-second-signal-2026-08-28.md) — with `nomic-embed-text`, seed
corpus at `build/knowledge-base-test`. On the labelled holdout (now n=56): **fusion 85.7%
[75.0, 94.6] vs keyword 83.9% [73.2, 92.9] top-3.** That is the first time the two arms have
produced *different* holdout numbers at all — the old 36-row holdout scored every arm identically —
but the confidence intervals still overlap, so the honest reading is unchanged: these fixtures
cannot yet tell the arms apart. Not a tie; an unresolved question that now at least has a
direction. Run of record:
[../archive/research/kb-embed-bakeoff-2026-08-28-arms.md](../archive/research/kb-embed-bakeoff-2026-08-28-arms.md)
(this run supersedes the same-day file committed with the second-signal work, which measured the
pre-fold-in fixture; those numbers survive in that work's own write-up and in git history). One
row, `V2-BLIND-H19`, describes its controller symptom without any troubleshooting term and so
never reaches compat retrieval in production — the same known-miss shape as `V2-C-04`. It is
**named in the reach pin** (`test_compat_topic_router.py`,
`test_measured_reach_on_the_drafted_intents`) rather than reworded, because rewording it until it
routes would tune it against the router and undo its blindness. That a blind row immediately found
a hole the card-derived rows never could is the method working, not a defect in the row.

**Batch 2, added 2026-08-28 — thirty-six more rows, same method, same ask.** `V2-BLIND-H21` …
`V2-BLIND-H56`: 34 strategy rows across 11 titles and 2 compat rows, every one targeting a card
that carried no eval row of any kind before. Write-up and full row list:
[kb-blind-holdout-rows-batch2-2026-08-28.md](../archive/kb-blind-holdout-rows-batch2-2026-08-28.md).

Why a second batch rather than stopping at the first measurement: the arms differ by under two
points and the interval half-width at n=56 is about ten, so the overlap above is mostly a
sample-size problem rather than an answer. **Labelled holdout is now 92** (holdout overall 84 →
120). By the same R4 rule this file keeps applying, the 85.7% / 83.9% figures in the paragraph
above are now the *previous* series and are not comparable to anything measured from here on. **No
measurement was run while writing batch 2**, for the reason batch 1 gives; the first run against
the 92-row holdout happens after that change merges.

Batch 2 found the same hole again before it was scored: `V2-BLIND-H55` (*"the game drops me back
to the library a few minutes in"* — a crash with the word *crash* never used) also fails to reach
compat retrieval, and is named in the reach pin alongside H19 rather than reworded. **Two of the
four blind compat rows now miss**, which is a reach limit of the D16 router worth its own roadmap
entry, not a defect in either row.

**What is being asked has not changed** — endorse the method and let these stand as the holdout
baseline once next measured. Batch 2 rides on the same answer; a "no" on the method retires both
batches together.

---

### D38 — DEFERRED at the maintainer's request (raised 2026-08-29) — What ships is beaten by half of itself on the blind rows. How should that be acted on?

**Maintainer's position, 2026-08-29, in their own words: "I need more data, more games, more
questions before I can make an informed decision."** So this is **not** open for an answer yet, and
nothing about the fusion weights is to be changed until it is. What the deferral asks for is being
built — see *What is being done about it* below.

**The situation, in plain language.** The plugin finds knowledge cards two ways: **word matching**
(cards containing the words you typed) and **meaning matching** (cards that mean the same thing,
even sharing no words). It blends the two lists into one ranking, and each way currently gets an
**equal vote**.

The first measurement against the blind holdout rows says that equal vote is costing us:

| Split | keyword | vector_only | rrf (ships) |
|---|---|---|---|
| tune (n=117) | 75.2 / 86.3 | 74.4 / 91.5 | **75.2 / 91.5** |
| holdout (n=92) | 51.1 / 70.7 | **64.1 / 83.7** | 56.5 / 79.3 |

*(top-1 / top-3. Run of record:
[../archive/research/kb-embed-bakeoff-2026-08-29-arms.md](../archive/research/kb-embed-bakeoff-2026-08-29-arms.md))*

**On the blind rows the meaning half alone beats the shipping blend by 7.6 points of top-1.** The
reason is legible: the blind questions share no wording with their card by construction, so the
word-matching half has nothing to go on — and because it still gets an equal vote, it drags good
answers down the ranking.

**Why this is a decision and not just a number to change.** The weights
([knowledge_base_service.py:60-68](../../py_modules/backend/services/knowledge_base_service.py))
were never tuned. They were set equal and locked on 2026-08-09 with an explicit instruction: *"Equal
weights stay; do not 'tune' from a later peek at holdout."* That rule is correct — tuning after
peeking is how a ship gate quietly stops being one. But **the only split it is legitimate to tune
against said "change nothing"**: on tune, the blend was already the best arm available. So the rule
that keeps the gate honest was also blocking the fix the gate had just asked for. That is the knot,
and it is why this went to the maintainer rather than being quietly re-weighted.

**The options as they stood when it was raised.**

- **A — give tune the missing kind of question, then tune normally.** Write blind rows into `tune`
  so tuning can finally see keyword-hostile questions, sweep the weights on tune alone, and spend
  one holdout confirmation at the end. Costs writing effort; keeps the gate intact. Recommended.
- **B — re-weight from reasoning, then spend one holdout check to confirm.** Fast, but it uses up
  some of the gate's honesty and cannot be repeated.
- **C — change nothing.** Accept that the blend does worse on realistic questions than one of its
  own halves. Defensible while there are no users; less so after the first one.

**What is being done about it while it is deferred**, all of it option A's groundwork and none of it
touching a weight:

1. **51 blind rows added to `tune`** (`V2-BLINDT-01`…`51`), 2026-08-29 — the split had **zero**
   before, which is the whole reason it could not see the defect. Labelled tune 117 → 168. Method
   and disclosures: [kb-blind-tune-rows-2026-08-29.md](../archive/kb-blind-tune-rows-2026-08-29.md). **Every
   tune figure in the table above is superseded by this (R4)**; holdout is untouched.
2. **A weight sweep on `tune` only** — measuring whether any keyword/vector ratio looks better than
   equal, which is the legal move under the lock. Result to be recorded here.
3. **More games** — the maintainer asked for these explicitly. Flagged rather than started, because
   [knowledge-base.md](../knowledge-base.md) § Phase 5 locks *"no net-new titles in Phase 5"*
   (2026-07-30), sending catalog growth to Phase 8. Net-new titles therefore need that lock revisited
   first, and a title list only the maintainer can supply. Deepening the existing 13 is Phase 5 work
   and is gated on Phase 4 passing on the Deck, which is now all but complete.

**Not to be done meanwhile:** no weight change, and no tuning against holdout, whatever a later
number looks like.

---

### D39 — LOCKED (2026-08-29) — Four cards are filed under an arguable kind. Which kind do they take?

**All four answered by the maintainer on the corpus gap sheet, 2026-08-29.** Full answers and
context: [corpus-gap-answers-2026-08-29.md](../archive/corpus-gap-answers-2026-08-29.md).

**Why it was asked.** A card's `section_type` is not cosmetic: it decides the wording of the carousel
chip built from it (*"How do I deal with X?"* for an enemy, *"What should I know about X?"* for a
mechanic), it feeds the D25 type-recall rescue, and it decides what the one-kind-at-a-time chip pool
interleaves. Ten cards were re-typed without asking because the call was clear-cut. These four were
not clear-cut, and a wrong call is worse than none, so they went to the maintainer.

| Cards | Locked call |
|---|---|
| Cyberpunk 2077 — *Sandevistan*, *Kerenzikov*, *Berserk* | **Stay `mechanic`.** In their words: "not worth the churn" |
| Portal 2 — gels, funnels, faith plates, light bridges | **Stay `mechanic`** |
| Half-Life 2 — *Antlions and the sand* | **Split into two cards** |
| Hades — *Starting weapons* | **One card per weapon** |

**The first two cost nothing** — they confirm the depth plan's proposal to leave them alone, so no
card changes and no measurement is needed for either.

**The second two are authoring work**, and they are the only card writing this round has an explicit
instruction for:

- **Half-Life 2** — one card becomes two: the antlions as an `enemy`, and the sand rule as a
  `mechanic`. The existing card is wiki-sourced (`combineoverwiki.net`, CC-BY-SA-4.0), so **both
  halves inherit that source and licence** and the ATTRIBUTIONS entry must still name it. Splitting
  a sourced card does not make either half maintainer-authored.
- **Hades** — one card becomes six, one per Infernal Arm. These are maintainer-authored
  (`source_license: bonsAI-maintainer`, empty `source_url`), so they carry the weaker
  `fallback_no_source` trust tier, the same standing as the existing DRG Survivor and Ocarina entity
  cards.

**Both are behaviour changes, not refactors.** Splitting a card changes what retrieval can return and
changes the chip pool's kind mix, so both are measured before and after, and Half-Life 2 and Hades
each get their chip pool re-checked the way `PHASE4-CHIPS-01` does for Left 4 Dead 2.

**Not asked and not decided here:** whether the corpus should gain a *build / early-game orientation*
card shape, which the same gap sheet asked for twice in free text. That is a bigger question than a
`section_type` value and is filed on the roadmap rather than smuggled in under this decision.

#### D39 follow-up (2026-08-29) — the Half-Life 2 half is done; the Hades half is blocked

**Half-Life 2 — shipped, but not in the shape this decision wrote down.** D39 above says the two
halves become an `enemy` and a `mechanic`. They became an `enemy` and an **`item`**. The reason is a
card nobody had looked at when D39 was written: **`Sandtraps` (section 37) already carries the sand**
— *"Rock to rock on the way out; after the Antlion Guard you keep the pheropod and use antlions to
break the Combine bunkers."* A new `mechanic` card about sand would have been the **third** Half-Life
2 card on the same subject, all three competing for the same query. So the pheropod became what it
actually is — a thing you carry and throw, the same kind as `Gravity Gun` and the RPG — and the sand
rule stayed with the antlions, because it is a fact *about the antlions* (they are blind, they feel
vibration) rather than a rule of its own.

Result: section 36 is now `enemy` **Antlions**, section 142 is `item` **Pheropod (bugbait)**. Both
sentences are the original wording, split where the original card already changed subject; the only
new words are the four needed to stop *"it reverses"* dangling. Both keep
`combineoverwiki.net/wiki/Antlion` and CC-BY-SA-4.0, so the ATTRIBUTIONS entry gains a row rather
than losing one. Half-Life 2 goes 8 cards to 9, spanning four kinds.

The name carries **both** words the game uses — *pheropod* in dialogue, *bugbait* in the HUD — so a
player who only ever saw one of them still reaches the card.

**Two eval rows were repointed**, which is worth stating plainly because repointing a question after
seeing how it scores is how a score gets quietly flattered:

| Row | Was | Now |
|---|---|---|
| `V2-S-HL2-06` — *"there is a bit on the beach where you cant touch the sand and i keep dying"* | Antlions and the sand | **Antlions** |
| `V2-S-HL2-08` — *"antlions how to control them"* | Antlions and the sand | **Pheropod (bugbait)** |

**Both are on `tune`. No holdout row was touched**, so the honest ship gate is unaffected by this
edit. 887 Python tests pass.

**Hades — blocked, and not on schema or tooling.** The maintainer said on 2026-08-29 that they do
not know the game well enough to supply the content. That is a real blocker, because the existing
card cannot be split into six: **it names four of the six Infernal Arms** — the Stygian Blade, the
Shield of Chaos, the Rail and the Bow. The Eternal Spear and the Twin Fists appear nowhere in the
corpus. Splitting what exists yields four one-line cards and still leaves two weapons missing, which
is motion rather than progress.

Three ways out, none of them started, none needing a decision before the corpus republishes:

1. **Source it.** A Hades wiki under CC-BY-SA-3.0 is already precedented in this corpus (Cyberpunk,
   Fallout 4, Left 4 Dead 2 and GTA all use Fandom under exactly that licence, and D20's publish
   policy already covers it). This removes the need for maintainer knowledge **and** upgrades the
   cards from `fallback_no_source` to a sourced tier. Best option on the merits.
2. **Split the four that exist** and leave the Spear and Fists absent, with the gap recorded rather
   than hidden.
3. **Leave section 89 alone** until either of the above is worth doing.

Recommendation is (1). It is the only one that ends with six real cards, and it is the option that
does not spend the maintainer's time on a game they have told us they do not know well.

---

### D40 — LOCKED (2026-08-29) — Terse mode's branch menu appears on every reply and never stops. The branch fence is mandatory-once and banned on follow-ups. Which rule wins?

**Locked in discovery with the maintainer on 2026-08-29, before any code exists.** Roadmap entry:
**Terse mode** under Backlog → Ask / reply; full shape in
[roadmap-details.md](../roadmap-details.md).

**Why it was asked.** Terse caps a Speed answer at three lines, so it needs a way to get the rest.
The maintainer chose the existing strategy branch picker over a new *explain further* chip — reusing
a control that already renders and is already D-pad reachable. But the picker as built is close to
the opposite of what terse needs. Today it is **Strategy-mode only**, **mandatory on the first
turn**, and the prompt explicitly forbids repeating it — *"Do NOT repeat this branching fence when
the user later sends a message starting with [Strategy follow-up]"*
([ollama_prompts.py:1317](../../py_modules/backend/services/ollama_prompts.py#L1317)). Terse needs it
in Speed, on every reply, without end.

**Four shapes were drawn out for the maintainer, who picked B:**

| | Buttons appear | Pressing one leads to | Picked |
|---|---|---|---|
| A | every reply | one more reply, then the trail ends | |
| **B** | **every reply** | **another set of buttons, forever** | **yes** |
| C | only when there is more to say | one more reply, then ends | |
| D | only when there is more to say | another set, forever | |

**Why B.** It is the version you can play a whole session with and never touch the on-screen
keyboard, which on a couch is the point of the feature. **C was rejected on a specific ground rather
than taste:** enforcement is wording only, so a missing button row is ambiguous — you cannot tell
*"there was nothing more to say"* from *"the model forgot to offer"*.

**What is locked:**

- The branch fence becomes **repeatable** and available **outside Strategy mode**. This decision
  *widens* the fence; it does not delete the existing Strategy rule, which stays once-only until
  someone measures a reason to change it.
- Buttons are **stacked full-width** in the 300px column, not squeezed into a single row.
- **No separate *explain further* chip.** The menu already does that job, and two controls for one
  intention is one more thing to reach with the D-pad.
- **No exit control.** The Ask field stays live throughout, so the menu is an offer, not a trap.

**What this decision does not cover**, both build-time questions rather than maintainer calls: how
many options a terse menu should offer (Strategy's fence allows 2–8), and how a repeating fence
interacts with the spoiler rule that currently requires every `bonsai-spoiler` block to sit **above**
the branch fence on a first turn
([ollama_prompts.py:454](../../py_modules/backend/services/ollama_prompts.py#L454)).

**Also settled in the same session and deliberately given no number of their own**, because nothing
in the existing code or docs argues with them: terse overrides the reply-style slider and the AI
character inside Speed; it is off by default; it changes output only and never thinking effort; and
it keeps Caveman's destructive-warning and depth-phrase escapes but not its character step-aside.

#### D39 follow-up, correction (2026-08-31) — "source the Hades wiki" was bad advice; the split shipped anyway

**The recommendation above was wrong, and this repo had already proved it wrong.** It said a Hades
wiki under CC-BY-SA-3.0 was precedented. There is no such wiki:

| Source | Licence | Verdict |
|---|---|---|
| `hades.fandom.com` | **CC BY-NC-SA 3.0** | NonCommercial — excluded by D20 since 2026-08-14 |
| `hades.wiki.fextralife.com` | "Custom License" | not a free licence; never a candidate |
| `hades.wiki.gg` | — | does not exist |

Worse, the Fandom case is a **trap this project already walked into and marked**: the archive.org
item for that snapshot advertises **CC BY-SA 3.0**, while the wiki's own `siteinfo` inside the
snapshot says **CC BY-NC-SA 3.0**. Checked 2026-08-09, resolved in favour of the stricter one, and
written down in three places — D20, ATTR-1.2 in
[15-corpus-licensing-attribution-plan.md](../archive/15-corpus-licensing-attribution-plan.md), and
the body of commit `ac03617`. Anyone who trusts the item metadata files NC content under a free
licence. **Read D20 before proposing a source, not after.**

**The blocker was never real.** Commit `ac03617` settled how the seven unsourceable titles get
content — *"maintainer-authored where [dumps] do not [exist]"* — and Hades is one of the seven.
Every Hades card in the corpus, section 89 included, was already written that way. So splitting it
needs no new standing, no new licence, and no game knowledge from the maintainer that the existing
card did not already require.

**Shipped.** Section 89 becomes `mechanic` **Weapon aspects**, carrying the one sentence in the old
card that was never about a single weapon. Six new `item` cards, sections 143–148, one per Infernal
Arm: Stygian Blade, Shield of Chaos, Heart-Seeking Bow, Eternal Spear, Twin Fists of Malphon,
Adamant Rail. The Spear and the Fists appear in the corpus for the first time. Each card keeps the
old card's judgement where it made one — the Blade is still *"the safest thing to learn on"*, the
Shield still *"turns a mistake into nothing"*.

Hades goes 8 cards to 14, and gains an `item` kind it did not have, so its chip pool can interleave
four kinds instead of three. `V2-S-HADES-02` (*"which weapon is easiest"*) repoints from
*Starting weapons* to **Stygian Blade** — on `tune`, no holdout row touched. 890 Python tests pass.

**What is genuinely weaker here, and should be said rather than buried:** these six carry
`fallback_no_source`, so nothing external backs them. That is the same standing as the 74 cards
already in the corpus and is covered by the ATTRIBUTIONS *Accuracy* section — cards are distilled,
not authoritative, and wrong ones get fixed forward. It also means, per the note closing
[corpus-gap-answers-2026-08-29.md](../archive/corpus-gap-answers-2026-08-29.md), that **whoever wrote them can
never write a blind eval row for them.** Six cards' worth of blind-row capacity was spent here.

### D40 — OPEN (raised 2026-08-31) — The eval allows one right answer per question. The corpus has outgrown that.

> **Resolved by [D51](#d51--locked-2026-09-01--the-eval-may-hold-a-second-right-answer-resolves-the-eval-d40-which-becomes-d40b) on 2026-09-01: option 1, with a written reason per second card.** Numbering collision with the Terse-mode D40 above; this one is **D40b** from here on (D31 precedent).

**Evidence:** [kb-eval-after-depth-2026-08-31.md](../archive/kb-eval-after-depth-2026-08-31.md). Adding 13
cards regressed 7 eval cases and improved none. **Five of the seven are cases where more than one
card is a fair answer**, and the fixture can only name one.

The clearest is `V2-S-SOE-03`, *"how to get more time"*. It expects `Kaos mode and Revolution mode`,
which is what State of Emergency had when it owned five cards and that one was the only thing
resembling an answer. Retrieval now returns `Round time and the +15s pickups` — a card written from
the maintainer's own words about that exact confusion. **The answer got better and the number went
down.**

This will happen again on every depth pass, and it gets worse as the corpus improves, which makes it
a measurement bug rather than a content bug.

**Options, in plain language:**

1. **Let a row list several acceptable cards.** `expect_section` becomes a list; a hit is any of
   them. Cheapest change, and it matches how a reply actually works — three cards are injected, not
   one. Risk: a lazily-written list of four cards makes a row impossible to fail.
2. **Keep one expected card but score top-3 only**, dropping top-1 as a headline. Honest about what
   the product does, but throws away the signal that says *"the best card came first"*.
3. **Leave it, and treat the score as a floor** rather than a measurement — every future number is
   read as "at least this good".
4. **Split the rows instead**: where two cards are both fair, write two questions that separate
   them. Most work, best fixture, and it is the only option that makes the eval sharper rather than
   more forgiving.

**Constraint that is not negotiable:** whatever is chosen, `V2-S-SOE-07` and `V2-S-SOE-09` are
**holdout** rows that were seen to fail. Rewriting either one now converts the ship gate into a
mirror. If option 1 or 4 is taken, it is applied to `tune` and to *unread* holdout rows, and those
two are left alone or retired outright.

### D41 — OPEN (raised 2026-08-31) — A card named after a category outranks the cards inside it

**One real regression** came out of the Hades split. `V2-S-HADES-02` asks *"which weapon is
easiest"* and expects `Stygian Blade`, whose card says *"the safest thing to learn on"*. It now
returns `Weapon aspects`, `Shield of Chaos`, `Adamant Rail` — the right card is not in the top three
at all.

The cause is plain: **`Weapon aspects` contains the word *weapon* and the six weapons do not.** They
are named `Stygian Blade`, `Eternal Spear` and so on. Before the split, one card was called
*Starting weapons* and won the same match honestly, because it *was* the answer.

**What must not be done:** rewording the Blade card to say *"easiest"*, or renaming `Weapon aspects`
to dodge the match. Both are fitting the corpus to a test question, and this repo has already
recorded that failure mode once ([00-phase0.md](../archive/00-phase0.md)).

**The real question:** should a card whose name is a *category* sit in the same pool as cards that
are *instances* of that category? Options:

1. **Accept it.** One tune row is wrong; the shipped `rrf` arm may well rank it correctly, and this
   was never measured per-case for `rrf` — the per-case data only exists for the keyword arm.
   **Measure `rrf` per-case before deciding anything.** Cheapest and most likely correct first step.
2. **Give instance cards their category word.** Name them `Stygian Blade (weapon)` and so on. Fixes
   retrieval generally rather than for one question, at the cost of clumsier chip labels — and chip
   width is already a known problem on a 300px column.
3. **Fold `Weapon aspects` into the mechanic it belongs beside** (`Mirror of Night`, `Darkness, keys
   and gems`) so the category name stops competing with the instances.

**Recommended first step is (1)** — the finding rests entirely on the keyword arm, which is not what
ships, and the tooling does not currently write per-case results for the fusion arms.

### D42 — LOCKED 2026-08-31 — Never-used chats clean themselves up (option 2)

Pressing A on the [+] position creates a chat immediately, named "New chat". If the user then
never asks anything in it, that empty chat stays in the rotation forever — and on the strip it is
almost indistinguishable from the [+] screen itself, which is how "there are two new chat screens"
got reported on 2026-08-31. The 2026-08-31 fixes make asks from [+] create-and-name a chat
properly, so new empties can now only come from A-create followed by walking away.

Options:

1. **Do nothing.** The × on the row already deletes one. Empty chats are rare after the fix, and a
   user who created one on purpose keeps it. Cheapest; the confusion case mostly died with the fix.
2. **Sweep on leave.** When the user switches away from a chat that has zero turns AND still has
   the default "New chat" name, delete it quietly. A renamed empty chat is kept, treating the
   rename as "I mean to use this". Risk: a delete the user did not ask for, even if what is
   deleted is by definition empty.
3. **Stop creating on A.** Make A on [+] only focus the Ask field, so a chat only ever comes into
   existence with its first question (asks from [+] already work this way now). No empties can
   exist at all; changes a shipped affordance, needs the focus graph checked.

**Locked the same day: option 2, sweep on leave.** Maintainer's words: "YES! Definitely don't
leave those dingleberries." Implemented in `useChatSlots.sweepIfNeverUsed` with both protections —
a renamed empty chat is kept, and a chat the backend is generating into is never touched (the
Ask-from-[+] flow makes a chat that is briefly empty AND named "New chat" while the first answer
is being written; sweeping it would lose that answer). Proven on-Deck the same evening:
`runs/V3-21-sweep-empty-chat.json` — A on [+] created "New chat", one RB away and it was gone
from the rotation.

### D43 — LOCKED 2026-09-01 — Two chips across the preset row, or three? (option 1, two across)

The one-chip preset row (`fc1b245`) is being redone to the drawing: chips side by side in one row,
long labels scrolling sideways ([planning/29-preset-row-three-thirds-plan.md](../planning/29-preset-row-three-thirds-plan.md)).
The drawing says **three** ([major-redesign.md:149](../archive/major-redesign.md), "three chips, not four").
The maintainer asked, 2026-09-01, whether **two** would be better given how narrow the QAM column is.

**Measured, not predicted.** The column is 300 CSS px (docked 1080p; handheld unmeasured). With a
4 px gap, three chips are ~97 px each and two are ~148 px. Label room is that minus Steam's
`DialogButton` side padding, which this plugin does not override and has not been measured; at 8 px a
side, three across leaves **~12 characters** and two across **~20** (6.45 px per character at 12 px,
from PHASE4-CHIPS-01). The 43 built-in suggestions run 16 to 52 characters, median 35; corpus chips
about 20 to 50, median ~30. So at three across **no suggestion is recognisable without watching it
scroll** ("How do I fix", "What TDP sho"); at two across most are ("How do I fix stutter", "Why is my
game crash"). Badged Tip/Test chips lose another ~21 px; the Couch and Immersive UI scales lose a
further 15 to 22 %.

**What two across costs:** one fewer suggestion on screen; the three contextual seeds no longer all
show at once (a two-slot queue replaces the one-chip queue instead of deleting it); and **the corpus
Tip guarantee silently breaks** unless it is changed, because it converts the *last* of the three
seeds ([sessionRagComposer.ts:113-120](../../src/features/preset-carousel/sessionRagComposer.ts)),
which would be the hidden one. It also departs from the drawing, which is why this is a decision and
not a build choice.

Options:

1. **Two across (recommended).** Chips readable at a glance. Convert a visible slot for the Tip
   guarantee; generalise the seed queue to two slots; record the departure in
   `major-redesign.md § 7`.
2. **Three across, as drawn.** Three fragments that make sense only in motion, three crawls at once.
   Simplest code path: delete the one-chip queue, no guarantee change.
3. **Three across, but only the focused chip scrolls.** Calmer than 2, still unreadable at rest.

Whichever is chosen, the first deploy measures the button padding and the real character counts on
the live page and writes them into the plan's § 3b.

**Locked 2026-09-01 by the maintainer: option 1, two across.** Build per
[planning/29-preset-row-three-thirds-plan.md](../planning/29-preset-row-three-thirds-plan.md); the
first deploy writes the measured padding and character counts back into that plan's § 3b.

### D44 — LOCKED 2026-09-02 — Reopen R5: the tab strip collapses to a thin bar and gets names (option 1, the discovery answer)

**R5** ([major-redesign.md § 7](../archive/major-redesign.md), 2026-08-09; re-confirmed in the turn-8 review
2026-08-29/30) locked the tab strip as *filled active glyph only, no micro labels, no width change, no
height cost*. Two things have moved since. The maintainer set the vertical-space goal on 2026-08-30 and
filed *the tab names never appear* as a bug the same day. And the collapsing bar was workshopped on
2026-09-01: [planning/30-collapsing-tab-bar.md](../planning/30-collapsing-tab-bar.md), twelve decisions,
all taken.

What R5 protected, and what the plan does to each:

- *No height cost.* The plan goes the other way: the strip drops from about 85px to about 20px at rest,
  and the open strip floats over the panel, so it never costs the transcript anything.
- *No micro labels.* The open strip carries a small name under every icon, shown only while the ring is
  on the strip. The thin bar carries the active tab's name at a readable 11px the whole time.
- *No width change.* Kept. There is no wide active cell; the maintainer dropped it in discovery.
- *Filled active glyph.* Kept on the open strip.

Options:

1. **Reopen R5 as the plan says (the discovery answer, 2026-09-01).** Names on the thin bar and on the
   open strip, no wide cell. R5's height objection is moot because the strip only opens while focused
   and floats over the panel.
2. **Keep R5's label ban and still collapse.** Dashes plus the active *icon* at rest, icons only when
   open. Saves nearly the same height, but a glyph is what people said they cannot read, and the *tab
   names never appear* bug stays open.
3. **Leave R5 alone and do nothing.**

The maintainer chose option 1 in discovery. **Lock it here once the device spike in the plan's § 5 W1
passes** (LB/RB still switch tabs with Steam's bar hidden). If the spike fails, the plan stops by the
maintainer's own call and this entry records why. R5's other reason, whether 7px caps survive on a
handheld, is a device check in the plan (**TAB-BAR-07**), not a paper decision.

**Locked 2026-09-02: the spike passed.** With Steam's header wrapper hidden by a hash-free `display: none`
rule, RB ×5 and LB ×5 from inside the body switched every tab and `currentTab` followed each press, both
with no game running and with Half-Life 2 running (the rig launched and exited the game itself);
evidence `runs/TAB-BAR-W1a-no-game.json` and `runs/TAB-BAR-W1a-with-game-2.json`, numbers in
[planning/30-collapsing-tab-bar.md § 8](../planning/30-collapsing-tab-bar.md). The body gained the full
80px (616 → 696px). What the spike also found — Steam's hidden tab button stays a focus stop — is a
separate call, **D55** below.

---

### D45 — LOCKED 2026-09-01 — What counts as a "better answer", and does a run on the PC count as evidence? (yes to both)

Raised by [planning/30-kb-answer-quality-plan.md](../planning/30-kb-answer-quality-plan.md) § 3 Q1.
The search half of the knowledge base is measured to the decimal; what the small model on the
Deck writes from the cards has never been measured. The maintainer's on-Deck run of
`PHASE4-CARDS-01` is the only data point (labels kept 1 of 6, content accurate 6 of 6).

**Locked: yes.** A better answer is one that passes four judge-free checks: (a) it contains the
card's key facts (a short must-mention list per question, copied from the card); (b) it says
nothing the card contradicts (a short must-not-say list); (c) a spoiler fence appears only where
the rules allow; (d) a Strategy first turn ends with the branch menu. The test runs on the
maintainer PC with the Deck's own model tag (`gemma4:e2b-it-qat`, shipped temperature) and its
numbers are the regression gate; the Deck run is for feel.

**What it obliges.** Build `scripts/eval_kb_answers.py` (plan § 4.1) and baseline the current
prompt before changing it. The two prompt trims the maintainer did not object to — dropping the
citation-fence sentence (obeyed 1 time in 89 on device, unrendered by the UI) and sending the
screenshot-reading rules only when an image is attached — ship only with a before/after from this
test. Must-mention lists are written by someone who has read the card; that is fine here because
these are not blind retrieval rows, but the same person must not also write new blind eval rows in
that session.

### D46 — LOCKED 2026-09-01 — The Deck's 4,096-token window: trim what we send, do not raise the window (option: trim)

Measured 2026-09-01: Ollama `0.32.15` on the Deck loads `gemma4:e2b-it-qat` with
`context_length: 4096`, nothing in the plugin sets one
(`ollama_service.py:497-501` sends only `num_predict` and `temperature`), and a troubleshooting
ask may attach 96 KiB of Proton logs (`proton_troubleshooting_logs.py:18`, ~25,000 tokens).
Ollama keeps the end of an overlong prompt and drops the start silently. Not seen in the 161
recorded asks (none attached logs); reachable by construction.

**Locked: trim.** Cap the Proton log excerpt to a size that leaves room for cards and a reply
(~6–8 KB, keeping the newest lines), cap the parent answer pasted into a follow-up-chip message,
and log a warning whenever an estimated prompt plus `num_predict` would not fit the window.
Raising the window with `num_ctx` is **not** done now; it may be tried later as a measured
Developer experiment (VRAM and time-to-first-token with a game running) and needs its own call.

### D47 — LOCKED 2026-09-01 — Follow-ups remember (yes)

The model receives only the system prompt and the newest message (`ollama_ask_service.py:170`);
a typed follow-up such as *"what about the second phase?"* has no entity to search and no idea
what *the* refers to.

**Locked: yes**, in the recommended order: first carry the previous turn's asked entity into
retrieval when the new question names none (cheap, spends no window; transparency notes
`carried_entity:…`); chat history as `messages` only after D46's budget shows how much room there
is, and then trimmed to fit.

### D48 — LOCKED 2026-09-01 — When no card matched a game question, the reply says so (yes)

Today a reply looks the same whether it came from the notes or from the model's memory; only
*Show details* knows. The maintainer's own Deck note (`bonsai-debug-wronginfo.md`, 2026-05-20)
shows what a small model does with no notes: confident, wrong, tidy.

**Locked: yes.** One muted plain line appended by **code, not the model** (same mechanism as the
destructive-advice notice), only on explicit game asks (Strategy / Expert) where the corpus knows
the game but nothing matched (`kb_attached=False` with coverage status `sections`). Not shown
when the KB is off or the game is uncovered — the coverage chip already says that. Wording to be
settled with the maintainer; it costs a line in a 300 px column, and a focus-graph check if it is
a stop.

### D49 — LOCKED 2026-09-01 — Publish the 161-card corpus now (yes)

Both channels served `2026.08.22` (133 cards) on 2026-09-01; the seed holds 161. The 28 cards
added since 2026-08-29 (State of Emergency, the Hades weapons and *Weapon choice*, the Half-Life
2 antlion split, the Cyberpunk / Fallout 4 / Red Dead entity cards, three comparison cards) had
never reached a device. **Locked: publish**, schema stays 3 so the Deck updates in place, and the
Deck installs it before any on-Deck answer testing — otherwise the device tests the wrong corpus
(the 2026-08-21 handoff's lesson). Release record: plan § Checklist W2.

### D50 — LOCKED 2026-09-01 — Spoiler tiers confirmed

Three tiers as the maintainer proposed on the 2026-08-29 gap sheet: **strict** (no bosses,
endings or chapters), **default** (fence only named story beats and endings), **open** (anything
the user asks about). **Confirmed:** the default tier is *"named story beats and endings"*, and
naming a boss or item still unlocks it under **strict** (rule 7 of the spoiler constitution
holds in every tier). Built after D45's test exists, so each tier's prompt wording is measured
against the 8-of-41 low-story misfire set rather than eyeballed. Setting shape: plan § 4.5.

### D51 — LOCKED 2026-09-01 — The eval may hold a second right answer (resolves the eval "D40", which becomes D40b)

The eval "D40 — OPEN (raised 2026-08-31)" below shares its number with the Terse-mode D40 locked
2026-08-29; following the D31 precedent, the eval one is **D40b** from here on. The maintainer
agreed with the recommendation: **option 1** — a row may list a **second** acceptable card, on
`tune` rows and on holdout rows *not yet seen to fail*, and only with a written `note` saying
why the second card is fair; **retire `V2-S-SOE-07`** (no card can answer it, as the maintainer
said on 2026-08-31); **leave `V2-S-SOE-09` alone**; use option 4 (split into two sharper
questions) only where it is obvious. Any number measured after the fixture changes is a new
series (R4).

### D52 — LOCKED 2026-09-01 — Symptom-only troubleshooting questions get a meaning search, only when no topic routed

*"the game drops me back to the library a few minutes in"* never reaches the tip sheet because it
does not say *crash* (2 of the 4 blind compat holdout rows miss; filed 2026-08-28). The maintainer
agreed with the recommendation: **option (b)** — when the topic router matches nothing and the
phrase gate did not fire, run the meaning search over the tip sheet behind the second-signal gate.
The 2026-08-18 measurement that removed a compat vector pass was taken *with* a routed topic and
does not cover this case. Measure on the 17 holdout compat rows first and record the result here.

### D53 — OPEN (raised 2026-09-01) — "Starting out" and comparison cards: a new kind, or leave them as `mechanic`?

> **Resolved by [D65](#d65--locked-2026-09-05--starting-out-and-comparison-cards-get-their-own-kind) on 2026-09-05: their own kind.**

Three such cards exist as `mechanic` (*Choosing a build* ×2, *Weapon choice*, *Coming from
GTA*). The maintainer asked for more explanation before deciding; the explanation is in the
2026-09-01 session and will be copied here with the answer.

### D54 — OPEN (raised 2026-09-01) — Strategy first turn: give the tactic first, then the menu?

> **Resolved by [D66](#d66--locked-2026-09-05--answer-first-then-the-menu-is-tested-both-ways-before-a-decision) on 2026-09-05: test both shapes first, then decide.**

Today a Strategy first turn gives an orientation and a branch menu before tactics, by design.
The maintainer asked for more explanation before deciding; the explanation is in the 2026-09-01
session and will be copied here with the answer.

### D55 — LOCKED 2026-09-03 (option 1, via D57 #8) — Steam's hidden tab buttons stay focus stops: route around them, or stop plan 30?

Plan 30's spike (§ 8 of [planning/30-collapsing-tab-bar.md](../planning/30-collapsing-tab-bar.md))
hid Steam's tab header and then walked the D-pad. LB/RB kept working (that was the gate, and it
passed). But the **active tab's hidden button is still a focus stop**: from a fresh open, Down lands
on Decky's Back button, then on the invisible tab button, then on the body; Up from the top of a tab
lands on the same invisible button; a free-play sweep of Settings recorded it twice and nothing else
hidden. It behaves identically under `display: none` and under `height: 0; visibility: hidden`, so it
is Steam's navigation tree — built from mounted `Focusable`s, not from layout — and no CSS removes it.
The plan's risk table (§ 7) said: switch the property, and if both leave ghosts, stop.

Options:

1. **Route around it (recommended, and what W4 builds).** Our bar's Down does not return `false`
   to Steam; it moves the ring itself to the current tab's first stop through `navFocusRegistry`,
   and each tab's first stop moves Up to the bar the same way. One `Focusable` wrapper per tab body
   in `index.tsx`'s tab list carries the `navRef`, so it is six registrations from one place, the
   same hop the chat-slot row already uses. Add a small focus trap on the hidden header: if Steam
   ever lands the ring on a hidden tab button by any other path (B from inside a body does exactly
   that today), bounce it to our bar. Cost: one wrapper, one observer, and TAB-BAR-05 must show
   zero focused-but-not-visible stops on every tab. Risk: the trap and the hops are ours to keep
   working across Steam updates; the fail-safe stays — if the hiding rule ever stops matching,
   Steam's strip reappears and the trap has nothing to catch.
2. **Stop plan 30 here**, as § 7 literally says. Keeps Steam's strip and its 85px. The names bug
   and the vertical-space item stay open.
3. **Hide the header but leave the ghost**, shipping W3 only (the thin bar, no focus stop). Reclaims
   the 80px at once; the ghost is one invisible Down between Decky's Back button and the body, and
   Up from the top of a tab stops on it once. This is the "focused but not visible" bug class the
   maintainer named on 2026-08-31, so it is listed only to be rejected.

Built under option 1 from W4 on because the maintainer said "keep going" and option 1 is the plan's
own § 4.5 fallback, applied in both directions. If the answer is 2, W2–W3 are harmless on their own
and W4+ is reverted.

**Locked 2026-09-03 on option 1** (D57 #8, the maintainer answered "ok" to the recommendation):
TAB-BAR-01 to 06 pass under it on the device, so the hops and the trap stay. Reopen only if a Steam
update breaks the hiding rule or the trap.

### D56 — LOCKED 2026-09-02 (a corrected assumption, no maintainer input needed) — The collapsing tab bar's Left/Right wrap at the ends, because LB/RB do

Plan 30's discovery notes assumed *"Left at the first tab and Right at the last do nothing, matching
LB and RB."* Measured after W3 on the device (`runs/TAB-BAR-W3-shoulder-wrap.json`): **LB on Main
goes to About and RB on About goes to Main.** Steam's `Tabs` defaults `wrapAround` to true and
bonsAI never set it. So the half of the assumption about LB/RB was wrong, and the plan's own rule
("matching LB and RB") decides the rest: the bar's Left, Right, LB and RB wrap the same way
(`tabBarNav.ts`), measured passing in `runs/TAB-BAR-03-switch-on-the-bar.json`. The alternative —
passing `wrapAround: false` to Steam so the bumpers stop at the ends — changes existing behaviour
for every user and was not what anyone asked for. Reopen here if the wrap turns out to be a nuisance.

### D57 — LOCKED 2026-09-03 (raised 2026-09-02) — The Deck verification round: nine calls before "go"

[Plan 31](../planning/31-deck-verification-round.md) sorts every roadmap **Verify** row by what it needs
from the device and puts them in a run order. Nothing in the code blocks the round. Checked over SSH on
2026-09-02 at 23:42, without pressing a button: the Deck already runs this checkout (`main.py` and
`dist/index.js` are byte-identical to the local build of 19:15, which post-dates the last code commit
`cc110fb`), passwordless sudo works, the thinking model `qwen3.5:4b`, the embed model `nomic-embed-text`
and corpus `2026.09.01` are installed, the voice engine binaries are present, and the knowledge base is
on. What blocks the round is nine things only the maintainer can decide. Answer by number in chat; the
answers get copied here.

1. **The window.** Every row that touches the screen or the buttons runs one at a time: one device, one
   focus ring, one bridge with no lock, and Steam's state (running game, settings, Ask mode) is global.
   The other chat's DPS session has to stop for the whole block, or its presses corrupt the runs
   (measured 2026-09-02, see the *one driver at a time* note). Proposed: two evening blocks (Session 1
   with no game running, Session 2 with games) and about twenty minutes with you at the Deck for
   Session 3. No deploy is needed unless code lands first; a deploy restarts Decky Loader.
2. **Frozen chips.** Standing rule: you confirm the sentences before anything is pinned. Plan 31 § 4
   lists two batches (11 and 12 sentences). The batch on the Deck right now has ten entries: the five
   KB-ANSWER-02 sentences (kept, they are in batch 1) and five that no testing row names —
   *"explain in detail how proton runs windows games on linux"*, *"name one deck tip"*, *"say hello"*,
   *"name one proton tip"*, *"name one battery tip"*. Options: (a) drop those five and pin batch 1 as
   written (recommended); (b) keep them, which leaves two free slots, so each batch goes in over several
   re-pins with a panel close between.
3. **Launching games from the PC.** Session 2 needs six titles running in turn. The KB-COVERAGE-NOAPP-01
   row says "the plan forbids launching a game by automation"; where that rule comes from is UNKNOWN
   (no plan file says it), and another session launched Half-Life 2 through the bridge on 2026-09-02.
   Options: (a) the rig launches and exits games itself (`deck_launchGame` / `deck_exitGame`), so you are
   not needed until Session 3 (recommended); (b) you launch each title when asked in chat. Either way,
   one UNKNOWN to settle: how Ocarina of Time runs on this Deck. It is not a Steam install, and
   STRAT-ENTITY-01's two King Dodongo sentences need it running; the Raphael sentence uses Baldur's
   Gate 3, which is on the card.
4. **Clear all plugin data.** Three owed checks need a real clear: VOICE-CLEAR-01's UI half,
   TAB-RESUME-01's "next open is Main", and SHELL-PAYLOAD-01's Ollama tab after a clear. Per the
   VOICE-CLEAR-01 row it wipes the real settings and the model records. Options: (a) yes, as the very
   last step of the last session, after copying `settings.json`, `chat_slots` and `chat_threads` aside
   over SSH and restoring them afterwards (recommended; a `settings.json.bak-preQA` from an earlier
   round already sits next to the live file); (b) skip those three sub-checks this round.
5. **A model pull for ROUTING-MERGE-01.** The row needs a custom setup profile that pulls a model — for
   example `qwen2.5vl:3b`, about 3 GB — and then checks the try-order picker and the vision list. It is
   the only row that adds files to the device. Options: (a) allow the pull; (b) defer the row
   (recommended unless you want that model anyway).
6. **SMOKE-B.** It tests TDP apply, removed 2026-07-30, and the *Deferred manual QA* entry still lists it
   under Tier 1. Options: (a) retire it and drop it from Tier 1 (recommended); (b) rewrite it as a
   suggestion-only banner check.
7. **Scope.** Options: (a) the roadmap Verify rows plus the three re-runs the tab bar asked for
   (DOC-SWEEP-01, CHAT-SLOTS-V3-01, TAB-SWITCH-01) (recommended); (b) also the *Open regression IDs*
   list in testing-manual.md — about twenty-five more rows, the DRG spoiler set among them — as a
   stretch if time remains.
8. **Two product calls that sit inside Verify entries.** Neither blocks the run; both block moving the
   entry to Done. **D55** (Steam's hidden tab buttons; built under option 1, and TAB-BAR-01 to 06 pass
   under it): lock option 1, or not. **CHAT-SLOTS-V3-14c** (the game's name above the chat title): show
   it always, or only while the row has focus. Recommendation: lock D55 on option 1; show the name only
   on focus, because the roadmap entry itself says the line costs height that the vertical-space goal
   wants back.
9. **Your hands.** Which of the in-person rows happen in Session 3 and which stay open: TAB-BAR-07
   (eyes), TAB-BAR-08 (touch), STREAM-FOLLOW-01's touch half, PRESET-ONE-LINE-04's speed-by-eye and
   reduced-motion halves, ASK-WIDTH-01 and BONSAI-ICON-GEOM-01 by eye (the rig measures and takes the
   PNG first), KB-ANSWER-02's feel run, CHAT-SLOTS-V3-15d's glance, the *Update knowledge base* thumb
   press from the Bugs list, KIDS-LOCK-01 (Family View PIN on a spare adult account, then the rig runs
   KIDS-FOCUS-01), KIDS-LOCK-02 (a child account; the row already allows it to stay Open), VAC-03 to 06
   (you type the Steam Web API key, the rig drives the rest), and the quick-launch macro (Steam Input,
   never run on hardware). Recommendation: schedule all of them except KIDS-LOCK-02 and the macro.

**Answers, 2026-09-03, all nine locked** (the maintainer answered by number in chat):

1. The window is open now; the other chat is done. The rig runs unattended for a few hours and the
   maintainer checks back on progress in chat.
2. Go: the five unnamed chips are dropped and the batches are pinned as written in plan 31 § 4.
3. The rig launches and exits games. Ocarina of Time runs as **Ship of Harkinian**, a non-Steam
   shortcut (`soh.appimage`, shortcut app id `2593781457`), and runs well. `deck_launchGame` needs it
   on the Recent Games shelf; if it is not there, those sentences wait for the maintainer to play it
   once.
4. Yes: Clear all plugin data runs as its own last phase, after a copy of settings and chats is taken
   aside (done 2026-09-03 00:48: `settings.json.bak-round31` and `~/bonsai-round31-chats.tgz`); the
   rig waits for the words "clear it" in chat before running it.
5. Left to the rig's judgment. Deferred: disk is not the problem (735 GB free under `/home`), but the
   row needs a custom setup profile driven through the UI and is the only row that adds files to the
   device; it runs only if the Verify rows finish with time left.
6. SMOKE-B is retired and comes off Tier 1.
7. Scope is the Verify rows plus the three tab-bar re-runs; the wider regression list only if time
   remains.
8. D55 locked on option 1. CHAT-SLOTS-V3-14c: the game's name above the chat title shows only while
   the row has focus. That is a code change now owed; the entry stays in Verify until it ships and
   passes on the device, and this round only confirms the name is stored and shown for a chat created
   while a game runs.
9. The in-person list is plan 31 § 7, written in plain terms with what is needed and when. The rig
   never ticks those boxes; only the maintainer clears an item, after seeing it themselves.

### D58 — LOCKED 2026-09-04 (raised 2026-09-04) — The bug-fixing session: nine calls before "go"

[Plan 32](../archive/32-bugfix-session.md) sorts the roadmap's twenty Bugs entries into thirteen to fix
now, two that need a call, two that are research for another conversation, and three that are
bookkeeping. It puts the thirteen into five lanes that run at once and one serial Deck phase. Nothing
in the code blocks it. Checked read-only on 2026-09-04: the Deck already runs this checkout (hashes
match), the rig is armed and the board is on `COM7`, no frozen batch is pinned, tests are green here,
and the focus linter is red on a clean tree with three findings newer than its baseline. What blocks
the session is nine things only the maintainer can decide. Answer by number in chat; the answers get
copied here.

1. **Scope.** (a) all thirteen fixable entries in plan 32 § 2a (recommended); (b) the nine `[focus]`
   entries only, leaving the two chip entries, the arms report and the overlay for another day.
2. **Up from the preset chips.** Today one Up press steps back one chip through the carousel history
   and can take five presses to leave the row. (a) Up leaves the row at once, Left keeps walking the
   history (recommended); (b) keep it as it is and close the entry as accepted.
3. **A frozen batch longer than the row.** (a) Right at the last visible chip pulls the next batch
   entry in, and an Ask restarts the sixty-second walk (recommended: it fixes both ways the batch
   got stuck on 2026-09-03); (b) only the Ask restarts the walk; (c) only the edge advances.
4. **Streaming in bursts with a game running.** Measured 2026-08-28: the overlay drops to 47 fps only
   during a burst and is flat 60 otherwise; the game's own frame rate is unmeasured. (a) accept it and
   move the entry to ACCEPTED (recommended: it is a nice-to-have by the earlier call, and it does not
   gate anything this session); (b) keep it open until the game-side frames are measured with the
   maintainer's FPS overlay.
5. **Focus ring styling, PARTIAL.** (a) skip this session (recommended); (b) include a small pass.
6. **The focus linter's three new findings.** (a) the orchestrator triages each in Phase 0: fix what
   is a real defect, baseline what is deliberate with a one-line reason in the commit, and file a
   Bugs entry for anything real that is not a one-line fix (recommended); (b) baseline all three now
   and look later; (c) leave the linter red and skip it as a gate.
7. **Models.** (a) Fable at max as the orchestrator and Sonnet 5 at high effort in all five lanes
   (recommended; the two subtle fixes are decided by device measurement, not by the model); (b) Opus
   for lanes A and D, Sonnet elsewhere.
8. **The Deck window.** The session needs the device for two short blocks: about half an hour of
   measurements early on, then about two hours of verification after the fixes land, with one deploy
   in between that restarts Decky Loader. Every other chat has to stay off the buttons for both
   blocks, and the maintainer should not be playing on it. (a) the window is open now and the rig
   may also carry on into plan 31 § 5 step 6 afterwards if time remains (recommended); (b) the two
   bug blocks only, plan 31 waits; (c) not tonight.
9. **The unfiled sixth bug from session 1** — a deterministic command reply (`bonsai:vac-check`)
   leaves the turn header reading `…` and the chat titled *New chat*. (a) file it in Phase 0 and let
   lane A try it only after its own two bugs, stopping if the cause takes more than an hour to find
   (recommended); (b) file it and leave it; (c) do not file it.

**Answers, 2026-09-04, all nine locked** (the maintainer answered by number in chat; #2 after a mockup):

1. All thirteen.
2. (a): Up leaves the row at once; Left keeps walking the history. Answered 2026-09-04 at 18:50 after
   an interactive mockup. The maintainer also asked for a visible end-of-row cue, filed as a Features entry.
3. The recommendation: Right at the last visible chip pulls the next batch entry in, and an Ask restarts
   the sixty-second walk.
4. Accepted. The entry is marked **ACCEPTED 2026-09-04** and stays in Bugs under that word; the
   STREAM-11 row says so.
5. Skipped this session.
6. Yes: the orchestrator triages the three findings in Phase 0. Outcome: all three are deliberate and are
   baselined, each with a written reason in the commit and in plan 32 § 10.
7. Sonnet 5 at high effort in every lane.
8. Yes, when the device is free. Another chat is driving the Deck for several hours from about 17:00, so
   the desk half runs now and the Deck half waits. The rig watches the `runs/` folder and the tunnel
   registry; after thirty quiet minutes it announces in chat and proceeds ten minutes later unless told
   to wait. It may carry on into plan 31's remaining rows afterwards.
9. Yes: filed in Phase 0 as a ★★ `[chat]` entry; lane A may try it after its own two bugs, one hour cap.

### D59 — LOCKED 2026-09-05 (raised 2026-09-05) — Model and effort routing: adopt plan 33 § 2 as policy?

The measured cost and outcome record is in [docs/planning/33-model-routing.md](../planning/33-model-routing.md).
Five calls, answer by number:

1. **The routing table (plan 33 § 2).** (a) adopt as written (recommended); (b) edit rows first, say which.
2. **Orchestrator for bug-fixing sessions.** (a) Opus 5 at xhigh (recommended: it reviews diffs, resolves docs
   conflicts and drives the Deck, and Fable max was more than half the 09-04 session's cost); (b) keep Fable 5.1 max.
3. **What lanes may edit.** (a) code, tests and a one-paragraph report only; the orchestrator moves roadmap,
   testing and changelog rows in one commit per landing (recommended); (b) keep plan 32's split where lanes move
   their own rows.
4. **Haiku 4.5.** (a) try it for read-only lookups with a checkable answer in the next lane session
   (recommended, it is nearly free); (b) leave it out of this project.
5. **Where the policy lives once locked.** (a) copy the table into AGENTS.md and link plan 33 for the evidence
   (recommended); (b) keep it in plan 33 and link from AGENTS.md.

**Answers, 2026-09-05** (the maintainer in chat: "sounds good on the refactoring and subagents, add that";
"go ahead and write the AGENTS.md file"): 1 (a), 2 (a), 3 (a), 5 (a). The table and rules are in
AGENTS.md § 3; the roadmap carries a six-line rough guide. **4 (a), locked later the same day with a
condition:** Haiku 4.5 is on trial for read-only lookups, every use logged in plan 33 § 4a and grep-confirmed;
if Sonnet or Opus has to step in more than twice in ten uses, it is dropped.

### D60 — LOCKED 2026-09-05 (raised 2026-09-05) — The question bubble: how much of your question shows, and how you know there is more

Raised by the maintainer in chat: *"the users question in the chat bubble gets truncated immediately after an
ask. I think the whole prompt should be there, only collapse it when looking at earlier turns."*

What the bubble does today, before any change: the question is cut twice. The code chops it at 60 letters,
then the one-line rule chops it again at whatever fits the bubble — about 48 letters at this size — so the
second cut nearly always wins and the 60-letter one is never seen. The same cut applies to the turn you just
asked as to a turn from an hour ago; nothing looks at whether the turn is open. Pressing A on the bubble
already opens and closes the answer, so A was not free.

Four calls, answered in chat the same day:

1. **The A button clash.** (a) tie the whole question to the turn being open, so A already does both
   (recommended); (b) give the question its own open and close, which adds a D-pad stop to every turn and
   pushes against the "fewer stops on a reply" item.
2. **How much of a long question shows when the turn is open.** (a) all of it; (b) a cap, and if so what.
3. **What the cue looks like when the ring lands on a cut question.** Four options were drawn against the
   plugin's real colours and column: (A) the text fades out at the right-hand edge instead of ending in three
   dots; (B) a small arrow slides in on the left; (C) the three dots brighten and breathe; (D) a hairline
   appears under the text.
4. **Does the cue show for a finger too?** (a) ring only; (b) both.

**Answers, 2026-09-05:** 1 (a). 2 — **a cap of five lines**, with the last line fading out. 3 — **option A**,
after a correction: A and C were first recommended together, and the maintainer spotted from the drawing that
only one effect was visible. Both cues live in the same few pixels at the bubble's right edge, and the fade
goes fully see-through there, so it rubbed the dots out. A on its own is the only option that adds nothing and
shifts nothing. 4 (a), ring only.

The drawings are kept at [docs/demos/question-bubble-cue-mockups.html](../demos/question-bubble-cue-mockups.html) —
open it in a browser. It carries the four options, the wrong pairing, and two pairings that do work, so nobody
has to re-draw them to understand why A won.

**Two notes for whoever builds this.** The fade wanted here already exists in the stylesheet, written for
cut-off answer bubbles and currently used by nothing; the one in there starts halfway down and would wash out
three of the five lines, so it needs pulling back. And **one check is owed before the cue is built**: the
question bubble switches its own outline off and is not on the list of controls that get the plugin's ring, so
what it actually shows when focused has to be looked at on the Deck. Every version of this cue is triggered by
focus.

Both halves are on the roadmap as two-star chat entries — the cut question under Bugs, the cue under Features.

---

### D61 — LOCKED 2026-09-05 (raised 2026-09-05) — The feature verification round: what is in scope, and what waits

Raised at the start of the round planned in
[planning/34-feature-verification-round.md](../planning/34-feature-verification-round.md). The Verify list
had 23 entries owing a device check and the round needed its edges drawn before anything was pressed.

**Answers, 2026-09-05, all eight locked** (the maintainer answered in chat):

1. **Start shape.** Desk work begins immediately; the device work waits for the maintainer's word. The
   other chat finished the same evening and handed the device over.
2. **The in-person block runs last**, as plan 31 § 7 has it — not first, even though the rig has now
   measured most of those items.
3. **Gated items.** A model pull is in scope. Clear all plugin data is in scope but **runs in the
   morning**, not overnight: the maintainer declined to authorise a destructive step in advance while
   asleep. The Family View PIN and the Steam Web API key are **out of scope** this round, so the kids
   lock and the ban lookup entries stay in Verify.
4. **On a failure: file it and carry on.** Write the bug into the roadmap with the evidence named and move
   to the next check. No fixes during the round.
5. **Length: one long overnight run.**
6. **The chat-slot game name stays in Verify and is not checked.** D57 #8 decided the name should show
   only while the row has focus; that code was never written, so the entry is waiting on code, not on the
   device.
7. **Scope: the Verify list, plus a free walk of every screen** — every stop reachable and every stop
   visible. Wider than D57 #7, which kept to the Verify rows alone.
8. **Deploy first.** The device was running a build from before the two colour fixes; verifying an old
   build risks passing something since changed and failing something already fixed.

**Consequence worth recording.** Three entries cannot close overnight because they all depend on the data
clear: the voice fixes, the shell and tab payload extraction, and the reopen half of the cache-clear
entry. They close in the morning in one short block.

### D62 — LOCKED 2026-09-05 (raised 2026-09-05) — The second bug-fixing session: four calls before "go"

Raised at the start of the session planned in
[planning/35-bugfix-session.md](../planning/35-bugfix-session.md). Seventeen entries sat in the bug list;
five of them were already settled one way or another, and the rest needed their edges drawn before any
code was written.

**Answers, 2026-09-05, all four locked** (the maintainer answered in chat):

1. **Scope: all eleven fixable bugs.** The stuck panel, nothing highlighted when the panel opens, the
   answer paragraph hidden behind the question box, the trapped unrevealed spoiler block, the branch
   picker leaking between chats, the question cut off after 48 letters, the missing *Stopped* notice, the
   wrong "no active game" line, the three dots where a game name belongs, Speed paying for the slow
   search, and the search that got a fifth slower. **Out:** the ring-styling design call (skipped once
   already under D58 #5), the router that needs a topic word, and the retrieval blend deferred under D38 —
   all three are decisions and measurements, not fixes, and each wants its own conversation.
2. **Speed mode does the quick keyword lookup and nothing else**, which is what its test row has always
   said. Takes about a second off every Speed question on the device. The trade the maintainer accepted:
   a Speed answer loses the cards that only the meaning search finds — the ones whose wording does not
   match the question. Strategy and Expert are untouched. If Speed answers get visibly worse, the fallback
   already sketched is to run the meaning search only when the keyword hits are thin, which is a threshold
   somebody has to pick and measure.
3. **Both paired features are in.** The fade on a cut question (chosen 2026-09-05 under D60, and nearly
   free alongside the cut-question fix, same file, the fade already unused in the stylesheet), **and** the
   glow at the end of the chip row. **Worth recording about the second one:** it is motion, so no
   measurement closes it — it ends on the maintainer's own checklist as a picture or a recording to judge,
   not in the done list.
4. **Wiping all plugin data is authorised, with a message first.** The session sends word right before
   pressing it and waits. **If no reply comes before the run ends, the wipe does not happen** — three
   entries stay open rather than a destructive step going ahead unanswered. Backups were taken in round
   34 block 0 and are still beside the settings file and in the home directory; they are restored
   immediately afterwards and read back off disk to prove it.

**Consequence worth recording.** Two of the eleven — the stuck panel and the unhighlighted open — have no
measured cause yet, so the routing policy keeps them off a helper lane. The session's own driver takes
them, after a device measurement, and if that measurement does not name a cause they are written up with
their numbers rather than guessed at.

### D63 — LOCKED 2026-09-05 (raised 2026-09-05) — The answer's first lines in the toast: six calls before "go"

Raised while planning [planning/38-toast-answer-lines.md](../planning/38-toast-answer-lines.md), the first of
the six features the maintainer picked on 2026-09-05. Today, when an answer finishes while the menu is
closed, a small notification says *Reply ready* and *Tap to open*. The plan changes its words so it carries
the question and the first lines of the answer, and a short answer can be read without leaving the game.

**Before any of these matter:** nobody has recorded that notification showing over a running game. Its five
test rows were archived unchecked on 2026-07-30. The plan's first step is a measurement on the Deck of
whether it shows, where, and how much text fits. If it does not show, the entry is blocked and none of the
calls below are needed.

1. **Which answers get the preview?**
   - Option 1 (recommended): Speed and Expert. Strategy keeps today's notification, because Strategy
     answers are built around menus and hidden spoilers that a notification cannot show safely.
   - Option 2: every mode, with the hidden-block rule as the only guard.
   - Option 3: Speed only.
2. **What does the title say?**
   - Option 1 (recommended): your question, cut to fit. *Reply ready* says nothing once the body holds
     the answer.
   - Option 2: *Reply ready*, as today.
3. **How long does it stay on screen?**
   - Option 1 (recommended): eight seconds, enough to read two lines.
   - Option 2: today's four seconds.
   - Option 3: Steam's own default.
4. **A setting to turn the preview off, or always on?**
   - Option 1 (recommended): always on in v1. The notification already shows over the game today; only
     its words change. A setting costs about eighteen files and a Settings row, and can be added later
     without undoing anything.
   - Option 2: a setting now. The case for it: anyone looking at the screen reads the answer, so a person
     streaming or playing on a shared TV may want it quiet.
5. **An extra guard for story games?** The code already knows which games are story-heavy.
   - Option 1 (recommended): not in v1. Speed answers on story games rarely spoil, and the guard would
     hide the preview on the games where a quick answer is most wanted. Revisit if a leak is ever seen.
   - Option 2: withhold the preview on story games unless the question named the thing it asks about.
6. **Where does this sit in the Deck queue?** The bug session holds the Deck; the feature session is next.
   - Option 1 (recommended): third, after both.
   - Option 2: ask the feature session to fold the three measurements into its own Deck block.
   - Option 3: the maintainer runs the first measurement by eye and reports what they see.

**Consequence if unanswered.** Nothing is built until 1 to 3 are answered. 4 to 6 have defaults that
hold: always on, no story-game guard, third in the queue. Whatever the hidden-block rule decides, a
notification that would have shown a hidden spoiler shows today's words instead; withholding is the safe
direction and every doubt resolves to it.

**Answers, 2026-09-05 (the maintainer answered in chat):**

1. **Every mode, best effort.** Hidden blocks, branch menus and checklists are left out of the preview and the
   first lines of what remains are shown; if nothing safe remains, today's notification shows.
2. **The title: pick from mockups drawn on the real shape.** Published the same day:
   [Reply Toast Options](https://claude.ai/code/artifact/0590a00d-d48b-42ce-85be-0376c1bddf53). Five options in the two-slot
   shape Decky really draws, with a table of what is known from the code against what is assumed until
   measured. **Picked later the same day: *bonsAI*, "for now".**
3. **Time on screen: eight seconds**, picked from the slider on that page.

   **Added the same day:** the maintainer expects Steam's popup to give less room than the mockup assumes.
   The measurement in the plan is therefore required before any build and runs on two screens with
   screenshots: the Deck's own screen, and a 24-inch 1080p monitor with the Deck docked.
4. **No setting for now.** Always on.
5. **No story-game guard for now.**
6. **Not queued for the Deck.** The entry stays in the roadmap, ready to implement later; the measurement runs
   first when it is picked up.

**Consequence worth recording.** With every mode treated alike, the toast no longer needs to know the Ask
mode, so the backend change the plan had as its first step is gone; the whole feature is frontend text work
on files no session owns today.

### D64 — LOCKED 2026-09-05 (raised 2026-09-05) — The connection doctor and the health report: seven calls before "go"

Raised while planning [planning/39-connection-doctor.md](../planning/39-connection-doctor.md), the second of
the six features the maintainer picked on 2026-09-05. Today a failed Ask shows an error line and a
notification, and nothing else: no button, no next step. The plan adds a **Fix this** button that runs the
checks the plugin already has, shows the one that failed, and offers the one thing to do next with a button
that lands you on that control. Two roadmap entries share these checks, the four-star **Connection doctor**
and the five-star **Deck health snapshot**; the earlier feature review said not to build two check stacks.

1. **One feature or two?**
   - Option 1 (recommended): one. The doctor, with **Save a report** inside it, which is the snapshot's whole
     job. The five-star entry retires into the four-star one.
   - Option 2: keep both entries and build them separately.
2. **Where does Fix this live?**
   - Option 1 (recommended): under the failed reply; a tap on the *Ask failed* notification lands there too;
     and **Check my setup** on the Ollama tab, so it can run without a failure first.
   - Option 2: the Ollama tab only.
3. **Does the doctor act, or only offer?**
   - Option 1 (recommended): it only offers, one press per action. The single exception already exists: the
     connection test starts the on-Deck runtime by itself. Nothing else changes a setting without a press.
   - Option 2: let it fill in a network address it found, and start the runtime, on its own.
4. **A typed command for the report?**
   - Option 1 (recommended): yes, the same shape as the VAC check; needs no model.
   - Option 2: the button only.
5. **What goes in the report?**
   - Option 1 (recommended): plugin version and build; the Deck's network address; where the AI runs and what
     the checks found, with the host's version, installed and loaded models; the on-Deck install's phase; every
     permission's state; knowledge base installed and version; voice engine ready or not; the settings with
     secret-looking values removed; the last Ask's routing details and time taken, and the length of the last
     question rather than its words; the last two hundred lines of the plugin log. Read-only throughout.
   - Option 2: the same without the log tail.
   - Option 3: the same with the last question's words included.
6. **Consent to break the Deck's setup for the checks.** The rows need a wrong address, the on-Deck runtime
   stopped, a missing model first in the try order, and the file-write permission off, each restored and read
   back off disk afterwards.
   - Option 1 (recommended): yes, when the Deck is free and nobody is playing on it.
   - Option 2: the maintainer runs those rows.
7. **Stars.**
   - Option 1 (recommended): the merged entry stays at four; the report is small once the checks exist.
   - Option 2: five, keeping the snapshot's weight.

**Consequence if unanswered.** Nothing is built until 1 to 3 are answered. 4 to 7 have defaults that hold:
typed command yes, the full report, consent asked for again at the time, four stars.

### D65 — LOCKED 2026-09-05 — "Starting out" and comparison cards get their own kind

Resolves D53. The maintainer chose **their own kind** (working name `guide`) over leaving them
filed as mechanics.

**What a person notices.** A new player gets a chip that says *"How do I get started in Fallout
4?"* or *"Which weapon should I start with in Hades?"* instead of *"What should I know about
Choosing a build?"*. A game with such a card always offers one of them, because the chip pool draws
one kind at a time. And *"where do I start"* pulls the guide card into the search the way *"the
boss"* pulls a boss card.

**What it costs.** One value added to the allowed kinds (seed validator, the Python and TypeScript
kind lists), one chip wording, one short rescue phrase list, a corpus rebuild. No format-version
bump, because the column is free text. Then the three cards the maintainer asked for on the
2026-08-29 gap sheet: Cyberpunk 2077 and Fallout 4 builds / early game, Red Dead *Coming from GTA*
(the three that exist as mechanics are re-typed, not rewritten). Rides the next bundled corpus
release (roadmap, Knowledge base and RAG § Next).

### D66 — LOCKED 2026-09-05 — Answer first, then the menu, is tested both ways before a decision

Resolves D54. The maintainer asked to **test both shapes and see which is better**, with examples
and the trade-offs written down, and for anything that needs the Deck to be logged as a test to run
before deciding. So this is a measured experiment, not a change.

**The question.** When a Strategy first turn names a thing and its card matched — *"how do I beat
the twins"* with the Dreadnought Twins card attached — should the reply answer straight from the
card and then show the menu, instead of an orientation and then the menu?

**Example A — what ships today.** A real reply from the answer test on the PC (the Deck's own
model, corpus `2026.09.01`, 2026-09-02), then the branch menu:

> Reviewing the strategy for the Dreadnought Twins. The key here is splitting the fire evenly, so
> you don't burn one down too fast while the other heals the gap. The healing mechanic never
> starts, so focus on managing the damage output between them.
>
> *Where are you at with the Twins?* — two to four choices, wording varies run to run.

The two facts the card holds did reach this reply, in three sentences. On the Deck the same shape
sometimes comes back as bullets (the 2026-08-22 run kept *Weak points / Phases / Tips* on this
question) and sometimes as prose.

**Example B — what "answer first" aims for.** Written by hand from the card to show the target,
not model output:

> **Dreadnought Twins:** two smaller Dreadnoughts at once. The Lacerator chases and leaps; the
> Arbalest hangs back firing fireball spreads.
> - **Weak point:** neither is as tough as a full Dreadnought on its own.
> - **Watch for:** if their health bars drift apart, both turn immune while they heal the gap closed.
> - **Do this:** split your fire evenly rather than burning one down, and the healing never starts.
>
> *Where are you at with the Twins?* — the same menu, unchanged.

**For A (today).** Short. The menu narrows to your situation before the reply commits to tactics.
Nothing is revealed beyond what is needed to branch, which is the safer default on story games.
The small model already gets the card's facts in on this shape 92 times in 100 on the PC test.
Fewer lines on a 300-pixel column before the menu.

**Against A.** On a direct question with a matching card, the tactic can be thin — one or two
sentences — and the full card only arrives after a branch pick, which is one more press and
another twenty seconds on the Deck. The model spends its best tokens on the orientation.

**For B (answer first).** A direct question gets a direct answer in one turn, with the card's facts
laid out. Fewer presses. The named thing was asked for, so the spoiler rules already leave it
unfenced.

**Against B.** A longer first reply, so more scrolling before the menu on the Deck. A two-billion
parameter model given one more condition sometimes gets both cases worse — answering first on a
vague question too, or dropping the menu. If a card holds a story beat, more of it reaches the
screen in one go.

**The test, in two halves.**

1. **PC first, no Deck needed.** Add an "answer first" prompt variant to the answer test (it has a
   variant switch built for this) and run the cases that name a thing with a card — about twenty
   of the thirty-seven — twice each way. Compare facts kept, menu present, fence misfires, and reply
   length. A difference under five points is noise on this fixture. About a day.
2. **Deck, for feel — logged as a test to run before deciding.** Three sentences the maintainer
   confirms, pinned as test chips, asked once in each shape (a Developer toggle or two builds), with
   the character voice on as they actually use it. The maintainer reads both and says which reads
   better. Row **KB-ANSWER-03** in testing.md.

Decision after both halves. Until then the shipped shape stays.

### D67 — LOCKED 2026-09-05 — Structured cards: accept prose

Closes the call left open by **PHASE4-CARDS-01** since 2026-08-22. With the Deck's small model the
facts from the labelled cards survive on 6 of 6 questions, the bullets on 4 of 6, and the card's own
labels (*Summary / Weak points / Uses / Phases / Tips*) on 1 of 6. The maintainer chose **accept
prose**: the facts are what matter, the answer test now catches any drop in them, and neither a
stronger prompt nor a larger routed model is worth its cost for label names. The row closes. The
labelled card shape stays in the corpus (it costs nothing and the model never invents labels for
prose cards), and the card style pass in the roadmap stays gated on the answer test showing it
helps.

### D68 — LOCKED 2026-09-05 (raised the same day) — The blend weights: run the sweep now, and decide from it

D38 was deferred on 2026-08-29 for "more data, more games, more questions". The maintainer asked
for a recommendation on 2026-09-05.

**Where it stands.** On questions written without seeing the cards, the meaning search alone puts
the right card first **63 times in 100**; what ships manages **54**. Three separate runs since
2026-08-29 show the same direction. The tuning set, which had no blind questions at all when the
gap was found, now holds 51 of them.

**Recommendation: option A from D38, without waiting for new games.** Build the weight sweep (one
to two days, already in the roadmap's eval-tooling entry), run it on the tuning questions only —
the split it is legal to tune against — and let it say whether leaning toward the meaning search
looks better there too. If it does, spend the one confirmation run on the blind set and change the
weights: a one-line change that would land the right card first about nine points more often on
realistic questions. If the tuning questions still say equal is best, stop and wait for the new
titles (D69). Never tune against the blind set itself.

**Why not wait for more games first.** Half the data the deferral asked for already exists (the
blind rows in the tuning set), the sweep is cheap, and it settles whether the gap is real without
touching what ships. New titles then add data either way.

**Locked 2026-09-05: the maintainer said yes.** Build the sweep, run it on the tuning questions only, confirm once on
the blind set if it agrees, then change the weights. Recorded on the roadmap under the eval-tooling entry.

### D69 — LOCKED 2026-09-05 (titles picked the same day) — A first tranche of new titles before the catalog

Phase 5's lock (2026-07-30) says no new titles until the catalog phase. The weights call above
wants more games, and coverage is the biggest limit on answer quality for a real person: thirteen
games have notes, every other game gets the model's memory plus one generic genre card.

**Recommendation: yes, five to ten titles chosen by the maintainer, as a one-off tranche.** Pick
games they play (so they can judge the cards), that have a wiki under a usable licence, and that
are popular on the Deck. Author each title's cards in one session and its blind test questions in
a different one, as the corpus rules already require. The catalog stays Phase 8; this only reopens
the "no new titles" rule for the tranche.

**Cost.** About a day per title for a first pass of six to ten cards with credit lines, plus one
corpus release. **Buys:** notes for five to ten more games, more variety in the eval, and the data
D68 may still want.

**Locked 2026-09-05: yes, and the titles come from the maintainer's own Steam library.** Their instruction: read the
library from the Deck (walk the screen with the plugin-studio rig and the controller bridge), pull examples from it, and
find which of those games have the best wikis we can use. **Not yet** — two other chats are steering the Deck first; the
maintainer will say when it frees up. The method, the wiki checklist and the games already known to be on the Deck are in
[planning/40-new-titles-from-the-library.md](../archive/40-new-titles-from-the-library.md). The title list itself is
recorded there when the read is done, and the maintainer picks from it.

**Read done 2026-09-05 over SSH (files only, no screen):** 90 Steam games with playtime, 121 non-Steam shortcuts (108
emulated). Every candidate's wiki was checked for licence and an archive dump; the table is plan 40 § 5. **Black Mesa is
confirmed by the maintainer as the first title.** Recommended with it: Hollow Knight, Grand Theft Auto V, Grand Theft
Auto IV, DOOM Eternal (Doom 64 rides along), Palworld, a Mario pack (Super Mario 64, Mario Kart 64, Paper Mario TTYD),
Devil May Cry 3; options Melee, Sifu, Fallout: New Vegas, Crash Bandicoot, Pikmin 2. Stardew Valley (NonCommercial
wiki), Brotato (no licence declared) and every Zelda title (GFDL) have no usable wiki and would be maintainer-written.
**The pick, 2026-09-05:** Black Mesa, Hollow Knight, Grand Theft Auto V, Grand Theft Auto IV, DOOM Eternal (Doom 64
rides along), a Mario pack (Super Mario 64, Mario Kart 64, Paper Mario: The Thousand-Year Door), Super Smash Bros.
Melee, Fallout: New Vegas, Pikmin 2. Palworld and Devil May Cry 3 were dropped by the maintainer. The maintainer asked
whether a wiki that declares no licence could be assumed usable: no — silence means all rights reserved by default, and
the publish tool refuses a card without a licence. Brotato turned out to declare **CC BY-SA 4.0 in its page footer**
(the machine-readable field is empty), so it is usable if wanted; it is not in the nine. The screen walk was done the
same evening once the Deck was free: ten of the eleven games are on the device (Steam installs, or shortcuts in the
Nintendo 64 and GameCube collections), Fallout: New Vegas is owned but not installed, and the pick stands (plan 40 § 3).

**The cards, written 2026-09-06.** All eleven games are in the seed: 105 cards, taking the corpus from 161 cards over 13
games to 266 over 25. Per title: Hollow Knight and DOOM Eternal 13 each, Black Mesa and Fallout: New Vegas 11, Pikmin 2
10, Super Smash Bros. Melee and GTA V 9, GTA IV 8, Super Mario 64 and Paper Mario 6, Doom 64 5, Mario Kart 64 4. Every
card names its page, the licence that page declares and the day it was read, so the credit line under a reply needs no
later fixing; the licence gate and 938 tests pass. Two findings worth keeping: Fandom answers a plain request from the
maintainer's machine (only the in-IDE fetcher gets HTTP 402), so `scripts/fetch_wiki_live_pages.py` now reads pages live
with their revision and date, which beats an archive dump for freshness; and Fandom character pages hide their body
inside a tab box that the first version of that reader skipped, which returned empty pages until it was fixed.

**One deliberate gap against D65.** The eleven "starting out" cards are typed `mechanic`, not the new `guide` kind D65
locked, because that kind does not exist yet: adding it touches the seed validator, both language kind lists and a chip
wording. Re-typing eleven rows afterwards is a one-line change each with no format-version bump, so the order costs
nothing. When `guide` lands, re-type these along with the three cards D65 already named.

**Still owed on this decision:** blind test questions from a session that has not read these cards, one corpus release,
then the device check, row **KB-TRANCHE-01** in testing.md.

**Answers, 2026-09-05 (the maintainer answered in chat), all seven locked:**

1. **One feature.** The doctor, with **Save a report** inside it. The five-star **Deck health snapshot** entry
   retires into the four-star **Connection doctor** entry; its text stays in the long notes.
2. **Fix this lives under the failed reply**, and nowhere else. No Ollama-tab entry point, no separate
   notification path. A tap on the failed notification already opens the panel on that reply.
3. **Offers only.** One press per action. The one exception that already exists stays: the connection test
   starts the on-Deck runtime by itself.
4. **A typed command for the report:** yes, the same shape as the VAC check.
5. **The report holds the full list:** version and build, the Deck's address, where the AI runs and what the
   checks found, the host's version and models, the install phase, every permission, knowledge base and voice
   engine state, scrubbed settings, the last Ask's routing details and the length of the last question, the
   last two hundred log lines.
6. **Consent to break the Deck's setup for the checks:** yes, when the Deck is free and nobody is playing;
   everything restored and read back afterwards.
7. **Four stars.**

**Consequence worth recording.** With one entry point, the doctor is reachable only after an Ask has failed.
Someone who wants to check a healthy setup before asking anything cannot; if that turns out to matter, a
button on the Ollama tab is a small later addition, noted in the plan's out-of-scope list.

### D70 — LOCKED 2026-09-05 (raised 2026-09-05) — Showing the model's real thinking: seven calls before "go"

Numbered 70 on purpose: the feature-building chat's branch already holds D65 to D69, so this skips past
them to avoid two entries with one number when the branches meet.

Raised while planning [planning/40-reasoning-display.md](../planning/40-reasoning-display.md), the third of
the six features the maintainer picked on 2026-09-05. Today the plugin asks a thinking model to think, pays
the reserved budget for it, and throws the thinking away: the streaming reader never looks at that field.
The line under your question shows a stock phrase for the whole wait, which was 212 seconds on the Deck's
thinking model at the Deep level. The plan puts the model's own latest sentence on that line, folds it to
"Thought for N s" when the answer starts, and lets you open the whole thing. A test to find out runs first.

1. **The live shape, while the model thinks.**
   - Option 1 (recommended): one line that replaces the stock phrase with the model's newest sentence.
     No growth, no cost to the transcript's height.
   - Option 2: a three-line pane that scrolls. Costs height the transcript does not have.
   - Option 3: nothing live; only the fold after the answer.
2. **After the answer starts.**
   - Option 1 (recommended): the line folds to *Thought for N s*, a D-pad stop that opens the full text.
   - Option 2: no fold; only a chip in Show details.
   - Option 3: the reasoning stays open above the answer.
3. **Spoilers inside the reasoning.** The model may reason about an ending before deciding to hide it.
   - Option 1 (recommended): no masking inside; the closed fold is the fence, like a hidden spoiler
     block; one notice the first time thinking is turned on. The test's Red Dead capture informs this.
   - Option 2: no live reasoning in Strategy mode; the stock phrases stay there.
4. **Saved with the chat.**
   - Option 1 (recommended): yes, capped at a few thousand characters, so a reopened chat keeps the fold.
   - Option 2: live only.
5. **A thinking chip in Show details** with the level, seconds and tokens.
   - Option 1 (recommended): yes.
   - Option 2: no.
6. **The two-star "thinking tips" entry**, hand-written phrases for the same line.
   - Option 1 (recommended): retire it. Real thinking replaces the phrases where a thinking model runs;
     the phrases stay as they are everywhere else.
   - Option 2: keep both.
7. **Where the test runs.**
   - Option 1 (recommended): pull the Deck's small Qwen model onto this PC, about three gigabytes, and run
     the whole test at the desk with no Deck time.
   - Option 2: on the Deck, when it is free.
   - Option 3: on the PC's large Qwen model now, which answers the order and spoiler questions but not the
     Deck's speed.

**Consequence if unanswered.** Nothing is built until 1 to 3 are answered. 4 to 7 have defaults that hold:
saved and capped, chip yes, tips retired, test on the PC with the Deck's model once the pull is allowed.

**Answers, 2026-09-05 (the maintainer answered in chat):**

1. **Three lines**, each the height of a line of the answer, not one status line.
2. **The fold shows the seconds and no token count**, and must not read "Thought for", which is too close
   to Claude's wording. Alternatives are put to the maintainer in D71.
3. **Live reasoning in Strategy mode too.** Accept the spoiler risk; warn the person once.
4. Saved with the chat, capped (default held).
5. A chip in Show details (default held); the token count lives on the chip only.
6. **Retire the two-star thinking-tips entry.**
7. **Test on this PC first** to knock out obvious bugs, **then verify on the Deck.** The Deck's own default
   Gemma 4 build is on this PC already and, checked the same day, it thinks; no pull is needed.

**Two things the maintainer added, both now in the plan.** First, they do not accept that thinking is paid
for and thrown away; the plan gives the reasoning a second job. Second, that job is spoilers: the model is
told to weigh, inside its thinking, what counts as a spoiler under the person's chosen tier and to end
with a verdict line the plugin reads. How far that verdict reaches is D71.

**Correction worth recording.** The plan's first draft said the Deck's default model could not think.
Ollama lists the thinking capability on the exact Gemma 4 build the Deck runs. The feature therefore
shows for anyone who turns thinking on.

### D71 — LOCKED 2026-09-05 (raised 2026-09-05) — The folded line's wording, and how far the spoiler verdict reaches

Raised from the maintainer's answers to D70, plan [40](../planning/40-reasoning-display.md).

1. **What the folded line says** once the answer starts. Seconds only, no token count, and not "Thought
   for". Candidates, with the opened block's label after the slash:
   - Option 1 (recommended): *Worked it out in 41 s* / *See the working* and *Hide the working*. Plain,
     active, and "the working" is the schoolroom phrase for showing your steps, which nobody else uses.
   - Option 2: *Reasoned for 41 s* / *Show reasoning*.
   - Option 3: *41 s of thinking* / *Open* and *Close*.
   - Option 4: *Mulled it over for 41 s*, and later a version in each AI character's own voice, the way
     the status phrases already take the character's tone.
2. **How far the spoiler verdict reaches.** The model ends its thinking with a verdict line: what in the
   answer counts as a spoiler under the person's tier, and what it fenced.
   - Option 1 (recommended to start): the verdict becomes the model's risk opinion for the *Spoiler risk*
     chip, replacing the after-the-fact tag, and the chip's detail says so. The answer itself is not
     touched. Safe, small, and the answer test says whether the extra thinking also cuts fence misfires.
   - Option 2: the verdict also gates the answer. A high verdict on a story game, with no consent given,
     holds the whole answer behind one tap-to-reveal until the person opens it. Stronger, and a real
     change to what people see; only after option 1 has been measured.
   - Option 3: chip only, and the model is not asked to weigh spoilers at all; the reasoning is shown
     but given no second job.
3. **The one-time notice's shape.** A short confirm the first time thinking is turned on, saying the
   thinking is shown unmasked and may mention things the answer will hide (recommended); or a line
   under the Thinking row only, no confirm.

**Consequence if unanswered.** Nothing is built until 1 and 2 are answered. 3 defaults to the confirm.

**Answers, 2026-09-05 (the maintainer answered in chat):**

1. **The folded line reads *Show reasoning*, with the seconds,** when no AI character is selected. When one
   is selected, the line is written in the character's voice instead, seconds kept, "if it works": the
   mockup in the plan's test shows three characters' versions and the maintainer judges. The plain line is
   the fallback.
2. **The verdict feeds the Spoiler risk chip first**, replacing the after-the-fact tag; the answer is not
   held back in this step. The answer test decides whether holding an answer back is the next step.
3. **A confirm the first time thinking is turned on.**

### D72 — LOCKED 2026-09-05 (raised 2026-09-05) — Newer models for the Deck: what to pull and measure

Raised from the maintainer's question while answering D70, and written up in
[planning/41-deck-model-survey.md](../planning/41-deck-model-survey.md). The short answer: this quarter's
releases are mostly large; the small candidates worth measuring are Granite 4.2 (3b and 8b, new, thinks,
no images), the bigger Gemma 4 sibling (e4b), Qwen 3.5 at 2b, and LFM 2.5 8b (fast, text only). Nothing
on paper is known to beat today's Gemma 4; only a measurement can say.

1. **Pull the five candidates onto this PC** for the answer test, about 21 gigabytes in all.
   - Option 1 (recommended): yes, all five.
   - Option 2: a shorter list, named by the maintainer.
   - Option 3: not now.
2. **Which modes to re-pick.**
   - Option 1 (recommended): all three, each with its own candidates.
   - Option 2: Strategy only, where the quality gap shows most.
3. **Is image support a must for Speed and Strategy?** If yes, Granite and LFM drop out of those modes.
   - Option 1 (recommended): not a must for Speed; a must for any mode that takes screenshots today.
   - Option 2: a must everywhere; only Gemma and Qwen sizes stay.

**Consequence if unanswered.** Nothing is pulled. The survey stays as the first input to the on-Deck model
benchmark entry, which is where the measurement belongs.

**Answers, 2026-09-05 (the maintainer answered in chat):**

1. **Pull the five: yes.** Pulled onto this PC the same day.
2. **All three modes, in a new frame.** Today's Gemma 4 build is accepted as the best speed for the cost and
   becomes the **Strategy** model. **Expert** wants the best-answering model that fits the Deck at all, even
   if much slower: Gemma 4 12B and Qwen 3.5 9B were pulled as well for that search, beside Granite 4.2 8B.
   **Speed** wants a small model that beats the current pick on speed for the quality: LFM 2.5, Granite 4.2
   3B, Qwen 3.5 2B. The maintainer asked for data on recent releases; the survey now carries the makers'
   published figures with sources.
3. **Images are not a must for Speed.** Checked the same day: they are not a must for any text pick,
   because screenshot questions route through their own model list.

**Added by the maintainer: is nomic still the right embedding model?** As far as the desk can tell, yes:
the plugin's own bake-off found six models equal on finding the right card and nomic the fastest, and
Ollama's shelf has nothing newer than eight months. The one thing a swap could buy is the Deck's 0.8 to 1.1
seconds per question, and only a smaller model with equal recall buys it. Three untested small ones were
pulled for one sweep with the existing script; the result decides whether a swap is even proposed.

### D73 — LOCKED 2026-09-05 (raised 2026-09-05) — Expert mode offers the stronger Deck-run models first; the licence list catches up

Raised and answered in the same exchange, after the PC half of the bake-off in
[planning/41-deck-model-survey.md](../planning/41-deck-model-survey.md). The maintainer's words: the stronger
models over today's Gemma 4 should be prioritised for Expert mode, local and Deck-run, in the model picker;
today's Gemma 4 is the best for Strategy; it is not worth tuning against another model yet, and once
stronger models come out, swapping and targeting more will be considered.

**What a person will notice.** In the model picker's Expert group, the models that answered best on the
answer test come first: Gemma 4 12B, Qwen 3.5 9B, Granite 4.2 8B, then Gemma 4 E4B and LFM 2.5. Strategy
keeps Gemma 4 E2B. Nothing changes for Speed until its own candidates are measured on the Deck.

**The caveat, recorded once.** On today's prompt those stronger models hide a story spoiler far less often
than Gemma 4 E2B: six times in nine for Gemma 4 12B, two or fewer for the rest, against nine of nine. The
maintainer chose to prioritise them for Expert anyway; Expert is the long, thorough mode and the person
picks it. The route that fixes this without tuning per model is the reasoning verdict in plan 40.

**Found on the way, and part of the same build.** The plugin's licence list files the whole Gemma family as
open-weight; Gemma 4 has been Apache 2.0 since April 2026, an OSI licence, so it belongs with the open-source
families. Granite and Liquid are not in the list at all, so on the default open-source-only tier the plugin
would treat them as unknown and not route to them. Liquid's licence is Apache-based but caps free use at
ten million a year in revenue, so it is open-weight, not open source. The list, the picker's catalogue and
its Expert group are one roadmap entry.

**Consequence worth recording.** The report that carries these numbers is a page rebuilt from the test
reports, not a document, so the next bake-off refreshes it rather than replacing it.

### D74 — PARTLY LOCKED 2026-09-05 (raised the same day) — Reading answers aloud: five calls locked, one open

Raised by the feasibility memo [planning/42-read-aloud-feasibility.md](../planning/42-read-aloud-feasibility.md),
the fourth of the six features planned one at a time on 2026-09-05. What the memo found, in one breath: the Deck
has had a voice of its own since SteamOS 3.7.13 (June 2025, added for Steam's screen reader); the plugin's
microphone code already knows how to reach the Deck's sound system from the background program; a natural
voice is one Apache 2.0 runner program (28 MB) plus one voice file (63 MB), no compile, no container. The one
unknown is speed beside a running game, and that is a Deck measurement, not a guess.

**What a person will notice.** A **Read aloud** button under the answer. Sound starts within about a second,
keeps going when the menu closes, and stops on a second press or a new question. Hidden spoiler blocks are
never read. With a character selected, later, the voice matches the character's type.

**The calls.** Each has a recommendation; none is locked.

1. **Which voice in Phase 1?** (a) the Deck's own voice only, no download, robotic; (b) the natural voice only,
   which needs a download before the button does anything; (c) both, the Deck's own voice from day one and
   the natural voice as an optional download that takes over once installed. *Recommended: (c).*
2. **Read new answers automatically when the menu is closed?** (a) yes, in Phase 1, as an off-by-default
   setting; (b) later. *Recommended: (a).* The in-game case is where listening beats reading.
3. **A hidden spoiler block is skipped: say so, or stay silent?** (a) one short phrase, *a spoiler is hidden
   here*; (b) silence. *Recommended: (a).*
4. **Phase 2's rule: stock voices only, never a copy of a real person's voice.** Yes closes the legal gate
   for good; no reopens it with lawyers. *Recommended: yes.*
5. **Split the roadmap entry** into Phase 1, read aloud (three stars) and Phase 2, a voice per character
   (two stars, after Phase 1), retiring the five-star line? *Recommended: yes.* The five stars priced not
   knowing any of the above.
6. **Voice licences.** Every Piper voice carries the licence of the recordings behind it. (a) ship only
   voices whose recordings are public domain or attribution-only, name them in About; (b) any voice that
   works. *Recommended: (a).* A voice is a model, and the plugin's tiers are about models.

**What is not a call.** Sound leaves through the background program, the way the microphone comes in;
the screen side is the fallback if that fails on the device. The text read is the toast preview's text
(plan 38's helper) split into sentences. Tables and code are announced in one phrase, not read out. Ollama
cannot speak and nothing on its roadmap changes that.

**Before any build, whatever the answers:** Deck rows TTS-FEAS-01 to 03 in the memo, under half an hour
over SSH, when the Deck is free. Row 05, the natural voice beside Deep Rock Survivor, decides whether the
natural voice is the default or an option.

**Locked 2026-09-05, the maintainer's answers.**

1. **Phase 1 uses the Deck's own voice only.** No download. The natural voice moves to Phase 2.
2. **Reading new answers on their own when the menu is closed ships in Phase 1**, as a setting, off by
   default.
3. **A skipped spoiler block is said out loud**, one short phrase.
5. **The roadmap entry is split.** *Read answers aloud* is two stars now that no download is in it; *A voice
   per character* is three stars, since the download moved into it. The five-star line is retired.

**Call 4, revised the same day.** The maintainer does not want a stock reader for the character voice and
is not asking for a copy of a named performer: they want an invented character voice with a heavy regional
accent, like the ones the character mode already writes. The rule as written allows that; it forbids only a
real person's voice without that person's consent. The memo's § 6 now has three ways: a stock British voice
from a 109-speaker consented pack, picked by region; an invented voice designed once on the PC from a
description, or a five-second recording of the maintainer's own voice, copied on the Deck by a small model
that runs on two CPU cores (unmeasured on the Deck; row 04 measures it); or the design model on the Deck
itself, which is a no. The call now: (a) the stock regional voice first; (b) straight to the invented voice,
after the Deck check; (c) both, stock first, invented when the check passes. *Recommended: (c).*

**Call 6, the pros and cons the maintainer asked for.** The question is whether the plugin ships only
voices whose recordings are public domain or attribution-only.

For:

- It keeps the plugin's promise. The default tier is open source only, and a voice is a model; a person who
  chose that tier gets no surprise in the voice list.
- The voices we want qualify anyway. The British 109-speaker pack and the standard American voice are
  attribution-only; the Kokoro and Kitten voices are Apache 2.0. Little is lost.
- Attribution is one line in About, the same line whatever the tier.
- Non-commercial voices bite people who stream or make videos with the plugin on screen; an
  attribution-only voice never does.
- One rule, no judgement calls later.

Against:

- Some of the best-sounding voices in the Piper set are non-commercial and would be out, so the very best
  voice is not in the picker.
- It needs upkeep: every new voice's card has to be checked before it is added, and voice cards are
  sometimes missing a licence or wrong about it, so checking the card is not always enough.
- It is a rule about recordings, not about what the plugin does. A person playing alone is never touched
  by a non-commercial clause; for them the rule only removes choices.
- An invented voice (call 4, way 2) sidesteps the question for the character voice but not for the plain
  reader.

A middle path: the voice list follows the tier setting the models already use. On the default
open-source-only tier, only public domain and attribution-only voices, named in About. On the looser
tiers, non-commercial voices too, marked as such, the way open-weight models are marked today.
*Recommended: the middle path.* Open until the maintainer says.

**Locked later the same day: call 4 is the invented voice.** The maintainer: "invented one sounds more like
what we need to go for." So way 2 in the memo's § 6: design the voice once on the PC from a description,
or from a five-second recording of the maintainer's own voice; copy it on the Deck with the small cloning
model. Row 04 decides whether the Deck can carry that model beside a game; the stock regional voice is the
fallback if it cannot. Never a real person's voice without their consent.

**Call 6, what would be out.** The maintainer asked which voices the attribution-only rule excludes. Every
English Piper voice's licence card was read on 2026-09-05; the table is § 6.1 of the memo. In one
breath: out on every tier, *lessac*, Piper's best-known American voice, because its recordings are
research-only and the licence forbids building voice products with them (a correction: the memo's first
draft called it attribution-only). Looser tiers only, because non-commercial: *ryan*, the two *hfc*
voices, *l2arctic* and *semaine*. Unclear until a voice folder is read: *alan*, *amy*, *danny*, *kusal*.
Everything else is in, including the British 109-speaker pack, the 904-speaker LibriTTS packs, and every
Kokoro, Kitten and Pocket TTS voice.

**Call 6, reframed by call 4.** With an invented voice for the character, the plugin can design its own
reader voice the same way, and then no stock voice is needed for anything. The stock list becomes an
optional extra. The call now: (a) the plugin's own designed voice as the reader, no stock list; (b) the
designed voice plus the stock list as an extra, filtered by the model tier setting, *lessac* never; (c)
stock voices only for the plain reader, filtered by tier. *Recommended: (b).* Open.


**Locked 2026-09-08, after the OmniVoice research (memo § 3.1 and § 6.2).** The maintainer asked why the heavy
voice work cannot be done once, up front. It can, for the voice; it cannot for the words, which are new every
answer and must be read on the device by a fast reader. The calls:

7. **The bundled characters' voices are made up front on the maintainer's PC.** OmniVoice designs each one from
   keywords or a short clip; what ships is a five to ten second clip per character, read on the device by the
   small copying model through the runner. If that model is too slow beside a game (memo row 04), the fallback
   is a trained Piper voice per character, made on the PC from OmniVoice-generated speech, about 60 MB each,
   downloaded on demand.
8. **A custom character's voice is a later version.** Type a name, press *Generate voice*, wait minutes once;
   the device runs the OmniVoice design step locally, then the copying model reads in the result.
9. **An optional OmniVoice download button in Settings is acceptable.** No mixed Deck-and-PC setup.

**Locked later the same day.**

10. **The custom voice step runs on the device, with the warning *minutes on a Steam Deck, seconds on a stronger
    machine*.** The maintainer's thinking, which the call keeps: bonsAI runs on any SteamOS machine, the Deck is
    the floor, a stronger machine may take seconds where the Deck takes minutes. What settled the wording: the
    slowness is about reading every answer live, not about a one-time design step, so a few minutes once, with a
    progress bar and the game closed, is a wait a person accepts even on a Deck. On SteamOS the local build is
    the community C++ port with its Vulkan backend, not the Python original, because there is no package manager
    and no NVIDIA driver; that port is one person's project, unreleased, and never timed on an AMD chip. So:
    local through the port for the one-time design step on every machine; the measured time shown after the
    first run; live reading with OmniVoice never on the device; **the LAN speech server is not built**, and is
    reopened only if the port fails its Deck test. **That half-day test (memo row 07) is phase 0 of the
    custom-voice work**; nothing else in it starts first.

**Open, raised 2026-09-08.**

11. **May voices made with a non-commercial model ship inside the plugin?** OmniVoice's weights are CC-BY-NC;
    a clip or a trained voice made from its output is not the weights, and whether the licence reaches output
    is unsettled. A blogger who trained a Piper voice from another program's speech did not publish it for this
    reason. *Recommendation:* ask the team in an issue before any clip ships; design the voices meanwhile,
    since the answer changes only whether they ship. Fallback: the maintainer's own recorded clips where one
    accented voice will do, and the consented stock voices of memo § 6.1 for the rest.

**Roadmap, 2026-09-08:** the ★★★ character-voice entry reshaped as *Voices for the bundled characters*; added
★★★ *Trained voices for the bundled characters*, ★★★ *Full-quality reading from a LAN PC* (deliberately not
built, later the same day) and ★★★★ *A voice for a custom character*.

**Shelved 2026-09-08, later the same evening.** The maintainer shelved calls 7 to 10, the character voices, after
a conversation about whether imitating Ali G or the Heavy by keywords alone would be fair use. The reason in one
breath: the feature is technically possible and cheap (memo § 6.2), but fair use is a copyright rule and a voice
is not a copyrighted work; what protects a voice is each person's right to their own identity, which the newer
AI-voice laws extend to simulations with no "free use" exception; every one of the 31 bundled characters is a
named character owned by a studio and voiced by a real actor, and Ali G is a living comedian's own persona; the
realistic risk is an actor's complaint, a takedown or a store removal, and OmniVoice's own terms forbid
impersonation. Memo § 6.4 has the summary. **Two gates before unshelving:** a written sweep of the 31 characters
(studio, actor, living persona, whether a voice could be a type rather than a copy), filed as the two-star
roadmap item *Which bundled characters copy a real person*, and a legal check by a person qualified to give one.
Call 11 stays open. *Read answers aloud* and the natural reader voice are not shelved; they have no character in
them. Roadmap: the three character-voice entries marked shelved with the reason; the sweep added.

### D75 — OPEN (raised 2026-09-06) — The model speed readout: six calls before anything is built

Raised by [planning/43-model-speed-readout.md](../planning/43-model-speed-readout.md), the fifth of the six
features planned one at a time. The five-star benchmark's own gate said to descope to a one-shot readout if
timings do not hold still; nobody ran the gate; the plan takes the descope now and lets the readout's record
answer the gate over time.

**What a person will notice.** In the model picker, a small badge per installed model: *9 words/s*, or *not
timed yet*. Under Show details, one plain line: how long the answer took, how long the model took to load,
when the first word came, how many words a second, and which game was running. In the Ollama tab, the last
few timings per model with their dates and conditions. A button, *Time this model now*, that asks one fixed
short question and reports the same line. Nothing is reordered for them, ever.

**Why it is cheap.** Every answer already carries its seconds and its model in the diagnostics the Developer
details chip shows; Ollama already reports the load, reading and writing times at the end of every stream
and the plugin reads only the counts beside them. Words a second is a division. The running game is already
in every Ask's context.

**The calls.** Each has a recommendation; none is locked.

1. **Both halves, or the record alone?** (a) the record with its badge and lines, no button; (b) the record
   plus the button. *Recommended: (b).* The button is what turns the bake-off's Deck half into ten presses
   and the only way to time a model that has never been picked.
2. **Where the numbers show.** (a) picker badge, Show details line, Ollama tab readout; (b) Show details and
   the Ollama tab only; (c) Developer tab only. *Recommended: (a).*
3. **Timing with a game running.** (a) run and record, the game's name on the entry; (b) warn first, then
   run; (c) refuse until the game is closed. *Recommended: (a).* A number with the game named is a true
   number, and the game-running case is the one people live in.
4. **Write each timing to the Desktop notes file too**, one line, when notes are on? (a) yes; (b) no.
   *Recommended: (a).* It reuses the notes writer and fills the bake-off sheet from a text file.
5. **The five-star entry.** (a) retire it; the ranking half lives in the details file behind the record's
   data; (b) keep it beneath this one. *Recommended: (a).*
6. **Stars.** Two for the record alone, three with the button. *Recommended: three.*

**What is not a call.** The badge is the last answer, not an average; averages of a game-running number
and a desk number are a number of nothing. The button's question is fixed, general and spoiler-free, thinking
off, a small cap, so numbers compare across dates. The record is cleared by Clear all plugin data. Nothing
leaves the device.

### D76 — LOCKED 2026-09-06 (raised the same day) — The Show details line goes at the bottom of the reply

Raised while planning three changes to the block under a finished answer. **Show details stops being a button
and becomes a thin line across the width with its label in the middle**, so it reads as the end of the answer
rather than as another control competing with it.

**The call: the line goes at the bottom of the block, under the buttons.** Order becomes the answer, then
*Was this helpful?* and its two buttons, then Retry, then the line. The detail chips open below the line,
which is exactly where they already appear, so nothing above them moves when they open.

**The one rejected.** Putting the line straight under the answer would read more literally as the end of the
answer, but the chips would then open above the buttons and push them down the screen every time.

Shape to copy: the collapsed-history row that already sits in the same file — a label centred on a hairline.
The only difference is a line on both sides of the label rather than one.

### D77 — LOCKED 2026-09-06 (raised the same day) — Copy and Retry become corner icons on the bubbles

**Copy leaves the button row and becomes a small faded icon in the bottom right corner of the answer bubble.**
Reached by pressing Right from the last part of the answer; Left goes back. Drawn as the usual two overlapping
rounded squares. It swaps to a tick for two seconds when it works, and a cross when it does not — the words
have no room, so they stay in the spoken label only.

**Retry leaves the row too, and becomes a circular arrow on the question bubble**, on the bubble's left side,
faded, the same weight as the microphone in the Ask field. Reached by pressing Left from the question; Right
goes back. Only the newest question offers it, exactly as the button did.

**With both gone and Show details a line, the button row under the reply disappears entirely** and the
transcript gains its height.

**Why the left side of the question bubble, not a corner:** that bubble is right-aligned and only as wide as
its text, so its left edge floats. Pinning anything to a floating edge needs a measurement, which the design
rules forbid. The icon becomes a flex child instead and the bubble grows to fit it, in plain CSS.

**The hard part is focus, not paint.** Answer bubbles and question bubbles are not places the ring goes today,
so each icon needs a way in and a way back out, and neither may quietly become touch-only.

### D78 — LOCKED 2026-09-06 (raised the same day) — One D-pad stop holds about half a screen

A finished answer used to give one stop per paragraph, so a long reply was ten or more Down presses before the
buttons under it. **Neighbouring short paragraphs now share a stop, up to about 900 characters** — roughly half
a screen of the Deck's reading area.

**Why half and not a full screen.** A full screen means each press replaces everything you were reading, with
nothing carried over. Half leaves some of the previous section on screen so you keep your place.

**What does not change.** A still-arriving answer is split by a different routine and is untouched; the finished
answer is re-split once it is done, as now. Code blocks stay whole and stay in a stop of their own. A paragraph
that is already half a screen long is left alone. No text is skipped: a press either moves the ring to a section
already on screen or scrolls the panel, which is the behaviour that was already there.

### D79 — LOCKED 2026-09-06 (raised the same day) — The Steam settings shortcuts move above the question box

Raised while planning the ★★★ `[ask]` `[focus]` entry *Steam settings shortcuts float above the question box*, and
built against measured sizes rather than a drawing. Plan [45](../planning/45-settings-shortcut-card.md), mockups and
the live rule tester at
[The settings list, moved up](https://claude.ai/code/artifact/1ab2a570-2ae5-45cd-b12b-332694f96fd5).

**The card sits just above the question box, and nothing underneath it moves.** Fixed to the box's top edge, growing
upward over the chat, covering the suggestion chips. Chosen over sitting above the chips (which keeps them visible but
costs another 38px of chat) and over a full-panel sheet. The point is not that it looks better — today the list is part
of the bottom dock, so every result that appears shoves the box, the chips and the whole conversation up the screen.
Two letters can match 71 of the 194 settings, which grows the dock by roughly 2,300px and puts the box off the top.

**The list stops at eight.** Nothing caps it today. Eight makes the card one fixed size that never scrolls and never
surprises anyone, at 288px — 209 of the 412px reading area.

**Up puts the real highlight on the nearest result, and Down walks back out into the box.** This merges two of the
three options that were put to the maintainer: the highlight genuinely moves into the card, *and* Down leaves it. The
merge came out of the B question below, and it removes the dead press that the option chosen first would have had —
under that one, Down on the nearest result did nothing at all.

**A jumps straight to the setting**, exactly as it does today. No confirming step, unlike the frozen test chips, which
fill the box and wait.

**B closes the card for the rest of that search and keeps what you typed.** It returns only when the box is emptied and
a new search starts. A tap outside the card does the same. B was originally going to be the only way out of the card,
which clashed with closing-for-the-search: backing out to add a word would have killed the list for good. Down leaving
the card is what freed B to mean one thing.

**Coming back from a jump finds it exactly as you left it** — the words still in the box, the card still open — so a
second setting takes no retyping.

**The suggestion chips cannot take the highlight while the card covers them.** Standing rule here: nothing hidden ever
gets the ring.

**The card gets out of the way past three words or at a question mark, but never while the words are an exact run
inside a setting's name.** The let-out clause is not a nicety. **123 of the 194 settings have names of three or more
words** — *Enable Developer Mode* is three, *Steam Client Update Channel* is four — so a plain three-word cut hides the
list at the exact moment someone finishes typing the name of the thing they wanted. Checked against the real data on
2026-09-06: the plain cut hides *steam client update channel* and *show switch to desktop option*, both of which return
a real result; the version with the let-out keeps them and still hides all four of the sentence-shaped examples.

**Typing while the highlight is in the card hands it straight back to the box.** Locked, but it means the list redraws
under your thumb mid-word, so it is on the list to watch on the device before it is called settled.

**A reply arriving changes nothing.** The card behaves the same whether or not an answer is streaming in.

**The heading reads *Steam settings* with a count** of how many were left out. The card lands where answers normally
appear, so it has to say it is not one. Dropping the heading would not buy another row — the list stops at eight either
way — it would buy 22px of chat back, which was judged not worth the ambiguity.

**What the search actually does, because it is not what it looks like.** What you type has to sit inside a setting's
name as one whole piece, so a long sentence matches nothing by itself: *how do I make the screen brighter* returns no
results today. The only reason a sentence ever matches is the bundled Deck basics word list, which ships switched on
and works the other way round — if your sentence *contains* one of its 88 words, it fires. That is where every stray
result comes from, and it is a row or three, never a wall. Whether that word list stays was **folded into the ★
`[ask]` *Intent packs later review* entry already in Features** rather than decided here.

**Also settled in the same sitting: no third batch of suggestion chips.** The six chips added for the features that
shipped after early August were verified on the Deck on 2026-09-05, and the maintainer's call is that the row carries
enough. Nothing is owed for the tab bar, one-chip mode, the end-of-row glow, always-streaming replies or the reply
block rework.

### D80 — LOCKED 2026-09-06 (raised the same day) — Knowledge-base wave one: the Speed-mode symptom search, the voice preset, and running on without stops

Raised while planning wave one of the knowledge-base work, plan [46](../archive/46-kb-wave-one-session.md). Three
calls, all given in one message, plus a fourth that was already settled and is restated here so the plan reads whole.

**A troubleshooting question that only describes the problem gets the meaning search in Speed mode too — but only
with no game running, and only after the keyword search and the topic router have both come back empty.** The
1 September call (D52) said such questions get a meaning search over the tip sheet. The 5 September fix made Speed
mode skip the meaning search altogether, and the two rules collided, because troubleshooting is mostly asked in
Speed. This resolves it the recommended way: the cost is one embedding call, about a second when the model is warm
and about a second and a half when it is not, and it lands only on questions that would otherwise get no tips at
all. With a game running, the question still goes to that game's cards; changing that is a separate call. Plan 46's
Deck row R3 times it.

**The voice-on measurement uses the Ali G preset**, the character on the maintainer's Deck. A character-voice bug is
being worked in another chat at the time of writing. The answer test's voice switch is built regardless; the first
voice-on run waits until that fix has landed, so the numbers describe a working voice. If the fix has not landed by
the end of plan 46's wave 2, the run is left owed in the log, never skipped quietly.

**The session runs on without pausing between milestones once each is verifiably complete and as intended.**
"Verifiably" means the milestone gates in plan 46 § 5: green gates, the acceptance numbers in the lane brief, and the
orchestrator's own re-run of any measurement a lane reports. The sweep table and the release check become heads-ups
in the log, not stops. **The one stop that stays is the public push of the corpus release**, because it leaves the
machine; the maintainer can fold it into the "go" by saying so in the same message.

**The Deck session after the release runs on Opus at medium effort and records; it never diagnoses.** A failed row is
saved with its evidence and handed to an Opus session at extra-high effort to read — the routing table's own rule,
restated here because the maintainer chose the medium tier for the run and wanted the hand-off explicit.


### D81 — OPEN, raised 2026-09-06 — The symptom-only search was built and measured, and it does not do what D52 expected

**Status: built, measured, held back. Not shipped. The branch is `lane/kb-symptom-search`, three commits, kept.**

**What it was meant to do.** Someone types a plain description of a problem with no game running — *"the game drops me
back to the library a few minutes in"* — and gets the crash tips, even though the word "crash" never appears. That was
the win D52 was bought for, and plan 46 listed it as two stars.

**What it actually does, measured on the real tip sheet.** Four plainly-worded sentences were the target. Of those:

- **The controller one now works.** It used to get nothing at all, because the plugin refused to even look. It now
  reaches the controller tips. That is a real improvement.
- **The storage one and the headphones one already worked** before the change. They are unaffected.
- **The crash one still does not work, and is arguably worse than before.** It used to attach nothing. It now attaches
  a tip about desktop mode — the wrong subject entirely. Someone describing a crash would be shown advice about
  something else.

Nothing that already worked got worse: all thirteen of the other questions attached exactly the same tip, the same way,
before and after.

**Why it does not work, which is the part worth keeping.** Two separate reasons, and the second is the one that matters.

1. The new search by meaning only runs when the plain word search comes back **completely** empty. On the real tip
   sheet the word search almost always returns *something*, even a weak and unrelated match. So the new search rarely
   gets a turn at all.
2. **Even when forced to run anyway, it does not find the crash tip.** For that sentence, the closest tips by meaning
   were about desktop mode and storage. So this is not just a gate that is set too tight. On this tip sheet, matching by
   meaning does not connect *"drops me back to the library"* to the crash tips at all.

That second point is the finding. The assumption behind D52 — that searching by meaning would bridge the gap between how
a person describes a problem and how the tip is written — **does not hold for the tips we actually have.** It is a fact
about the tip sheet's wording, not about the code.

**The trade nobody costed.** Opening the gate so more questions reach the tip sheet also means more questions get a weak
or wrong tip attached. Today the plugin says nothing when it is unsure. The change makes it say something more often, and
some of what it says is wrong. Whether that is a better experience is a judgement, not a measurement.

**One loose end either way.** A test in the search-measuring suite now fails, correctly: it guards that the count of
questions reaching retrieval tracks the live gate, and the gate changed. If anything here ships, that expectation is
updated in the same change.

**The options.**

1. **Hold it. Recommended.** Keep the branch, ship nothing. One sentence out of four improved, and it came with a new way
   to show someone the wrong advice. Not worth shipping on that record.
2. **Ship only the gate opening.** The controller sentence works and questions stop being refused outright. Accept that
   some questions now get a weak or wrong tip where they used to get none.
3. **Rework it, and treat the tip sheet as the real problem.** Two changes together: let the meaning search run when the
   word search's best match is *weak*, not only when it is empty; and rewrite the tips so a crash tip actually contains
   the words a person uses to describe a crash. The second is corpus work, not code, and is probably where the win
   actually lives.

**ANSWERED 2026-09-06 — option 1, with option 3's second half as the real job.** Hold it. The branch stays and
nothing reaches the plugin. The finding stands on its own: matching by meaning does not connect the words a person
uses to describe a crash to the way the crash tips are written. **Rewriting the tips so they contain the words people
actually use is the work**, not more search tuning. That becomes its own roadmap entry; this decision closes.


### D82 — OPEN, raised 2026-09-06 — Leaning the search on meaning wins on the measurements and breaks three rules we set on purpose

**Status: measured, tried, reverted. Nothing changed in the plugin. The numbers below are real and repeatable.**

**What was measured.** Nine different balances between the word search and the meaning search, run over the full
266-note library. Only one beat today's even split on **both** measures at once, and it was the one that counts the
meaning search twice as much as the word search:

| | right note first | in the top three |
|---|---|---|
| Today's even split, tuning questions (168) | 65.5% | 88.7% |
| Leaning on meaning, tuning questions (168) | **69.6%** | **89.9%** |
| Today's even split, held-back questions (135) | 37.0% | 51.9% |
| Leaning on meaning, held-back questions (135) | **43.0%** | **53.3%** |

The held-back questions are the honest test — no tuning is ever allowed to look at them. It won there too, and the
direction agreed on both sets independently. D68 authorised making this change on exactly this evidence.

**Two warnings about those numbers before anyone reads them as a win.**

1. **The ranges overlap.** This is a consistent direction, not a separated result. "Lean on meaning, the evidence is
   thin" is the honest one-line summary.
2. **The held-back numbers look far worse than the old ones (37% against about 70% in August) because the test got
   much harder, not because the search got worse.** The held-back set grew from 36 questions to 135 by adding blind
   questions about twelve newly added games, written by someone who had not read a single note and who described
   things instead of naming them. That is the new floor.

**Why it was reverted.** Making the change breaks three tests, and all three are guarding behaviour we chose on
purpose, not implementation detail:

1. **A note whose meaning-index has not been built yet gets buried.** Today, a note that is the best word-match still
   comes first even when its meaning-index is missing — there is a deliberate mechanism keeping it there. Halve the
   word search's weight and any note that *does* have a meaning-index outranks it. In plain terms: **a freshly added
   note could be pushed out of sight until its index is built.**
2. **The meaning search can now push aside a strong exact word match.** There is a test whose name is literally the
   rule — a note found by meaning may compete, but must not unseat the top word match. With the change it does. In
   plain terms: someone who types words that exactly match one note could be shown a different note first.
3. **A locked decision (D22) stops holding.** Preferring a topic was chosen over filtering by it, so a clearly better
   match elsewhere still surfaces. One of its cases stops surfacing.

The arithmetic behind all three is the same and it is not subtle: at equal weight, a note ranked first by words and a
note ranked first by meaning score the same. Halve the word weight and **the meaning-first note always wins**, in every
tie, everywhere.

**So this is not the two-constant flip D68 described.** D68 authorised acting on the measurement. It did not consider
that the same change quietly overturns three named guarantees, one of them a locked decision. Pushing it through would
mean editing those three tests to expect the opposite of what they were written to protect, which is a design decision
rather than a measurement one. That is why it stopped here.

**The options.**

1. **Leave the weights alone. Recommended for now.** The evidence is a direction, not a result, and the cost is three
   rules we set deliberately — including new notes being buried before their index exists, which would land exactly
   during a corpus release.
2. **Take the change and accept all three consequences**, updating those tests to match. Worth about four points on
   "right note first". Do this only if the three behaviours above are genuinely not wanted any more.
3. **Get the win without the cost. Recommended as the follow-up.** Keep the weights even and change the tie-break
   instead: let meaning rank higher *only* where there is no strong word match, and keep the existing protection for a
   note whose meaning-index is missing. That targets the same gap without touching any of the three rules. It is real
   work rather than a constant change, and needs its own measurement.

**ANSWERED 2026-09-06 — hold, and here is the condition for lifting it.** The maintainer's words: *"don't lean the
search towards meaning until its meaning index is built."*

So this is not a permanent no. It is a rule with a trigger. Leaning the search on meaning is blocked **for as long as
a note can exist whose meaning index has not been built yet** — because that is the case where the lean buries a
brand-new note out of sight. The moment every note is guaranteed to have its meaning index before it can be searched,
the objection in point 1 above disappears and the change can be reconsidered on the numbers, which are already on
record here.

The other two objections (a strong exact word match being pushed aside, and the topic-preference case) are **not**
covered by that trigger and still need answering separately if the lean is ever taken.

Weights stay even for now. The measurements stand.


### D83 — LOCKED 2026-09-06 — Ship the twelve new games now; the thin coverage is a later job

**The release goes out as it is.** Version `2026.09.06`, 266 notes across 25 games, 124 troubleshooting tips,
1.27 MB. Twelve games gain notes: Hollow Knight and DOOM Eternal get 13 each, down to Mario Kart 64 with 4 and
Doom 64 with 5.

**The coverage gap was put in front of the maintainer before the decision and they chose to ship anyway.** Of 72
questions a player might plainly ask about these twelve games, only **43 have a note that answers them**. Four in ten
hit nothing. That is measured, not guessed — the questions were written by someone who had not read the notes, then
matched to the notes by someone who had.

**So the gap is a known, accepted state of this release, not a defect in it.** Someone asking about Mario Kart 64 or
Doom 64 will often get nothing. Nothing already installed goes stale, because the format has not changed.

**What happens next is agreed in principle and not yet scheduled:** filling the thin games is worth doing, and it is
separate work. Whether the effort goes into more games or more depth on the games already covered is still open, and
does not block anything.


### D84 — LOCKED 2026-09-06 — About a second to search the notes on the Deck is fine

**The measurement.** With a game running and the deeper answer mode on, searching the notes by meaning took **1.10,
1.23 and 1.19 seconds** on three questions in a row on the Deck. The test row wanted the second and third at or under
one second.

**Two things this settles.**

1. **The maintainer's call: that speed is fine.** No work is needed. The one-second target in the test row was never
   based on anything a person complained about, and about a second before an answer starts — on a question that then
   takes tens of seconds to write itself out — is not what anyone notices.
2. **The warm-up explanation is wrong for the Deck, and that part still stands.** The earlier finding was that only
   the first question after a quiet spell pays, at 1.47 seconds, and later ones cost almost nothing at 0.05. That
   holds on the PC. On the Deck the cost is about 1.2 seconds *every time* — the third question was no faster than
   the first. Anyone reading the old explanation and expecting later questions to be free on the device would be
   wrong.

**So the test row closes on speed being acceptable, not on the target being met.** Rewrite the row to say about a
second, every question, is the measured and accepted cost on this device. Do not leave a one-second target in place
that nothing intends to meet.

### D85 — LOCKED 2026-09-07 — Knowledge-base wave two: four calls answered before a line of code

Raised and answered the same day while planning [47](../planning/47-kb-wave-two-session.md). Two of the four
were the maintainer's own questions; the other two came out of checks run while writing the plan, and both
changed what a lane will do.

**1. How much of the game-note gap to fill. Answered: the 21 real gaps, plus topping up the four thinnest
games.** Wave one left 29 of 72 plainly-worded questions with no note behind them. Eight of those 29 are
marked in the file as written on purpose to have no answer — secret endings, post-game bosses — so the real
content gap is 21. **Those eight stay blank as a control**, so the test keeps something honest to measure
against. On top of the 21, Mario Kart 64 (4 notes), Doom 64 (5), Super Mario 64 (6) and Paper Mario (6) are
brought up to eight to ten each, because a game that thin will keep producing new gaps against questions
nobody has written yet. Eight to ten is a target, not a quota: a padded note competes in the search with the
good ones, so a lane that runs out of real material says so instead.

**A consequence worth writing down.** A note written to answer a question that was written blind stops that
question being a blind measurement. So the headline number for this wave is **coverage** — how many of the
72 now have a note — and the search score on those 21 rows is reported with a note saying it is no longer
blind. The eight controls are what stays honest.

**2. The wording of the "not in my notes" line (D48 left this open on 2026-09-01). Answered:**

> Not in my notes — this answer is from the model's own knowledge.

One muted line, added by code and not by the model, under the reply. Two lines in the 300 px column. Two
alternatives were shown and turned down: naming the game (*"I have no notes on this for Doom 64…"*), which
costs a third line; and adding *"so worth double-checking"*, which nags on every uncovered question.
Everything else about the line stays as D48 locked it — Strategy and Expert asks only, only where the notes
cover the game but nothing matched, never when the library is off or the game is uncovered.

**3. What the meaning-index work should actually do. Answered: ship the guarantee, and measure the
tie-break. Nothing about the live search changes in this wave.**

This one corrects a belief that had got into the roadmap. D82 was held with the maintainer's condition:
*"don't lean the search towards meaning until its meaning index is built."* It was reasonable to read that
as *guarantee the index and the four-to-six point gain is unlocked.* **It is not.** D82 names three
objections and that trigger covers one of them. The other two — a note whose words exactly match being
pushed aside, and one case of the locked topic-preference decision no longer holding — are untouched by it
and were written down at the time as still needing answering.

So the work splits in two. **The guarantee ships**, because it is worth having on its own: the corpus build
has three separate paths that put notes on a device with no meaning index and only print a warning, and the
plugin's run-time check asks one yes-or-no question about the whole library rather than checking each note.
**The tie-break is measured only** — keep the balance even and let meaning rank higher only where there is
no strong word match, which is the follow-up D82 itself recommends because it targets the same gap without
touching any of the three rules. The numbers come back as a decision rather than a change.

**4. Who fixes the ring landing behind the Copy and Retry icons. Answered: the session running the wave,
not a helper.** It is a focus and layout problem, and the standing rule keeps those away from helpers and
gives them to Opus at extra-high after a device reading. The reading exists: last night's run recorded three
stops that were focused while partly hidden — one at 67% behind Retry and two at 89% behind Copy. Two
things about it are worth knowing. It is **recorded nowhere but an untracked evidence file**, so it gets a
roadmap entry as part of this wave. And the manual test record reads the same 89% as *expected* — the icon
is meant to sit in that corner — while saying nothing about the 67%. So the entry is filed as the 67% case,
not as the 89% one.

**Two findings from checks run while planning, which is why the plan looks different from the sketch.**

The plan now carries a standing rule: any lane whose value rests on an unproven assumption gets that
assumption tested cheaply before the lane is briefed. Wave one lost a day to a lane whose whole design
rested on one (D81). Two such checks were run while writing plan 47.

- **Troubleshooting is refused before wording ever matters.** Ten ordinary problem sentences were run
  through the part of the plugin that decides whether a question is about troubleshooting at all. **Nine of
  ten reach nothing** — including *"my game keeps crashing"*, *"my game won't launch"*, *"black screen when
  I start the game"* and *"game keeps crashing on my Steam Deck"*. The word "crash" is deliberately classed
  as too weak to send a question to the tip sheet on its own, in every circumstance. That reasoning holds
  while a game is running — "crash" is a thing bosses do to you — and does not hold with nothing running.
  So D81's "rewrite the tips" is right and incomplete: the routing has to stop refusing first, or a perfect
  rewrite is never reached.
- **There are two crash tips in the whole sheet of 124, and neither helps.** They read *"Crash to desktop:
  check ~/.steam/steam/logs and compatdata"* and *"Kernel panic rare on Deck: note SteamOS version and last
  game."* On a Deck in game mode there is no desktop to crash to. So the tips are not badly worded so much
  as barely there, and the job is writing them, not rewording them.

**One thing this costs.** The sentence D81 and three other documents quote — the one about a game dropping
you back to the library — has been read by everyone who has worked on this, so it is burned as a blind test.
It is retired as a held-back row, and plan 47 has a separate lane write two dozen fresh symptom sentences,
blind, before anyone touches the tips.


### D86 — LOCKED 2026-09-07 — Knowledge-base wave three: fourteen calls from one discovery round

Raised and answered the same evening while planning [48](../planning/48-kb-wave-three-session.md),
after wave two landed. Twelve were questions put to the maintainer about scope, what a person sees,
edge cases and trade-offs; two were calls the roadmap had been holding open.

**The two open calls.**

**Black Mesa's electrified water note is wrong, and it is replaced.** The note said the current arcs on
a cycle with a spark as a warning, so you move while the water is dark. The maintainer checked the game:
**the current is constant.** Stepping in deals continuous shock damage until you get out or die. The right
advice, in the maintainer's words: treat the floor like lava and cross on desks, filing cabinets, shelves,
floating crates or overhead pipes; or cut the power at a red wall switch, circuit breaker or lever, usually
just outside the flooded area or at the far end, which makes the water safe for good; and where a gap is
too wide to jump, push or carry loose wooden crates into the water as stepping stones. The note is
rewritten from that and ships in a library point release, pushed on a second "go". It stays
maintainer-written with no page as its source, which the credit rules allow; the difference from before
is that it has now been checked in the game.

**The ring landing behind the corner icons: do nothing.** Measured on the Deck 2026-09-07: the only fix
is a floor of about 48 pixels on a question bubble, which costs 18 pixels on every short question. No
text is ever hidden. Closed as accepted.

**The twelve answers.**

1. **Scope.** The wave is: the two ways the answer test lies; the search test rebuilding its copy; a way
   for the tip search to say "none of these fit"; a "no tip for this" line; answer-first tested both ways
   on the PC; follow-ups remembering, step one; a written time budget with a check; the Black Mesa
   correction. Spoiler tiers stay out — three days and the settings plumbing make it a wave of its own.
   The prompt diet, the embedding-model pull and the window experiment stay on the roadmap.
2. **Wave two's Deck evening runs first**, before wave three starts. The Deck is free.
3. **No plugin release from this wave.** Close, not yet. The corrected note is a library point release.
4. **Catching a contradiction.** The cheap fix — claim lists with looser, negation-aware matching — is the
   score. A second model on the PC judges each reply as a report-only column, so whether the judge is
   worth trusting is learned before it decides anything.
5. **What happens to the old numbers** was left to the session. The choice: a clean break. Before and after
   are re-run on the same library with the fixed checks, and every earlier answer number is marked not
   comparable.
6. **The search test rebuilds its copy automatically** when the notes are newer, rather than refusing.
   Forgetting to pass a flag is exactly how the stale copy went unnoticed for weeks.
7. **When no tip fits, a line says so:** *"No tip for this — this answer is from the model's own
   knowledge."* Same shape as the "not in my notes" line, any Ask mode, never when the library is off.
8. **The held meaning search gets one more try** on top of the new floor. If it still attaches a wrong tip
   it is retired for good, not held again.
9. **Answer-first:** PC numbers first, then the maintainer decides. The reply shape does not change in this
   wave.
10. **Follow-ups remember: Strategy and Expert only.** The second half was left to the session: a
    troubleshooting question neither stores a subject nor picks one up; the memory carries only between
    two game questions.
11. **No new notes this wave.** The eight deliberate blanks stay blank as the control.
12. **Roles.** A fresh Opus extra-high session runs the plan; Sonnet 5 high lanes; the lane helper is
    generalised so wave three does not need its own copy.

**One thing found while planning.** The roadmap entry asking for a voice switch on the answer test is
stale: the switch landed on 6 September. What is owed is a run with it on, which wave three's canonical
measurement includes.

### D87 — LOCKED 2026-09-07 — The "none of these fit" floor covers the notes as well as the tips

**Raised** during wave three's first evening, from a result that came out of running wave two's Deck
evening. **Answered by the maintainer the same evening.**

#### What was found

The "not in my notes" line shipped in wave two. It exists so a person can tell an answer built from
their own notes from one the model made up. It shows only when the library covers the game they are
playing **and nothing in the library matched what they asked**.

It never shows.

Ten Strategy questions were put to games the library covers, on the device, against the library that
ships. They included deliberately absurd ones — *"how do i tame a horse"* while Black Mesa was the
game, *"where do i buy a house"* in Portal 2 — and one that is not a sentence at all,
*"qqqq zzzz wwww"*, in Hades. **Every single one attached notes.** The line printed on none of them.

Then on the device: with Hades running, *"how do i beat the bone hydra in hades"*. There is no bone
hydra in Hades. Three Hades notes attached — the weapon notes — and the reply explained, at length
and with confidence, which weapon to bring to a fight that does not exist. No line.

#### Why this matters more than one dormant line

This is the **same fault** wave three was already convened to fix, in a second place. Wave three's
tip lane exists because a plain word search over 156 tips nearly always finds *something*, so a
problem sentence that fits no tip gets a wrong tip stapled on. The notes behave identically: a word
search inside one game's notes nearly always finds something, so a question the notes cannot answer
gets notes anyway, and the line that was supposed to warn the reader stands down precisely when it
is most needed.

Fixing only the tips would leave the line dormant and leave the notes handing out confident answers
about things that are not in the game.

#### The options put to the maintainer

1. **Widen the tip lane to the notes as well** — the same floor, the same measurement, one lane, one
   more concern.
2. **Keep wave three as planned**, file the notes hole as a new bug, leave the line dormant until a
   later wave.
3. **A separate lane** on the notes path, running alongside.

#### The call

**Option 1. The floor covers the notes as well as the tips.** One lane, blind to the same held-back
rows, measured the same way on the tuning rows only.

#### What was measured before the lane was briefed

The cheap check the plan requires was run first, and it changed the brief.

**The fused score cannot carry a floor.** The number the search ranks tips by is a rank-fusion score,
and on this corpus it takes essentially two values: about 0.0328 when the router did not match the
question's topic, and about 0.0377 when it did. Right tips and wrong tips both sit at both values. A
floor on that number separates "the router matched a topic" from "it did not" and nothing else.

**The meaning score can.** Underneath the fusion, the meaning score is continuous and it separates
cleanly at the bottom end:

| | range across the 35 tuning rows |
|---|---|
| best right tip, by meaning | 0.5649 to 0.8367 |
| best wrong tip, by meaning | 0.5447 to 0.8152 |
| the junk phrases | 0.4821 to 0.5044 |

A floor just above the junk phrases — 0.5044 — **keeps 34 of 34 right tips**. The same floor on the
keyword score would throw away 8 of them.

**What the floor can and cannot do.** It can say "none of these fit" for a question the tip sheet has
no business answering, which is the actual complaint. It cannot pick the right tip out of a genuinely
on-topic set: right beats best-wrong on only 20 of 34 rows by meaning, and 17 of 34 by keyword. So
the lane builds the floor and leaves the ranking alone, and the honest claim is the narrow one.

One caution on the evidence: only two of the six junk phrases reach the search at all, so the junk
end of that table rests on two points. The lane should widen it rather than trust it as it stands.

#### Also settled the same evening

- **The wave two Deck evening was run by this session** rather than a separate checking session,
  because the Deck was free and the maintainer asked for it. The sentences were confirmed before
  anything was pinned, as the standing rule requires.
- **Dungeon maps in the knowledge base** are an idea for wave four, raised by the maintainer. Not
  scoped, not committed, recorded so it is not lost.

#### What this changes in plan 48

Lane C's brief gains the note path and its forbidden list is unchanged. Its floor is built on the
meaning score, not on the fused score. The gate stays what section 5 already says: wrong attachments
go down and right attachments do not.

---

### D88 — LOCKED 2026-09-07 — The "not in my notes" line keys off how good the match was, not just whether one attached

**Raised** after the maintainer read the three things still owed at the end of wave three and was
given four ways to close the last of them.

#### What was wrong

The line exists to tell someone an answer came from the model's own memory rather than from their
notes. It shows only when **nothing** attached. Something nearly always attaches — ten Strategy
questions about covered games, gibberish included, every one attached a note — so the line almost
never shows, and a confident non-answer reads exactly like a grounded one.

#### The four ways out, and why this one

1. **Leave it.** No right answers lost, but the four questions that caused this keep looking
   grounded.
2. **Raise the bar a note has to clear.** Catches all four, and throws away twenty or more answers
   that are right today. Turning a working answer into "not in my notes" is the wrong direction.
3. **Change what the line keys off** — show it when the best match is *weak*, even though a note
   attached. Nothing is taken away; the note still reaches the model and the answer still comes.
   The line just says the match was thin.
4. **Write the missing notes.** Fixes four questions and leaves the general problem.

**The maintainer took 3**, with 4 kept as wave-four note-writing.

#### What the measurement then said

Measured the same evening by `scripts/measure_kb_thin_match.py`, over all 361 Strategy rows of the
question set plus the four device sentences, running the real pipeline end to end.

**The obvious version of option 3 does not work.** Warning whenever the closeness score is low
needs 0.64 or higher to catch all four device sentences, and that also warns on **43 of the 188**
rows that get their *right* note. Nearly one right answer in four would carry a warning. This is
the same wall the attach floor already hit: raw closeness cannot separate "really about this" from
"shares enough words to score high anyway".

**A second signal makes it work.** Ask also whether the *keyword* search ranked the winning note at
all, or whether only the meaning search found it. A note that no word in the question points at,
picked purely because a machine judged it vaguely similar, is the thin case.

Requiring both — no keyword support, and a closeness score under 0.65:

| | |
|---|---|
| warned on a right note (the cost) | 11 of 188, about one in seventeen |
| warned on a wrong note | 3 of 35 |
| warned on a row with no recorded right answer | 12 |
| the four device sentences | 3 of 4 |

**Read the third row before judging the first.** Twelve of the fifteen catches are on rows the
question set records no right answer for, so they move no counter at all — "how to save the game"
answered with a note about girlfriends, "how to have a baby" answered with one about raising a
skill. That is exactly the harm the line was built for, and it is invisible to any bucket count.
This is the same blind spot that nearly caused the attach floor to be reverted earlier the same day.

The one miss is *"where do i buy a house"* in Portal 2: the keyword search really did rank a card
for it, so the second signal correctly says this is not the meaning-only case. Catching it needs a
different idea, not a different number.

#### The wording

**Settled the same evening.** The line reads:

> *"No close match in my notes, this answer leans on the model's own knowledge."*

The draft used a dash between the two halves, to match the two sibling lines. The maintainer asked
for a comma instead, and that is what ships. The difference from its siblings is deliberate and is
noted in the code so nobody tidies it back.

The sentence is deliberately not the same as "not in my notes", because a note **did** reach the
model on these turns and that line would be false.

#### Also settled the same evening

- **The library point release went out** as 2026.09.08, carrying the corrected Black Mesa water
  note. Checked on the device by asking about the flooded rooms: the reply now says the current is
  constant, says not to try to time it, and points at the wall switch — the old advice to wait for
  a gap is gone. Approved by the maintainer before publishing.
- **Wave two's stray-computer-text row was run and failed.** The fix does not cover the case the
  bug came from; the cause is written up on the roadmap. Not scoped for a fix this session.

---

## Refactor round two (plan 51): the calls from the planning discovery, 2026-09-09 to 2026-09-11

Eight grouped entries. Each locks the calls the maintainer made in the three-round discovery for
[plan 51](../planning/51-refactor-round-two.md), with the options passed over. The plan holds the
phases, the numbers and the worker instructions; this file holds only what was decided and why.

### D89 — LOCKED 2026-09-11 — Refactor round two replaces round one: scope, order, and what stays out

**Raised** when the maintainer asked for a whole-project clean-up with tokens as the first priority,
and the planning session found the round-one plan with four of its five work items done.

#### The calls

- **A fresh plan replaces the round-one plan.** The old file carries a banner from today and moves
  to the archive in the docs phase, with its finished items recorded.
- **Everything is in scope:** front end, back end, tests, helper scripts, the MCP package, docs.
  The helper scripts are sorted the same way as docs, because many are one-off probes.
- **Seven phases in this order:** tools, docs, map and measure, delete, reshape, explain, handoff.
  Docs come before code because every later agent pays for the docs it has to read. Comments come
  after the code stops moving so they do not go stale.
- **Behavior is strictly preserved.** A worker that trips over a bug writes a roadmap entry and
  never fixes it inside a refactor commit.
- **Of the giants, only two are split this round:** the main backend file, along the lines round
  one already mapped, and the ask hook. The plugin root and the six components over 950 lines get
  a thorough header and a "split later" roadmap entry each.
- **Tests are in scope for slimming** once the code stabilizes. A test that breaks during a move
  because it asserted the old shape rather than behavior may be deleted with a one-line note.
- **Ruff is added for Python; ESLint is not added.**
- **Work starts from the experimental branch and lands there.**
- **Feature work continues alongside the refactor** (the maintainer's call on 2026-09-11). A
  feature branch starts from the tip after the latest landing and rebases over the moves; the
  delete and reshape phases land in small commits, and every landing lists its moved files in
  the session notes, so a rebase stays small.

#### Passed over

- Extending the old plan: its remaining item was investigated but the new scope is much wider.
- Splitting every giant: that is where refactor bugs come from; a header is cheap and safe.
- Code before docs: every agent would keep paying about 100,000 tokens per landing to read docs.
- Pausing feature work during the delete and reshape phases: simpler, but the maintainer wants
  to keep adding features.

### D90 — LOCKED 2026-09-11 — Docs: archive by status, split the two giant docs, one neutral guide

**Raised** by the measurement that the testing doc is 315 KB and the roadmap 109 KB, that the repo
rule makes every landing read both, and that every doc was touched inside 90 days so age cannot
say which are stale.

#### The calls

- **Every doc gets one of four statuses:** active, shipped, superseded, abandoned. A cheap model
  proposes the list with a reason per doc; the maintainer confirms it once; the bookkeeper moves
  the files.
- **Archived docs are deleted 90 days after archiving,** and only when the maintainer says yes
  to a list of the overdue ones. Nothing is deleted automatically.
- **The roadmap and the testing doc are split** into a small current file and an archive file
  each. The rule to update both before marking work done stays; they just get small.
- **The orientation file shrinks** to under 8 KB and stops carrying hand-typed counts; a
  generated facts block replaces them. Four of its numbers were wrong on the day of measuring.
- **The neutral guide becomes the one guide** for a human and for any AI tool that reads it;
  the Claude file keeps only what is Claude-specific.
- **The 464 committed device-run files:** the ones a testing row cites move to the evidence
  folder; the rest leave git. New run files can no longer be committed by accident.
- **The lessons that live only in Claude's memory on this machine** move into a repo doc in the
  handoff phase, so other tools and people can read them.

#### Passed over

- Archiving by age: impossible here, the repo is young and active.
- Automatic deletion: a person says yes to a list, every time.

### D91 — LOCKED 2026-09-11 — Cursor is dropped; two personas survive in a tool-neutral form

**Raised** when the maintainer said Cursor will not be used on this project again and asked what
a tool-neutral persona would lose against a Claude-tailored one.

#### The calls

- **Delete the Cursor folder and the Cursor log-capture example script,** after two moves: the
  D-pad focus rule is rewritten into the neutral guide with the two corrections from the review
  saved on 2026-09-11 (its pointers into a settings file went stale, and it names a low-level
  focus handoff that a safer helper has since replaced), and each Cursor skill is compared against
  the guides so nothing they lack is lost.
- **Cursor mentions come out of the six live docs** that carry them. The changelog and the
  archive keep theirs as history.
- **The FOSS advocate and the security auditor survive** as one neutral body each, readable by
  any tool, plus a five-line Claude wrapper that pins the model and the tools and says "follow
  the body". One copy of the content, both benefits.

#### Passed over

- Keeping the folder for a possible return: the maintainer was clear it will not return.
- Claude-only agent files: other tools could not read them.
- Neutral files only: that loses the automatic pick-up, the model pin, the read-only tool set and
  the separate context window, and the last two matter most for an auditor.

### D92 — LOCKED 2026-09-11 — Headers and comments: length follows the file, never counts or line numbers

**Raised** when the maintainer asked whether the "three or four lines to a paragraph" limit should
go up, and asked that any of their own arbitrary rules be flagged when they hurt the priorities.

#### The calls

- **No fixed cap.** A small helper gets three to six sentences; a normal file a paragraph on
  what it is for and how it fits, plus a gotchas list when there is one; a big file adds a
  walk-through of its main flow, naming the functions in order, as long as it needs; a long
  function gets two or three sentences at the top, and a numbered step list when very long.
- **Keep the existing labels** as the skeleton, rewritten in plain words, plus "How it works" for
  big files and "Gotchas" when there are any. 278 of 298 files already carry the labels.
- **Names of files and functions are allowed inside code comments.** The plain-language rule is
  for what the maintainer reads.
- **Headers never carry counts or line numbers.** A checker verifies that every header is present,
  has its sections, and that every function it names still exists. A script gathers every header
  into one generated map of the code, which replaces a hand-written architecture doc.
- **A header cannot rescue a 1,480-line function.** The giants left unsplit get a "split later"
  roadmap entry so the next maintainer knows it is debt, not design.

#### Passed over

- The original cap: the maintainer flagged it as an arbitrary limit that could hurt maintainability.
- A new header format: it would touch all 298 files for no gain over the labels already there.

### D93 — LOCKED 2026-09-11 — The Deck is the gate; the preview is shelved; device checks are queued

**Raised** when the maintainer asked for a recording of the same check on the Deck and in the
in-IDE preview, and the preview turned out to be stuck on its loading screen.

#### The calls

- **Deck checks at the end of the delete, reshape and explain phases,** and after any merge that
  touches focus. Between those, the automated checks stand alone.
- **Any merge that touches D-pad focus goes to Opus after a device measurement.** Kept even
  though it is slower.
- **The preview is shelved.** It has never got past "Loading plugin preview" on this machine, its
  command channel accepts commands and never answers them, and it produced no image. It is not a
  gate and nothing in the plan depends on it. It is sorted with the other tooling in the docs
  phase, not fixed here.
- **Device checks are queued.** One runner per batch, holding the wake lock, running the ready
  check before every row. The ready check caught a build mismatch on 2026-09-09 before a single
  press.
- **Two tool fixes made on 2026-09-11 stand:** the Deck recorder asks the compositor for its
  video stream by numeric id, because asking by name connects but never delivers a frame; the walk
  tool writes an evidence file only for a named run, and the runs folder is ignored by git. Both
  are uncommitted until the maintainer says, and the plugin-studio server must be restarted to
  load them.

#### Passed over

- The preview as the gate between device checks: it does not load.
- Fixing the preview inside this plan: out of scope; shelved.

### D94 — LOCKED 2026-09-11 — Models and budget: the spawn line at 75%, enforced by a hook

**Raised** by the maintainer's first priority, tokens, and their ask that the one running the
session stop spawning workers before a limit hits and find a good stopping point.

#### The calls

- **Fable at max only for this plan and the review at the end of each phase.** Opus at extra-high
  effort runs each phase, lands, writes the freeze commit and does every behavior-touching step.
  Sonnet at high effort does the lanes, the tooling scripts, the docs triage, the tests, the merge
  step and the bookkeeping. Haiku stays on trial for sorting docs, existence checks and header
  drafts for small files, one batch in five checked by Sonnet, every use logged. Scripts do
  everything mechanical.
- **The spawn line.** The share of the five-hour window past which no new agent may start: 75%
  for a trial, one number in the project settings, changed by the maintainer saying "raise the
  spawn line to N". It is the figure the usage screen shows and it is account-wide.
- **A hook enforces it.** Past the line, a request to start an agent is refused with a plain
  message; the lane in flight finishes and commits; the session lands what is green, writes the
  handoff note and stops.
- **A phase starts only below half the spawn line.**
- **If a script cannot read the usage figure,** the maintainer reads the usage screen once and
  says the number, and the script maps token totals from the local session logs to a percent.
- **Every worker's cost goes into a ledger** from its completion notice.
- **Lanes:** three for behavior-adjacent work, up to six for purely scripted passes. The Workflow
  tool may fan out read-only work to Sonnet or Haiku workers; the maintainer gave that go on
  2026-09-09.

#### Passed over

- Watching the budget by the session runner alone: goodwill is not enforcement.
- Fable running execution sessions: earlier measurement put it behind most limit hits.

### D95 — LOCKED 2026-09-11 — The rules that are enforced by a check, and the list of numbers that may only improve

**Raised** when the maintainer asked what we have learned that can be enforced so the code is
written well from now on, not just cleaned once.

#### The calls

- **A list of numbers that may only get better,** with the 2026-09-09 measurements as the start
  values and the targets in the plan. The verify command fails if any number gets worse. It is
  what keeps the project from drifting back.
- **One verify command** with a quick mode (types plus the tests related to the change) before
  every lane commit, and a full mode (everything plus the build and the snapshot check) at every
  merge. It prints only failures, at most 40 lines.
- **Back-end method names are generated into a front-end type,** so a typo in a call name fails
  the type check instead of failing on the device. The one method nobody calls is deleted; all
  other names stay frozen.
- **Each setting is declared once,** so a new setting stops touching 18 files and 30 places. This
  is its own step in the reshape phase.
- **Only exact copies, and copies where one value differs, are merged on their own.** Anything
  else needs a written decision first.
- **Living docs never carry hand-typed counts or line numbers;** dated audit docs may.
- **A hook refuses a git push** unless a flag is set. **A hook reminds, but does not refuse,**
  when a file over 600 lines is read without a range.
- **Freeze the seams before anything moves; leaves first, roots last; the two back-end cycles are
  broken first.**

#### Passed over

- A hard refusal on whole-file reads: a worker rewriting a file needs the whole file.
- Test-impact analysis for the back end: the whole suite runs in 30 seconds.

### D96 — LOCKED 2026-09-11 — Copies of the repo, and the cost rules for workers

**Raised** by the 36 stale copies of the repo found on disk, the earlier session that started 442
commits behind, and a rule review that cost 130,000 tokens.

#### The calls

- **Prune the copies that are merged, clean and idle,** and delete their merged branches. The
  maintainer runs the script once; it skips anything touched in the last day.
- **The copy helper becomes a permanent script:** create from the current tip with the base
  recorded, list with base distance, prune with the safety rules.
- **All refactor work happens in a copy;** only the landing session touches the shared checkout;
  the merge step refuses a branch whose base is far behind.
- **Worker cost rules:** script the checkable part first and hand the model only the misses; one
  question per worker with the exact lines; a tool-call cap and a token cap in every brief; a
  fixed report shape; continue a worker with a message instead of spawning a new one; batches of
  eight to twelve files per worker; a cheap check before an expensive tool, for example the
  readiness check rather than the open-panel tool to ask whether the panel is open.

#### Passed over

- Shared-cache tricks: pnpm already shares one store across every copy.
- One worker per file: the fixed cost of starting a worker dominates.

### D97 — LOCKED 2026-09-12 (raised 2026-09-11) — The Frame features: four calls, the tips go, the voice shape and the anti-cheat rule

**Raised** by the maintainer's read of [planning/49-steam-frame-features.md](../planning/49-steam-frame-features.md)
on 2026-09-11. The plan listed four calls in its § 5 that were never filed. This entry files them, records the
three instructions the maintainer gave in the same chat, and points to the deeper look in
[planning/52-frame-features-second-look.md](../planning/52-frame-features-second-look.md).

#### Locked 2026-09-11

- **The seven Frame tips ship** (call 2 of the plan). The four old tips go, the seven from § 6 of the plan
  replace them, and the README gets one line saying bonsAI does not run on the Frame and how to use a Deck
  beside it. Shipped the same day; see the roadmap entry.
- **The floating panel follows Steam's own way of drawing over a game, and never touches the game.** The
  maintainer's words: we must not get people in trouble in online games. Best effort. The rules, in full, are
  in plan 52 § 4. The short form: use only SteamVR's official door for panels; never load anything into a
  game, never hook it, never read its memory, never send it input, never copy its picture. This is the same
  position bonsAI already holds on the Deck, where it lives inside Steam's own menu. What we cannot promise:
  each game's anti-cheat sets its own policy. The README says so when the panel ships.
- **Voice follow-ups have a sound cue and stay simple.** After a spoken answer ends: one short rising tone,
  the mic opens for a few seconds, and if the mic hears something it keeps listening until it goes quiet;
  then it matches a handful of words. A short falling tone when the mic closes. No wake word, no menu, no
  confirmation step. The full shape and the open questions are in plan 52 § 3.

#### The calls, locked 2026-09-12

The maintainer's own words: "go with your leans on the 4 items."

1. **The Frame entry's rating.** The study asked for six stars to become two. (a) Re-rate to two, since the
   nine planned entries now carry the work and this entry is only "the tips and the README line", which have
   shipped; (b) keep six and treat it as the umbrella for all nine; (c) close it as done and let the nine
   entries stand alone. **Locked: (c).** The entry has nothing left to do that is not on another line; see
   the roadmap's Done section.
2. **Does bonsAI grow a second way to run?** (the plan's 2.9). The floating panel cannot exist without an
   answer, because today the only way anything talks to bonsAI's Python side is through Decky on the Deck.
   There is no network door. The choices: (a) the PC program carries its own copy of the brain, a second
   implementation that would drift; (b) the Deck opens a small network door and the PC program asks the
   Deck, which must then be awake; (c) the Python side runs on the PC as well, unchanged, with the panel as
   its front, one code base on two hosts. **Locked: find out how far (c) is from true during the PC bench,
   before choosing.** The Python tests already pass on the maintainer's Windows PC, so the backend is less
   tied to the Deck than the plan assumed. Plan 52 § 5 lists what to check. **llama.cpp is not reopened by
   this decision;** that stays a Deck question, as the study said.
3. **Which headset for the tests.** The maintainer has none (2026-09-11). (a) None, pretend headset only:
   answers the panel questions, not the mic or the wrist panel; (b) a Quest with Steam Link, the cheapest
   that behaves like a Frame will; (c) wait for the Frame. **Locked: (a) now, (c) after.** No headset is
   bought for now; the Frame carries the mic and wrist-panel questions when it arrives.
4. **Headline first: build it, or count first.** The maintainer called it the weakest of the nine. (a) Build
   the prompt change as planned; (b) count first: take the answers the answer test already produces, and
   record how often the first sentence already stands alone and how often it leaks a spoiler; build the
   prompt change only if the count is poor; (c) drop it and let Headset mode's "answer for the ear" carry the
   shaped opening. **Locked: (b).** The count is counted first; the prompt change is only built if that count
   comes back poor. The count started 2026-09-12.

**Glance view is shelved (2026-09-12).** The maintainer's own words: "shelve the glanceable view for now.
It's too much UI change and we're not ready for it yet." The drawing and plan 52 § 6 stay as the record for
when it comes back.

#### Passed over

- A settings switch for each sound cue. One switch for the feature is enough; the tones are the feature.
- A confirmation step before a spoken "go on" reveals a spoiler. The word is the confirmation.
- Buying a headset now. Nothing in the next two steps needs one.

### D98 — LOCKED 2026-09-12 — Follow-up questions: tell the model the subject, and call it a partial fix

**Raised** by the device check on 2026-09-07 that closed out wave three's follow-up work
([planning/48-kb-wave-three-session.md](../planning/48-kb-wave-three-session.md) § 8, row W3-R4).
Evidence `runs/plan48-R4-followup-memory.json`. This entry needs the maintainer's answer before the
second half can be built; nothing is being built in the meantime.

#### What happens today

Deep Rock Galactic: Survivor running. Ask *"how do i beat the glyphid dreadnought"*, then ask
*"what about its second phase"*.

The looking-up half works, and works on the device: the right boss's note moves from third place to
first once the plugin remembers what you just asked about. That is exactly what shipped and it holds.

The answering half does not. The reply was about the Dreadnought Twins — a different boss. The
plugin still hands the model three notes, and the wrong boss's note is second in the pile. Its
content reads far more like a second phase than the right one does: health bars drifting apart, both
bosses turning immune while they heal. So the model picked it and wrote about that.

**The lesson, which decides the shape of any fix:** putting the right note first is not enough while
a better-matching wrong note is still in the pile. More ranking will not fix this.

#### One thing to know before reading the options

The remembered subject is not always something the person typed. When a question names nothing the
plugin remembers the name of the top note it attached instead. So any option that tells the model
*"they are asking about X"* can be telling it about something the person never said out loud. That
matters for spoilers: naming a boss is what unlocks that boss's spoilers today, so a remembered name
must not count as naming it unless you want that too. Each option below says what it does about that.

#### The options

1. **Tell the model the subject, leave the notes alone.** The follow-up's instructions say which
   thing the question is carrying on from. The person's question on screen is untouched, as it is
   today. Cheapest of the three, about half a day. The remembered name would **not** count as
   naming anything for spoiler purposes, so nothing gets unfenced that is not unfenced today.
   The risk: when the memory is wrong, the model is now confidently wrong instead of
   accidentally right — today a bare follow-up can still stumble onto the right note.
2. **Narrow the notes.** A bare follow-up with a remembered subject attaches only that subject's
   notes, so no rival note can win. About a day, because "only that subject" has to be defined —
   a boss can have more than one note and a person's follow-up sometimes genuinely needs a
   neighbouring one. The risk: a thinner answer. If the remembered note does not cover what was
   asked, there is nothing else in the pile to fall back on.
3. **Both.** Most likely to answer about the right thing, and the one shape where a failure cannot
   be traced to which half caused it. About a day and a half. Against the repo's own rule of one
   change at a time.
4. **Leave it as it is.** The search half already helps on its own: the right note is at least
   present and first, which it was not before. Costs nothing. The device row stays a half-pass and
   the entry stays open.

#### Measuring it rather than guessing

None of the above can be settled by argument — it depends on which note the small model on the Deck
reaches for. It **can** be measured off the device: the build machine has the Deck's own answering
model, so three boss-then-follow-up pairs run twice under each option would say which shape answers
about the right boss. The answer test cannot do two-turn questions today, so this costs roughly a
day of work before any of the options above are started, and it is the only way to avoid shipping a
guess to a device row that already half-failed once.

#### Measured 2026-09-12, off the device, on the maintainer's "measure it" instruction

Three boss-then-follow-up pairs from three games, three runs each, with the Deck's own answering model
and the library that ships. Every one of the 27 replies was read and judged by hand, and they are all
in `runs/plan48-followup-shapes.json` so the calls can be checked.

| | Answered about the right boss | Words per reply | Seconds |
|---|---|---|---|
| Today, as it ships | **0 of 9** | 87 | 1.24 |
| Tell the model the subject | **4 of 9** | 44 | 0.94 |
| Narrow the notes to that subject | 2 of 9, and neither named the boss | 65 | 1.06 |

**The first row is the finding nobody expected.** Today this does not "often" get the wrong boss. Across
three games and nine tries it got the right one **not once**. The feature that shipped puts the right
note first and the reply is still about something else, every time.

**Broken down by game, telling the model the subject:**

| Game | Right, out of 3 |
|---|---|
| Deep Rock Galactic: Survivor | 2 |
| Ocarina of Time | 2 |
| DOOM Eternal | 0 |

**DOOM Eternal is its own finding, and it limits what any of this can buy.** It failed every way that was
tried — including being handed only the one correct note and nothing else to be confused by. The small
model simply never connected "second phase" to that boss's note. No amount of better searching or better
wording fixes that one; it is the model reading the note.

**Set DOOM Eternal aside and telling the model the subject gets it right 4 times in 6** on the games where
the model can do the job at all. Against never.

**One side effect worth knowing before deciding:** telling the model the subject **halves the reply**, 87
words down to 44, and it comes back a little faster. Shorter is usually better on a 300-pixel column, but
it is a visible change to every follow-up answer, not just the wrong ones.

**Narrowing the notes is out.** It scored worse, and its two near-misses got the facts right without ever
naming the boss, which is not what a person asked for. The idea that the rival note was the problem turns
out to be only half true: with the rival gone the model still did not reliably answer about the right one.

**One thing that never failed:** in all 27 tries, under every approach, the right note was attached and
available to the model. The searching half of this feature works. The reading half is where it goes wrong.

#### The lean, now that it is measured

**Ship "tell the model the subject", and say plainly that it is a partial fix.** It takes a feature that is
wrong every single time to right about two times in three where the model is capable at all, it costs
nothing extra, it never removes a usable note, and it leaves spoilers exactly as they are. It is also the
smaller of the two changes.

**But do not call it fixed.** Four in nine is not a feature a person can rely on, and one game in three is
beyond reach of anything on the search side. If the standard is "a follow-up answers about the thing you
just asked about", that standard needs a bigger answering model, not more work here.

**Untried, if neither is taken:** put the remembered name into the words the model reads, so it sees "what
about the glyphid dreadnought's second phase" while the person still sees what they typed. That is a
stronger version of telling it the subject and was not measured.

#### Locked 2026-09-12

The maintainer read the measurement above and approved the recommendation in the maintainer's own
words: *"i approve your recommendation"*.

- **Ship "tell the model the subject."** One sentence in the prompt, on a bare follow-up that used the
  remembered subject, naming the thing the question carries on from. The wording and its position are
  exactly what was measured, including the closing line saying the reminder is not the user naming that
  thing themselves — which is the spoiler safeguard and stays in plain sight in the prompt.
- **Narrowing the notes to the remembered subject is rejected.** It scored worse (2 of 9 against 4),
  and neither of its two near-misses named the boss at all.
- **It ships described as a partial fix, with its numbers**, in the code and in the roadmap. Wrong every
  time before, right four times in nine after. Nobody is to read this entry later and think it was fixed.
- **DOOM Eternal stays broken and that is accepted for now.** The small model failed there every way
  tried, including being handed only the correct note. Closing that needs a bigger answering model, not
  more work on the search. If the standard is "a follow-up always answers about the thing you just asked
  about", this does not reach it and no amount of search work will.
- **A device check is owed** before this counts as done, and the shorter replies are part of what gets
  looked at: telling the model the subject roughly halves the answer, 87 words down to 44.
- **The untried idea stays untried** unless someone asks for it: putting the remembered name into the
  words the model reads, rather than adding a reminder beside them.

### D99 — LOCKED 2026-09-12 — After the Frame bench: two "not yet", reading aloud goes with a three-way setting, and a Clear button in the session context strip

**Raised** by the recap of the SteamVR bench ([planning/53-steamvr-bench-findings.md](../planning/53-steamvr-bench-findings.md))
on 2026-09-12, which put three things in front of the maintainer. Their answers, in their own words: *"1. not yet 2. not yet
either 3. yes, add this to the feature: a slider for default voice replies: off by default, only when the user uses voice for a
question, always. Also add a feature to roadmap: clear session context button in the session context strip."*

#### The calls

1. **The second way to run: not yet.** D97 call 2 is now priced (plan 53 § 3: the plugin's Python side already starts and answers
   on a PC; what is missing is a small starter program, a way for a panel to reach it on the same machine, and PC-shaped answers
   for three edges). The lean stays "the same Python side on the PC too". Nothing is built. The six-star roadmap entry stays open
   with the price on it.
2. **Headline first: not yet.** The count stands (2 of 10 first sentences stand alone, 0 of 10 give anything away; poor, so the
   D97 rule says build). The build waits for a separate go. When it comes, the first step is still to count the 2026-09-07
   answer-first run the same way, since it may already be the change.
3. **Reading answers aloud goes.** Phase 1 as locked in D74: the Deck's own voice, no download, the Read aloud button, the spoken
   spoiler phrase. Build order is plan 42 § 8; the first two Deck checks (rows 01 and 02) ran the same evening, results in plan 42
   § 11 and the testing doc.

   **The setting changes shape.** D74 call 2's on/off switch ("read new answers on their own when the menu is closed, off by
   default") is replaced by one three-position choice, **Voice replies**:

   | Position | What a person gets |
   |---|---|
   | **Off** (default) | An answer is read only when the Read aloud button is pressed. |
   | **When I asked by voice** | An answer to a question that came in through the mic is read out on its own. Typed questions are not. |
   | **Always** | Every answer is read out on its own. |

   Two things taken as read, each one line to change if wrong. *"On its own" means as soon as the answer finishes, whether the
   menu is open or closed*: D74's "when the menu is closed" wording is dropped, because the middle position covers the person
   who is not looking at the screen, and "always" is taken at its word. *The control is the three-button row the input
   persistence setting already uses* (three short labels side by side, a description under the chosen one), not a Steam slider:
   nothing in the plugin uses a real slider today, and that row already has its D-pad handling. The maintainer's word was
   "slider"; a three-position slider reads the same to a person and can replace the row later if they prefer it.

   This is the signal Voice follow-ups (D97) hangs off: the middle position is exactly the case where the mic should reopen
   after the answer is read. A three-valued setting costs the same plumbing as a boolean, about eighteen files (CLAUDE.md).

4. **A Clear button in the session context strip, filed as a two-star feature.** What a person notices: the **Session context
   (N turns)** bar under the chat gets a small **Clear** at its right end. Pressing it asks once, the same box the Settings tab's
   *Clear cache* uses, then the chat, the strip and the plugin's stored answer are cleared and the next question starts a new
   session. It only shows when there is something to clear, because the strip itself only appears once a turn has context.

   **One thing it must do that the Settings button does not do today.** The plugin remembers the subject of the last strategy
   question so a bare follow-up ("what about its second phase") can carry it forward (D98). That memory lives in the Python
   side and is dropped only when the game changes or the plugin restarts; the clear-session call never touches it. So after a
   clear, the first follow-up could still be about a boss from the cleared chat. Both Clear buttons get that forget in the same
   change.

   **Open, with a lean:** whether Clear here means the whole session (chat and all, as *Clear cache* does) or only the context
   handed to the model while the chat stays on screen. *Lean: the whole session.* One meaning for "clear" everywhere, and D32
   already settled that a cleared session is a new session. The lighter one is written only if the maintainer asks for it.

   Why it goes in the strip: the strip is where a person sees what the model was given; the way to reset it belongs beside it,
   not two tabs away in Settings. It needs a focus-graph entry and the modal return-focus registration the Settings button has.

#### Passed over

- A fourth position, "only when the menu is closed" (D74's old switch). Folded into Always.
- A per-answer "do not read this one". Stop is the button for that.
- Building the second way to run or Headline first "since the bench is warm". Both are the maintainer's to start.

---

### D100 — LOCKED 2026-09-13 — The maintainer watches the budget by hand; the automatic stop does not hold up the work

Raised on the first day of the clean-up. Nothing on this machine can read the usage figure the
usage screen shows, so the automatic stop that was meant to refuse new workers past three
quarters of the five-hour window has nothing to read. The maintainer's call: **they watch usage
themselves and say when to stop.** The work does not wait for the automatic stop to be made to
work.

This narrows D94 rather than replacing it. What still holds from D94: the three-quarters line
is still the line, the number still lives in one place, and the maintainer can still move it by
saying so. What changes:

- The stop is still built and still refuses to start a worker when it *can* read a figure. When
  it cannot, it allows the worker and says once that the budget is unknown.
- Nobody has to read the usage screen and type a number in to unblock a phase. Item 8 on the
  maintainer's list in the plan is dropped for now.
- The rule that a phase only starts below half the line becomes the maintainer's judgement
  instead of a check.
- Sessions keep the habits that make an early stop cheap anyway: each worker saves its work in
  its own copy of the project, and every stopping point gets a handover note.

Revisit if a way to read the figure turns up.

---

### D101 — LOCKED 2026-09-13 — Clear the seven old copies; the sorting list is approved

Two calls made together on the first day of the clean-up.

**The seven old copies of the project go.** Each held edits that were never saved anywhere, from
late August. All seven were checked against the plugin as it is today before anything was touched.
Six were chasing bugs that have since been fixed, several of those confirmed by pressing real
buttons on the Deck, which is stronger proof than the copies ever had. Two of the seven contain a
way of moving the model order list with the D-pad that was tried, tested on the device, found to
rewrite a person's list while they were only scrolling to read it, and ruled out in writing at the
time. Rescuing that would have quietly undone a decision already made on the device.

One idea in them was genuinely missing from the plugin: inside the models hub, pressing up at the
top of the tier choices or down at the bottom of the advanced switches does nothing instead of
hopping to the neighbouring group. It is filed on the roadmap so it survives the copies going.

**The sorting list is approved as it stands.** Of 121 write-ups: 66 stay, 44 are finished and go to
the archive, 9 were replaced by something newer and go to the archive, and 2 never happened and go
to the archive with a date to delete them after. Of the helper scripts: 63 stay, 10 are finished, 1
was abandoned. Of the 464 saved device runs, the 154 that a test row actually cites are kept as
evidence and the other 310 leave the project; they came from a bug that saved one on every run.

Six of the list's entries could not be judged by reading them and were settled against the project
itself rather than put to the maintainer. Two proved finished: the big main-screen redesign, whose
second half did ship, and the list of planning questions, every one of which already has a written
answer. Four stay open: the bugs in the Deck tooling this project does not own are all still
unfixed, per-game troubleshooting tips are still stuck on the plugin having no way to tie a tip to
one game, the list of testing jobs that need a person is a list of kinds of work rather than tasks,
and the automatic checks on pushed code really do still only warn rather than block.

Nothing here is deleted outright today except the seven copies. Everything archived keeps its
delete-after date in the archive index, and deleting any of it is a separate yes.

### D102 — LOCKED 2026-09-13 — Look before deleting: the older ask path, the answer checker, and the four packages all held

Three calls from the clean-up's measuring phase. All three are holds, and none of them stops the
delete phase — each simply drops out of it.

**The older way of asking the AI stays for now, and we looked for a use for it.** There are two ways
in the back end to ask a question about a game: one answers straight away, one starts the answer in
the background. The plugin only ever uses the background one. The older one is 44 lines, and it is
not a second copy of the answering logic — both ways hand off to the same shared piece. Looking for
anything that might want a one-call ask turned up nothing. The plugin does not. The tests do not.
The tool that puts a question on the Deck for testing does not, and would not: it types the question
and then deliberately stops short of pressing Ask, because the point of that tool is that what gets
tested is the real path a person uses. Reaching past the screen is what it is written to avoid.

So no use for it turned up. The one thing that would change that is wanting to ask the plugin a
question from a script — a nightly check, or comparing models without sitting in front of the Deck.
That is a real thing to want and this is most of the plumbing for it, but it would be a feature
built on purpose, not 44 lines kept on the chance. Re-check at the end of the clean-up.

**The answer checker stays, and the way to find out if it is worth having is to run it quietly.**
The plugin has a piece of back-end code meant to catch a reply that looks made up. It works, it has
its own test, and it has never once run: the field it fills is fed by a value nobody supplies. It
has three rules. Checked against every saved device run in the project — 412 of them — the rule
about a reply naming a store number for a game that was never attached would have fired zero times,
and the rule about a reply claiming certainty needs one exact phrase that appears nowhere in
anything this project has ever recorded. The third rule is the real one: it catches the AI being
asked for a power-tuning suggestion and not giving one. The plugin already spots that today and
writes it to the log, so what the checker would add is telling the person rather than only the log.

There is also a fourth part, which asks a second AI model whether the first one's answer looks made
up. That is an extra model call for every answer, on a handheld, and it is the expensive half.

The cheap way to settle it: switch on the three rules so they only write to the log. Nothing on
screen, no second model, nothing a person would notice. Leave it through normal use for a couple of
weeks and count what fires. That turns the question from a guess into a number, and the counts above
are the baseline it gets compared against. Filed on the roadmap; it is a small feature, not clean-up.

**All four unused packages wait for a build.** The checking tool lists six packages the project says
it needs but never imports. Two of those it is simply wrong about: our own measuring scripts run them
as commands rather than importing them, which the tool cannot see. Of the remaining four, two look
plainly dead — the old name of the Steam Deck interface library, which the project has moved off, and
type definitions for a bundler this project does not use. The other two are riskier: a helper library
for older-style compiled output, and the Linux build helper for the machine that actually builds the
plugin. Nothing imports a build helper by name, so "unused" tells us nothing about it.

Rather than split the four, all of them wait until there has been a build and the plugin has started
on the Deck. Removing two now and two later means two chances for a build to break instead of one,
for no gain — the build has to happen either way.

### D103 — LOCKED 2026-09-14 — Spoiler rules: close the four gaps, one lane, send the screen what the back end already knows

Three calls from plan 54, all yes. The rulebook is in the code and working; the four gaps are at
the edges, and this settles how to close them.

**A no-story game named only in the question gets the relaxed prompt.** With nothing running, a
question like "drg survivor what class" already gets the right risk chip, because the plugin worked
out the game from the words. The answer was still fenced, because the prompt was written as if the
game were unknown. Now the prompt is handed the same profile the chip already has. It is still never
handed the name, so the answer never claims a game is running when none is. Story games change
nothing, since unknown and story get the same careful wording.

**The screen gets the boss name from the back end instead of guessing again.** The back end works
out what the player named on every turn, and understands the ways people actually type it on a
controller. The screen had its own smaller guess and never saw the back end's. From now on the ask
result carries the named thing next to the "spoilers were okay" flag it already carries, and the
screen uses that first, falling back to its own guess only for chats saved before the change. One
guess to maintain, and the two sides cannot drift. Copying the back end's guess into the screen's
language was the other option and is rejected for that reason.

**Go on the lane.** One Sonnet lane at high, both screen-side gaps in it since they touch the same
files, the prompt gap in the same lane, then the bookkeeper's docs sweep, then one Deck evening for
the rows that have sat unticked since August plus the two new ones in plan 54. About a day of code.


### D104 — LOCKED 2026-09-15 — The third bug-fixing session: what is in, what waits, and the Deck pass that follows

Eleven calls from [plan 55](../planning/55-bugfix-session-three.md), ten answered, one still open.
The session does not start until the maintainer says go. It runs in a fresh session on **Fable 5.1 at
extra-high effort, by the maintainer's choice**, with Sonnet 5 lanes at high. The routing table asks
for Opus here, since nothing in the session is above three stars; the maintainer knows that and chose
Fable anyway, so it is recorded as their call rather than a slip. Two things follow. The bookkeeper
guard will refuse the session's own edits to the roadmap, the testing documents, the changelog and test
files, so all of those go through the bookkeeper helper. And the effort stays at extra-high, not max,
because max is what ran earlier Fable sessions into the usage limit.

**Wait for plan 54 before anything starts.** Four of the files this session's fixes need are changed
in plan 54's copy of the repo, and that lane has not committed yet. The maintainer will say when to
proceed. Nothing here touches that copy.

**Opening the panel with nothing highlighted: the device decides.** The guide says the ring being
unowned on open is normal Steam behaviour and not ours to fix; the roadmap has it as an open bug. One
time-boxed try at placing the ring on the chat's first useful stop. If it holds, the guide changes; if
Steam fights it, the roadmap entry closes as accepted.

**The technical line under screenshot answers goes.** Every answer to a question that carried a
screenshot ended with a line of computer text. Gone from the reply; the count lives only in a log line
when verbose logging is on.

**Wiping all plugin data is pre-authorised for the last step of the Deck pass.** Three rows have waited
on it since 5 September. Backup first, restore after, settings read back off disk and compared to the
backup. The maintainer will be away for hours, so no message-and-wait this time.

**Plan 54's Deck rows run in this pass** if it has landed and deployed by then and they are still open.

**One library point release is fine**, carrying the Megaera title fix and nothing else.

**Games may be launched and exited by the rig as needed.** Hades, Deep Rock Galactic: Survivor,
Portal 2 and Black Mesa are believed installed; each is confirmed on the Deck before a row relies on it.

**The five August knowledge-base rows are run, not retired.** Each row says whether it is still a real
check or stale, and the maintainer retires the stale ones from that.

**A fresh Fable session runs it**, reading plan 55 from block 0.

**The settings-list refactor is out for now.** The screen-side settings code writes out its list of
fifty-odd setting names seven times, so a new setting can quietly stop working in one place; folding
that into one table is protection for the next setting anyone adds, not something a person sees today.
The maintainer read the explanation under question 2 in plan 55 and said no for this session. It stays
on the roadmap.

**Still open.** Whether anyone else will be driving the Deck: unknown until plan 54's session has
finished, and the pass needs the Deck to itself.


### D105 — LOCKED 2026-09-15 — The fourth feature session: two features drawn instead of built, the Spy's reveal, the lighter Clear, and the wipe

Eight calls from [plan 56](../planning/56-feature-session-four.md), all answered the same evening.
The session does not start until the maintainer says go. It runs on **Fable 5.1 at extra-high
effort, by the maintainer's choice**, with Sonnet 5 lanes at high, five at most at once, the same
shape as plan 55. With the five-star entry dropped (below), nothing left in the session is above three
stars, so the routing table would ask for Opus here; the maintainer knows and chose Fable, recorded as
their call. The bookkeeper guard keeps the session's own hands off the roadmap, the testing documents,
the changelog and test files; the bookkeeper helper does that typing.

**Session context folding into Show details is drawn, not built.** Its shape was never decided — row,
tab or section inside Show details; per-turn or newest-only; how the D-pad climbs back out; what the
collapsed label says — and it shares files with two of the session's lanes. The maintainer chose to
see the options side by side, at true size, on a mockup page produced at the end of the session, and
to answer the four questions by looking.

**The reasoning display is dropped from this session and drawn on the same page.** Every build call
from 5 September still stands (three live lines at the answer's size, the fold with the seconds only,
live in Strategy mode with one confirm, saved and capped, a chip in Show details, the thinking tips
entry retired). What the 5 September decision left to the maintainer's eye — whether the folded line
works in a character's voice — is exactly what the mockup shows: the live lines filled with real
thinking captured from the Deck's own model on the PC, the plain folded line, and the folded line in
three characters' voices. Nothing is built until they have looked. The spoiler-verdict second job
waits with it.

**The Spy's reveal is a line under Show details.** Nothing in the answer itself: no hidden confession
block at the end (rejected: it puts the joke's answer in the reply), no *Was that true?* button
(rejected: a second model call on a handheld). Show details gains one chip whenever the Spy was on at
a lying level; its body says he was on and lists what he lied about, from a closing tag the model is
told to write. When the model forgets the tag, the chip still appears and says he did not confess, so a
person always learns he was on even when not what he lied about.

**The Spy lies only at the two heaviest accent levels**, the same gate Pyro's bad advice uses. Below
that he stays the smooth honest voice he already is. The floor is Pyro's and is not negotiable: nothing
that can damage the Deck, lose a save, cost money or turn off a protection; wasted time only. The
destructive-advice guard keeps running on his replies.

**The trick where the Spy opens claiming to be a different character is deferred** and becomes its
own roadmap entry. A character has no first message today, so the trick needs a greeting feature
first; that is work in its own right, not a line of prompt text.

**Found on the way, corrected in the roadmap's detail note:** the Spy has been in the character picker
since June, as an ordinary smooth voice. The note saying he was not there yet was wrong when written.
The picker does not change; the feature is the lying and the reveal.

**Clear in the Session context strip means only what the model sees.** The 12 September decision
leaned to the whole session; the maintainer chose the lighter meaning tonight. The plugin sends no chat
history to the model, so what it carries from one question into the next is the subject of the last
strategy question (for a bare follow-up) and the strategy checklist position for the running game. The
button, after the same confirm box Clear cache uses, forgets both and says so with a short toast; the
chat stays on screen and the bar's rows stay, because they are an honest record of what each past turn
attached. Clear cache in Settings gets the same forget in the same change, which closes the gap the 12
September decision named.

**The wipe is pre-authorised for the last step of the Deck pass**, backup first, restore after,
settings read back off disk and compared. The maintainer was told plainly that it also removes the
Deck's own Ollama and every model it downloaded, which the restore cannot put back, and said yes. It
runs after every other Deck check for that reason, and the report says exactly what is gone.

**The Deck is this session's.** The live remote connection from another process seen at 23:44 UTC is
a leftover.

**The dead space above the question box is measured first, and fixed only if one cause is named.**
The honest gain is about 56 pixels of gap and overflow, not the 61 the roadmap implies, because the
chat already scrolls and nothing caps a long reply. If the measurement finds no single cause, the entry
stays open as measured.

**What follows, in one line each.** Seven of the nine build in this session, in five Sonnet lanes plus
two measured items; two go to a mockup page; the roadmap entries for the reasoning display, the fold,
the Spy and the Clear button are reworded to match tonight's calls; a new entry holds the deferred
Spy trick.

### D106 — LOCKED 2026-09-16 — After the fourth feature session: the plain reasoning fold first, the session as a tab, the card's six rows, a Read aloud button, and one call left open

The maintainer's answers to the session's closing report ([plan 56](../planning/56-feature-session-four.md)
§ 10, entry 4), given in chat on 2026-09-16 with the mockup page open
(https://claude.ai/artifact/2De58qirE34754PEZVPmdb). Six items; five are calls, one is a question the
maintainer chose to leave open on purpose.

**1. The Ask bar that looked cut off was not the plugin.** The Deck had been drawing the panel at the
external monitor's size; when the monitor was unplugged the panel kept that size until Steam was
restarted, and the restart put it right. The session's own measurement on a fresh open agrees: nothing
was clipped. No entry, nothing to build; recorded so the next person who sees it knows to restart first.

**2. Whether the settings card keeps the typed words after a jump is left open, on purpose.** Today,
pressing A on a row opens the Steam setting and the words in the box are gone when the person comes
back. The maintainer is not sure yet which they want. The roadmap entry says so and does not wait on it:
the card is done as measured, and nobody builds either behaviour until this is answered.

**3. The card's six-row cap on the built-in screen stays.** The card shows up to eight rows but never
more than fit under the tab bar, which is six on the Deck's own screen, and names the rest as "N more"
in its heading. The maintainer looked at it and called it fine.

**4. The reasoning display builds with the plain folded line; the voiced fold comes later, as an
option.** The first version is what the 5 September calls (D70, D71) already describe, with the fold
in plain words: three live lines at the answer's size while the model thinks, then one folded line with
the seconds when the answer starts, and a press on that folded line opens the whole reasoning, the
"opened" block on the mockup page. The folded line in the character's own voice, which the page showed
in three voices, is not dropped: it becomes its own later entry, an optional extra on top of the plain
fold, built only after the first version is in and looked at. The spoiler-verdict second job waits
with the first version as before.

**5. Session context folds into Show details as a tab within the panel, option B on the page.** As
drawn: the opened Show details panel gets two tabs at its top, *This answer* and *Session · N*; Left and
Right switch between them; the chip row and its body stay where they are; only the newest turn shows
the Session tab, so it never repeats; the collapsed row still says *Show details*; Up from the tabs goes
to Hide details and then Read aloud, Down goes into the chips, and B anywhere inside closes the panel.
Those details were part of the drawing the maintainer picked, so they carry with the pick. One thing
the page did not draw: where Clear sits inside the Session tab. The builder puts it at the end of that
tab's body, the same button with the same confirm, unless the maintainer says otherwise.

**6. New: Read aloud becomes a button with a speaker icon on the Helpful row.** Today Read aloud is a
full-width dividing line above Show details, the same shape as Show details. The maintainer does not
want a second dividing line: Read aloud should be a small button with a speaker icon, on the same row as
Helpful and Not really. Filed as its own roadmap entry, two stars, with what it must keep: a real D-pad
stop, Left and Right along the row, the label flipping to Stop while the Deck is talking, and the
greyed-thumbs step-over from this session must not skip the row once Read aloud lives on it.

**Consequence.** The roadmap's reasoning-display entry moves from "drawn, call owed" to ready to build
with the plain fold, plus a new entry for the voiced fold; the session-fold entry and its open-questions
note record option B and the one Clear detail; the settings-card entry records the six-row call and the
open words-after-jump question; a new entry holds the Read aloud button. The three advice-first replies
the maintainer asked to read are written out in full in
`docs/test-evidence/plan56-KB-ANSWER-03-three-replies.md`, copied from the saved chats in the pre-wipe
backup; that read is still theirs to give.

### D107 — LOCKED 2026-09-16 — Third round: the three replies read well, the card's words stay cleared, the honesty line seen on screen, and five new entries from the maintainer's own hour with the AI models screen

The maintainer's answers to D106's two open items, given in chat on 2026-09-16 in the afternoon,
plus five new reports from their own use of the Deck the same day. Before writing, they had put the
Deck back the way the wipe found it: Ollama installed on the Deck again with gemma4 and
nomic-embed-text, and the knowledge base downloaded again.

**1. The three advice-first replies read as advice-first.** The maintainer read all three (written
out in full in `docs/test-evidence/plan56-KB-ANSWER-03-three-replies.md`) and said they look good.
That closes the read the row had waited for since 12 September. The roadmap entry moves to Done.

**2. The settings card keeps working the way it does today.** The box is empty when a person comes
back from a Steam setting opened through the card. D106's open item is closed; nothing about the card
is owed.

**3. The honesty line, seen on the Deck's own screen.** The check D106 said was owed ran the same
afternoon on the plan 56 build, with nothing running: *black mesa how do i tame a horse* ends with
"— No close match in my notes, this answer leans on the model's own knowledge." and *how do i beat the
gonarch in black mesa* ends with the note's advice and the follow-up menu, no line. Lane K's fix is
confirmed on the device (`docs/test-evidence/plan56-HONESTY-LINE-03-on-screen.json`). The horse reply
took 151 seconds on the Deck's own model, and the footnote under it reads "150.8s (>60s): prefer GPU
for Ollama, not CPU" in full, so the "blank names" note plan 56 logged from a page read was the reader
splitting the bold words, not the plugin. That note closes as not a bug.

**4. New bug, fixed the same afternoon: the Ollama tab's "Open AI models…" button read like "OpenAI
models."** It now says "Manage AI models…", with the policy tier after the dash as before; the
button's spoken label, the hint inside the picker and the troubleshooting guide say the same. Commit
`79b1a0e`, deployed to the Deck the same afternoon.

**5. New bug: the AI models screen shows about two rows of the model list on the Deck's screen.**
Read in the code, not yet changed: the screen's body is capped at 520 pixels tall (or 72 percent of
the screen if that is smaller), and the parts above the list that never scroll away — the three
section buttons, the counts line, the custom tag box, the Suggested chips, two rows of filters and
the column headers — take about 430 of those, leaving roughly 90 pixels for rows. An external monitor
taller than about 720 pixels gets the same 520 cap, so it looks the same there, which answers the
maintainer's question. The popup itself has room: on the Deck's screen it stands 640 pixels tall. The
fix belongs with item 7's rework of that screen, or before it as a taller list. The maintainer's
recording is `recordings/DeckRecord_20260916_114238_game.mkv` on their PC (the folder is not in the
repo). Two stars.

**6. New bug: after the AI models screen was closed by a tap outside it, the queued models started
downloading and the D-pad could not move in the Ollama tab afterwards.** The maintainer did not
press Done; they think they tapped outside the screen. Two things read in the code, neither proven
on the device: a tap outside closes the popup through Steam's own path, which skips the plugin's own
clean-up (the tab restore and returning the ring to the button that opened the screen), so nothing
owns the ring afterwards; and the last frame of the recording shows the Pull selected button lit, at
the popup's bottom edge, so a tap meant for outside may have landed on it and started the queued
download. Needs a device reproduction with an empty queue, so nothing downloads. Two stars.

**7. New feature: retire the policy tiers as their own section and roll them into the filters at the
top of the AI models screen, and rework those filters.** Mockups first: the maintainer wants to pick
and choose what goes up there for people to filter by when they pull models. Not drawn yet; the page
would be drawn at the Deck's own screen size like the plan 56 page. Three stars.

**8. New bug: Download knowledge base needed two taps; the first did nothing the maintainer could
see.** Read in the code: the first press should open the storage choice popup (internal or SD card)
before anything downloads, and the second tap is what ran the download. Not reproduced; needs a run
with the plugin log on. One star.

**Consequence.** The roadmap: the advice-first read entry and the honesty-line entry move to Done;
the settings-card entry has nothing left owed; the blank-names note closes as not a bug; four new bug
entries and one new feature entry; a changelog line for the rename. The testing rows for the
advice-first read and the honesty line close.

### D108 — LOCKED 2026-09-16 (raised 2026-09-16) — Building the reasoning display: five small calls before the build session

Raised from [plan 57](../planning/57-reasoning-display-build.md) § 7, the build plan for the plain
first version of the reasoning display (the shape is already locked: D70, D71, D106). The plan had
six open items with defaults. The maintainer closed the first the same day: the Deck has its Ollama
and its models back after the plan 56 wipe, so the Deck rows can run on the Deck's own model. One
thing to check before those rows: the knowledge base on the SD card was wiped too, and two of the
rows ask a Strategy question that uses its cards, so it needs to be downloaded again first.

The five left, each with the options and the planner's lean. None of them stops the build from
starting; the defaults are the leans.

1. **What the one-time notice says**, the first time Thinking is moved off Off.
   - Option 1 (lean): two sentences and a question. *"While the AI thinks, its thinking shows on
     screen as it happens. It is not checked for spoilers, so it may mention things the answer
     itself will hide. Show it?"* Buttons: *Show thinking* and *Keep it off*. The spoiler part is
     said in as many words, which is the whole reason the notice exists.
   - Option 2: one line. *"Thinking shows on screen as it happens and is not checked for spoilers.
     Show it?"* Same buttons. Shorter, but "not checked for spoilers" is easy to read past.
   - Option 3: no confirm; a line of help text under the Thinking row only. This reopens D71,
     which chose the confirm, so it is listed for completeness, not recommended.

2. **What happens when the person declines the notice.**
   - Option 1 (lean): Thinking stays Off, nothing else changes, and the notice comes back the next
     time they move it off Off. Nothing to remember, nothing new to build.
   - Option 2: Thinking turns on anyway, but the live lines stay hidden; the stock phrases fill the
     wait and only the folded line shows once the answer starts. The person gets the thinking
     without the live spoiler risk. It is a fourth state to build and a hidden preference to store,
     and the fold still opens to unmasked text, so it only half solves what it sets out to.
   - Option 3: declining means never ask again and stay Off. The person would have to find out on
     their own that the row is dead. Not recommended.

3. **A turn where the model thinks but writes no answer.** The plugin already asks the model to go
   on when it runs out of room; if nothing comes, today's error line shows.
   - Option 1 (lean, for this version): no fold on such a turn. The fold appears only above an
     answer. Keeps the build to the states already drawn.
   - Option 2: the fold shows beside the error line, so an empty reply explains itself. Useful, and
     it answers the maintainer's "paid for and thrown away" point for exactly the turn where the
     thinking was the only thing paid for. But the fold and the error line have never shared a
     turn on screen, so it needs its own drawing and its own Deck row. The lean is to file it as a
     small follow-up entry once the fold exists, not to fold it into this build.
   - Option 3: show the reasoning as if it were the answer, marked as such. Confusing; a reader
     would take the model's notes for advice. Not recommended.

4. **How much saved thinking a turn keeps.** D70 said "a few thousand characters". The deepest level
   reserves about 4,000 characters' worth, and a go-on request can add more.
   - Option 1 (lean): 6,000 characters. A whole Deep think fits, with room for the go-on. Eight
     chats of two hundred turns each would add at most a few megabytes on disk, which is fine.
   - Option 2: 4,000, the number plan 56's contract used. Cuts the tail of a Deep think now and
     then.
   - Option 3: 12,000. Never cuts in practice, but an opened block that long is a scroll problem on
     the Deck's screen, and the live view only ever shows the newest lines anyway.
   - If a think is cut, the lean is to keep the end, not the start: the last sentences are the
     ones that led to the answer. A one-line note at the top says the start was cut.

5. **Order against the session-context tab**, the other Show details change from D106. Both change
   the same transcript file.
   - Option 1 (lean): the reasoning display first, on its own, this plan; the tab in its own
     session after it has landed. The reasoning display is the bigger piece, has the desk test and
     the device measurement in front of it, and the tab would otherwise sit waiting on the shared
     file the whole time.
   - Option 2: the tab first. It is three stars and smaller, so it would land sooner; the
     reasoning display then builds on top of the new panel. Costs the reasoning display another
     wait, and it has already waited since 5 September.
   - Option 3: both in one session, one after the other on the shared file. Saves a session start,
     but makes a long session on the model tier that hits the usage limit most, and a limit hit
     mid-way leaves the second piece half done.

**Consequence if unanswered.** The build starts on the leans: option 1 for every item. Nothing in
plan 57 waits on this entry except that the knowledge base check joins the Deck check before the
Deck rows.

**Answers, 2026-09-16 (the maintainer answered in chat):**

1. **Option 2: the one-line notice.** *"Thinking shows on screen as it happens and is not checked
   for spoilers. Show it?"* Buttons *Show thinking* and *Keep it off*.
2. **Option 1.** Declining leaves Thinking Off; the notice comes back the next time.
3. **Option 1, with a worry attached.** No fold on a turn with no answer in this version. The
   maintainer is worried about how often a thinking model will think and then write nothing, and
   does not want turning thinking on to make the plugin worse to use. So the build session measures
   it before the screen step: the existing answer test runs on the PC with Thinking at Balanced and
   at Deep, and counts the replies that came back empty. If any level comes back empty more than
   about one time in twenty, item 3 flips to option 2 inside this build (the fold shows beside the
   error line, so the person can at least see what the model did), and the cause goes on the
   roadmap as a bug. Plan 57 § 3a carries this as T5.
4. **Option 1.** 6,000 characters, the end kept when cut.
5. **Option 1.** The reasoning display first, alone; the session-context tab after it has landed.

**Consequence.** Plan 57 § 7 records the answers; § 3a gains the empty-reply count; the roadmap
entry is unchanged (still ready to build, calls locked).

---

### D109 — LOCKED 2026-09-16 (raised 2026-09-16) — The open tab strip redesign (Claude Design board 2a): approve the drawing, and three small calls

Raised from [plan 59](../planning/59-tab-strip-redesign-build.md), the build plan for the design
Claude Design handed back on 16 September, answering the brief of 14 September
([design/handoffs/tab-bar-open-strip/](../design/handoffs/tab-bar-open-strip/)). The returned files
are in that folder under `return-2026-09-16/`. Board 2a is the one the design says to build: six
equal cells, every icon the same 22px size, only the current tab's name shown under its icon in
small capitals, a soft fill on the lit cell with no box, LB and RB as pills, a solid bar with a
shadow. The thin bar at rest is unchanged. Nothing about how the bar behaves changes.

None of these stops the build from starting. If unanswered, the build starts on the leans.

1. **Approve board 2a as the design.**
   - Option 1 (lean): **yes, build 2a as drawn.** A yes also settles the two-star roadmap entry
     "replace the bonsAI tab icon with the redesign's" for the strip: the design puts the
     production logo, tinted in the accent, on the Main cell, and that entry asked for a shape the
     maintainer approves by eye. The board is that shape. The plugin's icon in Decky's own list is
     not part of this.
   - Option 2: a different board from the same file (1b to 1g). Each is drawn at 300px with its
     values; plan 59 would need its § 3 and § 5 rewritten for the chosen one.
   - Option 3: send it back to Claude Design with notes. The designer's own note says the three
     Deck photos never uploaded, so its "today" board is a reconstruction; a second round with the
     photos attached would let it true that up. Board 2a itself was drawn from the code's values
     and the real icon files, so this is optional, not a defect.

2. **What the name says under Permissions and Developer when they are the lit tab.** The design
   only ever shows "main" and "settings" lit, and its own note calls "settings" the longest name,
   which is only true if the two long tabs use short words.
   - Option 1 (lean): **"perms" and "dev", always**, at five tabs and at six. The thin bar at rest
     keeps saying Permissions and Developer in full, as it does today. Plan 30's "shorten only at
     six tabs" rule goes, because there is no longer a row of six names to fit.
   - Option 2: the full words "permissions" and "developer". At 9.5px bold they run about 10px past
     each side of their cell, five times the 2px the design allows for "settings". The name sits in
     the lower band, where the neighbouring cells have no name, so nothing collides; it just looks
     wider than its cell.
   - Option 3: today's rule, full words at five tabs and short at six. Keeps the switch between two
     spellings that the rest bar never makes, for a fit problem that no longer exists.

3. **The strip's height.** The brief allowed a taller strip that covers the whole chat row. The
   design kept 54px and added a shadow below the bar that darkens the half-pixel of the chat row
   still showing under it.
   - Option 1 (lean): **54px as drawn; check on the Deck; if the row's dots still peek out, 56 in
     the same build.** One number. The design's own board 1b used 56, so the look holds.
   - Option 2: 56px from the start. Covers the row outright; two more pixels of the answer area
     hidden while the strip is open, which is only while the D-pad is on the bar.

4. **The fallback if the small capitals look too small on the Deck.** Steam's font most likely has
   no true small capitals, so the browser makes them by shrinking full capitals. That can land the
   visible letters near today's 8px, which was the complaint.
   - Option 1 (lean): **plain capitals at the same 9.5px bold.** One line to change on the device
     evening, so the by-eye row does not stall waiting for a call.
   - Option 2: plain lowercase at 9.5px bold. Reads as the word, not a label; the design chose small
     capitals over this.
   - Option 3: small capitals at 10.5px. Keeps the look and buys size back; the overhang on
     "settings" grows to about 4px.

**Answers, 2026-09-16 (the maintainer answered in chat, the same day):**

1. **Option 1.** Board 2a is approved as drawn. The two-star "replace the bonsAI tab icon" entry
   closes for the strip with this build; the production logo is the shape.
2. **Option 1.** "perms" and "dev", always.
3. **Option 1.** 54px as drawn, checked on the Deck, 56 in the same build if the dots still peek
   out. The maintainer's words: it must not look sloppy.
4. **Option 1.** Plain capitals at the same 9.5px bold if the small capitals read too small. The
   maintainer's words: no bigger than they need to be, not ugly, just big enough to be readable and
   neat.

**Consequence.** Plan 59 § 4 records the answers; the roadmap gains the Features entry for the
build; the two-star tab-icon entry folds into it. Nothing else in plan 59 changes.

**Correction, 2026-09-17, to item 3: the open strip is built about 66 pixels tall, not 54 or 56.
The 14 September Deck photo and the desk render both put the chat row's dots 6 to 10 pixels below a
54 strip, so 56 would not have covered them. Shown a mockup of three heights drawn over that photo
(54 as drawn, about 66 covering the dots, about 72 covering the whole chat row), the maintainer
chose the middle one: cover the dots, leave the rest of the chat row. The exact number is confirmed
on the Deck (plan 59 row 2A-07).**

**Addition, 2026-09-17: for Astarion the lit colour is the designer's hand-picked lighter grey
(#c3d0d1) rather than the rule's answer, by the maintainer's choice from a side-by-side mockup. The
rule (lift toward white until the colour reads at 6:1 on the bar, else leave it) stays for every
other character.**

### D110 — LOCKED 2026-09-16 (raised 2026-09-16) — The suggestion chips as real buttons (Claude Design board B): six calls before the build

Raised from [plan 60](../planning/60-chip-button-restyle.md), the build plan for the design Claude
Design handed back on 16 September, answering the brief of 14 September
([design/handoffs/preset-chips/](../design/handoffs/preset-chips/)). The returned files are in that
folder under `return-2026-09-16/`. Board B, "a real button", is the locked direction, with the
toned-down accent from board A: a top-lit, bottom-dark chip with a hairline on its top edge and a
soft shadow beneath, the two chips 6 pixels apart instead of 4, the character colour on the badges
and tags quieter, and the chip the D-pad is on marked by a thin light bar along its bottom edge in
place of the pale blue outline. Italics were tried on board A and rejected. The maintainer answered
all six the same day; nothing is built, and the build runs in a later session.

1. **The Tip badge becomes the dot from the boards.** On screen today it is the word "TIP"; the
   boards drew a 7 by 7 square dot with 2 pixel corners in the character's colour at 80 percent.
   The plan leaned toward keeping the word; the maintainer chose the dot. The amber Test badge stays
   a word (a checking-only state that has to be obvious).

2. **Steam's white ring stays. The bar goes under it, and if the two cannot show together on the
   device, the ring wins and the bar is dropped.** The ring, the hairline, the shadow and the bar
   are all drawn with the same property and the ring's rule is set to win, so the build merges the
   lists for the focused chip and a test guards the merge. The maintainer's words: fine to stick with
   Steam's white ring if the board's look cannot be brought in. The pale blue outline goes either way.

3. **The gap the maintainer asked for is the one to the question box, about half a pixel.** The
   brief had left the designer to choose, and they widened the gap between the two chips instead.
   Both happen: the designer's 4 to 6 between the chips stays, and the 12 pixels from the row to the
   question box become 13 (half a pixel cannot be drawn; one is the smallest step). The maintainer
   expects the shadow beneath a chip may need tuning so it does not make the row look glued to the
   box; the board's 2 pixels down and 3 of blur is the ceiling, tuned by eye on the device.

4. **No pressed look.** The board's sunk state (gradient flipped, chip down 1 pixel) is not built,
   not for touch and not for an A press.

5. **The green help chip and the orange agent suggestion chip get the raised look too**, keeping
   their own colours.

6. **The decode-mode label is toned** with the same 70 percent accent, 30 percent label-colour mix
   as the `[beta]` tag.

**Measured on the Deck 2026-09-17, before the build, and two of the calls above rest on a wrong
premise** (evidence `docs/test-evidence/plan60-measure-before.json`; plan 60 § 10). First, the gap in
item 3: in decode, static and carousel mode the chip row sits directly on the question box today,
0 pixels, not 12; only fade mode has the 12. The maintainer's Deck is in decode mode, which is the
gap they were seeing. The build gives every mode 8 pixels under the chips (5 taken by the shadow, 3
clear) and leaves fade mode at its 12; the maintainer judges by eye on the device whether 8 reads
as open. Second, the ring in item 2: Steam's white ring has not been visible on a chip since the row
started clipping on 2026-09-01, because the ring is drawn outside the chip and the chip fills the
row. A focused chip shows only the thin blue border. So the ring rule stops targeting the chips
(it was drawing nothing a person could see, and with room added under the row its bottom edge
would have peeked out as a white line), and the bottom bar becomes the chip's focus cue, as the
design intended. White rings stay everywhere else. Both calls made by the one running the session
under the maintainer's "build now"; either can be reversed from the device evening.

### D111 — LOCKED 2026-09-17 (raised 2026-09-17) — 58 phase 1: the note's own words on screen, and wiki notes taken without rewriting — nine calls before the build

Raised from [the phase 1 plan](../planning/58-phase-1-notes-shown-and-wiki-extracts.md), written the
same day after a read of the knowledge base against the production RAG lessons. The maintainer
answered all nine the same day; nothing is built.

1. **The block's look: not answered yet, by design.** The maintainer's reply was "I don't even know
   what you're asking", which is fair because the block has to be drawn before it can be chosen.
   Lane A draws three versions at true size, the maintainer picks one, and the pick is added to this
   decision then.
2. **Trim only stands unless overturned.** The maintainer asked back: "Are you saying whether or not
   the AI can create facts? Or are you saying that the AI can riff off of the notes that it
   receives?" Both, in different places: in the reply the model still riffs off the notes it is
   given, unchanged; in the library an AI may never write a sentence into a wiki note, it may only
   cut. Trim only stands unless the maintainer says otherwise before lane B is briefed.
3. **Reopen the July no-new-games lock: "Yes".** The catalog phase starts here.
4. **The ten games (Mario Party 1, 2, 3, 6 and 7, Donkey Kong 64, Yoshi's Story, Diddy Kong Racing
   from the Super Mario Wiki; the first Smash game from SmashWiki; GTA III from the GTA wiki): "Add
   them, but verification of their facts might need to come from the feedback thumbs."** All ten are
   in. The maintainer does not expect to check each wiki note by hand; a thumbs-down that stops a
   wrong note coming back is the check they have in mind. That is the Phase 7 "demote" entry on the
   roadmap, not in this phase, recommended as the next build after phase 1.
5. **The walkthrough wiki at strategywiki.org:** the maintainer read its page footer in a browser on
   2026-09-17: "Content is available under Creative Commons Attribution-ShareAlike 4.0 unless
   otherwise noted." Share-alike 4.0, usable, recorded as footer evidence with the date; the
   machine-readable licence field could not be read because scripted reads are refused by a bot
   check.
6. **Keep the 99 notes and 159 tips written from AI memory: "Yes".** They stay, labelled as bonsAI's
   own notes with no source.
7. **Read aloud: "Screen only".** The block is never read out.
8. **The publish step: "I'll decide that later, you just work on improving it on disk."** Phase 1
   builds the library and installs it on the Deck from a local folder; nothing is pushed to the
   public download hosts; the publish call stays open, and the corrected Hades note waits on it.
9. **Time and the Deck: "Take as long as you need, nothing else is going on."** No time limit; the
   Deck is free.

### D113 — LOCKED 2026-09-19 (raised 2026-09-18) — Plan 61 automated verification session: the thirteen questions

Raised from [the plan 61 session](../planning/61-automated-verification-session.md) § 8, written before the
device work began. The maintainer answered all thirteen on 2026-09-19. D112 is left to the 58 phase 2 plan
and is not written here.

1. **The Deck handover while another session held it.** The recommended answer, (c) — message the other
   session, let it take its four readings, then take the Deck and say so — is what happened.
2. **Model pulls.** The recommended answer was yes to two small models under a gigabyte, no to a large one.
   **Overturned 2026-09-19: "You can download models."** Pulls are allowed, the large one included.
3. **The wipe (Clear all plugin data).** Recommended answer taken: not run tonight, the two rows that depend
   on it stay owed.
4. **Removing the knowledge base to hunt the two-taps download bug.** Recommended answer taken: no, stays
   owed.
5. **B while Show details is open.** Recommended answer taken: B should close the panel; this becomes a
   small fix for a later lane, not a verification item.
6. **The question row behind the Retry icon.** Recommended answer was yes, if it reads fully visible on
   every walk. **Closed by the maintainer 2026-09-19.**
7. **Reduced motion.** Recommended answer taken: stays on the maintainer's own page; the rig does not touch
   Steam's own settings.
8. **New pinned test sentences without waiting for a yes each time.** Recommended answer taken: yes, for
   that one night only.
9. **Launching and exiting the games one at a time, Deck on power.** Recommended answer taken: yes.
10. **The relevance-floor row's off-topic half.** Recommended answer taken: reword the row to match what was
    already accepted, rather than reopening the accepted entry.
11. **Refreshing the maintainer's own page at the end.** Recommended answer taken: yes.
12. **Which screen.** Recommended answer taken: the built-in screen.
13. **Six entries one step from Done.** The maintainer answered in these exact words on 2026-09-19:
    (a) Pulled models joining the try order: **"try them in the order the user set."**
    (b) Clear all plugin data leaving three things behind: **"keep that current behavior."**
    (c) The global quick-launch macro: **"drop it."**
    (d) The game a chat belongs to, shown above its title: **"yes."**
    (e) The Cancel button on a knowledge-base download: **"keep."**
    (f) A checklist the model got wrong, left in a reply as raw text: **"keep."**

What each answer does to the roadmap:

- **(a)** stays in Verify. The large-model half of this row can now be run, since downloads are allowed
  (question 2, overturned above). The maintainer's own words are quoted, not reinterpreted: this decision
  does not settle what "the order the user set" means for the existing rule that a large pulled model jumps
  to the top of the try order — that question is flagged back to the maintainer, unanswered.
- **(b)** closes to Done. The wipe itself was proven on the Deck on 2026-09-16; the three underscore-spelled
  flags this fix targets are proven only by their tests and have never been seen going with the rest on a
  real device.
- **(c)** moves to Shelved. Dropped on the maintainer's word, never run on real hardware. It comes back only
  if the maintainer asks for it again.
- **(d)** moves back to Features. The maintainer said yes to showing the game's name above a chat's title.
  That name already shows for every chat made after 2026-08-30. The variant where it only shows while the
  row has focus was never built, and this decision does not choose it — that stays open for a later build.
- **(e)** the Cancel button itself stays as it is, on the maintainer's word. The Deck check for it moves to
  Shelved: the download finishes in about a second, too fast to press Cancel in, so the check has nothing to
  run against until a throttle or a slower test copy exists.
- **(f)** closes to Done, as proven by its unit tests, with a watch note: if a raw, unparsed checklist is
  ever seen in a real reply on the Deck, this reopens as a fresh bug rather than staying closed on the
  strength of an old fix.

### D114 — LOCKED 2026-09-20 (raised 2026-09-20) — Plan 62 feature session five: the nine calls off the drawing board

Raised from [the drawing board](https://claude.ai/artifact/31aLBi17SH7AydhYfGYjBq), which drew all four
features at the Deck's own sizes before anything was chosen, and from
[the plan](../planning/62-feature-session-five.md) § 8. The maintainer picked four shapes on 2026-09-20 and
answered the three remaining calls the same day. Nothing was built first.

1. **The game a chat belongs to.** Chosen: **the name shows only while the ring is on the row.** The empty
   line stays held open, so the row is the same height either way. This settles what D113 (d) left open.
2. **Read aloud.** Chosen: **a small speaker at the right-hand end of the Helpful row, drawn as a bare glyph
   on nothing** — no border, no fill — the same treatment as the microphone in the Ask box. The full-width
   line goes.
3. **Session context folding into Show details.** Chosen: **Clear sits at the end of the Session tab's body,
   full width, with the same confirm box.** This was the last thing D106 left undrawn; nothing about that
   feature is open now.
4. **The AI models screen filters.** Chosen: **every filter goes behind one "Filters · N on" line** that
   opens a panel over the list, grouped under headings.
5. **Which filters are offered.** Six: licence (the old Policy tiers as one filter), Speed / Strategy /
   Expert, Vision, Installed only, Essentials only, and Recently added. **Coding is dropped** as rarely
   wanted on a Deck. **"FOSS only" is dropped as a separate switch**, because the licence filter covers it
   and two controls that can disagree is worse than one.
6. **Three more jobs in the same work:** let the screen use more of the popup it sits in, move the "type any
   model name" box to the bottom, and get the counts line onto one line.
7. **The chat name sitting 14 pixels off-centre** — found while drawing feature 1, never reported before.
   Chosen: **take the × out of the centring**, so the game's name, the chat's name and the dots all sit on
   the row's true middle. The cost is accepted: about 28 pixels, roughly three characters, comes off the
   chat name so a long name cannot run under the ×.
8. **How faint the speaker is at rest.** Chosen: **45 per cent**, not the microphone's 15. Quiet but
   findable, and still full strength the moment the ring lands on it. Worth one look by eye on the Deck once
   it is built, because screens lie about faint things.
9. **The section buttons on the models screen, once Policy goes.** Chosen: **Advanced moves to a single
   button at the bottom of the screen and the section row goes entirely**, which hands the model list
   another 44 pixels.

What these do to the roadmap: all four feature entries were reworded the same day with the chosen shape and
a link to the board. Two new things were opened along the way — the chat name being off-centre, folded into
feature 1 rather than filed on its own because the same lane is already in that file, and the check everyone
runs before a commit being red on a clean tree, found while writing the plan.
