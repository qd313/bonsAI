# 38 — The answer's first lines in the reply-ready toast

Written 2026-09-05, before any code. The maintainer picked this as the first of six features to plan and
asked for a plan first: what a person gets, what has to be measured before anything is built, what they
have to decide, how it is built, and how it is proved on the Deck. The decisions are **D63** in
[maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md). Nothing in § 6 starts until
they are answered and § 3 has run.

Read first: [CLAUDE.md](../../CLAUDE.md); the model and effort table in [AGENTS.md](../../AGENTS.md) § 3;
[13-roadmap-feature-ideas.md](../archive/13-roadmap-feature-ideas.md) § C3, where this slice was first drawn;
[35-bugfix-session.md](35-bugfix-session.md) and [36-feature-session.md](../archive/36-feature-session.md), the two
sessions running today, for what they own and who holds the Deck.

**One sentence:** when an answer finishes while the menu is closed, the small notification that today
says only *Reply ready* would show your question and the first lines of the answer, so a short answer is
read without leaving the game.

**Mockup:** [Reply Toast Options](https://claude.ai/code/artifact/0590a00d-d48b-42ce-85be-0376c1bddf53). Five title
options drawn in the two-slot shape Decky really uses, with the time on screen and the box size to play with,
and a table of what is known from the code against what is assumed until measured. **Picked from it on
2026-09-05: the title is *bonsAI*, the time on screen is eight seconds.** Every call is now locked; see § 5.

**The maintainer's warning, same day:** Steam's popup probably gives less room than the mockup assumes. So the
measurement in § 3 is not optional and not a guess: two screenshots on the device decide the size, one on the
Deck's own screen and one on a 24-inch 1080p monitor, because Steam may size the popup differently on each.

---

## 1. What is true right now (checked 2026-09-05, nothing changed)

- **The toast exists and is small.** When an answer finishes and the bonsAI panel is not on screen, a
  Steam notification appears reading *Reply ready* over *Tap to open*, stays four seconds, and a tap
  opens the panel on the answer. A failed Ask shows *Ask failed* with the first 120 letters of the
  error for five seconds. Stopping an Ask shows nothing. Each answer toasts at most once, and a new
  toast replaces the old one rather than stacking.
- **Nobody has recorded seeing it on the Deck.** Its five test rows were archived unchecked on
  2026-07-30, and the one live row that mentions it is still unchecked. Whether it shows over a
  running game, where, and how much text fits, is not known. Decky draws it through Steam's own
  notification system, and there is no local copy of Decky's code to read the limits from. **This is
  the first thing to settle, and it is a measurement, not a decision.**
- **The status the toast reads carries the full answer text, the question, the game id, the branch menu
  and checklist if any, and the spoiler-consent flag.** It does not carry the Ask mode, and since the
  maintainer chose every mode alike (§ 5), it does not need to: the text alone decides what is shown.
- **An answer can contain four kinds of fenced block:** a hidden spoiler, a branch menu, a checklist,
  and a citation. The branch menu is normally removed from the text before it is stored, but when the
  model garbles it the fence stays in the text. Spoiler fences are not Strategy-only: a Speed or Expert
  answer gets the fence instructions too when knowledge-base cards attach.
- **The Copy button already has the rule this needs.** It never copies a still-hidden spoiler; it swaps
  the block for a placeholder. The same rule applies here, stricter: the preview does not appear at all.
- **Three sessions share this checkout today.** The bug session holds the Deck; the feature session is
  queued for it next. The three toast files are owned by neither, and no backend file changes, so this
  can be built on a lane of its own whenever it is picked up.

## 2. What a person gets

You are playing. You asked something in Speed mode, closed the menu, and kept playing. The answer
finishes. A notification appears with your question as its title and the first lines of the answer
under it. If the answer was short, the notification *is* the answer, and you never open the menu. If it
was long, you read how it starts and tap to open the rest, as today.

Every mode gets the same treatment, best effort. A Strategy answer's branch menu and any hidden block are
left out, and the first lines of what remains are shown; if nothing safe remains, today's notification
shows instead. The failure notification and the no-notification-on-Stop rule do not change.

## 3. Measure first, on the device, two screens, with screenshots

About thirty minutes, when the Deck is free. **Both screens, every time:** the Deck's own 1280 by 800 screen,
and a 24-inch 1080p monitor with the Deck docked. Steam's popup may not be the same size on both, and the
maintainer expects it to be smaller than the mockup draws it. A screenshot of each is the evidence, taken
with the capture helper rather than Steam's own screenshot key, which records the game and not Steam's
popups. Pictures go under `screenshots/`, readings under `runs/`, both named in § 10.

| # | Question | How |
|---|---|---|
| M1 | Does the toast show over a running game at all, and where? | Game running, an Ask from the panel, close the menu, keep the game in front. Screenshot when it appears. Read its box from the page as well. |
| M2 | How much text fits before it clips, in the title and in the body? | Fire a toast whose body is a counting string and whose title is a long known string; screenshot; read where each cuts and how many lines the body shows. |
| M3 | Does eight seconds hold, and what does the popup cover? | Fire one at eight seconds; time it; note what part of the game it sits over. |

Run M1 to M3 on the Deck's screen, then dock it and run them again on the monitor. The two answers to M2 are
the numbers the text helper is built to; if they differ, the helper takes the smaller.

**If M1 fails, the entry is blocked on Steam's notification behaviour, the roadmap says so, and nothing
is built.** If M2 shows one line, the feature becomes "the first line" and the roadmap entry says that.
Nothing in § 6 is sized until M2 has its two numbers.

## 4. The rules

Locked on 2026-09-05 unless a rule says otherwise; the calls behind them are in § 5.

1. **Which answers get the preview:** every mode, best effort. Strategy is not excluded; its menu and hidden
   blocks are simply left out of the preview.
2. **What is left out, in every mode:** every fenced block, whatever its label (hidden spoiler, branch menu,
   checklist, citation, code), is dropped before the first lines are taken. A spoiler block is dropped even
   when the screen would show it open because you named the thing. If nothing safe is left, the person sees
   exactly today's toast. Leaving out is the safe direction, so every doubt resolves to it.
3. **What text is shown:** the answer with the internal tags removed, the markdown turned to plain text
   (no stars, hashes, bullets, links or code marks), whitespace collapsed, cut at a word boundary to the
   budget M2 measured, with an ellipsis when cut. A whole answer that fits is shown whole.
4. **The title:** *bonsAI*, picked 2026-09-05 from the five drawn in the mockup. "For now", in the
   maintainer's words, so it can change once the real box has been seen.
5. **How long it stays:** eight seconds, picked 2026-09-05. Tap to open is unchanged.
6. **No backend change.** Every mode is treated alike, so the toast does not need to know the mode; the
   answer text alone decides what is shown.
7. **No new setting, and no extra guard for story games.** The toast already exists and already shows over
   the game; only its words change. Both can be added later without undoing anything.

## 5. What the maintainer decided — D63, locked 2026-09-05

Answered in chat the same day the plan was written.

1. **Which modes:** every mode, best effort.
2. **The title:** *bonsAI*, for now. Picked from the mockup linked at the top.
3. **Time on screen:** eight seconds. Picked from the same page.
4. **A setting:** none for now, always on.
5. **A guard for story games:** not yet.
6. **The Deck queue:** not queued. The entry sits in the roadmap, ready to implement later; the measurement
   in § 3 runs first when it is picked up.

## 6. Build steps, when this is picked up

One thing per commit, all four gates green between commits. No backend file changes, so the whole thing
fits one lane. Two numbers come from § 3 first: how many characters fit, and how many lines.

| Step | What lands | Who | Waits for |
|---|---|---|---|
| 1 | A pure text helper: answer text in, preview text or nothing out. Tests: internal tags removed; every fence kind dropped, including one that would show open on screen; markdown flattened; long text cut at a word with an ellipsis; short text returned whole; only-a-fence and empty text return nothing. | Sonnet 5 high lane | the two § 3 numbers |
| 2 | The toast uses it. Tests: a plain answer shows the chosen title and the preview; an answer that is all hidden shows today's toast; a short answer shows whole; the duration is the chosen number; tap still opens the panel; dedup and failure paths unchanged. | same lane | step 1 |
| 3 | Docs: the roadmap entry moves to Verify naming the rows below; the rows join the manual test doc; a changelog line. | the session's own driver | step 2 |
| 4 | The Deck rows in § 7. | whoever holds the Deck, Opus xhigh reads the results | step 3 and a free Deck |

Effort is two stars, so by the routing table the plan is done in-session, a Sonnet lane builds, and
Opus at extra-high effort lands it because it touches the reply path.

## 7. Proving it on the Deck

Rows go in the manual test doc when step 4 lands. Titles come from the test title pool.

- **TOAST-PREVIEW-01** Deep Rock Survivor running, Speed, a fence-free question, menu closed before the
  answer finishes: the toast shows the question as title and the answer's first lines; tap opens the
  panel on that answer.
- **TOAST-PREVIEW-02** Same, Strategy: the toast shows the first lines of the answer's text; the branch menu
  and any hidden block are absent from it.
- **TOAST-PREVIEW-03** A story game, Strategy, knowledge base on, a question that invites a hidden block:
  the words around the block show, the hidden words appear nowhere on the toast; if the answer is nothing
  but the block, the toast is today's.
- **TOAST-PREVIEW-04** A question with a one-line answer: the whole answer is on the toast, no ellipsis.
- **TOAST-PREVIEW-05** A long answer: the body ends at a word with an ellipsis, nothing is cut mid-letter
  by the box, and the title reads *bonsAI*. Run on both screens; a screenshot of each.
- **TOAST-PREVIEW-06** Menu open on the Settings tab when the answer finishes: the toast still appears
  (the panel is not showing the answer), with the preview.
- The five archived rows for the original toast are folded in: M1 is the first of them, and 02 to 05 run
  as written on the day.

**Frozen chips.** The standing rule: before anyone types on the Deck, the questions are shown to the
maintainer, confirmed, then pinned as frozen test chips. Proposed batch, to confirm before pinning:
*how do i kill the big armoured bug boss* (row 01, Deep Rock Survivor); *what does the pickaxe do*
(row 04, one-line answer); *how does the story end* (row 03, Red Dead Redemption 2); *give me ten tips
for a new player* (row 05, a long answer). Row 02 reuses the first sentence in Strategy.

This is not a Main-tab layout change, so the free-play sweep is not owed by it.

## 8. Risks, and what to know

- **A spoiler the model did not fence would show over the game.** The same words would show in the panel
  today, but now without the person opening it. The story-game guard was declined for now (§ 5); revisit if
  a leak is ever seen.
- **Anyone watching the screen reads the answer.** Accepted for now, no setting (§ 5).
- **Steam's own notification settings may hide in-game notifications entirely** for some people. M1
  tells us whether the default shows it; the troubleshooting doc gets a line either way.
- **Character voices.** With a character on, the first lines may be flavour before the answer. Accepted;
  the person chose the voice.
- **The text budget is measured, not guessed, on two screens.** The maintainer expects the box to be smaller
  than drawn. If it is, the feature shrinks to fit and the roadmap entry is reworded rather than the text
  squeezed; the helper is built to the smaller of the two screens' numbers.
- **Nothing touches the backend**, so no contention with the sessions running today.

## 9. Out of scope

A persistent overlay over the game; reading a whole long answer from the toast; a toast for a partly
streamed answer; a setting, and a story-game guard, both declined for now; any change to the
failure toast or the no-toast-on-Stop rule; changing where Steam places its notifications.

## 10. Progress log

Written as work lands.

- **2026-09-05** — Plan written. D63 raised. Roadmap: the toast slice split out of **In-game answer
  surface** as its own ★★ entry. Nothing built, nothing measured.
- **2026-09-05, later** — D63 locked: every mode, no setting, no story guard, not queued. The mockup page
  for the title and the time on screen was published and linked above. Owed: the maintainer's pick of title
  and seconds from that page. Nothing built, nothing measured.
- **2026-09-05, later still** — Title *bonsAI* and eight seconds picked; the mockup now opens on them. The
  maintainer expects Steam's popup to be smaller than assumed, so § 3 became a two-screen measurement with
  screenshots: the Deck's own screen and a 24-inch 1080p monitor. The plan's commits moved to the
  experimental branch at the maintainer's request; copies remain on the feature session's branch.
