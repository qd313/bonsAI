# 108 — Seven feature plans, 108a to 108g: the front page

**Status: READY for the maintainer's read, 2026-11-19. Planning only; nothing is built.** Seven roadmap features were
planned in one chat, each in its own file. Every one was checked against the code as it is today, and where older
planning existed it was checked for what had gone stale. This page is the way in: the list, what the seven share, and
an order to run them in.

**Where to pick up.** Pick a plan from the table and read its §§ 1 and 4. Answer its calls, or say "yes to all" to
take every recommendation. Then say "Run plan 108b" (or whichever letter) in a new chat on the PC. Calls about what
you see or press are not asked in words: they wait for a drawing on mock-up board 7, which is the first thing to
build.

Written by a planning chat (Fable 5.2) with seven helpers on `experimental`, at tip `28306e896`. Plan 107 (the bug and
owed-checks sweep) was written the same day by another chat and landed while these were drafted.

---

## 1. The seven plans

| Plan | What you would get | Stars | First step, a test to find out | Calls | Drawn first |
|---|---|---|---|---|---|
| [108a](108a-smoother-dpad-scrolling.md) | On the long tabs the page slides to its new place and no longer jumps | ★★★ | On the Deck: does Steam leave a drawn slide alone, and what it costs in frames | 4 | 1 tab |
| [108b](108b-keep-alive-and-smart-unload.md) | A starting game gets the AI's memory back; the Ollama tab says what happens | ★★★ | On the Deck, about an hour, no new code: a cold start timed against a warm one beside a game | 7 | 1 tab |
| [108c](108c-spoiler-chance-for-the-chat-summary.md) | The summary card says how likely it is to hold a spoiler | ★★★ | On this PC's AI: twelve hand-written chats, summed up three times each | 8 | 1 tab |
| [108d](108d-steam-input-layout-parse.md) | Answers name your own buttons, read from the layout Steam saved for the game | ★★★★ | Eleven real layout files copied off the Deck and read by a throwaway script | 8 | 2 tabs |
| [108e](108e-finish-the-controller-test-rig.md) | A night report of every tab walked; films of checks; perhaps a Deck that can be woken | ★★★★ | On the Deck: what a recording costs, reading the ring from a picture, ways to wake | 8 | none |
| [108f](108f-steamos-share-path.md) | A screenshot you just took is offered by the question box; one press attaches it | ★★★ | On the Deck: how fast the newest screenshot is found, and the real Share menu | 4 | 1 tab |
| [108g](108g-wake-word-listening.md) | Say the wake word and your question with your hands on the controls | ★★★★★ | A session of Deck tests, three of them with your own voice and hands | 9 | 3 tabs |

Each plan has a briefs file beside it for the helpers who build it, in [assets](assets/): `108a-lane-briefs.md` to
`108g-lane-briefs.md`.

## 2. What the check against older planning found

- **108a.** No older plan. The roadmap's "related Verify item" closed on 16 October. The jump is there on purpose:
  bonsAI moves the page at once so that Steam does not add a move of its own. Nobody has tested a drawn slide.
- **108b.** No older plan, and most of the idea is already built: the hold-time slider, the one-minute rule beside a
  game, the low-memory warning. The roadmap entry now says PARTIAL. What is left is small.
- **108c.** No older plan. The meaning drifted: September asked for a rating of the whole chat, the roadmap line asks
  for a rating of the summary. The plan's first call is which one you want.
- **108d.** No older plan. "What each button does" is true only for games that name their own actions. Many games on
  the Deck have no saved layout at all, so there is nothing to read for them.
- **108e.** [Plan 19](19-controller-macro-test-rig.md) is the older plan and parts of it are stale; it now carries a
  note saying which. Bluetooth runs have lost their reason. The night run is the piece to build first.
- **108f.** No older plan. Steam's own Share screen gives a plugin no way in, so the faster path starts at the
  screenshot itself.
- **108g.** The August study still says "yes, with conditions", but the conditions changed: its engine pick now looks
  too costly, and a kind of engine it never weighed is the one to test first.

## 3. What the seven share

- **The rules every helper reads:** [assets/108-helper-rules.md](assets/108-helper-rules.md). It keeps the rules of
  plans 103, 105 and 106 and adds this year's lessons.
- **One decision number, D145,** for all the calls: a1 to a4, b1 to b7, and so on to g9, forty-eight in all. Nothing
  is filed until you answer; the bookkeeper files each plan's calls at its go.
- **Check names** start `P108A-` to `P108G-`. Evidence files are named `plan108a-<ROW>.json` and so on.
- **Mock-up board 7** is kept for these plans: nine tabs in all (108a one, 108b one, 108c one, 108d two, 108f one,
  108g three). Its folder does not exist yet. Each tab's brief is the section named M, or "Mock-up board 7", in that
  plan's briefs file. By the house rule of 2026-11-19 Opus draws them, at medium or high; Fable if you ask.
- **The session that runs any of them** is Opus at extra-high. Helpers are Sonnet, and each screen or D-pad lane is
  Opus after a measurement on the Deck.

## 4. A suggested order

1. **Draw board 7.** It needs no test and no answer, and six of the seven plans wait on a pick from it.
2. **One Deck evening of tests that need nothing built:** 108b (about an hour), 108a, 108f, 108e, and the file copy
   for 108d. One driver at a time. Plan 107's session wants the Deck too, so take turns.
3. **Start the building that needs only "go":** 108e's night run first, since the test rig is your priority 1 and
   the night run then checks everything that follows. Beside it: 108b's small lanes, 108c's count and its test on
   this PC, and 108d's back-end pieces once its test says go.
4. **Screen work last,** each piece after your pick on the board and a Deck measurement: the slide (108a), the
   rating on the card (108c), the screenshot offer (108f).
5. **108g by itself.** Its tests are a session of their own and need you at the Deck. Its build is a second session,
   only if the numbers pass.

**How much it is.** All seven come to about sixty-five helper runs plus the Deck blocks. One five-hour usage window
carries about twenty-five runs, so this is three sessions or more, not one evening. The smallest is 108a, about four
helper runs. The largest is 108g, fourteen to eighteen over two sessions.

## 5. If more than one runs at a time

- **Busy files.** Lanes from different letters meet in a few files: the plugin's main back-end file, the file that
  runs a question from start to finish, and the row above the question box. Land one at a time, and re-read the
  second against the first.
- **108a before 108f's walk.** 108a changes how a page moves when the ring moves. Run 108f's Main-tab walk after
  108a has landed.
- **Plan 107** fixes bugs in some of the same places. Each plan's § 7 names where they meet.

## 6. Things for you to weigh that this plan did not change

- **Stars.** 108c and 108f were moved from four stars to three on 2026-11-19, on the maintainer's word: neither
  needs an extra trip to the AI, a new permission or a new setting. 108d stays at four until its switch is picked:
  three if it uses the switch you already have, four if it gets a new one.
- **Three stale lines found on the way were corrected the same day** (2026-11-19), each with its evidence named. The
  roadmap's stand-in Decks entry said "nothing built", but this PC has been a working stand-in since October. The
  Voice row in the testing page read as if voice typing had never passed on the Deck. And the long notes said a
  saved walk names the screen it starts from, which it does not.
- **Room in the documents.** After the seven links went in, the roadmap was within 34 characters of its size limit.
  Finished work then moved to the archives, word for word, the same day: the roadmap now sits at 81.5 KB of 100, the
  long notes at 74.5 KB of 100, and the testing page at 160.0 KB of 165. No open entry or open check was touched.
