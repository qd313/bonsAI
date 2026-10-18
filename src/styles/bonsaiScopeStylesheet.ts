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
import { buildDetailsSlotSection } from "../features/answer/details/detailsSlotStyles";
import { buildSection5Section } from "./sections/section-5";
import { buildSection6Section } from "./sections/section-6";
import { buildSection7Section } from "./sections/section-7";
import { buildSection8Section } from "./sections/section-8";
import { buildSection9Section } from "./sections/section-9";
import { buildTabIndicatorBarSection } from "../features/plugin-shell/tabIndicatorBarStyles";
import { buildAboutTabSection } from "../features/about/aboutTabStyles";
import { buildGameRunningLighterSection } from "./gameRunningLighter";
import { buildFoldedTabsSection } from "../features/folded-tabs/foldedTabs";
import { buildUserNotesSection } from "../features/user-notes/userNotes";
import {
  buildGamepadFocusRingStylesheet,
  buildPullModelsStylesheet,
  buildModalPortalStylesheet,
} from "../features/models/pull-box/gamepadAndPullModels";

/** Scoped Deck/QAM CSS injected once under `.bonsai-scope`. */
export function buildBonsaiScopeStylesheet(): string {
  return (
    buildScopebaseSection() +
    buildSection1Section() +
    buildSection2Section() +
    buildSection3Section() +
    buildSection4Section() +
    buildDetailsSlotSection() +
    buildSection5Section() +
    buildSection6Section() +
    buildSection7Section() +
    buildSection8Section() +
    buildSection9Section() +
    buildTabIndicatorBarSection() +
    buildAboutTabSection() +
    buildGamepadFocusRingStylesheet() +
    buildPullModelsStylesheet() +
    buildFoldedTabsSection() +
    buildUserNotesSection() +
    /* Last: its rules hold still animations defined above (plan 70). */
    buildGameRunningLighterSection()
  );
}

export { buildGamepadFocusRingStylesheet, buildPullModelsStylesheet, buildModalPortalStylesheet };
