# Plan 79 — release wave six: the last session before 0.6.0

**Status: RUNNING since 2026-10-02, about 02:00, in a new chat on Opus extra-high. The log at the end says where
things stand.**

Asked for by the maintainer: "Final session before v0.6.0 … a massive bug fix session as a follow-up from last
night … in addition to those bugs, I want these features implemented … 15 subagents going at the same time … do an
automated QA pass … I hope it doesn't require me to babysit … If I don't respond, I may have fallen asleep, try and
plow ahead as best you can."

Part of [plan 71](71-merge-experimental-into-main.md), Stage B. How a bug wave is run is written down in
[the runbook](../agents/bug-wave-runbook.md); this plan says only what is different this time. Everything lands on
the working branch. Nothing is pushed.

## The short version

1. **Now, while the Deck is free:** the rig reproduces each of the ten bugs you found last night and measures it.
   Three of them are D-pad bugs that must be measured before anyone tries a fix.
2. **At Go:** fifteen helpers start. Bugs with a known shape, the small features, and the drawings for the features
   that need your pick.
3. **As measurements come in:** the D-pad and layout bugs get their helpers.
4. **As your picks come in:** the drawn features get built. A drawing with no pick follows the rule in
   [Your calls](#your-calls-for-this-session).
5. **After the landings:** one build goes on the Deck and every fix and feature is checked, then the older owed
   checks, then a walk-through of the whole Main tab with and without a game.
6. **The end:** a report to your phone, the roadmap up to date, the Deck left as found.

## Your calls for this session

Made by the maintainer on 2026-10-02, while planning. To be written into the locked decisions file as the next
free number at Go.

1. **Fifteen helpers at once.** The house limit was ten.
2. **How wide: everything.** Every bug below and all twelve features. The two behind-the-scenes reshapes (the
   settings list, the build tidy-ups) go last, each behind its own gate, and are dropped if not clean. This sets
   aside the release plan's rule of no new features and no reshaping after the last call. The release waits for a
   clean Deck pass and the first-install check on the final build.
3. **A drawing with no pick.** The three small ones (Delete icon, chip highlight, calmer rating choices) are built
   with the session's recommended choice; they are easy to swap afterwards. The three big ones (opening
   "N earlier", the Show details line above the question box, folding "Models & routing" into the AI models box)
   wait for the pick and stay as drawings if none comes.
4. **If the Deck gets trapped or frozen while the maintainer is away,** the session may restart Steam on the Deck
   by itself, and reboot the Deck over the network if Steam's restart does not bring Quick Access back. Only after
   everything about the trap has been recorded. Never a password: if either step asks for one, the session sends a
   phone notification and waits.
5. **The starter models, once "Install options…" is gone: both places.** A first "Install Ollama" on a Deck with
   no models offers the starter models in the same box, asking first, with the ring on "Not now". Browse models
   also gets one "install the starter set" button.
6. **"Summing up offers a fresher title":** the Sum up button offers a title, **and so does the summary a chat
   makes by itself**. The offer sits on the summary card. A title typed by hand is never second-guessed. The chat
   is never renamed without a yes.
7. **Where it runs:** a new chat on Opus extra-high, not the planning chat (which is on Fable).
8. **Hard bugs go to an Opus medium helper.** Everything else is Sonnet high, or Sonnet medium when mechanical.
9. **Two add-ons from last night's open questions:** a button pressed under an answer keeps that answer's game
   (so its spoiler covers stay), and a game offers ten of its own chips where it offered six.
10. **The Deck otherwise:** the same rules as last night (plan 78, call 4): the test chat only, and the oldest
    chat may be deleted if there is no spare slot, its file copied aside first.

## Where things stand

- Last night's wave (plan 78) fixed 22 bugs. Most are proven on the Deck.
- Your own checks last night found **ten new bugs**. Three are three-star D-pad bugs, and one of those needed a
  Steam restart to get out of.
- Two of your four release checks are done (Clear while an answer arrives: passed; the real microphone: partly,
  two new bugs). **Two are still yours:** the parental lock, and the first install.
- The working branch is clean and its quick check passes (checked while planning, tip `e4c6c655`).
- The Deck answers on the network, Ollama is up on it, and no other chat is driving it. The controller board
  answers on this PC; whether its lead reaches the Deck is the first thing the Deck helper checks.

## What to focus on first

1. **The trap after picking a setting from the search list.** Down could not get past the answer and only a Steam
   restart cleared it. It is the only open bug that traps a player, which is the first rule of the release line.
2. **The highlight going invisible on the Ollama tab.** A new player sets up their AI on that tab in their first
   ten minutes, with no sign of where the ring is. You say it keeps coming back, so the older fixes are read first.
3. **The ring around the whole Show details block.** It looks plainly broken on the main screen every time.
4. **The spoken-question bugs** (doubled words, the X that will not clear). Voice is one of the things the
   re-launch shows off.
