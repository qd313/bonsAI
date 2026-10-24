/**
 * Title: Strategy checklist panel
 * Purpose: The tick-off list for a Strategy answer's checklist, one checkbox row per step.
 * Used for: MainTabChatTranscript strategy mode replies with collapsible checklist state.
 * Solves: Deck-navigable checkbox rows wired into the live-turn focus graph. A step is a Decky
 * Button (the same stop the answer's choice buttons are) drawn with a tick box and its words; a
 * ticked step shows a tick and its words go dim and struck through. They were on/off switches,
 * which read as settings rather than a list you tick off (plan 96, F19).
 * The route look (plan 98, H; the mock-up board's tab 5, option C): a step further on than the person has
 * got is drawn covered, the way a spoiler cover is, with only its number and "Hidden until you get there —
 * A to show". A on a covered step shows it and does nothing else; A on an open step ticks it as before.
 * A covered step is the same Button in the same wrapper with the same nav node, redrawn in place when
 * shown, so the D-pad walk and Steam's ring are what they were. Which steps are covered:
 * strategyChecklist.ts; the steps shown by hand are kept by strategyChecklistPersistence.ts. An open step
 * whose own words carry "Needs: ..." draws that as a small line under its words; no other step does.
 * Does not: Parse strategy branches from model output — see strategyChecklist utils and backend parser.
 */
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Button, Focusable } from "@decky/ui";

