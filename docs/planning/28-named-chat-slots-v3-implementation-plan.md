# Named chat slots v3 — implementation plan (turn-8 final)

Written 2026-08-30 against branch `experimental`. Source: the handoff bundle
`Named Chat Slots Design(3).zip` (`README.md` v3, `Named chat slots.dc.html` turn 8,
`github.md` sync log). **Supersedes
[27-named-chat-slots-v2-implementation-plan.md](../archive/27-named-chat-slots-v2-implementation-plan.md)**
— every open question in 27 is now closed; two of its locked decisions were reversed in the
turn-8 review (reserved pill gutters → literal removal; flat wash colour → lifted 40% toward
white). Where 27 and this file disagree, this file wins.

**Read this file, not the zip.** Every claim about the code below carries a `file:line`
verified 2026-08-30. Where the zip's README and the code disagreed, the discrepancy is named
here and resolved.

---

## 0. How to work through this file

Rules for the implementing model. These are not suggestions.

1. **One work item = one commit**, in the order given (W0 → W18). Never fold two items into
   one commit, never mix a value change into a mechanical fix. This repo bisects on-device
   bugs; a mixed commit destroys that.
2. **After every commit** run the gates and do not proceed on a failure:
   ```bash
   npx tsc --noEmit
   npm test
   npm run build
   ```
   Add `npm run test:py` for any commit that touches `main.py` or `py_modules/`.
   All four pass on a clean tree today; any failure is caused by your change.
3. **Every pixel value goes through `uiScalePx()`** ([uiScalePx.ts](../../src/styles/sections/uiScalePx.ts))
   — and `uiScalePx()` **already returns a complete CSS length**
   (`calc(Npx * var(--bonsai-ui-scale, 1))`). **Never write `${uiScalePx(12)}px` — the
   trailing `px` makes the declaration invalid and the browser silently drops it.** That
   exact mistake shipped 21 times in the slot-row CSS; W1 fixes it. Write
   `font-size: ${uiScalePx(12)};`.
4. **Do not touch** (no work item asks you to):
   - The LB/RB bumper cycle logic (`useChatSlotBumpers.ts`, and
     `ChatSlotRow.tsx:173-190` `onButtonDown`) — shipped, gated on the P-0 device spike.
   - RPC method names — renaming one is a two-language break with no compiler.
   - `packages/bonsai-mcp/knowledge/architecture/*.json` — generated, rewritten by the
     pre-commit hook.
   - The rename/delete modal survival + return-focus wiring
     (`useChatSlotRenameModal.tsx:30-32` return-focus registration, `:38-43` nested-close
     completion, `ChatSlotRow.tsx:112-136` registration lines) — restyle the body only.
   - Steam's own chrome: **never target a hashed Steam class name** (design-language.md
     Rule 5). The modal work (W14) styles the body we own, nothing else.
5. **Stop condition:** if on-device QA row `CHAT-SLOTS-V2-05` (bumper suppression, the P-0
   spike in [major-redesign.md](../archive/major-redesign.md) §4.1) fails, stop after the current
   commit and report. The carousel gets re-planned as a sixth *Chats* tab (option 2b/g) and
   W5–W10, W16 move with it. W0–W2, W11–W15, W17 survive either way. Run `-05` right after
   W0 lands on a Deck — W0 is what makes the row exist on device at all, so the spike has
   never been runnable before it.
6. Frontend UI text is user-facing: copy strings exactly as written here, including the
   em dash in "Ask anything — this slot keeps its own history."

---

## 1. Ground truth (verified 2026-08-30)

What is already shipped and where. Cited so you don't re-derive it.

| Fact | Where |
|---|---|
| Slot row component; one `Focusable` wraps the whole row | `src/features/chat-slots/ChatSlotRow.tsx` (Focusable at :148) |
| **The composed app never renders the row.** index.tsx renders MainTab only through `useMainTabPayload` (index.tsx:1099), and that hook forwards NONE of the six chatSlot props, neither nested-modal callback, nor `askStopped` — its file has zero occurrences of any of them and its JSX has no spread. MainTab.tsx:152 gates the row on all four callbacks → the row has never appeared on device | `src/features/plugin-shell/tabs/useMainTabPayload.tsx` (destructure ends :189, JSX ends at `lastExchange`); index.tsx:1196-1208 passes them in; git: step-8 extraction `dba34e7` 2026-08-03 predates chat-slots `bc9a5df` 2026-08-09, which never touched the hook |
| Row tracks its own focus: `const [focused, setFocused] = useState(false)`, set by `onFocus`/`onBlur` | ChatSlotRow.tsx:65, :171-172 |
| Inner D-pad stop state (`title` \| `delete`) | ChatSlotRow.tsx:66 (`focusStop`), handlers :151-164 |
| Carousel: index 0 = create `[+]`; cycling to 0 does NOT change the active slot (`if (clamped === 0) return;`) | ChatSlotRow.tsx:79, :86-95 |
| `MAX_DOTS = 5`, dots sliced to it | ChatSlotRow.tsx:39, :219 |
| Backend cap `MAX_CHAT_SLOTS = 5`, enforced + oldest-evicted | `py_modules/backend/services/chat_slot_service.py:18`, :273-276, :301 |
| Slot-row CSS block (all of it) | `src/styles/sections/section-6.ts:516-631` |
| **21 slot-row interpolations on 20 lines are INVALID CSS today** (`${uiScalePx(N)}px` double-unit; line 533 holds two) and are dropped by the browser | section-6.ts:527-626 (every `uiScalePx(...)px`) |
| LB/RB pills always in the DOM; focus only recolors them via CSS | ChatSlotRow.tsx:193, :228; section-6.ts:538-557 |
| Eyebrow renders only while focused | ChatSlotRow.tsx:195; CSS section-6.ts:563-569 |
| Ghosts: `flex: 0 1 auto; max-width: 22%`, color rgba(200,214,230,.18), no mask/blur; `--prev`/`--next` modifier classes exist but are styled nowhere | section-6.ts:602-611; ChatSlotRow.tsx:198, :214 |
| Delete `×`: bare span, quiet gray, active-stop turns cyan | ChatSlotRow.tsx:205-212; section-6.ts:592-601 |
| Layout order today: slot row → presets → ask bar → mic row → screenshot browser → navigationMessage → transcript | `src/components/MainTab.tsx:151-238` (transcript last at :237) |
| Context footnote ("Context: no active game detected") is the transcript's last block | `src/components/MainTabChatTranscript.tsx:849-865` |
| Transcript: archived turns render as header rows (title only, accordion via `expandedTurnKey`, default `"live"`); **no "N msgs" count exists anywhere** | MainTabChatTranscript.tsx:445-713, :472; src/index.tsx:123 |
| Empty transcript renders NOTHING (gate `askThreadCollapsed.length > 0 \|\| showLiveTurn`) | MainTabChatTranscript.tsx:445 |
| Answer bubble surface: accent gradient via `--bonsai-chat-ai-bubble-*` vars | section-6.ts:311-321; vars built in `src/data/characterUiAccent.ts:112-124` |
| Streaming today: border swaps to cyan + pulse; **blinking `▋` caret already ships** | section-6.ts:332-346 (swap+pulse), :386-397 (caret) |
| `--bonsai-stream-preview-border` is read but never set — the cyan fallback always wins | section-6.ts:333, :337 (only usages) |
| Speed chip is already borderless by design ("blends with ask-bar glass; borderless") | `src/data/askMode.ts:25`; `src/styles/sections/section-8.ts:212-265` |
| Status payload has NO slot id; frontend cannot attribute in-flight tokens to a slot | `py_modules/backend/services/background_request_state.py:16-40`; `src/types/backgroundAsk.ts:40-78` |
| `_chat_slot_by_request` map: written at accept, **pop()ed at terminal** — a terminal poll can no longer look the slot up | `main.py:272`, :2705 (write), :2499 + :2840 (pops) |
| One ask at a time (busy branch) | main.py:2596-2615 |
| Poll handler that paints the stream | `src/hooks/useBonsaiAskOrchestration.ts:486-548` (`applyBackgroundStatusToUi`) |
| Second status consumer: module-level watch that fires the reply-ready toast after QAM close | `src/utils/bonsaiAskCompletionWatch.ts`; toast in `src/utils/bonsaiReplyReadyToast.ts:32-48` |
| Rename modal: `ConfirmModal` + `BonsaiModalScope` + `TextField`; Save is never disabled | `src/features/chat-slots/ChatSlotRenameModal.tsx:22-39` |
| Delete confirm: inline `ConfirmModal` in the row; `bDestructiveWarning` unused anywhere in src/ | ChatSlotRow.tsx:112-136 |
| `ConfirmModal` supports `bOKDisabled`, `bDestructiveWarning` (typed) | node_modules/@decky/ui/dist/components/Modal.d.ts:19-43 |
| Modal bodies get scoped CSS via `BonsaiModalScope` injecting `buildModalPortalStylesheet()` | `src/components/BonsaiModalScope.tsx:21-31`; `src/styles/sections/gamepadAndPullModels.ts:92-94` |
| Logo available as `BonsaiLogoIcon` (`<img src={bonsaiLogo}>`) | `src/components/icons.tsx:10, :280-295` |
| Zero vitest coverage on ChatSlotRow UI — no test breaks from any change below | verified by grep; nearest tests listed in §6 |
| navFocusRegistry keys: `"session-context-strip" \| "chat-slot-row" \| "preset-carousel"` | `src/utils/navFocusRegistry.ts:16` |
| Character accents `#6c3483` (bg3_shadowheart, darkest in the map) and `#e8b923` (cp2077_jackie) are real entries | characterUiAccent.ts:35, :20 |

