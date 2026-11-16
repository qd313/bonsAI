# Plan 104, Deck block D1: one check per item that landed in wave A, on deploy 1

For one fresh `deck-driver` helper (Sonnet 5.5 medium), and a second one if the first runs low. The helper file's rules
apply in full, and so does **everything above the line "# D0a" in `docs/planning/assets/104-runbook-block-D0.md`**
(evidence names, the one way to write a Deck command, what the maintainer allowed, the freeze rules, asking a question,
keeping replies small, unloading the AI): read that part first. Evidence goes to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan104-<ROW>.json` (never overwrite; `-try2` if taken), a
picture beside every look. Your handover goes to `C:\Users\still\Documents\bonsAI-workshop\planning\assets\104-handover-D1.md`.
You commit nothing and you do not deploy: the session deployed before starting you and gives you the build hash and
which lanes are in it in your task. **Read the last handover first** (the session names it in your task).

**Freeze rules for this block, again:** `free -m` before every question and every launch (under 3,000 MB available:
skip and say so); unload the AI before every launch; **never a question with God of War running, except the one
warning question of D1.5, which the plugin must refuse to load the AI for**; never reload the plugin with a game
running; two timeouts in a row: stop and hand over.

**Which screen is live:** on 2026-11-15 the Steam page read 1500x843 and screenshots 1920x1080, so an external screen
may be live. Read it at the start and write it into every evidence file that measures a position.

---

## D1.0: setup, and install the session's library (row P104-D1-SETUP; one evidence file)

1. `python scripts/deck_queue.py add "plan 104 block D1, about 60 minutes" --by plan104`, then `next`. `deck_status`:
   the stop switch armed, no other chat's lease. `deck_holdAwake` for 480 minutes.
2. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12` must read the hash in your task; if
   not, stop. `systemctl is-active plugin_loader` reads active. Open the plugin.
3. `free -m`; no game (`pgrep -af '[S]teamLaunch AppId'`); `curl -s 127.0.0.1:11434/api/version` and `/api/ps`.
4. **The session's library.** Read `rag_corpus_version` and `rag_corpus_path` from the settings file (those two keys
   only). The seed's version: `python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`.
   **First keep a copy of the installed one** (block DR restores the published library and removes this copy):
   `cp -a <rag_corpus_path> /home/deck/p104-rag-published-backup` (skip if that folder exists), then `ls -l` it.
   Then Settings, Data, "Show Developer tab" on (write that you turned it on); the Developer tab; walk to "Install seed
   knowledge base" (read the ring on it), A, wait up to 60 seconds; `rag_corpus_version` now reads the seed's version.
5. The mode chip, `spoiler_tier`, the test chat's name (the handover names it).
6. **Steam back on its Home screen, for the game launches.** On 2026-11-15 block D0c's launches failed because Steam's
   main window was left on the Library page (`/library`), and on this Deck the launcher only finds games from the Home
   screen's Recent Games shelf (the Steam button does not open Steam's menu here). `deck_listGames` once (its reply is
   long: read only `route`, `recentShelf` and `recentShelfReason`). If the route is not `/library/home`: close Quick
   Access if open (the GUIDE+A chord), press **B** once on Steam's own page (never inside the plugin), read the route
   again; at most three B presses. When the route reads `/library/home`, `deck_listGames` should list the shelf: write
   which of Stardew Valley (413150), Left 4 Dead 2 (550), Deep Rock Galactic: Survivor (2321470) and God of War
   (1593500) are on it. Launch by `appid`. After every `deck_exitGame`, check the route is back on Home before the next
   launch (B again if not). If a game is on neither the shelf nor reachable, write that row COULD NOT RUN with the
   launcher's words and go on.

## D1.1: one call for a list of questions (row P104-D0-RUNNER; moved here from block D0a)

