/**
 * Title: UI scale slider
 * Purpose: Two-stop Deck slider for Handheld / Couch manual UI scale profiles (Desktop was cut
 * 2026-09-21 — it multiplied by the same 1 as Handheld, so it was a choice that did nothing).
 * Used for: SettingsTabUiScaleSection manual profile control with parent thumb ref wiring.
 * Solves: Discrete profile snapping with label and description chips below the track.
 * Does not: Apply CSS variables at runtime — parent onApply commits through UiScaleContext bridge.
 */
import React, { useCallback, useMemo, useRef } from "react";
import {
  indexOfManualUiScaleProfile,
  manualUiScaleProfileAtIndex,
  UI_SCALE_MANUAL_PROFILE_IDS,
  UI_SCALE_PROFILE_DESCRIPTION,
  UI_SCALE_PROFILE_LABEL,
  type UiScaleProfileId,
} from "../data/uiScaleProfile";
import {
  DeckFocusSlider,
  type DeckSliderThumbVisualState,
} from "./deck/DeckFocusSlider";
import { clientXToPct, indexToPct, pctToIndex } from "../utils/deckSliderMath";

export type SettingsTabUiScaleSliderProps = {
  value: UiScaleProfileId;
  onChange: (next: UiScaleProfileId) => void;
  thumbHostRef?: React.Ref<HTMLDivElement>;
  onMoveUp?: () => boolean;
  onMoveDown?: () => boolean;
  thumbFocusedExternal?: boolean;
  thumbEditingExternal?: boolean;
};

/** Two-stop snap slider: Handheld · Couch. */
export function SettingsTabUiScaleSlider(props: SettingsTabUiScaleSliderProps) {
  const { value, onChange, thumbHostRef, onMoveUp, onMoveDown, thumbFocusedExternal, thumbEditingExternal } =
    props;
  const maxIdx = UI_SCALE_MANUAL_PROFILE_IDS.length - 1;
  const index = indexOfManualUiScaleProfile(value);
  const thumbPct = useMemo(() => indexToPct(index, maxIdx), [index, maxIdx]);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const setIndex = useCallback(
    (nextIndex: number) => {
      onChange(manualUiScaleProfileAtIndex(nextIndex));
    },
    [onChange],
  );

  const selectClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const pct = clientXToPct(clientX, el.getBoundingClientRect());
      setIndex(pctToIndex(pct, maxIdx));
    },
    [maxIdx, setIndex],
  );

  const tickPcts = useMemo(
    () => UI_SCALE_MANUAL_PROFILE_IDS.map((_, i) => indexToPct(i, maxIdx)),
    [maxIdx],
  );

  const profileId = manualUiScaleProfileAtIndex(index);

  const getThumbDotStyle = useCallback(
    ({ focused, dragging }: DeckSliderThumbVisualState): React.CSSProperties => ({
      background: focused ? "#9ce7ff" : "#dce8f4",
      border: dragging ? "2px solid #38bdf8" : "2px solid rgba(255,255,255,0.55)",
      boxShadow: focused ? "0 0 0 2px rgba(56, 189, 248, 0.35)" : "none",
    }),
    [],
  );

  return (
    <DeckFocusSlider
      className="bonsai-ui-scale-slider"
      header={
        <>
          Profile:{" "}
          <span style={{ color: "#9ce7ff", fontWeight: 700 }}>{UI_SCALE_PROFILE_LABEL[profileId]}</span>
        </>
      }
      thumbPct={thumbPct}
      tickPcts={tickPcts}
      trackRef={trackRef}
      thumbHostRef={thumbHostRef}
      thumbHostProps={{ "data-bonsai-ui-scale-thumb": "1" }}
      onSelectClientX={selectClientX}
      onStepLeft={() => setIndex(index - 1)}
      onStepRight={() => setIndex(index + 1)}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      editToggle
      thumbFocusedExternal={thumbFocusedExternal}
      thumbEditingExternal={thumbEditingExternal}
      getThumbDotStyle={getThumbDotStyle}
      belowTrack={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            fontSize: 10,
            color: "#8fa0b4",
            fontWeight: 600,
            gap: 4,
          }}
        >
          {UI_SCALE_MANUAL_PROFILE_IDS.map((id) => (
            <span key={id} style={{ flex: 1, textAlign: "center" }}>
              {UI_SCALE_PROFILE_LABEL[id]}
            </span>
          ))}
        </div>
      }
      description={UI_SCALE_PROFILE_DESCRIPTION[profileId]}
    />
  );
}