---

## 2. The decisions — all locked, none open

Sources: turn-6 board (2026-08-28), turn-8 review boards (2026-08-29/30), bundle README v3.
**Turn 8 wins wherever it disagrees with anything earlier, including plan 27.**

| # | Decision | Source |
|---|---|---|
| D-A | Layout inverts: slot row → transcript → preset chips → Ask bar → context line last | board 8·0 (R4/P-7) |
| D-B | Slot titles **700 14px focused / 13px quiet**; focused title auto-scrolls (marquee) when it overflows, `prefers-reduced-motion` guarded, focused row only | turn-8 review |
| D-C | **Pills fully removed at rest** (literal D5; reverses 27's "reserve the gutters"). Quiet centre block ≈284px; title re-cuts on focus edges — accepted | board 8a → B |
| D-D | Ghost neighbours **stay at 300px** (~35px each, `flex: 1 1 0`), restyled quiet + edge-masked | board 8b → A |
| D-E | Answer-card surface: constant **11%-alpha wash of the accent lifted 40% toward white**, layered over the shipped gradient (which does not change) | board 8c → B |
| D-F | Modals ship **inside Steam's stock ConfirmModal shell**, body styled flat (no inner glass panel, no custom footer, no hint badges). Do not spend a device round-trip styling the shell | board 8d → A (flattened) |
| D-G | "N earlier" pill sits **above** the newest turn; A expands it inline into the per-turn header rows; at exactly one older turn, render that header row directly, no pill | board 8e → A + locked decision 4 |
| D-H | Empty slot: **52px logo** at .16 opacity, caption 13px/1.55 over 210px | board 8f → B |
| D-I | Create position: literal `[+]`, quiet-title styling, no dots, empty-transcript preview behind it | locked decision 5, re-confirmed 8f |
| D-J | Eyebrow deleted; slot cap 8 (dots must cover all 8); boundary dimming at carousel ends; red destructive ×; turn-5 chrome canonical | turn-6 board (6a, 6d/R3, D8, 5b) |
| D-K | Mid-gen switching: **backend slot id in the status payload first**; until 7b–7d land, cycling away mid-stream shows the quiet row only — never paint another slot's tokens | turn-7 status note, decided 2026-08-30 |
| D-L | Dot language: solid light = active · hollow cyan ring = generating · solid green = finished unread. Stop stays on the answer card only | turn 7 |
| D-M | Streaming answer card keeps the **accent** border; streaming reads as cyan glow + caret (the shipped border-swap goes away) | turn 7 / item 12 |
| D-N | Speed chip: no outline, soft background only — **already true in the shipped code; no code change** (see §3.3) | turn-8 review |
| D-O | Tab strip stays R5 (filled active only). Micro-labels strip and first-run ghost "New chat" go to roadmap as future entries, worded so they don't conflict with locked R5 | turn-6 board (6b, 6c) |

---

## 3. Found while planning — read before coding

### 3.0 The slot row has NEVER rendered in the composed plugin

The step-8 refactor (2026-08-03, `dba34e7`) moved the `<MainTab>` element into
`useMainTabPayload.tsx`, which enumerates every prop by hand (no spread) and carries a
hand-maintained memo dependency list. The chat-slots commit (2026-08-09, `bc9a5df`) added
its six props to index.tsx's call into that hook (index.tsx:1196-1208) and to MainTab —
but never to the hook's destructure, JSX, or dep list. All the props are optional, so
`tsc` is silent, and MainTab.tsx:152 gates the row on the four callbacks being present —
so the row renders nowhere. The same hop also drops `askStopped` (the "stopped" status
line after cancelling an ask, MainTabChatTranscript.tsx:609, has been dead too) and both
nested-modal callbacks. This is the exact failure mode the hook's own comment warns about
and the same class as decision D1's swallowed-RPC story. **W0 fixes it and goes first** —
until it lands, no chat-slots QA row (V2 or V3) can even be attempted on device.

### 3.1 The slot row's CSS is also invalid where it counts

All 21 size interpolations (on 20 lines) in the slot-row block write `${uiScalePx(N)}px`,
which emits `calc(Npx * var(--bonsai-ui-scale, 1))px` — invalid, dropped at parse time
(section-6.ts:527-626; the pattern exists nowhere else in the repo). Row gap/padding, pill
box + font, eyebrow font, title 12px/19px, delete font, ghost font, and all dot sizes
would not apply even once W0 makes the row render. **W1 fixes this second**, restoring the
values as written, so every later visual diff is honest. After W0+W1 the row appears on
device for the first time, correctly sized.

### 3.2 "N msgs" does not exist — the expanded history rows show title only

The design's expanded-history rows carry a per-turn "N msgs" count. The shipped transcript
has no message count anywhere (verified by grep; header rows show a 60-char question title,
`src/utils/buildTurnHeaderElement.tsx:64-75`, `src/utils/chatTurnTitle.ts:10-15`), and a
shipped turn is always exactly one question + one answer, so the count would be a constant
"2". **Decision: drop the count.** Expanding the pill reveals the existing header rows
unchanged. (Flagged to the maintainer 2026-08-30.)

### 3.3 The speed chip item is a no-op

The review said "speed chip: no outline — soft green background only, matching the shipped
Main tab." The shipped chip is already deliberately borderless with a soft green fill
(askMode.ts:25 documents it; section-8.ts:229-238 forces `border: none`). The mock's fill
alpha (.14) differs from shipped (.06) — that difference is the mock's rendering, not a
requested change. **No code change.** Do not "fix" the chip.

### 3.4 The slot-id lookup dies before the terminal poll

`_chat_slot_by_request.pop()` runs when a request finishes (main.py:2499) or aborts
(main.py:2840) — before the frontend ever polls the terminal status. So the naive one-liner
(`get(rid)` inside the payload builder) would return the slot id only while pending and
`None` exactly when the unread-dot logic needs it. W15 therefore writes the slot id **into
the state dict at accept time**, so it rides the `**self._background_state` spread into the
terminal payload for free.

### 3.5 Two consumers poll the same status RPC

`applyBackgroundStatusToUi` (QAM open) and the module-level watch in
`bonsaiAskCompletionWatch.ts` (survives QAM close, fires the reply-ready toast). The new
`chat_slot_id` field is additive and the toast keys on `request_id`, so the watch needs no
change — but do not remove or rename existing payload keys.

### 3.6 The transcript's D-pad edges must be Focusable props, not key events

A keydown-based D-pad router was removed 2026-08-27 as dead code — real controller presses
dispatch no DOM keyboard events (MainTabChatTranscript.tsx:274-283;
docs/audit/spoiler-dpad-01-keydown-dead-code-2026-08-27.md). Every new edge in W2/W17 is an
`onMove*` prop on a `Focusable`, wired per `.cursor/rules/decky-focus-graph.mdc`.

### 3.7 Unstyled hook classes already exist

`bonsai-chat-slot-ghost--prev` / `--next` (ChatSlotRow.tsx:198, :214) and
`bonsai-chat-slot-title--active-stop` (:201) are rendered but styled nowhere. W8 uses the
ghost modifiers for the left/right edge masks. The title active-stop class stays unstyled
(the focused-title treatment covers it) — don't invent a style for it.

---

## 4. Work items — commit order

Format per item: **Goal · Files · Edits · Don't · Verify · Same-commit docs.**

---

### W0 — Wire the dropped props through the payload hook (bug fix, FIRST)

**Goal:** the slot row (and the stopped-ask status line) actually render in the composed
app. §3.0 has the story.

**Files:** `src/features/plugin-shell/tabs/useMainTabPayload.tsx` only.

**Edits:** thread these nine props through ALL THREE of the hook's hand-maintained points
— the destructure block (`const { ... } = props;` ending at :189), the `<MainTab ...>` JSX
(currently ends at `lastExchange`), and the `useMemo` dependency list (the block under the
comment "ANY NEW PROP MUST BE ADDED TO THIS LIST", :299 onward):

`chatSlotSummaries`, `activeChatSlotId`, `onChatSlotCreate`, `onChatSlotSelect`,
`onChatSlotRename`, `onChatSlotDelete`, `onBeforeNestedDeckyModal`,
`onCompleteNestedDeckyModalClose`, `askStopped`.

They are already in the hook's args type (`UseMainTabPayloadArgs` derives from
MainTab's props) and index.tsx already passes them (:1196-1208) — only the middle hop is
missing. Missing a dep-list entry does not fail tsc or any test; it makes the feature
silently stale. Triple-check all nine appear in all three places.

**Don't:** rename anything; add a `{...props}` spread (the hook's design is explicit
enumeration — keep it).

