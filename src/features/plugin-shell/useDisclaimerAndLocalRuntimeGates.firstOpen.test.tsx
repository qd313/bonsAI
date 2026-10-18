/**
 * Title: The Local runtime (beta) notice on the first open, now that the switch starts on
 *
 * Purpose: "Run AI on this Deck" is on from the start (plan 93), so a fresh install never flips
 * the switch and the old trigger (a flip from off to on) never fired. The notice now also shows
 * once on the first look at the loaded settings when the switch is on and it has not been seen.
 *
 * Used for: the hook in useDisclaimerAndLocalRuntimeGates.tsx.
 *
 * Solves: a fresh install silently running the AI on the Deck without the one-time warning.
 *
 * Does not: check the notice's words (the wording tests do).
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDisclaimerAndLocalRuntimeGates } from "./useDisclaimerAndLocalRuntimeGates";

const shown: Array<{ title: string; onOK: () => void }> = [];

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: { props: { strTitle: string; onOK: () => void } }) => {
      shown.push({ title: el.props.strTitle, onOK: el.props.onOK });
      return { Close: () => {} };
    },
  };
});

const hooks = () => ({
  onBeforeDeckyModal: vi.fn(),
  onCompleteDeckyModalClose: vi.fn((close: () => void) => close()),
  saveSettingsNow: vi.fn(),
});
const runtimeNotices = () => shown.filter((s) => s.title.includes("Local runtime"));

beforeEach(() => {
  shown.length = 0;
  window.localStorage.clear();
  window.localStorage.setItem("bonsai:disclaimer-accepted", "1");
});

describe("Local runtime (beta) notice on the first open", () => {
  it("shows once on a fresh install whose switch starts on, and not again on the next open", () => {
    const first = renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks()));
    expect(runtimeNotices()).toHaveLength(1);
    runtimeNotices()[0].onOK();
    first.unmount();

    shown.length = 0;
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks()));
    expect(runtimeNotices()).toHaveLength(0);
  });

  it("does not show when the switch is off, or before the settings have loaded", () => {
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, false, hooks()));
    renderHook(() => useDisclaimerAndLocalRuntimeGates(false, true, hooks()));
    expect(runtimeNotices()).toHaveLength(0);
  });

  it("does not show to a person who has already seen it", () => {
    window.localStorage.setItem("bonsai:local-runtime-beta-dismissed-v1", "1");
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks()));
    expect(runtimeNotices()).toHaveLength(0);
  });
});
