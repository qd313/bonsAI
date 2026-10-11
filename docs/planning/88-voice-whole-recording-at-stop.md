# Plan 88: the mic reads the whole recording once at Stop

**Status:** FINISHED 2026-10-11: built, landed (`4b32a914`..`68317980`) and every Deck row passed the same day. See "Finish" at the end. The maintainer chose this on 2026-10-11 ("go with your
recommendation, I like that hybrid option").

## What changes for the person using it

- While you talk, words still appear in the question box, but the plugin works on them less often, so
  a running game keeps more of its speed.
- When you press Stop (or Ask), the plugin reads the whole recording once with the chosen speech model
  (base.en by default) and puts that in the box in place of the live words. That final text has no
  repeated phrases and no lost words, because it is read in one go instead of stitched from short
  pieces.
- The cost: after Stop there is a short wait for the final text. With no game it should be about
  2 seconds; with a game running, about 4 to 5 seconds for a question under 30 seconds. The mic button
  shows it is busy during that wait, the same amber as when it is starting.
- Pressing Ask while still talking stops the mic, waits for the final text, then asks with it, so the
  last words you said are never cut off.
- A recording stops by itself after 2 minutes.

## Why

On the Deck on 2026-10-10 (roadmap, the base.en in-game entry):

- With a game running, one base.en listening pass took about 4.2 s. The mic listens in 3-second
  slices, back to back, so it fell behind: words were lost or garbled, and the game dropped from 60
  to 35 frames a second.
- tiny.en kept up, but repeated phrases. base.en dropped a phrase said twice in a row.
- Both are stitching problems. Each pass re-reads the last 3 seconds and the pieces are joined by
  matching their overlap. The engine always works through a full 30-second window, so a pass costs
  the same however short the slice is.

## The build (one helper, Sonnet 5.5 high)

All in the speech session on the Python side and the mic hooks on the screen side.

1. **Keep the whole recording.** Besides the 30-second rolling buffer, keep every sample from start to
   Stop in its own buffer, capped at 120 seconds. At the cap the session finishes by itself, exactly
   as if Stop had been pressed.
2. **Live words without stitching.** Each live pass reads the recording so far from the start of the
   current block, and its text replaces the block's previous text. A block is at most 28 seconds;
   when it fills, that block's text is frozen (read once more over exactly its 28 seconds) and a new
   block starts where it ended. Live text = frozen blocks + the current block. No overlap matching.
3. **Lighter live passes.**
   - After each pass, rest at least as long as the pass took (minimum 0.4 s), so the engine works
     about half the time at most.
   - Skip a pass when no speech has arrived since the last one, so silence costs nothing.
   - Both numbers are named constants with a comment saying why.
4. **Never blank the box mid-recording.** Once words have appeared, a pass that returns nothing (or
   text that fails the usable-text check) keeps the previous live text. A box that empties during a
   recording ends dictation on the screen side, so a blank pass must never do that.
5. **The final pass.** On Stop (or the 120-second cap), after any live pass already running finishes,
   read the whole recording once with the chosen model, no rest. The status reads "finishing"
   (recording off) while it runs, then "stopped" with the final text. If the final pass fails, times
   out, or returns nothing usable, the final text is the last live text. The usable-text check is
   judged on the loudness of the speech, not of the whole recording with its pauses.
6. **Stop waits; a new start waits for it.** The stop call returns only when the final text is ready
   (the screen already calls it with no deadline). The thread join is long enough to cover a final
   pass (the engine's own deadline is 45 s). A start that arrives while a stop is still finishing
   waits for it first, so two recordings never share the engine.
7. **Screen side.**
   - A "finishing" state from the Stop press until the stop call returns: the mic button is amber,
     its label reads "Finishing voice input", and presses are ignored, as for starting.
   - The final text is written into the box only if nothing newer happened since Stop (the X, Ask, a
     new recording, a session clear). Otherwise it is dropped.
   - Ask pressed while recording or finishing: stop, wait for the final text, write it into the box,
     then ask with it. If the person typed in the box during the wait, ask with what is in the box.
   - A recording the back end finished by itself (the cap, or the mic failing) puts the final text in
     the box and returns the button to idle.
8. **Remove what the change leaves unused**, in its own commit: the overlap-merge helpers and their
   tests, if nothing else uses them. Search the whole repo, `scripts/` included, before deleting.
9. **User docs:** wherever the guide or troubleshooting page describes how dictation behaves, say
   that the text is tidied up after Stop and that a game makes that take a few seconds longer.

**Tests that must fail before the change** (break-it rule): final text replaces the live text; a
failed final pass keeps the live text; rest ≥ pass time; no pass during silence; a 28-second block
freezes; the 120-second cap finishes the session; stop returns the final text; a start during
finishing waits; the screen ignores a press while finishing; X during finishing keeps the box empty;
Ask while recording asks with the final text; a back-end finish returns the button to idle.

## Deck check (after landing; the session owner writes the runbook)

Same pretend microphone and recorded sentences as the 2026-10-10 evening block. Build noted in every
file. Evidence prefix `p88-`.

| Row | What | Passes when |
|---|---|---|
| P88-VOICE-WHOLE-NOGAME | base.en, no game: the 15-s sentence, "test test 1 2 3 4" twice, the 21-s question | Final text has every word; both "test test 1 2 3 4" phrases; time from Stop to final text noted |
| P88-VOICE-WHOLE-GAME | base.en with a game in live play: the 15-s sentence | Final text has every word; frame rate before and during talking noted; Stop to final text under about 6 s |
| P88-VOICE-ASK-WHILE-TALKING | Ask pressed while the mic listens (no game, the Deck's AI loaded) | The question sent is the final text, last words included |
| P88-VOICE-STOP-THEN-MIC | Mic pressed again within 1 s of Stop | Button amber while finishing, then a new recording starts and adds words |
| P88-VOICE-TINY | tiny.en, no game: the "test test" sentence | Report only: final text, any repeats |

## Not in this plan

- Making live passes cheaper per pass (a shorter engine window, fewer threads). Measure on the Deck
  first; a follow-up if the game still slows too much.
- Removing tiny.en from the list. Wait for P88-VOICE-WHOLE-GAME.
- The other open mic bugs (stops after 3–4 s, Stop then mic). This change touches both paths; the
  Deck rows above are the first look at whether they are gone.

## Finish (2026-10-11)

### What a person notices now

- Words still show up while you talk, in steps of a few seconds. When you press Stop, the mic button
  turns amber ("Finishing voice input") for about 3 seconds with no game (2.6 to 2.9 s measured on
  base.en, 0.9 s on tiny.en) and about 4 seconds with a game running (4.1 s), then the clean text
  replaces the live words.
- "test test 1 2 3 4, test test 1 2 3 4" now comes out with both halves on both models, nothing
  repeated. The 15- and 21-second test questions came out word for word, with and without a game.
- Pressing Ask while still talking waits about 2.5 s and asks the whole question, last words included.
- Pressing the mic during the amber wait does nothing; the next press after it works.

### How it is built (a short guide for the next developer)

- **Back end, the speech session** (`py_modules/backend/services/voice_transcription_service.py`).
  The session keeps every sample from start to Stop in one buffer, capped at 120 s (the cap ends the
  recording by itself). Live passes read the current block (up to 28 s) from that buffer and replace
  the block's text; a full block is read once more and frozen. After each pass the loop rests as long
  as the pass took (`LIVE_REST_FACTOR`), and it skips a pass when no speech arrived since the last one.
  When the recording ends, `_finish_recording` reads the whole buffer once; its text is the final
  text, or the live text if that read fails or hears nothing. The status goes recording → finishing →
  stopped. `voice_level_gate.speech_rms` judges a lone filler word by the loudness of the speech only.
- **Back end, start and stop** (`voice_rpc.py`). The stop call returns only when the final text is
  ready, and the session stays registered until then, so a start that arrives meanwhile waits for it
  (through `force_stop`, which joins the same worker). The shared engine is released once per session.
- **Screen** (`src/hooks/useVoiceTranscription.ts`, `src/features/voice/useVoiceAskInput.ts`,
  `useVoiceAskWithReadAloud.ts`, the mic button in `MainTabUnifiedAskBar.tsx`). A Stop shows the amber
  "finishing" state (the button's `voiceBusy` prop, "starting" or "finishing") and ignores presses.
  The final text is written only if the box still holds what the mic last wrote, so the X, typing, a
  new recording or a session clear drop it. Ask while recording calls `finishDictation`, waits for the
  box to show the final text, then asks. A recording the back end ended by itself returns the button
  to idle.
- **Removed:** the overlap-matching code and its tests (nothing else used them).
- **Tests:** `tests/test_voice_whole_recording.py` and `src/features/voice/voiceFinishAtStop.test.tsx`;
  each was broken on purpose once and failed (the commit messages list how).

### Deck results (build `68317980`, a recorded voice through a pretend microphone)

| Row | Result | Evidence |
|---|---|---|
| P88-VOICE-WHOLE-ENGINE (before the build, engine only) | PASS: every word on both models read whole | `docs/test-evidence/p88-VOICE-WHOLE-ENGINE.json` |
| P88-VOICE-WHOLE-NOGAME | PASS: all three sentences whole; Stop to final 2.6 to 2.9 s; live text never went empty | `p88-VOICE-WHOLE-NOGAME.json` |
| P88-VOICE-STOP-THEN-MIC | PASS: a press 0.6 s after Stop was ignored; the next recording worked | `p88-VOICE-STOP-THEN-MIC.json` |
| P88-VOICE-ASK-WHILE-TALKING | PASS: the asked question was the full sentence | `p88-VOICE-ASK-WHILE-TALKING.json` |
| P88-VOICE-TINY | Report: correct, no repeats, Stop to final 0.9 s | `p88-VOICE-TINY.json` |
| P88-VOICE-WHOLE-GAME | PASS: every word with Deep Rock Galactic: Survivor running; Stop to final 4.1 s | `p88-VOICE-WHOLE-GAME.json` |
| Deck put back | PASS | `p88-DECK-RESTORED.json` |

With the game, the frame rate read 59 before, 48 as the mic started, then 53 and 56 (single readings,
most of the speech over the game's level-up pause screen): a sign, not a firm number.

### Surprises and how they were handled

- The 30-second rolling buffer was dropped: the whole-recording buffer serves the live passes too.
- A new mic-button prop would have broken the "props handed to the tabs" size check; the two amber
  states share one prop instead.
- `_flush_final`'s tail read had never run (it only ran when the stop flag was not set, and the loop
  only ended when it was). The final pass replaced it.
- A live pass that raised used to kill the worker silently and freeze the live text; it is now logged
  and skipped.
- Landing: one generated file was locked by another program during regeneration (re-run by hand, no
  change), and the full check failed on the roadmap's size, which another session's entries had pushed
  over its limit; that session trimmed it (`630ac74e`).

### Left open

- **A real voice.** Every row used a recorded sentence. The two bugs the maintainer saw only with a
  real voice (the mic stopping after 3 or 4 seconds, and Stop then the mic not working) need the
  maintainer's own try. The helper's reading of the code: the Stop-then-mic bug is explained by the old
  3-second wait plus the engine being released under a pass still running (both gone now); for the
  3-to-4-second stop, the best guess is the order the screen writes two pieces of state (the "came
  from the mic" text before the box), which this change does not touch.
- **Live words are slower.** Done the same day by the follow-up (`cbbc88e5`, `4c58623e`; rows
  P88B-VOICE-PACE-NOGAME and P88B-VOICE-PACE-GAME): live words now change every 2.6 to 3.1 s with no
  game (were 4.4 to 5.5 s) and every 5.7 to 7.2 s with a game. The short "test test" recording still shows its
  words late (2.8 s after the audio ended, just before Stop; final text right), probably because a lone
  "test" counts as a possible noise word unless spoken loudly; not proven, and not a bug.
- **A status check that errors** leaves the screen idle without telling the back end to stop; the
  two-minute cap now bounds that recording.
- `docs/planning/10-wake-word-listening-feasibility.md` still names the removed silence constant.
- Test tooling: the rig's Steam-button press still doesn't open Steam's menu (games were started and
  closed by hand routes); the settings snapshot tool failed once (ENOBUFS); opening the plugin failed
  twice after a reload.
