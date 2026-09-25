/**
 * Title: Unified input layout constants
 * Purpose: Shared pixel constants for Ask bar typography, insets, carousel timing, and search thresholds.
 * Used for: useUnifiedInputSurface, MainTab styles, and intentPackSearch min query length.
 * Solves: Single source of truth so measure overlay, TextField, and CSS stay aligned on Deck.
 * Does not: Apply styles — components consume these values in CSS vars and inline layout.
 */
/** Max height (px) of the whole glass card (text body + bottom icon strip). */
const UNIFIED_INPUT_HEIGHT_MAX_PX = 200;
/** Reserved height (px) for attach + mic strip inside the glass host (below the text body). */
export const UNIFIED_INPUT_ICON_STRIP_PX = 24;
/** Horizontal inset (px) for bottom icon strip — matches avatar top-left (2px), not text body indent. */
export const UNIFIED_INPUT_ICON_STRIP_PAD_X_PX = 2;
/** Minimum text-body height (px) when empty — one line taller than the prior floor (~+1 overlay line at 13px / line-height 1.2). */
export const UNIFIED_TEXT_BODY_MIN_PX = 42;
/** Unified search typography — must match `TextField` and the measure/overlay nodes or the caret misaligns from the painted text. */
export const UNIFIED_TEXT_FONT_PX = 12;
export const UNIFIED_TEXT_LINE_HEIGHT = 1.2;
/** Max text-body height: total cap minus icon strip. */
export const UNIFIED_TEXT_BODY_MAX_PX = UNIFIED_INPUT_HEIGHT_MAX_PX - UNIFIED_INPUT_ICON_STRIP_PX;
/** Padding between measured text and text-body height (matches overlay + field chrome). */
export const UNIFIED_INPUT_HEIGHT_PAD_PX = 7;
/** Left inset (px) for typed-text overlay and measure — top inset kept separate (often looser than L/R/B). */
export const UNIFIED_TEXT_INSET_LEFT_PX = 8;
/** Right inset (px) for typed-text overlay and measure. */
export const UNIFIED_TEXT_INSET_RIGHT_PX = 8;
/** Top inset (px) for typed-text overlay and measure div. */
export const UNIFIED_TEXT_INSET_TOP_PX = 6;
/** Bottom inset (px) inside the text body (above the icon strip). */
export const UNIFIED_TEXT_INSET_BOTTOM_PX = 2;
/** Gap (px) between text body and bottom icon strip in overlay. */
export const UNIFIED_TEXT_OVERLAY_BOTTOM_GAP_PX = 0;
/**
 * Fallback wrap + font stack for the caret overlay and hidden measure div, used only before the
 * first measure pass has copied the real values from the native field's own computed style (see
 * `useUnifiedInputSurface.ts`). The mirrors must never declare their own wrapping or font-family —
 * a mismatch there wraps a long line one character sooner than the real field does, at a fraction
 * of a pixel narrower, and drifts the caret/typed-text overlay off it (roadmap: "The question
 * overlay sits a few pixels off the native text field"). `inherit` is a safe font-family fallback
 * since these divs sit under `.bonsai-scope`, which already carries Steam's own font stack.
 */
export const UNIFIED_TEXT_OVERLAY_FALLBACK_WHITE_SPACE = "pre-wrap";
export const UNIFIED_TEXT_OVERLAY_FALLBACK_OVERFLOW_WRAP = "anywhere";
export const UNIFIED_TEXT_OVERLAY_FALLBACK_FONT_FAMILY = "inherit";
/** Ask primary label (slightly darker than prior `#eef4fb` for calmer contrast). */
export const ASK_LABEL_COLOR = "#a8b4c4";
/** Same chroma as `ASK_LABEL_COLOR` at 50% opacity (e.g. mode selector label to match Ask bar family). */
export const ASK_LABEL_COLOR_50 = "rgba(168, 180, 196, 0.5)";
/** Ask label when the prompt has text and Ask is idle — readable “ready” state without Steam accent yellow. */
export const ASK_LABEL_READY_COLOR = "#d0dbe8";
/** Duration (ms) for Ask bar idle → ready visual crossfade (glass overlay + label). */
export const ASK_READY_STATE_TRANSITION_MS = 150;
/*
 * ASK_BAR_LAYOUT_SHIFT_RIGHT_PX and ASK_BAR_ROW_WIDTH_EXTRA_PX were removed 2026-08-15. They tuned
 * a measured px width for the Ask row; that row is plain `width: 100%` now and matches the unified
 * input host by construction, so there is nothing left to nudge. See section-4.ts.
 */
