/**
 * Title: The Text size step reaches every place the plugin draws
 * Purpose: Mount the real plugin with Text size saved as Large (and as Normal) and check the step
 *          lands in every place words are drawn: the plugin's own box, the popups that wrap themselves in
 *          the plugin's look (they read the style the root publishes), the plain popups (they inherit it
 *          from Steam's shared page), and the chat's name and tab bar in Decky's title bar (outside the
 *          box too, so they read it from the title store).
 * Used for: plan 89 (S1), Text size changes every word.
 * Solves: A step written only on the box would scale the tabs and leave the title bar and every popup
 *         at today's size; these tests fail if any of the three is missed.
 * Does not: Resolve the font sizes (textSizeEverywhere.test.tsx does that against the real stylesheet).
 */
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { resetFakeDeckyRpc, setRpcHandler } from "./test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "./test-harness/rpcFixtures";

type DeckyPlugin = { titleView?: unknown; content?: unknown };

async function freshPlugin(): Promise<DeckyPlugin> {
  vi.resetModules();
  return (await import("./index")).default as DeckyPlugin;
}

const SCALE_VAR = "--bonsai-text-scale";

async function mountWith(size: "small" | "normal" | "large") {
  setRpcHandler("load_settings", () => ({ ...defaultSettingsFixture(), chat_text_size: size }));
  const plugin = await freshPlugin();
  const bridge = await import("./utils/uiScaleScopeBridge");
  const view = render(plugin.content as ReactElement);
  const title = render(plugin.titleView as ReactElement);
  return { view, title, bridge };
}

describe("the Text size step reaches the box, the popups and Decky's title bar", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });

  it("writes Large (1.15) on the plugin's box, in the style popups read, and on the title bar's view", async () => {
    const { view, title, bridge } = await mountWith("large");
    await waitFor(
      () => {
        const scope = view.container.querySelector(".bonsai-scope") as HTMLElement;
        expect(scope.style.getPropertyValue(SCALE_VAR)).toBe("1.15");
      },
      { timeout: 4000 },
    );
    expect((bridge.readPublishedUiScaleScopeStyle() as Record<string, string>)[SCALE_VAR]).toBe("1.15");
    await waitFor(() => {
      const root = title.container.querySelector(".bonsai-chat-title") as HTMLElement;
      expect(root.style.getPropertyValue(SCALE_VAR)).toBe("1.15");
    });
    /* Plain popups (showModal with no box of the plugin's around the words) inherit it from the shared page. */
    expect(document.documentElement.style.getPropertyValue(SCALE_VAR)).toBe("1.15");
  }, 30000);

  it("writes Normal as exactly 1 in all three places, and Small as 0.9", async () => {
    const normal = await mountWith("normal");
    await waitFor(
      () => {
        const scope = normal.view.container.querySelector(".bonsai-scope") as HTMLElement;
        expect(scope.style.getPropertyValue(SCALE_VAR)).toBe("1");
      },
      { timeout: 4000 },
    );
    expect((normal.bridge.readPublishedUiScaleScopeStyle() as Record<string, string>)[SCALE_VAR]).toBe("1");
    await waitFor(() => {
      const root = normal.title.container.querySelector(".bonsai-chat-title") as HTMLElement;
      expect(root.style.getPropertyValue(SCALE_VAR)).toBe("1");
    });
    normal.view.unmount();
    normal.title.unmount();

    const small = await mountWith("small");
    await waitFor(
      () => {
        const scope = small.view.container.querySelector(".bonsai-scope") as HTMLElement;
        expect(scope.style.getPropertyValue(SCALE_VAR)).toBe("0.9");
      },
      { timeout: 4000 },
    );
    expect((small.bridge.readPublishedUiScaleScopeStyle() as Record<string, string>)[SCALE_VAR]).toBe("0.9");
  }, 30000);
});
