/**
 * Title: Unified input layout constants
 * Purpose: Shared pixel constants for Ask bar typography, insets, carousel timing, and search thresholds.
 * Used for: useUnifiedInputSurface, MainTab styles, and intentPackSearch min query length.
 * Solves: Single source of truth so measure overlay, TextField, and CSS stay aligned on Deck.
 * Does not: Apply styles — components consume these values in CSS vars and inline layout.
 */
/** Max height (px) of the whole glass card (text body + bottom icon strip). */
const UNIFIED_INPUT_HEIGHT_MAX_PX = 200;
/**
 * Room (px) between the corner icons (paperclip, mode chip, mic) and the question box's inner
 * edge, on the left, the right and underneath: the white focus ring reaches this far past a button
 * (outline 2 + offset 2, soft glow 5; gamepadAndPullModels.ts), and the box clips anything outside
 * itself. Plan 72 (plan72-P-MIC-RING-handheld.json): the mic sat 0 px from the right edge and every
 * icon 0 px from the bottom, so the ring showed only its top and left sides. Not scaled: the ring
 * it makes room for is not scaled either.
 */
export const UNIFIED_INPUT_CORNER_RING_ROOM_PX = 5;
/**
 * Reserved height (px) for attach + mic strip inside the glass host (below the text body). Was 24;
 * plan 72 added the ring room underneath the icons, so the box grew by that much and the typed
 * text stays exactly as far above the icons as before.
 */
export const UNIFIED_INPUT_ICON_STRIP_PX = 24 + UNIFIED_INPUT_CORNER_RING_ROOM_PX;
/**
 * The one gap between the dock's stacked rows: the suggestion chips to the question box (plan 72, the
 * maintainer's polish list: the chip sat 8px above the box while the box sat 2px above Ask). The second
 * gap, the box to the big Ask bar, went with that bar in plan 84: the box is the dock's last row now.
 * Scaled with the UI size where it is used.
 */
export const DOCK_ROW_GAP_PX = 2;
/** Room kept under a suggestion chip, inside the row that clips it, for its soft drop shadow (0 2px 3px). */
export const PRESET_CHIP_SHADOW_ROOM_PX = 5;
/** Minimum text-body height (px) when empty — one line taller than the prior floor (~+1 overlay line at 13px / line-height 1.2). */
export const UNIFIED_TEXT_BODY_MIN_PX = 42;
/** Unified search typography — must match `TextField` and the measure/overlay nodes or the caret misaligns from the painted text. */
export const UNIFIED_TEXT_FONT_PX = 12;
export const UNIFIED_TEXT_LINE_HEIGHT = 1.2;
/**
 * The drawn blinking cursor: a bar this wide, this far clear of the letter beside it. A hairline,
 * so it does not follow the UI scale (design-tokens.md). The maintainer's ask, 2026-09-24: the
 * cursor sits right against the "D" of the empty box's hint, about half a pixel clear of it.
 */
export const UNIFIED_CARET_WIDTH_PX = 1.5;
export const UNIFIED_CARET_GAP_PX = 0.5;
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
/** Duration (ms) for the small Ask button's idle → ready → resting changes (colour, fill, opacity). */
export const ASK_READY_STATE_TRANSITION_MS = 150;
/*
 * ASK_BAR_LAYOUT_SHIFT_RIGHT_PX and ASK_BAR_ROW_WIDTH_EXTRA_PX were removed 2026-08-15, and
 * ASK_BAR_PRIMARY_MIN_HEIGHT_PX (the big Ask row's 36px height) on 2026-10-08, when plan 84 folded
 * that row into the question box's strip as a small Ask button (AskStripSendButtons.tsx).
 */
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
/**
 * The colour the lit tab name is checked against for contrast (characterUiAccent.ts lifts each
 * character's colour until it reads at 6:1 on it). It was the solid bar of the drop-down tab strip
 * (plan 59 board 2a). The strip is gone since plan 84 step 4 and the bar sits on the panel's own
 * dark background; whether that background is darker than this has not been measured on the Deck,
 * so this stays the reference until it is.
 */
export const TAB_BAR_STRIP_BG_HEX = "#141c24";
/**
 * The tab bar's height: 20 in every state (plan 30; docs/archive/30-collapsing-tab-bar.md § 4.8).
 * CSS px before `--bonsai-ui-scale`; every use goes through `uiScalePx()`. Steam's own strip cost
 * 80.66px (measured 2026-09-02). Plan 84 step 6 moves the bar into the strip at the very top and
 * keeps this height.
 */
export const TAB_BAR_HEIGHT_PX = 20;
export const TAB_BAR_DASH_W_PX = 14;
export const TAB_BAR_DASH_H_PX = 3;
/** The active dash is this much taller than the others. */
export const TAB_BAR_DASH_ACTIVE_EXTRA_H_PX = 2;
export const TAB_BAR_DASH_GAP_PX = 4;
/** The active tab's name beside the dashes — the size the chat-slot bumper pills already use. */
export const TAB_BAR_NAME_PX = 11;
/** The LB / RB marks at the ends of the bar. */
export const TAB_BAR_SHOULDER_MARK_PX = 9;
/**
 * The fade on Show details' swap with the chip in the chip's slot (detailsSlot.ts). Born as plan 59's
 * tab-switch fade on the drop-down strip, which is gone; the tab bar itself fades nothing now.
 */
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
