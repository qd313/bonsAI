/**
 * Title: What the first-run gate's tests share
 *
 * Purpose: A stand-in for @decky/ui whose showModal records every box the gate opens (the Beta Notice, a
 * Steam confirm box, the where-the-AI-runs popup) instead of drawing it, and the host the screen hands the gate.
 *
 * Used for: the useDisclaimerAndLocalRuntimeGates tests.
 *
 * Solves: One copy of the recorder and the host, so the first-open, first-run and popup tests read the same boxes.
 *
 * Does not: Run any test, or draw the popup; a test that wants it drawn renders the recorded element itself.
 */
import type { ReactElement } from "react";
import { vi } from "vitest";

import * as fakeStubs from "../../test-harness/fakeDeckyUi";
import type { FirstRunWhereAiRunsHost } from "../ai-connection/first-run/FirstRunWhereAiRunsModal";

export type ShownBox = {
  /** A Steam confirm box's title; empty for the popup. */
  title: string;
  onOK: () => void;
  element: ReactElement;
  /** Set for the where-the-AI-runs popup: the host it was handed, and how it is closed. */
  host?: FirstRunWhereAiRunsHost;
  onClose?: () => void;
  closed: boolean;
};

export const shown: ShownBox[] = [];
export const resetShown = () => {
  shown.length = 0;
};
export const popups = () => shown.filter((s) => s.host);
export const betaNotices = () => shown.filter((s) => s.title.includes("Beta Notice"));
export const runtimeNotices = () => shown.filter((s) => s.title.includes("Local runtime"));

export function deckyUiRecordingModals(): Record<string, unknown> {
  return {
    ...fakeStubs,
    showModal: (element: ReactElement) => {
      const props = element.props as {
        strTitle?: string;
        onOK?: () => void;
        host?: FirstRunWhereAiRunsHost;
        onClose?: () => void;
      };
      const box: ShownBox = {
        title: String(props.strTitle ?? ""),
        onOK: props.onOK ?? (() => {}),
        element,
        host: props.host,
        onClose: props.onClose,
        closed: false,
      };
      shown.push(box);
      return {
        Close: () => {
          box.closed = true;
        },
      };
    },
  };
}

/** What the screen hands the gate: every change is a spy, close runs the close it is given at once. */
export const gateHooks = (extra: Record<string, unknown> = {}) => ({
  onBeforeDeckyModal: vi.fn(),
  onCompleteDeckyModalClose: vi.fn((close: () => void) => close()),
  saveSettingsNow: vi.fn(),
  whereAiRuns: {
    ollamaLocalAutostart: false,
    ollamaIp: "192.168.1.",
    setOllamaLocalOnDeck: vi.fn(),
    setOllamaLocalAutostart: vi.fn(),
    setOllamaIp: vi.fn(),
    persistOllamaIp: vi.fn(),
  },
  ...extra,
});
