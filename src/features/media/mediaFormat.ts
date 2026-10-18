/**
 * Title: Turning screenshot and file info into words a person can read
 *
 * Purpose: When the screenshot browser shows a list of captured files, this file turns raw
 * computer data into the words shown next to each one: the file's path becomes a link that can
 * actually be opened as a picture, the moment it was taken becomes something like "8/14/2026,
 * 3:02 PM" instead of a number of seconds since 1970, and the file's size becomes "2.4 MB"
 * instead of a large number of bytes.
 *
 * Used for: every row of the screenshot list, and the details shown when a screenshot is
 * attached to an Ask.
 *
 * Solves: without this, every place that shows a screenshot would work out its own timestamp
 * and size wording by hand, and the numbers would not read the same way from one place to
 * another.
 *
 * Does not: read the file, take the screenshot, or ask the back end for anything. It only turns
 * numbers and paths it is already handed into readable text.
 */
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
