/**
 * Title: Formatting for the text inside an AI answer
 *
 * Purpose: Styles the markdown pieces an answer's text is built from once
 * it has been parsed into "chunks" — paragraphs, lists, quotes, links,
 * inline code and fenced code blocks — plus the chunk boxes that hold
 * that text before it lands inside a chat bubble.
 *
 * Used for: Folded into section-6.ts's buildSection6Section(), alongside
 * the question and answer bubble styling that wraps around this text.
 *
 * Does not: Style the bubble itself, the streaming look, or the copy
 * icon — those live in answerBubble.ts. This file only styles the text
 * inside an answer once it has already landed somewhere.
 */

/**
 * In: nothing — every value here is a fixed string.
 * Out: a block of CSS text.
 * Can go wrong: nothing — this always returns the same fixed string.
 */
export function buildAnswerMarkdownFormattingSection(): string {
  return `        .bonsai-scope .bonsai-ai-response-stack {
          display: flex;
          flex-direction: column;
          background: rgba(18, 26, 34, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #dadde3;
          border-radius: 4px;
          overflow: hidden;
        }

        .bonsai-scope .bonsai-ai-response-stack .bonsai-ai-response-chunk {
          background: transparent !important;
          border: none !important;
          border-radius: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .bonsai-scope .bonsai-ai-response-stack .bonsai-ai-response-chunk:last-child {
          border-bottom: none;
        }

        .bonsai-scope .bonsai-ai-response-chunk {
          background: rgba(18, 26, 34, 0.28) !important;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #dadde3;
          padding: 8px;
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
          font-size: 12px;
          line-height: 1.4;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-p {
          margin: 0 0 0.5em 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-p:last-child {
          margin-bottom: 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-ul,
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-ol {
          margin: 0.35em 0 0.5em 1.1em;
          padding: 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-li {
          margin: 0.2em 0;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-blockquote {
          margin: 0.4em 0;
          padding-left: 0.6em;
          border-left: 2px solid rgba(255, 255, 255, 0.2);
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-a {
          color: #7eb8ff;
          text-decoration: underline;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-inline-code {
          font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
          background: rgba(0, 0, 0, 0.28);
          padding: 0.05em 0.3em;
          border-radius: 3px;
          font-size: 0.95em;
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-fenced-pre {
          margin: 0.5em 0;
          padding: 8px 10px;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-x: auto;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .bonsai-scope .bonsai-ai-response-chunk .bonsai-md-fenced-code {
          font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
          font-size: 11px;
          line-height: 1.35;
          display: block;
        }
`;
}
