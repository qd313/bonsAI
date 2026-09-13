# Review of .cursor/rules/decky-focus-graph.mdc

Checked every concrete claim in the 27-line rule file against the current code on branch
`experimental`. Also read the two documents it points to: the policy
(`packages/bonsai-mcp/knowledge/policies/decky-ui-focus.md`) and the patterns doc
(`packages/bonsai-mcp/knowledge/architecture/focus-graph-patterns.md`). 13 concrete claims
checked. 11 still hold. 2 are stale (the underlying idea is right, the specific pointer is not).
Nothing in the file is flat-out wrong.

## Still true

- Line 12: new Settings/QAM rows need an explicit focus graph at the section parent, wired with
  `onMoveUp`/`onMoveDown`/`onMoveLeft`/`onMoveRight`/`onButtonDown`. All three example files still
  use exactly these props today: `src/components/SettingsTabUiScaleSection.tsx:58-65,208-248`,
  `src/components/OllamaTab.tsx:254,301,319`, `src/components/PullModelsModal.tsx:515-542,1268-1269`.
- Line 13: a plain `ToggleField` dropped into a `PanelSection` that already has controls needs no
  focus wiring of its own. Still true today — `src/components/SettingsTab.tsx:320-325` ("Hide
  spoilers until I tap") and `:471-476` ("Show Developer tab") are both toggles with only
  `checked`/`onChange`, no move handlers. (The exact line numbers the rule cites for this are wrong
  — see Stale list.)
- Line 14: `DeckFocusSlider` thumbs are not automatically part of the vertical graph; a caller must
  either add a bridge or use the "parent ref + programmatic focus" pattern named after
  `focusOllamaKeepAliveThumb`. That function still exists at `src/components/OllamaTab.tsx:113`, and
  `DeckFocusSlider` still exposes the `thumbFocusedExternal`/`thumbEditingExternal`/`thumbHostRef`
  props the pattern doc describes (`src/components/deck/DeckFocusSlider.tsx:184-194`).
- Line 15: never hop between controls with `document.querySelector`/aria/`data-*`/class lookups or
  `document.activeElement`. `getUiDocument()` and `elementHasFocus()` both still exist in
  `src/utils/uiDocument.ts:36,57` and are used in 19 files across `src/`.
  `docs/audit/decky-realms.md` still exists and still explains the two-document problem.
- Line 17: `onMoveUp`/`onMoveDown` really do nothing on a Decky `Button`; `onButtonDown` fires for
  every button as a `GamepadEvent`. The button-code constants are unchanged:
  `src/utils/focusNavigation.ts:83,85,86` — `OK = 1`, `DIR_UP = 9`, `DIR_DOWN = 10` — exactly as the
  rule states, with predicate helpers (`isDeckDirectionUpEvent`, etc.) still in that file.
- Line 18: never overwrite an existing `tabindex`, never add `-1`. This is now automatically
  checked, not just written down — see the checker note below.
- Line 19: a plugin opens with nobody holding the focus ring; the first D-pad Down goes to the Back
  button, the second to the tab bar. Still the documented, current behavior — confirmed again in
  `docs/mcp-setup.md` (P3-6 entry) and unchanged since the rule was written.
- Line 20: no Deck-facing control ships without a D-pad test row in `docs/testing.md` /
  `docs/testing-manual.md`, and the in-editor preview still does not check real Deck focus. Both
  still enforced — `docs/testing-manual.md:88-94` has the same mandatory checklist, and
  `docs/testing.md:146` explicitly says a 2026-05 preview pass "stays vacuous" because it only
  checked DOM, not real focus.
- Line 24: the screenshot skill still says to list files with the terminal, sorted by time, and not
  with the file-search tool. `.cursor/skills/decky-screenshot-ingest/SKILL.md:13` still reads "Do
  not use Glob (it returns empty)."
- Line 25: the four patterns (A, B, C, D) the rule tells you to match still exist, under the same
  names, in `focus-graph-patterns.md`.
- Line 27: the escalation path (a short triage prompt, then the full debugger persona) still
  exists under the exact names the rule uses — confirmed in `AGENTS.md:24,28` and
  `.cursor/agents/master-debugger.md:14,16`.
- Line 8: the policy id and the patterns-doc path the rule points to both still exist and still
  cover what the rule says they cover.

## Stale or wrong

- **Line 13's line-number citations are wrong.** The rule points at
  `src/components/SettingsTab.tsx:308-313` and `:448-453` as its proof that some toggles ship with
  no move handlers. Today those two ranges land on unrelated code — a mode-picker button and part of
  an accent-intensity popover, not a toggle at all. The file has grown since the rule was written,
  and the toggles it meant to point at are now at `:320-325` and `:471-476` (a third,
  `:330-336`, works too). The underlying claim is still correct; the citation someone would jump to
  is not.
- **Line 16's fix is one step behind current practice.** The rule says: to move focus out of one
  container into another, pass a `navRef` and call `navRef.current.TakeFocus(true)` yourself, and
  points at `src/utils/navFocusRegistry.ts`. That file now wraps this in a small registry
  (`registerNavFocus`, `unregisterNavFocus`, `takeNavFocus`), and every one of the 18 files that do
  this today calls those functions — none of them calls `.current.TakeFocus(` directly. The only
  direct call left in the whole frontend is inside the registry's own `takeNavFocus` helper, at
  `src/utils/navFocusRegistry.ts:96`. A new control built by following the rule literally would
  hand-roll a check the registry already does safely (the null check, the "did it actually
  report success" check). Point at the registry functions, not the raw call.

## Missing from the rule

- **A script now checks three of this rule's "never do X" lines automatically, on every commit.**
  `scripts/check-focus-patterns.mjs`, backed by `scripts/focus-baseline.json`, runs in CI
  (`.github/workflows/tests.yml:116`) as `npm run test:focus`. It reads the actual code (not text
  search) and catches: a page-search/`activeElement` hop (the rule's line 15), a move prop wired
  onto something that ignores it (line 17), and a `tabindex` of `-1` removing a control from the
  graph (line 18). It only fails when a new case appears — existing ones are grandfathered in a
  baseline file. None of this is mentioned in the rule, so a reader would not know a mistake here
  gets caught automatically, or how to update the baseline after a deliberate fix
  (`node scripts/check-focus-patterns.mjs --update`).
- **The same checker enforces two more things the rule never states as its own rule.** One: asking
  "which control does the gamepad ring already own" by reading `document.activeElement` (via a
  helper called `uiActiveElement`) is now flagged — the fix is two newer helpers,
  `elementHasGamepadFocus` and `uiGamepadFocusElement` (`src/utils/uiDocument.ts:88,110`), which read
  Steam's own on-screen ring marker instead of the browser's idea of focus. This is the exact fix for
  the failure the rule describes in line 16 ("gpfocus stays behind"), and it is the fix for two real,
  shipped bugs (a reply-grid column bug and a spoiler-reveal bug) that both happened because the
  older, still-recommended `elementHasFocus`/`activeElement` check silently returned a confident
  wrong answer instead of an obvious "no". A maintainer reading only this rule would reach for the
  older, riskier check. Two: a keyboard-style Up/Down check on a real keyboard event is flagged too,
  because a controller D-pad press on the Deck sends zero keyboard events to the page — measured on
  device — so any code branching on one is dead on real hardware, not just unnecessary.
- **New sliders should reach for two tested builder functions, not hand-wire a bridge.** The rule's
  slider guidance (line 14 here, Pattern B in the patterns doc) describes wiring Left/Right stepping
  by hand on a bridge control. As of a 2026-09-04 fix, that stepping logic was pulled out into two
  shared, unit-tested functions — `buildDeckThumbNavHandlers` (`src/components/deck/DeckFocusSlider.tsx:47`)
  and `buildUiScaleBridgeNav` (`src/components/SettingsTabUiScaleSection.tsx:55`) — because the
  hand-wired version let one press step a slider twice or escape the row entirely. Four sliders
  (reply style, keep-alive, connection timeout, UI scale) now share this fix. Neither doc names
  these functions, so a new slider today would risk reintroducing the same bug the fix already
  covers.
- **Adding a missing `tabindex` can be just as wrong as removing one.** The rule only warns against
  taking a `tabindex` away. A real helper, `focusDeckOwner` (`src/utils/liveTurnFocusGraph.ts:25`),
  used to add one whenever it found none — on the theory that a real Steam-owned control always has
  one. Measured on device, that theory is false: three different controls that Steam was genuinely
  focusing carried no `tabindex` attribute at all, so the helper stamped one onto the wrong element
  and broke it. It has since been fixed to check for a real Steam-owned element first. The rule
  should say both directions are dangerous, not just removal.