import type { StrategyChecklistState } from "../../types/bonsaiUi";
import { deckNavHandlers } from "../../shared/dpad/liveTurnFocusGraph";
import { setStrategyChecklistStepCount, strategyChecklistStepNav } from "../../shared/dpad/strategyChecklistNav";
import { FOCUS_RING_BTN_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";
import { splitStrategyStepNeeds, strategyRouteCoveredIds, strategyRouteRevealKey } from "./strategyChecklist";
import { loadStrategyRouteRevealed, saveStrategyRouteRevealed } from "./strategyChecklistPersistence";

type Props = {
  checklist: StrategyChecklistState;
  onToggle: (itemId: string, checked: boolean) => void;
  onMoveUpFromFirst?: () => boolean;
  onMoveDownFromLast?: () => boolean;
};

const TICK_BOX_BASE: CSSProperties = {
  flexShrink: 0,
  width: 16,
  height: 16,
  boxSizing: "border-box",
  borderRadius: 3,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: textPx(11),
  fontWeight: 700,
  lineHeight: 1,
};

/**
 * A covered step wears the spoiler cover's own look (answerBubble.ts, `.bonsai-spoiler-reveal-target`, and
 * its radius in MainTabBonsaiAiMarkdownChunk.tsx): see docs/design-tokens.md, "The spoiler cover".
 */
const COVER_BG = "#0a0a0a";
const COVER_BORDER = "1px solid rgba(80, 80, 80, 0.55)";
const COVER_TEXT = "rgba(160, 160, 160, 0.85)";
const COVER_RADIUS = 8;
const COVER_WORDS = "Hidden until you get there — A to show";

/** The steps shown by hand on this list, kept between draws of the panel; and the A that shows one. */
function useRouteReveals(checklist: StrategyChecklistState) {
  const listKey = strategyRouteRevealKey(checklist);
  const [kept, setKept] = useState(() => ({ listKey, ids: loadStrategyRouteRevealed(listKey) }));
  // A new list (a new question) reads its own kept steps once, never the last list's.
  let ids = kept.ids;
  if (kept.listKey !== listKey) {
    ids = loadStrategyRouteRevealed(listKey);
    setKept({ listKey, ids });
  }
  const reveal = useCallback(
    (itemId: string) => {
      const next = ids.includes(itemId) ? ids : [...ids, itemId];
      saveStrategyRouteRevealed(listKey, next);
      setKept({ listKey, ids: next });
    },
    [ids, listKey],
  );
  return { revealedIds: ids, reveal };
}

/** The panel: the checklist's title, a one-line note, then one row per step, later steps covered. */
export function StrategyChecklistPanel({
  checklist,
  onToggle,
  onMoveUpFromFirst,
  onMoveDownFromLast,
}: Props) {
  // How many steps are drawn, so the answer's chains can take the first or the last (strategyChecklistNav.ts).
  const stepCount = checklist.items.length;
  const { revealedIds, reveal } = useRouteReveals(checklist);
  const covered = strategyRouteCoveredIds(checklist, revealedIds);
  useEffect(() => {
    setStrategyChecklistStepCount(stepCount);
    return () => setStrategyChecklistStepCount(0);
  }, [stepCount]);
  return (
    <div
      className="bonsai-glass-panel bonsai-strategy-checklist-panel"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        marginBottom: 12,
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid rgba(150, 187, 223, 0.45)",
        background: "linear-gradient(180deg, rgba(64, 93, 124, 0.42) 0%, rgba(48, 71, 95, 0.42) 100%)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: textPx(12), color: "#dce8f4", fontWeight: 600, marginBottom: 4 }}>{checklist.title}</div>
      <div
        className="bonsai-strategy-checklist-note"
        style={{ fontSize: textPx(11), color: "#a8b8c8", lineHeight: 1.35, marginBottom: 6 }}
      >
        Your ticks are saved until you ask a new Strategy question, leave Strategy mode, or use Clear cache or
        Clear all data in Settings.
      </div>
      {checklist.items.map((item, idx) => {
        const checked = checklist.checkedIds.includes(item.id);
        const isCovered = covered.has(item.id);
        const words = splitStrategyStepNeeds(item.label);
        const isFirst = idx === 0;
        const isLast = idx === checklist.items.length - 1;
        /*
         * Up from the first step and Down from the last: the same handlers the switches carried. They sit
         * on a Focusable around the button (a Decky Button does not forward them), together with the step's
         * own nav node, which is what lets the answer's Down chain and the rating row's Up chain hand Steam's
         * ring to a step through Steam's transfer (plan 96 F4: a plain focus left the ring on the answer).
         */
        const nav =
          (isFirst && onMoveUpFromFirst) || (isLast && onMoveDownFromLast)
            ? deckNavHandlers({
                ...(isFirst && onMoveUpFromFirst ? { onMoveUp: () => onMoveUpFromFirst() } : {}),
                ...(isLast && onMoveDownFromLast ? { onMoveDown: () => onMoveDownFromLast() } : {}),
              })
            : undefined;
        return (
          <Focusable
            key={`sg-check-${item.id}`}
            className="bonsai-strategy-checklist-step-wrap"
            style={{ width: "100%" }}
            {...({ navRef: strategyChecklistStepNav(idx), ...(nav ?? {}) } as Record<string, unknown>)}
          >
          <Button
            focusable
            className={`${FOCUS_RING_BTN_CLASS} bonsai-strategy-checklist-step`}
            data-route-stop={isCovered ? "covered" : "open"}
            aria-checked={isCovered ? undefined : checked}
            aria-pressed={isCovered ? undefined : checked}
            aria-label={isCovered ? `Step ${idx + 1}, hidden until you get there. Press A to show it.` : undefined}
            onClick={() => (isCovered ? reveal(item.id) : onToggle(item.id, !checked))}
            style={{
              width: "100%",
              minWidth: 0,
              minHeight: 32,
              padding: "4px 8px",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 8,
              textAlign: "left",
              borderRadius: isCovered ? COVER_RADIUS : 4,
              border: isCovered ? COVER_BORDER : "1px solid rgba(150, 187, 223, 0.25)",
              background: isCovered ? COVER_BG : checked ? "rgba(36, 52, 70, 0.45)" : "rgba(36, 52, 70, 0.75)",
              fontSize: textPx(12),
              lineHeight: 1.3,
              color: isCovered ? COVER_TEXT : checked ? "#8fa3b8" : "#e8eef4",
            }}
            {...({ role: isCovered ? "button" : "checkbox" } as Record<string, unknown>)}
          >
            <span
              aria-hidden="true"
              className="bonsai-strategy-checklist-box"
              style={{
                ...TICK_BOX_BASE,
                border: `1px solid ${isCovered ? "rgba(80, 80, 80, 0.85)" : checked ? "rgba(56, 189, 248, 0.9)" : "rgba(150, 187, 223, 0.7)"}`,
                background: !isCovered && checked ? "rgba(56, 189, 248, 0.9)" : "transparent",
                color: isCovered ? COVER_TEXT : "#0b1722",
              }}
            >
              {isCovered ? String(idx + 1) : checked ? "✔" : ""}
            </span>
            <span
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                textDecoration: !isCovered && checked ? "line-through" : "none",
                fontWeight: isCovered ? 600 : undefined,
              }}
            >
              {isCovered ? COVER_WORDS : words.text}
              {!isCovered && words.needs ? (
                <span
                  className="bonsai-strategy-checklist-needs"
                  style={{ display: "block", fontSize: textPx(11), color: checked ? "#7f93a8" : "#a8b8c8", lineHeight: 1.3 }}
                >
                  {`Needs: ${words.needs}`}
                </span>
              ) : null}
            </span>
          </Button>
          </Focusable>
        );
      })}
    </div>
  );
}
