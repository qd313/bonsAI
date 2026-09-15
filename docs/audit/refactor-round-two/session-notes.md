# Refactor round two: handover notes

The newest note is at the top. Every session that stops writes one, so the next session can
pick up without rereading anything but this file.

---

## 2026-09-15, phase 6: the handoff, and the clean-up is finished

**The clean-up is done.** Seven phases, 13 to 15 September. Nothing a person using the plugin can
see has changed, and that was the point. [The postmortem](postmortem.md) is the honest account:
what it cost per phase from the ledger, what it changed, the three things it did not manage, and
what to do differently if there is ever a round three.

### Your question about the old copies of the project: nothing in them is unique

Thirty copies, every one checked rather than assumed. Nothing in any of them would cost re-working
if the folders went away.

- **Six hold commits that are not on the main line.** Five of those six are already there under a
  different commit number — the same work, committed again when it landed. Checked by sampling the
  actual lines of code, not by reading commit titles.
- **One was rebuilt from scratch under a different name.** The guard against advice that tells you
  to delete your save data. The version on the main line is the better one: it writes down what it
  is known to miss.
- **One is genuinely only in a copy, and it is meant to be.** The three commits that widen the
  troubleshooting search to questions that only describe a symptom. That work was accepted and then
  deliberately held back, twice, because what comes back is a tip about something else entirely. The
  reasoning is written into the roadmap entry. **Its branch keeps the commits**, so the folder can go
  and the work stays.
- **The loose uncommitted edits are all superseded.** One copy had a 424-line change to the
  answer-checking script; the main line's version of that file is 511 lines further on and has every
  function the copy had. Another had the spoiler fix that stops a story-driven game being treated
  like an arcade one — already on the main line. The rest is one file that is rewritten on every
  commit anyway.

**Nothing was deleted.** Removing thirty folders needs your say-so, and the tool asked for it. When
you are ready: the folders can all go, and **no branch should be deleted** — a folder is a working
copy, a branch is where the commits live. That is what keeps the held-back symptom-search work.

### What this session wrote

- **[lessons-learned.md](../../lessons-learned.md) is new.** Seven sections of traps this project
  has already fallen into, each saying what happened before what to do. Until today this only
  existed in one AI tool's private memory on your machine, which meant a different tool, or a
  reinstall, started from nothing and repeated the mistakes.
- **The one guide is rewritten**, 31.4 KB to 21.1. Nothing earned by a bug was cut. What went was
  duplication: two tool tables that repeat the setup document, the long routing write-up that
  repeats its own plan, the shelved in-editor preview, and every hand-typed line number.
- **The README is rewritten** for somebody who has never seen the plugin. The warning block at the
  top was a wall of capitals and jargon; it is now readable. Internal roadmap chatter that had
  leaked into the feature list is one honest "rough edges" paragraph.
- **Both refactor plans are archived**, with every live reference to them updated. The round-two
  plan carried "planned, not started" at the top for six phases; it now says finished, and names the
  three places it turned out to be wrong.

### One measure was pointing the wrong way and would have failed this work

The size check on the one guide was set to **bigger is better**. That was right once: the guide
started as a 9 KB stub and the plan asked it to grow to 12 when it absorbed the rules from the
editor we dropped. It then grew to 31.4, the check recorded that as the best-ever value, and from
that moment the guide was only ever allowed to get **bigger** — this session's rewrite would have
been failed for trimming it.

That is the third time in this clean-up a measure has fought the work: the file-size number pushed
four workers into writing worse explanations, a word list invited seven workers to reach for a
thesaurus, and now this. The habit that keeps paying: when a measure and the work disagree, check
the measure first.

It is now lower-is-better with a ceiling, like the roadmap and the testing document. **The target of
12 KB is left untouched and is not met at 21.1 — that is your call.** Twelve was set before this
file carried the Steam Deck focus rules, the routing table and the settings warning, every line of
which was earned by a bug. Reaching 12 means deleting some of that. Twenty is the honest number.

### What is still open, all of it yours to decide

1. **The thirty folders.** Recommended: remove them all, keep every branch.
2. **The size target on the one guide**: 12 as written, or 20 as recommended.
3. **The duplication target of 350** was set against a measuring tool nobody uses any more. Today's
   tool says 891. The target needs resetting before anyone can say if it is reachable.
4. **The testing document is at 141 KB against a ceiling of 145.** It will breach on an ordinary
   landing soon. It is one of the five files with a trimming job already on the roadmap.
5. **The settings list is still written out by hand in seven places.** This was meant to be phase 4
   and did not happen. It is the one gap in the clean-up that can actually bite: adding a setting is
   still about eighteen files, and missing one of the seven spots means it silently stops working in
   one situation. Already happened once, to four settings. It is on the roadmap at one star, which
   undersells it.

---

## 2026-09-15, phase 5 session 2: the headers now talk to someone who has never seen the code

**Phase 5 is finished except for one decision, which is yours** — see the Deck question below.

**157 more files rewritten, and again not one line of the program changed.** Proved the same way
as last time: strip the comments out of the before and after of every file and compare what is
left. All 157 identical. The only code that changed anywhere this session is one of our own
scripts, and that is named in the proof rather than waved through.

**The job this time was different from last time.** Session 1 filled in what was missing. These
files were not missing anything — every label was filled in, just filled in for somebody who
already knew the system. The real example that started it:

> Purpose: Map frontend settings snapshot input into the backend BonsaiSettings RPC payload shape.

Accurate. Useless to anybody else. It now opens: *"The Settings tab holds every setting under a
screen-side name. The back end that writes them to disk knows the same settings under different
names. This file is the translation between the two."*

**Files whose header still leans on terms of art: 170 down to 26.** Every one of the 26 was
checked and left on purpose. Some are the product's own vocabulary — the code says "capabilities",
the screen says permissions, and the header explains that once. Some are the real name of a thing
in the code. Some are not words at all: one is the game title *Baldur's Gate*, another is a command
a person literally types. A word list cannot tell those apart, which is the point below.

### The new rule: check every claim before writing it into a header

**This is the thing to carry forward.** A header that says something false with confidence is
worse than one that says nothing, because the next person believes it.

I wrote the two worked examples the seven workers copied, and **both contained a confident
falsehood on the first pass** — I claimed a missing setting would fail silently when the type check
catches it immediately, and I said old settings files are granted four permissions when it is
three. Both were assumptions carried from the area's reputation, and both were caught only by going
and reading the code. That went into the brief as a rule, and it paid for itself:

