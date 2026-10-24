/**
 * Title: The licence pill in the models list says what the licence really is
 *
 * Purpose: Pin plan 77 (licence labels, round 3). A row whose licence label is not Apache or MIT
 * shows that licence's name in the pill instead of a green "FOSS" (found on the Deck, P77-LICENCE-FILTER).
 * Both Qwen 3B sizes that used to sit in "Open source only" despite Qwen's Research licence
 * (qwen2.5vl:3b and qwen2.5:3b) left that class in plan 93, so "Open source only" does not list them
 * at all; they appear once the open-weight setting is on.
 *
 * Plan 96 F18: every row that is not open source now carries an amber pill naming why ("Research only"
 * for the Qwen 3B sizes, "Open weight", "Not open", "Unknown"); before, those rows had no pill at all
 * and the research-only wording sat in a blurb the list hides.
 */
import { describe, expect, it } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";

import { PullModelsModal } from "./PullModelsModal";
import { pullModelLicencePillText } from "../pullModelLicencePill";
import { PULL_MODEL_CATALOG } from "../pullModelCatalog";
import { setRpcHandler } from "../../../test-harness/fakeDeckyRpc";

function renderModal() {
  return render(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />);
}

function showAllGroups(container: HTMLElement) {
  // The box remembers this pick for the session, so an earlier test may already have switched it off.
  const toggle = container.querySelector(
    '[aria-label="Deck essentials only — show Tier 1 and Tier 2 one-model presets"]'
  ) as HTMLButtonElement;
  if (toggle.getAttribute("aria-pressed") === "true") fireEvent.click(toggle);
}

function pillFor(container: HTMLElement, tag: string): string | null {
  for (const row of Array.from(container.querySelectorAll(".bonsai-pullmodels-table-row--data"))) {
    const name = row.querySelector(".bonsai-pullmodels-tag-name-text")?.textContent?.replace(/\s*!$/, "").trim();
    if (name === tag) return row.querySelector(".bonsai-pullmodels-chip--foss-inline")?.textContent ?? "";
  }
  return null;
}

describe("pullModelLicencePillText", () => {
  it("says FOSS for Apache and MIT labels and for a label-less overlay entry", () => {
    expect(pullModelLicencePillText({ license: "Apache 2.0", licenseClass: "foss" })).toBe("FOSS");
    expect(pullModelLicencePillText({ license: "Apache 2.0 (Gemma)", licenseClass: "foss" })).toBe("FOSS");
    expect(pullModelLicencePillText({ license: "MIT", licenseClass: "foss" })).toBe("FOSS");
    expect(pullModelLicencePillText({ license: "", licenseClass: "foss" })).toBe("FOSS");
  });

  it("names the licence, without the size note, for any other open-source-class entry", () => {
    expect(pullModelLicencePillText({ license: "Qwen Research (3B size)", licenseClass: "foss" })).toBe("Qwen Research");
  });

  it("says Research only for the Qwen Research licence, on all three Qwen 3B rows (plan 96 F18)", () => {
    for (const tag of ["qwen2.5vl:3b", "qwen2.5:3b", "qwen2.5-coder:3b"]) {
      const entry = PULL_MODEL_CATALOG.find((e) => e.tag === tag);
      expect(entry, tag).toBeDefined();
      expect(pullModelLicencePillText(entry!), tag).toBe("Research only");
    }
  });

  it("gives every row that is not open source a short pill naming why (plan 96 F18)", () => {
    expect(pullModelLicencePillText({ license: "Llama 3.2", licenseClass: "open_weight" })).toBe("Open weight");
    expect(pullModelLicencePillText({ license: "Gemma Terms", licenseClass: "open_weight" })).toBe("Open weight");
    expect(pullModelLicencePillText({ license: "MIT", licenseClass: "open_weight" })).toBe("Open weight");
    expect(pullModelLicencePillText({ license: "Some paid licence", licenseClass: "non_foss" })).toBe("Not open");
    expect(pullModelLicencePillText({ license: "MiniCPM", licenseClass: "unknown" })).toBe("Unknown");
    expect(pullModelLicencePillText({ license: "", licenseClass: "unknown" })).toBe("Unknown");
  });

  it("keeps every pill short enough for the 48 px slot: at most two words, 8 letters a word", () => {
    for (const entry of PULL_MODEL_CATALOG) {
      const words = (pullModelLicencePillText(entry) ?? "").split(/\s+/);
      expect(words.length, entry.tag).toBeLessThanOrEqual(2);
      for (const w of words) expect(w.length, `${entry.tag}: ${w}`).toBeLessThanOrEqual(8);
    }
  });
});

describe("licence pill in the list", () => {
  it("does not list the two Qwen Research 3B models under Open source only, and keeps FOSS on the open ones", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal();
    await waitFor(() => expect(pillFor(container, "qwen3.5:4b")).not.toBeNull());
    expect(pillFor(container, "qwen2.5vl:3b")).toBeNull();
    expect(pillFor(container, "qwen3.5:4b")).toBe("FOSS");
    showAllGroups(container);
    await waitFor(() => expect(pillFor(container, "qwen2.5:7b")).not.toBeNull());
    expect(pillFor(container, "qwen2.5:3b")).toBeNull();
    expect(pillFor(container, "qwen2.5:7b")).toBe("FOSS");
  });

  it("draws a Research only pill on the two Qwen 2.5 3B rows once open-weight models are on, in a different colour class from FOSS (plan 96 F18)", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = render(
      <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded modelPolicyTier="open_weight" />
    );
    await waitFor(() => expect(pillFor(container, "qwen2.5vl:3b")).not.toBeNull());
    showAllGroups(container);
    await waitFor(() => expect(pillFor(container, "qwen2.5:3b")).not.toBeNull());
    expect(pillFor(container, "qwen2.5vl:3b")).toBe("Research only");
    expect(pillFor(container, "qwen2.5:3b")).toBe("Research only");
    expect(pillFor(container, "qwen3.5:4b")).toBe("FOSS");
    expect(pillFor(container, "llama3.2:3b")).toBe("Open weight");
    const pill = (tag: string) => {
      for (const row of Array.from(container.querySelectorAll(".bonsai-pullmodels-table-row--data"))) {
        const name = row.querySelector(".bonsai-pullmodels-tag-name-text")?.textContent?.replace(/\s*!$/, "").trim();
        if (name === tag) return row.querySelector(".bonsai-pullmodels-chip--foss-inline") as HTMLElement;
      }
      throw new Error(`no row for ${tag}`);
    };
    expect(pill("qwen2.5:3b").className).toContain("bonsai-pullmodels-chip--licence-name");
    expect(pill("qwen3.5:4b").className).not.toContain("bonsai-pullmodels-chip--licence-name");
  });
});
