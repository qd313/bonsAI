/**
 * Title: Permission-hint row nav registration tests
 * Purpose: Pin that the troubleshooting Ask hint row registers a Steam nav holder when mounted
 *          and clears it when unmounted.
 * Used for: MainTabChatTranscript.tsx — the mount/unmount half of PERM-JUMP-01's redo.
 * Solves: The first fix (a registered button handle plus `focusDeckOwner`) measured wrong on device
 *         2026-09-04 (build 49241e7): the DOM focus moved but Steam's ring did not follow, and the
 *         defensive tabindex stamp corrupted the wrapping Focusable besides. The redo registers each
 *         row's own Focusable as a Steam nav node (`navRef` + `registerNavFocus`) instead — this
 *         file is the coverage that the registration itself happens at the right lifecycle moments;
 *         MainTabChatTranscript.permissionHintFocus.test.ts covers what `focusChatPermissionHintRow`
 *         does with a registered node once one exists.
 * Does not: Prove Steam actually populates the ref on device — that is what the row being a real
 *           Focusable buys, and the Deck check (PERM-JUMP-01) is what confirms it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { TransparencySnapshot } from "../../../types/inputTransparency";
import * as navFocusRegistry from "../../../shared/dpad/navFocusRegistry";

function renderTranscript(overrides: Partial<MainTabChatTranscriptProps> = {}) {
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
    askMode: "speed",
    askThreadCollapsed: [],
    expandedTurnKey: null,
    askThreadDisplayQuestion: "",
    transparencySnapshot: { raw_question: "" } as TransparencySnapshot,
    ...overrides,
  };
  return render(<MainTabChatTranscript {...props} />);
}

afterEach(() => {
  navFocusRegistry.resetNavFocusRegistry();
});

describe("troubleshooting hint row nav registration", () => {
  it("registers a nav holder under chat-perm-hint-troubleshoot on mount and clears it on unmount", () => {
    const spy = vi.spyOn(navFocusRegistry, "registerNavFocus");

    const { unmount } = renderTranscript({
      unifiedInput: "why is my game crashing",
      gameContextReadEnabled: false,
      onNavigateToPermissions: () => {},
    });

    const registerCalls = spy.mock.calls.filter(([id]) => id === "chat-perm-hint-troubleshoot");
    expect(registerCalls.length).toBeGreaterThan(0);
    const [, holder] = registerCalls[registerCalls.length - 1]!;
    expect(holder).not.toBeNull();

    unmount();
    // Assert the outcome, not which function did it: the id no longer resolves to anything, so a
    // hop aimed here reports false and its caller falls through. (Was: assert the last call's
    // second argument was null — the old API's shape, which the identity-checked deregistration
    // of 2026-09-05 replaced.)
    expect(navFocusRegistry.takeNavFocus("chat-perm-hint-troubleshoot")).toBe(false);

    spy.mockRestore();
  });
});
