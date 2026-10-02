/**
 * Title: "Large model -- continue?" opens on the safe choice
 *
 * Purpose: Steam opens a ConfirmModal with the ring on its OK button, and this box had "Pull anyway"
 * there, so an A pressed by habit queued a big download (plan 79, round four). OK is now "Not now" and
 * "Pull anyway" sits on the middle button, the download notice's shape. What queueing does is
 * unchanged. Cancel and B queue nothing.
 *
 * Does not: prove where the ring lands on the device; that is the Deck row's job.
 */
import { act, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PullModelEntry } from "../data/pullModelCatalog";

type BoxProps = {
  strTitle?: unknown;
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
vi.mock("@decky/api", () => ({ toaster: { toast: () => {} } }));

import { usePullModelToggleSelection } from "./usePullModelToggleSelection";

const ENTRY = { tag: "big-model:70b", group: "stretch", sizeGb: 40 } as unknown as PullModelEntry;

function openBox() {
  const confirmed = new Set<string>();
  const queueIfConfirmed = vi.fn();
  const hook = renderHook(() =>
    usePullModelToggleSelection({
      installedTags: new Set(),
      liveSizeGbByTag: {},
      completeNestedModalClose: (close) => close(),
      confirmOpenWeightTierIfNeeded: queueIfConfirmed,
      setSelectedTags: () => {},
      stretchConfirmedRef: { current: confirmed },
    })
  ).result.current;
  act(() => hook.toggleSelected(ENTRY));
  expect(hoisted.box).not.toBeNull();
  return { box: hoisted.box!, confirmed, queueIfConfirmed };
}

beforeEach(() => {
  hoisted.box = null;
  hoisted.closed = 0;
});

describe('"Large model -- continue?"', () => {
  it("puts the safe choice on OK, where the ring lands, and Pull anyway on the middle button", () => {
    const { box } = openBox();
    expect(box.strTitle).toBe("Large model — continue?");
    expect(box.strOKButtonText).toBe("Not now");
    expect(box.strMiddleButtonText).toBe("Pull anyway");
    expect(box.strCancelButtonText).toBe("Cancel");
  });

  it("OK, Cancel and B queue nothing and do not mark the model as accepted", () => {
    const { box, confirmed, queueIfConfirmed } = openBox();
    act(() => box.onOK?.());
    act(() => box.onCancel?.());
    expect(hoisted.closed).toBe(2);
    expect(queueIfConfirmed).not.toHaveBeenCalled();
    expect(confirmed.size).toBe(0);
  });

  it("the middle button accepts the warning and carries on, as OK used to", () => {
    const { box, confirmed, queueIfConfirmed } = openBox();
    act(() => box.onMiddleButton?.());
    expect(hoisted.closed).toBe(1);
    expect(confirmed.has("big-model:70b")).toBe(true);
    expect(queueIfConfirmed).toHaveBeenCalledTimes(1);
  });
});
