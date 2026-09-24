/**
 * Behavior tests for the knowledge-base Cancel path (execution-order step 9).
 *
 * The corpus download is ~5 GB and the backend has always had a cancel event;
 * nothing in the UI set it, so a download could only be escaped by closing the
 * plugin. These assert what a user can do, not how the row is built — in
 * particular that the action row still has a control you can reach while a
 * download is running, which is the part that was broken: both of the other
 * buttons are disabled then.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import {
  getRpcCallLog,
  ragCorpusStatusFixture,
  resetFakeDeckyRpc,
  setRpcHandler,
} from "../test-harness/fakeDeckyRpc";

function renderSection() {
  return render(
    <KnowledgeBaseSection
      useLocalKnowledgeBase={false}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion=""
      ollamaIp="192.168.1.100"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />,
  );
}

/**
 * Drives the component into its downloading state through the same path a user
 * takes: with a corpus installed the primary button runs an update, and an
 * accepted update is what starts the progress polling. The alternative entry —
 * a first download — goes through a storage-picker modal, which is more setup
 * for the same state.
 */
async function startDownloadViaUpdate() {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({ installed: true, corpus_version: "1.0.0" }),
  );
  const view = renderSection();
  const primary = await screen.findByText("Update knowledge base");
  fireEvent.click(primary);
  await screen.findByText("Cancel");
  return view;
}

const cancelCalls = () => getRpcCallLog().filter((c) => c.method === "cancel_rag_corpus_download");

describe("KnowledgeBaseSection cancel", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetKbDownloadInFlightForTests();
  });

  it("offers a Cancel control while a download is running", async () => {
    await startDownloadViaUpdate();

    expect(screen.getByText("Cancel")).toBeTruthy();
    // The point of the control: the primary has gone to its disabled busy label,
    // so without Cancel the row would hold nothing that responds.
    expect(screen.getByText("Downloading…")).toBeTruthy();
    expect(screen.queryByText("Update knowledge base")).toBeNull();
  });

  it("asks the backend to stop the download when Cancel is pressed", async () => {
    await startDownloadViaUpdate();

    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => expect(cancelCalls()).toHaveLength(1));
  });

  it("does not fire a second cancel while the first is still pending", async () => {
    await startDownloadViaUpdate();

    const button = screen.getByText("Cancel");
    fireEvent.click(button);
    await screen.findByText("Cancelling…");
    fireEvent.click(screen.getByText("Cancelling…"));

    await waitFor(() => expect(cancelCalls()).toHaveLength(1));
    expect(cancelCalls()).toHaveLength(1);
  });

  it("shows Remove rather than Cancel when no download is running", async () => {
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({ installed: true, corpus_version: "1.0.0" }),
    );
    renderSection();

    await screen.findByText("Remove");
    expect(screen.queryByText("Cancel")).toBeNull();
  });

  it("reads a cancelled download as cancelled, not as a failure", async () => {
    // The backend records the unwinding exception in `error` even when the user
    // asked for the stop, so the raw text must not surface as a red failure.
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({
        phase: "cancelled",
        done: true,
        error: "Cancelled.",
        installed: false,
      }),
    );
    renderSection();

    await screen.findByText(/Download cancelled/);
    expect(screen.queryByText("Cancelled.")).toBeNull();
  });

  it("still surfaces a real download failure", async () => {
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({
        phase: "failed",
        done: true,
        error: "Manifest unreachable.",
        installed: false,
      }),
    );
    renderSection();

    await screen.findByText("Manifest unreachable.");
    expect(screen.queryByText(/Download cancelled/)).toBeNull();
  });
});

/*
 * Closing the storage picker is a Decky modal close, which remounts the tab's content. The download
 * ran on, but the remounted section had forgotten it: no poll, one status read taken before the
 * install finished, and "Not installed" for 37 s and more on the Deck
 * (docs/test-evidence/plan64-TWO-TAPS-DOWNLOAD-try2.json). A remount is simulated here by unmounting
 * the section and rendering a fresh one while the download is still "running".
 */
describe("KnowledgeBaseSection after the tab is rebuilt mid-download", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetKbDownloadInFlightForTests();
  });

  function statusThatFinishesOnRead(n: number, before: Record<string, unknown>) {
    let reads = 0;
    return () => {
      reads += 1;
      return reads < n
        ? ragCorpusStatusFixture(before)
        : ragCorpusStatusFixture({ installed: true, done: true, phase: "done", corpus_version: "2026.09.18" });
    };
  }

  it("keeps checking a download started before the rebuild, and shows Installed when it lands", async () => {
    const first = await startDownloadViaUpdate();
    first.unmount();

    // The rebuilt section's first read comes before the install finished, as on the Deck.
    setRpcHandler("get_rag_corpus_status", statusThatFinishesOnRead(2, { installed: false, done: false, phase: "idle" }));
    renderSection();

    await screen.findByText(/Installed/, undefined, { timeout: 4000 });
    expect(screen.queryByText(/Not installed/)).toBeNull();
  });

  it("picks up a download the back end reports as running, with no marker left from before", async () => {
    setRpcHandler("get_rag_corpus_status", statusThatFinishesOnRead(2, { installed: false, done: false, phase: "running" }));
    renderSection();

    await screen.findByText(/Installed/, undefined, { timeout: 4000 });
  });
});
