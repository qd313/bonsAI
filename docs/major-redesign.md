# Major redesign — named chat slots + Main-tab inversion

Captured 2026-08-09 from the Claude Design project
[Named chat slots](https://claude.ai/design/p/01f22010-2448-4be9-89ad-209c25aa3b77?file=Named+chat+slots.dc.html).
Companion to [design-tokens.md](design-tokens.md) (the visual language the mockup
was drawn against) and
[planning/07-named-chat-slots-postmortem.md](planning/07-named-chat-slots-postmortem.md)
(why v1 of this feature was pulled after six hours).

This document does not implement anything. Scope is: what the mockup specifies,
where it disagrees with the code and with the postmortem, what it does not draw,
and a phased path.

**Source files read.** `Named chat slots.dc.html` (194 KB, three design turns,
eight options) and `support.js`. `support.js` is the generated `dc-runtime`
bundle — a React renderer for the `<x-dc>` canvas format. It carries **no product
code and no tokens**; nobody needs to read it again.

---

## 0. The headline

The mockup is **option C from the postmortem** — the LB/RB slot carousel — which
[§ 3 of that document rejected outright](planning/07-named-chat-slots-postmortem.md).
It also puts a permanent slot row on Main, against the postmortem's rule 10
(*zero new always-present Main focus stops*).

That is not automatically wrong. The postmortem rejected C on two grounds —
bumpers are contended, and there is nowhere to show which slot you are on — and
the mockup answers the second one directly: the slot row **is** the indicator.
The first ground stands and is the single largest feasibility risk in the design
(§ 4.1).

Everything else in the mockup is either measured correctly from this repo or an
independent layout change that happens to be drawn alongside slots (§ 4.4).

---

## 1. What the mockup contains

Three turns, newest first. Turn 3 is the converged direction.

| Option | What it shows | Status |
|---|---|---|
| **1a** | Main tab today, recreated from source — no slots | Baseline, accurate |
| 1b | Theatrical spotlight: full-frame dim, neighbour slot names, `14 turns · last asked 2 days ago`, hint line | Superseded by 1c |
| **1c** | Restrained inline band: `‹ Elden Ring build ›`, dots, hint line. Transcript stays legible | Basis for 2a/3 |
| 1d | Stress test at 23 slots: numeric `12 / 23` counter replaces dots past ~8, hold-RB-to-jump-5, 3 pinned, honest warning line | Informs § 4.3 |
| **2a** | 1c plus the real tab strip, **and the Main-tab layout inversion** | See § 2.3 |
| 2b | Seven tab-strip treatments at real size (a–g) | Menu of choices, § 2.1 |
| **3a** | Converged: micro labels + filled active + wide active tab; slot row **unfocused** | Ship target |
| **3b** | Same, slot row **focused** (LB/RB taken over) | Ship target |

The 2b treatments: **a** today (outline glyphs, green ring + glow on active) ·
**b** filled active · **c** neutral raised pill · **d** 2px underline ·
**e** micro labels (7px caps, costs 6px height) · **f** slot-count badge on the
Main tab · **g** a sixth **Chats** tab. The mockup's own note on **g**: it "is the
only option that removes the LB/RB conflict instead of signposting it."

Turn 3 picked **e + b + a wide active cell**.

---

## 2. Measured spec

All values below are read from the mockup markup, at the 400 × 800 QAM column.

### 2.1 Tab strip

The mockup's stated strip geometry — 40px cells, −6px gap, 44px min-height — is
**exactly** what `.bonsai-tab-title-leaf` already emits
([section-1.ts:155-170](../src/styles/sections/section-1.ts)) with
`TAB_TITLE_TAB_GAP_PX = -6` ([constants.ts:94](../src/features/unified-input/constants.ts)).
The mockup was drawn from the code, not guessed.

Changes it asks for:

| Element | Today | Mockup (3a/3b) |
|---|---|---|
| Inactive cell | 40 × 44, icon 26px | 44 × 46, icon 26px, **7px caps label below** (`main` `model` `set` `perm` `about`) |
| Active cell | 40 × 44, green ring + drop-shadow | **96 × 46**, icon and label in a **row**, icon 34px, label 9px caps |
| Active fill | ring only | `rgba(255,255,255,.10)` + `inset 0 1px 0 rgba(255,255,255,.12)`, keeps the green ring and glow |
| Inactive colour | — | `rgba(168,182,198,.62)` glyph, `rgba(168,182,198,.5)` label |
| Active colour | — | `rgba(252,252,252,1)` glyph, `rgba(252,252,252,.92)` label |

Width check: 96 + 4 × 44 = 272px of 400. With the Developer tab mounted, 316px.
Both fit.

`bonsaiTabIconTitle` ([tabTitles.tsx:39-47](../src/features/plugin-shell/tabTitles.tsx))
already takes arbitrary React children, so the label is a markup change there
plus an `.Active`-keyed width rule in `section-1.ts`. Note the standing warning in
that file at `:150-154` — a prior `:has(.bonsai-tab-title-shell)` + `width:40px`
selector matched intermediate carousel Panels and collapsed the strip. Size only
`.bonsai-tab-title-leaf`.

### 2.2 The slot row

Sits directly under the tab strip, above everything else, **always present**.
Three cells: `LB` pill · centre column · `RB` pill.

**Agreed row (2026-08-09, supersedes mockup create/delete gap):**

```
LB │  ‹ghost prev›   Elden Ring build  ×   ‹ghost next›  │ RB
                     ● ● ○ ○ ○
```

- Carousel positions: **`[+]` leftmost**, then up to 5 slots. LB from slot 1 lands on `[+]`; **A** creates and switches.
- **A** on title → rename modal. **D-pad Right** → `×` beside title → **A** → ConfirmModal delete. **Left** returns to title.
- **D-pad Down** → unified input. **Up** unwired — Steam reaches tab strip.
- Ghost neighbours: adjacent slot names, `rgba(200,214,230,0.18)`, 11px, ellipsized, non-focusable; hidden at one slot.
- Stop at ends (no wrap): RB from last slot stops; LB from `[+]` stops.

| | Unfocused (3a) | Focused (3b) |
|---|---|---|
| Row background | `transparent` | `linear-gradient(180deg, rgba(28,36,44,.92), rgba(18,26,34,.55))` |
| Row rules | 1px `rgba(255,255,255,.05)` top+bottom | 1px `rgba(156,231,255,.22)` top+bottom |
| Row padding | `8px 8px` | `12px 8px` |
| Eyebrow | none | `CHAT SLOT`, 700 9px, `.08em`, `#9ce7ff` |
| Title | 700 **12**px/1.2, `rgba(200,214,230,.72)` | 700 **19**px/1.2, `#f2f7fc`, `text-shadow: 0 0 16px rgba(156,231,255,.3)` |
| Dots | 3px `rgba(143,168,196,.3)`, active 4px `rgba(200,214,230,.5)` | same sizes, active dot `#9ce7ff` |
| LB/RB pill | 38 × 26, r8, 1px `rgba(168,182,198,.3)`, text `rgba(168,182,198,.62)`, transparent | border `rgba(156,231,255,.75)`, text `#9ce7ff`, bg `rgba(18,26,34,.55)`, `box-shadow: 0 0 12px 1px rgba(156,231,255,.25)` |
| Hint line | — | none — 1c/1d carried `LB / RB to change · down returns to Ask`; **3b deliberately drops it**, the lit pills say it instead |

Title is a single line: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.

The accent is `DECK_HIGHLIGHT_CYAN` `#9ce7ff`
([design-tokens.md § Palette](design-tokens.md)) — the existing "active control"
colour, not a new one. Focus here is **state**, not the focus ring; the white ring
([design-tokens.md § Focus rings](design-tokens.md)) still applies on top and must
not be replaced by the cyan.

### 2.3 The Main-tab layout inversion

This is a separate change that 2a and 3a/3b both assume. Top to bottom:

```
tab strip
slot row
transcript          flex: 1; min-height: 0; justify-content: flex-end   ← grows upward
preset row          one row of thirds, 30px tall, marquee on overflow
unified input       66px min, unchanged internals
ask bar             36px, anchored to the bottom edge
```

Today it is the reverse order — preset row, Ask bar, then transcript
([MainTab.tsx:143-212](../src/components/MainTab.tsx)).

Preset row specifics: **three** chips, not four; `flex: 1 1 0` thirds; 30px tall;
r4; first chip carries the KB/help green fill
(`rgba(46,135,83,.28)→rgba(18,52,34,.48)`, border `rgba(46,135,83,.65)`), the rest
`.bonsai-preset-glass`; each label is a `white-space: nowrap` span that
marquee-scrolls when it overflows its third.

### 2.4 Scale beyond ~8 slots (1d)

- Dots become a numeric `12 / 23` between `‹` `›` glyphs.
- A warning line, verbatim: *23 slots — cycling to the far end takes 11 presses.
  Hold RB to jump 5, or pin the ones you use.*
- A `3 pinned` chip above the title.
- Hint line becomes `D-pad down returns to Ask · LB/RB releases on blur`.

---

## 3. What the code does today

| Fact | Evidence |
|---|---|
| The tab strip is **Steam's own `Tabs`**, found by webpack export sniffing. There is no Decky-side implementation to patch. | [03-lbrb-tab-flicker.md § 1 F1](planning/03-lbrb-tab-flicker.md); [index.tsx:1282-1285](../src/index.tsx) |
| LB/RB tab switching is Steam's native carousel. The plugin only observes the result via `onShowTab`. | [useBonsaiPluginShell.ts:131](../src/hooks/useBonsaiPluginShell.ts); [section-3.ts:72-74](../src/styles/sections/section-3.ts) |
| Decky exposes bumpers as `GamepadButton.BUMPER_LEFT = 5` / `BUMPER_RIGHT = 6`, and `onButtonDown` fires for **every** button on a focused `Focusable`. | [FooterLegend.d.ts:8-9](../node_modules/@decky/ui/dist/components/FooterLegend.d.ts); [focusNavigation.ts:95-101](../src/utils/focusNavigation.ts) |
| Main-tab order is preset row → Ask bar → screenshot browser → transcript. | [MainTab.tsx:143-212](../src/components/MainTab.tsx) |
| **There is no chat persistence of any kind.** `bonsaiSessionSurvival` is module-level memory that survives `showModal` remounts only — *"Does not: Persist across plugin restarts"*. | [bonsaiSessionSurvival.ts:1-6](../src/utils/bonsaiSessionSurvival.ts) |
| No Python service owns conversations. `py_modules/backend/services/` has 43 modules; none is a thread/session store. | `ls py_modules/backend/services/` |
| The v1 store existed and was good. Recover with `git show 247a9c9:py_modules/backend/services/chat_threads_service.py` (494 lines, atomic writes, bounded, tested). | [07-postmortem § 0, § 4](planning/07-named-chat-slots-postmortem.md) |

So the slot row is the **cheap half**. The expensive half — a persisted store, an
RPC surface, and request→slot ownership that does not race — is the part the
mockup does not and cannot draw. That is § 6.

---

## 4. Conflicts to settle before building

### 4.1 Can LB/RB actually be taken over? — **the blocking unknown**

The design depends on a focused row consuming BUMPER_LEFT/RIGHT so they cycle
slots instead of tabs, and releasing them on blur.

What is known:

- Decky hands bumper presses to `onButtonDown` on the focused `Focusable`
  ([FooterLegend.d.ts:8-9](../node_modules/@decky/ui/dist/components/FooterLegend.d.ts)).
- `Tabs` is Steam's component, not Decky's, and is reached by export sniffing —
  there is nothing to intercept inside it
  ([03-lbrb-tab-flicker.md § 1 F1](planning/03-lbrb-tab-flicker.md)).
- **UNKNOWN:** whether the plugin's handler runs *before* Steam's tab carousel,
  and whether `preventDefault()` / `stopPropagation()` on that event suppresses
  the tab switch. Steam's handler may be attached above the plugin's subtree, in
  which case it wins and the row can never own the bumpers.
- **UNKNOWN:** whether a running game also claims the bumpers while the QAM is
  open. The postmortem asserts contention as a reason to reject option C; no
  measurement backs it either way.

This is a ~30-line device spike, not a design question: mount one `Focusable` with
an `onButtonDown` that logs `detail.button` and returns, then one that suppresses,
and watch whether the tab still switches. **Run it before any other work on this
feature.** If bumpers cannot be suppressed, the design falls back to 2b/**g** — a
sixth *Chats* tab — which needs no interception at all.

The precedent for probing before ranking hypotheses is
[03-lbrb-tab-flicker.md](planning/03-lbrb-tab-flicker.md) itself: eight sections
of static reasoning about these exact buttons were falsified by one device run.

### 4.2 One permanent Main focus stop

The slot row is always visible (3a) and must be focusable to take the bumpers, so
it is **one new always-present stop above the Ask field** — exactly the shape rule
10 of the postmortem forbids, and a smaller version of what v1's mini-list did
(six stops, § 1.9 there).

The mockup's defence is that one quiet 26px-tall row is not six chips, and it
replaces the picker rather than adding to it. The counter-argument is that D-pad
Up from the Ask field now lands on chrome instead of the transcript.

**Not a paper decision.** It needs the same on-device look the postmortem asked
for at its own P4.

### 4.3 Slot cap: unlimited vs 5

1d commits to unlimited and prices it honestly (11 presses to cross 23 slots, plus
pinning and jump-5 to soften it). The postmortem sets `MAX_THREADS` to 5 on the
grounds that a picker fits five without scrolling and that pruning is
comprehensible at 5 and mysterious at 50.

With no picker in this design, the picker-fit argument evaporates — but the press
count replaces it as the cost. **Pinning and hold-to-jump are two additional
features** drawn only in 1d; treating "unlimited" as the answer silently adopts
both.

### 4.4 The layout inversion is a separate feature

Bottom-anchoring the input, growing the transcript upward, and collapsing presets
from four chips to three marquee thirds is a large change to the busiest screen
in the plugin. It is **independent of slots** — it would be worth doing with no
slot row at all, and slots would work fine on today's order.

Shipping them together makes one unreviewable diff and breaks refactor rule 1
(*never mix a move with a rewrite*). It also entangles two different sets of
device risk: focus-graph churn on one side, `useUnifiedInputSurface` measurement
on the other.

Note the specific hazard: the Ask row already re-measures on tab change with a
double-rAF deferral because mid-carousel geometry is garbage
([03-lbrb-tab-flicker.md § 1 F4-F5](planning/03-lbrb-tab-flicker.md)). Moving that
row to the bottom of a `flex: 1` column changes what it measures against, and the
open bug *Unified input + Ask bar no longer span QAM width*
([roadmap § Bugs](roadmap.md#bugs)) is in that same code. **Fix that bug first;
re-laying out on top of a known-bad measurement will make both undiagnosable.**

### 4.5 Tab-strip treatment

Turn 3 picked micro labels + filled active + wide active. Cost: 6px of strip
height, and `about`/`perm`/`set` are abbreviations that have to survive at 7px on
a handheld. Options **b**, **c** and **d** cost nothing and are one CSS rule each.
Option **f** (slot count badge on Main) is orthogonal and works with any of them.

---

## 5. What the mockup does not draw

None of these are optional at ship time.

| Missing | Why it matters |
|---|---|
| **Creating a slot** | No affordance appears in any option. Cycling with LB/RB can only reach slots that exist. |
| **Rename** | Named in the canvas's own "try next" three times; never drawn. It is the one genuinely new control the postmortem identified (§ 3). |
| **Delete + confirm** | Same. Needs `ConfirmModal` and a return-focus target. |
| **Empty / first-run slot** | What the row and the transcript show before any Ask has ever been made. Called out as "try next" and left undrawn. |
| **Mid-Ask slot switch** | The failure that killed v1 (§ 1.1, § 1.2 of the postmortem). The design shows no in-flight state, no per-slot pending indicator, and no answer for what the transcript shows when you cycle away from a streaming reply and back. |
| **The unfocused → focused transition** | Explicitly deferred ("show the transition between 3a and 3b"). Matters because it fires on every focus change of a permanent row. |
| **Slot metadata** | 1b had `14 turns · last asked 2 days ago`; 3a/3b dropped it. With no picker, there is now **nowhere** that shows a slot's age or size. |
| **Non-active slot activity** | No unread/streaming marker on the dots. |
| **Pinning** | 1d shows a `3 pinned` chip. Pin/unpin has no control anywhere. |
| **Hold-RB-to-jump-5** | Stated in 1d's warning copy; no visual, no hold threshold, no wrap rule. |
| **Wrap behaviour** | Whether LB at slot 1 wraps to the last slot or stops. |
| **Marquee** | Preset chips marquee-scroll overflowing titles. `MainTabPresetAnimatedChips` has fade/carousel/static/stream modes; **per-chip horizontal marquee is new** and interacts with the existing preset-animation setting. |

---

## 6. Implementation path

Phases are ordered so each is independently revertable — the property v1 lacked
when 34 files landed in one commit and came out in one commit six hours later.

| Phase | Contents | Gate |
|---|---|---|
| **P-0** | **Bumper spike** (§ 4.1). Throwaway `Focusable` on Main, log `detail.button`, test suppression. Delete before merging; record the result in this file. | A written yes/no on device. Everything below assumes yes. |
| **P-0b** | Fix *Unified input + Ask bar no longer span QAM width* ([roadmap § Bugs](roadmap.md#bugs)) — prerequisite for § 4.4 only. | On-Deck |
| **P-1** | Restore `chat_threads_service.py` from `247a9c9`, minus `pending_request_id`, `set_thread_pending_request`, `find_thread_by_pending_request`, `parse_bundled_thread_title` and `strategy_checklist`. Cap per § 4.3. No UI. | `npm run test:py` + the five Python rows in [postmortem § 7](planning/07-named-chat-slots-postmortem.md) |
| **P-2** | RPC surface: `list` / `get` / `create` / `delete` / `rename`. In-memory `request_id → slot_id` map on the `Plugin` instance. **Record the user turn, then launch the background task** — ordering inverted from v1. A miss logs a fault, never returns silently. No UI. | `npm run test:py`; names must contain an existing `DOMAIN_KEYWORDS` substring or they file under `other` in the generated map ([CLAUDE.md § The TS ↔ Python boundary](../CLAUDE.md)) |
| **P-3** | `chatSlotsApi.ts` on `callDeckyWithTimeout()` — no raw `call()`, no exceptions. Turn mapper that **preserves a trailing unpaired user turn**. `useChatSlots` with a synchronously-updated active id (setter and ref in one call, never a `useEffect`). Still no UI. | `npm test`, `npx tsc --noEmit`; the four TS rows in the postmortem, two mutation-checked |
| **P-4** | The slot row, unfocused + focused (§ 2.2). Focus-graph entry per `AGENTS.md (Decky focus graph)` **before** writing the control. `activeSlotId` added to `bonsaiSessionSurvival` — id only, never turns. | Preview suite + on-Deck focus rows |
| **P-5** | Rename / delete / create / empty-state — everything in § 5 that is a control. Reuse the nested-modal survival hooks (`onBeforeNestedDeckyModal` / `onCompleteNestedDeckyModalClose`). | On-Deck |
| **P-6** | Tab strip: filled active only (R5) — one CSS rule in `section-1.ts`, no `tabTitles.tsx` change. | Screenshot diff |
| **P-7** | Layout inversion (§ 2.3) — **its own commit, after P-0b**, and skippable without affecting P-1…P-6. | On-Deck; re-run the Ask-bar width rows |

Per R3, nothing in § 2.4 is built. Per R5, P-6 does not touch strip geometry.

### Test rows to add

Carry the postmortem's four on-Deck rows forward, renamed, plus two the carousel
introduces:

| Row | Scenario |
|---|---|
| `CHAT-SLOTS-V2-01` | D-pad reaches the slot row from Ask and returns; row is quiet at rest |
| `CHAT-SLOTS-V2-02` | Rename / delete / create graph; `ConfirmModal` returns focus to the row |
| `CHAT-SLOTS-V2-03` | Ask in slot A → cycle to B mid-Ask → reply lands in A; reopen A, both Q and A present |
| `CHAT-SLOTS-V2-04` | Close QAM mid-Ask → reopen → question visible with pending answer, not an empty transcript |
| `CHAT-SLOTS-V2-05` | **Bumper ownership:** LB/RB cycle slots while the row is focused and switch tabs the instant it blurs — with a game running and without |
| `CHAT-SLOTS-V2-06` | Cycling wraps (or stops) as specified at both ends; the dots track the active slot at the cap |

Rows checked **before** the roadmap entry moves to Completed. That is the process
fix for postmortem § 1.10, and the only one that would have caught v1.

---

## 7. Decisions

Recorded here as they are made; the ones that need a maintainer call also belong
in [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md).

| # | Question | Decision (2026-08-09) |
|---|---|---|
| R1 | Option C (LB/RB carousel) against the postmortem's rejection, or a sixth *Chats* tab? | **Spike pending on device.** Implementation ships with `preventDefault`/`stopPropagation` on bumpers while the row is focused; record yes/no in this cell after **CHAT-SLOTS-V2-05**. If bumpers still switch tabs, re-plan UI as sixth *Chats* tab (2b/g). |
| R2 | Is one permanent Main focus stop acceptable (§ 4.2)? | **OPEN — decide on device at P-4.** Same call the postmortem deferred to its own P4; it cannot be made on paper. |
| R3 | Slot cap (§ 4.3) | **Small cap, no pinning.** 5–8 slots. Dots stay dots — no numeric counter, no pinning, no hold-to-jump-5, no warning line. 1d is out of scope. |
| R4 | Does the layout inversion ship, and separately (§ 4.4)? | **Yes, separately — after the width bug.** P-0b then P-7. Slots do not wait on it, and it can be dropped without touching P-1…P-6. |
| R5 | Tab-strip treatment (§ 4.5) | **Filled active only (2b/b).** No micro labels, no width change, no 6px height cost. One CSS rule. **Reopened 2026-09-01 and superseded by D44 (locked 2026-09-02):** Steam's strip is hidden and replaced by bonsAI's own 20px bar with the active tab's name, opening to a labelled strip only while the ring is on it — [planning/30-collapsing-tab-bar.md](planning/30-collapsing-tab-bar.md). |

### The preset row (§ 2.3) — decided 2026-09-01

- **Two chips across, not three — D43.** § 2.3 draws three thirds. Measured against the real 300px
  column, three chips leave ~12 characters of label each (no built-in suggestion is recognisable
  until it scrolls); two leave ~20. The maintainer chose two. The research is in
  [planning/29-preset-row-three-thirds-plan.md § 3b](planning/29-preset-row-three-thirds-plan.md).
- **The help chip owns the row** until dismissed, then the suggestions take it — rather than the
  green first third the drawing shows beside two suggestions.
- **Marquee (§ 5) is built** with Steam's own `Marquee`, on every chip, slow and calm; 30px chips,
  radius 4, as drawn. The "one chip" build of 2026-08-31 that prompted this is recorded on the
  roadmap under *The preset chips*.

### Turn-8 review (2026-08-29/30) — what it confirmed

The turn-8 design review closed every open A/B board. Implementation plan:
[planning/28-named-chat-slots-v3-implementation-plan.md](planning/28-named-chat-slots-v3-implementation-plan.md),
which supersedes plan 27 and wins wherever the two disagree.

- **R3** — the cap is **8**, the top of R3's 5–8 range. Dots cover all 8; nothing from § 2.4 comes
  back with it.
- **D5** — taken **literally** (board 8a → B): the LB/RB pills are removed from the quiet row
  entirely, not reserved as empty gutters. This reverses plan 27's locked decision 6. The title
  re-cutting on focus edges is the accepted cost.
- **Ghost neighbours** stay at 300px (board 8b → A), restyled quiet and edge-masked rather than
  pushed off the row.
- **Answer surface** — a constant 11%-alpha wash of the accent **lifted 40% toward white**, layered
  over the shipped gradient (board 8c → B). This reverses plan 27's flat wash colour.
- **R5 stands.** The tab-strip micro labels (board 6b) and the first-run ghost "New chat" label
  (board 6c) are recorded on the roadmap as deliberately-not-built futures.

### Consequences of R3 and R5

- § 2.4 (scale beyond ~8 slots) is **not implemented**. Delete the counter,
  pinning, jump-5 and the warning-line copy from scope; keep § 2.4 in this file
  as the record of what unlimited would have cost.
- § 2.1's wide-active cell and 7px labels are **not implemented**.
  `.bonsai-tab-title-leaf` keeps 40 × 44 and `TAB_TITLE_TAB_GAP_PX = -6`;
  `bonsaiTabIconTitle` is unchanged. P-6 becomes a single rule swapping the
  active tab's green ring + drop-shadow for a solid glyph fill.
- The exact-slot indicator is therefore **the dots alone**, which is the reason
  the cap has an upper bound at all. If the cap ever rises past ~8, § 2.4 comes
  back with it.
