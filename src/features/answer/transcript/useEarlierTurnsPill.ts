/**
 * Title: The "N earlier" line's own open/close state, and which days are open under it
 * Purpose: Own whether the older, finished turns are folded behind the "N earlier" line, and which
 * of the day lines under it are open (plan 79: opening the line shows one line per day, not one row
 * per question).
 * Used for: MainTabChatTranscript, the collapsed-history line at the top of the transcript.
 * Solves: The line and the day lines are real D-pad stops that stay on screen while open, so nothing
 * unmounts under the ring and no focus hand-off is needed any more (the old pill vanished when
 * opened and handed the ring to the first revealed row).
 * It also counts the "Show N more" presses of each open day (a day shows six questions, then six more
 * per press), forgets them whenever the day or the whole list closes, and hands Steam's ring to the
 * first newly shown question once a press has drawn it. It keeps which game button is lit in each open
 * day that mixes games (plan 105; none kept: All), forgotten the same way, and a pick starts the day over
 * at six. And it decides, in this one place, how the list is grouped (plan 105): by day, or flipped by game,
 * which is offered only when the older questions are about two or more games. The drawing (buildEarlierList.tsx)
 * and the Search jump below both read that one answer, so a jump never opens a line that is not drawn. The
 * person's choice is remembered for as long as the plugin runs, across chats and a redrawn Main tab; it is
 * not saved to disk.
 * A jump from the Search tab (plan 90 § 3d) asks this hook, through searchJumpStore.ts, to put the chat on
 * one question: once the chat is loaded it opens "N earlier", opens the day that holds the question,
 * presses "Show N more" as often as needed, and hands the ring to the question's row. It also redraws the
 * transcript when the jump starts or ends, because the "Back to where you were" line follows the store.
 * Does not: Decide how many turns count as "earlier", group them, or draw a line -- the transcript
 * and earlierTurnsByDay.ts do that, using the state this hook hands back.
 * Caution: Lifted out of MainTabChatTranscript on 2026-09-24, called from the exact spot the block
 * occupied — see tests/test_ask_hook_order.py's `hook_sequence` for why that position matters.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AskThreadCollapsedTurn } from "../../../types/bonsaiUi";
import { takeOpenQuestionText } from "./buildTurnHeaderElement";
import { takeHolderFocus } from "../../../shared/dpad/chatTranscriptNavHelpers";
import { locateEarlierTurn, offersGameGrouping, type EarlierGrouping } from "./earlierTurnsByDay";
import type { NavRefHolder } from "../../../shared/dpad/navFocusRegistry";
import { getUiDocument, uiGamepadFocusElement } from "../../../shared/dpad/uiDocument";
import { settleRing } from "../../../shared/dpad/settleRing";
import { getSearchJump, markJumpRevealed, pendingJumpReveal, subscribeSearchJump } from "../../search-tab/searchJumpStore";

export type UseEarlierTurnsPillArgs = {
  /** The finished-turn history. Only its identity (length + first id) matters here. */
  askThreadCollapsed: AskThreadCollapsedTurn[];
  /** A question row's Steam nav node, for putting the ring on a newly shown question. */
  headerNavFor?: (turnId: string) => NavRefHolder;
  /** Whether a live question is drawn after the finished turns (then all of them are "earlier"). */
  showLiveTurn?: boolean;
};

/** How long a jump's request for the ring waits for the question's row to be drawn. */
const RING_WAIT_MS = 3000;

/** Whether Steam's ring is on the question's own row (its text or its Retry included). */
function ringOnTurnRow(turnId: string): boolean {
  const owner = uiGamepadFocusElement();
  const rows = getUiDocument().querySelectorAll(".bonsai-chat-turn-row-header");
  return Boolean(owner && Array.from(rows).some((row) => row.getAttribute("data-bonsai-turn-id") === turnId && row.contains(owner)));
}

