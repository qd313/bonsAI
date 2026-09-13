# TAB-SWITCH-01 row + probe-first plan for the LB/RB tab-strip bug

## Context

`docs/roadmap.md` § Bugs carries **"LB/RB tab switch flicker when scrolled"** (★★, OPEN,
discovery locked 2026-07-29). It has no manual-test row, so nothing catches a regression.

The bug was **re-scoped by an on-Deck pass on 2026-08-04** and the roadmap entry records the
result: the severe symptom is **gone** (no whole-frame judder), **focus retention across a
normal LB/RB switch works**, and what remains is narrower — the **tab icon strip looks busy and
the icons shuffle**, most reproducibly when pressing **LB on the leftmost tab or RB on the
rightmost**, i.e. on a switch that cannot go anywhere.

Two device measurements from the same week invalidate the existing recon
([docs/planning/03-lbrb-tab-flicker.md](docs/planning/03-lbrb-tab-flicker.md), written 2026-08-03
from static reading):

- [docs/audit/decky-tab-strip-classes.md](docs/audit/decky-tab-strip-classes.md) — **SteamOS
  never puts `.Active` on the tab buttons.** The recon's top-ranked hypothesis (H1) is a
  dim→bright ring swap keyed on `.Active:not(:focus-within)`. Those rules have never fired.
  **H1 is falsified.**
- [docs/audit/decky-realms.md](docs/audit/decky-realms.md) — plugin JS runs in `SharedJSContext`
  while the UI lives in the QuickAccess popup document, so **`document.querySelector` finds no
  bonsAI markup and `document.activeElement` is always the shell `<body>`.** The recon's Track B
  capture step and its Probe P1 are both written on the global `document`; both would be no-ops
  on device.

So the remaining symptom has **never been measured**, and the one document describing it points
at a dead mechanism. The intended outcome: a manual-test row that exists, a probe that actually
measures a shoulder press, and fix work gated on what that probe reports rather than on another
round of static inference.

**Decisions taken (2026-08-07):** probe first, no product code until it reports; corrections are
**appended** to the recon rather than edited into its body.

---

## Part 1 — Add TAB-SWITCH-01 (do this first, independent of everything else)

### `docs/testing-manual.md`

Add to the **Open regression IDs (bugs / recent ships)** list (currently ends at
**TAB-RESUME-FOCUS-01**, ~line 148), matching the surrounding `- [ ] **ID** …` style:

```markdown
- [ ] **TAB-SWITCH-01** LB/RB with focus **deep in a scrolled** Settings or Ollama panel: the
      content pane does not flash or jump, and the **icon strip does not shuffle or re-flow**.
      Repeat the two no-op presses — **LB on Main** (leftmost) and **RB on About** (rightmost):
      a press that cannot change tab must leave the strip completely still. Then repeat all of
      it with focus parked **on the tab icons** (must also be clean). Re-scoped 2026-08-04: the
      severe judder is gone; the strip is what is left — [planning](planning/03-lbrb-tab-flicker.md)
```

Also add the ID to the **D-pad scroll** row of the Tier 2 block table (~line 116) so it is
picked up when that block runs:

```markdown
| **D-pad scroll / tabs** | D-PAD-SCROLL-02 (choppy Strategy scroll bug); TAB-SWITCH-01 (LB/RB strip shuffle) |
```

### `docs/testing.md`

Add one coverage row to the table that currently holds `D-pad answer scroll` (~line 69):

```markdown
| LB/RB tab switch | TAB-SWITCH-01 | Open | Strip shuffle on no-op press; re-scoped 2026-08-04 |
```

**Why the wording differs from the recon's suggested row:** the recon proposed
*"no flash or jitter in the tab strip or content pane"*, written before the re-scope. The row
above leads with the strip and names the **no-op press** explicitly, because that is the most
reproducible case on device and the one a tester is otherwise unlikely to try.

---

## Part 2 — Commit 1: a probe that can see a shoulder press

`scripts/probe_deck_tab_strip.py` already solves the hard parts — stdlib RFC6455 handshake and
framing, CEF target discovery, `Runtime.evaluate` against `QuickAccess`. But it is **single-shot**:
it evaluates once and prints. A transition needs sampling across frames.

**New file `scripts/probe_deck_tab_switch.py`**, copying the transport from
`probe_deck_tab_strip.py` (do not modify that script — it is the reference for the `.Active`
finding and should keep working unchanged). Follow the same module-header convention.

Design — two `Runtime.evaluate` calls with the shoulder press in between:

