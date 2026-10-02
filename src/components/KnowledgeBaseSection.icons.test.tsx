/**
 * Title: Icons on the knowledge-base action buttons
 *
 * Purpose: Pin plan 79 helper E (roadmap Features: 'Icons on the "Update knowledge base" and
 * "Remove" buttons'). Both buttons were text only while the buttons around them carry a small
 * icon. A person looking at the section should see a drawing beside "Update knowledge base" and
 * beside "Remove", and the words must stay exactly as they were.
 *
 * Does not: prove the D-pad route (the section's own focus tests do that, unchanged) or how the
 * icon looks on the Deck screen.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => await import("../test-harness/fakeDeckyUi"));

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

async function renderInstalled() {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({ installed: true, corpus_version: "1.0.0" }),
  );
  render(
    <KnowledgeBaseSection
      useLocalKnowledgeBase={true}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion="1.0.0"
      ollamaIp="127.0.0.1"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />,
  );
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
});

describe("knowledge base action buttons", () => {
  it("draws an icon beside the words on Update and on Remove, words unchanged", async () => {
    await renderInstalled();
    for (const label of ["Update knowledge base", "Remove"]) {
      const text = await screen.findByText(label);
      const button = text.closest("button") ?? text.closest(".bonsai-settings-focus-btn");
      expect(button, label).not.toBeNull();
      expect(button!.querySelector("svg"), `${label} has an icon`).not.toBeNull();
      expect(button!.textContent).toBe(label);
    }
  });
});
