# Plan 63 — the fourth bug-fixing session, and the verification pass that follows

**Written 2026-09-21. Status: running.**

What this is for: one long session that clears as much of the open bug list as it can, then proves
the result on the Deck with the automated rig, and closes out the checks that have been waiting.
The maintainer is away for part of it and checking in remotely, so every block has to be able to
run without them.

**Read first:** [the roadmap's Bugs list](../roadmap.md#bugs) · [the guide](../../AGENTS.md) ·
[lessons learned](../lessons-learned.md).

---

## 1. Where we start from

Measured 2026-09-21 before anything was touched.

| Thing | State |
|---|---|
| Open bug entries | **41** — 35 in the main list, 6 in the knowledge-base list |
| Screen tests | 1,555 pass |
| Back-end tests | 1,592 pass |
| Type check | clean |
| The check run before every commit | **FAILS** — seven things worse than their best, three past a hard limit |
| Deck | reachable, automation armed, bridge ready, the AI server answering |
| Deploying | **works** — the plugin folder is owned by root, but the deploy script can become root without a password and hands the folder back |
| Games that can be started | God of War, Deep Rock Galactic: Survivor, Left 4 Dead 2, Black Mesa, Hades, Half-Life 2, Hollow Knight, Portal 2 |

That last row matters more than it looks. Eight checks died in the last session because the game
they needed had dropped off the Deck's Recent Games row, which is the only list the launcher can
search. They are all back.

### The three things blocking the most other work

1. **The AI models screen is unusable.** Pressing A on almost any control closes it. The screen is
   built as a confirm box, and its own OK swallows every A press, because none of its thirteen
   controls handles that press itself. The repo already has the fix pattern in three other
   pop-ups. This also blocks the filters feature shipped 20 September from ever being checked.
2. **The new Session tab cannot be reached.** Both tabs are drawn on the opened details panel but
   the highlight never lands on them. Two causes were measured: nothing puts the highlight on that
   row when walking down, and the row sits below the question box's top edge, drawn off screen.
3. **The pre-commit check fails on a clean tree.** Three living documents are past a hard limit —
   the roadmap at 131 KB against 100, the test rows at 190 against 165, the guide at 27 against 24.
   Every lane would hit a red gate on its first commit.

---

## 2. The calls made before starting (2026-09-21, to lock as D115)

| Question | The maintainer's answer |
|---|---|
| The failing pre-commit check | **Trim the three documents back under their limits first.** Not a new baseline, not raised limits. |
| The seven focus bugs that share one file | **Opus does them itself, in order.** No lane, even with the measurements in hand. |
| What may happen on the Deck unattended | **Deploy builds, launch and quit games, change settings and put them back, download models.** The 17 GB model still needs a separate ask. |
| How deep into the knowledge-base bugs | **Code-shaped ones only.** The note-rewriting ones wait for a notes session. |
| The licence filter hiding 9 of 26 models | **Keep it — a filter should filter.** The entry closes. |
| The UI size setting | **Cut the choices to what is real.** Not the full wiring job. |
| B on the open details panel | **Accepted as it is.** The entry closes as accepted behaviour, no code. |
| Clearing the cache mid-answer | **Goes on the maintainer's own checklist.** Five device tries is enough; stop spending device time on it. |
| The stuck-panel bug | **Watch for it across the night, do not chase it.** Count presses; silence across a few hundred is the evidence. |
| The ~30 old working copies | **Clear the finished ones.** Keep any holding work that never landed. |

---

## 3. Who does what

Opus extra-high runs the session and does the focus work. Sonnet 5 high runs the lanes. This is
what [the guide's routing table](../../AGENTS.md#which-model-does-which-work) asks for on a
bug-fixing lane session, including the part that says focus work is never a lane.

Five lanes at once is the repo's limit. Two waves of them, with the focus work running the whole
time in the shared checkout.

### What I do myself — the focus family

Seven bugs live in the same walk-order code, so they cannot be split without colliding. In order,
most valuable first:

| # | Bug | What is already known |
|---|---|---|
| F1 | ★★★ The Session tab cannot be reached | Both causes measured on the Deck 21 Sept |
| F2 | ★★ The chip ladder inside the open details panel is not a stop | Two roadmap entries, same fault; four device runs |
| F3 | ★ Walking up from the question box skips every reply row | Measured 18 Sept |
| F4 | ★ Walking down a reply and back up visit different stops | An earlier fix did not hold, 19 Sept |
| F5 | ★ Up from Retry does not return to the answer | Confirmed 17 Sept |
| F6 | ★ The Open Permissions jump lands at the top of the tab | Got worse since it was filed |
| F7 | ★★ Walking a reply while it is still being written loses the highlight | Six of eight stops off screen, 18 Sept |

F1 to F5 are the commitment. F6 and F7 are stretch. Every one of these has a device measurement
already written down, which is the condition the routing rule cares about.

Also mine, because it is one line each and it would be silly to spin up a lane:
- Close the **B on the details panel** entry as accepted behaviour.
- Close the **licence filter** entry as wanted behaviour.
- Move the **clear-the-cache-mid-answer** half onto the maintainer's own checks page.

### Wave one — five lanes

| Lane | Bugs | Files it owns |
|---|---|---|
| **A — the AI models screen** | ★★★ A closes the screen · ★ B while typing a name by hand backs out · ★★ the first model ticked downloads at once · ★ the try-order picker writes settings when nothing moved | `PullModelsModal.tsx`, `ModelRoutingOrderModal.tsx`, `OllamaModelsHubModal.tsx`, `useOllamaModelsHubModal.tsx` |
| **B — the preset chips** | ★ icon and words share the accent colour · ★ the bright blue underline · ★ a real notes chip shows no tip dot | `MainTabPresetRow.tsx`, `MainTabPresetAnimatedChips.tsx`, `features/preset-carousel/`, the chip styles |
| **C — settings plumbing** | ★ the pinned test sentences stop showing after the first question · ★ the list of setting names is written out seven times | the settings store, both sides |
| **D — what the reply says** | ★ the no-game menu leaks its own template · ★★★ a name-withheld boss question comes back with no spoiler cover | prompt building, spoiler rules |
| **E — chat slots** | ★★ a new chat shows the previous chat's last reply · ★★ a chat that is still writing does not look busy from another chat | `features/chat-slots/`, the chat row |

Lane C's first bug is worth more than its one star suggests: it is what stopped the last session
from sending questions on the Deck, so it gates the whole verification pass. Its likely cause is
already found — the plugin keeps its own copy of the settings in memory and writes the whole copy
back on its next save, so an edit made straight to the file on disk is overwritten. It may be a
test-rig problem rather than something a player would ever see; the lane says which.

### Wave two — three lanes, plus anything wave one could not finish

| Lane | Bugs |
|---|---|
| **F — small screen fixes** | ★ the cursor does not line up with the placeholder · ★ the row of dots still shows under the open tab strip · ★ the Decky plugin icon is not the tab bar's bonsai |
| **G — the lines under an answer** | ★ the credit line never names a note with no source page or a shared tip · ★★ the "no close match" line judges the first note instead of the best one · add a line to the log naming which notes were attached |
| **H — the UI size setting** | ★★★ cut the choices to the ones that genuinely change something: drop Desktop and automatic, keep the steps that work |

Lane G's third item is not a bug — it is the thing that makes the transparency check runnable. That
check has never been able to run because the log records nothing about which notes were searched or
attached, so there is nothing to compare the screen against.

### Not in this session

- The note-rewriting bugs: the follow-up that names the wrong boss, the four questions that get
  notes about the wrong subject, the Black Mesa water question attaching the wrong notes, the
  "No tip for this" line with no question that shows it. These are library work, not code.
- The stuck-panel bug: watched, not chased.
- Three bugs that have never reproduced: the knowledge-base download needing two taps, the tap
  outside the models screen, the ring not leaving an unrevealed spoiler block.
- The shared voice server: nothing uses it twice today, so nothing is broken yet.

---

## 4. The blocks

### Block 0 — make the session runnable

1. Trim the three documents back under their limits. Content moves to the archive files and is
   linked, never deleted — that is the roadmap's own house rule. Roadmap 131 → under 100, test rows
   190 → under 165, guide 27 → under 24.
2. Prove one deploy end to end, and read the plugin's log to confirm it came up.
3. Delete the old working copies whose work already landed. Check each one for unlanded commits
   first and list what was removed.
4. Cut five fresh working copies for wave one.

**Done when:** the pre-commit check passes on a clean tree, and a build we made is running on the
Deck.

### Block 1 — wave one builds

Five lanes at once. I start the focus work in the shared checkout at the same time.

### Block 2 — land wave one

One lane at a time onto the working branch, with the full check after each. **After every landing,
re-read the copy-pasted-lines number** — lanes each measure it clean on their own copy and it rises
once they are together. Build, deploy, confirm the plugin came up.

### Block 3 — first Deck pass: prove what we just fixed

Row per fix. The four that matter most:
- The AI models screen: A on the Filters button opens the filters instead of closing the screen.
- The Session tab: the highlight lands on both tabs and the Session tab opens.
- The preset chips: the icon is accent-coloured, the words are not, the blue underline is gone.
- The pinned test sentences keep showing after the first question.

Also in this pass, because they were already owed and the fixes touch them: the question box
reaching Stop while an answer arrives, the models screen returning the highlight when it closes,
the model list showing more rows, and typed text staying inside the panel at the bigger size.

### Block 4 — wave two builds, and the rest of the focus work

Three lanes plus spillover. I keep going down the focus list.

### Block 5 — land wave two, build, deploy

Same as block 2.

### Block 6 — the long Deck pass

This is the one the session is really for. In order:

**Things a fix should have unblocked**
- The transparency check, once the log names the attached notes.
- The checks that died on the pinned test sentences.
- The checks that died because a game was not on the Recent Games row — all those games are back.

**Features waiting to be proved**
- A chat carrying what it has already covered into the next question.
- The plugin choosing how much room the model gets.
- The small speaker on the Helpful row, on an answer stopped part-way.
- The game name above a chat's title, the half that needs a chat with a game attached.

**The twelve checks whose evidence never existed** — four are still owed. Two of them just became
possible again because Hollow Knight and Black Mesa are back on the Recent Games row.

**Knowledge-base checks** — the warning line's wording, the follow-up that finds the right note but
asks which boss is meant, the Deep Rock Galactic spoiler check, the two Hades boss questions that
came back with no cover.

**The thinking line** — the two halves never read on the device.

**The free-play sweep** — walk the panel like a player and require every stop the highlight visits
to also be visible. Once after a finished answer, once while one is still being written. This is
also where we count stuck-panel sightings across the night.

### Block 7 — write it all down

Roadmap updated as each check lands, not at the end. A report for the maintainer. Anything found
that only they can do goes on their own checks page.

---

## 5. What cannot be done, whatever happens

Four checks need a human at the Deck. They go on the maintainer's own page, not back on the list:

| Check | Why |
|---|---|
| A mistyped model name among several | Needs typing on the on-screen keyboard; the rig cannot see its keys |
| A large model going to the top of the try order | Needs typing, and a 17 GB download |
| The spoiler box on a name-first question in Doom 64 | The game is not installed and the maintainer says it is not readily available |
| The ghost of the tab bar left over after a touch | Needs a finger on the screen |
| Clearing the cache while a reply is still being written | Five tries; every reply finished before the controller could walk there |
| Replacing the library to check the corpus format gate | Would mean removing the library under test |
| The Update knowledge base button | Would replace the 2026.09.18 library with the older published one, until the maintainer publishes |

---

## 6. Rules every lane follows

Straight from the guide, repeated here because lane briefs that leave them out have cost whole
evenings before:

1. **Check what your copy is based on before writing anything.** A lane has started 442 commits
   behind before now.
2. **The copy already has its packages linked** to the shared checkout. Do not install them again.
3. **One change per commit.** Behaviour preserved, tests green in between.
4. **Run the full check before every commit.** It passes on a clean tree once block 0 is done, so
   any failure is yours.
5. **Never touch the roadmap, the testing documents or the changelog.** Hand back code, tests and a
   short report. The session writes the documents.
6. **Never touch the Deck. Never push.**
7. **Cite the file and line for a factual claim.** Write "unknown" rather than guessing.
8. **Break your own guard before you trust it.** A test you have not deliberately made fail may not
   be checking anything.
9. **Never stage everything.** Other sessions may have unfinished work in the shared checkout.

---

## 7. How the maintainer checks in

A status page they can open on a phone, updated at the end of every block: what landed, what is
being worked on, what the Deck said, and anything that needs their word. The link goes out as soon
as block 0 finishes.

Anything that needs a decision is put in the page and in a message, and the session carries on with
everything that does not depend on the answer.

---

## 8. Results

Filled in as the session runs.

| Block | Started | Finished | What happened |
|---|---|---|---|
| 0 — make it runnable | 2026-09-21 ~21:00 | 2026-09-21 ~22:00 | The three oversized documents were trimmed back under their limits, with the old detail moved to the archive files and linked, not deleted. The pre-commit check passes on a clean tree again. A deploy was proven end to end and the plugin log confirmed it came up on the Deck. |
| 1 — wave one builds | | | Five lanes ran at once, each building the fixes it was handed inside its own copy of the code: the AI models screen, the preset chips, the settings plumbing, what the reply says, and chat slots. All five handed back finished work with the full gate green on their own copy. |
| 2 — land wave one | | | Each of the five lanes was landed onto the working branch one at a time, and the full gate ran green after every single one. All five wave-one lanes are now merged in. |
| 3 — first Deck pass | | | |
| 4 — wave two builds | | | |
| 5 — land wave two | | | |
| 6 — the long Deck pass | | | |
| 7 — write it down | | | |
