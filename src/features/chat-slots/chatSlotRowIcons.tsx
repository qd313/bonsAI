/**
 * Title: Chat row icons
 * Purpose: The floppy disk (Save) and the pencil (New chat) the chat row draws.
 * Used for: ChatSlotRow.
 * Solves: Keeps ChatSlotRow under its size limit; the drawings moved here unchanged.
 * Does not: Know anything about the row's state or focus -- they are plain pictures.
 */
/*
 * The two icons the maintainer picked from the true-size drawing of 2026-09-27 (plan 72): save
 * option B, a floppy disk at the row's left end facing the bin, and new-chat option 4, a pencil. Both
 * are copied exactly from that drawing, stroked in the current text colour.
 */
export function DiskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5a1 1 0 0 1 1-1h11.5L20 7.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M8 4v5h7V4" />
      <path d="M7 20v-6h10v6" />
    </svg>
  );
}
export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  );
}
