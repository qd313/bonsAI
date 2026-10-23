# bonsAI Roadmap: parked work and watched sightings

This file holds work that is set aside. Back to the [roadmap](roadmap.md).

There are two kinds of item. **Parked on purpose** is work that waits for a person's word or a legal or tool gate.
When one restarts, it moves back into the roadmap (or the knowledge-base roadmap) at its star place.
**Watched sightings** are bugs seen once or a few times and not reproduced. Each comes back on a new sighting
([D120](audit/maintainer-decisions-locked.md#d120--locked-2026-09-29-raised-2026-09-29--plan-77-the-last-bug-session-before-friday-the-eight-calls)).
Long notes for knowledge-base items are in [roadmap-kb-details.md](roadmap-kb-details.md); the others are in
[roadmap-details.md](roadmap-details.md).

## Parked on purpose


- ★ `[ui]` **Picking a setting from the settings card opens the right Steam settings page but does not scroll to that setting** — **shelved 2026-10-10, a limit of Steam the maintainer accepted.** A on "Enable GPU Crash Report Collection" opened Steam's System page at the top, with the toggle about 320 px below the screen edge (found 2026-10-08 on the Deck, plan 83; evidence `workshop:test-evidence/plan83-P83-J1-SETTINGS-CARD.json`). Steam's link and route calls take only a page name; the Decky libraries and the web show no way to open at, or scroll to, one setting, and a read-only probe of Steam's own page found no settings route or deep-link reader (plan 87 B6, 2026-10-09; evidence `workshop:test-evidence/plan87-B6-SETTINGS-PROBE.json`); nothing was built (the maintainer's call 9, plan 87). The maintainer's call 2026-10-10 (checks page): fine as long as it opens the right page. The wrong-page bug (A on "Enable Wi-Fi" opens System, not Internet) is separate and stays in the roadmap's Bugs.
  Unshelves when: Steam offers a way to open a settings page at one setting.

- ★★ `[ui]` **Glance view: the answer alone, in big text** — **shelved 2026-09-12.** From the popup, the menu would show
  only the answer, large, with the chips, question box and tab bar out of the way. Open, read, close in a couple of
  seconds; B returns to the full panel. The maintainer shelved it: too much UI change, not ready.
  [Decision D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) · [Mockup and press list](../../bonsAI-workshop/planning/52-frame-features-second-look.md#6-glance-view-the-brief-and-the-mockup) · [Drawing](https://claude.ai/code/artifact/c48fb3e2-38ef-4c91-997c-c515353eec96).
  Unshelves when: the maintainer says so.

- ★★★ `[KB]` **KB download Cancel, the Deck check** — **shelved 2026-09-19.** The Cancel button stays; the maintainer said
  keep it. It was shipped 2026-08-05 and has six passing unit tests, but the real download takes about a second, too fast
  to press Cancel in. The D-pad reaching Cancel has never been seen on the Deck.
  Row [KB-CANCEL-01](testing.md) · [Decision D113](audit/maintainer-decisions-locked.md#d113--locked-2026-09-19-raised-2026-09-18--plan-61-automated-verification-session-the-thirteen-questions).
  Unshelves when: a throttle or a slower test copy of the download exists.




- ★★★★★ `[perms]` `[shelved]` **VAC Phase 2: opponent IDs** *— **shelved 2026-10-16.** Show who you are playing against so you can check their ban record, when the game's data allows it. The Steam ban lookup it stood on was removed in plan 86 step 3 (`357e5b55`), so the idea has nothing to build on. Moved here by the maintainer's call ([plan 86 § 4 call 12](planning/86-clean-up-round-three.md)).*
  Unshelves when: the maintainer wants a ban lookup back.

- ★★★★★ `[platform]` **Global quick-launch macro** — **shelved 2026-09-19.** The maintainer said drop it. It never ran on
  real hardware. The Guide-chord notes stay in [troubleshooting.md](troubleshooting.md) § 5.
  [Decision D113](audit/maintainer-decisions-locked.md#d113--locked-2026-09-19-raised-2026-09-18--plan-61-automated-verification-session-the-thirteen-questions).
  Unshelves when: the maintainer says so.

## Watched sightings

Sorted by star, then tag, then title. The last item is a tool note, kept at the end.

- ★ `[focus]` `[watching]` **A Down press left a long answer section 22% visible behind the tab bar, and a Down in the chip
  ladder left it 67% visible behind the Ask bar's icon** — each seen once, 2026-09-30, not reproduced on purpose.
  Evidence `workshop:test-evidence/plan77-QA-FREE-PLAY-01.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **After a tab switch onto About or Search, Steam puts the ring inside the tab, not on the tab bar** — seen on the Deck's own screen 2026-10-12 (plan 92 second night, blocks B and C), recorded as a quirk, not yet judged a bug. On About the ring started on the Reply language dropdown (one Up reached the bar); on Search the Up presses of P90-SEARCH-B started from "Clear the search" right after the switch. A tab's walk is not affected. Seen again on Main and Permissions after an LB or RB switch (the ring on a chip, and on a toggle); the session owner's call is that this is Steam's normal behaviour for any shoulder switch, not a fault. Evidence `workshop:test-evidence/plan92-P92-ABOUT-AFTER.json`, `workshop:test-evidence/plan92-P90-SEARCH-B.json`, `workshop:test-evidence/plan92-P92-FOLD-SWITCH-try2.json`.
  Unshelves when: a new sighting, or the maintainer wants the ring on the bar after every switch.

- ★ `[focus]` `[watching]` **In the AI models box, the first Left on Advanced right after the box opened did nothing** — seen once, 2026-10-12 (plan 92 second night, build `b8d9575f`); every later Left from Advanced worked. Possibly the first press after the box opens is lost. Evidence `workshop:test-evidence/plan92-P92-MODELS-BESIDE-try2.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **After the screenshot picker closes, nothing holds the highlight until the next press** — seen
  once, 2026-10-01 (plan 78, block 3a). Evidence `workshop:test-evidence/plan78-DOC-SWEEP-01.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **Down does not move the ring off an unrevealed spoiler block** — seen once, 2026-09-04, never
  reproduced. The milder form (each cover took one extra Down) is fixed and passed on the Deck: row P76-WALK-COVERS.
  Evidence `workshop:test-evidence/round35-spoiler-block-down-and-up.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **Down from the chat row once skipped the whole answer, after returning from Settings** — seen
  once, 2026-09-27; not reproduced in six tries. Evidence `workshop:test-evidence/plan72-F-ROW.json`, `workshop:test-evidence/plan76-S8.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **Down is dead from the last chip in the Show details chip ladder** — seen once, 2026-10-01
  (plan 78, Deck block 3a). Evidence `workshop:test-evidence/plan78-DOC-SWEEP-01.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **In carousel style, Down can land on a chip slid mostly off screen** — one sighting; seven tries
  since did not reproduce it. Evidence `workshop:test-evidence/plan76-S2.json`. [Detail](roadmap-details.md#flow-2b-bugs).
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **LB and RB do nothing while the ring is on Decky's back arrow** — seen once, 2026-10-03 (plan 81, Deck block 6). No evidence file.
  **2026-10-09 (plan 84 step 6):** the chat's name now shares Decky's row with the arrow. On the Deck's own screen LB on the chat's name switched tabs (it went to About and put the ring on the tab bar). The arrow itself was not re-checked, so this stays on the watch list. Evidence `workshop:test-evidence/plan84-STEP6-DECK.json` (row P84-RING-01).
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **Three more one-off focus sightings from free play, 2026-09-26** — the accent-level one is
  fixed and passed on the Deck (row P76-ACCENT-RING). The other two did not reproduce (`plan76-S3A.json` for the folded turn).
  What the two were is in [Detail](roadmap-details.md#flow-2b-bugs).
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **With details open, Down from "N earlier" jumps straight to the notes block** — seen once,
  2026-09-26. Not reproduced: it visited every stop in order. Evidence `workshop:test-evidence/plan76-P76-M-NEARLIER-DETAILS.json`.
  Unshelves when: a new sighting.

- ★ `[KB]` `[watching]` **A note titled "Steam_frame (From the shared Deck tips)" came with a Zhukov overclocks question and looks off-topic** — seen once,
  2026-10-03, block 3b (plan 81). Evidence `workshop:test-evidence/plan81-P81-LIFT-6PX-game.json`.
  Unshelves when: a new sighting.

- ★ `[KB]` `[watching]` **With a game running, the meaning search once read about a second** — seen once, 1,070 ms on
  2026-09-23, not seen again. [Detail](roadmap-kb-details.md#kb-transparency-matches-what-the-model-got).
  Unshelves when: a new sighting.

- ★ `[layout]` `[watching]` **A thin strip of the answer shows through below the game-context line at the bottom of the Main panel**
  — seen twice, 2026-09-23 (picture `workshop:test-evidence/plan64-BYEYE-01-chat-row.png`); not seen since
  (`plan72-A8-BOTTOM-STRIP-READING.json`, `plan76-S6.json`).
  Unshelves when: a new sighting.

- ★ `[layout]` `[watching]` **The "What went wrong?" block once ended 14 pixels under the dock** — seen once, 2026-09-27;
  on 2026-09-28 it ended 13 px above the dock. Evidence `workshop:test-evidence/plan72-Z-FREEPLAY.json`, `workshop:test-evidence/plan76-S7.json`.
  Unshelves when: a new sighting.

- ★ `[ollama]` `[focus]` `[watching]` **In the AI models Filters panel, Down from "Also try open-weight models" skipped "Any installed model"** —
  seen once, 2026-10-01 (plan 78, Deck block 3a). Evidence `workshop:test-evidence/plan78-P78-ORDER-PRUNE-try2.json`.
  Unshelves when: a new sighting.

- ★ `[ollama]` `[watching]` **The saved text try order stops at 16 names** — seen once, 2026-10-03 (plan 81, block 4a): moving a model up in the
  AI models box dropped the 16th name (gemma3:4b) off the end of the saved list. Whether the cap is meant is open; no decision recorded.
  Evidence `workshop:test-evidence/plan81-P81-REMOVE-KEEPS-PC-PLACE-try2.json`.
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **A plugin reload while a game is running can put Steam's Home screen in front of the game** — **shelved as watched 2026-10-16 (D131 call 4).** [Full notes](archive/roadmap-trimmed-2026-10-roadmap.md#plan-93-note-shelved-reload-puts-home-in-front).
  Unshelves when: a new sighting.

- ★ `[QA]` `[watching]` **The Ollama tab's "Install Ollama" box test failed once during a full run under load** — seen once, 2026-10-16 (plan 86 step 3, at the UI scale landing), and it passed on the retry. 20 reruns (8 alone, 12 at once) all passed. Test: `src/features/ai-connection/OllamaWhereAiRunsSection.starterOffer.test.tsx`.
  Unshelves when: a new failure.

- ★ `[reply]` `[watching]` **Strategy choice labels stayed English with the reply language set to Japanese** — seen on both
  Strategy tries, 2026-10-01 (plan 78, block 3a); the Speed reply was Japanese. Evidence `workshop:test-evidence/plan78-LANG-03.json`.
  Unshelves when: a new sighting.

- ★ `[reply]` `[focus]` `[watching]` **Two more sightings, 2026-09-26 (the chip ladder and two wrong answers)** — the chip
  ladder steps one chip per press both ways (7 Ups for 7 chips, `plan76-S4.json`). Whether one chip per press is right is
  the maintainer's call: no decision recorded. The two wrong answers did not reproduce.
  Unshelves when: a new sighting.

- ★ `[reply]` `[watching]` **While an answer arrives, the start of a sentence that ends up behind a spoiler cover can be read for about a second** — **shelved as watched 2026-10-16 (D131 call 4).** [Full notes](archive/roadmap-trimmed-2026-10-roadmap.md#plan-93-note-shelved-spoiler-sentence-readable).
  Unshelves when: a new sighting.

- ★ `[tabs]` `[watching]` **After a tab change the ring is often on no control, so LB, RB, LT and RT do nothing until a D-pad press** — seen once, 2026-10-10 (plan 87 Deck block 3, build `d96ed0bf`): two RB presses 1.4 s apart gave one tab change. Not reproduced in block 4 (`8608954d`): the ring was on a control after 14 of 14 tab changes, read at 0.5 s and 1.5 s. Evidence `workshop:test-evidence/plan87-P87-F4-TAB-ORDER.json`, `plan87-P87-TAB-CHANGE-RING.json`.
  Unshelves when: a new sighting.

- ★★ `[chat]` `[focus]` `[watching]` **A chat opened with RB while a game runs is drawn as history, and Down dies on its question line** —
  seen once, 2026-09-26. Closing and reopening the panel fixes it. Not reproduced since; named in the 0.6.0 release notes.
  Evidence `workshop:test-evidence/plan72-A7-GAME-ii.json`.
  Unshelves when: a new sighting.

- ★★ `[chips]` `[ui]` `[watching]` **A chip at the edge of the sliding strip reads one third visible to the walk check** — seen on the Deck 2026-10-07 (plan 82, Deck block 4, build `efd4258b`), with and without a game. The strip cuts the chip's words at its edges, so a person sees a clipped chip. Whether that is the design (a strip that slides) or a clipped label is the maintainer's call (plan 82, question 7). Evidence `workshop:test-evidence/plan82-P82-MAIN-WALK-NOGAME.json`, `workshop:test-evidence/plan82-P82-MAIN-WALK-GAME.json`, `workshop:test-evidence/plan82-P82-MAIN-WALK-NOGAME-chip.png`.
  Unshelves when: the maintainer calls it a clipped label, or a new sighting of a chip cut mid-word.

- ★★ `[focus]` `[watching]` **Walking Down while an answer is still arriving loses the ring** — seen once, 2026-09-27
  (it stuck on the first half-visible answer part, then nothing had focus). Not reproduced in three tries. Evidence
  `workshop:test-evidence/plan72-A5-DOWN-WHILE-ARRIVING.json`, `workshop:test-evidence/plan76-S9.json`.
  Unshelves when: a new sighting.

- ★★ `[ollama]` `[focus]` `[watching]` **A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab** —
  reported by the maintainer 2026-09-16, a touch report the rig cannot reproduce; no evidence file. Needs a try with an
  empty download queue. [Detail](roadmap-details.md#a-tap-outside-the-ai-models-screen-started-the-queued-downloads-and-left-the-d-pad-stuck-in-the-ollama-tab).
  Unshelves when: a new sighting.

- ★★ `[platform]` `[watching]` **Reloading the plugin while a heavy game is running can leave Steam's interface gone until the Deck is restarted** — **shelved as watched 2026-10-16 (D131 call 4).** [Full notes](archive/roadmap-trimmed-2026-10-roadmap.md#plan-93-note-shelved-reload-with-heavy-game).
  Unshelves when: a new sighting.

- ★★ `[platform]` `[watching]` **The Deck's screen froze when Steam's screensaver started (no game, plugin idle)** — **shelved as watched 2026-10-16 (D131 call 4).** [Full notes](archive/roadmap-trimmed-2026-10-roadmap.md#plan-93-note-shelved-screensaver-freeze).
  Unshelves when: a new sighting.

- ★★★ `[focus]` `[watching]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** —
  first seen 2026-09-05; usually only a full loader restart cleared it. Likely the same family as the reopen-over-a-game
  fix, which passed 6 of 6 (row P76-TRAP-FIX, done 2026-09-29). A long play test with a game was clean, 24 of 24
  (`workshop:test-evidence/plan77-P77-TRAP-LONG.json`). Not proven the same fault; named in the 0.6.0 release notes.
  [Detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  Unshelves when: a new sighting.

- ★★★ `[platform]` `[watching]` **Steam's screen froze after an answer with a game running and the Deck's own AI** — **shelved as watched 2026-10-16 (D131 call 4).** [Full notes](archive/roadmap-trimmed-2026-10-roadmap.md#plan-93-note-shelved-freeze-after-answer).
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **Decky's own settings page shows empty while a game is running** — seen twice, 2026-10-03 (plan 81, Deck block 6): only the status bar and the button hints, no control to focus, and B returned to the game. Not bonsAI's page.
  Evidence `workshop:test-evidence/plan81-P81-RELOAD-LOOK.json`.
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **The Quick Access panel closes itself about four minutes after an answer with a game running** — seen in both runs of 2026-10-03 (plan 81, Deck block 6), with no hands on the Deck; the screensaver page appeared.
  Evidence `workshop:test-evidence/plan81-P81-FREEZE-AFTER-ANSWER.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **The first suggestion chip reads 33 to 67 percent visible to the probe while its words churn** — seen once, 2026-10-10 (plan 87 Deck block 6b). Evidence `workshop:test-evidence/plan87-P87-SMOKE-FINAL.json`.
  **Seen again 2026-10-12 (plan 92):** on Main the first Up from the question box lands on a chip the rig reads as only partly visible: 33 percent (`workshop:test-evidence/plan92-P92-ICONS-AFTER-try2.json`), 56 and 67 percent (`workshop:test-evidence/plan92-QA-FREE-PLAY-01-baseline.json`, `plan92-QA-FREE-PLAY-01-n2.json`; "wording changes every run"). Covered by the Quick Access rail and clipped by the chip carousel, per the first file.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **In the AI models window, B did not close it; only Done did** — seen once, 2026-10-10 (plan 87 Deck block 6b). Evidence `workshop:test-evidence/plan87-P87-DECK-RESTORED.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **A fresh answer shows two "Show details" stops, the answer's own and the slot's** — seen once, 2026-10-10 (plan 87 Deck block 6b). Evidence `workshop:test-evidence/plan87-P87-SAVED-WALKS.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **The Ask mode menu opens with the ring on "speed" and Down does not move it** — seen twice, 2026-10-22 (plan 99 filming, build `8c23813e`). Opened by A on the mode chip, the page's focus moves to "strategy" but the ring stays, and A then picks speed. Right, then Down reaches Expert; on camera the chip went Strategy, Expert, Strategy that way. Evidence `workshop:test-evidence/plan99-FILMING-SIGHTINGS.md` (section 2).
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **Rig and Steam quirks seen while filming** — 2026-10-22 (plan 99, build `8c23813e`), evidence `workshop:test-evidence/plan99-FILMING-SIGHTINGS.md` (section 3):
  Closing the menu with B presses while a game runs stopped the GUIDE+A chord from opening it again until the game was relaunched (twice).
  The highlight can stall after a Steam box (the notes view, the AI models list); not measured further.
  The GUIDE+A chord sometimes makes Steam show a "Screenshot Taken" toast (rig only; a player presses the menu button).
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **After a deploy, opening the plugin with the rig's own call failed three times before it
  worked** — seen once, 2026-10-01 (plan 78, block 3b). A tool note, also in [mcp-setup.md](mcp-setup.md).
  Evidence `workshop:test-evidence/plan78-P78-TALL-SECTION-LOOP-AFTER.json`.
  Unshelves when: a new sighting.
