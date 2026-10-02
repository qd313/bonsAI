# bonsAI Roadmap

> Trim task, done 2026-09-15: the roadmap's earlier trims and what was left are written up in [roadmap-details.md](roadmap-details.md#roadmap-clean-up-task-trim-this-file-done-2026-09-15).

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

**Maintainer note (2026-09-05, helpers updated 2026-09-28): pick the model before you pick up an item.** Helpers run
on Sonnet 5.5: high by default, medium only when the fix is mechanical · ★★★–★★★★ Opus xhigh plans and lands · ★★★★★+
Fable max plans only, Sonnet high helpers build, Opus xhigh lands · `[focus]` `[layout]` `[ui]` measure on the Deck
first, then Opus xhigh, never a lane without the measurement · docs and bookkeeping the bookkeeper on Sonnet medium. The full policy — the bookkeeper guard, the escalation rule,
the Haiku trial — is in [AGENTS.md § 3](../AGENTS.md), the evidence in
[planning/33-model-routing.md](planning/33-model-routing.md). A prompt-time hook gives a gentle heads-up when a session
starts work outside this.

---

## Bugs


- ★ `[QA]` **The walk check calls a stop hidden when a corner icon merely overlaps its box** — **OPEN,
  measured on the Deck 2026-09-21.** It judges a stop by sampling its rectangle, so the question row and the
  last answer section always read part-hidden behind the Retry and Copy icons — though the words clear those
  icons by design. Measured: the question's text starts 6px past the Retry icon's edge; the answer's last
  line clears the Copy icon and only its line spacing touches it. Two entries were filed on this and withdrawn
  the same night, and the question-row entry has now been opened and closed twice on it. Until the check reads
  text rather than boxes, measure the text before filing. Evidence
  `docs/test-evidence/plan63-CORNER-ICON-COVERAGE-01.json`.
  **2026-10-01 (plan 78):** the answer's last line overlapped the Copy icon by 7 by 3 px. Full note: [roadmap-details.md](roadmap-details.md#the-walk-check-calls-a-stop-hidden-when-a-corner-icon-merely-overlaps-its-box).
- ★ `[focus]` **Steam's own scroll keeps a top margin even for a stop already on screen, which the test setup does not model** — **OPEN, found 2026-09-30 in the test setup (plan 78 helper D), not seen on the Deck.**
  On the Deck a cover the walk placed at y 104 ended at y 204. No player-visible fault is known; this is a note so the next walk fix knows. Found while fixing the extra Down press (`84cc0029`).
- ★ `[focus]` **Walking Up can land on a section taller than the screen with only a sliver of it showing at the top** — **OPEN, found 2026-09-30 in the test setup (plan 78 helper D), not seen on the Deck.**
  Only 1 to 8 px of the section shows at the top. It passes the "bottom edge showing" rule but looks poor. The fix would be where an Up landing on a tall section is settled. Found while fixing the extra Down press (`84cc0029`).
- ★ `[focus]` **Walking Up onto a tall first answer section shows only its top third above the dock** — **OPEN, seen on the Deck 2026-10-02 (plan 79, build `156baf42`).**
  With a game running, the Up landing on the first section of the answer had 33 percent of it above the dock; the Down walk showed the same section 67 percent. The walk itself goes on and the section is a stop both ways. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json`.
- ★ `[focus]` **The plugin's own claim of the ring when the panel reopens may not run after a switch between Quick Access tabs** — **OPEN, found 2026-10-02 while fixing the trap (plan 79); needs a Deck check before anything is built.**
  Not seen on the Deck yet, so it is only a suspicion from reading the code. No evidence file.
- ★ `[focus]` **Some controls get only a thin grey frame, and the Steam Web API key field gets no ring** — **OPEN, seen on the Deck 2026-10-02 (plan 79, build `678aaa3d`); every stop is still visible, so the ring walk passed.**
  On the Settings tab the accent intensity button and "Reinstall voice engine" show a thin grey frame, dimmer than the white ring, and the two voice model rows a grey frame round the whole row. On the Developer tab the Steam Web API key field turns white with no ring.
  Evidence `docs/test-evidence/plan79-P79-RING-WALK-TABS.json`.
- ★ `[focus]` **An underlined game word's own tooltip can cover the word itself** — **OPEN, seen on the Deck 2026-10-02 (plan 79, build `49fc8894`, Deep Rock Galactic: Survivor running).**
  Walking Down, the second underlined word was a stop with only 33 percent of it showing, because a tooltip box was drawn over it; the first word showed whole. Not seen going Up. No fix has landed yet. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS.json`.
- ★ `[layout]` **The step that lifts a control clear of the dock moves it about 80 px too far** — **OPEN, measured 2026-10-01 (plan 78 helper D).**
  The choices and Helpful under an answer land at y 172 to 204 with the dock at 290. Harmless for anything under about 116 px tall; answer sections are exempt since `b417c271`. The cure is to take Steam's 80 px out of the lift's margin and re-measure every landing below an answer. For after the release. Evidence `docs/test-evidence/plan78-P78-DOWN-SHORT-SECTION.json`.
- ★ `[reply]` **While an answer arrives, the start of a sentence that ends up behind a spoiler cover can be read for about a second** — **OPEN, seen 2026-10-01 on the Deck (plan 78, Deck block 3a), a note.**
  The words shown held no protected name; the name itself arrived after the words were hidden. Not known whether it was always so; one 250 ms read in the same answer also showed the live text 66 letters shorter and then back. Evidence `docs/test-evidence/plan78-P78-BORROWED-RUNNING-GAME.json`.
- ★ `[reply]` **After the release: the AI's own instructions write the hidden-block label in the odd shape** — **OPEN, from plan 78 (helper N).** Six places in the instructions show the label between two sets of backticks (`ollama_prompts.py` line 483; `strategy_spoiler_policy.py` lines 138, 149, 160, 164, 271), the likely reason a small model copies it.
  Rewording them waits for the maintainer's call (plan 78, question 13) and a before-and-after count of covers.
- ★ `[ollama]` **Removing a model on the Deck also drops its name from the saved try order, even when the AI runs on a PC that has the same model** — **OPEN, found 2026-10-02 by reading the code (plan 79, models helper); not seen on the Deck.**
  No fix has landed yet. No evidence file.
