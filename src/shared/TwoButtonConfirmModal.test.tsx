/**
 * Title: The shared two-button confirm box: the action on the left, Cancel on the right, the ring on Cancel
 *
 * Purpose: The maintainer's rule of 2026-10-18: Cancel on the right in every box, the ring always starting on
 * it, the action on the left in the look of the Beta Notice's "Got it". Checked on the page the box draws, with
 * Steam's ring modelled (steamRing.tsx: the transfer onto a nav node moves it, a plain focus() does not): the
 * buttons read off left to right, the ring found on Cancel once the box has settled, Left from Cancel
 * reaching the action, Right from Cancel holding still, A on each button, B, the ring going back to the control
 * that opened the box after the screen behind it was rebuilt, and the Text size setting moving the words, and the look of the two buttons (same height, Cancel in the plugin's glass,
 * the action with no fill of its own).
 *
 * Does not: open a real Steam box, so where Steam's own first focus lands before the box hands the ring to
 * Cancel, and what the blue button and the glass Cancel look like, are the device row's job (P96-CANCEL-RIGHT).
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
  FOCUS_RING_BTN_CLASS,
  SETTINGS_GLASS_BTN_BACKGROUND,
  SETTINGS_GLASS_BTN_BORDER,
  SETTINGS_GLASS_BTN_COLOR,
} from "../styles/settingsGlassButton";
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
    // Each button sits straight inside its own Focusable (the stop); the two stops are the row's children.
    const actionCell = action.closest('[data-decky-ui="Focusable"]') as HTMLElement;
    const cancelCell = cancel.closest('[data-decky-ui="Focusable"]') as HTMLElement;
    expect(action.parentElement).toBe(actionCell);
    expect(cancel.parentElement).toBe(cancelCell);
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

  it("draws the action in Steam's blue primary button with no fill of its own, and Cancel in the plugin's glass look, no red, both the same size", () => {
    const { action, cancel } = drawBox({ actionLabel: "Remove" });
    expect(action.getAttribute("data-decky-ui")).toBe("DialogButtonPrimary");
    expect(cancel.getAttribute("data-decky-ui")).toBe("Button");
    // The action's colours are Steam's: nothing of its own for the fill, the border or the words.
    expect(action.style.background).toBe("");
    expect(action.style.border).toBe("");
    expect(action.style.color).toBe("");
    // Cancel wears the frosted glass, and the ring class so the white ring shows on it.
    expect(cancel.classList.contains(FOCUS_RING_BTN_CLASS)).toBe(true);
    expect(cancel.style.background).toContain("linear-gradient");
    // jsdom may rewrite spaces in colours, so compare with the spaces taken out.
    const bare = (v: string) => v.replace(/\s+/g, "");
    expect(bare(cancel.style.background)).toBe(bare(SETTINGS_GLASS_BTN_BACKGROUND));
    expect(bare(cancel.style.border)).toContain(bare(SETTINGS_GLASS_BTN_BORDER).replace("1px", ""));
    expect(cancel.style.color).toMatch(/#e8eef5|rgb\(232,\s*238,\s*245\)/i);
    expect(SETTINGS_GLASS_BTN_COLOR).toBe("#e8eef5");
    // No red on either button.
    for (const b of [action, cancel]) {
      expect(b.getAttribute("style") ?? "").not.toMatch(/248,\s*113,\s*113|fecaca/i);
    }
    // Same shape: 32 high, full width of its cell, border-box so Cancel's border adds nothing.
    for (const b of [action, cancel]) {
      expect(b.style.height).toBe("32px");
      expect(b.style.minHeight).toBe("32px");
      expect(b.style.boxSizing).toBe("border-box");
      expect(b.style.width).toBe("100%");
    }
  });

  it("draws the box's content inside the plugin's scope, so the ring rule can reach Cancel", () => {
    const { cancel, action } = drawBox();
    const scope = cancel.closest(".bonsai-scope");
    expect(scope).not.toBeNull();
    expect(scope!.contains(action)).toBe(true);
    expect(scope!.textContent).toContain("Clear session cache?");
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
