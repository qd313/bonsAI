/**
 * Title: The "From the notes" block's own open/closed state
 * Purpose: Own which turns have their "From the notes" block open — independent per turn, since
 * several can reasonably be open at once while scrolling back through a chat — and scroll a
 * block's own header into view the moment it opens.
 * Used for: MainTabChatTranscript, once per chat, handed to every turn's own block.
 * Solves: Keeps the block's per-turn open state and its scroll-on-open effect together, out of
 * the transcript component's own body. Takes no argument: nothing here reaches outside itself.
 * Does not: Draw the block — buildKbNotesBlockElement.tsx does that, using the state this hands
 * back. Does not decide what counts as "open by default" for a note nobody has touched yet — that
 * judgement call (KB_NOTES_BLOCK_OPEN_BY_DEFAULT) lives here because nothing else needs it.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { scrollElementTopToPaneTop } from "../utils/chatPanelScroll";

/*
 * The "From the notes" block (plan 58 phase 1), under a reply that used a note from the
 * knowledge base or a shared troubleshooting tip. The maintainer has not yet picked open or
 * closed by default (the mockup page at docs/planning/assets/58-phase-1-block-mockups.html is
 * what they are picking from) — this lane's own recommendation and the session's are both
 * closed, so that is what ships behind this one constant. Flipping it to `true` is meant to be
 * the entire change once an answer comes back.
 */
const KB_NOTES_BLOCK_OPEN_BY_DEFAULT = false;

export interface KbNotesFold {
  isKbNotesOpen: (turnKey: string) => boolean;
  toggleKbNotesOpen: (turnKey: string) => void;
  /** The block's own header row, one per turn key — see this file's header for why it is
   *  separate from the whole-Focusable registry buildKbNotesBlockElement.tsx keeps. */
  kbNotesHeaderElRefs: MutableRefObject<Record<string, HTMLElement | null>>;
}

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useKbNotesFold(): KbNotesFold {
  const [kbNotesOpenByTurn, setKbNotesOpenByTurn] = useState<Record<string, boolean>>({});
  const isKbNotesOpen = (turnKey: string) =>
    kbNotesOpenByTurn[turnKey] ?? KB_NOTES_BLOCK_OPEN_BY_DEFAULT;
  /**
   * The block's own header row, one per turn key — separate from `kbNotesBlockEls` (the whole
   * Focusable, header plus body) because opening the block has to scroll to the HEADER alone,
   * not to the block's own bottom edge. First Deck rows (NOTES-BLOCK-01): a three-note block
   * opens to about 970 px in a 366 px pane, and the pane scrolled to follow the growing
   * Focusable's own bottom edge, leaving the header 768 px above the top — a person had to
   * scroll back up to read the very first note the press was meant to reveal.
   */
  const kbNotesHeaderElRefs = useRef<Record<string, HTMLElement | null>>({});
  /** Set only on a closed-to-open toggle, read once by the effect below, then cleared — the
   *  smallest signal that says "this one just opened, scroll its header into view." */
  const justOpenedKbNotesTurnRef = useRef<string | null>(null);
  const toggleKbNotesOpen = (turnKey: string) =>
    setKbNotesOpenByTurn((prev) => {
      const wasOpen = prev[turnKey] ?? KB_NOTES_BLOCK_OPEN_BY_DEFAULT;
      if (!wasOpen) justOpenedKbNotesTurnRef.current = turnKey;
      return { ...prev, [turnKey]: !wasOpen };
    });
  /*
   * Runs after every render (no dependency array — the ref, not a dependency, is what gates it)
   * so it always sees the DOM the just-committed open state produced. `requestAnimationFrame`
   * lets that paint settle first, the same reason `isStreamSettling` elsewhere in this file
   * waits a frame — scrolling before layout has caught up would measure the block's old,
   * still-closed height.
   */
  useEffect(() => {
    const turnKey = justOpenedKbNotesTurnRef.current;
    if (!turnKey) return;
    justOpenedKbNotesTurnRef.current = null;
    const header = kbNotesHeaderElRefs.current[turnKey];
    if (!header) return;
    const raf = requestAnimationFrame(() => {
      // Not scrollIntoView: that honours the pane's 116 px scroll-padding-top and left the header
      // where it already was (see scrollElementTopToPaneTop).
      scrollElementTopToPaneTop(header);
    });
    return () => cancelAnimationFrame(raf);
  });

  return { isKbNotesOpen, toggleKbNotesOpen, kbNotesHeaderElRefs };
}
