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


- ★ `[ask]` **The blinking cursor in the question box does not line up with the placeholder text** — **OPEN,
  reported by the maintainer 2026-09-15 evening, a recurring sight.** The cursor sits a few pixels up and a
  little to the left of the greyed "Describe the level, boss, or puzzle you're stuck on." **Measured on the
  Deck the same evening:** the placeholder is drawn in its own layer at a 10-pixel font with a 12-pixel line;
  the real text field underneath, whose caret is the cursor a person sees, uses a 12-pixel font with a
  14.4-pixel line — about 2 pixels taller — so the two can never line up while they are two different font
  sizes. Evidence `docs/test-evidence/plan55-BUG-cursor-placeholder-offset.json`. **Confirmed on the
  Deck 2026-09-17:** the placeholder is still drawn in a smaller, tilted font than the text you type, 2
  to 3 pixels off from it. Evidence `docs/test-evidence/plan57-QA-cursor-placeholder-offset.json`.
- ★ `[chips]` `[KB]` **A suggestion chip pulled from the game's notes shows no Tip mark** — **OPEN, found
  2026-09-18 on the Deck with Half-Life 2 running.** The knowledge base was on, and the suggestion chip
  showed real tips straight from the game's own notes — but the small coloured dot that is supposed to mark
  a chip as coming from the notes never appeared, so a person looking at the chip has no way to tell it is
  a real tip and not a guess. The dot is only meant to light up when a chip is marked as coming from the
  notes; these chips did carry real note content but arrived without that mark, or lost it on the way to
  the chip, so the two checks that decide "is this a note chip" and "should the dot show" are not agreeing
  with each other. Row **CHIP-BUTTON-09**. Evidence `docs/test-evidence/plan61-CHIP-BUTTON-09.json` and its
  two screenshots.
- ★ `[focus]` **Up from the Retry icon does not return to the answer** — **OPEN, read again 2026-09-16.**
  With the thumbs-up/thumbs-down row greyed on a stopped reply, Down from the answer now lands on Retry — but
  Up from Retry does not go back to the answer's last section the way it should. **Read again 2026-09-16:**
  the lane building the D-pad fixes nearby read this code and judged it stale rather than change anything, so
  no fix landed. It stays open and awaits a device re-check to say whether it still happens. **Confirmed on
  the Deck 2026-09-17:** on a stopped reply, Up from Retry skips past the kept answer and jumps straight to
  the earlier-turns pill instead. Evidence `docs/test-evidence/plan57-QA-up-from-retry.json`.
- ★ `[focus]` **Down does not move the ring off an unrevealed spoiler block** — **OPEN, found 2026-09-04, did not reproduce
  2026-09-05.** With the ring on the hidden block, Down reported the press arriving and nothing moving. Retried today on a fresh
  Red Dead ending reply with a real hidden block on screen: **Down left it normally**, straight onto the branch picker's first
  button, and every stop on the walk was fully visible. So the hidden state does not trap on its own. Most likely the same
  underlying fault as the stuck panel below — both are a hop that dies only sometimes — and best closed with it rather than
  chased separately. Evidence `docs/test-evidence/round35-spoiler-block-down-and-up.json`. **Next thing to try
  (2026-09-18):** the panel-trap entry below now has a known trigger, opening and closing Steam's own on-screen
  keyboard on the question box — worth trying on this hidden-block case too.
- ★ `[focus]` **The Open Permissions jump lands one toggle above the one it was asked for** — **OPEN,
  measured 2026-09-16 on build 0fbecb6.** The Open Permissions button under a blocked reply is a real
  D-pad stop now and A on it does reach the Permissions tab, but the highlight lands on "Save files to
  Desktop", one row above the "Steam ban lookup" toggle it was supposed to land on. Evidence
  `docs/test-evidence/plan56-PERM-JUMP-01-open-permissions.json` (the jump itself),
  `docs/test-evidence/plan56-SMOKE-C-01-toggle-off.json`, `docs/test-evidence/plan56-SMOKE-C-02-toggle-back-on.json`
  (the setup and restore steps around it). **The *Back to …* return half passed 2026-09-16:** pressing it on
  the Permissions tab returns to the Main tab with the highlight back on the Open Permissions button that
  started the jump. Evidence `docs/test-evidence/plan56-PERM-JUMP-01-back-to-main.json`,
  `docs/test-evidence/plan56-PERM-JUMP-01.summary.json`. **Seen again 2026-09-16** on the Steam-settings card:
  pressing A on a row there also opens the right Steam page with the highlight one toggle above the row that
  was pressed, the same shape. Evidence `docs/test-evidence/plan56-SETTINGS-CARD-DPAD-01.summary.json`.
  **Confirmed on the Deck 2026-09-17, worse than what this entry describes:** pressing Open Permissions now
  opens the Permissions tab at the very top, on the Back to Main button, nowhere near the toggle it should
  land on; Back to Main itself still works. Evidence `docs/test-evidence/plan57-QA-PERM-JUMP-01.json`.
- ★ `[focus]` **With Show details open, the chip row cannot be reached by the D-pad** — **OPEN, measured
  2026-09-16 on build 0fbecb6 and again on build `ca12429`, so it is not something this session's own commits
  caused.** Open Show details on a reply and press Down to step into its chips and read one — the ring skips
  the whole chip row and lands on the Session context bar instead. Seen on an instant built-in reply and on a
  real model reply with seven chips ("Chip 1 of 7" on screen); either way only the first chip can ever be
  read, and only by starting there before opening anything else. It worked before: the closed
  CONTEXT-LADDER-01…03 row (verified on the Deck 2026-09-05) had Down entering the chip row and Up walking
  back out. Evidence `docs/test-evidence/plan56-BUG-chip-ladder-unreachable.json`,
  `docs/test-evidence/plan56-CONTEXT-LADDER-03-caseB-details-open.json`,
  `docs/test-evidence/plan56-SPY-REVEAL-01-ladder-walk.json`.
- ★ `[focus]` **Reaching the Stop generation button by D-pad while a reply is streaming is hard to find** —
  **OPEN, found 2026-09-16.** With a reply still being written, Down from the question box stalls (Ask is
  disabled) and Down from the live streaming answer never reaches Stop generation either; the only route found
  is the question box, then Right onto the Ask-mode button, then Right again onto Stop generation. Two long
  replies finished on their own before the ring reached the button by other routes. Not a trap, since Stop can
  still be reached — just not where a person would first look. Evidence
  `docs/test-evidence/plan56-GREYED-STEP-OVER-02.summary.json`. **Confirmed on the Deck 2026-09-17:** Down
  from the question box while a reply is streaming still goes nowhere; Stop generation is reached only by
  Right, then Right again. Evidence `docs/test-evidence/plan57-QA-GREYED-STEP-OVER-02.json`.
- ★ `[focus]` **Pressing B while the reasoning display's Show details panel is open does not close it** —
  **OPEN, found 2026-09-17 by the automated rig, during the reasoning-display device measurement.** Steam's
  own Back instead moves the highlight up to the tab row; the reply has no B handling for this panel today.
  Needs a decision on whether B should close the panel, or this counts as accepted behaviour. Evidence
  `docs/test-evidence/plan57-M-fold-row-and-live-block.json`.
- ★ `[focus]` **Walking up from the question box skips every reply row** — **OPEN, found 2026-09-18.** Pressing
  Up from the question box goes straight to Clear, Retry, the earlier-chats row and the tab bar; a reply's own
  rows — Show details, Read aloud, the thumbs and the notes block — are reached only by walking down onto them.
  Evidence `docs/test-evidence/plan58p1-M-hk-boss-before.json`,
  `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-01.json`.
- ★ `[kb]` **Download knowledge base needed two taps; the first did nothing visible** — **OPEN, reported
  2026-09-16, not reproduced.** Read in the code (`src/components/KnowledgeBaseSection.tsx`,
  `openStoragePicker`): the first press should open the storage-choice popup (internal or SD card) before
  anything downloads, and the second tap is what ran the download. Needs a run with the plugin log on.
  **Tried on the Deck 2026-09-17, blocked:** the knowledge base was already installed on that device, so
  there is no first-time download button to press. Still owed, on a Deck without the knowledge base
  installed. Evidence `docs/test-evidence/plan57-QA-kb-download-two-taps.json`.
