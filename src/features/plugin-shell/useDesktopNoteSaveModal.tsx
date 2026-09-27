/**
 * Title: "Save this answer to the Desktop" popup
 *
 * Purpose: Opens the confirm popup for saving the last question and answer
 * to a text file on the Steam Deck's own Desktop, and does the actual save
 * once a person confirms a file name.
 *
 * Used for: The Main tab's "save this exchange" action.
 *
 * Solves: If the plugin has not been allowed to write files, shows a
 * message explaining that and a shortcut to turn it on, instead of the
 * save button silently doing nothing.
 *
 * Does not: Save the whole chat. It saves one question and answer: this
 * session's newest, or, for an older chat with nothing asked yet this
 * session, the newest loaded turn that has an answer (desktopNoteExchangeFor).
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

/**
 * In: this session's newest question and answer (or null), and the chat's turns as loaded from its
 * file, oldest first.
 * Out: the one question and answer the Desktop note saves, or null when the chat has no answer at
 * all (an empty chat) -- the chat row draws its save icon only when this is not null.
 * Plan 72 job E: this used to be this session's answer alone, so an older saved chat (the Deck's
 * "Hades" chat, every answer from earlier sessions) had nothing to save and showed no icon.
 */
export function desktopNoteExchangeFor(
  lastExchange: DesktopNoteExchange | null,
  loadedTurns: readonly DesktopNoteExchange[],
): DesktopNoteExchange | null {
  if (lastExchange) return { question: lastExchange.question, answer: lastExchange.answer };
  for (let i = loadedTurns.length - 1; i >= 0; i--) {
    const turn = loadedTurns[i]!;
    if (turn.answer.trim()) return { question: turn.question, answer: turn.answer };
  }
  return null;
}

/** One shared empty list, so a caller that passes no turns does not remake the opener each render. */
const NO_TURNS: readonly DesktopNoteExchange[] = [];

export type UseDesktopNoteSaveModalArgs = {
  /** `filesystem_write` capability; without it the action explains and redirects. */
  filesystemWrite: boolean;
  /** Most recent question/answer pair from this session, or null. */
  lastExchange: DesktopNoteExchange | null;
  /** The chat's turns as loaded from its file, oldest first; the fallback when `lastExchange` is null. */
  loadedTurns?: readonly DesktopNoteExchange[];
  jumpToPermission: (capability: BonsaiCapabilityKey) => void;
  currentTab: string;
  finalizeShowModalAndRestoreActiveTab: (close: () => void) => void;
  returnTabRef: React.MutableRefObject<string>;
};

/**
 * In: the filesystem-write permission flag, the last question/answer to
 * save, and the tab-restore plumbing every popup uses.
 * Out: one function that opens the popup. Nothing until it is called.
 * Can go wrong: called with no exchange to save (`lastExchange` is null),
 * it does nothing at all — not even open a popup — so a caller has to
 * make sure the save button is not shown in that state to begin with.
 */
export function useDesktopNoteSaveModal({
  filesystemWrite,
  lastExchange,
  loadedTurns = NO_TURNS,
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
    const ex = desktopNoteExchangeFor(lastExchange, loadedTurns);
    if (!ex) {
      return;
    }
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
    loadedTurns,
    filesystemWrite,
    jumpToPermission,
    currentTab,
    finalizeShowModalAndRestoreActiveTab,
    returnTabRef,
  ]);
}
