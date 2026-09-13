/**
 * Title: Desktop note save modal
 * Purpose: Own the Save-to-Desktop confirm modal and its append_desktop_debug_note call.
 * Used for: index.tsx — the Main tab "save this exchange" action.
 * Solves: Keeps a permission gate, a consent modal, and RPC error toasting out of the shell.
 * Does not: Decide the note's contents — the caller supplies the exchange to append.
 */
import { useCallback } from "react";
import { showModal } from "@decky/ui";
import { toaster } from "@decky/api";

import { DesktopNoteSaveModal } from "../../components/DesktopNoteSaveModal";
import { PermissionDenyAction } from "../../components/PermissionDenyAction";
import { callDeckyWithTimeout, formatDeckyRpcError } from "../../utils/deckyCall";
import type { BonsaiCapabilityKey } from "../../utils/permissionDeepLink";

type AppendDesktopNoteResult = {
  success: boolean;
  path?: string;
  error?: string;
};

/** Only the fields the note needs, so the hook does not depend on the Ask slice's shape. */
type DesktopNoteExchange = {
  question: string;
  answer: string;
};

export type UseDesktopNoteSaveModalArgs = {
  /** `filesystem_write` capability; without it the action explains and redirects. */
  filesystemWrite: boolean;
  /** Most recent question/answer pair, or null when there is nothing to save. */
  lastExchange: DesktopNoteExchange | null;
  jumpToPermission: (capability: BonsaiCapabilityKey) => void;
  currentTab: string;
  finalizeShowModalAndRestoreActiveTab: (close: () => void) => void;
  returnTabRef: React.MutableRefObject<string>;
};

export function useDesktopNoteSaveModal({
  filesystemWrite,
  lastExchange,
  jumpToPermission,
  currentTab,
  finalizeShowModalAndRestoreActiveTab,
  returnTabRef,
}: UseDesktopNoteSaveModalArgs): () => void {
  return useCallback(() => {
    if (!filesystemWrite) {
      returnTabRef.current = currentTab;
      const handle = showModal(
        <div style={{ padding: 16, maxWidth: 420 }}>
          <PermissionDenyAction
            capability="filesystem_write"
            message="Enable Save files to Desktop in the Permissions tab to save notes to Desktop."
            onJump={(capability) => {
              jumpToPermission(capability);
              finalizeShowModalAndRestoreActiveTab(() => handle.Close());
            }}
          />
        </div>,
      );
      return;
    }
    if (!lastExchange) {
      return;
    }
    const ex = lastExchange;
    // Deliberately does not call captureSessionBeforeModal(), matching the behavior this was
    // extracted from. The other showModal openers do capture first; whether this one should
    // is tracked separately rather than changed inside a behavior-preserving move.
    returnTabRef.current = currentTab;
    const handle = showModal(
      <DesktopNoteSaveModal
        strDescriptionPrefix={
          "This appends to a file on your Steam Deck Desktop (not the PC running Ollama).\n\n" +
          "Folder: Desktop/bonsAI_logs/\n" +
          "Existing notes are never replaced; new entries are appended with a timestamp.\n\n" +
          "Proceed only if you want this question and answer saved there."
        }
        defaultStem="bonsai-debug"
        onCancel={() => finalizeShowModalAndRestoreActiveTab(() => handle.Close())}
        onConfirm={async (stem) => {
          if (!stem) {
            toaster.toast({ title: "Note name required", body: "Enter a name for the note file.", duration: 3200 });
            return;
          }
          try {
            const result = await callDeckyWithTimeout<
              [{ stem: string; question: string; response: string }],
              AppendDesktopNoteResult
            >("append_desktop_debug_note", [{ stem, question: ex.question, response: ex.answer }]);
            if (result.success) {
              toaster.toast({ title: "Note saved", body: result.path ?? "Saved.", duration: 3800 });
              finalizeShowModalAndRestoreActiveTab(() => handle.Close());
            } else {
              toaster.toast({ title: "Save failed", body: result.error ?? "Unknown error.", duration: 5000 });
            }
          } catch (e: unknown) {
            toaster.toast({ title: "Save failed", body: formatDeckyRpcError(e), duration: 5000 });
          }
        }}
      />,
    );
  }, [
    lastExchange,
    filesystemWrite,
    jumpToPermission,
    currentTab,
    finalizeShowModalAndRestoreActiveTab,
    returnTabRef,
  ]);
}
