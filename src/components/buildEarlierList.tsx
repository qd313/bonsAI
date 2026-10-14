/**
 * Title: What the "N earlier" part of a long chat puts on screen
 * Purpose: Decide, for the transcript, the "N earlier" line, the day lines under it once it is open,
 * which older questions are drawn as rows, and what A and B do on each line.
 * Used for: MainTabChatTranscript.tsx, in front of and between the turn rows.
 * Solves: The transcript file is far past its size limit. This keeps the whole earlier-list decision
 * in one place, so the transcript only draws what it is handed.
 * Does not: Draw a turn row, group questions by day (earlierTurnsByDay.ts does), or decide where the
 * ring goes on a press (chatTranscriptNavHelpers.ts does; this only passes the next turn's id in).
 * It also draws the "Back to where you were" line above "N earlier" while a jump from the Search tab is live
 * (searchJumpStore.ts; plan 90 § 3d), and wires the stops around it: Down from it to "N earlier", Up from
 * "N earlier" to it.
 * Caution: Closing a day, or the whole list, while the open question is inside it hides that
 * question. The newest answer then opens again (`onTurnActivate` toggles to it) instead of leaving
 * every row closed with nothing open.
 */
import type { ReactElement } from "react";
import type { NavRefHolder } from "../utils/navFocusRegistry";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import { dayLineText, layoutEarlierByDay, moreLineText, type EarlierDay, type EarlierMore } from "../utils/earlierTurnsByDay";
import {
  dayLineNav,
  earlierLineNavHandlers,
  earlierPillNav,
  earlierPillNavHandlers,
  moreLineNav,
  takeHolderFocus,
} from "../utils/chatTranscriptNavHelpers";
import { takeOpenQuestionText } from "../utils/buildTurnHeaderElement";
import { isUpDeckButtonEvent } from "../utils/focusNavigation";
import { SearchBackLine, backLineNavHandlers } from "../features/search-tab/SearchBackLine";
import { backLineShowsFor, backToSearch, searchBackNav } from "../features/search-tab/searchJumpStore";
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
  /** How many times "Show N more" has been pressed on each open day (none: six questions each). */
  morePresses?: ReadonlyMap<string, number>;
  /** "Show N more" pressed: show the day's next questions, ring to the first of them. */
  showMoreOfDay?: (dayKey: string, firstNewId: string) => void;
  expandedTurnKey: string | null;
  onTurnActivate?: (key: string | "live") => void;
  /** Whether the "Back to where you were" line shows; when left out, whether a live jump points into these turns. */
  backLine?: boolean;
};

export type EarlierList = {
  /**
   * The "Back to where you were" line (while a jump from the Search tab is live) and the "N earlier" line (when
   * there are two or more earlier turns); null when neither shows.
   */
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
  /** The "Show N more" line to draw right under the row for `turnId`, if that row ends an open day with more. */
  moreLinesAfter: (turnId: string) => ReactElement[] | null;
  /** Whether a line (a day line, or this row's own "Show N more") is the next stop below the row for `turn`, whose next row is `nextTurn` (undefined: below the last row). */
  lineFollows: (turn: AskThreadCollapsedTurn, nextTurn: AskThreadCollapsedTurn | undefined) => boolean;
  /** Up from the closed row for `turnId` when the Back line is the stop right above it (a short chat, no "N earlier" line): the transfer onto the Back line; else undefined. */
  firstRowMoveUp: (turnId: string) => (() => boolean) | undefined;
  /**
   * Down out of the open turn `turn` (whose next row is `nextTurn`) onto what is drawn right under it: its own
   * "Show N more" line, else the first day line before the next row (or after the last row), else the next
   * question (its text when it has Retry, so the ring skips Retry, else its row through `headerNavOf`), else the
   * live one. False when nothing is (the newest turn), so the press goes on to the dock.
   * Plan 93 (plan93-P93-O4-MIRROR.json): an opened older answer's Down went straight to the dock past the
   * "Today" line and the newer question that Up stopped on.
   */
  downBelowRow: (
    turn: AskThreadCollapsedTurn,
    nextTurn: AskThreadCollapsedTurn | undefined,
    headerNavOf: (turnId: string) => NavRefHolder,
  ) => boolean;
};

/**
 * Work out the earlier list for one render: with the line closed only the turns after the earlier ones
 * show; opened, the day lines show with the questions of the open days. Each line carries its own nav
 * node, so a question's Up (questionMoveUpOut) can hand the ring to exactly the line over it.
 */
