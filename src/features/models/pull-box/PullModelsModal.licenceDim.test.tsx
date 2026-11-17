/**
 * Title: A model outside the licence setting is dimmed, never hidden (plan 105, lane D5)
 *
 * Purpose: Pin two things the AI models box got wrong. (1) It opened on 2 rows, not the 3 Deck essentials,
 * because the licence setting hid the one essential that is not open source. (2) The licence check ran before
 * the rule that keeps an installed model on screen, so an installed model could vanish from the list while
 * "Installed N" at the top still counted it. Now a row outside the setting is drawn dimmed and an installed
 * model is always drawn, even one that "Fits this Deck" would leave out.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { PullModelsModal } from "./PullModelsModal";
import { resetPullModelsBoxMemory } from "./pullModelsBoxMemory";
import { PULL_MODEL_CATALOG } from "../pullModelCatalog";
import { setRpcHandler } from "../../../test-harness/fakeDeckyRpc";

function renderModal(tier: "open_source_only" | "open_weight" = "open_source_only") {
  return render(
    <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded modelPolicyTier={tier} />
  );
}

function rows(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(".bonsai-pullmodels-table-row--data")).map((row) => ({
    tag: row.querySelector(".bonsai-pullmodels-tag-name-text")?.textContent?.replace(/\s*!$/, "").trim() ?? "",
    dim: row.classList.contains("bonsai-pullmodels-table-row--dim"),
  }));
}

/** Every model that fits a Deck: all but the Expert (large) group, which "Fits this Deck" leaves out. */
const FITS = PULL_MODEL_CATALOG.filter((e) => e.group !== "stretch");

describe("the AI models box and the licence setting", () => {
  beforeEach(() => {
    resetPullModelsBoxMemory();
  });

  it("opens on every model that fits a Deck, the three essentials first, the one that is not open source dimmed", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal();
    await waitFor(() => expect(rows(container).length).toBeGreaterThan(0));
    const shown = rows(container);
    expect(shown.slice(0, 3)).toEqual([
      { tag: "gemma4:e2b-it-qat", dim: false },
      { tag: "qwen3.5:4b", dim: false },
      { tag: "qwen2.5vl:3b", dim: true },
    ]);
    expect(shown).toHaveLength(FITS.length);
    expect(FITS.length).toBe(30);
    expect(container.querySelector(".bonsai-pullmodels-strip-count")?.textContent).toBe("30 models");
    // A row is dimmed exactly when its licence class is outside "open source only".
    for (const r of shown) {
      expect(r.dim, r.tag).toBe(FITS.find((e) => e.tag === r.tag)!.licenseClass !== "foss");
    }
  });

  it("dims only the models whose licence is neither open source nor open weight once open-weight models are allowed", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal("open_weight");
    await waitFor(() => expect(rows(container).length).toBe(FITS.length));
    const dimmed = rows(container).filter((r) => r.dim).map((r) => r.tag).sort();
    expect(dimmed).toEqual(FITS.filter((e) => e.licenseClass === "unknown").map((e) => e.tag).sort());
  });

  it("always shows an installed model, even one outside the licence setting, and the count at the top agrees", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["llama3.2:3b"] }));
    const { container } = renderModal();
    await waitFor(() => expect(container.textContent).toContain("Installed 1"));
    const shown = rows(container);
    expect(shown.find((r) => r.tag === "llama3.2:3b")?.dim).toBe(true);
    expect(container.querySelector(".bonsai-pullmodels-strip-count")?.textContent).toBe(`${shown.length} models`);
  });

  it("keeps an installed model that Fits this Deck would leave out, marked, and counts it in the list", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["qwen3.5:27b"] }));
    const { container } = renderModal();
    await waitFor(() => expect(container.textContent).toContain("Installed 1"));
    expect(rows(container).map((r) => r.tag)).toContain("qwen3.5:27b");
    expect(rows(container).map((r) => r.tag)).not.toContain("gemma3:27b");
    const row = Array.from(container.querySelectorAll(".bonsai-pullmodels-table-row--data")).find((r) => r.textContent?.includes("qwen3.5:27b"))!;
    expect(row.textContent).toContain("too big for this Deck");
    expect(row.className).toContain("bonsai-pullmodels-table-row--big");
  });
});
