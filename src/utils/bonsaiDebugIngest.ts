/**
 * In-memory debug ring buffer feeding the opt-in on-screen HUD
 * (Developer → On-screen debug HUD, rendered by BonsaiDebugOverlay).
 */

const MAX_RING = 24;

export type BonsaiDebugEntry = {
  ts: number;
  location: string;
  message: string;
  hypothesisId?: string;
  data?: Record<string, unknown>;
};

type DebugWindow = Window & {
  __bonsaiDebugRing?: BonsaiDebugEntry[];
  __bonsaiContentMountCount?: number;
};

function ring(): BonsaiDebugEntry[] {
  const w = window as DebugWindow;
  if (!w.__bonsaiDebugRing) w.__bonsaiDebugRing = [];
  return w.__bonsaiDebugRing;
}

export function bonsaiDebugLog(
  location: string,
  message: string,
  hypothesisId?: string,
  data?: Record<string, unknown>
): void {
  const entry: BonsaiDebugEntry = {
    ts: Date.now(),
    location,
    message,
    hypothesisId,
    data,
  };
  const r = ring();
  r.push(entry);
  if (r.length > MAX_RING) r.splice(0, r.length - MAX_RING);
  try {
    console.error("[bonsai-debug]", message, hypothesisId ?? "", data ?? "");
  } catch {
    /* ignore */
  }
}

export function readBonsaiDebugRing(): BonsaiDebugEntry[] {
  return [...ring()];
}

export function bumpContentMountCount(): number {
  const w = window as DebugWindow;
  w.__bonsaiContentMountCount = (w.__bonsaiContentMountCount ?? 0) + 1;
  return w.__bonsaiContentMountCount;
}

export function readContentMountCount(): number {
  return (window as DebugWindow).__bonsaiContentMountCount ?? 0;
}
