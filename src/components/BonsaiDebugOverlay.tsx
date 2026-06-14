import { useEffect, useState } from "react";
import { readBonsaiDebugRing, readContentMountCount, type BonsaiDebugEntry } from "../utils/bonsaiDebugIngest";

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
      setLines(readBonsaiDebugRing().slice(-6));
    }, 400);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled || lines.length === 0) return null;

  return (
    <div className="bonsai-debug-overlay">
      <div className="bonsai-debug-overlay__header">debug mounts={readContentMountCount()}</div>
      {lines.map((e, i) => (
        <div key={`${e.ts}-${i}`} className="bonsai-debug-overlay__line">
          [{e.hypothesisId ?? "?"}] {e.message}
          {e.data ? ` ${JSON.stringify(e.data)}` : ""}
        </div>
      ))}
    </div>
  );
}
