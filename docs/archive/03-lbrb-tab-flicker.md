# 03 — LB/RB tab-switch flicker when scrolled (root-cause recon)

> **Superseded — read this before acting on anything below.** The bug is **fixed
> and confirmed on device**: the flicker itself 2026-08-07, and the stale
> `ResizeObserver` found alongside it 2026-08-08 ([roadmap § Bugs](../roadmap.md#bugs)).
>
> **Sections 1–8 are superseded.** They were written 2026-08-03 from static
> reading with no on-Deck run behind them, and the device work falsified them:
> H1 was disproved outright and the surviving suspects were each measured *not*
> to fire. Their `file:line` citations are stale as well — `src/index.tsx` was
> 1709 lines when § 1 was written.
> [§ 9](#9-corrections--2026-08-07) records the corrections and **stands**;
> [§ 10](#10-resolution--2026-08-07) records the measured root cause and the fix.
>
> The probe-first plan that drove the device work is
> [tab_flicker.md](tab_flicker.md).
>
> This file is kept as the recon record. **Why it was wrong is the useful part** —
> it is the in-tree case for probing before ranking hypotheses off static reading.

Status: **analysis only (2026-08-03), superseded by §§ 9–10.** Discovery locked
2026-07-29 (`docs/roadmap.md` [§ Bugs](../roadmap.md#bugs)).
Written from static reading of `src/` + `node_modules/@decky/ui`.
No on-Deck run backs §§ 1–8; every claim there is either a `file:line` citation
or marked **UNKNOWN**.

Bug text: *"Switching tabs with shoulder buttons while focus is deep in a scrolled
panel (not on tab icons) flashes/jitters."*

---

## 1. Facts the code establishes

| # | Fact | Evidence |
|---|---|---|
| F1 | `Tabs` is **Steam's own component**, located at runtime by webpack export sniffing. There is no Decky-side implementation to read or patch. | [Tabs.js:1-3](../../node_modules/@decky/ui/dist/components/Tabs.js) — `findModuleByExport(e => e…includes(".TabRowTabs") && …includes("activeTab:"))` |
| F2 | bonsAI passes `autoFocusContents: false` as an untyped prop escape-hatch — it is not in the `@decky/ui` type surface. | [src/index.tsx:1650](../../src/index.tsx) |
| F3 | Switching tabs **unmounts the outgoing tab subtree**, and the unmount lands *after* the `currentTab` effect frame. | [useUnifiedInputSurface.ts:140-142](../../src/features/unified-input/useUnifiedInputSurface.ts) — *"one frame with missing vars made the Ask row jump to CSS fallbacks **before MainTab unmounted**"* |
| F4 | The carousel applies **transforms during the switch**, and geometry read mid-transition is garbage. | [useUnifiedInputSurface.ts:53](../../src/features/unified-input/useUnifiedInputSurface.ts) *"Mid-carousel / first-paint widths are bogus and cause a visible Ask-row snap (tab switch)"*; [:105-107](../../src/features/unified-input/useUnifiedInputSurface.ts) *"carousel transforms … caused visible horizontal jumps"* |
| F5 | A **double-rAF deferral on tab change already exists** for one surface (Ask bar) and is documented as the fix for tab-switch flash. | [useUnifiedInputSurface.ts:119-135](../../src/features/unified-input/useUnifiedInputSurface.ts) |
| F6 | Content-pane motion is already suppressed on `TabContentsScroll` **and its direct child only**. Strip transitions are deliberately preserved. | [section-3.ts:72-80](../../src/styles/sections/section-3.ts); [section-1.ts:13](../../src/styles/sections/section-1.ts) *"do not kill transitions — Steam's tab carousel uses them to slide"* |
| F7 | The active tab chip has **two visually very different states keyed on `:focus-within`**: dim 1px ring (focus in body) vs bright 2px ring + 36px glow (focus on strip). | [section-1.ts:166-187](../../src/styles/sections/section-1.ts) |
| F8 | Icon colour/`drop-shadow` has the same dim/bright split on the same selector pair. | [section-1.ts:221-244](../../src/styles/sections/section-1.ts) |
| F9 | **Nothing in `src/` resets scroll on tab change.** Every `scrollTop` write is D-pad, stream-pin, or modal driven. | grep: `useStreamScrollPin.ts:49`, `answerBubbleNavigation.ts:117,137`, `chatPanelScroll.ts:97`, `settingsPanelScroll.ts:15` — none keyed on `currentTab` |
| F10 | The three layout hooks **do not re-run on tab change**. Both are `useLayoutEffect(…, [scopeRef])` — mount once; thereafter driven by `pointerenter`/`pointermove` and `ResizeObserver`. | [useQamPanelHeightGuard.ts:80,132-137](../../src/hooks/useQamPanelHeightGuard.ts); [useTabStripBodyOffset.ts:23,86-91](../../src/hooks/useTabStripBodyOffset.ts) |
| F11 | `useQamPanelHeightGuard` captures the `TabContentsScroll` node **once, at mount**, and observes that node forever. | [useQamPanelHeightGuard.ts:129-130](../../src/hooks/useQamPanelHeightGuard.ts) |
| F12 | `onTabsShowTab` does nothing layout-related — debug log, post-picker lock arithmetic, `setCurrentTab`. | [useBonsaiPluginShell.ts:111-130](../../src/hooks/useBonsaiPluginShell.ts) |
| F13 | Tab contents are `useMemo`'d elements, which prevents element re-creation but **not** unmount/remount by `Tabs`. | [src/index.tsx:1589-1632](../../src/index.tsx) |

### Explicitly ruled out by reading (do not re-investigate)

- **`useTabStripBodyOffset`'s "reserve → 0px → remeasure → reserve" thrash cannot
  cause a visible flash.** The 0px write, the forced reflow (`void
  tabContents.offsetHeight`), and the final write are all in **one synchronous
  task** ([useTabStripBodyOffset.ts:52-61](../../src/hooks/useTabStripBodyOffset.ts));
  the browser does not paint between them. It forces *layout*, not *paint*.
- **`onTabsShowTab` is not on the critical path** (F12). The post-picker lock only
  arms after a modal close ([useBonsaiPluginShell.ts:68](../../src/hooks/useBonsaiPluginShell.ts),
  750 ms window) and can only *redirect* a switch, not delay one.
- **The `key={bonsai-tabs-gen-…}` remount is not involved.** `generation` only
  increments on `applyToken` change, i.e. the Settings → UI scale **Apply**
  button ([useUiScaleProfile.ts:103-109](../../src/hooks/useUiScaleProfile.ts)).
  Pressing LB/RB does not bump it.
- **`useUnifiedInputSurface` is already tab-guarded.** Every measure path bails
  when `currentTab !== "main"`, including the ref read at
  [:40-47](../../src/features/unified-input/useUnifiedInputSurface.ts) added
  specifically to avoid tab-switch flicker. Ask-bar remeasure is not the cause of
  a *Settings → Ollama* flicker.

---

## 2. The one UNKNOWN that splits the ranking

**Does Steam's `Tabs` reuse a single `TabContentsScroll` DOM node across tabs, or
mount a fresh one per tab?** Not answerable from this repo (F1 — the component
lives in the Steam bundle).

Consequences either way:

| | Node **reused** | Node **replaced per tab** |
|---|---|---|
| scrollTop on switch | Carries over from the old tab, then gets clamped once the new (shorter) content lays out → **visible content-pane slide** | Starts at 0; no carryover |
| `useQamPanelHeightGuard` RO (F11) | Keeps working | **Silently observes a detached node after the first switch** — `--bonsai-tab-body-height` stops tracking, and section-3.ts:23-28 pins the pane to a stale px value |

Either branch is a real defect. **Probe first** — see §6, Probe P0.

---

## 3. Ranked root-cause hypotheses

### H1 ★★★ — Focus handoff on unmount, amplified by the strip's `:focus-within` ring swap *(primary)*

Mechanism, per switch:

1. Focus is on a control **inside** the outgoing tab's body, so the active chip
   matches `.Active:not(:focus-within)` → **dim** 1px ring, dim icon (F7, F8).
2. `setCurrentTab` → `Tabs` unmounts the outgoing subtree (F3). The focused
   element is destroyed; DOM focus falls to `document.body`.
3. `autoFocusContents: false` (F2) tells Steam **not** to place focus in the new
   content. Steam's gamepad-nav layer must therefore re-seek — the usual landing
   spot is the tab strip control itself.
4. The instant focus lands on the strip, the chip flips to
   `.Active:focus-within` → **bright** 2px ring + `0 0 36px 12px` glow + three
   stacked `drop-shadow`s. Transitions on that row are deliberately *not*
   suppressed (F6), so the change animates.
5. If Steam then hands focus back into the new body (or the user's next input
   does), the ring flips back down.

Why this hypothesis fits the repro better than the others: **it only fires when
focus is deep in the panel.** With focus already on the tab icons, step 1's
precondition (`:not(:focus-within)`) never holds, the ring is bright before *and*
after, and there is nothing to flash. That is precisely the conditional in the
bug report. It also explains the "tab strip" half of "flash/jitter in tab strip,
content pane, or both" — no other hypothesis touches the strip at all.

Secondary effect on the content pane: whatever Steam focuses next receives a
`.focus()`, and a `.focus()` inside an `overflow-y:auto` box scrolls that box to
reveal the target. With the pane pinned to `--bonsai-tab-body-height`
(section-3.ts:23-28) this is a real scroll jump, not a no-op.

Evidence quality: **strong for the CSS mechanism** (F7/F8 are ours and cited),
**inferred for Steam's focus-recovery behaviour** (UNKNOWN — Steam-side).

### H2 ★★★ — Remount + first-paint geometry of the incoming tab *(co-primary, content pane)*

The incoming subtree mounts fresh (F3, F13) and paints once with unsettled
geometry before our measure/settle passes correct it. This failure mode is
**documented in-repo three times over** for the Ask bar (F4, F5,
useUnifiedInputSurface.ts:53/119/140) — the same class of one-frame snap, just on
a surface nobody has guarded yet. Every non-`main` tab is currently unguarded:
there is no equivalent of the line 119-135 double-rAF deferral for Settings,
Ollama, Permissions, Developer, or About.

Distinguishing feature: H2's flash is **content-pane only** and scales with how
heavy the incoming tab is. H1's is strip-first.

### H3 ★★ — scrollTop carryover / clamp cascade

Contingent entirely on the §2 UNKNOWN. If the scroll node is reused, the new tab
inherits `scrollTop` from the old one (F9 — nothing zeroes it), then the browser
clamps it during layout of the shorter content. Two paint positions in
consecutive frames = jitter. If the node is replaced, H3 collapses to zero and is
replaced by the stale-RO defect in §2's right column, which is a *sizing* bug
rather than a flicker bug.

### H4 ★★ — Residual carousel motion outside the suppressed selectors

The anti-flicker block covers `TabContentsScroll` and `TabContentsScroll > div`
only (F6). The carousel's sliding transform lives on an **ancestor** — the tabs
host / strip row that section-1.ts:13 explicitly protects. So there *is*
unsuppressed motion by design; it is presumably the intended slide. It becomes a
flicker only where it composites against our pinned heights and `overflow:hidden`
chain ([section-1.ts:33-42](../../src/styles/sections/section-1.ts)) — plausible,
but it would fire **regardless of scroll depth**, which the repro says it does
not. Hence rank 4.

### H5 ★ — Layout-hook interaction

Weakest. F10 says none of the three hooks run on tab change; the thrash concern
is disproven above. The only live path is: a stray `pointermove` (gamescope
synthesizes some; a trackpad touch generates them) coinciding with a switch, which
would run `applyLock()`/`apply()` against mid-carousel geometry (F4). Real but
narrow, and it would make the bug intermittent rather than reproducible on demand.

**Ranking: H1 ≈ H2 > H3 > H4 > H5.** H1 and H2 are almost certainly *both*
present — they explain different halves of the reported symptom.

---

## 4. Architectural gap

`Tabs` is Steam's, resolved by export sniffing (F1), so **every** Decky plugin
gets identical carousel, unmount, and focus behaviour. No survey of other plugins
was performed (offline; not investigated). The gap is therefore not "bonsAI uses
Tabs wrong" — it is that bonsAI is unusually demanding of it:

1. **Long scrollable tabs.** Most Decky plugins render one short panel per tab.
   bonsAI has multiple tabs whose content exceeds the QAM viewport by several
   screens, so "scrolled deep" is the *normal* state, not an edge case.
2. **Focus lives in the body, not on the strip.** The dim/bright ring pair (F7)
   only exists because bonsAI needed to signal "focus is in the panel". That
   affordance is what makes the transition visible.
3. **A hand-built layout compensation stack.** Three hooks pin the QAM host
   height, reserve strip space, and pin the scroll viewport
   (`useQamPanelHeightGuard`, `useTabStripBodyOffset`, `syncTabBodyViewportHeight`).
   Steam's own tab content does none of this, so Steam has no reason to make the
   transition safe for it.
4. **Session survival across unmount.** `useBonsaiPluginShell` +
   `bonsaiSessionSurvival` + the two `*TabLocalSurvival` modules already exist
   because modal close unmounts everything. **Tab switch is the same unmount
   event** and currently has no equivalent snapshot — the existing survival
   machinery is scoped to modals only
   ([useBonsaiPluginShell.ts:26-33](../../src/hooks/useBonsaiPluginShell.ts)).

The missing pattern is therefore: **a tab-transition lifecycle** — a "switch in
flight" signal that (a) snapshots per-tab UI state, (b) suppresses measurement
and focus churn for the duration, (c) restores after the incoming tab's first
committed paint. bonsAI already has (b) for exactly one surface (F5); the gap is
that it was solved locally instead of as shell infrastructure.

---

## 5. Fix tracks

Effort ★ = small/localized, ★★★ = multi-file with on-device iteration.

### Track A — CSS / carousel suppression

Extend F6's suppression, and neutralize the ring swap during a switch by adding a
scope class (e.g. `.bonsai-tab-switching`) for ~2 frames that forces the active
chip to its **bright** state regardless of `:focus-within`, so the dim→bright
flip in H1 step 4 never paints.

- Effort **★** · Regression risk **low** — additive selectors; does not touch the
  hooks that QAM-BAZZITE-01 / D-PAD-SCROLL-01 depend on.
- Caveat: needs a JS-set class, so it is not purely CSS. Suppressing the ancestor
  transform instead is *not* advised — section-1.ts:13 warns that killing strip
  transitions breaks the carousel slide.
- Testable in preview? **Partly** — the class toggle is; the perceived flicker is
  not.
- Addresses: H1 (strip half). Does nothing for H2/H3.

### Track B — Per-tab scroll preservation *(optional UX, full design below)*

Not a flicker fix. Ships as a complementary improvement: returning to Settings
should land where you left it.

**Design.**

1. **Storage.** Module-level `Map<string, number>` in a new
   `src/utils/tabScrollSurvival.ts`, mirroring the existing
   `createTabLocalSurvival` shape used by
   [settingsTabLocalSurvival.ts](../../src/utils/settingsTabLocalSurvival.ts).
   Module scope, not React state — it must outlive the unmount (same reasoning as
   `__bonsaiTabRestoreAfterModal`, useBonsaiPluginShell.ts:26).
2. **Capture.** In `onTabsShowTab`
   ([useBonsaiPluginShell.ts:111](../../src/hooks/useBonsaiPluginShell.ts)),
   **before** `setCurrentTab`, read the live pane via
   `document.querySelector('.bonsai-scope .bonsai-decky-tabs-root [class*="TabContentsScroll"]')`
   and store `scrollTop` under the **outgoing** tab id. `onTabsShowTab` receives
   only the *incoming* id, so the hook must also keep a `prevTabRef`. Capturing
   here is safe: it runs before React commits, so the outgoing DOM still exists.
3. **Restore.** `useLayoutEffect` on `currentTab` in `index.tsx`, deferred by
   **double rAF** — reuse the exact pattern at
   [useUnifiedInputSurface.ts:120-135](../../src/features/unified-input/useUnifiedInputSurface.ts),
   which is in-repo prior art for "wait for the carousel to settle". A single
   rAF is not enough per F4. Guard the write: skip if the saved value exceeds
   `panelScrollMax()` ([chatPanelScroll.ts:55](../../src/utils/chatPanelScroll.ts)).
4. **Unmount vs keep-alive.** F3 says the outgoing subtree unmounts, so a
   `display:none` keep-alive is **not** available without replacing `Tabs`
   (that is Track D). Snapshot-in-a-ref-map is the only option compatible with
   the current structure.
5. **Focus snapshot: no.** Storing a focus target means storing a DOM node
   (dead after unmount) or a selector (brittle against the focus-graph rules in
   `.cursor/rules/decky-focus-graph.mdc`). Scroll only. Revisit only if H1's fix
   proves insufficient.
6. **UI-scale remount.** `generation` bump remounts the whole tabs root
   ([index.tsx:1645](../../src/index.tsx)) and legitimately invalidates pixel
   offsets — **clear the map** when `uiScale.generation` changes.
7. **Modal survival.** `finalizeShowModalAndRestoreActiveTab` sets the tab twice,
   80 ms apart ([useBonsaiPluginShell.ts:77-82](../../src/hooks/useBonsaiPluginShell.ts)).
   The restore must be idempotent and must not fight the second write — key the
   restore on tab id and allow it to re-run.
- Effort **★★** · Regression risk **low-moderate** — new writes to `scrollTop`
  land in the same container D-PAD-SCROLL-01 governs; a bad restore reintroduces
  "can't reach the bottom". Needs a D-PAD-SCROLL-01 re-run.
- Testable in preview? **Yes** for capture/restore/clear logic (vitest + the
  `fakeDeckyUi` `Tabs` stub at
  [fakeDeckyUi.tsx:33-53](../../src/test-harness/fakeDeckyUi.tsx) already models
  active-tab-only rendering). Not for the visual outcome.
- UX benefit even if flicker persists: **yes, meaningful** — deep Settings/Ollama
  panels currently lose position on every LB/RB press.

### Track C — Defer the layout hooks during transition

Gate `applyLock()`, `apply()`, and `syncTabBodyViewportHeight` behind a
"switch in flight" flag for ~2 frames.

- Effort **★★** · Regression risk **moderate-high** — these hooks *are*
  QAM-BAZZITE-01 and D-PAD-SCROLL-01. Suppressing them at the wrong moment
  reintroduces the ~80px collapse or `tabMax: 0`.
- Per F10 they don't run on tab change anyway, so this fixes only the narrow H5
  path. **Poor effort-to-value ratio; do not lead with this.**
- One piece *is* worth doing independently of the flicker: **re-observe
  `TabContentsScroll` when the node changes** (F11 / §2), via a small
  `MutationObserver` or by re-running the observer on `currentTab`. That is a
  correctness fix, not a flicker fix.

### Track D — Structural (own the tab state / custom strip)

Replace `<Tabs>` with a bonsAI strip + a persistent scroll body, keeping all tab
panels mounted and toggling visibility.

- Effort **★★★** · Regression risk **high** — rebuilds the exact surface
  QAM-BAZZITE-01, D-PAD-SCROLL-01, and every `.bonsai-decky-tabs-root` selector
  in section-1/section-3 were tuned against, plus LB/RB binding, which is
  Steam-owned. Losing native shoulder-button routing would be a far worse
  regression than the flicker.
- Would eliminate H1, H2, H3 outright and make Track B trivial.
- **Not recommended now.** Record as the escalation path if A+B fail on-Deck.

---

## 6. Recommendation

**Primary: Track A**, scoped to H1 — a short-lived `.bonsai-tab-switching` scope
class set in `onTabsShowTab` and cleared after a double rAF, which pins the active
chip's ring/icon to the bright state and suppresses its transition for the
duration. Cheapest thing that addresses the highest-ranked hypothesis, touches
nothing the two prior fixes depend on, and the same flag is the hook Track C
would later need.

**Fallback: Track A + the H2 half** — extend the same in-flight flag to hold the
incoming pane at `visibility: hidden` (not `display:none`, which would destroy
the layout measurement) for one frame so its unsettled first paint never reaches
the screen. This is the generalization of F5 from the Ask bar to all tabs.

**Ship Track B alongside**, as an independent commit — it is a real UX win on its
own merits and is the only track with meaningful preview-level test coverage.
Per refactor rule 1, three separate commits: A, then B, then any C follow-up.

**Before any of it, run Probe P0** — the §2 UNKNOWN changes whether H3 exists at
all and whether F11 is silently broken today.

---

## 7. Verification plan

### Probes (on-Deck, before writing a fix)

- **P0 — scroll-node identity.** With the Developer tab / debug HUD open, record
  the `TabContentsScroll` element identity and `scrollTop` across one switch.
  Cheapest form: extend the existing `bonsaiDebugLog` call in `onTabsShowTab`
  ([useBonsaiPluginShell.ts:112](../../src/hooks/useBonsaiPluginShell.ts), already
  tagged `H3`) to also log `scrollTop`, `scrollHeight`, `clientHeight`, and a
  monotonic id stamped on the node via a data attribute. Read back through the
  ring buffer (`readBonsaiDebugRing`,
  [bonsaiDebugIngest.ts:57](../../src/utils/bonsaiDebugIngest.ts)) or the reverse
  tunnel (`scripts/reverse-tunnel-deck-ingest.ps1`).
- **P1 — where focus lands.** Log `document.activeElement` tag + class at switch
  time, at +1 rAF, and at +2 rAF. Confirms or kills H1 steps 3-4 directly.

### Repro matrix

| # | Tab (from → to) | Scroll depth | Session | Dev tab | Expect |
|---|---|---|---|---|---|
| 1 | Settings → Ollama | `scrollTop > 0`, mid-panel | Gaming Mode | off | Flicker (baseline) |
| 2 | Settings → Ollama | `scrollTop == 0` | Gaming Mode | off | **No** flicker — controls H1 |
| 3 | Ollama → Settings | deep, focus on last control | Gaming Mode | off | Flicker |
| 4 | Settings → Ollama | deep, focus **on tab icons** | Gaming Mode | off | **No** flicker — the stated conditional |
| 5 | as #1 | deep | **BPM** | off | Confirms not Gaming-Mode-only |
| 6 | Settings → Developer → About | deep | Gaming Mode | **on** | 6-tab strip; longest carousel travel |
| 7 | Main (long transcript) → Settings | deep | Gaming Mode | off | Isolates the already-guarded Ask-bar path |
| 8 | as #1, after Settings → UI scale **Apply** | deep | Gaming Mode | off | `generation` remount interaction |

Rows 2 and 4 are the important ones: if either flickers, H1 is wrong and the
ranking must be revised toward H4.

### Evidence capture

- **`scripts/record-deck.ps1` (VP8, default 15 s) is the right tool** — flicker is
  a 1-3 frame event, and only video shows it. Screenshot diffing will not catch
  it reliably; the frame you capture is unlikely to be the bad one.
- Suggested protocol: record one 15 s clip covering rows 1→2→4 back to back, then
  step frames to confirm before/after. Store under `docs/test-evidence/`.
- Preview suite (`npm run test:preview`) can cover Track B's map logic and the
  presence/absence of the `.bonsai-tab-switching` class, **not** the visual
  outcome.

### Manual-test row (missing today)

`docs/testing-manual.md` has no tab-switch row —
`grep` finds only `SMOKE-A` covering "Shell, tabs" generically
([testing-manual.md:39](../testing-manual.md)) and D-PAD-SCROLL-02
([:135](../testing-manual.md)). Add under the **D-pad scroll** block
([:115](../testing-manual.md)):

```markdown
- [ ] **TAB-SWITCH-01** LB/RB from a deep-scrolled Settings/Ollama panel: no
      flash or jitter in the tab strip or content pane; repeat with focus parked
      on the tab icons (must also be clean) — [planning](03-lbrb-tab-flicker.md)
```

And a coverage line in `docs/testing.md` alongside the D-pad scroll row
([testing.md:69](../testing.md)).

---

## 8. Already solved — do not re-litigate

| Prior fix | What it solved | What it did **not** solve |
|---|---|---|
| **QAM-BAZZITE-01** (2026-07-08) | `.bonsai-scope` collapsing to ~80px; body painting over LB/RB icons; thin-strip-until-pointer-entry at mount. Rejected during that work: RO on scroll *content* (runaway height); inner-wrapper flex-column + 40px `DialogButton` widths (stacked the carousel vertically). | Anything about the *transition* between tabs. It is a steady-state sizing fix. |
| **D-PAD-SCROLL-01** (2026-07-17) | `TabContentsScroll` growing with content so `scrollHeight === clientHeight` and D-pad could not reach top/bottom. Introduced `--bonsai-tab-body-height` and the durable `--bonsai-qam-lock-height` lock. | Scroll *position* semantics across a tab change — no per-tab memory, and nothing zeroes scroll on switch (F9). |
| **Ask-bar tab-switch guards** (in `useUnifiedInputSurface`) | Ask-row snap/flash when entering or leaving `main`: mid-carousel width rejection (:53), double-rAF deferral (:119-135), no CSS-var teardown on leave (:140-142), tab-ref guard on every measure (:40-47). | Only `main`. No other tab has an equivalent guard — this is the template for the H2 fallback, not a fix already in place. |
| **section-3 anti-flicker block** (:72-80) | `transition`/`animation` on `TabContentsScroll` and its direct child. | The strip row and the carousel ancestor, both deliberately left animated (section-1.ts:13). The active-chip ring swap (F7/F8) is entirely unsuppressed. |

Also settled by this pass, per §1: the reserve-thrash flash theory, `onTabsShowTab`
as a layout actor, and the `bonsai-tabs-gen` remount as a per-switch event.
Three of the five hypotheses in the original bug framing (c/d/e) reduce to a
single decidable question (§2 Probe P0) plus one strong mechanism (H1).

---

## Out of scope

D-PAD-SCROLL-02 (choppy Strategy answer scroll), MICRO-04 (live-turn graph).
No fix implemented in this pass.

---

## 9. Corrections — 2026-08-07

Sections 1–8 were written **2026-08-03 from static reading only**. Three later sources
supersede parts of them. **Read this section before acting on anything above**, and re-derive any
`file:line` before trusting it — `src/index.tsx` was 1709 lines when §1 was written and is 1314
now, so most citations in the table are off.

### 9.1 H1 is falsified, and F7/F8 with it

[audit/decky-tab-strip-classes.md](../audit/decky-tab-strip-classes.md), **measured on device
2026-08-04**: SteamOS never applies `.Active` or `.active` to the tab buttons. It marks the
active one with a build-hashed CSS-module class (`_3Gp1bACHx__POxmy6Gd3kG`) that changes with
every Steam client build.

Every rule behind H1 is keyed on `.Active` — the dim ring, the bright ring, and both
`drop-shadow` blocks. **They have never fired.** So:

- **F7 and F8 describe dead CSS.** There is no dim→bright ring swap on a tab switch, because
  there is no ring at all. The tab strip currently has **no working focus ring of its own**.
- **H1's mechanism cannot happen**, and with it the §3 ranking's top entry and the §6
  recommendation ("pin the active chip's ring to the bright state") both fall. Track A as
  written suppresses a transition that does not exist.

What *is* live on device, and is the better-founded successor to H1: the
`.gpfocuswithin:not(.Active)` rule paints `#fcfcfc` on **all six glyphs at once**, because
`:not(.Active)` is satisfied for every one of them and the `gpfocuswithin` container is a common
ancestor. Glyph colour is therefore all-six-white while Steam has that class on the ancestor and
all-six-grey the moment it does not. **This is a hypothesis, not a measurement** — see 9.4.

Two further strip rules ([section-1.ts:154-155, 190-193](../../src/styles/sections/section-1.ts))
use `:has()`, which **Deck CEF does not support**
([section-8.ts:42-43](../../src/styles/sections/section-8.ts)); an unsupported selector in a
comma-separated list drops the whole rule. They are dead for a second, independent reason. **Any
new strip CSS must avoid `:has()`.**

### 9.2 Probe P1 and Track B step 2 are no-ops on device

[audit/decky-realms.md](../audit/decky-realms.md), **measured on device 2026-08-04**: plugin JS
runs in SteamOS's `SharedJSContext`, whose `document` is a 14-element shell, while the QAM UI is
rendered into a separate popup document. From plugin code, `document.querySelector('.bonsai-…')`
is always null and `document.activeElement` is always that shell's `<body>`.

- **Probe P1** ("log `document.activeElement` at switch time") would have logged the shell body
  three times and proved nothing.
- **Track B step 2** reads the scroll pane with
  `document.querySelector('.bonsai-scope … [class*="TabContentsScroll"]')`. That returns null on
  device, so the capture would silently store nothing and the feature would look like it worked
  in preview and do nothing on the Deck.

If Track B is ever revived, the pane must come from a **ref** (`bonsaiScopeRef.current`, then an
element-scoped `.querySelector`) or from `getUiDocument()`
([uiDocument.ts](../../src/utils/uiDocument.ts)). Note also that a cross-container focus move
needs `TakeFocus` ([navFocusRegistry.ts](../../src/utils/navFocusRegistry.ts)), not `.focus()` —
which is a further reason §5's "focus snapshot: no" call was right, for a reason it did not know.

### 9.3 The bug itself was re-scoped on 2026-08-04

Per [roadmap.md § Bugs](../roadmap.md#bugs), from a fresh on-Deck pass:

- the **severe symptom is gone** — no whole-frame judder, none of the jarring effect that made
  this ★★★ (it is ★★ now);
- **focus retention across a normal LB/RB switch was confirmed working**;
- what remains is the **tab icon strip looking busy and the icons shuffling**, most reproducibly
  on **LB at the leftmost tab or RB at the rightmost** — a press that cannot change tab;
- it was **not** caused by refactor step 8; `DECKY_TAB_TITLES` was not touched.

Consequences for §7: repro rows 1–3 describe a symptom that no longer presents, and the matrix
**omits the no-op press**, which is now the important case. The `scrollTop == 0` control (row 2)
is still worth running, but as a check on whether scroll depth matters at all rather than as
H1's falsifier.

A no-op press is the sharpest clue in the whole file. `DECKY_TAB_TITLES` is a module-level const
([tabTitles.tsx:50-57](../../src/features/plugin-shell/tabTitles.tsx)) and `setCurrentTab(sameId)`
makes React bail out, so **bonsAI renders nothing at all on that press**. Anything that moves is
either Steam's own carousel or our CSS reacting to a class Steam toggled.

### 9.4 F10 is right about the effect bodies and incomplete about the pointer path

F10 is correct that the layout hooks' `useLayoutEffect` bodies do not re-run on a tab change.
But `pointerenter` / `pointermove` call `apply(SETTLE_MAX_ATTEMPTS)`
([useTabStripBodyOffset.ts:86-91](../../src/hooks/useTabStripBodyOffset.ts)), and **at that
attempt count the `stripStable` early-return at `:48-50` no longer guards** — the reserve is
measured and written even from mid-carousel geometry. The Deck's right trackpad is a mouse, so a
resting thumb generates `pointermove`. A press and a pointer event coinciding is a live path
that §3's H5 dismissed as "narrow".

### 9.5 What is measured and what is still guesswork

**Measured:** `.Active` never matches (9.1); the realm split (9.2); the re-scoped symptom (9.3).

**Not measured — every mechanism for the remaining symptom.** The colour-churn story in 9.1 is
inferred from CSS plus a measurement taken for a different purpose; `decky-realms.md` observed
`gpfocus` vanishing after a *programmatic cross-container `focus()`*, which is **not** the same
event as a shoulder press. Whether "shuffle" is movement, repaint order, colour, or Steam's
carousel is unknown, and the negative `TAB_TITLE_TAB_GAP_PX = -6`
([constants.ts:94](../../src/features/unified-input/constants.ts)) means the 40px chips overlap
their neighbours by 6px per side, so a stacking-order change could read as movement without
anything moving.

**Next step is a probe, not another fix attempt:** `scripts/probe_deck_tab_switch.py` samples
every frame across a press and reports which of those changed. Its output maps to the fix tracks
T1–T4 in the 2026-08-07 plan. On-Deck row: **TAB-SWITCH-01**
([testing-manual.md](../testing-manual.md)).

---

## 10. Resolution — 2026-08-07

**Fixed and confirmed on device.** Everything below is measured via
`scripts/probe_deck_tab_switch.py` and a scroll-axis probe against the QuickAccess CDP target.
Sections 1–8 are superseded; § 9's corrections stand.

### 10.1 The mechanism

On an **RB** press:

1. The tabs-root child (`.bonsai-decky-tabs-root > .Panel`) has its `scrollWidth` transiently
   inflated — **300 → 420** — while the outgoing tab is still mounted.
2. Steam scrolls it right (`scrollLeft` 0 → **88.28** in one frame) to reveal the incoming tab.
3. The outgoing content unmounts, `scrollWidth` collapses 420 → 301, and the browser **clamps
   `scrollLeft` down frame by frame** as the maximum shrinks.

Captured, with `clientWidth` 300 throughout:

| ms | scrollLeft | scrollWidth | max (`sw - cw`) |
|---|---|---|---|
| 16999 | 0 | 420 | 120 |
| 17028 | **88.28** | 420 | 120 |
| 17111 | 87.5 | 388 | 88 |
| 17126 | 71.88 | 372 | 72 |
| 17151 | 49.22 | 349 | 49 |
| 17368 | 0.78 | 301 | 1 |

`scrollLeft` equals `scrollWidth - clientWidth` on **every** frame. This is not an animation; it
is a clamp. Net displacement is **zero** — the strip ends exactly where it started, which is why
it reads as a flicker rather than as motion.

**LB never reproduced it.** Scrolling toward 0 is valid at any `scrollWidth`, so only the
rightward direction depends on the width that is about to vanish. That asymmetry — reported by
the maintainer before it was explained — is what located the mechanism.

### 10.2 The fix

`overflow: clip` instead of `overflow: hidden` on the tabs root and its direct children
([section-1.ts](../../src/styles/sections/section-1.ts)).

- **`hidden` is not enough.** A `hidden` box is still a scroll container and is still scrollable
  *programmatically*. Measured directly, with 900px of forced overflow: `scrollLeft` accepted
  **119.53** under `hidden` and **0** under `clip`.
- **Both axes must say `clip`.** Per spec, `clip` on one axis computes to `hidden` when the other
  axis is `hidden`. The pre-existing `overflow-x: clip` on the tabs root had therefore **never
  taken effect** — it read back as `hidden/hidden` on device. This is a trap worth remembering:
  the declaration looks right in the source and is silently downgraded.
- **Nothing legitimate is lost.** That element measures `scrollWidth == clientWidth == 300` at
  rest, so it has no scroll range to give up. The carousel's real horizontal scrolling happens on
  a deeper Steam element (`_1CJeU7…`, `sw` 362 / `cw` 188), which this rule does not touch.

Deck CEF supports it: `CSS.supports('overflow','clip')` is true and the shorthand computed to
`clip/clip` on device.

**Post-fix verification.** Across the same 420 → 302 collapse, `scrollLeft` stayed pinned at **0**
and the strip's `x` held constant at 141.92 — while the depth-3 carousel still eased smoothly
(0 → 0.78 → 1.56 → 4.69 → 9.38 → 14.84), so the intended slide is preserved.

### 10.3 What was measured *not* to be the cause

Across five captured transitions, none of these ever fired — each was a candidate in §§ 3/5 or in
the T1–T4 plan:

- **Glyph colour churn (T1).** The active-tab colour swap is clean and single-frame, synchronised
  with the `data-bonsai-active-tab` change. No dim/bright flip, no all-six-white flash.
- **Steam focus-class churn.** `gpfocuswithin` did not drop during any switch. The § 9.1
  colour-churn story was a plausible inference and is now retired.
- **Layout-hook re-measure (T3).** `--bonsai-tab-strip-reserve` and `--bonsai-tab-body-height`
  never changed across a press (hands off the trackpad — the pointer path in § 9.4 remains
  untested, not disproven).
- **Ancestor `transform` (T2).** Never changed; the motion was scroll, not transform. This is why
  the first sampler, which watched transforms and glyph rects, could see *that* something moved
  but not *what* moved it.

### 10.4 Corrections to the discovery framing

- **The "no-op press" is not a no-op.** Steam's `Tabs` **wraps around**: RB on the rightmost tab
  switches to the leftmost. `data-bonsai-active-tab` went `about → main`, and the strip traversed
  its full width (~425px in ~250ms) — the *longest* travel of any press, not the shortest. Every
  §7 repro row built on "a press that cannot change tab" was testing something that does not
  exist.
- **Scroll depth was never the variable; press direction was.** The bug title says "when
  scrolled". It reproduces on RB regardless.

### 10.5 Left open

`TabContentsScroll` is **replaced on every tab switch** — node identity changed on all five
transitions (ids 4→5→6→7→8). This answers § 2's UNKNOWN in favour of the "replaced per tab"
column, which means [useQamPanelHeightGuard](../../src/hooks/useQamPanelHeightGuard.ts) — which
captures that node once at mount — has been observing a detached element since the first tab
change of any session. Correctness bug, independent of the flicker, **not fixed here**.
