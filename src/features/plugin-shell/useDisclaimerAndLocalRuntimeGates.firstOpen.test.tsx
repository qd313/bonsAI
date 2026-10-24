/**
 * Title: The "Where should the AI run?" popup on the first open
 *
 * Purpose: After the Beta Notice has been accepted, a person who has never seen the popup is asked
 * where the AI should run, once, whatever the switch says (it starts on; a saved "off" is asked too, and
 * the popup shows the real setting). Nothing shows before the settings have loaded, to a person who
 * has already seen it, or when the screen does not hand the gate the settings the popup needs. The old
 * "Local runtime (beta)" notice is gone and never shows.
 *
 * Used for: the hook in useDisclaimerAndLocalRuntimeGates.tsx (plan 96, N1).
 *
 * Solves: a new player silently running the AI on the Deck without ever being asked.
 *
 * Does not: check the popup's words or walk its buttons (FirstRunWhereAiRunsModal's own tests do).
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDisclaimerAndLocalRuntimeGates } from "./useDisclaimerAndLocalRuntimeGates";
import { gateHooks, popups, runtimeNotices, shown, resetShown } from "./firstRunGateTestKit";

vi.mock("@decky/ui", async () => (await import("./firstRunGateTestKit")).deckyUiRecordingModals());

beforeEach(() => {
  resetShown();
  window.localStorage.clear();
  window.localStorage.setItem("bonsai:disclaimer-accepted", "1");
});

describe("the where-the-AI-runs popup on the first open", () => {
  it("shows once on a first open, and not again on the next open", () => {
    const first = renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks()));
    expect(popups()).toHaveLength(1);
    first.unmount();

    shown.length = 0;
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks()));
    expect(popups()).toHaveLength(0);
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
  });

  it("never shows the old Local runtime (beta) notice, flag set or not", () => {
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks()));
    window.localStorage.removeItem("bonsai:first-run-where-ai-runs-seen-v1");
    window.localStorage.removeItem("bonsai:local-runtime-beta-dismissed-v1");
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, gateHooks()));
    expect(runtimeNotices()).toHaveLength(0);
  });
});
