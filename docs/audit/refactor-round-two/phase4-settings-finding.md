# Phase 4 step 5: adding a setting is tedious, not dangerous

Written 2026-09-14, before doing the work, because the measurement changed what the work
should be. A dated record.

## The short version

**Adding a new setting means editing five files. That is real and it is annoying. But
nothing can silently go wrong, and I checked rather than assumed.**

The plan's step 5 was going to collapse those five into one declaration everything else
derives from. Having tested what actually happens when a setting is added to one file and
forgotten in the others, that is the wrong trade: it would remove a guard that works today
and replace it with cleverness, on the code that drives every settings screen.

**Recommendation: leave the settings alone.** The maintainer's call, and the evidence is
below so it can be a decision rather than a shrug.

## What I actually did to find out

Added a made-up setting to one file and followed what complained.

| Step | What I changed | What caught it |
|---|---|---|
| 1 | Added it to the shared shape only | The build named **two** other files it was missing from |
| 2 | Added it to those two | The build named the next thing: the other half of the shape |
| 3 | Added that | The build named **the settings hook twice, the main screen twice, and a test** |
| 4 | Added a key to the shared defaults file that neither language knew about | **Three back-end tests and three screen tests failed**, and they said "drifted" by name |

Then I put every file back and confirmed everything passes again.

So the five files are not five chances to make a mistake. They are five steps in a queue,
and the build hands you the next one until there are none left. The two languages are held
together by one shared file that both sides assert against, in both directions.

## Why collapsing them would make it worse

- **The compiler's file-by-file nagging is the feature.** A generated list cannot tell you
  "this is the next place you forgot"; it just silently covers for you, which is fine until
  the one setting that needs different handling.
- **Two of the forty-eight are not mechanical.** One is worked out from a different setting
  entirely, and one is trimmed and cut to a maximum length before saving. A rule that
  derives everything has to carry exceptions, and exceptions inside a generator are much
  harder to see than one plain line in a list.
- **The expensive repetition is the one that cannot be collapsed safely.** Each setting
  keeps its own piece of state. Collapsing those into a single object would mean every
  settings screen redraws whenever any setting changes, on a handheld. That is a change to
  how the plugin behaves, dressed as tidying.
- **Two of the five repetitions are lists the build checks.** Making them derived would
  turn off that checking.

## What it actually costs today

48 settings. A typical one is named on 9 lines across 6 files. Five files must be edited
every time. At the rate settings are added, that is a few minutes of typing, with the build
telling you where to type.

## If the maintainer wants it done anyway

The safe subset, in order of value:

1. Nothing in the back end needs touching; it is one sanitizer function and one shared
   defaults file, already asserted from both sides.
2. The payload builder is a plain name-for-name mapping with two exceptions. It could be
   derived, saving one line per setting. It is also the file the build catches first, so
   the saving is one line and the loss is the clearest error message in the chain.
3. The state in the settings hook should not be collapsed. See above.

That is the whole of it: one line per new setting, in exchange for a worse error message.
