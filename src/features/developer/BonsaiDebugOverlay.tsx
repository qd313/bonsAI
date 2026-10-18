/**
 * Title: Debug overlay HUD
 * Purpose: On-screen ring buffer of recent bonsAI debug ingest lines and mount counters.
 * Used for: Developer → on-screen debug HUD opt-in during Deck focus and layout investigation.
 * Solves: Lightweight live trace without leaving the game or attaching remote devtools.
 * Does not: Capture screenshots or tail backend logs — see bonsaiDebugIngest and Developer tab.
 */
import { useEffect, useState } from "react";
import { readBonsaiDebugRing, readContentMountCount, type BonsaiDebugEntry } from "./bonsaiDebugIngest";

type BonsaiDebugOverlayProps = {
  enabled: boolean;
};

/** On-Deck debug HUD. Opt-in via Developer → On-screen debug HUD. */
export function BonsaiDebugOverlay({ enabled }: BonsaiDebugOverlayProps) {
  const [lines, setLines] = useState<BonsaiDebugEntry[]>([]);

  useEffect(() => {
    if (!enabled) {
      setLines([]);
      return;
    }
    const id = window.setInterval(() => {
      setLines(readBonsaiDebugRing().slice(-10));
    }, 300);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="bonsai-debug-overlay">
      <div className="bonsai-debug-overlay__header">
        focus trace · mounts={readContentMountCount()}
      </div>
      {lines.length === 0 ? (
        <div className="bonsai-debug-overlay__line bonsai-debug-overlay__line--idle">
          D-pad around — entries appear here + plugin log
        </div>
      ) : (
        lines.map((e, i) => (
          <div key={`${e.ts}-${i}`} className="bonsai-debug-overlay__line">
            [{e.hypothesisId ?? "?"}] {e.message}
            {e.data ? ` ${JSON.stringify(e.data)}` : ""}
          </div>
        ))
      )}
    </div>
  );
}
