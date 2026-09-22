# Lessons learned

Title:      Lessons learned working on bonsAI
Purpose:    The traps this project has already fallen into, written down so the next person or
            tool does not fall into them again. Each one cost real time or shipped a wrong
            answer at least once. They are habits, not rules with a checker behind them —
            nothing here is enforced by a test, which is exactly why it is written down.
Used for:   Read once at the start of working here, alongside [AGENTS.md](../AGENTS.md).
            Come back to the section that matches what you are about to do.
Solves:     Until 2026-09-15 most of this lived only in one AI tool's private memory on the
            maintainer's machine. A different tool, a fresh install, or a new contributor got
            none of it and repeated the mistakes.
Does not:   Cover how the code is laid out, how the two halves talk, or how to build and deploy
            — that is all in [AGENTS.md](../AGENTS.md). Does not cover the writing style rules
            for a file header, which are in [code-clarity.md](code-clarity.md).

Each lesson says what happened, then what to do. The "what happened" is there on purpose: a rule
with no story behind it gets argued away the first time it is inconvenient.

---

## 1. Working in a checkout other people are also using

**The checkout is shared.** Several chats and several people may have this same folder open at
once. Two habits follow from that, and both were learned by losing work.

**Never stage everything.** `git add -A` here sweeps another session's half-finished work into
your commit. It has happened. Stage the paths you actually changed, by name. If you find you have
already done it, do not reset the branch — undo the commit while keeping every file
(`git reset --soft HEAD~1`), unstage what was not yours, and commit again with only your paths.

**Do not switch branches in the shared folder while others are working.** A branch switch picks up
whatever they have uncommitted and carries it onto your branch. When you need a branch, make a
separate copy of the repo instead — `python scripts/worktree.py create <name>` — and work there.

**A copy of the repo and a branch are different things.** Deleting a copy's folder does not delete
its commits, as long as a branch still points at them. This matters when clearing up: folders are
cheap to remove and easy to remake, branches are the thing to be careful with. The exception is a
copy sitting on no branch at all — remove that folder and its commits become unreachable, so check
before removing one.

**Clearing an old copy can gut the main checkout's dependencies, and it did.** Every copy's
`node_modules` is a Windows junction pointing straight at the main repo's. `git worktree remove`
follows those links on the way out, so removing twenty-four old copies deleted the command shims and
part of the package store inside the *main* folder. Nothing said so at the time — the next type
check simply failed with a message about the wrong `tsc`. Before deleting a copy: unlink every
junction inside it first (`rmdir <path>` with no `/s` removes the link and never the target), then
delete what is left, and count the main `node_modules` before and after as a canary. The repair is
easy once you know — delete `node_modules` the same junction-safe way and run
`pnpm install --frozen-lockfile` — but finding the cause is not.

**Check whether a copy is in use before removing it, and check again afterwards.** Other sessions
create their own copies while you work. One appeared partway through a clear-out, was removed, and
the session using it simply recreated it and carried on — it now holds two dozen files of work that
exist nowhere else. A folder that was not on your list five minutes ago is somebody's live work, not
a leftover.

**"Not on the main line" is the wrong test for a stale copy.** Comparing an old copy against the
current code shows thousands of added lines, because its *old* version of every changed file reads
as an addition. That flags every abandoned folder as if it held treasure. The test that actually
answers the question: hash every file in the folder and look each hash up among every object the
repo knows about. Anything not found is genuinely only there.

**Check what a new copy is actually based on.** A helper asked to make its own copy has, in the
past, started from a point 442 commits behind, quietly, and then reported success on work it did
against code that no longer existed. Every brief that creates a copy must have the helper print its
base and confirm it is current before doing anything else.

**Check for other sessions' work before picking a number.** Plans and decisions are numbered in
sequence, and two sessions running at once will both pick the same next number. Before choosing
one, look at what is untracked as well as what is committed, and read the end of the decisions
file. A collision means renaming a file that other documents already point at.

**A worktree copy can pass a gate that the shared checkout then fails.** The refactor ratchet
counts copy-pasted lines with `jscpd`, and inside a copy made by the copy helper both of its counts
read zero — so a lane's own quick gate passed in its copy while the same commit then failed the
ratchet once it reached the shared checkout. Found 2026-09-17 when a back-end lane's first commit
landed and the tests' copy-paste count went from 2113 to 2123. The fix was a follow-up commit
sharing the test setup; until the ratchet itself learns to find `jscpd` from inside a copy, expect
this and read the ratchet in the shared checkout, not the copy.

---

## 2. Proving a change is really a change

**A fix with passing tests can still miss the bug.** One fix shipped with seven green tests and did
not work, because every test asserted the shape the *tests* invented rather than the shape the
system actually produces. Find the real shape by reading the code that builds it — usually the
prompt or the payload itself — and test against that.

**Break a guard on purpose before trusting it.** A type, a test, or a check that has never been
deliberately broken may be checking nothing at all. Break it, watch it fail, then fix it, and say
in the commit message which failure you saw. This has caught checks that were quietly passing on
everything.

