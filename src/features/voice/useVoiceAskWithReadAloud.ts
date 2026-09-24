/**
 * Title: Voice input, wired to Ask and read-aloud
 *
 * Purpose: `useVoiceAskInput` plus the three pieces of glue that connect it to the rest of the
 * Ask flow: mirroring its clear function into a ref other code can call before this hook's own
 * declaration point, keeping the read-aloud completion watchers in step with the live setting,
 * and remembering whether the question just asked came from dictation so the finished reply
 * knows whether to read itself aloud.
 *
 * Used for: `index.tsx`, wherever a person presses the mic or presses Ask on dictated text.
 *
 * Solves: Nothing new — the same effects and callback `Content` used to carry inline, moved out
 * as one feature's state plus its effects.
 *
 * Does not: Decide whether a finished reply is read aloud — `useReadAloud.ts` does that, from
 * the `rememberAskCameFromMic` call this hook makes on every request id.
 */
import { useCallback, useEffect, useRef } from "react";

import { questionCameFromMic, rememberAskCameFromMic, setReadAloudCompletionContext } from "../../hooks/useReadAloud";
import { useVoiceAskInput } from "./useVoiceAskInput";
import type { useBonsaiAskOrchestration } from "../../hooks/useBonsaiAskOrchestration";
import type { useReplyLanguage } from "../../hooks/useReplyLanguage";
import type { VoiceReplyMode } from "../../data/bonsaiSettingsSchema";

type AskOrchestration = ReturnType<typeof useBonsaiAskOrchestration>;
type ReplyLanguage = ReturnType<typeof useReplyLanguage>;

export type UseVoiceAskWithReadAloudArgs = {
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  unifiedInput: string;
  microphoneAccess: boolean;
  isAsking: boolean;
  uiT: ReplyLanguage["t"];
  clearAskCameFromMicRef: React.MutableRefObject<() => void>;
  voiceReplyMode: VoiceReplyMode;
  strategySpoilerMaskingEnabled: boolean;
  lastRequestId: AskOrchestration["lastRequestId"];
  onAskOllama: AskOrchestration["onAskOllama"];
};

export type VoiceAskWithReadAloud = {
  voiceRecording: boolean;
  onMicInput: () => void;
  micPermissionDenied: boolean;
  dismissMicPermissionDeny: () => void;
  clearAskCameFromMic: () => void;
  /** Same signature as `onAskOllama`, wrapped to record whether this question came from the mic. */
  onAskOllamaWithReadAloud: AskOrchestration["onAskOllama"];
};

/*
 * In: the voice input hook's own args, plus the read-aloud setting, the shared ref other code
 * writes `clearAskCameFromMic` into, the live request id, and `onAskOllama` to wrap.
 * Out: what the mic button and the Ask bar need, plus the wrapped Ask function in place of the
 * plain one.
 * What can go wrong: `onAskOllamaWithReadAloud` must be the function every Ask entry point calls
 * instead of `onAskOllama` directly, or a question typed over dictated text keeps reading itself
 * aloud (the over-count `questionCameFromMic` exists to catch).
 */
export function useVoiceAskWithReadAloud({
  setUnifiedInput,
  unifiedInput,
  microphoneAccess,
  isAsking,
  uiT,
  clearAskCameFromMicRef,
  voiceReplyMode,
  strategySpoilerMaskingEnabled,
  lastRequestId,
  onAskOllama,
}: UseVoiceAskWithReadAloudArgs): VoiceAskWithReadAloud {
  const {
    voiceRecording,
    onMicInput,
    micPermissionDenied,
    dismissMicPermissionDeny,
    askCameFromMic,
    clearAskCameFromMic,
    lastVoiceText,
  } = useVoiceAskInput({
    setUnifiedInput,
    unifiedInput,
    microphoneAccess,
    isAsking,
    uiT,
  });

  useEffect(() => {
    clearAskCameFromMicRef.current = clearAskCameFromMic;
  }, [clearAskCameFromMic]);

  /* Keeps the two completion watchers (useBackgroundGameAi's poll, bonsaiAskCompletionWatch's
     module-level loop for when the Main tab is not mounted) in sync with the live setting — see
     useReadAloud.ts, which mirrors bonsaiReplySurface.ts's pattern for exactly this reason. */
  useEffect(() => {
    setReadAloudCompletionContext(voiceReplyMode, strategySpoilerMaskingEnabled);
  }, [voiceReplyMode, strategySpoilerMaskingEnabled]);

  /*
   * "Came from the mic", captured the moment Ask is pressed (D99 call 3) and paired with the
   * request_id as soon as the backend hands one back — `lastRequestId` is set from every poll
   * response, including the first, so this lands well before the request can complete. Only one
   * Ask is ever in flight, so a single pending slot (rather than something keyed up front, before
   * the id exists) is enough.
   *
   * The flag alone over-counts: it stays set after dictation until a settings-driven reset, a
   * session clear, or reusing an old question, so typing over the dictated text or picking a
   * suggestion chip before pressing Ask leaves it on for words never spoken. `questionCameFromMic`
   * also checks that the text actually being asked still matches what the mic last wrote.
   */
  const pendingAskCameFromMicRef = useRef(false);
  const onAskOllamaWithReadAloud = useCallback(
    (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => {
      const asked = overrideQuestion ?? unifiedInput;
      pendingAskCameFromMicRef.current = questionCameFromMic(askCameFromMic, asked, lastVoiceText);
      return onAskOllama(overrideQuestion, opts);
    },
    [onAskOllama, askCameFromMic, unifiedInput, lastVoiceText],
  );
  useEffect(() => {
    if (lastRequestId != null) {
      rememberAskCameFromMic(lastRequestId, pendingAskCameFromMicRef.current);
    }
  }, [lastRequestId]);

  return {
    voiceRecording,
    onMicInput,
    micPermissionDenied,
    dismissMicPermissionDeny,
    clearAskCameFromMic,
    onAskOllamaWithReadAloud,
  };
}
