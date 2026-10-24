# Scoping note: the ghost strip over the chat (plan 96, 2026-10-18)

Scoped only. Nothing was fixed or changed in code. Read from the code, the docs, the two pictures
and the 23 September recording that is still on this PC. No Deck was touched.

## The short answer

The strip in both the 18 October picture and the 23 September recording is **Steam's own tab row**.
It is not the plugin's tab bar drawn twice, and it is not a "bumper held" hint that Steam draws by
itself. The plugin still mounts Steam's tab row (it needs it for the shoulder buttons), and hides it
with one style rule. In every sighting that rule stopped hiding it for a while.

Why I am confident, from evidence in the repo and not from a guess:

1. **Same three parts.** The plan 30 measurements (2026-09-02) describe Steam's tab row as three
   things side by side: a left bumper badge, a row of tab icons, a right bumper badge. The ghost is
   exactly that.
2. **The icons are ours.** The icons in the ghost are the ones the plugin hands Steam as each tab's
   title: the magnifier for Search, the outline tree for Main, the llama for Ollama, the gear. The
   plugin's own thin bar uses a different Main icon (the small logo) at a much smaller size. In the
   18 October picture the big strip shows the outline tree in the highlighted pill.
3. **Both bars at once, in both sightings.** The plugin's own thin bar (tiny grey LB and RB, small
   icons) is still drawn at the very top in both pictures. The ghost is a second, bigger thing under it.
4. **The 23 September recording shows it clearly.** I cut frames from it. The lower bar has Xbox-style
   LB and RB pills, the outline tree pill, the llama and the gear. The chat text scrolls under it while
   the bar stays put. That is a real part of the page, not a leftover paint.
5. **No second plugin strip exists any more.** The drop-down strip was deleted on 8 October. I
   searched the code and the built file: no drop-down strip, no touch-open logic, no fade left. The
   plugin draws its thin bar in exactly one place at a time.

What this changes: the roadmap says the session read the strip as "Steam's bumper hint, stuck". The
badges are real Steam bumper badges, but they are the two permanent badges of Steam's tab row, not a
transient bar. And the older story (the plugin's own drop-down strip fading badly) was probably the
wrong target for 23 September at least. Plan 84 deleted that strip and the bug came back anyway,
which is what you would expect if the strip was never the cause.

## What a player sees and when

| When | Build | What was drawn | What the player did | Game running | Picture |
|---|---|---|---|---|---|
| 2026-09-07 (filed 09-08) | not recorded | A see-through copy over the suggestion chips: pale round tab icons, a name, a faint row of dots | Touched the panel | Yes | The capture file is gone; only its log line is left. Cannot tell which strip it was. |
| 2026-09-23 | a224fb6 | Two bars at once: the plugin's thin MAIN bar and a big icon bar under it. Touch scrolling did not close it. The first D-pad move did. | Show details, then Session | Yes | 23 Sep recording (on this PC). It is Steam's tab row. |
| 2026-10-18 | f7413dbc or bba825e5 | A strip over the top of the chat: L1 and R1 badges, magnifier, outline tree pill, llama edge, over a greyed "61 earlier" pill | Tapped the "How to use bonsAI" chip while re-asking a Strategy question | Yes (Deep Rock Galactic: Survivor) | 18 Oct picture |

Runs that did **not** show it:

- 2026-09-28 (plan 76): D-pad only, 66 samples over 15 seconds. Taken from an "auto" capture, no game
  mentioned.
- 2026-10-03 (plan 81): one pretend touch on the Session tab. The Deck said "no active game detected".
- 2026-10-09 (plan 84): not measured at all; the claim rests on the old strip being deleted.

Two patterns stand out:

- **Every sighting had a game running. Every "not reproduced" run did not.** That has never been
  written down as a condition.
- **Those "not reproduced" runs counted only the plugin's own bar.** They looked for elements with the
  plugin's bar class. Steam's tab row does not carry it, so those runs could not have seen this ghost,
  even if it had been on screen. They prove nothing about it.

The one cure seen: the first D-pad press made it go away (23 September).

## What the code does, in short

- **Three things can draw a tab strip today.** (1) The plugin's thin bar. It is one piece of code with
  two places it can be drawn: in Steam's empty strip at the top (through the chat-name view Decky
  draws), or in the plugin's own box as a fallback. One flag decides, so only one is drawn. (2) Steam's
  own tab row, still mounted inside the plugin's box. (3) Decky's own title bar (back arrow, chat name).
  Nothing else draws tabs.
