# Roadmap: done for v0.5.0 (archive)

_Moved out of [roadmap.md](../roadmap.md) on 2026-09-13 during the phase 1 documents split — copied line for line, nothing reworded._

## Done for v0.5.0

Everything shipped since v0.4.9 (2026-07-08), one line each, newest first. Detail: [CHANGELOG.md](../../CHANGELOG.md),
[archive/roadmap-completed.md](roadmap-completed.md), [archive/roadmap-bugs-fixed.md](roadmap-bugs-fixed.md).

_Everything from here to the 2026-09-16 block was moved out of [roadmap.md](../roadmap.md) on 2026-09-21,
copied line for line, nothing reworded, to keep that document under its size limit._

_The six blocks below (2026-09-21 through the first two halves of plan 64's flow A) were moved out of
[roadmap.md](../roadmap.md) on 2026-09-23 during plan 64's docs-room bookkeeping pass, oldest of the
remaining Done entries first, copied line for line, nothing reworded, again to keep that document under
its size limit._

_The plan 64 flow B, flow C and flow D blocks below were moved out the same way, during the same plan's
flow E bookkeeping pass, for the same reason. The newer flow E block stayed in roadmap.md._

_The plan 64 flow E block below was moved out the same way, during the same plan's flow G bookkeeping
pass, for the same reason. The newer flow G block stayed in roadmap.md._

**Closed 2026-09-23 (plan 64, flow E, proven on the Deck):**

- ★ `[focus]` **The Open Permissions jump lands one toggle above the one it was asked for** — **DONE,
  confirmed on the Deck 2026-09-23:** the ring reaches the right switch and stays there, with at most a
  100 ms flicker through "Back to Main" on the way. [Full detail](archive/roadmap-bugs-fixed.md#the-open-permissions-jump-lands-one-toggle-above-the-one-it-was-asked-for).
- ★ `[kb]` **Download knowledge base needed two taps; the first did nothing visible** — **DONE, confirmed
  on the Deck 2026-09-23: this is how it is meant to work, not a bug.** Tap 1 opens the storage picker, tap
  2 starts the download at once. [Full detail](archive/roadmap-bugs-fixed.md#download-knowledge-base-needed-two-taps-the-first-did-nothing-visible).
- ★★ `[KB]` **Ten new games checked on the Deck, publish owed** — **DONE, confirmed on the Deck 2026-09-23:**
  pressing Update knowledge base reached the public library, and downloading fresh pulled it from Hugging
  Face and landed on the SD card. [Full detail](archive/roadmap-completed.md#ten-new-games-checked-on-the-deck-publish-owed).

**Closed 2026-09-23 (plan 64, flow A part 1, proven on the Deck):**

- ★ `[ask]` **The blinking cursor in the question box does not line up with the placeholder text** —
  **DONE, measured fixed on the Deck 2026-09-23:** the placeholder text and the real cursor both sit at 12
  pixels, so the old mismatch is gone. The maintainer's own glance is still welcome, from the same
  screenshots. [Full detail](archive/roadmap-bugs-fixed.md#the-blinking-cursor-in-the-question-box-does-not-line-up-with-the-placeholder-text).
- ★ `[ui]` **The Decky plugin icon does not match the tab bar's bonsai icon** — **DONE, confirmed on the
  Deck 2026-09-23:** Decky's own plugin list and the tab strip now show the same bonsai drawing, at 26 and
  22 pixels. [Full detail](archive/roadmap-bugs-fixed.md#the-decky-plugin-icon-does-not-match-the-tab-bars-bonsai-icon).
- ★ `[ollama]` **The vision try-order picker writes settings even when nothing changed** — **DONE,
  confirmed on the Deck 2026-09-23:** the settings file's hash and its saved date were both unchanged after
  pressing Done with nothing moved. [Full detail](archive/roadmap-bugs-fixed.md#the-vision-try-order-picker-writes-settings-even-when-nothing-changed).
- ★★ `[focus]` **The Show details chip ladder is not a D-pad stop** — **DONE, confirmed on the Deck
  2026-09-23:** with the panel open, every Left and Right press changed the lit chip, 12 of 12, and the ring
  never left the ladder. [Full detail](archive/roadmap-bugs-fixed.md#the-show-details-chip-ladder-is-not-a-d-pad-stop).
- ★★ `[focus]` **Walking down from the chat row skips the whole answer** — **DONE, no longer reproduces —
  measured on the Deck 2026-09-23** with the details panel both closed and open; Down from the chat row now
  reaches every stop in the reply, in order. [Full detail](archive/roadmap-bugs-fixed.md#walking-down-from-the-chat-row-skips-the-whole-answer).
- ★★ `[ollama]` **The very first model ticked in a fresh download picker starts downloading right away** —
  **DONE for the part that shipped, confirmed on the Deck 2026-09-23:** ticking the first tickable model now
  only queues it; nothing downloads until Pull is pressed. The second half — a model pulled this way never
  joining the saved try order — is not fixed; a smaller entry for it stays in Bugs.
  [Full detail](archive/roadmap-bugs-fixed.md#the-very-first-model-ticked-in-a-fresh-download-picker-starts-downloading-right-away).
- ★★★ `[ollama]` `[ui]` **Every filter on the AI models screen behind one Filters button, and five changes
  that give the list more room** — **DONE for the filters themselves, confirmed on the Deck 2026-09-23:**
  Installed only, Essentials only and Recently added all changed the model list as expected. The "more room"
  half of this entry is tracked separately, under **MODELS-LIST-CAP-01** and the "Done falls below the
  visible edge" bug, both still unresolved (now both in Verify). [Full detail](archive/roadmap-completed.md#every-filter-on-the-ai-models-screen-behind-one-filters-button-and-five-changes-that-give-the-list-more-room).

**Closed 2026-09-23 (plan 64, flow A part 2, proven on the Deck):**

- ★★ `[ollama]` `[focus]` **Closing the AI models screen could leave the D-pad ring on Steam's own side
  rail, outside the plugin** — **DONE, confirmed on the Deck 2026-09-23:** Down now walks Filters, the four
  model rows and then Done, fully visible; pressing A on Done closes the screen with the ring back on
  "Manage AI models…". [Full detail](archive/roadmap-bugs-fixed.md#closing-the-ai-models-screen-could-leave-the-d-pad-ring-on-steams-own-side-rail-outside-the-plugin).
- ★★ `[ollama]` `[focus]` **On the AI models screen, Down from the last model went nowhere** — **DONE,
  confirmed on the Deck 2026-09-23:** Down from the last model row now reaches Done, or "Pull selected" when
  a model is ticked. [Full detail](archive/roadmap-bugs-fixed.md#on-the-ai-models-screen-down-from-the-last-model-went-nowhere).
- ★ `[ollama]` `[focus]` **B while typing a model name by hand looks likely to back out of the whole AI
  models screen** — **DONE, confirmed on the Deck 2026-09-23:** typing a name by hand and pressing B closes
  only the small typing box, leaves the AI models screen open, and the box is empty when reopened. Whether
  Steam's own on-screen keyboard would swallow the B press first is still unknown — it never opened during
  this check. [Full detail](archive/roadmap-bugs-fixed.md#b-while-typing-a-model-name-by-hand-looks-likely-to-back-out-of-the-whole-ai-models-screen).
- ★★ `[ask]` `[layout]` **Typed text ran off the right edge of the panel at the bigger UI size** — **DONE,
  confirmed on the Deck 2026-09-23:** at the bigger size, with a long sentence typed, the typed text now
  stays inside the box and wraps rather than running past its right edge, at both the bigger size and the
  default. [Full detail](archive/roadmap-bugs-fixed.md#typed-text-ran-off-the-right-edge-of-the-panel-at-the-bigger-ui-size).
- ★★★ `[ui]` **The UI size setting barely changes anything** — **DONE, confirmed on
  the Deck 2026-09-23:** the size slider has exactly two stops, Handheld and Couch, and the word "Desktop" is
  gone from both the slider and the UI scale section. The last owed check ran later the same night: an old
  saved "desktop" value now loads as Handheld, with nothing on the Main tab moved or resized.
  [Full detail](archive/roadmap-bugs-fixed.md#the-ui-size-setting-barely-changes-anything).

**Closed 2026-09-23 (plan 64, flow B, proven on the Deck):**

- ★★ `[ollama]` `[layout]` **The AI models list could push Done and Cancel off screen, and did not use all
  the room it had** — **DONE, confirmed on the Deck 2026-09-23:** Done and Cancel now stay fully on screen
  with all 25 models listed, three rows showing at a time. [Full detail](archive/roadmap-bugs-fixed.md#the-ai-models-screens-done-and-cancel-button-could-fall-off-the-bottom-of-a-long-model-list-and-the-list-itself-did-not-use-all-the-room-it-had).
- ★ `[ask]` `[focus]` **Down from the question box while a reply is arriving did nothing, and Stop was hard
  to find by D-pad** — **DONE, confirmed on the Deck 2026-09-23:** Down, and Right-Right, both reach Stop
  while a reply arrives; normal after it finishes. [Full detail](archive/roadmap-bugs-fixed.md#down-from-the-question-box-while-a-reply-is-arriving-used-to-do-nothing-and-stop-was-hard-to-find-by-d-pad).
- ★ `[focus]` **Up from the Retry icon does not return to the answer** — **DONE, closed 2026-09-23 as no
  longer applying:** Retry now sits above the answer since the layout changed; Up/Down there now mirror each
  other. [Full detail](archive/roadmap-bugs-fixed.md#up-from-the-retry-icon-does-not-return-to-the-answer).
- ★ `[reply]` **The no-game branch menu leaks its template** — **DONE, confirmed on the Deck 2026-09-23:** a
  no-game Strategy question got a real two-choice menu; the literal words "THIS GAME" never appear. [Full detail](archive/roadmap-bugs-fixed.md#the-no-game-branch-menu-leaks-its-template).
- ★★ `[chat]` **A new chat shows the previous chat's last reply until the panel is reopened** — **DONE,
  confirmed on the Deck 2026-09-23:** all four new chats stayed empty from the first frame. A related bug
  was found the same night, filed separately in Bugs: a new chat can briefly show the previous chat's
  question instead. [Full detail](archive/roadmap-bugs-fixed.md#a-new-chat-shows-the-previous-chats-last-reply-until-the-panel-is-reopened).
- ★★ `[chat]` **The game a chat belongs to, above its title** — **DONE, confirmed on the Deck 2026-09-23:**
  the game's name shows above the title with the ring on it, gone on a chat with no game. [Full detail](archive/roadmap-completed.md#the-game-a-chat-belongs-to-above-its-title).
- ★★ `[layout]` `[voice]` `[focus]` **Read aloud is a small speaker on the Helpful row, not a dividing
  line** — **DONE, confirmed on the Deck 2026-09-23 for a stopped reply:** the speaker reads the kept
  partial answer aloud and stops it again on a second press. [Full detail](archive/roadmap-completed.md#read-aloud-is-a-small-speaker-on-the-helpful-row-not-a-dividing-line).
- ★★★ `[layout]` **Session context folds into Show details** — **DONE for steps 1 to 6, confirmed on the
  Deck 2026-09-23:** both tabs, all 27 session rows and Clear all take the ring, fully visible. **Two new
  focus bugs split out, filed separately in Bugs:** the confirm box's default and its Cancel path. [Full detail](archive/roadmap-completed.md#session-context-folds-into-show-details).

**Closed 2026-09-23 (plan 64, flow C, proven on the Deck):**

- ★ `[KB]` **The credit line under a reply never names a note with no source page, or a shared tip** —
  **DONE, confirmed on the Deck 2026-09-23:** under a Hades reply, the open notes block named each
  hand-written note as "From bonsAI's own note"; the words "no source" never appear. A shared tip's own
  source page still cannot be seen on screen, since no shipped tip has one yet. [Full detail](archive/roadmap-bugs-fixed.md#the-credit-line-under-a-reply-never-names-a-note-with-no-source-page-or-a-shared-tip).
- ★★ `[KB]` **"Not in my notes" line** — **DONE, confirmed on the Deck 2026-09-23:** the line reads exactly
  right, no note card or notes block shows alongside it, and the log confirms nothing was searched or
  attached. [Full detail](archive/roadmap-bugs-fixed.md#not-in-my-notes-line).
- ★★ `[reply]` **Thinking line fixes from 2026-08-07/08** — **DONE, confirmed on the Deck 2026-09-23:** the
  last two rows (the lazy status tag, and phases that are not all emoji) each got their fifth clean,
  differently-worded try; all seven of this entry's rows now pass. [Full detail](archive/roadmap-bugs-fixed.md#thinking-line-fixes-from-2026-08-0708).

**Closed 2026-09-23 (plan 64, flow D, proven on the Deck):**

- ★★ `[chat]` **A brand-new chat shows the previous chat's question for about 40 seconds** — **DONE, fixed
  in `996752c`, confirmed on the Deck 2026-09-23:** two new chats, each recorded every 50 ms for 60 seconds,
  showed 0 wrong question rows across 49 and 43 recorded changes. [Full detail](archive/roadmap-bugs-fixed.md#a-brand-new-chat-shows-the-previous-chats-question-for-about-40-seconds).
- ★ `[focus]` `[layout]` **Walking onto an answer section taller than the view shows its end, not its
  start** — **DONE, fixed in `a5684c7`, confirmed on the Deck 2026-09-23:** two tall sections landed with
  their first line at the top of the visible area walking Down; walking Up, each arrived showing its end
  and then scrolled back to its first line. [Full detail](archive/roadmap-bugs-fixed.md#walking-onto-an-answer-section-taller-than-the-view-shows-its-end-not-its-start).
- ★★ `[focus]` `[reply]` **Walking a reply with the D-pad while it is still being written loses the
  highlight** — **DONE, confirmed on the Deck 2026-09-23:** a recorded walk with the ring inside an answer
  held its position still while the answer grew, the first real Deck proof that the `7b9447e` fix holds.
  Two narrower problems split out of this one, tracked separately: the ring being carried off screen when it
  sits on the chat row instead, and the ring vanishing at the moment an answer finishes. [Full detail](archive/roadmap-bugs-fixed.md#walking-a-reply-with-the-d-pad-while-it-is-still-being-written-loses-the-highlight).
- ★★★★ `[ollama]` **The plugin owns its token numbers** — **DONE, confirmed on the Deck 2026-09-23:**
  Strategy and Expert replies with thinking on both ended on complete sentences (72 and 50 seconds), with no
  clamping line in the log and normal stops well under the token limit. [Full detail](archive/roadmap-completed.md#the-plugin-owns-its-token-numbers).

**Closed 2026-09-22 (plan 63, verification pass):**

- ★ `[chips]` `[QA]` **The pinned test sentences stop showing after the first question** — **DONE, fixed
  and confirmed on the Deck 2026-09-22.** A question sent from a pinned chip — the bug's own trigger —
  still left the chip offering pinned sentences afterwards. Covers one sitting, one question; not proven
  the settings fix itself is the cure, only that the symptom is gone on a build carrying it.
  [Full detail](archive/roadmap-bugs-fixed.md#the-pinned-test-sentences-stop-showing-after-the-first-question).

**Closed 2026-09-21 (D115, the maintainer's answers before plan 63 started):**

- ★ `[focus]` **Pressing B while the reasoning display's Show details panel is open does not close it** —
  **DONE, closed 2026-09-21 (D115).** The maintainer's word: accepted as it is. No code changed.
  [Full detail](archive/roadmap-bugs-fixed.md#pressing-b-while-the-reasoning-displays-show-details-panel-is-open-does-not-close-it).
- ★★ `[ollama]` **The licence filter now hides models the old Policy buttons never did** — **DONE, closed
  2026-09-21 (D115).** The maintainer's word: keep it, a filter should filter. 17 of 26 models show on the
  default setting, by design. [Full detail](archive/roadmap-bugs-fixed.md#the-licence-filter-now-hides-models-the-old-policy-buttons-never-did).

**Closed 2026-09-21 (plan 63 block 0, fixed and proven on the Deck):**

- ★ `[focus]` **With Show details open, the chip row cannot be reached by the D-pad** — **DONE, fixed and
  confirmed on the Deck 2026-09-21.** Down from Show details now reaches the row of chips instead of jumping
  past it into the bottom bar. [Full detail](archive/roadmap-bugs-fixed.md#with-show-details-open-the-chip-row-cannot-be-reached-by-the-d-pad).
- ★★ `[platform]` `[QA]` **The check everyone runs before a commit has been failing on a clean tree since at
  least 18 September** — **DONE, fixed 2026-09-21.** The check now passes on a clean tree again. Nothing was
  deleted to get there — the oversized documents were trimmed and their old detail moved to the archive
  files, linked rather than lost. [Full detail](archive/roadmap-bugs-fixed.md#the-check-everyone-runs-before-a-commit-has-been-failing-on-a-clean-tree-since-at-least-18-september).
- ★★★ `[layout]` `[focus]` **The new Session tab cannot be reached with the D-pad** — **DONE, fixed and
  confirmed on the Deck 2026-09-21.** Walking down from Show details now reaches the tabs and opens the
  Session tab; its rows can be walked too. The entry's second recorded cause, the row sitting off screen, did
  not reproduce — it had simply never taken focus before. [Full detail](archive/roadmap-bugs-fixed.md#the-new-session-tab-cannot-be-reached-with-the-d-pad).

**Closed 2026-09-21 (plan 63 wave one, fixed and proven on the Deck):**

- ★ `[focus]` **Walking up from the question box skips every reply row** — **DONE, fixed and confirmed on
  the Deck 2026-09-21.** Pressing Up from the question box now lands on the answer above instead of jumping
  straight past the whole reply. [Full detail](archive/roadmap-bugs-fixed.md#walking-up-from-the-question-box-skips-every-reply-row).
- ★ `[ui]` **A new setting can quietly stop working in one place, because the list of settings is written out
  by hand several times over** — **DONE, fixed 2026-09-21.** Every setting is now named once, in one place,
  instead of being copied out by hand in several spots where one copy could quietly go stale.
  [Full detail](archive/roadmap-bugs-fixed.md#a-new-setting-can-quietly-stop-working-in-one-place-because-the-list-of-settings-is-written-out-by-hand-several-times-over).
- ★★★ `[ollama]` `[focus]` **The AI models screen closes instead of doing anything — A on almost any control
  shuts it** — **DONE, fixed and confirmed on the Deck 2026-09-21.** Pressing the controller's A button on a
  control in the AI models screen now does what that control does, instead of closing the whole screen; this
  also unblocks the new filters button, which had never once been usable.
  [Full detail](archive/roadmap-bugs-fixed.md#the-ai-models-screen-closes-instead-of-doing-anything-a-on-almost-any-control-shuts-it).

**Closed 2026-09-19 (D113, the maintainer's answers to plan 61):**

- ★ `[layout]` **An open question's row is only partly visible behind the Retry corner icon** — **DONE,
  closed by the maintainer 2026-09-19 (D113).** It read fully visible on the Deck on 2026-09-17 and at every
  walk on 2026-09-18. [Full detail](archive/roadmap-bugs-fixed.md#an-open-questions-row-is-only-partly-visible-behind-the-retry-corner-icon).
- ★ `[platform]` **Clear all plugin data left three things behind** — **DONE, closed 2026-09-19 (D113).** The
  wipe itself was proven on the Deck on 2026-09-16. The three underscore-spelled flags this fix targets stay
  proven only by their own tests; none of them has ever been seen going with the rest on a real device.
  [Full detail](archive/roadmap-bugs-fixed.md#clear-all-plugin-data-left-three-things-behind).
- ★★ `[focus]` **A checklist the model got wrong was left in the reply as raw JSON** — **DONE, closed 2026-09-19
  (D113), unit-tested.** Watch note: if a raw, unparsed checklist is ever seen in a real reply on the Deck,
  this reopens as a fresh bug rather than staying closed on the strength of the old fix.
  [Full detail](archive/roadmap-bugs-fixed.md#a-checklist-the-model-got-wrong-was-left-in-the-reply-as-raw-json).

**Closed 2026-09-19 (plan 61 day 2, games block):**

- ★ `[KB]` **A Hades boss's note is spelled wrong, so spelling it right gets you told the plugin is guessing**
  — **DONE, closed 2026-09-19.** Asking about Megaera by the correct spelling now finds her own note cleanly,
  with no "guessing" line, confirmed on the Deck on the 2026.09.18 library.
  [Full detail](archive/roadmap-bugs-fixed.md#a-hades-bosss-note-is-spelled-wrong-so-spelling-it-right-gets-you-told-the-plugin-is-guessing).

**Closed 2026-09-18 (reconciliation before plan 61):**

- ★★★★★ `[reply]` **Reasoning display** — **DONE.** Six of the seven Deck rows pass, plus the focus-graph checklist
  and the free-play sweep. The one piece left, REASONING-05's body-text read, is not owed on its own — it rides on
  the chip-ladder Bugs entry above ("The Show details chip ladder is not a D-pad stop") and clears when that bug
  does. [Full detail](archive/roadmap-completed.md#reasoning-display).
- ★★ `[reply]` **Token streaming Phase A/B** — **DONE, passed on the Deck 2026-09-04.** Start stutter fixed, sections
  as D-pad stops, and the transcript follows a growing answer down — everything the rig can drive. The touch-drag
  half of the scroll-follow check needs a finger and stays on the maintainer's own checklist.
  [Full detail](archive/roadmap-completed.md#token-streaming-phase-ab).
- ★★★★ `[tabs]` **The tab bar collapses when not in use, and names the tab** — **DONE.** Every check the rig can
  drive passes: the thin bar, the open strip, and all three remount paths it can force (a real suspend-and-resume
  still needs a hand on the power button). The old legibility-by-eye row folded into the new tab strip's own row.
  Only the touch tap is left, and it is on the maintainer's own checklist.
  [Full detail](archive/roadmap-completed.md#the-tab-bar-collapses-when-not-in-use-and-names-the-tab).
- ★★ `[chips]` **A glow when the chip row runs out of chips** — **DONE.** The cue fires on exactly the right presses,
  measured on the Deck, and now lives as the light bar under the chip flaring brighter rather than the old outline.
  Nothing measurable is left; whether it reads as *end of list* is the maintainer's own taste call, already on
  their checklist. [Full detail](archive/roadmap-completed.md#a-glow-when-the-chip-row-runs-out-of-chips).
- ★★★ `[KB]` **DRG Survivor glossary terms** — **DONE.** Underline, popup, D-pad reachability, B and one-press Up
  all walked on device. The one touch tap left stays on the maintainer's own checklist.
  [Full detail](archive/roadmap-completed.md#drg-survivor-glossary-terms).
- ★★ `[KB]` **The follow-up menu offered places from a different game than the one you asked about** — **DONE,
  two clean sightings on two different days.** A Deep Rock Galactic: Survivor question (2026-09-15) and a Hades
  question (2026-09-17) both came back with the right game's own places, no Half-Life 2 words. Any recurrence is
  a new Bugs entry rather than reopening this one.
  [Full detail](archive/roadmap-bugs-fixed.md#the-follow-up-menu-offered-places-from-a-different-game-than-the-one-you-asked-about).

**Closed 2026-09-18 (plan 61):**

- ★ `[platform]` **Shell state and tab payload extraction (refactor step 8)** — **DONE.** Every tab renders, one
  Ask works end to end, and the Ollama tab comes back clean after a wipe. The one piece left — the About tab's
  own walk down its four links — passed on the Deck 2026-09-18.
  [Full detail](archive/roadmap-completed.md#shell-state-and-tab-payload-extraction-refactor-step-8).
- ★ `[QA]` **Three rows named on this page have no steps written down anywhere** — **DONE.** All three now
  have somewhere to point to: **TAB-BAR-GHOST-01** turns out to have had a full row in the manual testing
  document all along, under its own section; **KB-FOLLOWUP-01** and **KB-KILLSWITCH-01** had steps written
  for them 2026-09-18 and landed as rows in the coverage table. Nothing shipped for this one, so there is no
  code entry to archive.
- ★ `[reply]` **Attaching a screenshot puts a line of technical text at the bottom of the answer** — **DONE,
  confirmed on the Deck 2026-09-18.** A screenshot was attached and asked about, and the reply ended with no
  bracketed debug line. Row **ATTACH-DEBUG-01**.
  [Full detail](archive/roadmap-bugs-fixed.md#attaching-a-screenshot-puts-a-line-of-technical-text-at-the-bottom-of-the-answer).
- ★★★★ `[chips]` **Preset row: two chips across, with scrolling labels** — **DONE.** The decode-mode churn
  check passed on the Deck 2026-09-18 — a flat 60 frames a second, no slow frames — the last thing the rig had
  left to measure; the speed-by-eye half already passed 2026-09-17. What is left, reduced motion and the
  maintainer's own feel for the speed, is on the maintainer's own page.
  [Full detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02).
- ★★ `[QA]` **Deferred manual QA** — **DONE.** SMOKE-A, SMOKE-F, SMOKE-E and SMOKE-H all pass on the Deck, and
  the three Tier 1 extras now all pass too — the last one, asking "What game am I playing?" with a game
  running, passed 2026-09-18. SMOKE-B was retired 2026-09-03 (D57 #6). What is left, SMOKE-C, rides on the
  still-open Open Permissions jump bug rather than being owed as a check of its own.
  [Full detail](archive/roadmap-completed.md#deferred-manual-qa).

**Closed 2026-09-17 (Deck QA worker):**

- ★★ `[ollama]` **Expert offers the stronger Deck-run models first, and the licence list learns the Sept 2026
  models** — **DONE 2026-09-17.** Both halves now pass on the Deck: the bake-off order (2026-09-16) and the
  Gemma 4 licence reading (2026-09-17). Row **EXPERT-ORDER-01**. [Full
  detail](archive/roadmap-completed.md#expert-offers-the-stronger-deck-run-models-first-and-the-licence-list-learns-the-sept-2026-models).
- ★ `[layout]` **A long reply used to sit almost entirely under the question box on the Deck's own screen** —
  **DONE 2026-09-17.** About 79-87% of a reply now shows above the sticky question box, up from about a
  third. [Full
  detail](archive/roadmap-bugs-fixed.md#on-the-decks-built-in-screen-the-rings-own-stop-for-a-whole-reply-sits-mostly-under-the-question-box).

**Closed 2026-09-16 (the maintainer's third round, D107):**

- ★★ `[KB]` **The new answer shape reads as advice-first** — **DONE 2026-09-16 (D107).** All three test
  sentences — Portal 2, Hades and Black Mesa — came back the same shape: the character's advice starts right
  after their opening line, no warning line, no spoiler box. The maintainer read all three word for word and
  called them advice-first, closing the read this row had waited on since 12 September. Row **KB-ANSWER-03**;
  evidence `docs/test-evidence/plan56-KB-ANSWER-03-three-replies.md`,
  `docs/test-evidence/plan55-KB-ANSWER-03-hades.json`, `docs/test-evidence/plan56-KB-ANSWER-03-blackmesa.json`.
- ★★ `[KB]` **The "no close match" line now shows up only when it should, even when the game is only named in
  the question** — **DONE 2026-09-16 (D107).** Seen live on the Deck's own screen, build `14a6392`, once
  Ollama and the knowledge base were back on the Deck: a stretch question that only names a game gets the
  line, and a real question about that game does not, both directions confirmed. Row
  **HONESTY-TEXT-GAME-01**; evidence `docs/test-evidence/plan56-HONESTY-LINE-03-on-screen.json`.
- ★★★ `[ask]` `[focus]` **Steam settings shortcuts: the card floats, the D-pad walks in and out, tap outside
  to close** — **DONE 2026-09-16 (D107).** All six steps of plan 45 are confirmed on the Deck: the floating
  card, its six-row cap, the D-pad wiring in and out of it, and opening a Steam setting from a row. The one
  open call left — whether the typed words survive a jump back from Steam — is settled: the card keeps
  working the way it does today, so the box is left empty when you come back. Nothing about the card is owed
  any more. Rows **SETTINGS-CARD-01** through **07**. [Plan](planning/45-settings-shortcut-card.md) ·
  [Mockups](https://claude.ai/code/artifact/1ab2a570-2ae5-45cd-b12b-332694f96fd5).
- ★ `[reply]` **The slow-reply footnote reads as a broken sentence — not a bug, 2026-09-16 (D107).** The
  sentence was always whole on screen: "150.8s (>60s): prefer GPU for Ollama, not CPU" reads in full on the
  screenshot `screenshots/DeckCapture_20260916_115628_game.png`. The earlier blank-looking read came from the
  test rig's own label reader splitting the bold words GPU, Ollama and CPU into three separate labels, not
  from the plugin. Evidence `docs/test-evidence/plan56-HONESTY-LINE-03-on-screen.json`.
- ★ `[ollama]` `[ui]` **"Open AI models…" read like "OpenAI models"** — **FIXED 2026-09-16 (D107, commit
  `79b1a0e`), deployed the same afternoon.** The Ollama tab's button now says "Manage AI models…", with the
  policy tier after the dash as before; the button's spoken label, the hint inside the picker and the
  troubleshooting guide all say the same. Reported by the maintainer from the Deck.

**Closed 2026-09-06:**

- ★★ `[KB]` **Prompt diet: the model reads far fewer rules for every fact it knows** — **DONE 2026-09-06.**
  The instructions sent with every game question fell from 6,930 to 5,682 characters: the model is no longer
  asked to cite cards in a way the screen cannot show, and screenshot rules only appear when a screenshot is
  actually attached. A third change — moving the cards next to the question — exists only as a switch that
  stays off by default, because turning it on made the spoiler warning show up correctly far less often.
  Measured before and after on the answer test on this PC, and confirmed on the Deck 2026-09-06: a Hades
  question about a boss with a note came back with that boss's own tactics, the prompt was trimmed to fit,
  and the old silent-drop warning was gone. The row's three answer-test sentences and its screenshot
  question were not run on the device. Commits `61975bf`, `0b96405`, `fcfc9a0`.


**Accepted, not fixed, 2026-09-16:**
- ★ `[focus]` **ACCEPTED 2026-09-16 — the AI models hub's own buttons should pass the D-pad to each other at their
  edges** — measured on the Deck: pressing Up at the top of the tier choices already lands back on the Policy button,
  and pressing Down at the bottom of the advanced switches already reaches the README button, then Done. Both edges
  already hand the highlight to the next group; the bug does not happen on this build, so nothing needed building.
  Evidence `docs/test-evidence/plan56-M-hub-edges.json`, `docs/test-evidence/plan56-M-hub-edges-policy.json`,
  `docs/test-evidence/plan56-M-hub-edges-advanced.json` (plan 56 block 0).

**Closed by the wipe run, 2026-09-16:**
- ★ `[voice]` **A finished voice-engine install survives Clear all plugin data, and the panel says so** —
  after a wipe the voice panel now reads "not installed" and "not downloaded" instead of still claiming the
  engine is ready; confirmed on the Deck.
  [Detail](roadmap-completed.md#three-voice-fixes-and-the-custom-model-picker-closed-by-the-wipe-run-2026-09-16).
- ★★★ `[ollama]` **Clear all plugin data takes the New model labels with it** — the record that badges a
  stale model as freshly pulled is gone after a wipe, so nothing wears the New label by mistake; confirmed
  on the Deck.
  [Detail](roadmap-completed.md#three-voice-fixes-and-the-custom-model-picker-closed-by-the-wipe-run-2026-09-16).

**Checked on the Deck, closed in the roadmap 2026-09-16 (morning, lane I):**
- ★ `[focus]` **Left on the Ask button, the paperclip, or an answer paragraph now stays in the plugin** —
  it used to hand the highlight to Steam's own Quick Access tab; confirmed on the Deck for all three.
  [Detail](roadmap-bugs-fixed.md#three-d-pad-fixes-from-lane-i-checked-on-the-deck-2026-09-16-morning).
- ★ `[focus]` **Reopening a saved reply no longer traps Down in a loop** — a twelve-press walk now reaches
  Read aloud, Show details and the Ask bar instead of cycling the turn forever; confirmed on the Deck.
  [Detail](roadmap-bugs-fixed.md#three-d-pad-fixes-from-lane-i-checked-on-the-deck-2026-09-16-morning).
- ★ `[focus]` **A greyed Helpful or Not really no longer steals the highlight** — on a stopped reply, Down
  and Up now skip both greyed thumbs and land on Read aloud or the answer's own text instead; confirmed on
  the Deck both directions.
  [Detail](roadmap-bugs-fixed.md#three-d-pad-fixes-from-lane-i-checked-on-the-deck-2026-09-16-morning).

**Checked on the Deck, closed in the roadmap 2026-09-16 (afternoon):**
- ★★ `[ui]` `[ask]` **A Clear button on the Session context bar** — one press asks once, then the plugin
  forgets the last strategy subject and the strategy checklist position for the running game; the chat and
  the bar's rows stay. Confirmed end to end on the Deck, including the log line proving the forget.
  [Detail](roadmap-completed.md#the-clear-button-the-quiet-answer-checker-and-the-spys-lies-confirmed-on-the-deck-2026-09-16).
- ★ `[ask]` **The answer checker now runs quietly on every answer** — one log line, nothing on screen, no
  second model call; confirmed on the Deck, the first time it has ever run.
  [Detail](roadmap-completed.md#the-clear-button-the-quiet-answer-checker-and-the-spys-lies-confirmed-on-the-deck-2026-09-16).
- ★★★ `[reply]` **The Spy can lie to you on purpose** — at the Heavy or Unleashed accent setting his advice
  can sound right and be wrong, and Show details on that reply says he was on and what he lied about;
  confirmed on the Deck at Heavy, with the lie named in the chip stored with the turn.
  [Detail](roadmap-completed.md#the-clear-button-the-quiet-answer-checker-and-the-spys-lies-confirmed-on-the-deck-2026-09-16).
- ★ `[ollama]` **The Expert (large) group in the download picker can be shown again** — with Essentials only
  switched off it had been impossible to show since a June change; confirmed on the Deck, the group now
  appears with its models in the locked bake-off order.
  [Detail](roadmap-bugs-fixed.md#two-more-fixes-checked-on-the-deck-2026-09-16-afternoon).
- ★ `[focus]` **Choosing a mode in the Ask-mode menu no longer drops the highlight** — picking Speed,
  Strategy or Expert now hands the highlight back to the mode button, the same as backing out already did;
  confirmed on the Deck both ways.
  [Detail](roadmap-bugs-fixed.md#two-more-fixes-checked-on-the-deck-2026-09-16-afternoon).

**Checked on the Deck, closed in the roadmap 2026-09-16:**
- ★ `[focus]` **Pressing Ask no longer drops the highlight** — the ring lands on the question box when a
  real question is typed, and stays on the Ask button when it is empty; confirmed both ways on the Deck,
  2026-09-15 and 16. [Detail](roadmap-bugs-fixed.md#three-more-fixes-checked-on-the-deck-2026-09-16).
- ★ `[focus]` **Closing the model try-order picker returns the highlight to its own button** — instead of
  landing about thirteen presses away on the tab; confirmed on the Deck for both the text and vision
  pickers, 2026-09-15 and 16. [Detail](roadmap-bugs-fixed.md#three-more-fixes-checked-on-the-deck-2026-09-16).
- ★★ `[ui]` **The copy button no longer sits on top of the code box** — a reply ending in a code box now
  leaves the copy icon clear below it; confirmed on the Deck 2026-09-16.
  [Detail](roadmap-bugs-fixed.md#three-more-fixes-checked-on-the-deck-2026-09-16).

**Checked on the Deck, closed in the roadmap 2026-09-14 and 15:**
- ★★★ `[reply]` **A Speed-mode reply no longer ends with a block of raw computer text where a power tip
  should be** — confirmed on the Deck 2026-09-15: the reply ends in normal sentences, with no leftover
  computer-looking line. [Detail](roadmap-bugs-fixed.md#three-more-fixes-checked-on-the-deck-2026-09-15-evening-plan-55).
- ★★ `[focus]` **Opening the panel now tries to place the highlight on the question box** — holds on an
  ordinary fresh open, confirmed twice on the Deck 2026-09-15; the one miss is the very first open right after
  a fresh deploy's restart, which is now a known and explained case rather than an open bug.
  [Detail](roadmap-bugs-fixed.md#three-more-fixes-checked-on-the-deck-2026-09-15-evening-plan-55).
- ★ `[ollama]` **A model with no listed size now warns before you pick it in the try-order picker** —
  confirmed on the Deck 2026-09-15: it reads "Size unknown - may be too large" and can still be moved.
  [Detail](roadmap-bugs-fixed.md#three-more-fixes-checked-on-the-deck-2026-09-15-evening-plan-55).
- ★★★ `[KB]` **The line under the question box now keeps up with the game you are playing** — it updates
  within seconds of a game starting or closing while the panel stays open, and it now shows the game's name
  instead of a number; confirmed both ways on the Deck 2026-09-15.
  [Detail](roadmap-bugs-fixed.md#the-game-line-updates-live-checked-on-the-deck-2026-09-15-evening-plan-55).
- ★ `[chat]` **A short question no longer fades as if it were cut short** — a one-line question shows no fade;
  confirmed on the Deck 2026-09-15 by measurement and by the maintainer's own eye.
  [Detail](roadmap-bugs-fixed.md#five-focus-and-chat-fixes-checked-on-the-deck-2026-09-15-evening-plan-55).
- ★ `[focus]` **Pressing A on an open question keeps the highlight on that question** — closing a question no
  longer drops the ring to nothing; confirmed on the Deck 2026-09-15.
  [Detail](roadmap-bugs-fixed.md#five-focus-and-chat-fixes-checked-on-the-deck-2026-09-15-evening-plan-55).
- ★ `[focus]` **Left on the collapsed-history row stays in the plugin** — it used to hand the highlight to
  Steam's own Quick Access rail; confirmed on the Deck 2026-09-15.
  [Detail](roadmap-bugs-fixed.md#five-focus-and-chat-fixes-checked-on-the-deck-2026-09-15-evening-plan-55).
- ★★ `[focus]` **Up from the first archived chat header now reaches the chat slot row** — it used to run all
  the way to the tab bar; confirmed on the Deck 2026-09-15.
  [Detail](roadmap-bugs-fixed.md#five-focus-and-chat-fixes-checked-on-the-deck-2026-09-15-evening-plan-55).
- ★★ `[KB]` **Pinned test chips show their amber Test badge** — confirmed by eye on the Deck 2026-09-15 with
  the chip animation set to decode, the one style that never drew it.
  [Detail](roadmap-bugs-fixed.md#five-focus-and-chat-fixes-checked-on-the-deck-2026-09-15-evening-plan-55).
- ★ `[layout]` **Rows span the QAM panel width** — every Main row now reaches both edges of the panel with
  nothing overflowing sideways, confirmed by eye on the Deck 2026-09-15 after being measured by rect back in
  August. [Detail](roadmap-completed.md#rows-span-the-qam-panel-width-confirmed-by-eye-on-the-deck-2026-09-15).
- ★★★★★ `[platform]` **The seven-phase clean-up (round two)** — every file now explains itself in plain
  words, two knots in the back end are untied, and nothing a person using the plugin can see changed. Ran
  13 to 15 September 2026. Phases 3 and 4 were checked on the Deck; phase 5 needed no check because no line
  of program code changed in it. What it cost and what it missed: [the postmortem](../audit/refactor-round-two/postmortem.md).
- ★★★ `[KB]` **A follow-up looks up the thing you were just asking about** — ask about a boss, then "what about
  its second phase", and you get the right boss two times in three. It used to be wrong every time. Checked on the
  Deck 2026-09-12; replies on these turns are about half as long. The third that still fails stayed in the roadmap
  as its own bug. [Detail](roadmap-bugs-fixed.md#the-follow-up-that-looks-up-what-you-were-just-asking-about-2026-09-12).
- ★★★ `[chips]` **Decode preset chip animation** — the preset chips arrive as scrambled green blocks and lock into
  the real prompt left to right behind a blinking caret. Measured on the Deck 2026-08-28 at a flat 60 frames a second
  with every chip decoding, and the ring stays clean while they churn. Whether it reads well was the one thing left, and
  the maintainer judged the look good on 2026-09-14. [Detail](roadmap-completed.md#the-decode-animation-on-the-preset-chips-judged-by-eye-2026-09-14).
- ★★★ `[layout]` **Copy sits in the answer's corner, not in a button row** — the row of buttons under a reply is
  gone. Copy is a faded icon at the answer's bottom right, Retry a faded arrow on the newest question. Walking the
  reply down and back up visits every control once, and Copy put all 1,834 characters on the clipboard. Verified on
  the Deck 2026-09-06. [Detail](roadmap-completed.md#the-reply-block-rework-checked-on-the-deck-2026-09-06).
- ★★ `[layout]` **Show details becomes a divider, not a chip** — a thin line across the reply with **Show details ↓**
  in the middle, sharing both edges with the answer bubble above it. One press opens, one press closes. Verified on the
  Deck 2026-09-06. [Detail](roadmap-completed.md#the-reply-block-rework-checked-on-the-deck-2026-09-06).
- ★★ `[focus]` **Fewer D-pad stops on a finished reply** — an answer of about 1,800 characters used to take six
  presses to walk; it takes three now, and a short one is a single stop. Nothing is skipped. Verified on the Deck
  2026-09-06. [Detail](roadmap-completed.md#the-reply-block-rework-checked-on-the-deck-2026-09-06).
- ★★★ `[KB]` **You are told when an answer leans on the model's memory rather than your notes** — the first line
  never appeared, because the note search always found something to attach. A second line was built instead, on the
  maintainer's call: it says the match was thin, and it catches three of the four questions that started this. Closed
  2026-09-07. [Detail](roadmap-bugs-fixed.md#two-knowledge-base-fixes-checked-on-the-deck-2026-09-07-and-2026-09-12).
- ★★★ `[KB]` **Every question no longer waits a second for the notes to be searched** — the Deck held one model at a
  time, so writing an answer pushed the note-searching part out and the next question spent about seven tenths of a
  second loading it back. A new **Start the AI with the Deck** switch keeps both in memory: 24 thousandths of a second
  instead of 732. It also fixed something nobody had noticed — nothing started the AI at all, so a restart left the
  plugin with no AI until someone started it by hand. Off by default. Checked on the Deck 2026-09-12.
  [Detail](roadmap-bugs-fixed.md#two-knowledge-base-fixes-checked-on-the-deck-2026-09-07-and-2026-09-12).

**Landed 2026-09-13 (nothing a person using the plugin can see):**
- ★★ `[platform]` **Refactor round two, phase 3: the deleting** — landed 2026-09-13, checked on the
  maintainer's Deck the same evening. About 600 lines of source removed across 71 files: the names the screen code offered
  that nobody wanted went from 126 to 21, back-end code nothing calls from 18 to 2 (both of those held on purpose), and a
  whole superseded way of getting the voice engine onto the Deck. Four commits, one per group, so a fault could be traced.
  On the Deck: sixteen controls reached with the D-pad in thirty presses with no dead ends, all six tabs present, and one
  real question — how the excursion funnel works in Portal 2 — asked with the controller and answered correctly in
  42.6 seconds with a clean log. **Nothing a person using the plugin would notice has changed.**
  [Evidence](../test-evidence/phase3-delete-round-deck-check.json), [notes](../audit/refactor-round-two/session-notes.md).
- ★★★ `[platform]` **Refactor round two, phase 0: the tools** — landed 2026-09-13. One check command every
  worker runs before saving (26 seconds, or 51 for the fuller merge check), a list of eighteen numbers that may only get
  better, a map of what the back-end depends on, a checker that every file explains itself, three safety rails, a helper
  that lists and clears away copies of the project, and a queue so two workers cannot drive the Deck at once. Built by four
  workers at once for about 693,000 tokens. [Plan](../planning/51-refactor-round-two.md), [notes](../audit/refactor-round-two/session-notes.md).

**Shipped 2026-09-12, Phase 1 (checked on the maintainer's Deck the same evening):**
- ★★ `[voice]` **Read answers aloud** — shipped 2026-09-12, Phase 1: the Deck's own built-in voice, nothing to download. A
  Read aloud line under a finished answer speaks it one sentence at a time, starting in about a second; the line changes to
  Stop, and pressing it again, or asking a new question, stops the speech. It keeps reading with the menu closed. A hidden
  spoiler is announced as "a spoiler is hidden here", a table as "there is a table on screen", code as "there is code on
  screen". Settings gained a three-way **Voice replies** choice: Off (default), When I asked by voice, Always. On the Deck:
  the D-pad reaches Read aloud from the answer's Copy corner and the Settings row saves its choice, both **PASS**; pressing
  Read aloud starts and stops the speech with a sound stream confirmed on the speaker, and Always read a fresh answer with
  no press, both **PASS by machine, hearing it is still owed to the maintainer's ear**. Still owed: hearing it for real
  (speakers, headphones, Bluetooth, over a running game), whether a spoken question reads itself while a typed one does
  not, and whether asking something new stops a reading already playing. [Memo](../planning/42-read-aloud-feasibility.md).

**Closed 2026-09-12 (the maintainer closed this research entry; its remaining work lives in the plan it started):**
- ★★★★★★ `[platform]` **Steam Frame companion UX** — closed as done 2026-09-12 (D97 call 1). The study's own first step
  shipped the same day: the seven Frame knowledge-base tips were rewritten so none of them point at a phone app that does
  not exist, and the README gained one line on how to use bonsAI beside a Frame. The nine features the study planned carry
  the rest of the work; see [plan 49](../planning/49-steam-frame-features.md).

**Fixed 2026-09-11 (Deck testing tools, not the plugin itself, so no Deck check is owed for this pair):**
- ★ `[platform]` **Deck recorder produced empty videos** — it used to ask the compositor for its video by name,
  which connects but never sends a picture, so recordings came out empty; it now asks for the video by its
  number first and a clip records on the first try. Fixed in commit `9d4407c` here and `12260e3` in the
  plugin-studio checkout; the plugin-studio server needs a restart to load the fix.
- ★ `[platform]` **Deck walk tool wrote a file on every run** — every run used to save a record file whether
  anyone wanted one or not, and 464 built up and got committed by accident; only a run you name now saves one,
  and the folder they land in is ignored by git from today. Fixed in commit `9d4407c` here and `12260e3` in the
  plugin-studio checkout. The old files stay until plan 51's docs phase decides which ones a testing row cites.

**Fixed 2026-09-07 (knowledge base, wave three — these are the tools that grade answers and searches, not
the plugin itself, so nothing here needs a Deck check):**
- ★★★★ `[KB]` **The search test now checks the actual library instead of a leftover copy from 31 August** —
  it used to reuse whatever copy of the notes it found lying around, so every question about a game added
  this month scored as a miss no matter how good the search really was. It now rebuilds its copy whenever
  the notes are newer, refuses to run at all on a stale copy it cannot rebuild, and prints the version and
  the number of notes it searched with every report.
- ★★★ `[KB]` **The answer test no longer waves through a reply that says the opposite of its own note** —
  asked whether Pikmin 2 still has a day limit, a reply once said yes when the note says no, and the check
  passed it because it was only looking for two exact sentences neither of which the model happened to
  write. Claims are now read one sentence at a time, and a word like "too" is treated as a negative the
  same way "not" is.
- ★★ `[KB]` **The answer test stops marking a correct answer wrong just for using different words** — a
  reply that said "thin the crowd" used to fail a check looking for the exact words "keep the crowd thin",
  and the same for "kill the mother" against "killing the mother". Answers that mean the same thing now
  count as right.

**Accepted, not fixed, 2026-09-07:**
- ★ `[focus]` **ACCEPTED 2026-09-07 — the ring can land on a spot half hidden behind the Copy or Retry icon** —
  measured on the Deck: the only fix is a taller question bubble, which costs 18 pixels on every short
  question. No text is ever hidden either way. The maintainer looked at that trade and chose to leave it as
  it is. Evidence `docs/test-evidence/plan47-R7-walk-into-reply.json`, `docs/test-evidence/plan47-R7-back-to-question.json`. (D86)

**Verified on the Deck 2026-09-07 (knowledge base, wave two evening):**
- ★★★★ `[KB]` **A first tranche of new titles from your Steam library** — checked on the Deck 2026-09-07
  (**KB-TRANCHE-01**). Each of the twelve games added this month — Black Mesa, Hollow Knight, GTA V, GTA IV, DOOM
  Eternal, Doom 64, Super Mario 64, Mario Kart 64, Paper Mario TTYD, Super Smash Bros. Melee, Fallout: New Vegas,
  Pikmin 2 — brought back notes about the right game. The 21 notes written this wave to fill in blank spots, and the
  filled-out weakest four games, were all found among the top three results, most of them first. Fallout: New Vegas
  is still not installed on the device, so it was asked about by name only, which the check allows.
  [Plan](40-new-titles-from-the-library.md). (D69, D83, D85)

**Verified on the Deck 2026-09-06 (knowledge base, wave one):**
- ★★★ `[KB]` **A long Strategy question no longer throws away its game notes** — when a question would send more to the
  model than its window can hold, the reply now gets shorter instead of the notes being dropped from the front of what
  the model reads. Confirmed on the Deck with the character voice on, thinking at medium, Hades running: asking about
  Megara — a boss with a note — got an answer built from it, and the log showed the reply budget trimmed from 2112 to
  1800 tokens so the prompt fit, with the old silent-drop warning gone. **Correction to this entry's old evidence:** it
  used to point at a different Hades boss, the Bone Hydra, who has no note in the library — a generic answer to that
  question was always correct and never proved the bug. The real evidence is a PC test run that lost the start of 22 of
  37 prompts, and three Deck questions that went over the window by 703, 780 and 712 tokens. Full numbers and the three
  smaller trims that came first: [CHANGELOG.md](../../CHANGELOG.md). On-Deck **KB-PROMPT-FIT-01** in [testing.md](../testing.md).
  [Detail](roadmap-details-closed.md#game-notes-are-attached-and-then-thrown-away).
- ★★★ `[KB]` **A quick question in Speed mode no longer pays for the slow search** — confirmed on the Deck 2026-09-06 with
  Deep Rock Galactic: Survivor running, on a fresh build. All three of the row's sentences were asked in Speed: two read
  *Keyword search*, the third read *Knowledge base (skipped)* because the word search found nothing on its own — none of
  them spent any time on the meaning search. Fixed on the shared branch 2026-09-05 (`c72310a`). Row **KB-RECALL-01**'s
  Speed half closes. Evidence `docs/test-evidence/plan46-R2-speed-half.json`.
- ★★★ `[KB]` **The meaning search searches on its own instead of re-ordering keyword hits, and about a second is an
  accepted cost** — confirmed again on the Deck 2026-09-06: three Strategy questions all read *Keyword + meaning*, and
  the same three in Speed read *Keyword search* with no embed time. The remaining question was the clock: the meaning
  search took 1.10, 1.23 and 1.19 seconds, every question, not just the first. The maintainer said that speed is fine
  and retired the one-second target the row was measured against (D84). Rows **KB-RECALL-01** and **KB-RECALL-02** close.

**Checked on the Deck 2026-09-06 and found fine:** a suggestion chip that looked like scrambled characters was the
reveal animation caught mid-frame, and a slow-reply notice that looked like it was missing words reads correctly in
full — *"69 seconds, over 60: prefer GPU for Ollama, not CPU."*

**Verified on the Deck 2026-09-06 (reply block, second pass):**
- ★ `[reply]` **Retry works on a reply that came back after a restart** — reopening the plugin after it restarts shows your
  last conversation, and the Retry badge on it used to send nothing at all. It re-asks the question it is drawn on now.
  Found and fixed 2026-09-06; confirmed on the Deck the same day, badge pressed with the controller, a real request logged
  with that question. [Detail](roadmap-bugs-fixed.md#retry-on-a-restored-reply-sent-nothing).
- ★★ `[focus]` **The end of a long answer now stays clear of the Ask bar in both directions** — coming back up from the
  Show details line used to leave a third of the last part behind the bar, at the same spot every run. A scroll log on the
  Deck showed why: the plugin's "lift it clear" step was being ignored by the browser for anything inside the answer
  bubble, and Steam's own slow scroll then dragged the part under the bar. The lift now moves the panel itself when the
  browser will not. Runs: `reply-block-up-into-answer-fixed`, `reply-block-both-ways-after-lift-fix`,
  `reply-block-corner-icons-inside`.
- ★★ `[reply]` **Retry and Copy sit inside their bubbles' corners** — both had been straddling the bubble edge, half in
  and half out. Retry is 7px in from the question bubble's left edge and 4px up from its bottom; Copy is 7px in from the
  answer's right edge and 4px up. Each bubble's last line leaves room for its icon, no bubble grew, and the reply block
  starts where it did before the icons existed. Runs: `reply-block-corner-icons-inside`, `reply-block-copy-right-down-up`.

**Verified on the Deck 2026-09-06 (round 34 continued):**
- ★★★ `[ollama]` **The order you set for which model to try now sticks** — found and fixed the same night. Setting an order used
  to be undone half a second later, so the setting looked like it did nothing.
  [Detail](roadmap-bugs-fixed.md#round-34-continued-2026-09-06)
- ★ `[reply]` **A branch question names the game again** — the follow-up question at the end of a Strategy answer used to say
  *"Where are you at in … ?"* with the game's name replaced by three dots. It now says the name.
  [Detail](roadmap-bugs-fixed.md#round-34-continued-2026-09-06)
- ★★ `[reply]` **Stopping a reply now says so** — pressing Stop leaves a *Stopped — partial answer kept.* line, keeps the half
  answer, greys out Helpful and Not really, and leaves Retry live.
  [Detail](roadmap-bugs-fixed.md#round-34-continued-2026-09-06)
- ★★★★ `[chat]` **A chat's follow-up question stays in its own chat** — the block used to show up in whichever chat you were
  looking at. It now shows only in the chat that asked for it, and comes back when you switch back.
  [Detail](roadmap-bugs-fixed.md#round-34-continued-2026-09-06)
- ★★★ `[platform]` **Legacy-loader shim removal (D11)** — the last two checks it owed ran on the device: a real Ask typed into
  the Main tab, and a voice recording started and stopped for real.
  [Detail](roadmap-completed.md#round-34-continued-2026-09-06)

**Verified on the Deck 2026-09-05 (round 36):**
- ★ `[layout]` **The question bubble lines up with the answer below it** — it used to sit further in from the left than
  the answer sat from the right, which read as lopsided. Both are now the same width and mirrored.
  [Detail](roadmap-bugs-fixed.md#round-36-2026-09-05)
- ★★ `[reply]` **Replies always arrive word by word** — streaming is how replies work now, and the Developer switch for it is
  gone. [Detail](roadmap-completed.md#round-36-2026-09-05)
- ★★ `[chips]` **Preset chip expansion** — six new suggestion chips for the things that shipped since early August. Both waves
  checked in one sitting. [Detail](roadmap-completed.md#round-36-2026-09-05)
- ★★★ `[chips]` **One suggestion chip instead of two** — a Settings switch, off by default, gives one chip the whole column.
  [Detail](roadmap-completed.md#round-36-2026-09-05)

**Withdrawn 2026-09-02:** *QAMP Phase 2 profiles* and the *QAMP verification checklist*. Both tested TDP apply, which was removed
on 2026-07-30 (`apply_tdp` no longer exists). Preserved in the archive.

**Closed as not reproduced 2026-09-02:** *`run_python_tests.py` exits 0 when tests fail*. The script has returned 1 on failure
since April (`25742f2`), and a deliberate failing test exits 1 today. If it recurs, record the exact command and shell.

**September 2026**
- ★★★ `[KB]` **A quick question stops paying for the slow search** — Speed mode now does the fast keyword lookup and
  nothing else, which takes about a second off every Speed question. Measured on the Deck 2026-09-05, same question and game
  in all three modes: Speed spent **0 ms** on the slow search, Strategy 1473 ms, Expert 53 ms. Strategy and Expert are
  unchanged. The trade the maintainer accepted is that a Speed answer loses the cards only the slower search finds (D62 #2).
- ★★ `[chat]` **The question you asked shows in full** — open a turn and the whole thing is there, wrapped over up to five
  lines with the last one fading; close it and it goes back to a single line. It used to be cut twice and you never saw more
  than about 48 letters. Confirmed on the Deck 2026-09-05: a 57-letter question wrapped over two lines with no dots (D60).
- ★ `[main]` **The line under the question box knows a game is running before you ask** — it used to say no game was
  running until your first question, even with a game open and its own chips on screen. Confirmed on the Deck 2026-09-05:
  started a game, opened the panel, pressed nothing, and the line named the game (CHIP-ROTATION-01).
- ★ `[focus]` **An answer paragraph no longer takes the highlight while hidden behind the bottom bar** — the step that
  lifts it clear now tries again at 300 and 900 milliseconds instead of giving up after the first go. Confirmed on the Deck
  2026-09-05: walking a reply down and back up, every stop fully visible, where the same walk before the fix had two a
  person could not see.
- ★★ `[KB]` **Asking about a boss by name works the way people actually type** — *king dodongo fight* now names the boss
  just as *how do I beat king dodongo* does, so its tactics come through unfenced; a vague question still names nothing and stays
  fenced. All seven sentences confirmed on the Deck 2026-09-05.
  [Detail](roadmap-completed.md#moved-from-the-roadmap-2026-09-05).
- ★★ `[KB]` **Expert mode gets as many cards as Strategy** — Expert was quietly starved of the knowledge base. Five cards
  against Strategy's three on the same question (2026-09-04), and the last owed check — an uncovered game attaching nothing —
  passed 2026-09-05. [Detail](roadmap-completed.md#moved-from-the-roadmap-2026-09-05).
- ★★★ `[KB]` **Show details says what the knowledge base had for your game** — all four readings now confirmed on the Deck:
  a covered game reads the section count, the toggle off reads off, no game running says so, and a game the corpus does not
  cover reads *none for this game* (2026-09-05). [Detail](roadmap-completed.md#moved-from-the-roadmap-2026-09-05).
- ★★ `[reply]` **Choose how hard the AI thinks** — an Off / Brief / Balanced / Deep row on the Ollama tab. Both Deck checks
  passed (the D-pad walk 2026-09-03, a real thinking model 2026-09-04); the entry had simply never been moved.
  [Detail](roadmap-completed.md#moved-from-the-roadmap-2026-09-05).
- ★★ `[focus]` **Show details tells you where you are without a wall of colour** — you failed the first version on the Deck
  2026-09-05 ("too much noise"); rebuilt to one colour on the row and passed on the second look (CONTEXT-LADDER-01). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★ `[focus]` **The character picker uses the plugin's own white highlight** — you failed the first version on the Deck 2026-09-05
  ("rings that are yellow, they should be white"); the tiles now take the same white ring as everything else and passed on the second look (CHAR-PICKER-RING-01). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★★ `[focus]` `[perms]` **A blocked reply's Open Permissions button works end to end on the D-pad** — verified on the Deck
  2026-09-05: the button is a stop, A lands on the matching toggle, A turns it on, and *Back to Main* returns to the reply (PERM-JUMP-01). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★★ `[focus]` **After a modal closes or the panel remounts, the ring no longer sits on a hidden tab button** — verified on
  the Deck on all three paths the rig can drive: modal return, QAM reopen and a loader restart (TAB-BAR-11). A real suspend and resume still wants a by-hand look. [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★★ `[focus]` **Entering a reply from above or below lands on a section, not the whole bubble** — verified on the Deck:
  Down from the chat row reaches the first section (2026-09-04) and Up from Helpful the last (2026-09-05), after the thumbs row's own Up was fixed (CHAT-REPLY-ENTRY-01). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★ `[focus]` **Reordering in the try-order picker keeps the highlight and keeps the picker open** — verified on the Deck
  2026-09-04 on the third fix: A on a row's Down button moves the row and the ring follows it (PICKER-REORDER-02). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★ `[ask]` **The question overlay now sits exactly on the native text field** — verified on the Deck 2026-09-04: the field and
  its two mirrors agree on wrapping, font and width to 0.02 px, empty and with a two-line question (ASK-OVERLAY-01). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★ `[chips]` **Chip rotation reaches past the top three of the candidate list** — verified on the Deck 2026-09-04 with Half-Life 2
  running: ranks 2, 3, 4 and 5 of its eight chips came round inside 30 seconds and rank 1 did not (CHIP-ROTATION-01). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★★ `[chat]` **A command reply keeps its question as the header and titles the chat** — verified on the Deck 2026-09-04: the VAC
  check reply is saved to the chat like any other turn, so the header and the chat title read the command (CMD-REPLY-TITLE-01). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★ `[focus]` **Up from a preset chip leaves the row in one press** — verified on the Deck 2026-09-04 on an empty chat (to the chat row)
  and with a reply on screen (to the session strip); Left still walks the history (PRESET-ONE-LINE-03, D58 #2). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★ `[chips]` **A pinned test batch longer than the row now reaches its tail, and an Ask restarts the walk** — verified on the Deck
  2026-09-04 with the eleven-sentence batch (QA-FROZEN-CHIPS-02). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★ `[focus]` **The greyed-out Clear frozen test chips button no longer takes a dead press** — verified on the Deck 2026-09-04: with no
  batch pinned the button is gone and a Developer sweep finds no such stop (DEV-CLEAR-CHIPS-01). [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★★ `[focus]` **Left on the Ollama sliders no longer throws the ring out of the plugin** — verified on the Deck 2026-09-04 on the Reply
  style, keep-alive and custom-timeout sliders (ONBUTTONDOWN-AUDIT-01); the UI-scale slider got the same fix, unit-tested only. [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★ `[KB]` **The KB arms report's verdict now judges every retrieval arm** — fixed at the desk 2026-09-04. It used to compare
  only `rrf` against `keyword` and could print "no separation" while a third arm (`vector_only`) was well ahead in the same
  table; desk-only, no Deck check applies. [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- ★ `[reply]` **A branch-pick turn keeps the caption you saw** — verified on the Deck 2026-09-04 (CHAT-HEADER-CAPTION-01):
  the header read *"I'm at: Dodging Asterius's charge"* before and after closing and reopening the panel.
- ★ `[ui]` **The bonsai pot sits centred under the canopy** — measured from a Deck capture 2026-09-04 (BONSAI-ICON-GEOM-01):
  canopy, stem, pot rim and pot body all centre on the same pixel column, in the tab strip and in Decky's plugin list.
- ★★ `[KB]` **Troubleshooting questions reach the compat cards** — D16's word-boundary routing verified on the Deck 2026-09-04
  (KB-ROUTER-01, four sentences, every one routed to `compat_tips`).
- ★★★ `[KB]` **Knowledge chips say where the card came from, and when** — the owed capture-date check passed on the Deck
  2026-09-04 (KB-ATTRIB-01): `combineoverwiki.net · CC-BY-SA-4.0 · as of 2026-08-09`.
- ★★ `[tabs]` **Your tab is remembered when you leave and reopen** — D15's three-way choice verified on the Deck 2026-09-03
  (TAB-RESUME-01/-MODE-01/-FOCUS-01); the first-press focus snap stays open with the picker focus-restore item.
- ★ `[chips]` **The static seed stops telling you to enable the knowledge base when it is already on** — verified on the Deck
  2026-09-03 (PRESET-KB-SEED-01).
- Prompt budget guard (D46): attached Proton logs capped at 4 KiB newest-first, the follow-up paste capped at 1,500
  characters, and a plugin-log warning whenever prompt plus reply budget would not fit the Deck's 4,096-token window,
  2026-09-03.
- Fence fix confirmed on the Deck (**KB-ANSWER-02**, 5 of 5) and the *Update knowledge base* button confirmed working from a
  controller press, 2026-09-03. [Detail](roadmap-bugs-fixed.md#moved-from-the-roadmap-2026-09-04).
- Collapsing tab bar with tab names (plan 30 W0 to W6), 2026-09-02.
- Preset row rebuilt: two chips across, scrolling labels, help chip owns the row (D43), 2026-09-01/02.
- Spoiler fences no longer wrap harmless tactics on no-story games or named bosses, 2026-09-02.
- Answer-side eval harness (`scripts/eval_kb_answers.py`, D45) with its first baseline, 2026-09-02.
- Corpus `2026.09.01` (161 cards) published and installed on the Deck, 2026-09-02.

**Late August 2026**
- A finished long reply scrolls to its end through Steam's own scroller, 2026-08-31.
- Chat slot strip runs newest to oldest; an Ask at `[+]` creates the chat; never-used chats delete themselves (D42), 2026-08-31.
- Focused controls at the end of a reply are lifted clear of the preset dock, 2026-08-31.
- Free-play sweep added as a standing QA row (QA-FREE-PLAY-01), 2026-08-31.
- Nothing hangs below the bottom of the screen (50px clip fixed), 2026-08-30.
- Named chat slots v3 redesign, all 19 commits; sticky Ask dock; game name above the slot title, 2026-08-30.
- Corpus chips no longer vanish 21 seconds after the panel opens; all six game chips rotate through, 2026-08-29.
- "Force session RAG chips" reaches rotation as well as seeding, 2026-08-29.
- Card relevance has its second signal (pool margin); junk questions get no cards from the vector half, 2026-08-28.
- A finished reply remembers which game it was about (per-turn AppID), 2026-08-28.
- DRG Survivor glossary terms: tap-to-define jargon in replies, 2026-08-28.
- Copy reply to clipboard, 2026-08-28.
- Decode preset chip animation replaces the typewriter, 2026-08-28.
- Show diagnostics folded into Show details, 2026-08-28.
- Unfenced-spoiler feedback chip, and refine chips reach the backend again, 2026-08-28.
- A rejected checklist block no longer reaches the reply as raw JSON, 2026-08-28.
- Try-order picker: Down moves the highlight (D36), B closes it, same modal frame as the other pickers, 2026-08-28.
- Pickers return the ring to the button that opened them, 2026-08-28.
- A chip only looks focused when it holds the ring; tab icons have names, 2026-08-28.
- B on a glossary popup or a spoiler fence closes it without leaving the reply; one Up reaches a glossary chip, 2026-08-28.
- Branch-pick turns keep the caption the user saw (desk), 2026-08-28.
- Safety guard confirmed with streaming off; Show details, D-pad scroll step, and branch buttons re-measured fine, 2026-08-28.
- Blind holdout rows (56) and D37 measurement; first blind `tune` rows, 2026-08-28/29.
- Session context panel no longer traps the D-pad; destructive-advice guard fires on real replies, 2026-08-27.
- Clear cache clears the session (D32, D34, D35), 2026-08-27.
- AI character avatars: prop emblems on the Ask bar and in the picker (D33), 2026-08-26/27.
- Frozen test chips for QA, 2026-08-22.
- Corpus point release `2026.08.22` (133 cards), 2026-08-22.
- Static focus checks and CI running the existing gates, 2026-08-24.

**Mid August 2026**
- KB coverage chip says "could not be matched" instead of "no game running", 2026-08-23.
- Session context strip counts every archived turn, and never the newest twice, 2026-08-23/27.
- Eval harness: tips scored against the right vector, model sweep runs again, 2026-08-21.
- RAG Phase 4 tracks 1 and 2: chip guarantee, Tip badge, 16 structured cards, 2026-08-19.
- British spellings find US-spelled cards; "the boss" reaches a boss card; ask about a game with nothing running (D19), 2026-08-19.
- Vector half of retrieval has its own recall pass; compat tips stay on the routed topic (D22); Expert mode gets the full card
  budget, 2026-08-18.
- Knowledge base retrieval is genuinely hybrid (RRF, schema v3), 2026-08-18.
- Named chat slots persist a turn; rows span the QAM panel width, 2026-08-16.
- RAG Phase 6: public corpus publish on Hugging Face and GitHub, 2026-08-16.
- Thinking effort control Phase 1 (D21), 2026-08-15.
- Soft reply-length cap and thinking budget, 2026-08-10.
- Kids master lock; Reply style Caveman; source attribution on knowledge chips; asked-entity extraction, 2026-08-09.
- RAG retrieval-quality remediation PR1 and PR2 closed, 2026-08-09.
- Thinking line fixes: sanitizer, emoji, single writer, 2026-08-07/08.
- KB coverage chip; permission jump; Wave 1 icon and voice fixes; token streaming Phase A and B, 2026-08-07.
- KB compat routing widened (D16); KB download Cancel, 2026-08-05/06.
- Resume last tab (D15); shell modal and payload extractions (refactor step 8), 2026-08-04.
- Session RAG chip candidates and routing-merge RPCs wired (D1), reply-language snapshot RPC, voice `status()`, 2026-08-02/03.

**July 2026**
- RPC calls time out (15s wrapper); agent architecture snapshots; dead backend and shims removed.
- Permissions cleanup and obsolete-features batch (web links always on, TDP apply removed), 2026-07-30.
- Knowledge base covers all thirteen titles (119 cards); Portal 2 and Half-Life 2 wiki cards; hybrid kill-switch.
- Session RAG preset chips; voice STT session daemon; install voice engine in one pass.
- Token streaming with live markdown (experimental); Strategy streaming with masked spoilers, 2026-07-15.

---

<a id="appendix"></a>

The cross-feature dependency summary, the dependency diagram, and the icon-sizing note moved to
[roadmap-details.md](roadmap-details-closed.md#appendix-moved-from-the-roadmap-2026-09-02) on 2026-09-02.
