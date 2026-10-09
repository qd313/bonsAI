# The focus graph: a worked example

_Moved out of [AGENTS.md](../AGENTS.md) on 2026-09-21, copied line for line, nothing reworded, to keep the
guide under its size limit. The rules this example follows are in the guide, under **The Steam Deck focus
graph** and **Adding a new control**. This file is the long version: one control, wired end to end, with
every trap it hit on the device written down._

### The "From the notes" block (plan 58 phase 1)

_What AGENTS.md used to say about this example, moved here 2026-09-27:_ One control wired end to end, with every trap it hit on the Steam Deck: where it sits in the walk, what Up and Down do, why it uses `onOKButton` and not `onActivate`, why it is registered in a local map rather than the shared one, and why a finished reply is not `"live"` by the time someone walks up to it. Read it before adding a control that sits between two existing stops: this section.

A new stop under a reply that used a note or a shared troubleshooting tip
(`MainTabChatTranscript.tsx`, `buildKbNotesBlockElement`), one per turn ("live" or an archived
turn's own id). It sits after Show details / Read aloud in the walk, before whatever the utility
row used to reach:

```
Show details / Read aloud (unchanged)
   | Down                              ^ Up
"From the notes" block header   <- new stop, one per turn
   | Down                              ^ Up
whatever Down from the utility row already reached (the chip ladder, a permission hint,
the session context strip)
```

- **Up** hands the ring to Show details, falling back to the thumbs row when a turn has no Show
  details line — the same fallback `ContextChipLadder`'s own `onMoveUpFromLadder` already uses.
- **Down** with the block registered but nothing below it yet reuses exactly what
  `onMoveDownFromUtility` used to call directly; the block is spliced in front of that existing
  target, not a replacement for it.
- **Up from anything below the block also has to reach it** — first Deck rows (NOTES-BLOCK-01)
  found the block reachable walking Down from Show details but skipped walking Up from the
  session context strip, which landed straight back on Show details. Fixed by inserting
  `focusKbNotesBlock(turnKey)` (or, for the live turn, the shared `focusUpPastLiveKbNotesBlock()`)
  ahead of the existing fallback at every one of these call sites: the archived and live chip
  ladder's own `onMoveUpFromLadder`, and the troubleshooting and VAC-check permission-hint rows'
  `onMoveUp`. Each mirrors the Down path exactly — same target, opposite direction — rather than
  inventing a new route.
- **The session context strip's own `onMoveUp` needed the turn key right, not just the check.**
  A device rerun (0589565) found Up from that exact row — the collapsed "Session context (N
  turns) ▸ / Clear" line, the control that sits directly under the block on any normal, already
  completed reply — still skipping the block, because the first fix hardcoded the turn key
  `"live"`. A finished reply is not "live" any more by the time a person is sitting on this
  strip: the post-Ask slot reload moves `expandedTurnKey` onto the freshly archived turn's own
  id, and the block re-mounts under that id, not `"live"`. `focusUpPastSessionContextStripKbNotesBlock`
  reads whichever turn is actually expanded (`expandedTurnKey`) instead of assuming, so it finds
  the block wherever it is actually mounted — live, the newest archived turn, or (harmlessly) an
  older one expanded by hand.
- **Not fixed, and out of scope for this control specifically:** walking Up from the question box
  skips every reply row, the block included — a pre-existing gap wider than this one control,
  filed separately by the same Deck row rather than folded into this fix.
- **A** (`onOKButton`) or a tap (`onClick`) toggles the body open or closed. No `onActivate` —
  Steam fires it for A too, and wiring both would toggle twice on one press, the same trap the
  Show details line's own comment documents.
- **The row never remounts when toggled.** Only its label and an optional plain `<div>` body
  below it change, so there is nothing to hand the ring back to — unlike a spoiler fence's two
  different elements swapping (`MainTabBonsaiAiMarkdownChunk.tsx`), or the reasoning fold this
  mirrors (`buildReasoningFoldElement.tsx`).
