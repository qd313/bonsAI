# 108e — Finish the controller test rig: the plan

**Status: READY for the maintainer's read, 2026-11-19. Planning only; nothing is built.** Plan 19's list of four
leftovers was checked against the code, the rig tools' own project, the saved walks and the Deck itself. Two of the
four have changed shape, one has lost its reason, and a fifth need (waking a sleeping Deck) has shown up three times
this month.

**Where to pick up.** Read §§ 1, 2 and 4. Answer the eight calls in § 4, or say "yes to all" to take every
recommendation. Then say "Run plan 108e" in a new chat on the PC. The night run, which is the first and biggest
part, can start on "go" alone: where a call is left unanswered the plan takes the safe choice.

**Files for this plan:** the briefs [assets/108e-lane-briefs.md](assets/108e-lane-briefs.md) and the shared helper
rules [assets/108-helper-rules.md](assets/108-helper-rules.md). Evidence files: `plan108e-<ROW>.json` in the
workshop's test-evidence folder. Its sister plans are 108a to 108g. [Plan 19](19-controller-macro-test-rig.md) stays
where it is, as the history.

**The roadmap entry:** ★★★★ `[QA]` `[platform]` **Finish the controller test rig** — "PRIORITY 1 (maintainer,
2026-09-24). PARTIAL: built and driving every Deck session. Left from plan 19: a recording that is also a live view,
checking the highlight from the video, handheld runs over Bluetooth, and the nightly unattended run."

Written by a planning chat (Fable 5.2) on `experimental` at tip `28306e896`, from plan 19 (discovery of 2026-08-23,
status note of 2026-09-24), the roadmap's long notes, the testing program
([workshop plan 21](../../../bonsAI-workshop/planning/21-ai-owned-testing-program.md)), the findings log in
[mcp-setup.md](../mcp-setup.md), the rig tools' own project as it stood at its version 0.3.12 (2026-11-04), five
reading-only looks at the Deck on 2026-11-19, and a read of the code as it is today.

---

## 1. What you would notice when this is done

Nothing changes in the plugin. This is test equipment. What changes is your mornings and your checks page.

- **A night report.** You start one command before bed (later, if you want, the PC starts it by itself). In the
  morning one short page says, verdict first: every tab was walked with the D-pad; here is anything the ring landed
  on that was hidden; here is anything that moved since the last good night; here is one picture of each tab; here is
  what could not run, and why. Nobody stood at the Deck, and the Deck is left as it was found.
- **Films of things that move.** A check about a glide, an answer arriving or a card closing comes with a short film
  taken while the rig pressed, ready for the checks page. Today each film is a hand-built recipe.
- **After a test to find out: "is the ring really drawn here?"** gets a number and a cropped picture, not only a
  reading of the page.
- **After a test to find out: a sleeping Deck no longer stops a session before it starts.** Three times this month
  a session found the Deck asleep and had to wait for you and the power button.

What stays a job for your hands, eyes and ears: a finger on the screen, a game that is not on the Recent Games shelf,
a sound, your own controller. None of these pieces fixes those. Plan 19 said so, and it is still true.

## 2. What was already written down, and what has gone stale

Checked on 2026-11-19. The file and line behind each point is in the briefs.

**Still true**

- The rig is built and drives every Deck session: the board on the dock, presses, chords, walks, sweeps, the safety
  stop, holding the Deck awake, saving the settings and putting them back, saved walks with replay, and a log of
  every run. Sleeping the Deck and waking it by a timer passed on 2026-11-04.
- A recording is a file of a fixed length. Nothing can be watched live.
- The board's program speaks USB only. There is no Bluetooth in it.
- The night command exists and ran once by itself (2026-09-26, 76 seconds), and its walks proved nothing.
- The split of work holds: the tools live in their own project, and bonsAI keeps its scripts, its saved walks and
  its test rows. bonsAI does not quietly fix the tools inside its own repo.

**Stale**

