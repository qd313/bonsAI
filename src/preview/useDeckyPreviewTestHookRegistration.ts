/**
 * Title: Wiring the preview test hooks into Content
 *
 * Purpose: Registers `window.__bonsaiTestHooks` (see `previewTestHooks.ts`) from live values
 * inside `Content`, but only when running under Decky Plugin Studio's preview harness.
 *
 * Used for: `index.tsx`, once, so `scripts/run-preview-suite.mjs` and tier QA scenarios can
 * drive an Ask, seed a finished reply, or read the panel's state without a real D-pad.
 *
 * Solves: Nothing on its own — it is the same registration effect `index.tsx` used to carry
 * inline, moved out so the file that composes the whole panel does not also have to hold every
 * preview scenario's plumbing.
 *
 * Does not: Run in a production Deck build; `registerPreviewTestHooks` itself is a no-op
 * outside `isDeckyPreviewRuntime()`, which this hook checks first.
 */
import { useEffect } from "react";
import { Router } from "@decky/ui";

import { registerPreviewTestHooks, isDeckyPreviewRuntime } from "./previewTestHooks";
import { buildReplyLayoutReport } from "./replyLayoutReport";
import type { BonsaiSessionSurvivalSnapshot } from "../utils/bonsaiSessionSurvival";
import type { useBonsaiPluginShell } from "../hooks/useBonsaiPluginShell";
import type { usePluginSettings } from "../hooks/usePluginSettings";
import type { useBonsaiAskOrchestration } from "../hooks/useBonsaiAskOrchestration";
import type { useScreenshotBrowser } from "../hooks/useScreenshotBrowser";
import type { useDisclaimerAndLocalRuntimeGates } from "../hooks/useDisclaimerAndLocalRuntimeGates";

type PluginShell = ReturnType<typeof useBonsaiPluginShell>;
type PluginSettings = ReturnType<typeof usePluginSettings>;
type AskOrchestration = ReturnType<typeof useBonsaiAskOrchestration>;
type ScreenshotBrowser = ReturnType<typeof useScreenshotBrowser>;
type DisclaimerGates = ReturnType<typeof useDisclaimerAndLocalRuntimeGates>;

export type UseDeckyPreviewTestHookRegistrationArgs = {
  currentTab: PluginShell["currentTab"];
  setCurrentTab: PluginShell["setCurrentTab"];
  unifiedInput: string;
  setUnifiedInput: (value: string) => void;
  askMode: PluginSettings["askMode"];
  isAsking: AskOrchestration["isAsking"];
  ollamaResponse: AskOrchestration["ollamaResponse"];
  lastExchange: AskOrchestration["lastExchange"];
  capabilities: PluginSettings["capabilities"];
  lastTransparency: AskOrchestration["lastTransparency"];
  onAskOllama: AskOrchestration["onAskOllama"];
  setSelectedAttachment: ScreenshotBrowser["setSelectedAttachment"];
  restoreSessionSnapshot: AskOrchestration["restoreSessionSnapshot"];
  sessionSnapshotRef: React.MutableRefObject<() => BonsaiSessionSurvivalSnapshot>;
  showDisclaimerModalAgain: DisclaimerGates["showDisclaimerModalAgain"];
};

/*
 * In: every live value a preview scenario can ask for or needs to set, all owned by `Content`
 * or one of its other hooks.
 * Out: nothing — the effect's only job is the `window.__bonsaiTestHooks` registration.
 * What can go wrong: this re-registers on every render where one of its inputs changed, which
 * is deliberate (a stale closure here would hand a scenario an old `currentTab` or `isAsking`)
 * and cheap (`registerPreviewTestHooks` only runs past its own early return in preview builds).
 */
export function useDeckyPreviewTestHookRegistration({
  currentTab,
  setCurrentTab,
  unifiedInput,
  setUnifiedInput,
  askMode,
  isAsking,
  ollamaResponse,
  lastExchange,
  capabilities,
  lastTransparency,
  onAskOllama,
  setSelectedAttachment,
  restoreSessionSnapshot,
  sessionSnapshotRef,
  showDisclaimerModalAgain,
}: UseDeckyPreviewTestHookRegistrationArgs): void {
  useEffect(() => {
    if (!isDeckyPreviewRuntime()) return;
    registerPreviewTestHooks({
      getState: () => ({
        currentTab,
        unifiedInput,
        askMode,
        isAsking,
        ollamaResponseLen: ollamaResponse.length,
        hasLastExchange: !!lastExchange,
        capabilities,
      }),
      setGame: (title: string, appId?: string) => {
        const app = { display_name: title, appid: Number(appId) || 0 };
        (Router as { setMainRunningApp?: (a: typeof app | null) => void }).setMainRunningApp?.(app);
      },
      triggerAsk: async (text: string) => {
        setUnifiedInput(text);
        await onAskOllama(text);
      },
      attachScreenshot: (base64: string, name = "preview.png") => {
        setSelectedAttachment({
          path: name,
          name,
          source: "picker",
          preview_data_uri: base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`,
        });
      },
      getTransparencyJson: () => lastTransparency,
      // bonsAI stopped writing sysfs on 2026-07-30 and the sandbox write log was
      // removed with it, so there is nothing left to report. Kept as a stable
      // empty contract because DPS preview scenarios live outside this repo and
      // may still call it.
      getSysfsWrites: async () => [],
      setTab: (tabId: string) => setCurrentTab(tabId),
      /*
       * A finished reply on screen without asking a model. Goes through restoreSessionSnapshot —
       * the route the modal-survival path already uses — so no new setter has to be handed out of
       * useBonsaiAskOrchestration just for preview.
       */
      seedFinishedTurn: (question: string, answer: string) => {
        const id = `preview-turn-${Date.now()}`;
        setCurrentTab("main");
        restoreSessionSnapshot({
          ...sessionSnapshotRef.current(),
          currentTab: "main",
          ollamaResponse: answer,
          lastExchange: { question, answer },
          askThreadCollapsed: [{ id, question, answer }],
          askThreadDisplayQuestion: "",
          expandedTurnKey: id,
        });
      },
      getReplyLayoutJson: () => buildReplyLayoutReport(),
      resetDisclaimer: () => {
        try {
          window.localStorage.removeItem("bonsai:disclaimer-accepted");
        } catch {
          /* ignore */
        }
        showDisclaimerModalAgain();
      },
    });
  }, [
    currentTab,
    unifiedInput,
    askMode,
    isAsking,
    ollamaResponse,
    lastExchange,
    capabilities,
    lastTransparency,
    onAskOllama,
    setUnifiedInput,
    setSelectedAttachment,
    setCurrentTab,
    showDisclaimerModalAgain,
    restoreSessionSnapshot,
  ]);
}