export interface EarlierTurnsPill {
  earlierExpanded: boolean;
  /** Closing also closes every day, so the next opening starts from the day lines alone. */
  setEarlierExpanded: (expanded: boolean) => void;
  /** The day keys (earlierTurnsByDay.ts) whose questions are showing. */
  openDays: ReadonlySet<string>;
  /** Open the day if closed, close it if open. */
  toggleDay: (dayKey: string) => void;
  /** How many times "Show N more" has been pressed on each open day. */
  morePresses: ReadonlyMap<string, number>;
  /** "Show N more" pressed on a day: show its next questions and put the ring on `firstNewId`. */
  showMoreOfDay: (dayKey: string, firstNewId: string) => void;
  /** The game button lit in each open day that mixes games (a day not listed: All). */
  dayGames: ReadonlyMap<string, string>;
  /** A game button pressed: light it; the day starts over at six. */
  pickDayGame: (dayKey: string, gameKey: string) => void;
  /** How the list is grouped now: "game" only when the flip is offered and the person picked it. */
  grouping: EarlierGrouping;
  /** Whether Left and Right on the "N earlier" line flip the grouping (two or more games among the older questions). */
  flipOffered: boolean;
  /** Left or Right on the "N earlier" line: the other grouping, every line under it closed, picks and presses forgotten. */
  flipGrouping: () => void;
}

const NO_DAYS: ReadonlySet<string> = new Set();
const NO_PRESSES: ReadonlyMap<string, number> = new Map();
const NO_PICKS: ReadonlyMap<string, string> = new Map();

/* The grouping the person last picked, for as long as the plugin runs: every chat, and the Main tab drawn
   again after a Search jump, opens in it. */
let pickedGrouping: EarlierGrouping = "day";

/** Back to grouping by day, as the plugin starts. For tests, which share this module between cases. */
export function resetEarlierGrouping(): void {
  pickedGrouping = "day";
}

/** `map` without `key`, the same object when it had none. */
function without<V>(map: ReadonlyMap<string, V>, key: string): ReadonlyMap<string, V> {
  if (!map.has(key)) return map;
  const next = new Map(map);
  next.delete(key);
  return next;
}

/**
 * Every hook below must keep its position. React matches hooks by the order they run in.
 */
