import { useEffect, useState } from "react";
import { readBonsaiDebugRing, readContentMountCount, type BonsaiDebugEntry } from "../utils/bonsaiDebugIngest";

/** On-Deck debug HUD (session 29d6af). Visible whenever plugin Content is mounted. */
export function BonsaiDebugOverlay() {
  const [lines, setLines] = useState<BonsaiDebugEntry[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLines(readBonsaiDebugRing().slice(-6));
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  if (lines.length === 0) return null;

  return (
    <div
      className="bonsai-debug-overlay"
      style={{
        position: "fixed",
        left: 4,
        bottom: 4,
        zIndex: 99999,
        maxWidth: "min(96vw, 420px)",
        pointerEvents: "none",
        fontFamily: "monospace",
        fontSize: 9,
        lineHeight: 1.25,
        color: "#a7f3d0",
        background: "rgba(0,0,0,0.82)",
        border: "1px solid rgba(82,216,138,0.45)",
        borderRadius: 4,
        padding: "4px 6px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      <div style={{ color: "#6ee7b7", marginBottom: 2 }}>
        debug mounts={readContentMountCount()}
      </div>
      {lines.map((e, i) => (
        <div key={`${e.ts}-${i}`}>
          [{e.hypothesisId ?? "?"}] {e.message}
          {e.data ? ` ${JSON.stringify(e.data)}` : ""}
        </div>
      ))}
    </div>
  );
}
