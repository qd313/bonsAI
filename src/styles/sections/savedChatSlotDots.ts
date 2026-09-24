/**
 * Title: The saved-chats row -- the small dots underneath it
 *
 * Purpose: Styles the row of small dots marking every saved chat's
 * position (plus the far-left "+" marker for the create position): the
 * dot shapes themselves, the active/pending/unread states, and the
 * matching "spark" markers drawn beside a ghost neighbour.
 *
 * Used for: Folded into section-6.ts's buildSection6Section(), directly
 * after savedChatSlotsRow.ts, which this file continues.
 *
 * Does not: Style the row's shape, title, or ghost previews --
 * savedChatSlotsRow.ts, called from section-6.ts right before this file.
 */
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing -- every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text.
 * Can go wrong: this function itself cannot fail. round() keeps the dot
 * boxes on whole device pixels at any UI scale -- see the inline comment
 * on the first dot rule for why that matters here specifically.
 */
export function buildSavedChatSlotDotsSection(): string {
  return `        .bonsai-scope .bonsai-chat-slot-dots {
          display: flex;
          /* Centre, not the default stretch. The dots carry an explicit 3px height and the +
             marker is a glyph box roughly twice that, so under stretch they aligned on their
             TOP edges and the + sat off the line the dots make. */
          align-items: center;
          justify-content: center;
          gap: ${uiScalePx(6)};
          gap: round(${uiScalePx(6)}, 1px);
          /*
            Raised from 6px to -4px (roadmap: "The row of small dots under the chat name still
            shows below the open tab strip"). Measured on the Deck 2026-09-18
            (docs/test-evidence/plan61-TAB-STRIP-2A-07.json): the open strip's bottom edge sits at
            130px, but the dots' own bottom edge sat at 136.667-138.667px, 7-9px below it, so the
            66px strip (chosen 2026-09-17 to cover exactly this) did not reach them. Moving the
            dots up 10px instead of growing the strip further keeps the strip's height, which the
            roadmap's Features list asks every change here to spend as little of as possible
            (vertical room for the chat bubbles below).
          */
          margin-top: ${uiScalePx(-4)};
        }
        .bonsai-scope .bonsai-chat-slot-dot {
          /*
            Every marker in the strip is the SAME box, always. State is carried by fill and colour
            only - never by size. Sizing by state (3px quiet, 4px active, 6px ring) made the strip
            read as unevenly spaced even though the gap is constant, because a flex gap sits between
            boxes: a 3px dot beside a 6px one leaves more visible air around the small one.

            No border here, deliberately. A transparent 1.5px border reserved for the pending ring
            gave every dot TWO edge sets for the rasteriser to snap - the border box and the padding
            box - and at this device pixel ratio (1.28 measured 2026-08-30) each dot lands on a
            different sub-pixel phase, so the two snapped independently per dot and some circles came
            out visibly oval. The ring is an inset box-shadow instead, which paints inside one box.

            round() keeps the box and the gap on whole pixels at any UI scale, so the stride stays
            integral rather than drifting a hundredth of a pixel per dot. The unrounded declaration
            above it is the fallback for an engine without round(); Deck CEF has it (verified).
          */
          flex: 0 0 auto;
          box-sizing: border-box;
          width: ${uiScalePx(4)};
          height: ${uiScalePx(4)};
          width: round(${uiScalePx(4)}, 1px);
          height: round(${uiScalePx(4)}, 1px);
          border-radius: 50%;
          background: rgba(143, 168, 196, 0.3);
        }
        .bonsai-scope .bonsai-chat-slot-dot--active {
          background: rgba(200, 214, 230, 0.5);
        }
        /*
          The far-left marker is the create position, drawn as a + rather than a dot so the strip
          says where "new chat" lives instead of only counting existing slots. It is why the strip
          now renders at the create position too — W3 hid it there when the strip described only
          slots, which left that position with no indicator at all.
        */
        .bonsai-scope .bonsai-chat-slot-dot--create {
          /* Same box as every other marker, so the strip's rhythm is uniform; the glyph is centred
             inside it and sized to fit rather than the box being sized to the glyph. */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          width: ${uiScalePx(4)};
          height: ${uiScalePx(4)};
          width: round(${uiScalePx(4)}, 1px);
          height: round(${uiScalePx(4)}, 1px);
          border-radius: 0;
          background: transparent;
          color: rgba(143, 168, 196, 0.5);
          /* The glyph may overrun its 4px box, symmetrically, because the BOX is what the strip's
             spacing is measured from - sizing the box to the glyph is what put the + off the line
             in the first place. */
          font-size: ${uiScalePx(8)};
          font-weight: 700;
          line-height: 1;
        }
        .bonsai-scope .bonsai-chat-slot-dot--create.bonsai-chat-slot-dot--active {
          background: transparent;
          color: #9ce7ff;
        }
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-dot--create.bonsai-chat-slot-dot--active {
          background: transparent;
          color: #9ce7ff;
        }
        .bonsai-scope .bonsai-chat-slot-dot--pending {
          background: transparent;
          box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.9), 0 0 5px rgba(56, 189, 248, 0.55);
        }
        .bonsai-scope .bonsai-chat-slot-dot--unread {
          background: #4ade80;
          box-shadow: 0 0 5px rgba(74, 222, 128, 0.65);
        }
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-dot--active {
          background: #9ce7ff;
        }
        /* Active + generating is the common case right after cycling, and the focused-row
           --active rule above (specificity 0-3-0) would otherwise fill the ring solid cyan
           exactly when the user is looking at it. */
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-dot--pending {
          background: transparent;
        }
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-dot--unread {
          background: #4ade80;
        }
        /* Sits outside the ghost span so the ghost's mask and blur cannot eat it. */
        .bonsai-scope .bonsai-chat-slot-ghost-spark {
          flex: 0 0 auto;
          width: ${uiScalePx(6)};
          height: ${uiScalePx(6)};
          border-radius: 50%;
          align-self: center;
        }
        .bonsai-scope .bonsai-chat-slot-ghost-spark--pending {
          background: transparent;
          border: 1.5px solid rgba(56, 189, 248, 0.9);
          box-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
        }
        .bonsai-scope .bonsai-chat-slot-ghost-spark--unread {
          background: #4ade80;
          box-shadow: 0 0 6px rgba(74, 222, 128, 0.6);
        }
`;
}
