/**
 * Title: Thinking notice gate tests
 * Purpose: Pin the one-time popup that guards moving the Thinking row off Off: it shows only on
 *          Off -> anything, with no stored flag; "Show thinking" applies the level and remembers
 *          it was seen; "Keep it off" applies nothing and the popup comes back next time; any
 *          other move (Brief/Balanced/Deep between each other) never prompts at all; and closing
 *          the popup, either way, puts the D-pad ring back on the button that opened it.
 * Used for: plan 57 step 2 (lane B).
 * Solves: Nothing pinned that the popup only fires on the one direction that matters, that the
 *         level is genuinely held back until a button is pressed, that the accepted flag actually
 *         silences it afterward, or that a person is not left with no D-pad highlight once the
 *         popup goes away.
 * Does not: Render a live Decky modal -- the test harness's `showModal` stub discards its
 *           argument (src/test-harness/fakeDeckyUi.tsx), so this file locally overrides
 *           `showModal` to capture the element and calls its `onOK`/`onCancel` props directly,
 *           the same technique `SessionContextStrip.clearButton.test.tsx` uses. Does not exercise
 *           Steam's own gamepad ring -- jsdom has none, so the return-focus test only proves
 *           `focus()` was called on the button that was pressed.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useThinkingNoticeGate } from "./useThinkingNoticeGate";
import { THINKING_NOTICE_STORAGE_KEY } from "./useDisclaimerAndLocalRuntimeGates";
import type { AskThinkEffortId } from "../data/askThinkEffort";

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

function setupGate(initial: AskThinkEffortId) {
  const setAskThinkEffort = vi.fn();
  const onBeforeDeckyModal = vi.fn();
  const onCompleteDeckyModalClose = vi.fn((close: () => void) => close());
  const { result } = renderHook(() =>
    useThinkingNoticeGate(initial, setAskThinkEffort, {
      onBeforeDeckyModal,
      onCompleteDeckyModalClose,
    })
  );
  return { result, setAskThinkEffort, onBeforeDeckyModal, onCompleteDeckyModalClose };
}

/** Stands in for the button `OllamaThinkingEffortRow` hands `onChange` as `sourceEl`. */
function fakeButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  document.body.appendChild(btn);
  return btn;
}

beforeEach(() => {
  hoisted.modal = null;
  window.localStorage.clear();
  document.body.innerHTML = "";
});

describe("useThinkingNoticeGate -- Off -> anything, no flag stored", () => {
  it("shows the notice and applies nothing until a button is pressed", () => {
    const { result, setAskThinkEffort, onBeforeDeckyModal } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("medium", fakeButton()));

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

    act(() => result.current.requestThinkingEffortChange("medium", fakeButton()));
    const onOK = hoisted.modal?.props.onOK as () => void;
    act(() => onOK());

    expect(setAskThinkEffort).toHaveBeenCalledWith("medium");
    expect(window.localStorage.getItem(THINKING_NOTICE_STORAGE_KEY)).toBe("1");
    expect(onCompleteDeckyModalClose).toHaveBeenCalledTimes(1);
  });

  it("a second Off -> Deep, once the flag is already stored, shows no notice", () => {
    window.localStorage.setItem(THINKING_NOTICE_STORAGE_KEY, "1");
    const { result, setAskThinkEffort, onBeforeDeckyModal } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("high", fakeButton()));

    expect(onBeforeDeckyModal).not.toHaveBeenCalled();
    expect(hoisted.modal).toBeNull();
    expect(setAskThinkEffort).toHaveBeenCalledWith("high");
  });

  it("Keep it off leaves the level unchanged and stores nothing", () => {
    const { result, setAskThinkEffort } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("low", fakeButton()));
    const onCancel = hoisted.modal?.props.onCancel as () => void;
    act(() => onCancel());

    expect(setAskThinkEffort).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(THINKING_NOTICE_STORAGE_KEY)).toBeNull();
  });

  it("declining once, the notice comes back the next time Off is moved", () => {
    const { result, onBeforeDeckyModal } = setupGate("off");

    act(() => result.current.requestThinkingEffortChange("low", fakeButton()));
    const onCancel = hoisted.modal?.props.onCancel as () => void;
    act(() => onCancel());

    hoisted.modal = null;
    act(() => result.current.requestThinkingEffortChange("low", fakeButton()));

    expect(onBeforeDeckyModal).toHaveBeenCalledTimes(2);
    expect(hoisted.modal).not.toBeNull();
  });
});

describe("useThinkingNoticeGate -- every other move never prompts", () => {
  it("Brief -> Deep, with no flag stored, shows no notice", () => {
    const { result, setAskThinkEffort, onBeforeDeckyModal } = setupGate("low");

    act(() => result.current.requestThinkingEffortChange("high", fakeButton()));

    expect(onBeforeDeckyModal).not.toHaveBeenCalled();
    expect(hoisted.modal).toBeNull();
    expect(setAskThinkEffort).toHaveBeenCalledWith("high");
  });

  it("anything -> Off never prompts, even with no flag stored", () => {
    const { result, setAskThinkEffort, onBeforeDeckyModal } = setupGate("medium");

    act(() => result.current.requestThinkingEffortChange("off", fakeButton()));

    expect(onBeforeDeckyModal).not.toHaveBeenCalled();
    expect(setAskThinkEffort).toHaveBeenCalledWith("off");
  });
});

describe("useThinkingNoticeGate -- return focus", () => {
  it("focuses the button that was pressed once Show thinking closes the popup", () => {
    const { result } = setupGate("off");
    const button = fakeButton();
    const focus = vi.spyOn(button, "focus");

    act(() => result.current.requestThinkingEffortChange("medium", button));
    const onOK = hoisted.modal?.props.onOK as () => void;
    act(() => onOK());

    expect(focus).toHaveBeenCalled();
  });

  it("also focuses the button that was pressed on Keep it off", () => {
    const { result } = setupGate("off");
    const button = fakeButton();
    const focus = vi.spyOn(button, "focus");

    act(() => result.current.requestThinkingEffortChange("low", button));
    const onCancel = hoisted.modal?.props.onCancel as () => void;
    act(() => onCancel());

    expect(focus).toHaveBeenCalled();
  });
});
