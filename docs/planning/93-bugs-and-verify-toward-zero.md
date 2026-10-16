# Plan 93: the bug list and the Verify list as close to zero as they can get, with the rig busy the whole time

**Status:** RAN 2026-10-14 (the morning chat, 08:41 to about 14:00; every lane landed; see § 14 and the report https://claude.ai/artifact/WoD2cLeM75FG6TfmyisPv7). LOCKED 2026-10-13 evening, written on Fable 5.1 in the shared checkout at `c7c85259` (the roadmap with the
20 items the maintainer added on 2026-10-12 at 23:00). The maintainer's first round of calls is in § 2a and in
[D130](../audit/maintainer-decisions-locked.md#d130--partly-locked-2026-10-13-raised-2026-10-13--plan-93-the-bug-list-and-the-verify-list-toward-zero-the-first-calls);
the questions still open are marked in § 15. **Tonight (2026-10-13) the planning chat runs the Deck's preliminary
blocks** (block 0, block 1's measurements, then block 2's owed checks as the usage meter allows) and writes the
evidence into this plan and, through the bookkeeper, the roadmap. **Tomorrow morning (2026-10-14, after the weekly
meter resets at 09:00) a separate Opus 5.5 extra-high chat runs the lanes** (the maintainer's call, and the routing
table's rule for a bug session).

The standing way of running a night like this is [the bug-wave runbook](../agents/bug-wave-runbook.md). This page
says only what is different this time. The last two nights of the same shape are
[plan 89](89-bugs-to-zero-and-verify-sweep.md) (bugs) and [plan 92](92-feature-night-search-notes-models-tabs.md)
(features); § 2 lists what plan 92 taught and how this plan uses it.

**To start the session, paste this into a new Opus 5.5 extra-high chat on the `experimental` branch, after the
weekly usage meter has reset (§ 3):**

> Run plan 93. Read docs/planning/93-bugs-and-verify-toward-zero.md, then docs/agents/bug-wave-runbook.md and
> docs/lessons-learned.md (sections 1, 3 and 4). Confirm the weekly usage figure is under 20 percent, the Deck is
> free and awake, and the rig is armed, then go. Plain language in everything you write to me.

## 1. The short version

- The roadmap has **33 open bugs** (plus one open knowledge-base bug) and **17 entries waiting for a check** (15 in the
  roadmap's Verify list, 2 in the knowledge-base file). **14 of the bugs and 6 feature requests arrived last night**
  from the maintainer's own use of the Deck.
- **22 bugs get a helper, in 19 lanes** (two code lookups on 2026-10-13 found the cause of most of them, § 4): 13
  can start as soon as the maintainer's answers are in (the cause is known, or it is a wording or a default), 9
  wait for a Deck measurement first (focus, layout or streaming work, and the routing table says no lane without a
  measurement), and 2 are the test rig's own. Four pairs turned out to share one cause (Cancel and the greyed-button
  stand-in; the two Text size entries; the Open all button and the folded tabs' ring; the finish flicker and the
  already-picked "sections close as they fill" feature).
- **10 bugs need the maintainer's call, not a helper** (§ 4, "your call"): five are developer-only or one-off
  sightings that cannot be fixed tonight, two are design calls already on the checks page, two are accept-or-not
  calls, one is a search-quality change. The bug list cannot reach zero without those calls; the session will not
  move them itself. **2 more close on one Deck reading** (a document disagreement; the chats menu's grid).
- **Of the 17 Verify entries, the rig can add evidence to 4 tonight** (the two Settings and Developer walks on the
  Deck's own screen, the notes block with a game running, the knowledge library removed and put back). **11 need the
  maintainer** (a real voice four times, their eyes four times, a PIN, the right stick, a finger with a game
  running, a locked account). None of the plan 89 checks-page items has been marked yet.
- **The Deck never sits idle:** measurements for the five waiting bugs in the first hour, then every owed check the
  rig can reach, then one check per landed fix, then the sweeps.
- **The budget is the wall tonight.** At 20:35 on 2026-10-13 the weekly meter read 93 percent (resets 2026-10-14 at
  09:00) and the five-hour window 4 percent. Plan 92 measured six helpers at about 8 points of the week in under two
  hours, so a full night started now stops inside the first hour and then waits eight hours. § 3 says what to do.
- **Rough time: 10 to 14 hours** of running once the helpers can start, with a clean stopping point after the first
  landing batch and its Deck block (§ 13).

## 2. What plan 92 taught, and what this plan does about it

| What happened in plan 92 | What this plan does |
|---|---|
| Seven helpers each ran the full test sets at once and starved the PC (one run over an hour, free memory 1.4 GB of 32) | Every brief says: typecheck, build, focus check, the test files you touched by name, and the unused-exports count; **never the full sets**. One baseline on the shared checkout at go. Starts staggered three minutes apart. |
| The 20-minute scheduled check did not wake the chat after the usage pause; two and a half hours lost | Before any planned pause, the session leaves a background `sleep` running that ends when the pause should; its finishing wakes the chat. The schedule is kept as a second line, never the only one. |
| Two second-round fixes skipped the quick check and pushed the unused-exports count over its best | The unused-exports count is in every brief's gate list, and the landing script's quick check runs before every push. |
| A driver deployed while a landing was running (it worked, but by luck) | Drivers deploy only when the session says "deploy now"; the session says it only between landings. |
| A brief's rule and its Deck check disagreed, and the helper built the stricter one, leaving dead presses | Every brief is read back against its own pass sentence before it is sent. |
| The cheap Haiku helper ended its turn four times while its checks ran and committed nothing | Haiku only for jobs whose checks finish in a few minutes; otherwise Sonnet medium. |
| Finished helpers left test runs alive for hours (plan 89: 110 node processes) | After each helper reports, the session lists and ends leftover test runs before starting the next. |
| A driver printed the settings file's values once (the Steam Web API key) | Every runbook says: print key names only, never values. |
| Six helpers (two Opus high) cost 8 points of the week in under two hours | Usage read before every batch; nothing new past 80 percent of the week or 75 percent of the five-hour window (D128 call 18). § 3. |
| The monitor was live on the first night and every layout number was a monitor number | Block 0 reads which screen is live before any measurement; this plan's numbers are for the Deck's own screen (854 x 454 panel), which has been live since 2026-10-12. |
| The models box's sideways presses needed a full Deck map before the fix went right | Every focus bug here gets its measurement in block 1 before a lane is cut, and the lane gets the map. |

## 2a. The maintainer's calls (2026-10-13 evening, D130)

1. **When:** the preliminary Deck checks tonight, from the planning chat, before the usage meter runs out; the lanes
   tomorrow morning in a separate Opus 5.5 extra-high chat. **The plan is committed before any Deck press**, so a
   locked plan is on disk if the meter stops the chat.
2. **The starter model is gemma4:e2b-it-qat.** The starter set also installs the note-search model
   (nomic-embed-text) and the voice engine's two speech models (tiny.en and base.en), so a first install gets the
   answers, the note search and the microphone in one go.
3. **Refresh in the AI models screen is removed.**
4. **Terse mode:** the maintainer was in Speed mode when answers looked long. Terse stops being a switch and becomes
   the fourth stop of the Reply style slider on the Ollama tab, which today has three stops for how long an answer
   is (Caveman · Balanced · Detailed): it reads **Terse · Caveman · Balanced · Detailed**. Terse is not an Ask mode:
   it applies whichever Ask mode is picked (Speed, Strategy or Expert), where today it applied to Speed only.
   *Corrected by the maintainer 2026-10-13 after a first wrong reading that put Terse on the Speed / Strategy / Expert
   list.* The session owner's reading, still to confirm: the separate Terse switch goes; a saved "Terse on" maps to
   the Terse stop; the three-lines-and-a-menu rule is measured against the Deck's narrow panel, where three model
   lines wrap to nine or more (question 7b).
5. **The disclaimers and the Permissions tab are cut, and the new wording goes to the maintainer before it lands.**
   The lane writes the before-and-after into a page the maintainer can read from a phone; the landing waits for the
   maintainer's yes.
6. **Gemma and the open-source filter:** the maintainer believes the model is hidden when "Open source only" is
   picked. The Deck checks it tonight (block 1, M13) before anything is changed.
7. **The plan is committed and kept current** with every call and every piece of Deck evidence.
8. **Still open after this round:** the finish of an answer (question 18, the maintainer asked what "the finish"
   means; answered in chat: the moment the answer stops arriving), and every question in § 15 not marked answered.
9. **The question box's hint (2026-10-13, later the same evening):** Speed and Expert get the same grey hint
   treatment Strategy has. The lane writes one short hint per mode in Strategy's style and lists the wording in its
   report for the maintainer's veto.
10. **The finish of an answer (2026-10-13, later the same evening): go.** The flicker and jump when an answer
    finishes is fixed by building the Features entry "A long answer is cut into sections while it writes" (sections
    close as they fill, nothing is redrawn at the finish, the view does not move). An Opus high lane (O3) after the
    finish measurement (M4). The "follow the end smoothly while it writes" half stays separate and waits for a
    frame-rate measurement.
11. **Gemma and the open-source filter (2026-10-13, after block A):** the maintainer saw the model missing in **the
    model picker** (the list of installed models a person picks from), not in the Browse models catalog that block A
    measured. The morning chat measures the picker with the policy on "Open source only" before any lane (M13b, in
    block B2). And the maintainer wants **the "Deck essentials only" filter rethought**: a note on the Features entry
    "AI models screen: a much bigger catalog and far simpler filters", not built in this session.
12. **"Update AI & models" keeps working as it does:** it runs at once when Internet downloads is on and the site was
    accepted once; no box there. Lane B4 only reshapes the boxes that do show.
13. **Terse works in Speed (block B1 measured it), and the maintainer still wants it in Strategy and Expert.** The
    slider stop (call 4) does exactly that: on the Terse stop every Ask mode gets the short answer. The bug entry
    "Terse mode does not seem to shorten answers" closes on the measurement; the change is lane B13.
14. **A new position for this plan and every big session from now on: the advisor.** Fable 5.1 at high effort
    (extra-high only for a five- or six-star question or a Deck failure that has resisted two fixes), asked one
    bounded question at a time by the one running the session at fixed consult points, answering with one
    recommendation and the reason; read-only, never on the Deck, never starting helpers. The persona is
    [docs/agents/advisor.md](../agents/advisor.md); the Claude Code wrapper is `.claude/agents/advisor.md` (usable
    from the next new chat, which the morning chat is). On trial from this plan: every consult is logged in § 14
    with its cost and what it changed, so the maintainer can judge the position after a few sessions.

## 3. Before go: the budget, the model, the Deck

1. **The weekly usage meter.** Read at 20:35 on 2026-10-13: five-hour window 4 percent, week (all models) 93 percent,
   resetting 2026-10-14 at 09:00. The runbook's line is 80 percent of the week for starting a helper. **Three ways
   to go, the first recommended:**
   - **(a) Tonight only the Deck, tomorrow the helpers.** Tonight one Deck driver at a time runs block 0 (setup),
     block 1 (the measurements the five waiting bugs need) and block 2 (the owed checks). That is one Sonnet medium
     helper at a time, about one point of the week an hour. The Opus chat writes the briefs and cuts the copies
     tonight, then leaves a timed background job that ends at 09:00 and starts the helper waves when it wakes.
   - **(b) Everything tomorrow from 09:00.** Simplest; the Deck sits idle tonight.
   - **(c) Everything tonight, accept the stop.** Not recommended: about an hour of helper work, then an eight-hour
     wait with helpers dead mid-work.
2. **The model.** The maintainer picks Opus 5.5 extra-high in the menu before pressing Go; a chat cannot switch its own
   model. Helpers: Sonnet 5.5 medium by default (the maintainer's call for this plan), Sonnet high where § 4 says a
   judgment is needed, Opus high for the focus and layout lanes once their measurement is in.
3. **The Deck.** Awake at 20:35 (up 22 hours, 3.5 GB free, 11.7 GB available), on its own screen since 2026-10-12, no
   lease held, the rig armed, the bridge on COM7. The rig's own status read says "Deck not reachable" only because no
   tunnel is open; SSH answers. Two test chats from plan 92 (Hollow Knight, Half-Life 2) are still on it, 9 chats in
   all. The build on it is plan 92's last (`e6afe2bd` or later); block 0 reads it.
4. **The shared checkout** is clean at `c7c85259` and matches GitHub. The baseline (`python scripts/verify.py
   --quick`) runs once at go before any copy is cut.
5. **Phone notifications on, keep-awake held** on this PC (the desktop app does it) and on the Deck.
6. **The test rig's own repo** (`C:\Users\still\decky-plugin-studio`, on `main`, clean) holds two of the bugs. A fix
   there loads only in a new chat, so the rig bugs are fixed tonight and proven in the next session.

## 4. The bugs, and what happens to each

Stars and tags as in the roadmap. "Lane" means a helper in its own copy; "measure first" means the rig reads the
Deck before any lane is cut; "your call" means nothing happens until the maintainer answers § 15.

### Lanes that can start at go (cause known, or a wording, a default or a sweep)

| Bug | Stars | What a person notices | Helper | Deck check |
|---|---|---|---|---|
| "Run AI on this Deck" should be on by default | ★ ollama | A fresh install starts pointed at the Deck | Sonnet medium: the default is "off" in two matching tables (the Python settings service and the screen's normalizers) plus the shared contract file; flip all three. One wrinkle for § 15 (question 4b): the one-time "Local runtime (beta)" notice today shows only when the switch is flipped on, so a fresh install that starts on never sees it | The stand-in's wipe shows the fresh default; the contract tests |
| qwen2.5vl should not be downloaded first | ★ ollama | The first download is gemma4:e2b-it-qat, and the starter set also brings the note-search model and the two speech models (the maintainer's call, § 2a) | Sonnet high (three downloads of two kinds in one flow is a judgment; the speech models come through the voice engine's own download path, not Ollama). The tag is kept in about eight places (the screen's essentials tag, the Python pull tags and try-order seeds, the setup script, the size words "about 3–4 GiB"); the lane changes every copy and the parity test, and the starter set's wording names all three. qwen2.5vl leaves Tier 1 with it (its own licence is research-only; it sat there by a call never made) | The stand-in's wipe; the first-run screen names the three; "Install the starter set" in Browse models pulls gemma4:e2b-it-qat and nomic-embed-text and the voice models (checked on the Deck by removing and re-installing the speech models only; the Ollama models stay) |
| Confirm pop-ups show extra buttons, not SteamOS style | ★★ ui | Every confirm box shows the action and Cancel only, laid out like "Delete chat?" (title, one line, Cancel first with the ring on it, the action beside it, B is Cancel) | Sonnet high; Opus reads the diff (the ring's return after each box). The lookup found why: Steam's own confirm box always adds its Cancel beside OK, so every "safe choice first" box ended with three (Keep cache / Clear / Cancel). Nine boxes have the shape: Clear cache, Clear all data, the shared download box ("Turn on internet downloads?" and "Download from the internet?"), Remove knowledge base, and five in the models box (try order, delete a model, install the picked ones, enable Tier 2, tick a model). One shared two-button box built from the delete-chat model, used by all nine; six test files that assert the old buttons rewritten; the test stand-in taught the new box | The rig opens each of the nine, counts two buttons, ring on Cancel, Right reaches the action, B closes with the ring back where it was. **Measured 2026-10-13 (block A):** three of the three-button boxes read as the code says; "Update AI & models" showed no box with downloads on and the site already seen (question 22) |
| After deleting the last chat, Main shows the old answer | ★★ chat | The empty new-chat view, no "…" bubble | Sonnet high (saved chats). The lookup found the cause: deleting the last chat selects "no chat" but the back end keeps the last answer (only Clear cache drops it); closing the box makes Decky rebuild the screen, the start-up restore asks the back end for the last answer, and with no chat open it is painted, under a question blanked by the no-chat reload, drawn as "…". A code comment already names the gap. Fix both ends: the back end drops its stored answer when its chat is deleted, and the no-chat reload blanks the answer too. No test today deletes the last chat; the lane adds one | Back up the Deck's chats, delete every chat, read Main (the new-chat view, no bubble); put the chats back |
| Disclaimers and warnings are long; Permissions too wordy | ★★ ui | Every warning is at most two short sentences; the Permissions tab is noticeably shorter | Sonnet high; **the new wording goes to the maintainer before it lands** (§ 2a): the lane writes before-and-after into a page, the maintainer says yes from a phone, then it lands. The counts today: the Permissions intro 42 words, its five switch descriptions 80 words together, the lock banner 65; the first-run beta notice about 106 words; the local-runtime notice about 152; the Clear all data box 86; the download box 30. Target unless § 15 says otherwise: no block over 40 words, no switch description over 12 | The rig reads every block's word count and the Permissions tab's height before and after |
| Note offer shows again after a screen-only reload | ★ ask | The card does not come back | Sonnet medium | Tests; one rig reload try if the rig's reload is screen-only |
| Hand-written D-pad moves on Ollama-tab Decky Buttons never run | ★ focus | Nothing changes for a person; the checker catches the pattern | Sonnet medium; Opus reads the diff at landing (focus) | The Ollama tab's saved walk re-recorded unchanged |
| Tests treat a greyed button as unreachable; the Deck says reachable, **and** Cancel in the first download cannot take the ring (the same cause) | ★★ focus | Cancel takes the ring while Ollama installs or updates; a hidden bug class is closed | Sonnet high; Opus reads the diff (focus). The code lookup found the cause of the Cancel half: the Ollama tab's hand-wired ring helpers skip a greyed button by asking the button whether it is disabled, and on the Deck a greyed Decky button is not disabled, so Down from Update lands on greyed Browse, then greyed Test connection, and Cancel (drawn only while a setup runs) is skipped both ways. Fix: skip by the "setup busy" state, as the licence row already does; make the shared test stand-in refuse to lie (a greyed button takes focus), and fix every walk test that passed only because of the lie (the archive note lists the files) | Press "Update AI & models" on the Deck and walk Down to Cancel while it runs (reached, A stops the run); the Ollama walks already passing stay passing |
| Refresh in the AI models screen cannot take the ring and does nothing | ★★ focus ollama | Refresh is gone (the maintainer's call, § 2a) | Sonnet medium. The lookup explains "does nothing": the two back-end calls refuse unless Run AI on this Deck is on; with Internet downloads off the catalog call returns the saved list with an error the screen never reads; and the online add-on list is empty today, so even a good refresh adds nothing. "Cannot take the ring" depends on state: the button is greyed while the first load runs (up to 50 s if Ollama must start) and the ring hops skip it then; the 2026-10-12 walks show it taking the ring once loaded | The models box walk after the change (row P91-MODELS-COLUMN-WALK re-recorded) |
| The rig: opening the plugin fails on the first try after a reload | ★ QA | The rig's open tool works first time | Sonnet high in the rig's repo | Proven in the next session (the tool server cannot restart mid-chat) |
| The rig: the settings snapshot can save a damaged copy | ★ QA | A snapshot is whole or says it failed | Sonnet high in the rig's repo | Proven in the next session |

### Measure first, then a lane (focus, layout, streaming)

| Bug | Stars | Measurement (block 1) | Then |
|---|---|---|---|
| Tab sections: the ring goes wrong after sections are opened (Terse mode unreachable; the details line fires on press) | ★★★ focus tabs | M1: open every section on Ollama, Settings and Developer; walk Down and Up with focus and the ring's rect read after each press; the strip's text read after each landing and each A on Developer's "Tab to open". The lookup's strongest suspect for Terse mode: its switch has no registered stop of its own; it is reached by a plain focus call on the first focusable thing inside its row, and it is not in the tab's focus chain, while Settings and Developer hop to the innermost stop instead. For the details line: the code shows it on landing, and on "Tab to open" the strip's wording is the picked option's text, so it changes on a press by design; the trace settles which the maintainer saw | **Measured 2026-10-13 (block A):** Ollama (19 stops) and Settings (23 stops) walk clean both ways with every section open, Terse mode a stop both ways; the Terse half did not reproduce and waits for the maintainer's steps. **Developer's "Tab to open" help line describes the chosen option, not the one under the ring, until A:** confirmed, a Sonnet medium lane (B15: the help line follows the ring within a row of options). O1 keeps the Open all half. |
| Open all is reached with Right, not Down; the floating button overlaps the tabs | ★★ focus tabs | M2: the button's rect against the tab bar's on the Deck's own screen; the last section line's Down (today it holds still by design, Right takes the button). The lookup: the button is drawn into the tabs box outside the scroll pane, so it is not a Steam neighbour of the last line | **Measured 2026-10-13 (block A):** closed, the button overlaps nothing and is reached by Right only; **open and scrolled, the fixed button (74 x 28 px) covers 56 x 14 px of a row's summary text and 10 x 14 px of its chevron, and does not move with the scroll.** O1 (Opus high) with these numbers: the last line's Down takes the button, and the button sits where it covers no row (or the list keeps a clear band under it). |
| Preset chips cannot always be reached near the end of an answer | ★★★ chips | M3: a prepared long answer; scroll to the end with the Show details line close; read what the slot shows and whether Up from the box reaches a chip after moving away; five rounds, the two slot flags logged each time. The lookup: the swap is plan 79's design (the slot shows the line while the answer's own line is out of the reading area, and the chips are hidden from a person but not from Steam); the "ring fails to reach the chips" half is not clear from the code, and the suspect is that the two flags Up consults are refreshed on a 300 ms tick, so Up can follow a stale answer | **Measured 2026-10-13 (block B1): not reproduced with the D-pad** in six rounds (Up from the box always reached the slot's line; the page is at the end whenever the box has the ring, so the chip row is hidden by design). The maintainer's case needs their exact steps, most likely a right-stick or touch scroll the rig cannot do (question 24). No lane until it reproduces; the stale-flag suspect stays in the entry |
| The screen flickers and jumps to the end when an answer finishes | ★★★ reply | M4: scroll position and a frame capture every 100 ms through the last three seconds of a streamed answer and two after. The lookup found the sequence: the final text lands and the rating row appears; next frame the bubble switches from its streaming layout to its finished layout; then the chat reload archives the turn, so the live bubble is unmounted and the archived one mounted (the same builder, a different parent); then three instant scroll passes (at the commit, 300 ms and 900 ms). Every scroll in the transcript is instant on purpose; the pane forces it | **Measured 2026-10-13 (block B1): FAIL.** The page stayed at scroll position 0 for the whole 50-second stream (the answer 1,316 px tall in a 402 px box) and 0.26 s after the finish jumped to the end, 1,264.7 px in one step; the ring stayed on the question box. This is the Features entry "A long answer is cut into sections while it writes" (sections close as they fill, nothing changes at the finish, the view does not move), picked on the mock-up board 2026-10-10, and the maintainer's go (call 10). Opus high lane (O3) with these numbers, built as that feature; the "follow the end smoothly while it writes" half is a second, smaller lane after a frame-rate measurement, because smooth scrolling was made instant for the ring's sake (plan 64) and the frame rate is already measured tight (plan 69) |
| The ring can vanish on the Search tab after closing a game note when a new word arrives | ★ tabs | M5: reproduce five times; log focus after each close | Sonnet high lane with the likely cause the roadmap names |
| gemma4e2b-it-qat is labelled FOSS but can only be used with Tier 2 on | ★ ollama | M13: the model's exact tag on the Deck (`ollama list`, names only), the licence pill's text in the models box, and one Ask at Tier 1 with the log line naming the model used or refused. The code lookup says the label and the rule already agree: the catalog and the classifier both call `gemma4:e2b-it-qat` open source (Tier 1, since 2026-09-16); only spellings without the colon (`gemma4e2b-it-qat`, `gemma-4-e2b-it-qat`, a Hugging Face path) classify as open-weight. Two leftover "open-weight essentials" lists in the Python routing still name the Gemma 4 preset | **Measured 2026-10-13 (block A): the model is listed under "Open source only" in every filter state, with an open-source pill; the installed tag is the catalog's own.** Not reproduced in the catalog. **The maintainer (2026-10-13): it was the model picker, the list of installed models a person picks from.** M13b in the morning (block B2): with the policy set to "Open source only", open every place a model is picked (the Ollama tab's model row, the picker beside an answer if there is one, the try-order list) and read whether the Gemma tag is offered; put the policy back. A lane only if it reproduces. |
| Going Up through an answer skips a paragraph that Down stops on | ★★ focus | M6: reproduce on a prepared answer; the paragraph's rect against the tall-section rule | **Measured 2026-10-13 (block B1): FAIL, the other way round.** Going Down, section 5 (141 px, not tall) is skipped and the spoiler boxes inside sections 5 and 6 are visited before section 6; going Up every section is a stop, and a section comes before its spoiler box. **Lane O4 (Opus high) tomorrow** with the stop lists in the evidence; question 25 asks the maintainer which direction they saw |
| Some settings text ignores Text size (Permissions and others), **and** Text size does not reach Steam's own controls: one cause | ★★ ui | Every word on every tab follows Small, Normal, Large, or the maintainer accepts that Steam-drawn words do not | M10: three sizes on every tab, a list of every piece of text that stayed the same size. The lookup scanned the code: every size the plugin draws already goes through the text-size helper (two allowed exceptions: the emoticon art and the LB/RB marks). What stays fixed is text Steam draws inside its own controls: section titles, switch labels and descriptions (all five on Permissions), the Developer buttons, the dropdowns on About | Sonnet high lane after M10 and § 15: pass those words to Steam's controls as the plugin's own scaled elements where the control accepts them (a label can be an element, not only a string), measured on the Deck; the plugin still never targets Steam's classes by name. If § 15 says accept, both entries close as ACCEPTED |

### One Deck reading, then a document fix

| Bug | What settles it |
|---|---|
| Two documents disagree about whether a Decky button passes D-pad moves on (★ focus) | M7: a page-side logger on one Decky Button's move handler, one press. The bookkeeper fixes whichever document is wrong. |
| The default text is not shown in the text area (★ ask) | M12: a screenshot of the empty question box in each Ask mode. The lookup found the cause: only Strategy mode has a hint ("Describe the level, boss, or puzzle you're stuck on"); Speed and Expert have none, on both drawing paths. The maintainer's call (§ 2a, call 9): Speed and Expert get the same treatment; a Sonnet medium lane (B14) writes a short hint per mode in Strategy's style, on both drawing paths, and lists the wording in its report. |
| Terse mode does not seem to shorten answers (★★ reply) | M11 first (five Speed questions with Terse on: model lines and screen lines counted). The lookup found the wiring sound: with Terse on, every Speed answer is asked for at most three lines and a menu; nothing counts or trims lines; plan 83 measured 26 of 30 answers within three lines. The maintainer was in Speed mode (§ 2a), so the likely reading is that three model lines wrap to nine or more on the Deck's 300-point-wide panel. **The maintainer's call:** Terse becomes the first stop of the Reply style slider, the one that sets how long an answer is (Terse · Caveman · Balanced · Detailed), and the switch goes; it applies in every Ask mode, not Speed only. A Sonnet high lane (B13, batch 1 now): the slider's fourth stop, the saved switch mapped onto it, the prompt block applied on that stop in every Ask mode for first turns and follow-ups (the Strategy branch menus included), and a tighter cap measured against the panel (question 7b: a word cap, say 40 words, instead of "three lines"). |
| In the chats menu, Down skips Rename chat and Save to Desktop note (★ focus) | The code says the menu is a two-column grid: Down walks the left column, Right reaches the right one. Working as designed unless § 15 says otherwise. |

### Your call (nothing happens until § 15 is answered)

| Bug | Stars | The call |
|---|---|---|
| A reload with a game running can put Steam's Home screen in front of the game | ★ platform | Developer-only, not seen since 2026-10-03. Move to the Shelved list as watched, or leave in Bugs. |
| Reloading under a heavy game can leave Steam's interface gone until a restart | ★★ platform | The same. |
| The Deck's screen froze when Steam's screensaver started | ★★ platform | One sighting, Steam's own drawing failed. Shelve as watched, or leave. |
| Steam froze after an answer with a game running and the Deck's own AI | ★★★ platform | Not reproduced in two tries, the lever is in place. Shelve as watched, or leave. |
| The start of a sentence behind a spoiler cover can be read for about a second | ★ reply | Accept it (ACCEPTED), or build a hold on the sentence until it ends (costs visible delay). |
| Up from the answer bubble scrolls the answer instead of moving the ring | ★★ focus | Open since 11 October: keep "Up scrolls first", or make Up leave at once. |
| Text size does not reach Steam's own controls | ★ ui | Accept (the plugin never targets Steam's classes), or keep open. |
| The Steam Web API key is stored in plain text | ★ security | Keep the file as is and make a new key; or have a lane move the key into its own file readable only by the deck user. |
| A faded ghost of the tab bar after touching the screen | ★★ tabs | Needs a finger with a game running: yours (row P84-TABS-02). Stays until then. |
| Knowledge base: questions with no real answer still get notes about the wrong subject | ★★ KB | A search-quality change that costs right answers elsewhere; not a night fix. Leave open, or shelve. |

### The two rig bugs not worth a lane tonight

The rig reading every folded section line as 92 percent visible (★ QA) is low priority and the rig's own; it gets a
lane only if the two rig lanes above finish early.

## 5. Verify: who closes each entry

| Entry | Who | How |
|---|---|---|
| Parental-lock half of the stale return note | maintainer | needs the PIN |
| The help chip after the quick start (the Deck half) | maintainer's call (§ 15) | the stand-in passed and the tests pass; the Deck is never wiped by a session |
| Left or Right on Text size scrolls the page (own-screen look) | rig tonight, then the maintainer's call | P89-TAB-WALK re-run on the Deck's own screen; if it passes, § 15 says whether that closes it or their look is still wanted |
| Walking Settings and Developer: the page moves, then jumps (own-screen look) | the same | the same run |
| The tab bar's icons are hard to see | maintainer | their eye |
| A spoken question comes out doubled | maintainer | real microphone |
| After Stop, the next mic press does not work | maintainer | real voice |
| Voice replies "when I asked by voice" | maintainer | real voice |
| The mic stops after 3 or 4 seconds | maintainer | real voice |
| Chips look (rows 01 and 05, help and agent chips, the pace pick) | maintainer | eyes |
| Scramble look and the frame-rate verdict | maintainer | eyes |
| Frame rate: the look, and a run in a real fight | maintainer's call (§ 15) | three rig tries never got a live fight; close on the menu numbers, or a timed run while the maintainer plays |
| Calmer rating choices: the look | maintainer | eyes |
| The Show details slot, steps 3 and 4 | maintainer | the right stick, which the rig does not have |
| Kids master lock | maintainer | a locked account |
| KB: hidden spoiler box on name-first questions (STRAT-SPOIL-NAME-01) | maintainer | start one of the four games once so it shows on Recent Games |
| KB: the note's own words under the reply (NOTES-BLOCK-04 game half; 07; LADDER) | rig tonight for 04 (two differently worded questions with a game running, prepared); 07 is a listener; LADDER is a call (§ 15) | a reply with nothing attached while a game runs must show the "No close match" line and no block |

Also owed from plan 92 and run tonight: the knowledge library removed through the plugin's own Remove button and
installed again from the seed, with the Search tab checked both ways (P90-SEARCH-KB); the 24 Steam settings pages
opened from the Search tab (P90-SEARCH-SETTINGS). The maintainer's: Y with Steam's keyboard open; the icons' look.

Every fix that lands tonight gets its own check (§ 4's last column) and, for a Main-tab change, the free-play sweep
with and without a game.

## 6. Who does what: models, effort, how many at once

| Work | Model and effort | At once |
|---|---|---|
| Running the session: briefs, reviews, landing, the Deck runbooks, reading failures, the reports | Opus 5.5 extra-high, a new chat | 1 |
| Mechanical fixes (a default, a label, a sweep, a pop-up's buttons, a document) | Sonnet 5.5 medium (`bugfix-lane-sonnet-medium`) | up to 8 |
| Fixes that need a judgment (saved chats, wording, the stand-in, Cancel and Refresh, Terse, the Search tab ring, the rig's two) | Sonnet 5.5 high (`bugfix-lane`) | up to 6 |
| Focus and layout with a measurement in hand (the folded tabs and Open all; the chips near the end; the finish flicker if it is the whole transcript) | Opus 5.5 high (`bugfix-lane-opus-high`) | up to 2 |
| Reading jobs (the owed-checks list, evidence summaries, label searches) | Haiku 5.5 high only when the job's checks finish in minutes; else Sonnet medium | as needed |
| Bookkeeping: roadmap, testing rows, changelog, this plan's log | the bookkeeper, Sonnet 5.5 medium, in its own copy, landed like a helper; every status names its evidence | 1 |
| Deck checks | the `deck-driver`, Sonnet 5.5 medium, a fresh one per block; runbooks written by the Opus chat | 1 on the Deck |
| **The advisor** (new, call 14): one bounded question at each consult point, one recommendation back | Fable 5.1 high (`advisor`); extra-high only for a Deck failure that resisted two fixes | 1, at most about six consults in the session |

**The advisor's consult points for this plan:** (1) before go, the lane table and the batch 1 briefs read for
contradictions; (2) after any Deck failure on a second try, before a fix moves up a tier; (3) before landing O1, O3
and O4 (the focus and streaming lanes), the diff against the block A and B1 measurements; (4) any question the
maintainer's calls do not cover where the safe choice is not obvious; (5) before the morning report, the claims
against the evidence files; (6) when two helpers' work clashes, which lands and which is re-cut; (7) when the
usage budget forces a choice, what to finish, what to stop and what to leave (the maintainer made 6 and 7 mandatory
on 2026-10-13). Each consult: the question, the exact files or evidence, a cap of about 100,000 tokens of
reading; the answer logged in § 14.

The cap is fifteen at once (D128 call 16). **The ladder** when a helper's work is not good enough: Sonnet medium →
Sonnet high → Opus medium → Opus high, one step at a time, after a failed landing review or a Deck failure with a
measurement in hand; each step logged in § 14.

## 7. The lanes, in batches

| Batch | Lanes | Starts |
|---|---|---|
| 1 (at go, staggered three minutes apart) | B1 Run AI default (Sonnet medium) · B3 the starter set: gemma4:e2b-it-qat, the note-search model, the two speech models (Sonnet high) · B4 the nine confirm pop-ups (Sonnet high) · B6 note offer after reload (Sonnet medium) · B7 dead Ollama-tab handlers (Sonnet medium) · B8 delete last chat (Sonnet high) · B9 disclaimers and Permissions (Sonnet high; lands only after the maintainer's yes on the wording) · B10 greyed buttons: the stand-in and Cancel (Sonnet high) · B12 Refresh removed (Sonnet medium) · B13 Terse as the slider's fourth stop (Sonnet high) · B14 the question box hints (Sonnet medium) · B15 the Developer help line follows the ring within a row of options (Sonnet medium) · R1 the rig's open-after-reload (Sonnet high, rig repo) · R2 the rig's snapshot (Sonnet high, rig repo) | at go tomorrow; B3 waits for M13's reading only if the Gemma tag on the Deck is not the catalog's |
| 2 (as block 1's measurements land) | O1 folded tabs' ring and Open all (Opus high, after M1 and M2) · O2 chips near the end (only if the maintainer's steps reproduce it, question 24) · O4 Down skips a section that Up stops on, and the section-versus-spoiler order (Opus high, measured in block B1) · O3 the finish, built as the sections-close-as-they-fill feature (Opus high, after M4 and § 15's go) · B5 Text size on Steam-drawn words (Sonnet high, after M10 and § 15) · B11 Search tab ring (Sonnet high, after M5) · B2 gemma spelling or routing (Sonnet medium or high, after M13, if it reproduces) | measurement by measurement; the measurements run tonight, so batch 2 can start with batch 1 tomorrow where its reading is in |
| 3 (second rounds) | fixes from Deck failures, one step up the ladder each | after block 3 |

Optional, if § 15 says yes and the budget holds: the two one-star features from last night (tab sections slightly
shaded with bold titles; a very small Text size choice), Sonnet medium, batch 1.

**One owner per shared file per round:** the pop-up files and the shared box to B4 (the models box's five boxes
included, so B12 waits for B4 to land before touching the models box); the chat-slot and transcript files to B8; the
Permissions tab's text constants and the notices' wording to B9 (words only, never sizes); the test stand-in and the
Ollama tab's hand-wired ring helpers to B10; the Ollama tab's dead handlers to B7 (a different file set from B10;
the two briefs name their files so they do not meet); the folded-tab files and the Ollama tab's focus chain to O1;
the details slot and chip row to O2; the transcript's streaming files to O3; the Search tab to B11; the Steam-drawn
label wrappers to B5 after B9 lands; the prompt files to B13. A lane that needs a file outside its list stops and
says so.

## 8. The Deck, in blocks

**The runbooks and handovers are in the repo** so the morning chat can use them without this chat's scratch folder:
[block A](assets/93-runbook-block-A.md) (run 2026-10-13, its [handover](assets/93-handover-A.md)),
[block B1](assets/93-runbook-block-B1.md) (run 2026-10-13), [block B2](assets/93-runbook-block-B2.md) (the Search
tab ring, Text size on Steam-drawn words, the Gemma model in the model picker: **first thing in the morning**),
[block C](assets/93-runbook-block-C.md) (the owed checks, two parts: **after B2, while batch 1 builds**). The paths
inside them that point at a scratch folder mean "the handover beside this file" for the morning chat. **The morning
chat's first three jobs, before any lane:** the bookkeeper's sweep of block A's and B1's findings into the roadmap
(this chat could not edit the roadmap by rule, and the week's meter ran out before a bookkeeper run); block B2; then
the lanes, with block C running beside them.

Standing rules as in the runbook: one driver at a time, a fresh driver per block, every Deck command exactly
`ssh deck@192.168.86.52 '<command>'`, evidence files `plan93-<ROW>.json` in `docs/test-evidence/`, every file stamped
with the build and the machine, the settings file read by key name only. If a deploy is refused: "run setup-dev".
**The Deck's AI is unloaded before any game check. Drivers deploy only when the session says so, never while a landing
runs.**

- **Block 0, setup (about 30 minutes):** confirm no other chat drives the Deck; keep it awake; read which screen is
  live (the numbers here are for its own screen); back up the settings file and the saved chats to `~/p93-backup`;
  note the build on the Deck, deploy the tip and note its hash; record how Ollama runs and that no model is loaded;
  the test chat; parental lock off; test chips clear; which games are on Recent Games.
- **Block 1, the measurements (about 90 minutes), in this order:** M1 the folded tabs' ring (Ollama, Settings,
  Developer, every section open; Terse mode; the Developer details line on landing or on A) · M2 the Open all
  button's rect and neighbours · M3 the chips near the end of a prepared long answer · M4 the finish of a streamed
  answer (scroll position and frames at 100 ms) · M5 the Search tab's ring after a game note closes · M6 Up through
  an answer's last paragraph · M7 one Decky Button's move handler · M9 every confirm pop-up opened once (buttons
  counted, "before" pictures) · M10 Text size on every tab at three sizes (which words stay the same size; "before")
  · M11 five Speed questions with Terse on (lines counted; the Deck's AI or the PC's) · M12 the empty question box
  (what shows) · M13 the Gemma model's tag on the Deck, its licence pill, and one Ask at Tier 1 with the log line
  naming the model.
- **Block 2, the owed checks (about 90 minutes):** P89-TAB-WALK on the Deck's own screen (Settings and Developer,
  Down to the end and back; Text size Left and Right); NOTES-BLOCK-04's game half with two prepared questions;
  P90-SEARCH-KB (the library removed through the plugin and installed again from the seed); P90-SEARCH-SETTINGS (the
  24 pages from the Search tab); the free-play sweep without a game as the "before" picture.
- **Block 3, after batch 1 lands (one deploy):** one check per fix (§ 4's last column): the pop-ups, the text-size
  sweep, the deleted last chat (chats moved aside with a backup), the warnings' lengths and the Permissions height,
  the Ollama walk unchanged, the greyed-button walks unchanged, the models box after Refresh's change, a small
  model pull with Cancel. **This is the clean stopping point** (§ 13).
- **Block 4, after batch 2 lands (one deploy):** the folded tabs' walk with sections open (Terse mode reached, the
  details line on landing), Open all by Down and clear of the tabs, the chips near the end (five rounds), the
  finish of a streamed answer (no flicker, no jump), the Search tab ring (five rounds), Terse mode (ten questions),
  the default text.
- **Block 5, the game checks:** the Deck's AI unloaded; start a game through the rig's launcher; the free-play sweep
  with a game; the finish of a streamed answer with a game; close the game over SSH.
- **Block 6, second rounds and sweeps:** fixes from failures; the saved walks re-recorded on the final build; the
  smoke test.
- **Block 7, the end:** put back every setting from the backup and the maintainer's chats; the normal build; clear
  pinned test chips; close any game; release the keep-awake. The handover note says where everything stands.

## 9. The stand-in (this PC)

Only for what the Deck cannot show: **the wipe** (Clear all plugin data) proves the fresh-install defaults ("Run AI on
this Deck" on, the starter model named on the first-run screen, the help chip still reachable). Steam offline and
Big Picture in front first; presses land about ten seconds late; a stand-in pass is never a Deck pass. If a press
lands in the wrong window, stop the stand-in and carry on with the Deck alone.

## 10. Prepared setups

- **A long answer** with a section taller than the screen and its own Show details line near the end, from the
  stand-in AI (plan 81's way, rebuilt in the scratch folder, never committed), for M3, M4, M6 and the chips check.
- **Two wrong-subject questions** with a game running, for NOTES-BLOCK-04's game half (a question about buying a
  house in the running game, and one naming a boss that does not exist in it).
- **Ten Speed questions** for the Terse check, the same ten as plan 83's run.
- **The Deck's chats backed up** before the delete-last-chat check, and put back after.
- **A small model** (the smallest the catalog offers) for the Cancel check, removed again afterwards.

## 11. New bugs, and the roadmap

A bug found during the night goes to the roadmap (the bookkeeper, with the evidence file) and the report, and gets
one helper round of about an hour (Sonnet high; Sonnet medium if it is a wording or a number). Not fixed within the
hour: it stays on the roadmap with what was learned, and the report says so. Nothing is quietly dropped, and nothing
is marked fixed or verified without its evidence file.

The roadmap is current after every landing and every Deck pass: a fixed bug moves to Verify at landing naming its
check; to Done on its Deck pass naming its evidence; a failure goes back to Bugs with what was seen; the testing
documents change in the same commit. The session spot-checks every bookkeeper commit against the evidence.

## 12. Paperwork, the report, and running unattended

- **Testing rows:** every check in § 4 and § 8 gets a row in `docs/testing.md` with its pass sentence at its lane's
  landing; new controls get a block in the focus-graph checklist in `docs/testing-manual.md`.
- **The changelog** gets a plain line per fix under the next version's heading; no version bump.
- **This plan's log (§ 14)** gets a few lines after every landing batch and every block, committed and pushed, so a
  look from a phone shows where things stand.
- **Pushing:** after each landing batch that passes the quick check, `git pull` first if GitHub moved, then the push
  with the guard's variable set. Never `main`, never a force push, never during a landing.
- **A question for the maintainer** goes in § 15 with the safest choice taken meanwhile. A phone notification after
  every landing batch, one when truly blocked, one for the morning report.
- **A planned pause** (the usage limit, the weekly reset) leaves a background timed job running so its end wakes the
  chat; the 20-minute schedule is the second line.
- **In the morning:** the published report leading with what only the maintainer can do, then what was fixed and
  proven, what failed and why, what was found, and what is left; the checks page rewritten to exactly what is
  theirs; the roadmap audited (Bugs, Features and Verify against Done); the quick check green; the final push.

## 13. The time, and the clean stopping point

| Part | About |
|---|---|
| The Opus chat reads this plan, cuts the copies, writes the briefs and the first two runbooks | 1 hour |
| Blocks 0, 1 and 2 (can run tonight under way (a) of § 3) | 3.5 hours |
| Batch 1 helpers (12), in parallel with block 1 and 2 | 1.5 to 2 hours, then about 1.5 hours to land twelve one at a time |
| Block 3 | 1 hour |
| Batch 2 helpers (7), started as measurements and § 15's answers land | 2 to 3 hours, then 45 minutes to land |
| Blocks 4 and 5 | 2 to 2.5 hours |
| Block 6 and 7, paperwork, the report | 1.5 hours |
| **Whole session** | **10 to 14 hours** |

**The clean stopping point** is after block 3: batch 1 landed, checked and pushed, the roadmap current, no helper
mid-work. What can stretch it: the five-hour window, the folded-tabs lane needing a second Deck round (it is the
hardest focus piece), and the finish-flicker lane if the measurement sends it to Opus.

## 14. Progress log

- **2026-10-13 20:35 to 21:25 (Fable 5.1, the shared checkout):** planned against `c7c85259`; the Deck awake on its
  own screen, the rig armed, the week at 93 percent (resets 2026-10-14 09:00), the five-hour window at 4. Two
  read-only code lookups (Sonnet) found the cause of most of the 14 new bugs; their findings are in § 4. The quick
  check passes at the tip with this file in place. Nothing built, nothing pressed.
- **21:50:** the maintainer's first round of calls in (§ 2a, D130); the plan locked and committed before any Deck
  press, at the maintainer's ask. Usage at 21:45: five-hour window 17, week 94. Deck block A (setup, the Gemma filter,
  the question box hints, the folded tabs' ring, the Open all button, the confirm boxes) starts next, one Sonnet
  medium driver; block B (the long-answer measurements) after it; block C (the owed checks) only if the week is
  under 98.
- **21:12 to 21:30 Deck time, block A done** (build on the Deck matches the tip, the Deck's own screen 854 x 454,
  keep-awake to 05:12 local, backup `~/p93-backup`). Evidence `docs/test-evidence/plan93-P93-SETUP.json`,
  `-M13-GEMMA-FILTER.json`, `-M12-ASK-HINTS-try2.json`, `-M1-FOLDED-RING-{OLLAMA,DEVELOPER,SETTINGS}.json`,
  `-M2-OPEN-ALL.json`, `-M9-CONFIRM-BOXES.json`, with screenshots. **What it found:**
  - **The Gemma model is listed under "Open source only"** in all four filter states (4 rows with the essentials tick,
    17 without, 25 under Tier 2 without, 4 with), with an open-source pill. The maintainer's "hidden under open
    source" did not reproduce (§ 4, M13: no lane; the maintainer is asked what screen they saw it on). A side
    reading: with "Deck essentials only" ticked, the licence pick changes nothing, and qwen2.5vl:3b sits among the
    four with a "Qwen Research" pill under "Open source only", which may be what looked wrong.
  - **The question box's hint:** Strategy shows "Describe the level, boss, or puzzle you're stuck on."; Speed and
    Expert show nothing. Confirmed; lane B14 as called.
  - **The folded tabs' ring:** Ollama with every section open walks 19 stops down and the same 19 up, no dead press,
    no loop, and **Terse mode is a stop both ways**; Settings with all ten sections open, 23 stops each way, clean.
    The "Terse mode could not take the ring" half did not reproduce in these walks; it stays open as not reproduced,
    waiting for the maintainer's exact steps. **Developer's "Tab to open" is a row of three buttons (Main, Resume,
    5 min); the help line under it always describes the chosen option, and the option under the ring only after A.**
    That is the "appears on a press" the maintainer saw: a real, small bug (the line should follow the ring within
    the row); a Sonnet medium lane tomorrow (B15). Both walks saved for replay.
  - **The Open all button:** with every section closed it is reached by Right only, Down holds still, and it overlaps
    nothing. **With sections open and the pane scrolled, the fixed button (74 x 28 px at 265,418) covers 56 x 14 px
    of the "Keep models loaded…" summary on the Connection tuning line and 10 x 14 px of its chevron.** The button
    does not move with the scroll. Measurement in hand for lane O1.
  - **The confirm boxes:** Clear cache (Keep cache / Clear / Cancel), Clear all plugin data (Keep my data / Clear all
    data / Cancel) and Remove knowledge base (Not now / Remove / Cancel) show three buttons with the ring on the safe
    one; Delete chat shows Cancel and Delete on one row with the ring on Cancel. **"Update AI & models" showed no box
    at all with downloads on and the site already seen: the update ran at once** (about 20 s, nothing changed). The
    code's own header says the box should always show; a finding for lane B4 to settle (box always, or never once
    the site is seen: the maintainer's call, question 22).
  - **The test chat from plan 92 is gone:** only one chat is on the Deck ("How do I balance FPS and battery?", the
    maintainer's). Block B1 makes a new test chat. Also: the rig again read every section line as 92 percent visible
    (the rig's own known false alarm).
  Usage after block A: five-hour window 28, week 96. **Block B1 is the last block tonight**; B2 (the Search tab ring,
  Text size on Steam-drawn words) and block C (the owed checks) go to tomorrow's chat, first thing, before the lanes.
- **21:35 to 22:05 Deck time, block B1 done** (the Deck's own screen, the Deck's own AI, no deploy, no game; a new
  test chat made, named "What is the fastest way to earn geo early in Hollow Knight", 6 turns; the maintainer's one
  chat untouched; keep-awake to 05:32 local). Evidence `docs/test-evidence/plan93-M11-TERSE-LINES.json`,
  `-M4-ANSWER-FINISH.json` (+ `-samples.jsonl`), `-M3-CHIPS-NEAR-END.json`, `-M6-UP-SKIPS-PARAGRAPH.json`.
  **What it found:**
  - **Terse answers are already one line of text:** five Speed questions with Terse on, every answer one model line
    with no line break, 17 to 36 words (36, 23, 23, 23, 17), four of five with a two-choice menu under them. On the
    Deck's panel that is 3 or 4 screen lines of words (41 or 54 px at 13.5 px a line) in a bubble 75 or 88 px tall.
    So the length rule works in Speed; what the maintainer sees is the wrapped lines plus the menu and the buttons.
    The slider call stands; question 7b asks what length they expect (a 25-word cap would mean two screen lines).
  - **The finish, measured: FAIL.** Through the whole 50-second stream the page sat at scroll position 0 and never
    followed the growing answer (434 words, 7 sections, 1,316 px tall in a 402 px box); the rating buttons appeared
    at 49.67 s, the live bubble was gone at 49.80 s, and 0.26 s later the page jumped from 0 to 1,264.7 px, the end
    of the list, in one step. The ring stayed on the question box throughout. Both halves of the maintainer's bug are
    in the numbers: no following while it writes, one jump at the end. Lane O3 has its measurement.
  - **The chips near the end: not reproduced with the D-pad.** In six rounds Up from the question box always landed
    on the slot's "Show details" line (never on nothing, never on a chip), because whenever the box has the ring the
    page is already at the end, where the chip row is hidden by design. With the ring on the answer's own line the
    slot swaps to chips, and Down from there goes to the slot's line. The maintainer's case (chips showing, page
    mid-answer, then the ring failing to reach them) needs their exact steps, most likely a right-stick or touch
    scroll, which the rig cannot do (question 24). O2 waits for that; no lane on a guess.
  - **The skipped paragraph is real, and the other way round:** going Down, section 5 of the answer (141 px tall, so
    not a tall section) is skipped (Down goes section 4, the spoiler box inside section 5, the spoiler box inside
    section 6, section 6); going Up it is a stop. The two directions also visit a section and its spoiler box in
    opposite orders. A focus bug with its measurement: **lane O4 (Opus high) tomorrow**; question 25 asks the
    maintainer which direction they saw.
  - A note, not a bug: Right from the mode chip passes Voice input and Clear before Ask, so Clear is one press from
    Ask. B on the question box sends the ring to the tab bar; it does not close the panel.
  The Deck as left: plugin open on Main in the test chat, Speed, Terse on, the Deck's AI loaded (11.6 GB free), no
  game; the settings changed (the Ask mode, the Terse switch) put back and confirmed in the file.
- **2026-10-14 08:41 to 09:40 (the morning chat, Opus 5.5 extra-high, the shared checkout):** the week read 97 percent
  until its reset at 09:00, then 0 (the five-hour window 2). The full baseline passed at `6c616276` (all sets, 239 s).
  The bookkeeper's sweep of blocks A and B1 landed (`76c0125d`: eleven entries noted, the Terse bug closed to Done
  on its measurement). **Block B2 done** (driver on the Deck 09:00 to 09:15; keep-awake to 17:00 local):
  - **The Gemma model in the model picker: PASS.** The only picker is the AI models screen; with "Open source only"
    the Gemma tag is offered (try order 1), and so is qwen2.5vl. The maintainer's sighting did not reproduce in the
    catalog or the picker: **no lane (B2 dropped)**; the maintainer is asked how they saw it. Evidence
    `plan93-M13b-GEMMA-PICKER.json`.
  - **The Search tab ring: PASS on 48 of 48 readings**, but the rig cannot press a word within half a second of B, so
    the suspected race was not tried. The code holds a fallback to a plain focus Steam's ring does not follow: a
    small defensive lane (B11, Sonnet high), proven by its test. Evidence `plan93-M5-SEARCH-RING.json`.
  - **Text size: every fixed word is Steam-drawn** (switch labels and descriptions, Steam buttons, About's titles and
    dropdown); Permissions is the worst tab (11 fixed, 2 scaled). Lane B5 waits for question 12a. Evidence
    `plan93-M10-TEXT-SIZE-STEAM-WORDS.json` and 21 raw files.
  **Lane changes:** a file lookup found B7 (dead handlers) and B10 (greyed buttons) edit the same Ollama-tab
  buttons, so **B7 is folded into B10** (one Sonnet high helper, in order). B9 leaves the two confirm boxes' words
  until B4 lands. B12 waits for B4. Copies cut for every lane at `6c616276`; the rig's two bugs (lane R) started at
  09:14 in a separate copy of the rig's repo (its running tool server is not rebuilt mid-session). Block C part 1
  (the walks on the Deck's own screen, the 24 settings pages, the free-play sweep) started at 09:35. Advisor consult 1
  (the briefs read for contradictions) running.
- **09:40 to 10:25:** **Advisor consult 1** (Fable high, about 30,000 tokens read): nine contradictions in the briefs,
  all fixed before go (the B1 rule for a missing key; O3 and O4 sharing walk tests; B3's pass naming B9's words; the
  Ollama tab walk changed by B10, B13 and O1, now landing in that order; B8 and O3 in one function, B8 lands first; B6
  screen side only; B13's pass matching its rule; B10's new checker rule baselining Refresh; three small ones). **Lanes
  started** 09:52 to 10:02, staggered: O3, O4, O1 (Opus high); B4, B10, B8, B3, B13, B9 (Sonnet high); B1, B14, B15,
  B6 (Sonnet medium); B11 (Sonnet high). **Block C part 1 done** (evidence `plan93-P89-TAB-WALK-OWN-SCREEN-SETTINGS.json`,
  `-DEVELOPER.json`, `plan93-P90-SEARCH-SETTINGS.json`, `plan93-QA-FREE-PLAY-01-before.json` and its picture): the
  Settings and Developer walks on the Deck's own screen move at most 138 px a press (limit 227), no jump, no creep,
  Text size's Left/Right 0 px (the 92 percent section lines are the rig's known false alarm); only 3 of the 24 Steam
  settings pages could be reached without typing (all 3 open their own page); **a new bug in the free-play sweep:**
  Up from "Mark reply helpful" puts the ring on the answer's last section with its last line under the dock (box
  240-349, dock top 330), given to lane O4 as a second job. **O4 landed** (`9f6eb165`, Down now stops on every
  section Up stops on; advisor consult 3, about 22,000 tokens: land as it is). **Block C part 2:** C4 PASS (the
  knowledge library removed through the plugin and put back by its own Download button, same version 2026.09.26;
  evidence `plan93-P90-SEARCH-KB.json`).
- **About 09:40 local the PC restarted for a Windows update** and stopped every helper, a landing and the Deck
  driver. Nothing was lost (each copy kept its edits; the Deck had no game running). All were resumed by message.
  **Then the PC ran out of memory** (about 190 test processes, 23 GB, 3 GB free): each helper's quick check runs every
  test that imports a changed file, hundreds of files for a central one, on every core. The six oldest runs were
  ended and every helper moved to a lighter gate (its own tests with two workers, the typecheck, the build, the cheap
  checks); the quick check and the full sets run once at landing. Free memory back to 14 GB. A lesson for the
  runbook. **B14 landed** (`b460dbc9`, hints in Speed and Expert; its full test run failed twice under that load, both
  files pass alone; the gates are re-run on a quiet PC). Done and waiting to land: B15, B6. **B9's proposal published
  for the maintainer** (all blocks under 40 words; it waits for their yes). **The maintainer's answers (10:10):**
  Text size yes (lane B5 started); the Gemma gap was another filter; the chips miss was D-pad only, maybe after
  Open all or Close all; the performance overlay is theirs and stays.
- **10:25 to 11:35: every lane of batch 1 and 2 landed** (one at a time, the five gates and the quick check after
  each, all green in the end). In landing order: B15 Developer help line (`f60ce2b5`), B6 note offer (`0e619d7c`), B11
  Search tab ring (`49ba8afa`), B8 delete last chat (`1601ccc5`, `e344932b`), O4's second job, the last section clear
  of the dock (`29bd921c`), B5 Text size on Steam-drawn words (`95e1b33c`), B1 Run AI on this Deck on by default
  (`5397a614`, `33a50b8e`, and a one-word test fix by the session, `336861ad`: the read-back test's "changed" value had
  to become off), B4 the nine two-button confirm boxes (`714adcbb` to `e8bb1c1a`), B10 greyed buttons, Cancel and the
  dead handlers (to `e41330e5`), B13 Terse as the Reply style slider's first stop (`9c12ccce`, a hand-resolved clash
  with B5 in one test file, to `a21ad0e1`), O1 Open all by Down and a strip so it covers no row (to `e43978aa`), B11's
  stray timer (`18218632`), O3 the answer cut into sections while it writes, no redraw and no jump at the finish (to
  `e550ca42`), B12 Refresh removed (`9679d7d7`), the bookkeeper's second sweep (`ce45abc1`) with the Deck evidence
  (`68139788`), A1 the greyed paperclip skipped while an answer is written (`52521a85`), B9 the shorter warnings with
  the maintainer's two edits (to `076a709e`), K1 the knowledge switch off after a remove (`a917f2fe`), B3 the starter
  set plus the maintainer's two follow-ups (qwen2.5:3b out of Tier 1; the try order starts with the starter).
  **Advisor consults 3** for O4 (land), O1 (land; read the panel colour first: D0 read it, #0E141B, the strip's own
  colour) and O3 (land; judge on the Deck re-run of the finish), about 22,000, 35,000 and 50,000 tokens. **Block D0**
  (readings, no deploy): the panel is one solid #0E141B; the ring does land on the greyed paperclip while an answer is
  written (twice), which became lane A1. **New lanes from today's findings:** A1 (the paperclip, found by B10's truthful
  stand-in, measured in D0), K1 (the knowledge switch stayed on after a remove, found by block C part 2; the cause was
  the box closing rebuilding the tab before the delete finished), B11's timer. **The maintainer (11:00 to 11:30):**
  ignore the 75 percent five-hour rule for now; the warnings approved with two edits (the Steam ban lookup line keeps
  its old words; "grounding" replaced in the Remove knowledge base box); fix the second Qwen model and the try order
  (done in B3). Two Windows file locks stopped a landing's commit hook (generated files); continuing the pick fixed
  both, as in plan 87.
- **11:30 to 13:10: three Deck blocks on the landed build, and second rounds.** The push to GitHub was refused by the
  session's no-push hook (the maintainer pushes, or says "push"). **Block D1** (build `0ef34f82`): the finish of a long
  answer moved the page **0 px** (last night 1,264.7 px) with the bubble kept and the ring unmoved; the answer walk is a
  mirror inside the answer, section 5 a stop going Down; the last section clear of the dock; the hints; delete the last
  chat (chats restored byte for byte); the paperclip skipped while writing: all pass. Found: a ring on a follow-up chip
  at the finish still saw a 215 px jump; Down from an opened older answer skipped the rows below it; the answer's
  sections could not be reached while it wrote; raw "**" in a spoiler heading; small height dips while writing.
  **Block D2**: the Terse slider, Open all (the strip exactly the panel's #0E141B), Refresh removed, the Developer help
  line, Text size on Steam's words (every size right, Normal unchanged) and the shorter words (Permissions 507 px against
  688) pass; Cancel during a setup passes. Found: the Search tab's Down from the game chips dead (caused by lane B11's
  first fix: a ref cleared the search box's Steam node on every redraw); the Remove-a-model box returned the ring to the
  next row; the ring vanished when Cancel ended a setup; the knowledge switch still read on after a remove (file off);
  "Update knowledge base" clipped at Large; "(D15)" shown on the Developer tab. **Block D3** (build `8ff99a0a`): Down from
  an older answer to the rows below, the spoiler-heading cut, "Open source only" (neither 3B Qwen offered; gemma first in
  both try orders), the starter set on the Deck (speech models downloaded, gemma and nomic skipped) and sections reachable
  while writing (a ring on a section stays through the finish) pass; the notes line in Strategy with a game passes for
  the made-up boss and fails for "buy a house" (a real Gold note attached: the known wrong-subject notes bug); the sweep
  with a game has no loop and no dead press. Found: with the ring on a chip the page still jumped 324 px at the finish
  (cause found in round 3: the "follow the end" switch was still on in the finishing frame); the starter set re-ran the
  Ollama installer (its PATH lacks ~/.local/bin); the starter button lingers until the screen reopens. **Second rounds
  landed** (all green): O4 older-answer Down (`25fa1e5c`), O3 the chip kept at the finish and the spoiler cut
  (`abb3c329`, `32c6cc79`), O4 sections reachable while writing (`cca413bb`), B15 "(D15)" removed, B11 the Search tab
  Down restored, B10 the ring to Update after Cancel, B5 the label wraps at Large, K1 the switch corrected in the saved
  session copy too, B4 the Remove box returns the ring to its row, O3 the follow switched off when the answer ends
  (to `5537e84c`). A docs test went red after the third sweep (the guide no longer said "Qwen Research"); fixed by the
  session (`73e35a6d`). The rig's two fixes are on the rig's `main` (fast-forward), its build waits for the last Deck
  block. Block D4 (the second rounds on the Deck) started 13:10. The stand-in wipe check waits for the maintainer to set
  Steam offline with Big Picture in front.
- **13:10 to 13:50: block D4 and the last rounds.** Block D4 (build `5537e84c`) passed all seven checks: the finish
  with the ring on a follow-up chip stayed at 0 px for 17 s (the build before jumped 324 px; round 3 found the "follow
  the end" switch still on in the finishing frame); the Search tab's Down from the chips is back and the ring held a stop
  at 10 of 10 readings; after Cancel the ring lands on Update; Remove a model returns the ring to its row; the knowledge
  switch reads off after a remove; "Update knowledge base" whole at Large; no "(D15)". Found and given one short round
  each, both landed: the switch stayed off after a re-download until a refresh (`d5aa65a5`), and "Remove" split
  mid-word at Large (`96a77da5`). The starter set's installer re-run and lingering button were fixed and landed
  (`511a61fb`, `08f67393`). The bookkeeper's fourth sweep (`1c01d5c9`) closed twelve entries on the Deck evidence. The
  maintainer set the stand-in's Steam offline at about 13:30; block S1 (the wipe and the fresh defaults) ran on the
  stand-in. **The advisor on trial (§ 2a call 14):** consult 1 before go (about 30,000 tokens; nine contradictions,
  all fixed: the most useful consult of the day), consult 3 before the O4, O1 and O3 landings (about 22,000, 35,000 and
  50,000 tokens; each said land; the O1 one named the panel-colour reading that D0 then took). No consult was needed at
  points 6 and 7 (no clash beyond what the file map caught; the maintainer lifted the five-hour rule at 11:00). Usage at
  13:45: week 19 percent, five-hour window 54. Block S1 on the stand-in passed all three (Run AI on after a wipe, both notices once, the starter-set box, the help
  chip, open source only; a new small bug: cancelling the downloads box reads as "Failed"). Owed for the next session: the Deck re-checks of the four last fixes (the starter-set
  installer and button, the switch after a download, "Remove" at Large); the four model-screen boxes the rig could not
  open; the push (the maintainer's); the rig's rebuild (done by the session at the end, its proof in the next session).

## 15. Questions for the maintainer (the safest choice taken meanwhile)

1. **When to start** (§ 3). **Answered 2026-10-13:** the Deck tonight, the helpers tomorrow morning in a separate
   chat, the plan committed first.
2. **The model:** a new Opus 5.5 extra-high chat runs this (pick it in the menu before Go). *Meanwhile:* so.
3. **The default text in the question box.** **Answered 2026-10-13:** Speed and Expert get the same grey hint
   treatment Strategy has ("Describe the level, boss, or puzzle you're stuck on"); the lane writes a short hint per
   mode in that style and lists the wording for the maintainer's veto. M12 photographs the box in each mode tonight.
4. **The starter model.** **Answered 2026-10-13:** gemma4:e2b-it-qat, and the starter set also installs the
   note-search model and the voice engine's tiny.en and base.en.
   **4b.** With "Run AI on this Deck" on by default, the one-time "Local runtime (beta)" notice (today shown only when
   the switch is flipped on) would never appear on a fresh install. Show it on the first open instead, or drop it?
   *Meanwhile:* shown on the first open.
5. **gemma4e2b-it-qat and Tier 2.** **Answered 2026-10-13:** the maintainer believes the model is hidden from the
   list when "Open source only" is picked, and may be wrong; the Deck checks it tonight (M13).
6. **Refresh in the AI models screen.** **Answered 2026-10-13:** removed.
7. **Terse mode.** **Answered 2026-10-13, corrected the same evening, confirmed after block B1:** Terse works in
   Speed (one model line, 17 to 36 words); the maintainer still wants it in Strategy and Expert, which the slider
   stop gives (Terse · Caveman · Balanced · Detailed, applying in every Ask mode). The bug entry closes on the
   measurement; lane B13 builds the stop. **7b, still open:** the cap itself. "Three lines" of model text
   is nine or more lines on the Deck's narrow panel. A word cap instead (about 40 words, roughly three short
   sentences)? *Meanwhile:* the lane keeps "three lines" and adds "no sentence over 15 words", and M11 measures how
   many screen lines that makes.
8. **Disclaimers and the Permissions tab.** **Answered 2026-10-13; the wording approved 2026-10-14 with two edits (the ban lookup line kept; no "grounding"):** yes, cut them, and the new wording is run by the
   maintainer before it lands. The targets stand unless the maintainer says otherwise: no block over 40 words, no
   switch description over 12.
9. **The chats menu's Down** skipping Rename chat and Save to Desktop note: it is a two-column grid by design (Down
   walks the left column, Right reaches the right one). Keep it (closed as designed), or make Down visit every
   action? *Meanwhile:* kept.
10. **Up from the answer bubble** (open since 11 October): keep "Up scrolls first" or leave at once? *Meanwhile:* kept.
11. **The five platform and reply bugs that cannot be fixed tonight** (two reload bugs, the screensaver freeze, the
    freeze after an answer, the sentence readable for a second): move them to the Shelved list as watched, accept
    them, or leave them in Bugs? *Meanwhile:* left in Bugs; the list cannot reach zero with them there.
12. **Two accept-or-not calls.** (a) **Text size:** your new "some settings text ignores Text size" and the older
    "Text size does not reach Steam's own controls" are one bug: every word the plugin draws already scales; what
    stays fixed is text Steam draws inside its own controls (section titles, switch labels and their descriptions,
    the Developer buttons, the About dropdowns). Three ways: accept it and close both; pass those words to Steam's
    controls as the plugin's own scaled pieces where the control allows it (recommended, a measured lane, no Steam
    class names targeted); or style Steam's own classes by name (not recommended, they change without notice).
    (b) **The Steam Web API key** in plain text: keep the file as is and make a new key, or move the key into its own
    file readable only by the deck user? *Meanwhile:* (a) the measurement runs, no lane; (b) unchanged.
    **(a) answered 2026-10-14: yes, pass the words as the plugin's own scaled pieces** (lane B5, Sonnet high).
13. **The two one-star features from last night** (shaded sections with bold titles; a very small Text size choice):
    include them tonight? And for Decode as the default animation you said you would give the stock settings; give
    them if you want it tonight. One more cheap one from the code lookup: the models list shows only 3 of its 26
    models because "Deck essentials only" starts ticked; untick it by default tonight, or leave that for the catalog
    feature? *Meanwhile:* none included.
14. **Verify closings that need your word:** (a) the help chip after the quick start: close on the stand-in pass and
    the tests? (b) the two Settings and Developer walk entries: if the rig's run on the Deck's own screen passes
    tonight, may they close, or do you still want your own look? (c) the frame rate in a real fight: close on the
    menu numbers, or name a time you will play a fight while the rig records? (d) NOTES-BLOCK-LADDER: retire it?
    *Meanwhile:* none closes.
15. **Your own checks:** 11 of the 17 Verify entries need your voice, eyes, PIN or finger, and none of the plan 89
    checks-page items is marked. Will you do them this week? The session rewrites the checks page to exactly what is
    left. *Meanwhile:* they stay in Verify.
16. **The Deck's chats:** the two plan 92 test chats stay (9 chats)? And the chats may be moved aside, with a backup,
    for the delete-last-chat check? *Meanwhile:* kept; moved aside with a backup and put back.
17. **Pushing** to `experimental` after each landing batch, as in plan 92? *Meanwhile:* yes.
18. **The finish flicker.** **Answered 2026-10-13: go.** The Features entry "A long answer is cut into sections while
    it writes" is built as the fix (an Opus high lane after the finish measurement). The "follow the end smoothly
    while it writes" half waits for a frame-rate measurement.
19. **The nine confirm boxes:** the lookup found nine with the three-button shape (Clear cache, Clear all data, the
    shared download box, Remove knowledge base, and five inside the models box: try order, delete a model, install the
    picked ones, enable Tier 2, tick a model). All nine go to action-plus-Cancel? *Meanwhile:* all nine.
20. **The chips turning into the Show details line near the end of an answer** is plan 79's design, which you picked
    (way 2, the cross-fade). The bug tonight is the ring failing to reach the chips after you move away; that is
    fixed. Does the swap itself stay? *Meanwhile:* it stays.
24. **The chips near the end of an answer:** the rig could not make the ring miss the chips with the D-pad (block
    B1). How did you reach that state: a right-stick scroll, a touch scroll, or D-pad only? Which chat, how long an
    answer? *Meanwhile:* no lane. **Answered 2026-10-14:** the D-pad only; the maintainer does not know what caused
    it and may have used a tab's Open all or Close all button before walking. A Deck try with that route goes in a
    later block; still no lane until it reproduces.
25. **The skipped paragraph:** on the Deck it is Down that skips a section and Up that stops on it, the reverse of
    your report. Did you see it going Up, or both? *Meanwhile:* the lane fixes both directions to visit the same
    stops in the same order.
22. **The download box.** **Answered 2026-10-13:** keep "Update AI & models" as it works; no box once the site is
    known. Lane B4 only reshapes the boxes that do show.
23. **The Gemma model under "Open source only".** **Answered 2026-10-13:** it was the model picker (the installed
    models a person picks from), not the catalog. Measured first thing tomorrow (M13b); a lane only if it reproduces.
    The maintainer also wants the "Deck essentials only" filter rethought (a note on the catalog feature).
    **2026-10-14:** block B2 found it offered in the picker too; the maintainer thinks another filter hid it, maybe
    "Deck essentials only". So the bug closes as not reproduced, and the filter question belongs to the catalog feature.
26. **Steam's performance overlay** was showing on the Deck. **Answered 2026-10-14:** the maintainer turned it on; it
    stays (it puts the frame rate in every Deck picture).
21. **The six feature requests from last night** (shaded sections, a very small text size, Decode as the default,
    smoother D-pad scrolling, the bigger catalog with simpler filters, the simpler first-time setup): apart from the
    two one-star ones in question 13, none is built tonight; they wait for a feature session. Confirm.

### The report's nine questions, answered 2026-10-16

The report page asked nine questions of its own. The maintainer's answers:

1. **The small shrink while an answer writes:** fix it. A helper changes how the letter scramble draws a paragraph
   gap; the Deck measures that the 6 to 27 px shrinks are gone.
2. **The voice engine after the starter set:** add it. "Install the starter set" also builds the voice engine
   program, so the microphone works with no trip to Settings.
3. **Terse length:** a 40-word cap replaces "three lines".
4. **The five crash-type bugs** (two reload bugs, the screensaver freeze, the freeze after an answer, the sentence
   readable for a second): move them to the Shelved list as watched.
5. **The Settings and Developer walk entries:** close, on the rig's run on the Deck's own screen (largest move 138 px
   of 227).
6. **The chats menu's two-column grid:** keep it; the bug closes as designed.
7. **Up from the answer bubble:** the maintainer did not follow the question; it is explained again in plain words.
   *Meanwhile:* kept.
8. **The Steam Web API key:** the maintainer wants the Steam ban lookup deprecated (the only thing the key is for).
   Removing the feature also removes the stored key, which closes the plain-text bug. The scope is confirmed before
   a helper builds it.
9. **"(QA)" and "(dev QA)" on Developer labels:** the maintainer asked "as opposed to what?"; the choices are put
   again in plain words. *Meanwhile:* left.

**Follow-up answers, 2026-10-16:** 7, Up from the answer bubble: keep it as it is (the bug closes as designed). 8, the ban lookup: hide it for now, not remove it; the stored key is cleared. 9, the "(QA)" labels: remove the tag (done the same day: "Knowledge base", "Force session RAG chips", "Frozen test chips").
