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
 * the `noteAskPressed` call this hook makes the moment Ask is pressed.
 */
import { useCallback, useEffect } from "react";

import { noteAskPressed, questionCameFromMic, setReadAloudCompletionContext } from "../../hooks/useReadAloud";
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
  /** False until this open's saved settings have loaded; until then the two settings above are only starting values. */
  settingsLoaded: boolean;
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
 * writes `clearAskCameFromMic` into, and `onAskOllama` to wrap.
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
  settingsLoaded,
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
    /* A fresh open starts from the default settings (Voice replies Off) until the saved ones load.
       Copying those into the mirror would wipe the real setting an earlier open left there, and an
       answer the background watcher sees finish in that gap would go unread, never retried. */
    if (!settingsLoaded) return;
    setReadAloudCompletionContext(voiceReplyMode, strategySpoilerMaskingEnabled);
  }, [settingsLoaded, voiceReplyMode, strategySpoilerMaskingEnabled]);

  /*
   * "Came from the mic", captured the moment Ask is pressed (D99 call 3) and handed straight to
   * `noteAskPressed`, which ties it to the request number from the first status that carries one.
   * It used to be written by an effect on `lastRequestId`, but that number is only learned from the
   * finished status, and the finished answer is handled in the same breath as it is painted, before
   * any effect has run: the question counted as typed and a spoken one was never read aloud
   * (plan 78, helper G finding 4). A retry or a branch pick does not come through here, so it
   * counts as typed: silent, the safe side.
   *
   * The flag alone over-counts: it stays set after dictation until a settings-driven reset, a
   * session clear, or reusing an old question, so typing over the dictated text or picking a
   * suggestion chip before pressing Ask leaves it on for words never spoken. `questionCameFromMic`
   * also checks that the text actually being asked still matches what the mic last wrote.
   */
  const onAskOllamaWithReadAloud = useCallback(
    (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => {
      const asked = overrideQuestion ?? unifiedInput;
      noteAskPressed(questionCameFromMic(askCameFromMic, asked, lastVoiceText));
      return onAskOllama(overrideQuestion, opts);
    },
    [onAskOllama, askCameFromMic, unifiedInput, lastVoiceText],
  );

  return {
    voiceRecording,
    onMicInput,
    micPermissionDenied,
    dismissMicPermissionDeny,
    clearAskCameFromMic,
    onAskOllamaWithReadAloud,
  };
}