**A new rule that refuses things needs its own tests fixed first.** A build rule that started
refusing bad input broke three existing tests and turned every push red for six days before anyone
connected the two. When you add a refusal: check both directions (it refuses the bad thing *and*
accepts the good thing), write the skip by matching the refusal's own wording rather than a file
name, and watch the first push after it lands.

**Tools that find dead code lie in three different ways.** They miss things called from outside the
folder they scanned; they treat a mention in a comment as a use, or ignore comments entirely,
depending on the tool; and they do not look in the helper scripts folder at all. Both of the
automatic removers strip comments along with the code. Before deleting anything on a tool's say-so,
search every tracked file yourself, including the scripts.

**Check the example actually proves the bug.** A bug entry cited a specific boss in a specific game
as its example. That boss has no note in the data at all, so the device check built on it could
never have shown anything. Before building a check around an example, confirm the example exists.

**Check a brief against itself and against the data before launching it.** A brief that contradicts
its own rules will still be carried out, and the helper will report success. One lane spent its
whole budget on a row that could not have produced a result.

---

## 3. Checking work on the Steam Deck

The device is the only proof for anything about focus or layout. These are the things that waste an
evening if you do not know them.

**Only one thing may drive the Deck at a time.** Other chats press buttons on the same device. The
list of connected tools shows reads only, so it will not tell you someone else is mid-batch. Ask
for an exclusive window, or work over a direct connection instead.

**Quirks that look like failures and are not.** Opening the plugin fails the first time after a
deploy, then works. The check that the build on the device matches the build here can never pass,
by design. Starting a new chat destroys the oldest of the eight saved ones. The screensaver freezes
panel animations, so a frozen panel may just be a dark screen. The activity log is switched off, so
read the model server's own system log instead. Voice input can be tested without a microphone
attached.

**Assert what is visible, not what has focus.** A walk through the controls can report every step
passing while the control it landed on is hidden behind the dock at the bottom of the screen. Check
the control's position against where the dock starts, not just whether it has focus. And script at
least one pass that uses the panel normally, rather than only stepping control to control.

**"Covered by a corner icon" is usually the check measuring a box, not a person seeing a problem.**
The walk check decides whether a stop is visible by sampling points across its RECTANGLE. Two
controls are built, on purpose, so their box overlaps a floating corner icon while their words keep
clear of it: the question row behind Retry, and the last part of an answer behind Copy. Both reserve
the corner with a floated spacer, after two rounds of the maintainer's own feedback in September. So
both will read as "focused but not visible" on every walk, for ever, with nothing wrong. Measured
2026-09-21: the question's first word starts six pixels past the Retry icon's edge, and the answer's
last line clears the Copy icon with only its line spacing touching it. Two bug entries were filed on
this and withdrawn the same night, and the question-row entry had already been opened and closed once
before on the same reading. Before filing anything about either of these, ask the page where the TEXT
is -- take the element's own text range rectangles and compare those against the icon -- rather than
trusting the percentage. Evidence: `docs/test-evidence/plan63-CORNER-ICON-COVERAGE-01.json`.

**Offer to pin the questions before asking anyone to type.** Typing a sentence on the on-screen
keyboard with thumbs, once per case, invites a typo that silently changes what is being tested.
There is a way to pin a batch of exact questions into the panel; use it. This is a standing
instruction from the maintainer.

**The "Clear all plugin data" wipe also removes the Deck's own Ollama install and its downloaded
models** whenever Ollama lives in the home folder, which is how "Run AI on this Deck" sets it up.
A backup of the settings file and the saved chats cannot put those models back; they have to be
downloaded again. A yes to "wipe the plugin data, backup first" does not obviously cover that, so
ask for it separately, or leave the three wipe rows owed. Found 2026-09-15 by reading the wipe
method before pressing the button.

**The pretend headset bench has its own quirks.** It takes no mouse input. You can only see a panel
by bringing the mirror window to the front. The helper that talks to it raises an error even when
the answer is "fine". The Python side runs on the PC, with a stand-in for the answer service.

---

## 4. Briefing helpers

**Tell the helper what is allowed to stay.** Hand over a list of things a tool flagged without
saying "keeping one because it is genuinely the clearest choice is a fine answer", and seven
helpers will reach for a thesaurus to drive the number to zero. Say it plainly and they will
instead report what they kept and why — which is the useful answer.

**A number that counts the wrong thing will quietly win.** A size limit that counted explanations
along with code pushed four helpers into writing worse explanations to stay under it. If a measure
is fighting the work, the measure is wrong; correct the measure and record why, rather than letting
it bend the work.

**Give exact lines, one question, and a cap.** A review of a 27-line rule that let the helper follow
every pointer it found cost 62 tool calls and about 130,000 tokens. The same review with exact line
ranges and one question costs a fraction of that.

