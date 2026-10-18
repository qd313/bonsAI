/**
 * Title: The mic hint row's two buttons, and the ring that must not be stranded there
 * Purpose: Pin plan 94 block 5's finding (workshop:test-evidence/plan94-P94-VOICE-PERM.json): the mic hint's
 *          Open Permissions and Dismiss were stacked with no move handlers, so Down from Open Permissions landed
 *          on Dismiss, and A on Dismiss removed the row with the ring still on it. Now Right and Left step between
 *          the two buttons, Down holds still, Up hands the ring to the question box, and Dismiss hands the ring on
 *          once the row is gone (and only when the ring was on it). Also pins what the row draws and what a click
 *          on each button does.
 * Used for: MainTabMicPermissionHintRow.tsx (micHintRowNavHandlers(), dismissMicHintKeepingRing() and the row).
 * Does not: Fire Steam's own D-pad events (the test stand-in for Decky's UI drops them, so the handlers are called
 *           directly) or prove the fix on the Deck. It owes Deck row P96-F11-HINT-RING.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MainTabMicPermissionHintRow,
  dismissMicHintKeepingRing,
  micHintRowNavHandlers,
} from "./MainTabMicPermissionHintRow";
import { registerNavFocus, resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { resetUiDocument } from "../../shared/dpad/uiDocument";

vi.mock("@decky/ui", async () => import("../../test-harness/fakeDeckyUi"));

function fakeNavHolder() {
  return { current: { TakeFocus: vi.fn(() => true) } };
}

/** The row's two buttons as plain elements, the ring (Steam's .gpfocus class) on the one asked for. */
function mountButtons(ringOn?: "open" | "dismiss") {
  const open = document.createElement("button");
  open.textContent = "Open Permissions";
  const dismiss = document.createElement("button");
  dismiss.textContent = "Dismiss";
  document.body.append(open, dismiss);
  const ringed = ringOn === "open" ? open : ringOn === "dismiss" ? dismiss : null;
  if (ringed) {
    ringed.classList.add("gpfocus");
    ringed.focus();
  }
  return { open, dismiss, els: { current: [open, dismiss] as (HTMLElement | null)[] } };
}

const call = (handlers: Record<string, unknown>, name: string): boolean => (handlers[name] as () => boolean)();

beforeEach(() => {
  resetNavFocusRegistry();
  resetUiDocument();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

describe("the mic hint row's D-pad moves", () => {
  it("Right from Open Permissions lands on Dismiss", () => {
    const { dismiss, els } = mountButtons("open");
    expect(call(micHintRowNavHandlers(els), "onMoveRight")).toBe(true);
    expect(document.activeElement).toBe(dismiss);
  });

  it("Left from Dismiss comes back to Open Permissions", () => {
    const { open, els } = mountButtons("dismiss");
    expect(call(micHintRowNavHandlers(els), "onMoveLeft")).toBe(true);
    expect(document.activeElement).toBe(open);
  });

  it("Down claims the press and moves nothing", () => {
    const { open, els } = mountButtons("open");
    expect(call(micHintRowNavHandlers(els), "onMoveDown")).toBe(true);
    expect(document.activeElement).toBe(open);
  });

  it("Up hands the ring to the question box through Steam's own transfer", () => {
    const box = fakeNavHolder();
    registerNavFocus("unified-input", box);
    const { els } = mountButtons("open");
    expect(call(micHintRowNavHandlers(els), "onMoveUp")).toBe(true);
    expect(box.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  it("Up still claims the press when the question box is not there to take it", () => {
    const { els } = mountButtons("open");
    expect(call(micHintRowNavHandlers(els), "onMoveUp")).toBe(true);
  });
});

describe("Dismiss on the mic hint", () => {
  /* `dismiss` removes both buttons, the way the row unmounting does. */
  function mountRow(ringOn: "open" | "dismiss") {
    const mounted = mountButtons(ringOn);
    const dismiss = vi.fn(() => {
      mounted.open.remove();
      mounted.dismiss.remove();
    });
    return { ...mounted, dismissAction: dismiss };
  }

  it("hands the ring to the question box once the row is gone", () => {
    vi.useFakeTimers();
    const box = fakeNavHolder();
    registerNavFocus("unified-input", box);
    const { els, dismissAction } = mountRow("dismiss");

    dismissMicHintKeepingRing(els, dismissAction);
    vi.runAllTimers();

    expect(dismissAction).toHaveBeenCalledTimes(1);
    expect(box.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  it("moves nothing when the ring was elsewhere (a touch press), but still dismisses once", () => {
    vi.useFakeTimers();
    const box = fakeNavHolder();
    registerNavFocus("unified-input", box);
    const { els, dismissAction } = mountRow("open");

    dismissMicHintKeepingRing(els, dismissAction);
    vi.runAllTimers();

    expect(dismissAction).toHaveBeenCalledTimes(1);
    expect(box.current.TakeFocus).not.toHaveBeenCalled();
  });
});

describe("the mic hint row, as drawn", () => {
  it("shows the message and both buttons", () => {
    render(<MainTabMicPermissionHintRow onNavigateToPermissions={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Enable Voice input \(microphone\)/)).toBeTruthy();
    expect(screen.getByText("Open Permissions")).toBeTruthy();
    expect(screen.getByText("Dismiss")).toBeTruthy();
  });

  it("a click on Open Permissions jumps to the microphone permission", () => {
    const onNavigateToPermissions = vi.fn();
    render(<MainTabMicPermissionHintRow onNavigateToPermissions={onNavigateToPermissions} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByText("Open Permissions"));
    expect(onNavigateToPermissions).toHaveBeenCalledTimes(1);
    expect(onNavigateToPermissions).toHaveBeenCalledWith("microphone_access");
  });

  it("a click on Dismiss calls onDismiss once", () => {
    const onDismiss = vi.fn();
    render(<MainTabMicPermissionHintRow onNavigateToPermissions={vi.fn()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("draws each button inside its own Focusable wrapper, so Steam's moves between them reach the row's handlers", () => {
    // plan96-P96-F11-HINT-RING.json: "Down from Open Permissions reached Dismiss on the Deck" with the handlers
    // on the row alone; a move between two stops in one container is Steam's own. One wrapper per button.
    const { container } = render(<MainTabMicPermissionHintRow onNavigateToPermissions={vi.fn()} onDismiss={vi.fn()} />);
    const wraps = container.querySelectorAll<HTMLElement>(".bonsai-mic-perm-hint-btn-wrap");
    expect(wraps).toHaveLength(2);
    expect(wraps[0].querySelectorAll("button")).toHaveLength(1);
    expect(wraps[0].textContent).toBe("Open Permissions");
    expect(wraps[1].querySelectorAll("button")).toHaveLength(1);
    expect(wraps[1].textContent).toBe("Dismiss");
  });

  it("draws one wrapper, around Open Permissions alone, when there is no Dismiss action", () => {
    const { container } = render(<MainTabMicPermissionHintRow onNavigateToPermissions={vi.fn()} />);
    const wraps = container.querySelectorAll<HTMLElement>(".bonsai-mic-perm-hint-btn-wrap");
    expect(wraps).toHaveLength(1);
    expect(wraps[0].textContent).toBe("Open Permissions");
  });

  it("draws no Dismiss button when it has no dismiss action", () => {
    render(<MainTabMicPermissionHintRow onNavigateToPermissions={vi.fn()} />);
    expect(screen.getByText("Open Permissions")).toBeTruthy();
    expect(screen.queryByText("Dismiss")).toBeNull();
  });
});
