/**
 * Title: Chat transcript permission-hint focus tests
 * Purpose: Cover the D-pad Down/Up chain between the reply utility row, the troubleshooting Ask
 *          hint row and the session context strip.
 * Used for: MainTabChatTranscript.tsx focus-graph regression coverage.
 * Solves: Neither permission-hint row was in the Down chain before the first fix — Down from Retry
 *         or Copy jumped straight to the session context strip and skipped both (filed 2026-09-03,
 *         roadmap: "The Open Permissions button under a blocked reply is not a D-pad stop";
 *         runs/PERM-JUMP-01-a-find-open-permissions.json). That first fix (a registered button
 *         handle plus `focusDeckOwner`) measured wrong on device 2026-09-04 (build 49241e7,
 *         PERM-JUMP-01): the DOM focus moved but Steam's ring did not follow across the container
 *         boundary, and separately the defensive `tabindex` stamp corrupted the wrapping Focusable
 *         (Steam's real Focusables carry no `tabindex` attribute on device, so "stamp only when
 *         absent" fired every time). `focusChatPermissionHintRow` is now `takeNavFocus` only against
 *         two registered nav ids — tested here through the real `navFocusRegistry`, a fake nav node
 *         standing in for whatever Steam would have populated `navRef.current` with, exactly like
 *         useMainTabAskBarFocus.test.ts's "uses Steam's own transfer" case — never a page query or a
 *         DOM `.focus()` call.
 * Does not: Prove the fix on-device. The Deck check this owes is PERM-JUMP-01 / SMOKE-C.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

import {
  focusChatPermissionHintRow,
  focusDownFromReplyUtilityRowOrPermHint,
} from "./MainTabChatTranscript";
import { registerNavFocus, resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";

function mount(html: string): void {
  document.body.innerHTML = html;
}

/** Stands in for whatever Steam populates a `navRef.current` with once a Focusable mounts. */
function fakeNavHolder(result = true) {
  return { current: { TakeFocus: vi.fn(() => result) } };
}

beforeEach(() => {
  resetNavFocusRegistry();
});

afterEach(() => {
  document.body.innerHTML = "";
  resetNavFocusRegistry();
});

describe("focusChatPermissionHintRow", () => {
  it("returns false when neither permission-hint row is registered", () => {
    expect(focusChatPermissionHintRow()).toBe(false);
  });

  it("hands focus to the troubleshooting hint's registered nav node via TakeFocus", () => {
    const hint = fakeNavHolder();
    registerNavFocus("chat-perm-hint-troubleshoot", hint);

    expect(focusChatPermissionHintRow()).toBe(true);
    expect(hint.current.TakeFocus).toHaveBeenCalledWith(true);
  });

});

describe("focusDownFromReplyUtilityRowOrPermHint", () => {
  it("still prefers this turn's own chip ladder over the permission-hint rows", () => {
    mount(`
      <div class="bonsai-chat-turn-slot">
        <div class="bonsai-chip-ladder"><button type="button">Ladder</button></div>
      </div>
    `);
    registerNavFocus("chat-perm-hint-troubleshoot", fakeNavHolder());
    const slot = document.querySelector<HTMLElement>(".bonsai-chat-turn-slot");
    expect(focusDownFromReplyUtilityRowOrPermHint(slot)).toBe(true);
    expect(document.activeElement?.textContent).toBe("Ladder");
  });

  it("falls back to the session context strip when no permission-hint row is registered either", () => {
    mount(`
      <div class="bonsai-chat-turn-slot"></div>
      <div class="bonsai-session-context-strip"></div>
    `);
    const slot = document.querySelector<HTMLElement>(".bonsai-chat-turn-slot");
    expect(focusDownFromReplyUtilityRowOrPermHint(slot)).toBe(true);
    expect(document.activeElement?.classList.contains("bonsai-session-context-strip")).toBe(true);
  });
});
