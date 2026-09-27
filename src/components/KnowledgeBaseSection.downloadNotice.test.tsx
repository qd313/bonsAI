/**
 * Title: The knowledge library screen asks the download notice first
 *
 * Purpose: Pin that the meaning-search model pull and the library's Update wait for the download
 * notice (downloadNotice.tsx) and start nothing when it is declined, and that each names the right
 * site: registry.ollama.ai with about 270 MB for the model, Hugging Face then GitHub for the
 * library. (The first library download goes through the same notice inside startDownload, behind
 * the storage picker box, which this harness cannot press.)
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ answer: false, notices: [] as unknown[] }));
vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: async (n: unknown) => {
    hoisted.notices.push(n);
    return hoisted.answer;
  },
}));

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

function renderInstalled() {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({
      installed: true,
      corpus_version: "1.0.0",
      embeddings_populated: true,
      embed_model_available: false,
    }),
  );
  return render(
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

const callsTo = (m: string) => getRpcCallLog().filter((c) => c.method === m);
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  hoisted.answer = false;
  hoisted.notices = [];
});

describe("KnowledgeBaseSection download notice", () => {
  it("meaning-search model: declined notice pulls nothing", async () => {
    renderInstalled();
    fireEvent.click(await screen.findByText(/^Pull nomic-embed-text/));
    await waitFor(() => expect(hoisted.notices).toHaveLength(1));
    expect(hoisted.notices[0]).toEqual([
      { site: "https://registry.ollama.ai", what: "nomic-embed-text", size: "about 270 MB" },
    ]);
    await settle();
    expect(callsTo("pull_ollama_models")).toHaveLength(0);
  });

  it("meaning-search model: accepted notice pulls", async () => {
    hoisted.answer = true;
    renderInstalled();
    fireEvent.click(await screen.findByText(/^Pull nomic-embed-text/));
    await waitFor(() => expect(callsTo("pull_ollama_models")).toHaveLength(1));
  });

  it("the size shows on the meaning-search button itself", async () => {
    renderInstalled();
    expect(await screen.findByText("Pull nomic-embed-text · about 270 MB")).toBeTruthy();
  });

  it("library Update: declined notice checks nothing", async () => {
    renderInstalled();
    fireEvent.click(await screen.findByText("Update knowledge base"));
    await waitFor(() => expect(hoisted.notices).toHaveLength(1));
    const sites = (hoisted.notices[0] as { site: string }[]).map((n) => n.site);
    expect(sites).toEqual(["https://huggingface.co", "https://github.com"]);
    await settle();
    expect(callsTo("update_rag_corpus")).toHaveLength(0);
  });
});
