/**
 * Title: Settings defaults cross-language contract (TypeScript half)
 * Purpose: Assert normalizeSettings({}) equals the shared fixture both languages check.
 * Used for: Catching a setting added to one language and forgotten in the other.
 * Solves: The TS and Python settings shapes are hand-maintained in parallel with nothing
 *         enforcing agreement; this makes an incomplete two-language edit fail a test.
 * Does not: Reduce the per-setting edit cost — that is docs/archive/refactor-plan-round-one.md section 3.1.
 *
 * The Python half is tests/test_settings_contract.py. Neither test shells out to the other
 * toolchain; both read the same JSON. See tests/contracts/README.md.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { normalizeSettings } from "./bonsaiSettingsNormalizers";

// Read rather than import: keeps the fixture outside src/ (it is shared with the Python
// suite) without needing a tsconfig path mapping or resolveJsonModule.
const CONTRACT_PATH = resolve(__dirname, "../../tests/contracts/settings-defaults.json");
const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf-8")) as Record<string, unknown>;

describe("settings defaults contract", () => {
  it("normalizeSettings({}) matches the shared fixture exactly", () => {
    expect(normalizeSettings({})).toEqual(contract);
  });

  it("emits exactly the fixture's key set", () => {
    expect(Object.keys(normalizeSettings({})).sort()).toEqual(Object.keys(contract).sort());
  });

  it("is idempotent over the defaults", () => {
    // Guards the migration normalizers: presetChipAnimation reads the legacy
    // preset_chip_fade_animation_enabled, and screenshotAttachmentPreset reads the legacy
    // screenshot_max_dimension. A migration that re-fires on already-migrated data would
    // change a saved value on every load.
    const once = normalizeSettings({ ...contract });
    expect(once).toEqual(contract);
    expect(normalizeSettings({ ...once })).toEqual(once);
  });
});
