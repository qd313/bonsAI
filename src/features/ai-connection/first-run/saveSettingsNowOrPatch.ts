/**
 * Title: Save the settings right now, or save one change right now
 *
 * Purpose: The first-run gate asks the screen to save in two ways. With no patch: write whatever has
 * changed and is still waiting for its automatic save (opening a popup closes Quick Access and throws
 * that waiting save away). With a patch: write just that change, now, the way the character picker and
 * the AI models screen do (what changed on screen since the last save, plus the popup's own patch).
 *
 * Used for: index.tsx, as the gate's `saveSettingsNow`.
 *
 * Solves: A switch changed inside the first-run popup must be on disk before the popup can close,
 * because closing it rebuilds the screen from the session note and a save still on its timer is lost.
 *
 * Does not: Update the screen from the answer; the popup carries the change through the rebuild in the
 * session note. It hands back a promise that settles when the save has been tried (never rejects), for the one
 * caller that must have the change on disk before its next call (the first-time setup's OK, which starts the
 * setup the back end checks against its own file). A failed save is logged, not shown, and remembered (plan 104, B1): the
 * screen that is rebuilt from the note sends those settings again instead of taking its own copy as already
 * saved, which is how a first-start change used to be lost.
 */
import { callDeckyWithTimeout } from "../../../shared/deckyCall";
import type { BonsaiSettings } from "../../settings/bonsaiSettingsSchema";
import { rememberUnsavedSettings } from "../../settings/usePluginSettings";

/** In: the patch (or none), the screen's save-what-changed call, and its builder of the payload for a patch. */
export function saveSettingsNowOrPatch(
  patch: Partial<BonsaiSettings> | undefined,
  persistChangedSettingsNow: () => Promise<void>,
  buildSettingsPayload: (patch?: Partial<BonsaiSettings>) => Partial<BonsaiSettings>,
): Promise<void> {
  if (!patch) return persistChangedSettingsNow().catch(() => {});
  const payload = buildSettingsPayload(patch);
  return callDeckyWithTimeout<[Partial<BonsaiSettings>], unknown>("save_settings", [payload]).then(
    () => {},
    (err: unknown) => {
      console.error("save_settings failed (first-run popup)", err);
      rememberUnsavedSettings(Object.keys(payload));
    },
  );
}
