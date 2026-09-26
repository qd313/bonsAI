/**
 * Behavior tests for the meaning-search offer after a fresh install.
 *
 * Installing the knowledge-base library never offered to pull nomic-embed-text — the
 * only ways to get it were a passive hint plus a separate button, and the button only
 * ever worked when Ask was already routed to this Deck's own Ollama. These pin the fix:
 * a fresh install (the plugin's own Download button, not Update) that lands with the
 * model still missing on this Deck's own Ollama asks once, with a Steam confirm dialog,
 * and never asks on its own.
 *
 * Does not: render a live Decky modal. The test harness's `showModal` (fakeDeckyUi.tsx)
 * discards its argument, so this file locally overrides it to capture the element and
 * call its `onOK`/`onCancel` props directly — the same technique
 * `useThinkingNoticeGate.test.tsx` uses. The storage-picker modal is captured and driven
 * the same way, since a fresh install has to go through it before a download starts.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  modal: null as { props: Record<string, unknown> } | null,
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (content: unknown) => {
      hoisted.modal = content as { props: Record<string, unknown> };
      return { Close: () => {} };
    },
  };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

const pullCalls = () => getRpcCallLog().filter((c) => c.method === "pull_ollama_models");

function renderNotInstalled(ollamaLocalOnDeck = true) {
  setRpcHandler("get_rag_corpus_status", () => ragCorpusStatusFixture({ installed: false }));
  return render(
    <KnowledgeBaseSection
      useLocalKnowledgeBase={true}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion=""
      ollamaIp="127.0.0.1"
      ollamaLocalOnDeck={ollamaLocalOnDeck}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />,
  );
}

/**
 * Drives a fresh install through the same path a user takes: press Download, pick a
 * storage location in the picker (captured the same way the offer dialog is, since both
 * go through the mocked `showModal`), then let the completion poll report the corpus
 * landed with the embed model in whatever state the test wants.
 */
async function finishFreshInstall(finalStatus: Record<string, unknown>) {
  const primary = await screen.findByText("Download knowledge base");
  fireEvent.click(primary);

  // The storage picker is the currently-captured modal; pick internal storage.
  const pickerProps = hoisted.modal!.props as { onPick: (path: string, storage: string) => void };
  await act(async () => {
    pickerProps.onPick("~/.bonsai/rag", "internal");
  });
  await screen.findByText("Downloading…");

  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({ phase: "done", done: true, ...finalStatus }),
  );

  await waitFor(() => expect(screen.queryByText("Downloading…")).toBeNull(), { timeout: 4000 });
}

describe("KnowledgeBaseSection meaning-search offer after a fresh install", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetKbDownloadInFlightForTests();
    hoisted.modal = null;
  });

  it("asks once when a fresh install lands with the embed model missing on this Deck's own Ollama", async () => {
    renderNotInstalled(true);
    await finishFreshInstall({
      installed: true,
      corpus_version: "2026.09.18",
      embeddings_populated: true,
      embed_model_available: false,
    });

    await waitFor(() => {
      expect(hoisted.modal?.props.strTitle).toBe("Also download the meaning-search model (about 270 MB)?");
    });
    expect(hoisted.modal?.props.strOKButtonText).toBe("Download");
    expect(hoisted.modal?.props.strCancelButtonText).toBe("Not now");
  });

  it("does not ask when the model is already present", async () => {
    renderNotInstalled(true);
    await finishFreshInstall({
      installed: true,
      corpus_version: "2026.09.18",
      embeddings_populated: true,
      embed_model_available: true,
    });

    // Only the storage picker (already closed) should ever have reached showModal.
    expect(hoisted.modal?.props.strTitle).not.toBe("Also download the meaning-search model (about 270 MB)?");
  });

  it("does not ask when Ask is routed to another computer's own AI", async () => {
    renderNotInstalled(false);
    await finishFreshInstall({
      installed: true,
      corpus_version: "2026.09.18",
      embeddings_populated: true,
      embed_model_available: false,
    });

    expect(hoisted.modal?.props.strTitle).not.toBe("Also download the meaning-search model (about 270 MB)?");
  });

  it("Download calls the pull once, reusing the existing pull_ollama_models call", async () => {
    renderNotInstalled(true);
    await finishFreshInstall({
      installed: true,
      corpus_version: "2026.09.18",
      embeddings_populated: true,
      embed_model_available: false,
    });
    await waitFor(() => {
      expect(hoisted.modal?.props.strTitle).toBe("Also download the meaning-search model (about 270 MB)?");
    });

    await act(async () => {
      (hoisted.modal!.props.onOK as () => void)();
    });

    expect(pullCalls()).toHaveLength(1);
    expect(pullCalls()[0].args).toEqual([["nomic-embed-text"]]);
  });

  it("Not now calls nothing", async () => {
    renderNotInstalled(true);
    await finishFreshInstall({
      installed: true,
      corpus_version: "2026.09.18",
      embeddings_populated: true,
      embed_model_available: false,
    });
    await waitFor(() => {
      expect(hoisted.modal?.props.strTitle).toBe("Also download the meaning-search model (about 270 MB)?");
    });

    await act(async () => {
      (hoisted.modal!.props.onCancel as () => void)();
    });

    expect(pullCalls()).toHaveLength(0);
  });

  it("shows the existing failure message when the reused pull fails", async () => {
    setRpcHandler("pull_ollama_models", () => {
      throw new Error("boom");
    });
    renderNotInstalled(true);
    await finishFreshInstall({
      installed: true,
      corpus_version: "2026.09.18",
      embeddings_populated: true,
      embed_model_available: false,
    });
    await waitFor(() => {
      expect(hoisted.modal?.props.strTitle).toBe("Also download the meaning-search model (about 270 MB)?");
    });

    await act(async () => {
      (hoisted.modal!.props.onOK as () => void)();
    });

    // pullNomicEmbed's own catch handler is reused as-is; its button reverts to idle,
    // which only happens on the failure path (the accepted path leaves it "Pulling…").
    await screen.findByText("Pull nomic-embed-text");
  });

  it("does not ask again after an Update, only after a fresh install", async () => {
    // Installed already, corpus_version present -- the primary button is Update, not
    // Download, so this never goes through the storage picker or sets the pending flag.
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
        ollamaIp="127.0.0.1"
        ollamaLocalOnDeck={true}
        onBeforeDeckyModal={() => {}}
        onCompleteDeckyModalClose={(close) => close()}
      />,
    );
    const primary = await screen.findByText("Update knowledge base");
    fireEvent.click(primary);
    await screen.findByText("Downloading…");

    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({
        phase: "done",
        done: true,
        installed: true,
        corpus_version: "2026.09.18",
        embeddings_populated: true,
        embed_model_available: false,
      }),
    );
    await waitFor(() => expect(screen.queryByText("Downloading…")).toBeNull(), { timeout: 4000 });

    expect(hoisted.modal?.props.strTitle).not.toBe("Also download the meaning-search model (about 270 MB)?");
  });
});
