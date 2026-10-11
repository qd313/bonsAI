/**
 * Title: Dictating a question with the microphone
 *
 * Purpose: Starts and stops microphone dictation on the back end, checks
 * in several times a second while it is recording, and writes the words
 * heard so far into the question box as they come in. When dictation
 * stops, the back end reads the whole recording once more and sends back
 * the clean final text, which replaces the live words in the box.
 *
 * Used for: The mic button on the plugin's main question box.
 *
 * Solves: Keeps a recording in progress, and the live words appearing in
 * the question box, going the whole time someone is talking, without
 * blocking the rest of the plugin while that happens. Also makes sure the
 * final text only lands in a box nobody has touched since Stop (the X, a
 * new recording, typing), and that a recording the back end ended by
 * itself (the two-minute limit, the microphone failing) is reported back
 * so the button does not stay red.
 *
 * Does not: Draw the mic button itself, or ask the person to grant
 * microphone access — see the plugin's main screen and the Permissions
 * tab for both.
 */
import { useCallback, useEffect, useRef } from "react";
// NOTE: start/stop_voice_transcription deliberately use raw call() with no
// deadline -- stop reads the whole recording once with the speech model (the
// plugin's Stop waits for that final text) and start may load the model into
// memory, either of which can exceed any UI timeout on Deck hardware. Only
// the status poll below is wrapped.
import { call } from "@decky/api";
import { Router } from "@decky/ui";
import { callDeckyWithTimeout } from "../utils/deckyCall";

/** Poll interval while voice transcription is active (interim streaming). */
const VOICE_TRANSCRIPTION_POLL_MS = 150;

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

/** What a Stop came back with: the raw reply, and the exact box text it wrote (null when it wrote nothing). */
export type VoiceStopOutcome = {
  out: VoiceTranscriptionStatus & { stopped?: boolean };
  /** The question box's full text after the final text went in; null when it was dropped or empty. */
  boxText: string | null;
};

export type UseVoiceTranscriptionOptions = {
  /**
   * The question box's text right now. The final text is written only while the box still holds what
   * the microphone last wrote there; typed words, the X, or a cleared session mean "something newer
   * happened since Stop" and the final text is dropped. Without it the final text is always written.
   */
  getCurrentInput?: () => string;
  /** The back end ended the recording by itself and is reading it once more (the time limit, the mic failing). */
  onBackendFinishing?: () => void;
  /** The back end ended the recording by itself and the final text is in the box. */
  onSessionEnded?: () => void;
};

/**
 * True when Steam reports a running app at this moment. The back end rests longer between live
 * passes while a game runs, so the game keeps its frame rate; with no game the live words come as
 * fast as the engine can make them. Asked once, at the press, and a failed read counts as "no game".
 */
function isGameRunningNow(): boolean {
  try {
    const appId = Router.MainRunningApp?.appid?.toString().trim() ?? "";
    return appId !== "" && appId !== "0";
  } catch {
    return false;
  }
}

/** Spaces and line breaks do not count as an edit when comparing the box with what the mic wrote. */
const sameText = (a: string, b: string) => a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();

/**
 * Voice Ask lifecycle: start/stop RPC + status polling; appends live transcript into unified input.
 */