- A back-end file said it was used for downloading AI models. It is not used for that at all.
- Another said it filters the download screen. It has nothing to do with the download screen — it
  runs at question time.
- One said an old settings file gets every permission. It gets three of five.
- One said its two magic phrases were a developer thing. They are a documented feature for people.
- One promised to stay in step with a file that does not exist anywhere in the project.
- One described a row of four buttons that was removed some time ago.
- Two pointed at documents that had since moved.

**Every one of those had been sitting there being believed.** None would have been found by a test.

### Two of our own tools needed work, and one number was wrong before we got here

**The map of the code would have become unreadable, and the fix was not to write less.** That page
pastes every file's description onto one screen. Three long headers took it from 91 KB to 94.5 KB;
the other 157 would have made it something nobody opens. Entries are now trimmed to their opening
sentences with a mark showing there is more in the file. Headers stay whatever length they need —
that is your ruling from last session and it was not going to be quietly walked back to save a page.
The script says so in its own text, so the next person who finds the map thin raises the limit
rather than cutting a header.

**A third file turned out to be rewritten on every commit**, like the version file last session, so
a header typed into it vanishes. Its description now lives in the thing that writes it. All three
such files are listed in one place now.

**The copy-paste number had been failing the checks and it was not this phase's doing.** Worth
reading carefully, because it looks bad at a glance: the recorded figure was 871 and the tool
reports 891. I measured a clean copy of the project at the final commit of phase 4 and at every
commit since — **891 every time, before any of phase 5 existed.** So it has been 891 for a while and
nobody recorded it; the likeliest cause is phase 4 moving code between files. It is written down
now as 891 with a note saying in capitals that it is twenty lines *worse*, not progress, and that
the goal of 350 is what to judge it against. Also written down, because it is the obvious next
question: **comments do not count towards it.** 257 files gained explanations across the whole of
phase 5 and that number did not move by one line.

**A real hole in the comments-only proof, now written down.** Comments are stripped from both
sides before comparing — so deleting a comment that *does* something (one that switches off a
warning, one that silences a type complaint) looks exactly like deleting an ordinary sentence.
Rather than assume it was fine, I counted: there are no type-suppressing comments in the app at all,
nothing on the back end reads its own descriptions, and the only seven comments that do anything
were all still there, unchanged, at the end. The hole is real but nothing fell through it.

### The house style now lives somewhere it outlives the plan

`docs/code-clarity.md` is what a newcomer finds. It was written in early August and had drifted: it
did not mention two things the checks now fail the build on, did not carry the plain-words rule at
all, and pointed at two files that no longer exist. Rewritten around who you are writing for, with
the before-and-after pair, the no-length-limit ruling, the check-your-claims rule, what is actually
enforced, and the three generated files. When the plan is archived, that document is what is left.

### Five things for you, none of them fixed

Three were owed from last session and were blocked because another session was mid-edit in the
roadmap. That work has landed, so all five are in the roadmap now:

- Mistyping one model name in a several-model download loses it without saying so.
- The settings list is written out by hand in several places in one file, so a new setting can
  quietly stop working in one situation. It has already happened once, to four settings.
- Two things wanting the shared voice server at once would cut the first one off.
- **New:** attaching a screenshot puts a line of technical text at the bottom of the answer —
  `[AttachDebug: requested=1, prepared=1, errors=0]` — every time, whether or not anything went
  wrong. Nothing on screen removes it and no setting turns it off. Checked properly: the safety net
  that strips the model's own internal tags does not know about this one.
- **New:** a model too big for the Deck reads as a safe choice whenever the download list does not
  say how big it is. Only a short hand-written list and a 15 GB size catch the rest.

Two smaller things a worker noticed that I have left as code comments rather than roadmap entries:
the two-second wait before giving up on Steam's parental answer is a placeholder nobody ever
measured on a real Deck, and it is flagged as such in the code.

### The Deck question, which is now the only thing standing between you and phase 6

I have recommended skipping it twice and this is the third time, with better evidence than before:

- No app file had a line of code changed across the whole of phase 5 — 257 files, all proved.
- Nothing on the back end reads its own descriptions, so rewriting them cannot change behaviour.
- There are no type-suppressing comments in the app, and the seven comments that do anything are
  all still there and unchanged.
- The full check passes.

There is no route I can find by which this phase reaches a running plugin. The Deck evening that is
genuinely owed is the knowledge-base one. **Say the word and I will queue a short check anyway** —
it is cheap, and it is your call, not mine.

### What is left

Phase 5's file work is done. Phase 6 is the handoff: the README and the neutral guide in plain
words, the lessons that live only in one tool's memory moved into the repo, a postmortem with the
real cost per phase from the ledger, and the old plan archived.

**Twelve copies of the repo from these two sessions are merged and idle**, and there are eighteen
older ones behind them. The notes from phase 0 say clearing those needs your say-so, so
they are all still sitting there.

### For whoever briefs workers next

The three lessons from last session held. One to add:

- **Tell the worker what is allowed to stay.** Handing over a word list without saying "keeping a
  word because it is genuinely the clearest one is a fine answer" invites seven workers to reach
  for a thesaurus. Saying it plainly got back exactly the opposite: every worker reported the words
  it kept and why, and each reason was good. A tool that finds work is not a target to be driven to
  zero, and a worker will treat it as one unless told otherwise.

---

## 2026-09-14, phase 5 session 1: every file and every long function now explains itself

**Nothing a person using the plugin would notice has changed, and that is proved rather than
promised.** Across 100 files, every single changed line is inside a comment. A script takes the
comments out of the before and the after of each file and compares what is left; all 100 came back
identical, with none skipped. That check is new, built at the start of this session, because the
one way this phase could break the plugin is a worker quietly tidying a line of code while writing
about it -- which reads as harmless in a diff.

**Five numbers went to zero.** Files with nothing describing them, 20. Big files with no
walkthrough, 21. Long screen functions with nothing explaining them, 53. Long back-end functions,
7. Header references pointing at names that do not exist, 80. All nil, across 311 files. About
5,500 lines of explanation went in.

