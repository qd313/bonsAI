/**
 * Title: "Using bonsAI" popup
 *
 * Purpose: The quick-start popup someone sees the first time they open
 * bonsAI, or whenever they tap the "How to use bonsAI" suggestion chip. It
 * shows a short set of instructions and closes on either its OK or Cancel
 * button — both just dismiss it, there is no different outcome for the two.
 *
 * Used for: The Main tab's "How to use bonsAI" suggestion chip.
 *
 * Solves: Nothing beyond showing the instructions text (written once, in
 * PluginQuickStartInstructionsBody) inside a properly styled popup — this
 * file is the popup shell around that shared text, no more.
 *
 * Does not: Remember that someone has already seen it. Whether this popup
 * shows again is decided by the caller, which checks a value already saved
 * on this device before opening it.
 */
import { ConfirmModal } from "@decky/ui";
import { PluginQuickStartInstructionsBody } from "../data/pluginQuickStartInstructions";
import { BonsaiModalScope } from "./BonsaiModalScope";

export type PluginHelpModalProps = {
  onClose: () => void;
};

/**
 * Pass only to `showModal()` — parent must not render this in the QAM tree.
 */
export function PluginHelpModal(props: PluginHelpModalProps) {
  const { onClose } = props;
  return (
    <ConfirmModal
      strTitle="Using bonsAI"
      strDescription={
        <BonsaiModalScope>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <PluginQuickStartInstructionsBody />
        </div>
        </BonsaiModalScope>
      }
      strOKButtonText="Got it"
      strCancelButtonText="Cancel"
      onOK={onClose}
      onCancel={onClose}
    />
  );
}
