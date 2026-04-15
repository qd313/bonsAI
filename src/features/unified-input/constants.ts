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
/** Tab strip icon sizes (4× prior 30px / 26px). Plugin list icon stays `BonsaiSvgIcon` in `definePlugin`. */
export const TAB_TITLE_ICON_PX_BONSAI = 120;
export const TAB_TITLE_ICON_PX_DEBUG = 104;
export const TAB_TITLE_ICON_PX_SETTINGS = 104;
export const TAB_TITLE_ICON_PX_PERMISSIONS = 104;
