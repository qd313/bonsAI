/**
 * Title: The Show details text, scaled with the Text size setting
 * Purpose: The words inside an opened Show details panel -- the open chip's title and its bullet points,
 *          and the rows of the Session tab -- follow `--bonsai-text-scale`, and the panel's body text
 *          takes the same size when it carries none of its own. The small print (10 and 9 px) is written
 *          inline by ChipExpandedBody.tsx through `textPx` and scales itself; the rules that used to
 *          reach it by its plain inline size (plan 87) went when the inline sizes did (plan 89).
 * Used for: Folded into section-6.ts's buildSection6Section(), right after the answer bubble.
 * Does not: Scale anything by itself that is not a font size. The raw JSON dumps keep their own size.
 */
import { textPx } from "../../../styles/textPx";

export function buildChatDetailsTextSection(): string {
  return `        .bonsai-scope .bonsai-chip-body {
          font-size: ${textPx(11)} !important;
        }
        .bonsai-scope .bonsai-details-session-row {
          font-size: ${textPx(11)} !important;
        }
`;
}
