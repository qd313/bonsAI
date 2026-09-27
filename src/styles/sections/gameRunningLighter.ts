/**
 * Title: The panel's small animations, held still while a game runs
 *
 * Purpose: While a game runs and a question is in flight, the Main tab marks its column
 * (`bonsai-main-tab-column--game-steady`, see mainTabColumnClassName and
 * lighterWhileGameRuns.ts). Under that mark every small looping animation holds still in its
 * visible state: the question box's breathing glow (steady at full glow, the look reduced motion
 * already gets), the question box's blinking cursor and the answer's blinking end cursor (shown,
 * not blinking), the waiting spinner, and the code-box wait chip's pulse and spinner.
 *
 * Used for: Folded into the plugin's one combined stylesheet by bonsaiScopeStylesheet.ts, last,
 * so each rule here comes after the rule it holds still.
 *
 * Solves: The panel's frame rate while an answer arrives with a game running: 10 to 20 frames a
 * second on the Deck (plan 70), against about 57 with nothing running. Each of these animations
 * is a change on screen the Deck has to redraw for -- a blink twice a second, a spinner on every
 * frame -- while the game and the model already share the chip. Plan 69 measured the two glows
 * alone at about 5 frames a second with nothing running.
 *
 * Does not: Change anything with nothing running, or with a game running and nothing asked.
 */

/** The mark on the Main tab's column, and the start of every selector here. */
const MARK = ".bonsai-scope .bonsai-main-tab-column--game-steady";

/** The held-still rules. Each selector has one more class than the rule it overrides. */
export function buildGameRunningLighterSection(): string {
  return `
/* ==========================================================================
           LIGHTER WHILE A GAME RUNS (plan 70)
           ========================================================================== */
        ${MARK} .bonsai-unified-input-host.bonsai-unified-input--asking.bonsai-glass-panel,
        ${MARK} .bonsai-unified-input-host.bonsai-unified-input--capturing.bonsai-glass-panel {
          animation: none !important;
          border-color: var(--bonsai-ask-breathe-high, var(--bonsai-ask-mode-accent, #4ade80)) !important;
          box-shadow: 0 0 0 1px var(--bonsai-ask-glow-high, rgba(74, 222, 128, 0.2));
        }
        ${MARK} .bonsai-unified-input-fake-caret {
          animation: none !important;
        }
        ${MARK} [data-bonsai-stream-preview="true"] .bonsai-ai-response-chunk::after {
          animation: none !important;
        }
        ${MARK} .bonsai-thinking-spinner {
          animation: none !important;
        }
        ${MARK} .bonsai-stream-fence-wait--code {
          animation: none !important;
        }
        ${MARK} .bonsai-stream-fence-wait-spin {
          animation: none !important;
        }
`;
}
