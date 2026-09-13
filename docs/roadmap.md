# bonsAI Roadmap

> **Clean-up task — trim this file.** ★★ · about 30 minutes with one worker · Sonnet 5 at high effort.
>
> Reading this costs roughly **23,000 tokens**, and the house rules say it is read before any work is
> marked done — so that cost lands on every single piece of work. Getting it to 40 KB would save
> roughly **13,000 tokens** every time. Together with the testing rows, trimming both saves about
> **31,000 tokens per landing**.
>
> The finished list already moved to the archive on 2026-09-13. Going further means archiving the
> older knowledge-base entries and the checks that are closed but still sitting here — which is a
> decision about what stays visible, not a straight move, so it needs asking rather than assuming.
>
> Not started. Filed 2026-09-13 during the clean-up.

Open bugs, work fixed but not yet confirmed on the Deck, planned features, and what shipped for v0.5.0. Four lists plus one
section for the knowledge base, each sorted from one star to six.

- **Knowledge base and RAG, all in one place:** [its own section](#knowledge-base-and-rag) — bugs, owed checks, next steps
  and the calls waiting on the maintainer, with [a status report](planning/37-rag-status-report.md) kept in step with it.
- **Long notes for open items:** [roadmap-details.md](roadmap-details.md)
- **Shipped features, full detail:** [archive/roadmap-completed.md](archive/roadmap-completed.md) · **Fixed bugs, full detail:** [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md)
- **What shipped for v0.5.0, one line each:** moved out to its own file to keep this one small — [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).
- **Maintainer decisions (D1 onward):** [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md)
- **QA rows and device evidence:** [testing.md](testing.md), [testing-manual.md](testing-manual.md) · **Release notes:** [CHANGELOG.md](../CHANGELOG.md)
- **Checks only the maintainer can do** — the standing list, kept as a tickable page:
  [Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
  Anything a session finds that needs their eyes or their fingers is added there, not left in a chat.

## House rules for this file

1. **An entry is at most five lines**, in plain language, and says what a user would notice. Anything longer goes to
   [roadmap-details.md](roadmap-details.md) (open) or [archive/](archive/) (finished) and is linked, never deleted.
2. **Three lists for live work: [Bugs](#bugs), [Features](#features), [Verify](#verify)** — except knowledge-base work,
   which keeps its bugs, owed checks and plans together in [Knowledge base and RAG](#knowledge-base-and-rag). A new entry goes
   straight into the right list at its star position (ascending; within a star band by tag, then by title) with a tag. Do not
   add sub-headings beyond Verify's own **Bugs** / **Features** split and the knowledge-base section's own lists.
3. **Status words in Bugs and Features:** **OPEN** (nothing built) · **PARTIAL** (some of it built) · **ACCEPTED** (the
   maintainer chose to live with it). Nothing else — as soon as something is fixed and unit-tested, it moves to **Verify**
   rather than taking a fourth status word.
4. **When code lands that fixes a Bugs entry or ships a Features entry, but a Deck check is still owed:** move the entry, in
   the same commit, out of Bugs or Features and into Verify's matching sub-list (name the QA row). **When the Deck check
   passes:** move it again, same-commit, into [Done](#done-for-v050) as one line, with the full entry going to the matching
   archive file. Never leave a finished item sitting in Bugs or Features, and never mark one with a strike-through.
5. **Stars** are effort and risk on the GTA scale: `★` easiest … `★★★★★` very high; `★★★★★★` extreme scope.
6. **Tags:** `[ask]` Ask bar and input · `[chat]` chat slots · `[chips]` preset chips · `[focus]` D-pad and focus ring ·
   `[KB]` knowledge base · `[layout]` Main tab layout and vertical space · `[ollama]` models and routing · `[perms]` permissions ·
   `[platform]` build, deploy, tooling, upstream · `[QA]` testing · `[reply]` the answer itself · `[tabs]` the tab bar ·
   `[ui]` everything else on screen · `[voice]` voice · `[shelved]` parked on purpose; the entry says why and what unshelves it.

**Every Main-tab UI change also owes the free-play sweep** (standing row **QA-FREE-PLAY-01** in
[testing-manual.md](testing-manual.md)): walk the pane like a user and require every focused stop to also be visible.

**Maintainer note (2026-09-05): pick the model before you pick up an item.** Rough guide, details and evidence in
[planning/33-model-routing.md](planning/33-model-routing.md), policy in [AGENTS.md § 3](../AGENTS.md):
★–★★ Sonnet 5 high · ★★★–★★★★ Opus xhigh plans, Sonnet lanes implement when the cause is known · ★★★★★+ Fable max
plans only, Sonnet lanes build, Opus xhigh lands · `[focus]` `[layout]` `[ui]` measure on the Deck first, then Opus xhigh,
never a lane without the measurement · docs and bookkeeping Sonnet or Opus medium (the bookkeeper helper; a guard
refuses Fable's own edits to the roadmap, testing docs, changelog and test files) · escalate a tier only after two device
failures with a measurement · Haiku 4.5 on trial for read-only lookups, log each use in plan 33 § 4a. A prompt-time
hook gives a gentle heads-up when a session starts work outside this.

---

## Bugs


- ★ `[ask]` **A follow-up offered a place from a different game** — **OPEN, seen on the Deck 2026-09-13.**
  Asked how the excursion funnel works in Portal 2, the reply was right, then the follow-up asked *"Where are you at in
  Portal 2?"* and offered **A. Just arrived at the train station** and **B. Fighting through Ravenholm**. Ravenholm is
  Half-Life 2, not Portal 2. The answer itself was correct; only the two choices under it were invented. Spotted during the
  clean-up's Deck check and nothing to do with it — no game was running, Strategy mode, the small local model.
  [Evidence](test-evidence/phase3-delete-round-deck-check.json).

- ★ `[chat]` **A short question fades out at its right edge as if there were more to read** — **OPEN, seen on the
  Deck 2026-09-13.** The fade is meant to hint that a long question has been cut short. It is drawn on every open question,
  so a one-line one like *what about its second phase* fades too and looks cut when nothing is missing. It should only fade
  when the text really is longer than the room it has. Screenshots `screenshots/DeckCapture_20260913_125644_game.png` and
  `screenshots/DeckCapture_20260913_125707_game.png`.

- ★ `[focus]` **Pressing A on an open question closes it and drops the highlight** — the answer folds away and the ring
  lands nowhere; the next D-pad press places it fresh instead of moving it. Seen on the Deck 2026-09-06 while checking the
  corner icons, and the earlier run that pressed the question recorded the same landing ("nothing"), so it is not new to
  the corner icons. Runs: `retry-corner-collapse-question`, `press-question-not-retry`.

- ★ `[focus]` **Closing the model try order picker drops the highlight onto the tab rather than the button you opened it from** —
  **OPEN, seen twice 2026-09-06.** After pressing *Done*, the highlight lands on the Ollama tab's outer frame, not back on
  *Set text model try order…*. It is not a dead end — the next press moves normally — but it costs about thirteen presses to get
  back to where you were. The *Clear cache…* and *Clear all data…* buttons were taught to hand the highlight back on
  2026-09-04; the two try-order buttons were not.

- ★ `[focus]` **A greyed-out button still takes the highlight, so the D-pad lands on something that does nothing** —
  **OPEN, measured 2026-09-05.** Watched on the device while a question was in flight: the Ask button is greyed and the
  highlight still lands on it. It is not one button — it is how greyed buttons behave here, so it now also applies to the
  Helpful and Not really buttons that were greyed on a stopped reply the same day. The greyed *Clear frozen test chips*
  button had the same problem and was fixed by removing it; that is not open here, because the maintainer asked for greyed
  rather than gone. So the fix is to step over them with the D-pad instead. Evidence `docs/test-evidence/round35-CHECK-stop-press.json`.
- ★ `[focus]` **Left on the collapsed-history row throws the highlight out of the plugin** — **OPEN, found 2026-09-05,
  confirmed twice.** With the highlight on the *N earlier* row above a chat, Left hands it to Steam's Quick Access rail and
  the person is out of bonsAI entirely. Right brings it back, but nothing says so. Same shape as the Ollama sliders fixed on
  2026-09-04: the row does not claim the press, so Steam's own idea of "past the edge" fires. Left should either walk the
  history or hold still. Evidence `docs/test-evidence/round35-BUG-left-from-earlier-pill-leaves-plugin.json`,
  `docs/test-evidence/round35-BUG-left-from-earlier-pill-retry.json`.
- ★ `[focus]` **Pressing Ask drops the highlight** — **OPEN, found 2026-09-05, widened the same day.** Filed first as an
  empty-box problem; it is not. **Every** press of the Ask button leaves nothing highlighted — with a real question and with an
  empty box alike, measured four times. The page's own focus falls back to the document body, so the next press has to place the
  highlight again before it can move it. On a fresh panel that placing press lands on Decky's back arrow, above the plugin. Same
  family as nothing being highlighted when the panel opens, and likely the same fix.
- ★ `[focus]` **Down does not move the ring off an unrevealed spoiler block** — **OPEN, found 2026-09-04, did not reproduce
  2026-09-05.** With the ring on the hidden block, Down reported the press arriving and nothing moving. Retried today on a fresh
  Red Dead ending reply with a real hidden block on screen: **Down left it normally**, straight onto the branch picker's first
  button, and every stop on the walk was fully visible. So the hidden state does not trap on its own. Most likely the same
  underlying fault as the stuck panel below — both are a hop that dies only sometimes — and best closed with it rather than
  chased separately. Evidence `docs/test-evidence/round35-spoiler-block-down-and-up.json`.
- ★ `[focus]` **Walking down a reply and walking back up visit different stops** — **OPEN, found 2026-09-05.** On one reply,
  Down went question, hidden spoiler block, branch A, branch B, Helpful — never stopping on either paragraph of the answer. Up
  from Helpful went both paragraphs, then the question — never stopping on the spoiler block or the branch buttons. So a person
  who walks past something and presses Up to go back does not return to it; they land somewhere they never visited. Related to the
  two-star entry about Up skipping sections, but sharper: the two directions disagree about what the reply's stops are.
  Evidence `docs/test-evidence/round35-spoiler-block-down-and-up.json`.
> - ★ `[platform]` `[shelved]` **In-IDE preview never gets past its loading screen** *— **OPEN, shelved 2026-09-11
>   (D93): not a gate for anything.** On the maintainer's machine the preview stops on its loading screen and never
>   moves past it; its command channel takes commands but never answers, and it produced no screenshot. Sorted with
>   the other tooling in plan 51's docs phase. It unshelves when the preview loads the plugin on the maintainer's
>   machine. [Plan](planning/51-refactor-round-two.md).*
- ★★ `[focus]` **After the panel remounts the ring parks on a zero-size container** — **OPEN, found 2026-09-04.** On a fresh mount
  the ring lands on "Ask bonsAI" (Main) or "Where AI runs" (Ollama), both 0x0 rects that the visibility oracle calls OFFSCREEN, so
  the panel opens with nothing highlighted until the first press.
  **Measured again 2026-09-05** on builds 3 and 4 (four fresh mounts, two of them after a Decky loader restart): the reading was
  not a 0x0 stop but **no ring at all** — the rig's own report each time was *the ring is unowned, so the first D-pad press will
  place it rather than move it*, and that press then landed on the tab bar, visible. Same thing to look at (nothing is
  highlighted when the panel opens), so the fix is to place the ring on mount rather than to move it off a bad element.
  **Measured again 2026-09-05 on a fresh open, and it is worse than written:** nothing owned the highlight, and the first Down put
  it on **Decky's own back arrow at the top of the panel, outside bonsAI entirely**. So opening the plugin costs two presses before
  a person is anywhere useful, and the first one moves them away from the chat. Evidence `docs/test-evidence/round35-trap-attempt-1-after-b-reopen.json`.
- ★★ `[focus]` **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a
  blanket rule was tried and reverted in favour of Steam's native outline.
- ★★ `[focus]` **Up skips the answer sections and the chat slot row** — **OPEN, found 2026-09-04.** Down walks a reply chunk by
  chunk (three `.bonsai-answer-stop` stops on one turn); Up jumps from the feedback buttons straight past them to the bubble and
  the turn header. With the archive expanded, Up from the first archived header ran 18 presses to the tab bar and Decky's back
  button without the chat slot row ever taking the ring, though two Downs reach it normally. Same family as **ONBUTTONDOWN-AUDIT-01**.
  **Half of this moved on 2026-09-05:** Up from the feedback buttons now lands on the reply's last section rather than skipping
  to the bubble (measured, CHAT-REPLY-ENTRY-01). What is still open is the archived-header half — Up from the first archived
  header runs to the tab bar without the chat slot row ever taking the ring.
- ★★★ `[reply]` **An answer can end with a block of raw computer text where a power tip should be** — **REOPENED
  2026-09-07 on the Deck (W2-R6). The fix does not cover the case the bug was reported from.** In Speed mode with
  Deep Rock Galactic: Survivor running and the character voice on, a reply ended with the literal line
  `{"tdp_watts": 5, "gpu_clock_mhz": 1200}` sitting in the words a person reads. The plugin reads that line to work
  out a power suggestion and never took it out of the text on screen. A cleanup step was added on 2026-09-07 that
  removes the line but deliberately leaves alone anything inside a code box, so that a code example someone actually
  asked for survives. **The cause of the miss: the plugin's own instruction tells the model to put the power block
  inside a code box.** So the one block the plugin asks for is the exact case the cleanup can never remove. Measured
  on the device twice in a row, both replies ending in a code box holding nothing but the power line —
  `{"tdp_watts": 7, "gpu_clock_mhz": null}` and `{"tdp_watts": 13, "gpu_clock_mhz": null}`, read out of the page
  rather than inferred. The seven tests that shipped with the fix all pass; every one of them tests the shape the
  plugin does not ask for. **Two ways out:** stop asking for a code box and ask for a plain line, or teach the
  cleanup to remove a code box whose entire contents are the power block and nothing else — the second is safer,
  because a real code example is never exactly that one thing. Evidence `docs/test-evidence/plan47-R6-stray-computer-text.json`.
  (D85)
- ★★ `[reply]` **Token streaming reveals text in bursts while a game is running** — **ACCEPTED 2026-09-04 (D58 #4).** Measured 2026-08-28 with
  a game running: tokens arrive in bursts, and during a burst the overlay drops to 47 fps; between bursts it is a flat 60. Delivery
  is bursty, painting is not slow. The game's own frame rate is unmeasured. Accepted as a nice-to-have; reopen only if the game's own frame rate is measured
  and suffers. Making streaming the default stays a separate feature call. Row **STREAM-11**. [Detail](roadmap-details.md#token-streaming-reveals-text-in-chunks-while-a-game-is-running).
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** — **OPEN,
  seen again on the Deck 2026-09-07 with a game running.** Touch the panel and the opened tab bar fades away, but a see-through
  copy of it stays on top of the suggestion chips: pale round tab icons and the plugin's name show through the chip text, with a
  faint row of dots under them. It does not go away on its own and it makes the chip labels hard to read. Reported before and
  still there. Evidence: Deck capture `DeckCapture_20260907_234345_game.png`.
- ★★ `[ui]` **The copy button sits on top of the code box instead of beside it** — **OPEN, measured on the Deck
  2026-09-12.** The icon overlaps the code box's bottom-right corner by 16 pixels across and 9 down, so about two
  fifths of it sits on the box. **The cause:** the icon is meant to sit in the answer bubble's corner, and that
  reads fine when the answer ends in ordinary text, because the bubble behind it is one flat surface. A code box
  has its own background, so the icon lands on that box's painted corner instead. Room is already reserved for the
  icon at the end of the last line, but that does not move the box's edge. Evidence
  `docs/test-evidence/plan48-deck-evening-2026-09-12.json` **[no evidence — re-run, batch QA-EVIDENCE-GAP-01]**, `screenshots/DeckCapture_20260912_183855_game.png`.
- ★★★ `[focus]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** —
  **OPEN, found 2026-09-05.** After leaving the panel with B and opening it again from the Decky list, Down walked as far as the
  answer and then stopped dead: ten presses, no movement, Left and Right dead too, only Up escaping. The answer's own buttons, the
  preset chips, the question box and the **Ask button** were all on screen below and none could be reached. It happened on a chat
  with history and again on a brand new empty chat, where the ring stuck in the question box instead. Same in Speed and in
  Strategy, with the mode written while the panel was closed, so the mode is not the cause.
  **What clears it: restarting the Decky loader, not reopening the panel.** After a loader restart the identical walk on the
  identical chat went all the way down — through the answer, its highlighted words, the settings block, Show details, the session
  strip, a chip, the question box — and reached the Ask button on the next press. So this is a **stale navigation state that a
  panel reopen does not clear**, not a permanently trapping control. At the moment of the trap Steam's ring and the page's own
  focus were on different elements every time (the answer bubble versus a highlighted word; the question box versus the Ask
  button), which is the signature to chase. How a person gets into the state is not yet pinned down — it followed a game launch
  and several panel reopens. Evidence, in order: `docs/test-evidence/round34-BUG-down-cannot-reach-ask-bar.json` (trapped, 10 presses),
  `docs/test-evidence/round34-BUG-down-walk-strategy-mode-control.json` (trapped, other mode), `docs/test-evidence/round34-BUG-empty-chat-input-trap.json`
  (trapped, empty chat), `docs/test-evidence/round34-BUG-down-walk-after-loader-restart.json` and
  `docs/test-evidence/round34-BUG-input-to-ask-final-check.json` (clean after the restart).
  **2026-09-05, three deliberate attempts, not reproduced:** leaving with B and reopening from the Decky list; a button-then-cancel
  around the question box; and switching through all six tabs and back six times before walking the panel top to bottom. Every walk
  reached the Ask button. **A mechanism was found by reading instead.** The table that hands the highlight between the panel's parts
  lives outside the panel and is keyed by fixed names, not by which copy of the panel is on screen; it is only emptied when the
  plugin's code loads fresh. A stale entry therefore survives a panel reopen, and the handler that asks it to move the highlight
  gets back something that still looks alive, reports the press as handled, and moves nothing. That matches every symptom on record,
  including why only a loader restart clears it. Evidence `docs/test-evidence/round35-trap-*.json`,
  [plan 35](planning/35-bugfix-session.md) § 7.
  **A fix for that mechanism landed 2026-09-05** — a departing part of the panel can no longer unregister the one on
  screen — but **the entry stays here, not in Verify**, because the fault never reproduced on demand, so nothing proved
  the fix against it. It closes only when the panel is driven hard over time and the state does not come back. The
  unrevealed-spoiler entry above is most likely the same fault and closes with it.

---


## Features

**Standing goal from the maintainer (2026-08-30):** buy back as much vertical room for the chat bubbles as possible; every
`[layout]` entry serves it. Items rated ★★★★★ or above carry a placeholder link to [bonsAI Issues](https://github.com/qd313/bonsAI/issues) in the archive;
replace it with a specific issue when one exists.

- ★ `[ask]` **Run the answer checker quietly and count what it catches** — **OPEN, filed 2026-09-13 (D102).** The plugin
  already has a piece of back-end code meant to spot a reply that looks made up. It works, it has a test, and it has never
  once run — the field it fills is fed by a value nobody supplies. Before deciding whether to finish it or delete it, switch
  its three rules on so they *only write to the log*: no note on screen, no second AI model, nothing a person would notice.
  Leave it through normal use for a couple of weeks, then count. Baseline to beat, measured across all 412 saved device runs:
  the "named a store number for a game that was never attached" rule would have fired **0 times**, the "claimed certainty"
  rule needs one exact phrase that appears **nowhere** in anything this project has recorded, and the third rule — the AI was
  asked for a power-tuning suggestion and did not give one — is **already spotted and logged today**, so all it would add is
  telling the person. Not in scope: appending the on-screen notice, and the second-model pass (an extra model call per answer
  on a handheld). [Detail](audit/refactor-round-two/phase2-decisions.md).
- ★ `[ask]` **Intent packs later review** — **OPEN.** Decide whether the quiet intent-pack search aliases are deleted, left quiet, or
  revived under Developer. Not in scope: re-shipping Proton journal inject without a redesign. **New evidence 2026-09-06 (D79):**
  the bundled Deck basics list ships switched on and is the *only* reason a whole sentence ever matches a setting — its 88 words
  match when your sentence contains one of them, so *can you help me with performance* returns three results. The maintainer folded
  that finding into this entry. [Detail](planning/45-settings-shortcut-card.md#5-two-things-about-the-search-that-are-not-obvious).
- ★ `[focus]` **The models hub's own buttons should pass the D-pad to each other at their edges** — **OPEN, filed
  2026-09-13.** Inside the AI models hub, pressing up at the top of the tier choices, or down at the bottom of the advanced
  switches, does nothing. It should hop to the neighbouring group instead. Found as unfinished work in an old copy of the
  project during the clean-up; the copy is being cleared, and the idea is small enough to rebuild fresh rather than rescue.

- ★★ `[chat]` **A quiet cue that a cut question can be opened** — **OPEN, filed 2026-09-05 by the maintainer.** When the ring lands on
  a question bubble that has been cut short, nothing on screen says the rest is there. Chosen 2026-09-05 from four drawn options: the
  text fades out at the right-hand edge instead of ending in three dots, only while the ring is on it, nothing for a finger. Nothing
  is added and nothing shifts. The same fade already sits in the stylesheet with no user, written for cut-off answer bubbles.
  One check owed first: the question bubble turns its own outline off and gets no ring rule, so look on the Deck at what focus shows.
- ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.** The create position is the
  literal `[+]`, re-confirmed on board 8f and again in the v3 rows. Reopen that decision before building it.
- ★★ `[chips]` **Make the preset chips look more like chips** — **OPEN, asked for by the maintainer 2026-09-13.** Four
  small changes, and all of them subtle — nothing that reads as a redesign: about half a pixel of space between the chip and
  the text box beside it, so the two stop touching; the chip's surface shaded more like a raised button; the accent colour
  toned down, because today it is too loud; and the label in italics, worth trying. The point is that a chip should read as a
  pressable thing rather than part of the input. Drawn in a separate Claude Design session; the maintainer judges it by eye.
- ★★ `[ollama]` **Expert offers the stronger Deck-run models first, and the licence list learns the Sept 2026 models** —
  **OPEN, planned 2026-09-05, calls locked (D73).** In the model picker's Expert group, the models that beat today's Gemma 4 on the
  answer test come first, in bake-off order. The plugin's licence list is behind: Gemma 4 has been Apache 2.0 since April and is
  still filed as open-weight; Granite and Liquid are unknown to it, so the default open-source-only tier would not route to them.
  One change to the list, the picker's catalogue and the Expert group. [Bake-off](planning/41-deck-model-survey.md).
- ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed 2026-09-08.** The model is
  asked to start every answer with one short sentence that carries the point and gives nothing away. The reply-ready popup, a
  spoken answer and any headset card then always have a good first line to show, instead of whatever the answer happens to begin
  with. Sits beside Terse mode without replacing it. No headset or PC test needed. **The maintainer called this the weakest of
  the nine Frame features on 2026-09-11 and asked for a count before a build:** how many of ten first sentences already stand
  alone on their own, and how many give something away. Build the change only if that count comes back poor. **The maintainer
  locked count-first on 2026-09-12 (D97 call 4), and the count started the same day.** **The count ran 2026-09-12: 2 of 10
  answers already opened with a sentence that stands alone, and 0 of 10 gave anything away. That is a poor score, so by the
  locked rule this gets built.** Stars stay at two. Before writing a new prompt, one more thing to count: an answer-first
  opening was already tried on purpose the same evening as the count's source answers, and that run may already be the
  change, so it gets counted the same way first. This entry is no longer "count first"; it is "build, after counting that
  earlier answer-first run". **Not yet (D99, 2026-09-12).** The maintainer read the count and said not yet. It waits for
  its own go; when that comes, the first step is still to count the 2026-09-07 answer-first run the same way.
  [Plan](planning/49-steam-frame-features.md) · [Second look
  § 2](planning/52-frame-features-second-look.md#2-headline-first-the-weakest-one-and-what-to-do-instead) ·
  [Bench findings § 4](planning/53-steamvr-bench-findings.md#4-the-headline-first-count-run-the-same-morning) ·
  [The count, sentence by sentence](planning/assets/53-headline-count-2026-09-12.md).
- ★★ `[reply]` **The answer's first lines in the reply-ready toast** — **OPEN, planned 2026-09-05, calls locked (D63).** When an
  answer finishes while the menu is closed, the toast says only *Reply ready*. It would read *bonsAI* over the first lines of
  the answer, in every mode, for eight seconds, so a short answer is read without leaving the game; tap still opens the panel.
  Hidden blocks are skipped; if nothing safe is left the toast stays as it is. **Measure first, on two screens with screenshots:**
  the Deck's own screen and a 24-inch 1080p monitor; the popup is expected to be small. [Plan and mockup](planning/38-toast-answer-lines.md).
- ★★ `[reply]` **Which bundled characters copy a real person** — **OPEN, filed 2026-09-08 (D74); the gate for the shelved character
  voices.** All 31 characters in the picker are named characters from games or TV, each voiced by a real actor, and one is a living
  comedian's own persona. A written sweep, one line per character: who owns the character, whose voice it is, and whether a voice for
  it could be made as a type rather than a copy. Text roleplay sits on the first layer today; any voice would sit on all of them. No
  code; a document the legal check reads. [Memo](planning/42-read-aloud-feasibility.md).
> - ★★ `[ui]` `[shelved]` **Glance view: the answer alone, in big text** *— **OPEN, shelved 2026-09-12: too much UI change, and
>   we're not ready for it yet, in the maintainer's own words.** Opening the menu from the popup would have shown only the
>   answer, large, with the chips, the question box and the tab bar out of the way, so a person opens, reads and closes in a
>   couple of seconds; B would return to the full panel. The mockup and the press list are kept in
>   [plan 52 § 6](planning/52-frame-features-second-look.md#6-glance-view-the-brief-and-the-mockup) and the design handoff
>   folder, for when it comes back. [Plan](planning/49-steam-frame-features.md) ·
>   [Drawing](https://claude.ai/code/artifact/c48fb3e2-38ef-4c91-997c-c515353eec96).*
- ★★ `[ui]` **Replace the bonsAI tab icon with the redesign's** — **OPEN, and no longer waiting on a drawing.** Flatter,
  more silhouette, because it renders at 14px. **Checked 2026-09-05: the redesign document never actually draws one**, and the
  maintainer has said they do not want to supply one. So whoever builds it proposes a shape and the maintainer approves it by
  eye — a shape is not something to settle from a description or by reaching for a stronger model. It has to be an inline SVG
  path rather than the PNG so it takes the colour around it. Update the icon geometry test in the same change.
- ★★ `[ui]` `[ask]` **Clear button in the session context strip** — **OPEN, filed 2026-09-12 (D99).** A small Clear
  sits at the right end of the Session context (N turns) bar under the chat, and only shows once that bar does. One
  press opens the same confirm box Settings' Clear cache uses, then the chat, the strip and the stored answer are
  cleared and the next question starts a new session. It must also make the plugin forget the subject of the last
  strategy question, which today survives a clear until the game changes or the plugin restarts — Clear cache gets
  the same fix in the same change. **Open, with a lean:** clear the whole session, not just what the model sees.
  Needs a focus-graph entry and the modal return-focus hookup.
- ★★ `[voice]` **Spoilers by voice** — **OPEN, filed 2026-09-08; Read answers aloud shipped 2026-09-12, still waits on Voice
  follow-ups.** When a spoken answer reaches a hidden spoiler it says "there is a spoiler here, say go on to hear it" and waits;
  "go on" unhides and reads it, anything else skips it. The block on screen unhides with the spoken one, so the two never
  disagree. The Deck alone is enough to test. [Plan](planning/49-steam-frame-features.md).
- ★★ `[voice]` **Voice follow-ups** — **OPEN, filed 2026-09-08; Read answers aloud shipped 2026-09-12.** For a few seconds after a spoken
  answer ends, the mic listens for a handful of words: again, go on, stop, next tip. No wake word needed, since the mic opens only
  in that window and closes on silence. The words a person needs when they cannot reach the Deck or scroll. The Deck alone is
  enough to test. **The maintainer set the exact shape 2026-09-11:** a short rising tone when the mic opens right after a spoken
  answer, the mic keeps listening as long as it hears something, and a short falling tone when it closes. Four words: again, go
  on, stop, next. One setting, off by default. The middle position of the Voice replies setting (D99) is the signal this
  hangs off: an answer to a spoken question is read out, then the mic reopens. [Plan](planning/49-steam-frame-features.md) ·
  [Second look § 3](planning/52-frame-features-second-look.md#3-voice-follow-ups-a-sound-a-short-listen-a-few-words).
- ★★★ `[ask]` `[focus]` **Steam settings shortcuts float above the question box** — **OPEN, planned 2026-09-06, all calls locked
  (D79).** Today the list of matching Steam settings appears under the box and pushes the box, the chips and the whole
  conversation up the screen; two letters can match 71 settings and throw the box off the top. It moves to a card above the box
  that holds the best eight and never moves anything. Up walks into it, Down walks out, B closes it and keeps your words.
  [Plan](planning/45-settings-shortcut-card.md) · [Mockups](https://claude.ai/code/artifact/1ab2a570-2ae5-45cd-b12b-332694f96fd5).
- ★★★ `[chips]` **Decode preset chip animation** — **VERIFY, feel only.** Shipped 2026-08-28. Measured on device: a flat 60 fps with
  all chips decoding. Whether it feels right is a person's call. Row **PRESET-STREAM-ANIM-01**.
- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, next step under the vertical-space goal.** The collapsing
  tab bar freed 61px, but the transcript is still 412px: the room went into Main's overflow and the gap above the dock. What caps
  the transcript is a Main-tab layout question, worked out in [planning/30-collapsing-tab-bar.md](planning/30-collapsing-tab-bar.md) § 8.
- ★★★ `[layout]` **Session context folds into Show details** — **OPEN, workshop before building.** The **Session context (N turns)**
  bar stops being its own row, so a settled answer costs one collapsed control instead of two.
  [Open questions](roadmap-details.md#session-context-folds-into-show-details).
- ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — **OPEN, research spike.** Hold models loaded, or unload when a game takes
  focus on the Deck APU? The spike decides go or no-go; no production unload before it.
- ★★★ `[ollama]` **Per-mode latency timeouts** — **OPEN, weighed and deliberately not built 2026-09-05.** Separate warning and
  give-up values per Ask mode. It was the sixth candidate in round 36 and was dropped on purpose, said in advance rather than
  discovered late: it is the largest of that set — the two existing values already run through sixteen files each and going per mode
  triples them — and the least of them for a person, since it changes when a warning appears rather than what the plugin can do.
- ★★★ `[platform]` **Trim the five documents that are still big** — **OPEN, filed 2026-09-13 during the
  clean-up.** Nothing a person using the plugin would notice; this is about what every piece of work costs before it starts.
  Five files carry a trim task at the top of each, with its own star rating, time and model. Together they are about 815 KB.
  The two that matter most are this file and the testing rows, because the house rules say both are read before anything is
  marked done — trimming just those two saves about 31,000 tokens on every landing. The biggest single win is the locked
  decisions file at 89,000 tokens a read. Do them one at a time; each is its own small job.

- ★★★ `[reply]` **Spy: a character who lies to you on purpose** — **OPEN, filed 2026-09-06 by the maintainer.** A new
  Team Fortress 2 character. Pyro's Heavy setting already gives bad advice because he is a stubborn arse; the Spy gives bad advice
  because he is clever and working for the other side. Sometimes he opens by claiming to be a different character instead. Same hard
  floor as Pyro's: nothing that can damage the Deck, lose a save, or cost money — wasted time only. And you have to be able to find
  out, so the reveal is planned before anything is built. [Detail](roadmap-details.md#spy-a-character-who-lies-to-you-on-purpose).
- ★★★ `[reply]` **Terse mode: Speed answers in three lines** — **OPEN, planned 2026-08-29, nothing built.** A toggle beside the
  reply-style slider, off by default, capping a Speed answer at three lines. It overrides the slider and the character; destructive
  warnings and the depth phrases escape it. The real work is widening the branch picker (D40). **TERSE-01** passes at 8 of 10.
  [Detail](roadmap-details.md#terse-mode-speed-answers-in-three-lines).
- ★★★ `[ui]` **Adjustable text size in Settings** — **OPEN.** `uiScalePx()` already runs through the stylesheet; the work is exposing it,
  deciding what must not scale (icons, the 300px column), and paying the settings plumbing. [Detail](roadmap-details.md#adjustable-text-size-in-settings).
- ★★★ `[ui]` **Search density** — **OPEN.** Tighter, more scannable results with highlighted match tokens.
> - ★★★ `[voice]` `[shelved]` **Voices for the bundled characters** *— **OPEN, shelved 2026-09-08 (D74): possible, but a legal check first.** Each
>   bundled character would get a voice invented once on the maintainer's PC with OmniVoice, shipped as a five to ten second clip and
>   read on the device by a small copying model. Shelved because a voice is not covered by fair use, every character here is voiced by a
>   real actor, and "free" is not a defence under the newer AI-voice laws. Unshelving needs the character sweep, a legal check, and the
>   open licence call. [Memo](planning/42-read-aloud-feasibility.md).*
> - ★★★ `[voice]` `[shelved]` **Trained voices for the bundled characters** *— **OPEN, shelved with the clip route 2026-09-08 (D74).** The fallback
>   if the copying model is too slow beside a game: a small trained voice file per character, about 60 MB, made once on the maintainer's
>   PC from OmniVoice speech and downloaded on demand; the fastest way to read. Same legal gate as the clip route, plus the plugin
>   hosting its own voice files for the first time. [Memo](planning/42-read-aloud-feasibility.md).*
- ★★★ `[voice]` **Full-quality reading from a LAN PC** — **OPEN, deliberately not built 2026-09-08 (D74); reopened only if the
  local port fails its Deck test.** For a person whose Ollama already runs on a PC in the house, that PC could also run OmniVoice as
  a speech server and read every answer in the full character voice, five to forty times faster than real time on its graphics card.
  Not offline, so never the default. Dropped on purpose, said in advance: a speech server is a second program on the person's PC with
  its own heavy install and an address to paste into Settings, the most setup the plugin has ever asked of anyone, and the one-time
  voice step it would speed up is a wait of minutes on a Deck and seconds on anything stronger. The entry stays so the reason is on
  record. [Memo](planning/42-read-aloud-feasibility.md).
- ★★★ `[voice]` **Headset mode** — **OPEN, filed 2026-09-08; waits on Read answers aloud and Wake-word listening.** One switch
  that turns on the wake word, reads every new answer aloud on its own, and asks the model to answer for the ear: two or three
  sentences, no lists. Made for a visor on your face and a Deck across the room. A PC with SteamVR and any headset helps with one
  question only: whether the headset's mic reaches the PC during a streamed game. **No headset is being bought for now (D97 call
  3); this waits for the Frame.** [Plan](planning/49-steam-frame-features.md).
- ★★★ `[ollama]` **How fast is this model on this Deck** — **OPEN, planned 2026-09-06, calls open (D75).** Next to each installed
  model, how fast it answered on this Deck the last time it was used, and a button to time it now with one fixed question. The
  numbers already exist on every answer; the plugin keeps a last-ten record per model with the game that was running, shows a
  badge in the picker and a plain line under Show details, and never reorders anything. The bake-off's Deck half becomes one
  press per model. [Plan](planning/43-model-speed-readout.md).
- ★★★★ `[ask]` **Connection doctor** — **OPEN, planned 2026-09-05, calls locked (D64).** When an Ask fails, a **Fix this** button
  under the failed reply runs the checks the plugin already has, shows the one that failed, and offers the one thing to do
  next with a button that lands you on that control on the Ollama tab. It only offers; nothing changes without a press.
  **Save a report** inside it, and a typed command, write a read-only report of the setup to the Desktop: the former
  **Deck health snapshot**, folded in here. [Plan](planning/39-connection-doctor.md).
- ★★★★ `[ask]` **Session context and user stash** — **OPEN.** Live session facts plus user-editable notes for Ask. No embeddings, no cloud.
- ★★★★ `[ollama]` **LAN custom model pull** — **OPEN.** Blocked until a mechanism is chosen (R1 to R4). Depends on **Custom model in
  the Pull Models picker**.
- ★★★★ `[perms]` **Web permission** — **OPEN, discovery locked.** Opt-in live web answers; offline Ask and local KB when off. Kids
  lock forces it off. [Discovery](planning/web-permission-discovery.md).
- ★★★★ `[platform]` **Llama.cpp provider spike** — **OPEN, research only.** Go or no-go against Deck-local Ollama. Prior:
  [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md).
- ★★★★ `[platform]` **Steam Input layout parse** — **OPEN.** Parse controller VDF configs for control context. Not in scope: writing
  configs.
- ★★★★ `[reply]` **A note pinned in space** — **OPEN, filed 2026-09-08; needs the SteamVR panel first.** In a headset, park the
  answer on a wall or table beside you. It stays there while you play, so a checklist becomes a sticky note you glance at between
  fights. Worth testing on a PC with SteamVR now: the built-in pretend headset can show a panel fixed in the room, and a real
  headset judges whether it reads. **No headset is being bought for now (D97 call 3); this waits for the Frame.**
  [Plan](planning/49-steam-frame-features.md).
- ★★★★ `[reply]` **A wrist panel** — **OPEN, filed 2026-09-08; needs the SteamVR panel first.** In a headset, a small panel rides
  on one controller. Turn your wrist, read the answer, drop your hand and it is gone. No pointer needed. Worth testing on a PC
  with SteamVR now, but only with a real headset and tracked controllers; the pretend headset has no hands. **No headset is
  being bought for now (D97 call 3); this waits for the Frame.** [Plan](planning/49-steam-frame-features.md).
- ★★★★ `[ui]` **SteamOS Share path** — **OPEN.** Faster path from Share and capture flows into screenshot attach where APIs allow.
- ★★★★ `[ui]` **SteamOS spin hint card** — **OPEN.** Detect immutable spins and deep-link to troubleshooting.
> - ★★★★ `[voice]` `[shelved]` **A voice for a custom character** *— **OPEN, shelved with the bundled voices 2026-09-08 (D74).** Type a name, press
>   **Generate voice**, wait minutes once while the device invents a voice; from then on the small copying model reads that character in
>   it. Needs OmniVoice on the device as an optional download of about one gigabyte, with the warning "minutes on a Steam Deck, seconds
>   on a stronger machine"; no LAN server. Phase 0 is a half-day Deck test of the port. Waits on the same legal gate as the bundled
>   voices. [Memo](planning/42-read-aloud-feasibility.md).*
- ★★★★★ `[ollama]` **On-Deck model benchmark** — **OPEN, descoped on 2026-09-06, one call open (D75).** Rank installed models by measured
  speed and completion; offer as try order with confirmation. Its own gate said: if timings do not hold still, descope to a
  one-shot readout. That readout is now its own three-star entry, [plan 43](planning/43-model-speed-readout.md), and its record
  of timings answers the gate over time. Whether this line retires is D75. **First input, 2026-09-05:** the desk survey of this
  quarter's models in [41-deck-model-survey.md](planning/41-deck-model-survey.md); the calls are D72.
- ★★★★★ `[perms]` **VAC Phase 2: opponent IDs** — **OPEN, research.** Surface live opponent identities for ban checks when metadata allows.
- ★★★★★ `[platform]` **Controller macro test rig and live view** — **OPEN, discovery locked 2026-08-23, board ordered.** A bridge board
  the Deck sees as a real controller, a macro runner gated on real UI state, and one recording pipeline. Primitives land upstream in
  decky-plugin-studio. Next: spikes S1 to S3. [Plan](planning/19-controller-macro-test-rig.md), [program](planning/21-ai-owned-testing-program.md).
- ★★★★★ `[platform]` **Refactor round two (plan 51)** — **OPEN, planned 2026-09-11, calls locked (D89 to D96).** A
  seven-phase clean-up touching the code, the tests, the build scripts, the docs and how agent sessions work here,
  with nothing about how the plugin behaves changing for a person using it. Work starts only when the maintainer
  says the exact words "start refactor implementation now." [Plan](planning/51-refactor-round-two.md).
- ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN.** AI copy tuned to gen-2 hardware.
- ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; the first step is a ★★ test to find out.**
  bonsAI's panel floating over any VR game, drawn by a small program on the PC that runs SteamVR, so it serves every SteamVR
  headset and the Frame comes along. Not a Decky plugin. The in-game answer surface that is blocked on the Deck is open here. The
  test runs today on a PC with SteamVR and no headset at all: does a panel show over a game, how does pointing work, can the
  answer be read at arm's length. **Locked rule (D97):** the panel goes only through SteamVR's own panel door and never touches
  the game itself, in file, in memory or in input — anything else risks an anti-cheat ban for someone playing online with bonsAI
  open. Best effort: each game's anti-cheat sets its own policy, and the README will say so once the panel ships. **Bench result,
  2026-09-12:** a panel showing a sample bonsAI answer appeared inside the headset view over a running SteamVR scene, with no
  plugin code at all — drawn entirely through SteamVR's own panel door. The in-headset menu is confirmed to be a web page, the
  same way the Deck's menu is. Pointing at the panel could not be tested: the pretend headset used for the bench has no
  controllers, so a real headset is needed for that part. SteamVR did accept the call to post a small notification card, but
  whether the card actually drew on screen was not seen and needs another pass. [Plan](planning/49-steam-frame-features.md) ·
  [PC setup](planning/50-steamvr-pc-setup.md) ·
  [The anti-cheat rule in full](planning/52-frame-features-second-look.md#4-the-floating-panel-and-anti-cheat) ·
  [Bench findings](planning/53-steamvr-bench-findings.md) ·
  [The picture](planning/assets/53-panel-in-headset-2026-09-12.jpg).
- ★★★★★ `[reply]` **Reasoning display** — **OPEN, planned 2026-09-05, calls locked (D70, D71).** The plugin asks a
  thinking model to think and throws the thinking away; the line under your question shows a stock phrase for the whole wait.
  Planned: three lines at the answer's size show the model's own newest sentences, fold to one line with the seconds when the
  answer starts, open to the full text; Show details gets a thinking chip; and the thinking is also spent deciding what counts
  as a spoiler for you. The Deck's default model can think. A test runs on the PC first, then the Deck. [Plan](planning/40-reasoning-display.md).
- ★★★★★ `[voice]` **Wake-word listening** — **OPEN, beta.** Opt-in always-on local wake **bonsAI**, then STT, then a quiet Ask.
  [Feasibility](planning/10-wake-word-listening-feasibility.md).
- ★★★★★★ `[platform]` **Deep mod AI hints** — **OPEN.** Detect mod frameworks and files; mod-aware guidance.
  [Feasibility](planning/12-deep-mod-ai-hints-feasibility.md).
- ★★★★★★ `[platform]` **Native QAM shortcut tile** — **OPEN, upstream research.** A separate left-rail entry beneath the Decky icon.
  [Feasibility](planning/11-native-qam-tile-feasibility.md).
- ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp** — **OPEN, filed
  2026-09-08.** The floating panel needs bonsAI to run outside Decky, which is what the Native QAM shortcut tile research keeps
  circling, and any model on the Frame itself runs through llama.cpp, not Ollama. Three entries, one question: does bonsAI grow a
  second way to run. Decide it once. The panel half benefits from a PC with SteamVR now; the llama.cpp half is a Deck question.
  **The gap underneath this: there is no network door into bonsAI's Python side today** — nothing on another machine can reach
  it — so a panel on the PC would have a screen and no brain until this is decided. Three options and a recommendation to find
  out how far the "run the same Python side on the PC too" option really is from true, before choosing, are in plan 52 § 5.
  **Locked 2026-09-12 (D97 call 2): the PC bench checks how far that option is from true before the decision is made; llama.cpp
  stays closed.** **The check passed 2026-09-12:** the plugin's Python side was started outside Decky on the maintainer's
  Windows PC, using a fifty-line stand-in for Decky. Nine calls the frontend normally makes all came back with a working
  answer, and it reached Ollama on that PC. The "run the same Python side on the PC too" choice is now a priced decision
  instead of a guess. **This does not decide it — that call is still the maintainer's to make.**
  **Not yet (D99, 2026-09-12).** The price is now known: what is missing is a small starter program, a way for a panel
  to reach it on the same machine, and PC-shaped answers for which game is running, the speaker, and the screenshot
  folder. Nothing is built until the maintainer says.
  [Plan](planning/49-steam-frame-features.md) ·
  [Second look § 5](planning/52-frame-features-second-look.md#5-the-second-way-to-run-the-gap-plan-49-underplayed) ·
  [Bench findings § 3](planning/53-steamvr-bench-findings.md#3-the-plugins-python-side-on-this-pc-it-runs).
- ★★★★★★ `[platform]` **Remote Play diagnostics layer** — **OPEN.** Streamed-gameplay answers weight encode latency and host-vs-client
  fixes. Noted in [09-steam-frame-companion-feasibility.md](archive/09-steam-frame-companion-feasibility.md) § B8.
- ★★★★★★ `[reply]` **In-game answer surface** — **OPEN, split 2026-09-05.** Read an answer without leaving the game. The full
  overlay is upstream-gated and stays here as research. The unblocked slice, the toast carrying the answer's first lines, is its
  own ★★ entry above, planned in [38](planning/38-toast-answer-lines.md). Reframed 2026-09-08: the same surface is open in a
  headset through SteamVR on the PC; see **The floating panel inside SteamVR** and [49](planning/49-steam-frame-features.md).

---


<a id="done-for-v050"></a>

## Verify

Fixed, unit-tested and shipped, but not yet confirmed on the Deck. Owed QA row named in each entry; full evidence in
[testing.md](testing.md) / [testing-manual.md](testing-manual.md). Once a Deck run confirms one, move it in the same commit: a line into
[Done](#done-for-v050), the full entry into the matching archive file, drop it from here.

### Checks whose evidence never existed
- ★★ `[QA]` **Twelve checks read as proven with nothing behind them** — **VERIFY, found 2026-09-13 during the
  clean-up.** Twelve checks name a saved Deck recording as their proof. None of those recordings exists, and the project's whole
  history shows none ever did — they were never written, not lost. So twelve results were written down as passing on the
  strength of a file nobody can open, and whether they really passed is unknown. Nothing here says the plugin is broken; it says
  we do not know. Re-run all twelve together in the next automated testing session. Batch **QA-EVIDENCE-GAP-01**, listed with
  each row in [testing.md](testing.md). Until a run produces real evidence, treat all twelve as unknown rather than as a pass.

### Bugs that need verification
- ★ `[platform]` **Clear all plugin data left three things behind** — **VERIFY.** Found 2026-09-05 when the maintainer
  asked for the wipe to be best-effort. Three flags remembering that the plugin had already warned about a knowledge base problem
  are spelled with an underscore where everything else uses a colon, and the wipe only looked for the colon. After wiping
  everything the plugin still believed it had warned you, so it stayed quiet when it should have spoken up. Fixed to match the
  bare word, which catches both spellings and clears the old ones off devices that already carry them. The New labels in the pull
  picker go with it. Three tests. Row **CLEAR-ALL-PREFIX-01**; **not run on the device**, because doing so destroys the
  maintainer's chats and settings and that was not asked for.

- ★★ `[focus]` **A checklist the model got wrong was left in the reply as raw JSON**, its own D-pad stop that did nothing — **VERIFY.**
  Fixed 2026-08-28: a rejected checklist block is dropped, as a rejected branch block already was. Owed: one sighting on device of a
  reply where it happens. Row **STRAT-CHECKLIST-JSON-01**.
- ★★★ `[chat]` **Clear cache cleared the screen but not the session** — **VERIFY.** Fixed and confirmed 2026-08-27, and again on the
  Deck 2026-09-03. The orphan half is measured: the chat stays behind after a clear, so each clear-and-reask cycle leaves one more
  chat in the rotation — a follow-up, not a regression. Only the mid-generation half is still owed: clearing while a reply is still
  being written (unit-tested, not reproducible by hand yet). Row **CLEAR-CACHE-01**. [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).

### Features that need verification

- ★★★ `[layout]` **Copy sits in the answer's corner, not in a button row** — **VERIFIED on the Deck 2026-09-06.** The row of
  buttons under a reply is gone. **Copy** is a small faded icon tucked to the answer's bottom right — press Right from the last
  part of the answer to reach it, Left to come back. **Retry** is a faded circular arrow on the newest question's bubble, on its
  left — press Left from the question, Right to come back. **What the runs show:** walking the whole reply down and back up
  again visits every control once, in order, with no loop and nothing hidden, and pressing Copy put all 1,834 characters of the
  answer on the clipboard. Pressing the question still opens and closes it and does not start a Retry. An older question shows
  no arrow. Two problems were found and fixed on the device before this closed — see the notes on the entry below and the
  planning file. Runs: `reply-block-final-walk`, `copy-right-from-answer`, `press-question-not-retry`,
  `question-bubble-two-stops`. Rows **COPY-REPLY-01**, **COPY-REPLY-02**, **RETRY-CORNER-01**, **CHAT-REPLY-ENTRY-01**.

- ★★ `[layout]` **Show details becomes a divider, not a chip** — **VERIFIED on the Deck 2026-09-06.** Under a finished answer
  there is a thin line across the reply with **Show details ↓** in the middle. **What the runs show:** the line is 267 pixels
  wide starting at the same left edge as the answer bubble above it, so the two share both edges exactly. One press opens the
  chips and turns the label into **Hide details ↑**; one more press closes it — the double-toggle worry did not happen. The
  ring reaches it walking down and walking up, and it is fully on screen, not behind the input bar. Nothing overflows sideways.
  Run: `reply-block-final-walk`. Row **SHOW-DETAILS-01**.

- ★★ `[focus]` **Fewer D-pad stops on a finished reply** — **VERIFIED on the Deck 2026-09-06.** **What a person notices:** an
  answer of about 1,800 characters used to be one stop per paragraph — six of them. It is three now, and each press either moves
  the ring to a part of the answer already on screen or scrolls the panel; nothing is skipped. A short answer of 400 characters
  is a single stop. Code blocks still stand alone. Runs: `reply-block-final-walk`. Rows **D-PAD-SCROLL-02**, **STREAM-09**.

- ★★ `[chips]` **A glow when the chip row runs out of chips** — **VERIFY.** Built at the desk 2026-09-05 under D62 #3: press Left or Right past the first or last suggestion chip and that chip glows briefly, the way a phone lights up the end of a list. Nothing about the row’s existing edge behaviour changes. Reduced motion keeps the cue and drops the movement. **No measurement closes this one** — whether it reads as *end of list* rather than *error* is the maintainer’s call from a recording, and it is on their checklist.

- ★ `[ollama]` **Pulled models join the model try order** — **MOSTLY VERIFIED on the Deck 2026-09-06, one case left.**
  A model pulled from the picker landed at the **bottom** of the text list, and showed up in the vision list because it can
  read pictures — while a text-only model and the embedding one stayed out of that list. What is still owed is the opposite
  placement: with *Allow high-VRAM model fallbacks* on, a **large** pulled model is supposed to go to the **top** instead.
  That needs a large model on the device and the switch turned on. Row **ROUTING-MERGE-01**.

- ★ `[layout]` **Rows span the QAM panel width** — **VERIFY.** Fixed 2026-08-16 and measured by probe (268 to 300 px); the visual walk
  was never run. Confirm the Main rows look flush and nothing overflows the column. Row **ASK-WIDTH-01**.
- ★ `[platform]` **Shell state and tab payload extraction (refactor step 8)** — **VERIFY.** Smoke: six tabs, one Ask, Ollama tab
  after Clear all plugin data. Row **SHELL-PAYLOAD-01**.
- ★ `[platform]` **VAC check (`bonsai:vac-check`) on-device QA** — **VERIFY.** Implementation complete; run **VAC-02…06** after Tier 0
  **SMOKE-F** passes.
- ★ `[voice]` **Three voice fixes from early August** — **VERIFY.** A finished install survives *Clear all plugin data*
  (**VOICE-CLEAR-01**, backend half verified), the install button reads right when the engine is already ready
  (**VOICE-REINSTALL-01**, done 2026-09-05), and the `status()` fix — a live start/stop recording — **done on the Deck
  2026-09-06**: the button went *Voice input* → *Stop voice input* → *Voice input* with no error. It recorded silence, so
  nothing was transcribed; whether speech comes back as the right words is still owed and needs a person to talk to it.
  Only the *Clear all plugin data* half (**VOICE-CLEAR-01**) is left, and that waits for the final phase.
- ★★ `[chat]` **The game a chat belongs to, above its title** — **VERIFY.** Shipped 2026-08-30 in quiet text above the slot title;
  only chats created after that date carry the name. Row **CHAT-SLOTS-V3-14c**. It costs a line of height, which cuts against the
  vertical-space goal; decide whether it shows always or only when the row has focus.
- ★★ `[QA]` **Deferred manual QA** — **VERIFY.** Tier 0 smokes (SMOKE-A, C, F) then Tier 1 (SMOKE-E, H), and a broader prompt-testing
  pass. SMOKE-B was retired 2026-09-03 (D57 #6). Round in progress: [plan 31](planning/31-deck-verification-round.md).
- ★★ `[reply]` **Thinking line fixes from 2026-08-07/08** — **VERIFY.** Emoji upright, lazy status tag survives, no bare-emoji phase
  changes, one writer. Rows **THINKING-EMOJI-01**, **THINKING-SANITIZE-01**, **THINKING-EMOJI-CLUSTER-01**, **THINKING-COPY-01**,
  **THINKING-SLOW-01**, **THINKING-LIVE-01**, **THINKING-SPOILER-01**. [Log](planning/06-thinking-blurbs-review.md#10-implementation-log).
- ★★ `[reply]` **Token streaming Phase A/B** — **VERIFY.** Start stutter fixed, sections as D-pad stops, scroll follow. Rows
  **STREAM-REVEAL-01**, **STREAM-09**, **STREAM-FOLLOW-01**. [Review](planning/05-token-streaming-review.md).
- ★★★ `[ollama]` **Custom model in the Pull Models picker** — **VERIFY, one check owed and it needs your permission.**
  Shipped and walked on the Deck 2026-09-05. A typed library name that is not in the built-in list pulls and installs; a made-up
  one explains itself; the star pins a model for Ask and reaches the settings file; a freshly pulled model is the only one badged
  **New**. **Three bugs were found on the device and fixed:** every installed model wrongly labelled New, a typing field 50 pixels
  wide, and the embedding model offered as one Ask could use. Owed: whether *Clear all plugin data* takes the New labels with it
  (**PULL-NEW-BADGE-01**) — not run, because wiping data was not authorised. Rows **PULL-CUSTOM-01**, **02**, **PULL-PIN-01** pass.
- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09. Rows **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01**
  (and **KIDS-LOCK-02** with a child account). Live CEF Stage 0 confirmation still owed.
- ★★★ `[reply]` **Soft reply-length cap and thinking budget** — **VERIFY.** Shipped 2026-08-10. Sub-check 02 verified; 01, 03 and 04
  automated with a Deck confirm owed; 05 needs a real thinking model. [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).
- ★★★★ `[ollama]` **Speed-mode VRAM preload** — **VERIFY, the mechanism proved on the Deck 2026-09-05, the timing not.**
  A Developer switch, off by default, loads the model Ask will use into memory at start-up. **A bug was found and fixed on the
  device:** it warmed the first small model installed rather than the one Ask reaches for, which on this Deck were different, so it
  spent memory on a model no question would touch. It now uses Ask's own resolver, and warms nothing when Ask's model is over the
  three-billion cap — which is what happens on this Deck, confirmed. **Still owed:** the timing comparison (**PRELOAD-01**), which
  needs a Deck whose Ask model is under the cap, and the memory-pressure case (**PRELOAD-02**). Open and untouched: whether the
  model survives the Deck sleeping.
- ★★★★ `[chips]` **Preset row: two chips across, with scrolling labels** — **VERIFY.** Rebuilt 2026-09-01 under D43. Two 30px chips
  side by side, a long label scrolls through Steam's `Marquee`, the help chip owns the row until dismissed. The dock went 245 to
  161px. Rows 02 and 03 passed on device; owed **04** only (scroll feel by eye, decode churn, reduced motion); 01b passed 2026-09-03.
  Closes the label-overflow bug. [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
- ★★★★ `[tabs]` **The tab bar collapses when not in use, and names the tab** — **VERIFY.** Shipped 2026-09-02 (plan 30 W0 to W6): a
  20px bar with the active tab's name at rest, opening to a strip that labels all six. Steam's header 81px to 20px. Rows 01 to 06,
  09 and 10 pass; owed **TAB-BAR-07** (legibility by eye) and **08** (touch). Closes the "tab names never appear" bug and D44.
  [Plan](planning/30-collapsing-tab-bar.md).
- ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30; the layout inverts to slot row, transcript, presets,
  Ask bar. Most rows pass on device. Owed: **CHAT-SLOTS-V2-01, 03, 04**, **V3-05a/b**, **06a/b/c**, **07**, **15d**.
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
- ★★★★★ `[platform]` **Global quick-launch macro** — **VERIFY.** Guide-chord docs in [troubleshooting.md](troubleshooting.md) § 5; the
  checklist was never run on hardware.

---

## Knowledge base and RAG

Everything about the game notes and the search that feeds them, in one place, so you can open this file and pick up
where you left off. **Read first:** [the status report](planning/37-rag-status-report.md) — the zoomed-out picture, what
each next step buys a person, and rough costs. It is kept in step with this section. Architecture:
[knowledge-base.md](knowledge-base.md). The agreed answer-quality work: [plan 30](planning/30-kb-answer-quality-plan.md).

Same rules as the lists above: five lines an entry, stars ascending in each list, a fix moves to **Deck check owed** and
then to [Done](#done-for-v050) in the same commit. The one difference is that the knowledge base keeps its bugs, its owed
checks and its plans together here instead of spread over three lists.

**Where things stand (2026-09-07, after wave two).** **293 notes over 25 games, plus 156 Deck tips.** Wave two added
27 notes and 32 tips. **Of the 72 questions a player might plainly ask about the twelve games added this month, 64 now
have a note** — the other eight were written on purpose to have none, so every question that was meant to have an
answer has one.

On the questions nobody tuned against, the search that ships puts the right note in the top three **84 times in a
hundred, up from 80**. Every one of the 21 notes written this evening is found in the top three for its own question,
and 12 come first. Across all 72 questions about the new games, **58 find their note in the top three where 38 did**.
Two rows out of 413 got worse against 24 better.

The Deck's own model: answers clean on all three runs went from **55.7 to 62.3 in a hundred**, and the spoiler line
appeared when it was due **88.9 times in a hundred against 77.8**. It keeps the note's facts about seven times in ten
— **but that score is measured wrong** and is really higher; see the bug about the answer test below.

**Every number above was re-measured on the library that actually ships.** The search test had been reading a copy from
31 August with 161 notes in it, and had been for weeks. That is filed as its own bug and it makes the earlier search
figures in this section, and in wave one's reports, void.

**The answer numbers in the paragraph above are marked here, not deleted, because they turn out not to be
comparable either.** The check behind them had two faults of its own, both fixed in wave three: it could
mark a right answer wrong for using different words than expected, and it could miss a reply that flatly
said the opposite of its own note. Measured again on the same 61 questions with the fixed checks, on the
library that ships: facts kept **76.6%**, never contradicts its note **94.4%**, a note attached whenever
one was due **100%**, branch menu shown when due **98.6%**, clean on all three runs **60.7%**. **Every
answer number this file has ever quoted before this wave, including the 55.7-to-62.3 and 88.9-against-77.8
figures just above, was taken with those two faults still in the check and should not be read as a real
comparison against these new ones.**

**Getting to the troubleshooting tips is where the wave fell short.** The tips themselves are much better — crash went
from 2 to 9, sound 1 to 8, picture 1 to 8, performance 2 to 10, controller 6 to 10, and the top crash tip no longer
tells someone to check a desktop that game mode does not have. But of 24 fresh sentences written by someone who had not
seen the rules, **6 reached the tips before and 8 after**. The rules are still phrase-shaped: they catch the exact
wording someone imagined and miss the neighbour.

**Pick up here, in order.**

*(Rewritten 2026-09-07 after wave two landed — [47](planning/47-kb-wave-two-session.md).)*

**Wave three ran on 2026-09-07** ([48](planning/48-kb-wave-three-session.md)), after wave two's own Deck
evening ran the same evening, once the Deck was free.

1. **Finish the device evening.** Three of wave three's checks never ran on the Deck at all, and two that
   did run need doing again — one showed a reply naming the wrong boss, the other showed a speed check
   that gives a false all-clear. [Plan 48](planning/48-kb-wave-three-session.md) § 8.
2. **Fix the speed check.** It reports a healthy device on a fast reading it takes without ever writing an
   answer, while a real question comes in well over the written budget. That is worse than no check, and
   a fix is in progress.
3. **A call is waiting for you, on follow-ups.** The search half now works on the device — it looks up the
   right thing you were just asking about — but the answer can still be about something else. The options
   for finishing it are being written up.
4. **Work out why the note search has been getting slower since August.** About thirty per cent slower and
   still climbing, with no explanation yet.
5. **Then wave four** — writing more notes.

**Wave two's own evening ran 2026-09-07** (rows **W2-R1** to **W2-R7** in
[plan 47](planning/47-kb-wave-two-session.md) § 8; full results and bug write-ups above and below). **The last owed
row, the stray-computer-text half of W2-R6, ran late the same evening and failed** — the fix does not cover the
case the bug came from, and the cause is written up under Bugs. **W2-R8**, the five August rows, is optional and
was not run. Fallout: New Vegas still is not installed.

**The library point release went out 2026-09-07 as version 2026.09.08**, carrying the corrected Black Mesa water
note and nothing else. 293 notes, 156 tips, 25 games, unchanged. Published to both download hosts with the
maintainer's approval, installed on the Deck from the plugin's own *Update knowledge base* button, and checked by
asking about the flooded rooms: the reply now says the current is constant, says not to try to time it, and points
at the wall switch that cuts the power. The old advice to wait for a gap is gone. Evidence
`docs/test-evidence/plan48-R5-blackmesa-corrected-note.json`.

### Calls waiting on you

**Nothing waiting.** **Decided 2026-09-07 (D88):** the "not in my notes" line keys off how good the match was, not just whether a note
attached — keep the note, add a sentence, take nothing away. Three of the four questions that started this now say
so. **Decided 2026-09-07, same evening:** the library point release ships with the corrected Black Mesa note, and
went out. **Decided 2026-09-07 (D86):** the Black Mesa water note was wrong — the current is
constant, not on a cycle — and it is rewritten from the maintainer's own account of the game, shipping in a
library point release alongside wave three. The rest of the same evening's call: wave two's own Deck evening
runs before wave three starts; there is no plugin release out of this wave, only the library point release;
the answer test's scoring moves to word-lists that notice "not" and other negatives, plus a second model's
opinion added as a read-only extra column; the search test rebuilds its own copy of the library automatically
instead of trusting an old one; a "No tip for this" line appears when nothing fits a problem question; the
held meaning search for problem questions gets one more try and is retired for good if it is still wrong;
the reworked reply order is measured on the PC first, before any change; follow-up questions are remembered
only on Strategy and Expert asks; no new notes are written this wave; and the ring landing behind the corner
icons is left as it is. **Decided 2026-09-07 (D85), planning wave two:** fill the 21 real note gaps and top up the four thinnest
games, keeping the eight deliberate blanks as a control; the "not in my notes" line reads *"Not in my notes — this
answer is from the model's own knowledge."*; the meaning-index work ships the guarantee and only **measures** the
tie-break, because guaranteeing the index answers one of D82's three objections and not the other two; and the ring
bug is fixed by the session running the wave rather than a helper. **Decided 2026-09-06:** the symptom-only search is held and rewriting the tips is the real job (D81);
leaning the search toward meaning is held until every note is guaranteed to have its meaning index built, and two
other objections would still need answering if it is ever taken (D82); the twelve new games ship with their coverage
gap known and accepted (D83); about a second to search on the Deck is fine and the one-second target is retired
(D84). **Decided 2026-09-05:** "starting out" cards get their own kind (D65); answer-first is tested both ways before
a decision (D66, the test entry under Next); structured cards stay prose (D67); the blend-weight sweep runs now and the
weights change if it agrees (D68); a first tranche of new titles comes from your own Steam library (D69, the read waits
for the Deck to be free). **Decided 2026-09-06:** ship the twelve-game release now and treat the thin coverage as later
work (D83); hold the symptom-only troubleshooting search and rewrite the tips instead (D81); hold leaning the search
toward meaning until every note is guaranteed to have its index (D82); about a second to search the notes on the Deck
is fine, the one-second target is retired (D84). Anything new goes here, one line each, with what it decides.

### Bugs

- ★★ `[KB]` **Unrelated questions still get game cards stapled on** — **ACCEPTED 2026-08-27.** With a game running, *"thank
  you very much"* still attaches a card. Raising the keyword floor costs real matches, and the model mostly ignores an
  irrelevant card. [Detail](roadmap-details.md#ordinary-phrases-attach-game-cards).
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back
  2026-09-06.** The fix was built and measured on four plainly-worded questions: one that used to get nothing now
  reaches the right tips, two already worked, but the crash one still fails — it now attaches a tip about desktop mode
  instead of nothing, which is worse for the person reading it. Matching by meaning does not connect the words a person
  uses to describe a crash to the way the crash tips are written; the real fix is rewriting the tips, filed as its own
  entry below. Held rather than shipped (D52, D81).
  **Re-measured 2026-09-07 with the tips rewritten and the routing widened, and it stays held.** The held branch does
  reach further: with nothing running, all 24 of the fresh plainly-worded problem sentences get into the search, against
  8 without it, and *"thank you very much"* still attaches nothing. **But what comes back is wrong.** *"game wont even
  open"* and *"screen goes black when i open it"* both attach a tip about the on-screen keyboard; *"game keeps quiting to
  the home screen"* attaches one about waking from sleep; *"buttons not working right half the time"* attaches one about
  a PlayStation pad over Bluetooth; *"cant find my pc on the network"* attaches one about hotel Wi-Fi. **That is the same
  objection that held it in the first place** — a wrong tip is worse than none.
  **And the cause is now clear, which is the useful part.** The branch's meaning search is written to run *only when
  nothing else finds anything*, and that almost never happens: a plain word search across 156 tips nearly always finds
  something by shared words, so it wins first with a poor match and the meaning search never gets a turn. Every one of
  those five came back by word search, not by meaning. **What is missing is not a wider gate — it is a way to say "none
  of these tips fit."** Until there is one, opening the gate makes things worse.
  [Detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).
  **One more wrong tip, found on the device 2026-09-07 (R4):** on the routing already shipped, *"when I plug it into
  the television the menus show up in the wrong spot on the screen and are hard to read"* comes back with a tip about
  Big Picture Mode versus Desktop Mode, which does not answer it. Evidence `docs/test-evidence/plan47-R4-problems-reach-tips.json`.
- ★★ `[KB]` **The panel keeps naming a game after you have closed it** — **FIXED 2026-09-07, VERIFY on the Deck
  (W2-R6).** After exiting a game the line under the question box still named it, so a question that does not name its
  own game could pick up the wrong game's notes. **The cause written into this entry yesterday was wrong**, which is
  worth keeping: the ordinary keep-in-sync check does correct itself, in about a second and a half. The real hole was
  **reopening the panel** — after a popup, or leaving the plugin and coming back — which restored whatever game name had
  been remembered and never checked whether that game was still running. It now checks what is actually running at that
  moment. Five tests. A plain data change; nothing to do with focus or layout. (D85)
  **Checked on the Deck 2026-09-07 and this fix does not hold** — see the new bug below about the line still naming a
  closed game.
- ★★★ `[KB]` **Searching the notes by meaning costs about a second, every time, on the Deck** — **ACCEPTED
  2026-09-06.** Repeated on the Deck: 1.10, 1.23 and 1.19 seconds across three questions in a row, the same band as
  the first time this was measured. The maintainer looked at the number and said that is fine — about a second before
  an answer that then takes tens of seconds to write out is not something a person would notice. **The one-second
  target this was measured against is retired.** The related finding still stands: the idea that only the first
  question after a quiet spell is slow holds on a PC, where a repeat came back in 0.05 seconds, but not on the Deck,
  where the third question here was no faster than the first. (D84) Evidence `docs/test-evidence/round34-drg-q*.json`,
  `docs/test-evidence/plan46-R2-strategy-half.json`.
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** The weight sweep ran: leaning the search toward meaning gets the right note first about four to six
  points more often, but it also buries a brand-new note whose meaning index has not been built yet, which the current
  weights deliberately protect against. **Not lifted until every note is guaranteed to have its index before it can be
  searched.** Two other objections — a strong exact word match losing to a weaker meaning match, and a locked routing
  rule no longer holding — are not covered by that rule and still need answering if this is ever revisited. Weights
  stay even for now. (D68, D82) [Detail](roadmap-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against).

- ★★ `[KB]` **The follow-up menu keeps offering Half-Life 2 whatever game you asked about** — **OPEN, seen twice,
  widened 2026-09-12.** First on a Black Mesa question, now on a **Portal 2** one: the answer was right and used the
  right note, then the menu underneath asked *"Where are you at in Half-Life 2?"* and offered the train station and
  Ravenholm. Both times it named the same game, so it is not picking a random wrong one. Both chats carried about
  twenty earlier turns, which is the strongest remaining suspect and the reason a fresh-chat run is now owed.
  Evidence `docs/test-evidence/plan48-deck-evening-2026-09-12.json` **[no evidence — re-run, batch QA-EVIDENCE-GAP-01]**, `docs/test-evidence/plan48-R5-blackmesa-corrected-note.json`.
- ★★ `[KB]` **A pinned test batch is not badged** — **OPEN, seen again 2026-09-12.** Chips pinned for testing are
  supposed to carry an amber Test badge, so it is obvious the carousel is showing a fixed set rather than what the
  plugin would have picked. Three chips pinned this evening and no badge appeared anywhere on screen. Everything
  else about them works: they replace the carousel, and pressing A fills the Ask field word for word without
  sending. Evidence `docs/test-evidence/plan48-deck-evening-2026-09-12.json` **[no evidence — re-run, batch QA-EVIDENCE-GAP-01]**, `docs/test-evidence/plan47-frozen-chip-findings.json`.
- ★★★ `[KB]` **The panel only learns which game is running when it starts, and never again** — **OPEN, cause
  found 2026-09-07.** Two failures, one cause. **It keeps naming a game that has closed:** Hades was exited with
  the panel open and the line still named it straight afterwards, 31 seconds later, about four minutes later, and
  after the Quick Access Menu was closed and reopened. **It also never notices a game that starts:** with the panel
  already open, Deep Rock Galactic: Survivor was launched and the line read *no active game detected* for 48
  seconds and through a close and reopen of the Quick Access Menu, while Steam's own list of running apps had the
  game the whole time. Restarting the plugin made the line correct at once, both times and in both directions —
  which is what says the panel reads this once at start-up and never listens for a change. Reopening the menu is
  not enough; only a restart is. Evidence `docs/test-evidence/plan47-R6-bug-fixes.json`,
  `docs/test-evidence/plan47-R6-stray-computer-text.json`.
- ★★★ `[KB]` **The "not in my notes" line never appears** — **CLOSED 2026-09-07 (D88). A second line was added, and
  you chose its wording.** The line was built to tell someone an answer came from
  the model's own memory rather than their notes, but it only shows when the library covers the game and nothing in
  it matched — and the note search always finds something to attach, so the line never shows. Ten questions about
  games the library covers, including "how do i tame a horse" in Black Mesa and a nonsense question in Hades, all
  attached a note anyway. On the device, asking about a boss that does not exist in Hades got a confident answer
  about weapons, and no line. Evidence `docs/test-evidence/plan47-R5-not-in-notes.json`, `docs/test-evidence/plan47-probe-notinnotes.json`.
  **Wave three put a floor under both searches**, which made the line fire more often but could not reach the four
  questions that caused it — catching those by raising the floor would have thrown away twenty or more answers that
  are right today.
  **So a second line was built instead, on your call: keep the note, and say the match was thin.** It appears when
  a note reached the model but no word in the question pointed at it — only the meaning search found it — and even
  then it scored below 0.65. On the whole question set that warns on 11 of 188 right answers, about one in
  seventeen, against 15 catches, and it catches three of the four questions that started this. **Twelve of those
  fifteen are on questions the test set records no right answer for**, which is the whole point and is invisible to
  any count of right and wrong: *"how to save the game"* was being answered with a note about girlfriends,
  *"how to have a baby"* with one about raising a skill. Nothing is taken away from anyone — the note still reaches
  the model, the answer still comes, and a sentence is added. The one miss is *"where do i buy a house"* in
  Portal 2, where the keyword search really did rank a card, so it is not the meaning-only case. Measured by
  `scripts/measure_kb_thin_match.py`, evidence `docs/test-evidence/plan48-thin-match.json`. **The wording is settled**, chosen by you on 2026-09-07: *"No close match in my notes, this answer leans on the model's own knowledge."*
  The comma rather than a dash is deliberate, and is noted in the code so nobody tidies it away.
- ★ `[KB]` **A Hades boss's note is spelled wrong, so spelling it right gets you told the plugin is guessing** —
  **OPEN, found 2026-09-12.** The note is titled *Megara*; the boss is *Megaera*. Type it correctly and the note
  still attaches, but the reply now carries the "no close match in my notes" line — so a person is told the plugin
  is guessing when it is not. One title and a library rebuild. Wave two's own test sentences were written around
  the misspelling. Evidence `docs/test-evidence/plan48-deck-batch-verification.json`.
- ★★ `[KB]` **Neither honesty line can appear when the game is only named in the question** — **OPEN, found
  2026-09-12.** Both lines only run when a game is actually running or picked from the menu. Ask *"black mesa how
  do i tame a horse"* with nothing running and a wrong note attaches with no line at all, because the coverage
  check is never told about a game the question named. The one case where a person is most likely leaning on the
  model's memory is the one where they are never told. Evidence `docs/test-evidence/plan48-deck-batch-verification.json`.
- ★★ `[KB]` **The "No tip for this" line has no question that can make it appear** — **OPEN, measured off the
  device 2026-09-12.** Against the library that ships, on every sentence anyone has tried: the five hardest problem
  sentences still get a tip in every mode, meaning search on or off; the twelve junk phrases attach nothing, which
  routes nowhere, so no line. The floor this wave added changed nothing on the tip side — 14 right, 1 wrong, 2
  nothing, before and after. Either the floor bites on tips or the line is decoration.
- ★★ `[KB]` **Four questions still get notes about the wrong subject** — **OPEN, three of the four now say so,
  found 2026-09-07.** Asking Black Mesa how to tame a horse, asking Portal 2 where to buy a house, and asking about
  a Hades boss that does not exist all still attach a note. The floor added this wave cannot catch these without
  also throwing away twenty or more correct answers elsewhere in the library, so it was left as it is. **Three of
  the four now carry the new "no close match" line** (D88 above), so the answer no longer reads as grounded — but
  the wrong note is still attached and still shapes the reply. *"Where do i buy a house"* gets no line at all,
  because a word in it really does point at a card. Fixing the attachment itself, rather than labelling it, is
  wave-four note-writing work.

### Deck check owed

- ★ `[KB]` **Five checks from the August retrieval rework were never run on the Deck** — **VERIFY, or retire.** The corpus
  format gate, the relevance floor, follow-ups searching the user's words, transparency matching what the model got, and
  the Developer kill-switch. Either one evening with pinned test chips, or close them as superseded by the rows that
  passed this week. Rows **KB-VARIANT-01**, **KB-FLOOR-01**, **KB-FOLLOWUP-01**, **KB-TRANSPARENCY-01**, **KB-KILLSWITCH-01**.
- ★★ `[KB]` **The new answer shape needs a read on the device** — **VERIFY, one of three read 2026-09-12.** The
  Portal 2 one came back clean: the note's advice starts straight after the character's opening line, 111 words, no
  warning line. Whether that reads as advice-first is your judgement, which is what this row is for. The Hades and
  Black Mesa sentences **are pinned on the Deck now** — press A on each and read them. The Hades one needs Hades
  running. Row **KB-ANSWER-03**; evidence `docs/test-evidence/plan48-deck-evening-2026-09-12.json` **[no evidence — re-run, batch QA-EVIDENCE-GAP-01]**.
- ★★★ `[KB]` **A follow-up now answers about the boss you meant, two times in three** — **SHIPPED and checked on
  the Deck 2026-09-12.** Ask about a boss, then *"what about its second phase"*. It used to answer about a different
  boss **every time**. Three pairs on the device: right, right, then the old failure. That matches what was measured
  off the device for this game exactly, so the number holds on the real thing. **Not a fixed feature** — one run in
  three still names the rival boss — and DOOM Eternal fails every time, which no search work can close. Replies on
  these turns are about half as long. Row **W3-R4**. (D98) [Numbers](planning/48-kb-wave-three-session.md)
- ★★★ `[KB]` **Every question no longer waits a second for the notes to be searched** — **FIXED and checked on the
  Deck 2026-09-12.** The Deck was set to hold one model at a time, so writing an answer pushed the note-searching
  part out and the next question spent about seven tenths of a second loading it back. A new switch, **Start the AI
  with the Deck** on the Ollama tab, adds a startup entry that keeps both in memory: **24 thousandths of a second
  instead of 732**, measured on the device. It also fixes something nobody had noticed — nothing started the AI at
  all, so a restart left the plugin with no AI until someone started it by hand. Off by default. Row
  **KB-AUTOSTART-01**.
- ★★★ `[KB]` **DRG Survivor glossary terms** — **VERIFY, one touch tap owed.** Shipped 2026-08-28 and walked on device:
  underline, popup, D-pad reachability, B, one-press Up. Rows **DRG-GLOSSARY-01…04**.
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
- ★★★ `[KB]` **KB download Cancel** — **VERIFY, blocked.** Shipped 2026-08-05. The download finishes in about a second on
  device, so there is no window to press Cancel in. Needs a slower fixture or a throttle. Row **KB-CANCEL-01**.

### Next

- ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch already built.** The answer test's voice
  switch landed 6 September. What's still owed is one run with it turned on, which wave three's main measurement
  run includes — planned as wave three ([48](planning/48-kb-wave-three-session.md)).
- ★★ `[KB]` **Prompt diet** — **OPEN, agreed 2026-09-01.** The model reads about nine tokens of rules for every token of
  knowledge. Drop the citation instruction (obeyed once in 89 asks, and the UI cannot show it), send screenshot rules only
  when an image is attached, put the cards next to the question. About a day, measured before and after on the answer test.
- ★★ `[KB]` **"Not in my notes" line** — **OPEN, agreed 2026-09-01.** When a game question matches no card, one muted line
  built by code says the answer is general knowledge, so a person can tell notes from memory. Only on Strategy and Expert
  asks for a covered game; never when the library is off or the game is uncovered. **Wording settled 2026-09-07:**
  *"Not in my notes — this answer is from the model's own knowledge."* (D48, D85)
- ★★ `[KB]` **Eval tooling: the weight sweep, per-question results for what ships, a second right answer** — **OPEN,
  agreed 2026-09-01, sweep go-ahead 2026-09-05.** Nothing a user sees. The sweep runs on the tuning questions and decides
  the blend-weights bug above; the rest stops every card batch reading as a regression when two cards are both fair
  answers. No row uses the second-answer option yet. One to two days. (D51, D68)
- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, one measurement owed.** The
  slice of questions the word search cannot answer at all was 3 rows when last counted, before 36 more blind rows landed.
  Re-count it on the next search run before calling this closed. [Detail](roadmap-details.md#eval-fixture-cannot-see-a-recall-failure).
- ★★ `[KB]` **Pull the embedding model as part of installing the library** — **OPEN, added 2026-09-05.** A person who
  installs the library but never presses the pull button silently gets word search only, the weaker half by every
  measurement. A button and a one-time hint exist today; make the pull part of the download flow, with consent, never
  silent. Promoted out of Phase 7. One to two days.
- ★★ `[KB]` **A latency budget for a game question** — **OPEN, added 2026-09-05.** The slowdown above was only caught because
  one QA row happened to record a band. Write down the budget (embed time plus first token with a game running) so the next
  regression fails a check instead of relying on luck. Planned as wave three ([48](planning/48-kb-wave-three-session.md)).
- ★★ `[KB]` **A measured context-window experiment** — **OPEN, research, added 2026-09-05, re-measured 2026-09-06.** The
  Deck's model runs with a 4,096-token window and a Strategy question with cards already goes over it (now trimmed
  instead of dropped, see Done). Try 8,192 as a Developer experiment with a game running, recording memory and time to
  first token, before it becomes a setting. Agreed as "later, its own call". (D46)
- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.** Filed as
  "the tips don't use the words people type", which is true and is the smaller half. Measured 2026-09-07: **nine of ten
  ordinary problem sentences reach nothing at all** — *"my game keeps crashing"*, *"my game won't launch"*, *"black
  screen when I start the game"*. The word "crash" is deliberately classed as too weak to route a question on its own;
  that holds with a game running and not with nothing running. Next step: a floor under the tip search so it can say
  none fit, plus a "no tip for this" line. (D81, D85) Planned as wave three ([48](planning/48-kb-wave-three-session.md)).
- ★★★ `[KB]` **Spoiler coverage as a tiered setting** — **OPEN, tiers confirmed 2026-09-01.** Strict fences bosses, endings
  and chapters; default fences only named story beats and endings; open fences nothing you asked about. Naming a boss still
  unlocks it in every tier. Needs the settings plumbing, a prompt per tier measured on the answer test, a control with a
  focus entry, and Deck QA. About three days. (D50) [Detail](roadmap-details.md#spoiler-coverage-should-be-a-setting-with-tiers).
- ★★★ `[KB]` **"Starting out" cards get their own kind** — **OPEN, decided 2026-09-05, nothing built.** A new player gets
  a *"How do I get started in Fallout 4?"* chip and *"where do I start"* finds the card. One new kind in the validator and
  the two kind lists, one chip wording, a rescue phrase list, a rebuild; then re-type the three cards filed as mechanics and
  write the Cyberpunk, Fallout 4 and Red Dead ones you asked for. Rides the bundled release. (D65)
  [Detail](roadmap-details.md#the-corpus-has-no-starting-out-card).
- ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the 139 prose cards as labelled short
  lines, the shape the 16 structured cards use. Facts kept is already 92%, so the ceiling is low; do it only if the answer
  test shows the labelled shape scores better. Two to three days of content plus a rebuild.
- ★★★ `[KB]` **Deeper answer checks** — **OPEN, added 2026-09-05.** The answer test checks facts, contradictions, fences and
  the menu, and cannot see whether a reply was helpful or whether the model admitted not knowing. Add a small set of
  questions no card can answer, scored for an honest "I don't know", and a read by a person of ten replies a month.
- ★★★ `[KB]` **The next corpus release carries everything that needs a rebuild** — **OPEN, added 2026-09-05.** Any format
  change makes every installed library stale until re-downloaded, so per-game tips, the starting-out kind and the style pass
  ride one release rather than three. Same format as today for anything that can wait.
- ★★★ `[KB]` **KB visual maps** — **OPEN.** Two shapes you named 2026-08-29: a dungeon map, and a boss outline with weak
  points marked. Nothing draws anything in a reply today. A dungeon map has to be authored, which sits behind the source
  policy and a corpus rebuild. Research first. [Detail](roadmap-details.md#kb-visual-maps).
- `[KB]` **Idea for wave four: dungeon maps** — raised by the maintainer 2026-09-07, no stars and no plan yet. Picks up
  the dungeon-map half of the visual-maps idea above when the time comes.
- ★★★★ `[KB]` **RAG Phase 4: extended retrieval** — **PARTIAL.** The chip guarantee and 16 structured cards shipped
  2026-08-19; the split was accepted 2026-08-21 and prose replies were accepted 2026-09-05 (D67). Left: per-game Deck tips (content for seven titles collected, two quirks from
  your own Deck), which need a format bump and a release — see the release entry above. Two to three days. The chip
  clipping check waits on the preset-row work. [Detail](roadmap-details.md#rag-phase-4-extended-retrieval).
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** 133 → 161 cards since 2026-08-29. Eleven of the
  thirteen titles still have no enemy or item cards, so "how do I deal with X" works for two games. Next: 40–60 entity cards
  in tranches with a quality read from you after the first; then chip ranking by meaning. Card authors cannot write blind
  test questions, so content and eval rows go in separate sessions. [Plan](planning/28-phase5-corpus-depth.md).
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get cards; today they get nothing specific. New card kinds and a spoiler table update, Left 4
  Dead 2 first, then Counter-Strike 2, from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md).
- ★★★★ `[KB]` **RAG Phase 7: retrieval infrastructure** — **OPEN.** Mostly nothing at 161 cards. What still matters: a
  thumbs-down that stops a wrong card coming back (three days), add-on packs before any large catalog (five days or more),
  a screenshot feeding the search (a short test to find out first). A nearest-neighbour index buys nothing until the corpus
  is thousands of cards. The embedding-model pull is its own entry above. [knowledge-base.md](knowledge-base.md) § Phase 7.
- ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed card with
  one press: **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days.
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that makes most people's games get
  notes instead of the model's memory: about the top 1000 Steam titles, the top 100 on Deck, and an emulated slice. Months:
  it cannot be hand-written (161 cards took six weeks), so it needs an ingestion pipeline from wiki dumps, per-source
  licensing, a size budget, packs and the index. [knowledge-base.md](knowledge-base.md) § Phase 8.

---

## Done for v0.5.0

Everything shipped since v0.4.9 (2026-07-08), one line each — moved out to its own file to keep this one small,
copied line for line, nothing reworded: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).