- **Registered in a local module-level map** (`kbNotesBlockEls` in `MainTabChatTranscript.tsx`),
  not `replyStopRegistry.ts`'s `ReplyStopId` — that union is closed and this control's own lane
  could not extend it. A plain `.focus()` is still correct here (not `navFocusRegistry.ts`'s
  `takeNavFocus`): the row is a sibling of Show details and the other reply-row controls inside
  the same turn container, and `replyStopRegistry.ts`'s own `focusRegisteredReplyStop` already
  proves a bare `.focus()` carries Steam's ring correctly among exactly those siblings.
- **Never shows on a reply still hidden behind its own spoiler cover.** Gated on a real, live
  answer: `MainTabBonsaiAiMarkdownChunk.tsx` keeps a module-level tally of every currently-open
  `bonsai-spoiler` fence (`anySpoilerFenceOpen()`), and `MainTabChatTranscript.tsx` subscribes to
  it (`subscribeToSpoilerFenceOpenChange`) so it re-checks the moment a fence opens or closes. A
  plain module tally rather than a prop threaded down from `buildAnswerBubbleElement.tsx` (outside
  this control's own file list) or a `takeNavFocus`-style registry — safe as a single flag today
  because only one turn's answer is ever mounted at a time (`expandedTurnKey`), so "any fence open
  anywhere" and "any fence open on the one turn on screen" are the same fact. The block itself
  still renders in its own usual place after Show details, not literally nested inside the fence's
  own drawn box — true containment would need `buildAnswerBubbleElement.tsx` too.
- **Not yet backed by a device row.** `docs/testing.md` / `docs/testing-manual.md` still owe the
  D-pad walk this section's own rule asks for — recorded here, not skipped silently, because the
  bookkeeper owns those files, not this lane.

### Where the ring starts when the plugin opens

_Moved here from AGENTS.md on 2026-09-27, word for word, to keep that file under its size limit._

**The plugin now places the ring on the question box when it opens, unless something else already
owns it** (fixed 2026-09-15, confirmed on the Deck twice out of three tries). Opening a Decky
plugin used to leave the ring unowned, with the first Down landing on the Back button in the
header and the second reaching the tab bar; that was normal Steam behaviour and not a bug, but it
cost a person two wasted presses. **The one time it still does not hold:** the very first open
right after a fresh deploy's loader restart, when Decky's own navigation node for the field is not
ready inside the plugin's one-second attempt. A test step that opens the plugin right after a
deploy and immediately asks where focus is may still read *unowned* — reproduce a report of "the
first press does nothing" from an ordinary fresh open, not a just-deployed one, before treating it
as a regression.

### Three controls from plan 62

_Moved here from AGENTS.md on 2026-09-27, word for word, for the same reason._

**Plan 62, 2026-09-20 — three controls landed together, left to this note on purpose:** the AI models
screen's Filters button opens a panel of tickable rows (Down or B inside it, or Up from its first row,
closes it and returns to the Filters button); the newest answer's Show details gained a second tab,
Session (Left/Right switch tabs, Up leaves to Hide details, Down enters the open tab, B closes the whole
panel); Read aloud was a small speaker on the Helpful/Not row (since plan 84 it is in the answer's lower-left
corner, see below). None of the three has a device check yet — see [docs/testing.md](testing.md).

**Plan 84 step 3 — the Read aloud speaker moves to the answer's lower-left corner (route as built):** it is
its own stop, a sibling of the answer bubble drawn into the bubble's corner by the stylesheet, exactly as
Copy is in the lower-right (`bonsai-reply-read-aloud-corner-slot`, built in `buildAnswerCornerSlots.tsx` for `buildAnswerBubbleElement.tsx`).
It is registered under the reply-stop name `read-aloud-corner`; the old name `read-aloud`, which meant
the speaker in the reply-actions row, is gone. The slot and the Copy slot are each their own navigation
container. The first "What went wrong?" choice is a named stop too (`reason-chips`), so Down from the
corner icons and Down from the summed-up note both land on it once a reply is rated down.

