/**
 * Title: The two first-run notices wait for the back end's first-run answer, and clear stale flags
 *
 * Purpose: On a wiped Deck Steam's browser storage still says "already seen". When the back end
 * reports a first run, the gate clears the plugin's own browser flags once, before it decides what
 * to show, so the Beta Notice comes back and then the local-runtime notice after it.
 *
 * Used for: the hook in useDisclaimerAndLocalRuntimeGates.tsx.
 *
 * Solves: a reinstalled plugin showing neither notice.
 *
 * Does not: mount the whole plugin (src/index.firstRunFlags.test.tsx does) or check wording.
 */
import { act, renderHook } from "@testing-library/react";
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

const hooks = (firstRun: boolean | null | undefined, onFirstRunFlagsCleared = vi.fn()) => ({
  onBeforeDeckyModal: vi.fn(),
  onCompleteDeckyModalClose: vi.fn((close: () => void) => close()),
  saveSettingsNow: vi.fn(),
  firstRun,
  onFirstRunFlagsCleared,
});
const betaNotices = () => shown.filter((s) => s.title.includes("Beta Notice"));
const runtimeNotices = () => shown.filter((s) => s.title.includes("Local runtime"));

beforeEach(() => {
  shown.length = 0;
  window.localStorage.clear();
  window.localStorage.setItem("bonsai:disclaimer-accepted", "1");
  window.localStorage.setItem("bonsai:local-runtime-beta-dismissed-v1", "1");
  window.localStorage.setItem("bonsai:plugin-help-dismissed", "1");
  window.localStorage.setItem("bonsai_kb_unavailable_warned", "1");
  window.localStorage.setItem("not-bonsai:other", "keep");
});

describe("first run after a wipe", () => {
  it("waits for the answer: nothing shows and nothing is cleared while it is unknown", () => {
    const cleared = vi.fn();
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks(null, cleared)));
    expect(betaNotices()).toHaveLength(0);
    expect(runtimeNotices()).toHaveLength(0);
    expect(cleared).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("bonsai:disclaimer-accepted")).toBe("1");
  });

  it("on a first run clears the plugin's flags, shows the Beta Notice, then the runtime notice after it", () => {
    const cleared = vi.fn();
    const { rerender } = renderHook(
      ({ firstRun }) => useDisclaimerAndLocalRuntimeGates(true, true, hooks(firstRun, cleared)),
      { initialProps: { firstRun: null as boolean | null } },
    );
    act(() => rerender({ firstRun: true }));

    expect(cleared).toHaveBeenCalledTimes(1);
    expect(betaNotices()).toHaveLength(1);
    expect(runtimeNotices()).toHaveLength(0);
    expect(window.localStorage.getItem("bonsai:disclaimer-accepted")).toBeNull();
    expect(window.localStorage.getItem("bonsai:local-runtime-beta-dismissed-v1")).toBeNull();
    expect(window.localStorage.getItem("bonsai:plugin-help-dismissed")).toBeNull();
    expect(window.localStorage.getItem("bonsai_kb_unavailable_warned")).toBeNull();
    // Only the plugin's own keys go: it must not touch anything else in Steam's storage.
    expect(window.localStorage.getItem("not-bonsai:other")).toBe("keep");

    act(() => betaNotices()[0].onOK());
    expect(runtimeNotices()).toHaveLength(1);
  });

  it("does it once per load, however many times the screen re-renders", () => {
    const cleared = vi.fn();
    const { rerender } = renderHook(
      ({ on }) => useDisclaimerAndLocalRuntimeGates(true, on, hooks(true, cleared)),
      { initialProps: { on: true } },
    );
    act(() => betaNotices()[0].onOK());
    act(() => rerender({ on: false }));
    act(() => rerender({ on: true }));
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(betaNotices()).toHaveLength(1);
    expect(window.localStorage.getItem("bonsai:disclaimer-accepted")).toBe("1");
  });

  it("leaves every flag alone when it is not a first run", () => {
    const cleared = vi.fn();
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, true, hooks(false, cleared)));
    expect(cleared).not.toHaveBeenCalled();
    expect(betaNotices()).toHaveLength(0);
    expect(runtimeNotices()).toHaveLength(0);
    expect(window.localStorage.getItem("bonsai:disclaimer-accepted")).toBe("1");
  });
});
