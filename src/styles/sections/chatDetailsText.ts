/**
 * Title: The Show details text, scaled with the Text size setting
 * Purpose: The words inside an opened Show details panel -- the open chip's title, its bullet points and
 *          its small print, and the rows of the Session tab -- follow `--bonsai-chat-text-scale`. Those
 *          sizes are written inline by ContextChipLadder.tsx and SessionContextStrip.tsx (11, 10 and 9 px),
 *          and an inline size loses to an `!important` rule, so the scale is applied from here.
 * Used for: Folded into section-6.ts's buildSection6Section(), right after the answer bubble.
 * Does not: Scale the chip row itself, the chip counter above it, the Show details line, or anything
 *           else on the panel's frame: only its words. The raw JSON dumps keep their size too.
 */
import { chatTextPx } from "./chatTextPx";

export function buildChatDetailsTextSection(): string {
  return `        .bonsai-scope .bonsai-chip-body {
          font-size: ${chatTextPx(11)} !important;
        }
        /* The panel's small print is written inline at 10 and 9 px; it keeps its place under the title. */
        .bonsai-scope .bonsai-chip-body span[style*="font-size: 10px"],
        .bonsai-scope .bonsai-chip-body div[style*="font-size: 10px"] {
          font-size: ${chatTextPx(10)} !important;
        }
        .bonsai-scope .bonsai-chip-body span[style*="font-size: 9px"] {
          font-size: ${chatTextPx(9)} !important;
        }
        .bonsai-scope .bonsai-details-session-row {
          font-size: ${chatTextPx(11)} !important;
        }
`;
}
