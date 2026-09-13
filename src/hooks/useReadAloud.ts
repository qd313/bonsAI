/**
 * Title: Read aloud hook
 * Purpose: Own the Read aloud / Stop button's RPC calls and status polling, and decide when a
 *   finished answer should read itself with no press (D74, D99 call 3).
 * Used for: MainTabChatTranscript (button label and per-turn "is this one speaking" state) and the
 *   two places a completed Ask is observed, useBackgroundGameAi.ts and bonsaiAskCompletionWatch.ts.
 * Solves: One background reader can only speak one answer at a time; this is where that state, the
 *   on-its-own decision, and the fire-and-forget stop the button and a new Ask both need all live
 *   in one place, so they cannot disagree about what is currently speaking.
 * Does not: Split text into sentences (Python does), or turn markdown into words (answerReadableText.ts
 *   does that). Does not read settings itself — index.tsx keeps this module's completion-time context
 *   in sync via setReadAloudCompletionContext, the same pattern bonsaiReplySurface.ts uses.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { callDeckyWithTimeout, formatDeckyRpcError } from "../utils/deckyCall";
import { showPhaseToast } from "../utils/bonsaiPhaseToast";
import { buildAnswerReadableText } from "../utils/answerReadableText";
import { DEFAULT_VOICE_REPLY_MODE, type VoiceReplyMode } from "../data/bonsaiSettingsSchema";
import type { BackgroundRequestStatus } from "../types/backgroundAsk";

export type ReadAloudState = "idle" | "speaking" | "done" | "error";

type StartVoiceReadAloudResult = {
  ok: boolean;
  sentence_count: number;
  error: string | null;
};

type StopVoiceReadAloudResult = {
  ok: true;
  stopped: boolean;
};

type VoiceReadAloudStatus = {
  state: "idle" | "speaking" | "done" | "error";
  sentence_index: number;
  sentence_count: number;
  error: string | null;
  started_at: number | null;
};

/** About once a second while speaking, per plan 42 step 2. */
const READ_ALOUD_POLL_MS = 1000;

/** Fire-and-forget stop — used by the hook's own `stop()` and by a new Ask starting elsewhere. */
export function stopReadAloudFireAndForget(): void {
  void callDeckyWithTimeout<[], StopVoiceReadAloudResult>("stop_voice_read_aloud", []).catch(
    () => undefined
  );
}

function startReadAloudFireAndForget(text: string): void {
  void callDeckyWithTimeout<[string], StartVoiceReadAloudResult>("start_voice_read_aloud", [
    text,
  ]).catch(() => undefined);
}

/**
 * Read aloud / Stop button state: which turn (if any) is speaking, its status, and the two calls
 * the button makes. One instance covers the whole transcript — only one answer can speak at a time.
 */