**Verify:** gates; then on device or in `npm run test:preview`: the slot row appears on
the Main tab for the first time. Then run the CHAT-SLOTS-V2-01…06 rows — **especially
-05 (P-0 bumper suppression)**, which gates the rest of this plan (§0 rule 5). Also
confirm the "stopped" status line shows after cancelling an ask (askStopped regression).

**Same-commit docs:** docs/roadmap.md:405 status line and docs/testing.md:202 notes cell —
record that the row was unreachable between `dba34e7` (2026-08-03) and this commit.

---

### W1 — Fix the 21 dead slot-row interpolations (bug fix, own commit)

**Goal:** make the slot-row CSS valid so its sizes actually apply. Values stay exactly as
written today (12/19px titles etc.) — W3 changes values, not this commit.

**Files:** `src/styles/sections/section-6.ts` only.

**Edits:** in lines 516-631, delete the stray `px` after every `${uiScalePx(...)}`
interpolation — 21 occurrences on 20 lines (527, 528, 533×2, 543, 544, 545, 548, 564, 568,
574, 579, 588, 594, 604, 615, 616, 619, 620, 625, 626). Example:
`gap: ${uiScalePx(8)}px;` → `gap: ${uiScalePx(8)};`

**Don't:** change any number; touch anything outside the slot-row block (lines 164 and 491
already use `uiScalePx` correctly — leave them).

**Verify:** `grep -n 'uiScalePx([0-9.]*)}px' src/styles/sections/section-6.ts` returns
nothing; gates pass. On device (after W0) the row renders at its intended sizes for the
first time.

**Same-commit docs:** none.

---

### W2a — Layout inversion, part 1: reorder MainTab + move the context footnote

**Goal:** slot row → transcript → presets → Ask bar → (transient rows) → context line last.

**Files:** `src/components/MainTab.tsx`, `src/components/MainTabChatTranscript.tsx`.

**Edits:**
1. In MainTab.tsx:151-238, reorder the `<PanelSection>` children to:
   ChatSlotRow block (:152-166) → `<MainTabChatTranscript {...props} />` (currently :237)
   → MainTabPresetRow (:167-182) → MainTabUnifiedAskBar (:184-190) → mic-permission row
   (:192-210) → MainTabScreenshotBrowser (:212-229) → navigationMessage (:231-235) →
   the moved context footnote (step 2).
2. Cut the context-footnote block out of MainTabChatTranscript.tsx:849-865 (the
   `bonsai-context-footnote` PanelSectionRow, including its
   `ollamaContext.app_context === "active"` ternary) and paste it as the last child in
   MainTab.tsx — **rewriting its three bare `ollamaContext` references to
   `props.ollamaContext`** (the transcript destructures its props; MainTab uses `props.X`
   throughout and destructures nothing, so a verbatim paste fails tsc).
3. SessionContextStrip, Save-chat row, and the hint rows stay inside the transcript and
   move up with it — deliberate; the mocks don't draw those states and the strip
   self-suppresses when empty (SessionContextStrip.tsx:99).

**Don't:** touch any focus handler in this commit (that's W2b); change the transcript's
internals beyond deleting the footnote block.

**Verify:** gates; `npm run test:preview` renders the new order.

**Same-commit docs:** none (W2b carries the QA rows).

---

### W2b — Layout inversion, part 2: retarget the two explicit focus edges

**Goal:** D-pad Down from the slot row lands in the transcript, and nothing dead-ends.

**Files:** `src/features/chat-slots/ChatSlotRow.tsx`, `src/components/MainTab.tsx`.

**Edits:**
1. ChatSlotRow.tsx:165-168 — the row's `onMoveDown` currently jumps over the transcript:
   ```ts
   onMoveDown: () => {
     focusUnifiedTextField();
     return true;
   },
   ```
   Replace with `onMoveDown: () => false,` so Steam's spatial navigation descends into
   whatever is directly below (transcript stops; presets when the transcript is empty).
   Then remove the now-unused `focusUnifiedTextField` prop from ChatSlotRow's props type
   and from MainTab's ChatSlotRow call site (:161). Keep it on MainTabPresetRow — still
   used there.
2. Nothing else changes: preset chips define no `onMoveUp` (verified — spatial nav
   handles Up into the transcript above), the unified input's
   `onMoveUp: () => focusFirstPresetChip()` (useMainTabAskBarFocus.ts:137-146) is still
   correct, and SessionContextStrip's `onMoveUp` is transcript-internal.
3. **Escape hatch, only if the on-Deck row below fails** (Down from the row skips the
   transcript): add `"chat-transcript-top"` to `NavFocusId`
   (navFocusRegistry.ts:16), register a `navRef` on the first rendered turn-slot
   Focusable in MainTabChatTranscript (mirror ChatSlotRow.tsx:70-73), and make the row's
   `onMoveDown` `return takeNavFocus("chat-transcript-top") ? true : false;`. Do not
   build this preemptively.

Note: the bundle README's "Interactions & behavior (unchanged, shipped — keep)"
paragraph still says "Down → unified input" — that one line is superseded by the turn-8
layout order (D-A); every other line in that paragraph remains a keep-contract.

**Verify:** gates. On-Deck QA (new rows, §6): Down: row → transcript → presets → ask bar;
Up retraces; empty slot: row → presets.

**Same-commit docs:** add QA row CHAT-SLOTS-V3-01 (§6) to docs/testing-manual.md; update
docs/testing.md coverage row + docs/roadmap.md status line for the redesign entry.

---

### W3 — Reviewed type scale + create-position styling

**Goal:** titles 700 14px focused / 13px quiet; `[+]` gets the quiet create style.

**Files:** `src/styles/sections/section-6.ts`, `src/features/chat-slots/ChatSlotRow.tsx`.

**Edits:**
1. section-6.ts:579 — `.bonsai-chat-slot-title` font-size `uiScalePx(12)` → `uiScalePx(13)`.
2. section-6.ts:588 — focused variant font-size `uiScalePx(19)` → `uiScalePx(14)`.
3. Keep colors/text-shadow/max-width 55% exactly as they are.
4. ChatSlotRow.tsx:200-204 — when `isCreatePosition`, add a modifier:
   `bonsai-chat-slot-title--create`. New CSS rule in the slot-row block:
   ```css
   .bonsai-scope .bonsai-chat-slot-title--create {
     font-weight: 700;
     font-size: ${uiScalePx(13)};
     color: rgba(200, 214, 230, 0.45);
   }
   ```
   (Same size focused or not — the create position doesn't scale up.) Place it AFTER the
   `--focused .bonsai-chat-slot-title` rule so it wins while focused.
5. **No dots at the create position** (README item 7 / D-I — the shipped gate misses
   this): ChatSlotRow.tsx:217 `{orderedSlots.length > 0 ? (` →
   `{orderedSlots.length > 0 && !isCreatePosition ? (`.

**Don't:** touch the ghost/pill/dot sizes here.

**Verify:** gates; visual check in `npm run test:preview` — and cycling to `[+]` shows no
dots.

**Same-commit docs:** none.

---

### W4 — Delete the eyebrow (6a/D4)

**Files:** `src/features/chat-slots/ChatSlotRow.tsx`, `src/styles/sections/section-6.ts`.

**Edits:** delete ChatSlotRow.tsx:195 (`{focused ? <div className="bonsai-chat-slot-eyebrow">CHAT SLOT</div> : null}`)
and the CSS rule section-6.ts:563-569. Grep `bonsai-chat-slot-eyebrow` afterwards — zero hits.

**Verify:** gates.

**Same-commit docs:** none (no doc mentions the eyebrow as a QA row).

---

### W5 — Pills render only while the row has focus (8a → B, literal D5)

**Goal:** quiet row shows no LB/RB pills and the centre block widens to ~284px; pills
appear when focus arrives. The title re-cut on focus edges is accepted (the board drew it).

**Files:** `src/features/chat-slots/ChatSlotRow.tsx`.

**Edits:** wrap both pill spans in the existing `focused` state (ChatSlotRow.tsx:65):
- :193 → `{focused ? <span className="bonsai-chat-slot-bumper-pill">LB</span> : null}`
- :228 → `{focused ? <span className="bonsai-chat-slot-bumper-pill">RB</span> : null}`

Conditional render, not CSS — that is the letter of D5. Keep both CSS rules
(section-6.ts:538-557): the base rule still sizes the pill; the focused-row variant is now
the only state that ever renders, which is fine.

**Don't:** reserve gutter widths (explicitly reversed by 8a→B); touch `onButtonDown` (LB/RB
still cycle regardless of pill visibility — the pills are labels, not buttons).

