/**
 * Title: "Keep models loaded" slider
 *
 * Purpose: A one-handle slider that sets how long an AI model stays loaded
 * in memory after the last question, before it is unloaded to free up space
 * for other things. The handle snaps between a fixed set of preset lengths
 * (instant, several minutes, hours, and so on) rather than any number in
 * between — there is no in-between value to land on.
 *
 * Used for: The Settings tab's Ollama section.
 *
 * Solves: One shared slider control (DeckFocusSlider) reused here with a
 * fixed list of duration presets instead of a free-form number field, since
 * the value actually sent to the AI only ever takes one of those preset
 * shapes anyway.
 *
 * Does not: Talk to the AI, or change what is currently loaded. Moving the
 * handle only changes the saved setting; the new delay applies starting
 * with the next question asked, not to anything already running.
 */
import React, { useCallback, useMemo, useRef } from "react";
import {
  indexOfOllamaKeepAlive,
  OLLAMA_KEEP_ALIVE_CHIP_LABEL,
  OLLAMA_KEEP_ALIVE_ORDER,
  ollamaKeepAliveAtIndex,
  type OllamaKeepAliveDuration,
} from "../data/ollamaKeepAlive";
import {
  DeckFocusSlider,
  type DeckSliderThumbVisualState,
} from "./deck/DeckFocusSlider";
import { clientXToPct, indexToPct, pctToIndex } from "../utils/deckSliderMath";

export type SettingsTabOllamaKeepAliveSliderProps = {
  value: OllamaKeepAliveDuration;
  onChange: (next: OllamaKeepAliveDuration) => void;
  /** Parent assigns ref to the thumb wrapper for external focus (e.g. D-pad from screenshot row). */
  thumbHostRef?: React.Ref<HTMLDivElement>;
  onMoveUp?: () => boolean;
  onMoveDown?: () => boolean;
};

/** Single-thumb track with discrete slots matching Ollama `keep_alive` presets (0s … 240m). */
export function SettingsTabOllamaKeepAliveSlider(props: SettingsTabOllamaKeepAliveSliderProps) {
  const { value, onChange, thumbHostRef, onMoveUp, onMoveDown } = props;
  const maxIdx = OLLAMA_KEEP_ALIVE_ORDER.length - 1;
  const index = indexOfOllamaKeepAlive(value);
  const thumbPct = useMemo(() => indexToPct(index, maxIdx), [index, maxIdx]);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const applyIndex = useCallback(
    (nextIndex: number) => {
      onChange(ollamaKeepAliveAtIndex(nextIndex));
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
      // +1px vs shared DeckFocusSlider thumb so gpfocus ring looks vertically centered on this row.
      marginTop: 3,
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
      className="bonsai-ollama-keepalive-slider"
      header={
        <>
          Unload delay:{" "}
          <span style={{ color: "#9ce7ff", fontWeight: 700 }}>{OLLAMA_KEEP_ALIVE_CHIP_LABEL[value]}</span>
        </>
      }
      thumbPct={thumbPct}
      trackRef={trackRef}
      thumbHostRef={thumbHostRef}
      thumbHostProps={{ "data-bonsai-ollama-keepalive-thumb": "1" }}
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
