/**
 * Title: "Enable Tier 2 before pulling?" opens on the safe choice
 *
 * Purpose: Pin plan 74 lane 3, bug 2 (roadmap: "Two older boxes open with the ring on their action
 * button, not the safe choice") and plan 93. Steam puts the ring on the first button of a box, so Cancel
 * is first and the action beside it; the box used to show three buttons (Not now / action / Cancel).
 * Drawn and read off the page. The action itself is unchanged: Tier 2 is turned on, then the pull runs.
 *
 * Does not: prove where the ring lands on the device; that is the Deck row's job.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PullModelEntry } from "../data/pullModelCatalog";

const hoisted = vi.hoisted(() => ({
  box: null as unknown,
  closed: 0,
  notices: 0,
  tier2Applied: 0,
}));

vi.mock("@decky/ui", async () => ({
  ...(await import("../test-harness/fakeDeckyUi")),
  showModal: (el: unknown) => {
    hoisted.box = el;
    return { Close: () => (hoisted.closed += 1), Update: () => {} };
  },
}));
vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: async () => {
    hoisted.notices += 1;
    return false;
  },
}));
vi.mock("../utils/deckyCall", () => ({
  DECKY_RPC_TIMEOUT_MS: 1000,
  formatDeckyRpcError: String,
  callDeckyWithTimeout: async () => ({ accepted: true }),
}));
vi.mock("@decky/api", () => ({ toaster: { toast: () => {} } }));

import { drawConfirmBox, type DrawnConfirmBox } from "../test-harness/confirmBoxProbe";
import { usePullModelSubmitSelected } from "./usePullModelSubmitSelected";

const CATALOG = [{ tag: "gemma3:4b", sizeGb: 3.3, licenseClass: "open_weight" }] as unknown as PullModelEntry[];

async function openBox(): Promise<DrawnConfirmBox> {
  const hook = renderHook(() =>
    usePullModelSubmitSelected({
      selectedTags: new Set(["gemma3:4b"]),
      modelPolicyTier: "open_source_only",
      mergedCatalog: CATALOG,
      onApplyTier2Policy: () => {
        hoisted.tier2Applied += 1;
      },
      completeNestedModalClose: (close) => close(),
      onPullAccepted: () => {},
      setPullBusy: () => {},
      openWeightTierConfirmedRef: { current: new Set() },
    })
  ).result.current;
  await act(() => hook.onPullSelected());
  expect(hoisted.box).not.toBeNull();
  return drawConfirmBox(hoisted.box);
}

beforeEach(() => {
  hoisted.box = null;
  hoisted.closed = 0;
  hoisted.notices = 0;
  hoisted.tier2Applied = 0;
});

describe('"Enable Tier 2 before pulling?"', () => {
  it("shows Cancel and the action only, Cancel first where the ring lands", async () => {
    const box = await openBox();
    expect(box.labels).toEqual(["Cancel", "Enable Tier 2 and pull"]);
  });

  it("Cancel (the ring's first stop) closes the box and changes nothing", async () => {
    const box = await openBox();
    await act(async () => box.pressCancel());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.tier2Applied).toBe(0);
    expect(hoisted.notices).toBe(0);
  });

  it("the action button still does what OK used to: Tier 2 on, then the pull (via the download notice)", async () => {
    const box = await openBox();
    await act(async () => box.pressAction());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.tier2Applied).toBe(1);
    expect(hoisted.notices).toBe(1);
  });

  it("B also changes nothing", async () => {
    const box = await openBox();
    await act(async () => box.pressB());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.tier2Applied).toBe(0);
    expect(hoisted.notices).toBe(0);
  });
});
