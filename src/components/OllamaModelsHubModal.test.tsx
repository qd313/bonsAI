/**
 * Title: The AI models screen — Done semantics after Policy folded into Filters
 *
 * Purpose: Pins plan 62, § 3d: the standalone Policy section and its chip are gone (folded into
 * PullModelsModal's own Filters panel), and Done has to keep doing what it always did for the
 * licence pick — save it — even though there is no longer a dedicated section whose own Done
 * press was the only thing that saved it. PullModelsModal is stubbed here on purpose: this file's
 * own contract (what Done does, which sections exist) does not need the real catalog table, the
 * RPC calls or the Filters panel behind it — those have their own coverage in
 * PullModelsModal.filtersPanel.test.tsx. ConfirmModal's fake never calls the real onOK/onCancel it
 * is given (its stub throws both away, matching Steam's own chrome living outside this file's
 * DOM), so this file captures them directly instead of trying to click a stub into firing them.
 *
 * Covers: no "Policy" chip in the section row any more; Done commits the licence/advanced draft
 * and closes when nothing is queued to pull; Done commits the draft AND hands off to the queued
 * pull once something is (closing the gap noted in OllamaModelsHubModal's own "Gotchas": before
 * this, a tier change made while Browse had nothing queued was never saved at all).
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

function buildProps(overrides: Partial<OllamaModelsHubModalProps> = {}): OllamaModelsHubModalProps {
  return {
    activeRoutingTag: null,
    modelPolicyTier: "open_source_only",
    modelPolicyNonFossUnlocked: false,
    modelAllowHighVramFallbacks: false,
    onCommitOllamaModelsHub: vi.fn(),
    onReadModelPolicy: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  hoisted.pullModelsProps = null;
  hoisted.confirmModalProps = null;
});

describe("no standalone Policy section any more", () => {
  it("the section row offers only Browse & pull and Advanced", () => {
    const { container } = render(<OllamaModelsHubModal {...buildProps()} />);
    const chipLabels = Array.from(container.querySelectorAll(".bonsai-models-hub-chip")).map((el) => el.textContent);
    expect(chipLabels).toEqual(["Browse & pull", "Advanced"]);
  });

  it('initialSection "policy" lands on Browse with the Filters panel already open, not a missing section', () => {
    render(<OllamaModelsHubModal {...buildProps({ initialSection: "policy" })} />);
    expect(hoisted.pullModelsProps?.initialFiltersOpen).toBe(true);
  });

  it('initialSection "browse" does not force the Filters panel open', () => {
    render(<OllamaModelsHubModal {...buildProps({ initialSection: "browse" })} />);
    expect(hoisted.pullModelsProps?.initialFiltersOpen).toBe(false);
  });
});

describe("Done saves the licence + advanced draft", () => {
  it("commits the draft and closes when Browse has nothing queued to pull", async () => {
    const onCommitOllamaModelsHub = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<OllamaModelsHubModal {...buildProps({ onCommitOllamaModelsHub, onClose })} />);

    // The Licence pick inside PullModelsModal's Filters panel calls this straight through —
    // exactly the callback the old Policy buttons used.
    act(() => {
      (hoisted.pullModelsProps?.onSelectModelPolicyTier as (t: string) => void)?.("open_weight");
      (hoisted.pullModelsProps?.onFooterStateChange as (s: unknown) => void)?.({
        okText: "Pull selected",
        onOk: vi.fn(),
        okDisabled: true,
        hasQueuedPull: false,
      });
    });

    expect(hoisted.confirmModalProps?.strOKButtonText).toBe("Done");
    act(() => {
      (hoisted.confirmModalProps?.onOK as () => void)();
    });

    expect(onCommitOllamaModelsHub).toHaveBeenCalledWith(
      expect.objectContaining({ modelPolicyTier: "open_weight" })
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(onClose).toHaveBeenCalled();
  });

  it("commits the draft AND pulls once something is queued, instead of only closing", async () => {
    const onCommitOllamaModelsHub = vi.fn().mockResolvedValue(undefined);
    const onOk = vi.fn();
    const onClose = vi.fn();
    render(<OllamaModelsHubModal {...buildProps({ onCommitOllamaModelsHub, onClose })} />);

    act(() => {
      (hoisted.pullModelsProps?.onFooterStateChange as (s: unknown) => void)?.({
        okText: "Pull selected (1) · 2 GB",
        onOk,
        okDisabled: false,
        hasQueuedPull: true,
      });
    });

    expect(hoisted.confirmModalProps?.strOKButtonText).toBe("Pull selected (1) · 2 GB");
    act(() => {
      (hoisted.confirmModalProps?.onOK as () => void)();
    });

    expect(onCommitOllamaModelsHub).toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();
    expect(onOk).toHaveBeenCalled();
    // Pulling is PullModelsModal's own job to report back through onPullAccepted; Done itself
    // must not also close the hub out from under an in-flight pull.
    expect(onClose).not.toHaveBeenCalled();
  });
});
