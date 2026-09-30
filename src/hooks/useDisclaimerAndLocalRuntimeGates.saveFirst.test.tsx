/**
 * Turning "Run AI on this Deck" on opens the one-time "Local runtime (beta)" notice, and the notice
 * closes Quick Access at once. The switch's new value used to wait 400 ms for the automatic save,
 * so it never reached disk (Deck 2026-09-30: panel ON, settings.json still false). The gate now
 * asks for an immediate save before it opens the notice.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDisclaimerAndLocalRuntimeGates } from "./useDisclaimerAndLocalRuntimeGates";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return { ...stubs, showModal: () => ({ Close: () => {} }) };
});

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("bonsai:disclaimer-accepted", "1");
});

describe("local runtime notice saves the switch first", () => {
  it("saves settings before the notice opens and Quick Access closes", () => {
    const order: string[] = [];
    const hooks = {
      onBeforeDeckyModal: vi.fn(() => order.push("capture")),
      onCompleteDeckyModalClose: vi.fn((close: () => void) => close()),
      saveSettingsNow: vi.fn(() => order.push("save")),
    };
    const { rerender } = renderHook(
      ({ on }) => useDisclaimerAndLocalRuntimeGates(true, on, hooks),
      { initialProps: { on: false } },
    );
    expect(hooks.saveSettingsNow).not.toHaveBeenCalled();

    act(() => rerender({ on: true }));

    expect(hooks.saveSettingsNow).toHaveBeenCalledTimes(1);
    expect(order.indexOf("save")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("save")).toBeLessThan(order.indexOf("capture"));
  });
});
