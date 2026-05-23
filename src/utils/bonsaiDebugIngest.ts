/** Debug session 29d6af — picker/tab stability instrumentation (remove after verify). */

const INGEST =
  "http://127.0.0.1:7682/ingest/455d5c32-fa64-45d1-b31c-f17b50f3371a";
const SESSION = "29d6af";
const MAX_RING = 12;

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
  // #region agent log
  fetch(INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION,
    },
    body: JSON.stringify({
      sessionId: SESSION,
      location,
      message,
      hypothesisId,
      data,
      timestamp: entry.ts,
    }),
  }).catch(() => {});
  // #endregion
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