5. **"undefined" inside a spoiler cover.** Small, but it is the word "undefined" on the main screen.
6. **Removing "Install options…".** It is small, but it changes the path a new player takes, so it must be built
   early and be on the Deck long before your first-install check.
7. **The drawings.** Five features cannot be built until you pick from a drawing. They are drawn in the first
   hour so your pick can come from your phone.
8. **Then everything else,** in the order of the tables below. The two reshapes come last.

## The sort

### Bugs to fix this session

| # | The bug, as a player sees it | Stars | Needs the Deck measured first? | Helper |
|---|---|---|---|---|
| 1 | After picking a setting from the search list, Down cannot get past the answer; only a Steam restart clears it | ★★★ | **Yes** | Opus medium |
| 2 | The highlight goes invisible on the Ollama tab, one Down from "Update AI & models" | ★★★ | **Yes** | Opus medium |
| 3 | In Show details, the ring sits around the whole block instead of one chip, and jumps | ★★★ | **Yes** | Opus medium |
| 4 | A spoiler cover cut off by Clear shows "undefined" when opened | ★★ | No | Sonnet high |
| 5 | After a spoken question and Stop, the X on the Ask bar does not clear the question | ★★ | No | Sonnet high |
| 6 | A spoken question sometimes comes out with its words doubled | ★★ | No (tested with recorded sound on this PC) | Sonnet high |
| 7 | Up and Down between the rating choices and the speaker button go to the wrong place | ★★ | **Yes** | Sonnet high, the same helper as "calmer rating choices" |
| 8 | Down from "N earlier" stops on the question's Retry button | ★★ | **Yes** | Sonnet high |
| 9 | In the AI models box, the top model is half hidden after going down and back up | ★★ | **Yes** | Sonnet high |
| 10 | The bronze note card touches the suggestion chip, with no gap | ★ | **Yes** (a quick one) | Sonnet medium |
| 11 | A power question's answer often has no number in it | ★ | No (tested on this PC's copy of the Deck's model) | Sonnet high; lands only if a before-and-after run shows it better |
| 12 | Underlined game words are stops walking Down but skipped walking Up | ★ | Measured 2026-10-01 | Opus medium, **only if there is room**: it sits in the most fragile file, which is at its size limit |
| 13 | With one game running and an answer about another, a button pressed under that answer goes back to the running game's notes and can drop the spoiler covers | ★★ | No | Sonnet high (your add-on) |

A fix that fails on the Deck twice moves up one step (Sonnet high to Opus medium, Opus medium to Opus high), with
the measurement in hand. A third failure waits for you.

### Features, sorted by how safe they are today

**Ready to build at Go** (no pick needed):

| Feature | Helper | Note |
|---|---|---|
| Icons on the "Update knowledge base" and "Remove" buttons | Sonnet medium | Mechanical |
| "Remember what I typed" becomes one on/off switch | Sonnet high | On = All, off = None, a saved "Search" becomes off. Settings plumbing, so the session reads it closely |
| Remove the "Install options…" button | Sonnet high | With the starter models offered elsewhere (call 5), so a fresh Deck is never left without one-press starter models |
| Summing up offers a fresher title | Sonnet high | Wording tested on this PC's copy of the Deck's model first; never renames without a yes |
| Long suggestion chips: pause at the end, centred text | Sonnet high | Two of the three parts. The new highlight waits for your pick |
| A chat's Save and Delete buttons show only while its tab has the ring | Sonnet high | The Delete icon waits for your pick |
| Calmer rating choices under an answer | Sonnet high | A before-and-after drawing goes to your phone. Also a list of other loud spots, as you asked: a list, not changes |
| A game offers ten of its own chips, not six | Sonnet medium | Your add-on. One number and the tests that expect six |

**Need your pick from a drawing** (drawn in the first hour, true size, from the real screen code):

| Drawing | What you pick | Built without a pick? |
|---|---|---|
| Delete icon choices | One icon | Yes, the recommended one |
| Long chip highlight styles | One style, replacing the underline | Yes, the recommended one |
| Calmer rating choices, before and after | Fine, or calmer still | Yes, the recommended one |
| Opening "N earlier" in a long chat | One of four ways (a few at a time, grouped, behind the summary, a filter line) | **No** |
| Folding "Models & routing" into the AI models box | Where each piece goes | **No** |
| The Show details line taking the chip's place while reading an answer | The swap, shown in motion | **No** |

**Behind the scenes, nothing a player would see, built last:**

| Job | The risk | The gate |
|---|---|---|
| The settings list written once instead of seven times | It touches about fifty settings in the code that saves them. A slip here loses a player's settings, which is on the release line | A test that changes every setting, saves, reloads and reads each one back, written first and passing before and after. Then a Deck check of the same thing. If either is not clean, it is not landed |
| Four small build-setup tidy-ups | One of them changes how a part of the repo installs its packages. Every helper's copy shares one packages folder, so this cannot run while helpers are working | It runs last, alone, after every helper has finished, and the full check must pass |