export function useReadAloud() {
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [state, setState] = useState<ReadAloudState>("idle");
  const seqRef = useRef(0);
  const pollTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(
    (seq: number) => {
      callDeckyWithTimeout<[], VoiceReadAloudStatus>("get_voice_read_aloud_status", [])
        .then((status) => {
          if (!isMountedRef.current || seq !== seqRef.current) return;
          setState(status.state);
          if (status.state === "speaking") {
            pollTimerRef.current = window.setTimeout(() => pollOnce(seq), READ_ALOUD_POLL_MS);
          } else {
            setSpeakingKey(null);
          }
        })
        .catch(() => {
          if (!isMountedRef.current || seq !== seqRef.current) return;
          setState("error");
          setSpeakingKey(null);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /** Press Read aloud: start speaking `text` under `key` (a turn id, or "live"). */
  const start = useCallback(
    (key: string, text: string) => {
      if (!text.trim()) return;
      seqRef.current += 1;
      const seq = seqRef.current;
      clearPollTimer();
      setSpeakingKey(key);
      setState("speaking");
      callDeckyWithTimeout<[string], StartVoiceReadAloudResult>("start_voice_read_aloud", [text])
        .then((res) => {
          if (!isMountedRef.current || seq !== seqRef.current) return;
          if (!res.ok) {
            setState("error");
            setSpeakingKey(null);
            showPhaseToast({
              title: "Couldn't read that aloud",
              body: res.error || "Something went wrong.",
              duration: 5000,
            });
            return;
          }
          pollOnce(seq);
        })
        .catch((e: unknown) => {
          if (!isMountedRef.current || seq !== seqRef.current) return;
          setState("error");
          setSpeakingKey(null);
          showPhaseToast({
            title: "Couldn't read that aloud",
            body: formatDeckyRpcError(e),
            duration: 5000,
          });
        });
    },
    [clearPollTimer, pollOnce]
  );

  /** Press Stop, or a new Ask starting: stop whatever is speaking. */
  const stop = useCallback(() => {
    seqRef.current += 1;
    clearPollTimer();
    setSpeakingKey(null);
    setState("idle");
    stopReadAloudFireAndForget();
  }, [clearPollTimer]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearPollTimer();
    };
  }, [clearPollTimer]);

  return { speakingKey, state, start, stop };
}

// --- Reading a finished answer on its own (D99 call 3) -----------------------------------------
//
// The decision needs the live `voice_reply_mode` setting and, for the "voice_only" position,
// whether the question that produced this answer came in through the mic. Both are React state
// owned in index.tsx; the two places that observe a completed Ask (useBackgroundGameAi.ts's poll,
// and bonsaiAskCompletionWatch.ts's module-level watch for when the person has left the Main tab)
// are not always inside a mounted component, so this mirrors bonsaiReplySurface.ts's pattern: a
// small module-level mirror that index.tsx keeps in sync with a `useEffect`.

let currentVoiceReplyMode: VoiceReplyMode = DEFAULT_VOICE_REPLY_MODE;
let currentSpoilerMaskingEnabled = true;
const askCameFromMicByRequestId = new Map<number, boolean>();
const readAloudHandledRequestIds = new Set<number>();

/** Kept in sync from index.tsx whenever the setting or the spoiler-masking toggle changes. */
export function setReadAloudCompletionContext(
  mode: VoiceReplyMode,
  spoilerMaskingEnabled: boolean
): void {
  currentVoiceReplyMode = mode;
  currentSpoilerMaskingEnabled = spoilerMaskingEnabled;
}

/**
 * Remember whether the question behind `requestId` came in through the mic. Only one Ask is ever
 * in flight, so a small map keyed by request_id (cleared once read) is exactly the "ref keyed by
 * request_id" plan 42 step 3c asks for, without needing the request id before it exists.
 */
export function rememberAskCameFromMic(requestId: number, cameFromMic: boolean): void {
  askCameFromMicByRequestId.set(requestId, cameFromMic);
}

function takeAskCameFromMic(requestId: number | null): boolean {
  if (requestId == null) return false;
  const value = askCameFromMicByRequestId.get(requestId) ?? false;
  askCameFromMicByRequestId.delete(requestId);
  return value;
}

/**
 * Whether the question just asked really came from the mic. The flag alone is not enough: it stays
 * set after dictation until a settings-driven reset, a session clear, or reusing an old question, so
 * typing over the dictated text or picking a suggestion chip before pressing Ask leaves it on even
 * though the words actually sent were never spoken. Comparing the asked text against the text the
 * mic last wrote (both trimmed and with runs of whitespace collapsed to one space) catches that.
 * Pure: no RPC, no module state.
 */
export function questionCameFromMic(
  askCameFromMic: boolean,
  asked: string,
  lastVoiceText: string
): boolean {
  if (!askCameFromMic) return false;
  const normalise = (s: string) => s.trim().replace(/\s+/g, " ");
  return normalise(asked) === normalise(lastVoiceText);
}

/**
 * Whether a just-completed answer should be read aloud without a press. Pure: no RPC, no module
 * state. "off" never reads on its own; "voice_only" only when the question came in through the
 * mic; "always" every time — but only for an answer that actually finished (status "completed",
 * success true) and has something to say once flattened to speech.
 */
export function shouldReadAloudOnCompletion(args: {
  mode: VoiceReplyMode;
  cameFromMic: boolean;
  status: string;
  success: boolean;
  readableText: string;
}): boolean {
  const { mode, cameFromMic, status, success, readableText } = args;
  if (mode === "off") return false;
  if (status !== "completed" || !success) return false;
  if (!readableText.trim()) return false;
  if (mode === "always") return true;
  return mode === "voice_only" && cameFromMic;
}

/**
 * Once per completed request — deduped the same way handleAskTerminalForToast in
 * bonsaiReplyReadyToast.ts is — read a finished answer aloud on its own when the setting calls for
 * it. Called from both places a completed Ask is observed, so it fires once whichever path saw it
 * first.
 */
export function handleAskTerminalForReadAloud(status: BackgroundRequestStatus): void {
  const requestId = status.request_id;
  if (requestId != null) {
    if (readAloudHandledRequestIds.has(requestId)) return;
    readAloudHandledRequestIds.add(requestId);
  }

  const cameFromMic = takeAskCameFromMic(requestId);
  const readableText = buildAnswerReadableText({
    body: status.response || "",
    spoilerMaskingEnabled: currentSpoilerMaskingEnabled,
    askQuestion: status.question,
    appId: status.app_id,
    spoilerConsentEffective: status.strategy_spoiler_consent_effective === true,
  });

  const shouldRead = shouldReadAloudOnCompletion({
    mode: currentVoiceReplyMode,
    cameFromMic,
    status: status.status,
    success: status.success === true,
    readableText,
  });

  if (shouldRead) startReadAloudFireAndForget(readableText);
}

/** Test-only reset. */
export function resetReadAloudCompletionState(): void {
  currentVoiceReplyMode = DEFAULT_VOICE_REPLY_MODE;
  currentSpoilerMaskingEnabled = true;
  askCameFromMicByRequestId.clear();
  readAloudHandledRequestIds.clear();
}
