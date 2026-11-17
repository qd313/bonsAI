/**
 * Title: One line of the "N earlier" list, and the game buttons of an open day
 * Purpose: Draw the "N earlier" line itself, the day (or game) lines under it ("Today · 12"), the "Show N more"
 * line at the end of an open line, and the row of game buttons an open day carries when it mixes games
 * (plan 105: All, each game, No game). Each line is one D-pad stop: A opens or closes it (on "Show N more":
 * brings in the next questions), and B closes it while it is open ("Show N more" never claims B). Each game
 * button is one stop: A lights it (the questions under the row become that game's), B closes the day.
 * Used for: MainTabChatTranscript.tsx (through buildEarlierList.tsx), in front of the older questions of a long chat.
 * Solves: Opening "N earlier" used to bring back every older question as its own row. The lines
 * keep that to a handful of stops, and each opens on its own (earlierTurnsByDay.ts says which).
 * Does not: Decide what the line stands for or where the ring goes on a Down or Up. The caller hands
 * in the move handlers (chatTranscriptNavHelpers.ts), so the ring's graph is written in one place.
 * Caution: Activation is `onActivate` alone, the way a question's header does it. A twin on
 * `onOKButton` is harmless for a line that only opens, but would run twice on one press for a line
 * that toggles. B is `onCancelButton` and only while open: the handler's mere presence eats B
 * (MainTabChatTranscript.tsx, the Show reasoning row), so a closed line must not carry one. The game row
 * exists only while its day is open, so its buttons always claim B.
 */
import { useRef } from "react";
import { Focusable } from "@decky/ui";
import { gameButtonNav, gameButtonNavHandlers, registerEarlierLineEl } from "../../../shared/dpad/chatTranscriptNavHelpers";
import type { EarlierGameChoice } from "./earlierTurnsByDay";

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

/** Steam's B handler: run `close` and keep the press from going on to Steam's own back. */
function claimB(close: () => void): Record<string, unknown> {
  return {
    onCancelButton: (e: unknown) => {
      close();
      (e as { preventDefault?: () => void })?.preventDefault?.();
    },
  };
}

export function EarlierListLine(props: EarlierListLineProps) {
  const { text, kind, open = false, onToggle, onClose, nav } = props;
  const closeWithB = open && onClose ? claimB(onClose) : {};
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
      {...closeWithB}
    >
      <span className="bonsai-chat-earlier-pill">{text}</span>
      <span className="bonsai-chat-earlier-rule" />
      {kind === "day" || (kind === "earlier" && open) ? <span className="bonsai-chat-earlier-chev">{open ? "▾" : "▸"}</span> : null}
    </Focusable>
  );
}

export type EarlierGameRowProps = {
  /** The open day the row belongs to. */
  dayKey: string;
  /** All, the day's games, No game (earlierTurnsByDay.ts's `gameChoicesOfDay`); one is lit. */
  choices: EarlierGameChoice[];
  /** A on a button that is not lit: light it. */
  onPick: (gameKey: string) => void;
  /** B on any button: the caller hands the ring to the day line, then closes the day. */
  onClose: () => void;
  /** Up and Down from any button: the day line, and the first question under the row. */
  up: () => boolean;
  down: () => boolean;
};

/**
 * The row of game buttons right under an open day's line (the drawing's `.e2-chips`: right-aligned,
 * wrapping when the names do not fit). One container, flowing sideways, holding one stop per button, each
 * with its own nav node and all four moves claimed (chatTranscriptNavHelpers.ts's `gameButtonNavHandlers`).
 * A on the lit button does nothing; the ring stays on the button whichever is pressed.
 */
export function EarlierGameRow(props: EarlierGameRowProps) {
  const { dayKey, choices, onPick, onClose, up, down } = props;
  const navOf = (i: number) => (i >= 0 && i < choices.length ? gameButtonNav(dayKey, choices[i]!.key) : null);
  return (
    <Focusable className="bonsai-chat-earlier-games" flow-children="horizontal">
      {choices.map((choice, i) => (
        <Focusable
          key={choice.key}
          className={`bonsai-chat-earlier-game${choice.picked ? " bonsai-chat-earlier-game--on" : ""}`}
          aria-pressed={choice.picked}
          aria-label={`${choice.name}, ${choice.count} ${choice.count === 1 ? "question" : "questions"}`}
          onActivate={() => {
            if (!choice.picked) onPick(choice.key);
          }}
          {...gameButtonNavHandlers({ nav: navOf(i)!, before: navOf(i - 1), after: navOf(i + 1), up, down })}
          {...claimB(onClose)}
        >
          <span className="bonsai-chat-earlier-game-name">{choice.name}</span>
          <span className="bonsai-chat-earlier-game-count">{choice.count}</span>
        </Focusable>
      ))}
    </Focusable>
  );
}
