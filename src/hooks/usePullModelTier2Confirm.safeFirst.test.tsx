/**
 * Title: "Enable Tier 2 for this model?" opens on the safe choice
 *
 * Purpose: Pin plan 76 lane 2, bug 4 (roadmap: "Two more boxes may start on their action button,
 * found in the code"). This per-model box, raised by ticking an open-weight model while the licence
 * is on Tier 1, had its action ("Enable Tier 2 and queue") where Steam puts the ring. It then showed
 * three buttons (Not now / action / Cancel); it is now the shared two-button box, drawn and read off the
 * page: Cancel first, the action beside it (plan 93); the sister box in usePullModelSubmitSelected.tsx
 * is the same. The action itself is unchanged: Tier 2 on, the model queued.
 *
 * Does not: prove where the ring lands on the device; that is the Deck row's job.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PullModelEntry } from "../data/pullModelCatalog";

const hoisted = vi.hoisted(() => ({ box: null as unknown, closed: 0 }));

vi.mock("@decky/ui", async () => ({
  ...(await import("../test-harness/fakeDeckyUi")),
  showModal: (el: unknown) => {
    hoisted.box = el;
    return { Close: () => (hoisted.closed += 1), Update: () => {} };
  },
}));

import { drawConfirmBox } from "../test-harness/confirmBoxProbe";
import { usePullModelTier2Confirm } from "./usePullModelTier2Confirm";

const ENTRY = { tag: "gemma3:4b", sizeGb: 3.3, licenseClass: "open_weight" } as unknown as PullModelEntry;

function openBox() {
  const applied = { tier2: 0, queued: 0 };
  const confirmed = { current: new Set<string>() };
  const hook = renderHook(() =>
    usePullModelTier2Confirm({
      modelPolicyTier: "open_source_only",
      onApplyTier2Policy: () => {
        applied.tier2 += 1;
      },
      openWeightTierConfirmedRef: confirmed,
    })
  ).result.current;
  hook.confirmOpenWeightTierIfNeeded(ENTRY, () => {
    applied.queued += 1;
  });
  expect(hoisted.box).not.toBeNull();
  return { box: drawConfirmBox(hoisted.box), applied, confirmed };
}

beforeEach(() => {
  hoisted.box = null;
  hoisted.closed = 0;
});

describe('"Enable Tier 2 for this model?"', () => {
  it("shows Cancel and the action only, Cancel first where the ring lands", () => {
    const { box } = openBox();
    expect(box.labels).toEqual(["Cancel", "Enable Tier 2 and queue"]);
  });

  it("points to where the licence can be changed today: the AI models button and its Licence list, not the removed Manage AI models and Policy", () => {
    const { box } = openBox();
    expect(box.text).toContain("You can change this later under Ollama → AI models, in the Licence list beside the models.");
    expect(box.text).not.toContain("Manage AI models");
  });

  it("Cancel (the ring's first stop) closes the box and changes nothing", async () => {
    const { box, applied, confirmed } = openBox();
    await act(async () => box.pressCancel());
    expect(hoisted.closed).toBe(1);
    expect(applied).toEqual({ tier2: 0, queued: 0 });
    expect(confirmed.current.size).toBe(0);
  });

  it("B also changes nothing", async () => {
    const { box, applied } = openBox();
    await act(async () => box.pressB());
    expect(hoisted.closed).toBe(1);
    expect(applied).toEqual({ tier2: 0, queued: 0 });
  });

  it("the action button does what OK used to: Tier 2 on, the model queued, the box closed", async () => {
    const { box, applied, confirmed } = openBox();
    await act(async () => box.pressAction());
    expect(applied).toEqual({ tier2: 1, queued: 1 });
    expect(confirmed.current.has("gemma3:4b")).toBe(true);
    expect(hoisted.closed).toBe(1);
  });
});
