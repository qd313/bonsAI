# Plan 93: the bug list and the Verify list as close to zero as they can get, with the rig busy the whole time

**Status:** LOCKED 2026-10-13 evening, written on Fable 5.1 in the shared checkout at `c7c85259` (the roadmap with the
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
   the fourth stop of the Reply style slider (Terse · Speed · Strategy · Expert), available whatever else is set.
   *The session owner's reading, to confirm:* the separate Terse switch goes; a saved "Terse on" maps to the Terse
   stop; on the Terse stop every answer, first turn and follow-up, is asked for three short lines and a menu; the
   three-lines rule is measured against the Deck's narrow panel, where three model lines wrap to nine or more
   (question 7b).
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
| Confirm pop-ups show extra buttons, not SteamOS style | ★★ ui | Every confirm box shows the action and Cancel only, laid out like "Delete chat?" (title, one line, Cancel first with the ring on it, the action beside it, B is Cancel) | Sonnet high; Opus reads the diff (the ring's return after each box). The lookup found why: Steam's own confirm box always adds its Cancel beside OK, so every "safe choice first" box ended with three (Keep cache / Clear / Cancel). Nine boxes have the shape: Clear cache, Clear all data, the shared download box ("Turn on internet downloads?" and "Download from the internet?"), Remove knowledge base, and five in the models box (try order, delete a model, install the picked ones, enable Tier 2, tick a model). One shared two-button box built from the delete-chat model, used by all nine; six test files that assert the old buttons rewritten; the test stand-in taught the new box | The rig opens each of the nine, counts two buttons, ring on Cancel, Right reaches the action, B closes with the ring back where it was |
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
| Tab sections: the ring goes wrong after sections are opened (Terse mode unreachable; the details line fires on press) | ★★★ focus tabs | M1: open every section on Ollama, Settings and Developer; walk Down and Up with focus and the ring's rect read after each press; the strip's text read after each landing and each A on Developer's "Tab to open". The lookup's strongest suspect for Terse mode: its switch has no registered stop of its own; it is reached by a plain focus call on the first focusable thing inside its row, and it is not in the tab's focus chain, while Settings and Developer hop to the innermost stop instead. For the details line: the code shows it on landing, and on "Tab to open" the strip's wording is the picked option's text, so it changes on a press by design; the trace settles which the maintainer saw | Opus high lane with the map: Terse mode registered like every other stop; the details line whatever the trace says |
| Open all is reached with Right, not Down; the floating button overlaps the tabs | ★★ focus tabs | M2: the button's rect against the tab bar's on the Deck's own screen; the last section line's Down (today it holds still by design, Right takes the button). The lookup: the button is drawn into the tabs box outside the scroll pane, so it is not a Steam neighbour of the last line | The same Opus high lane: the last line's Down takes the button and the button's place is moved clear of the bar, with the measurement in hand |
| Preset chips cannot always be reached near the end of an answer | ★★★ chips | M3: a prepared long answer; scroll to the end with the Show details line close; read what the slot shows and whether Up from the box reaches a chip after moving away; five rounds, the two slot flags logged each time. The lookup: the swap is plan 79's design (the slot shows the line while the answer's own line is out of the reading area, and the chips are hidden from a person but not from Steam); the "ring fails to reach the chips" half is not clear from the code, and the suspect is that the two flags Up consults are refreshed on a 300 ms tick, so Up can follow a stale answer | Opus high lane with the map (the details slot and the chip row); § 15 asks whether the swap itself stays |
| The screen flickers and jumps to the end when an answer finishes | ★★★ reply | M4: scroll position and a frame capture every 100 ms through the last three seconds of a streamed answer and two after. The lookup found the sequence: the final text lands and the rating row appears; next frame the bubble switches from its streaming layout to its finished layout; then the chat reload archives the turn, so the live bubble is unmounted and the archived one mounted (the same builder, a different parent); then three instant scroll passes (at the commit, 300 ms and 900 ms). Every scroll in the transcript is instant on purpose; the pane forces it | This is the Features entry "A long answer is cut into sections while it writes" (sections close as they fill, nothing changes at the finish, the view does not move), picked on the mock-up board 2026-10-10. Opus high lane after M4 and § 15's go, built as that feature; the "follow the end smoothly while it writes" half is a second, smaller lane after a frame-rate measurement, because smooth scrolling was made instant for the ring's sake (plan 64) and the frame rate is already measured tight (plan 69) |
| The ring can vanish on the Search tab after closing a game note when a new word arrives | ★ tabs | M5: reproduce five times; log focus after each close | Sonnet high lane with the likely cause the roadmap names |
| gemma4e2b-it-qat is labelled FOSS but can only be used with Tier 2 on | ★ ollama | M13: the model's exact tag on the Deck (`ollama list`, names only), the licence pill's text in the models box, and one Ask at Tier 1 with the log line naming the model used or refused. The code lookup says the label and the rule already agree: the catalog and the classifier both call `gemma4:e2b-it-qat` open source (Tier 1, since 2026-09-16); only spellings without the colon (`gemma4e2b-it-qat`, `gemma-4-e2b-it-qat`, a Hugging Face path) classify as open-weight. Two leftover "open-weight essentials" lists in the Python routing still name the Gemma 4 preset | If the tag on the Deck is one of the odd spellings: a Sonnet medium lane teaches the classifier those spellings. If the Ask at Tier 1 refuses the model: a Sonnet high lane on the routing lists. If neither reproduces: the entry records the reading and asks the maintainer what they saw |
| Going Up through an answer skips a paragraph that Down stops on | ★★ focus | M6: reproduce on a prepared answer; the paragraph's rect against the tall-section rule | A lane only if the reading says it is not the tall-section rule; else closed as designed, with the reading in the entry |
| Some settings text ignores Text size (Permissions and others), **and** Text size does not reach Steam's own controls: one cause | ★★ ui | Every word on every tab follows Small, Normal, Large, or the maintainer accepts that Steam-drawn words do not | M10: three sizes on every tab, a list of every piece of text that stayed the same size. The lookup scanned the code: every size the plugin draws already goes through the text-size helper (two allowed exceptions: the emoticon art and the LB/RB marks). What stays fixed is text Steam draws inside its own controls: section titles, switch labels and descriptions (all five on Permissions), the Developer buttons, the dropdowns on About | Sonnet high lane after M10 and § 15: pass those words to Steam's controls as the plugin's own scaled elements where the control accepts them (a label can be an element, not only a string), measured on the Deck; the plugin still never targets Steam's classes by name. If § 15 says accept, both entries close as ACCEPTED |

### One Deck reading, then a document fix

| Bug | What settles it |
|---|---|
| Two documents disagree about whether a Decky button passes D-pad moves on (★ focus) | M7: a page-side logger on one Decky Button's move handler, one press. The bookkeeper fixes whichever document is wrong. |
| The default text is not shown in the text area (★ ask) | M12: a screenshot of the empty question box in each Ask mode. The lookup found the cause: only Strategy mode has a hint ("Describe the level, boss, or puzzle you're stuck on"); Speed and Expert have none, on both drawing paths. The maintainer's call (§ 2a, call 9): Speed and Expert get the same treatment; a Sonnet medium lane (B14) writes a short hint per mode in Strategy's style, on both drawing paths, and lists the wording in its report. |
| Terse mode does not seem to shorten answers (★★ reply) | M11 first (five Speed questions with Terse on: model lines and screen lines counted). The lookup found the wiring sound: with Terse on, every Speed answer is asked for at most three lines and a menu; nothing counts or trims lines; plan 83 measured 26 of 30 answers within three lines. The maintainer was in Speed mode (§ 2a), so the likely reading is that three model lines wrap to nine or more on the Deck's 300-point-wide panel. **The maintainer's call:** Terse becomes the fourth stop of the Reply style slider (Terse · Speed · Strategy · Expert) and the switch goes. A Sonnet high lane (B13, batch 1 now): the slider's fourth stop, the saved switch mapped onto it, the prompt block applied on that stop for first turns and follow-ups, and a tighter cap measured against the panel (question 7b: a word cap, say 40 words, instead of "three lines"). |
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

The cap is fifteen at once (D128 call 16). **The ladder** when a helper's work is not good enough: Sonnet medium →
Sonnet high → Opus medium → Opus high, one step at a time, after a failed landing review or a Deck failure with a
measurement in hand; each step logged in § 14.

## 7. The lanes, in batches

| Batch | Lanes | Starts |
|---|---|---|
| 1 (at go, staggered three minutes apart) | B1 Run AI default (Sonnet medium) · B3 the starter set: gemma4:e2b-it-qat, the note-search model, the two speech models (Sonnet high) · B4 the nine confirm pop-ups (Sonnet high) · B6 note offer after reload (Sonnet medium) · B7 dead Ollama-tab handlers (Sonnet medium) · B8 delete last chat (Sonnet high) · B9 disclaimers and Permissions (Sonnet high; lands only after the maintainer's yes on the wording) · B10 greyed buttons: the stand-in and Cancel (Sonnet high) · B12 Refresh removed (Sonnet medium) · B13 Terse as the slider's fourth stop (Sonnet high) · B14 the question box hints (Sonnet medium) · R1 the rig's open-after-reload (Sonnet high, rig repo) · R2 the rig's snapshot (Sonnet high, rig repo) | at go tomorrow; B3 waits for M13's reading only if the Gemma tag on the Deck is not the catalog's |
| 2 (as block 1's measurements land) | O1 folded tabs' ring and Open all (Opus high, after M1 and M2) · O2 chips near the end (Opus high, after M3) · O3 the finish, built as the sections-close-as-they-fill feature (Opus high, after M4 and § 15's go) · B5 Text size on Steam-drawn words (Sonnet high, after M10 and § 15) · B11 Search tab ring (Sonnet high, after M5) · B2 gemma spelling or routing (Sonnet medium or high, after M13, if it reproduces) | measurement by measurement; the measurements run tonight, so batch 2 can start with batch 1 tomorrow where its reading is in |
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
7. **Terse mode.** **Answered 2026-10-13:** the maintainer was in Speed mode; Terse becomes the fourth stop of the
   Reply style slider and is available in every mode. **7b, still open:** the cap itself. "Three lines" of model text
   is nine or more lines on the Deck's narrow panel. A word cap instead (about 40 words, roughly three short
   sentences)? *Meanwhile:* the lane keeps "three lines" and adds "no sentence over 15 words", and M11 measures how
   many screen lines that makes.
8. **Disclaimers and the Permissions tab.** **Answered 2026-10-13:** yes, cut them, and the new wording is run by the
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
18. **The finish flicker is the Features entry "A long answer is cut into sections while it writes"** (picked on the
    mock-up board 2026-10-10: sections close as they fill, nothing changes at the finish, the view does not move).
    The code lookup confirms the flicker is the finished bubble replacing the live one and three instant scroll
    passes after it. Build that feature tonight as the fix (an Opus high lane after the measurement)? And the
    "follow the end smoothly while it writes" half: every scroll in the transcript is instant on purpose (the ring's
    sake, plan 64) and the frame rate is tight (plan 69), so it is a second small lane after a frame-rate measurement,
    or not tonight. *Meanwhile:* the feature is built as the fix; the smooth follow waits.
19. **The nine confirm boxes:** the lookup found nine with the three-button shape (Clear cache, Clear all data, the
    shared download box, Remove knowledge base, and five inside the models box: try order, delete a model, install the
    picked ones, enable Tier 2, tick a model). All nine go to action-plus-Cancel? *Meanwhile:* all nine.
20. **The chips turning into the Show details line near the end of an answer** is plan 79's design, which you picked
    (way 2, the cross-fade). The bug tonight is the ring failing to reach the chips after you move away; that is
    fixed. Does the swap itself stay? *Meanwhile:* it stays.
21. **The six feature requests from last night** (shaded sections, a very small text size, Decode as the default,
    smoother D-pad scrolling, the bigger catalog with simpler filters, the simpler first-time setup): apart from the
    two one-star ones in question 13, none is built tonight; they wait for a feature session. Confirm.