**The header check is now a real gate**, at its strict level, instead of advisory. Its own note
always said phase 5 would flip it once the backlog cleared. A new file that ships with nothing
explaining it now fails the run, while the person adding it still remembers what it is for. Proved
by breaking it. The generated code map is also rebuilt on every commit now -- nothing rebuilt it
before, and it had silently fallen four files behind.

### Four of our own measuring tools were wrong, and the workers found them

This is the thing worth carrying forward. **Every tool a worker questioned turned out to be
broken.** None of these would have been found by reading them.

1. **The header check flagged 80 problems, of which 75 were not problems.** It treated any word in
   backticks as a claim that a function by that name lived in the file, so ordinary quoting of a
   setting name or a screen attribute came back as an error. A check that is wrong 94% of the time
   is one everybody learns to ignore. It now only checks a name written with brackets after it.
2. **The long-function scanner could not see a comment above the commonest way screens are written
   here** -- `const X = () => {}`. It walked up to the declaration and stopped one step short of the
   line the comment actually sits above. It was calling carefully written files unexplained, and no
   amount of rewriting would have satisfied it. Correcting it took the same untouched code from 56
   to 53.
3. **The map of which file uses which read an example import inside a comment as a real import**,
   inventing a dependency on a file that does not exist. That map is what we check for circular
   dependencies, so a quoted example could in principle have invented a loop nobody could explain.
4. **The count of files over 400 lines was counting the explanation as part of the file's size.**
   See below -- this one did real damage.

A fifth, smaller one: `src/pluginVersion.ts` is rewritten from scratch on every build, so a header
written into it was wiped and the check went on reporting the file as undescribed however many
times someone described it. The header now lives in the generator that writes the file.

### The size number was fighting the work, and it won four times before anyone said so

The count of files over 400 lines included comment and docstring lines. During a phase whose entire
job is explaining files, that is a number that grows as the work is done -- and **four separate
workers damaged their own writing to satisfy it before any of them raised it.** One shortened a
header twice. One wrote a header as a single dense paragraph to land at exactly 400 and said so,
asking whether a person would sign off on crossing the line. One trimmed a header on a file that
turned out to be 366 lines of code. One compressed three and moved a walkthrough somewhere less
obvious purely to save lines. Three reported the conflict; all four had already written worse by
the time they did.

**The maintainer's ruling, on the day:** clear comments matter more than a line count, and a long
readable explanation beats a cramped one. The number now counts lines of actual code, via
`scripts/code_line_count.py`, shared by the numbers list and the header check. All four workers were
sent back to restore what they had cut, and all four did.

**Read the new figure carefully.** 42 files over the limit became 27 on exactly the same code. That
is a changed measuring stick, not progress. The target of 30 now reads as met and is not met. Had
the old count stood, this phase would have finished at 48. Both figures are reported side by side
so neither can be quoted alone.

### What is left of phase 5

Not finished. The plan allows two sessions and this was the first.

**141 files still describe themselves in terms of art.** The 100 files touched here were the ones
with something missing -- no description, no walkthrough, an unexplained long function. The rest
have a header, but written for somebody who already knows the code: "RPC surface, capability gates,
and Ask orchestration entry" was main.py's, and it is representative. That is session 2, and it is
cheaper per file than this session was: the header is all that needs reading in most cases. The
most common offenders are the words RPC, persist, normalise, orchestrate, registry, payload and
snapshot.

**The Deck.** The plan asks for a short check on the device at the end of phase 5. My view, for the
maintainer to overrule: it would be confirming mechanically what is already proved -- no app file
had a line of code changed, and the full check passes -- and the Deck evening that is genuinely owed
is the knowledge-base wave two one. Left undone and flagged rather than quietly dropped.

**Three findings for the roadmap, none fixed here**, per the rule that a refactor commit never
carries a fix:
- Ask the Deck to download several AI models and mistype one name: the bad one is silently dropped,
  a line goes to the log, and the rest download. It looks like it worked.
- If two things ever want the shared voice server for different speech models at once, the second
  restarts it and the first is never told -- it just finds the server gone. Only one thing uses it
  today. It would matter the moment a wake-word listener is added.
- The settings hook writes its list of about fifty settings out by hand in several places in the
  same file. A setting added to one list and missed in another does not break visibly; it quietly
  stops working in one situation. The file already records this happening once, to four settings.
  This is the same thing the numbers list tracks as "places the settings field list is repeated",
  still at 7 against a target of 1, and the registry that was meant to fix it did not get built.

### For whoever briefs workers next

Three lessons, now written into the worker brief template as well:

- **Name every file.** A brief that said "the remaining 26 files" and listed categories got back a
  careful list the worker worked out itself: it overlapped another worker by one file and missed
  eight. The work was good and none was wasted, but only by luck.
- **Say which numbers do not constrain the work.** A brief that says "explain this properly" while a
  check punishes long explanations puts a worker in a bind, and workers resolve it by writing worse
  rather than by refusing.
- **When a worker says a check disagrees with its instructions, check the tool first.** Four for
  four this phase.

One practical note: every lane merge conflicted on the same generated architecture file, every time.
The resolution is always to regenerate it, never to pick a side. Not worth fixing, worth knowing.

---

## 2026-09-14, phase 4 finished: one more block out, and the leftovers closed off

**Phase 4 is done.** Three commits. Nothing a person using the plugin would notice; checked on the
Deck at the end, because the change was to the screen and the earlier Deck evening no longer
covered it.

**Rating a reply is now its own piece.** Thumbs up or down, and the five chips that reword your
question for you, came out of the Ask file. It is down to 1,469 lines from 1,524.

Where that piece is called from was not a free choice, and both reasons were checked before
moving anything: it needs the request number, which is worked out further up, and the Ask bar's ✕
wipes one of its values, so it has to exist before that button is written. That puts it
immediately before the submit block. Nothing in between touches any of it.

**Retry deliberately stayed behind.** It asks again straight away, so it belongs with the code that
asks — and leaving it there means the new piece never sends anything at all, which is a much
simpler thing to reason about.

**The order-of-hooks record did its job twice.** First it failed and named the exact spot when the
order changed, which is what it is for. Then, after I added the new file to it, the count went from
77 to 78 — and the important part is what the list shows: **nothing left it.** Every one still
exists, just further down. The single addition is one new clear-everything function replacing three
repeated lines.

Then I checked the record actually covers the new file, rather than assuming: swapped two
same-kind entries inside it and watched the check fail naming both. A check that compared names
only would have passed that.

