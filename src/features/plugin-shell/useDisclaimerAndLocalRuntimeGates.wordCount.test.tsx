/**
 * Title: The two one-time notices stay short
 *
 * Purpose: Plan 93 lane B9 (the maintainer, 2026-10-13: every warning should be much shorter). Opens
 * the first-run beta notice through the real hook, renders the box the way Steam would show it, and
 * counts the words a person reads: at most 40, with its safety line ("use at your own risk" and the
 * crash-with-a-game warning) and the bug-report address. (The Local runtime (beta) notice that used to
 * be checked here is gone, replaced by the where-the-AI-runs popup, plan 96 N1; its warning is the help
 * line under the popup's first switch, checked in FirstRunWhereAiRunsModal.test.tsx.)
 */
import { render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ boxes: [] as ReactElement[] }));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
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