### Not this session, and why

- **Yours to check by hand:** the ghost tab bar after touching the screen; the chips' colour, underline and look;
  the parental lock; the first install.
- **Already accepted for 0.6.0:** the summary card behind the dock; the ring looking slightly different from
  Steam's own.
- **For after the release, as the roadmap says:** the step that lifts a control 80 px too far; a tall section
  showing only a sliver when walking Up; the unused live-line trimming code; folding the four chip styles into one.
- **Waiting on a call from last night's list:** rewording the AI's instructions about hidden blocks; holding a
  sentence back until its cover is known.
- **Needs a new library release that only you can publish:** the library's ranking bugs.
- **Lives in the Deck tool, not in bonsAI:** the walk check calling a stop hidden behind a corner icon.
- **Cannot be made to happen on purpose:** a plugin reload putting Steam's Home in front of a game. The Deck
  helper's rule stays: never reload the plugin under a running game.

## Fifteen helpers at once: how feasible

**It works for the first hour or two, then the number falls by itself.** There is enough separate work to start
fifteen. After that, these are the real limits:

1. **Six bugs wait for a Deck measurement, and five features wait for your pick.** Only about thirteen jobs can
   start at Go. The rest start as measurements and picks arrive.
2. **Four screens hold most of today's work,** and two helpers cannot change the same file at the same time. Jobs
   on the same screen run one after another (the chains are listed below). That caps the true side-by-side count
   at about ten code jobs at any moment; the other slots go to drawings, the checks list, the Deck helper and the
   bookkeeper.
3. **Every change is read by the one running the session and landed one at a time.** That is the rule that caught
   two bad fixes last night. Fifteen helpers finishing close together means a queue of two to three hours of
   landings. The Deck work carries on during the queue, so the time is not lost.
4. **The usage allowance.** Fifteen helpers use it about half again as fast as last night's ten. If it runs out,
   every helper stops at once until it resets; the session then restarts by itself and each helper carries on
   from where it was. Nothing is lost, but there may be a pause of an hour or more in the middle of the night.
5. **Disk:** 78 old helper copies are still on this PC, and tonight adds about twenty. There is room (136 GB free).

**The Opus medium helper** did not exist. Its file was added while planning
(`.claude/agents/bugfix-lane-opus-medium.md`), a copy of the Opus high helper with only the effort changed. A new
chat can use it straight away, which is one reason the session runs in a new chat.

## Who does what, and what runs side by side

The one running the session writes no code. It writes the briefs and the Deck checks, reads every change before
landing it, lands, reads every Deck failure, and decides anything unclear.

### At Go: fifteen

| # | Job | Helper |
|---|---|---|
| A | "undefined" in a spoiler cover (bug 4) | Sonnet high |
| B | The X that does not clear after a spoken question (bug 5) | Sonnet high |
| C | Spoken words doubled (bug 6) | Sonnet high |
| D | A power answer with no number (bug 11) | Sonnet high |
| E | Icons on the knowledge-base buttons | Sonnet medium |
| F | "Remember what I typed" as one switch | Sonnet high |
| G | Remove "Install options…", starter models offered elsewhere | Sonnet high |
| H | Summing up offers a fresher title | Sonnet high |
| I | Long chips: pause at the end, centred text | Sonnet high |
| J | A chat's Save and Delete buttons only with the ring | Sonnet high |
| K | Drawings, the three small ones: Delete icons, chip highlight, calmer rating choices | Sonnet high, no code lands |
| L | Drawings: opening "N earlier", and folding "Models & routing" | Sonnet high, no code lands |
| M | Drawing in motion: the Show details line taking the chip's place | Sonnet high, no code lands |
| N | The checks list: every owed check the rig can run, as exact steps | A read-only lookup helper |
| O | The Deck helper: setup, then the measurements | Sonnet medium, one at a time, a fresh one per block |

The bookkeeper (Sonnet medium) takes the checks list's slot when it finishes. The next two free slots go to your
add-ons: **AE**, a button under an answer keeps that answer's game (Sonnet high, back end only), and **AF**, ten
of a game's own chips (Sonnet medium).

### As measurements arrive

| # | Job | Helper | Starts after |
|---|---|---|---|
| P | The trap after picking a setting (bug 1) | Opus medium | Its measurement, and after helper B has landed (same screen) |
| Q | The invisible highlight on the Ollama tab (bug 2) | Opus medium | Its measurement, and after helper G has landed (same tab) |
| R | The ring around the whole Show details block (bug 3) | Opus medium | Its measurement |
| S | The rating row: Up and Down to the speaker, and the calmer look (bug 7 and a feature) | Sonnet high | Its measurement |
| T | Down from "N earlier" landing on Retry (bug 8) | Sonnet high | Its measurement |
| U | The AI models box's top row (bug 9) | Sonnet high | Its measurement, and after helper Q |
| V | The gap above the suggestion chip (bug 10) | Sonnet medium | Its measurement |

