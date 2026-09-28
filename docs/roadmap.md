# bonsAI Roadmap

> **Clean-up task — trim this file. Done 2026-09-15.** The other four big documents each carry their own trim
> task at the top; the roadmap entry that tracks all five is under Features.
>
> Reading this now costs roughly **19,000 tokens**, and the house rules say it is read before any work is marked
> done, so that cost lands on every piece of work. Together with the testing rows, trimming both saves about
> **31,000 tokens per landing**.
>
> **100 KB down to 83 KB.** 2026-09-13: the finished list moved to the archive. 2026-09-14: the parked entries moved
> to their own file, the old decisions under *Calls waiting on you* dropped to a pointer, the longest entries reworded,
> and six finished items moved to Done and archived. 2026-09-15: a seventh finished item split so the part that still
> fails stays visible, the knowledge-base opening stopped quoting numbers it then retracts, and the three longest
> entries sent their reference detail to the details file.
>
> **What is left is not worth taking.** Thirty-four entries still run past five lines, but most by only a line or
> two, and the ones that run long are long because the work is. Grinding those down would cost more in understanding
> than it saves in tokens. The bigger wins are now in the other four files, each with its own trim task at the top.

Open bugs, work fixed but not yet confirmed on the Deck, planned features, parked work, and what shipped for v0.5.0. Five
lists plus one section for the knowledge base, each sorted from one star to six.

