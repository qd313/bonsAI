/**
 * Title: Voice engine install marker
 *
 * Purpose: Remembers, outside any screen component, that a voice engine install was started from the
 * Voice input section, so the section can keep watching it after Steam's download box closes and
 * rebuilds the Settings tab. Once the install's done message is taken, one "Voice engine ready" toast
 * is allowed, and only once even if two copies of the section both see it.
 *
 * Used for: VoiceInputSettingsSection, which marks the start of an install, starts as "busy" while the
 * marker is fresh, and takes the marker when the install ends.
 *
 * Solves: The section said "not installed" for a minute or more after the install finished, because the
 * busy flag lived in the component, the download box closing threw that copy away, and the new copy never
 * polled (the same shape as the knowledge base download, plan 64, and the chat row's return flag, plan 82).
 *
 * Does not: Talk to the back end or know the install's progress; it holds one time stamp.
 */

/** An install marker older than this is treated as lost (the back end restarted, the install never ended). */
const VOICE_INSTALL_MARKER_MAX_AGE_MS = 10 * 60 * 1000;

/** How long a fresh marker may see the back end still say "idle" before that counts as finished. */
const VOICE_INSTALL_START_GRACE_MS = 8_000;

let startedAt: number | null = null;

/** Record that an install was just started (or just found running). Keeps the older time if already marked. */
export function markVoiceInstallStarted(now: number = Date.now()): void {
  if (!voiceInstallMarkerActive(now)) startedAt = now;
}

/** True while a marker younger than the maximum age exists. */
export function voiceInstallMarkerActive(now: number = Date.now()): boolean {
  return startedAt !== null && now - startedAt < VOICE_INSTALL_MARKER_MAX_AGE_MS;
}

/** True while the marker is so new that an "idle" back end most likely just has not heard of the install yet. */
export function voiceInstallInStartGrace(now: number = Date.now()): boolean {
  return startedAt !== null && now - startedAt < VOICE_INSTALL_START_GRACE_MS;
}

/** Take the marker away; true when there was a live one (the caller then owns the one done toast). */
export function takeVoiceInstallMarker(now: number = Date.now()): boolean {
  const was = voiceInstallMarkerActive(now);
  startedAt = null;
  return was;
}

/** For tests only: forget any marker. */
export function resetVoiceInstallMarkerForTests(): void {
  startedAt = null;
}
