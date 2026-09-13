# 32 — The bug-fixing session

Written 2026-09-04, before any fix was started. The maintainer asked for a plan first: what to fix,
in what order, what can run side by side, how each fix gets proven on the Deck, and what needs their
decision. The decisions are **D58** in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md).
Nothing in § 3 starts until they are answered.

Read first: [CLAUDE.md](../../CLAUDE.md); the ground rules and the focus law at the top of
[26-thursday-bugfix-sesh.md](26-thursday-bugfix-sesh.md); the rig notes in
[31-deck-verification-round.md](31-deck-verification-round.md) § 1 and § 11 before touching the Deck.

## 1. What is true today (checked 2026-09-04 around 17:00, nothing pressed)

- **The Deck is ready.** Awake and reachable, Ollama answers, the controller board is on `COM7`, the
  rig is armed.
- **The Deck already runs this exact checkout.** `main.py`, `ollama_service.py` and `dist/index.js`
  have the same hashes on the device as here. So measurements taken now are against the code we are
  about to change, and no deploy is owed until fixes land. The device bundle was built at 17:01 today,
  which means another session deployed within the hour.
- **Another session is driving the Deck right now.** While this plan was being written, three new
  evidence files appeared under `runs/` (`round31-s1b-to-chip1`, `round31-s1b-to-mode-trigger`,
  `KB-ROUTER-01-q1-press-ask`): a peer session has resumed plan 31 session 1 and is pressing buttons.
  Seven interactive Claude sessions are open on this machine. The one-driver rule applies to every
  Deck block in this plan; the maintainer decides who has the device and when (D58 #8).
- **Device state as session 1 left it:** no frozen chip batch pinned at 17:02 (a peer may have pinned
  one since), tab resume mode on the maintainer's choice (C), every setting session 1 touched put back.
- **Tests are green here:** frontend 110 files / 858 tests in 32 s; backend suite green.
- **The focus linter is red on a clean tree.** Three findings newer than its baseline:

  | Where | What it flags | First reading |
  |---|---|---|
  | `src/features/plugin-shell/TabIndicatorBar.tsx:176` | `tabIndex={-1}` on the bar's cells | Looks deliberate: the cells are not stops, the bar is one stop. Baseline it with a note. |
  | `src/hooks/useDockClearanceOnFocus.ts:33` | `querySelector()` to find the dock | A layout lookup, not a focus target. Probably baseline with a note. |
  | `src/utils/drgGlossaryTermRegistry.ts:100` | sets `tabindex="-1"` then focuses | The exact pattern the rule exists for. Read before deciding. |

  Until this is triaged the fifth gate cannot be used by anyone. Phase 0 settles it.
- **The in-IDE preview is not running.** It can be started from the IDE if we want the preview tiers.
- **Roadmap hygiene owed:** the *Update knowledge base* entry reads **CLOSED** but still sits in Bugs
  (house rule 3 allows only OPEN / PARTIAL / ACCEPTED there); the one-star frozen-batch entry sits below
  two-star entries (rule 2 sorts ascending); and the sixth bug session 1 found, a blank `…` turn header
  and a *New chat* title on a deterministic command reply, was never filed.

## 2. The bug list, sorted by what happens to each

### 2a. Fix this session: thirteen entries

| # | Roadmap entry | What is already known | The fix, in one line | Proof on the Deck | Lane |
|---|---|---|---|---|---|
| 1 | ★★ `[focus]` `[perms]` *Open Permissions* under a blocked reply is not a D-pad stop | Measured 2026-09-03: a Decky `Button` with no tab stop. The buttons that *are* stops (Retry, Copy) go through `BonsaiChatSecondaryButton`, which passes `focusable`. Same shape as the chat-slot row bug of 2026-08-30. | Make the deny-action button a stop, and put it in the Down chain between the reply row and the session strip. The troubleshooting hint's *Open Permissions* / *Dismiss* buttons have the same shape; fix them in the same pass. | **PERM-JUMP-01** first step (Down from Copy lands on it, visible), then the jump and *Back to …* halves; unblocks **SMOKE-C**. | A |
| 2 | ★★ `[focus]` Left on the Ollama sliders steps the value and throws the ring out | Measured 2026-09-03: the step happens, the press is not claimed, Steam then navigates left onto the Quick Access rail. Right is fine only because nothing sits to the right. | Step on the move handlers and claim the move (return true), the way the chip row does. One step, never two. | **ONBUTTONDOWN-AUDIT-01** slider half re-run: Left steps once, ring stays. | B |
| 3 | ★★ `[focus]` Down from the chat slot lands on the whole reply before its first section | The turn header's Down already tries to hand the ring to the first section, with a plain focus. A plain focus only works inside one container; the header and the bubble are different containers. So Steam's own move wins and parks on the bubble. **Not yet measured**; the stop order is read on the device first. | Hand the ring in through Steam's own transfer (a registered nav node on the first section), or forward on entry. Check Up from the reply buttons for the same double landing. | Three presses from the slot row: header, first section, second section, never the bare bubble. | A, after 1 |
| 4 | ★★ `[focus]` After a modal closes or the QAM reopens, the ring sits on a hidden Steam tab button | The trap only reacts to class changes it watches. A landing that happens before the watcher attaches (a remount) is missed, and the Clear cache confirmation never registers a return-focus owner, so Steam picks. | Check the current state the moment the watcher starts; register the Clear cache and Clear all data buttons as return-focus owners so the ring comes back to the button that opened the modal. | **CLEAR-CACHE-01** steps 0 of runs *b* and *c*: after the confirm closes the ring is on the button; after a chord reopen it is on the bar. | D |
| 5 | ★ `[focus]` Up from the preset chips walks back through the chip history | Measured 2026-09-03. The roadmap calls it the maintainer's decision. **D58 #2.** | If Up leaves at once: the Up handler stops stepping history and hands the ring above the row; Left keeps walking history. | **PRESET-ONE-LINE-03** Up step: one press from any chip leaves the row. | C |
| 6 | ★ `[focus]` The disabled *Clear frozen test chips* button still takes the ring | A disabled `ButtonItem` stays a stop. | Render nothing when no batch is pinned (the "0 pinned" text already explains the state). | Developer sweep: no stop named *Clear frozen test chips* with the batch empty; **SHELL-PAYLOAD-01** Developer half re-read. | B |
| 7 | ★ `[focus]` Reordering in the try-order picker drops the highlight | Measured 2026-08-28: after A on Up/Down the moved row re-renders and nothing owns the ring for one press. | After a move, put the ring back on the same button of the moved row. Both buttons live inside one list container, where a plain focus is allowed; measure before committing to it. | **PICKER-REORDER-02**: ring readable on the moved row's button straight after the press. | B |
| 8 | ★ `[focus]` The active chip in Show details is hard to spot | The chips are plain spans inside one stop, so Steam's ring never lands on them; the counter is a small grey line. | Style only: a visible active state on the current chip and a clearer counter. No change to the focus graph. | DOM read: the active chip carries the active class; PNG by script for the eyes. | E |
| 9 | ★ `[focus]` The focus ring is clipped on grid layouts | Tiles sit flush with the grid edge. | Inner padding on the character grid so the ring fits inside the card. | PNG by script with the ring on an edge tile. | E |
| 10 | ★ `[chips]` Chip rotation favours the top of the candidate list | The picker takes the first unseen candidate both for the guarantee and for the roll. | Pick at random among the eligible candidates; the picker already takes an injected random, so the tests stay deterministic. | Watch the carousel for 90 s with a covered game: chips ranked past three appear. | C |
| 11 | ★ `[chips]` A frozen batch longer than the row cannot be reached after the first minute | The 60-second walk runs from mount only; an Ask does not restart it; the edges hold still. **D58 #3.** | Depending on the call: Right at the last chip pulls the next batch entry in, and an Ask restarts the minute. | Pin plan 31 batch 1 (already confirmed under D57 #2); after 60 s, Right at the edge reaches chips 6 to 11. | C |
| 12 | ★ `[KB]` The arms report's verdict only compares two arms | The verdict function reads `rrf` and `keyword` only; the 2026-08-29 run said "no separation" while `vector_only` led the table. | Judge every arm, or print which pair is judged. Report text only: no weight changes (D38). | None. Desk only; `tests/test_eval_kb_arms.py` extended. | E |
| 13 | ★ `[ask]` The question overlay sits a few pixels off the native field | The overlay is placed from a measured field rectangle. Untouched since 2026-08-07. **Measure first.** | Read the native text and overlay text positions on the device for an empty field, one line and three lines; if the offset is constant, adjust the insets. If it is not, file the numbers and stop. | The same read after the fix: offsets within 1 px. | E, after my measurement |

### 2b. Needs the maintainer's call, and no code this session either way

- ★★ `[reply]` **Token streaming reveals text in bursts while a game is running.** Accept it (move to ACCEPTED) or keep it open. **D58 #4.**
- ★★ `[focus]` **Focus ring styling is inconsistent**, PARTIAL, a design call. Proposed: skip this session. **D58 #5.**

### 2c. Break off into their own conversation (deep research)

- ★★★★ `[KB]` **The shipping retrieval arm loses to the vector half alone.** Deferred under D38; the work is measurement and a decision, not a fix.
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips.** A reach limit of the D16 gate; also a decision. Read [30-kb-answer-quality-plan.md](30-kb-answer-quality-plan.md) first in that conversation.

### 2d. Nothing to fix, or bookkeeping only

- ★★ `[KB]` **Unrelated questions still get game cards**, ACCEPTED 2026-08-27. Leave it.
- ★★ `[KB]` **The *Update knowledge base* button**, CLOSED 2026-09-03, works. Move to Done with the full entry in the archive (Phase 0).
- **Unfiled:** the blank `…` header on a deterministic command reply. File it as a Bugs entry (Phase 0); fix only if lane A finds the cause quickly. **D58 #9.**

## 3. Order of work, and what runs side by side

### Phase 0: hygiene, one or two commits, the orchestrator alone (about 30 minutes)

1. Roadmap: move the CLOSED entry to Done and the archive; re-sort the one-star chips entry; file the
   `…` header bug. Testing rows touched where they name these.
2. The focus linter's three findings: read each, fix what is a real defect, baseline what is deliberate
   with a one-line reason in the commit message. A finding that is a real defect and not a one-line fix
   becomes a Bugs entry instead of a silent baseline update.
3. Create the lane agent definition (§ 4). It lives under `.claude/agents/`, which git ignores.

### Phase 1: five lanes in parallel, plus device measurements

Each lane is one agent in its own worktree, one fix per commit, all gates green between commits. Lanes
are drawn by file ownership so no two agents edit the same file; that is what makes landing cheap.

| Lane | Bugs, in order | Files the lane owns |
|---|---|---|
| A | 1, then 3 (after the measurement), stretch: the `…` header | `PermissionDenyAction.tsx`, `MainTabChatTranscript.tsx`, `buildReplyActionsElement.tsx`, `buildTurnHeaderElement.tsx`, `buildAnswerBubbleElement.tsx`, `answerBubbleNavigation.ts`, `ChatSlotRow.tsx` |
| B | 2, 6, 7 | `deck/DeckFocusSlider.tsx`, `DeveloperTab.tsx`, `ModelRoutingOrderModal.tsx` |
| C | 10, then 5 and 11 (after D58 #2 and #3) | `preset-carousel/*`, `MainTabPresetAnimatedChips.tsx`, `carouselState.ts`, `presetSlotRotation.ts` |
| D | 4 | `plugin-shell/useHiddenTabHeaderTrap.ts`, `plugin-shell/modalReturnFocusRegistry.ts`, `SettingsTab.tsx` |
| E | 12, 8, 9, then 13 (after the measurement) | `scripts/eval_kb_embed_models.py`, `tests/test_eval_kb_arms.py`, `ContextChipLadder.tsx`, `CharacterPickerModal.tsx`, `unified-input/constants.ts` |

While the lanes work, the orchestrator uses the Deck for the **pre-fix measurements** that decide
three fixes: the stop order below the slot row (bug 3), the overlay offsets (bug 13), and a read of what
owns the ring right after a picker reorder (bug 7). Each is a short run with the evidence saved under
`runs/`. Their results go to the lane by message before the lane reaches that bug.

Rules every lane brief carries (§ 8): verify the worktree base first; one fix per commit; the four
gates plus the focus linter before each commit; update `docs/roadmap.md`, `docs/testing.md` and
`CHANGELOG.md` in the same commit as the fix; never touch the Deck; never push; report the exact test
names added and the QA row the fix owes.

### Phase 2: landing, the orchestrator alone

Each lane's commits are reviewed as diffs, then cherry-picked onto `experimental` one at a time, oldest
first. The docs files are where conflicts will land (three lanes editing adjacent roadmap lines);
they are resolved by hand at each pick, and the four gates plus the linter run after every pick. The
review question for every focus fix is the one plan 26 wrote down: does this path go through a
`Focusable` move handler or Steam's own transfer, or is it a DOM event the device never sends?

### Phase 3: the Deck, the orchestrator alone, serial

1. Deploy once with `scripts/build.ps1`, read the log for *Deployment complete!*, reopen the QAM (the
   first open after a deploy fails once by design), and prove the bundle by hash before any run.
2. Run § 5's check for each bug, in this order: 1, 2, 6, 7, 3, 4, 5, 11, 10, 8, 9, 13. The order
   puts the Tier 0 blocker first and the by-eye items last.
3. Each pass moves the entry to Done in the same commit as its testing row and archive entry (§ 6).
   Each failure is written down with its evidence file and the entry stays in Verify with the finding.
4. After bug 1 passes, run **SMOKE-C** and **PERM-JUMP-01** to the end; they were blocked on it.

### Phase 4, optional: resume plan 31

If the window allows, the round resumes wherever the peer session left it (plan 31 § 11 says where).
Same rig, same rules. **D58 #8** decides whether this is in scope tonight.

## 4. Who does what, and whether the model split is right

**Orchestrator: Fable at max effort. Lanes: Sonnet 5 at high effort.** The lanes need an agent
definition, because the effort level is set only there: a file under `.claude/agents/` with
`model: sonnet` and `effort: high` in its front matter (without an `effort` line a subagent inherits
the parent's effort). The `Agent` tool's own `model` field would override the model but cannot set
effort. Up to twenty subagents may run at once; five is what the file split supports.

The honest assessment:

- **It is the right split for these thirteen, and not overkill.** Eleven of the thirteen are small,
  cause-known changes with a clear test to write and a clear pattern already in the tree. Sonnet at
  high effort with a precise brief is well matched to that. Running five lanes at once cuts the desk
  half from a long afternoon to about an hour and a half of wall-clock.
- **The quality of the two subtle ones (bugs 3 and 4) comes from measuring first, not from the
  model.** This repo's history says so four times over: fixes that were correct, green under tests,
  and dead on the device because they lived behind an event Steam never sends. So those two are
  measured on the Deck before the lane writes a line, and the device check, not the unit test, is the
  gate for every focus fix. Opus for those two lanes would not change that; the measurement would.
- **Where the orchestrator's effort is spent:** reviewing each diff against the focus law, resolving
  the docs conflicts, driving the Deck serially, and keeping the roadmap honest. That is where past
  regressions came from, and it is the part that should not be delegated.
- **More than five lanes would be overkill.** The bugs share files beyond that; merge churn would cost
  more than the parallelism buys. Sub-agents cannot share the Deck at all (one driver), so device
  time stays serial no matter how many lanes run.

## 5. Proving each fix: the harness and the rig

There are three layers, and only the third proves a focus fix.

1. **Desk gates, every commit:** typecheck, frontend tests, backend tests, build, focus linter. These
   catch regressions; they cannot see the device's focus ring.
2. **Preview tiers, once after landing (optional):** `preGate`, `tier0`, `tier3UI` from the in-IDE
   preview as a regression net. The preview's Steam components are approximations, so it is not
   evidence for any focus fix; it is cheap insurance that nothing else broke.
3. **The Deck rig, per bug:** real controller presses over the board, focus read after each press,
   the visibility verdict on every landing, evidence written under `runs/` and committed.

| Rig tool | Used for |
|---|---|
| `deck_runSequence` with `expect` and `requireVisible: true` | The scripted press-and-assert runs for bugs 1, 2, 3, 4, 5, 7, 11 |
| `deck_sweep` on Developer | Bug 6: `stopsFocusedButNotVisible` and the stop list, diffed against session 1's sweep |
| `deck_readPage` | DOM facts: which element holds the ring, the active-chip class (8), overlay and field rectangles (13), a reply's section count (3) |
| `deck_readFocus` | The ring's owner right after a reorder press (7) |
| `scripts/deck_send_ask.py` and frozen batch 1 | Getting a reply on screen for 1 and 3; the long batch for 11 |
| `scripts/screenshot-deck.ps1` | The PNGs for 8, 9 and 13 (the DPS screenshot tool is broken on this install) |
| Plugin log over SSH | The trap's `tabBar:trap` debug line for bug 4 |

Two things the rig will report that need a human: whether the active-chip style (8) and the grid
padding (9) *look* right. The rig leaves the PNGs; the maintainer's glance closes them, per the plan 31
§ 7 convention.

**Known oracle limit, filed and not fixed here:** the visibility verdict reads a disabled button as
clipped, most likely because a disabled button ignores pointer hits so the point test lands on its
parent. Bug 6 removes the button, which sidesteps it; the finding itself belongs in
`docs/mcp-setup.md`'s findings log and the DPS repo, per AGENTS.md.

## 6. Roadmap bookkeeping, per fix, so the roadmap is never behind

- **When a lane commits a fix:** the roadmap entry moves out of Bugs into Verify's *Bugs* sub-list
  in that commit, naming the QA row; the testing row says *fixed at the desk 2026-09-04, Deck check
  owed*; `CHANGELOG.md` gets one line under Fixed. Lanes write these; the orchestrator resolves
  overlaps at landing.
- **When the Deck check passes:** in one commit, the entry becomes one line in Done, the full entry
  goes to `docs/archive/roadmap-bugs-fixed.md`, the testing row reads *Verified (Deck) 2026-09-04*
  with the evidence file named, and the `runs/` file is committed.
- **When the Deck check fails:** the entry stays in Verify with the finding and the evidence file;
  nothing is struck through; the failure goes back to the lane, or to a new Bugs entry if it is a
  different bug.
- A progress log at the bottom of this file records each landing and each device result as it
  happens, the way plan 31 § 11 does.

## 7. Risks, and what is done about each

- **Two drivers on one Deck.** A peer session is on the device as this is written, and seven other
  sessions are open. The maintainer confirms the window (D58 #8) and holds the other chats; the
  orchestrator re-checks `deck_automationStatus` and the newest `runs/` file before every press block
  and stops when a foreign tunnel or a fresh foreign run appears.
- **The Deck sleeps during long pauses.** The desk phase can take two hours before the Deck is
  needed again. The pre-fix measurements happen early to use the awake window; if the device sleeps
  before Phase 3, the maintainer is asked to wake it, and everything up to the deploy still stands.
- **A deploy restarts Decky Loader.** One deploy, announced in chat first, when nobody is using the
  device.
- **Stale worktrees.** Agent worktrees in this repo have been created hundreds of commits behind.
  Every lane's first act is `git merge-base --is-ancestor <current tip> HEAD`; a failure stops the
  lane and the orchestrator resets it from outside.
- **Per-worktree installs.** Each worktree needs its own `pnpm install --frozen-lockfile` before
  the gates run; pnpm's shared store keeps that to about a minute.
- **The pre-commit hook.** It regenerates the architecture snapshots in each worktree; the snapshots
  are regenerated again at landing, so lanes never hand-edit them.
- **Docs conflicts at landing.** Expected and cheap: adjacent lines in three files. Resolved by hand,
  never by taking one side blindly.
- **Green tests, dead on device.** The standing risk for every focus fix. Answer: measure first for
  the two that need it, review every path against the focus law, and let the Deck run be the gate.

## 8. The lane brief (what every agent gets, verbatim in its first message)

1. You are in a worktree of this repo. Before reading anything, run
   `git merge-base --is-ancestor <tip> HEAD`. If it fails, stop and report; do not improvise.
2. Run `pnpm install --frozen-lockfile`, then confirm the baseline: `npx tsc --noEmit`, `npm test`,
   `npm run test:py`, `npm run build`, `node scripts/check-focus-patterns.mjs`. All must pass before
   you change anything.
3. Read `CLAUDE.md`, the ground rules at the top of `docs/planning/26-thursday-bugfix-sesh.md`, and
   `.cursor/rules/decky-focus-graph.mdc` if the fix touches focus. Read the roadmap entry and its
   testing row for each bug you own. Read the `runs/` evidence file named in the entry.
4. One fix per commit; write the failing test first; keep the fix to the files your lane owns; do not
   touch generated files under `packages/bonsai-mcp/knowledge/architecture/`.
5. For focus work: a D-pad edge lives on a `Focusable` move handler or goes through Steam's own
   transfer (`takeNavFocus` / a registered nav node). A DOM `keydown` listener or a direction press in
   `onButtonDown` is dead on the device and will fail review.
6. In the same commit: move the roadmap entry to Verify's Bugs sub-list naming the QA row, update
   the testing row, add one `CHANGELOG.md` line. Plain language, five lines at most, what a user
   would notice.
7. Never touch the Deck, never push, never run `git rebase -i`.
8. Report: commit hashes, the test names you added, the QA row each fix owes, the exact device check
   you expect to pass, and anything you found that you did not fix.

## 9. Time

Roughly: Phase 0 half an hour; Phase 1 about ninety minutes of lane time, overlapping the
measurements; Phase 2 an hour; Phase 3 two hours of serial device time. Four to five hours end to
end, unattended after the D58 answers, with Phase 4 open-ended behind it.

## 10. Progress log

Written as things land.

- **2026-09-04 17:40, D58 answered** (eight of nine; #2 waits on a mockup). Another chat holds the Deck for several hours, so
  the desk half starts now and every Deck step waits. The rig watches `runs/` and the tunnel registry for a quiet half hour.
- **Phase 0 done.** Roadmap: the CLOSED *Update knowledge base* entry moved to the archive with its detail text; the one-star
  frozen-batch entry re-sorted; the `…` header bug filed as ★★ `[chat]`; streaming bursts marked ACCEPTED (D58 #4), STREAM-11
  updated. Linter: all three findings read and found deliberate, baselined with a reason each in the commit — the tab bar's
  cells are touch targets and not stops by design; the dock lookup is geometry, not a focus target; the glossary chip only sets
  `tabindex` when none exists, the same guarded pattern `focusPanelEl` already carries. Gate green again.
- **18:08, lane D landed** (`41c7513` on the landing branch `bugfix-32`): bug 4, the hidden tab button after a modal close or a
  QAM reopen. The trap now checks what already holds the ring the instant it attaches and watches inserted nodes too; Clear cache
  and Clear all plugin data register as return-focus owners. Eleven new tests; all five gates green after the pick. Row **TAB-BAR-11**.
  Lane D also noticed, and did not touch, that *Clear all plugin data* never calls the pre-modal hook that *Clear cache* calls,
  so the tab remembered for after that remount may be stale; no evidence of a visible symptom yet, worth a look if one is reported.
- **18:15, lane B landed** (`d3d8e2a`, `f764819`, `54c44cf`): bug 2, the sliders now step on the move handlers and claim the
  press; bug 6, the Clear frozen test chips button renders only when a batch is pinned; bug 7, the picker puts the ring back on the
  moved row's button. Ten new tests; the test harness's Button and ButtonItem stubs became focusable so a `.focus()` can be observed
  in tests at all. Lane B found the same slider bug in the Settings UI-scale section and is fixing it as a follow-up. Rows
  **ONBUTTONDOWN-AUDIT-01**, **DEV-CLEAR-CHIPS-01**, **PICKER-REORDER-02**. Landing conflicts were the expected kind: both lanes added
  adjacent roadmap and changelog lines; resolved by keeping both, sorted by the roadmap's own rule.
- **18:18, lane E landed**: bug 12, the arms report's verdict now judges every arm in the table and names them (desk-only,
  moved straight to Done and the archive); bug 8, the active Show details chip has a cyan glow and a readable counter; bug 9, each
  character-picker column has 6 px of inner padding so the ring is not clipped. Six new tests. Rows **CONTEXT-LADDER-01** (sub-check)
  and **CHAR-PICKER-RING-01**; both by eye on the device with a PNG.
- **18:23, lane B's follow-up landed**: the Settings UI-scale slider had the same Left-escape bug and now steps on the move
  handlers too, with six tests of its own. **ONBUTTONDOWN-AUDIT-01** now covers all four sliders.
- **18:27, lane C landed**: bug 10, rotation picks at random within the top-priority band instead of always the first candidate;
  bug 11, Right at the last chip pulls the next pinned-batch entry in (batch only) and a completed Ask restarts the sixty-second
  walk in every mode. Nineteen new tests. Rows **CHIP-ROTATION-01**, **QA-FROZEN-CHIPS-02**. Lane C also noted, and did not touch,
  that the carousel's own auto-advance scans a pinned batch from the start each time, so a short batch can repeat an entry
  back to back; a candidate for a later pass, not a bug this round filed.
- **18:31, landing hygiene** (`a7d3b2d`, `77551b5`): the conflict resolver kept both sides of every hunk, which is right when two
  lanes add neighbouring lines and wrong when one side removed or rewrote a line. Three Bugs entries their lanes had moved to Verify
  were still listed under Bugs, and the changelog carried both versions of the slider bullet. Both fixed; a tidy pass now runs after
  every pick: a Bugs entry whose title already sits in Verify or Done is dropped, and both lists are re-sorted by the file's rule.
- **18:44, the other chat's round merged in** (`16bdde9`): its session 2 landed seven new Bugs entries and moved four Verify rows to
  Done while the lanes worked. Merged by hand where both sides touched the same lines.
- **18:46, lane A landed** (`8f07f49`, `930f1b7`, `e2357ab`): bug 1, the Open Permissions button and the troubleshooting hint's two
  buttons are D-pad stops and sit in the reply row's Down chain; bug 3, entering a reply from above lands on its first section through
  Steam's own transfer, and Up from the reply buttons lands on the last section. Sixteen new tests. Rows **PERM-JUMP-01**, **SMOKE-C**,
  **CHAT-REPLY-ENTRY-01**. The blank `…` header bug is traced, not fixed: a command reply is never saved to the chat slot on the
  backend, so the reload that follows overwrites the live question with nothing (trace in roadmap-details.md); a backend lane takes it.
  The Deck went quiet at 18:07; announced at 18:38; the device phase starts at 18:49 with all twelve fixes in one deploy.
- **18:49, deployed** build `49241e7` (twelve fixes plus the other chat's round) with `scripts/build.ps1`; 61 files verified, hashes
  matched, panel reopened. **19:00 to 21:33, the session limit.** All three lanes still running and this session stopped on the
  usage limit; the Deck suspended at some point and resumed at 21:23; the panel remounted on Main with the ring on the hidden Main
  tab button, which became the first device finding once work resumed.
- **21:35 to 22:05, Deck block 1** (results committed as `cc7b855`): bug 2 **passes** on the Reply style, keep-alive and
  custom-timeout sliders (moved to Done); the UI-scale bridge is not a stop while automatic scaling is on, so it stays unit-tested
  only. Bug 7 **fails**: A on a row's Down button reordered the row, the ring left the picker for a hidden tab button and the picker
  closed; back with lane B for a Steam-transfer version. Bug 4 is **half**: the Clear cache return lands on the Clear cache button
  (passes), the remount trap never fires because its node check is a cross-realm `instanceof` (fails); back with lane D. Bug 9
  **measured**: 6 px of room around the top-left tile, ring visible in the capture; the maintainer's glance closes it. The picker's
  saved order was and is the default. Lane C's bug 5 and lane F's backend fix for the blank command header landed meanwhile
  (`68cd3d0`, `7d73711`); both need the second deploy.
- **22:05 to 22:15, Deck block 2 and 3:** bug 6 **passes** (Developer sweep, 14 stops, no Clear button, moved to Done); bug 11
  **passes** both halves (Right at the edge walked the eleven-sentence batch to its tail, the walk restarted after an Ask; Done);
  bug 3's Down path **passes** (header, then the first stop inside the answer, never the bare bubble); bug 13 **measured**: the
  overlay's box sits on the field's box exactly, but the mirrors wrap with `pre-wrap` and `overflow-wrap: anywhere` where the field
  uses `normal`, use a different fallback font stack, and are half a pixel narrower; lane E is building the fix. Lanes B2, D2 and
  F landed meanwhile (`99761f1`, `d86b694`, `7d73711`); the second deploy follows the last check on this build.
- **22:05 to 22:14, Deck block 4:** bug 8 **measured** (one chip of six lit, bold cyan counter; glance owed); bug 1 **fails**: the
  button renders as a stop, but the strip's Up hop into its row is a plain focus across containers, the ring was lost, and the helper
  stamped the row `tabindex="-1"`; back with lane A for a registered-nav-node version. **22:14, second deploy** (`f9a4c17`, code
  at `d86b694`): lane B's picker redo, lane D's realm-safe trap, lane C's bug 5 and lane F's backend fix for the blank command header
  are on the device; 61 files verified, hashes match. Lanes A2 (Open Permissions redo) and E2 (overlay mirror) still building.
- **22:16 to 22:40, Deck block 5 on build f9a4c17:** bug 4's chord reopen now lands on a visible control twice (Decky's back button,
  then the bar); bug 5 **passes** both cases (Done); the blank command header **passes** on screen, on disk and across a reopen (Done);
  bug 7's redo **fails** the same way, and the discriminating test showed the cause: any button press inside the picker submits the
  modal's form and closes it, Reset included; lane B is stopping the submit. Lane E's overlay fix landed (`4f9a846`) for the third
  deploy; lane A's Open Permissions redo is still building. The ban lookup stays off until PERM-JUMP-01 runs on the third build.
  Bug 3's Up half **fails** (22:29): on a reply with no picker, Up from Helpful lands on the bare bubble, because the thumbs row's
  Up handler still yields to Steam and the new fallback only reached the Retry row; back with lane A as a third commit on its branch.
- **22:31 to 22:40, Deck block 6, bug 10:** the frozen batch was cleared over SSH with the panel unmounted, the rig launched
  Half-Life 2 (second try; the first read the home shelf before it had a ring), the plugin was reopened over the game and the
  carousel sampled for 96 s untouched. Ranks 2, 3, 4 and 5 of the game's eight chips came round in the first 30 s and rank 1 never
  did, so bug 10 **passes** (Done); the game was exited by the rig afterwards. One new finding filed: the footnote under the Ask bar
  said *no active game detected* the whole time a game was running. Lane B's third picker fix (`b04387b`, the form-submit stop)
  passed the six gates and is on experimental as `c4e16fc`; the third deploy follows.
- **22:40 to 22:46, third deploy and Deck block 7:** build 3 (code `c4e16fc`) is on the device with lane B's form-submit stop and
  lane E's overlay mirror; 61 files verified, both hashes match. Bug 13 **passes** by the row's own recipe: empty field and a
  two-line question, the field and its two mirrors agree on wrapping, font and width to 0.012 px (Done). Bug 7's picker check is
  next on this build; bugs 1 and 3 wait for lane A's branch and a fourth deploy.
- **22:47 to 22:57, Deck block 8, bug 7:** on build 3 the picker check **passes**: A on the first row's Down button moved the row to
  second place, the ring stayed on that row's Down button, visible, and the picker stayed open; the order was put back and the
  picker closed with B, nothing saved (Done). All three device-verified fixes from lane B now hold.
- **02:40 to 03:35, landing and the fourth deploy:** lane B's third picker fix and lane A's two (the Open Permissions redo and the
  thumbs-row Up) landed on the landing branch; the six gates passed (962 frontend tests, 901 backend, focus baseline 77); the
  conflicts were all in generated snapshots and in doc rows I had already updated from the device, so they were resolved to the
  measured side and the snapshots regenerated. One tidy commit put right two roadmap entries an earlier whole-file resolution had
  resurrected or reverted. Build 4 (`517804a`) deployed, 61 files verified, hashes match.
- **03:35 to 03:50, Deck block 9:** bug 3 **passes** both halves now (Up from Helpful lands on the last section; Done). Bug 1 is
  **four of five**: the button is a stop both ways, A opens the Permissions tab, *Back to Main* returns to the reply with the ring on
  the button — but the ring lands on *Back to Main* rather than the Steam ban lookup toggle, because the jump still focuses its row
  with a plain cross-container focus (`permissionJumpRegistry.ts:49-73`, which also reports success unconditionally). Back with lane A
  as `bugfix32-lane-a3`. Note for future runs: a restored turn carries neither the thumbs row nor the deny surface, so both of these
  checks need a live reply.
- **03:50 to 04:05, regression sweeps on build 4:** two rig sweeps of the Main tab, one from the reply and one from the plugin
  title downward, walked 19 controls each with **every stop visible and no cycles** after five focus fixes landed in one night
  (`runs/QA-FREE-PLAY-01-build4-main-sweep.json`, `runs/QA-FREE-PLAY-01-build4-main-sweep-full-height.json`). Noted on the
  free-play standing row. The two glance-owed pictures (bugs 8 and 9) were sent to the maintainer.
- **04:05 to 04:15, Deck block 10, bug 4:** a Decky loader restart gave a third, harder remount path, and it **passes** — the ring
  lands on the tab bar, then the chat slot row, and Right does not park on a zero-size button. With the modal return and the chord
  reopen already passing, every remount path the rig can drive is clean, so bug 4 moves to Done with one honest gap recorded: a real
  suspend and resume cannot be driven, because waking the Deck needs its power button and the bridge is only a gamepad.
- **04:15 to 05:05, the fifth deploy and Deck block 11:** lane A's third fix (`3d0b928`, the jump's own nav-node transfer) passed
  the six gates — and tightened the focus linter's baseline from 77 to 74, because the rewrite removed three page searches — and
  landed as `d9d952d`. On build 5 the whole permissions row **passes**: the button is a stop, A lands the ring on *Steam ban lookup*,
  A turns the capability on (the saved settings agree), and *Back to Main* returns to the reply with the ring on the button. Bug 1 is
  Done, which closes the last of the thirteen. Turning the toggle on was also the restore the maintainer wanted.
- **05:05, the Deck put back as it was found:** Steam ban lookup on, the three chips the other session had pinned back in place
  (*my playstation 2 games run at half speed on the handheld*, *what should I do next*, *reply with only the word echo*), reply
  style balanced, keep-alive 240m, custom timeouts off, thinking off, automatic UI scale on, knowledge base on, no game running,
  panel on Main. The vac-check chat now holds four turns from tonight's checks, which is the one visible difference.
- **2026-09-05, the maintainer's look: two fails, both rebuilt and passed the same morning.** The character picker's highlight was
  the browser's own hairline rather than the plugin's white ring — gold on the build that was photographed, because it took the tint
  from the active character. The Show details row could carry six colours at once, so the highlight had nothing to stand out against;
  it is one colour on the row now, chosen by the maintainer from three options. Sixth deploy, both measured on the device, both
  pictured, both passed on the second look. **That closes the session: all thirteen fixed, twelve of them checked on the Deck.**
  Still owed, and agreed as follow-ups rather than session work: a real sleep and wake (requested in the studio's own roadmap), and a
  long streaming reply plus a touchscreen pass for the free-play row.
