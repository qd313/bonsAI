/**
 * Title: The two "Enable Tier 2" boxes talk about the model(s) being pulled, not about a reply
 *
 * Purpose: Pin plan 76 lane 2, bug 6 (roadmap: 'The "Enable Tier 2 before pulling?" box talks about
 * a reply that does not exist'; evidence plan74-P74-SAFE-FIRST-TIER2.json). Both boxes borrowed the
 * Ask-answer footnote ("This reply used an 'open model'..."), but no reply is involved when a model
 * is only about to be pulled. They now say, in plain words, what the box is for: the model(s) about
 * to be pulled are open-weight, Tier 1 will not use them, and turning Tier 2 on is what lets them
 * be used. The boxes' buttons and actions are covered elsewhere.
 */
import { act, render, renderHook } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PullModelEntry } from "../data/pullModelCatalog";

type BoxProps = { strTitle?: unknown; strDescription?: ReactNode };

const hoisted = vi.hoisted(() => ({ box: null as BoxProps | null }));

vi.mock("@decky/ui", () => ({
  ConfirmModal: () => null,
  showModal: (el: ReactElement<BoxProps>) => {
    hoisted.box = el.props;
    return { Close: () => {}, Update: () => {} };
  },
}));
vi.mock("../features/downloads/downloadNotice", () => ({ confirmDownload: async () => false }));
vi.mock("../utils/deckyCall", () => ({
  DECKY_RPC_TIMEOUT_MS: 1000,
  formatDeckyRpcError: String,
  callDeckyWithTimeout: async () => ({ accepted: true }),
}));
vi.mock("@decky/api", () => ({ toaster: { toast: () => {} } }));

import { usePullModelSubmitSelected } from "./usePullModelSubmitSelected";
import { usePullModelTier2Confirm } from "./usePullModelTier2Confirm";

const ENTRY = { tag: "gemma3:4b", sizeGb: 3.3, licenseClass: "open_weight" } as unknown as PullModelEntry;

function textOfBox(): string {
  const { container } = render(<div>{hoisted.box?.strDescription}</div>);
  return container.textContent ?? "";
}

beforeEach(() => {
  hoisted.box = null;
});

describe('"Enable Tier 2 before pulling?" (Pull selected)', () => {
  it("names the model and what Tier 2 is for, and does not mention a reply", async () => {
    const hook = renderHook(() =>
      usePullModelSubmitSelected({
        selectedTags: new Set(["gemma3:4b"]),
        modelPolicyTier: "open_source_only",
        mergedCatalog: [ENTRY],
        onApplyTier2Policy: () => {},
        completeNestedModalClose: (close) => close(),
        onPullAccepted: () => {},
        setPullBusy: () => {},
        openWeightTierConfirmedRef: { current: new Set() },
      })
    ).result.current;
    await act(() => hook.onPullSelected());

    expect(hoisted.box?.strTitle).toBe("Enable Tier 2 before pulling?");
    const text = textOfBox();
    expect(text).toContain("gemma3:4b");
    expect(text).toContain("Tier 2");
    expect(text.toLowerCase()).not.toContain("reply");
    expect(text).not.toContain("This reply used");
  });
});

describe('"Enable Tier 2 for this model?" (one model ticked)', () => {
  it("says the same plain thing, and does not mention a reply", () => {
    const hook = renderHook(() =>
      usePullModelTier2Confirm({
        modelPolicyTier: "open_source_only",
        onApplyTier2Policy: () => {},
        openWeightTierConfirmedRef: { current: new Set() },
      })
    ).result.current;
    hook.confirmOpenWeightTierIfNeeded(ENTRY, () => {});

    expect(hoisted.box?.strTitle).toBe("Enable Tier 2 for this model?");
    const text = textOfBox();
    expect(text).toContain("gemma3:4b");
    expect(text.toLowerCase()).not.toContain("reply");
  });
});
