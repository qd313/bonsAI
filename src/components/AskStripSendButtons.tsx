/**
 * Title: The small ASK button and the X in the question box's strip
 *
 * Purpose: The right end of the question box's bottom strip (plan 84 step 2, drawing frames "D" and "Z" in
 * docs/planning/assets/84-vertical-room.html): the small ASK button with its send arrow and, only while the
 * box has words, the X that empties the box, just left of ASK. Together they replace the big ASK button and
 * the X that sat in its row under the box.
 *
 *     ... [mode] [mic or Stop] [X] [Ask ->]      <- the strip's right-hand group
 *
 * Used for: MainTabUnifiedAskBar.tsx, inside the strip's right-hand group, after the mic (or Stop).
 *
 * Solves: The big ASK row cost 39 points of the panel's 454, under the box. This is the same button, smaller:
 * it asks, it rests (dimmed, not pressable) while an answer is being written, and it keeps the strip's right
 * end with or without words, so a thumb and the D-pad find it in one place.
 *
 * Does not: Decide what a press does: the caller hands in handleAskPress (useAskBarPressHandlers.ts) and its
 * own clear. Does not wire Up, or Down from the box onto ASK: Up sits on the strip's right-hand group in
 * MainTabUnifiedAskBar.tsx (a Decky Button does not forward Up or Down), and the box's Down is
 * useMainTabAskBarFocus.ts's. The whole route map: docs/focus-graph.md, "The ask box's strip (plan 84)".
 *
 * How it works:
 * 1. The X, drawn only while the box has words: Left goes to the mic or Stop; Right goes to ASK, or holds
 *    still while ASK rests. A or a tap runs the caller's clear, which empties the box and hands the ring to
 *    it (the X is gone once the box is empty).
 * 2. ASK: Left goes to the X when it shows, else to the mic or Stop; Right holds still, it is the strip's
 *    right end. A or a tap asks. While an answer is being written it is disabled and dimmed, and A on it
 *    does nothing.
 * 3. focusOwnRef is the in-row hop both use: a plain focus() on a button's own element, safe because every
 *    stop in this group is a sibling in one Steam row; never a class lookup.
 */
import React from "react";
import { Button } from "@decky/ui";

import { ClearIcon } from "./icons";

/** A ref this file can focus through: a button's own element, filled in by Decky's Button. */
type ElementRef = React.RefObject<HTMLElement | null>;

/**
 * In: a button's own ref.
 * Out: true when the button was there and took focus.
 * Can go wrong: nothing; a button that is not drawn (the X with an empty box) is simply reported missing,
 *     and the caller falls through to its next stop.
 */
export function focusOwnRef(ref: ElementRef): boolean {
  const el = ref.current;
  if (!el) return false;
  el.focus();
  return true;
}

export type AskStripSendButtonsProps = {
  /** True while an answer is being written (or Sum up runs): ASK rests. */
  isAsking: boolean;
  /** Words in the box and nothing being asked: ASK takes its brighter, ready look. */
  askLooksReady: boolean;
  /** The X shows only while the box has words (the caller's showSearchClearButton). */
  showClear: boolean;
  onAskPress: () => void;
  onClearPress: () => void;
  /** ASK's own element; useMainTabAskBarFocus.ts's focusAskPrimary focuses it (Down from the box). */
  askRef: React.Ref<HTMLDivElement>;
  /** The X's own element, for the hops into it from the mic or Stop and from ASK. */
  clearRef: React.RefObject<HTMLDivElement | null>;
  /** Left from the X, and from ASK with no X: the mic, or Stop in its place. */
  focusMicOrStop: () => boolean;
  /** Right from the X: ASK, which reports false while it rests. */
  focusAskPrimary: () => boolean;
};

/** The drawing's send arrow (ICON.send in the plan 84 drawing), drawn in the label's own colour. */
function SendArrow() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" />
    </svg>
  );
}

/**
 * In: AskStripSendButtonsProps.
 * Out: the X (only with words) and the small ASK, as siblings for the strip's right-hand group to hold.
 * Can go wrong: a press on ASK while it rests is refused twice over, by `disabled` and by the A handler's
 *     own check, so a press Steam delivers anyway asks nothing.
 */
export function AskStripSendButtons(props: AskStripSendButtonsProps) {
  const { isAsking, askLooksReady, showClear, onAskPress, onClearPress, askRef, clearRef, focusMicOrStop, focusAskPrimary } = props;
  return (
    <>
      {showClear ? (
        <Button
          ref={clearRef}
          className="bonsai-askbar-target bonsai-ask-strip-clear"
          {...({
            onMoveLeft: () => focusMicOrStop(),
            /* ASK, or hold still while it rests: past the X there is nothing a press could do. */
            onMoveRight: () => focusAskPrimary() || true,
          } as Record<string, unknown>)}
          onClick={onClearPress}
          aria-label="Clear"
          style={{
            minWidth: 20,
            width: 20,
            minHeight: 20,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: "#dbe6f3",
            flexShrink: 0,
          }}
        >
          <span className="bonsai-askbar-corner-icon">
            <ClearIcon size={16} />
          </span>
        </Button>
      ) : null}
      <Button
        ref={askRef}
        className={
          "bonsai-askbar-target bonsai-ask-primary bonsai-ask-pill" +
          (askLooksReady ? " bonsai-ask-primary--ready" : "") +
          (isAsking ? " bonsai-ask-pill--resting" : "")
        }
        {...({
          onMoveLeft: () => focusOwnRef(clearRef as ElementRef) || focusMicOrStop(),
          /* The strip's right end: hold still, or Steam would hand the ring out past the panel's edge. */
          onMoveRight: () => true,
          onOKButton: (evt: { stopPropagation: () => void }) => {
            if (isAsking) return;
            evt.stopPropagation();
            onAskPress();
          },
        } as Record<string, unknown>)}
        onClick={onAskPress}
        disabled={isAsking}
        aria-label="Ask"
        style={{ flexShrink: 0 }}
      >
        <span className="bonsai-ask-pill__label">Ask</span>
        <SendArrow />
      </Button>
    </>
  );
}
