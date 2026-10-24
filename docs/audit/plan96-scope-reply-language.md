# Scoping note: the About reply-language pick flips back (plan 96, 2026-10-18)

Scoped only. Nothing was fixed or changed in code. Read from the code and the two pieces of
evidence; no Deck was touched.

## What a player sees

On the About tab, press A on the language button. Steam's own list opens. Pick Czech, or Always
English. The list closes, the ring jumps back to the tab bar, and the button still says Follow
system. The settings file still says follow system. Nothing is shown to say it failed. The rig saw
exactly this three times on 2026-10-17, one and two seconds after each pick. The maintainer saw it
by hand on 2026-10-18.

One detail matters for the cause. Both the screen and the file go back. This is not the Thinking
shape (screen shows the pick, file does not). Here the pick is lost from both places.

## What the code does, in short

- The language button is Steam's own list control. Picking a line calls one small function that
  sets the reply-language setting in the settings hook. That is all the About tab does. The tab's
  own header says saving is "wherever that callback leads".
- The setting then relies on the 400 ms automatic save, plus a save when the screen is torn down or
  the panel is hidden (added in plan 78).
- The back end is fine. It accepts every line the list can send (the two lists of 30 Steam
  languages match, plus follow system and Always English). It only falls back to follow system for
  a word it does not know, and the list never sends one.
- Nothing ever took a "note" of the screen before this list opens. Every box the plugin opens
  itself does take one (so the rebuilt screen can restore what was on it). This list does not.
- No test covers the pick. The About tests use a stand-in list with nothing in it and hand the tab
  a do-nothing change function. Nothing checks that a pick reaches the settings file, and nothing
  checks that a rebuilt screen keeps it.
- No Deck evidence in the repo shows this list ever changing the language. The one Japanese reply
  check (2026-10-01) set the language by editing the file over SSH. So this may never have worked
  on a real Deck; it is not known to have regressed.

## Most likely causes, ranked

### 1. Steam's list rebuilds the screen, and the pick is lost in the rebuild (strongest)

Closing a Steam pop-up rebuilds the tab behind it. That is a known lesson in this repo, and the
ring jumping to the tab bar after the pick fits it. Every other pop-up takes a note of the screen
first, so the rebuilt copy comes back showing the same settings. This list takes no note. So the
rebuilt screen reads the settings file, which says follow system, and shows that. The pick was made
on the old copy, which is gone or about to be. Depending on the timing, either the pick landed on a
copy that was already thrown away, or the save-on-teardown ran with nothing new to send. Same
family as the Thinking pick (the 400 ms save cancelled by a rebuild), but worse: with the Thinking
pick the note existed and held the pick; here there is no note at all.
Supporting lines: the change function does nothing but set the value (About section file, the
onChange line). The only plugin code that takes a note before a pop-up is the modal opener, and the
list never calls it. The settings hook counts a restored value as already saved (the lesson in the
Thinking commit f2db2a56).

### 2. The save-on-teardown runs one beat too early and sees nothing to send

The teardown save reads the value from a copy that is updated only when the screen draws. If Steam
tears the screen down in the same moment as the pick, the draw has not happened, the copy is stale,
and the save finds "nothing changed" and sends nothing. This is a smaller piece inside cause 1
that would survive even if a note were added, so the fix should not rely on it. Supporting line:
the settings hook sets that copy during drawing, not when the value is set.

### 3. The pick never reaches the change function (unlikely)

If the list handed back something without a value, the code quietly turns it into follow system
(a "default to follow system" fallback on the onChange line). That would look exactly like "it
flips back". The back end's list and the front end's list match, and Steam's list control is the
standard one that hands back the whole line, so this is unlikely. It is the cheapest to rule out
(one log line), so rule it out first on the Deck.

### 4. The back end throws the pick away (ruled out)

The back end keeps all 30 Steam languages, follow system, and Always English, and its own tests
check that Japanese is kept and an unknown word is not. Nothing here drops a real pick.

## The smallest fix (one lane)

One file of change plus a small plumbing line, in the same shape as the other pop-ups:

1. Before the list opens, take a note of the screen (the same call every box uses).
2. When a line is picked, set the value, patch the waiting note with it, and send just that one
   field (the reply language) straight to the settings file, then done. This is the same shape the
   Thinking fix and the downloads notice already use.

If the note is skipped and only step 2 is done, a screen rebuilt before the pick may still show
follow system until the next load. So do both, and ask the lane to check both halves.

The lane should add one log line in the pick function first and do one Deck pick, to separate cause
3 from causes 1 and 2 before building.

## The test that fails without the fix

A test like the Thinking one (it already exists and can be copied): run the real settings hook
against a stand-in disk, open the list (take the note), make the pick, tear the screen down at
once, build a fresh screen from the note, and check two things: the stand-in file says the picked
language, and the fresh screen shows it. Add a second case where the pick lands after the rebuild.
Both fail today and pass with the fix. Also give the About tests a list stand-in that can be picked
from, and one case that a pick calls save with only the language field.

## The Deck check that proves it

On the Deck's own screen, About tab: pick Czech, then check the button says Czech and the file says
czech (read over SSH). Close the plugin and reopen it: still Czech. Pick Always English: file says
en. Ask a short question and see the reply follow the chosen language. Put it back to Follow system
and check the file. The maintainer's own hand check closes the bug.

## Where (file paths)

- The list and its pick: `src/features/about/AboutReplyLanguageSection.tsx` (onChange line, the
  Dropdown; header note that saving is elsewhere)
- Where the tab gets the setter: `src/features/plugin-shell/tabs/useAboutTabPayload.tsx`,
  `src/index.tsx` (onReplyLanguageChange is the settings hook's own setter)
- The setting, the 400 ms save, save on teardown: `src/features/settings/usePluginSettings.ts`
  (the setter, the persist-now function, the unmount and hide save, the stale copy set during draw)
- Taking the note, patching it: `src/features/plugin-shell/useBonsaiPluginShell.ts`
  (captureSessionBeforeModal), `src/features/plugin-shell/bonsaiSessionSurvival.ts`
  (patchPendingSessionSettingsSnapshot)
- The Thinking fix to copy: `src/features/ai-connection/useThinkingNoticeGate.tsx` (commit
  f2db2a56) and its test `src/features/ai-connection/useThinkingNoticeGate.savedAfterReopen.test.tsx`
- Other direct-save example: `src/features/downloads/downloadNotice.tsx` (turnOnDownloads)
- Back end: `py_modules/backend/prompts/reply_language_service.py` (sanitize_reply_language),
  `py_modules/backend/settings/settings_service.py` (the one call, around line 606); tests
  `tests/test_settings_service.py` (accepts Japanese, refuses an unknown word)
- Front-end language list: `src/shared/i18n/replyLanguage.ts` (list built, normalizer)
- Tests that do not cover the pick: `src/features/about/AboutTab.test.tsx`,
  `src/features/about/AboutTab.walk.test.tsx`, stand-in list in
  `src/test-harness/aboutDeckyUi.tsx`
- Evidence: `workshop:test-evidence/plan94-P94-ABOUT.json`; roadmap entry in `docs/roadmap.md`
  ("The About reply-language pick does not apply"); the lesson "Closing a Decky popup rebuilds the
  tab behind it" in `docs/lessons-learned.md`
