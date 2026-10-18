/**
 * Voice input settings install/reinstall affordances.
 *
 * When whisper-cli and the selected model are both ready, the section must not
 * present the primary action as though installation is still required.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { VoiceInputSettingsSection } from "./VoiceInputSettingsSection";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

function renderSection(microphoneAccessEnabled = true) {
  return render(
    <VoiceInputSettingsSection
      voiceSttModel="tiny.en"
      setVoiceSttModel={() => {}}
      microphoneAccessEnabled={microphoneAccessEnabled}
    />,
  );
}

describe("VoiceInputSettingsSection engine action", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
  });

  it("on screen, base.en reads as the recommended model and tiny.en as the lighter one, in that order", () => {
    renderSection();
    const base = screen.getByLabelText("base.en (more accurate, recommended)");
    const tiny = screen.getByLabelText("tiny.en (faster, less accurate)");
    expect(tiny.compareDocumentPosition(base) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows Reinstall when binary and model are ready", async () => {
    setRpcHandler("get_voice_engine_status", () => ({
      model_id: "tiny.en",
      binary_ready: true,
      model_ready: true,
      ready: true,
      install: { phase: "idle", done: true },
    }));
    renderSection();

    await screen.findByText("Reinstall voice engine");
    expect(screen.getByText(/Voice engine is ready for on-device transcription/)).toBeTruthy();
    expect(screen.queryByText("Install voice engine")).toBeNull();
    expect(screen.queryByText(/Tap Install voice engine below/)).toBeNull();
  });

  it("shows Install when the engine is not ready", async () => {
    setRpcHandler("get_voice_engine_status", () => ({
      model_id: "tiny.en",
      binary_ready: false,
      model_ready: false,
      ready: false,
      install: { phase: "idle", done: true },
    }));
    renderSection();

    await screen.findByText("Install voice engine");
    expect(screen.getByText(/Tap Install voice engine below/)).toBeTruthy();
    expect(screen.queryByText("Reinstall voice engine")).toBeNull();
    expect(screen.queryByText(/Voice engine is ready/)).toBeNull();
  });

  it("shows Install when only the binary is ready", async () => {
    setRpcHandler("get_voice_engine_status", () => ({
      model_id: "tiny.en",
      binary_ready: true,
      model_ready: false,
      ready: false,
      install: { phase: "idle", done: true },
    }));
    renderSection();

    await screen.findByText("Install voice engine");
    expect(screen.getByText(/tiny.en not downloaded/)).toBeTruthy();
    expect(screen.queryByText("Reinstall voice engine")).toBeNull();
  });

  it("treats binary_ready and model_ready as authoritative even if ready is false", async () => {
    setRpcHandler("get_voice_engine_status", () => ({
      model_id: "tiny.en",
      binary_ready: true,
      model_ready: true,
      ready: false,
      install: { phase: "idle", done: true },
    }));
    renderSection();

    await screen.findByText("Reinstall voice engine");
    expect(screen.queryByText("Install voice engine")).toBeNull();
  });

  it("starts install from the Install label when not ready", async () => {
    setRpcHandler("get_voice_engine_status", () => ({
      model_id: "tiny.en",
      binary_ready: false,
      model_ready: false,
      ready: false,
      install: { phase: "idle", done: true },
    }));
    renderSection();

    fireEvent.click(await screen.findByText("Install voice engine"));

    await waitFor(() =>
      expect(getRpcCallLog().some((c) => c.method === "install_voice_engine")).toBe(true),
    );
  });

  it("allows reinstall from the Reinstall label when ready", async () => {
    setRpcHandler("get_voice_engine_status", () => ({
      model_id: "tiny.en",
      binary_ready: true,
      model_ready: true,
      ready: true,
      install: { phase: "idle", done: true },
    }));
    renderSection();

    fireEvent.click(await screen.findByText("Reinstall voice engine"));

    await waitFor(() =>
      expect(getRpcCallLog().some((c) => c.method === "install_voice_engine")).toBe(true),
    );
  });
});
