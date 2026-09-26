# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Fixed
- **A chat no longer sums itself up again right after a stopped question:** a stopped answer is
  skipped when the chat's memory is built, but was still counted as "left behind," which is read as
  the chat having outgrown its room — so the very next question summed the whole chat up again just
  to fold in that one stopped exchange. This showed up as the "chat summed up" message appearing far
  more often than it should. It should now happen only every five or six questions in a long chat.
  `chat_memory_service.py`. On-Deck check owed.
- **A saved answer with a doubled hidden-spoiler marker could leak its hidden text into later
  questions:** if an answer's hidden block had its opening or closing marker written twice, the code
  that strips hidden text out before the AI reads the chat stopped at the second marker and let the
  rest through — on screen the block still looked normal and closed, but the hidden words reached
  every later question's memory and any summary since 2026-09-21. Doubled markers are now handled
  correctly; why an answer ends up with doubled markers in the first place is still unknown.
  `chat_memory_service.py`. On-Deck check owed.
- **The ban-lookup permission message now names the switch the way the Permissions tab does:** with
  Steam ban lookup turned off, asking for a ban check used to say "Enable Permissions -> Steam Web
  API" — a name that switch has never had on screen; it reads "Steam ban lookup." The message now
  says the right name. `vac_check_commands.py`. On-Deck row owed: this build has not been deployed
  yet.
- **The Ask warm-up now actually saves time, instead of quietly saving none:** with "Warm the Ask
  model at boot" on, the model was loaded ahead of time at the server's own default room (4,096
  tokens) rather than the room the first real question actually asks for (16,384) — so the server
  quietly reloaded it anyway the moment a question arrived, and cold and warm starts both took about
  the same 9.8 seconds to first words. The warm-up now asks for the same room Ask will ask for.
  Measured on the Deck: a warm answer's first words now arrive 2.3 seconds sooner than a cold one
  (7.72s against 10.05s), with no second load of the model. `ollama_service.py`. On-Deck row
  **PRELOAD-01** in `docs/roadmap.md` — passed.
- **Removing a model now takes it out of the saved try order too:** removing an installed model
  through its row used to leave it sitting in the saved order that picks which model answers a
  question, so Ask's first choice could keep pointing at a model no longer on the Deck. Removing a
  model now drops it from both saved orders (text and vision) at the same time. `main.py`. Confirmed
  on the Deck 2026-09-23: removing a model through its row left the saved order without it.
- **Pressing Down right after asking a question used to do nothing until the answer arrived:** the
  D-pad ring lands on the question box the moment you press Ask, and Down there was deliberately
  swallowed while the Ask button sits greyed out — but the Stop button is live in that same window, and
  is what a person actually wants to reach. Down now goes to Stop instead of sitting dead. Right worked
  the whole time and is unaffected. `useMainTabAskBarFocus.ts`. On-Deck row owed:
  **ASKBAR-DOWN-TO-STOP-01** in `docs/roadmap.md`.
- **Closing the AI models screen no longer strands the ring on Steam's own side rail:** this only
  happened when the screen was opened from the Ollama tab's "Manage AI models…" button — closing it
  landed the D-pad ring outside the plugin entirely, on Steam's own Quick Access rail, so the next press
  did not reach the plugin's tabs. The screen's other opener already remembered where to send the ring
  back; this button now does too. `modalReturnFocusRegistry.ts`, `OllamaTab.tsx`. Confirmed on the Deck
  2026-09-23, both closing the screen with B and closing it by walking Down to Done: the ring lands back
  on "Manage AI models…" every time. On-Deck row **MODELS-HUB-RETURN-01** in `docs/roadmap.md` — passed.
- **The AI models list can now use the room its own popup already gives it, instead of stopping
  early:** the list capped itself at a fixed share of the screen no matter how much room was free
  above it, which is why the same plugin showed about five rows on an external monitor and about
  three on the Deck's own screen — not a difference in the list, a difference in screen. It now
  fills the space its popup already has. `gamepadAndPullModels.ts`. Measured on the Deck 2026-09-23:
  with the long list showing, about seven rows now fit, but Done and Cancel were pushed below the
  visible edge — fixed the same night, see "Done and Cancel stay on screen" below. On-Deck row
  **MODELS-LIST-CAP-01** in `docs/roadmap.md` — re-check running on the corrected cap.
- **A shared troubleshooting tip's source page can now reach the credit line under a reply:** the list of
  notes a reply was built on names each shared tip under "Shared troubleshooting — <tip>", but the code
  reading that list back looked every tip up under an empty name instead, so the two never matched and a
  tip's own source page and licence could never show. Both sides now use the same name. Nothing changes on
  screen today, since none of the 159 shared tips has a source page yet — this closes the bug before one
  does. `game_ai_request.py`, `knowledge_base_service.py`.
- **Walking an answer with the D-pad while it is still being written no longer loses the highlight:** while
  an answer streams in, the view follows the newest text; a D-pad step near the end used to not count as
  moving away, so the view kept following and carried the highlighted control off the screen with it — on
  the Deck, six of eight stops on one walk ended up highlighted but out of sight. The view now holds still
  while the highlight is anywhere inside the reply, and starts following again once it moves to the question
  box, Ask or Stop. `useStreamScrollPin.ts`. On-Deck row owed: the streaming half of the free-play walk, plan
  64 flow B.
- **AI models screen: Down from the last model now reaches Done:** Down from the last row in the list used
  to go nowhere, even with Done fully visible on screen below it — the last row was looking for a footer
  button that only exists once something is queued, so the press found nothing and was lost. The last row
  now hands Down back to Steam, the way every other Decky dialog already works. `PullModelsModal.tsx`.
  Confirmed on the Deck 2026-09-23: Down from the last row reaches Done, or "Pull selected" once a model is
  ticked.
- **Both ways of starting Ollama now keep the same two models loaded:** bonsAI can start the Deck's own
  Ollama through the start-with-the-Deck service, or directly from the plugin; the service kept two models
  loaded side by side, but starting it directly only kept one, so a question could quietly swap a model out
  and back in depending only on how Ollama happened to start — measured at about 700 ms against 24 ms for the
  same question. Both paths now use the same number. `local_ollama_setup_service.py`,
  `ollama_local_autostart_service.py`.
- **AI models screen: Done and Cancel stay on screen with the long model list:** with every model showing
  (Essentials only off, 25 rows), the screen grew taller than Steam's own space for it, and Done and Cancel
  sat 46 pixels below the visible edge. Measured on the Deck 2026-09-23: the dialog's title, padding and
  button row need 156 pixels together, so the scrolling list can be at most 272 pixels tall on the Deck's own
  screen, not the 384 it was allowed. Done and Cancel are now always visible; the list shows about four
  models at once on the Deck's own screen instead of about seven with the buttons cut off.
  `OllamaModelsHubModal.tsx`. On-Deck row **MODELS-LIST-CAP-01** in `docs/roadmap.md` — re-check running.
- **A chat's own name now sits centred on its row, and the game it belongs to shows only while the
  D-pad ring is on that row:** the chat's name used to sit off-centre because the small × that
  deletes the chat was being centred along with it; the × now sits fixed at the right-hand edge
  instead. Measured on the Deck: this cures about 14 pixels of the 24-pixel offset that was there.
  The remaining ~10 pixels has a separate cause — the small game-chat previews either side are
  different widths, which pushes the name by an amount that changes with their names — and is not
  fixed yet. `ChatSlotRow.tsx`, `section-6.ts`. On-Deck row owed: **CHAT-SLOTS-V3-14c** in
  `docs/roadmap.md`.
- **The download picker's Expert (large) group now offers the strongest Deck models first, and the
  open-source list catches up to September's models:** the five models that beat the plugin's default on the
  bake-off now lead that group in that order — Gemma 4 12B, Qwen 3.5 9B, Granite 4.2 8B, Gemma 4 E4B, LFM
  2.5 — instead of being sorted by release date. Gemma 4 and Granite now count as open source under the
  default open-source-only setting, and LFM as open-weight, where before the plugin did not recognise them
  and would not offer them at that setting. `model_policy.py`, `pullModelCatalog.ts`. On-Deck row owed:
  **EXPERT-ORDER-01** in `docs/testing.md`.
- **The Expert (large) group in the download picker can be shown again:** found while landing the reorder
  above — with Essentials only switched off, the group still stayed hidden, and it had been impossible to
  show at all since a June change. `PullModelsModal.tsx`. On-Deck row owed: **PULL-EXPERT-VISIBLE-01** in
  `docs/testing.md`.
