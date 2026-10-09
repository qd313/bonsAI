# 84 — More room for the answer: tabs in the top strip, the chat's name in Decky's bar

Written 2026-10-08 by the planning session, straight after seven rounds of mockups with the maintainer the same
evening. This is the build plan for the roadmap entry **Give the reclaimed height to the transcript** (`[layout]`),
which had been waiting since 2026-09-16 for a design call. The calls are recorded as
[D126](../audit/maintainer-decisions-locked.md); § 3 below has the same list. **Step 1, the three Deck tests, ran on
2026-10-08 and all three passed (results in § 4). One of them changed how step 6 must work. Steps 2 to 9 are not built
yet.**

**The drawing:** https://claude.ai/artifact/EoRoxs11bVjfyBZ28tkM5P — every option from all seven rounds, drawn at the
Deck's true size, each drawing measuring itself. The first section shows only what was picked. A copy is kept in the
repo at [assets/84-vertical-room.html](assets/84-vertical-room.html) (with the photo it compares against,
[assets/84-today-deck.png](assets/84-today-deck.png)). **The drawing is the design. Read it before writing a brief.**

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md), the focus-graph section and the table under
"Which model does which work"; [docs/lessons-learned.md](../lessons-learned.md); [design-language.md](../design-language.md),
rules 5 to 8; D126; and [plan 66](66-quick-tab-own-menu-icon.md) § 4, because a pinned Quick Tab draws the same title bar.

**One sentence:** on the Deck's own screen the answer gets 297 points of height instead of 204 (about 121 words of a long
answer on screen instead of about 62), by moving the tab bar up into an empty strip, putting the chat's name in Decky's
title bar, folding two rows of the ask area into the question box, and moving Read aloud into the answer's corner.

---

## 1. What is true right now (checked 2026-10-08 on the Deck and in the code)

**The panel on the Deck's own screen is 300 points wide and 454 tall** (a point is 1.5 screen pixels there). On a 1080p
TV it is 766 tall. The roadmap entry measured the same 454 on 2026-09-16; [design-language.md](../design-language.md)
still describes the TV's numbers and needs a line about the handheld (step 8).

