/**
 * Title: The AI models box can only be open once
 *
 * Purpose: Pins plan 92's second night (lane M2, piece 4). On the Deck's own screen two AI models boxes
 * were open at once, one stacked under the other (plan92-P92-M-MODELS-MAP.json: B closed the top one
 * and the ring landed on Clear in a second box, opened from "Browse models..." while the person had
 * pressed "AI models"). Every button that opens the box calls the shell's one opener, so the opener
 * now does nothing while a box is open or just asked for: two requests in a row give one box, and
 * once the box has closed (by Done, Cancel, or any way that takes it off the page) the next request
 * opens it again.
 *
 * How it models the Deck: `showModal` draws the box on the page and returns a handle whose Close
 * takes it off, as Decky's does; the box itself is stubbed down to its own frame (the list inside it
 * is not what this test is about).
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  shown: [] as Array<{ unmount: () => void }>,
  hubProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("./pull-box/PullModelsModal", () => ({ PullModelsModal: () => <div data-testid="browse-stub" /> }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const RealConfirm = stubs.ConfirmModal;
  const CapturingConfirm = (props: Record<string, unknown>) => {
    React.useLayoutEffect(() => {
      hoisted.hubProps.push(props);
    });
    return <RealConfirm {...props} />;
  };
  return {
    ...stubs,
    ConfirmModal: CapturingConfirm,
    /** Decky's showModal: the box goes onto the page now; Close takes it off. */
    showModal: (el: React.ReactElement) => {
      const view = render(el);
      hoisted.shown.push(view);
      return { Close: () => view.unmount(), Update: () => {} };
    },
  };
});

import { useOllamaModelsHubModal, type UseOllamaModelsHubModalArgs } from "./useOllamaModelsHubModal";

const args: UseOllamaModelsHubModalArgs = {
  modelPolicyTier: "open_source_only",
  modelPolicyNonFossUnlocked: false,
  modelAllowHighVramFallbacks: false,
  setModelPolicyTier: () => {},
  setModelPolicyNonFossUnlocked: () => {},
  setModelAllowHighVramFallbacks: () => {},
  activeRoutingTag: null,
  tryOrderHost: {
    ollamaLocalOnDeck: true,
    ollamaIp: "",
    textModelRoutingOrder: [],
    visionModelRoutingOrder: [],
    modelAllowHighVramFallbacks: false,
  },
  buildSettingsPayload: (p) => p ?? {},
  hydrateFromSettings: () => {},
  pauseDebouncedSettingsSave: async () => {},
  goToOllamaTab: () => {},
  openModelPolicyReadme: () => {},
  captureSessionBeforeModal: () => {},
  // The shell's close: here it simply runs the box's own Close.
  finalizeShowModalAndRestoreActiveTab: (close) => close(),
};

/** How many AI models boxes are on the page now. */
const boxesOnPage = () => document.querySelectorAll(".bonsai-models-hub-shell").length;

beforeEach(() => {
  hoisted.shown = [];
  hoisted.hubProps = [];
});

afterEach(() => {
  for (const view of hoisted.shown) {
    try {
      view.unmount();
    } catch {
      /* already closed */
    }
  }
  document.body.innerHTML = "";
});

describe("the AI models box opens once", () => {
  it("two open requests in a row give one box", () => {
    const { result } = renderHook(() => useOllamaModelsHubModal(args));
    act(() => {
      result.current.openOllamaModelsHub(); // "AI models"
      result.current.openOllamaModelsHub(); // "Browse models..." reached by the same press
    });
    expect(boxesOnPage()).toBe(1);
    act(() => result.current.openOllamaModelsHub()); // and a later press while it is still open
    expect(boxesOnPage()).toBe(1);
    expect(hoisted.shown).toHaveLength(1);
  });

  it("opens again once the box has closed, by Cancel or by anything that takes it off the page", () => {
    const { result } = renderHook(() => useOllamaModelsHubModal(args));
    act(() => result.current.openOllamaModelsHub());
    expect(boxesOnPage()).toBe(1);
    // Cancel (B): the box closes through the shell.
    act(() => (hoisted.hubProps[hoisted.hubProps.length - 1].onCancel as () => void)());
    expect(boxesOnPage()).toBe(0);
    act(() => result.current.openOllamaModelsHub());
    expect(boxesOnPage()).toBe(1);
    // Taken off the page some other way (Steam closing its popups): the next request still opens it.
    act(() => hoisted.shown[hoisted.shown.length - 1].unmount());
    expect(boxesOnPage()).toBe(0);
    act(() => result.current.openOllamaModelsHub());
    expect(boxesOnPage()).toBe(1);
  });
});
