/**
 * Title: B while typing a model name by hand closes just that field, not the whole screen
 *
 * Purpose: Pins the fix for a bug found reading the code 2026-09-20 -- typing a name by hand opens
 * a small row on the Filters row (the field, a Pull button, and a close "x"), and nothing in that
 * row used to handle B. A B press there fell straight through to the screen's own Cancel and closed
 * the whole picker, losing whatever had been typed. The Filters panel right next to it already
 * carries exactly this handler (`cancelClosesFiltersPanel`) for exactly this reason -- this fix
 * gives the custom-tag row the same one, wired once on the row's own `Focusable` wrapper
 * (`onCancelButton`) rather than on each of the three controls inside it.
 *
 * Does not: prove what Steam's own on-screen keyboard does with B while it is up over the field --
 * that can only be settled on the Deck (noted in the lane brief). This only proves the row itself
 * now answers B when it reaches it.
 *
 * The fake Decky UI harness strips onCancelButton (and every other Steam nav prop) before it
 * reaches the DOM, so it has to be read off the unrendered React element -- the same `Harness`
 * trick `PullModelsModal.gamepadOK.test.tsx` and `MainTabAskModeMenuPopover.test.tsx` already use,
 * since PullModelsModal calls real hooks and cannot be called as a bare, hookless function.
 */
import React from "react";
import { cleanup, render, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Focusable } from "@decky/ui";

import { PullModelsModal, type PullModelsModalProps } from "./PullModelsModal";

let lastTree: React.ReactNode = null;
function Harness(props: PullModelsModalProps) {
  lastTree = PullModelsModal(props);
  return lastTree;
}

/** The first `Focusable` element in a captured tree carrying this exact className. */
function findFocusableByClassName(node: React.ReactNode, className: string): React.ReactElement | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findFocusableByClassName(child, className);
      if (found) return found;
    }
    return null;
  }
  if (!React.isValidElement(node)) return null;
  const props = node.props as Record<string, unknown>;
  if (node.type === Focusable && props.className === className) return node;
  return findFocusableByClassName(props.children as React.ReactNode, className);
}

function buildProps(overrides: Partial<PullModelsModalProps> = {}): PullModelsModalProps {
  return {
    activeRoutingTag: null,
    onCancel: vi.fn(),
    onPullAccepted: vi.fn(),
    embedded: true,
    ...overrides,
  };
}

describe("PullModelsModal -- B while typing a model name closes just that row", () => {
  afterEach(() => {
    cleanup();
    lastTree = null;
  });

  it("gives the custom-tag row an onCancelButton that closes only the field", async () => {
    const onCancel = vi.fn();
    const { container } = render(<Harness {...buildProps({ onCancel })} />);

    const chip = await waitFor(() => {
      const el = container.querySelector('[aria-label="Type a model name by hand"]');
      expect(el).not.toBeNull();
      return el as HTMLButtonElement;
    });
    fireEvent.click(chip);

    await waitFor(() => {
      expect(container.querySelector('[data-decky-ui="TextField"]')).not.toBeNull();
    });

    const row = findFocusableByClassName(lastTree, "bonsai-pullmodels-custom-tag-row");
    expect(row).toBeTruthy();
    const onCancelButton = (row!.props as Record<string, unknown>).onCancelButton as
      | ((evt: unknown) => boolean)
      | undefined;
    expect(typeof onCancelButton).toBe("function");

    onCancelButton!({});

    // Closes just the row: the field disappears and the chip comes back, but the screen-level
    // Cancel (which would close the whole picker) is never called.
    await waitFor(() => {
      expect(container.querySelector('[data-decky-ui="TextField"]')).toBeNull();
      expect(container.querySelector('[aria-label="Type a model name by hand"]')).not.toBeNull();
    });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
