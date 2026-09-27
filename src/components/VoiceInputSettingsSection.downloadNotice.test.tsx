/**
 * Title: Installing the voice engine asks the download notice first
 *
 * Purpose: Pin that "Install voice engine" waits for the download notice (downloadNotice.tsx),
 * names only what is still missing (the engine's build image at ghcr.io, the speech model at
 * huggingface.co), and starts nothing when the notice is declined.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ answer: false, notices: [] as unknown[] }));
vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: async (n: unknown) => {
    hoisted.notices.push(n);
    return hoisted.answer;
  },
}));

import { VoiceInputSettingsSection } from "./VoiceInputSettingsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

function renderWith(binaryReady: boolean, modelReady: boolean) {
  setRpcHandler("get_voice_engine_status", () => ({
    model_id: "tiny.en",
    binary_ready: binaryReady,
    model_ready: modelReady,
    ready: binaryReady && modelReady,
    install: { phase: "idle", done: true },
  }));
  render(<VoiceInputSettingsSection voiceSttModel="tiny.en" setVoiceSttModel={() => {}} microphoneAccessEnabled />);
}

const installCalls = () => getRpcCallLog().filter((c) => c.method === "install_voice_engine");
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetFakeDeckyRpc();
  hoisted.answer = false;
  hoisted.notices = [];
});

describe("VoiceInputSettingsSection download notice", () => {
  it("declined notice installs nothing, and names both missing pieces", async () => {
    renderWith(false, false);
    fireEvent.click(await screen.findByText("Install voice engine"));
    await waitFor(() => expect(hoisted.notices).toHaveLength(1));
    const sites = (hoisted.notices[0] as { site: string }[]).map((n) => n.site);
    expect(sites).toEqual(["https://ghcr.io", "https://huggingface.co"]);
    await settle();
    expect(installCalls()).toHaveLength(0);
  });

  it("names only the speech model when the engine is already built", async () => {
    renderWith(true, false);
    fireEvent.click(await screen.findByText("Install voice engine"));
    await waitFor(() => expect(hoisted.notices).toHaveLength(1));
    expect(hoisted.notices[0]).toEqual([
      { site: "https://huggingface.co", what: "the tiny.en speech model", size: null },
    ]);
  });

  it("accepted notice installs", async () => {
    hoisted.answer = true;
    renderWith(false, false);
    fireEvent.click(await screen.findByText("Install voice engine"));
    await waitFor(() => expect(installCalls()).toHaveLength(1));
  });
});
