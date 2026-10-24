/**
 * Title: Strategy checklist panel
 * Purpose: The tick-off list for a Strategy answer's checklist, one checkbox row per step.
 * Used for: MainTabChatTranscript strategy mode replies with collapsible checklist state.
 * Solves: Deck-navigable checkbox rows wired into the live-turn focus graph. A step is a Decky
 * Button (the same stop the answer's choice buttons are) drawn with a tick box and its words; a
 * ticked step shows a tick and its words go dim and struck through. They were on/off switches,
 * which read as settings rather than a list you tick off (plan 96, F19).
 * The route look (plan 98, H): drawn from the maintainer's pick, the mock-up board's tab 5 option C
 * (docs/demos/mockup-board/src/45b-maps-r2.js, "route", and 48b-round2.css, .m5-route). The steps sit on one
 * vertical line: a 12 px round dot per step, a 2 px line from each dot down to the next. An open step has a
 * hollow cyan dot, a ticked one a filled dot with a check, an open last step the gold goal dot. A step further
 * on than the person has got is covered: a hatched dot, grey words, a bold "Step N", and under it "A shows
 * this step" on the first covered step or "Covered" on the later ones. A on the first covered step shows it
 * and does nothing else; A on a later covered step does nothing; A on an open step ticks it as before. Every
 * step is the same Button in the same wrapper with the same nav node, redrawn in place when shown, so the
 * D-pad walk and Steam's ring are what they were. Which steps are covered: strategyChecklist.ts; the steps
 * shown by hand are kept by strategyChecklistPersistence.ts. An open step whose own words carry
 * "Needs: ..." draws that as the small second line; no other step does.
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

/** The route's colours and sizes, from the drawing (48b-round2.css, .m5-*); see docs/design-tokens.md. */
const ROUTE = {
  line: "#6f8296",
  ring: "#9ce7ff",
  hollow: "#0c1218",
  goal: "#facc15",
  coveredRing: "#3a4654",
  coveredFill: "repeating-linear-gradient(45deg, #151b23 0 3px, #1b232d 3px 6px)",
  coveredWords: "#8a8a74",
  words: "#fff6d2",
  small: "#d8d2b8",
  tickedWords: "#8fa3b8",
} as const;
const DOT_PX = 12;
const DOT_TOP_PX = 2;
/** The check inside a ticked dot: the dot is a fixed 12 px, so its mark stays fixed too, like an icon. */
const ROUTE_DOT_CHECK_PX = 8;
/** The step's own frame: 1 px border and 4 px / 8 px padding; the line runs from under one dot to the next. */
const STEP_PAD_TOP = 4;
const STEP_PAD_LEFT = 8;
const STEP_GAP = 4;

const DOT_BASE: CSSProperties = {
  flexShrink: 0,
  width: DOT_PX,
  height: DOT_PX,
  marginTop: DOT_TOP_PX,
  boxSizing: "border-box",
  borderRadius: "50%",
  borderWidth: 2,
  borderStyle: "solid",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: ROUTE_DOT_CHECK_PX,
  fontWeight: 700,
  lineHeight: 1,
  color: ROUTE.hollow,
};

/** The dot for one step: hatched when covered, filled with a check when ticked, gold when it is the goal. */
function routeDotStyle(kind: { covered: boolean; checked: boolean; goal: boolean }): CSSProperties {
  if (kind.covered) return { ...DOT_BASE, borderColor: ROUTE.coveredRing, background: ROUTE.coveredFill };
  const colour = kind.goal ? ROUTE.goal : ROUTE.ring;
  return { ...DOT_BASE, borderColor: colour, background: kind.checked || kind.goal ? colour : ROUTE.hollow };
}

/** The line from under this step's dot down to the next step's dot. */
const ROUTE_LINE: CSSProperties = {
  position: "absolute",
  left: 1 + STEP_PAD_LEFT + DOT_PX / 2 - 1,
  width: 2,
  top: 1 + STEP_PAD_TOP + DOT_TOP_PX + DOT_PX,
  bottom: -(STEP_GAP + 1 + STEP_PAD_TOP + DOT_TOP_PX),
  background: ROUTE.line,
  pointerEvents: "none",
};

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
  // Only the first covered step can be shown with A, as in the drawing; the later ones read "Covered".
  const nextToShow = checklist.items.find((it) => covered.has(it.id))?.id;
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
        gap: STEP_GAP,
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
        const isNextToShow = item.id === nextToShow;
        const words = splitStrategyStepNeeds(item.label);
        const isFirst = idx === 0;
        const isLast = idx === checklist.items.length - 1;
        const small = isCovered ? (isNextToShow ? "A shows this step" : "Covered") : words.needs ? `Needs: ${words.needs}` : null;
        const onPress = () => {
          if (!isCovered) onToggle(item.id, !checked);
          else if (isNextToShow) reveal(item.id);
        };
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
            style={{ width: "100%", position: "relative" }}
            {...({ navRef: strategyChecklistStepNav(idx), ...(nav ?? {}) } as Record<string, unknown>)}
          >
          <Button
            focusable
            className={`${FOCUS_RING_BTN_CLASS} bonsai-strategy-checklist-step`}
            data-route-stop={isCovered ? "covered" : "open"}
            data-route-step={idx + 1}
            aria-checked={isCovered ? undefined : checked}
            aria-pressed={isCovered ? undefined : checked}
            aria-label={
              isCovered
                ? `Step ${idx + 1}, covered.${isNextToShow ? " Press A to show it." : " It opens when you get there."}`
                : undefined
            }
            onClick={onPress}
            style={{
              position: "relative",
              width: "100%",
              minWidth: 0,
              minHeight: 32,
              padding: `${STEP_PAD_TOP}px ${STEP_PAD_LEFT}px`,
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              gap: 8,
              textAlign: "left",
              borderRadius: 4,
              border: "1px solid transparent",
              background: "transparent",
              fontSize: textPx(12),
              lineHeight: 1.3,
              color: isCovered ? ROUTE.coveredWords : checked ? ROUTE.tickedWords : ROUTE.words,
            }}
            {...({ role: isCovered ? "button" : "checkbox" } as Record<string, unknown>)}
          >
            <span
              aria-hidden="true"
              className="bonsai-strategy-checklist-box"
              style={routeDotStyle({ covered: isCovered, checked, goal: isLast && !isCovered })}
            >
              {!isCovered && checked ? "✔" : ""}
            </span>
            <span
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                textDecoration: !isCovered && checked ? "line-through" : "none",
              }}
            >
              <span style={{ fontWeight: 600 }}>{isCovered ? `Step ${idx + 1}` : words.text}</span>
              {small ? (
                <span
                  className={isCovered ? "bonsai-strategy-checklist-cover-hint" : "bonsai-strategy-checklist-needs"}
                  style={{ fontSize: textPx(11), color: isCovered ? ROUTE.coveredWords : checked ? ROUTE.tickedWords : ROUTE.small }}
                >
                  {small}
                </span>
              ) : null}
            </span>
          </Button>
          {isLast ? null : <span aria-hidden="true" className="bonsai-strategy-checklist-line" style={ROUTE_LINE} />}
          </Focusable>
        );
      })}
    </div>
  );
}
