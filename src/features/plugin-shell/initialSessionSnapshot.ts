/**
 * Title: The empty session snapshot
 *
 * Purpose: The shape `Content` hands to `useRef` for its session-survival snapshot before
 * anything has happened yet — no tab switched, no question asked, nothing typed.
 *
 * Used for: `index.tsx`, as the initializer for `sessionSnapshotRef`, which
 * `sessionSnapshotRef.current` is reassigned away from on every render once real values exist.
 *
 * Solves: Nothing but naming a fixed default in one place instead of as an inline object
 * literal inside `useRef(() => {...})`, so the file that composes the whole panel does not
 * have to carry every one of its fields just to say "empty".
 *
 * Does not: Read or write anything — it takes no arguments and has no side effects. Does not
 * decide when a snapshot is empty; `index.tsx` decides that by calling this exactly once, as
 * the ref's initial value.
 */
import { IP_DEFAULT } from "../../data/storageKeys";
import type { BonsaiSessionSurvivalSnapshot } from "../../utils/bonsaiSessionSurvival";

/*
 * In: nothing.
 * Out: a `BonsaiSessionSurvivalSnapshot` with every field at its "nothing has happened yet"
 * value.
 * What can go wrong: nothing reads this after mount, so a wrong default here only ever shows
 * up as a blank first render — there is no state to corrupt.
 */
export function buildInitialSessionSnapshot(): BonsaiSessionSurvivalSnapshot {
  return {
    currentTab: "main",
    unifiedInput: "",
    selectedIndex: -1,
    navigationMessage: "",
    selectedAttachment: null,
    isScreenshotBrowserOpen: false,
    mediaError: "",
    recentScreenshots: [],
    isLoadingRecentScreenshots: false,
    pluginHelpDismissed: false,
    ollamaIp: IP_DEFAULT,
    settingsSnapshot: {},
    ollamaResponse: "",
    ollamaContext: { app_context: "inactive", app_id: "" },
    lastExchange: null,
    askThreadCollapsed: [],
    askThreadDisplayQuestion: "",
    expandedTurnKey: "live",
    suggestedPrompts: [],
    lastTransparency: null,
    modelPolicyDisclosure: null,
    strategyGuideBranches: null,
    strategyChecklist: null,
    elapsedSeconds: null,
    lastApplied: null,
    shortcutSetupVariant: null,
    presetCarouselInject: null,
    showSlowWarning: false,
    lastRequestId: null,
    thinkingSummary: null,
    liveReasoning: null,
    activeSlotId: null,
  } as unknown as BonsaiSessionSurvivalSnapshot;
}
