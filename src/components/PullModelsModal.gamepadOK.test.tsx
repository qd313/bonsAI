/**
 * Title: Every button on the Pull models picker answers the Steam A button
 *
 * Used for: `PullModelsModal.tsx`'s controls (Filters, the custom-tag chip/field, every catalog
 * row's select/pin star and delete X, the Suggested chips, every row inside the Filters panel, and
 * its Close button).
 *
 * Solves: found on the Deck 2026-09-21 (docs/test-evidence/plan62-MODELS-FILTERS-01-A-closes-
 * screen.json) -- this screen is built as a `ConfirmModal` with its own OK. Every control here only
 * wired `onClick` with `ev.stopPropagation()`, which stops a mouse click but does nothing to a
 * gamepad A press: Steam delivers A through `onOKButton`/`onActivate`, not a DOM click, so an A
 * press on almost any control fell through to the modal's own OK and closed the whole screen
 * instead of doing anything. Pressing A on the Filters button closed the screen before the filters
 * ever opened; pressing A on a model's tick box closed it before anything could be queued.
 *
 * Does not: cover Advanced (`ModelRoutingAdvancedPanel.tsx`, out of this file), which already
 * carried its own `onOKButton` and was the one control on the whole screen not affected.
 *
 * The fake Decky UI harness (`fakeDeckyUi.tsx`) strips every Steam nav prop, `onOKButton` included,
 * before it ever reaches the DOM -- so a DOM query can never see whether a button carries one.
 * Reading it straight off the unrendered React element (the same trick
 * `MainTabAskModeMenuPopover.test.tsx` uses) is the only way to see it. PullModelsModal calls real
 * hooks (useState/useEffect/useRef) and fires real RPCs on mount, so it cannot be called as a bare
 * function the way a hookless builder could -- instead it is called from inside another component's
 * own render body (`Harness`), which still lets its hooks register and re-render for real.
 */
import React from "react";
import { cleanup, render, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "@decky/ui";

import { PullModelsModal, type PullModelsModalProps } from "./PullModelsModal";
import { setRpcHandler } from "../test-harness/fakeDeckyRpc";

let lastTree: React.ReactNode = null;
function Harness(props: PullModelsModalProps) {
  lastTree = PullModelsModal(props);
  return lastTree;
}

/** Every `Button` element (the real stub reference, not a DOM node) anywhere in a captured tree. */
function findAllButtons(node: React.ReactNode, out: React.ReactElement[] = []): React.ReactElement[] {
  if (node == null || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findAllButtons(child, out);
    return out;
  }
  if (!React.isValidElement(node)) return out;
  if (node.type === Button) out.push(node);
  const props = node.props as Record<string, unknown>;
  findAllButtons(props.children as React.ReactNode, out);
  return out;
}

function buttonLabel(b: React.ReactElement): string {
  const props = b.props as Record<string, unknown>;
  return (props["aria-label"] as string) || String(b.key) || "(unlabelled)";
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

describe("PullModelsModal -- every control answers A, not just Advanced", () => {
  afterEach(() => {
    cleanup();
    lastTree = null;
  });

  it("gives every button on the closed-filters view (table + custom-tag chip) an onOKButton", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["qwen2.5vl:3b"] }));
    const { container } = render(<Harness {...buildProps()} />);

    // Wait for the installed star to show up so the table has rendered its data rows too.
    await waitFor(() => {
      expect(container.querySelector('[aria-label="qwen2.5vl:3b is used for Ask"]')).toBeNull();
      expect(container.querySelector('[aria-label="Use qwen2.5vl:3b for Ask"]')).not.toBeNull();
    });

    const buttons = findAllButtons(lastTree);
    // Filters button, refresh (↻), "Type a name" chip, plus at least one catalog row's select
    // and delete cell -- six is the floor for this view alone.
    expect(buttons.length).toBeGreaterThanOrEqual(6);

    const missing = buttons.filter((b) => typeof (b.props as Record<string, unknown>).onOKButton !== "function");
    expect(missing.map(buttonLabel)).toEqual([]);
  });

  it("gives every button inside the open Filters panel (rows, Suggested chips, Close) an onOKButton", async () => {
    const { container } = render(<Harness {...buildProps()} />);

    const filtersButton = await waitFor(() => {
      const el = container.querySelector(".bonsai-pullmodels-filters-button");
      expect(el).not.toBeNull();
      return el as HTMLButtonElement;
    });
    fireEvent.click(filtersButton);

    await waitFor(() => {
      expect(container.querySelector(".bonsai-pullmodels-filterpanel-close")).not.toBeNull();
    });

    const buttons = findAllButtons(lastTree);
    // At least the three licence rows, the four mode rows, installed/essentials/recently-added,
    // and Close filters -- eleven is the floor; Suggested chips add more when there are gaps.
    expect(buttons.length).toBeGreaterThanOrEqual(11);

    const missing = buttons.filter((b) => typeof (b.props as Record<string, unknown>).onOKButton !== "function");
    expect(missing.map(buttonLabel)).toEqual([]);
  });

  it("pressing A on the Filters button opens the panel instead of doing nothing to close the screen", async () => {
    // The single most direct repro of the Deck finding: A on the Filters row's button.
    const { container } = render(<Harness {...buildProps()} />);
    await waitFor(() => {
      expect(container.querySelector(".bonsai-pullmodels-filters-button")).not.toBeNull();
    });

    const buttons = findAllButtons(lastTree);
    const filtersBtn = buttons.find(
      (b) => (b.props as Record<string, unknown>)["className"] === "bonsai-pullmodels-filters-button"
    );
    expect(filtersBtn).toBeTruthy();
    const onOKButton = (filtersBtn!.props as Record<string, unknown>).onOKButton as
      | ((evt: { stopPropagation: () => void }) => void)
      | undefined;
    expect(typeof onOKButton).toBe("function");

    const stopPropagation = vi.fn();
    onOKButton!({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(container.querySelector(".bonsai-pullmodels-filterpanel-close")).not.toBeNull();
    });
  });

  it("pressing A on an uninstalled model's tick box queues it instead of doing nothing to close the screen", async () => {
    const { container } = render(<Harness {...buildProps()} />);

    await waitFor(() => {
      expect(container.querySelector('[aria-label="Select qwen2.5vl:3b to pull"]')).not.toBeNull();
    });

    const buttons = findAllButtons(lastTree);
    const target = buttons.find(
      (b) => (b.props as Record<string, unknown>)["aria-label"] === "Select qwen2.5vl:3b to pull"
    );
    expect(target).toBeTruthy();
    const onOKButton = (target!.props as Record<string, unknown>).onOKButton as
      | ((evt: { stopPropagation: () => void }) => void)
      | undefined;
    expect(typeof onOKButton).toBe("function");

    onOKButton!({ stopPropagation: () => {} });

    await waitFor(() => {
      expect(container.querySelector('[aria-label="Deselect qwen2.5vl:3b"]')).not.toBeNull();
    });
  });
});