- ★ `[platform]` **After the release: two clean-ups behind the scenes** — **OPEN, from plan 72.** The step that runs
  after an answer may hold other stale copies (it broke the chips, and once the Strategy checklist): read it through.
  The old live-line trimming code is now unused except by its tests and the Show reasoning tidy: remove it.
  **2026-09-30 (plan 78 helper G):** the read-through is done; its real findings are fixed (Verify). Full note: [roadmap-details.md](roadmap-details.md#after-the-release-two-clean-ups-behind-the-scenes).
- ★ `[platform]` **A plugin reload while a game is running can put Steam's Home screen in front of the game** — **OPEN, found 2026-09-28
  (plan 75).** Seen twice: once the game came back through the Steam menu (`docs/test-evidence/plan38-M1-deck.json`); once it never
  showed a window and Steam's menu could not close it (`docs/test-evidence/t75-feature-F1-REAL-POPUP.json`).
  **Sighting 2026-09-29 (plan 77, block 1a):** after a reload the game was behind Steam's home page; one A on Resume brought it back.
- ★ `[ui]` **B on the "Clear all plugin data?" box also takes the panel from Settings back to Main** — **OPEN, seen on the Deck 2026-10-02 (plan 79, build `c98f749e`).**
  The box closed as wanted, nothing was cleared and the settings file was unchanged, but the plugin was then on the Main tab with the ring on "Main tab". Only the Settings run recorded it; the Clear cache box and the big-download box closed without leaving their tab. No fix has landed yet. Evidence `docs/test-evidence/plan79-P79-SETTINGS-CLEAR-BOXES.json`.
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** —
  **OPEN, back from Verify 2026-09-23: failed by hand, found by the maintainer (build `a224fb6`), after the
  Deck work ended.** After Show details → Session, both tab bars stayed drawn at once — the small "MAIN" bar
  and the big icon bar under it. Touch scrolling did not close the big one; the first D-pad move did.
  Recording `recordings/DeckRecord_20260923_235526_game.mkv` (11 seconds, every frame shows both bars) —
  this recording lives only on the maintainer's own computer; the recordings folder is not saved with the
  project. Row **TAB-BAR-GHOST-01**. The session's guess: closing a Decky popup rebuilds the plugin, and
  the highlight lands on the top bar, which then opens. Needs a Deck walk with the focus recorder before any
  fix.
  **2026-09-29 (plan 77):** the D-pad half did not reproduce. Only the touch half is left; it is on the maintainer's checks page (plan 77).
  Older note: [details](roadmap-details.md#a-faded-ghost-of-the-tab-bar-is-left-drawn-over-the-chip-row-after-touching-the-screen).
- ★★ `[focus]` **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a
  blanket rule was tried and reverted in favour of Steam's native outline. [Detail](roadmap-details.md#small-and-cosmetic-as-filed).
- ★★ `[focus]` **Up from the answer bubble, with Steam's ring on the whole answer, scrolls the whole answer instead of moving the ring** — **OPEN, found 2026-10-02 while fixing the trap (plan 79); not a trap, since the press does something.**
  Not fixed. No evidence file; seen in the test setup's walk, not on the Deck.
- ★★ `[platform]` **Reloading the plugin while a heavy game is running can leave Steam's interface gone until the Deck is restarted** — **OPEN, seen once, 2026-10-01 12:29 (plan 78, Deck block 3e).**
  Black Mesa running, about 550 MB free of 14.8 GB, the rig's plugin reload, then no Quick Access page for six minutes or more; the maintainer restarted the Deck. Evidence `docs/test-evidence/plan78-THINKING-SLOW-01.json`.
  A real player never reloads the plugin this way (it is a developer action), so this is first a rule for the Deck driver. Whether an ordinary Steam restart of the plugin under low memory can do the same is not known.
  In block 3d a reload during a game's start was also followed by the game's window never coming to the front (twice: Deep Rock Galactic: Survivor, Half-Life 2). Related: the entry above about the Home screen in front of a game.
- ★★★ `[layout]` **The chat summary card appears behind the dock until Down is pressed** — **PARTIAL, found
  2026-09-25 (plan 68). Accepted as is for 0.6.0 (the maintainer, 2026-09-27).**
  [Detail](roadmap-details.md#the-chat-summary-card-appears-behind-the-dock-until-down-is-pressed); two older notes moved there 2026-10-01.
  **2026-09-27 (plan 72, `01127c79`, `5dbb9bff`):** two more tries FAILED the same way, `docs/test-evidence/plan72-F7-SUMUP.json`,
  `plan72-F8-SUMUP.json`: Steam keeps the ring on the greyed "Sum up again". **The maintainer's call: leave it as is for 0.6.0** —
  the card shows itself and one Down reaches it; named in the release notes (plan 72 § 8). After the release: finish the
  hand-off or take the tries out of the code (they do no harm).
- ★★★ `[reply]` **Some saved answers have a hidden block's markers written twice, cause unknown** — **PARTIAL,
  found 2026-09-25 (plan 68).** The chat memory now copes with the doubling (`6843f8e1`), but why it happens
  has not been found. Deck check owed.
  [Detail](roadmap-details.md#some-saved-answers-have-a-hidden-blocks-markers-written-twice-cause-unknown).
  **2026-09-30 (plan 77):** the guards PASSED on the Deck; cause unproven, so PARTIAL. Full note: [roadmap-details.md](roadmap-details.md#some-saved-answers-have-a-hidden-blocks-markers-written-twice-cause-unknown).

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
- ★ `[platform]` **Two small build-setup tidy-ups left, deferred on purpose in 2026-08** — **PARTIAL, carried over 2026-09-24 from plan 24 when it was archived.**
  Nothing a person would notice. **Done 2026-10-02 (plan 79):** the version file is written only when it really changes (`b4e838a2`, `49fc8894`), so `npm test` and `npm run build` no longer leave the tree dirty; and the old `pnpm.peerDependencyRules` block is gone from `package.json` (`f3541fd1`).
  **Still open, for the first session after 0.6.0:** name the package manager's version in `package.json` (the workflow repeats it by hand today), and move `packages/bonsai-mcp` off npm so the repo uses one package manager. Both need a GitHub run to prove, which a session cannot make (plan 79, question 13). [Plan § 5](archive/24-track-a-ci-baseline.md).
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
  [Detail](roadmap-details.md#first-run-ghost-new-chat-label).
- ★★ `[chat]` **Search in bonsAI** — **OPEN, asked for by the maintainer 2026-10-02; not built in plan 79.**
  A find box to jump to an earlier question by a word in it, with word buttons built from the questions so a word can be picked with the D-pad alone (A on a text box opens Steam's on-screen keyboard). Option 4 at https://claude.ai/artifact/CjiVzMEe8UipPda2kS2q18.
- ★★ `[chips]` **The four chip styles still differ in small ways, and share no drawing code** — **OPEN, held until after the release (plan 78 helper F; the maintainer's call, D121 item 10).**
  What still differs: what restarts them after an answer, how long each waits after the highlight leaves the row, how many recent chips each avoids, and how each first appears. Folding them into one shared engine is a reshaping of code, so it waits.
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
- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16 on the Deck's
  built-in screen, no single cause, not built in plan 56.** The panel is only 454 pixels tall on the Deck's
  own screen, not the 696 every earlier number assumed, so even a two-turn chat overflows it and a person
  sees about three lines of chat. Fixed rows take 311 of the 454 pixels before any chat starts. Getting more
  room means shrinking or hiding one of those rows — a design call for the maintainer. [Detail](roadmap-details.md#give-the-reclaimed-height-to-the-transcript).
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
  Older dated notes (2026-09-26 and 2026-09-27, the 30 frames a second target and the partial measurement): [roadmap-details.md](roadmap-details.md#what-bonsai-costs-a-running-game).
  **2026-09-29 (plan 76, block 3):** with Deep Rock Galactic: Survivor on its title screen, the panel's median while an answer arrived was
  84.5 frames a second (thinking 90, idle 87.5). Title screen only; a mission running was not tried. Evidence `docs/test-evidence/plan76-SCR-10-try2.json`.
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
- ★ `[focus]` **A press that never opens its box (parental lock on) can leave a stale "return the ring here" note behind** —
  **VERIFY, fixed for all buttons 2026-09-29 (plan 77, `11033561`, tip `7c8ac206`).** Earlier fixed (`6ef8cedf`) for the library's Update and
  "Pull nomic-embed-text" buttons; now also "Update AI & models" and the Tier 1 and Tier 2 install buttons. Deck check owed: row **P77-OLLAMA-NOBOX-NOTE**.
  **2026-09-29 (plan 77):** box half PASSED; the parental-lock half is still owed (maintainer's checks page). Full note: [roadmap-details.md](roadmap-details.md#a-press-that-never-opens-its-box-parental-lock-on-can-leave-a-stale-return-the-ring-here-note-behind).
- ★ `[focus]` **Dismissing the troubleshooting hint hands the ring to the chip's slot, not to chips that are hidden** — **VERIFY, fixed 2026-10-02 (plan 79, `312a1933`). Was OPEN, found 2026-10-02 by reading the code (plan 79, Show details helper).**
  Before, the ring went to the chip row by name, so it could land on hidden chips while the Show details line held the slot; now it goes to the slot. Deck check owed: row **P79-HINT-DISMISS-SLOT** (press Dismiss on the hint, the ring lands on the slot above the question box).
  **Could not run on the Deck 2026-10-02 (build `49fc8894`):** no troubleshooting hint was on screen, twice, and none was forced. Evidence `docs/test-evidence/plan79-P79-HINT-DISMISS-SLOT.json`.
- ★★ `[ask]` **The chat summary reads oddly in places** — **VERIFY, fixed 2026-09-30 (plan 78 helper H, `569abd5f`, `318c0da3`). Was OPEN, found 2026-09-25 (plan 68).**
  The "What the AI remembers" card no longer shows a Game line naming something that is not a game, and no longer shows lines that say nothing ("Stuck on: None apparent in this log"). The Game line is rebuilt from names that can be checked (the chat's own game, a game the library knows, a well-known game); a line is dropped only when its whole answer says nothing, and a real line is never cut. English summaries only.
  Measured on this PC, 45 summaries: a non-game on the Game line in 24 before, 0 after; real lines lost, 0. Unit tests: `tests/test_chat_summary_tidy.py`. Deck row **P78-SUMUP-WORDING**: partly passed, below.
  **2026-10-02 (plan 79, build `f0a4f2c4`), UNCLEAR for the in-a-game half:** the Sum up button stayed greyed ("already summed up") even with the chat's game set to Hades, so no card was made; that half rests on its unit tests. Evidence `docs/test-evidence/plan79-P78-SUMUP-WORDING.json`.
  Older note (2026-10-01): [roadmap-details.md](roadmap-details.md#the-chat-summary-reads-oddly-in-places).
- ★★ `[chips]` **The game's own chip never came back, and the chips turned over too slowly** — **VERIFY, fixed 2026-09-30 (plan 78 helper F, `092517c1`, `5e3e0f7e`). Was OPEN, failed on the Deck 2026-09-26 (plan 70, rows PHASE4-CHIPS-01 and CHIP-ROTATION-01).**
  One rule now decides which chip comes next in all four styles, and one rule decides how long a chip stays (one chip about 7 seconds a turn, two chips about 10 in each spot). The cause and the rules in full: [roadmap-details.md](roadmap-details.md#the-games-own-chip-never-came-back-and-the-chips-turned-over-too-slowly).
  The maintainer's calls: D121 items 9 and 10. Deck rows **P78-TIP-CHIP** and **P78-CHIP-PACE**: both passed on the Deck 2026-10-01. Still owed: the maintainer's own look at the pace and their pick from the preview page.
  **2026-10-01 (plan 78, Deck block 1): both Deck rows passed.** The numbers: [roadmap-details.md](roadmap-details.md#the-games-own-chip-never-came-back-and-the-chips-turned-over-too-slowly).
- ★★ `[reply]` **When the length limit cuts a choice menu, the next part of the answer is lost** — **VERIFY, fixed 2026-09-30 (plan 77 helper L, `4d750ae1`). Was OPEN, found 2026-09-30 (plan 77).**
  On a test build with the limit at 300 tokens, the piece after a menu cut by the length wall never reached the screen or the saved chat. Rare at the normal limit. Evidence `docs/test-evidence/plan77-SOFT-PREDICT-04.json`.
  A cut menu that the continuation does not finish is now dropped cleanly and the rest of the answer is kept, shown and saved. Deck check owed: row **P77-CUT-MENU-TEXT** (the same low-limit run as SOFT-PREDICT-04). Older notes and the full check: [roadmap-details.md](roadmap-details.md#when-the-length-limit-cuts-a-choice-menu-the-next-part-of-the-answer-is-lost).
  **2026-10-01 (plan 78, 3c), UNCLEAR again;** unit tests are the proof. Full note: [roadmap-details.md](roadmap-details.md#when-the-length-limit-cuts-a-choice-menu-the-next-part-of-the-answer-is-lost).
- ★★ `[voice]` **With Voice replies on "When I asked by voice", a spoken question's answer may not read itself aloud** — **VERIFY, fixed 2026-09-30 (plan 78 helper M, `c3a1f16a`, `27a450ed`). Was OPEN, found 2026-09-30 by reading the code (plan 78 helper G), not seen on the Deck.**
  The note "this came from the mic" is now written the moment Ask is pressed, so a spoken question's answer reads itself. Proven by tests that failed before the fix: panel open, panel closed, closed and reopened between question and answer, and a typed question after a spoken one. "Always" and "Off" were never affected.
  Limits: a retry of a spoken question counts as typed and is not read. The first-moments finding (`27a450ed`) rests on its unit test only. Full text: [roadmap-details.md](roadmap-details.md#with-voice-replies-on-when-i-asked-by-voice-a-spoken-questions-answer-may-not-read-itself-aloud).
  Unit tests: `src/features/voice/useVoiceAskWithReadAloud.test.tsx` (6, two of them for finding 5), 2 in `src/hooks/useReadAloud.test.ts`. Deck check owed, and it is the maintainer's, with a real voice: row **READ-ALOUD-05**. Evidence for the finding `docs/test-evidence/plan78-G-after-answer-readthrough.md` (findings 4 to 6).
- ★★ `[reply]` **A Strategy checklist that arrives while the panel is closed never shows, and after any reopen a refine chip sends its follow-up in Speed mode** — **VERIFY, fixed 2026-09-30 (plan 78 helper L, `553f46ec`). Was OPEN, found 2026-09-30 by reading the code (plan 78 helper G), not seen on the Deck.**
  The back end's status now says which mode the question was asked in, and a reopened panel reads it from there instead of assuming Speed; a saved checklist still loading can no longer wipe a new one. Limit: after a reopen a refine chip does not re-send the original screenshot.
  Unit tests: `src/hooks/useBonsaiAskOrchestration.afterAnswer.test.ts`, `tests/test_background_status_ask_mode.py`. Deck row **P78-REOPEN-CHECKLIST**: partly passed, below. Evidence `docs/test-evidence/plan78-G-after-answer-readthrough.md` (finding 1).
  **2026-10-01 (plan 78), partly passed:** the follow-up's mode passed; the checklist half rests on unit tests. Full note: [roadmap-details.md](roadmap-details.md#a-strategy-checklist-that-arrives-while-the-panel-is-closed-never-shows-and-after-any-reopen-a-refine-chip-sends-its-follow-up-in-speed-mode).
- ★ `[reply]` **Quit or switch games while a Strategy answer writes, and the old game's checklist is drawn under it** — **VERIFY, fixed 2026-09-30 (plan 78 helper L, `a92cabe4`). Was OPEN, found 2026-09-30 by reading the code (plan 78 helper G), not seen on the Deck.**
  The checklist is now drawn only if the answer's game is still the running game. It is still saved under the game it was for, with no ticks borrowed from another game's list.
  Proven by unit tests only (in `src/hooks/useBonsaiAskOrchestration.afterAnswer.test.ts`); there is no Deck row, because it cannot be made to happen reliably. Evidence `docs/test-evidence/plan78-G-after-answer-readthrough.md` (finding 3).
- ★★ `[chips]` **After the quick start is opened and closed, the help chip stayed and the suggestion chips never took the row** — **VERIFY, fixed 2026-10-01 (plan 78 helper P, `f0a4f2c4`). Was OPEN, found on the Deck 2026-10-01 (build `9feef02e`).**
  Real, and there for weeks; it showed once one chip filled the whole row. Opening the quick start left a note of the session saying "help not seen", and the fresh panel trusted it over the stored flag. The popup now marks the note as seen. Tests: `src/index.helpChip.test.tsx` (4, 2 fail without the fix). Full cause: [roadmap-details.md](roadmap-details.md#after-the-quick-start-is-opened-and-closed-the-help-chip-stayed-and-the-suggestion-chips-never-took-the-row).
  Deck row **P78-HELP-CHIP-DISMISS**; finding `docs/test-evidence/plan78-PRESET-ONE-LINE-02.json`. The flag reading empty after a reload was the rig's own reload; only "Clear all plugin data" removes it.
  **2026-10-01, UNCLEAR:** not run; rests on unit tests and the first-install check. Full note: [roadmap-details.md](roadmap-details.md#after-the-quick-start-is-opened-and-closed-the-help-chip-stayed-and-the-suggestion-chips-never-took-the-row).
- ★ `[focus]` **When the Steam settings list above the question box closes while the ring is on one of its rows, the ring vanishes until the next press** — **VERIFY, fixed 2026-10-02 (plan 79, `8c8fffb0`). Was OPEN, found 2026-10-02 (plan 79, Deck).**
  The plugin now asks where the ring is while the screen draws, and when the list closes the question box takes the ring through Steam's own hand-over. Test: `src/components/MainTabUnifiedAskBar.settingsCardRingOnHide.test.tsx`.
  Deck check owed: row **P79-SETTINGS-LIST-RING** (ring on a row of the search list, empty the box, a ring is drawn on the question box at once). Not run as written. Close case seen on the Deck 2026-10-02 (build `678aaa3d`, route F): the list closed by itself and the ring moved onto the question box (`plan79-P79-TRAP-ROUTES-AFTER.json`). Before: `docs/test-evidence/plan79-P79-M1-TRAP-try3.json`.
- ★ `[reply]` **A power question's answer often has no number in it** — **VERIFY, fixed 2026-10-02 (plan 79, `7ef1d70f`). Was OPEN, found 2026-09-27 (plan 72), narrowed 2026-09-30 (plan 78 helper I).**
  Power, battery, TDP and frame-cap questions now get the Quick Access tuning instructions, so the answer carries a TDP in watts, a frame cap and a refresh rate. Measured on this PC with the Deck's model, 10 questions three times each: answers with a number you can set went from 3 of 30 to 27 of 30. Tests: `tests/test_power_question_instructions.py`, `tests/test_ollama_service.py`.
  Deck check owed: row **P79-POWER-NUMBERS** (ask a battery question, the answer holds a number you can set). Not run on the Deck; the PC measurement is in the commit message, with no evidence file.
- ★★ `[voice]` **A spoken question sometimes comes out with its words doubled** — **VERIFY, fixed 2026-10-02 (plan 79, `7b6e1de5`). Was OPEN, found by the maintainer 2026-10-02 on the real microphone.**
  Stretches of text that overlap are now merged, so no stretch appears twice. Test: `tests/test_voice_overlap_merge.py`.
  Deck check owed: row **P79-DOUBLED-WORDS** (one recorded sentence five times, no stretch repeated). **The real microphone is the final check and is the maintainer's.** Not run yet.
- ★★★ `[focus]` **After picking a setting from the search list above the question box, Down cannot get past the answer** — **VERIFY, fixes for kin cases landed 2026-10-02 (plan 79, `affa7fa0`, `8c8fffb0`); the maintainer's own route has never reproduced. Was OPEN, found by the maintainer 2026-10-02; only a Steam restart cleared it.**
  Three more routes on the Deck (build `678aaa3d`): the ring on the list's last row then B; the box text replaced from outside so the list closed by itself; A on the row to Quick Settings and back. None trapped: Down moved the ring off the box on the first press and Up walked back. The fix's own state (Steam's ring on the whole answer after a tab switch) could not be made on the rig, and the ring never stuck in two tries (one needed 3 Downs to leave, two of them only scrolled the panel). With the seven earlier tries, nothing has reproduced it.
  **Owed:** the maintainer watching for it in daily use. Row **P79-TRAP-DOWN-BUBBLE**. Evidence `docs/test-evidence/plan79-P79-TRAP-ROUTES-AFTER.json`, `plan79-P79-TRAP-ROUTE-H.json`. Older notes and the first wording: [roadmap-details.md](roadmap-details.md#after-picking-a-setting-from-the-search-list-above-the-question-box-down-cannot-get-past-the-answer).

### Features that need verification

- ★ `[ui]` **Icons on the "Update knowledge base" and "Remove" buttons** — **VERIFY, built 2026-10-02 (`2975570f`), asked for by the maintainer.**
  Update keeps the refresh arrow, Download gets a download arrow, Remove gets a bin; words and D-pad order unchanged. Deck check owed: **P79-KB-BUTTON-ICONS**.
- ★★ `[chips]` **Make the preset chips look more like chips** — **VERIFY, shipped 2026-09-17 under plan 60
  (D110).** Chips now look raised, sit closer together, and the chip the controller is on shows a soft blue fill
  (a light bar until 2026-10-02, the maintainer's pick). Rows 02 to 06 and 08 passed by measurement. Row 09 failed on 2026-09-18, was fixed
  in `895cf0a`, and its dot passed on the Deck 2026-09-26 (`docs/test-evidence/plan70-L6-CHIP-BUTTON-09.json`);
  its scrolling-label half is still owed. Row 07 passed in all three styles: decode 2026-09-26
  (`docs/test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`), fade and static 2026-10-02 (`docs/test-evidence/plan79-CHIP-BUTTON-07.json`). Also owed:
  the maintainer's own look at rows 01 and 05, and at the help and agent chips.
  [Plan](archive/60-chip-button-restyle.md) · [Detail](roadmap-details.md#make-the-preset-chips-look-more-like-chips).

- ★★ `[reply]` **Streamed answers arrive with the same scramble as the decode chips** — **VERIFY, built
  2026-09-24/25.** A Developer tab switch, *Scramble animation*, off by default, churns a live answer's
  newest letters through placeholder symbols before they settle, the way a suggestion chip does.
  [Plan 69](planning/69-streamed-answers-scramble.md), D119. Deck rows **SCR-04**, **SCR-06**, **SCR-08**
  and **DEV-01** pass, and **SCR-05** (reopening mid-answer, `docs/test-evidence/plan70-SCR-05.json`) and **SCR-07**
  (reduced motion, `docs/test-evidence/plan70-L5-FLOW5-REDUCED-MOTION.json`) passed on the Deck 2026-09-26. Owed: the look
  (**SCR-01**, the maintainer's eye) and the game's own frame rate (**SCR-03**). Full rows in [testing.md](testing.md).
- ★★ `[reply]` **The streamed answer's own redraws were costing most of the panel's frame rate** —
  **VERIFY, fixed 2026-09-25 (`bb8d7e5b`, `aae5add6`).** With no game running the panel drew about 19–24
  frames a second while an answer streamed; moving its text on a steady beat instead of every frame, and
  holding its glow still while text arrives, raised that to 56–58 with the scramble off, 44–50 with it on
  — the maintainer's own floor was 45. Evidence `docs/test-evidence/plan69-answer-frame-rate-2026-09-25.json`.
  Owed: the maintainer's own eye on the look, and a run with a game in a mission (title screen passed 2026-09-29: 84.5). Rows **SCR-09**, **SCR-10** in
  [testing.md](testing.md).

- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09. Rows **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01**
  (and **KIDS-LOCK-02** with a child account). Live CEF Stage 0 confirmation still owed. **KIDS-REGRESS-01
  re-confirmed on the Deck 2026-09-17:** no lock banner, all four Permissions switches on and reachable.
  Evidence `docs/test-evidence/plan57-QA-KIDS-REGRESS-01.json`.
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
  failed on 2026-09-18 (evidence `docs/test-evidence/plan61-CHAT-SLOTS-V3-05a-busyhalf.json`, `-06a.json`, `-06b.json`); that bug is on the watch list since 2026-09-29, not reproduced in two clean sessions, and those three rows are not re-run. **15d passed** and **06c passed on its fourth try** on the Deck
  2026-09-23 ("Reply ready" now shows within a second; fixed in `73be15f`); the runs are in the detail.
  [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02) · [More](roadmap-details.md#named-chat-slots).
- ★★ `[chat]` **Summing up offers a fresher title** — **VERIFY, built 2026-10-02 (plan 79, `a7fe4ac2`, `888a0efa`, `379f8d8b`, `aaf9dca3`), asked for by the maintainer 2026-09-25.**
  When the AI judges the chat's title stale, the summary card ends with "Rename this chat to ...?" with Rename and Keep; a chat renamed by hand is never offered one. **Deck 2026-10-02 (build `d810328b`):** an offer from the automatic summing-up showed both buttons, the D-pad reached both, and Keep took the offer away and left the title. **Still owed:** pressing Rename (never pressed, so "a yes renames the chat everywhere it shows" is unproven) and the Sum up button route (it was greyed, already summed up).
  Row **P79-FRESHER-TITLE**. Evidence `docs/test-evidence/plan79-P79-FRESHER-TITLE.json`.
- ★★ `[ui]` **Calmer rating choices under an answer** — **VERIFY, built 2026-10-02 (plan 79, `8b414628`), asked for by the maintainer; the maintainer picked drawing 2, smaller and softer.**
  Helpful, Not really and the "What went wrong?" choices are smaller and softer. **Deck 2026-10-02 (build `d810328b`):** the thumbs measure 28 px tall, the reasons 24 px, the words 11 px, and the D-pad walk has no dead press (row **P79-M7-RATING-ROW**, in Done). Colours were not measured against the drawing, so **the look is still the maintainer's to judge.** The wider rule (look for other loud spots) stays open.
  Evidence `docs/test-evidence/plan79-P79-M7-RATING-ROW-AFTER.json`. Test: `src/styles/sections/replyRatingChoices.test.ts`.
- ★★★ `[ollama]` **Fold the "Models & routing" section into the AI models box** — **VERIFY, built 2026-10-02 (plan 79, the maintainer's pick, option C; `24708949`, `81ea843d`, `6c70c744`, `4337adbd`, `98ba929e`, `9a33f7bb`).** The Ollama tab has one "AI models" button; in the box each installed model shows its place in the try order with up and down buttons, a Text / Pictures switch picks the order, "Reset order" asks first, PC models get their own rows and models too big for the Deck say they are skipped. The two try-order screens are gone.
  **Deck 2026-10-02 (build `6e297645`):** the button opens the box and B closes it with the ring back on the button; the Try order row, the place number with its arrows, the Down and Up stops and the walk along a row pass; Reset order asks with the ring on "Not now" and B leaves the saved order as it was; the Text / Pictures switch works.
  **Still owed:** moving a model to another place (only one answering model is installed), the "Skipped: too big" label, and the half with the AI on a PC. Row **P79-MODELS-TRY-ORDER**. Evidence `docs/test-evidence/plan79-P79-MODELS-TRY-ORDER.json`.
- ★★★ `[layout]` `[focus]` `[chips]` **While reading an answer, the Show details line takes the suggestion chip's place above the question box** — **VERIFY, built 2026-10-02 (plan 79, `5a19a558`), filed by the maintainer 2026-09-23; the maintainer picked way 2, a short cross-fade.**
  While an answer is read and its own Show details line is out of sight, that line sits in the chip's place; once the real line is on screen, or the answer is scrolled past, the chip comes back. A on the slot's line opens the details; Up from the question box lands on whatever the slot shows. Nothing swaps while a question is being answered. Tests: `src/features/details-slot/DetailsSlot.deck.test.tsx`.
  **Deck 2026-10-02 (build `c98f749e`):** the slot reads "Show details" at the top of an answer; the chip is back once the real line is whole on screen (56 px clear; the exact 8 px edge was not sampled); B on the real line closes the details with the ring staying on it; once the real line is off the top the slot reads "Hide details", Up from the box lands on it and A closes the details; Up from the slot or a chip goes to the last stop above. **Still owed:** reaching the slot's line from the question box and pressing A on it (steps 3 and 4). Every D-pad route scrolls the real line into view first, so it needs a right-stick scroll, the maintainer's hand check (checks page, Friday check 4). Also not shown: the closed line landing 8 px inside the top (the closed answer was already at its scroll limit, so the line sat 117 px down).
  Row **P79-SHOW-DETAILS-SLOT**. Evidence `docs/test-evidence/plan79-P79-DETAILS-SLOT.json`.
- ★★ `[chips]` **Long suggestion chips: pause at the end, centred text** — **VERIFY, built 2026-10-02 (plan 79, `2fa5a5a4`, `70a47e4b`), asked for by the maintainer 2026-10-02.**
  **Deck 2026-10-02 (build `678aaa3d`, Hades running, 200 s watched):** the words do scroll to their end and stand still, but the chip leaves 3.2 to 10.2 s later on the row's own beat, not after the pause of about 1.5 s; the 1.5 s wait seen is at the start of each chip, before it scrolls. That is an open question for the maintainer (plan 79, question 12): which pause was meant. Centring a short chip could not be measured, since every chip was longer than its box. The soft blue fill passed and is in Done.
  Row **P79-LONG-CHIPS**. Evidence `docs/test-evidence/plan79-P79-LONG-CHIP-PAUSE.json`. Tests: `src/styles/presetChipFocusRing.test.ts`.

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
- ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **ACCEPTED, 2026-09-28.** Skipped on
  purpose by the maintainer's decision D62 #2 (2026-09-05) to save about a second per Speed question. D62 sketched a fallback
  (run the meaning search only when the word hits are thin); it would need a threshold picked and measured. Kept as an entry.
  `knowledge_base_service.py` line ~1121. [Detail](roadmap-details.md#speed-mode-tip-gap).
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
  **2026-09-30 (plan 77 block 3, row STRAT-SPOIL-NAME-01):** could not run: none of Doom 64, Super Mario 64, Mario Kart 64 or Pikmin 2 is on Recent Games. Evidence `docs/test-evidence/plan77-STRAT-SPOIL-NAME-01.json`.
- ★★ `[KB]` **The note's own words under the reply** — **VERIFY, third run 2026-09-19.** Header, open-scroll
  and live timing all pass; the upward walk lands cleanly on the block's header and the ladder walk holds up
  — the only stop still missing is the chip ladder inside the open block. Why the tip and
  one question in ten arrived late is now explained and fixed; a repeat check on the Deck 2026-09-19 showed
  no gap at all. Rows **NOTES-BLOCK-01**–**07**, **TEN-GAMES-01**, in [testing-manual.md](testing-manual.md).
### Next

- ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch already built.** The answer test's voice
  switch landed 6 September. What's still owed is one run with it turned on. Wave three planned that run
  ([48](archive/48-kb-wave-three-session.md) § 7), but its report has no voice results, so it never ran.
- ★ `[KB]` **Retire the Developer tab's "Install seed knowledge base" button** — **OPEN, an idea from the maintainer
  2026-10-02.** It was a stand-in from before the library was published; its own text still says the public download
  "is not live yet". Check first that no test or Deck walk still uses it.
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
  Done). The chip labels fit on 2026-09-26. The chip promise passed on the Deck 2026-10-01 (P78-TIP-CHIP, P78-CHIP-PACE). Full note: [roadmap-details.md](roadmap-details.md#rag-phase-4-extended-retrieval).
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
- ★ `[KB]` `[watching]` **With a game running, the meaning search once read about a second (1,070 ms, 2026-09-23)** — moved to the watch list 2026-09-29; one sighting (1,070 ms, 2026-09-23), not seen again. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **Down does not move the ring off an unrevealed spoiler block** — moved to the watch list 2026-09-29; one sighting 2026-09-04, never reproduced; the milder form is fixed. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **Down from the chat row once skipped the whole answer, after returning from Settings** — moved to the watch list 2026-09-29; seen once, not reproduced in six tries. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **In carousel style, Down can land on a chip slid mostly off screen** — moved to the watch list 2026-09-29; one sighting, four tries did not reproduce it. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **Three more one-off focus sightings from free play, 2026-09-26** — moved to the watch list 2026-09-29; the accent one is fixed; the other two were one-off and did not reproduce. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **With details open, Down from "N earlier" jumps straight to the notes block** — moved to the watch list 2026-09-29; seen once in plan 70, not reproduced in plan 76. Unshelves on a new sighting.
- ★ `[layout]` `[watching]` **A thin strip of the answer shows through below the game-context line at the bottom of the Main panel** — moved to the watch list 2026-09-29; seen twice in 2026-09, not reproduced since. Unshelves on a new sighting.
- ★ `[layout]` `[watching]` **The "What went wrong?" block once ended 14 pixels under the dock** — moved to the watch list 2026-09-29; seen once, not reproduced. Unshelves on a new sighting.
- ★ `[reply]` `[focus]` `[watching]` **Two more sightings, 2026-09-26 (the chip ladder and two wrong answers)** — moved to the watch list 2026-09-29; the chip ladder steps one chip per press both ways, and the two wrong answers were not reproduced. Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **A Down press left a long answer section 22% visible behind the tab bar, and a Down in the chip ladder left it 67% visible behind the Ask bar's icon** — moved to the watch list 2026-09-30; each seen once in plan 77 block 4 and not reproduced on purpose; neither is a known false alarm. Unshelves on a new sighting.
- ★ `[ollama]` `[focus]` `[watching]` **In the AI models Filters panel, Down from "Also try open-weight models" skipped "Any installed model"** — seen once, 2026-10-01 (plan 78, Deck block 3a; evidence `docs/test-evidence/plan78-P78-ORDER-PRUNE-try2.json`). Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **Down is dead from the last chip in the Show details chip ladder** — seen once, 2026-10-01 (plan 78, Deck block 3a; evidence `docs/test-evidence/plan78-DOC-SWEEP-01.json`). Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **After the screenshot picker closes, nothing holds the highlight until the next press** — seen once, 2026-10-01 (plan 78, Deck block 3a; evidence `docs/test-evidence/plan78-DOC-SWEEP-01.json`). Unshelves on a new sighting.
- ★ `[reply]` `[watching]` **Strategy choice labels stayed English with the reply language set to Japanese** — seen once, on two tries, 2026-10-01 (plan 78, Deck block 3a; evidence `docs/test-evidence/plan78-LANG-03.json`). Unshelves on a new sighting.
- ★ `[focus]` `[watching]` **With a game running, the dock's top measured the same as with none** — seen once, 2026-10-01 (plan 78, Deck block 3b): y 290 both ways, where the test setup had assumed about 262 with a game. Evidence `docs/test-evidence/plan78-QA-FREE-PLAY-01-GAME-try3.json`. Unshelves on a new sighting.
- ★ `[platform]` `[watching]` **After a deploy, opening the plugin with the rig's own call failed three times before it worked** — seen once, 2026-10-01 (plan 78, Deck block 3b): two "could not reach CEF debugger" reads right after the deploy, then the QAM chord was sent but no pane appeared once. A tool note (also in [mcp-setup.md](mcp-setup.md)). Evidence `docs/test-evidence/plan78-P78-TALL-SECTION-LOOP-AFTER.json`. Unshelves on a new sighting.
- ★★ `[ui]` **Glance view: the answer alone, in big text** — shelved 2026-09-12: too much UI change, and not
  ready for it yet. Unshelves on the maintainer's word; the mockup is kept.
- ★★ `[chat]` `[watching]` **A chat that is still writing does not look busy from another chat** — moved to the watch list 2026-09-29; seen three times, then not reproduced in two clean sessions. Unshelves on a new sighting.
- ★★ `[chat]` `[focus]` `[watching]` **A chat opened with RB while a game runs is drawn as history, and Down dies on its question line** — moved to the watch list 2026-09-29; seen once, not seen again in plan 72; named in the release notes. Unshelves on a new sighting.
- ★★ `[focus]` `[watching]` **Walking Down while an answer is still arriving loses the ring** — moved to the watch list 2026-09-29; seen once in plan 70, not reproduced in three tries. Unshelves on a new sighting.
- ★★ `[ollama]` `[focus]` `[watching]` **A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab** — moved to the watch list 2026-09-29; a touch report that the rig cannot reproduce. Unshelves on a new sighting.
- ★★★ `[KB]` **KB download Cancel, the Deck check** — shelved 2026-09-19 (D113). The download finishes in
  about a second, too fast to press Cancel in. Unshelves when a throttle or a slower test copy exists.
- ★★★ `[voice]` **Voices for the bundled characters** — shelved 2026-09-08 (D74). Unshelves after the
  character sweep, a legal check and the open licence call.
- ★★★ `[voice]` **Trained voices for the bundled characters** — shelved with the clip route 2026-09-08 (D74).
  Same legal gate, plus the plugin hosting voice files for the first time.
- ★★★ `[focus]` `[watching]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** — moved to the watch list 2026-09-29; most likely the same family as the D-pad trap fix in Verify (row P76-TRAP-FIX); plan 77's long play test decides it. 2026-09-29: plan 77's long play test was clean (24 of 24); still watched. Unshelves on a new sighting.
- ★★★★ `[voice]` **A voice for a custom character** — shelved with the bundled voices 2026-09-08 (D74). Same
  legal gate.
- ★★★★★ `[platform]` **Global quick-launch macro** — shelved 2026-09-19 (D113), the maintainer said drop it.
  Never run on hardware. Unshelves on the maintainer's word.

---

<a id="done-for-v050"></a>

## Done for v0.5.0

Everything shipped since v0.4.9 (2026-07-08), one line each — moved out to its own file to keep this one small,
copied line for line, nothing reworded: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).

Newest first. Every earlier closed block, from 2026-09-16 up to plan 78's Deck block 3c and now also plan 73's hand check,
plan 78's blocks 3f and 3d, the 2026-09-26 docs clean-up and now plan 79's Deck blocks 2a to 3a, was moved into that file, copied line for line, nothing
reworded, to keep this document under its size limit. The archive file says when each block moved.

**Closed 2026-10-02 (plan 79, Deck block 4, builds `c98f749e`, `49fc8894` and `156baf42`):**

- ★ `[focus]` **Around underlined words, Up is not always the reverse of Down** — **DONE 2026-10-02, passed on the Deck (row P79-UP-MIRRORS-DOWN-WORDS; fixes `5c78fdbc`, `c1efd8e8`, `156baf42`).** With Deep Rock Galactic: Survivor running, both underlined words were stops going Down and going Up, none twice, Retry never. Both Up walks, straight after the Down walk and from Ask, were the Down walk reversed. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json`.
- ★★ `[focus]` **Walking Up into an answer from below can leave its last section behind the question box** — **DONE 2026-10-02, passed on the Deck (row P79-UP-MIRRORS-DOWN-NEWEST-CLOSED; fix `17a54809`).** The Up landing is placed again after Steam finishes its own glide. On three answers every Up landing was wholly in view, and the last section sat just above the dock. Evidence `docs/test-evidence/plan79-P79-UP-LANDING-VISIBLE.json`, `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-NEWEST-CLOSED-try2.json`.
- ★ `[focus]` **Opening or closing a day line in the "N earlier" list drops the ring for one press** — **DONE 2026-10-02, passed on the Deck (row P79-DAY-LINE-RING; fix `c98f749e`).** A on "N earlier" and on each of the three day lines leaves the ring on the line; one Down goes to its first question and one Up back to the line; B closes the line with the ring still on it. Evidence `docs/test-evidence/plan79-P79-DAY-LINE-RING.json`.
- ★ `[focus]` **In an answer with two spoiler covers, the last section under the second cover is a stop going Down but is skipped going Up** — **DONE 2026-10-02, passed on the Deck (row P79-UP-MIRRORS-DOWN-SPOILER; fix `c1efd8e8`).** Up visits the same stops as Down in reverse, the last section under the second cover included, none twice, Retry never a stop, no cover pressed. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-SPOILER.json`.
- ★ `[focus]` **With "N earlier" opened, Up from the chip row jumps to the open turn at the top and skips the collapsed question rows** — **DONE 2026-10-02, passed on the Deck for the order (row P79-UP-MIRRORS-DOWN-NEWEST-CLOSED; fixes `945bcd65`, `c1efd8e8`).** The newest question's row comes first after the chip, then the day lines and every question row in the reverse of Down, none twice, never Retry. A separate fault on that walk (the last answer section hidden behind the question box) is filed under Bugs. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-NEWEST-CLOSED.json`.
- ★★ `[focus]` **Up from the question box skips rows when the newest question is closed and an older one is open** — **DONE 2026-10-02, passed on the Deck (row P79-UP-MIRRORS-DOWN-NEWEST-CLOSED; fix `945bcd65`).** Up from the box lands on the chip, then on the newest question's row, not on the older question's Show details. Same evidence file as the entry above.
- ★ `[ui]` **The two Clear boxes in Settings open on the button that clears nothing** — **DONE 2026-10-02, passed on the Deck (row P79-CLEAR-BOXES-SAFE; fix `06a22276`).** "Clear session cache?" opened on "Keep cache" and A there cleared nothing; "Clear all plugin data?" opened on "Keep my data" and B closed it with the settings file unchanged. B on the second box also moved the panel to Main, filed under Bugs. Evidence `docs/test-evidence/plan79-P79-SETTINGS-CLEAR-BOXES.json`.
- ★ `[ollama]` **The "Large model - continue?" box opens on the button that queues nothing** — **DONE 2026-10-02, passed on the Deck (row P79-BIG-MODEL-BOX-SAFE; fix `bd799953`).** Selecting qwen2.5:14b (8.4 GB) opened the box with the ring on "Not now"; A there closed it, selected nothing and queued nothing, and the installed models were unchanged. Evidence `docs/test-evidence/plan79-P79-BIG-DOWNLOAD-BOX.json`.

**Plan 70 (2026-09-26 to 2026-09-27): 41 items closed** — the knowledge-base wave four and the Deck test wave,
flows L1 to L7 and the helpers' landings. Each one, word for word, with its evidence: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md); the long notes in
[roadmap-details.md](roadmap-details.md); the plan's own record in
[archive/70-kb-wave-four-and-deck-test-wave.md](archive/70-kb-wave-four-and-deck-test-wave.md) § 11.
