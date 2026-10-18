/**
 * Title: Reply verbosity slider
 * Purpose: Three-stop Deck slider for Caveman / Balanced / Detailed reply prose style.
 * Used for: Ollama tab reply settings with parent thumb ref for vertical focus hops.
 * Solves: Maps replyVerbosity ids to DeckFocusSlider with chip labels under the track.
 * Does not: Inject system prompts — backend applies verbosity modifier on ask requests.
 */
import React, { useCallback, useMemo, useRef } from "react";
import {
  indexOfReplyVerbosity,
  REPLY_VERBOSITY_LABELS,
  REPLY_VERBOSITY_ORDER,
  replyVerbosityAtIndex,
  type ReplyVerbosityId,
} from "../../data/replyVerbosity";
import {
  DeckFocusSlider,
  type DeckSliderThumbVisualState,
} from "./DeckFocusSlider";
import { clientXToPct, indexToPct, pctToIndex } from "./deckSliderMath";

export type OllamaReplyVerbositySliderProps = {
  value: ReplyVerbosityId;
  onChange: (next: ReplyVerbosityId) => void;
  thumbHostRef?: React.Ref<HTMLDivElement>;
  onMoveUp?: () => boolean;
  onMoveDown?: () => boolean;
};

/** Three-stop track: Caveman / Balanced / Detailed (balanced = no prompt inject). */
export function OllamaReplyVerbositySlider(props: OllamaReplyVerbositySliderProps) {
  const { value, onChange, thumbHostRef, onMoveUp, onMoveDown } = props;
  const maxIdx = REPLY_VERBOSITY_ORDER.length - 1;
  const index = indexOfReplyVerbosity(value);
  const thumbPct = useMemo(() => indexToPct(index, maxIdx), [index, maxIdx]);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const applyIndex = useCallback(
    (nextIndex: number) => {
      onChange(replyVerbosityAtIndex(nextIndex));
    },
    [onChange],
  );

  const selectClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const pct = clientXToPct(clientX, el.getBoundingClientRect());
      applyIndex(pctToIndex(pct, maxIdx));
    },
    [applyIndex, maxIdx],
  );

  const getThumbDotStyle = useCallback(
    ({ focused, editing }: DeckSliderThumbVisualState): React.CSSProperties => ({
      border:
        focused && editing
          ? "2px solid #7af3b0"
          : focused
            ? "2px solid #9ce7ff"
            : "2px solid #77c4da",
      background: "#0f2a34",
      boxShadow:
        focused && editing
          ? "0 0 0 2px rgba(122,243,176,0.28)"
          : focused
            ? "0 0 0 2px rgba(124,214,255,0.22)"
            : "none",
    }),
    [],
  );

  return (
    <DeckFocusSlider
      className="bonsai-reply-verbosity-slider"
      header={
        <>
          Reply style:{" "}
          <span style={{ color: "#9ce7ff", fontWeight: 700 }}>{REPLY_VERBOSITY_LABELS[value]}</span>
        </>
      }
      thumbPct={thumbPct}
      trackRef={trackRef}
      thumbHostRef={thumbHostRef}
      thumbHostProps={{ "data-bonsai-reply-verbosity-thumb": "1" }}
      onSelectClientX={selectClientX}
      onStepLeft={() => applyIndex(Math.max(0, index - 1))}
      onStepRight={() => applyIndex(Math.min(maxIdx, index + 1))}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      editToggle
      getThumbDotStyle={getThumbDotStyle}
    />
  );
}