**The tests were the real gap.** Nothing in the whole suite mentioned either of these two buttons
before today, so a green run said nothing about the code being moved. Nine tests now cover them,
and I proved they bite by breaking the rule about which reply style a chip remembers and watching
the right one fail.

**On the Deck**, with a fresh question answered in 35 seconds: "Not really" saved a rating and
brought up the five chips; "Too long" filled the Ask box with "Give a shorter answer — key points
only" plus the original question, saved a second line naming which chip, and **sent nothing**; the
✕ cleared the box, the rating row and the chips together. That last one was worth doing on purpose
— it is the one place the new piece is reached from outside, and the reason it sits where it does.
Log: 12 lines, no errors.

**The leftovers are closed off rather than left hanging.** The plan promised the long files would
get a "split later" entry each; they had none, so there is one now, naming all eleven with today's
sizes. Two things were deliberately NOT done, both on the plan's own rules: the two popover menus
that share 74 lines are a near-copy, not an exact one, and near-copies need a written decision; and
nothing else got split, because the plan puts that out of scope this round and the phase is already
checked on hardware.

**Watch the roadmap size.** It is 98.74 KB against a 100 KB ceiling. The next landing or two will
cross it, and there is already an entry about trimming the big documents.

**Two small things I got wrong and caught:** a probe that guessed at wording flagged errors on
screen that were only words inside the panel's own stylesheet, and my first sketch of the split put
the new piece where it could not see what it needed. Reading the real thing fixed both.

---

## 2026-09-14, phase 4 on the Deck: three days of moved code, checked on real hardware

**The plugin behaves the same on the Deck.** The log for the whole evening is twelve lines
long with no error, no warning and nothing failing to load. Hades was running throughout, so
the game-aware parts were exercised rather than skipped.

What was checked, and what proved each one:

- **The back end still loads.** "plugin loaded", no import failure. All six files added or
  split this phase import on the Deck's own Python, which is a newer version than the one
  the tests run on here.
- **One real question, start to finish.** The same question as yesterday's check, so the two
  are comparable: answered in 40.4 seconds against 42.6 yesterday. The log shows every step
  in order -- read the request, built the prompt, called the model, parsed it, ran the safety
  check -- and the chat was saved to the Desktop folder as usual.
- **The three question chips above the Ask box**, which is the biggest screen-side change this
  phase. They rotate through their seeds, one of the seeds was drawn from the running game,
  and pressing one fills the Ask box. Caught mid-animation twice, which is the decode effect
  working.
- **Testing the connection to the AI.** Proved by the AI server's own log: the button produced
  a matching pair of requests at that second and both answered 200.
- **The knowledge base status** drew on screen: installed, version 2026.09.08.
- **Voice, all the way through, with no microphone.** The Deck's own speech tool spoke a
  sentence, it was converted to exactly the sound format the plugin records in, and handed to
  the plugin's own transcription step -- which runs through every piece lifted out today. It
  came back word perfect, 8 of 8. The binary and the model are both found at their real paths.
- **The shared text rules behind the typed commands**, checked directly on the Deck rather than
  through the screen, because typing needs the on-screen keyboard.
- **A full walk of the main screen:** 18 controls in 32 presses, no dead ends, no loops. The
  only partly covered spots are the same two recorded yesterday -- a question 78% visible behind
  Retry, a reply 89% behind Copy. Unchanged, so not new damage.

Three things worth carrying forward:

- **The Deck's screensaver pauses the chip animation.** A chip that has not changed in ninety
  seconds is not a fault; it means the screen has gone dark. Waking it made the chip rotate
  within thirteen seconds. Holding the Deck awake stops it sleeping but does not stop the
  screen dimming, so wake it before judging anything that moves on its own.
- **The plugin's activity log is switched off by default**, so a quiet log proves nothing about
  whether a button did its job. The independent witness is whatever the button talks to -- for
  the connection test, the AI server's own request log.
- **My probe script guessed two names wrong and raised a false alarm each time.** Once on how
  the voice paths are asked for, once on the two names the screen actually sends for the mode
  and the game. Both looked like a fault in moved code and neither was. Read the real signature
  before believing a probe.

**One difference from yesterday that is not ours.** Asked the Portal 2 question with Hades
running, the AI declined it and offered Hades help instead. Yesterday, with nothing running, it
answered the Portal 2 question. That is the AI reacting to which game is open, not the clean-up.

**One pre-existing behaviour noticed, not introduced.** A reply style spelled in capitals falls
back to the default instead of being recognised. The screen only ever sends it in lower case, so
nobody can hit it, and the part that checks it was not touched in this phase.

**Phase 4 is now checked.** What is left in it is optional: more of the Ask hook if it is wanted.
The remaining blocks are tangled with each other, so each needs reading rather than lifting.

---

## 2026-09-14, phase 4 session 3: the Ask hook starts coming apart, and one step gets cancelled

**Nothing a person using the plugin can see has changed.** 1,289 back-end tests and 1,187
screen tests pass, the full gate is green including the build. Four commits.

**The frozen shape paid for itself.** The Ask code hands back 52 things and now declares
them. Lifting 129 lines of it into a hook of its own compiled first time, and that compiling
*is* the proof all 52 survived. That was the whole reason for freezing it a day earlier.

What came out: choosing the three question chips above the Ask box. It re-rolls on four
different triggers that are not interchangeable, and none of it has anything to do with
asking a question. The Ask file is 1,643 to 1,531 lines.

**Splitting a hook has a second risk and it is now checked, not assumed.** The screen
library matches these by the order they run in, not by name, so a block lifted out is only
safe if the new one is called from exactly the spot the old block sat in. All 77 are now
recorded and asserted.

**The tool that checks that was wrong twice before it was right.** Both would have given a
clean pass on a broken split:

- It compared names only. Swapping two of the same kind leaves the name list identical while
  changing which one holds which value. It now records what each one feeds as well.
- Its pattern required the bracket to come straight after the name, so every one written with
  a type in between was skipped in silence. It was reading 50 of 77 and reporting success on a
  file it had not seen.

