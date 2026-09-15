/**
 * Title: The icon row under the Ask box, and its dropdown menus
 *
 * Purpose: Styles the small row of icons under the question box (Ask
 * mode, attach, and so on), the two dropdown menus that open from that
 * row (choosing an Ask mode, and choosing what to attach), and the Ask
 * button itself — including the color change it gets once there is
 * something to send.
 *
 *     ┌─ Ask box ──────────────────────────────┐
 *     │  What should I upgrade first?           │
 *     ├──────────────────────────────────────────┤
 *     │  [mode ▾] [📎]                 [ Ask ]  │  <- this file
 *     └────────┬───────────────────────────────┘
 *              ▼
 *         ┌─────────────┐
 *         │ Ask mode menu│  <- this file, opens upward from the row
 *         └─────────────┘
 *
 * Used for: Folded into the plugin's one combined stylesheet by
 * bonsaiScopeStylesheet.ts, alongside the other numbered section files.
 *
 * Does not: Style the typing field above the icon row — see section-5.ts
 * for that.
 */
import {
  ASK_LABEL_COLOR,
  ASK_LABEL_READY_COLOR,
  ASK_READY_STATE_TRANSITION_MS,
  UNIFIED_INPUT_ICON_STRIP_PAD_X_PX,
} from "../../features/unified-input/constants";

/**
 * In: nothing.
 * Out: a block of CSS text.
 * Can go wrong: nothing — this always returns the same fixed string, but
 * the comments inside it explain two Deck-only quirks worth knowing before
 * touching it: the CSS engine here predates support for the `:has()`
 * selector, so a menu's open/closed state is toggled by a plain class
 * instead; and stacking order (`z-index`) has to be set by hand in a
 * couple of spots so an open dropdown paints above the Ask row rather than
 * being hidden behind it.
 */
