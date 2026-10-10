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
LB  [tabs LB reaches]  [icon] NAME  [tabs RB reaches]  RB      <- one stop: the whole bar
   Left / LB: previous tab (wraps)        Right / RB: next tab (wraps)
   | Down: the current tab's first stop    ^ Up: left to Steam (Decky's back button today)
```

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
  nothing. Targets: LB and RB 31 by 20 points; each side icon 18 by 20, narrowing towards the icon's own 11
  only for the longest names at six tabs.
- **Gone with the strip:** its open and closed states, its fade, the timer that forced the fade shut, the
  tap-to-open and the tap-outside listener. What the bar draws depends only on which tabs exist and which is
  current, never on the ring or a tap, and the bar clips everything inside it to its own 20 points, so nothing
  of it can be left over the chip row (TAB-BAR-GHOST-01).
- **Device rows:** P84-TABS-01 and the LB/RB half of P84-HINTS-01 passed on the Deck's own screen 2026-10-08
  ([evidence](test-evidence/plan84-STEPS4-5-7-DECK.json)); P84-TABS-02, the touch check, is owed (needs a person).
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

- **Left** is Steam's own move onto Decky's back arrow: the arrow and the name are siblings in Decky's one title
  Focusable, so Steam walks between them itself (measured 2026-10-08: Right from the arrow reached a stop drawn
  in the title spot). Nothing claims it.
- **Right** holds still (claimed, nothing moves). The empty space on the right only balances the arrow; nothing
  of bonsAI lies there.
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
  open chats menu as the ring goes. Left is Steam's own onto Decky's back arrow, Right holds, as in step 5.
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
