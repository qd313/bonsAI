/**
 * Title: Thinking notice gate tests
 * Purpose: Pin the one-time popup that guards moving the Thinking row off Off: it shows only on
 *          Off -> anything, with no stored flag; "Show thinking" applies the level and remembers
 *          it was seen; "Keep it off" applies nothing and the popup comes back next time; any
 *          other move (Brief/Balanced/Deep between each other) never prompts at all; the D-pad
 *          ring is handed to the real modal return-focus registry rather than a direct element
 *          reference; and the level chosen survives Decky's remount, not just the moment "Show
 *          thinking" is pressed.
 * Used for: plan 57 step 2 (lane B) and the 2026-09-17 device fix (docs/test-evidence/
 *           plan57-REASONING-07.json) for two bugs found on the Deck: the ring landing on the tab
 *           strip instead of the row after either button, and Thinking silently reading Off again
 *           after the first "Show thinking" accept.
 * Solves: Nothing pinned that the popup only fires on the one direction that matters, that the
 *         level is genuinely held back until a button is pressed, that the accepted flag actually
 *         silences it afterward, that the return-focus id is remembered and an owner can be found
 *         through the real registry once the popup closes, or that the accepted level is still
 *         there once the pending session snapshot Decky's remount restores from has been read back
 *         -- the actual shape of the bug, not just whether the setter was called.
 * Does not: Render a live Decky modal -- the test harness's `showModal` stub discards its
 *           argument (src/test-harness/fakeDeckyUi.tsx), so this file locally overrides
 *           `showModal` to capture the element and calls its `onOK`/`onCancel` props directly,
 *           the same technique `SessionContextStrip.clearButton.test.tsx` uses. Does not exercise
 *           Steam's own gamepad ring -- jsdom has none, so the return-focus tests only prove
 *           `focus()` was called on the registered owner, the same limit every other
 *           modalReturnFocusRegistry test lives with. `onBeforeDeckyModal` here is a faithful
 *           stand-in for `captureSessionBeforeModal` -- it calls the real
 *           `captureBonsaiSessionForModal`, the same function the shell calls, rather than a
 *           mock that skips the snapshot machinery the bug actually lives in.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useThinkingNoticeGate } from "./useThinkingNoticeGate";
import { THINKING_NOTICE_STORAGE_KEY } from "./useDisclaimerAndLocalRuntimeGates";
import type { AskThinkEffortId } from "../data/askThinkEffort";
import type { BonsaiSettingsSnapshotInput } from "../data/bonsaiSettingsSchema";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  type BonsaiSessionSurvivalSnapshot,
} from "../utils/bonsaiSessionSurvival";
import {
  peekModalReturnFocus,
  registerModalReturnFocusOwner,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

const hoisted = vi.hoisted(() => ({
  modal: null as { props: Record<string, unknown> } | null,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    // The real `showModal` opens a portal; the global stub discards its argument entirely.
    // Neither lets a test reach the confirm box's own onOK/onCancel -- capture the element
    // instead, same technique SessionContextStrip.clearButton.test.tsx uses.
    showModal: (content: unknown) => {
      hoisted.modal = content as { props: Record<string, unknown> };
      return { Close: () => {} };
    },
  };
});

/**
 * The session snapshot Decky's remount restores settings from, seeded the way
 * `captureSessionBeforeModal` really builds it -- Thinking still at `off`, since the snapshot is
 * always taken before the popup has been answered. Only `settingsSnapshot` is read on the path
 * under test; the rest of the shape is opaque here, same reasoning
 * `useRoutingOrderModal.test.tsx` uses for its own pending-session fixture.
 */
function pendingSessionWithThinkingOff(): BonsaiSessionSurvivalSnapshot {
  return {
    currentTab: "ollama",
    settingsSnapshot: {
      askThinkEffort: "off",
    } as unknown as BonsaiSettingsSnapshotInput,
  } as unknown as BonsaiSessionSurvivalSnapshot;
}

function setupGate(initial: AskThinkEffortId) {
  const setAskThinkEffort = vi.fn();
  // Stands in for `captureSessionBeforeModal`: captures the same kind of stale pre-answer
  // snapshot the real one does, through the real survival module rather than a mock that skips
  // the machinery bug (b) lives in.
  const onBeforeDeckyModal = vi.fn(() => captureBonsaiSessionForModal(pendingSessionWithThinkingOff()));
  const onCompleteDeckyModalClose = vi.fn((close: () => void) => close());
  const { result } = renderHook(() =>
    useThinkingNoticeGate(initial, setAskThinkEffort, {
      onBeforeDeckyModal,
      onCompleteDeckyModalClose,
    })
  );
  return { result, setAskThinkEffort, onBeforeDeckyModal, onCompleteDeckyModalClose };
}

beforeEach(() => {
  hoisted.modal = null;
  window.localStorage.clear();
  document.body.innerHTML = "";
  resetModalReturnFocusRegistry();
  clearBonsaiSessionSurvival();
});

