import { ConfirmModal } from "@decky/ui";
import { PluginQuickStartInstructionsBody } from "../data/pluginQuickStartInstructions";

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
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <PluginQuickStartInstructionsBody />
        </div>
      }
      strOKButtonText="Got it"
      strCancelButtonText="Cancel"
      onOK={onClose}
      onCancel={onClose}
    />
  );
}
