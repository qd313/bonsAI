/**
 * Title: The five plain tabs' controls, as the Deck measured them
 * Purpose: Test data for the tab-body walk tests (tabBodyWalk.tsx): where every control sat in each tab,
 *          measured by the controller rig's Down walk on 2026-10-09 (plan 87, block M4), Settings again on
 *          2026-10-11 (plan 89, M1; docs/test-evidence/plan89-M1-TAB-WALK.json).
 * Used for: TabBodyFocusRoot.walk.test.tsx.
 * Solves: A walk test over invented spacing passes on any plan; these gaps (up to 405 px between two
 *         stops on Developer, 306 on Settings) are the ones that made Steam jump half a screen.
 * Does not: Describe the controls' look. Each stop is [top, height, name, shape?]; `top` is in the tab body's own
 *           coordinates (0 is the top of the body), `contentHeight` is the pane's whole scroll height at the
 *           time (the heading sat at 0.8, 19.5 high). Source: docs/test-evidence/plan87-M4-OTHER-TABS.json and
 *           runs/plan87-M4-{ollama,settings,permissions,developer,about}.json (rect.y + scrollTop - 24).
 */
/**
 * "wrap": the ring lands on a Focusable wrapper around a button, not on the button (the voice model rows and
 * Reinstall voice engine; their selectors end in `div.Panel.Focusable` in runs/plan87-M4-settings.json).
 */
export type StopShape = "wrap";
type TabStopData = [top: number, height: number, name: string, shape?: StopShape];
interface TabGeometry {
  contentHeight: number;
  stops: TabStopData[];
  /** Stops on the same line as stop `i`, reached only by Left and Right; same top and height as stop `i`. */
  beside?: Record<number, string[]>;
}

export const TAB_GEOMETRY: Record<"ollama" | "settings" | "permissions" | "developer" | "about", TabGeometry> = {
  ollama: {
    contentHeight: 1694,
    stops: [
      [40, 22, "Run AI on this Deck"],
      [120, 22, "Start the AI with the Deck"],
      [285, 36, "Update AI engine and installed mod"],
      [329, 36, "Browse and pull Ollama models"],
      [425, 38, "Test connection to Ollama"],
      [570, 22, "Use local knowledge base"],
      [705, 44, "Update knowledge base"],
      [907, 27, "Reply style: Balanced"],
      [962, 22, "Terse mode"],
      [1183, 36, "Set thinking to Off"],
      [1307, 22, "Custom timeouts"],
      [1471, 28, "Unload delay: 15m"],
      [1594, 36, "AI models"],
    ],
  },
  settings: {
    /* Re-measured 2026-10-11 (plan 89, M1: rect.y + scrollTop - 48, the pane at 24 and the body's 24 px inset above
       the first heading); the Text size row had been added since plan 87. Its pane scrolled to 1392.2 at most. */
    contentHeight: 2109,
    stops: [
      [115, 22, "Adjust UI automatically"],
      [209, 36, "Apply UI scale"],
      [365, 44, "Set screenshot quality to Save mem"],
      [545, 36, "Set text size to Small"],
      [669, 22, "Remember what I typed"],
      [861, 22, "Hide spoilers until I tap"],
      [1015, 22, "Show one chip instead of two"],
      [1321, 35, "tiny.en (faster, less accurate)", "wrap"],
      [1361, 35, "base.en (more accurate, recommended)", "wrap"],
      [1466, 38, "Reinstall voice engine", "wrap"],
      [1623, 36, "Off: Answers are read only when yo"],
      [1747, 22, "AI voice & personality"],
      [1901, 22, "Show Developer tab"],
      [2031, 38, "Clear cache..."],
    ],
    /* On the same line as stop 3 (the Text size choices) and stop 13 (Clear all data... beside Clear cache...):
       Left and Right reach them, Down and Up do not (SettingsTabChatTextSizeRow.tsx, SettingsTab.tsx). */
    beside: { 3: ["Set text size to Normal", "Set text size to Large"], 13: ["Clear all data..."] },
  },
  permissions: {
    contentHeight: 762,
    stops: [
      [149, 22, "Read game & screenshot context"],
      [292, 22, "Save files to Desktop"],
      [384, 22, "Steam ban lookup"],
      [476, 22, "Voice input (microphone)"],
      [584, 22, "Internet downloads"],
    ],
  },
  developer: {
    contentHeight: 2592,
    stops: [
      [144, 40, "Install seed knowledge base"],
      [204, 22, "Hybrid retrieval (meaning search)"],
      [475, 22, "On-screen debug HUD"],
      [598, 22, "Warm the Ask model at boot"],
      [831, 60, "Jump to Steam Input (running game)"],
      [1101, 36, "A: Main, every reopen starts on"],
      [1298, 36, "Off: No app activity log file on D"],
      [1344, 22, "Auto-save chat to Desktop notes"],
      [1472, 22, "Verbose Ask logging to Desktop not"],
      [1584, 22, "Force session RAG chips"],
      [1989, 32, "Preset animation: fade"],
      [2031, 22, "Scramble animation"],
      [2191, 32, "Settle"],
      [2245, 32, "300"],
      [2299, 32, "Same as text"],
      [2488, 40, "(no name)"],
    ],
  },
  about: {
    contentHeight: 891,
    stops: [
      [355, 40, "Follow system"],
      [459, 42, "GitHub"],
      [520, 42, "Built on Ollama!"],
      [582, 42, "Bugs & Feature Requests"],
      [775, 42, "Support my Steam Sale habit"],
    ],
  },
};
