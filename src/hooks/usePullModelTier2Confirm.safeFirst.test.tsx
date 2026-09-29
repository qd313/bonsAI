/**
 * Title: "Enable Tier 2 for this model?" opens on the safe choice
 *
 * Purpose: Pin plan 76 lane 2, bug 4 (roadmap: "Two more boxes may start on their action button,
 * found in the code"). This per-model box, raised by ticking an open-weight model while the licence
 * is on Tier 1, had its action ("Enable Tier 2 and queue") on OK, where Steam puts the ring. OK is
 * now the choice that changes nothing ("Not now") and the action sits on the middle button, the
 * download notice's own shape (downloadNotice.tsx); the sister box in usePullModelSubmitSelected.tsx
 * was fixed the same way on 2026-09-28. The action itself is unchanged: Tier 2 on, the model queued.
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
  strCancelButtonText?: unknown;
  onOK?: () => void;
  onMiddleButton?: () => void;
  onCancel?: () => void;
};

const hoisted = vi.hoisted(() => ({ box: null as BoxProps | null, closed: 0 }));

vi.mock("@decky/ui", () => ({
  ConfirmModal: () => null,
  showModal: (el: ReactElement<BoxProps>) => {
    hoisted.box = el.props;
    return { Close: () => (hoisted.closed += 1), Update: () => {} };
  },
}));

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
  return { box: hoisted.box!, applied, confirmed };
}

beforeEach(() => {
  hoisted.box = null;
  hoisted.closed = 0;
});

describe('"Enable Tier 2 for this model?"', () => {
  it("puts the safe choice on OK, where the ring lands, and the action on the middle button", () => {
    const { box } = openBox();
    expect(box.strOKButtonText).toBe("Not now");
    expect(box.strMiddleButtonText).toBe("Enable Tier 2 and queue");
    expect(box.strCancelButtonText).toBe("Cancel");
  });

  it("OK (the ring's first stop) closes the box and changes nothing", async () => {
    const { box, applied, confirmed } = openBox();
    await act(async () => box.onOK?.());
    expect(hoisted.closed).toBe(1);
    expect(applied).toEqual({ tier2: 0, queued: 0 });
    expect(confirmed.current.size).toBe(0);
  });

  it("Cancel and B also change nothing", async () => {
    const { box, applied } = openBox();
    await act(async () => box.onCancel?.());
    expect(hoisted.closed).toBe(1);
    expect(applied).toEqual({ tier2: 0, queued: 0 });
  });

  it("the middle button does what OK used to: Tier 2 on, the model queued, the box closed", async () => {
    const { box, applied, confirmed } = openBox();
    await act(async () => box.onMiddleButton?.());
    expect(applied).toEqual({ tier2: 1, queued: 1 });
    expect(confirmed.current.has("gemma3:4b")).toBe(true);
    expect(hoisted.closed).toBe(1);
  });
});
