# Plan 107: briefs for mock-up board 6 (the maintainer's open calls, drawn)

Board folder: `docs/demos/mockup-board-6`. One tab per open call. The maintainer picks on the live page; the
session builds only what is picked. Rule this serves: an open call that changes what a person sees or presses is
shown as a mock-up of each choice before it is asked (AGENTS.md, "Writing to the maintainer").

## Rules for every helper

1. **You own only the files named in your section**, all inside `docs/demos/mockup-board-6/src/`. Do not edit the
   kit (`docs/demos/mockup-board-2/src`), another tab's files, `build.sh`, `50-body.html`, or anything outside the
   board folder. Run no git command that changes anything. Do not touch the Steam Deck. Install nothing.
2. **Learn the board from what exists, reading as little as you can** (Grep first, then read ranges):
   `docs/demos/mockup-board-5/README.md` (how a board works), the kit in `docs/demos/mockup-board-2/src`
   (`20-kit.js`, `21-kit2.js`, `30-core.js`: `h()`, `deckFrame()`, `reviewBlock()`, the D-pad engine driven by
   `data-stop` and `data-row`, and the `TABS` list), and the board-5 tab named in your section as the worked
   example. Board 5's tab files are large; copy only the pieces you need, renamed.
3. **A tab is two files:** `6N-name.css` (plain CSS wrapped in `<style>` … `</style>`, exactly as board 5's files
   are) and `7N-name.js` (ends with `TABS.push(...)`). Every class, function and constant starts with `b6tN`
   (N is your tab number) so nothing clashes.
4. **True size, real words.** The plugin's column is 300 points wide. Every word on a drawn panel is copied from
   the plugin's code at the file and line given (open it and copy exactly). Draw the part of the screen that
   changes plus enough around it to recognise where you are; do not rebuild a whole tab.
5. **Each option is a card** with an id (`t3-today`, `t3-A`, …), a short plain title, and one or two sentences
   saying what a person would notice and what it costs (for example "adds one D-pad stop", "the card grows by one
   line"). Where something exists today, "Today" is the first card. Each card carries the kit's Like / Not this
   and comment block (`reviewBlock`), keyed by the option id.
6. **A choice about behaviour is pressable** through the kit's D-pad engine (arrow keys, Enter is A, Esc is B, X
   is X), so the difference is felt, not described.
7. **Plain language** in every word a person reads on the page: short sentences, no file names, no code names,
   no internal ids. Say what a person would notice first.
8. **Small.** Aim under 25 KB of JS and 8 KB of CSS per tab.
9. **Check before you report:** `node --check` each JS file, then from the board folder run
   `sh build.sh check-<your-name>.html` and confirm it writes a file. Do not open a browser; the session checks
   the look and sends fixes back.
10. **Report (under 300 words):** files written; each option id with one line; anything you could not draw from
    the code and why. Never invent a fact about the plugin: write "unknown" and say what you looked at.

## Tab 1 `61-summed.css` + `71-summed.js`: where the "summed itself up" row sits

- **The call:** the row's words say "before this answer", but it is drawn under the answer.
- **Facts:** drawn after the answer bubble at `src/features/answer/transcript/MainTabChatTranscript.tsx:1285-1286`;
  its words and D-pad wiring in `src/features/chats/sum-up/buildChatSummaryNoteElement.tsx:48,112` (walk comment
  at `:21-27`).
- **Options:** Today · A: the row sits above the answer it speaks of (the D-pad meets it on the way down to the
  answer) · B: it stays under the answer with words that are true where it sits (offer two wordings).
- **Cost to state:** A changes the D-pad order of an answer (five files); B is words only.
- **Worked example:** board 5 `75-chips.js` (a Main tab drawing) and the kit's chat pieces.

## Tab 2 `62-card.css` + `72-card.js`: the download card's cut-off line

- **The call:** "Keep the Deck awake and online until this finishes." is cut off with "…" on the card.
- **Facts:** the words are in `src/features/downloads/statusJob.ts:28` and
  `src/features/ai-connection/ollamaSetupJob.ts:35`; the card is a fixed 110 px tall
  (`src/features/downloads/JobCard.tsx:5-6`); a one-line row is cut at about 46 characters, measured on the Deck
  (`src/features/downloads/siteLine.ts:19`, `jobLook.ts:168-172`). The line is 51 characters.