**Verify:** gates; preview shows no pills at rest, pills on focus.

**Same-commit docs:** none.

---

### W6 — Boundary dimming at carousel ends (D8, item 6)

**Goal:** while the row is focused, the pill for a dead direction dims: border
rgba(168,182,198,.28), text rgba(168,182,198,.4), no glow.

**Files:** `src/features/chat-slots/ChatSlotRow.tsx`, `src/styles/sections/section-6.ts`.

**Edits:**
1. ChatSlotRow.tsx — the LB pill is dead at the create position, the RB pill at the last
   slot:
   ```tsx
   {focused ? (
     <span className={`bonsai-chat-slot-bumper-pill${carouselIndex === 0 ? " bonsai-chat-slot-bumper-pill--dead" : ""}`}>LB</span>
   ) : null}
   ...
   {focused ? (
     <span className={`bonsai-chat-slot-bumper-pill${carouselIndex >= positionCount - 1 ? " bonsai-chat-slot-bumper-pill--dead" : ""}`}>RB</span>
   ) : null}
   ```
   (`positionCount` is declared at ChatSlotRow.tsx:53.)
2. section-6.ts, after the focused-pill rule (:552-557):
   ```css
   .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-bumper-pill--dead {
     border-color: rgba(168, 182, 198, 0.28);
     color: rgba(168, 182, 198, 0.4);
     background: transparent;
     box-shadow: none;
   }
   ```

**Verify:** gates; preview at first/last position.

**Same-commit docs:** none.

---

### W7 — Cap 8 (6d/R3): backend, dots, and every "5" in the docs

**Goal:** 8 slots max; dots cover all 8.

**Files:** `py_modules/backend/services/chat_slot_service.py`,
`src/features/chat-slots/ChatSlotRow.tsx`, `tests/test_chat_slot_service.py`, docs.

**Edits:**
1. chat_slot_service.py:18 — `MAX_CHAT_SLOTS = 5` → `8`. The enforcement sites read the
   constant (:178, :206, :268, :273, :276; :301 is the prune call that applies it); no
   other backend change.
2. ChatSlotRow.tsx:39 — `const MAX_DOTS = 5;` → `8`.
3. tests/test_chat_slot_service.py — the suite uses the constant relatively
   (`MAX_CHAT_SLOTS + 2`, `assertLessEqual(..., MAX_CHAT_SLOTS)`, :187-191) so nothing
   breaks; rename `test_prune_at_five_slots` → `test_prune_at_cap` so the name stops lying.
4. Docs in the same commit: roadmap.md:404 "Up to 5 named" → "Up to 8 named";
   testing-manual.md:282 "cap of 5" → "cap of 8" (row CHAT-SLOTS-V2-06 wording).

**Verify:** `npm run test:py`, gates. Note MAX_DOTS (display) and MAX_CHAT_SLOTS (backend)
are independent constants that must agree — this commit is what makes them both 8.

---

### W8 — Ghost neighbours: quiet, edge-hugging, masked (8b → A, item 4)

**Goal:** ghosts stay at 300px, restyled per mock 5b.

**Files:** `src/styles/sections/section-6.ts` (JSX already renders `--prev`/`--next`).

**Edits:** replace the body of `.bonsai-chat-slot-ghost` (section-6.ts:602-611) with:
```css
.bonsai-scope .bonsai-chat-slot-ghost {
  flex: 1 1 0;
  min-width: 0;
  font-size: ${uiScalePx(11)};
  color: rgba(200, 214, 230, 0.28);
  filter: blur(0.7px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}
.bonsai-scope .bonsai-chat-slot-ghost--prev {
  margin-left: ${uiScalePx(4)};
  text-align: left;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 55%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 55%);
}
.bonsai-scope .bonsai-chat-slot-ghost--next {
  margin-right: ${uiScalePx(4)};
  text-align: right;
  -webkit-mask-image: linear-gradient(90deg, #000 45%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 45%, transparent 100%);
}
```
Changes from shipped: `flex: 0 1 auto` → `1 1 0` (drop `max-width: 22%` — the README's old
22% figure was wrong, the markup is canonical), alpha .18 → .28, add blur, masks, 4px edge
inset. The blur is optional polish (it quantizes away at 1× handheld; the alpha does the
work) — keep it, it costs nothing.

**Don't:** change the `showGhosts = orderedSlots.length > 1` gate (ChatSlotRow.tsx:84) —
hidden at ≤1 slot is shipped behavior, keep.

**Verify:** gates; preview with 3+ slots, long names.

**Same-commit docs:** none.

---

### W9 — Red destructive × (item 5, mock 5b)

**Goal:** the delete stop becomes a red 22×22 box when it is the active D-pad stop; quiet
state stays the shipped gray glyph.

**Files:** `src/styles/sections/section-6.ts`.

**Edits:** keep `.bonsai-chat-slot-delete` (:592-598) as the quiet state but give it the
box so the row doesn't shift when the stop activates:
```css
.bonsai-scope .bonsai-chat-slot-delete {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${uiScalePx(22)};
  height: ${uiScalePx(22)};
  border-radius: ${uiScalePx(6)};
  border: 1px solid transparent;
  font-size: ${uiScalePx(15)};
  font-weight: 700;
  line-height: 1;
  color: rgba(168, 182, 198, 0.55);
  opacity: 0.85;
}
.bonsai-scope .bonsai-chat-slot-delete--active-stop {
  color: #f16a5a;
  border-color: rgba(224, 74, 58, 0.8);
  background: rgba(26, 14, 12, 0.55);
  box-shadow: 0 0 10px 1px rgba(224, 74, 58, 0.25);
  opacity: 1;
}
```
(The transparent border in the quiet state reserves the 1px so activation doesn't nudge
layout.)

Deliberate deviation from the README's "Unfocused stop stays the shipped quiet gray": the
quiet COLOR stays (rgba(168,182,198,.55)), but the glyph adopts the 15px/700 spec and the
22×22 box in both states so activating the stop can't shift the row. "Shipped quiet gray"
refers to the color.

**Verify:** gates; preview: Right from title → red box; Left returns.

**Same-commit docs:** design-tokens.md — add the destructive-red family to the Named
constants table: `#f16a5a` (glyph), `rgba(224,74,58,…)` (border/glow family, base hex
`#e04a3a`), and `#f28b7d` (mock 5c's hover shade — record it as "reserved, no consumer:
5c's custom footer was dropped by 8d"). Extend the :68-71 callout (which currently says
`#f87171` doubles as Expert + delete) with one line: the chat-slot delete stop uses the
`#f16a5a`/`rgba(224,74,58,…)` family, distinct from the Expert accent.

---

### W10 — Focused-title marquee on overflow

**Goal:** a focused title longer than its window scrubs end-to-end (~5s ease forward, ~1s
snap back), focused row only, `prefers-reduced-motion` guarded.

**Files:** `src/features/chat-slots/ChatSlotRow.tsx`, `src/styles/sections/section-6.ts`.

**Why not CSS-only:** CSS can't detect overflow, and `text-overflow: ellipsis` clips the
text so a transform would just slide the ellipsized fragment. So: an inner span carries the
text, a tiny effect measures overflow and sets a CSS var; the animation only attaches when
the `--overflowing` class is present.

