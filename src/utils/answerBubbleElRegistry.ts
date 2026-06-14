const bubbleByKey = new Map<string, HTMLElement>();

export function registerAnswerBubbleEl(answerKey: string, el: HTMLElement | null): void {
  if (!answerKey) return;
  if (el && document.contains(el)) {
    bubbleByKey.set(answerKey, el);
    return;
  }
  bubbleByKey.delete(answerKey);
}

export function getRegisteredAnswerBubble(answerKey: string): HTMLElement | null {
  const el = bubbleByKey.get(answerKey);
  if (!el) return null;
  if (!document.contains(el)) {
    bubbleByKey.delete(answerKey);
    return null;
  }
  return el;
}

export function resolveFocusedAnswerBubble(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return null;
  if (active.classList.contains("bonsai-chat-ai-bubble")) return active;
  return active.closest(".bonsai-chat-ai-bubble") as HTMLElement | null;
}