**Step 5 is cancelled, and the reasoning is written up.** It was going to collapse the 48
settings into one declaration, because adding a setting means editing five files. The five
files are real; the danger they were assumed to carry is not. I added a made-up setting to
one file and followed what complained: the build named the next missing file four times over,
ending with the settings screen and a test, and then adding a key to the shared defaults file
that neither language knew about failed three tests on each side. They are not five chances to
get it wrong -- they are five steps in a queue, and the build hands you the next one.
Collapsing them would remove that, and the repetition that costs most cannot be collapsed
without making every settings screen redraw whenever any setting changes.

**The entry point is under three thousand lines for the first time** (2,995, from 3,292 at the
start of yesterday). Installing the knowledge base from a folder was the fourth thing to leave,
and it split cleanly: every refusal now happens before a single file is touched, so its ten new
tests never write anything.

**The gate caught me twice this session and was right both times** -- a new function over sixty
lines with no comment above it, and a new test file repeating its own setup. Fixed both rather
than moving the baseline.

**Left to do in phase 4:** more of the Ask hook if it is wanted -- the remaining blocks are
tangled with each other, so each needs reading rather than lifting -- and the Deck check for
the whole phase, which is the thing that actually matters now.

---

## 2026-09-14, phase 4 session 2: the last seam, then code starts moving

**Nothing a person using the plugin can see has changed.** 1,277 back-end tests and 1,187
screen tests pass, the full gate is green including the build. Four commits.

**All eight seams are now held.** The last one was what the plugin's main screen hands down to
its tabs, and reading it corrected something the first pass got wrong. That seam was not
undocumented: all six tabs do have a written argument list. But each is *derived* from the tab
it feeds, so it follows the tab rather than holding it still. The compiler still stops a build
when a tab needs something new; nothing noticed the list getting longer. So it is held by a
number instead: **215 things cross that boundary, 108 of them to the Ask tab alone.** That
number is now recorded as the best ever and can only go down. Proven by pretending it was one
lower and watching the check fail.

That 108 is the finding worth keeping. One tab takes half of everything the screen passes
along, and it is fed by the hook whose 52 returned things were frozen yesterday. Same problem
from both ends.

**The entry point is 241 lines smaller: 3,292 to 3,051.** Three things left it, each in its own
commit, each checked by parsing both versions rather than by reading them:

- **Deciding whether the AI is reachable** — 140 lines whose only tie to the plugin was two log
  lines. The method left behind is 15.
- **Reading what the screen sent** — the payload reader, the attachment tidier and the
  true/false coercion. This also removed a back-reference that should not have existed: the ask
  service was taking the plugin class as an argument purely to borrow its attachment tidier.
- **The knowledge base's status answer** — 53 lines, now 6.

**Two of those three had no test at all**, which round one's inventory had already flagged.
They have 30 between them now, and the tests are real ones: the network probe, the
"is it installed" check and the storage lookup are all handed in, so every answer is asserted
without a running Ollama and without a corpus on disk.

**Also: three files each held their own idea of what an ask mode is**, and the comment on one
of them said outright that nothing enforced the match — naming what it cost, which was Expert
silently answering on Speed's shorter budget for seven weeks. Moving the third list to derive
from the first was the obvious fix and the wrong one: it touches the path that picks which
model answers, to save a three-line table. A test gives the same protection for none of the
risk. Proven by adding a fourth mode and watching two tests name the files that had drifted.

**A mistake worth not repeating: `git add -A` swept another session's unfinished design work
into one of my commits.** Caught it in the same minute, undid that part, and their files are
untouched on disk. In this shared checkout, stage named paths, never everything.

**Left to do in phase 4:** split the Ask hook behind its new written shape; declare each
setting once instead of in five files; keep going on the entry point, where the four biggest
things left are all tangled up with the locking that keeps two asks from running at once — and
that locking is the part round one said must stay. Then the Deck check for the whole phase.

---

## 2026-09-14, phase 4 session 1: untangle the knots, then write the shapes down

**Nothing a person using the plugin can see has changed.** All 1,246 back-end tests and 1,187
screen tests pass, the full gate is green, and the build works. Six commits.

This session did almost no moving of code, on purpose. Phase 4's own rule is that nothing moves
until the places where code hands work to other code are written down. So the session untangled
the two knots that made writing them down impossible, wrote them down, and then built guards that
fail when one of them changes by accident.

**Both back-end knots are untied. That number has gone from two to zero and can never rise again
without failing the gate.**

- The four Ask command files formed a ring: each one had to import the file that imports it, and
  two hid that by importing halfway down a function. Two small text rules (trim, fold case, drop
  one leading slash) moved into a file of their own that imports nothing at all.
- Voice capture and the whisper server imported each other. Everything the server needed from
  capture was low-level and belonged to neither, so 143 lines moved into a third file both can
  import. Capture went from 1,413 lines to 1,307.

**Seven of the eight seams now have something holding them still.** Each guard was proven by
deliberately breaking it and watching the failure, not by assuming:

- The Ask hook hands back 52 things and is the file a later step splits. Those 52 are now written
  out with their real types. Adding a stray one fails the build; dropping a real one fails the
  build. Both tried.
- The back end has no compiler, so 61 names across seven files are pinned in a test, with the
  exact way each is called. Renaming one argument fails the test run with a message naming it.
- A call to a back-end method that does not exist now fails the build. Every call site already
  used a real name, which is the proof nothing changed. Tried a typo; the build stopped.

**Still open, and the first job of next session:** what the plugin's main screen hands down to its
tabs. It needs real reading of a 1,709-line file before it can be written down honestly, and
nothing moves behind it until then.

**Two things found by accident, both now guarded:**

- One function was written out twice in the same file, byte for byte identical, so the second
  quietly replaced the first every time the file loaded. Nothing we run looks for that. It is now
  a number that must stay at zero, and the whole back end was swept first: 213 files, no other
  case, no duplicate method in any class either.
- The script that stages generated files wrote its file list out twice and used only one copy, so
  adding a file to the obvious list would have done nothing.

**Three lessons for whoever moves code next:**

- Parse-check before writing, not after. A text replace matched an eight-space indent inside a
  twelve-space line and broke the block below it; the script had already written the file.
- Run the tests immediately after an extraction. The new file was missing one import and eight
  tests said so by name within a minute.
- The gates are worth more than the plan. The unused-export gate refused a generated file that
  exported a count nothing imports, and it was right.

**Left to do in phase 4:** split the big back-end file along the lines round one already mapped;
split the Ask hook behind its new written shape; declare each setting once instead of in five
files; anything else left over. Then the Deck check for the whole phase.

