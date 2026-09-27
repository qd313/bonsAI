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
