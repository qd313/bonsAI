/**
 * Title: "Remove <model> from the Deck?" opens on the safe choice
 *
 * Purpose: Pin plan 76 lane 2 round 3, bug 1 (docs/test-evidence/plan76-P76-NOMIC-REMOVE-HINT.json).
 * Steam opens a ConfirmModal with the ring on its OK button, and this box had "Remove model" there,
 * so one A press removed an installed model (a download to get back). OK is now "Not now" and
 * "Remove model" sits on the middle button, the download notice's own shape (downloadNotice.tsx).
 * What removing does is unchanged. Cancel and B remove nothing.
 *
 * Does not: prove where the ring lands on the device; that is the Deck row's job.
 */
import { act, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type BoxProps = {
  strTitle?: unknown;
  strOKButtonText?: unknown;
  strMiddleButtonText?: unknown;
  strCancelButtonText?: unknown;
  onOK?: () => void;
  onMiddleButton?: () => void;
  onCancel?: () => void;
};

const hoisted = vi.hoisted(() => ({ box: null as BoxProps | null, closed: 0, deletes: [] as string[] }));

vi.mock("@decky/ui", () => ({
  ConfirmModal: () => null,
  showModal: (el: ReactElement<BoxProps>) => {
    hoisted.box = el.props;
    return { Close: () => (hoisted.closed += 1), Update: () => {} };
  },
}));
vi.mock("@decky/api", () => ({ toaster: { toast: () => {} } }));
vi.mock("../utils/deckyCall", () => ({
  DECKY_RPC_TIMEOUT_MS: 1000,
  formatDeckyRpcError: String,
  callDeckyWithTimeout: async (method: string, args: unknown[]) => {
    if (method === "delete_ollama_model") hoisted.deletes.push(String(args[0]));
    return { ok: true };
  },
}));

import { usePullModelDeleteConfirm } from "./usePullModelDeleteConfirm";

function openBox(): BoxProps {
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
  return hoisted.box!;
}

beforeEach(() => {
  hoisted.box = null;
  hoisted.closed = 0;
  hoisted.deletes = [];
});

describe('"Remove nomic-embed-text:latest from the Deck?"', () => {
  it("puts the safe choice on OK, where the ring lands, and Remove model on the middle button", () => {
    const box = openBox();
    expect(box.strOKButtonText).toBe("Not now");
    expect(box.strMiddleButtonText).toBe("Remove model");
    expect(box.strCancelButtonText).toBe("Cancel");
  });

  it("OK (the ring's first stop) closes the box and removes nothing", async () => {
    const box = openBox();
    await act(async () => box.onOK?.());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.deletes).toEqual([]);
  });

  it("Cancel and B also remove nothing", async () => {
    const box = openBox();
    await act(async () => box.onCancel?.());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.deletes).toEqual([]);
  });

  it("the middle button removes the model, as OK used to", async () => {
    const box = openBox();
    await act(async () => box.onMiddleButton?.());
    expect(hoisted.closed).toBe(1);
    expect(hoisted.deletes).toEqual(["nomic-embed-text:latest"]);
  });
});
