/**
 * Title: The first-time setup popup on the first open
 *
 * Purpose: A person who has never seen the popup gets it once (plan 105, lane D3: one popup in place of the Beta
 * Notice box and the old "Where should the AI run?" popup), whatever the switch says, and the popup is handed the
 * real setting. Opening it marks both old flags seen. Nothing shows before the settings have loaded, to a person who
 * has already seen it, or when the screen does not hand the gate the settings the popup needs. No Steam notice box of
 * any kind opens (no Beta Notice, no Local runtime notice). After Clear all data it is shown again.
 *
 * Used for: the hook in useDisclaimerAndLocalRuntimeGates.tsx.
 *
 * Solves: a new player silently running the AI on the Deck without ever being asked, or clicking through two boxes
 * before the one that matters.
 *
 * Does not: check the popup's words or walk its buttons (FirstRunWhereAiRunsModal's own tests do).
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDisclaimerAndLocalRuntimeGates } from "./useDisclaimerAndLocalRuntimeGates";
import { gateHooks, popups, shown, resetShown } from "./firstRunGateTestKit";

vi.mock("@decky/ui", async () => (await import("./firstRunGateTestKit")).deckyUiRecordingModals());

const noticeBoxes = () => shown.filter((s) => s.title !== "");

beforeEach(() => {
  resetShown();
  window.localStorage.clear();
});

describe("the first-time setup popup on the first open", () => {
  it("shows once on a first open with no other box, marks both old flags seen, and not again on the next open", () => {
    const first = renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks()));
    expect(popups()).toHaveLength(1);
    expect(noticeBoxes()).toHaveLength(0);
    expect(window.localStorage.getItem("bonsai:disclaimer-accepted")).toBe("1");
    expect(window.localStorage.getItem("bonsai:first-run-where-ai-runs-seen-v1")).toBe("1");
    first.unmount();

    shown.length = 0;
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks()));
    expect(popups()).toHaveLength(0);
  });

  it("shows to an older install that accepted the old Beta Notice but never saw the popup", () => {
    window.localStorage.setItem("bonsai:disclaimer-accepted", "1");
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks()));
    expect(popups()).toHaveLength(1);
  });

  it("is asked when the saved switch is off too, and hands the popup the real setting", () => {
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, false, gateHooks()));
    expect(popups()).toHaveLength(1);
    expect(popups()[0].host?.ollamaLocalOnDeck).toBe(false);
  });

  it("waits for the settings to load, and for the screen to hand over the settings it shows", () => {
    renderHook(() => useDisclaimerAndLocalRuntimeGates(false, true, gateHooks()));
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks({ whereAiRuns: undefined })));
    expect(popups()).toHaveLength(0);
  });

  it("does not show to a person who has already seen it", () => {
    window.localStorage.setItem("bonsai:first-run-where-ai-runs-seen-v1", "1");
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks()));
    expect(popups()).toHaveLength(0);
    expect(noticeBoxes()).toHaveLength(0);
  });

  it("after Clear all data it shows again, once", () => {
    const { result } = renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks()));
    expect(popups()).toHaveLength(1);
    // What the reset does: the flags go, the "opened" note is cleared, then the replay is asked for.
    window.localStorage.clear();
    result.current.localRuntimeBetaPromptIssuedRef.current = false;
    act(() => result.current.showDisclaimerModalAgain());
    expect(popups()).toHaveLength(2);
    expect(noticeBoxes()).toHaveLength(0);
  });
});