/** Min height (px) for the main-tab Ask glass row and primary `DialogButton` (touch target). */
export const ASK_BAR_PRIMARY_MIN_HEIGHT_PX = 36;
/** Minimum characters in the unified field before settings search returns matches (avoids noisy single-letter results). */
export const SETTINGS_SEARCH_MIN_QUERY_LENGTH = 2;

/**
 * Bright accent green for UI keywords ([beta], latency labels, About warning line).
 * Tuned for contrast on dark QAM panels (readable vs older muted forest).
 */
export const BONSAI_FOREST_GREEN = "#2e8753";
/** Single size for all Decky `Tabs` title icons (SVG). Keep ~22–28px for QAM strip — larger values blow out LB/RB layout (shell width tracks this). */
export const TAB_TITLE_ICON_PX = 26;
/** Space between the LB/RB tab strip and the scrollable tab panel below (QAM). */
export const TAB_STRIP_BODY_GAP_PX = 4;
/**
 * Horizontal inset (px) for tab body content inside the QAM plugin panel.
 * 0 since 2026-08-15: rows were visibly short of the QAM edges on device, and this was the only
 * inset bonsAI itself contributed. Raise to 2–4 if a glass-panel border ever clips against the
 * scroll container edge — the remaining gap comes from ancestors above `.bonsai-scope`, not here.
 */
export const BONSAI_PLUGIN_SIDE_PAD_PX = 0;

/** Vertical gap (px) between the Ask bar and the chat transcript (user bubble column). */
export const BONSAI_CHAT_INPUT_TO_TRANSCRIPT_GAP_PX = 12;
/** Space between live reply chrome (e.g. Retry) and **Save chat to Desktop**. */
export const BONSAI_CHAT_TRANSCRIPT_TO_SAVE_GAP_PX = 14;
/** Vertical gap (px) above the AI response bubble stack (below status/thinking lines). */
export const BONSAI_CHAT_RESPONSE_STACK_MARGIN_TOP_PX = 12;
/** Main-tab AI bubble max width as a fraction of the transcript column (0–1). Not imported on its
 *  own outside this file any more (2026-09-24) — every consumer wants the CSS value below. */
const BONSAI_CHAT_AI_BUBBLE_MAX_FRAC = 0.92;
/** The same max width, as the CSS `min()` MainTabChatTranscript and its reply blocks apply. */
export const BONSAI_CHAT_AI_MAX_WIDTH_CSS = `min(${Math.round(BONSAI_CHAT_AI_BUBBLE_MAX_FRAC * 100)}%, 100%)`;
/** Main tab tree glyph — same outer cell as other tabs for uniform hit/outline; slightly larger than gear. */
export const TAB_TITLE_MAIN_TAB_ICON_PX = 36;
/** Debug tab — same outer cell as other tabs so LB/RB strip outlines match. */
export const TAB_TITLE_DEBUG_TAB_ICON_PX = 36;
/** the open strip's solid bar, plan 59 board 2a; the lifted accent is computed against it */
export const TAB_BAR_STRIP_BG_HEX = "#141c24";
/**
 * Plan 30 — the collapsing tab bar (docs/archive/30-collapsing-tab-bar.md § 4.8). CSS px before
 * `--bonsai-ui-scale`; every use goes through `uiScalePx()`. The two heights are the point of the
 * plan: Steam's strip cost 80.66px (measured 2026-09-02), the bar at rest costs 20.
 */