1. **"Handheld runs need Bluetooth, because a docked Deck draws at the monitor's size."** Not in practice. With the
   monitor off, the docked Deck draws on its own screen, and many rows have passed that way (plan 84's, for one).
   Today's read showed exactly that: monitor not connected, the Deck's own screen live, the board plugged in. No open
   test row asks for the Deck out of its dock.
2. **"The night run only waits on the replay fix."** The replay across builds was fixed on 2026-09-23 and proven on
   2026-09-26. What stops the night run now is that a walk has no known starting point. The long notes say "each walk
   file already says which screen it starts from". It does not: a walk file holds presses and landings, and no tab,
   no chat.
3. **"30 saved walks."** There are 106 now, saved against 44 different builds over two months. Eleven press A or B.
   Many lean on a chat that has since changed: four of four failed for that reason on 2026-11-16. Replaying all of
   them once took 25 minutes and changed a setting (2026-10-24), so the replay tool now refuses more than ten walks
   unless told otherwise. The night command still asks for every one.
4. **The night command holds the Deck awake for two hours and never lets go.** A lock held over an idle Deck is what
   left Steam's sleep message stuck over Home on 2026-11-03, which only your hand could clear.
5. **"Check the highlight from the video."** Today a driver confirms a ring by looking at a still picture. The tools
   project has had the measured version on its own list since September, from a still picture. Video is needed only
   for movement.
6. **Plan 19's tool names and its "macros folder"** never came to be. The tools have other names, and saved walks
   live in the workshop.
7. **The roadmap entry for stand-in Decks ([plan 67](67-stand-in-decks.md)) says "nothing built".** The tools
   project built the list of machines and a pretend controller in October, and bonsAI was opened and walked on this
   PC as a stand-in on 2026-10-08. That entry needs a correction; it is not this plan's work.

**Never written down**

- What a recording costs the Deck. Plan 19 asked for the number; nobody measured it.
- Who would watch a live view. Sessions read the page, not video. You judge from the checks page afterwards.
- What a night run may do on your Deck, how it stops, and what it leaves behind.
- That the night command uses no AI at all. It is a plain script that starts the rig tools itself, so no usage
  limit can pause it and no chat has to stay awake.
- A sleeping Deck cannot be woken by the rig (2026-11-10, 11-14 and 11-15). The drafted ask was never posted.

## 3. How it works today

**The rig.** A small board sits on the dock. The Deck sees it as a controller; the PC tells it what to press. A set
of tools on the PC presses, reads where the ring is and whether that spot is really visible, and writes down each
run. If the PC goes quiet, the board lets go of every button within a second. A safety stop can halt everything, and
only you can re-arm it.

**Recording.** One tool records the Deck's screen for a set number of seconds and brings the file back. It cannot
run while another tool presses, so films of a walk are made with a second script started in the background, a wait
until the recorder is really running, and presses after that. A screen where nothing moves sends no frames, and the
recording fails.

**Saved walks.** A session can save a walk that passed and replay it later. The replay compares every landing with
the saved one. It sets up nothing first: not the tab, not the chat.

**The night command.** It holds the Deck awake, installs the newest build, replays every saved walk, runs the quick
check on the PC and writes a report. After the install the plugin's panel is closed, and the command does not open
it, so every walk starts from the wrong place.

**The Deck itself, read today.** It is the OLED model on SteamOS 3.9.5. The parts needed to record and to send a
picture over the network are installed; no part for hardware video encoding showed up, so encoding leans on the
processor. 718 GB is free. Bluetooth is on and six devices are paired, two of them controllers; the board is not one
of them. The board is plugged in but is not allowed to wake the Deck. The little keyboard's receiver and the dock's
network socket are allowed. No wake timer is set.

## 4. Calls for you before anything is built

None of these changes what a player sees or presses, so none needs a drawing. Plan 19's own calls L3 (both
connections from day one) and L4 (one recording that is also a live view) were locked on 2026-08-23; calls e1 and e2
ask you to change them, for the reasons in § 2. Decision D112's call 10 (the first night run, by hand) is done and
not re-asked. Every call below is filed under D145.

