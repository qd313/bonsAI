/**
 * Title: Cancel on the AI models screen leaves the saved licence setting as it was on opening
 *
 * Purpose: Pin plan 76 lane 2 round 3, bug 2 (roadmap: 'After Cancel on the AI models screen, the
 * saved licence setting and the screen disagree'; docs/test-evidence/plan76-P76-TIER2-MODEL-SAFE-FIRST.json).
 * Licence picks in the Filters panel are a draft until Done -- except that "Pull selected" saves the
 * draft first, because the pull that follows needs it. Decline the pull's own box, press Cancel, and
 * the file kept the new licence while the reopened screen (which reads the value held when the tab was
 * rebuilt) showed the old one. Cancel already throws away every other draft on this screen, so it now
 * also puts back what "Pull selected" saved: Cancel means "as it was when I opened this".
 *
 * Does not: prove the file on the device; that is the Deck row's job.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  pullModelsProps: null as Record<string, unknown> | null,
  confirmModalProps: null as Record<string, unknown> | null,
}));

vi.mock("./PullModelsModal", () => ({
  PullModelsModal: (props: Record<string, unknown>) => {
    hoisted.pullModelsProps = props;
    return <div data-testid="pull-models-modal-stub" />;
  },
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealConfirmModal = stubs.ConfirmModal;
  const CapturingConfirmModal = (props: Record<string, unknown>) => {
    React.useLayoutEffect(() => {
      hoisted.confirmModalProps = props;
    });
    return <RealConfirmModal {...props} />;
  };
  return { ...stubs, ConfirmModal: CapturingConfirmModal };
});

import { OllamaModelsHubModal, type OllamaModelsHubModalProps } from "./OllamaModelsHubModal";

function draw(overrides: Partial<OllamaModelsHubModalProps> = {}) {
  const commit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <OllamaModelsHubModal
      activeRoutingTag={null}
      modelPolicyTier="open_weight"
      modelPolicyNonFossUnlocked={false}
      modelAllowHighVramFallbacks={false}
      onCommitOllamaModelsHub={commit}
      onReadModelPolicy={vi.fn()}
      onClose={onClose}
      {...overrides}
    />
  );
  return { commit, onClose };
}

/** The Filters panel picks a licence, a model is queued, and Pull selected (the footer OK) is pressed. */
async function pickOpenSourceQueueAndPressPullSelected(onOk = vi.fn()) {
  act(() => {
    (hoisted.pullModelsProps?.onSelectModelPolicyTier as (t: string) => void)("open_source_only");
    (hoisted.pullModelsProps?.onFooterStateChange as (s: unknown) => void)({
      okText: "Pull selected (1)",
      onOk,
      okDisabled: false,
      hasQueuedPull: true,
    });
  });
  await act(async () => (hoisted.confirmModalProps?.onOK as () => void)());
  return onOk;
}

beforeEach(() => {
  hoisted.pullModelsProps = null;
  hoisted.confirmModalProps = null;
});

describe("Cancel after Pull selected saved the licence", () => {
  it("puts the licence back as it was when the screen opened, then closes", async () => {
    const { commit, onClose } = draw();
    await pickOpenSourceQueueAndPressPullSelected();
    expect(commit).toHaveBeenLastCalledWith(expect.objectContaining({ modelPolicyTier: "open_source_only" }));

    await act(async () => (hoisted.confirmModalProps?.onCancel as () => void)());

    expect(commit).toHaveBeenLastCalledWith({
      modelPolicyTier: "open_weight",
      modelPolicyNonFossUnlocked: false,
      modelAllowHighVramFallbacks: false,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the Browse screen's own Cancel does the same", async () => {
    const { commit, onClose } = draw();
    await pickOpenSourceQueueAndPressPullSelected();

    await act(async () => (hoisted.pullModelsProps?.onCancel as () => void)());

    expect(commit).toHaveBeenLastCalledWith(expect.objectContaining({ modelPolicyTier: "open_weight" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Cancel when nothing was saved", () => {
  it("saves nothing: a draft that was never saved is simply dropped", async () => {
    const { commit, onClose } = draw();
    act(() => {
      (hoisted.pullModelsProps?.onSelectModelPolicyTier as (t: string) => void)("open_source_only");
    });

    await act(async () => (hoisted.confirmModalProps?.onCancel as () => void)());

    expect(commit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
