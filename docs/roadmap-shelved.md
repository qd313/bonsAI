# bonsAI Roadmap: parked work and watched sightings

This file holds work that is set aside. Back to the [roadmap](roadmap.md).

There are two kinds of item. **Parked on purpose** is work that waits for a person's word or a legal or tool gate.
When one restarts, it moves back into the roadmap (or the knowledge-base roadmap) at its star place.
**Watched sightings** are bugs seen once or a few times and not reproduced. Each comes back on a new sighting
([D120](audit/maintainer-decisions-locked.md#d120--locked-2026-09-29-raised-2026-09-29--plan-77-the-last-bug-session-before-friday-the-eight-calls)).
Long notes for knowledge-base items are in [roadmap-kb-details.md](roadmap-kb-details.md); the others are in
[roadmap-details.md](roadmap-details.md).

## Parked on purpose


- ★ `[docs]` **The changelog says nothing about the old chip and answer animation settings** — **shelved 2026-11-17, the maintainer's call (plan 106 § 2, D143).** Someone who had set static chips or turned the letter scramble off on the Developer tab now gets decoding chips and scrambled answers (Decode is the default and the settings left the Developer tab, on purpose). Reduced motion and a running game still turn the effects off. The open part is one line in the changelog. [Review report](planning/assets/105-review-report.md#the-findings-most-important-first), entry 12.
  Unshelves when: the maintainer asks for the line.

- ★ `[docs]` **The characters document does not cover the small character pictures** — **shelved 2026-11-17, the maintainer's call (plan 106 § 2, D143).** The document covers voices only; the small emblems that still ship (a letter, a prop and a colour per character) are not reviewed in it. Nothing changes on the Deck. The fix is one sentence on what ships now and one saying the emblems were not reviewed. [Review report](planning/assets/105-review-report.md#the-findings-most-important-first), entry 13.
  Unshelves when: the maintainer asks for the sentences.

- ★ `[ui]` **Picking a setting from the settings card opens the right Steam settings page but does not scroll to that setting** — **shelved 2026-10-10, a limit of Steam the maintainer accepted.** Steam's links take only a page name, so A on a setting opens the right page at its top; nothing was built. Full note, word for word: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-shelved-roadmap-2026-11-02).
  Unshelves when: Steam offers a way to open a settings page at one setting.

- ★ `[ui]` **Search packs imported in versions 0.4.6 to 0.4.9 can no longer be removed** — **shelved 2026-11-17, the maintainer's call (plan 106 § 2, D143).** Only someone who imported a settings-search pack in those versions is touched (0.6.0 had no import screen). Their pack still loads, and nothing removes it except Clear all data. The fix would be to drop imported packs once, on load; or leave it. [Review report](planning/assets/105-review-report.md#the-findings-most-important-first), entry 9.
  Unshelves when: the maintainer asks, or someone reports an old pack they cannot remove.

- ★★ `[docs]` **The licence file says nothing about the game characters or what is downloaded later** — **shelved 2026-11-17, the maintainer's call (plan 106 § 2, D143).** A reader of the licence file would not learn that the 31 characters' names belong to their games' owners and that the plugin is not linked to them, nor the licences of what it downloads when asked (Ollama, the speech engine and models, the two starter models). Nothing in the zip needs this: it is a gap in what people are told, not a breach. The fix is two short paragraphs in `NOTICE`. [Review report](planning/assets/105-review-report.md#the-findings-most-important-first), entry 4.
  Unshelves when: the maintainer asks for the paragraphs.

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




- ★★★ `[KB]` **KB visual maps (your screenshot, marked)** — **shelved 2026-11-14 (D141 call 16): measured, not built.** Nothing draws anything in a reply today. The marks test (this PC, 22 boss pictures, four picture models, three tries each, graded by two Opus helpers by one written rule) needed 7 out of 10 or more on at least 15 pictures; the best average over 66 tries was 2.95 (`qwen3.5:4b`) and at most 5 of 22 pictures had any try at 7 or more. Grades `workshop:screenshots/plan103-marks/qwen3.5-4b/grades.json`; the test is `scripts/kb/eval_screenshot_marks.py`. [Detail](roadmap-kb-details.md#kb-visual-maps) · [Mock-up board, tab 5](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR)
  Unshelves when: a picture model the Deck can run averages 7 or more on at least 15 of the 22 boss pictures, graded by Opus by the written rule.

- ★★★★★ `[perms]` `[shelved]` **VAC Phase 2: opponent IDs** *— **shelved 2026-10-16.** Show who you are playing against so you can check their ban record, when the game's data allows it. The Steam ban lookup it stood on was removed in plan 86 step 3 (`357e5b55`), so the idea has nothing to build on. Moved here by the maintainer's call ([plan 86 § 4 call 12](planning/86-clean-up-round-three.md)).*
  Unshelves when: the maintainer wants a ban lookup back.

- ★★★★★ `[platform]` **Global quick-launch macro** — **shelved 2026-09-19.** The maintainer said drop it. It never ran on
  real hardware. The Guide-chord notes stay in [troubleshooting.md](troubleshooting.md) § 5.
  [Decision D113](audit/maintainer-decisions-locked.md#d113--locked-2026-09-19-raised-2026-09-18--plan-61-automated-verification-session-the-thirteen-questions).
  Unshelves when: the maintainer says so.

## Watched sightings

Sorted by star, then tag, then title. The last item is a tool note, kept at the end.

Nine of the oldest sightings (each seen once or twice between 2026-09-04 and 2026-09-27 and never reproduced) moved to [the trimmed-shelved archive](archive/roadmap-trimmed-2026-10-roadmap-shelved.md#watched-sightings-moved-out-2026-11-14-plan-104-sweep-k0) on 2026-11-14, word for word; each comes back to this list on a new sighting.

- ★ `[KB]` `[watching]` **Four 180-second stalls with a game running (plan 98 block K1), not seen again in block K3** — seen 2026-10-24, four asks in a row gave no answer within 180 seconds.
  Block K1's chat held many error turns. In block K3 the AI was two to three times slower with the game on its title screen but always finished (reading in the knowledge-base doc). Watch for it. Evidence `workshop:test-evidence/plan98-P98-GAME-ANSWER-TIME.json`.
  Unshelves when: a new sighting.

- ★ `[KB]` `[watching]` **A note titled "Steam_frame (From the shared Deck tips)" came with a Zhukov overclocks question and looks off-topic** — seen once,
  2026-10-03, block 3b (plan 81). Evidence `workshop:test-evidence/plan81-P81-LIFT-6PX-game.json`.
  Unshelves when: a new sighting.

- ★ `[KB]` `[watching]` **A "where am I stuck" answer for Hollow Knight added an "If you want to cheat" section** — seen once, 2026-10-24 (plan 98 Deck block K3); closed as a watched sighting by the maintainer, D139, 2026-11-02, after 0 in 2 route questions since (2026-10-25, plan 100 block L0).
  The route answer suggested emulator and fast-travel exploits. Evidence `workshop:test-evidence/plan100-P100-ROUTE-CHEAT-COUNT.json`. [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  Unshelves when: a new sighting.

- ★ `[KB]` `[watching]` **With a game running, the meaning search once read about a second** — seen once, 1,070 ms on
  2026-09-23, not seen again. [Detail](roadmap-kb-details.md#kb-transparency-matches-what-the-model-got).
  Unshelves when: a new sighting.

- ★ `[ollama]` `[focus]` `[watching]` **In the AI models Filters panel, Down from "Also try open-weight models" skipped "Any installed model"** —
  seen once, 2026-10-01 (plan 78, Deck block 3a). Evidence `workshop:test-evidence/plan78-P78-ORDER-PRUNE-try2.json`.
  Unshelves when: a new sighting.

- ★ `[ollama]` `[watching]` **The saved text try order stops at 16 names** — seen once, 2026-10-03 (plan 81, block 4a): moving a model up in the
  AI models box dropped the 16th name (gemma3:4b) off the end of the saved list. Whether the cap is meant is open; no decision recorded.
  Evidence `workshop:test-evidence/plan81-P81-REMOVE-KEEPS-PC-PLACE-try2.json`.
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **God of War moved from its title menu to a shrine scene on its own while only two Steam + R1 chords were pressed** — seen once, 2026-11-03 (plan 102 Deck block R1, row P102-PICTURE-01). The plugin log read "voice: stop pressed, no recording was running" near the first chord (20:58:08). Evidence `workshop:test-evidence/plan102-P102-PICTURE-01.json`.
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **A plugin reload while a game is running can put Steam's Home screen in front of the game** — **shelved as watched 2026-10-16 (D131 call 4).** [Full notes](archive/roadmap-trimmed-2026-10-roadmap.md#plan-93-note-shelved-reload-puts-home-in-front).
  Unshelves when: a new sighting.

- ★ `[QA]` `[watching]` **The Ollama tab's "Install Ollama" box test failed once during a full run under load** — seen once, 2026-10-16 (plan 86 step 3, at the UI scale landing), and it passed on the retry. 20 reruns (8 alone, 12 at once) all passed. Test: `src/features/ai-connection/OllamaWhereAiRunsSection.starterOffer.test.tsx`.
  Unshelves when: a new failure.

- ★ `[reply]` `[watching]` **Strategy choice labels stayed English with the reply language set to Japanese** — seen on both
  Strategy tries, 2026-10-01 (plan 78, block 3a); the Speed reply was Japanese. Evidence `workshop:test-evidence/plan78-LANG-03.json`.
  Unshelves when: a new sighting.

- ★ `[reply]` `[watching]` **While an answer arrives, the start of a sentence that ends up behind a spoiler cover can be read for about a second** — **shelved as watched 2026-10-16 (D131 call 4).** [Full notes](archive/roadmap-trimmed-2026-10-roadmap.md#plan-93-note-shelved-spoiler-sentence-readable).
  Unshelves when: a new sighting.

- ★ `[tabs]` `[watching]` **After a tab change the ring is often on no control, so LB, RB, LT and RT do nothing until a D-pad press** — seen once, 2026-10-10 (plan 87 Deck block 3, build `d96ed0bf`): two RB presses 1.4 s apart gave one tab change. Not reproduced in block 4 (`8608954d`): the ring was on a control after 14 of 14 tab changes, read at 0.5 s and 1.5 s. Evidence `workshop:test-evidence/plan87-P87-F4-TAB-ORDER.json`, `plan87-P87-TAB-CHANGE-RING.json`.
  Unshelves when: a new sighting.

- ★★ `[chips]` `[ui]` `[watching]` **A chip at the edge of the sliding strip reads one third visible to the walk check** — seen on the Deck 2026-10-07 (plan 82, Deck block 4, build `efd4258b`), with and without a game. The strip cuts the chip's words at its edges, so a person sees a clipped chip. More: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-shelved-roadmap-2026-11-03).
  Unshelves when: the maintainer calls it a clipped label, or a new sighting of a chip cut mid-word.

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
  **Seen again 2026-10-12 (plan 92):** the first Up from the question box on Main lands on a chip the rig reads as 33 to 67 percent visible. More: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-shelved-roadmap-2026-11-03).
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **In the AI models window, B did not close it; only Done did** — seen once, 2026-10-10 (plan 87 Deck block 6b). Evidence `workshop:test-evidence/plan87-P87-DECK-RESTORED.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **A fresh answer shows two "Show details" stops, the answer's own and the slot's** — seen once, 2026-10-10 (plan 87 Deck block 6b). Evidence `workshop:test-evidence/plan87-P87-SAVED-WALKS.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **The Ask mode menu opens with the ring on "speed" and Down does not move it** — seen twice, 2026-10-22 (plan 99 filming, build `8c23813e`). Opened by A on the mode chip, the page's focus moves to "strategy" but the ring stays, and A then picks speed. Right, then Down reaches Expert; on camera the chip went Strategy, Expert, Strategy that way. Evidence `workshop:test-evidence/plan99-FILMING-SIGHTINGS.md` (section 2).
  Unshelves when: a new sighting.

- ★ `[KB]` `[watching]` **On a fresh Deck with the library off, the first answer said it did not know the game** — seen once, 2026-10-23 (plan 99 clean install, "How do I unlock the Engineer in Deep Rock Galactic Survivor?"). The library is the fix, and the README now says so. Evidence `workshop:test-evidence/plan99-P99-TIER4-FIRST-ANSWER.json`.
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **An old `bonsai-ollama-autostart.service` file survived the wipe (disabled) and the plugin started Ollama through it** — seen 2026-10-23 (plan 99 clean install). Whether a brand-new Deck gets that file from the install is untested. Evidence `workshop:test-evidence/plan99-P99-TIER4-HOST.json` and `workshop:test-evidence/plan99-P99-TIER4-INSTALL-OLLAMA.json`.
  Unshelves when: a brand-new Deck is installed, or a new sighting.

- ★ `[platform]` `[watching]` **Rig and Steam quirks seen while filming** — 2026-10-22 (plan 99, build `8c23813e`), evidence `workshop:test-evidence/plan99-FILMING-SIGHTINGS.md` (section 3):
  Three quirks: B presses closing the menu stopped the GUIDE+A chord until the game was relaunched (twice); a stalled highlight after a Steam box; a "Screenshot Taken" toast from the chord (rig only). Word for word: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-shelved-roadmap-2026-11-03).
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **After a deploy, opening the plugin with the rig's own call failed three times before it
  worked** — seen once, 2026-10-01 (plan 78, block 3b). A tool note, also in [mcp-setup.md](mcp-setup.md).
  Evidence `workshop:test-evidence/plan78-P78-TALL-SECTION-LOOP-AFTER.json`.
  Unshelves when: a new sighting.