export function buildEarlierList(a: BuildEarlierListArgs): EarlierList {
  const { turns, earlierCount, showLiveTurn, earlierExpanded, setEarlierExpanded, openDays, toggleDay } = a;
  const hasLine = earlierCount >= 2;
  const layout =
    hasLine && earlierExpanded
      ? layoutEarlierByDay({ turns, earlierCount, openDays, morePresses: a.morePresses })
      : null;
  const turnsToRender = layout ? layout.shown : hasLine ? turns.slice(earlierCount) : turns;
  const afterEarlier = showLiveTurn ? "live" : null;
  const backLive = a.backLine ?? backLineShowsFor(turns);
  /* With no "N earlier" line, the Back line is drawn right over the first row. */
  const backIsAbove = (turnId: string): boolean => backLive && !hasLine && turnId === turnsToRender[0]?.id;

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

  /* The "Show N more" line under an open day's last shown question. Down from it goes where Down
     from that question would have gone: the day line below it, or else the next question. */
  const moreLine = (more: EarlierMore, nextTurnId: string | null) => (
    <EarlierListLine
      key={`earlier-more-${more.day.key}`}
      kind="more"
      text={moreLineText(more.add)}
      onToggle={() => a.showMoreOfDay?.(more.day.key, more.firstNewId)}
      nav={earlierPillNavHandlers(nextTurnId, moreLineNav(more.day.key))}
    />
  );
  const moreAfter = (turnId: string) => layout?.moreAfter.get(turnId);
  const rowAfter = (turnId: string) => turnsToRender[turnsToRender.findIndex((t) => t.id === turnId) + 1];
  /* The nav node of the "Show N more" line drawn right over the row for `turnId`, if there is one. */
  const moreNavAbove = (turnId: string): NavRefHolder | null => {
    const at = turnsToRender.findIndex((t) => t.id === turnId);
    const more = at > 0 ? moreAfter(turnsToRender[at - 1]!.id) : undefined;
    return more ? moreLineNav(more.day.key) : null;
  };

  const closeAll = () => {
    reopenNewestIfHidden(turns.slice(0, earlierCount));
    setEarlierExpanded(false);
  };
  /* Up from "N earlier" is the stop above the chat, unless the Back line is drawn over it. */
  const earlierNav = (): Record<string, unknown> => {
    const base = earlierLineNavHandlers(earlierExpanded ? null : turnsToRender[0]?.id ?? afterEarlier);
    if (!backLive) return base;
    const upToBack = () => takeHolderFocus(searchBackNav);
    return {
      ...base,
      onMoveUp: upToBack,
      onButtonDown: (button: unknown) => (isUpDeckButtonEvent(button) ? upToBack() : (base.onButtonDown as (b: unknown) => boolean)(button)),
    };
  };
  const earlierLine = hasLine ? (
    <EarlierListLine
      kind="earlier"
      text={`${earlierCount} earlier`}
      open={earlierExpanded}
      onToggle={() => (earlierExpanded ? closeAll() : setEarlierExpanded(true))}
      onClose={closeAll}
      nav={earlierNav()}
    />
  ) : null;
  const firstTurnId = turnsToRender[0]?.id;
  const backLine = backLive ? (
    <SearchBackLine
      onBack={() => void backToSearch()}
      nav={backLineNavHandlers(hasLine ? () => takeHolderFocus(earlierPillNav) : () => (firstTurnId ? takeOpenQuestionText(firstTurnId) : false))}
    />
  ) : null;
  /* One Fragment whether or not the Back line is there, so the "N earlier" line keeps its place and is not remounted. */
  const line = backLine || earlierLine ? (
    <>
      {backLine}
      {earlierLine}
    </>
  ) : null;

  return {
    line,
    turnsToRender,
    dayLinesBefore: (turnId) => (layout ? run(layout.daysBefore.get(turnId) ?? [], turnId) : null),
    trailingDayLines: layout ? run(layout.trailingDays, afterEarlier) : null,
    moreLinesAfter: (turnId) => {
      const more = moreAfter(turnId);
      if (!more) return null;
      const next = rowAfter(turnId);
      const dayLineBelow = next ? (layout?.daysBefore.get(next.id)?.length ?? 0) > 0 : (layout?.trailingDays.length ?? 0) > 0;
      return [moreLine(more, dayLineBelow ? null : next?.id ?? afterEarlier)];
    },
    navAbove: (turnId) => {
      const days = layout?.daysBefore.get(turnId);
      return days?.length ? dayLineNav(days[days.length - 1]!.key) : moreNavAbove(turnId) ?? (backIsAbove(turnId) ? searchBackNav : null);
    },
    firstRowMoveUp: (turnId) => (backIsAbove(turnId) ? () => takeHolderFocus(searchBackNav) : undefined),
    navAboveLive: () => {
      const days = layout?.trailingDays;
      if (days?.length) return dayLineNav(days[days.length - 1]!.key);
      const last = turnsToRender[turnsToRender.length - 1];
      const more = last ? moreAfter(last.id) : undefined;
      return more ? moreLineNav(more.day.key) : null;
    },
    lineFollows: (turn, nextTurn) =>
      moreAfter(turn.id) !== undefined ||
      (nextTurn ? (layout?.daysBefore.get(nextTurn.id)?.length ?? 0) > 0 : (layout?.trailingDays.length ?? 0) > 0),
    downBelowRow: (turn, nextTurn, headerNavOf) => {
      const more = moreAfter(turn.id);
      const days = nextTurn ? layout?.daysBefore.get(nextTurn.id) : layout?.trailingDays;
      const line = more ? moreLineNav(more.day.key) : days?.length ? dayLineNav(days[0]!.key) : null;
      if (line) return takeHolderFocus(line);
      const next = nextTurn?.id ?? afterEarlier;
      return next ? takeOpenQuestionText(next) || takeHolderFocus(headerNavOf(next)) : false;
    },
  };
}
