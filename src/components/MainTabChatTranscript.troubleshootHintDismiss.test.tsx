/**
 * Title: A dismissed troubleshooting hint stays dismissed, for that chat
 * Purpose: Pin that Dismiss on the "Troubleshooting Ask detected" hint survives the panel being
 *          rebuilt (Quick Access closed and reopened) and belongs to the chat it was pressed in.
 * Used for: MainTabChatTranscript.tsx's troubleshooting hint, troubleshootHintDismissals.ts.
 * Solves: Roadmap "A dismissed troubleshooting hint comes back once Quick Access is closed and
 *         reopened" -- the dismissal was plain screen state, lost on every rebuild
 *         (docs/test-evidence/plan70-L6-AFTER-DISMISS.json), and shared by every chat.
 * Does not: Prove the ring's hand-off after Dismiss (handRingOnWhenGone.test.ts does).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetTroubleshootHintDismissalsForTests } from "../utils/troubleshootHintDismissals";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

const HINT = /Troubleshooting Ask detected/;

function props(overrides: Partial<MainTabChatTranscriptProps> = {}): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "why is my game crashing on launch",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: "live",
    askThreadDisplayQuestion: "",
    lastExchange: null,
    gameContextReadEnabled: false,
    onNavigateToPermissions: () => {},
    activeChatSlotId: "chat-a",
    ...overrides,
  };
}

describe("the troubleshooting hint's Dismiss", () => {
  beforeEach(() => resetTroubleshootHintDismissalsForTests());
  afterEach(() => resetTroubleshootHintDismissalsForTests());

  it("stays dismissed after the panel is rebuilt (Quick Access closed and reopened)", () => {
    const first = render(<MainTabChatTranscript {...props()} />);
    expect(screen.queryByText(HINT)).not.toBeNull();
    fireEvent.click(screen.getByText("Dismiss"));
    expect(screen.queryByText(HINT)).toBeNull();
    first.unmount();

    render(<MainTabChatTranscript {...props()} />);
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it("belongs to the chat it was pressed in: another chat still shows the hint", () => {
    const { rerender } = render(<MainTabChatTranscript {...props()} />);
    fireEvent.click(screen.getByText("Dismiss"));
    expect(screen.queryByText(HINT)).toBeNull();

    rerender(<MainTabChatTranscript {...props({ activeChatSlotId: "chat-b" })} />);
    expect(screen.queryByText(HINT)).not.toBeNull();

    rerender(<MainTabChatTranscript {...props()} />);
    expect(screen.queryByText(HINT)).toBeNull();
  });
});