- **Options:** Today (cut off) · A1, A2, A3: three shorter wordings of 45 characters or fewer that keep "awake"
  and "online" (one of them: "Keep the Deck awake and online until done.") · B: the full sentence on two lines
  (say how many pixels taller the card gets).
- **Also draw, for the eye only (not a choice):** the Ollama update card with a progress line the way a model
  download shows megabytes today ("Downloading Ollama: 412 MB of 1.5 GB"), beside today's "Installing the newest
  Ollama" with no number (`ollamaSetupJob.ts:56-101`). Label it "Being built this session".
- **Worked example:** board 5 `72-ollama.js` (the job card and the bar are already drawn there).

## Tab 3 `63-reinstall.css` + `73-reinstall.js`: Reinstall on a voice engine that is already there

- **The call:** with the voice engine and the speech model installed, Reinstall still shows the notice that
  something will be downloaded, but nothing is downloaded.
- **Facts:** `src/features/voice/VoiceInputSettingsSection.tsx:276-285` lists both items on purpose when nothing
  is missing; the back end downloads nothing then (`py_modules/backend/voice/voice_transcription_service.py:278-280`,
  `voice_model_download_service.py:326-329`). The notice's words: `src/features/downloads/downloadSites.ts:96`.
- **Options:** Today · A: Reinstall says in one line that everything is already installed and downloads nothing ·
  B: Reinstall really removes and downloads again, so the notice is true (about 730 MB; say so) · C: the button
  is greyed while everything is installed.
- **Second small call on the same tab:** after the screen reloads, the line "✓ Library updated." can be the wrong
  one of two (`src/features/knowledge-library/KnowledgeBaseSection.tsx:855`, `knowledgeLibraryJob.ts:44,62`).
  Options: one neutral line for both cases ("✓ Library ready.") · keep two lines and remember which applies.
- **Worked example:** board 5 `72-ollama.js`.

## Tab 4 `64-copies.css` + `74-copies.js`: community copies of models under "Open source only"

- **The call (important: it decides which models answer):** since plan 106 a model name with a part before the
  slash, such as `hf.co/someone/model`, counts as "unknown", not open source.
- **Corrected the same day by the helper that drew this tab, and checked by the session:** the sentence below that
  "the copy downloads fine" was wrong. The name box refuses any name with a slash
  (`src/features/models/pull-box/mergePullModelCatalog.ts:27`; the back end's same rule at
  `py_modules/backend/ollama/ollama_catalog_service.py:31`), so a community copy cannot be downloaded through
  bonsAI at all. One that is already installed (pulled by hand, or on the PC) is listed with no tag and passed
  over when asking. The tab is drawn that way.
- **Facts (read them in the code before drawing):** the rule is `py_modules/backend/ollama/model_policy.py:144,146,173`
  with the setting levels at `:218-228`; it is applied when a question picks a model
  (`py_modules/backend/ask/ollama_ask_extras.py:105,113`), **not** when downloading: the typed-name download never
  checks it (`src/features/models/pull-box/usePullModelCustomTagPull.tsx:70-100`). So today the copy downloads
  fine and is then skipped when asking *(wrong: see the correction above)*. If it is the only model installed, the reply is "No model in bonsAI's
  routing list is installed…" (`py_modules/backend/ask/ollama_ask_service.py:321-328`). There is no licence label
  for "unknown" (`transparency_service.py:511-519`). The switch that lets it be used is "Allow non-FOSS and
  unclassified Ollama tags (Tier 3)" (`src/features/models/ModelRoutingAdvancedPanel.tsx:40`) with the level
  "Any installed model"; "Also try open-weight models" does not allow it.
- **Options:** Today (downloads, then silently never used) · A: same rule, but it says so: a line when the name
  is typed and a tag on the model in the list · B: a community copy of an open-source family is allowed at the
  middle level ("Also try open-weight models") · C: as before plan 106 (counted as open source without a check).
- **Draw for each:** the typed-name download, the model in the list, and what the next question gets.
- **Worked example:** board 5 `73-models.js` (the AI models box).

## Tab 5 `65-models.css` + `75-models.js`: the Ollama tab's "AI models" takes two presses

- **The call:** "AI models" is a section line with one button inside: A opens the section, Down reaches the
  button, a second A opens the box.
- **Facts:** `src/features/ai-connection/OllamaTab.tsx:371-417`, `ollamaTabFolds.ts:32`,
  `src/features/folded-tabs/FoldedSection.tsx:177-193`. Up from "Open all" lands on "AI models" today.
