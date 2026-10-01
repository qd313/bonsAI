/**
 * Title: The help chip stays gone once the quick start has been opened
 *
 * Purpose: On a first run the Main tab's chip row is one wide "How to use bonsAI" chip. Opening the
 * quick start counts as having seen it, so after the popup closes the row must go back to the
 * suggestion chips. Decky tears the panel down while a popup is open and builds a fresh one on
 * close, so these tests do the same: open the popup, throw the panel away, close the popup, build
 * a new panel, and look at the row. (On the Deck the help chip stayed in the row after Cancel and
 * after "Got it": the note saved just before the popup opened still said "not seen yet" and the
 * fresh panel believed it over the storage flag.)
 *
 * Does not: draw the popup itself (PluginHelpModal.test covers its wording).
 */
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { PLUGIN_HELP_DISMISSED_STORAGE_KEY } from "./data/storageKeys";
import { getRpcCallLog, resetFakeDeckyRpc } from "./test-harness/fakeDeckyRpc";

const hoisted = vi.hoisted(() => ({ modal: null as { props: Record<string, unknown> } | null }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("./test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.modal = content as { props: Record<string, unknown> };
      return { Close: () => {} };
    },
  };
});

const HELP_CHIP = "How to use bonsAI — open quick start";

/** A fresh plugin module: the survival note is module-level state, so one import per test. */
async function freshContent(): Promise<ReactElement> {
  vi.resetModules();
  return ((await import("./index")).default as { content?: unknown }).content as ReactElement;
}

async function mountAndSettle(content: ReactElement) {
  const view = render(content);
  await waitFor(() => {
    expect(getRpcCallLog().some((c) => c.method === "load_settings")).toBe(true);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
  return view;
}

describe("help chip after the quick start popup closes", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    window.localStorage.clear();
  });

  it("shows the help chip on a first run (flag absent)", async () => {
    await mountAndSettle(await freshContent());
    expect(screen.queryByLabelText(HELP_CHIP)).not.toBeNull();
  });

  // The popup wires both its buttons ("Got it" and Cancel) to the same onClose, so one close covers both.
  it("gives the row back to the suggestion chips after the popup closes", async () => {
    const content = await freshContent();
    const first = await mountAndSettle(content);

    act(() => {
      screen.getByLabelText(HELP_CHIP).click();
    });
    expect(hoisted.modal).not.toBeNull();
    expect(window.localStorage.getItem(PLUGIN_HELP_DISMISSED_STORAGE_KEY)).toBe("1");

    // Decky removes the panel while the popup is open and builds a new one when it closes.
    first.unmount();
    act(() => {
      (hoisted.modal!.props.onClose as () => void)();
    });
    const { container } = await mountAndSettle(content);

    expect(screen.queryByLabelText(HELP_CHIP)).toBeNull();
    // ...and the row is the suggestion chips' again, not empty.
    expect(container.querySelector(".bonsai-preset-glass:not(.bonsai-preset-help-chip)")).not.toBeNull();
  });

  it("keeps the chip gone on a later plain mount with the flag stored", async () => {
    window.localStorage.setItem(PLUGIN_HELP_DISMISSED_STORAGE_KEY, "1");
    await mountAndSettle(await freshContent());
    expect(screen.queryByLabelText(HELP_CHIP)).toBeNull();
  });
});

describe("Clear all plugin data brings the help chip back", () => {
  it("turns an already-seen chip back on, and a panel built afterwards shows it", async () => {
    window.localStorage.clear();
    vi.resetModules();
    const { usePluginHelpModal } = await import("./features/plugin-shell/usePluginHelpModal");
    const survival = await import("./utils/bonsaiSessionSurvival");
    const { buildInitialSessionSnapshot } = await import("./features/plugin-shell/initialSessionSnapshot");
    const args = {
      currentTab: "main",
      // Takes the same kind of note the real one does: built from a screen that says "not seen yet".
      captureSessionBeforeModal: () =>
        survival.captureBonsaiSessionForModal({ ...buildInitialSessionSnapshot(), pluginHelpDismissed: false }),
      finalizeShowModalAndRestoreActiveTab: (close: () => void) => close(),
      returnTabRef: { current: "main" },
    };
    const first = renderHook(() => usePluginHelpModal(args));
    act(() => first.result.current.openPluginHelpModal());
    expect(first.result.current.pluginHelpDismissed).toBe(true);
    expect(survival.peekBonsaiSessionPendingRestore()?.pluginHelpDismissed).toBe(true);

    // What onClearAllPluginData does, in the same order: drop the note, wipe storage, reset the flag.
    survival.markPluginDataCleared();
    const { clearBonsaiBrowserStorage } = await import("./utils/clearBonsaiBrowserStorage");
    clearBonsaiBrowserStorage();
    act(() => first.result.current.resetPluginHelpDismissed());
    expect(first.result.current.pluginHelpDismissed).toBe(false);
    first.unmount();

    const second = renderHook(() => usePluginHelpModal(args));
    expect(second.result.current.pluginHelpDismissed).toBe(false);
  });
});
