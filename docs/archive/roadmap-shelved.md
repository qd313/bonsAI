# Roadmap: shelved entries

Work that is parked on purpose, not dropped and not finished. Each one was moved out of
[the roadmap](../roadmap.md) so the live lists stay short; the roadmap keeps a one-line pointer to each
under its **Shelved** heading, saying what unshelves it.

Nothing here is cancelled. When a shelved entry comes back, move the whole block back into Bugs or
Features at its star position and drop its line from the roadmap's Shelved list.

---

- ★ `[platform]` `[shelved]` **In-IDE preview never gets past its loading screen** *— **OPEN, shelved 2026-09-11
  (D93): not a gate for anything.** On the maintainer's machine the preview stops on its loading screen and never
  moves past it; its command channel takes commands but never answers, and it produced no screenshot. Sorted with
  the other tooling in plan 51's docs phase. It unshelves when the preview loads the plugin on the maintainer's
  machine. [Plan](../planning/51-refactor-round-two.md).*

- ★★ `[ui]` `[shelved]` **Glance view: the answer alone, in big text** *— **OPEN, shelved 2026-09-12: too much UI change, and
  we're not ready for it yet, in the maintainer's own words.** Opening the menu from the popup would have shown only the
  answer, large, with the chips, the question box and the tab bar out of the way, so a person opens, reads and closes in a
  couple of seconds; B would return to the full panel. The mockup and the press list are kept in
  [plan 52 § 6](../planning/52-frame-features-second-look.md#6-glance-view-the-brief-and-the-mockup) and the design handoff
  folder, for when it comes back. [Plan](../planning/49-steam-frame-features.md) ·
  [Drawing](https://claude.ai/code/artifact/c48fb3e2-38ef-4c91-997c-c515353eec96).*

- ★★★ `[KB]` `[shelved]` **KB download Cancel, the Deck check** *— **VERIFY, shelved 2026-09-19 (D113).** The
  Cancel button itself is unchanged — the maintainer's word was to keep it. Shipped 2026-08-05. The download
  finishes in about a second on device, too fast to ever press Cancel in, so the check has nothing to run
  against today. Row **KB-CANCEL-01**. Unshelves when a throttle or a slower test copy exists.*

- ★★★ `[voice]` `[shelved]` **Voices for the bundled characters** *— **OPEN, shelved 2026-09-08 (D74): possible, but a legal check first.** Each
  bundled character would get a voice invented once on the maintainer's PC with OmniVoice, shipped as a five to ten second clip and
  read on the device by a small copying model. Shelved because a voice is not covered by fair use, every character here is voiced by a
  real actor, and "free" is not a defence under the newer AI-voice laws. Unshelving needs the character sweep, a legal check, and the
  open licence call. [Memo](../planning/42-read-aloud-feasibility.md).*

- ★★★ `[voice]` `[shelved]` **Trained voices for the bundled characters** *— **OPEN, shelved with the clip route 2026-09-08 (D74).** The fallback
  if the copying model is too slow beside a game: a small trained voice file per character, about 60 MB, made once on the maintainer's
  PC from OmniVoice speech and downloaded on demand; the fastest way to read. Same legal gate as the clip route, plus the plugin
  hosting its own voice files for the first time. [Memo](../planning/42-read-aloud-feasibility.md).*

- ★★★★ `[voice]` `[shelved]` **A voice for a custom character** *— **OPEN, shelved with the bundled voices 2026-09-08 (D74).** Type a name, press
  **Generate voice**, wait minutes once while the device invents a voice; from then on the small copying model reads that character in
  it. Needs OmniVoice on the device as an optional download of about one gigabyte, with the warning "minutes on a Steam Deck, seconds
  on a stronger machine"; no LAN server. Phase 0 is a half-day Deck test of the port. Waits on the same legal gate as the bundled
  voices. [Memo](../planning/42-read-aloud-feasibility.md).*

- ★★★★★ `[platform]` `[shelved]` **Global quick-launch macro** *— **VERIFY, shelved 2026-09-19 (D113): the
  maintainer said drop it.** Guide-chord docs live in [troubleshooting.md](../troubleshooting.md) § 5; the
  checklist was never run on hardware. It never ran on real hardware and now never will. Unshelves only on
  the maintainer's own word.*

- ★ `[KB]` `[watching]` `[shelved]` **With a game running, the meaning search once read about a second (1,070 ms, 2026-09-23)** — **OPEN, one
  sighting.** [Detail](roadmap-details.md#kb-transparency-matches-what-the-model-got).
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★ `[focus]` `[watching]` `[shelved]` **Down does not move the ring off an unrevealed spoiler block** — **OPEN, found 2026-09-04, did not reproduce
  2026-09-05.** With the ring on the hidden block, Down reported the press arriving and nothing moving. Retried today on a fresh
  Red Dead ending reply with a real hidden block on screen: **Down left it normally**, straight onto the branch picker's first
  button, and every stop on the walk was fully visible. So the hidden state does not trap on its own. Most likely the same
  underlying fault as the stuck panel below — both are a hop that dies only sometimes — and best closed with it rather than
  chased separately. Evidence `docs/test-evidence/round35-spoiler-block-down-and-up.json`. **Next thing to try
  (2026-09-18):** the panel-trap entry below now has a known trigger, opening and closing Steam's own on-screen
  keyboard on the question box — worth trying on this hidden-block case too.
  **2026-09-28 (plan 76):** reproduced in a milder form. Each cover took one extra Down (the first did nothing, and the cover then
  sat 67% behind the tab bar), 2 of 2 runs; Up had none. Handed to lane 3. Evidence `docs/test-evidence/plan76-S1.json`.
  **2026-09-28 (plan 76 lane 3, `3576846c`):** the milder form seen that night (each cover took one extra Down) has its cause
  found and fixed: a "this cover was already offered" flag was reset on every redraw. Checked by row **P76-WALK-COVERS**.
  Kept here, not moved to Verify: the original never-moves form was never reproduced, so it is not fully explained.
  **2026-09-29 (plan 76, block 3):** the walk through the covers now passes (row P76-WALK-COVERS, Done); no never-moves form seen.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★ `[focus]` `[watching]` `[shelved]` **Down from the chat row once skipped the whole answer, after returning from Settings** — **OPEN, seen once
  2026-09-27 (plan 72).** Evidence `docs/test-evidence/plan72-F-ROW.json` (notes).
  **2026-09-28 (plan 76):** not reproduced, 6 tries by two routes. Evidence `docs/test-evidence/plan76-S8.json`.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★ `[focus]` `[watching]` `[shelved]` **In carousel style, Down can land on a chip slid mostly off screen** — **OPEN, sighting
  only — 3 measured re-tries did not reproduce it.** [Detail](roadmap-details.md#flow-2b-bugs).
  **2026-09-28 (plan 76):** not reproduced, 4 tries. Evidence `docs/test-evidence/plan76-S2.json`.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★ `[focus]` `[watching]` `[shelved]` **Three more one-off focus sightings from free play, 2026-09-26.**
  [Detail](roadmap-details.md#flow-2b-bugs).
  **2026-09-28 (plan 76):** the accent-level one reproduced: after choosing an accent level nothing held the ring, and the first LB
  landed on "Show Developer tab" and did not switch tabs (`docs/test-evidence/plan76-S3C.json`); going to a fix this session. The
  folded-turn one did not reproduce (`docs/test-evidence/plan76-S3A.json`).
  **2026-09-29 (`1785aaaf`):** the accent-level one is fixed and proven on the Deck (row P76-ACCENT-RING, evidence
  `docs/test-evidence/plan76-P76-ACCENT-RING.json`). The other two stay open.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★ `[focus]` `[watching]` `[shelved]` **With details open, Down from "N earlier" jumps straight to the notes block** — **OPEN,
  found 2026-09-26 (plan 70, flow L6).** It skips over the newest turn's own Retry, question, answer and
  Hide details on the way down. [Detail](roadmap-details.md#flow-l6-findings).
  **2026-09-28 (plan 76, build `39c17312`):** not reproduced. With one turn drawn under "87 earlier", Down visited Retry, the question, the answer parts, the branch buttons, Helpful, Hide details and the tabs in order. Evidence `docs/test-evidence/plan76-P76-M-NEARLIER-DETAILS.json`.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★ `[layout]` `[watching]` `[shelved]` **A thin strip of the answer shows through below the game-context line at the bottom of the
  Main panel** — **OPEN, found on the Deck 2026-09-23.** Visible in
  `docs/test-evidence/plan64-BYEYE-01-chat-row.png`, between the dock and Steam's own bottom bar.
  **Sighting, 2026-09-23:** seen again under the "Context: no active game detected" line. Evidence
  `docs/test-evidence/plan64-BUSY-DOT-01-back_on_first_chat_22-20-07.png`.
  **Not reproduced 2026-09-27 (plan 72):** not seen with text behind the dock, `docs/test-evidence/plan72-A8-BOTTOM-STRIP-READING.json`.
  **2026-09-28 (plan 76):** not reproduced on the Deck's own screen. Evidence `docs/test-evidence/plan76-S6.json`.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★ `[layout]` `[watching]` `[shelved]` **The "What went wrong?" block once ended 14 pixels under the dock** — **OPEN, seen once 2026-09-27
  (plan 72, free play).** It passed in the planned check. Evidence `docs/test-evidence/plan72-Z-FREEPLAY.json`.
  **2026-09-28 (plan 76):** not reproduced; the block ended 13 px above the dock. Evidence `docs/test-evidence/plan76-S7.json`.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★ `[reply]` `[focus]` `[watching]` `[shelved]` **Two more sightings, 2026-09-26, not reproduced on purpose yet:** the chip ladder
  only lets Up leave one chip at a time (and once Down stuck on it, flow L7); two confidently wrong answers.
  [Detail](roadmap-details.md#l3-and-2d-findings).
  **2026-09-28 (plan 76), the chip ladder one measured:** the ladder steps one chip per press both ways, 7 Ups for 7 chips, no dead
  press. Whether one chip per press is wrong is the maintainer's call. Evidence `docs/test-evidence/plan76-S4.json`.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★★ `[chat]` `[watching]` `[shelved]` **A chat that is still writing does not look busy from another chat** — **OPEN, found
  2026-09-18, seen three times, stays open — the maintainer's call.** Switch away from a chat that is
  still writing and nothing says so; the code looks right on paper. Two clean measured sessions since
  (2026-09-23 and 2026-09-26, 3 more tries) did not reproduce it, which is not enough to close a bug seen
  three times before. **New, unclear, the maintainer's call:** the other chat's own Ask button read
  greyed while the first was still writing, not "ready" as the row expects — which reading is actually
  right is open.
  [Detail](roadmap-details.md#a-chat-that-is-still-writing-does-not-look-busy-from-another-chat).
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★★ `[chat]` `[focus]` `[watching]` `[shelved]` **A chat opened with RB while a game runs is drawn as history, and Down dies on its
  question line** — **OPEN, found 2026-09-26 (plan 70, flow L7).** Closing and reopening the panel fixes it.
  [Detail](roadmap-details.md#flow-l7-findings).
  **Not reproduced 2026-09-27 (plan 72):** walked cleanly, `docs/test-evidence/plan72-A7-GAME-ii.json`.
  **Not seen again 2026-09-27:** in none of plan 72's seven Deck blocks (plan 72 § 7).
  **The maintainer's call, 2026-09-27:** named in the 0.6.0 release notes (plan 72 § 8); watched, not chased.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★★ `[focus]` `[watching]` `[shelved]` **Walking Down while an answer is still arriving loses the ring** — **OPEN, found 2026-09-27
  (plan 70, flow L10).** It sticks on the first, half-visible answer part, then nothing has focus; fine on a
  finished answer. [Detail](roadmap-details.md#flow-l10-findings).
  **Not reproduced 2026-09-27 (plan 72):** the ring was never lost, `docs/test-evidence/plan72-A5-DOWN-WHILE-ARRIVING.json`.
  **2026-09-28 (plan 76):** not reproduced again, 2 tries. Evidence `docs/test-evidence/plan76-S9.json`.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★★ `[ollama]` `[focus]` `[watching]` `[shelved]` **A tap outside the AI models screen started the queued downloads and left the
  D-pad stuck in the Ollama tab** — **OPEN, reported 2026-09-16, not reproduced.** The maintainer thinks a
  tap landed outside the screen instead of on Done; the queued models then started downloading and the
  D-pad could not move in the Ollama tab, as if the screen were still open. Read in the code but not proven
  on the device. Needs a reproduction with an empty download queue.
  [Detail](roadmap-details.md#a-tap-outside-the-ai-models-screen-started-the-queued-downloads-and-left-the-d-pad-stuck-in-the-ollama-tab).
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.

- ★★★ `[focus]` `[watching]` `[shelved]` **The panel can get into a state where pressing Down stops half way and the Ask button is
  out of reach** — **OPEN, found 2026-09-05, stays open — the maintainer's call.** Usually only a full
  loader restart clears it; closing and reopening Quick Access cleared one flow-R occurrence too, this
  time from a chip filling the question box. Still sighted 2026-09-26; a careful reading the same night
  did not reproduce the chip route (0 of 6). [Detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
  **Not reproduced 2026-09-27 (plan 72):** 0 of 3 with the keyboard trigger, `docs/test-evidence/plan72-A1-STUCK-KEYBOARD-try1.json` (and try2, try3).
  **Not seen again 2026-09-27:** in none of plan 72's seven Deck blocks (plan 72 § 7).
  **The maintainer's call, 2026-09-27:** named in the 0.6.0 release notes (plan 72 § 8); watched, not chased.
  **2026-09-28 (plan 76):** the Fallout 4 entry (now in Verify) has a new sighting of the same family, with a likely trigger.
  **2026-09-29 (plan 76, Deck block 2c):** the Fallout 4 entry (now in Verify) reproduced it on purpose, twice; same family.
  **2026-09-29 (plan 76, block 3):** the Fallout 4 entry (now in Verify) now has the measurement: the split follows whether the panel's window has focus.
  **2026-09-29 (plan 76, Deck block 4):** the Fallout 4 entry, now in Verify › Bugs as fixed, may be this same family (not proven). Its fix passed 6 of 6 reopens with a game running; see row **P76-TRAP-FIX**. Whether this entry stays open is the maintainer's call.
  **Moved to the watch list 2026-09-29 (the maintainer's call, plan 77):** one-off sighting, kept as it was. Unshelves on a new sighting.
