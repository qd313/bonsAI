# 56 — The fourth feature-building session, with Deck checks running alongside

Written 2026-09-15 evening, before any code was started. The maintainer picked nine roadmap features
and asked for a plan first: what to build first, what runs side by side in its own copy of the repo,
what cannot run side by side and should be dropped, and what needs their decision. They also asked
that the one running the session use the Deck for checks the whole time the helpers are building,
the way the third bug-fixing session did ([plan 55](55-bugfix-session-three.md)).

**Status 2026-09-15: questions answered and locked as D105, waiting for the maintainer's "go".**
The answers are in § 8. Two of the nine are dropped from the build by the maintainer's choice and go
into a drawn mockup page at the end of the session instead (§ 9). Nothing in § 5 starts until they
say go.

Read first: [CLAUDE.md](../../CLAUDE.md); the focus graph section and 'Which model does which work'
in [AGENTS.md](../../AGENTS.md); [lessons-learned.md](../lessons-learned.md), especially § 1 on
shared checkouts and § 4 on briefing helpers; [plan 55](55-bugfix-session-three.md), the last
session of this shape, which worked.

**The maintainer's own checklist of things only a person can judge lives here:**
[Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
Anything this session finds that needs their eyes or their finger goes on it.

---

## 1. What is true right now (checked 2026-09-15 evening, nothing pressed)

- **The tree is clean** on the experimental branch at `214353b`. The last two commits are plan 55's
  results and one new bug it found. This plan and its decision entry are the only new text.
- **The Deck answers, the model server answers, the rig is armed, and the controller board is on
  COM7.** The Deck should be running plan 55's last build; block 0 proves that by hash before anything
  else. One live remote connection from another process was registered at 23:44 UTC; the maintainer
  says the Deck is this session's, so that record is a leftover.
- **This PC has Ollama with the Deck's own default model** and every model from the September
  bake-off. Nothing in this session needs it now that the reasoning display is out, but the mockup at
  the end can capture real thinking text from it.
- **Eight copies of the repo from plan 55 still exist** under the copies folder, each on its own lane
  branch. Every commit in them has landed. They are not this session's to remove (rule 11 in § 7);
  new lanes get new names.
- **The bookkeeper guard blocks the session's own edits** to the roadmap, the testing documents, the
  changelog and test files, because the session runs on Fable. All of those edits go through the
  bookkeeper helper, batched per landing and per block of Deck checks, from a list the session hands it.
- **Two of the nine entries are not what the roadmap says they are.** The Spy is already in the
  character picker, as an ordinary smooth voice, and has been since June; the entry says he is a new
  character. And the "reclaimed height" entry expects the chat to grow by the 61 pixels the tab bar
  freed, but the last measurement shows only about 56 of them are dead space that a layout fix can
  reclaim. Both are in § 9.
- **The plugin does not send chat history to the model.** What it carries from one question into the
  next is small: the subject of the last strategy question (for a bare follow-up), and the strategy
  checklist position for the running game. The Session context bar is an audit of what each past turn
  attached, not of carried context. This shapes what the lighter Clear (§ 8 question 5) does.

## 2. The nine features, sorted by what happens to each

Ordered by what a person would notice, not by star count. The star and tag are the roadmap's.

| # | What a person gets | What is decided | Lane | This session? |
|---|---|---|---|---|
| 1 | **The Steam settings list stops shoving the question box up the screen.** It becomes a small card above the box holding the best eight, Up walks in, Down walks out, B closes it and keeps your words. ★★★ ask, focus | Every call locked 6 September; sizes measured on the Deck; six build steps in commit order in [plan 45](45-settings-shortcut-card.md). The first step alone fixes the jumping box and is worth having if the rest fails. | E | **Yes** |
| 2 | **The Spy lies to you on purpose.** At the two heaviest accent settings his advice sounds right and is wrong, wasting your time and nothing worse. Show details always says he was on and lists what he lied about, so you can find out. ★★★ reply | Locked tonight (D105): the reveal is a line under Show details; he lies only at the two heaviest accent levels, the way Pyro does; the trick where he opens as a different character is deferred. He already exists in the picker; the work is the lying and the reveal. | G | **Yes** |
| 3 | **A Clear button at the right end of the Session context bar.** One press asks once, then the plugin forgets what it carries into the next question — the last strategy subject and the checklist position — and says so. The chat stays on screen. ★★ ui, ask | Locked tonight (D105): Clear means only what the model sees, not the whole session. Clear cache in Settings gets the same forget in the same change. | A | **Yes**, and it lands first |
| 4 | **Expert offers the stronger Deck-run models first**, in the order the September answer test ranked them, and the plugin's licence list learns that Gemma 4 is open source and that Granite and Liquid exist. ★★ ollama | Locked 5 September: Gemma 4 12B, Qwen 3.5 9B, Granite 4.2 8B, then Gemma 4 E4B and LFM 2.5; Gemma 4 moves to the open-source families; Granite joins them; Liquid is open-weight. The picker and the list only; the routing order is untouched. | B | **Yes** |
| 5 | **The answer checker runs quietly and writes what it catches to the log**, nothing on screen, no second model. ★ ask | Locked 13 September. Three rules, log only; the baseline count is written down so the trial means something. | G, as its first small commit — it sits in the same file as the Spy's reveal | **Yes** |
| 6 | **Inside the AI models screen, Up at the top of the policy choices and Down at the bottom of the advanced switches hop to the neighbouring group** instead of doing nothing. ★ focus | Cause named from reading the code: neither group hands the press anywhere. A highlight fix goes to a lane only after a device measurement names the real stops; block 0 measures it. | C, after the measurement | **Yes**, if measured |
| 7 | **The chat gets the dead space above the question box.** ★★★ layout | Locked tonight: measure, and fix only if the measurement names one cause. The last measurement says the tab bar's 61 pixels went into a 41-pixel gap above the dock and 15 pixels of overflow. | H, after the measurement | **Yes**, if one cause is named; otherwise "measured, not built" |
| 8 | **The model's real thinking shows under your question while it thinks**, then folds to one line. ★★★★★ reply | Every build call was locked on 5 September. **Dropped from this session by the maintainer tonight**: they want to see it drawn first — the three live lines, the plain folded line and the folded line in a character's voice — before anything is built. | none | **No** — into the mockup page (§ 9) |
| 9 | **Session context folds into Show details**, so a settled answer costs one collapsed control instead of two. ★★★ layout | Nothing is decided; four open design questions. | none | **No** — into the mockup page (§ 9) |

## 3. What to focus on first

1. **The settings card.** The jumping box is the worst thing in the list for a person typing, and step
   one of six fixes it on its own. It is also the only three-star build left, so it starts first.
2. **The Spy and the checker.** One lane, back end mostly, nothing waiting on it.
3. **The Clear button.** Small, decided, and it lands first in time because it hands a prop through
   files two later lanes may want.
4. **The Expert order and licences.** One lane, nothing waiting on it.
5. **The two measured items** — the models hub edges and the dead space above the box — as soon as
   block 0 has read the numbers.
6. **The bugs plan 55 found**, time-boxed, in wave 2.
7. **The mockup page**, last, drawn from real sizes.

## 4. Who does what

**The one running the session: Fable 5.1 at extra-high effort, by the maintainer's choice. Lanes:
Sonnet 5 at high effort, five at most at once.** The routing table asks for Opus at extra-high to run
and land a lane session and keeps Fable for planning five- and six-star scope; with the five-star
entry dropped, nothing here is above three stars, so Fable running it is the maintainer's call, the
same as plan 55. Effort stays at extra-high, not max — eight of the ten times the usage limit stopped
a session, it was Fable at max.

- **The session writes no plugin code.** It writes briefs, measures on the Deck, reads diffs, lands
  commits one at a time with the gates after each, runs Deck checks, reads failures, hands the
  bookkeeper lists, and draws the mockup page at the end.
- **Lanes hand back code, tests and one paragraph.** They never edit the roadmap, the testing documents
  or the changelog, never touch the Deck, never push. Each is cut from the tip with the copy script,
  prints and checks its base first, owns a named list of files, makes one change per commit with all
  five gates green, follows the focus law, and skips its own package install because the copy's
  packages folder is a link into the shared checkout.
- **The bookkeeper** (Sonnet high) does every roadmap, testing, changelog and test-file edit from a list
  the session hands it, after each landing and after each block of Deck checks. It never invents a
  device result, and it does not commit while a landing is running in the shared checkout — it finishes
  its edits and reports the file list.
- **A read-only lookup helper** (Sonnet low) compiles the Deck rows this session can run into one
  scratch file at the start, so the session does not read the whole testing document itself.
- **Deck checks:** the session writes the new rows and reads every failure. Only one thing drives the
  Deck at a time.

## 5. Order of work, and what runs side by side

### Block 0 — hygiene and three measurements, the session alone, about forty minutes

1. Confirm the tree is clean at the tip and the five gates are green before anything changes.
2. Check the Deck's remote connection records; the maintainer says the device is this session's.
3. Back up the Deck's settings file and saved chats over SSH, as plan 55 did. Note which Ollama the
   settings point at (the Deck's own, or a PC on the network) — it decides what the wipe at the end
   leaves working. Hold the Deck awake.
4. Deploy the tip once and prove it by hash.
5. **Three measurements, evidence saved each time**, all read-only (recipes in Appendix B):
   - **The models hub edges.** Either two named stops for lane C, or "Steam already hops it" and the
     entry closes as accepted.
   - **The dead space above the box.** Either one named cause and the fix for lane H, or "no single
     cause" and the entry stays open as measured.
   - **The jumping box, before.** The "before" the settings-card row compares against.
6. Write the wave-1 briefs from this plan (the file lists are in Appendix A). Start the lookup helper
   on the Deck row list.

### Wave 1 — five lanes start on "go", and the session goes to the Deck

| Lane | Feature (§ 2 numbers) | Owns, in words |
|---|---|---|
| A — Clear button | 3 | the Session context strip, the one-line prop hand-through in the four files between the plugin root and the strip, one new back-end method that forgets the carried context, the follow-up memory, the strategy checklist session store, the Settings tab's Clear cache handler |
| B — Expert order and licences | 4 | the model catalogue, the pull picker's group ordering, the recommendation helper, the back-end licence list, the bake-off roster facts, the two-language contract test |
| C — Hub edges | 6 | the AI models screen and its two panels — cut only if block 0 names two stops; otherwise its slot goes to lane H |
| E — Settings card | 1 | the unified Ask bar, its focus hook, the settings search hook, the Ask bar's style section |
| G — Spy and the checker | 5 first, then 2 | the character service, the answer request's finished-reply block, the checker, the transparency snapshot and its chip manifest; screen-side chip files only if a new chip kind needs a colour |

**Lane A, in words.** The bar gets a small Clear at its right end, shown only when the bar shows. Left
and Right move between the bar's header and the button; the button is a proper stop. A opens the same
confirm box Clear cache uses, with the return-focus registration the Settings button has, so closing
the box lands the highlight back on Clear. On OK the screen calls one new back-end method that forgets
the last strategy subject and clears the strategy checklist position for the running game, then shows
a short toast saying the next question starts fresh. The chat stays on screen and the bar's rows stay,
because they are an honest record of what each past turn sent. The lane reads the ask path once to
confirm nothing else is carried between questions; if something is, it is included and named in the
report. Clear cache in Settings calls the same forget on top of what it does today.

**Lane E** builds plan 45's six steps in order, one commit each. If a later step fails review, the
earlier ones still land.

**Lane G, in words.** Commit 1: the checker. At the point where the finished reply is assembled, run
the three rules and write the result to the log, one line per answer naming which rules fired;
nothing appended to the reply, no second model. Commit 2 onward: the Spy. At the two heaviest accent
levels the Spy's voice text tells the model to give advice that sounds right and is wrong, under the
same floor Pyro's text carries (nothing that can damage the Deck, lose a save, cost money or turn off
a protection; wasted time only), and to end the reply with a closing tag listing, in one short line
each, what he lied about. The back end strips that tag from the visible reply the way it already
strips the spoiler-risk tag, carries the list in the ask result and the transparency snapshot, and adds
one chip to the Show details manifest: *Spy*, whose body reads *The Spy was on* and lists the lies —
or says he did not confess, when the tag is missing, so the reveal exists even when the model forgets.
Below the two heaviest levels the Spy stays the smooth honest voice he is today, and the chip never
appears. The destructive-advice guard keeps running on his replies.

The session, on the Deck while they work: § 6.

### Wave 2 — as slots free

| Lane | Work | Owns, in words | Cut after |
|---|---|---|---|
| H — Dead space | 7 | the Main tab, the column-fill hook, the transcript and column style rules | the block-0 measurement names one cause, and a wave-1 slot is free |
| I — D-pad bugs from plan 55 | Left from the Ask button or the paperclip leaving the plugin; Up from Retry not returning to the answer; the Ask-mode menu dropping the highlight after a choice; the Deep Rock glossary loop | the Ask bar, the turn header builder, the Ask-mode menu popover, the glossary word stop | lane E has landed (it shares the Ask bar), and the session has reproduced the menu drop with an evidence file |
| J — The honesty line | the "no close match" line that failed on the device in plan 55: game named only in the question, three cards attached, no line shown | the answer request, the coverage check, the not-in-notes notice | lane G has landed (it shares the answer request file) |

Lanes I and J are time-boxed: each bug is one commit; any that turns hard is written down and left.
Anything new the Deck pass finds joins one of these two if it is small, or the roadmap if it is not.

### Landing — the session alone, between Deck blocks

Each lane's commits are read as diffs, then taken onto experimental one at a time, oldest first, with
the five gates after every one, from a small script in the scratch folder running in the background.
One bookkeeper sweep per landing: the roadmap entry moves to Verify with its row named, the testing
rows are added, the changelog gets its line. Deploy after wave 1 has landed, after wave 2, and at the
end — not after every commit, because each deploy restarts the loader and costs three open attempts.

### The mockup page — last

One published page, drawn at true size from the real stylesheet values (the 300-pixel column, the
12-pixel answer text at 1.4 line height, the real bubble colours), holding:

- **The reasoning display:** the three live lines under a question, filled with real thinking text
  captured from this PC's copy of the Deck's model; the folded line *Show reasoning · 41 s*; and the
  same folded line in three characters' voices, so the maintainer can judge whether the voiced version
  works, which is what the 5 September decision left to their eye.
- **Session context folded into Show details:** the options drawn side by side — a row inside the
  expanded Show details panel, a tab within it, a section appended to it — each with its collapsed label
  and the D-pad escape route marked, so the four open questions can be answered by looking.

The page is linked from § 10 when it exists, and from the two roadmap entries.

### The report

Everything found and not fixed goes into the roadmap with its evidence, and into § 10 here. Anything
that needs the maintainer's eyes or finger goes on their checklist. A short written summary at the end.

## 6. The Deck work while lanes build

Rules first, from plan 55, all still true:

- **Save the evidence file before writing the row.** No result is written until its file exists under
  the evidence folder and is named in the row.
- A failure is written down with its file, not argued with. If the device contradicts the code, check
  the installed build's hashes before believing it.
- Settings go back the way they were found, read off disk to prove it, at the end of every block.
- Screenshots and recordings come from the repo's own two scripts; the rig's screenshot tool is broken.
  Anything that moves gets a recording.
- The plugin needs up to three open attempts after a deploy. The rig's wait tool contradicts itself;
  confirm any wait with a direct page read.
- A stop that is highlighted but hidden behind the dock is a fail, whatever the scripted row says.
- Only one thing drives the Deck at a time.

**While wave 1 builds** (the deployed build is plan 55's, so these are plan 55's leftovers and the
standing backlog, cheapest first):

1. The three block-0 measurements above.
2. The halves plan 55 left owed: the empty-box half of the Ask highlight row; the vision picker half of
   the try-order return row; the thumbs half of the greyed-button row; the mirrored reply stops row; the
   missing-name download row; the copy icon beside a code box, with a pinned chip that asks for a code
   box and nothing after it, since the model added a closing sentence last time.
3. Reproduce the two new bugs with no evidence file yet: the Ask-mode menu dropping the highlight after
   a choice (lane I waits on this), and a new chat showing the previous chat's last reply.
4. The Black Mesa sentence for the advice-first row, the last of its three.
5. Whatever remains of the twelve evidence-gap checks, read off the testing document first.
6. The quick smokes, then the Verify list cheapest first: the streaming rows, the thinking-line rows a
   script can drive, the named chat slot rows still owed, the kids lock rows except the child-account
   one, the soft cap rows, the five VAC rows, the shell-state smoke, the quick-launch chord.
7. **The wipe, last of everything, pre-authorised tonight (D105).** Back up the settings file, the
   saved chats and the knowledge-base flags first; wipe; run the three waiting rows (the leftover
   flags, the New labels, the voice install surviving); restore; read the settings back off disk and
   compare them to the backup. **It also removes the Deck's own Ollama and every model it downloaded**,
   which is why it runs after every other Deck check. Those are not put back by the restore; the
   report says exactly what is gone and what the maintainer has to press to get it back.

**After each landing batch is deployed:** the new features' rows, written by the session before the
build lands and run right after — the seven settings-card checks from plan 45, the Clear button rows,
the Spy rows, the hub edge row, the Expert order row, the dead-space row, the checker's log line — then
the free-play sweep, because most of these change the Main tab.

Rows this pass cannot run, and why: anything needing a finger (the ghost tab bar, the glossary tap, the
tab-bar touch row); anything needing eyes (the chip glow, tab-bar legibility, the preset scroll feel,
the by-eye landing of the try-order Done, whether the Spy's wrong advice actually sounds right); a large
model on the device (the large-model routing row, the two preload rows); a microphone. They stay owed
and are listed in the report.

## 7. Rules for this session

1. One change per commit, behaviour preserved, the five gates green between commits.
2. Lanes hand back code, tests and one paragraph. They never touch the roadmap, the test documents or
   the changelog, never touch the Deck, and never push.
3. Every lane prints and checks its base before doing anything, and skips the package install because
   the copy helper links the shared packages folder in.
4. A failure on the device is written down with its evidence file named, not argued with.
5. If a device result contradicts the code, check the installed build's hashes before believing it.
6. Settings go back the way they were found, read off disk, at the end of every device block.
7. **Do not sink time into a bug that turns out to be hard.** Make a good effort, write down what was
   learned, move on. Wave 2's two bug lanes are time-boxed from the start.
8. Only one thing drives the Deck at a time. If another session is pressing buttons, stop and ask.
9. Do not start lanes just before the usage window resets.
10. Everything written to the maintainer, in chat or in this file, is in plain language.
11. **Never remove a copy of the repo with the git remove command, and never remove one you did not
    make.** Each copy's packages folder is a link straight into the main checkout's. The eight copies
    from plan 55 stay where they are.
12. A highlight or layout fix goes to a lane only when a device measurement has named its cause.
13. The roadmap is brought up to date after every landing and after every block of Deck checks, by the
    bookkeeper, from a list — never left for the end.
14. Nothing starts until the maintainer says "go".

## 8. Questions for you — answered 2026-09-15, locked as D105

| # | Question | Answer |
|---|---|---|
| 1 | **Session context folds into Show details.** Undecided shape; shares files with two lanes. Drop it, answer the four questions now, or draw the options? | **Draw the options at the end of this session.** No build. |
| 2 | **Reasoning display.** Build the three decided steps with the plain folded line, and leave the spoiler verdict and the character-voice line for later? | **Drop the whole feature from this session and put it in the mockup page too**, so the maintainer sees the live lines and both folded lines before anything is built. |
| 3 | **The Spy's reveal.** A hidden confession block at the end, a *Was that true?* button, or a line under Show details? | **A line under Show details.** Nothing in the answer itself. |
| 4 | **When the Spy lies, and the opening-as-someone-else trick.** | **The two heaviest accent levels only, like Pyro; the trick is deferred** and becomes its own roadmap entry, since it needs a character greeting that does not exist. |
| 5 | **What Clear means in the strip.** The whole session, or only what the model sees? | **Only what the model sees.** The chat stays on screen. § 1's last bullet says what that is. |
| 6 | **The wipe.** Three rows have waited since 5 September; it also removes the Deck's Ollama and its models. | **Yes, backup first, restore after.** Last of everything. |
| 7 | **Is another chat driving the Deck?** | **No, the Deck is this session's.** |
| 8 | **The dead space above the box.** About 56 pixels, not 61. | **Measure, and fix only if one cause is named.** |

## 9. Things to bring to your attention

- **Two of the nine are drawn, not built.** The reasoning display and the Session context fold go
  into one mockup page at the end of the session, at true size from the real stylesheet, so both can
  be judged by eye. Their roadmap entries say so and point here. Every call already locked for the
  reasoning display still stands; the mockup is the step the decision left to the maintainer's eye.
- **The Spy is already in the character picker**, with a smooth understated voice, since June. The
  roadmap's detail note says he is not there yet; that was wrong when written. The picker does not
  change; the work is the lying at the two heaviest levels and the Show details chip.
- **The Spy's reveal has one weak point, covered.** The reveal depends on the model writing a closing
  tag listing its lies, and models forget instructions. So the chip appears whenever the Spy was on at
  a lying level, whether or not the tag came back; when it did not, the chip says he did not confess.
  A person always finds out he was on, even if not always what he lied about.
- **The lighter Clear is smaller than the roadmap entry describes.** The roadmap entry (from the 12
  September decision) describes clearing the chat, the bar and the stored answer. The maintainer chose
  the lighter meaning tonight, so the chat and the bar's rows stay and the button forgets only what the
  plugin carries into the next question. The roadmap entry is reworded to match.
- **The "reclaimed height" entry promises more than a layout fix can deliver.** The chat already
  scrolls, so nothing caps a long reply; what a fix can buy is the dead space between the last bubble
  and the dock, about 56 pixels on the last measurement. The roadmap entry should say that once the
  measurement is in.
- **The wipe is the only destructive step**, pre-authorised, last of everything. After it the Deck's
  own Ollama and its models are gone; the restore brings back settings and chats only. If the settings
  point Ask at the Deck's own Ollama, Ask on the Deck does not work again until the maintainer runs
  the *Run AI on this Deck* setup, which downloads the model again. Block 0 reads which Ollama the
  settings point at, so the report can say this precisely.
- **The models hub entry may close without code.** If block 0 finds Steam already hops the press to the
  section chips or the Done button, the entry becomes accepted with the measurement as its evidence.
- **The point release from plan 55 is still unpublished**, and it is the maintainer's to run — the
  command is in plan 55's log. This session does not touch it.
- **Budget.** Five Sonnet lanes at once, cut early in a usage window. The expensive part is the Deck
  work, one agent at a time by necessity, on Fable by the maintainer's choice; already-written rows go
  to the lookup helper's list and are driven by script wherever they can be.

## 10. Progress log

Written as work lands.

- **2026-09-15 evening — plan written, eight questions answered and locked as D105, waiting for
  "go".** Two features dropped to a mockup page; the Spy's reveal and the lighter Clear decided; the
  wipe pre-authorised; the Deck confirmed free. Nothing built, nothing pressed, nothing deployed.
- **2026-09-16, early morning — go given, block 0 done, four lanes running.** The tree was clean at `0fbecb6`,
  but the copy-paste ratchet was already red on the untouched tip for three numbers plan 54 and 55 had
  raised and never written down; the maintainer authorised a re-record with a dated note (`bc2d756`). The
  Deck's settings and saved chats were backed up over SSH (`runs/plan56-backups/`), the Deck held awake for
  eight hours, and the tip deployed and proved by hash (bundle, back end, prompt file). The settings point
  Ask at the Deck's own Ollama, so the wipe at the end will take Ask down until *Run AI on this Deck* is run
  again. **The Deck is on its built-in screen now, not the external monitor,** and that changed every
  layout number: the panel is 454 pixels tall, not 696, and a person sees about 143 pixels of chat. The
  three measurements: the models hub edges already hop on their own (entry closed as accepted, no lane C);
  there is no dead space above the box on this screen, because even a two-turn chat overflows and scrolls
  under the dock, so the entry stays open as measured and no lane H is cut; and two typed letters throw the
  question box 209 pixels up the screen with 71 rows under it. Lane E is told to keep every plan 45 call but
  cap the card at what fits under the tab bar (about six rows here, eight on a monitor). Four lanes cut from
  the tip and started: A (Clear), B (Expert order and licences), E (settings card), G (checker, then Spy).
  Found on the way, each with its evidence file: choosing any entry in the Ask-mode menu leaves the ring on
  nothing (cause read from the code, a one-line fix handed to the bookkeeper); and the plan 55 "glossary
  loop" is really a restored-turn loop, reproduced on a plain Portal 2 reply, freed by collapsing the turn —
  a named cause for lane I. Plan 55's empty-box half of the Ask highlight row passed.

---

## Appendix A — files each lane owns (for the briefs, not for reading)

Confirmed against a code search on 2026-09-15; the brief re-checks each list against the tree it is cut
from. A lane that truly needs a file outside its list says so in its report rather than sprawling.

| Lane | Files |
|---|---|
| A | `src/components/SessionContextStrip.tsx`; one prop each in `src/components/MainTabChatTranscript.tsx`, `src/components/MainTab.tsx`, `src/features/plugin-shell/tabs/useMainTabPayload.tsx` and `src/index.tsx`; a new key in `src/features/plugin-shell/modalReturnFocusRegistry.ts`; `src/types/rpcMethods.ts`; `main.py` (one new method beside `forget_background_game_ai`, and one added call inside it); `py_modules/backend/services/kb_followup_memory.py`; `py_modules/backend/services/strategy_checklist_session_service.py` (read; a helper only if needed); and their tests |
| B | `src/data/pullModelCatalog.ts`; `src/components/PullModelsModal.tsx` (the stretch group's ordering only); `src/utils/pullModelRecommendations.ts`; `src/utils/mergePullModelCatalog.ts` and `src/utils/modelRoutingOrder.ts` if they classify a family; `py_modules/backend/services/model_policy.py`; `data/model_bakeoff/roster.json`; `src/utils/settingsContracts.test.ts` if the contract names a family; and their tests |
| C | `src/components/OllamaModelsHubModal.tsx`, `src/components/ModelPolicyTierPanel.tsx`, `src/components/ModelRoutingAdvancedPanel.tsx`, and their tests |
| E | `src/components/MainTabUnifiedAskBar.tsx`, `src/hooks/useMainTabAskBarFocus.ts`, `src/hooks/useSteamSettingsSearch.ts`, the Ask bar's style section under `src/styles/sections/`, and their tests |
| G | `py_modules/backend/services/ai_character_service.py`; `py_modules/backend/services/game_ai_request.py` (the finished-reply block only); `py_modules/backend/services/response_verify.py`; `py_modules/backend/services/transparency_service.py` (the snapshot fields and the chip manifest); a new small parser module beside `spoiler_risk_service.py` for the confession tag; `src/utils/inputTransparency.ts` and `src/utils/contextChipsFromSnapshot.ts` only if a new chip kind needs a colour; and their tests |
| H | `src/components/MainTab.tsx`, `src/hooks/useMainTabColumnFill.ts`, `src/styles/sections/section-6.ts` (the transcript and column rules only), and their tests |
| I | `src/components/MainTabUnifiedAskBar.tsx` (the Ask button and paperclip presses only), `src/utils/buildTurnHeaderElement.tsx`, `src/components/MainTabAskModeMenuPopover.tsx`, the glossary word stop wherever the lane finds it, and their tests |
| J | `py_modules/backend/services/game_ai_request.py` (the coverage check call), `py_modules/backend/services/kb_not_in_notes_notice.py`, `py_modules/backend/services/knowledge_base_service.py` (the coverage helper only), and their tests |

Files that belong to the session and to no lane: `src/utils/navFocusRegistry.ts`,
`src/utils/uiDocument.ts`, the roadmap, the testing documents, the changelog, this plan.

## Appendix B — the three block-0 measurements, as recipes

1. **Hub edges.** Ollama tab → Manage models. Policy section: walk to the first tier choice, read the
   highlight, press Up once, read again. Advanced section: walk to the last switch, read, press Down
   once, read. Save as `docs/test-evidence/plan56-M-hub-edges.json`. Outcome: either two named stops for
   lane C, or "Steam already hops it" and the entry closes as accepted.
2. **Dead space.** A chat with two turns, no game running. Read the rectangles of the scroll container,
   the Main column, the chat row, the transcript, the Session context bar, the dock, and each one's
   computed margins. Save as `docs/test-evidence/plan56-M-transcript-rects.json`. Outcome: the gap above
   the dock and the overflow, each with the element that owns it, or "no single cause".
3. **The jumping box, before.** Empty chat. Type `en` with the typing script; read the question box's
   rectangle before and after. Save as `docs/test-evidence/plan56-M-settings-jump-before.json`.

## Appendix C — the reasoning contract, kept for the session that builds it

Written before the feature was dropped from this session; kept so the build session does not have to
work it out again. Two lanes could build the two halves at once against these names.

**While the answer is pending** (the background status the screen polls): `reasoning_partial`, the
newest 600 characters of the thinking so far, or null before the first thinking chunk — the screen
shows its last three lines and the composed phrases fill the line until it is non-null;
`reasoning_seconds`, whole seconds since the first thinking chunk, or null.

**When the answer completes** (the ask result and the transparency snapshot): `reasoning_text`, the
whole thinking capped at 4,000 characters, empty when the model did not think; `reasoning_seconds`,
first thinking chunk to first answer chunk; `reasoning_tokens`, an estimate (characters divided by
four) because Ollama's count does not separate thinking from the answer — the chip says so.

**Saved with the chat:** the assistant turn carries `reasoning` as an object with `text`, `seconds`
and `tokens`, capped the same way; older turns read as no reasoning.

**Order rule:** a thinking chunk arriving after the first answer chunk is appended and the fold stays
folded. **Screen shape:** three lines at the answer's own size, newest at the bottom; the fold
*Show reasoning · 41 s* is a D-pad stop above the answer, A opens the muted block, A closes it, closed
by default; one chip in Show details; the one-time confirm's flag lives in the plugin's browser storage
like the safety disclaimer flag, so no settings plumbing. Nothing changes with thinking Off.