- **How Steam's row is hidden.** One style rule, written 2 September (plan 30) and not changed since.
  It hides the first child of Steam's tab page if that child holds one of the plugin's title icons,
  holds at least one image with a label (the bumper badges), and does not hold the tab body. Four
  conditions, all about Steam's markup, not ours. The note next to it says what happens if it stops
  matching: "Steam's own strip reappears above ours". That is the picture.
- **Nothing checks that the rule is working.** There is no watcher, no log line, and no test. The test
  stand-in for Decky's page has no tab row at all, so no test can fail if the rule stops matching.
- **Steam's row is also a known trouble spot.** It stays in the D-pad path even when hidden. The plugin
  already had to add a trap that catches the ring landing on its hidden buttons (plan 30, then
  twice fixed in September).
- **Where the ghost sits.** Both pictures show the row drawn on top of the chat's first 80 points,
  not pushing the chat down. When plan 30 measured Steam's row on 2 September (no game, row visible
  before the rule went in) it was part of the normal flow and did push the chat down. So in the ghost
  state Steam's row is in a different mode from the one measured then. That is a clue, not a proof.

### Steam's own bumper hint: tested against the code

The session's reading was "the L1/R1 bar Steam draws while a bumper is held". I found nothing to
support it:

- The L1/R1 badges in the picture belong to the tab row itself. They are always there, in Steam's row,
  hidden by the rule the rest of the time.
- A Steam-made hint would not carry the plugin's own tab icons. This one does.
- The plugin cannot make Steam think a bumper is held. It never calls Steam's input functions, never
  listens for a button release, and never stops a button event. The bumpers are read in two places
  (the thin bar and the floating Open all button), and both just step to the next tab. The chat-switch
  triggers (LT and RT) are heard on the panel's document and left alone. The search shortcut and the notes
  listener do the same.
- The way to tell, on the Deck: Steam's row sits **inside the plugin's box** (the tabs box), under
  Steam's tab page. A hint drawn by Steam's own shell would sit outside the plugin's box altogether.
  The measurement below reads this directly.
