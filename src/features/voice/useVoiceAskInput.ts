/**
 * Title: The microphone button on the Ask bar
 *
 * Purpose: Runs while a person taps the microphone icon to speak a
 * question instead of typing it. Owns whether recording is on, checks
 * permission before starting, writes the recognized words into the
 * question box as they arrive, and shows an error message if anything
 * goes wrong.
 *
 * Used for: The plugin's main screen, which hands `voiceRecording` (is
 * the mic on) and `onMicInput` (what the mic button calls when tapped)
 * down to the Ask tab.
 *
 * Solves: Keeps the mic's on/off state, its permission check, and
 * cleaning up a recording that has to stop early, all in one place
 * instead of spread through the main plugin screen's own code.
 *
 * Does not: Turn speech into text — that is a separate hook and a
 * program running in the background that does the actual listening.
 * This hook only starts and stops that process and reacts to what it
 * reports back.
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { call, toaster } from "@decky/api";

import { formatDeckyRpcError } from "../../shared/deckyCall";
import { useVoiceTranscription, type VoiceStopOutcome } from "./useVoiceTranscription";
import type { UiStringVars } from "../../shared/i18n/catalog";
import type { UiStringKey } from "../../shared/i18n/keys";

export type UseVoiceAskInputArgs = {
  /** Transcribed text is written straight into the unified Ask field. */
  setUnifiedInput: Dispatch<SetStateAction<string>>;
  /** Seed text so a restart appends rather than replaces. */
  unifiedInput: string;
  /** Recording is refused, and any in-flight session torn down, without this. */
  microphoneAccess: boolean;
  /** The mic does not start while an Ask is running; a press only shows a short toast. */
  isAsking: boolean;
  /** Localised copy for the transcription-failure toast. */
  uiT: (key: UiStringKey, vars?: UiStringVars) => string;
};

/**
 * In: the question box's own text and its setter, whether the microphone
 * permission is on, whether a question is currently being asked, and a
 * function to translate a message key into on-screen text.
 * Out: whether the mic is recording, the mic button's tap handler, the
 * "permission denied" flag and how to dismiss it, and the words the mic
 * last wrote.
 * Can go wrong: nothing catastrophic — every path that can fail shows a
 * toast and turns recording back off rather than leaving the button in
 * an unclear state.
 *
 * 1. Pieces of state: is the mic recording, was permission just
 *    denied, and what exact words did the mic last write (used to tell
 *    that the box was emptied by hand while listening).
 * 2. `setUnifiedInputFromVoice()` wraps the question box's own setter so
 *    every word written by the mic is also remembered — it
 *    accepts both a plain new value and an updater function, matching
 *    how the box's own setter can be called.
 * 3. `onVoiceError()` turns off recording and shows an error toast — the
 *    one place every failure path below routes through.
 * 4. Wires up the actual speech-to-text hook, handing it the wrapped
 *    setter from step 2 and the error handler from step 3.
 * 5. If microphone permission is taken away while recording is in
 *    progress, stops the recording rather than leaving it running with
 *    no permission to be running at all.
 * 6. Clears the "permission denied" message automatically once
 *    permission is granted, so it does not linger after the person
 *    fixes it.
 * 7. `dismissMicPermissionDeny()` lets the message be dismissed by hand
 *    as well.
 * 8. `onMicInput()` is the button's own tap handler: shows a short "Mic is
 *    waiting" toast while a question is being asked; ignores a press while the
 *    start call from an earlier press is still pending (`voiceStarting`) or
 *    while a stop is still finishing (`voiceFinishing`) -- the Ask bar draws
 *    both as an amber button; stops an already-running recording;
 *    shows the permission message and stops there if access is not
 *    granted; otherwise starts recording and shows an error toast if
 *    starting fails.
 * 9. A Stop takes a moment: the back end reads the whole recording once more and
 *    the screen waits for that final text (`voiceFinishing`), which replaces the live
 *    words only if the box is still as the microphone left it. `finishDictation()` is
 *    the same wait for Ask: it stops, waits, and says what the box holds.
 * 10. Everything above is bundled together and returned.
 */