```
answer sections 0..n-1            (Up/Down walk them, unchanged)
   last section:  Right -> Read aloud   (Copy when the answer has no speaker)
      Read aloud:  Right -> Copy        Left -> last section   Up -> last section
      Copy:        Left  -> Read aloud  Up   -> last section   (Left -> last section when there is no speaker)
   Down from Read aloud OR Copy -> the summed-up note, else Helpful, else Show details
                                   (the same chain Down from Copy used before; the speaker is no longer in it)
```

- **Left to right on the bubble's bottom edge: answer, Read aloud, Copy.** Every move between them is Steam's
  own transfer onto the target slot's nav node (`TakeFocus`) followed by the registry focus, never a bare
  `focus()` across containers.
- **Down from either corner** goes where Down from Copy always went. The speaker is no longer a stop below
  the answer, so it is not tried in that chain (`focusDownFromLiveAnswerBubble`, `downOutOfCopy`, the bubble's
  own Down).
- **The reply-actions row** under the answer keeps Helpful / Not really and Show details only. A reply whose
  only action was the speaker no longer has the row at all. After Helpful (both thumbs swap for "Saved on this
  Deck") the ring goes down to Show details, where it used to go to the speaker.
- **A** on the speaker starts reading; the button then says Stop and A stops it. Same label and states as before.
- **Scroll:** the slot is an ordinary step in the turn's flow, so Steam scrolls it into view the way it does Copy
  (P84-READ-01 checks the ring is fully visible on an answer longer than the screen).

### The "Show N more" line at the end of an open day (plan 83)

An open day line shows its first six questions, and a day with more than six ends in one more stop,
"Show 6 more" (or "Show 1 more", or whatever the next press will add, never more than six). A on it
shows the next questions under the ones already shown and puts the ring on the first of them. When
nothing is left, the line is gone. Closing the day, or closing "N earlier", starts the day over at six.
Code: `layoutEarlierByDay` (`earlierTurnsByDay.ts`), `buildEarlierList.tsx`, `EarlierListLine.tsx`
(`kind="more"`), `useEarlierTurnsPill.ts`.

```
day line "Mon 28 Sep · 13"
   | Down                              ^ Up
question 1 ... question 6              (each: Down to the next, Up to the one above)
   | Down                              ^ Up
"Show 6 more"            <- new stop, one per open day that has more
   | Down                              ^ Up
whatever Down from question 6 reached before: the next day line, or the next question
```

- **Down from the last shown question** is Steam's own move onto the next line, exactly as it already
  was for a day line that follows a question (`lineFollows` in `buildEarlierList.tsx` leaves the
  question's `onMoveDownPast` unset, so nothing claims it).
- **Down from the new line** goes where Down from that question went before: Steam's own move when a
  day line comes next, else a transfer onto the next question's text (`takeOpenQuestionText`), so it
  never stops on that question's Retry. Same shape as the "N earlier" line and the day lines
  (`earlierPillNavHandlers`).
- **Up from the new line** is Steam's own move onto the question above it.
- **Up from the stop below** reaches the new line. A question drawn right under it hands the ring to
  the line's own nav node (`moreLineNav`, through `questionMoveUpOut`); a day line below it is a
  plain sibling and keeps Steam's own Up.
- **Left** holds still, like every line in this list (`earlierPillLeftNavHandlers`).
- **A** is `onActivate` alone. The press adds the questions and asks `useEarlierTurnsPill` to put the
  ring on the first new one once they are drawn: Steam's own transfer onto that row's nav node
  (`takeHolderFocus`), because the line and the rows are different containers. On the
  last page the line unmounts in that same commit, and the transfer then puts the ring on the new row.
- **B is not claimed.** The line has no open state to close, and a question row of the same day does not
  claim B either, so B behaves the same on all of them: Steam's own back. (A handler's mere presence
  eats B, see `EarlierListLine.tsx`.) B on the day line still closes the day, which is the way to put
  it back to six.
- **Not backed by a device row yet.** The bookkeeper owns `docs/testing.md`; the D-pad walk it needs is
  in the lane report.
