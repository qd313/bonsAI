/**
 * Title: The install and pull boxes describe their models truthfully
 *
 * Purpose: Pin plan 77 (licence labels, round 2). The Tier 1 install box used to call the default
 * model "FOSS" (Qwen's card gives its 3B size the Qwen Research licence); the "Tier 2 one-model
 * multimodal" install actually pulls Gemma 4, which is Apache 2.0 and counts as Tier 1; the
 * "Enable Tier 2 before pulling?" box said Tier 1 keeps to "FOSS-friendly tags". What each button
 * installs and which tier it switches on is unchanged.
 */
import { act, render, renderHook } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PullModelEntry } from "../data/pullModelCatalog";

const hoisted = vi.hoisted(() => ({
  opts: null as Record<string, unknown> | null,
  pullBox: null as { strDescription?: ReactNode; strTitle?: string } | null,
}));
vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: async (_n: unknown, opts?: Record<string, unknown>) => {
    hoisted.opts = opts ?? null;
    return false;
  },
}));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    ConfirmModal: () => null,
    showModal: (el: ReactElement<{ strDescription?: ReactNode; strTitle?: string }>) => {
      hoisted.pullBox = el.props;
      return { Close: () => {}, Update: () => {} };
    },
  };
});
vi.mock("../utils/deckyCall", () => ({
  DECKY_RPC_TIMEOUT_MS: 1000,
  formatDeckyRpcError: String,
  callDeckyWithTimeout: async () => ({ accepted: true }),
}));
vi.mock("@decky/api", () => ({ toaster: { toast: () => {} } }));

import { useLocalOllamaSetupFlow } from "./useLocalOllamaSetupFlow";
import { usePullModelSubmitSelected } from "./usePullModelSubmitSelected";
import { localRuntimeBetaNoticeDescription } from "./useDisclaimerAndLocalRuntimeGates";
import { MODEL_POLICY_SETTINGS_INTRO } from "../data/modelPolicy";
import { resetFakeDeckyRpc } from "../test-harness/fakeDeckyRpc";

beforeEach(() => {
  hoisted.opts = null;
  hoisted.pullBox = null;
  resetFakeDeckyRpc();
});

type Profile = "tier1_essentials" | "tier2_multimodal" | "update_installed";

function openSetupBox(profile: Profile): string {
  const { result } = renderHook(() =>
    useLocalOllamaSetupFlow({
      ollamaLocalOnDeck: false,
      localSetupStatus: null,
      setLocalSetupStatus: () => {},
      localSetupBusy: false,
      setupAutoTestRanRef: { current: false },
      lastCompletedSetupProfileRef: { current: "" },
      onApplyTier2MultimodalPolicy: vi.fn(),
      onBeforeDeckyModal: () => {},
      onCompleteDeckyModalClose: (close) => close(),
      onTestConnectionRef: { current: async () => {} },
    })
  );
  act(() => result.current.openLocalSetupConfirm(profile, "ollama-local-setup"));
  const { container } = render(<div>{hoisted.opts?.body as ReactNode}</div>);
  return container.textContent ?? "";
}

describe("wording of the install and pull boxes", () => {
  it("Tier 1 install box does not call the default model FOSS", async () => {
    const text = openSetupBox("tier1_essentials");
    await act(async () => {});
    expect(text).toContain("one small model");
    expect(text).not.toMatch(/FOSS/);
  });

  it("the Gemma 4 install says Gemma 4 is open source and still switches to Tier 2", async () => {
    const text = openSetupBox("tier2_multimodal");
    await act(async () => {});
    expect(hoisted.opts).toMatchObject({ title: "Install Gemma 4?", actionLabel: "Install Gemma 4" });
    expect(text).toContain("Gemma 4 is open source (Apache 2.0)");
    expect(text).toContain("Tier 2 (open-weight)");
    expect(text).not.toMatch(/FOSS/);
  });

  it("the update box points at Browse models, not at the removed Install options buttons", async () => {
    const text = openSetupBox("update_installed");
    await act(async () => {});
    expect(text).toContain("Browse models");
    expect(text).not.toContain("Install Gemma 4");
    expect(text).not.toContain("Install Tier 1");
    expect(text).not.toContain("Tier 2 multimodal");
  });

  it("the Enable Tier 2 pull box explains Tier 1 in plain words", async () => {
    const catalog = [{ tag: "gemma3:4b", sizeGb: 3.3, licenseClass: "open_weight" }] as unknown as PullModelEntry[];
    const hook = renderHook(() =>
      usePullModelSubmitSelected({
        selectedTags: new Set(["gemma3:4b"]),
        modelPolicyTier: "open_source_only",
        mergedCatalog: catalog,
        onApplyTier2Policy: () => {},
        completeNestedModalClose: (close) => close(),
        onPullAccepted: () => {},
        setPullBusy: () => {},
        openWeightTierConfirmedRef: { current: new Set() },
      })
    ).result.current;
    await act(() => hook.onPullSelected());
    expect(hoisted.pullBox).not.toBeNull();
    const { container } = render(<div>{hoisted.pullBox!.strDescription}</div>);
    expect(container.textContent).toContain("open-source licence");
    expect(container.textContent).not.toMatch(/FOSS/);
  });

  it("the first-run local AI notice and the Settings intro do not say FOSS", () => {
    const notice = localRuntimeBetaNoticeDescription();
    expect(notice).not.toMatch(/FOSS/);
    expect(notice).toContain("Install Gemma 4");
    expect(MODEL_POLICY_SETTINGS_INTRO).not.toMatch(/FOSS/);
  });
});