- **Typing into the question box no longer pushes it, the chips and the chat up the screen, and the whole
  card now works with the controller and with a finger:** the list of matching Steam settings used to grow
  underneath the box inside the bottom dock, and two letters could match dozens of settings and throw the box
  off the top of the screen. The list now floats in a small card above the box instead, holding up to eight
  rows but never more than fit under the tab bar (about six on the Deck's own screen), naming the rest as "N
  more" in its heading, and it gets out of the way once you are typing a real question — past three words, or
  a question mark — unless what you typed is the exact name of a setting. Up from the question box now moves
  the real highlight onto the nearest row, Up and Down step between rows, Down from the bottom row returns to
  the box, A opens that Steam setting, and B — or a tap anywhere outside the card, for a mouse or a finger —
  closes the card for that search while keeping the typed words; the suggestion chips above the box stay out
  of reach while the card is open. The card's background is now fully solid, after chat text underneath was
  found showing through it on the Deck, then fixed and re-checked solid the same day. Confirmed on the Deck
  2026-09-16: the box holds still, the card's background is solid, Up and Down walk into and out of the card,
  a chip cannot be reached while it is open, and B or a tap outside closes it and keeps the words. **One thing
  found on the Deck that does not match what this entry set out to do:** pressing A on a result opens the
  right Steam page, but coming back to the plugin afterwards does not keep what was typed — the box is empty
  again — which is a question for the maintainer, not decided here. `MainTabUnifiedAskBar.tsx`,
  `useSteamSettingsSearch.ts`, `section-4.ts`. On-Deck rows: **SETTINGS-CARD-01**–**04** passed on the Deck
  2026-09-16; **05** passed for opening the setting but not for the return; **06**, **07** landed, owed on the
  Deck; all in `docs/testing.md`.
- **Left on the Ask button, the paperclip, or an answer paragraph now stays in the plugin:** it used to hand
  the highlight to Steam's own Quick Access tab, with nothing on screen saying that had happened; all three
  now claim Left and hold still, since there is nothing further left to move onto. `MainTabUnifiedAskBar.tsx`,
  `buildAnswerBubbleElement.tsx`. Confirmed on the Deck 2026-09-16, all three. On-Deck row:
  **LEFT-HOLDS-STILL-01** in `docs/testing.md`.
- **Reopening a saved reply no longer traps Down in an endless loop:** a reply with no live Helpful/Not
  really row — the shape a restored chat turn has — used to send Down back up to the Retry icon instead of
  forward to Read aloud, so the walk cycled the question and the paragraphs forever and could only be escaped
  by folding the reply away. Down now tries the reply's own controls in on-screen order first.
  `buildAnswerBubbleElement.tsx`. Confirmed on the Deck 2026-09-16: a twelve-press walk reaches Read aloud,
  Show details and the Ask bar with no loop. On-Deck row: **RESTORED-TURN-DOWN-01** in `docs/testing.md`.
- **A greyed Helpful or Not really no longer steals the highlight:** on a stopped reply, with the thumbs
  greyed out, Down from the answer used to take two presses and still land on the greyed button instead of
  Read aloud, and Up from Read aloud landed on it too. The greyed button turned out to still accept the
  highlight on this build — it is greyed by styling, not disabled the way a web form control is — so a caller
  now marks it unavailable explicitly and the shared focus helper skips it in both directions. Confirmed on
  the Deck 2026-09-16, both directions. `buildReplyActionsElement.tsx`, `replyStopRegistry.ts`. On-Deck row:
  **GREYED-STEP-OVER-01** in `docs/testing.md`.
- **The honesty line for a horse-taming question about Black Mesa now shows, fixed in code, Deck check
  owed:** the line that warns a reply leans on the model's own knowledge checked only whether the game's
  cards scored above a threshold, and every card of a game repeats the game's own name in its title — so
  cards attached to an unrelated question still scored above zero and the line stayed off. The check now
  also asks whether the actual words in the question show up anywhere in what attached, which fixed that
  part on its own but was not enough by itself — checked on the Deck 2026-09-16, the line still did not
  show, because the closeness score it also has to clear was measured on the whole question including the
  game's name, and every card of that game scored about the same whether the question was real or not. The
  check can now take a second closeness score, measured with the game's own name taken out of the question
  first, and uses that one instead whenever it was measured — only for a game that was named purely in the
  question, with nothing running; a running game is unaffected. With the game's name removed, a stretch
  question about taming a horse now scores under the line and a real question about the game scores safely
  over it. `knowledge_base_service.py`, `kb_not_in_notes_notice.py`, `game_ai_request.py`,
  `transparency_service.py`. **Not yet checked on the Deck:** the plugin's own pre-authorised data wipe ran
  before this landed and removed the Deck's local AI program and every downloaded model, so no question can
  be asked there until it is switched back on. On-Deck row: **HONESTY-TEXT-GAME-01** in `docs/testing.md`.
- **Picking a mode in the small menu under the question box no longer leaves the highlight on nothing:**
  choosing Speed, Strategy or Expert now hands the highlight back to the mode button, the same place it already
  went when backing out of the menu. `MainTabAskModeMenuPopover.tsx`. On-Deck row: **ASK-MODE-MENU-RING-01**
  (owed) in `docs/testing.md`.
- **A several-model download now says which name it could not find, and a model with no listed size warns
  before you pick it:** downloading several models at once used to drop a mistyped name with no notice; it now
  says which one it could not find and still starts the good ones. The try-order picker used to treat a model
  as safe whenever its size was missing from the list; it now shows "Size unknown - may be too large" instead,
  and still lets you pick it. `PullModelsModal.tsx`, `ModelRoutingOrderModal.tsx`, `ollama_service.py`,
  `ollama_routing.py`. On-Deck rows: **PULL-MISSING-NAME-01** (owed), **ROUTING-SIZE-UNKNOWN-01** (passed on
  the Deck 2026-09-15) in `docs/testing.md`.
- **Pressing Ask, or hitting a greyed button, no longer drops the highlight:** after pressing Ask the highlight
  now lands on the question box when there is a real question, or stays on the Ask button when the box is
  empty, instead of vanishing either way; while an answer is being written, Down from the question box now
  holds still instead of landing on the greyed Ask button, and Down from an answer with the thumbs greyed lands
  on Retry instead. Opening the panel also now tries, for about a second, to place the highlight on the
  question box. `MainTabUnifiedAskBar.tsx`, `useMainTabAskBarFocus.ts`. On-Deck rows: **ASK-RING-AFTER-PRESS-01**
  (real-question half passed on the Deck 2026-09-15), **GREYED-STEP-OVER-01** (Ask half passed on the Deck
  2026-09-15), **OPEN-RING-01** (holds on the Deck for an ordinary fresh open, two of three tries; the one
  miss is the very first open right after a fresh deploy's restart) in `docs/testing.md`.
- **Closing the model try-order picker now returns the highlight to the button you opened it from**, instead
  of leaving it on the tab, about thirteen presses away. `ModelRoutingOrderModal.tsx`, `useRoutingOrderModal.ts`.
  On-Deck row: **TRY-ORDER-RETURN-01** in `docs/testing.md` — the text picker passed on the Deck 2026-09-15,
  the vision picker not yet pressed.
- **The line under the question box now keeps up with the game you are playing, and shows its name instead of
  a number:** it used to only read the running game once when the panel opened, and never noticed a game
  closing or starting while the panel stayed open. Confirmed on the Deck 2026-09-15, both directions. Pinned
  test chips also now show their amber Test badge in the decode animation style, the one style that never drew
  it — confirmed on the Deck by eye. `useBonsaiAskOrchestration.ts`, `MainTabPresetAnimatedChips.tsx`. Rows
  **GAME-LINE-LIVE-01**, **CHIP-TEST-BADGE-01** in `docs/testing.md`, both passed.
- **A Speed-mode reply no longer ends with a block of raw computer text where a power tip should be**, a
  follow-up menu no longer offers Half-Life 2 places under a different game's answer, a screenshot Ask no
  longer ends with a line of technical text, a Hades boss's note is spelled correctly (Megaera) pending the
  maintainer's publish step, and the honesty line can now appear when a game is only named in the question
  rather than running or picked from a menu. `ollama_prompts.py`, `tdp_intent.py`, `game_ai_request.py`,
  `response_verify.py`, `knowledge_base_service.py`, `data/kb/`. On-Deck rows: **TDP-CODEBOX-01** (passed on
  the Deck 2026-09-15), **ATTACH-DEBUG-01**, **MEGAERA-01**,
  **BRANCH-EXAMPLE-01** (one clean sighting on the Deck 2026-09-15) in `docs/testing.md`. **One thing this
  landing did not fix, found on the Deck the same evening:** the honesty line still does not appear for a game
  named only in the question, even though the underlying check now reaches that game correctly — three
  unrelated cards attached to a Black Mesa question about horses with no line saying so. Row
  **HONESTY-TEXT-GAME-01**, still open.
- **Walking down a reply and walking back up now visit the same stops**, Down from an answer with the thumbs
  greyed lands on Retry instead of doing nothing, and a reply ending in a code box now leaves room for the copy
  icon instead of sitting on top of it. `buildAnswerBubbleElement.tsx`, `buildReplyActionsElement.tsx`,
  `answerBubbleNavigation.ts`, `replyStopRegistry.ts`, `ReplyCopyButton.tsx`. On-Deck rows owed:
  **REPLY-STOPS-MIRROR-01**, **COPY-ICON-CODEBOX-01** in `docs/testing.md`.
- **A short question no longer fades unless it really runs past its five lines, Left on the collapsed-history
  row stays in the plugin, closing an open question keeps the highlight on it, and Up from the first archived
  chat header now reaches the chat slot row instead of running all the way to the tab bar.** All four confirmed
  on the Deck 2026-09-15. `MainTabChatTranscript.tsx`. Rows **QUESTION-FADE-01**, **EARLIER-LEFT-01**,
  **QUESTION-COLLAPSE-RING-01**, **ARCHIVED-UP-01** in `docs/testing.md`, all passed.
- **The tab bar's pop-up strip no longer leaves a see-through ghost of itself over the suggestion chips:**
  touching the screen used to close the strip with a fade, and if that fade ever stalled — seen twice with a
  game running full screen — the strip was left frozen half-visible, with pale tab icons and a faint row of
  dots showing through the chip text. A plain timer now forces the strip fully hidden a fraction of a second
  after it closes, whether or not the fade itself finishes. The exact reason the fade stalls was not pinned
  down — it needs a finger on the screen to reproduce, and the rig has no touch. `TabIndicatorBar.tsx`. On-Deck
  row owed: **TAB-BAR-GHOST-01** in `docs/testing-manual.md`, and it needs a maintainer's touch.
- **A spoiler box now opens when the rules already say it should:** on a game the plugin knows only by
  name, such as an emulator shortcut with no Steam ID; when you type a boss's name before asking about
  it, such as "wheatley fight"; and when you name a game with no story to protect while nothing is
  running, such as "drg survivor what class." All three show as plain text from the first streamed word,
  and a reopened chat still shows the same thing. `unwrapAskedEntitySpoilerFences.ts`,
  `buildAnswerBubbleElement.tsx`, `MainTabChatTranscript.tsx`, `useBonsaiAskOrchestration.ts`,
  `chatSlotTurns.ts`, `game_ai_request.py`, `ollama_ask_service.py`, `ollama_prompts.py`. On-Deck rows
  owed: **STRAT-SPOIL-NAME-01**, **STRAT-SPOIL-FIRST-01**, **STRAT-SPOIL-TEXT-01** in `docs/testing-manual.md`.
- **The automatic checks stop reporting a failure on every single change:** since 2026-09-07 every push has come back red, and the notification said only that tests failed. Nothing was actually broken in the plugin. Four tests were failing on the build server and only there. Three of them build a real knowledge base, which needs an AI model installed on the machine — and the build server has none, so the build correctly refused and the tests read that refusal as a failure. Those three now skip on a machine with no model, with a message saying so, and still run for real on the maintainer's machine before anything lands. They still fail loudly if the build breaks for any other reason. The fourth was a timing check comparing two clocks across threads; it failed by fifty millionths of a second, and now allows a slack far smaller than any real overlap. Root cause of the three: a rule was added on 2026-09-07 stopping the knowledge base from being built with cards that meaning-search cannot find, and the tests that build one were never told about it — one of them still had a note saying no AI model was required. `tests/corpus_build_support.py` (new), `test_build_rag_attributions.py`, `test_rag_corpus_download.py`, `test_knowledge_base_service.py`, `test_voice_read_aloud_service.py`.
- **A follow-up question is more likely to be about the thing you just asked about:** ask about a boss, then *"what about its second phase"*, and the reply used to be about a different boss every time. The plugin now tells the model in plain words which boss the question follows on from. Measured before shipping on three games: right not once in nine tries before, four in nine after — better on two of the three games and no help on the third, where the model cannot make the connection at all. Replies on these turns also come back about half as long. Not a fixed feature, an improvement on something that never worked.
- **A Steam Frame question no longer points at a phone app that does not exist:** the four old Frame tips in the knowledge base were written before anyone checked what a Frame actually needs, and one told a person to use a companion phone app that was never real. All four are replaced by seven tips that tell a person the true story: run bonsAI on a Steam Deck on the same home network as the Frame, point it at the PC that streams the games, and a few comfort and troubleshooting notes for VR play. None of them claim bonsAI can see or hear anything from inside a headset, because it can't. The README also gained one line saying the same thing. `gen_compat_patterns.py`, `data/kb/compat_patterns.json`, `README.md`; backend test in `test_knowledge_base_service.py`. On-Deck **KB-FRAME-TIPS-01** in `docs/testing.md`.
- **A note or a tip stops getting stapled onto a question it does not answer, most of the time:** asking Black Mesa how to tame a horse, or asking about a Hades boss that does not exist, used to always attach some note or tip anyway. Both the game-note search and the troubleshooting-tip search now refuse to attach anything when their best match is too weak to trust, and the reply is left as the model's own memory instead. **Not every case is caught yet** — the two examples above still attach something today, because closing that gap all the way would cost twenty or more genuinely correct answers elsewhere in the library. `knowledge_base_service.py`; backend tests in `test_knowledge_base_service.py`. On-Deck **W3-R2**, **W3-R3** in `docs/testing.md`.
- **An answer no longer ends with a line of computer code:** in Speed mode with a game running and the character voice on, a reply could end with the literal line `{"tdp_watts": 5, "gpu_clock_mhz": 1200}` sitting among the words. The plugin reads that line to work out a power suggestion and simply never took it back out. It is now removed the moment it is read — **only when it is loose in the reply**, so a code example someone actually asked for is left exactly as it was, and the power suggestion still works. `tdp_intent.py`, `game_ai_request.py`; 7 backend tests. On-Deck **W2-R6**.
- **The note or tip line under a reply no longer blinks out for a moment right when the reply
  finishes:** it used to disappear the instant a reply completed and only come back a little later,
  in the gap before that reply's own saved details had loaded; how long the gap lasted, and whether
  a person even noticed it, came down to luck. It now stays on screen through that gap and only
  clears if the finished reply genuinely used no note or tip. `MainTabChatTranscript.tsx`,
  `useBonsaiAskOrchestration.ts`; two new screen tests, one of them proved by turning the fix off and
  watching it fail. Confirmed on the Deck 2026-09-19: a shared-tip question watched every quarter
  second showed the block the whole time, with no gap. On-Deck rows **NOTES-BLOCK-03**,
  **NOTES-BLOCK-06** in `docs/testing-manual.md` now pass.
- **The line under the question box stops naming a game you have closed:** exit a game and it used to keep the old name, so a question that does not name its own game could pull in the wrong game's notes. **The cause first written down was wrong and the real one is worth knowing:** the ordinary keep-in-sync check does correct itself within about a second and a half; the hole was **reopening the panel** — after a popup, or leaving and coming back — which restored the remembered name without ever checking whether that game was still running. It now checks what is actually running at that moment. `useBonsaiAskOrchestration.ts`; 5 frontend tests. On-Deck **W2-R6**.
- **Walking a reply while it finishes no longer loses the highlight:** walking Down into an answer that is
  still being written puts the highlight on one of its sections; when the answer finished, that section was
  swapped out for its saved copy and destroyed, so nothing on screen had the highlight any more and the view
  jumped to the very end of the reply. The chat now remembers which section held the highlight and puts it
  on the matching section of the saved answer once the swap happens. `chatSlotTurns.ts`,
  `useBonsaiAskOrchestration.ts`. On-Deck row owed: **STREAM-WALK-REC-01**, plan 64 flow G, in
  `docs/roadmap.md`.
- **After downloading the knowledge base onto the SD card, the section no longer says "Not installed" for
  a minute:** the download marked itself finished before the new SD-card location was saved to settings,
  and the screen checks whether the library is installed only once, right when that happens — so the one
  check found nothing saved yet and kept showing the old "Not installed" state until the tab was left and
  reopened. The save now finishes before the download reports itself done. `knowledge_base_service.py`,
  `main.py`. On-Deck row owed: plan 64 flow G, in `docs/roadmap.md`.
- **Pressing Done on a popup no longer writes old values back over something the back end had just
  changed:** the AI models screen, the try-order screen, the AI character picker and the UI scale Apply
  button each used to send their whole copy of settings on save, so anything changed elsewhere in the
  meantime — a knowledge-base location a download had just saved, for example — was overwritten with the
  old value. Each popup now sends only what changed on its own screen. `usePluginSettings.ts`, `index.tsx`.
  On-Deck row owed: plan 64 flow G, in `docs/roadmap.md`.
- **Pulling a typed-in model name no longer drops an unsaved switch change on the AI models screen:** the
  screen holds the licence and Advanced switches as a draft until Done is pressed, but pulling a name typed
  by hand closes the screen on its own, and that close used to skip saving the draft — so turning on
  "Allow high-VRAM models in routing" and then pulling a typed name left the switch reading off again on
  reopening. The draft now saves first. `OllamaModelsHubModal.tsx`. On-Deck row owed: plan 64 flow H, in
  `docs/roadmap.md`.
- **The Ollama tab no longer says "Could not reach Ollama" right after a plugin reload while Ollama is
  actually answering:** the tab's one automatic connection check could run before settings had loaded, so
  it checked the saved network address instead of "this Deck" and failed — offering Install Ollama while
  Ollama worked the whole time. The check now re-runs once settings say Ollama runs on this Deck, and only
  the newest check may set what the tab shows. `OllamaTab.tsx`. On-Deck row owed: plan 64 flow H, in
  `docs/roadmap.md`.
- **After downloading the knowledge base onto the SD card, the section no longer gets stuck reading "Not
  installed":** the earlier fix for this saved the new location sooner, but the Deck still showed "Not
  installed" with a Download button the whole time a download ran. The real cause was that closing the
  storage-choice picker rebuilds the whole tab underneath it, and the rebuilt copy threw away the piece of
  state that remembers a download is running, along with the check that keeps polling for it — so it read
  the library's status once, before the install finished, and never again. A download that started is now
  remembered across the rebuild, so the new copy keeps checking until it lands. `KnowledgeBaseSection.tsx`.
  On-Deck row owed: plan 64 flow H, in `docs/roadmap.md`.
- **A model already installed on the Deck now keeps its row on the AI models screen with Essentials only
  turned on:** that view is meant to narrow the download list to three starter models, but it was also
  hiding any other model already on the Deck — installed ones included, with no star to use it for Ask and
  no Remove unless Filters was opened by hand. Essentials only now only narrows what can be downloaded.
  `PullModelsModal.tsx`. On-Deck row owed: plan 64 flow H, in `docs/roadmap.md`.
- **Walking a reply with the D-pad while an answer finishes underneath it no longer loses the highlight:**
  the earlier fix for this did not change what the Deck showed, because the answer bubble drew itself bare
  while streaming and got wrapped with its Copy button once it finished — so the bubble changed shape right
  at the moment it finished and was rebuilt from scratch, taking the highlight with it. The bubble now keeps
  the same shape throughout, and its sections are tracked by where they sit rather than what kind they are,
  so a kept bubble keeps the highlight too. `buildAnswerBubbleElement.tsx`, `MainTabChatTranscript.tsx`.
  On-Deck row owed: plan 64 flow H, in `docs/roadmap.md`.
- **Opening a "From the notes" block now brings its header to the top of the pane:** asking to scroll the
  header to the top used to barely move the view, showing only 17% of the block. The request was not
  broken — Steam's own scroll area keeps 116 pixels clear at its own top, and the header was already
  sitting exactly there, so the request was asking for a place it already occupied. The block now scrolls
  by asking the pane directly to put the header's own top at the pane's own top, ignoring that reserved
  space. `chatPanelScroll.ts`, `MainTabChatTranscript.tsx`. On-Deck row owed: plan 64 flow H, in
  `docs/roadmap.md`.
- **Answers now arrive as the model actually writes them, instead of in stop-and-go lumps:** the plugin
  used to wait for a full 4 KB of the model's output before showing any of it. One streamed piece is only
  about 135 bytes, so roughly 30 of them queued up behind that wait — with a game running, text used to
  land in bursts of about 115 letters every 1.5 to 2 seconds, even though the model itself was writing
  evenly the whole time. It now shows whatever has arrived as soon as it does, at most every 0.12 seconds,
  so text flows in steadily. The model's live thinking flows the same steady way now, for the same reason,
  and Stop answers a little sooner too, since it is checked after every smaller read. `ollama_chat_stream.py`.
  On-Deck row owed: **FIX-01** and **FIX-02** in `docs/testing.md`, with a game running.
- **The blinking cursor in an empty question box now sits right where typing will start:** it used to sit
  noticeably up and to the left of the hint text — 5 pixels left and 4 pixels above the first letter,
  measured on an external monitor — because it was pinned to a fixed spot in the box instead of to the
  text itself. It now sits in the line of text: before the hint on an empty box, after the last letter once
  something is typed, so it always moves exactly where the text does. `MainTabUnifiedAskBar.tsx`. On-Deck
  row owed: **ASK-CARET-01** in `docs/testing.md`.
- **The "From the notes" credit line now only shows up when the answer actually used the note:** it used
  to appear under almost every Strategy answer that had a note attached, whether or not the answer said
  anything from it — on the maintainer's own saved chats, 49 answers had notes attached and the block
  showed for all of them; now it shows for barely a third. The block appears once the live answer has said
  something the note said, checking for shared and repeated words and game names it names, not by guessing
  at meaning. `kbNoteUsedByAnswer.ts`.
- **The model's live thinking now reads as ordinary wrapping text, not three lines cut short:** while the
  model thinks, the sentences under your question used to always show only its newest three, each cut off
  mid-line with "…". They now wrap and keep their own line breaks, in smaller, dimmed, italic type that
  fits six lines instead of three, with the newest line at the bottom. `MainTabChatTranscript.tsx`.
- **The branch menu no longer shows its own placeholder wording when the model copies it, game name and
  all:** a return of an earlier bug, closed 2026-09-23, that caught the model copying the prompt's example
  word for word but missed it swapping its own title into the placeholder — seen live under a Deep Rock
  Galactic: Survivor answer as "A. <a place early in Deep Rock Galactic Survivor>". Any bracketed phrase, or
  wording that opens the same way as the prompt's own example, now drops the menu the same way; real
  choices that merely start with similar words are kept. `response_verify.py`. On-Deck row
  **BRANCH-TEMPLATE-02** in `docs/roadmap.md`, unit-proven, device check still owed.
- **The panel keeps up much better while an answer streams in:** with no game running, it used to draw
  only about 19 to 24 frames a second while text was arriving; it now draws 56 to 58 with the scramble
  animation off (what everyone gets by default) and 44 to 50 with it turned on. The fix moves the streaming
  text, and the scramble when it is on, forward on a steady beat about nine times a second, instead of
  trying to redraw on every single frame the screen can produce; the maintainer's own bar was 60 frames a
  second, 45 at the least. `streamBeat.ts`, `useSmoothStreamReveal.ts`, `ScrambledAnswerText.tsx`. Evidence
  `docs/test-evidence/plan69-answer-frame-rate-2026-09-25.json`. Owed: the same measurement with a game
  running, rows **SCR-09**/**SCR-10** in `docs/testing.md`.
- **The glow around a streaming answer, and the question box's own breathing glow, now hold still while
  text is arriving:** both used to redraw on every single frame — a pulse on the answer bubble and a
  breathing effect on the question box — which alone cost about 5 frames a second off the panel's frame
  rate while an answer streamed, the difference between an answer staying above 45 frames a second and
  falling below it. Both now hold one steady look while text is arriving, and the question box's glow still
  breathes normally while the model is thinking. `answerBubble.ts`, `section-6.ts`.

### Added
- **A long chat now sums itself up instead of quietly forgetting the older part:** once a chat has grown too
  long to carry whole, the AI writes a short summary of the older part right before answering, then answers
  using that summary plus the newest turns, so a vague follow-up like "and what about that" still lands on
  the same subject. A note under the answer says it happened, and pressing it opens what the AI kept.
  *Sum up this chat*, at the top of the Session tab, does the same by hand, in place of Clear, and shows a
  card with what the AI remembers. Each chat now remembers its own subject on its own, and a follow-up asked
  with nothing running now searches the chat's own game instead of finding nothing to look up. Measured on
  the Deck with a game running, a summary took 13 to 40 seconds. `chat_summary_service.py`,
  `chat_slot_service.py`, `kb_followup_memory.py`, `SessionContextStrip.tsx`, `MainTabChatTranscript.tsx`.
  On-Deck rows **SUMUP-01** to **SUMUP-10** owed.
- **Knowledge base release `2026.09.18` published (372 notes across 35 games, 159 Deck tips):** ten more
  games get real notes instead of the model's memory — the five Mario Party games, Donkey Kong 64, Yoshi's
  Story, Diddy Kong Racing, Super Smash Bros. 1999 and Grand Theft Auto III: The Definitive Edition. Live in
  both places it publishes to, Hugging Face and the GitHub release, read back over the wire afterwards to
  confirm both serve this version. Pressing Update on the Deck itself, so an installed library actually
  pulls it, is still owed. On-Deck row **W1-R1** in `docs/testing.md`.
- **A line under a finished Strategy or troubleshooting reply now shows the note it used, in the
  note's own words:** when the reply leaned on one of bonsAI's own game notes or a shared Deck tip, a
  one-line credit now appears underneath it, naming the note and where it came from — a named wiki,
  the shared Deck tips, or "bonsAI's own notes, no source." Pressing it opens the note's own words,
  kept as separate lines when the note itself was written that way; reopening a saved chat shows it
  again; nothing appears when nothing was attached, and it is never read aloud. It starts closed
  behind one switch. **Two more pieces landed the same day:** the block now appears before the
  model's first word rather than only once the reply finishes, and on a fenced reply it now appears
  once the spoiler is opened, instead of being hidden entirely. `game_ai_request.py`,
  `background_request_state.py`, `MainTabChatTranscript.tsx`. On-Deck rows owed: **NOTES-BLOCK-01** to
  **07** in `docs/testing-manual.md`. **Three more fixes, confirmed on the Deck 2026-09-18:** the
  header is now two lines — the note's name and how many notes there are on the first, the source on
  the second — and the count is never the part that gets cut short. Opening a tall block now keeps its
  header in view instead of scrolling past it. The credit line for one of bonsAI's own notes with no
  source now reads "From bonsAI's own note." Walking up from the hint rows above the question box now
  reaches the block; walking up from the session context strip now reaches it too on a finished reply
  (fixed 2026-09-18, commit `40c23a6`). Confirmed on the Deck 2026-09-18: pressing Up from the
  session context strip lands on the block's own header. Evidence
  `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-01.json`.
- **A line under your question shows the AI's own thinking while you wait:** while the AI thinks, its own
  newest sentences show under your question; when the answer starts they fold to one line with the
  seconds; press it to read the whole thing; a Thinking chip in Show details; a one-time notice the first
  time Thinking is turned on. `ollama_service.py`, `OllamaThinkingEffortRow.tsx`, `MainTabChatTranscript.tsx`.
  On-Deck rows owed: **REASONING-01** to **REASONING-07** in `docs/testing-manual.md`. **Found and fixed the
  same day (commit `d2096ee`):** on the first build, declining the one-time Thinking notice left the ring on
  the tab strip instead of back on the Thinking row, and accepting it closed the notice without actually
  turning Thinking on until picked a second time. The notice now hands the ring back through the shared
  return-focus registry and saves the chosen level into the settings snapshot correctly.
- **A Clear button now sits on the Session context bar, and it means the same thing Clear cache in Settings
  already means:** with the bar showing under the chat, a small Clear appears at its right end; pressing it
  opens the same confirm box as Clear cache — "Start the next question fresh?" — and choosing it shows a
  toast, "Next question starts fresh," and forgets the subject of the last strategy question and the
  strategy checklist position for the running game. The chat itself and the bar's own rows stay exactly as
  they are. `SessionContextStrip.tsx`, `MainTabChatTranscript.tsx`, `main.py`. On-Deck row owed:
  **SESSION-CLEAR-01** in `docs/testing.md`.
- **The back-end check that looks for a made-up-sounding reply is switched on, quietly:** it writes one line
  to the log for every answer and changes nothing on screen and calls no second model. `game_ai_request.py`.
  On-Deck row owed: **ANSWER-CHECKER-LOG-01** in `docs/testing.md`.
- **The Spy can now lie to you on purpose:** at the Heavy or Unleashed accent setting he sometimes gives
  advice that sounds right and is wrong — wasted time only, never anything that can hurt your game or your
  Deck — and Show details on that reply gets a "Spy" line saying "The Spy was on" with what he lied about,
  or "The Spy was on and did not confess." Below Heavy he is unchanged and nothing new appears.
  `spy_confession_service.py`, `ai_character_service.py`, `game_ai_request.py`, `transparency_service.py`.
  On-Deck row owed: **SPY-REVEAL-01** in `docs/testing.md`.
- **A Read aloud line under a finished answer, in the Deck's own voice:** press it and the Deck speaks the answer one sentence at a time, starting in about a second; the line changes to **Stop**, and pressing it again, or asking a new question, stops the speech. It keeps reading with the menu closed. A hidden spoiler is announced as "a spoiler is hidden here", a table as "there is a table on screen", and code as "there is code on screen", instead of being read out. Clearing the session stops it too. Settings gains a three-way **Voice replies** choice next to the microphone rows — **Off** (default), **When I asked by voice**, **Always** — that decides when an answer reads itself with no press; a dictated question that was then typed over or replaced by a suggestion chip does not count as asked by voice. Checked on the maintainer's Deck 2026-09-12: the D-pad reaches the line, pressing it starts and stops the speech with a sound stream confirmed on the speaker, the Settings row saves its choice, and Always read a fresh answer with no press. Still owed: hearing it by ear, and two checks that need the microphone or timing on the device. `voice_read_aloud_service.py`, `useReadAloud.ts`, `answerReadableText.ts`, `SettingsTab.tsx`; backend tests in `test_voice_read_aloud_service.py`, frontend tests in `useReadAloud.test.ts`. On-Deck **READ-ALOUD-01…06** in `docs/testing.md`.
- **Follow-up questions remember what you just asked about:** asking about a boss, then "what about the second phase?", used to search on just those last few words, so the game notes for the wrong thing could come back — in Deep Rock Galactic: Survivor it used to answer about a different boss than the one just asked about. The thing you were just asking about is now carried into the search behind a bare follow-up like that, in Strategy or Expert mode. `game_ai_request.py`; backend tests in `test_game_ai_request_followup_memory.py`. On-Deck **W3-R4** in `docs/testing.md`.
- **A line for when a troubleshooting question gets no tip:** *"No tip for this — this answer is from the model's own knowledge."* now appears under a reply that was sent to the Deck tip sheet and came back with nothing worth attaching, so it is clear the answer is a guess rather than a real Deck tip. Same shape as the existing "not in my notes" line, and the two never appear together on one reply. `kb_not_in_notes_notice.py`, `game_ai_request.py`; backend tests in `test_kb_not_in_notes_notice.py`, `test_kb_not_in_notes_wiring.py`. On-Deck **W3-R2** in `docs/testing.md`.
- **Knowledge base release `2026.09.07` published (293 notes across 25 games, 156 troubleshooting tips, 1.39 MB to download):** carries the 27 new notes and the 32 rewritten tips. **Every note and every tip has its meaning index** — the manifest records nothing missing, and the build would now refuse to finish if anything were. Live in both places it publishes to, and both were read back over the wire afterwards: same version, same counts, and the same checksum as the file built here. Nothing already installed goes stale — the format is unchanged at version 3, so an installed library updates in place.

- **Twenty-seven more notes, and every question that was meant to have an answer now has one:** of 72 questions a player might plainly ask about the twelve games added earlier this month, 43 had a note. **64 do now** — the other eight were written on purpose to have none, and stay blank as a control. Mario Kart 64 went from four notes to nine, Doom 64 from five to eight, Super Mario 64 from six to eight, Paper Mario from six to nine. Someone asking where to go after Black Mesa's opening tram ride, which cheap early armour in New Vegas is worth taking, where Doom 64's first keycard is, or which kart is fastest gets a real answer instead of the model's memory. **Measured on the library that ships:** the search puts the right note in the top three 84 times in a hundred against 80 before; all 21 of the newly answered questions find their note in the top three, and 12 find it first. Across all 72 questions about the new games, 58 find their note in the top three where 38 did. Two rows out of 413 got worse and 24 got better — asking about the big spiky turtle you throw by the tail used to find the Bowser note third, and a new note about throwing King Bob-omb now sits above it. Answers clean on all three runs went from 55.7 to 62.3 in a hundred. `data/kb/strategy_seed.json`, `tests/fixtures/kb_eval_v2.json`. On-Deck **W2-R2**, **W2-R3**.
- **A line that tells you when an answer is not from the notes:** on a Strategy or Expert question about a game the notes cover, where nothing in the notes matched, one quiet line now sits under the answer — *"Not in my notes — this answer is from the model's own knowledge."* It is added by code, not written by the model, so it cannot be forgotten or argued with. It never appears when the notes are off, when the game has no notes at all, or on a quick Speed question, because the coverage chip already says that. If the reply also carries the back-up-your-save warning, that comes first and this follows. It changes no answer; it changes what you can trust. `kb_not_in_notes_notice.py`, `game_ai_request.py`; 14 backend tests. On-Deck **W2-R5**.
- **The troubleshooting tips are worth reading now:** the tip sheet had two tips about crashes and the first told you to check a desktop that game mode does not have — on a Deck the game just drops you back to the library. Crash now has nine tips, performance ten, sound eight, picture eight and controller ten, each one or two plain sentences saying what to try and in what order. One genuinely useful crash tip that had been filed under Proton has moved where people will find it. A plainly worded crash question with nothing running also reaches the tips at all now, where the word *crash* used to be treated as too weak to send a question anywhere. **What this does not fix, measured and written down:** of 24 sentences written by someone who had not seen the rules, six reached the tips before and eight after. The rules still match phrases, so they catch the wording someone imagined and miss the neighbour. `compat_topic_router.py`, `gen_compat_patterns.py`, `data/kb/compat_patterns.json`. On-Deck **W2-R4**.
- **A half-built knowledge base can no longer reach a Deck quietly:** there were three ways a note could ship with no meaning index — the embedding model missing on the build machine, a run that stopped part way, or one note whose vector came back the wrong size — and all three only printed a warning. The build now refuses to finish in each case unless someone passes a flag on purpose, and records the missing count either way; the publish check refuses a build that indexed only some of its notes. A stricter "every note is indexed" check exists alongside the old one, deliberately not in place of it, so nobody with an older library already on their Deck loses meaning search when they update. Nothing a person sees changes today. `build_rag_db.py`, `publish_corpus.py`, `knowledge_base_schema.py`; 14 backend tests across three new files.

- **Corpus release `2026.09.06` published (266 notes across 25 games, 124 troubleshooting tips, 1.27 MB):** twelve more games get real notes instead of the model's memory — Black Mesa, Hollow Knight, DOOM Eternal, Doom 64, GTA V, GTA IV, Fallout: New Vegas, Super Mario 64, Mario Kart 64, Paper Mario: The Thousand-Year Door, Pikmin 2 and Super Smash Bros. Melee. Live on both places it publishes to, each read back over the wire and matched to the built file byte for byte. **The coverage is thin at the bottom, and that was known before shipping:** of 72 questions a player might plainly ask about these twelve games, only 43 have a note that answers them, so someone asking about Mario Kart 64 or Doom 64 will often get nothing. Nothing already installed goes stale, because the format has not changed. Decision **D83**.
- **Replies arrive word by word, always:** an answer used to land in one lump when it was finished. Now the words appear as the model writes them. This was a Developer-screen switch called *Token streaming (experimental)*, **off by default**, so almost nobody ever saw it — which means what changes here is the behaviour, not a screen. The switch is gone; there is nothing to turn on. For this project it also means every test row that had to be run twice, once with it on and once off, becomes one row. **The one thing that had to be proven first:** a settings file already on somebody's Deck still carries the deleted key, and loading it must drop that key quietly and leave every other setting alone. A shared test case was written and watched passing in both languages before anything was removed, and the device confirmed it: 47 settings before the upgrade, 46 after, the only loss being the dead key and nothing else changed. Measured on the Deck: the answer grew through eleven separate lengths over eight seconds rather than appearing at once. `bonsai_token_streaming_enabled` removed from `settings_service.py`, `bonsaiSettingsNormalizers.ts`, both settings-contract fixtures and the Developer screen. On-Deck **STREAM-UPGRADE-01**, **STREAM-DEFAULT-01** in `docs/testing.md`.
- **A first question that does not wait for the model to load (developer switch, off by default):** the very first question after the plugin starts has always paid for loading the model into memory. Turned on, the default Ask model is warmed when the plugin starts, so that first question is as fast as the rest. Only a model of 3B parameters or under is ever warmed — warming a big one at boot would be worse than the problem — and anything that goes wrong (host unreachable, no small model installed, not enough memory) is swallowed silently rather than shown. It runs once and never polls. **It cannot make start-up slower:** the warm-up is scheduled and the plugin carries on without waiting, which a test proves by timing out if it ever waits. The open question the roadmap raises — whether the model is still in memory after the Deck sleeps — is deliberately not answered here. `dev_preload_ask_model` in `settings_service.py` / `bonsaiSettingsNormalizers.ts`, `ollama_service.py`, `main.py`; 21 backend tests. On-Deck **PRELOAD-01**, **PRELOAD-02** in `docs/testing.md`.
- **One suggestion chip instead of two, if you want it:** the row above the question box shows two chips side by side, so each label gets half a 300px column and a long one has to scroll past to be read. A new Settings switch, off by default, shows one chip with the whole column instead. Two stays what everyone sees unless they turn it on. Left and Right still move through the suggestions, and the out-of-suggestions glow still lights up correctly with a single chip, where the first and last chip are the same one. The row's carousel width moved from a value baked in at build time to one the page can change, so the switch takes effect without a rebuild. Known and not fixed: the hold time is still worked out from the two-chip width, so a long single chip may sit on screen longer than it needs to — never shorter. `preset_single_chip`, `presetRowLayout.ts`, `MainTabPresetAnimatedChips.tsx`, `SettingsTab.tsx`; 20 frontend tests. On-Deck **PRESET-SLOTS-01**, **PRESET-SLOTS-02** in `docs/testing.md`.
- **Type any model name into the pull picker:** Ollama → Pull models could only offer what was in the built-in catalogue. A field at the top now takes any name from the Ollama library and pulls it, and a made-up name comes back with a plain reason instead of nothing happening — the library check and the pull job already existed and already returned that reason, so no backend change was needed. Each installed model also gains a **star**: pressing it makes that the one Ask reaches for first, reusing the existing settings save rather than a new call. And anything pulled in the last thirty days carries a small **New** label. Nothing anywhere recorded *when* a pull happened, so that date is kept on the device in the browser's own storage, seeded on the first open — which is why models you already had before opening the picker are never labelled New, and why *Clear all plugin data* takes the labels with it. LAN pull is untouched and still blocked on its own decision. `PullModelsModal.tsx`, `mergePullModelCatalog.ts`, `storageKeys.ts`; 25 frontend tests, one new test file. On-Deck **PULL-CUSTOM-01**, **PULL-CUSTOM-02**, **PULL-PIN-01**, **PULL-NEW-BADGE-01** in `docs/testing.md`.
- **Six new suggestion chips, for the things that shipped since early August:** the chip row above the question box had not offered anything new since 2026-08-07, so several shipped features had nothing inviting anyone to try them. It now suggests thinking mode, the kids master lock, the Caveman reply style, where the game tips come from, starting a named chat, and asking about a game that is not currently running. None carry the **Tip** badge, because that badge is a claim the knowledge base covers *this game* and these are questions about the plugin itself; none switch the Ask mode, because a plain answer covers all six. The wording avoids a trailing ``for…`` clause, which the category detector strips and then silently files under strategy. `presets.ts`; one new test case. On-Deck **PRESET-EXPAND-W2-01** in `docs/testing.md`.
- **Corpus point release `2026.08.22` published (133 cards, up from 117):** the published knowledge base was serving `2026.08.16` — the build that predates both the Phase 4 cards and the Ocarina of Time AppID fix, so anyone downloading it got a Stardew Valley session inheriting Zelda's cards and Zelda's spoiler fencing. The new build carries the 16 structured cards and the corrected title row, and is live on both mirrors — [Hugging Face](https://huggingface.co/datasets/qd313/bonsai-knowledge-base) and the `knowledge-base-v1` GitHub release — at identical checksums. Schema stays at **3**, so an installed corpus updates in place with no migration. Published through `scripts/publish_corpus.py`, which gates the push on the D20 licence rules and manifest self-consistency before it will upload anything. Decision **D24**; sequencing deliberately does **not** wait for the schema v4 work behind Phase 4 track 3, which gets its own release.
- **Suggestion chips now prove the knowledge base exists (Phase 4 track 1):** when the corpus covers the running game, **at least one** of the three carousel chips comes from it, badged **Tip**. Chips were rolled independently at about one in three, so `0.7³` — roughly a third of the time — you opened the plugin with a covered game and saw no sign the corpus was there at all. Game chips are preferred over generic Deck tips for the guaranteed slot, and the badge is only on game chips, because a shared Proton tip is not evidence that *this game* is covered. The **last** slot is the one converted, not the first: a contextual reseed picks the first chip for the category you just used, and overwriting that trades one kind of relevance for another. **The chip pool also draws one kind at a time** rather than filling from the highest-priority kind — the Phase 4 cards took Ocarina of Time to six boss cards and its entire pool became six *"How do I beat X?"*, offering six boss names at once to somebody who is only browsing, with its new items and enemies unreachable. Costs nothing where a title's cards are lopsided: Left 4 Dead 2 files seventeen cards as one kind and returns the same six chips, reordered. `sessionRagComposer.ts`, `MainTabPresetAnimatedChips.tsx`, `knowledge_base_service.py`; 12 frontend tests, 3 backend. On-Deck **PHASE4-CHIPS-01** in `docs/testing.md`.
- **Enemy and item cards, and answers that keep their shape (Phase 4 track 2):** 16 new cards for the two sample titles — 6 enemies, 6 items, 4 bosses — written as labelled lines (`Summary` / `Weak points` / `Uses` / `Phases` / `Tips`), and the model is now asked to keep those labels as short bullets rather than melting them into a paragraph, so an answer you are reading mid-fight can be scanned. Corpus 117 → 133 cards. The prompt clause **only fires when a labelled card is actually attached**, so ordinary Asks do not pay for it and prose cards do not grow invented labels. Measured against the real corpus with the embedding model: of 18 questions naming or describing one of the new cards, **none reached one before and 16 do now**; the two misses share no word at all with the card they want. Cards were merged by a validator that rejects duplicate names, unknown labels and British spellings — the corpus stays US-spelled because the vectors are baked from it. `data/kb/strategy_seed.json`, `ollama_prompts.py`; 4 backend tests including one that fails if a structured card grows an unknown label. On-Deck **PHASE4-CARDS-01** in `docs/testing.md`.
- **Ask about a game with nothing running:** every strategy path used to require a launched game, so *"hl2 ravenholm"* with the Deck sitting on the library returned nothing. The plugin now reads the title out of your question — *how do gels work in portal 2*, *drg survivor what class*, *what is the best way to beat volvagia in oot* all reach that game's cards. **A running game always wins:** ask about Portal 2 while Hades is open and you get Hades, because answering about a game you are not playing is the worse failure. Short aliases in ordinary sentences are a known accepted risk (*"this game is hades on my battery"* resolves Hades); report real false positives rather than pre-emptively widening a denylist. Fixing it exposed two hidden faults: Ocarina of Time silently resolved to nothing because its title contains a colon and the two places comparing titles disagreed about punctuation, and spoiler protection could not be looked up by name at all — so a title recognised this way would have been fenced as **unknown**, the one outcome decision **D19** rules out. Both fixed in both languages. `knowledge_base_service.py`, `game_ai_request.py`, `spoiler_title_profiles.py` and its TypeScript mirror. On-Deck **KB-NEWTITLE-01** in `docs/testing.md`.
- **Thinking, on demand:** Ollama tab gains a **Thinking** row — **Off / Brief / Balanced / Deep**, defaulting **Off**. Thinking models can now reason before answering; the three on levels differ by how many tokens are reserved for that reasoning (256 / 512 / 1024), added on top of the reply budget so thinking cannot eat the answer. **bonsAI asks for thinking as a plain on/off, not by name.** Ollama's named `"low"`/`"medium"`/`"high"` levels are a gpt-oss-family feature — qwen3 and deepseek-r1, the thinking models most likely to be on a Deck, accept only a boolean and reject a string — so asking by name would have broken models that genuinely think. The cost is stated plainly: on gpt-oss the three levels differ less than they could. **A model that cannot think at all does not fail your Ask.** Ollama rejects `think` with an HTTP 400, and a plain 400 is not one of the errors that falls through to the next model, so this would have been a hard failure; instead the request is retried once without thinking, that model is remembered for the rest of the plugin session (so the wasted round trip happens once, not once per Ask), and you are told once per model. Decision **D21** in `docs/audit/maintainer-decisions-locked.md`, superseding the mapping locked in `docs/archive/16-soft-num-predict-thinking-budget.md`. `ask_think_effort` in `settings_service.py` / `bonsaiSettingsNormalizers.ts`, `OllamaThinkingEffortRow.tsx`; on-Deck **THINK-EFFORT-04**, **THINK-EFFORT-05** in `docs/testing.md`.
- **Kids master lock:** When Steam reports parental controls **locked** on the signed-in account, bonsAI forces every high-impact permission off for the session (file writes, screenshots/game logs, microphone, Steam ban lookups) and greys the Permissions toggles. Ask, local/LAN Ollama, and the offline knowledge base keep working. Unlock happens in Steam — there is no bonsAI PIN, and **bonsAI does not filter what the AI says.** Lock state is not written to `settings.json`. `steamParental.ts`, `useKidsLock.ts`, RPC `set_kids_lock_state`, `capabilities.py` session flag. On-Deck **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01** in `docs/testing.md`.
- **The knowledge base now covers all thirteen titles (119 cards, up from 39):** Left 4 Dead 2 answers questions about every special infected from both sides of a Versus match, the director, and going black-and-white; Fallout 4 covers settlement happiness and defence, SPECIAL, perks, power armour and fusion cores; San Andreas covers the body stats, respect, gang territory, girlfriends and the collectibles; Ocarina of Time, Hades, Baldur's Gate 3, Red Dead Redemption 2, The Sims 4 and the rest cover their core systems. Four titles are sourced from archive.org WikiTeam wiki snapshots under **CC BY-SA 3.0**, and each card credits its wiki, its licence, and **the date that wiki was read** — several snapshots are years old, and the credit says so rather than implying the advice is current. The remaining titles are maintainer-authored and carry no citation, which is what the trust tier on the card already told you.
- **Three wikis were checked and not used.** The Hades wiki publishes under a **NonCommercial** licence, which this corpus cannot redistribute; the Baldur's Gate 3 wiki is dual-licensed per contributor with no way to tell which pages are which; and the only Red Dead and Sims snapshots that exist are from February 2020, with pages too thin to build a card on. Where a source could not be used, the cards were written by hand instead of citing something that does not say what the card claims.
- **First wiki-sourced strategy cards: Portal 2 and Half-Life 2 (17 cards):** the knowledge base now answers real questions for both titles — gels, faith plates, hard light bridges, excursion funnels and the Wheatley fight; the gravity gun, Ravenholm's traps, Striders, the antlion sand, Combine squads and the airboat helicopter. Every card is written from a source that permits redistribution — [theportalwiki.com](https://theportalwiki.com) under **CC BY 4.0** and [combineoverwiki.net](https://combineoverwiki.net) under **CC BY-SA 4.0** — and each one carries its source link and licence, so **Show details** credits the wiki it came from. Cards are distilled, not copied. They are marked `wiki` rather than `wiki_verified`: we know which wiki and when, but not which game patch the advice was checked against, and the tier says so.
- **Portal 2 and Half-Life 2 recognised as titles:** both are registered in the corpus title table (AppIDs `620` and `220`) with aliases and spoiler profiles, so the plugin now knows what you are playing and says *"KB: none for this game"* instead of failing to match the game at all. **There are no cards for them yet** — that arrives with the deepened seed. Portal 2 is filed as *protect progression* despite being a puzzle game: chamber solutions spoil nothing, but the story turns on a late reveal, and over-fencing a hint is recoverable in a way that spoiling an ending is not. `data/kb/strategy_seed.json`, `spoiler_title_profiles.py` and its TypeScript mirror.
- **Hybrid retrieval kill-switch (Developer tab):** *Knowledge base (dev QA)* gains **Hybrid retrieval (meaning search)**, defaulting on. Turning it off drops knowledge retrieval to keyword-only for the next Ask — no query embedding, no vector fusion — while cards keep attaching normally, and **Show details** reads **Keyword search (hybrid disabled)** rather than *embed unavailable*. That distinction is the point: the two states have different causes, and one label for both would send you diagnosing an Ollama install that is fine. The switch is read **before** the corpus-format gate, so an off switch reports itself even on a corpus that could not have run hybrid anyway. A settings file written before this release has no such key, and a missing key reads as on. `rag_hybrid_retrieval_enabled` in `settings_service.py` / `bonsaiSettingsNormalizers.ts`; on-Deck **KB-KILLSWITCH-01** and **FOCUS-GRAPH-DEV-KB-01** in `docs/testing.md`.
- **Cancel a knowledge base download:** Ollama → Knowledge base now offers **Cancel** while the ~5 GB corpus is downloading; it replaces **Remove** for the duration and returns the row to Download/Update + Remove when the download stops. The backend RPC (`cancel_rag_corpus_download`) and its cancel event have existed since the download shipped — nothing called them, so the only way out of a download was closing the plugin. **This also fixes a D-pad dead end:** while downloading, the primary button is disabled and Remove is not rendered, so the action row previously had no focusable control at all. A cancelled download now reads as cancelled in the status line instead of showing the backend's raw exception text as a red failure. `KnowledgeBaseSection.tsx`, `OllamaTab.tsx`; `KnowledgeBaseSection.test.tsx` (6 tests). On-Deck **KB-CANCEL-01** in `docs/testing.md`.
- **Session RAG preset chips:** Main-tab carousel mixes ~30% offline-KB curtailed prompts (strategy + compat) per slot when the local knowledge base is enabled; reseeds on AppID change, after Ask, and cold mount. RPC `get_session_rag_chip_candidates`; `sessionRagComposer.ts`, `useBonsaiAskOrchestration.ts`. **Frontend shipped ahead of the backend and was corrected before release (2026-08-02):** the RPC was never implemented in `main.py`, so the call always failed and the carousel fell back to static seeds; the adapter now exists and the feature works as described. On-Deck **SESSION-RAG-CHIPS-01** in `docs/testing.md`.
- **Voice STT session daemon:** Session-scoped `whisper-server` on `127.0.0.1:18765` for faster interim mic transcription; CLI fallback when server unavailable; incremental server install for existing CPU-safe `voice_bin`. `voice_whisper_daemon.py`, `voice_transcription_service.py`, `main.py`; tests `test_voice_whisper_daemon.py`.
- **72 blind search questions for twelve new games (no user-visible change):** Black Mesa, Hollow Knight, DOOM Eternal, Doom 64, GTA V, GTA IV, Fallout: New Vegas, Super Mario 64, Mario Kart 64, Paper Mario: The Thousand-Year Door, Pikmin 2 and Super Smash Bros. Melee — six questions per game, written by someone who had not read a single game-note card, the way a real player would actually type them. None of the 341 questions already in the search test touched any of these twelve games before this, so the new notes could not be measured at all. Each question still needs matching to the note that answers it, which is in progress. `tests/fixtures/kb_eval_v2.json`.
- **24 answer-test rows for the same twelve games (no user-visible change):** two questions per game, written after reading the notes, checking that a reply actually uses the facts on the card rather than just that the right card was found. Every one of the 24 attached the note it was meant to attach, run against the full 266-note library. `tests/fixtures/kb_answer_eval.json`.
- **The knowledge-base search test gained a weight sweep, per-question detail, and a second right answer (no user-visible change):** it can now try nine different balances between word-matching search and meaning search in one run and print a table of how each did, without ever looking at the questions held back for the final check; every question's result now records the three notes each kind of search actually returned, in order, instead of only a percentage; and a question can list more than one acceptable note when more than one genuinely answers it. `scripts/eval_kb_embed_models.py`, `tests/test_eval_kb_arms.py`.
- **A Developer tab switch scrambles a streaming answer's newest letters before they settle, the way the
  suggestion chips do:** off by default. Turn it on and the newest stretch of text churns through
  placeholder symbols for a moment before locking into the real letters — three ways to settle (after a
  moment, at the chip's own pace, or a fixed tail of ten letters) and four colours for the still-scrambled
  letters, all in a new *Animations* section on the Developer tab, where the existing *Preset suggestions*
  picker now also lives. It costs no extra frames on its own: the settled text draws through the normal
  path, and the churning tail is written straight to the screen, the same trick the suggestion chips use.
  Reduced motion turns it off outright; Stop settles every letter at once; closing and reopening the panel
  mid-answer shows everything so far as plain text. `streamScrambleContext.ts`, `ScrambledAnswerText.tsx`,
  `DeveloperTab.tsx`. On-Deck row **DEV-01** passed; rows **SCR-01** through **SCR-08** in
  `docs/testing.md` — the look itself, reopening mid-answer and reduced motion still owed to the
  maintainer's own check.

### Changed
- **A finished answer's Show details panel can now hold two tabs instead of a separate box below the
  chat:** the "Session context (N turns)" box used to sit on its own, under a separate closed line.
  Now, opening Show details on the newest answer shows two tabs, "This answer" and "Session," switched
  with Left and Right. The chip row people already know stays exactly where it was, under "This
  answer." Clear now sits at the end of the Session tab as a full-width button, instead of in that
  box's own header. Up from either tab leaves to Hide details, Down enters whichever tab is open, and B
  closes the whole panel from anywhere inside it. `MainTabChatTranscript.tsx`. On-Deck row owed: still
  to be run, see `docs/archive/62-feature-session-five.md`.
- **The AI models screen: every filter now sits behind one Filters button, and the screen frees up
  room for more of the model list:** the two rows of filter chips and the separate Policy section are
  gone. One line now reads "Filters · N on"; pressing it opens a panel listing licence (open source
  only / also open weight / anything installed — this replaces the old Policy buttons and now actually
  hides models the list shows, not just a warning box on pull), Speed, Strategy, Expert, Vision,
  Installed only, Essentials only, and a new Recently added filter. Riding along: the Suggested-models
  chips moved into that same panel, Advanced is now a link instead of a row of buttons, typing a model
  name by hand is one chip instead of a permanent box, and the small refresh button in the counts line
  is smaller. **Worth knowing:** on the default "open source only" setting the list now shows 17 of 26
  models instead of all 26 — see the open item in `docs/roadmap.md` about whether that is wanted.
  `PullModelsModal.tsx`, `OllamaModelsHubModal.tsx`, `ModelPolicyTierPanel.tsx`. On-Deck row owed:
  **MODELS-FILTERS-01** in `docs/roadmap.md`.
- **Read aloud is now a small speaker next to Helpful / Not really, not its own full-width line:**
  the speaker sits quiet at the right-hand end of that row until the D-pad ring reaches it, then
  turns full strength, the same treatment as the microphone in the Ask box; it turns into a red stop
  while the Deck is talking. It still appears on an older answer with no thumbs row, and the row
  still lets Left/Right through to it when the thumbs are greyed out. Measured on the Deck before
  the change: taking the old line out gives back 29 pixels on every finished answer.
  `buildReplyActionsElement.tsx`, `icons.tsx`. On-Deck row owed: **READ-ALOUD-07** in
  `docs/roadmap.md`; still owed by eye: how quiet the speaker looks at rest, and what it does on an
  answer stopped part-way through.
- **The suggestion chips above the question box now look like real buttons:** each one has a soft
  shadow beneath it and a thin light line along its top edge, so it reads as raised rather than flat;
  the two chips sit a little further apart, and in most animation modes there is now some open space
  between the chips and the question box below them, where before they touched. The word "Tip" is now
  a small dot instead of a word, and the accent colour on the tags and on the resolving-text label is
  quieter. The chip the controller is on now shows a light bar along its bottom edge instead of a
  blue line. **The ring Steam draws around a focused control was invisible on chips ever since
  2026-09-01 and is replaced by the bar** — the row's own edge was cutting the ring off, so nobody
  could actually see it. `presetRowLayout.ts`, `section-4.ts`, `section-6.ts`,
  `gamepadAndPullModels.ts`, `characterUiAccent.ts`, `MainTabPresetAnimatedChips.tsx`. On-Deck rows
  **CHIP-BUTTON-01** to **09** in `docs/testing-manual.md`.
- **The tab strip that opens over the tab bar has been redrawn:** when you open it, the six tabs are
  now six equal cells with one matching icon each; only the tab you are on shows its name, in
  lowercase small capitals, in your accent colour; the highlighted cell is a soft rounded fill with
  no hard box; the LB and RB hints are now small rounded pills, the same shape already used lower
  down on the chat screen; and the bar itself is solid, with a soft shadow, instead of being
  slightly see-through. The strip is also taller than before (66 pixels instead of 54) so it now
  fully covers the row of dots on the chat screen that used to peek out underneath it. The Main
  tab's icon is now the plugin's own logo. Opening, closing and every button that switches tabs
  work exactly as before. `TabIndicatorBar.tsx`, `tabIndicatorBar.ts`, `tabTitles.tsx`, `icons.tsx`,
  `characterUiAccent.ts`, `constants.ts`. Owed on the Deck: **TAB-STRIP-2A-01** through
  **TAB-STRIP-2A-07** and the free-play sweep **QA-FREE-PLAY-01**, in `docs/testing.md` /
  `docs/testing-manual.md` — not run yet, the device is held by another session.
- **The Ollama tab's "Open AI models…" button is now "Manage AI models…":** the old wording read like a
  company's own models rather than the plugin's own screen. `OllamaTab.tsx`, `PullModelsModal.tsx`.
- **A Strategy answer about a named thing gives its advice first, then the menu (behaviour change):** before, a reply like this opened with a short bit of orientation and then offered the same menu of what to do next; it now gives the note's own advice first and offers the menu after. Measured on 61 questions, three runs each, both shapes on the same build with the same checks: the answer keeps more of what its note said (76.6% to 79.5%), hides spoilers when it should far more often (77.8% to 88.9%), comes out clean on all three runs more often (60.7% to 67.2%), and is twelve words shorter (103 to 91) at the same speed. One thing got worse — replies that contradict their own note, 94.4% down to 90.7% — but that is one extra question, not a spread, and both failing questions are the Pikmin 2 day limit, already an open problem either way. The maintainer read these numbers and took the change. `ollama_prompts.py`. Row **KB-ANSWER-03** in `docs/testing.md`; a device read is still owed.
- **Preset chips on one row, two side by side, with scrolling labels:** the suggestion block under the transcript is one 30px row holding **two chips side by side**, and a suggestion longer than its chip **scrolls sideways** — Steam's own long-title crawl, slow and calm, with the **Tip** / **Test** badge pinned at the left so it stays readable. The row keeps the height the 2026-08-31 change bought (block 118 → 34px, dock 245 → 161px, transcript reading area 371 → 455px measured on device) and fixes the shape that change got wrong: it showed **one** chip, and the maintainer filed it the day it shipped. The redesign drawing has **three**; the maintainer chose two on 2026-09-01 (decision **D43**) because three left about 12 characters per chip on the 300px column and two leave about 20 — enough to recognise most suggestions without waiting. The **How to use bonsAI** chip now owns the whole row until it is dismissed, then the suggestions take over. Per mode: **carousel** is a sideways window that slides new chips in from the right, with Left at the edge pulling earlier chips back; **fade** went back to a slow out / quicker in while the other chip stays put; **static** and **decode** drive both chips, and a decode chip only starts scrolling once its scramble has settled. Two things the narrower row would have broken were fixed with it: the corpus **Tip** guarantee now lands on a chip that is on screen (it used to convert the third seed, which would have been hidden), and a pinned QA batch walks in order across both chips without showing an entry twice. Reduced motion, or Steam ever hiding the scrolling component, falls back to a cut-off label whose ellipsis now actually works — the old inline label could never truncate and a 59-character game chip ran 86px past the column. `MainTabPresetAnimatedChips.tsx`, `MainTabPresetRow.tsx`, `presetRowLayout.ts` (new), `presetSlotRotation.ts` (was `singleSlotRotation.ts`), `carouselState.ts`, `sessionRagComposer.ts`, `section-4.ts`; **On device the same night:** the row's geometry passed (row 02), and the first D-pad run caught Steam navigating the row as a column — Left walked out of the plugin onto the Quick Access rail — so every chip now carries its own Left/Right/Up/Down: Left and Right walk the chips (and, in carousel mode, slide earlier chips back into view), Down goes to the Ask field, Up to the session strip, and the ends hold still. Chips scrolled out of the carousel window are no longer focus stops, entering the row lands on the marked chip, and the Ask text field now registers a Steam nav node so hops into it from a chip, the help chip or the avatar use Steam's own transfer rather than a plain focus that left the ring behind on a freshly opened panel. Row 03 passed in carousel mode, including a 14/14 fresh-panel re-run on 2026-09-02 (`runs/PRESET-ONE-LINE-03-*.json`); rows **01b / 04** in `docs/testing-manual.md` are still owed. Plan and width research: `docs/archive/29-preset-row-three-thirds-plan.md`.
- **Junk questions stop getting game cards from the vector half (behaviour change):** with a game running and Strategy mode on, ordinary phrases like *"please repeat that"* and *"what time is it"* were getting that game's cards stapled to them through the vector recall pass, because junk and genuine questions score in the same similarity range and no floor value can separate them (measured twice, 2026-08-18 and 2026-08-23). Relevance now needs a **second signal**: the recall pass only attaches cards when the game's best card either *stands out from the rest of that game's cards* by 0.0395 cosine or clears the floor by that same amount — a junk question is roughly equidistant from everything the game knows, so it fails both, while a genuine paraphrase singles a card out and a broad "how do I play this" question scores high outright. Measured before shipping on the seed corpus: all six D28 ordinary phrases now get zero cards from the vector half, the `kb_eval_v2` tune and troubleshooting slices are unchanged to the decimal, and D25's short questions (*"the boss"*, *"gels"*) keep their cards. The two phrases that attach through the **keyword** half (*"thank you very much"*, *"what time is it"*) still do, by design — `BM25_RELEVANCE_FLOOR` stays 1.0 under D25/D28. `VECTOR_RECALL_POOL_MARGIN` in `knowledge_base_service.py`; measurement in `docs/audit/kb-second-signal-2026-08-28.md`; on-Deck re-check owed on **KB-SPELLING-01** in `docs/testing.md`.
- **Reply style Short → Caveman:** Ollama **Reply style** slider is now **Caveman / Balanced / Detailed**. Caveman uses terse full-accuracy prose coaching (caveman-skill full); character voice wins when AI characters are on (Caveman inject skipped). Legacy `reply_verbosity: "short"` migrates to `"caveman"`. Does not change `num_predict` or thinking blurbs. On-Deck **REPLY-VERB-01** in `docs/testing.md`.
- **RAG retrieval-quality remediation PR2 closed:** `kb_eval_v2` is signed off (221 queries / 140 labeled), the schema-v3 seed rebuilt (119 sections / 124 tips), and the three-way bake-off on holdout reports **no separation** between keyword and RRF under the non-overlapping-CI rule. Equal fusion weights and the loose BM25 floor are locked; hybrid stays on by default with the existing kill-switch. Superseding report: `docs/archive/research/kb-retrieval-pr2-bakeoff-2026-08-09.md`. The 2026-07-31 “keyword beat hybrid” headline is retired.
- **Game tips no longer depend on which Ask mode you picked (behaviour change):** strategy cards only attached in **Strategy** mode. The same question, about the same running game, got cards in Strategy and nothing at all in Speed or Expert — with Expert being the mode you are most likely in when stuck on a hard fight. Ask mode still decides **how many** cards attach (Speed 1, Strategy 3, Expert 5); it no longer decides whether the knowledge base is consulted. Two guards keep the wider route from becoming noise: an Ask that never declared itself to be about the game clears a higher relevance bar, and no longer receives the generic genre card as a consolation prize, so an ordinary Ask that merely happened while a game was open does not grow a boilerplate strategy block. Decision **D17**; on-Deck **KB-ASKMODE-01** in `docs/testing.md`.
- **Troubleshooting tips now attach to questions asked in plain English (behaviour change):** the shared tip sheet was only searched when your question contained the literal word **deck** or **proton**, or matched one of about six preset phrases. Measured against 40 freshly written troubleshooting questions, **3 reached it** — and of the 19 phrased the way somebody actually types, **none** did. That left roughly 24 of the corpus's 27 topics unreachable by anything a user would plausibly write, including SD card storage, Steam Input, anti-cheat, streaming, VR, Wine and emulation, each with 6–10 tips already shipped behind it. An Ask now reaches the tip sheet when it **names a topic the corpus covers**, however it is phrased: 39 of 40, and 13 of 13 on a holdout set whose queries were not read while the rules were written. Strategy Asks are unchanged, and **no strategy question in a 107-query set is routed to troubleshooting**. The old phrase gate is untouched — it also drives Proton log attachment, prompt framing, stream tags and the permission hint, so this is a **separate, additive** check that only the knowledge base reads; you will not start seeing the Proton-logs permission prompt on more Asks. New `compat_topic_router.py`; `tests/test_compat_topic_router.py` (9 tests, including one that fails if a corpus topic has no way to be reached). Decision **D16** in `docs/audit/maintainer-decisions-locked.md`; on-Deck **KB-ROUTER-01** in `docs/testing.md`.
- **Knowledge base retrieval is now genuinely hybrid (breaking for installed corpora):** what shipped as "hybrid" in Phases 2–3 was a cosine-only re-rank that replaced the keyword order rather than combining with it, and it appended cards with no vector *behind every scored card* — so the best keyword hit in the corpus sank below a marginal cosine match whenever its vector was missing. Ranking is now reciprocal-rank fusion over the keyword and vector orderings, on the strategy and troubleshooting paths alike. Alongside it: a **BM25 relevance floor** so weak matches are no longer injected and cited on essentially every Strategy Ask; column weighting so a card whose *title* matches outranks one that merely mentions the words; and stopword filtering, because an OR over `how`/`do`/`i` scored whichever card repeated them most. **Corpus schema 2 → 3 and existing corpora must be rebuilt** (`python scripts/build_rag_db.py --seed`) — v3 embeds documents with the `search_document:` task prefix that production was never applying, and a v2 corpus is indistinguishable from a v3 one except by the new manifest `embedding_variant`, so the plugin refuses hybrid and falls back to keyword with **Keyword search (embed unavailable)** until you rebuild. Retrieval keeps working in keyword mode throughout. Remediation PR1 Stages 1–5; plan in `docs/rag-retrieval-quality-remediation-implementation-plan.md`, before/after table in `docs/knowledge-base.md`. Fusion constants locked by the PR2 bake-off (2026-08-09; equal RRF weights, loose floor). On-Deck **KB-RRF-01**, **KB-VARIANT-01**, **KB-FLOOR-01**, **KB-FOLLOWUP-01**, **KB-TRANSPARENCY-01** in `docs/testing.md`; **KB-SMOKE-02/04 re-opened**, since PR1 changed the behaviour their Verified evidence described.
- **Preview-suite evidence now prunes itself (no user-visible change):** `run-preview-suite.mjs` keeps the 3 newest run folders per batch and deletes older ones, never removing a run cited by a doc or the run it just wrote. Batch summaries also **merge per scenario id** instead of being replaced — the run folder is keyed by date + commit, so a `--filter` re-run used to overwrite an earlier full run's roll-up while leaving its case directories in place, which is why `tier2/2026-05-26-9e20a82` claims 1 result beside 8 case directories. New `ranThisInvocation` / `carriedFromEarlierRun` fields make a filtered run legible. Three unreferenced no-signal runs pruned (two `hookSmoke` harness timeouts, one all-skipped `deckOnly`); see `docs/testing.md` § Evidence retention.
- **Install voice engine:** Podman build compiles `whisper-cli` + `whisper-server` in one pass; **VOICE-05**–**VOICE-07** QA rows in `docs/testing.md`.
- **RPC calls now time out (behavior change):** Frontend RPCs go through `callDeckyWithTimeout` (15s, `DECKY_RPC_TIMEOUT_MS`) instead of raw `call()` — settings load/save, Ask submit, background-ask status/abort, intent packs, strategy checklist, reply language, screenshots, voice status, desktop debug notes. **A hung backend now surfaces a timeout error where the UI previously waited indefinitely.** Four long-running calls deliberately stay unbounded and are commented in place: `clear_plugin_data`, `install_rag_corpus_local`, `start_voice_transcription`, `stop_voice_transcription`. On-Deck QA: **RPC-TIMEOUT-01** in `docs/testing.md`.
- **Agent architecture snapshots:** `module-map.json` renamed `hotspots.json` (it is a size ranking, not a dependency graph) and a real `import-graph.json` added — importers/imports for every `src/` TS file, plus cycle and orphan detection. Both regenerate via the existing pre-commit hook. Anything reading `module-map.json` must be updated.
- **Fourteen long code files split into smaller ones, and four of the big background documents trimmed
  (no user-visible change):** behind the scenes only — nothing a person using the plugin would notice.
  Fourteen files that had grown past a comfortable size — the back end's front door, the chat transcript,
  the model download window, the plugin's main screen, the Ask logic, the style sheet, the Ask bar, the
  where-the-AI-runs settings, the animated chips row, the knowledge-base service, the prompt builder, the
  AI service, voice transcription and the question builder — went from 18,767 lines of code to 11,521
  overall; most came out between a tenth and two thirds smaller, not half, because their screen-drawing
  code and one long question-building function cannot move without a rewrite. The testing rows, the
  manual Deck checks, the locked-decisions file and the long notes behind roadmap entries went from
  975,989 to 417,563 bytes together, 57% less to read before any work is marked done. A new check now
  stops any code file over 800 lines from growing back. Confirmed on the Deck 2026-09-24 (build
  `cabda5dd`, later `b56de863`): deploy, the load log, a free-use pass, the chip row, the reply buttons,
  voice, the AI models screen, Where the AI runs and Settings all still work. One real regression from
  the move was found and fixed the same night — the Desktop activity log had stopped writing any lines —
  and a re-check on the fixed build confirmed it writes again. `docs/archive/65-trim-docs-split-long-files.md`.
- **Answer text sits a little closer together, buying back room for more of a reply to show at once:**
  line spacing on answer text went from 1.4 times the text size down to 1.25 — about two extra lines
  visible on a 20-line answer — and the model's live thinking is now smaller, dimmer, italic type with its
  own tighter spacing, so more of it fits in the same space. `section-6.ts` (answers); the live-thinking
  styles (thinking).

### Removed
- **Two re-export shims (no user-visible change):** `refactor_helpers.py` and `src/utils/settingsAndResponse.ts` held no logic — only forwarding — and hid which module a consumer actually depended on. Their 9 and 22 importers now name `backend.ollama_routing` / `ollama_urls` / `tdp_intent` and `bonsaiSettingsSchema` / `bonsaiSettingsNormalizers` / `settingsPayload` directly. Deploy scripts and the zip verifier no longer ship or require `refactor_helpers.py`. Tests follow their subjects: `test_refactor_helpers.py` → `test_backend_helpers.py`, `settingsAndResponse.test.ts` → `settingsContracts.test.ts`. `settingsPayload.ts` also gives up its reply-text formatting to a new `appliedTuningText.ts`.
- **Dead backend from removed features (no user-visible change):** the five Proton experiment journal RPCs and `proton_experiment_journal_service.py` (the journal UI went on 2026-07-30; its file wipe moved to `plugin_data_reset.py`, which **Clear all data** still needs), `thinking_tiny_model_service.py` (no importer anywhere), `log_navigation`, the legacy `capture_screenshot` RPC and the gamescope helper only it called, and the TDP sysfs **write** path — `apply_tdp`, `write_sysfs`, `append_sandbox_sysfs_write` — which nothing but its own test had reached since TDP became suggestion-only. TDP reads and clamp bounds are unchanged. `tests/test_tdp_sandbox_sysfs.py` becomes `tests/test_tdp_service.py`; the `UNIT-B-pytest-sandbox-tdp` preview gate follows it. RPC surface 57 → 50.
- **`src/config.ts`** and its `scripts/build.sh` generator (`do_generate_config`), plus the now-unused `PC_IP` build preflight. The exported `HostIp`/`PcIp` constants had no importers; `PC_IP` remains a runtime `.env` value.
- **`src/v0-drafts/`** — 56 untracked v0.dev scaffolding files, excluded from build, typecheck, tests, and the agent module map. Archived outside the repo before deletion.

### Fixed
- **A long Strategy question no longer throws away the game notes it was given:** with the character voice on and thinking turned up, a question could grow large enough that the plugin sent more than the model's window could hold. Ollama does not reject an over-long request — it quietly drops the *start* of what it was sent, which is exactly where the assistant's identity, its rules, and every attached game note live — and answers from memory instead, while the app still said the notes were attached. **Now, when a question will not fit, the answer gets shorter instead of the notes being dropped.** The extra thinking time is left whole; only the visible answer is trimmed, never below a floor, and a log line records that it happened. Three smaller cuts came first and were not enough alone: the model is no longer asked to wrap answers in a marker nobody reads (it obeyed once in 89 recorded answers, and nothing on screen shows it), and the three sentences about reading a screenshot only go out when a screenshot is actually attached — together they saved about 360 tokens. Moving the notes nearer the question was tried and dropped: it placed the spoiler warning correctly far less often, so the order is unchanged. **Measured on a test run shaped like the maintainer's own settings:** 22 of 37 questions used to lose the start of their prompt; now none do. **Confirmed on the Deck** with the character voice on, thinking at medium, Hades running: asking about Megara, a boss with a note, got dash patterns, punishing her while she recovers, and burst-damage boon advice — real note content — and the log showed the reply budget trimmed from 2,112 to 1,800 tokens so the prompt fit, with the old silent-drop warning gone. **One correction worth recording:** the roadmap entry for this bug used to point at a different Hades boss, the Bone Hydra, as its proof. That boss has no note in the library, so a generic answer to that question was always the right behaviour and never actually showed the bug; the real evidence is the 22-of-37 count above and three Deck questions that went over the window by 703, 780 and 712 tokens. Comparing the same 37 questions before and after (one early run looked alarming on its own; three runs together read as noise): facts kept from the note 92.9% to 91.9%, spoiler warning placed correctly 93.3% to 97.1%, follow-up menu shown 100% to 98.2%, and the prompt itself shrank from 6,930 to 5,682 characters, with no question losing the start of its prompt across 183 samples. `ollama_service.py`, `ollama_prompts.py`. On-Deck **KB-PROMPT-FIT-01** in `docs/testing.md`.
- **Retry works on a reply that came back after a restart:** reopen bonsAI after the plugin has restarted and your last conversation is drawn again, question expanded, with a live **Retry** badge beside it. Pressing it sent nothing at all — a *Nothing to retry* toast and no question. The badge was asking the session for the question rather than the turn it is drawn on, and the session snapshot deliberately does not survive a restart, while the saved chat comes back from Python and redraws the turn. So the turn was on screen and its question was not. A stopped reply already had the same hole, because stopping also empties that snapshot, and had been given its own special case; both are the same case, so there is one path now and the newest expanded turn always re-asks the question it carries. Passing the question that way also makes the ask clear any pending follow-up chip itself, which is the clean-up the old path was doing by hand, so nothing is lost. **One behaviour that used to be an accident is now a rule:** a reply stopped before any text arrived still shows no Retry badge — that used to fall out of the old routing handing down no handler at all, and is a stated condition now. Found and fixed 2026-09-06, confirmed on the Deck the same day: badge pressed with the controller, and the log recorded a real request carrying that question's length where the old build recorded nothing. `MainTabChatTranscript.tsx`; one frontend test that fails on the old code. On-Deck **RETRY-RESTART-01**.
- **The question bubble lines up with the answer below it:** the bubble showing what you typed sat further in from the left than the answer sat from the right, and the mismatch is what looked lopsided. Both are capped as a share of the row and they disagreed — the answer stops at 92%, the question stopped at 88%. On the 290-pixel row that was 23 pixels of space beside the answer and 35 beside the question. They are now both 267 pixels wide and mirrored, taking 12 pixels of the empty strip back. Some inset is kept deliberately: with none, a question would be indistinguishable from an answer. Reported by the maintainer, measured on the device before and after. `section-6.ts`. On-Deck **CHAT-BUBBLE-MIRROR-01** in `docs/testing.md`.
- **Clear all plugin data now clears all of it:** three flags remembering that the plugin had already warned about a knowledge base problem survived the wipe, because they are spelled with an underscore where everything else the plugin stores uses a colon, and the wipe only looked for the colon. What a person got was a fresh start that was not fresh — after wiping everything the plugin still believed it had warned them, so it stayed quiet when it should have spoken up. The wipe now matches the bare word, which catches both spellings and clears the old ones off devices that already carry them; the pull picker's New labels go with it. Found because the maintainer asked for the wipe to be best-effort. `clearBonsaiBrowserStorage.ts`; 3 tests. On-Deck **CLEAR-ALL-PREFIX-01** in `docs/testing.md`.
- **The question you asked is no longer cut off after half a line.** Open a turn and you see the whole thing you typed, wrapped over up to five lines with the last one fading out; close it and it goes back to a single line. It was being cut twice — once in the code at 60 letters and again by the one-line rule at about 48 — so the second cut always won and you never saw more than half a sentence. Decision **D60**.
- **Stopping a reply now says it stopped.** Pressing *Stop generation* kept your partial answer but showed no sign anything had happened, and the turn lost its *Helpful*, *Not really* and *Retry* buttons. The notice now stays on the turn once it settles, the three buttons come back with it, and *Retry* re-asks that turn's own question instead of whatever was left in the box.
- **A quick question in Speed mode no longer pays for the slow search it was meant to skip.** Speed does the fast keyword lookup and nothing else, which takes about a second off every Speed question on the Deck. The trade, chosen by the maintainer: a Speed answer loses the background cards that only the slower search finds. Strategy and Expert are unchanged. Decision **D62**.
- **A follow-up question from one chat no longer appears while you are reading another.** Ask a Strategy question in one chat, switch to another before the answer lands, and the first chat's *Where are you at in...?* picker used to show up in the second. It is now tagged with the chat that asked for it and hidden anywhere else, so switching back brings it home.
- **A follow-up question names the game instead of showing three dots.** The picker asked *"Where are you at in … ?"* because the example in the prompt literally contained those dots and the model copied them. The example is now a real one, and a picker that still has a hole where a name belongs is dropped rather than shown.
- **The line under the question box knows a game is running before you ask anything.** It read *no active game detected* for as long as you looked, even with a game open and its suggestion chips already on screen, because it only ever refreshed when you asked something. It now checks the moment the panel opens.
- **An answer paragraph no longer takes the highlight while it is hidden behind the bottom bar.** Walking down a reply could land on a paragraph with only a third of it on screen, covered by the suggestion chips one way and the question box the other. The step that lifts it clear now tries again at 300 and 900 milliseconds rather than giving up after the first attempt.
- **A part of the panel that is closing can no longer switch off the part that is on screen.** The table that hands the highlight between the panel's parts is keyed by name, and a departing copy used to delete whatever was stored under its name — including a live one that had just registered. When that happened, a press was reported as handled and nothing moved. This is the suspected cause of the panel getting stuck with the Ask button out of reach; that fault has not been reproduced on demand, so it stays on the bug list until the device shows it gone.
- **A troubleshooting question with game logs attached can no longer overflow the model's memory:** the Deck's model reads at most 4,096 tokens at a time, and an ask that attached Proton logs could send six times that. The model does not complain when that happens — it quietly drops the *start* of what it was sent, which is where its rules, your settings and the knowledge-base cards sit, and answers from the tail. Attached log excerpts are now capped at 4 KiB (error lines first, newest last; the collector still scans the same 96 KiB to find them), the previous answer pasted into a follow-up chip is capped at 1,500 characters, and the plugin log gets a warning whenever a request would still not fit. Decision D46.
- **Spoiler fences stopped wrapping harmless tactics on games with no story and on bosses you named:** a Strategy answer about the Tank in Left 4 Dead 2, or Theseus and Asterius in Hades, used to open with a spoiler box around a line like *"This guide focuses on general tactics against the Tank"* — every time, on the Deck's own model. The prompt told the model where a spoiler block "must appear", which a small model reads as an order to have one. On titles with no story to protect, and on turns where you named the thing you are asking about, that wording is now one plain "do not use spoiler fences" line. Measured with the new answer test (`scripts/eval_kb_answers.py`, decision D45): 28 of 96 such answers fenced before, 3 of 96 after, and questions about endings still get their fence. Story games where you did not name anything are unchanged.
- **The meaning half of search never actually searched:** what shipped as hybrid retrieval only *re-ordered* whatever keyword search had already found, so a question phrased differently from the card could not reach it — there was nothing in the list to re-order. The vector half now searches the resolved game's cards itself and the two real lists are fused, so a card sharing no keyword with your question is reachable. On the labelled strategy rows, top-3 went **95.9% → 100.0%** with zero regressions, and all four queries that failed on-Deck now attach. The floor was measured rather than guessed, and the two distributions **overlap** — no cosine threshold separates relevant from off-topic, so precision is carried by the route gate, not the floor, and that is written down rather than left to be rediscovered. Gated to the explicit route, so an Ask that merely happened while a game was open pays no embed round trip. `docs/audit/rag-vector-recall-floor-2026-08-18.md`; on-Deck **KB-RECALL-01**.
- **Expert mode was the strictest mode about what counted as a match:** it is the mode you pick when you are stuck, and it carried the largest card budget (5) *and* the highest relevance bar (4.0 against Strategy's 1.0) at the same time — so it attached **fewer** cards than Strategy on the same question. Expert is a declared statement that the Ask is about the game, so it now takes the explicit route like Strategy. On-Deck **KB-EXPERT-01**.
- **Troubleshooting answers came back about the wrong thing:** the router already worked out that *"the game only responds to the touchpad and ignores the sticks"* is a Steam Input question — then threw that away and searched all 124 tips, returning a screen-resolution tip that happened to contain the word *"ignores"*. Measuring it changed the fix: the right tips were not losing on rank, they were **absent** — none of the 8 storage tips and none of the 10 Steam Input tips ever reached the shortlist, because those questions share no words with them, and you cannot prefer a card that was never a candidate. The matched topic now pulls its tips in first and prefers them second. Test sentences 1 of 4 → **4 of 4**; scored set 81% → **100%** with an embedding model and 96% without, so the fix does not need one. **A preference, not a filter** (decision **D22**): *"my windows game shuts itself the moment the loading screen appears"* routes to Proton and the Windows-Steam tips still win, because the question says *windows* outright — pinned by a test, so raising the weight later cannot quietly turn it into the filter that was rejected. On-Deck **KB-ROUTER-02**.
- **British spelling found nothing, and you could not ask for "the boss":** *"armour"* returned nothing where *"armor"* returned the card — the search stemmer normalises word endings, not spelling variants, and every card is written in US English. Both spellings now go into the search rather than one replacing the other, so it works in either direction, and ordinary words are untouched (*our team*, *four hours*, *one sentence* gain nothing). Separately, a card knows it is a boss but that label was never searchable, so *"how do i beat the boss"* found nothing on a title whose boss card was sitting right there. A generic kind word now pulls that game's cards of that kind into the running — **query-time, with no corpus change**, so it reaches a corpus already installed (decision **D25**). Narrowed the same week: the preference applies only to kinds keyword search missed entirely, because the recall returns cards in authoring order and preferring that arbitrary slice outranked real matches — *"how do i beat the water temple boss"* was returning three *other* bosses and dropping Morpha, whose card opens with those exact words. On-Deck **KB-SPELLING-01**, **KB-TYPE-01**.
- **A Stardew Valley player was getting Ocarina of Time's cards — and its spoiler fencing:** the corpus row for Ocarina of Time carried AppID `413150`, which is Valve's real Stardew Valley ID. Reproduced before the fix: a Stardew session asking *"how do i make more money on my farm"* attached **three Zelda cards**, and the spoiler layer returned *protect progression*, so their answers were fenced as if they were about a story game. Ocarina of Time has no Steam AppID — it is an N64 title played through an emulator or Ship of Harkinian, both recognised by name — so the row now carries none, with the canonical title added to the alias table. Protection survives by name, which the D19 work had already built. **Thirteen rows of the approved eval set** identified an Ocarina session by that borrowed AppID and were re-keyed by name; every arm on every split scored **identically to the decimal** before and after, so the set still measures what it measured (decision **D26**). Four TypeScript tests used the same AppID as a stand-in for *any* narrative title and kept passing after the change for the wrong reason — the title had become *unknown*, which also does not unwrap a fence — and were repointed. On-Deck **KB-APPID-01**.
- **The tool that scores retrieval quality had two faults of its own (no user-visible change):** neither affected the plugin; both affected what could truthfully be said about it, which matters because these numbers are the evidence. **Half of it could not run at all** — a required argument added on 2026-08-18 was never passed at two of four call sites, so any run including the model comparison stopped with an error before scoring a single question, and three days of runs had used the flag that skips those. And **122 of 124 troubleshooting tips were scored against the wrong card's meaning**: tips and game cards are numbered independently and both numbers were used as one lookup key, so a game card's vector overwrote the tip's. Production never had this — it stores the two in separate tables. Corrected, on troubleshooting tips meaning-search scores **67.5%** where the tool reported 12.5% and fusion **72.5%** against keyword's unchanged 65%; across labelled tuning rows fusion is **94.1%** where the tool reported 89.2%, against keyword's unchanged 88.2%. The keyword arm uses no vectors and is identical to the decimal in both runs, which is what confirms the diagnosis rather than leaving it a story. **The ship-gate half still cannot separate the approaches** (n=36, 83.3% either way) and the correction did not change that. Earlier reports keep their numbers and carry a correction banner rather than being quietly rewritten. `scripts/eval_kb_embed_models.py`; report `docs/archive/research/kb-embed-bakeoff-2026-08-21-arms.md`.
- **Wiki sources were credited nowhere, on any reply:** the corpus records a source URL and licence per card, retrieval collects them for exactly the cards that reached the model, and **Show details** then discarded every one of them — the chip kept only entries that were plain strings, and retrieval has always emitted structured records. So the two Ocarina of Time cards carrying a `CC-BY-SA-3.0` credit showed no credit at all. Sources now reach the chip as their own field: the site is named, its licence beside it, and the specific cards under it, grouped so one wiki behind three cards reads as one credit rather than three. A reply built on licensed material is marked **on the chip's outline, which is drawn whether or not the chip is selected** — the fill is not, so a credit that lived only in the fill would have been invisible until you went looking. The accent is deliberately outside the model-licensing palette, which already uses amber for open-weight models. Cards we wrote ourselves credit nobody and add no ornament. `transparency_service.py`, `ContextChipLadder.tsx`; `tests/test_source_attribution.py` (19 tests), `contextChipsFromSnapshot.test.ts` (5). On-Deck **KB-ATTRIB-01** in `docs/testing.md`.
- **Naming a boss in the way people actually type it did not count as naming it:** the plugin keeps direct tactics unfenced for an entity you asked about by name — but the code that worked out *what* you named only understood full sentences like *"how do I beat the Tank"*. On a controller people write the name first: *"wheatley fight"*, *"witch how to not startle"*, *"spitter goo placement"*. Measured against 169 written-blind eval queries, 100 name their subject and **8 were recognised**, so the rest were fenced as though you had asked nothing — and four captured a stray word instead, which unfenced content you never asked about and put that word into the prompt as the thing you asked about. Name-first phrasing is now read, doubtful captures are rejected rather than used, and when knowledge-base cards are attached their titles are matched directly, which is exact rather than guessed. **You may notice fewer spoiler fences on bosses you named** — that is the intended behaviour finally reaching the phrasing most people use; nothing you did *not* name is unfenced. Two matching bugs went with it: `kill` matched inside `skill`, so *"how to raise a skill fast"* thought you had asked about "fast", and *"fire boss that flies out of holes"* — deliberately avoiding the boss's name — thought you had asked about "fire". `ollama_prompts.py`, `game_ai_request.py`; `tests/test_asked_entity_extraction.py` (25 tests). On-Deck **STRAT-ENTITY-01** in `docs/testing.md`.
- **A question about one game could be answered with another game's tips:** when the running game was not in the corpus, strategy search fell back to a corpus-wide query and returned the best keyword match anywhere in it. Asking *"how do I beat the tank"* while playing something the corpus has never heard of produced Left 4 Dead 2's Tank card — confident, well-formed, and about a different game. Search is now scoped to a resolved game or does not run; the unresolved case already had a generic fallback behind it, so nothing loses an answer it was entitled to. `tests/test_knowledge_base_service.py`.
- **Follow-up Asks searched the follow-up header, not your question:** the reply-refinement path prepends a fixed context block to the question before it reaches retrieval, and with a 12-token cap in front of it the search became `REPLY FOLLOW UP CONTEXT The user is refining their previous Ask …` — byte-for-byte identical on every follow-up, with none of what was actually asked. Retrieval now searches the user's own text; the model still receives the header. Related: the app name is no longer appended to a search already scoped to that game (it was pure noise that favoured cards repeating the title), and on the unresolved-game path it is prepended rather than appended, where the token cap had been silently discarding it. On-Deck **KB-FOLLOWUP-01** in `docs/testing.md`.
- **Knowledge base transparency could describe context the model never received:** `kb_attached` and its source citations were recorded from the retrieval result *before* the context blocks were stacked under their shared 100 KiB budget. Proton logs take that budget first and can be capped at 96 KiB, so **Show details** could report the knowledge base as attached, and cite its sources, on turns where the block was dropped entirely. Transparency is now built after stacking, and a starved block reports as not attached. Two related over-claims fixed in the same pass: a block containing one `wiki_verified` card and two `fallback_no_source` cards was labelled `wiki_verified` — it now reports the **lowest** tier present — and an over-budget block was byte-sliced mid-sentence, discarding the end sentinel while still citing the truncated card. Whole cards are now dropped, the sentinel always survives, and sources list only surviving cards. On-Deck **KB-TRANSPARENCY-01** in `docs/testing.md`.
- **Session RAG preset chips now work:** `get_session_rag_chip_candidates` had no Python implementation, so with **Use local knowledge base** on the call always failed and the preset carousel silently fell back to static seeds — the chips have never appeared on-device. The RPC now adapts the existing `suggest_chip_candidates` / `session_rag_chip_candidates_to_rpc` service pair; no ranking or candidate policy changed. KB-off, missing corpus and corpus read errors return `{ok: false}` with a reason instead of rejecting. `tests/test_session_rag_chip_candidates_rpc.py`; on-Deck **SESSION-RAG-CHIPS-01** in `docs/testing.md`.
- **Pulled models now join the model try order:** `merge_pulled_tags_into_routing_orders` had no Python implementation, so after a **custom** local-Ollama setup profile installed models the call always failed and the new tags never reached `text_model_routing_order` / `vision_model_routing_order` — try order had to be set by hand. Now implemented in `main.py`; pulled tags append to a saved try order (top instead when high-VRAM and that toggle is on), and vision-capable tags also join the vision list. When no try order has been saved the RPC deliberately writes nothing, because the order derived from installed models already includes the new tag. `tests/test_merge_pulled_tags_rpc.py`; on-Deck **ROUTING-MERGE-01** in `docs/testing.md`.
- **Expert mode was quietly answering on the Speed token budget:** the per-mode reply caps that shipped on 2026-08-10 (Speed 800 / Expert 1200 / Strategy 1600) were keyed by the mode's *old* name — `deep`, renamed to `expert` on 2026-06-26 — so the Expert entry was never found. Unrecognised modes fall back to Speed, silently and with no error anywhere, meaning every Expert Ask since has been cut off at 800 tokens instead of 1200 and needed a soft continue sooner than it should have. Expert now gets its own cap, and a new test walks every real Ask mode and fails if one has no cap, so the same silent fallback cannot recur. `ollama_ask_budgets.py`; `tests/test_ollama_ask_budgets.py`. On-Deck **EXPERT-CAP-01** in `docs/testing.md`.
- **A Stop during a soft-continue could leave `Continuing…` in the saved reply:** the ephemeral cue and its cue-free clear are both published as non-terminal partials, and non-terminal partials are rate-limited to one write per 120ms — so a Stop landing inside that window could drop the clear, with no later token arriving to correct the stale cue-bearing text. `_update_partial_response` now bypasses the throttle whenever the incoming text is shorter than what is stored, since a shrink is always a deliberate rewrite (a cue clear, or an opening strategy fence being hidden), never a token append; `stripSoftContinueCue.ts` strips it client-side on the cancelled path as a backstop. `main.py`, `src/utils/stripSoftContinueCue.ts`; `tests/test_background_partial_state.py`, `tests/test_ollama_service.py` (cancel-mid-continue, strategy-fence stitch boundary), `src/utils/stripSoftContinueCue.test.ts`. On-Deck **SOFT-PREDICT-01…05** in `docs/testing.md`.
- **After closing Clear cache… or reopening the quick-access menu, the D-pad ring could land on an invisible tab button:** one dead press before anything responded, because Steam keeps its hidden tab buttons in the gamepad tree even while they are hidden. The tab-bar trap now catches a hidden button that already holds the ring the instant it turns on, not only a later change, and the Clear cache… / Clear all data… buttons now hand the ring back to themselves once their confirmation closes, the way other bonsAI pickers already do. **A same-evening device check found the fix above had never actually worked:** the code that decides whether a button is one of Steam's hidden ones was comparing it against the wrong program's idea of "an element", which is always a mismatch for a real button on a real Deck — so nothing had ever been caught this way, on this bug or the tap-to-close-the-tab-strip behavior sharing the same code shape. Both now compare by shape instead of by that mismatched check. On-Deck **TAB-BAR-11** in `docs/testing-manual.md`.
- **Left on the Ollama and UI-scale sliders no longer throws you out of the plugin:** pressing Left on
  the Reply style, keep-alive, connection-timeout or Settings UI-scale slider stepped the value once
  and then handed the D-pad ring to Steam's Quick Access rail, so the very next press landed outside
  the plugin. Left and Right now claim the press themselves, so the ring stays on the slider.
  `DeckFocusSlider.tsx`, `SettingsTabUiScaleSection.tsx`. On-Deck **ONBUTTONDOWN-AUDIT-01** in
  `docs/testing.md`.
- **The Developer tab's Clear frozen test chips button no longer costs a dead press when there is
  nothing to clear:** with no batch pinned the button used to render disabled rather than disappear,
  and a disabled button still takes the D-pad ring, so leaving Developer spent one press on it either
  way. It now only renders once a batch is pinned. `DeveloperTab.tsx`. On-Deck **DEV-CLEAR-CHIPS-01**
  in `docs/testing.md`.
- **Reordering models in the try-order picker no longer closes it or drops the highlight — third
  attempt, 2026-09-04, after the first two failed on device:** pressing Up or Down on a row reordered
  the list correctly but left the D-pad ring owned by nothing, so the next press looked like a wasted
  one re-acquiring focus. The first fix's plain `focus()` was not enough — the ring left the picker for
  a hidden tab button behind it — and the second fix's own refocus, plus every other button in the
  picker including **Reset to defaults**, turned out to close the picker outright: its buttons had no
  `type` attribute, so a press submitted the enclosing form and took the modal's own Done path.
  Button presses now stop that submission, on top of the Steam focus-transfer API the second attempt
  added. `ModelRoutingOrderModal.tsx`. Not checked on the Deck yet — On-Deck **PICKER-REORDER-02** in
  `docs/testing.md` decides.
- **The KB retrieval bake-off's verdict only ever compared two of its four arms (no user-visible change):** `_arms_verdict` read just the `rrf` and `keyword` rows of the holdout table, so the 2026-08-29 run printed "no separation" while its own table showed `vector_only` well ahead. It now finds whichever arm has the best top-3 score, checks it against every other arm with the same locked non-overlap rule, and always names the arms it judged. `scripts/eval_kb_embed_models.py`; `tests/test_eval_kb_arms.py`.
- **The chip you're looking at in Show details was hard to spot:** the current chip in the context chip ladder was only a faint background tint away from the others, and the "Chip N of M" counter above it was small grey text. The current chip now gets a visible cyan glow and brighter fill, and the counter reads in the same cyan/bold style used for section labels elsewhere. `ContextChipLadder.tsx`.
- **The focus ring could look cut off in the character picker's grid:** a tile at the edge of a column had its D-pad ring clipped by the column's own edge, most visible on the top, bottom and outer columns. Each grid column now has a little breathing room inside it so the ring renders in full. `CharacterPickerModal.tsx`.
- **The suggestion carousel kept favoring the same three chips:** with a covered game running, the picker always offered whichever candidate ranked highest, so the top three came back every rotation and the rest of what the knowledge base had to say almost never showed up. It now picks at random among the candidates that are equally eligible, so the carousel actually works its way through the list. `sessionRagComposer.ts`; on-Deck **CHIP-ROTATION-01** in `docs/testing.md`.
- **A pinned QA batch longer than the row could get stuck after about a minute:** Right at the last chip did nothing once the carousel's one-minute walk had ended, so a ten-question batch could leave chips 6 and up unreachable by the D-pad. Right at the last chip now pulls the next pinned question in, the same way Left at the far edge already pulls an earlier one back; and asking a question restarts the minute, in every chip animation style, even though a pinned batch always shows the same three questions at first (which used to look like nothing had changed). `carouselState.ts`, `MainTabPresetAnimatedChips.tsx`, `MainTabPresetRow.tsx`; on-Deck **QA-FROZEN-CHIPS-02** in `docs/testing.md`.
- **The Open Permissions button under a blocked reply now responds to the D-pad:** after a blocked action (for example `bonsai:vac-check` with Steam ban lookup off) the reply showed an *Open Permissions* button, but Down and Up walked straight past it to the session context strip — it was a plain container to Steam, not a stop. That button, and the matching one on the troubleshooting Ask hint, now take the ring and sit in the Down/Up chain between the reply buttons and the session strip. `PermissionDenyAction.tsx`, `MainTabChatTranscript.tsx`. On-Deck **PERM-JUMP-01**, **SMOKE-C** in `docs/testing.md`.
- **Pressing Down into a reply no longer wastes a press on the whole bubble:** from the chat slot row, Down used to land on the entire answer as one big highlighted block, and only a second Down actually reached the first line of text — worse on a long answer, where the highlight was a wall of glow. Down now reaches the first section directly; Up from the reply buttons (Helpful, Retry, and the rest) reaches the last section the same way instead of the same wasted press in reverse. `answerBubbleNavigation.ts`, `buildReplyActionsElement.tsx`. On-Deck **CHAT-REPLY-ENTRY-01** in `docs/testing.md`.
- **Up from a suggestion chip could take five presses to leave the row:** with no reply on screen, one Up press stepped back to an earlier chip instead of leaving, so getting back up to the chat could mean walking through several older suggestions first. Up now leaves in one press whether or not a reply is showing. `MainTabPresetAnimatedChips.tsx`; on-Deck **PRESET-ONE-LINE-03** in `docs/testing.md`.
- **A deterministic command reply (like `bonsai:vac-check` with Steam ban lookup off) no longer leaves the turn header blank or the chat stuck on *New chat*:** those replies used to finish without ever being saved to the chat you asked them in, so the chat never got a title and the next reload found nothing to show, which is what blanked the header back to `…`. The reply is now saved the same way an ordinary Ask's answer is, so the chat renames itself after the command and the header keeps reading it. `main.py`; `tests/test_chat_slot_ownership.py`. On-Deck **CMD-REPLY-TITLE-01** in `docs/testing.md`.
- **The typed-text overlay could drift off the real Ask field on a long question:** the invisible native field wraps text slightly differently than the caret overlay drawn on top of it, so a long line could break one character sooner in the overlay than in the field underneath, leaving the caret and visible text a little off. The overlay now copies the field's own wrapping and font settings directly instead of guessing them, and measures the field's width precisely instead of rounding it. `useUnifiedInputSurface.ts`, `MainTabUnifiedAskBar.tsx`, `section-5.ts`. On-Deck **ASK-OVERLAY-01** in `docs/testing.md`.
- **Speed mode still spent about a second on the meaning search it was supposed to skip:** the check that keeps Speed mode to a keyword-only search never looked at which mode you were in, so two of three Speed questions still paid for the slower meaning search whenever the keyword search found anything at all. Speed now runs the keyword search only, in both the troubleshooting and the strategy/expert paths; Strategy and Expert are unchanged. Confirmed on the Deck 2026-09-06 with Deep Rock Galactic: Survivor running: all three questions asked in Speed spent no time on the meaning search. `knowledge_base_service.py`; two new tests. On-Deck **KB-RECALL-01**, Speed half.

## [0.5.0] - 2026-07-15

### Added
- **Token streaming — live markdown (experimental):** Developer **Token streaming** toggle now renders progressive markdown in one live bubble (R2 closed/tail split), spoiler-safe incomplete fences, code-fence wait chip (2s pulse/spinner), ~3× fence reveal burst, T3 settle→terminal handoff. Stop keeps partial reply.

### Changed
- **Strategy streaming:** Strategy asks with spoiler masking now stream with masked open spoilers (S1) instead of suppressing the preview entirely.

## [0.4.9] - 2026-07-08

### Fixed
- **Bazzite / gamescope QAM layout:** Tab strip crush, tab body overlapping LB/RB icons, and thin left strip on first open when scope collapsed to ~80px. `useQamPanelHeightGuard` locks scope to Steam QAM tab host height; `useTabStripBodyOffset` reserves strip space via `--bonsai-tab-strip-reserve` after carousel settles.

### Changed
- **Docs:** QAM Bazzite fix archived in `docs/archive/roadmap-completed.md`; **QAM-BAZZITE-01** regression row in `docs/testing.md`.

## [0.4.8] - 2026-07-07

### Added
- **Voice STT Tier 1 latency tuning:** Shorter decode interval, rolling window, poll cadence, and 4-thread whisper decode for faster interim text on Deck.
- **Voice maintainer guide:** `docs/voice-input-follow-up.md` (SIGILL triage, pinned podman digest, Tier 2 daemon backlog).

### Fixed
- **Voice STT on Deck:** CPU-safe whisper-cli compile (`GGML_NATIVE=OFF`) when prebuilt binary SIGILLs on Zen 2; inference smoke test on install.
- **Voice STT capture:** Gaming Mode mic RMS gate lowered; filler hallucinations still rejected at high RMS.
- **Voice transcript junk:** Strip `>>`, `[INAUDIBLE]`, and related whisper noise tags from decoded text.
- **Voice stop UX:** Skip final whisper pass on user stop; mic icon clears immediately instead of waiting on RPC.

### Changed
- **Pinned whisper.cpp image** to digest `sha256:c0b535ad…` (no floating `:main` prebuilt copy).
- **Docs:** `docs/testing.md` VOICE-06 latency row; `docs/troubleshooting.md` voice input updates; roadmap STT daemon follow-up.

## [0.4.7] - 2026-07-07

### Added
- **Ollama first-install UX:** **Install Ollama** above **Browse models**; ~5 minute first-install hint; **Install Ollama** label when loopback is not set up (vs **Update AI & models**).
- **Tier 2 pull confirm:** Browse & pull prompts to enable **Tier 2 (open-weight)** when queueing open-weight tags on Tier 1 policy.
- **Tiny-model thinking blurbs:** Pull confirm for `qwen2.5:1.5b` returns to **Ollama** tab after accept.

### Fixed
- **Voice engine install:** Copy whisper.cpp libs from `/app/build/bin/` (not `src/`) in podman image layout.
- **Clear all data + Ollama:** Teardown when `~/.ollama` or user-prefix install exists; stop stale listeners; gate loopback connection test on `~/.ollama/id_ed25519`; force fresh `ollama serve` when keys missing after clear.
- **Tier 2 policy survival:** Modal session snapshot patched after Tier 2 RPC save so remount does not revert policy label on Ollama tab.
- **Thinking blurbs navigation:** Post-modal survival restores **Ollama** tab; developer-tab guard waits for `settingsLoaded` (no spurious **Developer tab hidden** toast).
- **Settings focus rings:** Tighter outline on Install voice engine / Install Ollama action buttons.

### Changed
- **Preset chips:** Tighter fade-animation gap; more space before Ask text area.
- **Docs:** `docs/testing.md`, `docs/troubleshooting.md` rows for Ollama install, Tier 2 pull, clear-data, thinking blurbs.

## [0.4.6] - 2026-07-06

### Fixed
- **Clear all data — settings and permissions wipe:** In-app **Clear all data** no longer restores pre-clear settings after the beta disclaimer modal re-captured stale session survival. Backend wipe clears the full Decky settings directory (voice STT assets, feedback log), always removes `~/.bonsai/cache`, and stops voice install tasks. Uninstall vs clear documented in `docs/troubleshooting.md` §1b; manual wipe script `scripts/wipe-bonsai-data.sh`.

### Changed
- **Docs:** README uninstall note; `DATA-CLEAR-01` regression row in `docs/testing.md`.
## [0.4.5] - 2026-07-06

### Added
- **UI scale slider (Deck focus graph):** Settings **UI scale** manual snap uses shared `DeckFocusSlider` with explicit D-pad focus bridge (`SettingsTabUiScaleSection.tsx`, `deckSliderMath.ts`, `focus-graph-patterns.md` policy).
- **MainTab modularization:** `MainTabPresetRow`, `MainTabUnifiedAskBar`, `MainTabScreenshotBrowser`, `MainTabChatTranscript`; `index.tsx` shell hooks (`useBonsaiPluginShell`, `useScreenshotBrowser`, `useSteamSettingsSearch`).
- **Backend service extraction (Phase 3):** `ollama_ask_service.py`, `async_background_job.py`, `network_service.py`, `transparency_service.py`, `ask_local_commands.py`; Ollama routing moved to `ollama_routing.py` / `ollama_connectivity.py`; `main.py` slimmed ~500 LOC.

### Changed
- **Thinking blurbs:** Always-sarcastic witty/deadpan copy via `composeThinkingBlurb.ts`; stream tag and tiny-model prompt alignment (`bonsai_stream_tags.py`, `thinking_tiny_model_service.py`).
- **Stylesheet split:** `bonsaiScopeStylesheet.ts` composes `src/styles/sections/*.ts` for maintainability.
- **Settings schema:** `bonsaiSettingsSchema.ts` + `bonsaiSettingsNormalizers.ts` + `settingsPayload.ts` centralize persistence shape.

### Fixed
- **Seven critical regressions (post-refactor):** Settings save RMW lock; abort busy gate (Stop releases Ask); voice PCM buffer lock; intent pack corrupt-file preservation; Pillow decode containment; strategy checklist stale-ref + game-switch hydration; intent-pack and strategy-checklist store write locks. Regression tests: `test_background_abort_busy`, `test_settings_save_lock`, `test_intent_pack_store_lock`, `test_strategy_checklist_store_lock`.
- **Connection / Ollama keep-alive sliders:** Migrated to `DeckFocusSlider` with parent focus-graph wiring.

## [0.4.4] - 2026-06-27

### Added
- **Offline intent packs:** Bundled offline Q&A for common Deck setup questions (`data/intent-packs/deck-basics.json`); Settings → **Offline help packs** with install/update and search integration (`intent_pack_service.py`, `SettingsTabIntentPacksSection.tsx`, `useIntentPacks.ts`).
- **Strategy checklist (Strategy Guide follow-ups):** Model emits `bonsai-strategy-checklist` JSON; interactive `ToggleField` rows in `StrategyChecklistPanel.tsx`; progress synced into subsequent Strategy asks and persisted per game in `strategy_checklist_session.json` (`strategy_checklist_session_service.py`, `strategy_guide_parse.py`).
- **Take screenshot (attach menu):** Capture the running game screen into the Ask attachment flow from the attach paperclip menu; expanded `screenshot_media.py` with game-focus capture paths and tests.

### Changed
- **Ask mode styling:** Refined Speed / Strategy / Expert chip fills, borders, and asking-state glow on the unified input bar (`askMode.ts`, `bonsaiScopeStylesheet.ts`, `MainTab.tsx`).
- **Thinking blurb polish:** Mid-Ask phase lines weave question snippet + game context; character voice variants preserved; redundant background `starting` publish removed (`bonsai_stream_tags.py`, `game_ai_request.py`, `main.py`).
- **README and About tab:** End-user README refresh with hero image, clearer quick start and feature overview; About tab quick-start wording and spacing (`README.md`, `AboutTab.tsx`, `pluginQuickStartInstructions.tsx`).

### Fixed
- **Screenshot attach UX:** Attach menu and modal focus/layout fixes for screenshot capture on Deck (`MainTabAttachMenuPopover.tsx`, `BonsaiModalScope.tsx`, `bonsaiScopeStylesheet.ts`).

## [0.4.3] - 2026-06-26

### Added
- **Ask mode visual indicators:** Speed / Strategy / Expert mode chip shows a colored fill and border (green / yellow / red) on the unified Ask bar, similar to Cursor’s mode affordance. `ASK_MODE_ACCENT` / `ASK_MODE_FILL` in [`src/data/askMode.ts`](src/data/askMode.ts); paint via [`src/styles/bonsaiScopeStylesheet.ts`](src/styles/bonsaiScopeStylesheet.ts) (beats Decky transparency flattening on `.bonsai-askbar-target`).
- **Thinking outline on Ask input:** While an Ask is in progress, the unified input host gets a mode-colored border glow with a breathing animation (`bonsai-unified-input--asking`, `bonsai-ask-input-breathe`); static accent border when `prefers-reduced-motion: reduce`. [`src/components/MainTab.tsx`](src/components/MainTab.tsx).

### Changed
- **Preset chip refresh:** [`src/data/presets.ts`](src/data/presets.ts) — LAN/Ollama connection chips, Expert/voice setup prompts, Steam Input advice chip; graduated strategy/VAC/essentials chips off `[beta]`; removed fan-noise/long-session thermal and redundant GPU/battery dupes; rephrased model-policy tier chip.
- **Ask mode id rename (soft migration):** Persisted/RPC `ask_mode` **`deep`** renamed **`expert`** to match UI label **Expert**. Legacy `"deep"` in settings coerces to `"expert"` on load (`normalizeAskMode`, `sanitize_ask_mode`).

## [0.4.2] - 2026-06-21

### Added
- **bonsai-mcp knowledge server:** In-repo IDE-agnostic MCP (`packages/bonsai-mcp/`) for policies, workflows, specialist personas, doc search, and generated RPC/architecture index. Cursor bootstrap via `.cursor/mcp.json` and `sessionStart` hook. CI: `validate-mcp.yml`.

### Changed
- **Documentation consolidation:** Active docs are now `README.md`, `docs/development.md`, `docs/troubleshooting.md`, `docs/roadmap.md`, and `docs/testing.md` (merged PR gates, device QA runbook, prompt testing, and failures). Historical research, plans, sweeps, and the full completed-feature checklist moved to `docs/archive/`. Removed stale root `TODO.md`.
- **Agent/bootstrap lean-out:** `.cursorrules`, subagent stubs, and skills now point at MCP; canonical knowledge in `packages/bonsai-mcp/knowledge/`.

## [0.4.1] - 2026-06-15

### Added
- **Tier 2 one-model multimodal preset:** Connection → **Install Tier 2 one-model multimodal** pulls `gemma4:e2b-it-qat` (falls back to `gemma4:e2b`) with open-weight license disclosure and auto Tier 2 policy.
- **Clear all data — local Ollama teardown:** When **Ollama on this Deck** was enabled, clearing plugin data removes downloaded models, user-prefix Ollama binary, `~/.ollama`, and `~/.bonsai/cache`.
- **Living Pull Models catalog:** Bundled `pullModelCatalog.ts` merged with remote overlay on catalog refresh; disk cache under `~/.bonsai/cache` (`pull_model_catalog_service.py`, `PullModelsModal.tsx`).

### Changed
- **Deck essentials model simplification:** Tier 1 default is one pull (`qwen2.5vl:3b`); shortened Ask routing chains; Pull Models defaults to **Essentials only**; removed 11-model “full Tier-1” and dual-model starter presets.
- **Docs/scripts:** README and `scripts/setup-ollama.sh` recommend `qwen2.5vl:3b`; troubleshooting covers essentials tags and clear-data Ollama purge.

## [0.4.0] - 2026-06-14

### Added
- **Ollama tab + models hub:** Dedicated **Ollama** tab (between Main and Settings) for where AI runs, connection test, timeouts/keep-alive, **Find LAN** (mDNS), saved LAN hosts, and **Models & routing** hub (policy tiers, browse/pull, advanced routing). `OllamaTab.tsx`, `OllamaWhereAiRunsSection.tsx`, `OllamaModelsHubModal.tsx`, `ModelPolicyTierPanel.tsx`.
- **Ask thread accordion:** Main tab shows one collapsible row per turn; expand to read the full answer inline (`expandedTurnKey`, `BonsaiChatTurnRow.tsx`, `useBonsaiAskOrchestration.ts`).
- **Thinking status during Ask:** Deterministic phase lines via `format_thinking_phase` plus optional model `<bonsai-status>` while pending (`bonsai_stream_tags.py`, `game_ai_request.py`, `MainTab.tsx`).
- **Retry same prompt:** **Retry same prompt** on completed replies re-runs the last sanitized Ask without retyping (`onRetryLastResponse`, `BonsaiChatReplyActions.tsx`).
- **Per-turn reply feedback:** Thumbs up/down under AI replies (`save_ask_feedback` RPC, `BonsaiChatReplyActions.tsx`).
- **Named Ollama hosts:** Save and quick-switch up to four labeled LAN Ollama base URLs on the Ollama tab (`named_ollama_hosts`, `OllamaWhereAiRunsSection.tsx`).
- **Voice input (local STT):** Mic button on the unified Ask bar records via backend PipeWire/Pulse/ALSA capture and streams interim whisper.cpp transcription into the text field. **Permissions → Voice input (microphone)** (default off). **Settings → Voice input** for `tiny.en` / `base.en` model download. RPCs: `start_voice_transcription`, `stop_voice_transcription`, `get_voice_transcription_status`, `install_voice_engine`. `voice_transcription_service.py`, `useVoiceTranscription.ts`, `VoiceInputSettingsSection.tsx`.
- **LAN Ollama discovery (mDNS):** **Ollama** tab **Find LAN** — user-triggered browse for `_ollama._tcp` only (no subnet scan). `ollama_mdns_discovery_service.py`, `discover_mdns_ollama_hosts` RPC, `OllamaWhereAiRunsSection.tsx`.
- **Maintainer automation:** Vitest headless Decky harness (`src/test-harness/`, `vitest.config.ts`); `scripts/watch-deploy.sh` / `.ps1`; prepare-only `pnpm run version:bump`; Cursor skill `.cursor/skills/bonsai-deck-dev-loop/`.
- **Token streaming (experimental, Developer tab):** When **Token streaming (experimental)** is enabled (`bonsai_token_streaming_enabled`), Main shows a single growing preview chunk while Ollama NDJSON deltas arrive (`partial_response` on background status poll at 350ms); `useSmoothStreamReveal` RAF smoothing. Terminal replies still run strategy branches, TDP apply, model-policy disclosure, and normal D-pad chunk splitting. `main.py`, `ollama_service.py`, `useBonsaiAskOrchestration.ts`, `MainTab.tsx`, `DeveloperTab.tsx`.
- **Developer tab (opt-in):** Settings → Data → **Show Developer tab** (`show_developer_tab`; migrates legacy `show_debug_tab`). Merges former Debug diagnostics with advanced logging, connection tuning, Steam Web API key, and model-policy advanced controls. `DeveloperTab.tsx`, `index.tsx`, `settings_service.py`, `settingsAndResponse.ts`.

### Changed
- **Settings UX cleanup:** Plain-language labels on Settings and Permissions; technical options moved to Developer tab; simplified connection test output and AI model choice on Permissions. `SettingsTab.tsx`, `PermissionsTab.tsx`, `PermissionsTabModelPolicyPanel.tsx`, `modelPolicy.ts`, `aiCharacterAccentIntensity.ts`.
- **Desktop logs folder rename:** All Desktop writes (chat auto-save, Ask traces, manual notes, app logs) now use `~/Desktop/bonsAI_logs/` instead of `~/Desktop/BonsAI_notes/`. Existing folders are not auto-migrated — rename manually if you already have notes there.
- **Pull models:** Filters Speed / Strategy / Expert / Vision (coding removed); coverage-based suggestions; install bundles dropdown; default slow warning **45s** and hard timeout **3 min** when custom timeouts are off.

### Fixed
- **Token stream isolation:** Background Ask partial streaming binds only to the active background `request_id`; foreground asks no longer corrupt shared partial snapshots (`main.py`, `game_ai_request.py`).
- **Settings persist safety:** Debounced `save_settings` gated on successful hydrate; atomic `settings.json` writes; epoch cancel before clear/sync (`usePluginSettings.ts`, `settings_service.py`).
- **Ask input survival:** `no_persist` mode no longer clears the Ask field on every Decky remount after modal close (`unifiedInputPersistenceMode.ts`, `index.tsx`).
- **Local-only Ask commands:** Sanitizer keywords, shortcut setup, and vac-check work without a configured Ollama PC IP (`localOnlyAskCommands.ts`, `useBonsaiAskOrchestration.ts`).
- **Ollama stream integrity:** NDJSON streams that end without Ollama's `done: true` marker are rejected instead of returning truncated success (`ollama_service.py`).
- **Local toggle no longer overwrites LAN PC IP:** Ask no longer persists `127.0.0.1:11434` to `bonsai:pc-ip` localStorage while **Ollama on this Deck** is enabled, so toggling local off restores the user's LAN host (`src/utils/persistOllamaIp.ts`, `src/index.tsx`).
- **Deck UI polish (QAM):** Avatar containment in unified input; 1px Ask spacing; full-bleed settings/pull picker; clearer no-game hint (replaces “Limited context” chip); pull picker D-pad on filter toggles; logging level persists after reload; merged screenshot+log permission; PC IP hidden when local Ollama is on; **Clear all data** clears modal session survival; Proton attach toggle removed from Developer.

## [0.3.0] - 2026-04-30

### Changed
- Refactor / contributor-UX pass: deduplicated synchronous immediate background Ask paths in `main.py`; split `Content` orchestration into focused hooks under `src/hooks/` (and related modules); moved prompt/policy helpers to `py_modules/backend/services/ollama_prompts.py` with HTTP/streaming remaining in `ollama_service.py` (stable re-exports); aligned capability grandfather tests with `steam_web_api` privacy default; expanded tiered code comments on RPC shapes, capability gates, and Decky UI assumptions.

## [0.2.1] - 2026-04-28

### Changed
- **Local Ollama routing default off:** Omitting `ollama_local_on_deck` in `settings.json` now normalizes and sanitizes to **`false`** (`settingsAndResponse.ts`, `settings_service.py`); LAN PC IP applies until the user opts in. Existing explicit `true`/`false` preserved.
- **Local-runtime (beta) modal on enable:** `bonsAI:local-runtime-beta-dismissed-v1` **`ConfirmModal`** runs when the user turns **Ollama on Deck** **on** (tracked `false→true` transition), after global disclaimer and settings load — not solely because the key was defaulted on (`src/index.tsx`).
- **Connection Test — loopback wake-up:** Failed probe to **`127.0.0.1:11434` / localhost** attempts `systemctl --user` start/restart and **`ollama serve`** (reuse `recover_loopback_ollama_listening` in `py_modules/backend/services/local_ollama_setup_service.py`), then retries **once**. Response may include **`recovery_attempted`**; **`SettingsTab`** uses a longer Decky RPC deadline for localhost tests (~52s padded).
- **Beta disclaimers + quick-start persistence** (prior drop): LAN speed + VRAM/crash wording on global banner; **`bonsai:plugin-help-dismissed`** chip; changelog items from **[Unreleased] - 2026-04-28** drafts consolidated here where still accurate.

### Docs
- **`docs/troubleshooting.md`:** localhost Connection Test wake-up note; Clear all behavior for stored flags.
- **`docs/roadmap.md`:** Completed bullet updated for routing default / modal UX.


## [Unreleased] - 2026-04-19

### Added
- **Running-game character suggestions (AI picker):** `CharacterPickerModal` shows a **Playing:** strip with up to three catalog presets when Steam reports a running game (`Router.MainRunningApp`); matching uses `src/utils/runningGameCharacterSuggestions.ts` (AppID map, normalized title hints, TF2 merge). Async resolve after first paint with a delayed spinner; D-pad links Random, suggestions, catalog column 0, and custom character field.
- **Mode selector (main screen):** Persisted `ask_mode` (`speed` / `strategy` / `deep`) with UI labels Speed, Strategy, Expert; outline button (green / bronze / gold) left of mic/stop opens an anchored popover menu (no layout reflow); D-pad order text → mode → mic/stop. Backend `refactor_helpers.select_ollama_models` maps each mode to ordered Ollama fallbacks; `start_background_game_ai` sends `ask_mode`. `src/data/askMode.ts`, `AskModeMenuPopover.tsx`, `MainTab.tsx`, `index.tsx`, `settingsAndResponse.ts`, `settings_service.py`, `main.py`.
- **Character accent intensity:** When **AI characters** is on, Settings includes **Accent intensity** (four levels: subtle / balanced / heavy / unleashed, default balanced) with short Doom-difficulty–style chip labels. Persisted `ai_character_accent_intensity`; `backend/services/ai_character_service.py` modulates roleplay dialect strength for preset, random, and custom character paths; TDP/JSON policy unchanged. `src/data/aiCharacterAccentIntensity.ts`, `src/index.tsx`, `src/utils/settingsAndResponse.ts`, `backend/services/settings_service.py`.
- **Input handling transparency:** Main tab **Input handling (last Ask)** shows raw Ask text, sanitizer output, system/user messages sent to Ollama, model id, and responses; **Run original in Ask** and **Copy JSON**. RPC `get_input_transparency`; optional Settings **Verbose Ask logging to Desktop notes** (`desktop_ask_verbose_logging`) appends traces to `~/Desktop/BonsAI_notes/bonsai-ask-trace-YYYY-MM-DD.md` when filesystem writes are allowed. `main.py`, `backend/services/desktop_note_service.py`, `src/components/MainTab.tsx`, `src/utils/inputTransparency.ts`, `src/utils/settingsAndResponse.ts`, `backend/services/settings_service.py`.
- **Input sanitizer lane (hybrid):** Default-on deterministic Ask sanitization before Ollama (NUL/control cleanup, length cap, empty/junk block). No Settings-tab controls; disable/re-enable with exact Ask-only phrases `bonsai:disable-sanitize` and `bonsai:enable-sanitize` (persisted `input_sanitizer_user_disabled`, confirmation without model call). `backend/services/input_sanitizer_service.py`, `main.py`, `src/index.tsx`, `src/data/inputSanitizerCommands.ts`, `src/utils/settingsAndResponse.ts`, `backend/services/settings_service.py`.
- **Preset chip fade opt-out:** Settings **Preset chip fade animation** `ToggleField` (persisted `preset_chip_fade_animation_enabled`, default on). When off, main-tab suggestion chips stay fully visible and swap text without crossfades while keeping the same rotation window and post-Ask re-seed. `PresetAnimatedChips.tsx`, `MainTab.tsx`, `src/utils/settingsAndResponse.ts`, `backend/services/settings_service.py`.
- **Character Voice Roleplay Mode (Opt-In):** Settings **AI character** toggle (default off); fullscreen `CharacterPickerModal` with per–work-title sections, **Random** toggle, custom character `TextField`, OK/Cancel; unique 8×8-pixel SVG emoticons (`characterPlaceholderEmoticonGrids.ts`, `CharacterRoleplayEmoticon.tsx`); main-tab glass avatar opens picker; persisted `ai_character_*` in `settings.json`; backend `backend/services/ai_character_service.py` appends roleplay instructions to the Ollama system prompt (`main.py`). Catalog: `src/data/characterCatalog.ts` (keep in sync with Python allowlist).
- **Preset carousel (Phase 1):** Main tab shows three suggestion chips with staggered fade in/out (2s each) and hold time scaled to prompt length (doubled dwell vs earlier tuning); chips rotate independently and re-seed when follow-up presets refresh. `PresetAnimatedChips.tsx`, `holdMsForPresetText` / `getRandomPresetExcluding` in `src/data/presets.ts`, styles in `src/index.tsx`. Manual next/previous arrow controls deferred.
- **Capability Permission Center:** Permissions tab (`LockIcon`, `TAB_TITLE_ICON_PX_PERMISSIONS`) with persisted `capabilities` in `settings.json` (filesystem write, hardware control, media library access, external/Steam navigation). New installs default all OFF; legacy settings files without a `capabilities` object are grandfathered ON until the user saves. Backend enforcement in `main.py` (`backend/services/capabilities.py`); UI in `PermissionsTab.tsx`, `AboutTab.tsx`, `MainTab.tsx`, `src/index.tsx`.
- **Desktop daily chat auto-save (V2):** Settings tab toggle `desktop_debug_note_auto_save` (default off). When on and filesystem writes are allowed, each Ask and each AI response append to `~/Desktop/BonsAI_notes/bonsai-chat-YYYY-MM-DD.md` (UTC day); Ask entries list attached screenshot paths. RPC `append_desktop_chat_event`, `backend/services/desktop_note_service.py`, `src/index.tsx`.
- **Desktop Mode Debug Note Save (V1):** After a successful ask, **Save to Desktop note…** opens a consent dialog and writes append-only markdown to `~/Desktop/BonsAI_notes/<name>.md` (UTC timestamps, question + answer). Backend: `append_desktop_debug_note`, `backend/services/desktop_note_service.py`. UI: `DesktopNoteSaveModal`, `MainTab`, `src/index.tsx`.
- **Search Surface Glass Pass:** Unified search `TextField` and ask bar use a shared glass surface (`rgba` ~25% fill, `backdrop-filter` blur, light border); attach/mic/stop/clear icons render at 50% opacity; input height follows wrapped text (min/max clamp); AI response chunks use the same glass family instead of near-black fills (`src/index.tsx`).
- **Built on Ollama** About tab link to upstream `https://github.com/ollama/ollama` (`OLLAMA_UPSTREAM_REPO_URL`, `AboutTab`).
- Phase 1 experimental **Steam Input jump** (Debug tab): per-game `steam://controllerconfig/{appId}` via `SteamClient.URL.ExecuteSteamURL`, `Navigation.CloseSideMenus`, and a versioned lexicon in `src/data/steam-input-lexicon.ts` with CEF route-discovery and update-discipline notes in `docs/archive/research/steam-input-research.md`.
- Background prompt completion flow so requests can finish while QAM is closed and recover state on reopen (marked complete in `docs/roadmap.md`; verification matrix in `docs/testing.md` under `Background Prompt Completion (V1)`).
- Local/dev workflow support and deployment-oriented setup scripting for Linux and Bazzite-focused environments.
- Expanded prompt test coverage and strategy-mode ideation notes for upcoming tuning work.
- Added backend service modules under `backend/services/` and extracted frontend tab/data modules for milestone refactor decomposition.
- Added baseline service/data tests: `tests/test_settings_service.py`, `tests/test_ollama_service.py`, `src/data/presets.test.ts`, and `src/data/steam-input-lexicon.test.ts`.

### Changed
- **Preset chip refresh (advice-first):** [src/data/presets.ts](src/data/presets.ts) `PRESET_PROMPTS` rephrased so battery / TDP / performance chips ask questions (e.g. "Optimize for battery life" → "How can I optimize for battery life?"), letting bonsAI advise first and apply only when the user asks during chat. Action wording kept only for strong shipped surfaces (Steam Input jump → `Open Steam Input config`; vision V1 → `Describe what you see in this screenshot`). Dropped `Reduce fan noise` and `Best thermal settings for long play sessions` because the fan's job is cooling and bonsAI cannot meaningfully change Deck thermals without trading performance. Added bonsAI-feature chips: `Diagnose a slow Ollama response`, `What does my model policy tier mean?`, `Which Ollama model fits my Deck setup?`, `Why is my Deck running hot?`. Eight `beta: true` chips preview roadmap items: quiet fan profile (QAMP), Proton log analysis, Steam Input layout analysis, `Which Ollama models do I need for bonsAI?`, `How do I use strategy mode?`, spoiler-safe tips, `VAC bans on opponents?`, and restored `Suggest mods or tweaks for this game`. Maintainer approved 2026-04-24 as freeze-week-compatible content tuning; no logic, schema, RPC, or runtime change. See [docs/archive/red-blue-fight-2026-04-21.md](docs/archive/red-blue-fight-2026-04-21.md) § _Content tuning approvals_.
- **AI character avatars (higher resolution):** Roleplay avatars render from a unified 16×16 cell SVG grid: each preset’s 8×8 art is pixel-doubled (`expand8To16`), with hand-tuned 16×16 overrides for the full catalog cast (GTA V leads, TF2 mercs + graphic-novel Announcer bonsai tree, Random/Custom dice and custom tile, Portal/BG3/Fallout/Zelda/RDR/Cyberpunk/Hades/Other busts). `src/components/characterPlaceholderEmoticonGrids.ts`, `src/components/CharacterRoleplayEmoticon.tsx`.
- **Settings (Connection):** Hard timeout uses one Steam `SliderField` in `ConnectionTimeoutSlider.tsx` (10s steps, max 300s), while soft warning remains visible as a readout and is auto-reconciled to stay before timeout. Ordering is enforced when loading settings via `reconcileLatencyWarningAndTimeout` in `src/utils/settingsAndResponse.ts` and matching logic in `backend/services/settings_service.py`.
- **Refactor (unified input / main tab):** `UNIFIED_*` / Ask label color and `splitResponseIntoChunks` live under `src/features/unified-input/constants.ts` and `src/utils/splitResponseIntoChunks.ts`; Deck layout measurement and refs are in `useUnifiedInputSurface`; the main tab body is `src/components/MainTab.tsx` (behavior parity; `src/index.tsx` composes hooks + tabs).
- **Tabs:** Main/settings/debug tab titles use 4× larger icons (`TAB_TITLE_ICON_PX_*`); plugin store / loader entry icon remains `BonsaiSvgIcon` in `definePlugin`. ResizeObserver and unified-input remeasure run only on the **main** tab to cut tab-switch jitter; tab strip `transition-property: none` reduces twitchy animations (`src/index.tsx`).
- **Unified search / Ask:** Ask full-bleed width uses the same `calc(100% + 24px)` rule as other `bonsai-full-bleed-row` rows (no `--bonsai-ask-sync-width` from the unified host). Textarea/input use stable `margin-top: 0` so crossing wrap no longer toggles margin and throws off the caret on line 2+ (`src/index.tsx`).
- **Ask row:** `bonsai-ask-bleed-wrap` + `PanelSectionRow` `overflow: visible` / `align-self: stretch` so full-bleed negative margins are not clipped narrower than the search field (`src/index.tsx`).
- **Search layout (expand + bleed):** Text-body height adds `UNIFIED_INPUT_EXPAND_AHEAD_PX` (one line at `UNIFIED_TEXT_FONT_PX` × `UNIFIED_TEXT_LINE_HEIGHT`) on top of remeasure padding; **global** `.bonsai-scope .bonsai-full-bleed-row` restores `calc(100% + 24px)` for every tagged row so Ask matches unified input even when `PanelSectionRow` DOM nesting differs (`src/index.tsx`).
- **Main tab fixes:** Bottom attach/mic strip overrides `flex-direction: row` so icons are not stacked by the TextField column `Panel.Focusable` rule; Ask bar gets `min-width` on full-bleed rows and full-width `DialogButton`; zero top inset/padding and hiding empty Decky field label nodes improve caret alignment (`src/index.tsx`).
- **Settings tab icon:** `GearIcon` now uses `react-icons/fi` `FiSettings` (stroke-based, readable at 26px on Deck CEF) instead of the custom filled gear (`src/components/icons.tsx`).
- **Unified search caret vs overlay:** `UNIFIED_TEXT_FONT_PX` / `UNIFIED_TEXT_LINE_HEIGHT` now drive measure div, overlay, `TextField`, and scoped textarea CSS so the caret lines up with painted text; `Panel.Focusable` uses column flex with `justify-content: flex-start` to avoid vertically centering short text in a tall field (`src/index.tsx`).
- **Search Surface Glass Pass:** Typed overlay uses asymmetric insets (top 1px, L/R/B 0) + tighter strip height; bottom attach/mic in one horizontal `Focusable` (`flex-wrap: nowrap`); Clear sits inside the Ask glass (Ask flex-grow to near full width); Ask label `#a8b4c4` with scoped `!important` so SteamOS/Decky `DialogButton` theming does not force accent/yellow; full-bleed ask row; `TextField`/`textarea` padding trimmed; subtler glass borders; removed temporary debug ingest `fetch` instrumentation from `remeasureUnifiedInputSurface` / `reportGlassStyleProbe` (kept `window.__bonsaiGlassDebug` snapshot).
- **Search Surface Glass Pass (margins):** Icon strip 24px; remeasure pad 7px; overlay/ measure `line-height` 1.2; zeroed `Panel.Focusable` margins and `text-indent`; logical padding resets on transparent input; overlay `margin`/`padding` pinned to 0; slightly smaller corner hit targets (20px) and glyphs.
- **Search Surface Glass Pass (height + Ask):** Default empty text-body min height +1 line (`UNIFIED_TEXT_BODY_MIN_PX` 42); Clear control absolutely positioned on the Ask bar so the Ask `DialogButton` spans full bleed width (with right padding when Clear is visible).
- Reorganized documentation under `docs/` (`development.md`, `troubleshooting.md`, `prompt-testing.md`, `roadmap.md`, `refactor-specialist-sweep.md`) and moved dev automation scripts under `scripts/` with repository-root resolution for `.env`, builds, and Decky CLI paths.
- Refined frontend request state handling and response UX behavior in `src/index.tsx`.
- Updated backend request lifecycle and orchestration paths in `main.py` for more resilient local AI interactions.
- Updated roadmap and prioritization details in `docs/roadmap.md` (consolidates former root `roadmap.md` and `FUTURE_FEATURES.md` planning), including moving completed items into `Implemented Baseline` where applicable.
- `main.py` now delegates settings/TDP/Ollama internals to service-layer helpers to keep plugin RPC methods focused on orchestration.
- `src/index.tsx` now delegates debug/about tab rendering and prompt preset logic to extracted modules.

### Fixed
- **Settings (Connection):** Soft warning remains visible as a dedicated readout line under the single hard-timeout slider so users can confirm both thresholds on Deck CEF (`src/index.tsx`, `ConnectionTimeoutSlider.tsx`).
- **Unified search caret vs wrapped text:** Hidden measure + text overlay now use the same horizontal origin and width as the real `textarea`/`input` (from layout rects + `clientWidth`), so word-wrap matches the native field on line 2+ instead of using the full glass width (`src/index.tsx`).
- **Unified search measure node:** Removed React `left`/`width`/`top` props from the hidden measure div so they are not reset to `width: 0` every render (which broke `scrollHeight` and height sync). Vertical alignment uses `--bonsai-unified-field-top` from the field’s bounding rect; last remeasure snapshot is exposed as `window.__bonsaiLastRemeasure` for on-device debugging (`src/index.tsx`).
- **Unified search caret baseline:** Disabled the extra painted text overlay and render the native `TextField` text directly (non-transparent), eliminating Deck-specific dual-layer baseline drift where the blinking caret sat ~1-1.5 lines below visible text (`src/index.tsx`).
- **Ask bar width parity:** Ask row width now keys off `--bonsai-search-host-width` captured from the live unified host measurement, so Ask and search bars stay the same rendered width on-device (`src/index.tsx`).
- Synced `experimental` with latest remote updates before consolidation to avoid drift and preserve branch history.
- Resolved roadmap documentation integration conflict during sync so both upstream and local planning updates are retained in `docs/roadmap.md`.

### Docs
- Documented **Input handling transparency** (main tab + verbose Desktop trace) in `README.md`, `docs/troubleshooting.md`, `docs/roadmap.md`, `docs/development.md`, and this changelog.
- Documented **Input sanitizer lane** in `README.md`, `docs/testing.md`, `docs/troubleshooting.md`, `docs/roadmap.md`, and `docs/development.md` (field names).
- Documented **Character Voice Roleplay Mode** in `docs/roadmap.md`, `docs/archive/research/voice-character-catalog.md`, `docs/testing.md`, `docs/troubleshooting.md`, and this changelog.
- Documented single hard-timeout slider + visible soft-warning readout in `docs/troubleshooting.md` and this changelog.
- Documented **Preset carousel (Phase 1)** in `docs/roadmap.md`, `docs/testing.md`, `docs/development.md`, and this changelog.

- Documented **Desktop daily chat auto-save (V2)** in `docs/roadmap.md`, `docs/troubleshooting.md`, and this changelog.
- Documented **Capability Permission Center** in `docs/roadmap.md` (Completed + Implemented Baseline + candidate status), `docs/troubleshooting.md` (permissions section), and `docs/foss-advocate-report.md`.
- Marked **Search Surface Glass Pass** complete in `docs/roadmap.md` (Completed + Implemented Baseline); noted glass tokens and layout in `docs/development.md`.
- Marked **Built on Ollama Link (About Tab)** complete in `docs/roadmap.md` (Completed + Implemented Baseline).
- Marked **Steam Input Jump Phase 1** complete in `docs/roadmap.md` and noted Phase 2+ (search + full catalog) as deferred; aligned `docs/archive/research/steam-input-research.md` and `docs/testing.md` status language.
- Expanded `docs/archive/research/steam-input-research.md` with CEF debugging steps, History API console snippet, verified-route log template, and Steam client update smoke-test discipline.
- Expanded troubleshooting guidance in `docs/troubleshooting.md`.
- Updated prompt testing notes in `docs/testing.md`.
- Refined project rules and planning notes in `.cursorrules`.

- **Documentation refresh:** README recommended multimodal models (`llava` default, library link); expanded developer doc map table; network troubleshooting TODOs replaced with numbered steps (Ollama listen address, `ollama pull`); roadmap cross-links to troubleshooting and prompt-testing; `docs/development.md` adds `characterUiAccent`, ask-mode pointers, and release doc checklist; `docs/archive/refactor/refactor-specialist-sweep.md` historical banner; `docs/security-audit-report.md` line refs and Open status re-verified (2026-04-19); `docs/foss-advocate-report.md` dependency and license snapshot.

