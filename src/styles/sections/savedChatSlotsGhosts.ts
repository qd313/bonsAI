/**
 * Title: The saved-chats row -- the ghost neighbours
 *
 * Purpose: Styles the faint "ghost" previews of the chats on either side of the open one, and the
 * pencil ghost that marks the new-chat spot.
 *
 * Used for: Appended to the end of buildSavedChatSlotsRowSection (savedChatSlotsRow.ts), so
 * section-6.ts still folds in one block.
 *
 * Solves: Keeps savedChatSlotsRow.ts under its size limit; the rules moved here unchanged.
 *
 * Does not: Style the name, the buttons or the dots -- those stay in savedChatSlotsRow.ts and
 * savedChatSlotDots.ts.
 */
import { uiScalePx } from "./uiScalePx";

/** In: nothing. Out: a block of CSS text for the ghost neighbours. */
export function buildSavedChatSlotGhostsSection(): string {
  return `        /*
          The neighbours take NO room beside the name (Deck 2026-10-02: the name moved 15px and
          lost 32px of width when they stood down for the ring). Each hangs off a zero-width anchor
          touching the name's edge and draws outward over the spare room, so the name's box is the
          same with the ring on or off, and centred even with a neighbour on one side only.
        */
        .bonsai-scope .bonsai-chat-slot-ghost-anchor {
          position: relative;
          flex: 0 0 0;
          width: 0;
          align-self: center;
        }
        .bonsai-scope .bonsai-chat-slot-ghost-anchor-inner {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: ${uiScalePx(6)};
        }
        .bonsai-scope .bonsai-chat-slot-ghost-anchor--prev .bonsai-chat-slot-ghost-anchor-inner {
          right: ${uiScalePx(6)};
        }
        .bonsai-scope .bonsai-chat-slot-ghost-anchor--next .bonsai-chat-slot-ghost-anchor-inner {
          left: ${uiScalePx(6)};
        }
        .bonsai-scope .bonsai-chat-slot-ghost {
          /* A cap in px: the ghosts hang off a zero-width anchor, so a % of it would be nothing. */
          flex: 0 1 auto;
          max-width: ${uiScalePx(42)};
          min-width: 0;
          font-size: ${uiScalePx(11)};
          color: rgba(200, 214, 230, 0.28);
          filter: blur(0.7px);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          pointer-events: none;
        }
        /* Slightly brighter and unblurred-looking than a name ghost: it is a destination, not a
           neighbouring title. Since plan 72 it is just the pencil the new-chat spot shows, no
           words (the maintainer's option 4). */
        .bonsai-scope .bonsai-chat-slot-ghost--create {
          /* Sizes to its content and does not shrink: a name ghost may truncate, because a partial
             name still hints at which neighbour it is; this one means nothing unless it is whole.
             It carries the same pencil the new-chat spot shows beside its words. */
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          max-width: none;
          font-size: ${uiScalePx(11)};
          color: rgba(156, 231, 255, 0.42);
          font-weight: 700;
          letter-spacing: 0.02em;
          /* Clear of the title. The row gap alone (6px) read as a prefix ON the title rather
             than as the neighbour to its left. */
          margin-right: ${uiScalePx(8)};
        }
        .bonsai-scope .bonsai-chat-slot-ghost--create svg {
          width: ${uiScalePx(12)};
          height: ${uiScalePx(12)};
          display: block;
        }
        /* No directional fade on the create ghost: the prev mask hides everything left of 55%
           of the span, which on a small whole glyph eats half of it. A name ghost wants the fade
           because it is a fragment; this one is whole. */
        .bonsai-scope .bonsai-chat-slot-ghost--prev.bonsai-chat-slot-ghost--create {
          -webkit-mask-image: none;
          mask-image: none;
        }
        .bonsai-scope .bonsai-chat-slot-ghost--prev {
          margin-left: ${uiScalePx(4)};
          text-align: left;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 55%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 55%);
        }
        .bonsai-scope .bonsai-chat-slot-ghost--next {
          margin-right: ${uiScalePx(4)};
          text-align: right;
          -webkit-mask-image: linear-gradient(90deg, #000 45%, transparent 100%);
          mask-image: linear-gradient(90deg, #000 45%, transparent 100%);
        }
`;
}