describe("useThinkingNoticeGate -- Off -> anything, no flag stored", () => {
  it("shows the notice and applies nothing until a button is pressed", () => {
    const { result, setAskThinkEffort, onBeforeDeckyModal } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("medium"));

    expect(onBeforeDeckyModal).toHaveBeenCalledTimes(1);
    expect(hoisted.modal).not.toBeNull();
    expect(hoisted.modal?.props.strDescription).toBe(
      "Thinking shows on screen as it happens and is not checked for spoilers. Show it?"
    );
    expect(hoisted.modal?.props.strOKButtonText).toBe("Show thinking");
    expect(hoisted.modal?.props.strCancelButtonText).toBe("Keep it off");
    expect(setAskThinkEffort).not.toHaveBeenCalled();
  });

  it("Show thinking applies the level and stores the flag", () => {
    const { result, setAskThinkEffort, onCompleteDeckyModalClose } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("medium"));
    const onOK = hoisted.modal?.props.onOK as () => void;
    act(() => onOK());

    expect(setAskThinkEffort).toHaveBeenCalledWith("medium");
    expect(window.localStorage.getItem(THINKING_NOTICE_STORAGE_KEY)).toBe("1");
    expect(onCompleteDeckyModalClose).toHaveBeenCalledTimes(1);
  });

  it("a second Off -> Deep, once the flag is already stored, shows no notice", () => {
    window.localStorage.setItem(THINKING_NOTICE_STORAGE_KEY, "1");
    const { result, setAskThinkEffort, onBeforeDeckyModal } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("high"));

    expect(onBeforeDeckyModal).not.toHaveBeenCalled();
    expect(hoisted.modal).toBeNull();
    expect(setAskThinkEffort).toHaveBeenCalledWith("high");
  });

  it("Keep it off leaves the level unchanged and stores nothing", () => {
    const { result, setAskThinkEffort } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("low"));
    const onCancel = hoisted.modal?.props.onCancel as () => void;
    act(() => onCancel());

    expect(setAskThinkEffort).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(THINKING_NOTICE_STORAGE_KEY)).toBeNull();
  });

  it("declining once, the notice comes back the next time Off is moved", () => {
    const { result, onBeforeDeckyModal } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("low"));
    const onCancel = hoisted.modal?.props.onCancel as () => void;
    act(() => onCancel());

    hoisted.modal = null;
    act(() => result.current.requestThinkingEffortChange("low"));

    expect(onBeforeDeckyModal).toHaveBeenCalledTimes(2);
    expect(hoisted.modal).not.toBeNull();
  });
});

describe("useThinkingNoticeGate -- every other move never prompts", () => {
  it("Brief -> Deep, with no flag stored, shows no notice", () => {
    const { result, setAskThinkEffort, onBeforeDeckyModal } = setupGate("low");

    act(() => result.current.requestThinkingEffortChange("high"));

    expect(onBeforeDeckyModal).not.toHaveBeenCalled();
    expect(hoisted.modal).toBeNull();
    expect(setAskThinkEffort).toHaveBeenCalledWith("high");
  });

  it("anything -> Off never prompts, even with no flag stored", () => {
    const { result, setAskThinkEffort, onBeforeDeckyModal } = setupGate("medium");

    act(() => result.current.requestThinkingEffortChange("off"));

    expect(onBeforeDeckyModal).not.toHaveBeenCalled();
    expect(setAskThinkEffort).toHaveBeenCalledWith("off");
  });
});

describe("useThinkingNoticeGate -- return focus goes through the real registry (bug a)", () => {
  it("remembers ollama-thinking-effort before the popup opens", () => {
    const { result } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("medium"));

    expect(peekModalReturnFocus()).toBe("ollama-thinking-effort");
  });

  it("Show thinking: a registered owner is found and focused once the popup closes", () => {
    const owner = document.createElement("div");
    document.body.appendChild(owner);
    const button = document.createElement("button");
    owner.appendChild(button);
    registerModalReturnFocusOwner("ollama-thinking-effort", owner);
    const focus = vi.spyOn(button, "focus");

    const { result } = setupGate("off");
    act(() => result.current.requestThinkingEffortChange("medium"));
    const onOK = hoisted.modal?.props.onOK as () => void;
    act(() => onOK());

    // The real path restores through the shell's finalizeShowModalAndRestoreActiveTab, which this
    // test's onCompleteDeckyModalClose stub does not run -- calling the registry directly proves
    // the piece this file actually owns: an owner was registered and can be found by the id this
    // gate remembered.
    expect(restoreModalReturnFocus()).toBe(true);
    expect(focus).toHaveBeenCalled();
  });

  it("Keep it off: the same registered owner is found and focused", () => {
    const owner = document.createElement("div");
    document.body.appendChild(owner);
    const button = document.createElement("button");
    owner.appendChild(button);
    registerModalReturnFocusOwner("ollama-thinking-effort", owner);
    const focus = vi.spyOn(button, "focus");

    const { result } = setupGate("off");
    act(() => result.current.requestThinkingEffortChange("low"));
    const onCancel = hoisted.modal?.props.onCancel as () => void;
    act(() => onCancel());

    expect(restoreModalReturnFocus()).toBe(true);
    expect(focus).toHaveBeenCalled();
  });
});

describe("useThinkingNoticeGate -- the accepted level survives Decky's remount (bug b)", () => {
  it("Show thinking: Balanced is still Balanced after the close-complete path has run", () => {
    const { result } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("medium"));
    const onOK = hoisted.modal?.props.onOK as () => void;
    act(() => onOK());

    // `consumeBonsaiSessionAfterRemount` is exactly what a freshly-mounted usePluginSettings reads
    // once Decky rebuilds the screen. Before the fix this held the pre-popup snapshot's "off",
    // even though `setAskThinkEffort("medium")` had just been called -- the setter's write never
    // reaches the settings a remount actually restores from.
    const restored = consumeBonsaiSessionAfterRemount();
    expect(restored?.settingsSnapshot.askThinkEffort).toBe("medium");
  });

  it("Keep it off: the pending snapshot still reads Off, untouched", () => {
    const { result } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("low"));
    const onCancel = hoisted.modal?.props.onCancel as () => void;
    act(() => onCancel());

    const restored = consumeBonsaiSessionAfterRemount();
    expect(restored?.settingsSnapshot.askThinkEffort).toBe("off");
  });
});