**Edits:**
1. ChatSlotRow.tsx — add `useLayoutEffect` to the react import at line 8 (it is not
   imported today), then wrap the label in an inner span and measure:
   ```tsx
   const titleWindowRef = useRef<HTMLSpanElement | null>(null);
   const titleInnerRef = useRef<HTMLSpanElement | null>(null);
   const [titleOverflows, setTitleOverflows] = useState(false);

   useLayoutEffect(() => {
     const win = titleWindowRef.current;
     const inner = titleInnerRef.current;
     if (!focused || !win || !inner) {
       setTitleOverflows(false);
       return;
     }
     const overflow = inner.scrollWidth - win.clientWidth;
     if (overflow > 1) {
       win.style.setProperty("--bonsai-slot-title-overflow", `${overflow}px`);
       setTitleOverflows(true);
     } else {
       setTitleOverflows(false);
     }
   }, [focused, centerLabel]);
   ```
   JSX (replacing :200-204):
   ```tsx
   <span
     ref={titleWindowRef}
     className={`bonsai-chat-slot-title${focusStop === "title" ? " bonsai-chat-slot-title--active-stop" : ""}${isCreatePosition ? " bonsai-chat-slot-title--create" : ""}${titleOverflows ? " bonsai-chat-slot-title--overflowing" : ""}`}
   >
     <span ref={titleInnerRef} className="bonsai-chat-slot-title-inner">{centerLabel}</span>
   </span>
   ```
2. section-6.ts, in the slot-row block:
   ```css
   .bonsai-scope .bonsai-chat-slot-title-inner {
     display: inline-block;
     white-space: nowrap;
   }
   .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-title--overflowing {
     text-overflow: clip;
   }
   .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-title--overflowing .bonsai-chat-slot-title-inner {
     animation: bonsai-slot-title-scrub 6s ease-in-out infinite;
   }
   @keyframes bonsai-slot-title-scrub {
     0% { transform: translateX(0); }
     75% { transform: translateX(calc(-1 * var(--bonsai-slot-title-overflow, 0px))); }
     83% { transform: translateX(calc(-1 * var(--bonsai-slot-title-overflow, 0px))); }
     100% { transform: translateX(0); }
   }
   @media (prefers-reduced-motion: reduce) {
     .bonsai-scope .bonsai-chat-slot-title-inner {
       animation: none !important;
     }
   }
   ```
   (0→75% ≈ 4.5s forward, brief hold, ~1s back. Precedent for the media query:
   section-6.ts:36-43.)

**Don't:** run it on quiet rows (the selector already gates on `--focused`); animate more
than `transform`. Known accepted edge: the measure re-runs on `[focused, centerLabel]`
only, so a resize with both unchanged (a UI-scale settings change, or a ghost
mounting/unmounting from a summaries refresh while the same slot stays focused) can leave
a stale sweep distance until the next focus change. Accept it — do not add a
ResizeObserver unless device QA shows it mattering.

**Verify:** gates; preview with a long name — sweep runs focused, stops on blur; short
names never animate.

**Same-commit docs:** QA row CHAT-SLOTS-V3-02 (§6).

---

### W11 — Empty-slot state + create-position preview + placeholder italics (8f → B, items 7/11)

**Goal:** an empty slot (and the `[+]` position) shows the 52px silhouette + caption
directly under the slot row instead of nothing.

**Files:** `src/components/MainTabChatTranscript.tsx`, `src/components/MainTab.tsx`,
`src/features/chat-slots/ChatSlotRow.tsx`, `src/styles/sections/section-6.ts`,
(`src/components/icons.tsx` import only).

**Edits:**
1. **Create-position signal.** The transcript can't see the row's internal carousel state
   (cycling to `[+]` deliberately doesn't change the active slot — ChatSlotRow.tsx:90
   `if (clamped === 0) return;`). Add an optional prop to ChatSlotRow:
   `onCreatePositionChange?: (atCreate: boolean) => void`, called from a small effect on
   `isCreatePosition`:
   ```tsx
   useEffect(() => {
     onCreatePositionChange?.(isCreatePosition);
   }, [isCreatePosition, onCreatePositionChange]);
   ```
   In MainTab.tsx hold `const [slotRowAtCreate, setSlotRowAtCreate] = useState(false);`,
   pass the setter into ChatSlotRow and `slotRowAtCreate` into MainTabChatTranscript as a
   new optional prop `showEmptySlotPreview?: boolean`.
2. **Empty state block** in MainTabChatTranscript, rendered when
   `showEmptySlotPreview || (askThreadCollapsed.length === 0 && !showLiveTurn)` — i.e. it
   REPLACES the turn column at the `:445` gate position (when `showEmptySlotPreview` is
   true it renders instead of the turns even if the previous slot had content — that is the
   drawn behavior of 8f):
   ```tsx
   <div className="bonsai-chat-empty-state" aria-hidden>
     <img src={bonsaiLogo} className="bonsai-chat-empty-logo" alt="" />
     <div className="bonsai-chat-empty-caption">Ask anything — this slot keeps its own history.</div>
   </div>
   ```
   Import `bonsaiLogo` the way icons.tsx:10 does
   (`import bonsaiLogo from "../assets/icons/bonsai-logo.svg";`).
3. CSS (section-6.ts, near the slot-row block):
   ```css
   .bonsai-scope .bonsai-chat-empty-state {
     display: flex;
     flex-direction: column;
     align-items: center;
     gap: ${uiScalePx(8)};
     padding: ${uiScalePx(14)} 0 ${uiScalePx(6)};
   }
   .bonsai-scope .bonsai-chat-empty-logo {
     width: ${uiScalePx(52)};
     height: ${uiScalePx(52)};
     opacity: 0.16;
     filter: grayscale(1) brightness(1.7);
   }
   .bonsai-scope .bonsai-chat-empty-caption {
     font-style: italic;
     font-size: ${uiScalePx(13)};
     line-height: 1.55;
     max-width: ${uiScalePx(210)};
     text-align: center;
     color: rgba(143, 168, 196, 0.5);
   }
   ```
   Not focusable — no Focusable wrapper, no focus-graph entry needed. It sits directly
   under the slot row (not vertically centred) per the locked layout order.
4. **Ask-bar placeholder**: reality check first — outside strategy mode the unified
   input has NO placeholder at all (the prop is only set when `askMode === "strategy"`,
   MainTabUnifiedAskBar.tsx:249-253), and the strategy placeholder has two render paths:
   the native `::placeholder` rule at section-5.ts:123-126 (font-size only) and the
   overlay span `.bonsai-unified-input-strategy-placeholder`, already italic at 0.4
   opacity (section-6.ts:70-74). So the edit is: add `font-style: italic` and a
   0.45-alpha color to the section-5 `::placeholder` rule, and bump the overlay span's
   opacity 0.4 → 0.45 so the two paths match. **Do not** invent a default-mode
   placeholder string — the mocks draw "Ask anything…" in the field, but adding one is a
   content change outside this redesign (flagged to the maintainer, §5).

**Verify:** gates; preview: fresh slot shows the mark; `[+]` position shows it over a
non-empty previous slot; creating + asking replaces it with the live turn.

**Same-commit docs:** QA row CHAT-SLOTS-V3-03 (§6).

---

### W12 — Answer-card wash (8c → B, item 14)

**Goal:** a constant 11%-alpha wash of the accent lifted 40% toward white, layered over the
shipped gradient. The shipped gradient itself does not change.

**Files:** `src/data/characterUiAccent.ts`, `src/styles/sections/section-6.ts`,
`src/data/characterUiAccent.test.ts`.

**Edits:**
1. characterUiAccent.ts — add next to `darkenRgb` (:73-79):
   ```ts
   function liftRgb(rgb: Rgb, factor: number): Rgb {
     return {
       r: Math.max(0, Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor))),
       g: Math.max(0, Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor))),
       b: Math.max(0, Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor))),
     };
   }
   ```
   In `buildChatAiBubbleScopeVars` (:112-124) add one var:
   ```ts
   ["--bonsai-chat-ai-bubble-wash" as string]: r(liftRgb(m, 0.4), 0.11),
   ```
