# Plan 97: the briefs, one per helper

How a brief is assembled: the session hands each helper `97-helper-rules.md`, the section below with its letter, the
tip hash, the absolute path of its copy, and the plan number (97). Nothing else is needed. A section says: what a
player sees today, where the trouble comes from (files and the reading behind it), what to build, the files owned,
the test at the Deck's level, and the Deck check that proves it (the row). Evidence files are named
`plan97-<ROW>.json` by the driver, never by a helper.

Model and effort per lane are in the plan's § 9. A lane that finds its brief wrong says so and stops rather than
building the brief's mistake.

---

## L1 — A question with a screenshot attached gets no answer (★★ ask, Sonnet high)

**What a player sees.** Attach a screenshot, ask, wait about 20 s: "Ollama returned an incomplete stream for model
'gemma4:e2b-it-qat' (no completion marker and no assistant text)". No answer. Seen three times on 2026-10-18.

**Where it comes from** (the scoping note `docs/audit/plan96-scope-screenshot-answer.md`, read it whole). A screenshot
under 500,000 bytes is sent untouched, and every Deck screenshot is 1920 by 1080 pixels even at 250 KB, so it goes out
at full size; the AI's picture reader then runs the graphics chip out of memory and Ollama closes the stream with
nothing. The shrink step exists and works; it is skipped by file size only.

**Build, two commits.**
1. In `py_modules/backend/media/screenshot_media.py`: remove the byte-size pass-through (`FFMPEG_PASSTHROUGH_BYTES` in
   `encode_image_with_ffmpeg`), so every picture goes through the shrink (it never enlarges; 0.11 s on the Deck). Change
   `tests/test_screenshot_media.py`: the test that pins the pass-through becomes "a 1920x1080 picture under 500 KB is
   shrunk" plus "a picture already within the preset's longest side comes out no bigger"; break the test on purpose by
   putting the skip back once, and name the failure you saw in the commit message. One sentence each in the file's
   header, `docs/troubleshooting.md` and `docs/knowledge-base.md` where they say a small picture is sent as it is.
2. In `py_modules/backend/ask/ollama_chat_stream.py` (the "no done line and no text" branch, near line 418) and its
   caller in `py_modules/backend/ask/ollama_service.py` (which knows `had_images`): when the request carried pictures,
   the message reads "The picture was too big for the AI to read. Try the Low screenshot quality in Settings, or a
   smaller screenshot." The old message stays for text-only requests. A test for each.

**Files owned:** the four above, their tests, the two docs sentences.

**The Deck check (P97-L1-PICTURE-ANSWER):** the 408 KB and a 250 KB 1920x1080 screenshot that failed on 2026-10-18
each get an answer naming what is on screen within 60 s; the plugin log's `payload_bytes` for each is under about
70 KB; the Ollama log shows no "device lost" or "Not enough memory" in the minute after; a 177 KB 1280x800 picture still
answers.

---

## L2 — The About reply-language pick flips back (★★ ui, Sonnet high)

**What a player sees.** About → the language button → Steam's list → pick Czech. The list closes, the ring jumps to the
tab bar, the button still says Follow system, the file still says follow system. Confirmed by hand 2026-10-18.

**Where it comes from** (the scoping note `docs/audit/plan96-scope-reply-language.md`, read it whole). Steam's list is
the one box opened without first taking a note of the screen; closing it rebuilds the tab, and the rebuilt screen reads
the file, which the 400 ms save never reached. Same family as the Thinking pick (fixed in `f2db2a56`).

**Build.** First a log line in the pick function (`dbg_fe_log`, the screen-to-plugin-log bridge in `main.py`) so one
Deck pick separates "the pick never arrives" from "the pick is lost in the rebuild". Then, in the shape the Thinking fix
and the downloads notice use: before the list opens, take the note of the screen (`captureSessionBeforeModal` in
`src/features/plugin-shell/useBonsaiPluginShell.ts`); on a pick, set the value, patch the waiting note
(`patchPendingSessionSettingsSnapshot` in `src/features/plugin-shell/bonsaiSessionSurvival.ts`), and save that one
field straight away (the persist-now path in `src/features/settings/usePluginSettings.ts`). Give the About tests a
list stand-in that can be picked from (`src/test-harness/aboutDeckyUi.tsx`).