### As your picks arrive

| # | Job | Helper | Starts after |
|---|---|---|---|
| W | The Delete icon | Sonnet medium | Helper J |
| X | The chip highlight | Sonnet high | Helper I |
| Y | Opening "N earlier" | Sonnet high | Helper T (same screen) |
| Z | Folding "Models & routing" into the AI models box | Sonnet high | Helpers Q and U (same tab) |
| AA | The Show details line in the chip's place | Opus medium: it is layout, D-pad and chips at once | Helpers R, X and Y |

### Last

| # | Job | Helper | Starts after |
|---|---|---|---|
| AB | The settings list written once | Sonnet high; the session reads every line | Helper F (same file), with its read-back test first |
| AC | Underlined words walking Up (bug 12), if there is room | Opus medium | Helper S, T and Y (same area) |
| AD | The four build tidy-ups | Sonnet medium | Everything else has landed and no helper is running |

### The chains: what cannot run side by side

- **The question box:** B, then P.
- **The chat area:** T, then Y, then AA. V is a spacing change only and can land any time.
- **The row under an answer:** S alone (the D-pad fix and the calmer look are one helper, two commits).
- **The Ollama tab:** G, then Q, then U, then Z.
- **The settings code:** F, then AB.
- **The chip row:** I, then X, then AA.
- **The chat row:** J, then W.
- **Show details:** R, then AA.
- **What the AI is told:** D and H both test on this PC's one copy of the Deck's model, so their test runs take
  turns. D lands only if its before-and-after run is better and nothing else is worse.
- **Which game an answer belongs to:** AE alone; it starts from last night's spoiler fix (`27bab7dc`).
- **The game's own chips:** AF changes the library side only; I, X and AA change how a chip is drawn.
- **The Deck:** one driver at a time.
- **Landings:** one at a time, back end before screen changes. The bookkeeper does not commit while a landing runs.

## The Deck plan

**Standing rules for the Deck helper** (from last night): read what has the highlight before every A; never A as
the last press of a run of presses; questions only in the named test chat; never reload the plugin while a game is
starting, and with one running only as a last resort and never under 2,000 MB free; a new build goes on only with
no game running; every command is exactly `ssh deck@<address> '<command>'`; one evidence file per check, named
`plan79-<ROW>.json`.

