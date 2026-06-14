import {
  findScrollablePanel,
  panelScrollMax,
  scrollTabContentsByStep,
} from "./chatPanelScroll";
import { debugSessionLog } from "./debugSessionLog";
import { resetAnswerBubbleChunkIndex } from "./answerBubbleNavRegistry";
import {
  getRegisteredAnswerBubble,
  registerAnswerBubbleEl,
  resolveFocusedAnswerBubble,
} from "./answerBubbleElRegistry";

/** Walk turn slots — document.querySelector cannot pierce Decky shadow roots. */
export function findAnswerBubbleByKey(answerKey: string): HTMLElement | null {
  const registered = getRegisteredAnswerBubble(answerKey);
  if (registered) return registered;

  const focused = resolveFocusedAnswerBubble();
  if (focused) {
    const key = focused.querySelector(`[data-bonsai-answer-key="${answerKey}"]`);
    if (key) return focused;
  }

  for (const slot of document.querySelectorAll(".bonsai-chat-turn-slot")) {
    const isLive = answerKey === "live";
    const hasLiveHeader = Boolean(slot.querySelector(".bonsai-chat-turn-row-header--live"));
    const hasTurnMarker = Boolean(slot.querySelector(`[data-bonsai-turn-id="${answerKey}"]`));
    if (isLive ? hasLiveHeader : hasTurnMarker) {
      const bubble = slot.querySelector(".bonsai-chat-ai-bubble") as HTMLElement | null;
      if (bubble) return bubble;
    }
  }
  return null;
}

function focusPanelEl(el: HTMLElement): boolean {
  const panel = (
    el.matches(".Panel.Focusable") ? el : el.closest(".Panel.Focusable")
  ) as HTMLElement | null;
  const target = panel ?? el;
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  if (target.contains(document.activeElement)) return true;
  el.focus({ preventScroll: true });
  return el.contains(document.activeElement);
}

export function focusFirstAnswerChunk(answerKey: string): boolean {
  const el =
    resolveFocusedAnswerBubble() ??
    getRegisteredAnswerBubble(answerKey) ??
    findAnswerBubbleByKey(answerKey);
  if (!el) {
    // #region agent log
    debugSessionLog("answerBubbleNavigation", "focus answer missing", "H11", {
      answerKey,
      runId: "post-fix-14",
    });
    // #endregion
    return false;
  }
  registerAnswerBubbleEl(answerKey, el);
  const focused = focusPanelEl(el);
  // #region agent log
  debugSessionLog("answerBubbleNavigation", "focus answer bubble", "H11", {
    answerKey,
    focused,
    runId: "post-fix-14",
  });
  // #endregion
  return focused;
}

export function resolveAnswerBubbleEl(
  answerKey?: string,
  hint?: HTMLElement | null
): HTMLElement | null {
  if (hint) return hint;
  const fromFocused = resolveFocusedAnswerBubble();
  if (fromFocused) return fromFocused;
  if (answerKey) {
    const registered = getRegisteredAnswerBubble(answerKey);
    if (registered) return registered;
    return findAnswerBubbleByKey(answerKey);
  }
  return null;
}

/** Focus the answer bubble immediately after a turn header (Decky graph may skip it). */
export function focusAnswerBubbleAfterHeader(
  headerEl: HTMLElement | null,
  turnId?: string
): boolean {
  if (headerEl) {
    const turnSlot = headerEl.closest(".bonsai-chat-turn-slot");
    const bubble = turnSlot?.querySelector(".bonsai-chat-ai-bubble") as HTMLElement | null;
    if (bubble) {
      registerAnswerBubbleEl(turnId ?? "", bubble);
      resetAnswerBubbleChunkIndex();
      const focused = focusPanelEl(bubble);
      // #region agent log
      debugSessionLog("answerBubbleNavigation", "focus answer from header slot", "H11", {
        focused,
        answerKey: turnId ?? null,
        runId: "post-fix-14",
      });
      // #endregion
      return focused;
    }
  }
  if (turnId) return focusFirstAnswerChunk(turnId);
  return false;
}

