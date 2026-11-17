/**
 * Title: The first-time setup's beta line stays short and keeps its warning
 *
 * Purpose: Plan 93 lane B9 (the maintainer, 2026-10-13: every warning should be much shorter) and plan 105 lane D3
 * (the Beta Notice box became one short line on the first-time setup popup, as picked on board 5). Opens the popup
 * through the real hook, draws it, and reads the beta line a person reads: at most 40 words, with its safety line
 * ("use at your own risk", the AI can be wrong, and the crash-with-a-game warning), on one line (the fit test
 * checks its width). The bug-report address is on the About tab, not on this line (the drawing leaves it out).
 */
import { render, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ boxes: [] as ReactElement[] }));
vi.mock("@decky/ui", async () => {
  const kit = await import("../ai-connection/first-run/firstRunPopupTestKit");
  return {
    ...kit.deckyUiForFirstRunPopup(),
    showModal: (el: ReactElement) => {
      hoisted.boxes.push(el);
      return { Close: () => {} };
    },
  };
});

import { useDisclaimerAndLocalRuntimeGates } from "./useDisclaimerAndLocalRuntimeGates";
import { gateHooks } from "./firstRunGateTestKit";

const count = (text: string) => text.split(/\s+/).filter(Boolean).length;

beforeEach(() => {
  hoisted.boxes = [];
  window.localStorage.clear();
});

describe("the first-time setup's beta line", () => {
  it("is at most 40 words and keeps the risk line and the crash warning", () => {
    renderHook(() => useDisclaimerAndLocalRuntimeGates(true, false, gateHooks()));
    expect(hoisted.boxes).toHaveLength(1);
    const { container } = render(hoisted.boxes[0]);
    const text = container.querySelector('[data-bonsai-first-run-part="beta"]')?.textContent ?? "";
    expect(count(text)).toBeLessThanOrEqual(40);
    expect(text).toMatch(/beta/i);
    expect(text).toMatch(/can be wrong/i);
    expect(text).toMatch(/use at your own risk/i);
    expect(text).toMatch(/crash a game/i);
  });
});