- **e1. Handheld runs over Bluetooth.** (a) Take them off the entry and note them as parked. (b) Build them anyway.
  **Recommended: (a).** The reason is gone and no row waits on it. *If unanswered:* nothing is built.
- **e2. The live view: who would watch it?** (a) Nobody: build "film a check while the rig presses" only. (b) You
  would watch runs from the PC: add a live picture, if the cost test passes. **Recommended: (a).** A film on the
  checks page already serves you. *If unanswered:* (a).
- **e3. Waking a sleeping Deck.** (a) Add it as a piece of this entry, cheapest way first. (b) Leave it: you press
  the power button. **Recommended: (a).** It cost most of a day on 2026-11-14 and 11-15. *If unanswered:* the test to
  find out runs, nothing is built.
- **e4. How the night run starts.** (a) By hand, one command, or as the last act of an evening session. (b) By the
  PC's own scheduler at a set hour. **Recommended: (a) now, (b) after ten good nights** and only once e3 has a wake
  that works, because a scheduled start needs both machines awake. *If unanswered:* (a).
- **e5. What the night run may do on your Deck without asking.** (a) Install the newest build; open bonsAI; press
  the D-pad on every tab; press A and B only inside walks named as safe in its list; save the settings and put them
  back; place its own test chat and remove it; take pictures. Never: start or close a game, reload under a running
  game, touch a chat it did not place, clear data, install or remove a model, download anything, type a PIN, re-arm
  the safety stop. It refuses to start while a game runs, while the stop is set, or while another session holds the
  Deck. (b) The same, with no A or B at all. **Recommended: (a).** *If unanswered:* (b).
- **e6. Who builds the parts that belong to the rig tools' project.** (a) A session in that project, from briefs
  this plan hands over, landing by that project's own rules, as its plans 11 and 12 did. (b) bonsAI helpers on a
  branch there, as plans 89, 93 and 97 did for small fixes. **Recommended: (a)** for new tools, (b) for one-line
  fixes. *If unanswered:* only bonsAI's own half is built.
- **e7. Post the drafted asks to the tools project's issue list.** Ten are
  [drafted](../../../bonsAI-workshop/planning/assets/104-deck-tools-issues-draft.md) and 26 log rows read "needs
  filing". (a) Post the ones this plan builds on (the wake, the walk's starting point, a recording that can be
  started and stopped). (b) Post all of them. (c) Post none. **Recommended: (a).** Posting is public, so it needs
  your word. *If unanswered:* (c).
- **e8. The ring from a picture.** (a) Build it if its test passes. (b) Shelve it whatever the test says.
  **Recommended: (a).** *If unanswered:* the test runs, nothing is built.

## 5. The build, in order

**Step 0: three tests to find out.** One Deck block, lines set now, before anything is measured.

| Test | How | The line |
|---|---|---|
| **What a recording costs** (P108E-REC-COST) | A game running with Steam's frame counter on. Read the game's frames a second three times before, during and after a 60-second recording; read the panel's own rate while an answer arrives during a recording. | **Pass:** the game keeps at least 90 percent of its frames, and the panel stays at 30 a second or better (your 2026-09-27 target). Then any check may be filmed, and a live view may be built if e2 says so. **Fail:** films are for looks only, never for a row that measures speed, and no live view. |
| **The ring from a picture** (P108E-RING-READ) | Walk two tabs; at each stop save a picture and the page's own reading of the ring's box. A small script looks for the ring in each picture. | **Pass:** it finds the ring at 95 percent or more of at least 40 stops, calls "no ring" on 95 percent or more of the same boxes pictured while the ring was elsewhere, and two runs agree on 95 percent or more. **Fail:** the piece is shelved. |
| **Ways to wake the Deck** (P108E-WAKE-ROUTES) | With a wake timer always set first as the way back: try a wake over the dock's network socket, then note the rest. You are near the Deck the first time. | **A way counts** when it wakes the Deck 3 times of 3 within 60 seconds, with the ring where it was. The first that counts is built. None: you keep the power button, and the report says so. |

