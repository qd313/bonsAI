/**
 * Title: The suggestion chip's own look
 *
 * Purpose: The CSS for one suggestion chip: its size and side padding, how its label lays out
 * (pinned badges, then the words), the cut-off ellipsis fallback, the decode caret colour.
 *
 *     [ Test  words of the suggestion ]    <- one chip, 30px tall
 *
 * Used for: Written into the middle of section 4 by buildSection4Section (section-4.ts), at the
 * exact spot the rules used to sit, so the cascade order against the chip row, carousel and focus
 * rules around it is unchanged.
 *
 * Solves: section-4.ts had reached its line limit; the chip rules are the one self-contained piece
 * of it, and the chip work (centred words, the end-of-scroll pause) needed room to grow.
 *
 * Does not: Style the row the chips sit in, the carousel track, the focus bar or the out-of-chips
 * flash. Those stay in section-4.ts.
 */
import { PRESET_CHIP_HEIGHT_PX, PRESET_CHIP_SIDE_PADDING_PX } from "../../features/preset-carousel/presetRowLayout";

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing; it always returns the same fixed string.
 */
export function buildPresetChipLabelCss(): string {
  return `
        /*
          One chip. Height and side padding are set here on purpose, not left to Steam's DialogButton
          default: with two chips across a 300px column (D43, 2026-09-01) the label room is what
          decides whether a prompt reads at a glance, and a width that comes from CSS can be reasoned
          about (design-language rule 4) where Steam's padding could only be measured after the fact.
          The drawing (major-redesign.md § 2.3) says 30px tall, radius 4.
        */
        .bonsai-scope button.bonsai-preset-glass {
          max-width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          min-height: ${PRESET_CHIP_HEIGHT_PX}px !important;
          height: ${PRESET_CHIP_HEIGHT_PX}px !important;
          padding: 0 ${PRESET_CHIP_SIDE_PADDING_PX}px !important;
          border-radius: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          line-height: 1.2 !important;
        }
        .bonsai-scope button.bonsai-preset-glass > div {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
        }
        /*
          The label is a row: badges pinned at the left, then the prompt text. The text either
          scrolls (Steam's Marquee, which brings its own overflow handling and edge fade) or, when
          the Marquee is unavailable or motion is reduced, is cut off with an ellipsis. The ellipsis
          fallback is display:block on purpose — on the old display:inline span \`overflow\` did not
          apply, the ellipsis could never fire, and a 59-character label simply ran 86px past the
          column edge (measured on device 2026-08-29).
        */
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-label {
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-align: left !important;
        }
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-test-badge,
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-tip-badge {
          flex: 0 0 auto !important;
        }
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-text {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-text:not(.bonsai-preset-chip-text--marquee) {
          display: block !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        /*
          A long chip scrolls its words by moving the inner span inside the outer one (the chip's own
          scroller, PresetChipScrollText in presetChipButton.tsx). The outer span is the room the words
          scroll in and clips them; the inner span is as wide as the words, on one line, and is what
          moves. Neither width is set here: both come from the words and the chip (design-language
          rule 4), and the scroller reads them off the live elements.
        */
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-text--marquee {
          display: block !important;
          overflow: hidden !important;
          white-space: nowrap !important;
        }
        .bonsai-scope button.bonsai-preset-glass .bonsai-preset-chip-text-run {
          display: inline-block !important;
          white-space: nowrap !important;
          will-change: transform;
        }
        /*
          Decode mode (Ghost in the Shell chip decode -- replaces the old \`stream\` typewriter).
          The reveal loop in MainTabPresetAnimatedChips.tsx writes scrambled/resolving glyphs and
          the blinking block caret straight into the label's textContent from a single shared
          requestAnimationFrame loop, so there is no CSS keyframe to gate here -- reduced motion is
          enforced entirely in JS (instant swap to the final prompt, no churn, no caret).
          Plan 60, board B (D110, item 6) used to tint the whole label with
          \`--bonsai-ui-accent-toned\` here, but the selector never said "still churning" -- it
          stayed on the label whether resolved or not, so a decode chip's words read in the same
          accent family as its Tip dot (maintainer bug report, 2026-09-19; only the dot should carry
          that colour). Removed: DecodePresetChipButton now sets the label colour inline instead,
          the same \`#c4d3e2\` every other mode already uses (PresetChipButton below).

          The typing caret is the one part that does carry the accent (row PRESET-STREAM-ANIM-01:
          "green, the accent colour"). It failed on the Deck 2026-09-26 at about RGB 214,228,236,
          the letters' own colour, because it was a character inside the letters' string; it has
          its own span now (presetDecodeSlots.tsx). The same toned accent the chips' [beta] tag
          uses, whose default is exactly the answer scramble's own green (#5b9e7e, answerBubble.ts).
        */
        .bonsai-scope .bonsai-preset-chip-caret {
          color: var(--bonsai-ui-accent-toned, #5b9e7e) !important;
        }
`;
}