- **Options (all pressable):** Today · A: A on the line opens the box at once (the line no longer folds) · B: a
  plain button row with no section line.
- **Worked example:** board 5 `71-sections.js`.

## Tab 6 `66-bar.css` + `76-bar.js`: reaching the download bar's Cancel on Main

- **The call (important: it adds a D-pad route on the most-used screen):** while a download runs and its card is
  out of sight, a bar shows at the panel's foot. On Main the D-pad cannot reach the bar's Cancel; only a touch can.
- **Facts (read them in the code before drawing):** `src/features/downloads/JobBar.tsx:48-52` (taking the ring),
  `:58` (Up from the bar), `:69,97` (its X handler), `:131-135` (the "Cancel X" hint hidden on Main);
  `src/features/ask/bar/AskStripSendButtons.tsx:185-211` (the Ask button has no Down move);
  `src/features/ask/bar/useMainTabAskBarFocus.ts:250-278`; `docs/focus-graph.md:1031-1032`. The bar is 56 px
  tall. Find out from the code what X already does on Main before offering it.
- **Options (all pressable, with a download running):** Today (touch only) · A: Down from Ask lands on the bar,
  Up goes back · B: Down from any stop of the question strip lands on the bar · C: no new stop; the bar on Main
  says where to cancel ("Cancel on the Ollama tab") · D, only if X is free on Main: X cancels from anywhere on
  Main and the "Cancel X" hint comes back.
- **Cost to state:** A and B add one stop under the question box on Main while a download runs.
- **Worked example:** board 5 `72-ollama.js` (the bar, and Main with the bar).

## Tab 7 `67-press.css` + `77-press.js`: presses that start or stop something big

- **Call one:** X pressed anywhere on a tab stops a running long job at once, such as the 15-minute voice engine
  build. Facts: `src/features/folded-tabs/TabBodyFocusRoot.tsx:78-80` calling
  `src/features/downloads/runningJobs.ts:188-193`; `JobBar.tsx:69`. The maintainer's standing rule (2026-11-19):
  a Cancel is a kill switch and reacts at the press. Options (pressable): Today · A: X stops the job only while
  the ring is on the card or the bar · B: X anywhere asks first, for long jobs only.
- **Call two:** on the Ollama tab, Update starts at one press (the confirm box was removed on purpose on
  2026-10-10; since 2026-11-17 Cancel stops an update while it downloads). Options (pressable): Today (one press,
  Cancel undoes it) · A: ask first ("Update Ollama? About 1.5 GB").
- **Worked example:** board 5 `72-ollama.js`.

## Tab 8 `68-small.css` + `78-small.js`: three small ones on Main

- **Call one, ten chats:** with ten chats saved and none open, Ask opens the "pick a chat to delete" list
  (find it: `git show --stat 4a2cbbcb3`, `useAskAtChatLimit`). On Cancel or B nothing is sent. Options
  (pressable): A: the question stays in the box (built today; the session's reading, not yet the maintainer's
  word) · B: the box is cleared.
- **Call two, the Pyro character's "Agent suggestion" chip:** about 3 Pyro answers in 10 end by offering a fixed
  "manager tip" line, and the same line becomes the chip, so it reads like a copy (find the five lines: search
  for "Smoke-test the Ask flow"). Options: Today (the line in the answer and on the chip) · A: the chip only.
- **For the eye only (not a choice):** the low-memory warning's "Ask anyway" button reading "Asking…" from the
  press, beside today's unchanged button (`src/features/answer/transcript/ChatTranscriptHintRows.tsx:72-119`).
  Label it "Being built this session".
- **Worked example:** board 5 `75-chips.js`.

## Tab 9 `69-notes.css` + `79-notes.js`: three calls about words, not layout

- **Call one:** should the AI also be told when a game has no notes? Today only the player sees the "No notes
  for this game" line. It was built and measured and not landed: 10 against 11 of 24 answers said they did not
  know (too close to call). Show two real answers to the same question side by side, one from each setup, taken
  from the measurement files: search `C:\Users\still\Documents\bonsAI-workshop\archive\research` for the plan 104
  files on this (and `docs/planning/104-kb-wave-seven-honest-answers-and-the-leftovers.md` section 13 for their
  names). If no pair of real answers can be found, say so in your report and draw the numbers only. Options:
  tell the AI · leave it.
