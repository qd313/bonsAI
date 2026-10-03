# Plan 80, step 1 — helper 8: the Shelved section and its archive file

- **Slice:** `docs/roadmap.md` from `## Shelved` (line 670) to the line before `## Done for v0.5.0`, plus every entry in
  `docs/archive/roadmap-shelved.md` (167 lines).
- **Date:** 2026-10-03. **Branch:** `experimental`. Read-only except this sheet.
- **Entries:** 28. Pairing: 22 have a roadmap line and a full archive entry. 6 have a roadmap line and **no archive
  partner** (roadmap lines 687 to 692, all added 2026-10-01 from plan 78, written in full on the roadmap line already).
  **No archive entry lacks a roadmap line.**
- **Verdicts:** true 27, stale 1 (the "panel stops half way" entry), done with proof 0, fixed with no proof 0, unclear 0.
- **Status changes proposed:** none to a status. One wording fix (entry 24, below). Everything else stays parked or watched.
- **Why nothing is "done with proof":** every `[watching]` entry is a sighting that did not reproduce. None has a fix to prove.
  The one part that was fixed (the accent ring, entry 5) is already proven: row P76-ACCENT-RING, passed on the Deck
  2026-09-29, in `docs/testing.md` (line 263).

## Two kinds of item sit in this section

The section holds two different things, and the new file should say so with two headings:

1. **Parked on purpose** (8 items): the in-IDE preview, Glance view, KB Cancel check, three voice items, the custom voice,
   the quick-launch macro. Each waits for a person's word or a legal or tool gate.
2. **Watched sightings** (20 items, tagged `[watching]`): seen once or a few times, not reproduced, come back on a new
   sighting (D120 call 3). These are not parked work. They are bugs under watch. The brief's call 3 says the one file holds
   "every parked item"; the maintainer should confirm the watched sightings go in it too (see Notes).

How the 8 parked items are grouped: one tag line each below. The two-part order for the new file: parked on purpose first
(by star), then watched sightings (by star, then tag, then title, as the house rules say).

## Facts checked once, used below

