/**
 * Title: The "Find Ollama on LAN (mDNS)" box is short
 *
 * Purpose: Plan 93 lane B9 (the maintainer, 2026-10-13: every warning should be much shorter). Opens the
 * box the Find LAN button asks Steam for, draws it, and checks it is at most 40 words, says what it does
 * and does not do (it looks on the home network, it does not scan addresses or ports), and tells a person
 * what to do when nothing shows.
 *
 * Does not: run a search; the stub only records what the hook asks Steam to show.
 */
import { render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ box: null as ReactElement | null }));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: ReactElement) => {
      hoisted.box = el;
      return { Close: () => {} };
    },
  };
});
vi.mock("../../shared/deckyCall", () => ({
  callDeckyWithTimeout: async () => ({ hosts: [] }),
  formatDeckyRpcError: String,
}));

import { useMdnsOllamaDiscovery } from "./useMdnsOllamaDiscovery";

describe("Find Ollama on LAN (mDNS) box words", () => {
  it("is at most 40 words and keeps what it does, what it does not do, and the manual way", () => {
    const { result } = renderHook(() =>
      useMdnsOllamaDiscovery({
        mdnsDiscovering: false,
        setMdnsDiscovering: () => {},
        setMdnsHosts: () => {},
        setMdnsDiscoveryMessage: () => {},
        ollamaLocalOnDeck: false,
        localSetupBusy: false,
        onBeforeDeckyModal: () => {},
        onCompleteDeckyModalClose: (close) => close(),
      }),
    );
    result.current.openMdnsDiscoveryConfirm();
    expect(hoisted.box).not.toBeNull();
    const { container } = render(hoisted.box!);
    // The box is title, the words (the inner prose block), then the two buttons: Search on the left, Cancel on the right.
    const text = container.querySelectorAll(".bonsai-prose")[1]?.textContent ?? "";
    expect(Array.from(container.querySelectorAll("button")).map((b) => b.textContent)).toEqual(["Search", "Cancel"]);
    expect(text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(40);
    expect(text).toMatch(/looks on your home network for an Ollama PC/);
    expect(text).toMatch(/does not scan addresses or ports/);
    expect(text).toMatch(/type the PC's address yourself/);
    expect(text).not.toMatch(/Avahi|Bonjour|_ollama/);
  });
});
