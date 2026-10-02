/**
 * Title: What the "N earlier" part of a long chat puts on screen
 * Purpose: Decide, for the transcript, the "N earlier" line, the day lines under it once it is open,
 * which older questions are drawn as rows, and what A and B do on each line.
 * Used for: MainTabChatTranscript.tsx, in front of and between the turn rows.
 * Solves: The transcript file is far past its size limit. This keeps the whole earlier-list decision
 * in one place, so the transcript only draws what it is handed.
 * Does not: Draw a turn row, group questions by day (earlierTurnsByDay.ts does), or decide where the
 * ring goes on a press (chatTranscriptNavHelpers.ts does; this only passes the next turn's id in).
 * Caution: Closing a day, or the whole list, while the open question is inside it hides that
 * question. The newest answer then opens again (`onTurnActivate` toggles to it) instead of leaving
 * every row closed with nothing open.
 */
import type { ReactElement } from "react";
import type { NavRefHolder } from "../utils/navFocusRegistry";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { dayLineText, layoutEarlierByDay, type EarlierDay } from "../utils/earlierTurnsByDay";
import { dayLineNav, earlierLineNavHandlers, earlierPillNavHandlers } from "../utils/chatTranscriptNavHelpers";
import { EarlierListLine } from "./EarlierListLine";

export type BuildEarlierListArgs = {
  /** Every finished turn, oldest first. */
  turns: AskThreadCollapsedTurn[];
  /** How many of them are "earlier": all but the newest one on screen. */
  earlierCount: number;
  showLiveTurn: boolean;
  earlierExpanded: boolean;
  setEarlierExpanded: (expanded: boolean) => void;
  openDays: ReadonlySet<string>;
  toggleDay: (dayKey: string) => void;
  expandedTurnKey: string | null;
  onTurnActivate?: (key: string | "live") => void;
};

export type EarlierList = {
  /** The "N earlier" line, or null when there are fewer than two earlier turns. */
  line: ReactElement | null;
  /** The turns drawn as rows: every turn when there is no line, else those the open list shows. */
  turnsToRender: AskThreadCollapsedTurn[];
  /** The day lines to draw directly in front of the row for `turnId`. */
  dayLinesBefore: (turnId: string) => ReactElement[] | null;
  /** Day lines with no row after them, drawn after the last row. */
  trailingDayLines: ReactElement[] | null;
  /** The nav node of the day line drawn right over the row for `turnId`, if one is. */
  navAbove: (turnId: string) => NavRefHolder | null;
  /** The same for the live turn: the last day line drawn after the last row, if any. */
  navAboveLive: () => NavRefHolder | null;
  /** Whether a day line is the next stop below the row for `nextTurn` (undefined: below the last row). */
  dayLineFollows: (nextTurn: AskThreadCollapsedTurn | undefined) => boolean;
};

/**
 * Work out the earlier list for one render: with the line closed only the turns after the earlier ones
 * show; opened, the day lines show with the questions of the open days. Each line carries its own nav
 * node, so a question's Up (questionMoveUpOut) can hand the ring to exactly the line over it.
 */
export function buildEarlierList(a: BuildEarlierListArgs): EarlierList {
  const { turns, earlierCount, showLiveTurn, earlierExpanded, setEarlierExpanded, openDays, toggleDay } = a;
  const hasLine = earlierCount >= 2;
  const layout = hasLine && earlierExpanded ? layoutEarlierByDay({ turns, earlierCount, openDays }) : null;
  const turnsToRender = layout ? layout.shown : hasLine ? turns.slice(earlierCount) : turns;
  const afterEarlier = showLiveTurn ? "live" : null;

  const newestKey = showLiveTurn ? "live" : turns[turns.length - 1]?.id;
  const reopenNewestIfHidden = (hidden: AskThreadCollapsedTurn[]) => {
    if (newestKey && a.expandedTurnKey !== newestKey && hidden.some((t) => t.id === a.expandedTurnKey)) {
      a.onTurnActivate?.(newestKey);
    }
  };

  /* `nextTurnId` is the turn drawn right under the line when the next stop down is a turn. */
  const dayLine = (day: EarlierDay, nextTurnId: string | null) => {
    const close = () => {
      reopenNewestIfHidden(day.turns);
      toggleDay(day.key);
    };
    return (
      <EarlierListLine
        key={`earlier-day-${day.key}`}
        kind="day"
        text={dayLineText(day)}
        open={openDays.has(day.key)}
        onToggle={() => (openDays.has(day.key) ? close() : toggleDay(day.key))}
        onClose={close}
        nav={earlierPillNavHandlers(nextTurnId, dayLineNav(day.key))}
      />
    );
  };
  /* A run of day lines in front of a turn: only the last has that turn right under it. */
  const run = (days: EarlierDay[], turnId: string | null) =>
    days.length ? days.map((day, i) => dayLine(day, i === days.length - 1 ? turnId : null)) : null;

  const closeAll = () => {
    reopenNewestIfHidden(turns.slice(0, earlierCount));
    setEarlierExpanded(false);
  };
  const line = hasLine ? (
    <EarlierListLine
      kind="earlier"
      text={`${earlierCount} earlier`}
      open={earlierExpanded}
      onToggle={() => (earlierExpanded ? closeAll() : setEarlierExpanded(true))}
      onClose={closeAll}
      nav={earlierLineNavHandlers(earlierExpanded ? null : turnsToRender[0]?.id ?? afterEarlier)}
    />
  ) : null;

  return {
    line,
    turnsToRender,
    dayLinesBefore: (turnId) => (layout ? run(layout.daysBefore.get(turnId) ?? [], turnId) : null),
    trailingDayLines: layout ? run(layout.trailingDays, afterEarlier) : null,
    navAbove: (turnId) => {
      const days = layout?.daysBefore.get(turnId);
      return days?.length ? dayLineNav(days[days.length - 1]!.key) : null;
    },
    navAboveLive: () => {
      const days = layout?.trailingDays;
      return days?.length ? dayLineNav(days[days.length - 1]!.key) : null;
    },
    dayLineFollows: (nextTurn) =>
      nextTurn ? (layout?.daysBefore.get(nextTurn.id)?.length ?? 0) > 0 : (layout?.trailingDays.length ?? 0) > 0,
  };
}
