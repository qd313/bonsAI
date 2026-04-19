/** Max height (px) of the whole glass card (text body + bottom icon strip). */
export const UNIFIED_INPUT_HEIGHT_MAX_PX = 200;
/** Reserved height (px) for attach + mic strip inside the glass host (below the text body). */
export const UNIFIED_INPUT_ICON_STRIP_PX = 24;
/** Minimum text-body height (px) when empty — one line taller than the prior floor (~+1 overlay line at 13px / line-height 1.2). */
export const UNIFIED_TEXT_BODY_MIN_PX = 42;
/** Unified search typography — must match `TextField` and the measure/overlay nodes or the caret misaligns from the painted text. */
export const UNIFIED_TEXT_FONT_PX = 14;
export const UNIFIED_TEXT_LINE_HEIGHT = 1.2;
/** Max text-body height: total cap minus icon strip. */
export const UNIFIED_TEXT_BODY_MAX_PX = UNIFIED_INPUT_HEIGHT_MAX_PX - UNIFIED_INPUT_ICON_STRIP_PX;
/** Padding between measured text and text-body height (matches overlay + field chrome). */
export const UNIFIED_INPUT_HEIGHT_PAD_PX = 7;
/** Extra text-body height (px) so growth triggers ~one overlay line before text crowds the icon strip. */
export const UNIFIED_INPUT_EXPAND_AHEAD_PX = Math.ceil(UNIFIED_TEXT_FONT_PX * UNIFIED_TEXT_LINE_HEIGHT);
/** Left inset (px) for typed-text overlay and measure — top inset kept separate (often looser than L/R/B). */
export const UNIFIED_TEXT_INSET_LEFT_PX = 0;
/** Right inset (px) for typed-text overlay and measure. */
export const UNIFIED_TEXT_INSET_RIGHT_PX = 0;
/** Top inset (px) for typed-text overlay and measure div — keep 0 so caret/overlay align with the glass top (Decky adds its own field chrome). */
export const UNIFIED_TEXT_INSET_TOP_PX = 0;
/** Gap (px) between text body and bottom icon strip in overlay. */
export const UNIFIED_TEXT_OVERLAY_BOTTOM_GAP_PX = 0;
/** Ask primary label (slightly darker than prior `#eef4fb` for calmer contrast). */
export const ASK_LABEL_COLOR = "#a8b4c4";
/** Same chroma as `ASK_LABEL_COLOR` at 50% opacity (e.g. mode selector label to match Ask bar family). */
export const ASK_LABEL_COLOR_50 = "rgba(168, 180, 196, 0.5)";
/** Ask label when the prompt has text and Ask is idle — readable “ready” state without Steam accent yellow. */
export const ASK_LABEL_READY_COLOR = "#d0dbe8";
/** Duration (ms) for Ask bar idle → ready visual crossfade (glass overlay + label). */
export const ASK_READY_STATE_TRANSITION_MS = 150;
/** Nudge Ask bar host right (px) after left-edge parity correction — main-tab visual tuning vs glass bleed. */
export const ASK_BAR_LAYOUT_SHIFT_RIGHT_PX = 0;
/**
 * Extra width (px) for the Ask glass + bleed wrap vs the measured unified host border box.
 * The host width tracks the inner field track; this widens the Ask row to match the text area’s outer spill.
 */
export const ASK_BAR_ROW_WIDTH_EXTRA_PX = -1;
/** Min height (px) for the main-tab Ask glass row and primary `DialogButton` (touch target). */
export const ASK_BAR_PRIMARY_MIN_HEIGHT_PX = 36;
/** Minimum characters in the unified field before settings search returns matches (avoids noisy single-letter results). */
export const SETTINGS_SEARCH_MIN_QUERY_LENGTH = 2;

/**
 * Bright accent green for UI keywords ([beta], latency labels, About warning line).
 * Tuned for contrast on dark QAM panels (readable vs older muted forest).
 */
export const BONSAI_FOREST_GREEN = "#2e8753";
export const BONSAI_FOREST_GREEN_MUTED = "rgba(82, 216, 138, 0.88)";

/** Single size for all Decky `Tabs` title icons (SVG). Keep ~22–28px for QAM strip — larger values blow out LB/RB layout (shell width tracks this). */
export const TAB_TITLE_ICON_PX = 26;
/** Square shell around each tab icon; hit target / highlight alignment (slightly larger than icon). */
export const TAB_TITLE_TAB_CELL_PX = 32;
/** Space between the LB/RB tab strip and the scrollable tab panel below (QAM). */
export const TAB_STRIP_BODY_GAP_PX = 14;
/** Main tab tree glyph — same outer cell as other tabs for uniform hit/outline; slightly larger than gear. */
export const TAB_TITLE_MAIN_TAB_ICON_PX = 36;
export const TAB_TITLE_MAIN_TAB_CELL_PX = TAB_TITLE_TAB_CELL_PX;
/** Optical nudge of the main tab tree icon in the LB/RB strip (px, positive = right). */
export const TAB_TITLE_MAIN_ICON_SHIFT_X_PX = 1;
/** Debug tab — same outer cell as other tabs so LB/RB strip outlines match. */
export const TAB_TITLE_DEBUG_TAB_ICON_PX = 36;
export const TAB_TITLE_DEBUG_TAB_CELL_PX = TAB_TITLE_TAB_CELL_PX;
/** Horizontal margin on each tab title button (space between LB/RB strip icons). */
export const TAB_TITLE_TAB_GAP_PX = -6;
