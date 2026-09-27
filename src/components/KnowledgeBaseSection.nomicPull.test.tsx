/**
 * Behavior tests for the nomic-embed-text pull button.
 *
 * The hint telling a user to "install nomic-embed-text" used to be text only — no
 * button, no link, nothing to press. These assert the fix: a button appears exactly
 * when the hint would have shown, and pressing it calls the same pull_ollama_models
 * RPC the Pull Models modal already uses, with the model tag it exists to install.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

function renderInstalled(overrides: Record<string, unknown> = {}) {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({
      installed: true,
      corpus_version: "1.0.0",
      embeddings_populated: true,
      embed_model_available: false,
      ...overrides,
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

const pullCalls = () => getRpcCallLog().filter((c) => c.method === "pull_ollama_models");

describe("KnowledgeBaseSection nomic-embed-text pull", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetKbDownloadInFlightForTests();
  });

  it("shows a Pull button when hybrid vectors exist but the embed model is unavailable", async () => {
    renderInstalled();
    expect(await screen.findByText("Pull nomic-embed-text")).toBeTruthy();
  });

  it("does not show the button once the embed model is available", async () => {
    renderInstalled({ embed_model_available: true });
    await screen.findByText("Installed");
    expect(screen.queryByText("Pull nomic-embed-text")).toBeNull();
  });

  it("does not show the button when the corpus has no baked vectors at all", async () => {
    renderInstalled({ embeddings_populated: false, embed_model_available: false });
    await screen.findByText("Installed");
    expect(screen.queryByText("Pull nomic-embed-text")).toBeNull();
  });

  it("calls pull_ollama_models with the nomic-embed-text tag when pressed", async () => {
    renderInstalled();
    const button = await screen.findByText("Pull nomic-embed-text");

    fireEvent.click(button);

    await screen.findByText("Starting…");
    expect(pullCalls()).toHaveLength(1);
    expect(pullCalls()[0].args).toEqual([["nomic-embed-text"]]);
  });

  it("keeps saying Pulling… after the request resolves, because the pull is not done yet", async () => {
    // The RPC resolving means "accepted", not "installed" -- the pull runs in the setup
    // service. Snapping back to the idle label here is what made pressing the button look
    // like it did nothing at all.
    renderInstalled();
    const button = await screen.findByText("Pull nomic-embed-text");

    fireEvent.click(button);

    expect(await screen.findByText("Pulling… (Ollama → Where AI runs)")).toBeTruthy();
    expect(screen.queryByText("Pull nomic-embed-text")).toBeNull();
  });

  it("stops showing the hint once the model actually arrives", async () => {
    renderInstalled();
    const button = await screen.findByText("Pull nomic-embed-text");
    fireEvent.click(button);
    await screen.findByText("Pulling… (Ollama → Where AI runs)");

    // The poll re-reads status; the model is there now, so the whole hint unmounts.
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({
        installed: true,
        corpus_version: "1.0.0",
        embeddings_populated: true,
        embed_model_available: true,
      }),
    );

    await waitFor(
      () => {
        expect(screen.queryByText("Pulling… (Ollama → Where AI runs)")).toBeNull();
        expect(screen.queryByText("Pull nomic-embed-text")).toBeNull();
      },
      { timeout: 10000 },
    );
  }, 15000);

  it("clears the hint when the model lands even if the section was remounted mid-pull", async () => {
    // Measured on the Deck (docs/test-evidence/plan70-R5.json): the offer's Download closes a
    // Decky modal, which remounts this section. The new copy had no idea a pull was running,
    // read "missing" once on mount and never looked again, so "Pull nomic-embed-text" stayed
    // on the open tab for over a minute after nomic-embed-text:latest had landed.
    const first = renderInstalled();
    fireEvent.click(await screen.findByText("Pull nomic-embed-text"));
    await screen.findByText("Pulling… (Ollama → Where AI runs)");
    first.unmount();

    // The remounted copy's first status read still sees the model missing...
    renderInstalled();
    expect(await screen.findByText("Pulling… (Ollama → Where AI runs)")).toBeTruthy();

    // ...then the pull finishes and the back end reports the model on the Ask host.
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({
        installed: true,
        corpus_version: "2026.09.26",
        embeddings_populated: true,
        embed_model_available: true,
      }),
    );
    await waitFor(
      () => {
        expect(screen.queryByText("Pulling… (Ollama → Where AI runs)")).toBeNull();
        expect(screen.queryByText("Pull nomic-embed-text")).toBeNull();
        expect(screen.queryByText(/Keyword \+ meaning search\./)).toBeNull();
      },
      { timeout: 10000 },
    );
  }, 15000);

  it("does not offer a Deck pull when Ask runs on a LAN host", async () => {
    // `pull_ollama_models` pulls to this Deck and takes no host. Offering it while Ask
    // routes to a LAN box installs the model on the wrong machine, so the hint could
    // never clear no matter how many times you pressed it.
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({
        installed: true,
        corpus_version: "1.0.0",
        embeddings_populated: true,
        embed_model_available: false,
      }),
    );
    render(
      <KnowledgeBaseSection
        useLocalKnowledgeBase={true}
        setUseLocalKnowledgeBase={() => {}}
        ragCorpusVersion="1.0.0"
        ollamaIp="192.168.1.50:11434"
        ollamaLocalOnDeck={false}
        onBeforeDeckyModal={() => {}}
        onCompleteDeckyModalClose={(close) => close()}
      />,
    );

    // The gap is still explained -- naming the host that needs the model.
    expect(await screen.findByText(/192\.168\.1\.50:11434/)).toBeTruthy();
    // ...but the button that would target the wrong machine is gone.
    expect(screen.queryByText("Pull nomic-embed-text")).toBeNull();
    expect(pullCalls()).toHaveLength(0);
  });

  it("shows the version the backend last reported, not the one it mounted with", async () => {
    // An Update writes the new version to settings.json on the backend, but nothing
    // re-reads settings into the frontend -- so the mount-time prop goes stale and the
    // panel reads as though the Update did nothing.
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({
        installed: true,
        corpus_version: "2026.08.14",
        embeddings_populated: true,
        embed_model_available: true,
      }),
    );
    render(
      <KnowledgeBaseSection
        useLocalKnowledgeBase={true}
        setUseLocalKnowledgeBase={() => {}}
        ragCorpusVersion="2026.08.12"
        ollamaIp="127.0.0.1"
        ollamaLocalOnDeck={true}
        onBeforeDeckyModal={() => {}}
        onCompleteDeckyModalClose={(close) => close()}
      />,
    );

    expect(await screen.findByText(/version 2026\.08\.14/)).toBeTruthy();
    expect(screen.queryByText(/version 2026\.08\.12/)).toBeNull();
  });
});
