# Design language

The rules behind bonsAI's layout decisions. [design-tokens.md](design-tokens.md) says *what the
values are*; this file says *why*, and what to do when a new surface has to make the call.

Every rule here was paid for by a bug. Each one cites the specific failure that produced it, so a
future reader can judge whether the rule still applies rather than obeying it on faith. If a rule
disagrees with the code, the code is right and this file is a bug.

Written 2026-08-16, after the *Unified input + Ask bar no longer span QAM width* bug took four
passes to close — three of them wrong because they were reasoned from screenshots instead of
measured on device.

---

## The space we are designing for

Measured on device 2026-08-16 with
[scripts/probe_deck_ask_row_width.py](../scripts/probe_deck_ask_row_width.py), Deck output at
1080p (`devicePixelRatio` 1.28, UI scale profile `desktop`, `--bonsai-ui-scale: 1`):

| Surface | CSS px | Notes |
|---|---|---|
| QAM browser viewport | 855 × 766 | The whole QuickAccess CEF view, most of it not ours |
| `.bonsai-scope` | **300 × 752** | The plugin column — everything except `showModal()` lives here |
| `_TabContentsScroll` body | **300 × 667** | The scrolling area; the other ~85px is the LB/RB tab strip |

**300 px.** That is the entire horizontal budget. It is the number every rule below is arguing
about.

> `design-tokens.md` has long said the column is "roughly 400 × 800". That is **not** what this
> configuration measures. Treat 300 × 752 as the number for a docked/streamed 1080p Deck and
> re-measure before trusting either figure on handheld — the one-liner is at the bottom of Rule 6.
> Designing against 400 when you have 300 makes every layout 25% too optimistic.

---

## Rule 1 — Use every pixel of the column. A gutter is a bug until proven otherwise.

**The QAM column is 300 px wide. There is no room for decorative margin.** A 16px gutter on each
side costs 32px — **10.7% of every row on screen**, permanently, on every tab. Horizontal space is
the scarcest resource this plugin has, and unlike vertical space the user cannot scroll to get more
of it.

The default for a content row is therefore **edge to edge**: it carries
[`.bonsai-full-bleed-row`](../src/styles/sections/section-4.ts), and nothing between it and the
scroll column adds horizontal padding. Anything narrower needs a reason you could defend out loud.

### The example this rule exists for

