/**
 * Title: The "Save chat to Desktop" row
 *
 * Purpose: The button under a chat that opens the save-to-Desktop dialog, in its own registered
 * row so the D-pad can reach it from the suggestion chips right below it.
 *
 * Used for: MainTabChatTranscript.tsx, the last thing it draws when the chat can be saved.
 *
 * Solves: Up from a suggestion chip stepped over this button to the permission rows or the answer
 * (plan 70, docs/test-evidence/plan70-SMOKE-C.json and the PERMS-CLEAN-06 walk): nothing was
 * registered here, and the chips' Up can only hand the ring to a row through Steam's own transfer
 * (navFocusRegistry). The row registers its nav node as "save-chat-desktop"; the chips try it first.
 *
 * Does not: Save anything, or decide when the chat can be saved -- the caller's `onOpen` opens the
 * dialog, and the caller decides whether to draw the row at all.
 */
import { useEffect, useRef } from "react";
import { Button, Focusable, PanelSectionRow } from "@decky/ui";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";
import { registerNavFocus, takeNavFocus, unregisterNavFocus, type NavRefHolder } from "../utils/navFocusRegistry";
import { registerSaveChatRowEl } from "../utils/saveChatRowNav";

/**
 * Up goes to the permission rows above, lowest first, through Steam's own transfer; with neither
 * showing, the move is left to Steam, as it was before this row was registered. It used to fall
 * back to a hop into the newest answer, and on the Deck over a running game Up from here then did
 * nothing at all (plan70-R-R3-try2.json). Down goes to the chips when they show; otherwise Steam
 * carries on down as it always did.
 */
export const upFromSaveChat = (): boolean =>
  takeNavFocus("chat-perm-hint-deny") || takeNavFocus("chat-perm-hint-troubleshoot");

export function SaveChatToDesktopRow(props: { enabled: boolean; onOpen: () => void }) {
  const { enabled, onOpen } = props;
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("save-chat-desktop", navRef);
    return () => unregisterNavFocus("save-chat-desktop", navRef);
  }, []);
  return (
    <PanelSectionRow>
      <Focusable
        className="bonsai-save-chat-desktop-row"
        ref={registerSaveChatRowEl}
        {...({
          navRef,
          onMoveUp: upFromSaveChat,
          onMoveDown: () => takeNavFocus("preset-carousel"),
        } as Record<string, unknown>)}
      >
        <Button
          ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("desktop-note-save", el)}
          onClick={() => {
            rememberModalReturnFocus("desktop-note-save");
            onOpen();
          }}
          style={{
            width: "100%",
            minHeight: 38,
            border: "1px solid rgba(150, 187, 223, 0.45)",
            background: "rgba(64, 93, 124, 0.35)",
            color: "#dce8f4",
            opacity: enabled ? 1 : 0.45,
          }}
        >
          Save chat to Desktop
        </Button>
      </Focusable>
    </PanelSectionRow>
  );
}
