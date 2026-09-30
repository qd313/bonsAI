/**
 * Title: The licence pill in the models list says what the licence really is
 *
 * Purpose: Pin plan 77 (licence labels, round 3). qwen2.5vl:3b and qwen2.5:3b are kept in the
 * "Open source only" class for now, but Qwen's own card gives the 3B size the Qwen Research
 * licence, and the row still showed a green "FOSS" pill (found on the Deck, P77-LICENCE-FILTER).
 * A row whose licence label is not Apache or MIT now shows that licence's name in the pill
 * instead. Classes, tiers and filters are unchanged.
 */
import { describe, expect, it } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";

import { PullModelsModal } from "./PullModelsModal";
import { pullModelLicencePillText } from "../data/pullModelLicencePill";
import { setRpcHandler } from "../test-harness/fakeDeckyRpc";

function renderModal() {
  return render(<PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded />);
}

function showAllGroups(container: HTMLElement) {
  fireEvent.click(container.querySelector(".bonsai-pullmodels-filters-button") as HTMLButtonElement);
  fireEvent.click(
    container.querySelector('[aria-label="Essentials only — show Tier 1 and Tier 2 one-model presets"]') as HTMLButtonElement
  );
  fireEvent.click(container.querySelector(".bonsai-pullmodels-filterpanel-close") as HTMLButtonElement);
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

  it("shows no pill outside the open-source class", () => {
    expect(pullModelLicencePillText({ license: "Llama 3.2", licenseClass: "open_weight" })).toBeNull();
  });
});

describe("licence pill in the list", () => {
  it("shows Qwen Research, not FOSS, on the two kept 3B Qwen rows", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal();
    await waitFor(() => expect(pillFor(container, "qwen2.5vl:3b")).not.toBeNull());
    expect(pillFor(container, "qwen2.5vl:3b")).toBe("Qwen Research");
    expect(pillFor(container, "qwen3.5:4b")).toBe("FOSS");
    showAllGroups(container);
    await waitFor(() => expect(pillFor(container, "qwen2.5:3b")).not.toBeNull());
    expect(pillFor(container, "qwen2.5:3b")).toBe("Qwen Research");
    expect(pillFor(container, "qwen2.5:7b")).toBe("FOSS");
  });
});