**Script the checkable part first.** A script costs nothing per run. Hand the helper only what a
script cannot answer.

**Five helpers at once, each in its own copy, while the session drives the Deck.** The shape that
worked on 2026-09-15 (plan 55), written down because the maintainer asked for it to be kept. The one
running the session writes no code itself. It makes each helper its own copy of the repo from the tip
with the copy script, writes one brief per helper — the tip hash and the base check, the files it
owns, one fix per commit, the five gates, the focus law, and the override that the copy's packages
folder is a link so the helper must not run an install — and starts up to five in the background. While
they work, the session uses the Deck, which would otherwise sit idle: the measurement that no helper
can be given until a cause is named, and the test rows that do not depend on the fixes in flight. A
read-only lookup helper compiles the test rows the pass needs into one scratch file, so the session
does not read tens of thousands of words of testing documents itself. A bookkeeping helper does every
roadmap, testing and changelog edit from a list of results the session hands it; it never invents a
device result. When a helper finishes, the session reads its diff, lands its commits one at a time
with the gates after each from a small script in the scratch folder, in the background, and starts
the next helper in the freed slot so five stay busy. A helper that finds its fix needs a file outside
its list stops and says so; a follow-up helper owning those files is cut from the new tip only after
the first one's commits have landed, so the two cannot clash. Two things to know: the usage limit
kills every running helper at once, mid-work, but their copies keep their commits and edits, and each
can be resumed after the reset with one short message that keeps its context — cheaper than starting
over; and while landings run in the shared checkout, tell the bookkeeper to finish its edits and
report the file list rather than commit, so the two do not fight over the index.

---

## 5. Design and screen work

**The drawing is the design.** [major-redesign.md](archive/major-redesign.md) is the agreed look. Work built
from a written description instead of the drawing has been wrong before — "one line" was built as a
single chip when the drawing clearly showed three side by side.

**They want to see it, not read about it.** When there is a choice between screen layouts, draw the
options at true size from the real code and show them side by side. A written list of options is not
what was asked for, and has been sent back.

**Check that two effects survive each other.** Two visual effects applied to the same edge can
cancel out. Render the pair and look at it before recommending it.

**There is no design system here.** Tools that expect one will find nothing. The agreed values live
in [design-tokens.md](design-tokens.md) and the rules in
[design-language.md](design-language.md).

**A height set as a percentage of the screen is not one fixed number.** The Deck's own screen and an
external monitor are different heights, so the same percentage in the stylesheet turns into a
different number of pixels on each, and a measurement taken on one screen proves nothing about the
other. Found 2026-09-20 in the AI models list: 48 per cent of screen height came out as 400 pixels on
a 1080p monitor and about 300 pixels on the Deck's own screen — the maintainer's own count and an
earlier drawing were both right, they were just looking at two different screens.

---

## 6. Tooling traps on this machine

**Write scripts to a file and run them.** Inline scripts typed into the shell mangle backslashes
and quotes. Write the script to a temporary folder, run it from there.

**A heredoc can turn an escape into a real NUL byte.** A small Python edit script written through a
Bash heredoc carried a doubled backslash meant for a six-character escape in the TypeScript source;
the heredoc collapsed it and wrote one real NUL byte into the file instead. Git then treated the
file as binary, stopped normalising its line endings, and the change showed up as a whole-file diff
instead of a few lines — that is how it was caught. Nothing in the gates catches a NUL byte on its
own. After any scripted edit, count NUL bytes in the file and check that `git ls-files --eol` still
reads `i/lf`. One more trap in the same family: `git checkout <hash> -- .` stages whatever it
writes, so fixing a file on disk afterwards still leaves the bad version sitting in the index until
it is re-added.

**Normalise line endings before an exact-match edit.** Files here can carry Windows line endings,
and an exact-match edit or a "did my change survive" check will fail for that reason alone and
nothing else. Two helpers once failed their checks over this with nothing wrong in their work.

**Working folder carries over between shell calls.** Changing folder in one call leaves the next
call somewhere unexpected. Start every command from the repo path spelled out in full.

---

## 7. Documents

**Never resolve a conflict in the roadmap or the testing document by taking one whole side.** Both
files gain rows from every landing, so choosing "mine" or "theirs" silently drops someone's work.
Merge row by row, and afterwards read the open sections against the finished one to make sure
nothing was lost or double-listed.

**Keep the roadmap's shape.** It runs Bugs, Features, Verify, Knowledge base, then Done. Entries
are edited where they sit — never struck through. Something parked keeps its entry, tagged and
dimmed, rather than being deleted.

**Write the questions for the maintainer into a file, not into chat.** Chat gets lost. There is a
decisions file for exactly this, and it holds the reasoning as well as the answer.

**Everything written for the maintainer is in plain language.** This is the most-repeated request in
the project's history — it has been asked for five separate times. The full rule is at the top of
[AGENTS.md](../AGENTS.md). The place it slips most is a status update full of measurements: say what
changed for a person using the plugin, then give the number.