**Block 0, setup (now).** Check no other session is driving. Keep the Deck awake. Note which screen is live.
Save a copy of the settings and the chats. Confirm the build. Check the parental lock is off and which games are
on Recent Games. **Send one press and confirm the Deck saw it** (last time the board's lead was not connected).
Find or make the test chat.

**Block 1, measurements (now, before any fix).** Each of your ten bugs is reproduced exactly as you described it
and measured: what has the ring, where it is drawn, what each press does. A bug the rig cannot reproduce is
reported as such, with what was tried.

| Bug | What is measured |
|---|---|
| 10. Bronze card and chip | The gap between the card's bottom and the chip's top, in pixels |
| 7. Rating choices and the speaker | Where Up and Down land from each choice and from the speaker |
| 8. "N earlier" and Retry | Each stop from "N earlier" downward, and whether Retry is one |
| 9. AI models box | The top model's place against the title bar after down-then-up |
| 3. Show details chips | The ring's box at each press against each chip's box |
| 2. Ollama tab | What owns the ring after each Down from "Update AI & models", and whether anything is drawn. Other tabs walked the same way |
| 4. "undefined" | The saved chat's own text for the cut-off answer (read, not pressed) |
| 5. The X after Stop | With recorded sound in place of the microphone: the box's text before and after X |
| 1. The trap | **Last in the block.** Pick a setting from the search list, then walk Down. If it traps, everything about the ring is recorded before anything is done to get out |

**Then, still before the fixes land:** the owed checks that do not depend on tonight's work. The four lost to
last night's freeze (two chips side by side, reduced motion, the slow-start lines, the one-line chip). The four
small D-pad boxes from an old check. "A chat opened in a game shows that game first" on the summary card. The
frame rate inside a mission, if a game's window comes to the front. The named-boss spoiler check, if its game is
on Recent Games. A walk-through of the Main tab, with and without a game, as the "before" picture.

**Block 2, after the landings:** one build goes on, then one check per fix and feature. What a pass looks like:

| Change | A pass on the Deck |
|---|---|
| The trap (1) | The same route as the measurement, five times: Down walks past the answer to the question box every time, and one ring is drawn on one control |
| Ollama tab highlight (2) | Every Down and Up on the Ollama tab shows a ring on screen; the same walk on every other tab |
| Show details ring (3) | Every press puts the ring on exactly one chip; its box matches the chip's box within 2 px |
| "undefined" (4) | A cut-off answer that ends inside a cover opens to the words that had arrived, or the cover is not drawn; the word "undefined" is nowhere on the page |
| X after Stop (5) | Recorded sound in, Ask, Stop, X: the question box is empty |
| Doubled words (6) | The same recorded sentence five times: no stretch of words appears twice. **Your real microphone is the final check** |
| Rating row (7) | Up from "Bad info" lands on "Helpful"; Down from the speaker lands on "Wrong game or topic"; the full walk both ways has no dead press |
| Retry (8) | Up and Down never land on Retry; Left from the question lands on it |
| AI models box (9) | After down to the bottom and up to the top, the first model's whole row is below the title bar |
| Gap (10) | The card and the chip are apart by the agreed gap |
| Power answers (11) | Not a Deck check: the before-and-after run on this PC |
| Icons | Both buttons show an icon; the D-pad route around them is unchanged |
| "Remember what I typed" | One switch; off clears nothing already saved wrongly; a Deck that had "Search" saved shows off; the setting survives a restart of the plugin |
| "Install options…" gone | The button is gone; the D-pad walk of the Ollama tab has no dead stop where it was; the starter models can still be had in one press |
| Fresher title | Sum up on a chat whose title is stale offers a new title; "keep" changes nothing; a yes renames the chat everywhere it shows |
| Long chips | A long chip scrolls to its end, stands still for the agreed pause, then leaves; the text is centred |
| Save and Delete | Shown only while the chat's tab has the ring; both still reachable and working with the D-pad |
| Calmer ratings | Measured colours match the drawing; the D-pad walk unchanged |
| Settings list written once | Every setting changed on the Deck, the plugin restarted, every one read back as set |
| A button under an answer keeps its game | With Deep Rock running, a Hollow Knight boss answer, then a choice button and a refine chip under it: both follow-ups keep Hollow Knight's notes and come back with covers; a typed follow-up that names no game still goes to Deep Rock |
| Ten game chips | With a game running, ten different chips of the game's own are seen before one repeats |

**Block 3:** second rounds for anything that failed. The ten bugs run again exactly as in block 1. The
walk-through of the Main tab with and without a game, which every Main-tab change owes. The checks for whatever
was built from your picks.

**Block 4, the end:** a smoke test on the final build. Then everything is put back: settings, chats, the normal
build, pinned test chips cleared, no game running. The Deck is left ready for your two remaining checks.

**What the rig cannot do, so these stay yours:** speak into the microphone; press twice in under half a second;
judge a colour or a look; use the touch screen; lock the parental controls.

## Running without a babysitter

- **New bugs.** Every new bug goes on the roadmap and into the report. One that crosses the release line is fixed
  this session. Anything else gets one helper round of about an hour, as you asked; if that fails it stays on the
  roadmap.
- **New things to check** go into Verify with the name of their check, and onto your checks page if only you can
  do them.
- **Questions** go into the list below with the safest choice taken meanwhile. You get a phone notification only
  when something is truly blocked.
- **Your picks.** Each drawing's link reaches your phone as soon as it is ready. A reply of one line is enough
  ("Delete icon 2, highlight B").
- **If the build cannot be put on the Deck,** you get a notification saying "run setup-dev". It is a five-second
  fix on your side.
- **The usage allowance.** A timed check wakes the session every 20 minutes and restarts it after a reset. A
  message from you ("continue") also wakes it.
- **If the Deck gets trapped or frozen:** the session records what it sees, then restarts Steam, then reboots
  the Deck if that did not help (call 4). It never types a password.
- **Never:** push, merge to main, switch branches in the shared folder, stage everything, type a PIN or password,
  press anything on the Deck outside a written check, reload the plugin under a running game.
- **Progress** goes into the log below after every landing and every Deck block, and is committed, so a look from
  your phone shows where things stand.

## Keeping the roadmap current

After every landing, a fixed bug or built feature moves to Verify, naming the check it owes. After every Deck
pass, a pass moves to Done with its evidence file, and a failure goes back with what was seen. The testing
documents change in the same commit. The bookkeeper does the typing from result lists copied from the evidence
files' own words; the session spot-checks each of its commits against the evidence. The first sweep also moves
"Clearing a session while an answer is still being written" to Done: your hand check passed it last night.

## For your attention

1. **Today is the last-call date in the release plan.** That plan says: after the last call, only bugs that
   cross the release line go in, and no reshaping of code, because new features and reshapes are what turn up new
   bugs late. This session adds twelve features, two of them reshapes. It is your call to make, and the plan above
   follows it, but it does mean the release should not go out until this session's Deck pass is clean and your
   first-install check is done on the final build.
2. **Removing "Install options…" changes the first ten minutes.** Do your first-install check after this session,
   on its final build.
3. **Two of your four release checks are still owed:** the parental lock and the first install. From the
   microphone check, one thing was not reported: where the ring landed after Stop.
4. **Three features will not be built unless your pick arrives** (opening "N earlier", the Show details line, the
   "Models & routing" fold). If you are asleep, they end the night as drawings. One line from your phone is
   enough to start each.
5. **The settings reshape is the riskiest job on the list** and gives a player nothing. It is gated, and "not
   landed, here is why" is an acceptable result.
6. **The spoken-question fixes cannot be fully proven without you.** The rig feeds in recorded sound; the doubled
   words were heard on the real microphone.
7. **Start it in a new chat on Opus extra-high.** The plan and the new helper file were committed
   while planning, on the working branch; nothing is pushed.
8. **Eleven of last night's thirteen questions are still open** (plan 78); two were answered today (call 9). None
   of the rest blocks tonight.
9. **A fresher title offered by the automatic summary** (call 6) shows an offer at a moment you did not ask for
   one. It stays quiet: one line on the summary card, nothing pops up. Say so if it turns out to nag.
10. **About 100 old helper copies of the repo** will be on disk after tonight. They wait for your word to delete.
11. **Nothing is pushed.** Pushing the working branch is yours, as usual.

## How to start

For the chat that runs this plan.

1. Confirm the chat is on Opus extra-high. If it is not, say so in one line and carry on.
2. Read [AGENTS.md](../../AGENTS.md), [the runbook](../agents/bug-wave-runbook.md),
   [the lessons](../lessons-learned.md) and this plan. Last night's plan (78) has the Deck helper's handover
   rules and the evidence file's shape.
3. `git status`, and the tail of the decisions file. This plan and
   `.claude/agents/bugfix-lane-opus-medium.md` are already committed. Write "Your calls" into the decisions
   file as the next free number, and raise the helper limit in AGENTS.md from ten to fifteen for this session.
4. Start the timed check that wakes the session every 20 minutes.
   **Keep both machines awake all night (the maintainer, 2026-10-02).** Both holds were taken at 01:50 while
   planning. This PC: `scripts/keep_awake.py --hours 16` is running as its own process and ends by itself about
   17:50; check it is still running, and start it again if not. The Deck: the rig's stay-awake hold lasts eight
   hours at most and runs out at 09:50, so take it again at every Deck block and whenever the timed check finds
   less than two hours left. Release the Deck's hold at the very end, and only then.
5. Start the Deck helper on block 0, then block 1. Nothing else may drive the Deck.
6. Note the tip. Make the helpers' copies (`python scripts/worktree.py create <name> --base experimental`),
   named `p79a`, `p79b` and so on. Write the shared rules file and the briefs; check each brief against the code
   and against its own rules. Start the fifteen.
7. From then on: the runbook.

## Questions that come up during the session

New ones go here, with the choice taken in the meantime.

1. **A reboot of the Deck over the network may ask for a password.** *Meanwhile:* the session tries Steam's own
   restart first; if a reboot needs a password it sends a phone notification and waits.

## At the end

- **The report,** sent to your phone, opening with what you must do next. Then: what was fixed and proven, what
  was built and proven, what failed and why, what was found, and what is left.
- **The code summary** you asked for as a standing trial: the files changed, how each change works, what
  surprised us and how it was handled, and what you could have done differently to make the session easier.
- **A short developer guide** to how this plan was built into the code, in simple terms.
- **The release notes' known issues** (plan 72, section 8): any line whose bug is now fixed and proven comes off;
  anything new a player might notice goes on.
- **Your checks page** is brought up to date: the two release checks, the real-microphone recheck, and every look
  only you can judge.
- **The wider quick check** passes before the session calls itself finished.

## Results

Nothing yet.

## Log

- **2026-10-02, planning:** the roadmap, last night's plan and the runbook were read; the working branch is clean
  at `e4c6c655` and its quick check passes; the Deck and Ollama answer and no other chat is driving the Deck. The
  Opus medium helper file was added. The maintainer's ten calls are in. Nothing else has started.
- **2026-10-02, about 02:00 to 02:35, the start (tip `862f78b7`):** the maintainer's calls went into the locked
  decisions file (D122) and the helper limit was raised to fifteen for this session. Both machines are held awake
  (this PC until about 17:50; the Deck's hold is retaken at every Deck block). A timed check wakes the session every
  20 minutes. Fifteen at work: the Deck driver on setup and the ten measurements; helpers A to J on the bugs and
  features that need no measurement (the "undefined" cover, the X after Stop, doubled spoken words, power answers,
  the knowledge-base icons, the one switch, removing "Install options…", the fresher title, long chips, Save and
  Delete with the ring); K, L and M on the six drawings; N on the list of owed Deck checks. Waiting: the D-pad and
  layout fixes for their measurements, the drawn features for the maintainer's picks.
- **2026-10-02, about 02:35 to 03:05, the six drawings are ready for the maintainer's pick:**
  Delete icon (recommended 1, a simple bin) https://claude.ai/artifact/63R4GDY8nR77n4VsWT9FZA ·
  chip highlight (recommended 6, a soft fill with a thin bright edge) https://claude.ai/artifact/UTPzj1j4n8B1Nnj3Uun6VF ·
  calmer rating choices (recommended 2, smaller and softer; with a list of eight other loud spots)
  https://claude.ai/artifact/SXg99cQ5NN2rfh2pcGRkqv · the Show details line in the chip's place, in motion
  (recommended 2, a quick cross-fade) https://claude.ai/artifact/PXBGwEczcN97skhX4EANN9 · opening "N earlier"
  (recommended 1, a few at a time) https://claude.ai/artifact/CjiVzMEe8UipPda2kS2q18 · folding "Models & routing"
  into the AI models box (recommended A, a strip in the box's top row) https://claude.ai/artifact/2xUbgB3AvhfzVKvwQZ3XMJ.
  The first three get built with the recommended choice if no pick comes; the last three wait. Also: the list of owed
  Deck checks is done (9 the rig can run as written, 9 more with a prepared setup); the bookkeeper's first pass moved
  the maintainer's passed Clear-mid-answer check to Done and fixed ten places where the documents disagreed
  (`478df823`); the two add-ons started (a button keeps its answer's game; ten game chips).
- **2026-10-02, about 02:00 to 02:50, Deck blocks 0 and 1 (build `f0a4f2c4`, no game running):** setup passed (build
  matches, presses reach the Deck, no parental lock, settings and chats backed up, keep-awake until 10:00). Seven of
  the maintainer's bugs were reproduced and measured: the bronze note card touches the chip row (0 px gap); Up from
  "Bad info" lands on the speaker, and Down from the speaker follows the last choice left; Retry is a stop on the
  way Down from "84 earlier" and on the way Up from the question; in the AI models box the list stays scrolled 41 px
  after down-and-up, leaving the first model half behind the list's column header (not the title bar); in Show
  details the ring sits on the whole chip column at every press (never one chip), and that box changes size each
  press and reaches behind the question box; on the Ollama tab 13 of 28 presses had a real, visible stop with no ring
  drawn (seven plain dark buttons never show one); the saved cut-off answer ends with an opening spoiler mark and
  nothing after it, so "undefined" comes from the screen side. **Not reproduced:** the trap after picking a setting
  (two tries, a Quick Access setting and a Steam Settings page; Down moved normally every time), and the X after
  Stop with a typed question (it cleared), so that bug is specific to a spoken question. Evidence
  `docs/test-evidence/plan79-P79-*.json`. Started on the results: helper R (Show details, Opus medium) and helper Q
  (the invisible ring, Opus medium); A and B got the readings. Deck block 1b started: the ring on the Settings and
  Developer tabs, the Main tab's "before" walk, older owed checks with no game, and a second try at the trap through
  Steam's on-screen keyboard, the way a person types.
- **2026-10-02, about 03:15 to 03:30:** a network drop stopped every helper and the Deck driver at the same moment;
  each was resumed by message with its work intact. **The maintainer picked three drawings:** Delete icon 2 (the bin
  with slots), chip highlight 1 (the soft fill), calmer ratings "after 2" (smaller and softer). Written into D122.
  They are built by helpers W (after J), X (after I) and S (the rating row, with bug 7).

## For the helpers: who owns which files

A starting point for the briefs; each brief is checked against the code and against its own rules before it is
sent. Every brief carries what the runbook lists: the tip hash and the check that the copy is based on it; the
baseline checks without an install; its own files and "another file: stop and report"; one change per commit,
failing test first; the sentence that says what a pass looks like on the Deck and one test at that level; for a
label change, a search for every place the words appear; for a D-pad walk, Steam's own scroll modelled and a
bounded walk with no stop twice; the five checks and `python scripts/verify.py --quick` before every commit; a
scratch folder of its own; `git -C <copy>`, never `cd`; never `git stash`.

- **A ("undefined" cover):** `src/components/MainTabBonsaiAiMarkdownChunk.tsx`,
  `src/utils/expandOneLineSpoilerFences.ts`, `src/utils/markdownFenceReader.ts`, and the back-end step that saves
  a stopped answer's partial text. Screenshot `screenshots/DeckCapture_20261002_003908_game.png`. First find
  which side produces the missing value: the saved text (an opening mark with no body) or the drawing of it.
- **B (the X after Stop):** the clear path in `src/components/MainTabUnifiedAskBar.tsx` (only that handler),
  `src/hooks/useBonsaiAskOrchestration.ts`, `src/features/voice/`. Helper P waits for this to land.
- **C (doubled words):** `py_modules/backend/services/voice_transcription_service.py`,
  `voice_transcript_decode_service.py`, `voice_whisper_daemon.py`, `voice_whisper_runtime.py`,
  `src/hooks/useVoiceTranscription.ts`. Screenshot `screenshots/DeckCapture_20261002_004142_game.png`. The
  doubled stretches overlap ("3 4 5 6 567 … 5 6 7 8"), which reads like overlapping pieces of sound each written
  out in full; prove it before fixing it.
- **D (power answers):** the power-question instructions under `py_modules/backend/services/`
  (`ask_topic_instructions.py`, `tdp_intent.py`). Measured with `scripts/eval_kb_answers.py` on this PC, taking
  turns with helper H.
- **E (icons):** `src/components/KnowledgeBaseSection.tsx`, `src/components/icons.tsx`.
- **F (one switch):** `src/components/SettingsTab.tsx`, `src/data/bonsaiSettingsNormalizers.ts`,
  `src/data/bonsaiSettingsSchema.ts`, `py_modules/backend/services/settings_service.py`, the two shared contract
  files. The saved value keeps its three names on disk; the switch writes All or None and reads Search as off.
- **AE (a button keeps its answer's game):** `py_modules/backend/services/game_ai_request.py`,
  `spoiler_title_profiles.py`, and what a choice button or refine chip sends from the screen. Evidence
  `docs/test-evidence/plan78-P77-SPOILER-OTHER-GAME-try2.json`. A typed follow-up that names no game still goes
  to the running game (plan 78, question 1).
- **AF (ten game chips):** `py_modules/backend/services/knowledge_base_chips.py` and the tests that expect six.
- **G ("Install options…"):** `src/components/OllamaWhereAiRunsSection.tsx`,
  `src/hooks/useLocalOllamaSetupFlow.tsx`, `src/features/plugin-shell/modalReturnFocusRegistry.ts`,
  `py_modules/backend/services/local_ollama_setup_service.py`, `ollama_local_setup_rpc.py`, and the starter-set
  button in `src/components/PullModelsModal.tsx` (helper U waits for it). The tab's D-pad chain is written out in
  the file's header; the brief names the chain after the change. Every download still asks first.
- **H (fresher title):** `src/features/chat-sum-up/`, `py_modules/backend/services/chat_summary_service.py`,
  `chat_sum_up_job.py`, `chat_summary_tidy.py`. The roadmap's long note has the design. Both the button and the
  automatic summary offer a title; a title renamed by hand is never offered a new one, so the chat must remember
  that its title was typed.
- **I (long chips):** `src/features/preset-carousel/presetChipButton.tsx`, `presetRowLayout.ts`, the chip part of
  `src/styles/sections/section-4.ts` (at its 400-line limit: move a piece out rather than grow it),
  `src/data/presets.ts` for the stay time. The row must still hold while the ring is on a chip.
- **J (Save and Delete with the ring):** `src/features/chat-slots/ChatSlotRow.tsx`,
  `src/components/SessionContextStrip.tsx`, `src/styles/sections/savedChatSlotsRow.ts`.
- **K, L, M (drawings):** one self-contained page each in the helper's scratch folder, no build step, the 300 px
  column, styles copied from the real stylesheet, each drawing measuring itself. Two effects on the same edge are
  checked together. The session publishes each page and sends the link.
- **P (the trap):** `src/components/MainTabUnifiedAskBar.tsx`, `src/hooks/useAskBarSettingsCardRows.ts`,
  `useAskBarSettingsCardVisibility.ts`, `useSteamSettingsSearch.ts`, `src/utils/navFocusRegistry.ts`. Screenshot
  `screenshots/DeckCapture_20261002_004346_game.png`. Read the older trap fix (`7a7d59fe`) first.
- **Q (Ollama tab highlight):** `src/components/OllamaTab.tsx`, `OllamaWhereAiRunsSection.tsx`. Read the older
  fixed entries for the same cause before building a new fix.
- **R (Show details ring):** `src/components/ContextChipLadder.tsx`, `src/utils/buildDetailsPanelElement.tsx`.
  Screenshots `screenshots/DeckCapture_20261002_005210_game.png`, `…_005227_game.png`.
- **S (rating row):** `src/utils/buildReplyActionsElement.tsx`, `src/hooks/useReplyFeedbackChips.ts`,
  `src/data/replyMicroActions.ts`, the rating part of `src/styles/sections/section-6.ts`. Screenshot
  `screenshots/DeckCapture_20261002_004918_game.png`.
- **T (Retry) and Y ("N earlier"):** `src/components/MainTabChatTranscript.tsx`,
  `src/hooks/useEarlierTurnsPill.ts`, `src/utils/liveTurnFocusGraph.ts`.
- **U (AI models box) and Z (the fold):** `src/components/PullModelsModal.tsx`, `OllamaModelsHubModal.tsx`,
  `OllamaTab.tsx`, `ModelRoutingAdvancedPanel.tsx`.
- **V (gap):** `src/utils/buildKbNotesBlockElement.tsx` and its style rule.
- **AB (settings list once):** `src/hooks/usePluginSettings.ts` only. The list is written once and the other six
  places read it. No setting's name, starting value or saved shape changes.
- **AD (build tidy-ups):** `package.json`, `packages/bonsai-mcp/package.json` and its lock file, the workflow
  file. Four commits, one per tidy-up.
