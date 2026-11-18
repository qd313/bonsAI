/**
 * Title: The microphone, pressed with Voice input's downloads missing, offers them
 *
 * Purpose: Plan 105, lane D3: the speech models and the voice engine can be left out at first-time setup, and Voice
 * input offers them the first time it is used. Pressed through the real microphone hook with the back end's answers
 * faked: with the engine missing, the press opens the download box (the shared notice, read as a person sees it):
 * "Set up Voice input?", the sites with what comes from each (ghcr.io and its compilers, huggingface.co), Download and
 * Cancel. Yes starts the same install the Settings tab starts, for the model the person picked; Cancel starts
 * nothing. With only the model missing, only Hugging Face is named. Any other refusal still shows its own line.
 *
 * Does not: open a real Steam box or build anything.
 */
import { act, renderHook } from "@testing-library/react";
import type { ReactElement } from "react";
import { toaster } from "@decky/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ boxes: [] as ReactElement[] }));
vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
  return {
    ...fake,
    showModal: (el: ReactElement) => {
      hoisted.boxes.push(el);
      return { Close: () => {} };
    },
  };
});

import { useVoiceAskInput } from "./useVoiceAskInput";
import { getRpcCallLog, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { drawConfirmBox } from "../../test-harness/confirmBoxProbe";
import { setDownloadPermissionBridge } from "../downloads/downloadNotice";
import { resetVoiceInstallMarkerForTests } from "./voiceInstallBusyStore";

const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 30))));
const installs = () => getRpcCallLog().filter((c) => c.method === "install_voice_engine");

async function pressMic(refusal: { error: string; reason: string }) {
  setRpcHandler("start_voice_transcription", () => ({ accepted: false, ...refusal }));
  const { result } = renderHook(() =>
    useVoiceAskInput({ setUnifiedInput: () => {}, unifiedInput: "", microphoneAccess: true, isAsking: false, uiT: (k: string) => k }),
  );
  await act(async () => result.current.onMicInput());
  await settle();
  return result;
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetVoiceInstallMarkerForTests();
  hoisted.boxes = [];
  setDownloadPermissionBridge(null);
  vi.mocked(toaster.toast).mockClear();
});

describe("the microphone with Voice input's downloads missing", () => {
  it("opens the download box naming each site; Download starts the install for the picked model", async () => {
    setRpcHandler("get_voice_engine_status", () => ({ model_id: "base.en", binary_ready: false, model_ready: false }));
    const result = await pressMic({ error: "engine_missing", reason: "whisper-cli is not installed." });
    expect(hoisted.boxes).toHaveLength(1);
    const box = drawConfirmBox(hoisted.boxes[0]);
    expect(box.title).toBe("Set up Voice input?");
    expect(box.labels).toEqual(["Download", "Cancel"]);
    expect(box.text).toContain("https://ghcr.io to download the voice engine's build image, which then fetches its compilers from archive.ubuntu.com and security.ubuntu.com, and the sites they hand off to (about 500 MB)");
    expect(box.text).toContain("https://huggingface.co to download the base.en speech model");
    expect(box.text).not.toContain("whisper-cli");
    expect(installs()).toHaveLength(0);
    box.pressAction();
    await settle();
    expect(installs().map((c) => c.args)).toEqual([["base.en"]]);
    expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Setting up Voice input" }));
    expect(result.current.voiceRecording).toBe(false);
  });

  it("Cancel starts nothing", async () => {
    setRpcHandler("get_voice_engine_status", () => ({ model_id: "tiny.en", binary_ready: false, model_ready: true }));
    await pressMic({ error: "engine_missing", reason: "whisper-cli is not installed." });
    drawConfirmBox(hoisted.boxes[0]).pressCancel();
    await settle();
    expect(installs()).toHaveLength(0);
  });

  it("with only the speech model missing, names only Hugging Face", async () => {
    setRpcHandler("get_voice_engine_status", () => ({ model_id: "tiny.en", binary_ready: true, model_ready: false }));
    await pressMic({ error: "model_missing", reason: "Download the tiny.en voice model in Settings → Voice input first." });
    const box = drawConfirmBox(hoisted.boxes[0]);
    expect(box.text).toContain("huggingface.co to download the tiny.en speech model");
    expect(box.text).not.toContain("ghcr.io");
  });

  it("any other refusal still shows its own line and opens no box", async () => {
    await pressMic({ error: "model_downloading", reason: "The speech model is still downloading." });
    expect(hoisted.boxes).toHaveLength(0);
    expect(toaster.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Voice input unavailable", body: "The speech model is still downloading." }));
  });
});
