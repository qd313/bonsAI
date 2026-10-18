/**
 * Title: Chat slot rename modal tests
 * Purpose: Pin the Save-disabled-while-empty guard and the styled body hooks W14 added.
 * Used for: Coverage for redesign plan 28 W14 (board 8d -> A, flattened).
 * Solves: On-Deck row CHAT-SLOTS-V3-04 can confirm the cyan field and the pre-filled value, but
 *         clearing the field needs the Steam on-screen keyboard, so the empty branch — the one
 *         `bOKDisabled` exists for — cannot be reached by controller automation.
 * Does not: Cover the modal shell, footer or destructive styling; those are Steam's and are
 *           asserted on device instead.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { ChatSlotRenameModal } from "./ChatSlotRenameModal";

vi.mock("@decky/ui", async () => import("../../../test-harness/fakeDeckyUi"));

function renderModal(initialLabel: string) {
  return render(
    <ChatSlotRenameModal initialLabel={initialLabel} onCancel={() => {}} onConfirm={() => {}} />,
  );
}

function okDisabled(container: HTMLElement): string | null {
  const modal = container.querySelector('[data-decky-ui="ConfirmModal"]');
  return modal ? modal.getAttribute("data-ok-disabled") : null;
}

describe("ChatSlotRenameModal", () => {
  it("enables Save when the slot already has a name", () => {
    const { container } = renderModal("Deck tips");
    expect(okDisabled(container)).toBe("false");
  });

  it("disables Save when the name is empty", () => {
    const { container } = renderModal("");
    expect(okDisabled(container)).toBe("true");
  });

  it("disables Save when the name is only whitespace", () => {
    const { container } = renderModal("   ");
    expect(okDisabled(container)).toBe("true");
  });

  it("labels the field and keeps the body flat -- no inner glass panel", () => {
    const { container } = renderModal("Deck tips");
    expect(container.querySelector(".bonsai-chat-slot-modal-label")?.textContent).toBe("SLOT NAME");
    expect(container.querySelector(".bonsai-chat-slot-modal-field")).not.toBeNull();
    expect(container.querySelector(".bonsai-glass-panel")).toBeNull();
  });
});
