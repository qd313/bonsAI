/**
 * Title: UI scale React context
 * Purpose: Provide active UI scale profile, scope inline styles, and Apply remeasure token to descendants.
 * Used for: index.tsx wrapper around tab content and BonsaiModalScope consumers.
 * Solves: Prop-drill-free access to scale vars for portal/modal subtrees outside the QAM tree.
 * Does not: Measure viewport or classify profiles — see useUiScaleProfile and uiScaleScopeBridge.
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
