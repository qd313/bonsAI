/**
 * Title: The real plugin, drawn in Decky's page, puts its tab bar in Steam's strip
 * Purpose: Pin plan 84 step 6 on the plugin Decky actually loads, not a stand-in: `definePlugin`'s own title
 *          view and content, drawn the way Decky draws them (the title view in Decky's title bar beside its back
 *          arrow, the content in Decky's 16-point gap), on the Deck's own 300 by 454 screen
 *          (test-harness/deckyQuickAccessLayout.tsx). The checks are the Deck row's: the tab bar at 0-20, drawn
 *          once and not in bonsAI's box, the chat's name at 20-48, bonsAI's box from 52 to the screen's bottom,
 *          and on leaving, every value step 6 wrote on Decky's parts put back and Steam's container never written.
 * Used for: index.tsx (useTopStripTabBar's wiring, the bar in bonsAI's box only as the fallback), ChatTitleView.tsx.
 * Does not: Walk the D-pad (topStrip.test.tsx does, on the same parts).
 */
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { getRpcCallLog, resetFakeDeckyRpc } from "./test-harness/fakeDeckyRpc";
import { DeckyQuickAccessPage, installQuickAccessLayout } from "./test-harness/deckyQuickAccessLayout";

/** A fresh plugin module each time: the plugin keeps module-level state, as it does on the Deck. */
async function freshPlugin(): Promise<{ titleView: ReactElement; content: ReactElement }> {
  vi.resetModules();
  return (await import("./index")).default as unknown as { titleView: ReactElement; content: ReactElement };
}

function Page({ plugin, open }: { plugin: { titleView: ReactElement; content: ReactElement }; open: boolean }) {
  return (
    <DeckyQuickAccessPage title={open ? plugin.titleView : <span>Decky</span>}>
      {open ? plugin.content : null}
    </DeckyQuickAccessPage>
  );
}

const q = (sel: string) => document.querySelector<HTMLElement>(sel);
const span = (el: HTMLElement | null) => {
  const r = el!.getBoundingClientRect();
  return [Math.round(r.top), Math.round(r.bottom)];
};

let uninstallLayout: () => void = () => {};

beforeEach(() => {
  resetFakeDeckyRpc();
  window.localStorage.clear();
  uninstallLayout = installQuickAccessLayout();
});
afterEach(() => {
  uninstallLayout();
});

describe("the real plugin in Decky's page (plan 84 step 6)", () => {
  it("draws its tab bar once, in Steam's strip at 0-20; the name at 20-48; bonsAI's box from 52 to 454", async () => {
    const plugin = await freshPlugin();
    const view = render(<Page plugin={plugin} open />);
    await waitFor(() => expect(getRpcCallLog().some((c) => c.method === "load_settings")).toBe(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    const strip = q('[data-decky="title"] .bonsai-tab-bar--strip');
    expect(strip).not.toBeNull();
    expect(document.querySelectorAll(".bonsai-tab-bar")).toHaveLength(1);
    expect(span(strip)).toEqual([0, 20]);
    expect(span(q(".bonsai-chat-title__name"))).toEqual([20, 48]);
    const scope = q(".bonsai-scope")!.getBoundingClientRect();
    expect(Math.round(scope.top)).toBe(52);
    expect(Math.round(scope.bottom)).toBe(454);
    view.unmount();
  });

  it("leaving puts Decky's parts back with no inline style, and never writes to Steam's container", async () => {
    const plugin = await freshPlugin();
    const view = render(<Page plugin={plugin} open={false} />);
    const steam = q('[data-testid="steam-tabs"]')!;
    const writes: MutationRecord[] = [];
    const watch = new MutationObserver((records) => writes.push(...records));
    watch.observe(steam, { attributes: true });
    view.rerender(<Page plugin={plugin} open />);
    await waitFor(() => expect(q(".bonsai-tab-bar--strip")).not.toBeNull());
    view.rerender(<Page plugin={plugin} open={false} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    watch.disconnect();
    const page = q('[data-decky="plugin-box"]')!.parentElement!;
    expect([q('[data-decky="title"]'), page].map((el) => el!.getAttribute("style"))).toEqual([null, null]);
    expect(q("button.DialogButton")!.getAttribute("style")).toBeNull();
    /* Decky's gap: step 6's padding is gone. The height lock's own pins on it (height, overflow) are older
       than step 6 and were never undone; Decky rebuilds that part of its page when a plugin closes. */
    expect(q('[data-decky="gap"]')!.style.paddingTop).toBe("");
    expect(writes).toEqual([]);
    view.unmount();
  });
});
