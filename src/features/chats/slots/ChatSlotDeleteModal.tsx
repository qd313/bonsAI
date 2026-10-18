/**
 * Title: The "Delete chat?" box
 *
 * Purpose: The box the chats menu's Delete chat opens (the old chat row's bin opened it until plan 84
 * step 5). It is the shared two-button box (TwoButtonConfirmModal.tsx) with this box's words: Delete on
 * the left, Cancel on the right, and the ring starting on Cancel, so an A pressed by habit keeps the chat.
 * B keeps the chat too. Only A on Delete removes it.
 *
 * Used for: Opened by useChatSlotDeleteConfirm.tsx through showModal, for the chats menu and for the "Chats
 * are full" picker's second step.
 *
 * Solves: This box used to be its own copy of the layout; the maintainer's rule of 2026-10-18 (Cancel on the
 * right in every box, the ring on it, the action in the Got it look) is now written once, in the shared
 * box, and this file only hands it the title, the words and the two actions. How the ring walks between the
 * two buttons, and why, is in the shared box's header.
 *
 * Does not: delete anything itself, or close itself. The caller passes onKeep (Cancel, B) and onDelete
 * (Delete) and closes the box from both.
 */
import { TwoButtonConfirmModal } from "../../../shared/TwoButtonConfirmModal";

export type ChatSlotDeleteModalProps = {
  label: string;
  onKeep: () => void;
  onDelete: () => void;
};

export function ChatSlotDeleteModal({ label, onKeep, onDelete }: ChatSlotDeleteModalProps) {
  return (
    <TwoButtonConfirmModal
      title="Delete chat?"
      body={`Delete "${label}" and its transcript? This cannot be undone.`}
      actionLabel="Delete"
      onCancel={onKeep}
      onAction={onDelete}
    />
  );
}
