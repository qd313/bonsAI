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
  return `        .bonsai-scope .bonsai-chat-slot-ghost {
          /* 0 1 auto + a cap, not 1 1 0: an equal split handed the ghosts every pixel the
             title's max-width left behind, which is the other half of why so little name fit. */
          flex: 0 1 auto;
          max-width: 15%;
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
        /*
          At rest on the newest chat with a long name, the name and the ghosts fill the whole row,
          so the pencil ghost sits at the row's left edge - under the save icon, which would hide
          it. A name ghost is meant to be overlapped there (the icon sits over its faded start, the
          way the x sits over the next one); the pencil is not a fragment, so it steps clear of the
          icon's 22px box and a 6px gap. The drawing never showed the two together; this is the
          smallest change that keeps both visible.
        */
        .bonsai-scope .bonsai-chat-slot-title-row--has-save .bonsai-chat-slot-ghost--create {
          margin-left: ${uiScalePx(28)};
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
