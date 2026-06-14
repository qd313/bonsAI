type AnswerBubbleNav = {
  moveDown: () => boolean;
  moveUp: () => boolean;
  resetChunkIndex: () => void;
};

let activeAnswerBubbleNav: AnswerBubbleNav | null = null;

export function registerAnswerBubbleNav(nav: AnswerBubbleNav | null): void {
  activeAnswerBubbleNav = nav;
}

export function invokeAnswerBubbleMoveDown(): boolean {
  return activeAnswerBubbleNav?.moveDown() ?? false;
}

export function invokeAnswerBubbleMoveUp(): boolean {
  return activeAnswerBubbleNav?.moveUp() ?? false;
}

export function resetAnswerBubbleChunkIndex(): void {
  activeAnswerBubbleNav?.resetChunkIndex();
}

export function isAnswerBubbleNavActive(): boolean {
  return activeAnswerBubbleNav != null;
}
