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
 * Does not: Wait for the answer, or update the screen from it; the popup carries the change through
 * the rebuild in the session note. A failed save is logged, not shown: the screen's own automatic save
 * sends the change again with the next edit.
 */
import { callDeckyWithTimeout } from "../../../shared/deckyCall";
import type { BonsaiSettings } from "../../settings/bonsaiSettingsSchema";

/** In: the patch (or none), the screen's save-what-changed call, and its builder of the payload for a patch. */
export function saveSettingsNowOrPatch(
  patch: Partial<BonsaiSettings> | undefined,
  persistChangedSettingsNow: () => Promise<void>,
  buildSettingsPayload: (patch?: Partial<BonsaiSettings>) => Partial<BonsaiSettings>,
): void {
  if (!patch) {
    void persistChangedSettingsNow();
    return;
  }
  callDeckyWithTimeout<[Partial<BonsaiSettings>], unknown>("save_settings", [buildSettingsPayload(patch)]).catch(
    (err: unknown) => console.error("save_settings failed (first-run popup)", err),
  );
}
