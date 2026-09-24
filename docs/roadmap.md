# bonsAI Roadmap

> **Clean-up task — trim this file. Done 2026-09-15.** The other four big documents each carry their own trim
> task at the top; the roadmap entry that tracks all five is under Features.
>
> Reading this now costs roughly **19,000 tokens**, and the house rules say it is read before any work is marked
> done, so that cost lands on every piece of work. Together with the testing rows, trimming both saves about
> **31,000 tokens per landing**.
>
> **100 KB down to 83 KB.** 2026-09-13: the finished list moved to the archive. 2026-09-14: the parked entries moved
> to their own file, the old decisions under *Calls waiting on you* dropped to a pointer, the longest entries reworded,
> and six finished items moved to Done and archived. 2026-09-15: a seventh finished item split so the part that still
> fails stays visible, the knowledge-base opening stopped quoting numbers it then retracts, and the three longest
> entries sent their reference detail to the details file.
>
> **What is left is not worth taking.** Thirty-four entries still run past five lines, but most by only a line or
> two, and the ones that run long are long because the work is. Grinding those down would cost more in understanding
> than it saves in tokens. The bigger wins are now in the other four files, each with its own trim task at the top.

Open bugs, work fixed but not yet confirmed on the Deck, planned features, parked work, and what shipped for v0.5.0. Five
lists plus one section for the knowledge base, each sorted from one star to six.

