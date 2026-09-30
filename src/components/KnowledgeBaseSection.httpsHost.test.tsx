/**
 * With an https Ollama address in the field, the meaning-search hint does not offer that address
 * ("Install nomic-embed-text on https://..."); it says to use an http:// address first. A plain
 * address is still named as before (0.6.0 security review, finding 7; plan 77 round 2).
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

function section(ollamaIp: string) {
  return (
    <KnowledgeBaseSection
      useLocalKnowledgeBase={true}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion="1.0.0"
      ollamaIp={ollamaIp}
      ollamaLocalOnDeck={false}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />
  );
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({
      installed: true,
      corpus_version: "1.0.0",
      embeddings_populated: true,
      embed_model_available: false,
    }),
  );
});

describe("meaning-search hint and the Ollama address", () => {
  it("does not name an https address as somewhere to install the model", async () => {
    render(section("https://127.0.0.1:11434"));
    await screen.findByText(/Use an http:\/\/ Ollama address/);
    expect(screen.queryByText(/on https:\/\/127\.0\.0\.1/)).toBeNull();
  });

  it("still names a plain address", async () => {
    render(section("192.168.1.50:11434"));
    await screen.findByText(/on 192\.168\.1\.50:11434/);
  });
});
