/**
 * Title: Done does not save when nothing was reordered
 *
 * Purpose: Pins the fix for docs/test-evidence/plan57-QA-vision-try-order-writes-settings.json --
 * measured on the Deck 2026-09-17: opening the vision model try-order picker with one installed
 * model and pressing Done right away, with no Up/Down press, still rewrote the settings file (the
 * checksum and save time both changed). onSave used to run unconditionally from the modal's own
 * onOK; it now only runs when the order the person is looking at differs from the order the picker
 * opened with.
 *
 * Does not: cover the actual settings-file write, which is the caller's job (onSave is handed the
 * order and does whatever it wants with it) -- this only proves the modal itself no longer calls
 * onSave when nothing changed.
 *
 * `@decky/ui`'s ConfirmModal stub (fakeDeckyUi.tsx) deliberately drops `onOK`/`onCancel` before
 * they reach the DOM (spreading a function prop onto a div only earns a React warning), so there is
 * nothing in the rendered DOM to click. This file re-mocks ConfirmModal locally to capture the real
 * props from the most recently committed render, the same technique
 * PullModelsModal.filtersPanel.test.tsx already uses for Button.
 */
import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  confirmModalProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealConfirmModal = stubs.ConfirmModal;
  const CapturingConfirmModal = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function CapturingConfirmModal(props, ref) {
      React.useLayoutEffect(() => {
        hoisted.confirmModalProps.push(props);
      });
      return <RealConfirmModal {...props} ref={ref} />;
    }
  );
  return { ...stubs, ConfirmModal: CapturingConfirmModal };
});

import { ModelRoutingOrderModal, type ModelRoutingOrderModalProps } from "./ModelRoutingOrderModal";

function baseProps(overrides: Partial<ModelRoutingOrderModalProps> = {}): ModelRoutingOrderModalProps {
  const tags = ["gemma4:e2b-it-qat"];
  return {
    kind: "vision",
    installedTags: tags,
    catalogByTag: new Map(),
    modelPolicyTier: "non_foss",
    modelPolicyNonFossUnlocked: true,
    modelAllowHighVramFallbacks: true,
    savedOrder: tags,
    onSave: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

function latestConfirmModalProps(): Record<string, unknown> {
  const props = hoisted.confirmModalProps[hoisted.confirmModalProps.length - 1];
  expect(props).toBeTruthy();
  return props;
}

beforeEach(() => {
  hoisted.confirmModalProps = [];
});

afterEach(() => {
  cleanup();
});

describe("ModelRoutingOrderModal -- Done with nothing reordered", () => {
  it("does not call onSave when Done is pressed with only one model and no row ever moved", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<ModelRoutingOrderModal {...baseProps({ onSave, onClose })} />);

    const onOK = latestConfirmModalProps().onOK as () => void;
    onOK();

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("still calls onSave when a row was actually moved before Done", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const tags = ["model-a", "model-b"];
    const { container } = render(
      <ModelRoutingOrderModal {...baseProps({ kind: "text", installedTags: tags, savedOrder: tags, onSave, onClose })} />
    );

    const downBtn = container.querySelector('[aria-label="Move model-a down"]') as HTMLButtonElement;
    expect(downBtn).not.toBeNull();
    fireEvent.click(downBtn);

    const onOK = latestConfirmModalProps().onOK as () => void;
    onOK();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(["model-b", "model-a"]);
  });
});
