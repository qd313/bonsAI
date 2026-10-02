/**
 * Title: The X beside Ask empties the question box, spoken or typed, after Ask and Stop
 *
 * Purpose: On the real microphone the maintainer spoke a question, pressed Ask, pressed Stop on
 * the answer, then pressed the X beside Ask: nothing happened, the spoken words stayed in the
 * question box. These tests mount the whole plugin (the same tree the Deck shows), drive that
 * exact sequence through the Ask bar's own buttons with the microphone faked at the RPC layer,
 * and read the question box's text at the end.
 *
 * Cause being guarded: the microphone was still listening. The listening loop writes the words
 * heard so far into the box every fraction of a second, so the X cleared the box and the loop
 * wrote the same words straight back.
 *
 * Does not: test the listening loop alone (useVoiceAskInput.test.ts does).
 */
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture, idleBackgroundStatusFixture } from "../../test-harness/rpcFixtures";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  return { ...stubs, showModal: () => ({ Close: () => {} }) };
});

const SPOKEN = "how do I beat the first boss";

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

/** The question box's current text, as the screen shows it. */
function boxText(container: HTMLElement): string {
  const field = container.querySelector('[data-decky-ui="TextField"]');
  return field?.getAttribute("value") ?? "";
}

function button(container: HTMLElement, label: string): HTMLElement | null {
  // The Ask button carries no aria-label; it is the one primary button in the Ask row.
  if (label === "Ask") return container.querySelector(".bonsai-ask-primary");
  return container.querySelector(`[aria-label="${label}"]`);
}

async function press(container: HTMLElement, label: string) {
  try {
    await waitFor(() => expect(button(container, label)).not.toBeNull(), { timeout: 5_000 });
  } catch (e) {
    const labels = Array.from(container.querySelectorAll("[aria-label]")).map((n) => n.getAttribute("aria-label"));
    throw new Error(`no "${label}"; labels: ${JSON.stringify(labels)}; text: ${container.textContent?.slice(0, 300)}`);
  }
  const el = button(container, label)!;
  await act(async () => {
    el.click();
    await new Promise((r) => setTimeout(r, 20));
  });
}

async function settle(ms: number) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

const asked = { question: "" };

function fakeMicrophone() {
  // The back end keeps listening until told to stop, and always reports what it has heard so far.
  setRpcHandler("load_settings", () => ({ ...defaultSettingsFixture(), capabilities: { ...defaultSettingsFixture().capabilities, microphone_access: true } }));
  setRpcHandler("start_voice_transcription", () => ({ accepted: true }));
  setRpcHandler("get_voice_transcription_status", () => ({
    status: "recording",
    recording: true,
    streaming: true,
    partial_transcript: "",
    finalized_transcript: SPOKEN,
  }));
  setRpcHandler("stop_voice_transcription", () => ({
    status: "stopped",
    recording: false,
    streaming: false,
    partial_transcript: "",
    finalized_transcript: SPOKEN,
    stopped: true,
  }));
  // A question that never finishes by itself: Stop is what ends it.
  setRpcHandler("start_background_game_ai", (...args: unknown[]) => {
    const question = String((args[0] as { question?: string } | undefined)?.question ?? "");
    asked.question = question;
    return { accepted: true, status: "pending" as const, request_id: 1 };
  });
  // Idle until a question has been started (a pending status at open would resume it on mount).
  setRpcHandler("get_background_game_ai_status", () =>
    asked.question
      ? { ...idleBackgroundStatusFixture(), status: "pending", request_id: 1, question: asked.question }
      : idleBackgroundStatusFixture(),
  );
}

// Mounting the whole plugin is slow when the machine is busy (the first import alone took 48 s).
const SLOW = 120_000;

describe("the X beside Ask after Ask and Stop", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    asked.question = "";
    window.localStorage.clear();
    fakeMicrophone();
  });

  it("empties the box after a spoken question, with the microphone still listening", async () => {
    const { container } = await mountPlugin();
    await press(container, "Voice input");
    await waitFor(() => expect(boxText(container)).toBe(SPOKEN));

    await press(container, "Ask");
    await waitFor(() => expect(button(container, "Stop generation")).not.toBeNull());
    await press(container, "Stop generation");
    await press(container, "Clear");

    // Long enough for several listening-loop ticks to have written the words back.
    await settle(500);
    expect(boxText(container)).toBe("");
    expect(button(container, "Clear")).toBeNull();
    // Dictation is over: the back end was told to stop and the corner button offers the mic again.
    expect(getRpcCallLog().some((c) => c.method === "stop_voice_transcription")).toBe(true);
    expect(button(container, "Voice input")).not.toBeNull();
  }, SLOW);

  it("empties the box after a spoken question, with the microphone already stopped", async () => {
    const { container } = await mountPlugin();
    await press(container, "Voice input");
    await waitFor(() => expect(boxText(container)).toBe(SPOKEN));
    await press(container, "Stop voice input");

    await press(container, "Ask");
    await waitFor(() => expect(button(container, "Stop generation")).not.toBeNull());
    await press(container, "Stop generation");
    await press(container, "Clear");

    await settle(500);
    expect(boxText(container)).toBe("");
  }, SLOW);

  it("empties the box after a typed question", async () => {
    const { container } = await mountPlugin();
    const field = container.querySelector('[data-decky-ui="TextField"]') as HTMLElement;
    // The stub field is a plain element, so the typed text comes in through the field's own onChange.
    const fiberKey = Object.keys(field).find((k) => k.startsWith("__reactProps"))!;
    const props = (field as unknown as Record<string, { onChange: (e: unknown) => void }>)[fiberKey];
    await act(async () => {
      props.onChange({ target: { value: "typed question" } });
    });
    await waitFor(() => expect(boxText(container)).toBe("typed question"));

    await press(container, "Ask");
    await waitFor(() => expect(button(container, "Stop generation")).not.toBeNull());
    await press(container, "Stop generation");
    await press(container, "Clear");

    await settle(300);
    expect(boxText(container)).toBe("");
  }, SLOW);
});

describe("Ask while the microphone is still listening ends dictation", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    asked.question = "";
    window.localStorage.clear();
    fakeMicrophone();
  });

  it("sends the box as it was, ignores words heard afterwards, and offers the mic again", async () => {
    const { container } = await mountPlugin();
    await press(container, "Voice input");
    await waitFor(() => expect(boxText(container)).toBe(SPOKEN));

    // The back end takes a moment to accept the question; Ask only empties the box once it has.
    // That gap is where a still-listening mic used to add words to the box.
    setRpcHandler("start_background_game_ai", async (...args: unknown[]) => {
      asked.question = String((args[0] as { question?: string } | undefined)?.question ?? "");
      await new Promise((r) => setTimeout(r, 1200));
      return { accepted: true, status: "pending" as const, request_id: 1 };
    });
    await press(container, "Ask");
    // The mic hears more right after the press; nothing heard after it may land anywhere.
    setRpcHandler("get_voice_transcription_status", () => ({
      status: "recording",
      recording: true,
      streaming: true,
      partial_transcript: "and also the second boss",
      finalized_transcript: SPOKEN,
    }));
    await waitFor(() => expect(asked.question).not.toBe(""));
    expect(asked.question).toBe(SPOKEN);

    await settle(400);
    expect(boxText(container)).toBe(SPOKEN);
    await waitFor(() => expect(getRpcCallLog().some((c) => c.method === "stop_voice_transcription")).toBe(true));
    expect(asked.question).toBe(SPOKEN);
    await press(container, "Stop generation");
    expect(button(container, "Voice input")).not.toBeNull();
  }, SLOW);
});
