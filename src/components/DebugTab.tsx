import React from "react";
import { ButtonItem, Focusable, PanelSection, PanelSectionRow } from "@decky/ui";

type Props = {
  capturedErrors: string[];
  onClearErrors: () => void;
};

/**
 * This tab surfaces captured runtime errors so users can self-diagnose without leaving Decky.
 * It keeps diagnostic rendering concerns isolated from normal chat and settings interactions.
 */
export const DebugTab: React.FC<Props> = ({ capturedErrors, onClearErrors }) => (
  <PanelSection title="Debug Log">
    <PanelSectionRow>
      <div style={{ fontSize: 13, color: "gray", marginBottom: 4 }}>
        Captured runtime errors appear below.
      </div>
    </PanelSectionRow>
    {capturedErrors.length > 0 && (
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={onClearErrors}>
          <span style={{ fontSize: 12 }}>Clear ({capturedErrors.length})</span>
        </ButtonItem>
      </PanelSectionRow>
    )}
    {capturedErrors.length === 0 ? (
      <PanelSectionRow>
        <div style={{ color: "gray", fontSize: 13 }}>No errors captured.</div>
      </PanelSectionRow>
    ) : (
      capturedErrors.map((err, i) => (
        <PanelSectionRow key={`err-${i}`}>
          <Focusable
            // Make each error block focusable for Deck controls and keyboard navigation parity.
            onActivate={() => {}}
            noFocusRing={false}
            style={{
              background: "#111",
              padding: 8,
              color: "tomato",
              whiteSpace: "pre-wrap",
              fontSize: 11,
              lineHeight: "1.3",
              borderRadius: 4,
              wordBreak: "break-word",
            }}
          >
            {err}
          </Focusable>
        </PanelSectionRow>
      ))
    )}
  </PanelSection>
);
