/**
 * Title: The Session tab's row list, de-dup, and Clear
 * Purpose: Pin `computeSessionContextRows`'s de-dup rule (roadmap: "Session context counts the
 *          newest turn twice") now that it is shared code, and pin `SessionContextTabBody`'s own
 *          Clear button -- the confirm box it opens, the back-end call and toast on OK, Cancel
 *          doing nothing, and Left/Right/B being real `Focusable` move props rather than any
 *          keyboard event (AGENTS.md's focus-graph rule: Steam never delivers a DOM keydown for
 *          the D-pad).
 * Used for: SessionContextStrip.tsx.
 * Does not: Cover the tabs themselves or the four ways out of the panel they sit in -- see
 *           MainTabChatTranscript.detailsTabs.test.tsx for that. Does not exercise Steam's own
 *           gamepad ring -- jsdom has none.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { toaster } from "@decky/api";

import { SessionContextTabBody, computeSessionContextRows } from "./SessionContextStrip";
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
    // The real `showModal` opens a portal; the stub discards its argument. Capture the element
    // instead, same technique the old suite for this Clear button used.
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

function latestPropsFor(className: string): Record<string, unknown> | undefined {
  const matches = hoisted.focusableProps.filter((p) => p.className === className);
  return matches[matches.length - 1];
}

beforeEach(() => {
  hoisted.focusableProps = [];
  hoisted.modal = null;
  resetModalReturnFocusRegistry();
});

describe("computeSessionContextRows -- live/archived de-dup", () => {
  /*
   * Regression guard for "Session context counts the newest turn twice" (roadmap). After a
   * completed Ask, `liveTurn` stays populated by `transparencySnapshot` at the same moment the
   * slot reload archives the identical turn — without de-dup the newest turn counted as both an
   * archived row and the live row.
   */
  it("drops the live row when it matches the newest archived turn", () => {
    const rows = computeSessionContextRows(
      {
        id: "live",
        label: "How do I dodge the exploders",
        question: "How do I dodge the exploders",
        snapshot: CHIP_SNAPSHOT,
      },
      [ARCHIVED_TURN]
    );
    expect(rows).toHaveLength(1);
  });

  it("keeps both rows when the live turn is genuinely different", () => {
    const rows = computeSessionContextRows(
      {
        id: "live",
        label: "What's the DPS meta right now",
        question: "What's the DPS meta right now",
        snapshot: CHIP_SNAPSHOT,
      },
      [ARCHIVED_TURN]
    );
    expect(rows).toHaveLength(2);
  });

  it("is empty with nothing on either side", () => {
    expect(computeSessionContextRows(null, [])).toHaveLength(0);
  });
});

describe("SessionContextTabBody -- renders nothing with nothing to show", () => {
  it("returns null, no Clear either, when there are no rows", () => {
    const { container } = render(<SessionContextTabBody />);
    expect(container.firstChild).toBeNull();
  });
});

describe("SessionContextTabBody -- Clear button", () => {
  it("renders a full-width Clear at the end of the body", () => {
    const { getByText } = render(<SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} />);
    expect(getByText("Clear")).toBeTruthy();
  });

  it("A opens the confirm box, remembering session-tab-clear as the return-focus id", () => {
    const { getByText } = render(<SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} />);
    fireEvent.click(getByText("Clear"));

    expect(peekModalReturnFocus()).toBe("session-tab-clear");
    expect(hoisted.modal).not.toBeNull();
    expect((hoisted.modal?.props as Record<string, unknown>).strTitle).toBe(
      "Start the next question fresh?"
    );
  });

  it("registers the button so the registry can focus it back once the box closes", () => {
    const { getByText } = render(<SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} />);
    const button = getByText("Clear");
    const focus = vi.spyOn(button, "focus");

    fireEvent.click(button);
    restoreModalReturnFocus();

    expect(focus).toHaveBeenCalled();
  });

  /*
   * Plan 64 bug E, first half: the box used to open with the ring on the destructive "Clear"
   * button instead of the safe "Cancel". `bDestructiveWarning` is Steam's own supported way to
   * ask for the ring to start on Cancel (ChatSlotRow.tsx's "Delete chat slot?" box already relies
   * on it the same way) -- this only proves the prop reaches the real component; what it actually
   * does with the gamepad ring is Steam's own code, checked on the Deck.
   */
  it("opens with bDestructiveWarning, so the ring starts on the safe Cancel button", () => {
    const { getByText } = render(<SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} />);
    fireEvent.click(getByText("Clear"));

    expect((hoisted.modal?.props as Record<string, unknown>).bDestructiveWarning).toBe(true);
  });

  it("calls onBeforeDeckyModal before opening", () => {
    const onBeforeDeckyModal = vi.fn();
    const { getByText } = render(
      <SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} onBeforeDeckyModal={onBeforeDeckyModal} />
    );
    fireEvent.click(getByText("Clear"));
    expect(onBeforeDeckyModal).toHaveBeenCalledTimes(1);
  });

  it("OK calls forget_game_ai_carried_context and toasts that the next question starts fresh", () => {
    setRpcHandler("forget_game_ai_carried_context", () => ({
      ok: true,
      forgot: ["followup_subject", "strategy_checklist_position"],
    }));
    const onCompleteDeckyModalClose = vi.fn((close: () => void) => close());
    const { getByText } = render(
      <SessionContextTabBody
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

  it("Cancel closes without calling the back end", () => {
    setRpcHandler("forget_game_ai_carried_context", () => ({ ok: true, forgot: [] }));
    const { getByText } = render(<SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} />);
    fireEvent.click(getByText("Clear"));

    const onCancel = hoisted.modal?.props.onCancel as (() => void) | undefined;
    onCancel?.();

    expect(getRpcCallLog()).not.toContainEqual(
      expect.objectContaining({ method: "forget_game_ai_carried_context" })
    );
    expect(toaster.toast).not.toHaveBeenCalled();
  });
});

describe("SessionContextTabBody -- B closes the whole panel, not just this body", () => {
  it("onCancelButton calls onRequestClose and consumes the press", () => {
    const onRequestClose = vi.fn();
    render(<SessionContextTabBody archivedTurns={[ARCHIVED_TURN]} onRequestClose={onRequestClose} />);

    const bodyProps = latestPropsFor("bonsai-details-session-body");
    const onCancelButton = bodyProps?.onCancelButton as (e: unknown) => void;
    expect(onCancelButton).toBeTypeOf("function");

    let prevented = false;
    onCancelButton({ preventDefault: () => (prevented = true) });
    expect(onRequestClose).toHaveBeenCalledTimes(1);
    expect(prevented).toBe(true);
  });
});
