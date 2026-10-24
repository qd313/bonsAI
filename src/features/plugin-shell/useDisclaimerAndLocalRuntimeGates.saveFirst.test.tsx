/**
 * Title: The where-the-AI-runs popup saves waiting settings before it opens
 *
 * Purpose: Opening the popup closes Quick Access at once, and that throws away the automatic save still
 * waiting on its 400 ms timer: a setting changed a moment before (the Deck found the Run AI switch
 * unsaved, 2026-09-30, with the notice this popup replaced) would never reach disk. The gate asks for an
 * immediate save before it opens the popup, and captures the screen after that, not before.
 *
 * Used for: the hook in useDisclaimerAndLocalRuntimeGates.tsx.
 *
 * Solves: a change lost to the popup that opens on top of it.
 *
 * Does not: check what the popup does with the switches it shows (its own tests do).
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDisclaimerAndLocalRuntimeGates } from "./useDisclaimerAndLocalRuntimeGates";
import { gateHooks, popups, resetShown } from "./firstRunGateTestKit";

vi.mock("@decky/ui", async () => (await import("./firstRunGateTestKit")).deckyUiRecordingModals());

beforeEach(() => {
  resetShown();
  window.localStorage.clear();
  window.localStorage.setItem("bonsai:disclaimer-accepted", "1");
});

describe("the popup saves what is waiting first", () => {
  it("asks for an immediate save, with no patch, before the popup opens and the screen is captured", () => {
    const order: string[] = [];
    const hooks = gateHooks({
      onBeforeDeckyModal: vi.fn(() => order.push("capture")),
      saveSettingsNow: vi.fn(() => order.push("save")),
    });
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks));

    expect(popups()).toHaveLength(1);
    expect(hooks.saveSettingsNow).toHaveBeenCalledTimes(1);
    expect(hooks.saveSettingsNow).toHaveBeenCalledWith();
    expect(order.indexOf("save")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("save")).toBeLessThan(order.indexOf("capture"));
  });
});
