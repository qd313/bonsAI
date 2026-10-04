# bonsAI Roadmap: parked work and watched sightings

This file holds work that is set aside. Back to the [roadmap](roadmap.md).

There are two kinds of item. **Parked on purpose** is work that waits for a person's word or a legal or tool gate.
When one restarts, it moves back into the roadmap (or the knowledge-base roadmap) at its star place.
**Watched sightings** are bugs seen once or a few times and not reproduced. Each comes back on a new sighting
([D120](audit/maintainer-decisions-locked.md#d120--locked-2026-09-29-raised-2026-09-29--plan-77-the-last-bug-session-before-friday-the-eight-calls)).
Long notes for knowledge-base items are in [roadmap-kb-details.md](roadmap-kb-details.md); the others are in
[roadmap-details.md](roadmap-details.md).

## Parked on purpose

- ★ `[platform]` **In-IDE preview never gets past its loading screen** — **shelved 2026-09-11.** On the maintainer's
  machine the preview stops on "Loading plugin preview". It takes commands but never answers, and it made no screenshot.
  Not a gate for anything: the Deck is the gate.
  [Decision D93](audit/maintainer-decisions-locked.md#d93--locked-2026-09-11--the-deck-is-the-gate-the-preview-is-shelved-device-checks-are-queued) · [Plan 51](archive/51-refactor-round-two.md).
  Unshelves when: the preview loads the plugin on the maintainer's machine.

- ★★ `[ui]` **Glance view: the answer alone, in big text** — **shelved 2026-09-12.** From the popup, the menu would show
  only the answer, large, with the chips, question box and tab bar out of the way. Open, read, close in a couple of
  seconds; B returns to the full panel. The maintainer shelved it: too much UI change, not ready.
  [Decision D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) · [Mockup and press list](planning/52-frame-features-second-look.md#6-glance-view-the-brief-and-the-mockup) · [Drawing](https://claude.ai/code/artifact/c48fb3e2-38ef-4c91-997c-c515353eec96).
  Unshelves when: the maintainer says so.

- ★★★ `[KB]` **KB download Cancel, the Deck check** — **shelved 2026-09-19.** The Cancel button stays; the maintainer said
  keep it. It was shipped 2026-08-05 and has six passing unit tests, but the real download takes about a second, too fast
  to press Cancel in. The D-pad reaching Cancel has never been seen on the Deck.
  Row [KB-CANCEL-01](testing.md) · [Decision D113](audit/maintainer-decisions-locked.md#d113--locked-2026-09-19-raised-2026-09-18--plan-61-automated-verification-session-the-thirteen-questions).
  Unshelves when: a throttle or a slower test copy of the download exists.

- ★★★ `[voice]` **Trained voices for the bundled characters** — **shelved with the clip route 2026-09-08.** The fallback if
  the copying model is too slow beside a game: a small trained voice file per character, about 60 MB, made once on the
  maintainer's PC and downloaded on demand. The fastest way to read. It also means the plugin hosts its own voice files
  for the first time. [Decision D74](audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open) · [Memo](planning/42-read-aloud-feasibility.md).
  Unshelves when: the same gates as "Voices for the bundled characters" are met, and the maintainer agrees the plugin
  may host voice files.

- ★★★ `[voice]` **Voices for the bundled characters** — **shelved 2026-09-08.** Each character would get a voice invented
  once on the maintainer's PC and shipped as a five to ten second clip, read on the device by a small copying model.
  Shelved because a voice is not covered by fair use, every character is voiced by a real actor, and "free" is no defence
  under the newer AI-voice laws. [Decision D74](audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open) · [Memo](planning/42-read-aloud-feasibility.md).
  Unshelves when: the character sweep ("Which bundled characters copy a real person", in Features) is done, a person
  qualified to give one has done a legal check, and the open licence call (D74 call 11) is answered.

- ★★★★ `[voice]` **A voice for a custom character** — **shelved with the bundled voices 2026-09-08.** Type a name, press
  **Generate voice**, wait minutes once while the device invents a voice. After that the small copying model reads that
  character in it. Needs an optional download of about one gigabyte, with the warning "minutes on a Steam Deck, seconds
  on a stronger machine". No LAN server. Phase 0 is a half-day Deck test of the port.
  [Decision D74](audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open) · [Memo](planning/42-read-aloud-feasibility.md).
  Unshelves when: the same legal gate as the bundled voices is passed.

- ★★★★★ `[platform]` **Global quick-launch macro** — **shelved 2026-09-19.** The maintainer said drop it. It never ran on
  real hardware. The Guide-chord notes stay in [troubleshooting.md](troubleshooting.md) § 5.
  [Decision D113](audit/maintainer-decisions-locked.md#d113--locked-2026-09-19-raised-2026-09-18--plan-61-automated-verification-session-the-thirteen-questions).
  Unshelves when: the maintainer says so.

## Watched sightings

Sorted by star, then tag, then title. The last item is a tool note, kept at the end.

- ★ `[focus]` `[watching]` **A Down press left a long answer section 22% visible behind the tab bar, and a Down in the chip
  ladder left it 67% visible behind the Ask bar's icon** — each seen once, 2026-09-30, not reproduced on purpose.
  Evidence `docs/test-evidence/plan77-QA-FREE-PLAY-01.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **After the screenshot picker closes, nothing holds the highlight until the next press** — seen
  once, 2026-10-01 (plan 78, block 3a). Evidence `docs/test-evidence/plan78-DOC-SWEEP-01.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **Down does not move the ring off an unrevealed spoiler block** — seen once, 2026-09-04, never
  reproduced. The milder form (each cover took one extra Down) is fixed and passed on the Deck: row P76-WALK-COVERS.
  Evidence `docs/test-evidence/round35-spoiler-block-down-and-up.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **Down from the chat row once skipped the whole answer, after returning from Settings** — seen
  once, 2026-09-27; not reproduced in six tries. Evidence `docs/test-evidence/plan72-F-ROW.json`, `docs/test-evidence/plan76-S8.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **Down is dead from the last chip in the Show details chip ladder** — seen once, 2026-10-01
  (plan 78, Deck block 3a). Evidence `docs/test-evidence/plan78-DOC-SWEEP-01.json`.
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **In carousel style, Down can land on a chip slid mostly off screen** — one sighting; seven tries
  since did not reproduce it. Evidence `docs/test-evidence/plan76-S2.json`. [Detail](roadmap-details.md#flow-2b-bugs).
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **Three more one-off focus sightings from free play, 2026-09-26** — the accent-level one is
  fixed and passed on the Deck (row P76-ACCENT-RING). The other two did not reproduce (`plan76-S3A.json` for the folded turn).
  What the two were is in [Detail](roadmap-details.md#flow-2b-bugs).
  Unshelves when: a new sighting.

- ★ `[focus]` `[watching]` **With details open, Down from "N earlier" jumps straight to the notes block** — seen once,
  2026-09-26. Not reproduced: it visited every stop in order. Evidence `docs/test-evidence/plan76-P76-M-NEARLIER-DETAILS.json`.
  Unshelves when: a new sighting.

- ★ `[KB]` `[watching]` **A note titled "Steam_frame (From the shared Deck tips)" came with a Zhukov overclocks question and looks off-topic** — seen once,
  2026-10-03, block 3b (plan 81). Evidence `docs/test-evidence/plan81-P81-LIFT-6PX-game.json`.
  Unshelves when: a new sighting.

- ★ `[KB]` `[watching]` **With a game running, the meaning search once read about a second** — seen once, 1,070 ms on
  2026-09-23, not seen again. [Detail](roadmap-kb-details.md#kb-transparency-matches-what-the-model-got).
  Unshelves when: a new sighting.

- ★ `[layout]` `[watching]` **A thin strip of the answer shows through below the game-context line at the bottom of the Main panel**
  — seen twice, 2026-09-23 (picture `docs/test-evidence/plan64-BYEYE-01-chat-row.png`); not seen since
  (`plan72-A8-BOTTOM-STRIP-READING.json`, `plan76-S6.json`).
  Unshelves when: a new sighting.

- ★ `[layout]` `[watching]` **The "What went wrong?" block once ended 14 pixels under the dock** — seen once, 2026-09-27;
  on 2026-09-28 it ended 13 px above the dock. Evidence `docs/test-evidence/plan72-Z-FREEPLAY.json`, `docs/test-evidence/plan76-S7.json`.
  Unshelves when: a new sighting.

- ★ `[ollama]` `[focus]` `[watching]` **In the AI models Filters panel, Down from "Also try open-weight models" skipped "Any installed model"** —
  seen once, 2026-10-01 (plan 78, Deck block 3a). Evidence `docs/test-evidence/plan78-P78-ORDER-PRUNE-try2.json`.
  Unshelves when: a new sighting.

- ★ `[reply]` `[watching]` **Strategy choice labels stayed English with the reply language set to Japanese** — seen on both
  Strategy tries, 2026-10-01 (plan 78, block 3a); the Speed reply was Japanese. Evidence `docs/test-evidence/plan78-LANG-03.json`.
  Unshelves when: a new sighting.

- ★ `[reply]` `[focus]` `[watching]` **Two more sightings, 2026-09-26 (the chip ladder and two wrong answers)** — the chip
  ladder steps one chip per press both ways (7 Ups for 7 chips, `plan76-S4.json`). Whether one chip per press is right is
  the maintainer's call: no decision recorded. The two wrong answers did not reproduce.
  Unshelves when: a new sighting.

- ★★ `[chat]` `[focus]` `[watching]` **A chat opened with RB while a game runs is drawn as history, and Down dies on its question line** —
  seen once, 2026-09-26. Closing and reopening the panel fixes it. Not reproduced since; named in the 0.6.0 release notes.
  Evidence `docs/test-evidence/plan72-A7-GAME-ii.json`.
  Unshelves when: a new sighting.

- ★★ `[focus]` `[watching]` **Walking Down while an answer is still arriving loses the ring** — seen once, 2026-09-27
  (it stuck on the first half-visible answer part, then nothing had focus). Not reproduced in three tries. Evidence
  `docs/test-evidence/plan72-A5-DOWN-WHILE-ARRIVING.json`, `docs/test-evidence/plan76-S9.json`.
  Unshelves when: a new sighting.

- ★★ `[ollama]` `[focus]` `[watching]` **A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab** —
  reported by the maintainer 2026-09-16, a touch report the rig cannot reproduce; no evidence file. Needs a try with an
  empty download queue. [Detail](roadmap-details.md#a-tap-outside-the-ai-models-screen-started-the-queued-downloads-and-left-the-d-pad-stuck-in-the-ollama-tab).
  Unshelves when: a new sighting.

- ★★★ `[focus]` `[watching]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** —
  first seen 2026-09-05; usually only a full loader restart cleared it. Likely the same family as the reopen-over-a-game
  fix, which passed 6 of 6 (row P76-TRAP-FIX, done 2026-09-29). A long play test with a game was clean, 24 of 24
  (`docs/test-evidence/plan77-P77-TRAP-LONG.json`). Not proven the same fault; named in the 0.6.0 release notes.
  [Detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  Unshelves when: a new sighting.

- ★ `[platform]` `[watching]` **After a deploy, opening the plugin with the rig's own call failed three times before it
  worked** — seen once, 2026-10-01 (plan 78, block 3b). A tool note, also in [mcp-setup.md](mcp-setup.md).
  Evidence `docs/test-evidence/plan78-P78-TALL-SECTION-LOOP-AFTER.json`.
  Unshelves when: a new sighting.
