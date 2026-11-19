# Plan 108a: the briefs (smoother D-pad scrolling)

How a brief is assembled: the session hands each helper [108-helper-rules.md](108-helper-rules.md), the section below
with its letter, the tip hash, the absolute path of its own copy of the repo, and the plan id (108a). A section says:
what a player sees today, where it comes from, what to build, the files owned, the tests, and the check that proves
it. Evidence files are named `plan108a-<ROW>.json` by the Deck driver, never by a helper. The plan itself is
[108a-smoother-dpad-scrolling.md](../108a-smoother-dpad-scrolling.md).

**Line numbers are as read at tip `28306e896` on 2026-11-19 by one reader, not yet spot-checked by a second; the
session re-checks every section against the tip at go.** A helper that finds a line has moved re-greps and says so; a
helper that finds its brief wrong says so and stops rather than building the brief's mistake.

## Rules special to plan 108a

1. **Build what was measured.** Step 0 tries each motion with a script whose trigger and timing section G then
   copies (the pane's own `scroll` event, the element's own `animate`). Section G does not invent a different start.
2. **Where the page ends, how far it moves and how often are not yours to change.** They are locked (plan § 4). The
   walk tests' positions are the guard: with the motion on, every press must end exactly where it ends with it off.
3. **Never time the motion from the plugin's own window.** The plugin's code runs in Steam's hidden page; its
   `requestAnimationFrame`, `ResizeObserver` and `matchMedia` are that page's, not the panel's
   (`src/features/ask/bar/useAskBarInitialRingClaim.ts:149`, `src/test-harness/panelFrames.ts:13-17`, the open Bugs
   entry "Other size watchers made in the plugin's own window may react late on the Deck"). Use the pane's own events
   and the element's own `animate`.
4. **No new setting, no new back-end call.** The motion follows Steam's Reduce Motion and the "lighter while a game
   runs" mode that already exist.
