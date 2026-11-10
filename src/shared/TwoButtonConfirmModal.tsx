/**
 * Title: The shared two-button confirm box (the action on the left, Cancel on the right)
 *
 * Purpose: Every "are you sure?" box in the plugin (clear cache, clear all data, delete a chat, turn on
 * internet downloads, remove the knowledge base, remove a model, the AI models screen's Tier 2 and
 * large-model questions, the try-order reset) shows the same thing: a title, a line or two of words, and
 * exactly two buttons side by side. The action is on the left in the look of the Beta Notice's "Got it"
 * (Steam's own primary button: grey at rest, blue with the ring on it); Cancel (or the safe button's own
 * words) is on the right in the plugin's frosted glass, the same height (styles/confirmBoxButtons.ts), and
 * the ring starts on it, so an A pressed by habit changes nothing. B is Cancel. Left and Right step between
 * the two and hold still at the ends. The maintainer's rule of 2026-10-18: Cancel on the right in every box.
 * Since 2026-10-22 Cancel is glass, not Steam's plain button: that one turns solid white the moment the ring
 * lands on it, and the ring starts there, so every box opened with a white block beside a grey one, and the
 * two buttons were different heights (the maintainer's screenshot of the Delete chat? box).
 * The words under the title have a fixed height they cannot pass (WORDS_MAX_PX) and scroll inside it, so the
 * title and the buttons always fit the Deck's own screen; Down and Up on either button scroll the words, and a
 * plain "More below" line shows under them while more is below. A caller can keep its first lines on screen while
 * the rest scrolls (CONFIRM_BOX_PINNED_STYLE: the download notice's site lines). Before plan 103 the
 * fresh-install starter box was taller than the screen: Steam slid it up to show Cancel, its title went under
 * Steam's top bar, and Up did nothing (workshop:test-evidence/readme-STARTER-BOX-TOO-TALL.md).
 *
 * Used for: SettingsTabDataSection.tsx (Clear cache, Clear all data), downloadNotice.tsx (every download box,
 * the starter set's included), KnowledgeBaseSection.tsx (Remove), KbLoweredNotesRow.tsx (Clear lowered notes),
 * PullModelsTryOrder.tsx, usePullModelDeleteConfirm.tsx, usePullModelSubmitSelected.tsx,
 * usePullModelTier2Confirm.tsx, usePullModelToggleSelection.tsx, ChatSlotDeleteModal.tsx (Delete chat),
 * useMdnsOllamaDiscovery.tsx (Find LAN) and useThinkingNoticeGate.tsx (Show thinking / Keep it off), each
 * through showModal.
 *
 * Solves: Steam's own ConfirmModal always draws a Cancel button beside its OK button, so a box built as
 * "safe choice first" ended with three buttons (Keep cache / Clear / Cancel; plan 93 bug, measured on the
 * Deck 2026-10-13, workshop:test-evidence/plan93-P93-M9-CONFIRM-BOXES.json). Built on ModalRoot, the base a
 * ConfirmModal is made from, the buttons are ours, so there are exactly two. The ring cannot start on the
 * right-hand button by order alone (Steam starts a box on its first button, which is the action here), so
 * the box hands the ring to Cancel's nav node a moment after it mounts, the way the first-run popup does.
 *
 * Does not: do anything itself, close itself, or move the ring after it closes. The caller passes onCancel
 * (Cancel and B) and onAction and closes the box from both, through the plugin's own close path
 * (onCompleteDeckyModalClose), which sends the ring back to the control that opened the box; that memory
 * lives in modalReturnFocusRegistry.ts, outside every component, because closing a Decky box rebuilds the
 * tab behind it. There is no red button: a removing action looks like every other action, and its words
 * (Remove, Clear all data, Delete) say what it does.
 *
 * Gotchas:
 * - The action stays first in the DOM and Cancel second; the row's flow-children="horizontal" walks them in
 *   that order, which is also the order on screen. Moving Cancel first and reversing the row would change
 *   what Steam's own Left and Right do, which nothing here has measured.
 * - Both buttons answer all four directions with a handler (Steam calls it), so nothing depends on Steam's
 *   own step: Left and Right hand the ring to the other button by its nav node, the ends hold still, and
 *   Up and Down scroll the words one step (WORDS_STEP_PX) through the box's own ref and keep the ring where it
 *   is. The words are no stop of their own, so the ring never leaves the two buttons; words that fit do not
 *   scroll, show no "More below" row, and there Up and Down hold still as they always did.
 * - The "More below" row stays, empty, once the words reach their end, so the buttons never jump under the ring.
 * - The words box scrolls, so a bottom margin on the caller's last block stays inside it and adds to the
 *   10-point gap above the buttons instead of merging with it: a caller's words end with no margin of their
 *   own (downloadNotice.tsx drops its last one for this).
 * - Each button is wired for A (onOKButton on its Focusable) and for a finger (onClick), so a guard makes
 *   sure one press acts once, and B after a press does nothing more.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button, DialogButtonPrimary, Focusable, ModalRoot } from "@decky/ui";

import { BonsaiModalScope } from "./BonsaiModalScope";
import { panelScrollMax } from "./dpad/chatPanelScroll";
import { takeHolderFocus } from "./dpad/chatTranscriptNavHelpers";
import type { NavRefHolder } from "./dpad/navFocusRegistry";
import { CONFIRM_ACTION_BUTTON_STYLE, CONFIRM_SAFE_BUTTON_STYLE } from "../styles/confirmBoxButtons";
import { FOCUS_RING_BTN_CLASS } from "../styles/settingsGlassButton";
import { textPx } from "../styles/textPx";

export type TwoButtonConfirmModalProps = {
  title: string;
  /**
   * The words under the title. Passed through as given; the caller keeps its own text and colours. They scroll
   * once taller than WORDS_MAX_PX, so the last block carries no bottom margin of its own (see Gotchas).
   */
  body: ReactNode;
  /** The action button's label, e.g. "Clear" or "Download". */
  actionLabel: string;
  /** The safe button's label when "Cancel" is not the word (the Thinking notice's "Keep it off"). */
  cancelLabel?: string;
  /** Cancel and B. */
  onCancel: () => void;
  /** The action button. */
  onAction: () => void;
};