**Then the lanes.**

| Lane | What you get | Stars | Who builds it | Waits on | The check |
|---|---|---|---|---|---|
| N2 | The night list: which tabs, which walks, what counts as a failure | ★★ | Sonnet high helper | nothing | its tests; P108E-NIGHT-CATCHES |
| N1 | The night command starts safely and ends cleanly | ★★★ | Sonnet high helper | N2 | P108E-NIGHT-REFUSES, P108E-NIGHT-PUTBACK |
| N3 | Every tab walked, pictured and judged; the morning report | ★★★ | Sonnet high helper | N1 | P108E-NIGHT-RUN, P108E-NIGHT-REPORT |
| DN | Two real nights, and one fault planted on purpose | block | Deck driver, Sonnet medium | N3 | the five NIGHT rows; closes OVERNIGHT-RUN-01 |
| F1 | One command that films a check while the rig presses | ★★ | Sonnet high helper | nothing | P108E-FILM-WALK, P108E-FILM-STILL |
| B1 | The driver's rules and the runbook learn the night run and the film command | ★ | Sonnet medium helper | N3, F1 | read by the session |
| R4 | In the tools project: "asleep" said plainly, a wake timer set for a chosen hour, and the wake that passed step 0 | ★★★ | that project's session (e6) | e3, step 0 | P108E-WAKE |
| R3 | In the tools project: the ring as a number with a cropped picture | ★★★★ | that project's session | e8, step 0 | P108E-RING-NUMBER |
| R2 | In the tools project: a live picture of a run | ★★★ | that project's session | e2 (b), step 0 | P108E-LIVE-VIEW |
| S1 | The PC starts the night run by itself | ★ | Sonnet medium helper, then your hands | e4 (b), R4, ten good nights | P108E-NIGHT-SCHEDULED |

The night run goes first. It needs nothing new from the tools project and it is the piece the testing program has
been waiting on. Step 0 and lane F1 run beside it. The tools-project lanes come after, each only if its call and its
test say so. A change to the rig tools loads only in a new chat, so their Deck checks belong to a second session.

## 6. The checks

No screen of the plugin changes, so the free-play sweep and the look check are not owed for this plan. They become
part of what the night run does.

**The rig can run these**

- **P108E-REC-COST, P108E-RING-READ, P108E-WAKE-ROUTES:** step 0, above. Deck.
- **P108E-NIGHT-RUN:** the command is started once, with the Deck at Home and no game. It ends by itself inside its
  time limit, every tab in its list was walked, the report is written. Passed on two evenings. Deck.
- **P108E-NIGHT-REFUSES:** with a game running, with another session holding the Deck, and with the board's port
  shut, the command presses nothing and its report gives the reason in plain words. Three staged cases on the Deck.
  The "Deck did not answer" case rests on its tests until a night finds the Deck asleep.
- **P108E-NIGHT-PUTBACK:** after a run the settings compare shows no difference, the chat list is the same byte for
  byte, no test chips are pinned and the awake lock is gone. Deck.
- **P108E-NIGHT-CATCHES:** one stop the list knows to be half hidden is taken off the list on purpose. The night goes
  red and names that stop. Put back, it goes green. Deck.
- **P108E-FILM-WALK:** a ten-press walk is filmed with one command; the film covers every press and a side file
  gives each press's time. **P108E-FILM-STILL:** on a screen where nothing moves the command says "nothing moved, no
  film", not "failed". Deck.
- **Later, each only if built:** P108E-WAKE (three unattended wakes), P108E-RING-NUMBER (two runs give the same
  number on the same build), P108E-LIVE-VIEW (the picture is under two seconds behind and the cost line still
  holds), P108E-NIGHT-SCHEDULED (three nights started by the PC).

**Only you can do these** (for the checks page)

- **P108E-NIGHT-STOP:** set the safety stop, start the night command, see that it presses nothing and says why.
  Then re-arm the stop. Only you may re-arm it.
