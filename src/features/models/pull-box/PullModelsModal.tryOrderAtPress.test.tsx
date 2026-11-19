/**
 * Title: Moving a model in the try order shows at the press
 *
 * Purpose: Pins the 2026-11-18 round: pressing a model's up or down button in Browse models swaps the two
 * place numbers on screen at that press, not only after the saved order has been read and written again
 * (two round trips). The real screen is drawn, the saved-order read after the press is held unanswered,
 * and the test reads the place numbers straight after the click. A failed save puts the numbers back and
 * shows the notice.
 *
 * Does not: prove the order on disk (PullModelsModal.tryOrder.test.tsx and useTryOrderPlaces.test.tsx do).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, configure, fireEvent, render, waitFor } from "@testing-library/react";
import { toaster } from "@decky/api";

configure({ asyncUtilTimeout: 5000 });

vi.mock("@decky/ui", async () => ({
  ...(await import("../../../test-harness/fakeDeckyUi")),
  showModal: () => ({ Close: () => {}, Update: () => {} }),
}));

import { PullModelsModal } from "./PullModelsModal";
import { resetPullModelsBoxMemory } from "./pullModelsBoxMemory";
import type { TryOrderHost } from "../useTryOrderPlaces";
import { resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../../../test-harness/rpcFixtures";

const DECK: TryOrderHost = {
  ollamaLocalOnDeck: true,
  ollamaIp: "",
  textModelRoutingOrder: [],
  visionModelRoutingOrder: [],
  modelAllowHighVramFallbacks: true,
};
const DECK_MODELS = ["gemma4:e2b-it-qat", "qwen3.5:4b", "qwen2.5vl:3b"];

beforeEach(() => {
  resetPullModelsBoxMemory();
  resetFakeDeckyRpc();
  vi.mocked(toaster.toast).mockClear();
  setRpcHandler("load_settings", () => defaultSettingsFixture());
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: DECK_MODELS }));
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = "";
});

const draw = () =>
  render(
    <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded tryOrderHost={DECK} modelPolicyTier="open_weight" />,
  );

const placeOf = (container: HTMLElement, tag: string) => {
  const row = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-pullmodels-table-row--data")).find(
    (r) => r.querySelector(".bonsai-pullmodels-tag-name-text")?.textContent?.trim() === tag,
  );
  return row?.querySelector(".bonsai-pullmodels-place-num")?.textContent ?? null;
};
const button = (container: HTMLElement, label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

describe("pressing a place button", () => {
  it("swaps the two place numbers at the press, before any call has answered", async () => {
    const { container } = draw();
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("2"));
    // From here on the saved-order read never answers (it gives up after its own limit, long after this test).
    setRpcHandler("load_settings", () => new Promise(() => {}));
    fireEvent.click(button(container, "Move qwen2.5vl:3b up"));
    expect(placeOf(container, "qwen2.5vl:3b")).toBe("1");
    expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("2");
  });

  it("puts the numbers back when the save fails, and says so", async () => {
    const { container } = draw();
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("2"));
    setRpcHandler("save_settings", () => {
      throw new Error("disk full");
    });
    await act(async () => {
      fireEvent.click(button(container, "Move qwen2.5vl:3b up"));
    });
    await waitFor(() => expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Could not save the order" })));
    await waitFor(() => expect(placeOf(container, "qwen2.5vl:3b")).toBe("2"));
    expect(placeOf(container, "gemma4:e2b-it-qat")).toBe("1");
  });
});
