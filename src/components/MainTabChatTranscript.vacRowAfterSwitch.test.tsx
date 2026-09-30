/**
 * Title: The ban-lookup row comes back with its chat after a chat switch
 * Purpose: Pin roadmap "Back in a chat after leaving it, its own ban-lookup reply row is gone"
 *          (plan 74 P74-LOCAL-CMD-CHAT second note, confirmed by plan 76 lane 4).
 * Used for: MainTabChatTranscript.tsx, the "Open Permissions" row under a denied bonsai:vac-check reply.
 * Solves: The row was drawn only from the live reply text. A chat switch blanks that text and draws the
 *         reply from the saved turns, so the row vanished the moment the person came back to its chat.
 * Does not: Cover the [+] spot (MainTabChatTranscript.emptySlotPreview.test.tsx) or the wiring in MainTab.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const DENIED = "**Steam Web API is off for bonsAI.** Enable it in Permissions.";

function renderTranscript(overrides: Partial<MainTabChatTranscriptProps> = {}) {
  const turns: AskThreadCollapsedTurn[] = [
    { id: "t1", question: "bonsai:vac-check", answer: DENIED },
  ];
  const props: MainTabChatTranscriptProps = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: true,
    onOpenDesktopNoteSave: () => {},
    onNavigateToPermissions: () => {},
    askMode: "speed",
    askThreadCollapsed: turns,
    expandedTurnKey: "t1",
    askThreadDisplayQuestion: "",
    transparencySnapshot: { raw_question: "bonsai:vac-check" } as TransparencySnapshot,
    ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

const ROW = ".bonsai-chat-vac-deny-row";

describe("the ban-lookup row after a chat switch", () => {
  it("is drawn again when the chat's newest saved turn is the denied reply and the live text is blank", () => {
    const { container } = renderTranscript();
    expect(container.querySelector(ROW)).not.toBeNull();
    expect(container.textContent).toContain("Open Permissions");
  });

  it("is not drawn when the chat's newest saved turn is some other answer", () => {
    const { container } = renderTranscript({
      askThreadCollapsed: [
        { id: "t1", question: "bonsai:vac-check", answer: DENIED },
        { id: "t2", question: "how do I parry?", answer: "Press the button in time." },
      ],
      expandedTurnKey: "t2",
    });
    expect(container.querySelector(ROW)).toBeNull();
  });

  it("is not drawn when the denied reply is older than a question still waiting for its answer", () => {
    const { container } = renderTranscript({ askThreadDisplayQuestion: "and now?" });
    expect(container.querySelector(ROW)).toBeNull();
  });

  it("is still not drawn on the [+] new-chat spot", () => {
    const { container } = renderTranscript({ showEmptySlotPreview: true });
    expect(container.querySelector(ROW)).toBeNull();
  });
});