---

## 2026-09-13, phase 3 done: the deleting, and two tools that had to be fixed mid-job

**Phase 3 landed in four commits. Nothing a person using the plugin can see has changed** — every
line removed was one that nothing anywhere called. All 1,244 back-end tests still pass and every
gate is green.

What went, and what the numbers say:

| | Before | After |
|---|---|---|
| Names the screen code offers that nobody wants | 126 | **21** |
| Back-end code nothing calls | 18 | **2** (both held on purpose) |
| Copy-pasted app code | 877 | **871** |

Roughly 1,800 lines of code are gone. The biggest single piece was not stray mess: whisper used to
be obtained by copying a ready-made file out of a container image, and that was replaced long ago by
building it inside the image. The old way was still sitting there with nothing calling it. Removing
it unrolled a chain of six things over four passes, each one only visible once the one above it went.

**The most useful thing to know from this phase: my own measuring tool was wrong twice, and both
times the fix mattered more than the deleting.**

- **It never checked whether other files use a name before calling it file-local.** A name can
  obviously be both used at home and imported elsewhere. Acting on that list stopped eight files
  from being able to import what they import. The type checker caught it and the whole pass was
  thrown away before anything was saved. The check now looks outward first, and it looks at the
  tests and the preview harness too, not just app code.
- **It counted a name written in a comment as a use.** One icon was kept alive by a note next to a
  different icon saying "distinct from this one". Comments are now ignored when counting.
- **It never searched the helper scripts.** A version marker was on the delete list and is imported
  by the script that builds the knowledge base, which writes it into every knowledge base it makes.
  Deleting it would have broken building. The whole-project sweep caught that, not the tool.

**Two more things I broke and fixed in the same sitting**, both worth knowing because they will
happen again to anyone using these tools:

- Removing a file's first import took the file's own description with it, because the tool that
  edits code counts a comment as belonging to whatever is below it. One file lost its description
  before the count of missing ones caught it.
- The same rule bit on the back-end side, and worse: deleting a constant took away a hard-won note
  saying **"do not float on the main tag — upstream churn caused a crash on the Deck"**. That note
  was about the line above it, not the line below. Restored. The tool now shouts about every comment
  line it is about to take, whether or not you asked for a preview.

**Held on purpose and not touched:** the older way of asking the AI, the answer checker, and all
four unused packages.

**The Deck check is done and it passed** (2026-09-13 evening). Sixteen controls reached with the
D-pad in thirty presses, no dead ends, all six tabs there. One real question asked with the
controller — how the excursion funnel works in Portal 2 — answered correctly in 42.6 seconds, log
completely clean: no crash, no error, nothing failing to load. **Nothing a person using the plugin
would notice has changed.** Evidence saved under the test-evidence folder; the walk itself is saved
as a check that can be re-run.

Three things worth carrying forward from that evening:

- **Sending a build to the Deck copies files but never removes them.** A file deleted in this phase
  was still sitting installed on the device from an earlier send. Nothing used it, so nothing broke,
  but it meant the Deck was not running what was actually built. Worth checking before any run that
  is meant to prove a deletion is safe — the compare that the tools offer counts the Deck's own
  compiled leftovers too, so it can never match; compare the real files by hand instead.
- **The run confirmed two things this clean-up had claimed on paper.** The back end really does call
  its own answering step itself, so keeping it was right. And the "asked the AI for a power setting
  and did not get one" case really is already noticed and written to the log today — which was the
  whole basis for holding the answer-checker decision.
- **Two spots in the chat are partly covered by the small buttons in their corner** — a question
  67% visible behind Retry, a reply 89% behind Copy. Both buttons are fully visible and reachable
  themselves, and the design notes describe the copy control as deliberately sitting over the
  answer's own text. Recorded so a later reader does not mistake it for damage.

**One unrelated bug found and filed.** Asked about Portal 2, the answer was right, but the follow-up
offered "Fighting through Ravenholm" as a place in Portal 2. Ravenholm is Half-Life 2. Nothing to do
with the clean-up — the small local model invented it.

---

## 2026-09-13, after phase 2: the red builds fixed, the three measures corrected

**Every push had been failing since 2026-09-07 and it was not the plugin.** The maintainer was
getting a notification on every change saying tests failed. Four tests were failing on the build
server and nowhere else.

Three of them build a real knowledge base, which needs an AI model on the machine. The build server
has none. On 2026-09-07 a rule was added stopping the knowledge base from being built with cards
that meaning-search cannot find — so the build correctly refused, and the tests read that refusal as
a failure. **The rule was right and the tests were never told about it.** One of them still carried
a note saying no AI model was needed, which had been true when it was written.

Those three now skip where there is no model, with a message saying so, and still run for real
before anything lands. They still fail loudly if the build breaks for any other reason — that was
checked both ways on purpose, because a skip that swallows real failures is worse than a red build.
The fourth was a timing check comparing two clocks across threads; it missed by fifty millionths of
a second and now allows a small slack.

**The general lesson: a new safety rule needs its tests updated in the same change.** This one held
for six days across every push, and the notification only ever said "tests failed", so nobody could
see it was one cause and not a growing pile.

**The three measures were corrected** with the maintainer's approval, and the phase 2 write-up now
records them as done. Copy-pasted app code reads 877 instead of 1,847, back-end test duplication
2,076 instead of 2,286, and back-end methods with no caller 1 instead of 3. Nothing about the code
changed — only what gets counted. The saved best numbers were re-recorded in the same change and
each one carries a note in the file pointing at the reason.

**Not pushed.** These fixes only stop the notifications once they reach the server, and pushing is
never done without being asked. Two commits are waiting.

**Phase 2 has nothing open.** Phase 3 starts on the word go.

---

## 2026-09-13, phase 2 done: everything measured, twelve decisions written

**Phase 2 is finished and needs three answers from the maintainer.** They are in
[phase2-decisions.md](phase2-decisions.md), which is the output of this phase. No code changed.

**One new script does all the measuring.** `python scripts/phase2_map.py` runs every inspection
tool and writes seven lists to `docs/audit/refactor-round-two/phase2/`, plus a short summary. Run
it again after every landing in phases 3 and 4 — the counts are how you check a step did what it
claimed. It reuses the file-walking and tool-finding code from the numbers script rather than
copying it.

