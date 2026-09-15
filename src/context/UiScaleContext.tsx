/**
 * Title: Passing the UI scale setting down to popups
 *
 * Purpose: bonsAI has a UI scale setting that makes its own text and
 * controls bigger or smaller. Every tab picks that setting up automatically
 * because it is drawn inside the plugin's main box. A popup — the AI models
 * screen, the help popup, and others opened with showModal() — is drawn
 * outside that box, so it has no way to reach the setting on its own. This
 * file is how a popup reaches it anyway: a small shared value the main box
 * publishes once, that any popup can read.
 *
 * Used for: index.tsx, which publishes the current scale; BonsaiModalScope,
 * which every popup uses to read it back.
 *
 * Solves: Without this, every popup would need the scale value threaded
 * into it by hand through however many layers separate it from the main
 * box, instead of reading it directly.
 *
 * Does not: Work out what the current scale actually is, or watch the
 * window for a resize — that measuring work happens elsewhere (see
 * useUiScaleProfile and uiScaleScopeBridge); this file only hands the
 * already-worked-out value down to whoever asks for it.
 */
import React, { createContext, useContext } from "react";
import type { UiScaleProfileId } from "../data/uiScaleProfile";

export type UiScaleContextValue = {
  profileId: UiScaleProfileId;
  scopeStyle: React.CSSProperties;
  generation: number;
  requestApply: () => void;
};

const UiScaleContext = createContext<UiScaleContextValue | null>(null);

export function UiScaleProvider({
  value,
  children,
}: {
  value: UiScaleContextValue;
  children: React.ReactNode;
}) {
  return <UiScaleContext.Provider value={value}>{children}</UiScaleContext.Provider>;
}

function useUiScaleContext(): UiScaleContextValue | null {
  return useContext(UiScaleContext);
}

/** Modal roots must read scale vars — showModal() is outside the QAM tree. */
export function useUiScaleScopeStyle(): React.CSSProperties {
  return useUiScaleContext()?.scopeStyle ?? {};
}
