/**
 * Title: An installed model outside the curated catalog gets its real size
 *
 * Covers: docs/roadmap.md "The remove box and the models list undercount a big model's size"
 * (evidence docs/test-evidence/plan64-ROUTING-MERGE-01-top-try2.json). Removing a 17 GB model
 * (gemma3:27b, not in the bundled/overlay catalog) showed "< 0.1 GB" in the confirm box, and the
 * header's own "Installed N · X GB" total did not count it either.
 *
 * Root cause: the screen only ever asked `fetch_ollama_catalog_metadata` for tags already in the
 * merged catalog, so a model installed outside it never got a live size and fell back to 0.
 */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { getRpcCallLog, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { PullModelsModal } from "./PullModelsModal";

function renderModal(overrides: Partial<React.ComponentProps<typeof PullModelsModal>> = {}) {
  return render(
    <PullModelsModal activeRoutingTag={null} onCancel={() => {}} onPullAccepted={() => {}} embedded {...overrides} />
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("an installed tag outside the curated catalog", () => {
  it("asks fetch_ollama_catalog_metadata for it too, not just the catalog's own tags", async () => {
    setRpcHandler("test_ollama_connection", () => ({
      reachable: true,
      version: "0.5.0",
      models: ["gemma3:27b"],
    }));
    setRpcHandler("fetch_ollama_catalog_metadata", () => ({
      source: "live",
      tags: { "gemma3:27b": { exists: true, size_bytes: 17_179_869_184 } },
    }));

    renderModal();

    await waitFor(() => {
      const call = getRpcCallLog().find((c) => c.method === "fetch_ollama_catalog_metadata");
      expect(call).toBeTruthy();
      expect(call?.args[0]).toContain("gemma3:27b");
    });
  });

  it("counts its real size in the header total instead of falling back to 0", async () => {
    setRpcHandler("test_ollama_connection", () => ({
      reachable: true,
      version: "0.5.0",
      models: ["gemma3:27b"],
    }));
    // The real backend only ever reports metadata for the tags it was actually asked about
    // (ollama_catalog_service.fetch_catalog_metadata loops over the request's own tag list) --
    // mirror that here instead of answering regardless of what was requested, or this test would
    // pass even with the old bug (the response would still carry the size, just unrequested).
    setRpcHandler("fetch_ollama_catalog_metadata", (...args: unknown[]) => {
      const requested = Array.isArray(args[0]) ? (args[0] as string[]) : [];
      const tags: Record<string, unknown> = {};
      if (requested.includes("gemma3:27b")) {
        tags["gemma3:27b"] = { exists: true, size_bytes: 17_179_869_184 };
      }
      return { source: "live", tags };
    });

    const { container } = renderModal();

    await waitFor(() => {
      const installedLine = container.querySelector(".bonsai-pullmodels-header span")?.textContent ?? "";
      expect(installedLine).toBe("Installed 1 · 16 GB");
      // Never the undercount seen on the Deck ("Installed 3 · 4.3 GB" while a 17 GB model was
      // installed, plan64-ROUTING-MERGE-01-top-try2.json).
      expect(installedLine).not.toContain("< 0.1 GB");
    });
  });
});
