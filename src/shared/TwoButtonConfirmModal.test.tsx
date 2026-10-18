/**
 * Title: The shared two-button confirm box shows the action and Cancel only
 *
 * Purpose: The boxes that ask "are you sure?" used to be Steam's ConfirmModal with a safe choice first, and
 * Steam always adds its own Cancel, so a person saw three buttons. This box draws exactly two, side by side,
 * Cancel first (where Steam puts the ring) and the action beside it, and B is Cancel. Checked on the page
 * the box draws: the buttons read off in the order Steam would walk them, each one pressed, B pressed, and the
 * ring going back to the control that opened the box after the screen behind it was rebuilt (unmounted and
 * mounted again while the box was open, the way closing a real Decky box does).
 *
 * The box also follows the Text size setting: its title, words and button words are sized through textPx, so
 * Small and Large move them (Steam's old confirm box drew a 22 px title and 16 px words at every size).
 *
 * Does not: open a real Steam box, so where the ring lands inside the box on the Deck is the device row's job.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook } from "@testing-library/react";

type Handlers = Record<string, unknown>;
let modalRootCancel: (() => void) | undefined;

vi.mock("@decky/ui", async () => {
  const fake = await import("../test-harness/fakeDeckyUi");
  const ModalRoot = React.forwardRef<HTMLDivElement, Handlers & { children?: React.ReactNode }>(
    function CapturingModalRoot(props, ref) {
      modalRootCancel = props.onCancel as (() => void) | undefined;
      return <fake.ModalRoot {...props} ref={ref} />;
    },
  );
  return { ...fake, ModalRoot };
});

import { TwoButtonConfirmModal } from "./TwoButtonConfirmModal";
import { TEXT_SCALE, TEXT_SCALE_VAR } from "./text-size/chatTextSize";
import { usePublishTextScale } from "./text-size/usePublishTextScale";
import { makeFontSizeReader } from "../test-harness/settledFontSize";
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
  return { view, buttons, onCancel, onAction };
}

describe("the shared two-button confirm box", () => {
  it("shows the title, the words, and exactly two buttons: Cancel first, then the action", () => {
    const { view, buttons } = drawBox();
    expect(buttons.map((b) => b.textContent)).toEqual(["Cancel", "Clear"]);
    const text = view.container.textContent ?? "";
    expect(text).toContain("Clear session cache?");
    expect(text).toContain("Clears this session from RAM.");
  });

  it("puts the two buttons in one horizontal row, Cancel first, so Right from Cancel reaches the action", () => {
    const { buttons } = drawBox();
    const cancelCell = buttons[0]!.closest(".bonsai-settings-focus-btn-host") as HTMLElement;
    const actionCell = buttons[1]!.closest(".bonsai-settings-focus-btn-host") as HTMLElement;
    const row = cancelCell.parentElement as HTMLElement;
    expect(actionCell.parentElement).toBe(row);
    expect(row.getAttribute("flow-children")).toBe("horizontal");
    expect(row.style.display).toBe("flex");
    expect(row.style.flexDirection).toBe("row");
    expect(Array.from(row.children)).toEqual([cancelCell, actionCell]);
  });

  it("A on the first button (where the ring opens) does the action's opposite: onCancel only", () => {
    const { buttons, onCancel, onAction } = drawBox();
    fireEvent.click(buttons[0]!);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("the action button runs onAction once, even when pressed twice", () => {
    const { buttons, onCancel, onAction } = drawBox();
    fireEvent.click(buttons[1]!);
    fireEvent.click(buttons[1]!);
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

  it("draws the action in the red of the Delete button only when asked", () => {
    const plain = drawBox({ actionLabel: "Download" });
    const red = drawBox({ actionLabel: "Remove", danger: true });
    expect(plain.buttons[1]!.getAttribute("style")).not.toBe(red.buttons[1]!.getAttribute("style"));
    expect(plain.buttons[0]!.getAttribute("style")).toBe(plain.buttons[1]!.getAttribute("style"));
  });

  it("follows the Text size setting: the title, the words and the button words are bigger on Large and smaller on Small", () => {
    const sizes: Record<string, number[]> = {};
    for (const size of ["small", "normal", "large"] as const) {
      const published = renderHook(() => usePublishTextScale(size));
      const { view, buttons } = drawBox();
      /* No step handed in: the reader asks the elements above, up to the page's root, as the browser would. */
      const read = makeFontSizeReader("");
      const title = view.getByText("Clear session cache?");
      const words = view.getByText("Clears this session from RAM.");
      sizes[size] = [read(title), read(words), read(buttons[0]!), read(buttons[1]!)];
      view.unmount();
      published.unmount();
    }
    // Normal is today's sizes: 16 for the title, 12 for the words, 11 for the buttons.
    expect(sizes.normal).toEqual([16, 12, 11, 11]);
    expect(sizes.small).toEqual([16, 12, 11, 11].map((n) => n * TEXT_SCALE.small));
    expect(sizes.large).toEqual([16, 12, 11, 11].map((n) => n * TEXT_SCALE.large));
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
    const { buttons } = drawBox({ onCancel: () => restoreModalReturnFocusWithRetry() });
    first.unmount();
    const second = render(<Opener />);
    const secondButton = second.getByText("Clear cache...");
    expect(secondButton).not.toBe(firstButton);
    expect(document.activeElement).not.toBe(secondButton);

    act(() => {
      fireEvent.click(buttons[0]!);
      vi.advanceTimersByTime(500);
    });
    expect(document.activeElement).toBe(secondButton);
  });
});
