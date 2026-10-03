# Plan 80, step 1 — findings sheet 2: Features, first half

- Slice: `docs/roadmap.md`, from the `## Features` heading (line 134) up to, but not including, "Connection doctor" (line 249). One to three stars.
- Date: 2026-10-03. Branch: `experimental`. Read-only check; no roadmap file was edited.
- Entries: 24.
- Verdicts: true 20 · stale 3 · unclear 1 · done with proof 0 · fixed with no proof 0.

Locked-decision links below are relative to `docs/roadmap.md`. D40, D64 and D79 now sit in the archive file, not the locked file.

## Intent packs later review
- **Where:** Features, line 140. One star, tag ask.
- **Verdict:** true.
- **Proof:** the quiet search aliases still ship: `src/hooks/useIntentPacks.ts`, and `src/hooks/useSteamSettingsSearch.ts:120` calls `searchSettingsWithIntentPacks`. The link target exists: `docs/archive/45-settings-shortcut-card.md`, heading "5. Two things about the search that are not obvious" (line 67).
- **Decision owed?** yes, the maintainer's call on delete, keep quiet or revive. Related: `audit/maintainer-decisions-archive.md#d79--locked-2026-09-06-raised-the-same-day--the-steam-settings-shortcuts-move-above-the-question-box`.
- **Test owed?** no evidence exists, and none is needed until the call is made.
- **Proposed entry:**
  - ★ `[ask]` **Intent packs later review** — **OPEN.** The quiet search aliases still ship. The maintainer decides whether to delete them, leave them quiet, or revive them under Developer.
  - The bundled Deck basics list ships switched on and is the only reason a whole sentence matches a setting: *can you help me with performance* returns three results (D79, 2026-09-06).
  - Not in scope: bringing back Proton journal inject without a redesign. [Detail](archive/45-settings-shortcut-card.md#5-two-things-about-the-search-that-are-not-obvious).
- **Long notes:** none.

## Two small build-setup tidy-ups left, deferred on purpose in 2026-08
- **Where:** Features, line 148. One star, tag platform.
- **Verdict:** true.
- **Proof:** commits `b4e838a2` (version file written only when it changes), `49fc8894` (comment fix) and `f3541fd1` (drops the old `pnpm.peerDependencyRules` block) all exist. `package.json` has no `packageManager` line and no `peerDependencyRules` block. `packages/bonsai-mcp` still has its own `package-lock.json`, so it is still on npm. `.github/workflows/tests.yml:55` still installs pnpm by hand. Plan link target `docs/archive/24-track-a-ci-baseline.md` § 5 exists (line 119).
- **Decision owed?** no decision recorded (the roadmap names "plan 79, question 13"; I did not find a decision of that number).
- **Test owed?** yes, a GitHub run; no evidence exists.
- **Proposed entry:**
  - ★ `[platform]` **Two small build-setup tidy-ups left** — **PARTIAL.** Nothing a person would notice.
  - Done 2026-10-02 (plan 79): the version file is written only when it really changes (`b4e838a2`, `49fc8894`), and the old `pnpm.peerDependencyRules` block is gone (`f3541fd`).
  - Still open, for the first session after 0.6.0: name the package manager's version in `package.json`, and move `packages/bonsai-mcp` off npm. Both need a GitHub run to prove. [Plan § 5](archive/24-track-a-ci-baseline.md).
- **Long notes:** none.
- Hashes re-checked after the full history arrived: all three resolve with the roadmap's eight-letter forms.

## A leftover piece of state from the deleted settings-card keyboard marker
- **Where:** Features, line 154. One star, tag ui.
- **Verdict:** stale.
- **Proof:** the entry says nothing acts on `selectedIndex` any more. It does: `src/components/MainTabUnifiedAskBar.tsx:969` reads it (`isSelected = i === selectedIndex`), and lines 1026, 1045 and 1049 use it to colour the settings-card row. It is set by `src/hooks/useSteamSettingsSearch.ts:126` (a click on a settings row passes its index to `setSelectedIndex`), cleared at `MainTabUnifiedAskBar.tsx:454`, `useBonsaiAskOrchestration.ts:928` and `useSessionResetActions.tsx:184`, and restored in `useSessionRestoreAfterRemount.ts:116`. It also appears in `src/components/MainTabUnifiedAskBar.types.ts:40` and in about fifteen test files. The entry's "three files" is therefore too few.
- **Decision owed?** no decision recorded.
- **Test owed?** no evidence exists.
- **Proposed entry (needs the owner to confirm what the highlight on a clicked row does on the Deck):**
  - ★ `[ui]` **A leftover piece of state from the deleted settings-card keyboard marker** — **OPEN, found 2026-09-16.**
  - The old fake on-screen marker is gone, but a stored row number is still kept and passed through several files. Today it only paints the row you last clicked in the settings card.
  - Nothing a person clearly notices. Removing it touches more than three files (the main file, the ask bar and its types, three hooks).
- **Long notes:** none.

## A quiet cue that a cut question can be opened
- **Where:** Features, line 160. Two stars, tag chat.
- **Verdict:** true.
- **Proof:** `src/styles/sections/questionBubble.ts:209-225` has only the always-on last-line fade for an overflowing open question; its own comment says the focus-driven cue "is a separate Features entry, still unbuilt". The answer-bubble fade is at `src/styles/sections/answerBubble.ts:246`.
- **Decision owed?** the choice of the fade was made 2026-09-05 by the maintainer; no D number found in the decisions files.
- **Test owed?** yes, one Deck look at what focus shows on a question bubble. No evidence exists.
- **Proposed entry:**
  - ★★ `[chat]` **A quiet cue that a cut question can be opened** — **OPEN, filed 2026-09-05.** When the ring lands on a question cut short, nothing says the rest is there.
  - Chosen: the text fades at the right edge only while the ring is on it, nothing for a finger.
  - The same fade already exists for cut-off answers. One check owed first: the question bubble turns its own outline off, so look on the Deck at what focus shows.
- **Long notes:** none linked.

## First-run ghost "New chat" label at the create position
- **Where:** Features, line 167. Two stars, tag chat.
- **Verdict:** true.
- **Proof:** no code builds it (no ghost label in `src/`). The decision that the create position is the literal `[+]` is in `audit/maintainer-decisions-archive.md` (around line 2603, "Pressing A on the [+] position..."). Long note exists at `roadmap-details.md` line 590.
- **Decision owed?** yes, reopen the `[+]` decision before building. I did not find a heading number for the board 8f re-confirmation; no decision recorded as its own heading.
- **Test owed?** no evidence exists (nothing built).
- **Proposed entry:**
  - ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.**
  - The create position is the literal `[+]` (re-confirmed on board 8f). Reopen that decision before building. [Detail](roadmap-details.md#first-run-ghost-new-chat-label).
- **Long notes:** the heading is nine lines; keep it whole (goal and the "reopen the decision" rule). Nothing to archive.

## Search in bonsAI
- **Where:** Features, line 173. Two stars, tag chat.
- **Verdict:** true.
- **Proof:** no chat-search code in `src/` (grep for chat search, find box: no hits). Plan 79 did not build it.
- **Decision owed?** no decision recorded (asked for 2026-10-02; option 4 chosen).
- **Test owed?** no evidence exists.
- **Proposed entry:** keep as is (it is already short). One note: the link to the drawing is a claude.ai artifact; confirm it still opens.
- **Long notes:** none.

## The four chip styles still differ in small ways, and share no drawing code
- **Where:** Features, line 176. Two stars, tag chips.
- **Verdict:** true (the hold-until-after-release part).
- **Proof:** commits `092517c1` (one rule for which chip comes next, in all four styles) and `5e3e0f7e` (one rule for how long a chip stays) exist. D121 call 10: "The four styles keep their own drawing code until after the release" (`audit/maintainer-decisions-locked.md`, D121 list item 10). D121 also unified the rules for which chip comes next and how long it stays, so the list of "what still differs" in the entry may be shorter than it says: the chip promise passed 2026-10-01 (`docs/test-evidence/plan78-P78-TIP-CHIP-try2.json`, rows P78-TIP-CHIP and P78-CHIP-PACE per `roadmap-details.md` line 752). I did not compare the four styles in code line by line, so the exact list of differences is not verified.
- **Decision owed?** no new one. Reference: `audit/maintainer-decisions-locked.md#d121--locked-2026-09-30-raised-2026-09-30--plan-78-a-wider-bug-session-and-an-unattended-deck-pass-the-eleven-calls`.
- **Test owed?** no evidence exists (a code reshaping, not a Deck check).
- **Proposed entry:**
  - ★★ `[chips]` **The four chip styles share no drawing code** — **OPEN, held until after the release (D121 call 10).**
  - Folding them into one shared engine is a reshaping of code, so it waits. The rules for which chip comes next and how long it stays were already made the same in plan 78.
  - The entry's list of remaining differences (restart after an answer, wait after the highlight leaves, recent chips avoided, how each first appears) needs the owner to confirm against the code before it stays.
- **Long notes:** none linked.

## Headline first: every answer opens with one line that stands alone
- **Where:** Features, line 181. Two stars, tag reply.
- **Verdict:** true.
- **Proof:** no headline-first prompt in `py_modules`. The 2026-09-12 count is in `docs/planning/assets/53-headline-count-2026-09-12.md`; "not yet" is D99.
- **Decision owed?** yes, the go. `audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip` (and D97 call 4).
- **Test owed?** no evidence exists (nothing built); the first step when the go comes is to recount the 2026-09-07 answer-first run.
- **Proposed entry:**
  - ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed 2026-09-08. Not yet (D99).**
  - The model would open every answer with one short sentence that carries the point and gives nothing away.
  - The 2026-09-12 count: 2 of 10 answers already did, 0 of 10 gave anything away. By the maintainer's own rule that means build it, but they said not yet.
  - [Detail](roadmap-details.md#headline-first-every-answer-opens-with-one-line-that-stands-alone).
- **Long notes:** keep the first paragraph and "When the go comes" sentence. The four plan links are already in the entry's tail. The closing italic "Moved out of the roadmap on 2026-09-21" line can go to the archive.

## Should a streamed answer keep its layout when it finishes?
- **Where:** Features, line 187. Two stars, tag reply.
- **Verdict:** unclear.
- **Why:** the entry itself says it may be moot after September's changes. Plan 69 (streaming) and plan 70 (an arriving answer drawn piece by piece, `docs/testing.md` row STREAM-PIECES-01) changed how an arriving answer is drawn since plan 05's P6 note (2026-08-07). I did not find a place that says whether the two layouts now agree. Someone must read today's streaming code against the finished-answer code.
- **Proof:** `docs/testing.md` lines 240-241; `docs/planning/69-streamed-answers-scramble.md`.
- **Decision owed?** yes, it is a design question. No decision recorded.
- **Test owed?** no evidence exists.
- **Proposed entry:**
  - ★★ `[reply]` **Should a streamed answer keep its layout when it finishes?** — **OPEN, a decision, carried over from plan 05.** Today an answer is laid out one way while it arrives and again when it finishes.
  - Written before September's reply changes. Read today's code first; it may be moot. Touches [plan 69](planning/69-streamed-answers-scramble.md). [P6](archive/05-token-streaming-review.md).
- **Long notes:** none linked.

## Which bundled characters copy a real person
- **Where:** Features, line 194. Two stars, tag reply.
- **Verdict:** true.
- **Proof:** no sweep document exists (searched `docs/` for a per-character list; only the memo section: `docs/planning/42-read-aloud-feasibility.md:364`, "All 31 characters in the picker are named..."). The 2026-09-27 "not needed for 0.6.0" note (plan 72) is a roadmap line only; the memo link target exists.
- **Decision owed?** yes, it gates the shelved character voices: `audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open`.
- **Test owed?** no (a written document, no Deck check).
- **Proposed entry:**
  - ★★ `[reply]` **Which bundled characters copy a real person** — **OPEN, filed 2026-09-08 (D74); the gate for the shelved character voices.**
  - All 31 characters are named characters from games or TV, each voiced by a real actor. Owed: a one-line-per-character sweep of who owns it, whose voice it is, and whether a voice could be a type rather than a copy. [Memo](planning/42-read-aloud-feasibility.md).
  - Not needed for 0.6.0 (plan 72): characters are text only. Still the gate before any character gets a voice.
- **Long notes:** none linked.

## Spoilers by voice
- **Where:** Features, line 202. Two stars, tag voice.
- **Verdict:** true.
- **Proof:** Read answers aloud exists (`src/types/rpcMethods.ts:92` start/stop read aloud; changelog lines 46, 47, 78). No "go on" word handling in `src/` or `py_modules` (grep). It waits on Voice follow-ups, which is unbuilt (next entry).
- **Decision owed?** no decision of its own. Related: D97 (`audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule`).
- **Test owed?** no evidence exists (nothing built).
- **Proposed entry:**
  - ★★ `[voice]` **Spoilers by voice** — **OPEN, filed 2026-09-08; waits on Voice follow-ups.**
  - When a spoken answer reaches a hidden spoiler it says so and waits; "go on" unhides and reads it, anything else skips it. The block on screen unhides with the spoken one. The Deck alone is enough to test. [Plan](planning/49-steam-frame-features.md).
- **Long notes:** none.

## Voice follow-ups
- **Where:** Features, line 207. Two stars, tag voice.
- **Verdict:** true.
- **Proof:** no follow-up listening in `py_modules/backend/services/voice_transcription_service.py:24` ("Does not: ... listen for a wake word"); the Voice replies setting exists (`src/components/SettingsTab.tsx:409`, Off / By voice / Always). Nothing built for the short listen or the tones.
- **Decision owed?** the shape is locked: D97 and D99 (`audit/maintainer-decisions-locked.md#d99--locked-2026-09-12--after-the-frame-bench-two-not-yet-reading-aloud-goes-with-a-three-way-setting-and-a-clear-button-in-the-session-context-strip`).
- **Test owed?** no evidence exists (nothing built).
- **Proposed entry:**
  - ★★ `[voice]` **Voice follow-ups** — **OPEN, filed 2026-09-08; Read answers aloud shipped 2026-09-12.**
  - For a few seconds after a spoken answer ends, the mic listens for four words: again, go on, stop, next. A short rising tone when it opens, a short falling tone when it closes. One setting, off by default.
  - Hangs off the middle position of the Voice replies setting (D99). [Plan](planning/49-steam-frame-features.md) · [Second look § 3](planning/52-frame-features-second-look.md#3-voice-follow-ups-a-sound-a-short-listen-a-few-words).
- **Long notes:** none.

## Give the reclaimed height to the transcript
- **Where:** Features, line 217. Three stars, tag layout.
- **Verdict:** true.
- **Proof:** nothing in `docs/test-evidence` or the changelog shows the fixed rows were shrunk since 2026-09-16 (not exhaustively searched for a changelog line; none found by title). The 454-pixel figure is the entry's own; I did not re-measure (needs the Deck).
- **Decision owed?** yes, a design call for the maintainer. No decision recorded.
- **Test owed?** needs a Deck check only after a design is picked; no evidence exists.
- **Proposed entry:**
  - ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16, no single cause.** On the Deck's own screen the panel is 454 pixels tall, and fixed rows take 311 before any chat starts, so about three lines of chat show.
  - More room means shrinking or hiding one of those rows. A design call for the maintainer. [Detail](roadmap-details.md#give-the-reclaimed-height-to-the-transcript).
- **Long notes:** heading at `roadmap-details.md` line 1213; I did not read it in full. Owner to decide what to keep.

## Dynamic keep-alive / smart unload
- **Where:** Features, line 224. Three stars, tag ollama.
- **Verdict:** true.
- **Proof:** only the fixed keep-alive setting exists (`py_modules/backend/services/ollama_ask_service.py:166`, `sanitize_ollama_keep_alive`); nothing unloads when a game takes focus.
- **Decision owed?** no decision recorded.
- **Test owed?** yes, the research test itself; no evidence exists.
- **Proposed entry:**
  - ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — **OPEN, research spike.** Hold models loaded, or unload when a game takes focus on the Deck? The spike decides go or no-go; no production unload before it. Pairs with "What bonsAI costs a running game". [Detail](roadmap-details.md#ask--reply-items-with-short-entries-as-filed).
- **Long notes:** the shared heading "Ask / reply items with short entries, as filed" (line 536) holds this and other items; keep the keep-alive item (line 542).

## Per-mode latency timeouts
- **Where:** Features, line 228. Three stars, tag ollama.
- **Verdict:** true.
- **Proof:** the warning value is still a single setting (`py_modules/backend/services/settings_service.py:514-528`, `latency_warning_seconds`). The drop on purpose is dated 2026-09-05 in the entry itself.
- **Decision owed?** no decision recorded as an entry; the call was the round-36 weighing.
- **Test owed?** no (not built on purpose).
- **Proposed entry:**
  - ★★★ `[ollama]` **Per-mode latency timeouts** — **OPEN, deliberately not built 2026-09-05.** Separate warning and give-up values per Ask mode.
  - Dropped on purpose: the two values already run through sixteen files each and going per mode triples them, and it changes when a warning shows rather than what the plugin can do.
- **Long notes:** none linked.

## What bonsAI costs a running game
- **Where:** Features, line 233. Three stars, tag ollama.
- **Verdict:** stale.
- **Proof:** the entry says of Deep Rock Galactic: Survivor "Title screen only; a mission running was not tried". A mission was reached on 2026-10-02: `docs/test-evidence/plan79-SCR-10-MISSION.json`. Its own words: answer-phase panel median 68.8 and 69.6, thinking 83.15 and 83.4; the Steam overlay showed the game at 45 FPS idle and 43 to 44 while the answers were written; "The game sat on a level-up choice screen, so this is the game paused at a menu, not a fight." Row verdicts there: GAME-LIGHT-01 PASS (answer 68.8 and 69.6 against 30), SCR-03 UNCLEAR, "The maintainer judges". Also `docs/test-evidence/plan78-SCR-10-MISSION.json` (2026-10-01): "COULD NOT RUN" style probe, the game window never came to the front. The roadmap entry and `docs/testing.md` row GAME-LIGHT-01 (line 238) both still say "title screen only", so both are out of date. The God of War 31 / 20 / 31 numbers, the 206 MB figure and the 2026-09-20 date are not backed by an evidence file I could find; they rest on the entry's own text.
- **Decision owed?** no decision recorded (the real questions, what to reserve and whether to say what a question costs, are open).
- **Test owed?** yes: a real fight, not a paused level-up menu. Evidence so far: `docs/test-evidence/plan79-SCR-10-MISSION.json`.
- **Proposed entry:**
  - ★★★ `[ollama]` **What bonsAI costs a running game** — **OPEN, asked for and measured 2026-09-20.** Writing an answer takes about a third of the frame rate in God of War (31 to 20 and back), and the answer itself slows to about a third of its speed. Memory is the other half: 206 MB spare before the model loaded.
  - With Deep Rock Galactic: Survivor on a menu mid-mission (2026-10-02) the game held 43 to 44 frames a second against 45 idle. Not yet tried in a real fight. Evidence `docs/test-evidence/plan79-SCR-10-MISSION.json`.
  - The real questions: what to reserve, and whether to say plainly what a question costs. Pairs with keep-alive. Older notes: [roadmap-details.md](roadmap-details.md#what-bonsai-costs-a-running-game).
- **Long notes:** heading at line 2822 already holds the 2026-09-26 and 2026-09-27 notes. Move the entry's 2026-09-29 plan 76 sentence there as well (it is now one of three title-screen/mission measurements). Nothing else needs to leave.

## bonsAI's own icon in the Quick Access Menu
- **Where:** Features, line 246. Three stars, tag platform.
- **Verdict:** true.
- **Proof:** `docs/planning/66-quick-tab-own-menu-icon.md` header: "Nothing built, nothing tried on the Deck yet. Step 1 is next." No evidence file and no testing row for it (searched `docs/testing.md` and `docs/test-evidence/`). The "read from the code, not yet seen" claim about the reply-ready notice is the entry's own and not evidenced.
- **Decision owed?** no decision recorded here (the plan says its four questions were answered 2026-09-23).
- **Test owed?** yes, the Deck test (step 1); no evidence exists.
- **Proposed entry:**
  - ★★★ `[platform]` **bonsAI's own icon in the Quick Access Menu** — **OPEN, re-planned 2026-09-23.** The free plugin Quick Tab already pins any Decky plugin as its own menu icon, so the wait on Decky's team is over.
  - Left: a Deck test, then small fixes. Read from the code, not yet seen: in its own tab the reply-ready notice pops up while you look at the answer, and tapping it opens Decky instead. [Plan 66](planning/66-quick-tab-own-menu-icon.md).
- **Long notes:** none.
- Note: this entry sits at line 246 in the slice; the "Connection doctor" boundary is at 249.

## The Spy opens as somebody else
- **Where:** Features, line 252 is beyond my boundary check — see Notes. (In the slice text it follows the QAM icon entry.) Three stars, tag reply.
- **Verdict:** true.
- **Proof:** a character has no first message today (no greeting code found in `py_modules` or `src`; grep for greeting and first message). Decision: D105.
- **Decision owed?** yes, three questions before building (how often, picker still showing Spy, how the reveal reads): `audit/maintainer-decisions-locked.md#d105--locked-2026-09-15--the-fourth-feature-session-two-features-drawn-instead-of-built-the-spys-reveal-the-lighter-clear-and-the-wipe`.
- **Test owed?** no evidence exists (nothing built).
- **Proposed entry:**
  - ★★★ `[reply]` **The Spy opens as somebody else** — **OPEN, split off 2026-09-15 (D105).** On a random chance his first message introduces him as a different character from the list and keeps it up.
  - Needs a greeting feature first. Decide before building: how often, whether the picker still shows Spy, and how the reveal reads.
- **Long notes:** none.

## Terse mode: Speed answers in three lines
- **Where:** Features, line after the Spy. Three stars, tag reply.
- **Verdict:** true, with one wording fix.
- **Proof:** no terse-mode toggle or three-line cap in `src` or `py_modules` (the only "terse" is the existing Caveman reply style in `reply_style_blocks.py`). Wording problem: "**TERSE-01** passes at 8 of 10" reads as a result, but `roadmap-details.md` line 272 says it is the bar the future test must clear ("passes at 8 of 10"). No TERSE-01 row exists in `docs/testing.md` and no evidence file.
- **Decision owed?** D40 is locked: `audit/maintainer-decisions-archive.md#d40--locked-2026-08-29--terse-modes-branch-menu-appears-on-every-reply-and-never-stops-the-branch-fence-is-mandatory-once-and-banned-on-follow-ups-which-rule-wins`.
- **Test owed?** yes, TERSE-01, once built; no evidence exists.
- **Proposed entry:**
  - ★★★ `[reply]` **Terse mode: Speed answers in three lines** — **OPEN, planned 2026-08-29, nothing built.** A toggle beside the reply-style slider, off by default, capping a Speed answer at three lines. It overrides the slider and the character; destructive warnings and depth phrases escape it.
  - The real work is widening the branch picker (D40). The future test, TERSE-01, must pass at 8 of 10 questions; it has not been run. [Detail](roadmap-details.md#terse-mode-speed-answers-in-three-lines).
- **Long notes:** heading line 214. Keep goal, the wording-only enforcement paragraph and the ten-question table (a helper needs it). The D40 paragraph can shrink to its link.

## Adjustable text size in Settings
- **Where:** Features, three stars, tag ui.
- **Verdict:** stale.
- **Proof:** the work the entry says is still to do (expose the scale as a setting) is partly built. `src/components/SettingsTabUiScaleSection.tsx` is a "UI scale" section with an automatic toggle and a slider to pick Handheld (1.0) or Couch (1.18) (`src/data/uiScaleProfile.ts:57`), mounted at `src/components/SettingsTab.tsx:306`. Commit `12227980` "Settings: show the UI scale section only with the Developer tab on". `CHANGELOG.md` line 207: "Hidden for 0.6.0 ... the UI scale section (which returns with the Developer tab on)". So it exists, is two steps rather than free text size, and is hidden in 0.6.0.
- **Decision owed?** no decision recorded.
- **Test owed?** no evidence exists for the scale as a text-size feature. The slider's D-pad path is described as "checked step by step on the Deck" in its own header, but I found no evidence file.
- **Proposed entry:**
  - ★★★ `[ui]` **Adjustable text size in Settings** — **PARTLY BUILT, hidden for 0.6.0.** A UI scale section exists (Handheld or Couch size, Apply button) and returns with the Developer tab on.
  - Still open: whether two steps are enough for reading at a distance, what must not scale (icons, the 300px column), and whether to show it again. [Detail](roadmap-details.md#adjustable-text-size-in-settings).
- **Long notes:** heading line 610. Keep the Goal sentence and the "must not scale" rule. Replace "The scaling hook already exists... the work is exposing it" with the built state above; the old wording can go to the archive.

## Search density
- **Where:** Features, three stars, tag ui.
- **Verdict:** true.
- **Proof:** the settings-card rows still show a title plus a smaller path line (`src/components/MainTabUnifiedAskBar.tsx:1045-1049`) with no highlighted match tokens (no match highlighting code found).
- **Decision owed?** no decision recorded.
- **Test owed?** no evidence exists.
- **Proposed entry:** keep as is: ★★★ `[ui]` **Search density** — **OPEN.** Tighter, more scannable results with highlighted match tokens. [Detail](roadmap-details.md#focus--deck-ui-items-with-short-entries-as-filed).
- **Long notes:** shared heading "Focus / Deck UI items with short entries, as filed" (line 622); keep the Search density item as is.

## Full-quality reading from a LAN PC
- **Where:** Features, three stars, tag voice.
- **Verdict:** true.
- **Proof:** no LAN speech server code (no OmniVoice reference in `src/` or `py_modules`). Decision: D74, "reopened only if the local port fails its Deck test". I found no evidence that the local port was Deck-tested or failed.
- **Decision owed?** yes, conditional reopening: `audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open`.
- **Test owed?** the local port's Deck test decides this; no evidence exists in `docs/test-evidence` (only `plan76-TTS-FEAS-05.json` for a feasibility run, which I did not read in full).
- **Proposed entry:**
  - ★★★ `[voice]` **Full-quality reading from a LAN PC** — **OPEN, deliberately not built 2026-09-08 (D74); reopened only if the local port fails its Deck test.**
  - A speech server on a PC in the house would read answers in the full character voice, far faster than real time. Never the default: not offline.
  - Dropped on purpose: a second program on the person's PC with its own heavy install and an address to paste into Settings. The entry stays so the reason is on record. [Memo](planning/42-read-aloud-feasibility.md).
- **Long notes:** none.

## Headset mode
- **Where:** Features, three stars, tag voice.
- **Verdict:** true.
- **Proof:** no wake-word code (`voice_transcription_service.py:24` says it does not listen for one); Read answers aloud exists. D97 call 3: no headset bought for now.
- **Decision owed?** `audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule`.
- **Test owed?** no evidence exists (nothing built; one open question needs a PC with SteamVR and a headset).
- **Proposed entry:**
  - ★★★ `[voice]` **Headset mode** — **OPEN, filed 2026-09-08; waits on Wake-word listening and the Frame (D97 call 3).**
  - One switch turns on the wake word, reads every new answer aloud, and asks the model to answer for the ear: two or three sentences, no lists. Made for a visor on your face and a Deck across the room. No headset is being bought for now. [Plan](planning/49-steam-frame-features.md).
- **Long notes:** none.
- Note: the entry says it waits on "Wake-word listening"; no roadmap entry by that name is in my slice (not checked elsewhere).

## How fast is this model on this Deck
- **Where:** Features, last entry in the slice (line 248 region). Three stars, tag ollama.
- **Verdict:** true.
- **Proof:** no speed readout or last-ten record per model in `src` or `py_modules` (grep for model speed: no hits). D75 is OPEN. Plan link target `docs/planning/43-model-speed-readout.md` exists.
- **Decision owed?** yes, six calls: `audit/maintainer-decisions-locked.md#d75--open-raised-2026-09-06--the-model-speed-readout-six-calls-before-anything-is-built`.
- **Test owed?** no evidence exists (nothing built).
- **Proposed entry:**
  - ★★★ `[ollama]` **How fast is this model on this Deck** — **OPEN, planned 2026-09-06, six calls open (D75).**
  - Next to each installed model: how fast it answered on this Deck last time, and a button to time it now with one fixed question. A last-ten record per model, a badge in the picker, a plain line under Show details; nothing is reordered. [Plan](planning/43-model-speed-readout.md).
- **Long notes:** none linked.

## Notes for the review

- Full git history was fetched mid-task. I re-ran the commit searches (quick tab, terse, text size, headline, chat search, keep-alive, model speed): no commit built any of those features, so no verdict changed. Commit `06c7553a` (plan 66) is paperwork only.
- Three entries are stale: "A leftover piece of state..." (the value is still read and set), "What bonsAI costs a running game" (a mission was reached 2026-10-02), "Adjustable text size in Settings" (a UI scale section exists, hidden for 0.6.0). The proposed wording for the first needs the owner to confirm on the Deck what the highlight on a clicked settings row does.
- `docs/testing.md` row GAME-LIGHT-01 (line 238) also says "title screen only" and ignores the 2026-10-02 mission run. That row is outside this slice; passing it on.
- "Should a streamed answer keep its layout" is unclear until someone compares today's streaming and finished-answer drawing.
- The chip-styles entry lists four differences I did not verify in code. Plan 78 helper F already unified the next-chip and how-long-it-stays rules (D121 call 10).
- I did not find a decision numbered "plan 79, question 13" (build-setup entry) nor a D heading for the board 8f `[+]` re-confirmation. Both read as "no decision recorded".
- The "Terse mode" entry's "TERSE-01 passes at 8 of 10" reads like a result. It is a bar for a test not yet run.
- No entry in this slice is "done with proof" or "fixed with no proof".
- Line numbers: I gave approximate roadmap lines for later entries because they shift by a few lines; the entry titles are exact.
- The Spy and QAM entries: I listed QAM at line 246 as in the roadmap read, and "How fast" as the last entry before "Connection doctor" (line 249 start). The order in the file is: QAM icon, Spy, Terse, Text size, Search density, LAN PC, Headset, How fast.
