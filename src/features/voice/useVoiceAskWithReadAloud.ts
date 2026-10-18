/**
 * Title: Voice input, wired to Ask
 *
 * Purpose: `useVoiceAskInput` plus the one piece of glue that connects it to the Ask flow: pressing
 * Ask while the mic is still listening (or while Stop is still reading the whole recording) waits
 * for the final text, writes it into the box, and only then asks, so the last words said are never
 * cut off.
 *
 * Used for: `index.tsx`, wherever a person presses the mic or presses Ask on dictated text.
 *
 * Solves: Nothing new — the callback `Content` used to carry inline, moved out as one feature's
 * state plus its effect.
 *
 * Does not: Decide what the question says, or record where it came from.
 */
import { useCallback, useRef } from "react";

import { useVoiceAskInput } from "./useVoiceAskInput";
import type { useBonsaiAskOrchestration } from "../../hooks/useBonsaiAskOrchestration";
import type { useReplyLanguage } from "../../shared/i18n/useReplyLanguage";

type AskOrchestration = ReturnType<typeof useBonsaiAskOrchestration>;
type ReplyLanguage = ReturnType<typeof useReplyLanguage>;

export type UseVoiceAskWithReadAloudArgs = {
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  unifiedInput: string;
  microphoneAccess: boolean;
  isAsking: boolean;
  uiT: ReplyLanguage["t"];
  onAskOllama: AskOrchestration["onAskOllama"];
};

export type VoiceAskWithReadAloud = {
  voiceRecording: boolean;
  voiceStarting: boolean;
  /** Stop has gone to the back end and the final text is not back yet (the Ask bar draws the mic amber). */
  voiceFinishing: boolean;
  onMicInput: () => void;
  micPermissionDenied: boolean;
  dismissMicPermissionDeny: () => void;
  /** Same signature as `onAskOllama`, wrapped to wait for the final text when the mic is still listening. */
  onAskOllamaWithReadAloud: AskOrchestration["onAskOllama"];
};

/*
 * In: the voice input hook's own args, plus `onAskOllama` to wrap.
 * Out: what the mic button and the Ask bar need, plus the wrapped Ask function in place of the
 * plain one.
 * What can go wrong: `onAskOllamaWithReadAloud` must be the function every Ask entry point calls
 * instead of `onAskOllama` directly, or Ask pressed while the mic is listening would ask with the
 * words heard so far instead of the final text.
 */
export function useVoiceAskWithReadAloud({
  setUnifiedInput,
  unifiedInput,
  microphoneAccess,
  isAsking,
  uiT,
  onAskOllama,
}: UseVoiceAskWithReadAloudArgs): VoiceAskWithReadAloud {
  const {
    voiceRecording,
    voiceStarting,
    voiceFinishing,
    onMicInput,
    finishDictation,
    micPermissionDenied,
    dismissMicPermissionDeny,
  } = useVoiceAskInput({
    setUnifiedInput,
    unifiedInput,
    microphoneAccess,
    isAsking,
    uiT,
  });

  /* What the render being drawn right now holds, for the code below that has to read the box after
     an await (the final text has just been written into it and the closure of the press is stale). */
  const latest = useRef({ onAskOllama, unifiedInput });
  latest.current = { onAskOllama, unifiedInput };
  /* True while an Ask is waiting for the final text, so a second press does not send the question twice. */
  const askWaitingForTextRef = useRef(false);

  const onAskOllamaWithReadAloud = useCallback(
    async (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => {
      /* Pressing Ask while the mic is listening (or still finishing a Stop) ends dictation first: the
         back end reads the whole recording once, the final text goes into the box, and only then is the
         question asked, so the last words said are never cut off. Nothing heard afterwards may be
         written into the box during the answer. If the person typed in the box during the wait, the
         final text is not written and the question is the box as it is. */
      if (voiceRecording || voiceFinishing) {
        if (askWaitingForTextRef.current) return;
        askWaitingForTextRef.current = true;
        try {
          const written = await finishDictation();
          if (written !== null) {
            // The new text is on its way to the box; ask only once the screen shows it.
            for (let i = 0; i < 100 && latest.current.unifiedInput !== written; i += 1) {
              await new Promise((r) => setTimeout(r, 10));
            }
          }
        } finally {
          askWaitingForTextRef.current = false;
        }
        return latest.current.onAskOllama(overrideQuestion, opts);
      }
      return onAskOllama(overrideQuestion, opts);
    },
    [onAskOllama, voiceRecording, voiceFinishing, finishDictation],
  );

  return {
    voiceRecording,
    voiceStarting,
    voiceFinishing,
    onMicInput,
    micPermissionDenied,
    dismissMicPermissionDeny,
    onAskOllamaWithReadAloud,
  };
}
