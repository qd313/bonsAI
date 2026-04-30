import type { Components } from "react-markdown";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Focusable } from "@decky/ui";

export type MainTabBonsaiAiMarkdownChunkProps = {
  source: string;
  /** When false, ```bonsai-spoiler bodies render inline (no collapse). */
  spoilerMaskingEnabled?: boolean;
  /** When masking is on, start expanded if the last reply had spoiler consent and Settings allow it. */
  spoilerDefaultExpanded?: boolean;
};

type MdArgs = {
  spoilerMaskingEnabled: boolean;
  spoilerDefaultExpanded: boolean;
  depth: number;
};

function buildMdComponents(args: MdArgs): Components {
  const { spoilerMaskingEnabled, spoilerDefaultExpanded, depth } = args;

  const base: Components = {
    p: ({ children }) => <p className="bonsai-md-p">{children}</p>,
    ul: ({ children }) => <ul className="bonsai-md-ul">{children}</ul>,
    ol: ({ children }) => <ol className="bonsai-md-ol">{children}</ol>,
    li: ({ children }) => <li className="bonsai-md-li">{children}</li>,
    pre: ({ children }) => <pre className="bonsai-md-fenced-pre">{children}</pre>,
    code: ({ className, children, ...rest }) => {
      const isSpoiler =
        typeof className === "string" && className.split(/\s+/).includes("language-bonsai-spoiler");
      if (isSpoiler && depth === 0 && !spoilerMaskingEnabled) {
        const raw = String(children).replace(/\n$/, "");
        return (
          <ReactMarkdown
            components={buildMdComponents({
              spoilerMaskingEnabled: false,
              spoilerDefaultExpanded: true,
              depth: 1,
            })}
          >
            {raw}
          </ReactMarkdown>
        );
      }
      if (isSpoiler && depth === 0 && spoilerMaskingEnabled) {
        const raw = String(children).replace(/\n$/, "");
        return (
          <BonsaiSpoilerFence
            body={raw}
            defaultExpanded={spoilerDefaultExpanded}
            innerComponents={buildMdComponents({
              spoilerMaskingEnabled,
              spoilerDefaultExpanded,
              depth: depth + 1,
            })}
          />
        );
      }
      if (isSpoiler && (!spoilerMaskingEnabled || depth > 0)) {
        return (
          <pre className="bonsai-md-fenced-pre">
            <code className="bonsai-md-fenced-code language-bonsai-spoiler">{children}</code>
          </pre>
        );
      }
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

  return base;
}

function BonsaiSpoilerFence(props: {
  body: string;
  defaultExpanded: boolean;
  innerComponents: Components;
}) {
  const { body, defaultExpanded, innerComponents } = props;
  const [open, setOpen] = useState(defaultExpanded);

  if (!open) {
    return (
      <Focusable
        className="bonsai-spoiler-reveal-target"
        style={{
          margin: "8px 0",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid rgba(150, 187, 223, 0.45)",
          background: "rgba(24, 40, 58, 0.55)",
          width: "100%",
          boxSizing: "border-box",
        }}
        onActivate={() => setOpen(true)}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(220, 232, 245, 0.92)",
            lineHeight: 1.35,
          }}
        >
          Spoiler — tap to show
        </div>
        <div style={{ fontSize: 11, color: "rgba(190, 205, 220, 0.75)", marginTop: 4 }}>
          Hidden until you reveal (Strategy Guide).
        </div>
      </Focusable>
    );
  }

  return (
    <div
      className="bonsai-spoiler-expanded"
      style={{
        margin: "8px 0",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid rgba(120, 160, 200, 0.35)",
        background: "rgba(20, 36, 52, 0.42)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Focusable
        className="bonsai-spoiler-collapse-target"
        style={{ marginBottom: 8 }}
        onActivate={() => setOpen(false)}
      >
        <span style={{ fontSize: 11, color: "rgba(170, 200, 230, 0.85)", fontWeight: 600 }}>
          Spoiler — tap to hide
        </span>
      </Focusable>
      <ReactMarkdown components={innerComponents}>{body}</ReactMarkdown>
    </div>
  );
}

export function MainTabBonsaiAiMarkdownChunk(props: MainTabBonsaiAiMarkdownChunkProps) {
  const masking = props.spoilerMaskingEnabled !== false;
  const defaultEx = props.spoilerDefaultExpanded === true;
  const components = useMemo(
    () =>
      buildMdComponents({
        spoilerMaskingEnabled: masking,
        spoilerDefaultExpanded: defaultEx,
        depth: 0,
      }),
    [masking, defaultEx]
  );

  return <ReactMarkdown components={components}>{props.source}</ReactMarkdown>;
}
