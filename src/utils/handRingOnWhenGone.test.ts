/**
 * Title: A control that removes itself hands the ring on
 * Purpose: Pin the fix for plan 70 flow L5.2 (docs/test-evidence/plan70-L5-PERMS-CLEAN-06.json):
 *          A on the troubleshooting hint's Dismiss removed the hint, and nothing held the ring
 *          afterwards; the next Down placed it on the ban-lookup row. The shared helper is the same
 *          one Helpful uses (buildReplyActionsElement.tsx).
 * Used for: handRingOnWhenGone.ts and chatTranscriptNavHelpers.ts's dismissHintKeepingRing.
 * Does not: Prove the fix on the Deck (see the commit for the check it owes).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dismissHintKeepingRing } from "./chatTranscriptNavHelpers";
import { registerNavFocus, resetNavFocusRegistry } from "./navFocusRegistry";
import { resetUiDocument } from "./uiDocument";
import { setSlotShowsLine } from "../features/details-slot/detailsSlotStore";

function fakeNavHolder() {
  return { current: { TakeFocus: vi.fn(() => true) } };
}

/* The hint's two buttons; `dismiss` removes both, the way the hint unmounting does. */
function mountHint() {
  const open = document.createElement("button");
  const dismissBtn = document.createElement("button");
  document.body.append(open, dismissBtn);
  const buttons = { current: [open, dismissBtn] as (HTMLElement | null)[] };
  const dismiss = vi.fn(() => {
    open.remove();
    dismissBtn.remove();
  });
  return { dismissBtn, buttons, dismiss };
}

beforeEach(() => {
  resetNavFocusRegistry();
  resetUiDocument();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

describe("Dismiss on the troubleshooting hint", () => {
  it("hands the ring to the ban-lookup row below when the hint goes away", () => {
    const { dismissBtn, buttons, dismiss } = mountHint();
    const deny = fakeNavHolder();
    registerNavFocus("chat-perm-hint-deny", deny);
    dismissBtn.focus();

    dismissHintKeepingRing(buttons, dismiss);
    vi.runAllTimers();

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(deny.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  it("falls through to the chips when the ban-lookup row is not showing", () => {
    const { dismissBtn, buttons, dismiss } = mountHint();
    const chips = fakeNavHolder();
    registerNavFocus("preset-carousel", chips);
    dismissBtn.focus();

    dismissHintKeepingRing(buttons, dismiss);
    vi.runAllTimers();

    expect(chips.current.TakeFocus).toHaveBeenCalledWith(true);
  });

  it("falls through to the Show details line when it stands in the chip's slot, not to the hidden chips", () => {
    // Plan 79 (helper AA's finding): while an answer is read, the slot above the question box shows the
    // Show details line and the chips are hidden. The old hand-off named the chip row, so the ring went
    // to chips no one could see.
    const { dismissBtn, buttons, dismiss } = mountHint();
    const chips = fakeNavHolder();
    const line = fakeNavHolder();
    registerNavFocus("preset-carousel", chips);
    registerNavFocus("details-slot-line", line);
    setSlotShowsLine(true);
    dismissBtn.focus();

    dismissHintKeepingRing(buttons, dismiss);
    vi.runAllTimers();
    setSlotShowsLine(false);

    expect(line.current.TakeFocus).toHaveBeenCalledWith(true);
    expect(chips.current.TakeFocus).not.toHaveBeenCalled();
  });

  it("moves nothing when the ring was not on Dismiss (a touch press)", () => {
    const { buttons, dismiss } = mountHint();
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    const deny = fakeNavHolder();
    registerNavFocus("chat-perm-hint-deny", deny);

    dismissHintKeepingRing(buttons, dismiss);
    vi.runAllTimers();

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(deny.current.TakeFocus).not.toHaveBeenCalled();
  });
});