export function buildSection8Section(): string {
  return `
/* ==========================================================================
           8. ASKBAR INTERACTIONS & ICONS
           Handles focus states, layout of bottom action icons, and opacity.
           ========================================================================== */
        .bonsai-scope .bonsai-unified-input-host { border-radius: 8px; overflow: hidden; }
        /*
         * While the ask-mode dropdown is open: overflow visible for the menu, and raise stacking.
         * The ASK row is a later PanelSectionRow, so it paints on top of this host by default;
         * the menu extends over the ASK bar and looked like a vertical fade (ASK ::before gradient on top of rows).
         */
        .bonsai-scope .bonsai-unified-input-host.bonsai-ask-mode-menu-open,
        .bonsai-scope .bonsai-unified-input-host.bonsai-attach-menu-open {
          /*
            !important required: with an AI character active the host also carries
            .bonsai-unified-input--ai-character which sets overflow: hidden !important (sec. earlier),
            and that beat this rule — the open menu was clipped to the host box (probe log:
            hostOverflow "hidden" while open; only the EXPERT row inside the host painted).
            This rule is later in source, so equal-specificity !important resolves to visible.
          */
          overflow: visible !important;
          position: relative;
          z-index: 50;
        }
        /* Dropdown opens upward from the bottom icon strip — keep field layer + icon row from clipping it. */
        .bonsai-scope .bonsai-unified-input-host.bonsai-ask-mode-menu-open .bonsai-unified-input-bottom-actions,
        .bonsai-scope .bonsai-unified-input-host.bonsai-ask-mode-menu-open .bonsai-unified-input-actions-right,
        .bonsai-scope .bonsai-unified-input-host.bonsai-attach-menu-open .bonsai-unified-input-bottom-actions,
        .bonsai-scope .bonsai-unified-input-host.bonsai-attach-menu-open .bonsai-unified-input-actions-right {
          overflow: visible !important;
        }
        /*
          Tab scroll clips absolutely positioned menus that extend outside the input host.
          NOTE: Deck CEF predates :has() support — these used to be :has(...) selectors and
          silently never applied on-device; the class is toggled from MainTab instead.
        */
        .bonsai-scope.bonsai-ask-menu-open-scope [class*="TabContentsScroll"] {
          overflow: visible !important;
        }
        .bonsai-scope.bonsai-ask-menu-open-scope [class*="TabContentsScroll"] > div {
          overflow: visible !important;
        }
        /* Ask row sits below the input host — keep it under the open menu stack. */
        .bonsai-scope.bonsai-ask-menu-open-scope .bonsai-askbar-row-host {
          z-index: 0 !important;
          position: relative !important;
        }
        /* Anything after the input host in the tab flow must paint under the open menu. */
        .bonsai-scope.bonsai-ask-menu-open-scope .bonsai-unified-input-host.bonsai-ask-mode-menu-open,
        .bonsai-scope.bonsai-ask-menu-open-scope .bonsai-unified-input-host.bonsai-attach-menu-open {
          z-index: 60 !important;
        }

        .bonsai-scope .bonsai-attach-menu-floater {
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-attach-menu-surface,
        .bonsai-scope .bonsai-attach-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-attach-menu-surface .Panel.Focusable {
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-attach-menu-surface .bonsai-attach-menu-item {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }
        .bonsai-scope .bonsai-attach-menu-surface .bonsai-attach-menu-item,
        .bonsai-scope .bonsai-attach-menu-surface .bonsai-attach-menu-item.Panel.Focusable {
          border-top: none !important;
          border-bottom: none !important;
        }
        .bonsai-scope .bonsai-attach-menu-surface .bonsai-attach-menu-item:focus,
        .bonsai-scope .bonsai-attach-menu-surface .bonsai-attach-menu-item:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.38) !important;
          outline-offset: -2px !important;
        }

        /* Ask mode menu: solid stack (Decky sometimes composites menus semi-transparent over glass). */
        .bonsai-scope .bonsai-ask-mode-menu-floater {
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface,
        .bonsai-scope .bonsai-ask-mode-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .Panel.Focusable {
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item--selected {
          background-color: rgb(40, 50, 62) !important;
        }
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item,
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item.Panel.Focusable {
          border-top: none !important;
          border-bottom: none !important;
        }
        /* Keep gamepad/pointer focus ring inside the row so it does not extend past the panel edge. */
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item:focus,
        .bonsai-scope .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.38) !important;
          outline-offset: -2px !important;
        }

        /*
         * Reset nested Panel.Focusable under the unified input host. Keep selector specificity LOW: adding :not()
         * on menu classes raised specificity above .bonsai-unified-input-bottom-actions / .bonsai-unified-input-actions-right,
         * so flex-direction:column here won the cascade and stacked the paperclip above the mode chip + mic row.
         */
        .bonsai-scope .bonsai-unified-input-host .Panel.Focusable:not(.bonsai-ask-mode-menu-list):not(.bonsai-attach-menu-list) {
          padding: 0 !important; margin: 0 !important; min-width: 0 !important;
          display: flex !important; flex-direction: column !important;
          align-items: stretch !important; justify-content: flex-start !important;
        }
        /* Stronger chain beats the rule above so ask-mode menu rows keep horizontal padding (vars from MainTabAskModeMenuPopover surface). */
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface > .bonsai-ask-mode-menu-list.Panel.Focusable {
          padding-top: var(--bonsai-ask-mode-menu-list-pad-y, 0px) !important;
          padding-bottom: var(--bonsai-ask-mode-menu-list-pad-y, 0px) !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface .bonsai-ask-mode-menu-item.Panel.Focusable {
          padding: var(--bonsai-ask-mode-menu-pad-y, 10px) var(--bonsai-ask-mode-menu-pad-x, 13px) !important;
          flex-direction: row !important;
          align-items: center !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-surface > .bonsai-ask-mode-menu-list.Panel.Focusable {
          flex-direction: column !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-ask-mode-menu-floater .bonsai-ask-mode-menu-list .DialogButton.bonsai-ask-mode-menu-item-btn {
          flex: 0 0 auto !important;
          align-self: stretch !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .bonsai-attach-menu-surface > .bonsai-attach-menu-list.Panel.Focusable {
          padding-top: var(--bonsai-attach-menu-list-pad-y, 0px) !important;
          padding-bottom: var(--bonsai-attach-menu-list-pad-y, 0px) !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          flex-direction: column !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .bonsai-attach-menu-surface .bonsai-attach-menu-item.Panel.Focusable {
          padding: var(--bonsai-attach-menu-pad-y, 10px) var(--bonsai-attach-menu-pad-x, 13px) !important;
          flex-direction: row !important;
          align-items: center !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-attach-menu-floater .bonsai-attach-menu-list .DialogButton.bonsai-attach-menu-item-btn {
          flex: 0 0 auto !important;
          align-self: stretch !important;
        }

        /* Bottom icon strip: hug left/right corners (independent of ai-character text indent). */
        .bonsai-scope .bonsai-unified-input-bottom-actions {
          padding-left: ${UNIFIED_INPUT_ICON_STRIP_PAD_X_PX}px !important;
          padding-right: ${UNIFIED_INPUT_ICON_STRIP_PAD_X_PX}px !important;
          box-sizing: border-box !important;
        }

        /* Only the outer actions row is full-width; nested Focusable (mode + mic) stays end-aligned.
         * Must include .bonsai-unified-input-host — the section-8 column reset on
         * .bonsai-unified-input-host .Panel.Focusable:not(.bonsai-ask-mode-menu-list):not(.bonsai-attach-menu-list) has higher
         * specificity than .bonsai-unified-input-bottom-actions alone and was stacking paperclip /
         * mode / mic vertically (see DeckCapture_20260611_201557). */
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions > .Panel.Focusable,
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions > .Panel.Focusable.bonsai-unified-input-actions-row {
          width: 100% !important; min-height: 100% !important;
          flex-direction: row !important; justify-content: flex-start !important;
          align-items: flex-end !important; flex-wrap: nowrap !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-unified-input-actions-left.Panel.Focusable {
          width: auto !important;
          min-width: 0 !important;
          flex: 0 0 auto !important;
          flex-direction: row !important;
          align-items: flex-end !important;
          justify-content: flex-start !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-unified-input-actions-right.Panel.Focusable {
          width: auto !important;
          min-width: 0 !important;
          flex: 0 0 auto !important;
          margin-left: auto !important;
          flex-direction: row !important;
          align-items: flex-end !important;
          justify-content: flex-end !important;
        }

        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target.DialogButton,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target:not(.bonsai-ask-mode-trigger) {
          padding: 0 !important; margin: 0 !important;
          min-width: 20px !important; min-height: 20px !important; border-radius: 0 !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target {
          min-width: unset !important;
          position: relative !important;
        }
        /* Mode chip tint via ::before so it can be nudged independently of Decky inner wrappers. */
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target::before {
          content: "" !important;
          position: absolute !important;
          z-index: 0 !important;
          pointer-events: none !important;
          left: -1px !important;
          top: 1px !important;
          right: 1px !important;
          bottom: -1px !important;
          background-color: var(--bonsai-ask-mode-fill) !important;
          border-radius: 5px !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target,
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target > div,
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target > span {
          background-color: transparent !important;
          background-image: none !important;
          border: none !important;
          box-shadow: none !important;
          overflow: visible !important;
          color: color-mix(in srgb, var(--bonsai-ask-mode-accent) 62%, #8fa8c4) !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target > div,
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target > span {
          position: relative !important;
          z-index: 1 !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target:focus-visible,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target.gpfocus {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target:focus-visible::before,
        .bonsai-scope .bonsai-unified-input-host .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target.gpfocus::before {
          background-color: color-mix(in srgb, var(--bonsai-ask-mode-fill) 55%, rgba(160, 189, 220, 0.2)) !important;
          box-shadow: inset 0 0 0 1px rgba(200, 223, 245, 0.8) !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target:focus-visible > div,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target.gpfocus > div,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target:focus-visible > span,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-ask-mode-trigger.bonsai-askbar-target.gpfocus > span {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          color: color-mix(in srgb, var(--bonsai-ask-mode-accent) 78%, #b8c8d8) !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target > span { padding: 0 !important; margin: 0 !important; }

        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-corner-icon {
          opacity: 0.5 !important;
        }
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-corner-icon:focus-within,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target:focus-visible .bonsai-askbar-corner-icon,
        .bonsai-scope .bonsai-unified-input-bottom-actions .bonsai-askbar-target.gpfocus .bonsai-askbar-corner-icon {
          opacity: 0.92 !important;
        }

        .bonsai-scope .bonsai-unified-input-icon { display: inline-flex; align-items: center; justify-content: center; opacity: 0.15 !important; }
        .bonsai-scope .bonsai-unified-input-icon svg { opacity: 1; }

        .bonsai-scope .bonsai-askbar-corner-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.5 !important;
          transition: opacity ${ASK_READY_STATE_TRANSITION_MS}ms ease !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-askbar-corner-icon svg { opacity: 1; }

        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary.DialogButton,
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary {
          color: ${ASK_LABEL_COLOR} !important;
          transition: color ${ASK_READY_STATE_TRANSITION_MS}ms ease !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary span { color: inherit !important; }

        /*
          Ask bar idle ↔ ready: crossfade a ::before overlay (opacity) so the lift animates smoothly; base glass stays
          from .bonsai-glass-panel (background gradients do not interpolate reliably in all engines).
        */
        .bonsai-scope .bonsai-askbar-merged {
          position: relative;
          transition:
            box-shadow ${ASK_READY_STATE_TRANSITION_MS}ms ease,
            border-color ${ASK_READY_STATE_TRANSITION_MS}ms ease;
        }
        .bonsai-scope .bonsai-askbar-merged::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          z-index: 0;
          opacity: 0;
          transition: opacity ${ASK_READY_STATE_TRANSITION_MS}ms ease;
          background: linear-gradient(180deg, rgba(42, 58, 76, 0.52) 0%, rgba(22, 34, 46, 0.46) 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .bonsai-scope .bonsai-askbar-merged--ready::before {
          opacity: 1;
        }
        .bonsai-scope .bonsai-askbar-merged > * {
          position: relative;
          z-index: 1;
        }

        /* Ask “ready” — border / outer ring (transitions on .bonsai-askbar-merged above) */
        .bonsai-scope .bonsai-askbar-merged.bonsai-askbar-merged--ready.bonsai-glass-panel {
          border-color: rgba(255, 255, 255, 0.11) !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
        }
        .bonsai-scope .bonsai-askbar-merged.bonsai-askbar-merged--ready:focus-within {
          border-color: rgba(255, 255, 255, 0.14) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
        }
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary--ready.DialogButton,
        .bonsai-scope .bonsai-askbar-merged .bonsai-ask-primary--ready { color: ${ASK_LABEL_READY_COLOR} !important; }
        .bonsai-scope .bonsai-askbar-merged--ready .bonsai-askbar-corner-icon { opacity: 0.62 !important; }

        /* Focus and Hover Effects */
        .bonsai-scope .bonsai-askbar-merged:focus-within {
          border-color: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .bonsai-scope .bonsai-askbar-target { transition: background-color 120ms ease, box-shadow 120ms ease; border: none !important; }
        .bonsai-scope .bonsai-askbar-target:focus-visible {
          background: rgba(160, 189, 220, 0.16) !important; box-shadow: inset 0 0 0 1px rgba(200, 223, 245, 0.8);
        }
        .bonsai-scope .bonsai-attachment-preview-target:focus-visible,
        .bonsai-scope .bonsai-attachment-preview-target :focus-visible {
          background: rgba(176, 205, 235, 0.14) !important; box-shadow: inset 0 0 0 1px rgba(206, 229, 249, 0.9);
        }
        .bonsai-scope .bonsai-attachment-remove-target:focus-visible,
        .bonsai-scope .bonsai-attachment-remove-target :focus-visible {
          background: rgba(176, 205, 235, 0.22) !important; box-shadow: inset 0 0 0 1px rgba(206, 229, 249, 0.95); border-radius: 6px;
        }

        .bonsai-scope .bonsai-settings-inline-menu-host.bonsai-settings-accent-menu-open {
          overflow: visible;
          position: relative;
          z-index: 50;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-floater {
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-surface,
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-surface > .Panel.Focusable {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-surface .bonsai-accent-intensity-menu-item {
          background-color: rgb(28, 36, 44) !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }
        .bonsai-scope .bonsai-settings-inline-menu-host .bonsai-accent-intensity-menu-item--selected {
          background-color: rgb(40, 50, 62) !important;
        }

        `;
}
