/**
 * Title: A model outside the licence setting is dimmed, never hidden (plan 105, lane D5)
 *
 * Purpose: Pin two things the AI models box got wrong. (1) It opened on 2 rows, not the 3 Deck essentials,
 * because the licence setting hid the one essential that is not open source. (2) The licence check ran before
 * the rule that keeps an installed model on screen, so an installed model could vanish from the list while
 * "Installed N" at the top still counted it. Now a row outside the setting is drawn dimmed and an installed
 * model is always drawn.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { PullModelsModal } from "./PullModelsModal";
import { resetPullModelsBoxMemory } from "./pullModelsBoxMemory";
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

describe("the AI models box and the licence setting", () => {
  beforeEach(() => {
    resetPullModelsBoxMemory();
  });

  it("opens on all three Deck essentials, the one that is not open source dimmed", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal();
    await waitFor(() => expect(rows(container).length).toBeGreaterThan(0));
    expect(rows(container)).toEqual([
      { tag: "gemma4:e2b-it-qat", dim: false },
      { tag: "qwen3.5:4b", dim: false },
      { tag: "qwen2.5vl:3b", dim: true },
    ]);
  });

  it("dims nothing once open-weight models are allowed", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: [] }));
    const { container } = renderModal("open_weight");
    await waitFor(() => expect(rows(container).length).toBe(3));
    expect(rows(container).every((r) => !r.dim)).toBe(true);
  });

  it("always shows an installed model, even one outside the licence setting, and the count at the top agrees", async () => {
    setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["llama3.2:3b"] }));
    const { container } = renderModal();
    await waitFor(() => expect(container.textContent).toContain("Installed 1"));
    const shown = rows(container);
    expect(shown.map((r) => r.tag)).toContain("llama3.2:3b");
    expect(shown.find((r) => r.tag === "llama3.2:3b")?.dim).toBe(true);
    expect(container.querySelector(".bonsai-pullmodels-filtercol-count")?.textContent).toBe(`${shown.length} models match`);
  });
});