export function useEarlierTurnsPill(a: UseEarlierTurnsPillArgs): EarlierTurnsPill {
  const { askThreadCollapsed, headerNavFor, showLiveTurn = false } = a;

  const [earlierExpanded, setExpanded] = useState(false);
  const [openDays, setOpenDays] = useState<ReadonlySet<string>>(NO_DAYS);
  const [morePresses, setMorePresses] = useState<ReadonlyMap<string, number>>(NO_PRESSES);
  const [dayGames, setDayGames] = useState<ReadonlyMap<string, string>>(NO_PICKS);
  const [wanted, setWanted] = useState<EarlierGrouping>(() => pickedGrouping);
  /* The one place the grouping in force is decided. The older questions are counted as the transcript counts
     them (MainTabChatTranscript.tsx's `earlierTurns`): all of them under a live question, else all but the newest. */
  const earlierCount = showLiveTurn ? askThreadCollapsed.length : askThreadCollapsed.length - 1;
  const flipOffered = earlierCount >= 2 && offersGameGrouping(askThreadCollapsed, earlierCount);
  const grouping: EarlierGrouping = flipOffered ? wanted : "day";
  /* The question the ring goes to once the press that shows it has been drawn. */
  const ringOnTurn = useRef<string | null>(null);
  /* Redraws when a jump starts, finishes revealing or ends: the Back line and the reveal below follow the store.
     Plain state, not useSyncExternalStore: that one redraws at once, ahead of the other updates the reveal
     makes in the same effect, and the ring would be asked for before the question's row exists. */
  const [jump, setJump] = useState(getSearchJump);
  useEffect(() => {
    setJump(getSearchJump());
    return subscribeSearchJump(() => setJump(getSearchJump()));
  }, []);
  const [, setRingTick] = useState(0);
  const alive = useRef(true);
  /* The question a jump put the ring on, to check the ring stayed there. */
  const jumpRing = useRef<string | null>(null);
  const jumpRingUntil = useRef(0);
  useEffect(() => () => {
    alive.current = false;
  }, []);
  /* A slot switch (or a cleared thread) re-collapses: the line is about this thread, not the user. */
  const earlierIdentity = `${askThreadCollapsed.length}:${askThreadCollapsed[0]?.id ?? ""}`;
  useEffect(() => {
    setExpanded(false);
    setOpenDays(NO_DAYS);
    setMorePresses(NO_PRESSES);
    setDayGames(NO_PICKS);
  }, [earlierIdentity]);

  const setEarlierExpanded = useCallback((expanded: boolean) => {
    setExpanded(expanded);
    if (!expanded) {
      setOpenDays(NO_DAYS);
      setMorePresses(NO_PRESSES);
      setDayGames(NO_PICKS);
    }
  }, []);
  const toggleDay = useCallback((dayKey: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (!next.delete(dayKey)) next.add(dayKey);
      return next;
    });
    /* Opening or closing a day starts it over at six questions, with All lit. */
    setMorePresses((prev) => without(prev, dayKey));
    setDayGames((prev) => without(prev, dayKey));
  }, []);
  const pickDayGame = useCallback((dayKey: string, gameKey: string) => {
    setDayGames((prev) => new Map(prev).set(dayKey, gameKey));
    setMorePresses((prev) => without(prev, dayKey));
  }, []);
  const showMoreOfDay = useCallback((dayKey: string, firstNewId: string) => {
    ringOnTurn.current = firstNewId;
    setMorePresses((prev) => new Map(prev).set(dayKey, (prev.get(dayKey) ?? 0) + 1));
  }, []);
  const flipGrouping = useCallback(() => {
    const next: EarlierGrouping = pickedGrouping === "game" ? "day" : "game";
    pickedGrouping = next;
    setWanted(next);
    setOpenDays(NO_DAYS);
    setMorePresses(NO_PRESSES);
    setDayGames(NO_PICKS);
  }, []);

  /* A jump from the Search tab: once its chat is loaded, show its question and ask for the ring there. This
     runs after the reset above (same hook, later effect), so a chat switch cannot fold it away again. */
  useEffect(() => {
    const want = pendingJumpReveal();
    if (!want || !askThreadCollapsed.some((t) => t.id === want.turnId)) return;
    markJumpRevealed();
    /* The same grouping the list is drawn in: the question's day, or its game line. */
    const place = earlierCount >= 2 ? locateEarlierTurn(askThreadCollapsed, earlierCount, want.turnId, undefined, grouping) : null;
    if (place) {
      setExpanded(true);
      setOpenDays(new Set([place.dayKey]));
      setMorePresses(place.presses > 0 ? new Map([[place.dayKey, place.presses]]) : NO_PRESSES);
      /* The presses were counted with All lit, so a day opens on All. */
      setDayGames(NO_PICKS);
    }
    ringOnTurn.current = want.turnId;
    jumpRing.current = want.turnId;
    jumpRingUntil.current = Date.now() + RING_WAIT_MS;
    setRingTick((n) => n + 1);
  }, [askThreadCollapsed, jump, earlierCount, grouping]);

  /* After the commit that drew the new questions: Steam's own transfer onto the first of them. The
     "Show N more" line is a different container from the question rows, and it may be gone by now. */
  useLayoutEffect(() => {
    const id = ringOnTurn.current;
    if (!id) return;
    const holder = headerNavFor?.(id);
    /* A jump's question may not be drawn in the very commit that asked for the ring (React can split the reveal's
       updates over two): wait for the commit that has its row, for as long as the jump itself would. */
    if (jumpRing.current === id && !holder?.current && Date.now() < jumpRingUntil.current) return;
    ringOnTurn.current = null;
    const forJump = jumpRing.current === id;
    const take = () => {
      /* A jump to the open question lands on its text (never its Retry); every other row on its own nav node. */
      if (forJump && takeOpenQuestionText(id)) return;
      const again = headerNavFor?.(id);
      if (again) takeHolderFocus(again);
    };
    take();
    if (!forJump) return;
    /* The tab has only just been drawn, and Steam's transfer can reach a row before the row can take it: the
       Deck left the ring on the day line above the question (P90-SEARCH-JUMP-BACK). Look again as it settles,
       until the person presses something. */
    jumpRing.current = null;
    settleRing({ take, onTarget: () => ringOnTurnRow(id), alive: () => alive.current });
  });

  return {
    earlierExpanded,
    setEarlierExpanded,
    openDays,
    toggleDay,
    morePresses,
    showMoreOfDay,
    dayGames,
    pickDayGame,
    grouping,
    flipOffered,
    flipGrouping,
  };
}
