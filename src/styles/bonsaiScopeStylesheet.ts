/**
 * Title: Scoped stylesheet builder
 * Purpose: Concatenate all bonsAI scope CSS sections into one injectable string for `.bonsai-scope`.
 * Used for: index.tsx / BonsaiPluginShell — single style tag for QAM plugin chrome.
 * Solves: Central entry for section-1…9, scope base, gamepad rings, and modal portal CSS.
 * Does not: Define per-section tokens — see `styles/sections/*` (intentionally light-touch).
 */
import { buildScopebaseSection } from "./sections/scopeBase";
import { buildSection1Section } from "./sections/section-1";
import { buildSection2Section } from "./sections/section-2";
import { buildSection3Section } from "./sections/section-3";
import { buildSection4Section } from "./sections/section-4";
import { buildSection5Section } from "./sections/section-5";
import { buildSection6Section } from "./sections/section-6";
import { buildSection7Section } from "./sections/section-7";
import { buildSection8Section } from "./sections/section-8";
import { buildSection9Section } from "./sections/section-9";
import { buildTabIndicatorBarSection } from "./sections/tabIndicatorBar";
import { buildGameRunningLighterSection } from "./sections/gameRunningLighter";
import {
  buildGamepadFocusRingStylesheet,
  buildPullModelsStylesheet,
  buildModalPortalStylesheet,
} from "./sections/gamepadAndPullModels";

/** Scoped Deck/QAM CSS injected once under `.bonsai-scope`. */
export function buildBonsaiScopeStylesheet(): string {
  return (
    buildScopebaseSection() +
    buildSection1Section() +
    buildSection2Section() +
    buildSection3Section() +
    buildSection4Section() +
    buildSection5Section() +
    buildSection6Section() +
    buildSection7Section() +
    buildSection8Section() +
    buildSection9Section() +
    buildTabIndicatorBarSection() +
    buildGamepadFocusRingStylesheet() +
    buildPullModelsStylesheet() +
    /* Last: its rules hold still animations defined above (plan 70). */
    buildGameRunningLighterSection()
  );
}

export { buildGamepadFocusRingStylesheet, buildPullModelsStylesheet, buildModalPortalStylesheet };
