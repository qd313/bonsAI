# 108d — Steam Input layout parse: the plan

**Status: READY for the maintainer's read, 2026-11-19. Planning only; nothing is built.** bonsAI can learn what your
buttons do in a game by reading the layout Steam has saved for it. The build is smaller than four stars suggests. One
honest limit was found on the Deck: a game you have never set up a layout for has nothing to read.

**Where to pick up.** Read §§ 1, 3 and 4. Calls d1 and d6 change words you see, so they are drawn first (mock-up
board 7); the other six can be answered in words and each has a default. Then say "Run plan 108d" in a new chat on
the PC. Step 0 is a test to find out, it runs first, and it can stop the plan.

**Files for this plan:** the briefs [assets/108d-lane-briefs.md](assets/108d-lane-briefs.md) (one section per
helper, the step 0 runbook, the two mock-up tabs, the reviewers' questions), the shared helper rules
[assets/108-helper-rules.md](assets/108-helper-rules.md). Evidence files: `plan108d-<ROW>.json` in the workshop's
test-evidence folder. Its sister plans are 108a to 108g. Its calls are filed as d1 to d8 under decision D145; its
checks are named `P108D-…`.

**The roadmap entry:** ★★★★ `[platform]` **Steam Input layout parse** — "OPEN, not started. Read the controller
layout files so Ask knows what each button does in the running game. Not in scope: writing or changing controller
layouts."

Written by a planning chat (Fable 5.2) on `experimental` at tip `28306e896`, from the roadmap entry, its two-line long
note, the older notes that point at it, a read of the code as it is today, and eleven read-only looks at the layout
files on the maintainer's Deck (2026-11-19). No older plan existed.

---

## 1. What you would notice when this is done

1. A game is running. You ask "what do my back buttons do?" or "how do I turn on the flashlight?". The answer names
   your buttons as they are set **on this Deck, for this game**, not the game's usual defaults.
2. Under **Show details**, one new chip says your controller layout was read. When it was not read, the same chip
   says why in one line (the switch is off; this game has no saved layout).
3. Nothing new to press. No new tab, no new button, no new stop for the D-pad.
4. bonsAI only reads. It never changes a layout, and nothing it reads leaves the Deck.

**How much it can truly say depends on the game.** All four cases below were seen on the Deck.

| The game | What the file holds | What bonsAI can say |
|---|---|---|
| **Names its own actions** (Half-Life 2, Black Mesa, Left 4 Dead 2, Teardown) | "A is Jump, X is Use", in the game's own words | What each button does. This is the full promise of the roadmap line. |
| **Only receives keys** (F.E.A.R., The Sims 4, Grand Theft Auto 2) | "The left bumper sends mouse wheel down" | Which key each button sends. What that key does in the game is not in the file; the AI may know it and must say when it is guessing. |
| **Plain gamepad** (DOOM Eternal) | "A is A" | Only what differs from a normal controller: back grips, trackpads, gyro. |
| **No saved layout** (God of War, Hades, Hollow Knight, Deep Rock Galactic, Stardew Valley, Hogwarts Legacy, Sifu) | Nothing. The game runs on its default and Steam keeps no file for it. | That no saved layout was found (call d2). |

The last row is the common one. On this Deck the list for the Deck's own controls has 43 entries: 33 layouts you
saved yourself, 6 community layouts, and 4 templates or named copies. Eight installed games I checked are not on it.

## 2. What was already written down, and what has gone stale (checked against the code on 2026-11-19)

There was no plan. What exists is short: the roadmap entry, a two-line long note ("parse controller VDF configs for
actionable control context"), and older notes that point here.

**Still true**

- Nothing in bonsAI reads a controller layout today. The October roadmap check found the same.
- "bonsAI does not write layouts" is already a rule in the code: the quick-launch help says so in its own words.
- The Developer tab has a button, "Jump to Steam Input (running game)", that opens Steam's own layout screen. It is
  the shipped first step of the spring research. It stays as it is.
- The August mod study said this feature would bring the first real reader for Steam's text files, and that the mod
  work could reuse it. Still true: three small readers exist today and each only picks one value out by pattern.
- A preset question, "Are there issues with my Steam Input layout?", exists and stays hidden with the other beta
  chips, because this feature was never built.
- Ten general tips about controllers are in the tip sheet. They are advice for everyone, not your layout.

**Stale**

- The spring research note ([workshop](../../../bonsAI-workshop/archive/research/steam-input-research.md)) is about
  jumping to Steam's settings screens, not about reading layouts, and its file links point at folders that moved in
  October. Nothing in it has to change for this plan.
- "Parse the config" suggests one file per game. On the Deck a game's layout can come from four places, and a small
  list says which one is in use (§ 3).
- "What each button does in the running game" is true only for the first row of the table in § 1.
- Plan 101 (mods) counted 45 files for a new permission switch. The same count today is 61.
- Plan 101 planned to find Steam's other libraries (an SD card, a second drive). This feature does not need that:
  Half-Life 2 sits in a second library on this Deck and its layout is still in Steam's main folder.

**Never written down** (read on the Deck, 2026-11-19; the details are in the briefs)

- Where the layouts are, and the list that says which one a game uses: your own saved copy, a community layout by
  number, or one of Steam's templates.
- Sizes: a saved layout is 20 KB to 135 KB of plain text. The Half-Life 2 one is 4,208 lines, and about 1,900 of
  them are the action names again in every other language.
- Community layouts are plain text too, under a different file name.
- Games added to Steam from outside (emulators, a browser) are filed by name, not by number.
- There is one list per kind of controller, and extra lists for single devices. **Not yet known:** which one wins
  when two of them name the same game. Step 0 finds out.

## 3. How it works today

- **The plugin knows which game is running.** Its number and name ride along with every question.
- **One switch covers "game context".** On the Permissions tab, "Read game & screenshot context" lets bonsAI read
  Steam's logs for the running game and your screenshots. With it on, a troubleshooting question gets the end of the
  game's log attached, and a chip under Show details says so. The Kids lock forces it off.
- **Extra facts reach the AI as short blocks** stacked under one size limit, and each block that went in gets its own
  chip under Show details. A new block and a new chip need no new screen code: the chip's words come from the back end.
- **The AI has room.** Since September its reading window is four times what it was. A table of thirty buttons
  takes about one part in twenty-five of it.
- **Where Steam keeps layouts**, in plain words: a folder per game with one file per kind of controller (the Deck's
  own controls have their own); a folder of Steam's templates; a folder of community layouts; and the list that says,
  for each game, which of those is in use. A game that is not on the list runs on its default.

## 4. Calls for you before anything is built

**d1. Which switch lets bonsAI read layouts. Needs a drawing first (board 7, tab "Layout switch").**
- (a) The switch you already have, "Read game & screenshot context", with its one-line description reworded to name
  your controller layout. No new switch.
- (b) A new switch, "Read controller layouts", off for everyone until turned on.
- (c) Share the new switch plan 101 wants for mods, built by whichever plan runs first.

**Recommendation: (a).** A layout is Steam's own record about the game you are playing, the same kind of thing as its
logs; the Kids lock already covers that switch; and the chip says so every time a layout is read. A new switch costs
the most of anything in this plan (61 files). **Weigh this against your own earlier answer:** for the mods look you
chose a new switch and said it was "not a widening" of this one (plan 101, round 1, answer 3; not yet filed as a
decision). If unanswered: the four back-end pieces are still built, because they read nothing by themselves; the
piece that joins them to a question waits.

**d2. A game with no saved layout.**
- (a) Tell the AI nothing. The chip says "No saved layout for this game".
- (b) Tell the AI one line: the player is on the game's default controls, which bonsAI has not read. The chip says
  the same.
- (c) Also read the game's default layout. That is a different, harder file and not part of this plan.

**Recommendation: (b).** It stops the AI from presenting a guess as your layout. If unanswered: (a).

**d3. Which games, in the first version.**
- (a) Games from the Steam store only.
- (b) Also games added to Steam from outside, matched by name.

**Recommendation: (a).** Step 0 checks how outside games are filed; (b) can follow as one small step. If
unanswered: (a).

**d4. Which controller.**
- (a) The Deck's own controls only. The answer and the chip say so.
- (b) Also a pad you have connected (PS5, Xbox).

**Recommendation: (a).** bonsAI cannot yet tell which controller is in your hands, and a table for the wrong one is
worse than none. If unanswered: (a).

**d5. When the layout is read.**
- (a) Only when the question uses a controls word ("button", "controls", "back grip", "trackpad", "remap").
- (b) Those, plus when the question names one of the game's own actions ("flashlight", "quick save").
- (c) On every question while a game runs.

**Recommendation: (b).** "How do I turn on the flashlight?" has no controls word in it, and it is the question this
feature is for. With (b) the file is looked at on each question while a game runs, and attached only when the
question matches. If unanswered: (a).

**d6. The chip's words. Needs a drawing first (board 7, tab "Layout chip").** The chip when a layout was read, and
its three "not read" lines. The tab shows them beside today's Proton log chip, at true size.

**d7. A preset question for it.**
- (a) None in the first version.
- (b) Bring back the hidden one, reworded ("What do my buttons do in this game?"), shown only for a game whose layout
  was read.

**Recommendation: (a).** Decide after the Deck checks show how good the answers are. If unanswered: (a).

**d8. Real layout files inside the repo's tests.** The tests should run on files Steam really wrote. Those files
carry Valve's and the game's own words: action names, and long descriptions, repeated in many languages.
- (a) Whole real files stay in the private workshop. The repo gets cut-down copies: the true structure, the English
  action names, descriptions shortened, account numbers removed. The open-source reviewer reads them before they land.
- (b) Whole real files in the repo.
- (c) Hand-made files only.

**Recommendation: (a).** (c) is how a test ends up proving a shape Steam never writes. If unanswered: (a).

## 5. The build, in order

| Step | What you get | Stars | Who builds it | Waits on | Check |
|---|---|---|---|---|---|
| **M** | Two mock-up tabs on board 7: the switch (d1) and the chip (d6) | ★ | Opus, medium or high | nothing | your pick on the board |
| **S0** | **The test to find out.** Eleven real layout files copied from the Deck and read by a throwaway script; three open facts answered on the Deck | ★★ | the session, with the Deck driver for the copy and the screen reads | nothing | P108D-STEP0 |
| **F0** | Test files cut from the real ones | ★ | Sonnet medium | S0 says go; d8 | the open-source reviewer's read |
| **A** | The reader for Steam's text files | ★★ | Sonnet high | F0 | P108D-PARSE-REAL |
| **B** | The finder: which file is in use for this game | ★★★ | Sonnet high | A | P108D-PARSE-REAL |
| **C** | The boil-down: a file becomes a short table of buttons | ★★★ | Sonnet high | A | P108D-PARSE-REAL |
| **D** | The block the AI is handed, the word rule that decides when, and an answer test on this PC's AI | ★★★ | Sonnet high | A (builds beside B and C) | P108D-EVAL |
| **E** | The join: the block goes into a question, the chip appears | ★★★ | Sonnet high; the session reads it line by line | B, C, D landed; d1, d2, d5, d6 answered | P108D-ANSWER-NAMED and the rows after it |
| **P** | The switch's words (d1 a), or the new switch (d1 b: ★★★, about 61 files, its own Deck rows) | ★ or ★★★ | Sonnet medium, or Sonnet high | d1 | P108D-PERM-ROW |
| **K0, K9** | The paperwork before and after | ★ | the bookkeeper, Sonnet medium | first and last | spot-check |

**The order.** M and S0 start in the same hour; neither needs the other. If S0 says no-go, the plan stops there with
a short report and nothing is built. After F0 and A, lanes B, C and D run at the same time: each owns its own new
file and they meet at a contract written in the briefs. E is alone, last, and small, because it touches the busiest
file in the back end. About ten helper runs, two reviewers' reads, and the Deck driver twice: once for step 0's copy
and screen reads, once for a check block of under an hour.

**Step 0, the go and no-go lines, written before anything is measured.**

1. **Reads.** Go: 11 of 11 files are read with no error, each in under a tenth of a second on this PC. No-go: 9 or
   fewer.
2. **Names.** In the four games that name their own actions, at least 95 of every 100 bound actions get an English
   name from the file's own word list.
3. **Size.** The table for a game's main set of controls fits in 2,048 characters for 8 of 8 saved layouts. If not,
   the number comes to you before the limit moves.
4. **Truth.** For Half-Life 2 and F.E.A.R., ten buttons each are read off Steam's own layout screen on the Deck and
   compared with the table. Go: 20 of 20 match. No-go: 18 or fewer. The twenty must include the four back grips and
   the two small buttons beside the screen, because the files name those in a way that is easy to get backwards.
5. **Three facts.** Which list wins when two name the same game; what a never-set-up game looks like after it has run;
   how to tell which Steam user's layouts to read (this Deck shows two user folders). A fact that stays unknown is
   treated as "not read, and the chip says so", never guessed.

Between the lines (10 of 11, or 19 of 20): fix the script once and run again. A second miss is a no-go.

## 6. The checks

**The rig or the session can do these.**

| Row | What is done | What must be seen | Machine |
|---|---|---|---|
| P108D-STEP0 | The test in § 5 | The five results against their lines | PC, files from the Deck |
| P108D-PARSE-REAL | The Python tests of lanes A, B, C on the real-file copies | All pass; every kind of file in § 1 has a test | PC |
| P108D-EVAL | Lane D asks this PC's AI six button questions, three tries each, with and without the table | With the table, 15 of 18 answers name the button the table names; on a question the table does not cover, 0 of 6 invent one | PC |
| P108D-ANSWER-NAMED | Half-Life 2 running. Ask "How do I turn on the flashlight?" (or another action the saved layout binds, picked from the file the same day) | The answer names the button the file gives that action, read from the file before asking. The chip is there and names the file | Deck |
| P108D-ANSWER-KEYS | F.E.A.R. running. Ask "What do my back buttons do?" | The answer lists what the file binds to the back grips, and does not state as fact what a key does in the game | Deck |
| P108D-NO-LAYOUT | God of War running (no saved layout). Ask "What are the controls?" | No table attached. The chip says no saved layout was found. The answer does not claim to have read one | Deck |
| P108D-NOT-CONTROLS | A game with a layout running. Ask something about the story | No chip, no table, and the log has no layout line for that question | Deck |
| P108D-OFF | The switch off. Ask a button question | Nothing is read (the log says so). The chip says to turn the switch on | Deck |
| P108D-SPEED | Read the log of the rows above | Reading the layout added under a quarter of a second to a question | Deck |
| P108D-DETAILS-WALK | Open Show details on an answer that read a layout and walk the chips with the D-pad | The new chip is a stop like its neighbours; every stop is visible. Also QA-FREE-PLAY-01 and QA-LOOK-01 on the Main tab | Deck, both screens |
| P108D-PERM-ROW | Open the Permissions tab at each text size | The switch's line reads whole, nothing cut. QA-LOOK-01 on that tab | Deck, both screens |

**Only you can do these** (for the "checks only you can do" page).

| Row | What you do | What you should see |
|---|---|---|
| P108D-CHANGED | In a game you do not mind changing, move one action to another button in Steam's layout screen. Ask about that action again. Then put it back | The second answer names the new button. bonsAI saw the change without a restart |
| P108D-KIDS | Turn the family lock on and ask a button question | Nothing is read; the chip says so |
| P108D-READS-RIGHT | Play Half-Life 2 for five minutes and ask three button questions of your own | Each answer matches what your hands find |

## 7. What could go wrong, and what stops the work

- **Most games have nothing to read.** The feature will feel absent for a game on its default. The chip says why,
  and call d2 decides what the AI is told. If that is not good enough for you, say so before the build: reading a
  game's default is a different job.
- **The AI states what a key does as if the file said so.** The block tells it the file does not know. Lane D
  measures this before anything lands, and P108D-ANSWER-KEYS checks it on the Deck.
- **The wrong controller.** With a PS5 pad connected, bonsAI would still describe the Deck's own controls. The answer
  and the chip say which controls the table is for (call d4).
- **Steam changes the file.** Two versions of the format were seen on this Deck already. A file bonsAI cannot read is
  skipped, the chip says so, and the question is answered as today. It must never fail a question.
- **A second record for the same game** (the per-device lists). Until step 0 says which wins, the chip warns when it
  sees one.
- **The files carry your Steam account number** in their folder name and inside the text. It is never handed to the
  AI, never logged, and masked on the chip. The security reviewer checks this.
- **Three plans want the same few lines.** This plan, plan 101 (mods) and sister plans touch the place where blocks
  are stacked for the AI. Whoever lands second re-reads the first.
- **What stops the work:** a no-go at step 0; the security reviewer refusing the read; or you choosing d1 (b) and not
  wanting a sixth switch yet.

## 8. Not in this plan

- Writing or changing a layout, or suggesting one to import. (The roadmap's own line.)
- Reading a game's default layout when you have saved none (d2 c).
- A connected controller (d4 b), and games added from outside Steam (d3 b), until asked for.
- The Windows stand-in. The reader works on any machine; finding the files is written for the Deck only.
- A hint on the Main tab when the switch is off, like the one troubleshooting questions get. The chip's one line
  carries it in this version.
- A button in the answer that opens Steam's layout screen. The Developer tab's jump stays where it is.
- The five-star "Steam Controller copilot" entry. It leans on this one; it is not started by it.
- Layout advice ("a better layout for this game"). bonsAI says what yours does, not what it should be.

## 9. For the one running the session

- **First acts at go.** Read the usage counters and say the three numbers. Run `git status` and list `docs/planning`
  for other chats' plans. Re-check every brief against the tip: line numbers were read at `28306e896` by one reader.
  Ask whether another chat holds the Deck before step 0's copy.
- **Model.** Opus at extra-high plans, lands and reviews (three and four stars, back end). Helpers are Sonnet high,
  except F0, P (d1 a) and the bookkeeper at Sonnet medium. No lane here is focus or layout work unless d1 (b) is
  chosen; then the new row is a plain switch in a section that already has some, and it still owes its Deck rows.
- **How many at once.** At most three (B, C, D). Pass the model and the effort on every start. Helpers run their own
  test files only, at two workers; the full sets and the quick check run once per landing.
- **Reviewers.** The security reviewer reads lanes B and E before they land (a new read of files outside the
  plugin's folder; its questions are in the briefs). The open-source reviewer reads lane F0's files (Valve's and the
  game's words in test files). Both on Sonnet high.
- **The busiest file.** Lane E adds about a dozen lines to the file that runs a question from start to finish. Read
  its diff yourself. Plan 107's bug sweep and the sister plans may touch the same file: land them one at a time.
- **The Deck block.** One driver, one block, the rows of § 6 in order; unload the Deck's AI before starting a game;
  the driver reads the expected button from the layout file before each question and writes it into the evidence.
  Questions are pinned as test chips only after you have confirmed the list.
- **The bookkeeper is handed:** the D145 entries d1 to d8 as answered; one open row per check in § 6; the roadmap
  entry's move to Verify when lane E lands, naming P108D-ANSWER-NAMED; the three "only you" rows for the checks page;
  one line for the guide's Permissions table and one for the troubleshooting page; the developer guide's list of
  back-end areas (one more).
- **At the end,** the two write-ups the maintainer asked for: the code-work summary (files changed, what surprised,
  what would have made it easier), and the plain "how it was built" guide.
- **Stars.** With d1 (a) this is three-star work: five small back-end pieces, no screen code. With d1 (b) the four
  stars are right.
