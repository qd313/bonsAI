/**
 * Title: Plugin version number
 *
 * Purpose: Holds the version number the plugin shows a person, on the About
 * tab and anywhere else it names itself. Nobody types the number here: this
 * whole file is written from scratch by scripts/sync-version-from-plugin.mjs,
 * reading plugin.json, so what the plugin says about its own version always
 * matches what Decky actually installed.
 *
 * Used for: Anywhere the screen prints the plugin's own version.
 *
 * Gotchas: Editing this file does not stick, and neither does explaining it --
 * the next build replaces the lot, this header included. Change the version in
 * plugin.json instead, then run `npm run build`, which brings this back into
 * step. To change these words, change the generator that writes them.
 */
export const PLUGIN_VERSION = "0.5.0" as const;
