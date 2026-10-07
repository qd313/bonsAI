/**
 * Title: The microphone button reacts the moment it is pressed
 *
 * Purpose: Starting the voice server and loading the speech model can take a while, and the
 * button used to change only after the back end's start call returned. In that wait a press looked
 * dead (the maintainer's 2026-10-06 report). These tests mount the whole plugin, hold the start
 * call open, and read what the screen shows.
 *
 * Does not: test the listening loop (useVoiceAskInput.test.ts does).
 */
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../../test-harness/rpcFixtures";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return { ...stubs, showModal: () => ({ Close: () => {} }) };
});

async function mountPlugin(): Promise<ReturnType<typeof render>> {
  vi.resetModules();
  const plugin = (await import("../../index")).default as { content?: unknown };
  const view = render(plugin.content as ReactElement);
  await waitFor(() => {
    expect(getRpcCallLog().some((c) => c.method === "load_settings")).toBe(true);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 40));
  });
  return view;
}

function button(container: HTMLElement, label: string): HTMLElement | null {
  return container.querySelector(`[aria-label="${label}"]`);
}

async function press(container: HTMLElement, label: string) {
  await waitFor(() => expect(button(container, label)).not.toBeNull(), { timeout: 5_000 });
  await act(async () => {
    button(container, label)!.click();
    await new Promise((r) => setTimeout(r, 20));
  });
}

const startCalls = () => getRpcCallLog().filter((c) => c.method === "start_voice_transcription").length;
const SLOW = 120_000;

describe("the microphone button while the voice server is still starting", () => {
  let finishStart: (out: unknown) => void = () => {};

  beforeEach(() => {
    resetFakeDeckyRpc();
    window.localStorage.clear();
    setRpcHandler("load_settings", () => ({
      ...defaultSettingsFixture(),
      capabilities: { ...defaultSettingsFixture().capabilities, microphone_access: true },
    }));
    setRpcHandler("start_voice_transcription", () => new Promise((resolve) => (finishStart = resolve)));
    setRpcHandler("get_voice_transcription_status", () => ({
      status: "recording",
      recording: true,
      streaming: false,
      partial_transcript: "",
      finalized_transcript: "",
    }));
    setRpcHandler("stop_voice_transcription", () => ({ stopped: true, status: "idle" }));
  });

  it("reads 'Starting voice input' at once, ignores a second press, then becomes Stop", async () => {
    const { container } = await mountPlugin();
    await press(container, "Voice input");

    // The start call has not returned, yet the button already looks different.
    expect(button(container, "Starting voice input")).not.toBeNull();
    expect(button(container, "Voice input")).toBeNull();

    await press(container, "Starting voice input");
    expect(startCalls()).toBe(1);
    expect(button(container, "Starting voice input")).not.toBeNull();

    await act(async () => {
      finishStart({ accepted: true });
      await new Promise((r) => setTimeout(r, 20));
    });
    await waitFor(() => expect(button(container, "Stop voice input")).not.toBeNull());
    expect(button(container, "Starting voice input")).toBeNull();
    expect(startCalls()).toBe(1);
  }, SLOW);

  it("goes back to the plain microphone when the start is refused", async () => {
    const { container } = await mountPlugin();
    await press(container, "Voice input");
    expect(button(container, "Starting voice input")).not.toBeNull();

    await act(async () => {
      finishStart({ accepted: false, error: "engine_missing", reason: "engine missing" });
      await new Promise((r) => setTimeout(r, 20));
    });
    await waitFor(() => expect(button(container, "Voice input")).not.toBeNull());
    expect(button(container, "Starting voice input")).toBeNull();
  }, SLOW);
});
