# bonsAI Roadmap

Open bugs, fixes waiting for a check on the Deck, planned features, and everything closed since v0.5.0. Each list is
sorted from one star to six.

- **Knowledge base and RAG:** [roadmap-kb.md](roadmap-kb.md), long notes in [roadmap-kb-details.md](roadmap-kb-details.md).
- **Parked work and watched sightings:** [roadmap-shelved.md](roadmap-shelved.md).
- **Long notes for the items below:** [roadmap-details.md](roadmap-details.md).
- **Closed since v0.5.0:** [Done for v0.6.0](#done-for-v060), full record in [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).
- **Full detail of finished work:** [shipped features](archive/roadmap-completed.md) · [fixed bugs](archive/roadmap-bugs-fixed.md)
- **Maintainer decisions:** [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md) · **QA rows:**
  [testing.md](testing.md), [testing-manual.md](testing-manual.md) · **Release notes:** [CHANGELOG.md](../CHANGELOG.md)
- **Checks only the maintainer can do:** [Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
  Anything a session finds that needs their eyes or fingers is added there, not left in a chat.

<!-- toc: written by scripts/docs_toc.py; do not hand-edit -->
**Contents**

- [House rules for this file](#house-rules-for-this-file)
- [Bugs](#bugs)
- [Features](#features)
- [Verify](#verify)
  - [Bugs that need verification](#bugs-that-need-verification)
  - [Features that need verification](#features-that-need-verification)
- [Knowledge base and RAG](#knowledge-base-and-rag)
- [Shelved](#shelved)
- [Done for v0.6.0](#done-for-v060)
<!-- /toc -->

## House rules for this file

1. **An entry is at most five lines**, in plain language, saying what a user would notice. Longer notes go to
   [roadmap-details.md](roadmap-details.md) (open) or [archive/](archive/) (finished), linked, never deleted.
2. **Three lists: [Bugs](#bugs), [Features](#features), [Verify](#verify).** A new entry goes in the right list at its
   star position (ascending; within a star by tag, then title), with a tag. Knowledge base work lives in
   [roadmap-kb.md](roadmap-kb.md).
3. **Status words in Bugs and Features:** **OPEN** (nothing built) · **PARTIAL** (some built) · **ACCEPTED** (the
   maintainer chose to live with it). Once fixed and unit-tested, an entry moves to **Verify**.
4. **When a Deck check is owed,** the entry moves to Verify in the same commit as the code (name the QA row). **When the
   check passes,** it moves to [Done](#done-for-v060) as one line and the full entry goes to the matching archive file.
   Never leave a finished item in Bugs or Features; never use a strike-through.
5. **Stars** are effort and risk: `★` easiest … `★★★★★` very high; `★★★★★★` extreme scope.
6. **Tags:** `[ask]` Ask bar · `[chat]` chat slots · `[chips]` preset chips · `[docs]` the documents · `[focus]` D-pad and
   ring · `[KB]` knowledge base · `[layout]` Main tab space · `[ollama]` models and routing · `[perms]` permissions ·
   `[platform]` build, deploy, tooling · `[QA]` testing · `[reply]` the answer · `[tabs]` tab bar · `[ui]` everything
   else on screen · `[voice]` voice.
7. **Parked and watched items live in [roadmap-shelved.md](roadmap-shelved.md)**, not here. Move the whole block back
   when it restarts.

**Every Main-tab UI change also owes the free-play sweep** (row **QA-FREE-PLAY-01** in [testing-manual.md](testing-manual.md)):
walk the pane like a user and require every focused stop to also be visible.

**Maintainer note: pick the model before you pick up an item.** The routing table (which model plans, builds and lands
each kind of work) is in [AGENTS.md § 3](../AGENTS.md); the evidence is in [planning/33-model-routing.md](planning/33-model-routing.md).

---

## Bugs

- ★ `[focus]` **The slot under the newest answer swaps between the Show details line and chips between an Up walk and a Down walk** — **OPEN, found 2026-10-08 on the Deck (plan 83 overnight, build `0d3af3de`).**
  Up from the question box stopped on the slot's Show details line; the same walk Down, a few minutes later, stopped on a chip in that place. No dead press and no stop twice, but the two walks did not visit the same stops. Not known what triggered the swap; it may be the designed rule (the line shows only while the answer's own line is out of sight). Evidence `docs/test-evidence/plan83-QA-FREE-PLAY-01.json`.
- ★ `[layout]` **Going back up the Show details chips after reading Developer details to its end, the row slips about 10 px once, at the second chip** — **OPEN, found 2026-10-08 on the Deck (builds `657ef2cb` and `83a2efa7`).**
  The row sits still from the last chip to the third, then moves 10.1 px down at the step to the second chip and stays there. The blank space under the box came out 188 px where 198 was needed (the third chip, with a box of the same height, got 198). The second look two frames later (`83a2efa7`) did not correct it: it either did not run on the Deck or read the same wrong number. Next step: log on the Deck what the sizing reads at that step. Only reachable with Developer details (desktop verbose logging on), so ordinary users do not meet it. Evidence `docs/test-evidence/plan83-P83E-CHIPS-SHRINK-RECHECK2.json` (row P83E-CHIPS-SHRINK, owed).
- ★ `[layout]` **With the chip row held still, the last lines of some chips' boxes sit behind the question box** — **OPEN, a call for the maintainer.**
  From `docs/test-evidence/plan83-P83E-CHIPS-STILL.json`: on entry the first chip's box ends 15 px behind the question box, and Spoiler risk's box 47 px; Developer details is handled by the extra Down. Scrolling for them on each step would bring the jump back. The call: does a still row or seeing the last lines matter more?
- ★ `[reply]` **While an answer arrives, the start of a sentence that ends up behind a spoiler cover can be read for about a second** — **OPEN, seen 2026-10-01 on the Deck (plan 78, Deck block 3a), a note. Not built for 0.6.0 ([D124](audit/maintainer-decisions-locked.md#d124--locked-2026-10-03-raised-2026-10-03--plan-81-the-final-bug-session-before-060-the-ten-calls) call 8); stays open; accepting it is a call (plan 81 question 1).**
  The words shown held no protected name; the name arrived after the words were hidden. Not known whether it was always so. Evidence `docs/test-evidence/plan78-P78-BORROWED-RUNNING-GAME.json`.
- ★ `[reply]` **After an answer is cut and continued, the saved text repeats whole paragraphs across the join** — **OPEN, found 2026-10-08 on the Deck (plan 83 overnight, build `0d3af3de`).**
  With the Strategy limit lowered to 340, one long answer was continued twice and its saved text (4067 characters in 4 pieces) held the same paragraphs twice: the third piece repeats a long stretch of the second word for word, and the fourth repeats it again. A second answer repeated one sentence at its one join. Looks like the AI restating text when it carries on; not yet known whether the plugin should trim it. Evidence `docs/test-evidence/plan83-P81-CONTINUE-ONE-MARK.json`, try 1.
- ★ `[platform]` **A plugin reload while a game is running can put Steam's Home screen in front of the game** — **OPEN, found 2026-09-28 (plan 75). Developer-only: a player has no route to it (2026-10-03).**
  Seen three times. Once the game came back through the Steam menu (`docs/test-evidence/plan38-M1-deck.json`). Once it never showed a window (`docs/test-evidence/t75-feature-F1-REAL-POPUP.json`). Once, on 2026-09-29, one A on Resume brought it back (`docs/test-evidence/plan77-P77-TRAP-LONG.json`).
  **2026-10-03 (plan 81, Deck block 6, build `7e963807`):** two developer reloads with Deep Rock Galactic: Survivor running did not bring Steam's Home screen in front: the game's window stayed in front both times. Decky's plugin list has no reload control, and its settings page showed empty with a game running, so a player has no route to a reload. The maintainer's call on marking it accepted is open (plan 81, question 3). Evidence `docs/test-evidence/plan81-P81-RELOAD-LOOK.json`.
- ★ `[ui]` **Picking a setting from the settings card opens the right Steam settings page but does not scroll to that setting** — **OPEN, found 2026-10-08 on the Deck (plan 83).**
  A on "Enable GPU Crash Report Collection" opened Steam's System page at the top, with the toggle about 320 px below the screen edge. Not known whether Steam's link can scroll to a setting at all. Evidence `docs/test-evidence/plan83-P83-J1-SETTINGS-CARD.json`.
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** — **OPEN, failed by hand 2026-09-23 (build `a224fb6`).**
  After Show details → Session, both tab bars stayed drawn at once. The D-pad half did not reproduce (2026-09-28, 2026-09-29); the touch half needs a finger and is on the maintainer's checks page (plan 77).
  Row **TAB-BAR-GHOST-01** in [testing-manual.md](testing-manual.md). Older notes: [details](roadmap-details.md#a-faded-ghost-of-the-tab-bar-is-left-drawn-over-the-chip-row-after-touching-the-screen).
  **2026-10-03 (plan 81):** one pretend touch through the debug link on the Session tab: no ghost, one tab bar drawn throughout. The touch was on the tab already showing, so a touch on a different tab is not proven. Stays the maintainer's finger check. Evidence `docs/test-evidence/plan81-P81-LOOK-TAB-GHOST.json`.
- ★★ `[focus]` **Up from the answer bubble, with Steam's ring on the whole answer, scrolls the whole answer instead of moving the ring** — **OPEN, found 2026-10-02 while fixing the trap (plan 79); not a trap, since the press does something.**
  Not fixed. A test comment calls it by design (Up leaves the bubble after scrolling it back). The maintainer will check it by hand later. Seen in the test setup's walk, not on the Deck. No evidence file.
- ★★ `[focus]` **Up from the bottom of the About tab cannot get back to the top** — **OPEN, found by the maintainer 2026-10-06 on the Deck.**
  With the ring on the last control of the About tab, "Support my Steam Sale habit" under the QR picture, Up does nothing, so the top of the tab is out of reach by D-pad. Evidence `docs/test-evidence/maintainer-2026-10-06-about-tab-bottom.png`.
  **2026-10-07 (plan 82, Deck block 1, the Deck on an external monitor):** did not reproduce with the rig: from the D-pad route (Down to "Support my Steam Sale habit"), Up moved to "Bugs & Feature Requests", three of three. The maintainer's screenshot shows no ring on any control, so the route matters (a scroll by right stick or touch first?). Stays OPEN; question for the maintainer (plan 82, question 5). Evidence `docs/test-evidence/plan82-M1-ABOUT-UP.json`.
- ★★ `[platform]` **Reloading the plugin while a heavy game is running can leave Steam's interface gone until the Deck is restarted** — **OPEN, seen once, 2026-10-01 12:29 (plan 78, Deck block 3e). Developer-only: a player has no route to it (2026-10-03).**
  Black Mesa running, about 550 MB free of 14.8 GB, the rig's plugin reload, then no Quick Access page for six minutes or more; the maintainer restarted the Deck. Evidence `docs/test-evidence/plan78-THINKING-SLOW-01.json`.
  A real player never reloads the plugin this way (it is a developer action), so this is first a rule for the Deck driver. Whether an ordinary Steam restart of the plugin under low memory can do the same is not known.
  **2026-10-03 (plan 81, Deck block 6, build `7e963807`):** a developer reload with a game running did not freeze Steam in either try, so the 2026-10-01 freeze was not reproduced. The maintainer's call on marking it accepted is open (plan 81, question 3). Evidence `docs/test-evidence/plan81-P81-RELOAD-LOOK.json`. Older notes (block 3d, and the reload timings): [roadmap-details.md](roadmap-details.md#reloading-the-plugin-while-a-heavy-game-is-running-can-leave-steams-interface-gone-until-the-deck-is-restarted). Related: the entry above about the Home screen in front of a game.
- ★★★ `[platform]` **Steam's screen froze after an answer with a game running and the Deck's own AI** — **OPEN, seen once on the Deck 2026-10-03 (plan 81, build `afd2f444`); not reproduced in two later runs.**
  Deep Rock Galactic: Survivor running, the notes library moved aside for a check, a 55-second answer from the AI on the Deck. The answer finished; over the next three minutes free memory fell from about 2 GB to under 1 GB, Steam's page processes ran at full load, and Steam's screen stopped answering until the Deck was restarted. No plugin reload was involved.
  Cause not known yet; a page script the test rig had put on the page is one suspect. Related: the two entries above about reloading the plugin while a game is running (the Home screen in front of the game; Steam's interface gone until the Deck is restarted). Evidence `docs/test-evidence/plan81-DRG-01c.json`.
  **Not reproduced in two runs (plan 81, Deck block 6, build `7e963807`):** the same low-memory state as the freeze, once with nothing else on the page and once with a page watcher; Steam answered every read for 12 minutes. The original freeze started from about 2.0 GB free, which these runs did not reach. Evidence `docs/test-evidence/plan81-P81-FREEZE-AFTER-ANSWER.json`. Older notes (the hunt, memory in blocks 3b, 4b and 6): [roadmap-details.md](roadmap-details.md#steams-screen-froze-after-an-answer-with-a-game-running-and-the-decks-own-ai); the hunt itself is in the [audit note](audit/plan81-freeze-after-answer.md).

---

## Features

**Standing goal from the maintainer (2026-08-30):** buy back as much vertical room for the chat bubbles as possible; every
`[layout]` entry serves it. Items rated ★★★★★ or above carry a placeholder link to [bonsAI Issues](https://github.com/qd313/bonsAI/issues) in the archive;
replace it with a specific issue when one exists.

- ★ `[ask]` **Intent packs later review** — **OPEN.** The quiet search aliases still ship. The maintainer decides whether to delete them, leave them quiet, or revive them under Developer ([D79](audit/maintainer-decisions-archive.md#d79--locked-2026-09-06-raised-the-same-day--the-steam-settings-shortcuts-move-above-the-question-box)).
  The bundled Deck basics list ships switched on and is the only reason a whole sentence matches a setting: *can you help me with performance* returns three results (2026-09-06).
  Not in scope: bringing back Proton journal inject without a redesign. [Detail](archive/45-settings-shortcut-card.md#5-two-things-about-the-search-that-are-not-obvious).
- ★ `[platform]` **Two small build-setup tidy-ups left, deferred on purpose in 2026-08** — **PARTIAL, carried over 2026-09-24 from plan 24 when it was archived.**
  Nothing a person would notice. **Done 2026-10-02 (plan 79):** the version file is written only when it really changes (`b4e838a2`, `49fc8894`), and the old `pnpm.peerDependencyRules` block is gone from `package.json` (`f3541fd`).
  **Still open, for the first session after 0.6.0:** name the package manager's version in `package.json`, and move `packages/bonsai-mcp` off npm. Both need a GitHub run to prove, which a session cannot make (plan 79, question 13). [Plan § 5](archive/24-track-a-ci-baseline.md).
- ★★ `[chat]` **A quiet cue that a cut question can be opened** — **OPEN, filed 2026-09-05 by the maintainer.** When the ring lands on a question cut short, nothing says the rest is there.
  Chosen from four drawn options: the text fades at the right-hand edge only while the ring is on it, nothing for a finger.
  The same fade already exists for cut-off answers. One check owed first: the question bubble turns its own outline off, so look on the Deck at what focus shows.
- ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.** The create position is the
  literal `[+]` (re-confirmed on board 8f; no decision heading of its own). Reopen that decision before building it.
  [Detail](roadmap-details.md#first-run-ghost-new-chat-label).
- ★★ `[chat]` **Search in bonsAI** — **OPEN, asked for by the maintainer 2026-10-02; not built in plan 79.**
  A find box to jump to an earlier question by a word in it, with word buttons built from the questions so a word can be picked with the D-pad alone (A on a text box opens Steam's on-screen keyboard). Option 4 at https://claude.ai/artifact/CjiVzMEe8UipPda2kS2q18.
- ★★ `[chips]` **The four chip styles still differ in small ways, and share no drawing code** — **OPEN, held until after the release ([D121](audit/maintainer-decisions-locked.md#d121--locked-2026-09-30-raised-2026-09-30--plan-78-a-wider-bug-session-and-an-unattended-deck-pass-the-eleven-calls) call 10).**
  Folding them into one shared engine is a reshaping of code, so it waits. The rules for which chip comes next and how long it stays were already made the same in plan 78.
  What else differs (restart after an answer, wait after the highlight leaves, recent chips avoided, how each first appears) has not been re-checked against the code since.
- ★★ `[ollama]` `[ui]` **The AI models box: a clearer Filters button with an icon, and a filters step that cannot be left by mistake** — **OPEN, the maintainer's call 2026-10-06.**
  The Filters button is easy to miss. With the filters open, a player can miss the close-filters button and press Done, which leaves the whole box, so the filter choice is lost and has to be redone before the right button is found.
  Wanted: the button more prominent, with an icon; and Done while the filters are open closes the filters and returns to the list, never the whole box. No screenshot.
- ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed 2026-09-08. Not yet ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip)): it waits for its own go.**
  The model would open every answer with one short sentence that carries the point and gives nothing away. The 2026-09-12 count: 2 of 10 answers already did, 0 of 10 gave anything away. By the maintainer's own rule that means build it, but they said not yet.
  [Detail](roadmap-details.md#headline-first-every-answer-opens-with-one-line-that-stands-alone).
- ★★ `[reply]` **Should a streamed answer keep its layout when it finishes?** — **OPEN, a decision, carried over 2026-09-24 from plan 05 when it was archived.**
  Today an answer is laid out one way while it arrives and again when it finishes. Written before September's reply changes: read today's code first, it may be moot. No decision recorded.
  Touches [plan 69](planning/69-streamed-answers-scramble.md). [P6](archive/05-token-streaming-review.md).
- ★★ `[reply]` **The folded reasoning line in the character's own voice** — **OPEN, optional, filed 2026-09-16 ([D106](audit/maintainer-decisions-locked.md#d106--locked-2026-09-16--after-the-fourth-feature-session-the-plain-reasoning-fold-first-the-session-as-a-tab-the-cards-six-rows-a-read-aloud-button-and-one-call-left-open)).**
  The plain folded line has shipped (Reasoning display, closed 2026-09-18), so this can be picked up. The mockup showed the line written in a character's voice, for example "See the booyakasha · 41 s" for Ali G.
  Not decided: a fixed phrase per character, or the model asked once each time. It must fall back to the plain line when the character is off or the phrase is missing. [Mockup page](https://claude.ai/artifact/2De58qirE34754PEZVPmdb).
- ★★ `[reply]` **Which bundled characters copy a real person** — **OPEN, filed 2026-09-08 ([D74](audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open)); the gate for the shelved character voices.**
  All 31 characters are named characters from games or TV, each voiced by a real actor. Owed: a one-line-per-character sweep of who owns it, whose voice it is, and whether a voice could be a type rather than a copy. No code; a document the legal check reads. [Memo](planning/42-read-aloud-feasibility.md).
  Not needed for 0.6.0 (plan 72): characters are text only. Still the gate before any character gets a voice.
- ★★ `[voice]` **Spoilers by voice** — **OPEN, filed 2026-09-08; waits on Voice follow-ups.**
  When a spoken answer reaches a hidden spoiler it says so and waits; "go on" unhides and reads it, anything else skips it. The block on screen unhides with the spoken one, so the two never disagree. The Deck alone is enough to test. [Plan](planning/49-steam-frame-features.md).
- ★★ `[voice]` **Voice follow-ups** — **OPEN, filed 2026-09-08; Read answers aloud shipped 2026-09-12.**
  For a few seconds after a spoken answer ends, the mic listens for four words: again, go on, stop, next. A short rising tone when it opens, a short falling tone when it closes. One setting, off by default.
  Hangs off the middle position of the Voice replies setting ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip)). [Plan](planning/49-steam-frame-features.md) · [Second look § 3](planning/52-frame-features-second-look.md#3-voice-follow-ups-a-sound-a-short-listen-a-few-words).
- ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — **OPEN, research spike.** Hold models loaded, or unload when a game takes
  focus on the Deck APU? The spike decides go or no-go; no production unload before it. Pairs with "What bonsAI costs a running game".
  [Detail](roadmap-details.md#ask--reply-items-with-short-entries-as-filed).
- ★★★ `[ollama]` **Per-mode latency timeouts** — **OPEN, weighed and deliberately not built 2026-09-05.** Separate warning and
  give-up values per Ask mode. Dropped on purpose: the two values already run through sixteen files each and going per mode
  triples them, and it changes when a warning shows rather than what the plugin can do.
- ★★★ `[ollama]` **What bonsAI costs a running game** — **OPEN, asked for and measured 2026-09-20.**
  Writing an answer takes about a third of the frame rate in God of War (31 to 20 and back), and the answer itself slows to about a third of its speed. Memory is the other half: 206 MB spare before the model loaded. Giving the model more room costs nothing in frames.
  With Deep Rock Galactic: Survivor on a menu mid-mission (2026-10-02) the game held 43 to 44 frames a second against 45 idle. Not yet tried in a real fight. Evidence `docs/test-evidence/plan79-SCR-10-MISSION.json`.
  The real questions: what to reserve, and whether to say plainly what a question costs. Pairs with keep-alive. Older notes: [roadmap-details.md](roadmap-details.md#what-bonsai-costs-a-running-game).
- ★★★ `[platform]` **bonsAI's own icon in the Quick Access Menu** — **OPEN, re-planned 2026-09-23, was ★★★★★★.**
  The free plugin Quick Tab already pins any Decky plugin as its own menu icon, so the wait on Decky's team is over. Left: a Deck test, then small fixes.
  Read from the code, not yet seen: in its own tab the reply-ready notice pops up while you look at the answer, and tapping it opens Decky instead. [Plan 66](planning/66-quick-tab-own-menu-icon.md).
- ★★★ `[reply]` **The Spy opens as somebody else** — **OPEN, split off 2026-09-15 ([D105](audit/maintainer-decisions-locked.md#d105--locked-2026-09-15--the-fourth-feature-session-two-features-drawn-instead-of-built-the-spys-reveal-the-lighter-clear-and-the-wipe)).**
  On a random chance his first message introduces him as a different character from the list and he keeps it up. A character has no first message today, so this needs a greeting feature first.
  Decide before building: how often, whether the picker still shows Spy, and how the reveal reads.
- ★★★ `[reply]` **Terse mode: Speed answers in three lines** — **PARTIAL, the switch passed on the Deck 2026-10-08 (plan 83, row P83-J4-TERSE-TOGGLE, evidence `docs/test-evidence/plan83-P83-J4-TERSE-TOGGLE.json`); the answer test ran three times that night and the length cap holds on most answers, not all.**
  Built: a "Terse mode" switch on the Ollama tab under the Reply style slider, off by default. With it on, a Speed answer is asked to keep to three lines and end with a menu of choices, first answers and follow-ups alike; Strategy, Expert and Speed with it off are as before. Answer test, ten questions with Deep Rock Galactic: Survivor running (plan 83 overnight, 2026-10-08): run 1 (build `0d3af3de`) 10 of 10 within three lines, choice buttons on 4 of 10, three menus shown as raw text; run 2 (`2ccf4075`) 9 of 10 within three lines, buttons on 1 of 10, nine menus shown in a code box; run 3 (`21f62344`) **buttons on 10 of 10 and no raw menu text**, but **7 of 10 within three lines** (8 needed; the three misses ran 4 lines). Cause of the missing buttons: the AI spelled the menu's fence name with an underscore, which the plugin did not read; `21f62344` reads either spelling. Across the three runs 26 of 30 answers fit. Evidence `docs/test-evidence/plan83-P83N-TERSE-01.json`, `P83N-TERSE-01-AFTER-FIX.json`, `P83N-TERSE-01-FIX2.json`. [Detail](roadmap-details.md#terse-mode-speed-answers-in-three-lines).
  **Still owed:** (a) the maintainer's call on the length result: TERSE-01 as written (8 of 10 in one run) passed on length in 2 of 3 runs and failed in 1, so it is not marked passed; (b) the stacked full-width buttons (screen work, needs a Deck measurement first); (c) a menu press sends a follow-up saying "I'm at: <label>" and asking for an "If you want to cheat" section, which the terse wording has to talk the AI out of; (d) in the endless terse loop each menu press stores the whole previous composed question as "Earlier I asked", so the question grows with every press (the question is stored in `src/hooks/useBonsaiAskOrchestration.ts`, about line 776, and quoted back in `src/hooks/useStrategyBranchActions.ts`, about line 113); (e) with Terse on, the AI often repeats a menu from an earlier answer ("Which weapon should I focus on first?" under unrelated questions, `docs/test-evidence/plan83-P83N-TERSE-01-AFTER-FIX.json`); (f) the maintainer's call on whether to keep the reader for a menu written as bare JSON with no fence (`2ccf4075`, tested): that case was never actually seen, it rested on run 1 being misread.
- ★★★ `[ui]` **Adjustable text size in Settings** — **PARTIAL, hidden for 0.6.0.**
  A UI scale section exists (Handheld or Couch size, Apply button) and returns with the Developer tab on (`CHANGELOG.md`, hidden-for-0.6.0 note; commit `12227980`).
  Still open: whether two steps are enough for reading at a distance, what must not scale (icons, the 300px column), and whether to show it again. [Detail](roadmap-details.md#adjustable-text-size-in-settings).
- ★★★ `[ui]` **Search density** — **OPEN.** Tighter, more scannable results with highlighted match tokens.
  [Detail](roadmap-details.md#focus--deck-ui-items-with-short-entries-as-filed).
- ★★★ `[voice]` **Full-quality reading from a LAN PC** — **OPEN, deliberately not built 2026-09-08 ([D74](audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open)); reopened only if the local port fails its Deck test.**
  A speech server on a PC in the house would read answers in the full character voice, far faster than real time. Never the default: not offline.
  Dropped on purpose: a second program on the person's PC with its own heavy install and an address to paste into Settings. The entry stays so the reason is on record. [Memo](planning/42-read-aloud-feasibility.md).
- ★★★ `[voice]` **Headset mode** — **OPEN, filed 2026-09-08; waits on Wake-word listening and the Frame ([D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) call 3).**
  One switch turns on the wake word, reads every new answer aloud, and asks the model to answer for the ear: two or three sentences, no lists. Made for a visor on your face and a Deck across the room. No headset is being bought for now. [Plan](planning/49-steam-frame-features.md).
- ★★★ `[ollama]` **How fast is this model on this Deck** — **OPEN, planned 2026-09-06, six calls open ([D75](audit/maintainer-decisions-locked.md#d75--open-raised-2026-09-06--the-model-speed-readout-six-calls-before-anything-is-built)).**
  Next to each installed model: how fast it answered on this Deck last time, and a button to time it now with one fixed question. A last-ten record per model, a badge in the picker, a plain line under Show details; nothing is reordered. [Plan](planning/43-model-speed-readout.md).
- ★★★★ `[ask]` **Connection doctor** — **OPEN, planned 2026-09-05, calls locked ([D64](audit/maintainer-decisions-archive.md#d64--locked-2026-09-05-raised-2026-09-05--the-connection-doctor-and-the-health-report-seven-calls-before-go)).**
  When an Ask fails, a **Fix this** button under the reply runs the checks the plugin already has and shows the one that failed. It offers one next step, with a button that lands you on that control in the Ollama tab. Nothing changes without a press.
  It also holds **Save a report** (a button and a typed command): a read-only report of the setup, written to the Desktop. This is the old **Deck health snapshot**, folded in. [Plan](planning/39-connection-doctor.md).
- ★★★★ `[ask]` **Session context and user stash** — **PARTIAL.** The live half exists: the Session context strip shows how many turns the chat carries, with a Clear button ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip)).
  Not built: notes you write and edit yourself that Ask reads. No embeddings, no cloud.
- ★★★★ `[ask]` **A spoiler-chance rating for the chat's own summary** — **OPEN, not started ([D118](audit/maintainer-decisions-locked.md#d118--locked-2026-09-24-raised-2026-09-24--plan-68-the-chat-sums-itself-up-the-calls-from-discovery) call 14).**
  The chat now sums itself up on its own (done, see the archive entry below); rating how likely that summary swept up a spoiler is a later plan of its own.
  [Detail](archive/roadmap-completed.md#the-chat-sums-itself-up-instead-of-being-cleared-closed-2026-09-26).
- ★★★★ `[layout]` `[tabs]` **Give the reclaimed height to the transcript** — **OPEN, planned 2026-10-08 ([plan 84](planning/84-more-room-for-the-answer.md), calls in [D126](audit/maintainer-decisions-locked.md#d126--locked-2026-10-08-raised-2026-10-08--plan-84-more-room-for-the-answer-the-calls-from-seven-mockup-rounds)). Step 1 is three Deck tests, waiting for the maintainer to free the Deck.**
  On the Deck's own screen the answer gets 204 of the panel's 454 points. Picked over seven mockup rounds: the tab bar moves into the empty strip at the top, the chat's name goes in Decky's title bar, the ASK button and the context line fold into the question box, and Read aloud moves into the answer's corner.
  The answer then gets 297 points, about twice the words of a long answer on screen. [Drawing](https://claude.ai/artifact/EoRoxs11bVjfyBZ28tkM5P) · [Detail](roadmap-details.md#give-the-reclaimed-height-to-the-transcript).
- ★★★★ `[ollama]` **LAN custom model pull** — **OPEN, blocked on a choice among four ways to pull a model onto another computer on your network. No decision recorded.**
  The picker for typing a custom model name on the Deck itself already shipped. This is the same for a remote Ollama host. The four ways are written out in [the long notes](roadmap-details.md#ask--reply-items-with-short-entries-as-filed).
- ★★★★ `[perms]` **Web permission** — **OPEN, discovery written, nothing built.**
  An opt-in so Ask can fetch live answers about current patches and news. With it off, Ask and the local knowledge base work offline as today. The Kids lock forces it off. No decision recorded.
  [Discovery](planning/web-permission-discovery.md) · [Detail](roadmap-details.md#permissions--safety-items-as-filed).
- ★★★★ `[platform]` **Llama.cpp provider spike** — **OPEN, research only; stays closed ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip) call 1).**
  A go or no-go on running models through llama.cpp instead of Ollama on the Deck. Prior study: [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md) · [Detail](roadmap-details.md#platform--upstream-items-as-filed).
- ★★★★ `[platform]` **Steam Input layout parse** — **OPEN, not started.** Read the controller layout files so Ask knows what each button does in the running game.
  Not in scope: writing or changing controller layouts.
- ★★★★ `[QA]` `[platform]` **Finish the controller test rig** — **PRIORITY 1 (maintainer, 2026-09-24). PARTIAL: built and driving every Deck session.**
  Left from [plan 19](planning/19-controller-macro-test-rig.md): a recording that is also a live view, checking the highlight from the video, handheld runs over Bluetooth, and the nightly unattended run. The walk replay now works across builds (Deck 2026-09-26, [plan 70](archive/70-kb-wave-four-and-deck-test-wave.md)).
  The first nightly run on 2026-09-26 ran by itself, but the 30 walks checked nothing yet (the panel was not reopened first). Row **OVERNIGHT-RUN-01** in [testing.md](testing.md); evidence `docs/test-evidence/overnight-2026-09-26-200443.md`.
  [Detail](roadmap-details.md#overnight-runs-first-real-run) · [Program](planning/21-ai-owned-testing-program.md) · [History](roadmap-details.md#controller-macro-test-rig-and-live-view).
- ★★★★ `[reply]` **A note pinned in space** — **OPEN, filed 2026-09-08; needs the floating panel first.**
  In a headset, park the answer on a wall or table so it stays there while you play. The pretend headset can show it fixed in the room; a real headset judges whether it reads. No headset is being bought for now ([D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) call 3); this waits for the Frame. [Plan](planning/49-steam-frame-features.md).
- ★★★★ `[reply]` **A wrist panel** — **OPEN, filed 2026-09-08; needs the floating panel first.**
  In a headset, a small panel rides on one controller: turn your wrist, read, drop your hand and it is gone. Only testable with a real headset and tracked controllers. This waits for the Frame ([D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) call 3). [Plan](planning/49-steam-frame-features.md).
- ★★★★ `[ui]` **SteamOS Share path** — **OPEN, not started.** A faster way from Steam's Share and capture screens into attaching a screenshot, where Steam's own tools allow it.
- ★★★★ `[ui]` **SteamOS spin hint card** — **OPEN, not started.** Notice a locked-down SteamOS variant and show a card that links to the right troubleshooting.
- ★★★★★ `[ollama]` **On-Deck model benchmark** — **OPEN, cut down on 2026-09-06; the call to retire it is open ([D75](audit/maintainer-decisions-locked.md#d75--open-raised-2026-09-06--the-model-speed-readout-six-calls-before-anything-is-built)).**
  The idea: rank installed models by measured speed and offer that as the try order. Its own test said: if timings do not hold still, shrink it to a one-time readout. That readout is now its own three-star entry, [plan 43](planning/43-model-speed-readout.md).
  Desk study of this quarter's models: [plan 41](planning/41-deck-model-survey.md) (calls [D72](audit/maintainer-decisions-archive.md#d72--locked-2026-09-05-raised-2026-09-05--newer-models-for-the-deck-what-to-pull-and-measure)). [Detail](roadmap-details.md#deck-health-snapshot-local-reply-tts-on-deck-model-benchmark).
- ★★★★★ `[perms]` **VAC Phase 2: opponent IDs** — **OPEN, research.** Show who you are playing against so you can check their ban record, when the game's data allows it.
  Phase 1 (type in the IDs yourself) is done.
- ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN, not started.** Answers worded for the new controller and its Steam Input layouts.
  [Detail](roadmap-details.md#the-five-star-and-six-star-platform-items-as-filed).
- ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; the bench works, nothing is built.**
  bonsAI's panel floating over any VR game, drawn by a small PC program, not a Decky plugin. **Locked rule ([D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule)):** it goes only through SteamVR's own panel door and never touches the game, to avoid an anti-cheat ban.
  Bench 2026-09-12: a sample answer appeared in the headset view. Still unknown: pointing at it (needs a real headset) and whether the notification card drew. [Findings](planning/53-steamvr-bench-findings.md) · [Detail](roadmap-details.md#the-floating-panel-inside-steamvr).
- ★★★★★ `[QA]` `[platform]` **Stand-in Decks on the maintainer's PC** — **OPEN, planned 2026-09-23, nothing built.**
  Up to four virtual Decks so several AI sessions can test at once instead of queuing for the one Deck. Phase 0 first: one stand-in on Windows; if that fails, a Linux dual boot. Comes after the controller test rig. [Plan 67](planning/67-stand-in-decks.md).
- ★★★★★ `[voice]` **Wake-word listening** — **OPEN, beta; the study says conditional go, nothing built.**
  Opt-in, always listening on the Deck for the word "bonsAI", then it hears your question and asks quietly. [Feasibility](planning/10-wake-word-listening-feasibility.md).
- ★★★★★★ `[platform]` **Deep mod AI hints** — **OPEN; the study says go on a smaller first version, nothing built.** Spot which mod tools a game uses, so answers can be mod-aware.
  [Feasibility](planning/12-deep-mod-ai-hints-feasibility.md).
- ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening
  llama.cpp** — **OPEN, filed 2026-09-08. Not yet ([D99](audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip), 2026-09-12): nothing is built until the maintainer says.**
  The question: does bonsAI grow a second way to run? Today the Python side has no network door, so a PC panel would have a screen and no brain.
  The price is known: the Python side ran on a Windows PC and all nine calls came back working. Still missing: a starter program and a way for a panel to reach it. [Detail](roadmap-details.md#one-decision-for-three-items-the-steamvr-panel-leaving-decky-and-reopening-llamacpp).
- ★★★★★★ `[platform]` **Remote Play diagnostics layer** — **OPEN, not started.** When you stream a game, answers weigh encoding delay and whether the fix belongs on the host or the client.
  Noted in [09-steam-frame-companion-feasibility.md](archive/09-steam-frame-companion-feasibility.md) § B8.
- ★★★★★★ `[reply]` **In-game answer surface** — **OPEN, research only.** Read an answer without leaving the game. The full overlay waits on Valve's side.
  The toast slice has shipped (the answer's first lines in the popup, passed on the Deck 2026-09-28, [archive](archive/roadmap-completed.md#the-answers-first-lines-in-the-reply-ready-toast-closed-2026-09-28)).
  The same surface in a headset is **The floating panel inside SteamVR**; see [plan 49](planning/49-steam-frame-features.md).

---

## Verify

Fixed, unit-tested and shipped, but not yet confirmed on the Deck. Owed QA row named in each entry; full evidence in
[testing.md](testing.md) / [testing-manual.md](testing-manual.md). Once a Deck run confirms one, move it in the same commit: a line into
[Done](#done-for-v060), the full entry into the matching archive file, drop it from here.

### Bugs that need verification
- ★ `[focus]` **A press that never opens its box (parental lock on) can leave a stale "return the ring here" note behind** —
  **VERIFY, fixed for all buttons 2026-09-29 (plan 77, tip `7c8ac206`).**
  A press that opens no box no longer leaves a note that throws the ring back later. Earlier fixed (`6ef8cedf`) for the library's Update and "Pull nomic-embed-text" buttons; now also "Update AI & models" and the Tier 1 and Tier 2 install buttons.
  Passed on the Deck 2026-09-29: the box half. Still owed: the parental-lock half, which needs Steam Family View with a PIN (maintainer's checks page). Row **P77-OLLAMA-NOBOX-NOTE** in [testing.md](testing.md). Full note: [roadmap-details.md](roadmap-details.md#a-press-that-never-opens-its-box-parental-lock-on-can-leave-a-stale-return-the-ring-here-note-behind).
- ★ `[focus]` **Down onto the slot's Show details line above the question box** — **VERIFY, tests plus a partial Deck pass on 2026-10-08; fixed 2026-10-03 (plan 81, `2a638774`, `88fd0c8f`). The other half of the entry now in Done, "Down from an answer's last control could land on a hidden suggestion chip, and Up was not Down reversed".**
  The press from an answer's last control, or from the ban-lookup row, now goes to whatever the slot above the question box shows: the answer's own Show details line, or the chips. The case did not come up on the Deck: the answer had a notes block, so the slot showed chips.
  Row **QA-FREE-PLAY-01** (no-game half) in [testing-manual.md](testing-manual.md). Tests: `src/features/details-slot/DetailsSlot.deck.test.tsx`, `src/utils/permHintRowNav.test.ts`. Evidence `docs/test-evidence/plan81-QA-FREE-PLAY-01-NOGAME-try2.json`.
  **Deck 2026-10-08 (plan 83 overnight, build `0d3af3de`, no game): the slot's line came up this time.** Up from the question box landed on it, whole on screen; Down from it went to the question box and Up came back; A opened the details and B closed them with the ring kept. **UNCLEAR, still owed:** "same stops both ways", because the slot swapped from the line to chips between the Up walk and the Down walk (filed in Bugs). Evidence `docs/test-evidence/plan83-QA-FREE-PLAY-01.json`.
- ★ `[focus]` **Walking Up can land on a section taller than the screen with only a sliver of it showing at the top** — **VERIFY, fixed 2026-10-03 (plan 81, `5653fd18`). Was OPEN, found 2026-09-30 in the test setup (plan 78 helper D), not seen on the Deck.**
  Going Up onto a section taller than the room, the section was left where it was when its end stood above the dock, so only 1 to 8 px of it showed under the header. Its end is now brought down to the dock, never past the top of the page. Up from the first underlined word inside a tall section is a different path and is unchanged.
  Test: `src/utils/answerBubbleNavigation.tallEndAboveDock.test.ts` (34 of its 46 cases fail without the change); one older test moved (a 700 px section with its last 50 px showing now has its end brought to the dock). **Tests only (the case could not be made on the Deck: tallest section 120 px of 202 on 2026-10-03, `docs/test-evidence/plan81-P81-M-K2K3-NOGAME.json`):** row **P81-UP-NO-SLIVER**. A prepared answer could not make this case: the sliver needs a section placed just past the top of the screen (layout, not words).
- ★ `[ollama]` **Moving a place in the AI models box while the AI runs on a PC wiped the saved places of models only the Deck has (and the other way round)** — **VERIFY, found and fixed 2026-10-03 (plan 81, `d6c9698a`), on the way to "Removing a model on the Deck also drops its name from the saved try order" (now in Done).**
  A place change now keeps the saved names this machine does not show. Test: `src/features/model-routing/useTryOrderPlaces.test.tsx`.
  Deck check owed: row **P81-MOVE-KEEPS-OTHER-NAMES**. **2026-10-03 (build `5eca4271`), UNCLEAR:** moving a place with the AI on the PC kept all 15 saved names, but no saved name was missing from the PC's list, so the case this entry is about did not arise; tests only for that. Evidence `docs/test-evidence/plan81-P81-MOVE-KEEPS-OTHER-NAMES.json`.
- ★ `[ollama]` **The clean-up of saved try orders also runs when Ollama is not set up on the Deck at all** — **VERIFY, tests only; fixed 2026-10-03 (plan 81, `2d90ef25`). Was the second half of the entry now in Done, "A model taken off the PC leaves the saved try orders" (the maintainer's call 7, [D124](audit/maintainer-decisions-locked.md#d124--locked-2026-10-03-raised-2026-10-03--plan-81-the-final-bug-session-before-060-the-ten-calls)).**
  A Deck that has no Ollama of its own and uses only a PC's AI now gets the same clean-up after Test connection: a name gone from the PC leaves both saved orders, and a name another saved PC still has stays. A Deck whose AI is installed but stopped is left alone, as before.
  **Tests only:** a Deck with no AI installed is not available to the rig, so no Deck check can show it: row **P81-PC-CLEANUP-NO-OLLAMA** (tests only). Test: `tests/test_deck_try_order_cleanup_keeps_pc_names.py`.
- ★ `[ollama]` **When a saved PC does not answer, removing a model on the Deck drops nothing from the saved try orders** — **VERIFY, tests only; fixed 2026-10-03 (plan 81, `d2568cbd`, `302caf6a`). The second half of the entry now in Done, "Removing a model on the Deck also drops its name from the saved try order".**
  A saved PC that is switched off or not answering cannot be asked whether it has the model, so the trim now leaves both saved orders alone. A PC that is off is not available to the rig, so no Deck check can show it: row **P81-REMOVE-KEEPS-PC-SILENT** (tests only). Tests: `src/components/PullModelsModal.removeKeepsPcName.test.tsx`, `tests/test_deck_try_order_cleanup_keeps_pc_names.py`.
- ★ `[reply]` **A typed follow-up shows the AI the reminder's own words as the question's topic** — **VERIFY, fixed 2026-10-03 (plan 81, `209d783f`). Was OPEN, found 2026-10-03 by reading the code (plan 81).**
  The status-line example the AI is given now quotes the person's own words, not the chat's "previous turn" reminder; the reminder still reaches the AI where it was. Choice buttons were fixed in `83bec1ad` (see Done).
  Tests only; no Deck check can show it, because the AI's wording varies: row **P81-FOLLOWUP-TOPIC**. Test: `tests/test_game_ai_request_strategy_followup_prompt.py`.
- ★★ `[chips]` **After the quick start is opened and closed, the help chip stayed and the suggestion chips never took the row** — **VERIFY, fixed 2026-10-01 (plan 78 helper P, `f0a4f2c4`). Was OPEN, found on the Deck 2026-10-01 (build `9feef02e`).**
  Real, and there for weeks; it showed once one chip filled the whole row. Opening the quick start left a note of the session saying "help not seen", and the fresh panel trusted it over the stored flag. The popup now marks the note as seen. Tests: `src/index.helpChip.test.tsx` (4, 2 fail without the fix). Full cause: [roadmap-details.md](roadmap-details.md#after-the-quick-start-is-opened-and-closed-the-help-chip-stayed-and-the-suggestion-chips-never-took-the-row).
  **2026-10-01, UNCLEAR:** not run on the Deck; owed on a fresh install or "Clear all plugin data". Deck row **P78-HELP-CHIP-DISMISS**; evidence `docs/test-evidence/plan78-P78-HELP-CHIP-DISMISS.json`, finding `docs/test-evidence/plan78-PRESET-ONE-LINE-02.json`.
  **2026-10-03 (plan 81, build `afd2f444`), COULD NOT RUN again:** the stored flag came back to "1" by itself after Steam's web helper was restarted, so no help chip showed. It stays with the maintainer's first-install check (`docs/test-evidence/plan81-P78-HELP-CHIP-DISMISS.json`).
- ★★ `[reply]` **When the length limit cuts a choice menu, the next part of the answer is lost** — **VERIFY, fixed 2026-09-30 (plan 77 helper L, `42092e2f`). Was OPEN, found 2026-09-30 (plan 77).**
  On a test build with the limit at 300 tokens, the piece after a menu cut by the length wall never reached the screen or the saved chat. Rare at the normal limit. A cut menu that the continuation does not finish is now dropped cleanly and the rest of the answer is kept, shown and saved.
  Deck check owed: row **P77-CUT-MENU-TEXT**; two real-AI tries (2026-09-30, 2026-10-01) were unclear, because the model never reached a menu before the wall. Unit tests are the proof so far. Evidence `docs/test-evidence/plan77-SOFT-PREDICT-04.json`.
  **2026-10-03 (plan 81, build `afd2f444`):** prepared answer passed; the real AI's case still needs the hand check. With a stand-in AI that cuts a menu at the length wall, the second piece showed in full on screen and in the saved chat, no fence text, and the log held "dropped a choice fence" (`docs/test-evidence/plan81-P77-CUT-MENU-TEXT.json`).
  **The maintainer chose (2026-10-03, [D123](audit/maintainer-decisions-locked.md#d123--locked-2026-10-03-raised-2026-10-03--plan-80-check-the-roadmap-and-tidy-it-the-ten-calls) answers) to wait for a check by hand,** so it stays here. Full note: [roadmap-details.md](roadmap-details.md#when-the-length-limit-cuts-a-choice-menu-the-next-part-of-the-answer-is-lost).
- ★★ `[voice]` **A spoken question sometimes comes out with its words doubled** — **VERIFY, fixed 2026-10-02 (plan 79, `7b6e1de5`). Was OPEN, found by the maintainer 2026-10-02 on the real microphone.**
  Stretches of text that overlap are now merged, so no stretch appears twice. Test: `tests/test_voice_overlap_merge.py`.
  Deck check owed: row **P79-DOUBLED-WORDS** (one recorded sentence five times, no stretch repeated). **The real microphone is the final check and is the maintainer's.** Tried 2026-10-03 (build `afd2f444`), COULD NOT RUN: a sentence played from the Deck's own speaker reached its microphone as pure silence, so nothing was heard (`docs/test-evidence/plan81-P79-DOUBLED-WORDS.json`).
- ★★ `[voice]` **With Voice replies on "When I asked by voice", a spoken question's answer may not read itself aloud** — **VERIFY, fixed 2026-09-30 (plan 78 helper M, `c3a1f16a`, `27a450ed`). Was OPEN, found 2026-09-30 by reading the code (plan 78 helper G), not seen on the Deck.**
  The note "this came from the mic" is now written the moment Ask is pressed, so a spoken question's answer reads itself. Proven by tests that failed before the fix (`src/features/voice/useVoiceAskWithReadAloud.test.tsx`, 6 tests; 2 more in `src/hooks/useReadAloud.test.ts`). "Always" and "Off" were never affected.
  Limits: a retry of a spoken question counts as typed and is not read. The first-moments finding (`27a450ed`) rests on its unit test only. Full text: [roadmap-details.md](roadmap-details.md#with-voice-replies-on-when-i-asked-by-voice-a-spoken-questions-answer-may-not-read-itself-aloud).
  Deck check owed, and it is the maintainer's, with a real voice: row **READ-ALOUD-05** (could not run 2026-10-03: the Deck's microphone path delivered silence; `docs/test-evidence/plan81-READ-ALOUD-05.json`). Evidence for the finding `docs/test-evidence/plan78-G-after-answer-readthrough.md` (findings 4 to 6).
- ★★★ `[focus]` **After picking a setting from the search list above the question box, Down cannot get past the answer** — **VERIFY, fixes for nearby cases landed 2026-10-02 (plan 79, `affa7fa0`, `8c8fffb0`); the maintainer's own route has never reproduced. Was OPEN, found by the maintainer 2026-10-02; only a Steam restart cleared it.**
  Three more routes on the Deck (build `678aaa3d`): the ring on the list's last row then B; the box text replaced from outside so the list closed by itself; A on the row to Quick Settings and back. None trapped. The fix's own state (Steam's ring on the whole answer after a tab switch) could not be made on the rig. With the seven earlier tries, nothing has reproduced it.
  **Owed:** the maintainer watching for it in daily use, and a call on whether scrolling first counts as moving (no decision recorded). Row **P79-TRAP-DOWN-BUBBLE**. Evidence `docs/test-evidence/plan79-P79-TRAP-ROUTES-AFTER.json`, `plan79-P79-TRAP-ROUTE-H.json`. Older notes: [roadmap-details.md](roadmap-details.md#after-picking-a-setting-from-the-search-list-above-the-question-box-down-cannot-get-past-the-answer).
- ★★★ `[reply]` **Some saved answers have a hidden block's markers written twice, cause found** — **VERIFY, cause found and fixed 2026-10-03 (plan 81, `ec329983`, `9be94867`, `8fba3a4f`). Was PARTIAL, found 2026-09-25 (plan 68).**
  When a long answer hits its length limit inside a hidden block, the AI opens the block again when it carries on, and the plugin glued both opening marks together (on this PC with the Deck's model, 7 of 23 continued answers before; none from that cause after). Also fixed: when the limit cut the mark itself in half, the hidden sentence showed in plain view with no cover. The AI's own doubling inside one piece remains, handled by the guard from `6843f8e1` (passed on the Deck 2026-09-30, `docs/test-evidence/plan77-SUMUP-12.json`).
  **The Deck row P81-CONTINUE-ONE-MARK did not pass (`docs/test-evidence/plan81-P81-CONTINUE-ONE-MARK.json`: FAIL — the joins were clean, but the AI itself left one hidden block unclosed and opened another; both still covered on screen); it stays owed.** **2026-10-08 (plan 83 overnight, build `0d3af3de`): UNCLEAR, still owed.** Two tries forced three joins, but the AI wrote no hidden block in either answer, so the case under test never arose; no half mark, no fence text and no covers were seen. The saved text did repeat paragraphs across the joins (filed in Bugs). Evidence `docs/test-evidence/plan83-P81-CONTINUE-ONE-MARK.json`. Tests: `tests/test_soft_continue_spoiler_join.py`, `tests/test_stopped_answer_cut_in_hidden_block.py`.
  **Also fixed 2026-10-03 (plan 81, `e891bdc4`, `6c708a78`):** a stopped answer cut inside a hidden block is saved without the bare opening mark, and a half-typed mark at the very end of a finished answer is dropped. Both are tests only (rows **P81-STOP-IN-HIDDEN-BLOCK**, **P81-HALF-MARK-AT-END**). A prepared answer could not make these cases: Stop needs an answer slower than the hidden block; the half mark needs the length limit to fall inside the mark.
  Older notes, and what was found but not fixed: [roadmap-details.md](roadmap-details.md#some-saved-answers-have-a-hidden-blocks-markers-written-twice-cause-found).

### Features that need verification

- ★★ `[chips]` **Long suggestion chips: pause at the end, centred text** — **VERIFY, built 2026-10-02 (plan 79, `2fa5a5a4`, `70a47e4b`) and changed 2026-10-03 (plan 81, `0b46df34`, `fc1f1d51`), asked for by the maintainer.**
  **The maintainer's call 7 ([D124](audit/maintainer-decisions-locked.md#d124--locked-2026-10-03-raised-2026-10-03--plan-81-the-final-bug-session-before-060-the-ten-calls)):** a long chip now tells its row when its own scroll ends, and the row replaces it one pause (1.5 s) later, instead of 3 to 10 s later on the row's own beat. In the fade style (the default) the chip starts fading at that moment; in the plain and decode styles the words swap then. Two long chips can now change about 0.35 s apart (was 2.5 s). The sliding style keeps its own beat. A chip under the ring still never changes.
  **Deck 2026-10-03 (plan 81, build `9e68bce1`, Deep Rock running, 200 s): mostly passed, with two long gaps when both chips were due at once.** 31 of 44 long chips began to leave 1.2 to 1.9 s after their words stopped; 2 read 3.4 and 4.6 s. A short chip's words were centred to 0 px. Row **P79-LONG-CHIPS** stays owed for the fade's opacity (never seen to change) and for a chip under the ring never changing. Evidence `docs/test-evidence/plan81-P79-LONG-CHIPS-game.json`.
  **Deck 2026-10-08 (plan 83 overnight, build `0d3af3de`, Deep Rock Galactic: Survivor running, fade set by hand, 200 s): timing, fade and the ring hold PASS.** All 42 long chips began to leave 1.5 to 1.7 s after their words stopped, and each one's opacity fell under 1 before the new words came; the chip under the ring kept its words and box for 30 s. **UNCLEAR, still owed:** a short chip's centring (the only short chip carried the tip dot; with it, dot and words centre to about 0.1 px) and "the other chip changes" (it held too). Evidence `docs/test-evidence/plan83-P79-LONG-CHIPS-game.json`.
  The soft blue fill passed and is in Done. Older notes (the 2026-10-07 run, before the change, and the reads too close to tell): [roadmap-details.md](roadmap-details.md#long-suggestion-chips-pause-at-the-end-centred-text). Tests: `src/features/preset-carousel/presetChipStay.row.test.tsx`, `src/styles/presetChipFocusRing.test.ts`.
- ★★ `[chips]` **Make the preset chips look more like chips** — **VERIFY, shipped 2026-09-17 under plan 60
  ([D110](audit/maintainer-decisions-locked.md#d110--locked-2026-09-16-raised-2026-09-16--the-suggestion-chips-as-real-buttons-claude-design-board-b-six-calls-before-the-build)).**
  Chips look raised, sit closer together, and the chip the controller is on shows a soft blue fill (the maintainer's pick, 2026-10-02). Rows 02 to 06 and 08 passed by measurement; row 07 passed in all three styles (`docs/test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`, `plan79-CHIP-BUTTON-07.json`). Row 09 (the dot stays still while a long label scrolls) passed in full on the Deck 2026-10-02 (`docs/test-evidence/plan79-CHIP-BUTTON-09.json`).
  Still owed: the maintainer's own look at rows **CHIP-BUTTON-01** and **CHIP-BUTTON-05**, and at the help and agent chips (row 06 passed for the one-chip setting only), and their own look at the chip pace with a pick from the preview page (from the game's own chip entry, plan 78; its Deck rows P78-TIP-CHIP and P78-CHIP-PACE passed, in Done).
  [Plan](archive/60-chip-button-restyle.md) · [Detail](roadmap-details.md#make-the-preset-chips-look-more-like-chips).
- ★★ `[reply]` **Streamed answers arrive with the same scramble as the decode chips** — **VERIFY, built 2026-09-24/25 (plan 69, [D119](audit/maintainer-decisions-locked.md#d119--locked-2026-09-24-raised-2026-09-24--plan-69-streamed-answers-scramble-into-place-the-calls-from-discovery)).**
  A Developer tab switch, *Scramble animation*, off by default, churns a live answer's newest letters through placeholder symbols before they settle, as a suggestion chip does.
  Passed on the Deck: **DEV-01**, **SCR-04** to **SCR-08** (SCR-05 `docs/test-evidence/plan70-SCR-05.json` and SCR-07 `plan70-L5-FLOW5-REDUCED-MOTION.json` on 2026-09-26).
  Owed: the look (**SCR-01**, the maintainer's eye) and the maintainer's verdict on the game's own frame rate (**SCR-03**: 43 to 44 frames a second while answering, game stopped on a menu, `docs/test-evidence/plan79-SCR-10-MISSION.json`). Full rows in [testing.md](testing.md).
- ★★ `[reply]` **The streamed answer's own redraws were costing most of the panel's frame rate** — **VERIFY, fixed 2026-09-25 (`bb8d7e5b`, `aae5add6`).**
  With no game running the panel drew about 19–24 frames a second while an answer streamed; it now draws 56–58 with the scramble off and 44–50 with it on (the maintainer's floor was 45). Evidence `docs/test-evidence/plan69-answer-frame-rate-2026-09-25.json`.
  With a game in a live mission (stopped on a menu, 2026-10-02) the panel drew about 69 a second while answers arrived (`docs/test-evidence/plan79-SCR-10-MISSION.json`).
  Owed: the maintainer's eye on the look, and a run in a real fight. Rows **SCR-09**, **SCR-10** in [testing.md](testing.md).
- ★★ `[ui]` **Calmer rating choices under an answer** — **VERIFY, built 2026-10-02 (plan 79, `8b414628`), asked for by the maintainer; the maintainer picked drawing 2, smaller and softer.**
  Helpful, Not really and the "What went wrong?" choices are smaller and softer. **Deck 2026-10-02 (build `d810328b`):** the thumbs measure 28 px tall, the reasons 24 px, the words 11 px, and the D-pad walk has no dead press (row **P79-M7-RATING-ROW**, in Done). Colours were not measured against the drawing, so **the look is still the maintainer's to judge.** The wider rule (look for other loud spots) stays open.
  Evidence `docs/test-evidence/plan79-P79-M7-RATING-ROW-AFTER.json`. Test: `src/styles/sections/replyRatingChoices.test.ts`.
- ★★★ `[layout]` `[focus]` `[chips]` **While reading an answer, the Show details line takes the suggestion chip's place above the question box** — **VERIFY, built 2026-10-02 (plan 79, `5a19a558`), filed by the maintainer 2026-09-23; the maintainer picked way 2, a short cross-fade.**
  While an answer is read and its own Show details line is out of sight, that line sits in the chip's place; once the real line is on screen, or the answer is scrolled past, the chip comes back. A on the slot's line opens the details; Up from the question box lands on whatever the slot shows. Tests: `src/features/details-slot/DetailsSlot.deck.test.tsx`.
  **Deck 2026-10-02 (build `c98f749e`):** passed for the slot's wording, the chip's return, B closing details and Up from the slot or a chip. **Still owed:** reaching the slot's line from the question box and pressing A on it (needs a right-stick scroll, the maintainer's hand check, checks page, Friday check 4). **Deck 2026-10-08 (plan 83 overnight, build `0d3af3de`, no game): step 6 PASSED** by the session's ruling: after A closed the details the page was already at its scroll limit (521 of 522), so the closed line cannot sit 8 px from the top; that is "no scroll left", and the chips came back with the ring on the line. Evidence `docs/test-evidence/plan83-P79-SHOW-DETAILS-SLOT-S6.json`. Row **P79-SHOW-DETAILS-SLOT**. Evidence `docs/test-evidence/plan79-P79-DETAILS-SLOT.json`. Older notes: [roadmap-details.md](roadmap-details.md#while-reading-an-answer-the-show-details-line-takes-the-suggestion-chips-place-above-the-question-box).
  The chip row giving way to the answer's own Show details line when that line sits at the dock edge (seen once 2026-10-03, `docs/test-evidence/plan81-P79-LONG-CHIPS-game.json`) is this designed behaviour, the thing being checked here.
  **2026-10-06, the maintainer by hand:** both lines were on screen at once (the slot's copy and the answer's own line under the rating buttons), and the maintainer's rule is that the answer's own line goes away while the slot holds it, with a smooth change on scroll. Filed as its own ★★ bug ("Both Show details lines show at once", now in Verify → Bugs): **2026-10-07 (plan 82, `8bfe1802`) fixed**, the answer's own line now fades out while the slot holds the copy; row **P82-ONE-DETAILS-LINE** passed on the Deck 2026-10-07 (block 3b, build `e34b0d57`; the bug is now in Done). The right-stick hand check (steps 3 and 4) is still owed.
- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09.
  When Steam says parental controls are locked, bonsAI turns the high-impact permissions off and greys their switches. Passed on the Deck 2026-09-17: with no lock set, no banner and all four switches on and reachable (**KIDS-REGRESS-01**, `docs/test-evidence/plan57-QA-KIDS-REGRESS-01.json`).
  Still owed, needs a locked account: **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-LOCK-02** (child account), and the live Steam check.
- ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab
  named** — **VERIFY, landed 2026-09-17.** Six equal cells with one icon each, only the current tab named.
  **Deck run 2026-09-18:** rows 01, 02, 04, 05 and 06 pass; **TAB-STRIP-2A-03** waits on the maintainer's own look. Row 07 (the chat row's dots under the strip) was settled by the maintainer's 2026-09-26 call, "keep the dots, make them line up exactly"; fixed in `e3e849bd` and closed 2026-09-27, the Deck's own screen included (`docs/test-evidence/plan72-F5-DOTS-rowlit-deckscreen.json`). No pick is owed.
  The free-play sweep's streaming half closed 2026-09-23. [Detail](roadmap-details.md#the-open-tab-strip-redrawn-six-equal-cells-one-icon-family-only-the-current-tab-named) · [Tab icon](roadmap-details.md#replace-the-bonsai-tab-icon).

---

## Knowledge base and RAG

Moved to its own file: [roadmap-kb.md](roadmap-kb.md) — bugs, owed checks, next steps and the calls waiting on the
maintainer. Long notes: [roadmap-kb-details.md](roadmap-kb-details.md).

---

## Shelved

Parked work and watched sightings: [roadmap-shelved.md](roadmap-shelved.md).

---

<a id="done-for-v060"></a>

## Done for v0.6.0

Everything closed since v0.5.0 (2026-07-15), one line each. Full record: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).

The Closed blocks from 2026-10-02 to 2026-10-07 (plans 79 to 82) were moved to [the archive](archive/roadmap-done-v0.5.0.md#done-for-v060) on 2026-10-07 to keep this file under its size limit, newest first, copied line for line. Every entry in them is closed, so none stays here.

**Closed 2026-10-08 (plan 83):**

- ★★ `[layout]` `[focus]` **Walking the Show details chips redrew the row and jumped the answer, and the answer kept scrolling after you left** — **DONE 2026-10-08, passed on the Deck except one 10 px case (rows P83E-CHIPS-ALL, -STILL, -END, -LEAVE passed; fixes `b5f7f7f7`, `2f72b53c`, `a0b62a95`, `1fc1551c`, `657ef2cb`; `83a2efa7` did not change the remaining case).** Found by the maintainer's filming: a quick redraw on each D-pad Down, only three or four chips drawn, and the answer still scrolling after the ring had left the chips. Now all seven chips are always drawn at one size and only the open chip's fill and border mark it; the chip row and the answer above it stay still while you step; nothing scrolls once the ring has left; a box taller than the screen (Developer details) scrolls its end into view on the first Down and the next Down leaves. Evidence `docs/test-evidence/plan83-P83E-CHIPS-ALL.json`, `-STILL-RECHECK.json`, `-STILL-RECHECK2.json`, `-END.json`, `-LEAVE-RECHECK.json`. The 10 px case (going back up after reading Developer details) and the hidden last lines are two new entries in Bugs.

- ★ `[ui]` **A leftover piece of state from the deleted settings-card keyboard marker** — **DONE 2026-10-08, passed on the Deck (row P83-J1-SETTINGS-CARD; fixes `0456117b`, `787068ef`).** A row you pick in the settings card no longer stays painted lighter; the D-pad walk and B are unchanged. Evidence `docs/test-evidence/plan83-P83-J1-SETTINGS-CARD.json`. The jump to the setting is a new entry in Bugs.
- ★ `[platform]` **After the release: two clean-ups behind the scenes** — **DONE 2026-10-08, proven by its test only (fix `c99bd6f6`; no Deck check, it shows in developer builds only).** An answer that finished while the panel was shut is now written to the desktop note once the panel reopens. Test `src/hooks/useBonsaiAskOrchestration.desktopNote.test.ts`.
- ★★ `[chat]` **A day line in the "N earlier" list opens all of that day's questions at once; open them a few at a time** — **DONE 2026-10-08, passed on the Deck (row P83-J3-SHOW-MORE; fix `eddd7138`).** A on a day line shows six questions and a "Show N more" line; each A adds the next six; closing the day starts over. Evidence `docs/test-evidence/plan83-P83-J3-SHOW-MORE.json`.

**Plan 70 (2026-09-26 to 2026-09-27): 41 items closed** — the knowledge-base wave four and the Deck test wave,
flows L1 to L7 and the helpers' landings. Each one, word for word, with its evidence: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md); the long notes in
[roadmap-details.md](roadmap-details.md); the plan's own record in
[archive/70-kb-wave-four-and-deck-test-wave.md](archive/70-kb-wave-four-and-deck-test-wave.md) § 11.
