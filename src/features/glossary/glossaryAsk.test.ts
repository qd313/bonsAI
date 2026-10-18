import { describe, expect, it } from "vitest";

import {
  composeDrgGlossaryExplainFurtherQuestion,
  drgGlossaryExplainFurtherThreadDisplay,
} from "./glossaryAsk";
import { TEST_GLOSSARY_TERMS } from "../../test-harness/glossaryTestTerms";

const kitingTerm = TEST_GLOSSARY_TERMS.find((t) => t.id === "kiting")!;

describe("composeDrgGlossaryExplainFurtherQuestion", () => {
  it("names the term and the game so the model has enough to answer without re-asking", () => {
    const question = composeDrgGlossaryExplainFurtherQuestion(kitingTerm);
    expect(question).toContain('"kiting"');
    expect(question).toContain("Deep Rock Galactic: Survivor");
  });

  it("leaves the game out when the library gave no title", () => {
    const question = composeDrgGlossaryExplainFurtherQuestion({ ...kitingTerm, gameTitle: "" });
    expect(question).toContain('"kiting"');
    expect(question).not.toContain(" for ");
    expect(question).not.toContain("Deep Rock");
  });
});

describe("drgGlossaryExplainFurtherThreadDisplay", () => {
  it("is a short label naming the term", () => {
    expect(drgGlossaryExplainFurtherThreadDisplay(kitingTerm)).toBe("Explain: kiting");
  });
});
