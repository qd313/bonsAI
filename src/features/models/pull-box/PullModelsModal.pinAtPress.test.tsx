/**
 * Title: The "use for Ask" star shows at the press
 *
 * Purpose: Pins the 2026-11-18 round: pressing a model's star in Browse models puts the star on that row
 * at the press, not only after the settings have been read and written again. The real screen is drawn,
 * the calls after the press are held unanswered, and the test reads the star straight after the click.
 * A failed save puts the star back on the row it was on, with the "Could not pin model" notice. A press on
 * another row while a save is out is not lost: it waits its turn and the last press ends up saved first.
 *
 * Does not: prove the saved order for the Pictures list or the session note (usePullModelPinForAsk.test.tsx).
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
import { resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../../../test-harness/rpcFixtures";

const DECK_MODELS = ["qwen3:4b", "gemma4:e2b-it-qat", "qwen3.5:4b"];

const disk: { order: string[] } = { order: [] };
let held: Array<() => void> = [];

beforeEach(() => {
  resetPullModelsBoxMemory();
  resetFakeDeckyRpc();
  vi.mocked(toaster.toast).mockClear();
  disk.order = ["qwen3:4b"];
  held = [];
  setRpcHandler("load_settings", () => ({ ...defaultSettingsFixture(), text_model_routing_order: disk.order }));
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: DECK_MODELS }));
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = "";
});

const draw = () =>
  render(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />);

/** Every star of the list that says which model it is for: the row that holds it reads "<tag> is used for Ask". */
const starredRows = (c: HTMLElement) =>
  Array.from(c.querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-slot--installed"))
    .map((b) => /^(.+) is used for Ask$/.exec(b.getAttribute("aria-label") ?? "")?.[1])
    .filter(Boolean);
const star = (c: HTMLElement, tag: string) =>
  c.querySelector<HTMLButtonElement>(`button[aria-label="Use ${tag} for Ask"]`)!;

/** From now on a call does not answer until the test lets every held call go. */
function holdCalls() {
  const hold = <T,>(v: () => T) => new Promise<T>((resolve) => held.push(() => resolve(v())));
  setRpcHandler("load_settings", () => hold(() => ({ ...defaultSettingsFixture(), text_model_routing_order: disk.order })));
  setRpcHandler("save_settings", (patch) =>
    hold(() => {
      disk.order = (patch as { text_model_routing_order: string[] }).text_model_routing_order;
      return defaultSettingsFixture();
    }),
  );
}
const letGo = async () => {
  for (let i = 0; i < 30; i++) {
    held.splice(0).forEach((r) => r());
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe("pressing a model's star", () => {
  it("puts the star on that row at the press, before any call has answered", async () => {
    const { container } = draw();
    await waitFor(() => expect(starredRows(container)).toEqual(["qwen3:4b"]));
    holdCalls();
    fireEvent.click(star(container, "gemma4:e2b-it-qat"));
    expect(starredRows(container)).toEqual(["gemma4:e2b-it-qat"]);
  });

  it("puts the star back on the row it was on when the save fails, and says so", async () => {
    const { container } = draw();
    await waitFor(() => expect(starredRows(container)).toEqual(["qwen3:4b"]));
    setRpcHandler("save_settings", () => {
      throw new Error("disk full");
    });
    await act(async () => {
      fireEvent.click(star(container, "gemma4:e2b-it-qat"));
    });
    await waitFor(() => expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Could not pin model" })));
    await waitFor(() => expect(starredRows(container)).toEqual(["qwen3:4b"]));
  });

  it("a press on another row while a save is out waits its turn: the star follows the last press and so does the saved order", async () => {
    const { container } = draw();
    await waitFor(() => expect(starredRows(container)).toEqual(["qwen3:4b"]));
    holdCalls();
    fireEvent.click(star(container, "gemma4:e2b-it-qat"));
    fireEvent.click(star(container, "qwen3.5:4b"));
    expect(starredRows(container)).toEqual(["qwen3.5:4b"]);
    await act(async () => {
      await letGo();
    });
    expect(disk.order[0]).toBe("qwen3.5:4b");
    expect(starredRows(container)).toEqual(["qwen3.5:4b"]);
  });
});
