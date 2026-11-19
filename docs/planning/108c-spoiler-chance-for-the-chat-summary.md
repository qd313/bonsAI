# 108c — A spoiler-chance rating for the chat's own summary: the plan

**Status: READY for the maintainer's read, 2026-11-19. Planning only; nothing is built.** One finding comes first:
the roadmap's short line no longer says what was asked for in September. Call c1 is which of the two meanings to
build.

**Where to pick up.** Read §§ 1, 2 and 4. Call c1 needs your own word; the other calls have a recommendation, so
"yes to the rest" works. The look is not asked in words: it is picked on mock-up board 7 once its tab is drawn. Then
say "Run plan 108c" in a new chat on the PC. The first step is a test on this PC's AI that decides whether the rest
is built at all.

**Files for this plan:** the briefs, [assets/108c-lane-briefs.md](assets/108c-lane-briefs.md) (one per helper, plus
the test's steps and the mock-up tab); the shared helper rules, [assets/108-helper-rules.md](assets/108-helper-rules.md).
Evidence files: `plan108c-<ROW>.json` in the workshop's test-evidence folder. Its sister plans are 108a to 108g. This
plan's calls are c1 to c8 under decision D145; its checks start with `P108C-`.

**The roadmap entry:** ★★★★ `[ask]` **A spoiler-chance rating for the chat's own summary** — "OPEN, not started
([D118](../audit/maintainer-decisions-locked.md#d118--locked-2026-09-24-raised-2026-09-24--plan-68-the-chat-sums-itself-up-the-calls-from-discovery)
call 14). The chat now sums itself up on its own; rating how likely that summary swept up a spoiler is a later plan
of its own."

Written by a planning chat (Fable 5.2) on `experimental` at tip `28306e896`, from the September roadmap entry (now in
[the archive](../archive/roadmap-completed.md#the-chat-sums-itself-up-instead-of-being-cleared-closed-2026-09-26)),
D118, [workshop plan 68](../../../bonsAI-workshop/planning/68-chat-sums-itself-up.md), the
[spoiler rules](spoiler-constitution.md) and a read of the code as it is today. Plan 68 stays where it is; this file
is the plan for the one piece it left out.

---

## 1. What you would notice when this is done

- **The summary card says how likely it is to hold a spoiler.** The card under "Sum up this chat" (the one headed
  "What the AI remembers") gains a rating: low, medium or high, with one short reason. The reason never names the
  spoiler itself.
- **At high, the card can start covered,** the way a spoiler in an answer does, and one press opens it. Whether it
  does, and how the rating looks, is picked from a drawing.
- **The rating stays with the chat.** When the chat sums itself up again, the rating is carried forward and never
  drops by itself. A new chat starts with none.
- **Nothing gets slower.** The plugin works the rating out by counting things it already saves with each answer. There
  is no extra trip to the AI, so no extra wait and nothing new for Stop to stop.
- **No new setting.**
- **Maybe one thing you would not see:** if the test in step 0 shows the AI repeating a story detail from a risky
  summary, the AI is told to be careful with that summary. That is built only if the number says it is needed.

## 2. What was already written down, and what has gone stale (checked against the code on 2026-11-19)

There was never a plan for the rating itself. What exists is three paragraphs in the September entry, one line in
D118, and plan 68, which built the summary and left the rating out on purpose.

**Still true**

- A hidden spoiler never reaches the summary. Hidden blocks are taken out before the AI reads the chat, and the card
  says how many were left out ("1 hidden note left out").
- Each answer has one spoiler number of its own ("Spoilers: high" under Show details). It is worked out fresh for
  each answer and never looks at earlier turns.
- The rating belongs to one chat and does not follow you into a new one (settled in September).
- The summary is read-only, has no setting, and the note under the answer keeps its locked words (D118 calls 5, 11,
  15 and 20). This plan changes none of that.
- Stop during a summary saves nothing.

**Stale**

- **The meaning drifted.** In September "spoiler chance" was a second number that **looks back over the chat**: if
  one of the last twenty turns touched a boss, this chat is likelier to wander into spoilers, and the summary carries
  that standing forward. D118 call 14 calls it "the look-back rating". The roadmap's short line today says something
  else: how likely **the summary itself** swept up a spoiler. These are two different features. Call c1.
- **The September note said the answer's own number leans about 60 percent on a tag the AI writes.** No instruction
  asks the AI for that tag today, so every number shown comes from the plugin's own guess alone.
- **Six things were built since that change what a rating can count and where it can show:** "spoilers are okay" is
  now saved with each answer (plan 77); boss notes you did not name are marked on each saved answer (plan 70); Hide
  more and Hide less exist (plan 98); an ending question's whole answer sits under one cover (plan 106); the Session
  tab became a chip under Show details (plan 105); the summary card has a fixed height and scrolls (plan 104).
- Every file path in plan 68 moved in October's clean-up, and its evidence moved to the workshop.
- Reading the summary aloud no longer needs a rule: Read aloud was removed.

**Never written down**

- **What the rating is for.** Shown only? A cover on the card? A warning to the AI? September left it at "a second
  number". Calls c2 and c3.
- **How a spoiler can still get into a summary today.** Checked in the code: hidden blocks are removed, but an answer
  written in the open is not. That happens when you said "spoilers are okay", when Hide less was on, or when the AI
  missed a cover. Those words go into the summary like any others. The AI can also add something from its own
  knowledge of the game while summing up; nobody has measured how often.
- "What the look-back counts and how far back it reaches" was left open in September. § 5 and the briefs settle it.
- Summaries written before this is built have no rating. Call c7.

## 3. How it works today

When a chat outgrows the room the AI is given, the plugin takes the older turns, keeps the start of each question
and answer, swaps every hidden block for the words "(a hidden note was here)", and asks the AI for at most ten short
lines. That summary is saved in the chat's own file, with a count of the turns it covers and of the hidden notes
left out. From then on the AI gets the summary plus the newest turns with every question.

You can read the summary on the card under Show details, in the Session view. The card is a stop for the D-pad;
Up and Down scroll its text; A does nothing there today.

The plugin already saves, with every answer: whether you said spoilers were okay, the hidden blocks in its text, the
answer's own spoiler number, which notes were attached, and which of those were boss notes you had not named. So a
rating can be counted from the chat's own file, at once, with no AI involved. The briefs list where each of these
lives ([what the code says today](assets/108c-lane-briefs.md#what-the-code-says-today)).

## 4. Calls for you before anything is built

Nothing below re-asks D118. Two things D118 already settled shape the recommendations: no setting for summing up
(call 5), and "when in doubt, hide more" from the spoiler rules.

**c1. What the rating means.**
(a) **"What the AI remembers of this chat may hold a spoiler."** It rates the summary: it counts what reached it in
the open (an ending answered with spoilers allowed, answers given with "spoilers are okay", a boss named that you
never asked about). Hidden notes do not raise it, because they were left out.
(b) **"This chat leans toward spoilers."** September's look-back: it also counts hidden notes and risky topics, even
when they were kept out of the summary.
(c) Both, as two lines.
**Recommendation: (a).** It is something you can act on, and the card already counts the hidden notes. Picking (b)
or (c) changes one switch in the count, not the plan. **This one needs your word, not a default:** (b) is the wording
on file from September (D118 call 14, "the look-back rating"), and (a) is what the roadmap entry says today. Until
you answer, step A is built so that either works, and nothing is shown.

**c2. How the rating looks and what high does. Needs a drawing first** (board 7, the 108c tab; brief in the briefs
file). The tab shows today's card and four options at low, medium and high: a line in the card's foot; a small tag
in its head; the lines covered at high until A is pressed; and a mix (nothing at low, a quiet line at medium, the
cover at high). It also lets you try three wordings ("Spoiler chance: high", "Spoilers: high", "May hold spoilers").
**My pick to beat: the mix.** Left unanswered: nothing on screen is built; the rating is only saved.

**c3. Should the AI be warned about a risky summary?**
(a) No. The rating is for you only.
(b) Yes: when the rating is medium or high, one sentence goes with the summary telling the AI not to repeat story
details from it unless you ask.
(c) Let the number decide: build (b) only if step 0 finds the AI repeating a swept-up spoiler in 2 or more of 18
tries.
**Recommendation: (c).** The sentence costs well under a second of reading and no extra trip, but it is a change to
what the AI is told, so it should earn its place. Left unanswered: (c).

**c4. Keep open answers out of the summary in the first place?**
(a) No. You chose to see those answers; the summary may keep them, and the rating says so.
(b) Yes: an answer given under "spoilers are okay" is treated like a hidden note when the chat is summed up. The AI
then forgets it gave you that answer.
**Recommendation: (a) now.** (b) is a separate small fix, worth it only if c3's warning does not stop the repeats.
Left unanswered: (a).

**c5. Should the AI also rate its own summary?**
(a) No. The plugin's own count only: free, instant, and a test can pin it.
(b) One more line in the same request, the way the chat title offer rides along. No extra trip, about a second more,
but it changes the summary wording that was tested in September, and a small model rating itself is unproven.
(c) A second trip to the AI: roughly 5 to 15 seconds more with a game running, and Stop must cover it.
**Recommendation: (a); (b) only if step 0 fails with the count alone; never (c).** Left unanswered: (a).

**c6. A setting?** **Recommendation: none**, the same as D118 call 5. One setting costs about 18 files.

**c7. Chats that were summed up before this is built.**
(a) Show no rating until the chat is summed up again. (b) Work one out when the chat is opened.
**Recommendation: (a).** Left unanswered: (a).

**c8. Can a chat's rating go down?**
(a) Never by itself: it stays at the highest it reached, and a new chat starts clean. (b) Worked out fresh each time.
**Recommendation: (a).** The older summary is folded into the new one, so what it held may still be there. Left
unanswered: (a).

## 5. The build, in order

| Step | What a person gets | Stars | Who builds it | Waits on | Proved by |
|---|---|---|---|---|---|
| **A** | Nothing yet: the count itself, as a piece nothing uses | ★★ | Sonnet high helper | (starts at go) | its own tests |
| **S1** | Nothing yet: twelve hand-written test chats and the script that sums them up on this PC's AI | ★★ | Sonnet high helper | (runs beside A) | its own tests |
| **S2** | Nothing yet: the script that asks follow-ups in a chat with a risky summary | ★★ | Sonnet high helper | S1 | its own tests |
| **0** | **The test to find out.** The session runs S1 and S2 on this PC, about an hour | | the session | A, S1, S2 | P108C-RULE-01, P108C-HIDDEN-00, P108C-REPEAT-01 |
| **M** | The 108c tab on board 7, for call c2 | ★ | Opus helper, medium or high | (any time) | your pick |
| **B** | The rating is saved with each new summary | ★★ | Sonnet high helper | step 0 passed | its own tests |
| **C** | The rating on the card, as picked | ★★★ | Opus extra-high | B, your pick on M, a fresh read of the card on the Deck | P108C-CARD-HIGH, -LOW, -DPAD |
| **D** | The AI is careful with a risky summary | ★★ | Sonnet high helper | only if step 0 says so (c3) | P108C-REPEAT-02 |
| **K** | Roadmap, test rows, changelog | ★ | the bookkeeper | each landing | |

**Step 0 in one paragraph.** Twelve short hand-written chats. Six are risky: an ending answered with spoilers
allowed, one under Hide less, boss answers given with "spoilers are okay", boss fights described with nothing
covered, a chat that carries an older high rating, and one where only the AI itself could add the spoiler. Six
should rate low: troubleshooting, a no-story game, a story game where every spoiler was covered, a boss you named
yourself, a spoiler you typed yourself, a mixed chat. Each is
summed up three times on this PC's copy of the Deck's AI, 36 summaries. For each, the script checks whether a listed
spoiler phrase shows in the summary and what the count rated it; the session reads all 36 by hand as well.

**The lines, set before anything is measured:**

- **Misses.** A summary that holds a spoiler phrase but is rated low: at most 1 in 10, and none at all on the two
  ending chats.
- **False alarms.** Of the 18 summaries of the six clean chats, at most 3 rated medium or high.
- **Hidden text.** No summary holds a word from a hidden block: 0 of 36. One or more means a fault in what ships
  today; stop and report it first.
- **Repeats (decides step D).** With a risky summary in the AI's memory, three plain follow-up questions, three
  tries each, in two chats: 18 answers. A spoiler phrase outside a cover in 0 or 1 of them: D is not built. In 2 or
  more: D is built and must bring it to 1 or fewer.

**What each result leads to.** Both of the first two lines met and no hidden text: build B, then C. A miss on either
line: one change to the count, measured again on fresh tries. A second miss: stop and bring the numbers; the AI's own
rating (c5 b) is tried only if you said yes to it. A, S1 and M can start at go; nothing a player sees is touched
until step 0 has passed.

## 6. The checks

**On this PC, no Deck** (step 0): **P108C-RULE-01** (the two lines for misses and false alarms), **P108C-HIDDEN-00**
(no hidden text in any summary), **P108C-REPEAT-01** (the repeats count), and **P108C-REPEAT-02** only if step D is
built.

**On the Deck, by the rig**

| Row | What is pressed | What must be seen |
|---|---|---|
| **P108C-M-CARD** (before step C) | Place the "risky" test chat, open it, Show details, the Session chip, Sum up this chat | A measurement only: where the card's edges and the dock sit on today's build |
| **P108C-CARD-HIGH** | The same, on the new build | The rating reads high with its reason; the reason names no boss and no ending; the card is covered if that was picked |
| **P108C-CARD-LOW** | The "clean" test chat, summed up | Low, shown the way the pick says (or nothing) |
| **P108C-CARD-DPAD** | Ring onto the card, A, Down to the end, Up to the top, Down past it | A opens a covered card and the ring stays on it; every stop is fully visible above the dock; no stop is visited twice |
| **P108C-OLD-CHAT** | Open a chat that was summed up before the build | The card as it was, no rating, nothing broken |
| **P108C-STOP** | Sum up, then Stop before it finishes | No summary and no rating are saved; the next try works |

Step C is a Main-tab change, so it also owes the free-play sweep (**QA-FREE-PLAY-01**) and the look check
(**QA-LOOK-01**) on the Session view, on both screens.

**Only you can do these** (for the "checks only you can do" page)

- **P108C-EYES-01.** On a long chat of your own, press Sum up this chat. Does the rating match what you remember of
  that chat?
- **P108C-LOOK-01.** The card at high on the Deck's own screen: is the tag easy to read, and is the cover clearly a
  cover?

## 7. What could go wrong, and what stops the work

- **A rating that cries wolf, or one that gives false comfort.** That is what step 0's two lines are for. When
  unsure the count rates higher, never lower.
- **The reason line gives the spoiler away.** The reasons are a short fixed list of sentences. None can carry a
  name, and a test holds that.
- **The AI adds a story detail of its own while summing up.** Counting what went in cannot see that. One check can:
  does the summary name a boss from your notes that you never typed? Step 0 counts how often it happens.
- **The summary's instruction is touchy.** Its wording was tuned in September and the code says not to change it
  without re-running that test. No step here changes it; only c5 (b) would.
- **The card is tight on the Deck's own screen.** At its tallest it uses 281 of the 299 points there. A tag or a
  cover must fit inside that, so step C waits for a fresh measurement and is built by Opus, with a second opinion
  before it lands.
- **Another chat is fixing bugs in this checkout today (plan 107).** It may move the "summed itself up" note under
  an answer, which is a roadmap bug of its own. This plan does not touch that note. Step C starts only after plan
  107's fixes are in.
- **What stops the work:** hidden text in a summary (report first); step 0 failing twice; or the card not fitting on
  the Deck's own screen with the look that was picked (back to the board).

## 8. Not in this plan

- Changing what an answer covers, or the answer's own spoiler number.
- The note under an answer that says the chat summed itself up, its words or its place.
- A rating for a chat that has never been summed up. The count is written so it could do that later.
- Editing the summary, a setting, a warning before summing up (all settled in D118).
- Keeping open answers out of the summary (call c4 b), unless you pick it.
- Marking on each new answer that Hide less was on. Today that is not saved in a form the count can trust, so a
  story answer given under Hide less is only caught when it answers an ending question.
- The knowledge base and its notes.

## 9. For the one running the session

- **First acts at go.** Read the usage counters. Fetch, then run `git status` and list the planning folder for other
  chats' files. Re-check every line number in the briefs against the tip; plan 107 will have landed in between. Check
  which model tag the Deck loads today and use it on this PC for step 0. Hand the bookkeeper the answered calls for
  D145.
- **Model.** Opus at extra-high plans and lands (the routing table's three-and-four-star row). Helpers are Sonnet
  high. Step C is Opus extra-high after the Deck measurement. The Deck rows go to the deck-driver helper.
- **How many at once.** A, S1 and M together at go; S2 when S1 has landed; then B; then C; D last if needed. Never
  more than three at once: it is a small plan. About seven helper runs, two bookkeeper runs and one Deck block.
- **Reviewers.** No new disk read, permission, download or dependency, so neither reviewer is required. Ask the
  second opinion once, before step C lands (a D-pad and layout landing).
- **The bookkeeper gets:** the calls as answered; one open row per check in § 6; the roadmap entry marked PARTIAL
  when B lands and moved to Verify, naming its rows, when C lands; a changelog line with C.
- **At the end, the two write-ups the maintainer asked for:** the code-work summary (files changed, what was
  unexpected, what would have made it easier), and a plain "how it was built" guide to the rating.
- **Stars.** The roadmap says four. With no extra trip to the AI, no setting and no new stop for the D-pad, three is
  closer. The entry is left as it is; say so in the report.
