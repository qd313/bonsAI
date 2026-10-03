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

- ★ `[focus]` **Walking Up can land on a section taller than the screen with only a sliver of it showing at the top** — **OPEN, found 2026-09-30 in the test setup (plan 78 helper D), not seen on the Deck; may have been changed by the plan 79 Up fixes, not re-measured.**
  Only 1 to 8 px of the section showed. It passes the "bottom edge showing" rule but looks poor. For after the release (plan 79 list).
- ★ `[focus]` **Walking Up onto a tall first answer section shows only its top third above the dock** — **OPEN, seen on the Deck 2026-10-02 (plan 79, build `156baf42`).**
  With a game running, the Up landing on the first section of the answer had 33 percent of it above the dock; the Down walk showed the same section 67 percent. The walk itself goes on and the section is a stop both ways. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json`.
  **2026-10-03 (plan 81, build `afd2f444`, Deep Rock running):** a 525 px section; Up landed with 19% showing (top 229, the pane did not scroll), Down with 38%. Evidence `docs/test-evidence/plan81-P81-M-K2K3-GAME.json`.
- ★ `[focus]` **The plugin's own claim of the ring when the panel reopens may not run after a switch between Quick Access tabs** — **OPEN, found 2026-10-02 while fixing the trap (plan 79); seen on the Deck 2026-10-03 (plan 81, build `afd2f444`).**
  In 6 of 6 returns to the Decky tab the ring sat on Decky's own back arrow, drawn and visible, never on a bonsAI control. Nothing was lost, and Down continues from there. A ring on a chip before the switch could not be built with the D-pad alone.
  The cause was first a suspicion from reading the code (`useAskBarInitialRingClaim.ts`). Evidence `docs/test-evidence/plan81-P81-LOOK-QAM-TAB-SWITCH.json`.
- ★ `[focus]` **An underlined game word's own tooltip can cover the word itself** — **OPEN, seen once on the Deck 2026-10-02 (plan 79, build `49fc8894`); not seen on build `156baf42`; seen again 2026-10-03 (plan 81, build `afd2f444`).**
  Walking Down, the second underlined word was a stop with 33 percent showing because a tooltip box covered it. The next sweep showed both words whole.
  **2026-10-03:** 3 of 14 stops over 5 answers had the tooltip over the word (100%, 100% and 52% of the word covered), always with the word low in the pane. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS.json`, `plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json`, `docs/test-evidence/plan81-P81-LOOK-TOOLTIP-WORDS.json`.
- ★ `[layout]` **The step that lifts a control clear of the dock moves it about 80 px too far** — **OPEN, measured 2026-10-01 (plan 78 helper D).**
  The choices and Helpful under an answer land at y 172 to 204 with the dock at 290. Harmless under about 116 px tall; answer sections are exempt since `b417c271`. The cure is to take Steam's 80 px out of the lift's margin and re-measure every landing below an answer. After the release. Evidence `docs/test-evidence/plan78-P78-DOWN-SHORT-SECTION.json`.
  **2026-10-03 (plan 81, no game):** going Down, choice A landed 171.8-203.8 and Helpful 176-204 with the dock at 290.17, about 86 px above it; every control still fully visible. Evidence `docs/test-evidence/plan81-P81-M-K2K3-NOGAME.json`.
- ★ `[reply]` **While an answer arrives, the start of a sentence that ends up behind a spoiler cover can be read for about a second** — **OPEN, seen 2026-10-01 on the Deck (plan 78, Deck block 3a), a note. Waiting on the maintainer's call ([plan 78](planning/78-release-wave-five.md), question 12; no decision recorded).**
  The words shown held no protected name; the name arrived after the words were hidden. Not known whether it was always so. Evidence `docs/test-evidence/plan78-P78-BORROWED-RUNNING-GAME.json`.
- ★ `[reply]` **After the release: the AI's own instructions write the hidden-block label in the odd shape** — **OPEN, from plan 78 (helper N).**
  Five places show the label between two sets of backticks (`ollama_prompts.py` line 483; `strategy_spoiler_policy.py` lines 139, 150, 161, 165), the likely reason a small model copies it.
  Rewording waits for the maintainer's call ([plan 78](planning/78-release-wave-five.md), question 13; no decision recorded) and a before-and-after count of covers.
- ★ `[ollama]` **Removing a model on the Deck also drops its name from the saved try order, even when the AI runs on a PC that has the same model** — **OPEN, found 2026-10-02 by reading the code (plan 79, models helper); not seen on the Deck.**
  No fix has landed yet. No evidence file.