5. **Nothing is drawn sliding while a row is being held in place** (the Developer switch "Open sections as you
   walk"; `holdTabBodyStop`, `src/shared/dpad/useTabBodyFocusScroll.ts:346`).
6. **Section G is an Opus helper at extra-high, and only starts with step 0's numbers and the maintainer's pick
   written into its task.** No measurement, no lane (AGENTS.md, the routing table).

## The facts every section leans on

- **The one place that moves a plain tab's page at a D-pad press:** `placeFor` in
  `src/shared/dpad/useTabBodyFocusScroll.ts:234-248`; the write is line 244
  (`pane.scrollTop = place.scrollTop`). It runs from a capture-phase `focusin` listener on the tab body
  (`:376-384`, registered `:392`) and from `focusInTabBody` (`:261-274`), which the tabs call for their own hops.
  The other three writes in the file (`:314`, `:328`, `:361`) keep a held row still; they are not page turns.
- **Why it is instant** is written in that file's header (`:12-17`): Steam looks at the control when focus lands and
  scrolls it in itself if it is outside its band; a slow move would still have it outside. And: "Nothing yet shows
  Steam leaving a pane we glide alone, so the step is instant."
- **The band** is the pane's own `scroll-padding`: 116 px at the top, 80 at the bottom, read off the pane
  (`:46-47`, `:143-147`), with 2 px of slack (`:50`).
- **The step** is `TAB_SCROLL_STEP_FRACTION = 0.48` of the pane (`src/shared/dpad/tabBodyScrollPlan.ts:78`), or
  `FOLDED_TAB_SCROLL_STEP_FRACTION = 0.32` for a folded tab (`:86`), asked for by the help strip
  (`src/features/folded-tabs/useHelpStrip.ts:113-123`). On the Deck's own screen (pane about 430 px) that is the
  137 to 138 px measured in `workshop:test-evidence/plan93-P89-TAB-WALK-OWN-SCREEN-SETTINGS.json`
  (`down_walk_steps_px`: 137, 133, 137, 138, 137, 137, 138; 7 of 26 presses moved the page).
- **Which tabs:** every tab body is wrapped in `TabBodyFocusRoot` except Main: Search, Ollama, Settings, Permissions,
  Developer, About (`src/index.tsx:1058`, `1088`, `1093`, `1099`, `1114`, `1121`). The root carries
  `data-bonsai-tab-body` and the class `bonsai-tab-body-root` (`src/features/plugin-shell/TabBodyFocusRoot.tsx:66-68`)
  and calls the scroll hook at `:56`.
- **Steam's own glide:** starts about 30 ms after the focus handler returns and lasts about 150 ms
  (`src/features/answer/bubble/answerBubbleBandGeometry.ts:55-60`, a scroll log of 2026-09-06); on the plain tabs,
  where the plan leaves a row a few px outside the band, Steam glides it 4 to 8 px over 3 or 4 frames
  (`workshop:test-evidence/plan89-M1-TAB-WALK.json`, `how_the_pane_moves`). Steam alone moved these tabs up to 329 px
  of a 741 px pane at one press (`workshop:test-evidence/plan87-M4-OTHER-TABS.json`).
- **The plugin's one smooth scroll today:** `scrollPaneSmoothlyBy` in
  `src/features/answer/details/chipLadderPlacement.ts:125-139` (`pane.scrollTo({ top, behavior: "smooth" })`), on
  Main only; `:16-24` says why it never fights Steam (both aim at the same place).
- **The stylesheet pins the pane to `scroll-behavior: auto !important`** (`src/styles/sections/section-1.ts:118-119`).
  It has been there since the early UI commits (`8667cb8a8`); no reason is recorded. It does not stop an explicit
  smooth scroll (the chips' one works). Leave it alone.
- **Reduced motion and the game hold, as the tab slide does them:** `prefersReducedMotion()`
  (`src/features/preset-carousel/presetChipShared.ts:89-92`), `pageGlideHeldForGame()`
  (`src/features/plugin-shell/tabGlide.ts:61-70`), joined at `tabGlide.ts:93`; the stylesheet side is
  `src/features/plugin-shell/tabIndicatorBarStyles.ts:118-140`. The tab slide's numbers: 180 ms and
  `cubic-bezier(0.2, 0.8, 0.2, 1)` (`tabGlide.ts:30-34`). On the Deck, reduced motion is Steam Settings >
  Accessibility > Reduce Motion (`workshop:test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`, its `setup`).
- **The tests that pin these tabs' walk:** `src/features/plugin-shell/TabBodyFocusRoot.walk.test.tsx` (positions
  only; its header says "Does not: Animate"), on the kit `src/test-harness/tabBodyWalk.tsx` (pane sizes `:34-35`;
  every box is `PANE_TOP + inset + top - scrollTop`, `:190`; Steam's scroll modelled three ways, `:215-234`);
  `src/shared/dpad/tabBodyScrollPlan.test.ts`; `src/features/folded-tabs/autoFold.frames.test.tsx` (the held row,
  frame by frame, on `src/test-harness/panelFrames.ts`); `src/features/plugin-shell/tabGlide.test.tsx` (reduced
  motion `:181`, a game running `:191`).

**Outside facts, not yet confirmed here** (addresses given from memory, not opened in this session; step 0 confirms
each by its own readings):

- A page's `scroll` events are sent before its frame callbacks and before the frame is painted, so a drawing started
  in a `scroll` listener shows from the very frame the page moved in
  (https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering).
- `Element.animate()` draws a transform, opacity or filter without changing the element's style or the page's
  scroll position (https://developer.mozilla.org/en-US/docs/Web/API/Element/animate).
- `getBoundingClientRect()` includes a transform that is being drawn, so any box read during a slide is the drawn
  box, not the true one (https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect).

---

## M — The drawing: one tab on mock-up board 7 (★ `[docs]`, Opus at medium or high by the house rule of 2026-11-19)

Board folder: `docs/demos/mockup-board-7` (reserved for plans 108a to 108g; the session creates it and numbers the
tabs; `N` below is this tab's number). Learn the board from `docs/demos/mockup-board-5/README.md` and the kit in
`docs/demos/mockup-board-2/src` (`30-core.js`: `reviewBlock` at `:137`, the D-pad engine driven by `data-stop` and
`data-row` at `:214-241`, `deckFrame` at `:338`). Board 5's `61-sections.css` and `71-sections.js` (the folded
sections of a tab) are the worked example.

- **The call:** how the page should move when the ring walks out of the comfortable part of a long tab.
- **Facts to draw from:** today the page stays still while the ringed row is inside the band (116 px clear at the
  top, 80 at the bottom of a pane about 430 px high on the Deck's own screen), then moves 138 px in one frame, on
  about one press in three or four (the facts above). Copy the Settings tab's section lines from
  `src/features/settings/settingsTabFolds.ts:36-43` and its row names from
  `src/features/search-tab/bonsaiSettingsIndex.ts:46-58`; open the tab's own files for anything else. Draw every
  section open, so the list is long enough for four page turns each way.
- **The list must really scroll**, inside a Deck frame at true size (the column is 300 points), by the same rule:
  still while the ringed row is in the band, then one step of 138 px, never past the ends. Arrow keys walk it.
- **Options, one card each, all pressable** (ids `tN-today`, `tN-A`, `tN-B`, `tN-C`, `tN-D`):
  - **Today:** the page is in its new place on the next frame.
  - **A, a glide:** the same move drawn over 180 ms with the tab slide's easing
    (`cubic-bezier(0.2, 0.8, 0.2, 1)`). A three-way switch on the card: 120, 180, 260 ms.
  - **B, a short hop, then a glide:** the first part of the move at once (as far as it takes for the ringed row to be
    inside the band, about 50 px), the rest as in A. Say on the card: "what A becomes if Steam will not leave a full
    glide alone".
  - **C, a jump with a quick fade:** the move at once; the list goes to half strength and comes back over 180 ms.
  - **D, a jump with a quick blur:** the move at once; the list is blurred 3 px and sharpens over 180 ms.
- **Cost to state on each card, in plain words:** A and B, "a small change; the Deck test must show Steam leaves it
  alone"; C, "cannot upset Steam; the cheapest"; D, "cannot upset Steam; the most drawing work for the Deck, measured
  before it is built".
- **One line under the cards:** "With Steam's Reduce Motion on, every choice moves like Today."
- **Files owned:** `docs/demos/mockup-board-7/src/6N-scroll.css` and `7N-scroll.js`, every name prefixed `b7tN`.
  Nothing else: not the kit, not `build.sh`, not another tab's files. No git command that changes anything; no Deck.
- **Check before reporting:** `node --check` the JS file; build the board with its `build.sh` and confirm it writes
  a file. Do not open a browser; the session looks and sends fixes back.
- **Report:** files written; each option id with one line; anything that could not be drawn from the code, and why.

## 0 — Step 0, the measurement on the Deck (the session writes the block; the Deck driver runs it)

Three measurement rows. The only verdicts are "measured" and COULD NOT RUN. The Deck's own screen (not the monitor).
Before the block: the usual start (machine lease, hold awake, the build on the Deck read and written down, the
plugin open on the test chat). Unload the Deck's AI before the game leg; never reload the plugin with a game running.

**The second opinion is asked once before part 0b** (see "The second opinion's questions"). The rig's rule for
`deck_readPage` is "read, do not drive". Part 0b draws on the page by script. That is allowed here only as a
measurement of Steam; no check is passed on it; the script is removed at the end of every leg.

### The script (install with one `deck_readPage` call; the expression is the whole block)

```js
(() => {
  const W = window;
  if (W.__p108a) return { ok: true, already: true, mode: W.__p108a.mode };
  const PANE = '[class*="TabContentsScroll"]';
  const S = { mode: "record", ms: 180, hop: 0, rows: [], cap: 6000, anim: null, focusAt: -1e9, hot: 0,
    lastPane: null, last: 0, pSt: -1, pTop: -1, pLab: "", pTs: 0 };
  const r1 = (n) => Math.round(n * 10) / 10;
  const label = (el) => (el ? ((el.getAttribute("aria-label") || el.textContent || "") + "").trim().slice(0, 40) : "none");
  const ringEl = () => document.querySelector(".gpfocus") || document.activeElement;
  const px = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };

  const onFocus = () => { S.focusAt = performance.now(); S.hot = S.focusAt + 700; };

  const onScroll = (e) => {
    const p = e.target;
    if (!p || !p.matches || !p.matches(PANE)) return;
    const now = performance.now();
    const d = S.lastPane === p ? p.scrollTop - S.last : 0;
    S.lastPane = p; S.last = p.scrollTop; S.hot = now + 700;
    if (S.mode === "record" || Math.abs(d) < 20 || now - S.focusAt > 250) return;
    const body = p.querySelector("[data-bonsai-tab-body]");
    if (!body || typeof body.animate !== "function") return;
    if (S.anim) { try { S.anim.cancel(); } catch (_) { /* gone */ } S.anim = null; }
    let from = d;
    if (S.mode === "flipband") {
      const ring = ringEl();
      const pr = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const bandTop = pr.top + px(cs.scrollPaddingTop, 116) + 2;
      const bandBottom = pr.top + p.clientHeight - px(cs.scrollPaddingBottom, 80) - 2;
      const rr = ring ? ring.getBoundingClientRect() : null;
      if (rr) from = Math.max(Math.min(0, bandTop - rr.top), Math.min(Math.max(0, bandBottom - rr.bottom), d));
    }
    const kf = S.mode === "fade" ? [{ opacity: 0.5 }, { opacity: 1 }]
      : S.mode === "blur" ? [{ filter: "blur(3px)" }, { filter: "blur(0px)" }]
      : [{ transform: "translateY(" + from + "px)" }, { transform: "translateY(0px)" }];
    const a = body.animate(kf, { duration: S.ms, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    const done = () => { if (S.anim === a) S.anim = null; };
    a.onfinish = done; a.oncancel = done; S.anim = a;
    S.hop = r1(d - from);
    if (S.rows.length < S.cap) S.rows.push(["draw", Math.round(now), S.mode, r1(d), r1(from), S.ms]);
  };

  const frame = (ts) => {
    if (W.__p108a !== S) return;
    const ring = ringEl();
    const p = (ring && ring.closest && ring.closest(PANE)) || S.lastPane;
    const st = p ? r1(p.scrollTop) : -1;
    const top = ring && ring.getBoundingClientRect ? r1(ring.getBoundingClientRect().top) : -1;
    const lab = label(ring);
    const changed = st !== S.pSt || top !== S.pTop || lab !== S.pLab;
    if (changed) S.hot = Math.max(S.hot, ts + 700);
    if ((changed || ts < S.hot) && S.rows.length < S.cap) {
      S.rows.push([Math.round(ts), r1(ts - S.pTs), st, top, lab === S.pLab ? "" : lab, S.anim ? 1 : 0]);
    }
    S.pSt = st; S.pTop = top; S.pLab = lab; S.pTs = ts;
    if (p) { S.lastPane = p; S.last = p.scrollTop; }
    W.requestAnimationFrame(frame);
  };

  S.take = () => { const out = S.rows; S.rows = []; return out; };
  S.set = (mode, ms) => { S.mode = mode; if (ms) S.ms = ms; return { mode: S.mode, ms: S.ms }; };
  S.stop = () => {
    document.removeEventListener("scroll", onScroll, true);
    document.removeEventListener("focusin", onFocus, true);
    if (S.anim) { try { S.anim.cancel(); } catch (_) { /* gone */ } }
    delete W.__p108a;
    return true;
  };
  document.addEventListener("scroll", onScroll, true);
  document.addEventListener("focusin", onFocus, true);
  W.__p108a = S;
  W.requestAnimationFrame(frame);
  const ring0 = ringEl();
  const pane = (ring0 && ring0.closest && ring0.closest(PANE)) || document.querySelector(PANE);
  if (pane) { S.lastPane = pane; S.last = pane.scrollTop; }
  return {
    ok: true,
    canDraw: typeof document.body.animate === "function",
    hasFocus: document.hasFocus(),
    tabBodies: document.querySelectorAll("[data-bonsai-tab-body]").length,
    pane: pane ? { clientHeight: pane.clientHeight, scrollTop: pane.scrollTop, padTop: getComputedStyle(pane).scrollPaddingTop,
      padBottom: getComputedStyle(pane).scrollPaddingBottom, behavior: getComputedStyle(pane).scrollBehavior } : null,
    reducedMotion: W.matchMedia("(prefers-reduced-motion: reduce)").matches,
    dpr: W.devicePixelRatio,
    inner: [W.innerWidth, W.innerHeight],
  };
})()
```

What it does. It was checked on this PC only for syntax and, against a hand-made stand-in page, for its sums (the
drawn start and the hop, both directions); it has never run on the Deck. If the install call throws or returns
`ok: false`, write the error down, do the legs you can by hand reads, and stop part 0b.

- **Reading only, in mode `record`:** a frame loop writes a row whenever the ring's control, its top or the page's
  place changes, and every frame for 0.7 s after a change. A frame row is
  `[time ms, gap since the last frame ms, scrollTop, ring top, label when it changed, 1 while a drawing runs]`.
  The first row's gap is meaningless (it counts from zero).
- **Drawing, in the other modes:** when the page jumps 20 px or more within a quarter of a second of a ring move, on
  a tab that has a tab body (never Main), it draws on the tab body: `flip`, the whole move as a glide; `flipband`,
  the glide started only as far out as keeps the ring's control inside the band (the rest is the hop); `fade`;
  `blur`. A draw row is `["draw", time, mode, moved px, drawn-from px, length ms]`.
- **Calls:** `window.__p108a.set("flip", 180)` sets the mode and length; `window.__p108a.take()` hands back the rows
  and empties the list; `window.__p108a.stop()` removes everything. A reload of the panel also removes it.
- A leg of 26 presses is about 1,200 rows. If a `take()` comes back cut short, take after every eight presses.
- Presses are one at a time, at least a second apart, D-pad only (no A except the one press on "Open all").

### 0a — Today, as it is (row P108A-M-TODAY)

1. Install the script (mode `record`). Write down what the install call returns (the pane's height and paddings,
   the scroll behaviour, reduced motion, the page's focus).
2. Settings, sections as a person finds them: Down from the tab bar to the last control, then Up to the tab bar.
   `take()` after each leg.
3. Settings with every section open (A on the floating "Open all" button): the same two legs. This is the walk of
   `plan93-P89-TAB-WALK-OWN-SCREEN-SETTINGS.json` (26 presses each way).
4. Developer with every section open, and the Ollama tab as found: the same two legs each.
5. Main, a chat whose last answer is long (three screens or more): Down from the tab bar through the answer to the
   question box, and back Up.
6. Main, Show details open on that answer: Right along the chips and back (the plugin's one smooth scroll, for
   comparison).

Per press, from the rows: did the page move; how far in all; in how many frames; the gap between the ring's move
and the first frame of the page's move. A move of 20 px or more inside one frame is a **jump**; a move spread over
three frames or more is a **glide**. Evidence per leg: presses, presses that moved the page, the jumps (count,
sizes), the glides (count, px, ms from first to last frame). For Main, the length in ms of Steam's own glides is the
yardstick for the motion's length when the maintainer's pick names none (the last paragraph of this section).

**The line (written before measuring):** there is a snap to fix if any press on Settings, Developer or the Ollama
tab is a jump. If none is, stop after 0a and report.

### 0b — Each choice, drawn by the script (row P108A-M-PROBE)

Settings with every section open, Down 26 and Up 26, for each of: `flip` at 180 ms, `flipband` at 180, `fade` at
180, `blur` at 180. Then, for whichever of `flip` and `flipband` did best, once more at 120 and at 260. Then ten Down
presses as fast as the rig sends them in `flip` (a press during a drawing). `take()` after every leg. End with
`stop()`, and one more plain walk of eight presses to see the page behaves as in 0a.

Read from the rows, for every press that has a draw row:

1. **Shown from the first frame?** In `flip`, the first frame row after the draw row must show the ring's top within
   2 px of `(its top at the end of the press) + (drawn-from px)`: the list is drawn where it was. If instead the
   first frame shows the end place and a later frame jumps back, the drawing started a frame late: write "flash"
   for that press.
2. **Did Steam add a move?** After the frame the page jumped in, `scrollTop` must not change by 1 px or more in the
   next 1.5 s. (Frames are written only on a change once the 0.7 s are over, so no later row means no change.)
3. **Same end place?** The ring's top at the end of the press, against the same press in 0a step 3: within 1 px.
4. **Frames.** Over the frame rows with the drawing flag set: the mean gap (frames a second is 1000 divided by it)
   and the longest gap. For comparison, the same numbers over the 200 ms after each jump in 0a step 3.

**The lines (written before measuring):** a mode passes "Steam leaves it alone" with no failure of readings 2 and 3
in at least 12 page-turning presses each way; one failure and it is out. A mode passes "frames" with 45 frames a
second or more during the drawing and no gap over 50 ms. A "flash" on more than one press in ten fails the mode as
built by this trigger, and the session asks the second opinion before choosing another.

### 0c — With a game running (row P108A-M-GAME)

Unload the Deck's AI. Start a game from the Recent Games row (earlier rounds used Deep Rock Galactic: Survivor) and
stop on a menu. Open the panel; read `document.hasFocus()` (the lost-focus trap). Settings with every section open,
twelve presses down and twelve up, in `record`, then in each mode that passed 0b. Reading 4 again.

**The line:** a mode may cost no more than 5 frames a second against `record` on the same presses; if it costs more
it is built and held while a game runs (the maintainer's call a3 decides between "held when costly", "always held"
and "always on").

**What the session writes into section G's task after step 0:** which mode is built (the plan's § 5 table, with the
maintainer's pick), its length in ms (the pick's; if the pick names none, the length of Steam's own glide from 0a
step 5 rounded to 20 ms, kept between 120 and 220), whether it is held while a game runs, and the evidence files'
names.

---

## G — The picked motion on the six plain tabs (★★★ `[focus]`, Opus extra-high; `feature-lane` with model and effort passed by hand)

**What a player sees today.** On Search, Ollama, Settings, Permissions, Developer and About, about one D-pad press
in three or four moves the page a third of the pane in a single frame.

**Where it comes from.** "The facts every section leans on", above. Re-find each before changing anything.

**What to build.** The mode, length and game rule come from your task (step 0's result). Nothing else is yours to
choose.

1. **A new file, `src/features/plugin-shell/tabTurnMotion.ts`** (header as `docs/code-clarity.md` asks). It exports:
   - `TAB_TURN_LOOK`: one of `"glide"`, `"hop-glide"`, `"fade"`, `"blur"` (the mode from your task; a constant, not
     a setting);
   - `TAB_TURN_MS` (from your task) and `TAB_TURN_MIN_PX = 20` (a page move shorter than this is not drawn);
   - `createTabTurnMotion(body: () => HTMLElement | null)`, returning `{ settle(): void; turned(pane, movedBy, row): void }`.
   - **`turned(pane, movedBy, row)`** does nothing when `Math.abs(movedBy) < TAB_TURN_MIN_PX`, when motion is held
     (item 2), or when the body has no `animate` function (jsdom has none; the Deck has). Otherwise it listens once,
     in the capture phase, for the pane's next `scroll` event, and on it starts the drawing on the tab body's root:
     `root.animate(keyframes, { duration: TAB_TURN_MS, easing: TAB_GLIDE_EASE })`, with no fill, so nothing is held
     at the end. If no `scroll` event comes within 100 ms it removes the listener and draws nothing.
   - **Keyframes**, the script's own: `"glide"`, `translateY(<movedBy>px)` to `translateY(0px)`; `"hop-glide"`, the
     same with the start clamped so the ringed row is never drawn outside the band:
     `from = max(min(0, row.bandTop - row.top), min(max(0, row.bandBottom - row.bottom), movedBy))`, all in screen
     y after the move; `"fade"`, opacity 0.5 to 1; `"blur"`, `blur(3px)` to `blur(0px)`.
   - **`settle()`** cancels a running drawing, so the page shows its true place at once, and removes a waiting
     listener. It is safe to call when nothing runs.
   - It uses no `requestAnimationFrame`, no `ResizeObserver` and no timer other than the 100 ms give-up.
2. **`src/features/plugin-shell/tabGlide.ts`:** export the check that already exists at line 93 as
   `tabMotionHeld(): boolean` (reduced motion, or the game hold) and call it from `takeTabGlide`. The tab slide's
   behaviour does not change. If your task says the page turn stays on while a game runs, `tabTurnMotion.ts` asks
   `prefersReducedMotion()` alone.
3. **`src/shared/dpad/useTabBodyFocusScroll.ts`** (keep this change small):
   - the hook takes a third, optional argument, the motion (`{ settle, turned }`; declare its type in this file),
     kept on `BodyState`;
   - `placeFor` (`:234`): its first statement is `body.motion?.settle()`, before the landing watcher is asked and
     before anything is measured. After the write at `:244`, when the pane really moved and `body.held` is null,
     call `body.motion?.turned(pane, movedBy, row)` with the ringed row's box and the band in screen y
     (`scrollPlaceFor` already works both out, `:144-159`; hand them back from it);
   - `holdTabBodyStop` (`:346`): `settle()` before its first measurement;
   - rewrite the header's "Does not animate" lines (`:12-17`) and the pointer at
     `src/shared/dpad/tabBodyScrollPlan.ts:17` so they say what is true now, with step 0's evidence file named.
   - Nothing else: the plan's arithmetic, the band, the step, the late look and the hold stay byte for byte.
4. **`src/features/plugin-shell/TabBodyFocusRoot.tsx`:** make one motion per tab body and pass it to the hook at
   `:56`; `settle()` when the body unmounts.

**Files owned:** the four above, the new test file `src/features/plugin-shell/tabTurnMotion.test.ts`, and the tests
and test kit named below. **Do not touch:** `src/shared/dpad/tabBodyScrollPlan.ts` beyond its one comment line,
`src/styles/sections/section-1.ts`, anything under `src/features/answer/`, `src/features/main-tab/`,
`src/shared/dpad/chatPanelScroll.ts`, `useDockClearanceOnFocus.ts`, or any Main tab file.

**Tests** (own files by name, two workers; the helper rules list the other gates).

- `tabTurnMotion.test.ts`: with a stand-in `animate` on the root, `turned` then a `scroll` event draws once with the
  right start and length, for each look; nothing is drawn under reduced motion (`src/test-harness/reducedMotion.ts`),
  with a game running when held (stub Steam's running app the way `tabGlide.test.tsx:191` does), for a move under
  20 px, with no `scroll` event inside 100 ms, or with no `animate` on the element; `settle()` cancels.
- `TabBodyFocusRoot.walk.test.tsx`, a new describe on `src/test-harness/tabBodyWalk.tsx`: give the kit a stand-in
  `animate` that shifts every box by the drawn start (`:190` is the one place boxes are made) until it is cancelled,
  and never finishes by itself. Then, for every tab and each of Steam's three modelled rules: the walk with the
  motion on gives the same page place and the same box after every press as the walk with it off. **This is the
  guard for `settle()` coming first: prove it both ways.** Take the `settle()` call out of `placeFor`, see this
  test fail, put it back, and name that failure in the commit message.
- `src/features/folded-tabs/autoFold.frames.test.tsx`: one case more: a landing that holds a row draws nothing.
- **Wider tests to search before you commit:** `git grep -n -E "useTabBodyFocusScroll|focusInTabBody|holdTabBodyStop|takeTabGlide|TabBodyFocusRoot" -- src scripts`
  and run every test file that turns up (among them `src/shared/dpad/tabBodyFocusCalls.test.ts`,
  `src/features/plugin-shell/tabGlide.test.tsx`, the `autoFold.walk*.test.tsx` files,
  `src/features/search-tab/SearchTab.walk.test.tsx`, `src/features/about/AboutTab.walk.test.tsx`). No Python
  changes, so `tests/test_seam_contracts.py` is not in play.

**The check that proves it.** Rows P108A-GLIDE-01 to 05 and P108A-REDUCED-01 on the Deck's own screen, by the rig
(section D1); then the maintainer's eye, P108A-EYE-01.

**Your report also says:** which presses, if any, your tests showed a drawing still running at a measurement; and
whether drawing the root lower for a moment can lengthen the pane's scroll range (see the second opinion's
questions).

## D1 — The Deck block after G lands (the session writes the steps; the Deck driver runs them)

Install the step 0 script in `record` for every row; it only reads. Every row that reads a box waits a second after
its press. Evidence `plan108a-<ROW>.json`.

| Row | Steps | Pass |
|---|---|---|
| P108A-GLIDE-01 | Settings, then Developer, every section open; 26 Down, 26 Up, a second apart | For every press whose `scrollTop` changed by 20 px or more: `scrollTop` changes in one frame and not again within 1.5 s; the ring's top goes on changing for the picked length, give or take 40 ms (a fade or blur: the top is still after the first frame); the end place is within 1 px of the same press in P108A-M-TODAY; no move larger than the largest in P108A-M-TODAY |
| P108A-GLIDE-02 | Settings, every section open; ten Down as fast as the rig sends; read two seconds later | The ring's control and `scrollTop` equal those after ten slow presses, within 1 px. Take a ten-second video of it |
| P108A-GLIDE-03 | The Deck's AI unloaded, a game running; Settings, twelve presses each way | As the task of section G says: the drawing within 5 frames a second of P108A-M-GAME's `record` leg, or (held) every move in one frame |
| P108A-GLIDE-04 | Developer tab's "Open sections as you walk" on; the four landings of P105-SECTIONS-AUTO-01; switch put back | The ringed row within 2 px on every frame for 300 ms after each landing; no frame row with the ring's top gliding |
| P108A-GLIDE-05 | Search, Ollama, Permissions, About: Down to the last control and back | Every ringed control fully visible a second after its press; `scrollTop` changes once per press |
| P108A-REDUCED-01 | If call a4 is (a): read Steam's Reduce Motion; switch it on by D-pad (the route in `plan70-L5-FLOW5-REDUCED-MOTION.json`); Settings, twelve presses; switch it off; read it again | Every move takes one frame; the switch reads as before |
| QA-LOOK-01 | The look check on each of the six tabs, both screens | No finding |

A sweep (`deck_sweep`) reads boxes straight after each press and may now catch a page mid-slide. If a sweep shows a
control cut off on a page-turning press, read it again a second later before filing anything; if it happens, log it
in the findings list of `docs/mcp-setup.md` and raise it with the rig's own repo, as AGENTS.md asks.

## K — The bookkeeper's paperwork (★ `[docs]`, Sonnet medium)

Invent no result; every status names its evidence file.

1. **At go:** one open row per check of the plan's § 6 in `docs/testing.md` (the rig's rows) and
   `docs/testing-manual.md` (P108A-EYE-01, and P108A-REDUCED-01 if call a4 is (b)), each saying which screen it runs
   on. Decision D145 gains calls a1 to a4 as answered (the plan's § 4, word for word). The roadmap entry's stale
   "Related:" sentence is replaced by a pointer to the closed entry in the archive.
2. **After step 0:** the three measurement rows filled in from their evidence files; one sentence on the roadmap
   entry saying what was measured and which motion is being built.
3. **When G lands:** the roadmap entry moves to Verify (Features that need verification), naming rows
   P108A-GLIDE-01 to 05; a changelog line in plain words ("Walking a long tab with the D-pad, the page now slides
   to its new place instead of jumping"); one paragraph in `docs/focus-graph.md` saying page turns on the six plain
   tabs are drawn, that a box read within a quarter of a second of a press is the drawn box, and that rig rows wait
   a second.
4. **When the rows pass and the maintainer has said so:** the entry moves to Done as one line and the full entry to
   the archive; P108A-EYE-01 is ticked and moved to the closed archive in the same change.

## The second opinion's questions (Fable at medium; one bounded question each time)

- **Before step 0, part 0b.** "This script draws a 180 ms animation on bonsAI's own tab body in Steam's Quick Access
  page to learn whether Steam scrolls in answer. It changes no element, attribute or style, and `stop()` removes it.
  Is that an acceptable exception to the rig's read-only rule for a measurement, and is there anything in it that
  could outlive `stop()`?"
- **Before G lands.** "With the motion on, is there any measurement of a box or of the pane's range that can run
  while a drawing is still on (the late look at 160 ms, `useTabBodyFocusScroll.ts:319-329`; the hold's observer,
  `:307-317`; the help strip's watcher, `src/features/folded-tabs/useHelpStrip.ts:113`; a tab's own hop through
  `focusInTabBody`) without `settle()` having run first? And can drawing the root lower for a moment lengthen the
  pane's scroll range enough for Steam's own glide to scroll into room that then vanishes?"

## For later, not a lane: where the Main tab and the small text boxes move the page at once

Listed so a later plan (the maintainer's call a1, or a new ask) has a start. Each would need its own measurement:
Main shares the page with Steam's glide and re-checks at 150, 300 and 900 ms
(`src/shared/dpad/useDockClearanceOnFocus.ts:50`), so a drawing there overlaps real measurements.

- The answer walk: `src/features/answer/bubble/answerBubbleBandGeometry.ts:71`, `161`, `178`, `199`, `216`, `239`,
  `282`, `294`, `312`, `319`; `answerBubbleWordsUp.ts:136`, `166`, `173`; `answerBubbleCoverUp.ts:135`.
- The lift above the question box: `src/shared/dpad/useDockClearanceOnFocus.ts:118` (`scrollIntoView`, block end,
  instant) and `:150`; the step helpers in `src/shared/dpad/chatPanelScroll.ts:92`, `142`, `172`.
- The small text boxes: `src/features/answer/reasoning/reasoningBlockReading.ts:132`;
  `src/features/chats/sum-up/SessionSumUpSection.tsx:203`; `src/shared/TwoButtonConfirmModal.tsx:197`.
- Lists inside popups: `src/features/models/pull-box/PullModelsModal.tsx:313`, `343`;
  `src/features/characters/CharacterPickerModal.tsx:378-444`.
- Not a D-pad move, and out of scope here: the page following a long answer while it writes
  (`src/features/answer/stream/useStreamScrollPin.ts`; row P105-ANSWER-FOLLOW-01, in Verify).
