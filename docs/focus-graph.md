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
- **Left and Right are held** (plan 87, QA-FREE-PLAY-01 with no game running): the block's own
  Focusable returns true on both, so a press of Left on the "Performance" card does not carry the
  ring out of the plugin into Steam's side tab list. Nothing sits to either side of the block. The
  note cards inside an open block are plain text, not stops, so they hold nothing extra.
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

### The Text size row (plan 87, F6)

A Settings row of three buttons, Small / Normal / Large (`SettingsTabChatTextSizeRow.tsx`), drawn under
Screenshot quality and above Remember what I typed. It is built the way Screenshot quality and Voice replies
are: one `Focusable` with `flow-children="horizontal"` holding three plain buttons.

```
Screenshot quality (Small / Balanced / Best detail)
   | Down                                ^ Up
Text size:   [Small]  [Normal]  [Large]      Left / Right move along the three
   | Down                                ^ Up
Remember what I typed (toggle)
```

- **Stops:** exactly three, the three buttons. The container and the paragraph above it are not stops.
- **Moves:** Left and Right are not written by hand: the row and its buttons carry no `onMoveLeft` /
  `onMoveRight`, so Steam's own walk decides them and no sideways press can be swallowed. Since the Settings tab
  folded (plan 92 T1, the last section of this file) the row carries `onMoveUp` / `onMoveDown` only, to go to its
  section's line and the next line; the old hand-written link from the UI scale Apply button to the Screenshot
  quality row is gone with the fold.
- **A** (`onClick`) saves the choice. The saved one is drawn with the lighter fill and `aria-pressed`; the
  words everywhere in the plugin change size at once, nothing reloads, and the ring stays on the button that was pressed.
- **Test:** `SettingsTab.textSizeWalk.test.tsx` lists the tab's stops with the row in it (Developer tab off and
  on): none twice, the three in order between Screenshot quality and Remember what I typed, only Up and Down on
  the row. jsdom has no spatial walk, so the Deck walk (Down through the whole tab, then Up) is the real check.

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

**Plan 62, 2026-09-20 — three controls landed together, left to this note on purpose** (the Filters
button and panel described next were replaced on 2026-10-12 by the filters column, plan 91; see
§ "The AI models box's filters column (plan 91, M1)" for its routes): the AI models
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

### The ask box's strip (plan 84)

Plan 84 step 2 folds two rows of the ask area into the question box's bottom strip: the big ASK button
becomes a small ASK button at the strip's right end, and the italic "Context: …" line becomes a small game
tag beside the paperclip (drawing frames "D" and "Z", `docs/planning/assets/84-vertical-room.html`). Code:
`MainTabUnifiedAskBar.tsx`, `AskStripSendButtons.tsx`, `AskStripGameTag.tsx`, `useMainTabAskBarFocus.ts`.

```
suggestion chips
   | Down (unchanged)                          ^ Up (unchanged)
question box
   | Down: small ASK (Stop while an answer is being written)
   ^ Up: from mode, mic or Stop, X and ASK; the paperclip keeps its own Up
[paperclip] (game tag) ........ [mode] [mic or Stop] [X, only with words] [ASK]
   Left and Right walk the row; Left holds still on the paperclip, Right on the last live stop
```

Stops, left to right: the paperclip, the mode button, the mic (Stop while an answer is being written), the X
that empties the box (only while the box has words), the small ASK. The game tag is a label, not a stop.

- **Order and ends.** Right walks paperclip, mode, mic or Stop, X, ASK, and holds still on ASK. Left walks
  back and holds still on the paperclip, as before (past it Steam would hand the ring to its own Quick Access
  rail, LEFT-HOLDS-STILL-01). While an answer is being written ASK rests, so the walk ends on Stop, or on the
  X when the box has words: Right there holds still rather than land on a button that does nothing. The
  paperclip rests during an answer too, as it did before this step, so then the walk's left end is the mode
  button.
- **The game tag is not a stop.** It only reads. A on it would do nothing, and a stop that does nothing reads
  as a dead press.
- **The X sits just left of ASK, only while the box has words,** as it sat beside the big ASK. ASK keeps the
  right end either way, so a thumb and the D-pad find it in the same place with or without words.
- **Down from the box lands on ASK,** or on Stop while an answer is being written (ASK rests then). The
  maintainer's rule of 2026-10-06 was that Down from the box lands on the row under it and skips nothing; the
  strip is now that row and ASK is in it, so nothing is skipped and Left walks the rest. A person who has
  typed or spoken a question and presses Down most likely wants to send it: Down then A sends, one press
  fewer than before (Down, Down, A). With an empty box ASK still takes the ring; A there sends nothing and
  the ring stays on ASK, and Left reaches the mic, the mode button and the paperclip.
- **Up from the mode button, the mic or Stop, the X and ASK goes to the question box,** by Steam's own
  transfer (`takeNavFocus("unified-input")`), the mirror of Down. Up from the paperclip is unchanged: the
  character picture when it shows, else Steam's own step onto the box.
- **Down from the strip is left to Steam.** Nothing sits below it in the dock except an attached screenshot's
  row, when there is one, which Steam's own step reaches; with nothing there the ring stays. Not claimed,
  because a container's last stop that claims Down dead-ends there (focus-graph-patterns, the Filters panel's
  Close filters). An open mode or attach menu keeps its own Down into the menu.
- **Up from the chips is unchanged:** the chips' own exit Up, onto the stop just above the dock
  (`chipRowExitUp`). Down from the chips still lands on the question box. This step moves nothing above the
  box.
- **The slot above the box is one stop, and the same stop both ways** (`DetailsSlot.tsx`, point 6 of its
  header). While an answer is read with its own Show details line out of sight, the slot holds that line in
  the chips' place. The walk remembers which face it met (the line or the chips) for as long as the ring is in
  the newest answer or in the dock. Up from the box lands on the slot's line, Up again on the answer's own line
  (Steam scrolls it on screen, so the slot draws the chips for that one stop), and Down from the answer's own
  line lands on the slot's line again, not on a chip, then on the box. Up from the box after that walk meets
  the line again too. The memory is dropped when the ring leaves the answer and the dock, when another answer
  takes over, or when the chat is scrolled by finger long after the ring last moved.
- **The help chip is a stop of its own, in its own container** (`HelpChipRoot` in `MainTabPresetRow.tsx`). While it
  owns the row (a new chat before the quick start is read), Up from the question box lands on it by Steam's
  transfer (`takeNavFocus("preset-carousel")`, the same id the suggestion chips register); a plain `focus()` left
  the pad where it was and Up went on to the tab bar (stand-in, plan87-S-S1-HELP-CHIP.json). Down from it is the
  question box, Up is the chips' exit Up (`chipRowExitUp`), Left and Right are held. Down from the chat's name on
  an empty chat still goes straight to the question box and skips the chip, as it does for the suggestion chips.
- **The AI's own suggestion chip is a stop of its own, in its own container** (`InjectChipRoot` in `MainTabPresetRow.tsx`,
  handle in `injectChipNav.ts`). It shows only after an answer from the Pyro persona and sits below the suggestion
  chips, nearest the question box. Up from the box lands on it first by Steam's transfer (`takeInjectChipFocus`,
  tried before the help chip and the chips in `focusFirstPresetChip`); Up from it goes to the Show details line or the
  chips (`takeChipSlotFocus`), else the chips' exit Up (`chipRowExitUp`); Down from it is the question box; Left and
  Right are held. Down from the help chip, the suggestion chips and the Show details line lands on it before the box
  (`leaveRowDown` in `MainTabPresetRow.tsx`). Before this the ring went past it both ways and it could only be tapped.
- **The strip is its own row, not part of the box's group.** It already was its own Steam focus row
  (`bonsai-unified-input-actions-row`) drawn inside the box's card, and it stays one. Left and Right in the
  box belong to the box (Left: paperclip, Right: mode button, both unchanged); Left and Right in the strip
  walk its buttons. Every hop between the box and the strip is written down on both sides.
- **Where each move is wired.** Left and Right sit on each button, the way the paperclip's and the mode
  button's already did and the Deck showed working (LEFT-HOLDS-STILL-01, P82-BOX-DOWN-MODE-BUTTON). Up sits
  on the strip's right-hand group (`bonsai-unified-input-actions-right`), because a Decky Button does not
  forward Up or Down. Down from the box is the box's own handler (`unifiedInputDeckNavHandlers` in
  `useMainTabAskBarFocus.ts`). Hops between the strip's buttons are a plain `focus()` inside one row, through
  each button's own ref, never a class lookup; the hop into the box is Steam's transfer.
- **What ASK does is unchanged.** A or a tap asks (`useAskBarPressHandlers.ts`), and the ring then goes to the
  question box; with an empty box it stays on ASK. While an answer is being written ASK is dimmed and cannot
  be pressed, and Stop in the mic's place stops the answer and hands the ring to the box. The ring watch after
  a tab switch (`useAskBarInitialRingClaim.ts`, `askBarRingWatch.ts`) hands the ring to the question box,
  never to ASK, so it needed no change; it still runs with the bar.
- **The Steam settings matches stay where they have been since plan 45:** a card drawn over the chat just
  above the box, which never depended on the big ASK. Up from the box enters its last row, Down from that row
  returns to the box, B closes it. Not moved under the box: the box is now the last thing on the panel, and
  there is no room under it.
- **Not backed by a device row yet.** The bookkeeper owns `docs/testing.md`; rows P84-ASK-01 and P84-ASK-02
  (plan 84 § 6) are in the lane report.

### The tab bar, T3 (plan 84 step 4)

Plan 84 step 4 redraws the tab bar as design "T3" and deletes the drop-down strip of tab icons that used to
open under it (drawing frame "Z", `docs/planning/assets/84-vertical-room.html`). Code: `TabIndicatorBar.tsx`,
`tabBarNav.ts`, `useHiddenTabHeaderTrap.ts`; styles in `src/styles/sections/tabIndicatorBar.ts`.

```
LB  [Main] [icon] [icon] [icon] [icon] [About]  RB   <- one stop: the whole bar
     (every tab, always in the strip's order; the current one is drawn as its icon and NAME)
   Left / LB: previous tab (wraps)        Right / RB: next tab (wraps)
   | Down: the current tab's first stop    ^ Up: left to Steam (Decky's back button today)
```

**Since plan 87 F4 the drawing is a fixed order and no move changed.** The bar draws every tab left to right in
the strip's own order, Main at the far left and About at the far right, the tabs before the current one on its
left and the tabs after it on its right, never wrapping round; only the drawing stays put. Left, Right, LB and RB
still wrap (LB on Main goes to About, RB on About to Main), so the stops and the moves below are exactly as they
were.

- **One stop.** The whole bar is one Steam focus stop (`focusable: true` on its Focusable). LB, RB and the side
  icons are plain spans for touch, with no tabindex and no Focusable of their own, so the ring never sits on
  one of them and Left and Right never get stuck inside the bar.
- **Left and LB** open the previous tab, wrapping from the first to the last; **Right and RB** open the next,
  wrapping back. Left and Right are always claimed (past the bar Steam would hand the ring to its own Quick
  Access rail). LB and RB are read in `onButtonDown` through the `focusNavigation.ts` helpers. The ring stays
  on the bar after a switch. Unchanged from before this step.
