/**
 * Title: Voice input offers its own downloads the first time the microphone is pressed without them
 *
 * Purpose: The first-time setup lets a person untick the speech models and the voice engine (plan 105, lane D3),
 * and says Voice input offers them the first time it is used. This is that offer: when the microphone on the Ask
 * bar is pressed (with the Voice input permission on) and the back end answers that the voice engine or its speech
 * model is not there, the download box opens instead of a toast. It names the sites and sizes (ghcr.io for the
 * voice engine's build image, whose build then fetches its compilers from its own package servers; huggingface.co
 * for the speech model), with the ring on Cancel. Yes starts the same install the Settings tab's "Install voice
 * engine" starts; Cancel or B changes nothing.
 *
 * Used for: useVoiceAskInput.ts (the microphone button's press).
 *
 * Solves: The press used to show "whisper-cli is not installed. Open Settings → Voice input and tap Install voice
 * engine (downloads whisper-cli + model)": a program's name and a trip to another tab, with no way to say yes there.
 *
 * Does not: Ask for the microphone permission (the press shows that message first, and the install refuses
 * without it), record anything, or follow the install's progress (the Settings tab's Voice input section picks a
 * running install up through voiceInstallBusyStore.ts).
 */
import { toaster } from "@decky/api";

import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../shared/deckyCall";
import { confirmDownload } from "../downloads/downloadNotice";
import { voiceEngineNotices } from "../downloads/downloadSites";
import { markVoiceInstallStarted, takeVoiceInstallMarker } from "./voiceInstallBusyStore";

/** The back end's answers to a microphone press that mean a download is missing (voice_rpc.py). */
export const VOICE_DOWNLOAD_MISSING_CODES: readonly string[] = ["engine_missing", "model_missing"];

const OFFER_BODY =
  "Voice input needs the voice engine, which is built on this Deck and can take several minutes, and its speech " +
  "model. Your voice never leaves the Deck. You can also do this later in Settings, Voice input.";

/**
 * The offer. Resolves true when the install started. Reads what is missing from the voice engine's status, so the
 * box names only that; nothing missing (it arrived meanwhile) opens no box.
 */
export async function offerVoiceDownloads(): Promise<boolean> {
  const status = await callDeckyWithTimeout<[], { model_id?: string; binary_ready?: boolean; model_ready?: boolean }>(
    "get_voice_engine_status",
    [],
    DECKY_RPC_TIMEOUT_MS,
  ).catch(() => null);
  const model = status?.model_id || "base.en";
  const notices = voiceEngineNotices({ engineReady: Boolean(status?.binary_ready), modelReady: Boolean(status?.model_ready), model });
  if (!notices.length) return false;
  const yes = await confirmDownload(notices, { always: true, title: "Set up Voice input?", body: OFFER_BODY, actionLabel: "Download" });
  if (!yes) return false;
  markVoiceInstallStarted();
  const out = await callDeckyWithTimeout<[string], { accepted?: boolean; reason?: string }>("install_voice_engine", [model], DECKY_RPC_TIMEOUT_MS).catch(
    (e: unknown) => ({ accepted: false, reason: formatDeckyRpcError(e) }),
  );
  if (!out?.accepted) {
    takeVoiceInstallMarker();
    toaster.toast({ title: "Voice input is not set up", body: out?.reason ?? "The download did not start.", duration: 5000 });
    return false;
  }
  toaster.toast({
    title: "Setting up Voice input",
    body: "The voice engine is being built on this Deck. Press the microphone again once it is ready.",
    duration: 6000,
  });
  return true;
}