- **Evidence files:** all 25 evidence files named in the 28 entries exist in `docs/test-evidence/` (checked by name).
- **Plan links:** `planning/51-refactor-round-two.md`, `planning/42-read-aloud-feasibility.md`,
  `planning/49-steam-frame-features.md` and `planning/52-frame-features-second-look.md` (heading "6. Glance view: the brief
  and the mockup", line 213) all exist.
- **Hashes re-checked on the full history (2026-10-03):** `1785aaaf`, `3576846c`, `39c17312`, `7d84ee3b`, `c8d6b094` and `b417c271` all resolve, and their subjects match what the entries say. A search of all 2,369 commits for preview, glance, quick-launch and voice work found nothing that unshelves any parked item.
- **Nothing was built since the last note on any entry.** `git log` since 2026-10-01 shows only plan 79 and the README work;
  none of it touches a shelved item.
- **Decision links** (relative to `docs/roadmap.md`; from the new `docs/roadmap-shelved.md` they are the same):
  - D74: `audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open`
  - D93: `audit/maintainer-decisions-locked.md#d93--locked-2026-09-11--the-deck-is-the-gate-the-preview-is-shelved-device-checks-are-queued`
  - D97 (Glance view shelving, line 678 of the locked file): `audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule`
  - D113: `audit/maintainer-decisions-locked.md#d113--locked-2026-09-19-raised-2026-09-18--plan-61-automated-verification-session-the-thirteen-questions`
  - D120 (the watch list): `audit/maintainer-decisions-locked.md#d120--locked-2026-09-29-raised-2026-09-29--plan-77-the-last-bug-session-before-friday-the-eight-calls`
  - The roadmap says "D93" for the preview and "D113" for Cancel and the macro. Both are right. The roadmap gives **no**
    decision for Glance view; D97 is the one (see Notes).

---

# Parked on purpose

## 1. In-IDE preview never gets past its loading screen
- **Title / where:** same title. Roadmap Shelved, line 675; archive entry at line 12.
- **Verdict:** **true.**
- **Proof:** D93 (locked file line 510): "The preview is shelved. It has never got past 'Loading plugin preview' on this
  machine." `docs/mcp-setup.md` line 87 still describes the preview's focus injection as unusable. No commit since touches
  it (`git log --grep=preview`: nothing newer than the shelving). Unshelve condition still true: it needs the maintainer's
  own machine to show the plugin, and nothing says that happened.
- **Decision owed?** No new one. Link: D93 (above).
- **Test owed?** No. Nothing to run until the preview loads.
- **Proposed entry for the new file:**
  - ★ `[platform]` **In-IDE preview never gets past its loading screen** — **shelved 2026-09-11.** On the maintainer's
    machine the preview stops on "Loading plugin preview". It takes commands but never answers, and it made no screenshot.
    Not a gate for anything: the Deck is the gate. [Decision D93](audit/maintainer-decisions-locked.md#d93--locked-2026-09-11--the-deck-is-the-gate-the-preview-is-shelved-device-checks-are-queued) · [Plan 51](planning/51-refactor-round-two.md).
  - **Unshelves when:** the preview loads the plugin on the maintainer's machine.
- **Long notes:** none linked.

## 2. Glance view: the answer alone, in big text
- **Title / where:** same title. Roadmap line 693 (two lines); archive line 18.
- **Verdict:** **true.**
- **Proof:** locked file line 678: "shelve the glanceable view for now. It's too much UI change and we're not ready for it
  yet." (D97). Code: no glance view exists (`git grep -il glance -- src` finds only unrelated words such as "at a glance"
  in comments). Mockup is kept: `docs/planning/52-frame-features-second-look.md` § 6, line 213; design files in
  `docs/design/handoffs/glance-view/`.
- **Decision owed?** No. The decision is recorded: D97 (link above). The roadmap line does not link it; the new entry should.
- **Test owed?** No. Nothing built.
- **Proposed entry:**
  - ★★ `[ui]` **Glance view: the answer alone, in big text** — **shelved 2026-09-12.** From the popup, the menu would show
    only the answer, large, with the chips, question box and tab bar out of the way. Open, read, close in a couple of
    seconds; B returns to the full panel. The maintainer shelved it: too much UI change, not ready.
    [Decision D97](audit/maintainer-decisions-locked.md#d97--locked-2026-09-12-raised-2026-09-11--the-frame-features-four-calls-the-tips-go-the-voice-shape-and-the-anti-cheat-rule) · [Mockup and press list](planning/52-frame-features-second-look.md#6-glance-view-the-brief-and-the-mockup) · [Drawing](https://claude.ai/code/artifact/c48fb3e2-38ef-4c91-997c-c515353eec96).
  - **Unshelves when:** the maintainer says so.
- **Long notes:** none in the details file. The old archive entry links `planning/49-steam-frame-features.md`; drop that link
  (plan 52 § 6 is the real record).

## 3. KB download Cancel, the Deck check
- **Title / where:** same title. Roadmap line 699 (two lines); archive line 26.
- **Verdict:** **true.**
- **Proof:** `docs/testing.md` line 220, row KB-CANCEL-01, status "**Shelved (D113)**": "the download finishes in about a
  second, so there is no window to press Cancel in". Same row open and unticked in `docs/testing-manual.md` line 449. Both
  say "moves to the roadmap's Shelved list". Evidence of the attempt: `docs/archive/testing-row-history-2026.md` § KB-CANCEL-01
  (Deck log 23:32:37.711 to 23:32:38.610, 2026-08-16). D113 (e): Cancel stays, "keep"; check moves to Shelved.
  The Cancel button is in the code (`src/components/KnowledgeBaseSection.tsx`).
- **Decision owed?** No. D113 (link above).
- **Test owed?** Yes, and no evidence of a pass exists: row KB-CANCEL-01 in `docs/testing.md` line 220. Needs a Deck check
  (blocked until a slowed download exists).
- **Proposed entry:**
  - ★★★ `[KB]` **KB download Cancel, the Deck check** — **shelved 2026-09-19.** The Cancel button stays; the maintainer said
    keep it. It was shipped 2026-08-05 and has six passing unit tests, but the real download takes about a second, too fast
    to press Cancel in. The D-pad reaching Cancel has never been seen on the Deck.
    Row [KB-CANCEL-01](testing.md) · [Decision D113](audit/maintainer-decisions-locked.md#d113--locked-2026-09-19-raised-2026-09-18--plan-61-automated-verification-session-the-thirteen-questions).
  - **Unshelves when:** a throttle or a slower test copy of the download exists.
- **Long notes:** `roadmap-details.md` line 381 ("KB download Cancel — shipped 2026-08-05; KB-CANCEL-01 — not testable as
  written") is the long note. Keep its last two sentences ("To run this row at all the download has to be slowed" and
  "Until then the six frontend tests…"). The Deck-log timings and the storage-picker paragraph ("What looked like a Cancel
  pass was the storage picker") can go to the archive; they are also in `archive/testing-row-history-2026.md`. That file is
  in the knowledge-base split, so the KB helper decides where it lands.

## 4. Voices for the bundled characters
- **Title / where:** same title. Roadmap line 701; archive line 31.
- **Verdict:** **true.**
- **Proof:** locked file, D74, "Shelved 2026-09-08, later the same evening": "Two gates before unshelving: a written sweep
  of the 31 characters … and a legal check". Call 11 "stays open" (the licence question). Neither gate is done: the sweep is
  still roadmap Features line 175 ("Which bundled characters copy a real person", OPEN). Read aloud Phase 1 did ship
  (CHANGELOG line 801, the Deck's own voice) and is not shelved, so the entry is not confused with it.
  No voice-clip code in `src` (`git grep OmniVoice -- src main.py py_modules`: no hits).
- **Decision owed?** The licence call (D74 call 11) is open. Link: D74 (above). Also link the sweep entry (roadmap Features).
- **Test owed?** No. Nothing built.
- **Proposed entry:**
  - ★★★ `[voice]` **Voices for the bundled characters** — **shelved 2026-09-08.** Each character would get a voice invented
    once on the maintainer's PC and shipped as a five to ten second clip, read on the device by a small copying model.
    Shelved because a voice is not covered by fair use, every character is voiced by a real actor, and "free" is no defence
    under the newer AI-voice laws. [Decision D74](audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open) · [Memo](planning/42-read-aloud-feasibility.md).
  - **Unshelves when:** the character sweep ("Which bundled characters copy a real person", in Features) is done, a person
    qualified to give one has done a legal check, and the open licence call (D74 call 11) is answered.
- **Long notes:** none linked.

## 5. Trained voices for the bundled characters
- **Title / where:** same title. Roadmap line 703; archive line 37.
- **Verdict:** **true.**
- **Proof:** same as entry 4 (D74 calls 7 to 10 shelved together). No voice-file hosting in the code.
- **Decision owed?** Same open call as entry 4. Link D74.
- **Test owed?** No.
- **Proposed entry:**
  - ★★★ `[voice]` **Trained voices for the bundled characters** — **shelved with the clip route 2026-09-08.** The fallback if
    the copying model is too slow beside a game: a small trained voice file per character, about 60 MB, made once on the
    maintainer's PC and downloaded on demand. The fastest way to read. It also means the plugin hosts its own voice files
    for the first time. [Decision D74](audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open) · [Memo](planning/42-read-aloud-feasibility.md).
  - **Unshelves when:** the same gates as "Voices for the bundled characters" are met, and the maintainer agrees the plugin
    may host voice files.
- **Long notes:** none.

## 6. A voice for a custom character
- **Title / where:** same title. Roadmap line 706; archive line 42.
- **Verdict:** **true.**
- **Proof:** D74 call 8 and call 10 (locked file, "Locked 2026-09-08"), shelved with the bundled voices. Nothing built.
- **Decision owed?** Same open call. Link D74.
- **Test owed?** No. Its own first step (a half-day Deck test of the OmniVoice port, memo row 07) is not run: no evidence file.
- **Proposed entry:**
  - ★★★★ `[voice]` **A voice for a custom character** — **shelved with the bundled voices 2026-09-08.** Type a name, press
    **Generate voice**, wait minutes once while the device invents a voice. After that the small copying model reads that
    character in it. Needs an optional download of about one gigabyte, with the warning "minutes on a Steam Deck, seconds
    on a stronger machine". No LAN server. Phase 0 is a half-day Deck test of the port.
    [Decision D74](audit/maintainer-decisions-locked.md#d74--partly-locked-2026-09-05-raised-the-same-day--reading-answers-aloud-five-calls-locked-one-open) · [Memo](planning/42-read-aloud-feasibility.md).
  - **Unshelves when:** the same legal gate as the bundled voices is passed.
- **Long notes:** none.

## 7. Global quick-launch macro
- **Title / where:** same title. Roadmap line 708 (two lines); archive line 48.
- **Verdict:** **true.**
- **Proof:** D113 (c): "drop it." `main.py` line 823: "the quick-launch chord is shelved; Developer tab only. No
  shortcut_setup, no button." `docs/troubleshooting.md` § 5 "bonsai shortcut setup" (line 588) exists. One chip,
  `src/data/presets.ts` line 202 ("How do I bind a BonsAI quick-launch chord?"), is marked beta; not a shelved-item problem.
- **Decision owed?** No. D113 (link above).
- **Test owed?** No. "It never ran on real hardware and now never will" (archive entry).
- **Proposed entry:**
  - ★★★★★ `[platform]` **Global quick-launch macro** — **shelved 2026-09-19.** The maintainer said drop it. It never ran on
    real hardware. The Guide-chord notes stay in [troubleshooting.md](troubleshooting.md) § 5.
    [Decision D113](audit/maintainer-decisions-locked.md#d113--locked-2026-09-19-raised-2026-09-18--plan-61-automated-verification-session-the-thirteen-questions).
  - **Unshelves when:** the maintainer says so.
- **Long notes:** none. Archive entry's tag says VERIFY; drop that word, no row is owed.

---

# Watched sightings (tag `[watching]`; D120 call 3: each comes back on a new sighting)

All 20 are **true**: each says "seen once or a few times, not reproduced", and each reproduction note was checked
against its evidence file's name and existence (all exist). The proposed entries are one to four lines each. The long
dated notes (plan 76 and 72 runs) in the archive entries move to the new file's own "older notes" only if the maintainer
wants them kept inline; the proposed entry keeps just what is known now and the evidence link. Nothing is deleted: the old
archive file stays as the record (call 5).

## 8. With a game running, the meaning search once read about a second (1,070 ms, 2026-09-23)
- **Where:** roadmap line 677; archive line 53. **Verdict:** true.
- **Proof:** the archive says "one sighting, not seen again". Detail link `roadmap-details.md#kb-transparency-matches-what-the-model-got`
  (knowledge-base split: the KB long notes move to `roadmap-kb-details.md`, so this link must follow it). No evidence file named
  in either place (the number is quoted from the detail note). **Test owed?** no evidence file exists for the sighting itself.
  **Decision:** D120 call 3 (watch list).
- **Proposed entry:**
  - ★ `[KB]` `[watching]` **With a game running, the meaning search once read about a second** — seen once, 1,070 ms on
    2026-09-23, not seen again. [Detail](roadmap-kb-details.md#kb-transparency-matches-what-the-model-got) (link to be fixed after the split).
  - **Unshelves when:** a new sighting.

## 9. Down does not move the ring off an unrevealed spoiler block
- **Where:** roadmap 678; archive 57. **Verdict:** true.
- **Proof:** found 2026-09-04; retried 2026-09-05, did not reproduce (`docs/test-evidence/round35-spoiler-block-down-and-up.json`).
  The milder form (one extra Down per cover) was fixed in `3576846c` and passed on the Deck: row P76-WALK-COVERS, `docs/testing.md`
  line 264 ("Done — passed (Deck) 2026-09-29"). Evidence for the milder form: `docs/test-evidence/plan76-S1.json`.
- **Decision:** D120 call 3. **Test owed?** no.
- **Proposed entry:**
  - ★ `[focus]` `[watching]` **Down does not move the ring off an unrevealed spoiler block** — seen once, 2026-09-04, never
    reproduced. The milder form (each cover took one extra Down) is fixed and passed on the Deck: row P76-WALK-COVERS.
    Evidence `docs/test-evidence/round35-spoiler-block-down-and-up.json`.
  - **Unshelves when:** a new sighting.

## 10. Down from the chat row once skipped the whole answer, after returning from Settings
- **Where:** roadmap 679; archive 73. **Verdict:** true.
- **Proof:** seen once 2026-09-27, `plan72-F-ROW.json`; 6 tries by two routes did not reproduce, `plan76-S8.json`.
- **Proposed entry:**
  - ★ `[focus]` `[watching]` **Down from the chat row once skipped the whole answer, after returning from Settings** — seen
    once, 2026-09-27; not reproduced in six tries. Evidence `docs/test-evidence/plan72-F-ROW.json`, `docs/test-evidence/plan76-S8.json`.
  - **Unshelves when:** a new sighting.

## 11. In carousel style, Down can land on a chip slid mostly off screen
- **Where:** roadmap 680; archive 78. **Verdict:** true.
- **Proof:** three re-tries then four more did not reproduce it, `plan76-S2.json`. Detail link `roadmap-details.md#flow-2b-bugs`
  (check the heading survives the details trim).
- **Proposed entry:**
  - ★ `[focus]` `[watching]` **In carousel style, Down can land on a chip slid mostly off screen** — one sighting; seven tries
    since did not reproduce it. Evidence `docs/test-evidence/plan76-S2.json`.
  - **Unshelves when:** a new sighting.

## 12. Three more one-off focus sightings from free play, 2026-09-26
- **Where:** roadmap 681; archive 83. **Verdict:** true.
- **Proof:** the accent-level one is fixed and proven: row P76-ACCENT-RING, `docs/test-evidence/plan76-P76-ACCENT-RING.json`,
  `docs/testing.md` line 263 ("Done — passed (Deck) 2026-09-29"), fix `1785aaaf`. The folded-turn one did not reproduce,
  `plan76-S3A.json`. The third is not named in the archive entry beyond "the other two" (it points at the details heading).
- **Proposed entry:**
  - ★ `[focus]` `[watching]` **Three more one-off focus sightings from free play, 2026-09-26** — the accent-level one is
    fixed and passed on the Deck (row P76-ACCENT-RING). The other two did not reproduce (`plan76-S3A.json` for the folded turn).
  - **Unshelves when:** a new sighting.
- **Long notes:** `roadmap-details.md#flow-2b-bugs` must keep the description of the two remaining sightings, because the
  entry alone does not say what they were.

## 13. With details open, Down from "N earlier" jumps straight to the notes block
- **Where:** roadmap 682; archive 92. **Verdict:** true.
- **Proof:** found 2026-09-26 (plan 70, flow L6); not reproduced, `plan76-P76-M-NEARLIER-DETAILS.json` (build `39c17312`).
- **Proposed entry:**
  - ★ `[focus]` `[watching]` **With details open, Down from "N earlier" jumps straight to the notes block** — seen once,
    2026-09-26. Not reproduced: it visited every stop in order. Evidence `docs/test-evidence/plan76-P76-M-NEARLIER-DETAILS.json`.
  - **Unshelves when:** a new sighting.

## 14. A thin strip of the answer shows through below the game-context line at the bottom of the Main panel
- **Where:** roadmap 683; archive 98. **Verdict:** true.
- **Proof:** seen twice 2026-09-23 (`plan64-BYEYE-01-chat-row.png`, `plan64-BUSY-DOT-01-back_on_first_chat_22-20-07.png`);
  not reproduced 2026-09-27 (`plan72-A8-BOTTOM-STRIP-READING.json`) or 2026-09-28 (`plan76-S6.json`).
- **Proposed entry:**
  - ★ `[layout]` `[watching]` **A thin strip of the answer shows through below the game-context line at the bottom of the Main panel**
    — seen twice, 2026-09-23 (picture `docs/test-evidence/plan64-BYEYE-01-chat-row.png`); not seen since
    (`plan72-A8-BOTTOM-STRIP-READING.json`, `plan76-S6.json`).
  - **Unshelves when:** a new sighting.

## 15. The "What went wrong?" block once ended 14 pixels under the dock
- **Where:** roadmap 684; archive 107. **Verdict:** true.
- **Proof:** seen once 2026-09-27 (`plan72-Z-FREEPLAY.json`); `plan76-S7.json`: block ended 13 px above the dock.
- **Proposed entry:**
  - ★ `[layout]` `[watching]` **The "What went wrong?" block once ended 14 pixels under the dock** — seen once, 2026-09-27;
    on 2026-09-28 it ended 13 px above the dock. Evidence `docs/test-evidence/plan72-Z-FREEPLAY.json`, `docs/test-evidence/plan76-S7.json`.
  - **Unshelves when:** a new sighting.

## 16. Two more sightings, 2026-09-26 (the chip ladder and two wrong answers)
- **Where:** roadmap 685; archive 112. **Verdict:** true.
- **Proof:** `plan76-S4.json`: the ladder steps one chip per press both ways, 7 Ups for 7 chips. The archive says "whether one
  chip per press is wrong is the maintainer's call". The roadmap line drops that sentence.
- **Decision owed?** Yes, small: is one chip per press acceptable? **No decision recorded.** Say so in the entry.
- **Proposed entry:**
  - ★ `[reply]` `[focus]` `[watching]` **Two more sightings, 2026-09-26 (the chip ladder and two wrong answers)** — the chip
    ladder steps one chip per press both ways (7 Ups for 7 chips, `plan76-S4.json`); whether that is right is the maintainer's
    call, no decision recorded. The two wrong answers did not reproduce.
  - **Unshelves when:** a new sighting.

## 17. A Down press left a long answer section 22% visible behind the tab bar, and a Down in the chip ladder left it 67% visible behind the Ask bar's icon
- **Where:** roadmap 686; archive 167. **Verdict:** true.
- **Proof:** seen once each 2026-09-30, plan 77 block 4, build `7d84ee3b`, `docs/test-evidence/plan77-QA-FREE-PLAY-01.json`. Neither
  is one of the two known false alarms. Moved to the watch list 2026-09-30 (archive text says "maintainer's call, plan 77").
- **Proposed entry:**
  - ★ `[focus]` `[watching]` **A Down press left a long answer section 22% visible behind the tab bar, and a Down in the chip
    ladder left it 67% visible behind the Ask bar's icon** — each seen once, 2026-09-30, not reproduced on purpose.
    Evidence `docs/test-evidence/plan77-QA-FREE-PLAY-01.json`.
  - **Unshelves when:** a new sighting.

## 18. In the AI models Filters panel, Down from "Also try open-weight models" skipped "Any installed model"
- **Where:** roadmap 687; **no archive partner.** **Verdict:** true.
- **Proof:** evidence `docs/test-evidence/plan78-P78-ORDER-PRUNE-try2.json` exists (also `plan78-P78-ORDER-PRUNE.json`). Seen once,
  2026-10-01. No test row carries this sighting; no decision needed (D120 call 3).
- **Proposed entry:** the roadmap line as it stands, without the file path in the sentence:
  - ★ `[ollama]` `[focus]` `[watching]` **In the AI models Filters panel, Down from "Also try open-weight models" skipped "Any installed model"** —
    seen once, 2026-10-01 (plan 78, Deck block 3a). Evidence `docs/test-evidence/plan78-P78-ORDER-PRUNE-try2.json`.
  - **Unshelves when:** a new sighting.

## 19. Down is dead from the last chip in the Show details chip ladder
- **Where:** roadmap 688; **no archive partner.** **Verdict:** true.
- **Proof:** `docs/test-evidence/plan78-DOC-SWEEP-01.json` exists. Seen once, 2026-10-01 (plan 78, block 3a).
- **Note:** may be related to entry 16 (the chip ladder); no source says so, so not claimed. A reader may want to link them.
- **Proposed entry:**
  - ★ `[focus]` `[watching]` **Down is dead from the last chip in the Show details chip ladder** — seen once, 2026-10-01
    (plan 78, Deck block 3a). Evidence `docs/test-evidence/plan78-DOC-SWEEP-01.json`.
  - **Unshelves when:** a new sighting.

## 20. After the screenshot picker closes, nothing holds the highlight until the next press
- **Where:** roadmap 689; **no archive partner.** **Verdict:** true.
- **Proof:** `docs/test-evidence/plan78-DOC-SWEEP-01.json`; seen once, 2026-10-01.
- **Proposed entry:**
  - ★ `[focus]` `[watching]` **After the screenshot picker closes, nothing holds the highlight until the next press** — seen
    once, 2026-10-01 (plan 78, block 3a). Evidence `docs/test-evidence/plan78-DOC-SWEEP-01.json`.
  - **Unshelves when:** a new sighting.

## 21. Strategy choice labels stayed English with the reply language set to Japanese
- **Where:** roadmap 690; **no archive partner.** **Verdict:** true.
- **Proof:** `docs/test-evidence/plan78-LANG-03.json` (read): the Speed reply was Japanese (99.2% kana or kanji); Strategy
  try 1's whole reply was English, 0 kana or kanji, menu in English. Row LANG-03 is a real test row; this sighting is its
  finding. Check `docs/testing.md` for how LANG-03 reads before the sweep: **I did not read that row's status**; the
  bookkeeper should confirm it names this result.
- **Proposed entry:**
  - ★ `[reply]` `[watching]` **Strategy choice labels stayed English with the reply language set to Japanese** — seen on both
    Strategy tries, 2026-10-01 (plan 78, block 3a); the Speed reply was Japanese. Evidence `docs/test-evidence/plan78-LANG-03.json`.
  - **Unshelves when:** a new sighting.
- **Note:** "seen once, on two tries" on the roadmap is correct: one session, two tries, both English.

## 22. With a game running, the dock's top measured the same as with none
- **Where:** roadmap 691; **no archive partner.** **Verdict:** true.
- **Proof:** `docs/test-evidence/plan78-QA-FREE-PLAY-01-GAME-try3.json` (read): "dock top y=290.17 with the game running too
  (the brief said about 262 with a game; I measured 290 both ways)".
- **Note:** this is a test-setup assumption that was wrong, more than a bug. No source says the plugin is at fault.
  The entry's tag `[focus]` is odd (it is a layout measurement); not changed here.
- **Proposed entry:**
  - ★ `[focus]` `[watching]` **With a game running, the dock's top measured the same as with none** — seen once, 2026-10-01
    (plan 78, block 3b): 290 both ways, where the test setup had assumed about 262 with a game. Evidence
    `docs/test-evidence/plan78-QA-FREE-PLAY-01-GAME-try3.json`.
  - **Unshelves when:** a new sighting.

## 23. After a deploy, opening the plugin with the rig's own call failed three times before it worked
- **Where:** roadmap 692; **no archive partner.** **Verdict:** true.
- **Proof:** `docs/test-evidence/plan78-P78-TALL-SECTION-LOOP-AFTER.json` (read, "setup"): "deck_openPlugin failed 3 times (two
  'could not reach CEF debugger' reads right after the deploy, then the QAM chord was sent but no pane appeared once) and
  opened on the 4th call." Also recorded in `docs/mcp-setup.md` line 46 (2026-10-01).
- **Note:** a tool note, not a plugin bug. It does not belong in a list of plugin sightings. Suggest it lives only in
  `mcp-setup.md`, with a one-line pointer.
- **Proposed entry:** (if kept)
  - ★ `[platform]` `[watching]` **After a deploy, opening the plugin with the rig's own call failed three times before it
    worked** — seen once, 2026-10-01 (plan 78, block 3b). A tool note, also in [mcp-setup.md](mcp-setup.md).
    Evidence `docs/test-evidence/plan78-P78-TALL-SECTION-LOOP-AFTER.json`.
  - **Unshelves when:** a new sighting.

## 24. The panel can get into a state where pressing Down stops half way and the Ask button is out of reach
- **Where:** roadmap 705; archive 152. **Verdict:** **stale (wording only).**
- **What changed:** the roadmap line says "the same family as the D-pad trap fix **in Verify** (row P76-TRAP-FIX)". That row is
  no longer in Verify: it is passed and closed, in `docs/archive/testing-closed-2026.md` line 361 ("Done — passed (Deck)
  2026-09-29 (first 6 of 6 …)"), and the Fallout 4 entry is in `docs/archive/roadmap-bugs-fixed.md` line 2503. Evidence
  `docs/test-evidence/plan76-P76-TRAP-FIX.json`, and the long play test `docs/test-evidence/plan77-P77-TRAP-LONG.json` (24 of 24).
  The archive entry also says "Fallout 4 entry, now in Verify › Bugs"; same stale wording.
- **Also:** the archive entry says the 2026-09-27 plan 72 notes (0 of 3, `plan72-A1-STUCK-KEYBOARD-try1.json` and try2, try3)
  and "named in the 0.6.0 release notes". Both checked: evidence exists. The release-notes claim I did not check (no
  release-notes file was in my slice).
- **Decision owed?** The archive says "stays open, the maintainer's call" and "Whether this entry stays open is the
  maintainer's call." **No decision recorded** that settles it beyond D120 call 3 (watch list). Needs the maintainer.
- **Proposed entry:**
  - ★★★ `[focus]` `[watching]` **The panel can get into a state where pressing Down stops half way and the Ask button is out of reach** —
    first seen 2026-09-05; usually only a full loader restart cleared it. Likely the same family as the reopen-over-a-game
    fix, which passed 6 of 6 (row P76-TRAP-FIX, done 2026-09-29). A long play test with a game was clean, 24 of 24
    (`docs/test-evidence/plan77-P77-TRAP-LONG.json`). Not proven the same fault; named in the 0.6.0 release notes.
  - **Unshelves when:** a new sighting.
- **Long notes:** `roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach` holds the history
  (the 2026-09-05 fix that "nothing proved against the fault", three failed repro attempts). Keep the first paragraph and the
  three failed attempts; the dated plan 76 steps can go to the archive.

## 25. A chat that is still writing does not look busy from another chat
- **Where:** roadmap 695; archive 119. **Verdict:** true.
- **Proof:** found 2026-09-18, seen three times; two clean sessions since (2026-09-23, 2026-09-26) did not reproduce it. Evidence
  for the failed rows: `docs/test-evidence/plan61-CHAT-SLOTS-V3-05a-busyhalf.json` (and -06a, -06b), per `docs/roadmap.md` line 429.
- **Decision owed?** Yes, small and recorded nowhere: "the other chat's own Ask button read greyed while the first was still
  writing, not 'ready' as the row expects — which reading is actually right is open." The roadmap one-liner drops this. **No
  decision recorded.** Keep it in the new entry.
- **Proposed entry:**
  - ★★ `[chat]` `[watching]` **A chat that is still writing does not look busy from another chat** — found 2026-09-18, seen
    three times, then not reproduced in two clean sessions. Open question for the maintainer: the other chat's Ask button
    read greyed while the first was writing; which reading is right is undecided.
    [Detail](roadmap-details.md#a-chat-that-is-still-writing-does-not-look-busy-from-another-chat).
  - **Unshelves when:** a new sighting.

## 26. A chat opened with RB while a game runs is drawn as history, and Down dies on its question line
- **Where:** roadmap 696; archive 129. **Verdict:** true.
- **Proof:** found 2026-09-26 (plan 70, flow L7). `plan72-A7-GAME-ii.json`: walked cleanly. Not seen in plan 72's seven blocks.
  Maintainer's call 2026-09-27: named in the release notes, "watched, not chased" (plan 72 § 8).
- **Proposed entry:**
  - ★★ `[chat]` `[focus]` `[watching]` **A chat opened with RB while a game runs is drawn as history, and Down dies on its question line** —
    seen once, 2026-09-26. Closing and reopening the panel fixes it. Not reproduced since; named in the 0.6.0 release notes.
    Evidence `docs/test-evidence/plan72-A7-GAME-ii.json`.
  - **Unshelves when:** a new sighting.

## 27. Walking Down while an answer is still arriving loses the ring
- **Where:** roadmap 697; archive 137. **Verdict:** true.
- **Proof:** found 2026-09-27 (plan 70, flow L10); `plan72-A5-DOWN-WHILE-ARRIVING.json` (never lost); `plan76-S9.json` (2 tries).
- **Proposed entry:**
  - ★★ `[focus]` `[watching]` **Walking Down while an answer is still arriving loses the ring** — seen once, 2026-09-27
    (it stuck on the first half-visible answer part, then nothing had focus). Not reproduced in three tries. Evidence
    `docs/test-evidence/plan72-A5-DOWN-WHILE-ARRIVING.json`, `docs/test-evidence/plan76-S9.json`.
  - **Unshelves when:** a new sighting.

## 28. A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab
- **Where:** roadmap 698; archive 144. **Verdict:** true.
- **Proof:** reported 2026-09-16 by the maintainer; "read in the code but not proven on the device". No evidence file exists
  for it (**no evidence exists**). Needs a reproduction with an empty download queue.
- **Proposed entry:**
  - ★★ `[ollama]` `[focus]` `[watching]` **A tap outside the AI models screen started the queued downloads and left the D-pad stuck in the Ollama tab** —
    reported by the maintainer 2026-09-16, a touch report the rig cannot reproduce; no evidence file. Needs a try with an
    empty download queue. [Detail](roadmap-details.md#a-tap-outside-the-ai-models-screen-started-the-queued-downloads-and-left-the-d-pad-stuck-in-the-ollama-tab).
  - **Unshelves when:** a new sighting.

---

# Verdict on `## Done for v0.5.0` (roadmap lines 715 to 738)

**Is each line true? Yes for the seven closed-entry lines.** Checked:
- All eight evidence files named exist in `docs/test-evidence/` (the `plan79-P79-*` files).
- All nine commit hashes in the section exist in git (`5c78fdbc`, `c1efd8e8`, `156baf42`, `17a54809`, `c98f749e`, `945bcd65`,
  `06a22276`, `bd799953`, `49fc8894`).
- All six rows (P79-UP-MIRRORS-DOWN-WORDS, -NEWEST-CLOSED, -DAY-LINE-RING, -UP-MIRRORS-DOWN-SPOILER, P79-CLEAR-BOXES-SAFE,
  P79-BIG-MODEL-BOX-SAFE) read "Done — passed (Deck) 2026-10-02" in `docs/testing.md` lines 310 to 315. Their full entries are
  in `docs/archive/roadmap-bugs-fixed.md`.
- The Plan 70 line's two archive links exist (`archive/roadmap-done-v0.5.0.md`, 1,412 lines;
  `archive/70-kb-wave-four-and-deck-test-wave.md`).

**Two small wording problems:**
1. Line 730 ("With 'N earlier' opened, Up from the chip row…") says the hidden-last-section fault "is filed under Bugs".
   It is not in Bugs any more: line 727 records it as done 2026-10-02 (fix `17a54809`). Reword to "fixed below / above (see the
   Walking Up entry)".
2. Lines 720 to 722 are two long paragraphs about what moved to the archive and when. Under the five-line rule this is
   "release bookkeeping"; the new header needs one sentence, not two paragraphs.

**What does not belong here:**
- The long header text at lines 717 to 722 (the story of which blocks moved when) belongs in the archive file's own top note,
  which already says when each block moved.
- The anchor `done-for-v050` is used by roadmap lines 33, 336 and 459, and `<a id="done-for-v050">` at line 713. If the
  section is renamed, keep an anchor or fix all four.

**Note on the name:** `package.json` says version 0.5.0 and CHANGELOG has `[Unreleased]` above `[0.5.0] - 2026-07-15`. The Done
section says "since v0.4.9 (2026-07-08)", which spans the 0.5.0 release (2026-07-15) and everything since. So the section holds
work shipped after 0.5.0 too. That fits a rename to 0.6.0.

**What the 0.6.0 section should hold (suggestion, for the maintainer):**
- A header that says "Everything closed since v0.5.0 (2026-07-15), up to the 0.6.0 release", pointing to the archive for the full
  record.
- Only the newest closed block (plan 79, the seven lines above) and the Plan 70 pointer line, as now. Everything earlier is
  already in `archive/roadmap-done-v0.5.0.md`. Keep the archive file's name; it is linked from outside the roadmap
  (the plan 80 file and many test rows). The rename should not rename the archive file.
- After the 0.6.0 release, the next release's section starts empty and this one moves whole to the archive.

---

# Notes for the review

1. **Watched sightings in the "parked" file.** The new file is meant for "every parked item". 20 of the 28 are watched
   sightings, not parked work (the roadmap's own wording: "moved to the watch list"). Suggest two headings in the new
   file. The maintainer should confirm (D120 call 3 says they sit "in Shelved"; D123 call 3 says the one file replaces the
   Shelved section).
2. **Glance view has no decision link on the roadmap.** The shelving is recorded inside D97 (locked file line 678), not under
   its own call number. The roadmap line gives none. Proposed entry links D97.
3. **D74's heading is stale.** It reads "five calls locked, one open", but call 6 (the reader voice licences, "Open.") and
   call 11 (non-commercial model output, "Open, raised 2026-09-08") are both still open, and calls 7 to 10 were shelved.
   Not mine to edit; the anchor above still works as long as the heading is not changed. If it is changed, update the link.
4. **Entry 24 (panel stops half way)** needs the maintainer: the archive says twice that whether it stays open is their call.
   No decision is recorded. Proposed wording keeps it watched.
5. **Entry 25** carries an unanswered question (greyed Ask button on the other chat) that the roadmap one-liner dropped.
   Do not lose it.
6. **Entry 16** carries an unanswered question (one chip per press) with no decision recorded.
7. **KB-CANCEL-01** is live in two places and both say "Shelved (D113)": `docs/testing.md` line 220 and
   `docs/testing-manual.md` line 449. When the new file replaces the Shelved list, both say the check "moves to the roadmap's
   Shelved list". Their wording must change to "the parked-work file". Also `docs/roadmap.md` lines 12, 41 and 673 link
   `archive/roadmap-shelved.md`, and the House rules (rule 7, line 41) say parked work lives in "Shelved". Those four spots
   need the new link. Nothing outside `docs/roadmap.md` and the planning files links the old archive file.
8. **Links into the details file** from entries 8, 11, 12, 24, 25, 28 (and the KB long note line 381) use these headings:
   `kb-transparency-matches-what-the-model-got`, `flow-2b-bugs`, `the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach`,
   `a-chat-that-is-still-writing-does-not-look-busy-from-another-chat`,
   `a-tap-outside-the-ai-models-screen-started-the-queued-downloads-and-left-the-d-pad-stuck-in-the-ollama-tab`. Entries 10, 13,
   14, 16 and 26 in the archive also link `flow-l6-findings`, `flow-l7-findings`, `flow-l10-findings`, `l3-and-2d-findings`; the
   proposed entries above drop those links (the evidence link is enough). I did not check that every one of these headings exists
   in `roadmap-details.md`; the helper who writes the details trim must.
9. **Not checked:** LANG-03's own status line in `docs/testing.md` (entry 21), and the claim that the 0.6.0 release notes
   name entries 24 and 26 (no release-notes file in my slice).
10. **Odd tags:** entry 22 is tagged `[focus]` but is a layout measurement of the test setup. Entry 23 is a rig note, not a
    plugin sighting. Neither was changed.
11. Archive entries all carry a redundant `[shelved]` tag next to `[watching]`; the proposed entries drop it.
12. The archive entry for the quick-launch macro and for KB Cancel are tagged **VERIFY** in the archive; neither has a row
    owed to clear (Cancel's row is shelved, the macro's is dropped). The proposed entries use the word "shelved" only.
