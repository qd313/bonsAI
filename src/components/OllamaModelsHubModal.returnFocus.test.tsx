/**
 * Title: Cancel on the AI models screen still remembers which button opened it
 *
 * Purpose: Pin plan 76 lane 2, bug 3 (roadmap: 'Cancel on the AI models screen, with a model
 * queued, sends the ring to the tab rail'; evidence t75-3-Q2-SAFE-FIRST-TIER2.json). The shell hands
 * the ring back to the button that opened a popup by remembering that button's id when it was
 * pressed and using the id up on the popup's close. A box opened from inside this screen (the
 * "Enable Tier 2 before pulling?" box a queued model can raise) closes through the very same shell
 * close, which uses the id up first. By the time Cancel or Done closed the screen itself nothing was
 * remembered, so the ring went to the tab rail. The screen now reads which button opened it when it
 * opens, and puts that back before its own close whenever a box inside it has used it up.
 *
 * Does not: prove the ring moves on the device (jsdom has no Steam ring); that is the Deck row's job.
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
import {
  peekModalReturnFocus,
  rememberModalReturnFocus,
  resetModalReturnFocusRegistry,
  restoreModalReturnFocus,
} from "../features/plugin-shell/modalReturnFocusRegistry";

/** What the shell's close finds remembered at the moment the screen asks it to close. */
function draw(opts: { onCommit?: () => Promise<void> } = {}) {
  const seenAtClose: Array<string | null> = [];
  const props: OllamaModelsHubModalProps = {
    activeRoutingTag: null,
    modelPolicyTier: "open_source_only",
    modelPolicyNonFossUnlocked: false,
    modelAllowHighVramFallbacks: false,
    onCommitOllamaModelsHub: opts.onCommit ?? (async () => {}),
    onReadModelPolicy: vi.fn(),
    onClose: () => {
      seenAtClose.push(peekModalReturnFocus());
    },
  };
  render(<OllamaModelsHubModal {...props} />);
  return seenAtClose;
}

/** A box inside the screen closing runs the shell's restore, which uses the remembered id up. */
function aBoxInsideClosesThroughTheShell() {
  restoreModalReturnFocus();
  expect(peekModalReturnFocus()).toBeNull();
}

beforeEach(() => {
  resetModalReturnFocusRegistry();
  hoisted.pullModelsProps = null;
  hoisted.confirmModalProps = null;
});

describe("closing the AI models screen after a box inside it used up the remembered opener", () => {
  it("Cancel closes with the opener remembered again", () => {
    rememberModalReturnFocus("ollama-models-hub");
    const seenAtClose = draw();
    aBoxInsideClosesThroughTheShell();

    act(() => (hoisted.confirmModalProps?.onCancel as () => void)());

    expect(seenAtClose).toEqual(["ollama-models-hub"]);
  });

  it("the Browse screen's own Cancel does the same", () => {
    rememberModalReturnFocus("ollama-models-hub-settings");
    const seenAtClose = draw();
    aBoxInsideClosesThroughTheShell();

    act(() => (hoisted.pullModelsProps?.onCancel as () => void)());

    expect(seenAtClose).toEqual(["ollama-models-hub-settings"]);
  });

  it("Done does the same", async () => {
    rememberModalReturnFocus("ollama-models-hub");
    const seenAtClose = draw();
    aBoxInsideClosesThroughTheShell();

    await act(async () => (hoisted.confirmModalProps?.onOK as () => void)());

    expect(seenAtClose).toEqual(["ollama-models-hub"]);
  });
});

describe("closing without any box in between", () => {
  it("leaves the remembered opener alone", () => {
    rememberModalReturnFocus("ollama-models-hub");
    const seenAtClose = draw();

    act(() => (hoisted.confirmModalProps?.onCancel as () => void)());

    expect(seenAtClose).toEqual(["ollama-models-hub"]);
  });

  it("remembers nothing when no button opened the screen", () => {
    const seenAtClose = draw();

    act(() => (hoisted.confirmModalProps?.onCancel as () => void)());

    expect(seenAtClose).toEqual([null]);
  });
});