- ★ `[platform]` **After the release: two clean-ups behind the scenes** — **PARTIAL, from plan 72; the first half is done in `45c73585` (plan 81).**
  The old live-line trimming code is removed (nothing called it); nothing a player sees changes. Owed: the end-of-session smoke test (Show reasoning still shows during and after an answer).
  What is left: read the step that runs after an answer for stale copies. Findings 1 to 5 are fixed (Verify); finding 6 is only possible.
  Full note: [roadmap-details.md](roadmap-details.md#after-the-release-two-clean-ups-behind-the-scenes).
- ★ `[platform]` **A plugin reload while a game is running can put Steam's Home screen in front of the game** — **OPEN, found 2026-09-28 (plan 75).**
  Seen three times. Once the game came back through the Steam menu (`docs/test-evidence/plan38-M1-deck.json`). Once it never showed a window (`docs/test-evidence/t75-feature-F1-REAL-POPUP.json`). Once, on 2026-09-29, one A on Resume brought it back (`docs/test-evidence/plan77-P77-TRAP-LONG.json`).
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** — **OPEN, failed by hand 2026-09-23 (build `a224fb6`).**
  After Show details → Session, both tab bars stayed drawn at once. The D-pad half did not reproduce (2026-09-28, 2026-09-29); the touch half needs a finger and is on the maintainer's checks page (plan 77).
  Row **TAB-BAR-GHOST-01** in [testing-manual.md](testing-manual.md). Older notes: [details](roadmap-details.md#a-faded-ghost-of-the-tab-bar-is-left-drawn-over-the-chip-row-after-touching-the-screen).
  **2026-10-03 (plan 81):** one pretend touch through the debug link on the Session tab: no ghost, one tab bar drawn throughout. The touch was on the tab already showing, so a touch on a different tab is not proven. Stays the maintainer's finger check. Evidence `docs/test-evidence/plan81-P81-LOOK-TAB-GHOST.json`.
- ★★ `[focus]` **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL; accepted for 0.6.0 in plan 79's list (not a locked decision).**
  Modal scoping shipped; a blanket rule was tried and reverted in favour of Steam's native outline (no commit found to name). Weak rings are still listed above. [Detail](roadmap-details.md#small-and-cosmetic-as-filed).
- ★★ `[focus]` **Up from the answer bubble, with Steam's ring on the whole answer, scrolls the whole answer instead of moving the ring** — **OPEN, found 2026-10-02 while fixing the trap (plan 79); not a trap, since the press does something.**
  Not fixed. A test comment calls it by design (Up leaves the bubble after scrolling it back). The maintainer will check it by hand later. Seen in the test setup's walk, not on the Deck. No evidence file.
- ★★ `[platform]` **Reloading the plugin while a heavy game is running can leave Steam's interface gone until the Deck is restarted** — **OPEN, seen once, 2026-10-01 12:29 (plan 78, Deck block 3e).**
  Black Mesa running, about 550 MB free of 14.8 GB, the rig's plugin reload, then no Quick Access page for six minutes or more; the maintainer restarted the Deck. Evidence `docs/test-evidence/plan78-THINKING-SLOW-01.json`.
  A real player never reloads the plugin this way (it is a developer action), so this is first a rule for the Deck driver. Whether an ordinary Steam restart of the plugin under low memory can do the same is not known.
  In block 3d a reload during a game's start was also followed by the game's window never coming to the front (twice: Deep Rock Galactic: Survivor, Half-Life 2). Related: the entry above about the Home screen in front of a game.
- ★★ `[reply]` **After a choice button under a Strategy answer, the AI can be told it is a first question, so the step checklist never comes** — **OPEN, found 2026-10-03 by reading the code (plan 81), not yet seen on the Deck.**
  With the knowledge base on and the chat remembering what it was about, a "previous turn" reminder is put in front of the follow-up, and the check for a follow-up only looks at the very start of the text, so the AI gets the first-question instructions (a new choice menu) instead of the follow-up ones (a step checklist). Likely why the checklist never showed on the Deck in four tries.
  Related: the Verify entry "A Strategy checklist that arrives while the panel is closed never shows ..." (row P78-REOPEN-CHECKLIST). Found by reading the code; no evidence file.
- ★★★ `[layout]` **The chat summary card appears behind the dock until Down is pressed** — **PARTIAL, found 2026-09-25 (plan 68). Accepted as is for 0.6.0 (the maintainer, 2026-09-27; [plan 72 § 8](planning/72-release-bug-session.md#8-known-issues-for-the-060-release-notes-final-2026-09-27)).**
  The card shows itself and one Down reaches it. Two more tries to hand over the ring failed on the Deck (`docs/test-evidence/plan72-F7-SUMUP.json`, `plan72-F8-SUMUP.json`): Steam keeps the ring on the greyed "Sum up again". Named in the release notes.
  After the release: finish the hand-off or take the tries out of the code (they do no harm). Row F6-SUMUP. [Detail](roadmap-details.md#the-chat-summary-card-appears-behind-the-dock-until-down-is-pressed).
  **2026-10-03 (plan 81):** the measurement could not run: every chat that had a summary showed "Sum up again" greyed. Evidence `docs/test-evidence/plan81-P81-M-L-SUMUP.json`.
- ★★★ `[reply]` **Some saved answers have a hidden block's markers written twice, cause unknown** — **PARTIAL, found 2026-09-25 (plan 68).**
  The chat memory now copes with the doubling (`6843f8e1`) and the guards passed on the Deck 2026-09-30 (`docs/test-evidence/plan77-SUMUP-12.json`). Why it happens has not been found.
  [Detail](roadmap-details.md#some-saved-answers-have-a-hidden-blocks-markers-written-twice-cause-unknown).

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
- ★ `[ui]` **A leftover piece of state from the deleted settings-card keyboard marker** — **OPEN, found 2026-09-16 while landing the settings card's real D-pad wiring.**
  The old fake on-screen marker is gone, but a stored row number is still kept and passed through several files. Today it only paints the row you last clicked in the settings card.
  Nothing a person clearly notices. Removing it touches more than three files (the main file, the ask bar and its types, three hooks).
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
- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16, no single cause, not built in plan 56.**
  On the Deck's own screen the panel is 454 pixels tall, and fixed rows take 311 before any chat starts, so about three lines of chat show.
  More room means shrinking or hiding one of those rows. A design call for the maintainer; no decision recorded. [Detail](roadmap-details.md#give-the-reclaimed-height-to-the-transcript).
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
- ★★★ `[reply]` **Terse mode: Speed answers in three lines** — **OPEN, planned 2026-08-29, nothing built.**
  A toggle beside the reply-style slider, off by default, capping a Speed answer at three lines. It overrides the slider and the character; destructive warnings and the depth phrases escape it.
  The real work is widening the branch picker ([D40](audit/maintainer-decisions-archive.md#d40--locked-2026-08-29--terse-modes-branch-menu-appears-on-every-reply-and-never-stops-the-branch-fence-is-mandatory-once-and-banned-on-follow-ups-which-rule-wins)). The future test TERSE-01 must pass at 8 of 10 questions; it has not been run. [Detail](roadmap-details.md#terse-mode-speed-answers-in-three-lines).
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
  The chat now sums itself up on its own (see Verify, plan 68); rating how likely that summary swept up a spoiler is a later plan of its own.
  [Detail](archive/roadmap-completed.md#the-chat-sums-itself-up-instead-of-being-cleared-closed-2026-09-26).
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
- ★ `[focus]` **Dismissing the troubleshooting hint hands the ring to the chip's slot, not to chips that are hidden** — **VERIFY, fixed 2026-10-02 (plan 79, `312a1933`). Was OPEN, found 2026-10-02 by reading the code (plan 79, Show details helper).**
  Before, the ring went to the chip row by name, so it could land on hidden chips while the Show details line held the slot; now it goes to the slot above the question box.
  Deck check owed: row **P79-HINT-DISMISS-SLOT**. It could not run on 2026-10-02 (build `49fc8894`): no troubleshooting hint was on screen, twice. Evidence `docs/test-evidence/plan79-P79-HINT-DISMISS-SLOT.json`.
- ★★ `[ask]` **The chat summary reads oddly in places** — **VERIFY, fixed 2026-09-30 (plan 78 helper H, `569abd5f`, `318c0da3`). Was OPEN, found 2026-09-25 (plan 68).**
  The "What the AI remembers" card no longer shows a Game line naming something that is not a game, and no longer shows lines that say nothing. English summaries only. Measured on this PC, 45 summaries: a non-game on the Game line in 24 before, 0 after; real lines lost, 0. Unit tests: `tests/test_chat_summary_tidy.py`.
  Deck row **P78-SUMUP-WORDING**: the no-non-game half passed 2026-10-01. **2026-10-02 (plan 79, build `f0a4f2c4`), UNCLEAR for the in-a-game half:** the Sum up button stayed greyed, so no card was made; that half rests on its unit tests. Evidence `docs/test-evidence/plan79-P78-SUMUP-WORDING.json`.
  Older note (2026-10-01): [roadmap-details.md](roadmap-details.md#the-chat-summary-reads-oddly-in-places).
- ★★ `[reply]` **When the length limit cuts a choice menu, the next part of the answer is lost** — **VERIFY, fixed 2026-09-30 (plan 77 helper L, `42092e2f`). Was OPEN, found 2026-09-30 (plan 77).**
  On a test build with the limit at 300 tokens, the piece after a menu cut by the length wall never reached the screen or the saved chat. Rare at the normal limit. Evidence `docs/test-evidence/plan77-SOFT-PREDICT-04.json`.
  A cut menu that the continuation does not finish is now dropped cleanly and the rest of the answer is kept, shown and saved. Deck check owed: row **P77-CUT-MENU-TEXT**; tried twice (2026-09-30, 2026-10-01), unclear both times because the model never reached a menu before the wall. Unit tests are the proof so far.
  **The maintainer chose (2026-10-03, [D123](audit/maintainer-decisions-locked.md#d123--locked-2026-10-03-raised-2026-10-03--plan-80-check-the-roadmap-and-tidy-it-the-ten-calls) answers) to wait for a check by hand,** so it stays here. Full note: [roadmap-details.md](roadmap-details.md#when-the-length-limit-cuts-a-choice-menu-the-next-part-of-the-answer-is-lost).
- ★★ `[voice]` **With Voice replies on "When I asked by voice", a spoken question's answer may not read itself aloud** — **VERIFY, fixed 2026-09-30 (plan 78 helper M, `c3a1f16a`, `27a450ed`). Was OPEN, found 2026-09-30 by reading the code (plan 78 helper G), not seen on the Deck.**
  The note "this came from the mic" is now written the moment Ask is pressed, so a spoken question's answer reads itself. Proven by tests that failed before the fix (`src/features/voice/useVoiceAskWithReadAloud.test.tsx`, 6 tests; 2 more in `src/hooks/useReadAloud.test.ts`). "Always" and "Off" were never affected.
  Limits: a retry of a spoken question counts as typed and is not read. The first-moments finding (`27a450ed`) rests on its unit test only. Full text: [roadmap-details.md](roadmap-details.md#with-voice-replies-on-when-i-asked-by-voice-a-spoken-questions-answer-may-not-read-itself-aloud).
  Deck check owed, and it is the maintainer's, with a real voice: row **READ-ALOUD-05**. Evidence for the finding `docs/test-evidence/plan78-G-after-answer-readthrough.md` (findings 4 to 6).
- ★★ `[reply]` **A Strategy checklist that arrives while the panel is closed never shows, and after any reopen a refine chip sends its follow-up in Speed mode** — **VERIFY, fixed 2026-09-30 (plan 78 helper L, `553f46ec`). Was OPEN, found 2026-09-30 by reading the code (plan 78 helper G), not seen on the Deck.**
  The back end's status now says which mode the question was asked in, and a reopened panel reads it from there instead of assuming Speed; a saved checklist still loading can no longer wipe a new one. Limit: after a reopen a refine chip does not re-send the original screenshot.
  Unit tests: `src/hooks/useBonsaiAskOrchestration.afterAnswer.test.ts`, `tests/test_background_status_ask_mode.py`. Evidence `docs/test-evidence/plan78-G-after-answer-readthrough.md` (finding 1).
  **Deck row P78-REOPEN-CHECKLIST, 2026-10-01, partly passed:** the follow-up's mode passed; the checklist half could not be produced in four tries and rests on unit tests. Full note: [roadmap-details.md](roadmap-details.md#a-strategy-checklist-that-arrives-while-the-panel-is-closed-never-shows-and-after-any-reopen-a-refine-chip-sends-its-follow-up-in-speed-mode).
- ★★ `[chips]` **After the quick start is opened and closed, the help chip stayed and the suggestion chips never took the row** — **VERIFY, fixed 2026-10-01 (plan 78 helper P, `f0a4f2c4`). Was OPEN, found on the Deck 2026-10-01 (build `9feef02e`).**
  Real, and there for weeks; it showed once one chip filled the whole row. Opening the quick start left a note of the session saying "help not seen", and the fresh panel trusted it over the stored flag. The popup now marks the note as seen. Tests: `src/index.helpChip.test.tsx` (4, 2 fail without the fix). Full cause: [roadmap-details.md](roadmap-details.md#after-the-quick-start-is-opened-and-closed-the-help-chip-stayed-and-the-suggestion-chips-never-took-the-row).
  **2026-10-01, UNCLEAR:** not run on the Deck; owed on a fresh install or "Clear all plugin data". Deck row **P78-HELP-CHIP-DISMISS**; evidence `docs/test-evidence/plan78-P78-HELP-CHIP-DISMISS.json`, finding `docs/test-evidence/plan78-PRESET-ONE-LINE-02.json`.
- ★ `[focus]` **When the Steam settings list above the question box closes while the ring is on one of its rows, the ring vanishes until the next press** — **VERIFY, fixed 2026-10-02 (plan 79, `8c8fffb0`). Was OPEN, found 2026-10-02 (plan 79, Deck).**
  The plugin now asks where the ring is while the screen draws, and when the list closes the question box takes the ring through Steam's own hand-over. Test: `src/components/MainTabUnifiedAskBar.settingsCardRingOnHide.test.tsx`.
  Deck check owed: row **P79-SETTINGS-LIST-RING**. Not run as written. Close case seen on the Deck 2026-10-02 (build `678aaa3d`, route F): the list closed by itself and the ring moved onto the question box (`docs/test-evidence/plan79-P79-TRAP-ROUTES-AFTER.json`). Before: `docs/test-evidence/plan79-P79-M1-TRAP-try3.json`.
- ★ `[focus]` **Some controls get only a thin grey frame, and the Steam Web API key field gets no ring** — **VERIFY, fixed 2026-10-03 (plan 81, `0469319c`). Was OPEN, seen on the Deck 2026-10-02 (plan 79, build `678aaa3d`).**
  The accent intensity button, "Reinstall voice engine", the two voice model rows and the Steam Web API key field now show the same white ring as every other stop. Before, on the Settings tab the first four showed a thin grey frame dimmer than the white ring, and on the Developer tab the key field turned white with no ring. Test: `src/components/SettingsDeveloperWrappedRing.test.tsx`.
  Deck check owed: row **P81-RING-WALK-SETTINGS-DEV**. Evidence from before the fix `docs/test-evidence/plan79-P79-RING-WALK-TABS.json`.
- ★ `[QA]` **The walk check calls a stop hidden when a corner icon merely overlaps its box** — **VERIFY, fixed 2026-10-03 in the Deck tools project (plan 81, tools commit `cde1c0e`, not pushed). Was OPEN, measured on the Deck 2026-09-21.**
  The walk check now judges a control with words by where its words are (its text lines), so the question row next to Retry and the last answer section next to Copy should read fully visible. The tool server was rebuilt; it takes effect only after the tool server restarts (likely a new chat).
  Deck check owed: row **P81-WALK-READS-WORDS**. Evidence from before the fix `docs/test-evidence/plan63-CORNER-ICON-COVERAGE-01.json`. Full note: [roadmap-details.md](roadmap-details.md#the-walk-check-calls-a-stop-hidden-when-a-corner-icon-merely-overlaps-its-box).
- ★ `[reply]` **A power question's answer often has no number in it** — **VERIFY, fixed 2026-10-02 (plan 79, `7ef1d70f`). Was OPEN, found 2026-09-27 (plan 72), narrowed 2026-09-30 (plan 78 helper I).**
  Power, battery, TDP and frame-cap questions now get the Quick Access tuning instructions, so the answer carries a TDP in watts, a frame cap and a refresh rate. Measured on this PC only (in the commit message, no evidence file), 10 questions three times each: answers with a number you can set went from 3 of 30 to 27 of 30. Tests: `tests/test_power_question_instructions.py`, `tests/test_ollama_service.py`.
  Deck check owed: row **P79-POWER-NUMBERS** (ask a battery question, the answer holds a number you can set). Not run on the Deck.
- ★ `[ui]` **B on the "Clear all plugin data?" box also takes the panel from Settings back to Main** — **VERIFY, fixed 2026-10-03 (plan 81, `b6f4d03a`). Was OPEN, seen on the Deck 2026-10-02 (plan 79, build `c98f749e`).**
  The "Clear all data..." button did not tell the plugin which tab to return to (the "Clear cache" button always did), so every way of closing the box (B, Cancel, Keep my data) went back to Main. Test: `src/components/SettingsTab.clearAllBack.test.tsx`.
  Measured again on the Deck before the fix (2026-10-03, build `afd2f444`): B on the Clear cache box stayed on Settings; B on the Clear all box went to Main with the ring on the tab bar, 3 of 3. Evidence `docs/test-evidence/plan81-P81-M-A-CLEAR-BOX.json`, `docs/test-evidence/plan79-P79-SETTINGS-CLEAR-BOXES.json`.
  Deck check owed: row **P81-CLEAR-ALL-STAYS**.
- ★★ `[voice]` **A spoken question sometimes comes out with its words doubled** — **VERIFY, fixed 2026-10-02 (plan 79, `7b6e1de5`). Was OPEN, found by the maintainer 2026-10-02 on the real microphone.**
  Stretches of text that overlap are now merged, so no stretch appears twice. Test: `tests/test_voice_overlap_merge.py`.
  Deck check owed: row **P79-DOUBLED-WORDS** (one recorded sentence five times, no stretch repeated). **The real microphone is the final check and is the maintainer's.** Not run yet.
- ★★★ `[focus]` **After picking a setting from the search list above the question box, Down cannot get past the answer** — **VERIFY, fixes for nearby cases landed 2026-10-02 (plan 79, `affa7fa0`, `8c8fffb0`); the maintainer's own route has never reproduced. Was OPEN, found by the maintainer 2026-10-02; only a Steam restart cleared it.**
  Three more routes on the Deck (build `678aaa3d`): the ring on the list's last row then B; the box text replaced from outside so the list closed by itself; A on the row to Quick Settings and back. None trapped. The fix's own state (Steam's ring on the whole answer after a tab switch) could not be made on the rig. With the seven earlier tries, nothing has reproduced it.
  **Owed:** the maintainer watching for it in daily use, and a call on whether scrolling first counts as moving (no decision recorded). Row **P79-TRAP-DOWN-BUBBLE**. Evidence `docs/test-evidence/plan79-P79-TRAP-ROUTES-AFTER.json`, `plan79-P79-TRAP-ROUTE-H.json`. Older notes: [roadmap-details.md](roadmap-details.md#after-picking-a-setting-from-the-search-list-above-the-question-box-down-cannot-get-past-the-answer).

### Features that need verification

- ★ `[ui]` **Icons on the "Update knowledge base" and "Remove" buttons** — **VERIFY, built 2026-10-02 (`2975570f`), asked for by the maintainer.**
  Update keeps the refresh arrow, Download gets a download arrow, Remove gets a bin; words and D-pad order unchanged. Deck check owed, never run: **P79-KB-BUTTON-ICONS**.
- ★★ `[chips]` **Make the preset chips look more like chips** — **VERIFY, shipped 2026-09-17 under plan 60
  ([D110](audit/maintainer-decisions-locked.md#d110--locked-2026-09-16-raised-2026-09-16--the-suggestion-chips-as-real-buttons-claude-design-board-b-six-calls-before-the-build)).**
  Chips look raised, sit closer together, and the chip the controller is on shows a soft blue fill (the maintainer's pick, 2026-10-02). Rows 02 to 06 and 08 passed by measurement; row 07 passed in all three styles (`docs/test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`, `plan79-CHIP-BUTTON-07.json`). Row 09 (the dot stays still while a long label scrolls) passed on the Deck 2026-10-02 (`docs/test-evidence/plan79-CHIP-BUTTON-09.json`); its testing row still says the scrolling half is owed.
  Still owed: the maintainer's own look at rows 01 and 05, and at the help and agent chips (row 06 passed for the one-chip setting only).
  [Plan](archive/60-chip-button-restyle.md) · [Detail](roadmap-details.md#make-the-preset-chips-look-more-like-chips).
- ★★ `[reply]` **Streamed answers arrive with the same scramble as the decode chips** — **VERIFY, built 2026-09-24/25 (plan 69, [D119](audit/maintainer-decisions-locked.md#d119--locked-2026-09-24-raised-2026-09-24--plan-69-streamed-answers-scramble-into-place-the-calls-from-discovery)).**
  A Developer tab switch, *Scramble animation*, off by default, churns a live answer's newest letters through placeholder symbols before they settle, as a suggestion chip does.
  Passed on the Deck: **DEV-01**, **SCR-04** to **SCR-08** (SCR-05 `docs/test-evidence/plan70-SCR-05.json` and SCR-07 `plan70-L5-FLOW5-REDUCED-MOTION.json` on 2026-09-26).
  Owed: the look (**SCR-01**, the maintainer's eye) and the maintainer's verdict on the game's own frame rate (**SCR-03**: 43 to 44 frames a second while answering, game stopped on a menu, `docs/test-evidence/plan79-SCR-10-MISSION.json`). Full rows in [testing.md](testing.md).
- ★★ `[reply]` **The streamed answer's own redraws were costing most of the panel's frame rate** — **VERIFY, fixed 2026-09-25 (`bb8d7e5b`, `aae5add6`).**
  With no game running the panel drew about 19–24 frames a second while an answer streamed; it now draws 56–58 with the scramble off and 44–50 with it on (the maintainer's floor was 45). Evidence `docs/test-evidence/plan69-answer-frame-rate-2026-09-25.json`.
  With a game in a live mission (stopped on a menu, 2026-10-02) the panel drew about 69 a second while answers arrived (`docs/test-evidence/plan79-SCR-10-MISSION.json`).
  Owed: the maintainer's eye on the look, and a run in a real fight. Rows **SCR-09**, **SCR-10** in [testing.md](testing.md).
- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09.
  When Steam says parental controls are locked, bonsAI turns the high-impact permissions off and greys their switches. Passed on the Deck 2026-09-17: with no lock set, no banner and all four switches on and reachable (**KIDS-REGRESS-01**, `docs/test-evidence/plan57-QA-KIDS-REGRESS-01.json`).
  Still owed, needs a locked account: **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-LOCK-02** (child account), and the live Steam check.
- ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab
  named** — **VERIFY, landed 2026-09-17.** Six equal cells with one icon each, only the current tab named.
  **Deck run 2026-09-18:** rows 01, 02, 04, 05 and 06 pass; 03 waits on the maintainer's own look. Row 07 (the chat row's dots under the strip) was settled by the maintainer's 2026-09-26 call, "keep the dots, make them line up exactly"; fixed in `e3e849bd` and closed 2026-09-27, the Deck's own screen included (`docs/test-evidence/plan72-F5-DOTS-rowlit-deckscreen.json`). No pick is owed.
  The free-play sweep's streaming half closed 2026-09-23. [Detail](roadmap-details.md#the-open-tab-strip-redrawn-six-equal-cells-one-icon-family-only-the-current-tab-named) · [Tab icon](roadmap-details.md#replace-the-bonsai-tab-icon).
- ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30: slot row, transcript, presets, Ask bar.
  Passed on the Deck: 05b, 15d, and 06c (fourth try, 2026-09-23; "Reply ready" now shows within a second, fixed in `73be15f`). Failed 2026-09-18 and not re-run: 05a's busy half, 06a, 06b (evidence `docs/test-evidence/plan61-CHAT-SLOTS-V3-05a-busyhalf.json`, `-06a.json`, `-06b.json`).
  The bug behind them is on the watch list since 2026-09-29: it did not reproduce in two clean sessions.
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02) · [More](roadmap-details.md#named-chat-slots).
- ★★ `[chat]` **Summing up offers a fresher title** — **VERIFY, built 2026-10-02 (plan 79, `a7fe4ac2`, `888a0efa`, `379f8d8b`, `aaf9dca3`), asked for by the maintainer 2026-09-25 ([D122](audit/maintainer-decisions-locked.md#d122--locked-2026-10-02-raised-2026-10-02--plan-79-the-last-session-before-060-the-ten-calls) call 6).**
  When the AI judges the chat's title stale, the summary card ends with "Rename this chat to ...?" with Rename and Keep; a chat renamed by hand is never offered one. **Deck 2026-10-02 (build `d810328b`):** an offer from the automatic summing-up showed both buttons, the D-pad reached both, and Keep took the offer away and left the title.
  **Still owed:** pressing Rename (never pressed, so "a yes renames the chat everywhere it shows" is unproven) and the Sum up button route (it was greyed, already summed up). Row **P79-FRESHER-TITLE**. Evidence `docs/test-evidence/plan79-P79-FRESHER-TITLE.json`.
- ★★ `[ui]` **Calmer rating choices under an answer** — **VERIFY, built 2026-10-02 (plan 79, `8b414628`), asked for by the maintainer; the maintainer picked drawing 2, smaller and softer.**
  Helpful, Not really and the "What went wrong?" choices are smaller and softer. **Deck 2026-10-02 (build `d810328b`):** the thumbs measure 28 px tall, the reasons 24 px, the words 11 px, and the D-pad walk has no dead press (row **P79-M7-RATING-ROW**, in Done). Colours were not measured against the drawing, so **the look is still the maintainer's to judge.** The wider rule (look for other loud spots) stays open.
  Evidence `docs/test-evidence/plan79-P79-M7-RATING-ROW-AFTER.json`. Test: `src/styles/sections/replyRatingChoices.test.ts`.
- ★★★ `[ollama]` **Fold the "Models & routing" section into the AI models box** — **VERIFY, built 2026-10-02 (plan 79, the maintainer's pick, option C; `24708949`, `81ea843d`, `6c70c744`, `4337adbd`, `98ba929e`, `9a33f7bb`).**
  The Ollama tab has one "AI models" button; in the box each installed model shows its place in the try order with up and down buttons, a Text / Pictures switch picks the order, "Reset order" asks first, PC models get their own rows and models too big for the Deck say they are skipped. The two old try-order screens are gone.
  **Deck 2026-10-02 (build `6e297645`):** opening and closing the box, the Try order row and its arrows, Reset order and the Text / Pictures switch pass. **Still owed:** moving a model to another place (only one answering model is installed), the "Skipped: too big" label, and the half with the AI on a PC. Row **P79-MODELS-TRY-ORDER**. Evidence `docs/test-evidence/plan79-P79-MODELS-TRY-ORDER.json`.
- ★★★ `[layout]` `[focus]` `[chips]` **While reading an answer, the Show details line takes the suggestion chip's place above the question box** — **VERIFY, built 2026-10-02 (plan 79, `5a19a558`), filed by the maintainer 2026-09-23; the maintainer picked way 2, a short cross-fade.**
  While an answer is read and its own Show details line is out of sight, that line sits in the chip's place; once the real line is on screen, or the answer is scrolled past, the chip comes back. A on the slot's line opens the details; Up from the question box lands on whatever the slot shows. Tests: `src/features/details-slot/DetailsSlot.deck.test.tsx`.
  **Deck 2026-10-02 (build `c98f749e`):** the slot's wording, the chip's return, B closing details with the ring staying, and Up from the slot or a chip pass. **Still owed:** reaching the slot's line from the question box and pressing A on it (needs a right-stick scroll, the maintainer's hand check, checks page, Friday check 4), and the closed line landing 8 px inside the top.
  Row **P79-SHOW-DETAILS-SLOT**. Evidence `docs/test-evidence/plan79-P79-DETAILS-SLOT.json`.
- ★★ `[chips]` **Long suggestion chips: pause at the end, centred text** — **VERIFY, built 2026-10-02 (plan 79, `2fa5a5a4`, `70a47e4b`) and changed 2026-10-03 (plan 81, `0b46df34`, `fc1f1d51`), asked for by the maintainer.**
  **The maintainer's call 7 ([D124](audit/maintainer-decisions-locked.md#d124--locked-2026-10-03-raised-2026-10-03--plan-81-the-final-bug-session-before-060-the-ten-calls)):** a long chip now tells its row when its own scroll ends, and the row replaces it one pause (1.5 s) later, instead of 3 to 10 s later on the row's own beat. In the fade style (the default) the chip starts fading at that moment; in the plain and decode styles the words swap then. Two long chips can now change about 0.35 s apart (was 2.5 s). The sliding style keeps its own beat. A chip under the ring still never changes.
  **Owed again on the new build** (row **P79-LONG-CHIPS**): over 200 s with a game running, every long chip starts to leave 1.2 to 1.9 s after its words stop (fade style: the moment its opacity starts to fall); a chip under the ring never changes; a short chip's words are centred within 2 px (still never measured).
  Before the change (Deck 2026-10-02, build `678aaa3d`, Hades running): the words scrolled to their end and stood still, but the chip left 3.2 to 10.2 s later. Evidence `docs/test-evidence/plan79-P79-LONG-CHIP-PAUSE.json`. The soft blue fill passed and is in Done.
  Tests: `src/features/preset-carousel/presetChipStay.row.test.tsx`, `src/styles/presetChipFocusRing.test.ts`.

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

**Closed 2026-10-03 (plan 81, from Bugs):**

- ★ `[focus]` **Steam's own scroll keeps a top margin even for a stop already on screen, which the test setup does not model** — **DONE 2026-10-03, test setup only, no Deck check owed (`0e885c77`).** The test setup can now model Steam's 116 px top margin (an option, off by default): a small stop lying wholly above y 204 is carried to 204, as the Deck measured. Nothing a player sees changes. Switched on for every walk, 18 older walk tests fail, all with the dock at 262 (a higher dock than the Deck's 290): a small section carried to 204 is then cut off by that dock. Proof: `src/utils/answerBubbleNavigation.steamTopMargin.test.ts` reproduces the landings in `docs/test-evidence/plan78-P78-DOWN-SHORT-SECTION.json`.

**Closed 2026-10-03 (plan 80, from Verify):**

- ★★ `[chips]` **The game's own chip never came back, and the chips turned over too slowly** — **DONE 2026-10-01, passed on the Deck (plan 78, rows P78-TIP-CHIP and P78-CHIP-PACE; fixes `092517c1`, `5e3e0f7e`).** One rule now picks the next chip in all four styles, and one rule sets how long a chip stays. Measured on the Deck: about 9.5 chips a minute, and the game's own chip was 55 percent of those shown. Evidence `docs/test-evidence/plan78-P78-TIP-CHIP-try2.json`, `docs/test-evidence/plan78-P78-CHIP-PACE-try2.json`. **Still owed to the maintainer:** their own look at the pace and their pick from the preview page. [Cause and rules](archive/roadmap-trimmed-2026-10-roadmap-details.md#the-games-own-chip-never-came-back-and-the-chips-turned-over-too-slowly).
- ★ `[reply]` **Quit or switch games while a Strategy answer writes, and the old game's checklist is drawn under it** — **DONE 2026-10-03, closed on its unit tests by the maintainer's call ([D123](audit/maintainer-decisions-locked.md#d123--locked-2026-10-03-raised-2026-10-03--plan-80-check-the-roadmap-and-tidy-it-the-ten-calls), answers; fix `a92cabe4`).** The checklist is now drawn only if the answer's game is still the running game, and it is still saved under the game it was for. No Deck row exists, because it cannot be made to happen reliably. Tests in `src/hooks/useBonsaiAskOrchestration.afterAnswer.test.ts`; finding in `docs/test-evidence/plan78-G-after-answer-readthrough.md` (finding 3).

**Closed 2026-10-02 (plan 79, Deck block 4, builds `c98f749e`, `49fc8894` and `156baf42`):**

- ★ `[focus]` **Around underlined words, Up is not always the reverse of Down** — **DONE 2026-10-02, passed on the Deck (row P79-UP-MIRRORS-DOWN-WORDS; fixes `5c78fdbc`, `c1efd8e8`, `156baf42`).** With Deep Rock Galactic: Survivor running, both underlined words were stops going Down and going Up, none twice, Retry never. Both Up walks, straight after the Down walk and from Ask, were the Down walk reversed. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json`.
- ★★ `[focus]` **Walking Up into an answer from below can leave its last section behind the question box** — **DONE 2026-10-02, passed on the Deck (row P79-UP-MIRRORS-DOWN-NEWEST-CLOSED; fix `17a54809`).** The Up landing is placed again after Steam finishes its own glide. On three answers every Up landing was wholly in view, and the last section sat just above the dock. Evidence `docs/test-evidence/plan79-P79-UP-LANDING-VISIBLE.json`, `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-NEWEST-CLOSED-try2.json`.
- ★ `[focus]` **Opening or closing a day line in the "N earlier" list drops the ring for one press** — **DONE 2026-10-02, passed on the Deck (row P79-DAY-LINE-RING; fix `c98f749e`).** A on "N earlier" and on each of the three day lines leaves the ring on the line; one Down goes to its first question and one Up back to the line; B closes the line with the ring still on it. Evidence `docs/test-evidence/plan79-P79-DAY-LINE-RING.json`.
- ★ `[focus]` **In an answer with two spoiler covers, the last section under the second cover is a stop going Down but is skipped going Up** — **DONE 2026-10-02, passed on the Deck (row P79-UP-MIRRORS-DOWN-SPOILER; fix `c1efd8e8`).** Up visits the same stops as Down in reverse, the last section under the second cover included, none twice, Retry never a stop, no cover pressed. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-SPOILER.json`.
- ★ `[focus]` **With "N earlier" opened, Up from the chip row jumps to the open turn at the top and skips the collapsed question rows** — **DONE 2026-10-02, passed on the Deck for the order (row P79-UP-MIRRORS-DOWN-NEWEST-CLOSED; fixes `945bcd65`, `c1efd8e8`).** The newest question's row comes first after the chip, then the day lines and every question row in the reverse of Down, none twice, never Retry. A separate fault on that walk (the last answer section hidden behind the question box) is the entry above about walking Up into an answer from below (fix `17a54809`). Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-NEWEST-CLOSED.json`.
- ★★ `[focus]` **Up from the question box skips rows when the newest question is closed and an older one is open** — **DONE 2026-10-02, passed on the Deck (row P79-UP-MIRRORS-DOWN-NEWEST-CLOSED; fix `945bcd65`).** Up from the box lands on the chip, then on the newest question's row, not on the older question's Show details. Same evidence file as the entry above.
- ★ `[ui]` **The two Clear boxes in Settings open on the button that clears nothing** — **DONE 2026-10-02, passed on the Deck (row P79-CLEAR-BOXES-SAFE; fix `06a22276`).** "Clear session cache?" opened on "Keep cache" and A there cleared nothing; "Clear all plugin data?" opened on "Keep my data" and B closed it with the settings file unchanged. B on the second box also moved the panel to Main, filed under Bugs. Evidence `docs/test-evidence/plan79-P79-SETTINGS-CLEAR-BOXES.json`.
- ★ `[ollama]` **The "Large model - continue?" box opens on the button that queues nothing** — **DONE 2026-10-02, passed on the Deck (row P79-BIG-MODEL-BOX-SAFE; fix `bd799953`).** Selecting qwen2.5:14b (8.4 GB) opened the box with the ring on "Not now"; A there closed it, selected nothing and queued nothing, and the installed models were unchanged. Evidence `docs/test-evidence/plan79-P79-BIG-DOWNLOAD-BOX.json`.

**Plan 70 (2026-09-26 to 2026-09-27): 41 items closed** — the knowledge-base wave four and the Deck test wave,
flows L1 to L7 and the helpers' landings. Each one, word for word, with its evidence: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md); the long notes in
[roadmap-details.md](roadmap-details.md); the plan's own record in
[archive/70-kb-wave-four-and-deck-test-wave.md](archive/70-kb-wave-four-and-deck-test-wave.md) § 11.