export function useVoiceAskInput(a: UseVoiceAskInputArgs) {
  const [voiceRecording, setVoiceRecording] = useState(false);
  /** A press has gone to the back end and its start call has not returned yet (the voice server is starting, the model loading). */
  const [voiceStarting, setVoiceStarting] = useState(false);
  /** Stop has gone to the back end (or the back end ended the recording itself) and the final text is not back yet. */
  const [voiceFinishing, setVoiceFinishing] = useState(false);
  /** The Stop call in flight, so Ask can wait for the same one a Stop press started. */
  const stopInFlightRef = useRef<Promise<VoiceStopOutcome | null> | null>(null);
  /** The question box as last rendered, for "has anything touched the box since Stop?". */
  const boxRef = useRef(a.unifiedInput);
  boxRef.current = a.unifiedInput;
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  /** The exact text the mic last wrote into the field, kept so the "box was emptied" rule below can
   * tell a box the person emptied from one the mic simply has not filled yet. */
  const [lastVoiceText, setLastVoiceText] = useState("");
  /** True once a render has shown the box holding some text since the mic last started or was cut off.
   * The "box was emptied" rule below trusts an empty box only after this, because the mic writes
   * `lastVoiceText` and the box in two steps and Steam's React may render between them. */
  const boxShownFilledRef = useRef(false);

  const setUnifiedInputFromVoice = useCallback<Dispatch<SetStateAction<string>>>(
    (value) => {
      if (typeof value === "function") {
        a.setUnifiedInput((prev) => {
          const next = value(prev);
          setLastVoiceText(next);
          return next;
        });
      } else {
        setLastVoiceText(value);
        a.setUnifiedInput(value);
      }
    },
    [a.setUnifiedInput],
  );

  const onVoiceError = useCallback(
    (e: unknown) => {
      setVoiceRecording(false);
      setVoiceFinishing(false);
      toaster.toast({
        title: a.uiT("toast.voiceInputError.title"),
        body: formatDeckyRpcError(e),
        duration: 5000,
      });
    },
    [a.uiT],
  );

  const { startVoiceTranscription, stopVoiceTranscription, invalidateVoice } = useVoiceTranscription(
    setUnifiedInputFromVoice,
    onVoiceError,
    {
      getCurrentInput: () => boxRef.current,
      // A recording the back end ended itself (the two-minute limit, the microphone failing): amber
      // while it reads the recording once more, then back to the plain microphone.
      onBackendFinishing: () => {
        setVoiceRecording(false);
        setVoiceFinishing(true);
      },
      onSessionEnded: () => {
        setVoiceRecording(false);
        setVoiceFinishing(false);
      },
    },
  );

  /**
   * Stop: leave the recording state at once, show the amber "finishing" button, and wait for the back
   * end's final text (the stop call returns only when it is ready). One call at a time; a second
   * caller gets the same one.
   */
  const beginStop = useCallback((): Promise<VoiceStopOutcome | null> => {
    if (stopInFlightRef.current) return stopInFlightRef.current;
    setVoiceRecording(false);
    setVoiceFinishing(true);
    const pending = stopVoiceTranscription().finally(() => {
      stopInFlightRef.current = null;
      setVoiceFinishing(false);
    });
    stopInFlightRef.current = pending;
    return pending;
  }, [stopVoiceTranscription]);

  /**
   * Ask pressed while the mic is listening or finishing: stop (or wait for the stop already under
   * way) and say what the box holds once the final text is in it. Resolves to the text now in the
   * box, or null when the final text was not written (the box was edited, emptied, or nothing came back).
   */
  const finishDictation = useCallback(async (): Promise<string | null> => {
    const outcome = await (stopInFlightRef.current ?? beginStop());
    return outcome?.boxText ?? null;
  }, [beginStop]);

  // Revoking mic access mid-recording must stop the session, not just hide the button.
  useEffect(() => {
    if (!a.microphoneAccess && voiceRecording) {
      void stopVoiceTranscription();
      invalidateVoice();
      setVoiceRecording(false);
    }
  }, [a.microphoneAccess, voiceRecording, stopVoiceTranscription, invalidateVoice]);

  /*
   * The question box was emptied while the microphone was still listening (the X beside Ask, a
   * session clear, a hand delete-all). The listening loop writes "text before + everything heard"
   * into the box on every tick, so left running it puts the same words straight back and the clear
   * looks like it did nothing (found on the real mic, 2026-10-02: speak, Ask, Stop, X). Emptying the
   * box ends dictation. The stop goes straight to the back end rather than through
   * `stopVoiceTranscription`, which would write the final transcript into the box all over again.
   * `lastVoiceText` non-empty means the loop had written words, so a box that is simply still empty
   * at the start of a recording does not trip this.
   */
  const endDictation = useCallback(
    (forgetWords: boolean) => {
      invalidateVoice();
      setVoiceRecording(false);
      if (forgetWords) {
        setLastVoiceText("");
        boxShownFilledRef.current = false;
      }
      // Raw call(), no deadline, like the other stop path: stop reads the whole recording once more,
      // which can exceed any UI timeout on Deck hardware. Nobody uses its text here; the button is
      // amber until the back end is done, so a new press does not collide with it.
      setVoiceFinishing(true);
      void call("stop_voice_transcription")
        .catch(() => undefined)
        .finally(() => setVoiceFinishing(false));
    },
    [invalidateVoice],
  );

  /*
   * Why "the box has been seen filled" and not just "words written, box empty": the mic writes the
   * words (`lastVoiceText`) and the box's text in two separate state updates. Without batching (Steam's
   * React) there would be a render between them with the words set and the box still empty, and the
   * rule below would end dictation on the first words. This is the likely cause of the early stop seen
   * with a real voice on tiny.en (2026-10-10), a guess from reading the code until the Deck shows it. A box
   * can only have been emptied by the person if it was showing text first, so the rule waits until a
   * render has shown the box filled. Then the X or a hand delete still ends dictation as before.
   */
  useEffect(() => {
    if (a.unifiedInput.trim() !== "") {
      boxShownFilledRef.current = true;
      return;
    }
    if (!voiceRecording || lastVoiceText === "" || !boxShownFilledRef.current) return;
    endDictation(true);
  }, [voiceRecording, lastVoiceText, a.unifiedInput, endDictation]);

  useEffect(() => {
    if (a.microphoneAccess) {
      setMicPermissionDenied(false);
    }
  }, [a.microphoneAccess]);

  const dismissMicPermissionDeny = useCallback(() => {
    setMicPermissionDenied(false);
  }, []);

  const onMicInput = useCallback(() => {
    if (a.isAsking) {
      toaster.toast({
        title: "Mic is waiting",
        body: "The microphone is off until the answer finishes.",
        duration: 3500,
      });
      return;
    }
    // The first press is still waiting on the back end; a second one must not send a second start.
    // Likewise while a Stop is still reading the recording: the new recording would have to wait for it.
    if (voiceStarting || voiceFinishing) return;
    if (voiceRecording) {
      void beginStop();
      return;
    }
    if (!a.microphoneAccess) {
      setMicPermissionDenied(true);
      toaster.toast({
        title: "Permission required",
        body: "Enable Voice input (microphone) in the Permissions tab to use speech-to-text.",
        duration: 4500,
      });
      return;
    }
    setMicPermissionDenied(false);
    /* A new recording has written nothing yet. Words left over from the last one would make the
       "box was emptied, so dictation is over" rule above fire the moment this recording begins (box
       emptied by hand or script after a dictation: the first press stopped itself 94 ms later). */
    setLastVoiceText("");
    boxShownFilledRef.current = false;
    setVoiceStarting(true);
    void startVoiceTranscription(a.unifiedInput)
      .then(() => {
        setVoiceStarting(false);
        setVoiceRecording(true);
      })
      .catch((e: unknown) => {
        setVoiceStarting(false);
        setVoiceRecording(false);
        toaster.toast({
          title: "Voice input unavailable",
          body: e instanceof Error ? e.message : formatDeckyRpcError(e),
          duration: 5500,
        });
      });
  }, [
    a.isAsking,
    voiceRecording,
    voiceStarting,
    voiceFinishing,
    a.microphoneAccess,
    startVoiceTranscription,
    beginStop,
    a.unifiedInput,
  ]);

  return {
    voiceRecording,
    voiceStarting,
    voiceFinishing,
    onMicInput,
    /** Ends a recording that is still listening without touching the box (the X pressed). */
    endDictation,
    /** Stops (or waits for the stop under way), then says what the box holds: Ask's way of ending dictation. */
    finishDictation,
    stopVoiceTranscription,
    invalidateVoice,
    micPermissionDenied,
    dismissMicPermissionDeny,
    lastVoiceText,
  };
}