export function useVoiceTranscription(
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>,
  onError: (error: unknown) => void,
  options: UseVoiceTranscriptionOptions = {},
) {
  const voiceSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const pollTimerRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const baseTextRef = useRef("");
  /** The full box text the microphone last wrote this recording; null until it has written anything. */
  const lastWrittenRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const isVoiceActive = useCallback((seq: number) => {
    return isMountedRef.current && seq === voiceSeqRef.current && recordingRef.current;
  }, []);

  const composeInput = useCallback((finalized: string, partial: string) => {
    const base = baseTextRef.current;
    const live = [finalized, partial].filter(Boolean).join(" ").trim();
    return { live, next: base ? (live ? `${base} ${live}` : base) : live };
  }, []);

  /**
   * Live words. A reading that comes back empty after words have appeared is skipped: blanking the
   * box mid-recording would trip the "box was emptied, so dictation is over" rule and end it.
   */
  const applyTranscriptToInput = useCallback(
    (finalized: string, partial: string) => {
      const { live, next } = composeInput(finalized, partial);
      if (!live && lastWrittenRef.current !== null && lastWrittenRef.current !== baseTextRef.current) return;
      lastWrittenRef.current = next;
      setUnifiedInput(next);
    },
    [composeInput, setUnifiedInput],
  );

  /** The final text. Returns the box text it wrote, or null when it wrote nothing. */
  const applyFinalText = useCallback(
    (finalized: string, partial: string): string | null => {
      const { live, next } = composeInput(finalized, partial);
      // An empty final text never wipes the live words.
      if (!live) return null;
      const getCurrent = optionsRef.current.getCurrentInput;
      if (getCurrent) {
        const expected = lastWrittenRef.current ?? baseTextRef.current;
        if (!sameText(getCurrent(), expected)) return null;
      }
      lastWrittenRef.current = next;
      setUnifiedInput(next);
      return next;
    },
    [composeInput, setUnifiedInput],
  );

  const pollStatusOnce = useCallback(
    async (seq: number) => {
      if (!isVoiceActive(seq)) return;
      try {
        const status = await callDeckyWithTimeout<[], VoiceTranscriptionStatus>(
          "get_voice_transcription_status",
          []
        );
        if (!isVoiceActive(seq)) return;

        if (status.status === "permission_denied" || status.error === "Microphone permission revoked.") {
          recordingRef.current = false;
          clearPollTimer();
          optionsRef.current.onSessionEnded?.();
          return;
        }

        if (status.error && !status.recording) {
          recordingRef.current = false;
          clearPollTimer();
          // A recording that ended by itself with an error (the microphone dropped out) may still
          // hold a final text for the words that were said before it did.
          if (status.status === "stopped") {
            applyFinalText(status.finalized_transcript || "", status.partial_transcript || "");
          }
          onError(new Error(status.error));
          return;
        }

        if (status.recording) {
          applyTranscriptToInput(status.finalized_transcript || "", status.partial_transcript || "");
          pollTimerRef.current = window.setTimeout(() => {
            void pollStatusOnce(seq);
          }, VOICE_TRANSCRIPTION_POLL_MS);
          return;
        }

        if (status.status === "finishing") {
          // The back end ended the recording itself (the time limit) and is reading it once more.
          optionsRef.current.onBackendFinishing?.();
          pollTimerRef.current = window.setTimeout(() => {
            void pollStatusOnce(seq);
          }, VOICE_TRANSCRIPTION_POLL_MS);
          return;
        }

        // Stopped by the back end: its text is the final one. The button goes back to idle.
        recordingRef.current = false;
        clearPollTimer();
        applyFinalText(status.finalized_transcript || "", status.partial_transcript || "");
        optionsRef.current.onSessionEnded?.();
      } catch (e: unknown) {
        if (!isVoiceActive(seq)) return;
        recordingRef.current = false;
        clearPollTimer();
        onError(e);
      }
    },
    [applyFinalText, applyTranscriptToInput, clearPollTimer, isVoiceActive, onError],
  );

  /**
   * Stops the recording and waits for the final text. Anything newer that happens while waiting
   * (the X, Ask, a new recording, a cleared session, typing) bumps `voiceSeqRef` or changes the
   * box, and the final text is then dropped instead of written.
   */
  const stopVoiceTranscription = useCallback(async (): Promise<VoiceStopOutcome | null> => {
    voiceSeqRef.current += 1;
    const seq = voiceSeqRef.current;
    recordingRef.current = false;
    clearPollTimer();
    try {
      const out = await call<[], VoiceTranscriptionStatus & { stopped?: boolean }>("stop_voice_transcription");
      if (!isMountedRef.current || seq !== voiceSeqRef.current) return { out, boxText: null };
      const boxText = applyFinalText(out.finalized_transcript || "", out.partial_transcript || "");
      return { out, boxText };
    } catch (e: unknown) {
      onError(e);
      return null;
    }
  }, [applyFinalText, clearPollTimer, onError]);

  const startVoiceTranscription = useCallback(
    async (currentInput: string) => {
      voiceSeqRef.current += 1;
      const seq = voiceSeqRef.current;
      clearPollTimer();
      baseTextRef.current = currentInput;
      lastWrittenRef.current = null;
      try {
        const out = await call<[boolean], StartVoiceResult>("start_voice_transcription", isGameRunningNow());
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
