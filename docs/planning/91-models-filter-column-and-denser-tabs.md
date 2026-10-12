# Plan 91: the AI models box gets a filters column, and the other tabs get much denser

**Status:** READY 2026-10-12. Planned on Fable 5.1; the maintainer's calls are in
([D129](../audit/maintainer-decisions-locked.md#d129--locked-2026-10-12-raised-2026-10-12--plans-90-to-92-the-search-tab-your-notes-the-models-box-column-and-the-denser-tabs-the-calls)).
**Nothing is built.** This plan is one of two feature plans that [plan 92](92-feature-night-search-notes-models-tabs.md)
runs in one session; plan 92 holds the order of work, the Deck blocks, the budget rules and the paperwork. Read it
first, then this.

**Written against:** `experimental` as GitHub has it, `32f48643` (2026-10-11 19:23). Plan 89's night was still
running when this was written. Two of its lanes land on this plan's ground: the text-size change touches the font
sizes of every tab, and the Settings walk fix changes how the tabs scroll when the ring moves. **Both of this plan's
dense-tab lanes build on top of those fixes, not beside them.** The file map in § 9 is re-checked at the start of the
session (plan 92, block 0).

## 1. The short version

Two things a person will notice, drawn and picked on the two boards (the mock-up board's tab 2, option A of round 2,
"the column alone"; the density board's tabs 2 to 6, rounds 2 and 3, 2026-10-11):

- **The AI models box.** Today the filters hide behind a "Filters · N on" button that is easy to miss, and pressing
  Done while the filters are open closes the whole box and loses the choice. Picked: the filters sit in a column beside
  the model list, always on screen, with "7 models match" and Clear at the top and a count beside each "Good for"
  choice. Right and Left move between the column and the list. There is no separate filters step left to fall out of.
- **The other tabs.** Today Ollama is about four screens tall, Settings five and Developer six and a half, because
  every setting shows its full description all the time. Picked for Ollama, Settings and Developer: each section folds
  to one line that shows its current values ("Reply style · Balanced · Terse mode off · Thinking: Off"), and stays open
  until closed, several at once. Inside, one line per setting. The ringed setting's longer text shows in a strip at
  the bottom of the panel, so nothing moves under the ring. A small floating button in the bottom corner opens or
  closes every section: Right from any section line reaches it, any other press goes back. Its colours match
  bonsAI's and SteamOS's own buttons. Ollama should fit on about one screen. **Permissions stays exactly as it is.**
  About gets one line per row, the longer text opening under the ringed row, and its links as small buttons beside a
  smaller QR code.

**Roadmap entries this closes:** "The AI models box: filters in a column beside the list" (★★★, OPEN) and "Make the
other tabs much denser" (★★★, OPEN). It also settles the older "Make the Show details chips take less room" only in so
far as nothing here touches the chips (that entry keeps its own go).

## 2. What was picked, in words

The drawings win where words and drawing disagree: `docs/demos/mockup-board/src/42b-models-r2.js` (the column) and
`docs/demos/mockup-board-2/src/44-tabs.js` with `42-tabs-data.js` (the five tabs, every row with its full wording as
the code had it on 2026-10-11) and `43-tabs.css`.

### 2a. The filters column

- **Always on screen**, left of the model list, from the moment the box opens. The "Filters · N on" button and the
  panel that opened over the list are gone, and with them the Up-or-B-closes-the-panel step and the trap where Done
  left the box.
- **At the top of the column:** "7 models match" (the rows the list shows after every filter) and a **Clear** button.
  Clear resets the Good for and Show filters to their defaults (Essentials only back on, the rest off). **It leaves
  the licence pick alone**: that is a saved choice, not a filter of the moment (the call taken meanwhile; plan 92
  § 14).
- **Three groups, in the order people use them:** **LICENCE** (the three rows as today, one ticked, the third greyed
  until the unlock as today), **GOOD FOR** (Speed, Strategy, Expert, Vision, each with a count of the models that have
  it under the current licence pick), **SHOW** (Installed only, Deck essentials only, Recently added).
- **The three chips that lived on the old Filters row** move to the bottom of the column (the default the maintainer
  did not object to, 2026-10-12): "Type a name" (A swaps it for the text field and its Pull button, inside the
  column), "Install the starter set" while the starter model is missing, and the Suggested models as a short list of
  small chips (A queues one, as today). The Text / Pictures try-order switch stays where it is, above the list.
- **The list gives up one column** to make room for the filters: the **Date** column, by default, because its facts
  survive as the "New" badge and the Recently added filter. Measured first (plan 92, block 1, M-A): if the Deck's own
  screen shows the list still fits every column with the Model column no narrower than today, Date stays.
- **D-pad:** Up and Down walk the column (the greyed licence row skipped, as today's panel skipped it). Right from any
  column row lands on the list, on the last row the ring visited there or the first; Left from the list's first
  column comes back to the last column row visited. Up from the column's first row reaches the Advanced link in the
  title row; Down past the column's last row reaches Done. A on a row ticks it and the list changes at once. B
  anywhere does what it does today for the box (nothing inside the column claims it).
- **Kept for the session:** the Good for and Show picks are remembered while the plugin stays open, so closing the box
  and reopening it shows the same filters. The licence pick is saved on Done, as today.

Not chosen: "Help me choose…" (three questions that fill the column in), the column asking those questions instead
of showing filter names, and any question about room on the Deck (the Size column covers it).

### 2b. Ollama, Settings and Developer

- **Each section folds to one line:** its name, a short summary of its values, and a chevron. The summary rule, from
  the drawing: a choice or a slider shows "Label: value" (the label dropped when it is the section's own name); one or
  two switches show "Label on" or "Label off"; three or more show "2 of 4 on"; the pieces are joined with " · ".
- **A opens or closes a section; several can be open at once** (round 2, option B). On a first visit the first
  section is open and the rest closed; the open set is remembered for the session, not saved to disk (the call taken
  meanwhile; plan 92 § 14). **Changed 2026-10-12 by the maintainer, after the first night:** every section starts
  closed, and every real tab switch (LB, RB, the tab bar, Y) closes them all again, puts the page at its top and, after
  LB or RB, the ring on the first section line; a section stays open while you stay on the tab and after a popup.
- **Inside an open section, one line per setting:** the name and its switch, buttons or value. The longer text that
  today sits under every name or in help lines above and below is not drawn in the row.
- **The strip at the bottom of the panel** shows the ringed setting's longer text: its name in bold, then the text,
  up to about two lines, over the bottom of the list. It is empty, and hidden, when the ringed thing has no longer
  text. Nothing in the list moves when the ring moves; the pane only scrolls when the ringed row would otherwise sit
  under the strip.
- **The floating button** (round 3, option C) sits in the bottom-right corner, above the strip when the strip shows.
  It reads "Open all" with ⊞ or "Close all" with ⊟. Right from any section line puts the ring on it; A on it opens or
  closes every section and keeps the ring on the button; any other press (Up, Down, Left, B) puts the ring back on the
  section line it came from. Its colours are Steam's own button grey (#32373d sampled from the Deck, white text, the
  usual white ring), matched against a Steam button on the same tab in block 1.
- **Ollama** is the proving ground: its five sections (Where AI runs; Knowledge base (offline); Reply style;
  Connection tuning; AI models) fold first, with the strip and the button. **Settings** (ten sections) and
  **Developer** (six, only when the tab is on) follow with the same pieces.

Not chosen: press X to read more; switches as two-column tiles; an open-all line at the top of the tab; X as the
open-all button; one section open at a time.

### 2c. About

- **One line per row** (round 2, option A): "Version 0.5.0"; "What bonsAI is", whose paragraph opens under the row
  while the ring is on it and closes when the ring moves on; the beta warning stays visible as one short line; "Reply
  language" as one line with its value and a chevron. About has no strip: its text opens under the ringed row.
- **The links** (round 3, option D): three small buttons stacked beside a smaller QR code with its caption, "Support my
  Steam Sale habit". GitHub, Built on Ollama and Bugs & ideas are the buttons; the QR block is its own stop and A on it
  opens the support link, as the old button did.

Not chosen: four boxes two by two; one row of four icons; short one-line links each on its own row.

### 2d. Permissions

Stays as it is (round 2, option B: "this tab is short, so it's not so bad that the copy takes up space"). No lane
touches it; the free-play sweep passes through it once to prove nothing changed.

## 3. How it is built

### 3a. The column (one lane, Opus high, after M-A)

- A new file holds the column (`PullModelsFiltersColumn.tsx`), fed by the box's existing filter state and the pure
  matching rules already in `pullModelFilters.ts` (the panel's row model becomes the column's row model, with
  headings renamed to the drawing's words: Licence, Good for, Show). The counts come from the same table-data hook
  that already filters the catalog. The box's component loses the Filters button, the panel, its open-or-closed state
  and the four closing paths; it is at its growth limit, so the net change must leave it smaller, not larger.
- The list and the column sit side by side in one flex row; the column's width is a stylesheet value set from M-A's
  measurement (the drawing used about 180 of 658 points). The list's own box keeps its height rules.
- The focus moves between the column and the list go through Steam's own transfer onto the target's nav node, never
  a bare focus call across containers (AGENTS.md, the focus graph). Inside the column, plain sibling focus.
- The two saved rig walks through the old panel (`plan70-L6-FILTERS-PANEL`, `plan65-MODELS-list-walk`) and the two
  hub edge checks that start from the Filters button are re-recorded on the new layout in block 4; the lane names
  the new element classes in its report so the driver can write the new walks.

### 3b. The shared fold, strip and button (one lane, Opus high, after M-B; Ollama is its proving ground)

- A new folder, `src/features/folded-tabs/`, holds four pieces and their tests:
  - **The folded section** wraps a section: the one-line header (a stop), its summary, the chevron, and the body when
    open. Open state lives in a small module store keyed by tab and section, so a Decky popup rebuilding the tab does
    not fold everything back ([lessons § 3](../lessons-learned.md): a flag kept inside a component does not survive a
    popup).
  - **The summary rule**, a pure function from a list of rows (kind, label, value) to the one line, tested against
    the drawing's examples.
  - **The help strip**, pinned to the pane's bottom the way the Main tab pins its question box (a measured gap, not a
    stylesheet guess; see `useMainTabColumnFill.ts`). Rows carry their longer text in a data attribute; a focus
    listener on the tab body (the same capture-phase listener the scroll plan uses) reads the ringed element's
    nearest text and fills the strip. While the strip shows, the scroll plan's bottom band grows by the strip's
    height, so the ringed row is placed clear of it (plan 89's walk rules: a landing inside the band moves nothing;
    a landing outside moves by a moderate step).
  - **The floating button**, its two labels, its colours, and its D-pad rules (Right from a section line reaches it;
    from it, A toggles all and any other press returns the ring to the remembered section line).
- The row pieces: the dense layout omits Steam's own `description` under a switch and bonsAI's help lines above and
  below, and attaches that text to the row for the strip instead. A small `DenseRow` helper draws the one-line shape
  for a switch, a choice strip, a slider and a button, so the three tabs do not each invent one.
- The Ollama tab is rewritten onto these pieces in the same lane, so the pieces are proven on a real tab before the
  Settings and Developer lanes start.

### 3c. Settings and Developer (one lane each, Sonnet high, after 3b lands)

- Each tab's sections wrap in the folded section; every row goes through the dense row helper; the longer texts move
  into the strip's data attribute word for word (the density board's data file holds every row's text as the code
  had it, which is the checklist). Choices that change their text with the pick (the Developer tab's option rows)
  keep that: the strip re-reads the text when the pick changes.
- Sliders keep the shared slider builders; a slider's own ring stays on the knob as plan 82 set it.
- The UI scale section is left in place, folded like the rest; plan 86 removes it later and will need a re-check
  against this layout before it starts.

### 3d. About (one lane, Sonnet high, independent)

- The tab is short enough to rewrite in place: the rows of § 2c, the "What bonsAI is" paragraph opening under its row
  on focus (the same focus listener, with the text drawn under the row instead of in a strip), and a new `AboutLinks`
  piece for the three small buttons beside the QR. The QR image shrinks from 132 points to about 88.

## 4. The lanes

Every brief carries what the runbook asks for (plan 92 § 5). Lanes hand back code, tests and a report; they never
touch the roadmap, the testing documents or the changelog.

**Batch 1, at go:**

- **T3, About** (Sonnet high). § 2c and § 3d. Tests: the rows' order and words; the paragraph opens on focus and closes
  when focus leaves; the links' walk (Down the three buttons, Right to the QR, Left back to the button at the same
  height, Up from the first button to Reply language); the QR's size read from the stylesheet. *Pass on the Deck
  (plan 92, block 3):* the whole tab, top to bottom, fits in about one screen (under 1.3 times the pane's visible
  height; today it is about two); a Down walk visits Version is skipped (not a stop), What bonsAI is, Reply language,
  GitHub, Ollama, Bugs & ideas, the QR, with no dead press and no stop twice; the ring on What bonsAI is shows its
  paragraph under the row and the beta line stays visible; A on the QR opens the support page.

**Batch 2, after block 1's measurements:**

- **M1, the filters column** (Opus high, with M-A in hand). § 2a and § 3a. Tests: the column's rows and headings; the
  counts under each licence pick; "N models match" equals the rows drawn; Clear's reset leaves the licence alone;
  Right from a column row lands on the list's remembered row; Left from the list lands on the remembered column row;
  Up from the first column row reaches Advanced; Down past the last reaches Done; the filters survive a close and
  reopen within the session; a bounded walk of the whole box with no stop twice. *Pass on the Deck (block 4):* the box
  opens with the column visible and the list beside it; ticking Vision changes the list at once and the count beside
  Vision matches the rows shown; Right from Vision lands on a model row; Left comes back to Vision; Clear puts the
  count back and leaves the licence ticked; Done with nothing queued closes the box and the licence pick is saved;
  reopening shows Vision still ticked; the model name column is no narrower than today's by more than 10 percent
  (M-A gives today's width).
- **T0, the shared fold on the Ollama tab** (Opus high, with M-B in hand). § 2b and § 3b. Tests: the summary rule on
  the drawing's five Ollama sections; open state survives an unmount and remount; the strip shows the ringed row's
  text and hides on a row with none; the band arithmetic (strip height plus ring plus clearance, read from the
  stylesheet, as plan 84's corner-icon fix was tested); the floating button's four exits; a bounded walk with every
  section open and with every section closed, no stop twice, modelling Steam's own scroll on focus. *Pass on the
  Deck (block 4):* with every section closed, the Ollama tab, top to bottom, is under one visible screen (under 430
  points on the Deck's own screen; today about 1,700); with the first section open, under 1.5 screens; a Down walk
  with every section open stops once per control, each landing moves the pane by no more than a third of the pane
  and never a page-sized jump; the ringed row's text appears in the strip on the same frame the ring lands, and the
  row's bottom edge sits at least 6 points above the strip's top at every stop; Right from "Reply style" puts the
  ring on the floating button, A opens every section (the label reads "Close all"), Down returns the ring to "Reply
  style"; the button's fill reads within 3 of each colour channel of a Steam button on the same tab.

**Batch 3, after T0 lands:**

- **T1, Settings folded** (Sonnet high). § 3c. Tests: the summary rule on the ten sections; every row's longer text
  present in the strip data, word for word against the board's data file; the voice section's and character
  picker's rows keep their own popups; a bounded walk. *Pass on the Deck (block 5):* every section closed, the tab
  is under 1.5 screens (today about five); a Down walk with every section open has no dead press and no stop twice;
  the strip shows the right text on three rows picked at random; Text size's Left and Right still move the page 0
  points (plan 89's rule); the UI scale section is folded like the rest.
- **T2, Developer folded** (Sonnet high). § 3c. Tests as T1 for the six sections; the captured-errors list stays
  inside Diagnostics; an option row's strip text changes with the pick. *Pass on the Deck (block 5):* every section
  closed, under 1.5 screens (today about six and a half); the walk rules as T1; picking a different "Tab to open on"
  changes the strip's text at once.

## 5. The Deck checks

| Row | What it proves | Block |
|---|---|---|
| **P91-ABOUT-ROWS** | One line per row; the paragraph under the ringed row; the beta line visible; the tab under 1.3 screens | 3 |
| **P91-ABOUT-LINKS** | The three small buttons beside the smaller QR; the walk; A on the QR | 3 |
| **P91-MODELS-COLUMN-WALK** | The column and list side by side; Up/Down in the column; Right and Left between them; Up to Advanced; Down to Done; no stop twice | 4 |
| **P91-MODELS-COLUMN-FILTERS** | A tick changes the list at once; the counts; Clear leaves the licence | 4 |
| **P91-MODELS-DONE-KEEPS** | Done and B no longer lose the filters; reopening shows them | 4 |
| **P91-MODELS-WIDTH** | The model name column's width against M-A's today number | 4 |
| **P91-FOLD-OLLAMA** | Folded Ollama under one screen closed, 1.5 open; the walk rules | 4 |
| **P91-STRIP** | The ringed row's text in the strip on the same frame; the row clear of the strip by 6 points | 4 |
| **P91-FOLD-ALL-BUTTON** | Right reaches it; A opens or closes all; any other press returns; the colours against a Steam button | 4 |
| **P91-FOLD-SETTINGS** | Settings folded: under 1.5 screens closed; the walk; Text size Left/Right 0 points | 5 |
| **P91-FOLD-DEVELOPER** | Developer folded: under 1.5 screens closed; the walk; the strip follows a pick | 5 |
| **P91-PERMISSIONS-SAME** | Permissions unchanged: the same stops, the same heights as block 1's M-B | 5 |
| Re-recorded saved walks | `plan70-L6-FILTERS-PANEL`, `plan65-MODELS-list-walk`, `plan70-HUB-EDGE-01-filters-closed`, `plan70-HUB-EDGE-02`, `plan64-MODELS-HUB-RETURN-01-down-to-done`, `plan65-SETTINGS-walk`, `plan65-WHERE-walk`, `plan70-OLLAMA-FOCUS-02`, `plan87-P87-ABOUT-UP` | 6 |
| **QA-FREE-PLAY-01** | The standing sweep, with and without a game | 6 |

## 6. The focus graphs (new controls, AGENTS.md "Adding a new control")

Each lane writes its graph into `docs/focus-graph.md` in the same commit as the control.

**The filters column (M1):**

```
title row: "AI models"  ................  [ Advanced › ]
   ^ Up from the column's first row            ^ Up from the list's first row (as today)
[ 7 models match        Clear ]          <- Clear is the first stop
LICENCE   ( ) Open source only            |  the model list (unchanged walk)
          (•) Also try open-weight        |     Right from any column row -> the list's remembered row
          ( ) Non-FOSS unlock (greyed)    |     Left from a list row's first column -> the column's remembered row
GOOD FOR  [ ] Speed 5  [ ] Strategy 3 ... |
SHOW      [ ] Installed only  ...         |
[ Type a name ] [ Install the starter set ] [ Suggested: … ]
   | Down past the last chip -> Done        | Down past the last list row -> Done (as today)
[ Done ]  [ Cancel ]
```

**A folded tab (T0, T1, T2):**

```
tab bar
   | Down                               ^ Up (from the first section line)
[ Where AI runs · on this Deck · 2 of 2 on            ▾ ]  --Right-->  [ ⊞ Open all ]  (floating)
   | Down (open: into the first control; closed: the next line)   <-- any press but A comes back here
   row, row, row ...                      (Up from the first row -> the section line)
[ Knowledge base (offline) · Installed · on             ▸ ]
   ...
[ AI models                                             ▸ ]
   | Down from the last line holds still
=========================== the strip: "Terse mode  Speed mode only. Keeps each answer to three lines…" ====
```

**About (T3):**

```
tab bar
   | Down
[ What bonsAI is ]            <- paragraph drawn under it while ringed
   | Down
[ Reply language · Follow system ▾ ]
   | Down
[ GitHub ]           ┐
[ Built on Ollama ]  ├─ Right from any -> [ QR: Support my Steam Sale habit ]   Left -> the button at that height
[ Bugs & ideas ]     ┘    Down from the last button holds still
```

## 7. What could go wrong, and the calls taken meanwhile (plan 92 § 14 lists them)

- **The column costs the list a column.** Date goes by default; M-A decides. If the maintainer wants Date kept, the
  Model column gets narrower and the drawing's "no question about room" still holds (the Size column stays).
- **Clear and the licence.** Taken: Clear leaves the licence pick alone. The drawing reset it; resetting a saved
  policy choice from a Clear button is the kind of slip that loses a pick.
- **The strip over the list.** The strip hides the bottom of the list while it shows. The scroll plan keeps the
  ringed row clear; a row the ring is not on may sit under the strip, by design (the drawing accepted this).
- **Which sections open at first.** Taken: the first section open, the rest closed, remembered for the session.
  Saving the open set to disk would be a new setting (about 18 files of plumbing) for little gain.
- **Decky's own switch rows.** Steam's `ToggleField` draws its description itself; the dense row omits it and draws
  the switch in a one-line row. If a Steam row cannot be made one line without losing its switch's own ring
  behaviour, the lane says so and the row keeps Steam's shape with the description blanked.
- **Seven tabs.** Not this plan's, but the Search tab (plan 90) adds a tab; the density lanes measure after it lands
  or before, whichever the session's order gives, and say which.
- **Plan 86** (the clean-up, waiting for its go) removes UI scale and reshapes the settings plumbing. Its Settings-tab
  steps need a re-check against this plan's layout before it starts; the bookkeeper adds that note to plan 86.

## 8. For the maintainer, at the end (plan 92 § 11)

- The plain-language developer guide for this plan: how a section folds (the store, the summary, the strip, the
  button), how to add a new setting row to a dense tab (one helper call with the row's text), and how the models box's
  column and list hand the ring to each other. Written as a section in this plan once the Deck checks are in.
- The roadmap: both entries move to Verify at landing and to Done on their Deck passes, each naming its evidence.

## 9. For the builders: where the code is (checked 2026-10-12 at `32f48643`; re-check at the session's own tip)

| Lane | Files it owns |
|---|---|
| M1 | New: `src/components/PullModelsFiltersColumn.tsx` and its tests. Edits: `src/components/PullModelsModal.tsx` (1,244 lines, growth limit 935 code lines: the Filters button and panel at about lines 855 to 1,000 leave; the state `filtersOpen`, `openFiltersPanel`, `closeFiltersPanel`, `cancelClosesFiltersPanel`, `filterPanelRowNav`; the header diagram at the top), `src/utils/pullModelFilters.ts` (`FILTER_PANEL_ROWS` and `filterPanelRowGroupHeading`, about lines 109 to 126: the headings become Licence, Good for, Show), `src/hooks/usePullModelTableData.ts` (the per-mode counts), `src/components/PullModelsTableHeader.tsx` and `PullModelsPcRow.tsx` (the Date column), `PullModelsStarterSetChip.tsx` (moves into the column), `src/styles/sections/gamepadAndPullModels.ts` (the split row, the column's width, the old panel's rules go), `src/components/OllamaModelsHubModal.tsx` (the Manage shortcut that opened straight into the panel, `initialFiltersOpen`, now lands on the column's first row), `src/features/plugin-shell/useOllamaModelsHubModal.tsx` (read-only unless the entry point changes) |
| T0 | New: `src/features/folded-tabs/` (`FoldedSection.tsx`, `foldedTabsStore.ts`, `sectionSummary.ts`, `TabHelpStrip.tsx`, `useHelpStrip.ts`, `FoldAllButton.tsx`, `DenseRow.tsx`, tests), one stylesheet section for them under `src/styles/sections/`. Edits: `src/components/OllamaTab.tsx` (451 lines; the three sections it draws itself at about lines 304, 352 and 416), `OllamaWhereAiRunsSection.tsx` (916 lines, growth limit 884: its section at about line 418 wraps, its help lines become strip text), `KnowledgeBaseSection.tsx` (its section at about line 863), `OllamaThinkingEffortRow.tsx`, `OllamaReplyVerbositySlider.tsx`, `SettingsTabOllamaKeepAliveSlider.tsx`, `SettingsTabConnectionTimeoutSlider.tsx` (their help text moves to the strip), `src/features/plugin-shell/TabBodyFocusRoot.tsx` and `useTabBodyFocusScroll.ts` and `src/utils/tabBodyScrollPlan.ts` (the band grows by the strip's height; **plan 89's lane O1 changed these three: read them at the tip first**), `src/features/plugin-shell/tabs/useOllamaTabPayload.tsx` |
| T1 | Edits: `src/components/SettingsTab.tsx` (713 lines; its `PanelSection`s at about lines 324 to 592), `SettingsTabUiScaleSection.tsx`, `SettingsTabChatTextSizeRow.tsx`, `VoiceInputSettingsSection.tsx`, `SettingsTabAccentIntensityMenuPopover.tsx` (read-only unless its row shape changes), `src/features/plugin-shell/tabs/useSettingsTabPayload.tsx`; the board's data file for every row's wording: `docs/demos/mockup-board-2/src/42-tabs-data.js` (read-only) |
| T2 | Edits: `src/components/DeveloperTab.tsx` (665 lines; its sections at about lines 279, 307, 403, 453, 585 and the Integrations field), `DeveloperOptionRow.tsx` (the one-line shape; the strip text follows the pick), `src/features/plugin-shell/tabs/useDeveloperTabPayload.tsx` |
| T3 | Edits: `src/components/AboutTab.tsx` (170 lines; the sections at about lines 80 and 118, the QR image at about line 147), `AboutReplyLanguageSection.tsx` (one-line row), `src/features/plugin-shell/tabs/useAboutTabPayload.tsx`; new `src/components/AboutLinks.tsx` and tests |
| Evidence and drawings to read first | `docs/demos/mockup-board-2/README.md` (the sampled colours: panel #0e141b, ring fill on a row #32373d, divider #272c32, Steam button #32373d, switch on #1a9fff, labels #dcdedf, descriptions #b8bcbf, headings #b7b9bb); `docs/test-evidence/plan87-M4-OTHER-TABS.json` (today's heights on the monitor: Ollama 1,718, Settings 2,133, Permissions 786, Developer 2,820, About 915; the first control's place on each); `plan87-P87-B10-TAB-SCROLL-try3.json` and plan 89's Settings walk evidence (the scroll rules the strip must respect); `docs/design-tokens.md` § Focus rings and § Layout constants; `docs/focus-graph.md` § "The Text size row" and § "The Ollama tab's setup buttons" |
| Plan 89 touched | the three scroll files above (lane O1), the font sizes in every tab file and the styles (lane S1): the dense-tab lanes start from the tip after those landed |

## 10. Developer guide: how the models box's column and the folded tabs are built (written 2026-10-12)

What landed on the first night (plan 92): the models box's filters column (with a second round for the D-pad), the
About tab, and the Ollama tab folded. The second night (the same day) folded Settings and Developer, made folded tabs
close on a tab switch, reworked About and the models box's sideways presses at the maintainer's request; the last
paragraphs below describe those.

**The models box's column.** `src/components/PullModelsFiltersColumn.tsx` draws the column (the count and Clear,
Licence, Good for with counts, Show, then the chips) from the box's own filter state and the rules in
`src/utils/pullModelFilters.ts`; the counts come from `src/hooks/usePullModelTableData.ts`, the same data the list
filters with. The Good for and Show picks, and "which column row and which list row the ring last left", live in
`src/components/pullModelsBoxMemory.ts`, outside the components, so closing and reopening the box (a Decky popup)
keeps them; the licence pick is still saved on Done. The column and the list sit side by side in one row
(`.bonsai-pullmodels-split`); Right and Left between them go through Steam's own transfer onto the other side's nav
node. A greyed row (the third licence row before the unlock, the Refresh button while the catalog loads) is skipped
because the column knows it is off, not by asking the button: on the Deck a greyed button can still take the ring.
The Date column is gone; the list's column widths are in `src/styles/sections/gamepadAndPullModels.ts` and are
checked by `PullModelsFiltersColumn.layout.test.ts`.

**A folded tab.** The pieces live in `src/features/folded-tabs/`: `sectionSummary.ts` (the one-line summary of a
closed section, from the drawing's rule), `FoldedSection.tsx` (the section line and its body) with
`foldedTabsStore.ts` (which sections are open, kept for the session outside the components), `DenseRow.tsx` (one line
per setting, its longer words carried in a data attribute), `TabHelpStrip.tsx` with `useHelpStrip.ts` (the strip at
the bottom that shows the ringed setting's longer words, and the extra bottom margin it adds to the tab's scroll rule
in `src/utils/tabBodyScrollPlan.ts`), and `FoldAllButton.tsx` (Open all / Close all). One `FoldedColumn` holds every
line and row so Steam steps Down and Up through them. `ollamaTabFolds.ts` lists the Ollama tab's sections.

**To fold another tab (Settings or Developer):** list its sections once as a chain (each with where the ring enters
from above and from below); wrap them in one `FoldedColumn`; give each a `FoldedSection` with its summary from
`summarizeSection`; draw its rows with `DenseSwitchRow` or `DenseRow`, passing each row's old help text word for word;
hand Up from a section's first control to its line and Down from its last to the next line; end the tab with the help
strip and the floating button; test it with `walkFoldedTab` (`src/test-harness/foldedTabWalk.tsx`).

**The About tab.** `src/components/AboutTab.tsx` (one line per row), `AboutRevealRow.tsx` (a row whose paragraph opens
under it while the ring is on it), and `AboutLinks.tsx` (three small buttons in a column beside the QR code). The
links block is a row and the buttons a column for Steam (`flow-children`); that is what lets Down reach every button.

**Second night: the models box's sideways presses.** The maintainer found Right from a filter jumping to the first model
wherever the ring was (the first night's "remembered row" rule). Now Right and Left go to what sits beside the ring:
`src/components/pullModelsBeside.ts` picks, at the moment of the press, the stop on the other side whose middle is
nearest the ring's, within one and a half model rows (the one place that number lives), and the press holds when
nothing is that close; the greyed licence row is never chosen. The title row's Refresh and Advanced reach each other
the same way. Only one AI models box can be open at a time (`useOllamaModelsHubModal.tsx`).

**Second night: folded tabs on a tab switch, Settings and Developer.** `foldedTabsStore.ts` starts every section closed
and has `closeAllFoldedSections`, called from one place in `src/hooks/useBonsaiPluginShell.ts` (`noteRealTabSwitch`)
for a bar press, Steam's shoulder switch and Y, but not for a popup closing, the post-popup lock or a restore.
`foldedTabArrival.ts` puts the page at its top and, after LB or RB, the ring on the first section line unless the
person has pressed something since (section lines count presses through `notePersonPress`). `shoulderSwitch.ts` lets
LB and RB switch tabs with the ring on the floating button, which sits outside Steam's own tabs box. Settings
(`settingsTabFolds.ts`, `useSettingsTabFocus.ts`, the row files beside `SettingsTab.tsx`) and Developer
(`developerTabFolds.ts`, `useDeveloperTabFocus.ts`, the `developerRows*.tsx` files) follow the recipe above; their rows'
longer words are the drawing's, word for word.

**Second night: About.** The paragraph about bonsAI and the green beta notice are plain text at the top again (always
shown, not stops); the version sits on the "About bonsAI" title line (passed to Steam's section title as a node); the
Reply language dropdown fills its row with no label; the link buttons use Steam's button grey, shared with the floating
button through `src/styles/settingsGlassButton.ts`.
