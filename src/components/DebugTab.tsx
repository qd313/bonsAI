import React from "react";
import { ButtonItem, Focusable, PanelSection, PanelSectionRow } from "@decky/ui";

type Props = {
  capturedErrors: string[];
  onClearErrors: () => void;
  /** Phase 1: experimental jump to per-game Steam Input (steam:// + CloseSideMenus); optional for tests. */
  onSteamInputPhase1Jump?: () => void;
};

/**
 * This tab surfaces captured runtime errors so users can self-diagnose without leaving Decky.
 * It keeps diagnostic rendering concerns isolated from normal chat and settings interactions.
 */
export const DebugTab: React.FC<Props> = ({ capturedErrors, onClearErrors, onSteamInputPhase1Jump }) => (
  <>
    {onSteamInputPhase1Jump && (
      <PanelSection title="Steam Input (Phase 1)">
        <PanelSectionRow>
          <div style={{ fontSize: 12, color: "#9fb7d5", marginBottom: 6 }}>
            Experimental: opens per-game controller configuration for the running game via steam:// (see
            docs/steam-input-research.md). Requires a focused/running title.
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={onSteamInputPhase1Jump}>
            Jump to Steam Input (running game)
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    )}
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
  </>
);
