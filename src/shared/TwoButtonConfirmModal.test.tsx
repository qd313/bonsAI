/**
 * Title: The shared two-button confirm box: the action on the left, Cancel on the right, the ring on Cancel
 *
 * Purpose: The maintainer's rule of 2026-10-18: Cancel on the right in every box, the ring always starting on
 * it, the action on the left in the look of the Beta Notice's "Got it". Checked on the page the box draws, with
 * Steam's ring modelled (steamRing.tsx: the transfer onto a nav node moves it, a plain focus() does not): the
 * buttons read off left to right, the ring found on Cancel once the box has settled, Left from Cancel
 * reaching the action, Right from Cancel holding still, A on each button, B, the ring going back to the control
 * that opened the box after the screen behind it was rebuilt, and the Text size setting moving the words.
 *
 * Does not: open a real Steam box, so where Steam's own first focus lands before the box hands the ring to
 * Cancel, and what the blue button looks like, are the device row's job (P96-CANCEL-RIGHT).
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react";

type Handlers = Record<string, unknown>;
let modalRootCancel: (() => void) | undefined;

vi.mock("@decky/ui", async () => {
  const fake = await import("../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../test-harness/steamRing");
  const ModalRoot = React.forwardRef<HTMLDivElement, Handlers & { children?: React.ReactNode }>(
    function CapturingModalRoot(props, ref) {
      modalRootCancel = props.onCancel as (() => void) | undefined;
      return <fake.ModalRoot {...props} ref={ref} />;
    },
  );
  return { ...fake, ModalRoot, Focusable: SteamRingFocusable };
});

import { TwoButtonConfirmModal } from "./TwoButtonConfirmModal";
import { TEXT_SCALE, TEXT_SCALE_VAR } from "./text-size/chatTextSize";
import { usePublishTextScale } from "./text-size/usePublishTextScale";
import { makeFontSizeReader } from "../test-harness/settledFontSize";
import { steamRingHolder, type SteamEl } from "../test-harness/steamRing";
import {
  registerModalReturnFocusOwner,
  rememberModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocusWithRetry,
} from "./dpad/modalReturnFocusRegistry";

beforeEach(() => {
  modalRootCancel = undefined;
  resetModalReturnFocusRegistry();
});

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.style.removeProperty(TEXT_SCALE_VAR);
});

type Move = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight";

/** A D-pad press on the stop that has the ring, the way Steam calls it: the nearest Focusable's handler. */
function press(key: Move): boolean | undefined {
  let el: SteamEl | null = steamRingHolder() as SteamEl | null;
  while (el) {
    const handler = el.__nav?.[key];
    if (handler) return handler() as boolean | undefined;
    el = el.parentElement as SteamEl | null;
  }
  return undefined;
}

/** A, the way Steam delivers it: the nearest Focusable's onOKButton. */
function pressA(button: HTMLElement): void {
  let el: SteamEl | null = button as SteamEl;
  while (el) {
    const handler = el.__nav?.onOKButton;
    if (handler) return void handler();
    el = el.parentElement as SteamEl | null;
  }
}

function drawBox(over: Partial<React.ComponentProps<typeof TwoButtonConfirmModal>> = {}) {
  const onCancel = vi.fn();
  const onAction = vi.fn();
  const view = render(
    <TwoButtonConfirmModal
      title="Clear session cache?"
      body="Clears this session from RAM."
      actionLabel="Clear"
      onCancel={onCancel}
      onAction={onAction}
      {...over}
    />,
  );
  const buttons = Array.from(view.container.querySelectorAll("button"));
  const action = buttons.find((b) => b.textContent !== "Cancel")!;
  const cancel = buttons.find((b) => b.textContent === "Cancel")!;
  return { view, buttons, action, cancel, onCancel, onAction };
}

/** The box with the ring where it opens: on Cancel, once the box has settled. */
async function drawSettledBox() {
  const box = drawBox();
  await waitFor(() => expect(steamRingHolder()).toBe(box.cancel));
  return box;
}