- ★ `[layout]` **An open question's row is only partly visible behind the Retry corner icon** — **OPEN,
  seen at every visit 2026-09-15 evening.** With the newest turn open, the ring on the question's inner row
  reads 67% visible, covered by the Retry same-prompt icon in the corner. Evidence
  `docs/test-evidence/plan55-QUESTION-COLLAPSE-RING-01.json` (step 1),
  `docs/test-evidence/plan55-DRG-01d-second-question-send.json` (step 1). **Seen again in the free-play sweep
  2026-09-15**, at 78% visible behind the same icon, in both directions of the walk — the plugin's own rule
  counts a focused-but-not-fully-visible stop as a failure regardless of the percentage. Evidence
  `docs/test-evidence/plan55-QA-FREE-PLAY-01-main-long-reply.json`. **Re-run on the Deck 2026-09-17: read
  fully visible** — the newest question read in full beside the Retry icon, with no cropping. Evidence
  `docs/test-evidence/plan57-QA-QUESTION-COLLAPSE-RING-01.json`. No code change is on record that would
  explain the improvement, and it disagrees with the 67% and 78% readings above, so this stays open
  rather than closed on one clean run — a maintainer call on whether to trust it. **Read fully visible
  again on 2026-09-18,** at every sighting across a handful of walks on build `6d5b83f`. Evidence
  `docs/test-evidence/plan61-question-row-retry-visibility.json`. The maintainer's call above still
  stands until the night's later walks are in.
- ★ `[ollama]` **The vision try-order picker writes settings even when nothing changed** — **OPEN, found
  2026-09-16 during block 0 of session 56.** Opening the vision model try-order picker and pressing Done
  writes the picker's current order into the settings file, even when nobody moved anything. Restored by hand
  at the end of the block; no evidence file yet. **Confirmed on the Deck 2026-09-17:** pressing Done rewrote
  the settings file with nothing actually reordered. Evidence
  `docs/test-evidence/plan57-QA-vision-try-order-writes-settings.json`.
- ★ `[reply]` **The no-game branch menu leaks its template** — **OPEN, found 2026-09-18.** With no game known,
  the menu under a reply read "Where are you at in THIS GAME? A. <a place early in THIS game> B. <a place later
  in THIS game>" — the instruction's own placeholder copied into a real menu. Same family as the copied
  Half-Life 2 example fixed 15 September. Evidence `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-03.json`,
  `docs/test-evidence/plan58p1-M-tip-before.json`.
- ★ `[tabs]` `[layout]` **The row of small dots under the chat name still shows below the open tab strip** —
  **OPEN, found 2026-09-18.** With the tab strip open, the strip's bottom edge sits at 130px while the row of
  dots runs from about 133 to 137px (135 to 139px with the ring on the chat row instead of the tab bar) — every
  dot sits fully below the strip, not covered by it. The chat row's own bottom line (142 to 146px) is correctly
  below the strip. The maintainer chose a 66px strip on 2026-09-17 specifically to cover these dots; about 8 to
  10 more pixels of strip, or moving the dots up, would do it. Evidence `docs/test-evidence/plan61-TAB-STRIP-2A-07.json`.
- ★ `[ui]` **A new setting can quietly stop working in one place, because the list of settings is written out by hand
  several times over** — **OPEN, found while explaining the code 2026-09-14.** The settings code repeats its fifty-odd
  setting names in several separate places in the same file. Miss one and nothing breaks visibly; that setting just stops
  being saved or loaded in one situation while working fine everywhere else. It has already happened once, to four
  settings. Tracked as "places the settings field list is repeated", at 7 against a target of 1.
- ★★ `[chat]` **A new chat shows the previous chat's last reply until the panel is reopened** — **OPEN, seen
  2026-09-15 evening.** With a reply still on screen in one chat, moving the chat row to the new-chat position
  and pressing A made the new chat, but the new chat then showed that earlier reply underneath it, with "…"
  standing in for the question, its Helpful, Not really and Copy buttons all reachable, and a Session context
  row showing one turn. Closing the panel and reopening it left the new chat empty, the way a new chat should
  always start. Evidence `docs/test-evidence/plan55-trap-run3-new-chat-with-live-turn.json` (the walk from the
  chat row visits Retry, the "…" question, Copy reply text and Read aloud under the New chat slot). **Seen
  again 2026-09-18, 01:11, build `6d5b83f`:** the shoulder button to the new-chat position, then A, then one
  Down into the transcript, and the empty new chat showed the older chat's Theseus-and-Asterius reply. The new
  chat's own saved file already had no turns and already pointed at the new chat, so this is a stale drawing
  on screen, not a data problem. Closing and reopening the panel cleared it. Reproduced twice now. Evidence
  `docs/test-evidence/plan61-BUG-ghost-reply-new-chat.json`. **A third sighting 2026-09-18 about 09:30, build
  `0589565`, and now a recipe that brings it up on demand:** switch to a brand-new chat right after a
  reply finishes in another chat, and the new chat shows that finished answer, with a placeholder standing in
  for the question and working Helpful, Not really and Read aloud buttons underneath it. Closing and
  reopening the panel clears it every time. Three hits tonight in all, two by accident and one on this
  recipe. Evidence `docs/test-evidence/plan61-ghostreply-try1.json`. **A fourth sighting 2026-09-18,** on its
  own while a try at the panel-trap bug above was being set up, same shape as before. No new evidence file.
- ★★ `[chat]` **A chat that is still writing does not look busy from another chat** — **OPEN, found
  2026-09-18.** While one chat is still writing and you switch to another chat, nothing tells you the first
  one is busy: its dot in the chat row looks like every idle chat's dot, with no hollow cyan ring and no spark
  beside its ghost title; the other chat's own Ask button reads ready instead of busy; and when the first chat
  finishes, its dot never turns green. Seen on three separate tries. The code already has both dot states and
  the ask flow does mark a chat as generating and later clear it, so the state is not reaching the row on the
  device — worth a closer look, not yet explained. Evidence
  `docs/test-evidence/plan61-CHAT-SLOTS-V3-05a-busyhalf.json`, `docs/test-evidence/plan61-CHAT-SLOTS-V3-06a.json`,
  `docs/test-evidence/plan61-CHAT-SLOTS-V3-06b.json`.
- ★★ `[focus]` **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a
  blanket rule was tried and reverted in favour of Steam's native outline.
- ★★ `[focus]` **The Show details chip ladder is not a D-pad stop** — **OPEN, found 2026-09-17 while running
  the reasoning display's Deck rows.** With Show details open, Right from Hide details stalls, Down skips
  straight to the Session context strip, and Up from there lands back on Hide details — so no chip beyond
  the first can ever be selected by a controller, only read on the page. This is not new: CONTEXT-LADDER-03's
  2026-09-16 note already saw the ladder skipped, on an instant built-in reply; this run confirms the same gap
  on a real model reply, with a thinking chip among the skipped chips. Evidence
  `docs/test-evidence/plan57-REASONING-05.json`. **Seen again 2026-09-18, on a real model reply with a
  two-button follow-up menu:** with Show details open, Down from Hide details now lands on the new "From the
  notes" row, then the Session context strip, never on either menu button; Up from the strip jumps straight
  back to Hide details, skipping the notes row and the menu too. The same skip now covers the follow-up menu
  buttons, not just the chips. Evidence `docs/test-evidence/plan61-CONTEXT-LADDER-03-caseB.json`.
- ★★ `[focus]` `[reply]` **Walking a reply with the D-pad while it is still being written loses the
  highlight** — **OPEN, found 2026-09-18.** Walking a reply with the D-pad while it is still being written
  makes the view keep following the new text, and the highlighted control scrolls off screen with it: six of
  the eight stops the ring visited were not visible (all but one fully off screen, the other one a third
  hidden behind the question box), and walking back down looped back on itself instead of reaching the
  bottom. Build `0589565`, a 62-second reply with thinking set to High, nothing running. The token-streaming
  feature closed to Done earlier tonight on its 4 September checks, which measured the view following with
  nobody touching the D-pad; this is the case those checks did not cover — walking with the D-pad while a
  reply is still streaming in. Evidence `docs/test-evidence/plan61-QA-FREE-PLAY-01-streaming.json`,
  `runs/plan61-QA-FREE-PLAY-01-streaming.json`.
- ★★ `[ollama]` `[layout]` **The AI models screen shows about two rows of the model list on the Deck's
  screen** — **OPEN, reported 2026-09-16 by the maintainer, cause read in the code, not yet changed.** The
  screen's body is capped at 520 pixels tall (or 72 percent of the screen when that is smaller;
  `src/components/OllamaModelsHubModal.tsx`, the `maxHeight: "min(72vh, 520px)"` box), and the parts above the
  list that never scroll away (the three section buttons, the counts line, the custom tag box, the Suggested
  chips, two rows of filters, the column headers; all drawn by `src/components/PullModelsModal.tsx`) take about
  430 of those, leaving roughly 90 pixels for rows. An external monitor taller than about 720 pixels gets the
  same 520 cap, so it looks the same there. The popup itself has room: on the Deck's screen it stands 640
  pixels tall. Fix with the filters rework below, or before it as a taller list. The maintainer's recording is
  `recordings/DeckRecord_20260916_114238_game.mkv` on their own PC, not in this repo. **Confirmed on the Deck
  2026-09-17:** still about two rows of models visible before scrolling. Evidence
  `docs/test-evidence/plan57-QA-AI-models-screen-2-rows.json`.