1. **Arm.** Evaluate an installer that stores a sampler on the page and returns immediately:
   - a `requestAnimationFrame` loop recording **~90 frames** (~1.5 s at 60 Hz) into
     `window.__bonsaiTabProbe = []`;
   - per frame, for **each** `.bonsai-tab-title-icon`: `getBoundingClientRect()` (x, y, w, h),
     `getComputedStyle().color`, and the **full ancestor class chain** up to
     `.bonsai-decky-tabs-root` — the same walk the existing probe does, so the two outputs are
     directly comparable;
   - per frame, also record the tabs root's `data-bonsai-active-tab`, the `TabContentsScroll`
     node's `scrollTop` / `scrollHeight` / `clientHeight`, and a **stamped identity** — set
     `el.dataset.bonsaiProbeId` once if absent, so a replaced node shows up as a new id;
   - per frame, the computed `transform` of every ancestor between a leaf and the tabs root,
     which is where a carousel slide would show.
2. **Press.** The script prints `ARMED — press LB (or RB) now`, sleeps ~2 s.
3. **Read.** Second evaluate returns `JSON.stringify(window.__bonsaiTabProbe)`; the script
   diffs consecutive frames and prints **only frames where something changed**, plus a summary:
   did any icon rect move, did any colour change, did the class chain gain/lose `gpfocus` /
   `gpfocuswithin`, did `data-bonsai-active-tab` change, did the scroll node's identity change.

**Everything inside the evaluated JS runs in the popup document, so `document.querySelector` is
correct there.** The realms finding constrains plugin code in `src/`, not CDP evaluation against
the right target. This is exactly why the probe is the right tool and why the recon's Probe P1
(`document.activeElement` from plugin code) was not.

**Runs to capture** (each is one arm/press/read cycle):

| Run | Setup | Question it answers |
|---|---|---|
| A | Settings, scrolled deep, focus in panel → **RB** | The reported case |
| B | **Main** (leftmost), focus in panel → **LB** | The no-op press — most reproducible symptom |
| C | **About** (rightmost), focus in panel → **RB** | The other no-op end |
| D | Settings, `scrollTop == 0`, focus in panel → RB | Does scroll depth matter at all |
| E | Settings, focus **on the tab icons** → RB | The stated conditional |

Record raw output under `docs/test-evidence/`. Pair with one
`scripts/record-deck.ps1` clip (VP8, 15 s) covering B and C back to back — the probe gives
numbers, the video confirms the numbers match what a human sees.

---

## Part 3 — Fix tracks, each gated on a specific probe result

**No product code lands before Part 2 reports.** Each track below names its trigger; if the
trigger does not fire, the track is dropped, not "done anyway".

### T1 — Strip colour churn *(trigger: computed `color` on any glyph changes between frames)*

The live colour rules on device are three, and the `.Active` finding changes what they do:

- base grey `rgba(168, 182, 198, 0.62)` — [section-1.ts:100](src/styles/sections/section-1.ts)
- `.gpfocuswithin:not(.Active) … { color: #fcfcfc }` — [section-1.ts:214-219](src/styles/sections/section-1.ts).
  Because `.Active` never matches and the `gpfocuswithin` container is an ancestor of **every**
  glyph, this paints **all six white**, which
  [decky-tab-strip-classes.md](docs/audit/decky-tab-strip-classes.md) § 2 already documents.
- the `[data-bonsai-active-tab]` marker — [section-1.ts:267-272](src/styles/sections/section-1.ts),
  specificity 8, the only rule that genuinely tracks the active tab.

So glyph colour is **all-six-white whenever Steam's `gpfocuswithin` is on that ancestor, and
all-six-grey the moment it is not.** `decky-realms.md` measured `gpfocus` vanishing entirely
250 ms after a cross-container focus move. If the probe shows that class dropping during a
switch, every icon flips grey→white together — which would read exactly as *"the strip looks
busy"*.

Fix: stop keying glyph colour on Steam's transient focus classes. Key the resting appearance on
`[data-bonsai-active-tab]` (bonsAI-owned, changes once per switch, cannot flicker) and scope any
focus emphasis to the **leaf that has focus**, never to an ancestor that contains all six.

- Effort ★ · Risk **low-moderate** — it changes strip appearance, which is user-visible.
- **Bundle the dead-`.Active` removal here**, not before: the roadmap already records those rules
  as "still dead, deliberately left alone… cannot be verified without another device pass". This
  is that device pass.

### T2 — Icon geometry *(trigger: any icon `getBoundingClientRect()` moves)*

Two candidates, and the probe distinguishes them by **which** ancestor's `transform` changed:

