/**
 * Title: B while typing a model name by hand closes just that field, not the whole screen
 *
 * Purpose: Pins the fix for a bug found reading the code 2026-09-20 -- typing a name by hand opens
 * a small row (the field, a Pull button, and a close "x"), and nothing in that row used to handle B.
 * A B press there fell straight through to the screen's own Cancel and closed the whole picker,
 * losing whatever had been typed. The row carries its own B handler, wired once on its `Focusable`
 * wrapper (`onCancelButton`) rather than on each of the three controls inside it. Since plan 91 the
 * row lives at the foot of the filters column (PullModelsCustomTagEntry.tsx); it is the one thing in
 * the column that claims B.
 *
 * Does not: prove what Steam's own on-screen keyboard does with B while it is up over the field --
 * that can only be settled on the Deck. This only proves the row itself answers B when it reaches it.
 *
 * The fake Decky UI harness strips onCancelButton (and every other Steam nav prop) before it reaches
 * the DOM, so the test's own `Focusable` keeps the props it was drawn with, by element.
 */
import React from "react";
import { cleanup, render, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ propsByEl: new WeakMap<Element, Record<string, unknown>>() }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealFocusable = stubs.Focusable;
  const CapturingFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function CapturingFocusable(props, ref) {
    const own = React.useRef<HTMLDivElement | null>(null);
    React.useLayoutEffect(() => {
      if (own.current) hoisted.propsByEl.set(own.current, props);
    });
    return (
      <RealFocusable
        {...props}
        ref={(el: HTMLDivElement | null) => {
          own.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
      />
    );
  });
  return { ...stubs, Focusable: CapturingFocusable };
});

import { PullModelsModal } from "./PullModelsModal";
import { resetPullModelsBoxMemory } from "./pullModelsBoxMemory";

describe("PullModelsModal -- B while typing a model name closes just that row", () => {
  beforeEach(() => resetPullModelsBoxMemory());
  afterEach(() => cleanup());

  it("gives the custom-tag row an onCancelButton that closes only the field", async () => {
    const onCancel = vi.fn();
    const { container } = render(
      <PullModelsModal activeRoutingTag={null} onCancel={onCancel} onPullAccepted={vi.fn()} embedded />
    );

    const chip = await waitFor(() => {
      const el = container.querySelector('[aria-label="Type a model name by hand"]');
      expect(el).not.toBeNull();
      return el as HTMLButtonElement;
    });
    fireEvent.click(chip);

    const row = await waitFor(() => {
      const el = container.querySelector(".bonsai-pullmodels-custom-tag-row");
      expect(el).not.toBeNull();
      return el!;
    });
    expect(container.querySelector(".bonsai-pullmodels-filtercol")!.contains(row)).toBe(true);
    const onCancelButton = hoisted.propsByEl.get(row)?.onCancelButton as ((evt: unknown) => boolean) | undefined;
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
