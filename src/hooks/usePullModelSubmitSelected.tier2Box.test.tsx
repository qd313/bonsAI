/**
 * Title: "Enable Tier 2 before pulling?" opens on the safe choice
 *
 * Purpose: Pin plan 74 lane 3, bug 2 (roadmap: "Two older boxes open with the ring on their action
 * button, not the safe choice"). Steam opens a ConfirmModal with the ring on its OK button, so OK
 * must be the choice that changes nothing ("Not now") and the action sits on the middle button --
 * the download notice's own shape (downloadNotice.tsx). The action itself is unchanged: Tier 2 is
 * turned on, then the pull runs.
 *
 * Does not: prove where the ring lands on the device; that is the Deck row's job.
 */
import { act, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PullModelEntry } from "../data/pullModelCatalog";

type BoxProps = {
  strOKButtonText?: unknown;
  strMiddleButtonText?: unknown;
  onOK?: () => void;
  onMiddleButton?: () => void;
  onCancel?: () => void;
};

const hoisted = vi.hoisted(() => ({
  box: null as BoxProps | null,
  closed: 0,
  notices: 0,
  tier2Applied: 0,
}));

vi.mock("@decky/ui", () => ({
  ConfirmModal: () => null,
  showModal: (el: ReactElement<BoxProps>) => {
    hoisted.box = el.props;
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

import { usePullModelSubmitSelected } from "./usePullModelSubmitSelected";

const CATALOG = [{ tag: "gemma3:4b", sizeGb: 3.3, licenseClass: "open_weight" }] as unknown as PullModelEntry[];

async function openBox(): Promise<BoxProps> {
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
  return hoisted.box!;
}

beforeEach(() => {
  hoisted.box = null;
  hoisted.closed = 0;
  hoisted.notices = 0;
  hoisted.tier2Applied = 0;
});

describe('"Enable Tier 2 before pulling?"', () => {
  it("puts the safe choice on OK, where the ring lands, and the action on the middle button", async () => {
    const box = await openBox();
    expect(box.strOKButtonText).toBe("Not now");
    expect(box.strMiddleButtonText).toBe("Enable Tier 2 and pull");
  });

  it("OK (the ring's first stop) closes the box and changes nothing", async () => {
    const box = await openBox();
    await act(async () => box.onOK?.());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.tier2Applied).toBe(0);
    expect(hoisted.notices).toBe(0);
  });

  it("the middle button still does what OK used to: Tier 2 on, then the pull (via the download notice)", async () => {
    const box = await openBox();
    await act(async () => box.onMiddleButton?.());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.tier2Applied).toBe(1);
    expect(hoisted.notices).toBe(1);
  });

  it("Cancel and B also change nothing", async () => {
    const box = await openBox();
    await act(async () => box.onCancel?.());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.tier2Applied).toBe(0);
    expect(hoisted.notices).toBe(0);
  });
});
