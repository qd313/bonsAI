/**
 * Title: One line of the "N earlier" list
 * Purpose: Draw the "N earlier" line itself and the day lines under it ("Today · 12"). Each is one
 * D-pad stop: A opens or closes it, and B closes it while it is open.
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
import { Focusable } from "@decky/ui";

export type EarlierListLineProps = {
  /** The words on the line: "12 earlier", or "Yesterday · 30". */
  text: string;
  /** "day" lines sit under the "N earlier" line and read a little brighter. */
  kind: "earlier" | "day";
  open: boolean;
  /** A: open it if closed, close it if open. */
  onToggle: () => void;
  /** B, only while open. */
  onClose: () => void;
  /** The Left / Down / Up handlers from chatTranscriptNavHelpers.ts. */
  nav: Record<string, unknown>;
};

export function EarlierListLine(props: EarlierListLineProps) {
  const { text, kind, open, onToggle, onClose, nav } = props;
  const closeWithB = open
    ? {
        onCancelButton: (e: unknown) => {
          onClose();
          (e as { preventDefault?: () => void })?.preventDefault?.();
        },
      }
    : {};
  return (
    <Focusable
      className={`bonsai-chat-earlier-pill-row${kind === "day" ? " bonsai-chat-earlier-day-row" : ""}`}
      aria-expanded={open}
      onActivate={onToggle}
      {...nav}
      {...(closeWithB as Record<string, unknown>)}
    >
      <span className="bonsai-chat-earlier-pill">{text}</span>
      <span className="bonsai-chat-earlier-rule" />
      {kind === "day" || open ? <span className="bonsai-chat-earlier-chev">{open ? "▾" : "▸"}</span> : null}
    </Focusable>
  );
}
