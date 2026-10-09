/**
 * Title: One line of the "N earlier" list
 * Purpose: Draw the "N earlier" line itself, the day lines under it ("Today · 12"), and the "Show N more"
 * line at the end of an open day. Each is one D-pad stop: A opens or closes it (on "Show N more": brings
 * in the next questions), and B closes it while it is open ("Show N more" never claims B).
 * Used for: MainTabChatTranscript.tsx, in front of the older questions of a long chat.
 * Solves: Opening "N earlier" used to bring back every older question as its own row. The day lines
 * keep that to a handful of stops, and each opens on its own (earlierTurnsByDay.ts says which).
 * Does not: Decide what the line stands for or where the ring goes on a Down or Up. The caller hands
 * in the move handlers (chatTranscriptNavHelpers.ts), so the ring's graph is written in one place.
 * Caution: Activation is `onActivate` alone, the way a question's header does it. A twin on
 * `onOKButton` is harmless for a line that only opens, but would run twice on one press for a line
 * that toggles. B is `onCancelButton` and only while open: the handler's mere presence eats B
 * (MainTabChatTranscript.tsx, the Show reasoning row), so a closed line must not carry one.
 */
import { useRef } from "react";
import { Focusable } from "@decky/ui";
import { registerEarlierLineEl } from "../utils/chatTranscriptNavHelpers";

export type EarlierListLineProps = {
  /** The words on the line: "12 earlier", or "Yesterday · 30". */
  text: string;
  /**
   * "day" lines sit under the "N earlier" line and read a little brighter. "more" is the "Show N more"
   * line at the end of an open day: it only acts on A, has nothing to open or close, and leaves B to Steam.
   */
  kind: "earlier" | "day" | "more";
  /** Whether the line is open (never for "more", which has no open state). */
  open?: boolean;
  /** A: open it if closed, close it if open (for "more": show the next questions). */
  onToggle: () => void;
  /** B, only while open. */
  onClose?: () => void;
  /** The Left / Down / Up handlers from chatTranscriptNavHelpers.ts. */
  nav: Record<string, unknown>;
};

export function EarlierListLine(props: EarlierListLineProps) {
  const { text, kind, open = false, onToggle, onClose, nav } = props;
  const closeWithB = open && onClose
    ? {
        onCancelButton: (e: unknown) => {
          onClose();
          (e as { preventDefault?: () => void })?.preventDefault?.();
        },
      }
    : {};
  /* The "N earlier" line says it is on screen, so Down from the tab bar can land on it. */
  const mounted = useRef<HTMLElement | null>(null);
  const noteMounted = (el: HTMLElement | null) => {
    if (kind !== "earlier") return;
    registerEarlierLineEl(el, mounted.current);
    mounted.current = el;
  };
  return (
    <Focusable
      ref={noteMounted}
      className={`bonsai-chat-earlier-pill-row${kind === "earlier" ? "" : " bonsai-chat-earlier-day-row"}${
        kind === "more" ? " bonsai-chat-earlier-more-row" : ""
      }`}
      aria-expanded={kind === "more" ? undefined : open}
      onActivate={onToggle}
      {...nav}
      {...(closeWithB as Record<string, unknown>)}
    >
      <span className="bonsai-chat-earlier-pill">{text}</span>
      <span className="bonsai-chat-earlier-rule" />
      {kind === "day" || (kind === "earlier" && open) ? <span className="bonsai-chat-earlier-chev">{open ? "▾" : "▸"}</span> : null}
    </Focusable>
  );
}
