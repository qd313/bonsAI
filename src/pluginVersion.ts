/**
 * Title: Plugin version number
 *
 * Purpose: Holds the version number the plugin shows to a person using it.
 * The number is not typed here by hand — it is copied out of `plugin.json`
 * by a build step, so what the plugin says about its own version always
 * matches what Decky has installed.
 *
 * Used for: Anywhere the UI needs to print the plugin's own version, such
 * as a settings or about screen.
 *
 * Gotchas: Editing the number in this file by hand does not stick — change
 * `plugin.json` instead, then run `node scripts/sync-version-from-plugin.mjs`
 * (or `npm run build`, which does it for you) to bring this file back in step.
 */
export const PLUGIN_VERSION = "0.5.0" as const;