- **Steam's carousel** slid or clamped the strip row → ancestor transform changes, all icons
  move together, we do not own it. Mitigation is limited to damping; note it and stop.
- **Our own overlap.** [`TAB_TITLE_TAB_GAP_PX = -6`](src/features/unified-input/constants.ts:94)
  is a **negative** margin on `.bonsai-tab-title-leaf`
  ([section-1.ts:146-147](src/styles/sections/section-1.ts)), so 40px chips **overlap their
  neighbours by 6px per side**. Overlapping inline-flex items repaint in stacking order, so any
  per-chip class change (Steam adding `gpfocus` to one button) can reorder what covers what —
  a plausible source of *"shuffle"* with no element actually moving. Cheap test: set the gap to
  `0` and re-run run B.
  - Watch the interaction: `.bonsai-qam-strip-stable` overrides these margins to `0`
    ([section-1.ts:54-57](src/styles/sections/section-1.ts)), and that class is added by
    [`useTabStripBodyOffset`](src/hooks/useTabStripBodyOffset.ts:63-65) only when the strip
    measures inside the 48-56px stable window. So **the resting gap already differs** depending
    on whether that measurement succeeded — worth confirming in the probe output before changing
    the constant.

### T3 — Layout re-measure during the press *(trigger: `--bonsai-tab-strip-reserve` or `--bonsai-tab-body-height` changes across the press)*

The recon concluded these hooks never run on tab change, and for the `useLayoutEffect` bodies
that is right. **But the pointer path is live**: `pointerenter` / `pointermove` call
`apply(SETTLE_MAX_ATTEMPTS)` ([useTabStripBodyOffset.ts:86-91](src/hooks/useTabStripBodyOffset.ts)),
and at that attempt count the `stripStable` early-return at `:48-50` **no longer guards** — it
measures and writes the reserve even from mid-carousel geometry. On a Deck the right trackpad is
a mouse; a resting thumb generates `pointermove`. If a press and a pointermove coincide, the tab
body offset is recomputed against a transforming strip.

Fix if triggered: gate `apply()` behind a short "switch in flight" flag, reusing the double-rAF
settle pattern already proven for the Ask bar
([useUnifiedInputSurface.ts:120-135](src/features/unified-input/useUnifiedInputSurface.ts)).

- Risk **moderate-high** — these hooks *are* QAM-BAZZITE-01 and D-PAD-SCROLL-01. Re-run both.

### T4 — Scroll-node identity *(runs regardless — the probe answers it for free)*

[`useQamPanelHeightGuard`](src/hooks/useQamPanelHeightGuard.ts:129-130) captures the
`TabContentsScroll` node **once at mount** and observes it forever. If the stamped
`dataset.bonsaiProbeId` changes across a switch, Steam replaces the node and that
`ResizeObserver` has been watching a detached element since the first tab change —
`--bonsai-tab-body-height` would stop tracking. That is a **correctness bug independent of the
flicker**; file it separately rather than folding it in.

### Explicitly **not** in this plan

- **Per-tab scroll preservation** (recon Track B). It is a UX feature, not a fix for the
  re-scoped symptom, and its design needs rewriting anyway (see corrections below). Out of scope
  per the scope decision.
- **Replacing `<Tabs>`** (recon Track D). Steam owns LB/RB routing; losing it would be worse
  than the bug.

---

## Part 4 — Append corrections to the recon

Add a dated section at the **end** of
[docs/planning/03-lbrb-tab-flicker.md](docs/planning/03-lbrb-tab-flicker.md) — body untouched,
per the decision:

```markdown
## 9. Corrections — 2026-08-07

Sections 1-8 were written 2026-08-03 from static reading. Three later sources supersede parts
of them. Read this section before acting on anything above.

- **H1 is falsified, and F7/F8 with it.** …`.Active` is never applied by SteamOS…
  (docs/audit/decky-tab-strip-classes.md, measured 2026-08-04)
- **Probe P1 cannot work as written**, and **Track B step 2's `document.querySelector` is a
  no-op on device**… (docs/audit/decky-realms.md, measured 2026-08-04)
- **The bug itself was re-scoped on 2026-08-04**… severe judder gone; focus retention confirmed
  working; the strip shuffle on a *no-op* press is what is left. Rows 1-3 of the §7 repro matrix
  no longer describe the live symptom; the no-op press they omit is the important case.
- **F10 is right about the effect bodies and incomplete about the pointer path** (see T3 above).
```

Then update the roadmap bug entry: note that TAB-SWITCH-01 now exists and that the recon carries
a corrections section.

