/**
 * Title: The real plugin keeps Steam's own tab row hidden when it comes back shown
 * Purpose: Pin that index.tsx mounts the Steam tab row guard beside the tabs root (plan 97 L15): the
 *          whole plugin is drawn, Steam's tab panel arrives inside the tabs root with its row shown (the
 *          text-badge shape the hiding rule does not match), and the row ends with a display of none and
 *          one `tabBar.steamRowShown` line in the plugin log. Remove the mount and this fails.
 * Used for: P97-L15-GHOST is the on-device half.
 * Does not: draw Steam's real `Tabs` (the test stand-in for `@decky/ui` has a simpler shape, so the
 *           panel is put into the page by hand, as Steam rebuilding its row would).
 */
import { act, render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { STEAM_TAB_ROW_LOG_TAG } from "./features/plugin-shell/useSteamTabRowGuard";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "./test-harness/fakeDeckyRpc";
import { SteamTabsPanel } from "./test-harness/deckyQuickAccessLayout";

async function freshContent(): Promise<ReactElement> {
  vi.resetModules();
  return ((await import("./index")).default as { content?: unknown }).content as ReactElement;
}

describe("Steam's tab row in the real plugin", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    setRpcHandler("dbg_fe_log", () => ({ ok: true }));
    window.localStorage.clear();
  });

  it("hides Steam's row when it is rebuilt shown inside the tabs root", async () => {
    const { container } = render(await freshContent());
    await waitFor(() => expect(getRpcCallLog().some((c) => c.method === "load_settings")).toBe(true));
    const root = container.querySelector(".bonsai-decky-tabs-root")!;
    expect(root).not.toBeNull();

    const holder = document.createElement("div");
    holder.innerHTML = renderToStaticMarkup(<SteamTabsPanel badges="text" />);
    await act(async () => {
      root.appendChild(holder.firstElementChild!);
      await new Promise((r) => setTimeout(r, 0));
    });

    const row = root.querySelector<HTMLElement>('[data-steam="tab-row"]')!;
    expect(getComputedStyle(row).display).toBe("none");
    const lines = getRpcCallLog().filter((c) => c.method === "dbg_fe_log" && c.args[0] === STEAM_TAB_ROW_LOG_TAG);
    expect(lines).toHaveLength(1);
  });
});
