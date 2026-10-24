/**
 * Title: Down from the question onto Show reasoning while the panel's page has lost the browser's focus (plan 97, L14)
 * Purpose: Pin the second dead press of plan 97 block B (workshop:test-evidence/plan97-P97-B-FREEZE-2.json, 07:56:36):
 *          with the page's focus gone, Down from the question's text moved the page's focus to "Show reasoning"
 *          while Steam's ring stayed on the question. The real question row and the real Show reasoning line are
 *          drawn inside a page in that state (lostFocusPanel.tsx), and Down is pressed the way Steam calls it.
 * Used for: buildReasoningFoldElement.tsx (the line's own nav node) and buildTurnHeaderElement.tsx (the Down).
 * Solves: The line had no nav node, so the only way onto it was a plain focus(), which a page without focus never
 *         reports to Steam. With its own node, focusRegisteredReplyStop hands it the ring by Steam's transfer.
 * Does not: Walk on into the answer (answerBubbleNavigation.ts is stubbed): the answer's own entry is a transfer
 *           already. The Deck row is P97-L14-FREEZE.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { mountPanelPage, type PanelPage } from "../../../test-harness/lostFocusPanel";
import { resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { withPanelNav } = await import("../../../test-harness/lostFocusPanel");
  return { ...stubs, Focusable: withPanelNav(stubs.Focusable), Button: withPanelNav(stubs.Button) };
});
vi.mock("../bubble/answerBubbleNavigation", () => ({ focusFirstAnswerChunk: vi.fn(() => false) }));

import { buildTurnHeaderElement } from "../transcript/buildTurnHeaderElement";
import { buildReasoningFoldRow } from "./buildReasoningFoldElement";

let page: PanelPage;

function Turn() {
  return (
    <div className="bonsai-chat-turn-slot">
      {buildTurnHeaderElement({
        turnId: "turn-1",
        title: "what is a good first build",
        expanded: true,
        variant: "live",
        onActivate: () => {},
        onRetry: () => {},
      })}
      {buildReasoningFoldRow({
        turnId: "turn-1",
        open: false,
        seconds: 12,
        onToggle: () => {},
        onMoveUp: () => true,
        onMoveDown: () => true,
      })}
    </div>
  );
}

function mount() {
  render(<Turn />, { container: page.host });
  /* Decky stamps tabindex on the nodes Steam navigates; the stub does not. */
  const question = page.host.querySelector<HTMLElement>(".bonsai-chat-turn-row-body")!;
  const line = page.host.querySelector<HTMLElement>(".bonsai-chat-reasoning-fold")!;
  question.setAttribute("tabindex", "0");
  line.setAttribute("tabindex", "0");
  return { question, line };
}

beforeEach(() => {
  resetNavFocusRegistry();
  page = mountPanelPage();
});
afterEach(() => {
  cleanup();
  page.remove();
  document.body.innerHTML = "";
});

describe("P97-L14-FREEZE: Down from the question lands on Show reasoning with the page's focus gone", () => {
  it("moves the ring onto the line by Steam's transfer, the page's focus with it", () => {
    const { question, line } = mount();
    act(() => page.steamMove(question));
    page.setFocused(false);

    let out = "";
    act(() => {
      out = page.press("onMoveDown");
    });

    expect(out).toBe("claimed");
    expect(page.ring()).toBe(line);
    expect(page.active()).toBe(line);
    expect(page.transfers).toContain(line);
  });

  it("does the same with the page's focus present", () => {
    const { question, line } = mount();
    act(() => page.steamMove(question));

    act(() => {
      page.press("onMoveDown");
    });

    expect(page.ring()).toBe(line);
    expect(page.active()).toBe(line);
  });
});