/** Scroll QAM panel down; true only when scrollTop increases. */
export function panelStepDown(bubbleEl: HTMLElement): boolean {
  const scroll = findScrollablePanel(bubbleEl);
  if (!scroll) return false;
  const before = scroll.scrollTop;
  if (scrollTabContentsByStep(bubbleEl, "down")) {
    return scroll.scrollTop > before;
  }
  const max = panelScrollMax(scroll);
  if (before >= max - 2) return false;
  const step = Math.max(80, Math.floor(scroll.clientHeight * 0.35));
  scroll.scrollTop = Math.min(max, before + step);
  return scroll.scrollTop > before;
}

/** Scroll QAM panel up; true only when scrollTop decreases. */
export function panelStepUp(bubbleEl: HTMLElement): boolean {
  const scroll = findScrollablePanel(bubbleEl);
  if (!scroll || scroll.scrollTop <= 0) return false;
  const before = scroll.scrollTop;
  if (scrollTabContentsByStep(bubbleEl, "up")) {
    return scroll.scrollTop < before;
  }
  const step = Math.max(80, Math.floor(scroll.clientHeight * 0.35));
  scroll.scrollTop = Math.max(0, before - step);
  return scroll.scrollTop < before;
}

export function handleAnswerBubbleMoveDown(
  bubbleEl: HTMLElement | null,
  _focusedChunkRef: { current: number },
  chunkTotal: number,
  answerKey?: string
): boolean {
  const bubble = resolveAnswerBubbleEl(answerKey, bubbleEl);
  if (!bubble || chunkTotal <= 0) {
    // #region agent log
    debugSessionLog("answerBubbleNavigation", "answer onMoveDown no bubble", "H10", {
      answerKey,
      chunkTotal,
      hadHint: Boolean(bubbleEl),
      hadRegistry: Boolean(answerKey && getRegisteredAnswerBubble(answerKey)),
      hadFocused: Boolean(resolveFocusedAnswerBubble()),
      runId: "post-fix-14",
    });
    // #endregion
    return false;
  }
  if (answerKey) registerAnswerBubbleEl(answerKey, bubble);

  const scroll = findScrollablePanel(bubble);
  if (!scroll) {
    // #region agent log
    debugSessionLog("answerBubbleNavigation", "answer onMoveDown no scroll parent", "H10", {
      answerKey,
      chunkTotal,
      runId: "post-fix-14",
    });
    // #endregion
    return false;
  }

  const max = panelScrollMax(scroll);
  const before = scroll.scrollTop;

  if (before < max - 2 && panelStepDown(bubble)) {
    // #region agent log
    debugSessionLog("answerBubbleNavigation", "answer onMoveDown panel scroll", "H1", {
      answerKey,
      chunkTotal,
      scrollTopBefore: before,
      scrollTopAfter: scroll.scrollTop,
      scrollMax: max,
      runId: "post-fix-14",
    });
    // #endregion
    return true;
  }

  // #region agent log
  debugSessionLog("answerBubbleNavigation", "answer onMoveDown yield to reply", "H4", {
    answerKey,
    chunkTotal,
    scrollTop: scroll.scrollTop,
    scrollMax: max,
    runId: "post-fix-14",
  });
  // #endregion
  return false;
}

export function handleAnswerBubbleMoveUp(
  bubbleEl: HTMLElement | null,
  _focusedChunkRef: { current: number },
  chunkTotal: number,
  answerKey?: string
): boolean {
  const bubble = resolveAnswerBubbleEl(answerKey, bubbleEl);
  if (!bubble || chunkTotal <= 0) return false;

  const scroll = findScrollablePanel(bubble);
  if (!scroll || scroll.scrollTop <= 0) return false;

  const before = scroll.scrollTop;
  if (panelStepUp(bubble)) {
    // #region agent log
    debugSessionLog("answerBubbleNavigation", "answer onMoveUp panel scroll", "H1", {
      answerKey,
      chunkTotal,
      scrollTopBefore: before,
      scrollTopAfter: scroll.scrollTop,
      runId: "post-fix-14",
    });
    // #endregion
    return true;
  }

  return false;
}