/** How many frames the box waits, after its first two, for Cancel's nav node before it gives the ring up. */
const RING_WAIT_FRAMES = 8;

/** Each button fills half the row; the Focusable is the stop, the button inside it the look. */
const CHOICE_CELL_STYLE: CSSProperties = { flex: "1 1 0", minWidth: 0 };

/**
 * The tallest the words (with the "More below" line, when they scroll) may be: fixed points, never a share of the
 * screen (the Deck's own screen and a monitor differ). The Deck's own screen is 800 pixels tall at 1.5 pixels per
 * point, 534 points; Steam's top and bottom bars leave y 40 to 492, its popup layer keeps 24 and 24.5 of that
 * clear above and below the box, and the box's own frame takes 26 above and 26 below
 * (workshop:test-evidence/plan64-MODELS-LIST-CAP-01-try2.json): 351.5 points for what this box draws. The
 * 16-point title at 1.45 (23.2; 26.7 on Large text, the largest, twice that if it wraps), the 10-point gaps under
 * the title and the words, and the 32-point buttons (their height is fixed; only their words grow) leave 276 on
 * Normal and 246 for a two-line title on Large. 240 fits every case. TwoButtonConfirmModal.fit.test.tsx works it
 * out again from the drawn box's own styles.
 */
const WORDS_MAX_PX = 240;

/** The "More below" line's row, part of the 240: it stays while the words scroll, so the buttons never move. */
const MORE_ROW_PX = 18;

/**
 * One Up or Down moves the words this far: under four lines. It must stay shorter than what shows of the words, or
 * a press would skip lines: under the download notice's pinned site lines that is 94 points on Normal and 78 on
 * Large (the fresh-install starter box: 222 less 128 or 144).
 */
const WORDS_STEP_PX = 64;

/** The plain sign under scrolling words while more of them is below. */
const MORE_BELOW = "▾ More below (press Down)";

/** Whether the words fit (no scrolling, no sign), or scroll with more below, or scroll and show their end. */
type WordsView = "fits" | "below" | "end";

/** The words' box: the height limit, scrolling inside it, and the gap above the buttons (under the sign when it shows). */
function wordsStyle(view: WordsView): CSSProperties {
  const fits = view === "fits";
  return {
    maxHeight: fits ? WORDS_MAX_PX : WORDS_MAX_PX - MORE_ROW_PX,
    marginBottom: fits ? 10 : 0,
    overflowY: "auto",
    overflowX: "hidden",
  };
}

const MORE_ROW_STYLE: CSSProperties = {
  height: MORE_ROW_PX,
  lineHeight: `${MORE_ROW_PX}px`,
  marginBottom: 10,
  fontSize: textPx(11),
  color: "#8fa8c4",
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
};

/**
 * For words that must stay on screen while the rest scroll under them (the download notice's "bonsAI will connect
 * to ..." lines): they stick to the top of the words' box over Steam's own box colour, rgb(14, 20, 27), read off
 * the Deck's pictures (readme-STARTER-BOX-TOO-TALL-1.png, plan94-P94-STARTER-SET-box.png), so nothing shows
 * through. The gap under them is the caller's padding, so the colour covers it too. With words that fit it
 * changes nothing on screen.
 */
export const CONFIRM_BOX_PINNED_STYLE: CSSProperties = { position: "sticky", top: 0, zIndex: 1, background: "rgb(14, 20, 27)" };

/**
 * The words' box and what Up and Down do to it. `read` sets the view from the box itself: at the first layout,
 * after every step, and on every scroll (a finger on the touch screen scrolls it too). Up (-1) or Down (1) moves the
 * words one step, no further than they go; the ring stays on its button, so the press is always taken.
 */