**The single most useful thing this phase did was take the headline numbers apart.** Raw tool
counts turned out to bundle very different situations together, and the fixes are different in
each case. Three numbers were wrong in a way that mattered:

- Copy-pasted app code is **877 lines, not 1,847**. The measure points at the folder holding the
  screen code, and the front-end tests live in that same folder. So over half of what was reported
  as duplicated app code is duplicated test code. This also overturns a phase 0 conclusion: the
  plan's target of 350 was called unreachable because the real figure looked two and a half times
  the estimate. Measured properly, the target is fine.
- Copy-pasted back-end test code is **2,076 lines of Python, not 2,286**. The rest is repeated
  blocks in saved test-run data files.
- Back-end methods nothing calls is **one, not three**. One of the three is called by the back end
  itself — deleting it would stop the AI answering anything. The other is a device-debug hook that
  is meant to have no caller.

**And the count of unused front-end names is not what it looks like.** Of 153 reported, only 43 are
dead code. 103 are names used inside their own file that just do not need to be shared out, 7 are
pointless pass-throughs, 5 are used only by a test, 2 need a human. **Not one whole file can be
deleted** — every file the tool pointed at is live and merely carries an extra unused name. The
delete phase is trimming, not demolition.

**One finding is not clean-up at all.** There is a 153-line answer-checking feature in the back end
— it catches things like an invented game name before an answer is shown. It works, it has a test,
and it has never once run: the field it was meant to fill is fed by a value nobody supplies. That
is a "did we mean to finish this?" question, and it is one of the three waiting on the maintainer.

**The seams for phase 4 are named**, in Part B of the decisions write-up. Eight of them; four have
no written contract at all. The urgent one is the ask hook: it hands back **52 separate things**
from a 1,639-line file, and phase 4 is the phase that splits that file. That contract must be
written down before any lane touches it.

**Measured, so phase 4 does not have to guess:** 48 settings, and **five files each name all 48**,
so a new setting means editing at least five files and about nine lines.

**Three measure definitions want correcting before phase 3** (listed in Part B). That changes saved
"best" numbers, which the rules rightly treat as suspicious, so it is written down as a decision
rather than quietly done. It is waiting on a nod.

**Next session: phase 3, delete** — but not until the maintainer answers the three questions. The
work packages and their order are in Part B of the decisions write-up. No Deck needed except for
the package removals, which want a build and a start-up.

---

## 2026-09-13, after phase 1: a mistake found and undone, and twelve checks flagged

**Sixteen saved Deck recordings were deleted that write-ups do point at, and they are restored.**
My own instructions caused it: the worker sorting the recordings was told to look for citations in
four places, and that list was short. It missed the planning write-ups and the decisions record.
Worse, the other worker was moving write-ups into the archive at the same time, so some documents
were not where either of them expected. All sixteen came back out of the project's history and are
in the evidence folder.

The lesson is the one the retention rule already states in the testing write-up: a recording cited
by any write-up is never deleted, because deleting a cited recording turns a link into a lie. The
rule was right; the search that fed it was too narrow. Any future pass of this kind searches every
write-up in the project, and does not run while another worker is moving write-ups around.

**Twelve checks are flagged as having no evidence at all.** Separately from the mistake above,
twelve checks name a recording that never existed — checked against the whole history, they were
never written. Twelve results were recorded as passing on the strength of a file nobody can open.
Each row now carries a flag where it makes the claim, they are listed as one batch in the testing
write-up, and there is a roadmap entry saying to re-run all twelve in the next automated testing
session and to treat them as unknown until then.

**Neither of these says the plugin is broken.** They say twelve things we believed were checked may
not have been.

---

## 2026-09-13, phase 1 finished

**The maintainer approved both open calls, and everything is carried out.** The seven old copies of
the project are gone; 26 copies on this machine are now 19. The sorting list was approved as it
stood: 55 write-ups and 11 helper scripts are in the archive with an index saying what each is, and
the three that describe work never done carry a delete-after date of 2026-12-12. Nothing else has a
delete date; archived is not deleted.

**The saved Deck recordings are sorted.** 187 that a test row actually cites are kept as evidence;
281 are out of the project. The folder they lived in is no longer part of the project, so runs will
not pile up again. More were cited than first counted, because some rows name a whole family of
recordings in one line rather than listing each; one such line stood for 39 files on its own.

**A dozen test rows cite evidence that never existed.** Checked against the project's whole history:
those recordings were never saved. The rows read as proven and nothing backs them. Not caused by the
clear-out. Worth someone's attention.

**Three real faults in today's own tooling, all found by using it:**

- The copy helper installed libraries inside copies that sit under the main checkout. Because the
  project declares itself one workspace rooted at the repo, that install reached up and emptied the
  main checkout's tool launchers. The whole test suite failed with "vitest is not recognized" while
  the folder still looked present, and the installer then reported everything up to date, so it could
  not repair itself. Copies inside the checkout now share the main libraries by link.
- Worse, removing such a copy destroyed those libraries outright. Windows treats one of these links
  as an ordinary folder, so git walked through it while deleting the copy and emptied what it pointed
  at. Links are now taken out before git is asked to remove anything. Detecting them needed care: the
  obvious check reports false for this kind of link and only the underlying flag says yes, which is
  why the first fix did not work. Proved by making a copy and removing it with the launchers counted
  before and after.
- The check command died while printing its own output, because a Windows console cannot render an
  arrow and plenty of test names contain one. The crash looked like the failure.

**Where the numbers stand.** The roadmap 118 KB to 91, the testing rows 318 to 135, the orientation
file 13 to 3, the one guide 9 to 31 because everything factual moved into it. Live documents still
naming the dropped editor: 12 down to 2, and both of those are legitimate.

**Five documents are still big and now each carries a trim task at the top**, with its own star
rating, rough time and which model to use. Together about 815 KB. The biggest is the locked decisions
file at 89,000 tokens a read — bigger than the testing rows ever were, and hidden until the two
obvious giants shrank. One roadmap entry covers the set.

**Next: phase 2, map and measure.** No Deck needed. Scripts produce the lists — unused code, exact
duplicates, long functions with nothing explaining them — and one session reads only the summaries
and writes the delete-and-merge list for the maintainer to confirm.

---

## 2026-09-13, phase 1 mostly done, waiting on the maintainer