- **Down** hands the ring to the current tab's first stop by Steam's own transfer (`exitDown`, which is
  `takeNavFocus` onto the chat-slot row on Main and onto the tab body's root elsewhere). It claims the press
  only when the ring moved; otherwise Steam's own step runs and the hidden-header trap catches a landing on
  Steam's hidden tab buttons. Unchanged.
- **Up** is not claimed: Steam takes the ring upward, to Decky's back button. **Since step 6** the bar sits at the
  very top, in Steam's strip, and Up holds there (claimed, nothing moves); Down on Main goes to the chat's name
  first. See "The tab bar in Steam's strip" below; this paragraph still holds whenever Decky's bar is not the
  shape step 6 expects and the bar stays in bonsAI's box.
- **A** does nothing (no `onActivate`); **B** is Steam's own.
- **Into the bar, unchanged:** Up from the top of a tab body (`TabBodyFocusRoot`), Up from the chat-slot row,
  B from a tab body (`onCancelFromTabHeader`), the return after a popup closes (`modalReturnFocusRegistry`,
  "tab-bar"), and the trap that catches the ring on Steam's hidden tab buttons. Every one is
  `takeNavFocus("tab-bar")`.
- **What shows the ring:** Steam's own `gpfocus` / `gpfocuswithin` marker on the bar. The whole bar then wears
  the white inset ring and a faint fill, and LB and RB go from dim (0.32) to full strength. Plain browser focus
  shows nothing: plan 78 measured the bar holding browser focus with no Steam ring anywhere.
- **Touch:** a tap on LB opens the previous tab, on RB the next, on a side icon that tab; a tap on the name does
  nothing. Targets: LB and RB 31 by 20 points; each side icon 18 by 20, always (plan 87 F4: they no longer
  narrow, the longest name at six tabs still fits).
- **Gone with the strip:** its open and closed states, its fade, the timer that forced the fade shut, the
  tap-to-open and the tap-outside listener. What the bar draws depends only on which tabs exist and which is
  current, never on the ring or a tap, and the bar clips everything inside it to its own 20 points, so nothing
  of it can be left over the chip row (TAB-BAR-GHOST-01).
- **Device rows:** P84-TABS-01 and the LB/RB half of P84-HINTS-01 passed on the Deck's own screen 2026-10-08
  ([evidence](../../bonsAI-workshop/test-evidence/plan84-STEPS4-5-7-DECK.json)); P84-TABS-02, the touch check, is owed (needs a person).
  Rows in [testing-manual.md](testing-manual.md), section PLAN-84.

### The chat's name and the chats menu (plan 84 step 5)

Plan 84 step 5 moves the chat's name into Decky's title bar, beside Decky's back arrow (drawing frame "Z",
round eight's pick X1, `docs/planning/assets/84-vertical-room.html`). Decky draws that spot (the plugin's
`titleView`) outside bonsAI's own box, in a React tree of its own, so the name reads the open chat from a
small shared store (`chatTitleStore.ts`) and moves Steam's ring in and out of bonsAI's box only by Steam's own
transfer (a nav node's `TakeFocus`), never a plain `focus()`. Code: `src/features/chat-title/`.

**The name (one stop, in Decky's title bar, the same container as Decky's back arrow).** Until step 6 moves the
tab bar up, the tab bar is still the first thing in bonsAI's box under Decky's bar.

```
[Decky's back arrow]  <- Left (Steam's own)    [ the chat's name ]    Right: holds still
                                                       | Down: the tab bar (Steam's transfer, "tab-bar")
                                                       ^ Up from the tab bar: Steam's own, as before
                                                         (it reaches Decky's back arrow; Right then the name)
bonsAI's tab bar
```

- **Left** reaches the + before the name, and **Right** the delete icon after it, both by Steam's transfer (plan 87
  F5, the section "The + and the delete icon on the chat's name row" below). Before plan 87, Left was Steam's own
  move onto Decky's back arrow (siblings in Decky's one title Focusable; measured 2026-10-08: Right from the arrow
  reached a stop drawn in the title spot) and Right held still. Right still holds when the delete icon cannot be
  reached; Left then goes Steam's own way, to the arrow.
- **Down** goes to the tab bar right below, by Steam's transfer onto its registered nav node
  (`takeNavFocus("tab-bar")`). Steam's own Down from Decky's bar reached the tab bar too (2026-10-08), but the
  route is written down rather than left to Steam's guess. An open chats menu closes as the ring goes, so it is
  never left open behind the ring. **Since step 6** (the bar above the name, in Steam's strip) Down is the chat's
  first stop; this route stays for the fallback, with the bar in bonsAI's box.
- **Up** is Steam's own. Nothing lies above the name yet (Up from Decky's bar moved nothing on 2026-10-08);
  **since step 6** the tab bar lies above it, and Up is claimed onto the bar.
- **A** (`onOKButton`) or a tap (`onClick`) opens the chats menu; the same again closes it. No `onActivate`, which
  Steam also fires for A and would toggle twice. **B** on the name closes the menu while it is open (claimed only
  then, with `onCancelButton`); with the menu shut, B is Decky's own and goes back to its plugin list.
- **The ring on the name** is the view's own white ring (`noFocusRing` turns Steam's off), drawn on Steam's
  `gpfocus` marker. LT and RT under the name light up only while the ring is on the name; a name too long for
  its room slides once to show the rest and comes back (`ChatNameWords.tsx`), still for anyone who asked for less
  motion.
- **The name is a stop, not a container:** its children are plain text, so it carries `focusable: true`, the
  same flag the old saved-chats row needed (measured 2026-08-30).
- **The ring watch after a reopen counts the name as bonsAI's** (`askBarRingWatch.ts`): in its short windows it
  takes a ring on Decky's own back arrow to the question box, but a ring on anything in bonsAI's title view is a
  plugin control the person can be on, so the window ends and the ring stays. A ring on the tab bar keeps the
  tab bar's own rule (taken only in the window's first seconds) wherever the bar is drawn.
- **LT and RT switch chats from anywhere on the Main tab** (`useChatTriggerSwitch.ts`), in the old saved-chats
  row's order: the list newest first, the new-chat spot before the newest, no wrap at either end. They do not move
  the ring. One listener on the panel's own document (through `uiDocument.ts`) hears both, because the Deck
  delivers L2 and R2 there as buttons 7 and 8 wherever the ring is (plan 84 test A), the name included; no
  control claims them. Refused while the chats menu is open, while a box that asked for the ring back is open,
  and on every other tab. When the switch takes away the control the ring was on (an answer, a question of the
  old chat), the ring goes to the question box (`takeNavFocus("unified-input")`); on the name, the chips or the
  box it stays.

**The saved-chats row is gone.** It sat at the top of the chat with its own stops (Save, the name, Delete) and its own
LB/RB; every job it had is the chats menu's now, every route that led to it leads to the tab bar or the chat's first
stop instead (below), and its nav id ("chat-slot-row") is no longer in the registry's list.