---

## Risks and untested hypotheses — raised explicitly

Everything here is **unverified**. None of it should be treated as a finding.

1. **The mechanism is unknown.** After the re-scope, no hypothesis in the recon survives intact.
   T1 and T2 are the two most plausible, both inferred from static reading of CSS plus one
   measurement taken for a *different* purpose. Either could be wrong.
2. **"Shuffle" is the maintainer's word from watching the device and has not been characterised.**
   It could be movement, repaint order, colour flip, or Steam's carousel. The probe is designed
   to tell these apart; until it runs, T1 vs T2 is a coin toss.
3. **The no-op press may be entirely Steam-side.** `DECKY_TAB_TITLES` is a module-level const
   ([tabTitles.tsx:50-57](src/features/plugin-shell/tabTitles.tsx)) and
   `setCurrentTab(sameId)` makes React bail out, so **bonsAI renders nothing at all on a no-op
   press.** If the probe shows movement anyway, the cause is in Steam's carousel and the
   realistic ceiling is damping, not fixing. **This is the single most likely outcome to
   disappoint** — say so before starting rather than after.
4. **T1 changes how the strip looks.** The current all-six-white is a bug, but users have been
   looking at it. Any correction is a visible change and needs a screenshot before/after, not
   just a "no flicker" verdict.
5. **The `gpfocuswithin`-drops-during-switch step is an inference.** `decky-realms.md` measured
   the ring vanishing after a *programmatic cross-container `focus()`*, which is not the same
   event as a shoulder press. Do not carry it into a fix as established.
6. **Probe observer effect.** A per-frame `getComputedStyle` + `getBoundingClientRect` loop over
   six glyphs forces layout every frame and can itself perturb what it measures. If runs A-E
   disagree with the video, trust the video and thin the sampler.
7. **The strip fits, so overflow-scrolling is probably not the cause.** Six 40px chips at −6px
   margins ≈ 168px against a QAM several hundred px wide. Recorded so nobody re-derives it — but
   it is arithmetic from constants, not a measurement, and `.bonsai-qam-strip-stable` changes the
   effective width.
8. **Rendered gap depends on a measurement that can fail** (T2 note). Two devices, or one device
   across two opens, may not have the same resting strip geometry.
9. **T3's trigger may never fire in a controlled probe run** — it needs a pointer event
   coinciding with the press. Absence of evidence here is not evidence of absence; a tester with
   a thumb on the trackpad is the realistic case, and the probe runs will likely not have one.
10. **`:has()` is unsupported on Deck CEF** ([section-8.ts:42-43](src/styles/sections/section-8.ts)),
    and an invalid selector drops the **entire** comma-separated rule. There are 9 `:has()` uses
    in `src/styles/`, including two strip rules ([section-1.ts:154-155, 190-193](src/styles/sections/section-1.ts))
    that are therefore also dead. **Any new strip CSS must avoid `:has()`** — and those two dead
    rules are a second, separate reason the strip has no working focus ring today.
11. **No preview coverage of the outcome.** `npm run test:preview` can assert class names and
    map logic; it cannot see a 1-3 frame strip disturbance. Every acceptance call here is
    on-Deck and human.
12. **The recon's own line-number citations are stale** — it references `src/index.tsx:1650`
    when that file is now 1314 lines after the step-8 extraction. Re-derive before trusting any
    `file:line` in sections 1-8.

---

## Verification

**Part 1 (docs)** — `npm run mcp:validate` (generated snapshots unaffected, confirms the hooks
are happy) and a read-through that the new IDs render in both tables. Docs-only: state **N/A**
for Deck smokes per the PR contract in [docs/testing.md](docs/testing.md).

**Part 2 (probe)** — success is the probe *reporting*, not the bug being fixed:

```bash
ssh deck@$DECK_IP 'python3 -' < scripts/probe_deck_tab_switch.py
```

Runs A-E captured, raw output saved under `docs/test-evidence/`, one `record-deck` clip covering
the two no-op presses. Read-only `Runtime.evaluate` — it changes nothing on device.

**Part 3 (any fix)** — gated on the probe. When a track ships:

- `npm test`, `npx tsc --noEmit`, `npm run build` green (CLAUDE.md: any failure is a regression).
- **TAB-SWITCH-01** on device, all five runs.
- **QAM-BAZZITE-01** and **D-PAD-SCROLL-01** re-run for T2/T3 — they own the same measurement
  chain.
- Before/after screenshots for T1, since it changes strip appearance.
- One refactor per commit: probe → T1 → T2 → T3, tests green between.