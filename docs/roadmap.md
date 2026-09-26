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
6. **Tags:** `[ask]` Ask bar and input · `[chat]` chat slots · `[chips]` preset chips · `[focus]` D-pad and focus ring ·
   `[KB]` knowledge base · `[layout]` Main tab layout and vertical space · `[ollama]` models and routing · `[perms]` permissions ·
   `[platform]` build, deploy, tooling, upstream · `[QA]` testing · `[reply]` the answer itself · `[tabs]` the tab bar ·
   `[ui]` everything else on screen · `[voice]` voice.
7. **Parked work lives in [Shelved](#shelved)**, not in Bugs or Features: one line saying what unshelves it, with the
   full entry in [archive/roadmap-shelved.md](archive/roadmap-shelved.md). Move the whole block back when it restarts.

**Every Main-tab UI change also owes the free-play sweep** (standing row **QA-FREE-PLAY-01** in
[testing-manual.md](testing-manual.md)): walk the pane like a user and require every focused stop to also be visible.

**Maintainer note (2026-09-05): pick the model before you pick up an item.** ★–★★ Sonnet 5 high · ★★★–★★★★
Opus xhigh plans, Sonnet lanes implement when the cause is known · ★★★★★+ Fable max plans only, Sonnet lanes build,
Opus xhigh lands · `[focus]` `[layout]` `[ui]` measure on the Deck first, then Opus xhigh, never a lane without the
measurement · docs and bookkeeping Sonnet or Opus medium. The full policy — the bookkeeper guard, the escalation rule,
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
- ★ `[focus]` **Walking down a reply and walking back up visit different stops** — **OPEN, sighted three
  more times.** Row **REPLY-STOPS-MIRROR-01**. [Detail](roadmap-details.md#flow-2b-bugs).
- ★ `[focus]` **In carousel style, Down can land on a chip slid mostly off screen** — **OPEN, sighting
  only — 3 measured re-tries did not reproduce it.** [Detail](roadmap-details.md#flow-2b-bugs).
- ★ `[layout]` **The decode chip's typing caret is pale, not the accent green** — **OPEN, FAILED
  2026-09-26.** Row **PRESET-STREAM-ANIM-01**. [Detail](roadmap-details.md#flow-2b-bugs).
- ★ `[focus]` **D-pad Left on the chat row leaves the plugin for Steam's side rail** — **OPEN, measured
  2026-09-26.** [Detail](roadmap-details.md#flow-2b-bugs).
- ★ `[focus]` **Three more one-off focus sightings from free play, 2026-09-26.**
  [Detail](roadmap-details.md#flow-2b-bugs).
- ★ `[reply]` **Older answers lose their "Was this helpful?" row after switching chats, leaving just the
  speaker icon** — **OPEN, seen twice now (2026-09-26).** [Detail](roadmap-details.md#l3-and-2d-findings).
- ★ `[reply]` `[focus]` **Two more sightings, 2026-09-26, not reproduced on purpose yet:** the chip ladder
  only lets Up leave one chip at a time; two confidently wrong answers.
  [Detail](roadmap-details.md#l3-and-2d-findings).
- ★ `[focus]` `[layout]` **Entering the Show details chip ladder at its first chip leaves the chip row and
  its "Chip 1 of 7" counter above the visible area** — **OPEN, found on the Deck 2026-09-23.** Measured only
  67% of the chip row visible at chip 1, 67% at chip 5, and 33% at chip 7 — at chip 1 a person cannot see
  which chip is lit. Evidence `docs/test-evidence/plan64-DETAILS-LADDER-01.json` (+ `.png`).
- ★ `[focus]` `[layout]` **Show details' chip ladder hides under the question box** — **OPEN, found on the
  Deck 2026-09-23.** Walking Down through the ladder, the ringed chip read 33% to 67% visible at several
  steps, covered by the question box or by the chip row itself; a person can only reach the row of chips by
  stepping through all six or seven of them rather than landing straight on one that is fully in view. The
  maintainer's proposed cure is the new Features entry **"While reading an answer, the Show details line
  takes the suggestion chip's place above the question box"**, above. Evidence
  `docs/test-evidence/plan64-DETAILS-LADDER-01-try2.json`.
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
- ★ `[tabs]` `[layout]` **The dots under the chat name don't line up: the active dot looks a hair above or
  below the rest** — **OPEN, the maintainer's call 2026-09-26: keep the dots, make them line up exactly.**
  Every dot has the same box, so the offset is in the painted pixels (about 1.28 screen pixels per page
  pixel). Measure each dot's lit-pixel centre in full-size screenshots, every state, both screens; also the
  0.2px gap to the chat name. Plan 72 must-fix. Screenshot `docs/test-evidence/plan64-BYEYE-01-chat-row.png`.
- ★ `[ollama]` **A model pulled from the first-tick download picker never joins the saved try order** —
  **OPEN, split off 2026-09-23.** Ticking the first tickable model in a fresh download picker now correctly
  only queues it instead of starting the download right away (fixed, see Done); once it finishes downloading,
  though, it still does not join the saved order used to pick which model answers a question. The fix for
  that half lives in the back end and has not been built.
- ★ `[focus]` **After pressing "Apply UI scale" on the Settings tab, nothing holds the D-pad ring** — **OPEN,
  found on the Deck 2026-09-23.** The button takes the press, but nothing after it takes the ring: the next
  press only brings the ring back into view rather than moving anywhere, so a shoulder press right after does
  not switch tabs the way it should. Evidence `docs/test-evidence/plan64-UI-SIZE-01.json`.
- ★ `[ollama]` **Remove greys out once a model has answered a question, until the plugin reloads** —
  **VERIFY, fixed 2026-09-26 (plan 70, helper I).** Remove now only greys out while a request is actually
  in flight, instead of staying disabled forever after a model's first answer. Evidence
  `docs/test-evidence/plan64-PRELOAD-01-try3-timing.json`. **Deck check owed:** row **PRELOAD-RM-01** in
  [testing.md](testing.md).
- ★ `[ollama]` **A plugin reload stops a model download in progress** — **OPEN, found on the Deck
  2026-09-23 (flow H).** Reloading the plugin mid-download killed the pull at 16%; asking again picked up
  from the same partial file rather than starting over, so nothing was lost, but a running download does
  not survive a reload. Evidence `docs/test-evidence/plan64-ROUTING-MERGE-01-top-try2.json`.
- ★ `[ollama]` **The plugin log writes one false "non-loopback" connection failure right at start-up** —
  **VERIFY, fixed 2026-09-26 (plan 70, helper I).** The Ollama tab's first connection check ran before
  settings finished loading, using the still-default, often-wrong host. It now waits for settings first.
  Evidence `docs/test-evidence/plan64-OLLAMA-TAB-AFTER-RELOAD.json`. **Deck check owed:** row
  **OLLAMA-TAB-AFTER-RELOAD-02** in [testing.md](testing.md).
- ★ `[platform]` **The Steam ban lookup's report shows as raw text, not a table** — **VERIFY, fixed
  2026-09-26 (plan 70, helper I).** The ban report was built as a markdown table the Deck's renderer
  cannot draw, so it showed as one line of pipe characters; each account's facts are now one plain bullet
  line instead. Evidence `docs/test-evidence/plan64-VAC-03-06.json`. **Could not run on the Deck 2026-09-26
  (plan 70, flow L1):** no Steam Web API key is saved, and the runbook forbids setting one by hand. **Deck
  check owed, on the maintainer's own list (their key needed):** row **VAC-03-07** in
  [testing-manual.md](testing-manual.md).
- ★ `[focus]` **The Session tab's Clear did nothing when pressed, on one chat** — **OPEN, found by the
  maintainer by hand on the Deck 2026-09-23 (build `a224fb6`), after the Deck work ended.** The maintainer
  does not remember whether they pressed A or tapped the touchscreen, and thinks it may be because that
  chat had only one turn. **Reproduction plan, to try all four combinations:** on a one-turn chat's Session
  tab, press Clear with A, and separately by tap; try each once right after opening the Clear confirm box,
  and again after switching to that chat from another one. Needs a Deck walk with the focus recorder before
  any fix — the session thinks this is the same family as the tab-bar ghost below. **Retired 2026-09-25
  (plan 68):** the Clear button this reproduction plan presses is gone, replaced by "Sum up this chat," so
  this exact repro can no longer be run. The button was replaced, not fixed.
- ★ `[focus]` **Once, the Show details line did nothing when pressed** — **VERIFY, likely cause found and
  fixed 2026-09-26 (helper F2, commit `bb36e334`).** Opening the details now scrolls them clear of the
  dock, once per opening. **Deck re-check owed:** the same setup — a press that used to look like nothing
  happened. [Detail](roadmap-details.md#flow-4-findings).
- ★ `[focus]` **After pressing thumbs up on a reply, nothing holds the D-pad ring** — **VERIFY, fixed
  2026-09-26 (helper F2, commit `34bd9315`).** The ring now moves to the speaker icon in the same row
  once the thumbs are replaced. **Deck re-check owed.** [Detail](roadmap-details.md#flow-4-findings).
- ★ `[focus]` **After pressing Stop mid-answer, the ring lands on the Voice input button, one press from
  turning the microphone on** — **OPEN, found on the Deck 2026-09-26, row STOP-PARTIAL-01.**
- ★ `[ui]` **The voice mic button's ring is cut off at the panel's right edge** — **OPEN, found by the
  plan 65 Deck check 2026-09-24.**
- ★ `[layout]` **The preset chip sits too far above the question box** — **OPEN, from the maintainer
  2026-09-26.** The gap between the chip and the question box should equal the gap between the question
  box and the Ask button. Measure both gaps on the Deck first, at every UI size. Plan 72 must-fix.
- ★ `[layout]` **The question bubble has too much empty space on the left, and uneven line edges** —
  **OPEN, from the maintainer 2026-09-26.** Right-aligned text leaves every line's left edge ragged, and a
  wrapped question stretches the bubble to its widest. **The maintainer picked option D 2026-09-26:** keep
  right-aligned text, split it into lines of about equal length, shrink the bubble to its longest line, 3px
  from Retry. [Drawing](https://claude.ai/artifact/6TGmioi2KdtWM8yKC4cYkF). Plan 72 must-fix.
- ★ `[ui]` **The "Not helpful" reason chips sit almost one to a row** — **OPEN, from the maintainer
  2026-09-26.** Under "What went wrong?", Bad information, Misidentified game/problem, Unfenced spoiler,
  Too long and Too short mostly each take a whole row. Make the chips tighter and closer together so
  they share rows. Measure each chip's width and padding on the Deck first. Option: shorter labels
  ("Wrong game or topic", "Showed a spoiler"), drawn beside spacing-only for the maintainer to pick. Plan 72.
- ★ `[ui]` **The chat name's scroll doesn't match the chip scroll** — **OPEN, from the maintainer
  2026-09-26.** A long chat name should scroll at the same speed and with the same pauses as a long chip
  label; then slow both slightly so the panel feels less busy. Plan 72 must-fix.
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** —
  **OPEN, back from Verify 2026-09-23: failed by hand, found by the maintainer (build `a224fb6`), after the
  Deck work ended.** After Show details → Session, both tab bars stayed drawn at once — the small "MAIN" bar
  and the big icon bar under it. Touch scrolling did not close the big one; the first D-pad move did.
  Recording `recordings/DeckRecord_20260923_235526_game.mkv` (11 seconds, every frame shows both bars) —
  this recording lives only on the maintainer's own computer; the recordings folder is not saved with the
  project. Row **TAB-BAR-GHOST-01**. The session's guess, shared with the two bugs above: closing a Decky
  popup rebuilds the plugin, and the highlight lands on the top bar, which then opens — each of these three
  needs a Deck walk with the focus recorder before any fix.
- ★★ `[chat]` **A chat that is still writing does not look busy from another chat** — **OPEN, found
  2026-09-18, seen three times, stays open — the maintainer's call.** Switch away from a chat that is
  still writing and nothing says so; the code looks right on paper. Two clean measured sessions since
  (2026-09-23 and 2026-09-26, 3 more tries) did not reproduce it, which is not enough to close a bug seen
  three times before. **New, unclear, the maintainer's call:** the other chat's own Ask button read
  greyed while the first was still writing, not "ready" as the row expects — which reading is actually
  right is open.
  [Detail](roadmap-details.md#a-chat-that-is-still-writing-does-not-look-busy-from-another-chat).
- ★★ `[chat]` **Clearing a session while an answer is still being written may lose that answer** —
  **OPEN — found by reading the code (plan 68), not yet seen on the Deck.** Clear resets the waiting state
  first, so the step that runs when the answer stops then skips saving it, since that state no longer says a
  question is waiting. Deck check owed.
- ★★ `[chat]` **Deleting a chat whose file is already missing leaves its row in the list** —
  **OPEN — found by reading the code (plan 68), not yet seen on the Deck.** Deck check owed.
- ★★ `[focus]` **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a
  blanket rule was tried and reverted in favour of Steam's native outline.
- ★★ `[ollama]` **Stop unloads the answer model on purpose, so the next question starts cold** — **OPEN,
  found on the Deck 2026-09-26, row STOP-PARTIAL-01. The maintainer's call 2026-09-26: Stop must not unload
  the model.** Close the connection instead; the next question should start warm. Plan 72 must-fix.
- ★★ `[ollama]` `[focus]` **A tap outside the AI models screen started the queued downloads and left the
  D-pad stuck in the Ollama tab** — **OPEN, reported 2026-09-16, not reproduced.** The maintainer thinks a
  tap landed outside the screen instead of on Done; the queued models then started downloading and the
  D-pad could not move in the Ollama tab, as if the screen were still open. Read in the code but not proven
  on the device. Needs a reproduction with an empty download queue.
  [Detail](roadmap-details.md#a-tap-outside-the-ai-models-screen-started-the-queued-downloads-and-left-the-d-pad-stuck-in-the-ollama-tab).
- ★★ `[voice]` **Two things wanting the voice server at once would cut the first one off mid-sentence** — **OPEN,
  found while explaining the code 2026-09-14.** The speech-to-text server is shared, and it is started for one particular
  speech model. If a second caller asks for it with a different model, it restarts to suit the second, and the first is
  never told — it simply finds the server gone. Only one thing uses it today, so nothing is broken now. It becomes real
  the moment a second listener is added, a wake word for example.
- ★★ `[docs]` **Some long-notes blocks and testing rows don't match what was found** — **OPEN, found by
  plan 65 2026-09-24, a maintainer read, not a helper's.** 23 long-notes blocks could not be matched to
  a finished roadmap entry (list in plan 65 §12). In the testing rows: KB-ROUTER-01 and STREAM-FOLLOW-01
  read Open but say they moved to Done, HUB-EDGE-01 reads Verified for a screen that no longer exists,
  and five more rows carry "owed" in their own status.
- ★★ `[focus]` **Up under an answer skips whole rows of controls** — **OPEN, found by the plan 65 Deck
  check 2026-09-24.** With details open, Up from "Save chat to Desktop" jumps past the chip ladder and
  the tabs row straight to the notes block, 3 of 3 tries. With details closed, Up from there skips the
  choice buttons too. The chip ladder can also shrink small enough to leave its own ring above the
  visible area, with the panel half blank.
- ★ `[ollama]` **"Reset to defaults" in the try-order picker saves an explicit list where there used to be
  none** — **OPEN, found 2026-09-26.** The setting started out empty; Reset to defaults, then Done, now
  writes an explicit list instead. Same order shown, a paper difference today. Evidence
  `docs/test-evidence/plan70-ROUTING-01-02.json`.
- ★★ `[platform]` **The commit hook rebuilds the shared checkout, not the copy it runs in** — **OPEN,
  found by plan 65 2026-09-24 (another session was already looking at it).** Its path is set to the
  shared checkout, so a copy's own generated files go stale and its full checks fail one step.
  Workaround: commit with `git -c core.hooksPath=.githooks commit`. **Cause:** the shared setting points
  hooks at the main checkout's path, where setup uses a relative one; a separate cloud session ("Fix
  pre-commit hook analyzing wrong worktree") is working on it.
- ★★ `[platform]` **The saved Deck-walk replay can never compare across builds, so it checks nothing
  after a deploy** — **VERIFY, fixed in the Deck tools project (commit `556ffcb`, 2026-09-23), proven on
  the Deck 2026-09-26.** Every saved walk was recorded against an older build, so 0 walks compared that
  night. The check's own fingerprint of a build includes Python cache files, which change on every run.
  Replaying across builds now works. **Still owed:** re-saving the walks (flow 6).
  [Detail](roadmap-details.md#saved-deck-walk-replay-across-builds).
- ★★ `[ask]` **The chat summary reads oddly in places** — **OPEN, found 2026-09-25 (plan 68).** Examples
  from the Deck pass: "Game: Parrying practice", "Player is stuck on: None apparent in this log". Needs
  another desk test on real chats.
- ★★ `[focus]` **Three D-pad slips seen in the plan 68 Deck pass, may predate it** — **OPEN, found
  2026-09-25.** With older turns open: Up from the chip row skips the newest answer and lands on an older
  answer's Show details; B on "Hide details" moves the ring to the tab strip and leaves the details open;
  Up from a chat's first question skips the chat row and lands on the tab strip.
- ★★ `[reply]` **The live thinking line shows the model's own rule checklist while it works** — **OPEN,
  found from the maintainer's own screenshot 2026-09-26.** Lines like "Direct and concise? Yes" show while
  a reply is written — the model checking its own rules out loud, re-sent and re-checked every question.
  Noise to a person, and Deck time for no benefit they see. Screenshot
  `docs/test-evidence/plan70-THINKING-CHECKLIST.png`. **Same family, seen twice more 2026-09-26 (flows L3
  and L4):** single inline backtick marks quoting a tag or note title in 3 of 6 tries; separately, the raw
  "Thinking Process" heading the model writes for itself shows live from the second question on.
  [Detail](roadmap-details.md#the-live-thinking-line-shows-the-models-own-rule-checklist).
- ★★★ `[focus]` **The panel can get into a state where pressing Down stops half way and the Ask button is
  out of reach** — **OPEN, found 2026-09-05, stays open — the maintainer's call.** Only a full loader
  restart clears it, not just reopening the panel. Comes and goes: clean, trap-free runs on 2026-09-19,
  2026-09-23 and again 2026-09-26 (3 tries) have not been enough to close a fault sighted as recently as
  2026-09-26 (flows 1+2a, L3+2d — a related shape, ring landing on the question box mid-stream).
  [Detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
- ★★★ `[layout]` **The chat summary card appears behind the dock until Down is pressed** — **OPEN, found
  2026-09-25 (plan 68).** Deck check owed.
  [Detail](roadmap-details.md#the-chat-summary-card-appears-behind-the-dock-until-down-is-pressed).
- ★★★ `[reply]` **The suggestion menu under an answer can name a protected boss in plain view** —
  **VERIFY, fixed 2026-09-26 (helper A, `7c93d5e8`).** A third leak in the same family as the two above.
  **Deck re-check owed:** row **NO-CLOSE-MATCH-HK-02** re-check.
  [Detail](roadmap-details.md#spoiler-leak-family).
- ★★★ `[reply]` **Some saved answers have a hidden block's markers written twice, cause unknown** — **OPEN,
  found 2026-09-25 (plan 68).** The chat memory now copes with the doubling (`6843f8e1`), but why it happens
  has not been found. Deck check owed.
  [Detail](roadmap-details.md#some-saved-answers-have-a-hidden-blocks-markers-written-twice-cause-unknown).

---


## Features

**Standing goal from the maintainer (2026-08-30):** buy back as much vertical room for the chat bubbles as possible; every
`[layout]` entry serves it. Items rated ★★★★★ or above carry a placeholder link to [bonsAI Issues](https://github.com/qd313/bonsAI/issues) in the archive;
replace it with a specific issue when one exists.

- ★ `[reply]` **A reply can quote one of its own steering instructions back to the player** — **OPEN,
  the maintainer's call 2026-09-26: soften it.** Not a spoiler leak — the plugin's own prompt deliberately
  tells the model to open Strategy answers this way (`strategy_spoiler_policy.py` ~line 287); it reads like
  machine text. Plan 72 must-fix. Evidence `docs/test-evidence/plan70-FOLLOWUP-BOSS-01.json`.
- ★★ `[KB]` **Show details' own sources credit line still names a protected boss** — **OPEN, the
  maintainer's call 2026-09-26: hide it like the notes block.** The protected note's tag reads "Boss note
  (spoiler)" until the answer's cover or the notes block is opened, then the real name; no new button.
  Drawing: [Show Details Credit Line](https://claude.ai/artifact/K4u5dy7hNZ7cLKsh4fhWTW). Plan 72 must-fix.
  [Detail](roadmap-details.md#spoiler-leak-family).
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
- ★★ `[chat]` **Save chat becomes an icon in the chat tab, and the "+" gets a clearer icon** — **OPEN,
  from the maintainer 2026-09-26.** "Save chat to Desktop" moves from its own row under the answer to a
  save icon in the chat tab; the "+" (new chat) gets a clearer, more obvious icon. Draw the options at
  true size first, which also settles exactly where the icon sits. Plan 72, for 0.6.0.
- ★★ `[chat]` **Summing up offers a fresher title** — **OPEN, asked for by the maintainer 2026-09-25.** Each
  *Sum up this chat* also hands the AI the chat's current title; when the AI judges it stale, the person is
  offered its suggestion and chooses to rename or keep. [Detail](roadmap-details.md#summing-up-offers-a-fresher-title).
- ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.** The create position is the
  literal `[+]`, re-confirmed on board 8f and again in the v3 rows. Reopen that decision before building it.
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
  night. [Detail](roadmap-details.md#cost-to-a-running-game-second-sighting).
- ★★★ `[perms]` **Say where a download goes before it starts, and an Internet permission to gate it** —
  **OPEN, from the maintainer 2026-09-26, wanted before 0.6.0.** Install/update Ollama, model downloads,
  voice models and the knowledge library each show a clear notice first ("bonsAI will connect to
  https://… to download …"), at least the first time per site. A new permission, off by default, gates
  every download and the automatic model-list refresh. Plan 71 § 3, Stage B.
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
  a later plan of its own. [Detail](archive/roadmap-completed.md#the-chat-sums-itself-up-instead-of-being-cleared).
- ★★★★ `[ollama]` **LAN custom model pull** — **OPEN.** Blocked until a mechanism is chosen (R1 to R4). Depends on **Custom model in
  the Pull Models picker**.
- ★★★★ `[perms]` **Web permission** — **OPEN, discovery locked.** Opt-in live web answers; offline Ask and local KB when off. Kids
  lock forces it off. [Discovery](planning/web-permission-discovery.md).
- ★★★★ `[platform]` **Llama.cpp provider spike** — **OPEN, research only.** Go or no-go against Deck-local Ollama. Prior:
  [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md).
- ★★★★ `[platform]` **Steam Input layout parse** — **OPEN.** Parse controller VDF configs for control context. Not in scope: writing
  configs.
- ★★★★ `[QA]` `[platform]` **Finish the controller test rig** — **PRIORITY 1 (maintainer, 2026-09-24). PARTIAL: built and
  driving every Deck session since 2026-08-26.** Was ★★★★★ with "board ordered, next: S1 to S3", a month stale. Left from
  [plan 19](planning/19-controller-macro-test-rig.md): a recording that is also a live view (S3), the highlight checked from the
  video (S4), handheld runs over Bluetooth, and the nightly unattended run (P4), which needed the saved-walk replay bug
  fixed first — **now works, proven 2026-09-26** (see the bug entry above). Comes before stand-in Decks. Plan 70 takes
  two of the four pieces: the replay working again, and a first slice of the nightly run. **The nightly run's
  first slice is built 2026-09-26** (plan 70, helper N); its first real overnight run is still owed, in flow 6.
  Row **OVERNIGHT-RUN-01** in [testing.md](testing.md). [Program](planning/21-ai-owned-testing-program.md).
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
  quarter's models in [41-deck-model-survey.md](planning/41-deck-model-survey.md); the calls are D72.
- ★★★★★ `[perms]` **VAC Phase 2: opponent IDs** — **OPEN, research.** Surface live opponent identities for ban checks when metadata allows.
- ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN.** AI copy tuned to gen-2 hardware.
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

### Checks whose evidence never existed
- ★★ `[QA]` **Twelve checks read as proven with nothing behind them** — **VERIFY, found 2026-09-13 during the
  clean-up.** Twelve checks name a saved Deck recording as their proof. None of those recordings exists, and the project's whole
  history shows none ever did — they were never written, not lost. So twelve results were written down as passing on the
  strength of a file nobody can open, and whether they really passed is unknown. Nothing here says the plugin is broken; it says
  we do not know. Re-run all twelve together in the next automated testing session. Batch **QA-EVIDENCE-GAP-01**, listed with
  each row in [testing.md](testing.md). Until a run produces real evidence, treat all twelve as unknown rather than as a pass.
  **All twelve now have real evidence behind them.** The knowledge-base update button check, the 12
  September follow-up-memory re-run, model eviction on the Deck, and the wave-three Deck evening all
  closed earlier. **The last one, the spoiler-reveal reachability check, passed on the Deck 2026-09-26**
  (plan 70, flow L1): with a covered answer on screen, the cover took the ring one D-pad press at a time,
  stayed fully visible, and A opened it. Evidence `docs/test-evidence/plan70-SPOILER-REVEAL-reach.json`.
  The table in [testing.md](testing.md#qa-evidence-gap-01--twelve-checks-whose-evidence-was-never-saved)
  already says this row by row.

### Bugs that need verification
- ★ `[focus]` **After Dismiss on the troubleshooting hint, nothing holds the D-pad ring** — **VERIFY, fixed
  2026-09-26 (helper F2, commit `6116f33c`).** The ring now moves to the row below (the ban-lookup row,
  else "Save chat to Desktop", else the chips) the same way the Helpful fix already works. **Deck re-check
  owed:** press A on Dismiss and confirm the next press lands on that row, not nowhere.
  [Detail](roadmap-details.md#l3-and-2d-findings).
- ★★ `[reply]` **Picking a branch menu choice shows the model's own internal tag instead of plain words** —
  **VERIFY, fixed 2026-09-26 (helper K, commit `2e13421d`).** The waiting line and Show details now show the
  friendly "I'm at: …" wording; the model still gets the full internal text behind the scenes. Row
  **KB-FOLLOWUP-QUOTE-02**. [Detail](roadmap-details.md#l3-and-2d-findings).
- ★ `[focus]` **The Session tab's Clear box opens with the ring on Clear, and cancelling it throws the ring
  out of the panel** — **VERIFY, fixed in `e163d8c`.** The confirm box used to open with the ring on the
  destructive Clear button rather than Cancel, and cancelling threw the ring out to the tab bar with the
  whole details panel closed. **Could not run on the Deck 2026-09-23:** Claude Code's own permission check
  refused the walk to the Clear button before any press was sent, so nothing was tried (0 "clear" lines in
  the log — confirms nothing was cleared either). Evidence
  `docs/test-evidence/plan64-SESSION-CLEAR-BOX-01.json`. **Checked by hand by the maintainer on the Deck
  2026-09-23 (build `a224fb6`), after the Deck work ended: the "where you land" half still fails.** After
  Clear then Cancel, the plugin came back "not in the same spot, back at the top," instead of staying on the
  Session tab with the ring on Clear. Whether the box itself still opens on Cancel rather than Clear is
  unconfirmed either way. Not fixed for this half yet. **Retired 2026-09-25 (plan 68):** the Clear button
  itself is gone, replaced by "Sum up this chat," so this box and its "where you land" bug can no longer be
  reproduced as written. The button was replaced, not fixed.
- ★ `[chips]` `[KB]` **A suggestion chip pulled from the game's notes shows no Tip mark** (row
  **CHIP-BUTTON-09**) — **VERIFY, fixed in `895cf0a`.** Two copies of the same markup had drifted apart; there
  is now one piece of code drawing both badges. Owed: with a covered game running and the knowledge base on,
  set the chip animation to the scrambling one and confirm the dot shows.
  [Detail](roadmap-details.md#a-suggestion-chip-pulled-from-the-games-notes-shows-no-tip-mark).
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
  on its own. [Detail](roadmap-details.md#the-open-tab-strip-redrawn-six-equal-cells-one-icon-family-only-the-current-tab-named).
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
Dead 2. The library is now **38 games, 414 notes**. [Detail](roadmap-details.md#three-new-games-and-their-notes).

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
   times with its fix. The one row still blocked is the *No tip for this* line, because no question yet
   found reaches the tip sheet and comes back empty, so there is nothing for it to fire on.
2. ~~**Fix the speed check.**~~ **Done.** It now refuses to pass a reading taken without a reply first, and
   read 547, 23 and 28 thousandths of a second against a one-second budget on 2026-09-15. Read that with
   the range in mind — the number swings with what is loaded in memory.
3. **Decide how to finish follow-ups.** The search half works on the device — it looks up the right thing
   you were just asking about — but the answer can still be about something else, and one run in three still
   names the wrong boss (its own bug below). The options for finishing it still need writing up.
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
6. **Then 58 phase 1** — two fixes before wave four. [The plan](archive/58-phase-1-notes-shown-and-wiki-extracts.md)
   shows the note's own words under a reply instead of the model's rewrite of it, and reads a wiki's own
   sentences into notes with no AI rewrite, tried first against Hollow Knight and then on ten more games from
   sources already cleared. Nothing started; waiting on the maintainer's nine answers (locking as D111) and
   the word "go". Started 2026-09-17: the drawings, the blind questions and the source study have landed; the
   reader is still being built; the Deck is asleep, so the device readings wait on the maintainer.
   **Update 2026-09-19:** the upward walk and the ladder walk both now pass on the Deck, and the
   reason the block sometimes arrived late is found, fixed on the branch, and confirmed passing on
   the Deck too; what is left is the read-aloud row and the maintainer's publish call; phase 2 can
   start.
7. **Then wave four, now plan 70** — writing more notes. 58 phase 2 was replaced 2026-09-25 by
   [plan 70](planning/70-kb-wave-four-and-deck-test-wave.md), which re-read § 1 against the code and took
   its answers as D112.

**Wave two's own evening ran 2026-09-07** and wave three ran the same day; the results and the bug write-ups are
in [wave two's report](archive/47-kb-wave-two-session.md) § 8 and [wave three's](archive/48-kb-wave-three-session.md).
The five optional August rows were not run, and New Vegas still is not installed.

**A library point release went out 2026-09-07** carrying the corrected Black Mesa water note and nothing else — 293
notes, 156 tips, 25 games, unchanged. Installed on the Deck and checked: asked about the flooded rooms, the reply now
says the current is constant, says not to try to time it, and points at the wall switch that cuts the power. The old
advice to wait for a gap is gone. Evidence `docs/test-evidence/plan48-R5-blackmesa-corrected-note.json`.

### Calls waiting on you

- **58 phase 1, nine questions** ([§ 8](archive/58-phase-1-notes-shown-and-wiki-extracts.md)): answered
  2026-09-17 and locked as D111. Two things are still open: the block's look waits on lane A's drawings,
  and trim-only for wiki notes stands unless the maintainer overturns it.
- **58 phase 2, seven questions:** answered 2026-09-25 as D112, for
  [plan 70](planning/70-kb-wave-four-and-deck-test-wave.md), which replaces 58 phase 2.

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md); the knowledge-base
ones from this month are D81 to D88.

### Bugs

- ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **OPEN, found
  2026-09-26, not fixed.** `knowledge_base_service.py` line ~946. [Detail](roadmap-details.md#speed-mode-tip-gap).
- ★★ `[KB]` **The spoiler-risk band reads "med" on every answer, and the named entity can be the wrong
  thing** — **VERIFY, both gaps closed 2026-09-26 (helper M, `679452e5`, `7b2bc753`).** A game's own name
  is now cut from the question before matching; a routed-to-tips turn now reads as troubleshooting even
  off the word list. Deck re-check owed. [Detail](roadmap-details.md#spoiler-risk-band-fixes).
- ★ `[KB]` **The wiki reader cannot read Palworld's own wiki** — **OPEN, found 2026-09-26, not fixed.**
  `scripts/fetch_wiki_live_pages.py`'s page-render call is refused (HTTP 403); worked around by hand this
  time. A fallback to the plain page would cover it for good.
- ★★ `[KB]` **The "no close match" line reads wrong next to a note the reply used** — **VERIFY, fixed
  2026-09-26 (plan 70, helper B, commit `58f60c0a`).** **Cause found 2026-09-25:** when a question names
  the game but describes a boss without naming it, the check behind this line compared the question's
  leftover words against the attached notes' titles only — "the boss past the crystal spike area" shares
  no word with "Broken Vessel", so the real match was thrown away and the line appeared anyway. The check
  now also reads each attached note's own text, where the matching word usually lives, plus a small
  tolerance for plurals. **Now wired into real answers (commit `e4c24bdd`).** **Deck check owed:** row
  **KB-NOCLOSE-TEXT-01** in [testing.md](testing.md).
  [Detail](roadmap-details.md#the-no-close-match-line-reads-wrong-next-to-a-note-the-reply-used).
- ★★ `[KB]` **Unrelated questions still get game cards stapled on** — **ACCEPTED 2026-08-27.** With a game running, *"thank
  you very much"* still attaches a card. Raising the keyword floor costs real matches, and the model mostly ignores an
  irrelevant card. [Detail](roadmap-details.md#ordinary-phrases-attach-game-cards).
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held
  back 2026-09-06, re-measured 2026-09-07 and still held (D52, D81).** With nothing running, all 24 fresh
  plainly-worded problem sentences now reach the search, against 8 before — but what comes back is often
  wrong, six measured examples attaching a tip about something else entirely. **The cause:** the meaning
  search only runs when the plain word search finds nothing, which is almost never, so a poor match wins
  first. The real fix is rewriting the tips, filed as its own entry below. [Detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).
- ★★★ `[KB]` **Searching the notes by meaning costs about a second, every time, on the Deck** — **ACCEPTED
  2026-09-06.** Repeated on the Deck: 1.10, 1.23 and 1.19 seconds across three questions in a row, the same
  band as first measured — the maintainer said that is fine next to an answer that then takes tens of
  seconds to write. **The cause is now measured:** the two models pushing each other out of memory, which
  reads as cheap to fix; the acceptance stands until the maintainer says otherwise. (D84) [Detail](roadmap-details.md#searching-the-notes-by-meaning-costs-about-a-second-every-time-on-the-deck).
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** The weight sweep ran: leaning the search toward meaning gets the right note first about four to six
  points more often, but it also buries a brand-new note whose meaning index has not been built yet, which the current
  weights deliberately protect against. **Not lifted until every note is guaranteed to have its index before it can be
  searched.** Two other objections — a strong exact word match losing to a weaker meaning match, and a locked routing
  rule no longer holding — are not covered by that rule and still need answering if this is ever revisited. Weights
  stay even for now. (D68, D82) [Detail](roadmap-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against).

- ★★ `[KB]` **The "No tip for this" line has no question that can make it appear** — **OPEN, numbers in
  2026-09-26.** Waiting on the maintainer (D112). [Detail](roadmap-details.md#no-tip-line-numbers).
- ★★ `[KB]` **Four questions still get notes about the wrong subject** — **OPEN, three of the four now say
  so, found 2026-09-07.** Asking Black Mesa how to tame a horse, Portal 2 where to buy a house, and a
  nonexistent Hades boss all still attach a note; the floor added this wave cannot catch these without
  losing correct answers elsewhere. Three of the four now carry the "no close match" line, but the wrong
  note is still attached. **Found again 2026-09-18 and 2026-09-26 (plan 70, flow L1):** a Hades boss
  question attaches the wrong area's note. **Wrong-subject half, borderline, known fragile (checked
  2026-09-26):** the Black Mesa control's own "no close match" line came out missing once, not a
  regression — its score landed at 0.6508 against a 0.65 cut-off. No code change.
  [Detail](roadmap-details.md#wrong-subject-notes).
- ★★ `[KB]` **Black Mesa's electrified-water question attaches two unrelated early-game notes instead of its
  own** — **OPEN, found 2026-09-19.** The right, specific answer comes back, but two generic early-game
  notes are named underneath it instead of the real electrified-water note, which does exist in the
  library and now attaches too, but still ranks behind the generic ones. **Measured 2026-09-26 (plan 70,
  helper B): ranking a "Starting out" note lower is not this wave's fix** — it helped the search test but
  hurt the answer test, so it stays off, and would not have cured this bug alone anyway (a second generic
  note still ranks ahead). [Detail](roadmap-details.md#black-mesas-electrified-water-question).

### Deck check owed

- ★ `[KB]` **A shared troubleshooting tip that has a source page never gets it shown** — **VERIFY, fixed
  in code 2026-09-23 (commit `4ce37bcf`, moved in `c6f0c94d`); the roadmap had not caught up.** Owed: one
  Deck check that a shared tip with a source page shows that page in its credit line. Planned in plan 70.
- ★ `[KB]` **Five checks from the August retrieval rework were never run on the Deck** — **VERIFY, or
  retire.** Covers the corpus format gate, the relevance floor, follow-ups, transparency, and the
  Developer kill-switch. **Update 2026-09-22:** four of the five now have real answers — the transparency
  check joined them that night, once the log finally named the attached notes (see the row below). Only
  the corpus-format check still cannot run, since that means replacing the library it tests. **Per D116
  #7, the corpus-format check is retired, covered by its own unit tests.** The other four are not all
  clean passes yet — **the follow-up check passed in full on the Deck 2026-09-23** (Megaera's note came
  first for both the parent question and its follow-up); the relevance floor is still half passed — its
  on-topic half is a real pass, its off-topic half is waiting on the maintainer to retire or reword it
  against an earlier accepted decision. This entry stays open until that half is settled.
  [Detail](roadmap-details.md#five-checks-from-the-august-retrieval-rework-were-never-run-on-the-deck).
- ★★ `[KB]` **KB transparency matches what the model got** — **VERIFY, passed 2026-09-22,** once the
  answer-lines lane added the missing log line. Row **KB-TRANSPARENCY-01**. **All attached names confirmed
  on the Deck 2026-09-23**, both with nothing running and with Half-Life 2 running. **Still owed:** a case
  where a note is dropped for space — not yet reproduced despite trying. [Detail](roadmap-details.md#kb-transparency-matches-what-the-model-got).
- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY,
  landed 2026-09-15, four commits, unit-tested.** A game known only by name now opens its box, and naming the
  boss up front keeps the answer in plain text. **STRAT-SPOIL-TEXT-01 and STRAT-SPOIL-FIRST-01 passed on the
  Deck**; two Hades rows failed on the name-withheld-boss bug above. **Still owed as of 2026-09-19:**
  STRAT-SPOIL-NAME-01 and DRG-01b, both blocked because their games keep falling off the Recent Games list.
  **DRG-01b passed on the Deck 2026-09-23:** with Deep Rock Galactic: Survivor running, the knowledge base
  off, masking on and no consent phrase, the boss tactics came back in plain text — no cover, no notes
  block, no knowledge-base search in the log, and no question-box trap on the way to Ask. STRAT-SPOIL-NAME-01
  is still blocked. Evidence `docs/test-evidence/plan64-DRG-01b.json`.
  [Detail](roadmap-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions).
- ★★ `[KB]` **The note's own words under the reply** — **VERIFY, third run 2026-09-19.** Header, open-scroll
  and live timing all pass; the upward walk lands cleanly on the block's header and the ladder walk holds up
  — the only stop still missing is the chip ladder inside the open block, its own bug above. Why the tip and
  one question in ten arrived late is now explained and fixed; a repeat check on the Deck 2026-09-19 showed
  no gap at all. Rows **NOTES-BLOCK-01**–**07**, **TEN-GAMES-01**, in [testing-manual.md](testing-manual.md).
### Next

- ★★★ `[KB]` `[reply]` **Check that a spoiler cover actually happened, instead of trusting the model to add
  one** — **VERIFY, same safety net as the ★★★ bug "a name-withheld boss question comes back with no
  spoiler box" above, fixed the same way, Deck re-check owed.** Same result, full detail there.
  [Detail](roadmap-details.md#check-that-a-spoiler-cover-actually-happened).
- ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch already built.** The answer test's voice
  switch landed 6 September. What's still owed is one run with it turned on, which wave three's main measurement
  run includes — planned as wave three ([48](archive/48-kb-wave-three-session.md)). Planned in plan 70.
- ★★ `[KB]` **Eval tooling: the weight sweep, per-question results for what ships, a second right answer** — **OPEN,
  agreed 2026-09-01, sweep go-ahead 2026-09-05.** Nothing a user sees. The sweep runs on the tuning questions and decides
  the blend-weights bug above; the rest stops every card batch reading as a regression when two cards are both fair
  answers. No row uses the second-answer option yet. One to two days. (D51, D68)
- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, one measurement owed.** The
  slice of questions the word search cannot answer at all was 3 rows when last counted, before 36 more blind rows landed.
  Re-count it on the next search run before calling this closed. No code needed — the search test already reports that
  slice; it only needs a run (plan 70). [Detail](roadmap-details.md#eval-fixture-cannot-see-a-recall-failure).
- ★★ `[KB]` **Pull the embedding model as part of installing the library** — **VERIFY, built 2026-09-26
  (plan 70, helper D).** A person who never pressed the pull button silently got word search only, the
  weaker half. Now, right after a fresh install finishes with that model still missing, a confirm box
  offers to download it once; Update never asks again. **Deck check owed:** row **KB-NOMIC-OFFER-01** in
  [testing.md](testing.md), flow R.
- ★★ `[KB]` **A latency budget for a game question** — **OPEN, added 2026-09-05.** The slowdown above was only caught because
  one QA row happened to record a band. Write down the budget (embed time plus first token with a game running) so the next
  regression fails a check instead of relying on luck. Planned as wave three ([48](archive/48-kb-wave-three-session.md)).
- ★★ `[KB]` **A measured context-window experiment** — **OPEN, research, added 2026-09-05, re-measured 2026-09-06.** The
  Deck's model runs with a 4,096-token window and a Strategy question with cards already goes over it (now trimmed
  instead of dropped, see Done). Try 8,192 as a Developer experiment with a game running, recording memory and time to
  first token, before it becomes a setting. Agreed as "later, its own call". (D46)
- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.** Filed as
  "the tips don't use the words people type", which is true and is the smaller half. Measured 2026-09-07: **nine of ten
  ordinary problem sentences reach nothing at all** — *"my game keeps crashing"*, *"my game won't launch"*, *"black
  screen when I start the game"*. The word "crash" is deliberately classed as too weak to route a question on its own;
  that holds with a game running and not with nothing running. Next step: a floor under the tip search so it can say
  none fit, plus a "no tip for this" line. (D81, D85) Planned as wave three ([48](archive/48-kb-wave-three-session.md)).
- ★★★ `[KB]` **Spoiler coverage as a tiered setting** — **OPEN, tiers confirmed 2026-09-01.** Strict fences bosses, endings
  and chapters; default fences only named story beats and endings; open fences nothing you asked about. Naming a boss still
  unlocks it in every tier. Needs the settings plumbing, a prompt per tier measured on the answer test, a control with a
  focus entry, and Deck QA. About three days. (D50) [Detail](roadmap-details.md#spoiler-coverage-should-be-a-setting-with-tiers).
- ★★★ `[KB]` **"Starting out" cards get their own kind** — **VERIFY, built 2026-09-26 (plan 70, helper E).** A new
  player now gets a *"How do I get started in <game>?"* chip, and "where do I start" reaches that game's own
  note. All 28 starting-out notes now carry the new kind. **Deck check owed:** row **STARTING-OUT-01** in
  [testing.md](testing.md), flow R. [Detail](roadmap-details.md#the-corpus-has-no-starting-out-card).
- ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the 139 prose cards as labelled short
  lines, the shape the 16 structured cards use. Facts kept is already 92%, so the ceiling is low; do it only if the answer
  test shows the labelled shape scores better. Two to three days of content plus a rebuild.
- ★★★ `[KB]` **Deeper answer checks** — **OPEN, added 2026-09-05.** The answer test checks facts, contradictions, fences and
  the menu, and cannot see whether a reply was helpful or whether the model admitted not knowing. Add a small set of
  questions no card can answer, scored for an honest "I don't know", and a read by a person of ten replies a month.
- ★★★ `[KB]` **The next corpus release carries everything that needs a rebuild** — **VERIFY, built 2026-09-26 (plan
  70, helper E).** Format bumped 3 → 4 for the per-game tip column; every installed library goes stale until it
  downloads the new one. A library too new for this plugin now refuses before downloading, with a plain
  message; an older plugin degrades gracefully instead of crashing. **Deck check owed:** row
  **KB-FORMAT-REFUSE-01** in [testing.md](testing.md), flow R.
  [Detail](roadmap-details.md#library-format-bump-and-per-game-deck-tips).
- ★★★ `[KB]` **KB visual maps** — **OPEN.** Two shapes you named 2026-08-29: a dungeon map, and a boss outline with weak
  points marked. Nothing draws anything in a reply today. A dungeon map has to be authored, which sits behind the source
  policy and a corpus rebuild. Research first. [Detail](roadmap-details.md#kb-visual-maps).
- `[KB]` **Idea for wave four: dungeon maps** — raised by the maintainer 2026-09-07, no stars and no plan yet. Picks up
  the dungeon-map half of the visual-maps idea above when the time comes.
- ★★★★ `[KB]` **RAG Phase 4: extended retrieval** — **PARTIAL, per-game Deck tips built 2026-09-26 (plan 70, helper
  E).** The chip guarantee and 16 structured cards shipped 2026-08-19; the split was accepted 2026-08-21 and prose
  replies were accepted 2026-09-05 (D67). A troubleshooting tip can now belong to one game and joins the search
  pool ahead of an equally-good shared tip; five tips ship this way, two of them labelled "Researched,
  unconfirmed" since nobody has checked them on real hardware yet. Left: the chip clipping check,
  which waits on the preset-row work. **Deck check owed:** row **KB-TIP-PERGAME-01** in [testing.md](testing.md),
  flow R. [Detail](roadmap-details.md#rag-phase-4-extended-retrieval),
  [new tips](roadmap-details.md#library-format-bump-and-per-game-deck-tips).
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** 133 → 161 cards since 2026-08-29. **Counted
  2026-09-25:** only four of the original titles still have no enemy or item cards — Baldur's Gate 3, GTA San Andreas,
  The Sims 4 and Portal 2 — not eleven of thirteen as this entry used to say. Next: 40–60 entity cards in tranches with
  a quality read from you after the first; then chip ranking by meaning. Card authors cannot write blind test questions,
  so content and eval rows go in separate sessions. [Plan](planning/28-phase5-corpus-depth.md).
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get cards; today they get nothing specific. New card kinds and a spoiler table update, Left 4
  Dead 2 first, then Counter-Strike 2, from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md).
- ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **OPEN, added
  2026-09-25.** Never measured: no test question attaches a picture, and the notes are searched by the typed words only.
  First a scored set of real Deck screenshots (game, area, boss), run on each picture model the Deck offers; then fixes
  where it fails — the picture's guess fed into the search, notes that say what a place or boss looks like, and a screen
  guide per game (health bar, weapon slots, boss bar). [Detail](roadmap-details.md#measure-how-well-the-ai-reads-a-screenshot).
- ★★★★ `[KB]` **RAG Phase 7: retrieval infrastructure** — **OPEN.** Mostly nothing at 161 cards. What still matters: a
  thumbs-down that stops a wrong card coming back (three days), add-on packs before any large catalog (five days or more),
  a screenshot feeding the search (a short test to find out first). A nearest-neighbour index buys nothing until the corpus
  is thousands of cards. The embedding-model pull is its own entry above. The thumbs-down that stops a wrong note coming
  back is drawn 2026-09-26 (plan 70, helper T) — [three options, drawn true size](https://claude.ai/artifact/K2MXtVYoEYV6cNxsAzUh43),
  helper recommends C. Not built (D112 #8); the maintainer picks. [knowledge-base.md](knowledge-base.md) § Phase 7.
- ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed card with
  one press: **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days.
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's
  games real notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice.
  Months of work — needs a wiki-ingestion pipeline, licensing, a size budget, packs and an index. **As of
  2026-09-18:** the source study is done, the first ten games are written from cleared wiki sources, the
  library is at 35 games, and landing them reopened the no-new-games lock (D111). [Detail](roadmap-details.md#rag-phase-8-catalog-corpus).

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
during the twelfth bookkeeping pass, again to keep this document under its size limit. Today's plan 70
entries below stayed, so the maintainer can still see them this week.

**Closed 2026-09-26 (plan 70, flow L1, missed in the earlier bookkeeping pass):**

- ★ `[KB]` **"What time is it" can still get a troubleshooting tip** — **DONE, fixed 2026-09-26, passed
  on the Deck 2026-09-26.** [Detail](roadmap-details.md#tip-cut-off-fix).

**Closed 2026-09-26 (plan 70, flow L2, second Deck pass):**

- ★★ `[KB]` `[ollama]` **The note-search model is only held in memory for 5 minutes, not the 4 hours the
  answer model gets** — **DONE, fixed 2026-09-26 (`409de9f6`), passed on the Deck 2026-09-26.** Evidence
  `docs/test-evidence/plan70-L1-8-HELPER-M.json`.
- ★★★ `[KB]` **A follow-up still names the wrong boss one run in three** — **DONE, fixed 2026-09-26 (plan
  70, helper K, commit `e1bf3324`), passed on the Deck 2026-09-26, row reworded to "stays on the right
  boss."** [Detail](roadmap-details.md#a-follow-up-still-names-the-wrong-boss-one-run-in-three).
- ★★ `[ollama]` **Attaching a screenshot crashed the model once** — **DONE, fixed 2026-09-26 (helper J),
  passed on the Deck 2026-09-26.** [Detail](roadmap-details.md#attaching-a-screenshot-crashed-the-model-once).

**Closed 2026-09-26 (plan 70, flow L3, third Deck pass):**

- ★★ `[ollama]` `[focus]` **The AI models screen, and "Manage AI models" itself, can open with the ring
  already sitting on a filter** — **DONE, fixed 2026-09-26 (helper I, `3ac00226`), passed on the Deck
  2026-09-26.** Row **RING-ON-FILTER-2c2**. [Detail](roadmap-details.md#filters-panel-focus-bugs).
- ★★ `[ollama]` `[focus]` **With the AI models screen's Filters panel open, the D-pad cannot reach Done or
  the model list below it** — **DONE, fixed 2026-09-26 (helper I, `6355eb9a`), passed on the Deck
  2026-09-26.** Row **HUB-EDGE-02**. [Detail](roadmap-details.md#filters-panel-focus-bugs).
- ★ `[ollama]` **The remove box and the models list undercount a big model's size** — **DONE, fixed
  2026-09-26 (helper I, `86a148a7`), passed on the Deck 2026-09-26.** Row **ROUTING-MERGE-SIZE-02**.
  [Detail](roadmap-details.md#model-size-fix-and-re-check).
- ★ `[perms]` **The ban lookup's "turned off" message names the switch the way the screen does** —
  **DONE, fixed in `ec6f87ab` on 2026-09-23, passed on the Deck 2026-09-26.** Row **VAC-06**: the reply
  named "Permissions → Steam ban lookup", the same words as the switch's own label. Evidence
  `docs/test-evidence/plan70-VAC-06.json`.

**Closed 2026-09-26 (plan 70, flow L4, fourth Deck pass):**

- ★ `[focus]` **The ring is dropped again when an answer finishes** — **DONE, fixed 2026-09-26 (helper F2,
  `f87a962c`), passed on the Deck 2026-09-26.** Row **QA-FREE-PLAY-01** re-check.
  [Detail](roadmap-details.md#flow-2b-bugs).
- ★ `[chips]` **A preset chip loses the ring when its question changes underneath it** — **DONE, fixed
  2026-09-26 (helper F2, `42d6eb48`), passed on the Deck 2026-09-26, fade and static.** Row
  **PRESET-ONE-LINE-03** re-check. [Detail](roadmap-details.md#flow-2b-bugs).
- ★★ `[reply]` **From the third question on, the waiting line quotes the follow-up reminder, not the
  question** — **DONE, fixed 2026-09-26 (helper K, `5fe0800a`), passed on the Deck 2026-09-26.** Row
  **KB-FOLLOWUP-QUOTE-01**. [Detail](roadmap-details.md#flow-2b-bugs).

**Closed 2026-09-26 (plan 70, flow L5, fifth Deck pass):**

- ★★★ `[reply]` **A name-withheld boss question on a story-protected game comes back with no spoiler box**
  — **DONE, closed 2026-09-26, passed on the Deck across all four rounds of its own fix.** Row
  **SPOILER-COVER-01**: two watched answers named the boss; across 229 reads the name never once showed
  outside a cover, in the answer, the thinking, the notes block or the suggestion menu; a cover read
  "Spoiler — tap to show" from its very first appearance; Copy and Read aloud both kept the name out; a
  question naming the boss outright still answered in plain text, as it should. The whole four-round
  story — the safety net, two earlier live-leak fixes, and the screen's own reveal finally catching up —
  is in the detail. [Detail](roadmap-details.md#spoiler-leak-family).
- ★★ `[reply]` **The model's own thinking can name a protected boss in plain words** — **DONE, fixed
  2026-09-26 (helper A, `4b975316`), passed on the Deck 2026-09-26 (name rule, flow L3; missed in an
  earlier bookkeeping pass).** Row **THINKING-SPOILER-01**. [Detail](roadmap-details.md#spoiler-leak-family).
- ★ `[focus]` **Troubleshooting hint's Dismiss unreachable by D-pad** — **DONE, fixed 2026-09-26 (helper
  F2, `59d3d1c0`), passed on the Deck 2026-09-26.** Row **PERMS-CLEAN-06**.
  [Detail](roadmap-details.md#l3-and-2d-findings).
- ★ `[platform]` **A screen test that opens the Filters panel failed once under load, passed alone** —
  **DONE, cause found and fixed 2026-09-26 (helper F2, commit `647dca4c`).** A real race: the ring's move
  into the newly opened panel was scheduled for the next frame and assumed the panel was already drawn;
  never seen on the Deck itself. [Detail](roadmap-details.md#l3-and-2d-findings).
- ★★ `[reply]` **Token streaming reveals text in bursts while a game is running** — **DONE, fixed
  2026-09-24 (`341841d3`), passed on the Deck 2026-09-26 with Deep Rock Galactic: Survivor running.** No
  pause over a second and a half, and the biggest jump was 103 characters. Row **STREAM-11**.
  [Detail](roadmap-details.md#token-streaming-reveals-text-in-chunks-while-a-game-is-running).
- ★ `[reply]` **The branch menu still copies its own template, now with the game's name filled in** —
  **DONE, fixed 2026-09-25, passed on the Deck 2026-09-26 with Deep Rock Galactic: Survivor running.** Five
  branch menus in a row read as real choices, no brackets, no leftover wording. Row **BRANCH-TEMPLATE-02**.
  [Detail](roadmap-details.md#branch-menu-template-leak).

**Closed 2026-09-26 (plan 70, helper C's landing):**

- ★ `[KB]` **A network troubleshooting tip could fire on ordinary words starting with "lan"** — **DONE,
  fixed 2026-09-26.** [Detail](roadmap-details.md#lan-word-boundary-fix).

**Closed 2026-09-26 (plan 70, helper I's landing):**

- ★ `[platform]` **A read-aloud timing test fails now and then when the PC is busy** — **DONE, fixed
  2026-09-26.** Failed 1 run in 11 under load, 0 in 12 idle; read-aloud itself was never broken, only the
  test's own way of proving the read-ahead overlap (comparing two threads' timestamps against a fixed
  slack, which could flip under load). Rewritten to hold both threads open on real events the test
  controls and wait on those instead of guessing a delay — proven by running it 20 times with heavy CPU
  load alongside it: 20 passes, 0 failures. Nothing on screen to check.
