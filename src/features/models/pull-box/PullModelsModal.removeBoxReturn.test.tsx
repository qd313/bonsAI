/**
 * Title: After B on the "Remove <model> from the Deck?" box the ring is back on that row's Remove control
 *
 * Purpose: Pins plan 93 round 2 (workshop:test-evidence/plan93-P93-M9-CONFIRM-BOXES-after.json, Deck build
 * 0ef34f82): in the AI models screen, B (or Cancel) on the Remove box left the ring on the next row's
 * pull tick box instead of on the Remove control that opened it, twice. The real screen is drawn with
 * installed models, a row's Remove control is pressed, Steam is stood in for by putting the ring on the
 * next row's tick box the way the Deck did, the box's Cancel or B is pressed, and the test reads which
 * element has the ring a moment later. One case also unmounts the whole screen and draws it again between
 * opening and closing the box (closing a Decky box rebuilds what is behind it), so the memory has to
 * live outside the component and find the NEW row's control. A removal that is confirmed hands nothing back.
 *
 * Does not: prove Steam's own ring on the device (jsdom has none; the Deck row does).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configure, fireEvent, render, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 10000 });

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

const PC_ADDRESS = "192.168.86.27:11434";
const DECK_MODELS = ["qwen3:4b", "nomic-embed-text:latest", "gemma4:e2b-it-qat"];

beforeEach(() => {
  hoisted.shown = [];
  window.localStorage.setItem(IP_STORAGE_KEY, PC_ADDRESS);
  resetRemoveReturnForTests();
  resetFakeDeckyRpc();
  setRpcHandler("load_settings", () => defaultSettingsFixture());
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.34.1", models: DECK_MODELS }));
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.localStorage.removeItem(IP_STORAGE_KEY);
  document.body.innerHTML = "";
});

const draw = () =>
  render(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />);

async function rowOf(container: HTMLElement, tag: string): Promise<HTMLElement> {
  return waitFor(() => {
    const r = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-pullmodels-table-row--data")).find(
      (x) => x.querySelector(".bonsai-pullmodels-tag-name-text")?.textContent?.trim() === tag,
    );
    if (!r) throw new Error(`no ${tag} row`);
    return r;
  });
}

const removeControl = (row: HTMLElement) => row.querySelector<HTMLButtonElement>(".bonsai-pullmodels-delete-btn")!;
/** A pull tick box of another row (the Deck put the ring on the next row's); any other row's star will do if none is drawn. */
const tickOfNextRow = (row: HTMLElement) => {
  const scope = row.parentElement!.parentElement ?? document.body;
  const stops = Array.from(scope.querySelectorAll<HTMLButtonElement>(".bonsai-pullmodels-col--pull button"));
  const other = stops.find((b) => !row.contains(b) && /to pull$/.test(b.getAttribute("aria-label") ?? "")) ?? stops.find((b) => !row.contains(b));
  if (!other) throw new Error("no other row to stand in for Steam's ring");
  return other;
};

/** Press a row's Remove control, then do what Steam did on the Deck: put the ring on the next row's tick box. */
async function openRemoveBox(container: HTMLElement, tag: string) {
  const row = await rowOf(container, tag);
  fireEvent.click(removeControl(row));
  expect(hoisted.shown).toHaveLength(1);
  const box = drawConfirmBox(hoisted.shown[0]);
  expect(box.labels).toEqual(["Cancel", "Remove model"]);
  return { row, box };
}

describe("the Remove box hands the ring back to the row that opened it", () => {
  it.each(["Cancel", "B"] as const)("%s: the ring is on that row's Remove control, not the next row's tick box", async (how) => {
    const { container } = draw();
    const { row, box } = await openRemoveBox(container, "qwen3:4b");
    // The Deck: after the box closed the ring was on the next row's pull tick box.
    tickOfNextRow(row).focus();
    if (how === "Cancel") box.pressCancel();
    else box.pressB();
    await waitFor(() => expect(document.activeElement).toBe(removeControl(row)));
    // And it stays there once Steam has settled.
    await new Promise((r) => setTimeout(r, 1000));
    expect(document.activeElement).toBe(removeControl(row));
  });

  it("when the whole screen was drawn again while the box was open, the ring goes to the NEW row's Remove control", async () => {
    const first = draw();
    const { row, box } = await openRemoveBox(first.container, "qwen3:4b");
    first.unmount();
    const second = draw();
    const newRow = await rowOf(second.container, "qwen3:4b");
    expect(newRow).not.toBe(row);
    tickOfNextRow(newRow).focus();
    box.pressB();
    await waitFor(() => expect(document.activeElement).toBe(removeControl(newRow)));
  });

  it("a confirmed removal does not pull the ring back to the row that is going", async () => {
    const { container } = draw();
    const { row, box } = await openRemoveBox(container, "qwen3:4b");
    const tick = tickOfNextRow(row);
    tick.focus();
    box.pressAction();
    await waitFor(() => expect(getRpcCallLog().some((c) => c.method === "delete_ollama_model")).toBe(true));
    await new Promise((r) => setTimeout(r, 1000));
    expect(document.activeElement).not.toBe(removeControl(row));
  });
});
