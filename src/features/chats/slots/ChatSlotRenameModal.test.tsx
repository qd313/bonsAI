/**
 * Title: Chat slot rename modal tests
 * Purpose: Pin the Save-disabled-while-empty guard and the styled body hooks W14 added.
 * Used for: Coverage for redesign plan 28 W14 (board 8d -> A, flattened).
 * Solves: On-Deck row CHAT-SLOTS-V3-04 can confirm the cyan field and the pre-filled value, but
 *         clearing the field needs the Steam on-screen keyboard, so the empty branch — the one
 *         `bOKDisabled` exists for — cannot be reached by controller automation.
 *         Also pins plan 97 L10-fix: when the box opens, the name field's own Steam nav node is asked
 *         to take the ring with the gamepad flag, so A on the field is A on Steam's own focused field.
 * Does not: Cover the modal shell, footer or destructive styling; those are Steam's and are
 *           asserted on device instead. Whether Steam's keyboard then shows is the Deck's to prove.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { ChatSlotRenameModal } from "./ChatSlotRenameModal";

/*
 * Steam fills a TextField's `navRef` with the field's own nav node once it joins the focus tree. The
 * stub drops `navRef`, so this one stands in for Steam: it hands whatever `fieldNode` holds to the
 * holder the box passed, the way the real field does on device.
 */
let fieldNode: { TakeFocus?: (gamepad?: boolean) => unknown } | null = null;
vi.mock("@decky/ui", async () => {
  const fake = await import("../../../test-harness/fakeDeckyUi");
  return {
    ...fake,
    TextField: (props: Record<string, unknown>) => {
      const holder = props.navRef as { current: unknown } | undefined;
      if (holder) holder.current = fieldNode;
      return <input data-decky-ui="TextField" defaultValue={String(props.value ?? "")} />;
    },
  };
});

afterEach(() => {
  fieldNode = null;
  document.body.innerHTML = "";
});

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

  it("hands Steam's ring to the name field with the gamepad flag when the box opens", () => {
    const takeFocus = vi.fn(() => true);
    fieldNode = { TakeFocus: takeFocus };
    renderModal("Deck tips");
    expect(takeFocus).toHaveBeenCalledTimes(1);
    expect(takeFocus).toHaveBeenCalledWith(true);
  });

  it("changes nothing else when Steam refuses the hand-off", () => {
    const decoy = document.createElement("button");
    document.body.appendChild(decoy);
    decoy.focus();
    const takeFocus = vi.fn(() => false);
    fieldNode = { TakeFocus: takeFocus };
    expect(() => renderModal("Deck tips")).not.toThrow();
    expect(takeFocus).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(decoy);
  });

  it("does not throw when the field's Steam node is missing or the hand-off throws", () => {
    fieldNode = null;
    expect(() => renderModal("Deck tips")).not.toThrow();
    fieldNode = {
      TakeFocus: () => {
        throw new Error("Steam said no");
      },
    };
    expect(() => renderModal("Deck tips")).not.toThrow();
  });
});
