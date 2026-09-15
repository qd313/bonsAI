/**
 * Title: The small button under an AI reply
 *
 * Purpose: One of the small controls that sit under an AI answer — Helpful,
 * Not really, Read aloud, Show details. This file draws the button itself:
 * Steam's own button, made into a real D-pad stop, so a person can reach it
 * with the controller and not just a mouse or touch. When a caller passes
 * an id, the button also adds itself to a shared list (replyStopRegistry) so
 * other code can tell the D-pad to jump straight to "Helpful" or "Copy" by
 * name, from anywhere else in the reply.
 *
 * Used for: The chat transcript's per-reply controls, drawn by
 * MainTabChatTranscript.
 *
 * Solves: A plain HTML button placed inside a Focusable is not something the
 * D-pad can land on directly. Every one of these reply controls needs the
 * same fix, so it lives here once instead of being repeated at each call
 * site.
 *
 * Does not: Decide what pressing the button does — the caller's own onClick
 * owns that. Also does not lay the controls out as a grid: an older version
 * of this header said the buttons sat in a "2x2 grid", which is no longer
 * true — Retry now sits on the question bubble and Copy in the corner of the
 * answer bubble; see replyStopRegistry.ts for where each control actually
 * lives today.
 */
import type { ReactNode } from "react";
import { Button } from "@decky/ui";
import { registerReplyStop, type ReplyStopId } from "../utils/replyStopRegistry";

type BonsaiChatSecondaryButtonProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  className?: string;
  style?: React.CSSProperties;
  deckNav?: Record<string, () => boolean | void>;
  /** Registers this button in the reply 2x2 focus registry for column D-pad hops. */
  replyStop?: ReplyStopId;
};

/** Decky `Button` focus stop — native `<button>` inside `Focusable` is not D-pad navigable. */
export function BonsaiChatSecondaryButton(props: BonsaiChatSecondaryButtonProps) {
  const { children, onClick, disabled, className, style, deckNav, replyStop, ...rest } = props;
  const extra = className ? ` ${className}` : "";
  return (
    <Button
      className={`bonsai-chat-secondary-btn${extra}`}
      focusable
      disabled={disabled}
      onClick={onClick}
      style={style}
      ref={
        replyStop
          ? (el: HTMLElement | null) => {
              registerReplyStop(replyStop, el);
            }
          : undefined
      }
      {...(deckNav as Record<string, unknown> | undefined)}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Button>
  );
}
