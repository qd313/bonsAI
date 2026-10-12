# Plan 90: a Search tab, and your own notes that Ask reads

**Status:** READY 2026-10-12. Planned on Fable 5.1; the maintainer's calls are in
([D129](../audit/maintainer-decisions-locked.md#d129--locked-2026-10-12-raised-2026-10-12--plans-90-to-92-the-search-tab-your-notes-the-models-box-column-and-the-denser-tabs-the-calls)).
**Nothing is built.** This plan is one of two feature plans that [plan 92](92-feature-night-search-notes-models-tabs.md)
runs in one session; plan 92 holds the order of work, the Deck blocks, the budget rules and the paperwork. Read it
first, then this.

**Written against:** `experimental` as GitHub has it, `32f48643` (2026-10-11 19:23). Plan 89's night was still
running on the maintainer's PC when this was written, so the file map in § 9 is re-checked at the start of the
session (plan 92, block 0). Where plan 89 is known to have touched the same files, § 9 says so.

## 1. The short version

Two things a person will notice, drawn and picked on the mock-up board (tab 7, option B of round 2, and tab 8,
option B of round 2; the maintainer's calls of 2026-10-11 and 2026-10-12):

- **Your own notes.** When a question says something worth keeping ("I'm doing a Steel Soul run", "no spoilers past
  the City of Tears"), a small card under the answer offers to keep it as a note: **Keep**, **Edit** or **Not now**,
  for this game or for every game. Typing "remember …" brings up the same card without asking the AI anything.
  From then on, every question about that game is answered with the note in mind. An answer that read your notes
  says so in one line above it ("Read 2 of your notes"); pressing the line opens the notes, where each one can be
  switched off or removed. No button on every answer, no new screen for notes on the Main tab.
- **A Search tab.** Its own tab, to the left of Main, and Y on the Main tab opens it (if Y turns out to be free
  there). One find box searches your chats, your own notes, the settings bonsAI can open, and the game notes in the
  knowledge library. A row of games narrows the search to one game. Word buttons made from your own questions let the
  D-pad pick a word with no typing. A on a match jumps to it, with a "Back to where you were" line to come back.
  Before a word is picked, the tab lists every note you have kept, for every game, with on and off switches: the one
  home for notes. **The Steam settings search moves here from the Main tab**, so the settings card above the question
  box goes.

What this is **not**: no embeddings, no cloud, no second copy of the knowledge library, no "live session bundle"
(the roadmap's phase 2 of the stash stays on the backlog), no voice "remember" (not picked), no notes button by the
question box, no notes list under Show details.

**Roadmap entries this closes or moves:** "Search in bonsAI: a Search tab that also holds your notes" (★★★★, OPEN)
and the notes half of "Session context and user stash" (★★★★, PARTIAL). Both were marked for about 0.7.0; the
maintainer brought them forward on 2026-10-12 (D129, call 3).

## 2. What was picked, in words

From the mock-up board's round 2 and the maintainer's calls. The drawing wins where words and drawing disagree
([lessons § 5](../lessons-learned.md)): the drawings are `docs/demos/mockup-board/src/47b-notes-r2.js` (the notes)
and `49b-search-r2.js` with `49-search.js` (the Search tab).

### 2a. Your notes

- **When the card appears.** Only when the question says something worth keeping (option B), or when the person
  asks for a note by typing "remember …" (also "note: …"). Never on every answer. Saying "remember" into the mic is
  out (call 5).
- **How bonsAI hears one.** A small word rule on the question's own text, with no extra trip to the AI (call 5). The
  rule looks for a statement about the person or their play: "I'm doing / playing / on a … run", "I'm playing on …",
  "I prefer …", "I don't want / like …", "no spoilers …", "don't spoil …", "I use / have … mapped to …", and
  "remember …". The offered note is that clause, kept in the first person, cut at 200 characters.
- **The card.** Under the newest answer, after the Helpful / Not really row: a lead line ("You said you're on a Steel
  Soul run. Keep that as a note?"), the note's text, a "For: Hollow Knight ▸" line that toggles between this game and
  every game, and three buttons: **Keep**, **Edit**, **Not now**. Keep saves and the card becomes one line ("Kept.
  Ask reads it on every Hollow Knight question from now on."). Edit opens the same text popup the chat rename uses.
  Not now removes the card; nothing is saved. The card is the ring's first stop when it appears.
- **The line.** An answer that was written with your notes in hand carries one line above it: "Read 2 of your notes
  ▸" (or "Your notes are all off" when every matching note is switched off). A on it opens the notes sheet.
- **The sheet.** Your notes over the panel: one row per note (the text, the game or "Every game", a switch), a Remove
  button beside each, "Ask reads the ones that are on, every time you ask about that game." B closes it and the ring
  comes back to the line that opened it.
- **Where notes live.** On the Deck, in one small file beside the saved chats. Per game (by the running game) or for
  every game (call 7 of the first round: "per game as well"). At most 40 notes, 200 characters each. "Clear all plugin
  data" wipes them with everything else.
- **What Ask does with them.** Before every question, the notes that are on and match the running game (or are for
  every game) go into the instruction sheet the AI reads, as a short block of its own, ahead of the knowledge-base
  and Proton material. Show details gets a "Your notes" chip naming which notes went in, so the Session tab and the
  answer's line agree.

### 2b. The Search tab

- **Its place.** A tab of its own, to the left of Main, with a magnifier icon. This replaces plan 87's rule that Main
  is always the far-left tab (D129, call 3). LB from Search still wraps to About.
- **Y opens it** from anywhere on the Main tab, if Y is free there. The rig measures this first (plan 92, block 1,
  M-Y). If Steam already uses Y, or the press never reaches the plugin, there is no shortcut and the tab alone is the
  way in (call 4).
- **The find box** at the top: a magnifier and "Chats, settings, notes…". A on it types a word (Steam's keyboard).
  Under it, **word buttons**: the eight words that appear in the most of your questions (four letters or longer,
  everyday words skipped, "charms" counted with "charm"), each with its count. A on a word picks it.
- **The game row** above the box: All, then one button per game your chats mention. Picking a game narrows the
  chats, the notes and the game notes to it.
- **The matches**, once a word is picked: "N matches for 'mantis'" and a Clear button, then groups in this order:
  **Your chats** (the question with the word highlighted, and under it the chat's name and the day), **Your notes**,
  **Settings** (the same list the Main tab's card searched, opened the same way), **Game and help notes** (the
  knowledge library, when it is installed). A on a chat match jumps to that question in its chat. A on a note opens
  the notes sheet on that note. A on a setting opens it in Steam, as the card did. A on a game note shows the note in
  its own words.
- **Before a word is picked** the tab shows every note you have kept, newest first, with their switches, under the
  game row (narrowed by the game picked), and "Ask reads the ones that are on. New notes come from what you say in a
  chat."
- **The jump and the way back.** A on a chat match switches to that chat, opens the day that holds the question and
  puts the ring on it; a line at the top, "‹ Back to where you were", returns to the Search tab with the same word
  and the ring on the same match. B on the Search tab goes back to the tab you came from.
- **The Steam settings search moves.** The card that appeared above the question box while typing a setting's name
  is removed from the Main tab. Typing in the question box only asks the AI from now on. The "Search only" choice of
  "Remember what I typed" had already been retired on the back end (older settings files still load); the screen's
  last mentions of it go with the card.

Not chosen (so nobody rebuilds them): a find line inside "N earlier"; "Find in your chats" in the chats menu and
"You asked this before" above the box (the small version, option A); saying "find" to the mic; a notes list in the
Session tab; a notes button beside the question box; a "Keep as a note" button under every answer.

## 3. How it is built

The order matters: the back end's shapes first, so the two screen lanes build against one written contract. The one
running the session writes the contract into every brief before the first lane starts (the field names below are
that contract; a lane that needs to change one stops and says so).

### 3a. The notes store (back end)

- One file, `user_notes.json`, in the plugin's settings folder beside `chat_slots/`, written the same crash-safe way
  the chats are (write a temporary file, then replace). Shape: `{"version": 1, "notes": [ {"id": "n-<ms>",
  "text": "...", "app_id": "" or "12345", "game_title": "" or "Hollow Knight", "on": true, "created_at": "<iso>",
  "source_turn_id": "" or "<turn id>"} ]}`. A note with an empty `app_id` and `game_title` is for every game.
- Caps: 40 notes; 200 characters of text. The save call refuses a longer text or a 41st note with a plain-words
  error the card shows ("That's one note too many. Remove one first."). Nothing is cut silently.
- Three methods the screen can call, named so the generated map files them together (the generator's keyword table
  gains a `user_notes` domain with the one keyword `user_note`; appending a domain is safe): `list_user_notes()`,
  `save_user_note(payload)` (new when `id` is empty, otherwise edit: text, game, on or off), `delete_user_note(note_id)`.
- The wipe: `clear_plugin_data` removes the file (plugin_data_reset.py), with a test.

### 3b. Ask reads the notes

- In the Ask flow, after the running game is known and before the knowledge-base search, the notes that are on and
  match (same `app_id`; or same `game_title` when the turn has no id; or for every game) are picked, newest first,
  up to 8 notes and 1,000 characters. They become one block in the instruction sheet: a heading line ("The person
  asked bonsAI to remember these. Treat them as true for this chat and never contradict them:") and one line per
  note. It is spliced into the early background position, ahead of the Proton and knowledge-base text, through the
  same seam those use (`early_context_suffix` in `build_system_prompt`), and it counts against the prompt budget like
  they do; when the budget is tight the knowledge block already moves late, and the notes block stays early because
  it is small.
- Show details: the record gains `user_notes_attached: [{id, text, game_title}]`, kept when a turn is saved into a
  chat (the slot normalizer) and shown as a "Your notes" chip beside the knowledge-base chip. The app log line for an
  Ask names how many notes went in.
- The line above the answer reads that same record, so the two can never disagree.

### 3c. The offer (back end rule, screen card)

- A pure module, `user_note_offer.py`, with the word rule of § 2a and tests (phrases that offer; phrases that must
  not: "how do I beat the mantis lords", "I'm stuck"). The Ask reply payload carries `note_offer: {text, app_id,
  game_title} | null`. It is computed from the question's own text, before the AI answers, so it is there even when
  the AI fails.
- "remember …" and "note: …" are a local command, like `bonsai:vac-check`: no trip to the AI. The reply is one
  sentence ("Keep this as a note?") with the same `note_offer`, and the screen draws the card under it. Show details
  for that turn says "Local note command".
- The screen: `src/features/user-notes/` holds the card (`NoteOfferCard.tsx`), the line (`NotesReadLine.tsx`), the
  sheet (`UserNotesSheet.tsx`), the hook that talks to the back end (`useUserNotes.ts`) and their tests. The transcript
  only mounts them: `MainTabChatTranscript.tsx` is at its growth limit, so no new logic lands in it.

### 3d. The Search tab

- Tab plumbing: the tab id `search` joins the six; its icon and spoken name beside the others; the tab rows in
  `index.tsx` list it first; the bar's dash count follows the mounted tabs; the bar's order has Search leftmost, so LB
  from Search wraps to About and RB from About to Search. The seven-tab case (Developer on) is measured on the Deck
  first (plan 92, M-B): if seven do not fit the 300-point bar at today's sizes, the side icons shrink one step, never
  the current tab's name.
- The chats: one new back-end method, `list_chat_slot_questions()` (filed under chat slots by its name), returns for
  every saved chat its id, name and the list of its questions (turn id, text, when asked, game id and title). The
  screen builds the word buttons and the matches from that list. Loaded when the tab opens; refreshed when a question
  is answered.
- The game notes: one new back-end method, `search_rag_corpus_notes(word, game_title)` (filed under the knowledge
  base by its name), a keyword pass over the library's full-text index, returning up to 12 notes (name, kind, game
  title, a short snippet). Hidden when the library is not installed.
- The settings: the same search the card used (`useSteamSettingsSearch.ts` with the intent packs) and the same way
  of opening a page; only where it is called moves.
- The find box: the word buttons are the first-class D-pad path. The typed path uses the same two-layer text field
  the question box uses (an invisible native field for Steam's keyboard, a drawn copy on top), shared if that is
  cheap, otherwise a plain Steam text field with the hazard written in the report: A on a plain field opens Steam's
  keyboard and can leave the field's D-pad dead until the panel is closed and reopened (deck-driver rule 1). The Deck
  check types one word.
- The jump: A on a chat match switches the open chat, opens "N earlier", opens the day that holds the question, presses
  "Show N more" as often as needed, and puts the ring on the question (through Steam's own transfer onto the row's
  nav node, never a bare focus call). The "‹ Back to where you were" line is drawn above "N earlier" while a jump is
  live; the jump's memory (the word, the game, the match, the tab the person came from) lives in a small module
  store so a popup rebuilding the tab does not lose it ([lessons § 3](../lessons-learned.md), "a come-back-here flag
  kept inside a component does not survive a Decky popup").
- Y: a new helper beside the A and B helpers (the button the framework calls OPTIONS, number 4). Handled on the
  Main tab's own column: Y switches to the Search tab, unless Steam's keyboard is open or a popup is up. Built only if
  M-Y shows the press reaches the plugin and Steam does nothing with it.

## 4. The lanes

Every brief carries what the runbook asks for (plan 92 § 5): the tip hash and the base check, "run the baseline checks
now, without an install", the owned files (§ 9), one change per commit with the failing test first, the sentence that
says what a pass looks like on the Deck, the five gates and the quick check before every commit, a scratch folder of
its own, `git -C <copy>` instead of `cd`, never `git stash`. Lanes hand back code, tests and a report; they never
touch the roadmap, the testing documents or the changelog.

**Batch 1, at go (no measurement needed):**

- **N1, the notes store and Ask reading them** (Sonnet high, back end). § 3a and § 3b. Tests: the file's shape and
  caps; the wipe; the pick rule (per game, every game, off notes skipped, newest first, the 8-note and 1,000-character
  cap); the block's position in the instruction sheet (a test like the existing layer-order tests); the Show details
  record and its survival into a saved chat. *Pass on the Deck (plan 92, block 5, with N2):* with one note on for the
  running game and one for another game, the app log for the next Ask says 1 note went in, Show details shows a "Your
  notes" chip naming it, and the saved chat carries the record.
- **N4, the game notes search** (Sonnet high, back end, small). § 3d's library method. Tests: a word that matches a
  note's name, one that matches only its text, a game filter, an uninstalled library (an empty list and a plain
  reason, no error). *Pass on the Deck (block 5, through the Search tab):* "mantis" with the library installed lists
  the Mantis Lords note under Game and help notes; A on it shows the note's own words.
- **N3, the Search tab, first half** (Sonnet high, screen; Opus reviews at landing). § 3d without the jump and
  without Y: the tab, its icon and place, the game row, the find box with word buttons, the chats method on the back
  end (`list_chat_slot_questions`), the matches in their four groups (the chats group's A does nothing yet: it shows
  a one-line "jump comes in the next step" toast), the notes list before a word is picked (reads N1's list method;
  the switches call N1's save), the settings search moved and the Main tab's card removed, the settings-only
  persistence leftovers cleared from the screen. Tests: the word rule (counts, the skip list, the plural fold, the top
  eight), the matching per group, the game narrowing, the tab order with Developer on and off, the bar's wrap, and a
  bounded D-pad walk of the tab with no stop twice (modelling Steam's own scroll on focus, as every walking fix is
  briefed to). *Pass on the Deck (block 3):* Left from Main lands on Search; Down from the bar lands on the game row;
  a Down walk visits game row, find box, every word button, the notes list and nothing twice; A on "mantis" lists
  matches in the four groups with the word highlighted; picking a game narrows them; A on a setting opens it in Steam;
  on Main, typing "brightness" shows no card above the question box.

**Batch 2, after N1 lands:**

- **N2, the offer card, the line and the sheet** (Sonnet high, screen and the back-end rule). § 3c. Tests: the word
  rule (ten phrases that offer, ten that must not); the local command answers without the AI; the card's three
  buttons and the game toggle; Keep calls save and the card becomes its one line; Edit opens the text popup and the
  edited text is what is saved; the line's wording for 1 note, 2 notes and all off; the sheet's switch and Remove;
  B from the sheet returns the ring to the line; a bounded walk of card, line and sheet. *Pass on the Deck (block
  5):* asking "I'm doing a Steel Soul run, how do I beat the mantis lords" shows the card under the answer with
  the ring on Keep; A keeps it and the card becomes its line; the next Hollow Knight question shows "Read 1 of your
  notes" above its answer; A on it opens the sheet with the note on; A on the switch turns it off; B returns to the
  line; typing "remember no spoilers past the City of Tears" shows the card with no AI answer.

**Batch 3, after N3 lands:**

- **N3b, the jump, the way back, and Y** (Sonnet high; Opus reviews; steps up to Opus high after one Deck failure
  with the measurement in hand). § 3d's jump and Y. Tests: the jump opens the right day and shows enough questions
  (a chat with 28 questions over five days, the match on day two, question nine of the day); the ring lands on the
  question through the nav node; Back returns to the same word and match; the jump memory survives an unmount and
  remount; B on the Search tab returns to the tab the person came from; Y switches tabs only on Main and not while
  the keyboard is open. *Pass on the Deck (block 5):* A on a match in another chat opens that chat with the question
  on screen and the ring on it; "‹ Back to where you were" is the first stop above; A on it returns to Search with
  "mantis" still picked and the ring on the same match; from the question box on Main, Y opens Search (or, if M-Y
  said Y is not free, this row reads "no shortcut by design" and passes on the tab alone).

## 5. The Deck checks

Rows the bookkeeper adds to the testing documents at landing, each with its pass sentence from § 4 and the standing
rules of plan 92 § 7 (a landing is a stop; a scroll-only press inside a section being read is expected).

| Row | What it proves | Block |
|---|---|---|
| **P90-SEARCH-TAB-WALK** | The tab is reachable from Main by Left and by LB wrap from About; a Down walk has no dead press and no stop twice; every stop visible | 3 |
| **P90-SEARCH-WORDS** | Eight word buttons with counts; A on one lists matches with the word highlighted; Clear empties them | 3 |
| **P90-SEARCH-GAMES** | The game row narrows the chats, the notes and the game notes to one game | 3 |
| **P90-SEARCH-SETTINGS** | A on a Settings match opens the page in Steam; on Main no card appears while typing a setting's name | 3 |
| **P90-SEARCH-KB** | With the library installed, a word lists game notes and A shows the note's own words; with it removed, the group is absent | 5 |
| **P90-NOTE-CARD** | The card appears only for a keepable question and for "remember …"; Keep, Edit and Not now do what they say | 5 |
| **P90-NOTE-LINE** | The next answer for that game carries "Read N of your notes"; A opens the sheet; B returns to the line | 5 |
| **P90-NOTES-SHEET** | Switch off, Remove, and the sheet's words; the Search tab's list agrees with the sheet | 5 |
| **P90-NOTE-READ** | The app log and Show details say one note went in for a matching game and none for another game | 5 |
| **P90-SEARCH-JUMP-BACK** | A on a chat match lands on the question in its chat; Back returns with the same word | 5 |
| **P90-SEARCH-Y** | Y on Main opens Search, or the row records "no shortcut by design" from M-Y | 5 |
| **P90-NOTES-WIPE** (stand-in only) | After Clear all plugin data the Search tab lists no notes and the notes file is gone | stand-in |
| **QA-FREE-PLAY-01** | The standing sweep, with and without a game, for every Main-tab change (the card, the line, the card's removal, Y) | 6 |

## 6. The focus graphs (new controls, AGENTS.md "Adding a new control")

Each lane writes its graph into `docs/focus-graph.md` in the same commit as the control, in this shape.

**The card under the newest answer (N2):**

```
answer's rating row (Helpful / Not really)        <- Down from it lands on Keep
   | Down                                ^ Up
[ Keep ] --Right--> [ Edit ] --Right--> [ Not now ]      Left and Right at the ends hold still
   | Down (from any of the three)
"For: Hollow Knight ▸"                             <- A toggles this game / every game
   | Down
the Show details line, as before
```

Up from the card returns to the rating row. The card's three buttons and the "For" line are siblings in one
container, so the hops between them are plain sibling focus calls; in and out of the card go through the turn's own
graph (`liveTurnFocusGraph.ts`), as the summed-up note already does.

**The line above an answer (N2):** one stop between the question row and the answer's first section. Down from the
question lands on it; Down from it lands on the answer's first section; Up is the reverse. A opens the sheet; the
sheet remembers which line opened it (a module-level flag, not component state) and B puts the ring back there.

**The Search tab (N3, N3b):**

```
tab bar
   | Down                                ^ Up (from the game row's first button)
[ All ] [ Hollow Knight ] [ Hades ] ...  <- Left/Right walk the row; A picks; Right at the end holds still
   | Down                                ^ Up
[ find box: "Chats, settings, notes…" ]  <- A types a word
   | Down                                ^ Up
[ mantis 5 ] [ soul 3 ] [ battery 2 ] [ stutter 2 ]   <- Left/Right in the row, Down to the second row
[ charm 2 ]  [ boss 2 ]  [ story 1 ]   [ dash 1 ]
   | Down                                ^ Up
"N matches for 'mantis'"  [ Clear ]      <- Clear is a stop only while a word is picked
   match rows, one stop each, in group order (chats, notes, settings, game notes)
   -- or, before a word is picked --
   note rows, one stop each (A toggles on/off)
   | Down from the last row holds still
```

B anywhere on the tab goes back to the tab the person came from. On Main, "‹ Back to where you were" is one stop
above "N earlier" while a jump is live; Down from it goes to "N earlier" as before; Up from "N earlier" reaches it.

## 7. What could go wrong, and the calls taken meanwhile (plan 92 § 14 lists them for the maintainer)

- **Y may not be free.** Steam's own Quick Access page may act on Y or swallow it. Measured first; no shortcut if so
  (call 4).
- **Seven tabs in a 300-point bar.** The Developer tab on makes seven. Measured first; the side icons shrink one
  step if needed; the current tab's name never does.
- **The typed find box.** A plain Steam text field in the panel can leave the D-pad dead after the keyboard closes.
  The word buttons are the main path; the typed path is checked once on the Deck; if it misbehaves, the box becomes a
  button that opens the same two-layer field the question box uses, in a second round.
- **The jump.** Opening a day and pressing "Show N more" from code, then landing the ring on a row that has just been
  drawn, is the riskiest piece of this plan. It has its own lane (N3b) and steps up to Opus after one Deck failure.
- **The offer rule will miss phrases and offer on odd ones.** It is a word rule by the maintainer's call; the tests
  pin the twenty cases in § 4; anything else found on the Deck goes in the report as wording to add, not as a bug.
- **The chats file read for search.** Ten chats of up to 200 turns each are read once when the tab opens (about
  200 KB at most). If a Deck read takes more than a second, the method caches per session and the report says so.
- **The settings card's tests.** About twelve test files cover the card on Main; they move with the card or retire,
  one commit, and the Verify entry about the 24 Steam settings pages gets its route changed by the bookkeeper (the
  pages open from the Search tab now).
- **Plan 89's text-size change** touched font sizes in most screen files. N2 and N3 build after it lands; their new
  files read sizes through the same scale number.

## 8. For the maintainer, at the end (plan 92 § 11)

- The plain-language developer guide for this plan: how a note travels (card → file → the instruction sheet → the
  Show details chip → the line), how the Search tab finds things (one list of questions, the word rule, the four
  groups), and where each piece lives, with the file names. Written by the one running the session once the Deck
  checks are in, as a section in this plan.
- The roadmap: the Search entry moves to Verify at landing and to Done on its Deck passes; the stash entry becomes
  "the notes half DONE; the live half (phase 2, the session bundle) stays OPEN".

## 9. For the builders: where the code is (checked 2026-10-12 at `32f48643`; re-check at the session's own tip)

| Lane | Files it owns |
|---|---|
| N1 | New: `py_modules/backend/services/user_notes_service.py` (the file, caps, pick rule), `user_notes_rpc.py` (the three methods' bodies), `tests/test_user_notes_service.py`, `tests/test_user_notes_rpc.py`. Edits: `main.py` (three `async def` methods beside the chat-slot ones, about line 1019), `py_modules/backend/services/game_ai_request.py` (the pick, before the knowledge-base search), `ollama_prompts.py` (the block's text and its seam: `early_context_suffix`, about line 351; the layer-order test beside it), `transparency_service.py` (the record field and the chip, beside `kb_attached_notes` about lines 231 and 587), `chat_slot_service.py` (`_normalize_turn_transparency`, about line 187), `plugin_data_reset.py` (the wipe), `packages/bonsai-mcp/scripts/generate-architecture.mjs` (the `DOMAIN_KEYWORDS` table, about line 17: append `user_notes: ["user_note"]`) |
| N4 | New: the method body in `py_modules/backend/services/rag_corpus_rpc.py` or a sibling `knowledge_base_notes_search.py`; its test. Edits: `main.py` (one method beside `get_session_rag_chip_candidates`, about line 1212); the keyword pass lives in `knowledge_base_search.py` (`_search_sections`, read-only reuse) |
| N3 | New: `src/features/search-tab/` (`SearchTab.tsx`, `searchModel.ts`, `useSearchIndex.ts`, `SearchGameRow.tsx`, `SearchFindBox.tsx`, `SearchResults.tsx`, `SearchNotesList.tsx`, tests). Edits: `src/features/plugin-shell/tabTitles.tsx` (`BonsaiTabId`, the icon, the spoken name), `src/components/icons.tsx` (a magnifier in the tabs' style if none exists), `src/index.tsx` (the tab rows, about line 1145; the search tab's payload hook beside `useAboutTabPayload`), `src/features/plugin-shell/tabs/` (a new `useSearchTabPayload.tsx`), `TabIndicatorBar.tsx` and `tabBarNav.ts` (the order), `src/features/unified-input/constants.ts` (`TAB_BAR_SIDE_ICON_PX` if seven tabs need it), `py_modules/backend/services/chat_slot_rpc.py` and `main.py` (the `list_chat_slot_questions` method), the Main tab's card removal: `src/components/MainTabUnifiedAskBar.tsx` (the card's render, about lines 136 to 310), `src/hooks/useAskBarSettingsCardRows.ts`, `useAskBarSettingsCardVisibility.ts`, `useSteamSettingsSearch.ts` (keep the search; drop `shouldHideSettingsResultsCard`), `src/features/plugin-shell/tabs/useMainTabPayload.tsx` (the `filteredSettings` wiring), `src/features/unified-input/useUnifiedInputSurface.ts` (`--bonsai-search-host-width`), `src/data/bonsaiSettingsSchema.ts` (`UnifiedInputPersistenceMode`, line 61), the twelve `MainTabUnifiedAskBar.settingsCard*.test.tsx` files |
| N2 | New: `src/features/user-notes/` (`NoteOfferCard.tsx`, `NotesReadLine.tsx`, `UserNotesSheet.tsx`, `useUserNotes.ts`, `userNotesStore.ts`, tests), `py_modules/backend/services/user_note_offer.py` and its test, `user_note_commands.py` (the "remember …" local command, in the `ask_local_commands.py` family). Edits: `game_ai_request.py` (the `note_offer` field on the reply), `ask_local_commands.py` (the fourth kind), `transparency_service.py` (the local command's snapshot), `src/components/MainTabChatTranscript.tsx` (mount only: at its growth limit of 1,104 code lines), `src/utils/buildReplyActionsElement.tsx` (the card's slot after the row), `src/utils/buildAnswerBubbleElement.tsx` or `buildTurnHeaderElement.tsx` (the line's slot above the answer), `src/utils/liveTurnFocusGraph.ts` and `replyStopRegistry.ts` (the new stops), `src/utils/inputTransparency.ts` (the `user_notes_attached` type), `src/utils/contextChipsFromSnapshot.ts` (the chip), `src/features/chat-slots/ChatSlotRenameModal.tsx` (read-only: the text popup's shape to copy) |
| N3b | New: `src/features/search-tab/searchJumpStore.ts`, `useSearchJump.ts`, `SearchBackLine.tsx`, tests. Edits: `src/hooks/useEarlierTurnsPill.ts` (a "reveal this turn" function: open the day, press Show more, hand the ring to the row), `src/utils/earlierTurnsByDay.ts` (which day holds a turn), `src/components/buildEarlierList.tsx` (the Back line above "N earlier"), `src/hooks/useChatSlots.ts` (switch to a chat by id, read-only reuse), `src/utils/focusNavigation.ts` (`isOptionsDeckButtonEvent`, beside `isOkDeckButtonEvent` about line 152), `src/components/MainTab.tsx` (the Y handler on the Main tab's column) |
| Evidence and drawings to read first | `docs/demos/mockup-board/src/47b-notes-r2.js`, `49b-search-r2.js`, `49-search.js` (the word rule `sWords`, the jump `sJump`, the finder `sFinder`); `docs/focus-graph.md` § "The 'From the notes' block" (a control between two stops, every trap), § "The 'Show N more' line"; `src/features/chat-sum-up/SessionTitleOffer.tsx` (an offer row under a card, the pattern for the note card's buttons) |
| Plan 89 touched | `src/data/steamSettingsNavigation.ts` (the 24 page names, lane S3) and font sizes in most screen files (lane S1): read them at the tip before N3 and N2 start |

## 10. Developer guide: how the notes and the Search tab are built (written 2026-10-12, after the first night)

What landed on the first night (plan 92): the notes' back end and Ask reading them, the game-notes search, and the
Search tab's first half. The second night (the same day) built the rest: the note card, the "Read N of your notes"
line, the notes sheet and "remember …" (lane N2), and the jump into a chat with the Back line, B and Y (lane N3b); the
last two paragraphs below describe them.

**How a note travels.** A note is one small record (its words, a game or every game, on or off) kept in one file,
`user_notes.json`, beside the saved chats in the plugin's settings folder. Three back-end calls read and change it:
list, save (new or edit) and delete; they live in `py_modules/backend/services/user_notes_service.py` (the file, the
40-note and 200-character limits, the crash-safe write) and `user_notes_rpc.py` (the calls), with two-line
pass-throughs in `main.py` beside the chat calls. "Clear all plugin data" removes the file because it empties the
whole settings folder. Before every Ask, `user_notes_for_ask.py` picks the notes that are on and fit the question's
game (same Steam id; or the same game name when there is no id, and with nothing running, the game the question
names or the chat's own game), newest first, at most 8 notes and 1,000 characters, and turns them into one block.
`ollama_prompts.py` puts that block right after the AI's identity lines, ahead of the Proton and knowledge-base
text, and keeps it there even when the knowledge block is moved to the end (the `user_notes_block` parameter). The
same pick becomes the Show details record (`user_notes_attached`, and `user_notes_off_count` for "your notes are all
off") and a "Your notes (N)" chip, built in `transparency_service.py` like the knowledge-base chip; the chat file keeps
the record (`chat_slot_service.py`'s turn cleaner). The plugin log line for an Ask says `user_notes=N`.

**How the Search tab finds things.** One back-end call, `list_chat_slot_questions` (in `chat_slot_rpc.py`), returns
every saved chat with its questions; a question asked with no game running gets the chat's own game, so the game row
can still name it. The screen does the rest in `src/features/search-tab/`: `searchModel.ts` holds the pure rules (the
eight word buttons from your own questions: four letters or longer, everyday words skipped, plurals folded; the
matching for each group; the game narrowing), `useSearchIndex.ts` loads the chats and notes when the tab opens and
after an answer finishes, `searchApi.ts` holds the back-end calls by name. The four groups, in order: your chats,
your notes, the Steam settings bonsAI can open (the same search the old card above the question box used, which is
gone from the Main tab now), and the knowledge library's notes (`knowledge_base_notes_search.py`, a keyword pass over
the library's own index; a note whose name does not hold your word shows a plain title until opened, so a boss you
never typed is not named). A game note opens inside the tab (`GameNoteSheet.tsx`), not as a Decky popup, because
closing a popup rebuilds the tab and would lose the word.

**The D-pad.** Every stop on the Search tab handles all four directions itself (`searchNav.ts`, `useSearchNav.ts`,
`SearchStop.tsx`), so nothing depends on how Steam groups the controls. The tab's state (the word, the game, which note
is open) lives in `searchTabStore.ts`, outside the components, so a rebuilt tab keeps it. The tab's place: it is
first in the tab list (`src/features/plugin-shell/tabTitles.tsx`, the tab rows in `src/index.tsx`), and the bar's
side icons are one step smaller (`TAB_BAR_SIDE_ICON_PX`) so seven tabs fit with the Developer tab on.

**To change something later:** a new word to skip on the word buttons → `searchModel.ts`; a new group → `searchModel.ts`
for the matching, `SearchResults.tsx` for the drawing, a stop rule in `searchNav.ts`; what Ask does with the notes →
`user_notes_for_ask.py` and the block's words in `user_notes_service.py`; the note limits → `user_notes_service.py`
(the screen shows the back end's own words when it refuses).

**The note card, the line and the sheet (lane N2, second night).** The back end decides whether a question holds
something worth keeping (`py_modules/backend/services/user_note_offer.py`, a word rule on the question's own text: "I'm
doing a … run", "I prefer", "no spoilers" and the like; questions such as "should I prefer …" are skipped) and puts the
offer on the Ask reply (`note_offer`), worked out before the AI answers so a failed answer still carries it. Typing
"remember …" or "note: …" is a local command (`ask_local_commands.py`, its handler in `ask_local_command_handlers.py`):
no trip to the AI, the reply "Keep this as a note?" and the same offer. The screen pieces are in
`src/features/user-notes/`: `NoteOfferCard.tsx` (under a finished answer, after the Helpful / Not really row: Keep, Edit,
Not now, and a "For" line that flips between the game and every game), `NotesReadLine.tsx` (the "Read N of your notes ▸"
line between the question and the answer, from the turn's `user_notes_attached`), `UserNotesSheet.tsx` (every note
with its switch and its bin on one row), `useUserNotes.ts` (the back-end calls) and `userNotesStore.ts` (everything
that must survive the tab being rebuilt: the pending offer, an edit in progress, which line opened the sheet, and a
three-second window in which that line takes the ring back after the sheet closes, because the Ask bar also claims
the ring each time the Main tab is redrawn). The card takes the ring when it appears unless you are typing, which means
the question box holds the ring **and** has words in it (the box holds the ring whenever you were last there).

**The jump, the Back line, B and Y (lane N3b, second night).** A on a match under "Your chats" remembers the word, the
game and the match (`searchJumpStore.ts`, outside the components), switches to that chat with the shell's own tab
switch, opens "N earlier", the day that holds the question and enough "Show N more" (`useEarlierTurnsPill.ts`,
`earlierTurnsByDay.ts`), and hands the ring to the question's row through Steam's own transfer; `settleRing.ts` looks
again for about two seconds and puts the ring back on the question if Steam left it on the day line, stopping the moment
you press anything. While a jump is live, "‹ Back to where you were" (`SearchBackLine.tsx`, drawn by
`buildEarlierList.tsx`) is the first stop under the tab bar; A on it returns to the Search tab with the same word, game
and match. B anywhere on the Search tab returns to the tab you came from. Y (button 4, `isOptionsDeckButtonEvent` in
`src/utils/focusNavigation.ts`) on the Main tab opens the Search tab with the ring on the find box
(`useSearchShortcut.ts`); it is refused on other tabs, while the chats menu is open, and while a popup that asked for
the ring back is open. The plugin has no signal for Steam's on-screen keyboard, so Y with the keyboard open is left to
Steam (the maintainer's hand check).
