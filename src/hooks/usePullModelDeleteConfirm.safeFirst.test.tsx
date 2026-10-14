/**
 * Title: "Remove <model> from the Deck?" opens on the safe choice
 *
 * Purpose: Pin plan 76 lane 2 round 3, bug 1 (docs/test-evidence/plan76-P76-NOMIC-REMOVE-HINT.json)
 * and plan 93. Steam puts the ring on the first button of a box, and this box had "Remove model" there,
 * so one A press removed an installed model (a download to get back). It then showed three buttons
 * (Not now / Remove model / Cancel); it is now the shared two-button box, drawn and read off the page:
 * Cancel first, Remove model beside it. What removing does is unchanged. Cancel and B remove nothing.
 *
 * Does not: prove where the ring lands on the device; that is the Deck row's job.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  box: null as unknown,
  closed: 0,
  deletes: [] as string[],
  deleteArgs: [] as unknown[][],
  savedIp: "",
}));

vi.mock("@decky/ui", async () => ({
  ...(await import("../test-harness/fakeDeckyUi")),
  showModal: (el: unknown) => {
    hoisted.box = el;
    return { Close: () => (hoisted.closed += 1), Update: () => {} };
  },
}));
vi.mock("../features/plugin-shell/pluginStorage", () => ({ loadSavedIp: () => hoisted.savedIp }));
vi.mock("@decky/api", () => ({ toaster: { toast: () => {} } }));
vi.mock("../utils/deckyCall", () => ({
  DECKY_RPC_TIMEOUT_MS: 1000,
  formatDeckyRpcError: String,
  callDeckyWithTimeout: async (method: string, args: unknown[]) => {
    if (method === "delete_ollama_model") {
      hoisted.deletes.push(String(args[0]));
      hoisted.deleteArgs.push(args);
    }
    return { ok: true };
  },
}));

import { drawConfirmBox, type DrawnConfirmBox } from "../test-harness/confirmBoxProbe";
import { usePullModelDeleteConfirm } from "./usePullModelDeleteConfirm";

function openBox(): DrawnConfirmBox {
  const hook = renderHook(() =>
    usePullModelDeleteConfirm({
      activeRoutingTag: null,
      completeNestedModalClose: (close) => close(),
      refreshInstalledAndMeta: async () => {},
      setSelectedTags: () => {},
      setDeleteBusyTag: () => {},
    })
  ).result.current;
  hook.confirmDelete("nomic-embed-text:latest", 0.3);
  expect(hoisted.box).not.toBeNull();
  return drawConfirmBox(hoisted.box);
}

beforeEach(() => {
  hoisted.box = null;
  hoisted.closed = 0;
  hoisted.deletes = [];
  hoisted.deleteArgs = [];
  hoisted.savedIp = "";
});

describe('"Remove nomic-embed-text:latest from the Deck?"', () => {
  it("shows Cancel and Remove model only, Cancel first where the ring lands", () => {
    const box = openBox();
    expect(box.labels).toEqual(["Cancel", "Remove model"]);
  });

  it("Cancel (the ring's first stop) closes the box and removes nothing", async () => {
    const box = openBox();
    await act(async () => box.pressCancel());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.deletes).toEqual([]);
  });

  it("B also removes nothing", async () => {
    const box = openBox();
    await act(async () => box.pressB());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.deletes).toEqual([]);
  });

  it("the Remove model button removes the model, as OK used to", async () => {
    const box = openBox();
    await act(async () => box.pressAction());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.deletes).toEqual(["nomic-embed-text:latest"]);
  });
});

describe("the remove call carries the PC address", () => {
  it("sends the address the screen last saved, so a PC that has the model keeps its place in the order", async () => {
    hoisted.savedIp = " 192.168.1.20 ";
    const box = openBox();
    await act(async () => box.pressAction());
    expect(hoisted.deleteArgs).toEqual([["nomic-embed-text:latest", "192.168.1.20"]]);
  });

  it("sends an empty address when none was ever saved", async () => {
    const box = openBox();
    await act(async () => box.pressAction());
    expect(hoisted.deleteArgs).toEqual([["nomic-embed-text:latest", ""]]);
  });
});