- The 23 September sighting came after the Deck work had ended (the maintainer's own hands), so a stuck
  button on the test rig is not the cause there. The 18 October sighting was caught during a hand
  check too; I cannot rule out that the rig was connected at that moment, but the 23 September
  recording shows the same strip.

### What touch does differently from the D-pad

- **Same handler for the chip.** A tap on the help chip and A on it both end up in the same click
  handler. It notes where to return the ring, then opens Decky's pop-up.
- **Pop-ups rebuild the plugin.** Opening a Decky pop-up removes the plugin's whole screen from the
  page and puts a fresh copy back on close, with a saved note so it looks the same. A fresh copy means
  a **brand new Steam tab row, mounted from scratch**. The 18 October trigger was exactly this: a tap
  on the chip opens the pop-up, closing it rebuilds the screen.
- **Touch is a different input mode for Steam.** Touching the screen makes Steam go into pointer mode:
  the ring disappears until the next D-pad press. It is the thing that the 23 September cure ("the first
  D-pad move") would flip back. The plugin has no code that reacts to touch by showing anything, but
  three of its layout watchers run on every pointer move (they only measure and write sizes), and one
  more notes when the last pointer press happened. None of them touches Steam's tab row.
- **The D-pad half of the old test never rebuilt the screen with a game running.** The D-pad runs
  covered Show details and Session, which is no pop-up and no touch.

## Most likely causes, ranked

All three say "the hide rule stopped hiding Steam's row". They differ in why, and one reading tells
them apart.

### 1. Steam's row is rebuilt in a shape the rule does not recognise (strongest)

After a pop-up closes, or after touch puts Steam in pointer mode, Steam draws its row again. The rule
needs the bumper badges to be labelled images. If Steam draws them another way at that moment (a text
badge instead of a picture, or the row wrapped in one more box), one of the four conditions fails and
the row shows. The first D-pad press makes Steam redraw the badges the normal way, the rule matches,
and the row vanishes. That fits the one cure ever seen.

- **What fits:** the trigger on 18 October (pop-up, then rebuild, then ghost); the cure on 23
  September; both sightings with a game running (the overlay is a separate window with its own glyph
  state); the two different badge styles (LB and RB on 23 September, L1 and R1 on 18 October) which
  show Steam changes how it draws them; the strip covering the chat instead of pushing it, which means
  Steam drew this row differently from the plan 30 measurement.
- **What does not fit well:** plan 30 measured the badges as labelled images, but only with no game
  and no touch; with a game it passed but only the shoulder buttons were checked, not the exact markup.
- **The one measurement:** with the ghost on screen and before any press, read Steam's row: does the
  hide rule match it, which of the four conditions are false, what are the badges made of (image or
  text), what is its computed display and position. Then press one D-pad button and read the same
  things again. The condition that flips is the cause.
- **Smallest fix:** make the rule rely only on what is ours. Hide the first child of Steam's tab page
  that holds a plugin title icon and does not hold the body; drop the bumper-badge condition. One line
  in the first stylesheet section. Add a test stand-in for Steam's row with its real shape (badges as
  plain text boxes too), so the rule is tested at all.

### 2. Steam draws the row somewhere the rule cannot reach

With a game running the Quick Access menu is an overlay. Steam's tab page has a setting for a header
"pinned in overlay view", and the strip in both pictures sits over the chat, not in the flow. If Steam
draws this row (or a copy of it) outside the plugin's box, or in a box that is not the page's first
child, the rule never meets it. Then it would be there whenever that mode is switched on (touch,
overlay), until Steam switches it off (the first D-pad press).

- **What fits:** the strip sits on top of the chat in both pictures; every sighting is with a game;
  "touch scrolling did not close it".
- **What does not fit well:** plan 30 ran with a game (Half-Life 2) and the rule hid the row. So this
  would have to depend on a state that plan 30 did not reach.
- **The one measurement:** the same row read, but also walk up from the strip: is it inside the plugin's
  box, is it a child of Steam's tab page, and how many plugin boxes and style blocks does the page
  have at that moment (more than one would mean two copies of the plugin alive at once).
- **Smallest fix:** find the row from the plugin's title icon wherever it lives in the page, and hide
  that, not the rule's fixed path. Same small guard as in candidate 3.

### 3. The rule matches, but the browser does not apply it (stale style)

The rule uses a newer selector feature that has to watch for changes inside the row. If Steam adds or
swaps the badge image after the first check and the browser does not re-check, the row stays shown
even though the rule would match it. Any later redraw (the first D-pad press touches the page a lot)
makes the browser look again and the row goes.

- **What fits:** the cure; the fact that it comes and goes without a stable cause; it explains why
  nobody could see the rule failing in the code.
- **What does not fit well:** it needs a browser bug in a recent embedded Chromium, which is less likely
  than a markup change. And the 23 September frames show the layout is live.
- **The one measurement:** same read. Candidate 3 is the answer only if the rule **matches** the row and
  its computed display is **not** none. (If the row's display is none and it is still drawn, the problem
  is painting, not styling; nothing here supports that, but the read separates it.)
- **Smallest fix:** a small guard that, when the plugin's title icon's row is not display none, sets it
  inline and logs that it had to. Inline wins over any selector problem.

### One fix that covers 1, 2 and 3 together

A small watcher, drawn next to the existing hidden-tab trap: every time something changes in the page,
and on every touch, press or focus, find Steam's row from the plugin's title icon and make sure it is
display none (set inline, with a log line saying so when it was not). It costs about forty lines and a
test with the real row shape. Its log line is also the evidence: it will say how often and in what
state the row came back. It does not fix the cause; it makes the symptom impossible and tells us the
cause. I would measure first, because the read decides which fix is the right one. If the next Deck
block cannot be had soon, the watcher is safe to ship without it.

## Measurement plan for the next Deck block

One owner at the Deck at a time. Everything below is a read, or a press the rig can do.

**Setup**

1. Game running full screen (Deep Rock Galactic: Survivor, as in the sighting). Panel open on Main, the
   help chip showing (the 18 October captures show it on a new chat; check it is still there).
2. Inject the passive watcher below through the debug link, the way plan 76 did. It writes only to a
   variable in the page, changes nothing, and goes with the next plugin reload.
3. Take one baseline read and one screenshot. Expected: Steam's row display none, the rule matches.

**The reads (rig can do all)**

- **R1 pop-up route, no touch:** A on the help chip, wait for the pop-up, B. Read at 0.3, 1, 3 and 10
  seconds after the screen returns. This tests the "fresh row after a pop-up" half without a finger.
- **R2 no-game control:** the same R1 with no game running. If the row shows only with a game, that is
  the first real fact.
- **R3 the maintainer's touch:** the maintainer taps the help chip once with the watcher running and
  says "now" when the ghost shows. The session reads **before pressing anything**, takes a screenshot,
  then presses one D-pad button and reads again. The difference between the two reads is the finding.
  The rig cannot touch the screen (the pretend touch in plan 81 reached the page as events but did not
  switch Steam to pointer mode). If a real touch cannot be had, R1 and R2 still give two of the three
  states.

**The exact page read** (run it, save the output as the evidence file; the first line of the result says
which candidate is on):

```js
(() => {
  const d = document;
  const RULE = '.bonsai-scope .bonsai-decky-tabs-root > .Panel.Focusable > div:has(.bonsai-tab-title-leaf):has(img[aria-label]):not(:has([class*="TabContentsScroll"]))';
  const leaf = d.querySelector('.bonsai-tab-title-leaf');
  const root = d.querySelector('.bonsai-decky-tabs-root');
  const box = (e) => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round); };
  const cls = (e) => String(e.className || '').split(/\s+/).filter(Boolean).slice(0, 3).join('.');
  const out = { leafFound: !!leaf, rootFound: !!root };
  if (leaf) {
    // The row: the top-most ancestor of the plugin's title icon that does not hold the tab body.
    let row = leaf;
    while (row.parentElement && !row.parentElement.querySelector('[class*="TabContentsScroll"]')) row = row.parentElement;
    const cs = getComputedStyle(row);
    out.row = { tag: row.tagName, cls: cls(row), box: box(row), display: cs.display, position: cs.position,
      opacity: cs.opacity, matchesRule: row.matches(RULE),
      insideTabsRoot: !!root && root.contains(row), parentCls: cls(row.parentElement),
      hintImgs: [...row.querySelectorAll('img[aria-label]')].map((i) => i.getAttribute('aria-label')),
      hintTexts: [...row.querySelectorAll('*')].filter((e) => !e.children.length && /^(L1|R1|LB|RB)$/.test((e.textContent || '').trim()))
        .map((e) => e.tagName + ':' + e.textContent.trim()) };
    out.chain = [];
    for (let e = leaf; e && e !== d.documentElement; e = e.parentElement) out.chain.push(e.tagName + '.' + cls(e));
  }
  out.page = { plugBoxes: d.querySelectorAll('.bonsai-scope').length, thinBars: d.querySelectorAll('.bonsai-tab-bar').length,
    styleBlocks: [...d.querySelectorAll('style')].filter((s) => s.textContent.includes('bonsai-decky-tabs-root')).length,
    bodyClass: String(d.body.className).slice(0, 160), htmlClass: String(d.documentElement.className).slice(0, 160),
    ringMarks: d.querySelectorAll('.gpfocus, .gpfocuswithin').length, pointerCoarse: matchMedia('(pointer: coarse)').matches,
    hoverNone: matchMedia('(hover: none)').matches, maxTouch: navigator.maxTouchPoints };
  return JSON.stringify(out);
})()
```

**The passive watcher** (same pieces, run on a timer and on every page change; logs only):

```js
(() => {
  window.__ghost = [];
  const RULE = '.bonsai-scope .bonsai-decky-tabs-root > .Panel.Focusable > div:has(.bonsai-tab-title-leaf):has(img[aria-label]):not(:has([class*="TabContentsScroll"]))';
  const rowOf = () => { let r = document.querySelector('.bonsai-tab-title-leaf');
    while (r && r.parentElement && !r.parentElement.querySelector('[class*="TabContentsScroll"]')) r = r.parentElement; return r; };
  const sample = (why) => { const r = rowOf();
    window.__ghost.push({ t: Math.round(performance.now()), why, found: !!r,
      display: r && getComputedStyle(r).display, matches: r && r.matches(RULE),
      imgs: r && r.querySelectorAll('img[aria-label]').length }); };
  setInterval(() => sample('tick'), 250);
  new MutationObserver(() => sample('dom')).observe(document.body, { childList: true, subtree: true, attributes: true });
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((n) => document.addEventListener(n, () => sample(n), true));
})()
```

**How to read the result**

| Read | Meaning |
|---|---|
| Row display is not none, rule does **not** match, a condition is false (image badges missing, or the row is not the page's first child) | Candidate 1 |
| Row not inside the plugin's box, or more than one plugin box or style block | Candidate 2 |
| Row display is not none and the rule **does** match | Candidate 3 |
| Row display is none but the screenshot still shows it | Painting problem; none of the three |
| Badges are text boxes in the ghost state and images after one D-pad press | Candidate 1 confirmed, and the fix is the shorter rule |

Evidence file and picture names follow the usual pattern; the watcher's list goes into the same file.

## Docs that should be corrected (not done here)

- The roadmap entry and rows TAB-BAR-GHOST-01 and P84-TABS-02 call the ghost "Steam's own bumper
  hint". It is Steam's own **tab row**. The two earlier "not reproduced" results should say they counted
  only the plugin's bar and had no game.
- The roadmap's older note ("the drop-down strip is gone from the code") reads as if that closed it.
  It removed something that probably was not the cause.
- The focus-graph says nothing of the left-over part can be seen. It should say the plugin still
  hides Steam's row with one rule and nothing checks it.
- The star rating: the maintainer set this to three stars (plan 96 section 9e). The roadmap entry still
  says two.

## What I could not settle from here

- Whether Steam's badges, in the ghost state, are images or text. This is the whole of candidate 1.
- Why the strip covers the chat instead of pushing it down. The plan 30 numbers say Steam's row was in
  the flow. The read gives its position and settles it.
- Whether the 7 September ghost was Steam's row or the old drop-down strip. The picture is gone.

## Where

- The one hiding rule: `src/styles/sections/section-1.ts` (the block starting at "Plan 30 (D44)").
- Where Steam's tab row is mounted and where the thin bar is drawn: `src/index.tsx` (the `Tabs` call
  and the `barInStrip` choice at the end of `Content`).
- The plugin's title icons (the leaf the rule anchors on): `src/features/plugin-shell/tabTitles.tsx`.
- The thin bar, both places: `src/features/plugin-shell/TabIndicatorBar.tsx`,
  `src/features/chats/title/TitleTabStrip.tsx`, `src/features/chats/title/useTopStripTabBar.ts`,
  `src/features/chats/title/deckyHeaderShape.ts`.
- The trap for Steam's hidden buttons (the place a watcher would sit):
  `src/features/plugin-shell/useHiddenTabHeaderTrap.ts`.
- Layout watchers that run on pointer moves: `src/features/plugin-shell/useTabStripBodyOffset.ts`,
  `useQamPanelHeightGuard.ts`, `useQamPanelSideBleed.ts`, and `src/shared/dpad/useTabBodyFocusScroll.ts`.
- Pop-up rebuild and the saved note: `src/features/plugin-shell/bonsaiSessionSurvival.ts`,
  `src/features/about/usePluginHelpModal.tsx`; the help chip: `src/features/preset-carousel/MainTabPresetRow.tsx`.
- Bumper and trigger reading: `src/shared/dpad/focusNavigation.ts`, `src/shared/dpad/shoulderSwitch.ts`,
  `src/features/chats/title/useChatTriggerSwitch.ts`.
- Test stand-in with no tab row: `src/test-harness/deckyQuickAccessLayout.tsx`.
- Old strip: deleted in commit `64deec74d` (2026-10-08); the hide rule came with `72fa91663`
  (2026-09-02); the timer that did not hold, `9188e7251` (2026-09-15).
- Plan 30's measurements of Steam's row (the three parts, the 252 and 300 point widths, the glyph
  images): `workshop:archive/30-collapsing-tab-bar.md`, section 8; the probe:
  `workshop:scripts/archive/probe_deck_tab_bar.py`.
- The two "not reproduced" runs: `workshop:test-evidence/plan76-P76-M-TABBAR-GHOST.json`,
  `plan81-P81-LOOK-TAB-GHOST.json` (and its picture).
- The 18 October picture: `workshop:test-evidence/plan96-HAND-ghost-tab-bar.png`.
- The 23 September recording: `recordings/DeckRecord_20260923_235526_game.mkv` (this PC, git-ignored).
- Roadmap entry and rows: `docs/roadmap.md` (Bugs, tabs), `docs/roadmap-details.md`,
  `docs/testing-manual.md` (TAB-BAR-GHOST-01, P84-TABS-02), `docs/focus-graph.md` (tab bar sections).
