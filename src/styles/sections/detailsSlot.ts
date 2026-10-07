/**
 * Title: The chip slot's two faces: the suggestion chip, or the Show details line
 *
 * Purpose: The CSS for DetailsSlot.tsx. The chips and the swapped-in line share one grid cell, so
 * the dock keeps its height whichever shows (a dock that changed height would move the chat while a
 * person reads it). The swap is the tab bar's own 120 ms fade (tabIndicatorBar.ts): the face going
 * away fades out and is then hidden, the face coming in is visible at once and fades in.
 *
 *     [ How can I optimise for battery life? ]     <- the chip, 30 px
 *     [ ──────── Show details ↓ ──────────── ]     <- or the line, in the same 30 px
 *
 * Used for: buildBonsaiScopeStylesheet, after section 4 (the chip row) so these rules sit on top.
 *
 * Solves: section-4.ts is at its size limit; the slot's rules are their own piece.
 *
 * Does not: Style the chips themselves (presetChipLabel.ts, section-4.ts) or the real line in the
 * chat (section-6.ts, whose look the slot's line copies).
 */
import { PRESET_CHIP_HEIGHT_PX } from "../../features/preset-carousel/presetRowLayout";
import { TAB_BAR_SWITCH_FADE_MS } from "../../features/unified-input/constants";
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing; it always returns the same fixed string.
 */
export function buildDetailsSlotSection(): string {
  const fade = TAB_BAR_SWITCH_FADE_MS;
  return `
        .bonsai-scope .bonsai-details-slot {
          display: grid;
          min-width: 0;
          width: 100%;
        }
        .bonsai-scope .bonsai-details-slot > * {
          grid-area: 1 / 1;
          min-width: 0;
        }
        /* The face that is showing: visible at once, fading in. */
        .bonsai-scope .bonsai-details-slot__chips,
        .bonsai-scope .bonsai-details-slot__line--shown {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transition: opacity ${fade}ms ease-out;
        }
        /* The face going away: fades out, then hidden from a person. Not from Steam, which reads no CSS:
           every Down into the slot is claimed in code (DetailsSlot.tsx). */
        .bonsai-scope .bonsai-details-slot__chips--away,
        .bonsai-scope .bonsai-details-slot__line:not(.bonsai-details-slot__line--shown) {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity ${fade}ms ease-out, visibility 0s linear ${fade}ms;
        }
        /* The answer's own line while the slot holds its copy: faded over the same 120 ms, but it keeps its
           space so nothing jumps, and it stays a stop (Steam reads no CSS; the ring is only ever put on it
           once the slot has given way, DetailsSlot.tsx). */
        .bonsai-scope .bonsai-chat-details-divider {
          transition: opacity ${fade}ms ease-out;
        }
        .bonsai-scope .bonsai-chat-details-divider[data-slot-holds-line] {
          opacity: 0 !important;
        }
        /* The real line's look (section-6.ts), centred in the chip's own height. */
        .bonsai-scope .bonsai-details-slot__line {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: ${uiScalePx(8)} !important;
          height: ${PRESET_CHIP_HEIGHT_PX}px;
          box-sizing: border-box !important;
          padding: 0 ${uiScalePx(8)};
          border-radius: 4px;
          cursor: pointer;
          outline: none;
        }
        .bonsai-scope .bonsai-details-slot__rule {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.09);
        }
        .bonsai-scope .bonsai-details-slot__label {
          font-size: ${uiScalePx(10)};
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #9fb7d5;
          white-space: nowrap;
          padding: 0 ${uiScalePx(2)};
        }
        /* The ring sits inside the line: the chip row clips anything outside its box, which is why
           the chips show a bar instead (design-tokens.md, Focus rings). */
        .bonsai-scope .bonsai-details-slot__line.gpfocus,
        .bonsai-scope .bonsai-details-slot__line:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.85) !important;
          outline-offset: -2px !important;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
        }
        .bonsai-scope .bonsai-details-slot__line.gpfocus .bonsai-details-slot__label,
        .bonsai-scope .bonsai-details-slot__line:focus-within .bonsai-details-slot__label {
          color: #e8eef5;
        }
        .bonsai-scope .bonsai-details-slot__line.gpfocus .bonsai-details-slot__rule,
        .bonsai-scope .bonsai-details-slot__line:focus-within .bonsai-details-slot__rule {
          background: rgba(255, 255, 255, 0.28);
        }
        /* Reduced motion: the swap is instant, a change of state rather than a fade. */
        @media (prefers-reduced-motion: reduce) {
          .bonsai-scope .bonsai-details-slot__chips,
          .bonsai-scope .bonsai-details-slot__chips--away,
          .bonsai-scope .bonsai-details-slot__line--shown,
          .bonsai-scope .bonsai-details-slot__line:not(.bonsai-details-slot__line--shown),
          .bonsai-scope .bonsai-chat-details-divider {
            transition: none;
          }
        }
`;
}