- **P108E-NIGHT-REPORT:** one morning, read the report cold. Pass when the first three lines tell you whether to
  worry and where to look.
- Be near the Deck for the first sleep test in step 0. If the tools project changes the board's program, flash the
  board (the Deck-side cable out first). If e4 is (b), add the scheduled start on the PC from the one line S1 hands
  you.

## 7. What could go wrong, and what stops the work

- **The night run presses while someone is using the Deck.** It refuses while a game runs, and it starts by hand at
  first. A scheduled hour comes only on your say.
- **A stuck sleep message, as on 2026-11-03.** The run holds the Deck awake only while it is pressing and lets go
  before the PC-only steps.
- **A walk changes a setting.** Only named safe walks press A or B, the settings are saved first and put back
  after, and the put-back is itself a check.
- **The plugin reloaded under a game freezes Steam** (plan 78). A running game is a refusal, before the install.
- **A wake test leaves the Deck asleep.** A wake timer is always set first, and you are near it the first time.
- **The ring reader calls a ring that is not there, or misses one.** It only advises until two weeks of nights agree
  with the page's own reading; it never fails a row alone.
- **Tool changes that pass at the desk and fail on the Deck.** The tools project counts a change as desk-proven
  only until bonsAI's log says what the Deck did. This plan keeps that rule.
- **What stops the work:** a step 0 line missed (that piece is shelved, the rest goes on); a refusal case that
  presses anything; any difference in the put-back check.

## 8. Not in this plan

- The checks that need a finger, a game off the shelf, ears or your own controller.
- Stand-in Decks ([plan 67](67-stand-in-decks.md)), beyond the correction named in § 2.
- Starting a game inside the night run. A later step, once ten nights are clean.
- Deciding streaming smoothness. Timestamps decide that, as plan 19 said; a film only shows it.
- The other drafted asks to the tools project (smaller replies, the game launcher, the test that fails now and
  then). They stay in the log and the draft.
- A walk file that carries its own starting point. The night list holds the start instead; the ask goes upstream
  under e7.
- Bug and Verify entries. Another chat's plan 107 holds those and may be driving the Deck; take turns.

## 9. For the one running the session

- **First acts at go.** Read `git status` and the planning folder for other chats' plans (plan 107 was being written
  on 2026-11-19). Read the usage counters. Re-check every brief against the tip, and the tool facts against the tools
  project's newest commit (the briefs were read at its `412be47`). Call the status tool: the board's port did not open
  from the planning chat today, so find out who holds it. Read which screen is live. Ask the maintainer: is the
  safety stop armed, are phone notifications on, and when can they be near the Deck for the first sleep test.
- **Your own model.** Opus at extra-high (a four-star entry: it plans, writes the runbooks and lands). Helpers on
  Sonnet as the table says. The Deck driver on Sonnet medium, never Haiku. No lane here touches focus or layout.
- **Helpers at once.** N2, F1 and the step 0 script helper may run together; they share no file. N1 follows N2, and
  N3 follows N1, because all three work on the night command. One driver at a time, and never while plan 107's
  session holds the Deck.
- **Two sessions.** Session one: step 0, the night run, the film command, and (on e6) the hand-over to the tools
  project. Session two, a new chat: the Deck checks of whatever the tools project landed.
- **Reviewers.** The security reviewer reads N1, N3, F1 and S1 before they land: a script that presses a real
  device with nobody there, starts a program named in a settings file, and runs copy and remote commands. It reads
  R4 in the tools project too. The open-source reviewer is needed only if a lane adds a dependency; none is planned.
- **The bookkeeper is handed:** the rows in § 6; the roadmap entry's new wording; the correction to the stand-in
  Decks entry; one findings-log row per ask sent upstream; OVERNIGHT-RUN-01 closed only on the evidence files.
- **At the end,** the two write-ups the maintainer asked for: the code-work summary (files, what surprised, what
  would have made it easier), and the plain "how the night run is built" guide.
