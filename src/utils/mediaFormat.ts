/** Convert absolute file paths to file:// URIs for image rendering contexts. */
export function toFileUri(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const prefixed = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `file://${encodeURI(prefixed)}`;
}

/** Format screenshot mtimes into concise local timestamps for list rows. */
export function formatScreenshotTimestamp(epochSeconds: number): string {
  if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) return "Unknown time";
  try {
    return new Date(epochSeconds * 1000).toLocaleString();
  } catch {
    return "Unknown time";
  }
}

/** Convert byte counts into human-readable units for screenshot metadata. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}
