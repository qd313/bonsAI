/**
 * Title: The try-order places change at the press
 *
 * Purpose: Pins the 2026-11-18 round at the hook the Browse models screen reads its place numbers from:
 * the order it hands out has already changed when `move` is called (before the saved order is read or
 * written), a failed save hands back the order that is really saved, and three quick presses end with the
 * same order on disk and on screen as three slow ones. What is saved is still worked out from a fresh
 * read inside each queued job, so another machine's change is not wiped; when the jobs end the screen
 * shows what was saved.
 *
 * Does not: draw anything (PullModelsModal.tryOrderAtPress.test.tsx does), or re-pin the saving rules
 * (useTryOrderPlaces.test.tsx does).
 */
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useTryOrderPlaces, type TryOrderHost, type TryOrderPlaces } from "./useTryOrderPlaces";
import { defaultSettingsFixture } from "../../test-harness/rpcFixtures";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const HOST: TryOrderHost = {
  ollamaLocalOnDeck: true,
  ollamaIp: "",
  textModelRoutingOrder: [],
  visionModelRoutingOrder: [],
  modelAllowHighVramFallbacks: true,
};
const MODELS = ["a:1b", "b:1b", "c:1b"];

function mountPlaces() {
  const box: { latest: TryOrderPlaces | null } = { latest: null };
  function Probe() {
    box.latest = useTryOrderPlaces({ host: HOST, deckInstalled: new Set(MODELS), deckLoading: false, refreshKey: null });
    return null;
  }
  render(<Probe />);
  return box;
}

/** A disk whose reads and writes the test can hold back and let go. */
function slowDisk() {
  const disk: { order: string[]; releases: Array<() => void> } = { order: [], releases: [] };
  const held = <T,>(v: () => T) => new Promise<T>((resolve) => disk.releases.push(() => resolve(v())));
  setRpcHandler("load_settings", () => held(() => ({ ...defaultSettingsFixture(), text_model_routing_order: disk.order })));
  setRpcHandler("save_settings", (patch) =>
    held(() => {
      disk.order = (patch as { text_model_routing_order: string[] }).text_model_routing_order;
      return { ...defaultSettingsFixture(), text_model_routing_order: disk.order };
    }),
  );
  return disk;
}

beforeEach(() => {
  resetFakeDeckyRpc();
  setRpcHandler("load_settings", () => defaultSettingsFixture());
});

describe("move", () => {
  it("changes the order the hook hands out at the press, before any call answers", async () => {
    const box = mountPlaces();
    await waitFor(() => expect(box.latest!.order).toEqual(MODELS));
    slowDisk();
    act(() => void box.latest!.move("a:1b", 1));
    expect(box.latest!.order).toEqual(["b:1b", "a:1b", "c:1b"]);
    expect(box.latest!.placeOf("a:1b")).toBe(2);
    expect(box.latest!.isAutomatic).toBe(false);
  });

  it("hands back the order that is really saved when the save fails", async () => {
    const box = mountPlaces();
    await waitFor(() => expect(box.latest!.order).toEqual(MODELS));
    setRpcHandler("save_settings", () => {
      throw new Error("disk full");
    });
    await act(async () => {
      await box.latest!.move("a:1b", 1);
    });
    expect(box.latest!.order).toEqual(MODELS);
    expect(box.latest!.isAutomatic).toBe(true);
  });

  it("three quick presses show each step at once and end with the saved order three slow ones would give", async () => {
    const box = mountPlaces();
    await waitFor(() => expect(box.latest!.order).toEqual(MODELS));
    const disk = slowDisk();
    let all: Promise<unknown> = Promise.resolve();
    act(() => {
      all = Promise.all([box.latest!.move("a:1b", 1), box.latest!.move("a:1b", 1), box.latest!.move("c:1b", -1)]);
    });
    // a:1b down twice gives b, c, a; then c:1b up one place gives c, b, a.
    expect(box.latest!.order).toEqual(["c:1b", "b:1b", "a:1b"]);
    // Let every held read and write go, in the order they arrive, until the three jobs are done.
    await act(async () => {
      for (let i = 0; i < 40; i++) {
        disk.releases.splice(0).forEach((r) => r());
        await new Promise((r) => setTimeout(r, 5));
      }
      await all;
    });
    expect(disk.order).toEqual(["c:1b", "b:1b", "a:1b"]);
    expect(box.latest!.order).toEqual(["c:1b", "b:1b", "a:1b"]);
  });
});
