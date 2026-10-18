/**
 * Title: Stand-ins and helpers for the first-run popup's tests
 *
 * Purpose: What the popup's tests share: @decky/ui with Steam's ring modelled (the Focusable and text field
 * stand-ins of the Search tab's tests), a switch that can be pressed and tells its words, a ModalRoot that
 * keeps its B handler on the element, and a showModal that records the boxes opened over the popup (the
 * download notice). Plus the helpers that press the D-pad on whichever stop has the ring, climbing to the
 * Focusable that owns the handler the way Steam's move events do, and read which stop that is by its words.
 *
 * Used for: FirstRunWhereAiRunsModal.test.tsx and FirstRunWhereAiRunsModal.walk.test.tsx.
 *
 * Solves: One copy of the stand-ins, so the behaviour test and the walk test read the same popup.
 *
 * Does not: Run any test, or model Steam's spatial walk (the popup does not use it).
 */
import React from "react";
import type { ReactElement } from "react";
import { vi } from "vitest";

import * as fakeStubs from "../../../test-harness/fakeDeckyUi";
import { SteamRingFocusable, steamRingHolder, type SteamEl } from "../../../test-harness/steamRing";
import { SteamRingTextField } from "../../search-tab/searchTabTestKit";
import type { FirstRunWhereAiRunsHost } from "./FirstRunWhereAiRunsModal";

/** The boxes opened over the popup (the download notice), as the elements handed to showModal. */
export const boxes: ReactElement[] = [];
export const resetBoxes = () => {
  boxes.length = 0;
};

/** Steam's switch: a button that tells its words and flips when pressed. */
const ToggleField = (p: Record<string, unknown>) => {
  const label = fakeStubs.wordsOf(p.label);
  return (
    <button
      type="button"
      data-decky-ui="ToggleField"
      role="switch"
      aria-label={label}
      aria-checked={Boolean(p.checked)}
      onClick={() => (p.onChange as (v: boolean) => void)(!p.checked)}
    >
      {label}
    </button>
  );
};

/** ModalRoot keeps its B handler where a test can reach it. */
const ModalRoot = (p: { children?: React.ReactNode; onCancel?: () => void }) => (
  <div
    data-decky-ui="ModalRoot"
    ref={(el) => {
      if (el) (el as unknown as { __cancel?: () => void }).__cancel = p.onCancel;
    }}
  >
    {p.children}
  </div>
);

export function deckyUiForFirstRunPopup(): Record<string, unknown> {
  return {
    ...fakeStubs,
    Focusable: SteamRingFocusable,
    TextField: SteamRingTextField,
    ToggleField,
    ModalRoot,
    showModal: (element: ReactElement) => {
      boxes.push(element);
      return { Close: () => {} };
    },
  };
}

/** B, as Steam delivers it to the popup's ModalRoot. */
export function pressB(root: HTMLElement): void {
  (root.querySelector('[data-decky-ui="ModalRoot"]') as unknown as { __cancel?: () => void } | null)?.__cancel?.();
}

type Move = "onMoveUp" | "onMoveDown" | "onMoveLeft" | "onMoveRight";

/**
 * A move press on the stop that has the ring, the way Steam calls it: the handler of the nearest Focusable
 * at or above the ring that has one. Returns what the handler returned, or undefined when none answers
 * (then Steam would use its own step, which the popup never wants).
 */
export function press(key: Move): boolean | undefined {
  let el: SteamEl | null = steamRingHolder() as SteamEl | null;
  while (el) {
    const handler = el.__nav?.[key];
    if (handler) return handler() as boolean | undefined;
    el = el.parentElement as SteamEl | null;
  }
  return undefined;
}

/** The words of the stop that has the ring, or "" when nothing has it. */
export function ringName(): string {
  const el = steamRingHolder();
  if (!el) return "";
  if (el.tagName === "INPUT") return "PC address field";
  return el.getAttribute("aria-label") ?? el.textContent ?? "";
}

/** The popup's host with every change a spy. */
export function popupHost(over: Partial<FirstRunWhereAiRunsHost> = {}): FirstRunWhereAiRunsHost {
  return {
    ollamaLocalOnDeck: true,
    ollamaLocalAutostart: false,
    ollamaIp: "192.168.1.",
    setOllamaLocalOnDeck: vi.fn(),
    setOllamaLocalAutostart: vi.fn(),
    setOllamaIp: vi.fn(),
    persistOllamaIp: vi.fn(),
    saveSettingsNow: vi.fn(),
    onBeforeDeckyModal: vi.fn(),
    onCompleteDeckyModalClose: vi.fn((close: () => void) => close()),
    ...over,
  };
}
