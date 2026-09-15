/**
 * Title: Reply copy button
 *
 * Purpose: This is the Copy button under a finished reply, or the small icon in
 * the answer bubble's own corner. Press it and the answer's visible text goes
 * to the clipboard. The button's own label reports what happened — Copy, then
 * Copied, or Copy failed if the write did not work — and settles back to Copy
 * on its own a couple of seconds later.
 *
 * Used for: The row of action buttons under a finished reply, and the small
 * corner icon drawn on the answer bubble itself.
 *
 * Solves: Keeps "press it, copy the text, show what happened" in one place, so
 * the file that lays out a reply's row of buttons does not have to manage
 * clipboard state itself.
 *
 * Does not: Decide what counts as the answer's "visible" text — see
 * answerCopyText.ts. Does not touch the clipboard directly either — see
 * clipboardWrite.ts.
 */
import React, { useEffect, useRef, useState } from "react";
import { BonsaiChatSecondaryButton } from "./BonsaiChatSecondaryButton";
import { CopyDoneIcon, CopyFailedIcon, CopyGlyphIcon } from "./icons";
import { writeClipboardText } from "../utils/clipboardWrite";

export type ReplyCopyButtonProps = {
  /** Read at press time so a still-streaming answer copies whatever is current, not a stale snapshot. */
  getCopyText: () => string;
  disabled?: boolean;
  deckNav?: Record<string, () => boolean | void>;
  /**
   * Draw as a small faded icon for the answer bubble's corner instead of a labelled button (D77).
   * "Copied" and "Copy failed" have no room there, so the result is a tick or a cross and the
   * words stay in the spoken label, which is unchanged.
   */
  corner?: boolean;
};

type CopyStatus = "idle" | "copying" | "copied" | "error";

/** Long enough to read, short enough not to strand the row in a stale state. */
const RESET_DELAY_MS = 2000;

const LABEL: Record<CopyStatus, string> = {
  idle: "Copy",
  copying: "Copy",
  copied: "Copied",
  error: "Copy failed",
};

const ARIA_LABEL: Record<CopyStatus, string> = {
  idle: "Copy reply text",
  copying: "Copy reply text",
  copied: "Reply copied to clipboard",
  error: "Copy reply failed, press to try again",
};

const CORNER_ICON: Record<CopyStatus, React.FC<{ size?: number }>> = {
  idle: CopyGlyphIcon,
  copying: CopyGlyphIcon,
  copied: CopyDoneIcon,
  error: CopyFailedIcon,
};

/*
 * In: `getCopyText`, called fresh at the moment of the press rather than once
 * when the button first appears, so an answer still streaming in copies
 * whatever text has arrived by the time you actually press the button. Also
 * whether the button is disabled, the D-pad handlers passed down to it, and
 * whether to draw as the small corner icon instead of a full labelled button.
 * Out: the button element, in one of its two looks.
 * What can go wrong: nothing to copy — an empty answer, or a press before any
 * text has arrived — shows Copy failed right away, the same as a clipboard
 * write the host rejects. Either way the label resets to Copy on its own a
 * couple of seconds later, and a press that arrives while a copy is already
 * running is ignored, so two presses in a row cannot race each other.
 */
export function ReplyCopyButton(props: ReplyCopyButtonProps) {
  const { getCopyText, disabled = false, deckNav, corner = false } = props;
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timerRef = useRef<number | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    },
    []
  );

  const scheduleReset = () => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setStatus("idle");
    }, RESET_DELAY_MS);
  };

  const handleClick = () => {
    if (status === "copying") return;
    const text = getCopyText();
    if (!text.trim()) {
      setStatus("error");
      scheduleReset();
      return;
    }
    setStatus("copying");
    writeClipboardText(text).then(
      () => {
        if (!mountedRef.current) return;
        setStatus("copied");
        scheduleReset();
      },
      () => {
        if (!mountedRef.current) return;
        setStatus("error");
        scheduleReset();
      }
    );
  };

  if (corner) {
    const Icon = CORNER_ICON[status];
    return (
      <BonsaiChatSecondaryButton
        disabled={disabled}
        onClick={handleClick}
        aria-label={ARIA_LABEL[status]}
        replyStop="copy"
        deckNav={deckNav}
        className={`bonsai-reply-copy-corner bonsai-reply-copy-corner--${status}`}
      >
        <Icon size={14} />
      </BonsaiChatSecondaryButton>
    );
  }

  return (
    <BonsaiChatSecondaryButton
      disabled={disabled}
      onClick={handleClick}
      aria-label={ARIA_LABEL[status]}
      replyStop="copy"
      deckNav={deckNav}
    >
      {LABEL[status]}
    </BonsaiChatSecondaryButton>
  );
}
