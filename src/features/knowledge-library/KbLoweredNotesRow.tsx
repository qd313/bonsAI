/**
 * Title: The Knowledge base section's "Lowered notes: N" row and its Clear box
 *
 * Purpose: Shows how many notes and shared tips the person has ranked lower with a thumbs-down under an answer,
 * with one Clear button that takes every mark back after asking first ("Clear lowered notes?", Clear then Cancel,
 * the ring on Cancel). Before this row, three marks left a note out of answers for good with nothing on screen to
 * see or undo it once a newer answer had moved the Undo button away (plan 100, lane U).
 *
 * Used for: KnowledgeBaseSection.tsx, which reads the count with its status and draws this under the Update /
 * Remove row only while the count is above 0.
 *
 * Solves: Keeps the row, its box and the "the marks were cleared" signal in one place, out of a section file
 * already at its size limit.
 *
 * Does not: Read or clear the marks itself (demoteNoteApi.ts makes the two calls), or move the ring: the row has
 * no move handlers and no B handler. Down and Up are Steam's own column flow, as for Remove, and B belongs to the
 * box. Up from the Reply style line reaches Clear through useOllamaTabFocus.ts's hop.
 */
import React from "react";
import { Button, Focusable, PanelSectionRow, showModal } from "@decky/ui";
import { toaster } from "@decky/api";

import { TwoButtonConfirmModal } from "../../shared/TwoButtonConfirmModal";
import { registerModalReturnFocusOwner, rememberModalReturnFocus } from "../../shared/dpad/modalReturnFocusRegistry";
import { SETTINGS_GLASS_BTN } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";
import { clearLoweredNotes } from "./demoteNoteApi";

/** The same fixed height as the Update / Remove row above it, so the two buttons line up. */
const ROW_BUTTON_HEIGHT = 44;

/*
 * Clear's box closing rebuilds the tab, so the copy of the section that pressed Clear is gone before the back end
 * answers, and the new copy may have read the count before the file was emptied. Every copy on screen signs up
 * here and reads the count again.
 */
const clearedListeners = new Set<() => void>();

/** Sign a section copy up to read the count again after a Clear; returns the sign-off. */
export function onLoweredNotesCleared(reRead: () => void): () => void {
  clearedListeners.add(reRead);
  return () => void clearedListeners.delete(reRead);
}

/**
 * In: how many notes are lowered now, whether the library is installed (where the ring goes once the row has
 * gone: Remove when it is, else Download), the tab's two modal hooks, and what to do once the marks are cleared.
 * Out: the box is open; its Clear calls the back end once.
 * Can go wrong: a failed clear keeps the marks and says so in a toast; every copy reads the count again either way.
 */
export function openClearLoweredNotesBox(a: {
  count: number;
  installed: boolean;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onCleared: () => void;
}): void {
  rememberModalReturnFocus("kb-lowered-clear");
  a.onBeforeDeckyModal();
  const handle = showModal(
    <TwoButtonConfirmModal
      title="Clear lowered notes?"
      body={
        <div className="bonsai-prose" style={{ fontSize: textPx(12), lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
          {a.count === 1
            ? "The 1 note you ranked lower comes back on later questions."
            : `The ${a.count} notes you ranked lower come back on later questions.`}
        </div>
      }
      actionLabel="Clear"
      onCancel={() => a.onCompleteDeckyModalClose(() => handle.Close())}
      onAction={() => {
        // The Clear row is about to go; the ring goes to the stop that stays above it (Remove's own trick).
        rememberModalReturnFocus(a.installed ? "kb-remove" : "kb-download");
        a.onCompleteDeckyModalClose(() => handle.Close());
        void clearLoweredNotes().then((res) => {
          if (res.ok) a.onCleared();
          else toaster.toast({ title: "Clear failed", body: "The lowered notes were kept.", duration: 5000 });
          clearedListeners.forEach((reRead) => reRead());
        });
      }}
    />,
  );
}

/**
 * In: the count (drawn only above 0 by the caller), what Clear does, and an optional ref for the tab's Up hop.
 * Out: one row, the words on the left and Clear on the right, built like the Update / Remove row: a horizontal
 * container, the button inside a Focusable that hears A, the button's own tap for touch.
 */
export function KbLoweredNotesRow(p: {
  count: number;
  onClear: () => void;
  btnRef?: React.RefObject<HTMLButtonElement | null>;
}): React.ReactElement {
  return (
    <PanelSectionRow>
      <Focusable
        flow-children="horizontal"
        className="bonsai-settings-bleed bonsai-kb-lowered-row"
        style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, width: "100%" }}
      >
        <span style={{ flex: "1.6 1 0", minWidth: 0, fontSize: textPx(12), color: "#cdd9e6" }}>
          Lowered notes: {p.count}
        </span>
        <div
          className="bonsai-settings-focus-btn-host"
          style={{ flex: "0.9 1 0", minWidth: 72, display: "flex", alignItems: "stretch" }}
        >
          <Focusable onOKButton={p.onClear} style={{ width: "100%", display: "flex", alignItems: "stretch" }}>
            <Button
              ref={(el) => {
                const btn = el as HTMLButtonElement | null;
                registerModalReturnFocusOwner("kb-lowered-clear", btn);
                if (p.btnRef) p.btnRef.current = btn;
              }}
              className="bonsai-settings-focus-btn"
              onClick={p.onClear}
              style={{
                ...SETTINGS_GLASS_BTN,
                width: "100%",
                minHeight: ROW_BUTTON_HEIGHT,
                height: ROW_BUTTON_HEIGHT,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Clear
            </Button>
          </Focusable>
        </div>
      </Focusable>
    </PanelSectionRow>
  );
}