describe("the shared two-button confirm box", () => {
  it("shows the title, the words, and exactly two buttons: the action on the left, Cancel on the right", () => {
    const { view, buttons } = drawBox();
    expect(buttons.map((b) => b.textContent)).toEqual(["Clear", "Cancel"]);
    const text = view.container.textContent ?? "";
    expect(text).toContain("Clear session cache?");
    expect(text).toContain("Clears this session from RAM.");
  });

  it("puts the two buttons in one horizontal row, the action first and Cancel last, left to right on screen", () => {
    const { action, cancel } = drawBox();
    const actionCell = action.closest(".bonsai-settings-focus-btn-host") as HTMLElement;
    const cancelCell = cancel.closest(".bonsai-settings-focus-btn-host") as HTMLElement;
    const row = actionCell.parentElement as HTMLElement;
    expect(cancelCell.parentElement).toBe(row);
    expect(row.getAttribute("flow-children")).toBe("horizontal");
    expect(row.style.display).toBe("flex");
    // A plain row, not row-reverse: the order in the page is the order on screen.
    expect(row.style.flexDirection).toBe("row");
    expect(Array.from(row.children)).toEqual([actionCell, cancelCell]);
  });

  it("starts the ring on Cancel, not on the action Steam would reach first", async () => {
    const { cancel, action } = drawBox();
    await waitFor(() => expect(steamRingHolder()).toBe(cancel));
    expect(steamRingHolder()).not.toBe(action);
  });

  it("Right from Cancel holds still: the press is taken and the ring stays on Cancel", async () => {
    const { cancel } = await drawSettledBox();
    expect(press("onMoveRight")).toBe(true);
    expect(steamRingHolder()).toBe(cancel);
  });

  it("Left from Cancel reaches the action, and Right from the action comes back to Cancel", async () => {
    const { cancel, action } = await drawSettledBox();
    expect(press("onMoveLeft")).toBe(true);
    expect(steamRingHolder()).toBe(action);
    expect(press("onMoveLeft")).toBe(true);
    expect(steamRingHolder()).toBe(action);
    expect(press("onMoveRight")).toBe(true);
    expect(steamRingHolder()).toBe(cancel);
  });

  it("Up and Down hold still on both buttons: the ring never leaves the two of them", async () => {
    const { cancel, action } = await drawSettledBox();
    expect(press("onMoveUp")).toBe(true);
    expect(press("onMoveDown")).toBe(true);
    expect(steamRingHolder()).toBe(cancel);
    press("onMoveLeft");
    expect(press("onMoveUp")).toBe(true);
    expect(press("onMoveDown")).toBe(true);
    expect(steamRingHolder()).toBe(action);
  });

  it("takes the safe button's own words when the caller has them (Keep it off), still on the right with the ring on it", async () => {
    const view = render(
      <TwoButtonConfirmModal
        title="bonsAI - Thinking"
        body="Show it?"
        actionLabel="Show thinking"
        cancelLabel="Keep it off"
        onCancel={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    const buttons = Array.from(view.container.querySelectorAll("button"));
    expect(buttons.map((b) => b.textContent)).toEqual(["Show thinking", "Keep it off"]);
    await waitFor(() => expect(steamRingHolder()).toBe(buttons[1]));
  });

  it("A on Cancel (where the ring opens) does the action's opposite: onCancel only, once", async () => {
    const { cancel, onCancel, onAction } = await drawSettledBox();
    pressA(cancel);
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("A on the action runs onAction once, even when pressed twice", () => {
    const { action, onCancel, onAction } = drawBox();
    pressA(action);
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("B is Cancel: it runs onCancel and never onAction", () => {
    const { onCancel, onAction } = drawBox();
    expect(modalRootCancel).toBeTypeOf("function");
    modalRootCancel!();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("draws the action in Steam's blue primary button (the Beta Notice's Got it) and Cancel in the plain one, with no red and no custom fill", () => {
    const { action, cancel } = drawBox({ actionLabel: "Remove" });
    expect(action.getAttribute("data-decky-ui")).toBe("DialogButtonPrimary");
    expect(cancel.getAttribute("data-decky-ui")).toBe("Button");
    for (const b of [action, cancel]) {
      const style = b.getAttribute("style") ?? "";
      expect(style).not.toMatch(/background|border|color|rgba?\(|#[0-9a-f]{3}/i);
    }
  });

  it("follows the Text size setting: the title, the words and the button words are bigger on Large and smaller on Small", () => {
    const sizes: Record<string, number[]> = {};
    for (const size of ["small", "normal", "large"] as const) {
      const published = renderHook(() => usePublishTextScale(size));
      const { view, action, cancel } = drawBox();
      /* No step handed in: the reader asks the elements above, up to the page's root, as the browser would. */
      const read = makeFontSizeReader("");
      const title = view.getByText("Clear session cache?");
      const words = view.getByText("Clears this session from RAM.");
      sizes[size] = [read(title), read(words), read(action), read(cancel)];
      view.unmount();
      published.unmount();
    }
    // Normal: 16 for the title, 12 for the words, 13 for the buttons.
    expect(sizes.normal).toEqual([16, 12, 13, 13]);
    expect(sizes.small).toEqual([16, 12, 13, 13].map((n) => n * TEXT_SCALE.small));
    expect(sizes.large).toEqual([16, 12, 13, 13].map((n) => n * TEXT_SCALE.large));
    expect(sizes.large![0]).toBeGreaterThan(sizes.small![0]!);
  });

  it("gives the ring back to the opener after the screen behind the box was rebuilt while it was open", () => {
    vi.useFakeTimers();
    // The opener, mounted the way the plugin's tabs mount it: registers itself while on screen.
    const Opener = () => (
      <button ref={(el) => registerModalReturnFocusOwner("settings-clear-cache", el)}>Clear cache...</button>
    );
    const first = render(<Opener />);
    const firstButton = first.getByText("Clear cache...");
    firstButton.focus();
    rememberModalReturnFocus("settings-clear-cache");

    // The box opens over it and Decky rebuilds the screen behind: the old opener goes, a new one comes.
    // Closing a real box takes it off the screen first, then asks for the ring back.
    const box = drawBox({
      onCancel: () => {
        box.view.unmount();
        restoreModalReturnFocusWithRetry();
      },
    });
    first.unmount();
    const second = render(<Opener />);
    const secondButton = second.getByText("Clear cache...");
    expect(secondButton).not.toBe(firstButton);
    expect(document.activeElement).not.toBe(secondButton);

    act(() => {
      fireEvent.click(box.cancel);
      vi.advanceTimersByTime(500);
    });
    expect(document.activeElement).toBe(secondButton);
  });
});