*Unified input + Ask bar no longer span QAM width* — [roadmap.md § Bugs](roadmap.md#bugs), closed by
commit **`0fcaf00`**.

Preset chips, the Ask textarea and the ASK button all sat ~16px short of the panel on both sides.
Four passes:

| Pass | Change | Result |
|---|---|---|
| 1 | Zeroed every inset bonsAI owned — `BONSAI_PLUGIN_SIDE_PAD_PX` 4 → 0, explicit `padding: 0` on `.bonsai-scope` and `.decky-qam-scope` | Chips moved. Textarea and Ask bar did not. |
| 2 | Replaced the Ask row's measured-px width with `width: 100%`; forced Decky's `TextField` wrapper to fill the glass card | Both moved a little. Gutter remained. |
| 3 | `useQamPanelSideBleed` — walked ancestors above the scope clearing padding | **No-op.** Those ancestors already had zero padding. |
| 4 | **Ran the probe.** | Root cause in one run. |

The probe found what three rounds of inference had not: **Steam ships hashed class names on this
build**, so `[class*="PanelSection"]` matched **0 elements** in the QAM. Every `PanelSection` reset
in [section-3.ts](../src/styles/sections/section-3.ts) — *including the `padding-left/right: 0`
written for exactly this problem* — had been silently inert for as long as it had existed. That
element (`_3gY0aBuNR8_NPTpXIYfkby`) kept its `padding: 0 16px`, and that was the whole gutter.

The fix reaches it by structure instead of by name —
[section-4.ts:59](../src/styles/sections/section-4.ts) — so it cannot rot the next time Steam
rehashes:

```css
.bonsai-scope div:has(> .bonsai-full-bleed-row),
.bonsai-scope div:has(> div > .bonsai-full-bleed-row) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}
```

Measured before → after: the unified host and Ask row went `x=63.99 w=268.02` → `x=48 w=300`,
matching the scroll column exactly. Probe verdict **V1: `15.99px` each side → `0px`**. 32px
reclaimed, **+11.9% row width**.

**Two lessons, both cheaper to read than to repeat:** the space was lost *inside* our own subtree,
on an element our CSS was already aiming at and missing — and a rule that matches nothing looks
identical to a rule that works.

---

## Rule 2 — Bleed the container, pad the content.

Rule 1 is what stops the layout wasting space. This is what stops it looking messy.

**Containers go edge to edge. Text and controls keep their own internal inset.** Full bleed is a
property of the box, never of the glyphs inside it — text touching a panel edge reads as broken, and
that is the failure mode people reach for gutters to avoid. Reach for internal padding instead: it
costs the same pixels visually but only inside the one element that needs it, rather than on every
row in the column.

Worked example, the same input card: the host is `width: 100%` and reaches x=48…348, while the field
inside keeps `UNIFIED_TEXT_INSET_LEFT_PX` / `..._RIGHT_PX` = **8px**
([constants.ts:26-28](../src/features/unified-input/constants.ts)). The card is flush; the typed
text is not jammed against the panel.

**Corollary:** when a row looks too tight after going full-bleed, add padding *inside* it. Never
re-add margin to its container — that is Rule 1 being undone one row at a time.

---

## Rule 3 — Every row in a column shares one left edge and one right edge.

A column where some rows bleed and others do not reads as a rendering fault, not as hierarchy.
Alignment is doing more work for perceived quality here than any individual row's width.

This is directly testable, which is the point: in the probe output every row's `x` and `right` must
match the scroll column's. In the fixed build, `unifiedHost`, `askBleedWrap` and `askbarMerged` all
report `x=48 right=348 w=300` — three different components, one edge.

If a row genuinely must be inset (a nested card, an indented sub-item), inset it **visibly and by a
token**, not by a stray 16px that reads as an accident.

---

## Rule 4 — Width comes from CSS. Never from a measurement.

**Siblings in one column with `width: 100%` are equal by construction.** No sample to go stale, no
correction to compound, no ordering dependency. Reach for JS geometry only for something CSS cannot
express, and say in a comment what that is.

The Ask row used to take a measured pixel snapshot — `--bonsai-askbar-outer-width`, set from the
host's width, plus a `--bonsai-ask-margin-left` correction. That made it the one row that could not
track the panel: any sample taken mid-carousel, at first paint, or before a padding change settled
froze it narrower than its neighbours. It even froze *narrower than the fix that had just widened
everything else*, which is what made the Ask bar the last visible offender in pass 2 above.

Both vars and both tuning constants (`ASK_BAR_ROW_WIDTH_EXTRA_PX`, `ASK_BAR_LAYOUT_SHIFT_RIGHT_PX`)
are gone. What survives in
[useUnifiedInputSurface.ts](../src/features/unified-input/useUnifiedInputSurface.ts) is the one
measurement CSS genuinely cannot do: where the native field's text origin is painted, so the fake
caret overlay can sit on it.

**Smell test:** if you are writing a px width into a CSS var, ask what happens when that sample is
taken one frame early. If the answer is "the row is wrong until something re-triggers it", use CSS.

---

## Rule 5 — Never target Steam or Decky by class name.

`[class*="PanelSection"]` matches **0 elements** in the QAM on the shipping Deck build. So does
`.decky-qam-scope`. Steam hashes these names and they change between builds. `_TabContentsScroll`
survives as a literal substring, which is exactly why its reset worked and masked the fact that its
neighbours in the same rule did not.

In priority order:

1. **Our own class or `data-` attribute** — `.bonsai-full-bleed-row`, `[data-bonsai-tab-panel]`. We
   control these; they cannot rot.
2. **Structure relative to something of ours** — `div:has(> .bonsai-full-bleed-row)`. `:has()` is
   verified supported on the Deck's CEF (2026-08-16, same probe run).
3. **A Steam class name** — last resort, and only after a probe run proves it matches. Write the
   match count and the date in a comment beside it.

A dead selector is worse than a missing one: it silently grants false confidence, and everyone who
reads the file afterwards assumes the case is handled. The known-dead ones are flagged in
[section-3.ts:12](../src/styles/sections/section-3.ts) — several rules there beyond padding
(`overflow-wrap`, `min-width`, `padding-top`) are equally inert and have not been re-homed.

---

## Rule 6 — Measure on device before changing layout.

A screenshot shows *that* space is wasted. It cannot show *which element* is wasting it, and the
candidates need opposite fixes. Three passes of careful reasoning from screenshots moved the content
about 3px and produced one change that did nothing at all; one probe run found the cause outright.

Layout on this surface is not inspectable any other way. jsdom has no layout engine, so vitest can
never assert it. The preview suite does not cover row geometry. Plugin JS runs in `SharedJSContext`,
whose `document` contains none of our markup — so `bonsaiDebugLog` cannot see it either. CDP against
the QuickAccess target is the only honest instrument.

```bash
ssh deck@<DECK_IP> 'python3 -' < scripts/probe_deck_ask_row_width.py
```

Read **V0** for ancestor insets and **V1** for the row-vs-column gap; `--watch` catches geometry that
only goes wrong after a tab switch. It is read-only. Note that PowerShell rejects `<` redirection —
use Git Bash.

**Corollary — report the measurement, not the impression.** "V1: 15.99px → 0px, 32px reclaimed"
survives review. "Looks better" does not, and cost three rounds here.

---

## Rule 7 — Vertical space is scarcer than it looks; spend it on content.

The column is 752px tall but the scrolling body is **667px** — the LB/RB tab strip takes ~85px
before any content renders, and the Ask input plus Ask button take ~107px more whenever the Main tab
is open. Roughly a quarter of the column is chrome before a single answer token appears.

So: **no new persistent chrome rows without removing one.** Status, context and transparency
information belongs in progressive disclosure (*Show details*, the chip ladder) rather than a
permanent band. This is why the context line is one italic row and not a panel.

Unlike width, the user *can* scroll for more height — which is exactly why it is tempting to spend
it and why the limit has to be deliberate.

---

## Rule 8 — A control that cannot be reached does not exist.

Every new Settings or QAM control needs a focus-graph entry **before** it is written —
`AGENTS.md (Decky focus graph)`. This is not a new rule; it is listed here because it is the
one most often skipped when a layout change adds an element, and because a D-pad dead end is
invisible in a screenshot for exactly the same reason a 16px gutter's cause is.

Related standing bugs: **PICKER-FOCUS-01**, **ASK-WIDTH-01** and the focus rows in
[testing-manual.md](testing-manual.md).

---

## Applying these to a new surface

1. Full-bleed row by default (**R1**), internal padding for its text (**R2**).
2. Same edges as every sibling (**R3**).
3. `width: 100%` — reach for a measurement only if you can name what CSS cannot do (**R4**).
4. Selectors on our own classes or on structure; never a Steam class name unless a probe proves it
   matches (**R5**).
5. Focus-graph entry before the control exists (**R8**).
6. Deploy, run the probe, paste the numbers into the PR or the testing doc (**R6**).