Nothing running, Strategy, the test chat. Write a rows file in your scratch folder with three Hollow Knight questions
of your own wording (rows `P104-D0-RUNNER-a`, `-b`, `-c`; each row's `chat` is the test chat's name, `mode` Strategy).
`deck_releaseMachine` (the script's own tool server needs the lease). From the shared checkout:
`node scripts/deck_ask_rows.mjs --rows <file> --plan 104 --chat "<test chat name>" --dry-run`, then the same without
`--dry-run`. **Pass when** three evidence files exist and each names the notes attached. Write the wall-clock time and
the one call against block D0a's numbers (about 18 seconds and 4 tool calls per question). If it refuses or stops, copy
its message into the evidence: that is the finding, and you ask the rest of this block the usual way. Your next
`deck_*` call takes the lease back. **If it passed, you may use it for the question rows below** (one rows file per
row, with that row's `expect`), and say so in each evidence file.

## D1.2: "No notes for this game" (row P104-NO-NOTES-LINE-01)

1. Unload the AI; `free -m`; `deck_launchGame` Stardew Valley; when its window has been up 30 seconds, `free -m`
   (4,000 MB or more available, or skip); close and reopen Quick Access; the Context line names Stardew Valley.
2. Speed (the mode chip): one question about Stardew Valley in your own words. Then Strategy: a second, differently
   worded one. **Pass when** both answers end with the line "No notes for this game — this answer is from the model's
   own knowledge." (the read-back's `noNotesForGameLine` field, and a picture of each answer's end). `deck_exitGame`;
   confirm with `pgrep`.
3. Nothing running, Strategy: one Hollow Knight boss question of your own wording. **Pass when** no such line shows.
   Put the mode chip back to Strategy.

## D1.3: the three Left 4 Dead 2 rows (P104-VERSUS-SPEED-01, P104-VERSUS-TANK-01, P104-VERSUS-HUNTER-01)

Unload the AI; `free -m`; `deck_launchGame` Left 4 Dead 2; when its window has been up 30 seconds and `free -m` reads
4,000 MB or more available, close and reopen Quick Access (the Context line names the game). Read which notes attach
from the read-back and the log's attach line.
- **P104-VERSUS-SPEED-01:** Speed. The question, word for word: `how to beat tank`. **Pass when** the Tank note is the
  note attached (Speed attaches one).
- **P104-VERSUS-TANK-01:** Strategy. A plain Tank question in your own words, naming no mode and no side. **Pass when**
  the Tank note leads and no versus note ("Surviving the Tank in versus" or another versus-kind note) is attached
  beside it. "Playing as the Tank" may attach; it is not a versus note.
- **P104-VERSUS-HUNTER-01, two halves:** Strategy. (a) As the row is written: a question about pouncing well when on
  the infected team, in your own words, that does not say "Hunter". (b) The phrasing the lane's tests use:
  `tips for playing as the hunter in versus`. For each half: **PASS when** "Playing as the Hunter" is the first note
  attached; otherwise FAIL with the order seen. The lane expects (b) to pass and (a) not to; write each verdict as seen.
`deck_exitGame`; confirm with `pgrep`; `free -m`.

## D1.4: a screenshot question names the running game (row P102-PICTURE-01, the question half; with a light game)

The plan moved this row to a light game (plan 104 § 5f): never God of War. Unload the AI; `deck_launchGame` Deep Rock
Galactic: Survivor; when up 60 seconds, `free -m` (4,000 MB or more, or skip). **A test picture** (allowed by D141,
call 3): if the Steam screenshot folder has no picture taken in the last hour, take one with the plugin's own
"Close menu & take screenshot" entry under the paperclip (read the ring first), and write the new file's name into
your handover's put-back list. Attach the newest picture through the paperclip, Strategy, and ask "what game is this
and where am I" in your own words; a second, differently worded try. **Memory readings for the limit (consult 5):**
for each of the two tries, `free -m` and `grep -E 'MemAvailable|SwapFree' /proc/meminfo` just before you press Ask and
again just after the answer ends (AI still loaded), plus the plugin log's memory line for that question if it writes
one; put all of them in the evidence file. **Pass when** both replies name Deep Rock Galactic:
Survivor. A picture of the attach list and of each answer. `deck_exitGame`; confirm with `pgrep`.

## D1.5: the low-memory warning (rows P104-MEMORY-01 and P104-MEMORY-02; only if your task says lane G1 is in this build)

If your task says G1 is not in this build, write "moved to block D2" for both and skip. Otherwise use **Speed** for
every question in this row (on Speed the notes search loads no extra model, so `/api/ps` can stay empty).
- **P104-MEMORY-01 (heavy game).** Unload the AI and check `/api/ps` is empty. `deck_launchGame` God of War; when its
  window has been up 60 seconds, `free -m` and `grep -E 'MemAvailable|SwapFree' /proc/meminfo` (write both), and the
  same again at 3 and at 5 minutes after the launch (how a waiting game grows; consult 5). Close and reopen Quick
  Access. One question in your own words. **Pass when:** the reply is the warning (it opens "Not enough free memory to
  start the AI."; a picture), `/api/ps` is still empty, `MemAvailable` has not dropped by more than 300 MB, and one Down
  from the warning puts the ring on "Ask anyway" (read the ring). **Do not press A on it.** `deck_exitGame`; confirm
  with `pgrep`; `free -m`. If the exit fails twice, stop and report at once.
- **P104-MEMORY-02 (light game), two halves.** Unload the AI; `deck_launchGame` Deep Rock Galactic: Survivor; when up
  60 seconds, `free -m`. (a) One question: **pass when** no warning and an ordinary answer. (b) **Raise the limit for the
  test** (lane G1's report, 2026-11-15): the file `ask_memory_limit_mb` in the plugin's settings folder, the folder that
  holds `settings.json` (`/home/deck/homebrew/settings/bonsAI/`; check with `ls` first), holding one whole number from
  1 to 64,000: the memory in MB the AI is taken to need. It is read on every question; no restart. The warning shows
  when available memory minus that number is under 2,000 MB, so with this game running write a number at least 2,000
  above what `free -m` leaves for the test to mean anything, for example `echo 9000 > /home/deck/homebrew/settings/bonsAI/ask_memory_limit_mb`
  (write the file into the put-back list before you make it). Then one new question: the warning shows; walk to "Ask anyway" (read
  the ring), A, once: **pass when** an ordinary answer arrives; then one more question: the warning shows again. Delete
  the limit file and `ls` to confirm it is gone; then one more question: **pass when** no warning shows and the plugin
  log's memory line for it shows the limit back at 2,000 (a file left behind warns on every question).
  `deck_exitGame`; confirm with `pgrep`.

## D1.6: the look check (row QA-LOOK-01-p104, first part)

Nothing running. Run `scripts/probe_deck_ui_look.py` the way its header says on the Main tab (the newest answer showing
its notes line) and the Ollama tab. A picture of each. **Pass when** nothing the check names is hidden behind the dock
or cut at an edge; a long suggestion chip caught mid-scroll is not a finding (write it down if the check calls it one).

## D1.7: the free-play sweep (row P104-SWEEP, first part)

Walk the Main tab with the D-pad from the top of the newest answer to the question box and back, one press at a time,
reading the ring after each, nothing running; then the same with Deep Rock Galactic: Survivor running (AI unloaded
before the launch; ask nothing). **Pass when** no stop is visited twice in a row by a single press, the ring is never
lost, and nothing with the ring is hidden. Save a walk that passes with `deck_saveCheck` (`checksDir` as in the D0
runbook). `deck_exitGame`; confirm with `pgrep`.

## D1.8: hand over

The plugin on Main in the test chat, the mode chip on Strategy, no game, the AI unloaded, the hold **kept**, "Show
Developer tab" as you left it (say which), the session's library installed (block DR restores the published one).
`deck_releaseMachine`. `python scripts/deck_queue.py done <id> --result "<build; library version; no game; hold until>"`.
The handover: the build, the hold's end, the library versions (installed and the backup's), the put-back list (any
picture taken, the limit file removed), the test chat, every setting you changed and whether it is back, and anything
the next driver should know.