**Where the 454 points go today, top to bottom** (Decky's and Steam's parts read live from the Deck on 2026-10-08; the
ask area read pixel by pixel from the maintainer's screenshot the same day):

| Part | Points | Who draws it |
|---|---|---|
| An empty strip at the very top | 14 | Steam's menu (padding on its tab container) |
| Decky's title bar: back arrow (40 by 28) and "bonsAI v0.5.0" | 34 | Decky (6 of padding on top, then a 28-point row) |
| An empty gap under the title bar | 16 | Decky (padding at the top of the plugin's box) |
| bonsAI's tab bar and its gap | 20 + 4 | bonsAI |
| The answer | 204 | bonsAI |
| Ask area: chips 30, box 73, ASK button 37, "Context: …" line 18, two 2-point gaps | 162 | bonsAI |

Inside the answer area, two more things take room: the **saved-chats row** at the top of the chat (54 points on
2026-09-16; it scrolls away with the chat), and **Read aloud's own row** under the newest answer (about 40 points).

Facts the design leans on:

- **Decky gives each plugin one spot in its title bar,** to the right of the back arrow. bonsAI fills it today with
  "bonsAI v0.5.0". The version number appears nowhere else in bonsAI.
- **B closes any plugin in Decky,** whatever is on screen, so hiding the back arrow on some tabs never traps anyone.
  People using touch would go back to the chat tab, where the arrow is.
- **The back arrow has caused focus trouble before.** The ring has landed on it after a tab switch (plan 81), and LB
  and RB do nothing while the ring is there (a watched item in [roadmap-shelved.md](../roadmap-shelved.md)).
- **bonsAI already reaches outside its own box.** It pins the height of Steam's tab pane and its own column so the
  panel does not sag. Hiding or reshaping Decky's and Steam's parts would be the same kind of reach, so it gets the
  same rule: undo it when bonsAI closes.
- **Tabs wrap at both ends.** LB on the first tab opens the last one, which is what lets the new tab bar show
  neighbours on both sides.
- **The drop-down strip of tab icons** opens while the ring is on the tab bar. It is the source of the open bug "A faded
  ghost of the tab bar is left drawn over the chip row after touching the screen" (row TAB-BAR-GHOST-01): its fade
  can freeze while a game runs.
- **bonsAI never reads the triggers (L2 and R2) today.** Decky's own list of controller buttons includes them, but
  nobody knows whether Steam's menu passes them to a plugin, or uses them itself.
- **The Copy button already sits in the answer's bottom-right corner** as its own focus stop, drawn into the corner by
  the stylesheet. Read aloud in the bottom-left corner can copy that exact pattern.
- **In a pinned Quick Tab** (plan 66), the same title bar is drawn without a back arrow.

---

## 2. What a player gets

Today, then after, on the Deck's own screen. The numbers come from the drawing, which measures itself.

| | Today | After |
|---|---|---|
| Height for the answer | 204 points | 297 points (+93, +46%) |
| Words of a long answer on screen | about 62 | about 121 |
| Rows above the chat | 3 (Steam's strip, Decky's bar, tab bar) | 2, both doing a job |
| Rows below the answer | 4 (chips, box, ASK, context line) | 2 (chips, box) |

What changes, top to bottom:

1. **The tab bar sits in the empty strip at the very top.** The current tab's icon and name are in the middle. The other
   tabs sit beside them as small dimmed icons: the ones LB would open on the left, the ones RB would open on the right,
   wrapping round. LB and RB marks sit at the two ends, 16 points from each edge, so they line up with Decky's bar
   below.
2. **No drop-down strip of tab icons.** While the ring is on the bar, the bar simply shows the ring. Left and Right, or
   LB and RB, switch tabs; Down goes to the chat's name.
3. **The chat's name sits in Decky's bar, beside the back arrow,** on the same centre line as the tab's name above it.
   The words are centred, not the groups: the tab's icon hangs off to the left of its name, and the menu arrow hangs off
   to the right of the chat's name (measured on the drawing: the two names within 1 point of the centre). Empty space
   the arrow's width on the right keeps it balanced. No shading behind it.
4. **LT and RT sit on the small line under the name** ("LT · chat 2 of 5 · RT"), one each side of the centre, and switch
   chats if the Deck passes the triggers through (step 1). Moving them off the name's own line is what gives the name its
   room (round eight, option X1): **139 points, about 20 characters** of the longest example ("Second boss, phase t…"),
   up from 12 with LT and RT beside it. Measured on the drawing.
5. **A name that still does not fit slides along once to show the rest while the ring is on it,** then comes back, the
   way long suggestion chips already do. Otherwise it is cut short with "…". The full name is always in the chats menu.
6. **The hints dim.** LB and RB light up only while the ring is on the tab bar; LT and RT only while it is on the chat's
   name.
7. **Pressing A on the chat's name, or tapping it, opens the chats menu.** It drops down over the answer and stops above
   the ask box. It holds every chat (an unread dot on any with a reply waiting), and New chat, Rename chat, Sum up this
   chat, Save to Desktop note and Delete chat. **The saved-chats row at the top of the chat goes away.** Sum up this chat
   is a second way in, not a move: its home stays on the Session tab.
8. **On the other tabs (Settings, Ollama and the rest),** the back arrow and chat name row is hidden completely, and the
   tab's content starts right under the tab bar.
9. **The ask area loses two rows.** The big ASK button becomes a small ASK button at the right end of the box's bottom
   strip. The "Context: …" line becomes a small game tag in that strip ("No game", or the game's name). While an answer
   is being written, the mic turns into Stop as it does today and the small ASK button rests.
10. **Read aloud sits in the answer's lower-left corner,** opposite Copy, and its own row goes.
11. **The version number moves to the About tab.**

---

## 3. The maintainer's calls

Recorded in full as [D126](../audit/maintainer-decisions-locked.md). In short:

1. Design for the Deck's own screen first, then check the TV.
2. The tab bar moves up into the empty strip above it.
3. The tab bar is option T3: icon and name in the middle, the other tabs' dimmed icons around it.
4. The drop-down strip of tab icons goes.
5. The chat's name goes in Decky's bar, centred under the tab's name, with empty space balancing the arrow (U3), no
   shading, and room for long names.
6. LT and RT switch chats, if the Deck allows it.
7. LB, RB, LT and RT dim unless the ring is on their row.
8. An arrow on the chat's name opens the chats menu; the saved-chats row goes.
9. On the other tabs, the row with the back arrow and the chat's name is hidden completely.
10. The ask area folds: small ASK button and a game tag in the box's strip (D).
11. Read aloud in the answer's lower-left corner.
12. Reading mode gets a test to find out, separately, after the build.
13. The Deck tests wait until the maintainer frees the Deck.
14. Later the same evening: more room for the chat's name. LT and RT move to the small line under it (X1).
15. A name that still does not fit scrolls while the ring is on it.

---

## 4. The Deck tests (step 1) — ran 2026-10-08, all passed

Three things in the design depended on how Steam and Decky behave, and only the Deck could say. **They ran on
2026-10-08** with two throwaway test builds (never committed) that did to Decky's bar and Steam's strip what the real
build will, then put everything back; the Deck was returned to its exact earlier build afterwards. Evidence:
[plan84-STEP1-DECK-TESTS.json](../test-evidence/plan84-STEP1-DECK-TESTS.json). Screen: the 1080p monitor (mechanics
only; the layout in points is the same on the Deck's own screen).

**Results, in short:**

- **Test A, the triggers: PASS.** The maintainer pressed L2 and R2 by hand (the controller rig has no trigger buttons).
  bonsAI received both, as the left and right triggers, both on the control the ring was on and through a listener on
  the whole panel, so they work wherever the ring is. Nothing on screen reacted: Steam's menu does not use them. **LT
  and RT get built as drawn.**
- **Test B, the top strip: PASS, after one change of method.** A strip drawn from bonsAI's spot in Decky's bar sat at
  the very top (0 to 20 points), fully visible, with the back arrow and name at 20 to 48 and bonsAI's own box from 52.
  **But zeroing Steam's 14-point margin leaked:** bonsAI stays loaded when the menu switches page, and Steam's own
  Performance page moved up 14 points while bonsAI was open in the background. **The fix, also tested: leave Steam's
  margin alone and move only Decky's own menu page up 14.** The strip still sat at the very top, and Steam's
  Performance page stayed exactly where it normally is. The D-pad reaches the strip (Right from the back arrow) but
  Steam does not find it from below by itself, so the strip and the name need their D-pad routes set by hand.
- **Test C, the per-tab shape: PASS, with two findings.** On another tab, Decky's bar shrank to the strip alone and
  bonsAI's content started at 24 points. One B left bonsAI even with the back arrow hidden, and leaving put Decky's bar,
  Decky's page and Steam's margin back exactly. The findings, both now build requirements in step 6:
  1. **A hidden back arrow is still in Steam's D-pad path.** bonsAI reopened on the Ollama tab, and the ring landed on
     the invisible arrow every time it came in from the left. The real build must route around it and catch a landing
     on it, the way bonsAI already catches Steam's hidden tab buttons.
  2. **bonsAI's height lock does not notice the header changing shape,** and moving Decky's page up leaves 14 points
     empty at the bottom. The lock must re-measure whenever the header changes and give those 14 points back.

What each test was designed to find, kept for the record:

**Test A — do L2 and R2 reach bonsAI?** With the ring inside bonsAI, press L2 and R2 and log every button the plugin
sees. Also check that Steam's menu does nothing of its own with them (scrolling, switching menu tabs).
- *If yes:* build LT and RT as drawn.
- *If no:* drop the LT and RT marks. Chats switch with Left and Right while the ring is on the chat's name, and from the
  menu. Nothing else in the design changes.

**Test B — can the tab bar sit in Steam's 14-point strip?** The likely route: draw the tab bar from bonsAI's spot in
Decky's bar, reaching up 20 points, after taking the 14 points of padding off Steam's tab container and adding them to
the top of Decky's bar, so the tab bar stays inside Decky's own box. Things to record: whether anything clips it; whether
the D-pad reaches it; and **whether Steam's own menu tabs (Notifications, Settings and so on) still have their top margin
after leaving bonsAI, closing the menu, and switching menu tabs while bonsAI is open.**
- *If yes:* build as drawn: 297 points for the answer.
- *If no:* the tab bar sits under Steam's strip instead. The answer gets 283 points (+79) instead of 297. Nothing else
  changes.

**Test C — can Decky's bar be reshaped per tab?** On the chat tab it holds the tab bar and the name row; on every other
tab only the tab bar, with the back arrow hidden. Record: that switching tabs reshapes it every time, including after a
tab switch by touch; that B still goes back to Decky's list from every tab; that leaving bonsAI puts Decky's bar back
exactly; and that the ring never lands on a hidden back arrow.
- *If no:* keep the name row on every tab and show the tab's name in it off the chat tab (the option drawn in round
  four). Costs the other tabs 28 points; the chat tab is unaffected.

**Also measure in step 1:** the 16-point gap under Decky's bar. bonsAI should be able to slide its own box up over it
without touching Decky. Confirm the panel-height pinning still lines up afterwards.

**Who ran it:** the planning session, on Opus, driving the Deck itself with the maintainer's go and the maintainer's
hands for the two trigger presses.

---

## 5. The steps

Stars: **★★★★ overall.** Several focus changes, one shared piece of state between two parts of the screen that today do
not talk, and a reach into Decky's and Steam's own layout. Routing follows the AGENTS.md table: layout and focus work is
done by Opus extra-high with the measurement in hand; mechanical parts go to Sonnet; the Deck is the gate for every
step that moves a control.

**Steps 2 and 3 do not depend on the Deck tests** and can be built first, in parallel.

**Step 2 — the ask area folds (★★★, Opus extra-high).**
The big ASK button and the context line go; a small ASK button and a game tag join the box's bottom strip. What has to
be decided in the code, not by the maintainer: the order of stops in the strip (paperclip, game tag, mode, mic or Stop,
ASK), where Down from the box now lands, and where Up from the chips lands. The settings search that rides on the box
(its matches show below the Ask button today) needs a new home just under the box. Everything the ASK button does today
(ask, its press handling, the ring watch that claims the ring for it after a tab switch) moves to the small button.
Free room: 57 points.

**Step 3 — Read aloud into the answer's lower-left corner (★★, Opus extra-high, or Sonnet high with Copy's pattern
named in the brief).** Same pattern as Copy: its own focus stop, drawn into the corner by the stylesheet, with a spacer
on the answer's last line so text never runs under it. Order of stops: answer, Read aloud, Copy (left to right), so
Right from Read aloud reaches Copy. Its own row goes. The auto-stop and the three-way Voice replies setting are
unchanged.

**Step 4 — the tab bar: T3 and no strip (★★★, Opus extra-high).**
Redraw the thin bar as T3 and delete the drop-down strip with everything that keeps it working (its open and close
states, its fade, the ghost-strip timer). The trap that catches the ring on Steam's hidden tab buttons stays. The dimming
of LB and RB arrives here. Done before step 6 so the bar can be checked on its own first.

**Step 5 — the chat's name in Decky's bar, and the chats menu (★★★★, Opus extra-high; the menu's rows can go to a
Sonnet high helper once the menu exists).**
bonsAI's spot in Decky's bar draws the name row: the name with its menu arrow, the small line under it with LT, "chat 2
of 5" and RT, and the empty space that balances the back arrow (dropped in a pinned Quick Tab, which has no arrow to
balance). A name too long for its 139 points scrolls while the ring is on it, using the same scrolling text the
suggestion chips use, and stays still for anyone who has asked their system for less motion. This part of the
screen sits outside bonsAI's own box, so it needs two things built first: **a small shared store** so it can read and
change the open chat, which today lives inside the main screen; and **its own styling scope**, because bonsAI's
stylesheet only reaches inside bonsAI's box. Then the chats menu, then delete the saved-chats row, moving each thing it
did (switching, rename, delete, save to Desktop, new chat, the unread and still-writing dots) into the menu, and adding
Sum up this chat as a second way in to the Session tab's button. LT and RT per test A.

**Step 6 — the tab bar moves up, and the per-tab shape (★★★★, Opus extra-high).**
Move the tab bar into Decky's bar and up into the strip; reshape Decky's bar per tab; slide bonsAI's box up over Decky's
16-point gap. **How, from test B: never touch Steam's shared 14-point margin; move only Decky's own menu page up 14, and
add 14 to the top of Decky's bar.** Three requirements from the tests: set the D-pad routes between the strip, the back
arrow, the name and the tab body by hand (Steam does not find the strip from below); keep the ring off a hidden back
arrow and catch it if it lands there anyway; and re-measure the height lock whenever the header changes, giving back the
14 points the page move leaves at the bottom. Every change to Decky's parts is undone when bonsAI closes.

**Step 7 — the version number moves to the About tab (★, Sonnet medium).** Mechanical.

**Step 8 — documents (Sonnet medium, then the `bookkeeper` helper for the roadmap and testing documents).**
[design-language.md](../design-language.md): the handheld's 300 by 454, and rule 7's numbers. [design-tokens.md](../design-tokens.md):
the tab bar, the name row, the strip's new controls. [focus-graph-patterns](../../packages/bonsai-mcp/knowledge/architecture/focus-graph-patterns.md):
the new ring path. New rows in [testing-manual.md](../testing-manual.md) (§ 6 below). The roadmap entries in § 7.

**Step 9 — reading mode: a test to find out (separate, after the build).** Option G in the drawing. Its own short plan
once the build is in; it needs the hide-and-restore pieces from step 6 anyway.

**Order of landing:** 2 and 3 (any order), then 4, then 5, then 6, then 7 and 8. Each lands with its own Deck block,
because each moves controls.

---

## 6. The Deck checks

Each step's rows, run on the Deck's own screen first, then once on the TV. Names are suggestions for
[testing-manual.md](../testing-manual.md).

| Row | Step | Passes when |
|---|---|---|
| P84-HEIGHT-01 | 6 | The answer area measures 297 points on the Deck's own screen (283 if test B failed), with the probe, not by eye |
| P84-ASK-01 | 2 | The small ASK button asks; it becomes resting during an answer and Stop (the mic's place) stops it |
| P84-ASK-02 | 2 | Every stop in the box's strip is reachable and visible, and Down and Up from the strip land where the brief says |
| P84-READ-01 | 3 | Read aloud in the lower-left corner starts and stops reading; the ring on it is fully visible on a long answer |
| P84-TABS-01 | 4 | The tab bar shows T3 on every tab; LB and RB wrap at both ends; no strip ever drops down |
| P84-TABS-02 | 4 | The ghost-strip case (TAB-BAR-GHOST-01) cannot happen: there is no strip to leave behind |
| P84-NAME-01 | 5 | The chat's name and the tab's name are within 1 point of the panel's centre (measured, not by eye) |
| P84-NAME-02 | 5 | LT and RT switch chats (or Left and Right on the name, if test A failed); A on the name opens the menu |
| P84-NAME-03 | 5 | A long name shows about 20 characters, then scrolls once while the ring is on it and is still otherwise |
| P84-MENU-01 | 5 | Every action in the chats menu does what the saved-chats row did, unread and still-writing dots included |
| P84-HINTS-01 | 4, 5 | LB and RB light only with the ring on the tab bar; LT and RT only with the ring on the name |
| P84-OTHER-01 | 6 | On every other tab, the name row and back arrow are gone and the content starts under the tab bar |
| P84-BACK-01 | 6 | B goes back to Decky's list from every tab; leaving bonsAI puts Decky's bar and Steam's strip back exactly |
| P84-QAM-01 | 6 | Steam's own menu tabs keep their top margin while bonsAI is open and after it closes |
| P84-RING-01 | all | The ring never lands on a hidden control, and never on Decky's back arrow by itself after a tab switch |
| QA-FREE-PLAY-01 | all | The free-play sweep: every focused stop is also visible |

---

## 7. The roadmap

- **Give the reclaimed height to the transcript** — becomes this plan's entry: planned, D126, ★★★★.
- **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** (★★, TAB-BAR-GHOST-01) — closed
  by step 4, which removes the strip. Close it with P84-TABS-02 as evidence, not before.
- **The open tab strip redrawn** (Verify, row TAB-STRIP-2A-03 waiting on the maintainer's look) — moot once step 4 lands;
  move it to Done as replaced, naming this plan.
- **LB and RB do nothing while the ring is on Decky's back arrow** (watched, in roadmap-shelved) — re-check during
  P84-RING-01; the arrow now shares a row with the chat's name.
- **bonsAI's own icon in the Quick Access Menu** (plan 66) — its title-bar point (§ 4.5 there) is covered by step 5's
  pinned-tab rule.

---

## 8. Risks

- **A Decky or Steam update changes their layout.** Every reach outside bonsAI's box must check what it finds before
  changing it, and do nothing if it is not what it expects. The fallback is today's layout, never a broken one.
- **Steam's strip belongs to every menu tab.** The first test build leaked into Steam's own pages exactly this way.
  The tested fix moves only Decky's own page, so nothing of Steam's is touched; P84-QAM-01 stays the gate.
- **The name row lives outside bonsAI's box.** Its styles and its state both need building (step 5). A half-built
  version shows an unstyled name or a stale chat.
- **Focus.** The ring path changes in four places (the strip, the corner, the tab bar, the name row). The house rule
  applies: a focus graph entry before each control is written.
- **Smaller touch targets.** The tab bar is 20 points tall with no strip to open. LB and RB marks and the two halves of
  the bar must be tappable.

---

## 9. For the builders: where the code is

| What | Where |
|---|---|
| The title bar spot (today "bonsAI v0.5.0") | `src/index.tsx`, `definePlugin` → `titleView` |
| The tab bar and its drop-down strip | `src/features/plugin-shell/TabIndicatorBar.tsx`, `tabBarNav.ts`, `tabTitles.tsx`, `useHiddenTabHeaderTrap.ts`; styles in `src/styles/sections/tabIndicatorBar.ts` |
| Tab bar sizes | `src/features/unified-input/constants.ts` (`TAB_BAR_*`, `TAB_STRIP_BODY_GAP_PX`) |
| Height pinning | `src/hooks/useQamPanelHeightGuard.ts`, `src/hooks/useTabStripBodyOffset.ts`, `src/utils/tabBodyViewport.ts` |
| The saved-chats row | `src/features/chat-slots/ChatSlotRow.tsx` and its hooks; drawn by `src/components/MainTab.tsx` |
| The ask box, its strip and the ASK button | `src/components/MainTabUnifiedAskBar.tsx`; press handling in `src/hooks/useAskBarPressHandlers.ts`; ring claim in `src/hooks/useAskBarInitialRingClaim.ts` and `askBarRingWatch.ts` |
| The context line | `src/components/MainTab.tsx`, `bonsai-context-footnote` |
| Copy in the answer's corner (the pattern for Read aloud) | `src/utils/buildAnswerBubbleElement.tsx`, `bonsai-reply-copy-corner-slot`; the `--with-copy` rules in `src/styles/sections/section-6.ts` |
| Read aloud today | `src/components/MainTabChatTranscript.tsx` (`useReadAloudAutoStop`), `ReadAloudSpeakerIcon` in `src/components/icons.tsx` |
| Controller button ids | `src/utils/focusNavigation.ts` (no trigger ids yet; Decky's list has them) |
| The About tab | `src/components/AboutTab.tsx` |
| Decky's own title bar and plugin box | Decky Loader's `frontend/src/components/TitleView.tsx` and `PluginView.tsx` (read 2026-10-08) |

---

## 10. Progress log

- **2026-10-08, step 1 done.** All three Deck tests passed (§ 4). Test B changed the method for step 6: move Decky's
  own page, never Steam's shared margin. Two new step 6 requirements: route around the hidden back arrow, and
  re-measure the height lock when the header changes. The Deck was returned to its earlier build (same file hash), the
  settings matched their backup, and the wake lock was released. Nothing built yet.
