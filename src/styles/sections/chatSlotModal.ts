/**
 * Title: Rename-a-chat popup styling
 *
 * Purpose: Styles the name field a person types into when renaming a saved
 * chat — the label above it and the text box itself — while leaving the
 * popup's outer frame, footer and buttons drawn by Steam's own stock
 * confirm-popup look.
 *
 *     ┌─ Steam's own popup frame ───────────┐
 *     │  RENAME CHAT          <- this file  │
 *     │  ┌────────────────────────────────┐ │
 *     │  │ My saved chat name             │ │  <- this file
 *     │  └────────────────────────────────┘ │
 *     │            [Cancel]  [Save]         │  <- Steam's own buttons
 *     └──────────────────────────────────────┘
 *
 * Used for: Folded into buildModalPortalStylesheet, which every popup
 * opened outside the main plugin screen loads.
 *
 * Does not: Style the popup's frame, footer, or its Cancel/Save buttons —
 * those stay Steam's own look on purpose.
 */

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing — this always returns the same fixed string.
 *
 * Uses plain pixel sizes rather than the usual UI-scale helper: this popup
 * renders inside Steam's own dialog, at Steam's own scale, outside the
 * plugin's normal column — `BonsaiModalScope` is what carries the UI-scale
 * setting into a popup like this one, not this file.
 */
export function buildChatSlotModalStylesheet(): string {
  return `
        .bonsai-scope .bonsai-chat-slot-modal-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: rgba(143, 168, 196, 0.8);
          margin-bottom: 6px;
          text-align: left;
        }
        .bonsai-scope .bonsai-chat-slot-modal-field input {
          height: 36px;
          border-radius: 8px;
          background: rgba(18, 26, 34, 0.55);
          border: 1px solid rgba(156, 231, 255, 0.5);
          box-shadow: 0 0 10px rgba(156, 231, 255, 0.12);
          font-size: 14px;
          font-weight: 600;
          color: #e8eef5;
          caret-color: #9ce7ff;
        }
  `;
}