- **Knowledge base and RAG, all in one place:** [its own section](#knowledge-base-and-rag) — bugs, owed checks, next steps
  and the calls waiting on the maintainer, with [a status report](planning/37-rag-status-report.md) kept in step with it.
- **Long notes for open items:** [roadmap-details.md](roadmap-details.md)
- **Shipped features, full detail:** [archive/roadmap-completed.md](archive/roadmap-completed.md) · **Fixed bugs, full detail:** [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md)
- **Parked work, full detail:** [archive/roadmap-shelved.md](archive/roadmap-shelved.md) — one line each in [Shelved](#shelved).
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
6. **Tags:** `[ask]` Ask bar and input · `[chat]` chat slots · `[chips]` preset chips · `[docs]` the documents themselves ·
   `[focus]` D-pad and focus ring · `[KB]` knowledge base · `[layout]` Main tab layout and vertical space ·
   `[ollama]` models and routing · `[perms]` permissions · `[platform]` build, deploy, tooling, upstream · `[QA]` testing ·
   `[reply]` the answer itself · `[tabs]` the tab bar · `[ui]` everything else on screen · `[voice]` voice.
7. **Parked work lives in [Shelved](#shelved)**, not in Bugs or Features: one line saying what unshelves it, with the
   full entry in [archive/roadmap-shelved.md](archive/roadmap-shelved.md). Move the whole block back when it restarts.

**Every Main-tab UI change also owes the free-play sweep** (standing row **QA-FREE-PLAY-01** in
[testing-manual.md](testing-manual.md)): walk the pane like a user and require every focused stop to also be visible.

**Maintainer note (2026-09-05, helpers updated 2026-09-26): pick the model before you pick up an item.** Helpers run
on Opus 5.5: medium by default, low only when the fix is mechanical · ★★★–★★★★ Opus xhigh plans and lands · ★★★★★+
Fable max plans only, Opus medium helpers build, Opus xhigh lands · `[focus]` `[layout]` `[ui]` measure on the Deck
first, then Opus xhigh, never a lane without the measurement · docs and bookkeeping the bookkeeper on Opus low. The full policy — the bookkeeper guard, the escalation rule,
the Haiku trial — is in [AGENTS.md § 3](../AGENTS.md), the evidence in
[planning/33-model-routing.md](planning/33-model-routing.md). A prompt-time hook gives a gentle heads-up when a session
starts work outside this.

---

## Bugs


- ★ `[focus]` **Down does not move the ring off an unrevealed spoiler block** — **OPEN, found 2026-09-04, did not reproduce
  2026-09-05.** With the ring on the hidden block, Down reported the press arriving and nothing moving. Retried today on a fresh
  Red Dead ending reply with a real hidden block on screen: **Down left it normally**, straight onto the branch picker's first
  button, and every stop on the walk was fully visible. So the hidden state does not trap on its own. Most likely the same
  underlying fault as the stuck panel below — both are a hop that dies only sometimes — and best closed with it rather than
  chased separately. Evidence `docs/test-evidence/round35-spoiler-block-down-and-up.json`. **Next thing to try
  (2026-09-18):** the panel-trap entry below now has a known trigger, opening and closing Steam's own on-screen
  keyboard on the question box — worth trying on this hidden-block case too.
- ★ `[focus]` **Walking down a reply and walking back up visit different stops** — **PARTIAL, sighted three
  more times.** The Up fixes landed (`8294e75b`, `29c0b075`, `9feef4e1`), and a Deck walk on 2026-09-27 found the
  same stops both ways (`docs/test-evidence/plan72-F-UP.json`). **Still owed:** row **REPLY-STOPS-MIRROR-01**, and plan 72 saw three
  later slips. [Detail](roadmap-details.md#flow-2b-bugs).
  **2026-09-28 (plan 74):** with a hidden spoiler on screen, 17 of 18 stops now mirror; the one mismatch is the top spoiler
  cover, the same fault as the spoiler-cover entry below (`docs/test-evidence/plan74-REPLY-STOPS-MIRROR-01.json`).
  **2026-09-28 (plan 74, Deck pass 3, after `cb88c012`):** the first cover now mirrors. One stop of 13 still differs: on a
  section that holds only a cover, Down lands on the section's outer box (245×71) while Up lands on the cover inside it
  (237×55). Seen on two answers (`docs/test-evidence/plan74-REPLY-STOPS-MIRROR-01-r2.json`, FAIL). Still owed: row **REPLY-STOPS-MIRROR-01**.
- ★ `[focus]` **Walking Down onto a section that holds only a spoiler cover lands on the section's outer box, and A there
  does nothing** — **OPEN, found 2026-09-28 (plan 74, Deck pass 3).** A player walking Down cannot open that cover from
  where the ring lands; walking Up works. Evidence `docs/test-evidence/plan74-REPLY-STOPS-MIRROR-01-r2.json`.
- ★ `[focus]` **A scroll-only Down press left the ring on a cover partly off the top of the screen** — **OPEN, one
  sighting 2026-09-28 (plan 74, Deck pass 3).** The cover's top was at y 69 while the visible area starts at 88, so about
  a third of it was hidden. Evidence `docs/test-evidence/plan74-P74-COVER-UP-r2.json`.
- ★ `[reply]` **An opened spoiler cover closed again by itself** — **OPEN, one sighting 2026-09-28 (plan 74, Deck pass
  3).** Opened with A, it read as hidden about 40 seconds later, with only D-pad moves and the next question typed in
  between. Evidence `docs/test-evidence/plan74-P74-COVER-UP-r2.json`.
- ★ `[focus]` **In carousel style, Down can land on a chip slid mostly off screen** — **OPEN, sighting
  only — 3 measured re-tries did not reproduce it.** [Detail](roadmap-details.md#flow-2b-bugs).
- ★ `[focus]` **Three more one-off focus sightings from free play, 2026-09-26.**
  [Detail](roadmap-details.md#flow-2b-bugs).
- ★ `[reply]` **Older answers lose their "Was this helpful?" row after switching chats, leaving just the
  speaker icon** — **PARTIAL, seen three times now (2026-09-26).** [Detail](roadmap-details.md#l3-and-2d-findings).
  **2026-09-27 (plan 72, `17253191`, `f4613e2d`):** the row now survives closing and reopening the panel, passed on the Deck (row **F3-KEEP**, `docs/test-evidence/plan72-F3-KEEP.json`). A chat switch still loses it; the next step is in plan 72 § 7, the 15:20 entry.
- ★ `[reply]` `[focus]` **Two more sightings, 2026-09-26, not reproduced on purpose yet:** the chip ladder
  only lets Up leave one chip at a time (and once Down stuck on it, flow L7); two confidently wrong answers.
  [Detail](roadmap-details.md#l3-and-2d-findings).
- ★ `[focus]` **With details open, Down from "N earlier" jumps straight to the notes block** — **OPEN,
  found 2026-09-26 (plan 70, flow L6).** It skips over the newest turn's own Retry, question, answer and
  Hide details on the way down. [Detail](roadmap-details.md#flow-l6-findings).
- ★ `[ui]` **The Context line briefly reads the wrong thing after reopening the panel or switching
  games, then corrects itself** — **OPEN, seen 2026-09-26 (flow L6 once, flow R twice), not reproduced
  on purpose yet.** [Detail](roadmap-details.md#flow-l6-findings).
- ★ `[focus]` **Nothing holds the ring when the Pull button disappears** — **OPEN, sighting 2026-09-27
  (plan 70, flow L10).** The next press recovers. [Detail](roadmap-details.md#flow-l10-findings).
- ★ `[reply]` **A Strategy answer's follow-up choices are sometimes not understood, so no choice menu shows**
  — **OPEN, sightings 2026-09-26 (plan 70, flow L7):** the log warned twice, on troubleshooting turns.
  [Detail](roadmap-details.md#flow-l7-findings).
- ★ `[QA]` **The walk check calls a stop hidden when a corner icon merely overlaps its box** — **OPEN,
  measured on the Deck 2026-09-21.** It judges a stop by sampling its rectangle, so the question row and the
  last answer section always read part-hidden behind the Retry and Copy icons — though the words clear those
  icons by design. Measured: the question's text starts 6px past the Retry icon's edge; the answer's last
  line clears the Copy icon and only its line spacing touches it. Two entries were filed on this and withdrawn
  the same night, and the question-row entry has now been opened and closed twice on it. Until the check reads
  text rather than boxes, measure the text before filing. Evidence
  `docs/test-evidence/plan63-CORNER-ICON-COVERAGE-01.json`.
- ★ `[layout]` **A thin strip of the answer shows through below the game-context line at the bottom of the
  Main panel** — **OPEN, found on the Deck 2026-09-23.** Visible in
  `docs/test-evidence/plan64-BYEYE-01-chat-row.png`, between the dock and Steam's own bottom bar.
  **Sighting, 2026-09-23:** seen again under the "Context: no active game detected" line. Evidence
  `docs/test-evidence/plan64-BUSY-DOT-01-back_on_first_chat_22-20-07.png`.
  **Not reproduced 2026-09-27 (plan 72):** not seen with text behind the dock, `docs/test-evidence/plan72-A8-BOTTOM-STRIP-READING.json`.
- ★ `[ollama]` **A plugin reload stops a model download in progress** — **OPEN, found on the Deck
  2026-09-23 (flow H).** Reloading the plugin mid-download killed the pull at 16%; asking again picked up
  from the same partial file rather than starting over, so nothing was lost, but a running download does
  not survive a reload. Evidence `docs/test-evidence/plan64-ROUTING-MERGE-01-top-try2.json`.
- ★ `[focus]` **Down from the chat row once skipped the whole answer, after returning from Settings** — **OPEN, seen once
  2026-09-27 (plan 72).** Evidence `docs/test-evidence/plan72-F-ROW.json` (notes).
- ★ `[layout]` **The "What went wrong?" block once ended 14 pixels under the dock** — **OPEN, seen once 2026-09-27
  (plan 72, free play).** It passed in the planned check. Evidence `docs/test-evidence/plan72-Z-FREEPLAY.json`.
- ★ `[reply]` **Copy joined two paragraphs into one** — **OPEN, found 2026-09-27 (plan 72, free play).** Evidence
  `docs/test-evidence/plan72-Z-FREEPLAY.json`.
- ★ `[reply]` **A Strategy answer about the Deck overlay ended with the previous question's Hollow Knight choices** —
  **OPEN, seen once 2026-09-27 (plan 72).** Noted in the plan 72 record, § 7.
- ★ `[reply]` **Answer quality, known issue: answers borrow each other's wording** — **OPEN, seen 2026-09-27 (plan 72).**
  The Hades answer reused the Hollow Knight answer's wording; power answers came out near-identical with no number;
  the log pulled a power suggestion out of a boss answer. Evidence `docs/test-evidence/plan72-Z-FREEPLAY.json`.
- ★ `[platform]` **After the release: two clean-ups behind the scenes** — **OPEN, from plan 72.** The step that runs
  after an answer may hold other stale copies (it broke the chips, and once the Strategy checklist): read it through.
  The old live-line trimming code is now unused except by its tests and the Show reasoning tidy: remove it.
- ★ `[chat]` **After the Steam ban lookup replies, the "New chat" spot shows that command's permission row** — **OPEN,
  found 2026-09-28 (plan 74), seen once.** The row, with Open Permissions, sits on the new-chat spot. Evidence
  `docs/test-evidence/plan74-P74-LOCAL-CMD-CHAT.json` (notes).
- ★ `[docs]` **The design notes should say the decode chip's typing mark uses the toned accent colour** — **OPEN, found
  2026-09-28 (plan 74, lane 4's note).** One line in `docs/design-tokens.md`.
- ★ `[focus]` **After B closes the library's location box, or after Remove, the ring goes to the tab bar** — **OPEN,
  found 2026-09-28 (plan 74).** It should go back to its button, the same family as the "Update Ollama and models?" box
  fixed this wave. Evidence `docs/test-evidence/plan74-P74-SAFE-FIRST-PICKER.json`.
- ★ `[focus]` **Cancel on the AI models screen, with a model queued, sends the ring to the tab rail** — **OPEN, found
  2026-09-28 (plan 75).** The ring lands on the far-left tab rail instead of back on "Browse models…"; Done puts it back
  correctly. Evidence `docs/test-evidence/t75-3-Q2-SAFE-FIRST-TIER2.json`.
- ★ `[focus]` **"Remove knowledge base?" opens with the ring on "Remove", not "Cancel"** — **OPEN, found 2026-09-28
  (plan 74).** Evidence `docs/test-evidence/plan74-P74-SAFE-FIRST-PICKER.json`. Seen again on all five plan 75 Deck runs,
  2026-09-28 (`t75-1-Q6-REMOVE-KB-SAFE-FIRST.json` to `t75-5-Q6-REMOVE-KB-SAFE-FIRST.json`).
- ★ `[focus]` **Two more boxes may start on their action button, found in the code** — **OPEN, found 2026-09-28 (plan 74
  lane 3's report), not yet seen on the Deck.** The per-model "Enable Tier 2 for this model?" box starts on its action
  button, and the Tier 1 and Tier 2 install buttons on the Ollama tab do not get the ring back after their box closes.
- ★ `[focus]` **Walking Down through a long answer, the ring sticks on a highlighted word** — **OPEN, found 2026-09-28
  (plan 75).** It stays on a word like "overclock" for three to eight presses while the answer scrolls under it, the word
  above the visible area, then moves on. Seen on every Deck run that day (the popup measurement and all six plan 75 runs).
  Evidence `docs/test-evidence/t75-5-Q4-ASK-UP-answer-scroll.png`, `docs/test-evidence/t75-5-Q4-ASK-UP.json`.
- ★ `[ui]` **The "Enable Tier 2 before pulling?" box talks about a reply that does not exist** — **OPEN, found 2026-09-28
  (plan 74).** It says "This reply used an 'open model'" although no reply is involved. Evidence
  `docs/test-evidence/plan74-P74-SAFE-FIRST-TIER2.json`.
- ★ `[ui]` **Small leftovers from plan 74** — **OPEN, found 2026-09-28 (plan 74's lanes).** The "Request cancelled."
  bubble still has a Copy button; the rarely seen "nothing to sum up" pop-up still says "the whole chat still fits";
  removing a model inside the plugin does not reset its 30-second memory, so the note-search hint can take up to 40 s.
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** —
  **OPEN, back from Verify 2026-09-23: failed by hand, found by the maintainer (build `a224fb6`), after the
  Deck work ended.** After Show details → Session, both tab bars stayed drawn at once — the small "MAIN" bar
  and the big icon bar under it. Touch scrolling did not close the big one; the first D-pad move did.
  Recording `recordings/DeckRecord_20260923_235526_game.mkv` (11 seconds, every frame shows both bars) —
  this recording lives only on the maintainer's own computer; the recordings folder is not saved with the
  project. Row **TAB-BAR-GHOST-01**. The session's guess: closing a Decky popup rebuilds the plugin, and
  the highlight lands on the top bar, which then opens. Needs a Deck walk with the focus recorder before any
  fix.
- ★★ `[focus]` **Walking Down while an answer is still arriving loses the ring** — **OPEN, found 2026-09-27
  (plan 70, flow L10).** It sticks on the first, half-visible answer part, then nothing has focus; fine on a
  finished answer. [Detail](roadmap-details.md#flow-l10-findings).
  **Not reproduced 2026-09-27 (plan 72):** the ring was never lost, `docs/test-evidence/plan72-A5-DOWN-WHILE-ARRIVING.json`.
- ★★ `[reply]` **With nothing running, the decode effect slows long answers** — **OPEN, found 2026-09-27
  (plan 70, flow L10).** About 37 frames a second on a 2,900-letter answer, against about 50 on shorter
  ones; not yet known whether it was always so. [Detail](roadmap-details.md#flow-l10-findings).
- ★★ `[chat]` `[focus]` **A chat opened with RB while a game runs is drawn as history, and Down dies on its
  question line** — **OPEN, found 2026-09-26 (plan 70, flow L7).** Closing and reopening the panel fixes it.
  [Detail](roadmap-details.md#flow-l7-findings).
  **Not reproduced 2026-09-27 (plan 72):** walked cleanly, `docs/test-evidence/plan72-A7-GAME-ii.json`.
  **Not seen again 2026-09-27:** in none of plan 72's seven Deck blocks (plan 72 § 7).
  **The maintainer's call, 2026-09-27:** named in the 0.6.0 release notes (plan 72 § 8); watched, not chased.
- ★★ `[chat]` **A chat that is still writing does not look busy from another chat** — **OPEN, found
  2026-09-18, seen three times, stays open — the maintainer's call.** Switch away from a chat that is
  still writing and nothing says so; the code looks right on paper. Two clean measured sessions since
  (2026-09-23 and 2026-09-26, 3 more tries) did not reproduce it, which is not enough to close a bug seen
  three times before. **New, unclear, the maintainer's call:** the other chat's own Ask button read
  greyed while the first was still writing, not "ready" as the row expects — which reading is actually
  right is open.
  [Detail](roadmap-details.md#a-chat-that-is-still-writing-does-not-look-busy-from-another-chat).
- ★★ `[focus]` **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a
  blanket rule was tried and reverted in favour of Steam's native outline. [Detail](roadmap-details.md#small-and-cosmetic-as-filed).
- ★★ `[ollama]` **After the release: the model tiers' licence labels** — **OPEN, found 2026-09-28 (the licence check);
  the maintainer's call: labels only, after the release.** From memory, to confirm on each model's page: Qwen 2.5's 3B
  and 72B sizes (including the default picture model qwen2.5vl:3b) and qwen2.5-coder:3b carry Qwen's own licences, yet
  sit in "open source only"; so do vicuna, orca-mini and the non-Mistral llava; the docs call Gemma Tier 2, the code puts
  Gemma 4 in Tier 1; gpt-oss is Apache but sits last. Fix the labels and the README and troubleshooting wording.
- ★★ `[ollama]` `[focus]` **A tap outside the AI models screen started the queued downloads and left the
  D-pad stuck in the Ollama tab** — **OPEN, reported 2026-09-16, not reproduced.** The maintainer thinks a
  tap landed outside the screen instead of on Done; the queued models then started downloading and the
  D-pad could not move in the Ollama tab, as if the screen were still open. Read in the code but not proven
  on the device. Needs a reproduction with an empty download queue.
  [Detail](roadmap-details.md#a-tap-outside-the-ai-models-screen-started-the-queued-downloads-and-left-the-d-pad-stuck-in-the-ollama-tab).
- ★ `[ollama]` **Replies from the Ollama address have no size limit** — **OPEN, found 2026-09-28 (0.6.0
  security review, finding 6), after the release.** A fake Ollama the user pointed bonsAI at can fill the
  Deck's memory. Twelve places, including how answers stream in. [Review](audit/security-review-0.6.0.md).
- ★ `[ollama]` **An Ollama address typed as https is quietly sent as plain http** — **OPEN, found 2026-09-28
  (security review, finding 7), after the release; needs the maintainer's call first:** support https, or
  refuse it and say so. [Review](audit/security-review-0.6.0.md).
- ★ `[voice]` **The speech model is downloaded from a changing address and not checked** — **OPEN, found
  2026-09-28 (security review, finding 8), after the release.** Pin the address, check the file's
  checksum, cap its size; also refuse a knowledge-library file list with no checksums.
  [Review](audit/security-review-0.6.0.md).
- ★★ `[ask]` **The chat summary reads oddly in places** — **OPEN, found 2026-09-25 (plan 68).** Examples
  from the Deck pass: "Game: Parrying practice", "Player is stuck on: None apparent in this log". Needs
  another desk test on real chats.
- ★★★ `[focus]` **The panel can get into a state where pressing Down stops half way and the Ask button is
  out of reach** — **OPEN, found 2026-09-05, stays open — the maintainer's call.** Usually only a full
  loader restart clears it; closing and reopening Quick Access cleared one flow-R occurrence too, this
  time from a chip filling the question box. Still sighted 2026-09-26; a careful reading the same night
  did not reproduce the chip route (0 of 6). [Detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  **Not reproduced 2026-09-27 (plan 72):** 0 of 3 with the keyboard trigger, `docs/test-evidence/plan72-A1-STUCK-KEYBOARD-try1.json` (and try2, try3).
  **Not seen again 2026-09-27:** in none of plan 72's seven Deck blocks (plan 72 § 7).
  **The maintainer's call, 2026-09-27:** named in the 0.6.0 release notes (plan 72 § 8); watched, not chased.
- ★★★ `[focus]` **Over Fallout 4, the question box goes dead with no chip pressed** — **OPEN, found
  2026-09-26 (plan 70, flow L7), same family as the entry above.** Down and Right leave the ring in the box;
  only Up works, and closing and reopening the panel does not clear it while the game runs.
  [Detail](roadmap-details.md#flow-l7-findings).
  **Not reproduced 2026-09-27 (plan 72):** walked cleanly, `docs/test-evidence/plan72-A7-GAME-i.json`.
  **Not seen again 2026-09-27:** in none of plan 72's seven Deck blocks (plan 72 § 7).
  **The maintainer's call, 2026-09-27:** named in the 0.6.0 release notes (plan 72 § 8); watched, not chased.
- ★★★ `[layout]` **The chat summary card appears behind the dock until Down is pressed** — **PARTIAL, found
  2026-09-25 (plan 68). Accepted as is for 0.6.0 (the maintainer, 2026-09-27).**
  [Detail](roadmap-details.md#the-chat-summary-card-appears-behind-the-dock-until-down-is-pressed).
  **2026-09-27 (plan 72, `a9fe54bb`):** the card now scrolls into view by itself, but a tall card on a long chat still leaves its last 10 pixels behind the dock, `docs/test-evidence/plan72-F-SUMUP.json`. The maintainer's call is pending.
  **2026-09-27 (plan 72, `c603925d`):** moving the ring onto the card after Sum up FAILED on the Deck,
  `docs/test-evidence/plan72-F6-SUMUP.json`. A fix is being built.
  **2026-09-27 (plan 72, `01127c79`, `5dbb9bff`):** two more tries FAILED the same way, `docs/test-evidence/plan72-F7-SUMUP.json`,
  `plan72-F8-SUMUP.json`: Steam keeps the ring on the greyed "Sum up again". **The maintainer's call: leave it as is for 0.6.0** —
  the card shows itself and one Down reaches it; named in the release notes (plan 72 § 8). After the release: finish the
  hand-off or take the tries out of the code (they do no harm).
- ★★★ `[reply]` **Some saved answers have a hidden block's markers written twice, cause unknown** — **PARTIAL,
  found 2026-09-25 (plan 68).** The chat memory now copes with the doubling (`6843f8e1`), but why it happens
  has not been found. Deck check owed.
  [Detail](roadmap-details.md#some-saved-answers-have-a-hidden-blocks-markers-written-twice-cause-unknown).
  **2026-09-27 (plan 72, `8753cb7f`, `74e8fc7b`, `d2e5e98e`):** three related paths fixed and unit-tested: a one-line hidden block no longer gets wrapped twice while streaming, no longer opens onto "undefined" or shows openly, and Copy and Read aloud no longer give it away. The original cause is still unproven, most likely the model; no Deck check yet.

---


## Features

**Standing goal from the maintainer (2026-08-30):** buy back as much vertical room for the chat bubbles as possible; every
`[layout]` entry serves it. Items rated ★★★★★ or above carry a placeholder link to [bonsAI Issues](https://github.com/qd313/bonsAI/issues) in the archive;
replace it with a specific issue when one exists.

- ★ `[ask]` **Intent packs later review** — **OPEN.** Decide whether the quiet intent-pack search aliases are deleted, left quiet, or
  revived under Developer. Not in scope: re-shipping Proton journal inject without a redesign. **New evidence 2026-09-06 (D79):**
  the bundled Deck basics list ships switched on and is the *only* reason a whole sentence ever matches a setting — its 88 words
  match when your sentence contains one of them, so *can you help me with performance* returns three results. The maintainer folded
  that finding into this entry. [Detail](archive/45-settings-shortcut-card.md#5-two-things-about-the-search-that-are-not-obvious).
- ★ `[platform]` **Four small build-setup tidy-ups, deferred on purpose in 2026-08** — **OPEN, carried over
  2026-09-24 from plan 24 when it was archived.** Nothing a person would notice: name the package manager's
  version in `package.json` (the workflow repeats it by hand today), move `packages/bonsai-mcp` off npm so the
  repo uses one package manager, drop the old `pnpm.peerDependencyRules` block that warns on every install, and
  stop `pretest` leaving the tree dirty. [Plan § 5](archive/24-track-a-ci-baseline.md).
- ★ `[ui]` **A leftover piece of state from the deleted settings-card keyboard marker** — **OPEN, found
  2026-09-16 while landing the settings card's real D-pad wiring.** The plugin's main file still keeps a
  `selectedIndex` value that only the old fake on-screen marker ever read, and two other files still pass it
  through even though nothing acts on it any more. Nothing a person notices; removing it touches three files
  (`src/index.tsx`, `src/components/MainTab.tsx`, `src/features/plugin-shell/tabs/useMainTabPayload.tsx`).
- ★★ `[chat]` **A quiet cue that a cut question can be opened** — **OPEN, filed 2026-09-05 by the maintainer.** When the ring lands on
  a question bubble that has been cut short, nothing on screen says the rest is there. Chosen 2026-09-05 from four drawn options: the
  text fades out at the right-hand edge instead of ending in three dots, only while the ring is on it, nothing for a finger. Nothing
  is added and nothing shifts. The same fade already sits in the stylesheet with no user, written for cut-off answer bubbles.
  One check owed first: the question bubble turns its own outline off and gets no ring rule, so look on the Deck at what focus shows.
- ★★ `[chat]` **Summing up offers a fresher title** — **OPEN, asked for by the maintainer 2026-09-25.** Each
  *Sum up this chat* also hands the AI the chat's current title; when the AI judges it stale, the person is
  offered its suggestion and chooses to rename or keep. [Detail](roadmap-details.md#summing-up-offers-a-fresher-title).
- ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.** The create position is the
  literal `[+]`, re-confirmed on board 8f and again in the v3 rows. Reopen that decision before building it.
  [Detail](roadmap-details.md#first-run-ghost-new-chat-label).
- ★★ `[platform]` **The settings list is written out seven times** — **OPEN, deferred on purpose 2026-09-15
  (plan 55, D104), carried over 2026-09-24 when that plan was archived.** About fifty settings, and the screen
  side names every one of them by hand in seven places in one file. Miss one when adding a setting and it looks
  fine but quietly resets after a restart; that already happened once, to four settings together. Fix: write
  the list once and have the other six read it. Nothing is broken today. [Why](archive/55-bugfix-session-three.md).
- ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed
  2026-09-08. Not yet (D99, 2026-09-12): it waits for its own go.** The model would open every answer with
  one short sentence that carries the point and gives nothing away. **The 2026-09-12 count:** only 2 of 10
  answers already opened that way and 0 of 10 gave anything away — by the maintainer's own rule that means
  build it, but they read the count and said not yet. [Detail](roadmap-details.md#headline-first-every-answer-opens-with-one-line-that-stands-alone).
- ★★ `[reply]` **Should a streamed answer keep its layout when it finishes?** — **OPEN, a decision, carried over
  2026-09-24 from plan 05 when it was archived.** Plan 05 called this "the one design question worth deciding
  soon" on 2026-08-07 (its P6): today an answer is laid out one way while it arrives and re-laid out when it
  finishes, and two ways of drawing it can drift apart. Written before September's reply changes: check today's
  code first, it may be moot. Touches [plan 69](planning/69-streamed-answers-scramble.md). [P6](archive/05-token-streaming-review.md).
- ★★ `[reply]` **The answer's first lines in the reply-ready toast** — **OPEN, planned 2026-09-05 (D63); built five ways in the
  plan 75 trial 2026-09-28, not landed.** The toast would show the start of the answer for eight seconds instead of *Reply ready*.
  Measured on both screens: one title and one body line, about 43 and 35 characters; the maintainer's call (2026-09-28): the answer
  runs across both lines, the *bonsAI* title dropped. The reviewer's pick needs fixes; landing before 0.6.0 is the maintainer's call
  ([plan 75 § 9](planning/75-sonnet-5-5-trial.md)). Evidence `docs/test-evidence/plan38-M*-*.json`. [Plan and mockup](planning/38-toast-answer-lines.md).
- ★★ `[reply]` **Which bundled characters copy a real person** — **OPEN, filed 2026-09-08 (D74); the gate for the shelved character
  voices.** All 31 characters in the picker are named characters from games or TV, each voiced by a real actor, and one is a living
  comedian's own persona. A written sweep, one line per character: who owns the character, whose voice it is, and whether a voice for
  it could be made as a type rather than a copy. Text roleplay sits on the first layer today; any voice would sit on all of them. No
  code; a document the legal check reads. [Memo](planning/42-read-aloud-feasibility.md).
  **Not needed for 0.6.0 (2026-09-27, plan 72):** the characters are text only (a name and a letter, no pictures or voices), and
  the same list shipped in 0.4.9. Still the gate before any character gets a voice.
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
- ★★★ `[chat]` **Opening "N earlier" floods a long chat with rows** — **OPEN, reported by the maintainer
  2026-09-25; needs a drawing of the options first.** Every earlier question becomes its own row, 42 in one
  chat, filling the screen. [Detail](roadmap-details.md#opening-n-earlier-floods-a-long-chat-with-rows).
- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16 on the Deck's
  built-in screen, no single cause, not built in plan 56.** The panel is only 454 pixels tall on the Deck's
  own screen, not the 696 every earlier number assumed, so even a two-turn chat overflows it and a person
  sees about three lines of chat. Fixed rows take 311 of the 454 pixels before any chat starts. Getting more
  room means shrinking or hiding one of those rows — a design call for the maintainer. [Detail](roadmap-details.md#give-the-reclaimed-height-to-the-transcript).
- ★★★ `[layout]` `[focus]` `[chips]` **While reading an answer, the Show details line takes the suggestion
  chip's place above the question box** — **NEW, filed by the maintainer 2026-09-23. Not started.** Today
  the suggestion chip stays pinned above the question box no matter where in a reply the person has
  scrolled. The idea: while scrolling through an answer, that answer's own Show details line shows there
  instead of the chip; once the person scrolls past the answer and its Show details line, the chip comes
  back. The maintainer's own proposed cure for the bug **"Show details' chip ladder hides under the
  question box"**, below. **Needs a plan and animated mockups before anything is built**, since the swap
  between the chip and the line happens as the person scrolls — drawn at the Deck's real size, from the
  real screen, showing the swap in motion.
- ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — **OPEN, research spike.** Hold models loaded, or unload when a game takes
  focus on the Deck APU? The spike decides go or no-go; no production unload before it.
  [Detail](roadmap-details.md#ask--reply-items-with-short-entries-as-filed).
- ★★★ `[ollama]` **Per-mode latency timeouts** — **OPEN, weighed and deliberately not built 2026-09-05.** Separate warning and
  give-up values per Ask mode. It was the sixth candidate in round 36 and was dropped on purpose, said in advance rather than
  discovered late: it is the largest of that set — the two existing values already run through sixteen files each and going per mode
  triples them — and the least of them for a person, since it changes when a warning appears rather than what the plugin can do.
- ★★★ `[ollama]` **What bonsAI costs a running game** — **OPEN, asked for 2026-09-20 and measured the same day.** Writing an
  answer takes about a third of the frame rate: God of War ran 31 frames a second on its own, 20 while an answer was written,
  and 31 again afterwards. It goes both ways — the answer itself drops to about a third of its usual speed. Memory is the other
  half: with that game running the Deck had 206 MB spare before the model loaded. **Giving the model more room costs nothing in
  frames**, so the real questions are what to reserve and whether to say plainly what a question costs. Pairs with keep-alive.
  **A worse sighting 2026-09-26,** plus a screen freeze of up to 7.6 s during a later Deck check that same
  night. **Target set by the maintainer 2026-09-27:** at least 30 frames a second in the panel while an answer
  arrives with a game running. **PARTIAL, measured 2026-09-27:** from about 12 to 36 with the decode effect off
  and 30–33 with it kept (the maintainer's call), dipping into the 20s late in long answers; the game itself
  went from 14–17 to 23–31. Rows **GAME-LIGHT-01**, **STREAM-PIECES-01** partial. Next: a Deck processor
  profile mid-answer. [Detail](roadmap-details.md#flow-l10-findings).
- ★★★ `[platform]` **bonsAI's own icon in the Quick Access Menu** — **OPEN, re-planned 2026-09-23, was ★★★★★★.** The
  free plugin Quick Tab already pins any Decky plugin as its own menu icon, so the wait on Decky's team is over. Left for
  bonsAI: a Deck test, then small fixes. Read from the code, not yet seen: in its own tab the reply-ready notice pops up
  while you are looking at the answer, and tapping it opens Decky instead. Questions answered; the Deck test is next.
  [Plan 66](planning/66-quick-tab-own-menu-icon.md).
- ★★★ `[reply]` **The Spy opens as somebody else** — **OPEN, split off 2026-09-15 (D105).** On a random chance his first message
  introduces him as a different character from the list and he keeps it up. A character has no first message today, so this
  needs a greeting feature first and is its own job, not a line of prompt text. Decide before building: how often, whether the
  picker still shows Spy while he claims otherwise, and how the reveal reads when the person thought they had picked someone
  honest.
- ★★★ `[reply]` **Terse mode: Speed answers in three lines** — **OPEN, planned 2026-08-29, nothing built.** A toggle beside the
  reply-style slider, off by default, capping a Speed answer at three lines. It overrides the slider and the character; destructive
  warnings and the depth phrases escape it. The real work is widening the branch picker (D40). **TERSE-01** passes at 8 of 10.
  [Detail](roadmap-details.md#terse-mode-speed-answers-in-three-lines).
- ★★★ `[ui]` **Adjustable text size in Settings** — **OPEN.** `uiScalePx()` already runs through the stylesheet; the work is exposing it,
  deciding what must not scale (icons, the 300px column), and paying the settings plumbing. [Detail](roadmap-details.md#adjustable-text-size-in-settings).
- ★★★ `[ui]` **Search density** — **OPEN.** Tighter, more scannable results with highlighted match tokens.
  [Detail](roadmap-details.md#focus--deck-ui-items-with-short-entries-as-filed).
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
- ★★★★ `[ask]` **A spoiler-chance rating for the chat's own summary** — **OPEN, not started (D118 call 14).** The
  chat now sums itself up on its own (see Verify, plan 68); rating how likely that summary swept up a spoiler is
  a later plan of its own. [Detail](archive/roadmap-completed.md#the-chat-sums-itself-up-instead-of-being-cleared-closed-2026-09-26).
- ★★★★ `[ollama]` **LAN custom model pull** — **OPEN.** Blocked until a mechanism is chosen (R1 to R4). Depends on **Custom model in
  the Pull Models picker**.
- ★★★★ `[perms]` **Web permission** — **OPEN, discovery locked.** Opt-in live web answers; offline Ask and local KB when off. Kids
  lock forces it off. [Discovery](planning/web-permission-discovery.md) · [Detail](roadmap-details.md#permissions--safety-items-as-filed).
- ★★★★ `[platform]` **Llama.cpp provider spike** — **OPEN, research only.** Go or no-go against Deck-local Ollama. Prior:
  [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md) · [Detail](roadmap-details.md#platform--upstream-items-as-filed).
- ★★★★ `[platform]` **Steam Input layout parse** — **OPEN.** Parse controller VDF configs for control context. Not in scope: writing
  configs.
- ★★★★ `[QA]` `[platform]` **Finish the controller test rig** — **PRIORITY 1 (maintainer, 2026-09-24). PARTIAL: built and
  driving every Deck session since 2026-08-26.** Was ★★★★★ with "board ordered, next: S1 to S3", a month stale. Left from
  [plan 19](planning/19-controller-macro-test-rig.md): a recording that is also a live view (S3), the highlight checked from the
  video (S4), handheld runs over Bluetooth, and the nightly unattended run (P4), which needed the saved-walk replay bug
  fixed first — **now works** (see the bug entry above). Comes before stand-in Decks. Plan 70 built two of
  the four pieces: the replay, and a first slice of the nightly run. **Its first real run happened
  2026-09-26: the command itself works, the walks don't check anything yet.** Row **OVERNIGHT-RUN-01** in
  [testing.md](testing.md). [Detail](roadmap-details.md#overnight-runs-first-real-run). [Program](planning/21-ai-owned-testing-program.md) · [History](roadmap-details.md#controller-macro-test-rig-and-live-view).
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
- ★★★★★ `[ollama]` **On-Deck model benchmark** — **OPEN, descoped on 2026-09-06, one call open (D75).** Rank installed models by measured
  speed and completion; offer as try order with confirmation. Its own gate said: if timings do not hold still, descope to a
  one-shot readout. That readout is now its own three-star entry, [plan 43](planning/43-model-speed-readout.md), and its record
  of timings answers the gate over time. Whether this line retires is D75. **First input, 2026-09-05:** the desk survey of this
  quarter's models in [41-deck-model-survey.md](planning/41-deck-model-survey.md); the calls are D72. [Detail](roadmap-details.md#deck-health-snapshot-local-reply-tts-on-deck-model-benchmark).
- ★★★★★ `[perms]` **VAC Phase 2: opponent IDs** — **OPEN, research.** Surface live opponent identities for ban checks when metadata allows.
- ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN.** AI copy tuned to gen-2 hardware.
  [Detail](roadmap-details.md#the-five-star-and-six-star-platform-items-as-filed).
- ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; first step is a ★★
  test to find out.** bonsAI's panel floating over any VR game, drawn by a small PC program, not a Decky
  plugin. **Locked rule (D97):** it goes only through SteamVR's own panel door and never touches the game
  itself, to avoid an anti-cheat ban. **Bench result, 2026-09-12: the panel works** — a sample answer
  appeared inside the headset view with no plugin code at all. **Still unknown:** pointing at the panel
  (needs a real headset) and whether the notification card SteamVR accepted actually drew on screen. [Detail](roadmap-details.md#the-floating-panel-inside-steamvr).
- ★★★★★ `[QA]` `[platform]` **Stand-in Decks on the maintainer's PC** — **OPEN, planned 2026-09-23, nothing built.** Up to
  four virtual Decks (Bazzite, one Steam account, all but one offline) so several AI sessions test at once instead of queuing
  for the one Deck. A test lead splits the work; one rig lead per machine. Phase 0 first: one stand-in on Windows, screens
  drawn without the graphics card; if that fails, a Linux dual boot. Adds machines, not abilities, so it comes after the
  controller test rig (priority 1, 2026-09-24). [Plan 67](planning/67-stand-in-decks.md).
- ★★ `[reply]` **The folded reasoning line in the character's own voice** — **OPEN, optional, filed 2026-09-16 (D106).**
  Builds only after the reasoning display's first version has landed and been looked at. The mockup page showed the same
  folded line written by the model itself in three characters' voices: Ali G, "See the booyakasha · 41 s"; GLaDOS, "Expose
  the inefficient calculations · 41 s"; the Spy, "Révéler le raisonnement · 41 s" — the longest of the three still fits the
  row at the small size. Not decided yet: how the voiced line gets written, a fixed phrase per character or the model asked
  once each time, and it must fall back to the plain line whenever the character is off or the phrase is missing.
  [Mockup page](https://claude.ai/artifact/2De58qirE34754PEZVPmdb).
- ★★★★★ `[voice]` **Wake-word listening** — **OPEN, beta.** Opt-in always-on local wake **bonsAI**, then STT, then a quiet Ask.
  [Feasibility](planning/10-wake-word-listening-feasibility.md).
- ★★★★★★ `[platform]` **Deep mod AI hints** — **OPEN.** Detect mod frameworks and files; mod-aware guidance.
  [Feasibility](planning/12-deep-mod-ai-hints-feasibility.md).
- ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening
  llama.cpp** — **OPEN, filed 2026-09-08. Not yet (D99, 2026-09-12): nothing built until the maintainer
  says.** One question underneath all three: does bonsAI grow a second way to run — there is no network
  door into its Python side today, so a panel on the PC would have a screen and no brain. **The price is
  now known (2026-09-12):** the Python side ran outside Decky on a Windows PC and all nine calls it normally
  makes came back working. Still missing: a starter program and a way for a panel to reach it. [Detail](roadmap-details.md#one-decision-for-three-items-the-steamvr-panel-leaving-decky-and-reopening-llamacpp).
- ★★★★★★ `[platform]` **Remote Play diagnostics layer** — **OPEN.** Streamed-gameplay answers weight encode latency and host-vs-client
  fixes. Noted in [09-steam-frame-companion-feasibility.md](archive/09-steam-frame-companion-feasibility.md) § B8.
- ★★★★★★ `[reply]` **In-game answer surface** — **OPEN, split 2026-09-05.** Read an answer without leaving the game. The full
  overlay is upstream-gated and stays here as research. The unblocked slice, the toast carrying the answer's first lines, is its
  own ★★ entry above, planned in [38](planning/38-toast-answer-lines.md). Reframed 2026-09-08: the same surface is open in a
  headset through SteamVR on the PC; see **The floating panel inside SteamVR** and [49](planning/49-steam-frame-features.md).

---



## Verify

Fixed, unit-tested and shipped, but not yet confirmed on the Deck. Owed QA row named in each entry; full evidence in
[testing.md](testing.md) / [testing-manual.md](testing-manual.md). Once a Deck run confirms one, move it in the same commit: a line into
[Done](#done-for-v050), the full entry into the matching archive file, drop it from here.

### Bugs that need verification
- ★ `[ollama]` **A model pulled from the first-tick download picker never joins the saved try order** —
  **VERIFY, fixed 2026-09-27 (plan 72, `409cd3aa`).** Ticking the first tickable model in a fresh download picker now correctly
  only queues it instead of starting the download right away (fixed, see Done); once it finishes downloading,
  though, it did not join the saved order used to pick which model answers a question. That half is now
  fixed in the back end.
  Deck check owed: row **PULL-TRY-ORDER-01** (save a try order, download from the picker, close the menu; the model is last).
- ★★ `[chat]` **Clearing a session while an answer is still being written may lose that answer** —
  **VERIFY, fixed 2026-09-27 (plan 72, `1069c8f1`).** Clear resets the waiting state
  first, so the step that runs when the answer stops then skips saving it, since that state no longer says a
  question is waiting.
  The plan 72 try could not run: the answer finished in 33 seconds, `docs/test-evidence/plan72-F-CLEAR.json`. Suggested for the maintainer's hand checklist.
- ★★ `[chat]` **Deleting a chat whose file is already missing leaves its row in the list** —
  **VERIFY, fixed 2026-09-27 (plan 72, `b7339ea4`).**
  Deck check owed: row **CHAT-DELETE-MISSING-01** (remove a chat file over SSH, then delete it in the list).
- ★★ `[reply]` **Picking a branch menu choice shows the model's own internal tag instead of plain words** —
  **VERIFY, fixed 2026-09-26 (helper K, `2e13421d`), mostly passed on the Deck 2026-09-26.** The waiting
  line, the turn header and Show details' own "This answer" tab all show the friendly wording now. **Still
  owed:** Show details' separate "Session" tab still lists the raw tag for the same turn. Row
  **KB-FOLLOWUP-QUOTE-02**. [Detail](roadmap-details.md#flow-l6-findings).
- ★ `[chips]` **A preset chip's icon and its text are coloured the same way** — **VERIFY, fixed in `895cf0a`.**
  Measured on the Deck 2026-09-23: the label colour reads rgb(196,211,226) at rest and rgb(220,235,248) with
  the ring on the chip. Row **CHIP-COLOR-BYEYE-01**. Owed: **a by-eye check by the maintainer**, from
  `docs/test-evidence/plan64-BYEYE-01-preset-chip.png` — a model cannot judge pixels.
- ★ `[chips]` **A preset chip has a bright blue underline that is too distracting** — **VERIFY, fixed in
  `895cf0a`.** Measured on the Deck 2026-09-23: the line's strength reads 0.55, as intended, and is drawn
  only while the ring is on the chip. Row **CHIP-UNDERLINE-BYEYE-01**. Owed: **a by-eye check by the
  maintainer**, from `docs/test-evidence/plan64-BYEYE-01-preset-chip.png`. This line is the chip's only
  highlight cue left, since Steam's own white ring has been clipped off chips since 2026-09-01, so it must
  stay clearly visible, not just calmer.
- ★★★ `[chat]` **Clear cache cleared the screen but not the session** — **VERIFY.** Fixed and confirmed
  2026-08-27 and 2026-09-03; the orphan-chat half is a measured follow-up, not a regression. Only the
  mid-generation half is still owed: clearing while a reply is still being written. Row **CLEAR-CACHE-01**.
  **Tried twice on the Deck 2026-09-18, both too slow:** Clear landed on an already-finished reply both
  times; Clear itself worked cleanly. Needs a reply over about 70 seconds to catch it mid-write, or the
  maintainer's word to call this covered by its unit test instead. **Per the maintainer's answer 2026-09-21
  (D115 #8): this mid-generation half now moves off this session's list and onto the maintainer's own
  checklist** — five device tries is enough, and every reply finished before the controller could walk
  there. The rest of this entry is unchanged. [Detail](roadmap-details.md#clear-cache-cleared-the-screen-but-not-the-session).
### Features that need verification

- ★ `[ask]` **The Steam settings card: two checks never run** — **VERIFY, landed 2026-09-16 (plan 56).** The
  card was moved to Done on 2026-09-16 with all seven rows named, but two were never run on the Deck (found
  2026-09-24): **SETTINGS-CARD-06** (`steam client update channel` still shows its one result at four words)
  and **SETTINGS-CARD-07** (the card rises as the box grows and never reaches the tab bar; only the one-line
  box was measured). Rows 01 to 05 passed. [Plan](archive/45-settings-shortcut-card.md).
- ★ `[ui]` **Hidden for 0.6.0: six "[beta]" chips, "Open Steam Input config", the quick-launch chip and its setup
  commands, Find LAN and its chips, and the UI scale section** — **VERIFY, landed 2026-09-27 (plan 72, `169edb07`, `12227980`,
  `4dc2fbdc`, `8b27e38e`), the maintainer's calls in plan 71 § 6 item 1.** Find LAN is gone, `docs/test-evidence/plan72-F-HIDDEN.json`; UI scale
  still shows there only because that Deck has the Developer tab on. Deck check owed: each item with the Developer tab off.
  **2026-09-27:** the Steam ban lookup's key box stays on the Developer tab for now, the maintainer's call.
- ★★ `[chips]` **Make the preset chips look more like chips** — **VERIFY, shipped 2026-09-17 under plan 60
  (D110).** Chips now look raised, sit closer together, and the chip the controller is on shows a light bar
  instead of the old outline. Rows 02 to 06 and 08 passed by measurement; row 09 failed and is filed as its
  own bug, below. Owed: the maintainer's own look at rows 01, 05 and 07, and at the help and agent chips.
  [Plan](archive/60-chip-button-restyle.md) · [Detail](roadmap-details.md#make-the-preset-chips-look-more-like-chips).

- ★★ `[reply]` **Streamed answers arrive with the same scramble as the decode chips** — **VERIFY, built
  2026-09-24/25.** A Developer tab switch, *Scramble animation*, off by default, churns a live answer's
  newest letters through placeholder symbols before they settle, the way a suggestion chip does.
  [Plan 69](planning/69-streamed-answers-scramble.md), D119. Deck rows **SCR-04**, **SCR-06**, **SCR-08**
  and **DEV-01** pass. Owed: the look (**SCR-01**), reopening mid-answer (**SCR-05**), reduced motion
  (**SCR-07**), the game's frame rate (**SCR-03**). Full rows in [testing.md](testing.md).
- ★★ `[reply]` **The streamed answer's own redraws were costing most of the panel's frame rate** —
  **VERIFY, fixed 2026-09-25 (`bb8d7e5b`, `aae5add6`).** With no game running the panel drew about 19–24
  frames a second while an answer streamed; moving its text on a steady beat instead of every frame, and
  holding its glow still while text arrives, raised that to 56–58 with the scramble off, 44–50 with it on
  — the maintainer's own floor was 45. Evidence `docs/test-evidence/plan69-answer-frame-rate-2026-09-25.json`.
  Owed: the maintainer's own eye on the look, and a run with a game. Rows **SCR-09**, **SCR-10** in
  [testing.md](testing.md).

- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09. Rows **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01**
  (and **KIDS-LOCK-02** with a child account). Live CEF Stage 0 confirmation still owed. **KIDS-REGRESS-01
  re-confirmed on the Deck 2026-09-17:** no lock banner, all four Permissions switches on and reachable.
  Evidence `docs/test-evidence/plan57-QA-KIDS-REGRESS-01.json`.
- ★★★ `[reply]` **Soft reply-length cap and thinking budget** — **VERIFY.** Shipped 2026-08-10. **01, 02 and
  03 all pass**, confirmed on the Deck 2026-09-17: a long reply read with no seam, and stopping partway kept
  the partial text with a clear notice. **SOFT-PREDICT-05 passed 2026-09-18** with Thinking Off. Left:
  **SOFT-PREDICT-04**, **tried 2026-09-18, blocked** — the test question came back as a short spoiler-careful
  refusal, so no reply reached the length wall. **Tried again 2026-09-23, still unclear:** the finished text
  was clean, no half-drawn menu block and no stray JSON, but the reply stopped on its own at 1,117 tokens
  against a 2,112-token limit, so it never had to continue and the row's own join point never happened.
  [Detail](roadmap-details.md#soft-reply-length-cap-and-thinking-budget).
- ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab
  named** — **VERIFY, landed 2026-09-17.** Six equal cells with one icon each, only the current tab named;
  the strip is taller so the chat row's dots no longer show under it. **Deck run 2026-09-18:** rows 01, 02,
  04, 05 and 06 pass; 03 waits on the maintainer's own look; 07 failed and is filed as its own bug above.
  **The free-play sweep's streaming half closed 2026-09-23** (fourth try of the recorded walk); that same
  pass found a new, unrelated bug instead — two tall answer sections only 33% visible on landing — tracked
  on its own. [Detail](roadmap-details.md#the-open-tab-strip-redrawn-six-equal-cells-one-icon-family-only-the-current-tab-named) · [Tab icon](roadmap-details.md#replace-the-bonsai-tab-icon).
- ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30; the layout inverts to slot row,
  transcript, presets, Ask bar. Most rows pass on device. **As of 2026-09-18:** 05b passed (returning to a
  still-writing chat shows the question and partial text together); 05a's busy-indicator half, 06a and 06b
  failed (filed as its own bug above). **15d passed** and **06c passed on its fourth try** on the Deck
  2026-09-23 ("Reply ready" now shows within a second; fixed in `73be15f`); the runs are in the detail.
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02) · [More](roadmap-details.md#named-chat-slots).

---

## Knowledge base and RAG

Everything about the game notes and the search that feeds them, in one place, so you can open this file and pick up
where you left off. **Read first:** [the status report](planning/37-rag-status-report.md) — the zoomed-out picture, what
each next step buys a person, and rough costs. It is kept in step with this section. Architecture:
[knowledge-base.md](knowledge-base.md). The agreed answer-quality work: [plan 30](planning/30-kb-answer-quality-plan.md).

Same rules as the lists above: five lines an entry, stars ascending in each list, a fix moves to **Deck check owed** and
then to [Done](#done-for-v050) in the same commit. The one difference is that the knowledge base keeps its bugs, its owed
checks and its plans together here instead of spread over three lists.

**Where things stand (2026-09-18).** **372 notes over 35 games, plus 159 Deck tips.** Wave two
added 27 notes and 32 tips. **Of the 72 questions a player might plainly ask about the twelve games added this
month, 64 now have a note** — the other eight were written on purpose to have none, so every question that was
meant to have an answer has one. Ten more games' notes landed 2026-09-18 — the five Mario Party games, Donkey
Kong 64, Yoshi's Story, Diddy Kong Racing, Super Smash Bros. 1999 and Grand Theft Auto III: The Definitive
Edition — written by two helpers in their own words from wiki pages read that same day, with the page, licence
and day recorded on every note. The library was built as version 2026.09.18 with every note and tip indexed and
its publish check passing. **Published 2026-09-23:** both Hugging Face and the GitHub release now serve
2026.09.18, read back after publishing to confirm it. **Blind test-question coverage finished 2026-09-26,**
107 more added. [Detail](roadmap-details.md#blind-questions-done). **Three new games landed 2026-09-26** (plan
70, helpers F and G): Brotato, Palworld and Skyrim, plus starting-out notes for Cyberpunk, Fallout 4 and Red
Dead 2. [Detail](roadmap-details.md#three-new-games-and-their-notes). **The next release, 2026.09.26, is
built: 38 games, 414 notes, 164 Deck tips.** It passes the release check and its Deck check, and the
Deck's copy matches it byte for byte. **Published by the maintainer 2026-09-27**
([plan 70](archive/70-kb-wave-four-and-deck-test-wave.md)), replacing 2026.09.18 (372 notes, 35 games, 159 tips).

**Finding the right note.** On the held-back questions nobody tuned against (177 rows), the search puts the
right note in the top three **85.3 times in a hundred**. Every one of the 21 notes written in wave two is found
in the top three for its own question, and 12 come first. Across all 72 questions about the new games, **58
find their note in the top three where 38 did**. Two rows out of 413 got worse against 24 better. On the 21
newly labelled questions for the games added this session, the right note came first 16 times and landed in
the top three 20 times. This was measured 2026-09-18 on the floored search against the new, bigger library —
a new series, started because rows were added, so it does not compare with any older count.

**The answer the Deck's own model writes**, over 61 questions with the corrected checks: it keeps the note's facts
**76.6 times in a hundred**, never contradicts its note **94.4**, attaches a note whenever one is due **100**,
shows the branch menu when due **98.6**, and comes out clean on all three runs **60.7**.

**Do not compare those against any older figure in this project.** Two faults were found and fixed in wave three:
the check could mark a right answer wrong for using different words than it expected, and it could miss a reply
that flatly said the opposite of its own note. The search test had also been reading a copy of the library from
31 August for weeks. Every answer and search number quoted before wave three carries one of those faults. The full
before and after is in [wave three's report](archive/48-kb-wave-three-session.md).

**Getting to the troubleshooting tips is where the wave fell short.** The tips themselves are much better — crash went
from 2 to 9, sound 1 to 8, picture 1 to 8, performance 2 to 10, controller 6 to 10, and the top crash tip no longer
tells someone to check a desktop that game mode does not have. But of 24 fresh sentences written by someone who had not
seen the rules, **6 reached the tips before and 8 after**. The rules are still phrase-shaped: they catch the exact
wording someone imagined and miss the neighbour.

**Pick up here, in order.**

**Wave three ran on 2026-09-07** ([48](archive/48-kb-wave-three-session.md)), after wave two's own Deck
evening ran the same evening, once the Deck was free.

1. ~~**Finish the device evening.**~~ **Done 2026-09-15.** The two checks that had never run — the honesty
   line, and tips still attaching when one fits — both pass on the device. The speed check passes three
   times with its fix. The *No tip for this* line never had a question that made it appear, and was
   retired by the maintainer on 2026-09-27 (`db4b3b4a`).
2. ~~**Fix the speed check.**~~ **Done.** It now refuses to pass a reading taken without a reply first, and
   read 547, 23 and 28 thousandths of a second against a one-second budget on 2026-09-15. Read that with
   the range in mind — the number swings with what is loaded in memory.
3. **Decide how to finish follow-ups.** The search half works on the device — it looks up the right thing
   you were just asking about — but the answer can still be about something else. The wrong-boss bug that
   once hit one run in three is fixed and proven on the Deck (`e1bf3324`, see Done). The options for
   finishing it still need writing up.
4. **The one-second wait on every question is now explained.** The Deck can only hold one model in
   memory at a time, so the model that writes the answer and the model that searches the notes keep
   pushing each other out. A search right after an answer measured 732 thousandths of a second; with
   the limit raised to two, tried safely on a spare copy of the setting that never touched the
   maintainer's own, it dropped to 24. Measured 2026-09-12. Evidence
   `docs/test-evidence/plan48-R6-deck-model-eviction.json`.
5. **Which of those two settings the maintainer's Deck is actually running: answered 2026-09-23.** The two
   starting paths were made to agree (`fae4a53`). Read on the Deck from three places at once — the running
   Ollama process, the auto-start file, and the Ollama tab's own switch — all three now say "keep two
   models loaded," and `ollama ps` showed both the answering model and the note-search model loaded at
   every one of four reads across three questions, with no load or unload logged in between. Still open:
   the drift from August to September. **Whether two models cause trouble with a game running: measured
   2026-09-26**, safety check stays unbuilt. [Detail](roadmap-details.md#cost-to-a-running-game-second-sighting).
   Evidence `docs/test-evidence/plan64-FOLLOWUP-MEMORY-EVICTION.json`.
6. **58 phase 1: finished.** [The plan](archive/58-phase-1-notes-shown-and-wiki-extracts.md)
   shows the note's own words under a reply and reads a wiki's own sentences into notes with no AI
   rewrite; it is done and archived. What is still owed on the Deck is in "The note's own words under the
   reply" below.
7. **Then wave four, now plan 70** — writing more notes. 58 phase 2 was replaced 2026-09-25 by
   [plan 70](archive/70-kb-wave-four-and-deck-test-wave.md), which re-read § 1 against the code and took
   its answers as D112.

**Wave two's own evening ran 2026-09-07** and wave three ran the same day; the results and the bug write-ups are
in [wave two's report](archive/47-kb-wave-two-session.md) § 8 and [wave three's](archive/48-kb-wave-three-session.md).
The five optional August rows were not run, and New Vegas still is not installed.

**A library point release went out 2026-09-07** carrying the corrected Black Mesa water note and nothing else — 293
notes, 156 tips, 25 games, unchanged. Installed on the Deck and checked: asked about the flooded rooms, the reply now
says the current is constant, says not to try to time it, and points at the wall switch that cuts the power. The old
advice to wait for a gap is gone. Evidence `docs/test-evidence/plan48-R5-blackmesa-corrected-note.json`.

### Calls waiting on you

None right now.

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md); the knowledge-base
ones from this month are D81 to D88.

### Bugs

- ★ `[KB]` **A game's own tip is found only by its own words** — **OPEN, found 2026-09-26 (plan 70, flow
  L7).** "The words look blurry" misses the Render Scale tip that "the text looks blurry" finds.
  [Detail](roadmap-details.md#flow-l7-findings).
- ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **OPEN, found
  2026-09-26, not fixed.** `knowledge_base_service.py` line ~1121. [Detail](roadmap-details.md#speed-mode-tip-gap).
- ★ `[KB]` **The wiki reader cannot read Palworld's own wiki** — **OPEN, found 2026-09-26, not fixed.**
  `scripts/fetch_wiki_live_pages.py`'s page-render call is refused (HTTP 403); worked around by hand this
  time. A fallback to the plain page would cover it for good.
- ★ `[KB]` **With a game running, the meaning search once read about a second (1,070 ms, 2026-09-23)** — **OPEN, one
  sighting.** [Detail](roadmap-details.md#kb-transparency-matches-what-the-model-got).
- ★★ `[KB]` **A question about a different game uses the chat's own game's notes** — **OPEN, found 2026-09-28 (plan 74,
  Deck pass 1).** A Valheim question in a Half-Life 2 chat got Half-Life 2 notes ("using the chat's own game"), and a
  stutter question in a Hollow Knight chat did the same. Evidence `docs/test-evidence/plan74-P74-KB-LOG-LINE.json`.
- ★★ `[KB]` **Black Mesa's electrified-water question attaches two unrelated early-game notes instead of its
  own** — **OPEN, found 2026-09-19.** The right, specific answer comes back, but two generic early-game
  notes are named underneath it instead of the real one, which does exist and now attaches too, but still
  ranks behind them. **Measured 2026-09-26:** ranking general notes lower is not the fix — it stays off.
  [Detail](roadmap-details.md#black-mesas-electrified-water-question).
- ★★ `[KB]` **Four questions still get notes about the wrong subject** — **OPEN, three of the four now say
  so, found 2026-09-07.** Asking Black Mesa how to tame a horse, Portal 2 where to buy a house, and a
  nonexistent Hades boss all still attach a note; the floor added this wave cannot catch these without
  losing correct answers elsewhere. **Sighted again 2026-09-26 (plan 70, flow L1):** a Hades boss question
  still attaches the wrong area's note, twice. [Detail](roadmap-details.md#wrong-subject-notes).
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held
  back 2026-09-06, re-measured 2026-09-07 and still held (D52, D81).** With nothing running, all 24 fresh
  plainly-worded problem sentences now reach the search, but six measured examples still attach a tip about
  something else. **Cause:** the meaning search only runs when the plain word search finds nothing, which is
  almost never. The real fix is rewriting the tips, its own entry below. [Detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).
- ★★ `[KB]` **Unrelated questions still get game cards stapled on** — **ACCEPTED 2026-08-27.** With a game running, *"thank
  you very much"* still attaches a card. Raising the keyword floor costs real matches, and the model mostly ignores an
  irrelevant card. [Detail](roadmap-details.md#ordinary-phrases-attach-game-cards) · [Earlier wording](roadmap-details.md#unrelated-questions-still-get-game-cards-stapled-on-2026-09-02-wording).
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** Leaning the search toward meaning finds the right note first more often, but it buries a brand-new
  note whose meaning index is not built yet. **Not lifted until every note is guaranteed to have its index before
  it can be searched.** Two smaller objections are unanswered if this is ever revisited. Weights stay even for
  now. (D68, D82) [Detail](roadmap-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against).

### Deck check owed

- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY,
  landed 2026-09-15, four commits, unit-tested.** A game known only by name now opens its box, and naming the
  boss up front keeps the answer in plain text. **DRG-01b passed on the Deck 2026-09-23:** the boss tactics
  came back in plain text with no cover, as expected. **Still owed:** STRAT-SPOIL-NAME-01, blocked since its
  game cannot be launched. [Detail](roadmap-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions).
- ★★ `[KB]` **KB transparency matches what the model got** — **VERIFY, passed 2026-09-22,** once the
  answer-lines lane added the missing log line. Row **KB-TRANSPARENCY-01**. **All attached names confirmed
  on the Deck 2026-09-23**, both with nothing running and with Half-Life 2 running. **Still owed:** a case
  where a note is dropped for space — not yet reproduced despite trying. [Detail](roadmap-details.md#kb-transparency-matches-what-the-model-got).
- ★★ `[KB]` **The note's own words under the reply** — **VERIFY, third run 2026-09-19.** Header, open-scroll
  and live timing all pass; the upward walk lands cleanly on the block's header and the ladder walk holds up
  — the only stop still missing is the chip ladder inside the open block. Why the tip and
  one question in ten arrived late is now explained and fixed; a repeat check on the Deck 2026-09-19 showed
  no gap at all. Rows **NOTES-BLOCK-01**–**07**, **TEN-GAMES-01**, in [testing-manual.md](testing-manual.md).
### Next

- ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch already built.** The answer test's voice
  switch landed 6 September. What's still owed is one run with it turned on. Wave three planned that run
  ([48](archive/48-kb-wave-three-session.md) § 7), but its report has no voice results, so it never ran.
- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, one measurement owed.** The
  slice of questions the word search cannot answer at all was 3 rows when last counted, before 36 more blind rows landed.
  Re-count it on the next search run before calling this closed. No code needed — the search test already reports that
  slice; it only needs a run (plan 70). [Detail](roadmap-details.md#eval-fixture-cannot-see-a-recall-failure).
- ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the 139 prose cards as labelled short
  lines, the shape the 16 structured cards use. Facts kept is already 92%, so the ceiling is low; do it only if the answer
  test shows the labelled shape scores better. Two to three days of content plus a rebuild.
- ★★★ `[KB]` **Deeper answer checks** — **OPEN, added 2026-09-05.** The answer test checks facts, contradictions, fences and
  the menu, and cannot see whether a reply was helpful or whether the model admitted not knowing. Add a small set of
  questions no card can answer, scored for an honest "I don't know", and a read by a person of ten replies a month.
  **Sighting 2026-09-26:** an answer turned a plain tip ("raise Render Scale") into advice that contradicts itself.
  [Detail](roadmap-details.md#flow-l7-findings).
- ★★★ `[KB]` **KB visual maps** — **OPEN.** Two shapes you named 2026-08-29: a dungeon map, and a boss outline with weak
  points marked. Nothing draws anything in a reply today. A dungeon map has to be authored, which sits behind the source
  policy and a corpus rebuild. Research first. The maintainer raised dungeon maps again 2026-09-07 as a wave-four idea.
  [Detail](roadmap-details.md#kb-visual-maps).
- ★★★ `[KB]` **Spoiler coverage as a tiered setting** — **OPEN, tiers confirmed 2026-09-01.** Strict fences bosses, endings
  and chapters; default fences only named story beats and endings; open fences nothing you asked about. Naming a boss still
  unlocks it in every tier. Needs the settings plumbing, a prompt per tier measured on the answer test, a control with a
  focus entry, and Deck QA. About three days. (D50) [Detail](roadmap-details.md#spoiler-coverage-should-be-a-setting-with-tiers) · [Fencing](roadmap-details.md#user-adjustable-spoiler-fencing-absorbed-into-the-tiered-setting).
- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.**
  Measured 2026-09-07: nine of ten ordinary problem sentences ("my game keeps crashing", "my game won't
  launch") reach nothing at all, since the word "crash" alone is deliberately too weak to route a question.
  **Related work landed 2026-09-26:** the tip cut-off and a false-positive word match are now fixed, and the
  "no tip for this" line was retired by the maintainer 2026-09-27 (`db4b3b4a`). (D81, D85) [Detail](roadmap-details.md#a-troubleshooting-question-mostly-never-reaches-the-tips).
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get cards; today they get nothing specific. New card kinds and a spoiler table update, Left 4
  Dead 2 first, then Counter-Strike 2, from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md)
  [Detail](roadmap-details.md#kb-online--versus-strategy-content-and-rag-phase-5).
- ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **OPEN, added
  2026-09-25.** Never measured: no test question attaches a picture, and the notes are searched by the typed words only.
  First a scored set of real Deck screenshots (game, area, boss), run on each picture model the Deck offers; then fixes
  where it fails — the picture's guess fed into the search, notes that say what a place or boss looks like, and a screen
  guide per game (health bar, weapon slots, boss bar). [Detail](roadmap-details.md#measure-how-well-the-ai-reads-a-screenshot).
- ★★★★ `[KB]` **RAG Phase 4: extended retrieval** — **PARTIAL.** Tracks 1 and 2 shipped 2026-08-19 to
  2026-09-05 (D67); track 3, a running game's own Deck tip, is done and passed on the Deck 2026-09-26 (see
  Done). The chip labels fit on 2026-09-26. Left: that day the promise that at least one of the game's own
  chips always shows with the one-chip setting on failed (`docs/test-evidence/plan70-L6-PHASE4-CHIPS-01.json`).
  [Detail](roadmap-details.md#rag-phase-4-extended-retrieval).
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** 133 → 161 cards since 2026-08-29. **Counted
  2026-09-25:** only four of the original titles still have no enemy or item cards — Baldur's Gate 3, GTA San Andreas,
  The Sims 4 and Portal 2 — not eleven of thirteen as this entry used to say. Next: 40–60 entity cards in tranches with
  a quality read from you after the first; then chip ranking by meaning. Card authors cannot write blind test questions,
  so content and eval rows go in separate sessions. [Plan](planning/28-phase5-corpus-depth.md).
- ★★★★ `[KB]` **RAG Phase 7: retrieval infrastructure** — **OPEN.** Mostly nothing at 161 cards. What still
  matters: a thumbs-down that stops a wrong card coming back (three days), add-on packs before any large
  catalog (five days or more), a screenshot feeding the search. **The thumbs-down drawn 2026-09-26** (plan
  70, helper T): [three options, drawn true size](https://claude.ai/artifact/K2MXtVYoEYV6cNxsAzUh43).
  **Design C chosen by the maintainer 2026-09-27 (D112):** "Not really" opens the reason chips, and a
  "which note?" row only when two or three notes were used. Not built; ready for a feature session. [knowledge-base.md](knowledge-base.md) § Phase 7. [Detail](roadmap-details.md#rag-phase-7-community-tip-contribution-rag-phase-8).
- ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed card with
  one press: **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days.
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's
  games real notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice.
  Months of work — needs a wiki-ingestion pipeline, licensing, a size budget, packs and an index. **As of
  2026-09-18:** the source study is done, the first ten games are written from cleared wiki sources, the
  library is at 38 games (since 2026-09-26), and landing them reopened the no-new-games lock (D111). [Detail](roadmap-details.md#rag-phase-8-catalog-corpus).

---

## Shelved

Parked on purpose, not dropped. One line each, with what unshelves it; the full entries are in
[archive/roadmap-shelved.md](archive/roadmap-shelved.md).

- ★ `[platform]` **In-IDE preview never gets past its loading screen** — shelved 2026-09-11 (D93), not a gate
  for anything. Unshelves when the preview loads the plugin on the maintainer's machine.
- ★★ `[ui]` **Glance view: the answer alone, in big text** — shelved 2026-09-12: too much UI change, and not
  ready for it yet. Unshelves on the maintainer's word; the mockup is kept.
- ★★★ `[KB]` **KB download Cancel, the Deck check** — shelved 2026-09-19 (D113). The download finishes in
  about a second, too fast to press Cancel in. Unshelves when a throttle or a slower test copy exists.
- ★★★ `[voice]` **Voices for the bundled characters** — shelved 2026-09-08 (D74). Unshelves after the
  character sweep, a legal check and the open licence call.
- ★★★ `[voice]` **Trained voices for the bundled characters** — shelved with the clip route 2026-09-08 (D74).
  Same legal gate, plus the plugin hosting voice files for the first time.
- ★★★★ `[voice]` **A voice for a custom character** — shelved with the bundled voices 2026-09-08 (D74). Same
  legal gate.
- ★★★★★ `[platform]` **Global quick-launch macro** — shelved 2026-09-19 (D113), the maintainer said drop it.
  Never run on hardware. Unshelves on the maintainer's word.

---

<a id="done-for-v050"></a>

## Done for v0.5.0

Everything shipped since v0.4.9 (2026-07-08), one line each — moved out to its own file to keep this one small,
copied line for line, nothing reworded: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).

Newest first. Everything closed from 2026-09-16 onward was moved into that file on 2026-09-21, copied
line for line, nothing reworded, to keep this document under its size limit.

Plan 64's flow G block, and the first two entries of its flow H block, were moved out the same way on
2026-09-24 during plan 65's bookkeeping pass, oldest of the remaining Done entries first, again to keep
this document under its size limit.

The rest of plan 64's flow H block was moved out the same way on 2026-09-24, during the planning-folder
review, again to keep this document under its size limit.

The chat-summary feature (plan 68, all three Deck passes), the CHAT-MEMORY-01 re-check (plan 68 Deck
pass, 2026-09-25) and the plan 65 trim-and-split entries were moved out the same way on 2026-09-26,
during the twelfth bookkeeping pass, again to keep this document under its size limit.

**Closed 2026-09-28 (plan 75, the Sonnet 5.5 trial):**

- ★ `[ollama]` **The try-order picker lists the note-search model as a choice** — **DONE 2026-09-28 (plan 75, `a877a321`,
  `2cd68796`), passed on the Deck.** The picker lists only models that can answer, and an older saved order holding the
  note-search model is cleaned on Done. Evidence `docs/test-evidence/t75-land-L1-PICKER-ANSWER-MODELS.json`,
  `docs/test-evidence/t75-land-L2-OLD-ORDER-CLEANED.json`. [Full entry](archive/roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-28-plan-75-the-sonnet-55-trial).
- ★★ `[voice]` **Two things wanting the voice server at once would cut the first one off mid-sentence** — **DONE 2026-09-28
  (plan 75, `8ec3426a`, `54643d2f`), by unit test.** Nothing a person can do today reaches the two-caller case (the mic is the
  only caller), so it rests on the unit tests in `tests/test_voice_whisper_daemon.py`; the mic's own check passed on the Deck,
  `docs/test-evidence/t75-land-L3-MIC-STARTS-AND-STOPS.json`. [Full entry](archive/roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-28-plan-75-the-sonnet-55-trial).

**Plan 74, release wave two (2026-09-28): 20 items closed** — fixes from the second release wave, proven in two
Deck passes (three by unit test or on the PC). One line each, with its evidence, in
[archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md); the full entries in
[archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md).

**Release clean-up, first pass (2026-09-28): 8 items closed, 3 retired** — entries the code and the Deck had already
settled. One line each, with its evidence, in [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md); the full
entries in [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md) and [archive/roadmap-completed.md](archive/roadmap-completed.md).

**Plan 72 (2026-09-27): 27 items closed** — the release bug session's Deck blocks, in two docs passes. One line each, with its
evidence, in [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md); the full entries in
[archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md) and [archive/roadmap-completed.md](archive/roadmap-completed.md).

**Closed 2026-09-26 (docs clean-up):**

- ★★ `[docs]` **Some long-notes blocks and testing rows didn't match what was found** — **DONE
  2026-09-26, docs only.** [Full detail](archive/roadmap-bugs-fixed.md#some-long-notes-blocks-and-testing-rows-dont-match-what-was-found-closed-2026-09-26).

**Plan 70 (2026-09-26 to 2026-09-27): 41 items closed** — the knowledge-base wave four and the Deck test wave,
flows L1 to L7 and the helpers' landings. Each one, word for word, with its evidence: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md); the long notes in
[roadmap-details.md](roadmap-details.md); the plan's own record in
[archive/70-kb-wave-four-and-deck-test-wave.md](archive/70-kb-wave-four-and-deck-test-wave.md) § 11.