function useScrollingWords() {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<WordsView>("fits");
  const shown = useRef<WordsView>("fits");
  const read = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = panelScrollMax(el);
    const next: WordsView = max <= 1 ? "fits" : el.scrollTop < max - 1 ? "below" : "end";
    if (next === shown.current) return;
    shown.current = next;
    setView(next);
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    read();
    el?.addEventListener("scroll", read);
    return () => el?.removeEventListener("scroll", read);
  }, [read]);
  const step = (dir: -1 | 1) => () => {
    const el = ref.current;
    if (el) el.scrollTop = Math.max(0, Math.min(panelScrollMax(el), el.scrollTop + dir * WORDS_STEP_PX));
    read();
    return true;
  };
  return { ref, view, up: step(-1), down: step(1) };
}

type Hands = {
  onMoveLeft: () => boolean;
  onMoveRight: () => boolean;
  onMoveUp: () => boolean;
  onMoveDown: () => boolean;
};

const Choice: React.FC<{
  primary?: boolean;
  onChoose: () => void;
  navRef: NavRefHolder;
  hands: Hands;
  children: ReactNode;
}> = ({ primary = false, onChoose, navRef, hands, children }) => {
  const Look = primary ? DialogButtonPrimary : Button;
  return (
    <Focusable
      style={CHOICE_CELL_STYLE}
      onOKButton={onChoose}
      {...({ navRef, ...hands } as Record<string, unknown>)}
    >
      <Look
        className={FOCUS_RING_BTN_CLASS}
        onClick={onChoose}
        style={primary ? CONFIRM_ACTION_BUTTON_STYLE : CONFIRM_SAFE_BUTTON_STYLE}
      >
        {children}
      </Look>
    </Focusable>
  );
};

/**
 * In: the title, the words under it, the action's label, the safe button's label when it is not "Cancel",
 * and what each button does (onCancel is also B).
 * Out: the box, built on ModalRoot inside the plugin's popup scope, with the ring handed to the safe
 * button a moment after it opens.
 * Can go wrong: if Steam never fills the safe button's nav node, the ring stays where Steam put it (the
 * action) after RING_WAIT_FRAMES; both buttons still work.
 */
export function TwoButtonConfirmModal({
  title,
  body,
  actionLabel,
  cancelLabel = "Cancel",
  onCancel,
  onAction,
}: TwoButtonConfirmModalProps) {
  const done = useRef(false);
  const once = (act: () => void) => () => {
    if (done.current) return;
    done.current = true;
    act();
  };
  const actionNav = useRef<NavRefHolder["current"]>(null);
  const cancelNav = useRef<NavRefHolder["current"]>(null);
  const words = useScrollingWords();
  const { up, down } = words;

  // The ring starts on Cancel. Two frames: the box mounts, then Steam finishes its own first focus pass
  // (which lands on the action, the first button); then Cancel's nav node is taken, waiting a few more
  // frames if Steam has not filled it yet. Mount only: running again would pull the ring back.
  useEffect(() => {
    const frame = (run: () => void): number => window.requestAnimationFrame(run);
    let id = 0;
    let waited = 0;
    const take = () => {
      if (takeHolderFocus(cancelNav) || ++waited >= RING_WAIT_FRAMES) return;
      id = frame(take);
    };
    id = frame(() => {
      id = frame(take);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <ModalRoot onCancel={once(onCancel)}>
      {/* The plugin's stylesheet and Text size reach the box only through this wrapper: a Steam popup is
          drawn outside the plugin's own box, so without it Cancel's ring rule never applied. */}
      <BonsaiModalScope>
        <div className="bonsai-prose" style={{ fontSize: textPx(12), lineHeight: 1.45, color: "#cdd9e6", textAlign: "left" }}>
          <div style={{ fontSize: textPx(16), fontWeight: 700, color: "#ffffff", marginBottom: 10 }}>{title}</div>
          {/* The title above and the buttons below stay put; only the words scroll, from their top when it opens. */}
          <div ref={words.ref} style={wordsStyle(words.view)}>
            {body}
          </div>
          {words.view === "fits" ? null : <div style={MORE_ROW_STYLE}>{words.view === "below" ? MORE_BELOW : null}</div>}
          <Focusable flow-children="horizontal" style={{ display: "flex", flexDirection: "row", gap: 8 }}>
            <Choice
              primary
              onChoose={once(onAction)}
              navRef={actionNav}
              hands={{ onMoveLeft: () => true, onMoveRight: () => takeHolderFocus(cancelNav) || true, onMoveUp: up, onMoveDown: down }}
            >
              {actionLabel}
            </Choice>
            <Choice
              onChoose={once(onCancel)}
              navRef={cancelNav}
              hands={{ onMoveLeft: () => takeHolderFocus(actionNav) || true, onMoveRight: () => true, onMoveUp: up, onMoveDown: down }}
            >
              {cancelLabel}
            </Choice>
          </Focusable>
        </div>
      </BonsaiModalScope>
    </ModalRoot>
  );
}
