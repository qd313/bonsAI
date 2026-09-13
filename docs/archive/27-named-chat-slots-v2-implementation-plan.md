# Named chat slots v2 — implementation plan

> **SUPERSEDED 2026-08-30 by
> [28-named-chat-slots-v3-implementation-plan.md](28-named-chat-slots-v3-implementation-plan.md).**
> The turn-8 design review closed every A/B board and reversed two decisions locked here
> (Q6 reserved pill gutters → pills fully removed at rest; Q1 wash colour → accent lifted
> 40% toward white). Do not implement from this file.

Written 2026-08-28 against branch `experimental`. Source: the handoff bundle
`Named Chat Slots Design(2).zip` (`README.md`, `Named chat slots.dc.html` turns 5/6/7,
`Redesign audit vs experimental.dc.html`).

**Read this file, not the zip.** The zip's README is a design handoff; it is accurate about
intent and wrong or silent in eight places about the code. Every one of those is resolved or
raised below. Where this file and the zip disagree, this file has the `file:line`.

**All six decisions in § 2 were answered by the maintainer 2026-08-29 and are locked.** Nothing
here is waiting on anyone. Every item in § 4 can be typed as written.

The six, in one line each:

| | Locked as |
|---|---|
| Q1 answer-card surface | Keep our gradient, add the accent wash on top (the zip README's own wording) |
| Q2 layout order | Invert — transcript above presets and Ask bar. **Goes first, as W0** |
| Q3 glass modals | Best effort inside Rule 5: body-only glass, one attempt at the shell, then stop |
| Q4 "2 earlier" | Aggregate older turns behind one pill; **A** expands them back to today's rows |
| Q5 create position | Keep the shipped literal `[+]` everywhere |
| Q6 pills and `×` | Hide at rest, but reserve their width so the row never reflows |

---

## 0. How to use this document

- § 1 is ground truth: what is actually on disk today. Cited, so you do not have to re-derive it.
- § 2 is the maintainer's decisions — all six locked 2026-08-29, with the reasoning kept so
  you can see why each went the way it did. Nothing in here is still open.
- § 3 is things that are true but do not block; read once, then move on.
- § 4 is the work, in commit order. Each item is self-contained: files, the exact before/after,
  the CSS, and how you know it worked.
- § 5 is what is explicitly *not* being built.
- § 6 is the docs and test rows that must change in the same commits.

Repo rules that apply to every item below, from [CLAUDE.md](../../CLAUDE.md) and
[design-language.md](../design-language.md):

- One change per commit, behaviour-preserving where possible, `npm test` +
  `npm run test:py` + `npx tsc --noEmit` green between commits.
- Every px in `src/styles/sections/*` goes through `uiScalePx()`.
- Never target a Steam or Decky class name (they are hashed). Rule 5.
- A new focus stop needs a focus-graph entry *before* the control is written. Rule 8 and
  `.cursor/rules/decky-focus-graph.mdc`.
- Do not `git push`. Do not hand-edit anything under
  `packages/bonsai-mcp/knowledge/architecture/`.

---

## 1. Ground truth — what is shipped today

The feature is **not** new. It landed 2026-08-09 and its data-loss bug was fixed 2026-08-16
(`d167f8e`). This work is a restyle plus two new behaviours.

| Thing | Where | State today |
|---|---|---|
| Slot row component | [ChatSlotRow.tsx](../../src/features/chat-slots/ChatSlotRow.tsx) | 233 lines, two focus stops (`title`, `delete`) |
| Slot row CSS | [section-6.ts:516-631](../../src/styles/sections/section-6.ts) | Lifted almost verbatim from mock turn 3 |
| Bumper cycling | [useChatSlotBumpers.ts](../../src/features/chat-slots/useChatSlotBumpers.ts) | `suppressSteamDefault = true`, **unproven on device** |
| Rename modal | [ChatSlotRenameModal.tsx](../../src/features/chat-slots/ChatSlotRenameModal.tsx) | Stock `ConfirmModal` + `TextField`, zero bonsAI styling |
| Delete confirm | [ChatSlotRow.tsx:117-142](../../src/features/chat-slots/ChatSlotRow.tsx#L117-L142) | Stock `ConfirmModal`; copy already matches the mock verbatim |
| Slot CRUD / state | [useChatSlots.ts](../../src/hooks/useChatSlots.ts) | 186 lines |
| RPC client | [chatSlotsApi.ts](../../src/utils/chatSlotsApi.ts) | list / get / create / delete / rename |
| Backend store | [chat_slot_service.py:18](../../py_modules/backend/services/chat_slot_service.py#L18) | `MAX_CHAT_SLOTS = 5` |
| request → slot map | [main.py:272](../../main.py#L272), written [main.py:2705](../../main.py#L2705), consumed [main.py:2499](../../main.py#L2499) | Works. A reply lands in its origin slot even if you cycle away |
| Answer bubble surface | [section-6.ts:311-321](../../src/styles/sections/section-6.ts#L311-L321) | Vertical gradient, accent-driven, `--bonsai-chat-ai-bubble-bg-top/bottom` |
| Accent vars | [characterUiAccent.ts:113-124](../../src/data/characterUiAccent.ts#L113-L124) | `bg-top` = accent @ 10%, `bg-bottom` = darken(accent, .32) @ 45% |
| Stream treatment | [section-6.ts:332-345](../../src/styles/sections/section-6.ts#L332-L345) | Border **swaps to cyan** + pulsing box-shadow |
| Main tab order | [MainTab.tsx:150-238](../../src/components/MainTab.tsx#L150-L238) | slots → presets → Ask bar → transcript |
| Column size | [design-language.md](../design-language.md) | **300 × 752**, scrolling body 667. Measured. Not 450 × 660 |
| UI scale | [uiScaleProfile.ts:56-61](../../src/data/uiScaleProfile.ts#L56-L61) | handheld **1.0**, desktop 1.0, couch 1.18 |

Two facts worth holding onto, because they shape several items:

1. **Only one Ask can be in flight at a time.** `start_background_game_ai` returns
   `status: "busy"` when one is already pending ([main.py:2595-2609](../../main.py#L2595-L2609)).
   So "generating in slot A while you read slot B" is real, but "ask a question in B while A
   generates" is not, and never was.
2. **The live-answer UI has no idea which slot it belongs to.** The status poll writes straight
   into global state ([useBonsaiAskOrchestration.ts:495-537](../../src/hooks/useBonsaiAskOrchestration.ts#L495-L537))
   and the status payload has no `chat_slot_id` field at all
   ([backgroundAsk.ts:39-77](../../src/types/backgroundAsk.ts#L39-L77)). This is the biggest gap
   between the handoff's claim and the code — see W9.

---

## 2. Decisions — all locked 2026-08-29

### Q1 — The answer-card background. **LOCKED: keep our gradient, add the wash (option B).**

This is the one you asked about, so the reasoning is kept in full below — but the decision is
made: **option B**, the treatment the zip's README item 14 actually describes. Today's
accent-tinted vertical gradient stays, and the flat 11% accent wash goes on top of it. The card
gets deeper and more tinted; it does not become flat, and it does not lose the accent from its
base. See **W8** for the exact rule.

**You were right that the mock looks like an outline, and you are right that it does not match
what we have. But the mock's comparison board is misleading, and the design does not actually
want a hollow card.**

What happened: board **6e** compares five treatments, and its five swatches were drawn as bare
tints with no base surface — the "flat tint" swatch is literally `background: rgba(240,112,58,.1)`
over the page. That reads as an outline with nothing in it. That swatch is **not** what the
canonical turns render. Turns 5a–7d build the card from a template that resolves to:

```
linear-gradient(0deg, <accent>1c, <accent>1c), rgba(18, 26, 34, .72)
```

— an 11%-alpha accent wash **over a solid-ish neutral dark base at 72% alpha**. So there is a
real filled body; the comparison board just dropped it.

Shipped, for contrast ([section-6.ts:314-318](../../src/styles/sections/section-6.ts#L314-L318)):

```
linear-gradient(180deg, <accent> @10% 0%, darken(<accent>,.32) @45% 100%)
```

The three real differences: (a) shipped fades top-to-bottom, the design is constant; (b) shipped's
base is a *darkened accent*, the design's base is *neutral blue-grey*; (c) the design's base is
more opaque.

The zip's README item 14 makes it worse by describing a third thing — "a constant 11%-alpha
accent wash over the existing dark gradient" — which keeps our accent-tinted base and only adds a
wash. That is not what the mock draws either.

**The three that were on the table, and what was chosen:**

| | What it is | Status |
|---|---|---|
| A | What the canonical mocks draw: neutral dark base at 72%, flat accent wash, no fade | not chosen |
| **B** | **The README's words: today's gradient plus a constant wash** | **SHIPS — see W8** |
| C | Leave the card alone | not chosen |

**What B means in practice.** The card keeps its top-to-bottom fade and keeps an accent-tinted
base, so it stays recognisably the card we have — just deeper and more saturated. It will **not**
match the mocks exactly: those are flatter and neutral-based. That is a deliberate divergence, and
it is the conservative one, because it is a modifier on a surface that already works on device
rather than a replacement for it.

Both `--bonsai-chat-ai-bubble-bg-top` and `--bonsai-chat-ai-bubble-bg-bottom` stay in use under B,
so `characterUiAccent.ts` is not opened at all.

One consequence either way: **the default accent is forest green `#2e8753`**
([characterUiAccent.ts:14](../../src/data/characterUiAccent.ts#L14)), not the orange in the mocks.
`#f0703a` is the design doc's own placeholder and is not in our preset map at all. On a fresh
install the card will be green-tinted. That is correct; the mocks are showing a character accent.

### Q2 — The layout order. **LOCKED 2026-08-29: yes, invert. It goes first, as W0.**

Every canonical mock (5a, 5b, 7a–7d) draws: header → tab strip → **slot row → transcript →
preset chips → Ask bar**. The code today is **slot row → preset chips → Ask bar → transcript**
([MainTab.tsx:150-238](../../src/components/MainTab.tsx#L150-L238)).

That inversion is decision **R4 / step P-7** in [major-redesign.md](../major-redesign.md), it was
already approved, and its prerequisite (the Ask-bar width bug) is fixed — it was simply missing
from the zip's work-item list. The maintainer confirmed the mock order is the wanted order, so it
lands **before** W1 and everything after it is built on the new geometry.

It is not a one-line JSX move. See **W0** — it is two commits, and it changes four focus handlers.

### Q3 — The glass modals (zip items 8, 9). **LOCKED 2026-08-29: best effort within Rule 5.**

The mock draws a 340px card with our own field, our own Save/Cancel buttons, and A/B hint badges
in a footer. Every modal in this repo is a Steam `ConfirmModal`, which supplies its own panel,
title bar and footer buttons. **We cannot restyle that shell without targeting Steam's hashed
class names, which Rule 5 forbids.** There is no `ModalRoot` prior art in this codebase to copy.

"Best effort" resolves to this, in order — **stop at the first step that works, do not escalate
past step 2 without asking:**

1. **Baseline (always ship this).** Keep `ConfirmModal`. Render our glass card as
   `strDescription` inside a `BonsaiModalScope`: the `SLOT NAME` label, the 40px cyan-bordered
   field, the copy. Keep Steam's own footer as the real buttons — they already do A/B, and our
   return-focus wiring depends on them. Use `bOKDisabled` for "Save disabled while empty" and
   `bDestructiveWarning` for delete. **Do not draw fake Save/Cancel buttons inside the body** or
   the modal ends up with two rows of buttons.
2. **Then try the shell, once.** `ConfirmModal` accepts `className` and `modalClassName`
   (they are on `ModalRootProps` in `@decky/ui`'s `Modal.d.ts`). Pass
   `className="bonsai-chat-slot-modal"` and see whether it lands on the dialog element. If it
   does, style the card shell — 340px, r12, border `rgba(255,255,255,.12)`, bg
   `linear-gradient(180deg, rgba(30,38,48,.98), rgba(17,22,29,.98))`, shadow
   `0 18px 50px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)` — through **that** class.
   Verify with `npm run test:preview` before believing it. If the class does not reach the
   element, revert to step 1 and move on; **do not go looking for the Steam class that would have
   worked.**
3. **Not in this batch:** a full custom modal on `ModalRoot`. Higher fidelity, no prior art here,
   and it puts the survival and return-focus wiring (`useChatSlotRenameModal`,
   `modalReturnFocusRegistry`) on an untested path. If steps 1–2 leave the result unsatisfying,
   that is a decision to bring back, not to take alone.

**Zip item 10 (A/B hint badges) is dropped** — Steam's own footer already renders the button
hints, and drawing our own inside the body means two sets of buttons saying the same thing.

### Q4 — The "2 earlier" control (zip item 13). **LOCKED: aggregate, A expands.**

Today **every** archived turn renders its own collapsible header row
([MainTabChatTranscript.tsx:460](../../src/components/MainTabChatTranscript.tsx#L460)), and each
is already a D-pad stop. The mock replaces all of them with a single "2 earlier" pill. The audit
file flagged this collision; the zip's item 13 did not resolve it.

**Locked:** aggregate. Render the newest turn's row as today, collapse all older ones behind one
"N earlier" pill, and let **A** expand them inline into exactly the rows we render now. Additive,
reversible, and it *removes* chrome rather than adding it — which is what Rule 7 wants. The
per-turn headers are **not** deleted; they are what the pill expands back into. See **W12**.

### Q5 — The `[+]` create-position label. **LOCKED 2026-08-29: `[+]` everywhere.**

Decision 6c said "first-run keeps the shipped literal `[+]`"; work item 7 said the create position
is "a plain cyan `+` beside *New chat*". They contradicted each other. The maintainer's call: use
`[+]`.

So **`centerLabel` at [ChatSlotRow.tsx:144](../../src/features/chat-slots/ChatSlotRow.tsx#L144)
does not change at all**, at first run or with slots present. Zip item 7's cyan glyph and the
`+ New chat` pairing are dropped; no `.bonsai-chat-slot-create-glyph` class is added. The only
part of item 7 that survives is suppressing the dots at the create position — see W6, which is now
a two-line change.

### Q6 — Do the bumper pills and the `×` render when the row is unfocused?
**LOCKED: hide at rest, reserve the width.**

Decision D5 says the LB/RB pills are focus-only and must be a **conditional render, not CSS**.
Conditional-rendering them removes ~92px from the row, so the centre block widens on blur and
narrows on focus — a long slot name will pop in and out of ellipsis on every focus change. The
shipped `×` has the same question: it renders whenever the position is not `[+]`
([ChatSlotRow.tsx:196](../../src/features/chat-slots/ChatSlotRow.tsx#L196)), focused or not, but
no quiet-row mock draws it.

**Locked:** conditional-render the pill *content* and the `×`, but keep an empty `<span>` of the
same width in the flex row so nothing reflows. D5's intent — nothing visible at rest — is met, and
the geometry is stable. This is a deliberate, documented softening of D5's "conditional render,
not CSS" wording: the *render* is still conditional, only the reserved width is CSS. Record it as
such in `major-redesign.md` § 7 so the next reader does not think it was missed.

---

## 3. Non-blocking, but know them

1. **Geometry.** Mocks are 450 × 660. The real column is **300 × 752**, and Steam caps every QAM
   pane at 300px ([audit/upstream-steam-qam-width-2026-08-12.md](../audit/upstream-steam-qam-width-2026-08-12.md)).
   Treat the mocks as proportions and tokens. At 300px, with 8px row padding, two 38px pills and
   two 8px gaps, the centre block is **192px**; the focused title at 55% of that is ~105px, which
   at 700/19px is about eight characters before it ellipsizes. Expected, not a bug.
2. **Mock px are not our px.** The mock's focused title is 15px and its pills are 33 × 26 r7. Keep
   the shipped scale: title 12px quiet / 19px focused, pills 38 × 26 r8. The zip's own token list
   agrees ("title 700 12→19px (shipped scale)").
3. **Blur is decoration.** `filter: blur(.7px)` on the ghosts quantises away at 1× on the 800p
   panel; the alpha does the work. Ship it, do not debug it.
4. **Mock 7a's caption is stale.** It says "cyan border + blinking caret". The card it actually
   draws keeps the accent border and adds a cyan *glow*. Item 12 and the drawn state agree; the
   caption does not. Follow item 12.
5. **The tab strip probably needs no work.** Decision 6b/D7 says "ships as R5, filled active only".
   The active tab already gets a neutral pill fill at
   [section-1.ts:186-191](../../src/styles/sections/section-1.ts#L186-L191) — exactly the mock's
   `"Neutral pill"` default. Confirm by screenshot before changing a rule.
6. **The wordmark needs no work.** [index.tsx:1479-1509](../../src/index.tsx#L1479-L1509) already
   matches the mock, `small-caps` and version subscript included.
7. **P-0 is still unproven.** Nobody has confirmed on device that a focused row can suppress
   Steam's LB/RB tab switch; shipped code assumes it can. If `CHAT-SLOTS-V2-05` fails, the whole
   carousel is replanned as a sixth *Chats* tab (major-redesign R1) and most of this work moves
   with it. **Run that row before spending a week here.**
8. **Ghost width.** Zip item 4 says `max-width: ~22%`. The mock markup actually uses `flex: 1 1 0`
   with the mask. Use the mock's structure (W4) — it is what produces the drawn look.

---

## 4. The work

Commit order. Each item is one commit. Tests green between each.

### W0 — Layout inversion: transcript above presets and Ask bar *(Q2, locked; major-redesign R4 / P-7)*

**Two commits. Do not combine them** — the repo rule is never to mix a move with a rewrite, because
it makes the diff unreviewable and `git bisect` useless when something breaks on device.

**Why it is not one line.** `MainTabChatTranscript` renders four things, not one
([MainTabChatTranscript.tsx:445-865](../../src/components/MainTabChatTranscript.tsx#L445-L865)):
the turn column, then `SessionContextStrip`, then *Save chat to Desktop*, then the
`Context: no active game detected` footnote. The mocks put the **turn column** above the presets
but keep the context footnote as the **last line on screen, under the Ask row**. Moving the whole
component up would drag the footer furniture with it and contradict the mock.

**W0a — extract the footer, change nothing positionally.** New
`src/components/MainTabChatFooter.tsx` (module header per
[code-clarity.md](../code-clarity.md)) holding `SessionContextStrip`, the *Save chat to Desktop*
row, and the context footnote. `MainTabChatTranscript` renders `<MainTabChatFooter {...props} />`
in the exact position those blocks occupy today. **The rendered DOM must be identical.** Tests
green, no visual change, nothing moved.

**W0b — move the turn column.** In [MainTab.tsx:150-238](../../src/components/MainTab.tsx#L150-L238),
render `<MainTabChatTranscript />` directly after the `ChatSlotRow` `PanelSectionRow` and before
`MainTabPresetRow`; render `<MainTabChatFooter />` last, after `MainTabUnifiedAskBar` and the
existing screenshot/navigation rows. Final order:

> slot row → transcript → preset row → Ask bar → mic/screenshot/navigation rows → session strip →
> Save chat → context footnote

**Four things break, and they are the whole risk of this item:**

1. **`ChatSlotRow.onMoveDown`** ([ChatSlotRow.tsx:169-172](../../src/features/chat-slots/ChatSlotRow.tsx#L169-L172))
   calls `focusUnifiedTextField()`, which now jumps *over* the transcript. Change it to try the
   transcript first and fall back: if `queryLiveTurnSlot()` (or the newest turn slot) exists,
   `focusDeckOwner` it; otherwise `focusUnifiedTextField()`. Both helpers are already exported from
   [liveTurnFocusGraph.ts](../../src/utils/liveTurnFocusGraph.ts).
2. **`SessionContextStrip.onMoveUp`** ([MainTabChatTranscript.tsx:823](../../src/components/MainTabChatTranscript.tsx#L823))
   is `focusUpFromBelowContextChipLadder(queryLiveTurnSlot())`. The live turn is now far above the
   Ask bar, so Up from the footer would leap the whole Ask row. Point it at the Ask row instead.
3. **`unifiedInputDeckNavHandlers.onMoveUp`** ([useMainTabAskBarFocus.ts:140](../../src/hooks/useMainTabAskBarFocus.ts#L140))
   is `focusFirstPresetChip()` — still correct, the presets stay directly above the input.
   **Verify, do not change.**
4. **Everything else below the Ask bar is Steam's own spatial navigation**, not our handlers — the
   Ask primary button has no `onMoveDown` at all. That is why this move is survivable, and also why
   it can only be proven on device, not in the preview suite.

Also re-check, in this order: `useStreamScrollPin` and `chatPanelScroll` (they measure the
transcript tail against the scroll container, and the transcript is no longer the last thing in
the panel), and `BONSAI_CHAT_INPUT_TO_TRANSCRIPT_GAP_PX`
([constants.ts:75](../../src/features/unified-input/constants.ts#L75)) — its 12px lands on
`.bonsai-chat-main-column` as `margin-top` ([section-6.ts:164](../../src/styles/sections/section-6.ts#L164)),
and after the move that gap sits between the **slot row** and the transcript, not between the Ask
bar and the transcript. The name becomes a lie; rename it in W0b or leave a comment saying so.

**Done when:** the Main tab reads slot row → transcript → chips → Ask bar → context line; D-pad
Down from the slot row reaches the newest turn, and again reaches the chips; Up from the Ask field
reaches the chips; streaming still auto-scrolls to the newest token; `CHAT-SLOTS-V2-01` still
passes.

### W1 — Delete the eyebrow *(zip item 1; decision 6a/D4)*

- `ChatSlotRow.tsx:190` — delete
  `{focused ? <div className="bonsai-chat-slot-eyebrow">CHAT SLOT</div> : null}`.
- `section-6.ts:563-569` — delete the whole `.bonsai-chat-slot-eyebrow` rule.
- Keep the `focused` state variable; W2 and W5 need it.

**Done when:** focusing the row no longer shows "CHAT SLOT", and nothing else moves.

### W2 — Focus-only bumper pills + boundary dimming *(zip items 2 and 6; D5, D8)*

Per Q6 (locked). In `ChatSlotRow.tsx`, compute the dead directions:

```tsx
const atLeftEnd = carouselIndex === 0;
const atRightEnd = carouselIndex === positionCount - 1;
```

Replace `<span className="bonsai-chat-slot-bumper-pill">LB</span>` with:

```tsx
<span
  className={`bonsai-chat-slot-bumper-pill${
    focused && atLeftEnd ? " bonsai-chat-slot-bumper-pill--dead" : ""
  }`}
>
  {focused ? "LB" : ""}
</span>
```

and the RB pill the same way with `atRightEnd`. The span always renders — stable width; only its
text and border state change.

CSS in `section-6.ts`:

- On `.bonsai-chat-slot-bumper-pill`, add `border-color: transparent; background: transparent;` so
  an empty pill leaves no mark at rest. The existing `--focused` rule already lights it.
- New rule, after the `--focused` pill rule:

```css
.bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-bumper-pill--dead {
  border-color: rgba(168, 182, 198, 0.28);
  color: rgba(168, 182, 198, 0.4);
  background: transparent;
  box-shadow: none;
}
```

**Done when:** quiet row shows no LB/RB; focused row shows both; at `[+]` the LB pill is dim with
no glow; at the last slot RB is dim; the title does not shift horizontally between states.

### W3 — Cap 8 *(zip item 3; decision 6d/R3)*

- `chat_slot_service.py:18` — `MAX_CHAT_SLOTS = 5` → `8`. The tests import the constant
  ([test_chat_slot_service.py:7](../../tests/test_chat_slot_service.py#L7)), so nothing else in
  Python changes.
- `ChatSlotRow.tsx:39` — `const MAX_DOTS = 5;` → `8`.
- `docs/testing-manual.md:282` — "cap of 5" → "cap of 8".

**Done when:** `npm run test:py` green; creating nine slots leaves eight; the active slot always
has a dot (today slots 6–8 have none).

### W4 — Ghosts: quiet, edge-hugging, present at the create position *(zip item 4)*

**Component.** `ChatSlotRow.tsx:82-85`. Today `nextSlot` is `null` at the create position, so mock
5a's right-hand ghost never appears. Change to:

```tsx
const nextSlot = isCreatePosition
  ? (orderedSlots[0] ?? null)
  : (carouselIndex < orderedSlots.length ? orderedSlots[carouselIndex] : null);
```

`showGhosts = orderedSlots.length > 1` stays — hidden at one slot is shipped behaviour, keep it.

**CSS.** Replace `.bonsai-chat-slot-ghost` (`section-6.ts:602-611`) with:

```css
.bonsai-scope .bonsai-chat-slot-ghost {
  flex: 1 1 0;
  min-width: 0;
  font-size: ${uiScalePx(11)}px;
  font-weight: 600;
  color: rgba(200, 214, 230, 0.28);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  filter: blur(0.7px);
  pointer-events: none;
}
.bonsai-scope .bonsai-chat-slot-ghost--prev {
  text-align: left;
  padding-left: ${uiScalePx(4)}px;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 55%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 55%);
}
.bonsai-scope .bonsai-chat-slot-ghost--next {
  text-align: right;
  padding-right: ${uiScalePx(4)}px;
  -webkit-mask-image: linear-gradient(90deg, #000 45%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 45%, transparent 100%);
}
```

The centre block must stop being the flexible one, or the ghosts get no room. In
`.bonsai-chat-slot-center` (`section-6.ts:558-562`) change `flex: 1 1 auto` to
`flex: 0 1 auto; max-width: 55%;`. The ghosts then flex, which is how the mock builds the row.

**Done when:** at ≥2 slots the neighbours' names sit against the pills and fade at the outer edge;
at 1 slot no ghosts; at `[+]` the first slot's name shows on the right.

### W5 — The red delete `×` *(zip item 5)*

Per Q6 (locked): render the `×` only when `focused`, keeping a same-width placeholder otherwise
(`ChatSlotRow.tsx:194-201`). Replace the CSS at `section-6.ts:592-601`:

```css
.bonsai-scope .bonsai-chat-slot-delete {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${uiScalePx(22)}px;
  height: ${uiScalePx(22)}px;
  border-radius: ${uiScalePx(6)}px;
  font-size: ${uiScalePx(15)}px;
  font-weight: 700;
  line-height: 1;
  color: rgba(168, 182, 198, 0.55);
  border: 1px solid transparent;
}
.bonsai-scope .bonsai-chat-slot-delete--active-stop {
  color: #f16a5a;
  border-color: rgba(224, 74, 58, 0.8);
  background: rgba(26, 14, 12, 0.55);
  box-shadow: 0 0 10px 1px rgba(224, 74, 58, 0.25);
}
```

Focus logic (Right from title → `×`, Left back) is already correct at
[ChatSlotRow.tsx:152-168](../../src/features/chat-slots/ChatSlotRow.tsx#L152-L168) — **do not
touch it.**

Add the red tokens next to `DECK_HIGHLIGHT_CYAN` in
[constants.ts:108](../../src/features/unified-input/constants.ts#L108):

```ts
/** Destructive family for slot delete + delete-confirm (redesign v2). */
export const BONSAI_DESTRUCTIVE_RED = "#f16a5a";
export const BONSAI_DESTRUCTIVE_RED_SOFT = "#f28b7d";
export const BONSAI_DESTRUCTIVE_RED_BADGE = "#e04a3a";
```

**Done when:** quiet row has no `×`; focused row shows a grey `×`; Right lights it red with a
glow; Left returns; A opens the confirm.

### W6 — No dots at the create position *(what survives of zip item 7 after Q5)*

Q5 locked `[+]` everywhere, so **`centerLabel` at
[ChatSlotRow.tsx:144](../../src/features/chat-slots/ChatSlotRow.tsx#L144) does not change** and no
create-glyph class is added. One change remains, from mock 5a: the dots block renders whenever
`orderedSlots.length > 0` ([ChatSlotRow.tsx:216](../../src/features/chat-slots/ChatSlotRow.tsx#L216)).
Gate it on `!isCreatePosition` as well, so the `[+]` position shows no dots.

**Done when:** cycling left past slot 1 shows `[+]` with no dots; A creates and switches; cycling
back to a real slot brings the dots back with the right one active.

### W7 — Empty-slot transcript *(zip item 11)*

New block in [MainTabChatTranscript.tsx](../../src/components/MainTabChatTranscript.tsx), in the
`else` of `{(askThreadCollapsed.length > 0 || showLiveTurn) && (...)}` at line 445 — today that
case renders nothing at all.

Centred in the transcript area: the repo's own
[bonsai-logo.svg](../../src/assets/icons/bonsai-logo.svg) at ~34px with
`opacity: .12; filter: grayscale(1) brightness(1.7)`, and beneath it one italic line at
`rgba(143,168,196,.38)`, `${uiScalePx(12.5)}px`:

> Ask anything — this slot keeps its own history.

It is decoration: **no Focusable, no focus stop, nothing to reach.**

**Done when:** a brand-new slot shows the silhouette and the line; the first Ask replaces it.

### W8 — Answer-card surface *(zip item 14; Q1 locked — option B)*

One rule. In `section-6.ts:311-321`, replace only the `background` declaration of
`.bonsai-chat-ai-bubble.bonsai-glass-panel`:

```css
background:
  linear-gradient(
    0deg,
    var(--bonsai-chat-ai-bubble-bg-top, rgba(46, 135, 83, 0.12)),
    var(--bonsai-chat-ai-bubble-bg-top, rgba(46, 135, 83, 0.12))
  ),
  linear-gradient(
    180deg,
    var(--bonsai-chat-ai-bubble-bg-top, rgba(46, 135, 83, 0.12)) 0%,
    var(--bonsai-chat-ai-bubble-bg-bottom, rgba(18, 52, 34, 0.55)) 100%
  ) !important;
```

The first layer is the flat wash; the second is exactly today's gradient, unchanged. Keep the
fallbacks — a bubble can render for a frame before `.bonsai-scope` carries the accent vars.

Nothing else moves: `border` keeps `--bonsai-chat-ai-bubble-border`, `color` keeps
`--bonsai-chat-ai-bubble-text`, `border-radius: 10px` and `overflow: hidden` stay, and
**`characterUiAccent.ts` is not opened.**

**Do not also change** `.bonsai-chat-ai-bubble-inner--faded` (`section-6.ts:328-331`). It is the
collapsed-turn mask, not the card surface, and it is not what "answerFade" in the design doc
refers to.

**Done when:** the card reads deeper and more accent-saturated than before while still fading
top-to-bottom, checked against at least three character accents plus the default forest green (no
character selected). If it looks muddy at a dark accent — `bg3_shadowheart` `#6c3483` is the worst
case — say so rather than tuning the alpha silently; the wash strength is a design call, not an
implementation one.

### W9 — Mid-generation switching *(zip item 12 — the largest item by far)*

This is the failure that killed v1, and the one place the handoff's "matches shipped backend"
claim is only half true.

**What already works:** the reply lands in its origin slot. `_chat_slot_by_request` is written at
[main.py:2705](../../main.py#L2705) and consumed at [main.py:2499](../../main.py#L2499); cycling
away never cancels. Do not change any of that.

**What does not exist:** the frontend cannot tell which slot the in-flight answer belongs to. The
status payload has no slot field, and the poll handler writes into global state regardless of the
active slot ([useBonsaiAskOrchestration.ts:517-537](../../src/hooks/useBonsaiAskOrchestration.ts#L517-L537)).
Today, cycling to slot B mid-generation paints slot A's streaming text into B.

Build in this order:

**W9a — backend field.** Add `chat_slot_id` to the dict returned by
`get_background_game_ai_status`, read from `self._chat_slot_by_request.get(request_id)`. Do **not**
rename any RPC method. Add the field to `BackgroundRequestStatus` in
[backgroundAsk.ts](../../src/types/backgroundAsk.ts). A Python test asserting the field is present
on a pending status belongs in the same commit. A frontend-only ref would be cheaper but loses the
association across a QAM close/reopen — which is exactly `CHAT-SLOTS-V2-04`.

**W9b — gate the live turn on the slot.** In the poll handler, when `status.chat_slot_id` is set
and differs from `activeSlotIdRef.current`, do not call `setOllamaResponse` /
`setIsStreamingPreview` / `setAskThreadDisplayQuestion`; record the slot in a `pendingSlotIds` set
instead. When it matches, behave exactly as today — which gives you 7c (return and the caret is
still moving) for free, because the poll keeps running the whole time.

**W9c — per-slot dot states.** `ChatSlotRow` grows two optional props:
`generatingSlotIds?: string[]` and `unreadSlotIds?: string[]`, both owned by `index.tsx` next to
`chatSlots`. Unread is set when a terminal status arrives for a slot that is not active, and
cleared in `selectSlot`. Session-scoped is fine — do **not** persist it to disk.

Dot CSS, one axis per state, after the existing dot rules:

```css
.bonsai-scope .bonsai-chat-slot-dot--pending {
  width: ${uiScalePx(6)}px;
  height: ${uiScalePx(6)}px;
  background: transparent;
  border: 1.5px solid rgba(56, 189, 248, 0.9);
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
}
.bonsai-scope .bonsai-chat-slot-dot--unread {
  width: ${uiScalePx(6)}px;
  height: ${uiScalePx(6)}px;
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.6);
}
```

**W9d — the ghost spark.** A 6px dot in the matching colour, rendered as a **sibling flex item** of
the ghost, not a child — the ghost carries `filter: blur()` and a mask, and both would eat it.

**W9e — the streaming card.** Change `section-6.ts:332-335` so the border **no longer swaps to
cyan**: keep `--bonsai-chat-ai-bubble-border` and express streaming as
`box-shadow: 0 0 8px 1px rgba(56,189,248,.28)` plus the existing blinking `▋` caret. The
`--fence-wait` rule at line 336 does the same border swap and should follow.

**Stop stays on the answer card only.** Do not add a stop control to the row: from another slot you
return first, then stop. QAM-closed notification stays the shipped reply-ready toast
([bonsaiReplyReadyToast.ts](../../src/utils/bonsaiReplyReadyToast.ts)) — nothing new there.

**Done when:** Ask in A, cycle to B — B shows B's own history, A's dot is a hollow cyan ring and
A's ghost carries a cyan spark; return to A and the partial text plus a live caret are there; let
it finish while in B and A's dot goes solid green; return to A and it clears.

### W10 — Rename modal, glass *(zip item 8; Q3 locked)*

Step 1 of Q3: rewrite `ChatSlotRenameModal.tsx` so `strDescription` is a `BonsaiModalScope`
containing the glass card — `SLOT NAME` label (700/10px, letter-spacing .1em,
`rgba(143,168,196,.8)`) and the 40px r8 field (bg `rgba(18,26,34,.55)`, border
`rgba(156,231,255,.5)`, text 600/15px `#e8eef5`, cyan caret) — and pass `bOKDisabled` when the
trimmed label is empty. Keep `strOKButtonText="Save"` / `strCancelButtonText="Cancel"`.

The new rules must live in a builder returned by `buildModalPortalStylesheet()`
([gamepadAndPullModels.ts:92](../../src/styles/sections/gamepadAndPullModels.ts#L92)) — a modal
renders outside `.bonsai-scope`, so rules that exist only in `section-6.ts` never reach it.

**Keep `useChatSlotRenameModal` exactly as it is.** The survival hooks
(`onBeforeNestedDeckyModal` / `onCompleteNestedDeckyModalClose`) and
`registerModalReturnFocusOwner` are what bring focus back to the row, and they were paid for.

### W11 — Delete confirm, glass *(zip item 9; Q3 locked)*

Same shell as W10. The copy already matches the mock verbatim
([ChatSlotRow.tsx:121](../../src/features/chat-slots/ChatSlotRow.tsx#L121)) — do not retype it.
Add `bDestructiveWarning` and style the body's framing in the red family.

Zip item 10 (A/B hint badges) is dropped — see Q3.

### W12 — "N earlier" collapsed turns *(zip item 13; Q4 locked)*

Newest turn keeps its row exactly as today. Everything older collapses behind one pill reading
`N earlier`; **A** expands them inline into the same per-turn rows we render now, and the pill
disappears while expanded. Default state on mount is collapsed. New pill above the turn list in
`MainTabChatTranscript.tsx`:

```css
.bonsai-scope .bonsai-chat-earlier-pill {
  font-weight: 600;
  font-size: ${uiScalePx(10)}px;
  color: rgba(200, 214, 230, 0.85);
  padding: ${uiScalePx(3)}px ${uiScalePx(10)}px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(18, 26, 34, 0.5);
  opacity: 0.55;
}
```

It is a **focus stop**: A expands. Write the focus-graph entry per
`.cursor/rules/decky-focus-graph.mdc` **before** the control — the parent owns the graph, and
`onButtonDown` must whitelist OK via `isOkDeckButtonEvent` (three controls in this repo have
toggled themselves on a stray D-pad press by skipping that).

Two things this must not break. Expansion state is component-local and **not** persisted: a QAM
close/reopen comes back collapsed, like any other session-scoped view state. And the pill renders
only at **two or more** older turns — at one, render that turn's row instead, because a pill
reading "1 earlier" costs the same vertical space as the row it hides.

**Done when:** four turns show one row plus `3 earlier`; A on the pill expands all four rows and
removes the pill; D-pad Down from the slot row still reaches the newest turn (W0's handler), and
Down through the expanded list still reaches the preset chips.

---

## 5. Explicitly not built

Add both to [roadmap.md](../roadmap.md) under Backlog → Focus / Deck UI, citing board options
6b-A and 6c-A *(zip item 15)*:

- Tab-strip micro-labels + wide active cell, including the full "SETTINGS" label. Rejected as
  **R5**; re-opening it needs a maintainer call plus proof that 7px type is legible on handheld.
- First-run ghost "New chat" title in place of the literal `[+]` (board 6c-A / mock 5e).

Also not built, and not new: § 2.4 of major-redesign (pinning, numeric counter, hold-to-jump-5,
warning line) stays out per **R3**. Slot metadata (`turn_count`, `origin_app_id`) ships in every
summary and still appears nowhere in the UI — deliberate.

---

## 6. Docs and test rows — same commits, not a follow-up

Per `docs-on-ship`, [roadmap.md](../roadmap.md) and [testing.md](../testing.md) change in the same
change set as the feature work.

- `docs/testing-manual.md:282` — cap 5 → 8 *(W3)*.
- `docs/testing-manual.md` § CHAT-SLOTS-V2 — three new rows for W9:
  - **CHAT-SLOTS-V2-07** Ask in A → cycle to B mid-stream → B shows B's transcript; A's dot is a
    hollow cyan ring with a matching ghost spark
  - **CHAT-SLOTS-V2-08** Return to A mid-stream → question and everything streamed so far are on
    screen, caret still blinking, no re-ask
  - **CHAT-SLOTS-V2-09** Reply finishes while in B → A's dot is solid green; cycling to A clears it
- `docs/major-redesign.md` § 7 — record D4 (eyebrow dropped), D5 (focus-only pills), R3 cap = 8,
  and the Q1–Q6 answers from this file.
- `docs/roadmap.md` — the two deferred features from § 5.
- `docs/design-tokens.md` — the three red tokens from W5.
- **`docs/audit/maintainer-decisions-locked.md`** — the Q1–Q6 answers belong there, in plain
  language with the options, not in chat.

**Gate:** `CHAT-SLOTS-V2-01…06` are all still Open, and **P-0 (`-05`, bumper suppression) has never
been run on device.** If bumpers cannot be suppressed, the carousel is replaced by a sixth *Chats*
tab (major-redesign R1, fallback 2b/g), and W2, W4, W6 and most of W9c/W9d move with it. Run `-05`
first.

**Offer the frozen test chips before asking for any of this by hand.** Standing instruction,
2026-08-22 — write out the exact questions each QA row needs, get them confirmed, then pin them via
`dev_frozen_test_chips` (3–12 entries) or Developer → *Knowledge base (dev QA)*.
`scripts/deck_send_ask.py` is the fallback for a one-off sentence.
