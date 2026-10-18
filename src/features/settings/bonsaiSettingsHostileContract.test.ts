/**
 * Title: Settings hostile-input cross-language contract (TypeScript half)
 * Purpose: Assert normalizeSettings matches Python on the inputs that once diverged.
 * Used for: Catching TS/Python settings drift on non-default values.
 * Solves: settings-defaults.json only pins the fresh-install payload, so it could not see the
 *         five settings D13 found disagreeing once the value was not the default.
 * Does not: Cover a setting only one of the two languages reads.
 *
 * Python half is tests/test_settings_hostile_contract.py.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { repoRoot } from "../../test-harness/repoPaths";
import { normalizeSettings } from "./bonsaiSettingsNormalizers";

type Case = { name: string; input: Record<string, unknown>; expected: Record<string, unknown> };

const CONTRACT_PATH = resolve(repoRoot(), "tests", "contracts", "settings-hostile-inputs.json");
const cases = JSON.parse(readFileSync(CONTRACT_PATH, "utf-8")) as Case[];

describe("settings hostile-input contract", () => {
  it("has cases", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const testCase of cases) {
    it(testCase.name, () => {
      const produced = normalizeSettings({ ...testCase.input }) as Record<string, unknown>;
      const actual: Record<string, unknown> = {};
      for (const key of Object.keys(testCase.expected)) actual[key] = produced[key];
      expect(actual).toEqual(testCase.expected);
    });
  }

  it("references only keys the payload still emits", () => {
    const produced = normalizeSettings({}) as Record<string, unknown>;
    for (const testCase of cases) {
      const unknown = Object.keys(testCase.expected).filter((k) => !(k in produced));
      expect(unknown, `${testCase.name} references removed keys`).toEqual([]);
    }
  });
});
