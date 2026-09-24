/**
 * Title: The saved-chats row -- shape, title, and neighbours
 *
 * Purpose: Styles the row of saved chats above the conversation: hiding
 * Steam's own shoulder-button hints while the row has focus (they would
 * otherwise claim the bumpers cycle tabs, when this row has taken them
 * over to cycle slots instead), the row's bumper pills, the centred
 * block that holds a slot's game line, its name, and its delete button,
 * and the faint "ghost" previews of the chats on either side.
 *
 * Used for: Folded into section-6.ts's buildSection6Section(), directly
 * after the empty-conversation placeholder.
 *
 * Does not: Style the small dots marking every chat's position --
 * savedChatSlotDots.ts, called from section-6.ts right after this file.
 */
import { uiScalePx } from "./uiScalePx";

/**
 * In: nothing -- every value here is a fixed string or read from a CSS
 * variable that some other part of the plugin sets.
 * Out: a block of CSS text.
 * Can go wrong: this function itself cannot fail, but several rules here
 * exist to win a specificity fight or to reproduce a pixel measurement
 * taken on the Deck -- each says so in its own comment.
 */
export function buildSavedChatSlotsRowSection(): string {
  return `        /*
          While the slot row has focus the bumpers cycle SLOTS, not tabs — so Steam's own L1/R1
          hints in the tab strip are telling the user something untrue, and the row's own LB/RB
          pills put a second pair of shoulder glyphs on screen at the same time.

          Matched by container rather than by wording. The wrapper classes are hashed
          (design-language Rule 5) AND the aria-label is not stable either: the same two images
          read L1 Button / R1 Button in one measurement and Left Shoulder / Right Shoulder in the
          next, because Steam re-labels them for the active controller. What IS stable, in every
          measurement on 2026-08-30, is that the tab strip's shoulder hints are the only
          aria-labelled images anywhere inside .bonsai-decky-tabs-root. :has() is verified
          supported on this CEF (Rule 5), and visibility rather than display keeps the strip's
          layout from shifting when they go.
        */
        .bonsai-scope .bonsai-decky-tabs-root:has(.bonsai-chat-slot-row--focused) img[aria-label] {
          visibility: hidden;
        }
        /* The same idea for the collapsing tab bar's own LB/RB marks (plan 30 § 4.1): the bar sits
           above the tabs root, so the container that sees both is the scope. visibility keeps the
           bar's layout exactly where it was when the marks go. */
        .bonsai-scope:has(.bonsai-chat-slot-row--focused) .bonsai-tab-bar__shoulder {
          visibility: hidden;
        }

        /* Named chat slots row (Main tab, under tab strip) */
        .bonsai-scope .bonsai-chat-slot-row {
          width: 100%;
          box-sizing: border-box;
        }
        .bonsai-scope .bonsai-chat-slot-row-focus {
          width: 100%;
        }
        .bonsai-scope .bonsai-chat-slot-row-inner {
          display: flex;
          align-items: center;
          gap: ${uiScalePx(8)};
          /* Trimmed from 8 to 5 to pay for the game line above the title - see -slot-game. */
          padding: ${uiScalePx(5)} ${uiScalePx(8)};
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-row-inner {
          /* Trimmed from 12 to 7 for the same reason as the resting padding above. */
          padding: ${uiScalePx(7)} ${uiScalePx(8)};
          background: linear-gradient(180deg, rgba(28, 36, 44, 0.92), rgba(18, 26, 34, 0.55));
          border-top-color: rgba(156, 231, 255, 0.22);
          border-bottom-color: rgba(156, 231, 255, 0.22);
        }
        .bonsai-scope .bonsai-chat-slot-bumper-pill {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: ${uiScalePx(34)};
          height: ${uiScalePx(26)};
          border-radius: ${uiScalePx(8)};
          border: 1px solid rgba(168, 182, 198, 0.3);
          color: rgba(168, 182, 198, 0.62);
          font-size: ${uiScalePx(11)};
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-bumper-pill {
          border-color: rgba(156, 231, 255, 0.75);
          color: #9ce7ff;
          background: rgba(18, 26, 34, 0.55);
          box-shadow: 0 0 12px 1px rgba(156, 231, 255, 0.25);
        }
        /* Carousel boundary: the pill for a direction that cannot move dims out. */
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-bumper-pill--dead {
          border-color: rgba(168, 182, 198, 0.28);
          color: rgba(168, 182, 198, 0.4);
          background: transparent;
          box-shadow: none;
        }
        .bonsai-scope .bonsai-chat-slot-center {
          flex: 1 1 auto;
          min-width: 0;
          text-align: center;
        }
        /*
          The game a chat belongs to, in the band above the title the maintainer pointed at on
          2026-08-30. Quiet on purpose: it is context, not the name of the thing. Always occupies
          its line even when empty - slots saved before the name was kept have nothing to show, and
          a line that comes and goes is the same row-height complaint in another form.

          The row's vertical padding pays for it rather than the row growing: it was 12px top and
          bottom while focused, and that padding IS the whitespace the band was drawn on.

          2026-09-20: the component itself now leaves this text blank except while the row is
          focused (the same --focused signal this rule keys off), so the line is empty at rest for
          every slot, not just ones with no stored game. The colours below still apply to whatever
          text is there - the base rule is the quiet resting colour, kept in case the component ever
          needs to show something else unfocused, and the focused rule is what a person actually sees.
        */
        .bonsai-scope .bonsai-chat-slot-game {
          min-height: ${uiScalePx(11)};
          font-size: ${uiScalePx(9)};
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          line-height: 1.2;
          color: rgba(200, 214, 230, 0.32);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-game {
          color: rgba(156, 231, 255, 0.45);
        }
        .bonsai-scope .bonsai-chat-slot-title-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: ${uiScalePx(6)};
          min-width: 0;
          /*
            Reserved to the delete box's height. Without it the row was two different heights: on a
            slot the 22px x sets the line, at [+] there is no x so the line collapses to the title's
            own 14px and the whole bar shrank by about nine pixels as you cycled onto the create
            position. Measured on device 2026-08-30 - title row 23.56 with the x, 14.39 without.
          */
          min-height: ${uiScalePx(22)};
          /*
            Anchor for the delete box below (2026-09-20). The x used to be centred IN this same flex
            row alongside the title, which dragged the title about 14px left of the game name above
            it and the dots below it - both centred on the whole row, not on this smaller group. The
            fix takes the x out of the group entirely; position:relative here is what lets it pin to
            this row's own right edge instead of the row-inner's.
          */
          position: relative;
        }
        /*
          Sized for READING THE NAME, not for hierarchy. The 300px column leaves the focused row
          about 188px of centre once the two 34px bumper pills and their gaps are paid for, and the
          delete box takes 22 of that. At the reviewed 14px with a 55% cap the title window measured
          104px on device — roughly three words — which the maintainer rejected on 2026-08-30.
          12px plus a 72% cap roughly doubles the characters that fit. Deliberate deviation from
          decision D-B (700 14px focused / 13px quiet); focus emphasis now rests on colour and the
          glow, which the focused rule still carries.
        */
        .bonsai-scope .bonsai-chat-slot-title {
          font-weight: 700;
          font-size: ${uiScalePx(12)};
          line-height: 1.2;
          color: rgba(200, 214, 230, 0.72);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          /*
            2026-09-20: 28px (the delete box's 22px plus its old 6px gap) comes off the cap below so
            a long name still ends in an ellipsis before reaching the now-absolutely-positioned x
            instead of running underneath it. Costs roughly three characters of name - accepted so
            the name, the game line above it and the dots below all share the row's true centre.
          */
          max-width: calc(88% - ${uiScalePx(28)});
        }
        /*
          Ghost neighbours stand down while the row is focused, and the title takes their room.
          Measured 2026-08-30: focused, the centre block is ~196px of the 300px column once the
          two pills and their gaps are paid, and the delete box takes 22 more. With both ghosts
          present the title window was 88px whatever the font size — shrinking the type alone
          bought nothing, because the ghosts simply absorbed what the cap gave up. Hidden, the
          window is ~168px, which is what actually turns three words into a readable name.
          They return the moment focus leaves, which is where they do their job: reading the
          neighbours at a glance without cycling. Deliberate narrowing of decision D-D, which
          kept ghosts at 300px but did not anticipate the focused row's pill cost.
        */
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-ghost {
          display: none;
        }
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-title {
          font-size: ${uiScalePx(12)};
          color: #f2f7fc;
          text-shadow: 0 0 16px rgba(156, 231, 255, 0.3);
        }
        /*
          The create position keeps one quiet size whether the row is focused or not.

          Both selectors are needed. The --focused .bonsai-chat-slot-title rule above is three
          classes (0-3-0); a lone .bonsai-chat-slot-title--create is two (0-2-0), so it loses on
          specificity no matter where it sits in the file — source order only breaks ties.
          Measured on device 2026-08-30: the focused create position computed 14px / #f2f7fc,
          the focused title's values, instead of this rule's. The second selector matches the
          focused rule's specificity and wins on order. Same trap the dot rules below guard.
        */
        .bonsai-scope .bonsai-chat-slot-title--create,
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-title--create {
          font-weight: 700;
          font-size: ${uiScalePx(13)};
          color: rgba(200, 214, 230, 0.45);
          text-shadow: none;
        }
        .bonsai-scope .bonsai-chat-slot-title-inner {
          display: inline-block;
          white-space: nowrap;
        }
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-title--overflowing {
          text-overflow: clip;
        }
        .bonsai-scope .bonsai-chat-slot-row--focused .bonsai-chat-slot-title--overflowing .bonsai-chat-slot-title-inner {
          animation: bonsai-slot-title-scrub 6s ease-in-out infinite;
        }
        @keyframes bonsai-slot-title-scrub {
          0% { transform: translateX(0); }
          75% { transform: translateX(calc(-1 * var(--bonsai-slot-title-overflow, 0px))); }
          83% { transform: translateX(calc(-1 * var(--bonsai-slot-title-overflow, 0px))); }
          100% { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bonsai-scope .bonsai-chat-slot-title-inner {
            animation: none !important;
          }
        }
        /*
          Taken out of the centred flex group on purpose (2026-09-20): the x used to sit as an
          ordinary flex child beside the title, and centring that whole group (title + x, or with
          the ghosts too) put the title about 14px left of the game name above it and the dots
          below it, both of which centre on the whole row. Absolute + the title row's own
          position:relative above pins the x to the row's true right-hand end instead, so it can
          no longer pull the centred title, and the title's own max-width already leaves room for
          it. The quiet state still carries the same 22x22 box and 1px transparent border as the
          active stop, so activating the stop colours it in without nudging anything.
        */
        .bonsai-scope .bonsai-chat-slot-delete {
          position: absolute;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${uiScalePx(22)};
          height: ${uiScalePx(22)};
          border-radius: ${uiScalePx(6)};
          border: 1px solid transparent;
          font-size: ${uiScalePx(15)};
          font-weight: 700;
          line-height: 1;
          color: rgba(168, 182, 198, 0.55);
          opacity: 0.85;
        }
        .bonsai-scope .bonsai-chat-slot-delete--active-stop {
          color: #f16a5a;
          border-color: rgba(224, 74, 58, 0.8);
          background: rgba(26, 14, 12, 0.55);
          box-shadow: 0 0 10px 1px rgba(224, 74, 58, 0.25);
          opacity: 1;
        }
        .bonsai-scope .bonsai-chat-slot-ghost {
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
           neighbouring title, and at 15% of the row it has to stay legible at two words. */
        .bonsai-scope .bonsai-chat-slot-ghost--create {
          /* Sizes to its content and does not shrink. Under the 15% cap the other ghosts share it
             measured 28px on device, which ellipsized the old "+ New chat" wording down to
             "+ N..." - noise rather than an indicator. A name ghost may truncate, because a
             partial name still hints at which neighbour it is; this one means nothing unless it
             is readable. It carries the same [+] token the create position shows as its centre
             label, so cycling left onto it is one glyph growing rather than one label swapping
             for another. */
          flex: 0 0 auto;
          max-width: none;
          font-size: ${uiScalePx(11)};
          color: rgba(156, 231, 255, 0.42);
          font-weight: 700;
          letter-spacing: 0.02em;
          /* Clear of the title. The row gap alone (6px) read as a prefix ON the title rather
             than as the neighbour to its left. */
          margin-right: ${uiScalePx(8)};
        }
        /* No directional fade on the create ghost: the prev mask hides everything left of 55%
           of the span, which on a three-character token eats the opening bracket. A name ghost
           wants the fade because it is a fragment; this one is whole. */
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
