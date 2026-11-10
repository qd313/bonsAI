/**
 * Title: "Using bonsAI" popup
 *
 * Purpose: The quick-start popup someone sees the first time they open
 * bonsAI, or whenever they tap the "How to use bonsAI" suggestion chip. It
 * shows a short set of instructions and closes on either its Got it or Cancel
 * button — both just dismiss it, there is no different outcome for the two.
 *
 * Used for: The Main tab's "How to use bonsAI" suggestion chip.
 *
 * Solves: Nothing beyond showing the instructions text (written once, in
 * PluginQuickStartInstructionsBody) inside a popup that fits the Deck's own
 * screen — this file is the popup shell around that shared text, no more.
 * It is the shared two-button box (TwoButtonConfirmModal), which keeps its
 * title and buttons on screen and scrolls the words inside a fixed height,
 * with Down and Up on either button scrolling them and "More below" under
 * them while there is more. Until plan 103 it was Steam's own ConfirmModal,
 * which has no height limit: about 544 points tall where the Deck's screen
 * shows 452 between Steam's bars, so Steam slid it up to show its buttons
 * and the title and first lines sat under Steam's top bar
 * (workshop:test-evidence/plan103-P103-QUICKSTART-01.json; already so on
 * 2026-10-17, plan94-P94-HELP-CHIP-try2-open.png).
 *
 * Does not: Remember that someone has already seen it. Whether this popup
 * shows again is decided by the caller, which checks a value already saved
 * on this device before opening it.
 *
 * Gotchas:
 * - The ring opens on Got it, where Steam's box opened it, not on Cancel as
 *   in the other boxes: here both buttons only close the popup.
 * - The column's 10-point gap sits between the highlighted box and the
 *   list; the list ends with no margin of its own, so the gap above the
 *   buttons stays the box's own 10 points.
 */
import { PluginQuickStartInstructionsBody } from "./pluginQuickStartInstructions";
import { TwoButtonConfirmModal } from "../../shared/TwoButtonConfirmModal";

export type PluginHelpModalProps = {
  onClose: () => void;
};

/**
 * Pass only to `showModal()` — parent must not render this in the QAM tree.
 */
export function PluginHelpModal(props: PluginHelpModalProps) {
  const { onClose } = props;
  return (
    <TwoButtonConfirmModal
      title="Using bonsAI"
      body={
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <PluginQuickStartInstructionsBody />
        </div>
      }
      actionLabel="Got it"
      cancelLabel="Cancel"
      onAction={onClose}
      onCancel={onClose}
      ringStartsOn="action"
    />
  );
}