2. section-6.ts:311-321 — the bubble background becomes two layers (wash on top, shipped
   gradient underneath; fallback = forest green #2e8753 lifted 40% = rgb(130,183,152)):
   ```css
   background:
     linear-gradient(
       0deg,
       var(--bonsai-chat-ai-bubble-wash, rgba(130, 183, 152, 0.11)),
       var(--bonsai-chat-ai-bubble-wash, rgba(130, 183, 152, 0.11))
     ),
     linear-gradient(
       180deg,
       var(--bonsai-chat-ai-bubble-bg-top, rgba(46, 135, 83, 0.12)) 0%,
       var(--bonsai-chat-ai-bubble-bg-bottom, rgba(18, 52, 34, 0.55)) 100%
     ) !important;
   ```
3. Test (characterUiAccent.test.ts already asserts one var value as precedent, :62-72):
   add an assert that the wash for main `#6c3483` (bg3_shadowheart — the darkest accent in
   the map, the case the lift exists for) is `"rgba(167, 133, 181, 0.11)"`.
   Arithmetic: 108+(255−108)×.4=166.8→167; 52+(255−52)×.4=133.2→133;
   131+(255−131)×.4=180.6→181.

**Don't:** change `--bonsai-chat-ai-bubble-bg-top/bottom/border/text/chunk-border`; make
the lift conditional on luminance (the review decided: lifted at EVERY accent).

**Verify:** gates + the new unit test.

**Same-commit docs:** design-tokens.md — note the wash var + formula
(`lift = v + (255−v)×0.4`, alpha 0.11) beside the bubble-surface tokens.

---

### W13 — Streaming keeps the accent border (item 12, mock 7a)

**Goal:** streaming reads as cyan glow + the (already-shipped) blinking caret; the border
no longer swaps to cyan.

**Files:** `src/styles/sections/section-6.ts`.

**Edits:** delete the two `border-color: var(--bonsai-stream-preview-border, …) !important;`
lines — :333 (`--stream-preview`) and :337 (`--fence-wait`). Keep the pulse animation
(:334, :339-346), the fence-wait spinner, and the caret rules (:386-397) untouched, except
one value: the pulse's 50% peak (section-6.ts:344) changes from
`0 0 8px 1px rgba(56, 189, 248, 0.32)` to `0 0 8px 1px rgba(56, 189, 248, 0.28)` — the
drawn spec's alpha (README item 12), a deliberate .04 reduction from shipped.

Since `--bonsai-stream-preview-border` was read only at those two lines and set nowhere
(verified — and no doc mentions it), the var is simply gone after this commit.

**Note:** the fence-wait border-swap removal is an interpretation — the design only says
"the border no longer turns cyan" for streaming, and fence-wait is a streaming sub-state.
Both swaps go for consistency.

**Verify:** gates; preview a streaming answer: accent border + pulse + caret.

---

### W14 — Modals at the decided fidelity (8d → A flattened, items 8/9/10)

**Goal:** stock ConfirmModal shell; our styling is the body only, flat. Rename gets the
cyan field + disabled-empty Save; delete gets the destructive footer.

**Files:** `src/features/chat-slots/ChatSlotRenameModal.tsx`,
`src/features/chat-slots/ChatSlotRow.tsx`, a new
`src/styles/sections/chatSlotModal.ts`, `src/styles/sections/gamepadAndPullModels.ts`.

**Edits:**
1. New `src/styles/sections/chatSlotModal.ts` (module header per docs/code-clarity.md):
   ```ts
   export function buildChatSlotModalStylesheet(): string {
     return `
       .bonsai-scope .bonsai-chat-slot-modal-label {
         font-size: 10px;
         font-weight: 700;
         letter-spacing: 0.1em;
         color: rgba(143, 168, 196, 0.8);
         margin-bottom: 6px;
         text-align: left;
       }
       .bonsai-scope .bonsai-chat-slot-modal-field input {
         height: 36px;
         border-radius: 8px;
         background: rgba(18, 26, 34, 0.55);
         border: 1px solid rgba(156, 231, 255, 0.5);
         box-shadow: 0 0 10px rgba(156, 231, 255, 0.12);
         font-size: 14px;
         font-weight: 600;
         color: #e8eef5;
         caret-color: #9ce7ff;
       }
     `;
   }
   ```
   (Plain px, not `uiScalePx` — the modal portal renders in Steam's dialog at Steam's
   scale, outside the QAM column; `BonsaiModalScope` handles UI-scale vars itself.)
2. gamepadAndPullModels.ts:92-94 — append it to the portal stylesheet:
   `return \`${buildGamepadFocusRingStylesheet()}${buildPullModelsStylesheet()}${buildChatSlotModalStylesheet()}\`;`
   (import it at the top).
3. ChatSlotRenameModal.tsx:22-39 —
   - add `bOKDisabled={!label.trim()}` to the ConfirmModal;
   - body becomes:
     ```tsx
     <BonsaiModalScope>
       <div className="bonsai-chat-slot-modal-label">SLOT NAME</div>
       <div className="bonsai-chat-slot-modal-field">
         <TextField value={label} onChange={(e) => setLabel(e.target.value)} focusOnMount />
       </div>
     </BonsaiModalScope>
     ```
     (drop TextField's `label="Slot name"` prop — the styled label div replaces it; keep
     `strTitle`, buttons, `onOK`/`onCancel` exactly as they are). `focusOnMount` is a typed
     TextField prop (TextField.d.ts:16); verify on device that it doesn't fight the
     modal-survival focus dance — if it does, remove it and note that in the QA row.
   - Keep the downstream empty-guard (`useChatSlotRenameModal.tsx:41`) — it becomes
     unreachable belt-and-braces, which is fine.
4. ChatSlotRow.tsx:120-132 (delete confirm) — add `bDestructiveWarning` to the
   ConfirmModal props. Copy stays verbatim:
   `Delete "<label>" and its transcript? This cannot be undone.` No other footer styling —
   mock 5c's red-button specs apply only through supported props, and this is the
   supported prop.
5. Nothing else: no inner glass panel ("container inside a container inside a popup" was
   explicitly dropped in review), no hint badges (Steam's footer draws its own), no
   attempt to style Steam's shell (decided: not worth the device round-trip).

**Verify:** gates; preview/device: rename modal shows cyan field, Save disabled while
empty; delete confirm shows Steam's destructive styling.

**Same-commit docs:** QA row CHAT-SLOTS-V3-04 (§6).

---

### W15 — Backend: `chat_slot_id` in the status payload + the no-cross-paint guard (D-K)

**Goal:** the frontend can tell which slot an in-flight or just-finished answer belongs
to; until W16, cycling away mid-stream shows the quiet row (never another slot's tokens).

**Files:** `py_modules/backend/services/background_request_state.py`, `main.py`,
`src/types/backgroundAsk.ts`, `src/hooks/useBonsaiAskOrchestration.ts`, a Python test.

**Edits:**
1. background_request_state.py — `new_background_state()` (:16-40) gains
   `"chat_slot_id": None`. `pending_background_state(...)` (signature at :42-50, keyword-
   only args, body through :64) gains a `chat_slot_id: str | None = None` parameter and
   includes `"chat_slot_id": chat_slot_id` in its `state.update(...)`.
2. main.py — in `start_background_game_ai`, where the pending state is built and
   `self._chat_slot_by_request[request_id] = chat_slot_id` is written (:2687-2705), pass
   the same `chat_slot_id` (or `None`) into `pending_background_state`. **Do not** read
   `_chat_slot_by_request` inside `_merge_partial_into_background_status` — the map is
   pop()ed at terminal (main.py:2499, :2840) before the frontend's terminal poll, which is
   exactly when the unread logic needs the id (§3.4). Riding the state dict means the
   terminal write's `**self._background_state` spread (:2475-2497) preserves it for free.
3. src/types/backgroundAsk.ts — add to `BackgroundRequestStatus` (:40-78):
   `chat_slot_id?: string | null;`
4. useBonsaiAskOrchestration.ts, in `applyBackgroundStatusToUi` (:486) — gate the
   **paint** writes, not the bookkeeping. In the pending branch (:501-549):
   ```ts
   const payloadSlotId = typeof status.chat_slot_id === "string" ? status.chat_slot_id : null;
   const activeSlotIdNow = a.activeSlotIdRef?.current ?? null;
   const paintsForeignSlot = Boolean(payloadSlotId && activeSlotIdNow && payloadSlotId !== activeSlotIdNow);
   ```
   When `paintsForeignSlot`, in the pending branch: still run `setOllamaContext(...)`
   and `setIsAsking(true)` (the backend IS busy; the ask bar must know), but **actively
   write the quiet values instead of merely skipping** — nothing else ever clears slot
   A's paint after a slot switch (`selectSlot`/`applySlotTranscript` resets the archived
   thread but NOT the live paint; the `resetLiveAskPresentation` hook arg that would is
   not wired, index.tsx:482-488):
   `setOllamaResponse("")`, `setThinkingSummary(null)`, `setIsStreamingPreview(false)`,
   `setIsStreamSettling(false)`, and skip `setAskThreadDisplayQuestion` (idempotent per
   poll — cheap). Returning to the origin slot flips `paintsForeignSlot` back to false and
   the next poll repaints question + partial + caret automatically — that IS mock 7c's
   restore-on-return; no extra code.
   **The phantom-live-header problem:** `setIsAsking(true)` keeps `showLiveTurn` true
   (MainTabChatTranscript.tsx:233-234), so slot B would still show an empty live header
   and W11's empty state could never render. Fix in the same commit: the hook returns a
   new boolean `isForeignPendingAsk` (true exactly when a pending poll had
   `paintsForeignSlot`), index.tsx threads it to MainTab — **remember the W0 lesson: the
   payload hook's destructure + JSX + dep list, all three** — MainTab passes it to
   MainTabChatTranscript as an optional prop, and the transcript's `showLiveTurn`
   calculation (:233-234) excludes the `isAsking` contribution when it is set:
   `Boolean(liveQuestion) || (isAsking && !isForeignPendingAsk) || (showLiveResponse && expandedTurnKey === "live")`.
   In the terminal branch (:585-665), when `paintsForeignSlot`: gate
   `setOllamaResponse`, `setAskThreadDisplayQuestion`, `setThinkingSummary`,
   `setIsStreamingPreview`/`setIsStreamSettling` (including the
   `streamPreviewActiveRef` settling path at :597-599 — never `setIsStreamSettling(true)`
   for a foreign terminal), `setShortcutSetupVariant` (:590), and `setLastExchange`
   (:654 — otherwise slot B's newest turn grows a feedback/retry row acting on A's
   answer, MainTabChatTranscript.tsx:507-529; accept that A's feedback row stays empty
   until a later reload). Keep: `setIsAsking(false)`, `setLastRequestId`, disclosure /
   reseed / toast bookkeeping, and `onSlotTurnsChanged` (so the origin slot's saved turn
   exists when the user returns).
5. Python test: extend the background-state test suite (grep tests/ for
   `background_request_state`) — assert `new_background_state()["chat_slot_id"] is None`
   and that `pending_background_state(..., chat_slot_id="abc")` carries it. If no suite
   exists, add `tests/test_background_request_state_slot_id.py` following the pattern of
   the nearest state test.
6. `bonsaiAskCompletionWatch.ts` / the reply-ready toast: **no change** — additive field,
   toast keys on `request_id` (§3.5).

**Verify:** `npm run test:py`, gates. Manual: start an ask in slot A, LB to slot B —
B shows its own (or empty) transcript, no A tokens; return to A — question + partial +
caret are back.

**Same-commit docs:** QA rows CHAT-SLOTS-V3-05a/05b (§6); roadmap status line.

---

### W16 — Mid-generation dot language + ghost sparks + unread (7b–7d, item 12)

**Goal:** hollow cyan ring = generating, solid green = finished unread; matching 6px spark
at the row edge when that slot is the visible ghost; unread clears on return.

**Depends on W15.**

**Files:** `src/index.tsx` (or the plugin-shell tab-payload hook that feeds MainTab),
`src/components/MainTab.tsx`, `src/features/chat-slots/ChatSlotRow.tsx`,
`src/styles/sections/section-6.ts`.

**Edits:**
1. **State** (frontend only, session-lived — the QAM-closed case is already covered by
   the reply-ready toast, so nothing persists):
   - `generatingSlotId: string | null` — from each poll:
     `status.status === "pending" ? status.chat_slot_id ?? null : null`.
   - `unreadSlotIds: Set<string>` — on a terminal success whose `chat_slot_id` differs
     from the active slot, add it; whenever the active slot changes to an id in the set,
     remove it.
   Put both next to the existing chat-slot state wiring in index.tsx (near :149
   `activeSlotIdRef`); update from `applyBackgroundStatusToUi` via two new optional
   callback args (mirror how `onSlotTurnsChanged` is threaded,
   useBonsaiAskOrchestration.ts:144). `generatingSlotId` also supersedes W15's
   `isForeignPendingAsk` if you prefer to derive the latter from it — either is fine, but
   don't keep two sources of truth. Expect the plumbing tax: index.tsx, **useMainTabPayload
   (destructure + JSX + dep list — the W0 failure mode)**, MainTab props, ChatSlotRow
   props (CLAUDE.md documents this cost; it is real, budget for it).
2. **ChatSlotRow** — new optional props `generatingSlotId?: string | null`,
   `unreadSlotIds?: ReadonlySet<string>`. Dot classes (:219-225): after the `--active`
   check, add `--pending` when `slot.id === generatingSlotId`, `--unread` when
   `unreadSlotIds?.has(slot.id)` (pending wins if both somehow apply).
3. **Ghost sparks** — a sibling flex item at the row edge, OUTSIDE the ghost span (so the
   ghost's mask/blur don't eat it): immediately before the `--prev` ghost / after the
   `--next` ghost, when that ghost's slot is generating or unread:
   ```tsx
   {showGhosts && prevSlot && (prevSlot.id === generatingSlotId || unreadSlotIds?.has(prevSlot.id)) ? (
     <span className={`bonsai-chat-slot-ghost-spark${prevSlot.id === generatingSlotId ? " bonsai-chat-slot-ghost-spark--pending" : " bonsai-chat-slot-ghost-spark--unread"}`} aria-hidden />
   ) : null}
   ```
   (mirror for `nextSlot`, spark after the ghost).
4. **CSS** (slot-row block; sizes per item 12, one visual axis per state):
   ```css
   .bonsai-scope .bonsai-chat-slot-dot--pending {
     width: ${uiScalePx(6)};
     height: ${uiScalePx(6)};
     background: transparent;
     border: 1.5px solid rgba(56, 189, 248, 0.9);
     box-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
   }
   .bonsai-scope .bonsai-chat-slot-dot--unread {
     width: ${uiScalePx(6)};
     height: ${uiScalePx(6)};
     background: #4ade80;
     box-shadow: 0 0 6px rgba(74, 222, 128, 0.6);
   }
   .bonsai-scope .bonsai-chat-slot-ghost-spark {
     flex: 0 0 auto;
     width: ${uiScalePx(6)};
     height: ${uiScalePx(6)};
     border-radius: 50%;
     align-self: center;
   }
   .bonsai-scope .bonsai-chat-slot-ghost-spark--pending {
     background: transparent;
     border: 1.5px solid rgba(56, 189, 248, 0.9);
     box-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
   }
   .bonsai-scope .bonsai-chat-slot-ghost-spark--unread {
     background: #4ade80;
     box-shadow: 0 0 6px rgba(74, 222, 128, 0.6);
   }
   ```
   Place the `--pending`/`--unread` dot rules after `--active` — AND add two
   higher-specificity overrides, because the shipped focused-row rule
   `.bonsai-chat-slot-row--focused .bonsai-chat-slot-dot--active` (section-6.ts:629-631,
   specificity 0-3-0) would otherwise fill the pending ring solid cyan exactly when the
   user is looking at the row (active + generating is the common case right after
   cycling):
   ```css
   .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-dot--pending {
     background: transparent;
   }
   .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-dot--unread {
     background: #4ade80;
   }
   ```
5. **Behavior already handled elsewhere — do not rebuild:** cycling away never cancels
   (backend map, CHAT-SLOTS-V2-03); restore-on-return is the W15 guard un-gating; Stop
   lives on the answer card only (shipped Stop path) — pressing it from another slot is
   not offered, you return first.
6. Add a vitest for the pure part: dot class selection given
   `generatingSlotId`/`unreadSlotIds` (render ChatSlotRow with fake summaries, assert the
   class names). This is the feature's first component test — the fakeDeckyRpc harness in
   `src/test-harness/` is the pattern.

**Verify:** gates + new test. Device: 7b (spark + ring while away), 7c (return
mid-stream), 7d (green unread, clears on return).

**Same-commit docs:** QA rows CHAT-SLOTS-V3-06a/06b/06c (§6); roadmap + testing.md.

---

### W17 — "N earlier" collapsed-history pill (item 13, 8e → A, D-G)

**Goal:** with ≥2 archived turns, one pill above the newest turn replaces the archived
header rows; A expands them inline (pill disappears); exactly 1 archived turn renders its
header row directly.

**Files:** `src/components/MainTabChatTranscript.tsx`, `src/styles/sections/section-6.ts`.

**Edits:**
1. State: `const [earlierExpanded, setEarlierExpanded] = useState(false);` — reset it when
   the slot's turns change identity (e.g. key the effect on the first archived turn id /
   `askThreadCollapsed.length` dropping to 0) so a slot switch re-collapses.
2. Render, inside the turn column (:459 onward). **"Earlier" must never include the
   newest visible turn.** On the ordinary path the newest turn is ARCHIVED, not live:
   after a completed Ask and after every QAM reopen, `applySlotTranscript` archives all
   turns and points `expandedTurnKey` at the newest archived id (useChatSlots.ts:70), so
   `showLiveTurn` is false — collapsing ALL archived turns would hide the newest answer
   (and the expanded key would name an invisible row). So:
   ```ts
   const earlierTurns = showLiveTurn ? askThreadCollapsed : askThreadCollapsed.slice(0, -1);
   const newestArchived = showLiveTurn ? null : askThreadCollapsed[askThreadCollapsed.length - 1];
   const earlierCount = earlierTurns.length;
   ```
   The newest archived turn (when there is one) ALWAYS renders below the pill, exactly as
   the archived map renders it today.
   - `earlierCount >= 2 && !earlierExpanded` → render the pill INSTEAD of the
     `earlierTurns` header rows (the shipped map at :460-580, restricted to
     `earlierTurns`):
     ```tsx
     <Focusable
       className="bonsai-chat-earlier-pill-row"
       onActivate={() => setEarlierExpanded(true)}
       onOKButton={() => setEarlierExpanded(true)}
     >
       <span className="bonsai-chat-earlier-pill">{earlierCount} earlier</span>
       <span className="bonsai-chat-earlier-rule" />
     </Focusable>
     ```
   - `earlierCount === 1 || earlierExpanded` → render the `earlierTurns` header rows
     exactly as the map renders them today (followed, always, by `newestArchived` and/or
     the live turn).
   Header rows show the title only — there is no "N msgs" count in this codebase and none
   is added (§3.2).
3. Focus: the pill is a plain Focusable stop in document flow between the slot row and
   the newest turn — spatial navigation reaches it from both sides; no onMove* overrides
   needed unless device QA says otherwise (§3.6, Rule 8). **Focus hand-off on expand:**
   after `setEarlierExpanded(true)` the pill unmounts and focus would be orphaned — keep a
   callback ref on the first archived turn-slot Focusable and `TakeFocus` it in a
   `useLayoutEffect` that runs when `earlierExpanded` flips true (mirror the
   `navRef.current?.TakeFocus(true)` pattern from navFocusRegistry.ts:42-53). Verify on
   device.
4. CSS (new, near the transcript rules; pill spec from item 13 / board 8e):
   ```css
   .bonsai-scope .bonsai-chat-earlier-pill-row {
     display: flex;
     align-items: center;
     gap: ${uiScalePx(8)};
     opacity: 0.55;
     margin: ${uiScalePx(2)} 0 ${uiScalePx(6)};
   }
   .bonsai-scope .bonsai-chat-earlier-pill {
     font-size: ${uiScalePx(10)};
     font-weight: 600;
     letter-spacing: 0.04em;
     color: rgba(200, 214, 230, 0.85);
     padding: ${uiScalePx(3)} ${uiScalePx(10)};
     border-radius: 999px;
     border: 1px solid rgba(255, 255, 255, 0.14);
     background: rgba(18, 26, 34, 0.5);
     white-space: nowrap;
   }
   .bonsai-scope .bonsai-chat-earlier-rule {
     flex: 1;
     height: 1px;
     background: rgba(255, 255, 255, 0.09);
   }
   ```
5. Vitest: pill renders at 2+ archived turns, not at 1, not at 0; expanding reveals the
   headers and removes the pill (MainTabChatTranscript has existing test files to extend).

**Verify:** gates + tests. Device: pill is a D-pad stop; A expands; focus lands on the
first revealed header.

**Same-commit docs:** focus-graph note per `.cursor/rules/decky-focus-graph.mdc` (new
control → D-pad row in testing-manual.md): QA row CHAT-SLOTS-V3-07 (§6).

---

### W18 — Docs sweep (last commit)

**Files:** `docs/roadmap.md`, `docs/testing.md`, `docs/testing-manual.md`,
`docs/major-redesign.md`.

**Edits:**
1. roadmap.md — under `### Focus / Deck UI` (:421) add the two future entries, worded to
   avoid conflicting with locked R5:
   - *Tab-strip micro labels + wide active cell (incl. full SETTINGS label)* — "drawn as
     board 6b-A in the chat-slots design doc; deliberately NOT built — locked decision R5
     (major-redesign.md §7) stands; shipping this later means reopening R5 in
     maintainer-decisions-locked.md first."
   - *First-run ghost "New chat" label at the create position* — "board 6c-A; deliberately
     not built — locked decision: literal `[+]` (re-confirmed on board 8f)."
2. roadmap.md:402-407 (Named chat slots entry) — update Status to reference this plan and
   the v3 QA rows; "Up to 5" already fixed in W7.
3. testing.md:202 — extend the coverage row's "Covered by" to CHAT-SLOTS-V2-01…06 +
   CHAT-SLOTS-V3-01…07.
4. major-redesign.md — in §7 decisions, note under R3/D5/6e rows that the turn-8 review
   (2026-08-29/30) confirmed literal D5 (8a→B), kept ghosts at 300px (8b→A), and set the
   answer surface to the lifted wash (8c→B); pointer to this file.
5. Confirm every earlier same-commit doc edit actually landed (grep for "cap of 5",
   "Up to 5", `--bonsai-stream-preview-border` in docs/).

---

## 5. Deliberately not built

- Reserved pill gutters (27's locked decision 6) — reversed by 8a→B.
- Any styling of Steam's modal shell, custom modal footers, A/B hint badges — 8d.
- The luminance-conditional wash — review chose the lift at every accent.
- Tab-strip micro labels, first-run ghost "New chat" — roadmap futures (W18).
- Slot pinning, jump-5, slot counter — R3 stands.
- Two simultaneous generations — backend is single-flight (main.py:2596-2615); the dot
  language assumes at most one pending slot.
- Speed-chip changes — already correct (§3.3).
- "N msgs" counts — no data model for it (§3.2).
- A default-mode Ask-bar placeholder ("Ask anything…" as drawn in every mock) — the
  shipped input has no placeholder outside strategy mode; adding one is a content change
  for the maintainer to call separately (W11 only italicizes what exists).
- Persisting unread state across QAM close — the reply-ready toast covers that case.

## 6. On-Deck QA rows to add (docs/testing-manual.md, `### CHAT-SLOTS-V3`)

Checkbox format like :277-282. Gate: run CHAT-SLOTS-V2-05 (P-0 bumper suppression) FIRST —
it has never been run on device and everything here assumes it passes (§0.5).

- [ ] **CHAT-SLOTS-V3-01** (W2) Down from slot row reaches the transcript's first stop;
  Down continues transcript → presets → ask bar; Up retraces; on an empty slot, Down from
  the row reaches the presets. Context footnote renders below the ask bar.
- [ ] **CHAT-SLOTS-V3-02** (W10) A slot named >12 chars: focused title sweeps and snaps
  back, ~6s cycle; quiet rows never move; with Steam's reduced-motion setting on (if
  exposed), no sweep.
- [ ] **CHAT-SLOTS-V3-03** (W3+W11) Fresh slot and `[+]` position both show the 52px
  silhouette + caption under the row; `[+]` shows no dots; first Ask replaces the
  preview.
- [ ] **CHAT-SLOTS-V3-04** (W14) Rename: cyan field, Save disabled while empty, caret in
  field on open; delete confirm shows destructive styling; both modals still survive a
  QAM close/reopen and return focus to the row.
- [ ] **CHAT-SLOTS-V3-05a** (W15) Ask in slot A, LB to B mid-stream: B shows B's content
  (or empty state), zero A tokens; ask bar still shows busy.
- [ ] **CHAT-SLOTS-V3-05b** (W15) Return to A mid-stream: question + partial + caret are
  back within one poll.
- [ ] **CHAT-SLOTS-V3-06a** (W16) While away: A's dot is a hollow cyan ring; if A is the
  visible ghost, a cyan spark sits at that row edge outside the ghost fade.
- [ ] **CHAT-SLOTS-V3-06b** (W16) Finish while away: ring → solid green; returning clears
  it.
- [ ] **CHAT-SLOTS-V3-06c** (W16) QAM closed when it finishes: reply-ready toast still
  appears (regression check on the watch).
- [ ] **CHAT-SLOTS-V3-07** (W17) 3 archived turns: "3 earlier" pill above the newest
  turn, is a D-pad stop; A expands to header rows, focus lands on the first one; exactly
  1 archived turn shows its header row with no pill.
