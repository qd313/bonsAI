/**
 * Title: The model list's last row hands Down on, and reaches a model kept under Deck essentials only
 *
 * Purpose: Moved out of the old Filters panel's test file when plan 91 replaced the panel with the
 * filters column (lane M1 of plan 92); these two pin the list's own bottom edge, which the column did
 * not change. The last row hands Down back to Steam, which carries the ring to the dialog's Done / Pull
 * selected footer (plan64-MODELS-HUB-RETURN-01.json: Down used to stop on the last row with Done on
 * screen below it); and a model already on the Deck keeps its row under Deck essentials only, and the
 * walk Down reaches it (plan 64 flow G).
 *
 * The move handlers are read off the props each button was drawn with, as Steam calls them.
 */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { configure, render, waitFor } from "@testing-library/react";

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
import { resetPullModelsBoxMemory } from "./pullModelsBoxMemory";
import { setRpcHandler } from "../test-harness/fakeDeckyRpc";

function renderModal() {
  return render(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />);
}

/** The latest props a button with this label was drawn with: what Steam would call. */
function latestByAriaLabel(label: string): Record<string, unknown> | undefined {
  const matches = hoisted.buttonProps.filter((p) => p["aria-label"] === label);
  return matches[matches.length - 1];
}

beforeEach(() => {
  hoisted.buttonProps = [];
  resetPullModelsBoxMemory();
});

describe("the model list's last row", () => {
  it("hands Down back to Steam so the ring can reach the dialog's Done / Pull selected footer", async () => {
    // Nothing installed, so the three essentials' "Select … to pull" rows are the whole list. (The
    // harness's default installs qwen2.5:1.5b, which now keeps a row of its own under Essentials
    // only -- that row is the last one then; see the next test.)
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal();
    let labels: string[] = [];
    await waitFor(() => {
      labels = Array.from(container.querySelectorAll(".bonsai-pullmodels-slot")).map(
        (el) => el.getAttribute("aria-label") ?? ""
      );
      expect(labels.length).toBeGreaterThan(1);
    });

    const lastRow = latestByAriaLabel(labels[labels.length - 1]);
    expect((lastRow!.onMoveDown as () => boolean)()).toBe(false);
  });

  it("walks Down from the last essential onto an installed model's row shown under Essentials only", async () => {
    // Deck, plan 64 flow G: a model pulled by typed name had no row in this view. It has one now,
    // below the essentials, and the D-pad has to reach it.
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["qwen2.5:1.5b"] }));
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      const { container } = renderModal();
      await waitFor(() => {
        expect(container.querySelector('[aria-label="Use qwen2.5:1.5b for Ask"]')).not.toBeNull();
      });
      const lastEssential = latestByAriaLabel("Select qwen2.5vl:3b to pull");
      expect((lastEssential!.onMoveDown as () => boolean)()).toBe(true);
      expect(container.contains(document.activeElement)).toBe(true);
      expect(document.activeElement?.closest("[class*='row']")?.textContent ?? "").toContain("qwen2.5:1.5b");
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });
});
