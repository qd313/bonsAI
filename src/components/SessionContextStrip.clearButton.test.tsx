/**
 * Title: Session context strip -- Clear button
 * Purpose: Pin the D105 Clear button at the right end of the strip's header row: it only exists
 *          when the strip itself shows, A opens the same kind of confirm box Settings -> Data
 *          uses (remembering its own return-focus id), OK calls the new back-end method and
 *          toasts, and Left/Right are wired through real `Focusable` move props rather than any
 *          keyboard event -- the shape the focus-graph rule in AGENTS.md requires.
 * Used for: plan 56 lane A / roadmap "Clear button in the session context strip" (D105).
 * Solves: Nothing pinned this button existed, that it opened the right confirm box with the
 *         right return-focus id, that OK actually reached the back end and told the person it
 *         had, or that Left/Right move the ring between the two header stops the way Steam
 *         itself invokes them on device -- a keydown-based test would pass here and do nothing
 *         on a real Deck (AGENTS.md's focus-graph rule).
 * Does not: Render the ConfirmModal body -- the test harness's `showModal` stub discards its
 *           argument (src/test-harness/fakeDeckyUi.tsx), so this file locally overrides
 *           `showModal` to capture the element instead and calls its `onOK`/`onCancel` props
 *           directly, the same technique `useRoutingOrderModal.test.tsx` uses. Does not exercise
 *           Steam's own gamepad ring -- jsdom has none; it asserts the `onMoveLeft`/`onMoveRight`
 *           props Steam would call, by locally capturing every `Focusable`'s props.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { toaster } from "@decky/api";

import { SessionContextStrip } from "./SessionContextStrip";
import {
  peekModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";
import { getRpcCallLog, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { ChatSlotTurnTransparency } from "../utils/inputTransparency";

const hoisted = vi.hoisted(() => ({
  focusableProps: [] as Array<Record<string, unknown>>,
  modal: null as { props: Record<string, unknown> } | null,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingFocusable(props, ref) {
      hoisted.focusableProps.push(props);
      return <RealFocusable {...props} ref={ref} />;
    }
  );
  return {
    ...stubs,
    Focusable: CapturingFocusable,
    // The real `showModal` opens a portal; the stub discards its argument entirely. Neither lets
    // a test reach the confirm box's own `onOK`/`onCancel` -- capture the element instead, same
    // technique `useRoutingOrderModal.test.tsx` uses for the same reason.
    showModal: (content: unknown) => {
      hoisted.modal = content as { props: Record<string, unknown> };
      return { Close: () => {} };
    },
  };
});

const CHIP_SNAPSHOT: ChatSlotTurnTransparency = {
  route: "game_context",
  success: true,
  context_chips: [
    {
      id: "chip-1",
      rank: 0,
      label: "Game context",
      attached: true,
      tier_class: "foss",
      body: { title: "Game context", paths: [], bullets: [] },
    },
  ],
};

const ARCHIVED_TURN: AskThreadCollapsedTurn = {
  id: "turn-1",
  question: "How do I dodge the exploders",
  answer: "Keep your distance and strafe.",
  transparency: CHIP_SNAPSHOT,
};

function toggleFocusableProps(): Record<string, unknown> | undefined {
  return hoisted.focusableProps.find((p) => p.className === "bonsai-session-context-toggle");
}

function clearFocusableProps(): Record<string, unknown> | undefined {
  return hoisted.focusableProps.find((p) => p.className === "bonsai-session-context-clear-button");
}

beforeEach(() => {
  hoisted.focusableProps = [];
  hoisted.modal = null;
  resetModalReturnFocusRegistry();
});

describe("SessionContextStrip Clear button -- only when the strip shows", () => {
  it("renders nothing at all, so no Clear button either, when there is nothing to show", () => {
    const { container, queryByText } = render(<SessionContextStrip />);
    expect(container.firstChild).toBeNull();
    expect(queryByText("Clear")).toBeNull();
  });

  it("renders Clear in the header row once the strip has something to show", () => {
    const { getByText } = render(<SessionContextStrip archivedTurns={[ARCHIVED_TURN]} />);
    expect(getByText("Clear")).toBeTruthy();
  });
});

describe("SessionContextStrip Clear button -- A opens the confirm box", () => {
  it("remembers session-context-clear as the return-focus id", () => {
    const { getByText } = render(<SessionContextStrip archivedTurns={[ARCHIVED_TURN]} />);

    fireEvent.click(getByText("Clear"));

    expect(peekModalReturnFocus()).toBe("session-context-clear");
    expect(hoisted.modal).not.toBeNull();
    expect((hoisted.modal?.props as Record<string, unknown>).strTitle).toBe(
      "Start the next question fresh?"
    );
  });

  it("registers the button so the registry can focus it back once the box closes", () => {
    const { getByText } = render(<SessionContextStrip archivedTurns={[ARCHIVED_TURN]} />);
    const button = getByText("Clear");
    const focus = vi.spyOn(button, "focus");

    fireEvent.click(button);
    restoreModalReturnFocus();

    expect(focus).toHaveBeenCalled();
  });

  it("calls the strip's own onBeforeDeckyModal before opening", () => {
    const onBeforeDeckyModal = vi.fn();
    const { getByText } = render(
      <SessionContextStrip archivedTurns={[ARCHIVED_TURN]} onBeforeDeckyModal={onBeforeDeckyModal} />
    );

    fireEvent.click(getByText("Clear"));

    expect(onBeforeDeckyModal).toHaveBeenCalledTimes(1);
  });
});

describe("SessionContextStrip Clear button -- OK", () => {
  it("calls forget_game_ai_carried_context and toasts that the next question starts fresh", () => {
    setRpcHandler("forget_game_ai_carried_context", () => ({
      ok: true,
      forgot: ["followup_subject", "strategy_checklist_position"],
    }));
    const onCompleteDeckyModalClose = vi.fn((close: () => void) => close());
    const { getByText } = render(
      <SessionContextStrip
        archivedTurns={[ARCHIVED_TURN]}
        onCompleteDeckyModalClose={onCompleteDeckyModalClose}
      />
    );
    fireEvent.click(getByText("Clear"));

    const onOK = hoisted.modal?.props.onOK as (() => void) | undefined;
    expect(onOK).toBeTypeOf("function");
    onOK?.();

    expect(getRpcCallLog()).toContainEqual({
      method: "forget_game_ai_carried_context",
      args: [],
    });
    expect(vi.mocked(toaster.toast)).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Next question starts fresh" })
    );
    expect(onCompleteDeckyModalClose).toHaveBeenCalledTimes(1);
  });

  it("still toasts when the round trip fails -- the promise is kept from the screen's own side", async () => {
    setRpcHandler("forget_game_ai_carried_context", () => {
      throw new Error("offline");
    });
    const { getByText } = render(<SessionContextStrip archivedTurns={[ARCHIVED_TURN]} />);
    fireEvent.click(getByText("Clear"));

    const onOK = hoisted.modal?.props.onOK as (() => void) | undefined;
    onOK?.();

    expect(vi.mocked(toaster.toast)).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Next question starts fresh" })
    );
    // Let the rejected RPC promise's .catch(() => {}) settle so it is not left unhandled.
    await Promise.resolve();
    await Promise.resolve();
  });

  it("Cancel closes without calling the back end", () => {
    setRpcHandler("forget_game_ai_carried_context", () => ({ ok: true, forgot: [] }));
    const { getByText } = render(<SessionContextStrip archivedTurns={[ARCHIVED_TURN]} />);
    fireEvent.click(getByText("Clear"));

    const onCancel = hoisted.modal?.props.onCancel as (() => void) | undefined;
    onCancel?.();

    expect(getRpcCallLog()).not.toContainEqual(
      expect.objectContaining({ method: "forget_game_ai_carried_context" })
    );
    expect(toaster.toast).not.toHaveBeenCalled();
  });
});

describe("SessionContextStrip Clear button -- Left/Right through the Focusable move props", () => {
  /*
   * Real presses. jsdom has no gamepad ring, so this cannot prove Steam's own ring moves -- it
   * proves the `onMoveRight`/`onMoveLeft` props Steam invokes on device are wired between the two
   * header stops, never a keyboard event (AGENTS.md's focus-graph rule: Steam never delivers a
   * DOM keydown for the D-pad).
   */
  it("carries onMoveRight on the toggle and onMoveLeft on the Clear button", () => {
    render(<SessionContextStrip archivedTurns={[ARCHIVED_TURN]} />);

    expect(toggleFocusableProps()?.onMoveRight).toBeTypeOf("function");
    expect(clearFocusableProps()?.onMoveLeft).toBeTypeOf("function");
  });

  it("Right from the toggle moves real DOM focus onto the Clear button", () => {
    /*
     * The target is the Focusable wrapper's own DOM node, not the native `<button>` nested
     * inside it -- the same target `modalReturnFocusRegistry.ts`'s `focusOwnerById` and
     * `buildTurnHeaderElement.tsx`'s `rightIntoQuestion` both reach for, since that wrapper is
     * what Steam actually puts its ring on.
     */
    const { container } = render(<SessionContextStrip archivedTurns={[ARCHIVED_TURN]} />);
    const clearWrapper = container.querySelector(".bonsai-session-context-clear-button");
    expect(clearWrapper).toBeTruthy();
    const focus = vi.spyOn(clearWrapper as HTMLElement, "focus");

    const onMoveRight = toggleFocusableProps()?.onMoveRight as () => boolean;
    expect(onMoveRight()).toBe(true);

    expect(focus).toHaveBeenCalled();
  });

  it("Left from the Clear button moves real DOM focus back onto the toggle", () => {
    const { container } = render(<SessionContextStrip archivedTurns={[ARCHIVED_TURN]} />);
    const toggleWrapper = container.querySelector(".bonsai-session-context-toggle");
    expect(toggleWrapper).toBeTruthy();
    const focus = vi.spyOn(toggleWrapper as HTMLElement, "focus");

    const onMoveLeft = clearFocusableProps()?.onMoveLeft as () => boolean;
    expect(onMoveLeft()).toBe(true);

    expect(focus).toHaveBeenCalled();
  });
});
