/**
 * Title: Telling the notes screens what the Main tab knows
 *
 * Purpose: The note card and the notes line are drawn by plain builder functions deep inside the chat
 * transcript, where the shell's popup hooks (the capture before a popup opens, the finish after it
 * closes) and the open chat's id are not at hand. The Main tab hands them in here once per render, and
 * the store keeps them for the card, the line and the sheet.
 *
 * Used for: MainTab.tsx, one call.
 *
 * Solves: Threading two callbacks and an id through the transcript's builders (the transcript is at its
 * size limit) for the sake of one popup each.
 *
 * Does not: Open anything or draw anything. A popup closing rebuilds the Main tab, which calls this again
 * with fresh callbacks, so nothing is cleared when the tab goes away.
 */
import { useLayoutEffect } from "react";

import { setActiveSlot, setNotesModalHooks } from "./userNotesStore";

export function useUserNotesBridge(args: {
  activeSlotId: string | null | undefined;
  before?: () => void;
  complete?: (close: () => void) => void;
}): void {
  const { activeSlotId, before, complete } = args;
  useLayoutEffect(() => {
    setNotesModalHooks({ before, complete });
  }, [before, complete]);
  useLayoutEffect(() => {
    setActiveSlot(activeSlotId);
  }, [activeSlotId]);
}
