/**
 * Title: Voice Ask input
 * Purpose: Own the mic button's state machine — start, stop, permission gate, and error toasts.
 * Used for: index.tsx, which passes `voiceRecording` and `onMicInput` down to the Main tab.
 * Solves: Keeps recording state and its capability/teardown rules out of the plugin shell.
 * Does not: Transcribe — that is useVoiceTranscription and the backend Whisper daemon.
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
