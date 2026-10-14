/**
 * Title: The two one-time notices stay short
 *
 * Purpose: Plan 93 lane B9 (the maintainer, 2026-10-13: every warning should be much shorter). Opens
 * the first-run beta notice and the Local runtime (beta) notice through the real hook, renders the
 * box the way Steam would show it, and counts the words a person reads. Each is at most 40 words,
 * keeps its safety line ("use at your own risk" and the crash-with-a-game warning), the bug-report
 * address, and names no model or old size.
 */
import { act, render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ boxes: [] as ReactElement[] }));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: ReactElement) => {
      hoisted.boxes.push(el);
      return { Close: () => {} };
    },
  };
});

import { useDisclaimerAndLocalRuntimeGates } from "./useDisclaimerAndLocalRuntimeGates";

const noopHooks = {
  onBeforeDeckyModal: () => {},
  onCompleteDeckyModalClose: (close: () => void) => close(),
};

/** The words drawn in the box's description, as a person reads them. */
function drawnWords(box: ReactElement): string {
  const { container } = render(box);
  return container.querySelector('[data-decky-ui="ConfirmModalDescription"]')?.textContent ?? "";
}
const count = (text: string) => text.split(/\s+/).filter(Boolean).length;

beforeEach(() => {
  hoisted.boxes = [];
  window.localStorage.clear();
});

describe("first-run beta notice wording", () => {
  it("is at most 40 words and keeps the risk line, the crash warning and the bug address", () => {
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, false, noopHooks));
    expect(hoisted.boxes).toHaveLength(1);
    const text = drawnWords(hoisted.boxes[0]);
    expect(count(text)).toBeLessThanOrEqual(40);
    expect(text).toMatch(/beta/i);
    expect(text).toMatch(/can be wrong/i);
    expect(text).toMatch(/use at your own risk/i);
    expect(text).toMatch(/crash a game/i);
    expect(text).toContain("https://github.com/qd313/bonsAI/issues");
  });
});

describe("Local runtime (beta) notice wording", () => {
  it("is at most 40 words, keeps the risk line and the way off, and names no model or old size", () => {
    window.localStorage.setItem("bonsai:disclaimer-accepted", "1");
    const { rerender } = renderHook(
      ({ on }) => useDisclaimerAndLocalRuntimeGates(true, on, noopHooks),
      { initialProps: { on: false } },
    );
    act(() => rerender({ on: true }));
    expect(hoisted.boxes).toHaveLength(1);
    const text = drawnWords(hoisted.boxes[0]);
    expect(count(text)).toBeLessThanOrEqual(40);
    expect(text).toMatch(/use at your own risk/i);
    expect(text).toMatch(/crash/i);
    expect(text).toMatch(/home network/i);
    expect(text).toMatch(/Run AI on this Deck/);
    expect(text).toMatch(/Ollama tab/);
    expect(text).not.toMatch(/qwen|gemma|GiB/i);
  });
});