**Down from the tab bar on Main enters the chat itself** (`takeFirstChatStop.ts`, called by index.tsx's
`tabBarExitDown` through the Main tab's action in the store). The saved-chats row used to be the first stop under the
tab bar; it is gone, so Down lands on the chat's own first stop, by Steam's transfer, in this order: the "N earlier"
line when it is drawn; the first question's text (never its Retry); the open question's text when the first question
is a closed older row (older rows have no stop of their own to take by name, so Down lands one row lower and Up
reaches the row above); the newest question's row while it is closed; the question box. An empty chat, or the
new-chat spot, goes straight to the question box. Never left to Steam: Steam's own Down from the tab bar lands on
its hidden tab buttons, and the hidden-header trap throws the ring back, so the press would do nothing. Step 6 calls
the same action from the name's Down once the tab bar sits above the name.

**Up from the top of the chat goes to the tab bar** (since step 6: to the chat's name, the stop now right above the
chat) (`takeAboveTheChat` in `chatTranscriptNavHelpers.ts`), the mirror
of Down: Up from the "N earlier" line, from the first question's text with nothing drawn over its row, and from the
first archived question's row, and Up from the suggestion chips on an empty chat (`chipRowExitUp`). All of these
named the saved-chats row before; they share one function now, so step 6, which puts the chat's name between the
tab bar and the chat, changes one line.

**The chats menu (drawn in bonsAI's own box, over the answer, its foot on the dock's top edge).** `ChatsMenu.tsx`,
moves in `chatsMenuModel.ts`. Every stop is a sibling in one container, so a move inside it is a plain `focus()`.

```
the chat's name (Decky's bar)
   | A or tap: Steam's transfer onto the open chat's row          ^ Up from the first chat, B anywhere,
   v                                                              | or A on anything: back onto the name
Your chats
  chat 1  .. chat n        Up/Down walk the list; Left/Right hold still
   | Down from the last chat
[ New chat         ] [ Rename chat          ]     Left/Right cross a row and hold at its ends
[ Sum up this chat ] [ Save to Desktop note ]     Up/Down keep the column (else the left one)
[ Delete chat      ]                              Down holds here; Up from the top row: the last chat
```

- **In.** A or a tap on the name opens the menu, and the menu hands Steam's ring onto the open chat's row by
  Steam's own transfer (each stop has its own nav node), retried for up to 0.6 s because Steam fills a new node a
  moment after it mounts. At the new-chat spot it enters on the newest chat; with no chats at all, on New chat.
- **Out, always onto the name.** Up from the first chat, B on any stop (`onCancelButton` with `preventDefault`,
  the only way Steam does not also back out of the panel), and every action: Steam's transfer onto the name's nav
  node (`takeChatNameFocus`), then the menu closes. The ring is moved before the menu unmounts, so it is never left
  on a control that is gone. Nothing else leaves: no press from the menu can reach the answer behind it, the dock
  or Steam's own rail.
- **A on a chat** opens it (the Main tab's `onChatSlotSelect`); on the open chat it only closes the menu.
- **The actions do what the saved-chats row did.** New chat is the row's create (`onChatSlotCreate`); at ten chats it opens the picker described after this section. Rename chat
  opens the rename box and Delete chat the two-button delete box (Cancel first). Save to Desktop note opens the save
  window. Sum up this chat starts the Session tab's own Sum up job, a second way in to that button: the Session tab
  keeps its button. A greyed action is still a stop and A on it does nothing: Rename, Delete and Save at the
  new-chat spot, Save while the chat has no answer, Sum up whenever the Session tab's button is greyed. Save without
  the file permission is greyed but still opens its window, which asks for the permission, as the row's dimmed save
  icon did.
- **A box opened from the menu** (rename, delete, save) gets the ring after the ring has gone back to the name, and
  names the name as the place to give it back to (the box-return registry, ids "chat-slot-rename" and
  "desktop-note-save", the ids the row used). The name is in Decky's bar, outside the tab that a box's close
  rebuilds, so it is still there when the box closes. **The return is Steam's transfer onto the name**
  (`returnRingToChatName`, registered with the owner), never the registry's plain `focus()`: measured on the Deck
  2026-10-08, Rename chat then B left the ring on Decky's back arrow, where one A closes bonsAI. For about a second
  after the return, a landing on the back arrow is taken back to the name (Steam places the ring itself as a box
  closes, and chose the arrow); after that, a person who walks Left onto the arrow is left there.
- **LT and RT are refused while the menu is open.** Leaving the Main tab closes it.
- **Not backed by a device row yet.** Rows P84-NAME-01, P84-NAME-02, P84-NAME-03, P84-MENU-01 and the LT/RT half of
  P84-HINTS-01 (plan 84 § 6) are in the lane report.

### New chat at ten chats: the picker (plan 87 F2)

The plugin keeps ten chats. With fewer than ten, New chat in the chats menu makes a chat at once, as before. At
ten, it opens **a picker in a box of its own** (`ChatSlotPickerModal.tsx`, opened through `showModal` the way the
rename and delete boxes are), and nothing is made or deleted yet. Code: `src/features/chat-slots/useStartNewChat.tsx`
(the one function every "start a new chat" goes through; the + beside the chat's name, plan 87 F5, calls it too),
`ChatSlotPickerModal.tsx`, `useChatSlotDeleteConfirm.tsx`. The back end refuses a create at ten (`chat_limit`), so
no path can delete a chat to make room.

```
the chats menu: A on New chat (the ring goes back to the name first, as for every action)
   v
You have 10 chats                      <- the picker box (ModalRoot)
  [ chat 1 (newest)          now ]     Steam walks the rows itself: Up/Down between siblings
  [ chat 2                   2 h ]     the ring opens on the first row, the newest chat
  ...
  [ chat 10                  Sep 30 ]
  [ Cancel ]                           last row
   | A on a chat: the Delete chat? box opens over the picker
   v
Delete chat slot?                      <- the usual box (ModalRoot), two buttons
  [ Cancel ]   <- the ring opens here (first in the box)
  [ Delete ]
```

- **Stops.** The picker: the ten chats (newest first, the names the chats menu shows, and when each last changed),
  then Cancel. The box: Cancel, then Delete. Every stop is a sibling in its box, so Steam's own Up and Down walk
  them; the picker has **no move handlers of its own**, and Left and Right are Steam's. The rows sit in a list that
  scrolls (tall as 46% of the screen) and Steam scrolls the focused row into view.
- **A** (`onOKButton` on the row's `Focusable`) or a tap (`onClick`) acts once. A on a chat opens the Delete box for
  that chat and **deletes nothing**. A on Cancel (picker or box) keeps everything.
- **B anywhere** (the `ModalRoot`'s `onCancel`) keeps all ten chats and changes nothing: from the picker it closes the
  picker; from the box it closes the box **and the picker under it**, so one B from the box lands back on the name,
  not in the picker.
- **Delete** (the only press that removes a chat) deletes the picked chat, and only if that worked makes the new chat
  (it becomes the open one, on top), then closes the box and the picker. If the delete does not go through, no
  chat is made. The session is saved once more after the new chat is made, because closing a box rebuilds the plugin
  from the save made when it opened.
- **Where the ring lands.** After Delete, after Cancel and after B alike: **on the chat's name in Decky's bar**, by
  Steam's transfer (`returnRingToChatName`), through the box-return registry under the id "chat-slot-rename" that
  the rename and delete boxes use. The memory of where to return lives in that module, outside every component,
  because closing a Decky box rebuilds the tab behind it. The menu closed before the picker opened, so it is not
  there to return to. After Delete the name shows the new chat ("New chat").
- **LT and RT at ten chats** do not step onto the new-chat spot (an empty chat that a first question would make
  into a saved one): a question asked there would need a new chat, and at ten that has to go through this picker.
  They still walk the ten chats.
- **Not backed by a device row yet.** The Deck check: with ten chats, New chat shows the picker; B cancels and ten
  remain; a pick then A on Cancel keeps ten; a pick then Delete leaves ten with a fresh chat on top, the picked
  chat's file gone and no other chat file changed.

### The + and the delete icon on the chat's name row (plan 87 F5)

The maintainer's call 2 of 2026-10-09: two quick actions at the two ends of the chat's name row in Decky's title
bar. **A + before the name** starts a new chat; **a delete icon after the name** opens the usual Delete chat? box
for the open chat. Icons only, no words; spoken names "New chat" and "Delete chat". The chats menu keeps both of its
own actions. Code: `ChatRowIcons.tsx` (the two stops), `chatRowIconNav.ts` (their nav ids, "chat-name-new" and
"chat-name-delete", and the note of where the delete box gives the ring back), `chatRowActions.ts` and
`useChatRowActions.ts` (the Main tab's two calls, handed to the icons through a small module because the title bar is
another React tree), `chatRowMoves.ts` (Up, Down and LB/RB, shared with the name).

```
[Decky's back arrow]  [ + ]  [ the chat's name ]  ....  [ delete ]
        ^ Left from +        Right/Left between the three      Right from delete: holds
          (Steam's own)      Up: tab bar   Down: the chat's first stop   LB/RB: previous/next tab
```

- **Stops, left to right in the page:** the + (A or tap: `useChatRowActions`' new chat), the name (unchanged: A opens
  the chats menu), the delete icon (A or tap: the Delete chat? box). The icons are drawn before and after the name in
  the page, so Steam's own walk from Decky's back arrow (Right) reaches the + first.
- **Moves.** From the name: **Left** takes the + and **Right** the delete icon, both by Steam's transfer (the nav
  node of the stop, never a plain `focus()`); Right holds (claimed) if the delete icon cannot be reached. From the
  **+**: **Right** takes the name; **Left** is not claimed, so it is Steam's own, onto Decky's back arrow (the same
  as from the name before). From the **delete icon**: **Left** takes the name; **Right holds** (claimed, nothing
  moves: nothing of bonsAI lies to its right). **Up** takes the tab bar and **Down** the chat's first stop from all
  three stops, and **LB and RB** switch tabs from all three (the ring goes to the tab bar first), by the shared
  `chatRowMoves.ts`; an open chats menu closes as the ring goes.
- **A.** On the +: a new chat, through `useStartNewChat` (F2's one rule), so below ten chats it makes the chat at
  once (the ring stays on the +), and at ten it opens the picker (see "New chat at ten chats" above; its boxes give
  the ring back to the name). On the delete icon: the Delete chat? box for the open chat (`useChatSlotDeleteConfirm`,
  Cancel first, opening on Cancel), exactly the menu's Delete chat. The delete icon is **greyed at the new-chat
  spot** (nothing saved to delete), as the menu's Delete chat is: still a stop, A does nothing.
- **B on either icon** returns the ring to the name (`takeChatNameFocus`) and is claimed with `preventDefault`, or
  Decky's own B would leave bonsAI. B on the name is unchanged.
- **Where the ring lands after the Delete chat? box.** **Cancel or B: on the delete icon** (nothing changed, the person
  stays where they were). **Delete: on the chat's name** (the chat the icon was for is gone; the delete wrapper
  re-registers the name as the box's return owner before the box closes). Both by Steam's transfer through the
  box-return registry under the id "chat-slot-rename"; for about a second afterwards a landing on Decky's back arrow
  (where Steam put the ring as the box closed, 2026-10-08) is taken back to the same stop. **The note of which of
  the two it is lives in `chatRowIconNav.ts`, outside every component**, because closing a Decky box rebuilds the
  tab behind it; the transfer looks the icon up by its registry id each time it runs, so an icon drawn again between
  the open and the close is still reached (tested with the title bar unmounted and mounted between the two).
- **The ring look.** The icon's `class` attribute is static: Steam writes its own `gpfocus` marker into it, and a
  React state change rewriting the attribute wiped the marker (the test model lost the ring the first time). The
  white ring and the greyed look are `data-ring` and `data-off` attributes.
- **The row's width.** Each icon takes 26 points (24 and a 2-point gap on its inner side). Decky's back arrow keeps
  its 40 whatever the name (plan 87 B7: bonsAI's part of the bar starts from nothing, not from its content's
  width, and the empty space that centres a short name gives way first). The name sits between the icons and a long
  name spills into the empty space on its right, **never under the delete icon**; a short name stays centred on the
  panel's centre line.
- **Not backed by a device row yet.** The Deck check: both icons visible; Left from the name puts the ring on +, Right
  on the delete icon, each fully visible; A on + makes a new chat; A on the delete icon opens the Delete chat? box
  with the ring on Cancel, and Cancel keeps the chat and puts the ring back on the delete icon; B from each icon
  returns the ring to the name; the back arrow's box is the same width with a 14-letter and a 60-letter name.

### The Show details chips grid (plan 87 F3)

The chips under an answer's Show details ("This answer" tab, and the same ladder under an older turn and in the
Session tab) are a grid. They are packed into rows that fit the column: in reading order, unless letting a
narrow chip move up into the room left at the end of an earlier row saves a whole row. Each chip's place is a
CSS `order`, so no chip element is ever moved or rebuilt and the one holding the ring keeps it. The eight chips
the Deck showed on 2026-10-09 make five rows either way (no three of them fit side by side in 300 px):

```
toggle  "This answer | Session"                 (Up from the top row, Left from the first chip)
  [Knowledge base]  [KB: 13 sections]          row 1
  [Read current TDP]  [Reply style: balanced]  row 2
  [Thinking: Balanced · 65 s · ~626 tokens]    row 3
  [Spoiler risk: low]  [Routed gemma4:e2b-…]   row 4
  [Developer details]                          row 5
  ┌ the open chip's details, under the whole grid ┐
  └───────────────────────────────────────────────┘
whatever Down past the ladder reached before    (Down from the bottom row, Right from the last chip)
```

Code: `ContextChipLadder.tsx` (the moves), `chipLadderGrid.ts` (`packChipRows`, `rowsFromBoxes`, `gridMove`),
`useChipGridOrder.ts` (measures and packs after every draw).

- **Stops.** One per chip, as since plan 79; the chip holding the ring is the open one, and its details are drawn
  under the grid. The caption "Chip N of M" counts in drawn order.
- **Left and Right** step through the chips in drawn order, row after row: Right at a row's last chip goes to the
  next row's first chip, Left at a row's first chip to the previous row's last chip. Walking Left or Right reaches
  every chip and no press does nothing.
- **Up and Down** move to the row above or below, onto its chip nearest in x (by the chips' centres; a tie goes to
  the left one). The rows are read off the chips' boxes at the moment of the press, never from the packing, so the
  walk always matches what is drawn. Down from row 1's left chip on the eight chips above: Knowledge base, Read
  current TDP, Thinking, Spoiler risk, Developer details.
- **Leaving.** Up from the top row and Left from the first chip go where Up from the first chip always went
  (`onMoveUpFromLadder`: the This answer | Session toggle; on an older turn, Show details' own line; in the
  Session tab, the session row above). Down from the bottom row and Right from the last chip go where Down from
  the last chip always went (`onMoveDownFromLadder`), after first scrolling the rest of a tall details box into
  view if its end is behind the dock (that press keeps the ring on the chip).
- **Every move inside the grid** is a plain `focus()` between sibling chips in the one ladder container, the case
  AGENTS.md allows; leaving goes through the caller's own transfer, unchanged.
- **B** closes the ladder (`onCancelButton` on each chip), unchanged. **A** does nothing on a chip, unchanged.
- **Scroll (plan 87 call 6: the details stay readable).** When a chip opens, by a step or by the ring arriving, its
  box's end must be above the dock. If it is, nothing moves. If not, one smooth scroll of just enough
  (`chipLadderPlacement.ts`), but never so far that the chip itself rises into the 116 px Steam keeps clear at the
  pane's top: Steam would glide it back down at the next press, and the two would fight. A chip off the top comes
  back to that line, where Steam's own glide would put it; a chip behind the dock comes out just above it, where
  the lift would. So neither Steam's glide nor the lift finds anything left to do, and every later pass of the
  placement (a frame later, then 150, 300 and 900 ms, the lift's own schedule) measures and stops. A box too tall
  to show with its chip (Developer details on the Deck's own screen) shows its end on the **first Down**, which
  keeps the ring on the chip; the next Down moves on. Nothing scrolls once the ring has left the chips.
- **Round two (plan 87, after the Deck run of 2026-10-10 with a 500 px Developer details box):**
  - **The second Down always moves on.** A Down that showed the rest of a box is remembered; another Down with no
    step in between leaves the grid (or crosses to the next row), whatever the box measures. Before this, a Down
    that asked for a scroll the pane could not give kept the ring on Developer details for ever.
  - **Room to clear the dock.** The ladder is often the last thing above the dock, with less content after it than
    the dock is tall, so a box at the pane's end could never come out from behind it. The held block now also
    grows by the shortfall before such a scroll.
  - **Leaving a tall box, one move.** When the chip the ring lands on, or the grid's top row, sits inside Steam's
    116 px top margin (after the rest of a tall box was shown), the grid comes down in one smooth move until its
    top row meets Steam's line, as far as the open box's end allows. Steam pulled each row down by itself before
    (73.4, 29.7, 31.2, 28.9 px on four steps of a Left walk). The first look after a landing goes only where
    Steam's own glide puts that chip, so the two never pull different ways.
  - **Left off the first chip is held when nothing above takes it** (claimed, the ring stays), as Left at the
    first chip was before the grid: a Left nobody claims is Steam's own, and on the Deck it carried the ring out
    of the plugin into Steam's side tabs. Up from the top row keeps its old fall-through.
- **Round three (plan 87, after the Deck run of 2026-10-10 02:20, build 95139093,
  `plan87-P87-F3-CHIPS-GRID-try2.json`):**
  - **Steam glides any stop whose top is over its line**, not only one lying wholly inside the 116 px: the
    second chip, at 144.1 to 168.5 with the line near 168, moved 23.5; the toggle above the grid moved 57.8.
  - **Leaving a tall box, one move takes everything the walk back can reach under the line**: the grid's top
    row and the stop drawn just above the grid (the "This answer | Session" toggle; a session row in the Session
    tab; measured, never focused), as far as the open box's end stays readable. Then Left, Up and the toggle
    itself move nothing. That move only ever goes down: a later look never scrolls back up after Steam's glide
    (a box end left hidden shows on the first Down). It starts only when the ring lands on a chip over the line,
    or the chip or top row lies wholly over it; the toggle over the line on its own (left there by a tall first
    box lifted on the way in) never moves the row while the walk goes on.
  - **The ring coming in from outside is placed too.** Down from the toggle and Up from the Hide details line
    focus the ladder's root, which hands the ring to the open chip. Steam stamps its ring a tick after that focus
    event, so the arrival used to read the ring as still outside and do nothing: the first chip's box, entered
    from the toggle, stayed 25.8 px behind the dock, and Developer details, entered from below, kept its end
    hidden while the next Down left (the memory "Down already showed this box's end" was never reset). Now the
    first look at an arrival places the chip without asking, and the later looks still stand down once the ring
    has left. So from below: Steam's glide, then the first Down shows the box's end, the next Down leaves.
- **The held block** (`bonsai-chip-ladder-hold`, unchanged): a step to a shorter box near the pane's end would let
  the browser clamp the scroll and jump the whole row; an empty block after the box keeps the pane's height for
  that step. Its two later checks stand down once the placement has scrolled for the step, so they never undo it.
- **No layout** (a test page): each chip is a row of its own, so Down steps one chip at a time, as before the grid.
- **Not backed by a device row yet.** The Deck check is in the plan 87 lane report.

### The tab bar in Steam's strip, and Decky's bar per tab (plan 84 step 6)

Plan 84 step 6 moves the tab bar out of bonsAI's box, up into the 14-point strip Steam leaves empty at the top
of every Quick Access page plus the top 6 points of Decky's title padding (drawing frame "Z"). While bonsAI is
open, Decky's own page is moved up 14 (Steam's shared padding is never touched: plan 84 test B), Decky's title
padding grows from 6 to 20 and the bar is drawn in it by bonsAI's title view, Decky's 16-point gap shrinks to 4,
and the page gets the 14 points back at its bottom. Off the Main tab, Decky's back arrow is hidden and no name is
drawn, so Decky's bar is the strip alone. Everything is put back when bonsAI closes, and nothing is changed when
Decky's bar is not the shape this expects (the bar then stays in bonsAI's box, with the routes of steps 4 and 5).
Code: `deckyHeaderShape.ts`, `deckyHeaderLayout.ts`, `deckyTitleParts.ts`, `TitleTabStrip.tsx`,
`ChatTitleView.tsx`, `useTopStripTabBar.ts`.

```
Main tab                                            other tabs
y 0-20   [LB .. icon NAME .. RB]   the tab bar      y 0-20   [LB .. icon NAME .. RB]   the tab bar
            | Down        ^ Up                                  | Down        ^ Up (the body's own exit)
y 20-48  [<-]  [ the chat's name ]                  y 24-    the tab's body (TabBodyFocusRoot)
            | Down        ^ Up (takeAboveTheChat)
y 52-    the chat: its first stop
```

Stops: the tab bar (one stop, step 4's) and the chat's name (step 5's). Decky's back arrow is Decky's own control.

- **The tab bar.** Left and LB open the previous tab, Right and RB the next, wrapping, always claimed (past the
  bar Steam would walk out to its own column of tab icons), and the ring stays on the bar. **Up holds** (claimed,
  nothing moves: nothing lies above, and Steam's own Up found nothing there on 2026-10-08). **Down on Main goes to
  the chat's name** by Steam's transfer (the "chat-name" nav node), or, when the name is not drawn yet, to the
  chat's first stop; on the other tabs Down goes to the tab body's root as before. A does nothing; B is Steam's
  own, and Decky's plugin box takes it back to Decky's list.
- **The chat's name.** **Up goes to the tab bar** and **Down to the chat's first stop** (`takeChatFirstStop`: the
  "N earlier" line, the first question's text, or the question box), both by Steam's transfer; either closes an
  open chats menu as the ring goes. Left and Right reach the + and the delete icon (plan 87 F5, below).
  **LB and RB switch tabs from the name too**, and the ring goes to the tab bar first, because the other tabs draw
  no name (left alone, the ring would sit on a control that is gone).
- **Decky's back arrow** (Main only) takes no handler of ours. The name is drawn before the bar in the page (the
  bar is placed at the top by the stylesheet) so that **Right from the arrow reaches the name**, if Steam walks
  Decky's bar in page order: on 2026-10-08 Right from the arrow reached the stop drawn next after it in the page
  (the test bar, then). That reading rests on that one measurement, not on Steam's code: P84-RING-01 checks it.
  **Up from the arrow cannot be routed to the bar by hand**: the arrow is Decky's own button, its moves are not
  ours to set, and a direction read in a button-down handler is dead on the device. Steam's own Up from the arrow
  moved nothing on 2026-10-08; the bar is reached from the arrow by Right then Up. Down from the arrow is Steam's
  own and was not measured with the bar gone from bonsAI's box (a landing on Steam's hidden tab buttons is thrown
  to the bar by the hidden-header trap).
- **Into the top, unchanged in kind:** Up from the top of the chat (`takeAboveTheChat`: the "N earlier" line, the
  first question's text, the first archived row, the chips on an empty chat) goes to the chat's name now, the
  stop right above the chat; Up from the top of a tab body (`TabBodyFocusRoot`), B in a tab body
  (`onCancelFromTabHeader`) and the hidden-header trap go to the bar, which is in the strip now.
- **Never on a hidden control.** Off Main, the name is not drawn at all, and the arrow is hidden: the bar claims
  Left, Right and Up, so no move of ours leads onto the arrow. Steam can still put the ring there itself (plan 84
  test C: Right from Steam's column of tab icons landed on the invisible arrow every time), so **while the arrow
  is hidden, a landing on it is caught** and handed to the tab bar (`deckyHeaderShape.ts`, a watch on the arrow's
  ring marker, like the hidden-header trap), including a ring already on it as it hides (a tab chosen by touch).
  On Main the arrow is visible, Decky's own, and left alone: a person who walks Left onto it stays there.
- **The ring watch after a reopen** counts the bar and the name as bonsAI's (see step 5's section): a ring on the
  bar in the window's first seconds goes to the question box; on the name, it stays.
- **Not backed by a device row yet.** Rows P84-HEIGHT-01, P84-OTHER-01, P84-BACK-01, P84-QAM-01 and P84-RING-01
  (plan 84 § 6) are in the lane report.

### The Ollama tab's setup buttons (plan 87, B13 + B14)

Update AI & models (Install Ollama on a Deck with no engine) runs in place on the tab: no box. The block is
`OllamaWhereAiRunsSection.tsx`; its chain is hand-wired with `focus()` between sibling rows of one panel.

```
Run AI on this Deck (switch)
   | Down                                  ^ Up
Start the AI with the Deck (switch)
   | Down                                  ^ Up
Update AI & models   (never disabled; reads "Updating..." while a run goes)
   | Down  -> Browse models, else Cancel   ^ Up -> Start the AI with the Deck
Browse models...     (disabled while a run goes)
   | Down  -> Test connection              ^ Up -> Update AI & models
Cancel               (drawn only while a run goes)
   | Down  -> Test connection, else on     ^ Up -> Update AI & models, else Start the AI with the Deck
```

- **The Update button is never disabled.** Before, the press opened a download box and the button was disabled while
  the run went on; a disabled button refuses a plain `focus()`, and the ring would have been left on it. Now the
  ring stays where it is after the press. A press on Update while a run goes does nothing.
- **Down from Update** goes to Browse models; while a run goes Browse is disabled, so it goes to Cancel (before, it
  returned `false` and the press landed nowhere). **Up from Cancel** goes to Update, then to the switch above.
- **The line under the buttons is not a stop.** It is plain text (the stage, the newest download progress, then the
  result or the reason it failed). It has no `tabIndex`, takes no ring and is read from the back end's setup status,
  so a rebuilt tab still shows it.
- **The one box left** is the starter-models question on a Deck with no models (the ring opens on "Not now", and the
  shell hands the ring back to the Update button when it closes, as `ollama-local-setup` in
  `modalReturnFocusRegistry.ts`). It is a question with a choice, not a progress notice.
- Pinned by `OllamaWhereAiRunsSection.walk.test.tsx` (the walk, with a run going) and
  `OllamaWhereAiRunsSection.inPlaceSetup.test.tsx` (no box, the lines). Device row: the plan 87 Ollama block.

### The About tab, one line per row (plan 92, lane T3; plan 91 § 6)

The About tab is `AboutTab.tsx`: the title line "About bonsAI" with the version beside it, the "What bonsAI is"
paragraph and the beta notice (plain text, always drawn, as before plan 92: the maintainer asked for them back on
2026-10-12), Reply language
(`AboutReplyLanguageSection.tsx`, with `useRevealWhileRinged` from `AboutRevealRow.tsx` for its hint), and the links
(`AboutLinks.tsx`). Five stops, no hand-written move anywhere except inside the links block and one transfer out of
Reply language.

```
tab bar
   | Down  (the tab body's own transfer)      ^ Up from the first stop (TabBodyFocusRoot's onMoveUp)
(Version, "What bonsAI is" paragraph, beta notice: plain text above, no stops, no ring)
[ Follow system                                     ▾ ]   <- Steam's Dropdown, full width, no label; its hint opens under the row while the ring is on it
   | Down = takeNavFocus("about-links")       ^ Up (Steam's step)
[ GitHub ]            ┐
[ Built on Ollama! ]  ├─ Right from any -> [ QR: Support my Steam Sale habit ]
[ Bugs & Feature Requests ] ┘    Left from the QR -> the button the ring left from (same height)
   Down from the last button: holds still        Down from the QR: holds still
```

- **Stops:** exactly five, in this order: the Reply language dropdown, GitHub, Built on Ollama!, Bugs & Feature
  Requests, the QR code. The version (in the title line), the "What bonsAI is" paragraph, the beta notice and the hint are plain
  text: no `tabindex`, no ring. The first stop is the dropdown, so Down from the tab bar lands on it.
- **The Reply language hint opens on the ring, and only then.** It is drawn under the row while the row holds the
  ring and removed when it leaves. The row's `Focusable` carries `onGamepadFocus` / `onGamepadBlur` (what Steam
  delivers) and `onFocus` / `onBlur` (a plain DOM focus, the second signal, and the one the tests use). The text
  sits outside the `Focusable`, so the ring stays on the one line. Nothing is remembered: a rebuilt tab starts
  with it closed.
- **Down from Reply language is a transfer, not a step.** The dropdown sits on the right of its row; Steam's own
  step from there would pick the QR code (it is straight below). The row's `Focusable` claims Down and calls
  `takeNavFocus("about-links")`, a nav id the links block registers (`navFocusRegistry.ts`); a transfer onto a
  container lands on its first stop, GitHub. If the block is not registered the handler returns `false` and Steam
  steps as usual.
- **Inside the links block, Steam walks by each container's flow, not by distance.** The block is a `Focusable`
  with `flow-children="horizontal"` holding two children: a `Focusable` with `flow-children="vertical"`
  (`.bonsai-about-links-col`) around the three buttons' wrappers, then the QR's wrapper. Down and Up between the
  buttons are Steam's own step along that column. **Round two (2026-10-12):** the first round left the block with
  no flow and the buttons in a plain `div`; on the Deck (build 5d67f9d9) Down from GitHub was dead three presses
  running: with no flow set, Steam did not step between those children. Right from a button
  remembers its index and makes Steam's transfer onto the QR wrapper's own nav node (`TakeFocus` on its
  `navRef`); Left from the QR makes the same transfer onto the remembered button's wrapper. If a node is not
  filled in yet the handler returns `false`, and Right still reaches the QR by the block's row. Down from the
  last button, and from the QR, is claimed and does nothing. The remembered index lives in a module-level store
  (`rememberAboutLinkButton`), not in component state, because closing a Decky popup rebuilds the tab
  (lessons § 3). The move handlers are on a `Focusable` around each `Button`, not on the Button: a Decky `Button`
  does not forward `onMoveX`. Up from GitHub is left to Steam: it passes out of the column and the row to the
  tab's own column of rows, which steps up to Reply language.
- **The look of the three link buttons** is the floating Open all button's: the glass fill, border and light text
  from `settingsGlassButton.ts` (`SETTINGS_GLASS_BTN_*`, one shared value), with the white ring class as usual.
  The QR block keeps its own plain look. Driver hooks: `[data-bonsai-about-link="github" | "ollama" | "bugs"]`,
  `[data-bonsai-about-qr]`, `[data-bonsai-about-language-dropdown]`, `[data-bonsai-about-version]`,
  `[data-bonsai-about-blurb]`, `[data-bonsai-about-beta]`.
- **A** (`onClick`) on a link opens it; A on the QR opens the support page (`https://paypal.me/quentind313`), as the
  old "Support my Steam Sale habit" button did.
- **Tests:** `AboutTab.test.tsx` (the words against the drawing's data file, the paragraphs, the QR's size read
  out of the stylesheet), `AboutLinks.test.tsx` (the block's walk, the remembered height across an unmount and
  remount, A on each), `AboutTab.walk.test.tsx` (a bounded Down, Right, Left, Up walk of the whole tab in a
  scrolling pane at 400 and 741 points, with Steam's step through its containers and their flows, and its scroll,
  modelled by `steamStep` in `src/test-harness/aboutDeckyUi.tsx`; it fails on build 5d67f9d9 the way the Deck did).
  The real check is the Deck walk (plan 92, block 3).

### The AI models box's filters column (plan 91, M1)

The filters sit in a column to the left of the model list, always on screen (`PullModelsFiltersColumn.tsx`, inside
`PullModelsModal.tsx`, inside the AI models screen `OllamaModelsHubModal.tsx`). It replaces plan 62's "Filters · N on"
button and the panel it opened over the list: that route (Down or B inside the panel closing it) is gone.

```
title row: "AI models"  ................  [ Advanced › ]      (its own Focusable, so it can be a transfer target)
   | Down  ^ Up                                ^ Up from the switch, or from the first row with no switch
Installed 3 · 9 GB   Queue 0 · 0 GB   Live sizes [ ↻ ]   (the header line; ↻ in its own Focusable)
   | Down  ^ Up        (Advanced <-> ↻ <-> Clear; ↻ skipped both ways while greyed, the list loading)
[ 7 models match        Clear ] <-> [ Text ][ Pictures ][ Reset order ]   (the try-order switch, level with Clear)
LICENCE   (•) Open source only     -> ☆ row 1 (32 px below)   Right from a column stop -> the nearest stop on the right
          ( ) Also try open-weight <-> ☆ row 1                Left from a row's star   -> the nearest filter
          ( ) Any installed model  x-  ☆ row 2 -> Also try    (both measured at the press, within 1.5 model rows,
GOOD FOR  [ ] Speed               <-> ☆ row 3                 about 52 px; held only when nothing is that close)
SHOW      [ ] Installed only ...      |
[ Type a name ] [ Install the starter set ] SUGGESTED [ chip ] [ chip ]
   | Down past the last stop -> Steam's own (Done)   | Down past the last row -> Steam's own (Done), as before
[ Done ]  [ Cancel ]
```

- **Stops:** Clear, the ten filter rows (the greyed third licence row is skipped until it is unlocked: the column skips
  it by its own knowledge that the row is off, because on the Deck a greyed button carries only a `Disabled` class, not
  the browser's `disabled`, and a plain `focus()` lands on it; plan 92's second round), "Type a name"
  (or, once open, its field row, whose landing is the "×"), "Install the starter set" while the starter model is
  missing, and each Suggested chip. All are plain buttons directly inside one `Focusable` (the column), so Up and Down
  between them are plain sibling `focus()` moves (`step()` in the column file). **The one exception, carried over
  unchanged:** the open "Type a name" row is its own horizontal `Focusable` (Left and Right between the field, Pull and
  "×" are Steam's own, and it owns B), and the moves into it (the chip opening onto "×", Down onto it) and out of it are
  plain `focus()` hops, exactly as they were from the old Filters row since plan 62. Watch it on the Deck; if the ring
  stays behind there, the fix is a transfer onto that row's nav node.
- **Right and Left between the column and the list go to what sits beside the ring** (plan 92's second night; the
  maintainer's call after the Deck's map, plan92-P92-M-MODELS-MAP.json, found Right from 10 of 12 column stops landing
  32 to 100 px above or below the ring on "the list's remembered row"). At the press, `pullModelsBeside.ts` measures the
  ring's button and the candidates on the other side: for Right, the try-order switch's active chip and each row's star
  whose centre is in sight in the list (below its sticky header row, above its bottom edge); for Left, the column's
  stops whose centre is in sight in the column (the column hands over only the stops that can take the ring, the
  greyed licence row left out by its own state). It picks the nearest centre within **one and a half model rows**
  (`BESIDE_REACH_ROWS` times the first drawn row's height, about 52 px on the Deck: the session's call, because a held
  press feels dead); with none that near, or no rows at all, the press is **held**, which on the Deck's own screen
  happens only with an empty list. Left from a star level with the greyed row goes to the nearest other filter. Both sides scroll on their
  own, so nothing is read from a stored index. A press straight back (Right then Left, or Left then Right) returns to
  where the first came from while that is still level. The ring crosses only by Steam's own transfer (`handRingTo`, a
  `TakeFocus` on the list's, the column's or the switch row's `navRef`), then a sibling `focus()` onto the chosen stop.
  Right always lands on a row's star (or a PC row's up button), never its Remove. Left from the switch is Steam's own.
- **Advanced, Refresh (↻) and Clear, the same order both ways** (plan 92's second round: on the Deck Down went
  Advanced, Refresh, Clear by Steam's own guess, but Up from Clear skipped Refresh). Down from Advanced is the hub's own
  handler, calling the box's `downFromAboveRef`: a transfer onto the header line's `Focusable` (Refresh), or, while
  Refresh is greyed, onto the column and its Clear. Down from Refresh is a transfer onto the column, then Clear. Up from
  Clear is a transfer onto Refresh, or onto Advanced while Refresh is greyed; Up from Refresh is the screen's
  `onMoveUpFromTop`, a transfer onto the Advanced link's own `Focusable`. A greyed Refresh is skipped by the box's own
  state (the list loading or refreshing), never by asking the button, because on the Deck a greyed button still takes
  the ring. Right from Refresh goes to Advanced and Left from Advanced to Refresh, by the beside rule above (`isBeside`, the
  same one and a half rows: they sit about 31 px apart on the Deck; never onto a greyed Refresh); Left on Refresh is Steam's own. Up from the try-order switch, or from the first row when there is
  no switch, goes straight to Advanced as before. Without the screen (no handler) the press is Steam's own.
- **Down past the last stop** returns `false`, so Steam carries the ring on to the dialog's Done, the same rule the
  list's last row follows (focus-graph-patterns: a container's last stop must not claim Down).
- **The containers and their flow.** Steam moves the ring between a container's children only along its
  `flow-children`, and a container with no flow on that axis hands the press to its parent (plan 92, the About tab's
  dead Down). So: the column is `flow-children="column"` with every row a direct nav child (the group headings and
  row wrappers are plain divs); the column and the list sit in one `Focusable` with `flow-children="row"`
  (`.bonsai-pullmodels-split`), so a Down neither side takes leaves the pair for the footer instead of stepping from
  the column into the list; the list's own `Focusable` has no flow, so Steam never steps from a row's star along to
  its Remove. The walk test models exactly this rule, with a stand-in for the dialog's body and footer.
- **Left** inside the column is held (nothing sits to its left). **B** is not claimed in the column, so it does what it
  does for the box; the one exception is the open "Type a name" field row, whose B closes just the field.
- **The Good for and Show picks** live in a module-level store (`pullModelsBoxMemory.ts`), because closing a Decky popup
  rebuilds what is behind it (lessons § 3). The licence pick is saved on Done, as before. Nothing is remembered for Right
  and Left any more (the two "come back here" memories of plan 91 went with the beside rule).
- **Where the ring opens** is unchanged: on Advanced, Steam's first stop in the screen.
- **Tests:** `PullModelsFiltersColumn.test.tsx` (steamRing stand-in, so a bare cross-container `focus()` fails): the rows
  and headings, the counts against the rows drawn under both licence picks, Clear, Advanced, Refresh and Clear mirrored (and Refresh skipped while greyed), Down left to
  Steam, Done keeping the picks, and a bounded walk of the whole box from Advanced with Steam's scroll in a short column
  and list. Its last block lays the box out on the Deck's own map (each side with its own scroll) and presses Right and
  Left from the measured stops and rows, with two bounded walks (down the column pressing Right and back at every stop,
  down the list pressing Left and back at every row: no stop twice, no dead press, every landing within reach, never the
  greyed row); `pullModelsBeside.test.ts` pins the pure choice. Its button stand-in draws a greyed button the Deck's
  way: a `Disabled` class, still focusable. `PullModelsFiltersColumn.layout.test.ts` works the list's
  grid out from the stylesheet's numbers (the Model column no more than 10 per cent narrower than M-A's 124.3).
- **Device rows:** P91-MODELS-COLUMN-WALK, -FILTERS, -DONE-KEEPS, -WIDTH (plan 91 § 5, block 4).

### The Search tab (plan 92, lane N3)

The first tab, left of Main, with a magnifier. `SearchTab.tsx` draws it inside the tab body root (`TabBodyFocusRoot`,
id `search`), so Down from the tab bar lands on its first stop and Up from its top row goes back to the bar.

```
tab bar
   | Down  (takeNavFocus "tab-body:search", lands on [ All ])      ^ Up  (takeNavFocus "tab-bar")
[ All ] [ Hollow Knight ] [ Hades ] ...     Left / Right walk the row, hold still at both ends; A picks the game
   | Down (from any game button)            ^ Up (onto the picked game, All when none)
[ find box: "Chats, settings, notes..." ]   A opens Steam's keyboard; Left / Right hold still
   | Down (onto the first word)             ^ Up (from any word of the first row)
[ mantis 5 ] [ charm 3 ] [ claw 2 ] [ greenpath 2 ]     Left / Right along the row; A puts the word in the box
[ lords 2 ]  [ battery 1 ] [ boon 1 ] [ build 1 ]       and the ring on the first match
   | Down                                   ^ Up
   -- a word of two letters or more is in the box --         -- before that --
"N matches for 'word'"  [ Clear ]                           your notes, newest first, one stop each
   match rows, one stop each, in the order         A flips the note's switch
   chats, notes, settings, game and help notes     Down from the last row holds still
   A: chat = opens that chat on the question (below); note = its switch;
   setting = opens it in Steam; game note = its sheet
```

- **Stops.** Every pressable control is one stop in a row of the tab: the game buttons, the find box, the word
  buttons (two rows of four), Clear, each match, each note. The count line, the group headings, the hint lines and
  the tab's heading are not stops.
- **Every move is written by hand, in one place.** `searchNav.ts` is the rule (Left and Right along a row, holding
  still at both ends, so a Right nobody claims cannot carry the ring into Steam's side rail; Up and Down to the row
  above or below, onto the stop nearest in x, measured at the press, or the same place in the row where nothing is
  measured; Up from the top row leaves; Down from the last row holds). The find box spans its row, so its x names
  no stop: Up from it lands on the picked game (All when none) and Down from it on the first word. `useSearchNav.ts`
  keeps the stops and moves the ring.
- **A move handler never throws.** On the Deck a throw hands the press back to Steam, which steps along its own
  order: build 649daecc measured the find box through a `ref` on Steam's text field, which holds the component (a
  class), not the input, so every press that measured it threw, and Down on a game button went to the next game, Up
  on a word to the word before it, Up from the box to the last game. The box's stop is now the input inside it, and
  a stop that is not an element is skipped rather than measured. The tests' text field hands its `ref` the
  component the same way, and a handler that throws steps along the page's order there too.
- **No plain `focus()` across containers.** The find box is a Steam text field, which is a container of its own, so
  every hop (to and from it, and between the buttons too) is Steam's own transfer, the stop's nav node `TakeFocus`
  (`takeHolderFocus`); a plain `focus()` is only the fallback for the frames before Steam has filled the node. No
  hop searches the page: the stops are kept from their `ref`s.
- **No stop relies on Steam's flow-children.** Steam moves the ring between a Focusable's children only along that
  container's flow (row or column), not by where they sit; a group with no flow gave Down nowhere to go on the About
  tab (Deck, 2026-10-12) while a test whose stand-ins moved by geometry passed. Here every stop carries all four move
  handlers and each claims its press, so Steam's flow is never asked; the walk test's stand-ins move only when a
  stop's own handler moves them, and a test checks every stop carries and claims all four.
- **A is `onOKButton` and `onClick` together**, as the chats menu's rows are, with a press that arrives as both
  counted once (`SearchStop.tsx`), so a note's switch cannot flip twice from one press.
- **After a press that redraws, the ring goes where the person would look.** A word button puts it on the first
  match; Clear puts it on the find box; closing a game note's sheet puts it back on the match that opened it, kept in
  a small module store (`searchTabStore.ts`) because a rebuilt tab loses component state. The move is made in a layout
  effect, once the target is drawn (never on a frame timer). A match that arrives later (the game notes come from
  the knowledge library) keeps the wish until it appears.
- **B anywhere on the tab goes back to the tab the person came from** (Main when unknown; About after the bumpers
  wrapped round to Search). The tab's own root `Focusable` carries `onCancelButton`, so a B from any stop reaches it
  after the stop's own, and the handler's presence keeps B from closing Quick Access. The tab before Search is noted
  by `useSearchTabPayload.tsx` each time Search opens and kept in `searchJumpStore.ts`. The open game note's Close
  and text keep their own B (they close the note and answer first). The find box is Steam's text field: B while
  Steam's keyboard is open belongs to the keyboard.
- **A game note opens inside the tab**, not in a Steam popup (closing a popup rebuilds the whole tab and the word and
  game would be lost). The sheet's stops are Close and the note's text; B on either closes it. The matches are
  unmounted while it is open, so no stop of theirs can be reached underneath.
- **The typed path has a known hazard** (to be checked once on the Deck): A on a plain Steam text field opens Steam's
  keyboard, and after it closes the field can leave the D-pad dead until the panel is closed and reopened
  (deck-driver rule 1). The word buttons are the first path for that reason. The question box's two-layer field
  (an invisible native field under a drawn copy) was not reused: it is built into the Ask bar's own state and styles.
- **Pinned by** `searchNav.test.ts` (the rule), `SearchTab.walk.test.tsx` (the real tab walked Down and Up in a
  scrolling pane with Steam's scroll modelled three ways, on a short screen and a tall one, in both states of the
  tab: no stop twice, none off screen, no press turns the page half its height, Up from the top leaves through the
  bar, Left and Right reach every stop in a row and hold at both ends) and `SearchTab.test.tsx` (what each A does).
  Device rows: plan 92, block 3.

### The jump from a chat match, the Back line and the way back (plan 92, lane N3b)

A on a match under "Your chats" leaves the Search tab for the chat it came from. Three screens are involved, and
they are never drawn together, so everything they share lives in one small module store (`searchJumpStore.ts`), not
in component state (a tab switch throws the screen away; lessons-learned.md, section 3).

```
Search tab                                    Main tab (the chat is already loaded)
[ match: "Where do I find the Mantis Claw?" ]
   A  -> store: word, game, match, chat,      tab bar
         question; Back line switched on         | Down (takeBackLine first, then takeEarlierLine)
      -> root loads the chat, THEN selectTab   [ <  Back to where you were ]    <- the first stop under the bar
         ("main")                                | Down (takeHolderFocus onto "N earlier")   ^ Up (takeAboveTheChat)
                                               [ 27 earlier ]   A opens it       <- Up goes to the Back line
                                                 | Down
                                               [ Sun 20 Sep . 4 ]  [ Mon 21 Sep . 9  (open) ]   ...
                                                   [ row ] x 9 (one "Show 3 more" press made the 9th appear)
                                                   [ row: "...question 9..." ]    <- the ring lands here
                                               [ newest question ]
   A on the Back line -> store: jump over, Search tab remembers word and game, ring wish = the same match
                      -> selectTab("search") (the shell's own switch)
Search tab, drawn again: word and game back in the box; the ring goes to the same match once the chats are read.
```

- **The ring lands on the question through Steam's own transfer.** `useEarlierTurnsPill.ts` waits for the chat to be
  loaded (the question is in `askThreadCollapsed`), opens "N earlier", opens the day that holds the question
  (`locateEarlierTurn` in `earlierTurnsByDay.ts`), sets the day's "Show N more" count to the number of presses that
  question needs, and hands the ring to the question row's nav node (`takeHolderFocus`), the same hand-off the real
  "Show N more" press uses. It waits for the commit that draws the row (React may split the reveal's updates) and
  looks again 150 and 450 ms later, taking the ring back to the question if Steam moved it while the tab settled. A
  question among the newest turns (not under "N earlier"), or in a chat too short for the line, gets the ring where it
  is, with "N earlier" left shut.
- **The Back line is one stop, drawn only while the jump is live and the chat holds the jump's question.** It is the
  first thing in the transcript (`SearchBackLine.tsx`, drawn by `buildEarlierList.tsx`). Down: onto "N earlier", or
  onto the first question in a short chat. Up: onto the stop above the chat (`takeAboveTheChat`). Left and Right hold
  still, since a Right nobody claims would carry the ring out of the plugin. "N earlier"'s Up and a short chat's first
  question's Up go to the Back line instead of the tab bar while it shows; Down from the tab bar lands on it
  (`takeFirstChatStop.ts`). A ends the jump and switches to the Search tab; B is not claimed (it closes nothing).
- **The jump's memory** (`searchJumpStore.ts`) holds the word, the game, the match key, the chat and question, whether
  the chat has been put on the question yet, the tab the person came from, and where the ring goes when the Search tab
  is drawn next (the find box, or a match). The ring wish stays until the Search tab has landed the ring, so a tab
  thrown away and drawn a second time still lands it. The Main tab and the Search tab are given the shell's own
  `selectTab` (`useSearchTabPayload.tsx`), so a jump, the Back line, B and Y switch tabs exactly as the tab bar does.
- **Pinned by** `MainTabChatTranscript.searchJump.test.tsx` (28 questions over five days, the match on day two,
  question nine: the right day opens, enough questions show, the ring arrives through a nav node; the Back line's
  Down, Up, Left, Right and a walk with no stop twice; A on it; the memory across an unmount and a remount),
  `SearchTab.jump.test.tsx`, `earlierTurnsByDay.test.ts` and `useSearchTabPayload.test.tsx`. Device row: plan 92, block 5.

### Y on the Main tab opens the Search tab (plan 92, lane N3b)

```
Main tab, the ring anywhere on the panel (question box, a chip, the chat's name in Decky's bar, an answer)
   Y  (button 4, vgp_onbuttondown at the panel's document, capture phase)
      -> selectTab("search")   the shell's own switch, as a press on the tab bar makes
      -> Search tab drawn: Steam's ring goes to the find box, once the tab is on screen
   B  -> back to Main (the tab before Search)
```

- **Y is heard at the panel's document, not on a control**, the way LT and RT are (`useChatTriggerSwitch.ts`): the
  Deck measured (plan 92, M-Y) that a Y press arrives as button 4 with the ring on the question box, a chip, the tab
  bar and an answer's first stop, and that Steam does nothing with it. `useSearchShortcut.ts` is one listener, kept
  in `useSearchTabPayload.tsx` so it lives as long as the plugin root.
- **It acts only on the Main tab**, and not while the chats menu is open (`chatTitleStore`'s `menuOpen`) or a box that
  asked for the ring back is open (`peekModalReturnFocus`: rename, save, the character picker, the models hub and
  the rest). Every other button passes by untouched, nothing is prevented or stopped.
- **Steam's on-screen keyboard is not tested for**, because the plugin has no signal for it: with the ring on the
  question box the page's focus is on the text field whether the keyboard is shut or open. The keyboard takes the
  controller while it is open, so a Y then should never arrive. The Deck row presses Y with the keyboard open and
  expects nothing; if Y gets through, the signal to add is a read of Steam's own keyboard state.
- **The ring lands on the find box.** The wish is kept in `searchJumpStore.ts` (`arrival: "find"`) until the Search
  tab has put the ring there; the tab looks again 150 and 450 ms later and takes the ring back if Steam moved it
  while the tab settled. `isOptionsDeckButtonEvent` (`focusNavigation.ts`) is the Y predicate: button 4 only.
- **Pinned by** `useSearchShortcut.test.tsx` (Y on Main opens Search; other tabs, the open menu and an open box do
  nothing; every other button is left alone), `useSearchTabPayload.test.tsx` (the shell's switch is what Y uses),
  `SearchTab.jump.test.tsx` (the ring on the find box) and `focusNavigation.test.ts` (the predicate). Device row:
  plan 92, block 5.

### A folded tab: section lines, the floating Open all button, the help strip (plan 91 § 2b, plan 92 T0)

The Ollama tab first; Settings and Developer reuse the same pieces (`src/features/folded-tabs/`). Each section
folds to one line (`FoldedSection.tsx`): its name, a summary of its values, a chevron. A opens or closes it, several
can be open at once. Inside an open section, one row per setting. The ringed row's longer text shows in the strip at
the bottom of the panel. A small floating button in the bottom-right corner opens or closes every section.

```
tab bar
   | Down                               ^ Up (from the first section line)
[ WHERE AI RUNS   Run AI on this Deck on · Start…  ▾ ]  --Right-->  [ ⊞ Open all ]  (floating)
   | Down (open: into the first control; closed: the next line)   <-- Up, Down, Left or B come back here
   row, row, row ...                      (Up from the first row -> the section line)
   | Down from the last row -> the next section line
[ KNOWLEDGE BASE (OFFLINE)   Use local knowledge base on  ▸ ]
   | Down                               ^ Up (an open section above: its last control; closed: its line)
   ...
[ AI MODELS                                             ▸ ]
   | Down from the last line (or the last row) holds still
=========== the strip: "TERSE MODE  Speed mode only. Keeps each answer to three short lines…" ===========
```

- **Stops:** each section line (a `Focusable` with `focusable: true` and `noFocusRing`; its class never changes,
  open or closed is `data-open`, so Steam's `gpfocus` marker in the class is never wiped), every control inside an
  open section, and the floating button. The strip and the summaries are not stops.
- **Moves, all written by hand on the line** (`FoldedSection`): Down goes into the section's first control when it
  is open (the tab's `enterFromTop`), else to the next line; Up goes to the previous section's last control when that
  section is open (`enterFromBottom`), else to its line; the first line's Up goes to the tab bar; the last line's
  Down holds still. Line to line, and onto the button and back, is Steam's own transfer (`takeNavFocus` onto the
  line's registered nav node, `fold-line:<tab>:<section>`; the button's is `fold-all:<tab>`), never a plain
  `focus()`. Into and out of a section's rows the tab uses its own row hops (`focusInTabBody`), inside the one tab
  body, as before. A section's last control hands Down to the next line (`foldLineBelow`); its first control hands
  Up to its own line.
- **One column holds them all.** Every line, every control of an open section and the next section's line are
  children of one `Focusable` with `flow-children="vertical"` (`FoldedColumn`), in order. Steam moves the ring
  between a container's children only along its flow (the About tab's link buttons, 2026-10-12, were dead going
  Down in a container with none), so a press no handler claims still goes to the next thing below: on the Ollama
  tab, Down from Test connection, from Update or Browse models, from the knowledge base's Download button (Decky's
  Button keeps no move handler) and from Custom timeouts. `foldedTabWalk.tsx` models exactly that rule; with the
  column's flow taken away the Ollama walk stops at Test connection.
- **The Ollama tab's chain** (`useOllamaTabFocus.ts`, `chain`): Where AI runs enters at Run AI on this Deck and
  leaves Up from Test connection (or Steam's own move while it is disabled); Knowledge base at its switch and its
  Cancel, Download or Remove; Reply style at the slider's knob and the Thinking row; Connection tuning at Custom
  timeouts and the Keep models loaded knob; AI models at its button, whose Down holds still (the floating button
  sits below it). Run AI on this Deck, the knowledge base switch, the Reply style knob, Custom timeouts and the AI
  models button hand Up to their own line; Thinking and Keep models loaded hand Down to the next line by hand,
  and Test connection and the knowledge base's buttons get there by the column's flow.
- **Right from any line** puts the ring on the floating button. **On the button:** A opens every section (it then
  reads "⊟ Close all") or closes them all, and the ring stays on the button; Up, Down, Left and B put the ring back
  on the line it came from; Right holds still. The line it came from is the section the ring last landed in, kept
  in `foldedTabsStore.ts`, so a rebuild of the tab (a Decky popup closing) does not lose it.
- **LB and RB work with the ring on the button:** the dock is outside Steam's own Tabs, which never sees a shoulder
  press there, so the button's host takes `onButtonDown` and asks the tab bar to step (`shoulderSwitch.ts`, registered
  by `TabIndicatorBar`); the arrival then puts the ring on the new tab's first line, or on the bar when that tab is not
  folded.
- **The button and the strip are drawn beside Steam's scroll pane**, in bonsAI's tabs box (`TabHelpStrip.tsx`), not
  inside the pane: a focusable button at the very bottom of the pane lies outside Steam's band (116 px top, 80 px
  bottom) and Steam would scroll the pane to bring it in. They show only while their tab is the one on screen.
- **The strip** is filled on the landing's own focus event (the tab body's capture-phase listener, the one the
  scroll plan uses), from the ringed row's `data-bonsai-help` and `data-bonsai-help-label`. While it shows, the
  scroll plan's bottom margin grows by its measured height, so the ringed row is placed clear of it; a folded tab
  turns the page by a shorter step (`FOLDED_TAB_SCROLL_STEP_FRACTION`, under a third of the pane).
- **Open sections survive a rebuild but not a tab switch:** the open set is in `foldedTabsStore.ts`, for the
  session only. Every section starts closed; one a person opens stays open while they stay on the tab and after a
  popup closes over it (the tab is rebuilt); any real tab switch (the bar, LB, RB, Y) closes them all again
  (`closeAllFoldedSections`, called from the shell's `selectTab` and `onTabsShowTab`, never from the post-popup
  lock's redirect, a remount or the session restore).
  On arrival the page is put at its top (`foldedTabArrival.ts`), and after Steam's LB/RB switch the first section
  line has the ring (Steam's own placement on arrival, the last line included, is not the person's) until the
  person presses something on a section line (`notePersonPress`); a bar press keeps the ring on the bar.
- **Class names a Deck driver can find:** the line `.bonsai-fold-line` (`[data-bonsai-fold-line="<section>"]`,
  `[data-open]`), its parts `.bonsai-fold-line__name`, `__summary`, `__chevron`; the open rows `.bonsai-fold-body`;
  the button's host `.bonsai-fold-all-host` (`[data-bonsai-fold-all="<tab>"]`) and the button `.bonsai-fold-all`;
  the strip `.bonsai-fold-strip` (`[data-bonsai-help-strip="<tab>"]`), its `__label` and `__text`; the dock around
  them `.bonsai-fold-dock`.
- **Tests:** `FoldedSection.test.tsx` (open and closed, several open, the first-visit default, the open set through
  an unmount and a remount, the line's moves), `FoldAllButton.test.tsx` (Right onto it, A, the four ways back, also
  after a rebuild), `TabHelpStrip.test.tsx` (the strip's text on the landing, hidden without, the band arithmetic
  from the stylesheet). Device rows: P91-FOLD-OLLAMA, P91-STRIP, P91-FOLD-ALL-BUTTON (plan 91 § 5).


### The note card and the "Read N of your notes" line (plan 92, lane N2)

_Code: `src/features/user-notes/` (`NoteOfferCard.tsx`, `NotesReadLine.tsx`, `UserNotesSheet.tsx`, `userNotesStore.ts`);
mounted by `buildReplyActionsElement.tsx` (the card), `MainTabChatTranscript.tsx` (the line); stops registered in
`replyStopRegistry.ts` as `notes-line`, `note-keep` and `note-for`._

**The card**, under the newest answer, after the Helpful / Not really row (and its "What went wrong?" choices when the
reply was rated down) and before the Show details line. It exists only while a note is on offer (the back end sent
`note_offer` with the answer, or "remember ..." was typed) and never on the live turn, which is archived the moment the
answer finishes. Drawn top to bottom: the lead line, the note's words, the three buttons, then the "For" line.

```
the rating row (or the last row of its reason choices)        <- Down from it lands on Keep
   | Down                                         ^ Up (from any of the three)
[ Keep ] --Right--> [ Edit ] --Right--> [ Not now ]      Left at Keep and Right at Not now hold still
   | Down (from any of the three)                 ^ Up
"For: Hollow Knight ▸"                                    A flips this game / every game; Left and Right hold still
   | Down                                         ^ Up
the Show details line, as before
```

- **Every stop carries all four move handlers and claims its press** (the About tab's Deck failure, 2026-10-12: a
  group with no flow gave Down nowhere to go). Keep, Edit and Not now are siblings in one row, so the hops between them
  are Steam's transfer onto the sibling's nav node followed by a plain focus. Everything that crosses containers goes
  through Steam's transfer: Keep and the "For" line each have their own nav node (`replyStopNavRef`), so the hop
  between the row and the "For" line, and in and out of the card, is `focusRegisteredReplyStop`.
- **In and out of the card are the turn's own graph, not the card's.** Down from Helpful (`downFromThumbs`), from the
  last reason choice (the choices' row gained an `onMoveDown`), from the answer's end (`focusDownFromLiveAnswerBubble`,
  the bubble's own Down, the corner icons' Down and the summed-up note's Down: each chain gained `note-keep` after
  `reason-chips`) all land on Keep. Up from Show details lands on the "For" line (`upFromDivider`); Up from Keep, Edit
  or Not now goes where Up from Show details used to go (`upFromRetry`: the choices, Helpful, the branch picker, the
  summed-up note, the answer's last section). Down from the "For" line goes to Show details.
- **Keep, Edit and the "For" line are A as `onOKButton` plus `onClick`**, never `onActivate` too (Steam fires it for A as
  well). Keep saves through `save_user_note` and the card becomes one line; the ring was on Keep, which is gone, so it is
  handed to Show details once the card has changed (the same hand-over Helpful makes). Not now removes the card and
  hands the ring on the same way. A refusal keeps the card and shows the back end's words.
- **The card is the ring's first stop when it appears**, once, unless the person is typing in a text box. The wish
  ("put the ring on Keep for this offer") is in the store, so a rebuilt tab neither forgets it nor repeats it.
- **Edit opens a Steam popup** (`NoteEditModal.tsx`, shaped like the chat rename). Closing a popup rebuilds the tab
  (docs/lessons-learned.md), so the pending offer, the edited words and "the ring goes back to Keep" all live in
  `userNotesStore.ts`, and the rebuilt card tries a few times, while the tab mounts, to put the ring back on Keep. The
  popup goes through the shell's `onBeforeNestedDeckyModal` / `onCompleteNestedDeckyModalClose`, handed in by
  `useUserNotesBridge` (one call in `MainTab.tsx`) because the transcript's builders cannot reach them.
- **Drawn order differs from the plan's sketch on purpose.** Plan 90 § 6 draws the "For" line below the buttons and the
  mock-up board's card (47b-notes-r2.js) draws it above; this follows the plan's graph and its Deck check (rating row,
  card, "For" line, Show details), so the D-pad order is the drawn order.
- **Pinned by** `NoteOfferCard.test.tsx` (buttons, Keep / Edit / Not now, the popup through a rebuild, all four
  directions on every stop), `UserNotes.walk.test.tsx` (the rows walked Down and Up in the Deck's numbers under every
  Steam scroll rule: no stop twice, none off screen, with and without thumbs and choices) and
  `UserNotes.transcript.test.tsx` (the real transcript). Device rows: plan 92, block 5.

**The line**, between the question and the answer (above the Show reasoning line when the turn has one). It is one
stop, `notes-line`, drawn only on a turn whose saved record says notes were read ("Read 1 of your notes", "Read 2 of
your notes") or were all off ("Your notes are all off").

```
the question (its text, or its row when it has no Retry)       <- Down from it lands on the line
   | Down                                         ^ Up
Read 1 of your notes ▸                              A opens the sheet; Left and Right hold still
   | Down                                         ^ Up
the Show reasoning line when this turn has one, else the answer's first section
```

- The question's Down (`buildTurnHeaderElement`) tries the line before the Show reasoning line; the Show reasoning
  line's Up tries the line before the question; the line's Up is the question's text (`focusOpenQuestionText`), else its
  row; the line's Down is the Show reasoning line, else the answer's first section. All inside the turn's own column,
  so those hops are plain focus calls. The line has its own nav node.
- **The sheet is a Steam popup** (`UserNotesSheet.tsx`): every note with its words, its game or "Every game", a switch
  (A on the words) and a Remove bin (A), under "Ask reads the ones that are on, every time you ask about that game."
  Every stop claims all four directions itself (Deck, plan 92: left to Steam, Up from Close landed on a bin and Left
  from the bin was dead). A note's switch and its bin are one row: Right goes switch to bin, Left back, both ends hold
  still. Up and Down go note to note in the same column (switches with switches, bins with bins), the last note's Down
  is Close, and Up from Close is the last note's switch. All siblings in one popup, so a plain focus. After Remove the
  ring goes to the row now in its place, else the one before, else Close. B or Close closes it once.
- **The claim ends at the person's next press** (a button or key heard at the panel's document, ignoring the first
  150 ms while B itself arrives) and once the line has held the ring for a second without being drawn again, so a Down
  pressed just after B is never pulled back (Deck, plan92-P90-NOTES-SHEET-try2.json).
- **The ring returns to the line.** Opening the sheet writes the turn's key into the store (`sheetOpenedFrom`); closing
  the popup rebuilds the tab and the rebuilt line, seeing its own key with the sheet closed, takes the ring back (a
  few tries while the tab mounts) and clears the note. `NotesReadLine.test.tsx` unmounts and remounts between the open
  and the return, as lessons-learned requires.

### The Developer tab, folded (plan 91 § 2b, plan 92 lane T2)

The same pieces as the Ollama tab (`src/features/folded-tabs/`, the section above); only the sections and the rows are the Developer tab's. Six sections, in
order: Knowledge base (drawn only when a seed install was passed in), Diagnostics, Navigation, Logging & exports,
Animations, Integrations. Each section folds to one line with a summary (`developerTabFolds.ts`, `summarizeSection`); a first visit
has every section closed, and the tab test sets the open state with the store's own functions.

```
tab bar
   | Down                          ^ Up (from the first line)
[ KNOWLEDGE BASE   Hybrid retrieval (meaning search) on   ▸ ]  --Right-->  [ ⊞ Open all ]
[ DIAGNOSTICS   On-screen debug HUD off · Warm the Ask model at boot off   ▾ ]
   | Down (open: into the first stop)        <-- Up from the first stop comes back to this line
   [ On-screen debug HUD ] [ Warm the Ask model at boot ] [ Jump to Steam Input ] [ Clear (N) ]
   [ captured error 1 ] [ captured error 2 ] ...                    (each one a stop; Clear only with errors)
   | Down from the last stop -> the next line
[ NAVIGATION   Tab to open on (D15): B · Resume   ▸ ]
[ LOGGING & EXPORTS   App activity logging to Desktop: Off · 0 of 3 on   ▸ ]
   [ App activity logging (3 buttons) ] [ Open Permissions: only while Save files to Desktop is off ] [ Auto-save ]
   [ Verbose Ask logging ] [ Force session RAG chips ] [ Frozen test chips: a read-only stop ] [ Clear frozen test chips ]
[ ANIMATIONS   Preset suggestions: fade · Scramble animation off   ▸ ]
   [ Preset suggestions (4 buttons) ] [ Scramble animation ] and, only while it is on: [ How letters settle ]
   [ How long each letter scrambles (settle style only) ] [ Scrambled letter colour ]
[ INTEGRATIONS   ▸ ]    [ Steam Web API key (a text field) ]
   | Down from the last line (or the last stop) holds still
=========== the strip: "TAB TO OPEN ON (D15)  Reopen lands on the tab you left. Shipped default. Takes effect…" ===========
```

- **Stops:** the six section lines, the floating button, and inside an open section every control: a switch (Steam's own
  `ToggleField`), a button (Steam's `ButtonItem` in the plugin's ring host, inside a `Focusable` that holds the edge moves),
  the first button of an option row's strip (a horizontal `Focusable`), each captured error (a `Focusable`
  with `focusable`), the Frozen test chips line (also `focusable`, nothing to press) and the key field. The strip, the
  summaries, the "Captured runtime errors appear below." line, "No errors captured.", the pinned-chips list and the
  loaded-models words are not stops.
- **Moves:** only the section lines (`FoldedSection`) and the two edges of each open section are hand-written. A section's
  rows are a list (`SectionRows`, `developerRows.tsx`); the first stop in it gets `onMoveUp` = its own line
  (`takeFoldLine`) and the last stop gets `onMoveDown` = the next line (`foldLineBelow`), whatever those stops are on a given
  day (the Clear button and the errors come and go; the scramble rows follow the switch). Between two stops of one
  section Steam steps along the tab's one column (`FoldedColumn`, `flow-children="vertical"`). The handlers sit on the
  switch itself, or on the `Focusable` round a button, a button strip or the field, because Decky's `Button` keeps no move
  handler. A greyed button is not skipped by asking the DOM (the seed install button greys while it runs); it stays a stop.
- **Entering a section** (`useDeveloperTabFocus.ts`, `chain`): Down from an open line puts the ring on the section's first
  stop, Up from the line below on the previous open section's last stop. Each is a plain hop between controls of the one tab
  body (`focusInTabBody`); it lands on the leaf control (the first match of `[tabindex], button, input` with no other match
  inside it), not on the `Focusable` that wraps a button strip, which would sit outside the row's words.
- **The key field:** its ref in Decky is the component, not the input, so nothing reads it; the tab's walk finds the DOM
  node. A `Focusable` round it holds the edge moves (it is the only stop of its section, so it has both).
- **The strip's words** ride on each row (`data-bonsai-help`, `DenseRow`): "Tab to open on" and "App activity logging" carry the
  line for the picked button, so the strip re-reads it on a pick while the ring stays on the row (`useHelpStrip` watches the
  row's attribute). Frozen test chips is a stop of its own so the board's long block stays out of the Force switch's words.
- **Appearing:** nothing in the tab or its rows focuses or scrolls on mount (a test pins it); the pane's place when the tab
  is shown is the shell's (lane T0c), not the tab's.
- **Class names and data attributes a Deck driver can find:** the shared ones in the Ollama section above, with the tab
  `[data-bonsai-tab-panel="developer"]`, the lines `[data-bonsai-fold-line="kb"|"diagnostics"|"navigation"|"logging"|"animations"|"integrations"]`,
  the floating button `[data-bonsai-fold-all="developer"]`, the strip `[data-bonsai-help-strip="developer"]`, a row by its
  name `[data-bonsai-help-label="Tab to open on (D15)"]` (the strip's text is its `data-bonsai-help`), and the option rows' buttons
  by their `aria-label` ("A · Main: …", "Off: …", "Preset animation: fade").
- **Tests:** `developerTabFolds.test.ts` (the summaries and every row's words against the board's data file),
  `DeveloperTab.folded.test.tsx` (closed, open, the words on the rows, the buttons that run something, the tab appearing),
  `DeveloperTab.foldedWalk.test.tsx` (closed and open walks Down and Up at two pane heights and Steam's three scroll rules,
  the captured errors reached, the strip following a pick, the floating button). Device rows: plan 91 § 5, block 5.

### The Settings tab, folded (plan 91 § 6, plan 92 T1)

The Settings tab reuses the folded-tab pieces of the Ollama tab (the section above): one line per section, the
rows of an open section one line each, the longer words in the strip at the bottom, the floating Open all
button. Every section starts closed and closes again on a tab switch (the maintainer's call, 2026-10-12). Its
sections are listed once in `src/features/folded-tabs/settingsTabFolds.ts` (`SETTINGS_SECTIONS`); the chain of
first and last controls is `useSettingsTabFocus.ts`.

```
tab bar
   | Down                                 ^ Up (from the first line)
[ UI SCALE   Adjust UI automatically on                ▸ ]  (Developer tab on only)     --Right--> [ ⊞ Open all ]
[ SCREENSHOT QUALITY   Save memory                     ▸ ]
[ TEXT SIZE   Normal                                   ▸ ]
[ REMEMBER WHAT I TYPED   off                          ▸ ]
[ STORY SPOILERS (STRATEGY MODE)   Hide spoilers … on  ▸ ]
[ SUGGESTION CHIPS   Show one chip instead of two off  ▸ ]
[ VOICE INPUT   STT model: base.en                     ▸ ]
[ VOICE REPLIES   By voice                             ▸ ]
[ AI VOICE & PERSONALITY   on                          ▸ ]
[ DATA   Show Developer tab on                         ▾ ]
   | Down (open: into the first control)    <-- the button's Up, Down, Left and B come back to the line it left
   [ Show Developer tab        (switch) ]
   [ Clear cache... ] [ Clear all data... ]       Left / Right between the two
   | Down from the last holds still
=========== the strip: "SHOW DEVELOPER TAB  Adds a Developer tab with logs, exports, and advanced tuning. …" ===========
```

- **Stops:** the section lines; in an open section, one per control: each switch; ONE stop for a row of buttons
  side by side (Screenshot quality, Text size, Voice replies, the two speech models, the two Clear buttons: Left
  and Right walk them, Down and Up leave the row); the character picker button; the Accent intensity control; the
  voice install button (and the Open Permissions button above the models while the microphone is off); in UI
  scale, the switch, the manual slider's bridge and Reset (only while automatic is off) and Apply; and the
  floating button. The paragraphs, the voice engine's status lines and the summaries are not stops.
- **Moves, handed in by the tab** (`SettingsTab.tsx`): Up from a section's first control goes to its line
  (`takeFoldLine`, Steam's own transfer onto the line's registered nav node); Down from its last goes to the next
  line (`foldLineBelow`; from the last section it holds still). On a switch these ride on `nav` (the switch's
  `onMoveUp` / `onMoveDown`); on a row of buttons and on the install and Apply buttons they ride on a `Focusable`
  around the buttons, never on a Decky `Button`, whose own move props Steam never calls. Between two rows of one
  section (the voice models to the install button, the character switch to the picker to the accent control, the
  Developer switch to the Clear pair) nothing is written: the one `FoldedColumn` around every line and control
  walks them by Steam's own step along its vertical flow. The line's Down into an open section, and Up into the
  open section above, go to the section's first and last control (`useSettingsTabFocus.ts`): the three
  single-row choice sections enter on their first button from either side.
- **The Text size row** carries only Up and Down now. Left and Right are Steam's own and move the ring along
  Small / Normal / Large, the pane not at all (plan 89; `SettingsTab.textSizeWalk.test.tsx`, and the Deck
  check). A on a button saves the choice.
- **The rows that open their own popups keep them:** Install / Reinstall voice engine asks the download notice
  first (`VoiceInputSettingsSection.downloadNotice.test.tsx`); the character picker button remembers itself
  (`character-picker-settings`) before it opens its popup; Clear cache... and Clear all data... remember
  themselves and open Steam confirm boxes; the Accent intensity menu is the same inline menu as before, now under
  a full-width row, and its open state still survives a rebuild of the tab.
- **A slider's ring stays on its knob** (the UI scale slider is the same `SettingsTabUiScaleSlider`; plan 82).
- **Greyed buttons:** a greyed Decky button still takes the ring on the Deck, so no hop asks a button whether it
  is disabled. Apply is greyed while it runs; the UI scale section keeps that state itself and declines the hop
  to Apply by it (`SettingsTabUiScaleSection.greyedApply.test.tsx`, with a Button stand-in that takes focus when
  greyed). The old Up from Screenshot quality to Apply is gone: the first control of a section goes to its line.
- **Class names and attributes a Deck driver can find:** the lines `.bonsai-fold-line`
  (`[data-bonsai-fold-line="uiscale|screenshot|textsize|remember|spoilers|chips|voiceinput|voicereplies|character|data"]`,
  `[data-open]`); the rows `.bonsai-dense-row` (`[data-bonsai-help-label="<row name>"]`, `[data-bonsai-help]`
  its strip words); the Text size row `[data-bonsai-chat-text-size-row="true"]`; the picker
  `button.bonsai-ai-character-picker-open`; the accent control `button.bonsai-accent-intensity-trigger`; the Clear
  pair `.bonsai-settings-cache-row`; the button `[data-bonsai-fold-all="settings"]`; the strip
  `[data-bonsai-help-strip="settings"]`.
- **Tests:** `settingsTabFolds.test.ts` (sections, summaries and strip words against the drawing),
  `SettingsTab.folded.test.tsx` (closed and open, the rows' words, the popups, the moves out of a section),
  `SettingsTab.foldedWalk.test.tsx` (the bounded Down and Up walks, closed and open, three scroll rules, two panes,
  the strip, the button's exits), `SettingsTabUiScaleSection.greyedApply.test.tsx`. Device checks (block B): the
  closed tab under 1.5 screens; a Down walk with every section open with no dead press and no stop twice; the
  strip on three rows; Text size's Left and Right move the page 0 points; the UI scale section folded like the
  rest.