export const TAB_BAR_REST_HEIGHT_PX = 20;
/**
 * The floating strip while the ring is on the bar. Floats over the panel; the wrapper stays 20px.
 * Raised from 54 to 66 by the maintainer on 2026-09-17, from a mockup of three heights drawn over
 * the 14 September Deck photo: on that photo the chat row's dots sit 6 to 10px below a 54px strip
 * and the row's bottom line about 15px below, so 66 covers the dots with 2px to spare and still
 * leaves the row's own bottom line showing under the strip. The Deck evening (plan 59 row 2A-07)
 * may move it by a pixel or two either way.
 */
export const TAB_BAR_OPEN_HEIGHT_PX = 66;
export const TAB_BAR_DASH_W_PX = 14;
export const TAB_BAR_DASH_H_PX = 3;
/** The active dash is this much taller than the others. */
export const TAB_BAR_DASH_ACTIVE_EXTRA_H_PX = 2;
export const TAB_BAR_DASH_GAP_PX = 4;
/** The active tab's name beside the dashes — the size the chat-slot bumper pills already use. */
export const TAB_BAR_NAME_PX = 11;
/** The LB / RB marks at the ends of the bar. */
export const TAB_BAR_SHOULDER_MARK_PX = 9;
/** The gap between the open strip's cells (plan 59 § 3 item 1). */
export const TAB_BAR_CELL_GAP_PX = 2;

/**
 * Plan 59 — the open tab strip redesign (docs/archive/59-tab-strip-redesign-build.md § 3, § 5):
 * six equal-width cells, one matching icon each, only the lit cell's name shown under it.
 */
/** Plan 59: each cell's fixed height in the open strip. */
export const TAB_BAR_CELL_HEIGHT_PX = 44;
/** Plan 59: every icon in the strip is drawn at this size. */
export const TAB_BAR_CELL_ICON_PX = 22;
/** Plan 59: the bug's artwork carries inner padding; drawn at 26 in the 22px box it matches the others. */
export const TAB_BAR_CELL_BUG_ICON_PX = 26;
/** Plan 59: the icon's distance from the cell's top edge. */
export const TAB_BAR_CELL_ICON_TOP_PX = 6;
/** Plan 59: the lit cell's name, shown under its icon. */
export const TAB_BAR_CELL_NAME_PX = 9.5;
/** Plan 59: the lit cell's rounded corners. */
export const TAB_BAR_CELL_RADIUS_PX = 8;
/** Plan 59: the strip's own top/bottom padding. */
export const TAB_BAR_STRIP_PAD_Y_PX = 5;
/** Plan 59: the strip's own left/right padding. */
export const TAB_BAR_STRIP_PAD_X_PX = 6;
/** Plan 59: the fixed LB/RB slot width, so the cells never shift when the marks hide. */
export const TAB_BAR_SLOT_W_PX = 20;
/** Plan 59: the LB/RB pill's top/bottom padding. */
export const TAB_BAR_PILL_PAD_Y_PX = 3;
/** Plan 59: the LB/RB pill's left/right padding. */
export const TAB_BAR_PILL_PAD_X_PX = 4;
/** Plan 59: the tab-switch fade — the cell's fill and the name's opacity/colour. */
export const TAB_BAR_SWITCH_FADE_MS = 120;

/** Deck inline menu popovers (ask mode, attach, accent intensity). */
export const DECK_MENU_GAP_PX = 6;
export const DECK_MENU_ROW_PAD_X_PX = 10;
export const DECK_MENU_ROW_PAD_Y_PX = 8;
export const DECK_MENU_PANEL_MIN_WIDTH_PX = 88;
export const DECK_MENU_PANEL_BG = "rgb(28, 36, 44)";
export const DECK_MENU_ROW_SELECTED_BG = "rgb(40, 50, 62)";
export const DECK_MENU_FONT_PX = 13;
/** Bright cyan highlight for sliders, links, and active controls on dark QAM panels. */
export const DECK_HIGHLIGHT_CYAN = "#9ce7ff";
