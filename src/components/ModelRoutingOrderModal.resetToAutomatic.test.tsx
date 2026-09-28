/**
 * Title: "Reset to defaults" goes back to automatic, not to a saved copy of the defaults
 *
 * Purpose: Pins the fix for docs/test-evidence/plan70-ROUTING-01-02.json -- on the Deck
 * 2026-09-26 the text try order started out empty (automatic, as on a fresh install); Reset to
 * defaults, then Done, saved an explicit two-model list instead. Same order on screen, but the
 * setting no longer followed the defaults: a model pulled later, or a changed default list, would
 * not reach it. Done after Reset now saves an empty list, which is what "automatic" is.
 *
 * Does not: cover the settings-file write (the caller's onSave), or Reset's own focus handling.
 * Uses the same local ConfirmModal re-mock as ModelRoutingOrderModal.doneNoop.test.tsx, for the
 * same reason: the shared stub drops onOK before it reaches the DOM.
 */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

const TAGS = ["model-a", "model-b"];

function renderPicker(overrides: Partial<ModelRoutingOrderModalProps>) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ModelRoutingOrderModal
      kind="text"
      installedTags={TAGS}
      catalogByTag={new Map()}
      modelPolicyTier="non_foss"
      modelPolicyNonFossUnlocked
      modelAllowHighVramFallbacks
      savedOrder={[]}
      onSave={onSave}
      onClose={onClose}
      {...overrides}
    />
  );
  return { ...view, onSave, onClose };
}

function pressDone() {
  const props = hoisted.confirmModalProps[hoisted.confirmModalProps.length - 1];
  expect(props).toBeTruthy();
  (props.onOK as () => void)();
}

function pressReset() {
  fireEvent.click(screen.getByText("Reset to defaults"));
}

function pressDown(container: HTMLElement, tag: string) {
  const btn = container.querySelector(`[aria-label="Move ${tag} down"]`) as HTMLButtonElement;
  expect(btn).not.toBeNull();
  fireEvent.click(btn);
}

beforeEach(() => {
  hoisted.confirmModalProps = [];
});

afterEach(() => {
  cleanup();
});

describe("ModelRoutingOrderModal -- Reset to defaults", () => {
  it("the Deck case: a saved order, Reset, Done saves automatic (an empty list)", () => {
    const { onSave } = renderPicker({ savedOrder: ["model-b", "model-a"] });
    pressReset();
    pressDone();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith([]);
  });

  it("saves automatic even when the saved order already matched the defaults", () => {
    const { onSave } = renderPicker({ savedOrder: [...TAGS] });
    pressReset();
    pressDone();
    expect(onSave).toHaveBeenCalledWith([]);
  });

  it("already automatic: moved, then Reset, then Done writes nothing", () => {
    const { container, onSave, onClose } = renderPicker({ savedOrder: [] });
    pressDown(container, "model-a");
    pressReset();
    pressDone();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("a row moved after Reset cancels the Reset: back on the saved order, nothing is written", () => {
    const { container, onSave, onClose } = renderPicker({ savedOrder: ["model-b", "model-a"] });
    pressReset();
    pressDown(container, "model-a");
    pressDone();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("a row moved after Reset to a new order is saved as that list", () => {
    const tags = ["model-a", "model-b", "model-c"];
    const { container, onSave } = renderPicker({
      installedTags: tags,
      savedOrder: ["model-c", "model-b", "model-a"],
    });
    pressReset();
    pressDown(container, "model-a");
    pressDone();
    expect(onSave).toHaveBeenCalledWith(["model-b", "model-a", "model-c"]);
  });
});
