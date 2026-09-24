/**
 * Title: Permission-hint row nav registration tests
 * Purpose: Pin that the vac-check deny row (and the troubleshooting Ask hint row) register a Steam
 *          nav holder when mounted and clear it when unmounted.
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

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

import { MainTabChatTranscript } from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import * as navFocusRegistry from "../utils/navFocusRegistry";

const VAC_DENY_RESPONSE =
  "**Steam Web API is off for bonsAI.** Enable Permissions → Steam ban lookup to use this command.";

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

describe("vac-check deny row nav registration", () => {
  it("registers a nav holder under chat-perm-hint-deny on mount and clears it on unmount", () => {
    const spy = vi.spyOn(navFocusRegistry, "registerNavFocus");

    const { unmount } = renderTranscript({
      ollamaResponse: VAC_DENY_RESPONSE,
      onNavigateToPermissions: () => {},
    });

    const registerCalls = spy.mock.calls.filter(([id]) => id === "chat-perm-hint-deny");
    expect(registerCalls.length).toBeGreaterThan(0);
    const [, holder] = registerCalls[registerCalls.length - 1]!;
    expect(holder).not.toBeNull();

    // Steam populates the holder's `.current` once the Focusable is navigable — simulate that,
    // then confirm the transfer function reads straight through the registered handle.
    (holder as { current: unknown }).current = { TakeFocus: vi.fn(() => true) };
    expect(navFocusRegistry.takeNavFocus("chat-perm-hint-deny")).toBe(true);

    unmount();
    // Assert the outcome, not which function did it: the id no longer resolves to anything, so a
    // hop aimed here reports false and its caller falls through. (Was: assert the last call's
    // second argument was null — the old API's shape, which the identity-checked deregistration
    // of 2026-09-05 replaced.)
    expect(navFocusRegistry.takeNavFocus("chat-perm-hint-deny")).toBe(false);

    spy.mockRestore();
  });

  it("does not register a nav holder for the deny row when the reply is not a capability deny", () => {
    const spy = vi.spyOn(navFocusRegistry, "registerNavFocus");

    renderTranscript({ ollamaResponse: "The Tank is weak against fire.", onNavigateToPermissions: () => {} });

    // The effect that registers the ref runs regardless of whether the row is visible this render
    // (see the comment on the two useEffects in MainTabChatTranscript.tsx) — what must NOT happen is
    // takeNavFocus finding a live node when the row was never on screen to receive one from Steam.
    expect(navFocusRegistry.takeNavFocus("chat-perm-hint-deny")).toBe(false);

    spy.mockRestore();
  });
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