- ★★ `[ollama]` `[focus]` **A tap outside the AI models screen started the queued downloads and left the
  D-pad stuck in the Ollama tab** — **OPEN, reported 2026-09-16, not reproduced.** The maintainer did not
  press Done; they think they tapped outside the screen, and afterwards the models started downloading and
  the D-pad could not move in the Ollama tab, as if the screen were still open. Two things read in the code,
  neither proven on the device: (a) a tap outside closes the popup through Steam's own path, which never runs
  the plugin's own close (`onClose` in `src/features/plugin-shell/useOllamaModelsHubModal.tsx` runs only from
  the screen's own Done and Cancel), so the tab restore and the return of the ring to the opener in
  `finalizeShowModalAndRestoreActiveTab` (`src/hooks/useBonsaiPluginShell.ts`) are skipped and nothing owns
  the ring afterwards; the "Manage AI models…" button also never registers itself as the return-focus owner
  the way the two try-order buttons beside it do (`rememberModalReturnFocus`), so even a clean close returns
  the ring to whichever opener was remembered last; (b) the last frame of the maintainer's recording shows the
  Pull selected button lit, at the popup's bottom edge, so a tap meant for outside may have landed on it and
  started the queued download. Needs a device reproduction with an empty queue, so nothing downloads.
- ★★ `[reply]` **Token streaming reveals text in bursts while a game is running** — **ACCEPTED 2026-09-04 (D58 #4).** Measured 2026-08-28 with
  a game running: tokens arrive in bursts, and during a burst the overlay drops to 47 fps; between bursts it is a flat 60. Delivery
  is bursty, painting is not slow. The game's own frame rate is unmeasured. Accepted as a nice-to-have; reopen only if the game's own frame rate is measured
  and suffers. Making streaming the default stays a separate feature call. Row **STREAM-11**. [Detail](roadmap-details.md#token-streaming-reveals-text-in-chunks-while-a-game-is-running).
- ★★ `[voice]` **Two things wanting the voice server at once would cut the first one off mid-sentence** — **OPEN,
  found while explaining the code 2026-09-14.** The speech-to-text server is shared, and it is started for one particular
  speech model. If a second caller asks for it with a different model, it restarts to suit the second, and the first is
  never told — it simply finds the server gone. Only one thing uses it today, so nothing is broken now. It becomes real
  the moment a second listener is added, a wake word for example.
- ★★★ `[focus]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** —
  **OPEN, found 2026-09-05.** Down walked as far as the answer and stopped dead: ten presses, no movement, Left and Right
  dead too, only Up escaping. The Ask button, the preset chips and the question box were all on screen below and none
  could be reached. It happened on a chat with history and on a brand new empty one, in both Ask modes, so the mode is
  not the cause. **Only a Decky loader restart clears it**, not a panel reopen — so this is stale navigation state, not a
  permanently trapping control. **A fix landed 2026-09-05, but the entry stays here rather than in Verify**, because the
  fault never reproduced on demand, so nothing proved the fix against it. It closes only when the panel is driven hard
  over time and the state does not come back. The unrevealed-spoiler entry above is most likely the same fault and closes
  with it. The mechanism, the signature to chase and every run, including how it was finally reproduced on
  demand:
  [detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  **The trigger is now known, found 2026-09-18 with a game running.** Pressing A on the question box opens
  Steam's own on-screen keyboard; once B closes it, Down and Right out of the box stop working — the page's
  own idea of what is focused moves on to the Ask button or the mode button, but the highlight ring a person
  actually sees stays on the box, and only Up still gets out. It happened five times across two panel
  reopens and one full close-and-reopen of the whole quick access menu on Half-Life 2, and again in a
  brand-new chat with Hades running; by the time Portal 2 was running it had cleared on its own, with no
  restart needed. Three tries of the 15 September new-chat recipe the same night came back clean, so
  opening the keyboard, not starting a new chat, looks like the real trigger. Evidence
  `docs/test-evidence/plan61-ASKBAR-FOCUS-TRAP-01.json` (the sighting), `docs/test-evidence/plan61-focustrap-try2.json`
  and `-try3.json` (the clean tries).
- ★★★ `[reply]` **A name-withheld boss question on a story-protected game comes back with no spoiler box** —
  **OPEN, found 2026-09-18.** Nothing running, no consent phrase anywhere in the chat: asked about "the boss
  past the crystal spike area … the one that looks just like me" in Hollow Knight, the reply named Broken
  Vessel and gave its tactics in plain text with no cover; asked about "the boss at the end of the first area"
  in Hades, the reply named Theseus and Asterius the same way. Two games, both builds, the same shape. The
  plan 54 rows still marked owed (STRAT-SPOIL-NAME-01) would fail on this evidence. Evidence
  `docs/test-evidence/plan58p1-M-hk-boss-before.json`, `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json`.

---


## Features

**Standing goal from the maintainer (2026-08-30):** buy back as much vertical room for the chat bubbles as possible; every
`[layout]` entry serves it. Items rated ★★★★★ or above carry a placeholder link to [bonsAI Issues](https://github.com/qd313/bonsAI/issues) in the archive;
replace it with a specific issue when one exists.

- ★ `[ask]` **Intent packs later review** — **OPEN.** Decide whether the quiet intent-pack search aliases are deleted, left quiet, or
  revived under Developer. Not in scope: re-shipping Proton journal inject without a redesign. **New evidence 2026-09-06 (D79):**
  the bundled Deck basics list ships switched on and is the *only* reason a whole sentence ever matches a setting — its 88 words
  match when your sentence contains one of them, so *can you help me with performance* returns three results. The maintainer folded
  that finding into this entry. [Detail](planning/45-settings-shortcut-card.md#5-two-things-about-the-search-that-are-not-obvious).
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
- ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.** The create position is the
  literal `[+]`, re-confirmed on board 8f and again in the v3 rows. Reopen that decision before building it.
- ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed 2026-09-08. Not yet
  (D99, 2026-09-12): it waits for its own go.** The model would be asked to start every answer with one short sentence that
  carries the point and gives nothing away, so the reply-ready popup, a spoken answer and any headset card always have a good
  first line to show. Sits beside Terse mode without replacing it. No headset or PC test needed.
  **The count that decided it ran 2026-09-12:** 2 of 10 answers already opened with a sentence that stands alone, and 0 of 10
  gave anything away. By the rule the maintainer locked (D97 call 4), that poor score means build it — then they read the
  count and said not yet. **When the go comes, the first step is still to count the 2026-09-07 answer-first run the same
  way**, because that run may already be the change. Stars stay at two. [Plan](planning/49-steam-frame-features.md) ·
  [Second look § 2](planning/52-frame-features-second-look.md#2-headline-first-the-weakest-one-and-what-to-do-instead) ·
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
- ★★ `[layout]` `[voice]` `[focus]` **Read aloud is a small speaker button on the Helpful row, not a second dividing
  line** — **OPEN, filed 2026-09-16 by the maintainer (D106).** Today: Read aloud is a full-width dividing line above Show
  details, the same shape as Show details, one row up, drawn by the reply-actions row builder
  (`src/utils/buildReplyActionsElement.tsx`); its text flips to Stop while the Deck is talking
  (`src/hooks/useReadAloud.ts`). Wanted: a small button with a speaker icon on the same row as Helpful and Not really (the
  Feather icon set the plugin already uses, `react-icons/fi`, has a speaker, `FiVolume2`); the dividing line goes. What it
  must keep: a real D-pad stop registered under the same name (`read-aloud` in `replyStopRegistry`) so the by-name jumps
  still work; Left and Right along the row; the flip to Stop in the icon and the spoken label; and it must stay reachable
  when the thumbs are greyed, because the greyed-thumbs step-over from lane I (commit `e41808d`) skips a greyed Helpful /
  Not really row, and Read aloud on that row must still be a stop. What changes when it lands: Up from Show details lands
  on that row; the MICRO-04 testing row's "today's stops" text and READ-ALOUD-02 need rewording; the mockup page drew Read
  aloud as a line and would change too.
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
- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16 on the Deck's built-in
  screen, no single cause, not built in plan 56.** On the Deck's own 1280 by 800 screen the panel is 454 pixels tall, not
  the 696 every earlier number assumed. There is no gap above the dock at all, because even a two-turn chat overflows the
  panel by 321 pixels and scrolls under the dock: a person sees about 143 pixels of chat, roughly three lines. The fixed
  rows take 311 of the 454 pixels before any chat: Steam's header (64), the tab bar plus its reserve (24), the chat slot
  row (54), a 12-pixel gap, and the dock (157). Getting more chat on this screen means shrinking or hiding one of those
  rows, which is a design call for the maintainer, not a fix. External-monitor record:
  [planning/30-collapsing-tab-bar.md](planning/30-collapsing-tab-bar.md) § 8 ·
  [plan 56 block 0](planning/56-feature-session-four.md#block-0--hygiene-and-three-measurements-the-session-alone-about-forty-minutes).
- ★★★ `[layout]` **Session context folds into Show details** — **OPEN, shape decided 2026-09-16 (D106): a tab within the
  Show details panel, option B on the mockup page.** The **Session context (N turns)** bar stops being its own row, so a
  settled answer costs one collapsed control instead of two. As drawn: the opened Show details panel gets two tabs at its
  top, *This answer* and *Session · N*; Left and Right switch between them; the chip row and its body stay where they are;
  only the newest turn shows the Session tab, so it never repeats; the collapsed row still says *Show details*; Up from the
  tabs goes to Hide details and then Read aloud, Down goes into the chips, and B anywhere inside closes the panel. One
  thing the page did not draw: where Clear sits inside the Session tab. The builder puts it at the end of that tab's body,
  the same button and the same confirm box, unless the maintainer says otherwise.
  [Open questions](roadmap-details.md#session-context-folds-into-show-details).
- ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — **OPEN, research spike.** Hold models loaded, or unload when a game takes
  focus on the Deck APU? The spike decides go or no-go; no production unload before it.
- ★★★ `[ollama]` **Per-mode latency timeouts** — **OPEN, weighed and deliberately not built 2026-09-05.** Separate warning and
  give-up values per Ask mode. It was the sixth candidate in round 36 and was dropped on purpose, said in advance rather than
  discovered late: it is the largest of that set — the two existing values already run through sixteen files each and going per mode
  triples them — and the least of them for a person, since it changes when a warning appears rather than what the plugin can do.
- ★★★ `[ollama]` `[ui]` **Retire the policy tiers into the filters at the top of the AI models screen, and
  rework the filters** — **OPEN, asked 2026-09-16 (D107), mockups first.** Today the screen has three sections
  (Policy, Browse & pull, Advanced); the Policy section is three tier buttons (open-source only, open-weight,
  any installed model; `src/components/ModelPolicyTierPanel.tsx`), and the Browse & pull section has two rows
  of filter chips (All, Speed, Strategy, Expert, Vision, Coding; Installed only, FOSS only, Essentials only;
  `src/components/PullModelsModal.tsx`). Wanted: the tier choice stops being its own section and becomes a
  filter among the filters at the top of the list, and the filters themselves are reworked. The maintainer
  wants a mockup page first, drawn at the Deck's own screen size like the plan 56 page, so they can pick and
  choose what goes up there for people to filter by when they pull models. Not drawn yet. The two-row list bug
  above is fixed with this or before it.
- ★★★ `[platform]` **Trim the five documents that are still big** — **PARTIAL: one of five done 2026-09-15.**
  Nothing a person using the plugin would notice; this is about what every piece of work costs before it starts. Five files
  carry a trim task at the top of each, with its own star rating, time and model. **This file is done (2026-09-14 and 15) — 100 KB to 83 KB,
  about 3,700 tokens off every landing.** Four left. The next one that matters is the testing rows, because the house rules
  say those are read before anything is marked done too. The biggest single win is the locked decisions file at 89,000
  tokens a read. Do them one at a time; each is its own small job.

- ★★★ `[platform]` **The eleven long files, left long on purpose** — **OPEN, filed 2026-09-15.** Nothing a person
  using the plugin would notice. Eleven files in the code are past the size limit — seven that draw the screen,
  four behind the scenes — and were left alone on purpose this round, because splitting each one safely is a
  day's careful work. This entry is the record that they were skipped on purpose, not missed, with the sizes
  so nobody has to re-measure. Two smaller files already came out of the Ask file the same safe way, each with
  its own test. Do the rest one at a time, each with its own Deck check.
  [Full file list and sizes](roadmap-details.md#the-eleven-long-files-left-long-on-purpose) ·
  [Plan](archive/51-refactor-round-two.md).

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
- ★★★★★ `[ollama]` **On-Deck model benchmark** — **OPEN, descoped on 2026-09-06, one call open (D75).** Rank installed models by measured
  speed and completion; offer as try order with confirmation. Its own gate said: if timings do not hold still, descope to a
  one-shot readout. That readout is now its own three-star entry, [plan 43](planning/43-model-speed-readout.md), and its record
  of timings answers the gate over time. Whether this line retires is D75. **First input, 2026-09-05:** the desk survey of this
  quarter's models in [41-deck-model-survey.md](planning/41-deck-model-survey.md); the calls are D72.
- ★★★★★ `[perms]` **VAC Phase 2: opponent IDs** — **OPEN, research.** Surface live opponent identities for ban checks when metadata allows.
- ★★★★★ `[platform]` **Controller macro test rig and live view** — **OPEN, discovery locked 2026-08-23, board ordered.** A bridge board
  the Deck sees as a real controller, a macro runner gated on real UI state, and one recording pipeline. Primitives land upstream in
  decky-plugin-studio. Next: spikes S1 to S3. [Plan](planning/19-controller-macro-test-rig.md), [program](planning/21-ai-owned-testing-program.md).
- ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN.** AI copy tuned to gen-2 hardware.
- ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; the first step is a ★★ test to find
  out.** bonsAI's panel floating over any VR game, drawn by a small program on the PC that runs SteamVR, so it serves every
  SteamVR headset and the Frame comes along. Not a Decky plugin. The in-game answer surface that is blocked on the Deck is open
  here. **Locked rule (D97):** the panel goes only through SteamVR's own panel door and never touches the game itself — in file,
  in memory or in input — because anything else risks an anti-cheat ban for someone playing online with bonsAI open. Best
  effort: each game's anti-cheat sets its own policy, and the README will say so once the panel ships.
  **Bench result, 2026-09-12: the panel works.** A panel showing a sample bonsAI answer appeared inside the headset view over a
  running SteamVR scene, with no plugin code at all, drawn entirely through SteamVR's own door. The in-headset menu is confirmed
  to be a web page, the same way the Deck's menu is. **Two things still unknown:** pointing at the panel, because the pretend
  headset has no controllers and a real one is needed; and whether the small notification card SteamVR accepted actually drew on
  screen. [Plan](planning/49-steam-frame-features.md) · [PC setup](planning/50-steamvr-pc-setup.md) ·
  [The anti-cheat rule in full](planning/52-frame-features-second-look.md#4-the-floating-panel-and-anti-cheat) ·
  [Bench findings](planning/53-steamvr-bench-findings.md) · [The picture](planning/assets/53-panel-in-headset-2026-09-12.jpg).
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
- ★★★★★★ `[platform]` **Native QAM shortcut tile** — **OPEN, upstream research.** A separate left-rail entry beneath the Decky icon.
  [Feasibility](planning/11-native-qam-tile-feasibility.md).
- ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening llama.cpp** —
  **OPEN, filed 2026-09-08. Not yet (D99, 2026-09-12): nothing is built until the maintainer says.** The floating panel needs
  bonsAI to run outside Decky, which is what the Native QAM shortcut tile research keeps circling, and any model on the Frame
  itself runs through llama.cpp, not Ollama. Three entries, one question: **does bonsAI grow a second way to run.** Decide it
  once. **The gap underneath it: there is no network door into bonsAI's Python side today**, so a panel on the PC would have a
  screen and no brain.
  **The price is now known, which is what D97 call 2 asked for.** The check ran 2026-09-12: the plugin's Python side started
  outside Decky on the maintainer's Windows PC behind a fifty-line stand-in for Decky, nine calls the frontend normally makes
  all came back with a working answer, and it reached Ollama on that PC. So "run the same Python side on the PC too" is a
  priced decision rather than a guess. What is missing: a small starter program, a way for a panel to reach it on the same
  machine, and PC-shaped answers for which game is running, the speaker, and the screenshot folder. llama.cpp stays closed.
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
  picker go with it. Three tests. Row **CLEAR-ALL-PREFIX-01**. **Run on the Deck 2026-09-16, once the
  maintainer's pre-authorised wipe (D105) went ahead:** every one of the eight plugin keys in the browser's own
  storage was gone afterwards, the New labels among them — a clean pass for everything the wipe had to remove.
  **The one thing this row was filed for stays unmeasured:** none of the three underscore-spelled flags this
  fix targets happened to exist on the Deck at wipe time, so the run could not show whether they, specifically,
  now go with the rest. Evidence `docs/test-evidence/plan56-WIPE-01.summary.json`. The same wipe also removed
  the Deck's own local AI program and every model it had downloaded; a backup of settings and chats cannot
  bring those back, and Ask on this Deck is down until "Run AI on this Deck" is switched back on.
- ★ `[focus]` **Walking down a reply and walking back up visit different stops** — **VERIFY, fixed
  2026-09-15.** Down and Up through a reply now stop at the same places in both directions. Row
  **REPLY-STOPS-MIRROR-01**: on a reply with two paragraphs, a spoiler block and a two-button menu, check the
  Down stops and the Up stops are exact mirrors of each other. **Tried on the Deck 2026-09-17, blocked:** no
  reply with a spoiler block turned up to run the row as written. On the reply that was available, a real
  mismatch showed up on a different part of the reply than this row names: Down reached both buttons of a
  follow-up branch menu, and Up skipped both on the way back up. Stays owed. Evidence
  `docs/test-evidence/plan57-QA-REPLY-STOPS-MIRROR-01.json`.
- ★ `[ollama]` **Mistyping one model name in a several-model download loses it without saying so** — **VERIFY,
  fixed 2026-09-15.** Downloading several models at once now says which name it could not find and still
  starts the good ones, instead of quietly dropping the bad one. Row **PULL-MISSING-NAME-01**: on the Ollama
  tab's pull picker, choose two real models plus a name the registry lacks, press Pull selected, and check for
  a toast that says the download started and names the one it could not find.
- ★★ `[focus]` **A checklist the model got wrong was left in the reply as raw JSON**, its own D-pad stop that did nothing — **VERIFY.**
  Fixed 2026-08-28: a rejected checklist block is dropped, as a rejected branch block already was. Owed: one sighting on device of a
  reply where it happens. Row **STRAT-CHECKLIST-JSON-01**.
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** —
  **VERIFY, landed 2026-09-15.** The tab bar's pop-up strip now always ends fully hidden a fraction of a second
  after it closes, even when its fade is stalled by a game running full screen, so no see-through copy of it
  can be left sitting over the suggestion chips. The exact reason the fade stalls could not be proven on the
  rig, which has no touch, so the fix force-finishes the close with a plain timer either way. Row
  **TAB-BAR-GHOST-01**, needs a finger, and it is on the maintainer's checklist.
- ★★★ `[chat]` **Clear cache cleared the screen but not the session** — **VERIFY.** Fixed and confirmed 2026-08-27, and again on the
  Deck 2026-09-03. The orphan half is measured: the chat stays behind after a clear, so each clear-and-reask cycle leaves one more
  chat in the rotation — a follow-up, not a regression. Only the mid-generation half is still owed: clearing while a reply is still
  being written (unit-tested, not reproducible by hand yet). Row **CLEAR-CACHE-01**. **Tried on the Deck
  2026-09-18:** the D-pad walk from Ask to Clear cache took about 48 seconds and the reply finished in 43, so
  Clear landed on an already-finished answer, not a mid-answer one. Next try: switch tabs with the shoulder
  button and use a slower Deep-thinking question. Evidence
  `docs/test-evidence/plan61-CLEAR-CACHE-01-midanswer.json`. **Tried again on the Deck 2026-09-18, still
  BLOCKED:** using the shoulder button to switch tabs got to Clear cache in 63 seconds, but the reply (a
  slower, high-thinking question) had already finished at about 50 seconds, so Clear again landed on a
  finished answer, not one still being written. Clear itself worked cleanly: an empty transcript, and a fresh
  question started a clean session. Two tries tonight, both too slow to catch a reply mid-write. What is
  needed next is a reply that takes longer than about 70 seconds — a running game, or the sixty-tip question
  from SOFT-PREDICT-01 — or the maintainer's word to close this half as covered by its unit test instead.
  Evidence `docs/test-evidence/plan61-CLEAR-CACHE-01-midanswer-retry.json`.
  [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).
### Features that need verification

- ★★ `[chips]` **Make the preset chips look more like chips** — **VERIFY, shipped 2026-09-17 under plan 60 (D110).** Each chip now looks raised: a thin light line along its top edge and a soft shadow beneath it. The two chips sit 6 pixels apart instead of 4. In decode, static and carousel mode there is now 8 pixels of open space between the chips and the question box, where before they touched (fade mode was already open and keeps its own spacing). The word "Tip" became a small dot, the colour on the tags and on the resolving-text label is quieter, and the chip the controller is on now shows a light bar along its bottom edge instead of the old blue outline — a ring around the chip that nobody could actually see is gone too. Passed on the Deck by measurement: rows 02, 03, 04, 05 and 06 (the one-chip check), and 08. **Row 09 failed on the Deck 2026-09-18** — a real knowledge-base chip showed with no Tip dot — and is filed as its own bug, below. Still owed: the maintainer's own look at rows 01 and 05, from the three screenshots named in the evidence file, and row 07 (reduced motion), both on the maintainer's own page; and a look at the help and agent chips, which were not on screen during this run. Italics were tried earlier for the label and turned down. [Plan](planning/60-chip-button-restyle.md) · evidence `docs/test-evidence/plan60-QA-chip-button.json`.

- ★ `[ollama]` **Pulled models join the model try order** — **MOSTLY VERIFIED on the Deck 2026-09-06, one case left.**
  A model pulled from the picker landed at the **bottom** of the text list, and showed up in the vision list because it can
  read pictures — while a text-only model and the embedding one stayed out of that list. What is still owed is the opposite
  placement: with *Allow high-VRAM model fallbacks* on, a **large** pulled model is supposed to go to the **top** instead.
  That needs a large model on the device and the switch turned on. Row **ROUTING-MERGE-01**.

- ★ `[platform]` **VAC check (`bonsai:vac-check`) on-device QA** — **VERIFY.** Implementation complete; run **VAC-02…06** after Tier 0
  **SMOKE-F** passes.
- ★★ `[chat]` **The game a chat belongs to, above its title** — **VERIFY.** Shipped 2026-08-30 in quiet text above the slot title;
  only chats created after that date carry the name. Row **CHAT-SLOTS-V3-14c**. It costs a line of height, which cuts against the
  vertical-space goal; decide whether it shows always or only when the row has focus.
- ★★ `[reply]` **Thinking line fixes from 2026-08-07/08** — **VERIFY.** Emoji upright, lazy status tag survives, no bare-emoji phase
  changes, one writer. Five of seven rows pass on the Deck: **THINKING-SLOW-01** and **THINKING-SPOILER-01** (2026-09-04);
  **THINKING-COPY-01**, **THINKING-LIVE-01** and **THINKING-EMOJI-01** (2026-09-17) — the first status line held about 5.5
  seconds before changing, the line changed three times over about 7 seconds with no freeze or repeat, and the emoji sits
  upright beside the tilted sentence. Evidence `docs/test-evidence/plan57-QA-THINKING-COPY-01.json`,
  `docs/test-evidence/plan57-QA-THINKING-LIVE-01.json`, `docs/test-evidence/plan57-QA-THINKING-EMOJI-01.json`. Left:
  **THINKING-SANITIZE-01** and **THINKING-EMOJI-CLUSTER-01**, both automated only, never read on the device.
  **Tried on the Deck 2026-09-18:** the status line always read as words, never a bare tag, across the night's
  long answers, but the fault THINKING-SANITIZE-01 hunts did not happen, so it is not yet proven; no multi-step
  troubleshooting question ran, so THINKING-EMOJI-CLUSTER-01's several-phase case never came up either. Evidence
  `docs/test-evidence/plan61-THINKING-SANITIZE-01.json`, `docs/test-evidence/plan61-THINKING-EMOJI-CLUSTER-01.json`.
  [Log](planning/06-thinking-blurbs-review.md#10-implementation-log).
- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09. Rows **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01**
  (and **KIDS-LOCK-02** with a child account). Live CEF Stage 0 confirmation still owed. **KIDS-REGRESS-01
  re-confirmed on the Deck 2026-09-17:** no lock banner, all four Permissions switches on and reachable.
  Evidence `docs/test-evidence/plan57-QA-KIDS-REGRESS-01.json`.
- ★★★ `[reply]` **Soft reply-length cap and thinking budget** — **VERIFY.** Shipped 2026-08-10. **01, 02 and 03 all pass:**
  02's empty continue stops quietly (automated); **01 and 03 confirmed on the Deck 2026-09-17** — a long five-part reply
  read with no seam and the `Continuing…` cue never showed live or saved (01); stopping partway kept the partial text
  with a `Stopped — partial answer kept.` notice (03). Evidence `docs/test-evidence/plan57-QA-SOFT-PREDICT-01.json`,
  `docs/test-evidence/plan57-QA-SOFT-PREDICT-03.json`. **SOFT-PREDICT-05 passed on the Deck 2026-09-18:** run on
  gemma4:e2b-it-qat (the Deck's real thinking-capable model; no other thinking model is installed) with Thinking
  Off, a full visible reply came back, no empty reply. Evidence `docs/test-evidence/plan61-SOFT-PREDICT-05.json`.
  Left: **SOFT-PREDICT-04** (a continue mid-menu in Strategy) — **tried 2026-09-18, blocked:** the long Hades
  walkthrough question came back as a short spoiler-careful refusal, so no reply reached the length wall.
  Evidence `docs/test-evidence/plan61-SOFT-PREDICT-04.json`.
  [Why](roadmap-details.md#shipped-qa-owed--why-each-was-built-this-way).
- ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab named** —
  **VERIFY, landed 2026-09-17.** Six equal cells with one 22px icon each, only the current tab named, in the
  accent colour; the strip is taller (66px) so the chat row's row of dots no longer shows under it. Built in
  commits `6821f20`, `ef4a851`, `18be399`, `0378024`, `044acab`, `a957165`. **Deck run 2026-09-18: rows 01, 02,
  04, 05 and 06 all pass; 03 is captured and waits on the maintainer's own look; 07 failed and is filed as its
  own Bugs entry, above.** The free-play sweep has run once (the after-finished half); the streaming half is
  still owed. [Plan](planning/59-tab-strip-redesign-build.md) ·
  [Design](design/handoffs/tab-bar-open-strip/return-2026-09-16/).
- ★★★★ `[ollama]` **Speed-mode VRAM preload** — **VERIFY, the mechanism proved on the Deck 2026-09-05, the timing not.**
  A Developer switch, off by default, loads the model Ask will use into memory at start-up. **A bug was found and fixed on the
  device:** it warmed the first small model installed rather than the one Ask reaches for, which on this Deck were different, so it
  spent memory on a model no question would touch. It now uses Ask's own resolver, and warms nothing when Ask's model is over the
  three-billion cap — which is what happens on this Deck, confirmed. **Still owed:** the timing comparison (**PRELOAD-01**), which
  needs a Deck whose Ask model is under the cap, and the memory-pressure case (**PRELOAD-02**). Open and untouched: whether the
  model survives the Deck sleeping.
- ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30; the layout inverts to slot row, transcript, presets,
  Ask bar. Most rows pass on device. **05b passed on the Deck 2026-09-18:** returning to the chat still writing
  showed the question and the partial text at once, nothing missing. Evidence
  `docs/test-evidence/plan61-CHAT-SLOTS-V3-05b.json`. **05a's ask-bar-reads-busy half, 06a and 06b failed on the
  Deck 2026-09-18** — see the new "chat that is still writing does not look busy" bug above. Owed: **06c** (not
  attempted 2026-09-18) and **15d** (a recording made 2026-09-18 for the maintainer's own glance).
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
  **CHAT-SLOTS-V2-01 passed on the Deck 2026-09-17:** Down twice from the tab strip reaches the chat text, and Up retraces
  the same path. Evidence `docs/test-evidence/plan57-QA-CHAT-SLOTS-V2-01.json`.
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

**Where things stand (2026-09-18).** **372 notes over 35 games, plus 159 Deck tips.** Wave two
added 27 notes and 32 tips. **Of the 72 questions a player might plainly ask about the twelve games added this
month, 64 now have a note** — the other eight were written on purpose to have none, so every question that was
meant to have an answer has one. Ten more games' notes landed 2026-09-18 — the five Mario Party games, Donkey
Kong 64, Yoshi's Story, Diddy Kong Racing, Super Smash Bros. 1999 and Grand Theft Auto III: The Definitive
Edition — written by two helpers in their own words from wiki pages read that same day, with the page, licence
and day recorded on every note. The library was built as version 2026.09.18 with every note and tip indexed and
its publish check passing, but it has not gone out to the public hosts yet.

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
before and after is in [wave three's report](planning/48-kb-wave-three-session.md).

**Getting to the troubleshooting tips is where the wave fell short.** The tips themselves are much better — crash went
from 2 to 9, sound 1 to 8, picture 1 to 8, performance 2 to 10, controller 6 to 10, and the top crash tip no longer
tells someone to check a desktop that game mode does not have. But of 24 fresh sentences written by someone who had not
seen the rules, **6 reached the tips before and 8 after**. The rules are still phrase-shaped: they catch the exact
wording someone imagined and miss the neighbour.

**Pick up here, in order.**

**Wave three ran on 2026-09-07** ([48](planning/48-kb-wave-three-session.md)), after wave two's own Deck
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
5. **Still open: the drift from August to September, whether keeping two models loaded causes trouble
   with a game running, and which of those two settings the maintainer's Deck is actually running
   today.** The plugin disagrees with itself — one of its own starting paths sets the limit to one
   model, another sets it to two — and the Deck has been wiped and set up again since, so either could
   be active. Next: read what is actually running, make the two paths agree, and check memory with a
   game running.
6. **Then 58 phase 1** — two fixes before wave four. [The plan](planning/58-phase-1-notes-shown-and-wiki-extracts.md)
   shows the note's own words under a reply instead of the model's rewrite of it, and reads a wiki's own
   sentences into notes with no AI rewrite, tried first against Hollow Knight and then on ten more games from
   sources already cleared. Nothing started; waiting on the maintainer's nine answers (locking as D111) and
   the word "go". Started 2026-09-17: the drawings, the blind questions and the source study have landed; the
   reader is still being built; the Deck is asleep, so the device readings wait on the maintainer.
   **Update 2026-09-18:** the phase's build and device work are done, except three follow-ups still
   owed (walking up from the session context strip, the block arriving late on some turns, and the
   ladder walk) and the maintainer's publish call; phase 2 can start.
7. **Then wave four, now 58 phase 2** — writing more notes. [The plan for it](planning/58-phase-2-kb-session-wave-four.md)
   is the same plan as before, renamed, and runs once phase 1 has landed; its answers lock as D112.

**Wave two's own evening ran 2026-09-07** and wave three ran the same day; the results and the bug write-ups are
in [wave two's report](planning/47-kb-wave-two-session.md) § 8 and [wave three's](planning/48-kb-wave-three-session.md).
The five optional August rows were not run, and New Vegas still is not installed.

**A library point release went out 2026-09-07** carrying the corrected Black Mesa water note and nothing else — 293
notes, 156 tips, 25 games, unchanged. Installed on the Deck and checked: asked about the flooded rooms, the reply now
says the current is constant, says not to try to time it, and points at the wall switch that cuts the power. The old
advice to wait for a gap is gone. Evidence `docs/test-evidence/plan48-R5-blackmesa-corrected-note.json`.

### Calls waiting on you

- **58 phase 1, nine questions** ([§ 8](planning/58-phase-1-notes-shown-and-wiki-extracts.md)): answered
  2026-09-17 and locked as D111. Two things are still open: the block's look waits on lane A's drawings,
  and trim-only for wiki notes stands unless the maintainer overturns it.
- **58 phase 2, seven questions** ([§ 8](planning/58-phase-2-kb-session-wave-four.md)): unchanged from the
  wave-four plan. Locks as D112, after phase 1.

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md); the knowledge-base
ones from this month are D81 to D88.

### Bugs

- ★ `[KB]` **The credit line under a reply never names a note with no source page, or a shared tip** —
  **OPEN, found 2026-09-17.** The list that credit line reads from quietly drops any note or tip that
  has no source page, so a shared troubleshooting tip or a note written from the model's own memory has
  never appeared in it. The new "From the notes" block works around this by reading the text the model
  was sent instead, which does not have the same gap. The real fix belongs in the knowledge-base
  service's own list of sources.
- ★★ `[KB]` **Unrelated questions still get game cards stapled on** — **ACCEPTED 2026-08-27.** With a game running, *"thank
  you very much"* still attaches a card. Raising the keyword floor costs real matches, and the model mostly ignores an
  irrelevant card. [Detail](roadmap-details.md#ordinary-phrases-attach-game-cards).
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back
  2026-09-06, re-measured 2026-09-07 and still held (D52, D81).** The fix does reach further: with nothing running, all 24
  fresh plainly-worded problem sentences get into the search, against 8 without it, and *"thank you very much"* still
  attaches nothing. **But what comes back is wrong** — six measured examples, each attaching a tip about something else
  entirely, such as the on-screen keyboard for *"game wont even open"*. A wrong tip is worse than none, which is the same
  objection that held it the first time. **The cause is now clear, and it is the useful part.** The meaning search only
  runs when nothing else finds anything, and that almost never happens: a plain word search across 156 tips nearly always
  finds something by shared words, so it wins first with a poor match and the meaning search never gets a turn. **What is
  missing is not a wider gate — it is a way to say "none of these tips fit."** Until there is one, opening the gate makes
  things worse. The real fix is rewriting the tips, filed as its own entry below. All six wrong tips:
  [detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).
- ★★★ `[KB]` **Searching the notes by meaning costs about a second, every time, on the Deck** — **ACCEPTED
  2026-09-06.** Repeated on the Deck: 1.10, 1.23 and 1.19 seconds across three questions in a row, the same band as
  the first time this was measured. The maintainer looked at the number and said that is fine — about a second before
  an answer that then takes tens of seconds to write out is not something a person would notice. **The one-second
  target this was measured against is retired.** The related finding still stands: a repeat search is fast on a
  PC (0.05 seconds) but not on the Deck, where the third question here was no faster than the first. **The cause
  is now measured** — the two models pushing each other out of memory, see the step above — and removing it reads
  as cheap; the acceptance above stands until the maintainer says otherwise. (D84) Evidence
  `docs/test-evidence/round34-drg-q*.json`, `docs/test-evidence/plan46-R2-strategy-half.json`.
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** The weight sweep ran: leaning the search toward meaning gets the right note first about four to six
  points more often, but it also buries a brand-new note whose meaning index has not been built yet, which the current
  weights deliberately protect against. **Not lifted until every note is guaranteed to have its index before it can be
  searched.** Two other objections — a strong exact word match losing to a weaker meaning match, and a locked routing
  rule no longer holding — are not covered by that rule and still need answering if this is ever revisited. Weights
  stay even for now. (D68, D82) [Detail](roadmap-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against).

- ★★★ `[KB]` **A follow-up still names the wrong boss one run in three** — **OPEN, left behind when the follow-up
  fix closed 2026-09-12.** Ask about a boss, then *"what about its second phase"*, and you now get the right boss two
  times in three, where it used to be wrong every time. The remaining third still names the rival boss. DOOM Eternal
  is wrong every time, and no amount of work on the search can close that one. This is the half the shipped fix did
  not cover, kept visible on purpose rather than archived with it. [Numbers](planning/48-kb-wave-three-session.md).
  (D98)
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
  wave-four note-writing work. **Found again 2026-09-18:** a Hades "boss at the end of the first area" question
  attached "Temple of Styx" first and the reply answered about Theseus and Asterius instead of Megaera, steered
  by the top note (`docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json`).
- ★★ `[KB]` **The "no close match" line reads wrong next to a note the reply used** — **OPEN, found 2026-09-18.**
  The line judges only the first attached note's scores, so on a Hollow Knight boss question it said the answer
  leaned on the model's own knowledge while the reply was actually built on the Broken Vessel note, attached
  second; on a Pikmin 2 question it said the same thing under a reply built on the very note the block showed.
  Either look at the best attached note, not just the first, or word the line as "a thin match" rather than a
  claim the notes were not used. Evidence `docs/test-evidence/plan58p1-M-hk-boss-before.json`,
  `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-04.json`.

### Deck check owed

- ★ `[KB]` **Five checks from the August retrieval rework were never run on the Deck** — **VERIFY, or retire.** The corpus
  format gate, the relevance floor, follow-ups searching the user's words, transparency matching what the model got, and
  the Developer kill-switch. Either one evening with pinned test chips, or close them as superseded by the rows that
  passed this week. **Run 2026-09-15: the relevance-floor row is really two checks bundled as one, and they point
  opposite ways.** Its on-topic half is a real regression guard worth keeping. Its off-topic half — an unrelated
  question should attach nothing — fails as written, but that failure is the behaviour the maintainer already accepted
  on 2026-08-27 in the "Unrelated questions still get game cards stapled on" entry above; the row and that entry now
  contradict each other, which is for the maintainer to settle by retiring or rewording one of them. Rows
  **KB-VARIANT-01**, **KB-FLOOR-01**, **KB-FOLLOWUP-01**, **KB-TRANSPARENCY-01**, **KB-KILLSWITCH-01**.
- ★ `[KB]` **A Hades boss's note is spelled wrong, so spelling it right gets you told the plugin is guessing** —
  **VERIFY, fixed 2026-09-15, waiting on the maintainer to publish.** The note is titled Megaera now and the library
  was rebuilt and passed its own publish check, but pushing it to the two public download hosts was refused for the
  session by the tool's own permission, so the point release waits for the maintainer to run the publish step. Row
  **MEGAERA-01**: once the point release is installed from the Ollama tab's Update knowledge base, with Hades
  running, ask "How do I beat Megaera?" and check the note attaches with no "no close match" line. On the library
  still installed today, that line still appears. Evidence `docs/test-evidence/plan55-HADES-NAMED-01.json`.
- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY,
  landed 2026-09-15, four commits, unit-tested.** A game known only by name now opens its box; naming the boss
  first opens it on screen, in copied text and in read-aloud; a no-story game named in the question gets the same
  relaxed prompt its risk chip already assumed. **STRAT-SPOIL-TEXT-01 passed on the Deck 2026-09-15, both halves.**
  **STRAT-SPOIL-FIRST-01 passed on the Deck 2026-09-18:** naming Wheatley up front in Portal 2 kept the whole
  answer in plain text from the first streamed word, with no hidden box, and it was still plain after closing
  and reopening the chat; the old "Portal 2 not in the library" note is settled — it was installed all along.
  Evidence `docs/test-evidence/plan61-STRAT-SPOIL-FIRST-01.json`. Left: **STRAT-SPOIL-NAME-01** (a library check
  on 2026-09-18 shows Doom 64: Retribution installed as an emulated shortcut, so it can now be run), and from
  the older **STRAT-SPOIL-DRG-01** block: **DRG-01b/c** (knowledge base off, corpus absent),
  **HADES-UNNAMED-STREAM-01**, and **HADES-UNNAMED-01** (mixed results on 2026-09-15). [Plan
  54](planning/54-spoiler-rules-gaps.md).
- ★★ `[KB]` **"Not in my notes" line** — **VERIFY, built and shipped 2026-09-07, device check failed the same
  day.** The line itself is in the code, but on the Deck nothing could make it appear: ten questions asked first
  all attached a note, so the one question meant to show the line never got the chance. The note search has
  since gained a floor that can refuse a weak match, so there may be a way to show it now — nobody has checked.
  Same shape of problem as the "No tip for this" line in the Bugs list above; run both together next time. Row
  **W2-R5**.
- ★★ `[KB]` **Ten new games checked on the Deck, publish owed** — **VERIFY, ran 2026-09-18.** The
  2026.09.18 library was installed on the Deck straight from the plugin's own folder, not from the
  public download hosts. One question named each of the ten new games and all ten answered from that
  game's own notes, the right wiki named every time. Owed: the maintainer's publish call, then, once
  published, a choice on the SD-card location, since this local install put the library on internal
  storage. Evidence `docs/test-evidence/plan58p1-QA-TEN-GAMES-01.json`.
- ★★ `[KB]` **The note's own words under the reply** — **VERIFY, re-run 2026-09-18.** Header,
  open-scroll and live timing pass. The upward walk fix landed 2026-09-18 (40c23a6), device check
  owed. The tip and one game question in ten still arrived late, after the reply finished, and the
  ladder walk was not run — both still owed. Rows **NOTES-BLOCK-01**–**07**, **TEN-GAMES-01**, in
  [testing-manual.md](testing-manual.md).
- ★★★ `[KB]` **KB download Cancel** — **VERIFY, blocked.** Shipped 2026-08-05. The download finishes in about a second on
  device, so there is no window to press Cancel in. Needs a slower fixture or a throttle. Row **KB-CANCEL-01**.

### Next

- ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch already built.** The answer test's voice
  switch landed 6 September. What's still owed is one run with it turned on, which wave three's main measurement
  run includes — planned as wave three ([48](planning/48-kb-wave-three-session.md)).
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
  licensing, a size budget, packs and the index. [knowledge-base.md](knowledge-base.md) § Phase 8. The first step is
  planned as [58 phase 1](planning/58-phase-1-notes-shown-and-wiki-extracts.md): a reader that takes a wiki's own
  sentences without rewriting them, ten games from sources already cleared, and a study of which sources cover many
  games under one licence. That [source study](archive/research/kb-catalog-sources-2026-09.md) landed 2026-09-17
  and recommends the Super Mario Wiki first, the per-wiki Fandom check second, and the walkthrough wiki third
  once its saved copy has been tried with the reader. The first ten games from those cleared sources landed
  2026-09-18, written from the wiki pages fetched that day, taking the library to 35 games; landing them
  reopened the July no-new-games lock, since the catalog phase starts here (D111).

---

## Shelved

Parked on purpose, not dropped. One line each, with what unshelves it; the full entries are in
[archive/roadmap-shelved.md](archive/roadmap-shelved.md).

- ★ `[platform]` **In-IDE preview never gets past its loading screen** — shelved 2026-09-11 (D93), not a gate
  for anything. Unshelves when the preview loads the plugin on the maintainer's machine.
- ★★ `[ui]` **Glance view: the answer alone, in big text** — shelved 2026-09-12: too much UI change, and not
  ready for it yet. Unshelves on the maintainer's word; the mockup is kept.
- ★★★ `[voice]` **Voices for the bundled characters** — shelved 2026-09-08 (D74). Unshelves after the
  character sweep, a legal check and the open licence call.
- ★★★ `[voice]` **Trained voices for the bundled characters** — shelved with the clip route 2026-09-08 (D74).
  Same legal gate, plus the plugin hosting voice files for the first time.
- ★★★★ `[voice]` **A voice for a custom character** — shelved with the bundled voices 2026-09-08 (D74). Same
  legal gate.

---

<a id="done-for-v050"></a>

## Done for v0.5.0

Everything shipped since v0.4.9 (2026-07-08), one line each — moved out to its own file to keep this one small,
copied line for line, nothing reworded: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).

**Closed 2026-09-18 (reconciliation before plan 61):**

- ★★★★★ `[reply]` **Reasoning display** — **DONE.** Six of the seven Deck rows pass, plus the focus-graph checklist
  and the free-play sweep. The one piece left, REASONING-05's body-text read, is not owed on its own — it rides on
  the chip-ladder Bugs entry above ("The Show details chip ladder is not a D-pad stop") and clears when that bug
  does. [Full detail](archive/roadmap-completed.md#reasoning-display).
- ★★ `[reply]` **Token streaming Phase A/B** — **DONE, passed on the Deck 2026-09-04.** Start stutter fixed, sections
  as D-pad stops, and the transcript follows a growing answer down — everything the rig can drive. The touch-drag
  half of the scroll-follow check needs a finger and stays on the maintainer's own checklist.
  [Full detail](archive/roadmap-completed.md#token-streaming-phase-ab).
- ★★★★ `[tabs]` **The tab bar collapses when not in use, and names the tab** — **DONE.** Every check the rig can
  drive passes: the thin bar, the open strip, and all three remount paths it can force (a real suspend-and-resume
  still needs a hand on the power button). The old legibility-by-eye row folded into the new tab strip's own row.
  Only the touch tap is left, and it is on the maintainer's own checklist.
  [Full detail](archive/roadmap-completed.md#the-tab-bar-collapses-when-not-in-use-and-names-the-tab).
- ★★ `[chips]` **A glow when the chip row runs out of chips** — **DONE.** The cue fires on exactly the right presses,
  measured on the Deck, and now lives as the light bar under the chip flaring brighter rather than the old outline.
  Nothing measurable is left; whether it reads as *end of list* is the maintainer's own taste call, already on
  their checklist. [Full detail](archive/roadmap-completed.md#a-glow-when-the-chip-row-runs-out-of-chips).
- ★★★ `[KB]` **DRG Survivor glossary terms** — **DONE.** Underline, popup, D-pad reachability, B and one-press Up
  all walked on device. The one touch tap left stays on the maintainer's own checklist.
  [Full detail](archive/roadmap-completed.md#drg-survivor-glossary-terms).
- ★★ `[KB]` **The follow-up menu offered places from a different game than the one you asked about** — **DONE,
  two clean sightings on two different days.** A Deep Rock Galactic: Survivor question (2026-09-15) and a Hades
  question (2026-09-17) both came back with the right game's own places, no Half-Life 2 words. Any recurrence is
  a new Bugs entry rather than reopening this one.
  [Full detail](archive/roadmap-bugs-fixed.md#the-follow-up-menu-offered-places-from-a-different-game-than-the-one-you-asked-about).

**Closed 2026-09-18 (plan 61):**

- ★ `[platform]` **Shell state and tab payload extraction (refactor step 8)** — **DONE.** Every tab renders, one
  Ask works end to end, and the Ollama tab comes back clean after a wipe. The one piece left — the About tab's
  own walk down its four links — passed on the Deck 2026-09-18.
  [Full detail](archive/roadmap-completed.md#shell-state-and-tab-payload-extraction-refactor-step-8).
- ★ `[QA]` **Three rows named on this page have no steps written down anywhere** — **DONE.** All three now
  have somewhere to point to: **TAB-BAR-GHOST-01** turns out to have had a full row in the manual testing
  document all along, under its own section; **KB-FOLLOWUP-01** and **KB-KILLSWITCH-01** had steps written
  for them 2026-09-18 and landed as rows in the coverage table. Nothing shipped for this one, so there is no
  code entry to archive.
- ★ `[reply]` **Attaching a screenshot puts a line of technical text at the bottom of the answer** — **DONE,
  confirmed on the Deck 2026-09-18.** A screenshot was attached and asked about, and the reply ended with no
  bracketed debug line. Row **ATTACH-DEBUG-01**.
  [Full detail](archive/roadmap-bugs-fixed.md#attaching-a-screenshot-puts-a-line-of-technical-text-at-the-bottom-of-the-answer).
- ★★★★ `[chips]` **Preset row: two chips across, with scrolling labels** — **DONE.** The decode-mode churn
  check passed on the Deck 2026-09-18 — a flat 60 frames a second, no slow frames — the last thing the rig had
  left to measure; the speed-by-eye half already passed 2026-09-17. What is left, reduced motion and the
  maintainer's own feel for the speed, is on the maintainer's own page.
  [Full detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
- ★★ `[QA]` **Deferred manual QA** — **DONE.** SMOKE-A, SMOKE-F, SMOKE-E and SMOKE-H all pass on the Deck, and
  the three Tier 1 extras now all pass too — the last one, asking "What game am I playing?" with a game
  running, passed 2026-09-18. SMOKE-B was retired 2026-09-03 (D57 #6). What is left, SMOKE-C, rides on the
  still-open Open Permissions jump bug rather than being owed as a check of its own.
  [Full detail](archive/roadmap-completed.md#deferred-manual-qa).

**Closed 2026-09-17 (Deck QA worker):**

- ★★ `[ollama]` **Expert offers the stronger Deck-run models first, and the licence list learns the Sept 2026
  models** — **DONE 2026-09-17.** Both halves now pass on the Deck: the bake-off order (2026-09-16) and the
  Gemma 4 licence reading (2026-09-17). Row **EXPERT-ORDER-01**. [Full
  detail](archive/roadmap-completed.md#expert-offers-the-stronger-deck-run-models-first-and-the-licence-list-learns-the-sept-2026-models).
- ★ `[layout]` **A long reply used to sit almost entirely under the question box on the Deck's own screen** —
  **DONE 2026-09-17.** About 79-87% of a reply now shows above the sticky question box, up from about a
  third. [Full
  detail](archive/roadmap-bugs-fixed.md#on-the-decks-built-in-screen-the-rings-own-stop-for-a-whole-reply-sits-mostly-under-the-question-box).

**Closed 2026-09-16 (the maintainer's third round, D107):**

- ★★ `[KB]` **The new answer shape reads as advice-first** — **DONE 2026-09-16 (D107).** All three test
  sentences — Portal 2, Hades and Black Mesa — came back the same shape: the character's advice starts right
  after their opening line, no warning line, no spoiler box. The maintainer read all three word for word and
  called them advice-first, closing the read this row had waited on since 12 September. Row **KB-ANSWER-03**;
  evidence `docs/test-evidence/plan56-KB-ANSWER-03-three-replies.md`,
  `docs/test-evidence/plan55-KB-ANSWER-03-hades.json`, `docs/test-evidence/plan56-KB-ANSWER-03-blackmesa.json`.
- ★★ `[KB]` **The "no close match" line now shows up only when it should, even when the game is only named in
  the question** — **DONE 2026-09-16 (D107).** Seen live on the Deck's own screen, build `14a6392`, once
  Ollama and the knowledge base were back on the Deck: a stretch question that only names a game gets the
  line, and a real question about that game does not, both directions confirmed. Row
  **HONESTY-TEXT-GAME-01**; evidence `docs/test-evidence/plan56-HONESTY-LINE-03-on-screen.json`.
- ★★★ `[ask]` `[focus]` **Steam settings shortcuts: the card floats, the D-pad walks in and out, tap outside
  to close** — **DONE 2026-09-16 (D107).** All six steps of plan 45 are confirmed on the Deck: the floating
  card, its six-row cap, the D-pad wiring in and out of it, and opening a Steam setting from a row. The one
  open call left — whether the typed words survive a jump back from Steam — is settled: the card keeps
  working the way it does today, so the box is left empty when you come back. Nothing about the card is owed
  any more. Rows **SETTINGS-CARD-01** through **07**. [Plan](planning/45-settings-shortcut-card.md) ·
  [Mockups](https://claude.ai/code/artifact/1ab2a570-2ae5-45cd-b12b-332694f96fd5).
- ★ `[reply]` **The slow-reply footnote reads as a broken sentence — not a bug, 2026-09-16 (D107).** The
  sentence was always whole on screen: "150.8s (>60s): prefer GPU for Ollama, not CPU" reads in full on the
  screenshot `screenshots/DeckCapture_20260916_115628_game.png`. The earlier blank-looking read came from the
  test rig's own label reader splitting the bold words GPU, Ollama and CPU into three separate labels, not
  from the plugin. Evidence `docs/test-evidence/plan56-HONESTY-LINE-03-on-screen.json`.
- ★ `[ollama]` `[ui]` **"Open AI models…" read like "OpenAI models"** — **FIXED 2026-09-16 (D107, commit
  `79b1a0e`), deployed the same afternoon.** The Ollama tab's button now says "Manage AI models…", with the
  policy tier after the dash as before; the button's spoken label, the hint inside the picker and the
  troubleshooting guide all say the same. Reported by the maintainer from the Deck.

**Closed 2026-09-06:**

- ★★ `[KB]` **Prompt diet: the model reads far fewer rules for every fact it knows** — **DONE 2026-09-06.**
  The instructions sent with every game question fell from 6,930 to 5,682 characters: the model is no longer
  asked to cite cards in a way the screen cannot show, and screenshot rules only appear when a screenshot is
  actually attached. A third change — moving the cards next to the question — exists only as a switch that
  stays off by default, because turning it on made the spoiler warning show up correctly far less often.
  Measured before and after on the answer test on this PC, and confirmed on the Deck 2026-09-06: a Hades
  question about a boss with a note came back with that boss's own tactics, the prompt was trimmed to fit,
  and the old silent-drop warning was gone. The row's three answer-test sentences and its screenshot
  question were not run on the device. Commits `61975bf`, `0b96405`, `fcfc9a0`.
