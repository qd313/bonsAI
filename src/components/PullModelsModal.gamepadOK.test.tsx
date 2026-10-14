/**
 * Title: Every button on the Pull models picker answers the Steam A button
 *
 * Used for: `PullModelsModal.tsx`'s controls and the filters column beside its list
 * (`PullModelsFiltersColumn.tsx`: Clear, every licence, Good for and Show row, the custom-tag chip and
 * field, the starter set and the Suggested chips), plus every catalog row's select/pin star and delete X.
 *
 * Solves: found on the Deck 2026-09-21 (docs/test-evidence/plan62-MODELS-FILTERS-01-A-closes-
 * screen.json) -- this screen is built as a `ConfirmModal` with its own OK. Every control here only
 * wired `onClick` with `ev.stopPropagation()`, which stops a mouse click but does nothing to a
 * gamepad A press: Steam delivers A through `onOKButton`/`onActivate`, not a DOM click, so an A
 * press on almost any control fell through to the modal's own OK and closed the whole screen
 * instead of doing anything. Pressing A on the old Filters button closed the screen before the
 * filters ever opened; pressing A on a model's tick box closed it before anything could be queued.
 *
 * Does not: cover Advanced (`ModelRoutingAdvancedPanel.tsx`, out of this file), which already
 * carried its own `onOKButton` and was the one control on the whole screen not affected.
 *
 * The fake Decky UI harness (`fakeDeckyUi.tsx`) strips every Steam nav prop, `onOKButton` included,
 * before it ever reaches the DOM -- so the test's own `Button` keeps the props each drawn button was
 * given, by element, and every `<button>` the screen draws is checked against them.
 */
import React from "react";
import { cleanup, configure, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

configure({ asyncUtilTimeout: 10000 });

const hoisted = vi.hoisted(() => ({ propsByEl: new WeakMap<Element, Record<string, unknown>>() }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const RealButton = stubs.Button;
  const CapturingButton = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(function CapturingButton(props, ref) {
    const own = React.useRef<HTMLButtonElement | null>(null);
    React.useLayoutEffect(() => {
      if (own.current) hoisted.propsByEl.set(own.current, props);
    });
    return (
      <RealButton
        {...props}
        ref={(el: HTMLButtonElement | null) => {
          own.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
      />
    );
  });
  return { ...stubs, Button: CapturingButton };
});

import { PullModelsModal } from "./PullModelsModal";
import { resetPullModelsBoxMemory } from "./pullModelsBoxMemory";
import { setRpcHandler } from "../test-harness/fakeDeckyRpc";

function renderModal() {
  return render(<PullModelsModal activeRoutingTag={null} onCancel={vi.fn()} onPullAccepted={vi.fn()} embedded />);
}

/** Every drawn button's label whose props carry no onOKButton. */
function withoutOk(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("button"))
    .filter((b) => typeof hoisted.propsByEl.get(b)?.onOKButton !== "function")
    .map((b) => b.getAttribute("aria-label") || b.textContent || "(unlabelled)");
}

const okOf = (el: Element) => hoisted.propsByEl.get(el)!.onOKButton as (evt: { stopPropagation: () => void }) => void;

describe("PullModelsModal -- every control answers A, not just Advanced", () => {
  beforeEach(() => resetPullModelsBoxMemory());
  afterEach(() => cleanup());

  it("gives every button in the box, the filters column's included, an onOKButton", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["qwen3.5:4b"] }));
    const { container } = renderModal();
    await waitFor(() => {
      expect(container.querySelector('[aria-label="Use qwen3.5:4b for Ask"]')).not.toBeNull();
    });
    const column = container.querySelector(".bonsai-pullmodels-filtercol")!;
    // Clear, ten filter rows, "Type a name" and the starter set at the least.
    expect(column.querySelectorAll("button").length).toBeGreaterThanOrEqual(13);
    expect(withoutOk(container)).toEqual([]);
  });

  it("pressing A on a Good for row ticks it, and the press stops there instead of closing the screen", async () => {
    const { container } = renderModal();
    const vision = await waitFor(() => {
      const el = container.querySelector('.bonsai-pullmodels-filtercol-row[aria-label="Vision"]');
      expect(el).not.toBeNull();
      return el!;
    });
    const stopPropagation = vi.fn();
    okOf(vision)({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(vision.getAttribute("aria-pressed")).toBe("true"));
  });

  it("pressing A on an uninstalled model's tick box queues it instead of doing nothing to close the screen", async () => {
    const { container } = renderModal();
    const target = await waitFor(() => {
      const el = container.querySelector('[aria-label="Select qwen3.5:4b to pull"]');
      expect(el).not.toBeNull();
      return el!;
    });
    okOf(target)({ stopPropagation: () => {} });
    await waitFor(() => {
      expect(container.querySelector('[aria-label="Deselect qwen3.5:4b"]')).not.toBeNull();
    });
  });
});