**What landed.** The two enormous documents are split: the roadmap drops from 118 KB to 90, the
testing document from 318 to 135. What was finished moves to an archive file beside each, word for
word, proved by a checker written before the split that shows every line is accounted for. The
Cursor editor setup is gone: eighteen files deleted, and everything worth keeping moved first. There
is now one guide for a person or any AI tool; the Claude-only file drops from 13 KB to 3 and keeps
only what is specific to that one tool. The D-pad focus rule moved across with its two known errors
corrected on the way.

**Neither big document hit the size the plan asked for** (40 KB and 60 KB; they reached 90 and 135).
Only the finished sections could move without rewriting content, and rewriting was off-limits by
design. Getting further means archiving closed checks and older knowledge-base entries too, which is
a decision, not a move.

**Two things had to be fixed by hand after the lanes finished.**

- Removing the editor left live things pointing at deleted files. Three mattered: the instructions
  every worker reads at the start of a session, the tool that saves review notes, and the three
  worker descriptions. All now point at the one guide.
- Document sizes were counted in raw bytes, so the same unchanged file measured differently in a
  fresh copy than in the main one, purely because of line endings. Two workers failed their check
  today for a reason that had nothing to do with their work. Sizes are now counted the same way
  everywhere.

**The two big documents now have a ceiling instead of a may-only-shrink rule.** Open work is added
to them every time something lands, so demanding they only ever get smaller would block the
bookkeeping every landing owes. The roadmap must stay under 100 KB and the testing document under
145. That is the rule that stops them ballooning back.

**The old copies of the project were investigated and none hold work worth saving.** Six were
chasing bugs since fixed, several confirmed by pressing real buttons on the Deck. Two contain a way
of moving the model order list with the D-pad that was tried, tested on the device, found to rewrite
the list while someone was only scrolling, and ruled out in writing. One small idea was genuinely
missing and is now filed on the roadmap so it survives the copies being cleared.

**WAITING ON THE MAINTAINER, and phase 1 is not finished until they answer:**

1. The sorting list at docs/audit/refactor-round-two/docs-triage-proposal.md. It proposes 125 to
   keep, 52 finished, 9 replaced, 3 abandoned, and 6 it would not guess at. Approving it removes
   about 943 KB of reading. Nothing has been moved.
2. Whether to clear the old copies of the project. The recommendation is yes, all seven.
3. Only 154 of the 464 saved device runs are actually cited by a test row. The rest came from a bug
   that saved one on every run. They leave the project once the list is approved.

**Still to do in phase 1 after those answers:** move the archived documents and write the archive
index with a delete-after date, sort the helper scripts the same way, and take the leftover device
runs out. Then phase 2, mapping and measuring.

---

## 2026-09-13, phase 0 finished

**Phase 0 is done and landed on experimental.** Everything the later phases lean on now exists:
one check command, the list of numbers that may only get better, a map of what the back-end
depends on, a checker that every file explains itself, three safety rails, a helper for copies of
the project, and a queue so two workers cannot drive the Steam Deck at once. Four workers built it
in parallel, in their own copies, and all four landed without a single clash.

**The check command.** Quick mode is 26 seconds, the full merge check 51. It prints only what
broke. Every later worker runs quick mode before it saves anything.

**Three things had to be fixed by hand at merge time**, all worth knowing:

- Two of the new tools were being started through their Unix launcher, which Windows cannot run.
- The duplicate finder is a rewrite in its latest version with a different command line.
- The whole agent folder was hidden from git, so a fresh copy of the project would have had a
  settings file pointing at rails that were not there. The rails are now kept; the working copies
  inside that folder stay hidden.

**The starting numbers are not the ones in the plan.** The plan's figures were measured four days
earlier and, for duplication, not with this tool. Today's real figures: 42 files over 400 lines,
56 long front-end functions with nothing explaining them, 7 on the back-end side, 1,847 copy-pasted
lines in the app code, 2,286 in the back-end tests, 126 unused exports, 2 loops in the back end,
20 files with no purpose line, 3 back-end entry points nothing calls, and 12 live documents still
mentioning the editor being dropped.

Three of those differ enough from the plan to matter. Duplication measures roughly two and a half
times the plan's estimate, so the goal of cutting it to 350 and 700 was set against a different
measuring stick and needs resetting. The number of back-end entry points nothing calls is 3, not 1.
Twelve documents mention the dropped editor, not 6.

**The header check is advisory, on purpose.** Twenty files have no purpose line; fixing them is
phase 5. Failing every run from today would only teach everyone to ignore the check. The numbers
list stops the count growing meanwhile. Phase 5 turns it into a real gate.

**Two things are waiting on the maintainer.**

1. The old copies of the project. There are 30 on this machine and the helper refuses to clear any
   of them, correctly: seven still hold edits never saved anywhere, and three pieces of work exist
   only there — where the floating ask bar sits, moving focus around a confirm box, and moving up
   and down a picker list. Someone has to decide whether that work is wanted before anything is
   deleted.
2. The guide meant for other AI tools is not in the project at all; it only exists on this machine.
   Phase 1 plans to make it the one guide everyone reads, so it has to be saved into the project
   first or a fresh copy gets nothing.

**Next session: phase 1, the docs diet.** No Deck needed. Read this file, the plan's phase 1
section, and nothing else until the triage list is being built.

---

## 2026-09-13, phase 0 started

**Where things stood before this session.** The knowledge base's third wave is finished and
all of it is saved on the experimental branch. Nothing was left half-saved. One old side
branch about searching by symptom is still unmerged, and that is correct: that idea was
dropped on purpose and the reasons were written down at the time.

**What this session set up.** Four separate copies of the project, one per worker, so nobody
trips over anybody else. The four jobs were split so that no two workers can touch the same
file:

- the list of numbers that may only improve, and the script that measures them
- the map of what the back-end code depends on, the file-header checker, and the generated
  map of the code
- the one verify command every worker runs before saving, plus the new code-quality tools
- the three safety hooks, the helper that makes and clears away copies of the project, and
  the queue that stops two workers driving the Steam Deck at once

**Still to do in phase 0 after the workers report back:** install the new tools, review each
piece, merge the four copies into experimental in one go, and write down the starting numbers
that were actually measured today rather than the ones measured four days ago.

**Nothing needed from the maintainer yet.** The first thing that will need them is the list
of old copies of the project to clear away, which comes with the phase 0 report.
