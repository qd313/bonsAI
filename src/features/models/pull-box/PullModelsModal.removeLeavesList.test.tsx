/**
 * Title: A removed model leaves the Browse models list at once
 *
 * Purpose: Pins the 2026-11-18 round: after "Remove model" is confirmed and the back end answers ok, the
 * model's row is gone from the list straight away, not only once the follow-up look at what is installed
 * (a connection test, then a size fetch, each up to many seconds) has finished. The real screen is drawn
 * with installed models, the Remove box is accepted, the delete answers, and the follow-up look is held
 * unanswered while the test reads the rows. A second case lets the look answer that the model is still
 * there, and the row comes back.
 *
 * Does not: prove where the ring lands on the device (the row going earlier changes nothing there: the
 * ring's memory is cleared when the box is accepted, as before).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, configure, fireEvent, render, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 5000 });

const hoisted = vi.hoisted(() => ({ shown: [] as unknown[] }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: unknown) => {
      hoisted.shown.push(el);
      return { Close: () => {}, Update: () => {} };
    },
  };
});

import { PullModelsModal } from "./PullModelsModal";
import { IP_STORAGE_KEY } from "../../../shared/storageKeys";
import { resetRemoveReturnForTests } from "./pullModelsRemoveReturn";
import { drawConfirmBox } from "../../../test-harness/confirmBoxProbe";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../../../test-harness/rpcFixtures";

const DECK_MODELS = ["qwen3:4b", "nomic-embed-text:latest", "gemma4:e2b-it-qat"];

type Look = { reachable: boolean; version: string; models: string[] };
let lookAnswers: Array<(v: Look) => void> = [];
let looks = 0;

beforeEach(() => {
  hoisted.shown = [];
  lookAnswers = [];
  looks = 0;
  window.localStorage.setItem(IP_STORAGE_KEY, "192.168.86.27:11434");
  resetRemoveReturnForTests();
  resetFakeDeckyRpc();
  setRpcHandler("load_settings", () => defaultSettingsFixture());
  // The first look (when the box opens) answers at once; every later one is held until the test lets it go.
  setRpcHandler("test_ollama_connection", () => {
    looks += 1;
    if (looks === 1) return { reachable: true, version: "0.34.1", models: DECK_MODELS };
    return new Promise<Look>((resolve) => lookAnswers.push(resolve));
  });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.localStorage.removeItem(IP_STORAGE_KEY);
  document.body.innerHTML = "";
});

const draw = () =>
  render(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />);

const findRow = (container: HTMLElement, tag: string) =>
  Array.from(container.querySelectorAll<HTMLElement>(".bonsai-pullmodels-table-row--data")).find(
    (x) => x.querySelector(".bonsai-pullmodels-tag-name-text")?.textContent?.trim() === tag,
  );

async function removeAndWaitForAnswer(container: HTMLElement, tag: string) {
  const row = await waitFor(() => {
    const r = findRow(container, tag);
    if (!r) throw new Error(`no ${tag} row`);
    return r;
  });
  // An installed row is the one that has a Remove control.
  fireEvent.click(row.querySelector<HTMLButtonElement>(".bonsai-pullmodels-delete-btn")!);
  const box = drawConfirmBox(hoisted.shown[0]);
  await act(async () => box.pressAction());
  await waitFor(() => expect(getRpcCallLog().some((c) => c.method === "delete_ollama_model")).toBe(true));
  await waitFor(() => expect(lookAnswers).toHaveLength(1));
}

/** A row that is installed carries the Remove control; a row that is only in the catalog does not. */
const isInstalledRow = (container: HTMLElement, tag: string) =>
  Boolean(findRow(container, tag)?.querySelector(".bonsai-pullmodels-delete-btn"));

describe("a removed model's row", () => {
  it("is no longer installed in the list once the delete answers ok, before the follow-up look answers", async () => {
    const { container } = draw();
    await waitFor(() => expect(isInstalledRow(container, "qwen3:4b")).toBe(true));
    await removeAndWaitForAnswer(container, "qwen3:4b");
    // The follow-up look is still out (held), yet the row has already lost its Remove control.
    expect(isInstalledRow(container, "qwen3:4b")).toBe(false);
    expect(isInstalledRow(container, "gemma4:e2b-it-qat")).toBe(true);
  });

  it("comes back if the follow-up look shows the model is in fact still installed", async () => {
    const { container } = draw();
    await waitFor(() => expect(isInstalledRow(container, "qwen3:4b")).toBe(true));
    await removeAndWaitForAnswer(container, "qwen3:4b");
    expect(isInstalledRow(container, "qwen3:4b")).toBe(false);
    await act(async () => lookAnswers[0]({ reachable: true, version: "0.34.1", models: DECK_MODELS }));
    await waitFor(() => expect(isInstalledRow(container, "qwen3:4b")).toBe(true));
  });
});
