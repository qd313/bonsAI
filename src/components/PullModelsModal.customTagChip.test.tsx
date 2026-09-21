/**
 * Title: "Type a model name" as a chip on the Filters row
 *
 * Purpose: Pins plan 62, § 3e #4 -- the typed-tag entry (a text field and a Pull button) used to
 * be its own permanent row above Filters. It is now one chip sharing the Filters row instead, and
 * pressing it swaps that same row over to the field. The cost named in the brief is real and
 * worth pinning: one extra press to reach the field that used to be visible immediately.
 *
 * Covers: the chip is what's shown by default (not the field); pressing it reveals the field and
 * moves the ring to the Pull button; the "×" close button collapses back to the chip and returns
 * the ring to it. Does not cover the field collapsing again after a *successful* pull -- like
 * PullModelsModal.test.tsx's own custom-tag suite notes, the stubbed TextField renders as a plain
 * `<div>` and never delivers a real onChange, so actually typing a tag is on-Deck-only coverage;
 * this file only proves the two states this chip toggles between and the ring landing correctly
 * in each direction.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, fireEvent, render, waitFor } from "@testing-library/react";

// See PullModelsModal.filtersPanel.test.tsx's own note on this: these assertions wait on a
// requestAnimationFrame-scheduled focus move, and the default 1000ms waitFor window measured
// flaky under the full related-test run (many jsdom environments sharing one worker), not because
// the focus move itself was ever wrong.
configure({ asyncUtilTimeout: 10000 });

const hoisted = vi.hoisted(() => ({
  buttonProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealButton = stubs.Button;
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
    function CapturingButton(props, ref) {
      React.useLayoutEffect(() => {
        hoisted.buttonProps.push(props);
      });
      return <RealButton {...props} ref={ref} />;
    }
  );
  return { ...stubs, Button: CapturingButton };
});

import { PullModelsModal } from "./PullModelsModal";

function renderModal(overrides: Partial<React.ComponentProps<typeof PullModelsModal>> = {}) {
  return render(
    <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded {...overrides} />
  );
}

beforeEach(() => {
  hoisted.buttonProps = [];
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe('"Type a model name" starts as a chip, not a field', () => {
  it("shows the chip and no text field until pressed", () => {
    const { container } = renderModal();
    expect(container.querySelector('[aria-label="Type a model name by hand"]')).not.toBeNull();
    expect(container.querySelector('[data-decky-ui="TextField"]')).toBeNull();
    expect(container.querySelector('[aria-label="Pull custom model tag"]')).toBeNull();
  });

  it("pressing the chip reveals the field and Pull button, and moves the ring to the close button", async () => {
    const { container } = renderModal();
    const chip = container.querySelector('[aria-label="Type a model name by hand"]') as HTMLButtonElement;

    fireEvent.click(chip);

    await waitFor(() => {
      expect(container.querySelector('[data-decky-ui="TextField"]')).not.toBeNull();
      const pullBtn = container.querySelector('[aria-label="Pull custom model tag"]');
      expect(pullBtn).not.toBeNull();
      // Not Pull -- it starts disabled (nothing typed yet), and a disabled button cannot take
      // focus. The close button is never disabled, so that is where the ring actually lands.
      const closeBtn = container.querySelector('[aria-label="Close typing a model name by hand"]');
      expect(document.activeElement).toBe(closeBtn);
    });
    // The Filters button is not part of the DOM while the field is showing -- same row, one or
    // the other, never both, which is the whole point of not costing back the row's height.
    expect(container.querySelector(".bonsai-pullmodels-filters-button")).toBeNull();
  });
});

describe('"×" collapses the field back to the chip', () => {
  it("closing returns the ring to the chip and hides the field again", async () => {
    const { container } = renderModal();
    fireEvent.click(container.querySelector('[aria-label="Type a model name by hand"]') as HTMLButtonElement);

    await waitFor(() => {
      expect(container.querySelector('[data-decky-ui="TextField"]')).not.toBeNull();
    });

    const closeBtn = container.querySelector(
      '[aria-label="Close typing a model name by hand"]'
    ) as HTMLButtonElement;
    fireEvent.click(closeBtn);

    await waitFor(() => {
      const chip = container.querySelector('[aria-label="Type a model name by hand"]');
      expect(chip).not.toBeNull();
      expect(document.activeElement).toBe(chip);
      expect(container.querySelector('[data-decky-ui="TextField"]')).toBeNull();
    });
  });
});