**Files owned:** `src/features/about/AboutReplyLanguageSection.tsx`, `src/features/plugin-shell/tabs/useAboutTabPayload.tsx`,
the three files named above only where the note and the direct save need a seam, `src/features/about/AboutTab.test.tsx`,
a new test copied from `src/features/ai-connection/useThinkingNoticeGate.savedAfterReopen.test.tsx`, the stand-in.

**The test at the Deck's level:** run the real settings hook against a stand-in disk, open the list (the note is
taken), pick Czech, tear the screen down at once, build a fresh screen from the note: the stand-in file says czech and
the fresh screen shows Czech. A second case where the pick lands after the rebuild. Both fail today.

**The Deck check (P97-L2-LANGUAGE-PICK):** pick Czech: the button reads Czech and the file reads czech within 2 s;
close and reopen the plugin: still Czech; one short question's answer is in Czech; pick Follow system: the file follows.

---

## L3 — A hidden block on one line inside a bold heading leaves two stars showing (★ reply, Sonnet high)

**What a player sees.** A long answer's heading like "**7. …" holding a hidden block on one line shows the two
asterisks as plain text. Seen on the Deck 2026-10-14 twice (`workshop:test-evidence/plan93-P93-O3-SPOILER-CUT-D3.json`
holds the saved answer's text: use it as the fixture).

**Where it comes from.** `src/features/spoilers/expandOneLineSpoilerFences.ts` gives the one-line block's opening and
closing markers their own lines, and the bold marks that wrapped the line are left split across the new lines, so
Markdown no longer sees a bold pair.

**Build.** When a one-line block sits inside bold marks (or inside a heading line), close the bold before the opener
and reopen it after the closer, or drop the pair around the block, so no stray `**` is drawn; for both a finished and a
still-streaming answer (the opener-without-closer case). Test at the screen's level: render the bubble
(`buildAnswerBubbleElement`) with the real saved text and assert the drawn text holds no literal `**` and the heading
is bold; keep every existing test in `oneLineSpoilerBlock.test.tsx` and `gluedSpoilerOpener.test.tsx` green.

**Files owned:** that file and its tests; `src/features/answer/reply-actions/answerCopyText.ts` only if Copy must
match.

**The Deck check (P97-L3-SPOILER-BOLD):** an answer written in that shape (two differently worded Strategy questions
asking for a numbered list with one hidden boss step) shows the heading bold, a cover, and no stray stars. If neither
try produces the shape, the row reads UNCLEAR and the fix rests on its tests.

---

## L4 — While an answer writes it briefly shrinks by a line (★ reply, Sonnet high)

**What a player sees.** The answer dips 6 to 27 px for a moment, about seven times in one long answer, never at the
finish. The maintainer asked for it to be fixed (D131 call 1). Measured twice on the Deck
(`workshop:test-evidence/plan93-P93-M4-ANSWER-FINISH-after-try2.json`, the height sampler's script is in its `setup`).

**The reading to prove first** (lane O3's, unproven). The churning symbols live in one span at the end of the settled
text (`src/features/answer/stream/ScrambledAnswerText.tsx`). When a paragraph break arrives, the span moves from the
end of one block to the start of the next; for one beat the old block has lost the span's line and the new block has
not yet drawn one, so the answer is one line shorter, then grows back. Also look at `StreamMarkdownPieces.tsx` and
`streamMarkdownSplit.ts`, where a new piece begins.

**Build.** A test that walks a stream through a paragraph break beat by beat and records the drawn structure per beat
(jsdom has no layout, so count the line-carrying nodes): it must never drop. If the reading holds, keep the line: the
span stays in the old block until the new block's first settled letter is drawn, or the new block gets its span in the
same frame the old one loses it. If the reading does not hold, find what does drop (the test tells you) and report.

**Files owned:** the stream folder's files named above and their tests; `src/features/answer/bubble/answerBubble.ts`
for a style only.

**The Deck check (P97-L4-ANSWER-DIPS):** the plan 93 height sampler over two differently worded long answers reads no
dip over 2 px while writing (the scramble on and off).

---

## L5 — Glossary words are not underlined when the game is named but not running (★ reply, Sonnet high)

**What a player sees.** With nothing running, a question naming Deep Rock Galactic: Survivor gets no underlined words;
the glossary follows the running game only (`workshop:test-evidence/plan94-P94-GLOSSARY-NOGAME.json`). The maintainer's
call: underline them.

**Where it comes from.** The AI's instructions already get the words by app id or name
(`glossary_for_prompt` in `py_modules/backend/knowledge/knowledge_base_glossary.py`, called from
`py_modules/backend/ask/ollama_ask_service.py` with the turn's `app_id`/`app_name`); the screen fetches words by app id
only (`ensureGlossaryLoaded` in `src/features/glossary/glossaryStore.ts` → `get_rag_corpus_glossary(app_id)`), so with
no game running it has no key. The notes already follow a named game for one turn
(`set_aside_running_game_for_named_story_game` in `py_modules/backend/ask/game_ai_request.py`, and the chat's own game
when nothing is running and nothing is named).

**Build.** The back end tells the screen which game a turn's glossary follows (the same game the notes followed: the
running game, else the game named in the question, else the chat's own game), in the turn's result; the screen loads
that game's words for that turn (the back-end method takes a name as well as an id) and underlines them. The running
game still wins when one runs. Tests on both sides, including "nothing running, a named game, words underlined".

**Files owned:** `knowledge_base_glossary.py`, `ollama_ask_service.py` (the glossary call and the turn's result field),
`game_ai_request.py` only to read the resolved game, `glossaryStore.ts`, the transcript file that calls
`ensureGlossaryLoaded` for a turn (find it with `git grep ensureGlossaryLoaded`), the turn's payload type, tests.

**The Deck check (P97-L5-GLOSSARY-NAMED):** no game running: "What does kiting mean in Deep Rock Galactic: Survivor
and when should I overclock?" → "kiting" and "overclock" underlined; A on one opens its peek. With the game running a
Deep Rock question underlines as today.

---

## L6 — The About tab shows no build (★ ui, Sonnet medium)

**What a player sees.** "Version 0.5.0" and nothing to tell which build is on the Deck
(`workshop:test-evidence/plan94-P94-ABOUT.json`). A tester cannot tell builds apart from the screen.

**Build.** A back-end method `get_build_info` (a public `async def` in `class Plugin`, `main.py`) that reads
`dist/index.js` under the plugin folder once at start: the first 12 characters of its sha256 and the file's modified
time; "unknown" when the file cannot be read. The About title line reads "Version 0.5.0 · build 8bdfff8b7f5e". The
bundle hash is exactly what the Deck drivers already record as the build, so the two match. Put the reader in the
back-end package that already holds plugin-level info (look under `py_modules/backend/` for where the version or the
settings folder is known; do not start a new package). The method list regenerates at landing; do not hand-edit it.

**Files owned:** `main.py` (the one method), the small back-end module, `src/features/about/AboutTab.tsx`,
`src/features/plugin-shell/tabs/useAboutTabPayload.tsx`, tests on both sides.

**The Deck check (P97-L6-ABOUT-BUILD):** the About line's build equals
`sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12` on the Deck.

---

## L7 — Two wording finds, and the known-problems line (★ docs, ollama; Haiku high, on trial)

Three small documentation changes, three commits, no code:

1. **The starter set's size** reads "about 4.6 GB" in one place and "about 4.5 GiB" in the box before it (D133 item 12).
   `git grep -n "4.6 GB\|4.5 GiB"`, pick "about 4.6 GB" everywhere (if the code lists the models' sizes, check the sum
   once and say so in the commit).
2. **The AGENTS.md sentence** in the focus section saying the only direct call to Steam's focus transfer is inside the
   registry, while 17 screen files call it. Check which is true: `git grep -n "TakeFocus(" src` (the direct Steam call)
   against `git grep -ln "takeNavFocus(" src` (the registry's helper). Rewrite the sentence so it says what the code
   does (most likely: the direct Steam call lives only in the registry; screen files go through its helper).
3. **The guide's known-problems list** (`docs/guide.md`, "Known problems"): add one line: with a game running and the AI
   on the Deck itself, the panel draws about 39 frames a second while an answer writes (about 91 when idle), with brief
   dips lower; with the AI on a PC it stays near 60. (Numbers: `plan94-P94-FRAME-RATE.json`; plan 89's SCR-10 run.)
   The README already points at that list; change nothing there.

If a heading changes anywhere, run `python scripts/docs_toc.py`. Report every file touched. No Deck row.

---

## L8 — Steam's own language dropdown reads as a light button to the look check (★ ui; Haiku high, on trial)

**The call:** exempt it (the maintainer, 2026-10-22). In `scripts/probe_deck_ui_look.py`, a control inside
`[data-bonsai-about-language-dropdown]` (the wrapper in `src/features/about/AboutReplyLanguageSection.tsx`) is skipped
by every rule, with a comment naming the date and the reason (Steam's own control, restyling it is not ours). Keep the
script's existing exemptions as they are. If the script has a test under `scripts/`, extend it; if not, say so.

**The Deck check (QA-LOOK-01, About):** the look check on About reports nothing, ring on a link or not.

---

## L9 — "Update knowledge base" offers any different version as newer, even an older one (★★ KB, Sonnet medium)

**What a player sees.** With the 2026.10.17 library installed and 2026.09.26 published, Update offers the older one as
an update and would replace the newer files (`workshop:test-evidence/plan86-B6-RESTORE.json`).

**Where it comes from.** `update_rag_corpus` in `py_modules/backend/knowledge/rag_corpus_rpc.py`: "remote version equal
to local" means up to date; anything else downloads.

**Build.** Read both versions as dates (YYYY.MM.DD). Both parse: download only when the published one is newer; equal
means up to date; published older means a new outcome, shown on the row as "You have 2026.10.17; the published library
is 2026.09.26. Nothing to do." and logged with both versions. Either does not parse: today's behaviour. The screen's
words for the new outcome live where the other outcomes become words (`git grep -n up_to_date src`). Tests for the
four cases.

**Files owned:** `rag_corpus_rpc.py`, its test file (`git grep -ln update_rag_corpus tests`), the one screen file that
turns the outcome into words and its test.

**The Deck check (P97-L9-KB-UPDATE):** Ollama tab → Knowledge base → Update: the line says the installed library is
newer and nothing downloads; the status still reads Installed, version 2026.10.17, 38 games; the plugin log names both
versions.

---

## L10 — With an external controller, Rename chat never brings up Steam's keyboard (★★ platform; Sonnet high, research only, 45 minutes)

**What a player sees.** On the Deck itself the keyboard pops up when the rename field is reached and the rename works.
With an external controller it never shows, even with Steam + X (the maintainer's hand check 2, 2026-10-18). "A user on
the couch with a controller cannot use that part of the plugin."

**Read, no code:** `src/features/chats/slots/ChatSlotRenameModal.tsx` (a Decky ConfirmModal holding a TextField with
`focusOnMount`); `src/features/chats/slots/chatSlotModal.ts`; how the question box takes text on the Main tab
(`src/features/ask/bar/MainTabUnifiedAskBar.tsx`, and the keyboard dismissal in `useBonsaiAskOrchestration.ts` near
line 1029); the Decky library's TextField source (`node_modules/@decky/ui/dist/components/`); the Steam client typings
(`node_modules/@decky/ui/dist/globals/steam-client/Input.d.ts` and `UI.d.ts`: `SetGamepadKeyboardText`,
`ModalKeyboardDismissed` and friends); and block A's two readings when they land: `plan97-A-KEYBOARD-FUNCS.json` (the
keyboard-related functions Steam exposes on this Deck) and `plan97-A-RENAME-RIG.json` (whether the rig's own A on the
field opened the keyboard: the rig is an external controller, an Xbox-style pad on a bridge board).

**Deliver one proposal, one page:** (a) if the rig reproduces it: the field needs an explicit "open the keyboard" step
when it takes the ring, name the call and where it goes, and the smallest test; (b) if the rig does not: the trouble is
specific to the maintainer's controller, say what to ask them to try and what the plugin could still do. Say what
would prove the route cannot be done from a plugin. L10-fix (Opus medium) builds from your page.

---

## L10-fix — Build L10's proposal (★★ platform, Opus medium, wave 2)

Build the route L10's page names, with its test; one commit. **The Deck check (P97-L10-RENAME-KEYBOARD):** with the rig,
chat name row → A → Sum up this chat → when the summary offers a title, Rename (or the rename box by the route L10 names)
→ A on the field: Steam's keyboard is on screen (screenshot, and a read of Steam's Big Picture page for the keyboard);
one letter pressed on it; Save; the chat's name changed.

---

## L11 — With the AI on a PC, answers should stream in a little quicker (★ reply, Sonnet high)

**The ask (the maintainer, 2026-10-17).** Keep the decode look, but tighter on a PC: a shorter tail of scrambled
letters behind the writing, a faster scramble, and text that grows faster. The AI on the Deck itself keeps today's feel.

**Where the numbers live.** `src/features/answer/stream/streamScrambleMath.ts` (`SCRAMBLE_TAIL_LETTERS` 10,
`SCRAMBLE_CHAR_MS`), `useSmoothStreamReveal.ts` (`TARGET_DRAIN_SECONDS` 0.18), `streamBeat.ts` (110 ms, leave it: it is
the frame-rate floor). Where the screen knows the AI is on a PC: the `ollama_local_on_deck` setting, read in
`src/features/ai-connection/OllamaTab.tsx` and `persistOllamaIp.ts`; the Ask flow can take one flag from the same
place, the way `lighterWhileGameRuns.ts` takes the game state.

**Build.** A "PC pace", applied only when the AI is not on the Deck: tail 10 → 5 letters, the settle rate about one
and a half times faster, drain 0.18 → 0.12 s. The Deck's own pace unchanged. A Deck switch in the same shape as
`lighterWhileGameRuns.ts` (`window.__bonsaiStreamPace = {...}`) so the driver can compare both paces inside one answer
(plan 69's segment method). One test per number and one for "on the Deck nothing changes".

**Files owned:** the three stream files, the one place the flag is read from, their tests.

**The Deck check (P97-L11-PC-PACE):** the Deck pointed at the PC's Ollama: two answers recorded (`deck_record`), the
frame rate sampled with plan 69's script shape, both paces in alternating 2.5 s segments; the PC pace within 5 frames a
second of today's; the recording goes to the maintainer's eye.

---

## L12 — After A sends "Explain further" the ring is on nothing (★ focus, Opus medium)

**Measurement in hand:** `workshop:test-evidence/plan96-P96-F6-EXPLAIN-try2.json` (and plan 94's
`plan94-P94-GLOSSARY.json`): the question goes out, the box closes, no control holds the ring until the next press.

**Where it comes from.** `explainFurther` in `src/features/glossary/GlossaryTermChip.tsx` sends the question and sets
the chip idle; nothing hands the ring on. The transcript wires it in `MainTabChatTranscript.tsx`.

**Build.** After the question is sent and the box closes, hand the ring to the question box through Steam's transfer
(`takeNavFocus("unified-input")`), falling back to the word's own chip if the transfer is refused. Never a plain
`focus()` across containers. The hint line stays as it is. A test that the chip asks for the transfer after the second A.

**Files owned:** the chip and its tests; the transcript file only for the wiring.

**The Deck check (P97-L12-EXPLAIN-RING):** the F6 second-try route: A on an open word: the question goes out, the box
closes, the ring is on the question box within 1 s (read focus: not empty), Down and Up move.

---

## L13 — At Large text a section summary shows a sliver or nothing, and the arrow touches the edge (★ ui, Opus medium)

**Measurement in hand:** `workshop:test-evidence/plan94-P94-TEXT-SIZE.json`: at Normal "Hide spoilers until I tap on"
shows 25 of 134 px; at Large the Story spoilers summary is 0 px wide with its arrow 3 px from the edge; nothing runs past
the right edge. Block A re-measures on tonight's build (`plan97-A-LARGE-TEXT.json`); wait for it before your commit.

**The call:** a summary with no room is hidden whole, never shown as a sliver (the maintainer, 2026-10-22).

**Where it lives.** `src/features/folded-tabs/FoldedSection.tsx` (the `.bonsai-fold-line__summary` span) and the
stylesheet section that styles the fold line (`git grep -n bonsai-fold-line src/styles`); `foldLineWidths.test.ts` reads
the numbers.

**Build.** In the stylesheet: the title's largest share of the line, the summary's smallest useful width, hidden
below it; the arrow keeps its gap at every size; width from the stylesheet, not from a measurement. State the rule as
arithmetic and have the test read every number back out of the stylesheet (the plan 84 lesson).

**Files owned:** the component, the stylesheet section, the tests.

**The Deck check (P97-L13-LARGE-TEXT):** Settings and Developer at Normal and at Large: the look check clean; every
summary either whole or absent (text range boxes); the arrow at least 8 px from the panel's edge; one screenshot per tab
per size for the eye.

---

## L14 — After a Steam box, the menu closing or a game launch, Down stops moving the ring (★★★ focus, Opus high, after consult 1)

**What a player sees.** Down from the question box, an answer, "Hide details" or the notes line does nothing; Up still
works; only a plugin reload clears it. Ten sightings. The clearest state (plan 96 block E): Deep Rock Galactic: Survivor
up about five minutes, the help chip showing, Down from the question box dead, the page's active element the Ask
button, `document.hasFocus()` false; one reload cleared it.

**The readings, read them all first:** plan 95 § 13 (`docs/planning/95-readme-refresh.md`); the plan 76 notes at the top
of `refocusPanelWindowIfLost` in `src/shared/dpad/navFocusRegistry.ts` and `uiWindowMissingFocus` in
`src/shared/dpad/uiDocument.ts`; `handleAnswerBubbleMoveDown` in `src/features/answer/bubble/answerBubbleNavigation.ts`;
the plain hops in `src/features/ask/bar/useMainTabAskBarFocus.ts`; block B's three tries tonight (`plan97-B-FREEZE-*.json`);
consult 1's answer. The pattern so far: in every stuck reading the panel's page has lost the browser's focus and
`window.focus()` does not give it back, so every plugin-made Down hop (a plain `focus()`) moves the page's focus but not
Steam's ring, while Up (Steam's own move) works.

**Build, three shapes, each its own commit with a test that models "page without focus"
(`navFocusRegistry.windowFocus.test.ts` has the shape), in this order unless the consult says otherwise:**
1. A log line through the plugin log (`dbg_fe_log`) whenever a Down handler runs with the page's focus missing, saying
   whether the ring moved. Every future freeze is then visible after the fact.
2. The plugin's own Down hops from the question box, the answer and the Settings section lines go through Steam's
   transfer where a registered node exists; where none does, and the window will not take focus back, re-take the
   nearest registered node through Steam (`TakeFocus(true)`) before the hop, instead of declining the press. Plan 76
   measured that a transfer stays in step even without page focus.
3. When the panel's page comes back after a Steam box or a menu close and reads no focus, one re-take through the
   registry.

**Files owned:** the two registry files, the answer bubble's navigation, the ask bar's focus hook, the Settings tab's
section-line Down (the tab-sections entry), their tests.

**The Deck checks:** **P97-L14-FREEZE**: block B's reproducing trigger three times after the fix: Down moves every
time, and the log shows the recovery line each time the page had lost focus. **P97-L14-SECTIONS**: plan 94's Settings
trigger (About → the language list → B → Settings → the Data line → Down) three times: the ring moves, and the page's
focus and the ring agree.

---

## L15 — A second tab strip is drawn over the chat after a touch or a pop-up with a game running (★★★ tabs, Opus medium, after consult 2)

**What a player sees.** With a game running, right after a pop-up closes or the screen is touched, a big strip (L1 and
R1 badges, the tab icons) is drawn over the top of the chat under the plugin's own thin bar. Three sightings over weeks;
the maintainer raised it to three stars and wants the root cause.

**The reading, read it whole:** `docs/audit/plan96-scope-ghost-tab-bar.md`. In short: the strip is Steam's own tab row,
which the plugin still mounts (for the shoulder buttons) and hides with one style rule from 2 September; every sighting
is that rule failing for a while, after Steam rebuilt its row behind a pop-up or a touch. Block B's page read with the
passive watcher (`plan97-B-GHOST-*.json`, the no-game control `plan97-A-GHOST-NOGAME.json`) and consult 2 say which of
the three candidates it is.

**Build (unless the reading says otherwise), two commits:**
1. The hide rule in `src/styles/sections/section-1.ts` (the Plan 30 block) relies only on what is ours: the row that
   holds a plugin title icon and does not hold the tab body; drop the bumper-badge condition. The test stand-in
   (`src/test-harness/deckyQuickAccessLayout.tsx`) gets Steam's row in its real shape, badges as images and as text, so
   the rule is tested at all.
2. A watcher drawn next to the hidden-tab trap (`src/features/plugin-shell/useHiddenTabHeaderTrap.ts`, mounted from
   `src/index.tsx`): on every page change, touch, press and focus, find Steam's row from the plugin's title icon and make
   sure it is `display: none` (set inline when it is not, with a `dbg_fe_log` line saying so). About forty lines and a
   test. Its log line is the evidence of how often and when the row comes back.

**Files owned:** the stylesheet section, the trap file (or a sibling), `src/index.tsx` for the mount only, the stand-in,
tests.

**The Deck check (P97-L15-GHOST):** with the game, the help pop-up route (A on the help chip or About's help link,
wait, B) three times: Steam's row reads hidden at 0.3, 1, 3 and 10 s, no second strip in any screenshot, the watcher's
log count recorded; the no-game control once. The touch check (TAB-BAR-GHOST-01, P84-TABS-02) stays the maintainer's.

---

## L16 — Up from Find LAN can skip the address box and the Save row (★ focus, Opus medium, after block A)

**What a player sees.** On the Ollama tab, Up from the Find LAN button sometimes lands on the second switch, past the
address box and the "Save current PC address" row (`plan96-P96-FINDLAN-try2.json`; block F saw the same). Not the same
twice.

**The reading:** block A's five Up presses (`plan97-A-FINDLAN-UP.json`): where each landed, the page's active element,
the ring.

**Where it lives.** `src/features/ai-connection/OllamaWhereAiRunsSection.tsx`: `handleMoveUpFromConnection` goes to
Browse or Cancel when the AI is on the Deck, else `tryMoveUpWithPanelScroll` onto the address box's node and falls to
the autostart toggle; the address box is Steam's text field, whose ref is Steam's component, not the input (the plan 92
lesson), and the Save row sits between.

**Build.** Up from Find LAN and from Test connection goes to the address box through a registered node (register one
on the box's Focusable wrapper, the shape the Search tab's find box uses), else to the Save row, never past it. The walk
test (`OllamaWhereAiRunsSection.findLanWalk.test.tsx`) models Steam's flow between siblings (`steamStep`).

**The Deck check (P97-L16-FINDLAN-UP):** five of five Up presses from Find LAN land on the address box; Up again lands
on the Save row; the free-play sweep on the Ollama tab clean.

---

## L17 — Two documents disagree about whether a Decky button passes D-pad moves on (★ focus, Sonnet medium, after block A)

**The question.** AGENTS.md ("Know which handler actually fires") and the focus checker's rule 17 say a Decky Button
never runs its own move handlers; plan 92 lanes saw Deck walks where they seemed to.

**Two reads decide it:** block A's `plan97-A-DECKY-BUTTON.json` (the Ask strip's Clear button carries a spread
`onMoveLeft` meant to put the ring on the mic or Stop button, `src/features/ask/bar/AskStripSendButtons.tsx` line 140:
the driver pressed Left on it and recorded where the ring went), and the library's own source: does the Decky Button
forward move props to its Focusable? (`node_modules/@decky/ui/dist/components/`; the Focusable's own prop filter is in
`Focusable.js`.)

**Build.** If the handler fires: fix the AGENTS.md sentence and the checker's rule 17 text and the baseline reasons
(`scripts/check-focus-patterns.mjs`, `scripts/focus-baseline.json`). If it does not: remove the 14 dead spread handlers
the baseline lists under `move-props-on-button` and lower the baseline with `--update`, one commit per file group,
tests green. Report which it was, with the two reads cited. No further Deck row.

---

## L18 — From Copy, Down with a game running landed on the Tip chip at a third visible (★★ focus, Opus medium, only if block B reproduces it)

Measurement: `plan86-FINDING-STOPPED-ANSWER-DOWN-LOOP.json` (the chip under the sidebar edge in game mode) and block
B's prepared setup (`plan97-B-TIP-CHIP.json`). If it reproduces: the chip row's landing in game mode scrolls the chip
whole into view before the ring lands (the dock-lift and sidebar rules in `src/shared/dpad/useDockClearanceOnFocus.ts`
and the chip row). If it does not reproduce on two builds: closed, no lane. **The Deck check (P97-L18-TIP-CHIP):** Down
from Copy lands on a chip that is whole on screen.

---

## L19 — Section lines read 92 percent visible, the chat name row 83 percent (★ ui, after block A's screenshots)

Block A takes the screenshots and the text-range boxes (`plan97-A-CLIPPED-LINES.json`). The session looks by eye. Whole
by eye: both entries close as the rig's own false alarm and X2 fixes the sampler. Clipped by eye: an Opus medium lane
with the numbers (the header strip under the chat name, `src/features/chats/title/`, and the fold line). **The Deck
check (P97-L19-CLIPPED-LINES):** the lines whole by eye and by text-range boxes at every stop.

---

## L20 — After "Download knowledge base" the library switch reads off while the file says on (★ ui, after block C's re-run)

Block C removes and downloads the library again and reads the switch and the file at 0, 30 and 60 s
(`plan97-L20-KB-SWITCH.json`). Not seen: closed as not reproduced on two builds (plan 94 did not see it either). Seen: a
Sonnet high lane makes `src/features/knowledge-library/KnowledgeBaseSection.tsx` re-read the setting and the status when
the download box closes (the lesson: closing a Decky pop-up rebuilds the tab, and the mount-time read can come before
the download finishes), with a test that unmounts and remounts around the download.

---

## G1 — Switching tabs with LB and RB should glide (★ tabs, Sonnet high: mock-ups only; then G1-build)

**The ask (the maintainer, 2026-10-17):** a subtle motion that makes the change easy to follow by eye; it must respect
reduced motion and never delay the next press. **Mock-ups must be done and one picked before any building.**

**Mock-ups.** Replace the rough sketch (`docs/demos/tab-switch-mockups.html`, plain squares) with three options drawn
at true size from the real bar: `src/features/plugin-shell/TabIndicatorBar.tsx` (20 points tall, the icons from
`src/features/plugin-shell/tabTitles.tsx`, the 300 px column, the Deck's own screen). (A) the current-tab marker slides
to the next tab while the page eases across, about 180 ms; (B) the marker slides and the page cross-fades, about 120 ms;
(C) the marker slides only, the page swaps at once. Each shown with reduced motion (no motion) beside it, and a line
on its cost in frames and on why it cannot delay a press (the stylesheet moves things; no state waits for an
animation). The session publishes it as a page with pick buttons (the plan 96 mock-up page's shape: picks saved on the
page) and puts the link on the checks page and in the plan. The maintainer picks when they check in.

**G1-build (after the pick; Sonnet high, Opus review because it touches the tab bar).** The marker's motion in the bar;
the page's motion as a class toggled on the tab body's root on each tab change, in the stylesheet; both switched off by
`prefers-reduced-motion` and by the plugin's own reduced-motion setting; the next press never gated on an animation;
tests for the class toggle and the two off-switches. **The Deck check (P97-G1-TAB-GLIDE):** a recording of five switches
each way; ten fast LB/RB presses: every press lands on the next tab, none lost; reduced motion shows no motion; the
frame rate while switching at least 45; the free-play sweep on Main clean. If no pick arrives before the fix wave ends,
the mock-ups wait and the entry reads "mock-ups drawn, pick owed".

---

## X2 — The test rig's own two bugs (★ QA; Sonnet high, in a copy of the rig's repo)

**Where:** the rig's repo on this PC, `C:\Users\still\decky-plugin-studio` (a separate project; it is the source of
truth for its tools). Make your own copy (a git worktree) and a branch `bonsai-p97`. Its own tests (454 passed on
2026-10-11) are the gate. Never push. The session merges the branch into the rig's main at the end (the maintainer's
call, 2026-10-22) and writes the findings-log lines in bonsAI's `docs/mcp-setup.md`.

1. **The rig reads every folded section line as 92 percent visible** while the lines read whole by eye. The saved
   evidence shapes: `plan92-P91-FOLD-SETTINGS.json` (11 of 12 sample points "clipped by a container"),
   `plan93-P93-M1-FOLDED-RING-OLLAMA.json` (1 of 12). Find the visibility sampler, reproduce the false reading against a
   page shaped like the saved one, and make the read match the eye: compare the text's own line boxes, and do not count
   a transparent or overflow-visible ancestor as clipping. A test with that page shape. (The same false alarm as the
   chat-name button; block A's by-eye screenshots say whether the lines really are whole.)
2. **Opening the plugin after a reload fails while the Decky tab is gone from the rail for up to 100 s.** The
   open-plugin step waits for the Decky tab to return to the Quick Access rail (up to 120 s, reporting how long it
   waited) before its first try counts, instead of failing at once. A test.

Report: the branch, the commits, the tests, and what the next chat must check on the Deck (the rig's tools load only
when a chat starts).
