/**
 * Title: Spoiler title profiles cross-language contract (TypeScript half)
 * Purpose: Assert the built-in profile tables and resolution rules match the shared fixture.
 * Used for: Catching a title added to one language and forgotten in the other.
 * Solves: spoilerTitleProfiles.ts and spoiler_title_profiles.py hold the same ten AppIDs with
 *         nothing but a "keep in sync" comment enforcing agreement.
 * Does not: Cover prompt policy or display unwrap — only the profile a title resolves to.
 *
 * The Python half is tests/test_spoiler_title_profiles_contract.py. Neither test shells out to
 * the other toolchain; both read the same JSON. See tests/contracts/README.md.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  LOW_NARRATIVE_APP_IDS,
  PROTECT_PROGRESSION_APP_IDS,
  questionNamesProtectedTitle,
  resolveTitleSpoilerProfile,
  resolveTurnTitleSpoilerProfile,
} from "./spoilerTitleProfiles";

// Read rather than import: keeps the fixture outside src/ (it is shared with the Python
// suite) without needing a tsconfig path mapping or resolveJsonModule.
const CONTRACT_PATH = resolve(__dirname, "../../tests/contracts/spoiler-title-profiles.json");
const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf-8")) as {
  low_narrative_app_ids: string[];
  protect_progression_app_ids: string[];
  cases: { name: string; app_id: string; app_name: string; expected: string }[];
  question_cases: { name: string; question: string; expected: boolean }[];
  turn_cases: { name: string; app_id: string; app_name: string; question: string; expected: string }[];
};

describe("spoiler title profiles contract", () => {
  it("low-narrative table matches the shared fixture", () => {
    expect([...LOW_NARRATIVE_APP_IDS].sort()).toEqual([...contract.low_narrative_app_ids].sort());
  });

  it("protect-progression table matches the shared fixture", () => {
    expect([...PROTECT_PROGRESSION_APP_IDS].sort()).toEqual(
      [...contract.protect_progression_app_ids].sort()
    );
  });

  it("no AppID carries two profiles", () => {
    const overlap = [...LOW_NARRATIVE_APP_IDS].filter((id) => PROTECT_PROGRESSION_APP_IDS.has(id));
    expect(overlap).toEqual([]);
  });

  it.each(contract.cases)("resolves: $name", ({ app_id, app_name, expected }) => {
    expect(resolveTitleSpoilerProfile(app_id, app_name)).toBe(expected);
  });

  it.each(contract.question_cases)("question names a story game: $name", ({ question, expected }) => {
    expect(questionNamesProtectedTitle(question)).toBe(expected);
  });

  it.each(contract.turn_cases)(
    "turn profile: $name",
    ({ app_id, app_name, question, expected }) => {
      expect(resolveTurnTitleSpoilerProfile(app_id, app_name, question)).toBe(expected);
    }
  );
});