- **Knowledge base and RAG, all in one place:** [its own section](#knowledge-base-and-rag) — bugs, owed checks, next steps
  and the calls waiting on the maintainer, with [a status report](planning/37-rag-status-report.md) kept in step with it.
- **Long notes for open items:** [roadmap-details.md](roadmap-details.md)
- **Shipped features, full detail:** [archive/roadmap-completed.md](archive/roadmap-completed.md) · **Fixed bugs, full detail:** [archive/roadmap-bugs-fixed.md](archive/roadmap-bugs-fixed.md)
- **Parked work, full detail:** [archive/roadmap-shelved.md](archive/roadmap-shelved.md) — one line each in [Shelved](#shelved).
- **What shipped for v0.5.0, one line each:** moved out to its own file to keep this one small — [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).
- **Maintainer decisions (D1 onward):** [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md)
- **QA rows and device evidence:** [testing.md](testing.md), [testing-manual.md](testing-manual.md) · **Release notes:** [CHANGELOG.md](../CHANGELOG.md)
- **Checks only the maintainer can do** — the standing list, kept as a tickable page:
  [Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
  Anything a session finds that needs their eyes or their fingers is added there, not left in a chat.

## House rules for this file

1. **An entry is at most five lines**, in plain language, and says what a user would notice. Anything longer goes to
   [roadmap-details.md](roadmap-details.md) (open) or [archive/](archive/) (finished) and is linked, never deleted.
2. **Three lists for live work: [Bugs](#bugs), [Features](#features), [Verify](#verify)** — except knowledge-base work,
   which keeps its bugs, owed checks and plans together in [Knowledge base and RAG](#knowledge-base-and-rag). A new entry goes
   straight into the right list at its star position (ascending; within a star band by tag, then by title) with a tag. Do not
   add sub-headings beyond Verify's own **Bugs** / **Features** split and the knowledge-base section's own lists.
3. **Status words in Bugs and Features:** **OPEN** (nothing built) · **PARTIAL** (some of it built) · **ACCEPTED** (the
   maintainer chose to live with it). Nothing else — as soon as something is fixed and unit-tested, it moves to **Verify**
   rather than taking a fourth status word.
4. **When code lands that fixes a Bugs entry or ships a Features entry, but a Deck check is still owed:** move the entry, in
   the same commit, out of Bugs or Features and into Verify's matching sub-list (name the QA row). **When the Deck check
   passes:** move it again, same-commit, into [Done](#done-for-v050) as one line, with the full entry going to the matching
   archive file. Never leave a finished item sitting in Bugs or Features, and never mark one with a strike-through.
5. **Stars** are effort and risk on the GTA scale: `★` easiest … `★★★★★` very high; `★★★★★★` extreme scope.
6. **Tags:** `[ask]` Ask bar and input · `[chat]` chat slots · `[chips]` preset chips · `[focus]` D-pad and focus ring ·
   `[KB]` knowledge base · `[layout]` Main tab layout and vertical space · `[ollama]` models and routing · `[perms]` permissions ·
   `[platform]` build, deploy, tooling, upstream · `[QA]` testing · `[reply]` the answer itself · `[tabs]` the tab bar ·
   `[ui]` everything else on screen · `[voice]` voice.
7. **Parked work lives in [Shelved](#shelved)**, not in Bugs or Features: one line saying what unshelves it, with the
   full entry in [archive/roadmap-shelved.md](archive/roadmap-shelved.md). Move the whole block back when it restarts.

**Every Main-tab UI change also owes the free-play sweep** (standing row **QA-FREE-PLAY-01** in
[testing-manual.md](testing-manual.md)): walk the pane like a user and require every focused stop to also be visible.

**Maintainer note (2026-09-05): pick the model before you pick up an item.** ★–★★ Sonnet 5 high · ★★★–★★★★
Opus xhigh plans, Sonnet lanes implement when the cause is known · ★★★★★+ Fable max plans only, Sonnet lanes build,
Opus xhigh lands · `[focus]` `[layout]` `[ui]` measure on the Deck first, then Opus xhigh, never a lane without the
measurement · docs and bookkeeping Sonnet or Opus medium. The full policy — the bookkeeper guard, the escalation rule,
the Haiku trial — is in [AGENTS.md § 3](../AGENTS.md), the evidence in
[planning/33-model-routing.md](planning/33-model-routing.md). A prompt-time hook gives a gentle heads-up when a session
starts work outside this.

---

## Bugs


- ★ `[focus]` **Down does not move the ring off an unrevealed spoiler block** — **OPEN, found 2026-09-04, did not reproduce
  2026-09-05.** With the ring on the hidden block, Down reported the press arriving and nothing moving. Retried today on a fresh
  Red Dead ending reply with a real hidden block on screen: **Down left it normally**, straight onto the branch picker's first
  button, and every stop on the walk was fully visible. So the hidden state does not trap on its own. Most likely the same
  underlying fault as the stuck panel below — both are a hop that dies only sometimes — and best closed with it rather than
  chased separately. Evidence `docs/test-evidence/round35-spoiler-block-down-and-up.json`. **Next thing to try
  (2026-09-18):** the panel-trap entry below now has a known trigger, opening and closing Steam's own on-screen
  keyboard on the question box — worth trying on this hidden-block case too.
- ★ `[focus]` **Walking down a reply and walking back up visit different stops** — **OPEN, re-measured on
  the Deck 2026-09-23.** With the details panel both closed and open, going down visits the question row and
  the question box, but going up skips both and stops instead on Attach screenshot and Choose AI character;
  everything else matches. A 22-line answer section shows only a third of itself on landing because the
  question box covers it — expected for a section taller than the screen, not a new fault. Row
  **REPLY-STOPS-MIRROR-01**. Evidence `docs/test-evidence/plan64-REPLY-STOPS-MIRROR-01.json`.
- ★ `[focus]` `[layout]` **Entering the Show details chip ladder at its first chip leaves the chip row and
  its "Chip 1 of 7" counter above the visible area** — **OPEN, found on the Deck 2026-09-23.** Measured only
  67% of the chip row visible at chip 1, 67% at chip 5, and 33% at chip 7 — at chip 1 a person cannot see
  which chip is lit. Evidence `docs/test-evidence/plan64-DETAILS-LADDER-01.json` (+ `.png`).
- ★ `[focus]` `[layout]` **Show details' chip ladder hides under the question box** — **OPEN, found on the
  Deck 2026-09-23.** Walking Down through the ladder, the ringed chip read 33% to 67% visible at several
  steps, covered by the question box or by the chip row itself; a person can only reach the row of chips by
  stepping through all six or seven of them rather than landing straight on one that is fully in view. The
  maintainer's proposed cure is the new Features entry **"While reading an answer, the Show details line
  takes the suggestion chip's place above the question box"**, above. Evidence
  `docs/test-evidence/plan64-DETAILS-LADDER-01-try2.json`.
- ★ `[QA]` **The walk check calls a stop hidden when a corner icon merely overlaps its box** — **OPEN,
  measured on the Deck 2026-09-21.** It judges a stop by sampling its rectangle, so the question row and the
  last answer section always read part-hidden behind the Retry and Copy icons — though the words clear those
  icons by design. Measured: the question's text starts 6px past the Retry icon's edge; the answer's last
  line clears the Copy icon and only its line spacing touches it. Two entries were filed on this and withdrawn
  the same night, and the question-row entry has now been opened and closed twice on it. Until the check reads
  text rather than boxes, measure the text before filing. Evidence
  `docs/test-evidence/plan63-CORNER-ICON-COVERAGE-01.json`.
- ★ `[layout]` **A thin strip of the answer shows through below the game-context line at the bottom of the
  Main panel** — **OPEN, found on the Deck 2026-09-23.** Visible in
  `docs/test-evidence/plan64-BYEYE-01-chat-row.png`, between the dock and Steam's own bottom bar.
  **Sighting, 2026-09-23:** seen again under the "Context: no active game detected" line. Evidence
  `docs/test-evidence/plan64-BUSY-DOT-01-back_on_first_chat_22-20-07.png`.
- ★ `[tabs]` `[layout]` **The row of small dots under the chat name still shows below the open tab strip** —
  **OPEN, back from Verify 2026-09-23: failed by measurement.** The move that was meant to hide the dots
  under the strip left no room — the gap between the chat name's letters and the dots measured 0.2 pixels, so
  they touch. Screenshot `docs/test-evidence/plan64-BYEYE-01-chat-row.png`. **Needs the maintainer's pick,**
  three ways out: (a) leave it as is; (b) move the dots back 1 pixel, which then just meets the strip's edge,
  about 1 pixel of gap; (c) hide the dots while the tab strip is open and put them back where they were
  before, about 10 pixels clear. The session recommends (c).
- ★ `[ollama]` **A model pulled from the first-tick download picker never joins the saved try order** —
  **OPEN, split off 2026-09-23.** Ticking the first tickable model in a fresh download picker now correctly
  only queues it instead of starting the download right away (fixed, see Done); once it finishes downloading,
  though, it still does not join the saved order used to pick which model answers a question. The fix for
  that half lives in the back end and has not been built.
- ★ `[focus]` **After pressing "Apply UI scale" on the Settings tab, nothing holds the D-pad ring** — **OPEN,
  found on the Deck 2026-09-23.** The button takes the press, but nothing after it takes the ring: the next
  press only brings the ring back into view rather than moving anywhere, so a shoulder press right after does
  not switch tabs the way it should. Evidence `docs/test-evidence/plan64-UI-SIZE-01.json`.
- ★ `[ollama]` **Remove greys out once a model has answered a question, until the plugin reloads** —
  **OPEN, found on the Deck 2026-09-23 (flow H).** After a model has answered a question, its row's Remove
  button reads "Switch Ask mode first to remove this model" and stays disabled; only a plugin reload clears
  it. Evidence `docs/test-evidence/plan64-PRELOAD-01-try3-timing.json`.
- ★ `[ollama]` **The AI models screen can open with Filters already showing, and the ring on a filter** —
  **OPEN, found on the Deck 2026-09-23 (flow H).** Manage AI models… opened with its Filters panel already
  open and the ring already on "Open source only (recommended)," with nothing pressed to open it. Evidence
  `docs/test-evidence/plan64-PRELOAD-01-try3.json` (+ screenshot
  `plan64-PRELOAD-01-try3-filters-open.png`).
- ★ `[ollama]` **The remove box and the models list undercount a big model's size** — **OPEN, found on the
  Deck 2026-09-23 (flow H).** Removing a 17 GB model, the confirm box said it would free "< 0.1 GB," and
  the list's own header read "Installed 3 · 4.3 GB" while that model was installed. Evidence
  `docs/test-evidence/plan64-ROUTING-MERGE-01-top-try2.json`.
- ★ `[ollama]` **A plugin reload stops a model download in progress** — **OPEN, found on the Deck
  2026-09-23 (flow H).** Reloading the plugin mid-download killed the pull at 16%; asking again picked up
  from the same partial file rather than starting over, so nothing was lost, but a running download does
  not survive a reload. Evidence `docs/test-evidence/plan64-ROUTING-MERGE-01-top-try2.json`.
- ★ `[ollama]` **The plugin log writes one false "non-loopback" connection failure right at start-up** —
  **OPEN, found on the Deck 2026-09-23 (flow H).** The Ollama tab's first connection check runs before
  settings finish loading and always fails and logs an error, even though Ollama then answers questions
  normally right after. Evidence `docs/test-evidence/plan64-OLLAMA-TAB-AFTER-RELOAD.json`.
- ★ `[platform]` **The Steam ban lookup's report shows as raw text, not a table** — **OPEN, found on the
  Deck 2026-09-23 (flow H, VAC-03).** The reply's ban report is written as plain lines of pipes and dashes
  rather than drawn as an actual table. Evidence `docs/test-evidence/plan64-VAC-03-06.json`.
- ★ `[focus]` **The Session tab's Clear did nothing when pressed, on one chat** — **OPEN, found by the
  maintainer by hand on the Deck 2026-09-23 (build `a224fb6`), after the Deck work ended.** The maintainer
  does not remember whether they pressed A or tapped the touchscreen, and thinks it may be because that
  chat had only one turn. **Reproduction plan, to try all four combinations:** on a one-turn chat's Session
  tab, press Clear with A, and separately by tap; try each once right after opening the Clear confirm box,
  and again after switching to that chat from another one. Needs a Deck walk with the focus recorder before
  any fix — the session thinks this is the same family as the tab-bar ghost below.
- ★ `[focus]` **Once, the Show details line did nothing when pressed** — **OPEN, found by the maintainer by
  hand on the Deck 2026-09-23 (build `a224fb6`), after the Deck work ended.** No details yet on which chat
  or when; the maintainer does not remember whether they pressed A or tapped, or whether it was right after
  the Clear confirm box or after switching chats. **Reproduction plan, to try all four combinations:** press
  Show details with A, and separately by tap; try each once right after cancelling the Clear confirm box,
  and again right after switching chats. Needs a Deck walk with the focus recorder before any fix — the
  session thinks this is the same family as the tab-bar ghost below.
- ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** —
  **OPEN, back from Verify 2026-09-23: failed by hand, found by the maintainer (build `a224fb6`), after the
  Deck work ended.** After Show details → Session, both tab bars stayed drawn at once — the small "MAIN" bar
  and the big icon bar under it. Touch scrolling did not close the big one; the first D-pad move did.
  Recording `recordings/DeckRecord_20260923_235526_game.mkv` (11 seconds, every frame shows both bars). Row
  **TAB-BAR-GHOST-01**. The session's guess, shared with the two bugs above: closing a Decky popup rebuilds
  the plugin, and the highlight lands on the top bar, which then opens — each of these three needs a Deck
  walk with the focus recorder before any fix.
- ★★ `[chat]` **A chat that is still writing does not look busy from another chat** — **OPEN, found
  2026-09-18.** Switch away from a chat that is still writing and nothing says so: its dot looks idle, the
  other chat's Ask button reads ready, and the dot never turns green when it finishes. Seen on three separate
  tries. The code already tracks a generating state, so it is not reaching the row on the device — not yet
  explained. **Ruled out 2026-09-21:** the shape that has bitten this repo before — a per-turn fact reaching
  the screen only once an answer completes, not during the half-written updates along the way — does not
  apply here; the chat's own name rides every update, including the half-written ones, and there is now a
  test proving it. Every step from the back end to the dot reads correctly in the code. What would settle it
  is a log captured on the Deck while the fault is actually happening. **One clean try on the Deck
  2026-09-23, MEASUREMENT — did not appear:** with a log captured for the whole switch, the first chat's dot
  read "pending" the moment the switch happened and turned green right when the log showed the answer
  finishing; the whole answer was there on switching back. Two caveats: the switch happened only about 5
  seconds after the first words appeared, a shorter window than earlier sightings, and the app log itself
  wrote nothing new in the seconds around the switch. **Stays open** — seen three times before, so one clean
  try is not enough to close it; the maintainer's call. Evidence `docs/test-evidence/plan64-BUSY-DOT-01.json`
  (+ screenshots).
  [Detail](roadmap-details.md#a-chat-that-is-still-writing-does-not-look-busy-from-another-chat).
- ★★ `[focus]` **Focus ring styling is inconsistent** between plugin controls and Steam's own — **PARTIAL.** Modal scoping shipped; a
  blanket rule was tried and reverted in favour of Steam's native outline.
- ★★ `[ollama]` `[focus]` **A tap outside the AI models screen started the queued downloads and left the
  D-pad stuck in the Ollama tab** — **OPEN, reported 2026-09-16, not reproduced.** The maintainer thinks a
  tap landed outside the screen instead of on Done; the queued models then started downloading and the
  D-pad could not move in the Ollama tab, as if the screen were still open. Read in the code but not proven
  on the device. Needs a reproduction with an empty download queue.
  [Detail](roadmap-details.md#a-tap-outside-the-ai-models-screen-started-the-queued-downloads-and-left-the-d-pad-stuck-in-the-ollama-tab).
- ★★ `[ollama]` **Attaching a screenshot crashed the model once** — **OPEN, found on the Deck 2026-09-23,
  needs a second try.** A 2.6 MB screenshot attached to a question; after 14 seconds the reply said "Ollama
  returned an incomplete stream". The Deck's own system log shows the model's process crashed with a
  graphics-chip error ("ErrorDeviceLost") and wrote a crash dump. Ollama recovered on its own and later
  questions worked. **Crashed again 2026-09-23, 2 of 2 with the same 2.6 MB PNG**: the same graphics-chip
  error, the same "incomplete stream" message after about 14 seconds, and Ollama answering again about 10
  seconds later. A smaller picture (a 177 KB JPG) is the next thing to try, to see whether size is what
  triggers it. Evidence `docs/test-evidence/plan64-THINKING-05.json`,
  `docs/test-evidence/plan64-SCREENSHOT-CRASH-try2.json`. **Cause found 2026-09-23, needs the maintainer's
  pick:** a smaller picture (a 1280×800 JPG, 177 KB) answered normally in 49.7 seconds with a correct
  description of the screen; the crashing file is a 1920×1080 PNG at 2.6 MB. bonsAI only shrinks a picture
  before sending it when the Pillow image library is present, and Pillow is not installed on the Deck, so
  the full-size file goes to the model untouched. Three ways to fix it, the maintainer's call: ship the
  image library with the plugin, shrink pictures some other way, or refuse pictures over a size limit with a
  message. Evidence `docs/test-evidence/plan64-SCREENSHOT-CRASH-small.json` (+ `.png`). **The maintainer's
  own lean: shrink the picture a simpler way, not by shipping the Pillow library.** A measured comparison
  backs this up: the unshrunk crash picture was a 2.6 MB file, 3.6 MB once packaged for sending; shrinking it
  with `ffmpeg`, already on the Deck, brought it to 86 KB, 114 KB sent, in 0.2 seconds, still fully readable.
  The Deck's own picture library was tried too, but it cannot be loaded inside Decky's own, older Python, so
  using it would mean shipping a separate program instead. Recommendation: shrink with `ffmpeg`, and refuse a
  picture with a message if the shrink itself ever fails. **Why this only showed up tonight:** the fallback
  that sends a picture untouched has worked this way, unchanged, since 2026-04-13; tonight's picture was the
  first large, barely-compressed one ever attached — a screenshot taken while the Deck was plugged into an
  external monitor, about six times bigger than anything sent before. [The measured comparison and size
  table](test-evidence/plan64-SCREENSHOT-SHRINK-COMPARISON.md). **Waiting on the maintainer's yes.**
- ★★ `[reply]` **Token streaming reveals text in bursts while a game is running** — **ACCEPTED 2026-09-04 (D58 #4).** Measured 2026-08-28 with
  a game running: tokens arrive in bursts, and during a burst the overlay drops to 47 fps; between bursts it is a flat 60. Delivery
  is bursty, painting is not slow. The game's own frame rate is unmeasured. Accepted as a nice-to-have; reopen only if the game's own frame rate is measured
  and suffers. Making streaming the default stays a separate feature call. Row **STREAM-11**. [Detail](roadmap-details.md#token-streaming-reveals-text-in-chunks-while-a-game-is-running).
- ★★ `[voice]` **Two things wanting the voice server at once would cut the first one off mid-sentence** — **OPEN,
  found while explaining the code 2026-09-14.** The speech-to-text server is shared, and it is started for one particular
  speech model. If a second caller asks for it with a different model, it restarts to suit the second, and the first is
  never told — it simply finds the server gone. Only one thing uses it today, so nothing is broken now. It becomes real
  the moment a second listener is added, a wake word for example.
- ★★★ `[focus]` **The panel can get into a state where pressing Down stops half way and the Ask button is
  out of reach** — **OPEN, found 2026-09-05.** Down walks as far as the answer and stops dead, Left and
  Right dead too; only a full loader restart clears it, not just reopening the panel. **Trigger found
  2026-09-18:** pressing Ask can leave the highlight stuck on the question box, happening on almost every
  question sent by night's end; only closing the whole Quick Access Menu and reopening it clears it. **Not
  seen at all on 2026-09-19** across about ten questions in four games. A separate, related fault (Down
  doing nothing while an answer arrives) was fixed 2026-09-20 and is now its own row, but this entry's own
  symptoms were not seen that day, so it stays open. **One deliberate try on the Deck 2026-09-23, under a
  recorder, DID NOT REPRODUCE:** pressed A once on the empty question box (its last known trigger), the
  on-screen keyboard opened, B closed it, and Down, Right, Up and Down all moved the ring normally
  afterward. **Stays open** — one clean build does not close a fault that has come and gone before; the
  maintainer's call. Evidence `docs/test-evidence/plan64-STUCK-PANEL-01.json` (+ screenshots).
  [Detail](roadmap-details.md#the-panel-stops-half-way-down-and-the-ask-button-is-out-of-reach).
- ★★★ `[reply]` **A name-withheld boss question on a story-protected game comes back with no spoiler box** —
  **OPEN, found 2026-09-18.** Asking about a boss without naming it, in Hollow Knight or Hades, got it named
  and its tactics given in plain text with no cover — with nothing running, and with the game running and
  streaming. **Sighting, 2026-09-19, Hollow Knight:** the same kind of question came back WITH its cover in
  place — not closing the entry on one clean sighting, but worth recording. **Five possible causes ruled out
  2026-09-21, each by its own measurement, including the most promising one:** a device log from 2026-09-18
  shows the model's own instructions fitted its memory window with room to spare, and its own thinking even
  mentions wrapping the answer, yet the answer still came back with no cover. This bug now waits on the new
  knowledge-base entry below, agreed 2026-09-21: checking that a cover actually happened instead of trusting
  the model to add one. **Still reproduces 2026-09-22**, uncovered in the first sentence. **A measurement
  warning, not a fix:** repeating the identical question came back cached, 1 second against the first
  run's 27, word for word the same — a warning about the counts already here, not proof they are wrong,
  since counting by repeating a question counts nothing. Evidence `docs/test-evidence/plan63-SPOILER-UNNAMED-BOSS.json`.
  **Reproduced again 2026-09-23 with fresh wording, Hollow Knight, game running:** asking about the boss
  behind the crystal spike area attached the Soul Master's own note and Show details read "Spoiler risk:
  med," yet no spoiler cover appeared at any of 83 reads taken while the reply streamed in. The reply names
  "the Soul Master" outright and gives away its fake death and second round in plain text. The
  SPOILER-REVEAL reachability check stays owed for a different reason: with no cover ever appearing, there
  is no hidden block to walk to and reach. Evidence `docs/test-evidence/plan64-SPOILER-REVEAL-reachability.json`.
  [Detail](roadmap-details.md#a-name-withheld-boss-question-on-a-story-protected-game-comes-back-with-no-spoiler-box).

---


## Features

**Standing goal from the maintainer (2026-08-30):** buy back as much vertical room for the chat bubbles as possible; every
`[layout]` entry serves it. Items rated ★★★★★ or above carry a placeholder link to [bonsAI Issues](https://github.com/qd313/bonsAI/issues) in the archive;
replace it with a specific issue when one exists.

- ★ `[ask]` **Intent packs later review** — **OPEN.** Decide whether the quiet intent-pack search aliases are deleted, left quiet, or
  revived under Developer. Not in scope: re-shipping Proton journal inject without a redesign. **New evidence 2026-09-06 (D79):**
  the bundled Deck basics list ships switched on and is the *only* reason a whole sentence ever matches a setting — its 88 words
  match when your sentence contains one of them, so *can you help me with performance* returns three results. The maintainer folded
  that finding into this entry. [Detail](planning/45-settings-shortcut-card.md#5-two-things-about-the-search-that-are-not-obvious).
- ★ `[ui]` **A leftover piece of state from the deleted settings-card keyboard marker** — **OPEN, found
  2026-09-16 while landing the settings card's real D-pad wiring.** The plugin's main file still keeps a
  `selectedIndex` value that only the old fake on-screen marker ever read, and two other files still pass it
  through even though nothing acts on it any more. Nothing a person notices; removing it touches three files
  (`src/index.tsx`, `src/components/MainTab.tsx`, `src/features/plugin-shell/tabs/useMainTabPayload.tsx`).
- ★★ `[chat]` **A quiet cue that a cut question can be opened** — **OPEN, filed 2026-09-05 by the maintainer.** When the ring lands on
  a question bubble that has been cut short, nothing on screen says the rest is there. Chosen 2026-09-05 from four drawn options: the
  text fades out at the right-hand edge instead of ending in three dots, only while the ring is on it, nothing for a finger. Nothing
  is added and nothing shifts. The same fade already sits in the stylesheet with no user, written for cut-off answer bubbles.
  One check owed first: the question bubble turns its own outline off and gets no ring rule, so look on the Deck at what focus shows.
- ★★ `[chat]` **First-run ghost "New chat" label at the create position** — **OPEN, parked by decision.** The create position is the
  literal `[+]`, re-confirmed on board 8f and again in the v3 rows. Reopen that decision before building it.
- ★★ `[reply]` **Headline first: every answer opens with one line that stands alone** — **OPEN, filed
  2026-09-08. Not yet (D99, 2026-09-12): it waits for its own go.** The model would open every answer with
  one short sentence that carries the point and gives nothing away. **The 2026-09-12 count:** only 2 of 10
  answers already opened that way and 0 of 10 gave anything away — by the maintainer's own rule that means
  build it, but they read the count and said not yet. [Detail](roadmap-details.md#headline-first-every-answer-opens-with-one-line-that-stands-alone).
- ★★ `[reply]` **Streamed answers arrive with the same scramble as the decode chips** — **OPEN, asked for by the maintainer
  2026-09-23.** A Developer tab toggle: when on, each streamed piece settles into place the way a suggestion chip does in decode
  mode, its unsettled tail churning through placeholder glyphs that lock into the real letters, smooth and without bursts, like
  the Ghost in the Shell titles. Off by default. Reuse the decode chip's animation and timings (`MainTabPresetAnimatedChips.tsx`,
  `MainTabChatTranscript.tsx`). Related to the accepted bug about streamed text arriving in bursts.
- ★★ `[reply]` **The answer's first lines in the reply-ready toast** — **OPEN, planned 2026-09-05, calls locked (D63).** When an
  answer finishes while the menu is closed, the toast says only *Reply ready*. It would read *bonsAI* over the first lines of
  the answer, in every mode, for eight seconds, so a short answer is read without leaving the game; tap still opens the panel.
  Hidden blocks are skipped; if nothing safe is left the toast stays as it is. **Measure first, on two screens with screenshots:**
  the Deck's own screen and a 24-inch 1080p monitor; the popup is expected to be small. [Plan and mockup](planning/38-toast-answer-lines.md).
- ★★ `[reply]` **Which bundled characters copy a real person** — **OPEN, filed 2026-09-08 (D74); the gate for the shelved character
  voices.** All 31 characters in the picker are named characters from games or TV, each voiced by a real actor, and one is a living
  comedian's own persona. A written sweep, one line per character: who owns the character, whose voice it is, and whether a voice for
  it could be made as a type rather than a copy. Text roleplay sits on the first layer today; any voice would sit on all of them. No
  code; a document the legal check reads. [Memo](planning/42-read-aloud-feasibility.md).
- ★★ `[voice]` **Spoilers by voice** — **OPEN, filed 2026-09-08; Read answers aloud shipped 2026-09-12, still waits on Voice
  follow-ups.** When a spoken answer reaches a hidden spoiler it says "there is a spoiler here, say go on to hear it" and waits;
  "go on" unhides and reads it, anything else skips it. The block on screen unhides with the spoken one, so the two never
  disagree. The Deck alone is enough to test. [Plan](planning/49-steam-frame-features.md).
- ★★ `[voice]` **Voice follow-ups** — **OPEN, filed 2026-09-08; Read answers aloud shipped 2026-09-12.** For a few seconds after a spoken
  answer ends, the mic listens for a handful of words: again, go on, stop, next tip. No wake word needed, since the mic opens only
  in that window and closes on silence. The words a person needs when they cannot reach the Deck or scroll. The Deck alone is
  enough to test. **The maintainer set the exact shape 2026-09-11:** a short rising tone when the mic opens right after a spoken
  answer, the mic keeps listening as long as it hears something, and a short falling tone when it closes. Four words: again, go
  on, stop, next. One setting, off by default. The middle position of the Voice replies setting (D99) is the signal this
  hangs off: an answer to a spoken question is read out, then the mic reopens. [Plan](planning/49-steam-frame-features.md) ·
  [Second look § 3](planning/52-frame-features-second-look.md#3-voice-follow-ups-a-sound-a-short-listen-a-few-words).
- ★★★ `[layout]` **Give the reclaimed height to the transcript** — **OPEN, measured 2026-09-16 on the Deck's
  built-in screen, no single cause, not built in plan 56.** The panel is only 454 pixels tall on the Deck's
  own screen, not the 696 every earlier number assumed, so even a two-turn chat overflows it and a person
  sees about three lines of chat. Fixed rows take 311 of the 454 pixels before any chat starts. Getting more
  room means shrinking or hiding one of those rows — a design call for the maintainer. [Detail](roadmap-details.md#give-the-reclaimed-height-to-the-transcript).
- ★★★ `[layout]` `[focus]` `[chips]` **While reading an answer, the Show details line takes the suggestion
  chip's place above the question box** — **NEW, filed by the maintainer 2026-09-23. Not started.** Today
  the suggestion chip stays pinned above the question box no matter where in a reply the person has
  scrolled. The idea: while scrolling through an answer, that answer's own Show details line shows there
  instead of the chip; once the person scrolls past the answer and its Show details line, the chip comes
  back. The maintainer's own proposed cure for the bug **"Show details' chip ladder hides under the
  question box"**, below. **Needs a plan and animated mockups before anything is built**, since the swap
  between the chip and the line happens as the person scrolls — drawn at the Deck's real size, from the
  real screen, showing the swap in motion.
- ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — **OPEN, research spike.** Hold models loaded, or unload when a game takes
  focus on the Deck APU? The spike decides go or no-go; no production unload before it.
- ★★★ `[ollama]` **Per-mode latency timeouts** — **OPEN, weighed and deliberately not built 2026-09-05.** Separate warning and
  give-up values per Ask mode. It was the sixth candidate in round 36 and was dropped on purpose, said in advance rather than
  discovered late: it is the largest of that set — the two existing values already run through sixteen files each and going per mode
  triples them — and the least of them for a person, since it changes when a warning appears rather than what the plugin can do.
- ★★★ `[ollama]` **What bonsAI costs a running game** — **OPEN, asked for 2026-09-20 and measured the same day.** Writing an
  answer takes about a third of the frame rate: God of War ran 31 frames a second on its own, 20 while an answer was written,
  and 31 again afterwards. It goes both ways — the answer itself drops to about a third of its usual speed. Memory is the other
  half: with that game running the Deck had 206 MB spare before the model loaded. **Giving the model more room costs nothing in
  frames**, so the real questions are what to reserve and whether to say plainly what a question costs. Pairs with keep-alive.
- ★★★ `[platform]` **bonsAI's own icon in the Quick Access Menu** — **OPEN, re-planned 2026-09-23, was ★★★★★★.** The
  free plugin Quick Tab already pins any Decky plugin as its own menu icon, so the wait on Decky's team is over. Left for
  bonsAI: a Deck test, then small fixes. Read from the code, not yet seen: in its own tab the reply-ready notice pops up
  while you are looking at the answer, and tapping it opens Decky instead. Questions answered; the Deck test is next.
  [Plan 66](planning/66-quick-tab-own-menu-icon.md).
- ★★★ `[platform]` **Trim the five documents that are still big** — **PARTIAL: one of five done 2026-09-15.**
  Nothing a person using the plugin would notice; this is about what every piece of work costs before it starts. Five files
  carry a trim task at the top of each, with its own star rating, time and model. **This file is done (2026-09-14 and 15) — 100 KB to 83 KB,
  about 3,700 tokens off every landing.** Four left. The next one that matters is the testing rows, because the house rules
  say those are read before anything is marked done too. The biggest single win is the locked decisions file at 89,000
  tokens a read. Do them one at a time; each is its own small job.

- ★★★ `[platform]` **The eleven long files, left long on purpose** — **OPEN, filed 2026-09-15.** Nothing a person
  using the plugin would notice. Eleven files in the code are past the size limit — seven that draw the screen,
  four behind the scenes — and were left alone on purpose this round, because splitting each one safely is a
  day's careful work. This entry is the record that they were skipped on purpose, not missed, with the sizes
  so nobody has to re-measure. Two smaller files already came out of the Ask file the same safe way, each with
  its own test. Do the rest one at a time, each with its own Deck check.
  [Full file list and sizes](roadmap-details.md#the-eleven-long-files-left-long-on-purpose) ·
  [Plan](archive/51-refactor-round-two.md).

- ★★★ `[reply]` **The Spy opens as somebody else** — **OPEN, split off 2026-09-15 (D105).** On a random chance his first message
  introduces him as a different character from the list and he keeps it up. A character has no first message today, so this
  needs a greeting feature first and is its own job, not a line of prompt text. Decide before building: how often, whether the
  picker still shows Spy while he claims otherwise, and how the reveal reads when the person thought they had picked someone
  honest.
- ★★★ `[reply]` **Terse mode: Speed answers in three lines** — **OPEN, planned 2026-08-29, nothing built.** A toggle beside the
  reply-style slider, off by default, capping a Speed answer at three lines. It overrides the slider and the character; destructive
  warnings and the depth phrases escape it. The real work is widening the branch picker (D40). **TERSE-01** passes at 8 of 10.
  [Detail](roadmap-details.md#terse-mode-speed-answers-in-three-lines).
- ★★★ `[ui]` **Adjustable text size in Settings** — **OPEN.** `uiScalePx()` already runs through the stylesheet; the work is exposing it,
  deciding what must not scale (icons, the 300px column), and paying the settings plumbing. [Detail](roadmap-details.md#adjustable-text-size-in-settings).
- ★★★ `[ui]` **Search density** — **OPEN.** Tighter, more scannable results with highlighted match tokens.
- ★★★ `[voice]` **Full-quality reading from a LAN PC** — **OPEN, deliberately not built 2026-09-08 (D74); reopened only if the
  local port fails its Deck test.** For a person whose Ollama already runs on a PC in the house, that PC could also run OmniVoice as
  a speech server and read every answer in the full character voice, five to forty times faster than real time on its graphics card.
  Not offline, so never the default. Dropped on purpose, said in advance: a speech server is a second program on the person's PC with
  its own heavy install and an address to paste into Settings, the most setup the plugin has ever asked of anyone, and the one-time
  voice step it would speed up is a wait of minutes on a Deck and seconds on anything stronger. The entry stays so the reason is on
  record. [Memo](planning/42-read-aloud-feasibility.md).
- ★★★ `[voice]` **Headset mode** — **OPEN, filed 2026-09-08; waits on Read answers aloud and Wake-word listening.** One switch
  that turns on the wake word, reads every new answer aloud on its own, and asks the model to answer for the ear: two or three
  sentences, no lists. Made for a visor on your face and a Deck across the room. A PC with SteamVR and any headset helps with one
  question only: whether the headset's mic reaches the PC during a streamed game. **No headset is being bought for now (D97 call
  3); this waits for the Frame.** [Plan](planning/49-steam-frame-features.md).
- ★★★ `[ollama]` **How fast is this model on this Deck** — **OPEN, planned 2026-09-06, calls open (D75).** Next to each installed
  model, how fast it answered on this Deck the last time it was used, and a button to time it now with one fixed question. The
  numbers already exist on every answer; the plugin keeps a last-ten record per model with the game that was running, shows a
  badge in the picker and a plain line under Show details, and never reorders anything. The bake-off's Deck half becomes one
  press per model. [Plan](planning/43-model-speed-readout.md).
- ★★★★ `[ask]` **Connection doctor** — **OPEN, planned 2026-09-05, calls locked (D64).** When an Ask fails, a **Fix this** button
  under the failed reply runs the checks the plugin already has, shows the one that failed, and offers the one thing to do
  next with a button that lands you on that control on the Ollama tab. It only offers; nothing changes without a press.
  **Save a report** inside it, and a typed command, write a read-only report of the setup to the Desktop: the former
  **Deck health snapshot**, folded in here. [Plan](planning/39-connection-doctor.md).
- ★★★★ `[ask]` **Session context and user stash** — **OPEN.** Live session facts plus user-editable notes for Ask. No embeddings, no cloud.
- ★★★★ `[ask]` **The chat sums itself up instead of being cleared** — **PARTIAL: a chat remembers itself now (2026-09-21);
  the summing-up itself is not built.** Ask a follow-up that names nothing and the answer stays on the same game and subject.
  How much of the chat is carried is the plugin's decision, with a floor the answer cannot lose, a ceiling thinking cannot
  cross and a limit on how long you wait. Left to do: the short summary for when a chat outgrows that, Compact replacing
  Clear, and the spoiler chance rating. [Detail](roadmap-details.md#the-chat-sums-itself-up-instead-of-being-cleared).
- ★★★★ `[ollama]` **LAN custom model pull** — **OPEN.** Blocked until a mechanism is chosen (R1 to R4). Depends on **Custom model in
  the Pull Models picker**.
- ★★★★ `[perms]` **Web permission** — **OPEN, discovery locked.** Opt-in live web answers; offline Ask and local KB when off. Kids
  lock forces it off. [Discovery](planning/web-permission-discovery.md).
- ★★★★ `[platform]` **Llama.cpp provider spike** — **OPEN, research only.** Go or no-go against Deck-local Ollama. Prior:
  [llama-cpp-provider.md](archive/spikes/llama-cpp-provider.md).
- ★★★★ `[platform]` **Steam Input layout parse** — **OPEN.** Parse controller VDF configs for control context. Not in scope: writing
  configs.
- ★★★★ `[reply]` **A note pinned in space** — **OPEN, filed 2026-09-08; needs the SteamVR panel first.** In a headset, park the
  answer on a wall or table beside you. It stays there while you play, so a checklist becomes a sticky note you glance at between
  fights. Worth testing on a PC with SteamVR now: the built-in pretend headset can show a panel fixed in the room, and a real
  headset judges whether it reads. **No headset is being bought for now (D97 call 3); this waits for the Frame.**
  [Plan](planning/49-steam-frame-features.md).
- ★★★★ `[reply]` **A wrist panel** — **OPEN, filed 2026-09-08; needs the SteamVR panel first.** In a headset, a small panel rides
  on one controller. Turn your wrist, read the answer, drop your hand and it is gone. No pointer needed. Worth testing on a PC
  with SteamVR now, but only with a real headset and tracked controllers; the pretend headset has no hands. **No headset is
  being bought for now (D97 call 3); this waits for the Frame.** [Plan](planning/49-steam-frame-features.md).
- ★★★★ `[ui]` **SteamOS Share path** — **OPEN.** Faster path from Share and capture flows into screenshot attach where APIs allow.
- ★★★★ `[ui]` **SteamOS spin hint card** — **OPEN.** Detect immutable spins and deep-link to troubleshooting.
- ★★★★★ `[ollama]` **On-Deck model benchmark** — **OPEN, descoped on 2026-09-06, one call open (D75).** Rank installed models by measured
  speed and completion; offer as try order with confirmation. Its own gate said: if timings do not hold still, descope to a
  one-shot readout. That readout is now its own three-star entry, [plan 43](planning/43-model-speed-readout.md), and its record
  of timings answers the gate over time. Whether this line retires is D75. **First input, 2026-09-05:** the desk survey of this
  quarter's models in [41-deck-model-survey.md](planning/41-deck-model-survey.md); the calls are D72.
- ★★★★★ `[perms]` **VAC Phase 2: opponent IDs** — **OPEN, research.** Surface live opponent identities for ban checks when metadata allows.
- ★★★★★ `[platform]` **Controller macro test rig and live view** — **OPEN, discovery locked 2026-08-23, board ordered.** A bridge board
  the Deck sees as a real controller, a macro runner gated on real UI state, and one recording pipeline. Primitives land upstream in
  decky-plugin-studio. Next: spikes S1 to S3. [Plan](planning/19-controller-macro-test-rig.md), [program](planning/21-ai-owned-testing-program.md).
- ★★★★★ `[platform]` **Steam Controller copilot (Ibex gen-2)** — **OPEN.** AI copy tuned to gen-2 hardware.
- ★★★★★ `[platform]` **The floating panel inside SteamVR** — **OPEN, filed 2026-09-08; first step is a ★★
  test to find out.** bonsAI's panel floating over any VR game, drawn by a small PC program, not a Decky
  plugin. **Locked rule (D97):** it goes only through SteamVR's own panel door and never touches the game
  itself, to avoid an anti-cheat ban. **Bench result, 2026-09-12: the panel works** — a sample answer
  appeared inside the headset view with no plugin code at all. **Still unknown:** pointing at the panel
  (needs a real headset) and whether the notification card SteamVR accepted actually drew on screen. [Detail](roadmap-details.md#the-floating-panel-inside-steamvr).
- ★★★★★ `[QA]` `[platform]` **Stand-in Decks on the maintainer's PC** — **OPEN, planned 2026-09-23, nothing built.** Up to
  four virtual Decks (Bazzite, one Steam account, all but one offline) so several AI sessions test at once instead of queuing
  for the one Deck. A test lead splits the work; one rig lead per machine. Phase 0 first: one stand-in on Windows, screens
  drawn without the graphics card; if that fails, a Linux dual boot. Driving several machines is a Deck test tools item,
  not bonsAI code. [Plan 67](planning/67-stand-in-decks.md).
- ★★ `[reply]` **The folded reasoning line in the character's own voice** — **OPEN, optional, filed 2026-09-16 (D106).**
  Builds only after the reasoning display's first version has landed and been looked at. The mockup page showed the same
  folded line written by the model itself in three characters' voices: Ali G, "See the booyakasha · 41 s"; GLaDOS, "Expose
  the inefficient calculations · 41 s"; the Spy, "Révéler le raisonnement · 41 s" — the longest of the three still fits the
  row at the small size. Not decided yet: how the voiced line gets written, a fixed phrase per character or the model asked
  once each time, and it must fall back to the plain line whenever the character is off or the phrase is missing.
  [Mockup page](https://claude.ai/artifact/2De58qirE34754PEZVPmdb).
- ★★★★★ `[voice]` **Wake-word listening** — **OPEN, beta.** Opt-in always-on local wake **bonsAI**, then STT, then a quiet Ask.
  [Feasibility](planning/10-wake-word-listening-feasibility.md).
- ★★★★★★ `[platform]` **Deep mod AI hints** — **OPEN.** Detect mod frameworks and files; mod-aware guidance.
  [Feasibility](planning/12-deep-mod-ai-hints-feasibility.md).
- ★★★★★★ `[platform]` **One decision for three items: the SteamVR panel, leaving Decky, and reopening
  llama.cpp** — **OPEN, filed 2026-09-08. Not yet (D99, 2026-09-12): nothing built until the maintainer
  says.** One question underneath all three: does bonsAI grow a second way to run — there is no network
  door into its Python side today, so a panel on the PC would have a screen and no brain. **The price is
  now known (2026-09-12):** the Python side ran outside Decky on a Windows PC and all nine calls it normally
  makes came back working. Still missing: a starter program and a way for a panel to reach it. [Detail](roadmap-details.md#one-decision-for-three-items-the-steamvr-panel-leaving-decky-and-reopening-llamacpp).
- ★★★★★★ `[platform]` **Remote Play diagnostics layer** — **OPEN.** Streamed-gameplay answers weight encode latency and host-vs-client
  fixes. Noted in [09-steam-frame-companion-feasibility.md](archive/09-steam-frame-companion-feasibility.md) § B8.
- ★★★★★★ `[reply]` **In-game answer surface** — **OPEN, split 2026-09-05.** Read an answer without leaving the game. The full
  overlay is upstream-gated and stays here as research. The unblocked slice, the toast carrying the answer's first lines, is its
  own ★★ entry above, planned in [38](planning/38-toast-answer-lines.md). Reframed 2026-09-08: the same surface is open in a
  headset through SteamVR on the PC; see **The floating panel inside SteamVR** and [49](planning/49-steam-frame-features.md).

---



## Verify

Fixed, unit-tested and shipped, but not yet confirmed on the Deck. Owed QA row named in each entry; full evidence in
[testing.md](testing.md) / [testing-manual.md](testing-manual.md). Once a Deck run confirms one, move it in the same commit: a line into
[Done](#done-for-v050), the full entry into the matching archive file, drop it from here.

### Checks whose evidence never existed
- ★★ `[QA]` **Twelve checks read as proven with nothing behind them** — **VERIFY, found 2026-09-13 during the
  clean-up.** Twelve checks name a saved Deck recording as their proof. None of those recordings exists, and the project's whole
  history shows none ever did — they were never written, not lost. So twelve results were written down as passing on the
  strength of a file nobody can open, and whether they really passed is unknown. Nothing here says the plugin is broken; it says
  we do not know. Re-run all twelve together in the next automated testing session. Batch **QA-EVIDENCE-GAP-01**, listed with
  each row in [testing.md](testing.md). Until a run produces real evidence, treat all twelve as unknown rather than as a pass.
  **As of 2026-09-18, seven of the twelve have real evidence behind them now.** Five remain: the spoiler-reveal
  reachability check, the knowledge-base update button check, the 12 September follow-up-memory re-run, model
  eviction on the Deck, and the wave-three Deck evening. All five are scheduled in plan 64. The table in
  [testing.md](testing.md#qa-evidence-gap-01--twelve-checks-whose-evidence-was-never-saved) already says this row by row.

### Bugs that need verification
- ★ `[focus]` **The Session tab's Clear box opens with the ring on Clear, and cancelling it throws the ring
  out of the panel** — **VERIFY, fixed in `e163d8c`.** The confirm box used to open with the ring on the
  destructive Clear button rather than Cancel, and cancelling threw the ring out to the tab bar with the
  whole details panel closed. **Could not run on the Deck 2026-09-23:** Claude Code's own permission check
  refused the walk to the Clear button before any press was sent, so nothing was tried (0 "clear" lines in
  the log — confirms nothing was cleared either). Evidence
  `docs/test-evidence/plan64-SESSION-CLEAR-BOX-01.json`. **Checked by hand by the maintainer on the Deck
  2026-09-23 (build `a224fb6`), after the Deck work ended: the "where you land" half still fails.** After
  Clear then Cancel, the plugin came back "not in the same spot, back at the top," instead of staying on the
  Session tab with the ring on Clear. Whether the box itself still opens on Cancel rather than Clear is
  unconfirmed either way. Not fixed for this half yet.
- ★★ `[focus]` **Walking a reply with the ring on the chat row while it streams carries the row off
  screen** — **VERIFY, found and fixed the same night, `ff62e8c`.** With the ring on the chat row and the
  answer still being written, the view followed the growing answer and carried the chat row off the top of
  the screen (its position went from 14 pixels down to 183 pixels above the top). Owed: the same walk on the
  Deck. Evidence `docs/test-evidence/plan64-STREAM-WALK-REC-01.json` (+ `.png`).
- ★★ `[focus]` `[layout]` **The view jumps to the end of an answer as it finishes, and the ring's place
  goes off screen** — **VERIFY, fixed in `e241c5c`.** About 0.8 seconds after an answer finished, Down from
  the chat row put the ring on "40 earlier" as expected, but the view had already jumped to the very end of
  the answer, leaving the ring 656 pixels above the visible area — 0% visible. The fix makes the view bring
  the ring's own control back into view once an answer ends, instead of the end of the text. **A related,
  separate case is still open** — the ring itself vanishing while it is walked mid-answer, its own bug
  above, since this fix was not built for that shape. Owed: the same walk on the Deck. Evidence
  `docs/test-evidence/plan64-QA-FREE-PLAY-01-streaming-try2.json`.
- ★ `[chips]` `[KB]` **A suggestion chip pulled from the game's notes shows no Tip mark** (row
  **CHIP-BUTTON-09**) — **VERIFY, fixed in `895cf0a`.** Two copies of the same markup had drifted apart; there
  is now one piece of code drawing both badges. Owed: with a covered game running and the knowledge base on,
  set the chip animation to the scrambling one and confirm the dot shows.
  [Detail](roadmap-details.md#a-suggestion-chip-pulled-from-the-games-notes-shows-no-tip-mark).
- ★ `[chips]` **A preset chip's icon and its text are coloured the same way** — **VERIFY, fixed in `895cf0a`.**
  Measured on the Deck 2026-09-23: the label colour reads rgb(196,211,226) at rest and rgb(220,235,248) with
  the ring on the chip. Row **CHIP-COLOR-BYEYE-01**. Owed: **a by-eye check by the maintainer**, from
  `docs/test-evidence/plan64-BYEYE-01-preset-chip.png` — a model cannot judge pixels.
- ★ `[chips]` **A preset chip has a bright blue underline that is too distracting** — **VERIFY, fixed in
  `895cf0a`.** Measured on the Deck 2026-09-23: the line's strength reads 0.55, as intended, and is drawn
  only while the ring is on the chip. Row **CHIP-UNDERLINE-BYEYE-01**. Owed: **a by-eye check by the
  maintainer**, from `docs/test-evidence/plan64-BYEYE-01-preset-chip.png`. This line is the chip's only
  highlight cue left, since Steam's own white ring has been clipped off chips since 2026-09-01, so it must
  stay clearly visible, not just calmer.
- ★★★ `[chat]` **Clear cache cleared the screen but not the session** — **VERIFY.** Fixed and confirmed
  2026-08-27 and 2026-09-03; the orphan-chat half is a measured follow-up, not a regression. Only the
  mid-generation half is still owed: clearing while a reply is still being written. Row **CLEAR-CACHE-01**.
  **Tried twice on the Deck 2026-09-18, both too slow:** Clear landed on an already-finished reply both
  times; Clear itself worked cleanly. Needs a reply over about 70 seconds to catch it mid-write, or the
  maintainer's word to call this covered by its unit test instead. **Per the maintainer's answer 2026-09-21
  (D115 #8): this mid-generation half now moves off this session's list and onto the maintainer's own
  checklist** — five device tries is enough, and every reply finished before the controller could walk
  there. The rest of this entry is unchanged. [Detail](roadmap-details.md#clear-cache-cleared-the-screen-but-not-the-session).
### Features that need verification

- ★★★★ `[ask]` **A chat carries what it has already covered into the next question** — **VERIFY, built 2026-09-21.**
  Until now a chat kept 200 questions and answers on disk and almost none of it reached the AI, so a follow-up meant saying
  everything again. Measured on the Deck: *"and what about the boots?"* got **"please tell me which game you are referring
  to"** before, and **"keep the Iron Boots off during the fight in Ocarina of Time…"** after. Anything the AI hid behind a
  spoiler fence is stripped before a word is carried. Row **CHAT-MEMORY-01**. **Tried on the Deck 2026-09-23 with
  nothing running, FAIL:** asking about Megaera in Hades, then "what about her second phase" — the reply knew "her"
  meant Megaera but gave only generic fight advice, and Show details said no search ran at all ("No game is running,
  so there is nothing to look up"). A third question, "what weapon works best against her", lost track of who "her"
  was entirely and asked which game and character were meant. Evidence
  `docs/test-evidence/plan64-FOLLOWUP-MEMORY-EVICTION.json`. **Tried again 2026-09-23 with Hades running,
  still FAIL by this row's own rule:** 34 earlier turns were carried, but the reply still opened with "I
  ain't got no idea what you're talkin' about without a name… tell me which part" before it guessed the
  right subject (Sandtraps) and gave two lines on it — the same deflect-then-recover shape seen with nothing
  running. Evidence `docs/test-evidence/plan64-CHAT-MEMORY-01.json`.

- ★★ `[chips]` **Make the preset chips look more like chips** — **VERIFY, shipped 2026-09-17 under plan 60 (D110).** Each chip now looks raised: a thin light line along its top edge and a soft shadow beneath it. The two chips sit 6 pixels apart instead of 4. In decode, static and carousel mode there is now 8 pixels of open space between the chips and the question box, where before they touched (fade mode was already open and keeps its own spacing). The word "Tip" became a small dot, the colour on the tags and on the resolving-text label is quieter, and the chip the controller is on now shows a light bar along its bottom edge instead of the old blue outline — a ring around the chip that nobody could actually see is gone too. Passed on the Deck by measurement: rows 02, 03, 04, 05 and 06 (the one-chip check), and 08. **Row 09 failed on the Deck 2026-09-18** — a real knowledge-base chip showed with no Tip dot — and is filed as its own bug, below. Still owed: the maintainer's own look at rows 01 and 05, from the three screenshots named in the evidence file, and row 07 (reduced motion), both on the maintainer's own page; and a look at the help and agent chips, which were not on screen during this run. Italics were tried earlier for the label and turned down. [Plan](planning/60-chip-button-restyle.md) · evidence `docs/test-evidence/plan60-QA-chip-button.json`.

- ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09. Rows **KIDS-LOCK-01**, **KIDS-FOCUS-01**, **KIDS-REGRESS-01**
  (and **KIDS-LOCK-02** with a child account). Live CEF Stage 0 confirmation still owed. **KIDS-REGRESS-01
  re-confirmed on the Deck 2026-09-17:** no lock banner, all four Permissions switches on and reachable.
  Evidence `docs/test-evidence/plan57-QA-KIDS-REGRESS-01.json`.
- ★★★ `[reply]` **Soft reply-length cap and thinking budget** — **VERIFY.** Shipped 2026-08-10. **01, 02 and
  03 all pass**, confirmed on the Deck 2026-09-17: a long reply read with no seam, and stopping partway kept
  the partial text with a clear notice. **SOFT-PREDICT-05 passed 2026-09-18** with Thinking Off. Left:
  **SOFT-PREDICT-04**, **tried 2026-09-18, blocked** — the test question came back as a short spoiler-careful
  refusal, so no reply reached the length wall. **Tried again 2026-09-23, still unclear:** the finished text
  was clean, no half-drawn menu block and no stray JSON, but the reply stopped on its own at 1,117 tokens
  against a 2,112-token limit, so it never had to continue and the row's own join point never happened.
  [Detail](roadmap-details.md#soft-reply-length-cap-and-thinking-budget).
- ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab
  named** — **VERIFY, landed 2026-09-17.** Six equal cells with one icon each, only the current tab named;
  the strip is taller so the chat row's dots no longer show under it. **Deck run 2026-09-18:** rows 01, 02,
  04, 05 and 06 pass; 03 waits on the maintainer's own look; 07 failed and is filed as its own bug above.
  The free-play sweep's streaming half is still owed. [Detail](roadmap-details.md#the-open-tab-strip-redrawn-six-equal-cells-one-icon-family-only-the-current-tab-named).
- ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30; the layout inverts to slot row,
  transcript, presets, Ask bar. Most rows pass on device. **As of 2026-09-18:** 05b passed (returning to a
  still-writing chat shows the question and partial text together); 05a's busy-indicator half, 06a and 06b
  failed (filed as its own bug above). **15d passed on the Deck 2026-09-23:** a fresh chat's title changed
  from "New chat" to the question 35 seconds after Ask, with the panel staying open and no reload — though the
  chat row was scrolled out of view at that exact moment, so nobody would actually have seen it change.
  **06c FAILED on the Deck 2026-09-23:** closing the Quick Access Menu (by the rig's GUIDE+A chord) while the
  answer was still arriving, then watching Steam's own toast window every 200 milliseconds for 150 seconds
  after the reply finished — no "Reply ready" notice ever showed, and reopening the panel showed none either.
  The rig has not yet proven its own toast-reading can see a toast at all, so the next run adds a control
  question before re-testing this row. **06c tried again 2026-09-23 with the control run first: still FAIL,
  cause found and fixed in `73be15f`.** The control confirmed the toast reader works (it caught an unrelated
  notice on its first read). Closing the menu properly took four B presses this time — the plugin's own
  panel was already closed after the second — and the reply finished 20 seconds later with the notice
  window read every 200 ms for 90 seconds; "Reply ready" never showed. Cause: the flag saying "a reply is on
  screen" was only written while the panel was open and was never cleared once it closed, so a reply that
  finished in the background read as already seen. **06c tried a fourth time on the Deck 2026-09-23 (flow
  E), PASS:** with the menu closed by four B presses, "Reply ready — Tap to open" appeared within 1 second
  of the answer finishing. Evidence `docs/test-evidence/plan64-CHAT-SLOTS-V3-06c-try4.json` (+ two
  screenshots). [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02) · [More](roadmap-details.md#named-chat-slots).

---

## Knowledge base and RAG

Everything about the game notes and the search that feeds them, in one place, so you can open this file and pick up
where you left off. **Read first:** [the status report](planning/37-rag-status-report.md) — the zoomed-out picture, what
each next step buys a person, and rough costs. It is kept in step with this section. Architecture:
[knowledge-base.md](knowledge-base.md). The agreed answer-quality work: [plan 30](planning/30-kb-answer-quality-plan.md).

Same rules as the lists above: five lines an entry, stars ascending in each list, a fix moves to **Deck check owed** and
then to [Done](#done-for-v050) in the same commit. The one difference is that the knowledge base keeps its bugs, its owed
checks and its plans together here instead of spread over three lists.

**Where things stand (2026-09-18).** **372 notes over 35 games, plus 159 Deck tips.** Wave two
added 27 notes and 32 tips. **Of the 72 questions a player might plainly ask about the twelve games added this
month, 64 now have a note** — the other eight were written on purpose to have none, so every question that was
meant to have an answer has one. Ten more games' notes landed 2026-09-18 — the five Mario Party games, Donkey
Kong 64, Yoshi's Story, Diddy Kong Racing, Super Smash Bros. 1999 and Grand Theft Auto III: The Definitive
Edition — written by two helpers in their own words from wiki pages read that same day, with the page, licence
and day recorded on every note. The library was built as version 2026.09.18 with every note and tip indexed and
its publish check passing. **Published 2026-09-23:** both Hugging Face and the GitHub release now serve
2026.09.18, read back after publishing to confirm it.

**Finding the right note.** On the held-back questions nobody tuned against (177 rows), the search puts the
right note in the top three **85.3 times in a hundred**. Every one of the 21 notes written in wave two is found
in the top three for its own question, and 12 come first. Across all 72 questions about the new games, **58
find their note in the top three where 38 did**. Two rows out of 413 got worse against 24 better. On the 21
newly labelled questions for the games added this session, the right note came first 16 times and landed in
the top three 20 times. This was measured 2026-09-18 on the floored search against the new, bigger library —
a new series, started because rows were added, so it does not compare with any older count.

**The answer the Deck's own model writes**, over 61 questions with the corrected checks: it keeps the note's facts
**76.6 times in a hundred**, never contradicts its note **94.4**, attaches a note whenever one is due **100**,
shows the branch menu when due **98.6**, and comes out clean on all three runs **60.7**.

**Do not compare those against any older figure in this project.** Two faults were found and fixed in wave three:
the check could mark a right answer wrong for using different words than it expected, and it could miss a reply
that flatly said the opposite of its own note. The search test had also been reading a copy of the library from
31 August for weeks. Every answer and search number quoted before wave three carries one of those faults. The full
before and after is in [wave three's report](planning/48-kb-wave-three-session.md).

**Getting to the troubleshooting tips is where the wave fell short.** The tips themselves are much better — crash went
from 2 to 9, sound 1 to 8, picture 1 to 8, performance 2 to 10, controller 6 to 10, and the top crash tip no longer
tells someone to check a desktop that game mode does not have. But of 24 fresh sentences written by someone who had not
seen the rules, **6 reached the tips before and 8 after**. The rules are still phrase-shaped: they catch the exact
wording someone imagined and miss the neighbour.

**Pick up here, in order.**

**Wave three ran on 2026-09-07** ([48](planning/48-kb-wave-three-session.md)), after wave two's own Deck
evening ran the same evening, once the Deck was free.

1. ~~**Finish the device evening.**~~ **Done 2026-09-15.** The two checks that had never run — the honesty
   line, and tips still attaching when one fits — both pass on the device. The speed check passes three
   times with its fix. The one row still blocked is the *No tip for this* line, because no question yet
   found reaches the tip sheet and comes back empty, so there is nothing for it to fire on.
2. ~~**Fix the speed check.**~~ **Done.** It now refuses to pass a reading taken without a reply first, and
   read 547, 23 and 28 thousandths of a second against a one-second budget on 2026-09-15. Read that with
   the range in mind — the number swings with what is loaded in memory.
3. **Decide how to finish follow-ups.** The search half works on the device — it looks up the right thing
   you were just asking about — but the answer can still be about something else, and one run in three still
   names the wrong boss (its own bug below). The options for finishing it still need writing up.
4. **The one-second wait on every question is now explained.** The Deck can only hold one model in
   memory at a time, so the model that writes the answer and the model that searches the notes keep
   pushing each other out. A search right after an answer measured 732 thousandths of a second; with
   the limit raised to two, tried safely on a spare copy of the setting that never touched the
   maintainer's own, it dropped to 24. Measured 2026-09-12. Evidence
   `docs/test-evidence/plan48-R6-deck-model-eviction.json`.
5. **Which of those two settings the maintainer's Deck is actually running: answered 2026-09-23.** The two
   starting paths were made to agree (`fae4a53`). Read on the Deck from three places at once — the running
   Ollama process, the auto-start file, and the Ollama tab's own switch — all three now say "keep two
   models loaded," and `ollama ps` showed both the answering model and the note-search model loaded at
   every one of four reads across three questions, with no load or unload logged in between. Still open:
   the drift from August to September, and whether keeping two models loaded causes trouble with a game
   running (a repeat of this same reading is planned with a game running). Evidence
   `docs/test-evidence/plan64-FOLLOWUP-MEMORY-EVICTION.json`.
6. **Then 58 phase 1** — two fixes before wave four. [The plan](planning/58-phase-1-notes-shown-and-wiki-extracts.md)
   shows the note's own words under a reply instead of the model's rewrite of it, and reads a wiki's own
   sentences into notes with no AI rewrite, tried first against Hollow Knight and then on ten more games from
   sources already cleared. Nothing started; waiting on the maintainer's nine answers (locking as D111) and
   the word "go". Started 2026-09-17: the drawings, the blind questions and the source study have landed; the
   reader is still being built; the Deck is asleep, so the device readings wait on the maintainer.
   **Update 2026-09-19:** the upward walk and the ladder walk both now pass on the Deck, and the
   reason the block sometimes arrived late is found, fixed on the branch, and confirmed passing on
   the Deck too; what is left is the read-aloud row and the maintainer's publish call; phase 2 can
   start.
7. **Then wave four, now 58 phase 2** — writing more notes. [The plan for it](planning/58-phase-2-kb-session-wave-four.md)
   is the same plan as before, renamed, and runs once phase 1 has landed; its answers lock as D112.

**Wave two's own evening ran 2026-09-07** and wave three ran the same day; the results and the bug write-ups are
in [wave two's report](planning/47-kb-wave-two-session.md) § 8 and [wave three's](planning/48-kb-wave-three-session.md).
The five optional August rows were not run, and New Vegas still is not installed.

**A library point release went out 2026-09-07** carrying the corrected Black Mesa water note and nothing else — 293
notes, 156 tips, 25 games, unchanged. Installed on the Deck and checked: asked about the flooded rooms, the reply now
says the current is constant, says not to try to time it, and points at the wall switch that cuts the power. The old
advice to wait for a gap is gone. Evidence `docs/test-evidence/plan48-R5-blackmesa-corrected-note.json`.

### Calls waiting on you

- **58 phase 1, nine questions** ([§ 8](planning/58-phase-1-notes-shown-and-wiki-extracts.md)): answered
  2026-09-17 and locked as D111. Two things are still open: the block's look waits on lane A's drawings,
  and trim-only for wiki notes stands unless the maintainer overturns it.
- **58 phase 2, seven questions** ([§ 8](planning/58-phase-2-kb-session-wave-four.md)): unchanged from the
  wave-four plan. Locks as D112, after phase 1.

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md); the knowledge-base
ones from this month are D81 to D88.

### Bugs

- ★ `[KB]` **A shared troubleshooting tip that has a source page never gets it shown** — **OPEN, found
  reading the code 2026-09-21 (plan 63, lane G).** Two pieces of code build a shared tip's own name
  differently, so the two never match and its source page never reaches the credit line. Rarely bites
  today, since almost no shared tips carry a source page. Not run on the Deck.
- ★★ `[KB]` **The "no close match" line reads wrong next to a note the reply used** — **OPEN, failed on the
  Deck 2026-09-23; was fixed 2026-09-21 (plan 63, lane G, commit `c25456c`).** That fix made the line read
  the best score across every attached note instead of only the first one's, but a Hollow Knight reply built
  on the Broken Vessel note, attached second behind a generic "Starting out" note, still carried the line
  saying nothing close was found — the exact shape the fix was meant to cure. Evidence
  `docs/test-evidence/plan64-NO-CLOSE-MATCH-HK.json`. **Sighting, 2026-09-23:** the same wrong line closed a
  Half-Life 2 answer that had a "Sandtraps (+2 more) · From the Half-Life wiki" block on screen and three
  notes attached in the log (Sandtraps, Ravenholm, Strider). Evidence
  `docs/test-evidence/plan64-BUSY-DOT-01.json`. [Detail](roadmap-details.md#the-no-close-match-line-reads-wrong-next-to-a-note-the-reply-used).
- ★★ `[KB]` **Unrelated questions still get game cards stapled on** — **ACCEPTED 2026-08-27.** With a game running, *"thank
  you very much"* still attaches a card. Raising the keyword floor costs real matches, and the model mostly ignores an
  irrelevant card. [Detail](roadmap-details.md#ordinary-phrases-attach-game-cards).
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held
  back 2026-09-06, re-measured 2026-09-07 and still held (D52, D81).** With nothing running, all 24 fresh
  plainly-worded problem sentences now reach the search, against 8 before — but what comes back is often
  wrong, six measured examples attaching a tip about something else entirely. **The cause:** the meaning
  search only runs when the plain word search finds nothing, which is almost never, so a poor match wins
  first. The real fix is rewriting the tips, filed as its own entry below. [Detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).
- ★★★ `[KB]` **Searching the notes by meaning costs about a second, every time, on the Deck** — **ACCEPTED
  2026-09-06.** Repeated on the Deck: 1.10, 1.23 and 1.19 seconds across three questions in a row, the same
  band as first measured — the maintainer said that is fine next to an answer that then takes tens of
  seconds to write. **The cause is now measured:** the two models pushing each other out of memory, which
  reads as cheap to fix; the acceptance stands until the maintainer says otherwise. (D84) [Detail](roadmap-details.md#searching-the-notes-by-meaning-costs-about-a-second-every-time-on-the-deck).
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** The weight sweep ran: leaning the search toward meaning gets the right note first about four to six
  points more often, but it also buries a brand-new note whose meaning index has not been built yet, which the current
  weights deliberately protect against. **Not lifted until every note is guaranteed to have its index before it can be
  searched.** Two other objections — a strong exact word match losing to a weaker meaning match, and a locked routing
  rule no longer holding — are not covered by that rule and still need answering if this is ever revisited. Weights
  stay even for now. (D68, D82) [Detail](roadmap-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against).

- ★★★ `[KB]` **A follow-up still names the wrong boss one run in three** — **OPEN, left behind when the
  follow-up fix closed 2026-09-12.** A follow-up now gets the right boss two times in three, where it used
  to be wrong every time; DOOM Eternal is wrong every time and no amount of search work closes that one.
  (D98) **Sighting, 2026-09-19, Hades:** the search found the right boss again, but the written reply asked
  which boss was meant instead of using her name. [Detail](roadmap-details.md#a-follow-up-still-names-the-wrong-boss-one-run-in-three).
- ★★ `[KB]` **The "No tip for this" line has no question that can make it appear** — **OPEN, measured off the
  device 2026-09-12.** Against the library that ships, on every sentence anyone has tried: the five hardest problem
  sentences still get a tip in every mode, meaning search on or off; the twelve junk phrases attach nothing, which
  routes nowhere, so no line. The floor this wave added changed nothing on the tip side — 14 right, 1 wrong, 2
  nothing, before and after. Either the floor bites on tips or the line is decoration.
- ★★ `[KB]` **Four questions still get notes about the wrong subject** — **OPEN, three of the four now say
  so, found 2026-09-07.** Asking Black Mesa how to tame a horse, Portal 2 where to buy a house, and a
  nonexistent Hades boss all still attach a note; the floor added this wave cannot catch these without
  losing correct answers elsewhere. Three of the four now carry the "no close match" line, but the wrong
  note is still attached. **Found again 2026-09-18:** a Hades boss question attached the wrong area's note
  and the reply named the wrong bosses. [Detail](roadmap-details.md#four-questions-still-get-notes-about-the-wrong-subject).
- ★★ `[KB]` **Black Mesa's electrified-water question attaches two unrelated early-game notes instead of its
  own** — **OPEN, found 2026-09-19.** Asking how to cross the electrified water gave the right, specific
  answer, but the two notes Show details named as used were general early-game notes about starting out and
  the opening tram ride — neither one is the electrified-water note, which does exist in the library. So a
  person sees a correct answer with the wrong notes named underneath it, one run, one asking. **Asked again
  2026-09-22 with different wording on purpose** (a repeat is cached and proves nothing): this time the
  electrified-water note itself came first. Shows the right note CAN be found, not that the original
  wording now finds it. Stays open; next step is clearing the cache and asking the exact original words.
  Evidence `docs/test-evidence/plan61-W3-D-blackmesa.json`, `docs/test-evidence/plan63-BLACKMESA-WATER-NOTES.json`.
  **Asked again 2026-09-23 with the exact original words, better but not fixed:** the electrified-water note
  is now attached and the answer is built on it (treat the floor like lava, cut the power, use crates as
  stepping stones), where on 2026-09-19 only the two generic notes showed. But the two generic notes are
  still attached too, still listed first, and the block header still names "Starting out in Black Mesa" —
  the same ranking shape as the Hollow Knight "no close match" bug above, where the right note is found but
  ranks behind generic ones. Evidence `docs/test-evidence/plan64-BLACKMESA-WATER.json`. **Asked again
  2026-09-23 with Black Mesa running: no change.** The notes, their order, the scores and the answer all
  matched the game-not-running run exactly — having the game running did not affect this bug either way.
  Evidence `docs/test-evidence/plan64-BLACKMESA-WATER-running.json`.

### Deck check owed

- ★ `[KB]` **Five checks from the August retrieval rework were never run on the Deck** — **VERIFY, or
  retire.** Covers the corpus format gate, the relevance floor, follow-ups, transparency, and the
  Developer kill-switch. **Update 2026-09-22:** four of the five now have real answers — the transparency
  check joined them that night, once the log finally named the attached notes (see the row below). Only
  the corpus-format check still cannot run, since that means replacing the library it tests. **Per D116
  #7, the corpus-format check is retired, covered by its own unit tests.** The other four are not all
  clean passes yet — the relevance floor and the follow-up check are each only half passed, so this entry
  stays open rather than moving to Done.
  [Detail](roadmap-details.md#five-checks-from-the-august-retrieval-rework-were-never-run-on-the-deck).
- ★★ `[KB]` **KB transparency matches what the model got** — **VERIFY, ran for the first time and passed,
  2026-09-22,** once the answer-lines lane added the missing log line — recorded as impossible every
  earlier time. Row **KB-TRANSPARENCY-01**, full run in [testing.md](testing.md). **All three attached
  names confirmed on the Deck 2026-09-23**: a Hollow Knight reply's open notes block named the same three
  notes, in the same order, as the log's own search and attach lines. Evidence
  `docs/test-evidence/plan64-KB-TRANSPARENCY-names.json`. **The game-running case passed too, 2026-09-23:**
  with Half-Life 2 running, the open block named Ravenholm, Combine soldiers and Hunter-Chopper, exactly as
  the log did, and the log named Half-Life 2 itself. Evidence
  `docs/test-evidence/plan64-KB-TRANSPARENCY-running.json`. **Still owed:** a case where a note is dropped
  for space. Tried with nothing running, then tried again 2026-09-23 with a game running and a
  troubleshooting question meant to produce a large Proton log — still could not be reproduced: 3 notes
  searched, 3 attached, none dropped, with a roughly 16,000-character prompt. The current library and log
  simply do not produce a drop; stays owed with these numbers on record. Evidence
  `docs/test-evidence/plan64-KB-TRANSPARENCY-starved.json`,
  `docs/test-evidence/plan64-KB-TRANSPARENCY-starved-try2.json`. **Sighting, 2026-09-23:** searching the
  notes by meaning took about 1,070 milliseconds with a game running (Black Mesa, then the first Hades
  question), against 22 to 60 milliseconds measured elsewhere with nothing running.
- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY,
  landed 2026-09-15, four commits, unit-tested.** A game known only by name now opens its box, and naming the
  boss up front keeps the answer in plain text. **STRAT-SPOIL-TEXT-01 and STRAT-SPOIL-FIRST-01 passed on the
  Deck**; two Hades rows failed on the name-withheld-boss bug above. **Still owed as of 2026-09-19:**
  STRAT-SPOIL-NAME-01 and DRG-01b, both blocked because their games keep falling off the Recent Games list.
  **DRG-01b passed on the Deck 2026-09-23:** with Deep Rock Galactic: Survivor running, the knowledge base
  off, masking on and no consent phrase, the boss tactics came back in plain text — no cover, no notes
  block, no knowledge-base search in the log, and no question-box trap on the way to Ask. STRAT-SPOIL-NAME-01
  is still blocked. Evidence `docs/test-evidence/plan64-DRG-01b.json`.
  [Detail](roadmap-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions).
- ★★ `[KB]` **The note's own words under the reply** — **VERIFY, third run 2026-09-19.** Header, open-scroll
  and live timing all pass; the upward walk lands cleanly on the block's header and the ladder walk holds up
  — the only stop still missing is the chip ladder inside the open block, its own bug above. Why the tip and
  one question in ten arrived late is now explained and fixed; a repeat check on the Deck 2026-09-19 showed
  no gap at all. Rows **NOTES-BLOCK-01**–**07**, **TEN-GAMES-01**, in [testing-manual.md](testing-manual.md).
### Next

- ★★★ `[KB]` `[reply]` **Check that a spoiler cover actually happened, instead of trusting the model to add one** — **OPEN, agreed by the maintainer 2026-09-21 for a follow-up session.** Today the plugin tells the model to hide spoilers and then trusts it. Nothing reads the reply back to see whether it did. That is why the same name-withheld boss question comes back covered some times and bare others: the follow-up menu's rule is repeated and stressed all through the instructions and that one holds, while the spoiler rule is said once. A device log from 2026-09-18 rules out the obvious explanation — the instructions fitted the model's window with room to spare, and the model's own thinking mentions wrapping the answer, yet the answer came back bare. Build the same kind of safety net the follow-up menu already has: when a reply names a protected thing in plain text and the turn's rules required a cover, hold it back or wrap it after the fact. Found while fixing the menu bug; full reasoning and the five causes ruled out are in that lane's landing commit. Blocks the ★★★ bug "a name-withheld boss question comes back with no spoiler box".
- ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch already built.** The answer test's voice
  switch landed 6 September. What's still owed is one run with it turned on, which wave three's main measurement
  run includes — planned as wave three ([48](planning/48-kb-wave-three-session.md)).
- ★★ `[KB]` **Eval tooling: the weight sweep, per-question results for what ships, a second right answer** — **OPEN,
  agreed 2026-09-01, sweep go-ahead 2026-09-05.** Nothing a user sees. The sweep runs on the tuning questions and decides
  the blend-weights bug above; the rest stops every card batch reading as a regression when two cards are both fair
  answers. No row uses the second-answer option yet. One to two days. (D51, D68)
- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, one measurement owed.** The
  slice of questions the word search cannot answer at all was 3 rows when last counted, before 36 more blind rows landed.
  Re-count it on the next search run before calling this closed. [Detail](roadmap-details.md#eval-fixture-cannot-see-a-recall-failure).
- ★★ `[KB]` **Pull the embedding model as part of installing the library** — **OPEN, added 2026-09-05.** A person who
  installs the library but never presses the pull button silently gets word search only, the weaker half by every
  measurement. A button and a one-time hint exist today; make the pull part of the download flow, with consent, never
  silent. Promoted out of Phase 7. One to two days.
- ★★ `[KB]` **A latency budget for a game question** — **OPEN, added 2026-09-05.** The slowdown above was only caught because
  one QA row happened to record a band. Write down the budget (embed time plus first token with a game running) so the next
  regression fails a check instead of relying on luck. Planned as wave three ([48](planning/48-kb-wave-three-session.md)).
- ★★ `[KB]` **A measured context-window experiment** — **OPEN, research, added 2026-09-05, re-measured 2026-09-06.** The
  Deck's model runs with a 4,096-token window and a Strategy question with cards already goes over it (now trimmed
  instead of dropped, see Done). Try 8,192 as a Developer experiment with a game running, recording memory and time to
  first token, before it becomes a setting. Agreed as "later, its own call". (D46)
- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.** Filed as
  "the tips don't use the words people type", which is true and is the smaller half. Measured 2026-09-07: **nine of ten
  ordinary problem sentences reach nothing at all** — *"my game keeps crashing"*, *"my game won't launch"*, *"black
  screen when I start the game"*. The word "crash" is deliberately classed as too weak to route a question on its own;
  that holds with a game running and not with nothing running. Next step: a floor under the tip search so it can say
  none fit, plus a "no tip for this" line. (D81, D85) Planned as wave three ([48](planning/48-kb-wave-three-session.md)).
- ★★★ `[KB]` **Spoiler coverage as a tiered setting** — **OPEN, tiers confirmed 2026-09-01.** Strict fences bosses, endings
  and chapters; default fences only named story beats and endings; open fences nothing you asked about. Naming a boss still
  unlocks it in every tier. Needs the settings plumbing, a prompt per tier measured on the answer test, a control with a
  focus entry, and Deck QA. About three days. (D50) [Detail](roadmap-details.md#spoiler-coverage-should-be-a-setting-with-tiers).
- ★★★ `[KB]` **"Starting out" cards get their own kind** — **OPEN, decided 2026-09-05, nothing built.** A new player gets
  a *"How do I get started in Fallout 4?"* chip and *"where do I start"* finds the card. One new kind in the validator and
  the two kind lists, one chip wording, a rescue phrase list, a rebuild; then re-type the three cards filed as mechanics and
  write the Cyberpunk, Fallout 4 and Red Dead ones you asked for. Rides the bundled release. (D65)
  [Detail](roadmap-details.md#the-corpus-has-no-starting-out-card).
- ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the 139 prose cards as labelled short
  lines, the shape the 16 structured cards use. Facts kept is already 92%, so the ceiling is low; do it only if the answer
  test shows the labelled shape scores better. Two to three days of content plus a rebuild.
- ★★★ `[KB]` **Deeper answer checks** — **OPEN, added 2026-09-05.** The answer test checks facts, contradictions, fences and
  the menu, and cannot see whether a reply was helpful or whether the model admitted not knowing. Add a small set of
  questions no card can answer, scored for an honest "I don't know", and a read by a person of ten replies a month.
- ★★★ `[KB]` **The next corpus release carries everything that needs a rebuild** — **OPEN, added 2026-09-05.** Any format
  change makes every installed library stale until re-downloaded, so per-game tips, the starting-out kind and the style pass
  ride one release rather than three. Same format as today for anything that can wait.
- ★★★ `[KB]` **KB visual maps** — **OPEN.** Two shapes you named 2026-08-29: a dungeon map, and a boss outline with weak
  points marked. Nothing draws anything in a reply today. A dungeon map has to be authored, which sits behind the source
  policy and a corpus rebuild. Research first. [Detail](roadmap-details.md#kb-visual-maps).
- `[KB]` **Idea for wave four: dungeon maps** — raised by the maintainer 2026-09-07, no stars and no plan yet. Picks up
  the dungeon-map half of the visual-maps idea above when the time comes.
- ★★★★ `[KB]` **RAG Phase 4: extended retrieval** — **PARTIAL.** The chip guarantee and 16 structured cards shipped
  2026-08-19; the split was accepted 2026-08-21 and prose replies were accepted 2026-09-05 (D67). Left: per-game Deck tips (content for seven titles collected, two quirks from
  your own Deck), which need a format bump and a release — see the release entry above. Two to three days. The chip
  clipping check waits on the preset-row work. [Detail](roadmap-details.md#rag-phase-4-extended-retrieval).
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** 133 → 161 cards since 2026-08-29. Eleven of the
  thirteen titles still have no enemy or item cards, so "how do I deal with X" works for two games. Next: 40–60 entity cards
  in tranches with a quality read from you after the first; then chip ranking by meaning. Card authors cannot write blind
  test questions, so content and eval rows go in separate sessions. [Plan](planning/28-phase5-corpus-depth.md).
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get cards; today they get nothing specific. New card kinds and a spoiler table update, Left 4
  Dead 2 first, then Counter-Strike 2, from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md).
- ★★★★ `[KB]` **RAG Phase 7: retrieval infrastructure** — **OPEN.** Mostly nothing at 161 cards. What still matters: a
  thumbs-down that stops a wrong card coming back (three days), add-on packs before any large catalog (five days or more),
  a screenshot feeding the search (a short test to find out first). A nearest-neighbour index buys nothing until the corpus
  is thousands of cards. The embedding-model pull is its own entry above. [knowledge-base.md](knowledge-base.md) § Phase 7.
- ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed card with
  one press: **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days.
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's
  games real notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice.
  Months of work — needs a wiki-ingestion pipeline, licensing, a size budget, packs and an index. **As of
  2026-09-18:** the source study is done, the first ten games are written from cleared wiki sources, the
  library is at 35 games, and landing them reopened the no-new-games lock (D111). [Detail](roadmap-details.md#rag-phase-8-catalog-corpus).

---

## Shelved

Parked on purpose, not dropped. One line each, with what unshelves it; the full entries are in
[archive/roadmap-shelved.md](archive/roadmap-shelved.md).

- ★ `[platform]` **In-IDE preview never gets past its loading screen** — shelved 2026-09-11 (D93), not a gate
  for anything. Unshelves when the preview loads the plugin on the maintainer's machine.
- ★★ `[ui]` **Glance view: the answer alone, in big text** — shelved 2026-09-12: too much UI change, and not
  ready for it yet. Unshelves on the maintainer's word; the mockup is kept.
- ★★★ `[KB]` **KB download Cancel, the Deck check** — shelved 2026-09-19 (D113). The download finishes in
  about a second, too fast to press Cancel in. Unshelves when a throttle or a slower test copy exists.
- ★★★ `[voice]` **Voices for the bundled characters** — shelved 2026-09-08 (D74). Unshelves after the
  character sweep, a legal check and the open licence call.
- ★★★ `[voice]` **Trained voices for the bundled characters** — shelved with the clip route 2026-09-08 (D74).
  Same legal gate, plus the plugin hosting voice files for the first time.
- ★★★★ `[voice]` **A voice for a custom character** — shelved with the bundled voices 2026-09-08 (D74). Same
  legal gate.
- ★★★★★ `[platform]` **Global quick-launch macro** — shelved 2026-09-19 (D113), the maintainer said drop it.
  Never run on hardware. Unshelves on the maintainer's word.

---

<a id="done-for-v050"></a>

## Done for v0.5.0

Everything shipped since v0.4.9 (2026-07-08), one line each — moved out to its own file to keep this one small,
copied line for line, nothing reworded: [archive/roadmap-done-v0.5.0.md](archive/roadmap-done-v0.5.0.md).

Newest first. Everything closed from 2026-09-16 onward was moved into that file on 2026-09-21, copied
line for line, nothing reworded, to keep this document under its size limit.

**Closed 2026-09-23 (plan 64, flow G, proven on the Deck):**

- ★ `[ollama]` **Typing a made-up model name and pressing Pull said the pull started, not that it was
  refused** — **DONE, confirmed on the Deck 2026-09-23:** the toast now names the tag and suggests real
  ones; nothing downloaded, and a real typed name still downloads. [Full
  detail](archive/roadmap-bugs-fixed.md#typing-a-made-up-model-name-and-pressing-pull-said-the-pull-started-not-that-it-was-refused).
- ★★ `[ollama]` `[KB]` **Pressing Done on a popup could write old values back over something the back end
  had just changed** — **DONE, confirmed on the Deck 2026-09-23:** with a download saved to the SD card,
  a switch and Done on the AI models screen no longer wrote the old, deleted location back over it. [Full
  detail](archive/roadmap-bugs-fixed.md#pressing-done-on-a-popup-could-write-old-values-back-over-something-the-back-end-had-just-changed-including-a-knowledge-base-location).

**Closed 2026-09-23 (plan 64, flow H, proven on the Deck):**

- ★ `[focus]` **The ring is lost when an answer finishes while you are walking it** — **DONE, confirmed on
  the Deck 2026-09-23:** after an answer finishes, the ring now stays on the same section instead of
  vanishing, and the view no longer jumps to the end. Two small notes for later: right at the finish the
  section's own top few pixels sit under the tab bar, and the view briefly reads its old position for one
  frame before settling. [Full
  detail](archive/roadmap-bugs-fixed.md#the-ring-is-lost-when-an-answer-finishes-while-you-are-walking-it).
- ★ `[KB]` **After downloading the knowledge base onto the SD card, the section still read "Not installed"
  for about a minute** — **DONE, confirmed on the Deck 2026-09-23:** the section now reads Installed within
  half a second of the download finishing, without leaving the tab. Left over: when the storage picker
  closes, the ring still jumps up to the Ollama tab's own icon instead of staying in the pane — the same
  rebuild, not yet fixed. [Full
  detail](archive/roadmap-bugs-fixed.md#after-downloading-the-knowledge-base-onto-the-sd-card-the-section-still-read-not-installed-for-about-a-minute).
- ★ `[KB]` `[layout]` **Opening the "From the notes" block does not scroll it into view** — **DONE,
  confirmed on the Deck 2026-09-23:** opening the block now brings its header right to the top of the pane,
  showing about 40% of a three-note block instead of 17%. [Full
  detail](archive/roadmap-bugs-fixed.md#opening-the-from-the-notes-block-does-not-scroll-it-into-view).
- ★ `[ollama]` **A model already installed on the Deck had no row unless Essentials only was turned off** —
  **DONE, confirmed on the Deck 2026-09-23:** with a non-essential model installed, its row, star and
  Remove now show on the AI models screen without opening Filters. [Full
  detail](archive/roadmap-bugs-fixed.md#a-model-already-installed-on-the-deck-had-no-row-unless-essentials-only-was-turned-off).
- ★ `[ollama]` **Pulling a typed-in model name closed the AI models screen and threw away an unsaved
  Advanced switch change** — **DONE, confirmed on the Deck 2026-09-23:** turning the high-VRAM switch on,
  then pulling a typed name, now keeps the switch on when the screen is reopened. [Full
  detail](archive/roadmap-bugs-fixed.md#pulling-a-typed-in-model-name-closed-the-ai-models-screen-and-threw-away-an-unsaved-advanced-switch-change).
- ★ `[ollama]` **Pulled models join the model try order** — **DONE, confirmed on the Deck 2026-09-23:** a
  pulled model joins the bottom of the saved order normally, and with the high-VRAM switch on and an order
  already saved, a large pulled model now goes to the top of it, the rest kept behind it. One open question
  for the maintainer: the try-order screen showed the big model last and greyed as licence-blocked, while
  the saved order itself had it first — the two disagree and nobody has said which should win. [Full
  detail](archive/roadmap-completed.md#pulled-models-join-the-model-try-order).
- ★ `[ollama]` **Removing a model did not take it out of the saved try order** — **DONE, found, fixed and
  confirmed on the Deck the same night, 2026-09-23:** removing a model through its row now drops it from
  the saved order too, instead of leaving Ask's first choice pointing at a model that is gone. [Full
  detail](archive/roadmap-bugs-fixed.md#removing-a-model-did-not-take-it-out-of-the-saved-try-order).
- ★ `[platform]` **VAC check (`bonsai:vac-check`) on-device QA** — **DONE, confirmed on the Deck
  2026-09-23:** all four remaining checks passed with the maintainer's own Steam key — a real account
  number, a profile link, and a vanity link that correctly asks for the number instead; with the permission
  off, it says so and names the switch. The "nothing reached Valve" half is a weaker proof than it sounds —
  the plugin log never names that request even when it is made, on or off. [Full
  detail](archive/roadmap-completed.md#vac-check-bonsaivac-check-on-device-qa).
- ★★ `[ollama]` **After a plugin reload, the Ollama tab said "Could not reach Ollama" and offered Install
  Ollama while Ollama was answering questions the whole time** — **DONE, confirmed on the Deck 2026-09-23:**
  after a reload the tab reads Update AI & models, never Install Ollama, on every read. The plugin's own log
  still writes one false connection-failed line right at start-up, before settings finish loading — filed
  as its own small bug, above. [Full
  detail](archive/roadmap-bugs-fixed.md#after-a-plugin-reload-the-ollama-tab-said-could-not-reach-ollama-and-offered-install-ollama-while-ollama-was-answering-questions-the-whole-time).
- ★★★★ `[ollama]` **Speed-mode VRAM preload** — **DONE for the timing check, confirmed on the Deck
  2026-09-23:** with the warm-up switch on, an Ask model under the size cap now loads ahead of time and
  answers 2.3 seconds sooner (7.72s against a cold 10.05s), with no second load of it. Still owed and not
  covered by this: the memory-pressure case and whether a warmed model survives the Deck sleeping
  (`testing.md`'s PRELOAD-02 row, still open). [Full
  detail](archive/roadmap-completed.md#speed-mode-vram-preload).

