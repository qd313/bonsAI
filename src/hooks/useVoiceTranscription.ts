import { useCallback, useEffect, useRef } from "react";
import { call } from "@decky/api";

/** Poll interval while voice transcription is active (interim streaming). */
export const VOICE_TRANSCRIPTION_POLL_MS = 300;

export type VoiceTranscriptionStatus = {
  status: string;
  recording: boolean;
  streaming: boolean;
  partial_transcript: string;
  finalized_transcript: string;
  model_id?: string;
  model_ready?: boolean;
  binary_ready?: boolean;
  capture_backend?: string;
  error?: string | null;
};

type StartVoiceResult = {
  accepted?: boolean;
  error?: string;
  reason?: string;
};

/**
 * Voice Ask lifecycle: start/stop RPC + status polling; appends live transcript into unified input.
 */
export function useVoiceTranscription(
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>,
  onError: (error: unknown) => void,
) {
  const voiceSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const pollTimerRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const baseTextRef = useRef("");

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const isVoiceActive = useCallback((seq: number) => {
    return isMountedRef.current && seq === voiceSeqRef.current && recordingRef.current;
  }, []);

  const applyTranscriptToInput = useCallback(
    (finalized: string, partial: string) => {
      const base = baseTextRef.current;
      const live = [finalized, partial].filter(Boolean).join(" ").trim();
      const next = base ? (live ? `${base} ${live}` : base) : live;
      setUnifiedInput(next);
    },
    [setUnifiedInput],
  );

  const pollStatusOnce = useCallback(
    async (seq: number) => {
      if (!isVoiceActive(seq)) return;
      try {
        const status = await call<[], VoiceTranscriptionStatus>("get_voice_transcription_status");
        if (!isVoiceActive(seq)) return;

        if (status.status === "permission_denied" || status.error === "Microphone permission revoked.") {
          recordingRef.current = false;
          clearPollTimer();
          return;
        }

        if (status.error && !status.recording) {
          recordingRef.current = false;
          clearPollTimer();
          onError(new Error(status.error));
          return;
        }

        applyTranscriptToInput(status.finalized_transcript || "", status.partial_transcript || "");

        if (status.recording) {
          pollTimerRef.current = window.setTimeout(() => {
            void pollStatusOnce(seq);
          }, VOICE_TRANSCRIPTION_POLL_MS);
        } else {
          recordingRef.current = false;
          clearPollTimer();
        }
      } catch (e: unknown) {
        if (!isVoiceActive(seq)) return;
        recordingRef.current = false;
        clearPollTimer();
        onError(e);
      }
    },
    [applyTranscriptToInput, clearPollTimer, isVoiceActive, onError],
  );

  const stopVoiceTranscription = useCallback(async () => {
    voiceSeqRef.current += 1;
    recordingRef.current = false;
    clearPollTimer();
    try {
      const out = await call<[], VoiceTranscriptionStatus & { stopped?: boolean }>("stop_voice_transcription");
      const finalized = out.finalized_transcript || "";
      const partial = out.partial_transcript || "";
      applyTranscriptToInput(finalized, partial);
      return out;
    } catch (e: unknown) {
      onError(e);
      return null;
    }
  }, [applyTranscriptToInput, clearPollTimer, onError]);

  const startVoiceTranscription = useCallback(
    async (currentInput: string) => {
      voiceSeqRef.current += 1;
      const seq = voiceSeqRef.current;
      clearPollTimer();
      baseTextRef.current = currentInput;
      try {
        const out = await call<[], StartVoiceResult>("start_voice_transcription");
        if (!isMountedRef.current || seq !== voiceSeqRef.current) return out;
        if (!out?.accepted) {
          const msg = out?.reason || out?.error || "Voice input could not start.";
          throw new Error(msg);
        }
        recordingRef.current = true;
        void pollStatusOnce(seq);
        return out;
      } catch (e: unknown) {
        recordingRef.current = false;
        throw e;
      }
    },
    [clearPollTimer, pollStatusOnce],
  );

  const invalidateVoice = useCallback(() => {
    voiceSeqRef.current += 1;
    recordingRef.current = false;
    clearPollTimer();
  }, [clearPollTimer]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      voiceSeqRef.current += 1;
      recordingRef.current = false;
      clearPollTimer();
      void call("stop_voice_transcription").catch(() => undefined);
    };
  }, [clearPollTimer]);

  return {
    startVoiceTranscription,
    stopVoiceTranscription,
    invalidateVoice,
    isVoiceRecording: () => recordingRef.current,
    voiceRecordingRef: recordingRef,
  };
}
