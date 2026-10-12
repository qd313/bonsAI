/**
 * Title: Settings tab -- the Data section's rows
 *
 * Purpose: The rows inside the folded "Data" section (plan 91 § 2b, plan 92 T1): the Show Developer tab
 * switch, and the two buttons side by side, Clear cache... and Clear all data..., each of which opens a
 * Steam confirm box before doing anything.
 *
 * Used for: SettingsTab, inside the "data" FoldedSection.
 *
 * Solves: Moving the two Clear buttons out of SettingsTab.tsx unchanged in behaviour. Both remember which
 * button to return the ring to once the box closes (modalReturnFocusRegistry) and both tell the plugin
 * shell which tab to come back to (`onBeforeDeckyModal`). In the confirm boxes the first button, which
 * Steam puts the ring on, keeps everything and the clearing sits on the middle button: an A pressed by
 * habit clears nothing.
 *
 * Does not: Clear anything itself: the caller's `onResetSession` and `onClearAllPluginData` do.
 *
 * Focus: Up from the switch goes to the section's line, Down from the pair to the next line (here none:
 * Data is the last section, so it holds still), both handed in by the tab. The pair is one `Focusable`
 * with `flow-children="horizontal"`. It sits inside a panel row, so it takes Steam's own 16 point inset
 * on each side like every other button on the tab.
 */
import React from "react";
import { Button, ConfirmModal, Focusable, PanelSection, PanelSectionRow, showModal } from "@decky/ui";

import { DenseSwitchRow } from "../features/folded-tabs/DenseRow";
import { SETTINGS_ROW_HELP } from "../features/folded-tabs/settingsTabFolds";
import { registerModalReturnFocusOwner, rememberModalReturnFocus } from "../features/plugin-shell/modalReturnFocusRegistry";
import { FOCUS_RING_BTN_CLASS } from "../styles/settingsGlassButton";
import { textPx } from "../styles/sections/textPx";

export type SettingsTabDataSectionProps = {
  showDeveloperTab: boolean;
  setShowDeveloperTab: (v: boolean) => void;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onResetSession: () => void;
  onClearAllPluginData: () => void | Promise<void>;
  /** Up from the switch: the section's line. */
  onMoveUpFromFirst: () => boolean;
  /** Down from the pair: the next line. */
  onMoveDownFromLast: () => boolean;
};

const CLEAR_BUTTON_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 34,
  fontSize: textPx(12),
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
  color: "#e8eef5",
  boxSizing: "border-box",
};

/**
 * The whole section's rows: the Show Developer tab switch and the Clear cache... / Clear all data... pair.
 *
 * In: the Developer tab setting and its setter, the callbacks the two confirm boxes call, and the two
 * hand-offs the tab gives (Up to the section's line, Down to the next line).
 * Out: a panel section with the switch row and the button pair row.
 *
 * What can go wrong: nothing here clears anything by itself; a clear happens only from the middle button of
 * a confirm box.
 */
export const SettingsTabDataSection: React.FC<SettingsTabDataSectionProps> = ({
  showDeveloperTab,
  setShowDeveloperTab,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onResetSession,
  onClearAllPluginData,
  onMoveUpFromFirst,
  onMoveDownFromLast,
}) => (
  <PanelSection>
    <PanelSectionRow>
      <div className="bonsai-settings-bleed" style={{ width: "100%" }}>
        <DenseSwitchRow
          label="Show Developer tab"
          help={SETTINGS_ROW_HELP.developerTab}
          checked={showDeveloperTab}
          onChange={(checked) => setShowDeveloperTab(checked)}
          nav={{ onMoveUp: onMoveUpFromFirst }}
        />
      </div>
    </PanelSectionRow>
    <PanelSectionRow>
      <Focusable
        className="bonsai-settings-cache-row"
        flow-children="horizontal"
        {...({ onMoveDown: onMoveDownFromLast } as Record<string, unknown>)}
        style={{
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "row",
          gap: 8,
        }}
      >
        <Button
          className={FOCUS_RING_BTN_CLASS}
          ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("settings-clear-cache", el)}
          onClick={() => {
            rememberModalReturnFocus("settings-clear-cache");
            onBeforeDeckyModal();
            const handle = showModal(
              <ConfirmModal
                strTitle="Clear session cache?"
                strDescription="Clears this session from RAM: input, reply, thread, transparency, branches, attachments, timers. Does not change settings.json, Ollama, or image files on disk."
                /*
                  Steam opens a confirm box with the ring on OK, so OK keeps everything and the
                  clearing sits on the middle button (the Delete chat and Remove knowledge base
                  boxes' shape): an A pressed by habit clears nothing. Cancel and B also change nothing.
                */
                strOKButtonText="Keep cache"
                strMiddleButtonText="Clear"
                strCancelButtonText="Cancel"
                onOK={() => onCompleteDeckyModalClose(() => handle.Close())}
                onMiddleButton={() => {
                  onResetSession();
                  onCompleteDeckyModalClose(() => handle.Close());
                }}
                onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
              />,
            );
          }}
          style={CLEAR_BUTTON_STYLE}
        >
          Clear cache...
        </Button>
        <Button
          className={FOCUS_RING_BTN_CLASS}
          ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("settings-clear-all-data", el)}
          onClick={() => {
            rememberModalReturnFocus("settings-clear-all-data");
            /*
              Tells the plugin shell which tab to come back to. Without it the shell came back to its
              default, Main, so B on this box (or Cancel, or Keep my data) took the panel from Settings
              to Main with the ring on "Main tab". Clear cache... above has always done this.
            */
            onBeforeDeckyModal();
            const handle = showModal(
              <ConfirmModal
                strTitle="Clear all plugin data?"
                strDescription={
                  "This resets bonsAI like a fresh install for this device.\n\n" +
                  "It deletes saved settings and permissions, runtime cache and plugin logs under Decky, " +
                  "and clears the Ollama host field, safety disclaimer flag, and unified-input persistence stored in the plugin browser.\n\n" +
                  "If Ollama on this Deck was enabled, this also removes downloaded models and the local Ollama install bonsAI set up under your account (~/.ollama and ~/.local/bin/ollama).\n\n" +
                  "It does not delete Desktop logs under bonsAI_logs.\n\n" +
                  "Afterward, set your Ollama host again and re-enable any permissions you need."
                }
                /* OK keeps everything and the wipe is the middle button; see the cache box above. */
                strOKButtonText="Keep my data"
                strMiddleButtonText="Clear all data"
                strCancelButtonText="Cancel"
                onOK={() => onCompleteDeckyModalClose(() => handle.Close())}
                onMiddleButton={() => {
                  void Promise.resolve(onClearAllPluginData()).finally(() => {
                    onCompleteDeckyModalClose(() => handle.Close());
                  });
                }}
                onCancel={() => onCompleteDeckyModalClose(() => handle.Close())}
              />,
            );
          }}
          style={CLEAR_BUTTON_STYLE}
        >
          Clear all data...
        </Button>
      </Focusable>
    </PanelSectionRow>
  </PanelSection>
);
