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
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { toaster } from "@decky/api";

import { formatDeckyRpcError } from "../../utils/deckyCall";
import { useVoiceTranscription } from "../../hooks/useVoiceTranscription";
import type { UiStringVars } from "../../i18n/catalog";
import type { UiStringKey } from "../../i18n/keys";

export type UseVoiceAskInputArgs = {
  /** Transcribed text is written straight into the unified Ask field. */
  setUnifiedInput: Dispatch<SetStateAction<string>>;
  /** Seed text so a restart appends rather than replaces. */
  unifiedInput: string;
  /** Recording is refused, and any in-flight session torn down, without this. */
  microphoneAccess: boolean;
  /** The mic is inert while an Ask is running. */
  isAsking: boolean;
  /** Localised copy for the transcription-failure toast. */
  uiT: (key: UiStringKey, vars?: UiStringVars) => string;
};

/**
 * In: the question box's own text and its setter, whether the microphone
 * permission is on, whether a question is currently being asked, and a
 * function to translate a message key into on-screen text.
 * Out: whether the mic is recording, the mic button's tap handler, the
 * "permission denied" flag and how to dismiss it, and whether — and
 * with what text — the question box's current words came from the mic.
 * Can go wrong: nothing catastrophic — every path that can fail shows a
 * toast and turns recording back off rather than leaving the button in
 * an unclear state.
 *
 * 1. Four pieces of state: is the mic recording, was permission just
 *    denied, did the question box's text come from the mic (and if so,
 *    what exact words did it write — used later to tell a hands-off
 *    dictation apart from one a person then edited by hand).
 * 2. `setUnifiedInputFromVoice()` wraps the question box's own setter so
 *    every word written by the mic also marks where it came from — it
 *    accepts both a plain new value and an updater function, matching
 *    how the box's own setter can be called.
 * 3. `clearAskCameFromMic()` resets that "came from the mic" flag; the
 *    caller decides when that should happen (a manual edit does not
 *    clear it on its own — see the flag's own note above).
 * 4. `onVoiceError()` turns off recording and shows an error toast — the
 *    one place every failure path below routes through.
 * 5. Wires up the actual speech-to-text hook, handing it the wrapped
 *    setter from step 2 and the error handler from step 4.
 * 6. If microphone permission is taken away while recording is in
 *    progress, stops the recording rather than leaving it running with
 *    no permission to be running at all.
 * 7. Clears the "permission denied" message automatically once
 *    permission is granted, so it does not linger after the person
 *    fixes it.
 * 8. `dismissMicPermissionDeny()` lets the message be dismissed by hand
 *    as well.
 * 9. `onMicInput()` is the button's own tap handler: does nothing while
 *    a question is being asked; stops an already-running recording;
 *    shows the permission message and stops there if access is not
 *    granted; otherwise starts recording and shows an error toast if
 *    starting fails.
 * 10. Everything above is bundled together and returned.
 */
export function useVoiceAskInput(a: UseVoiceAskInputArgs) {
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  /**
   * "The field's text came from the mic" (D99 call 3, the middle Voice replies position). Set the
   * moment a transcription is written into the field, and cleared by the caller (index.tsx, which
   * owns the field's other writers) on a settings-driven reset, a session clear, or reusing an old
   * question. Typing over the text or picking a suggestion chip does not clear it — those writers
   * never go through this hook — so Ask time compares the text being asked against `lastVoiceText`
   * below rather than trusting the flag alone.
   */
  const [askCameFromMic, setAskCameFromMic] = useState(false);
  /** The exact text the mic last wrote into the field, kept so Ask time can tell a hand edit apart
   * from an unmodified dictation even though the flag above stays set either way. */
  const [lastVoiceText, setLastVoiceText] = useState("");

  const setUnifiedInputFromVoice = useCallback<Dispatch<SetStateAction<string>>>(
    (value) => {
      setAskCameFromMic(true);
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

  const clearAskCameFromMic = useCallback(() => {
    setAskCameFromMic(false);
  }, []);

  const onVoiceError = useCallback(
    (e: unknown) => {
      setVoiceRecording(false);
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
  );

  // Revoking mic access mid-recording must stop the session, not just hide the button.
  useEffect(() => {
    if (!a.microphoneAccess && voiceRecording) {
      void stopVoiceTranscription();
      invalidateVoice();
      setVoiceRecording(false);
    }
  }, [a.microphoneAccess, voiceRecording, stopVoiceTranscription, invalidateVoice]);

  useEffect(() => {
    if (a.microphoneAccess) {
      setMicPermissionDenied(false);
    }
  }, [a.microphoneAccess]);

  const dismissMicPermissionDeny = useCallback(() => {
    setMicPermissionDenied(false);
  }, []);

  const onMicInput = useCallback(() => {
    if (a.isAsking) return;
    if (voiceRecording) {
      setVoiceRecording(false);
      void stopVoiceTranscription();
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
    void startVoiceTranscription(a.unifiedInput)
      .then(() => setVoiceRecording(true))
      .catch((e: unknown) => {
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
    a.microphoneAccess,
    startVoiceTranscription,
    stopVoiceTranscription,
    a.unifiedInput,
  ]);

  return {
    voiceRecording,
    onMicInput,
    stopVoiceTranscription,
    invalidateVoice,
    micPermissionDenied,
    dismissMicPermissionDeny,
    askCameFromMic,
    clearAskCameFromMic,
    lastVoiceText,
  };
}
