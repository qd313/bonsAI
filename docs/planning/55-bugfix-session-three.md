# 55 — The third bug-fixing session, and the Deck checking pass after it

Written 2026-09-15, before any fix was started. The maintainer asked for a plan first: what to fix, in
what order, what runs side by side, how each fix is proven on the Deck, and what needs their decision.

**Status 2026-09-15: answered, waiting for the maintainer's "go".** The answers are in § 8 and locked
as **D104** in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md). All answered;
plan 54 landed 2026-09-15.
**Nothing in § 5 starts until the maintainer says go**, in a fresh session that reads this file and
begins at block 0. **The maintainer has chosen to run it on Fable 5.1 at extra-high effort**, knowing
the routing table asks for Opus here; § 4 says what follows from that.

Read first: [CLAUDE.md](../../CLAUDE.md); the focus graph section and 'Which model does which work' in
[AGENTS.md](../../AGENTS.md); [lessons-learned.md](../lessons-learned.md);
[35-bugfix-session.md](35-bugfix-session.md), the last session of this shape, which worked;
[54-spoiler-rules-gaps.md](54-spoiler-rules-gaps.md), the lane another session is finishing right now.

**The maintainer's own checklist of things only a person can judge lives here:**
[Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
Anything this session finds that needs their eyes or their finger goes on it.

---

## 1. What is true right now (checked 2026-09-15, nothing pressed)

- **The Deck answers, the model server answers, the controller board is on COM7, and the rig is
  armed.** No debug tunnel is running. Two tunnel records from earlier sessions are dead and harmless.
- **The tree is clean** on the experimental branch; this plan is the only new file.
- **Screenshots and recordings work from this machine** through the repo's own two scripts: one takes
  a screenshot of the Deck, the other records it for a chosen number of seconds in game mode. The rig's
  own screenshot tool is broken, so those two are the way. A recording is the only way to catch anything
  that moves for less than a round trip — the chip glow lasted a third of a second and a plain read
  missed it.
- **Plan 54 landed on experimental on 2026-09-15, in four commits.** The four files it shared with this
  session's lanes are free again, so wave 2 can cut from the tip.
- **Twenty-three entries sit in the bug list, plus nine open bugs in the knowledge-base section.**
  Three are accepted, two are design or measurement calls, two cannot be fixed by code, one is
  future-proofing, and two pairs share a cause. That leaves fourteen fixes that can be made this
  session (§ 2a), plus two that need a yes (§ 2b).
- **The bookkeeper guard blocks Fable's own edits** to the roadmap, the testing documents, the
  changelog and test files. Since the session runs on Fable, every one of those edits goes through the
  bookkeeper helper, batched per landing and per Deck block. The maintainer can switch the guard off
  for the session instead (the off switch is named in [CLAUDE.md](../../CLAUDE.md)); until they do,
  the bookkeeper does that typing.
- **The guide and the roadmap disagree about one bug** — see § 9.

## 2. The bug list, sorted by what happens to each

### 2a. Fix this session — fourteen fixes, in the order a person would notice them

Ordered by how much a person would notice, not by star count. The star and tag are the roadmap's.

| # | What a person sees | What is already known | The fix, in one line | Who |
|---|---|---|---|---|
| 1 | **The panel gets stuck: Down, Left and Right do nothing from the question box and the Ask button cannot be reached.** Only restarting the plugin clears it. ★★★ focus | **Reproduced on demand 2026-09-15**, twice in one sitting: start a brand new, empty chat while the panel is showing a *Session context* row. Three walks without that row reached Ask normally. The fix from 2026-09-05 did not hold. | Unknown until measured with the recipe. The signature to chase: Steam's ring and the page's own focus on different elements. **Measured on the Deck before a line is written.** | me |
| 2 | **The line under the question box names the wrong game** — it keeps naming a closed game for minutes, and never notices a game that starts. A question can pull the wrong game's notes. ★★★ KB | Cause found 2026-09-07, still true 2026-09-15: the panel reads the running game once at start and never listens for a change. The chat slot beside it picks up the new game correctly, so a working mechanism already exists to copy. Two roadmap entries, one cause. | Listen for the change the way the chat slot does. | lane F |
| 3 | **A Speed-mode reply ends with a code box holding nothing but computer text** (the power line). ★★★ reply | Reopened 2026-09-07. The plugin's own instruction asks for the power block inside a code box, and the cleanup deliberately leaves code boxes alone. Seven green tests all test the shape the plugin does not ask for. | Teach the cleanup to remove a code box whose whole contents are the power block — the roadmap's safer option. Test the shape the prompt actually asks for. | lane A |
| 4 | **The follow-up menu offers Half-Life 2 places whatever game you asked about** — the train station and Ravenholm under a Portal 2 or Hades answer. Two roadmap entries (one under Bugs, one under KB), one cause. ★ ask, ★★ KB | Cause found 2026-09-15: the two choices are word for word the worked example in the model's instructions, which then tells it not to copy them. It copies them anyway. | Replace the example with a shape the model cannot copy into a real answer, and drop any menu that still carries the example's words. | lane A |
| 5 | **Every answer to a question with a screenshot ends with a line of technical text.** ★ reply | Cause known: the line is added on purpose, and nothing on screen strips it. | Take it out of the reply and keep it as a log line (question 4). | lane A |
| 6 | **Pressing Ask leaves nothing highlighted**, every time, with or without a question typed. And **a greyed Ask button still takes the highlight** while a question is in flight. ★ focus, twice | Measured four times and once. Same family as nothing being highlighted when the panel opens. | Hand the ring somewhere sensible after the press; step the D-pad over a greyed button. | lane C |
| 7 | **Six small D-pad annoyances**, each measured on the device: Left on the *N earlier* row throws you out of the plugin; A on an open question closes it and drops the ring; walking Down and walking Up through a reply visit different stops; Up from an archived chat header skips the chat slot row; the try-order picker's Done lands on the tab, thirteen presses from where you were; greyed Helpful / Not really on a stopped reply take the ring. ★ to ★★ focus | Every one has a device run named in its entry. | One fix each, through a real move handler or Steam's own hand-off. | lanes B, D, E |
| 8 | **A short question fades at its right edge** as if it were cut short. ★ chat | Cause known: the fade is drawn on every open question. | Fade only when the text really overflows its room. | lane E |
| 9 | **The copy icon sits on the code box** instead of beside it. ★★ ui | Measured: 16 by 9 pixels of overlap; the cause is known and written in the entry. | Reserve room below a code box that ends the answer, or move the icon off the box. | lane D |
| 10 | **Two model-download traps**: a mistyped name in a several-model download is dropped silently; a big model with no size listed gets no warning. ★ ollama, twice | Both found by reading the code; causes known. | Say which name could not be found; treat an unknown size as a warning, not a pass. | lane B |
| 11 | **Pinned test chips carry no Test badge**, so nothing says the carousel is showing a fixed set. ★★ KB | Seen twice; the badge code exists and does not show. Cause not yet known. | Time-boxed: find why the badge never renders. | lane F |
| 12 | **A Hades boss note is spelled wrong** (Megara for Megaera), so the right spelling gets a "guessing" line. ★ KB | One title and a library rebuild. | Fix the title, rebuild, point release (question 7). | lane A |
| 13 | **The honesty line never shows when the game is only named in the question**, which is the one case a person is most likely leaning on the model's memory. ★★ KB | Cause known: the coverage check is never told about a game the question named. Plan 54's third gap hands the prompt that same resolved profile. | Tell the coverage check too, on the same plumbing, after plan 54 lands. | lane A |
| 14 | **A faded ghost of the tab bar stays drawn over the chips after touching the screen.** ★★ tabs | Seen twice. The bar fades rather than unmounting; something after a touch leaves it half-shown. Only a finger can reproduce it — the rig has no touch. | Time-boxed desk fix from reading the code; the maintainer verifies with a touch. | lane I |

### 2b. Two more, one decided and one still waiting (§ 8)

- **Opening the panel leaves nothing highlighted**, so the first press places the ring instead of moving
  it, and on one measured open it landed on Decky's back arrow. ★★ focus. The guide says this is normal
  Steam behaviour and not ours to fix; the roadmap has it as an open bug. **Decided: try it and find out
  who is right.** Lane C makes one time-boxed attempt to place the ring on the chat's first useful stop
  when the panel opens. If it holds on the device, the guide's wording changes; if Steam fights it, the
  roadmap entry closes as accepted. Either way the two documents stop disagreeing.
- **The settings list is written out seven times**, so a new setting can quietly stop working in one
  place. ★ ui. A refactor, not something a person sees today. **Decided: not this session.** The
  maintainer read the explanation under question 2 in § 8 and said no for now. It stays on the roadmap.

### 2c. Not this session, and why

- **Down on an unrevealed spoiler block** — did not reproduce on retry; closes with #1 or stays open.
- **The highlight ring looks different from Steam's own** — a design call, skipped twice already.
- **Text arrives in bursts while a game runs** — accepted.
- **Two callers wanting the voice server at once** — nothing uses it that way yet; future-proofing.
- **A follow-up names the wrong boss one run in three** — a model limit; the search half is done.
- **Unrelated questions get game cards**, **symptom-only troubleshooting questions reach no tips**,
  **the meaning search costs a second**, **the blend weights** — all accepted or already decided.
- **"No tip for this" never fires**, **four questions get the wrong note** — wave-four note-writing and a
  decision about the floor, not fixes.

## 3. What to focus on first

1. **The stuck panel.** It is the worst thing a person can hit, it got in the way of checking other
   things last time, and for the first time there is a recipe to reproduce it.
2. **The game line.** Wrong notes on every game switch, and it has been open since 7 September.
3. **The three answer-text bugs** — the power block, the Half-Life 2 menu, the technical line. They sit
   in the words a person reads.
4. **The D-pad family.** Small each; together they are most of the day-to-day friction.
5. **Everything else.**

## 4. Who does what

**The one running the session: Fable 5.1 at extra-high effort, by the maintainer's choice. Lanes:
Sonnet 5 at high effort, five at most at once.** The repo's routing table asks for Opus at extra-high
to run a bug-fixing session, and keeps Fable for five- and six-star scope; nothing here is above three
stars. The maintainer knows that and chose Fable anyway, so it is recorded in D104 as their call. Three
things follow:

- **Effort stays at extra-high, not max.** Eight of the ten times the usage limit stopped a session, it
  was Fable at max. The spawn hook also refuses new lanes once the session has spent too much of its
  usage window, so wave 2 should start early in a window, not late.
- **The bookkeeper does every roadmap, testing, changelog and test-file edit.** The guard refuses those
  edits from Fable. Hand it a list per landing and per Deck block; it never invents a device result.
- **Nothing else changes.** Lanes are Sonnet, the Deck rows are written and read by the session, and
  the stuck panel stays with the session because no lane gets a highlight bug without a measured cause.

Refinements from the table that matter here:

- **A highlight bug goes to a lane only when a device measurement has named its cause.** Every bug in
  lanes C, D and E has a named run in its roadmap entry. The stuck panel does not, so I take it.
- **Every highlight fix is read against the focus law before landing:** does it go through a real move
  handler or Steam's own hand-off? If it leans on a keyboard event, it is dead on the device however
  green the tests are.
- **The bookkeeper** (Sonnet high) does the docs sweep after each landing and after each block of Deck
  checks, from a list I hand it. It never invents a device result.
- **Deck checks:** Opus writes rows and reads failures; a Sonnet runner may run rows that are already
  written, one runner at a time. **Only one thing drives the Deck at a time**, and other chats have
  pressed buttons on it before — the rig cannot tell.

## 5. Order of work, and what runs side by side

### Block 0 — hygiene, me alone, about twenty minutes

1. Start the tunnel. Confirm the Deck is running this exact checkout by hash. Confirm the five gates
   are green before anything changes.
2. Check plan 54. If it has landed on experimental, cut every lane from that. If not, cut wave 1 only,
   and check again when the first lane reports back.
3. Write the wave-1 briefs from this plan. Every brief carries: the tip hash and the base check, the
   files the lane owns, one change per commit, the five gates, the focus law, and one override — the
   worktree helper links the shared checkout's packages folder into the copy, so the lane skips its
   own package install step.

### Wave 1 — three lanes start on "go", and I go to the Deck

None of these share a file with plan 54's copy.

| Lane | Bugs (§ 2a numbers) | Owns, in words |
|---|---|---|
| B — Models | 10 (both), then the try-order Done hand-off from 7 | the pull-models dialog, the try-order picker and its hook, the model routing helpers on both sides |
| C — Ask bar | 6 (both halves), then 2b's opening ring, time-boxed | the unified ask bar and its focus hook |
| I — Tab bar ghost | 14, time-boxed | the tab indicator bar and its nav helper |

The settings-list lane that was pencilled in here is out; the maintainer said no for this session.

Me, on the Deck while they work: **the stuck-panel recipe, five runs, evidence saved each time.** If it
reproduces, read the two focus owners and the hand-off registry at the moment of the trap, then one fix
that the evidence supports, then the recipe again. If five runs cannot bring it back, write that down
and move on; the entry stays open.

### Wave 2 — after plan 54 lands on experimental

| Lane | Bugs (§ 2a numbers) | Owns, in words |
|---|---|---|
| A — Answer text (Python) | 3, 4, 5, then 12, then 13 | the prompt text, the power-line cleanup, the request file, the knowledge base service, the note data |
| D — Reply row | 7's Down-and-Up stops and the greyed thumbs, then 9 | the answer bubble builder, the reply actions builder, the reply stop registry, the copy button |
| E — Transcript | 8, then 7's *N earlier* Left, A on a question, and Up from an archived header | the chat transcript and its styles |
| F — Game line and chips | 2, then 11 | the ask orchestration hook, the animated chip row |

Wave-2 lanes start as wave-1 lanes finish, five running at once at most. Lane A is one lane on purpose:
its five items touch the same two Python files, and two Python lanes would fight over them.

### Block 3 — landing, me alone

Each lane's commits are read as diffs, then taken onto experimental one at a time, oldest first, with
the five gates after every one. One bookkeeper sweep per landing: the roadmap entry moves to Verify with
its row named, the testing row is added or updated, the changelog gets its line. Lanes never touch those
three files; that is what caused the clashes two sessions ago. Under Fable the session cannot touch them
either (§ 4), so the bookkeeper is the only pair of hands on them.

### Block 4 — the Deck checking pass (§ 6)

### Block 5 — the report

Everything found and not fixed goes into the roadmap with its evidence, and into § 10 here. Anything
that needs the maintainer's eyes or finger goes on their checklist. A short written summary at the end.

## 6. The Deck checking pass

Rules first, because the last clean-up found twelve rows that read as proven with nothing behind them:

- **Save the evidence file before writing the row.** A result is written into a testing row only
  after its file exists under the evidence folder and is named in the row.
- A failure is written down with its file, not argued with.
- If the device contradicts the code, check the installed build's hashes before believing it.
- Settings go back the way they were found, read off disk to prove it, at the end of every block.
- Screenshots and recordings come from the repo's own two scripts (§ 1); the rig's screenshot tool is
  broken. Anything that moves gets a recording, not a read.
- The plugin needs up to three open attempts after a deploy. The rig's wait tool contradicts itself;
  confirm any wait with a direct page read.
- A stop that is highlighted but hidden behind the dock is a fail, whatever the scripted row says.

The order:

1. **Deploy once, prove the build by hash.**
2. **This session's fixes**, in the order they landed, the stuck-panel recipe first (five runs).
3. **The twelve checks whose evidence never existed** — batch QA-EVIDENCE-GAP-01 in
   [testing.md](../testing.md) — as one batch. Any of the twelve that depends on code no longer in the
   tree is written down as such rather than faked.
4. **The quick smokes:** SMOKE-A, SMOKE-C, SMOKE-F, then SMOKE-E and SMOKE-H.
5. **The Verify list, cheapest first:** rows span the panel width (measured by rect); the shell-state
   smoke without the wipe half; the three streaming rows; the thinking-line rows a script can drive; the
   named chat slot rows still owed; the kids lock rows except the child-account one; the soft cap rows 01,
   03 and 04; the five VAC rows; the mid-generation half of clear cache, by script; the quick-launch chord;
   and **the five August knowledge-base rows** the roadmap says to verify or retire — run each, and say
   in its row whether it is still a real check or stale, so the maintainer can retire the stale ones.
6. **Plan 54's rows**, if it has landed and deployed by then and they are still open (decided yes): the
   three required Deep Rock rows, the streaming one, the two Hades guards, and its three new rows
   (**STRAT-SPOIL-NAME-01**, **STRAT-SPOIL-FIRST-01**, **STRAT-SPOIL-TEXT-01**).
7. **The free-play sweep** on the Main tab with a long reply on screen: every stop highlighted and
   visible, both directions, using the rig's sweep tool if it does the job and a hand-walk if not.
8. **The wipe**, last. **Pre-authorised (D104).** Back up the settings file, the saved chats and the
   knowledge-base flags first; wipe; run the three waiting rows (the leftover flags, the New labels, the
   voice install surviving); restore; read the settings back off disk and compare them to the backup
   before calling the block done.

Rows this pass cannot run, and why, so nobody looks for them: the chip glow, tab-bar legibility and the
preset scroll feel (eyes); the tab-bar touch row, the glossary tap and the ghost tab bar (a finger); the
large-model routing row and the two preload rows (a large model on the device); the thinking-model cap
row (a thinking model); the child-account row; whether speech comes back as the right words (a
microphone). They stay owed and are listed in the report.

Where a row needs a game running, the rig launches and exits it. **Decided: launch games as needed.**
Hades, Deep Rock Galactic: Survivor, Portal 2 and Black Mesa are all believed installed; confirm each
one on the Deck before a row relies on it, because a row built on a game that is not there proves
nothing. The rig's exit tool refuses to guess through a confirm dialog, so a game may be left running
for the maintainer to close; say so in the report.

**Roadmap upkeep during the pass.** After each numbered step, one commit moves every row that passed
(Verify to Done, the full entry to the archive) and pins every failure in place with its file. The
bookkeeper does that typing from a list I hand it; I read the failures. A new bug found on the way is
filed in the roadmap at once, in its star position, with its evidence, and gets a fix attempt if it is
small.

## 7. Rules for this session

1. One fix per commit, behaviour preserved, the five gates green between commits.
2. Lanes hand back code, tests and one paragraph. They never touch the roadmap, the test docs or the
   changelog, never touch the Deck, and never push.
3. Every lane prints and checks its base before doing anything, and skips the package install because
   the helper links the shared packages folder in.
4. A failure on the device is written down with its evidence file named, not argued with.
5. If a device result contradicts the code, check the installed build's hashes before believing it.
6. Settings go back the way they were found, read off disk, at the end of every device block.
7. **Do not sink time into a bug that turns out to be hard.** Make a good effort, write down what was
   learned, move on. Lanes I and F's badge item are time-boxed from the start.
8. Only one thing drives the Deck at a time. If another session is pressing buttons, stop and ask.
9. Do not start lanes just before the usage window resets.
10. Everything written to the maintainer, in chat or in this file, is in plain language.
11. **Never remove a copy of the repo with the git remove command, and never remove one you did not
    make.** Each copy's packages folder is a link straight into the main checkout's, and the git command
    follows the link on the way out — another session lost the main folder's command shims that way
    today. Unlink the packages link first, then delete what is left. A copy that was not there five
    minutes ago is somebody's live work. The full lesson is in
    [lessons-learned.md](../lessons-learned.md) § 1.
12. Nothing starts until the maintainer says "go".

## 8. Questions for you — answered 2026-09-15, locked as D104

| # | Question | Answer |
|---|---|---|
| 1 | **Plan 54 shares four files with this session's lanes and has not landed yet.** Wait for the other session to land it, or land it myself if I find it finished in its copy? | **Wait.** The maintainer will say when to proceed. Nothing touches plan 54's copy. |
| 2 | **Scope:** include the settings-list refactor (seven copies down to one)? | **No, not this session.** Decided after the explanation that follows, kept here so the next person does not have to work it out again. The plugin has about fifty settings. The screen-side code that keeps them in step writes out the full list of setting names seven separate times in one file: to hold them in memory, to take a snapshot, to fill them in from disk, to reset them if loading fails, to decide when to save, to hand them to the rest of the plugin, and to write them back out. Add a setting and all seven lists need the name by hand; nothing checks. Miss one and the setting looks fine on screen but silently drops out in the one path that was missed — it comes back at its default after a restart, say. That has already happened once, to four settings at the same time. The fix is to write the list once as a table and have the other six places read from it, so a missed place becomes impossible rather than silent. Nothing is broken for a person today; it is protection for the next setting anyone adds. A few hours in a Sonnet lane, an Opus review because every setting passes through it, and a Deck check that changes a few settings, restarts the plugin, wipes and restores, and confirms they stuck. It stays on the roadmap for a quiet day. |
| 3 | **Opening the panel leaves nothing highlighted:** the guide says this is normal Steam behaviour and not ours to fix; the roadmap has it as an open bug. Which is right? | **Try it and find out.** Lane C makes one time-boxed attempt. The device decides which document changes. |
| 4 | **The technical line under screenshot answers:** gone, or shown only with verbose logging on? | **Remove it.** Gone from the reply. The count survives only as a log line, and only when verbose logging is on. |
| 5 | **Wiping all plugin data.** Three Verify rows wait on it, and the maintainer will be away for hours. | **Pre-authorised.** Last step of the pass, backup first, restore after, settings read back off disk and compared. |
| 6 | **Run plan 54's Deck rows in this pass**, once it has landed and deployed? | **Yes**, if they are still open when this session gets there. |
| 7 | **The Megaera fix needs a library rebuild and a point release installed on the Deck.** | **Yes.** One title and nothing else, the way the 7 September release did. |
| 8 | **Games.** Several rows need the rig to launch and exit a game. Fine unattended? Which are installed? | **Fine, launch as needed.** Hades, Deep Rock Galactic: Survivor, Portal 2 and Black Mesa are all believed installed. Confirm each on the Deck before a row relies on it. |
| 9 | **The five August knowledge-base rows** the roadmap says to verify or retire. | **Run them**, and say in each row whether it is stale. The maintainer retires the stale ones. |
| 10 | **Is anyone else going to drive the Deck** while this runs? | **No.** Plan 54's session finished without touching the Deck. The pass has the device to itself unless the maintainer says otherwise; block 0 still asks before the first press. |
| 11 | **Which session runs this?** | **A fresh session on Fable 5.1 at extra-high, by the maintainer's choice.** The table says Opus for this; the maintainer knows and chose Fable anyway. It reads this file and starts at block 0 when they say go. What follows from the choice is in § 4. |

## 9. Things to bring to your attention

- **The guide and the roadmap contradict each other** about the ring being unowned when the panel opens.
  Decided: the device settles it (question 3). Whichever wins, the other document has to change, and
  that edit is part of landing lane C.
- **Plan 54 landed 2026-09-15; wave 2 is unblocked.**
- **A new lesson landed in the lessons file today from another session:** removing old copies of the
  repo with the git command deleted part of the main checkout's packages, because each copy links to
  them. Rule 11 in § 7 carries it. Whoever runs this session must not clear up copies on the way out.
- **The rig cannot touch the screen and cannot take screenshots.** Two bugs and three rows need a finger
  or eyes; they end on your checklist, not in this pass.
- **The evidence-gap lesson shapes this pass.** No row's result is written before its file exists. That
  will make the pass slower and the rows honest.
- **The wipe is the only destructive step**, and it only happens with a yes in advance (question 5).
- **Budget.** Sonnet lanes ship one- to three-star fixes fine when the cause is known, and every lane
  item here has its cause named except the badge and the ghost, which are time-boxed. The expensive part
  is the Deck pass, which is one agent at a time by necessity, and it runs on Fable by the maintainer's
  choice. Fable costs two and a half to three times what Opus does per turn, so the pass should hand
  already-written rows to a Sonnet runner wherever it can and keep Fable for reading failures.

## 10. Progress log

Written as work lands.

- **2026-09-15 — plan written, questions answered, waiting for "go".** Ten of eleven calls made and
  locked as D104; only the exclusive Deck window is still open. The settings-list refactor is out for
  now, and the session will run on Fable at extra-high by the maintainer's choice. Nothing built, nothing
  pressed, nothing deployed. Plan 54's session was still mid-work in its own copy.
- **2026-09-15 — plan 54 landed, wave 2 unblocked.** The exclusive-Deck question is answered too: plan
  54 finished without touching the device, so this pass has it to itself. Nothing else changed.

---

## Appendix — files each lane owns (for the briefs, not for reading)

Confirmed against a code search on 2026-09-15; the brief re-checks each list against the tree it is cut
from. A lane that truly needs a file outside its list says so in its report rather than sprawling.

| Lane | Files |
|---|---|
| A | `py_modules/backend/services/ollama_prompts.py`, `py_modules/backend/tdp_intent.py`, `py_modules/backend/services/game_ai_request.py`, `py_modules/backend/services/response_verify.py`, `py_modules/backend/services/knowledge_base_service.py`, the note data under `data/kb/`, and their tests |
| B | `src/components/PullModelsModal.tsx`, `src/components/ModelRoutingOrderModal.tsx`, `src/features/model-routing/useRoutingOrderModal.ts`, `src/utils/modelRoutingOrder.ts`, `py_modules/backend/services/ollama_service.py`, `py_modules/backend/ollama_routing.py`, and their tests |
| C | `src/components/MainTabUnifiedAskBar.tsx`, `src/hooks/useMainTabAskBarFocus.ts`, and their tests |
| D | `src/utils/buildAnswerBubbleElement.tsx`, `src/utils/buildReplyActionsElement.tsx`, `src/utils/answerBubbleNavigation.ts`, `src/utils/replyStopRegistry.ts`, `src/components/ReplyCopyButton.tsx`, `src/styles/sections/section-6.ts`, and their tests |
| E | `src/components/MainTabChatTranscript.tsx`, its styles, and its tests |
| F | `src/hooks/useBonsaiAskOrchestration.ts`, `src/hooks/useChatSlots.ts` (read only, the mechanism to copy), `src/components/MainTabPresetAnimatedChips.tsx`, and their tests |
| I | `src/features/plugin-shell/TabIndicatorBar.tsx`, `src/features/plugin-shell/tabBarNav.ts`, and their tests |

Files that belong to me and to no lane: `src/utils/navFocusRegistry.ts` and `src/utils/uiDocument.ts`
(the hand-off registry the stuck panel lives in), the roadmap, the testing documents, the changelog.
