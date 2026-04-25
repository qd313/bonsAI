import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";

const mdComponents: Components = {
  p: ({ children }) => <p className="bonsai-md-p">{children}</p>,
  ul: ({ children }) => <ul className="bonsai-md-ul">{children}</ul>,
  ol: ({ children }) => <ol className="bonsai-md-ol">{children}</ol>,
  li: ({ children }) => <li className="bonsai-md-li">{children}</li>,
  pre: ({ children }) => <pre className="bonsai-md-fenced-pre">{children}</pre>,
  code: ({ className, children, ...rest }) => {
    const isBlock = typeof className === "string" && className.includes("language-");
    return (
      <code
        className={isBlock ? `bonsai-md-fenced-code ${className || ""}`.trim() : "bonsai-md-inline-code"}
        {...rest}
      >
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => <blockquote className="bonsai-md-blockquote">{children}</blockquote>,
  a: ({ children, href }) => (
    <a className="bonsai-md-a" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="bonsai-md-strong">{children}</strong>,
  em: ({ children }) => <em className="bonsai-md-em">{children}</em>,
};

export function BonsaiAiMarkdownChunk(props: { source: string }) {
  return <ReactMarkdown components={mdComponents}>{props.source}</ReactMarkdown>;
}