- **Call two:** the honest answer's Speed-mode option. Measured twice, it changes nothing: 8 of 18 made-up
  answers were written as real in every setup. It is switched off. Options: remove the option · keep it, off.
  Numbers only; no drawing needed beyond a small table.
- **Call three:** the starter-models box: the paragraph that explains "Turn on and download" sits last, hidden
  until Down. Facts: `src/shared/TwoButtonConfirmModal.tsx:18,122`, `src/features/downloads/downloadNotice.tsx:313-317`,
  `src/features/models/localOllamaStarterSet.tsx:58,98`. Options (pressable scroll): Today · A: that paragraph
  first.
- **Worked example:** `docs/demos/mockup-headline-first` (a plain side-by-side page) and board 5 `74-firstrun.js`
  (a box drawn at the Deck's size; read only the part that draws the box).

## Changed on 2026-11-19, after the maintainer's picks

The maintainer picked on most tabs and wrote that some calls were hard to understand; the notes on the page were
"This one doesn't work" (tab 5), "I don't want x to stop anything" (tab 7) and "Make the button look more like the
other buttons in steam os and bonsai, this looks cheap" (tab 8, the "Asking…" button). The session (Fable) changed
the page the same evening:

- **New files `60-pad.css` and `70-pad.js`:** an on-screen D-pad fixed at the foot of the page. The kit drives a
  panel from the keyboard only, so on a phone or a tablet no choice about presses could be felt. The pad sends the
  same presses to the panel last tapped, or to the panel nearest the middle of the screen.
- **Tab 5, redrawn:** a tap on the line or the button opened a stand-in box of grey bars that only Esc could
  close, and the count read "0 presses". Now the ring starts on AI models, a tap counts as a press, the box says
  what it is and has a Close button, and "Show me" plays the presses (three today; one in A and in B).
- **Tab 7, new choice C** (`t7-C`): X stops nothing; only A on Cancel stops; the X sign beside Cancel goes.
- **Tab 8, the "Ask anyway" button:** today's button is now drawn from the plugin's own values
  (`src/styles/settingsGlassButton.ts:63-81` with the row's size at `ChatTranscriptHintRows.tsx:116`); the first
  drawing used a darker fill than this button has. Two looks were added as a call: `t8-lookA` (full width,
  frosted, 36 px) and `t8-lookB` (full width, Steam's flat grey as the kit's `.k-btn`).
- **Tab 9, reworded:** call two is "an unused switch inside the code" and says it can be skipped; call three is
  "the box that asks before the first downloads".

**A rule for the next board:** every pressable panel must work by tap alone, and every stand-in box must say what
it is and close by tap. Check each tab with a mouse and no keyboard before publishing.

## Changed again on 2026-11-19 (late), after the second round of picks

The maintainer picked again and left three notes. Tab 7's choice C was liked (X stops nothing). The notes:
"None of these, put it under Where AI runs and let's think of a slightly more fitting name for that section"
(tab 5), "They both look out of place" (tab 8, Looks A and B, both marked no) and "Way to wordy on this pop-up.
Trim this down a lot" (tab 9, call three, both marked no). The session (Fable) redrew the three:

- **Tab 5 (`75-models.js`, `65-models.css`), third drawing.** The AI models line is gone and the first section
  holds one AI models button, in Browse models' place (both opened the same box). Four names for the section are
  the choices (`t5-n-models`, `t5-n-setup`, `t5-n-where`, `t5-n-keep`), each on the real tab with the section
  open; `t5-today` stays for comparison. The first switch, or a button under the panel, draws the section with
  the AI on a PC. "Show me" walks from the top of the tab: five presses in the new place, twelve today.
- **Tab 8 (`78-small.js`, `68-small.css`), third drawing of the button.** Looks A and B are taken off the page.
  Look C is the chat's own small button (Helpful, Not really), Look D a suggestion chip, Look E the small
  button inside the warning's bubble. Under each sits a strip of the screen's other buttons at true size.
- **Tab 9 (`79-notes.js`, `69-notes.css`), second drawing of the box.** "The explaining sentence first" is taken
  off the page. `t9-c3-short` (80 words) and `t9-c3-shortest` (27 words) stand beside today's 238. The line
  under each box counts its words and says whether they fit without scrolling.

**Two more rules for the next board:** when a choice is refused with a note, the next drawing starts from the
plugin's own screen around it (what else sits there, at true size), not from a new idea; and a wording call
shows its word count and what each shorter version leaves out.
