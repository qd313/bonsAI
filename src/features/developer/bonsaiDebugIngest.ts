/**
 * Title: The on-screen debug overlay's short memory
 *
 * Purpose: There is an optional on-screen overlay, off by default, that a developer or a curious
 * player can turn on under Developer settings to watch what the plugin is doing in real time. This
 * file is that overlay's memory: a short list of the most recent debug notes, kept only in the
 * browser's own memory for as long as the plugin stays open. It never writes anything to disk.
 *
 * Used for: BonsaiDebugOverlay (which draws the list), and the "On-screen debug HUD" setting under
 * Developer that turns it on.
 *
 * Solves: gives quick, disposable debug notes on screen without the cost or clutter of writing a
 * detailed log file for everyone, all the time.
 *
 * Does not: send any of this off the device. There is a separate, developer-only tool — a temporary
 * connection from the Deck back to a developer's own computer, set up by hand for troubleshooting —
 * that streams debug lines off the device that way; this file has nothing to do with it and only
 * ever keeps its short list in the browser's own memory. See the Deck tunnel docs for that other
 * tool.
 *
 * How it works: only the most recent 24 notes are kept; adding a 25th drops the oldest. A second,
 * unrelated counter kept alongside them tracks how many times the plugin's main screen has mounted,
 * which is its own small piece of debug information used to catch an unexpected re-mount.
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
